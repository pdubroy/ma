/* jshint esnext: true */

'use strict';

var assert = require('assert'),
    EventEmitter = require('events').EventEmitter,
    Immutable = require('immutable'),
    util = require('util'),
    walk = require('tree-walk');

var pm = require('../third_party/pattern-match'),
    gu = require('./generator-util');
require('../third_party/weakmap.js');

var match = pm.match,
    Pattern = pm.Pattern;

var Reaction = Immutable.Record({ pattern: null, callback: null }, 'Reaction');
var Observer = Immutable.Record({ pattern: null, callback: null }, 'Observer');

var instanceOf = pm.Matcher.instanceOf;

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

function* getMatches(arr, pattern) {
  var p = convertPattern(pattern);
  for (var i = 0; i < arr.size; ++i) {
    if (match(arr.get(i).value, p) !== null)
      yield i;
  }
}

function find(arr, pattern) {
  var result = gu.first(getMatches(arr, pattern));
  return result === undefined ? -1 : result;
}

// NOTE: This does not return all possible matches, due to the way `matchDeep`
// works.
function* getDeepMatches(arr, pattern) {
  var p = convertPattern(pattern);
  var path;
  for (var i = 0; i < arr.size; ++i) {
    path = [i];
    var root = arr.get(i).value;
    var bindings;
    if ((bindings = matchDeep(root, p, path)) !== null) {
      var rootPath = path.slice(1);
      yield { index: path[0], root: root, path: rootPath, bindings: bindings };
    }
  }
}

// Recursively tries to match `obj` with `pattern`. NOTE: This only returns
// the first deep match found in a given object.
function matchDeep(obj, pattern, path) {
  var result;
  if ((result = match(obj, pattern)) !== null)
    return result;

  var isList = obj && Immutable.List.isList(obj);
  var isMap = obj && Immutable.Map.isMap(obj);

  if (isList || isMap) {
    for (var it = obj.entries();;) {
      var entry = it.next();
      if (entry.done) break;
      path.push(entry.value[0]);
      if ((result = matchDeep(entry.value[1], pattern, path)) !== null)
        return result;
      path.pop();
    }
  }
  return null;
}

// Vat implementation
// ------------------

// A Vat is a tuple-space like thing. Eventually, I'd like to support objects
// and not just tuples, and 'object space' is such a boring name.
function Vat() {
  this._init();

  // Store this Vat's history in a Vat, but stop the recursion there -- don't
  // keep a history of the history.
  this._history = Object.create(Vat.prototype);
  this._history._init();
  this._history.put(this._store);
}

util.inherits(Vat, EventEmitter);

Vat.prototype._init = function() {
  this._store = Immutable.List();
  this._waiting = [];
};

Vat.prototype._updateStore = function(updateFn) {
  this._store = updateFn.call(this);
  if (this._history) {
    this._history.put(this._store);

    // TODO: Get rid of change events entirely.
    this.emit('change');
  }
};

Vat.prototype._doWithoutHistory = function(fn) {
  var hist = this._history;
  this._history = null;
  try {
    return fn.call(this);
  } finally {
    this._history = hist;
  }
};

Vat.prototype._try = function(pattern, op, cb) {
  var result = this['try_' + op].call(this, pattern);
  if (result) {
    cb(result);
    return true;
  }
  return false;
};

Vat.prototype._tryOrWait = function(pattern, op, cb) {
  if (!this._try(pattern, op, cb)) {
    this._waiting.push({
      pattern: pattern,
      op: op,
      callback: cb
    });
  }
};

Vat.prototype._removeAt = function(index) {
  var result = this._store.get(index).value;
  this._updateStore(() => this._store.splice(index, 1));
  return result;
};

Vat.prototype._collectReactionCandidates = function(...lists) {
  var candidates = [];
  var store = this._store;
  [].concat(...lists).forEach(function(r) {
    // Prevent this reaction from matching against objects it's already matched.
    // FIXME: This should really check for a match _at the same path_.
    function accept(m) {
      var record = store.get(m.index);
      if (!record.reactions.has(r)) {
        record.reactions.set(r, true);
        return true;
      }
    }

    var matches = gu.filter(getDeepMatches(store, r.pattern), accept);
    matches.forEach(m => {
      var i = m.index;
      if (!candidates.hasOwnProperty(i))
        candidates[i] = [];
      candidates[i].push([r, m]);
    });
  });
  return candidates;
};

Vat.prototype._runReaction = function(r, match) {
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
};

Vat.prototype._executeReactions = function(candidates) {
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
      var pathString = i + '/';
      for (var j = 0; j < path.length; ++j) {
        if (pathString in reactionPaths)
          throw new Error('Reaction conflict');
        pathString += path[j] + '/';
      }
      if (pathString in reactionPaths)
        throw new Error('Reaction conflict');
      reactionPaths[pathString] = true;

      this._runReaction(reaction, match);
    });
  });
};

Vat.prototype.put = function(value) {
  // Copy the reactions before updating the store, as a reaction shouldn't be
  // able to immediately react to itself.
  var observers = this.try_copy_all(instanceOf(Observer));
  var reactions = this.try_copy_all(instanceOf(Reaction));

  // Update the store.
  var storedObj = {
    value: Immutable.fromJS(value),
    reactions: new WeakMap()
  };
  this._updateStore(() => this._store.push(storedObj));

  // A really naive version of deferred take/copy. This should
  // probably be written in a more efficient way.
  var self = this;
  this._waiting = this._waiting.filter(function(info) {
    return !self._try(info.pattern, info.op, info.callback);
  });

  var candidates = this._collectReactionCandidates(reactions, observers);
  this._executeReactions(candidates);
};

Vat.prototype.try_copy = function(pattern) {
  var i = find(this._store, pattern);
  return i >= 0 ? this._store.get(i).value : null;
};

Vat.prototype.copy = function(pattern, cb) {
  this._tryOrWait(pattern, 'copy', cb);
};

Vat.prototype.try_copy_all = function(pattern) {
  var matches = gu.toArray(getMatches(this._store, pattern));
  return matches.map(i => this._store.get(i).value);
};

Vat.prototype.try_take = function(pattern, deep) {
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
};

Vat.prototype.take = function(pattern, cb) {
  this._tryOrWait(pattern, 'take', cb);
};

// A reaction is a process that attempts to `take` a given pattern every
// time the tuple space changes. If the `reaction` function produces a result,
// the result is put into the tuple space.
Vat.prototype.addReaction = function(pattern, reaction) {
  var r = new Reaction({ pattern: pattern, callback: reaction });
  this.put(r);
  return r;
};

Vat.prototype.addObserver = function(pattern, cb) {
  var o = new Observer({ pattern: pattern, callback: cb });
  this.put(o);
  return o;
};

Vat.prototype.update = function(pattern, cb) {
  var self = this;
  this.take(pattern, function(match) {
    self.put(cb(match));
  });
};

// Does what you'd expect.
Vat.prototype.size = function() {
  return this._store.size;
};

Vat.Reaction = Reaction;
Vat.Observer = Observer;

// Exports
// -------

module.exports = Vat;
