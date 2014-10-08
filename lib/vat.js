'use strict';

var EventEmitter = require('events').EventEmitter,
    Immutable = require('immutable'),
    util = require('util');

var isEqual = require('./isEqual');

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
}

util.inherits(Vat, EventEmitter);

Vat.ANY = isEqual.ANY;

Vat.prototype._init = function() {
  this._store = Immutable.Vector();
  this._waiting = [];
};

Vat.prototype._updateStore = function(updateFn) {
  var oldStore = this._store;
  this._store = updateFn.call(this);
  if (this._history)
    this._history.put(oldStore);
  this.emit('change');
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

Vat.prototype.put = function(obj) {
  var storedObj = Immutable.fromJS(obj);
  this._updateStore(function() {
    return this._store.push(storedObj);
  });

  // A really naive version of deferred take/copy. This should
  // probably be written in a more efficient way.
  this._waiting = this._waiting.filter(function(info) {
    return !this._try(info.pattern, info.op, info.callback);
  }.bind(this));
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
// TODO: A blocking take is basically a one-shot reaction. They should be
// implemented in the same way.
Vat.prototype.addReaction = function(pattern, reaction) {
  var self = this;
  function react() {
    var match;
    if (!(match = self.try_take(pattern, true)))
      return;

    // Move the listener to the back of the line so others get first crack.
    self.removeListener('change', react);
    self.on('change', react);

    var path = match[1];
    // Put the object back in the vat, replacing the matched part with the
    // result of the reaction function.
    self.put(match[0].updateIn(path, function() {
      return reaction(match[0].getIn(path));
    }));
  }
  react();
  this.on('change', react);
};

Vat.prototype.update = function(pattern, reaction) {
  var self = this;
  this.take(pattern, function(match) {
    self.put(reaction(match));
  });
};

// Does what you'd expect.
Vat.prototype.size = function() {
  return this._store.length;
};

// Exports
// -------

module.exports = Vat;
