!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.ma=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = {
  Vat: require('./lib/vat'),
  match: require('./lib/match')
};

},{"./lib/match":3,"./lib/vat":4}],2:[function(require,module,exports){
// Based on Underscore.js 1.7.0 (http://underscorejs.org)
// (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
// Underscore may be freely distributed under the MIT license.

// Original source:
// https://github.com/jashkenas/underscore/blob/3f8d99ef97c8111c1c0196862588d8ceebe65384/underscore.js

/* jshint ignore: start */

var Immutable = require('immutable');

// Re-implementations of Underscore internal stuff
// -----------------------------------------------

var toString = Object.prototype.toString,
    hasOwnProperty = Object.prototype.hasOwnProperty;

function isObject(obj) {
  var type = typeof obj;
  return type === 'function' || type === 'object' && !!obj;
}

var _ = {
  isFunction: function(obj) {
    return toString.call(obj) === '[object Function]';
  },
  has: function(obj, key) {
    if (obj.constructor === Immutable.Map)
      return obj.has(key);

    return obj != null && hasOwnProperty.call(obj, key);
  },
  keys: function(obj) {
    if (!isObject(obj)) return [];

    if (obj.constructor === Immutable.Map) {
      var result = [];
      for (var it = obj.keys();;) {
        var val = it.next();
        if (val.done) break;
        result.push(val.value);
      }
      return result;
    }

    // Unlike Underscore, no fallback for ECMAScript < 5.1 here.
    return Object.keys(obj);
  }
};

// Core implementation for equality testing
// ----------------------------------------

// Internal recursive comparison function for `isEqual`.
var eq = function(a, b, aStack, bStack) {
  // Identical objects are equal. `0 === -0`, but they aren't identical.
  // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
  if (a === b) return a !== 0 || 1 / a === 1 / b;

  // Support predicates, but only for the `b` object.
  if (_.isFunction(b))
    return b(a);

  // A strict comparison is necessary because `null == undefined`.
  if (a == null || b == null) return a === b;

  // Handle lists from immutable-js.
  var areLists =
      Immutable.List.isList(a) && Immutable.List.isList(b);

  if (!areLists) {
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }
  }

  var areArrays = className === '[object Array]';
  if (!areArrays && !areLists) {
    if (typeof a != 'object' || typeof b != 'object') return false;

    // Objects with different constructors are not equivalent, but `Object`s or `Array`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                             _.isFunction(bCtor) && bCtor instanceof bCtor)
                        && ('constructor' in a && 'constructor' in b)) {
      return false;
    }
  }

  // Assume equality for cyclic structures. The algorithm for detecting cyclic
  // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
  var length = aStack.length;
  while (length--) {
    // Linear search. Performance is inversely proportional to the number of
    // unique nested structures.
    if (aStack[length] === a) return bStack[length] === b;
  }

  // Add the first object to the stack of traversed objects.
  aStack.push(a);
  bStack.push(b);
  var size, result;
  // Recursively compare objects and arrays.
  if (areArrays || areLists) {
    // Compare array lengths to determine if a deep comparison is necessary.
    size = 'size' in a ? a.size : a.length;
    result = size === ('size' in b ? b.size : b.length);
    if (result) {
      // Deep compare the contents, ignoring non-numeric properties.
      if (areLists) {
        while (size--)
          if (!(result = eq(a.get(size), b.get(size), aStack, bStack))) break;
      } else {
        while (size--)
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
      }
    }
  } else {
    // Deep compare objects/maps.
    var keys = _.keys(a), key;
    size = keys.length;

    // Handle Maps from immutable-js.
    var areMaps =
        a.constructor === Immutable.Map && a.constructor === b.constructor;

    // Ensure that both objects contain the same number of properties before comparing deep equality.
    result = _.keys(b).length === size;
    if (result) {
      while (size--) {
        // Deep compare each member
        key = keys[size];
        if (!(result = _.has(b, key) &&
            eq(areMaps ? a.get(key) : a[key], areMaps ? b.get(key) : b[key], aStack, bStack))) {
          break;
        }
      }
    }
  }
  // Remove the first object from the stack of traversed objects.
  aStack.pop();
  bStack.pop();
  return result;
};

// Exports
// -------

// Performs a deep comparison to check if two objects are equal.
function isEqual(a, b) {
  return eq(a, b, [], []);
}

