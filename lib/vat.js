/* jshint esnext: true */

'use strict';

var assert = require('assert'),
    EventEmitter = require('events').EventEmitter,
    Immutable = require('immutable'),
    walk = require('tree-walk');

var pm = require('../third_party/pattern-match'),
    gu = require('./generator-util');
require('../third_party/weakmap.js');

var match = pm.match,
    Pattern = pm.Pattern;

var Reaction = Immutable.Record({ pattern: null, callback: null }, 'Reaction');
var Observer = Immutable.Record({ pattern: null, callback: null }, 'Observer');
var MultiReaction = Immutable.Record({ patterns: null, callback: null }, 'MultiReaction');

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

// A pattern type which allows restricted matching on Reactions.
var reaction = Pattern.extend({
  init: function(r) {
    this.reaction = r;
  },
  match: function(value, bindings) {
    var r = this.reaction;
    // Only match if the pattern and the callback are identical. More general
    // matching on reactions needs more thought.
    return ((value instanceof Reaction || value instanceof Observer) &&
            value.pattern === r.pattern && value.callback === r.callback);
  },
  arity: 0
});

// Private helpers
// ---------------

function convertPattern(p) {
  return immutableWalker.reduce(p, function(memo, node, key, parent) {
    if (Array.isArray(node))
      return immutableList(memo || []);
    if (typeof node === 'function')
      return node;
    if (node instanceof Reaction || node instanceof Observer)
      return reaction(node);
    if (node instanceof Immutable.Record)
      return immutableObj(memo || {}, node.constructor);
    if (node instanceof Object)
      return immutableObj(memo || {});
    assert(!memo);
    return node;
  });
}

// Helper which returns the index of the first match of `pattern` in `arr`.
// It does not match deeply, and does not return the pattern bindings. Use
// `getMatches` or `getDeepMatches` for those use cases.
function find(arr, pattern) {
  var firstMatch = gu.first(getMatches(arr, pattern));
  return firstMatch ? firstMatch[0] : -1;
}

// Yields [index, bindings] for each match of `pattern` found in `arr`.
function* getMatches(arr, pattern) {
  var p = convertPattern(pattern);
  for (var i = 0; i < arr.size; ++i) {
    var bindings = match(arr.get(i).value, p);
    if (bindings) {
      yield [i, bindings];
    }
  }
}

// Yields an { index, root, path, bindings } for each deep match of `pattern`
// found in any of the objects in `arr`.
function* getDeepMatches(arr, pattern) {
  var p = convertPattern(pattern);
  var path;
  for (var i = 0; i < arr.size; ++i) {
    path = [i];
    var root = arr.get(i).value;
    for (var [matchPath, bindings] of matchDeep(root, p, path)) {
      var rootPath = matchPath.slice(1);
      yield {index: matchPath[0], root: root, path: rootPath, bindings: bindings};
    }
  }
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
      for (var entry of obj.entries()) {
        yield* matchDeep(entry[1], pattern, path.concat(entry[0]));
      }
    }
  }
}

