/* jshint esnext: true */

'use strict';

var assert = require('assert'),
    EventEmitter = require('events').EventEmitter,
    Immutable = require('immutable'),
    walk = require('tree-walk');

var pm = require('../third_party/pattern-match');
require('../third_party/weakmap.js');

var match = pm.match,
    Pattern = pm.Pattern;

var StoreEntry = Immutable.Record({ value: null, key: -1 });
var combinations = Immutable.Set();

// Custom walker for walking immutable-js objects.
var immutableWalker = walk(function(node) {
  return Immutable.Iterable.isIterable(node) ? node.toJS() : node;
});

// Custom pattern for matching Immutable.Map and Immutable.Record objects.
var immutableObj = Pattern.extend({
  init: function(objPattern, ctor) {
    this.objPattern = objPattern;
    this.ctor = ctor || Immutable.Map;
    this.arity = this.getArity(objPattern);
  },
  match: function(value, bindings) {
    return (value instanceof this.ctor &&
            this.performMatch(value.toObject(), this.objPattern, bindings));
  }
});

// Custom pattern for matching Immutable.List objects.
var immutableList = Pattern.extend({
  init: function(arrPattern) {
    this.arrPattern = arrPattern;
    this.arity = this.getArity(arrPattern);
  },
  match: function(value, bindings) {
    return (Immutable.List.isList(value) &&
            this.performMatch(value.toArray(), this.arrPattern, bindings));
  }
});

function all(p) {
  if (!(this instanceof all)) {  // jshint ignore: line
    return new all(p);
  }
  this.pattern = p;  // jshint ignore: line
}

function combine(...patterns) {
  if (!(this instanceof combine)) {  // jshint ignore: line
    return new combine(...patterns);
  }
  this.patterns = patterns;  // jshint ignore: line
}

var identity = x => x;

// Private helpers
// ---------------

function convertPattern(p) {
  return immutableWalker.reduce(p, function(memo, node, key, parent) {
    if (Array.isArray(node))
      return immutableList(memo || []);
    if (typeof node === 'function')
      return node;
    if (node instanceof Immutable.Record)
      return immutableObj(memo || {}, node.constructor);
    if (node instanceof Object)
      return immutableObj(memo || {});
    assert(!memo);
    return node;
  });
}

// Generator that recursively tries to match `obj` with `pattern`.
// For each match, yields an array [path, bindings].
function* matchDeep(obj, pattern, path=[]) {
  var bindings;
  if ((bindings = match(obj, pattern)) !== null) {
    yield [path, bindings];
  } else {
    var isList = obj && Immutable.List.isList(obj);
    var isMap = obj && Immutable.Map.isMap(obj);

    if (isList || isMap) {
      for (var [k, v] of obj.entries()) {
        yield* matchDeep(v, pattern, path.concat(k));
      }
    }
  }
}

// Vat implementation
// ------------------

// A Vat is a tuple-space like thing. Eventually, I'd like to support objects
// and not just tuples, and 'object space' is such a boring name.
class Vat extends EventEmitter {
  constructor() {
    super();
    this._init();

    // Store this Vat's history in a Vat, but stop the recursion there -- don't
    // keep a history of the history.
    this._history = Object.create(Vat.prototype);
    this._history._init();
    this._history.put(this._store);
  }

  _init() {
    this._store = Immutable.Map();
    this._nextKey = 0;
    this._waiting = [];
    this.comparator = null;
    this._time = 0;
  }

  // Yields { key, bindings } for each match of `pattern` found in `store`.
  *_getMatches(pattern, store=this._store) {
    var p = convertPattern(pattern instanceof all ? pattern.pattern : pattern);
    for (var [key, obj] of store.sort(this.comparator)) {
      var bindings = match(obj.value, p);
      if (bindings) {
        yield {index: key, bindings: bindings};
      }
    }
  }

  // Yields { key, path, bindings } for each deep match of `pattern`
  // found in any of the objects in the store.
  *_getDeepMatches(pattern, comparator=this.comparator) {
    var p = convertPattern(pattern instanceof all ? pattern.pattern : pattern);
    var path;
    for (var [key, obj] of this._store.sort(comparator)) {
      path = [key];
      var root = obj.value;
      for (var [matchPath, bindings] of matchDeep(root, p, path)) {
        var rootPath = matchPath.slice(1);
        yield {index: matchPath[0], path: rootPath, bindings: bindings};
      }
    }
  }

  _updateStore(updateFn) {
    this._store = updateFn.call(this).sort(this._comparator);
    if (this._history) {
      this._history.put(this._store);

      // TODO: Get rid of change events entirely.
      this.emit('change');
    }
  }