module.exports = isEqual;

},{"immutable":11}],3:[function(require,module,exports){
'use strict';

var Immutable = require('Immutable');
var isEqual = require('./isEqual');

function ANY() { return true; }
ANY.toString = function() { return '(ANY)'; };

function partial(recordType, b) {
  // Handle invocation with only a single argument.
  if (arguments.length < 2) {
    b = recordType;
    recordType = null;
  }

  // Returns true if every key in `b` has the same value as in `a`, otherwise
  // false. Any keys in `a` that are not in `b` are irrelevant.
  return function matchSubset(a) {
    if (recordType && a.constructor !== recordType)
      return false;

    if (!Immutable.Iterable.isIterable(a))
      a = Immutable.fromJS(a);

    return isEqual(a, a.merge(b));
  };
}

module.exports = {
  ANY: ANY,
  partial: partial
};

},{"./isEqual":2,"Immutable":5}],4:[function(require,module,exports){
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
  for (var i = 0; i < arr.size; ++i) {
    if (isEqual(arr.get(i), v)) {
      return i;
    }
  }
  return -1;
}

function findAll(arr, pattern) {
  var v = Immutable.fromJS(pattern);
  var result = [];
  for (var i = 0; i < arr.size; ++i) {
    var candidate = arr.get(i);
    if (isEqual(candidate, v))
      result.push(candidate);
  }
  return result;
}

function findDeep(arr, pattern) {
  var v = Immutable.fromJS(pattern);
  var path = [];
  for (var i = 0; i < arr.size; ++i) {
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

  var isList = obj && obj.constructor === Immutable.List;
  var isMap = obj && obj.constructor === Immutable.Map;

  if (isList || isMap) {
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
  var result = this._store.get(index);
  this._updateStore(function() {
    return this._store.splice(index, 1);
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
  return this._store.size;
};

Vat.Reaction = Reaction;
Vat.Observer = Observer;

// Exports
// -------

module.exports = Vat;

},{"./isEqual":2,"./match":3,"events":6,"immutable":11,"util":10}],5:[function(require,module,exports){
/**
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */
function universalModule() {
  var $Object = Object;

function createClass(ctor, methods, staticMethods, superClass) {
  var proto;
  if (superClass) {
    var superProto = superClass.prototype;
    proto = $Object.create(superProto);
  } else {
    proto = ctor.prototype;
  }
  $Object.keys(methods).forEach(function (key) {
    proto[key] = methods[key];
  });
  $Object.keys(staticMethods).forEach(function (key) {
    ctor[key] = staticMethods[key];
  });
  proto.constructor = ctor;
  ctor.prototype = proto;
  return ctor;
}

function superCall(self, proto, name, args) {
  return $Object.getPrototypeOf(proto)[name].apply(self, args);
}

function defaultSuperCall(self, proto, args) {
  superCall(self, proto, 'constructor', args);
}

var $traceurRuntime = {};
$traceurRuntime.createClass = createClass;
$traceurRuntime.superCall = superCall;
$traceurRuntime.defaultSuperCall = defaultSuperCall;
"use strict";
function is(first, second) {
  if (first === second) {
    return first !== 0 || second !== 0 || 1 / first === 1 / second;
  }
  if (first !== first) {
    return second !== second;
  }
  if (first && typeof first.equals === 'function') {
    return first.equals(second);
  }
  return false;
}
function invariant(condition, error) {
  if (!condition)
    throw new Error(error);
}
var DELETE = 'delete';
var SHIFT = 5;
var SIZE = 1 << SHIFT;
var MASK = SIZE - 1;
var NOT_SET = {};
var CHANGE_LENGTH = {value: false};
var DID_ALTER = {value: false};
function MakeRef(ref) {
  ref.value = false;
  return ref;
}
function SetRef(ref) {
  ref && (ref.value = true);
}
function OwnerID() {}
function arrCopy(arr, offset) {
  offset = offset || 0;
  var len = Math.max(0, arr.length - offset);
  var newArr = new Array(len);
  for (var ii = 0; ii < len; ii++) {
    newArr[ii] = arr[ii + offset];
  }
  return newArr;
}
function assertNotInfinite(size) {
  invariant(size !== Infinity, 'Cannot perform this action with an infinite size.');
}
function ensureSize(iter) {
  if (iter.size === undefined) {
    iter.size = iter.__iterate(returnTrue);
  }
  return iter.size;
}
function wrapIndex(iter, index) {
  return index >= 0 ? index : ensureSize(iter) + index;
}
function returnTrue() {
  return true;
}
function isPlainObj(value) {
  return value && value.constructor === Object;
}
function wholeSlice(begin, end, size) {
  return (begin === 0 || (size !== undefined && begin <= -size)) && (end === undefined || (size !== undefined && end >= size));
}
function resolveBegin(begin, size) {
  return resolveIndex(begin, size, 0);
}
function resolveEnd(end, size) {
  return resolveIndex(end, size, size);
}
function resolveIndex(index, size, defaultIndex) {
  return index === undefined ? defaultIndex : index < 0 ? Math.max(0, size + index) : size === undefined ? index : Math.min(size, index);
}
function hash(o) {
  if (!o) {
    return 0;
  }
  if (o === true) {
    return 1;
  }
  var type = typeof o;
  if (type === 'number') {
    if ((o | 0) === o) {
      return o & HASH_MAX_VAL;
    }
    o = '' + o;
    type = 'string';
  }
  if (type === 'string') {
    return o.length > STRING_HASH_CACHE_MIN_STRLEN ? cachedHashString(o) : hashString(o);
  }
  if (o.hashCode) {
    return hash(typeof o.hashCode === 'function' ? o.hashCode() : o.hashCode);
  }
  return hashJSObj(o);
}
function cachedHashString(string) {
  var hash = stringHashCache[string];
  if (hash === undefined) {
    hash = hashString(string);
    if (STRING_HASH_CACHE_SIZE === STRING_HASH_CACHE_MAX_SIZE) {
      STRING_HASH_CACHE_SIZE = 0;
      stringHashCache = {};
    }
    STRING_HASH_CACHE_SIZE++;
    stringHashCache[string] = hash;
  }
  return hash;
}
function hashString(string) {
  var hash = 0;
  for (var ii = 0; ii < string.length; ii++) {
    hash = (31 * hash + string.charCodeAt(ii)) & HASH_MAX_VAL;
  }
  return hash;
}
function hashJSObj(obj) {
  var hash = weakMap && weakMap.get(obj);
  if (hash)
    return hash;
  hash = obj[UID_HASH_KEY];
  if (hash)
    return hash;
  if (!canDefineProperty) {
    hash = obj.propertyIsEnumerable && obj.propertyIsEnumerable[UID_HASH_KEY];
    if (hash)
      return hash;
    hash = getIENodeHash(obj);
    if (hash)
      return hash;
  }
  if (Object.isExtensible && !Object.isExtensible(obj)) {
    throw new Error('Non-extensible objects are not allowed as keys.');
  }
  hash = ++objHashUID & HASH_MAX_VAL;
  if (weakMap) {
    weakMap.set(obj, hash);
  } else if (canDefineProperty) {
    Object.defineProperty(obj, UID_HASH_KEY, {
      'enumerable': false,
      'configurable': false,
      'writable': false,
      'value': hash
    });
  } else if (obj.propertyIsEnumerable && obj.propertyIsEnumerable === obj.constructor.prototype.propertyIsEnumerable) {
    obj.propertyIsEnumerable = function() {
      return this.constructor.prototype.propertyIsEnumerable.apply(this, arguments);
    };
    obj.propertyIsEnumerable[UID_HASH_KEY] = hash;
  } else if (obj.nodeType) {
    obj[UID_HASH_KEY] = hash;
  } else {
    throw new Error('Unable to set a non-enumerable property on object.');
  }
  return hash;
}
var canDefineProperty = (function() {
  try {
    Object.defineProperty({}, 'x', {});
    return true;
  } catch (e) {
    return false;
  }
}());
function getIENodeHash(node) {
  if (node && node.nodeType > 0) {
    switch (node.nodeType) {
      case 1:
        return node.uniqueID;
      case 9:
        return node.documentElement && node.documentElement.uniqueID;
    }
  }
}
var weakMap = typeof WeakMap === 'function' && new WeakMap();
var HASH_MAX_VAL = 0x7FFFFFFF;
var objHashUID = 0;
var UID_HASH_KEY = '__immutablehash__';
if (typeof Symbol === 'function') {
  UID_HASH_KEY = Symbol(UID_HASH_KEY);
}
var STRING_HASH_CACHE_MIN_STRLEN = 16;
var STRING_HASH_CACHE_MAX_SIZE = 255;
var STRING_HASH_CACHE_SIZE = 0;
var stringHashCache = {};
var ITERATE_KEYS = 0;
var ITERATE_VALUES = 1;
var ITERATE_ENTRIES = 2;
var FAUX_ITERATOR_SYMBOL = '@@iterator';
var REAL_ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
var ITERATOR_SYMBOL = REAL_ITERATOR_SYMBOL || FAUX_ITERATOR_SYMBOL;
var Iterator = function Iterator(next) {
  this.next = next;
};
($traceurRuntime.createClass)(Iterator, {toString: function() {
    return '[Iterator]';
  }}, {});
Iterator.KEYS = ITERATE_KEYS;
Iterator.VALUES = ITERATE_VALUES;
Iterator.ENTRIES = ITERATE_ENTRIES;
var IteratorPrototype = Iterator.prototype;
IteratorPrototype.inspect = IteratorPrototype.toSource = function() {
  return this.toString();
};
IteratorPrototype[ITERATOR_SYMBOL] = function() {
  return this;
};
function iteratorValue(type, k, v, iteratorResult) {
  var value = type === 0 ? k : type === 1 ? v : [k, v];
  iteratorResult ? (iteratorResult.value = value) : (iteratorResult = {
    value: value,
    done: false
  });
  return iteratorResult;
}
function iteratorDone() {
  return {
    value: undefined,
    done: true
  };
}
function hasIterator(maybeIterable) {
  return !!_iteratorFn(maybeIterable);
}
function isIterator(maybeIterator) {
  return maybeIterator && typeof maybeIterator.next === 'function';
}
function getIterator(iterable) {
  var iteratorFn = _iteratorFn(iterable);
  return iteratorFn && iteratorFn.call(iterable);
}
function _iteratorFn(iterable) {
  var iteratorFn = iterable && ((REAL_ITERATOR_SYMBOL && iterable[REAL_ITERATOR_SYMBOL]) || iterable[FAUX_ITERATOR_SYMBOL]);
  if (typeof iteratorFn === 'function') {
    return iteratorFn;
  }
}
var Iterable = function Iterable(value) {
  return isIterable(value) ? value : Seq.apply(undefined, arguments);
};
var $Iterable = Iterable;
($traceurRuntime.createClass)(Iterable, {
  toArray: function() {
    assertNotInfinite(this.size);
    var array = new Array(this.size || 0);
    this.valueSeq().__iterate((function(v, i) {
      array[i] = v;
    }));
    return array;
  },
  toIndexedSeq: function() {
    return new ToIndexedSequence(this);
  },
  toJS: function() {
    return this.toSeq().map((function(value) {
      return value && typeof value.toJS === 'function' ? value.toJS() : value;
    })).__toJS();
  },
  toKeyedSeq: function() {
    return new ToKeyedSequence(this, true);
  },
  toMap: function() {
    assertNotInfinite(this.size);
    return Map(this.toKeyedSeq());
  },
  toObject: function() {
    assertNotInfinite(this.size);
    var object = {};
    this.__iterate((function(v, k) {
      object[k] = v;
    }));
    return object;
  },
  toOrderedMap: function() {
    assertNotInfinite(this.size);
    return OrderedMap(this.toKeyedSeq());
  },
  toSet: function() {
    assertNotInfinite(this.size);
    return Set(this);
  },
  toSetSeq: function() {
    return new ToSetSequence(this, true);
  },
  toSeq: function() {
    return isIndexed(this) ? this.toIndexedSeq() : isKeyed(this) ? this.toKeyedSeq() : this.toSetSeq();
  },
  toStack: function() {
    assertNotInfinite(this.size);
    return Stack(this);
  },
  toList: function() {
    assertNotInfinite(this.size);
    return List(this);
  },
  toString: function() {
    return '[Iterable]';
  },
  __toString: function(head, tail) {
    if (this.size === 0) {
      return head + tail;
    }
    return head + ' ' + this.toSeq().map(this.__toStringMapper).join(', ') + ' ' + tail;
  },
  concat: function() {
    for (var values = [],
        $__2 = 0; $__2 < arguments.length; $__2++)
      values[$__2] = arguments[$__2];
    return reify(this, concatFactory(this, values, true));
  },
  contains: function(searchValue) {
    return this.some((function(value) {
      return is(value, searchValue);
    }));
  },
  entries: function() {
    return this.__iterator(ITERATE_ENTRIES);
  },
  every: function(predicate, context) {
    var returnValue = true;
    this.__iterate((function(v, k, c) {
      if (!predicate.call(context, v, k, c)) {
        returnValue = false;
        return false;
      }
    }));
    return returnValue;
  },
  filter: function(predicate, context) {
    return reify(this, filterFactory(this, predicate, context, true));
  },
  find: function(predicate, context, notSetValue) {
    var foundValue = notSetValue;
    this.__iterate((function(v, k, c) {
      if (predicate.call(context, v, k, c)) {
        foundValue = v;
        return false;
      }
    }));
    return foundValue;
  },
  forEach: function(sideEffect, context) {
    return this.__iterate(context ? sideEffect.bind(context) : sideEffect);
  },
  join: function(separator) {
    separator = separator !== undefined ? '' + separator : ',';
    var joined = '';
    var isFirst = true;
    this.__iterate((function(v) {
      isFirst ? (isFirst = false) : (joined += separator);
      joined += v !== null && v !== undefined ? v : '';
    }));
    return joined;
  },
  keys: function() {
    return this.__iterator(ITERATE_KEYS);
  },
  map: function(mapper, context) {
    return reify(this, mapFactory(this, mapper, context));
  },
  reduce: function(reducer, initialReduction, context) {
    var reduction;
    var useFirst;
    if (arguments.length < 2) {
      useFirst = true;
    } else {
      reduction = initialReduction;
    }
    this.__iterate((function(v, k, c) {
      if (useFirst) {
        useFirst = false;
        reduction = v;
      } else {
        reduction = reducer.call(context, reduction, v, k, c);
      }
    }));
    return reduction;
  },
  reduceRight: function(reducer, initialReduction, context) {
    var reversed = this.toKeyedSeq().reverse();
    return reversed.reduce.apply(reversed, arguments);
  },
  reverse: function() {
    return reify(this, reverseFactory(this, true));
  },
  slice: function(begin, end) {
    if (wholeSlice(begin, end, this.size)) {
      return this;
    }
    var resolvedBegin = resolveBegin(begin, this.size);
    var resolvedEnd = resolveEnd(end, this.size);
    if (resolvedBegin !== resolvedBegin || resolvedEnd !== resolvedEnd) {
      return this.toSeq().cacheResult().slice(begin, end);
    }
    var skipped = resolvedBegin === 0 ? this : this.skip(resolvedBegin);
    return reify(this, resolvedEnd === undefined || resolvedEnd === this.size ? skipped : skipped.take(resolvedEnd - resolvedBegin));
  },
  some: function(predicate, context) {
    return !this.every(not(predicate), context);
  },
  sort: function(comparator) {
    return this.sortBy(valueMapper, comparator);
  },
  values: function() {
    return this.__iterator(ITERATE_VALUES);
  },
  butLast: function() {
    return this.slice(0, -1);
  },
  count: function(predicate, context) {
    return ensureSize(predicate ? this.toSeq().filter(predicate, context) : this);
  },
  countBy: function(grouper, context) {
    return countByFactory(this, grouper, context);
  },
  equals: function(other) {
    if (this === other) {
      return true;
    }
    if (!other || typeof other.equals !== 'function') {
      return false;
    }
    if (this.size !== undefined && other.size !== undefined) {
      if (this.size !== other.size) {
        return false;
      }
      if (this.size === 0 && other.size === 0) {
        return true;
      }
    }
    if (this.__hash !== undefined && other.__hash !== undefined && this.__hash !== other.__hash) {
      return false;
    }
    return this.__deepEquals(other);
  },
  __deepEquals: function(other) {
    var entries = this.entries();
    return typeof other.every === 'function' && other.every((function(v, k) {
      var entry = entries.next().value;
      return entry && is(entry[0], k) && is(entry[1], v);
    })) && entries.next().done;
  },
  entrySeq: function() {
    var iterable = this;
    if (iterable._cache) {
      return new ArraySeq(iterable._cache);
    }
    var entriesSequence = iterable.toSeq().map(entryMapper).toIndexedSeq();
    entriesSequence.fromEntrySeq = (function() {
      return iterable.toSeq();
    });
    return entriesSequence;
  },
  filterNot: function(predicate, context) {
    return this.filter(not(predicate), context);
  },
  findLast: function(predicate, context, notSetValue) {
    return this.toKeyedSeq().reverse().find(predicate, context, notSetValue);
  },
  first: function() {
    return this.find(returnTrue);
  },
  flatMap: function(mapper, context) {
    return reify(this, flatMapFactory(this, mapper, context));
  },
  flatten: function(depth) {
    return reify(this, flattenFactory(this, depth, true));
  },
  fromEntrySeq: function() {
    return new FromEntriesSequence(this);
  },
  get: function(searchKey, notSetValue) {
    return this.find((function(_, key) {
      return is(key, searchKey);
    }), undefined, notSetValue);
  },
  getIn: function(searchKeyPath, notSetValue) {
    var nested = this;
    if (searchKeyPath) {
      for (var ii = 0; ii < searchKeyPath.length; ii++) {
        nested = nested && nested.get ? nested.get(searchKeyPath[ii], NOT_SET) : NOT_SET;
        if (nested === NOT_SET) {
          return notSetValue;
        }
      }
    }
    return nested;
  },
  groupBy: function(grouper, context) {
    return groupByFactory(this, grouper, context);
  },
  has: function(searchKey) {
    return this.get(searchKey, NOT_SET) !== NOT_SET;
  },
  isSubset: function(iter) {
    iter = typeof iter.contains === 'function' ? iter : $Iterable(iter);
    return this.every((function(value) {
      return iter.contains(value);
    }));
  },
  isSuperset: function(iter) {
    return iter.isSubset(this);
  },
  keySeq: function() {
    return this.toSeq().map(keyMapper).toIndexedSeq();
  },
  last: function() {
    return this.toSeq().reverse().first();
  },
  max: function(comparator) {
    return this.maxBy(valueMapper, comparator);
  },
  maxBy: function(mapper, comparator) {
    var $__0 = this;
    comparator = comparator || defaultComparator;
    var maxEntry = this.entrySeq().reduce((function(max, next) {
      return comparator(mapper(next[1], next[0], $__0), mapper(max[1], max[0], $__0)) > 0 ? next : max;
    }));
    return maxEntry && maxEntry[1];
  },
  min: function(comparator) {
    return this.minBy(valueMapper, comparator);
  },
  minBy: function(mapper, comparator) {
    var $__0 = this;
    comparator = comparator || defaultComparator;
    var minEntry = this.entrySeq().reduce((function(min, next) {
      return comparator(mapper(next[1], next[0], $__0), mapper(min[1], min[0], $__0)) < 0 ? next : min;
    }));
    return minEntry && minEntry[1];
  },
  rest: function() {
    return this.slice(1);
  },
  skip: function(amount) {
    return reify(this, skipFactory(this, amount, true));
  },
  skipLast: function(amount) {
    return reify(this, this.toSeq().reverse().skip(amount).reverse());
  },
  skipWhile: function(predicate, context) {
    return reify(this, skipWhileFactory(this, predicate, context, true));
  },
  skipUntil: function(predicate, context) {
    return this.skipWhile(not(predicate), context);
  },
  sortBy: function(mapper, comparator) {
    var $__0 = this;
    comparator = comparator || defaultComparator;
    return reify(this, new ArraySeq(this.entrySeq().entrySeq().toArray().sort((function(a, b) {
      return comparator(mapper(a[1][1], a[1][0], $__0), mapper(b[1][1], b[1][0], $__0)) || a[0] - b[0];
    }))).fromEntrySeq().valueSeq().fromEntrySeq());
  },
  take: function(amount) {
    return reify(this, takeFactory(this, amount));
  },
  takeLast: function(amount) {
    return reify(this, this.toSeq().reverse().take(amount).reverse());
  },
  takeWhile: function(predicate, context) {
    return reify(this, takeWhileFactory(this, predicate, context));
  },
  takeUntil: function(predicate, context) {
    return this.takeWhile(not(predicate), context);
  },
  valueSeq: function() {
    return this.toIndexedSeq();
  },
  hashCode: function() {
    return this.__hash || (this.__hash = this.size === Infinity ? 0 : this.reduce((function(h, v, k) {
      return (h + (hash(v) ^ (v === k ? 0 : hash(k)))) & HASH_MAX_VAL;
    }), 0));
  }
}, {});
var IS_ITERABLE_SENTINEL = '@@__IMMUTABLE_ITERABLE__@@';
var IS_KEYED_SENTINEL = '@@__IMMUTABLE_KEYED__@@';
var IS_INDEXED_SENTINEL = '@@__IMMUTABLE_INDEXED__@@';
var IterablePrototype = Iterable.prototype;
IterablePrototype[IS_ITERABLE_SENTINEL] = true;
IterablePrototype[ITERATOR_SYMBOL] = IterablePrototype.values;
IterablePrototype.toJSON = IterablePrototype.toJS;
IterablePrototype.__toJS = IterablePrototype.toArray;
IterablePrototype.__toStringMapper = quoteString;
IterablePrototype.inspect = IterablePrototype.toSource = function() {
  return this.toString();
};
IterablePrototype.chain = IterablePrototype.flatMap;
(function() {
  try {
    Object.defineProperty(IterablePrototype, 'length', {get: function() {
        if (!Iterable.noLengthWarning) {
          var stack;
          try {
            throw new Error();
          } catch (error) {
            stack = error.stack;
          }
          if (stack.indexOf('_wrapObject') === -1) {
            console && console.warn && console.warn('iterable.length has been deprecated, ' + 'use iterable.size or iterable.count(). ' + 'This warning will become a silent error in a future version. ' + stack);
            return this.size;
          }
        }
      }});
  } catch (e) {}
})();
var KeyedIterable = function KeyedIterable(value) {
  return isKeyed(value) ? value : KeyedSeq.apply(undefined, arguments);
};
($traceurRuntime.createClass)(KeyedIterable, {
  flip: function() {
    return reify(this, flipFactory(this));
  },
  findKey: function(predicate, context) {
    var foundKey;
    this.__iterate((function(v, k, c) {
      if (predicate.call(context, v, k, c)) {
        foundKey = k;
        return false;
      }
    }));
    return foundKey;
  },
  findLastKey: function(predicate, context) {
    return this.toSeq().reverse().findKey(predicate, context);
  },
  keyOf: function(searchValue) {
    return this.findKey((function(value) {
      return is(value, searchValue);
    }));
  },
  lastKeyOf: function(searchValue) {
    return this.toSeq().reverse().keyOf(searchValue);
  },
  mapEntries: function(mapper, context) {
    var $__0 = this;
    var iterations = 0;
    return reify(this, this.toSeq().map((function(v, k) {
      return mapper.call(context, [k, v], iterations++, $__0);
    })).fromEntrySeq());
  },
  mapKeys: function(mapper, context) {
    var $__0 = this;
    return reify(this, this.toSeq().flip().map((function(k, v) {
      return mapper.call(context, k, v, $__0);
    })).flip());
  }
}, {}, Iterable);
var KeyedIterablePrototype = KeyedIterable.prototype;
KeyedIterablePrototype[IS_KEYED_SENTINEL] = true;
KeyedIterablePrototype[ITERATOR_SYMBOL] = IterablePrototype.entries;
KeyedIterablePrototype.__toJS = IterablePrototype.toObject;
KeyedIterablePrototype.__toStringMapper = (function(v, k) {
  return k + ': ' + quoteString(v);
});
var IndexedIterable = function IndexedIterable(value) {
  return isIndexed(value) ? value : IndexedSeq.apply(undefined, arguments);
};
($traceurRuntime.createClass)(IndexedIterable, {
  toKeyedSeq: function() {
    return new ToKeyedSequence(this, false);
  },
  concat: function() {
    for (var values = [],
        $__3 = 0; $__3 < arguments.length; $__3++)
      values[$__3] = arguments[$__3];
    return reify(this, concatFactory(this, values, false));
  },
  filter: function(predicate, context) {
    return reify(this, filterFactory(this, predicate, context, false));
  },
  findIndex: function(predicate, context) {
    var key = this.toKeyedSeq().findKey(predicate, context);
    return key === undefined ? -1 : key;
  },
  indexOf: function(searchValue) {
    var key = this.toKeyedSeq().keyOf(searchValue);
    return key === undefined ? -1 : key;
  },
  lastIndexOf: function(searchValue) {
    var key = this.toKeyedSeq().lastKeyOf(searchValue);
    return key === undefined ? -1 : key;
  },
  reverse: function() {
    return reify(this, reverseFactory(this, false));
  },
  splice: function(index, removeNum) {
    var numArgs = arguments.length;
    removeNum = Math.max(removeNum | 0, 0);
    if (numArgs === 0 || (numArgs === 2 && !removeNum)) {
      return this;
    }
    index = resolveBegin(index, this.size);
    var spliced = this.slice(0, index);
    return reify(this, numArgs === 1 ? spliced : spliced.concat(arrCopy(arguments, 2), this.slice(index + removeNum)));
  },
  findLastIndex: function(predicate, context) {
    var key = this.toKeyedSeq().findLastKey(predicate, context);
    return key === undefined ? -1 : key;
  },
  first: function() {
    return this.get(0);
  },
  flatten: function(depth) {
    return reify(this, flattenFactory(this, depth, false));
  },
  get: function(index, notSetValue) {
    index = wrapIndex(this, index);
    return (index < 0 || (this.size === Infinity || (this.size !== undefined && index > this.size))) ? notSetValue : this.find((function(_, key) {
      return key === index;
    }), undefined, notSetValue);
  },
  has: function(index) {
    index = wrapIndex(this, index);
    return index >= 0 && (this.size !== undefined ? this.size === Infinity || index < this.size : this.indexOf(index) !== -1);
  },
  interpose: function(separator) {
    return reify(this, interposeFactory(this, separator));
  },
  last: function() {
    return this.get(-1);
  },
  skip: function(amount) {
    var iter = this;
    var skipSeq = skipFactory(iter, amount, false);
    if (isSeq(iter) && skipSeq !== iter) {
      skipSeq.get = function(index, notSetValue) {
        index = wrapIndex(this, index);
        return index >= 0 ? iter.get(index + amount, notSetValue) : notSetValue;
      };
    }
    return reify(this, skipSeq);
  },
  skipWhile: function(predicate, context) {
    return reify(this, skipWhileFactory(this, predicate, context, false));
  },
  sortBy: function(mapper, comparator) {
    var $__0 = this;
    comparator = comparator || defaultComparator;
    return reify(this, new ArraySeq(this.entrySeq().toArray().sort((function(a, b) {
      return comparator(mapper(a[1], a[0], $__0), mapper(b[1], b[0], $__0)) || a[0] - b[0];
    }))).fromEntrySeq().valueSeq());
  },
  take: function(amount) {
    var iter = this;
    var takeSeq = takeFactory(iter, amount);
    if (isSeq(iter) && takeSeq !== iter) {
      takeSeq.get = function(index, notSetValue) {
        index = wrapIndex(this, index);
        return index >= 0 && index < amount ? iter.get(index, notSetValue) : notSetValue;
      };
    }
    return reify(this, takeSeq);
  }
}, {}, Iterable);
IndexedIterable.prototype[IS_INDEXED_SENTINEL] = true;
var SetIterable = function SetIterable(value) {
  return isIterable(value) && !isAssociative(value) ? value : SetSeq.apply(undefined, arguments);
};
($traceurRuntime.createClass)(SetIterable, {
  get: function(value, notSetValue) {
    return this.has(value) ? value : notSetValue;
  },
  contains: function(value) {
    return this.has(value);
  },
  keySeq: function() {
    return this.valueSeq();
  }
}, {}, Iterable);
SetIterable.prototype.has = IterablePrototype.contains;
function isIterable(maybeIterable) {
  return !!(maybeIterable && maybeIterable[IS_ITERABLE_SENTINEL]);
}
function isKeyed(maybeKeyed) {
  return !!(maybeKeyed && maybeKeyed[IS_KEYED_SENTINEL]);
}
function isIndexed(maybeIndexed) {
  return !!(maybeIndexed && maybeIndexed[IS_INDEXED_SENTINEL]);
}
function isAssociative(maybeAssociative) {
  return isKeyed(maybeAssociative) || isIndexed(maybeAssociative);
}
Iterable.isIterable = isIterable;
Iterable.isKeyed = isKeyed;
Iterable.isIndexed = isIndexed;
Iterable.isAssociative = isAssociative;
Iterable.Keyed = KeyedIterable;
Iterable.Indexed = IndexedIterable;
Iterable.Set = SetIterable;
Iterable.Iterator = Iterator;
function valueMapper(v) {
  return v;
}
function keyMapper(v, k) {
  return k;
}
function entryMapper(v, k) {
  return [k, v];
}
function not(predicate) {
  return function() {
    return !predicate.apply(this, arguments);
  };
}
function quoteString(value) {
  return typeof value === 'string' ? JSON.stringify(value) : value;
}
function defaultComparator(a, b) {
  return a > b ? 1 : a < b ? -1 : 0;
}
function mixin(ctor, methods) {
  var proto = ctor.prototype;
  Object.keys(methods).forEach(function(key) {
    proto[key] = methods[key];
  });
  return ctor;
}
var Seq = function Seq(value) {
  return arguments.length === 0 ? emptySequence() : (isIterable(value) ? value : seqFromValue(value, false)).toSeq();
};
var $Seq = Seq;
($traceurRuntime.createClass)(Seq, {
  toSeq: function() {
    return this;
  },
  toString: function() {
    return this.__toString('Seq {', '}');
  },
  cacheResult: function() {
    if (!this._cache && this.__iterateUncached) {
      this._cache = this.entrySeq().toArray();
      this.size = this._cache.length;
    }
    return this;
  },
  __iterate: function(fn, reverse) {
    return seqIterate(this, fn, reverse, true);
  },
  __iterator: function(type, reverse) {
    return seqIterator(this, type, reverse, true);
  }
}, {of: function() {
    return $Seq(arguments);
  }}, Iterable);
var KeyedSeq = function KeyedSeq(value) {
  if (arguments.length === 0) {
    return emptySequence().toKeyedSeq();
  }
  if (!isIterable(value)) {
    value = seqFromValue(value, false);
  }
  return isKeyed(value) ? value.toSeq() : value.fromEntrySeq();
};
var $KeyedSeq = KeyedSeq;
($traceurRuntime.createClass)(KeyedSeq, {
  toKeyedSeq: function() {
    return this;
  },
  toSeq: function() {
    return this;
  }
}, {of: function() {
    return $KeyedSeq(arguments);
  }}, Seq);
mixin(KeyedSeq, KeyedIterable.prototype);
var IndexedSeq = function IndexedSeq(value) {
  return arguments.length === 0 ? emptySequence() : (isIterable(value) ? value : seqFromValue(value, false)).toIndexedSeq();
};
var $IndexedSeq = IndexedSeq;
($traceurRuntime.createClass)(IndexedSeq, {
  toIndexedSeq: function() {
    return this;
  },
  toString: function() {
    return this.__toString('Seq [', ']');
  },
  __iterate: function(fn, reverse) {
    return seqIterate(this, fn, reverse, false);
  },
  __iterator: function(type, reverse) {
    return seqIterator(this, type, reverse, false);
  }
}, {of: function() {
    return $IndexedSeq(arguments);
  }}, Seq);
mixin(IndexedSeq, IndexedIterable.prototype);
var SetSeq = function SetSeq(value) {
  return arguments.length === 0 ? emptySequence().toSetSeq() : (isIterable(value) ? value : seqFromValue(value, false)).toSetSeq();
};
var $SetSeq = SetSeq;
($traceurRuntime.createClass)(SetSeq, {toSetSeq: function() {
    return this;
  }}, {of: function() {
    return $SetSeq(arguments);
  }}, Seq);
mixin(SetSeq, SetIterable.prototype);
Seq.isSeq = isSeq;
Seq.Keyed = KeyedSeq;
Seq.Set = SetSeq;
Seq.Indexed = IndexedSeq;
var IS_SEQ_SENTINEL = '@@__IMMUTABLE_SEQ__@@';
Seq.prototype[IS_SEQ_SENTINEL] = true;
var ArraySeq = function ArraySeq(array) {
  this._array = array;
  this.size = array.length;
};
($traceurRuntime.createClass)(ArraySeq, {
  get: function(index, notSetValue) {
    return this.has(index) ? this._array[wrapIndex(this, index)] : notSetValue;
  },
  __iterate: function(fn, reverse) {
    var array = this._array;
    var maxIndex = array.length - 1;
    for (var ii = 0; ii <= maxIndex; ii++) {
      if (fn(array[reverse ? maxIndex - ii : ii], ii, this) === false) {
        return ii + 1;
      }
    }
    return ii;
  },
  __iterator: function(type, reverse) {
    var array = this._array;
    var maxIndex = array.length - 1;
    var ii = 0;
    return new Iterator((function() {
      return ii > maxIndex ? iteratorDone() : iteratorValue(type, ii, array[reverse ? maxIndex - ii++ : ii++]);
    }));
  }
}, {}, IndexedSeq);
var ObjectSeq = function ObjectSeq(object) {
  var keys = Object.keys(object);
  this._object = object;
  this._keys = keys;
  this.size = keys.length;
};
($traceurRuntime.createClass)(ObjectSeq, {
  get: function(key, notSetValue) {
    if (notSetValue !== undefined && !this.has(key)) {
      return notSetValue;
    }
    return this._object[key];
  },
  has: function(key) {
    return this._object.hasOwnProperty(key);
  },
  __iterate: function(fn, reverse) {
    var object = this._object;
    var keys = this._keys;
    var maxIndex = keys.length - 1;
    for (var ii = 0; ii <= maxIndex; ii++) {
      var key = keys[reverse ? maxIndex - ii : ii];
      if (fn(object[key], key, this) === false) {
        return ii + 1;
      }
    }
    return ii;
  },
  __iterator: function(type, reverse) {
    var object = this._object;
    var keys = this._keys;
    var maxIndex = keys.length - 1;
    var ii = 0;
    return new Iterator((function() {
      var key = keys[reverse ? maxIndex - ii : ii];
      return ii++ > maxIndex ? iteratorDone() : iteratorValue(type, key, object[key]);
    }));
  }
}, {}, KeyedSeq);
var IterableSeq = function IterableSeq(iterable) {
  this._iterable = iterable;
  this.size = iterable.length || iterable.size;
};
($traceurRuntime.createClass)(IterableSeq, {
  __iterateUncached: function(fn, reverse) {
    if (reverse) {
      return this.cacheResult().__iterate(fn, reverse);
    }
    var iterable = this._iterable;
    var iterator = getIterator(iterable);
    var iterations = 0;
    if (isIterator(iterator)) {
      var step;
      while (!(step = iterator.next()).done) {
        if (fn(step.value, iterations++, this) === false) {
          break;
        }
      }
    }
    return iterations;
  },
  __iteratorUncached: function(type, reverse) {
    if (reverse) {
      return this.cacheResult().__iterator(type, reverse);
    }
    var iterable = this._iterable;
    var iterator = getIterator(iterable);
    if (!isIterator(iterator)) {
      return new Iterator(iteratorDone);
    }
    var iterations = 0;
    return new Iterator((function() {
      var step = iterator.next();
      return step.done ? step : iteratorValue(type, iterations++, step.value);
    }));
  }
}, {}, IndexedSeq);
var IteratorSeq = function IteratorSeq(iterator) {
  this._iterator = iterator;
  this._iteratorCache = [];
};
($traceurRuntime.createClass)(IteratorSeq, {
  __iterateUncached: function(fn, reverse) {
    if (reverse) {
      return this.cacheResult().__iterate(fn, reverse);
    }
    var iterator = this._iterator;
    var cache = this._iteratorCache;
    var iterations = 0;
    while (iterations < cache.length) {
      if (fn(cache[iterations], iterations++, this) === false) {
        return iterations;
      }
    }
    var step;
    while (!(step = iterator.next()).done) {
      var val = step.value;
      cache[iterations] = val;
      if (fn(val, iterations++, this) === false) {
        break;
      }
    }
    return iterations;
  },
  __iteratorUncached: function(type, reverse) {
    if (reverse) {
      return this.cacheResult().__iterator(type, reverse);
    }
    var iterator = this._iterator;
    var cache = this._iteratorCache;
    var iterations = 0;
    return new Iterator((function() {
      if (iterations >= cache.length) {
        var step = iterator.next();
        if (step.done) {
          return step;
        }
        cache[iterations] = step.value;
      }
      return iteratorValue(type, iterations, cache[iterations++]);
    }));
  }
}, {}, IndexedSeq);
function isSeq(maybeSeq) {
  return !!(maybeSeq && maybeSeq[IS_SEQ_SENTINEL]);
}
var EMPTY_SEQ;
function emptySequence() {
  return EMPTY_SEQ || (EMPTY_SEQ = new ArraySeq([]));
}
function maybeSeqFromValue(value, maybeSingleton) {
  return (maybeSingleton && typeof value === 'string' ? undefined : isArrayLike(value) ? new ArraySeq(value) : isIterator(value) ? new IteratorSeq(value) : hasIterator(value) ? new IterableSeq(value) : (maybeSingleton ? isPlainObj(value) : typeof value === 'object') ? new ObjectSeq(value) : undefined);
}
function seqFromValue(value, maybeSingleton) {
  var seq = maybeSeqFromValue(value, maybeSingleton);
  if (seq === undefined) {
    if (maybeSingleton) {
      seq = new ArraySeq([value]);
    } else {
      throw new TypeError('Expected iterable: ' + value);
    }
  }
  return seq;
}
function isArrayLike(value) {
  return value && typeof value.length === 'number';
}
function seqIterate(seq, fn, reverse, useKeys) {
  assertNotInfinite(seq.size);
  var cache = seq._cache;
  if (cache) {
    var maxIndex = cache.length - 1;
    for (var ii = 0; ii <= maxIndex; ii++) {
      var entry = cache[reverse ? maxIndex - ii : ii];
      if (fn(entry[1], useKeys ? entry[0] : ii, seq) === false) {
        return ii + 1;
      }
    }
    return ii;
  }
  return seq.__iterateUncached(fn, reverse);
}
function seqIterator(seq, type, reverse, useKeys) {
  var cache = seq._cache;
  if (cache) {
    var maxIndex = cache.length - 1;
    var ii = 0;
    return new Iterator((function() {
      var entry = cache[reverse ? maxIndex - ii : ii];
      return ii++ > maxIndex ? iteratorDone() : iteratorValue(type, useKeys ? entry[0] : ii - 1, entry[1]);
    }));
  }
  return seq.__iteratorUncached(type, reverse);
}
function fromJS(json, converter) {
  if (converter) {
    return _fromJSWith(converter, json, '', {'': json});
  }
  return _fromJSDefault(json);
}
function _fromJSWith(converter, json, key, parentJSON) {
  if (Array.isArray(json) || isPlainObj(json)) {
    return converter.call(parentJSON, key, Iterable(json).map((function(v, k) {
      return _fromJSWith(converter, v, k, json);
    })));
  }
  return json;
}
function _fromJSDefault(json) {
  if (json && typeof json === 'object') {
    if (Array.isArray(json)) {
      return Iterable(json).map(_fromJSDefault).toList();
    }
    if (json.constructor === Object) {
      return Iterable(json).map(_fromJSDefault).toMap();
    }
  }
  return json;
}
var Collection = function Collection() {
  throw TypeError('Abstract');
};
($traceurRuntime.createClass)(Collection, {}, {}, Iterable);
var KeyedCollection = function KeyedCollection() {
  $traceurRuntime.defaultSuperCall(this, $KeyedCollection.prototype, arguments);
};
var $KeyedCollection = KeyedCollection;
($traceurRuntime.createClass)(KeyedCollection, {}, {}, Collection);
mixin(KeyedCollection, KeyedIterable.prototype);
var IndexedCollection = function IndexedCollection() {
  $traceurRuntime.defaultSuperCall(this, $IndexedCollection.prototype, arguments);
};
var $IndexedCollection = IndexedCollection;
($traceurRuntime.createClass)(IndexedCollection, {}, {}, Collection);
mixin(IndexedCollection, IndexedIterable.prototype);
var SetCollection = function SetCollection() {
  $traceurRuntime.defaultSuperCall(this, $SetCollection.prototype, arguments);
};
var $SetCollection = SetCollection;
($traceurRuntime.createClass)(SetCollection, {}, {}, Collection);
mixin(SetCollection, SetIterable.prototype);
Collection.Keyed = KeyedCollection;
Collection.Indexed = IndexedCollection;
Collection.Set = SetCollection;
var Map = function Map(value) {
  return arguments.length === 0 ? emptyMap() : value && value.constructor === $Map ? value : emptyMap().merge(KeyedIterable(value));
};
var $Map = Map;
($traceurRuntime.createClass)(Map, {
  toString: function() {
    return this.__toString('Map {', '}');
  },
  get: function(k, notSetValue) {
    return this._root ? this._root.get(0, hash(k), k, notSetValue) : notSetValue;
  },
  set: function(k, v) {
    return updateMap(this, k, v);
  },
  setIn: function(keyPath, v) {
    invariant(keyPath.length > 0, 'Requires non-empty key path.');
    return this.updateIn(keyPath, (function() {
      return v;
    }));
  },
  remove: function(k) {
    return updateMap(this, k, NOT_SET);
  },
  removeIn: function(keyPath) {
    invariant(keyPath.length > 0, 'Requires non-empty key path.');
    return this.updateIn(keyPath, (function() {
      return NOT_SET;
    }));
  },
  update: function(k, notSetValue, updater) {
    return arguments.length === 1 ? k(this) : this.updateIn([k], notSetValue, updater);
  },
  updateIn: function(keyPath, notSetValue, updater) {
    if (!updater) {
      updater = notSetValue;
      notSetValue = undefined;
    }
    return keyPath.length === 0 ? updater(this) : updateInDeepMap(this, keyPath, notSetValue, updater, 0);
  },
  clear: function() {
    if (this.size === 0) {
      return this;
    }
    if (this.__ownerID) {
      this.size = 0;
      this._root = null;
      this.__hash = undefined;
      this.__altered = true;
      return this;
    }
    return emptyMap();
  },
  merge: function() {
    return mergeIntoMapWith(this, undefined, arguments);
  },
  mergeWith: function(merger) {
    for (var iters = [],
        $__4 = 1; $__4 < arguments.length; $__4++)
      iters[$__4 - 1] = arguments[$__4];
    return mergeIntoMapWith(this, merger, iters);
  },
  mergeDeep: function() {
    return mergeIntoMapWith(this, deepMerger(undefined), arguments);
  },
  mergeDeepWith: function(merger) {
    for (var iters = [],
        $__5 = 1; $__5 < arguments.length; $__5++)
      iters[$__5 - 1] = arguments[$__5];
    return mergeIntoMapWith(this, deepMerger(merger), iters);
  },
  withMutations: function(fn) {
    var mutable = this.asMutable();
    fn(mutable);
    return mutable.wasAltered() ? mutable.__ensureOwner(this.__ownerID) : this;
  },
  asMutable: function() {
    return this.__ownerID ? this : this.__ensureOwner(new OwnerID());
  },
  asImmutable: function() {
    return this.__ensureOwner();
  },
  wasAltered: function() {
    return this.__altered;
  },
  __iterator: function(type, reverse) {
    return new MapIterator(this, type, reverse);
  },
  __iterate: function(fn, reverse) {
    var $__0 = this;
    var iterations = 0;
    this._root && this._root.iterate((function(entry) {
      iterations++;
      return fn(entry[1], entry[0], $__0);
    }), reverse);
    return iterations;
  },
  __ensureOwner: function(ownerID) {
    if (ownerID === this.__ownerID) {
      return this;
    }
    if (!ownerID) {
      this.__ownerID = ownerID;
      this.__altered = false;
      return this;
    }
    return makeMap(this.size, this._root, ownerID, this.__hash);
  }
}, {}, KeyedCollection);
function isMap(maybeMap) {
  return !!(maybeMap && maybeMap[IS_MAP_SENTINEL]);
}
Map.isMap = isMap;
var IS_MAP_SENTINEL = '@@__IMMUTABLE_MAP__@@';
var MapPrototype = Map.prototype;
MapPrototype[IS_MAP_SENTINEL] = true;
MapPrototype[DELETE] = MapPrototype.remove;
var BitmapIndexedNode = function BitmapIndexedNode(ownerID, bitmap, nodes) {
  this.ownerID = ownerID;
  this.bitmap = bitmap;
  this.nodes = nodes;
};
var $BitmapIndexedNode = BitmapIndexedNode;
($traceurRuntime.createClass)(BitmapIndexedNode, {
  get: function(shift, hash, key, notSetValue) {
    var bit = (1 << ((shift === 0 ? hash : hash >>> shift) & MASK));
    var bitmap = this.bitmap;
    return (bitmap & bit) === 0 ? notSetValue : this.nodes[popCount(bitmap & (bit - 1))].get(shift + SHIFT, hash, key, notSetValue);
  },
  update: function(ownerID, shift, hash, key, value, didChangeSize, didAlter) {
    var hashFrag = (shift === 0 ? hash : hash >>> shift) & MASK;
    var bit = 1 << hashFrag;
    var bitmap = this.bitmap;
    var exists = (bitmap & bit) !== 0;
    if (!exists && value === NOT_SET) {
      return this;
    }
    var idx = popCount(bitmap & (bit - 1));
    var nodes = this.nodes;
    var node = exists ? nodes[idx] : undefined;
    var newNode = updateNode(node, ownerID, shift + SHIFT, hash, key, value, didChangeSize, didAlter);
    if (newNode === node) {
      return this;
    }
    if (!exists && newNode && nodes.length >= MAX_BITMAP_SIZE) {
      return expandNodes(ownerID, nodes, bitmap, hashFrag, newNode);
    }
    if (exists && !newNode && nodes.length === 2 && isLeafNode(nodes[idx ^ 1])) {
      return nodes[idx ^ 1];
    }
    if (exists && newNode && nodes.length === 1 && isLeafNode(newNode)) {
      return newNode;
    }
    var isEditable = ownerID && ownerID === this.ownerID;
    var newBitmap = exists ? newNode ? bitmap : bitmap ^ bit : bitmap | bit;
    var newNodes = exists ? newNode ? setIn(nodes, idx, newNode, isEditable) : spliceOut(nodes, idx, isEditable) : spliceIn(nodes, idx, newNode, isEditable);
    if (isEditable) {
      this.bitmap = newBitmap;
      this.nodes = newNodes;
      return this;
    }
    return new $BitmapIndexedNode(ownerID, newBitmap, newNodes);
  },
  iterate: function(fn, reverse) {
    var nodes = this.nodes;
    for (var ii = 0,
        maxIndex = nodes.length - 1; ii <= maxIndex; ii++) {
      if (nodes[reverse ? maxIndex - ii : ii].iterate(fn, reverse) === false) {
        return false;
      }
    }
  }
}, {});
var ArrayNode = function ArrayNode(ownerID, count, nodes) {
  this.ownerID = ownerID;
  this.count = count;
  this.nodes = nodes;
};
var $ArrayNode = ArrayNode;
($traceurRuntime.createClass)(ArrayNode, {
  get: function(shift, hash, key, notSetValue) {
    var idx = (shift === 0 ? hash : hash >>> shift) & MASK;
    var node = this.nodes[idx];
    return node ? node.get(shift + SHIFT, hash, key, notSetValue) : notSetValue;
  },
  update: function(ownerID, shift, hash, key, value, didChangeSize, didAlter) {
    var idx = (shift === 0 ? hash : hash >>> shift) & MASK;
    var removed = value === NOT_SET;
    var nodes = this.nodes;
    var node = nodes[idx];
    if (removed && !node) {
      return this;
    }
    var newNode = updateNode(node, ownerID, shift + SHIFT, hash, key, value, didChangeSize, didAlter);
    if (newNode === node) {
      return this;
    }
    var newCount = this.count;
    if (!node) {
      newCount++;
    } else if (!newNode) {
      newCount--;
      if (newCount < MIN_ARRAY_SIZE) {
        return packNodes(ownerID, nodes, newCount, idx);
      }
    }
    var isEditable = ownerID && ownerID === this.ownerID;
    var newNodes = setIn(nodes, idx, newNode, isEditable);
    if (isEditable) {
      this.count = newCount;
      this.nodes = newNodes;
      return this;
    }
    return new $ArrayNode(ownerID, newCount, newNodes);
  },
  iterate: function(fn, reverse) {
    var nodes = this.nodes;
    for (var ii = 0,
        maxIndex = nodes.length - 1; ii <= maxIndex; ii++) {
      var node = nodes[reverse ? maxIndex - ii : ii];
      if (node && node.iterate(fn, reverse) === false) {
        return false;
      }
    }
  }
}, {});
var HashCollisionNode = function HashCollisionNode(ownerID, hash, entries) {
  this.ownerID = ownerID;
  this.hash = hash;
  this.entries = entries;
};
var $HashCollisionNode = HashCollisionNode;
($traceurRuntime.createClass)(HashCollisionNode, {
  get: function(shift, hash, key, notSetValue) {
    var entries = this.entries;
    for (var ii = 0,
        len = entries.length; ii < len; ii++) {
      if (is(key, entries[ii][0])) {
        return entries[ii][1];
      }
    }
    return notSetValue;
  },
  update: function(ownerID, shift, hash, key, value, didChangeSize, didAlter) {
    var removed = value === NOT_SET;
    if (hash !== this.hash) {
      if (removed) {
        return this;
      }
      SetRef(didAlter);
      SetRef(didChangeSize);
      return mergeIntoNode(this, ownerID, shift, hash, [key, value]);
    }
    var entries = this.entries;
    var idx = 0;
    for (var len = entries.length; idx < len; idx++) {
      if (is(key, entries[idx][0])) {
        break;
      }
    }
    var exists = idx < len;
    if (removed && !exists) {
      return this;
    }
    SetRef(didAlter);
    (removed || !exists) && SetRef(didChangeSize);
    if (removed && len === 2) {
      return new ValueNode(ownerID, this.hash, entries[idx ^ 1]);
    }
    var isEditable = ownerID && ownerID === this.ownerID;
    var newEntries = isEditable ? entries : arrCopy(entries);
    if (exists) {
      if (removed) {
        idx === len - 1 ? newEntries.pop() : (newEntries[idx] = newEntries.pop());
      } else {
        newEntries[idx] = [key, value];
      }
    } else {
      newEntries.push([key, value]);
    }
    if (isEditable) {
      this.entries = newEntries;
      return this;
    }
    return new $HashCollisionNode(ownerID, this.hash, newEntries);
  },
  iterate: function(fn, reverse) {
    var entries = this.entries;
    for (var ii = 0,
        maxIndex = entries.length - 1; ii <= maxIndex; ii++) {
      if (fn(entries[reverse ? maxIndex - ii : ii]) === false) {
        return false;
      }
    }
  }
}, {});
var ValueNode = function ValueNode(ownerID, hash, entry) {
  this.ownerID = ownerID;
  this.hash = hash;
  this.entry = entry;
};
var $ValueNode = ValueNode;
($traceurRuntime.createClass)(ValueNode, {
  get: function(shift, hash, key, notSetValue) {
    return is(key, this.entry[0]) ? this.entry[1] : notSetValue;
  },
  update: function(ownerID, shift, hash, key, value, didChangeSize, didAlter) {
    var removed = value === NOT_SET;
    var keyMatch = is(key, this.entry[0]);
    if (keyMatch ? value === this.entry[1] : removed) {
      return this;
    }
    SetRef(didAlter);
    if (removed) {
      SetRef(didChangeSize);
      return;
    }
    if (keyMatch) {
      if (ownerID && ownerID === this.ownerID) {
        this.entry[1] = value;
        return this;
      }
      return new $ValueNode(ownerID, hash, [key, value]);
    }
    SetRef(didChangeSize);
    return mergeIntoNode(this, ownerID, shift, hash, [key, value]);
  },
  iterate: function(fn) {
    return fn(this.entry);
  }
}, {});
var MapIterator = function MapIterator(map, type, reverse) {
  this._type = type;
  this._reverse = reverse;
  this._stack = map._root && mapIteratorFrame(map._root);
};
($traceurRuntime.createClass)(MapIterator, {next: function() {
    var type = this._type;
    var stack = this._stack;
    while (stack) {
      var node = stack.node;
      var index = stack.index++;
      var maxIndex;
      if (node.entry) {
        if (index === 0) {
          return mapIteratorValue(type, node.entry);
        }
      } else if (node.entries) {
        maxIndex = node.entries.length - 1;
        if (index <= maxIndex) {
          return mapIteratorValue(type, node.entries[this._reverse ? maxIndex - index : index]);
        }
      } else {
        maxIndex = node.nodes.length - 1;
        if (index <= maxIndex) {
          var subNode = node.nodes[this._reverse ? maxIndex - index : index];
          if (subNode) {
            if (subNode.entry) {
              return mapIteratorValue(type, subNode.entry);
            }
            stack = this._stack = mapIteratorFrame(subNode, stack);
          }
          continue;
        }
      }
      stack = this._stack = this._stack.__prev;
    }
    return iteratorDone();
  }}, {}, Iterator);
function mapIteratorValue(type, entry) {
  return iteratorValue(type, entry[0], entry[1]);
}
function mapIteratorFrame(node, prev) {
  return {
    node: node,
    index: 0,
    __prev: prev
  };
}
function makeMap(size, root, ownerID, hash) {
  var map = Object.create(MapPrototype);
  map.size = size;
  map._root = root;
  map.__ownerID = ownerID;
  map.__hash = hash;
  map.__altered = false;
  return map;
}
var EMPTY_MAP;
function emptyMap() {
  return EMPTY_MAP || (EMPTY_MAP = makeMap(0));
}
function updateMap(map, k, v) {
  var didChangeSize = MakeRef(CHANGE_LENGTH);
  var didAlter = MakeRef(DID_ALTER);
  var newRoot = updateNode(map._root, map.__ownerID, 0, hash(k), k, v, didChangeSize, didAlter);
  if (!didAlter.value) {
    return map;
  }
  var newSize = map.size + (didChangeSize.value ? v === NOT_SET ? -1 : 1 : 0);
  if (map.__ownerID) {
    map.size = newSize;
    map._root = newRoot;
    map.__hash = undefined;
    map.__altered = true;
    return map;
  }
  return newRoot ? makeMap(newSize, newRoot) : emptyMap();
}
function updateNode(node, ownerID, shift, hash, key, value, didChangeSize, didAlter) {
  if (!node) {
    if (value === NOT_SET) {
      return node;
    }
    SetRef(didAlter);
    SetRef(didChangeSize);
    return new ValueNode(ownerID, hash, [key, value]);
  }
  return node.update(ownerID, shift, hash, key, value, didChangeSize, didAlter);
}
function isLeafNode(node) {
  return node.constructor === ValueNode || node.constructor === HashCollisionNode;
}
function mergeIntoNode(node, ownerID, shift, hash, entry) {
  if (node.hash === hash) {
    return new HashCollisionNode(ownerID, hash, [node.entry, entry]);
  }
  var idx1 = (shift === 0 ? node.hash : node.hash >>> shift) & MASK;
  var idx2 = (shift === 0 ? hash : hash >>> shift) & MASK;
  var newNode;
  var nodes = idx1 === idx2 ? [mergeIntoNode(node, ownerID, shift + SHIFT, hash, entry)] : ((newNode = new ValueNode(ownerID, hash, entry)), idx1 < idx2 ? [node, newNode] : [newNode, node]);
  return new BitmapIndexedNode(ownerID, (1 << idx1) | (1 << idx2), nodes);
}
function packNodes(ownerID, nodes, count, excluding) {
  var bitmap = 0;
  var packedII = 0;
  var packedNodes = new Array(count);
  for (var ii = 0,
      bit = 1,
      len = nodes.length; ii < len; ii++, bit <<= 1) {
    var node = nodes[ii];
    if (node !== undefined && ii !== excluding) {
      bitmap |= bit;
      packedNodes[packedII++] = node;
    }
  }
  return new BitmapIndexedNode(ownerID, bitmap, packedNodes);
}
function expandNodes(ownerID, nodes, bitmap, including, node) {
  var count = 0;
  var expandedNodes = new Array(SIZE);
  for (var ii = 0; bitmap !== 0; ii++, bitmap >>>= 1) {
    expandedNodes[ii] = bitmap & 1 ? nodes[count++] : undefined;
  }
  expandedNodes[including] = node;
  return new ArrayNode(ownerID, count + 1, expandedNodes);
}
function mergeIntoMapWith(map, merger, iterables) {
  var iters = [];
  for (var ii = 0; ii < iterables.length; ii++) {
    var value = iterables[ii];
    var iter = KeyedIterable(value);
    if (!isIterable(value)) {
      iter = iter.map((function(v) {
        return fromJS(v);
      }));
    }
    iters.push(iter);
  }
  return mergeIntoCollectionWith(map, merger, iters);
}
function deepMerger(merger) {
  return (function(existing, value) {
    return existing && existing.mergeDeepWith && isIterable(value) ? existing.mergeDeepWith(merger, value) : merger ? merger(existing, value) : value;
  });
}
function mergeIntoCollectionWith(collection, merger, iters) {
  if (iters.length === 0) {
    return collection;
  }
  return collection.withMutations((function(collection) {
    var mergeIntoMap = merger ? (function(value, key) {
      collection.update(key, NOT_SET, (function(existing) {
        return existing === NOT_SET ? value : merger(existing, value);
      }));
    }) : (function(value, key) {
      collection.set(key, value);
    });
    for (var ii = 0; ii < iters.length; ii++) {
      iters[ii].forEach(mergeIntoMap);
    }
  }));
}
function updateInDeepMap(collection, keyPath, notSetValue, updater, offset) {
  invariant(!collection || collection.set, 'updateIn with invalid keyPath');
  var key = keyPath[offset];
  var existing = collection ? collection.get(key, NOT_SET) : NOT_SET;
  var existingValue = existing === NOT_SET ? undefined : existing;
  var value = offset === keyPath.length - 1 ? updater(existing === NOT_SET ? notSetValue : existing) : updateInDeepMap(existingValue, keyPath, notSetValue, updater, offset + 1);
  return value === existingValue ? collection : value === NOT_SET ? collection && collection.remove(key) : (collection || emptyMap()).set(key, value);
}
function popCount(x) {
  x = x - ((x >> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
  x = (x + (x >> 4)) & 0x0f0f0f0f;
  x = x + (x >> 8);
  x = x + (x >> 16);
  return x & 0x7f;
}
function setIn(array, idx, val, canEdit) {
  var newArray = canEdit ? array : arrCopy(array);
  newArray[idx] = val;
  return newArray;
}
function spliceIn(array, idx, val, canEdit) {
  var newLen = array.length + 1;
  if (canEdit && idx + 1 === newLen) {
    array[idx] = val;
    return array;
  }
  var newArray = new Array(newLen);
  var after = 0;
  for (var ii = 0; ii < newLen; ii++) {
    if (ii === idx) {
      newArray[ii] = val;
      after = -1;
    } else {
      newArray[ii] = array[ii + after];
    }
  }
  return newArray;
}
function spliceOut(array, idx, canEdit) {
  var newLen = array.length - 1;
  if (canEdit && idx === newLen) {
    array.pop();
    return array;
  }
  var newArray = new Array(newLen);
  var after = 0;
  for (var ii = 0; ii < newLen; ii++) {
    if (ii === idx) {
      after = 1;
    }
    newArray[ii] = array[ii + after];
  }
  return newArray;
}
var MAX_BITMAP_SIZE = SIZE / 2;
var MIN_ARRAY_SIZE = SIZE / 4;
var ToKeyedSequence = function ToKeyedSequence(indexed, useKeys) {
  this._iter = indexed;
  this._useKeys = useKeys;
  this.size = indexed.size;
};
($traceurRuntime.createClass)(ToKeyedSequence, {
  get: function(key, notSetValue) {
    return this._iter.get(key, notSetValue);
  },
  has: function(key) {
    return this._iter.has(key);
  },
  valueSeq: function() {
    return this._iter.valueSeq();
  },
  reverse: function() {
    var $__0 = this;
    var reversedSequence = reverseFactory(this, true);
    if (!this._useKeys) {
      reversedSequence.valueSeq = (function() {
        return $__0._iter.toSeq().reverse();
      });
    }
    return reversedSequence;
  },
  map: function(mapper, context) {
    var $__0 = this;
    var mappedSequence = mapFactory(this, mapper, context);
    if (!this._useKeys) {
      mappedSequence.valueSeq = (function() {
        return $__0._iter.toSeq().map(mapper, context);
      });
    }
    return mappedSequence;
  },
  __iterate: function(fn, reverse) {
    var $__0 = this;
    var ii;
    return this._iter.__iterate(this._useKeys ? (function(v, k) {
      return fn(v, k, $__0);
    }) : ((ii = reverse ? resolveSize(this) : 0), (function(v) {
      return fn(v, reverse ? --ii : ii++, $__0);
    })), reverse);
  },
  __iterator: function(type, reverse) {
    if (this._useKeys) {
      return this._iter.__iterator(type, reverse);
    }
    var iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
    var ii = reverse ? resolveSize(this) : 0;
    return new Iterator((function() {
      var step = iterator.next();
      return step.done ? step : iteratorValue(type, reverse ? --ii : ii++, step.value, step);
    }));
  }
}, {}, KeyedSeq);
var ToIndexedSequence = function ToIndexedSequence(iter) {
  this._iter = iter;
  this.size = iter.size;
};
($traceurRuntime.createClass)(ToIndexedSequence, {
  contains: function(value) {
    return this._iter.contains(value);
  },
  __iterate: function(fn, reverse) {
    var $__0 = this;
    var iterations = 0;
    return this._iter.__iterate((function(v) {
      return fn(v, iterations++, $__0);
    }), reverse);
  },
  __iterator: function(type, reverse) {
    var iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
    var iterations = 0;
    return new Iterator((function() {
      var step = iterator.next();
      return step.done ? step : iteratorValue(type, iterations++, step.value, step);
    }));
  }
}, {}, IndexedSeq);
var ToSetSequence = function ToSetSequence(iter) {
  this._iter = iter;
  this.size = iter.size;
};
($traceurRuntime.createClass)(ToSetSequence, {
  has: function(key) {
    return this._iter.contains(key);
  },
  __iterate: function(fn, reverse) {
    var $__0 = this;
    return this._iter.__iterate((function(v) {
      return fn(v, v, $__0);
    }), reverse);
  },
  __iterator: function(type, reverse) {
    var iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
    return new Iterator((function() {
      var step = iterator.next();
      return step.done ? step : iteratorValue(type, step.value, step.value, step);
    }));
  }
}, {}, SetSeq);
var FromEntriesSequence = function FromEntriesSequence(entries) {
  this._iter = entries;
  this.size = entries.size;
};
($traceurRuntime.createClass)(FromEntriesSequence, {
  entrySeq: function() {
    return this._iter.toSeq();
  },
  __iterate: function(fn, reverse) {
    var $__0 = this;
    return this._iter.__iterate((function(entry) {
      if (entry) {
        validateEntry(entry);
        return fn(entry[1], entry[0], $__0);
      }
    }), reverse);
  },
  __iterator: function(type, reverse) {
    var iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
    return new Iterator((function() {
      while (true) {
        var step = iterator.next();
        if (step.done) {
          return step;
        }
        var entry = step.value;
        if (entry) {
          validateEntry(entry);
          return type === ITERATE_ENTRIES ? step : iteratorValue(type, entry[0], entry[1], step);
        }
      }
    }));
  }
}, {}, KeyedSeq);
ToIndexedSequence.prototype.cacheResult = ToKeyedSequence.prototype.cacheResult = ToSetSequence.prototype.cacheResult = FromEntriesSequence.prototype.cacheResult = cacheResultThrough;
function flipFactory(iterable) {
  var flipSequence = makeSequence(iterable);
  flipSequence._iter = iterable;
  flipSequence.size = iterable.size;
  flipSequence.flip = (function() {
    return iterable;
  });
  flipSequence.reverse = function() {
    var reversedSequence = iterable.reverse.apply(this);
    reversedSequence.flip = (function() {
      return iterable.reverse();
    });
    return reversedSequence;
  };
  flipSequence.has = (function(key) {
    return iterable.contains(key);
  });
  flipSequence.contains = (function(key) {
    return iterable.has(key);
  });
  flipSequence.cacheResult = cacheResultThrough;
  flipSequence.__iterateUncached = function(fn, reverse) {
    var $__0 = this;
    return iterable.__iterate((function(v, k) {
      return fn(k, v, $__0) !== false;
    }), reverse);
  };
  flipSequence.__iteratorUncached = function(type, reverse) {
    if (type === ITERATE_ENTRIES) {
      var iterator = iterable.__iterator(type, reverse);
      return new Iterator((function() {
        var step = iterator.next();
        if (!step.done) {
          var k = step.value[0];
          step.value[0] = step.value[1];
          step.value[1] = k;
        }
        return step;
      }));
    }
    return iterable.__iterator(type === ITERATE_VALUES ? ITERATE_KEYS : ITERATE_VALUES, reverse);
  };
  return flipSequence;
}
function mapFactory(iterable, mapper, context) {
  var mappedSequence = makeSequence(iterable);
  mappedSequence.size = iterable.size;
  mappedSequence.has = (function(key) {
    return iterable.has(key);
  });
  mappedSequence.get = (function(key, notSetValue) {
    var v = iterable.get(key, NOT_SET);
    return v === NOT_SET ? notSetValue : mapper.call(context, v, key, iterable);
  });
  mappedSequence.__iterateUncached = function(fn, reverse) {
    var $__0 = this;
    return iterable.__iterate((function(v, k, c) {
      return fn(mapper.call(context, v, k, c), k, $__0) !== false;
    }), reverse);
  };
  mappedSequence.__iteratorUncached = function(type, reverse) {
    var iterator = iterable.__iterator(ITERATE_ENTRIES, reverse);
    return new Iterator((function() {
      var step = iterator.next();
      if (step.done) {
        return step;
      }
      var entry = step.value;
      var key = entry[0];
      return iteratorValue(type, key, mapper.call(context, entry[1], key, iterable), step);
    }));
  };
  return mappedSequence;
}
function reverseFactory(iterable, useKeys) {
  var reversedSequence = makeSequence(iterable);
  reversedSequence._iter = iterable;
  reversedSequence.size = iterable.size;
  reversedSequence.reverse = (function() {
    return iterable;
  });
  if (iterable.flip) {
    reversedSequence.flip = function() {
      var flipSequence = flipFactory(iterable);
      flipSequence.reverse = (function() {
        return iterable.flip();
      });
      return flipSequence;
    };
  }
  reversedSequence.get = (function(key, notSetValue) {
    return iterable.get(useKeys ? key : -1 - key, notSetValue);
  });
  reversedSequence.has = (function(key) {
    return iterable.has(useKeys ? key : -1 - key);
  });
  reversedSequence.contains = (function(value) {
    return iterable.contains(value);
  });
  reversedSequence.cacheResult = cacheResultThrough;
  reversedSequence.__iterate = function(fn, reverse) {
    var $__0 = this;
    return iterable.__iterate((function(v, k) {
      return fn(v, k, $__0);
    }), !reverse);
  };
  reversedSequence.__iterator = (function(type, reverse) {
    return iterable.__iterator(type, !reverse);
  });
  return reversedSequence;
}
function filterFactory(iterable, predicate, context, useKeys) {
  var filterSequence = makeSequence(iterable);
  if (useKeys) {
    filterSequence.has = (function(key) {
      var v = iterable.get(key, NOT_SET);
      return v !== NOT_SET && !!predicate.call(context, v, key, iterable);
    });
    filterSequence.get = (function(key, notSetValue) {
      var v = iterable.get(key, NOT_SET);
      return v !== NOT_SET && predicate.call(context, v, key, iterable) ? v : notSetValue;
    });
  }
  filterSequence.__iterateUncached = function(fn, reverse) {
    var $__0 = this;
    var iterations = 0;
    iterable.__iterate((function(v, k, c) {
      if (predicate.call(context, v, k, c)) {
        iterations++;
        return fn(v, useKeys ? k : iterations - 1, $__0);
      }
    }), reverse);
    return iterations;
  };
  filterSequence.__iteratorUncached = function(type, reverse) {
    var iterator = iterable.__iterator(ITERATE_ENTRIES, reverse);
    var iterations = 0;
    return new Iterator((function() {
      while (true) {
        var step = iterator.next();
        if (step.done) {
          return step;
        }
        var entry = step.value;
        var key = entry[0];
        var value = entry[1];
        if (predicate.call(context, value, key, iterable)) {
          return iteratorValue(type, useKeys ? key : iterations++, value, step);
        }
      }
    }));
  };
  return filterSequence;
}
function countByFactory(iterable, grouper, context) {
  var groups = Map().asMutable();
  iterable.__iterate((function(v, k) {
    groups.update(grouper.call(context, v, k, iterable), 0, (function(a) {
      return a + 1;
    }));
  }));
  return groups.asImmutable();
}
function groupByFactory(iterable, grouper, context) {
  var isKeyedIter = isKeyed(iterable);
  var groups = Map().asMutable();
  iterable.__iterate((function(v, k) {
    groups.update(grouper.call(context, v, k, iterable), [], (function(a) {
      return (a.push(isKeyedIter ? [k, v] : v), a);
    }));
  }));
  var coerce = iterableClass(iterable);
  return groups.map((function(arr) {
    return reify(iterable, coerce(arr));
  }));
}
function takeFactory(iterable, amount) {
  if (amount > iterable.size) {
    return iterable;
  }
  if (amount < 0) {
    amount = 0;
  }
  var takeSequence = makeSequence(iterable);
  takeSequence.size = iterable.size && Math.min(iterable.size, amount);
  takeSequence.__iterateUncached = function(fn, reverse) {
    var $__0 = this;
    if (amount === 0) {
      return 0;
    }
    if (reverse) {
      return this.cacheResult().__iterate(fn, reverse);
    }
    var iterations = 0;
    iterable.__iterate((function(v, k) {
      return ++iterations && fn(v, k, $__0) !== false && iterations < amount;
    }));
    return iterations;
  };
  takeSequence.__iteratorUncached = function(type, reverse) {
    if (reverse) {
      return this.cacheResult().__iterator(type, reverse);
    }
    var iterator = amount && iterable.__iterator(type, reverse);
    var iterations = 0;
    return new Iterator((function() {
      if (iterations++ > amount) {
        return iteratorDone();
      }
      return iterator.next();
    }));
  };
  return takeSequence;
}
function takeWhileFactory(iterable, predicate, context) {
  var takeSequence = makeSequence(iterable);
  takeSequence.__iterateUncached = function(fn, reverse) {
    var $__0 = this;
    if (reverse) {
      return this.cacheResult().__iterate(fn, reverse);
    }
    var iterations = 0;
    iterable.__iterate((function(v, k, c) {
      return predicate.call(context, v, k, c) && ++iterations && fn(v, k, $__0);
    }));
    return iterations;
  };
  takeSequence.__iteratorUncached = function(type, reverse) {
    var $__0 = this;
    if (reverse) {
      return this.cacheResult().__iterator(type, reverse);
    }
    var iterator = iterable.__iterator(ITERATE_ENTRIES, reverse);
    var iterating = true;
    return new Iterator((function() {
      if (!iterating) {
        return iteratorDone();
      }
      var step = iterator.next();
      if (step.done) {
        return step;
      }
      var entry = step.value;
      var k = entry[0];
      var v = entry[1];
      if (!predicate.call(context, v, k, $__0)) {
        iterating = false;
        return iteratorDone();
      }
      return type === ITERATE_ENTRIES ? step : iteratorValue(type, k, v, step);
    }));
  };
  return takeSequence;
}
function skipFactory(iterable, amount, useKeys) {
  if (amount <= 0) {
    return iterable;
  }
  var skipSequence = makeSequence(iterable);
  skipSequence.size = iterable.size && Math.max(0, iterable.size - amount);
  skipSequence.__iterateUncached = function(fn, reverse) {
    var $__0 = this;
    if (reverse) {
      return this.cacheResult().__iterate(fn, reverse);
    }
    var skipped = 0;
    var isSkipping = true;
    var iterations = 0;
    iterable.__iterate((function(v, k) {
      if (!(isSkipping && (isSkipping = skipped++ < amount))) {
        iterations++;
        return fn(v, useKeys ? k : iterations - 1, $__0);
      }
    }));
    return iterations;
  };
  skipSequence.__iteratorUncached = function(type, reverse) {
    if (reverse) {
      return this.cacheResult().__iterator(type, reverse);
    }
    var iterator = amount && iterable.__iterator(type, reverse);
    var skipped = 0;
    var iterations = 0;
    return new Iterator((function() {
      while (skipped < amount) {
        skipped++;
        iterator.next();
      }
      var step = iterator.next();
      if (useKeys || type === ITERATE_VALUES) {
        return step;
      } else if (type === ITERATE_KEYS) {
        return iteratorValue(type, iterations++, undefined, step);
      } else {
        return iteratorValue(type, iterations++, step.value[1], step);
      }
    }));
  };
  return skipSequence;
}
function skipWhileFactory(iterable, predicate, context, useKeys) {
  var skipSequence = makeSequence(iterable);
  skipSequence.__iterateUncached = function(fn, reverse) {
    var $__0 = this;
    if (reverse) {
      return this.cacheResult().__iterate(fn, reverse);
    }
    var isSkipping = true;
    var iterations = 0;
    iterable.__iterate((function(v, k, c) {
      if (!(isSkipping && (isSkipping = predicate.call(context, v, k, c)))) {
        iterations++;
        return fn(v, useKeys ? k : iterations - 1, $__0);
      }
    }));
    return iterations;
  };
  skipSequence.__iteratorUncached = function(type, reverse) {
    var $__0 = this;
    if (reverse) {
      return this.cacheResult().__iterator(type, reverse);
    }
    var iterator = iterable.__iterator(ITERATE_ENTRIES, reverse);
    var skipping = true;
    var iterations = 0;
    return new Iterator((function() {
      var step,
          k,
          v;
      do {
        step = iterator.next();
        if (step.done) {
          if (useKeys || type === ITERATE_VALUES) {
            return step;
          } else if (type === ITERATE_KEYS) {
            return iteratorValue(type, iterations++, undefined, step);
          } else {
            return iteratorValue(type, iterations++, step.value[1], step);
          }
        }
        var entry = step.value;
        k = entry[0];
        v = entry[1];
        skipping && (skipping = predicate.call(context, v, k, $__0));
      } while (skipping);
      return type === ITERATE_ENTRIES ? step : iteratorValue(type, k, v, step);
    }));
  };
  return skipSequence;
}
function concatFactory(iterable, values, useKeys) {
  var isKeyedIter = isKeyed(iterable);
  var iters = new ArraySeq([iterable].concat(values)).map((function(v) {
    if (!isIterable(v)) {
      v = seqFromValue(v, true);
    }
    if (isKeyedIter) {
      v = KeyedIterable(v);
    }
    return v;
  }));
  if (isKeyedIter) {
    iters = iters.toKeyedSeq();
  } else if (!isIndexed(iterable)) {
    iters = iters.toSetSeq();
  }
  var flat = iters.flatten(true);
  flat.size = iters.reduce((function(sum, seq) {
    if (sum !== undefined) {
      var size = seq.size;
      if (size !== undefined) {
        return sum + size;
      }
    }
  }), 0);
  return flat;
}
function flattenFactory(iterable, depth, useKeys) {
  var flatSequence = makeSequence(iterable);
  flatSequence.__iterateUncached = function(fn, reverse) {
    var iterations = 0;
    var stopped = false;
    function flatDeep(iter, currentDepth) {
      var $__0 = this;
      iter.__iterate((function(v, k) {
        if ((!depth || currentDepth < depth) && isIterable(v)) {
          flatDeep(v, currentDepth + 1);
        } else if (fn(v, useKeys ? k : iterations++, $__0) === false) {
          stopped = true;
        }
        return !stopped;
      }), reverse);
    }
    flatDeep(iterable, 0);
    return iterations;
  };
  flatSequence.__iteratorUncached = function(type, reverse) {
    var iterator = iterable.__iterator(type, reverse);
    var stack = [];
    var iterations = 0;
    return new Iterator((function() {
      while (iterator) {
        var step = iterator.next();
        if (step.done !== false) {
          iterator = stack.pop();
          continue;
        }
        var v = step.value;
        if (type === ITERATE_ENTRIES) {
          v = v[1];
        }
        if ((!depth || stack.length < depth) && isIterable(v)) {
          stack.push(iterator);
          iterator = v.__iterator(type, reverse);
        } else {
          return useKeys ? step : iteratorValue(type, iterations++, v, step);
        }
      }
      return iteratorDone();
    }));
  };
  return flatSequence;
}
function flatMapFactory(iterable, mapper, context) {
  var coerce = iterableClass(iterable);
  return iterable.toSeq().map((function(v, k) {
    return coerce(mapper.call(context, v, k, iterable));
  })).flatten(true);
}
function interposeFactory(iterable, separator) {
  var interposedSequence = makeSequence(iterable);
  interposedSequence.size = iterable.size && iterable.size * 2 - 1;
  interposedSequence.__iterateUncached = function(fn, reverse) {
    var $__0 = this;
    var iterations = 0;
    iterable.__iterate((function(v, k) {
      return (!iterations || fn(separator, iterations++, $__0) !== false) && fn(v, iterations++, $__0) !== false;
    }), reverse);
    return iterations;
  };
  interposedSequence.__iteratorUncached = function(type, reverse) {
    var iterator = iterable.__iterator(ITERATE_VALUES, reverse);
    var iterations = 0;
    var step;
    return new Iterator((function() {
      if (!step || iterations % 2) {
        step = iterator.next();
        if (step.done) {
          return step;
        }
      }
      return iterations % 2 ? iteratorValue(type, iterations++, separator) : iteratorValue(type, iterations++, step.value, step);
    }));
  };
  return interposedSequence;
}
function reify(iter, seq) {
  return isSeq(iter) ? seq : iter.constructor(seq);
}
function validateEntry(entry) {
  if (entry !== Object(entry)) {
    throw new TypeError('Expected [K, V] tuple: ' + entry);
  }
}
function resolveSize(iter) {
  assertNotInfinite(iter.size);
  return ensureSize(iter);
}
function iterableClass(iterable) {
  return isKeyed(iterable) ? KeyedIterable : isIndexed(iterable) ? IndexedIterable : SetIterable;
}
function makeSequence(iterable) {
  return Object.create((isKeyed(iterable) ? KeyedSeq : isIndexed(iterable) ? IndexedSeq : SetSeq).prototype);
}
function cacheResultThrough() {
  if (this._iter.cacheResult) {
    this._iter.cacheResult();
    this.size = this._iter.size;
    return this;
  } else {
    return Seq.prototype.cacheResult.call(this);
  }
}
var List = function List(value) {
  var empty = emptyList();
  if (arguments.length === 0) {
    return empty;
  }
  if (value && value.constructor === $List) {
    return value;
  }
  value = Iterable(value);
  var size = value.size;
  if (size === 0) {
    return empty;
  }
  if (size > 0 && size < SIZE) {
    return makeList(0, size, SHIFT, null, new VNode(value.toArray()));
  }
  return empty.merge(value);
};
var $List = List;
($traceurRuntime.createClass)(List, {
  toString: function() {
    return this.__toString('List [', ']');
  },
  get: function(index, notSetValue) {
    index = wrapIndex(this, index);
    if (index < 0 || index >= this.size) {
      return notSetValue;
    }
    index += this._origin;
    var node = listNodeFor(this, index);
    return node && node.array[index & MASK];
  },
  set: function(index, value) {
    return updateList(this, index, value);
  },
  remove: function(index) {
    return !this.has(index) ? this : index === 0 ? this.shift() : index === this.size - 1 ? this.pop() : this.splice(index, 1);
  },
  clear: function() {
    if (this.size === 0) {
      return this;
    }
    if (this.__ownerID) {
      this.size = this._origin = this._capacity = 0;
      this._level = SHIFT;
      this._root = this._tail = null;
      this.__hash = undefined;
      this.__altered = true;
      return this;
    }
    return emptyList();
  },
  push: function() {
    var values = arguments;
    var oldSize = this.size;
    return this.withMutations((function(list) {
      setListBounds(list, 0, oldSize + values.length);
      for (var ii = 0; ii < values.length; ii++) {
        list.set(oldSize + ii, values[ii]);
      }
    }));
  },
  pop: function() {
    return setListBounds(this, 0, -1);
  },
  unshift: function() {
    var values = arguments;
    return this.withMutations((function(list) {
      setListBounds(list, -values.length);
      for (var ii = 0; ii < values.length; ii++) {
        list.set(ii, values[ii]);
      }
    }));
  },
  shift: function() {
    return setListBounds(this, 1);
  },
  merge: function() {
    return mergeIntoListWith(this, undefined, arguments);
  },
  mergeWith: function(merger) {
    for (var iters = [],
        $__6 = 1; $__6 < arguments.length; $__6++)
      iters[$__6 - 1] = arguments[$__6];
    return mergeIntoListWith(this, merger, iters);
  },
  mergeDeep: function() {
    return mergeIntoListWith(this, deepMerger(undefined), arguments);
  },
  mergeDeepWith: function(merger) {
    for (var iters = [],
        $__7 = 1; $__7 < arguments.length; $__7++)
      iters[$__7 - 1] = arguments[$__7];
    return mergeIntoListWith(this, deepMerger(merger), iters);
  },
  setSize: function(size) {
    return setListBounds(this, 0, size);
  },
  slice: function(begin, end) {
    var size = this.size;
    if (wholeSlice(begin, end, size)) {
      return this;
    }
    return setListBounds(this, resolveBegin(begin, size), resolveEnd(end, size));
  },
  __iterator: function(type, reverse) {
    return new ListIterator(this, type, reverse);
  },
  __iterate: function(fn, reverse) {
    var $__0 = this;
    var iterations = 0;
    var eachFn = (function(v) {
      return fn(v, iterations++, $__0);
    });
    var tailOffset = getTailOffset(this._capacity);
    if (reverse) {
      iterateVNode(this._tail, 0, tailOffset - this._origin, this._capacity - this._origin, eachFn, reverse) && iterateVNode(this._root, this._level, -this._origin, tailOffset - this._origin, eachFn, reverse);
    } else {
      iterateVNode(this._root, this._level, -this._origin, tailOffset - this._origin, eachFn, reverse) && iterateVNode(this._tail, 0, tailOffset - this._origin, this._capacity - this._origin, eachFn, reverse);
    }
    return iterations;
  },
  __ensureOwner: function(ownerID) {
    if (ownerID === this.__ownerID) {
      return this;
    }
    if (!ownerID) {
      this.__ownerID = ownerID;
      return this;
    }
    return makeList(this._origin, this._capacity, this._level, this._root, this._tail, ownerID, this.__hash);
  }
}, {of: function() {
    return this(arguments);
  }}, IndexedCollection);
function isList(maybeList) {
  return !!(maybeList && maybeList[IS_LIST_SENTINEL]);
}
List.isList = isList;
var IS_LIST_SENTINEL = '@@__IMMUTABLE_LIST__@@';
var ListPrototype = List.prototype;
ListPrototype[IS_LIST_SENTINEL] = true;
ListPrototype[DELETE] = ListPrototype.remove;
ListPrototype.setIn = MapPrototype.setIn;
ListPrototype.removeIn = MapPrototype.removeIn;
ListPrototype.update = MapPrototype.update;
ListPrototype.updateIn = MapPrototype.updateIn;
ListPrototype.withMutations = MapPrototype.withMutations;
ListPrototype.asMutable = MapPrototype.asMutable;
ListPrototype.asImmutable = MapPrototype.asImmutable;
ListPrototype.wasAltered = MapPrototype.wasAltered;
var VNode = function VNode(array, ownerID) {
  this.array = array;
  this.ownerID = ownerID;
};
var $VNode = VNode;
($traceurRuntime.createClass)(VNode, {
  removeBefore: function(ownerID, level, index) {
    if (index === level ? 1 << level : 0 || this.array.length === 0) {
      return this;
    }
    var originIndex = (index >>> level) & MASK;
    if (originIndex >= this.array.length) {
      return new $VNode([], ownerID);
    }
    var removingFirst = originIndex === 0;
    var newChild;
    if (level > 0) {
      var oldChild = this.array[originIndex];
      newChild = oldChild && oldChild.removeBefore(ownerID, level - SHIFT, index);
      if (newChild === oldChild && removingFirst) {
        return this;
      }
    }
    if (removingFirst && !newChild) {
      return this;
    }
    var editable = editableVNode(this, ownerID);
    if (!removingFirst) {
      for (var ii = 0; ii < originIndex; ii++) {
        editable.array[ii] = undefined;
      }
    }
    if (newChild) {
      editable.array[originIndex] = newChild;
    }
    return editable;
  },
  removeAfter: function(ownerID, level, index) {
    if (index === level ? 1 << level : 0 || this.array.length === 0) {
      return this;
    }
    var sizeIndex = ((index - 1) >>> level) & MASK;
    if (sizeIndex >= this.array.length) {
      return this;
    }
    var removingLast = sizeIndex === this.array.length - 1;
    var newChild;
    if (level > 0) {
      var oldChild = this.array[sizeIndex];
      newChild = oldChild && oldChild.removeAfter(ownerID, level - SHIFT, index);
      if (newChild === oldChild && removingLast) {
        return this;
      }
    }
    if (removingLast && !newChild) {
      return this;
    }
    var editable = editableVNode(this, ownerID);
    if (!removingLast) {
      editable.array.pop();
    }
    if (newChild) {
      editable.array[sizeIndex] = newChild;
    }
    return editable;
  }
}, {});
function iterateVNode(node, level, offset, max, fn, reverse) {
  var ii;
  var array = node && node.array;
  if (level === 0) {
    var from = offset < 0 ? -offset : 0;
    var to = max - offset;
    if (to > SIZE) {
      to = SIZE;
    }
    for (ii = from; ii < to; ii++) {
      if (fn(array && array[reverse ? from + to - 1 - ii : ii]) === false) {
        return false;
      }
    }
  } else {
    var step = 1 << level;
    var newLevel = level - SHIFT;
    for (ii = 0; ii <= MASK; ii++) {
      var levelIndex = reverse ? MASK - ii : ii;
      var newOffset = offset + (levelIndex << level);
      if (newOffset < max && newOffset + step > 0) {
        var nextNode = array && array[levelIndex];
        if (!iterateVNode(nextNode, newLevel, newOffset, max, fn, reverse)) {
          return false;
        }
      }
    }
  }
  return true;
}
var ListIterator = function ListIterator(list, type, reverse) {
  this._type = type;
  this._reverse = !!reverse;
  this._maxIndex = list.size - 1;
  var tailOffset = getTailOffset(list._capacity);
  var rootStack = listIteratorFrame(list._root && list._root.array, list._level, -list._origin, tailOffset - list._origin - 1);
  var tailStack = listIteratorFrame(list._tail && list._tail.array, 0, tailOffset - list._origin, list._capacity - list._origin - 1);
  this._stack = reverse ? tailStack : rootStack;
  this._stack.__prev = reverse ? rootStack : tailStack;
};
($traceurRuntime.createClass)(ListIterator, {next: function() {
    var stack = this._stack;
    while (stack) {
      var array = stack.array;
      var rawIndex = stack.index++;
      if (this._reverse) {
        rawIndex = MASK - rawIndex;
        if (rawIndex > stack.rawMax) {
          rawIndex = stack.rawMax;
          stack.index = SIZE - rawIndex;
        }
      }
      if (rawIndex >= 0 && rawIndex < SIZE && rawIndex <= stack.rawMax) {
        var value = array && array[rawIndex];
        if (stack.level === 0) {
          var type = this._type;
          var index;
          if (type !== 1) {
            index = stack.offset + (rawIndex << stack.level);
            if (this._reverse) {
              index = this._maxIndex - index;
            }
          }
          return iteratorValue(type, index, value);
        } else {
          this._stack = stack = listIteratorFrame(value && value.array, stack.level - SHIFT, stack.offset + (rawIndex << stack.level), stack.max, stack);
        }
        continue;
      }
      stack = this._stack = this._stack.__prev;
    }
    return iteratorDone();
  }}, {}, Iterator);
function listIteratorFrame(array, level, offset, max, prevFrame) {
  return {
    array: array,
    level: level,
    offset: offset,
    max: max,
    rawMax: ((max - offset) >> level),
    index: 0,
    __prev: prevFrame
  };
}
function makeList(origin, capacity, level, root, tail, ownerID, hash) {
  var list = Object.create(ListPrototype);
  list.size = capacity - origin;
  list._origin = origin;
  list._capacity = capacity;
  list._level = level;
  list._root = root;
  list._tail = tail;
  list.__ownerID = ownerID;
  list.__hash = hash;
  list.__altered = false;
  return list;
}
var EMPTY_LIST;
function emptyList() {
  return EMPTY_LIST || (EMPTY_LIST = makeList(0, 0, SHIFT));
}
function updateList(list, index, value) {
  index = wrapIndex(list, index);
  if (index >= list.size || index < 0) {
    return list.withMutations((function(list) {
      index < 0 ? setListBounds(list, index).set(0, value) : setListBounds(list, 0, index + 1).set(index, value);
    }));
  }
  index += list._origin;
  var newTail = list._tail;
  var newRoot = list._root;
  var didAlter = MakeRef(DID_ALTER);
  if (index >= getTailOffset(list._capacity)) {
    newTail = updateVNode(newTail, list.__ownerID, 0, index, value, didAlter);
  } else {
    newRoot = updateVNode(newRoot, list.__ownerID, list._level, index, value, didAlter);
  }
  if (!didAlter.value) {
    return list;
  }
  if (list.__ownerID) {
    list._root = newRoot;
    list._tail = newTail;
    list.__hash = undefined;
    list.__altered = true;
    return list;
  }
  return makeList(list._origin, list._capacity, list._level, newRoot, newTail);
}
function updateVNode(node, ownerID, level, index, value, didAlter) {
  var idx = (index >>> level) & MASK;
  var nodeHas = node && idx < node.array.length;
  if (!nodeHas && value === undefined) {
    return node;
  }
  var newNode;
  if (level > 0) {
    var lowerNode = node && node.array[idx];
    var newLowerNode = updateVNode(lowerNode, ownerID, level - SHIFT, index, value, didAlter);
    if (newLowerNode === lowerNode) {
      return node;
    }
    newNode = editableVNode(node, ownerID);
    newNode.array[idx] = newLowerNode;
    return newNode;
  }
  if (nodeHas && node.array[idx] === value) {
    return node;
  }
  SetRef(didAlter);
  newNode = editableVNode(node, ownerID);
  if (value === undefined && idx === newNode.array.length - 1) {
    newNode.array.pop();
  } else {
    newNode.array[idx] = value;
  }
  return newNode;
}
function editableVNode(node, ownerID) {
  if (ownerID && node && ownerID === node.ownerID) {
    return node;
  }
  return new VNode(node ? node.array.slice() : [], ownerID);
}
function listNodeFor(list, rawIndex) {
  if (rawIndex >= getTailOffset(list._capacity)) {
    return list._tail;
  }
  if (rawIndex < 1 << (list._level + SHIFT)) {
    var node = list._root;
    var level = list._level;
    while (node && level > 0) {
      node = node.array[(rawIndex >>> level) & MASK];
      level -= SHIFT;
    }
    return node;
  }
}
function setListBounds(list, begin, end) {
  var owner = list.__ownerID || new OwnerID();
  var oldOrigin = list._origin;
  var oldCapacity = list._capacity;
  var newOrigin = oldOrigin + begin;
  var newCapacity = end === undefined ? oldCapacity : end < 0 ? oldCapacity + end : oldOrigin + end;
  if (newOrigin === oldOrigin && newCapacity === oldCapacity) {
    return list;
  }
  if (newOrigin >= newCapacity) {
    return list.clear();
  }
  var newLevel = list._level;
  var newRoot = list._root;
  var offsetShift = 0;
  while (newOrigin + offsetShift < 0) {
    newRoot = new VNode(newRoot && newRoot.array.length ? [undefined, newRoot] : [], owner);
    newLevel += SHIFT;
    offsetShift += 1 << newLevel;
  }
  if (offsetShift) {
    newOrigin += offsetShift;
    oldOrigin += offsetShift;
    newCapacity += offsetShift;
    oldCapacity += offsetShift;
  }
  var oldTailOffset = getTailOffset(oldCapacity);
  var newTailOffset = getTailOffset(newCapacity);
  while (newTailOffset >= 1 << (newLevel + SHIFT)) {
    newRoot = new VNode(newRoot && newRoot.array.length ? [newRoot] : [], owner);
    newLevel += SHIFT;
  }
  var oldTail = list._tail;
  var newTail = newTailOffset < oldTailOffset ? listNodeFor(list, newCapacity - 1) : newTailOffset > oldTailOffset ? new VNode([], owner) : oldTail;
  if (oldTail && newTailOffset > oldTailOffset && newOrigin < oldCapacity && oldTail.array.length) {
    newRoot = editableVNode(newRoot, owner);
    var node = newRoot;
    for (var level = newLevel; level > SHIFT; level -= SHIFT) {
      var idx = (oldTailOffset >>> level) & MASK;
      node = node.array[idx] = editableVNode(node.array[idx], owner);
    }
    node.array[(oldTailOffset >>> SHIFT) & MASK] = oldTail;
  }
  if (newCapacity < oldCapacity) {
    newTail = newTail && newTail.removeAfter(owner, 0, newCapacity);
  }
  if (newOrigin >= newTailOffset) {
    newOrigin -= newTailOffset;
    newCapacity -= newTailOffset;
    newLevel = SHIFT;
    newRoot = null;
    newTail = newTail && newTail.removeBefore(owner, 0, newOrigin);
  } else if (newOrigin > oldOrigin || newTailOffset < oldTailOffset) {
    offsetShift = 0;
    while (newRoot) {
      var beginIndex = (newOrigin >>> newLevel) & MASK;
      if (beginIndex !== (newTailOffset >>> newLevel) & MASK) {
        break;
      }
      if (beginIndex) {
        offsetShift += (1 << newLevel) * beginIndex;
      }
      newLevel -= SHIFT;
      newRoot = newRoot.array[beginIndex];
    }
    if (newRoot && newOrigin > oldOrigin) {
      newRoot = newRoot.removeBefore(owner, newLevel, newOrigin - offsetShift);
    }
    if (newRoot && newTailOffset < oldTailOffset) {
      newRoot = newRoot.removeAfter(owner, newLevel, newTailOffset - offsetShift);
    }
    if (offsetShift) {
      newOrigin -= offsetShift;
      newCapacity -= offsetShift;
    }
  }
  if (list.__ownerID) {
    list.size = newCapacity - newOrigin;
    list._origin = newOrigin;
    list._capacity = newCapacity;
    list._level = newLevel;
    list._root = newRoot;
    list._tail = newTail;
    list.__hash = undefined;
    list.__altered = true;
    return list;
  }
  return makeList(newOrigin, newCapacity, newLevel, newRoot, newTail);
}
function mergeIntoListWith(list, merger, iterables) {
  var iters = [];
  var maxSize = 0;
  for (var ii = 0; ii < iterables.length; ii++) {
    var value = iterables[ii];
    var iter = Iterable(value);
    if (iter.size > maxSize) {
      maxSize = iter.size;
    }
    if (!isIterable(value)) {
      iter = iter.map((function(v) {
        return fromJS(v);
      }));
    }
    iters.push(iter);
  }
  if (maxSize > list.size) {
    list = list.setSize(maxSize);
  }
  return mergeIntoCollectionWith(list, merger, iters);
}
function getTailOffset(size) {
  return size < SIZE ? 0 : (((size - 1) >>> SHIFT) << SHIFT);
}
var Stack = function Stack(value) {
  return arguments.length === 0 ? emptyStack() : value && value.constructor === $Stack ? value : emptyStack().unshiftAll(value);
};
var $Stack = Stack;
($traceurRuntime.createClass)(Stack, {
  toString: function() {
    return this.__toString('Stack [', ']');
  },
  get: function(index, notSetValue) {
    var head = this._head;
    while (head && index--) {
      head = head.next;
    }
    return head ? head.value : notSetValue;
  },
  peek: function() {
    return this._head && this._head.value;
  },
  push: function() {
    if (arguments.length === 0) {
      return this;
    }
    var newSize = this.size + arguments.length;
    var head = this._head;
    for (var ii = arguments.length - 1; ii >= 0; ii--) {
      head = {
        value: arguments[ii],
        next: head
      };
    }
    if (this.__ownerID) {
      this.size = newSize;
      this._head = head;
      this.__hash = undefined;
      this.__altered = true;
      return this;
    }
    return makeStack(newSize, head);
  },
  pushAll: function(iter) {
    iter = Iterable(iter);
    if (iter.size === 0) {
      return this;
    }
    var newSize = this.size;
    var head = this._head;
    iter.reverse().forEach((function(value) {
      newSize++;
      head = {
        value: value,
        next: head
      };
    }));
    if (this.__ownerID) {
      this.size = newSize;
      this._head = head;
      this.__hash = undefined;
      this.__altered = true;
      return this;
    }
    return makeStack(newSize, head);
  },
  pop: function() {
    return this.slice(1);
  },
  unshift: function() {
    return this.push.apply(this, arguments);
  },
  unshiftAll: function(iter) {
    return this.pushAll(iter);
  },
  shift: function() {
    return this.pop.apply(this, arguments);
  },
  clear: function() {
    if (this.size === 0) {
      return this;
    }
    if (this.__ownerID) {
      this.size = 0;
      this._head = undefined;
      this.__hash = undefined;
      this.__altered = true;
      return this;
    }
    return emptyStack();
  },
  slice: function(begin, end) {
    if (wholeSlice(begin, end, this.size)) {
      return this;
    }
    var resolvedBegin = resolveBegin(begin, this.size);
    var resolvedEnd = resolveEnd(end, this.size);
    if (resolvedEnd !== this.size) {
      return $traceurRuntime.superCall(this, $Stack.prototype, "slice", [begin, end]);
    }
    var newSize = this.size - resolvedBegin;
    var head = this._head;
    while (resolvedBegin--) {
      head = head.next;
    }
    if (this.__ownerID) {
      this.size = newSize;
      this._head = head;
      this.__hash = undefined;
      this.__altered = true;
      return this;
    }
    return makeStack(newSize, head);
  },
  __ensureOwner: function(ownerID) {
    if (ownerID === this.__ownerID) {
      return this;
    }
    if (!ownerID) {
      this.__ownerID = ownerID;
      this.__altered = false;
      return this;
    }
    return makeStack(this.size, this._head, ownerID, this.__hash);
  },
  __iterate: function(fn, reverse) {
    if (reverse) {
      return this.toSeq().cacheResult.__iterate(fn, reverse);
    }
    var iterations = 0;
    var node = this._head;
    while (node) {
      if (fn(node.value, iterations++, this) === false) {
        break;
      }
      node = node.next;
    }
    return iterations;
  },
  __iterator: function(type, reverse) {
    if (reverse) {
      return this.toSeq().cacheResult().__iterator(type, reverse);
    }
    var iterations = 0;
    var node = this._head;
    return new Iterator((function() {
      if (node) {
        var value = node.value;
        node = node.next;
        return iteratorValue(type, iterations++, value);
      }
      return iteratorDone();
    }));
  }
}, {of: function() {
    return this(arguments);
  }}, IndexedCollection);
function isStack(maybeStack) {
  return !!(maybeStack && maybeStack[IS_STACK_SENTINEL]);
}
Stack.isStack = isStack;
var IS_STACK_SENTINEL = '@@__IMMUTABLE_STACK__@@';
var StackPrototype = Stack.prototype;
StackPrototype[IS_STACK_SENTINEL] = true;
StackPrototype.withMutations = MapPrototype.withMutations;
StackPrototype.asMutable = MapPrototype.asMutable;
StackPrototype.asImmutable = MapPrototype.asImmutable;
StackPrototype.wasAltered = MapPrototype.wasAltered;
function makeStack(size, head, ownerID, hash) {
  var map = Object.create(StackPrototype);
  map.size = size;
  map._head = head;
  map.__ownerID = ownerID;
  map.__hash = hash;
  map.__altered = false;
  return map;
}
var EMPTY_STACK;
function emptyStack() {
  return EMPTY_STACK || (EMPTY_STACK = makeStack(0));
}
var Set = function Set(value) {
  return arguments.length === 0 ? emptySet() : value && value.constructor === $Set ? value : emptySet().union(value);
};
var $Set = Set;
($traceurRuntime.createClass)(Set, {
  toString: function() {
    return this.__toString('Set {', '}');
  },
  has: function(value) {
    return this._map.has(value);
  },
  add: function(value) {
    var newMap = this._map.set(value, true);
    if (this.__ownerID) {
      this.size = newMap.size;
      this._map = newMap;
      return this;
    }
    return newMap === this._map ? this : makeSet(newMap);
  },
  remove: function(value) {
    var newMap = this._map.remove(value);
    if (this.__ownerID) {
      this.size = newMap.size;
      this._map = newMap;
      return this;
    }
    return newMap === this._map ? this : newMap.size === 0 ? emptySet() : makeSet(newMap);
  },
  clear: function() {
    if (this.size === 0) {
      return this;
    }
    if (this.__ownerID) {
      this.size = 0;
      this._map.clear();
      return this;
    }
    return emptySet();
  },
  union: function() {
    var iters = arguments;
    if (iters.length === 0) {
      return this;
    }
    return this.withMutations((function(set) {
      for (var ii = 0; ii < iters.length; ii++) {
        Iterable(iters[ii]).forEach((function(value) {
          return set.add(value);
        }));
      }
    }));
  },
  intersect: function() {
    for (var iters = [],
        $__8 = 0; $__8 < arguments.length; $__8++)
      iters[$__8] = arguments[$__8];
    if (iters.length === 0) {
      return this;
    }
    iters = iters.map((function(iter) {
      return Iterable(iter);
    }));
    var originalSet = this;
    return this.withMutations((function(set) {
      originalSet.forEach((function(value) {
        if (!iters.every((function(iter) {
          return iter.contains(value);
        }))) {
          set.remove(value);
        }
      }));
    }));
  },
  subtract: function() {
    for (var iters = [],
        $__9 = 0; $__9 < arguments.length; $__9++)
      iters[$__9] = arguments[$__9];
    if (iters.length === 0) {
      return this;
    }
    iters = iters.map((function(iter) {
      return Iterable(iter);
    }));
    var originalSet = this;
    return this.withMutations((function(set) {
      originalSet.forEach((function(value) {
        if (iters.some((function(iter) {
          return iter.contains(value);
        }))) {
          set.remove(value);
        }
      }));
    }));
  },
  merge: function() {
    return this.union.apply(this, arguments);
  },
  mergeWith: function(merger) {
    for (var iters = [],
        $__10 = 1; $__10 < arguments.length; $__10++)
      iters[$__10 - 1] = arguments[$__10];
    return this.union.apply(this, iters);
  },
  wasAltered: function() {
    return this._map.wasAltered();
  },
  __iterate: function(fn, reverse) {
    var $__0 = this;
    return this._map.__iterate((function(_, k) {
      return fn(k, k, $__0);
    }), reverse);
  },
  __iterator: function(type, reverse) {
    return this._map.map((function(_, k) {
      return k;
    })).__iterator(type, reverse);
  },
  __ensureOwner: function(ownerID) {
    if (ownerID === this.__ownerID) {
      return this;
    }
    var newMap = this._map.__ensureOwner(ownerID);
    if (!ownerID) {
      this.__ownerID = ownerID;
      this._map = newMap;
      return this;
    }
    return makeSet(newMap, ownerID);
  }
}, {
  of: function() {
    return this(arguments);
  },
  fromKeys: function(value) {
    return this(KeyedSeq(value).flip());
  }
}, SetCollection);
function isSet(maybeSet) {
  return !!(maybeSet && maybeSet[IS_SET_SENTINEL]);
}
Set.isSet = isSet;
var IS_SET_SENTINEL = '@@__IMMUTABLE_SET__@@';
var SetPrototype = Set.prototype;
SetPrototype[IS_SET_SENTINEL] = true;
SetPrototype[DELETE] = SetPrototype.remove;
SetPrototype.mergeDeep = SetPrototype.merge;
SetPrototype.mergeDeepWith = SetPrototype.mergeWith;
SetPrototype.withMutations = MapPrototype.withMutations;
SetPrototype.asMutable = MapPrototype.asMutable;
SetPrototype.asImmutable = MapPrototype.asImmutable;
function makeSet(map, ownerID) {
  var set = Object.create(SetPrototype);
  set.size = map ? map.size : 0;
  set._map = map;
  set.__ownerID = ownerID;
  return set;
}
var EMPTY_SET;
function emptySet() {
  return EMPTY_SET || (EMPTY_SET = makeSet(emptyMap()));
}
var OrderedMap = function OrderedMap(value) {
  return arguments.length === 0 ? emptyOrderedMap() : value && value.constructor === $OrderedMap ? value : emptyOrderedMap().merge(KeyedIterable(value));
};
var $OrderedMap = OrderedMap;
($traceurRuntime.createClass)(OrderedMap, {
  toString: function() {
    return this.__toString('OrderedMap {', '}');
  },
  get: function(k, notSetValue) {
    var index = this._map.get(k);
    return index !== undefined ? this._list.get(index)[1] : notSetValue;
  },
  clear: function() {
    if (this.size === 0) {
      return this;
    }
    if (this.__ownerID) {
      this.size = 0;
      this._map.clear();
      this._list.clear();
      return this;
    }
    return emptyOrderedMap();
  },
  set: function(k, v) {
    return updateOrderedMap(this, k, v);
  },
  remove: function(k) {
    return updateOrderedMap(this, k, NOT_SET);
  },
  wasAltered: function() {
    return this._map.wasAltered() || this._list.wasAltered();
  },
  __iterate: function(fn, reverse) {
    var $__0 = this;
    return this._list.__iterate((function(entry) {
      return fn(entry[1], entry[0], $__0);
    }), reverse);
  },
  __iterator: function(type, reverse) {
    return this._list.fromEntrySeq().__iterator(type, reverse);
  },
  __ensureOwner: function(ownerID) {
    if (ownerID === this.__ownerID) {
      return this;
    }
    var newMap = this._map.__ensureOwner(ownerID);
    var newList = this._list.__ensureOwner(ownerID);
    if (!ownerID) {
      this.__ownerID = ownerID;
      this._map = newMap;
      this._list = newList;
      return this;
    }
    return makeOrderedMap(newMap, newList, ownerID, this.__hash);
  }
}, {of: function() {
    return this(arguments);
  }}, Map);
function isOrderedMap(maybeOrderedMap) {
  return !!(maybeOrderedMap && maybeOrderedMap[IS_ORDERED_MAP_SENTINEL]);
}
OrderedMap.isOrderedMap = isOrderedMap;
var IS_ORDERED_MAP_SENTINEL = '@@__IMMUTABLE_ORDERED_MAP__@@';
OrderedMap.prototype[IS_ORDERED_MAP_SENTINEL] = true;
OrderedMap.prototype[DELETE] = OrderedMap.prototype.remove;
function makeOrderedMap(map, list, ownerID, hash) {
  var omap = Object.create(OrderedMap.prototype);
  omap.size = map ? map.size : 0;
  omap._map = map;
  omap._list = list;
  omap.__ownerID = ownerID;
  omap.__hash = hash;
  return omap;
}
var EMPTY_ORDERED_MAP;
function emptyOrderedMap() {
  return EMPTY_ORDERED_MAP || (EMPTY_ORDERED_MAP = makeOrderedMap(emptyMap(), emptyList()));
}
function updateOrderedMap(omap, k, v) {
  var map = omap._map;
  var list = omap._list;
  var i = map.get(k);
  var has = i !== undefined;
  var removed = v === NOT_SET;
  if ((!has && removed) || (has && v === list.get(i)[1])) {
    return omap;
  }
  if (!has) {
    i = list.size;
  }
  var newMap = removed ? map.remove(k) : has ? map : map.set(k, i);
  var newList = removed ? list.remove(i) : list.set(i, [k, v]);
  if (omap.__ownerID) {
    omap.size = newMap.size;
    omap._map = newMap;
    omap._list = newList;
    omap.__hash = undefined;
    return omap;
  }
  return makeOrderedMap(newMap, newList);
}
var Record = function Record(defaultValues, name) {
  var RecordType = function(values) {
    if (!(this instanceof RecordType)) {
      return new RecordType(values);
    }
    this._map = arguments.length === 0 ? Map() : Map(values);
  };
  var keys = Object.keys(defaultValues);
  var RecordTypePrototype = RecordType.prototype = Object.create(RecordPrototype);
  RecordTypePrototype.constructor = RecordType;
  name && (RecordTypePrototype._name = name);
  RecordTypePrototype._defaultValues = defaultValues;
  RecordTypePrototype._keys = keys;
  RecordTypePrototype.size = keys.length;
  try {
    Iterable(defaultValues).forEach((function(_, key) {
      Object.defineProperty(RecordType.prototype, key, {
        get: function() {
          return this.get(key);
        },
        set: function(value) {
          invariant(this.__ownerID, 'Cannot set on an immutable record.');
          this.set(key, value);
        }
      });
    }));
  } catch (error) {}
  return RecordType;
};
($traceurRuntime.createClass)(Record, {
  toString: function() {
    return this.__toString(this._name + ' {', '}');
  },
  has: function(k) {
    return this._defaultValues.hasOwnProperty(k);
  },
  get: function(k, notSetValue) {
    if (notSetValue !== undefined && !this.has(k)) {
      return notSetValue;
    }
    return this._map.get(k, this._defaultValues[k]);
  },
  clear: function() {
    if (this.__ownerID) {
      this._map.clear();
      return this;
    }
    var SuperRecord = Object.getPrototypeOf(this).constructor;
    return SuperRecord._empty || (SuperRecord._empty = makeRecord(this, emptyMap()));
  },
  set: function(k, v) {
    if (!this.has(k)) {
      throw new Error('Cannot set unknown key "' + k + '" on ' + this._name);
    }
    var newMap = this._map.set(k, v);
    if (this.__ownerID || newMap === this._map) {
      return this;
    }
    return makeRecord(this, newMap);
  },
  remove: function(k) {
    if (!this.has(k)) {
      return this;
    }
    var newMap = this._map.remove(k);
    if (this.__ownerID || newMap === this._map) {
      return this;
    }
    return makeRecord(this, newMap);
  },
  keys: function() {
    return this._map.keys();
  },
  values: function() {
    return this._map.values();
  },
  entries: function() {
    return this._map.entries();
  },
  wasAltered: function() {
    return this._map.wasAltered();
  },
  __iterator: function(type, reverse) {
    return this._map.__iterator(type, reverse);
  },
  __iterate: function(fn, reverse) {
    var $__0 = this;
    return Iterable(this._defaultValues).map((function(_, k) {
      return $__0.get(k);
    })).__iterate(fn, reverse);
  },
  __ensureOwner: function(ownerID) {
    if (ownerID === this.__ownerID) {
      return this;
    }
    var newMap = this._map && this._map.__ensureOwner(ownerID);
    if (!ownerID) {
      this.__ownerID = ownerID;
      this._map = newMap;
      return this;
    }
    return makeRecord(this, newMap, ownerID);
  }
}, {}, KeyedCollection);
var RecordPrototype = Record.prototype;
RecordPrototype._name = 'Record';
RecordPrototype[DELETE] = RecordPrototype.remove;
RecordPrototype.merge = MapPrototype.merge;
RecordPrototype.mergeWith = MapPrototype.mergeWith;
RecordPrototype.mergeDeep = MapPrototype.mergeDeep;
RecordPrototype.mergeDeepWith = MapPrototype.mergeDeepWith;
RecordPrototype.update = MapPrototype.update;
RecordPrototype.updateIn = MapPrototype.updateIn;
RecordPrototype.withMutations = MapPrototype.withMutations;
RecordPrototype.asMutable = MapPrototype.asMutable;
RecordPrototype.asImmutable = MapPrototype.asImmutable;
function makeRecord(likeRecord, map, ownerID) {
  var record = Object.create(Object.getPrototypeOf(likeRecord));
  record._map = map;
  record.__ownerID = ownerID;
  return record;
}
var Range = function Range(start, end, step) {
  if (!(this instanceof $Range)) {
    return new $Range(start, end, step);
  }
  invariant(step !== 0, 'Cannot step a Range by 0');
  start = start || 0;
  if (end === undefined) {
    end = Infinity;
  }
  if (start === end && __EMPTY_RANGE) {
    return __EMPTY_RANGE;
  }
  step = step === undefined ? 1 : Math.abs(step);
  if (end < start) {
    step = -step;
  }
  this._start = start;
  this._end = end;
  this._step = step;
  this.size = Math.max(0, Math.ceil((end - start) / step - 1) + 1);
};
var $Range = Range;
($traceurRuntime.createClass)(Range, {
  toString: function() {
    if (this.size === 0) {
      return 'Range []';
    }
    return 'Range [ ' + this._start + '...' + this._end + (this._step > 1 ? ' by ' + this._step : '') + ' ]';
  },
  get: function(index, notSetValue) {
    return this.has(index) ? this._start + wrapIndex(this, index) * this._step : notSetValue;
  },
  contains: function(searchValue) {
    var possibleIndex = (searchValue - this._start) / this._step;
    return possibleIndex >= 0 && possibleIndex < this.size && possibleIndex === Math.floor(possibleIndex);
  },
  slice: function(begin, end) {
    if (wholeSlice(begin, end, this.size)) {
      return this;
    }
    begin = resolveBegin(begin, this.size);
    end = resolveEnd(end, this.size);
    if (end <= begin) {
      return __EMPTY_RANGE;
    }
    return new $Range(this.get(begin, this._end), this.get(end, this._end), this._step);
  },
  indexOf: function(searchValue) {
    var offsetValue = searchValue - this._start;
    if (offsetValue % this._step === 0) {
      var index = offsetValue / this._step;
      if (index >= 0 && index < this.size) {
        return index;
      }
    }
    return -1;
  },
  lastIndexOf: function(searchValue) {
    return this.indexOf(searchValue);
  },
  take: function(amount) {
    return this.slice(0, Math.max(0, amount));
  },
  skip: function(amount) {
    return this.slice(Math.max(0, amount));
  },
  __iterate: function(fn, reverse) {
    var maxIndex = this.size - 1;
    var step = this._step;
    var value = reverse ? this._start + maxIndex * step : this._start;
    for (var ii = 0; ii <= maxIndex; ii++) {
      if (fn(value, ii, this) === false) {
        return ii + 1;
      }
      value += reverse ? -step : step;
    }
    return ii;
  },
  __iterator: function(type, reverse) {
    var maxIndex = this.size - 1;
    var step = this._step;
    var value = reverse ? this._start + maxIndex * step : this._start;
    var ii = 0;
    return new Iterator((function() {
      var v = value;
      value += reverse ? -step : step;
      return ii > maxIndex ? iteratorDone() : iteratorValue(type, ii++, v);
    }));
  },
  __deepEquals: function(other) {
    return other instanceof $Range ? this._start === other._start && this._end === other._end && this._step === other._step : $traceurRuntime.superCall(this, $Range.prototype, "__deepEquals", [other]);
  }
}, {}, IndexedSeq);
var RangePrototype = Range.prototype;
RangePrototype.__toJS = RangePrototype.toArray;
RangePrototype.first = ListPrototype.first;
RangePrototype.last = ListPrototype.last;
var __EMPTY_RANGE = Range(0, 0);
var Repeat = function Repeat(value, times) {
  if (times <= 0 && EMPTY_REPEAT) {
    return EMPTY_REPEAT;
  }
  if (!(this instanceof $Repeat)) {
    return new $Repeat(value, times);
  }
  this._value = value;
  this.size = times === undefined ? Infinity : Math.max(0, times);
  if (this.size === 0) {
    EMPTY_REPEAT = this;
  }
};
var $Repeat = Repeat;
($traceurRuntime.createClass)(Repeat, {
  toString: function() {
    if (this.size === 0) {
      return 'Repeat []';
    }
    return 'Repeat [ ' + this._value + ' ' + this.size + ' times ]';
  },
  get: function(index, notSetValue) {
    return this.has(index) ? this._value : notSetValue;
  },
  contains: function(searchValue) {
    return is(this._value, searchValue);
  },
  slice: function(begin, end) {
    var size = this.size;
    return wholeSlice(begin, end, size) ? this : new $Repeat(this._value, resolveEnd(end, size) - resolveBegin(begin, size));
  },
  reverse: function() {
    return this;
  },
  indexOf: function(searchValue) {
    if (is(this._value, searchValue)) {
      return 0;
    }
    return -1;
  },
  lastIndexOf: function(searchValue) {
    if (is(this._value, searchValue)) {
      return this.size;
    }
    return -1;
  },
  __iterate: function(fn, reverse) {
    for (var ii = 0; ii < this.size; ii++) {
      if (fn(this._value, ii, this) === false) {
        return ii + 1;
      }
    }
    return ii;
  },
  __iterator: function(type, reverse) {
    var $__0 = this;
    var ii = 0;
    return new Iterator((function() {
      return ii < $__0.size ? iteratorValue(type, ii++, $__0._value) : iteratorDone();
    }));
  },
  __deepEquals: function(other) {
    return other instanceof $Repeat ? is(this._value, other._value) : $traceurRuntime.superCall(this, $Repeat.prototype, "__deepEquals", [other]);
  }
}, {}, IndexedSeq);
var RepeatPrototype = Repeat.prototype;
RepeatPrototype.last = RepeatPrototype.first;
RepeatPrototype.has = RangePrototype.has;
RepeatPrototype.take = RangePrototype.take;
RepeatPrototype.skip = RangePrototype.skip;
RepeatPrototype.__toJS = RangePrototype.__toJS;
var EMPTY_REPEAT;
var Immutable = {
  Iterable: Iterable,
  Seq: Seq,
  Collection: Collection,
  Map: Map,
  List: List,
  Stack: Stack,
  Set: Set,
  OrderedMap: OrderedMap,
  Record: Record,
  Range: Range,
  Repeat: Repeat,
  is: is,
  fromJS: fromJS
};

  return Immutable;
}
typeof exports === 'object' ? module.exports = universalModule() :
  typeof define === 'function' && define.amd ? define(universalModule) :
    Immutable = universalModule();

},{}],6:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],7:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],8:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],9:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],10:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":9,"_process":8,"inherits":7}],11:[function(require,module,exports){
module.exports=require(5)
},{"/Users/dubroy/dev/ma/node_modules/Immutable/dist/immutable.js":5}]},{},[1])(1)
});