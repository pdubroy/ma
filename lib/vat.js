'use strict';

var EventEmitter = require('events').EventEmitter,
    Immutable = require('immutable'),
    util = require('util');

var isEqual = require('./isEqual'),
    partial = require('./match').partial;

var Reaction = Immutable.Record({ pattern: null, reaction: null }, 'Reaction');
var Observer = Immutable.Record({ pattern: null, callback: null }, 'Observer');

// Private helpers
// ---------------

// The equivalent of `indexOf` but using `isEqual` rather than ==.
function find(arr, pattern) {
  var v = Immutable.fromJS(pattern);
  for (var i = 0; i < arr.length; ++i) {
    if (isEqual(arr.get(i), v)) {
      return i;
    }
  }
  return -1;
}

function findAll(arr, pattern) {
  var v = Immutable.fromJS(pattern);
  var result = [];
  for (var i = 0; i < arr.length; ++i) {
    var candidate = arr.get(i);
    if (isEqual(candidate, v))
      result.push(candidate);
  }
  return result;
}

function findDeep(arr, pattern) {
  var v = Immutable.fromJS(pattern);
  var path = [];
  for (var i = 0; i < arr.length; ++i) {
    path.push(i);
    if (matches(arr.get(i), v, path))
      return path;
    path.pop();
  }
  return null;
}

// Recursively tries to match `obj` with `pattern`.
function matches(obj, pattern, path) {
  if (isEqual(obj, pattern))
    return true;

  var isVector = obj && obj.constructor === Immutable.Vector;
  var isMap = obj && obj.constructor === Immutable.Map;

  if (isVector || isMap) {
    for (var it = obj.entries();;) {
      var entry = it.next();
      if (entry.done) break;
      path.push(entry.value[0]);
      if (matches(entry.value[1], pattern, path))
        return true;
      path.pop();
    }
  }
  return false;
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
  this._store = Immutable.Vector();
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
  var result = this._store.get(index);
  this._updateStore(function() {
    return this._store.splice(index, 1).toVector();
  });
  return result;
};

Vat.prototype._tryReaction = function(r) {
  var match = this._doWithoutHistory(function() {
    return this.try_take(r.pattern, true);
  });
  if (!match) return;

  var root = match[0], path = match[1];

  // Put the object back in the vat, replacing the matched part with the
  // result of the reaction function.
  var result = root.updateIn(path, function() {
    return r.reaction(root.getIn(path));
  });
  if (result === void 0)
    throw new TypeError('Reactions must return a value');
  if (result !== null)
    this.put(result);
};

Vat.prototype.put = function(obj) {
  // Copy the reactions before updating the store, as a reaction shouldn't be
  // able to immediately react to itself.
  var reactions = this.try_copy_all(partial(Reaction, {}));
  var observers = this.try_copy_all(partial(Observer, {}));

  // Update the store.
  var storedObj = Immutable.fromJS(obj);
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
  observers.forEach(function(o) { self._try(o.pattern, 'copy', o.callback); });
  reactions.forEach(this._tryReaction.bind(this));
};

Vat.prototype.try_copy = function(pattern) {
  var i = find(this._store, pattern);
  return i >= 0 ? this._store.get(i) : null;
};

Vat.prototype.copy = function(pattern, cb) {
  this._tryOrWait(pattern, 'copy', cb);
};

Vat.prototype.try_copy_all = function(pattern) {
  return findAll(this._store, pattern);
};

Vat.prototype.try_take = function(pattern, deep) {
  if (deep) {
    var path = findDeep(this._store, pattern);
    return path ? [this._removeAt(path.shift()), path] : null;
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
  this.put(new Reaction({ pattern: pattern, reaction: reaction }));
};

Vat.prototype.addObserver = function(pattern, cb) {
  this.put(new Observer({ pattern: pattern, callback: cb }));
};

Vat.prototype.update = function(pattern, cb) {
  var self = this;
  this._tryOrWait(pattern, 'copy', cb);
  this.take(pattern, function(match) {
    self.put(cb(match));
  });
};

// Does what you'd expect.
Vat.prototype.size = function() {
  return this._store.length;
};

Vat.Reaction = Reaction;
Vat.Observer = Observer;

// Exports
// -------

module.exports = Vat;
