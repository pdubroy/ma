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

function and(...patterns) {
  if (!(this instanceof and)) {  // jshint ignore: line
    return new and(...patterns);
  }
  this.patterns = patterns;  // jshint ignore: line
}

var identity = x => x;

function isUndefined(x) {
  return x === undefined;
}

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
    this._waiting = Immutable.List();
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

  _entryValue(entry) {
    return this._store.get(entry.index).value;
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
    this._waiting = this._waiting.push({
      pattern: pattern,
      op: op,
      callback: cb
    });
//    this.step();
  }

  _tryWatch(pattern, cb) {
    if (pattern instanceof and) {
      var patterns = pattern.patterns;
      var matchIters = patterns.map(p => this._getMatches(p));
      var firstMatches = matchIters.map((it, i) => {
        var seq = Immutable.Seq(it);
        if (patterns[i] instanceof all) {
          return seq.toArray();
        }
        // Ensure that no pattern has more than one match.
        if (seq.count() > 1) {
          throw new Error('Ambiguous pattern combination');
        }
        return seq.first();
      });

      if (!firstMatches.some(isUndefined)) {
        // TODO: Ensure that the matches do not overlap.

        // Run the callback only if it has not seen this combination of arguments before.
        let combo = Immutable.fromJS(firstMatches.concat(cb));
        if (!combinations.has(combo)) {
          var args = firstMatches.map(x => {
            // Expand any `all` matches.
            return Array.isArray(x) ? x.map(this._entryValue, this) : this._entryValue(x);
          });
          cb(...args);
          combinations = combinations.add(combo);
          return true;
        }
      }
    } else {
      for (var m of this._getMatches(pattern)) {
        let combo = Immutable.fromJS([m, cb]);
        if (!combinations.has(combo)) {
          cb(this._entryValue(m));
          combinations = combinations.add(combo);
          return true;
        }
      }
    }
    return false;
  }

  // Removes elements from every index given in `arr`, which can be in any order
  // and may contain duplicates.
  _removeAll(arr, cb=identity) {
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
  }

  put(value) {
    // Update the store.
    var storedObj = new StoreEntry({value: Immutable.fromJS(value), key: this._nextKey++});
    this._updateStore(() => this._store.set(storedObj.key, storedObj));
  }

  step() {
    if (this._stepping) {
      return;
    }
    this._stepping = true;

    let done = false;
    while (!done) {
      let prevStore = this._store;
      let prevWaiting = this._waiting;
      this._waiting = Immutable.List();
      let waiting = [];
      let agentsActive = false;
      for (var entry of prevWaiting) {
        var {pattern, op, callback} = entry;
        if (op === 'watch') {
          if (this._tryWatch(pattern, callback)) {
            agentsActive = true;
          }
          waiting.push(entry);
        } else if (!this._try(pattern, op, callback)) {
          waiting.push(entry);
        }
      }
      this._time++;

      // The store is quiescent when no new items have been added, and no new
      // processes are waiting.
      if (!agentsActive && Immutable.is(this._store, prevStore) && this._waiting.size === 0) {
        done = true;
      }
      this._waiting = Immutable.List(waiting).concat(this._waiting);
    }
    this.emit('step');
    this._stepping = false;
  }

  try_copy(pattern) {
    return this._doMatch(pattern, false, false);
  }

  copy(pattern, cb) {
    this._tryOrWait(pattern, 'copy', cb);
  }

  try_copy_all(pattern) {
    return this.try_copy(all(pattern));
  }

  _doMatch(pattern, deep, removeFromStore) {
    var matches = Immutable.Seq(deep ? this._getDeepMatches(pattern)
                                     : this._getMatches(pattern));
    if (!(pattern instanceof all)) {
      matches = matches.take(1);
    }
    var toRemove = matches.map(m => m.index);
    var values = matches.map(m => {
      var val = this._store.get(m.index).value;
      return deep ? [val, m.path] : val;
    });
    var result = pattern instanceof all ? values.toArray() : values.first();
    if (removeFromStore) {
      this._removeAll(toRemove.toArray());
    }
    return result;
  }

  try_take(pattern, deep) {
    return this._doMatch(pattern, deep, true);
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
    this.step();
  }

  watch(pattern, cb) {
    this._waiting = this._waiting.push({
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
Vat.and = and;
Vat.ABORT = {};

// Exports
// -------

module.exports = Vat;