// Return true if `r1`, and `r2` are conflicting reactions, otherwise false.
// For convenience, either argument -- or both -- may be undefined or null.
function areReactionsConflicting(r1, r2) {
  return r1 && r2 && (r1._name === 'Reaction' || r2._name === 'Reaction');
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
    this._store = Immutable.List();
    this._waiting = [];
    this._reactions = [];
    this._observers = [];
  }

  _updateStore(updateFn) {
    this._store = updateFn.call(this);
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
    if (!this._try(pattern, op, cb)) {
      this._waiting.push({
        pattern: pattern,
        op: op,
        callback: cb
      });
    }
  }

  // Removes the element at `index` from the store, and returns its value.
  _removeAt(index) {
    var result = this._store.get(index).value;
    this._updateStore(() => this._store.splice(index, 1));
    return result;
  }

  // Like `_removeAt`, but removes elements from every index given in `arr`,
  // and returns an Array of values. The indices in `arr` can be in any order
  // and may contain duplicates.
  _removeAll(arr) {
    var result = arr.map(i => this._store.get(i).value);
    this._updateStore(() => {
      var store = this._store;
      var indices = arr.slice().sort((a, b) => b - a);
      var prevIndex;
      for (var i of indices) {
        if (i !== prevIndex) {
          store = store.splice(i, 1);
        }
        prevIndex = i;
      }
      return store;
    });
    return result;
  }

  _collectReactionCandidates(...lists) {
    var candidates = [];
    [].concat(...lists).forEach((r) => {
      if (r instanceof MultiReaction) {
        // HACK: Don't add MultiReactions to candidates -- just run 'em directly.
        this._runMultiReaction(r);
      } else {
        // Prevent this reaction from matching against objects it's already matched.
        // FIXME: This should really check for a match _at the same path_.
        var accept = (m) => {
          var record = this._store.get(m.index);
          if (!record.reactions.has(r)) {
            record.reactions.set(r, true);
            return true;
          }
          return false;
        };

        // TODO: I think this could be vastly simplified. Only an Observer can
        // fire twice on the same object, so when the observer is first added,
        // test it on all the objects in the vat, and after that, only test it
        // on new objects that are added.
        var matches = gu.filter(getDeepMatches(this._store, r.pattern), accept);
        matches.forEach(m => {
          var i = m.index;
          if (!candidates.hasOwnProperty(i))
            candidates[i] = [];
          candidates[i].push([r, m]);
        });
      }
    });
    return candidates;
  }

  _runReaction(r, match) {
    if (r instanceof Reaction)
      this._doWithoutHistory(() => this._removeAt(match.index));

    var arity = r.callback.length;
    var expectedArity = match.bindings.length + 1;
    assert(arity === expectedArity,
        'Bad function arity: expected ' + expectedArity + ', got ' + arity);

    var root = match.root;
    var value, newValue;

    function applyCallback() {
      return r.callback.apply(null, [value].concat(match.bindings));
    }

    if (match.path.length === 0) {
      value = root;
      newValue = applyCallback();
    } else {
      value = root.getIn(match.path);
      newValue = root.updateIn(match.path, applyCallback);
    }

    if (r instanceof Reaction) {
      // Put the object back in the vat, replacing the matched part with the
      // result of the reaction function.
      if (newValue === void 0)
        throw new TypeError('Reactions must return a value');
      if (newValue !== null)
        this.put(newValue);
    }
  }

  _runMultiReaction(r) {
    var newStore = this._store;
    var values = [];
    var allBindings = [];
    var succeeded = r.patterns.every(p => {
      // Basically, do a try_take.
      var match = gu.first(getMatches(newStore, p));
      if (!match) {
        return false;
      }
      var [index, bindings] = match;
      values.push(newStore.get(index).value);
      allBindings = allBindings.concat(bindings);
      newStore = newStore.splice(index, 1);
      return true;
    });
    if (succeeded) {
      // Update the store without recording history.
      this._store = newStore;

      var arity = r.callback.length;
      var expectedArity = allBindings.length + 1;
      assert(arity === expectedArity,
          'Bad function arity: expected ' + expectedArity + ', got ' + arity);

      var newValue = r.callback.apply(null, [values].concat(allBindings));
      if (newValue === void 0)
        throw new TypeError('Reactions must return a value');
      if (newValue !== null)
        this.put(newValue);
    }
  }

  _executeReactions(candidates) {
    // To detect conflicts, keep track of all paths that are touched.
    var reactionPaths = Object.create(null);

    Object.keys(candidates).reverse().forEach(i => {
      // Sort candidates based on path length (longest to shortest).
      var sorted = candidates[i].slice().sort((a, b) => {
        return a[1].path.length - b[1].path.length;
      });

      // Execute each reaction, detecting conflicts as we go.
      sorted.forEach(([reaction, match]) => {
        var path = match.path;

        // Check all ancestor paths to see if one was already touched.
        var pathString;
        for (var j = 0; j <= path.length; ++j) {
          pathString = [i].concat(path.slice(0, j)).join('/') + '/';
          if (areReactionsConflicting(reactionPaths[pathString], reaction))
            throw new Error('Reaction conflict');
        }
        reactionPaths[pathString] = reaction;

        this._runReaction(reaction, match);
      });
    });
  }

  put(value) {
    // Update the store.
    var storedObj = {
      value: Immutable.fromJS(value),
      reactions: new WeakMap()
    };
    this._updateStore(() => this._store.push(storedObj));
    this._checkForMatches();
  }

  _checkForMatches() {
    // A really naive version of deferred take/copy. This should
    // probably be written in a more efficient way.
    var self = this;
    this._waiting = this._waiting.filter(function(info) {
      return !self._try(info.pattern, info.op, info.callback);
    });

    var candidates = this._collectReactionCandidates(this._reactions, this._observers);
    this._executeReactions(candidates);
  }

  try_copy(pattern) {
    var i = find(this._store, pattern);
    return i >= 0 ? this._store.get(i).value : null;
  }

  copy(pattern, cb) {
    this._tryOrWait(pattern, 'copy', cb);
  }

  try_copy_all(pattern) {
    var matches = gu.toArray(getMatches(this._store, pattern));
    return matches.map(arr => this._store.get(arr[0]).value);
  }

  try_take(pattern, deep) {
    if (deep) {
      var result = gu.first(getDeepMatches(this._store, pattern));
      if (result) {
        this._removeAt(result.index);
        return [result.root, result.path];
      }
      return null;
    }
    var i = find(this._store, pattern);
    return i >= 0 ? this._removeAt(i) : null;
  }

  take(pattern, cb) {
    this._tryOrWait(pattern, 'take', cb);
  }

  try_take_all(pattern, deep) {
    var matches;
    if (deep) {
      matches = gu.toArray(getDeepMatches(this._store, pattern));
      this._removeAll(matches.map(m => m.index));
      return matches.map(m => [m.root, m.path]);
    } else {
      matches = gu.toArray(getMatches(this._store, pattern));
      return this._removeAll(matches.map(arr => arr[0]));
    }
  }

  // A reaction is a process that attempts to `take` a given pattern every
  // time the tuple space changes. If the `reaction` function produces a result,
  // the result is put into the tuple space.
  addReaction(/* patterns..., reaction */) {
    var args = arguments;
    var reaction = args[args.length - 1];
    var r;
    if (arguments.length === 2) {
      r = new Reaction({ pattern: args[0], callback: reaction });
    } else {
      r = new MultiReaction({
        patterns: Array.prototype.slice.call(args, 0, args.length - 1),
        callback: reaction
      });
    }
    this._reactions.push(r);
    this._checkForMatches();
    return r;
  }

  addObserver(/* patterns..., cb */) {
    if (arguments.length !== 2) {
      throw new Error('MultiObservers not yet supported');
    }
    var cb = arguments[arguments.length - 1];
    var o = new Observer({ pattern: arguments[0], callback: cb });
    this._observers.push(o);
    this._checkForMatches();
    return o;
  }

  update(pattern, cb) {
    var self = this;
    this.take(pattern, function(match) {
      self.put(cb(match));
    });
  }

  // Does what you'd expect.
  size() {
    return this._store.size;
  }
}

// Exports
// -------

module.exports = Vat;
