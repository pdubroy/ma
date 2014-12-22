'use strict';

var assert = require('assert'),
    EventEmitter = require('events').EventEmitter,
    Immutable = require('immutable'),
    util = require('util'),
    walk = require('tree-walk');

var pm = require('../third_party/pattern-match');
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

// The equivalent of `indexOf` but using `match` rather than ==.
function find(arr, pattern, optStart) {
  var p = convertPattern(pattern);
  for (var i = optStart || 0; i < arr.size; ++i) {
    if (match(arr.get(i).value, p) !== null)
      return i;
  }
  return -1;
}

function findDeep(arr, pattern, optStart) {
  var p = convertPattern(pattern);
  var path = [];
  for (var i = optStart || 0; i < arr.size; ++i) {
    path.push(i);
    var root = arr.get(i).value;
    var bindings;
    if ((bindings = matchDeep(root, p, path)) !== null)
      return { root: root, path: path, bindings: bindings };
    path.pop();
  }
  return null;
}

// Recursively tries to match `obj` with `pattern`.
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
  this._updateStore(function() {
    return this._store.splice(index, 1);
  });
  return result;
};

Vat.prototype._tryReaction = function(r) {
  // Prevent this reaction from matching against objects it's already matched.
  var self = this;
  function accept(match) {
    var record = self._store.get(match.path[0]);
    if (!record.reactions.has(r)) {
      record.reactions.set(r, true);
      return true;
    }
  }
  var result = this._doWithoutHistory(function() {
    if (r instanceof Reaction)
      return this._try_take_deep(r.pattern, accept);

    var match = this._try_copy_deep(r.pattern);
    return accept(match) ? match : null;
  });
  if (!result) return;

  var arity = r.callback.length;
  var expectedArity = result.bindings.length + 1;
  assert(arity === expectedArity,
      'Bad function arity: expected ' + expectedArity + ', got ' + arity);

  var root = result.root;
  var value = root.getIn(result.path);

  if (r instanceof Observer) {
    r.callback.apply(null, [value].concat(result.bindings));
    return;
  }

  // Put the object back in the vat, replacing the matched part with the
  // result of the reaction function.
  var newValue = root.updateIn(result.path, function() {
    return r.callback.apply(null, [value].concat(result.bindings));
  });
  if (newValue === void 0)
    throw new TypeError('Reactions must return a value');
  if (newValue !== null)
    this.put(newValue);
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
  this._updateStore(function() {
    return this._store.push(storedObj);
  });

  // A really naive version of deferred take/copy. This should
  // probably be written in a more efficient way.
  var self = this;
  this._waiting = this._waiting.filter(function(info) {
    return !self._try(info.pattern, info.op, info.callback);
  });

  // TODO: A blocking take/copy is basically a one-time observer. They should
  // be implemented in the same way.
  observers.forEach(this._tryReaction, this);
  reactions.forEach(this._tryReaction, this);
};

Vat.prototype.try_copy = function(pattern) {
  var i = find(this._store, pattern);
  return i >= 0 ? this._store.get(i).value : null;
};

Vat.prototype.copy = function(pattern, cb) {
  this._tryOrWait(pattern, 'copy', cb);
};

Vat.prototype.try_copy_all = function(pattern) {
  var result = [];
  var i = 0;
  while ((i = find(this._store, pattern, i)) !== -1) {
    result.push(this._store.get(i).value);
    ++i;
  }
  return result;
};

Vat.prototype._try_take_deep = function(pattern, test) {
  var start = 0, result;
  while (true) {
    if (!(result = findDeep(this._store, pattern, start)))
      break;

    if (!test || test(result)) {
      this._removeAt(result.path.shift());
      return result;
    }
    start = result.path[0] + 1;
  }
  return null;
};

Vat.prototype._try_copy_deep = function(pattern) {
  var result;
  this._try_take_deep(pattern, function(match) { result = match; });
  return result;
};

Vat.prototype.try_take = function(pattern, deep) {
  if (deep) {
    var result = this._try_take_deep(pattern);
    return result ? [result.root, result.path] : null;
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
  this.put(new Reaction({ pattern: pattern, callback: reaction }));
};

Vat.prototype.addObserver = function(pattern, cb) {
  this.put(new Observer({ pattern: pattern, callback: cb }));
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