  _doWithoutHistory(fn) {
    var hist = this._history;
    this._history = null;
    try {
      return fn.call(this);
    } finally {
      this._history = hist;
    }
  }

  _try(pattern, op, cb) {
    var result = this['try_' + op].call(this, pattern);
    if (result) {
      cb(result);
      return true;
    }
    return false;
  }

  _tryOrWait(pattern, op, cb) {
    this._waiting.push({
      pattern: pattern,
      op: op,
      callback: cb
    });
    this.step();
  }

  _tryWatch(pattern, cb) {
    if (pattern instanceof combine) {
      var matchIters = pattern.patterns.map(p => this._getMatches(p));
      var firstMatches = matchIters.map(it => Immutable.Seq(it).first());

      // Check that every pattern has exactly one match.
      if (!matchIters.every(it => it.next().done)) {
        throw new Error('Ambiguous pattern combination');
      }
      if (Immutable.List(firstMatches).groupBy(m => m.index).size !== firstMatches.length) {
        throw new Error('Overlapping patterns');
      }

      let combo = Immutable.fromJS(firstMatches.concat(cb));
      if (!combinations.has(combo)) {
        cb(...firstMatches.map(m => this._store.get(m.index).value));
        combinations = combinations.add(combo);
      }
    }
    for (var m of this._getMatches(pattern)) {
      let entry = this._store.get(m.index);
      let combo = Immutable.fromJS([entry, cb]);
      if (!combinations.has(combo)) {
        cb(entry.value);
        combinations = combinations.add(combo);
      }
    }
  }

  // Removes the element at `index` from the store, and returns its entry.
  _removeAt(index) {
    var entry = this._store.get(index);
    this._updateStore(() => this._store.delete(index));
    return entry;
  }

  // Like `_removeAt`, but removes elements from every index given in `arr`,
  // and returns an Array of values. The indices in `arr` can be in any order
  // and may contain duplicates.
  _removeAll(arr, cb=identity) {
    var result = arr.map(i => this._store.get(i));
    this._updateStore(() => {
      var store = this._store;
      var indices = arr.slice().sort((a, b) => b - a);
      var prevIndex;
      for (var i of indices) {
        if (i !== prevIndex) {
          store = store.delete(i);
        }
        prevIndex = i;
      }
      return store;
    });
    return result;
  }

  put(value) {
    // Update the store.
    var storedObj = new StoreEntry({value: Immutable.fromJS(value), key: this._nextKey++});
    this._updateStore(() => this._store.set(storedObj.key, storedObj));
  }

  step() {
    // A really naive version of deferred take/copy. This should
    // probably be written in a more efficient way.
    this._waiting = this._waiting.filter(({pattern, op, callback}) => {
      if (op === 'watch') {
        this._tryWatch(pattern, callback);
        return true;
      } else {
        return !this._try(pattern, op, callback);
      }
    });
    this._time++;
  }

  try_copy(pattern) {
    var result = Immutable.Seq(this._getMatches(pattern)).map(m => {
      return this._store.get(m.index).value;
    });
    return pattern instanceof all ? result.toArray() : result.first();
  }

  copy(pattern, cb) {
    this._tryOrWait(pattern, 'copy', cb);
  }

  try_copy_all(pattern) {
    return this.try_copy(all(pattern));
  }

  try_take(pattern, deep) {
    var matches = Immutable.Seq(deep ? this._getDeepMatches(pattern)
                                     : this._getMatches(pattern));
    var toRemove = matches.map(m => m.index);
    var values = matches.map(m => {
      var val = this._store.get(m.index).value;
      return deep ? [val, m.path] : val;
    });
    var result;
    if (pattern instanceof all) {
      result = values.toArray();
      this._removeAll(toRemove.toArray());
    } else if (values.first() !== undefined) {
      result = values.first();
      this._removeAt(toRemove.first());
    }
    return result;
  }

  take(pattern, cb) {
    this._tryOrWait(pattern, 'take', cb);
  }

  try_take_all(pattern, deep) {
    return this.try_take(all(pattern), deep);
  }

  update(pattern, cb) {
    var self = this;
    this.take(pattern, function(match) {
      self.put(cb(match));
    });
  }

  watch(pattern, cb) {
    this._waiting.push({
      pattern: pattern,
      op: 'watch',
      callback: cb
    });
  }

  // Does what you'd expect.
  size() {
    return this._store.size;
  }
}

Vat.all = all;
Vat.combine = combine;
Vat.ABORT = {};

// Exports
// -------

module.exports = Vat;
