!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.ma=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

/* jshint esnext: true */

// Return an Array with all the values from `gen`.
function toArray(gen) {
  var result = [];
  for (var _iterator = gen[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) {
    var x = _step.value;
    result.push(x);
  }

  return result;
}

module.exports = {
  toArray: toArray,
  // Return the first value from `gen` that passes a truth test.
  find: function find(gen, predicate, thisArg) {
    for (var _iterator = gen[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) {
      var x = _step.value;
      if (predicate.call(thisArg, x)) return x;
    }
  },
  filter: function filter(gen, predicate, thisArg) {
    return toArray(gen).filter(predicate, thisArg);
  },
  // Return the first value from `gen`.
  first: function first(gen) {
    return gen.next().value;
  }
};

},{}],2:[function(require,module,exports){
/* jshint esnext: true */

"use strict";

var _slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else { var _arr = []; for (var _iterator = arr[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) { _arr.push(_step.value); if (i && _arr.length === i) break; } return _arr; } };

var _toArray = function (arr) { return Array.isArray(arr) ? arr : Array.from(arr); };

var getMatches = regeneratorRuntime.mark(function getMatches(arr, pattern) {
  var p, i;
  return regeneratorRuntime.wrap(function getMatches$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        p = convertPattern(pattern);
        i = 0;
      case 2:
        if (!(i < arr.size)) {
          context$1$0.next = 9;
          break;
        }
        if (!(match(arr.get(i).value, p) !== null)) {
          context$1$0.next = 6;
          break;
        }
        context$1$0.next = 6;
        return i;
      case 6:
        ++i;
        context$1$0.next = 2;
        break;
      case 9:
      case "end":
        return context$1$0.stop();
    }
  }, getMatches, this);
});

var getDeepMatches = regeneratorRuntime.mark(function getDeepMatches(arr, pattern) {
  var p, path, i, root, _iterator, _step, bindings, rootPath;
  return regeneratorRuntime.wrap(function getDeepMatches$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        p = convertPattern(pattern);
        i = 0;
      case 2:
        if (!(i < arr.size)) {
          context$1$0.next = 16;
          break;
        }
        path = [i];
        root = arr.get(i).value;
        _iterator = matchDeep(root, p, path)[Symbol.iterator]();
      case 6:
        if ((_step = _iterator.next()).done) {
          context$1$0.next = 13;
          break;
        }
        bindings = _step.value;
        rootPath = path.slice(1);
        context$1$0.next = 11;
        return { index: path[0], root: root, path: rootPath, bindings: bindings };
      case 11:
        context$1$0.next = 6;
        break;
      case 13:
        ++i;
        context$1$0.next = 2;
        break;
      case 16:
      case "end":
        return context$1$0.stop();
    }
  }, getDeepMatches, this);
});

var matchDeep = regeneratorRuntime.mark(

// Recursively tries to match `obj` with `pattern`.
function matchDeep(obj, pattern, path) {
  var result, isList, isMap, _iterator, _step, entry;
  return regeneratorRuntime.wrap(function matchDeep$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        if (!((result = match(obj, pattern)) != null)) {
          context$1$0.next = 5;
          break;
        }
        context$1$0.next = 3;
        return result;
      case 3:
        context$1$0.next = 16;
        break;
      case 5:
        isList = obj && Immutable.List.isList(obj);
        isMap = obj && Immutable.Map.isMap(obj);
        if (!(isList || isMap)) {
          context$1$0.next = 16;
          break;
        }
        _iterator = obj.entries()[Symbol.iterator]();
      case 9:
        if ((_step = _iterator.next()).done) {
          context$1$0.next = 16;
          break;
        }
        entry = _step.value;
        path.push(entry[0]);
        return context$1$0.delegateYield(matchDeep(entry[1], pattern, path), "t0", 13);
      case 13:
        path.pop();
      case 14:
        context$1$0.next = 9;
        break;
      case 16:
      case "end":
        return context$1$0.stop();
    }
  }, matchDeep, this);
});

var assert = require("assert"),
    EventEmitter = require("events").EventEmitter,
    Immutable = require("immutable"),
    util = require("util"),
    walk = require("tree-walk");

var pm = require("../third_party/pattern-match"),
    gu = require("./generator-util");
require("../third_party/weakmap.js");

var match = pm.match,
    Pattern = pm.Pattern;

var Reaction = Immutable.Record({ pattern: null, callback: null }, "Reaction");
var Observer = Immutable.Record({ pattern: null, callback: null }, "Observer");

// Custom walker for walking immutable-js objects.
var immutableWalker = walk(function (node) {
  return Immutable.Iterable.isIterable(node) ? node.toJS() : node;
});

// Custom pattern for matching Immutable.Map and Immutable.Record objects.
var immutableObj = Pattern.extend({
  init: function (objPattern, ctor) {
    this.objPattern = objPattern;
    this.ctor = ctor || Immutable.Map;
    this.arity = this.getArity(objPattern);
  },
  match: function (value, bindings) {
    return value instanceof this.ctor && this.performMatch(value.toObject(), this.objPattern, bindings);
  }
});

// Custom pattern for matching Immutable.List objects.
var immutableList = Pattern.extend({
  init: function (arrPattern) {
    this.arrPattern = arrPattern;
    this.arity = this.getArity(arrPattern);
  },
  match: function (value, bindings) {
    return Immutable.List.isList(value) && this.performMatch(value.toArray(), this.arrPattern, bindings);
  }
});

// A pattern type which allows restricted matching on Reactions.
var reaction = Pattern.extend({
  init: function (r) {
    this.reaction = r;
  },
  match: function (value, bindings) {
    var r = this.reaction;
    // Only match if the pattern and the callback are identical. More general
    // matching on reactions needs more thought.
    return (value instanceof Reaction || value instanceof Observer) && value.pattern === r.pattern && value.callback === r.callback;
  },
  arity: 0
});

// Private helpers
// ---------------

function convertPattern(p) {
  return immutableWalker.reduce(p, function (memo, node, key, parent) {
    if (Array.isArray(node)) return immutableList(memo || []);
    if (typeof node === "function") return node;
    if (node instanceof Reaction || node instanceof Observer) return reaction(node);
    if (node instanceof Immutable.Record) return immutableObj(memo || {}, node.constructor);
    if (node instanceof Object) return immutableObj(memo || {});
    assert(!memo);
    return node;
  });
}

function find(arr, pattern) {
  var result = gu.first(getMatches(arr, pattern));
  return result === undefined ? -1 : result;
}

// Return true if `r1`, and `r2` are conflicting reactions, otherwise false.
// For convenience, either argument -- or both -- may be undefined or null.
function areReactionsConflicting(r1, r2) {
  return r1 && r2 && (r1._name === "Reaction" || r2._name === "Reaction");
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

Vat.prototype._init = function () {
  this._store = Immutable.List();
  this._waiting = [];
  this._reactions = [];
  this._observers = [];
};

Vat.prototype._updateStore = function (updateFn) {
  this._store = updateFn.call(this);
  if (this._history) {
    this._history.put(this._store);

    // TODO: Get rid of change events entirely.
    this.emit("change");
  }
};

Vat.prototype._doWithoutHistory = function (fn) {
  var hist = this._history;
  this._history = null;
  try {
    return fn.call(this);
  } finally {
    this._history = hist;
  }
};

Vat.prototype._try = function (pattern, op, cb) {
  var result = this["try_" + op].call(this, pattern);
  if (result) {
    cb(result);
    return true;
  }
  return false;
};

Vat.prototype._tryOrWait = function (pattern, op, cb) {
  if (!this._try(pattern, op, cb)) {
    this._waiting.push({
      pattern: pattern,
      op: op,
      callback: cb
    });
  }
};

Vat.prototype._removeAt = function (index) {
  var _this = this;
  var result = this._store.get(index).value;
  this._updateStore(function () {
    return _this._store.splice(index, 1);
  });
  return result;
};

Vat.prototype._collectReactionCandidates = function () {
  var _ref;
  for (var _len = arguments.length, lists = Array(_len), _key = 0; _key < _len; _key++) {
    lists[_key] = arguments[_key];
  }

  var candidates = [];
  var store = this._store;
  (_ref = []).concat.apply(_ref, _toArray(lists)).forEach(function (r) {
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
    matches.forEach(function (m) {
      var i = m.index;
      if (!candidates.hasOwnProperty(i)) candidates[i] = [];
      candidates[i].push([r, m]);
    });
  });
  return candidates;
};

Vat.prototype._runReaction = function (r, match) {
  var _this = this;
  if (r instanceof Reaction) this._doWithoutHistory(function () {
    return _this._removeAt(match.index);
  });

  var arity = r.callback.length;
  var expectedArity = match.bindings.length + 1;
  assert(arity === expectedArity, "Bad function arity: expected " + expectedArity + ", got " + arity);

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
    if (newValue === void 0) throw new TypeError("Reactions must return a value");
    if (newValue !== null) this.put(newValue);
  }
};

Vat.prototype._executeReactions = function (candidates) {
  var _this = this;
  // To detect conflicts, keep track of all paths that are touched.
  var reactionPaths = Object.create(null);

  Object.keys(candidates).reverse().forEach(function (i) {
    // Sort candidates based on path length (longest to shortest).
    var sorted = candidates[i].slice().sort(function (a, b) {
      return a[1].path.length - b[1].path.length;
    });

    // Execute each reaction, detecting conflicts as we go.
    sorted.forEach(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2);

      var reaction = _ref2[0];
      var match = _ref2[1];
      var path = match.path;

      // Check all ancestor paths to see if one was already touched.
      var pathString;
      for (var j = 0; j <= path.length; ++j) {
        pathString = [i].concat(path.slice(0, j)).join("/") + "/";
        if (areReactionsConflicting(reactionPaths[pathString], reaction)) throw new Error("Reaction conflict");
      }
      reactionPaths[pathString] = reaction;

      _this._runReaction(reaction, match);
    });
  });
};

Vat.prototype.put = function (value) {
  var _this = this;
  // Update the store.
  var storedObj = {
    value: Immutable.fromJS(value),
    reactions: new WeakMap()
  };
  this._updateStore(function () {
    return _this._store.push(storedObj);
  });
  this._checkForMatches();
};

Vat.prototype._checkForMatches = function () {
  // A really naive version of deferred take/copy. This should
  // probably be written in a more efficient way.
  var self = this;
  this._waiting = this._waiting.filter(function (info) {
    return !self._try(info.pattern, info.op, info.callback);
  });

  var candidates = this._collectReactionCandidates(this._reactions, this._observers);
  this._executeReactions(candidates);
};

Vat.prototype.try_copy = function (pattern) {
  var i = find(this._store, pattern);
  return i >= 0 ? this._store.get(i).value : null;
};

Vat.prototype.copy = function (pattern, cb) {
  this._tryOrWait(pattern, "copy", cb);
};

Vat.prototype.try_copy_all = function (pattern) {
  var _this = this;
  var matches = gu.toArray(getMatches(this._store, pattern));
  return matches.map(function (i) {
    return _this._store.get(i).value;
  });
};

Vat.prototype.try_take = function (pattern, deep) {
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

Vat.prototype.take = function (pattern, cb) {
  this._tryOrWait(pattern, "take", cb);
};

Vat.prototype.try_take_all = function (pattern, deep) {
  var _this = this;
  var result = [];
  if (deep) {
    var matches = gu.toArray(getDeepMatches(this._store, pattern));
    var deletedIndices = Object.create(null);
    matches.reverse().forEach(function (match) {
      // The same index can have multiple matches, so avoid trying to
      // remove the same object twice.
      if (!(match.index in deletedIndices)) {
        _this._removeAt(match.index);
        deletedIndices[match.index] = true;
      }
      // Use unshift so that matches still appear in the correct order.
      result.unshift([match.root, match.path]);
    });
  } else {
    var matchIndices = gu.toArray(getMatches(this._store, pattern));
    matchIndices.reverse().forEach(function (i) {
      return result.unshift(_this._removeAt(i));
    });
  }
  return result;
};

// A reaction is a process that attempts to `take` a given pattern every
// time the tuple space changes. If the `reaction` function produces a result,
// the result is put into the tuple space.
Vat.prototype.addReaction = function (pattern, reaction) {
  var r = new Reaction({ pattern: pattern, callback: reaction });
  this._reactions.push(r);
  this._checkForMatches();
  return r;
};

Vat.prototype.addObserver = function (pattern, cb) {
  var o = new Observer({ pattern: pattern, callback: cb });
  this._observers.push(o);
  this._checkForMatches();
  return o;
};

Vat.prototype.update = function (pattern, cb) {
  var self = this;
  this.take(pattern, function (match) {
    self.put(cb(match));
  });
};

// Does what you'd expect.
Vat.prototype.size = function () {
  return this._store.size;
};

// Exports
// -------

module.exports = Vat;

},{"../third_party/pattern-match":35,"../third_party/weakmap.js":36,"./generator-util":1,"assert":25,"events":26,"immutable":31,"tree-walk":32,"util":30}],3:[function(require,module,exports){
(function (global){
/* jshint newcap: false */

var ensureSymbol = function (key) {
  Symbol[key] = Symbol[key] || Symbol();
};

var ensureProto = function (Constructor, key, val) {
  var proto = Constructor.prototype;
  proto[key] = proto[key] || val;
};

//

if (typeof Symbol === "undefined") {
  require("es6-symbol/implement");
}

require("es6-shim");
require("./transformation/transformers/es6-generators/runtime");

// Abstract references

ensureSymbol("referenceGet");
ensureSymbol("referenceSet");
ensureSymbol("referenceDelete");

ensureProto(Function, Symbol.referenceGet, function () { return this; });

ensureProto(Map, Symbol.referenceGet, Map.prototype.get);
ensureProto(Map, Symbol.referenceSet, Map.prototype.set);
ensureProto(Map, Symbol.referenceDelete, Map.prototype.delete);

if (global.WeakMap) {
  ensureProto(WeakMap, Symbol.referenceGet, WeakMap.prototype.get);
  ensureProto(WeakMap, Symbol.referenceSet, WeakMap.prototype.set);
  ensureProto(WeakMap, Symbol.referenceDelete, WeakMap.prototype.delete);
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./transformation/transformers/es6-generators/runtime":4,"es6-shim":5,"es6-symbol/implement":6}],4:[function(require,module,exports){
(function (global){
/**
* Copyright (c) 2014, Facebook, Inc.
* All rights reserved.
*
* This source code is licensed under the BSD-style license found in the
* https://raw.github.com/facebook/regenerator/master/LICENSE file. An
* additional grant of patent rights can be found in the PATENTS file in
* the same directory.
*/

var iteratorSymbol = typeof Symbol === "function" && Symbol.iterator || "@@iterator";
var runtime = global.regeneratorRuntime = exports;
var hasOwn = Object.prototype.hasOwnProperty;

var wrap = runtime.wrap = function wrap(innerFn, outerFn, self, tryList) {
  return new Generator(innerFn, outerFn, self || null, tryList || []);
};

var GenStateSuspendedStart = "suspendedStart";
var GenStateSuspendedYield = "suspendedYield";
var GenStateExecuting = "executing";
var GenStateCompleted = "completed";

// Returning this object from the innerFn has the same effect as
// breaking out of the dispatch switch statement.
var ContinueSentinel = {};

// Dummy constructor that we use as the .constructor property for
// functions that return Generator objects.
function GeneratorFunction() {}
var GFp = function GeneratorFunctionPrototype() {};
var Gp = GFp.prototype = Generator.prototype;
(GFp.constructor = GeneratorFunction).prototype = Gp.constructor = GFp;

runtime.isGeneratorFunction = function (genFun) {
  var ctor = genFun && genFun.constructor;
  return ctor ? GeneratorFunction.name === ctor.name : false;
};

runtime.mark = function (genFun) {
  genFun.__proto__ = GFp;
  genFun.prototype = Object.create(Gp);
  return genFun;
};

runtime.async = function (innerFn, outerFn, self, tryList) {
  return new Promise(function (resolve, reject) {
    var generator = wrap(innerFn, outerFn, self, tryList);
    var callNext = step.bind(generator.next);
    var callThrow = step.bind(generator["throw"]);

    function step(arg) {
      var info;
      var value;

      try {
        info = this(arg);
        value = info.value;
      } catch (error) {
        return reject(error);
      }

      if (info.done) {
        resolve(value);
      } else {
        Promise.resolve(value).then(callNext, callThrow);
      }
    }

    callNext();
  });
};

function Generator(innerFn, outerFn, self, tryList) {
  var generator = outerFn ? Object.create(outerFn.prototype) : this;
  var context = new Context(tryList);
  var state = GenStateSuspendedStart;

  function invoke(method, arg) {
    if (state === GenStateExecuting) {
      throw new Error("Generator is already running");
    }

    if (state === GenStateCompleted) {
      throw new Error("Generator has already finished");
    }

    while (true) {
      var delegate = context.delegate;
      var info;

      if (delegate) {
        try {
          info = delegate.iterator[method](arg);

          // Delegate generator ran and handled its own exceptions so
          // regardless of what the method was, we continue as if it is
          // "next" with an undefined arg.
          method = "next";
          arg = undefined;

        } catch (uncaught) {
          context.delegate = null;

          // Like returning generator.throw(uncaught), but without the
          // overhead of an extra function call.
          method = "throw";
          arg = uncaught;

          continue;
        }

        if (info.done) {
          context[delegate.resultName] = info.value;
          context.next = delegate.nextLoc;
        } else {
          state = GenStateSuspendedYield;
          return info;
        }

        context.delegate = null;
      }

      if (method === "next") {
        if (state === GenStateSuspendedStart &&
            typeof arg !== "undefined") {
          // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
          throw new TypeError(
            "attempt to send " + JSON.stringify(arg) + " to newborn generator"
          );
        }

        if (state === GenStateSuspendedYield) {
          context.sent = arg;
        } else {
          delete context.sent;
        }

      } else if (method === "throw") {
        if (state === GenStateSuspendedStart) {
          state = GenStateCompleted;
          throw arg;
        }

        if (context.dispatchException(arg)) {
          // If the dispatched exception was caught by a catch block,
          // then let that catch block handle the exception normally.
          method = "next";
          arg = undefined;
        }

      } else if (method === "return") {
        context.abrupt("return", arg);
      }

      state = GenStateExecuting;

      try {
        var value = innerFn.call(self, context);

        // If an exception is thrown from innerFn, we leave state ===
        // GenStateExecuting and loop back for another invocation.
        state = context.done ? GenStateCompleted : GenStateSuspendedYield;

        info = {
          value: value,
          done: context.done
        };

        if (value === ContinueSentinel) {
          if (context.delegate && method === "next") {
            // Deliberately forget the last sent value so that we don't
            // accidentally pass it on to the delegate.
            arg = undefined;
          }
        } else {
          return info;
        }

      } catch (thrown) {
        state = GenStateCompleted;

        if (method === "next") {
          context.dispatchException(thrown);
        } else {
          arg = thrown;
        }
      }
    }
  }

  generator.next = invoke.bind(generator, "next");
  generator["throw"] = invoke.bind(generator, "throw");
  generator["return"] = invoke.bind(generator, "return");

  return generator;
}

Gp[iteratorSymbol] = function () {
  return this;
};

Gp.toString = function () {
  return "[object Generator]";
};

function pushTryEntry(triple) {
  var entry = { tryLoc: triple[0] };

  if (1 in triple) {
    entry.catchLoc = triple[1];
  }

  if (2 in triple) {
    entry.finallyLoc = triple[2];
  }

  this.tryEntries.push(entry);
}

function resetTryEntry(entry, i) {
  var record = entry.completion || {};
  record.type = i === 0 ? "normal" : "return";
  delete record.arg;
  entry.completion = record;
}

function Context(tryList) {
  // The root entry object (effectively a try statement without a catch
  // or a finally block) gives us a place to store values thrown from
  // locations where there is no enclosing try statement.
  this.tryEntries = [{ tryLoc: "root" }];
  tryList.forEach(pushTryEntry, this);
  this.reset();
}

runtime.keys = function (object) {
  var keys = [];
  for (var key in object) {
    keys.push(key);
  }
  keys.reverse();

  // Rather than returning an object with a next method, we keep
  // things simple and return the next function itself.
  return function next() {
    while (keys.length) {
      var key = keys.pop();
      if (key in object) {
        next.value = key;
        next.done = false;
        return next;
      }
    }

    // To avoid creating an additional object, we just hang the .value
    // and .done properties off the next function object itself. This
    // also ensures that the minifier will not anonymize the function.
    next.done = true;
    return next;
  };
};

function values(iterable) {
  var iterator = iterable;
  if (iteratorSymbol in iterable) {
    iterator = iterable[iteratorSymbol]();
  } else if (!isNaN(iterable.length)) {
    var i = -1;
    iterator = function next() {
      while (++i < iterable.length) {
        if (i in iterable) {
          next.value = iterable[i];
          next.done = false;
          return next;
        }
      }
      next.done = true;
      return next;
    };
    iterator.next = iterator;
  }
  return iterator;
}
runtime.values = values;

Context.prototype = {
  constructor: Context,

  reset: function () {
    this.prev = 0;
    this.next = 0;
    this.sent = undefined;
    this.done = false;
    this.delegate = null;

    this.tryEntries.forEach(resetTryEntry);

    // Pre-initialize at least 20 temporary variables to enable hidden
    // class optimizations for simple generators.
    for (var tempIndex = 0, tempName;
         hasOwn.call(this, tempName = "t" + tempIndex) || tempIndex < 20;
         ++tempIndex) {
      this[tempName] = null;
    }
  },

  stop: function () {
    this.done = true;

    var rootEntry = this.tryEntries[0];
    var rootRecord = rootEntry.completion;
    if (rootRecord.type === "throw") {
      throw rootRecord.arg;
    }

    return this.rval;
  },

  dispatchException: function (exception) {
    if (this.done) {
      throw exception;
    }

    var context = this;
    function handle(loc, caught) {
      record.type = "throw";
      record.arg = exception;
      context.next = loc;
      return !!caught;
    }

    for (var i = this.tryEntries.length - 1; i >= 0; --i) {
      var entry = this.tryEntries[i];
      var record = entry.completion;

      if (entry.tryLoc === "root") {
        // Exception thrown outside of any try block that could handle
        // it, so set the completion value of the entire function to
        // throw the exception.
        return handle("end");
      }

      if (entry.tryLoc <= this.prev) {
        var hasCatch = hasOwn.call(entry, "catchLoc");
        var hasFinally = hasOwn.call(entry, "finallyLoc");

        if (hasCatch && hasFinally) {
          if (this.prev < entry.catchLoc) {
            return handle(entry.catchLoc, true);
          } else if (this.prev < entry.finallyLoc) {
            return handle(entry.finallyLoc);
          }

        } else if (hasCatch) {
          if (this.prev < entry.catchLoc) {
            return handle(entry.catchLoc, true);
          }

        } else if (hasFinally) {
          if (this.prev < entry.finallyLoc) {
            return handle(entry.finallyLoc);
          }

        } else {
          throw new Error("try statement without catch or finally");
        }
      }
    }
  },

  _findFinallyEntry: function (finallyLoc) {
    for (var i = this.tryEntries.length - 1; i >= 0; --i) {
      var entry = this.tryEntries[i];
      if (entry.tryLoc <= this.prev &&
          hasOwn.call(entry, "finallyLoc") && (
            entry.finallyLoc === finallyLoc ||
            this.prev < entry.finallyLoc)) {
        return entry;
      }
    }
  },

  abrupt: function (type, arg) {
    var entry = this._findFinallyEntry();
    var record = entry ? entry.completion : {};

    record.type = type;
    record.arg = arg;

    if (entry) {
      this.next = entry.finallyLoc;
    } else {
      this.complete(record);
    }

    return ContinueSentinel;
  },

  complete: function (record) {
    if (record.type === "throw") {
      throw record.arg;
    }

    if (record.type === "break" || record.type === "continue") {
      this.next = record.arg;
    } else if (record.type === "return") {
      this.rval = record.arg;
      this.next = "end";
    }

    return ContinueSentinel;
  },

  finish: function (finallyLoc) {
    var entry = this._findFinallyEntry(finallyLoc);
    return this.complete(entry.completion);
  },

  "catch": function (tryLoc) {
    for (var i = this.tryEntries.length - 1; i >= 0; --i) {
      var entry = this.tryEntries[i];
      if (entry.tryLoc === tryLoc) {
        var record = entry.completion;
        var thrown;
        if (record.type === "throw") {
          thrown = record.arg;
          resetTryEntry(entry, i);
        }
        return thrown;
      }
    }

    // The context.catch method must only be called with a location
    // argument that corresponds to a known catch block.
    throw new Error("illegal catch attempt");
  },

  delegateYield: function (iterable, resultName, nextLoc) {
    this.delegate = {
      iterator: values(iterable),
      resultName: resultName,
      nextLoc: nextLoc
    };

    return ContinueSentinel;
  }
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],5:[function(require,module,exports){
(function (process){
 /*!
  * https://github.com/paulmillr/es6-shim
  * @license es6-shim Copyright 2013-2014 by Paul Miller (http://paulmillr.com)
  *   and contributors,  MIT License
  * es6-shim: v0.21.0
  * see https://github.com/paulmillr/es6-shim/blob/master/LICENSE
  * Details and documentation:
  * https://github.com/paulmillr/es6-shim/
  */

// UMD (Universal Module Definition)
// see https://github.com/umdjs/umd/blob/master/returnExports.js
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(factory);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like enviroments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.returnExports = factory();
  }
}(this, function () {
  'use strict';

  var isCallableWithoutNew = function (func) {
    try { func(); }
    catch (e) { return false; }
    return true;
  };

  var supportsSubclassing = function (C, f) {
    /* jshint proto:true */
    try {
      var Sub = function () { C.apply(this, arguments); };
      if (!Sub.__proto__) { return false; /* skip test on IE < 11 */ }
      Object.setPrototypeOf(Sub, C);
      Sub.prototype = Object.create(C.prototype, {
        constructor: { value: C }
      });
      return f(Sub);
    } catch (e) {
      return false;
    }
  };

  var arePropertyDescriptorsSupported = function () {
    try {
      Object.defineProperty({}, 'x', {});
      return true;
    } catch (e) { /* this is IE 8. */
      return false;
    }
  };

  var startsWithRejectsRegex = function () {
    var rejectsRegex = false;
    if (String.prototype.startsWith) {
      try {
        '/a/'.startsWith(/a/);
      } catch (e) { /* this is spec compliant */
        rejectsRegex = true;
      }
    }
    return rejectsRegex;
  };

  /*jshint evil: true */
  var getGlobal = new Function('return this;');
  /*jshint evil: false */

  var globals = getGlobal();
  var global_isFinite = globals.isFinite;
  var supportsDescriptors = !!Object.defineProperty && arePropertyDescriptorsSupported();
  var startsWithIsCompliant = startsWithRejectsRegex();
  var _slice = Array.prototype.slice;
  var _indexOf = String.prototype.indexOf;
  var _toString = Object.prototype.toString;
  var _hasOwnProperty = Object.prototype.hasOwnProperty;
  var ArrayIterator; // make our implementation private

  var defineProperty = function (object, name, value, force) {
    if (!force && name in object) { return; }
    if (supportsDescriptors) {
      Object.defineProperty(object, name, {
        configurable: true,
        enumerable: false,
        writable: true,
        value: value
      });
    } else {
      object[name] = value;
    }
  };

  // Define configurable, writable and non-enumerable props
  // if they don’t exist.
  var defineProperties = function (object, map) {
    Object.keys(map).forEach(function (name) {
      var method = map[name];
      defineProperty(object, name, method, false);
    });
  };

  // Simple shim for Object.create on ES3 browsers
  // (unlike real shim, no attempt to support `prototype === null`)
  var create = Object.create || function (prototype, properties) {
    function Type() {}
    Type.prototype = prototype;
    var object = new Type();
    if (typeof properties !== 'undefined') {
      defineProperties(object, properties);
    }
    return object;
  };

  // This is a private name in the es6 spec, equal to '[Symbol.iterator]'
  // we're going to use an arbitrary _-prefixed name to make our shims
  // work properly with each other, even though we don't have full Iterator
  // support.  That is, `Array.from(map.keys())` will work, but we don't
  // pretend to export a "real" Iterator interface.
  var $iterator$ = (typeof Symbol === 'function' && Symbol.iterator) || '_es6-shim iterator_';
  // Firefox ships a partial implementation using the name @@iterator.
  // https://bugzilla.mozilla.org/show_bug.cgi?id=907077#c14
  // So use that name if we detect it.
  if (globals.Set && typeof new globals.Set()['@@iterator'] === 'function') {
    $iterator$ = '@@iterator';
  }
  var addIterator = function (prototype, impl) {
    if (!impl) { impl = function iterator() { return this; }; }
    var o = {};
    o[$iterator$] = impl;
    defineProperties(prototype, o);
    /* jshint notypeof: true */
    if (!prototype[$iterator$] && typeof $iterator$ === 'symbol') {
      // implementations are buggy when $iterator$ is a Symbol
      prototype[$iterator$] = impl;
    }
  };

  // taken directly from https://github.com/ljharb/is-arguments/blob/master/index.js
  // can be replaced with require('is-arguments') if we ever use a build process instead
  var isArguments = function isArguments(value) {
    var str = _toString.call(value);
    var result = str === '[object Arguments]';
    if (!result) {
      result = str !== '[object Array]' &&
        value !== null &&
        typeof value === 'object' &&
        typeof value.length === 'number' &&
        value.length >= 0 &&
        _toString.call(value.callee) === '[object Function]';
    }
    return result;
  };

  var emulateES6construct = function (o) {
    if (!ES.TypeIsObject(o)) { throw new TypeError('bad object'); }
    // es5 approximation to es6 subclass semantics: in es6, 'new Foo'
    // would invoke Foo.@@create to allocation/initialize the new object.
    // In es5 we just get the plain object.  So if we detect an
    // uninitialized object, invoke o.constructor.@@create
    if (!o._es6construct) {
      if (o.constructor && ES.IsCallable(o.constructor['@@create'])) {
        o = o.constructor['@@create'](o);
      }
      defineProperties(o, { _es6construct: true });
    }
    return o;
  };

  var ES = {
    CheckObjectCoercible: function (x, optMessage) {
      /* jshint eqnull:true */
      if (x == null) {
        throw new TypeError(optMessage || 'Cannot call method on ' + x);
      }
      return x;
    },

    TypeIsObject: function (x) {
      /* jshint eqnull:true */
      // this is expensive when it returns false; use this function
      // when you expect it to return true in the common case.
      return x != null && Object(x) === x;
    },

    ToObject: function (o, optMessage) {
      return Object(ES.CheckObjectCoercible(o, optMessage));
    },

    IsCallable: function (x) {
      return typeof x === 'function' &&
        // some versions of IE say that typeof /abc/ === 'function'
        _toString.call(x) === '[object Function]';
    },

    ToInt32: function (x) {
      return x >> 0;
    },

    ToUint32: function (x) {
      return x >>> 0;
    },

    ToInteger: function (value) {
      var number = +value;
      if (Number.isNaN(number)) { return 0; }
      if (number === 0 || !Number.isFinite(number)) { return number; }
      return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
    },

    ToLength: function (value) {
      var len = ES.ToInteger(value);
      if (len <= 0) { return 0; } // includes converting -0 to +0
      if (len > Number.MAX_SAFE_INTEGER) { return Number.MAX_SAFE_INTEGER; }
      return len;
    },

    SameValue: function (a, b) {
      if (a === b) {
        // 0 === -0, but they are not identical.
        if (a === 0) { return 1 / a === 1 / b; }
        return true;
      }
      return Number.isNaN(a) && Number.isNaN(b);
    },

    SameValueZero: function (a, b) {
      // same as SameValue except for SameValueZero(+0, -0) == true
      return (a === b) || (Number.isNaN(a) && Number.isNaN(b));
    },

    IsIterable: function (o) {
      return ES.TypeIsObject(o) &&
        (typeof o[$iterator$] !== 'undefined' || isArguments(o));
    },

    GetIterator: function (o) {
      if (isArguments(o)) {
        // special case support for `arguments`
        return new ArrayIterator(o, 'value');
      }
      var itFn = o[$iterator$];
      if (!ES.IsCallable(itFn)) {
        throw new TypeError('value is not an iterable');
      }
      var it = itFn.call(o);
      if (!ES.TypeIsObject(it)) {
        throw new TypeError('bad iterator');
      }
      return it;
    },

    IteratorNext: function (it) {
      var result = arguments.length > 1 ? it.next(arguments[1]) : it.next();
      if (!ES.TypeIsObject(result)) {
        throw new TypeError('bad iterator');
      }
      return result;
    },

    Construct: function (C, args) {
      // CreateFromConstructor
      var obj;
      if (ES.IsCallable(C['@@create'])) {
        obj = C['@@create']();
      } else {
        // OrdinaryCreateFromConstructor
        obj = create(C.prototype || null);
      }
      // Mark that we've used the es6 construct path
      // (see emulateES6construct)
      defineProperties(obj, { _es6construct: true });
      // Call the constructor.
      var result = C.apply(obj, args);
      return ES.TypeIsObject(result) ? result : obj;
    }
  };

  var numberConversion = (function () {
    // from https://github.com/inexorabletash/polyfill/blob/master/typedarray.js#L176-L266
    // with permission and license, per https://twitter.com/inexorabletash/status/372206509540659200

    function roundToEven(n) {
      var w = Math.floor(n), f = n - w;
      if (f < 0.5) {
        return w;
      }
      if (f > 0.5) {
        return w + 1;
      }
      return w % 2 ? w + 1 : w;
    }

    function packIEEE754(v, ebits, fbits) {
      var bias = (1 << (ebits - 1)) - 1,
        s, e, f,
        i, bits, str, bytes;

      // Compute sign, exponent, fraction
      if (v !== v) {
        // NaN
        // http://dev.w3.org/2006/webapi/WebIDL/#es-type-mapping
        e = (1 << ebits) - 1;
        f = Math.pow(2, fbits - 1);
        s = 0;
      } else if (v === Infinity || v === -Infinity) {
        e = (1 << ebits) - 1;
        f = 0;
        s = (v < 0) ? 1 : 0;
      } else if (v === 0) {
        e = 0;
        f = 0;
        s = (1 / v === -Infinity) ? 1 : 0;
      } else {
        s = v < 0;
        v = Math.abs(v);

        if (v >= Math.pow(2, 1 - bias)) {
          e = Math.min(Math.floor(Math.log(v) / Math.LN2), 1023);
          f = roundToEven(v / Math.pow(2, e) * Math.pow(2, fbits));
          if (f / Math.pow(2, fbits) >= 2) {
            e = e + 1;
            f = 1;
          }
          if (e > bias) {
            // Overflow
            e = (1 << ebits) - 1;
            f = 0;
          } else {
            // Normal
            e = e + bias;
            f = f - Math.pow(2, fbits);
          }
        } else {
          // Subnormal
          e = 0;
          f = roundToEven(v / Math.pow(2, 1 - bias - fbits));
        }
      }

      // Pack sign, exponent, fraction
      bits = [];
      for (i = fbits; i; i -= 1) {
        bits.push(f % 2 ? 1 : 0);
        f = Math.floor(f / 2);
      }
      for (i = ebits; i; i -= 1) {
        bits.push(e % 2 ? 1 : 0);
        e = Math.floor(e / 2);
      }
      bits.push(s ? 1 : 0);
      bits.reverse();
      str = bits.join('');

      // Bits to bytes
      bytes = [];
      while (str.length) {
        bytes.push(parseInt(str.slice(0, 8), 2));
        str = str.slice(8);
      }
      return bytes;
    }

    function unpackIEEE754(bytes, ebits, fbits) {
      // Bytes to bits
      var bits = [], i, j, b, str,
          bias, s, e, f;

      for (i = bytes.length; i; i -= 1) {
        b = bytes[i - 1];
        for (j = 8; j; j -= 1) {
          bits.push(b % 2 ? 1 : 0);
          b = b >> 1;
        }
      }
      bits.reverse();
      str = bits.join('');

      // Unpack sign, exponent, fraction
      bias = (1 << (ebits - 1)) - 1;
      s = parseInt(str.slice(0, 1), 2) ? -1 : 1;
      e = parseInt(str.slice(1, 1 + ebits), 2);
      f = parseInt(str.slice(1 + ebits), 2);

      // Produce number
      if (e === (1 << ebits) - 1) {
        return f !== 0 ? NaN : s * Infinity;
      } else if (e > 0) {
        // Normalized
        return s * Math.pow(2, e - bias) * (1 + f / Math.pow(2, fbits));
      } else if (f !== 0) {
        // Denormalized
        return s * Math.pow(2, -(bias - 1)) * (f / Math.pow(2, fbits));
      } else {
        return s < 0 ? -0 : 0;
      }
    }

    function unpackFloat64(b) { return unpackIEEE754(b, 11, 52); }
    function packFloat64(v) { return packIEEE754(v, 11, 52); }
    function unpackFloat32(b) { return unpackIEEE754(b, 8, 23); }
    function packFloat32(v) { return packIEEE754(v, 8, 23); }

    var conversions = {
      toFloat32: function (num) { return unpackFloat32(packFloat32(num)); }
    };
    if (typeof Float32Array !== 'undefined') {
      var float32array = new Float32Array(1);
      conversions.toFloat32 = function (num) {
        float32array[0] = num;
        return float32array[0];
      };
    }
    return conversions;
  }());

  defineProperties(String, {
    fromCodePoint: function fromCodePoint(_) { // length = 1
      var result = [];
      var next;
      for (var i = 0, length = arguments.length; i < length; i++) {
        next = Number(arguments[i]);
        if (!ES.SameValue(next, ES.ToInteger(next)) || next < 0 || next > 0x10FFFF) {
          throw new RangeError('Invalid code point ' + next);
        }

        if (next < 0x10000) {
          result.push(String.fromCharCode(next));
        } else {
          next -= 0x10000;
          result.push(String.fromCharCode((next >> 10) + 0xD800));
          result.push(String.fromCharCode((next % 0x400) + 0xDC00));
        }
      }
      return result.join('');
    },

    raw: function raw(callSite) { // raw.length===1
      var cooked = ES.ToObject(callSite, 'bad callSite');
      var rawValue = cooked.raw;
      var rawString = ES.ToObject(rawValue, 'bad raw value');
      var len = rawString.length;
      var literalsegments = ES.ToLength(len);
      if (literalsegments <= 0) {
        return '';
      }

      var stringElements = [];
      var nextIndex = 0;
      var nextKey, next, nextSeg, nextSub;
      while (nextIndex < literalsegments) {
        nextKey = String(nextIndex);
        next = rawString[nextKey];
        nextSeg = String(next);
        stringElements.push(nextSeg);
        if (nextIndex + 1 >= literalsegments) {
          break;
        }
        next = nextIndex + 1 < arguments.length ? arguments[nextIndex + 1] : '';
        nextSub = String(next);
        stringElements.push(nextSub);
        nextIndex++;
      }
      return stringElements.join('');
    }
  });

  // Firefox 31 reports this function's length as 0
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1062484
  if (String.fromCodePoint.length !== 1) {
    var originalFromCodePoint = String.fromCodePoint;
    defineProperty(String, 'fromCodePoint', function (_) { return originalFromCodePoint.apply(this, arguments); }, true);
  }

  var StringShims = {
    // Fast repeat, uses the `Exponentiation by squaring` algorithm.
    // Perf: http://jsperf.com/string-repeat2/2
    repeat: (function () {
      var repeat = function (s, times) {
        if (times < 1) { return ''; }
        if (times % 2) { return repeat(s, times - 1) + s; }
        var half = repeat(s, times / 2);
        return half + half;
      };

      return function (times) {
        var thisStr = String(ES.CheckObjectCoercible(this));
        times = ES.ToInteger(times);
        if (times < 0 || times === Infinity) {
          throw new RangeError('Invalid String#repeat value');
        }
        return repeat(thisStr, times);
      };
    })(),

    startsWith: function (searchStr) {
      var thisStr = String(ES.CheckObjectCoercible(this));
      if (_toString.call(searchStr) === '[object RegExp]') {
        throw new TypeError('Cannot call method "startsWith" with a regex');
      }
      searchStr = String(searchStr);
      var startArg = arguments.length > 1 ? arguments[1] : void 0;
      var start = Math.max(ES.ToInteger(startArg), 0);
      return thisStr.slice(start, start + searchStr.length) === searchStr;
    },

    endsWith: function (searchStr) {
      var thisStr = String(ES.CheckObjectCoercible(this));
      if (_toString.call(searchStr) === '[object RegExp]') {
        throw new TypeError('Cannot call method "endsWith" with a regex');
      }
      searchStr = String(searchStr);
      var thisLen = thisStr.length;
      var posArg = arguments.length > 1 ? arguments[1] : void 0;
      var pos = typeof posArg === 'undefined' ? thisLen : ES.ToInteger(posArg);
      var end = Math.min(Math.max(pos, 0), thisLen);
      return thisStr.slice(end - searchStr.length, end) === searchStr;
    },

    includes: function includes(searchString) {
      var position = arguments.length > 1 ? arguments[1] : void 0;
      // Somehow this trick makes method 100% compat with the spec.
      return _indexOf.call(this, searchString, position) !== -1;
    },

    codePointAt: function (pos) {
      var thisStr = String(ES.CheckObjectCoercible(this));
      var position = ES.ToInteger(pos);
      var length = thisStr.length;
      if (position < 0 || position >= length) { return; }
      var first = thisStr.charCodeAt(position);
      var isEnd = (position + 1 === length);
      if (first < 0xD800 || first > 0xDBFF || isEnd) { return first; }
      var second = thisStr.charCodeAt(position + 1);
      if (second < 0xDC00 || second > 0xDFFF) { return first; }
      return ((first - 0xD800) * 1024) + (second - 0xDC00) + 0x10000;
    }
  };
  defineProperties(String.prototype, StringShims);

  var hasStringTrimBug = '\u0085'.trim().length !== 1;
  if (hasStringTrimBug) {
    var originalStringTrim = String.prototype.trim;
    delete String.prototype.trim;
    // whitespace from: http://es5.github.io/#x15.5.4.20
    // implementation from https://github.com/es-shims/es5-shim/blob/v3.4.0/es5-shim.js#L1304-L1324
    var ws = [
      '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003',
      '\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028',
      '\u2029\uFEFF'
    ].join('');
    var trimRegexp = new RegExp('(^[' + ws + ']+)|([' + ws + ']+$)', 'g');
    defineProperties(String.prototype, {
      trim: function () {
        if (typeof this === 'undefined' || this === null) {
          throw new TypeError("can't convert " + this + ' to object');
        }
        return String(this).replace(trimRegexp, '');
      }
    });
  }

  // see https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype-@@iterator
  var StringIterator = function (s) {
    this._s = String(ES.CheckObjectCoercible(s));
    this._i = 0;
  };
  StringIterator.prototype.next = function () {
    var s = this._s, i = this._i;
    if (typeof s === 'undefined' || i >= s.length) {
      this._s = void 0;
      return { value: void 0, done: true };
    }
    var first = s.charCodeAt(i), second, len;
    if (first < 0xD800 || first > 0xDBFF || (i + 1) == s.length) {
      len = 1;
    } else {
      second = s.charCodeAt(i + 1);
      len = (second < 0xDC00 || second > 0xDFFF) ? 1 : 2;
    }
    this._i = i + len;
    return { value: s.substr(i, len), done: false };
  };
  addIterator(StringIterator.prototype);
  addIterator(String.prototype, function () {
    return new StringIterator(this);
  });

  if (!startsWithIsCompliant) {
    // Firefox has a noncompliant startsWith implementation
    String.prototype.startsWith = StringShims.startsWith;
    String.prototype.endsWith = StringShims.endsWith;
  }

  var ArrayShims = {
    from: function (iterable) {
      var mapFn = arguments.length > 1 ? arguments[1] : void 0;

      var list = ES.ToObject(iterable, 'bad iterable');
      if (typeof mapFn !== 'undefined' && !ES.IsCallable(mapFn)) {
        throw new TypeError('Array.from: when provided, the second argument must be a function');
      }

      var hasThisArg = arguments.length > 2;
      var thisArg = hasThisArg ? arguments[2] : void 0;

      var usingIterator = ES.IsIterable(list);
      // does the spec really mean that Arrays should use ArrayIterator?
      // https://bugs.ecmascript.org/show_bug.cgi?id=2416
      //if (Array.isArray(list)) { usingIterator=false; }

      var length;
      var result, i, value;
      if (usingIterator) {
        i = 0;
        result = ES.IsCallable(this) ? Object(new this()) : [];
        var it = usingIterator ? ES.GetIterator(list) : null;
        var iterationValue;

        do {
          iterationValue = ES.IteratorNext(it);
          if (!iterationValue.done) {
            value = iterationValue.value;
            if (mapFn) {
              result[i] = hasThisArg ? mapFn.call(thisArg, value, i) : mapFn(value, i);
            } else {
              result[i] = value;
            }
            i += 1;
          }
        } while (!iterationValue.done);
        length = i;
      } else {
        length = ES.ToLength(list.length);
        result = ES.IsCallable(this) ? Object(new this(length)) : new Array(length);
        for (i = 0; i < length; ++i) {
          value = list[i];
          if (mapFn) {
            result[i] = hasThisArg ? mapFn.call(thisArg, value, i) : mapFn(value, i);
          } else {
            result[i] = value;
          }
        }
      }

      result.length = length;
      return result;
    },

    of: function () {
      return Array.from(arguments);
    }
  };
  defineProperties(Array, ArrayShims);

  var arrayFromSwallowsNegativeLengths = function () {
    try {
      return Array.from({ length: -1 }).length === 0;
    } catch (e) {
      return false;
    }
  };
  // Fixes a Firefox bug in v32
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1063993
  if (!arrayFromSwallowsNegativeLengths()) {
    defineProperty(Array, 'from', ArrayShims.from, true);
  }

  // Our ArrayIterator is private; see
  // https://github.com/paulmillr/es6-shim/issues/252
  ArrayIterator = function (array, kind) {
      this.i = 0;
      this.array = array;
      this.kind = kind;
  };

  defineProperties(ArrayIterator.prototype, {
    next: function () {
      var i = this.i, array = this.array;
      if (!(this instanceof ArrayIterator)) {
        throw new TypeError('Not an ArrayIterator');
      }
      if (typeof array !== 'undefined') {
        var len = ES.ToLength(array.length);
        for (; i < len; i++) {
          var kind = this.kind;
          var retval;
          if (kind === 'key') {
            retval = i;
          } else if (kind === 'value') {
            retval = array[i];
          } else if (kind === 'entry') {
            retval = [i, array[i]];
          }
          this.i = i + 1;
          return { value: retval, done: false };
        }
      }
      this.array = void 0;
      return { value: void 0, done: true };
    }
  });
  addIterator(ArrayIterator.prototype);

  var ArrayPrototypeShims = {
    copyWithin: function (target, start) {
      var end = arguments[2]; // copyWithin.length must be 2
      var o = ES.ToObject(this);
      var len = ES.ToLength(o.length);
      target = ES.ToInteger(target);
      start = ES.ToInteger(start);
      var to = target < 0 ? Math.max(len + target, 0) : Math.min(target, len);
      var from = start < 0 ? Math.max(len + start, 0) : Math.min(start, len);
      end = typeof end === 'undefined' ? len : ES.ToInteger(end);
      var fin = end < 0 ? Math.max(len + end, 0) : Math.min(end, len);
      var count = Math.min(fin - from, len - to);
      var direction = 1;
      if (from < to && to < (from + count)) {
        direction = -1;
        from += count - 1;
        to += count - 1;
      }
      while (count > 0) {
        if (_hasOwnProperty.call(o, from)) {
          o[to] = o[from];
        } else {
          delete o[from];
        }
        from += direction;
        to += direction;
        count -= 1;
      }
      return o;
    },

    fill: function (value) {
      var start = arguments.length > 1 ? arguments[1] : void 0;
      var end = arguments.length > 2 ? arguments[2] : void 0;
      var O = ES.ToObject(this);
      var len = ES.ToLength(O.length);
      start = ES.ToInteger(typeof start === 'undefined' ? 0 : start);
      end = ES.ToInteger(typeof end === 'undefined' ? len : end);

      var relativeStart = start < 0 ? Math.max(len + start, 0) : Math.min(start, len);
      var relativeEnd = end < 0 ? len + end : end;

      for (var i = relativeStart; i < len && i < relativeEnd; ++i) {
        O[i] = value;
      }
      return O;
    },

    find: function find(predicate) {
      var list = ES.ToObject(this);
      var length = ES.ToLength(list.length);
      if (!ES.IsCallable(predicate)) {
        throw new TypeError('Array#find: predicate must be a function');
      }
      var thisArg = arguments.length > 1 ? arguments[1] : null;
      for (var i = 0, value; i < length; i++) {
        value = list[i];
        if (thisArg) {
          if (predicate.call(thisArg, value, i, list)) { return value; }
        } else {
          if (predicate(value, i, list)) { return value; }
        }
      }
      return;
    },

    findIndex: function findIndex(predicate) {
      var list = ES.ToObject(this);
      var length = ES.ToLength(list.length);
      if (!ES.IsCallable(predicate)) {
        throw new TypeError('Array#findIndex: predicate must be a function');
      }
      var thisArg = arguments.length > 1 ? arguments[1] : null;
      for (var i = 0; i < length; i++) {
        if (thisArg) {
          if (predicate.call(thisArg, list[i], i, list)) { return i; }
        } else {
          if (predicate(list[i], i, list)) { return i; }
        }
      }
      return -1;
    },

    keys: function () {
      return new ArrayIterator(this, 'key');
    },

    values: function () {
      return new ArrayIterator(this, 'value');
    },

    entries: function () {
      return new ArrayIterator(this, 'entry');
    }
  };
  // Safari 7.1 defines Array#keys and Array#entries natively,
  // but the resulting ArrayIterator objects don't have a "next" method.
  if (Array.prototype.keys && !ES.IsCallable([1].keys().next)) {
    delete Array.prototype.keys;
  }
  if (Array.prototype.entries && !ES.IsCallable([1].entries().next)) {
    delete Array.prototype.entries;
  }

  // Chrome 38 defines Array#keys and Array#entries, and Array#@@iterator, but not Array#values
  if (Array.prototype.keys && Array.prototype.entries && !Array.prototype.values && Array.prototype[$iterator$]) {
    defineProperties(Array.prototype, {
      values: Array.prototype[$iterator$]
    });
  }
  defineProperties(Array.prototype, ArrayPrototypeShims);

  addIterator(Array.prototype, function () { return this.values(); });
  // Chrome defines keys/values/entries on Array, but doesn't give us
  // any way to identify its iterator.  So add our own shimmed field.
  if (Object.getPrototypeOf) {
    addIterator(Object.getPrototypeOf([].values()));
  }

  var maxSafeInteger = Math.pow(2, 53) - 1;
  defineProperties(Number, {
    MAX_SAFE_INTEGER: maxSafeInteger,
    MIN_SAFE_INTEGER: -maxSafeInteger,
    EPSILON: 2.220446049250313e-16,

    parseInt: globals.parseInt,
    parseFloat: globals.parseFloat,

    isFinite: function (value) {
      return typeof value === 'number' && global_isFinite(value);
    },

    isInteger: function (value) {
      return Number.isFinite(value) &&
        ES.ToInteger(value) === value;
    },

    isSafeInteger: function (value) {
      return Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
    },

    isNaN: function (value) {
      // NaN !== NaN, but they are identical.
      // NaNs are the only non-reflexive value, i.e., if x !== x,
      // then x is NaN.
      // isNaN is broken: it converts its argument to number, so
      // isNaN('foo') => true
      return value !== value;
    }

  });

  // Work around bugs in Array#find and Array#findIndex -- early
  // implementations skipped holes in sparse arrays. (Note that the
  // implementations of find/findIndex indirectly use shimmed
  // methods of Number, so this test has to happen down here.)
  if (![, 1].find(function (item, idx) { return idx === 0; })) {
    defineProperty(Array.prototype, 'find', ArrayPrototypeShims.find, true);
  }
  if ([, 1].findIndex(function (item, idx) { return idx === 0; }) !== 0) {
    defineProperty(Array.prototype, 'findIndex', ArrayPrototypeShims.findIndex, true);
  }

  if (supportsDescriptors) {
    defineProperties(Object, {
      getPropertyDescriptor: function (subject, name) {
        var pd = Object.getOwnPropertyDescriptor(subject, name);
        var proto = Object.getPrototypeOf(subject);
        while (typeof pd === 'undefined' && proto !== null) {
          pd = Object.getOwnPropertyDescriptor(proto, name);
          proto = Object.getPrototypeOf(proto);
        }
        return pd;
      },

      getPropertyNames: function (subject) {
        var result = Object.getOwnPropertyNames(subject);
        var proto = Object.getPrototypeOf(subject);

        var addProperty = function (property) {
          if (result.indexOf(property) === -1) {
            result.push(property);
          }
        };

        while (proto !== null) {
          Object.getOwnPropertyNames(proto).forEach(addProperty);
          proto = Object.getPrototypeOf(proto);
        }
        return result;
      }
    });

    defineProperties(Object, {
      // 19.1.3.1
      assign: function (target, source) {
        if (!ES.TypeIsObject(target)) {
          throw new TypeError('target must be an object');
        }
        return Array.prototype.reduce.call(arguments, function (target, source) {
          return Object.keys(Object(source)).reduce(function (target, key) {
            target[key] = source[key];
            return target;
          }, target);
        });
      },

      is: function (a, b) {
        return ES.SameValue(a, b);
      },

      // 19.1.3.9
      // shim from https://gist.github.com/WebReflection/5593554
      setPrototypeOf: (function (Object, magic) {
        var set;

        var checkArgs = function (O, proto) {
          if (!ES.TypeIsObject(O)) {
            throw new TypeError('cannot set prototype on a non-object');
          }
          if (!(proto === null || ES.TypeIsObject(proto))) {
            throw new TypeError('can only set prototype to an object or null' + proto);
          }
        };

        var setPrototypeOf = function (O, proto) {
          checkArgs(O, proto);
          set.call(O, proto);
          return O;
        };

        try {
          // this works already in Firefox and Safari
          set = Object.getOwnPropertyDescriptor(Object.prototype, magic).set;
          set.call({}, null);
        } catch (e) {
          if (Object.prototype !== {}[magic]) {
            // IE < 11 cannot be shimmed
            return;
          }
          // probably Chrome or some old Mobile stock browser
          set = function (proto) {
            this[magic] = proto;
          };
          // please note that this will **not** work
          // in those browsers that do not inherit
          // __proto__ by mistake from Object.prototype
          // in these cases we should probably throw an error
          // or at least be informed about the issue
          setPrototypeOf.polyfill = setPrototypeOf(
            setPrototypeOf({}, null),
            Object.prototype
          ) instanceof Object;
          // setPrototypeOf.polyfill === true means it works as meant
          // setPrototypeOf.polyfill === false means it's not 100% reliable
          // setPrototypeOf.polyfill === undefined
          // or
          // setPrototypeOf.polyfill ==  null means it's not a polyfill
          // which means it works as expected
          // we can even delete Object.prototype.__proto__;
        }
        return setPrototypeOf;
      })(Object, '__proto__')
    });
  }

  // Workaround bug in Opera 12 where setPrototypeOf(x, null) doesn't work,
  // but Object.create(null) does.
  if (Object.setPrototypeOf && Object.getPrototypeOf &&
      Object.getPrototypeOf(Object.setPrototypeOf({}, null)) !== null &&
      Object.getPrototypeOf(Object.create(null)) === null) {
    (function () {
      var FAKENULL = Object.create(null);
      var gpo = Object.getPrototypeOf, spo = Object.setPrototypeOf;
      Object.getPrototypeOf = function (o) {
        var result = gpo(o);
        return result === FAKENULL ? null : result;
      };
      Object.setPrototypeOf = function (o, p) {
        if (p === null) { p = FAKENULL; }
        return spo(o, p);
      };
      Object.setPrototypeOf.polyfill = false;
    })();
  }

  try {
    Object.keys('foo');
  } catch (e) {
    var originalObjectKeys = Object.keys;
    Object.keys = function (obj) {
      return originalObjectKeys(ES.ToObject(obj));
    };
  }

  var MathShims = {
    acosh: function (value) {
      value = Number(value);
      if (Number.isNaN(value) || value < 1) { return NaN; }
      if (value === 1) { return 0; }
      if (value === Infinity) { return value; }
      return Math.log(value + Math.sqrt(value * value - 1));
    },

    asinh: function (value) {
      value = Number(value);
      if (value === 0 || !global_isFinite(value)) {
        return value;
      }
      return value < 0 ? -Math.asinh(-value) : Math.log(value + Math.sqrt(value * value + 1));
    },

    atanh: function (value) {
      value = Number(value);
      if (Number.isNaN(value) || value < -1 || value > 1) {
        return NaN;
      }
      if (value === -1) { return -Infinity; }
      if (value === 1) { return Infinity; }
      if (value === 0) { return value; }
      return 0.5 * Math.log((1 + value) / (1 - value));
    },

    cbrt: function (value) {
      value = Number(value);
      if (value === 0) { return value; }
      var negate = value < 0, result;
      if (negate) { value = -value; }
      result = Math.pow(value, 1 / 3);
      return negate ? -result : result;
    },

    clz32: function (value) {
      // See https://bugs.ecmascript.org/show_bug.cgi?id=2465
      value = Number(value);
      var number = ES.ToUint32(value);
      if (number === 0) {
        return 32;
      }
      return 32 - (number).toString(2).length;
    },

    cosh: function (value) {
      value = Number(value);
      if (value === 0) { return 1; } // +0 or -0
      if (Number.isNaN(value)) { return NaN; }
      if (!global_isFinite(value)) { return Infinity; }
      if (value < 0) { value = -value; }
      if (value > 21) { return Math.exp(value) / 2; }
      return (Math.exp(value) + Math.exp(-value)) / 2;
    },

    expm1: function (value) {
      value = Number(value);
      if (value === -Infinity) { return -1; }
      if (!global_isFinite(value) || value === 0) { return value; }
      return Math.exp(value) - 1;
    },

    hypot: function (x, y) {
      var anyNaN = false;
      var allZero = true;
      var anyInfinity = false;
      var numbers = [];
      Array.prototype.every.call(arguments, function (arg) {
        var num = Number(arg);
        if (Number.isNaN(num)) {
          anyNaN = true;
        } else if (num === Infinity || num === -Infinity) {
          anyInfinity = true;
        } else if (num !== 0) {
          allZero = false;
        }
        if (anyInfinity) {
          return false;
        } else if (!anyNaN) {
          numbers.push(Math.abs(num));
        }
        return true;
      });
      if (anyInfinity) { return Infinity; }
      if (anyNaN) { return NaN; }
      if (allZero) { return 0; }

      numbers.sort(function (a, b) { return b - a; });
      var largest = numbers[0];
      var divided = numbers.map(function (number) { return number / largest; });
      var sum = divided.reduce(function (sum, number) { return sum += number * number; }, 0);
      return largest * Math.sqrt(sum);
    },

    log2: function (value) {
      return Math.log(value) * Math.LOG2E;
    },

    log10: function (value) {
      return Math.log(value) * Math.LOG10E;
    },

    log1p: function (value) {
      value = Number(value);
      if (value < -1 || Number.isNaN(value)) { return NaN; }
      if (value === 0 || value === Infinity) { return value; }
      if (value === -1) { return -Infinity; }
      var result = 0;
      var n = 50;

      if (value < 0 || value > 1) { return Math.log(1 + value); }
      for (var i = 1; i < n; i++) {
        if ((i % 2) === 0) {
          result -= Math.pow(value, i) / i;
        } else {
          result += Math.pow(value, i) / i;
        }
      }

      return result;
    },

    sign: function (value) {
      var number = +value;
      if (number === 0) { return number; }
      if (Number.isNaN(number)) { return number; }
      return number < 0 ? -1 : 1;
    },

    sinh: function (value) {
      value = Number(value);
      if (!global_isFinite(value) || value === 0) { return value; }
      return (Math.exp(value) - Math.exp(-value)) / 2;
    },

    tanh: function (value) {
      value = Number(value);
      if (Number.isNaN(value) || value === 0) { return value; }
      if (value === Infinity) { return 1; }
      if (value === -Infinity) { return -1; }
      return (Math.exp(value) - Math.exp(-value)) / (Math.exp(value) + Math.exp(-value));
    },

    trunc: function (value) {
      var number = Number(value);
      return number < 0 ? -Math.floor(-number) : Math.floor(number);
    },

    imul: function (x, y) {
      // taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul
      x = ES.ToUint32(x);
      y = ES.ToUint32(y);
      var ah  = (x >>> 16) & 0xffff;
      var al = x & 0xffff;
      var bh  = (y >>> 16) & 0xffff;
      var bl = y & 0xffff;
      // the shift by 0 fixes the sign on the high part
      // the final |0 converts the unsigned value into a signed value
      return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0)|0);
    },

    fround: function (x) {
      if (x === 0 || x === Infinity || x === -Infinity || Number.isNaN(x)) {
        return x;
      }
      var num = Number(x);
      return numberConversion.toFloat32(num);
    }
  };
  defineProperties(Math, MathShims);

  if (Math.imul(0xffffffff, 5) !== -5) {
    // Safari 6.1, at least, reports "0" for this value
    Math.imul = MathShims.imul;
  }

  // Promises
  // Simplest possible implementation; use a 3rd-party library if you
  // want the best possible speed and/or long stack traces.
  var PromiseShim = (function () {

    var Promise, Promise$prototype;

    ES.IsPromise = function (promise) {
      if (!ES.TypeIsObject(promise)) {
        return false;
      }
      if (!promise._promiseConstructor) {
        // _promiseConstructor is a bit more unique than _status, so we'll
        // check that instead of the [[PromiseStatus]] internal field.
        return false;
      }
      if (typeof promise._status === 'undefined') {
        return false; // uninitialized
      }
      return true;
    };

    // "PromiseCapability" in the spec is what most promise implementations
    // call a "deferred".
    var PromiseCapability = function (C) {
      if (!ES.IsCallable(C)) {
        throw new TypeError('bad promise constructor');
      }
      var capability = this;
      var resolver = function (resolve, reject) {
        capability.resolve = resolve;
        capability.reject = reject;
      };
      capability.promise = ES.Construct(C, [resolver]);
      // see https://bugs.ecmascript.org/show_bug.cgi?id=2478
      if (!capability.promise._es6construct) {
        throw new TypeError('bad promise constructor');
      }
      if (!(ES.IsCallable(capability.resolve) &&
            ES.IsCallable(capability.reject))) {
        throw new TypeError('bad promise constructor');
      }
    };

    // find an appropriate setImmediate-alike
    var setTimeout = globals.setTimeout;
    var makeZeroTimeout;
    if (typeof window !== 'undefined' && ES.IsCallable(window.postMessage)) {
      makeZeroTimeout = function () {
        // from http://dbaron.org/log/20100309-faster-timeouts
        var timeouts = [];
        var messageName = 'zero-timeout-message';
        var setZeroTimeout = function (fn) {
          timeouts.push(fn);
          window.postMessage(messageName, '*');
        };
        var handleMessage = function (event) {
          if (event.source == window && event.data == messageName) {
            event.stopPropagation();
            if (timeouts.length === 0) { return; }
            var fn = timeouts.shift();
            fn();
          }
        };
        window.addEventListener('message', handleMessage, true);
        return setZeroTimeout;
      };
    }
    var makePromiseAsap = function () {
      // An efficient task-scheduler based on a pre-existing Promise
      // implementation, which we can use even if we override the
      // global Promise below (in order to workaround bugs)
      // https://github.com/Raynos/observ-hash/issues/2#issuecomment-35857671
      var P = globals.Promise;
      return P && P.resolve && function (task) {
        return P.resolve().then(task);
      };
    };
    var enqueue = ES.IsCallable(globals.setImmediate) ?
      globals.setImmediate.bind(globals) :
      typeof process === 'object' && process.nextTick ? process.nextTick :
      makePromiseAsap() ||
      (ES.IsCallable(makeZeroTimeout) ? makeZeroTimeout() :
      function (task) { setTimeout(task, 0); }); // fallback

    var triggerPromiseReactions = function (reactions, x) {
      reactions.forEach(function (reaction) {
        enqueue(function () {
          // PromiseReactionTask
          var handler = reaction.handler;
          var capability = reaction.capability;
          var resolve = capability.resolve;
          var reject = capability.reject;
          try {
            var result = handler(x);
            if (result === capability.promise) {
              throw new TypeError('self resolution');
            }
            var updateResult =
              updatePromiseFromPotentialThenable(result, capability);
            if (!updateResult) {
              resolve(result);
            }
          } catch (e) {
            reject(e);
          }
        });
      });
    };

    var updatePromiseFromPotentialThenable = function (x, capability) {
      if (!ES.TypeIsObject(x)) {
        return false;
      }
      var resolve = capability.resolve;
      var reject = capability.reject;
      try {
        var then = x.then; // only one invocation of accessor
        if (!ES.IsCallable(then)) { return false; }
        then.call(x, resolve, reject);
      } catch (e) {
        reject(e);
      }
      return true;
    };

    var promiseResolutionHandler = function (promise, onFulfilled, onRejected) {
      return function (x) {
        if (x === promise) {
          return onRejected(new TypeError('self resolution'));
        }
        var C = promise._promiseConstructor;
        var capability = new PromiseCapability(C);
        var updateResult = updatePromiseFromPotentialThenable(x, capability);
        if (updateResult) {
          return capability.promise.then(onFulfilled, onRejected);
        } else {
          return onFulfilled(x);
        }
      };
    };

    Promise = function (resolver) {
      var promise = this;
      promise = emulateES6construct(promise);
      if (!promise._promiseConstructor) {
        // we use _promiseConstructor as a stand-in for the internal
        // [[PromiseStatus]] field; it's a little more unique.
        throw new TypeError('bad promise');
      }
      if (typeof promise._status !== 'undefined') {
        throw new TypeError('promise already initialized');
      }
      // see https://bugs.ecmascript.org/show_bug.cgi?id=2482
      if (!ES.IsCallable(resolver)) {
        throw new TypeError('not a valid resolver');
      }
      promise._status = 'unresolved';
      promise._resolveReactions = [];
      promise._rejectReactions = [];

      var resolve = function (resolution) {
        if (promise._status !== 'unresolved') { return; }
        var reactions = promise._resolveReactions;
        promise._result = resolution;
        promise._resolveReactions = void 0;
        promise._rejectReactions = void 0;
        promise._status = 'has-resolution';
        triggerPromiseReactions(reactions, resolution);
      };
      var reject = function (reason) {
        if (promise._status !== 'unresolved') { return; }
        var reactions = promise._rejectReactions;
        promise._result = reason;
        promise._resolveReactions = void 0;
        promise._rejectReactions = void 0;
        promise._status = 'has-rejection';
        triggerPromiseReactions(reactions, reason);
      };
      try {
        resolver(resolve, reject);
      } catch (e) {
        reject(e);
      }
      return promise;
    };
    Promise$prototype = Promise.prototype;
    defineProperties(Promise, {
      '@@create': function (obj) {
        var constructor = this;
        // AllocatePromise
        // The `obj` parameter is a hack we use for es5
        // compatibility.
        var prototype = constructor.prototype || Promise$prototype;
        obj = obj || create(prototype);
        defineProperties(obj, {
          _status: void 0,
          _result: void 0,
          _resolveReactions: void 0,
          _rejectReactions: void 0,
          _promiseConstructor: void 0
        });
        obj._promiseConstructor = constructor;
        return obj;
      }
    });

    var _promiseAllResolver = function (index, values, capability, remaining) {
      var done = false;
      return function (x) {
        if (done) { return; } // protect against being called multiple times
        done = true;
        values[index] = x;
        if ((--remaining.count) === 0) {
          var resolve = capability.resolve;
          resolve(values); // call w/ this===undefined
        }
      };
    };

    Promise.all = function (iterable) {
      var C = this;
      var capability = new PromiseCapability(C);
      var resolve = capability.resolve;
      var reject = capability.reject;
      try {
        if (!ES.IsIterable(iterable)) {
          throw new TypeError('bad iterable');
        }
        var it = ES.GetIterator(iterable);
        var values = [], remaining = { count: 1 };
        for (var index = 0; ; index++) {
          var next = ES.IteratorNext(it);
          if (next.done) {
            break;
          }
          var nextPromise = C.resolve(next.value);
          var resolveElement = _promiseAllResolver(
            index, values, capability, remaining
          );
          remaining.count++;
          nextPromise.then(resolveElement, capability.reject);
        }
        if ((--remaining.count) === 0) {
          resolve(values); // call w/ this===undefined
        }
      } catch (e) {
        reject(e);
      }
      return capability.promise;
    };

    Promise.race = function (iterable) {
      var C = this;
      var capability = new PromiseCapability(C);
      var resolve = capability.resolve;
      var reject = capability.reject;
      try {
        if (!ES.IsIterable(iterable)) {
          throw new TypeError('bad iterable');
        }
        var it = ES.GetIterator(iterable);
        while (true) {
          var next = ES.IteratorNext(it);
          if (next.done) {
            // If iterable has no items, resulting promise will never
            // resolve; see:
            // https://github.com/domenic/promises-unwrapping/issues/75
            // https://bugs.ecmascript.org/show_bug.cgi?id=2515
            break;
          }
          var nextPromise = C.resolve(next.value);
          nextPromise.then(resolve, reject);
        }
      } catch (e) {
        reject(e);
      }
      return capability.promise;
    };

    Promise.reject = function (reason) {
      var C = this;
      var capability = new PromiseCapability(C);
      var reject = capability.reject;
      reject(reason); // call with this===undefined
      return capability.promise;
    };

    Promise.resolve = function (v) {
      var C = this;
      if (ES.IsPromise(v)) {
        var constructor = v._promiseConstructor;
        if (constructor === C) { return v; }
      }
      var capability = new PromiseCapability(C);
      var resolve = capability.resolve;
      resolve(v); // call with this===undefined
      return capability.promise;
    };

    Promise.prototype['catch'] = function (onRejected) {
      return this.then(void 0, onRejected);
    };

    Promise.prototype.then = function (onFulfilled, onRejected) {
      var promise = this;
      if (!ES.IsPromise(promise)) { throw new TypeError('not a promise'); }
      // this.constructor not this._promiseConstructor; see
      // https://bugs.ecmascript.org/show_bug.cgi?id=2513
      var C = this.constructor;
      var capability = new PromiseCapability(C);
      if (!ES.IsCallable(onRejected)) {
        onRejected = function (e) { throw e; };
      }
      if (!ES.IsCallable(onFulfilled)) {
        onFulfilled = function (x) { return x; };
      }
      var resolutionHandler =
        promiseResolutionHandler(promise, onFulfilled, onRejected);
      var resolveReaction =
        { capability: capability, handler: resolutionHandler };
      var rejectReaction =
        { capability: capability, handler: onRejected };
      switch (promise._status) {
      case 'unresolved':
        promise._resolveReactions.push(resolveReaction);
        promise._rejectReactions.push(rejectReaction);
        break;
      case 'has-resolution':
        triggerPromiseReactions([resolveReaction], promise._result);
        break;
      case 'has-rejection':
        triggerPromiseReactions([rejectReaction], promise._result);
        break;
      default:
        throw new TypeError('unexpected');
      }
      return capability.promise;
    };

    return Promise;
  })();

  // Chrome's native Promise has extra methods that it shouldn't have. Let's remove them.
  if (globals.Promise) {
    delete globals.Promise.accept;
    delete globals.Promise.defer;
    delete globals.Promise.prototype.chain;
  }

  // export the Promise constructor.
  defineProperties(globals, { Promise: PromiseShim });
  // In Chrome 33 (and thereabouts) Promise is defined, but the
  // implementation is buggy in a number of ways.  Let's check subclassing
  // support to see if we have a buggy implementation.
  var promiseSupportsSubclassing = supportsSubclassing(globals.Promise, function (S) {
    return S.resolve(42) instanceof S;
  });
  var promiseIgnoresNonFunctionThenCallbacks = (function () {
    try {
      globals.Promise.reject(42).then(null, 5).then(null, function () {});
      return true;
    } catch (ex) {
      return false;
    }
  }());
  var promiseRequiresObjectContext = (function () {
    try { Promise.call(3, function () {}); } catch (e) { return true; }
    return false;
  }());
  if (!promiseSupportsSubclassing || !promiseIgnoresNonFunctionThenCallbacks || !promiseRequiresObjectContext) {
    globals.Promise = PromiseShim;
  }

  // Map and Set require a true ES5 environment
  // Their fast path also requires that the environment preserve
  // property insertion order, which is not guaranteed by the spec.
  var testOrder = function (a) {
    var b = Object.keys(a.reduce(function (o, k) {
      o[k] = true;
      return o;
    }, {}));
    return a.join(':') === b.join(':');
  };
  var preservesInsertionOrder = testOrder(['z', 'a', 'bb']);
  // some engines (eg, Chrome) only preserve insertion order for string keys
  var preservesNumericInsertionOrder = testOrder(['z', 1, 'a', '3', 2]);

  if (supportsDescriptors) {

    var fastkey = function fastkey(key) {
      if (!preservesInsertionOrder) {
        return null;
      }
      var type = typeof key;
      if (type === 'string') {
        return '$' + key;
      } else if (type === 'number') {
        // note that -0 will get coerced to "0" when used as a property key
        if (!preservesNumericInsertionOrder) {
          return 'n' + key;
        }
        return key;
      }
      return null;
    };

    var emptyObject = function emptyObject() {
      // accomodate some older not-quite-ES5 browsers
      return Object.create ? Object.create(null) : {};
    };

    var collectionShims = {
      Map: (function () {

        var empty = {};

        function MapEntry(key, value) {
          this.key = key;
          this.value = value;
          this.next = null;
          this.prev = null;
        }

        MapEntry.prototype.isRemoved = function () {
          return this.key === empty;
        };

        function MapIterator(map, kind) {
          this.head = map._head;
          this.i = this.head;
          this.kind = kind;
        }

        MapIterator.prototype = {
          next: function () {
            var i = this.i, kind = this.kind, head = this.head, result;
            if (typeof this.i === 'undefined') {
              return { value: void 0, done: true };
            }
            while (i.isRemoved() && i !== head) {
              // back up off of removed entries
              i = i.prev;
            }
            // advance to next unreturned element.
            while (i.next !== head) {
              i = i.next;
              if (!i.isRemoved()) {
                if (kind === 'key') {
                  result = i.key;
                } else if (kind === 'value') {
                  result = i.value;
                } else {
                  result = [i.key, i.value];
                }
                this.i = i;
                return { value: result, done: false };
              }
            }
            // once the iterator is done, it is done forever.
            this.i = void 0;
            return { value: void 0, done: true };
          }
        };
        addIterator(MapIterator.prototype);

        function Map(iterable) {
          var map = this;
          if (!ES.TypeIsObject(map)) {
            throw new TypeError('Map does not accept arguments when called as a function');
          }
          map = emulateES6construct(map);
          if (!map._es6map) {
            throw new TypeError('bad map');
          }

          var head = new MapEntry(null, null);
          // circular doubly-linked list.
          head.next = head.prev = head;

          defineProperties(map, {
            _head: head,
            _storage: emptyObject(),
            _size: 0
          });

          // Optionally initialize map from iterable
          if (typeof iterable !== 'undefined' && iterable !== null) {
            var it = ES.GetIterator(iterable);
            var adder = map.set;
            if (!ES.IsCallable(adder)) { throw new TypeError('bad map'); }
            while (true) {
              var next = ES.IteratorNext(it);
              if (next.done) { break; }
              var nextItem = next.value;
              if (!ES.TypeIsObject(nextItem)) {
                throw new TypeError('expected iterable of pairs');
              }
              adder.call(map, nextItem[0], nextItem[1]);
            }
          }
          return map;
        }
        var Map$prototype = Map.prototype;
        defineProperties(Map, {
          '@@create': function (obj) {
            var constructor = this;
            var prototype = constructor.prototype || Map$prototype;
            obj = obj || create(prototype);
            defineProperties(obj, { _es6map: true });
            return obj;
          }
        });

        Object.defineProperty(Map.prototype, 'size', {
          configurable: true,
          enumerable: false,
          get: function () {
            if (typeof this._size === 'undefined') {
              throw new TypeError('size method called on incompatible Map');
            }
            return this._size;
          }
        });

        defineProperties(Map.prototype, {
          get: function (key) {
            var fkey = fastkey(key);
            if (fkey !== null) {
              // fast O(1) path
              var entry = this._storage[fkey];
              if (entry) {
                return entry.value;
              } else {
                return;
              }
            }
            var head = this._head, i = head;
            while ((i = i.next) !== head) {
              if (ES.SameValueZero(i.key, key)) {
                return i.value;
              }
            }
            return;
          },

          has: function (key) {
            var fkey = fastkey(key);
            if (fkey !== null) {
              // fast O(1) path
              return typeof this._storage[fkey] !== 'undefined';
            }
            var head = this._head, i = head;
            while ((i = i.next) !== head) {
              if (ES.SameValueZero(i.key, key)) {
                return true;
              }
            }
            return false;
          },

          set: function (key, value) {
            var head = this._head, i = head, entry;
            var fkey = fastkey(key);
            if (fkey !== null) {
              // fast O(1) path
              if (typeof this._storage[fkey] !== 'undefined') {
                this._storage[fkey].value = value;
                return this;
              } else {
                entry = this._storage[fkey] = new MapEntry(key, value);
                i = head.prev;
                // fall through
              }
            }
            while ((i = i.next) !== head) {
              if (ES.SameValueZero(i.key, key)) {
                i.value = value;
                return this;
              }
            }
            entry = entry || new MapEntry(key, value);
            if (ES.SameValue(-0, key)) {
              entry.key = +0; // coerce -0 to +0 in entry
            }
            entry.next = this._head;
            entry.prev = this._head.prev;
            entry.prev.next = entry;
            entry.next.prev = entry;
            this._size += 1;
            return this;
          },

          'delete': function (key) {
            var head = this._head, i = head;
            var fkey = fastkey(key);
            if (fkey !== null) {
              // fast O(1) path
              if (typeof this._storage[fkey] === 'undefined') {
                return false;
              }
              i = this._storage[fkey].prev;
              delete this._storage[fkey];
              // fall through
            }
            while ((i = i.next) !== head) {
              if (ES.SameValueZero(i.key, key)) {
                i.key = i.value = empty;
                i.prev.next = i.next;
                i.next.prev = i.prev;
                this._size -= 1;
                return true;
              }
            }
            return false;
          },

          clear: function () {
            this._size = 0;
            this._storage = emptyObject();
            var head = this._head, i = head, p = i.next;
            while ((i = p) !== head) {
              i.key = i.value = empty;
              p = i.next;
              i.next = i.prev = head;
            }
            head.next = head.prev = head;
          },

          keys: function () {
            return new MapIterator(this, 'key');
          },

          values: function () {
            return new MapIterator(this, 'value');
          },

          entries: function () {
            return new MapIterator(this, 'key+value');
          },

          forEach: function (callback) {
            var context = arguments.length > 1 ? arguments[1] : null;
            var it = this.entries();
            for (var entry = it.next(); !entry.done; entry = it.next()) {
              if (context) {
                callback.call(context, entry.value[1], entry.value[0], this);
              } else {
                callback(entry.value[1], entry.value[0], this);
              }
            }
          }
        });
        addIterator(Map.prototype, function () { return this.entries(); });

        return Map;
      })(),

      Set: (function () {
        // Creating a Map is expensive.  To speed up the common case of
        // Sets containing only string or numeric keys, we use an object
        // as backing storage and lazily create a full Map only when
        // required.
        var SetShim = function Set(iterable) {
          var set = this;
          if (!ES.TypeIsObject(set)) {
            throw new TypeError('Set does not accept arguments when called as a function');
          }
          set = emulateES6construct(set);
          if (!set._es6set) {
            throw new TypeError('bad set');
          }

          defineProperties(set, {
            '[[SetData]]': null,
            _storage: emptyObject()
          });

          // Optionally initialize map from iterable
          if (typeof iterable !== 'undefined' && iterable !== null) {
            var it = ES.GetIterator(iterable);
            var adder = set.add;
            if (!ES.IsCallable(adder)) { throw new TypeError('bad set'); }
            while (true) {
              var next = ES.IteratorNext(it);
              if (next.done) { break; }
              var nextItem = next.value;
              adder.call(set, nextItem);
            }
          }
          return set;
        };
        var Set$prototype = SetShim.prototype;
        defineProperties(SetShim, {
          '@@create': function (obj) {
            var constructor = this;
            var prototype = constructor.prototype || Set$prototype;
            obj = obj || create(prototype);
            defineProperties(obj, { _es6set: true });
            return obj;
          }
        });

        // Switch from the object backing storage to a full Map.
        var ensureMap = function ensureMap(set) {
          if (!set['[[SetData]]']) {
            var m = set['[[SetData]]'] = new collectionShims.Map();
            Object.keys(set._storage).forEach(function (k) {
              // fast check for leading '$'
              if (k.charCodeAt(0) === 36) {
                k = k.slice(1);
              } else if (k.charAt(0) === 'n') {
                k = +k.slice(1);
              } else {
                k = +k;
              }
              m.set(k, k);
            });
            set._storage = null; // free old backing storage
          }
        };

        Object.defineProperty(SetShim.prototype, 'size', {
          configurable: true,
          enumerable: false,
          get: function () {
            if (typeof this._storage === 'undefined') {
              // https://github.com/paulmillr/es6-shim/issues/176
              throw new TypeError('size method called on incompatible Set');
            }
            ensureMap(this);
            return this['[[SetData]]'].size;
          }
        });

        defineProperties(SetShim.prototype, {
          has: function (key) {
            var fkey;
            if (this._storage && (fkey = fastkey(key)) !== null) {
              return !!this._storage[fkey];
            }
            ensureMap(this);
            return this['[[SetData]]'].has(key);
          },

          add: function (key) {
            var fkey;
            if (this._storage && (fkey = fastkey(key)) !== null) {
              this._storage[fkey] = true;
              return this;
            }
            ensureMap(this);
            this['[[SetData]]'].set(key, key);
            return this;
          },

          'delete': function (key) {
            var fkey;
            if (this._storage && (fkey = fastkey(key)) !== null) {
              var hasFKey = _hasOwnProperty.call(this._storage, fkey);
              return (delete this._storage[fkey]) && hasFKey;
            }
            ensureMap(this);
            return this['[[SetData]]']['delete'](key);
          },

          clear: function () {
            if (this._storage) {
              this._storage = emptyObject();
              return;
            }
            return this['[[SetData]]'].clear();
          },

          values: function () {
            ensureMap(this);
            return this['[[SetData]]'].values();
          },

          entries: function () {
            ensureMap(this);
            return this['[[SetData]]'].entries();
          },

          forEach: function (callback) {
            var context = arguments.length > 1 ? arguments[1] : null;
            var entireSet = this;
            ensureMap(entireSet);
            this['[[SetData]]'].forEach(function (value, key) {
              if (context) {
                callback.call(context, key, key, entireSet);
              } else {
                callback(key, key, entireSet);
              }
            });
          }
        });
        defineProperty(SetShim, 'keys', SetShim.values, true);
        addIterator(SetShim.prototype, function () { return this.values(); });

        return SetShim;
      })()
    };
    defineProperties(globals, collectionShims);

    if (globals.Map || globals.Set) {
      /*
        - In Firefox < 23, Map#size is a function.
        - In all current Firefox, Set#entries/keys/values & Map#clear do not exist
        - https://bugzilla.mozilla.org/show_bug.cgi?id=869996
        - In Firefox 24, Map and Set do not implement forEach
        - In Firefox 25 at least, Map and Set are callable without "new"
      */
      if (
        typeof globals.Map.prototype.clear !== 'function' ||
        new globals.Set().size !== 0 ||
        new globals.Map().size !== 0 ||
        typeof globals.Map.prototype.keys !== 'function' ||
        typeof globals.Set.prototype.keys !== 'function' ||
        typeof globals.Map.prototype.forEach !== 'function' ||
        typeof globals.Set.prototype.forEach !== 'function' ||
        isCallableWithoutNew(globals.Map) ||
        isCallableWithoutNew(globals.Set) ||
        !supportsSubclassing(globals.Map, function (M) {
          var m = new M([]);
          // Firefox 32 is ok with the instantiating the subclass but will
          // throw when the map is used.
          m.set(42, 42);
          return m instanceof M;
        })
      ) {
        globals.Map = collectionShims.Map;
        globals.Set = collectionShims.Set;
      }
    }
    if (globals.Set.prototype.keys !== globals.Set.prototype.values) {
      defineProperty(globals.Set.prototype, 'keys', globals.Set.prototype.values, true);
    }
    // Shim incomplete iterator implementations.
    addIterator(Object.getPrototypeOf((new globals.Map()).keys()));
    addIterator(Object.getPrototypeOf((new globals.Set()).keys()));
  }

  return globals;
}));


}).call(this,require('_process'))
},{"_process":28}],6:[function(require,module,exports){
'use strict';

if (!require('./is-implemented')()) {
	Object.defineProperty(require('es5-ext/global'), 'Symbol',
		{ value: require('./polyfill'), configurable: true, enumerable: false,
			writable: true });
}

},{"./is-implemented":7,"./polyfill":22,"es5-ext/global":9}],7:[function(require,module,exports){
'use strict';

module.exports = function () {
	var symbol;
	if (typeof Symbol !== 'function') return false;
	symbol = Symbol('test symbol');
	try { String(symbol); } catch (e) { return false; }
	if (typeof Symbol.iterator === 'symbol') return true;

	// Return 'true' for polyfills
	if (typeof Symbol.isConcatSpreadable !== 'object') return false;
	if (typeof Symbol.isRegExp !== 'object') return false;
	if (typeof Symbol.iterator !== 'object') return false;
	if (typeof Symbol.toPrimitive !== 'object') return false;
	if (typeof Symbol.toStringTag !== 'object') return false;
	if (typeof Symbol.unscopables !== 'object') return false;

	return true;
};

},{}],8:[function(require,module,exports){
'use strict';

var assign        = require('es5-ext/object/assign')
  , normalizeOpts = require('es5-ext/object/normalize-options')
  , isCallable    = require('es5-ext/object/is-callable')
  , contains      = require('es5-ext/string/#/contains')

  , d;

d = module.exports = function (dscr, value/*, options*/) {
	var c, e, w, options, desc;
	if ((arguments.length < 2) || (typeof dscr !== 'string')) {
		options = value;
		value = dscr;
		dscr = null;
	} else {
		options = arguments[2];
	}
	if (dscr == null) {
		c = w = true;
		e = false;
	} else {
		c = contains.call(dscr, 'c');
		e = contains.call(dscr, 'e');
		w = contains.call(dscr, 'w');
	}

	desc = { value: value, configurable: c, enumerable: e, writable: w };
	return !options ? desc : assign(normalizeOpts(options), desc);
};

d.gs = function (dscr, get, set/*, options*/) {
	var c, e, options, desc;
	if (typeof dscr !== 'string') {
		options = set;
		set = get;
		get = dscr;
		dscr = null;
	} else {
		options = arguments[3];
	}
	if (get == null) {
		get = undefined;
	} else if (!isCallable(get)) {
		options = get;
		get = set = undefined;
	} else if (set == null) {
		set = undefined;
	} else if (!isCallable(set)) {
		options = set;
		set = undefined;
	}
	if (dscr == null) {
		c = true;
		e = false;
	} else {
		c = contains.call(dscr, 'c');
		e = contains.call(dscr, 'e');
	}

	desc = { get: get, set: set, configurable: c, enumerable: e };
	return !options ? desc : assign(normalizeOpts(options), desc);
};

},{"es5-ext/object/assign":10,"es5-ext/object/is-callable":13,"es5-ext/object/normalize-options":17,"es5-ext/string/#/contains":19}],9:[function(require,module,exports){
'use strict';

module.exports = new Function("return this")();

},{}],10:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Object.assign
	: require('./shim');

},{"./is-implemented":11,"./shim":12}],11:[function(require,module,exports){
'use strict';

module.exports = function () {
	var assign = Object.assign, obj;
	if (typeof assign !== 'function') return false;
	obj = { foo: 'raz' };
	assign(obj, { bar: 'dwa' }, { trzy: 'trzy' });
	return (obj.foo + obj.bar + obj.trzy) === 'razdwatrzy';
};

},{}],12:[function(require,module,exports){
'use strict';

var keys  = require('../keys')
  , value = require('../valid-value')

  , max = Math.max;

module.exports = function (dest, src/*, …srcn*/) {
	var error, i, l = max(arguments.length, 2), assign;
	dest = Object(value(dest));
	assign = function (key) {
		try { dest[key] = src[key]; } catch (e) {
			if (!error) error = e;
		}
	};
	for (i = 1; i < l; ++i) {
		src = arguments[i];
		keys(src).forEach(assign);
	}
	if (error !== undefined) throw error;
	return dest;
};

},{"../keys":14,"../valid-value":18}],13:[function(require,module,exports){
// Deprecated

'use strict';

module.exports = function (obj) { return typeof obj === 'function'; };

},{}],14:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Object.keys
	: require('./shim');

},{"./is-implemented":15,"./shim":16}],15:[function(require,module,exports){
'use strict';

module.exports = function () {
	try {
		Object.keys('primitive');
		return true;
	} catch (e) { return false; }
};

},{}],16:[function(require,module,exports){
'use strict';

var keys = Object.keys;

module.exports = function (object) {
	return keys(object == null ? object : Object(object));
};

},{}],17:[function(require,module,exports){
'use strict';

var assign = require('./assign')

  , forEach = Array.prototype.forEach
  , create = Object.create, getPrototypeOf = Object.getPrototypeOf

  , process;

process = function (src, obj) {
	var proto = getPrototypeOf(src);
	return assign(proto ? process(proto, obj) : obj, src);
};

module.exports = function (options/*, …options*/) {
	var result = create(null);
	forEach.call(arguments, function (options) {
		if (options == null) return;
		process(Object(options), result);
	});
	return result;
};

},{"./assign":10}],18:[function(require,module,exports){
'use strict';

module.exports = function (value) {
	if (value == null) throw new TypeError("Cannot use null or undefined");
	return value;
};

},{}],19:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? String.prototype.contains
	: require('./shim');

},{"./is-implemented":20,"./shim":21}],20:[function(require,module,exports){
'use strict';

var str = 'razdwatrzy';

module.exports = function () {
	if (typeof str.contains !== 'function') return false;
	return ((str.contains('dwa') === true) && (str.contains('foo') === false));
};

},{}],21:[function(require,module,exports){
'use strict';

var indexOf = String.prototype.indexOf;

module.exports = function (searchString/*, position*/) {
	return indexOf.call(this, searchString, arguments[1]) > -1;
};

},{}],22:[function(require,module,exports){
'use strict';

var d = require('d')

  , create = Object.create, defineProperties = Object.defineProperties
  , generateName, Symbol;

generateName = (function () {
	var created = create(null);
	return function (desc) {
		var postfix = 0;
		while (created[desc + (postfix || '')]) ++postfix;
		desc += (postfix || '');
		created[desc] = true;
		return '@@' + desc;
	};
}());

module.exports = Symbol = function (description) {
	var symbol;
	if (this instanceof Symbol) {
		throw new TypeError('TypeError: Symbol is not a constructor');
	}
	symbol = create(Symbol.prototype);
	description = (description === undefined ? '' : String(description));
	return defineProperties(symbol, {
		__description__: d('', description),
		__name__: d('', generateName(description))
	});
};

Object.defineProperties(Symbol, {
	create: d('', Symbol('create')),
	hasInstance: d('', Symbol('hasInstance')),
	isConcatSpreadable: d('', Symbol('isConcatSpreadable')),
	isRegExp: d('', Symbol('isRegExp')),
	iterator: d('', Symbol('iterator')),
	toPrimitive: d('', Symbol('toPrimitive')),
	toStringTag: d('', Symbol('toStringTag')),
	unscopables: d('', Symbol('unscopables'))
});

defineProperties(Symbol.prototype, {
	properToString: d(function () {
		return 'Symbol (' + this.__description__ + ')';
	}),
	toString: d('', function () { return this.__name__; })
});
Object.defineProperty(Symbol.prototype, Symbol.toPrimitive, d('',
	function (hint) {
		throw new TypeError("Conversion of symbol objects is not allowed");
	}));
Object.defineProperty(Symbol.prototype, Symbol.toStringTag, d('c', 'Symbol'));

},{"d":8}],23:[function(require,module,exports){
module.exports = require("./lib/6to5/polyfill");

},{"./lib/6to5/polyfill":3}],24:[function(require,module,exports){

},{}],25:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":30}],26:[function(require,module,exports){
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

},{}],27:[function(require,module,exports){
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

},{}],28:[function(require,module,exports){
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

},{}],29:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],30:[function(require,module,exports){
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
},{"./support/isBuffer":29,"_process":28,"inherits":27}],31:[function(require,module,exports){
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

},{}],32:[function(require,module,exports){
// Copyright (c) 2014 Patrick Dubroy <pdubroy@gmail.com>
// This software is distributed under the terms of the MIT License.

/* global -WeakMap */

var extend = require('util-extend'),
    WeakMap = require('./third_party/WeakMap');

// An internal object that can be returned from a visitor function to
// prevent a top-down walk from walking subtrees of a node.
var stopRecursion = {};

// An internal object that can be returned from a visitor function to
// cause the walk to immediately stop.
var stopWalk = {};

var hasOwnProp = Object.prototype.hasOwnProperty;

// Helpers
// -------

function isElement(obj) {
  return !!(obj && obj.nodeType === 1);
}

function isObject(obj) {
  var type = typeof obj;
  return type === 'function' || type === 'object' && !!obj;
}

function each(obj, predicate) {
  for (var k in obj) {
    if (obj.hasOwnProperty(k)) {
      if (predicate(obj[k], k, obj))
        return false;
    }
  }
  return true;
}

// Makes a shallow copy of `arr`, and adds `obj` to the end of the copy.
function copyAndPush(arr, obj) {
  var result = arr.slice();
  result.push(obj);
  return result;
}

// Implements the default traversal strategy: if `obj` is a DOM node, walk
// its DOM children; otherwise, walk all the objects it references.
function defaultTraversal(obj) {
  return isElement(obj) ? obj.children : obj;
}

// Walk the tree recursively beginning with `root`, calling `beforeFunc`
// before visiting an objects descendents, and `afterFunc` afterwards.
// If `collectResults` is true, the last argument to `afterFunc` will be a
// collection of the results of walking the node's subtrees.
function walkImpl(root, traversalStrategy, beforeFunc, afterFunc, context, collectResults) {
  return (function _walk(stack, value, key, parent) {
    if (isObject(value) && stack.indexOf(value) >= 0)
      throw new TypeError('A cycle was detected at ' + value);

    if (beforeFunc) {
      var result = beforeFunc.call(context, value, key, parent);
      if (result === stopWalk) return stopWalk;
      if (result === stopRecursion) return;
    }

    var subResults;
    var target = traversalStrategy(value);

    if (isObject(target) && Object.keys(target).length > 0) {
      // Collect results from subtrees in the same shape as the target.
      if (collectResults) subResults = Array.isArray(target) ? [] : {};

      var ok = each(target, function(obj, key) {
        var result = _walk(copyAndPush(stack, value), obj, key, value);
        if (result === stopWalk) return false;
        if (subResults) subResults[key] = result;
      });
      if (!ok) return stopWalk;
    }
    if (afterFunc) return afterFunc.call(context, value, key, parent, subResults);
  })([], root);
}

// Internal helper providing the implementation for `pluck` and `pluckRec`.
function pluck(obj, propertyName, recursive) {
  var results = [];
  this.preorder(obj, function(value, key) {
    if (!recursive && key == propertyName)
      return stopRecursion;
    if (hasOwnProp.call(value, propertyName))
      results[results.length] = value[propertyName];
  });
  return results;
}

function defineEnumerableProperty(obj, propName, getterFn) {
  Object.defineProperty(obj, propName, {
    enumerable: true,
    get: getterFn
  });
}

// Returns an object containing the walk functions. If `traversalStrategy`
// is specified, it is a function determining how objects should be
// traversed. Given an object, it returns the object to be recursively
// walked. The default strategy is equivalent to `_.identity` for regular
// objects, and for DOM nodes it returns the node's DOM children.
function Walker(traversalStrategy) {
  if (!(this instanceof Walker))
    return new Walker(traversalStrategy);
  this._traversalStrategy = traversalStrategy || defaultTraversal;
}

extend(Walker.prototype, {
  // Performs a preorder traversal of `obj` and returns the first value
  // which passes a truth test.
  find: function(obj, visitor, context) {
    var result;
    this.preorder(obj, function(value, key, parent) {
      if (visitor.call(context, value, key, parent)) {
        result = value;
        return stopWalk;
      }
    }, context);
    return result;
  },

  // Recursively traverses `obj` and returns all the elements that pass a
  // truth test. `strategy` is the traversal function to use, e.g. `preorder`
  // or `postorder`.
  filter: function(obj, strategy, visitor, context) {
    var results = [];
    if (obj === null) return results;
    strategy(obj, function(value, key, parent) {
      if (visitor.call(context, value, key, parent)) results.push(value);
    }, null, this._traversalStrategy);
    return results;
  },

  // Recursively traverses `obj` and returns all the elements for which a
  // truth test fails.
  reject: function(obj, strategy, visitor, context) {
    return this.filter(obj, strategy, function(value, key, parent) {
      return !visitor.call(context, value, key, parent);
    });
  },

  // Produces a new array of values by recursively traversing `obj` and
  // mapping each value through the transformation function `visitor`.
  // `strategy` is the traversal function to use, e.g. `preorder` or
  // `postorder`.
  map: function(obj, strategy, visitor, context) {
    var results = [];
    strategy(obj, function(value, key, parent) {
      results[results.length] = visitor.call(context, value, key, parent);
    }, null, this._traversalStrategy);
    return results;
  },

  // Return the value of properties named `propertyName` reachable from the
  // tree rooted at `obj`. Results are not recursively searched; use
  // `pluckRec` for that.
  pluck: function(obj, propertyName) {
    return pluck.call(this, obj, propertyName, false);
  },

  // Version of `pluck` which recursively searches results for nested objects
  // with a property named `propertyName`.
  pluckRec: function(obj, propertyName) {
    return pluck.call(this, obj, propertyName, true);
  },

  // Recursively traverses `obj` in a depth-first fashion, invoking the
  // `visitor` function for each object only after traversing its children.
  // `traversalStrategy` is intended for internal callers, and is not part
  // of the public API.
  postorder: function(obj, visitor, context, traversalStrategy) {
    traversalStrategy = traversalStrategy || this._traversalStrategy;
    walkImpl(obj, traversalStrategy, null, visitor, context);
  },

  // Recursively traverses `obj` in a depth-first fashion, invoking the
  // `visitor` function for each object before traversing its children.
  // `traversalStrategy` is intended for internal callers, and is not part
  // of the public API.
  preorder: function(obj, visitor, context, traversalStrategy) {
    traversalStrategy = traversalStrategy || this._traversalStrategy;
    walkImpl(obj, traversalStrategy, visitor, null, context);
  },

  // Builds up a single value by doing a post-order traversal of `obj` and
  // calling the `visitor` function on each object in the tree. For leaf
  // objects, the `memo` argument to `visitor` is the value of the `leafMemo`
  // argument to `reduce`. For non-leaf objects, `memo` is a collection of
  // the results of calling `reduce` on the object's children.
  reduce: function(obj, visitor, leafMemo, context) {
    var reducer = function(value, key, parent, subResults) {
      return visitor(subResults || leafMemo, value, key, parent);
    };
    return walkImpl(obj, this._traversalStrategy, null, reducer, context, true);
  },

  // An 'attribute' is a value that is calculated by invoking a visitor
  // function on a node. The first argument of the visitor is a collection
  // of the attribute values for the node's children. These are calculated
  // lazily -- in this way the visitor can decide in what order to visit the
  // subtrees.
  createAttribute: function(visitor, defaultValue, context) {
    var self = this;
    var memo = new WeakMap();
    function _visit(stack, value, key, parent) {
      if (isObject(value) && stack.indexOf(value) >= 0)
        throw new TypeError('A cycle was detected at ' + value);

      if (memo.has(value))
        return memo.get(value);

      var subResults;
      var target = self._traversalStrategy(value);
      if (isObject(target) && Object.keys(target).length > 0) {
        subResults = {};
        each(target, function(child, k) {
          defineEnumerableProperty(subResults, k, function() {
            return _visit(copyAndPush(stack,value), child, k, value);
          });
        });
      }
      var result = visitor.call(context, subResults, value, key, parent);
      memo.set(value, result);
      return result;
    }
    return function(obj) { return _visit([], obj); };
  }
});

var WalkerProto = Walker.prototype;

// Set up a few convenient aliases.
WalkerProto.each = WalkerProto.preorder;
WalkerProto.collect = WalkerProto.map;
WalkerProto.detect = WalkerProto.find;
WalkerProto.select = WalkerProto.filter;

// Export the walker constructor, but make it behave like an instance.
Walker._traversalStrategy = defaultTraversal;
module.exports = extend(Walker, WalkerProto);

},{"./third_party/WeakMap":34,"util-extend":33}],33:[function(require,module,exports){
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

module.exports = extend;
function extend(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || typeof add !== 'object') return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
}

},{}],34:[function(require,module,exports){
/*
 * Copyright 2012 The Polymer Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

if (typeof WeakMap === 'undefined') {
  (function() {
    var defineProperty = Object.defineProperty;
    var counter = Date.now() % 1e9;

    var WeakMap = function() {
      this.name = '__st' + (Math.random() * 1e9 >>> 0) + (counter++ + '__');
    };

    WeakMap.prototype = {
      set: function(key, value) {
        var entry = key[this.name];
        if (entry && entry[0] === key)
          entry[1] = value;
        else
          defineProperty(key, this.name, {value: [key, value], writable: true});
        return this;
      },
      get: function(key) {
        var entry;
        return (entry = key[this.name]) && entry[0] === key ?
            entry[1] : undefined;
      },
      delete: function(key) {
        var entry = key[this.name];
        if (!entry || entry[0] !== key) return false;
        entry[0] = entry[1] = undefined;
        return true;
      },
      has: function(key) {
        var entry = key[this.name];
        if (!entry) return false;
        return entry[0] === key;
      }
    };

    module.exports = WeakMap;
  })();
} else {
  module.exports = WeakMap;
}

},{}],35:[function(require,module,exports){
(function (global){
"use strict";

!(function (e) {
  if ("object" == typeof exports && "undefined" != typeof module) module.exports = e();else if ("function" == typeof define && define.amd) define([], e);else {
    var f;"undefined" != typeof window ? f = window : "undefined" != typeof global ? f = global : "undefined" != typeof self && (f = self), f.pm = e();
  }
})(function () {
  var define, module, exports;return (function e(t, n, r) {
    function s(o, u) {
      if (!n[o]) {
        if (!t[o]) {
          var a = typeof require == "function" && require;if (!u && a) return a(o, !0);if (i) return i(o, !0);var f = new Error("Cannot find module '" + o + "'");throw (f.code = "MODULE_NOT_FOUND", f);
        }var l = n[o] = { exports: {} };t[o][0].call(l.exports, function (e) {
          var n = t[o][1][e];return s(n ? n : e);
        }, l, l.exports, e, t, n, r);
      }return n[o].exports;
    }var i = typeof require == "function" && require;for (var o = 0; o < r.length; o++) s(r[o]);return s;
  })({ 1: [function (_dereq_, module, exports) {
      var iterable = _dereq_("./lib/iterable");
      var isIterable = iterable.isIterable;
      var toArray = iterable.toArray;

      var ArrayProto = Array.prototype;

      // MatchFailure
      // ------------

      function MatchFailure(value, stack) {
        this.value = value;
        this.stack = stack;
      }

      MatchFailure.prototype.toString = function () {
        return "match failure";
      };

      // Pattern
      // -------

      function Pattern() {}

      // Creates a custom Pattern class. If `props` has an 'init' property, it will
      // be called to initialize newly-created instances. All other properties in
      // `props` will be copied to the prototype of the new constructor.
      Pattern.extend = function (props) {
        var proto = ctor.prototype = new Pattern();
        for (var k in props) {
          if (k !== "init" && k != "match") {
            proto[k] = props[k];
          }
        }
        ensure(typeof props.match === "function", "Patterns must have a 'match' method");
        proto._match = props.match;

        function ctor() {
          var self = this;
          if (!(self instanceof ctor)) {
            self = Object.create(proto);
          }
          if ("init" in props) {
            props.init.apply(self, ArrayProto.slice.call(arguments));
          }
          ensure(typeof self.arity === "number", "Patterns must have an 'arity' property");
          return self;
        }
        ctor.fromArray = function (arr) {
          return ctor.apply(null, arr);
        };
        return ctor;
      };

      // Expose some useful functions as instance methods on Pattern.
      Pattern.prototype.performMatch = performMatch;
      Pattern.prototype.getArity = getArity;

      // Wraps the user-specified `match` function with some extra checks.
      Pattern.prototype.match = function (value, bindings) {
        var bs = [];
        var ans = this._match(value, bs);
        if (ans) {
          ensure(bs.length === this.arity, "Inconsistent pattern arity: expected " + this.arity + ", actual " + bs.length);
          bindings.push.apply(bindings, bs);
        }
        return ans;
      };

      // Types of pattern
      // ----------------

      Matcher.is = Pattern.extend({
        init: function (expectedValue) {
          this.expectedValue = expectedValue;
        },
        arity: 0,
        match: function (value, bindings) {
          return _equalityMatch(value, this.expectedValue, bindings);
        }
      });

      Matcher.iterable = Pattern.extend({
        init: function () {
          this.patterns = ArrayProto.slice.call(arguments);
          this.arity = this.patterns.map(function (pattern) {
            return getArity(pattern);
          }).reduce(function (a1, a2) {
            return a1 + a2;
          }, 0);
        },
        match: function (value, bindings) {
          return isIterable(value) ? _arrayMatch(toArray(value), this.patterns, bindings) : false;
        }
      });

      Matcher.many = Pattern.extend({
        init: function (pattern) {
          this.pattern = pattern;
        },
        arity: 1,
        match: function (value, bindings) {
          throw new Error("'many' pattern used outside array pattern");
        }
      });

      Matcher.opt = Pattern.extend({
        init: function (pattern) {
          this.pattern = pattern;
        },
        arity: 1,
        match: function (value, bindings) {
          throw new Error("'opt' pattern used outside array pattern");
        }
      });

      Matcher.trans = Pattern.extend({
        init: function (pattern, func) {
          this.pattern = pattern;
          this.func = func;
          ensure(typeof func === "function" && func.length === getArity(pattern), "func must be a " + getArity(pattern) + "-argument function");
        },
        arity: 1,
        match: function (value, bindings) {
          var bs = [];
          if (performMatch(value, this.pattern, bs)) {
            var ans = this.func.apply(this.thisObj, bs);
            bindings.push(ans);
            return true;
          }
          return false;
        }
      });

      Matcher.when = Pattern.extend({
        init: function (pattern, predicate) {
          this.pattern = pattern;
          this.predicate = predicate;
          this.arity = getArity(pattern);
          ensure(typeof predicate === "function" && predicate.length === this.arity, "predicate must be a " + this.arity + "-argument function");
        },
        match: function (value, bindings) {
          var bs = [];
          if (performMatch(value, this.pattern, bs) && this.predicate.apply(this.thisObj, bs)) {
            bindings.push.apply(bindings, bs);
            return true;
          }
          return false;
        }
      });

      Matcher.or = Pattern.extend({
        init: function () {
          ensure(arguments.length >= 1, "'or' requires at least one pattern");
          this.patterns = ArrayProto.slice.call(arguments);
          this.arity = ensureUniformArity(this.patterns, "or");
        },
        match: function (value, bindings) {
          var patterns = this.patterns;
          var ans = false;
          for (var idx = 0; idx < patterns.length && !ans; idx++) {
            ans = performMatch(value, patterns[idx], bindings);
          }
          return ans;
        } });

      Matcher.and = Pattern.extend({
        init: function () {
          ensure(arguments.length >= 1, "'and' requires at least one pattern");
          this.patterns = ArrayProto.slice.call(arguments);
          this.arity = this.patterns.reduce(function (sum, p) {
            return sum + getArity(p);
          }, 0);
        },
        match: function (value, bindings) {
          var patterns = this.patterns;
          var ans = true;
          for (var idx = 0; idx < patterns.length && ans; idx++) {
            ans = performMatch(value, patterns[idx], bindings);
          }
          return ans;
        }
      });

      // Helpers
      // -------

      function _arrayMatch(value, pattern, bindings) {
        if (!Array.isArray(value)) {
          return false;
        }
        var vIdx = 0;
        var pIdx = 0;
        while (pIdx < pattern.length) {
          var p = pattern[pIdx++];
          if (p instanceof Matcher.many) {
            p = p.pattern;
            var vs = [];
            while (vIdx < value.length && performMatch(value[vIdx], p, vs)) {
              vIdx++;
            }
            bindings.push(vs);
          } else if (p instanceof Matcher.opt) {
            var ans = vIdx < value.length ? performMatch(value[vIdx], p.pattern, []) : false;
            if (ans) {
              bindings.push(ans);
              vIdx++;
            } else {
              bindings.push(undefined);
            }
          } else if (performMatch(value[vIdx], p, bindings)) {
            vIdx++;
          } else {
            return false;
          }
        }
        return vIdx === value.length && pIdx === pattern.length;
      }

      function _objMatch(value, pattern, bindings) {
        for (var k in pattern) {
          if (pattern.hasOwnProperty(k) && !(k in value) || !performMatch(value[k], pattern[k], bindings)) {
            return false;
          }
        }
        return true;
      }

      function _functionMatch(value, func, bindings) {
        if (func(value)) {
          bindings.push(value);
          return true;
        }
        return false;
      }

      function _equalityMatch(value, pattern, bindings) {
        return value === pattern;
      }

      function _regExpMatch(value, pattern, bindings) {
        var ans = pattern.exec(value);
        if (ans !== null && ans[0] === value) {
          bindings.push(ans);
          return true;
        }
        return false;
      }

      function performMatch(value, pattern, bindings) {
        if (pattern instanceof Pattern) {
          return pattern.match(value, bindings);
        } else if (Array.isArray(pattern)) {
          return _arrayMatch(value, pattern, bindings);
        } else if (pattern instanceof RegExp) {
          return _regExpMatch(value, pattern, bindings);
        } else if (typeof pattern === "object" && pattern !== null) {
          return _objMatch(value, pattern, bindings);
        } else if (typeof pattern === "function") {
          return _functionMatch(value, pattern, bindings);
        }
        return _equalityMatch(value, pattern, bindings);
      }

      function getArity(pattern) {
        if (pattern instanceof Pattern) {
          return pattern.arity;
        } else if (Array.isArray(pattern)) {
          return pattern.map(function (p) {
            return getArity(p);
          }).reduce(function (a1, a2) {
            return a1 + a2;
          }, 0);
        } else if (pattern instanceof RegExp) {
          return 1;
        } else if (typeof pattern === "object" && pattern !== null) {
          var ans = 0;
          for (var k in pattern) {
            if (pattern.hasOwnProperty(k)) {
              ans += getArity(pattern[k]);
            }
          }
          return ans;
        } else if (typeof pattern === "function") {
          return 1;
        }
        return 0;
      }

      function ensureUniformArity(patterns, op) {
        var result = getArity(patterns[0]);
        for (var idx = 1; idx < patterns.length; idx++) {
          var a = getArity(patterns[idx]);
          if (a !== result) {
            throw new Error(op + ": expected arity " + result + " at index " + idx + ", got " + a);
          }
        }
        return result;
      }

      function ensure(cond, message) {
        if (!cond) {
          throw new Error(message);
        }
      }

      // Matcher
      // -------

      function Matcher() {
        this.patterns = [];
        this.thisObj = undefined;
      }

      Matcher.prototype.withThis = function (obj) {
        this.thisObj = obj;
        return this;
      };

      Matcher.prototype.addCase = function (pattern, optFunc) {
        this.patterns.push(Matcher.trans(pattern, optFunc));
        return this;
      };

      Matcher.prototype.match = function (value) {
        ensure(this.patterns.length > 0, "Matcher requires at least one case");

        var bindings = [];
        if (Matcher.or.fromArray(this.patterns).match(value, bindings)) {
          return bindings[0];
        }
        throw new MatchFailure(value, new Error().stack);
      };

      Matcher.prototype.toFunction = function () {
        var self = this;
        return function (value) {
          return self.match(value);
        };
      };

      // Primitive patterns

      Matcher._ = function (x) {
        return true;
      };
      Matcher.bool = function (x) {
        return typeof x === "boolean";
      };
      Matcher.number = function (x) {
        return typeof x === "number";
      };
      Matcher.string = function (x) {
        return typeof x === "string";
      };
      Matcher.char = function (x) {
        return typeof x === "string" && x.length === 0;
      };

      // Operators

      Matcher.instanceOf = function (clazz) {
        return function (x) {
          return x instanceof clazz;
        };
      };

      Matcher.MatchFailure = MatchFailure;

      // Terse interface
      // ---------------

      function match(value /* , pat1, fun1, pat2, fun2, ... */) {
        var args = arguments;

        // When called with just a value and a pattern, return the bindings if
        // the match was successful, otherwise null.
        if (args.length === 2) {
          var bindings = [];
          if (performMatch(value, arguments[1], bindings)) {
            return bindings;
          }
          return null;
        }

        ensure(args.length > 2 && args.length % 2 === 1, "match called with invalid arguments");
        var m = new Matcher();
        for (var idx = 1; idx < args.length; idx += 2) {
          var pattern = args[idx];
          var func = args[idx + 1];
          m.addCase(pattern, func);
        }
        return m.match(value);
      }

      // Exports
      // -------

      module.exports = {
        Matcher: Matcher,
        match: match,
        Pattern: Pattern
      };
    }, { "./lib/iterable": 2 }], 2: [function (_dereq_, module, exports) {
      /* global Symbol */

      var ITERATOR_SYMBOL = typeof Symbol === "function" && Symbol.iterator;
      var FAKE_ITERATOR_SYMBOL = "@@iterator";

      var toString = Object.prototype.toString;

      // Helpers
      // -------

      function isString(obj) {
        return toString.call(obj) === "[object String]";
      }

      function isNumber(obj) {
        return toString.call(obj) === "[object Number]";
      }

      function isArrayLike(obj) {
        return isNumber(obj.length) && !isString(obj);
      }

      // ArrayIterator
      // -------------

      function ArrayIterator(iteratee) {
        this._iteratee = iteratee;
        this._i = 0;
        this._len = iteratee.length;
      }

      ArrayIterator.prototype.next = function () {
        if (this._i < this._len) {
          return { done: false, value: this._iteratee[this._i++] };
        }
        return { done: true };
      };

      ArrayIterator.prototype[FAKE_ITERATOR_SYMBOL] = function () {
        return this;
      };

      if (ITERATOR_SYMBOL) {
        ArrayIterator.prototype[ITERATOR_SYMBOL] = function () {
          return this;
        };
      }

      // Exports
      // -------

      // Returns an iterator (an object that has a next() method) for `obj`.
      // First, it tries to use the ES6 iterator protocol (Symbol.iterator).
      // It falls back to the 'fake' iterator protocol ('@@iterator') that is
      // used by some libraries (e.g. immutable-js). Finally, if the object has
      // a numeric `length` property and is not a string, it is treated as an Array
      // to be iterated using an ArrayIterator.
      function getIterator(obj) {
        if (!obj) {
          return;
        }
        if (ITERATOR_SYMBOL && typeof obj[ITERATOR_SYMBOL] === "function") {
          return obj[ITERATOR_SYMBOL]();
        }
        if (typeof obj[FAKE_ITERATOR_SYMBOL] === "function") {
          return obj[FAKE_ITERATOR_SYMBOL]();
        }
        if (isArrayLike(obj)) {
          return new ArrayIterator(obj);
        }
      }

      function isIterable(obj) {
        if (obj) {
          return ITERATOR_SYMBOL && typeof obj[ITERATOR_SYMBOL] === "function" || typeof obj[FAKE_ITERATOR_SYMBOL] === "function" || isArrayLike(obj);
        }
        return false;
      }

      function toArray(iterable) {
        var iter = getIterator(iterable);
        if (iter) {
          var result = [];
          var next;
          while (!(next = iter.next()).done) {
            result.push(next.value);
          }
          return result;
        }
      }

      module.exports = {
        getIterator: getIterator,
        isIterable: isIterable,
        toArray: toArray
      };
    }, {}] }, {}, [1])(1);
});

/* pattern, ... */ /* p1, p2, ... */ /* p1, p2, ... */

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],36:[function(require,module,exports){
(function (global){
"use strict";

// Based on https://github.com/Polymer/WeakMap/blob/c4685a9e3a579c253ccf8e7379c047c3a1f99106/weakmap.js

/*
 * Copyright 2012 The Polymer Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

if (typeof WeakMap === "undefined") {
  (function () {
    var defineProperty = Object.defineProperty;
    var counter = Date.now() % 1000000000;

    var WeakMap = function () {
      this.name = "__st" + (Math.random() * 1000000000 >>> 0) + (counter++ + "__");
    };

    WeakMap.prototype = {
      set: function (key, value) {
        var entry = key[this.name];
        if (entry && entry[0] === key) entry[1] = value;else defineProperty(key, this.name, { value: [key, value], writable: true });
        return this;
      },
      get: function (key) {
        var entry;
        return (entry = key[this.name]) && entry[0] === key ? entry[1] : undefined;
      },
      "delete": function (key) {
        var entry = key[this.name];
        if (!entry) return false;
        var hasValue = entry[0] === key;
        entry[0] = entry[1] = undefined;
        return hasValue;
      },
      has: function (key) {
        var entry = key[this.name];
        if (!entry) return false;
        return entry[0] === key;
      }
    };

    (typeof window === "undefined" ? global : window).WeakMap = WeakMap;
  })();
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],37:[function(require,module,exports){
"use strict";

require("6to5/polyfill");
require("6to5/register");

module.exports = {
  Vat: require("./lib/vat"),
  match: {
    ANY: require("./third_party/pattern-match").Matcher._
  }
};

},{"./lib/vat":2,"./third_party/pattern-match":35,"6to5/polyfill":23,"6to5/register":24}]},{},[37])(37)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9saWIvZ2VuZXJhdG9yLXV0aWwuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9saWIvdmF0LmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbGliLzZ0bzUvcG9seWZpbGwuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvNnRvNS9saWIvNnRvNS90cmFuc2Zvcm1hdGlvbi90cmFuc2Zvcm1lcnMvZXM2LWdlbmVyYXRvcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc2hpbS9lczYtc2hpbS5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc3ltYm9sL2ltcGxlbWVudC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc3ltYm9sL2lzLWltcGxlbWVudGVkLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbm9kZV9tb2R1bGVzL2VzNi1zeW1ib2wvbm9kZV9tb2R1bGVzL2QvaW5kZXguanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvNnRvNS9ub2RlX21vZHVsZXMvZXM2LXN5bWJvbC9ub2RlX21vZHVsZXMvZXM1LWV4dC9nbG9iYWwuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvNnRvNS9ub2RlX21vZHVsZXMvZXM2LXN5bWJvbC9ub2RlX21vZHVsZXMvZXM1LWV4dC9vYmplY3QvYXNzaWduL2luZGV4LmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbm9kZV9tb2R1bGVzL2VzNi1zeW1ib2wvbm9kZV9tb2R1bGVzL2VzNS1leHQvb2JqZWN0L2Fzc2lnbi9pcy1pbXBsZW1lbnRlZC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc3ltYm9sL25vZGVfbW9kdWxlcy9lczUtZXh0L29iamVjdC9hc3NpZ24vc2hpbS5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc3ltYm9sL25vZGVfbW9kdWxlcy9lczUtZXh0L29iamVjdC9pcy1jYWxsYWJsZS5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc3ltYm9sL25vZGVfbW9kdWxlcy9lczUtZXh0L29iamVjdC9rZXlzL2luZGV4LmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbm9kZV9tb2R1bGVzL2VzNi1zeW1ib2wvbm9kZV9tb2R1bGVzL2VzNS1leHQvb2JqZWN0L2tleXMvaXMtaW1wbGVtZW50ZWQuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvNnRvNS9ub2RlX21vZHVsZXMvZXM2LXN5bWJvbC9ub2RlX21vZHVsZXMvZXM1LWV4dC9vYmplY3Qva2V5cy9zaGltLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbm9kZV9tb2R1bGVzL2VzNi1zeW1ib2wvbm9kZV9tb2R1bGVzL2VzNS1leHQvb2JqZWN0L25vcm1hbGl6ZS1vcHRpb25zLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbm9kZV9tb2R1bGVzL2VzNi1zeW1ib2wvbm9kZV9tb2R1bGVzL2VzNS1leHQvb2JqZWN0L3ZhbGlkLXZhbHVlLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbm9kZV9tb2R1bGVzL2VzNi1zeW1ib2wvbm9kZV9tb2R1bGVzL2VzNS1leHQvc3RyaW5nLyMvY29udGFpbnMvaW5kZXguanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvNnRvNS9ub2RlX21vZHVsZXMvZXM2LXN5bWJvbC9ub2RlX21vZHVsZXMvZXM1LWV4dC9zdHJpbmcvIy9jb250YWlucy9pcy1pbXBsZW1lbnRlZC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc3ltYm9sL25vZGVfbW9kdWxlcy9lczUtZXh0L3N0cmluZy8jL2NvbnRhaW5zL3NoaW0uanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvNnRvNS9ub2RlX21vZHVsZXMvZXM2LXN5bWJvbC9wb2x5ZmlsbC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L3BvbHlmaWxsLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbGliL19lbXB0eS5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9hc3NlcnQvYXNzZXJ0LmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvaW1tdXRhYmxlL2Rpc3QvaW1tdXRhYmxlLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzL3RyZWUtd2Fsay9pbmRleC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy90cmVlLXdhbGsvbm9kZV9tb2R1bGVzL3V0aWwtZXh0ZW5kL2V4dGVuZC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy90cmVlLXdhbGsvdGhpcmRfcGFydHkvV2Vha01hcC9pbmRleC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL3RoaXJkX3BhcnR5L3BhdHRlcm4tbWF0Y2guanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS90aGlyZF9wYXJ0eS93ZWFrbWFwLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztBQ0dBLFNBQVMsT0FBTyxDQUFDLEdBQUcsRUFBRTtBQUNwQixNQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7dUJBQ0YsR0FBRztRQUFSLENBQUM7QUFDUixVQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7QUFFakIsU0FBTyxNQUFNLENBQUM7Q0FDZjs7QUFFRCxNQUFNLENBQUMsT0FBTyxHQUFHO0FBQ2YsU0FBTyxFQUFQLE9BQU87O0FBRVAsTUFBSSxFQUFBLGNBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUU7eUJBQ2QsR0FBRztVQUFSLENBQUM7QUFDUixVQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUM1QixPQUFPLENBQUMsQ0FBQzs7R0FFZDtBQUNELFFBQU0sRUFBQSxnQkFBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLE9B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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsY0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzkrREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTs7QUNEQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVrQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6aUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDL0NBLENBQUMsQ0FBQSxVQUFTLENBQUMsRUFBQztBQUFDLE1BQUcsUUFBUSxJQUFFLE9BQU8sT0FBTyxJQUFFLFdBQVcsSUFBRSxPQUFPLE1BQU0sRUFBQyxNQUFNLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBRyxVQUFVLElBQUUsT0FBTyxNQUFNLElBQUUsTUFBTSxDQUFDLEdBQUcsRUFBQyxNQUFNLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUk7QUFBQyxRQUFJLENBQUMsQ0FBQyxXQUFXLElBQUUsT0FBTyxNQUFNLEdBQUMsQ0FBQyxHQUFDLE1BQU0sR0FBQyxXQUFXLElBQUUsT0FBTyxNQUFNLEdBQUMsQ0FBQyxHQUFDLE1BQU0sR0FBQyxXQUFXLElBQUUsT0FBTyxJQUFJLEtBQUcsQ0FBQyxHQUFDLElBQUksQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLEVBQUUsQ0FBQTtHQUFDO0NBQUMsQ0FBQSxDQUFDLFlBQVU7QUFBQyxNQUFJLE1BQU0sRUFBQyxNQUFNLEVBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsWUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLGNBQUksQ0FBQyxHQUFDLE9BQU8sT0FBTyxJQUFFLFVBQVUsSUFBRSxPQUFPLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxLQUFLLENBQUMsc0JBQXNCLEdBQUMsQ0FBQyxHQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU0sQ0FBQyxDQUFDLElBQUksR0FBQyxrQkFBa0IsRUFBQyxDQUFDLENBQUEsQ0FBQTtTQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFDLE9BQU8sRUFBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxjQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQTtTQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUE7S0FBQyxJQUFJLENBQUMsR0FBQyxPQUFPLE9BQU8sSUFBRSxVQUFVLElBQUUsT0FBTyxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMs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QUssQ0FBQztBQUN6QixZQUFJLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDO0FBQ2hDLGFBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDO0FBQ2hDLGVBQU8sUUFBUSxDQUFDO09BQ2pCO0FBQ0QsU0FBRyxFQUFFLFVBQVMsR0FBRyxFQUFFO0FBQ2pCLFlBQUksS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDM0IsWUFBSSxDQUFDLEtBQUssRUFBRSxPQUFPLEtBQUssQ0FBQztBQUN6QixlQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUM7T0FDekI7S0FDRixDQUFDOztBQUVGLEtBQUMsT0FBTyxNQUFNLEtBQUssV0FBVyxHQUFHLE1BQU0sR0FBRyxNQUFNLENBQUEsQ0FBRSxPQUFPLEdBQUcsT0FBTyxDQUFDO0dBQ3JFLENBQUEsRUFBRyxDQUFDO0NBQ047Ozs7Ozs7Ozs7O0FDekNDO0FBQ0E7QUFDQyxPQUFHLEVBQUUsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoganNoaW50IGVzbmV4dDogdHJ1ZSAqL1xuXG4vLyBSZXR1cm4gYW4gQXJyYXkgd2l0aCBhbGwgdGhlIHZhbHVlcyBmcm9tIGBnZW5gLlxuZnVuY3Rpb24gdG9BcnJheShnZW4pIHtcbiAgdmFyIHJlc3VsdCA9IFtdO1xuICBmb3IgKHZhciB4IG9mIGdlbikge1xuICAgIHJlc3VsdC5wdXNoKHgpO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICB0b0FycmF5LFxuICAvLyBSZXR1cm4gdGhlIGZpcnN0IHZhbHVlIGZyb20gYGdlbmAgdGhhdCBwYXNzZXMgYSB0cnV0aCB0ZXN0LlxuICBmaW5kKGdlbiwgcHJlZGljYXRlLCB0aGlzQXJnKSB7XG4gICAgZm9yICh2YXIgeCBvZiBnZW4pIHtcbiAgICAgIGlmIChwcmVkaWNhdGUuY2FsbCh0aGlzQXJnLCB4KSlcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9LFxuICBmaWx0ZXIoZ2VuLCBwcmVkaWNhdGUsIHRoaXNBcmcpIHtcbiAgICByZXR1cm4gdG9BcnJheShnZW4pLmZpbHRlcihwcmVkaWNhdGUsIHRoaXNBcmcpO1xuICB9LFxuICAvLyBSZXR1cm4gdGhlIGZpcnN0IHZhbHVlIGZyb20gYGdlbmAuXG4gIGZpcnN0KGdlbikge1xuICAgIHJldHVybiBnZW4ubmV4dCgpLnZhbHVlO1xuICB9XG59O1xuIiwiLyoganNoaW50IGVzbmV4dDogdHJ1ZSAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKSxcbiAgICBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXIsXG4gICAgSW1tdXRhYmxlID0gcmVxdWlyZSgnaW1tdXRhYmxlJyksXG4gICAgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKSxcbiAgICB3YWxrID0gcmVxdWlyZSgndHJlZS13YWxrJyk7XG5cbnZhciBwbSA9IHJlcXVpcmUoJy4uL3RoaXJkX3BhcnR5L3BhdHRlcm4tbWF0Y2gnKSxcbiAgICBndSA9IHJlcXVpcmUoJy4vZ2VuZXJhdG9yLXV0aWwnKTtcbnJlcXVpcmUoJy4uL3RoaXJkX3BhcnR5L3dlYWttYXAuanMnKTtcblxudmFyIG1hdGNoID0gcG0ubWF0Y2gsXG4gICAgUGF0dGVybiA9IHBtLlBhdHRlcm47XG5cbnZhciBSZWFjdGlvbiA9IEltbXV0YWJsZS5SZWNvcmQoeyBwYXR0ZXJuOiBudWxsLCBjYWxsYmFjazogbnVsbCB9LCAnUmVhY3Rpb24nKTtcbnZhciBPYnNlcnZlciA9IEltbXV0YWJsZS5SZWNvcmQoeyBwYXR0ZXJuOiBudWxsLCBjYWxsYmFjazogbnVsbCB9LCAnT2JzZXJ2ZXInKTtcblxuLy8gQ3VzdG9tIHdhbGtlciBmb3Igd2Fsa2luZyBpbW11dGFibGUtanMgb2JqZWN0cy5cbnZhciBpbW11dGFibGVXYWxrZXIgPSB3YWxrKGZ1bmN0aW9uKG5vZGUpIHtcbiAgcmV0dXJuIEltbXV0YWJsZS5JdGVyYWJsZS5pc0l0ZXJhYmxlKG5vZGUpID8gbm9kZS50b0pTKCkgOiBub2RlO1xufSk7XG5cbi8vIEN1c3RvbSBwYXR0ZXJuIGZvciBtYXRjaGluZyBJbW11dGFibGUuTWFwIGFuZCBJbW11dGFibGUuUmVjb3JkIG9iamVjdHMuXG52YXIgaW1tdXRhYmxlT2JqID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbihvYmpQYXR0ZXJuLCBjdG9yKSB7XG4gICAgdGhpcy5vYmpQYXR0ZXJuID0gb2JqUGF0dGVybjtcbiAgICB0aGlzLmN0b3IgPSBjdG9yIHx8IEltbXV0YWJsZS5NYXA7XG4gICAgdGhpcy5hcml0eSA9IHRoaXMuZ2V0QXJpdHkob2JqUGF0dGVybik7XG4gIH0sXG4gIG1hdGNoOiBmdW5jdGlvbih2YWx1ZSwgYmluZGluZ3MpIHtcbiAgICByZXR1cm4gKHZhbHVlIGluc3RhbmNlb2YgdGhpcy5jdG9yICYmXG4gICAgICAgICAgICB0aGlzLnBlcmZvcm1NYXRjaCh2YWx1ZS50b09iamVjdCgpLCB0aGlzLm9ialBhdHRlcm4sIGJpbmRpbmdzKSk7XG4gIH1cbn0pO1xuXG4vLyBDdXN0b20gcGF0dGVybiBmb3IgbWF0Y2hpbmcgSW1tdXRhYmxlLkxpc3Qgb2JqZWN0cy5cbnZhciBpbW11dGFibGVMaXN0ID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbihhcnJQYXR0ZXJuKSB7XG4gICAgdGhpcy5hcnJQYXR0ZXJuID0gYXJyUGF0dGVybjtcbiAgICB0aGlzLmFyaXR5ID0gdGhpcy5nZXRBcml0eShhcnJQYXR0ZXJuKTtcbiAgfSxcbiAgbWF0Y2g6IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICAgIHJldHVybiAoSW1tdXRhYmxlLkxpc3QuaXNMaXN0KHZhbHVlKSAmJlxuICAgICAgICAgICAgdGhpcy5wZXJmb3JtTWF0Y2godmFsdWUudG9BcnJheSgpLCB0aGlzLmFyclBhdHRlcm4sIGJpbmRpbmdzKSk7XG4gIH1cbn0pO1xuXG4vLyBBIHBhdHRlcm4gdHlwZSB3aGljaCBhbGxvd3MgcmVzdHJpY3RlZCBtYXRjaGluZyBvbiBSZWFjdGlvbnMuXG52YXIgcmVhY3Rpb24gPSBQYXR0ZXJuLmV4dGVuZCh7XG4gIGluaXQ6IGZ1bmN0aW9uKHIpIHtcbiAgICB0aGlzLnJlYWN0aW9uID0gcjtcbiAgfSxcbiAgbWF0Y2g6IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICAgIHZhciByID0gdGhpcy5yZWFjdGlvbjtcbiAgICAvLyBPbmx5IG1hdGNoIGlmIHRoZSBwYXR0ZXJuIGFuZCB0aGUgY2FsbGJhY2sgYXJlIGlkZW50aWNhbC4gTW9yZSBnZW5lcmFsXG4gICAgLy8gbWF0Y2hpbmcgb24gcmVhY3Rpb25zIG5lZWRzIG1vcmUgdGhvdWdodC5cbiAgICByZXR1cm4gKCh2YWx1ZSBpbnN0YW5jZW9mIFJlYWN0aW9uIHx8IHZhbHVlIGluc3RhbmNlb2YgT2JzZXJ2ZXIpICYmXG4gICAgICAgICAgICB2YWx1ZS5wYXR0ZXJuID09PSByLnBhdHRlcm4gJiYgdmFsdWUuY2FsbGJhY2sgPT09IHIuY2FsbGJhY2spO1xuICB9LFxuICBhcml0eTogMFxufSk7XG5cbi8vIFByaXZhdGUgaGVscGVyc1xuLy8gLS0tLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIGNvbnZlcnRQYXR0ZXJuKHApIHtcbiAgcmV0dXJuIGltbXV0YWJsZVdhbGtlci5yZWR1Y2UocCwgZnVuY3Rpb24obWVtbywgbm9kZSwga2V5LCBwYXJlbnQpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShub2RlKSlcbiAgICAgIHJldHVybiBpbW11dGFibGVMaXN0KG1lbW8gfHwgW10pO1xuICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgIHJldHVybiBub2RlO1xuICAgIGlmIChub2RlIGluc3RhbmNlb2YgUmVhY3Rpb24gfHwgbm9kZSBpbnN0YW5jZW9mIE9ic2VydmVyKVxuICAgICAgcmV0dXJuIHJlYWN0aW9uKG5vZGUpO1xuICAgIGlmIChub2RlIGluc3RhbmNlb2YgSW1tdXRhYmxlLlJlY29yZClcbiAgICAgIHJldHVybiBpbW11dGFibGVPYmoobWVtbyB8fCB7fSwgbm9kZS5jb25zdHJ1Y3Rvcik7XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBPYmplY3QpXG4gICAgICByZXR1cm4gaW1tdXRhYmxlT2JqKG1lbW8gfHwge30pO1xuICAgIGFzc2VydCghbWVtbyk7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiogZ2V0TWF0Y2hlcyhhcnIsIHBhdHRlcm4pIHtcbiAgdmFyIHAgPSBjb252ZXJ0UGF0dGVybihwYXR0ZXJuKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIuc2l6ZTsgKytpKSB7XG4gICAgaWYgKG1hdGNoKGFyci5nZXQoaSkudmFsdWUsIHApICE9PSBudWxsKVxuICAgICAgeWllbGQgaTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kKGFyciwgcGF0dGVybikge1xuICB2YXIgcmVzdWx0ID0gZ3UuZmlyc3QoZ2V0TWF0Y2hlcyhhcnIsIHBhdHRlcm4pKTtcbiAgcmV0dXJuIHJlc3VsdCA9PT0gdW5kZWZpbmVkID8gLTEgOiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uKiBnZXREZWVwTWF0Y2hlcyhhcnIsIHBhdHRlcm4pIHtcbiAgdmFyIHAgPSBjb252ZXJ0UGF0dGVybihwYXR0ZXJuKTtcbiAgdmFyIHBhdGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLnNpemU7ICsraSkge1xuICAgIHBhdGggPSBbaV07XG4gICAgdmFyIHJvb3QgPSBhcnIuZ2V0KGkpLnZhbHVlO1xuICAgIGZvciAodmFyIGJpbmRpbmdzIG9mIG1hdGNoRGVlcChyb290LCBwLCBwYXRoKSkge1xuICAgICAgdmFyIHJvb3RQYXRoID0gcGF0aC5zbGljZSgxKTtcbiAgICAgIHlpZWxkIHtpbmRleDogcGF0aFswXSwgcm9vdDogcm9vdCwgcGF0aDogcm9vdFBhdGgsIGJpbmRpbmdzOiBiaW5kaW5nc307XG4gICAgfVxuICB9XG59XG5cbi8vIFJlY3Vyc2l2ZWx5IHRyaWVzIHRvIG1hdGNoIGBvYmpgIHdpdGggYHBhdHRlcm5gLlxuZnVuY3Rpb24qIG1hdGNoRGVlcChvYmosIHBhdHRlcm4sIHBhdGgpIHtcbiAgdmFyIHJlc3VsdDtcbiAgaWYgKChyZXN1bHQgPSBtYXRjaChvYmosIHBhdHRlcm4pKSAhPSBudWxsKSB7XG4gICAgeWllbGQgcmVzdWx0O1xuICB9IGVsc2Uge1xuICAgIHZhciBpc0xpc3QgPSBvYmogJiYgSW1tdXRhYmxlLkxpc3QuaXNMaXN0KG9iaik7XG4gICAgdmFyIGlzTWFwID0gb2JqICYmIEltbXV0YWJsZS5NYXAuaXNNYXAob2JqKTtcblxuICAgIGlmIChpc0xpc3QgfHwgaXNNYXApIHtcbiAgICAgIGZvciAodmFyIGVudHJ5IG9mIG9iai5lbnRyaWVzKCkpIHtcbiAgICAgICAgcGF0aC5wdXNoKGVudHJ5WzBdKTtcbiAgICAgICAgeWllbGQqIG1hdGNoRGVlcChlbnRyeVsxXSwgcGF0dGVybiwgcGF0aCk7XG4gICAgICAgIHBhdGgucG9wKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8vIFJldHVybiB0cnVlIGlmIGByMWAsIGFuZCBgcjJgIGFyZSBjb25mbGljdGluZyByZWFjdGlvbnMsIG90aGVyd2lzZSBmYWxzZS5cbi8vIEZvciBjb252ZW5pZW5jZSwgZWl0aGVyIGFyZ3VtZW50IC0tIG9yIGJvdGggLS0gbWF5IGJlIHVuZGVmaW5lZCBvciBudWxsLlxuZnVuY3Rpb24gYXJlUmVhY3Rpb25zQ29uZmxpY3RpbmcocjEsIHIyKSB7XG4gIHJldHVybiByMSAmJiByMiAmJiAocjEuX25hbWUgPT09ICdSZWFjdGlvbicgfHwgcjIuX25hbWUgPT09ICdSZWFjdGlvbicpO1xufVxuXG4vLyBWYXQgaW1wbGVtZW50YXRpb25cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBBIFZhdCBpcyBhIHR1cGxlLXNwYWNlIGxpa2UgdGhpbmcuIEV2ZW50dWFsbHksIEknZCBsaWtlIHRvIHN1cHBvcnQgb2JqZWN0c1xuLy8gYW5kIG5vdCBqdXN0IHR1cGxlcywgYW5kICdvYmplY3Qgc3BhY2UnIGlzIHN1Y2ggYSBib3JpbmcgbmFtZS5cbmZ1bmN0aW9uIFZhdCgpIHtcbiAgdGhpcy5faW5pdCgpO1xuXG4gIC8vIFN0b3JlIHRoaXMgVmF0J3MgaGlzdG9yeSBpbiBhIFZhdCwgYnV0IHN0b3AgdGhlIHJlY3Vyc2lvbiB0aGVyZSAtLSBkb24ndFxuICAvLyBrZWVwIGEgaGlzdG9yeSBvZiB0aGUgaGlzdG9yeS5cbiAgdGhpcy5faGlzdG9yeSA9IE9iamVjdC5jcmVhdGUoVmF0LnByb3RvdHlwZSk7XG4gIHRoaXMuX2hpc3RvcnkuX2luaXQoKTtcbiAgdGhpcy5faGlzdG9yeS5wdXQodGhpcy5fc3RvcmUpO1xufVxuXG51dGlsLmluaGVyaXRzKFZhdCwgRXZlbnRFbWl0dGVyKTtcblxuVmF0LnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9zdG9yZSA9IEltbXV0YWJsZS5MaXN0KCk7XG4gIHRoaXMuX3dhaXRpbmcgPSBbXTtcbiAgdGhpcy5fcmVhY3Rpb25zID0gW107XG4gIHRoaXMuX29ic2VydmVycyA9IFtdO1xufTtcblxuVmF0LnByb3RvdHlwZS5fdXBkYXRlU3RvcmUgPSBmdW5jdGlvbih1cGRhdGVGbikge1xuICB0aGlzLl9zdG9yZSA9IHVwZGF0ZUZuLmNhbGwodGhpcyk7XG4gIGlmICh0aGlzLl9oaXN0b3J5KSB7XG4gICAgdGhpcy5faGlzdG9yeS5wdXQodGhpcy5fc3RvcmUpO1xuXG4gICAgLy8gVE9ETzogR2V0IHJpZCBvZiBjaGFuZ2UgZXZlbnRzIGVudGlyZWx5LlxuICAgIHRoaXMuZW1pdCgnY2hhbmdlJyk7XG4gIH1cbn07XG5cblZhdC5wcm90b3R5cGUuX2RvV2l0aG91dEhpc3RvcnkgPSBmdW5jdGlvbihmbikge1xuICB2YXIgaGlzdCA9IHRoaXMuX2hpc3Rvcnk7XG4gIHRoaXMuX2hpc3RvcnkgPSBudWxsO1xuICB0cnkge1xuICAgIHJldHVybiBmbi5jYWxsKHRoaXMpO1xuICB9IGZpbmFsbHkge1xuICAgIHRoaXMuX2hpc3RvcnkgPSBoaXN0O1xuICB9XG59O1xuXG5WYXQucHJvdG90eXBlLl90cnkgPSBmdW5jdGlvbihwYXR0ZXJuLCBvcCwgY2IpIHtcbiAgdmFyIHJlc3VsdCA9IHRoaXNbJ3RyeV8nICsgb3BdLmNhbGwodGhpcywgcGF0dGVybik7XG4gIGlmIChyZXN1bHQpIHtcbiAgICBjYihyZXN1bHQpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cblZhdC5wcm90b3R5cGUuX3RyeU9yV2FpdCA9IGZ1bmN0aW9uKHBhdHRlcm4sIG9wLCBjYikge1xuICBpZiAoIXRoaXMuX3RyeShwYXR0ZXJuLCBvcCwgY2IpKSB7XG4gICAgdGhpcy5fd2FpdGluZy5wdXNoKHtcbiAgICAgIHBhdHRlcm46IHBhdHRlcm4sXG4gICAgICBvcDogb3AsXG4gICAgICBjYWxsYmFjazogY2JcbiAgICB9KTtcbiAgfVxufTtcblxuVmF0LnByb3RvdHlwZS5fcmVtb3ZlQXQgPSBmdW5jdGlvbihpbmRleCkge1xuICB2YXIgcmVzdWx0ID0gdGhpcy5fc3RvcmUuZ2V0KGluZGV4KS52YWx1ZTtcbiAgdGhpcy5fdXBkYXRlU3RvcmUoKCkgPT4gdGhpcy5fc3RvcmUuc3BsaWNlKGluZGV4LCAxKSk7XG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG5WYXQucHJvdG90eXBlLl9jb2xsZWN0UmVhY3Rpb25DYW5kaWRhdGVzID0gZnVuY3Rpb24oLi4ubGlzdHMpIHtcbiAgdmFyIGNhbmRpZGF0ZXMgPSBbXTtcbiAgdmFyIHN0b3JlID0gdGhpcy5fc3RvcmU7XG4gIFtdLmNvbmNhdCguLi5saXN0cykuZm9yRWFjaChmdW5jdGlvbihyKSB7XG4gICAgLy8gUHJldmVudCB0aGlzIHJlYWN0aW9uIGZyb20gbWF0Y2hpbmcgYWdhaW5zdCBvYmplY3RzIGl0J3MgYWxyZWFkeSBtYXRjaGVkLlxuICAgIC8vIEZJWE1FOiBUaGlzIHNob3VsZCByZWFsbHkgY2hlY2sgZm9yIGEgbWF0Y2ggX2F0IHRoZSBzYW1lIHBhdGhfLlxuICAgIGZ1bmN0aW9uIGFjY2VwdChtKSB7XG4gICAgICB2YXIgcmVjb3JkID0gc3RvcmUuZ2V0KG0uaW5kZXgpO1xuICAgICAgaWYgKCFyZWNvcmQucmVhY3Rpb25zLmhhcyhyKSkge1xuICAgICAgICByZWNvcmQucmVhY3Rpb25zLnNldChyLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIG1hdGNoZXMgPSBndS5maWx0ZXIoZ2V0RGVlcE1hdGNoZXMoc3RvcmUsIHIucGF0dGVybiksIGFjY2VwdCk7XG4gICAgbWF0Y2hlcy5mb3JFYWNoKG0gPT4ge1xuICAgICAgdmFyIGkgPSBtLmluZGV4O1xuICAgICAgaWYgKCFjYW5kaWRhdGVzLmhhc093blByb3BlcnR5KGkpKVxuICAgICAgICBjYW5kaWRhdGVzW2ldID0gW107XG4gICAgICBjYW5kaWRhdGVzW2ldLnB1c2goW3IsIG1dKTtcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBjYW5kaWRhdGVzO1xufTtcblxuVmF0LnByb3RvdHlwZS5fcnVuUmVhY3Rpb24gPSBmdW5jdGlvbihyLCBtYXRjaCkge1xuICBpZiAociBpbnN0YW5jZW9mIFJlYWN0aW9uKVxuICAgIHRoaXMuX2RvV2l0aG91dEhpc3RvcnkoKCkgPT4gdGhpcy5fcmVtb3ZlQXQobWF0Y2guaW5kZXgpKTtcblxuICB2YXIgYXJpdHkgPSByLmNhbGxiYWNrLmxlbmd0aDtcbiAgdmFyIGV4cGVjdGVkQXJpdHkgPSBtYXRjaC5iaW5kaW5ncy5sZW5ndGggKyAxO1xuICBhc3NlcnQoYXJpdHkgPT09IGV4cGVjdGVkQXJpdHksXG4gICAgICAnQmFkIGZ1bmN0aW9uIGFyaXR5OiBleHBlY3RlZCAnICsgZXhwZWN0ZWRBcml0eSArICcsIGdvdCAnICsgYXJpdHkpO1xuXG4gIHZhciByb290ID0gbWF0Y2gucm9vdDtcbiAgdmFyIHZhbHVlLCBuZXdWYWx1ZTtcblxuICBmdW5jdGlvbiBhcHBseUNhbGxiYWNrKCkge1xuICAgIHJldHVybiByLmNhbGxiYWNrLmFwcGx5KG51bGwsIFt2YWx1ZV0uY29uY2F0KG1hdGNoLmJpbmRpbmdzKSk7XG4gIH1cblxuICBpZiAobWF0Y2gucGF0aC5sZW5ndGggPT09IDApIHtcbiAgICB2YWx1ZSA9IHJvb3Q7XG4gICAgbmV3VmFsdWUgPSBhcHBseUNhbGxiYWNrKCk7XG4gIH0gZWxzZSB7XG4gICAgdmFsdWUgPSByb290LmdldEluKG1hdGNoLnBhdGgpO1xuICAgIG5ld1ZhbHVlID0gcm9vdC51cGRhdGVJbihtYXRjaC5wYXRoLCBhcHBseUNhbGxiYWNrKTtcbiAgfVxuXG4gIGlmIChyIGluc3RhbmNlb2YgUmVhY3Rpb24pIHtcbiAgICAvLyBQdXQgdGhlIG9iamVjdCBiYWNrIGluIHRoZSB2YXQsIHJlcGxhY2luZyB0aGUgbWF0Y2hlZCBwYXJ0IHdpdGggdGhlXG4gICAgLy8gcmVzdWx0IG9mIHRoZSByZWFjdGlvbiBmdW5jdGlvbi5cbiAgICBpZiAobmV3VmFsdWUgPT09IHZvaWQgMClcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1JlYWN0aW9ucyBtdXN0IHJldHVybiBhIHZhbHVlJyk7XG4gICAgaWYgKG5ld1ZhbHVlICE9PSBudWxsKVxuICAgICAgdGhpcy5wdXQobmV3VmFsdWUpO1xuICB9XG59O1xuXG5WYXQucHJvdG90eXBlLl9leGVjdXRlUmVhY3Rpb25zID0gZnVuY3Rpb24oY2FuZGlkYXRlcykge1xuICAvLyBUbyBkZXRlY3QgY29uZmxpY3RzLCBrZWVwIHRyYWNrIG9mIGFsbCBwYXRocyB0aGF0IGFyZSB0b3VjaGVkLlxuICB2YXIgcmVhY3Rpb25QYXRocyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgT2JqZWN0LmtleXMoY2FuZGlkYXRlcykucmV2ZXJzZSgpLmZvckVhY2goaSA9PiB7XG4gICAgLy8gU29ydCBjYW5kaWRhdGVzIGJhc2VkIG9uIHBhdGggbGVuZ3RoIChsb25nZXN0IHRvIHNob3J0ZXN0KS5cbiAgICB2YXIgc29ydGVkID0gY2FuZGlkYXRlc1tpXS5zbGljZSgpLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgIHJldHVybiBhWzFdLnBhdGgubGVuZ3RoIC0gYlsxXS5wYXRoLmxlbmd0aDtcbiAgICB9KTtcblxuICAgIC8vIEV4ZWN1dGUgZWFjaCByZWFjdGlvbiwgZGV0ZWN0aW5nIGNvbmZsaWN0cyBhcyB3ZSBnby5cbiAgICBzb3J0ZWQuZm9yRWFjaCgoW3JlYWN0aW9uLCBtYXRjaF0pID0+IHtcbiAgICAgIHZhciBwYXRoID0gbWF0Y2gucGF0aDtcblxuICAgICAgLy8gQ2hlY2sgYWxsIGFuY2VzdG9yIHBhdGhzIHRvIHNlZSBpZiBvbmUgd2FzIGFscmVhZHkgdG91Y2hlZC5cbiAgICAgIHZhciBwYXRoU3RyaW5nO1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPD0gcGF0aC5sZW5ndGg7ICsraikge1xuICAgICAgICBwYXRoU3RyaW5nID0gW2ldLmNvbmNhdChwYXRoLnNsaWNlKDAsIGopKS5qb2luKCcvJykgKyAnLyc7XG4gICAgICAgIGlmIChhcmVSZWFjdGlvbnNDb25mbGljdGluZyhyZWFjdGlvblBhdGhzW3BhdGhTdHJpbmddLCByZWFjdGlvbikpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZWFjdGlvbiBjb25mbGljdCcpO1xuICAgICAgfVxuICAgICAgcmVhY3Rpb25QYXRoc1twYXRoU3RyaW5nXSA9IHJlYWN0aW9uO1xuXG4gICAgICB0aGlzLl9ydW5SZWFjdGlvbihyZWFjdGlvbiwgbWF0Y2gpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cblZhdC5wcm90b3R5cGUucHV0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgLy8gVXBkYXRlIHRoZSBzdG9yZS5cbiAgdmFyIHN0b3JlZE9iaiA9IHtcbiAgICB2YWx1ZTogSW1tdXRhYmxlLmZyb21KUyh2YWx1ZSksXG4gICAgcmVhY3Rpb25zOiBuZXcgV2Vha01hcCgpXG4gIH07XG4gIHRoaXMuX3VwZGF0ZVN0b3JlKCgpID0+IHRoaXMuX3N0b3JlLnB1c2goc3RvcmVkT2JqKSk7XG4gIHRoaXMuX2NoZWNrRm9yTWF0Y2hlcygpO1xufTtcblxuVmF0LnByb3RvdHlwZS5fY2hlY2tGb3JNYXRjaGVzID0gZnVuY3Rpb24oKSB7XG4gIC8vIEEgcmVhbGx5IG5haXZlIHZlcnNpb24gb2YgZGVmZXJyZWQgdGFrZS9jb3B5LiBUaGlzIHNob3VsZFxuICAvLyBwcm9iYWJseSBiZSB3cml0dGVuIGluIGEgbW9yZSBlZmZpY2llbnQgd2F5LlxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuX3dhaXRpbmcgPSB0aGlzLl93YWl0aW5nLmZpbHRlcihmdW5jdGlvbihpbmZvKSB7XG4gICAgcmV0dXJuICFzZWxmLl90cnkoaW5mby5wYXR0ZXJuLCBpbmZvLm9wLCBpbmZvLmNhbGxiYWNrKTtcbiAgfSk7XG5cbiAgdmFyIGNhbmRpZGF0ZXMgPSB0aGlzLl9jb2xsZWN0UmVhY3Rpb25DYW5kaWRhdGVzKHRoaXMuX3JlYWN0aW9ucywgdGhpcy5fb2JzZXJ2ZXJzKTtcbiAgdGhpcy5fZXhlY3V0ZVJlYWN0aW9ucyhjYW5kaWRhdGVzKTtcbn07XG5cblZhdC5wcm90b3R5cGUudHJ5X2NvcHkgPSBmdW5jdGlvbihwYXR0ZXJuKSB7XG4gIHZhciBpID0gZmluZCh0aGlzLl9zdG9yZSwgcGF0dGVybik7XG4gIHJldHVybiBpID49IDAgPyB0aGlzLl9zdG9yZS5nZXQoaSkudmFsdWUgOiBudWxsO1xufTtcblxuVmF0LnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24ocGF0dGVybiwgY2IpIHtcbiAgdGhpcy5fdHJ5T3JXYWl0KHBhdHRlcm4sICdjb3B5JywgY2IpO1xufTtcblxuVmF0LnByb3RvdHlwZS50cnlfY29weV9hbGwgPSBmdW5jdGlvbihwYXR0ZXJuKSB7XG4gIHZhciBtYXRjaGVzID0gZ3UudG9BcnJheShnZXRNYXRjaGVzKHRoaXMuX3N0b3JlLCBwYXR0ZXJuKSk7XG4gIHJldHVybiBtYXRjaGVzLm1hcChpID0+IHRoaXMuX3N0b3JlLmdldChpKS52YWx1ZSk7XG59O1xuXG5WYXQucHJvdG90eXBlLnRyeV90YWtlID0gZnVuY3Rpb24ocGF0dGVybiwgZGVlcCkge1xuICBpZiAoZGVlcCkge1xuICAgIHZhciByZXN1bHQgPSBndS5maXJzdChnZXREZWVwTWF0Y2hlcyh0aGlzLl9zdG9yZSwgcGF0dGVybikpO1xuICAgIGlmIChyZXN1bHQpIHtcbiAgICAgIHRoaXMuX3JlbW92ZUF0KHJlc3VsdC5pbmRleCk7XG4gICAgICByZXR1cm4gW3Jlc3VsdC5yb290LCByZXN1bHQucGF0aF07XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHZhciBpID0gZmluZCh0aGlzLl9zdG9yZSwgcGF0dGVybik7XG4gIHJldHVybiBpID49IDAgPyB0aGlzLl9yZW1vdmVBdChpKSA6IG51bGw7XG59O1xuXG5WYXQucHJvdG90eXBlLnRha2UgPSBmdW5jdGlvbihwYXR0ZXJuLCBjYikge1xuICB0aGlzLl90cnlPcldhaXQocGF0dGVybiwgJ3Rha2UnLCBjYik7XG59O1xuXG5WYXQucHJvdG90eXBlLnRyeV90YWtlX2FsbCA9IGZ1bmN0aW9uKHBhdHRlcm4sIGRlZXApIHtcbiAgdmFyIHJlc3VsdCA9IFtdO1xuICBpZiAoZGVlcCkge1xuICAgIHZhciBtYXRjaGVzID0gZ3UudG9BcnJheShnZXREZWVwTWF0Y2hlcyh0aGlzLl9zdG9yZSwgcGF0dGVybikpO1xuICAgIHZhciBkZWxldGVkSW5kaWNlcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgbWF0Y2hlcy5yZXZlcnNlKCkuZm9yRWFjaChtYXRjaCA9PiB7XG4gICAgICAvLyBUaGUgc2FtZSBpbmRleCBjYW4gaGF2ZSBtdWx0aXBsZSBtYXRjaGVzLCBzbyBhdm9pZCB0cnlpbmcgdG9cbiAgICAgIC8vIHJlbW92ZSB0aGUgc2FtZSBvYmplY3QgdHdpY2UuXG4gICAgICBpZiAoIShtYXRjaC5pbmRleCBpbiBkZWxldGVkSW5kaWNlcykpIHtcbiAgICAgICAgdGhpcy5fcmVtb3ZlQXQobWF0Y2guaW5kZXgpO1xuICAgICAgICBkZWxldGVkSW5kaWNlc1ttYXRjaC5pbmRleF0gPSB0cnVlO1xuICAgICAgfVxuICAgICAgLy8gVXNlIHVuc2hpZnQgc28gdGhhdCBtYXRjaGVzIHN0aWxsIGFwcGVhciBpbiB0aGUgY29ycmVjdCBvcmRlci5cbiAgICAgIHJlc3VsdC51bnNoaWZ0KFttYXRjaC5yb290LCBtYXRjaC5wYXRoXSk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIG1hdGNoSW5kaWNlcyA9IGd1LnRvQXJyYXkoZ2V0TWF0Y2hlcyh0aGlzLl9zdG9yZSwgcGF0dGVybikpO1xuICAgIG1hdGNoSW5kaWNlcy5yZXZlcnNlKCkuZm9yRWFjaChpID0+IHJlc3VsdC51bnNoaWZ0KHRoaXMuX3JlbW92ZUF0KGkpKSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8vIEEgcmVhY3Rpb24gaXMgYSBwcm9jZXNzIHRoYXQgYXR0ZW1wdHMgdG8gYHRha2VgIGEgZ2l2ZW4gcGF0dGVybiBldmVyeVxuLy8gdGltZSB0aGUgdHVwbGUgc3BhY2UgY2hhbmdlcy4gSWYgdGhlIGByZWFjdGlvbmAgZnVuY3Rpb24gcHJvZHVjZXMgYSByZXN1bHQsXG4vLyB0aGUgcmVzdWx0IGlzIHB1dCBpbnRvIHRoZSB0dXBsZSBzcGFjZS5cblZhdC5wcm90b3R5cGUuYWRkUmVhY3Rpb24gPSBmdW5jdGlvbihwYXR0ZXJuLCByZWFjdGlvbikge1xuICB2YXIgciA9IG5ldyBSZWFjdGlvbih7IHBhdHRlcm46IHBhdHRlcm4sIGNhbGxiYWNrOiByZWFjdGlvbiB9KTtcbiAgdGhpcy5fcmVhY3Rpb25zLnB1c2gocik7XG4gIHRoaXMuX2NoZWNrRm9yTWF0Y2hlcygpO1xuICByZXR1cm4gcjtcbn07XG5cblZhdC5wcm90b3R5cGUuYWRkT2JzZXJ2ZXIgPSBmdW5jdGlvbihwYXR0ZXJuLCBjYikge1xuICB2YXIgbyA9IG5ldyBPYnNlcnZlcih7IHBhdHRlcm46IHBhdHRlcm4sIGNhbGxiYWNrOiBjYiB9KTtcbiAgdGhpcy5fb2JzZXJ2ZXJzLnB1c2gobyk7XG4gIHRoaXMuX2NoZWNrRm9yTWF0Y2hlcygpO1xuICByZXR1cm4gbztcbn07XG5cblZhdC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24ocGF0dGVybiwgY2IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnRha2UocGF0dGVybiwgZnVuY3Rpb24obWF0Y2gpIHtcbiAgICBzZWxmLnB1dChjYihtYXRjaCkpO1xuICB9KTtcbn07XG5cbi8vIERvZXMgd2hhdCB5b3UnZCBleHBlY3QuXG5WYXQucHJvdG90eXBlLnNpemUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuX3N0b3JlLnNpemU7XG59O1xuXG4vLyBFeHBvcnRzXG4vLyAtLS0tLS0tXG5cbm1vZHVsZS5leHBvcnRzID0gVmF0O1xuIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLyoganNoaW50IG5ld2NhcDogZmFsc2UgKi9cblxudmFyIGVuc3VyZVN5bWJvbCA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgU3ltYm9sW2tleV0gPSBTeW1ib2xba2V5XSB8fCBTeW1ib2woKTtcbn07XG5cbnZhciBlbnN1cmVQcm90byA9IGZ1bmN0aW9uIChDb25zdHJ1Y3Rvciwga2V5LCB2YWwpIHtcbiAgdmFyIHByb3RvID0gQ29uc3RydWN0b3IucHJvdG90eXBlO1xuICBwcm90b1trZXldID0gcHJvdG9ba2V5XSB8fCB2YWw7XG59O1xuXG4vL1xuXG5pZiAodHlwZW9mIFN5bWJvbCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICByZXF1aXJlKFwiZXM2LXN5bWJvbC9pbXBsZW1lbnRcIik7XG59XG5cbnJlcXVpcmUoXCJlczYtc2hpbVwiKTtcbnJlcXVpcmUoXCIuL3RyYW5zZm9ybWF0aW9uL3RyYW5zZm9ybWVycy9lczYtZ2VuZXJhdG9ycy9ydW50aW1lXCIpO1xuXG4vLyBBYnN0cmFjdCByZWZlcmVuY2VzXG5cbmVuc3VyZVN5bWJvbChcInJlZmVyZW5jZUdldFwiKTtcbmVuc3VyZVN5bWJvbChcInJlZmVyZW5jZVNldFwiKTtcbmVuc3VyZVN5bWJvbChcInJlZmVyZW5jZURlbGV0ZVwiKTtcblxuZW5zdXJlUHJvdG8oRnVuY3Rpb24sIFN5bWJvbC5yZWZlcmVuY2VHZXQsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0pO1xuXG5lbnN1cmVQcm90byhNYXAsIFN5bWJvbC5yZWZlcmVuY2VHZXQsIE1hcC5wcm90b3R5cGUuZ2V0KTtcbmVuc3VyZVByb3RvKE1hcCwgU3ltYm9sLnJlZmVyZW5jZVNldCwgTWFwLnByb3RvdHlwZS5zZXQpO1xuZW5zdXJlUHJvdG8oTWFwLCBTeW1ib2wucmVmZXJlbmNlRGVsZXRlLCBNYXAucHJvdG90eXBlLmRlbGV0ZSk7XG5cbmlmIChnbG9iYWwuV2Vha01hcCkge1xuICBlbnN1cmVQcm90byhXZWFrTWFwLCBTeW1ib2wucmVmZXJlbmNlR2V0LCBXZWFrTWFwLnByb3RvdHlwZS5nZXQpO1xuICBlbnN1cmVQcm90byhXZWFrTWFwLCBTeW1ib2wucmVmZXJlbmNlU2V0LCBXZWFrTWFwLnByb3RvdHlwZS5zZXQpO1xuICBlbnN1cmVQcm90byhXZWFrTWFwLCBTeW1ib2wucmVmZXJlbmNlRGVsZXRlLCBXZWFrTWFwLnByb3RvdHlwZS5kZWxldGUpO1xufVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKipcbiogQ29weXJpZ2h0IChjKSAyMDE0LCBGYWNlYm9vaywgSW5jLlxuKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuKlxuKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiogaHR0cHM6Ly9yYXcuZ2l0aHViLmNvbS9mYWNlYm9vay9yZWdlbmVyYXRvci9tYXN0ZXIvTElDRU5TRSBmaWxlLiBBblxuKiBhZGRpdGlvbmFsIGdyYW50IG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW5cbiogdGhlIHNhbWUgZGlyZWN0b3J5LlxuKi9cblxudmFyIGl0ZXJhdG9yU3ltYm9sID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIFN5bWJvbC5pdGVyYXRvciB8fCBcIkBAaXRlcmF0b3JcIjtcbnZhciBydW50aW1lID0gZ2xvYmFsLnJlZ2VuZXJhdG9yUnVudGltZSA9IGV4cG9ydHM7XG52YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxudmFyIHdyYXAgPSBydW50aW1lLndyYXAgPSBmdW5jdGlvbiB3cmFwKGlubmVyRm4sIG91dGVyRm4sIHNlbGYsIHRyeUxpc3QpIHtcbiAgcmV0dXJuIG5ldyBHZW5lcmF0b3IoaW5uZXJGbiwgb3V0ZXJGbiwgc2VsZiB8fCBudWxsLCB0cnlMaXN0IHx8IFtdKTtcbn07XG5cbnZhciBHZW5TdGF0ZVN1c3BlbmRlZFN0YXJ0ID0gXCJzdXNwZW5kZWRTdGFydFwiO1xudmFyIEdlblN0YXRlU3VzcGVuZGVkWWllbGQgPSBcInN1c3BlbmRlZFlpZWxkXCI7XG52YXIgR2VuU3RhdGVFeGVjdXRpbmcgPSBcImV4ZWN1dGluZ1wiO1xudmFyIEdlblN0YXRlQ29tcGxldGVkID0gXCJjb21wbGV0ZWRcIjtcblxuLy8gUmV0dXJuaW5nIHRoaXMgb2JqZWN0IGZyb20gdGhlIGlubmVyRm4gaGFzIHRoZSBzYW1lIGVmZmVjdCBhc1xuLy8gYnJlYWtpbmcgb3V0IG9mIHRoZSBkaXNwYXRjaCBzd2l0Y2ggc3RhdGVtZW50LlxudmFyIENvbnRpbnVlU2VudGluZWwgPSB7fTtcblxuLy8gRHVtbXkgY29uc3RydWN0b3IgdGhhdCB3ZSB1c2UgYXMgdGhlIC5jb25zdHJ1Y3RvciBwcm9wZXJ0eSBmb3Jcbi8vIGZ1bmN0aW9ucyB0aGF0IHJldHVybiBHZW5lcmF0b3Igb2JqZWN0cy5cbmZ1bmN0aW9uIEdlbmVyYXRvckZ1bmN0aW9uKCkge31cbnZhciBHRnAgPSBmdW5jdGlvbiBHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZSgpIHt9O1xudmFyIEdwID0gR0ZwLnByb3RvdHlwZSA9IEdlbmVyYXRvci5wcm90b3R5cGU7XG4oR0ZwLmNvbnN0cnVjdG9yID0gR2VuZXJhdG9yRnVuY3Rpb24pLnByb3RvdHlwZSA9IEdwLmNvbnN0cnVjdG9yID0gR0ZwO1xuXG5ydW50aW1lLmlzR2VuZXJhdG9yRnVuY3Rpb24gPSBmdW5jdGlvbiAoZ2VuRnVuKSB7XG4gIHZhciBjdG9yID0gZ2VuRnVuICYmIGdlbkZ1bi5jb25zdHJ1Y3RvcjtcbiAgcmV0dXJuIGN0b3IgPyBHZW5lcmF0b3JGdW5jdGlvbi5uYW1lID09PSBjdG9yLm5hbWUgOiBmYWxzZTtcbn07XG5cbnJ1bnRpbWUubWFyayA9IGZ1bmN0aW9uIChnZW5GdW4pIHtcbiAgZ2VuRnVuLl9fcHJvdG9fXyA9IEdGcDtcbiAgZ2VuRnVuLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoR3ApO1xuICByZXR1cm4gZ2VuRnVuO1xufTtcblxucnVudGltZS5hc3luYyA9IGZ1bmN0aW9uIChpbm5lckZuLCBvdXRlckZuLCBzZWxmLCB0cnlMaXN0KSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFyIGdlbmVyYXRvciA9IHdyYXAoaW5uZXJGbiwgb3V0ZXJGbiwgc2VsZiwgdHJ5TGlzdCk7XG4gICAgdmFyIGNhbGxOZXh0ID0gc3RlcC5iaW5kKGdlbmVyYXRvci5uZXh0KTtcbiAgICB2YXIgY2FsbFRocm93ID0gc3RlcC5iaW5kKGdlbmVyYXRvcltcInRocm93XCJdKTtcblxuICAgIGZ1bmN0aW9uIHN0ZXAoYXJnKSB7XG4gICAgICB2YXIgaW5mbztcbiAgICAgIHZhciB2YWx1ZTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgaW5mbyA9IHRoaXMoYXJnKTtcbiAgICAgICAgdmFsdWUgPSBpbmZvLnZhbHVlO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIHJlamVjdChlcnJvcik7XG4gICAgICB9XG5cbiAgICAgIGlmIChpbmZvLmRvbmUpIHtcbiAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBQcm9taXNlLnJlc29sdmUodmFsdWUpLnRoZW4oY2FsbE5leHQsIGNhbGxUaHJvdyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY2FsbE5leHQoKTtcbiAgfSk7XG59O1xuXG5mdW5jdGlvbiBHZW5lcmF0b3IoaW5uZXJGbiwgb3V0ZXJGbiwgc2VsZiwgdHJ5TGlzdCkge1xuICB2YXIgZ2VuZXJhdG9yID0gb3V0ZXJGbiA/IE9iamVjdC5jcmVhdGUob3V0ZXJGbi5wcm90b3R5cGUpIDogdGhpcztcbiAgdmFyIGNvbnRleHQgPSBuZXcgQ29udGV4dCh0cnlMaXN0KTtcbiAgdmFyIHN0YXRlID0gR2VuU3RhdGVTdXNwZW5kZWRTdGFydDtcblxuICBmdW5jdGlvbiBpbnZva2UobWV0aG9kLCBhcmcpIHtcbiAgICBpZiAoc3RhdGUgPT09IEdlblN0YXRlRXhlY3V0aW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBydW5uaW5nXCIpO1xuICAgIH1cblxuICAgIGlmIChzdGF0ZSA9PT0gR2VuU3RhdGVDb21wbGV0ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkdlbmVyYXRvciBoYXMgYWxyZWFkeSBmaW5pc2hlZFwiKTtcbiAgICB9XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgdmFyIGRlbGVnYXRlID0gY29udGV4dC5kZWxlZ2F0ZTtcbiAgICAgIHZhciBpbmZvO1xuXG4gICAgICBpZiAoZGVsZWdhdGUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBpbmZvID0gZGVsZWdhdGUuaXRlcmF0b3JbbWV0aG9kXShhcmcpO1xuXG4gICAgICAgICAgLy8gRGVsZWdhdGUgZ2VuZXJhdG9yIHJhbiBhbmQgaGFuZGxlZCBpdHMgb3duIGV4Y2VwdGlvbnMgc29cbiAgICAgICAgICAvLyByZWdhcmRsZXNzIG9mIHdoYXQgdGhlIG1ldGhvZCB3YXMsIHdlIGNvbnRpbnVlIGFzIGlmIGl0IGlzXG4gICAgICAgICAgLy8gXCJuZXh0XCIgd2l0aCBhbiB1bmRlZmluZWQgYXJnLlxuICAgICAgICAgIG1ldGhvZCA9IFwibmV4dFwiO1xuICAgICAgICAgIGFyZyA9IHVuZGVmaW5lZDtcblxuICAgICAgICB9IGNhdGNoICh1bmNhdWdodCkge1xuICAgICAgICAgIGNvbnRleHQuZGVsZWdhdGUgPSBudWxsO1xuXG4gICAgICAgICAgLy8gTGlrZSByZXR1cm5pbmcgZ2VuZXJhdG9yLnRocm93KHVuY2F1Z2h0KSwgYnV0IHdpdGhvdXQgdGhlXG4gICAgICAgICAgLy8gb3ZlcmhlYWQgb2YgYW4gZXh0cmEgZnVuY3Rpb24gY2FsbC5cbiAgICAgICAgICBtZXRob2QgPSBcInRocm93XCI7XG4gICAgICAgICAgYXJnID0gdW5jYXVnaHQ7XG5cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpbmZvLmRvbmUpIHtcbiAgICAgICAgICBjb250ZXh0W2RlbGVnYXRlLnJlc3VsdE5hbWVdID0gaW5mby52YWx1ZTtcbiAgICAgICAgICBjb250ZXh0Lm5leHQgPSBkZWxlZ2F0ZS5uZXh0TG9jO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0YXRlID0gR2VuU3RhdGVTdXNwZW5kZWRZaWVsZDtcbiAgICAgICAgICByZXR1cm4gaW5mbztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRleHQuZGVsZWdhdGUgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBpZiAobWV0aG9kID09PSBcIm5leHRcIikge1xuICAgICAgICBpZiAoc3RhdGUgPT09IEdlblN0YXRlU3VzcGVuZGVkU3RhcnQgJiZcbiAgICAgICAgICAgIHR5cGVvZiBhcmcgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAvLyBodHRwczovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtZ2VuZXJhdG9ycmVzdW1lXG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgIFwiYXR0ZW1wdCB0byBzZW5kIFwiICsgSlNPTi5zdHJpbmdpZnkoYXJnKSArIFwiIHRvIG5ld2Jvcm4gZ2VuZXJhdG9yXCJcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0YXRlID09PSBHZW5TdGF0ZVN1c3BlbmRlZFlpZWxkKSB7XG4gICAgICAgICAgY29udGV4dC5zZW50ID0gYXJnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSBjb250ZXh0LnNlbnQ7XG4gICAgICAgIH1cblxuICAgICAgfSBlbHNlIGlmIChtZXRob2QgPT09IFwidGhyb3dcIikge1xuICAgICAgICBpZiAoc3RhdGUgPT09IEdlblN0YXRlU3VzcGVuZGVkU3RhcnQpIHtcbiAgICAgICAgICBzdGF0ZSA9IEdlblN0YXRlQ29tcGxldGVkO1xuICAgICAgICAgIHRocm93IGFyZztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb250ZXh0LmRpc3BhdGNoRXhjZXB0aW9uKGFyZykpIHtcbiAgICAgICAgICAvLyBJZiB0aGUgZGlzcGF0Y2hlZCBleGNlcHRpb24gd2FzIGNhdWdodCBieSBhIGNhdGNoIGJsb2NrLFxuICAgICAgICAgIC8vIHRoZW4gbGV0IHRoYXQgY2F0Y2ggYmxvY2sgaGFuZGxlIHRoZSBleGNlcHRpb24gbm9ybWFsbHkuXG4gICAgICAgICAgbWV0aG9kID0gXCJuZXh0XCI7XG4gICAgICAgICAgYXJnID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSBpZiAobWV0aG9kID09PSBcInJldHVyblwiKSB7XG4gICAgICAgIGNvbnRleHQuYWJydXB0KFwicmV0dXJuXCIsIGFyZyk7XG4gICAgICB9XG5cbiAgICAgIHN0YXRlID0gR2VuU3RhdGVFeGVjdXRpbmc7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGlubmVyRm4uY2FsbChzZWxmLCBjb250ZXh0KTtcblxuICAgICAgICAvLyBJZiBhbiBleGNlcHRpb24gaXMgdGhyb3duIGZyb20gaW5uZXJGbiwgd2UgbGVhdmUgc3RhdGUgPT09XG4gICAgICAgIC8vIEdlblN0YXRlRXhlY3V0aW5nIGFuZCBsb29wIGJhY2sgZm9yIGFub3RoZXIgaW52b2NhdGlvbi5cbiAgICAgICAgc3RhdGUgPSBjb250ZXh0LmRvbmUgPyBHZW5TdGF0ZUNvbXBsZXRlZCA6IEdlblN0YXRlU3VzcGVuZGVkWWllbGQ7XG5cbiAgICAgICAgaW5mbyA9IHtcbiAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgZG9uZTogY29udGV4dC5kb25lXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHZhbHVlID09PSBDb250aW51ZVNlbnRpbmVsKSB7XG4gICAgICAgICAgaWYgKGNvbnRleHQuZGVsZWdhdGUgJiYgbWV0aG9kID09PSBcIm5leHRcIikge1xuICAgICAgICAgICAgLy8gRGVsaWJlcmF0ZWx5IGZvcmdldCB0aGUgbGFzdCBzZW50IHZhbHVlIHNvIHRoYXQgd2UgZG9uJ3RcbiAgICAgICAgICAgIC8vIGFjY2lkZW50YWxseSBwYXNzIGl0IG9uIHRvIHRoZSBkZWxlZ2F0ZS5cbiAgICAgICAgICAgIGFyZyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGluZm87XG4gICAgICAgIH1cblxuICAgICAgfSBjYXRjaCAodGhyb3duKSB7XG4gICAgICAgIHN0YXRlID0gR2VuU3RhdGVDb21wbGV0ZWQ7XG5cbiAgICAgICAgaWYgKG1ldGhvZCA9PT0gXCJuZXh0XCIpIHtcbiAgICAgICAgICBjb250ZXh0LmRpc3BhdGNoRXhjZXB0aW9uKHRocm93bik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXJnID0gdGhyb3duO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2VuZXJhdG9yLm5leHQgPSBpbnZva2UuYmluZChnZW5lcmF0b3IsIFwibmV4dFwiKTtcbiAgZ2VuZXJhdG9yW1widGhyb3dcIl0gPSBpbnZva2UuYmluZChnZW5lcmF0b3IsIFwidGhyb3dcIik7XG4gIGdlbmVyYXRvcltcInJldHVyblwiXSA9IGludm9rZS5iaW5kKGdlbmVyYXRvciwgXCJyZXR1cm5cIik7XG5cbiAgcmV0dXJuIGdlbmVyYXRvcjtcbn1cblxuR3BbaXRlcmF0b3JTeW1ib2xdID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcztcbn07XG5cbkdwLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gXCJbb2JqZWN0IEdlbmVyYXRvcl1cIjtcbn07XG5cbmZ1bmN0aW9uIHB1c2hUcnlFbnRyeSh0cmlwbGUpIHtcbiAgdmFyIGVudHJ5ID0geyB0cnlMb2M6IHRyaXBsZVswXSB9O1xuXG4gIGlmICgxIGluIHRyaXBsZSkge1xuICAgIGVudHJ5LmNhdGNoTG9jID0gdHJpcGxlWzFdO1xuICB9XG5cbiAgaWYgKDIgaW4gdHJpcGxlKSB7XG4gICAgZW50cnkuZmluYWxseUxvYyA9IHRyaXBsZVsyXTtcbiAgfVxuXG4gIHRoaXMudHJ5RW50cmllcy5wdXNoKGVudHJ5KTtcbn1cblxuZnVuY3Rpb24gcmVzZXRUcnlFbnRyeShlbnRyeSwgaSkge1xuICB2YXIgcmVjb3JkID0gZW50cnkuY29tcGxldGlvbiB8fCB7fTtcbiAgcmVjb3JkLnR5cGUgPSBpID09PSAwID8gXCJub3JtYWxcIiA6IFwicmV0dXJuXCI7XG4gIGRlbGV0ZSByZWNvcmQuYXJnO1xuICBlbnRyeS5jb21wbGV0aW9uID0gcmVjb3JkO1xufVxuXG5mdW5jdGlvbiBDb250ZXh0KHRyeUxpc3QpIHtcbiAgLy8gVGhlIHJvb3QgZW50cnkgb2JqZWN0IChlZmZlY3RpdmVseSBhIHRyeSBzdGF0ZW1lbnQgd2l0aG91dCBhIGNhdGNoXG4gIC8vIG9yIGEgZmluYWxseSBibG9jaykgZ2l2ZXMgdXMgYSBwbGFjZSB0byBzdG9yZSB2YWx1ZXMgdGhyb3duIGZyb21cbiAgLy8gbG9jYXRpb25zIHdoZXJlIHRoZXJlIGlzIG5vIGVuY2xvc2luZyB0cnkgc3RhdGVtZW50LlxuICB0aGlzLnRyeUVudHJpZXMgPSBbeyB0cnlMb2M6IFwicm9vdFwiIH1dO1xuICB0cnlMaXN0LmZvckVhY2gocHVzaFRyeUVudHJ5LCB0aGlzKTtcbiAgdGhpcy5yZXNldCgpO1xufVxuXG5ydW50aW1lLmtleXMgPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gIHZhciBrZXlzID0gW107XG4gIGZvciAodmFyIGtleSBpbiBvYmplY3QpIHtcbiAgICBrZXlzLnB1c2goa2V5KTtcbiAgfVxuICBrZXlzLnJldmVyc2UoKTtcblxuICAvLyBSYXRoZXIgdGhhbiByZXR1cm5pbmcgYW4gb2JqZWN0IHdpdGggYSBuZXh0IG1ldGhvZCwgd2Uga2VlcFxuICAvLyB0aGluZ3Mgc2ltcGxlIGFuZCByZXR1cm4gdGhlIG5leHQgZnVuY3Rpb24gaXRzZWxmLlxuICByZXR1cm4gZnVuY3Rpb24gbmV4dCgpIHtcbiAgICB3aGlsZSAoa2V5cy5sZW5ndGgpIHtcbiAgICAgIHZhciBrZXkgPSBrZXlzLnBvcCgpO1xuICAgICAgaWYgKGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgbmV4dC52YWx1ZSA9IGtleTtcbiAgICAgICAgbmV4dC5kb25lID0gZmFsc2U7XG4gICAgICAgIHJldHVybiBuZXh0O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRvIGF2b2lkIGNyZWF0aW5nIGFuIGFkZGl0aW9uYWwgb2JqZWN0LCB3ZSBqdXN0IGhhbmcgdGhlIC52YWx1ZVxuICAgIC8vIGFuZCAuZG9uZSBwcm9wZXJ0aWVzIG9mZiB0aGUgbmV4dCBmdW5jdGlvbiBvYmplY3QgaXRzZWxmLiBUaGlzXG4gICAgLy8gYWxzbyBlbnN1cmVzIHRoYXQgdGhlIG1pbmlmaWVyIHdpbGwgbm90IGFub255bWl6ZSB0aGUgZnVuY3Rpb24uXG4gICAgbmV4dC5kb25lID0gdHJ1ZTtcbiAgICByZXR1cm4gbmV4dDtcbiAgfTtcbn07XG5cbmZ1bmN0aW9uIHZhbHVlcyhpdGVyYWJsZSkge1xuICB2YXIgaXRlcmF0b3IgPSBpdGVyYWJsZTtcbiAgaWYgKGl0ZXJhdG9yU3ltYm9sIGluIGl0ZXJhYmxlKSB7XG4gICAgaXRlcmF0b3IgPSBpdGVyYWJsZVtpdGVyYXRvclN5bWJvbF0oKTtcbiAgfSBlbHNlIGlmICghaXNOYU4oaXRlcmFibGUubGVuZ3RoKSkge1xuICAgIHZhciBpID0gLTE7XG4gICAgaXRlcmF0b3IgPSBmdW5jdGlvbiBuZXh0KCkge1xuICAgICAgd2hpbGUgKCsraSA8IGl0ZXJhYmxlLmxlbmd0aCkge1xuICAgICAgICBpZiAoaSBpbiBpdGVyYWJsZSkge1xuICAgICAgICAgIG5leHQudmFsdWUgPSBpdGVyYWJsZVtpXTtcbiAgICAgICAgICBuZXh0LmRvbmUgPSBmYWxzZTtcbiAgICAgICAgICByZXR1cm4gbmV4dDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbmV4dC5kb25lID0gdHJ1ZTtcbiAgICAgIHJldHVybiBuZXh0O1xuICAgIH07XG4gICAgaXRlcmF0b3IubmV4dCA9IGl0ZXJhdG9yO1xuICB9XG4gIHJldHVybiBpdGVyYXRvcjtcbn1cbnJ1bnRpbWUudmFsdWVzID0gdmFsdWVzO1xuXG5Db250ZXh0LnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IENvbnRleHQsXG5cbiAgcmVzZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnByZXYgPSAwO1xuICAgIHRoaXMubmV4dCA9IDA7XG4gICAgdGhpcy5zZW50ID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuZG9uZSA9IGZhbHNlO1xuICAgIHRoaXMuZGVsZWdhdGUgPSBudWxsO1xuXG4gICAgdGhpcy50cnlFbnRyaWVzLmZvckVhY2gocmVzZXRUcnlFbnRyeSk7XG5cbiAgICAvLyBQcmUtaW5pdGlhbGl6ZSBhdCBsZWFzdCAyMCB0ZW1wb3JhcnkgdmFyaWFibGVzIHRvIGVuYWJsZSBoaWRkZW5cbiAgICAvLyBjbGFzcyBvcHRpbWl6YXRpb25zIGZvciBzaW1wbGUgZ2VuZXJhdG9ycy5cbiAgICBmb3IgKHZhciB0ZW1wSW5kZXggPSAwLCB0ZW1wTmFtZTtcbiAgICAgICAgIGhhc093bi5jYWxsKHRoaXMsIHRlbXBOYW1lID0gXCJ0XCIgKyB0ZW1wSW5kZXgpIHx8IHRlbXBJbmRleCA8IDIwO1xuICAgICAgICAgKyt0ZW1wSW5kZXgpIHtcbiAgICAgIHRoaXNbdGVtcE5hbWVdID0gbnVsbDtcbiAgICB9XG4gIH0sXG5cbiAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZG9uZSA9IHRydWU7XG5cbiAgICB2YXIgcm9vdEVudHJ5ID0gdGhpcy50cnlFbnRyaWVzWzBdO1xuICAgIHZhciByb290UmVjb3JkID0gcm9vdEVudHJ5LmNvbXBsZXRpb247XG4gICAgaWYgKHJvb3RSZWNvcmQudHlwZSA9PT0gXCJ0aHJvd1wiKSB7XG4gICAgICB0aHJvdyByb290UmVjb3JkLmFyZztcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5ydmFsO1xuICB9LFxuXG4gIGRpc3BhdGNoRXhjZXB0aW9uOiBmdW5jdGlvbiAoZXhjZXB0aW9uKSB7XG4gICAgaWYgKHRoaXMuZG9uZSkge1xuICAgICAgdGhyb3cgZXhjZXB0aW9uO1xuICAgIH1cblxuICAgIHZhciBjb250ZXh0ID0gdGhpcztcbiAgICBmdW5jdGlvbiBoYW5kbGUobG9jLCBjYXVnaHQpIHtcbiAgICAgIHJlY29yZC50eXBlID0gXCJ0aHJvd1wiO1xuICAgICAgcmVjb3JkLmFyZyA9IGV4Y2VwdGlvbjtcbiAgICAgIGNvbnRleHQubmV4dCA9IGxvYztcbiAgICAgIHJldHVybiAhIWNhdWdodDtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gdGhpcy50cnlFbnRyaWVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICB2YXIgZW50cnkgPSB0aGlzLnRyeUVudHJpZXNbaV07XG4gICAgICB2YXIgcmVjb3JkID0gZW50cnkuY29tcGxldGlvbjtcblxuICAgICAgaWYgKGVudHJ5LnRyeUxvYyA9PT0gXCJyb290XCIpIHtcbiAgICAgICAgLy8gRXhjZXB0aW9uIHRocm93biBvdXRzaWRlIG9mIGFueSB0cnkgYmxvY2sgdGhhdCBjb3VsZCBoYW5kbGVcbiAgICAgICAgLy8gaXQsIHNvIHNldCB0aGUgY29tcGxldGlvbiB2YWx1ZSBvZiB0aGUgZW50aXJlIGZ1bmN0aW9uIHRvXG4gICAgICAgIC8vIHRocm93IHRoZSBleGNlcHRpb24uXG4gICAgICAgIHJldHVybiBoYW5kbGUoXCJlbmRcIik7XG4gICAgICB9XG5cbiAgICAgIGlmIChlbnRyeS50cnlMb2MgPD0gdGhpcy5wcmV2KSB7XG4gICAgICAgIHZhciBoYXNDYXRjaCA9IGhhc093bi5jYWxsKGVudHJ5LCBcImNhdGNoTG9jXCIpO1xuICAgICAgICB2YXIgaGFzRmluYWxseSA9IGhhc093bi5jYWxsKGVudHJ5LCBcImZpbmFsbHlMb2NcIik7XG5cbiAgICAgICAgaWYgKGhhc0NhdGNoICYmIGhhc0ZpbmFsbHkpIHtcbiAgICAgICAgICBpZiAodGhpcy5wcmV2IDwgZW50cnkuY2F0Y2hMb2MpIHtcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGUoZW50cnkuY2F0Y2hMb2MsIHRydWUpO1xuICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5wcmV2IDwgZW50cnkuZmluYWxseUxvYykge1xuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZShlbnRyeS5maW5hbGx5TG9jKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIGlmIChoYXNDYXRjaCkge1xuICAgICAgICAgIGlmICh0aGlzLnByZXYgPCBlbnRyeS5jYXRjaExvYykge1xuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZShlbnRyeS5jYXRjaExvYywgdHJ1ZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAoaGFzRmluYWxseSkge1xuICAgICAgICAgIGlmICh0aGlzLnByZXYgPCBlbnRyeS5maW5hbGx5TG9jKSB7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlKGVudHJ5LmZpbmFsbHlMb2MpO1xuICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInRyeSBzdGF0ZW1lbnQgd2l0aG91dCBjYXRjaCBvciBmaW5hbGx5XCIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIF9maW5kRmluYWxseUVudHJ5OiBmdW5jdGlvbiAoZmluYWxseUxvYykge1xuICAgIGZvciAodmFyIGkgPSB0aGlzLnRyeUVudHJpZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIHZhciBlbnRyeSA9IHRoaXMudHJ5RW50cmllc1tpXTtcbiAgICAgIGlmIChlbnRyeS50cnlMb2MgPD0gdGhpcy5wcmV2ICYmXG4gICAgICAgICAgaGFzT3duLmNhbGwoZW50cnksIFwiZmluYWxseUxvY1wiKSAmJiAoXG4gICAgICAgICAgICBlbnRyeS5maW5hbGx5TG9jID09PSBmaW5hbGx5TG9jIHx8XG4gICAgICAgICAgICB0aGlzLnByZXYgPCBlbnRyeS5maW5hbGx5TG9jKSkge1xuICAgICAgICByZXR1cm4gZW50cnk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIGFicnVwdDogZnVuY3Rpb24gKHR5cGUsIGFyZykge1xuICAgIHZhciBlbnRyeSA9IHRoaXMuX2ZpbmRGaW5hbGx5RW50cnkoKTtcbiAgICB2YXIgcmVjb3JkID0gZW50cnkgPyBlbnRyeS5jb21wbGV0aW9uIDoge307XG5cbiAgICByZWNvcmQudHlwZSA9IHR5cGU7XG4gICAgcmVjb3JkLmFyZyA9IGFyZztcblxuICAgIGlmIChlbnRyeSkge1xuICAgICAgdGhpcy5uZXh0ID0gZW50cnkuZmluYWxseUxvYztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb21wbGV0ZShyZWNvcmQpO1xuICAgIH1cblxuICAgIHJldHVybiBDb250aW51ZVNlbnRpbmVsO1xuICB9LFxuXG4gIGNvbXBsZXRlOiBmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgaWYgKHJlY29yZC50eXBlID09PSBcInRocm93XCIpIHtcbiAgICAgIHRocm93IHJlY29yZC5hcmc7XG4gICAgfVxuXG4gICAgaWYgKHJlY29yZC50eXBlID09PSBcImJyZWFrXCIgfHwgcmVjb3JkLnR5cGUgPT09IFwiY29udGludWVcIikge1xuICAgICAgdGhpcy5uZXh0ID0gcmVjb3JkLmFyZztcbiAgICB9IGVsc2UgaWYgKHJlY29yZC50eXBlID09PSBcInJldHVyblwiKSB7XG4gICAgICB0aGlzLnJ2YWwgPSByZWNvcmQuYXJnO1xuICAgICAgdGhpcy5uZXh0ID0gXCJlbmRcIjtcbiAgICB9XG5cbiAgICByZXR1cm4gQ29udGludWVTZW50aW5lbDtcbiAgfSxcblxuICBmaW5pc2g6IGZ1bmN0aW9uIChmaW5hbGx5TG9jKSB7XG4gICAgdmFyIGVudHJ5ID0gdGhpcy5fZmluZEZpbmFsbHlFbnRyeShmaW5hbGx5TG9jKTtcbiAgICByZXR1cm4gdGhpcy5jb21wbGV0ZShlbnRyeS5jb21wbGV0aW9uKTtcbiAgfSxcblxuICBcImNhdGNoXCI6IGZ1bmN0aW9uICh0cnlMb2MpIHtcbiAgICBmb3IgKHZhciBpID0gdGhpcy50cnlFbnRyaWVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICB2YXIgZW50cnkgPSB0aGlzLnRyeUVudHJpZXNbaV07XG4gICAgICBpZiAoZW50cnkudHJ5TG9jID09PSB0cnlMb2MpIHtcbiAgICAgICAgdmFyIHJlY29yZCA9IGVudHJ5LmNvbXBsZXRpb247XG4gICAgICAgIHZhciB0aHJvd247XG4gICAgICAgIGlmIChyZWNvcmQudHlwZSA9PT0gXCJ0aHJvd1wiKSB7XG4gICAgICAgICAgdGhyb3duID0gcmVjb3JkLmFyZztcbiAgICAgICAgICByZXNldFRyeUVudHJ5KGVudHJ5LCBpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhyb3duO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoZSBjb250ZXh0LmNhdGNoIG1ldGhvZCBtdXN0IG9ubHkgYmUgY2FsbGVkIHdpdGggYSBsb2NhdGlvblxuICAgIC8vIGFyZ3VtZW50IHRoYXQgY29ycmVzcG9uZHMgdG8gYSBrbm93biBjYXRjaCBibG9jay5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbGxlZ2FsIGNhdGNoIGF0dGVtcHRcIik7XG4gIH0sXG5cbiAgZGVsZWdhdGVZaWVsZDogZnVuY3Rpb24gKGl0ZXJhYmxlLCByZXN1bHROYW1lLCBuZXh0TG9jKSB7XG4gICAgdGhpcy5kZWxlZ2F0ZSA9IHtcbiAgICAgIGl0ZXJhdG9yOiB2YWx1ZXMoaXRlcmFibGUpLFxuICAgICAgcmVzdWx0TmFtZTogcmVzdWx0TmFtZSxcbiAgICAgIG5leHRMb2M6IG5leHRMb2NcbiAgICB9O1xuXG4gICAgcmV0dXJuIENvbnRpbnVlU2VudGluZWw7XG4gIH1cbn07XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4gLyohXG4gICogaHR0cHM6Ly9naXRodWIuY29tL3BhdWxtaWxsci9lczYtc2hpbVxuICAqIEBsaWNlbnNlIGVzNi1zaGltIENvcHlyaWdodCAyMDEzLTIwMTQgYnkgUGF1bCBNaWxsZXIgKGh0dHA6Ly9wYXVsbWlsbHIuY29tKVxuICAqICAgYW5kIGNvbnRyaWJ1dG9ycywgIE1JVCBMaWNlbnNlXG4gICogZXM2LXNoaW06IHYwLjIxLjBcbiAgKiBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3BhdWxtaWxsci9lczYtc2hpbS9ibG9iL21hc3Rlci9MSUNFTlNFXG4gICogRGV0YWlscyBhbmQgZG9jdW1lbnRhdGlvbjpcbiAgKiBodHRwczovL2dpdGh1Yi5jb20vcGF1bG1pbGxyL2VzNi1zaGltL1xuICAqL1xuXG4vLyBVTUQgKFVuaXZlcnNhbCBNb2R1bGUgRGVmaW5pdGlvbilcbi8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vdW1kanMvdW1kL2Jsb2IvbWFzdGVyL3JldHVybkV4cG9ydHMuanNcbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICAvLyBOb2RlLiBEb2VzIG5vdCB3b3JrIHdpdGggc3RyaWN0IENvbW1vbkpTLCBidXRcbiAgICAvLyBvbmx5IENvbW1vbkpTLWxpa2UgZW52aXJvbWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLFxuICAgIC8vIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIHJvb3QucmV0dXJuRXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgaXNDYWxsYWJsZVdpdGhvdXROZXcgPSBmdW5jdGlvbiAoZnVuYykge1xuICAgIHRyeSB7IGZ1bmMoKTsgfVxuICAgIGNhdGNoIChlKSB7IHJldHVybiBmYWxzZTsgfVxuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIHZhciBzdXBwb3J0c1N1YmNsYXNzaW5nID0gZnVuY3Rpb24gKEMsIGYpIHtcbiAgICAvKiBqc2hpbnQgcHJvdG86dHJ1ZSAqL1xuICAgIHRyeSB7XG4gICAgICB2YXIgU3ViID0gZnVuY3Rpb24gKCkgeyBDLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7IH07XG4gICAgICBpZiAoIVN1Yi5fX3Byb3RvX18pIHsgcmV0dXJuIGZhbHNlOyAvKiBza2lwIHRlc3Qgb24gSUUgPCAxMSAqLyB9XG4gICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YoU3ViLCBDKTtcbiAgICAgIFN1Yi5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEMucHJvdG90eXBlLCB7XG4gICAgICAgIGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBDIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGYoU3ViKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuXG4gIHZhciBhcmVQcm9wZXJ0eURlc2NyaXB0b3JzU3VwcG9ydGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoe30sICd4Jywge30pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkgeyAvKiB0aGlzIGlzIElFIDguICovXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuXG4gIHZhciBzdGFydHNXaXRoUmVqZWN0c1JlZ2V4ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciByZWplY3RzUmVnZXggPSBmYWxzZTtcbiAgICBpZiAoU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoKSB7XG4gICAgICB0cnkge1xuICAgICAgICAnL2EvJy5zdGFydHNXaXRoKC9hLyk7XG4gICAgICB9IGNhdGNoIChlKSB7IC8qIHRoaXMgaXMgc3BlYyBjb21wbGlhbnQgKi9cbiAgICAgICAgcmVqZWN0c1JlZ2V4ID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlamVjdHNSZWdleDtcbiAgfTtcblxuICAvKmpzaGludCBldmlsOiB0cnVlICovXG4gIHZhciBnZXRHbG9iYWwgPSBuZXcgRnVuY3Rpb24oJ3JldHVybiB0aGlzOycpO1xuICAvKmpzaGludCBldmlsOiBmYWxzZSAqL1xuXG4gIHZhciBnbG9iYWxzID0gZ2V0R2xvYmFsKCk7XG4gIHZhciBnbG9iYWxfaXNGaW5pdGUgPSBnbG9iYWxzLmlzRmluaXRlO1xuICB2YXIgc3VwcG9ydHNEZXNjcmlwdG9ycyA9ICEhT2JqZWN0LmRlZmluZVByb3BlcnR5ICYmIGFyZVByb3BlcnR5RGVzY3JpcHRvcnNTdXBwb3J0ZWQoKTtcbiAgdmFyIHN0YXJ0c1dpdGhJc0NvbXBsaWFudCA9IHN0YXJ0c1dpdGhSZWplY3RzUmVnZXgoKTtcbiAgdmFyIF9zbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbiAgdmFyIF9pbmRleE9mID0gU3RyaW5nLnByb3RvdHlwZS5pbmRleE9mO1xuICB2YXIgX3RvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbiAgdmFyIF9oYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG4gIHZhciBBcnJheUl0ZXJhdG9yOyAvLyBtYWtlIG91ciBpbXBsZW1lbnRhdGlvbiBwcml2YXRlXG5cbiAgdmFyIGRlZmluZVByb3BlcnR5ID0gZnVuY3Rpb24gKG9iamVjdCwgbmFtZSwgdmFsdWUsIGZvcmNlKSB7XG4gICAgaWYgKCFmb3JjZSAmJiBuYW1lIGluIG9iamVjdCkgeyByZXR1cm47IH1cbiAgICBpZiAoc3VwcG9ydHNEZXNjcmlwdG9ycykge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgbmFtZSwge1xuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgdmFsdWU6IHZhbHVlXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqZWN0W25hbWVdID0gdmFsdWU7XG4gICAgfVxuICB9O1xuXG4gIC8vIERlZmluZSBjb25maWd1cmFibGUsIHdyaXRhYmxlIGFuZCBub24tZW51bWVyYWJsZSBwcm9wc1xuICAvLyBpZiB0aGV5IGRvbuKAmXQgZXhpc3QuXG4gIHZhciBkZWZpbmVQcm9wZXJ0aWVzID0gZnVuY3Rpb24gKG9iamVjdCwgbWFwKSB7XG4gICAgT2JqZWN0LmtleXMobWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICB2YXIgbWV0aG9kID0gbWFwW25hbWVdO1xuICAgICAgZGVmaW5lUHJvcGVydHkob2JqZWN0LCBuYW1lLCBtZXRob2QsIGZhbHNlKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBTaW1wbGUgc2hpbSBmb3IgT2JqZWN0LmNyZWF0ZSBvbiBFUzMgYnJvd3NlcnNcbiAgLy8gKHVubGlrZSByZWFsIHNoaW0sIG5vIGF0dGVtcHQgdG8gc3VwcG9ydCBgcHJvdG90eXBlID09PSBudWxsYClcbiAgdmFyIGNyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24gKHByb3RvdHlwZSwgcHJvcGVydGllcykge1xuICAgIGZ1bmN0aW9uIFR5cGUoKSB7fVxuICAgIFR5cGUucHJvdG90eXBlID0gcHJvdG90eXBlO1xuICAgIHZhciBvYmplY3QgPSBuZXcgVHlwZSgpO1xuICAgIGlmICh0eXBlb2YgcHJvcGVydGllcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGRlZmluZVByb3BlcnRpZXMob2JqZWN0LCBwcm9wZXJ0aWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfTtcblxuICAvLyBUaGlzIGlzIGEgcHJpdmF0ZSBuYW1lIGluIHRoZSBlczYgc3BlYywgZXF1YWwgdG8gJ1tTeW1ib2wuaXRlcmF0b3JdJ1xuICAvLyB3ZSdyZSBnb2luZyB0byB1c2UgYW4gYXJiaXRyYXJ5IF8tcHJlZml4ZWQgbmFtZSB0byBtYWtlIG91ciBzaGltc1xuICAvLyB3b3JrIHByb3Blcmx5IHdpdGggZWFjaCBvdGhlciwgZXZlbiB0aG91Z2ggd2UgZG9uJ3QgaGF2ZSBmdWxsIEl0ZXJhdG9yXG4gIC8vIHN1cHBvcnQuICBUaGF0IGlzLCBgQXJyYXkuZnJvbShtYXAua2V5cygpKWAgd2lsbCB3b3JrLCBidXQgd2UgZG9uJ3RcbiAgLy8gcHJldGVuZCB0byBleHBvcnQgYSBcInJlYWxcIiBJdGVyYXRvciBpbnRlcmZhY2UuXG4gIHZhciAkaXRlcmF0b3IkID0gKHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgU3ltYm9sLml0ZXJhdG9yKSB8fCAnX2VzNi1zaGltIGl0ZXJhdG9yXyc7XG4gIC8vIEZpcmVmb3ggc2hpcHMgYSBwYXJ0aWFsIGltcGxlbWVudGF0aW9uIHVzaW5nIHRoZSBuYW1lIEBAaXRlcmF0b3IuXG4gIC8vIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTkwNzA3NyNjMTRcbiAgLy8gU28gdXNlIHRoYXQgbmFtZSBpZiB3ZSBkZXRlY3QgaXQuXG4gIGlmIChnbG9iYWxzLlNldCAmJiB0eXBlb2YgbmV3IGdsb2JhbHMuU2V0KClbJ0BAaXRlcmF0b3InXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICRpdGVyYXRvciQgPSAnQEBpdGVyYXRvcic7XG4gIH1cbiAgdmFyIGFkZEl0ZXJhdG9yID0gZnVuY3Rpb24gKHByb3RvdHlwZSwgaW1wbCkge1xuICAgIGlmICghaW1wbCkgeyBpbXBsID0gZnVuY3Rpb24gaXRlcmF0b3IoKSB7IHJldHVybiB0aGlzOyB9OyB9XG4gICAgdmFyIG8gPSB7fTtcbiAgICBvWyRpdGVyYXRvciRdID0gaW1wbDtcbiAgICBkZWZpbmVQcm9wZXJ0aWVzKHByb3RvdHlwZSwgbyk7XG4gICAgLyoganNoaW50IG5vdHlwZW9mOiB0cnVlICovXG4gICAgaWYgKCFwcm90b3R5cGVbJGl0ZXJhdG9yJF0gJiYgdHlwZW9mICRpdGVyYXRvciQgPT09ICdzeW1ib2wnKSB7XG4gICAgICAvLyBpbXBsZW1lbnRhdGlvbnMgYXJlIGJ1Z2d5IHdoZW4gJGl0ZXJhdG9yJCBpcyBhIFN5bWJvbFxuICAgICAgcHJvdG90eXBlWyRpdGVyYXRvciRdID0gaW1wbDtcbiAgICB9XG4gIH07XG5cbiAgLy8gdGFrZW4gZGlyZWN0bHkgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vbGpoYXJiL2lzLWFyZ3VtZW50cy9ibG9iL21hc3Rlci9pbmRleC5qc1xuICAvLyBjYW4gYmUgcmVwbGFjZWQgd2l0aCByZXF1aXJlKCdpcy1hcmd1bWVudHMnKSBpZiB3ZSBldmVyIHVzZSBhIGJ1aWxkIHByb2Nlc3MgaW5zdGVhZFxuICB2YXIgaXNBcmd1bWVudHMgPSBmdW5jdGlvbiBpc0FyZ3VtZW50cyh2YWx1ZSkge1xuICAgIHZhciBzdHIgPSBfdG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gICAgdmFyIHJlc3VsdCA9IHN0ciA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG4gICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgIHJlc3VsdCA9IHN0ciAhPT0gJ1tvYmplY3QgQXJyYXldJyAmJlxuICAgICAgICB2YWx1ZSAhPT0gbnVsbCAmJlxuICAgICAgICB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmXG4gICAgICAgIHR5cGVvZiB2YWx1ZS5sZW5ndGggPT09ICdudW1iZXInICYmXG4gICAgICAgIHZhbHVlLmxlbmd0aCA+PSAwICYmXG4gICAgICAgIF90b1N0cmluZy5jYWxsKHZhbHVlLmNhbGxlZSkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgdmFyIGVtdWxhdGVFUzZjb25zdHJ1Y3QgPSBmdW5jdGlvbiAobykge1xuICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KG8pKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ2JhZCBvYmplY3QnKTsgfVxuICAgIC8vIGVzNSBhcHByb3hpbWF0aW9uIHRvIGVzNiBzdWJjbGFzcyBzZW1hbnRpY3M6IGluIGVzNiwgJ25ldyBGb28nXG4gICAgLy8gd291bGQgaW52b2tlIEZvby5AQGNyZWF0ZSB0byBhbGxvY2F0aW9uL2luaXRpYWxpemUgdGhlIG5ldyBvYmplY3QuXG4gICAgLy8gSW4gZXM1IHdlIGp1c3QgZ2V0IHRoZSBwbGFpbiBvYmplY3QuICBTbyBpZiB3ZSBkZXRlY3QgYW5cbiAgICAvLyB1bmluaXRpYWxpemVkIG9iamVjdCwgaW52b2tlIG8uY29uc3RydWN0b3IuQEBjcmVhdGVcbiAgICBpZiAoIW8uX2VzNmNvbnN0cnVjdCkge1xuICAgICAgaWYgKG8uY29uc3RydWN0b3IgJiYgRVMuSXNDYWxsYWJsZShvLmNvbnN0cnVjdG9yWydAQGNyZWF0ZSddKSkge1xuICAgICAgICBvID0gby5jb25zdHJ1Y3RvclsnQEBjcmVhdGUnXShvKTtcbiAgICAgIH1cbiAgICAgIGRlZmluZVByb3BlcnRpZXMobywgeyBfZXM2Y29uc3RydWN0OiB0cnVlIH0pO1xuICAgIH1cbiAgICByZXR1cm4gbztcbiAgfTtcblxuICB2YXIgRVMgPSB7XG4gICAgQ2hlY2tPYmplY3RDb2VyY2libGU6IGZ1bmN0aW9uICh4LCBvcHRNZXNzYWdlKSB7XG4gICAgICAvKiBqc2hpbnQgZXFudWxsOnRydWUgKi9cbiAgICAgIGlmICh4ID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihvcHRNZXNzYWdlIHx8ICdDYW5ub3QgY2FsbCBtZXRob2Qgb24gJyArIHgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHg7XG4gICAgfSxcblxuICAgIFR5cGVJc09iamVjdDogZnVuY3Rpb24gKHgpIHtcbiAgICAgIC8qIGpzaGludCBlcW51bGw6dHJ1ZSAqL1xuICAgICAgLy8gdGhpcyBpcyBleHBlbnNpdmUgd2hlbiBpdCByZXR1cm5zIGZhbHNlOyB1c2UgdGhpcyBmdW5jdGlvblxuICAgICAgLy8gd2hlbiB5b3UgZXhwZWN0IGl0IHRvIHJldHVybiB0cnVlIGluIHRoZSBjb21tb24gY2FzZS5cbiAgICAgIHJldHVybiB4ICE9IG51bGwgJiYgT2JqZWN0KHgpID09PSB4O1xuICAgIH0sXG5cbiAgICBUb09iamVjdDogZnVuY3Rpb24gKG8sIG9wdE1lc3NhZ2UpIHtcbiAgICAgIHJldHVybiBPYmplY3QoRVMuQ2hlY2tPYmplY3RDb2VyY2libGUobywgb3B0TWVzc2FnZSkpO1xuICAgIH0sXG5cbiAgICBJc0NhbGxhYmxlOiBmdW5jdGlvbiAoeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nICYmXG4gICAgICAgIC8vIHNvbWUgdmVyc2lvbnMgb2YgSUUgc2F5IHRoYXQgdHlwZW9mIC9hYmMvID09PSAnZnVuY3Rpb24nXG4gICAgICAgIF90b1N0cmluZy5jYWxsKHgpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuICAgIH0sXG5cbiAgICBUb0ludDMyOiBmdW5jdGlvbiAoeCkge1xuICAgICAgcmV0dXJuIHggPj4gMDtcbiAgICB9LFxuXG4gICAgVG9VaW50MzI6IGZ1bmN0aW9uICh4KSB7XG4gICAgICByZXR1cm4geCA+Pj4gMDtcbiAgICB9LFxuXG4gICAgVG9JbnRlZ2VyOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhciBudW1iZXIgPSArdmFsdWU7XG4gICAgICBpZiAoTnVtYmVyLmlzTmFOKG51bWJlcikpIHsgcmV0dXJuIDA7IH1cbiAgICAgIGlmIChudW1iZXIgPT09IDAgfHwgIU51bWJlci5pc0Zpbml0ZShudW1iZXIpKSB7IHJldHVybiBudW1iZXI7IH1cbiAgICAgIHJldHVybiAobnVtYmVyID4gMCA/IDEgOiAtMSkgKiBNYXRoLmZsb29yKE1hdGguYWJzKG51bWJlcikpO1xuICAgIH0sXG5cbiAgICBUb0xlbmd0aDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB2YXIgbGVuID0gRVMuVG9JbnRlZ2VyKHZhbHVlKTtcbiAgICAgIGlmIChsZW4gPD0gMCkgeyByZXR1cm4gMDsgfSAvLyBpbmNsdWRlcyBjb252ZXJ0aW5nIC0wIHRvICswXG4gICAgICBpZiAobGVuID4gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIpIHsgcmV0dXJuIE51bWJlci5NQVhfU0FGRV9JTlRFR0VSOyB9XG4gICAgICByZXR1cm4gbGVuO1xuICAgIH0sXG5cbiAgICBTYW1lVmFsdWU6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICBpZiAoYSA9PT0gYikge1xuICAgICAgICAvLyAwID09PSAtMCwgYnV0IHRoZXkgYXJlIG5vdCBpZGVudGljYWwuXG4gICAgICAgIGlmIChhID09PSAwKSB7IHJldHVybiAxIC8gYSA9PT0gMSAvIGI7IH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gTnVtYmVyLmlzTmFOKGEpICYmIE51bWJlci5pc05hTihiKTtcbiAgICB9LFxuXG4gICAgU2FtZVZhbHVlWmVybzogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgIC8vIHNhbWUgYXMgU2FtZVZhbHVlIGV4Y2VwdCBmb3IgU2FtZVZhbHVlWmVybygrMCwgLTApID09IHRydWVcbiAgICAgIHJldHVybiAoYSA9PT0gYikgfHwgKE51bWJlci5pc05hTihhKSAmJiBOdW1iZXIuaXNOYU4oYikpO1xuICAgIH0sXG5cbiAgICBJc0l0ZXJhYmxlOiBmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIEVTLlR5cGVJc09iamVjdChvKSAmJlxuICAgICAgICAodHlwZW9mIG9bJGl0ZXJhdG9yJF0gIT09ICd1bmRlZmluZWQnIHx8IGlzQXJndW1lbnRzKG8pKTtcbiAgICB9LFxuXG4gICAgR2V0SXRlcmF0b3I6IGZ1bmN0aW9uIChvKSB7XG4gICAgICBpZiAoaXNBcmd1bWVudHMobykpIHtcbiAgICAgICAgLy8gc3BlY2lhbCBjYXNlIHN1cHBvcnQgZm9yIGBhcmd1bWVudHNgXG4gICAgICAgIHJldHVybiBuZXcgQXJyYXlJdGVyYXRvcihvLCAndmFsdWUnKTtcbiAgICAgIH1cbiAgICAgIHZhciBpdEZuID0gb1skaXRlcmF0b3IkXTtcbiAgICAgIGlmICghRVMuSXNDYWxsYWJsZShpdEZuKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCd2YWx1ZSBpcyBub3QgYW4gaXRlcmFibGUnKTtcbiAgICAgIH1cbiAgICAgIHZhciBpdCA9IGl0Rm4uY2FsbChvKTtcbiAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KGl0KSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdiYWQgaXRlcmF0b3InKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpdDtcbiAgICB9LFxuXG4gICAgSXRlcmF0b3JOZXh0OiBmdW5jdGlvbiAoaXQpIHtcbiAgICAgIHZhciByZXN1bHQgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGl0Lm5leHQoYXJndW1lbnRzWzFdKSA6IGl0Lm5leHQoKTtcbiAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KHJlc3VsdCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYmFkIGl0ZXJhdG9yJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICBDb25zdHJ1Y3Q6IGZ1bmN0aW9uIChDLCBhcmdzKSB7XG4gICAgICAvLyBDcmVhdGVGcm9tQ29uc3RydWN0b3JcbiAgICAgIHZhciBvYmo7XG4gICAgICBpZiAoRVMuSXNDYWxsYWJsZShDWydAQGNyZWF0ZSddKSkge1xuICAgICAgICBvYmogPSBDWydAQGNyZWF0ZSddKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBPcmRpbmFyeUNyZWF0ZUZyb21Db25zdHJ1Y3RvclxuICAgICAgICBvYmogPSBjcmVhdGUoQy5wcm90b3R5cGUgfHwgbnVsbCk7XG4gICAgICB9XG4gICAgICAvLyBNYXJrIHRoYXQgd2UndmUgdXNlZCB0aGUgZXM2IGNvbnN0cnVjdCBwYXRoXG4gICAgICAvLyAoc2VlIGVtdWxhdGVFUzZjb25zdHJ1Y3QpXG4gICAgICBkZWZpbmVQcm9wZXJ0aWVzKG9iaiwgeyBfZXM2Y29uc3RydWN0OiB0cnVlIH0pO1xuICAgICAgLy8gQ2FsbCB0aGUgY29uc3RydWN0b3IuXG4gICAgICB2YXIgcmVzdWx0ID0gQy5hcHBseShvYmosIGFyZ3MpO1xuICAgICAgcmV0dXJuIEVTLlR5cGVJc09iamVjdChyZXN1bHQpID8gcmVzdWx0IDogb2JqO1xuICAgIH1cbiAgfTtcblxuICB2YXIgbnVtYmVyQ29udmVyc2lvbiA9IChmdW5jdGlvbiAoKSB7XG4gICAgLy8gZnJvbSBodHRwczovL2dpdGh1Yi5jb20vaW5leG9yYWJsZXRhc2gvcG9seWZpbGwvYmxvYi9tYXN0ZXIvdHlwZWRhcnJheS5qcyNMMTc2LUwyNjZcbiAgICAvLyB3aXRoIHBlcm1pc3Npb24gYW5kIGxpY2Vuc2UsIHBlciBodHRwczovL3R3aXR0ZXIuY29tL2luZXhvcmFibGV0YXNoL3N0YXR1cy8zNzIyMDY1MDk1NDA2NTkyMDBcblxuICAgIGZ1bmN0aW9uIHJvdW5kVG9FdmVuKG4pIHtcbiAgICAgIHZhciB3ID0gTWF0aC5mbG9vcihuKSwgZiA9IG4gLSB3O1xuICAgICAgaWYgKGYgPCAwLjUpIHtcbiAgICAgICAgcmV0dXJuIHc7XG4gICAgICB9XG4gICAgICBpZiAoZiA+IDAuNSkge1xuICAgICAgICByZXR1cm4gdyArIDE7XG4gICAgICB9XG4gICAgICByZXR1cm4gdyAlIDIgPyB3ICsgMSA6IHc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFja0lFRUU3NTQodiwgZWJpdHMsIGZiaXRzKSB7XG4gICAgICB2YXIgYmlhcyA9ICgxIDw8IChlYml0cyAtIDEpKSAtIDEsXG4gICAgICAgIHMsIGUsIGYsXG4gICAgICAgIGksIGJpdHMsIHN0ciwgYnl0ZXM7XG5cbiAgICAgIC8vIENvbXB1dGUgc2lnbiwgZXhwb25lbnQsIGZyYWN0aW9uXG4gICAgICBpZiAodiAhPT0gdikge1xuICAgICAgICAvLyBOYU5cbiAgICAgICAgLy8gaHR0cDovL2Rldi53My5vcmcvMjAwNi93ZWJhcGkvV2ViSURMLyNlcy10eXBlLW1hcHBpbmdcbiAgICAgICAgZSA9ICgxIDw8IGViaXRzKSAtIDE7XG4gICAgICAgIGYgPSBNYXRoLnBvdygyLCBmYml0cyAtIDEpO1xuICAgICAgICBzID0gMDtcbiAgICAgIH0gZWxzZSBpZiAodiA9PT0gSW5maW5pdHkgfHwgdiA9PT0gLUluZmluaXR5KSB7XG4gICAgICAgIGUgPSAoMSA8PCBlYml0cykgLSAxO1xuICAgICAgICBmID0gMDtcbiAgICAgICAgcyA9ICh2IDwgMCkgPyAxIDogMDtcbiAgICAgIH0gZWxzZSBpZiAodiA9PT0gMCkge1xuICAgICAgICBlID0gMDtcbiAgICAgICAgZiA9IDA7XG4gICAgICAgIHMgPSAoMSAvIHYgPT09IC1JbmZpbml0eSkgPyAxIDogMDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMgPSB2IDwgMDtcbiAgICAgICAgdiA9IE1hdGguYWJzKHYpO1xuXG4gICAgICAgIGlmICh2ID49IE1hdGgucG93KDIsIDEgLSBiaWFzKSkge1xuICAgICAgICAgIGUgPSBNYXRoLm1pbihNYXRoLmZsb29yKE1hdGgubG9nKHYpIC8gTWF0aC5MTjIpLCAxMDIzKTtcbiAgICAgICAgICBmID0gcm91bmRUb0V2ZW4odiAvIE1hdGgucG93KDIsIGUpICogTWF0aC5wb3coMiwgZmJpdHMpKTtcbiAgICAgICAgICBpZiAoZiAvIE1hdGgucG93KDIsIGZiaXRzKSA+PSAyKSB7XG4gICAgICAgICAgICBlID0gZSArIDE7XG4gICAgICAgICAgICBmID0gMTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGUgPiBiaWFzKSB7XG4gICAgICAgICAgICAvLyBPdmVyZmxvd1xuICAgICAgICAgICAgZSA9ICgxIDw8IGViaXRzKSAtIDE7XG4gICAgICAgICAgICBmID0gMDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTm9ybWFsXG4gICAgICAgICAgICBlID0gZSArIGJpYXM7XG4gICAgICAgICAgICBmID0gZiAtIE1hdGgucG93KDIsIGZiaXRzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gU3Vibm9ybWFsXG4gICAgICAgICAgZSA9IDA7XG4gICAgICAgICAgZiA9IHJvdW5kVG9FdmVuKHYgLyBNYXRoLnBvdygyLCAxIC0gYmlhcyAtIGZiaXRzKSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gUGFjayBzaWduLCBleHBvbmVudCwgZnJhY3Rpb25cbiAgICAgIGJpdHMgPSBbXTtcbiAgICAgIGZvciAoaSA9IGZiaXRzOyBpOyBpIC09IDEpIHtcbiAgICAgICAgYml0cy5wdXNoKGYgJSAyID8gMSA6IDApO1xuICAgICAgICBmID0gTWF0aC5mbG9vcihmIC8gMik7XG4gICAgICB9XG4gICAgICBmb3IgKGkgPSBlYml0czsgaTsgaSAtPSAxKSB7XG4gICAgICAgIGJpdHMucHVzaChlICUgMiA/IDEgOiAwKTtcbiAgICAgICAgZSA9IE1hdGguZmxvb3IoZSAvIDIpO1xuICAgICAgfVxuICAgICAgYml0cy5wdXNoKHMgPyAxIDogMCk7XG4gICAgICBiaXRzLnJldmVyc2UoKTtcbiAgICAgIHN0ciA9IGJpdHMuam9pbignJyk7XG5cbiAgICAgIC8vIEJpdHMgdG8gYnl0ZXNcbiAgICAgIGJ5dGVzID0gW107XG4gICAgICB3aGlsZSAoc3RyLmxlbmd0aCkge1xuICAgICAgICBieXRlcy5wdXNoKHBhcnNlSW50KHN0ci5zbGljZSgwLCA4KSwgMikpO1xuICAgICAgICBzdHIgPSBzdHIuc2xpY2UoOCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYnl0ZXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdW5wYWNrSUVFRTc1NChieXRlcywgZWJpdHMsIGZiaXRzKSB7XG4gICAgICAvLyBCeXRlcyB0byBiaXRzXG4gICAgICB2YXIgYml0cyA9IFtdLCBpLCBqLCBiLCBzdHIsXG4gICAgICAgICAgYmlhcywgcywgZSwgZjtcblxuICAgICAgZm9yIChpID0gYnl0ZXMubGVuZ3RoOyBpOyBpIC09IDEpIHtcbiAgICAgICAgYiA9IGJ5dGVzW2kgLSAxXTtcbiAgICAgICAgZm9yIChqID0gODsgajsgaiAtPSAxKSB7XG4gICAgICAgICAgYml0cy5wdXNoKGIgJSAyID8gMSA6IDApO1xuICAgICAgICAgIGIgPSBiID4+IDE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGJpdHMucmV2ZXJzZSgpO1xuICAgICAgc3RyID0gYml0cy5qb2luKCcnKTtcblxuICAgICAgLy8gVW5wYWNrIHNpZ24sIGV4cG9uZW50LCBmcmFjdGlvblxuICAgICAgYmlhcyA9ICgxIDw8IChlYml0cyAtIDEpKSAtIDE7XG4gICAgICBzID0gcGFyc2VJbnQoc3RyLnNsaWNlKDAsIDEpLCAyKSA/IC0xIDogMTtcbiAgICAgIGUgPSBwYXJzZUludChzdHIuc2xpY2UoMSwgMSArIGViaXRzKSwgMik7XG4gICAgICBmID0gcGFyc2VJbnQoc3RyLnNsaWNlKDEgKyBlYml0cyksIDIpO1xuXG4gICAgICAvLyBQcm9kdWNlIG51bWJlclxuICAgICAgaWYgKGUgPT09ICgxIDw8IGViaXRzKSAtIDEpIHtcbiAgICAgICAgcmV0dXJuIGYgIT09IDAgPyBOYU4gOiBzICogSW5maW5pdHk7XG4gICAgICB9IGVsc2UgaWYgKGUgPiAwKSB7XG4gICAgICAgIC8vIE5vcm1hbGl6ZWRcbiAgICAgICAgcmV0dXJuIHMgKiBNYXRoLnBvdygyLCBlIC0gYmlhcykgKiAoMSArIGYgLyBNYXRoLnBvdygyLCBmYml0cykpO1xuICAgICAgfSBlbHNlIGlmIChmICE9PSAwKSB7XG4gICAgICAgIC8vIERlbm9ybWFsaXplZFxuICAgICAgICByZXR1cm4gcyAqIE1hdGgucG93KDIsIC0oYmlhcyAtIDEpKSAqIChmIC8gTWF0aC5wb3coMiwgZmJpdHMpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBzIDwgMCA/IC0wIDogMDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1bnBhY2tGbG9hdDY0KGIpIHsgcmV0dXJuIHVucGFja0lFRUU3NTQoYiwgMTEsIDUyKTsgfVxuICAgIGZ1bmN0aW9uIHBhY2tGbG9hdDY0KHYpIHsgcmV0dXJuIHBhY2tJRUVFNzU0KHYsIDExLCA1Mik7IH1cbiAgICBmdW5jdGlvbiB1bnBhY2tGbG9hdDMyKGIpIHsgcmV0dXJuIHVucGFja0lFRUU3NTQoYiwgOCwgMjMpOyB9XG4gICAgZnVuY3Rpb24gcGFja0Zsb2F0MzIodikgeyByZXR1cm4gcGFja0lFRUU3NTQodiwgOCwgMjMpOyB9XG5cbiAgICB2YXIgY29udmVyc2lvbnMgPSB7XG4gICAgICB0b0Zsb2F0MzI6IGZ1bmN0aW9uIChudW0pIHsgcmV0dXJuIHVucGFja0Zsb2F0MzIocGFja0Zsb2F0MzIobnVtKSk7IH1cbiAgICB9O1xuICAgIGlmICh0eXBlb2YgRmxvYXQzMkFycmF5ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgdmFyIGZsb2F0MzJhcnJheSA9IG5ldyBGbG9hdDMyQXJyYXkoMSk7XG4gICAgICBjb252ZXJzaW9ucy50b0Zsb2F0MzIgPSBmdW5jdGlvbiAobnVtKSB7XG4gICAgICAgIGZsb2F0MzJhcnJheVswXSA9IG51bTtcbiAgICAgICAgcmV0dXJuIGZsb2F0MzJhcnJheVswXTtcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBjb252ZXJzaW9ucztcbiAgfSgpKTtcblxuICBkZWZpbmVQcm9wZXJ0aWVzKFN0cmluZywge1xuICAgIGZyb21Db2RlUG9pbnQ6IGZ1bmN0aW9uIGZyb21Db2RlUG9pbnQoXykgeyAvLyBsZW5ndGggPSAxXG4gICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICB2YXIgbmV4dDtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbmV4dCA9IE51bWJlcihhcmd1bWVudHNbaV0pO1xuICAgICAgICBpZiAoIUVTLlNhbWVWYWx1ZShuZXh0LCBFUy5Ub0ludGVnZXIobmV4dCkpIHx8IG5leHQgPCAwIHx8IG5leHQgPiAweDEwRkZGRikge1xuICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIGNvZGUgcG9pbnQgJyArIG5leHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5leHQgPCAweDEwMDAwKSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2goU3RyaW5nLmZyb21DaGFyQ29kZShuZXh0KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbmV4dCAtPSAweDEwMDAwO1xuICAgICAgICAgIHJlc3VsdC5wdXNoKFN0cmluZy5mcm9tQ2hhckNvZGUoKG5leHQgPj4gMTApICsgMHhEODAwKSk7XG4gICAgICAgICAgcmVzdWx0LnB1c2goU3RyaW5nLmZyb21DaGFyQ29kZSgobmV4dCAlIDB4NDAwKSArIDB4REMwMCkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0LmpvaW4oJycpO1xuICAgIH0sXG5cbiAgICByYXc6IGZ1bmN0aW9uIHJhdyhjYWxsU2l0ZSkgeyAvLyByYXcubGVuZ3RoPT09MVxuICAgICAgdmFyIGNvb2tlZCA9IEVTLlRvT2JqZWN0KGNhbGxTaXRlLCAnYmFkIGNhbGxTaXRlJyk7XG4gICAgICB2YXIgcmF3VmFsdWUgPSBjb29rZWQucmF3O1xuICAgICAgdmFyIHJhd1N0cmluZyA9IEVTLlRvT2JqZWN0KHJhd1ZhbHVlLCAnYmFkIHJhdyB2YWx1ZScpO1xuICAgICAgdmFyIGxlbiA9IHJhd1N0cmluZy5sZW5ndGg7XG4gICAgICB2YXIgbGl0ZXJhbHNlZ21lbnRzID0gRVMuVG9MZW5ndGgobGVuKTtcbiAgICAgIGlmIChsaXRlcmFsc2VnbWVudHMgPD0gMCkge1xuICAgICAgICByZXR1cm4gJyc7XG4gICAgICB9XG5cbiAgICAgIHZhciBzdHJpbmdFbGVtZW50cyA9IFtdO1xuICAgICAgdmFyIG5leHRJbmRleCA9IDA7XG4gICAgICB2YXIgbmV4dEtleSwgbmV4dCwgbmV4dFNlZywgbmV4dFN1YjtcbiAgICAgIHdoaWxlIChuZXh0SW5kZXggPCBsaXRlcmFsc2VnbWVudHMpIHtcbiAgICAgICAgbmV4dEtleSA9IFN0cmluZyhuZXh0SW5kZXgpO1xuICAgICAgICBuZXh0ID0gcmF3U3RyaW5nW25leHRLZXldO1xuICAgICAgICBuZXh0U2VnID0gU3RyaW5nKG5leHQpO1xuICAgICAgICBzdHJpbmdFbGVtZW50cy5wdXNoKG5leHRTZWcpO1xuICAgICAgICBpZiAobmV4dEluZGV4ICsgMSA+PSBsaXRlcmFsc2VnbWVudHMpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBuZXh0ID0gbmV4dEluZGV4ICsgMSA8IGFyZ3VtZW50cy5sZW5ndGggPyBhcmd1bWVudHNbbmV4dEluZGV4ICsgMV0gOiAnJztcbiAgICAgICAgbmV4dFN1YiA9IFN0cmluZyhuZXh0KTtcbiAgICAgICAgc3RyaW5nRWxlbWVudHMucHVzaChuZXh0U3ViKTtcbiAgICAgICAgbmV4dEluZGV4Kys7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RyaW5nRWxlbWVudHMuam9pbignJyk7XG4gICAgfVxuICB9KTtcblxuICAvLyBGaXJlZm94IDMxIHJlcG9ydHMgdGhpcyBmdW5jdGlvbidzIGxlbmd0aCBhcyAwXG4gIC8vIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTEwNjI0ODRcbiAgaWYgKFN0cmluZy5mcm9tQ29kZVBvaW50Lmxlbmd0aCAhPT0gMSkge1xuICAgIHZhciBvcmlnaW5hbEZyb21Db2RlUG9pbnQgPSBTdHJpbmcuZnJvbUNvZGVQb2ludDtcbiAgICBkZWZpbmVQcm9wZXJ0eShTdHJpbmcsICdmcm9tQ29kZVBvaW50JywgZnVuY3Rpb24gKF8pIHsgcmV0dXJuIG9yaWdpbmFsRnJvbUNvZGVQb2ludC5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyB9LCB0cnVlKTtcbiAgfVxuXG4gIHZhciBTdHJpbmdTaGltcyA9IHtcbiAgICAvLyBGYXN0IHJlcGVhdCwgdXNlcyB0aGUgYEV4cG9uZW50aWF0aW9uIGJ5IHNxdWFyaW5nYCBhbGdvcml0aG0uXG4gICAgLy8gUGVyZjogaHR0cDovL2pzcGVyZi5jb20vc3RyaW5nLXJlcGVhdDIvMlxuICAgIHJlcGVhdDogKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciByZXBlYXQgPSBmdW5jdGlvbiAocywgdGltZXMpIHtcbiAgICAgICAgaWYgKHRpbWVzIDwgMSkgeyByZXR1cm4gJyc7IH1cbiAgICAgICAgaWYgKHRpbWVzICUgMikgeyByZXR1cm4gcmVwZWF0KHMsIHRpbWVzIC0gMSkgKyBzOyB9XG4gICAgICAgIHZhciBoYWxmID0gcmVwZWF0KHMsIHRpbWVzIC8gMik7XG4gICAgICAgIHJldHVybiBoYWxmICsgaGFsZjtcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBmdW5jdGlvbiAodGltZXMpIHtcbiAgICAgICAgdmFyIHRoaXNTdHIgPSBTdHJpbmcoRVMuQ2hlY2tPYmplY3RDb2VyY2libGUodGhpcykpO1xuICAgICAgICB0aW1lcyA9IEVTLlRvSW50ZWdlcih0aW1lcyk7XG4gICAgICAgIGlmICh0aW1lcyA8IDAgfHwgdGltZXMgPT09IEluZmluaXR5KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgU3RyaW5nI3JlcGVhdCB2YWx1ZScpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXBlYXQodGhpc1N0ciwgdGltZXMpO1xuICAgICAgfTtcbiAgICB9KSgpLFxuXG4gICAgc3RhcnRzV2l0aDogZnVuY3Rpb24gKHNlYXJjaFN0cikge1xuICAgICAgdmFyIHRoaXNTdHIgPSBTdHJpbmcoRVMuQ2hlY2tPYmplY3RDb2VyY2libGUodGhpcykpO1xuICAgICAgaWYgKF90b1N0cmluZy5jYWxsKHNlYXJjaFN0cikgPT09ICdbb2JqZWN0IFJlZ0V4cF0nKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjYWxsIG1ldGhvZCBcInN0YXJ0c1dpdGhcIiB3aXRoIGEgcmVnZXgnKTtcbiAgICAgIH1cbiAgICAgIHNlYXJjaFN0ciA9IFN0cmluZyhzZWFyY2hTdHIpO1xuICAgICAgdmFyIHN0YXJ0QXJnID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiB2b2lkIDA7XG4gICAgICB2YXIgc3RhcnQgPSBNYXRoLm1heChFUy5Ub0ludGVnZXIoc3RhcnRBcmcpLCAwKTtcbiAgICAgIHJldHVybiB0aGlzU3RyLnNsaWNlKHN0YXJ0LCBzdGFydCArIHNlYXJjaFN0ci5sZW5ndGgpID09PSBzZWFyY2hTdHI7XG4gICAgfSxcblxuICAgIGVuZHNXaXRoOiBmdW5jdGlvbiAoc2VhcmNoU3RyKSB7XG4gICAgICB2YXIgdGhpc1N0ciA9IFN0cmluZyhFUy5DaGVja09iamVjdENvZXJjaWJsZSh0aGlzKSk7XG4gICAgICBpZiAoX3RvU3RyaW5nLmNhbGwoc2VhcmNoU3RyKSA9PT0gJ1tvYmplY3QgUmVnRXhwXScpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ2Fubm90IGNhbGwgbWV0aG9kIFwiZW5kc1dpdGhcIiB3aXRoIGEgcmVnZXgnKTtcbiAgICAgIH1cbiAgICAgIHNlYXJjaFN0ciA9IFN0cmluZyhzZWFyY2hTdHIpO1xuICAgICAgdmFyIHRoaXNMZW4gPSB0aGlzU3RyLmxlbmd0aDtcbiAgICAgIHZhciBwb3NBcmcgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IHZvaWQgMDtcbiAgICAgIHZhciBwb3MgPSB0eXBlb2YgcG9zQXJnID09PSAndW5kZWZpbmVkJyA/IHRoaXNMZW4gOiBFUy5Ub0ludGVnZXIocG9zQXJnKTtcbiAgICAgIHZhciBlbmQgPSBNYXRoLm1pbihNYXRoLm1heChwb3MsIDApLCB0aGlzTGVuKTtcbiAgICAgIHJldHVybiB0aGlzU3RyLnNsaWNlKGVuZCAtIHNlYXJjaFN0ci5sZW5ndGgsIGVuZCkgPT09IHNlYXJjaFN0cjtcbiAgICB9LFxuXG4gICAgaW5jbHVkZXM6IGZ1bmN0aW9uIGluY2x1ZGVzKHNlYXJjaFN0cmluZykge1xuICAgICAgdmFyIHBvc2l0aW9uID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiB2b2lkIDA7XG4gICAgICAvLyBTb21laG93IHRoaXMgdHJpY2sgbWFrZXMgbWV0aG9kIDEwMCUgY29tcGF0IHdpdGggdGhlIHNwZWMuXG4gICAgICByZXR1cm4gX2luZGV4T2YuY2FsbCh0aGlzLCBzZWFyY2hTdHJpbmcsIHBvc2l0aW9uKSAhPT0gLTE7XG4gICAgfSxcblxuICAgIGNvZGVQb2ludEF0OiBmdW5jdGlvbiAocG9zKSB7XG4gICAgICB2YXIgdGhpc1N0ciA9IFN0cmluZyhFUy5DaGVja09iamVjdENvZXJjaWJsZSh0aGlzKSk7XG4gICAgICB2YXIgcG9zaXRpb24gPSBFUy5Ub0ludGVnZXIocG9zKTtcbiAgICAgIHZhciBsZW5ndGggPSB0aGlzU3RyLmxlbmd0aDtcbiAgICAgIGlmIChwb3NpdGlvbiA8IDAgfHwgcG9zaXRpb24gPj0gbGVuZ3RoKSB7IHJldHVybjsgfVxuICAgICAgdmFyIGZpcnN0ID0gdGhpc1N0ci5jaGFyQ29kZUF0KHBvc2l0aW9uKTtcbiAgICAgIHZhciBpc0VuZCA9IChwb3NpdGlvbiArIDEgPT09IGxlbmd0aCk7XG4gICAgICBpZiAoZmlyc3QgPCAweEQ4MDAgfHwgZmlyc3QgPiAweERCRkYgfHwgaXNFbmQpIHsgcmV0dXJuIGZpcnN0OyB9XG4gICAgICB2YXIgc2Vjb25kID0gdGhpc1N0ci5jaGFyQ29kZUF0KHBvc2l0aW9uICsgMSk7XG4gICAgICBpZiAoc2Vjb25kIDwgMHhEQzAwIHx8IHNlY29uZCA+IDB4REZGRikgeyByZXR1cm4gZmlyc3Q7IH1cbiAgICAgIHJldHVybiAoKGZpcnN0IC0gMHhEODAwKSAqIDEwMjQpICsgKHNlY29uZCAtIDB4REMwMCkgKyAweDEwMDAwO1xuICAgIH1cbiAgfTtcbiAgZGVmaW5lUHJvcGVydGllcyhTdHJpbmcucHJvdG90eXBlLCBTdHJpbmdTaGltcyk7XG5cbiAgdmFyIGhhc1N0cmluZ1RyaW1CdWcgPSAnXFx1MDA4NScudHJpbSgpLmxlbmd0aCAhPT0gMTtcbiAgaWYgKGhhc1N0cmluZ1RyaW1CdWcpIHtcbiAgICB2YXIgb3JpZ2luYWxTdHJpbmdUcmltID0gU3RyaW5nLnByb3RvdHlwZS50cmltO1xuICAgIGRlbGV0ZSBTdHJpbmcucHJvdG90eXBlLnRyaW07XG4gICAgLy8gd2hpdGVzcGFjZSBmcm9tOiBodHRwOi8vZXM1LmdpdGh1Yi5pby8jeDE1LjUuNC4yMFxuICAgIC8vIGltcGxlbWVudGF0aW9uIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2VzLXNoaW1zL2VzNS1zaGltL2Jsb2IvdjMuNC4wL2VzNS1zaGltLmpzI0wxMzA0LUwxMzI0XG4gICAgdmFyIHdzID0gW1xuICAgICAgJ1xceDA5XFx4MEFcXHgwQlxceDBDXFx4MERcXHgyMFxceEEwXFx1MTY4MFxcdTE4MEVcXHUyMDAwXFx1MjAwMVxcdTIwMDJcXHUyMDAzJyxcbiAgICAgICdcXHUyMDA0XFx1MjAwNVxcdTIwMDZcXHUyMDA3XFx1MjAwOFxcdTIwMDlcXHUyMDBBXFx1MjAyRlxcdTIwNUZcXHUzMDAwXFx1MjAyOCcsXG4gICAgICAnXFx1MjAyOVxcdUZFRkYnXG4gICAgXS5qb2luKCcnKTtcbiAgICB2YXIgdHJpbVJlZ2V4cCA9IG5ldyBSZWdFeHAoJyheWycgKyB3cyArICddKyl8KFsnICsgd3MgKyAnXSskKScsICdnJyk7XG4gICAgZGVmaW5lUHJvcGVydGllcyhTdHJpbmcucHJvdG90eXBlLCB7XG4gICAgICB0cmltOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcyA9PT0gJ3VuZGVmaW5lZCcgfHwgdGhpcyA9PT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW4ndCBjb252ZXJ0IFwiICsgdGhpcyArICcgdG8gb2JqZWN0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFN0cmluZyh0aGlzKS5yZXBsYWNlKHRyaW1SZWdleHAsICcnKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8vIHNlZSBodHRwczovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtc3RyaW5nLnByb3RvdHlwZS1AQGl0ZXJhdG9yXG4gIHZhciBTdHJpbmdJdGVyYXRvciA9IGZ1bmN0aW9uIChzKSB7XG4gICAgdGhpcy5fcyA9IFN0cmluZyhFUy5DaGVja09iamVjdENvZXJjaWJsZShzKSk7XG4gICAgdGhpcy5faSA9IDA7XG4gIH07XG4gIFN0cmluZ0l0ZXJhdG9yLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzID0gdGhpcy5fcywgaSA9IHRoaXMuX2k7XG4gICAgaWYgKHR5cGVvZiBzID09PSAndW5kZWZpbmVkJyB8fCBpID49IHMubGVuZ3RoKSB7XG4gICAgICB0aGlzLl9zID0gdm9pZCAwO1xuICAgICAgcmV0dXJuIHsgdmFsdWU6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xuICAgIH1cbiAgICB2YXIgZmlyc3QgPSBzLmNoYXJDb2RlQXQoaSksIHNlY29uZCwgbGVuO1xuICAgIGlmIChmaXJzdCA8IDB4RDgwMCB8fCBmaXJzdCA+IDB4REJGRiB8fCAoaSArIDEpID09IHMubGVuZ3RoKSB7XG4gICAgICBsZW4gPSAxO1xuICAgIH0gZWxzZSB7XG4gICAgICBzZWNvbmQgPSBzLmNoYXJDb2RlQXQoaSArIDEpO1xuICAgICAgbGVuID0gKHNlY29uZCA8IDB4REMwMCB8fCBzZWNvbmQgPiAweERGRkYpID8gMSA6IDI7XG4gICAgfVxuICAgIHRoaXMuX2kgPSBpICsgbGVuO1xuICAgIHJldHVybiB7IHZhbHVlOiBzLnN1YnN0cihpLCBsZW4pLCBkb25lOiBmYWxzZSB9O1xuICB9O1xuICBhZGRJdGVyYXRvcihTdHJpbmdJdGVyYXRvci5wcm90b3R5cGUpO1xuICBhZGRJdGVyYXRvcihTdHJpbmcucHJvdG90eXBlLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyBTdHJpbmdJdGVyYXRvcih0aGlzKTtcbiAgfSk7XG5cbiAgaWYgKCFzdGFydHNXaXRoSXNDb21wbGlhbnQpIHtcbiAgICAvLyBGaXJlZm94IGhhcyBhIG5vbmNvbXBsaWFudCBzdGFydHNXaXRoIGltcGxlbWVudGF0aW9uXG4gICAgU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoID0gU3RyaW5nU2hpbXMuc3RhcnRzV2l0aDtcbiAgICBTdHJpbmcucHJvdG90eXBlLmVuZHNXaXRoID0gU3RyaW5nU2hpbXMuZW5kc1dpdGg7XG4gIH1cblxuICB2YXIgQXJyYXlTaGltcyA9IHtcbiAgICBmcm9tOiBmdW5jdGlvbiAoaXRlcmFibGUpIHtcbiAgICAgIHZhciBtYXBGbiA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogdm9pZCAwO1xuXG4gICAgICB2YXIgbGlzdCA9IEVTLlRvT2JqZWN0KGl0ZXJhYmxlLCAnYmFkIGl0ZXJhYmxlJyk7XG4gICAgICBpZiAodHlwZW9mIG1hcEZuICE9PSAndW5kZWZpbmVkJyAmJiAhRVMuSXNDYWxsYWJsZShtYXBGbikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJyYXkuZnJvbTogd2hlbiBwcm92aWRlZCwgdGhlIHNlY29uZCBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGhhc1RoaXNBcmcgPSBhcmd1bWVudHMubGVuZ3RoID4gMjtcbiAgICAgIHZhciB0aGlzQXJnID0gaGFzVGhpc0FyZyA/IGFyZ3VtZW50c1syXSA6IHZvaWQgMDtcblxuICAgICAgdmFyIHVzaW5nSXRlcmF0b3IgPSBFUy5Jc0l0ZXJhYmxlKGxpc3QpO1xuICAgICAgLy8gZG9lcyB0aGUgc3BlYyByZWFsbHkgbWVhbiB0aGF0IEFycmF5cyBzaG91bGQgdXNlIEFycmF5SXRlcmF0b3I/XG4gICAgICAvLyBodHRwczovL2J1Z3MuZWNtYXNjcmlwdC5vcmcvc2hvd19idWcuY2dpP2lkPTI0MTZcbiAgICAgIC8vaWYgKEFycmF5LmlzQXJyYXkobGlzdCkpIHsgdXNpbmdJdGVyYXRvcj1mYWxzZTsgfVxuXG4gICAgICB2YXIgbGVuZ3RoO1xuICAgICAgdmFyIHJlc3VsdCwgaSwgdmFsdWU7XG4gICAgICBpZiAodXNpbmdJdGVyYXRvcikge1xuICAgICAgICBpID0gMDtcbiAgICAgICAgcmVzdWx0ID0gRVMuSXNDYWxsYWJsZSh0aGlzKSA/IE9iamVjdChuZXcgdGhpcygpKSA6IFtdO1xuICAgICAgICB2YXIgaXQgPSB1c2luZ0l0ZXJhdG9yID8gRVMuR2V0SXRlcmF0b3IobGlzdCkgOiBudWxsO1xuICAgICAgICB2YXIgaXRlcmF0aW9uVmFsdWU7XG5cbiAgICAgICAgZG8ge1xuICAgICAgICAgIGl0ZXJhdGlvblZhbHVlID0gRVMuSXRlcmF0b3JOZXh0KGl0KTtcbiAgICAgICAgICBpZiAoIWl0ZXJhdGlvblZhbHVlLmRvbmUpIHtcbiAgICAgICAgICAgIHZhbHVlID0gaXRlcmF0aW9uVmFsdWUudmFsdWU7XG4gICAgICAgICAgICBpZiAobWFwRm4pIHtcbiAgICAgICAgICAgICAgcmVzdWx0W2ldID0gaGFzVGhpc0FyZyA/IG1hcEZuLmNhbGwodGhpc0FyZywgdmFsdWUsIGkpIDogbWFwRm4odmFsdWUsIGkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0W2ldID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgfVxuICAgICAgICB9IHdoaWxlICghaXRlcmF0aW9uVmFsdWUuZG9uZSk7XG4gICAgICAgIGxlbmd0aCA9IGk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZW5ndGggPSBFUy5Ub0xlbmd0aChsaXN0Lmxlbmd0aCk7XG4gICAgICAgIHJlc3VsdCA9IEVTLklzQ2FsbGFibGUodGhpcykgPyBPYmplY3QobmV3IHRoaXMobGVuZ3RoKSkgOiBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgdmFsdWUgPSBsaXN0W2ldO1xuICAgICAgICAgIGlmIChtYXBGbikge1xuICAgICAgICAgICAgcmVzdWx0W2ldID0gaGFzVGhpc0FyZyA/IG1hcEZuLmNhbGwodGhpc0FyZywgdmFsdWUsIGkpIDogbWFwRm4odmFsdWUsIGkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHRbaV0gPSB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmVzdWx0Lmxlbmd0aCA9IGxlbmd0aDtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIG9mOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gQXJyYXkuZnJvbShhcmd1bWVudHMpO1xuICAgIH1cbiAgfTtcbiAgZGVmaW5lUHJvcGVydGllcyhBcnJheSwgQXJyYXlTaGltcyk7XG5cbiAgdmFyIGFycmF5RnJvbVN3YWxsb3dzTmVnYXRpdmVMZW5ndGhzID0gZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gQXJyYXkuZnJvbSh7IGxlbmd0aDogLTEgfSkubGVuZ3RoID09PSAwO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG4gIC8vIEZpeGVzIGEgRmlyZWZveCBidWcgaW4gdjMyXG4gIC8vIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTEwNjM5OTNcbiAgaWYgKCFhcnJheUZyb21Td2FsbG93c05lZ2F0aXZlTGVuZ3RocygpKSB7XG4gICAgZGVmaW5lUHJvcGVydHkoQXJyYXksICdmcm9tJywgQXJyYXlTaGltcy5mcm9tLCB0cnVlKTtcbiAgfVxuXG4gIC8vIE91ciBBcnJheUl0ZXJhdG9yIGlzIHByaXZhdGU7IHNlZVxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vcGF1bG1pbGxyL2VzNi1zaGltL2lzc3Vlcy8yNTJcbiAgQXJyYXlJdGVyYXRvciA9IGZ1bmN0aW9uIChhcnJheSwga2luZCkge1xuICAgICAgdGhpcy5pID0gMDtcbiAgICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbiAgICAgIHRoaXMua2luZCA9IGtpbmQ7XG4gIH07XG5cbiAgZGVmaW5lUHJvcGVydGllcyhBcnJheUl0ZXJhdG9yLnByb3RvdHlwZSwge1xuICAgIG5leHQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBpID0gdGhpcy5pLCBhcnJheSA9IHRoaXMuYXJyYXk7XG4gICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQXJyYXlJdGVyYXRvcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignTm90IGFuIEFycmF5SXRlcmF0b3InKTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgYXJyYXkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHZhciBsZW4gPSBFUy5Ub0xlbmd0aChhcnJheS5sZW5ndGgpO1xuICAgICAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgdmFyIGtpbmQgPSB0aGlzLmtpbmQ7XG4gICAgICAgICAgdmFyIHJldHZhbDtcbiAgICAgICAgICBpZiAoa2luZCA9PT0gJ2tleScpIHtcbiAgICAgICAgICAgIHJldHZhbCA9IGk7XG4gICAgICAgICAgfSBlbHNlIGlmIChraW5kID09PSAndmFsdWUnKSB7XG4gICAgICAgICAgICByZXR2YWwgPSBhcnJheVtpXTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGtpbmQgPT09ICdlbnRyeScpIHtcbiAgICAgICAgICAgIHJldHZhbCA9IFtpLCBhcnJheVtpXV07XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuaSA9IGkgKyAxO1xuICAgICAgICAgIHJldHVybiB7IHZhbHVlOiByZXR2YWwsIGRvbmU6IGZhbHNlIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuYXJyYXkgPSB2b2lkIDA7XG4gICAgICByZXR1cm4geyB2YWx1ZTogdm9pZCAwLCBkb25lOiB0cnVlIH07XG4gICAgfVxuICB9KTtcbiAgYWRkSXRlcmF0b3IoQXJyYXlJdGVyYXRvci5wcm90b3R5cGUpO1xuXG4gIHZhciBBcnJheVByb3RvdHlwZVNoaW1zID0ge1xuICAgIGNvcHlXaXRoaW46IGZ1bmN0aW9uICh0YXJnZXQsIHN0YXJ0KSB7XG4gICAgICB2YXIgZW5kID0gYXJndW1lbnRzWzJdOyAvLyBjb3B5V2l0aGluLmxlbmd0aCBtdXN0IGJlIDJcbiAgICAgIHZhciBvID0gRVMuVG9PYmplY3QodGhpcyk7XG4gICAgICB2YXIgbGVuID0gRVMuVG9MZW5ndGgoby5sZW5ndGgpO1xuICAgICAgdGFyZ2V0ID0gRVMuVG9JbnRlZ2VyKHRhcmdldCk7XG4gICAgICBzdGFydCA9IEVTLlRvSW50ZWdlcihzdGFydCk7XG4gICAgICB2YXIgdG8gPSB0YXJnZXQgPCAwID8gTWF0aC5tYXgobGVuICsgdGFyZ2V0LCAwKSA6IE1hdGgubWluKHRhcmdldCwgbGVuKTtcbiAgICAgIHZhciBmcm9tID0gc3RhcnQgPCAwID8gTWF0aC5tYXgobGVuICsgc3RhcnQsIDApIDogTWF0aC5taW4oc3RhcnQsIGxlbik7XG4gICAgICBlbmQgPSB0eXBlb2YgZW5kID09PSAndW5kZWZpbmVkJyA/IGxlbiA6IEVTLlRvSW50ZWdlcihlbmQpO1xuICAgICAgdmFyIGZpbiA9IGVuZCA8IDAgPyBNYXRoLm1heChsZW4gKyBlbmQsIDApIDogTWF0aC5taW4oZW5kLCBsZW4pO1xuICAgICAgdmFyIGNvdW50ID0gTWF0aC5taW4oZmluIC0gZnJvbSwgbGVuIC0gdG8pO1xuICAgICAgdmFyIGRpcmVjdGlvbiA9IDE7XG4gICAgICBpZiAoZnJvbSA8IHRvICYmIHRvIDwgKGZyb20gKyBjb3VudCkpIHtcbiAgICAgICAgZGlyZWN0aW9uID0gLTE7XG4gICAgICAgIGZyb20gKz0gY291bnQgLSAxO1xuICAgICAgICB0byArPSBjb3VudCAtIDE7XG4gICAgICB9XG4gICAgICB3aGlsZSAoY291bnQgPiAwKSB7XG4gICAgICAgIGlmIChfaGFzT3duUHJvcGVydHkuY2FsbChvLCBmcm9tKSkge1xuICAgICAgICAgIG9bdG9dID0gb1tmcm9tXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgb1tmcm9tXTtcbiAgICAgICAgfVxuICAgICAgICBmcm9tICs9IGRpcmVjdGlvbjtcbiAgICAgICAgdG8gKz0gZGlyZWN0aW9uO1xuICAgICAgICBjb3VudCAtPSAxO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG87XG4gICAgfSxcblxuICAgIGZpbGw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgdmFyIHN0YXJ0ID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiB2b2lkIDA7XG4gICAgICB2YXIgZW5kID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgPyBhcmd1bWVudHNbMl0gOiB2b2lkIDA7XG4gICAgICB2YXIgTyA9IEVTLlRvT2JqZWN0KHRoaXMpO1xuICAgICAgdmFyIGxlbiA9IEVTLlRvTGVuZ3RoKE8ubGVuZ3RoKTtcbiAgICAgIHN0YXJ0ID0gRVMuVG9JbnRlZ2VyKHR5cGVvZiBzdGFydCA9PT0gJ3VuZGVmaW5lZCcgPyAwIDogc3RhcnQpO1xuICAgICAgZW5kID0gRVMuVG9JbnRlZ2VyKHR5cGVvZiBlbmQgPT09ICd1bmRlZmluZWQnID8gbGVuIDogZW5kKTtcblxuICAgICAgdmFyIHJlbGF0aXZlU3RhcnQgPSBzdGFydCA8IDAgPyBNYXRoLm1heChsZW4gKyBzdGFydCwgMCkgOiBNYXRoLm1pbihzdGFydCwgbGVuKTtcbiAgICAgIHZhciByZWxhdGl2ZUVuZCA9IGVuZCA8IDAgPyBsZW4gKyBlbmQgOiBlbmQ7XG5cbiAgICAgIGZvciAodmFyIGkgPSByZWxhdGl2ZVN0YXJ0OyBpIDwgbGVuICYmIGkgPCByZWxhdGl2ZUVuZDsgKytpKSB7XG4gICAgICAgIE9baV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBPO1xuICAgIH0sXG5cbiAgICBmaW5kOiBmdW5jdGlvbiBmaW5kKHByZWRpY2F0ZSkge1xuICAgICAgdmFyIGxpc3QgPSBFUy5Ub09iamVjdCh0aGlzKTtcbiAgICAgIHZhciBsZW5ndGggPSBFUy5Ub0xlbmd0aChsaXN0Lmxlbmd0aCk7XG4gICAgICBpZiAoIUVTLklzQ2FsbGFibGUocHJlZGljYXRlKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcnJheSNmaW5kOiBwcmVkaWNhdGUgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICB9XG4gICAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogbnVsbDtcbiAgICAgIGZvciAodmFyIGkgPSAwLCB2YWx1ZTsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhbHVlID0gbGlzdFtpXTtcbiAgICAgICAgaWYgKHRoaXNBcmcpIHtcbiAgICAgICAgICBpZiAocHJlZGljYXRlLmNhbGwodGhpc0FyZywgdmFsdWUsIGksIGxpc3QpKSB7IHJldHVybiB2YWx1ZTsgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChwcmVkaWNhdGUodmFsdWUsIGksIGxpc3QpKSB7IHJldHVybiB2YWx1ZTsgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfSxcblxuICAgIGZpbmRJbmRleDogZnVuY3Rpb24gZmluZEluZGV4KHByZWRpY2F0ZSkge1xuICAgICAgdmFyIGxpc3QgPSBFUy5Ub09iamVjdCh0aGlzKTtcbiAgICAgIHZhciBsZW5ndGggPSBFUy5Ub0xlbmd0aChsaXN0Lmxlbmd0aCk7XG4gICAgICBpZiAoIUVTLklzQ2FsbGFibGUocHJlZGljYXRlKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcnJheSNmaW5kSW5kZXg6IHByZWRpY2F0ZSBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgIH1cbiAgICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiBudWxsO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAodGhpc0FyZykge1xuICAgICAgICAgIGlmIChwcmVkaWNhdGUuY2FsbCh0aGlzQXJnLCBsaXN0W2ldLCBpLCBsaXN0KSkgeyByZXR1cm4gaTsgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChwcmVkaWNhdGUobGlzdFtpXSwgaSwgbGlzdCkpIHsgcmV0dXJuIGk7IH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIC0xO1xuICAgIH0sXG5cbiAgICBrZXlzOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmV3IEFycmF5SXRlcmF0b3IodGhpcywgJ2tleScpO1xuICAgIH0sXG5cbiAgICB2YWx1ZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuZXcgQXJyYXlJdGVyYXRvcih0aGlzLCAndmFsdWUnKTtcbiAgICB9LFxuXG4gICAgZW50cmllczogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5ldyBBcnJheUl0ZXJhdG9yKHRoaXMsICdlbnRyeScpO1xuICAgIH1cbiAgfTtcbiAgLy8gU2FmYXJpIDcuMSBkZWZpbmVzIEFycmF5I2tleXMgYW5kIEFycmF5I2VudHJpZXMgbmF0aXZlbHksXG4gIC8vIGJ1dCB0aGUgcmVzdWx0aW5nIEFycmF5SXRlcmF0b3Igb2JqZWN0cyBkb24ndCBoYXZlIGEgXCJuZXh0XCIgbWV0aG9kLlxuICBpZiAoQXJyYXkucHJvdG90eXBlLmtleXMgJiYgIUVTLklzQ2FsbGFibGUoWzFdLmtleXMoKS5uZXh0KSkge1xuICAgIGRlbGV0ZSBBcnJheS5wcm90b3R5cGUua2V5cztcbiAgfVxuICBpZiAoQXJyYXkucHJvdG90eXBlLmVudHJpZXMgJiYgIUVTLklzQ2FsbGFibGUoWzFdLmVudHJpZXMoKS5uZXh0KSkge1xuICAgIGRlbGV0ZSBBcnJheS5wcm90b3R5cGUuZW50cmllcztcbiAgfVxuXG4gIC8vIENocm9tZSAzOCBkZWZpbmVzIEFycmF5I2tleXMgYW5kIEFycmF5I2VudHJpZXMsIGFuZCBBcnJheSNAQGl0ZXJhdG9yLCBidXQgbm90IEFycmF5I3ZhbHVlc1xuICBpZiAoQXJyYXkucHJvdG90eXBlLmtleXMgJiYgQXJyYXkucHJvdG90eXBlLmVudHJpZXMgJiYgIUFycmF5LnByb3RvdHlwZS52YWx1ZXMgJiYgQXJyYXkucHJvdG90eXBlWyRpdGVyYXRvciRdKSB7XG4gICAgZGVmaW5lUHJvcGVydGllcyhBcnJheS5wcm90b3R5cGUsIHtcbiAgICAgIHZhbHVlczogQXJyYXkucHJvdG90eXBlWyRpdGVyYXRvciRdXG4gICAgfSk7XG4gIH1cbiAgZGVmaW5lUHJvcGVydGllcyhBcnJheS5wcm90b3R5cGUsIEFycmF5UHJvdG90eXBlU2hpbXMpO1xuXG4gIGFkZEl0ZXJhdG9yKEFycmF5LnByb3RvdHlwZSwgZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy52YWx1ZXMoKTsgfSk7XG4gIC8vIENocm9tZSBkZWZpbmVzIGtleXMvdmFsdWVzL2VudHJpZXMgb24gQXJyYXksIGJ1dCBkb2Vzbid0IGdpdmUgdXNcbiAgLy8gYW55IHdheSB0byBpZGVudGlmeSBpdHMgaXRlcmF0b3IuICBTbyBhZGQgb3VyIG93biBzaGltbWVkIGZpZWxkLlxuICBpZiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKSB7XG4gICAgYWRkSXRlcmF0b3IoT2JqZWN0LmdldFByb3RvdHlwZU9mKFtdLnZhbHVlcygpKSk7XG4gIH1cblxuICB2YXIgbWF4U2FmZUludGVnZXIgPSBNYXRoLnBvdygyLCA1MykgLSAxO1xuICBkZWZpbmVQcm9wZXJ0aWVzKE51bWJlciwge1xuICAgIE1BWF9TQUZFX0lOVEVHRVI6IG1heFNhZmVJbnRlZ2VyLFxuICAgIE1JTl9TQUZFX0lOVEVHRVI6IC1tYXhTYWZlSW50ZWdlcixcbiAgICBFUFNJTE9OOiAyLjIyMDQ0NjA0OTI1MDMxM2UtMTYsXG5cbiAgICBwYXJzZUludDogZ2xvYmFscy5wYXJzZUludCxcbiAgICBwYXJzZUZsb2F0OiBnbG9iYWxzLnBhcnNlRmxvYXQsXG5cbiAgICBpc0Zpbml0ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiBnbG9iYWxfaXNGaW5pdGUodmFsdWUpO1xuICAgIH0sXG5cbiAgICBpc0ludGVnZXI6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIE51bWJlci5pc0Zpbml0ZSh2YWx1ZSkgJiZcbiAgICAgICAgRVMuVG9JbnRlZ2VyKHZhbHVlKSA9PT0gdmFsdWU7XG4gICAgfSxcblxuICAgIGlzU2FmZUludGVnZXI6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIE51bWJlci5pc0ludGVnZXIodmFsdWUpICYmIE1hdGguYWJzKHZhbHVlKSA8PSBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUjtcbiAgICB9LFxuXG4gICAgaXNOYU46IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgLy8gTmFOICE9PSBOYU4sIGJ1dCB0aGV5IGFyZSBpZGVudGljYWwuXG4gICAgICAvLyBOYU5zIGFyZSB0aGUgb25seSBub24tcmVmbGV4aXZlIHZhbHVlLCBpLmUuLCBpZiB4ICE9PSB4LFxuICAgICAgLy8gdGhlbiB4IGlzIE5hTi5cbiAgICAgIC8vIGlzTmFOIGlzIGJyb2tlbjogaXQgY29udmVydHMgaXRzIGFyZ3VtZW50IHRvIG51bWJlciwgc29cbiAgICAgIC8vIGlzTmFOKCdmb28nKSA9PiB0cnVlXG4gICAgICByZXR1cm4gdmFsdWUgIT09IHZhbHVlO1xuICAgIH1cblxuICB9KTtcblxuICAvLyBXb3JrIGFyb3VuZCBidWdzIGluIEFycmF5I2ZpbmQgYW5kIEFycmF5I2ZpbmRJbmRleCAtLSBlYXJseVxuICAvLyBpbXBsZW1lbnRhdGlvbnMgc2tpcHBlZCBob2xlcyBpbiBzcGFyc2UgYXJyYXlzLiAoTm90ZSB0aGF0IHRoZVxuICAvLyBpbXBsZW1lbnRhdGlvbnMgb2YgZmluZC9maW5kSW5kZXggaW5kaXJlY3RseSB1c2Ugc2hpbW1lZFxuICAvLyBtZXRob2RzIG9mIE51bWJlciwgc28gdGhpcyB0ZXN0IGhhcyB0byBoYXBwZW4gZG93biBoZXJlLilcbiAgaWYgKCFbLCAxXS5maW5kKGZ1bmN0aW9uIChpdGVtLCBpZHgpIHsgcmV0dXJuIGlkeCA9PT0gMDsgfSkpIHtcbiAgICBkZWZpbmVQcm9wZXJ0eShBcnJheS5wcm90b3R5cGUsICdmaW5kJywgQXJyYXlQcm90b3R5cGVTaGltcy5maW5kLCB0cnVlKTtcbiAgfVxuICBpZiAoWywgMV0uZmluZEluZGV4KGZ1bmN0aW9uIChpdGVtLCBpZHgpIHsgcmV0dXJuIGlkeCA9PT0gMDsgfSkgIT09IDApIHtcbiAgICBkZWZpbmVQcm9wZXJ0eShBcnJheS5wcm90b3R5cGUsICdmaW5kSW5kZXgnLCBBcnJheVByb3RvdHlwZVNoaW1zLmZpbmRJbmRleCwgdHJ1ZSk7XG4gIH1cblxuICBpZiAoc3VwcG9ydHNEZXNjcmlwdG9ycykge1xuICAgIGRlZmluZVByb3BlcnRpZXMoT2JqZWN0LCB7XG4gICAgICBnZXRQcm9wZXJ0eURlc2NyaXB0b3I6IGZ1bmN0aW9uIChzdWJqZWN0LCBuYW1lKSB7XG4gICAgICAgIHZhciBwZCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc3ViamVjdCwgbmFtZSk7XG4gICAgICAgIHZhciBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihzdWJqZWN0KTtcbiAgICAgICAgd2hpbGUgKHR5cGVvZiBwZCA9PT0gJ3VuZGVmaW5lZCcgJiYgcHJvdG8gIT09IG51bGwpIHtcbiAgICAgICAgICBwZCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IocHJvdG8sIG5hbWUpO1xuICAgICAgICAgIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHByb3RvKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGQ7XG4gICAgICB9LFxuXG4gICAgICBnZXRQcm9wZXJ0eU5hbWVzOiBmdW5jdGlvbiAoc3ViamVjdCkge1xuICAgICAgICB2YXIgcmVzdWx0ID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoc3ViamVjdCk7XG4gICAgICAgIHZhciBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihzdWJqZWN0KTtcblxuICAgICAgICB2YXIgYWRkUHJvcGVydHkgPSBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICBpZiAocmVzdWx0LmluZGV4T2YocHJvcGVydHkpID09PSAtMSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2gocHJvcGVydHkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB3aGlsZSAocHJvdG8gIT09IG51bGwpIHtcbiAgICAgICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhwcm90bykuZm9yRWFjaChhZGRQcm9wZXJ0eSk7XG4gICAgICAgICAgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocHJvdG8pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBkZWZpbmVQcm9wZXJ0aWVzKE9iamVjdCwge1xuICAgICAgLy8gMTkuMS4zLjFcbiAgICAgIGFzc2lnbjogZnVuY3Rpb24gKHRhcmdldCwgc291cmNlKSB7XG4gICAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KHRhcmdldCkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCd0YXJnZXQgbXVzdCBiZSBhbiBvYmplY3QnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnJlZHVjZS5jYWxsKGFyZ3VtZW50cywgZnVuY3Rpb24gKHRhcmdldCwgc291cmNlKSB7XG4gICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKE9iamVjdChzb3VyY2UpKS5yZWR1Y2UoZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7XG4gICAgICAgICAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICAgICAgICB9LCB0YXJnZXQpO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG5cbiAgICAgIGlzOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICByZXR1cm4gRVMuU2FtZVZhbHVlKGEsIGIpO1xuICAgICAgfSxcblxuICAgICAgLy8gMTkuMS4zLjlcbiAgICAgIC8vIHNoaW0gZnJvbSBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9XZWJSZWZsZWN0aW9uLzU1OTM1NTRcbiAgICAgIHNldFByb3RvdHlwZU9mOiAoZnVuY3Rpb24gKE9iamVjdCwgbWFnaWMpIHtcbiAgICAgICAgdmFyIHNldDtcblxuICAgICAgICB2YXIgY2hlY2tBcmdzID0gZnVuY3Rpb24gKE8sIHByb3RvKSB7XG4gICAgICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QoTykpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2Nhbm5vdCBzZXQgcHJvdG90eXBlIG9uIGEgbm9uLW9iamVjdCcpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIShwcm90byA9PT0gbnVsbCB8fCBFUy5UeXBlSXNPYmplY3QocHJvdG8pKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignY2FuIG9ubHkgc2V0IHByb3RvdHlwZSB0byBhbiBvYmplY3Qgb3IgbnVsbCcgKyBwcm90byk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBzZXRQcm90b3R5cGVPZiA9IGZ1bmN0aW9uIChPLCBwcm90bykge1xuICAgICAgICAgIGNoZWNrQXJncyhPLCBwcm90byk7XG4gICAgICAgICAgc2V0LmNhbGwoTywgcHJvdG8pO1xuICAgICAgICAgIHJldHVybiBPO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gdGhpcyB3b3JrcyBhbHJlYWR5IGluIEZpcmVmb3ggYW5kIFNhZmFyaVxuICAgICAgICAgIHNldCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoT2JqZWN0LnByb3RvdHlwZSwgbWFnaWMpLnNldDtcbiAgICAgICAgICBzZXQuY2FsbCh7fSwgbnVsbCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZSAhPT0ge31bbWFnaWNdKSB7XG4gICAgICAgICAgICAvLyBJRSA8IDExIGNhbm5vdCBiZSBzaGltbWVkXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHByb2JhYmx5IENocm9tZSBvciBzb21lIG9sZCBNb2JpbGUgc3RvY2sgYnJvd3NlclxuICAgICAgICAgIHNldCA9IGZ1bmN0aW9uIChwcm90bykge1xuICAgICAgICAgICAgdGhpc1ttYWdpY10gPSBwcm90bztcbiAgICAgICAgICB9O1xuICAgICAgICAgIC8vIHBsZWFzZSBub3RlIHRoYXQgdGhpcyB3aWxsICoqbm90Kiogd29ya1xuICAgICAgICAgIC8vIGluIHRob3NlIGJyb3dzZXJzIHRoYXQgZG8gbm90IGluaGVyaXRcbiAgICAgICAgICAvLyBfX3Byb3RvX18gYnkgbWlzdGFrZSBmcm9tIE9iamVjdC5wcm90b3R5cGVcbiAgICAgICAgICAvLyBpbiB0aGVzZSBjYXNlcyB3ZSBzaG91bGQgcHJvYmFibHkgdGhyb3cgYW4gZXJyb3JcbiAgICAgICAgICAvLyBvciBhdCBsZWFzdCBiZSBpbmZvcm1lZCBhYm91dCB0aGUgaXNzdWVcbiAgICAgICAgICBzZXRQcm90b3R5cGVPZi5wb2x5ZmlsbCA9IHNldFByb3RvdHlwZU9mKFxuICAgICAgICAgICAgc2V0UHJvdG90eXBlT2Yoe30sIG51bGwpLFxuICAgICAgICAgICAgT2JqZWN0LnByb3RvdHlwZVxuICAgICAgICAgICkgaW5zdGFuY2VvZiBPYmplY3Q7XG4gICAgICAgICAgLy8gc2V0UHJvdG90eXBlT2YucG9seWZpbGwgPT09IHRydWUgbWVhbnMgaXQgd29ya3MgYXMgbWVhbnRcbiAgICAgICAgICAvLyBzZXRQcm90b3R5cGVPZi5wb2x5ZmlsbCA9PT0gZmFsc2UgbWVhbnMgaXQncyBub3QgMTAwJSByZWxpYWJsZVxuICAgICAgICAgIC8vIHNldFByb3RvdHlwZU9mLnBvbHlmaWxsID09PSB1bmRlZmluZWRcbiAgICAgICAgICAvLyBvclxuICAgICAgICAgIC8vIHNldFByb3RvdHlwZU9mLnBvbHlmaWxsID09ICBudWxsIG1lYW5zIGl0J3Mgbm90IGEgcG9seWZpbGxcbiAgICAgICAgICAvLyB3aGljaCBtZWFucyBpdCB3b3JrcyBhcyBleHBlY3RlZFxuICAgICAgICAgIC8vIHdlIGNhbiBldmVuIGRlbGV0ZSBPYmplY3QucHJvdG90eXBlLl9fcHJvdG9fXztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2V0UHJvdG90eXBlT2Y7XG4gICAgICB9KShPYmplY3QsICdfX3Byb3RvX18nKVxuICAgIH0pO1xuICB9XG5cbiAgLy8gV29ya2Fyb3VuZCBidWcgaW4gT3BlcmEgMTIgd2hlcmUgc2V0UHJvdG90eXBlT2YoeCwgbnVsbCkgZG9lc24ndCB3b3JrLFxuICAvLyBidXQgT2JqZWN0LmNyZWF0ZShudWxsKSBkb2VzLlxuICBpZiAoT2JqZWN0LnNldFByb3RvdHlwZU9mICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZiAmJlxuICAgICAgT2JqZWN0LmdldFByb3RvdHlwZU9mKE9iamVjdC5zZXRQcm90b3R5cGVPZih7fSwgbnVsbCkpICE9PSBudWxsICYmXG4gICAgICBPYmplY3QuZ2V0UHJvdG90eXBlT2YoT2JqZWN0LmNyZWF0ZShudWxsKSkgPT09IG51bGwpIHtcbiAgICAoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIEZBS0VOVUxMID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgIHZhciBncG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YsIHNwbyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZjtcbiAgICAgIE9iamVjdC5nZXRQcm90b3R5cGVPZiA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBncG8obyk7XG4gICAgICAgIHJldHVybiByZXN1bHQgPT09IEZBS0VOVUxMID8gbnVsbCA6IHJlc3VsdDtcbiAgICAgIH07XG4gICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YgPSBmdW5jdGlvbiAobywgcCkge1xuICAgICAgICBpZiAocCA9PT0gbnVsbCkgeyBwID0gRkFLRU5VTEw7IH1cbiAgICAgICAgcmV0dXJuIHNwbyhvLCBwKTtcbiAgICAgIH07XG4gICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YucG9seWZpbGwgPSBmYWxzZTtcbiAgICB9KSgpO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBPYmplY3Qua2V5cygnZm9vJyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB2YXIgb3JpZ2luYWxPYmplY3RLZXlzID0gT2JqZWN0LmtleXM7XG4gICAgT2JqZWN0LmtleXMgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICByZXR1cm4gb3JpZ2luYWxPYmplY3RLZXlzKEVTLlRvT2JqZWN0KG9iaikpO1xuICAgIH07XG4gIH1cblxuICB2YXIgTWF0aFNoaW1zID0ge1xuICAgIGFjb3NoOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhbHVlID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmIChOdW1iZXIuaXNOYU4odmFsdWUpIHx8IHZhbHVlIDwgMSkgeyByZXR1cm4gTmFOOyB9XG4gICAgICBpZiAodmFsdWUgPT09IDEpIHsgcmV0dXJuIDA7IH1cbiAgICAgIGlmICh2YWx1ZSA9PT0gSW5maW5pdHkpIHsgcmV0dXJuIHZhbHVlOyB9XG4gICAgICByZXR1cm4gTWF0aC5sb2codmFsdWUgKyBNYXRoLnNxcnQodmFsdWUgKiB2YWx1ZSAtIDEpKTtcbiAgICB9LFxuXG4gICAgYXNpbmg6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgdmFsdWUgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKHZhbHVlID09PSAwIHx8ICFnbG9iYWxfaXNGaW5pdGUodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZSA8IDAgPyAtTWF0aC5hc2luaCgtdmFsdWUpIDogTWF0aC5sb2codmFsdWUgKyBNYXRoLnNxcnQodmFsdWUgKiB2YWx1ZSArIDEpKTtcbiAgICB9LFxuXG4gICAgYXRhbmg6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgdmFsdWUgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKE51bWJlci5pc05hTih2YWx1ZSkgfHwgdmFsdWUgPCAtMSB8fCB2YWx1ZSA+IDEpIHtcbiAgICAgICAgcmV0dXJuIE5hTjtcbiAgICAgIH1cbiAgICAgIGlmICh2YWx1ZSA9PT0gLTEpIHsgcmV0dXJuIC1JbmZpbml0eTsgfVxuICAgICAgaWYgKHZhbHVlID09PSAxKSB7IHJldHVybiBJbmZpbml0eTsgfVxuICAgICAgaWYgKHZhbHVlID09PSAwKSB7IHJldHVybiB2YWx1ZTsgfVxuICAgICAgcmV0dXJuIDAuNSAqIE1hdGgubG9nKCgxICsgdmFsdWUpIC8gKDEgLSB2YWx1ZSkpO1xuICAgIH0sXG5cbiAgICBjYnJ0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhbHVlID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmICh2YWx1ZSA9PT0gMCkgeyByZXR1cm4gdmFsdWU7IH1cbiAgICAgIHZhciBuZWdhdGUgPSB2YWx1ZSA8IDAsIHJlc3VsdDtcbiAgICAgIGlmIChuZWdhdGUpIHsgdmFsdWUgPSAtdmFsdWU7IH1cbiAgICAgIHJlc3VsdCA9IE1hdGgucG93KHZhbHVlLCAxIC8gMyk7XG4gICAgICByZXR1cm4gbmVnYXRlID8gLXJlc3VsdCA6IHJlc3VsdDtcbiAgICB9LFxuXG4gICAgY2x6MzI6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgLy8gU2VlIGh0dHBzOi8vYnVncy5lY21hc2NyaXB0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MjQ2NVxuICAgICAgdmFsdWUgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgdmFyIG51bWJlciA9IEVTLlRvVWludDMyKHZhbHVlKTtcbiAgICAgIGlmIChudW1iZXIgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIDMyO1xuICAgICAgfVxuICAgICAgcmV0dXJuIDMyIC0gKG51bWJlcikudG9TdHJpbmcoMikubGVuZ3RoO1xuICAgIH0sXG5cbiAgICBjb3NoOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhbHVlID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmICh2YWx1ZSA9PT0gMCkgeyByZXR1cm4gMTsgfSAvLyArMCBvciAtMFxuICAgICAgaWYgKE51bWJlci5pc05hTih2YWx1ZSkpIHsgcmV0dXJuIE5hTjsgfVxuICAgICAgaWYgKCFnbG9iYWxfaXNGaW5pdGUodmFsdWUpKSB7IHJldHVybiBJbmZpbml0eTsgfVxuICAgICAgaWYgKHZhbHVlIDwgMCkgeyB2YWx1ZSA9IC12YWx1ZTsgfVxuICAgICAgaWYgKHZhbHVlID4gMjEpIHsgcmV0dXJuIE1hdGguZXhwKHZhbHVlKSAvIDI7IH1cbiAgICAgIHJldHVybiAoTWF0aC5leHAodmFsdWUpICsgTWF0aC5leHAoLXZhbHVlKSkgLyAyO1xuICAgIH0sXG5cbiAgICBleHBtMTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB2YWx1ZSA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAodmFsdWUgPT09IC1JbmZpbml0eSkgeyByZXR1cm4gLTE7IH1cbiAgICAgIGlmICghZ2xvYmFsX2lzRmluaXRlKHZhbHVlKSB8fCB2YWx1ZSA9PT0gMCkgeyByZXR1cm4gdmFsdWU7IH1cbiAgICAgIHJldHVybiBNYXRoLmV4cCh2YWx1ZSkgLSAxO1xuICAgIH0sXG5cbiAgICBoeXBvdDogZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgIHZhciBhbnlOYU4gPSBmYWxzZTtcbiAgICAgIHZhciBhbGxaZXJvID0gdHJ1ZTtcbiAgICAgIHZhciBhbnlJbmZpbml0eSA9IGZhbHNlO1xuICAgICAgdmFyIG51bWJlcnMgPSBbXTtcbiAgICAgIEFycmF5LnByb3RvdHlwZS5ldmVyeS5jYWxsKGFyZ3VtZW50cywgZnVuY3Rpb24gKGFyZykge1xuICAgICAgICB2YXIgbnVtID0gTnVtYmVyKGFyZyk7XG4gICAgICAgIGlmIChOdW1iZXIuaXNOYU4obnVtKSkge1xuICAgICAgICAgIGFueU5hTiA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAobnVtID09PSBJbmZpbml0eSB8fCBudW0gPT09IC1JbmZpbml0eSkge1xuICAgICAgICAgIGFueUluZmluaXR5ID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChudW0gIT09IDApIHtcbiAgICAgICAgICBhbGxaZXJvID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFueUluZmluaXR5KSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2UgaWYgKCFhbnlOYU4pIHtcbiAgICAgICAgICBudW1iZXJzLnB1c2goTWF0aC5hYnMobnVtKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KTtcbiAgICAgIGlmIChhbnlJbmZpbml0eSkgeyByZXR1cm4gSW5maW5pdHk7IH1cbiAgICAgIGlmIChhbnlOYU4pIHsgcmV0dXJuIE5hTjsgfVxuICAgICAgaWYgKGFsbFplcm8pIHsgcmV0dXJuIDA7IH1cblxuICAgICAgbnVtYmVycy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBiIC0gYTsgfSk7XG4gICAgICB2YXIgbGFyZ2VzdCA9IG51bWJlcnNbMF07XG4gICAgICB2YXIgZGl2aWRlZCA9IG51bWJlcnMubWFwKGZ1bmN0aW9uIChudW1iZXIpIHsgcmV0dXJuIG51bWJlciAvIGxhcmdlc3Q7IH0pO1xuICAgICAgdmFyIHN1bSA9IGRpdmlkZWQucmVkdWNlKGZ1bmN0aW9uIChzdW0sIG51bWJlcikgeyByZXR1cm4gc3VtICs9IG51bWJlciAqIG51bWJlcjsgfSwgMCk7XG4gICAgICByZXR1cm4gbGFyZ2VzdCAqIE1hdGguc3FydChzdW0pO1xuICAgIH0sXG5cbiAgICBsb2cyOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHJldHVybiBNYXRoLmxvZyh2YWx1ZSkgKiBNYXRoLkxPRzJFO1xuICAgIH0sXG5cbiAgICBsb2cxMDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICByZXR1cm4gTWF0aC5sb2codmFsdWUpICogTWF0aC5MT0cxMEU7XG4gICAgfSxcblxuICAgIGxvZzFwOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhbHVlID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmICh2YWx1ZSA8IC0xIHx8IE51bWJlci5pc05hTih2YWx1ZSkpIHsgcmV0dXJuIE5hTjsgfVxuICAgICAgaWYgKHZhbHVlID09PSAwIHx8IHZhbHVlID09PSBJbmZpbml0eSkgeyByZXR1cm4gdmFsdWU7IH1cbiAgICAgIGlmICh2YWx1ZSA9PT0gLTEpIHsgcmV0dXJuIC1JbmZpbml0eTsgfVxuICAgICAgdmFyIHJlc3VsdCA9IDA7XG4gICAgICB2YXIgbiA9IDUwO1xuXG4gICAgICBpZiAodmFsdWUgPCAwIHx8IHZhbHVlID4gMSkgeyByZXR1cm4gTWF0aC5sb2coMSArIHZhbHVlKTsgfVxuICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgaWYgKChpICUgMikgPT09IDApIHtcbiAgICAgICAgICByZXN1bHQgLT0gTWF0aC5wb3codmFsdWUsIGkpIC8gaTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQgKz0gTWF0aC5wb3codmFsdWUsIGkpIC8gaTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICBzaWduOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhciBudW1iZXIgPSArdmFsdWU7XG4gICAgICBpZiAobnVtYmVyID09PSAwKSB7IHJldHVybiBudW1iZXI7IH1cbiAgICAgIGlmIChOdW1iZXIuaXNOYU4obnVtYmVyKSkgeyByZXR1cm4gbnVtYmVyOyB9XG4gICAgICByZXR1cm4gbnVtYmVyIDwgMCA/IC0xIDogMTtcbiAgICB9LFxuXG4gICAgc2luaDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB2YWx1ZSA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAoIWdsb2JhbF9pc0Zpbml0ZSh2YWx1ZSkgfHwgdmFsdWUgPT09IDApIHsgcmV0dXJuIHZhbHVlOyB9XG4gICAgICByZXR1cm4gKE1hdGguZXhwKHZhbHVlKSAtIE1hdGguZXhwKC12YWx1ZSkpIC8gMjtcbiAgICB9LFxuXG4gICAgdGFuaDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB2YWx1ZSA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAoTnVtYmVyLmlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gMCkgeyByZXR1cm4gdmFsdWU7IH1cbiAgICAgIGlmICh2YWx1ZSA9PT0gSW5maW5pdHkpIHsgcmV0dXJuIDE7IH1cbiAgICAgIGlmICh2YWx1ZSA9PT0gLUluZmluaXR5KSB7IHJldHVybiAtMTsgfVxuICAgICAgcmV0dXJuIChNYXRoLmV4cCh2YWx1ZSkgLSBNYXRoLmV4cCgtdmFsdWUpKSAvIChNYXRoLmV4cCh2YWx1ZSkgKyBNYXRoLmV4cCgtdmFsdWUpKTtcbiAgICB9LFxuXG4gICAgdHJ1bmM6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgdmFyIG51bWJlciA9IE51bWJlcih2YWx1ZSk7XG4gICAgICByZXR1cm4gbnVtYmVyIDwgMCA/IC1NYXRoLmZsb29yKC1udW1iZXIpIDogTWF0aC5mbG9vcihudW1iZXIpO1xuICAgIH0sXG5cbiAgICBpbXVsOiBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgLy8gdGFrZW4gZnJvbSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9NYXRoL2ltdWxcbiAgICAgIHggPSBFUy5Ub1VpbnQzMih4KTtcbiAgICAgIHkgPSBFUy5Ub1VpbnQzMih5KTtcbiAgICAgIHZhciBhaCAgPSAoeCA+Pj4gMTYpICYgMHhmZmZmO1xuICAgICAgdmFyIGFsID0geCAmIDB4ZmZmZjtcbiAgICAgIHZhciBiaCAgPSAoeSA+Pj4gMTYpICYgMHhmZmZmO1xuICAgICAgdmFyIGJsID0geSAmIDB4ZmZmZjtcbiAgICAgIC8vIHRoZSBzaGlmdCBieSAwIGZpeGVzIHRoZSBzaWduIG9uIHRoZSBoaWdoIHBhcnRcbiAgICAgIC8vIHRoZSBmaW5hbCB8MCBjb252ZXJ0cyB0aGUgdW5zaWduZWQgdmFsdWUgaW50byBhIHNpZ25lZCB2YWx1ZVxuICAgICAgcmV0dXJuICgoYWwgKiBibCkgKyAoKChhaCAqIGJsICsgYWwgKiBiaCkgPDwgMTYpID4+PiAwKXwwKTtcbiAgICB9LFxuXG4gICAgZnJvdW5kOiBmdW5jdGlvbiAoeCkge1xuICAgICAgaWYgKHggPT09IDAgfHwgeCA9PT0gSW5maW5pdHkgfHwgeCA9PT0gLUluZmluaXR5IHx8IE51bWJlci5pc05hTih4KSkge1xuICAgICAgICByZXR1cm4geDtcbiAgICAgIH1cbiAgICAgIHZhciBudW0gPSBOdW1iZXIoeCk7XG4gICAgICByZXR1cm4gbnVtYmVyQ29udmVyc2lvbi50b0Zsb2F0MzIobnVtKTtcbiAgICB9XG4gIH07XG4gIGRlZmluZVByb3BlcnRpZXMoTWF0aCwgTWF0aFNoaW1zKTtcblxuICBpZiAoTWF0aC5pbXVsKDB4ZmZmZmZmZmYsIDUpICE9PSAtNSkge1xuICAgIC8vIFNhZmFyaSA2LjEsIGF0IGxlYXN0LCByZXBvcnRzIFwiMFwiIGZvciB0aGlzIHZhbHVlXG4gICAgTWF0aC5pbXVsID0gTWF0aFNoaW1zLmltdWw7XG4gIH1cblxuICAvLyBQcm9taXNlc1xuICAvLyBTaW1wbGVzdCBwb3NzaWJsZSBpbXBsZW1lbnRhdGlvbjsgdXNlIGEgM3JkLXBhcnR5IGxpYnJhcnkgaWYgeW91XG4gIC8vIHdhbnQgdGhlIGJlc3QgcG9zc2libGUgc3BlZWQgYW5kL29yIGxvbmcgc3RhY2sgdHJhY2VzLlxuICB2YXIgUHJvbWlzZVNoaW0gPSAoZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIFByb21pc2UsIFByb21pc2UkcHJvdG90eXBlO1xuXG4gICAgRVMuSXNQcm9taXNlID0gZnVuY3Rpb24gKHByb21pc2UpIHtcbiAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KHByb21pc2UpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICghcHJvbWlzZS5fcHJvbWlzZUNvbnN0cnVjdG9yKSB7XG4gICAgICAgIC8vIF9wcm9taXNlQ29uc3RydWN0b3IgaXMgYSBiaXQgbW9yZSB1bmlxdWUgdGhhbiBfc3RhdHVzLCBzbyB3ZSdsbFxuICAgICAgICAvLyBjaGVjayB0aGF0IGluc3RlYWQgb2YgdGhlIFtbUHJvbWlzZVN0YXR1c11dIGludGVybmFsIGZpZWxkLlxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHByb21pc2UuX3N0YXR1cyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyB1bmluaXRpYWxpemVkXG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4gICAgLy8gXCJQcm9taXNlQ2FwYWJpbGl0eVwiIGluIHRoZSBzcGVjIGlzIHdoYXQgbW9zdCBwcm9taXNlIGltcGxlbWVudGF0aW9uc1xuICAgIC8vIGNhbGwgYSBcImRlZmVycmVkXCIuXG4gICAgdmFyIFByb21pc2VDYXBhYmlsaXR5ID0gZnVuY3Rpb24gKEMpIHtcbiAgICAgIGlmICghRVMuSXNDYWxsYWJsZShDKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdiYWQgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xuICAgICAgfVxuICAgICAgdmFyIGNhcGFiaWxpdHkgPSB0aGlzO1xuICAgICAgdmFyIHJlc29sdmVyID0gZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBjYXBhYmlsaXR5LnJlc29sdmUgPSByZXNvbHZlO1xuICAgICAgICBjYXBhYmlsaXR5LnJlamVjdCA9IHJlamVjdDtcbiAgICAgIH07XG4gICAgICBjYXBhYmlsaXR5LnByb21pc2UgPSBFUy5Db25zdHJ1Y3QoQywgW3Jlc29sdmVyXSk7XG4gICAgICAvLyBzZWUgaHR0cHM6Ly9idWdzLmVjbWFzY3JpcHQub3JnL3Nob3dfYnVnLmNnaT9pZD0yNDc4XG4gICAgICBpZiAoIWNhcGFiaWxpdHkucHJvbWlzZS5fZXM2Y29uc3RydWN0KSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2JhZCBwcm9taXNlIGNvbnN0cnVjdG9yJyk7XG4gICAgICB9XG4gICAgICBpZiAoIShFUy5Jc0NhbGxhYmxlKGNhcGFiaWxpdHkucmVzb2x2ZSkgJiZcbiAgICAgICAgICAgIEVTLklzQ2FsbGFibGUoY2FwYWJpbGl0eS5yZWplY3QpKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdiYWQgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBmaW5kIGFuIGFwcHJvcHJpYXRlIHNldEltbWVkaWF0ZS1hbGlrZVxuICAgIHZhciBzZXRUaW1lb3V0ID0gZ2xvYmFscy5zZXRUaW1lb3V0O1xuICAgIHZhciBtYWtlWmVyb1RpbWVvdXQ7XG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIEVTLklzQ2FsbGFibGUod2luZG93LnBvc3RNZXNzYWdlKSkge1xuICAgICAgbWFrZVplcm9UaW1lb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBmcm9tIGh0dHA6Ly9kYmFyb24ub3JnL2xvZy8yMDEwMDMwOS1mYXN0ZXItdGltZW91dHNcbiAgICAgICAgdmFyIHRpbWVvdXRzID0gW107XG4gICAgICAgIHZhciBtZXNzYWdlTmFtZSA9ICd6ZXJvLXRpbWVvdXQtbWVzc2FnZSc7XG4gICAgICAgIHZhciBzZXRaZXJvVGltZW91dCA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgIHRpbWVvdXRzLnB1c2goZm4pO1xuICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZShtZXNzYWdlTmFtZSwgJyonKTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGhhbmRsZU1lc3NhZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICBpZiAoZXZlbnQuc291cmNlID09IHdpbmRvdyAmJiBldmVudC5kYXRhID09IG1lc3NhZ2VOYW1lKSB7XG4gICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGlmICh0aW1lb3V0cy5sZW5ndGggPT09IDApIHsgcmV0dXJuOyB9XG4gICAgICAgICAgICB2YXIgZm4gPSB0aW1lb3V0cy5zaGlmdCgpO1xuICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgaGFuZGxlTWVzc2FnZSwgdHJ1ZSk7XG4gICAgICAgIHJldHVybiBzZXRaZXJvVGltZW91dDtcbiAgICAgIH07XG4gICAgfVxuICAgIHZhciBtYWtlUHJvbWlzZUFzYXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBBbiBlZmZpY2llbnQgdGFzay1zY2hlZHVsZXIgYmFzZWQgb24gYSBwcmUtZXhpc3RpbmcgUHJvbWlzZVxuICAgICAgLy8gaW1wbGVtZW50YXRpb24sIHdoaWNoIHdlIGNhbiB1c2UgZXZlbiBpZiB3ZSBvdmVycmlkZSB0aGVcbiAgICAgIC8vIGdsb2JhbCBQcm9taXNlIGJlbG93IChpbiBvcmRlciB0byB3b3JrYXJvdW5kIGJ1Z3MpXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vUmF5bm9zL29ic2Vydi1oYXNoL2lzc3Vlcy8yI2lzc3VlY29tbWVudC0zNTg1NzY3MVxuICAgICAgdmFyIFAgPSBnbG9iYWxzLlByb21pc2U7XG4gICAgICByZXR1cm4gUCAmJiBQLnJlc29sdmUgJiYgZnVuY3Rpb24gKHRhc2spIHtcbiAgICAgICAgcmV0dXJuIFAucmVzb2x2ZSgpLnRoZW4odGFzayk7XG4gICAgICB9O1xuICAgIH07XG4gICAgdmFyIGVucXVldWUgPSBFUy5Jc0NhbGxhYmxlKGdsb2JhbHMuc2V0SW1tZWRpYXRlKSA/XG4gICAgICBnbG9iYWxzLnNldEltbWVkaWF0ZS5iaW5kKGdsb2JhbHMpIDpcbiAgICAgIHR5cGVvZiBwcm9jZXNzID09PSAnb2JqZWN0JyAmJiBwcm9jZXNzLm5leHRUaWNrID8gcHJvY2Vzcy5uZXh0VGljayA6XG4gICAgICBtYWtlUHJvbWlzZUFzYXAoKSB8fFxuICAgICAgKEVTLklzQ2FsbGFibGUobWFrZVplcm9UaW1lb3V0KSA/IG1ha2VaZXJvVGltZW91dCgpIDpcbiAgICAgIGZ1bmN0aW9uICh0YXNrKSB7IHNldFRpbWVvdXQodGFzaywgMCk7IH0pOyAvLyBmYWxsYmFja1xuXG4gICAgdmFyIHRyaWdnZXJQcm9taXNlUmVhY3Rpb25zID0gZnVuY3Rpb24gKHJlYWN0aW9ucywgeCkge1xuICAgICAgcmVhY3Rpb25zLmZvckVhY2goZnVuY3Rpb24gKHJlYWN0aW9uKSB7XG4gICAgICAgIGVucXVldWUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIC8vIFByb21pc2VSZWFjdGlvblRhc2tcbiAgICAgICAgICB2YXIgaGFuZGxlciA9IHJlYWN0aW9uLmhhbmRsZXI7XG4gICAgICAgICAgdmFyIGNhcGFiaWxpdHkgPSByZWFjdGlvbi5jYXBhYmlsaXR5O1xuICAgICAgICAgIHZhciByZXNvbHZlID0gY2FwYWJpbGl0eS5yZXNvbHZlO1xuICAgICAgICAgIHZhciByZWplY3QgPSBjYXBhYmlsaXR5LnJlamVjdDtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGhhbmRsZXIoeCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0ID09PSBjYXBhYmlsaXR5LnByb21pc2UpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignc2VsZiByZXNvbHV0aW9uJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgdXBkYXRlUmVzdWx0ID1cbiAgICAgICAgICAgICAgdXBkYXRlUHJvbWlzZUZyb21Qb3RlbnRpYWxUaGVuYWJsZShyZXN1bHQsIGNhcGFiaWxpdHkpO1xuICAgICAgICAgICAgaWYgKCF1cGRhdGVSZXN1bHQpIHtcbiAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciB1cGRhdGVQcm9taXNlRnJvbVBvdGVudGlhbFRoZW5hYmxlID0gZnVuY3Rpb24gKHgsIGNhcGFiaWxpdHkpIHtcbiAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KHgpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHZhciByZXNvbHZlID0gY2FwYWJpbGl0eS5yZXNvbHZlO1xuICAgICAgdmFyIHJlamVjdCA9IGNhcGFiaWxpdHkucmVqZWN0O1xuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIHRoZW4gPSB4LnRoZW47IC8vIG9ubHkgb25lIGludm9jYXRpb24gb2YgYWNjZXNzb3JcbiAgICAgICAgaWYgKCFFUy5Jc0NhbGxhYmxlKHRoZW4pKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgICB0aGVuLmNhbGwoeCwgcmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIHZhciBwcm9taXNlUmVzb2x1dGlvbkhhbmRsZXIgPSBmdW5jdGlvbiAocHJvbWlzZSwgb25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoeCkge1xuICAgICAgICBpZiAoeCA9PT0gcHJvbWlzZSkge1xuICAgICAgICAgIHJldHVybiBvblJlamVjdGVkKG5ldyBUeXBlRXJyb3IoJ3NlbGYgcmVzb2x1dGlvbicpKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgQyA9IHByb21pc2UuX3Byb21pc2VDb25zdHJ1Y3RvcjtcbiAgICAgICAgdmFyIGNhcGFiaWxpdHkgPSBuZXcgUHJvbWlzZUNhcGFiaWxpdHkoQyk7XG4gICAgICAgIHZhciB1cGRhdGVSZXN1bHQgPSB1cGRhdGVQcm9taXNlRnJvbVBvdGVudGlhbFRoZW5hYmxlKHgsIGNhcGFiaWxpdHkpO1xuICAgICAgICBpZiAodXBkYXRlUmVzdWx0KSB7XG4gICAgICAgICAgcmV0dXJuIGNhcGFiaWxpdHkucHJvbWlzZS50aGVuKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gb25GdWxmaWxsZWQoeCk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfTtcblxuICAgIFByb21pc2UgPSBmdW5jdGlvbiAocmVzb2x2ZXIpIHtcbiAgICAgIHZhciBwcm9taXNlID0gdGhpcztcbiAgICAgIHByb21pc2UgPSBlbXVsYXRlRVM2Y29uc3RydWN0KHByb21pc2UpO1xuICAgICAgaWYgKCFwcm9taXNlLl9wcm9taXNlQ29uc3RydWN0b3IpIHtcbiAgICAgICAgLy8gd2UgdXNlIF9wcm9taXNlQ29uc3RydWN0b3IgYXMgYSBzdGFuZC1pbiBmb3IgdGhlIGludGVybmFsXG4gICAgICAgIC8vIFtbUHJvbWlzZVN0YXR1c11dIGZpZWxkOyBpdCdzIGEgbGl0dGxlIG1vcmUgdW5pcXVlLlxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdiYWQgcHJvbWlzZScpO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwcm9taXNlLl9zdGF0dXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3Byb21pc2UgYWxyZWFkeSBpbml0aWFsaXplZCcpO1xuICAgICAgfVxuICAgICAgLy8gc2VlIGh0dHBzOi8vYnVncy5lY21hc2NyaXB0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MjQ4MlxuICAgICAgaWYgKCFFUy5Jc0NhbGxhYmxlKHJlc29sdmVyKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdub3QgYSB2YWxpZCByZXNvbHZlcicpO1xuICAgICAgfVxuICAgICAgcHJvbWlzZS5fc3RhdHVzID0gJ3VucmVzb2x2ZWQnO1xuICAgICAgcHJvbWlzZS5fcmVzb2x2ZVJlYWN0aW9ucyA9IFtdO1xuICAgICAgcHJvbWlzZS5fcmVqZWN0UmVhY3Rpb25zID0gW107XG5cbiAgICAgIHZhciByZXNvbHZlID0gZnVuY3Rpb24gKHJlc29sdXRpb24pIHtcbiAgICAgICAgaWYgKHByb21pc2UuX3N0YXR1cyAhPT0gJ3VucmVzb2x2ZWQnKSB7IHJldHVybjsgfVxuICAgICAgICB2YXIgcmVhY3Rpb25zID0gcHJvbWlzZS5fcmVzb2x2ZVJlYWN0aW9ucztcbiAgICAgICAgcHJvbWlzZS5fcmVzdWx0ID0gcmVzb2x1dGlvbjtcbiAgICAgICAgcHJvbWlzZS5fcmVzb2x2ZVJlYWN0aW9ucyA9IHZvaWQgMDtcbiAgICAgICAgcHJvbWlzZS5fcmVqZWN0UmVhY3Rpb25zID0gdm9pZCAwO1xuICAgICAgICBwcm9taXNlLl9zdGF0dXMgPSAnaGFzLXJlc29sdXRpb24nO1xuICAgICAgICB0cmlnZ2VyUHJvbWlzZVJlYWN0aW9ucyhyZWFjdGlvbnMsIHJlc29sdXRpb24pO1xuICAgICAgfTtcbiAgICAgIHZhciByZWplY3QgPSBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIGlmIChwcm9taXNlLl9zdGF0dXMgIT09ICd1bnJlc29sdmVkJykgeyByZXR1cm47IH1cbiAgICAgICAgdmFyIHJlYWN0aW9ucyA9IHByb21pc2UuX3JlamVjdFJlYWN0aW9ucztcbiAgICAgICAgcHJvbWlzZS5fcmVzdWx0ID0gcmVhc29uO1xuICAgICAgICBwcm9taXNlLl9yZXNvbHZlUmVhY3Rpb25zID0gdm9pZCAwO1xuICAgICAgICBwcm9taXNlLl9yZWplY3RSZWFjdGlvbnMgPSB2b2lkIDA7XG4gICAgICAgIHByb21pc2UuX3N0YXR1cyA9ICdoYXMtcmVqZWN0aW9uJztcbiAgICAgICAgdHJpZ2dlclByb21pc2VSZWFjdGlvbnMocmVhY3Rpb25zLCByZWFzb24pO1xuICAgICAgfTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc29sdmVyKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJlamVjdChlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH07XG4gICAgUHJvbWlzZSRwcm90b3R5cGUgPSBQcm9taXNlLnByb3RvdHlwZTtcbiAgICBkZWZpbmVQcm9wZXJ0aWVzKFByb21pc2UsIHtcbiAgICAgICdAQGNyZWF0ZSc6IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgdmFyIGNvbnN0cnVjdG9yID0gdGhpcztcbiAgICAgICAgLy8gQWxsb2NhdGVQcm9taXNlXG4gICAgICAgIC8vIFRoZSBgb2JqYCBwYXJhbWV0ZXIgaXMgYSBoYWNrIHdlIHVzZSBmb3IgZXM1XG4gICAgICAgIC8vIGNvbXBhdGliaWxpdHkuXG4gICAgICAgIHZhciBwcm90b3R5cGUgPSBjb25zdHJ1Y3Rvci5wcm90b3R5cGUgfHwgUHJvbWlzZSRwcm90b3R5cGU7XG4gICAgICAgIG9iaiA9IG9iaiB8fCBjcmVhdGUocHJvdG90eXBlKTtcbiAgICAgICAgZGVmaW5lUHJvcGVydGllcyhvYmosIHtcbiAgICAgICAgICBfc3RhdHVzOiB2b2lkIDAsXG4gICAgICAgICAgX3Jlc3VsdDogdm9pZCAwLFxuICAgICAgICAgIF9yZXNvbHZlUmVhY3Rpb25zOiB2b2lkIDAsXG4gICAgICAgICAgX3JlamVjdFJlYWN0aW9uczogdm9pZCAwLFxuICAgICAgICAgIF9wcm9taXNlQ29uc3RydWN0b3I6IHZvaWQgMFxuICAgICAgICB9KTtcbiAgICAgICAgb2JqLl9wcm9taXNlQ29uc3RydWN0b3IgPSBjb25zdHJ1Y3RvcjtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBfcHJvbWlzZUFsbFJlc29sdmVyID0gZnVuY3Rpb24gKGluZGV4LCB2YWx1ZXMsIGNhcGFiaWxpdHksIHJlbWFpbmluZykge1xuICAgICAgdmFyIGRvbmUgPSBmYWxzZTtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoeCkge1xuICAgICAgICBpZiAoZG9uZSkgeyByZXR1cm47IH0gLy8gcHJvdGVjdCBhZ2FpbnN0IGJlaW5nIGNhbGxlZCBtdWx0aXBsZSB0aW1lc1xuICAgICAgICBkb25lID0gdHJ1ZTtcbiAgICAgICAgdmFsdWVzW2luZGV4XSA9IHg7XG4gICAgICAgIGlmICgoLS1yZW1haW5pbmcuY291bnQpID09PSAwKSB7XG4gICAgICAgICAgdmFyIHJlc29sdmUgPSBjYXBhYmlsaXR5LnJlc29sdmU7XG4gICAgICAgICAgcmVzb2x2ZSh2YWx1ZXMpOyAvLyBjYWxsIHcvIHRoaXM9PT11bmRlZmluZWRcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgUHJvbWlzZS5hbGwgPSBmdW5jdGlvbiAoaXRlcmFibGUpIHtcbiAgICAgIHZhciBDID0gdGhpcztcbiAgICAgIHZhciBjYXBhYmlsaXR5ID0gbmV3IFByb21pc2VDYXBhYmlsaXR5KEMpO1xuICAgICAgdmFyIHJlc29sdmUgPSBjYXBhYmlsaXR5LnJlc29sdmU7XG4gICAgICB2YXIgcmVqZWN0ID0gY2FwYWJpbGl0eS5yZWplY3Q7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAoIUVTLklzSXRlcmFibGUoaXRlcmFibGUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYmFkIGl0ZXJhYmxlJyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGl0ID0gRVMuR2V0SXRlcmF0b3IoaXRlcmFibGUpO1xuICAgICAgICB2YXIgdmFsdWVzID0gW10sIHJlbWFpbmluZyA9IHsgY291bnQ6IDEgfTtcbiAgICAgICAgZm9yICh2YXIgaW5kZXggPSAwOyA7IGluZGV4KyspIHtcbiAgICAgICAgICB2YXIgbmV4dCA9IEVTLkl0ZXJhdG9yTmV4dChpdCk7XG4gICAgICAgICAgaWYgKG5leHQuZG9uZSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBuZXh0UHJvbWlzZSA9IEMucmVzb2x2ZShuZXh0LnZhbHVlKTtcbiAgICAgICAgICB2YXIgcmVzb2x2ZUVsZW1lbnQgPSBfcHJvbWlzZUFsbFJlc29sdmVyKFxuICAgICAgICAgICAgaW5kZXgsIHZhbHVlcywgY2FwYWJpbGl0eSwgcmVtYWluaW5nXG4gICAgICAgICAgKTtcbiAgICAgICAgICByZW1haW5pbmcuY291bnQrKztcbiAgICAgICAgICBuZXh0UHJvbWlzZS50aGVuKHJlc29sdmVFbGVtZW50LCBjYXBhYmlsaXR5LnJlamVjdCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCgtLXJlbWFpbmluZy5jb3VudCkgPT09IDApIHtcbiAgICAgICAgICByZXNvbHZlKHZhbHVlcyk7IC8vIGNhbGwgdy8gdGhpcz09PXVuZGVmaW5lZFxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJlamVjdChlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjYXBhYmlsaXR5LnByb21pc2U7XG4gICAgfTtcblxuICAgIFByb21pc2UucmFjZSA9IGZ1bmN0aW9uIChpdGVyYWJsZSkge1xuICAgICAgdmFyIEMgPSB0aGlzO1xuICAgICAgdmFyIGNhcGFiaWxpdHkgPSBuZXcgUHJvbWlzZUNhcGFiaWxpdHkoQyk7XG4gICAgICB2YXIgcmVzb2x2ZSA9IGNhcGFiaWxpdHkucmVzb2x2ZTtcbiAgICAgIHZhciByZWplY3QgPSBjYXBhYmlsaXR5LnJlamVjdDtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICghRVMuSXNJdGVyYWJsZShpdGVyYWJsZSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdiYWQgaXRlcmFibGUnKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaXQgPSBFUy5HZXRJdGVyYXRvcihpdGVyYWJsZSk7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgdmFyIG5leHQgPSBFUy5JdGVyYXRvck5leHQoaXQpO1xuICAgICAgICAgIGlmIChuZXh0LmRvbmUpIHtcbiAgICAgICAgICAgIC8vIElmIGl0ZXJhYmxlIGhhcyBubyBpdGVtcywgcmVzdWx0aW5nIHByb21pc2Ugd2lsbCBuZXZlclxuICAgICAgICAgICAgLy8gcmVzb2x2ZTsgc2VlOlxuICAgICAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2RvbWVuaWMvcHJvbWlzZXMtdW53cmFwcGluZy9pc3N1ZXMvNzVcbiAgICAgICAgICAgIC8vIGh0dHBzOi8vYnVncy5lY21hc2NyaXB0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MjUxNVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBuZXh0UHJvbWlzZSA9IEMucmVzb2x2ZShuZXh0LnZhbHVlKTtcbiAgICAgICAgICBuZXh0UHJvbWlzZS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNhcGFiaWxpdHkucHJvbWlzZTtcbiAgICB9O1xuXG4gICAgUHJvbWlzZS5yZWplY3QgPSBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICB2YXIgQyA9IHRoaXM7XG4gICAgICB2YXIgY2FwYWJpbGl0eSA9IG5ldyBQcm9taXNlQ2FwYWJpbGl0eShDKTtcbiAgICAgIHZhciByZWplY3QgPSBjYXBhYmlsaXR5LnJlamVjdDtcbiAgICAgIHJlamVjdChyZWFzb24pOyAvLyBjYWxsIHdpdGggdGhpcz09PXVuZGVmaW5lZFxuICAgICAgcmV0dXJuIGNhcGFiaWxpdHkucHJvbWlzZTtcbiAgICB9O1xuXG4gICAgUHJvbWlzZS5yZXNvbHZlID0gZnVuY3Rpb24gKHYpIHtcbiAgICAgIHZhciBDID0gdGhpcztcbiAgICAgIGlmIChFUy5Jc1Byb21pc2UodikpIHtcbiAgICAgICAgdmFyIGNvbnN0cnVjdG9yID0gdi5fcHJvbWlzZUNvbnN0cnVjdG9yO1xuICAgICAgICBpZiAoY29uc3RydWN0b3IgPT09IEMpIHsgcmV0dXJuIHY7IH1cbiAgICAgIH1cbiAgICAgIHZhciBjYXBhYmlsaXR5ID0gbmV3IFByb21pc2VDYXBhYmlsaXR5KEMpO1xuICAgICAgdmFyIHJlc29sdmUgPSBjYXBhYmlsaXR5LnJlc29sdmU7XG4gICAgICByZXNvbHZlKHYpOyAvLyBjYWxsIHdpdGggdGhpcz09PXVuZGVmaW5lZFxuICAgICAgcmV0dXJuIGNhcGFiaWxpdHkucHJvbWlzZTtcbiAgICB9O1xuXG4gICAgUHJvbWlzZS5wcm90b3R5cGVbJ2NhdGNoJ10gPSBmdW5jdGlvbiAob25SZWplY3RlZCkge1xuICAgICAgcmV0dXJuIHRoaXMudGhlbih2b2lkIDAsIG9uUmVqZWN0ZWQpO1xuICAgIH07XG5cbiAgICBQcm9taXNlLnByb3RvdHlwZS50aGVuID0gZnVuY3Rpb24gKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSB7XG4gICAgICB2YXIgcHJvbWlzZSA9IHRoaXM7XG4gICAgICBpZiAoIUVTLklzUHJvbWlzZShwcm9taXNlKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKCdub3QgYSBwcm9taXNlJyk7IH1cbiAgICAgIC8vIHRoaXMuY29uc3RydWN0b3Igbm90IHRoaXMuX3Byb21pc2VDb25zdHJ1Y3Rvcjsgc2VlXG4gICAgICAvLyBodHRwczovL2J1Z3MuZWNtYXNjcmlwdC5vcmcvc2hvd19idWcuY2dpP2lkPTI1MTNcbiAgICAgIHZhciBDID0gdGhpcy5jb25zdHJ1Y3RvcjtcbiAgICAgIHZhciBjYXBhYmlsaXR5ID0gbmV3IFByb21pc2VDYXBhYmlsaXR5KEMpO1xuICAgICAgaWYgKCFFUy5Jc0NhbGxhYmxlKG9uUmVqZWN0ZWQpKSB7XG4gICAgICAgIG9uUmVqZWN0ZWQgPSBmdW5jdGlvbiAoZSkgeyB0aHJvdyBlOyB9O1xuICAgICAgfVxuICAgICAgaWYgKCFFUy5Jc0NhbGxhYmxlKG9uRnVsZmlsbGVkKSkge1xuICAgICAgICBvbkZ1bGZpbGxlZCA9IGZ1bmN0aW9uICh4KSB7IHJldHVybiB4OyB9O1xuICAgICAgfVxuICAgICAgdmFyIHJlc29sdXRpb25IYW5kbGVyID1cbiAgICAgICAgcHJvbWlzZVJlc29sdXRpb25IYW5kbGVyKHByb21pc2UsIG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKTtcbiAgICAgIHZhciByZXNvbHZlUmVhY3Rpb24gPVxuICAgICAgICB7IGNhcGFiaWxpdHk6IGNhcGFiaWxpdHksIGhhbmRsZXI6IHJlc29sdXRpb25IYW5kbGVyIH07XG4gICAgICB2YXIgcmVqZWN0UmVhY3Rpb24gPVxuICAgICAgICB7IGNhcGFiaWxpdHk6IGNhcGFiaWxpdHksIGhhbmRsZXI6IG9uUmVqZWN0ZWQgfTtcbiAgICAgIHN3aXRjaCAocHJvbWlzZS5fc3RhdHVzKSB7XG4gICAgICBjYXNlICd1bnJlc29sdmVkJzpcbiAgICAgICAgcHJvbWlzZS5fcmVzb2x2ZVJlYWN0aW9ucy5wdXNoKHJlc29sdmVSZWFjdGlvbik7XG4gICAgICAgIHByb21pc2UuX3JlamVjdFJlYWN0aW9ucy5wdXNoKHJlamVjdFJlYWN0aW9uKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdoYXMtcmVzb2x1dGlvbic6XG4gICAgICAgIHRyaWdnZXJQcm9taXNlUmVhY3Rpb25zKFtyZXNvbHZlUmVhY3Rpb25dLCBwcm9taXNlLl9yZXN1bHQpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2hhcy1yZWplY3Rpb24nOlxuICAgICAgICB0cmlnZ2VyUHJvbWlzZVJlYWN0aW9ucyhbcmVqZWN0UmVhY3Rpb25dLCBwcm9taXNlLl9yZXN1bHQpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3VuZXhwZWN0ZWQnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjYXBhYmlsaXR5LnByb21pc2U7XG4gICAgfTtcblxuICAgIHJldHVybiBQcm9taXNlO1xuICB9KSgpO1xuXG4gIC8vIENocm9tZSdzIG5hdGl2ZSBQcm9taXNlIGhhcyBleHRyYSBtZXRob2RzIHRoYXQgaXQgc2hvdWxkbid0IGhhdmUuIExldCdzIHJlbW92ZSB0aGVtLlxuICBpZiAoZ2xvYmFscy5Qcm9taXNlKSB7XG4gICAgZGVsZXRlIGdsb2JhbHMuUHJvbWlzZS5hY2NlcHQ7XG4gICAgZGVsZXRlIGdsb2JhbHMuUHJvbWlzZS5kZWZlcjtcbiAgICBkZWxldGUgZ2xvYmFscy5Qcm9taXNlLnByb3RvdHlwZS5jaGFpbjtcbiAgfVxuXG4gIC8vIGV4cG9ydCB0aGUgUHJvbWlzZSBjb25zdHJ1Y3Rvci5cbiAgZGVmaW5lUHJvcGVydGllcyhnbG9iYWxzLCB7IFByb21pc2U6IFByb21pc2VTaGltIH0pO1xuICAvLyBJbiBDaHJvbWUgMzMgKGFuZCB0aGVyZWFib3V0cykgUHJvbWlzZSBpcyBkZWZpbmVkLCBidXQgdGhlXG4gIC8vIGltcGxlbWVudGF0aW9uIGlzIGJ1Z2d5IGluIGEgbnVtYmVyIG9mIHdheXMuICBMZXQncyBjaGVjayBzdWJjbGFzc2luZ1xuICAvLyBzdXBwb3J0IHRvIHNlZSBpZiB3ZSBoYXZlIGEgYnVnZ3kgaW1wbGVtZW50YXRpb24uXG4gIHZhciBwcm9taXNlU3VwcG9ydHNTdWJjbGFzc2luZyA9IHN1cHBvcnRzU3ViY2xhc3NpbmcoZ2xvYmFscy5Qcm9taXNlLCBmdW5jdGlvbiAoUykge1xuICAgIHJldHVybiBTLnJlc29sdmUoNDIpIGluc3RhbmNlb2YgUztcbiAgfSk7XG4gIHZhciBwcm9taXNlSWdub3Jlc05vbkZ1bmN0aW9uVGhlbkNhbGxiYWNrcyA9IChmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgIGdsb2JhbHMuUHJvbWlzZS5yZWplY3QoNDIpLnRoZW4obnVsbCwgNSkudGhlbihudWxsLCBmdW5jdGlvbiAoKSB7fSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfSgpKTtcbiAgdmFyIHByb21pc2VSZXF1aXJlc09iamVjdENvbnRleHQgPSAoZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7IFByb21pc2UuY2FsbCgzLCBmdW5jdGlvbiAoKSB7fSk7IH0gY2F0Y2ggKGUpIHsgcmV0dXJuIHRydWU7IH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0oKSk7XG4gIGlmICghcHJvbWlzZVN1cHBvcnRzU3ViY2xhc3NpbmcgfHwgIXByb21pc2VJZ25vcmVzTm9uRnVuY3Rpb25UaGVuQ2FsbGJhY2tzIHx8ICFwcm9taXNlUmVxdWlyZXNPYmplY3RDb250ZXh0KSB7XG4gICAgZ2xvYmFscy5Qcm9taXNlID0gUHJvbWlzZVNoaW07XG4gIH1cblxuICAvLyBNYXAgYW5kIFNldCByZXF1aXJlIGEgdHJ1ZSBFUzUgZW52aXJvbm1lbnRcbiAgLy8gVGhlaXIgZmFzdCBwYXRoIGFsc28gcmVxdWlyZXMgdGhhdCB0aGUgZW52aXJvbm1lbnQgcHJlc2VydmVcbiAgLy8gcHJvcGVydHkgaW5zZXJ0aW9uIG9yZGVyLCB3aGljaCBpcyBub3QgZ3VhcmFudGVlZCBieSB0aGUgc3BlYy5cbiAgdmFyIHRlc3RPcmRlciA9IGZ1bmN0aW9uIChhKSB7XG4gICAgdmFyIGIgPSBPYmplY3Qua2V5cyhhLnJlZHVjZShmdW5jdGlvbiAobywgaykge1xuICAgICAgb1trXSA9IHRydWU7XG4gICAgICByZXR1cm4gbztcbiAgICB9LCB7fSkpO1xuICAgIHJldHVybiBhLmpvaW4oJzonKSA9PT0gYi5qb2luKCc6Jyk7XG4gIH07XG4gIHZhciBwcmVzZXJ2ZXNJbnNlcnRpb25PcmRlciA9IHRlc3RPcmRlcihbJ3onLCAnYScsICdiYiddKTtcbiAgLy8gc29tZSBlbmdpbmVzIChlZywgQ2hyb21lKSBvbmx5IHByZXNlcnZlIGluc2VydGlvbiBvcmRlciBmb3Igc3RyaW5nIGtleXNcbiAgdmFyIHByZXNlcnZlc051bWVyaWNJbnNlcnRpb25PcmRlciA9IHRlc3RPcmRlcihbJ3onLCAxLCAnYScsICczJywgMl0pO1xuXG4gIGlmIChzdXBwb3J0c0Rlc2NyaXB0b3JzKSB7XG5cbiAgICB2YXIgZmFzdGtleSA9IGZ1bmN0aW9uIGZhc3RrZXkoa2V5KSB7XG4gICAgICBpZiAoIXByZXNlcnZlc0luc2VydGlvbk9yZGVyKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgdmFyIHR5cGUgPSB0eXBlb2Yga2V5O1xuICAgICAgaWYgKHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiAnJCcgKyBrZXk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdudW1iZXInKSB7XG4gICAgICAgIC8vIG5vdGUgdGhhdCAtMCB3aWxsIGdldCBjb2VyY2VkIHRvIFwiMFwiIHdoZW4gdXNlZCBhcyBhIHByb3BlcnR5IGtleVxuICAgICAgICBpZiAoIXByZXNlcnZlc051bWVyaWNJbnNlcnRpb25PcmRlcikge1xuICAgICAgICAgIHJldHVybiAnbicgKyBrZXk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH07XG5cbiAgICB2YXIgZW1wdHlPYmplY3QgPSBmdW5jdGlvbiBlbXB0eU9iamVjdCgpIHtcbiAgICAgIC8vIGFjY29tb2RhdGUgc29tZSBvbGRlciBub3QtcXVpdGUtRVM1IGJyb3dzZXJzXG4gICAgICByZXR1cm4gT2JqZWN0LmNyZWF0ZSA/IE9iamVjdC5jcmVhdGUobnVsbCkgOiB7fTtcbiAgICB9O1xuXG4gICAgdmFyIGNvbGxlY3Rpb25TaGltcyA9IHtcbiAgICAgIE1hcDogKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB2YXIgZW1wdHkgPSB7fTtcblxuICAgICAgICBmdW5jdGlvbiBNYXBFbnRyeShrZXksIHZhbHVlKSB7XG4gICAgICAgICAgdGhpcy5rZXkgPSBrZXk7XG4gICAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgIHRoaXMubmV4dCA9IG51bGw7XG4gICAgICAgICAgdGhpcy5wcmV2ID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIE1hcEVudHJ5LnByb3RvdHlwZS5pc1JlbW92ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMua2V5ID09PSBlbXB0eTtcbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBNYXBJdGVyYXRvcihtYXAsIGtpbmQpIHtcbiAgICAgICAgICB0aGlzLmhlYWQgPSBtYXAuX2hlYWQ7XG4gICAgICAgICAgdGhpcy5pID0gdGhpcy5oZWFkO1xuICAgICAgICAgIHRoaXMua2luZCA9IGtpbmQ7XG4gICAgICAgIH1cblxuICAgICAgICBNYXBJdGVyYXRvci5wcm90b3R5cGUgPSB7XG4gICAgICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGkgPSB0aGlzLmksIGtpbmQgPSB0aGlzLmtpbmQsIGhlYWQgPSB0aGlzLmhlYWQsIHJlc3VsdDtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5pID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogdm9pZCAwLCBkb25lOiB0cnVlIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGlsZSAoaS5pc1JlbW92ZWQoKSAmJiBpICE9PSBoZWFkKSB7XG4gICAgICAgICAgICAgIC8vIGJhY2sgdXAgb2ZmIG9mIHJlbW92ZWQgZW50cmllc1xuICAgICAgICAgICAgICBpID0gaS5wcmV2O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gYWR2YW5jZSB0byBuZXh0IHVucmV0dXJuZWQgZWxlbWVudC5cbiAgICAgICAgICAgIHdoaWxlIChpLm5leHQgIT09IGhlYWQpIHtcbiAgICAgICAgICAgICAgaSA9IGkubmV4dDtcbiAgICAgICAgICAgICAgaWYgKCFpLmlzUmVtb3ZlZCgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGtpbmQgPT09ICdrZXknKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQgPSBpLmtleTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtpbmQgPT09ICd2YWx1ZScpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGkudmFsdWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IFtpLmtleSwgaS52YWx1ZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuaSA9IGk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IHJlc3VsdCwgZG9uZTogZmFsc2UgfTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gb25jZSB0aGUgaXRlcmF0b3IgaXMgZG9uZSwgaXQgaXMgZG9uZSBmb3JldmVyLlxuICAgICAgICAgICAgdGhpcy5pID0gdm9pZCAwO1xuICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgYWRkSXRlcmF0b3IoTWFwSXRlcmF0b3IucHJvdG90eXBlKTtcblxuICAgICAgICBmdW5jdGlvbiBNYXAoaXRlcmFibGUpIHtcbiAgICAgICAgICB2YXIgbWFwID0gdGhpcztcbiAgICAgICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChtYXApKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdNYXAgZG9lcyBub3QgYWNjZXB0IGFyZ3VtZW50cyB3aGVuIGNhbGxlZCBhcyBhIGZ1bmN0aW9uJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG1hcCA9IGVtdWxhdGVFUzZjb25zdHJ1Y3QobWFwKTtcbiAgICAgICAgICBpZiAoIW1hcC5fZXM2bWFwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdiYWQgbWFwJyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGhlYWQgPSBuZXcgTWFwRW50cnkobnVsbCwgbnVsbCk7XG4gICAgICAgICAgLy8gY2lyY3VsYXIgZG91Ymx5LWxpbmtlZCBsaXN0LlxuICAgICAgICAgIGhlYWQubmV4dCA9IGhlYWQucHJldiA9IGhlYWQ7XG5cbiAgICAgICAgICBkZWZpbmVQcm9wZXJ0aWVzKG1hcCwge1xuICAgICAgICAgICAgX2hlYWQ6IGhlYWQsXG4gICAgICAgICAgICBfc3RvcmFnZTogZW1wdHlPYmplY3QoKSxcbiAgICAgICAgICAgIF9zaXplOiAwXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBPcHRpb25hbGx5IGluaXRpYWxpemUgbWFwIGZyb20gaXRlcmFibGVcbiAgICAgICAgICBpZiAodHlwZW9mIGl0ZXJhYmxlICE9PSAndW5kZWZpbmVkJyAmJiBpdGVyYWJsZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdmFyIGl0ID0gRVMuR2V0SXRlcmF0b3IoaXRlcmFibGUpO1xuICAgICAgICAgICAgdmFyIGFkZGVyID0gbWFwLnNldDtcbiAgICAgICAgICAgIGlmICghRVMuSXNDYWxsYWJsZShhZGRlcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcignYmFkIG1hcCcpOyB9XG4gICAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgICB2YXIgbmV4dCA9IEVTLkl0ZXJhdG9yTmV4dChpdCk7XG4gICAgICAgICAgICAgIGlmIChuZXh0LmRvbmUpIHsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgdmFyIG5leHRJdGVtID0gbmV4dC52YWx1ZTtcbiAgICAgICAgICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QobmV4dEl0ZW0pKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZXhwZWN0ZWQgaXRlcmFibGUgb2YgcGFpcnMnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBhZGRlci5jYWxsKG1hcCwgbmV4dEl0ZW1bMF0sIG5leHRJdGVtWzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG1hcDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgTWFwJHByb3RvdHlwZSA9IE1hcC5wcm90b3R5cGU7XG4gICAgICAgIGRlZmluZVByb3BlcnRpZXMoTWFwLCB7XG4gICAgICAgICAgJ0BAY3JlYXRlJzogZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAgICAgdmFyIGNvbnN0cnVjdG9yID0gdGhpcztcbiAgICAgICAgICAgIHZhciBwcm90b3R5cGUgPSBjb25zdHJ1Y3Rvci5wcm90b3R5cGUgfHwgTWFwJHByb3RvdHlwZTtcbiAgICAgICAgICAgIG9iaiA9IG9iaiB8fCBjcmVhdGUocHJvdG90eXBlKTtcbiAgICAgICAgICAgIGRlZmluZVByb3BlcnRpZXMob2JqLCB7IF9lczZtYXA6IHRydWUgfSk7XG4gICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KE1hcC5wcm90b3R5cGUsICdzaXplJywge1xuICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5fc2l6ZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignc2l6ZSBtZXRob2QgY2FsbGVkIG9uIGluY29tcGF0aWJsZSBNYXAnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zaXplO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZGVmaW5lUHJvcGVydGllcyhNYXAucHJvdG90eXBlLCB7XG4gICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICB2YXIgZmtleSA9IGZhc3RrZXkoa2V5KTtcbiAgICAgICAgICAgIGlmIChma2V5ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIC8vIGZhc3QgTygxKSBwYXRoXG4gICAgICAgICAgICAgIHZhciBlbnRyeSA9IHRoaXMuX3N0b3JhZ2VbZmtleV07XG4gICAgICAgICAgICAgIGlmIChlbnRyeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBlbnRyeS52YWx1ZTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBoZWFkID0gdGhpcy5faGVhZCwgaSA9IGhlYWQ7XG4gICAgICAgICAgICB3aGlsZSAoKGkgPSBpLm5leHQpICE9PSBoZWFkKSB7XG4gICAgICAgICAgICAgIGlmIChFUy5TYW1lVmFsdWVaZXJvKGkua2V5LCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGkudmFsdWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgaGFzOiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICB2YXIgZmtleSA9IGZhc3RrZXkoa2V5KTtcbiAgICAgICAgICAgIGlmIChma2V5ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIC8vIGZhc3QgTygxKSBwYXRoXG4gICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgdGhpcy5fc3RvcmFnZVtma2V5XSAhPT0gJ3VuZGVmaW5lZCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaGVhZCA9IHRoaXMuX2hlYWQsIGkgPSBoZWFkO1xuICAgICAgICAgICAgd2hpbGUgKChpID0gaS5uZXh0KSAhPT0gaGVhZCkge1xuICAgICAgICAgICAgICBpZiAoRVMuU2FtZVZhbHVlWmVybyhpLmtleSwga2V5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIHNldDogZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBoZWFkID0gdGhpcy5faGVhZCwgaSA9IGhlYWQsIGVudHJ5O1xuICAgICAgICAgICAgdmFyIGZrZXkgPSBmYXN0a2V5KGtleSk7XG4gICAgICAgICAgICBpZiAoZmtleSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAvLyBmYXN0IE8oMSkgcGF0aFxuICAgICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuX3N0b3JhZ2VbZmtleV0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RvcmFnZVtma2V5XS52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVudHJ5ID0gdGhpcy5fc3RvcmFnZVtma2V5XSA9IG5ldyBNYXBFbnRyeShrZXksIHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpID0gaGVhZC5wcmV2O1xuICAgICAgICAgICAgICAgIC8vIGZhbGwgdGhyb3VnaFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGlsZSAoKGkgPSBpLm5leHQpICE9PSBoZWFkKSB7XG4gICAgICAgICAgICAgIGlmIChFUy5TYW1lVmFsdWVaZXJvKGkua2V5LCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgaS52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbnRyeSA9IGVudHJ5IHx8IG5ldyBNYXBFbnRyeShrZXksIHZhbHVlKTtcbiAgICAgICAgICAgIGlmIChFUy5TYW1lVmFsdWUoLTAsIGtleSkpIHtcbiAgICAgICAgICAgICAgZW50cnkua2V5ID0gKzA7IC8vIGNvZXJjZSAtMCB0byArMCBpbiBlbnRyeVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZW50cnkubmV4dCA9IHRoaXMuX2hlYWQ7XG4gICAgICAgICAgICBlbnRyeS5wcmV2ID0gdGhpcy5faGVhZC5wcmV2O1xuICAgICAgICAgICAgZW50cnkucHJldi5uZXh0ID0gZW50cnk7XG4gICAgICAgICAgICBlbnRyeS5uZXh0LnByZXYgPSBlbnRyeTtcbiAgICAgICAgICAgIHRoaXMuX3NpemUgKz0gMTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICAnZGVsZXRlJzogZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgdmFyIGhlYWQgPSB0aGlzLl9oZWFkLCBpID0gaGVhZDtcbiAgICAgICAgICAgIHZhciBma2V5ID0gZmFzdGtleShrZXkpO1xuICAgICAgICAgICAgaWYgKGZrZXkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgLy8gZmFzdCBPKDEpIHBhdGhcbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9zdG9yYWdlW2ZrZXldID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpID0gdGhpcy5fc3RvcmFnZVtma2V5XS5wcmV2O1xuICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fc3RvcmFnZVtma2V5XTtcbiAgICAgICAgICAgICAgLy8gZmFsbCB0aHJvdWdoXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGlsZSAoKGkgPSBpLm5leHQpICE9PSBoZWFkKSB7XG4gICAgICAgICAgICAgIGlmIChFUy5TYW1lVmFsdWVaZXJvKGkua2V5LCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgaS5rZXkgPSBpLnZhbHVlID0gZW1wdHk7XG4gICAgICAgICAgICAgICAgaS5wcmV2Lm5leHQgPSBpLm5leHQ7XG4gICAgICAgICAgICAgICAgaS5uZXh0LnByZXYgPSBpLnByZXY7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2l6ZSAtPSAxO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGNsZWFyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLl9zaXplID0gMDtcbiAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2UgPSBlbXB0eU9iamVjdCgpO1xuICAgICAgICAgICAgdmFyIGhlYWQgPSB0aGlzLl9oZWFkLCBpID0gaGVhZCwgcCA9IGkubmV4dDtcbiAgICAgICAgICAgIHdoaWxlICgoaSA9IHApICE9PSBoZWFkKSB7XG4gICAgICAgICAgICAgIGkua2V5ID0gaS52YWx1ZSA9IGVtcHR5O1xuICAgICAgICAgICAgICBwID0gaS5uZXh0O1xuICAgICAgICAgICAgICBpLm5leHQgPSBpLnByZXYgPSBoZWFkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaGVhZC5uZXh0ID0gaGVhZC5wcmV2ID0gaGVhZDtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAga2V5czogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNYXBJdGVyYXRvcih0aGlzLCAna2V5Jyk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIHZhbHVlczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNYXBJdGVyYXRvcih0aGlzLCAndmFsdWUnKTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgZW50cmllczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNYXBJdGVyYXRvcih0aGlzLCAna2V5K3ZhbHVlJyk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGZvckVhY2g6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IG51bGw7XG4gICAgICAgICAgICB2YXIgaXQgPSB0aGlzLmVudHJpZXMoKTtcbiAgICAgICAgICAgIGZvciAodmFyIGVudHJ5ID0gaXQubmV4dCgpOyAhZW50cnkuZG9uZTsgZW50cnkgPSBpdC5uZXh0KCkpIHtcbiAgICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsKGNvbnRleHQsIGVudHJ5LnZhbHVlWzFdLCBlbnRyeS52YWx1ZVswXSwgdGhpcyk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZW50cnkudmFsdWVbMV0sIGVudHJ5LnZhbHVlWzBdLCB0aGlzKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGFkZEl0ZXJhdG9yKE1hcC5wcm90b3R5cGUsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuZW50cmllcygpOyB9KTtcblxuICAgICAgICByZXR1cm4gTWFwO1xuICAgICAgfSkoKSxcblxuICAgICAgU2V0OiAoZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBDcmVhdGluZyBhIE1hcCBpcyBleHBlbnNpdmUuICBUbyBzcGVlZCB1cCB0aGUgY29tbW9uIGNhc2Ugb2ZcbiAgICAgICAgLy8gU2V0cyBjb250YWluaW5nIG9ubHkgc3RyaW5nIG9yIG51bWVyaWMga2V5cywgd2UgdXNlIGFuIG9iamVjdFxuICAgICAgICAvLyBhcyBiYWNraW5nIHN0b3JhZ2UgYW5kIGxhemlseSBjcmVhdGUgYSBmdWxsIE1hcCBvbmx5IHdoZW5cbiAgICAgICAgLy8gcmVxdWlyZWQuXG4gICAgICAgIHZhciBTZXRTaGltID0gZnVuY3Rpb24gU2V0KGl0ZXJhYmxlKSB7XG4gICAgICAgICAgdmFyIHNldCA9IHRoaXM7XG4gICAgICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3Qoc2V0KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignU2V0IGRvZXMgbm90IGFjY2VwdCBhcmd1bWVudHMgd2hlbiBjYWxsZWQgYXMgYSBmdW5jdGlvbicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzZXQgPSBlbXVsYXRlRVM2Y29uc3RydWN0KHNldCk7XG4gICAgICAgICAgaWYgKCFzZXQuX2VzNnNldCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYmFkIHNldCcpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGRlZmluZVByb3BlcnRpZXMoc2V0LCB7XG4gICAgICAgICAgICAnW1tTZXREYXRhXV0nOiBudWxsLFxuICAgICAgICAgICAgX3N0b3JhZ2U6IGVtcHR5T2JqZWN0KClcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIE9wdGlvbmFsbHkgaW5pdGlhbGl6ZSBtYXAgZnJvbSBpdGVyYWJsZVxuICAgICAgICAgIGlmICh0eXBlb2YgaXRlcmFibGUgIT09ICd1bmRlZmluZWQnICYmIGl0ZXJhYmxlICE9PSBudWxsKSB7XG4gICAgICAgICAgICB2YXIgaXQgPSBFUy5HZXRJdGVyYXRvcihpdGVyYWJsZSk7XG4gICAgICAgICAgICB2YXIgYWRkZXIgPSBzZXQuYWRkO1xuICAgICAgICAgICAgaWYgKCFFUy5Jc0NhbGxhYmxlKGFkZGVyKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKCdiYWQgc2V0Jyk7IH1cbiAgICAgICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICAgIHZhciBuZXh0ID0gRVMuSXRlcmF0b3JOZXh0KGl0KTtcbiAgICAgICAgICAgICAgaWYgKG5leHQuZG9uZSkgeyBicmVhazsgfVxuICAgICAgICAgICAgICB2YXIgbmV4dEl0ZW0gPSBuZXh0LnZhbHVlO1xuICAgICAgICAgICAgICBhZGRlci5jYWxsKHNldCwgbmV4dEl0ZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gc2V0O1xuICAgICAgICB9O1xuICAgICAgICB2YXIgU2V0JHByb3RvdHlwZSA9IFNldFNoaW0ucHJvdG90eXBlO1xuICAgICAgICBkZWZpbmVQcm9wZXJ0aWVzKFNldFNoaW0sIHtcbiAgICAgICAgICAnQEBjcmVhdGUnOiBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgICAgICB2YXIgY29uc3RydWN0b3IgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIHByb3RvdHlwZSA9IGNvbnN0cnVjdG9yLnByb3RvdHlwZSB8fCBTZXQkcHJvdG90eXBlO1xuICAgICAgICAgICAgb2JqID0gb2JqIHx8IGNyZWF0ZShwcm90b3R5cGUpO1xuICAgICAgICAgICAgZGVmaW5lUHJvcGVydGllcyhvYmosIHsgX2VzNnNldDogdHJ1ZSB9KTtcbiAgICAgICAgICAgIHJldHVybiBvYmo7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTd2l0Y2ggZnJvbSB0aGUgb2JqZWN0IGJhY2tpbmcgc3RvcmFnZSB0byBhIGZ1bGwgTWFwLlxuICAgICAgICB2YXIgZW5zdXJlTWFwID0gZnVuY3Rpb24gZW5zdXJlTWFwKHNldCkge1xuICAgICAgICAgIGlmICghc2V0WydbW1NldERhdGFdXSddKSB7XG4gICAgICAgICAgICB2YXIgbSA9IHNldFsnW1tTZXREYXRhXV0nXSA9IG5ldyBjb2xsZWN0aW9uU2hpbXMuTWFwKCk7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhzZXQuX3N0b3JhZ2UpLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICAgICAgICAgICAgLy8gZmFzdCBjaGVjayBmb3IgbGVhZGluZyAnJCdcbiAgICAgICAgICAgICAgaWYgKGsuY2hhckNvZGVBdCgwKSA9PT0gMzYpIHtcbiAgICAgICAgICAgICAgICBrID0gay5zbGljZSgxKTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChrLmNoYXJBdCgwKSA9PT0gJ24nKSB7XG4gICAgICAgICAgICAgICAgayA9ICtrLnNsaWNlKDEpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGsgPSAraztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBtLnNldChrLCBrKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc2V0Ll9zdG9yYWdlID0gbnVsbDsgLy8gZnJlZSBvbGQgYmFja2luZyBzdG9yYWdlXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShTZXRTaGltLnByb3RvdHlwZSwgJ3NpemUnLCB7XG4gICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9zdG9yYWdlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vcGF1bG1pbGxyL2VzNi1zaGltL2lzc3Vlcy8xNzZcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignc2l6ZSBtZXRob2QgY2FsbGVkIG9uIGluY29tcGF0aWJsZSBTZXQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVuc3VyZU1hcCh0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzWydbW1NldERhdGFdXSddLnNpemU7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBkZWZpbmVQcm9wZXJ0aWVzKFNldFNoaW0ucHJvdG90eXBlLCB7XG4gICAgICAgICAgaGFzOiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICB2YXIgZmtleTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9zdG9yYWdlICYmIChma2V5ID0gZmFzdGtleShrZXkpKSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXR1cm4gISF0aGlzLl9zdG9yYWdlW2ZrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZW5zdXJlTWFwKHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbJ1tbU2V0RGF0YV1dJ10uaGFzKGtleSk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGFkZDogZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgdmFyIGZrZXk7XG4gICAgICAgICAgICBpZiAodGhpcy5fc3RvcmFnZSAmJiAoZmtleSA9IGZhc3RrZXkoa2V5KSkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgdGhpcy5fc3RvcmFnZVtma2V5XSA9IHRydWU7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZW5zdXJlTWFwKHRoaXMpO1xuICAgICAgICAgICAgdGhpc1snW1tTZXREYXRhXV0nXS5zZXQoa2V5LCBrZXkpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgICdkZWxldGUnOiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICB2YXIgZmtleTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9zdG9yYWdlICYmIChma2V5ID0gZmFzdGtleShrZXkpKSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICB2YXIgaGFzRktleSA9IF9oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuX3N0b3JhZ2UsIGZrZXkpO1xuICAgICAgICAgICAgICByZXR1cm4gKGRlbGV0ZSB0aGlzLl9zdG9yYWdlW2ZrZXldKSAmJiBoYXNGS2V5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZW5zdXJlTWFwKHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbJ1tbU2V0RGF0YV1dJ11bJ2RlbGV0ZSddKGtleSk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGNsZWFyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fc3RvcmFnZSkge1xuICAgICAgICAgICAgICB0aGlzLl9zdG9yYWdlID0gZW1wdHlPYmplY3QoKTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXNbJ1tbU2V0RGF0YV1dJ10uY2xlYXIoKTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgdmFsdWVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBlbnN1cmVNYXAodGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpc1snW1tTZXREYXRhXV0nXS52YWx1ZXMoKTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgZW50cmllczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZW5zdXJlTWFwKHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbJ1tbU2V0RGF0YV1dJ10uZW50cmllcygpO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBmb3JFYWNoOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBjb250ZXh0ID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiBudWxsO1xuICAgICAgICAgICAgdmFyIGVudGlyZVNldCA9IHRoaXM7XG4gICAgICAgICAgICBlbnN1cmVNYXAoZW50aXJlU2V0KTtcbiAgICAgICAgICAgIHRoaXNbJ1tbU2V0RGF0YV1dJ10uZm9yRWFjaChmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwoY29udGV4dCwga2V5LCBrZXksIGVudGlyZVNldCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soa2V5LCBrZXksIGVudGlyZVNldCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGRlZmluZVByb3BlcnR5KFNldFNoaW0sICdrZXlzJywgU2V0U2hpbS52YWx1ZXMsIHRydWUpO1xuICAgICAgICBhZGRJdGVyYXRvcihTZXRTaGltLnByb3RvdHlwZSwgZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy52YWx1ZXMoKTsgfSk7XG5cbiAgICAgICAgcmV0dXJuIFNldFNoaW07XG4gICAgICB9KSgpXG4gICAgfTtcbiAgICBkZWZpbmVQcm9wZXJ0aWVzKGdsb2JhbHMsIGNvbGxlY3Rpb25TaGltcyk7XG5cbiAgICBpZiAoZ2xvYmFscy5NYXAgfHwgZ2xvYmFscy5TZXQpIHtcbiAgICAgIC8qXG4gICAgICAgIC0gSW4gRmlyZWZveCA8IDIzLCBNYXAjc2l6ZSBpcyBhIGZ1bmN0aW9uLlxuICAgICAgICAtIEluIGFsbCBjdXJyZW50IEZpcmVmb3gsIFNldCNlbnRyaWVzL2tleXMvdmFsdWVzICYgTWFwI2NsZWFyIGRvIG5vdCBleGlzdFxuICAgICAgICAtIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTg2OTk5NlxuICAgICAgICAtIEluIEZpcmVmb3ggMjQsIE1hcCBhbmQgU2V0IGRvIG5vdCBpbXBsZW1lbnQgZm9yRWFjaFxuICAgICAgICAtIEluIEZpcmVmb3ggMjUgYXQgbGVhc3QsIE1hcCBhbmQgU2V0IGFyZSBjYWxsYWJsZSB3aXRob3V0IFwibmV3XCJcbiAgICAgICovXG4gICAgICBpZiAoXG4gICAgICAgIHR5cGVvZiBnbG9iYWxzLk1hcC5wcm90b3R5cGUuY2xlYXIgIT09ICdmdW5jdGlvbicgfHxcbiAgICAgICAgbmV3IGdsb2JhbHMuU2V0KCkuc2l6ZSAhPT0gMCB8fFxuICAgICAgICBuZXcgZ2xvYmFscy5NYXAoKS5zaXplICE9PSAwIHx8XG4gICAgICAgIHR5cGVvZiBnbG9iYWxzLk1hcC5wcm90b3R5cGUua2V5cyAhPT0gJ2Z1bmN0aW9uJyB8fFxuICAgICAgICB0eXBlb2YgZ2xvYmFscy5TZXQucHJvdG90eXBlLmtleXMgIT09ICdmdW5jdGlvbicgfHxcbiAgICAgICAgdHlwZW9mIGdsb2JhbHMuTWFwLnByb3RvdHlwZS5mb3JFYWNoICE9PSAnZnVuY3Rpb24nIHx8XG4gICAgICAgIHR5cGVvZiBnbG9iYWxzLlNldC5wcm90b3R5cGUuZm9yRWFjaCAhPT0gJ2Z1bmN0aW9uJyB8fFxuICAgICAgICBpc0NhbGxhYmxlV2l0aG91dE5ldyhnbG9iYWxzLk1hcCkgfHxcbiAgICAgICAgaXNDYWxsYWJsZVdpdGhvdXROZXcoZ2xvYmFscy5TZXQpIHx8XG4gICAgICAgICFzdXBwb3J0c1N1YmNsYXNzaW5nKGdsb2JhbHMuTWFwLCBmdW5jdGlvbiAoTSkge1xuICAgICAgICAgIHZhciBtID0gbmV3IE0oW10pO1xuICAgICAgICAgIC8vIEZpcmVmb3ggMzIgaXMgb2sgd2l0aCB0aGUgaW5zdGFudGlhdGluZyB0aGUgc3ViY2xhc3MgYnV0IHdpbGxcbiAgICAgICAgICAvLyB0aHJvdyB3aGVuIHRoZSBtYXAgaXMgdXNlZC5cbiAgICAgICAgICBtLnNldCg0MiwgNDIpO1xuICAgICAgICAgIHJldHVybiBtIGluc3RhbmNlb2YgTTtcbiAgICAgICAgfSlcbiAgICAgICkge1xuICAgICAgICBnbG9iYWxzLk1hcCA9IGNvbGxlY3Rpb25TaGltcy5NYXA7XG4gICAgICAgIGdsb2JhbHMuU2V0ID0gY29sbGVjdGlvblNoaW1zLlNldDtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGdsb2JhbHMuU2V0LnByb3RvdHlwZS5rZXlzICE9PSBnbG9iYWxzLlNldC5wcm90b3R5cGUudmFsdWVzKSB7XG4gICAgICBkZWZpbmVQcm9wZXJ0eShnbG9iYWxzLlNldC5wcm90b3R5cGUsICdrZXlzJywgZ2xvYmFscy5TZXQucHJvdG90eXBlLnZhbHVlcywgdHJ1ZSk7XG4gICAgfVxuICAgIC8vIFNoaW0gaW5jb21wbGV0ZSBpdGVyYXRvciBpbXBsZW1lbnRhdGlvbnMuXG4gICAgYWRkSXRlcmF0b3IoT2JqZWN0LmdldFByb3RvdHlwZU9mKChuZXcgZ2xvYmFscy5NYXAoKSkua2V5cygpKSk7XG4gICAgYWRkSXRlcmF0b3IoT2JqZWN0LmdldFByb3RvdHlwZU9mKChuZXcgZ2xvYmFscy5TZXQoKSkua2V5cygpKSk7XG4gIH1cblxuICByZXR1cm4gZ2xvYmFscztcbn0pKTtcblxuXG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSkiLCIndXNlIHN0cmljdCc7XG5cbmlmICghcmVxdWlyZSgnLi9pcy1pbXBsZW1lbnRlZCcpKCkpIHtcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHJlcXVpcmUoJ2VzNS1leHQvZ2xvYmFsJyksICdTeW1ib2wnLFxuXHRcdHsgdmFsdWU6IHJlcXVpcmUoJy4vcG9seWZpbGwnKSwgY29uZmlndXJhYmxlOiB0cnVlLCBlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHRcdHdyaXRhYmxlOiB0cnVlIH0pO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIHN5bWJvbDtcblx0aWYgKHR5cGVvZiBTeW1ib2wgIT09ICdmdW5jdGlvbicpIHJldHVybiBmYWxzZTtcblx0c3ltYm9sID0gU3ltYm9sKCd0ZXN0IHN5bWJvbCcpO1xuXHR0cnkgeyBTdHJpbmcoc3ltYm9sKTsgfSBjYXRjaCAoZSkgeyByZXR1cm4gZmFsc2U7IH1cblx0aWYgKHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09ICdzeW1ib2wnKSByZXR1cm4gdHJ1ZTtcblxuXHQvLyBSZXR1cm4gJ3RydWUnIGZvciBwb2x5ZmlsbHNcblx0aWYgKHR5cGVvZiBTeW1ib2wuaXNDb25jYXRTcHJlYWRhYmxlICE9PSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuXHRpZiAodHlwZW9mIFN5bWJvbC5pc1JlZ0V4cCAhPT0gJ29iamVjdCcpIHJldHVybiBmYWxzZTtcblx0aWYgKHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgIT09ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG5cdGlmICh0eXBlb2YgU3ltYm9sLnRvUHJpbWl0aXZlICE9PSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuXHRpZiAodHlwZW9mIFN5bWJvbC50b1N0cmluZ1RhZyAhPT0gJ29iamVjdCcpIHJldHVybiBmYWxzZTtcblx0aWYgKHR5cGVvZiBTeW1ib2wudW5zY29wYWJsZXMgIT09ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG5cblx0cmV0dXJuIHRydWU7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYXNzaWduICAgICAgICA9IHJlcXVpcmUoJ2VzNS1leHQvb2JqZWN0L2Fzc2lnbicpXG4gICwgbm9ybWFsaXplT3B0cyA9IHJlcXVpcmUoJ2VzNS1leHQvb2JqZWN0L25vcm1hbGl6ZS1vcHRpb25zJylcbiAgLCBpc0NhbGxhYmxlICAgID0gcmVxdWlyZSgnZXM1LWV4dC9vYmplY3QvaXMtY2FsbGFibGUnKVxuICAsIGNvbnRhaW5zICAgICAgPSByZXF1aXJlKCdlczUtZXh0L3N0cmluZy8jL2NvbnRhaW5zJylcblxuICAsIGQ7XG5cbmQgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChkc2NyLCB2YWx1ZS8qLCBvcHRpb25zKi8pIHtcblx0dmFyIGMsIGUsIHcsIG9wdGlvbnMsIGRlc2M7XG5cdGlmICgoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHx8ICh0eXBlb2YgZHNjciAhPT0gJ3N0cmluZycpKSB7XG5cdFx0b3B0aW9ucyA9IHZhbHVlO1xuXHRcdHZhbHVlID0gZHNjcjtcblx0XHRkc2NyID0gbnVsbDtcblx0fSBlbHNlIHtcblx0XHRvcHRpb25zID0gYXJndW1lbnRzWzJdO1xuXHR9XG5cdGlmIChkc2NyID09IG51bGwpIHtcblx0XHRjID0gdyA9IHRydWU7XG5cdFx0ZSA9IGZhbHNlO1xuXHR9IGVsc2Uge1xuXHRcdGMgPSBjb250YWlucy5jYWxsKGRzY3IsICdjJyk7XG5cdFx0ZSA9IGNvbnRhaW5zLmNhbGwoZHNjciwgJ2UnKTtcblx0XHR3ID0gY29udGFpbnMuY2FsbChkc2NyLCAndycpO1xuXHR9XG5cblx0ZGVzYyA9IHsgdmFsdWU6IHZhbHVlLCBjb25maWd1cmFibGU6IGMsIGVudW1lcmFibGU6IGUsIHdyaXRhYmxlOiB3IH07XG5cdHJldHVybiAhb3B0aW9ucyA/IGRlc2MgOiBhc3NpZ24obm9ybWFsaXplT3B0cyhvcHRpb25zKSwgZGVzYyk7XG59O1xuXG5kLmdzID0gZnVuY3Rpb24gKGRzY3IsIGdldCwgc2V0LyosIG9wdGlvbnMqLykge1xuXHR2YXIgYywgZSwgb3B0aW9ucywgZGVzYztcblx0aWYgKHR5cGVvZiBkc2NyICE9PSAnc3RyaW5nJykge1xuXHRcdG9wdGlvbnMgPSBzZXQ7XG5cdFx0c2V0ID0gZ2V0O1xuXHRcdGdldCA9IGRzY3I7XG5cdFx0ZHNjciA9IG51bGw7XG5cdH0gZWxzZSB7XG5cdFx0b3B0aW9ucyA9IGFyZ3VtZW50c1szXTtcblx0fVxuXHRpZiAoZ2V0ID09IG51bGwpIHtcblx0XHRnZXQgPSB1bmRlZmluZWQ7XG5cdH0gZWxzZSBpZiAoIWlzQ2FsbGFibGUoZ2V0KSkge1xuXHRcdG9wdGlvbnMgPSBnZXQ7XG5cdFx0Z2V0ID0gc2V0ID0gdW5kZWZpbmVkO1xuXHR9IGVsc2UgaWYgKHNldCA9PSBudWxsKSB7XG5cdFx0c2V0ID0gdW5kZWZpbmVkO1xuXHR9IGVsc2UgaWYgKCFpc0NhbGxhYmxlKHNldCkpIHtcblx0XHRvcHRpb25zID0gc2V0O1xuXHRcdHNldCA9IHVuZGVmaW5lZDtcblx0fVxuXHRpZiAoZHNjciA9PSBudWxsKSB7XG5cdFx0YyA9IHRydWU7XG5cdFx0ZSA9IGZhbHNlO1xuXHR9IGVsc2Uge1xuXHRcdGMgPSBjb250YWlucy5jYWxsKGRzY3IsICdjJyk7XG5cdFx0ZSA9IGNvbnRhaW5zLmNhbGwoZHNjciwgJ2UnKTtcblx0fVxuXG5cdGRlc2MgPSB7IGdldDogZ2V0LCBzZXQ6IHNldCwgY29uZmlndXJhYmxlOiBjLCBlbnVtZXJhYmxlOiBlIH07XG5cdHJldHVybiAhb3B0aW9ucyA/IGRlc2MgOiBhc3NpZ24obm9ybWFsaXplT3B0cyhvcHRpb25zKSwgZGVzYyk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBGdW5jdGlvbihcInJldHVybiB0aGlzXCIpKCk7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9pcy1pbXBsZW1lbnRlZCcpKClcblx0PyBPYmplY3QuYXNzaWduXG5cdDogcmVxdWlyZSgnLi9zaGltJyk7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgYXNzaWduID0gT2JqZWN0LmFzc2lnbiwgb2JqO1xuXHRpZiAodHlwZW9mIGFzc2lnbiAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGZhbHNlO1xuXHRvYmogPSB7IGZvbzogJ3JheicgfTtcblx0YXNzaWduKG9iaiwgeyBiYXI6ICdkd2EnIH0sIHsgdHJ6eTogJ3RyenknIH0pO1xuXHRyZXR1cm4gKG9iai5mb28gKyBvYmouYmFyICsgb2JqLnRyenkpID09PSAncmF6ZHdhdHJ6eSc7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIga2V5cyAgPSByZXF1aXJlKCcuLi9rZXlzJylcbiAgLCB2YWx1ZSA9IHJlcXVpcmUoJy4uL3ZhbGlkLXZhbHVlJylcblxuICAsIG1heCA9IE1hdGgubWF4O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChkZXN0LCBzcmMvKiwg4oCmc3JjbiovKSB7XG5cdHZhciBlcnJvciwgaSwgbCA9IG1heChhcmd1bWVudHMubGVuZ3RoLCAyKSwgYXNzaWduO1xuXHRkZXN0ID0gT2JqZWN0KHZhbHVlKGRlc3QpKTtcblx0YXNzaWduID0gZnVuY3Rpb24gKGtleSkge1xuXHRcdHRyeSB7IGRlc3Rba2V5XSA9IHNyY1trZXldOyB9IGNhdGNoIChlKSB7XG5cdFx0XHRpZiAoIWVycm9yKSBlcnJvciA9IGU7XG5cdFx0fVxuXHR9O1xuXHRmb3IgKGkgPSAxOyBpIDwgbDsgKytpKSB7XG5cdFx0c3JjID0gYXJndW1lbnRzW2ldO1xuXHRcdGtleXMoc3JjKS5mb3JFYWNoKGFzc2lnbik7XG5cdH1cblx0aWYgKGVycm9yICE9PSB1bmRlZmluZWQpIHRocm93IGVycm9yO1xuXHRyZXR1cm4gZGVzdDtcbn07XG4iLCIvLyBEZXByZWNhdGVkXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqID09PSAnZnVuY3Rpb24nOyB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vaXMtaW1wbGVtZW50ZWQnKSgpXG5cdD8gT2JqZWN0LmtleXNcblx0OiByZXF1aXJlKCcuL3NoaW0nKTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG5cdHRyeSB7XG5cdFx0T2JqZWN0LmtleXMoJ3ByaW1pdGl2ZScpO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9IGNhdGNoIChlKSB7IHJldHVybiBmYWxzZTsgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGtleXMgPSBPYmplY3Qua2V5cztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqZWN0KSB7XG5cdHJldHVybiBrZXlzKG9iamVjdCA9PSBudWxsID8gb2JqZWN0IDogT2JqZWN0KG9iamVjdCkpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGFzc2lnbiA9IHJlcXVpcmUoJy4vYXNzaWduJylcblxuICAsIGZvckVhY2ggPSBBcnJheS5wcm90b3R5cGUuZm9yRWFjaFxuICAsIGNyZWF0ZSA9IE9iamVjdC5jcmVhdGUsIGdldFByb3RvdHlwZU9mID0gT2JqZWN0LmdldFByb3RvdHlwZU9mXG5cbiAgLCBwcm9jZXNzO1xuXG5wcm9jZXNzID0gZnVuY3Rpb24gKHNyYywgb2JqKSB7XG5cdHZhciBwcm90byA9IGdldFByb3RvdHlwZU9mKHNyYyk7XG5cdHJldHVybiBhc3NpZ24ocHJvdG8gPyBwcm9jZXNzKHByb3RvLCBvYmopIDogb2JqLCBzcmMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3B0aW9ucy8qLCDigKZvcHRpb25zKi8pIHtcblx0dmFyIHJlc3VsdCA9IGNyZWF0ZShudWxsKTtcblx0Zm9yRWFjaC5jYWxsKGFyZ3VtZW50cywgZnVuY3Rpb24gKG9wdGlvbnMpIHtcblx0XHRpZiAob3B0aW9ucyA9PSBudWxsKSByZXR1cm47XG5cdFx0cHJvY2VzcyhPYmplY3Qob3B0aW9ucyksIHJlc3VsdCk7XG5cdH0pO1xuXHRyZXR1cm4gcmVzdWx0O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodmFsdWUpIHtcblx0aWYgKHZhbHVlID09IG51bGwpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgdXNlIG51bGwgb3IgdW5kZWZpbmVkXCIpO1xuXHRyZXR1cm4gdmFsdWU7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vaXMtaW1wbGVtZW50ZWQnKSgpXG5cdD8gU3RyaW5nLnByb3RvdHlwZS5jb250YWluc1xuXHQ6IHJlcXVpcmUoJy4vc2hpbScpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgc3RyID0gJ3JhemR3YXRyenknO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcblx0aWYgKHR5cGVvZiBzdHIuY29udGFpbnMgIT09ICdmdW5jdGlvbicpIHJldHVybiBmYWxzZTtcblx0cmV0dXJuICgoc3RyLmNvbnRhaW5zKCdkd2EnKSA9PT0gdHJ1ZSkgJiYgKHN0ci5jb250YWlucygnZm9vJykgPT09IGZhbHNlKSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaW5kZXhPZiA9IFN0cmluZy5wcm90b3R5cGUuaW5kZXhPZjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc2VhcmNoU3RyaW5nLyosIHBvc2l0aW9uKi8pIHtcblx0cmV0dXJuIGluZGV4T2YuY2FsbCh0aGlzLCBzZWFyY2hTdHJpbmcsIGFyZ3VtZW50c1sxXSkgPiAtMTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBkID0gcmVxdWlyZSgnZCcpXG5cbiAgLCBjcmVhdGUgPSBPYmplY3QuY3JlYXRlLCBkZWZpbmVQcm9wZXJ0aWVzID0gT2JqZWN0LmRlZmluZVByb3BlcnRpZXNcbiAgLCBnZW5lcmF0ZU5hbWUsIFN5bWJvbDtcblxuZ2VuZXJhdGVOYW1lID0gKGZ1bmN0aW9uICgpIHtcblx0dmFyIGNyZWF0ZWQgPSBjcmVhdGUobnVsbCk7XG5cdHJldHVybiBmdW5jdGlvbiAoZGVzYykge1xuXHRcdHZhciBwb3N0Zml4ID0gMDtcblx0XHR3aGlsZSAoY3JlYXRlZFtkZXNjICsgKHBvc3RmaXggfHwgJycpXSkgKytwb3N0Zml4O1xuXHRcdGRlc2MgKz0gKHBvc3RmaXggfHwgJycpO1xuXHRcdGNyZWF0ZWRbZGVzY10gPSB0cnVlO1xuXHRcdHJldHVybiAnQEAnICsgZGVzYztcblx0fTtcbn0oKSk7XG5cbm1vZHVsZS5leHBvcnRzID0gU3ltYm9sID0gZnVuY3Rpb24gKGRlc2NyaXB0aW9uKSB7XG5cdHZhciBzeW1ib2w7XG5cdGlmICh0aGlzIGluc3RhbmNlb2YgU3ltYm9sKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignVHlwZUVycm9yOiBTeW1ib2wgaXMgbm90IGEgY29uc3RydWN0b3InKTtcblx0fVxuXHRzeW1ib2wgPSBjcmVhdGUoU3ltYm9sLnByb3RvdHlwZSk7XG5cdGRlc2NyaXB0aW9uID0gKGRlc2NyaXB0aW9uID09PSB1bmRlZmluZWQgPyAnJyA6IFN0cmluZyhkZXNjcmlwdGlvbikpO1xuXHRyZXR1cm4gZGVmaW5lUHJvcGVydGllcyhzeW1ib2wsIHtcblx0XHRfX2Rlc2NyaXB0aW9uX186IGQoJycsIGRlc2NyaXB0aW9uKSxcblx0XHRfX25hbWVfXzogZCgnJywgZ2VuZXJhdGVOYW1lKGRlc2NyaXB0aW9uKSlcblx0fSk7XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhTeW1ib2wsIHtcblx0Y3JlYXRlOiBkKCcnLCBTeW1ib2woJ2NyZWF0ZScpKSxcblx0aGFzSW5zdGFuY2U6IGQoJycsIFN5bWJvbCgnaGFzSW5zdGFuY2UnKSksXG5cdGlzQ29uY2F0U3ByZWFkYWJsZTogZCgnJywgU3ltYm9sKCdpc0NvbmNhdFNwcmVhZGFibGUnKSksXG5cdGlzUmVnRXhwOiBkKCcnLCBTeW1ib2woJ2lzUmVnRXhwJykpLFxuXHRpdGVyYXRvcjogZCgnJywgU3ltYm9sKCdpdGVyYXRvcicpKSxcblx0dG9QcmltaXRpdmU6IGQoJycsIFN5bWJvbCgndG9QcmltaXRpdmUnKSksXG5cdHRvU3RyaW5nVGFnOiBkKCcnLCBTeW1ib2woJ3RvU3RyaW5nVGFnJykpLFxuXHR1bnNjb3BhYmxlczogZCgnJywgU3ltYm9sKCd1bnNjb3BhYmxlcycpKVxufSk7XG5cbmRlZmluZVByb3BlcnRpZXMoU3ltYm9sLnByb3RvdHlwZSwge1xuXHRwcm9wZXJUb1N0cmluZzogZChmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuICdTeW1ib2wgKCcgKyB0aGlzLl9fZGVzY3JpcHRpb25fXyArICcpJztcblx0fSksXG5cdHRvU3RyaW5nOiBkKCcnLCBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl9fbmFtZV9fOyB9KVxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU3ltYm9sLnByb3RvdHlwZSwgU3ltYm9sLnRvUHJpbWl0aXZlLCBkKCcnLFxuXHRmdW5jdGlvbiAoaGludCkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoXCJDb252ZXJzaW9uIG9mIHN5bWJvbCBvYmplY3RzIGlzIG5vdCBhbGxvd2VkXCIpO1xuXHR9KSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU3ltYm9sLnByb3RvdHlwZSwgU3ltYm9sLnRvU3RyaW5nVGFnLCBkKCdjJywgJ1N5bWJvbCcpKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vbGliLzZ0bzUvcG9seWZpbGxcIik7XG4iLG51bGwsIi8vIGh0dHA6Ly93aWtpLmNvbW1vbmpzLm9yZy93aWtpL1VuaXRfVGVzdGluZy8xLjBcbi8vXG4vLyBUSElTIElTIE5PVCBURVNURUQgTk9SIExJS0VMWSBUTyBXT1JLIE9VVFNJREUgVjghXG4vL1xuLy8gT3JpZ2luYWxseSBmcm9tIG5hcndoYWwuanMgKGh0dHA6Ly9uYXJ3aGFsanMub3JnKVxuLy8gQ29weXJpZ2h0IChjKSAyMDA5IFRob21hcyBSb2JpbnNvbiA8Mjgwbm9ydGguY29tPlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbi8vIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlICdTb2Z0d2FyZScpLCB0b1xuLy8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGVcbi8vIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vclxuLy8gc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbi8vIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbi8vIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCAnQVMgSVMnLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4vLyBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbi8vIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuLy8gQVVUSE9SUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU5cbi8vIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT05cbi8vIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyB3aGVuIHVzZWQgaW4gbm9kZSwgdGhpcyB3aWxsIGFjdHVhbGx5IGxvYWQgdGhlIHV0aWwgbW9kdWxlIHdlIGRlcGVuZCBvblxuLy8gdmVyc3VzIGxvYWRpbmcgdGhlIGJ1aWx0aW4gdXRpbCBtb2R1bGUgYXMgaGFwcGVucyBvdGhlcndpc2Vcbi8vIHRoaXMgaXMgYSBidWcgaW4gbm9kZSBtb2R1bGUgbG9hZGluZyBhcyBmYXIgYXMgSSBhbSBjb25jZXJuZWRcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbC8nKTtcblxudmFyIHBTbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbnZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG4vLyAxLiBUaGUgYXNzZXJ0IG1vZHVsZSBwcm92aWRlcyBmdW5jdGlvbnMgdGhhdCB0aHJvd1xuLy8gQXNzZXJ0aW9uRXJyb3IncyB3aGVuIHBhcnRpY3VsYXIgY29uZGl0aW9ucyBhcmUgbm90IG1ldC4gVGhlXG4vLyBhc3NlcnQgbW9kdWxlIG11c3QgY29uZm9ybSB0byB0aGUgZm9sbG93aW5nIGludGVyZmFjZS5cblxudmFyIGFzc2VydCA9IG1vZHVsZS5leHBvcnRzID0gb2s7XG5cbi8vIDIuIFRoZSBBc3NlcnRpb25FcnJvciBpcyBkZWZpbmVkIGluIGFzc2VydC5cbi8vIG5ldyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IoeyBtZXNzYWdlOiBtZXNzYWdlLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdHVhbDogYWN0dWFsLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBleHBlY3RlZCB9KVxuXG5hc3NlcnQuQXNzZXJ0aW9uRXJyb3IgPSBmdW5jdGlvbiBBc3NlcnRpb25FcnJvcihvcHRpb25zKSB7XG4gIHRoaXMubmFtZSA9ICdBc3NlcnRpb25FcnJvcic7XG4gIHRoaXMuYWN0dWFsID0gb3B0aW9ucy5hY3R1YWw7XG4gIHRoaXMuZXhwZWN0ZWQgPSBvcHRpb25zLmV4cGVjdGVkO1xuICB0aGlzLm9wZXJhdG9yID0gb3B0aW9ucy5vcGVyYXRvcjtcbiAgaWYgKG9wdGlvbnMubWVzc2FnZSkge1xuICAgIHRoaXMubWVzc2FnZSA9IG9wdGlvbnMubWVzc2FnZTtcbiAgICB0aGlzLmdlbmVyYXRlZE1lc3NhZ2UgPSBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLm1lc3NhZ2UgPSBnZXRNZXNzYWdlKHRoaXMpO1xuICAgIHRoaXMuZ2VuZXJhdGVkTWVzc2FnZSA9IHRydWU7XG4gIH1cbiAgdmFyIHN0YWNrU3RhcnRGdW5jdGlvbiA9IG9wdGlvbnMuc3RhY2tTdGFydEZ1bmN0aW9uIHx8IGZhaWw7XG5cbiAgaWYgKEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKSB7XG4gICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgc3RhY2tTdGFydEZ1bmN0aW9uKTtcbiAgfVxuICBlbHNlIHtcbiAgICAvLyBub24gdjggYnJvd3NlcnMgc28gd2UgY2FuIGhhdmUgYSBzdGFja3RyYWNlXG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcigpO1xuICAgIGlmIChlcnIuc3RhY2spIHtcbiAgICAgIHZhciBvdXQgPSBlcnIuc3RhY2s7XG5cbiAgICAgIC8vIHRyeSB0byBzdHJpcCB1c2VsZXNzIGZyYW1lc1xuICAgICAgdmFyIGZuX25hbWUgPSBzdGFja1N0YXJ0RnVuY3Rpb24ubmFtZTtcbiAgICAgIHZhciBpZHggPSBvdXQuaW5kZXhPZignXFxuJyArIGZuX25hbWUpO1xuICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgIC8vIG9uY2Ugd2UgaGF2ZSBsb2NhdGVkIHRoZSBmdW5jdGlvbiBmcmFtZVxuICAgICAgICAvLyB3ZSBuZWVkIHRvIHN0cmlwIG91dCBldmVyeXRoaW5nIGJlZm9yZSBpdCAoYW5kIGl0cyBsaW5lKVxuICAgICAgICB2YXIgbmV4dF9saW5lID0gb3V0LmluZGV4T2YoJ1xcbicsIGlkeCArIDEpO1xuICAgICAgICBvdXQgPSBvdXQuc3Vic3RyaW5nKG5leHRfbGluZSArIDEpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnN0YWNrID0gb3V0O1xuICAgIH1cbiAgfVxufTtcblxuLy8gYXNzZXJ0LkFzc2VydGlvbkVycm9yIGluc3RhbmNlb2YgRXJyb3JcbnV0aWwuaW5oZXJpdHMoYXNzZXJ0LkFzc2VydGlvbkVycm9yLCBFcnJvcik7XG5cbmZ1bmN0aW9uIHJlcGxhY2VyKGtleSwgdmFsdWUpIHtcbiAgaWYgKHV0aWwuaXNVbmRlZmluZWQodmFsdWUpKSB7XG4gICAgcmV0dXJuICcnICsgdmFsdWU7XG4gIH1cbiAgaWYgKHV0aWwuaXNOdW1iZXIodmFsdWUpICYmIChpc05hTih2YWx1ZSkgfHwgIWlzRmluaXRlKHZhbHVlKSkpIHtcbiAgICByZXR1cm4gdmFsdWUudG9TdHJpbmcoKTtcbiAgfVxuICBpZiAodXRpbC5pc0Z1bmN0aW9uKHZhbHVlKSB8fCB1dGlsLmlzUmVnRXhwKHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gdHJ1bmNhdGUocywgbikge1xuICBpZiAodXRpbC5pc1N0cmluZyhzKSkge1xuICAgIHJldHVybiBzLmxlbmd0aCA8IG4gPyBzIDogcy5zbGljZSgwLCBuKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcztcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRNZXNzYWdlKHNlbGYpIHtcbiAgcmV0dXJuIHRydW5jYXRlKEpTT04uc3RyaW5naWZ5KHNlbGYuYWN0dWFsLCByZXBsYWNlciksIDEyOCkgKyAnICcgK1xuICAgICAgICAgc2VsZi5vcGVyYXRvciArICcgJyArXG4gICAgICAgICB0cnVuY2F0ZShKU09OLnN0cmluZ2lmeShzZWxmLmV4cGVjdGVkLCByZXBsYWNlciksIDEyOCk7XG59XG5cbi8vIEF0IHByZXNlbnQgb25seSB0aGUgdGhyZWUga2V5cyBtZW50aW9uZWQgYWJvdmUgYXJlIHVzZWQgYW5kXG4vLyB1bmRlcnN0b29kIGJ5IHRoZSBzcGVjLiBJbXBsZW1lbnRhdGlvbnMgb3Igc3ViIG1vZHVsZXMgY2FuIHBhc3Ncbi8vIG90aGVyIGtleXMgdG8gdGhlIEFzc2VydGlvbkVycm9yJ3MgY29uc3RydWN0b3IgLSB0aGV5IHdpbGwgYmVcbi8vIGlnbm9yZWQuXG5cbi8vIDMuIEFsbCBvZiB0aGUgZm9sbG93aW5nIGZ1bmN0aW9ucyBtdXN0IHRocm93IGFuIEFzc2VydGlvbkVycm9yXG4vLyB3aGVuIGEgY29ycmVzcG9uZGluZyBjb25kaXRpb24gaXMgbm90IG1ldCwgd2l0aCBhIG1lc3NhZ2UgdGhhdFxuLy8gbWF5IGJlIHVuZGVmaW5lZCBpZiBub3QgcHJvdmlkZWQuICBBbGwgYXNzZXJ0aW9uIG1ldGhvZHMgcHJvdmlkZVxuLy8gYm90aCB0aGUgYWN0dWFsIGFuZCBleHBlY3RlZCB2YWx1ZXMgdG8gdGhlIGFzc2VydGlvbiBlcnJvciBmb3Jcbi8vIGRpc3BsYXkgcHVycG9zZXMuXG5cbmZ1bmN0aW9uIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgb3BlcmF0b3IsIHN0YWNrU3RhcnRGdW5jdGlvbikge1xuICB0aHJvdyBuZXcgYXNzZXJ0LkFzc2VydGlvbkVycm9yKHtcbiAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgIGFjdHVhbDogYWN0dWFsLFxuICAgIGV4cGVjdGVkOiBleHBlY3RlZCxcbiAgICBvcGVyYXRvcjogb3BlcmF0b3IsXG4gICAgc3RhY2tTdGFydEZ1bmN0aW9uOiBzdGFja1N0YXJ0RnVuY3Rpb25cbiAgfSk7XG59XG5cbi8vIEVYVEVOU0lPTiEgYWxsb3dzIGZvciB3ZWxsIGJlaGF2ZWQgZXJyb3JzIGRlZmluZWQgZWxzZXdoZXJlLlxuYXNzZXJ0LmZhaWwgPSBmYWlsO1xuXG4vLyA0LiBQdXJlIGFzc2VydGlvbiB0ZXN0cyB3aGV0aGVyIGEgdmFsdWUgaXMgdHJ1dGh5LCBhcyBkZXRlcm1pbmVkXG4vLyBieSAhIWd1YXJkLlxuLy8gYXNzZXJ0Lm9rKGd1YXJkLCBtZXNzYWdlX29wdCk7XG4vLyBUaGlzIHN0YXRlbWVudCBpcyBlcXVpdmFsZW50IHRvIGFzc2VydC5lcXVhbCh0cnVlLCAhIWd1YXJkLFxuLy8gbWVzc2FnZV9vcHQpOy4gVG8gdGVzdCBzdHJpY3RseSBmb3IgdGhlIHZhbHVlIHRydWUsIHVzZVxuLy8gYXNzZXJ0LnN0cmljdEVxdWFsKHRydWUsIGd1YXJkLCBtZXNzYWdlX29wdCk7LlxuXG5mdW5jdGlvbiBvayh2YWx1ZSwgbWVzc2FnZSkge1xuICBpZiAoIXZhbHVlKSBmYWlsKHZhbHVlLCB0cnVlLCBtZXNzYWdlLCAnPT0nLCBhc3NlcnQub2spO1xufVxuYXNzZXJ0Lm9rID0gb2s7XG5cbi8vIDUuIFRoZSBlcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgc2hhbGxvdywgY29lcmNpdmUgZXF1YWxpdHkgd2l0aFxuLy8gPT0uXG4vLyBhc3NlcnQuZXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQuZXF1YWwgPSBmdW5jdGlvbiBlcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgIT0gZXhwZWN0ZWQpIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJz09JywgYXNzZXJ0LmVxdWFsKTtcbn07XG5cbi8vIDYuIFRoZSBub24tZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIGZvciB3aGV0aGVyIHR3byBvYmplY3RzIGFyZSBub3QgZXF1YWxcbi8vIHdpdGggIT0gYXNzZXJ0Lm5vdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0Lm5vdEVxdWFsID0gZnVuY3Rpb24gbm90RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsID09IGV4cGVjdGVkKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnIT0nLCBhc3NlcnQubm90RXF1YWwpO1xuICB9XG59O1xuXG4vLyA3LiBUaGUgZXF1aXZhbGVuY2UgYXNzZXJ0aW9uIHRlc3RzIGEgZGVlcCBlcXVhbGl0eSByZWxhdGlvbi5cbi8vIGFzc2VydC5kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQuZGVlcEVxdWFsID0gZnVuY3Rpb24gZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKCFfZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQpKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnZGVlcEVxdWFsJywgYXNzZXJ0LmRlZXBFcXVhbCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIF9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCkge1xuICAvLyA3LjEuIEFsbCBpZGVudGljYWwgdmFsdWVzIGFyZSBlcXVpdmFsZW50LCBhcyBkZXRlcm1pbmVkIGJ5ID09PS5cbiAgaWYgKGFjdHVhbCA9PT0gZXhwZWN0ZWQpIHtcbiAgICByZXR1cm4gdHJ1ZTtcblxuICB9IGVsc2UgaWYgKHV0aWwuaXNCdWZmZXIoYWN0dWFsKSAmJiB1dGlsLmlzQnVmZmVyKGV4cGVjdGVkKSkge1xuICAgIGlmIChhY3R1YWwubGVuZ3RoICE9IGV4cGVjdGVkLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhY3R1YWwubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhY3R1YWxbaV0gIT09IGV4cGVjdGVkW2ldKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG5cbiAgLy8gNy4yLiBJZiB0aGUgZXhwZWN0ZWQgdmFsdWUgaXMgYSBEYXRlIG9iamVjdCwgdGhlIGFjdHVhbCB2YWx1ZSBpc1xuICAvLyBlcXVpdmFsZW50IGlmIGl0IGlzIGFsc28gYSBEYXRlIG9iamVjdCB0aGF0IHJlZmVycyB0byB0aGUgc2FtZSB0aW1lLlxuICB9IGVsc2UgaWYgKHV0aWwuaXNEYXRlKGFjdHVhbCkgJiYgdXRpbC5pc0RhdGUoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGFjdHVhbC5nZXRUaW1lKCkgPT09IGV4cGVjdGVkLmdldFRpbWUoKTtcblxuICAvLyA3LjMgSWYgdGhlIGV4cGVjdGVkIHZhbHVlIGlzIGEgUmVnRXhwIG9iamVjdCwgdGhlIGFjdHVhbCB2YWx1ZSBpc1xuICAvLyBlcXVpdmFsZW50IGlmIGl0IGlzIGFsc28gYSBSZWdFeHAgb2JqZWN0IHdpdGggdGhlIHNhbWUgc291cmNlIGFuZFxuICAvLyBwcm9wZXJ0aWVzIChgZ2xvYmFsYCwgYG11bHRpbGluZWAsIGBsYXN0SW5kZXhgLCBgaWdub3JlQ2FzZWApLlxuICB9IGVsc2UgaWYgKHV0aWwuaXNSZWdFeHAoYWN0dWFsKSAmJiB1dGlsLmlzUmVnRXhwKGV4cGVjdGVkKSkge1xuICAgIHJldHVybiBhY3R1YWwuc291cmNlID09PSBleHBlY3RlZC5zb3VyY2UgJiZcbiAgICAgICAgICAgYWN0dWFsLmdsb2JhbCA9PT0gZXhwZWN0ZWQuZ2xvYmFsICYmXG4gICAgICAgICAgIGFjdHVhbC5tdWx0aWxpbmUgPT09IGV4cGVjdGVkLm11bHRpbGluZSAmJlxuICAgICAgICAgICBhY3R1YWwubGFzdEluZGV4ID09PSBleHBlY3RlZC5sYXN0SW5kZXggJiZcbiAgICAgICAgICAgYWN0dWFsLmlnbm9yZUNhc2UgPT09IGV4cGVjdGVkLmlnbm9yZUNhc2U7XG5cbiAgLy8gNy40LiBPdGhlciBwYWlycyB0aGF0IGRvIG5vdCBib3RoIHBhc3MgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnLFxuICAvLyBlcXVpdmFsZW5jZSBpcyBkZXRlcm1pbmVkIGJ5ID09LlxuICB9IGVsc2UgaWYgKCF1dGlsLmlzT2JqZWN0KGFjdHVhbCkgJiYgIXV0aWwuaXNPYmplY3QoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGFjdHVhbCA9PSBleHBlY3RlZDtcblxuICAvLyA3LjUgRm9yIGFsbCBvdGhlciBPYmplY3QgcGFpcnMsIGluY2x1ZGluZyBBcnJheSBvYmplY3RzLCBlcXVpdmFsZW5jZSBpc1xuICAvLyBkZXRlcm1pbmVkIGJ5IGhhdmluZyB0aGUgc2FtZSBudW1iZXIgb2Ygb3duZWQgcHJvcGVydGllcyAoYXMgdmVyaWZpZWRcbiAgLy8gd2l0aCBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwpLCB0aGUgc2FtZSBzZXQgb2Yga2V5c1xuICAvLyAoYWx0aG91Z2ggbm90IG5lY2Vzc2FyaWx5IHRoZSBzYW1lIG9yZGVyKSwgZXF1aXZhbGVudCB2YWx1ZXMgZm9yIGV2ZXJ5XG4gIC8vIGNvcnJlc3BvbmRpbmcga2V5LCBhbmQgYW4gaWRlbnRpY2FsICdwcm90b3R5cGUnIHByb3BlcnR5LiBOb3RlOiB0aGlzXG4gIC8vIGFjY291bnRzIGZvciBib3RoIG5hbWVkIGFuZCBpbmRleGVkIHByb3BlcnRpZXMgb24gQXJyYXlzLlxuICB9IGVsc2Uge1xuICAgIHJldHVybiBvYmpFcXVpdihhY3R1YWwsIGV4cGVjdGVkKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0FyZ3VtZW50cyhvYmplY3QpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3QpID09ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xufVxuXG5mdW5jdGlvbiBvYmpFcXVpdihhLCBiKSB7XG4gIGlmICh1dGlsLmlzTnVsbE9yVW5kZWZpbmVkKGEpIHx8IHV0aWwuaXNOdWxsT3JVbmRlZmluZWQoYikpXG4gICAgcmV0dXJuIGZhbHNlO1xuICAvLyBhbiBpZGVudGljYWwgJ3Byb3RvdHlwZScgcHJvcGVydHkuXG4gIGlmIChhLnByb3RvdHlwZSAhPT0gYi5wcm90b3R5cGUpIHJldHVybiBmYWxzZTtcbiAgLy9+fn5JJ3ZlIG1hbmFnZWQgdG8gYnJlYWsgT2JqZWN0LmtleXMgdGhyb3VnaCBzY3Jld3kgYXJndW1lbnRzIHBhc3NpbmcuXG4gIC8vICAgQ29udmVydGluZyB0byBhcnJheSBzb2x2ZXMgdGhlIHByb2JsZW0uXG4gIGlmIChpc0FyZ3VtZW50cyhhKSkge1xuICAgIGlmICghaXNBcmd1bWVudHMoYikpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgYSA9IHBTbGljZS5jYWxsKGEpO1xuICAgIGIgPSBwU2xpY2UuY2FsbChiKTtcbiAgICByZXR1cm4gX2RlZXBFcXVhbChhLCBiKTtcbiAgfVxuICB0cnkge1xuICAgIHZhciBrYSA9IG9iamVjdEtleXMoYSksXG4gICAgICAgIGtiID0gb2JqZWN0S2V5cyhiKSxcbiAgICAgICAga2V5LCBpO1xuICB9IGNhdGNoIChlKSB7Ly9oYXBwZW5zIHdoZW4gb25lIGlzIGEgc3RyaW5nIGxpdGVyYWwgYW5kIHRoZSBvdGhlciBpc24ndFxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAvLyBoYXZpbmcgdGhlIHNhbWUgbnVtYmVyIG9mIG93bmVkIHByb3BlcnRpZXMgKGtleXMgaW5jb3Jwb3JhdGVzXG4gIC8vIGhhc093blByb3BlcnR5KVxuICBpZiAoa2EubGVuZ3RoICE9IGtiLmxlbmd0aClcbiAgICByZXR1cm4gZmFsc2U7XG4gIC8vdGhlIHNhbWUgc2V0IG9mIGtleXMgKGFsdGhvdWdoIG5vdCBuZWNlc3NhcmlseSB0aGUgc2FtZSBvcmRlciksXG4gIGthLnNvcnQoKTtcbiAga2Iuc29ydCgpO1xuICAvL35+fmNoZWFwIGtleSB0ZXN0XG4gIGZvciAoaSA9IGthLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgaWYgKGthW2ldICE9IGtiW2ldKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vZXF1aXZhbGVudCB2YWx1ZXMgZm9yIGV2ZXJ5IGNvcnJlc3BvbmRpbmcga2V5LCBhbmRcbiAgLy9+fn5wb3NzaWJseSBleHBlbnNpdmUgZGVlcCB0ZXN0XG4gIGZvciAoaSA9IGthLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAga2V5ID0ga2FbaV07XG4gICAgaWYgKCFfZGVlcEVxdWFsKGFba2V5XSwgYltrZXldKSkgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vLyA4LiBUaGUgbm9uLWVxdWl2YWxlbmNlIGFzc2VydGlvbiB0ZXN0cyBmb3IgYW55IGRlZXAgaW5lcXVhbGl0eS5cbi8vIGFzc2VydC5ub3REZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQubm90RGVlcEVxdWFsID0gZnVuY3Rpb24gbm90RGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKF9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCkpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICdub3REZWVwRXF1YWwnLCBhc3NlcnQubm90RGVlcEVxdWFsKTtcbiAgfVxufTtcblxuLy8gOS4gVGhlIHN0cmljdCBlcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgc3RyaWN0IGVxdWFsaXR5LCBhcyBkZXRlcm1pbmVkIGJ5ID09PS5cbi8vIGFzc2VydC5zdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5zdHJpY3RFcXVhbCA9IGZ1bmN0aW9uIHN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCAhPT0gZXhwZWN0ZWQpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICc9PT0nLCBhc3NlcnQuc3RyaWN0RXF1YWwpO1xuICB9XG59O1xuXG4vLyAxMC4gVGhlIHN0cmljdCBub24tZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIGZvciBzdHJpY3QgaW5lcXVhbGl0eSwgYXNcbi8vIGRldGVybWluZWQgYnkgIT09LiAgYXNzZXJ0Lm5vdFN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0Lm5vdFN0cmljdEVxdWFsID0gZnVuY3Rpb24gbm90U3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsID09PSBleHBlY3RlZCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJyE9PScsIGFzc2VydC5ub3RTdHJpY3RFcXVhbCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCwgZXhwZWN0ZWQpIHtcbiAgaWYgKCFhY3R1YWwgfHwgIWV4cGVjdGVkKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChleHBlY3RlZCkgPT0gJ1tvYmplY3QgUmVnRXhwXScpIHtcbiAgICByZXR1cm4gZXhwZWN0ZWQudGVzdChhY3R1YWwpO1xuICB9IGVsc2UgaWYgKGFjdHVhbCBpbnN0YW5jZW9mIGV4cGVjdGVkKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoZXhwZWN0ZWQuY2FsbCh7fSwgYWN0dWFsKSA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBfdGhyb3dzKHNob3VsZFRocm93LCBibG9jaywgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgdmFyIGFjdHVhbDtcblxuICBpZiAodXRpbC5pc1N0cmluZyhleHBlY3RlZCkpIHtcbiAgICBtZXNzYWdlID0gZXhwZWN0ZWQ7XG4gICAgZXhwZWN0ZWQgPSBudWxsO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBibG9jaygpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgYWN0dWFsID0gZTtcbiAgfVxuXG4gIG1lc3NhZ2UgPSAoZXhwZWN0ZWQgJiYgZXhwZWN0ZWQubmFtZSA/ICcgKCcgKyBleHBlY3RlZC5uYW1lICsgJykuJyA6ICcuJykgK1xuICAgICAgICAgICAgKG1lc3NhZ2UgPyAnICcgKyBtZXNzYWdlIDogJy4nKTtcblxuICBpZiAoc2hvdWxkVGhyb3cgJiYgIWFjdHVhbCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgJ01pc3NpbmcgZXhwZWN0ZWQgZXhjZXB0aW9uJyArIG1lc3NhZ2UpO1xuICB9XG5cbiAgaWYgKCFzaG91bGRUaHJvdyAmJiBleHBlY3RlZEV4Y2VwdGlvbihhY3R1YWwsIGV4cGVjdGVkKSkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgJ0dvdCB1bndhbnRlZCBleGNlcHRpb24nICsgbWVzc2FnZSk7XG4gIH1cblxuICBpZiAoKHNob3VsZFRocm93ICYmIGFjdHVhbCAmJiBleHBlY3RlZCAmJlxuICAgICAgIWV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCwgZXhwZWN0ZWQpKSB8fCAoIXNob3VsZFRocm93ICYmIGFjdHVhbCkpIHtcbiAgICB0aHJvdyBhY3R1YWw7XG4gIH1cbn1cblxuLy8gMTEuIEV4cGVjdGVkIHRvIHRocm93IGFuIGVycm9yOlxuLy8gYXNzZXJ0LnRocm93cyhibG9jaywgRXJyb3Jfb3B0LCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC50aHJvd3MgPSBmdW5jdGlvbihibG9jaywgLypvcHRpb25hbCovZXJyb3IsIC8qb3B0aW9uYWwqL21lc3NhZ2UpIHtcbiAgX3Rocm93cy5hcHBseSh0aGlzLCBbdHJ1ZV0uY29uY2F0KHBTbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbn07XG5cbi8vIEVYVEVOU0lPTiEgVGhpcyBpcyBhbm5veWluZyB0byB3cml0ZSBvdXRzaWRlIHRoaXMgbW9kdWxlLlxuYXNzZXJ0LmRvZXNOb3RUaHJvdyA9IGZ1bmN0aW9uKGJsb2NrLCAvKm9wdGlvbmFsKi9tZXNzYWdlKSB7XG4gIF90aHJvd3MuYXBwbHkodGhpcywgW2ZhbHNlXS5jb25jYXQocFNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xufTtcblxuYXNzZXJ0LmlmRXJyb3IgPSBmdW5jdGlvbihlcnIpIHsgaWYgKGVycikge3Rocm93IGVycjt9fTtcblxudmFyIG9iamVjdEtleXMgPSBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciBrZXlzID0gW107XG4gIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICBpZiAoaGFzT3duLmNhbGwob2JqLCBrZXkpKSBrZXlzLnB1c2goa2V5KTtcbiAgfVxuICByZXR1cm4ga2V5cztcbn07XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0J1ZmZlcihhcmcpIHtcbiAgcmV0dXJuIGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0J1xuICAgICYmIHR5cGVvZiBhcmcuY29weSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcuZmlsbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcucmVhZFVJbnQ4ID09PSAnZnVuY3Rpb24nO1xufSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwpe1xuLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICghaXNTdHJpbmcoZikpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goaW5zcGVjdChhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHMuam9pbignICcpO1xuICB9XG5cbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICB2YXIgc3RyID0gU3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggPT09ICclJScpIHJldHVybiAnJSc7XG4gICAgaWYgKGkgPj0gbGVuKSByZXR1cm4geDtcbiAgICBzd2l0Y2ggKHgpIHtcbiAgICAgIGNhc2UgJyVzJzogcmV0dXJuIFN0cmluZyhhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWQnOiByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclaic6XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IgKHZhciB4ID0gYXJnc1tpXTsgaSA8IGxlbjsgeCA9IGFyZ3NbKytpXSkge1xuICAgIGlmIChpc051bGwoeCkgfHwgIWlzT2JqZWN0KHgpKSB7XG4gICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5cbi8vIE1hcmsgdGhhdCBhIG1ldGhvZCBzaG91bGQgbm90IGJlIHVzZWQuXG4vLyBSZXR1cm5zIGEgbW9kaWZpZWQgZnVuY3Rpb24gd2hpY2ggd2FybnMgb25jZSBieSBkZWZhdWx0LlxuLy8gSWYgLS1uby1kZXByZWNhdGlvbiBpcyBzZXQsIHRoZW4gaXQgaXMgYSBuby1vcC5cbmV4cG9ydHMuZGVwcmVjYXRlID0gZnVuY3Rpb24oZm4sIG1zZykge1xuICAvLyBBbGxvdyBmb3IgZGVwcmVjYXRpbmcgdGhpbmdzIGluIHRoZSBwcm9jZXNzIG9mIHN0YXJ0aW5nIHVwLlxuICBpZiAoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZGVwcmVjYXRlKGZuLCBtc2cpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLm5vRGVwcmVjYXRpb24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm47XG4gIH1cblxuICB2YXIgd2FybmVkID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGRlcHJlY2F0ZWQoKSB7XG4gICAgaWYgKCF3YXJuZWQpIHtcbiAgICAgIGlmIChwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgICB9IGVsc2UgaWYgKHByb2Nlc3MudHJhY2VEZXByZWNhdGlvbikge1xuICAgICAgICBjb25zb2xlLnRyYWNlKG1zZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICB9XG4gICAgICB3YXJuZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIHJldHVybiBkZXByZWNhdGVkO1xufTtcblxuXG52YXIgZGVidWdzID0ge307XG52YXIgZGVidWdFbnZpcm9uO1xuZXhwb3J0cy5kZWJ1Z2xvZyA9IGZ1bmN0aW9uKHNldCkge1xuICBpZiAoaXNVbmRlZmluZWQoZGVidWdFbnZpcm9uKSlcbiAgICBkZWJ1Z0Vudmlyb24gPSBwcm9jZXNzLmVudi5OT0RFX0RFQlVHIHx8ICcnO1xuICBzZXQgPSBzZXQudG9VcHBlckNhc2UoKTtcbiAgaWYgKCFkZWJ1Z3Nbc2V0XSkge1xuICAgIGlmIChuZXcgUmVnRXhwKCdcXFxcYicgKyBzZXQgKyAnXFxcXGInLCAnaScpLnRlc3QoZGVidWdFbnZpcm9uKSkge1xuICAgICAgdmFyIHBpZCA9IHByb2Nlc3MucGlkO1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1zZyA9IGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyVzICVkOiAlcycsIHNldCwgcGlkLCBtc2cpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHt9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVidWdzW3NldF07XG59O1xuXG5cbi8qKlxuICogRWNob3MgdGhlIHZhbHVlIG9mIGEgdmFsdWUuIFRyeXMgdG8gcHJpbnQgdGhlIHZhbHVlIG91dFxuICogaW4gdGhlIGJlc3Qgd2F5IHBvc3NpYmxlIGdpdmVuIHRoZSBkaWZmZXJlbnQgdHlwZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHByaW50IG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHRoYXQgYWx0ZXJzIHRoZSBvdXRwdXQuXG4gKi9cbi8qIGxlZ2FjeTogb2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKi9cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBvcHRzKSB7XG4gIC8vIGRlZmF1bHQgb3B0aW9uc1xuICB2YXIgY3R4ID0ge1xuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IHN0eWxpemVOb0NvbG9yXG4gIH07XG4gIC8vIGxlZ2FjeS4uLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSBjdHguZGVwdGggPSBhcmd1bWVudHNbMl07XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDQpIGN0eC5jb2xvcnMgPSBhcmd1bWVudHNbM107XG4gIGlmIChpc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAvLyBsZWdhY3kuLi5cbiAgICBjdHguc2hvd0hpZGRlbiA9IG9wdHM7XG4gIH0gZWxzZSBpZiAob3B0cykge1xuICAgIC8vIGdvdCBhbiBcIm9wdGlvbnNcIiBvYmplY3RcbiAgICBleHBvcnRzLl9leHRlbmQoY3R4LCBvcHRzKTtcbiAgfVxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmIChpc1VuZGVmaW5lZChjdHguc2hvd0hpZGRlbikpIGN0eC5zaG93SGlkZGVuID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguZGVwdGgpKSBjdHguZGVwdGggPSAyO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpIGN0eC5jb2xvcnMgPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jdXN0b21JbnNwZWN0KSkgY3R4LmN1c3RvbUluc3BlY3QgPSB0cnVlO1xuICBpZiAoY3R4LmNvbG9ycykgY3R4LnN0eWxpemUgPSBzdHlsaXplV2l0aENvbG9yO1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosIGN0eC5kZXB0aCk7XG59XG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXG5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuaW5zcGVjdC5jb2xvcnMgPSB7XG4gICdib2xkJyA6IFsxLCAyMl0sXG4gICdpdGFsaWMnIDogWzMsIDIzXSxcbiAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAnd2hpdGUnIDogWzM3LCAzOV0sXG4gICdncmV5JyA6IFs5MCwgMzldLFxuICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICdibHVlJyA6IFszNCwgMzldLFxuICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAnbWFnZW50YScgOiBbMzUsIDM5XSxcbiAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgJ3llbGxvdycgOiBbMzMsIDM5XVxufTtcblxuLy8gRG9uJ3QgdXNlICdibHVlJyBub3QgdmlzaWJsZSBvbiBjbWQuZXhlXG5pbnNwZWN0LnN0eWxlcyA9IHtcbiAgJ3NwZWNpYWwnOiAnY3lhbicsXG4gICdudW1iZXInOiAneWVsbG93JyxcbiAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgJ251bGwnOiAnYm9sZCcsXG4gICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgLy8gXCJuYW1lXCI6IGludGVudGlvbmFsbHkgbm90IHN0eWxpbmdcbiAgJ3JlZ2V4cCc6ICdyZWQnXG59O1xuXG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRoQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgdmFyIHN0eWxlID0gaW5zcGVjdC5zdHlsZXNbc3R5bGVUeXBlXTtcblxuICBpZiAoc3R5bGUpIHtcbiAgICByZXR1cm4gJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMV0gKyAnbSc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblxuZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpIHtcbiAgdmFyIGhhc2ggPSB7fTtcblxuICBhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMsIGN0eCk7XG4gICAgaWYgKCFpc1N0cmluZyhyZXQpKSB7XG4gICAgICByZXQgPSBmb3JtYXRWYWx1ZShjdHgsIHJldCwgcmVjdXJzZVRpbWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gIHZhciBwcmltaXRpdmUgPSBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSk7XG4gIGlmIChwcmltaXRpdmUpIHtcbiAgICByZXR1cm4gcHJpbWl0aXZlO1xuICB9XG5cbiAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKTtcbiAgfVxuXG4gIC8vIElFIGRvZXNuJ3QgbWFrZSBlcnJvciBmaWVsZHMgbm9uLWVudW1lcmFibGVcbiAgLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2llL2R3dzUyc2J0KHY9dnMuOTQpLmFzcHhcbiAgaWYgKGlzRXJyb3IodmFsdWUpXG4gICAgICAmJiAoa2V5cy5pbmRleE9mKCdtZXNzYWdlJykgPj0gMCB8fCBrZXlzLmluZGV4T2YoJ2Rlc2NyaXB0aW9uJykgPj0gMCkpIHtcbiAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG4gIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpIHx8IHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbiAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLCBrZXkpKSB7XG4gICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgfVxuICBpZiAoIXN0cikge1xuICAgIGlmIChjdHguc2Vlbi5pbmRleE9mKGRlc2MudmFsdWUpIDwgMCkge1xuICAgICAgaWYgKGlzTnVsbChyZWN1cnNlVGltZXMpKSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgfVxuICAgICAgaWYgKHN0ci5pbmRleE9mKCdcXG4nKSA+IC0xKSB7XG4gICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zdWJzdHIoMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyID0gJ1xcbicgKyBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbQ2lyY3VsYXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgaWYgKGFycmF5ICYmIGtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIG5hbWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIGtleSk7XG4gICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJlxuICAgICAgKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5leHBvcnRzLmlzQnVmZmVyID0gcmVxdWlyZSgnLi9zdXBwb3J0L2lzQnVmZmVyJyk7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuXG5mdW5jdGlvbiBwYWQobikge1xuICByZXR1cm4gbiA8IDEwID8gJzAnICsgbi50b1N0cmluZygxMCkgOiBuLnRvU3RyaW5nKDEwKTtcbn1cblxuXG52YXIgbW9udGhzID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG4vLyAyNiBGZWIgMTY6MTk6MzRcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICB2YXIgdGltZSA9IFtwYWQoZC5nZXRIb3VycygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0TWludXRlcygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0U2Vjb25kcygpKV0uam9pbignOicpO1xuICByZXR1cm4gW2QuZ2V0RGF0ZSgpLCBtb250aHNbZC5nZXRNb250aCgpXSwgdGltZV0uam9pbignICcpO1xufVxuXG5cbi8vIGxvZyBpcyBqdXN0IGEgdGhpbiB3cmFwcGVyIHRvIGNvbnNvbGUubG9nIHRoYXQgcHJlcGVuZHMgYSB0aW1lc3RhbXBcbmV4cG9ydHMubG9nID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCclcyAtICVzJywgdGltZXN0YW1wKCksIGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cykpO1xufTtcblxuXG4vKipcbiAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAqXG4gKiBUaGUgRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzIGZyb20gbGFuZy5qcyByZXdyaXR0ZW4gYXMgYSBzdGFuZGFsb25lXG4gKiBmdW5jdGlvbiAobm90IG9uIEZ1bmN0aW9uLnByb3RvdHlwZSkuIE5PVEU6IElmIHRoaXMgZmlsZSBpcyB0byBiZSBsb2FkZWRcbiAqIGR1cmluZyBib290c3RyYXBwaW5nIHRoaXMgZnVuY3Rpb24gbmVlZHMgdG8gYmUgcmV3cml0dGVuIHVzaW5nIHNvbWUgbmF0aXZlXG4gKiBmdW5jdGlvbnMgYXMgcHJvdG90eXBlIHNldHVwIHVzaW5nIG5vcm1hbCBKYXZhU2NyaXB0IGRvZXMgbm90IHdvcmsgYXNcbiAqIGV4cGVjdGVkIGR1cmluZyBib290c3RyYXBwaW5nIChzZWUgbWlycm9yLmpzIGluIHIxMTQ5MDMpLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gd2hpY2ggbmVlZHMgdG8gaW5oZXJpdCB0aGVcbiAqICAgICBwcm90b3R5cGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gdG8gaW5oZXJpdCBwcm90b3R5cGUgZnJvbS5cbiAqL1xuZXhwb3J0cy5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmV4cG9ydHMuX2V4dGVuZCA9IGZ1bmN0aW9uKG9yaWdpbiwgYWRkKSB7XG4gIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgaWYgKCFhZGQgfHwgIWlzT2JqZWN0KGFkZCkpIHJldHVybiBvcmlnaW47XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59O1xuXG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIi8qKlxuICogIENvcHlyaWdodCAoYykgMjAxNCwgRmFjZWJvb2ssIEluYy5cbiAqICBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqICBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqICBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqICBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqL1xuZnVuY3Rpb24gdW5pdmVyc2FsTW9kdWxlKCkge1xuICB2YXIgJE9iamVjdCA9IE9iamVjdDtcblxuZnVuY3Rpb24gY3JlYXRlQ2xhc3MoY3RvciwgbWV0aG9kcywgc3RhdGljTWV0aG9kcywgc3VwZXJDbGFzcykge1xuICB2YXIgcHJvdG87XG4gIGlmIChzdXBlckNsYXNzKSB7XG4gICAgdmFyIHN1cGVyUHJvdG8gPSBzdXBlckNsYXNzLnByb3RvdHlwZTtcbiAgICBwcm90byA9ICRPYmplY3QuY3JlYXRlKHN1cGVyUHJvdG8pO1xuICB9IGVsc2Uge1xuICAgIHByb3RvID0gY3Rvci5wcm90b3R5cGU7XG4gIH1cbiAgJE9iamVjdC5rZXlzKG1ldGhvZHMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgIHByb3RvW2tleV0gPSBtZXRob2RzW2tleV07XG4gIH0pO1xuICAkT2JqZWN0LmtleXMoc3RhdGljTWV0aG9kcykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgY3RvcltrZXldID0gc3RhdGljTWV0aG9kc1trZXldO1xuICB9KTtcbiAgcHJvdG8uY29uc3RydWN0b3IgPSBjdG9yO1xuICBjdG9yLnByb3RvdHlwZSA9IHByb3RvO1xuICByZXR1cm4gY3Rvcjtcbn1cblxuZnVuY3Rpb24gc3VwZXJDYWxsKHNlbGYsIHByb3RvLCBuYW1lLCBhcmdzKSB7XG4gIHJldHVybiAkT2JqZWN0LmdldFByb3RvdHlwZU9mKHByb3RvKVtuYW1lXS5hcHBseShzZWxmLCBhcmdzKTtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdFN1cGVyQ2FsbChzZWxmLCBwcm90bywgYXJncykge1xuICBzdXBlckNhbGwoc2VsZiwgcHJvdG8sICdjb25zdHJ1Y3RvcicsIGFyZ3MpO1xufVxuXG52YXIgJHRyYWNldXJSdW50aW1lID0ge307XG4kdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MgPSBjcmVhdGVDbGFzcztcbiR0cmFjZXVyUnVudGltZS5zdXBlckNhbGwgPSBzdXBlckNhbGw7XG4kdHJhY2V1clJ1bnRpbWUuZGVmYXVsdFN1cGVyQ2FsbCA9IGRlZmF1bHRTdXBlckNhbGw7XG5cInVzZSBzdHJpY3RcIjtcbmZ1bmN0aW9uIGlzKGZpcnN0LCBzZWNvbmQpIHtcbiAgaWYgKGZpcnN0ID09PSBzZWNvbmQpIHtcbiAgICByZXR1cm4gZmlyc3QgIT09IDAgfHwgc2Vjb25kICE9PSAwIHx8IDEgLyBmaXJzdCA9PT0gMSAvIHNlY29uZDtcbiAgfVxuICBpZiAoZmlyc3QgIT09IGZpcnN0KSB7XG4gICAgcmV0dXJuIHNlY29uZCAhPT0gc2Vjb25kO1xuICB9XG4gIGlmIChmaXJzdCAmJiB0eXBlb2YgZmlyc3QuZXF1YWxzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGZpcnN0LmVxdWFscyhzZWNvbmQpO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cbmZ1bmN0aW9uIGludmFyaWFudChjb25kaXRpb24sIGVycm9yKSB7XG4gIGlmICghY29uZGl0aW9uKVxuICAgIHRocm93IG5ldyBFcnJvcihlcnJvcik7XG59XG52YXIgREVMRVRFID0gJ2RlbGV0ZSc7XG52YXIgU0hJRlQgPSA1O1xudmFyIFNJWkUgPSAxIDw8IFNISUZUO1xudmFyIE1BU0sgPSBTSVpFIC0gMTtcbnZhciBOT1RfU0VUID0ge307XG52YXIgQ0hBTkdFX0xFTkdUSCA9IHt2YWx1ZTogZmFsc2V9O1xudmFyIERJRF9BTFRFUiA9IHt2YWx1ZTogZmFsc2V9O1xuZnVuY3Rpb24gTWFrZVJlZihyZWYpIHtcbiAgcmVmLnZhbHVlID0gZmFsc2U7XG4gIHJldHVybiByZWY7XG59XG5mdW5jdGlvbiBTZXRSZWYocmVmKSB7XG4gIHJlZiAmJiAocmVmLnZhbHVlID0gdHJ1ZSk7XG59XG5mdW5jdGlvbiBPd25lcklEKCkge31cbmZ1bmN0aW9uIGFyckNvcHkoYXJyLCBvZmZzZXQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHx8IDA7XG4gIHZhciBsZW4gPSBNYXRoLm1heCgwLCBhcnIubGVuZ3RoIC0gb2Zmc2V0KTtcbiAgdmFyIG5ld0FyciA9IG5ldyBBcnJheShsZW4pO1xuICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgbGVuOyBpaSsrKSB7XG4gICAgbmV3QXJyW2lpXSA9IGFycltpaSArIG9mZnNldF07XG4gIH1cbiAgcmV0dXJuIG5ld0Fycjtcbn1cbmZ1bmN0aW9uIGFzc2VydE5vdEluZmluaXRlKHNpemUpIHtcbiAgaW52YXJpYW50KHNpemUgIT09IEluZmluaXR5LCAnQ2Fubm90IHBlcmZvcm0gdGhpcyBhY3Rpb24gd2l0aCBhbiBpbmZpbml0ZSBzaXplLicpO1xufVxuZnVuY3Rpb24gZW5zdXJlU2l6ZShpdGVyKSB7XG4gIGlmIChpdGVyLnNpemUgPT09IHVuZGVmaW5lZCkge1xuICAgIGl0ZXIuc2l6ZSA9IGl0ZXIuX19pdGVyYXRlKHJldHVyblRydWUpO1xuICB9XG4gIHJldHVybiBpdGVyLnNpemU7XG59XG5mdW5jdGlvbiB3cmFwSW5kZXgoaXRlciwgaW5kZXgpIHtcbiAgcmV0dXJuIGluZGV4ID49IDAgPyBpbmRleCA6IGVuc3VyZVNpemUoaXRlcikgKyBpbmRleDtcbn1cbmZ1bmN0aW9uIHJldHVyblRydWUoKSB7XG4gIHJldHVybiB0cnVlO1xufVxuZnVuY3Rpb24gaXNQbGFpbk9iaih2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgJiYgdmFsdWUuY29uc3RydWN0b3IgPT09IE9iamVjdDtcbn1cbmZ1bmN0aW9uIHdob2xlU2xpY2UoYmVnaW4sIGVuZCwgc2l6ZSkge1xuICByZXR1cm4gKGJlZ2luID09PSAwIHx8IChzaXplICE9PSB1bmRlZmluZWQgJiYgYmVnaW4gPD0gLXNpemUpKSAmJiAoZW5kID09PSB1bmRlZmluZWQgfHwgKHNpemUgIT09IHVuZGVmaW5lZCAmJiBlbmQgPj0gc2l6ZSkpO1xufVxuZnVuY3Rpb24gcmVzb2x2ZUJlZ2luKGJlZ2luLCBzaXplKSB7XG4gIHJldHVybiByZXNvbHZlSW5kZXgoYmVnaW4sIHNpemUsIDApO1xufVxuZnVuY3Rpb24gcmVzb2x2ZUVuZChlbmQsIHNpemUpIHtcbiAgcmV0dXJuIHJlc29sdmVJbmRleChlbmQsIHNpemUsIHNpemUpO1xufVxuZnVuY3Rpb24gcmVzb2x2ZUluZGV4KGluZGV4LCBzaXplLCBkZWZhdWx0SW5kZXgpIHtcbiAgcmV0dXJuIGluZGV4ID09PSB1bmRlZmluZWQgPyBkZWZhdWx0SW5kZXggOiBpbmRleCA8IDAgPyBNYXRoLm1heCgwLCBzaXplICsgaW5kZXgpIDogc2l6ZSA9PT0gdW5kZWZpbmVkID8gaW5kZXggOiBNYXRoLm1pbihzaXplLCBpbmRleCk7XG59XG5mdW5jdGlvbiBoYXNoKG8pIHtcbiAgaWYgKCFvKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cbiAgaWYgKG8gPT09IHRydWUpIHtcbiAgICByZXR1cm4gMTtcbiAgfVxuICB2YXIgdHlwZSA9IHR5cGVvZiBvO1xuICBpZiAodHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICBpZiAoKG8gfCAwKSA9PT0gbykge1xuICAgICAgcmV0dXJuIG8gJiBIQVNIX01BWF9WQUw7XG4gICAgfVxuICAgIG8gPSAnJyArIG87XG4gICAgdHlwZSA9ICdzdHJpbmcnO1xuICB9XG4gIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBvLmxlbmd0aCA+IFNUUklOR19IQVNIX0NBQ0hFX01JTl9TVFJMRU4gPyBjYWNoZWRIYXNoU3RyaW5nKG8pIDogaGFzaFN0cmluZyhvKTtcbiAgfVxuICBpZiAoby5oYXNoQ29kZSkge1xuICAgIHJldHVybiBoYXNoKHR5cGVvZiBvLmhhc2hDb2RlID09PSAnZnVuY3Rpb24nID8gby5oYXNoQ29kZSgpIDogby5oYXNoQ29kZSk7XG4gIH1cbiAgcmV0dXJuIGhhc2hKU09iaihvKTtcbn1cbmZ1bmN0aW9uIGNhY2hlZEhhc2hTdHJpbmcoc3RyaW5nKSB7XG4gIHZhciBoYXNoID0gc3RyaW5nSGFzaENhY2hlW3N0cmluZ107XG4gIGlmIChoYXNoID09PSB1bmRlZmluZWQpIHtcbiAgICBoYXNoID0gaGFzaFN0cmluZyhzdHJpbmcpO1xuICAgIGlmIChTVFJJTkdfSEFTSF9DQUNIRV9TSVpFID09PSBTVFJJTkdfSEFTSF9DQUNIRV9NQVhfU0laRSkge1xuICAgICAgU1RSSU5HX0hBU0hfQ0FDSEVfU0laRSA9IDA7XG4gICAgICBzdHJpbmdIYXNoQ2FjaGUgPSB7fTtcbiAgICB9XG4gICAgU1RSSU5HX0hBU0hfQ0FDSEVfU0laRSsrO1xuICAgIHN0cmluZ0hhc2hDYWNoZVtzdHJpbmddID0gaGFzaDtcbiAgfVxuICByZXR1cm4gaGFzaDtcbn1cbmZ1bmN0aW9uIGhhc2hTdHJpbmcoc3RyaW5nKSB7XG4gIHZhciBoYXNoID0gMDtcbiAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IHN0cmluZy5sZW5ndGg7IGlpKyspIHtcbiAgICBoYXNoID0gKDMxICogaGFzaCArIHN0cmluZy5jaGFyQ29kZUF0KGlpKSkgJiBIQVNIX01BWF9WQUw7XG4gIH1cbiAgcmV0dXJuIGhhc2g7XG59XG5mdW5jdGlvbiBoYXNoSlNPYmoob2JqKSB7XG4gIHZhciBoYXNoID0gd2Vha01hcCAmJiB3ZWFrTWFwLmdldChvYmopO1xuICBpZiAoaGFzaClcbiAgICByZXR1cm4gaGFzaDtcbiAgaGFzaCA9IG9ialtVSURfSEFTSF9LRVldO1xuICBpZiAoaGFzaClcbiAgICByZXR1cm4gaGFzaDtcbiAgaWYgKCFjYW5EZWZpbmVQcm9wZXJ0eSkge1xuICAgIGhhc2ggPSBvYmoucHJvcGVydHlJc0VudW1lcmFibGUgJiYgb2JqLnByb3BlcnR5SXNFbnVtZXJhYmxlW1VJRF9IQVNIX0tFWV07XG4gICAgaWYgKGhhc2gpXG4gICAgICByZXR1cm4gaGFzaDtcbiAgICBoYXNoID0gZ2V0SUVOb2RlSGFzaChvYmopO1xuICAgIGlmIChoYXNoKVxuICAgICAgcmV0dXJuIGhhc2g7XG4gIH1cbiAgaWYgKE9iamVjdC5pc0V4dGVuc2libGUgJiYgIU9iamVjdC5pc0V4dGVuc2libGUob2JqKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignTm9uLWV4dGVuc2libGUgb2JqZWN0cyBhcmUgbm90IGFsbG93ZWQgYXMga2V5cy4nKTtcbiAgfVxuICBoYXNoID0gKytvYmpIYXNoVUlEICYgSEFTSF9NQVhfVkFMO1xuICBpZiAod2Vha01hcCkge1xuICAgIHdlYWtNYXAuc2V0KG9iaiwgaGFzaCk7XG4gIH0gZWxzZSBpZiAoY2FuRGVmaW5lUHJvcGVydHkpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBVSURfSEFTSF9LRVksIHtcbiAgICAgICdlbnVtZXJhYmxlJzogZmFsc2UsXG4gICAgICAnY29uZmlndXJhYmxlJzogZmFsc2UsXG4gICAgICAnd3JpdGFibGUnOiBmYWxzZSxcbiAgICAgICd2YWx1ZSc6IGhhc2hcbiAgICB9KTtcbiAgfSBlbHNlIGlmIChvYmoucHJvcGVydHlJc0VudW1lcmFibGUgJiYgb2JqLnByb3BlcnR5SXNFbnVtZXJhYmxlID09PSBvYmouY29uc3RydWN0b3IucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlKSB7XG4gICAgb2JqLnByb3BlcnR5SXNFbnVtZXJhYmxlID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICAgIG9iai5wcm9wZXJ0eUlzRW51bWVyYWJsZVtVSURfSEFTSF9LRVldID0gaGFzaDtcbiAgfSBlbHNlIGlmIChvYmoubm9kZVR5cGUpIHtcbiAgICBvYmpbVUlEX0hBU0hfS0VZXSA9IGhhc2g7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gc2V0IGEgbm9uLWVudW1lcmFibGUgcHJvcGVydHkgb24gb2JqZWN0LicpO1xuICB9XG4gIHJldHVybiBoYXNoO1xufVxudmFyIGNhbkRlZmluZVByb3BlcnR5ID0gKGZ1bmN0aW9uKCkge1xuICB0cnkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh7fSwgJ3gnLCB7fSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn0oKSk7XG5mdW5jdGlvbiBnZXRJRU5vZGVIYXNoKG5vZGUpIHtcbiAgaWYgKG5vZGUgJiYgbm9kZS5ub2RlVHlwZSA+IDApIHtcbiAgICBzd2l0Y2ggKG5vZGUubm9kZVR5cGUpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgcmV0dXJuIG5vZGUudW5pcXVlSUQ7XG4gICAgICBjYXNlIDk6XG4gICAgICAgIHJldHVybiBub2RlLmRvY3VtZW50RWxlbWVudCAmJiBub2RlLmRvY3VtZW50RWxlbWVudC51bmlxdWVJRDtcbiAgICB9XG4gIH1cbn1cbnZhciB3ZWFrTWFwID0gdHlwZW9mIFdlYWtNYXAgPT09ICdmdW5jdGlvbicgJiYgbmV3IFdlYWtNYXAoKTtcbnZhciBIQVNIX01BWF9WQUwgPSAweDdGRkZGRkZGO1xudmFyIG9iakhhc2hVSUQgPSAwO1xudmFyIFVJRF9IQVNIX0tFWSA9ICdfX2ltbXV0YWJsZWhhc2hfXyc7XG5pZiAodHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJykge1xuICBVSURfSEFTSF9LRVkgPSBTeW1ib2woVUlEX0hBU0hfS0VZKTtcbn1cbnZhciBTVFJJTkdfSEFTSF9DQUNIRV9NSU5fU1RSTEVOID0gMTY7XG52YXIgU1RSSU5HX0hBU0hfQ0FDSEVfTUFYX1NJWkUgPSAyNTU7XG52YXIgU1RSSU5HX0hBU0hfQ0FDSEVfU0laRSA9IDA7XG52YXIgc3RyaW5nSGFzaENhY2hlID0ge307XG52YXIgSVRFUkFURV9LRVlTID0gMDtcbnZhciBJVEVSQVRFX1ZBTFVFUyA9IDE7XG52YXIgSVRFUkFURV9FTlRSSUVTID0gMjtcbnZhciBGQVVYX0lURVJBVE9SX1NZTUJPTCA9ICdAQGl0ZXJhdG9yJztcbnZhciBSRUFMX0lURVJBVE9SX1NZTUJPTCA9IHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgU3ltYm9sLml0ZXJhdG9yO1xudmFyIElURVJBVE9SX1NZTUJPTCA9IFJFQUxfSVRFUkFUT1JfU1lNQk9MIHx8IEZBVVhfSVRFUkFUT1JfU1lNQk9MO1xudmFyIEl0ZXJhdG9yID0gZnVuY3Rpb24gSXRlcmF0b3IobmV4dCkge1xuICB0aGlzLm5leHQgPSBuZXh0O1xufTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKEl0ZXJhdG9yLCB7dG9TdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAnW0l0ZXJhdG9yXSc7XG4gIH19LCB7fSk7XG5JdGVyYXRvci5LRVlTID0gSVRFUkFURV9LRVlTO1xuSXRlcmF0b3IuVkFMVUVTID0gSVRFUkFURV9WQUxVRVM7XG5JdGVyYXRvci5FTlRSSUVTID0gSVRFUkFURV9FTlRSSUVTO1xudmFyIEl0ZXJhdG9yUHJvdG90eXBlID0gSXRlcmF0b3IucHJvdG90eXBlO1xuSXRlcmF0b3JQcm90b3R5cGUuaW5zcGVjdCA9IEl0ZXJhdG9yUHJvdG90eXBlLnRvU291cmNlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnRvU3RyaW5nKCk7XG59O1xuSXRlcmF0b3JQcm90b3R5cGVbSVRFUkFUT1JfU1lNQk9MXSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcztcbn07XG5mdW5jdGlvbiBpdGVyYXRvclZhbHVlKHR5cGUsIGssIHYsIGl0ZXJhdG9yUmVzdWx0KSB7XG4gIHZhciB2YWx1ZSA9IHR5cGUgPT09IDAgPyBrIDogdHlwZSA9PT0gMSA/IHYgOiBbaywgdl07XG4gIGl0ZXJhdG9yUmVzdWx0ID8gKGl0ZXJhdG9yUmVzdWx0LnZhbHVlID0gdmFsdWUpIDogKGl0ZXJhdG9yUmVzdWx0ID0ge1xuICAgIHZhbHVlOiB2YWx1ZSxcbiAgICBkb25lOiBmYWxzZVxuICB9KTtcbiAgcmV0dXJuIGl0ZXJhdG9yUmVzdWx0O1xufVxuZnVuY3Rpb24gaXRlcmF0b3JEb25lKCkge1xuICByZXR1cm4ge1xuICAgIHZhbHVlOiB1bmRlZmluZWQsXG4gICAgZG9uZTogdHJ1ZVxuICB9O1xufVxuZnVuY3Rpb24gaGFzSXRlcmF0b3IobWF5YmVJdGVyYWJsZSkge1xuICByZXR1cm4gISFfaXRlcmF0b3JGbihtYXliZUl0ZXJhYmxlKTtcbn1cbmZ1bmN0aW9uIGlzSXRlcmF0b3IobWF5YmVJdGVyYXRvcikge1xuICByZXR1cm4gbWF5YmVJdGVyYXRvciAmJiB0eXBlb2YgbWF5YmVJdGVyYXRvci5uZXh0ID09PSAnZnVuY3Rpb24nO1xufVxuZnVuY3Rpb24gZ2V0SXRlcmF0b3IoaXRlcmFibGUpIHtcbiAgdmFyIGl0ZXJhdG9yRm4gPSBfaXRlcmF0b3JGbihpdGVyYWJsZSk7XG4gIHJldHVybiBpdGVyYXRvckZuICYmIGl0ZXJhdG9yRm4uY2FsbChpdGVyYWJsZSk7XG59XG5mdW5jdGlvbiBfaXRlcmF0b3JGbihpdGVyYWJsZSkge1xuICB2YXIgaXRlcmF0b3JGbiA9IGl0ZXJhYmxlICYmICgoUkVBTF9JVEVSQVRPUl9TWU1CT0wgJiYgaXRlcmFibGVbUkVBTF9JVEVSQVRPUl9TWU1CT0xdKSB8fCBpdGVyYWJsZVtGQVVYX0lURVJBVE9SX1NZTUJPTF0pO1xuICBpZiAodHlwZW9mIGl0ZXJhdG9yRm4gPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gaXRlcmF0b3JGbjtcbiAgfVxufVxudmFyIEl0ZXJhYmxlID0gZnVuY3Rpb24gSXRlcmFibGUodmFsdWUpIHtcbiAgcmV0dXJuIGlzSXRlcmFibGUodmFsdWUpID8gdmFsdWUgOiBTZXEuYXBwbHkodW5kZWZpbmVkLCBhcmd1bWVudHMpO1xufTtcbnZhciAkSXRlcmFibGUgPSBJdGVyYWJsZTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKEl0ZXJhYmxlLCB7XG4gIHRvQXJyYXk6IGZ1bmN0aW9uKCkge1xuICAgIGFzc2VydE5vdEluZmluaXRlKHRoaXMuc2l6ZSk7XG4gICAgdmFyIGFycmF5ID0gbmV3IEFycmF5KHRoaXMuc2l6ZSB8fCAwKTtcbiAgICB0aGlzLnZhbHVlU2VxKCkuX19pdGVyYXRlKChmdW5jdGlvbih2LCBpKSB7XG4gICAgICBhcnJheVtpXSA9IHY7XG4gICAgfSkpO1xuICAgIHJldHVybiBhcnJheTtcbiAgfSxcbiAgdG9JbmRleGVkU2VxOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFRvSW5kZXhlZFNlcXVlbmNlKHRoaXMpO1xuICB9LFxuICB0b0pTOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy50b1NlcSgpLm1hcCgoZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUudG9KUyA9PT0gJ2Z1bmN0aW9uJyA/IHZhbHVlLnRvSlMoKSA6IHZhbHVlO1xuICAgIH0pKS5fX3RvSlMoKTtcbiAgfSxcbiAgdG9LZXllZFNlcTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBUb0tleWVkU2VxdWVuY2UodGhpcywgdHJ1ZSk7XG4gIH0sXG4gIHRvTWFwOiBmdW5jdGlvbigpIHtcbiAgICBhc3NlcnROb3RJbmZpbml0ZSh0aGlzLnNpemUpO1xuICAgIHJldHVybiBNYXAodGhpcy50b0tleWVkU2VxKCkpO1xuICB9LFxuICB0b09iamVjdDogZnVuY3Rpb24oKSB7XG4gICAgYXNzZXJ0Tm90SW5maW5pdGUodGhpcy5zaXplKTtcbiAgICB2YXIgb2JqZWN0ID0ge307XG4gICAgdGhpcy5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYsIGspIHtcbiAgICAgIG9iamVjdFtrXSA9IHY7XG4gICAgfSkpO1xuICAgIHJldHVybiBvYmplY3Q7XG4gIH0sXG4gIHRvT3JkZXJlZE1hcDogZnVuY3Rpb24oKSB7XG4gICAgYXNzZXJ0Tm90SW5maW5pdGUodGhpcy5zaXplKTtcbiAgICByZXR1cm4gT3JkZXJlZE1hcCh0aGlzLnRvS2V5ZWRTZXEoKSk7XG4gIH0sXG4gIHRvU2V0OiBmdW5jdGlvbigpIHtcbiAgICBhc3NlcnROb3RJbmZpbml0ZSh0aGlzLnNpemUpO1xuICAgIHJldHVybiBTZXQodGhpcyk7XG4gIH0sXG4gIHRvU2V0U2VxOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFRvU2V0U2VxdWVuY2UodGhpcywgdHJ1ZSk7XG4gIH0sXG4gIHRvU2VxOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gaXNJbmRleGVkKHRoaXMpID8gdGhpcy50b0luZGV4ZWRTZXEoKSA6IGlzS2V5ZWQodGhpcykgPyB0aGlzLnRvS2V5ZWRTZXEoKSA6IHRoaXMudG9TZXRTZXEoKTtcbiAgfSxcbiAgdG9TdGFjazogZnVuY3Rpb24oKSB7XG4gICAgYXNzZXJ0Tm90SW5maW5pdGUodGhpcy5zaXplKTtcbiAgICByZXR1cm4gU3RhY2sodGhpcyk7XG4gIH0sXG4gIHRvTGlzdDogZnVuY3Rpb24oKSB7XG4gICAgYXNzZXJ0Tm90SW5maW5pdGUodGhpcy5zaXplKTtcbiAgICByZXR1cm4gTGlzdCh0aGlzKTtcbiAgfSxcbiAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAnW0l0ZXJhYmxlXSc7XG4gIH0sXG4gIF9fdG9TdHJpbmc6IGZ1bmN0aW9uKGhlYWQsIHRhaWwpIHtcbiAgICBpZiAodGhpcy5zaXplID09PSAwKSB7XG4gICAgICByZXR1cm4gaGVhZCArIHRhaWw7XG4gICAgfVxuICAgIHJldHVybiBoZWFkICsgJyAnICsgdGhpcy50b1NlcSgpLm1hcCh0aGlzLl9fdG9TdHJpbmdNYXBwZXIpLmpvaW4oJywgJykgKyAnICcgKyB0YWlsO1xuICB9LFxuICBjb25jYXQ6IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIHZhbHVlcyA9IFtdLFxuICAgICAgICAkX18yID0gMDsgJF9fMiA8IGFyZ3VtZW50cy5sZW5ndGg7ICRfXzIrKylcbiAgICAgIHZhbHVlc1skX18yXSA9IGFyZ3VtZW50c1skX18yXTtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgY29uY2F0RmFjdG9yeSh0aGlzLCB2YWx1ZXMsIHRydWUpKTtcbiAgfSxcbiAgY29udGFpbnM6IGZ1bmN0aW9uKHNlYXJjaFZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuc29tZSgoZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiBpcyh2YWx1ZSwgc2VhcmNoVmFsdWUpO1xuICAgIH0pKTtcbiAgfSxcbiAgZW50cmllczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX19pdGVyYXRvcihJVEVSQVRFX0VOVFJJRVMpO1xuICB9LFxuICBldmVyeTogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgdmFyIHJldHVyblZhbHVlID0gdHJ1ZTtcbiAgICB0aGlzLl9faXRlcmF0ZSgoZnVuY3Rpb24odiwgaywgYykge1xuICAgICAgaWYgKCFwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2LCBrLCBjKSkge1xuICAgICAgICByZXR1cm5WYWx1ZSA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSkpO1xuICAgIHJldHVybiByZXR1cm5WYWx1ZTtcbiAgfSxcbiAgZmlsdGVyOiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgZmlsdGVyRmFjdG9yeSh0aGlzLCBwcmVkaWNhdGUsIGNvbnRleHQsIHRydWUpKTtcbiAgfSxcbiAgZmluZDogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0LCBub3RTZXRWYWx1ZSkge1xuICAgIHZhciBmb3VuZFZhbHVlID0gbm90U2V0VmFsdWU7XG4gICAgdGhpcy5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYsIGssIGMpIHtcbiAgICAgIGlmIChwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2LCBrLCBjKSkge1xuICAgICAgICBmb3VuZFZhbHVlID0gdjtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0pKTtcbiAgICByZXR1cm4gZm91bmRWYWx1ZTtcbiAgfSxcbiAgZm9yRWFjaDogZnVuY3Rpb24oc2lkZUVmZmVjdCwgY29udGV4dCkge1xuICAgIHJldHVybiB0aGlzLl9faXRlcmF0ZShjb250ZXh0ID8gc2lkZUVmZmVjdC5iaW5kKGNvbnRleHQpIDogc2lkZUVmZmVjdCk7XG4gIH0sXG4gIGpvaW46IGZ1bmN0aW9uKHNlcGFyYXRvcikge1xuICAgIHNlcGFyYXRvciA9IHNlcGFyYXRvciAhPT0gdW5kZWZpbmVkID8gJycgKyBzZXBhcmF0b3IgOiAnLCc7XG4gICAgdmFyIGpvaW5lZCA9ICcnO1xuICAgIHZhciBpc0ZpcnN0ID0gdHJ1ZTtcbiAgICB0aGlzLl9faXRlcmF0ZSgoZnVuY3Rpb24odikge1xuICAgICAgaXNGaXJzdCA/IChpc0ZpcnN0ID0gZmFsc2UpIDogKGpvaW5lZCArPSBzZXBhcmF0b3IpO1xuICAgICAgam9pbmVkICs9IHYgIT09IG51bGwgJiYgdiAhPT0gdW5kZWZpbmVkID8gdiA6ICcnO1xuICAgIH0pKTtcbiAgICByZXR1cm4gam9pbmVkO1xuICB9LFxuICBrZXlzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fX2l0ZXJhdG9yKElURVJBVEVfS0VZUyk7XG4gIH0sXG4gIG1hcDogZnVuY3Rpb24obWFwcGVyLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIG1hcEZhY3RvcnkodGhpcywgbWFwcGVyLCBjb250ZXh0KSk7XG4gIH0sXG4gIHJlZHVjZTogZnVuY3Rpb24ocmVkdWNlciwgaW5pdGlhbFJlZHVjdGlvbiwgY29udGV4dCkge1xuICAgIHZhciByZWR1Y3Rpb247XG4gICAgdmFyIHVzZUZpcnN0O1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgdXNlRmlyc3QgPSB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZWR1Y3Rpb24gPSBpbml0aWFsUmVkdWN0aW9uO1xuICAgIH1cbiAgICB0aGlzLl9faXRlcmF0ZSgoZnVuY3Rpb24odiwgaywgYykge1xuICAgICAgaWYgKHVzZUZpcnN0KSB7XG4gICAgICAgIHVzZUZpcnN0ID0gZmFsc2U7XG4gICAgICAgIHJlZHVjdGlvbiA9IHY7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZWR1Y3Rpb24gPSByZWR1Y2VyLmNhbGwoY29udGV4dCwgcmVkdWN0aW9uLCB2LCBrLCBjKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gICAgcmV0dXJuIHJlZHVjdGlvbjtcbiAgfSxcbiAgcmVkdWNlUmlnaHQ6IGZ1bmN0aW9uKHJlZHVjZXIsIGluaXRpYWxSZWR1Y3Rpb24sIGNvbnRleHQpIHtcbiAgICB2YXIgcmV2ZXJzZWQgPSB0aGlzLnRvS2V5ZWRTZXEoKS5yZXZlcnNlKCk7XG4gICAgcmV0dXJuIHJldmVyc2VkLnJlZHVjZS5hcHBseShyZXZlcnNlZCwgYXJndW1lbnRzKTtcbiAgfSxcbiAgcmV2ZXJzZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIHJldmVyc2VGYWN0b3J5KHRoaXMsIHRydWUpKTtcbiAgfSxcbiAgc2xpY2U6IGZ1bmN0aW9uKGJlZ2luLCBlbmQpIHtcbiAgICBpZiAod2hvbGVTbGljZShiZWdpbiwgZW5kLCB0aGlzLnNpemUpKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdmFyIHJlc29sdmVkQmVnaW4gPSByZXNvbHZlQmVnaW4oYmVnaW4sIHRoaXMuc2l6ZSk7XG4gICAgdmFyIHJlc29sdmVkRW5kID0gcmVzb2x2ZUVuZChlbmQsIHRoaXMuc2l6ZSk7XG4gICAgaWYgKHJlc29sdmVkQmVnaW4gIT09IHJlc29sdmVkQmVnaW4gfHwgcmVzb2x2ZWRFbmQgIT09IHJlc29sdmVkRW5kKSB7XG4gICAgICByZXR1cm4gdGhpcy50b1NlcSgpLmNhY2hlUmVzdWx0KCkuc2xpY2UoYmVnaW4sIGVuZCk7XG4gICAgfVxuICAgIHZhciBza2lwcGVkID0gcmVzb2x2ZWRCZWdpbiA9PT0gMCA/IHRoaXMgOiB0aGlzLnNraXAocmVzb2x2ZWRCZWdpbik7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIHJlc29sdmVkRW5kID09PSB1bmRlZmluZWQgfHwgcmVzb2x2ZWRFbmQgPT09IHRoaXMuc2l6ZSA/IHNraXBwZWQgOiBza2lwcGVkLnRha2UocmVzb2x2ZWRFbmQgLSByZXNvbHZlZEJlZ2luKSk7XG4gIH0sXG4gIHNvbWU6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHJldHVybiAhdGhpcy5ldmVyeShub3QocHJlZGljYXRlKSwgY29udGV4dCk7XG4gIH0sXG4gIHNvcnQ6IGZ1bmN0aW9uKGNvbXBhcmF0b3IpIHtcbiAgICByZXR1cm4gdGhpcy5zb3J0QnkodmFsdWVNYXBwZXIsIGNvbXBhcmF0b3IpO1xuICB9LFxuICB2YWx1ZXM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9faXRlcmF0b3IoSVRFUkFURV9WQUxVRVMpO1xuICB9LFxuICBidXRMYXN0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5zbGljZSgwLCAtMSk7XG4gIH0sXG4gIGNvdW50OiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gZW5zdXJlU2l6ZShwcmVkaWNhdGUgPyB0aGlzLnRvU2VxKCkuZmlsdGVyKHByZWRpY2F0ZSwgY29udGV4dCkgOiB0aGlzKTtcbiAgfSxcbiAgY291bnRCeTogZnVuY3Rpb24oZ3JvdXBlciwgY29udGV4dCkge1xuICAgIHJldHVybiBjb3VudEJ5RmFjdG9yeSh0aGlzLCBncm91cGVyLCBjb250ZXh0KTtcbiAgfSxcbiAgZXF1YWxzOiBmdW5jdGlvbihvdGhlcikge1xuICAgIGlmICh0aGlzID09PSBvdGhlcikge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmICghb3RoZXIgfHwgdHlwZW9mIG90aGVyLmVxdWFscyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAodGhpcy5zaXplICE9PSB1bmRlZmluZWQgJiYgb3RoZXIuc2l6ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAodGhpcy5zaXplICE9PSBvdGhlci5zaXplKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnNpemUgPT09IDAgJiYgb3RoZXIuc2l6ZSA9PT0gMCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMuX19oYXNoICE9PSB1bmRlZmluZWQgJiYgb3RoZXIuX19oYXNoICE9PSB1bmRlZmluZWQgJiYgdGhpcy5fX2hhc2ggIT09IG90aGVyLl9faGFzaCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fX2RlZXBFcXVhbHMob3RoZXIpO1xuICB9LFxuICBfX2RlZXBFcXVhbHM6IGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgdmFyIGVudHJpZXMgPSB0aGlzLmVudHJpZXMoKTtcbiAgICByZXR1cm4gdHlwZW9mIG90aGVyLmV2ZXJ5ID09PSAnZnVuY3Rpb24nICYmIG90aGVyLmV2ZXJ5KChmdW5jdGlvbih2LCBrKSB7XG4gICAgICB2YXIgZW50cnkgPSBlbnRyaWVzLm5leHQoKS52YWx1ZTtcbiAgICAgIHJldHVybiBlbnRyeSAmJiBpcyhlbnRyeVswXSwgaykgJiYgaXMoZW50cnlbMV0sIHYpO1xuICAgIH0pKSAmJiBlbnRyaWVzLm5leHQoKS5kb25lO1xuICB9LFxuICBlbnRyeVNlcTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZXJhYmxlID0gdGhpcztcbiAgICBpZiAoaXRlcmFibGUuX2NhY2hlKSB7XG4gICAgICByZXR1cm4gbmV3IEFycmF5U2VxKGl0ZXJhYmxlLl9jYWNoZSk7XG4gICAgfVxuICAgIHZhciBlbnRyaWVzU2VxdWVuY2UgPSBpdGVyYWJsZS50b1NlcSgpLm1hcChlbnRyeU1hcHBlcikudG9JbmRleGVkU2VxKCk7XG4gICAgZW50cmllc1NlcXVlbmNlLmZyb21FbnRyeVNlcSA9IChmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBpdGVyYWJsZS50b1NlcSgpO1xuICAgIH0pO1xuICAgIHJldHVybiBlbnRyaWVzU2VxdWVuY2U7XG4gIH0sXG4gIGZpbHRlck5vdDogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyKG5vdChwcmVkaWNhdGUpLCBjb250ZXh0KTtcbiAgfSxcbiAgZmluZExhc3Q6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCwgbm90U2V0VmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy50b0tleWVkU2VxKCkucmV2ZXJzZSgpLmZpbmQocHJlZGljYXRlLCBjb250ZXh0LCBub3RTZXRWYWx1ZSk7XG4gIH0sXG4gIGZpcnN0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5maW5kKHJldHVyblRydWUpO1xuICB9LFxuICBmbGF0TWFwOiBmdW5jdGlvbihtYXBwZXIsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgZmxhdE1hcEZhY3RvcnkodGhpcywgbWFwcGVyLCBjb250ZXh0KSk7XG4gIH0sXG4gIGZsYXR0ZW46IGZ1bmN0aW9uKGRlcHRoKSB7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIGZsYXR0ZW5GYWN0b3J5KHRoaXMsIGRlcHRoLCB0cnVlKSk7XG4gIH0sXG4gIGZyb21FbnRyeVNlcTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBGcm9tRW50cmllc1NlcXVlbmNlKHRoaXMpO1xuICB9LFxuICBnZXQ6IGZ1bmN0aW9uKHNlYXJjaEtleSwgbm90U2V0VmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5maW5kKChmdW5jdGlvbihfLCBrZXkpIHtcbiAgICAgIHJldHVybiBpcyhrZXksIHNlYXJjaEtleSk7XG4gICAgfSksIHVuZGVmaW5lZCwgbm90U2V0VmFsdWUpO1xuICB9LFxuICBnZXRJbjogZnVuY3Rpb24oc2VhcmNoS2V5UGF0aCwgbm90U2V0VmFsdWUpIHtcbiAgICB2YXIgbmVzdGVkID0gdGhpcztcbiAgICBpZiAoc2VhcmNoS2V5UGF0aCkge1xuICAgICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IHNlYXJjaEtleVBhdGgubGVuZ3RoOyBpaSsrKSB7XG4gICAgICAgIG5lc3RlZCA9IG5lc3RlZCAmJiBuZXN0ZWQuZ2V0ID8gbmVzdGVkLmdldChzZWFyY2hLZXlQYXRoW2lpXSwgTk9UX1NFVCkgOiBOT1RfU0VUO1xuICAgICAgICBpZiAobmVzdGVkID09PSBOT1RfU0VUKSB7XG4gICAgICAgICAgcmV0dXJuIG5vdFNldFZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXN0ZWQ7XG4gIH0sXG4gIGdyb3VwQnk6IGZ1bmN0aW9uKGdyb3VwZXIsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gZ3JvdXBCeUZhY3RvcnkodGhpcywgZ3JvdXBlciwgY29udGV4dCk7XG4gIH0sXG4gIGhhczogZnVuY3Rpb24oc2VhcmNoS2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0KHNlYXJjaEtleSwgTk9UX1NFVCkgIT09IE5PVF9TRVQ7XG4gIH0sXG4gIGlzU3Vic2V0OiBmdW5jdGlvbihpdGVyKSB7XG4gICAgaXRlciA9IHR5cGVvZiBpdGVyLmNvbnRhaW5zID09PSAnZnVuY3Rpb24nID8gaXRlciA6ICRJdGVyYWJsZShpdGVyKTtcbiAgICByZXR1cm4gdGhpcy5ldmVyeSgoZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiBpdGVyLmNvbnRhaW5zKHZhbHVlKTtcbiAgICB9KSk7XG4gIH0sXG4gIGlzU3VwZXJzZXQ6IGZ1bmN0aW9uKGl0ZXIpIHtcbiAgICByZXR1cm4gaXRlci5pc1N1YnNldCh0aGlzKTtcbiAgfSxcbiAga2V5U2VxOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy50b1NlcSgpLm1hcChrZXlNYXBwZXIpLnRvSW5kZXhlZFNlcSgpO1xuICB9LFxuICBsYXN0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy50b1NlcSgpLnJldmVyc2UoKS5maXJzdCgpO1xuICB9LFxuICBtYXg6IGZ1bmN0aW9uKGNvbXBhcmF0b3IpIHtcbiAgICByZXR1cm4gdGhpcy5tYXhCeSh2YWx1ZU1hcHBlciwgY29tcGFyYXRvcik7XG4gIH0sXG4gIG1heEJ5OiBmdW5jdGlvbihtYXBwZXIsIGNvbXBhcmF0b3IpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgY29tcGFyYXRvciA9IGNvbXBhcmF0b3IgfHwgZGVmYXVsdENvbXBhcmF0b3I7XG4gICAgdmFyIG1heEVudHJ5ID0gdGhpcy5lbnRyeVNlcSgpLnJlZHVjZSgoZnVuY3Rpb24obWF4LCBuZXh0KSB7XG4gICAgICByZXR1cm4gY29tcGFyYXRvcihtYXBwZXIobmV4dFsxXSwgbmV4dFswXSwgJF9fMCksIG1hcHBlcihtYXhbMV0sIG1heFswXSwgJF9fMCkpID4gMCA/IG5leHQgOiBtYXg7XG4gICAgfSkpO1xuICAgIHJldHVybiBtYXhFbnRyeSAmJiBtYXhFbnRyeVsxXTtcbiAgfSxcbiAgbWluOiBmdW5jdGlvbihjb21wYXJhdG9yKSB7XG4gICAgcmV0dXJuIHRoaXMubWluQnkodmFsdWVNYXBwZXIsIGNvbXBhcmF0b3IpO1xuICB9LFxuICBtaW5CeTogZnVuY3Rpb24obWFwcGVyLCBjb21wYXJhdG9yKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIGNvbXBhcmF0b3IgPSBjb21wYXJhdG9yIHx8IGRlZmF1bHRDb21wYXJhdG9yO1xuICAgIHZhciBtaW5FbnRyeSA9IHRoaXMuZW50cnlTZXEoKS5yZWR1Y2UoKGZ1bmN0aW9uKG1pbiwgbmV4dCkge1xuICAgICAgcmV0dXJuIGNvbXBhcmF0b3IobWFwcGVyKG5leHRbMV0sIG5leHRbMF0sICRfXzApLCBtYXBwZXIobWluWzFdLCBtaW5bMF0sICRfXzApKSA8IDAgPyBuZXh0IDogbWluO1xuICAgIH0pKTtcbiAgICByZXR1cm4gbWluRW50cnkgJiYgbWluRW50cnlbMV07XG4gIH0sXG4gIHJlc3Q6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnNsaWNlKDEpO1xuICB9LFxuICBza2lwOiBmdW5jdGlvbihhbW91bnQpIHtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgc2tpcEZhY3RvcnkodGhpcywgYW1vdW50LCB0cnVlKSk7XG4gIH0sXG4gIHNraXBMYXN0OiBmdW5jdGlvbihhbW91bnQpIHtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgdGhpcy50b1NlcSgpLnJldmVyc2UoKS5za2lwKGFtb3VudCkucmV2ZXJzZSgpKTtcbiAgfSxcbiAgc2tpcFdoaWxlOiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgc2tpcFdoaWxlRmFjdG9yeSh0aGlzLCBwcmVkaWNhdGUsIGNvbnRleHQsIHRydWUpKTtcbiAgfSxcbiAgc2tpcFVudGlsOiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gdGhpcy5za2lwV2hpbGUobm90KHByZWRpY2F0ZSksIGNvbnRleHQpO1xuICB9LFxuICBzb3J0Qnk6IGZ1bmN0aW9uKG1hcHBlciwgY29tcGFyYXRvcikge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICBjb21wYXJhdG9yID0gY29tcGFyYXRvciB8fCBkZWZhdWx0Q29tcGFyYXRvcjtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgbmV3IEFycmF5U2VxKHRoaXMuZW50cnlTZXEoKS5lbnRyeVNlcSgpLnRvQXJyYXkoKS5zb3J0KChmdW5jdGlvbihhLCBiKSB7XG4gICAgICByZXR1cm4gY29tcGFyYXRvcihtYXBwZXIoYVsxXVsxXSwgYVsxXVswXSwgJF9fMCksIG1hcHBlcihiWzFdWzFdLCBiWzFdWzBdLCAkX18wKSkgfHwgYVswXSAtIGJbMF07XG4gICAgfSkpKS5mcm9tRW50cnlTZXEoKS52YWx1ZVNlcSgpLmZyb21FbnRyeVNlcSgpKTtcbiAgfSxcbiAgdGFrZTogZnVuY3Rpb24oYW1vdW50KSB7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIHRha2VGYWN0b3J5KHRoaXMsIGFtb3VudCkpO1xuICB9LFxuICB0YWtlTGFzdDogZnVuY3Rpb24oYW1vdW50KSB7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIHRoaXMudG9TZXEoKS5yZXZlcnNlKCkudGFrZShhbW91bnQpLnJldmVyc2UoKSk7XG4gIH0sXG4gIHRha2VXaGlsZTogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIHRha2VXaGlsZUZhY3RvcnkodGhpcywgcHJlZGljYXRlLCBjb250ZXh0KSk7XG4gIH0sXG4gIHRha2VVbnRpbDogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHRoaXMudGFrZVdoaWxlKG5vdChwcmVkaWNhdGUpLCBjb250ZXh0KTtcbiAgfSxcbiAgdmFsdWVTZXE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnRvSW5kZXhlZFNlcSgpO1xuICB9LFxuICBoYXNoQ29kZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX19oYXNoIHx8ICh0aGlzLl9faGFzaCA9IHRoaXMuc2l6ZSA9PT0gSW5maW5pdHkgPyAwIDogdGhpcy5yZWR1Y2UoKGZ1bmN0aW9uKGgsIHYsIGspIHtcbiAgICAgIHJldHVybiAoaCArIChoYXNoKHYpIF4gKHYgPT09IGsgPyAwIDogaGFzaChrKSkpKSAmIEhBU0hfTUFYX1ZBTDtcbiAgICB9KSwgMCkpO1xuICB9XG59LCB7fSk7XG52YXIgSVNfSVRFUkFCTEVfU0VOVElORUwgPSAnQEBfX0lNTVVUQUJMRV9JVEVSQUJMRV9fQEAnO1xudmFyIElTX0tFWUVEX1NFTlRJTkVMID0gJ0BAX19JTU1VVEFCTEVfS0VZRURfX0BAJztcbnZhciBJU19JTkRFWEVEX1NFTlRJTkVMID0gJ0BAX19JTU1VVEFCTEVfSU5ERVhFRF9fQEAnO1xudmFyIEl0ZXJhYmxlUHJvdG90eXBlID0gSXRlcmFibGUucHJvdG90eXBlO1xuSXRlcmFibGVQcm90b3R5cGVbSVNfSVRFUkFCTEVfU0VOVElORUxdID0gdHJ1ZTtcbkl0ZXJhYmxlUHJvdG90eXBlW0lURVJBVE9SX1NZTUJPTF0gPSBJdGVyYWJsZVByb3RvdHlwZS52YWx1ZXM7XG5JdGVyYWJsZVByb3RvdHlwZS50b0pTT04gPSBJdGVyYWJsZVByb3RvdHlwZS50b0pTO1xuSXRlcmFibGVQcm90b3R5cGUuX190b0pTID0gSXRlcmFibGVQcm90b3R5cGUudG9BcnJheTtcbkl0ZXJhYmxlUHJvdG90eXBlLl9fdG9TdHJpbmdNYXBwZXIgPSBxdW90ZVN0cmluZztcbkl0ZXJhYmxlUHJvdG90eXBlLmluc3BlY3QgPSBJdGVyYWJsZVByb3RvdHlwZS50b1NvdXJjZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy50b1N0cmluZygpO1xufTtcbkl0ZXJhYmxlUHJvdG90eXBlLmNoYWluID0gSXRlcmFibGVQcm90b3R5cGUuZmxhdE1hcDtcbihmdW5jdGlvbigpIHtcbiAgdHJ5IHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoSXRlcmFibGVQcm90b3R5cGUsICdsZW5ndGgnLCB7Z2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCFJdGVyYWJsZS5ub0xlbmd0aFdhcm5pbmcpIHtcbiAgICAgICAgICB2YXIgc3RhY2s7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBzdGFjayA9IGVycm9yLnN0YWNrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoc3RhY2suaW5kZXhPZignX3dyYXBPYmplY3QnKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGNvbnNvbGUgJiYgY29uc29sZS53YXJuICYmIGNvbnNvbGUud2FybignaXRlcmFibGUubGVuZ3RoIGhhcyBiZWVuIGRlcHJlY2F0ZWQsICcgKyAndXNlIGl0ZXJhYmxlLnNpemUgb3IgaXRlcmFibGUuY291bnQoKS4gJyArICdUaGlzIHdhcm5pbmcgd2lsbCBiZWNvbWUgYSBzaWxlbnQgZXJyb3IgaW4gYSBmdXR1cmUgdmVyc2lvbi4gJyArIHN0YWNrKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNpemU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9fSk7XG4gIH0gY2F0Y2ggKGUpIHt9XG59KSgpO1xudmFyIEtleWVkSXRlcmFibGUgPSBmdW5jdGlvbiBLZXllZEl0ZXJhYmxlKHZhbHVlKSB7XG4gIHJldHVybiBpc0tleWVkKHZhbHVlKSA/IHZhbHVlIDogS2V5ZWRTZXEuYXBwbHkodW5kZWZpbmVkLCBhcmd1bWVudHMpO1xufTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKEtleWVkSXRlcmFibGUsIHtcbiAgZmxpcDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIGZsaXBGYWN0b3J5KHRoaXMpKTtcbiAgfSxcbiAgZmluZEtleTogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgdmFyIGZvdW5kS2V5O1xuICAgIHRoaXMuX19pdGVyYXRlKChmdW5jdGlvbih2LCBrLCBjKSB7XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwoY29udGV4dCwgdiwgaywgYykpIHtcbiAgICAgICAgZm91bmRLZXkgPSBrO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSkpO1xuICAgIHJldHVybiBmb3VuZEtleTtcbiAgfSxcbiAgZmluZExhc3RLZXk6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHJldHVybiB0aGlzLnRvU2VxKCkucmV2ZXJzZSgpLmZpbmRLZXkocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgfSxcbiAga2V5T2Y6IGZ1bmN0aW9uKHNlYXJjaFZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuZmluZEtleSgoZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiBpcyh2YWx1ZSwgc2VhcmNoVmFsdWUpO1xuICAgIH0pKTtcbiAgfSxcbiAgbGFzdEtleU9mOiBmdW5jdGlvbihzZWFyY2hWYWx1ZSkge1xuICAgIHJldHVybiB0aGlzLnRvU2VxKCkucmV2ZXJzZSgpLmtleU9mKHNlYXJjaFZhbHVlKTtcbiAgfSxcbiAgbWFwRW50cmllczogZnVuY3Rpb24obWFwcGVyLCBjb250ZXh0KSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgdGhpcy50b1NlcSgpLm1hcCgoZnVuY3Rpb24odiwgaykge1xuICAgICAgcmV0dXJuIG1hcHBlci5jYWxsKGNvbnRleHQsIFtrLCB2XSwgaXRlcmF0aW9ucysrLCAkX18wKTtcbiAgICB9KSkuZnJvbUVudHJ5U2VxKCkpO1xuICB9LFxuICBtYXBLZXlzOiBmdW5jdGlvbihtYXBwZXIsIGNvbnRleHQpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIHRoaXMudG9TZXEoKS5mbGlwKCkubWFwKChmdW5jdGlvbihrLCB2KSB7XG4gICAgICByZXR1cm4gbWFwcGVyLmNhbGwoY29udGV4dCwgaywgdiwgJF9fMCk7XG4gICAgfSkpLmZsaXAoKSk7XG4gIH1cbn0sIHt9LCBJdGVyYWJsZSk7XG52YXIgS2V5ZWRJdGVyYWJsZVByb3RvdHlwZSA9IEtleWVkSXRlcmFibGUucHJvdG90eXBlO1xuS2V5ZWRJdGVyYWJsZVByb3RvdHlwZVtJU19LRVlFRF9TRU5USU5FTF0gPSB0cnVlO1xuS2V5ZWRJdGVyYWJsZVByb3RvdHlwZVtJVEVSQVRPUl9TWU1CT0xdID0gSXRlcmFibGVQcm90b3R5cGUuZW50cmllcztcbktleWVkSXRlcmFibGVQcm90b3R5cGUuX190b0pTID0gSXRlcmFibGVQcm90b3R5cGUudG9PYmplY3Q7XG5LZXllZEl0ZXJhYmxlUHJvdG90eXBlLl9fdG9TdHJpbmdNYXBwZXIgPSAoZnVuY3Rpb24odiwgaykge1xuICByZXR1cm4gayArICc6ICcgKyBxdW90ZVN0cmluZyh2KTtcbn0pO1xudmFyIEluZGV4ZWRJdGVyYWJsZSA9IGZ1bmN0aW9uIEluZGV4ZWRJdGVyYWJsZSh2YWx1ZSkge1xuICByZXR1cm4gaXNJbmRleGVkKHZhbHVlKSA/IHZhbHVlIDogSW5kZXhlZFNlcS5hcHBseSh1bmRlZmluZWQsIGFyZ3VtZW50cyk7XG59O1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoSW5kZXhlZEl0ZXJhYmxlLCB7XG4gIHRvS2V5ZWRTZXE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgVG9LZXllZFNlcXVlbmNlKHRoaXMsIGZhbHNlKTtcbiAgfSxcbiAgY29uY2F0OiBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciB2YWx1ZXMgPSBbXSxcbiAgICAgICAgJF9fMyA9IDA7ICRfXzMgPCBhcmd1bWVudHMubGVuZ3RoOyAkX18zKyspXG4gICAgICB2YWx1ZXNbJF9fM10gPSBhcmd1bWVudHNbJF9fM107XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIGNvbmNhdEZhY3RvcnkodGhpcywgdmFsdWVzLCBmYWxzZSkpO1xuICB9LFxuICBmaWx0ZXI6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHJldHVybiByZWlmeSh0aGlzLCBmaWx0ZXJGYWN0b3J5KHRoaXMsIHByZWRpY2F0ZSwgY29udGV4dCwgZmFsc2UpKTtcbiAgfSxcbiAgZmluZEluZGV4OiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICB2YXIga2V5ID0gdGhpcy50b0tleWVkU2VxKCkuZmluZEtleShwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIHJldHVybiBrZXkgPT09IHVuZGVmaW5lZCA/IC0xIDoga2V5O1xuICB9LFxuICBpbmRleE9mOiBmdW5jdGlvbihzZWFyY2hWYWx1ZSkge1xuICAgIHZhciBrZXkgPSB0aGlzLnRvS2V5ZWRTZXEoKS5rZXlPZihzZWFyY2hWYWx1ZSk7XG4gICAgcmV0dXJuIGtleSA9PT0gdW5kZWZpbmVkID8gLTEgOiBrZXk7XG4gIH0sXG4gIGxhc3RJbmRleE9mOiBmdW5jdGlvbihzZWFyY2hWYWx1ZSkge1xuICAgIHZhciBrZXkgPSB0aGlzLnRvS2V5ZWRTZXEoKS5sYXN0S2V5T2Yoc2VhcmNoVmFsdWUpO1xuICAgIHJldHVybiBrZXkgPT09IHVuZGVmaW5lZCA/IC0xIDoga2V5O1xuICB9LFxuICByZXZlcnNlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgcmV2ZXJzZUZhY3RvcnkodGhpcywgZmFsc2UpKTtcbiAgfSxcbiAgc3BsaWNlOiBmdW5jdGlvbihpbmRleCwgcmVtb3ZlTnVtKSB7XG4gICAgdmFyIG51bUFyZ3MgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIHJlbW92ZU51bSA9IE1hdGgubWF4KHJlbW92ZU51bSB8IDAsIDApO1xuICAgIGlmIChudW1BcmdzID09PSAwIHx8IChudW1BcmdzID09PSAyICYmICFyZW1vdmVOdW0pKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgaW5kZXggPSByZXNvbHZlQmVnaW4oaW5kZXgsIHRoaXMuc2l6ZSk7XG4gICAgdmFyIHNwbGljZWQgPSB0aGlzLnNsaWNlKDAsIGluZGV4KTtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgbnVtQXJncyA9PT0gMSA/IHNwbGljZWQgOiBzcGxpY2VkLmNvbmNhdChhcnJDb3B5KGFyZ3VtZW50cywgMiksIHRoaXMuc2xpY2UoaW5kZXggKyByZW1vdmVOdW0pKSk7XG4gIH0sXG4gIGZpbmRMYXN0SW5kZXg6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHZhciBrZXkgPSB0aGlzLnRvS2V5ZWRTZXEoKS5maW5kTGFzdEtleShwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIHJldHVybiBrZXkgPT09IHVuZGVmaW5lZCA/IC0xIDoga2V5O1xuICB9LFxuICBmaXJzdDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0KDApO1xuICB9LFxuICBmbGF0dGVuOiBmdW5jdGlvbihkZXB0aCkge1xuICAgIHJldHVybiByZWlmeSh0aGlzLCBmbGF0dGVuRmFjdG9yeSh0aGlzLCBkZXB0aCwgZmFsc2UpKTtcbiAgfSxcbiAgZ2V0OiBmdW5jdGlvbihpbmRleCwgbm90U2V0VmFsdWUpIHtcbiAgICBpbmRleCA9IHdyYXBJbmRleCh0aGlzLCBpbmRleCk7XG4gICAgcmV0dXJuIChpbmRleCA8IDAgfHwgKHRoaXMuc2l6ZSA9PT0gSW5maW5pdHkgfHwgKHRoaXMuc2l6ZSAhPT0gdW5kZWZpbmVkICYmIGluZGV4ID4gdGhpcy5zaXplKSkpID8gbm90U2V0VmFsdWUgOiB0aGlzLmZpbmQoKGZ1bmN0aW9uKF8sIGtleSkge1xuICAgICAgcmV0dXJuIGtleSA9PT0gaW5kZXg7XG4gICAgfSksIHVuZGVmaW5lZCwgbm90U2V0VmFsdWUpO1xuICB9LFxuICBoYXM6IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgaW5kZXggPSB3cmFwSW5kZXgodGhpcywgaW5kZXgpO1xuICAgIHJldHVybiBpbmRleCA+PSAwICYmICh0aGlzLnNpemUgIT09IHVuZGVmaW5lZCA/IHRoaXMuc2l6ZSA9PT0gSW5maW5pdHkgfHwgaW5kZXggPCB0aGlzLnNpemUgOiB0aGlzLmluZGV4T2YoaW5kZXgpICE9PSAtMSk7XG4gIH0sXG4gIGludGVycG9zZTogZnVuY3Rpb24oc2VwYXJhdG9yKSB7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIGludGVycG9zZUZhY3RvcnkodGhpcywgc2VwYXJhdG9yKSk7XG4gIH0sXG4gIGxhc3Q6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmdldCgtMSk7XG4gIH0sXG4gIHNraXA6IGZ1bmN0aW9uKGFtb3VudCkge1xuICAgIHZhciBpdGVyID0gdGhpcztcbiAgICB2YXIgc2tpcFNlcSA9IHNraXBGYWN0b3J5KGl0ZXIsIGFtb3VudCwgZmFsc2UpO1xuICAgIGlmIChpc1NlcShpdGVyKSAmJiBza2lwU2VxICE9PSBpdGVyKSB7XG4gICAgICBza2lwU2VxLmdldCA9IGZ1bmN0aW9uKGluZGV4LCBub3RTZXRWYWx1ZSkge1xuICAgICAgICBpbmRleCA9IHdyYXBJbmRleCh0aGlzLCBpbmRleCk7XG4gICAgICAgIHJldHVybiBpbmRleCA+PSAwID8gaXRlci5nZXQoaW5kZXggKyBhbW91bnQsIG5vdFNldFZhbHVlKSA6IG5vdFNldFZhbHVlO1xuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIHNraXBTZXEpO1xuICB9LFxuICBza2lwV2hpbGU6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHJldHVybiByZWlmeSh0aGlzLCBza2lwV2hpbGVGYWN0b3J5KHRoaXMsIHByZWRpY2F0ZSwgY29udGV4dCwgZmFsc2UpKTtcbiAgfSxcbiAgc29ydEJ5OiBmdW5jdGlvbihtYXBwZXIsIGNvbXBhcmF0b3IpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgY29tcGFyYXRvciA9IGNvbXBhcmF0b3IgfHwgZGVmYXVsdENvbXBhcmF0b3I7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIG5ldyBBcnJheVNlcSh0aGlzLmVudHJ5U2VxKCkudG9BcnJheSgpLnNvcnQoKGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgIHJldHVybiBjb21wYXJhdG9yKG1hcHBlcihhWzFdLCBhWzBdLCAkX18wKSwgbWFwcGVyKGJbMV0sIGJbMF0sICRfXzApKSB8fCBhWzBdIC0gYlswXTtcbiAgICB9KSkpLmZyb21FbnRyeVNlcSgpLnZhbHVlU2VxKCkpO1xuICB9LFxuICB0YWtlOiBmdW5jdGlvbihhbW91bnQpIHtcbiAgICB2YXIgaXRlciA9IHRoaXM7XG4gICAgdmFyIHRha2VTZXEgPSB0YWtlRmFjdG9yeShpdGVyLCBhbW91bnQpO1xuICAgIGlmIChpc1NlcShpdGVyKSAmJiB0YWtlU2VxICE9PSBpdGVyKSB7XG4gICAgICB0YWtlU2VxLmdldCA9IGZ1bmN0aW9uKGluZGV4LCBub3RTZXRWYWx1ZSkge1xuICAgICAgICBpbmRleCA9IHdyYXBJbmRleCh0aGlzLCBpbmRleCk7XG4gICAgICAgIHJldHVybiBpbmRleCA+PSAwICYmIGluZGV4IDwgYW1vdW50ID8gaXRlci5nZXQoaW5kZXgsIG5vdFNldFZhbHVlKSA6IG5vdFNldFZhbHVlO1xuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIHRha2VTZXEpO1xuICB9XG59LCB7fSwgSXRlcmFibGUpO1xuSW5kZXhlZEl0ZXJhYmxlLnByb3RvdHlwZVtJU19JTkRFWEVEX1NFTlRJTkVMXSA9IHRydWU7XG52YXIgU2V0SXRlcmFibGUgPSBmdW5jdGlvbiBTZXRJdGVyYWJsZSh2YWx1ZSkge1xuICByZXR1cm4gaXNJdGVyYWJsZSh2YWx1ZSkgJiYgIWlzQXNzb2NpYXRpdmUodmFsdWUpID8gdmFsdWUgOiBTZXRTZXEuYXBwbHkodW5kZWZpbmVkLCBhcmd1bWVudHMpO1xufTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFNldEl0ZXJhYmxlLCB7XG4gIGdldDogZnVuY3Rpb24odmFsdWUsIG5vdFNldFZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuaGFzKHZhbHVlKSA/IHZhbHVlIDogbm90U2V0VmFsdWU7XG4gIH0sXG4gIGNvbnRhaW5zOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLmhhcyh2YWx1ZSk7XG4gIH0sXG4gIGtleVNlcTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWVTZXEoKTtcbiAgfVxufSwge30sIEl0ZXJhYmxlKTtcblNldEl0ZXJhYmxlLnByb3RvdHlwZS5oYXMgPSBJdGVyYWJsZVByb3RvdHlwZS5jb250YWlucztcbmZ1bmN0aW9uIGlzSXRlcmFibGUobWF5YmVJdGVyYWJsZSkge1xuICByZXR1cm4gISEobWF5YmVJdGVyYWJsZSAmJiBtYXliZUl0ZXJhYmxlW0lTX0lURVJBQkxFX1NFTlRJTkVMXSk7XG59XG5mdW5jdGlvbiBpc0tleWVkKG1heWJlS2V5ZWQpIHtcbiAgcmV0dXJuICEhKG1heWJlS2V5ZWQgJiYgbWF5YmVLZXllZFtJU19LRVlFRF9TRU5USU5FTF0pO1xufVxuZnVuY3Rpb24gaXNJbmRleGVkKG1heWJlSW5kZXhlZCkge1xuICByZXR1cm4gISEobWF5YmVJbmRleGVkICYmIG1heWJlSW5kZXhlZFtJU19JTkRFWEVEX1NFTlRJTkVMXSk7XG59XG5mdW5jdGlvbiBpc0Fzc29jaWF0aXZlKG1heWJlQXNzb2NpYXRpdmUpIHtcbiAgcmV0dXJuIGlzS2V5ZWQobWF5YmVBc3NvY2lhdGl2ZSkgfHwgaXNJbmRleGVkKG1heWJlQXNzb2NpYXRpdmUpO1xufVxuSXRlcmFibGUuaXNJdGVyYWJsZSA9IGlzSXRlcmFibGU7XG5JdGVyYWJsZS5pc0tleWVkID0gaXNLZXllZDtcbkl0ZXJhYmxlLmlzSW5kZXhlZCA9IGlzSW5kZXhlZDtcbkl0ZXJhYmxlLmlzQXNzb2NpYXRpdmUgPSBpc0Fzc29jaWF0aXZlO1xuSXRlcmFibGUuS2V5ZWQgPSBLZXllZEl0ZXJhYmxlO1xuSXRlcmFibGUuSW5kZXhlZCA9IEluZGV4ZWRJdGVyYWJsZTtcbkl0ZXJhYmxlLlNldCA9IFNldEl0ZXJhYmxlO1xuSXRlcmFibGUuSXRlcmF0b3IgPSBJdGVyYXRvcjtcbmZ1bmN0aW9uIHZhbHVlTWFwcGVyKHYpIHtcbiAgcmV0dXJuIHY7XG59XG5mdW5jdGlvbiBrZXlNYXBwZXIodiwgaykge1xuICByZXR1cm4gaztcbn1cbmZ1bmN0aW9uIGVudHJ5TWFwcGVyKHYsIGspIHtcbiAgcmV0dXJuIFtrLCB2XTtcbn1cbmZ1bmN0aW9uIG5vdChwcmVkaWNhdGUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAhcHJlZGljYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG59XG5mdW5jdGlvbiBxdW90ZVN0cmluZyh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyA/IEpTT04uc3RyaW5naWZ5KHZhbHVlKSA6IHZhbHVlO1xufVxuZnVuY3Rpb24gZGVmYXVsdENvbXBhcmF0b3IoYSwgYikge1xuICByZXR1cm4gYSA+IGIgPyAxIDogYSA8IGIgPyAtMSA6IDA7XG59XG5mdW5jdGlvbiBtaXhpbihjdG9yLCBtZXRob2RzKSB7XG4gIHZhciBwcm90byA9IGN0b3IucHJvdG90eXBlO1xuICBPYmplY3Qua2V5cyhtZXRob2RzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIHByb3RvW2tleV0gPSBtZXRob2RzW2tleV07XG4gIH0pO1xuICByZXR1cm4gY3Rvcjtcbn1cbnZhciBTZXEgPSBmdW5jdGlvbiBTZXEodmFsdWUpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDAgPyBlbXB0eVNlcXVlbmNlKCkgOiAoaXNJdGVyYWJsZSh2YWx1ZSkgPyB2YWx1ZSA6IHNlcUZyb21WYWx1ZSh2YWx1ZSwgZmFsc2UpKS50b1NlcSgpO1xufTtcbnZhciAkU2VxID0gU2VxO1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoU2VxLCB7XG4gIHRvU2VxOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9fdG9TdHJpbmcoJ1NlcSB7JywgJ30nKTtcbiAgfSxcbiAgY2FjaGVSZXN1bHQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5fY2FjaGUgJiYgdGhpcy5fX2l0ZXJhdGVVbmNhY2hlZCkge1xuICAgICAgdGhpcy5fY2FjaGUgPSB0aGlzLmVudHJ5U2VxKCkudG9BcnJheSgpO1xuICAgICAgdGhpcy5zaXplID0gdGhpcy5fY2FjaGUubGVuZ3RoO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgX19pdGVyYXRlOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHJldHVybiBzZXFJdGVyYXRlKHRoaXMsIGZuLCByZXZlcnNlLCB0cnVlKTtcbiAgfSxcbiAgX19pdGVyYXRvcjogZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHJldHVybiBzZXFJdGVyYXRvcih0aGlzLCB0eXBlLCByZXZlcnNlLCB0cnVlKTtcbiAgfVxufSwge29mOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJFNlcShhcmd1bWVudHMpO1xuICB9fSwgSXRlcmFibGUpO1xudmFyIEtleWVkU2VxID0gZnVuY3Rpb24gS2V5ZWRTZXEodmFsdWUpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gZW1wdHlTZXF1ZW5jZSgpLnRvS2V5ZWRTZXEoKTtcbiAgfVxuICBpZiAoIWlzSXRlcmFibGUodmFsdWUpKSB7XG4gICAgdmFsdWUgPSBzZXFGcm9tVmFsdWUodmFsdWUsIGZhbHNlKTtcbiAgfVxuICByZXR1cm4gaXNLZXllZCh2YWx1ZSkgPyB2YWx1ZS50b1NlcSgpIDogdmFsdWUuZnJvbUVudHJ5U2VxKCk7XG59O1xudmFyICRLZXllZFNlcSA9IEtleWVkU2VxO1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoS2V5ZWRTZXEsIHtcbiAgdG9LZXllZFNlcTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHRvU2VxOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxufSwge29mOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJEtleWVkU2VxKGFyZ3VtZW50cyk7XG4gIH19LCBTZXEpO1xubWl4aW4oS2V5ZWRTZXEsIEtleWVkSXRlcmFibGUucHJvdG90eXBlKTtcbnZhciBJbmRleGVkU2VxID0gZnVuY3Rpb24gSW5kZXhlZFNlcSh2YWx1ZSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMCA/IGVtcHR5U2VxdWVuY2UoKSA6IChpc0l0ZXJhYmxlKHZhbHVlKSA/IHZhbHVlIDogc2VxRnJvbVZhbHVlKHZhbHVlLCBmYWxzZSkpLnRvSW5kZXhlZFNlcSgpO1xufTtcbnZhciAkSW5kZXhlZFNlcSA9IEluZGV4ZWRTZXE7XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShJbmRleGVkU2VxLCB7XG4gIHRvSW5kZXhlZFNlcTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fX3RvU3RyaW5nKCdTZXEgWycsICddJyk7XG4gIH0sXG4gIF9faXRlcmF0ZTogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICByZXR1cm4gc2VxSXRlcmF0ZSh0aGlzLCBmbiwgcmV2ZXJzZSwgZmFsc2UpO1xuICB9LFxuICBfX2l0ZXJhdG9yOiBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgcmV0dXJuIHNlcUl0ZXJhdG9yKHRoaXMsIHR5cGUsIHJldmVyc2UsIGZhbHNlKTtcbiAgfVxufSwge29mOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJEluZGV4ZWRTZXEoYXJndW1lbnRzKTtcbiAgfX0sIFNlcSk7XG5taXhpbihJbmRleGVkU2VxLCBJbmRleGVkSXRlcmFibGUucHJvdG90eXBlKTtcbnZhciBTZXRTZXEgPSBmdW5jdGlvbiBTZXRTZXEodmFsdWUpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDAgPyBlbXB0eVNlcXVlbmNlKCkudG9TZXRTZXEoKSA6IChpc0l0ZXJhYmxlKHZhbHVlKSA/IHZhbHVlIDogc2VxRnJvbVZhbHVlKHZhbHVlLCBmYWxzZSkpLnRvU2V0U2VxKCk7XG59O1xudmFyICRTZXRTZXEgPSBTZXRTZXE7XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShTZXRTZXEsIHt0b1NldFNlcTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH19LCB7b2Y6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAkU2V0U2VxKGFyZ3VtZW50cyk7XG4gIH19LCBTZXEpO1xubWl4aW4oU2V0U2VxLCBTZXRJdGVyYWJsZS5wcm90b3R5cGUpO1xuU2VxLmlzU2VxID0gaXNTZXE7XG5TZXEuS2V5ZWQgPSBLZXllZFNlcTtcblNlcS5TZXQgPSBTZXRTZXE7XG5TZXEuSW5kZXhlZCA9IEluZGV4ZWRTZXE7XG52YXIgSVNfU0VRX1NFTlRJTkVMID0gJ0BAX19JTU1VVEFCTEVfU0VRX19AQCc7XG5TZXEucHJvdG90eXBlW0lTX1NFUV9TRU5USU5FTF0gPSB0cnVlO1xudmFyIEFycmF5U2VxID0gZnVuY3Rpb24gQXJyYXlTZXEoYXJyYXkpIHtcbiAgdGhpcy5fYXJyYXkgPSBhcnJheTtcbiAgdGhpcy5zaXplID0gYXJyYXkubGVuZ3RoO1xufTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKEFycmF5U2VxLCB7XG4gIGdldDogZnVuY3Rpb24oaW5kZXgsIG5vdFNldFZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuaGFzKGluZGV4KSA/IHRoaXMuX2FycmF5W3dyYXBJbmRleCh0aGlzLCBpbmRleCldIDogbm90U2V0VmFsdWU7XG4gIH0sXG4gIF9faXRlcmF0ZTogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgYXJyYXkgPSB0aGlzLl9hcnJheTtcbiAgICB2YXIgbWF4SW5kZXggPSBhcnJheS5sZW5ndGggLSAxO1xuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPD0gbWF4SW5kZXg7IGlpKyspIHtcbiAgICAgIGlmIChmbihhcnJheVtyZXZlcnNlID8gbWF4SW5kZXggLSBpaSA6IGlpXSwgaWksIHRoaXMpID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gaWkgKyAxO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaWk7XG4gIH0sXG4gIF9faXRlcmF0b3I6IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICB2YXIgYXJyYXkgPSB0aGlzLl9hcnJheTtcbiAgICB2YXIgbWF4SW5kZXggPSBhcnJheS5sZW5ndGggLSAxO1xuICAgIHZhciBpaSA9IDA7XG4gICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gaWkgPiBtYXhJbmRleCA/IGl0ZXJhdG9yRG9uZSgpIDogaXRlcmF0b3JWYWx1ZSh0eXBlLCBpaSwgYXJyYXlbcmV2ZXJzZSA/IG1heEluZGV4IC0gaWkrKyA6IGlpKytdKTtcbiAgICB9KSk7XG4gIH1cbn0sIHt9LCBJbmRleGVkU2VxKTtcbnZhciBPYmplY3RTZXEgPSBmdW5jdGlvbiBPYmplY3RTZXEob2JqZWN0KSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqZWN0KTtcbiAgdGhpcy5fb2JqZWN0ID0gb2JqZWN0O1xuICB0aGlzLl9rZXlzID0ga2V5cztcbiAgdGhpcy5zaXplID0ga2V5cy5sZW5ndGg7XG59O1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoT2JqZWN0U2VxLCB7XG4gIGdldDogZnVuY3Rpb24oa2V5LCBub3RTZXRWYWx1ZSkge1xuICAgIGlmIChub3RTZXRWYWx1ZSAhPT0gdW5kZWZpbmVkICYmICF0aGlzLmhhcyhrZXkpKSB7XG4gICAgICByZXR1cm4gbm90U2V0VmFsdWU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9vYmplY3Rba2V5XTtcbiAgfSxcbiAgaGFzOiBmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5fb2JqZWN0Lmhhc093blByb3BlcnR5KGtleSk7XG4gIH0sXG4gIF9faXRlcmF0ZTogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgb2JqZWN0ID0gdGhpcy5fb2JqZWN0O1xuICAgIHZhciBrZXlzID0gdGhpcy5fa2V5cztcbiAgICB2YXIgbWF4SW5kZXggPSBrZXlzLmxlbmd0aCAtIDE7XG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8PSBtYXhJbmRleDsgaWkrKykge1xuICAgICAgdmFyIGtleSA9IGtleXNbcmV2ZXJzZSA/IG1heEluZGV4IC0gaWkgOiBpaV07XG4gICAgICBpZiAoZm4ob2JqZWN0W2tleV0sIGtleSwgdGhpcykgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBpaSArIDE7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpaTtcbiAgfSxcbiAgX19pdGVyYXRvcjogZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHZhciBvYmplY3QgPSB0aGlzLl9vYmplY3Q7XG4gICAgdmFyIGtleXMgPSB0aGlzLl9rZXlzO1xuICAgIHZhciBtYXhJbmRleCA9IGtleXMubGVuZ3RoIC0gMTtcbiAgICB2YXIgaWkgPSAwO1xuICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGtleSA9IGtleXNbcmV2ZXJzZSA/IG1heEluZGV4IC0gaWkgOiBpaV07XG4gICAgICByZXR1cm4gaWkrKyA+IG1heEluZGV4ID8gaXRlcmF0b3JEb25lKCkgOiBpdGVyYXRvclZhbHVlKHR5cGUsIGtleSwgb2JqZWN0W2tleV0pO1xuICAgIH0pKTtcbiAgfVxufSwge30sIEtleWVkU2VxKTtcbnZhciBJdGVyYWJsZVNlcSA9IGZ1bmN0aW9uIEl0ZXJhYmxlU2VxKGl0ZXJhYmxlKSB7XG4gIHRoaXMuX2l0ZXJhYmxlID0gaXRlcmFibGU7XG4gIHRoaXMuc2l6ZSA9IGl0ZXJhYmxlLmxlbmd0aCB8fCBpdGVyYWJsZS5zaXplO1xufTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKEl0ZXJhYmxlU2VxLCB7XG4gIF9faXRlcmF0ZVVuY2FjaGVkOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZShmbiwgcmV2ZXJzZSk7XG4gICAgfVxuICAgIHZhciBpdGVyYWJsZSA9IHRoaXMuX2l0ZXJhYmxlO1xuICAgIHZhciBpdGVyYXRvciA9IGdldEl0ZXJhdG9yKGl0ZXJhYmxlKTtcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgaWYgKGlzSXRlcmF0b3IoaXRlcmF0b3IpKSB7XG4gICAgICB2YXIgc3RlcDtcbiAgICAgIHdoaWxlICghKHN0ZXAgPSBpdGVyYXRvci5uZXh0KCkpLmRvbmUpIHtcbiAgICAgICAgaWYgKGZuKHN0ZXAudmFsdWUsIGl0ZXJhdGlvbnMrKywgdGhpcykgPT09IGZhbHNlKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGl0ZXJhdGlvbnM7XG4gIH0sXG4gIF9faXRlcmF0b3JVbmNhY2hlZDogZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0b3IodHlwZSwgcmV2ZXJzZSk7XG4gICAgfVxuICAgIHZhciBpdGVyYWJsZSA9IHRoaXMuX2l0ZXJhYmxlO1xuICAgIHZhciBpdGVyYXRvciA9IGdldEl0ZXJhdG9yKGl0ZXJhYmxlKTtcbiAgICBpZiAoIWlzSXRlcmF0b3IoaXRlcmF0b3IpKSB7XG4gICAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKGl0ZXJhdG9yRG9uZSk7XG4gICAgfVxuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzdGVwID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgcmV0dXJuIHN0ZXAuZG9uZSA/IHN0ZXAgOiBpdGVyYXRvclZhbHVlKHR5cGUsIGl0ZXJhdGlvbnMrKywgc3RlcC52YWx1ZSk7XG4gICAgfSkpO1xuICB9XG59LCB7fSwgSW5kZXhlZFNlcSk7XG52YXIgSXRlcmF0b3JTZXEgPSBmdW5jdGlvbiBJdGVyYXRvclNlcShpdGVyYXRvcikge1xuICB0aGlzLl9pdGVyYXRvciA9IGl0ZXJhdG9yO1xuICB0aGlzLl9pdGVyYXRvckNhY2hlID0gW107XG59O1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoSXRlcmF0b3JTZXEsIHtcbiAgX19pdGVyYXRlVW5jYWNoZWQ6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgaWYgKHJldmVyc2UpIHtcbiAgICAgIHJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRlKGZuLCByZXZlcnNlKTtcbiAgICB9XG4gICAgdmFyIGl0ZXJhdG9yID0gdGhpcy5faXRlcmF0b3I7XG4gICAgdmFyIGNhY2hlID0gdGhpcy5faXRlcmF0b3JDYWNoZTtcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgd2hpbGUgKGl0ZXJhdGlvbnMgPCBjYWNoZS5sZW5ndGgpIHtcbiAgICAgIGlmIChmbihjYWNoZVtpdGVyYXRpb25zXSwgaXRlcmF0aW9ucysrLCB0aGlzKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdGlvbnM7XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBzdGVwO1xuICAgIHdoaWxlICghKHN0ZXAgPSBpdGVyYXRvci5uZXh0KCkpLmRvbmUpIHtcbiAgICAgIHZhciB2YWwgPSBzdGVwLnZhbHVlO1xuICAgICAgY2FjaGVbaXRlcmF0aW9uc10gPSB2YWw7XG4gICAgICBpZiAoZm4odmFsLCBpdGVyYXRpb25zKyssIHRoaXMpID09PSBmYWxzZSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGl0ZXJhdGlvbnM7XG4gIH0sXG4gIF9faXRlcmF0b3JVbmNhY2hlZDogZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0b3IodHlwZSwgcmV2ZXJzZSk7XG4gICAgfVxuICAgIHZhciBpdGVyYXRvciA9IHRoaXMuX2l0ZXJhdG9yO1xuICAgIHZhciBjYWNoZSA9IHRoaXMuX2l0ZXJhdG9yQ2FjaGU7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKGl0ZXJhdGlvbnMgPj0gY2FjaGUubGVuZ3RoKSB7XG4gICAgICAgIHZhciBzdGVwID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICBpZiAoc3RlcC5kb25lKSB7XG4gICAgICAgICAgcmV0dXJuIHN0ZXA7XG4gICAgICAgIH1cbiAgICAgICAgY2FjaGVbaXRlcmF0aW9uc10gPSBzdGVwLnZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGl0ZXJhdG9yVmFsdWUodHlwZSwgaXRlcmF0aW9ucywgY2FjaGVbaXRlcmF0aW9ucysrXSk7XG4gICAgfSkpO1xuICB9XG59LCB7fSwgSW5kZXhlZFNlcSk7XG5mdW5jdGlvbiBpc1NlcShtYXliZVNlcSkge1xuICByZXR1cm4gISEobWF5YmVTZXEgJiYgbWF5YmVTZXFbSVNfU0VRX1NFTlRJTkVMXSk7XG59XG52YXIgRU1QVFlfU0VRO1xuZnVuY3Rpb24gZW1wdHlTZXF1ZW5jZSgpIHtcbiAgcmV0dXJuIEVNUFRZX1NFUSB8fCAoRU1QVFlfU0VRID0gbmV3IEFycmF5U2VxKFtdKSk7XG59XG5mdW5jdGlvbiBtYXliZVNlcUZyb21WYWx1ZSh2YWx1ZSwgbWF5YmVTaW5nbGV0b24pIHtcbiAgcmV0dXJuIChtYXliZVNpbmdsZXRvbiAmJiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gdW5kZWZpbmVkIDogaXNBcnJheUxpa2UodmFsdWUpID8gbmV3IEFycmF5U2VxKHZhbHVlKSA6IGlzSXRlcmF0b3IodmFsdWUpID8gbmV3IEl0ZXJhdG9yU2VxKHZhbHVlKSA6IGhhc0l0ZXJhdG9yKHZhbHVlKSA/IG5ldyBJdGVyYWJsZVNlcSh2YWx1ZSkgOiAobWF5YmVTaW5nbGV0b24gPyBpc1BsYWluT2JqKHZhbHVlKSA6IHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpID8gbmV3IE9iamVjdFNlcSh2YWx1ZSkgOiB1bmRlZmluZWQpO1xufVxuZnVuY3Rpb24gc2VxRnJvbVZhbHVlKHZhbHVlLCBtYXliZVNpbmdsZXRvbikge1xuICB2YXIgc2VxID0gbWF5YmVTZXFGcm9tVmFsdWUodmFsdWUsIG1heWJlU2luZ2xldG9uKTtcbiAgaWYgKHNlcSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKG1heWJlU2luZ2xldG9uKSB7XG4gICAgICBzZXEgPSBuZXcgQXJyYXlTZXEoW3ZhbHVlXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGl0ZXJhYmxlOiAnICsgdmFsdWUpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc2VxO1xufVxuZnVuY3Rpb24gaXNBcnJheUxpa2UodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZS5sZW5ndGggPT09ICdudW1iZXInO1xufVxuZnVuY3Rpb24gc2VxSXRlcmF0ZShzZXEsIGZuLCByZXZlcnNlLCB1c2VLZXlzKSB7XG4gIGFzc2VydE5vdEluZmluaXRlKHNlcS5zaXplKTtcbiAgdmFyIGNhY2hlID0gc2VxLl9jYWNoZTtcbiAgaWYgKGNhY2hlKSB7XG4gICAgdmFyIG1heEluZGV4ID0gY2FjaGUubGVuZ3RoIC0gMTtcbiAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDw9IG1heEluZGV4OyBpaSsrKSB7XG4gICAgICB2YXIgZW50cnkgPSBjYWNoZVtyZXZlcnNlID8gbWF4SW5kZXggLSBpaSA6IGlpXTtcbiAgICAgIGlmIChmbihlbnRyeVsxXSwgdXNlS2V5cyA/IGVudHJ5WzBdIDogaWksIHNlcSkgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBpaSArIDE7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpaTtcbiAgfVxuICByZXR1cm4gc2VxLl9faXRlcmF0ZVVuY2FjaGVkKGZuLCByZXZlcnNlKTtcbn1cbmZ1bmN0aW9uIHNlcUl0ZXJhdG9yKHNlcSwgdHlwZSwgcmV2ZXJzZSwgdXNlS2V5cykge1xuICB2YXIgY2FjaGUgPSBzZXEuX2NhY2hlO1xuICBpZiAoY2FjaGUpIHtcbiAgICB2YXIgbWF4SW5kZXggPSBjYWNoZS5sZW5ndGggLSAxO1xuICAgIHZhciBpaSA9IDA7XG4gICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZW50cnkgPSBjYWNoZVtyZXZlcnNlID8gbWF4SW5kZXggLSBpaSA6IGlpXTtcbiAgICAgIHJldHVybiBpaSsrID4gbWF4SW5kZXggPyBpdGVyYXRvckRvbmUoKSA6IGl0ZXJhdG9yVmFsdWUodHlwZSwgdXNlS2V5cyA/IGVudHJ5WzBdIDogaWkgLSAxLCBlbnRyeVsxXSk7XG4gICAgfSkpO1xuICB9XG4gIHJldHVybiBzZXEuX19pdGVyYXRvclVuY2FjaGVkKHR5cGUsIHJldmVyc2UpO1xufVxuZnVuY3Rpb24gZnJvbUpTKGpzb24sIGNvbnZlcnRlcikge1xuICBpZiAoY29udmVydGVyKSB7XG4gICAgcmV0dXJuIF9mcm9tSlNXaXRoKGNvbnZlcnRlciwganNvbiwgJycsIHsnJzoganNvbn0pO1xuICB9XG4gIHJldHVybiBfZnJvbUpTRGVmYXVsdChqc29uKTtcbn1cbmZ1bmN0aW9uIF9mcm9tSlNXaXRoKGNvbnZlcnRlciwganNvbiwga2V5LCBwYXJlbnRKU09OKSB7XG4gIGlmIChBcnJheS5pc0FycmF5KGpzb24pIHx8IGlzUGxhaW5PYmooanNvbikpIHtcbiAgICByZXR1cm4gY29udmVydGVyLmNhbGwocGFyZW50SlNPTiwga2V5LCBJdGVyYWJsZShqc29uKS5tYXAoKGZ1bmN0aW9uKHYsIGspIHtcbiAgICAgIHJldHVybiBfZnJvbUpTV2l0aChjb252ZXJ0ZXIsIHYsIGssIGpzb24pO1xuICAgIH0pKSk7XG4gIH1cbiAgcmV0dXJuIGpzb247XG59XG5mdW5jdGlvbiBfZnJvbUpTRGVmYXVsdChqc29uKSB7XG4gIGlmIChqc29uICYmIHR5cGVvZiBqc29uID09PSAnb2JqZWN0Jykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KGpzb24pKSB7XG4gICAgICByZXR1cm4gSXRlcmFibGUoanNvbikubWFwKF9mcm9tSlNEZWZhdWx0KS50b0xpc3QoKTtcbiAgICB9XG4gICAgaWYgKGpzb24uY29uc3RydWN0b3IgPT09IE9iamVjdCkge1xuICAgICAgcmV0dXJuIEl0ZXJhYmxlKGpzb24pLm1hcChfZnJvbUpTRGVmYXVsdCkudG9NYXAoKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGpzb247XG59XG52YXIgQ29sbGVjdGlvbiA9IGZ1bmN0aW9uIENvbGxlY3Rpb24oKSB7XG4gIHRocm93IFR5cGVFcnJvcignQWJzdHJhY3QnKTtcbn07XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShDb2xsZWN0aW9uLCB7fSwge30sIEl0ZXJhYmxlKTtcbnZhciBLZXllZENvbGxlY3Rpb24gPSBmdW5jdGlvbiBLZXllZENvbGxlY3Rpb24oKSB7XG4gICR0cmFjZXVyUnVudGltZS5kZWZhdWx0U3VwZXJDYWxsKHRoaXMsICRLZXllZENvbGxlY3Rpb24ucHJvdG90eXBlLCBhcmd1bWVudHMpO1xufTtcbnZhciAkS2V5ZWRDb2xsZWN0aW9uID0gS2V5ZWRDb2xsZWN0aW9uO1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoS2V5ZWRDb2xsZWN0aW9uLCB7fSwge30sIENvbGxlY3Rpb24pO1xubWl4aW4oS2V5ZWRDb2xsZWN0aW9uLCBLZXllZEl0ZXJhYmxlLnByb3RvdHlwZSk7XG52YXIgSW5kZXhlZENvbGxlY3Rpb24gPSBmdW5jdGlvbiBJbmRleGVkQ29sbGVjdGlvbigpIHtcbiAgJHRyYWNldXJSdW50aW1lLmRlZmF1bHRTdXBlckNhbGwodGhpcywgJEluZGV4ZWRDb2xsZWN0aW9uLnByb3RvdHlwZSwgYXJndW1lbnRzKTtcbn07XG52YXIgJEluZGV4ZWRDb2xsZWN0aW9uID0gSW5kZXhlZENvbGxlY3Rpb247XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShJbmRleGVkQ29sbGVjdGlvbiwge30sIHt9LCBDb2xsZWN0aW9uKTtcbm1peGluKEluZGV4ZWRDb2xsZWN0aW9uLCBJbmRleGVkSXRlcmFibGUucHJvdG90eXBlKTtcbnZhciBTZXRDb2xsZWN0aW9uID0gZnVuY3Rpb24gU2V0Q29sbGVjdGlvbigpIHtcbiAgJHRyYWNldXJSdW50aW1lLmRlZmF1bHRTdXBlckNhbGwodGhpcywgJFNldENvbGxlY3Rpb24ucHJvdG90eXBlLCBhcmd1bWVudHMpO1xufTtcbnZhciAkU2V0Q29sbGVjdGlvbiA9IFNldENvbGxlY3Rpb247XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShTZXRDb2xsZWN0aW9uLCB7fSwge30sIENvbGxlY3Rpb24pO1xubWl4aW4oU2V0Q29sbGVjdGlvbiwgU2V0SXRlcmFibGUucHJvdG90eXBlKTtcbkNvbGxlY3Rpb24uS2V5ZWQgPSBLZXllZENvbGxlY3Rpb247XG5Db2xsZWN0aW9uLkluZGV4ZWQgPSBJbmRleGVkQ29sbGVjdGlvbjtcbkNvbGxlY3Rpb24uU2V0ID0gU2V0Q29sbGVjdGlvbjtcbnZhciBNYXAgPSBmdW5jdGlvbiBNYXAodmFsdWUpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDAgPyBlbXB0eU1hcCgpIDogdmFsdWUgJiYgdmFsdWUuY29uc3RydWN0b3IgPT09ICRNYXAgPyB2YWx1ZSA6IGVtcHR5TWFwKCkubWVyZ2UoS2V5ZWRJdGVyYWJsZSh2YWx1ZSkpO1xufTtcbnZhciAkTWFwID0gTWFwO1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoTWFwLCB7XG4gIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fX3RvU3RyaW5nKCdNYXAgeycsICd9Jyk7XG4gIH0sXG4gIGdldDogZnVuY3Rpb24oaywgbm90U2V0VmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5fcm9vdCA/IHRoaXMuX3Jvb3QuZ2V0KDAsIGhhc2goayksIGssIG5vdFNldFZhbHVlKSA6IG5vdFNldFZhbHVlO1xuICB9LFxuICBzZXQ6IGZ1bmN0aW9uKGssIHYpIHtcbiAgICByZXR1cm4gdXBkYXRlTWFwKHRoaXMsIGssIHYpO1xuICB9LFxuICBzZXRJbjogZnVuY3Rpb24oa2V5UGF0aCwgdikge1xuICAgIGludmFyaWFudChrZXlQYXRoLmxlbmd0aCA+IDAsICdSZXF1aXJlcyBub24tZW1wdHkga2V5IHBhdGguJyk7XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlSW4oa2V5UGF0aCwgKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHY7XG4gICAgfSkpO1xuICB9LFxuICByZW1vdmU6IGZ1bmN0aW9uKGspIHtcbiAgICByZXR1cm4gdXBkYXRlTWFwKHRoaXMsIGssIE5PVF9TRVQpO1xuICB9LFxuICByZW1vdmVJbjogZnVuY3Rpb24oa2V5UGF0aCkge1xuICAgIGludmFyaWFudChrZXlQYXRoLmxlbmd0aCA+IDAsICdSZXF1aXJlcyBub24tZW1wdHkga2V5IHBhdGguJyk7XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlSW4oa2V5UGF0aCwgKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIE5PVF9TRVQ7XG4gICAgfSkpO1xuICB9LFxuICB1cGRhdGU6IGZ1bmN0aW9uKGssIG5vdFNldFZhbHVlLCB1cGRhdGVyKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDEgPyBrKHRoaXMpIDogdGhpcy51cGRhdGVJbihba10sIG5vdFNldFZhbHVlLCB1cGRhdGVyKTtcbiAgfSxcbiAgdXBkYXRlSW46IGZ1bmN0aW9uKGtleVBhdGgsIG5vdFNldFZhbHVlLCB1cGRhdGVyKSB7XG4gICAgaWYgKCF1cGRhdGVyKSB7XG4gICAgICB1cGRhdGVyID0gbm90U2V0VmFsdWU7XG4gICAgICBub3RTZXRWYWx1ZSA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIGtleVBhdGgubGVuZ3RoID09PSAwID8gdXBkYXRlcih0aGlzKSA6IHVwZGF0ZUluRGVlcE1hcCh0aGlzLCBrZXlQYXRoLCBub3RTZXRWYWx1ZSwgdXBkYXRlciwgMCk7XG4gIH0sXG4gIGNsZWFyOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5zaXplID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgaWYgKHRoaXMuX19vd25lcklEKSB7XG4gICAgICB0aGlzLnNpemUgPSAwO1xuICAgICAgdGhpcy5fcm9vdCA9IG51bGw7XG4gICAgICB0aGlzLl9faGFzaCA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuX19hbHRlcmVkID0gdHJ1ZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gZW1wdHlNYXAoKTtcbiAgfSxcbiAgbWVyZ2U6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBtZXJnZUludG9NYXBXaXRoKHRoaXMsIHVuZGVmaW5lZCwgYXJndW1lbnRzKTtcbiAgfSxcbiAgbWVyZ2VXaXRoOiBmdW5jdGlvbihtZXJnZXIpIHtcbiAgICBmb3IgKHZhciBpdGVycyA9IFtdLFxuICAgICAgICAkX180ID0gMTsgJF9fNCA8IGFyZ3VtZW50cy5sZW5ndGg7ICRfXzQrKylcbiAgICAgIGl0ZXJzWyRfXzQgLSAxXSA9IGFyZ3VtZW50c1skX180XTtcbiAgICByZXR1cm4gbWVyZ2VJbnRvTWFwV2l0aCh0aGlzLCBtZXJnZXIsIGl0ZXJzKTtcbiAgfSxcbiAgbWVyZ2VEZWVwOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbWVyZ2VJbnRvTWFwV2l0aCh0aGlzLCBkZWVwTWVyZ2VyKHVuZGVmaW5lZCksIGFyZ3VtZW50cyk7XG4gIH0sXG4gIG1lcmdlRGVlcFdpdGg6IGZ1bmN0aW9uKG1lcmdlcikge1xuICAgIGZvciAodmFyIGl0ZXJzID0gW10sXG4gICAgICAgICRfXzUgPSAxOyAkX181IDwgYXJndW1lbnRzLmxlbmd0aDsgJF9fNSsrKVxuICAgICAgaXRlcnNbJF9fNSAtIDFdID0gYXJndW1lbnRzWyRfXzVdO1xuICAgIHJldHVybiBtZXJnZUludG9NYXBXaXRoKHRoaXMsIGRlZXBNZXJnZXIobWVyZ2VyKSwgaXRlcnMpO1xuICB9LFxuICB3aXRoTXV0YXRpb25zOiBmdW5jdGlvbihmbikge1xuICAgIHZhciBtdXRhYmxlID0gdGhpcy5hc011dGFibGUoKTtcbiAgICBmbihtdXRhYmxlKTtcbiAgICByZXR1cm4gbXV0YWJsZS53YXNBbHRlcmVkKCkgPyBtdXRhYmxlLl9fZW5zdXJlT3duZXIodGhpcy5fX293bmVySUQpIDogdGhpcztcbiAgfSxcbiAgYXNNdXRhYmxlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fX293bmVySUQgPyB0aGlzIDogdGhpcy5fX2Vuc3VyZU93bmVyKG5ldyBPd25lcklEKCkpO1xuICB9LFxuICBhc0ltbXV0YWJsZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX19lbnN1cmVPd25lcigpO1xuICB9LFxuICB3YXNBbHRlcmVkOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fX2FsdGVyZWQ7XG4gIH0sXG4gIF9faXRlcmF0b3I6IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICByZXR1cm4gbmV3IE1hcEl0ZXJhdG9yKHRoaXMsIHR5cGUsIHJldmVyc2UpO1xuICB9LFxuICBfX2l0ZXJhdGU6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICB0aGlzLl9yb290ICYmIHRoaXMuX3Jvb3QuaXRlcmF0ZSgoZnVuY3Rpb24oZW50cnkpIHtcbiAgICAgIGl0ZXJhdGlvbnMrKztcbiAgICAgIHJldHVybiBmbihlbnRyeVsxXSwgZW50cnlbMF0sICRfXzApO1xuICAgIH0pLCByZXZlcnNlKTtcbiAgICByZXR1cm4gaXRlcmF0aW9ucztcbiAgfSxcbiAgX19lbnN1cmVPd25lcjogZnVuY3Rpb24ob3duZXJJRCkge1xuICAgIGlmIChvd25lcklEID09PSB0aGlzLl9fb3duZXJJRCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGlmICghb3duZXJJRCkge1xuICAgICAgdGhpcy5fX293bmVySUQgPSBvd25lcklEO1xuICAgICAgdGhpcy5fX2FsdGVyZWQgPSBmYWxzZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gbWFrZU1hcCh0aGlzLnNpemUsIHRoaXMuX3Jvb3QsIG93bmVySUQsIHRoaXMuX19oYXNoKTtcbiAgfVxufSwge30sIEtleWVkQ29sbGVjdGlvbik7XG5mdW5jdGlvbiBpc01hcChtYXliZU1hcCkge1xuICByZXR1cm4gISEobWF5YmVNYXAgJiYgbWF5YmVNYXBbSVNfTUFQX1NFTlRJTkVMXSk7XG59XG5NYXAuaXNNYXAgPSBpc01hcDtcbnZhciBJU19NQVBfU0VOVElORUwgPSAnQEBfX0lNTVVUQUJMRV9NQVBfX0BAJztcbnZhciBNYXBQcm90b3R5cGUgPSBNYXAucHJvdG90eXBlO1xuTWFwUHJvdG90eXBlW0lTX01BUF9TRU5USU5FTF0gPSB0cnVlO1xuTWFwUHJvdG90eXBlW0RFTEVURV0gPSBNYXBQcm90b3R5cGUucmVtb3ZlO1xudmFyIEJpdG1hcEluZGV4ZWROb2RlID0gZnVuY3Rpb24gQml0bWFwSW5kZXhlZE5vZGUob3duZXJJRCwgYml0bWFwLCBub2Rlcykge1xuICB0aGlzLm93bmVySUQgPSBvd25lcklEO1xuICB0aGlzLmJpdG1hcCA9IGJpdG1hcDtcbiAgdGhpcy5ub2RlcyA9IG5vZGVzO1xufTtcbnZhciAkQml0bWFwSW5kZXhlZE5vZGUgPSBCaXRtYXBJbmRleGVkTm9kZTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKEJpdG1hcEluZGV4ZWROb2RlLCB7XG4gIGdldDogZnVuY3Rpb24oc2hpZnQsIGhhc2gsIGtleSwgbm90U2V0VmFsdWUpIHtcbiAgICB2YXIgYml0ID0gKDEgPDwgKChzaGlmdCA9PT0gMCA/IGhhc2ggOiBoYXNoID4+PiBzaGlmdCkgJiBNQVNLKSk7XG4gICAgdmFyIGJpdG1hcCA9IHRoaXMuYml0bWFwO1xuICAgIHJldHVybiAoYml0bWFwICYgYml0KSA9PT0gMCA/IG5vdFNldFZhbHVlIDogdGhpcy5ub2Rlc1twb3BDb3VudChiaXRtYXAgJiAoYml0IC0gMSkpXS5nZXQoc2hpZnQgKyBTSElGVCwgaGFzaCwga2V5LCBub3RTZXRWYWx1ZSk7XG4gIH0sXG4gIHVwZGF0ZTogZnVuY3Rpb24ob3duZXJJRCwgc2hpZnQsIGhhc2gsIGtleSwgdmFsdWUsIGRpZENoYW5nZVNpemUsIGRpZEFsdGVyKSB7XG4gICAgdmFyIGhhc2hGcmFnID0gKHNoaWZ0ID09PSAwID8gaGFzaCA6IGhhc2ggPj4+IHNoaWZ0KSAmIE1BU0s7XG4gICAgdmFyIGJpdCA9IDEgPDwgaGFzaEZyYWc7XG4gICAgdmFyIGJpdG1hcCA9IHRoaXMuYml0bWFwO1xuICAgIHZhciBleGlzdHMgPSAoYml0bWFwICYgYml0KSAhPT0gMDtcbiAgICBpZiAoIWV4aXN0cyAmJiB2YWx1ZSA9PT0gTk9UX1NFVCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciBpZHggPSBwb3BDb3VudChiaXRtYXAgJiAoYml0IC0gMSkpO1xuICAgIHZhciBub2RlcyA9IHRoaXMubm9kZXM7XG4gICAgdmFyIG5vZGUgPSBleGlzdHMgPyBub2Rlc1tpZHhdIDogdW5kZWZpbmVkO1xuICAgIHZhciBuZXdOb2RlID0gdXBkYXRlTm9kZShub2RlLCBvd25lcklELCBzaGlmdCArIFNISUZULCBoYXNoLCBrZXksIHZhbHVlLCBkaWRDaGFuZ2VTaXplLCBkaWRBbHRlcik7XG4gICAgaWYgKG5ld05vZGUgPT09IG5vZGUpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBpZiAoIWV4aXN0cyAmJiBuZXdOb2RlICYmIG5vZGVzLmxlbmd0aCA+PSBNQVhfQklUTUFQX1NJWkUpIHtcbiAgICAgIHJldHVybiBleHBhbmROb2Rlcyhvd25lcklELCBub2RlcywgYml0bWFwLCBoYXNoRnJhZywgbmV3Tm9kZSk7XG4gICAgfVxuICAgIGlmIChleGlzdHMgJiYgIW5ld05vZGUgJiYgbm9kZXMubGVuZ3RoID09PSAyICYmIGlzTGVhZk5vZGUobm9kZXNbaWR4IF4gMV0pKSB7XG4gICAgICByZXR1cm4gbm9kZXNbaWR4IF4gMV07XG4gICAgfVxuICAgIGlmIChleGlzdHMgJiYgbmV3Tm9kZSAmJiBub2Rlcy5sZW5ndGggPT09IDEgJiYgaXNMZWFmTm9kZShuZXdOb2RlKSkge1xuICAgICAgcmV0dXJuIG5ld05vZGU7XG4gICAgfVxuICAgIHZhciBpc0VkaXRhYmxlID0gb3duZXJJRCAmJiBvd25lcklEID09PSB0aGlzLm93bmVySUQ7XG4gICAgdmFyIG5ld0JpdG1hcCA9IGV4aXN0cyA/IG5ld05vZGUgPyBiaXRtYXAgOiBiaXRtYXAgXiBiaXQgOiBiaXRtYXAgfCBiaXQ7XG4gICAgdmFyIG5ld05vZGVzID0gZXhpc3RzID8gbmV3Tm9kZSA/IHNldEluKG5vZGVzLCBpZHgsIG5ld05vZGUsIGlzRWRpdGFibGUpIDogc3BsaWNlT3V0KG5vZGVzLCBpZHgsIGlzRWRpdGFibGUpIDogc3BsaWNlSW4obm9kZXMsIGlkeCwgbmV3Tm9kZSwgaXNFZGl0YWJsZSk7XG4gICAgaWYgKGlzRWRpdGFibGUpIHtcbiAgICAgIHRoaXMuYml0bWFwID0gbmV3Qml0bWFwO1xuICAgICAgdGhpcy5ub2RlcyA9IG5ld05vZGVzO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBuZXcgJEJpdG1hcEluZGV4ZWROb2RlKG93bmVySUQsIG5ld0JpdG1hcCwgbmV3Tm9kZXMpO1xuICB9LFxuICBpdGVyYXRlOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciBub2RlcyA9IHRoaXMubm9kZXM7XG4gICAgZm9yICh2YXIgaWkgPSAwLFxuICAgICAgICBtYXhJbmRleCA9IG5vZGVzLmxlbmd0aCAtIDE7IGlpIDw9IG1heEluZGV4OyBpaSsrKSB7XG4gICAgICBpZiAobm9kZXNbcmV2ZXJzZSA/IG1heEluZGV4IC0gaWkgOiBpaV0uaXRlcmF0ZShmbiwgcmV2ZXJzZSkgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0sIHt9KTtcbnZhciBBcnJheU5vZGUgPSBmdW5jdGlvbiBBcnJheU5vZGUob3duZXJJRCwgY291bnQsIG5vZGVzKSB7XG4gIHRoaXMub3duZXJJRCA9IG93bmVySUQ7XG4gIHRoaXMuY291bnQgPSBjb3VudDtcbiAgdGhpcy5ub2RlcyA9IG5vZGVzO1xufTtcbnZhciAkQXJyYXlOb2RlID0gQXJyYXlOb2RlO1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoQXJyYXlOb2RlLCB7XG4gIGdldDogZnVuY3Rpb24oc2hpZnQsIGhhc2gsIGtleSwgbm90U2V0VmFsdWUpIHtcbiAgICB2YXIgaWR4ID0gKHNoaWZ0ID09PSAwID8gaGFzaCA6IGhhc2ggPj4+IHNoaWZ0KSAmIE1BU0s7XG4gICAgdmFyIG5vZGUgPSB0aGlzLm5vZGVzW2lkeF07XG4gICAgcmV0dXJuIG5vZGUgPyBub2RlLmdldChzaGlmdCArIFNISUZULCBoYXNoLCBrZXksIG5vdFNldFZhbHVlKSA6IG5vdFNldFZhbHVlO1xuICB9LFxuICB1cGRhdGU6IGZ1bmN0aW9uKG93bmVySUQsIHNoaWZ0LCBoYXNoLCBrZXksIHZhbHVlLCBkaWRDaGFuZ2VTaXplLCBkaWRBbHRlcikge1xuICAgIHZhciBpZHggPSAoc2hpZnQgPT09IDAgPyBoYXNoIDogaGFzaCA+Pj4gc2hpZnQpICYgTUFTSztcbiAgICB2YXIgcmVtb3ZlZCA9IHZhbHVlID09PSBOT1RfU0VUO1xuICAgIHZhciBub2RlcyA9IHRoaXMubm9kZXM7XG4gICAgdmFyIG5vZGUgPSBub2Rlc1tpZHhdO1xuICAgIGlmIChyZW1vdmVkICYmICFub2RlKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdmFyIG5ld05vZGUgPSB1cGRhdGVOb2RlKG5vZGUsIG93bmVySUQsIHNoaWZ0ICsgU0hJRlQsIGhhc2gsIGtleSwgdmFsdWUsIGRpZENoYW5nZVNpemUsIGRpZEFsdGVyKTtcbiAgICBpZiAobmV3Tm9kZSA9PT0gbm9kZSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciBuZXdDb3VudCA9IHRoaXMuY291bnQ7XG4gICAgaWYgKCFub2RlKSB7XG4gICAgICBuZXdDb3VudCsrO1xuICAgIH0gZWxzZSBpZiAoIW5ld05vZGUpIHtcbiAgICAgIG5ld0NvdW50LS07XG4gICAgICBpZiAobmV3Q291bnQgPCBNSU5fQVJSQVlfU0laRSkge1xuICAgICAgICByZXR1cm4gcGFja05vZGVzKG93bmVySUQsIG5vZGVzLCBuZXdDb3VudCwgaWR4KTtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGlzRWRpdGFibGUgPSBvd25lcklEICYmIG93bmVySUQgPT09IHRoaXMub3duZXJJRDtcbiAgICB2YXIgbmV3Tm9kZXMgPSBzZXRJbihub2RlcywgaWR4LCBuZXdOb2RlLCBpc0VkaXRhYmxlKTtcbiAgICBpZiAoaXNFZGl0YWJsZSkge1xuICAgICAgdGhpcy5jb3VudCA9IG5ld0NvdW50O1xuICAgICAgdGhpcy5ub2RlcyA9IG5ld05vZGVzO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBuZXcgJEFycmF5Tm9kZShvd25lcklELCBuZXdDb3VudCwgbmV3Tm9kZXMpO1xuICB9LFxuICBpdGVyYXRlOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciBub2RlcyA9IHRoaXMubm9kZXM7XG4gICAgZm9yICh2YXIgaWkgPSAwLFxuICAgICAgICBtYXhJbmRleCA9IG5vZGVzLmxlbmd0aCAtIDE7IGlpIDw9IG1heEluZGV4OyBpaSsrKSB7XG4gICAgICB2YXIgbm9kZSA9IG5vZGVzW3JldmVyc2UgPyBtYXhJbmRleCAtIGlpIDogaWldO1xuICAgICAgaWYgKG5vZGUgJiYgbm9kZS5pdGVyYXRlKGZuLCByZXZlcnNlKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfVxufSwge30pO1xudmFyIEhhc2hDb2xsaXNpb25Ob2RlID0gZnVuY3Rpb24gSGFzaENvbGxpc2lvbk5vZGUob3duZXJJRCwgaGFzaCwgZW50cmllcykge1xuICB0aGlzLm93bmVySUQgPSBvd25lcklEO1xuICB0aGlzLmhhc2ggPSBoYXNoO1xuICB0aGlzLmVudHJpZXMgPSBlbnRyaWVzO1xufTtcbnZhciAkSGFzaENvbGxpc2lvbk5vZGUgPSBIYXNoQ29sbGlzaW9uTm9kZTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKEhhc2hDb2xsaXNpb25Ob2RlLCB7XG4gIGdldDogZnVuY3Rpb24oc2hpZnQsIGhhc2gsIGtleSwgbm90U2V0VmFsdWUpIHtcbiAgICB2YXIgZW50cmllcyA9IHRoaXMuZW50cmllcztcbiAgICBmb3IgKHZhciBpaSA9IDAsXG4gICAgICAgIGxlbiA9IGVudHJpZXMubGVuZ3RoOyBpaSA8IGxlbjsgaWkrKykge1xuICAgICAgaWYgKGlzKGtleSwgZW50cmllc1tpaV1bMF0pKSB7XG4gICAgICAgIHJldHVybiBlbnRyaWVzW2lpXVsxXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5vdFNldFZhbHVlO1xuICB9LFxuICB1cGRhdGU6IGZ1bmN0aW9uKG93bmVySUQsIHNoaWZ0LCBoYXNoLCBrZXksIHZhbHVlLCBkaWRDaGFuZ2VTaXplLCBkaWRBbHRlcikge1xuICAgIHZhciByZW1vdmVkID0gdmFsdWUgPT09IE5PVF9TRVQ7XG4gICAgaWYgKGhhc2ggIT09IHRoaXMuaGFzaCkge1xuICAgICAgaWYgKHJlbW92ZWQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICBTZXRSZWYoZGlkQWx0ZXIpO1xuICAgICAgU2V0UmVmKGRpZENoYW5nZVNpemUpO1xuICAgICAgcmV0dXJuIG1lcmdlSW50b05vZGUodGhpcywgb3duZXJJRCwgc2hpZnQsIGhhc2gsIFtrZXksIHZhbHVlXSk7XG4gICAgfVxuICAgIHZhciBlbnRyaWVzID0gdGhpcy5lbnRyaWVzO1xuICAgIHZhciBpZHggPSAwO1xuICAgIGZvciAodmFyIGxlbiA9IGVudHJpZXMubGVuZ3RoOyBpZHggPCBsZW47IGlkeCsrKSB7XG4gICAgICBpZiAoaXMoa2V5LCBlbnRyaWVzW2lkeF1bMF0pKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgZXhpc3RzID0gaWR4IDwgbGVuO1xuICAgIGlmIChyZW1vdmVkICYmICFleGlzdHMpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBTZXRSZWYoZGlkQWx0ZXIpO1xuICAgIChyZW1vdmVkIHx8ICFleGlzdHMpICYmIFNldFJlZihkaWRDaGFuZ2VTaXplKTtcbiAgICBpZiAocmVtb3ZlZCAmJiBsZW4gPT09IDIpIHtcbiAgICAgIHJldHVybiBuZXcgVmFsdWVOb2RlKG93bmVySUQsIHRoaXMuaGFzaCwgZW50cmllc1tpZHggXiAxXSk7XG4gICAgfVxuICAgIHZhciBpc0VkaXRhYmxlID0gb3duZXJJRCAmJiBvd25lcklEID09PSB0aGlzLm93bmVySUQ7XG4gICAgdmFyIG5ld0VudHJpZXMgPSBpc0VkaXRhYmxlID8gZW50cmllcyA6IGFyckNvcHkoZW50cmllcyk7XG4gICAgaWYgKGV4aXN0cykge1xuICAgICAgaWYgKHJlbW92ZWQpIHtcbiAgICAgICAgaWR4ID09PSBsZW4gLSAxID8gbmV3RW50cmllcy5wb3AoKSA6IChuZXdFbnRyaWVzW2lkeF0gPSBuZXdFbnRyaWVzLnBvcCgpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5ld0VudHJpZXNbaWR4XSA9IFtrZXksIHZhbHVlXTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbmV3RW50cmllcy5wdXNoKFtrZXksIHZhbHVlXSk7XG4gICAgfVxuICAgIGlmIChpc0VkaXRhYmxlKSB7XG4gICAgICB0aGlzLmVudHJpZXMgPSBuZXdFbnRyaWVzO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBuZXcgJEhhc2hDb2xsaXNpb25Ob2RlKG93bmVySUQsIHRoaXMuaGFzaCwgbmV3RW50cmllcyk7XG4gIH0sXG4gIGl0ZXJhdGU6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyIGVudHJpZXMgPSB0aGlzLmVudHJpZXM7XG4gICAgZm9yICh2YXIgaWkgPSAwLFxuICAgICAgICBtYXhJbmRleCA9IGVudHJpZXMubGVuZ3RoIC0gMTsgaWkgPD0gbWF4SW5kZXg7IGlpKyspIHtcbiAgICAgIGlmIChmbihlbnRyaWVzW3JldmVyc2UgPyBtYXhJbmRleCAtIGlpIDogaWldKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfVxufSwge30pO1xudmFyIFZhbHVlTm9kZSA9IGZ1bmN0aW9uIFZhbHVlTm9kZShvd25lcklELCBoYXNoLCBlbnRyeSkge1xuICB0aGlzLm93bmVySUQgPSBvd25lcklEO1xuICB0aGlzLmhhc2ggPSBoYXNoO1xuICB0aGlzLmVudHJ5ID0gZW50cnk7XG59O1xudmFyICRWYWx1ZU5vZGUgPSBWYWx1ZU5vZGU7XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShWYWx1ZU5vZGUsIHtcbiAgZ2V0OiBmdW5jdGlvbihzaGlmdCwgaGFzaCwga2V5LCBub3RTZXRWYWx1ZSkge1xuICAgIHJldHVybiBpcyhrZXksIHRoaXMuZW50cnlbMF0pID8gdGhpcy5lbnRyeVsxXSA6IG5vdFNldFZhbHVlO1xuICB9LFxuICB1cGRhdGU6IGZ1bmN0aW9uKG93bmVySUQsIHNoaWZ0LCBoYXNoLCBrZXksIHZhbHVlLCBkaWRDaGFuZ2VTaXplLCBkaWRBbHRlcikge1xuICAgIHZhciByZW1vdmVkID0gdmFsdWUgPT09IE5PVF9TRVQ7XG4gICAgdmFyIGtleU1hdGNoID0gaXMoa2V5LCB0aGlzLmVudHJ5WzBdKTtcbiAgICBpZiAoa2V5TWF0Y2ggPyB2YWx1ZSA9PT0gdGhpcy5lbnRyeVsxXSA6IHJlbW92ZWQpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBTZXRSZWYoZGlkQWx0ZXIpO1xuICAgIGlmIChyZW1vdmVkKSB7XG4gICAgICBTZXRSZWYoZGlkQ2hhbmdlU2l6ZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChrZXlNYXRjaCkge1xuICAgICAgaWYgKG93bmVySUQgJiYgb3duZXJJRCA9PT0gdGhpcy5vd25lcklEKSB7XG4gICAgICAgIHRoaXMuZW50cnlbMV0gPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3ICRWYWx1ZU5vZGUob3duZXJJRCwgaGFzaCwgW2tleSwgdmFsdWVdKTtcbiAgICB9XG4gICAgU2V0UmVmKGRpZENoYW5nZVNpemUpO1xuICAgIHJldHVybiBtZXJnZUludG9Ob2RlKHRoaXMsIG93bmVySUQsIHNoaWZ0LCBoYXNoLCBba2V5LCB2YWx1ZV0pO1xuICB9LFxuICBpdGVyYXRlOiBmdW5jdGlvbihmbikge1xuICAgIHJldHVybiBmbih0aGlzLmVudHJ5KTtcbiAgfVxufSwge30pO1xudmFyIE1hcEl0ZXJhdG9yID0gZnVuY3Rpb24gTWFwSXRlcmF0b3IobWFwLCB0eXBlLCByZXZlcnNlKSB7XG4gIHRoaXMuX3R5cGUgPSB0eXBlO1xuICB0aGlzLl9yZXZlcnNlID0gcmV2ZXJzZTtcbiAgdGhpcy5fc3RhY2sgPSBtYXAuX3Jvb3QgJiYgbWFwSXRlcmF0b3JGcmFtZShtYXAuX3Jvb3QpO1xufTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKE1hcEl0ZXJhdG9yLCB7bmV4dDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHR5cGUgPSB0aGlzLl90eXBlO1xuICAgIHZhciBzdGFjayA9IHRoaXMuX3N0YWNrO1xuICAgIHdoaWxlIChzdGFjaykge1xuICAgICAgdmFyIG5vZGUgPSBzdGFjay5ub2RlO1xuICAgICAgdmFyIGluZGV4ID0gc3RhY2suaW5kZXgrKztcbiAgICAgIHZhciBtYXhJbmRleDtcbiAgICAgIGlmIChub2RlLmVudHJ5KSB7XG4gICAgICAgIGlmIChpbmRleCA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiBtYXBJdGVyYXRvclZhbHVlKHR5cGUsIG5vZGUuZW50cnkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKG5vZGUuZW50cmllcykge1xuICAgICAgICBtYXhJbmRleCA9IG5vZGUuZW50cmllcy5sZW5ndGggLSAxO1xuICAgICAgICBpZiAoaW5kZXggPD0gbWF4SW5kZXgpIHtcbiAgICAgICAgICByZXR1cm4gbWFwSXRlcmF0b3JWYWx1ZSh0eXBlLCBub2RlLmVudHJpZXNbdGhpcy5fcmV2ZXJzZSA/IG1heEluZGV4IC0gaW5kZXggOiBpbmRleF0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtYXhJbmRleCA9IG5vZGUubm9kZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgaWYgKGluZGV4IDw9IG1heEluZGV4KSB7XG4gICAgICAgICAgdmFyIHN1Yk5vZGUgPSBub2RlLm5vZGVzW3RoaXMuX3JldmVyc2UgPyBtYXhJbmRleCAtIGluZGV4IDogaW5kZXhdO1xuICAgICAgICAgIGlmIChzdWJOb2RlKSB7XG4gICAgICAgICAgICBpZiAoc3ViTm9kZS5lbnRyeSkge1xuICAgICAgICAgICAgICByZXR1cm4gbWFwSXRlcmF0b3JWYWx1ZSh0eXBlLCBzdWJOb2RlLmVudHJ5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YWNrID0gdGhpcy5fc3RhY2sgPSBtYXBJdGVyYXRvckZyYW1lKHN1Yk5vZGUsIHN0YWNrKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHN0YWNrID0gdGhpcy5fc3RhY2sgPSB0aGlzLl9zdGFjay5fX3ByZXY7XG4gICAgfVxuICAgIHJldHVybiBpdGVyYXRvckRvbmUoKTtcbiAgfX0sIHt9LCBJdGVyYXRvcik7XG5mdW5jdGlvbiBtYXBJdGVyYXRvclZhbHVlKHR5cGUsIGVudHJ5KSB7XG4gIHJldHVybiBpdGVyYXRvclZhbHVlKHR5cGUsIGVudHJ5WzBdLCBlbnRyeVsxXSk7XG59XG5mdW5jdGlvbiBtYXBJdGVyYXRvckZyYW1lKG5vZGUsIHByZXYpIHtcbiAgcmV0dXJuIHtcbiAgICBub2RlOiBub2RlLFxuICAgIGluZGV4OiAwLFxuICAgIF9fcHJldjogcHJldlxuICB9O1xufVxuZnVuY3Rpb24gbWFrZU1hcChzaXplLCByb290LCBvd25lcklELCBoYXNoKSB7XG4gIHZhciBtYXAgPSBPYmplY3QuY3JlYXRlKE1hcFByb3RvdHlwZSk7XG4gIG1hcC5zaXplID0gc2l6ZTtcbiAgbWFwLl9yb290ID0gcm9vdDtcbiAgbWFwLl9fb3duZXJJRCA9IG93bmVySUQ7XG4gIG1hcC5fX2hhc2ggPSBoYXNoO1xuICBtYXAuX19hbHRlcmVkID0gZmFsc2U7XG4gIHJldHVybiBtYXA7XG59XG52YXIgRU1QVFlfTUFQO1xuZnVuY3Rpb24gZW1wdHlNYXAoKSB7XG4gIHJldHVybiBFTVBUWV9NQVAgfHwgKEVNUFRZX01BUCA9IG1ha2VNYXAoMCkpO1xufVxuZnVuY3Rpb24gdXBkYXRlTWFwKG1hcCwgaywgdikge1xuICB2YXIgZGlkQ2hhbmdlU2l6ZSA9IE1ha2VSZWYoQ0hBTkdFX0xFTkdUSCk7XG4gIHZhciBkaWRBbHRlciA9IE1ha2VSZWYoRElEX0FMVEVSKTtcbiAgdmFyIG5ld1Jvb3QgPSB1cGRhdGVOb2RlKG1hcC5fcm9vdCwgbWFwLl9fb3duZXJJRCwgMCwgaGFzaChrKSwgaywgdiwgZGlkQ2hhbmdlU2l6ZSwgZGlkQWx0ZXIpO1xuICBpZiAoIWRpZEFsdGVyLnZhbHVlKSB7XG4gICAgcmV0dXJuIG1hcDtcbiAgfVxuICB2YXIgbmV3U2l6ZSA9IG1hcC5zaXplICsgKGRpZENoYW5nZVNpemUudmFsdWUgPyB2ID09PSBOT1RfU0VUID8gLTEgOiAxIDogMCk7XG4gIGlmIChtYXAuX19vd25lcklEKSB7XG4gICAgbWFwLnNpemUgPSBuZXdTaXplO1xuICAgIG1hcC5fcm9vdCA9IG5ld1Jvb3Q7XG4gICAgbWFwLl9faGFzaCA9IHVuZGVmaW5lZDtcbiAgICBtYXAuX19hbHRlcmVkID0gdHJ1ZTtcbiAgICByZXR1cm4gbWFwO1xuICB9XG4gIHJldHVybiBuZXdSb290ID8gbWFrZU1hcChuZXdTaXplLCBuZXdSb290KSA6IGVtcHR5TWFwKCk7XG59XG5mdW5jdGlvbiB1cGRhdGVOb2RlKG5vZGUsIG93bmVySUQsIHNoaWZ0LCBoYXNoLCBrZXksIHZhbHVlLCBkaWRDaGFuZ2VTaXplLCBkaWRBbHRlcikge1xuICBpZiAoIW5vZGUpIHtcbiAgICBpZiAodmFsdWUgPT09IE5PVF9TRVQpIHtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgICBTZXRSZWYoZGlkQWx0ZXIpO1xuICAgIFNldFJlZihkaWRDaGFuZ2VTaXplKTtcbiAgICByZXR1cm4gbmV3IFZhbHVlTm9kZShvd25lcklELCBoYXNoLCBba2V5LCB2YWx1ZV0pO1xuICB9XG4gIHJldHVybiBub2RlLnVwZGF0ZShvd25lcklELCBzaGlmdCwgaGFzaCwga2V5LCB2YWx1ZSwgZGlkQ2hhbmdlU2l6ZSwgZGlkQWx0ZXIpO1xufVxuZnVuY3Rpb24gaXNMZWFmTm9kZShub2RlKSB7XG4gIHJldHVybiBub2RlLmNvbnN0cnVjdG9yID09PSBWYWx1ZU5vZGUgfHwgbm9kZS5jb25zdHJ1Y3RvciA9PT0gSGFzaENvbGxpc2lvbk5vZGU7XG59XG5mdW5jdGlvbiBtZXJnZUludG9Ob2RlKG5vZGUsIG93bmVySUQsIHNoaWZ0LCBoYXNoLCBlbnRyeSkge1xuICBpZiAobm9kZS5oYXNoID09PSBoYXNoKSB7XG4gICAgcmV0dXJuIG5ldyBIYXNoQ29sbGlzaW9uTm9kZShvd25lcklELCBoYXNoLCBbbm9kZS5lbnRyeSwgZW50cnldKTtcbiAgfVxuICB2YXIgaWR4MSA9IChzaGlmdCA9PT0gMCA/IG5vZGUuaGFzaCA6IG5vZGUuaGFzaCA+Pj4gc2hpZnQpICYgTUFTSztcbiAgdmFyIGlkeDIgPSAoc2hpZnQgPT09IDAgPyBoYXNoIDogaGFzaCA+Pj4gc2hpZnQpICYgTUFTSztcbiAgdmFyIG5ld05vZGU7XG4gIHZhciBub2RlcyA9IGlkeDEgPT09IGlkeDIgPyBbbWVyZ2VJbnRvTm9kZShub2RlLCBvd25lcklELCBzaGlmdCArIFNISUZULCBoYXNoLCBlbnRyeSldIDogKChuZXdOb2RlID0gbmV3IFZhbHVlTm9kZShvd25lcklELCBoYXNoLCBlbnRyeSkpLCBpZHgxIDwgaWR4MiA/IFtub2RlLCBuZXdOb2RlXSA6IFtuZXdOb2RlLCBub2RlXSk7XG4gIHJldHVybiBuZXcgQml0bWFwSW5kZXhlZE5vZGUob3duZXJJRCwgKDEgPDwgaWR4MSkgfCAoMSA8PCBpZHgyKSwgbm9kZXMpO1xufVxuZnVuY3Rpb24gcGFja05vZGVzKG93bmVySUQsIG5vZGVzLCBjb3VudCwgZXhjbHVkaW5nKSB7XG4gIHZhciBiaXRtYXAgPSAwO1xuICB2YXIgcGFja2VkSUkgPSAwO1xuICB2YXIgcGFja2VkTm9kZXMgPSBuZXcgQXJyYXkoY291bnQpO1xuICBmb3IgKHZhciBpaSA9IDAsXG4gICAgICBiaXQgPSAxLFxuICAgICAgbGVuID0gbm9kZXMubGVuZ3RoOyBpaSA8IGxlbjsgaWkrKywgYml0IDw8PSAxKSB7XG4gICAgdmFyIG5vZGUgPSBub2Rlc1tpaV07XG4gICAgaWYgKG5vZGUgIT09IHVuZGVmaW5lZCAmJiBpaSAhPT0gZXhjbHVkaW5nKSB7XG4gICAgICBiaXRtYXAgfD0gYml0O1xuICAgICAgcGFja2VkTm9kZXNbcGFja2VkSUkrK10gPSBub2RlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbmV3IEJpdG1hcEluZGV4ZWROb2RlKG93bmVySUQsIGJpdG1hcCwgcGFja2VkTm9kZXMpO1xufVxuZnVuY3Rpb24gZXhwYW5kTm9kZXMob3duZXJJRCwgbm9kZXMsIGJpdG1hcCwgaW5jbHVkaW5nLCBub2RlKSB7XG4gIHZhciBjb3VudCA9IDA7XG4gIHZhciBleHBhbmRlZE5vZGVzID0gbmV3IEFycmF5KFNJWkUpO1xuICBmb3IgKHZhciBpaSA9IDA7IGJpdG1hcCAhPT0gMDsgaWkrKywgYml0bWFwID4+Pj0gMSkge1xuICAgIGV4cGFuZGVkTm9kZXNbaWldID0gYml0bWFwICYgMSA/IG5vZGVzW2NvdW50KytdIDogdW5kZWZpbmVkO1xuICB9XG4gIGV4cGFuZGVkTm9kZXNbaW5jbHVkaW5nXSA9IG5vZGU7XG4gIHJldHVybiBuZXcgQXJyYXlOb2RlKG93bmVySUQsIGNvdW50ICsgMSwgZXhwYW5kZWROb2Rlcyk7XG59XG5mdW5jdGlvbiBtZXJnZUludG9NYXBXaXRoKG1hcCwgbWVyZ2VyLCBpdGVyYWJsZXMpIHtcbiAgdmFyIGl0ZXJzID0gW107XG4gIGZvciAodmFyIGlpID0gMDsgaWkgPCBpdGVyYWJsZXMubGVuZ3RoOyBpaSsrKSB7XG4gICAgdmFyIHZhbHVlID0gaXRlcmFibGVzW2lpXTtcbiAgICB2YXIgaXRlciA9IEtleWVkSXRlcmFibGUodmFsdWUpO1xuICAgIGlmICghaXNJdGVyYWJsZSh2YWx1ZSkpIHtcbiAgICAgIGl0ZXIgPSBpdGVyLm1hcCgoZnVuY3Rpb24odikge1xuICAgICAgICByZXR1cm4gZnJvbUpTKHYpO1xuICAgICAgfSkpO1xuICAgIH1cbiAgICBpdGVycy5wdXNoKGl0ZXIpO1xuICB9XG4gIHJldHVybiBtZXJnZUludG9Db2xsZWN0aW9uV2l0aChtYXAsIG1lcmdlciwgaXRlcnMpO1xufVxuZnVuY3Rpb24gZGVlcE1lcmdlcihtZXJnZXIpIHtcbiAgcmV0dXJuIChmdW5jdGlvbihleGlzdGluZywgdmFsdWUpIHtcbiAgICByZXR1cm4gZXhpc3RpbmcgJiYgZXhpc3RpbmcubWVyZ2VEZWVwV2l0aCAmJiBpc0l0ZXJhYmxlKHZhbHVlKSA/IGV4aXN0aW5nLm1lcmdlRGVlcFdpdGgobWVyZ2VyLCB2YWx1ZSkgOiBtZXJnZXIgPyBtZXJnZXIoZXhpc3RpbmcsIHZhbHVlKSA6IHZhbHVlO1xuICB9KTtcbn1cbmZ1bmN0aW9uIG1lcmdlSW50b0NvbGxlY3Rpb25XaXRoKGNvbGxlY3Rpb24sIG1lcmdlciwgaXRlcnMpIHtcbiAgaWYgKGl0ZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBjb2xsZWN0aW9uO1xuICB9XG4gIHJldHVybiBjb2xsZWN0aW9uLndpdGhNdXRhdGlvbnMoKGZ1bmN0aW9uKGNvbGxlY3Rpb24pIHtcbiAgICB2YXIgbWVyZ2VJbnRvTWFwID0gbWVyZ2VyID8gKGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgIGNvbGxlY3Rpb24udXBkYXRlKGtleSwgTk9UX1NFVCwgKGZ1bmN0aW9uKGV4aXN0aW5nKSB7XG4gICAgICAgIHJldHVybiBleGlzdGluZyA9PT0gTk9UX1NFVCA/IHZhbHVlIDogbWVyZ2VyKGV4aXN0aW5nLCB2YWx1ZSk7XG4gICAgICB9KSk7XG4gICAgfSkgOiAoZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgY29sbGVjdGlvbi5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgfSk7XG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IGl0ZXJzLmxlbmd0aDsgaWkrKykge1xuICAgICAgaXRlcnNbaWldLmZvckVhY2gobWVyZ2VJbnRvTWFwKTtcbiAgICB9XG4gIH0pKTtcbn1cbmZ1bmN0aW9uIHVwZGF0ZUluRGVlcE1hcChjb2xsZWN0aW9uLCBrZXlQYXRoLCBub3RTZXRWYWx1ZSwgdXBkYXRlciwgb2Zmc2V0KSB7XG4gIGludmFyaWFudCghY29sbGVjdGlvbiB8fCBjb2xsZWN0aW9uLnNldCwgJ3VwZGF0ZUluIHdpdGggaW52YWxpZCBrZXlQYXRoJyk7XG4gIHZhciBrZXkgPSBrZXlQYXRoW29mZnNldF07XG4gIHZhciBleGlzdGluZyA9IGNvbGxlY3Rpb24gPyBjb2xsZWN0aW9uLmdldChrZXksIE5PVF9TRVQpIDogTk9UX1NFVDtcbiAgdmFyIGV4aXN0aW5nVmFsdWUgPSBleGlzdGluZyA9PT0gTk9UX1NFVCA/IHVuZGVmaW5lZCA6IGV4aXN0aW5nO1xuICB2YXIgdmFsdWUgPSBvZmZzZXQgPT09IGtleVBhdGgubGVuZ3RoIC0gMSA/IHVwZGF0ZXIoZXhpc3RpbmcgPT09IE5PVF9TRVQgPyBub3RTZXRWYWx1ZSA6IGV4aXN0aW5nKSA6IHVwZGF0ZUluRGVlcE1hcChleGlzdGluZ1ZhbHVlLCBrZXlQYXRoLCBub3RTZXRWYWx1ZSwgdXBkYXRlciwgb2Zmc2V0ICsgMSk7XG4gIHJldHVybiB2YWx1ZSA9PT0gZXhpc3RpbmdWYWx1ZSA/IGNvbGxlY3Rpb24gOiB2YWx1ZSA9PT0gTk9UX1NFVCA/IGNvbGxlY3Rpb24gJiYgY29sbGVjdGlvbi5yZW1vdmUoa2V5KSA6IChjb2xsZWN0aW9uIHx8IGVtcHR5TWFwKCkpLnNldChrZXksIHZhbHVlKTtcbn1cbmZ1bmN0aW9uIHBvcENvdW50KHgpIHtcbiAgeCA9IHggLSAoKHggPj4gMSkgJiAweDU1NTU1NTU1KTtcbiAgeCA9ICh4ICYgMHgzMzMzMzMzMykgKyAoKHggPj4gMikgJiAweDMzMzMzMzMzKTtcbiAgeCA9ICh4ICsgKHggPj4gNCkpICYgMHgwZjBmMGYwZjtcbiAgeCA9IHggKyAoeCA+PiA4KTtcbiAgeCA9IHggKyAoeCA+PiAxNik7XG4gIHJldHVybiB4ICYgMHg3Zjtcbn1cbmZ1bmN0aW9uIHNldEluKGFycmF5LCBpZHgsIHZhbCwgY2FuRWRpdCkge1xuICB2YXIgbmV3QXJyYXkgPSBjYW5FZGl0ID8gYXJyYXkgOiBhcnJDb3B5KGFycmF5KTtcbiAgbmV3QXJyYXlbaWR4XSA9IHZhbDtcbiAgcmV0dXJuIG5ld0FycmF5O1xufVxuZnVuY3Rpb24gc3BsaWNlSW4oYXJyYXksIGlkeCwgdmFsLCBjYW5FZGl0KSB7XG4gIHZhciBuZXdMZW4gPSBhcnJheS5sZW5ndGggKyAxO1xuICBpZiAoY2FuRWRpdCAmJiBpZHggKyAxID09PSBuZXdMZW4pIHtcbiAgICBhcnJheVtpZHhdID0gdmFsO1xuICAgIHJldHVybiBhcnJheTtcbiAgfVxuICB2YXIgbmV3QXJyYXkgPSBuZXcgQXJyYXkobmV3TGVuKTtcbiAgdmFyIGFmdGVyID0gMDtcbiAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IG5ld0xlbjsgaWkrKykge1xuICAgIGlmIChpaSA9PT0gaWR4KSB7XG4gICAgICBuZXdBcnJheVtpaV0gPSB2YWw7XG4gICAgICBhZnRlciA9IC0xO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXdBcnJheVtpaV0gPSBhcnJheVtpaSArIGFmdGVyXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5ld0FycmF5O1xufVxuZnVuY3Rpb24gc3BsaWNlT3V0KGFycmF5LCBpZHgsIGNhbkVkaXQpIHtcbiAgdmFyIG5ld0xlbiA9IGFycmF5Lmxlbmd0aCAtIDE7XG4gIGlmIChjYW5FZGl0ICYmIGlkeCA9PT0gbmV3TGVuKSB7XG4gICAgYXJyYXkucG9wKCk7XG4gICAgcmV0dXJuIGFycmF5O1xuICB9XG4gIHZhciBuZXdBcnJheSA9IG5ldyBBcnJheShuZXdMZW4pO1xuICB2YXIgYWZ0ZXIgPSAwO1xuICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgbmV3TGVuOyBpaSsrKSB7XG4gICAgaWYgKGlpID09PSBpZHgpIHtcbiAgICAgIGFmdGVyID0gMTtcbiAgICB9XG4gICAgbmV3QXJyYXlbaWldID0gYXJyYXlbaWkgKyBhZnRlcl07XG4gIH1cbiAgcmV0dXJuIG5ld0FycmF5O1xufVxudmFyIE1BWF9CSVRNQVBfU0laRSA9IFNJWkUgLyAyO1xudmFyIE1JTl9BUlJBWV9TSVpFID0gU0laRSAvIDQ7XG52YXIgVG9LZXllZFNlcXVlbmNlID0gZnVuY3Rpb24gVG9LZXllZFNlcXVlbmNlKGluZGV4ZWQsIHVzZUtleXMpIHtcbiAgdGhpcy5faXRlciA9IGluZGV4ZWQ7XG4gIHRoaXMuX3VzZUtleXMgPSB1c2VLZXlzO1xuICB0aGlzLnNpemUgPSBpbmRleGVkLnNpemU7XG59O1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoVG9LZXllZFNlcXVlbmNlLCB7XG4gIGdldDogZnVuY3Rpb24oa2V5LCBub3RTZXRWYWx1ZSkge1xuICAgIHJldHVybiB0aGlzLl9pdGVyLmdldChrZXksIG5vdFNldFZhbHVlKTtcbiAgfSxcbiAgaGFzOiBmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5faXRlci5oYXMoa2V5KTtcbiAgfSxcbiAgdmFsdWVTZXE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9pdGVyLnZhbHVlU2VxKCk7XG4gIH0sXG4gIHJldmVyc2U6IGZ1bmN0aW9uKCkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICB2YXIgcmV2ZXJzZWRTZXF1ZW5jZSA9IHJldmVyc2VGYWN0b3J5KHRoaXMsIHRydWUpO1xuICAgIGlmICghdGhpcy5fdXNlS2V5cykge1xuICAgICAgcmV2ZXJzZWRTZXF1ZW5jZS52YWx1ZVNlcSA9IChmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICRfXzAuX2l0ZXIudG9TZXEoKS5yZXZlcnNlKCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHJldmVyc2VkU2VxdWVuY2U7XG4gIH0sXG4gIG1hcDogZnVuY3Rpb24obWFwcGVyLCBjb250ZXh0KSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIHZhciBtYXBwZWRTZXF1ZW5jZSA9IG1hcEZhY3RvcnkodGhpcywgbWFwcGVyLCBjb250ZXh0KTtcbiAgICBpZiAoIXRoaXMuX3VzZUtleXMpIHtcbiAgICAgIG1hcHBlZFNlcXVlbmNlLnZhbHVlU2VxID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gJF9fMC5faXRlci50b1NlcSgpLm1hcChtYXBwZXIsIGNvbnRleHQpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBtYXBwZWRTZXF1ZW5jZTtcbiAgfSxcbiAgX19pdGVyYXRlOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICB2YXIgaWk7XG4gICAgcmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRlKHRoaXMuX3VzZUtleXMgPyAoZnVuY3Rpb24odiwgaykge1xuICAgICAgcmV0dXJuIGZuKHYsIGssICRfXzApO1xuICAgIH0pIDogKChpaSA9IHJldmVyc2UgPyByZXNvbHZlU2l6ZSh0aGlzKSA6IDApLCAoZnVuY3Rpb24odikge1xuICAgICAgcmV0dXJuIGZuKHYsIHJldmVyc2UgPyAtLWlpIDogaWkrKywgJF9fMCk7XG4gICAgfSkpLCByZXZlcnNlKTtcbiAgfSxcbiAgX19pdGVyYXRvcjogZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIGlmICh0aGlzLl91c2VLZXlzKSB7XG4gICAgICByZXR1cm4gdGhpcy5faXRlci5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICAgIH1cbiAgICB2YXIgaXRlcmF0b3IgPSB0aGlzLl9pdGVyLl9faXRlcmF0b3IoSVRFUkFURV9WQUxVRVMsIHJldmVyc2UpO1xuICAgIHZhciBpaSA9IHJldmVyc2UgPyByZXNvbHZlU2l6ZSh0aGlzKSA6IDA7XG4gICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc3RlcCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgIHJldHVybiBzdGVwLmRvbmUgPyBzdGVwIDogaXRlcmF0b3JWYWx1ZSh0eXBlLCByZXZlcnNlID8gLS1paSA6IGlpKyssIHN0ZXAudmFsdWUsIHN0ZXApO1xuICAgIH0pKTtcbiAgfVxufSwge30sIEtleWVkU2VxKTtcbnZhciBUb0luZGV4ZWRTZXF1ZW5jZSA9IGZ1bmN0aW9uIFRvSW5kZXhlZFNlcXVlbmNlKGl0ZXIpIHtcbiAgdGhpcy5faXRlciA9IGl0ZXI7XG4gIHRoaXMuc2l6ZSA9IGl0ZXIuc2l6ZTtcbn07XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShUb0luZGV4ZWRTZXF1ZW5jZSwge1xuICBjb250YWluczogZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5faXRlci5jb250YWlucyh2YWx1ZSk7XG4gIH0sXG4gIF9faXRlcmF0ZTogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIHJldHVybiB0aGlzLl9pdGVyLl9faXRlcmF0ZSgoZnVuY3Rpb24odikge1xuICAgICAgcmV0dXJuIGZuKHYsIGl0ZXJhdGlvbnMrKywgJF9fMCk7XG4gICAgfSksIHJldmVyc2UpO1xuICB9LFxuICBfX2l0ZXJhdG9yOiBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgdmFyIGl0ZXJhdG9yID0gdGhpcy5faXRlci5fX2l0ZXJhdG9yKElURVJBVEVfVkFMVUVTLCByZXZlcnNlKTtcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc3RlcCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgIHJldHVybiBzdGVwLmRvbmUgPyBzdGVwIDogaXRlcmF0b3JWYWx1ZSh0eXBlLCBpdGVyYXRpb25zKyssIHN0ZXAudmFsdWUsIHN0ZXApO1xuICAgIH0pKTtcbiAgfVxufSwge30sIEluZGV4ZWRTZXEpO1xudmFyIFRvU2V0U2VxdWVuY2UgPSBmdW5jdGlvbiBUb1NldFNlcXVlbmNlKGl0ZXIpIHtcbiAgdGhpcy5faXRlciA9IGl0ZXI7XG4gIHRoaXMuc2l6ZSA9IGl0ZXIuc2l6ZTtcbn07XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShUb1NldFNlcXVlbmNlLCB7XG4gIGhhczogZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuX2l0ZXIuY29udGFpbnMoa2V5KTtcbiAgfSxcbiAgX19pdGVyYXRlOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICByZXR1cm4gdGhpcy5faXRlci5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHJldHVybiBmbih2LCB2LCAkX18wKTtcbiAgICB9KSwgcmV2ZXJzZSk7XG4gIH0sXG4gIF9faXRlcmF0b3I6IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICB2YXIgaXRlcmF0b3IgPSB0aGlzLl9pdGVyLl9faXRlcmF0b3IoSVRFUkFURV9WQUxVRVMsIHJldmVyc2UpO1xuICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHN0ZXAgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICByZXR1cm4gc3RlcC5kb25lID8gc3RlcCA6IGl0ZXJhdG9yVmFsdWUodHlwZSwgc3RlcC52YWx1ZSwgc3RlcC52YWx1ZSwgc3RlcCk7XG4gICAgfSkpO1xuICB9XG59LCB7fSwgU2V0U2VxKTtcbnZhciBGcm9tRW50cmllc1NlcXVlbmNlID0gZnVuY3Rpb24gRnJvbUVudHJpZXNTZXF1ZW5jZShlbnRyaWVzKSB7XG4gIHRoaXMuX2l0ZXIgPSBlbnRyaWVzO1xuICB0aGlzLnNpemUgPSBlbnRyaWVzLnNpemU7XG59O1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoRnJvbUVudHJpZXNTZXF1ZW5jZSwge1xuICBlbnRyeVNlcTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2l0ZXIudG9TZXEoKTtcbiAgfSxcbiAgX19pdGVyYXRlOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICByZXR1cm4gdGhpcy5faXRlci5fX2l0ZXJhdGUoKGZ1bmN0aW9uKGVudHJ5KSB7XG4gICAgICBpZiAoZW50cnkpIHtcbiAgICAgICAgdmFsaWRhdGVFbnRyeShlbnRyeSk7XG4gICAgICAgIHJldHVybiBmbihlbnRyeVsxXSwgZW50cnlbMF0sICRfXzApO1xuICAgICAgfVxuICAgIH0pLCByZXZlcnNlKTtcbiAgfSxcbiAgX19pdGVyYXRvcjogZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHZhciBpdGVyYXRvciA9IHRoaXMuX2l0ZXIuX19pdGVyYXRvcihJVEVSQVRFX1ZBTFVFUywgcmV2ZXJzZSk7XG4gICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICB2YXIgc3RlcCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgaWYgKHN0ZXAuZG9uZSkge1xuICAgICAgICAgIHJldHVybiBzdGVwO1xuICAgICAgICB9XG4gICAgICAgIHZhciBlbnRyeSA9IHN0ZXAudmFsdWU7XG4gICAgICAgIGlmIChlbnRyeSkge1xuICAgICAgICAgIHZhbGlkYXRlRW50cnkoZW50cnkpO1xuICAgICAgICAgIHJldHVybiB0eXBlID09PSBJVEVSQVRFX0VOVFJJRVMgPyBzdGVwIDogaXRlcmF0b3JWYWx1ZSh0eXBlLCBlbnRyeVswXSwgZW50cnlbMV0sIHN0ZXApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSkpO1xuICB9XG59LCB7fSwgS2V5ZWRTZXEpO1xuVG9JbmRleGVkU2VxdWVuY2UucHJvdG90eXBlLmNhY2hlUmVzdWx0ID0gVG9LZXllZFNlcXVlbmNlLnByb3RvdHlwZS5jYWNoZVJlc3VsdCA9IFRvU2V0U2VxdWVuY2UucHJvdG90eXBlLmNhY2hlUmVzdWx0ID0gRnJvbUVudHJpZXNTZXF1ZW5jZS5wcm90b3R5cGUuY2FjaGVSZXN1bHQgPSBjYWNoZVJlc3VsdFRocm91Z2g7XG5mdW5jdGlvbiBmbGlwRmFjdG9yeShpdGVyYWJsZSkge1xuICB2YXIgZmxpcFNlcXVlbmNlID0gbWFrZVNlcXVlbmNlKGl0ZXJhYmxlKTtcbiAgZmxpcFNlcXVlbmNlLl9pdGVyID0gaXRlcmFibGU7XG4gIGZsaXBTZXF1ZW5jZS5zaXplID0gaXRlcmFibGUuc2l6ZTtcbiAgZmxpcFNlcXVlbmNlLmZsaXAgPSAoZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGl0ZXJhYmxlO1xuICB9KTtcbiAgZmxpcFNlcXVlbmNlLnJldmVyc2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmV2ZXJzZWRTZXF1ZW5jZSA9IGl0ZXJhYmxlLnJldmVyc2UuYXBwbHkodGhpcyk7XG4gICAgcmV2ZXJzZWRTZXF1ZW5jZS5mbGlwID0gKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGl0ZXJhYmxlLnJldmVyc2UoKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmV2ZXJzZWRTZXF1ZW5jZTtcbiAgfTtcbiAgZmxpcFNlcXVlbmNlLmhhcyA9IChmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4gaXRlcmFibGUuY29udGFpbnMoa2V5KTtcbiAgfSk7XG4gIGZsaXBTZXF1ZW5jZS5jb250YWlucyA9IChmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4gaXRlcmFibGUuaGFzKGtleSk7XG4gIH0pO1xuICBmbGlwU2VxdWVuY2UuY2FjaGVSZXN1bHQgPSBjYWNoZVJlc3VsdFRocm91Z2g7XG4gIGZsaXBTZXF1ZW5jZS5fX2l0ZXJhdGVVbmNhY2hlZCA9IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIHJldHVybiBpdGVyYWJsZS5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYsIGspIHtcbiAgICAgIHJldHVybiBmbihrLCB2LCAkX18wKSAhPT0gZmFsc2U7XG4gICAgfSksIHJldmVyc2UpO1xuICB9O1xuICBmbGlwU2VxdWVuY2UuX19pdGVyYXRvclVuY2FjaGVkID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIGlmICh0eXBlID09PSBJVEVSQVRFX0VOVFJJRVMpIHtcbiAgICAgIHZhciBpdGVyYXRvciA9IGl0ZXJhYmxlLl9faXRlcmF0b3IodHlwZSwgcmV2ZXJzZSk7XG4gICAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHN0ZXAgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIGlmICghc3RlcC5kb25lKSB7XG4gICAgICAgICAgdmFyIGsgPSBzdGVwLnZhbHVlWzBdO1xuICAgICAgICAgIHN0ZXAudmFsdWVbMF0gPSBzdGVwLnZhbHVlWzFdO1xuICAgICAgICAgIHN0ZXAudmFsdWVbMV0gPSBrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdGVwO1xuICAgICAgfSkpO1xuICAgIH1cbiAgICByZXR1cm4gaXRlcmFibGUuX19pdGVyYXRvcih0eXBlID09PSBJVEVSQVRFX1ZBTFVFUyA/IElURVJBVEVfS0VZUyA6IElURVJBVEVfVkFMVUVTLCByZXZlcnNlKTtcbiAgfTtcbiAgcmV0dXJuIGZsaXBTZXF1ZW5jZTtcbn1cbmZ1bmN0aW9uIG1hcEZhY3RvcnkoaXRlcmFibGUsIG1hcHBlciwgY29udGV4dCkge1xuICB2YXIgbWFwcGVkU2VxdWVuY2UgPSBtYWtlU2VxdWVuY2UoaXRlcmFibGUpO1xuICBtYXBwZWRTZXF1ZW5jZS5zaXplID0gaXRlcmFibGUuc2l6ZTtcbiAgbWFwcGVkU2VxdWVuY2UuaGFzID0gKGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiBpdGVyYWJsZS5oYXMoa2V5KTtcbiAgfSk7XG4gIG1hcHBlZFNlcXVlbmNlLmdldCA9IChmdW5jdGlvbihrZXksIG5vdFNldFZhbHVlKSB7XG4gICAgdmFyIHYgPSBpdGVyYWJsZS5nZXQoa2V5LCBOT1RfU0VUKTtcbiAgICByZXR1cm4gdiA9PT0gTk9UX1NFVCA/IG5vdFNldFZhbHVlIDogbWFwcGVyLmNhbGwoY29udGV4dCwgdiwga2V5LCBpdGVyYWJsZSk7XG4gIH0pO1xuICBtYXBwZWRTZXF1ZW5jZS5fX2l0ZXJhdGVVbmNhY2hlZCA9IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIHJldHVybiBpdGVyYWJsZS5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYsIGssIGMpIHtcbiAgICAgIHJldHVybiBmbihtYXBwZXIuY2FsbChjb250ZXh0LCB2LCBrLCBjKSwgaywgJF9fMCkgIT09IGZhbHNlO1xuICAgIH0pLCByZXZlcnNlKTtcbiAgfTtcbiAgbWFwcGVkU2VxdWVuY2UuX19pdGVyYXRvclVuY2FjaGVkID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHZhciBpdGVyYXRvciA9IGl0ZXJhYmxlLl9faXRlcmF0b3IoSVRFUkFURV9FTlRSSUVTLCByZXZlcnNlKTtcbiAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzdGVwID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgaWYgKHN0ZXAuZG9uZSkge1xuICAgICAgICByZXR1cm4gc3RlcDtcbiAgICAgIH1cbiAgICAgIHZhciBlbnRyeSA9IHN0ZXAudmFsdWU7XG4gICAgICB2YXIga2V5ID0gZW50cnlbMF07XG4gICAgICByZXR1cm4gaXRlcmF0b3JWYWx1ZSh0eXBlLCBrZXksIG1hcHBlci5jYWxsKGNvbnRleHQsIGVudHJ5WzFdLCBrZXksIGl0ZXJhYmxlKSwgc3RlcCk7XG4gICAgfSkpO1xuICB9O1xuICByZXR1cm4gbWFwcGVkU2VxdWVuY2U7XG59XG5mdW5jdGlvbiByZXZlcnNlRmFjdG9yeShpdGVyYWJsZSwgdXNlS2V5cykge1xuICB2YXIgcmV2ZXJzZWRTZXF1ZW5jZSA9IG1ha2VTZXF1ZW5jZShpdGVyYWJsZSk7XG4gIHJldmVyc2VkU2VxdWVuY2UuX2l0ZXIgPSBpdGVyYWJsZTtcbiAgcmV2ZXJzZWRTZXF1ZW5jZS5zaXplID0gaXRlcmFibGUuc2l6ZTtcbiAgcmV2ZXJzZWRTZXF1ZW5jZS5yZXZlcnNlID0gKGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBpdGVyYWJsZTtcbiAgfSk7XG4gIGlmIChpdGVyYWJsZS5mbGlwKSB7XG4gICAgcmV2ZXJzZWRTZXF1ZW5jZS5mbGlwID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZmxpcFNlcXVlbmNlID0gZmxpcEZhY3RvcnkoaXRlcmFibGUpO1xuICAgICAgZmxpcFNlcXVlbmNlLnJldmVyc2UgPSAoZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBpdGVyYWJsZS5mbGlwKCk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBmbGlwU2VxdWVuY2U7XG4gICAgfTtcbiAgfVxuICByZXZlcnNlZFNlcXVlbmNlLmdldCA9IChmdW5jdGlvbihrZXksIG5vdFNldFZhbHVlKSB7XG4gICAgcmV0dXJuIGl0ZXJhYmxlLmdldCh1c2VLZXlzID8ga2V5IDogLTEgLSBrZXksIG5vdFNldFZhbHVlKTtcbiAgfSk7XG4gIHJldmVyc2VkU2VxdWVuY2UuaGFzID0gKGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiBpdGVyYWJsZS5oYXModXNlS2V5cyA/IGtleSA6IC0xIC0ga2V5KTtcbiAgfSk7XG4gIHJldmVyc2VkU2VxdWVuY2UuY29udGFpbnMgPSAoZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gaXRlcmFibGUuY29udGFpbnModmFsdWUpO1xuICB9KTtcbiAgcmV2ZXJzZWRTZXF1ZW5jZS5jYWNoZVJlc3VsdCA9IGNhY2hlUmVzdWx0VGhyb3VnaDtcbiAgcmV2ZXJzZWRTZXF1ZW5jZS5fX2l0ZXJhdGUgPSBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICByZXR1cm4gaXRlcmFibGUuX19pdGVyYXRlKChmdW5jdGlvbih2LCBrKSB7XG4gICAgICByZXR1cm4gZm4odiwgaywgJF9fMCk7XG4gICAgfSksICFyZXZlcnNlKTtcbiAgfTtcbiAgcmV2ZXJzZWRTZXF1ZW5jZS5fX2l0ZXJhdG9yID0gKGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICByZXR1cm4gaXRlcmFibGUuX19pdGVyYXRvcih0eXBlLCAhcmV2ZXJzZSk7XG4gIH0pO1xuICByZXR1cm4gcmV2ZXJzZWRTZXF1ZW5jZTtcbn1cbmZ1bmN0aW9uIGZpbHRlckZhY3RvcnkoaXRlcmFibGUsIHByZWRpY2F0ZSwgY29udGV4dCwgdXNlS2V5cykge1xuICB2YXIgZmlsdGVyU2VxdWVuY2UgPSBtYWtlU2VxdWVuY2UoaXRlcmFibGUpO1xuICBpZiAodXNlS2V5cykge1xuICAgIGZpbHRlclNlcXVlbmNlLmhhcyA9IChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHZhciB2ID0gaXRlcmFibGUuZ2V0KGtleSwgTk9UX1NFVCk7XG4gICAgICByZXR1cm4gdiAhPT0gTk9UX1NFVCAmJiAhIXByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHYsIGtleSwgaXRlcmFibGUpO1xuICAgIH0pO1xuICAgIGZpbHRlclNlcXVlbmNlLmdldCA9IChmdW5jdGlvbihrZXksIG5vdFNldFZhbHVlKSB7XG4gICAgICB2YXIgdiA9IGl0ZXJhYmxlLmdldChrZXksIE5PVF9TRVQpO1xuICAgICAgcmV0dXJuIHYgIT09IE5PVF9TRVQgJiYgcHJlZGljYXRlLmNhbGwoY29udGV4dCwgdiwga2V5LCBpdGVyYWJsZSkgPyB2IDogbm90U2V0VmFsdWU7XG4gICAgfSk7XG4gIH1cbiAgZmlsdGVyU2VxdWVuY2UuX19pdGVyYXRlVW5jYWNoZWQgPSBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgaXRlcmFibGUuX19pdGVyYXRlKChmdW5jdGlvbih2LCBrLCBjKSB7XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwoY29udGV4dCwgdiwgaywgYykpIHtcbiAgICAgICAgaXRlcmF0aW9ucysrO1xuICAgICAgICByZXR1cm4gZm4odiwgdXNlS2V5cyA/IGsgOiBpdGVyYXRpb25zIC0gMSwgJF9fMCk7XG4gICAgICB9XG4gICAgfSksIHJldmVyc2UpO1xuICAgIHJldHVybiBpdGVyYXRpb25zO1xuICB9O1xuICBmaWx0ZXJTZXF1ZW5jZS5fX2l0ZXJhdG9yVW5jYWNoZWQgPSBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgdmFyIGl0ZXJhdG9yID0gaXRlcmFibGUuX19pdGVyYXRvcihJVEVSQVRFX0VOVFJJRVMsIHJldmVyc2UpO1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIHZhciBzdGVwID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICBpZiAoc3RlcC5kb25lKSB7XG4gICAgICAgICAgcmV0dXJuIHN0ZXA7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGVudHJ5ID0gc3RlcC52YWx1ZTtcbiAgICAgICAgdmFyIGtleSA9IGVudHJ5WzBdO1xuICAgICAgICB2YXIgdmFsdWUgPSBlbnRyeVsxXTtcbiAgICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBrZXksIGl0ZXJhYmxlKSkge1xuICAgICAgICAgIHJldHVybiBpdGVyYXRvclZhbHVlKHR5cGUsIHVzZUtleXMgPyBrZXkgOiBpdGVyYXRpb25zKyssIHZhbHVlLCBzdGVwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pKTtcbiAgfTtcbiAgcmV0dXJuIGZpbHRlclNlcXVlbmNlO1xufVxuZnVuY3Rpb24gY291bnRCeUZhY3RvcnkoaXRlcmFibGUsIGdyb3VwZXIsIGNvbnRleHQpIHtcbiAgdmFyIGdyb3VwcyA9IE1hcCgpLmFzTXV0YWJsZSgpO1xuICBpdGVyYWJsZS5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYsIGspIHtcbiAgICBncm91cHMudXBkYXRlKGdyb3VwZXIuY2FsbChjb250ZXh0LCB2LCBrLCBpdGVyYWJsZSksIDAsIChmdW5jdGlvbihhKSB7XG4gICAgICByZXR1cm4gYSArIDE7XG4gICAgfSkpO1xuICB9KSk7XG4gIHJldHVybiBncm91cHMuYXNJbW11dGFibGUoKTtcbn1cbmZ1bmN0aW9uIGdyb3VwQnlGYWN0b3J5KGl0ZXJhYmxlLCBncm91cGVyLCBjb250ZXh0KSB7XG4gIHZhciBpc0tleWVkSXRlciA9IGlzS2V5ZWQoaXRlcmFibGUpO1xuICB2YXIgZ3JvdXBzID0gTWFwKCkuYXNNdXRhYmxlKCk7XG4gIGl0ZXJhYmxlLl9faXRlcmF0ZSgoZnVuY3Rpb24odiwgaykge1xuICAgIGdyb3Vwcy51cGRhdGUoZ3JvdXBlci5jYWxsKGNvbnRleHQsIHYsIGssIGl0ZXJhYmxlKSwgW10sIChmdW5jdGlvbihhKSB7XG4gICAgICByZXR1cm4gKGEucHVzaChpc0tleWVkSXRlciA/IFtrLCB2XSA6IHYpLCBhKTtcbiAgICB9KSk7XG4gIH0pKTtcbiAgdmFyIGNvZXJjZSA9IGl0ZXJhYmxlQ2xhc3MoaXRlcmFibGUpO1xuICByZXR1cm4gZ3JvdXBzLm1hcCgoZnVuY3Rpb24oYXJyKSB7XG4gICAgcmV0dXJuIHJlaWZ5KGl0ZXJhYmxlLCBjb2VyY2UoYXJyKSk7XG4gIH0pKTtcbn1cbmZ1bmN0aW9uIHRha2VGYWN0b3J5KGl0ZXJhYmxlLCBhbW91bnQpIHtcbiAgaWYgKGFtb3VudCA+IGl0ZXJhYmxlLnNpemUpIHtcbiAgICByZXR1cm4gaXRlcmFibGU7XG4gIH1cbiAgaWYgKGFtb3VudCA8IDApIHtcbiAgICBhbW91bnQgPSAwO1xuICB9XG4gIHZhciB0YWtlU2VxdWVuY2UgPSBtYWtlU2VxdWVuY2UoaXRlcmFibGUpO1xuICB0YWtlU2VxdWVuY2Uuc2l6ZSA9IGl0ZXJhYmxlLnNpemUgJiYgTWF0aC5taW4oaXRlcmFibGUuc2l6ZSwgYW1vdW50KTtcbiAgdGFrZVNlcXVlbmNlLl9faXRlcmF0ZVVuY2FjaGVkID0gZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgaWYgKGFtb3VudCA9PT0gMCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZShmbiwgcmV2ZXJzZSk7XG4gICAgfVxuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICBpdGVyYWJsZS5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYsIGspIHtcbiAgICAgIHJldHVybiArK2l0ZXJhdGlvbnMgJiYgZm4odiwgaywgJF9fMCkgIT09IGZhbHNlICYmIGl0ZXJhdGlvbnMgPCBhbW91bnQ7XG4gICAgfSkpO1xuICAgIHJldHVybiBpdGVyYXRpb25zO1xuICB9O1xuICB0YWtlU2VxdWVuY2UuX19pdGVyYXRvclVuY2FjaGVkID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0b3IodHlwZSwgcmV2ZXJzZSk7XG4gICAgfVxuICAgIHZhciBpdGVyYXRvciA9IGFtb3VudCAmJiBpdGVyYWJsZS5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgIGlmIChpdGVyYXRpb25zKysgPiBhbW91bnQpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yRG9uZSgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGl0ZXJhdG9yLm5leHQoKTtcbiAgICB9KSk7XG4gIH07XG4gIHJldHVybiB0YWtlU2VxdWVuY2U7XG59XG5mdW5jdGlvbiB0YWtlV2hpbGVGYWN0b3J5KGl0ZXJhYmxlLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgdmFyIHRha2VTZXF1ZW5jZSA9IG1ha2VTZXF1ZW5jZShpdGVyYWJsZSk7XG4gIHRha2VTZXF1ZW5jZS5fX2l0ZXJhdGVVbmNhY2hlZCA9IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZShmbiwgcmV2ZXJzZSk7XG4gICAgfVxuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICBpdGVyYWJsZS5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYsIGssIGMpIHtcbiAgICAgIHJldHVybiBwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2LCBrLCBjKSAmJiArK2l0ZXJhdGlvbnMgJiYgZm4odiwgaywgJF9fMCk7XG4gICAgfSkpO1xuICAgIHJldHVybiBpdGVyYXRpb25zO1xuICB9O1xuICB0YWtlU2VxdWVuY2UuX19pdGVyYXRvclVuY2FjaGVkID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICAgIH1cbiAgICB2YXIgaXRlcmF0b3IgPSBpdGVyYWJsZS5fX2l0ZXJhdG9yKElURVJBVEVfRU5UUklFUywgcmV2ZXJzZSk7XG4gICAgdmFyIGl0ZXJhdGluZyA9IHRydWU7XG4gICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoIWl0ZXJhdGluZykge1xuICAgICAgICByZXR1cm4gaXRlcmF0b3JEb25lKCk7XG4gICAgICB9XG4gICAgICB2YXIgc3RlcCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgIGlmIChzdGVwLmRvbmUpIHtcbiAgICAgICAgcmV0dXJuIHN0ZXA7XG4gICAgICB9XG4gICAgICB2YXIgZW50cnkgPSBzdGVwLnZhbHVlO1xuICAgICAgdmFyIGsgPSBlbnRyeVswXTtcbiAgICAgIHZhciB2ID0gZW50cnlbMV07XG4gICAgICBpZiAoIXByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHYsIGssICRfXzApKSB7XG4gICAgICAgIGl0ZXJhdGluZyA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gaXRlcmF0b3JEb25lKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHlwZSA9PT0gSVRFUkFURV9FTlRSSUVTID8gc3RlcCA6IGl0ZXJhdG9yVmFsdWUodHlwZSwgaywgdiwgc3RlcCk7XG4gICAgfSkpO1xuICB9O1xuICByZXR1cm4gdGFrZVNlcXVlbmNlO1xufVxuZnVuY3Rpb24gc2tpcEZhY3RvcnkoaXRlcmFibGUsIGFtb3VudCwgdXNlS2V5cykge1xuICBpZiAoYW1vdW50IDw9IDApIHtcbiAgICByZXR1cm4gaXRlcmFibGU7XG4gIH1cbiAgdmFyIHNraXBTZXF1ZW5jZSA9IG1ha2VTZXF1ZW5jZShpdGVyYWJsZSk7XG4gIHNraXBTZXF1ZW5jZS5zaXplID0gaXRlcmFibGUuc2l6ZSAmJiBNYXRoLm1heCgwLCBpdGVyYWJsZS5zaXplIC0gYW1vdW50KTtcbiAgc2tpcFNlcXVlbmNlLl9faXRlcmF0ZVVuY2FjaGVkID0gZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgaWYgKHJldmVyc2UpIHtcbiAgICAgIHJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRlKGZuLCByZXZlcnNlKTtcbiAgICB9XG4gICAgdmFyIHNraXBwZWQgPSAwO1xuICAgIHZhciBpc1NraXBwaW5nID0gdHJ1ZTtcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgaXRlcmFibGUuX19pdGVyYXRlKChmdW5jdGlvbih2LCBrKSB7XG4gICAgICBpZiAoIShpc1NraXBwaW5nICYmIChpc1NraXBwaW5nID0gc2tpcHBlZCsrIDwgYW1vdW50KSkpIHtcbiAgICAgICAgaXRlcmF0aW9ucysrO1xuICAgICAgICByZXR1cm4gZm4odiwgdXNlS2V5cyA/IGsgOiBpdGVyYXRpb25zIC0gMSwgJF9fMCk7XG4gICAgICB9XG4gICAgfSkpO1xuICAgIHJldHVybiBpdGVyYXRpb25zO1xuICB9O1xuICBza2lwU2VxdWVuY2UuX19pdGVyYXRvclVuY2FjaGVkID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0b3IodHlwZSwgcmV2ZXJzZSk7XG4gICAgfVxuICAgIHZhciBpdGVyYXRvciA9IGFtb3VudCAmJiBpdGVyYWJsZS5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICAgIHZhciBza2lwcGVkID0gMDtcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICB3aGlsZSAoc2tpcHBlZCA8IGFtb3VudCkge1xuICAgICAgICBza2lwcGVkKys7XG4gICAgICAgIGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgIH1cbiAgICAgIHZhciBzdGVwID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgaWYgKHVzZUtleXMgfHwgdHlwZSA9PT0gSVRFUkFURV9WQUxVRVMpIHtcbiAgICAgICAgcmV0dXJuIHN0ZXA7XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09IElURVJBVEVfS0VZUykge1xuICAgICAgICByZXR1cm4gaXRlcmF0b3JWYWx1ZSh0eXBlLCBpdGVyYXRpb25zKyssIHVuZGVmaW5lZCwgc3RlcCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gaXRlcmF0b3JWYWx1ZSh0eXBlLCBpdGVyYXRpb25zKyssIHN0ZXAudmFsdWVbMV0sIHN0ZXApO1xuICAgICAgfVxuICAgIH0pKTtcbiAgfTtcbiAgcmV0dXJuIHNraXBTZXF1ZW5jZTtcbn1cbmZ1bmN0aW9uIHNraXBXaGlsZUZhY3RvcnkoaXRlcmFibGUsIHByZWRpY2F0ZSwgY29udGV4dCwgdXNlS2V5cykge1xuICB2YXIgc2tpcFNlcXVlbmNlID0gbWFrZVNlcXVlbmNlKGl0ZXJhYmxlKTtcbiAgc2tpcFNlcXVlbmNlLl9faXRlcmF0ZVVuY2FjaGVkID0gZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgaWYgKHJldmVyc2UpIHtcbiAgICAgIHJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRlKGZuLCByZXZlcnNlKTtcbiAgICB9XG4gICAgdmFyIGlzU2tpcHBpbmcgPSB0cnVlO1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICBpdGVyYWJsZS5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYsIGssIGMpIHtcbiAgICAgIGlmICghKGlzU2tpcHBpbmcgJiYgKGlzU2tpcHBpbmcgPSBwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2LCBrLCBjKSkpKSB7XG4gICAgICAgIGl0ZXJhdGlvbnMrKztcbiAgICAgICAgcmV0dXJuIGZuKHYsIHVzZUtleXMgPyBrIDogaXRlcmF0aW9ucyAtIDEsICRfXzApO1xuICAgICAgfVxuICAgIH0pKTtcbiAgICByZXR1cm4gaXRlcmF0aW9ucztcbiAgfTtcbiAgc2tpcFNlcXVlbmNlLl9faXRlcmF0b3JVbmNhY2hlZCA9IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgaWYgKHJldmVyc2UpIHtcbiAgICAgIHJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcih0eXBlLCByZXZlcnNlKTtcbiAgICB9XG4gICAgdmFyIGl0ZXJhdG9yID0gaXRlcmFibGUuX19pdGVyYXRvcihJVEVSQVRFX0VOVFJJRVMsIHJldmVyc2UpO1xuICAgIHZhciBza2lwcGluZyA9IHRydWU7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHN0ZXAsXG4gICAgICAgICAgayxcbiAgICAgICAgICB2O1xuICAgICAgZG8ge1xuICAgICAgICBzdGVwID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICBpZiAoc3RlcC5kb25lKSB7XG4gICAgICAgICAgaWYgKHVzZUtleXMgfHwgdHlwZSA9PT0gSVRFUkFURV9WQUxVRVMpIHtcbiAgICAgICAgICAgIHJldHVybiBzdGVwO1xuICAgICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gSVRFUkFURV9LRVlTKSB7XG4gICAgICAgICAgICByZXR1cm4gaXRlcmF0b3JWYWx1ZSh0eXBlLCBpdGVyYXRpb25zKyssIHVuZGVmaW5lZCwgc3RlcCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBpdGVyYXRvclZhbHVlKHR5cGUsIGl0ZXJhdGlvbnMrKywgc3RlcC52YWx1ZVsxXSwgc3RlcCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBlbnRyeSA9IHN0ZXAudmFsdWU7XG4gICAgICAgIGsgPSBlbnRyeVswXTtcbiAgICAgICAgdiA9IGVudHJ5WzFdO1xuICAgICAgICBza2lwcGluZyAmJiAoc2tpcHBpbmcgPSBwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2LCBrLCAkX18wKSk7XG4gICAgICB9IHdoaWxlIChza2lwcGluZyk7XG4gICAgICByZXR1cm4gdHlwZSA9PT0gSVRFUkFURV9FTlRSSUVTID8gc3RlcCA6IGl0ZXJhdG9yVmFsdWUodHlwZSwgaywgdiwgc3RlcCk7XG4gICAgfSkpO1xuICB9O1xuICByZXR1cm4gc2tpcFNlcXVlbmNlO1xufVxuZnVuY3Rpb24gY29uY2F0RmFjdG9yeShpdGVyYWJsZSwgdmFsdWVzLCB1c2VLZXlzKSB7XG4gIHZhciBpc0tleWVkSXRlciA9IGlzS2V5ZWQoaXRlcmFibGUpO1xuICB2YXIgaXRlcnMgPSBuZXcgQXJyYXlTZXEoW2l0ZXJhYmxlXS5jb25jYXQodmFsdWVzKSkubWFwKChmdW5jdGlvbih2KSB7XG4gICAgaWYgKCFpc0l0ZXJhYmxlKHYpKSB7XG4gICAgICB2ID0gc2VxRnJvbVZhbHVlKHYsIHRydWUpO1xuICAgIH1cbiAgICBpZiAoaXNLZXllZEl0ZXIpIHtcbiAgICAgIHYgPSBLZXllZEl0ZXJhYmxlKHYpO1xuICAgIH1cbiAgICByZXR1cm4gdjtcbiAgfSkpO1xuICBpZiAoaXNLZXllZEl0ZXIpIHtcbiAgICBpdGVycyA9IGl0ZXJzLnRvS2V5ZWRTZXEoKTtcbiAgfSBlbHNlIGlmICghaXNJbmRleGVkKGl0ZXJhYmxlKSkge1xuICAgIGl0ZXJzID0gaXRlcnMudG9TZXRTZXEoKTtcbiAgfVxuICB2YXIgZmxhdCA9IGl0ZXJzLmZsYXR0ZW4odHJ1ZSk7XG4gIGZsYXQuc2l6ZSA9IGl0ZXJzLnJlZHVjZSgoZnVuY3Rpb24oc3VtLCBzZXEpIHtcbiAgICBpZiAoc3VtICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHZhciBzaXplID0gc2VxLnNpemU7XG4gICAgICBpZiAoc2l6ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBzdW0gKyBzaXplO1xuICAgICAgfVxuICAgIH1cbiAgfSksIDApO1xuICByZXR1cm4gZmxhdDtcbn1cbmZ1bmN0aW9uIGZsYXR0ZW5GYWN0b3J5KGl0ZXJhYmxlLCBkZXB0aCwgdXNlS2V5cykge1xuICB2YXIgZmxhdFNlcXVlbmNlID0gbWFrZVNlcXVlbmNlKGl0ZXJhYmxlKTtcbiAgZmxhdFNlcXVlbmNlLl9faXRlcmF0ZVVuY2FjaGVkID0gZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgdmFyIHN0b3BwZWQgPSBmYWxzZTtcbiAgICBmdW5jdGlvbiBmbGF0RGVlcChpdGVyLCBjdXJyZW50RGVwdGgpIHtcbiAgICAgIHZhciAkX18wID0gdGhpcztcbiAgICAgIGl0ZXIuX19pdGVyYXRlKChmdW5jdGlvbih2LCBrKSB7XG4gICAgICAgIGlmICgoIWRlcHRoIHx8IGN1cnJlbnREZXB0aCA8IGRlcHRoKSAmJiBpc0l0ZXJhYmxlKHYpKSB7XG4gICAgICAgICAgZmxhdERlZXAodiwgY3VycmVudERlcHRoICsgMSk7XG4gICAgICAgIH0gZWxzZSBpZiAoZm4odiwgdXNlS2V5cyA/IGsgOiBpdGVyYXRpb25zKyssICRfXzApID09PSBmYWxzZSkge1xuICAgICAgICAgIHN0b3BwZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAhc3RvcHBlZDtcbiAgICAgIH0pLCByZXZlcnNlKTtcbiAgICB9XG4gICAgZmxhdERlZXAoaXRlcmFibGUsIDApO1xuICAgIHJldHVybiBpdGVyYXRpb25zO1xuICB9O1xuICBmbGF0U2VxdWVuY2UuX19pdGVyYXRvclVuY2FjaGVkID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHZhciBpdGVyYXRvciA9IGl0ZXJhYmxlLl9faXRlcmF0b3IodHlwZSwgcmV2ZXJzZSk7XG4gICAgdmFyIHN0YWNrID0gW107XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgd2hpbGUgKGl0ZXJhdG9yKSB7XG4gICAgICAgIHZhciBzdGVwID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICBpZiAoc3RlcC5kb25lICE9PSBmYWxzZSkge1xuICAgICAgICAgIGl0ZXJhdG9yID0gc3RhY2sucG9wKCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHYgPSBzdGVwLnZhbHVlO1xuICAgICAgICBpZiAodHlwZSA9PT0gSVRFUkFURV9FTlRSSUVTKSB7XG4gICAgICAgICAgdiA9IHZbMV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCghZGVwdGggfHwgc3RhY2subGVuZ3RoIDwgZGVwdGgpICYmIGlzSXRlcmFibGUodikpIHtcbiAgICAgICAgICBzdGFjay5wdXNoKGl0ZXJhdG9yKTtcbiAgICAgICAgICBpdGVyYXRvciA9IHYuX19pdGVyYXRvcih0eXBlLCByZXZlcnNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdXNlS2V5cyA/IHN0ZXAgOiBpdGVyYXRvclZhbHVlKHR5cGUsIGl0ZXJhdGlvbnMrKywgdiwgc3RlcCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBpdGVyYXRvckRvbmUoKTtcbiAgICB9KSk7XG4gIH07XG4gIHJldHVybiBmbGF0U2VxdWVuY2U7XG59XG5mdW5jdGlvbiBmbGF0TWFwRmFjdG9yeShpdGVyYWJsZSwgbWFwcGVyLCBjb250ZXh0KSB7XG4gIHZhciBjb2VyY2UgPSBpdGVyYWJsZUNsYXNzKGl0ZXJhYmxlKTtcbiAgcmV0dXJuIGl0ZXJhYmxlLnRvU2VxKCkubWFwKChmdW5jdGlvbih2LCBrKSB7XG4gICAgcmV0dXJuIGNvZXJjZShtYXBwZXIuY2FsbChjb250ZXh0LCB2LCBrLCBpdGVyYWJsZSkpO1xuICB9KSkuZmxhdHRlbih0cnVlKTtcbn1cbmZ1bmN0aW9uIGludGVycG9zZUZhY3RvcnkoaXRlcmFibGUsIHNlcGFyYXRvcikge1xuICB2YXIgaW50ZXJwb3NlZFNlcXVlbmNlID0gbWFrZVNlcXVlbmNlKGl0ZXJhYmxlKTtcbiAgaW50ZXJwb3NlZFNlcXVlbmNlLnNpemUgPSBpdGVyYWJsZS5zaXplICYmIGl0ZXJhYmxlLnNpemUgKiAyIC0gMTtcbiAgaW50ZXJwb3NlZFNlcXVlbmNlLl9faXRlcmF0ZVVuY2FjaGVkID0gZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIGl0ZXJhYmxlLl9faXRlcmF0ZSgoZnVuY3Rpb24odiwgaykge1xuICAgICAgcmV0dXJuICghaXRlcmF0aW9ucyB8fCBmbihzZXBhcmF0b3IsIGl0ZXJhdGlvbnMrKywgJF9fMCkgIT09IGZhbHNlKSAmJiBmbih2LCBpdGVyYXRpb25zKyssICRfXzApICE9PSBmYWxzZTtcbiAgICB9KSwgcmV2ZXJzZSk7XG4gICAgcmV0dXJuIGl0ZXJhdGlvbnM7XG4gIH07XG4gIGludGVycG9zZWRTZXF1ZW5jZS5fX2l0ZXJhdG9yVW5jYWNoZWQgPSBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgdmFyIGl0ZXJhdG9yID0gaXRlcmFibGUuX19pdGVyYXRvcihJVEVSQVRFX1ZBTFVFUywgcmV2ZXJzZSk7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIHZhciBzdGVwO1xuICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCFzdGVwIHx8IGl0ZXJhdGlvbnMgJSAyKSB7XG4gICAgICAgIHN0ZXAgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIGlmIChzdGVwLmRvbmUpIHtcbiAgICAgICAgICByZXR1cm4gc3RlcDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGl0ZXJhdGlvbnMgJSAyID8gaXRlcmF0b3JWYWx1ZSh0eXBlLCBpdGVyYXRpb25zKyssIHNlcGFyYXRvcikgOiBpdGVyYXRvclZhbHVlKHR5cGUsIGl0ZXJhdGlvbnMrKywgc3RlcC52YWx1ZSwgc3RlcCk7XG4gICAgfSkpO1xuICB9O1xuICByZXR1cm4gaW50ZXJwb3NlZFNlcXVlbmNlO1xufVxuZnVuY3Rpb24gcmVpZnkoaXRlciwgc2VxKSB7XG4gIHJldHVybiBpc1NlcShpdGVyKSA/IHNlcSA6IGl0ZXIuY29uc3RydWN0b3Ioc2VxKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlRW50cnkoZW50cnkpIHtcbiAgaWYgKGVudHJ5ICE9PSBPYmplY3QoZW50cnkpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgW0ssIFZdIHR1cGxlOiAnICsgZW50cnkpO1xuICB9XG59XG5mdW5jdGlvbiByZXNvbHZlU2l6ZShpdGVyKSB7XG4gIGFzc2VydE5vdEluZmluaXRlKGl0ZXIuc2l6ZSk7XG4gIHJldHVybiBlbnN1cmVTaXplKGl0ZXIpO1xufVxuZnVuY3Rpb24gaXRlcmFibGVDbGFzcyhpdGVyYWJsZSkge1xuICByZXR1cm4gaXNLZXllZChpdGVyYWJsZSkgPyBLZXllZEl0ZXJhYmxlIDogaXNJbmRleGVkKGl0ZXJhYmxlKSA/IEluZGV4ZWRJdGVyYWJsZSA6IFNldEl0ZXJhYmxlO1xufVxuZnVuY3Rpb24gbWFrZVNlcXVlbmNlKGl0ZXJhYmxlKSB7XG4gIHJldHVybiBPYmplY3QuY3JlYXRlKChpc0tleWVkKGl0ZXJhYmxlKSA/IEtleWVkU2VxIDogaXNJbmRleGVkKGl0ZXJhYmxlKSA/IEluZGV4ZWRTZXEgOiBTZXRTZXEpLnByb3RvdHlwZSk7XG59XG5mdW5jdGlvbiBjYWNoZVJlc3VsdFRocm91Z2goKSB7XG4gIGlmICh0aGlzLl9pdGVyLmNhY2hlUmVzdWx0KSB7XG4gICAgdGhpcy5faXRlci5jYWNoZVJlc3VsdCgpO1xuICAgIHRoaXMuc2l6ZSA9IHRoaXMuX2l0ZXIuc2l6ZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gU2VxLnByb3RvdHlwZS5jYWNoZVJlc3VsdC5jYWxsKHRoaXMpO1xuICB9XG59XG52YXIgTGlzdCA9IGZ1bmN0aW9uIExpc3QodmFsdWUpIHtcbiAgdmFyIGVtcHR5ID0gZW1wdHlMaXN0KCk7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIGVtcHR5O1xuICB9XG4gIGlmICh2YWx1ZSAmJiB2YWx1ZS5jb25zdHJ1Y3RvciA9PT0gJExpc3QpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgdmFsdWUgPSBJdGVyYWJsZSh2YWx1ZSk7XG4gIHZhciBzaXplID0gdmFsdWUuc2l6ZTtcbiAgaWYgKHNpemUgPT09IDApIHtcbiAgICByZXR1cm4gZW1wdHk7XG4gIH1cbiAgaWYgKHNpemUgPiAwICYmIHNpemUgPCBTSVpFKSB7XG4gICAgcmV0dXJuIG1ha2VMaXN0KDAsIHNpemUsIFNISUZULCBudWxsLCBuZXcgVk5vZGUodmFsdWUudG9BcnJheSgpKSk7XG4gIH1cbiAgcmV0dXJuIGVtcHR5Lm1lcmdlKHZhbHVlKTtcbn07XG52YXIgJExpc3QgPSBMaXN0O1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoTGlzdCwge1xuICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX190b1N0cmluZygnTGlzdCBbJywgJ10nKTtcbiAgfSxcbiAgZ2V0OiBmdW5jdGlvbihpbmRleCwgbm90U2V0VmFsdWUpIHtcbiAgICBpbmRleCA9IHdyYXBJbmRleCh0aGlzLCBpbmRleCk7XG4gICAgaWYgKGluZGV4IDwgMCB8fCBpbmRleCA+PSB0aGlzLnNpemUpIHtcbiAgICAgIHJldHVybiBub3RTZXRWYWx1ZTtcbiAgICB9XG4gICAgaW5kZXggKz0gdGhpcy5fb3JpZ2luO1xuICAgIHZhciBub2RlID0gbGlzdE5vZGVGb3IodGhpcywgaW5kZXgpO1xuICAgIHJldHVybiBub2RlICYmIG5vZGUuYXJyYXlbaW5kZXggJiBNQVNLXTtcbiAgfSxcbiAgc2V0OiBmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcbiAgICByZXR1cm4gdXBkYXRlTGlzdCh0aGlzLCBpbmRleCwgdmFsdWUpO1xuICB9LFxuICByZW1vdmU6IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgcmV0dXJuICF0aGlzLmhhcyhpbmRleCkgPyB0aGlzIDogaW5kZXggPT09IDAgPyB0aGlzLnNoaWZ0KCkgOiBpbmRleCA9PT0gdGhpcy5zaXplIC0gMSA/IHRoaXMucG9wKCkgOiB0aGlzLnNwbGljZShpbmRleCwgMSk7XG4gIH0sXG4gIGNsZWFyOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5zaXplID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgaWYgKHRoaXMuX19vd25lcklEKSB7XG4gICAgICB0aGlzLnNpemUgPSB0aGlzLl9vcmlnaW4gPSB0aGlzLl9jYXBhY2l0eSA9IDA7XG4gICAgICB0aGlzLl9sZXZlbCA9IFNISUZUO1xuICAgICAgdGhpcy5fcm9vdCA9IHRoaXMuX3RhaWwgPSBudWxsO1xuICAgICAgdGhpcy5fX2hhc2ggPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9fYWx0ZXJlZCA9IHRydWU7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIGVtcHR5TGlzdCgpO1xuICB9LFxuICBwdXNoOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsdWVzID0gYXJndW1lbnRzO1xuICAgIHZhciBvbGRTaXplID0gdGhpcy5zaXplO1xuICAgIHJldHVybiB0aGlzLndpdGhNdXRhdGlvbnMoKGZ1bmN0aW9uKGxpc3QpIHtcbiAgICAgIHNldExpc3RCb3VuZHMobGlzdCwgMCwgb2xkU2l6ZSArIHZhbHVlcy5sZW5ndGgpO1xuICAgICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IHZhbHVlcy5sZW5ndGg7IGlpKyspIHtcbiAgICAgICAgbGlzdC5zZXQob2xkU2l6ZSArIGlpLCB2YWx1ZXNbaWldKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gIH0sXG4gIHBvcDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHNldExpc3RCb3VuZHModGhpcywgMCwgLTEpO1xuICB9LFxuICB1bnNoaWZ0OiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsdWVzID0gYXJndW1lbnRzO1xuICAgIHJldHVybiB0aGlzLndpdGhNdXRhdGlvbnMoKGZ1bmN0aW9uKGxpc3QpIHtcbiAgICAgIHNldExpc3RCb3VuZHMobGlzdCwgLXZhbHVlcy5sZW5ndGgpO1xuICAgICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IHZhbHVlcy5sZW5ndGg7IGlpKyspIHtcbiAgICAgICAgbGlzdC5zZXQoaWksIHZhbHVlc1tpaV0pO1xuICAgICAgfVxuICAgIH0pKTtcbiAgfSxcbiAgc2hpZnQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzZXRMaXN0Qm91bmRzKHRoaXMsIDEpO1xuICB9LFxuICBtZXJnZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG1lcmdlSW50b0xpc3RXaXRoKHRoaXMsIHVuZGVmaW5lZCwgYXJndW1lbnRzKTtcbiAgfSxcbiAgbWVyZ2VXaXRoOiBmdW5jdGlvbihtZXJnZXIpIHtcbiAgICBmb3IgKHZhciBpdGVycyA9IFtdLFxuICAgICAgICAkX182ID0gMTsgJF9fNiA8IGFyZ3VtZW50cy5sZW5ndGg7ICRfXzYrKylcbiAgICAgIGl0ZXJzWyRfXzYgLSAxXSA9IGFyZ3VtZW50c1skX182XTtcbiAgICByZXR1cm4gbWVyZ2VJbnRvTGlzdFdpdGgodGhpcywgbWVyZ2VyLCBpdGVycyk7XG4gIH0sXG4gIG1lcmdlRGVlcDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG1lcmdlSW50b0xpc3RXaXRoKHRoaXMsIGRlZXBNZXJnZXIodW5kZWZpbmVkKSwgYXJndW1lbnRzKTtcbiAgfSxcbiAgbWVyZ2VEZWVwV2l0aDogZnVuY3Rpb24obWVyZ2VyKSB7XG4gICAgZm9yICh2YXIgaXRlcnMgPSBbXSxcbiAgICAgICAgJF9fNyA9IDE7ICRfXzcgPCBhcmd1bWVudHMubGVuZ3RoOyAkX183KyspXG4gICAgICBpdGVyc1skX183IC0gMV0gPSBhcmd1bWVudHNbJF9fN107XG4gICAgcmV0dXJuIG1lcmdlSW50b0xpc3RXaXRoKHRoaXMsIGRlZXBNZXJnZXIobWVyZ2VyKSwgaXRlcnMpO1xuICB9LFxuICBzZXRTaXplOiBmdW5jdGlvbihzaXplKSB7XG4gICAgcmV0dXJuIHNldExpc3RCb3VuZHModGhpcywgMCwgc2l6ZSk7XG4gIH0sXG4gIHNsaWNlOiBmdW5jdGlvbihiZWdpbiwgZW5kKSB7XG4gICAgdmFyIHNpemUgPSB0aGlzLnNpemU7XG4gICAgaWYgKHdob2xlU2xpY2UoYmVnaW4sIGVuZCwgc2l6ZSkpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gc2V0TGlzdEJvdW5kcyh0aGlzLCByZXNvbHZlQmVnaW4oYmVnaW4sIHNpemUpLCByZXNvbHZlRW5kKGVuZCwgc2l6ZSkpO1xuICB9LFxuICBfX2l0ZXJhdG9yOiBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgcmV0dXJuIG5ldyBMaXN0SXRlcmF0b3IodGhpcywgdHlwZSwgcmV2ZXJzZSk7XG4gIH0sXG4gIF9faXRlcmF0ZTogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIHZhciBlYWNoRm4gPSAoZnVuY3Rpb24odikge1xuICAgICAgcmV0dXJuIGZuKHYsIGl0ZXJhdGlvbnMrKywgJF9fMCk7XG4gICAgfSk7XG4gICAgdmFyIHRhaWxPZmZzZXQgPSBnZXRUYWlsT2Zmc2V0KHRoaXMuX2NhcGFjaXR5KTtcbiAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgaXRlcmF0ZVZOb2RlKHRoaXMuX3RhaWwsIDAsIHRhaWxPZmZzZXQgLSB0aGlzLl9vcmlnaW4sIHRoaXMuX2NhcGFjaXR5IC0gdGhpcy5fb3JpZ2luLCBlYWNoRm4sIHJldmVyc2UpICYmIGl0ZXJhdGVWTm9kZSh0aGlzLl9yb290LCB0aGlzLl9sZXZlbCwgLXRoaXMuX29yaWdpbiwgdGFpbE9mZnNldCAtIHRoaXMuX29yaWdpbiwgZWFjaEZuLCByZXZlcnNlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaXRlcmF0ZVZOb2RlKHRoaXMuX3Jvb3QsIHRoaXMuX2xldmVsLCAtdGhpcy5fb3JpZ2luLCB0YWlsT2Zmc2V0IC0gdGhpcy5fb3JpZ2luLCBlYWNoRm4sIHJldmVyc2UpICYmIGl0ZXJhdGVWTm9kZSh0aGlzLl90YWlsLCAwLCB0YWlsT2Zmc2V0IC0gdGhpcy5fb3JpZ2luLCB0aGlzLl9jYXBhY2l0eSAtIHRoaXMuX29yaWdpbiwgZWFjaEZuLCByZXZlcnNlKTtcbiAgICB9XG4gICAgcmV0dXJuIGl0ZXJhdGlvbnM7XG4gIH0sXG4gIF9fZW5zdXJlT3duZXI6IGZ1bmN0aW9uKG93bmVySUQpIHtcbiAgICBpZiAob3duZXJJRCA9PT0gdGhpcy5fX293bmVySUQpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBpZiAoIW93bmVySUQpIHtcbiAgICAgIHRoaXMuX19vd25lcklEID0gb3duZXJJRDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gbWFrZUxpc3QodGhpcy5fb3JpZ2luLCB0aGlzLl9jYXBhY2l0eSwgdGhpcy5fbGV2ZWwsIHRoaXMuX3Jvb3QsIHRoaXMuX3RhaWwsIG93bmVySUQsIHRoaXMuX19oYXNoKTtcbiAgfVxufSwge29mOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcyhhcmd1bWVudHMpO1xuICB9fSwgSW5kZXhlZENvbGxlY3Rpb24pO1xuZnVuY3Rpb24gaXNMaXN0KG1heWJlTGlzdCkge1xuICByZXR1cm4gISEobWF5YmVMaXN0ICYmIG1heWJlTGlzdFtJU19MSVNUX1NFTlRJTkVMXSk7XG59XG5MaXN0LmlzTGlzdCA9IGlzTGlzdDtcbnZhciBJU19MSVNUX1NFTlRJTkVMID0gJ0BAX19JTU1VVEFCTEVfTElTVF9fQEAnO1xudmFyIExpc3RQcm90b3R5cGUgPSBMaXN0LnByb3RvdHlwZTtcbkxpc3RQcm90b3R5cGVbSVNfTElTVF9TRU5USU5FTF0gPSB0cnVlO1xuTGlzdFByb3RvdHlwZVtERUxFVEVdID0gTGlzdFByb3RvdHlwZS5yZW1vdmU7XG5MaXN0UHJvdG90eXBlLnNldEluID0gTWFwUHJvdG90eXBlLnNldEluO1xuTGlzdFByb3RvdHlwZS5yZW1vdmVJbiA9IE1hcFByb3RvdHlwZS5yZW1vdmVJbjtcbkxpc3RQcm90b3R5cGUudXBkYXRlID0gTWFwUHJvdG90eXBlLnVwZGF0ZTtcbkxpc3RQcm90b3R5cGUudXBkYXRlSW4gPSBNYXBQcm90b3R5cGUudXBkYXRlSW47XG5MaXN0UHJvdG90eXBlLndpdGhNdXRhdGlvbnMgPSBNYXBQcm90b3R5cGUud2l0aE11dGF0aW9ucztcbkxpc3RQcm90b3R5cGUuYXNNdXRhYmxlID0gTWFwUHJvdG90eXBlLmFzTXV0YWJsZTtcbkxpc3RQcm90b3R5cGUuYXNJbW11dGFibGUgPSBNYXBQcm90b3R5cGUuYXNJbW11dGFibGU7XG5MaXN0UHJvdG90eXBlLndhc0FsdGVyZWQgPSBNYXBQcm90b3R5cGUud2FzQWx0ZXJlZDtcbnZhciBWTm9kZSA9IGZ1bmN0aW9uIFZOb2RlKGFycmF5LCBvd25lcklEKSB7XG4gIHRoaXMuYXJyYXkgPSBhcnJheTtcbiAgdGhpcy5vd25lcklEID0gb3duZXJJRDtcbn07XG52YXIgJFZOb2RlID0gVk5vZGU7XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShWTm9kZSwge1xuICByZW1vdmVCZWZvcmU6IGZ1bmN0aW9uKG93bmVySUQsIGxldmVsLCBpbmRleCkge1xuICAgIGlmIChpbmRleCA9PT0gbGV2ZWwgPyAxIDw8IGxldmVsIDogMCB8fCB0aGlzLmFycmF5Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciBvcmlnaW5JbmRleCA9IChpbmRleCA+Pj4gbGV2ZWwpICYgTUFTSztcbiAgICBpZiAob3JpZ2luSW5kZXggPj0gdGhpcy5hcnJheS5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBuZXcgJFZOb2RlKFtdLCBvd25lcklEKTtcbiAgICB9XG4gICAgdmFyIHJlbW92aW5nRmlyc3QgPSBvcmlnaW5JbmRleCA9PT0gMDtcbiAgICB2YXIgbmV3Q2hpbGQ7XG4gICAgaWYgKGxldmVsID4gMCkge1xuICAgICAgdmFyIG9sZENoaWxkID0gdGhpcy5hcnJheVtvcmlnaW5JbmRleF07XG4gICAgICBuZXdDaGlsZCA9IG9sZENoaWxkICYmIG9sZENoaWxkLnJlbW92ZUJlZm9yZShvd25lcklELCBsZXZlbCAtIFNISUZULCBpbmRleCk7XG4gICAgICBpZiAobmV3Q2hpbGQgPT09IG9sZENoaWxkICYmIHJlbW92aW5nRmlyc3QpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChyZW1vdmluZ0ZpcnN0ICYmICFuZXdDaGlsZCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciBlZGl0YWJsZSA9IGVkaXRhYmxlVk5vZGUodGhpcywgb3duZXJJRCk7XG4gICAgaWYgKCFyZW1vdmluZ0ZpcnN0KSB7XG4gICAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgb3JpZ2luSW5kZXg7IGlpKyspIHtcbiAgICAgICAgZWRpdGFibGUuYXJyYXlbaWldID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAobmV3Q2hpbGQpIHtcbiAgICAgIGVkaXRhYmxlLmFycmF5W29yaWdpbkluZGV4XSA9IG5ld0NoaWxkO1xuICAgIH1cbiAgICByZXR1cm4gZWRpdGFibGU7XG4gIH0sXG4gIHJlbW92ZUFmdGVyOiBmdW5jdGlvbihvd25lcklELCBsZXZlbCwgaW5kZXgpIHtcbiAgICBpZiAoaW5kZXggPT09IGxldmVsID8gMSA8PCBsZXZlbCA6IDAgfHwgdGhpcy5hcnJheS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgc2l6ZUluZGV4ID0gKChpbmRleCAtIDEpID4+PiBsZXZlbCkgJiBNQVNLO1xuICAgIGlmIChzaXplSW5kZXggPj0gdGhpcy5hcnJheS5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgcmVtb3ZpbmdMYXN0ID0gc2l6ZUluZGV4ID09PSB0aGlzLmFycmF5Lmxlbmd0aCAtIDE7XG4gICAgdmFyIG5ld0NoaWxkO1xuICAgIGlmIChsZXZlbCA+IDApIHtcbiAgICAgIHZhciBvbGRDaGlsZCA9IHRoaXMuYXJyYXlbc2l6ZUluZGV4XTtcbiAgICAgIG5ld0NoaWxkID0gb2xkQ2hpbGQgJiYgb2xkQ2hpbGQucmVtb3ZlQWZ0ZXIob3duZXJJRCwgbGV2ZWwgLSBTSElGVCwgaW5kZXgpO1xuICAgICAgaWYgKG5ld0NoaWxkID09PSBvbGRDaGlsZCAmJiByZW1vdmluZ0xhc3QpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChyZW1vdmluZ0xhc3QgJiYgIW5ld0NoaWxkKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdmFyIGVkaXRhYmxlID0gZWRpdGFibGVWTm9kZSh0aGlzLCBvd25lcklEKTtcbiAgICBpZiAoIXJlbW92aW5nTGFzdCkge1xuICAgICAgZWRpdGFibGUuYXJyYXkucG9wKCk7XG4gICAgfVxuICAgIGlmIChuZXdDaGlsZCkge1xuICAgICAgZWRpdGFibGUuYXJyYXlbc2l6ZUluZGV4XSA9IG5ld0NoaWxkO1xuICAgIH1cbiAgICByZXR1cm4gZWRpdGFibGU7XG4gIH1cbn0sIHt9KTtcbmZ1bmN0aW9uIGl0ZXJhdGVWTm9kZShub2RlLCBsZXZlbCwgb2Zmc2V0LCBtYXgsIGZuLCByZXZlcnNlKSB7XG4gIHZhciBpaTtcbiAgdmFyIGFycmF5ID0gbm9kZSAmJiBub2RlLmFycmF5O1xuICBpZiAobGV2ZWwgPT09IDApIHtcbiAgICB2YXIgZnJvbSA9IG9mZnNldCA8IDAgPyAtb2Zmc2V0IDogMDtcbiAgICB2YXIgdG8gPSBtYXggLSBvZmZzZXQ7XG4gICAgaWYgKHRvID4gU0laRSkge1xuICAgICAgdG8gPSBTSVpFO1xuICAgIH1cbiAgICBmb3IgKGlpID0gZnJvbTsgaWkgPCB0bzsgaWkrKykge1xuICAgICAgaWYgKGZuKGFycmF5ICYmIGFycmF5W3JldmVyc2UgPyBmcm9tICsgdG8gLSAxIC0gaWkgOiBpaV0pID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBzdGVwID0gMSA8PCBsZXZlbDtcbiAgICB2YXIgbmV3TGV2ZWwgPSBsZXZlbCAtIFNISUZUO1xuICAgIGZvciAoaWkgPSAwOyBpaSA8PSBNQVNLOyBpaSsrKSB7XG4gICAgICB2YXIgbGV2ZWxJbmRleCA9IHJldmVyc2UgPyBNQVNLIC0gaWkgOiBpaTtcbiAgICAgIHZhciBuZXdPZmZzZXQgPSBvZmZzZXQgKyAobGV2ZWxJbmRleCA8PCBsZXZlbCk7XG4gICAgICBpZiAobmV3T2Zmc2V0IDwgbWF4ICYmIG5ld09mZnNldCArIHN0ZXAgPiAwKSB7XG4gICAgICAgIHZhciBuZXh0Tm9kZSA9IGFycmF5ICYmIGFycmF5W2xldmVsSW5kZXhdO1xuICAgICAgICBpZiAoIWl0ZXJhdGVWTm9kZShuZXh0Tm9kZSwgbmV3TGV2ZWwsIG5ld09mZnNldCwgbWF4LCBmbiwgcmV2ZXJzZSkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG52YXIgTGlzdEl0ZXJhdG9yID0gZnVuY3Rpb24gTGlzdEl0ZXJhdG9yKGxpc3QsIHR5cGUsIHJldmVyc2UpIHtcbiAgdGhpcy5fdHlwZSA9IHR5cGU7XG4gIHRoaXMuX3JldmVyc2UgPSAhIXJldmVyc2U7XG4gIHRoaXMuX21heEluZGV4ID0gbGlzdC5zaXplIC0gMTtcbiAgdmFyIHRhaWxPZmZzZXQgPSBnZXRUYWlsT2Zmc2V0KGxpc3QuX2NhcGFjaXR5KTtcbiAgdmFyIHJvb3RTdGFjayA9IGxpc3RJdGVyYXRvckZyYW1lKGxpc3QuX3Jvb3QgJiYgbGlzdC5fcm9vdC5hcnJheSwgbGlzdC5fbGV2ZWwsIC1saXN0Ll9vcmlnaW4sIHRhaWxPZmZzZXQgLSBsaXN0Ll9vcmlnaW4gLSAxKTtcbiAgdmFyIHRhaWxTdGFjayA9IGxpc3RJdGVyYXRvckZyYW1lKGxpc3QuX3RhaWwgJiYgbGlzdC5fdGFpbC5hcnJheSwgMCwgdGFpbE9mZnNldCAtIGxpc3QuX29yaWdpbiwgbGlzdC5fY2FwYWNpdHkgLSBsaXN0Ll9vcmlnaW4gLSAxKTtcbiAgdGhpcy5fc3RhY2sgPSByZXZlcnNlID8gdGFpbFN0YWNrIDogcm9vdFN0YWNrO1xuICB0aGlzLl9zdGFjay5fX3ByZXYgPSByZXZlcnNlID8gcm9vdFN0YWNrIDogdGFpbFN0YWNrO1xufTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKExpc3RJdGVyYXRvciwge25leHQ6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzdGFjayA9IHRoaXMuX3N0YWNrO1xuICAgIHdoaWxlIChzdGFjaykge1xuICAgICAgdmFyIGFycmF5ID0gc3RhY2suYXJyYXk7XG4gICAgICB2YXIgcmF3SW5kZXggPSBzdGFjay5pbmRleCsrO1xuICAgICAgaWYgKHRoaXMuX3JldmVyc2UpIHtcbiAgICAgICAgcmF3SW5kZXggPSBNQVNLIC0gcmF3SW5kZXg7XG4gICAgICAgIGlmIChyYXdJbmRleCA+IHN0YWNrLnJhd01heCkge1xuICAgICAgICAgIHJhd0luZGV4ID0gc3RhY2sucmF3TWF4O1xuICAgICAgICAgIHN0YWNrLmluZGV4ID0gU0laRSAtIHJhd0luZGV4O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAocmF3SW5kZXggPj0gMCAmJiByYXdJbmRleCA8IFNJWkUgJiYgcmF3SW5kZXggPD0gc3RhY2sucmF3TWF4KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGFycmF5ICYmIGFycmF5W3Jhd0luZGV4XTtcbiAgICAgICAgaWYgKHN0YWNrLmxldmVsID09PSAwKSB7XG4gICAgICAgICAgdmFyIHR5cGUgPSB0aGlzLl90eXBlO1xuICAgICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgICBpZiAodHlwZSAhPT0gMSkge1xuICAgICAgICAgICAgaW5kZXggPSBzdGFjay5vZmZzZXQgKyAocmF3SW5kZXggPDwgc3RhY2subGV2ZWwpO1xuICAgICAgICAgICAgaWYgKHRoaXMuX3JldmVyc2UpIHtcbiAgICAgICAgICAgICAgaW5kZXggPSB0aGlzLl9tYXhJbmRleCAtIGluZGV4O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gaXRlcmF0b3JWYWx1ZSh0eXBlLCBpbmRleCwgdmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3N0YWNrID0gc3RhY2sgPSBsaXN0SXRlcmF0b3JGcmFtZSh2YWx1ZSAmJiB2YWx1ZS5hcnJheSwgc3RhY2subGV2ZWwgLSBTSElGVCwgc3RhY2sub2Zmc2V0ICsgKHJhd0luZGV4IDw8IHN0YWNrLmxldmVsKSwgc3RhY2subWF4LCBzdGFjayk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBzdGFjayA9IHRoaXMuX3N0YWNrID0gdGhpcy5fc3RhY2suX19wcmV2O1xuICAgIH1cbiAgICByZXR1cm4gaXRlcmF0b3JEb25lKCk7XG4gIH19LCB7fSwgSXRlcmF0b3IpO1xuZnVuY3Rpb24gbGlzdEl0ZXJhdG9yRnJhbWUoYXJyYXksIGxldmVsLCBvZmZzZXQsIG1heCwgcHJldkZyYW1lKSB7XG4gIHJldHVybiB7XG4gICAgYXJyYXk6IGFycmF5LFxuICAgIGxldmVsOiBsZXZlbCxcbiAgICBvZmZzZXQ6IG9mZnNldCxcbiAgICBtYXg6IG1heCxcbiAgICByYXdNYXg6ICgobWF4IC0gb2Zmc2V0KSA+PiBsZXZlbCksXG4gICAgaW5kZXg6IDAsXG4gICAgX19wcmV2OiBwcmV2RnJhbWVcbiAgfTtcbn1cbmZ1bmN0aW9uIG1ha2VMaXN0KG9yaWdpbiwgY2FwYWNpdHksIGxldmVsLCByb290LCB0YWlsLCBvd25lcklELCBoYXNoKSB7XG4gIHZhciBsaXN0ID0gT2JqZWN0LmNyZWF0ZShMaXN0UHJvdG90eXBlKTtcbiAgbGlzdC5zaXplID0gY2FwYWNpdHkgLSBvcmlnaW47XG4gIGxpc3QuX29yaWdpbiA9IG9yaWdpbjtcbiAgbGlzdC5fY2FwYWNpdHkgPSBjYXBhY2l0eTtcbiAgbGlzdC5fbGV2ZWwgPSBsZXZlbDtcbiAgbGlzdC5fcm9vdCA9IHJvb3Q7XG4gIGxpc3QuX3RhaWwgPSB0YWlsO1xuICBsaXN0Ll9fb3duZXJJRCA9IG93bmVySUQ7XG4gIGxpc3QuX19oYXNoID0gaGFzaDtcbiAgbGlzdC5fX2FsdGVyZWQgPSBmYWxzZTtcbiAgcmV0dXJuIGxpc3Q7XG59XG52YXIgRU1QVFlfTElTVDtcbmZ1bmN0aW9uIGVtcHR5TGlzdCgpIHtcbiAgcmV0dXJuIEVNUFRZX0xJU1QgfHwgKEVNUFRZX0xJU1QgPSBtYWtlTGlzdCgwLCAwLCBTSElGVCkpO1xufVxuZnVuY3Rpb24gdXBkYXRlTGlzdChsaXN0LCBpbmRleCwgdmFsdWUpIHtcbiAgaW5kZXggPSB3cmFwSW5kZXgobGlzdCwgaW5kZXgpO1xuICBpZiAoaW5kZXggPj0gbGlzdC5zaXplIHx8IGluZGV4IDwgMCkge1xuICAgIHJldHVybiBsaXN0LndpdGhNdXRhdGlvbnMoKGZ1bmN0aW9uKGxpc3QpIHtcbiAgICAgIGluZGV4IDwgMCA/IHNldExpc3RCb3VuZHMobGlzdCwgaW5kZXgpLnNldCgwLCB2YWx1ZSkgOiBzZXRMaXN0Qm91bmRzKGxpc3QsIDAsIGluZGV4ICsgMSkuc2V0KGluZGV4LCB2YWx1ZSk7XG4gICAgfSkpO1xuICB9XG4gIGluZGV4ICs9IGxpc3QuX29yaWdpbjtcbiAgdmFyIG5ld1RhaWwgPSBsaXN0Ll90YWlsO1xuICB2YXIgbmV3Um9vdCA9IGxpc3QuX3Jvb3Q7XG4gIHZhciBkaWRBbHRlciA9IE1ha2VSZWYoRElEX0FMVEVSKTtcbiAgaWYgKGluZGV4ID49IGdldFRhaWxPZmZzZXQobGlzdC5fY2FwYWNpdHkpKSB7XG4gICAgbmV3VGFpbCA9IHVwZGF0ZVZOb2RlKG5ld1RhaWwsIGxpc3QuX19vd25lcklELCAwLCBpbmRleCwgdmFsdWUsIGRpZEFsdGVyKTtcbiAgfSBlbHNlIHtcbiAgICBuZXdSb290ID0gdXBkYXRlVk5vZGUobmV3Um9vdCwgbGlzdC5fX293bmVySUQsIGxpc3QuX2xldmVsLCBpbmRleCwgdmFsdWUsIGRpZEFsdGVyKTtcbiAgfVxuICBpZiAoIWRpZEFsdGVyLnZhbHVlKSB7XG4gICAgcmV0dXJuIGxpc3Q7XG4gIH1cbiAgaWYgKGxpc3QuX19vd25lcklEKSB7XG4gICAgbGlzdC5fcm9vdCA9IG5ld1Jvb3Q7XG4gICAgbGlzdC5fdGFpbCA9IG5ld1RhaWw7XG4gICAgbGlzdC5fX2hhc2ggPSB1bmRlZmluZWQ7XG4gICAgbGlzdC5fX2FsdGVyZWQgPSB0cnVlO1xuICAgIHJldHVybiBsaXN0O1xuICB9XG4gIHJldHVybiBtYWtlTGlzdChsaXN0Ll9vcmlnaW4sIGxpc3QuX2NhcGFjaXR5LCBsaXN0Ll9sZXZlbCwgbmV3Um9vdCwgbmV3VGFpbCk7XG59XG5mdW5jdGlvbiB1cGRhdGVWTm9kZShub2RlLCBvd25lcklELCBsZXZlbCwgaW5kZXgsIHZhbHVlLCBkaWRBbHRlcikge1xuICB2YXIgaWR4ID0gKGluZGV4ID4+PiBsZXZlbCkgJiBNQVNLO1xuICB2YXIgbm9kZUhhcyA9IG5vZGUgJiYgaWR4IDwgbm9kZS5hcnJheS5sZW5ndGg7XG4gIGlmICghbm9kZUhhcyAmJiB2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cbiAgdmFyIG5ld05vZGU7XG4gIGlmIChsZXZlbCA+IDApIHtcbiAgICB2YXIgbG93ZXJOb2RlID0gbm9kZSAmJiBub2RlLmFycmF5W2lkeF07XG4gICAgdmFyIG5ld0xvd2VyTm9kZSA9IHVwZGF0ZVZOb2RlKGxvd2VyTm9kZSwgb3duZXJJRCwgbGV2ZWwgLSBTSElGVCwgaW5kZXgsIHZhbHVlLCBkaWRBbHRlcik7XG4gICAgaWYgKG5ld0xvd2VyTm9kZSA9PT0gbG93ZXJOb2RlKSB7XG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gICAgbmV3Tm9kZSA9IGVkaXRhYmxlVk5vZGUobm9kZSwgb3duZXJJRCk7XG4gICAgbmV3Tm9kZS5hcnJheVtpZHhdID0gbmV3TG93ZXJOb2RlO1xuICAgIHJldHVybiBuZXdOb2RlO1xuICB9XG4gIGlmIChub2RlSGFzICYmIG5vZGUuYXJyYXlbaWR4XSA9PT0gdmFsdWUpIHtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuICBTZXRSZWYoZGlkQWx0ZXIpO1xuICBuZXdOb2RlID0gZWRpdGFibGVWTm9kZShub2RlLCBvd25lcklEKTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgJiYgaWR4ID09PSBuZXdOb2RlLmFycmF5Lmxlbmd0aCAtIDEpIHtcbiAgICBuZXdOb2RlLmFycmF5LnBvcCgpO1xuICB9IGVsc2Uge1xuICAgIG5ld05vZGUuYXJyYXlbaWR4XSA9IHZhbHVlO1xuICB9XG4gIHJldHVybiBuZXdOb2RlO1xufVxuZnVuY3Rpb24gZWRpdGFibGVWTm9kZShub2RlLCBvd25lcklEKSB7XG4gIGlmIChvd25lcklEICYmIG5vZGUgJiYgb3duZXJJRCA9PT0gbm9kZS5vd25lcklEKSB7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cbiAgcmV0dXJuIG5ldyBWTm9kZShub2RlID8gbm9kZS5hcnJheS5zbGljZSgpIDogW10sIG93bmVySUQpO1xufVxuZnVuY3Rpb24gbGlzdE5vZGVGb3IobGlzdCwgcmF3SW5kZXgpIHtcbiAgaWYgKHJhd0luZGV4ID49IGdldFRhaWxPZmZzZXQobGlzdC5fY2FwYWNpdHkpKSB7XG4gICAgcmV0dXJuIGxpc3QuX3RhaWw7XG4gIH1cbiAgaWYgKHJhd0luZGV4IDwgMSA8PCAobGlzdC5fbGV2ZWwgKyBTSElGVCkpIHtcbiAgICB2YXIgbm9kZSA9IGxpc3QuX3Jvb3Q7XG4gICAgdmFyIGxldmVsID0gbGlzdC5fbGV2ZWw7XG4gICAgd2hpbGUgKG5vZGUgJiYgbGV2ZWwgPiAwKSB7XG4gICAgICBub2RlID0gbm9kZS5hcnJheVsocmF3SW5kZXggPj4+IGxldmVsKSAmIE1BU0tdO1xuICAgICAgbGV2ZWwgLT0gU0hJRlQ7XG4gICAgfVxuICAgIHJldHVybiBub2RlO1xuICB9XG59XG5mdW5jdGlvbiBzZXRMaXN0Qm91bmRzKGxpc3QsIGJlZ2luLCBlbmQpIHtcbiAgdmFyIG93bmVyID0gbGlzdC5fX293bmVySUQgfHwgbmV3IE93bmVySUQoKTtcbiAgdmFyIG9sZE9yaWdpbiA9IGxpc3QuX29yaWdpbjtcbiAgdmFyIG9sZENhcGFjaXR5ID0gbGlzdC5fY2FwYWNpdHk7XG4gIHZhciBuZXdPcmlnaW4gPSBvbGRPcmlnaW4gKyBiZWdpbjtcbiAgdmFyIG5ld0NhcGFjaXR5ID0gZW5kID09PSB1bmRlZmluZWQgPyBvbGRDYXBhY2l0eSA6IGVuZCA8IDAgPyBvbGRDYXBhY2l0eSArIGVuZCA6IG9sZE9yaWdpbiArIGVuZDtcbiAgaWYgKG5ld09yaWdpbiA9PT0gb2xkT3JpZ2luICYmIG5ld0NhcGFjaXR5ID09PSBvbGRDYXBhY2l0eSkge1xuICAgIHJldHVybiBsaXN0O1xuICB9XG4gIGlmIChuZXdPcmlnaW4gPj0gbmV3Q2FwYWNpdHkpIHtcbiAgICByZXR1cm4gbGlzdC5jbGVhcigpO1xuICB9XG4gIHZhciBuZXdMZXZlbCA9IGxpc3QuX2xldmVsO1xuICB2YXIgbmV3Um9vdCA9IGxpc3QuX3Jvb3Q7XG4gIHZhciBvZmZzZXRTaGlmdCA9IDA7XG4gIHdoaWxlIChuZXdPcmlnaW4gKyBvZmZzZXRTaGlmdCA8IDApIHtcbiAgICBuZXdSb290ID0gbmV3IFZOb2RlKG5ld1Jvb3QgJiYgbmV3Um9vdC5hcnJheS5sZW5ndGggPyBbdW5kZWZpbmVkLCBuZXdSb290XSA6IFtdLCBvd25lcik7XG4gICAgbmV3TGV2ZWwgKz0gU0hJRlQ7XG4gICAgb2Zmc2V0U2hpZnQgKz0gMSA8PCBuZXdMZXZlbDtcbiAgfVxuICBpZiAob2Zmc2V0U2hpZnQpIHtcbiAgICBuZXdPcmlnaW4gKz0gb2Zmc2V0U2hpZnQ7XG4gICAgb2xkT3JpZ2luICs9IG9mZnNldFNoaWZ0O1xuICAgIG5ld0NhcGFjaXR5ICs9IG9mZnNldFNoaWZ0O1xuICAgIG9sZENhcGFjaXR5ICs9IG9mZnNldFNoaWZ0O1xuICB9XG4gIHZhciBvbGRUYWlsT2Zmc2V0ID0gZ2V0VGFpbE9mZnNldChvbGRDYXBhY2l0eSk7XG4gIHZhciBuZXdUYWlsT2Zmc2V0ID0gZ2V0VGFpbE9mZnNldChuZXdDYXBhY2l0eSk7XG4gIHdoaWxlIChuZXdUYWlsT2Zmc2V0ID49IDEgPDwgKG5ld0xldmVsICsgU0hJRlQpKSB7XG4gICAgbmV3Um9vdCA9IG5ldyBWTm9kZShuZXdSb290ICYmIG5ld1Jvb3QuYXJyYXkubGVuZ3RoID8gW25ld1Jvb3RdIDogW10sIG93bmVyKTtcbiAgICBuZXdMZXZlbCArPSBTSElGVDtcbiAgfVxuICB2YXIgb2xkVGFpbCA9IGxpc3QuX3RhaWw7XG4gIHZhciBuZXdUYWlsID0gbmV3VGFpbE9mZnNldCA8IG9sZFRhaWxPZmZzZXQgPyBsaXN0Tm9kZUZvcihsaXN0LCBuZXdDYXBhY2l0eSAtIDEpIDogbmV3VGFpbE9mZnNldCA+IG9sZFRhaWxPZmZzZXQgPyBuZXcgVk5vZGUoW10sIG93bmVyKSA6IG9sZFRhaWw7XG4gIGlmIChvbGRUYWlsICYmIG5ld1RhaWxPZmZzZXQgPiBvbGRUYWlsT2Zmc2V0ICYmIG5ld09yaWdpbiA8IG9sZENhcGFjaXR5ICYmIG9sZFRhaWwuYXJyYXkubGVuZ3RoKSB7XG4gICAgbmV3Um9vdCA9IGVkaXRhYmxlVk5vZGUobmV3Um9vdCwgb3duZXIpO1xuICAgIHZhciBub2RlID0gbmV3Um9vdDtcbiAgICBmb3IgKHZhciBsZXZlbCA9IG5ld0xldmVsOyBsZXZlbCA+IFNISUZUOyBsZXZlbCAtPSBTSElGVCkge1xuICAgICAgdmFyIGlkeCA9IChvbGRUYWlsT2Zmc2V0ID4+PiBsZXZlbCkgJiBNQVNLO1xuICAgICAgbm9kZSA9IG5vZGUuYXJyYXlbaWR4XSA9IGVkaXRhYmxlVk5vZGUobm9kZS5hcnJheVtpZHhdLCBvd25lcik7XG4gICAgfVxuICAgIG5vZGUuYXJyYXlbKG9sZFRhaWxPZmZzZXQgPj4+IFNISUZUKSAmIE1BU0tdID0gb2xkVGFpbDtcbiAgfVxuICBpZiAobmV3Q2FwYWNpdHkgPCBvbGRDYXBhY2l0eSkge1xuICAgIG5ld1RhaWwgPSBuZXdUYWlsICYmIG5ld1RhaWwucmVtb3ZlQWZ0ZXIob3duZXIsIDAsIG5ld0NhcGFjaXR5KTtcbiAgfVxuICBpZiAobmV3T3JpZ2luID49IG5ld1RhaWxPZmZzZXQpIHtcbiAgICBuZXdPcmlnaW4gLT0gbmV3VGFpbE9mZnNldDtcbiAgICBuZXdDYXBhY2l0eSAtPSBuZXdUYWlsT2Zmc2V0O1xuICAgIG5ld0xldmVsID0gU0hJRlQ7XG4gICAgbmV3Um9vdCA9IG51bGw7XG4gICAgbmV3VGFpbCA9IG5ld1RhaWwgJiYgbmV3VGFpbC5yZW1vdmVCZWZvcmUob3duZXIsIDAsIG5ld09yaWdpbik7XG4gIH0gZWxzZSBpZiAobmV3T3JpZ2luID4gb2xkT3JpZ2luIHx8IG5ld1RhaWxPZmZzZXQgPCBvbGRUYWlsT2Zmc2V0KSB7XG4gICAgb2Zmc2V0U2hpZnQgPSAwO1xuICAgIHdoaWxlIChuZXdSb290KSB7XG4gICAgICB2YXIgYmVnaW5JbmRleCA9IChuZXdPcmlnaW4gPj4+IG5ld0xldmVsKSAmIE1BU0s7XG4gICAgICBpZiAoYmVnaW5JbmRleCAhPT0gKG5ld1RhaWxPZmZzZXQgPj4+IG5ld0xldmVsKSAmIE1BU0spIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBpZiAoYmVnaW5JbmRleCkge1xuICAgICAgICBvZmZzZXRTaGlmdCArPSAoMSA8PCBuZXdMZXZlbCkgKiBiZWdpbkluZGV4O1xuICAgICAgfVxuICAgICAgbmV3TGV2ZWwgLT0gU0hJRlQ7XG4gICAgICBuZXdSb290ID0gbmV3Um9vdC5hcnJheVtiZWdpbkluZGV4XTtcbiAgICB9XG4gICAgaWYgKG5ld1Jvb3QgJiYgbmV3T3JpZ2luID4gb2xkT3JpZ2luKSB7XG4gICAgICBuZXdSb290ID0gbmV3Um9vdC5yZW1vdmVCZWZvcmUob3duZXIsIG5ld0xldmVsLCBuZXdPcmlnaW4gLSBvZmZzZXRTaGlmdCk7XG4gICAgfVxuICAgIGlmIChuZXdSb290ICYmIG5ld1RhaWxPZmZzZXQgPCBvbGRUYWlsT2Zmc2V0KSB7XG4gICAgICBuZXdSb290ID0gbmV3Um9vdC5yZW1vdmVBZnRlcihvd25lciwgbmV3TGV2ZWwsIG5ld1RhaWxPZmZzZXQgLSBvZmZzZXRTaGlmdCk7XG4gICAgfVxuICAgIGlmIChvZmZzZXRTaGlmdCkge1xuICAgICAgbmV3T3JpZ2luIC09IG9mZnNldFNoaWZ0O1xuICAgICAgbmV3Q2FwYWNpdHkgLT0gb2Zmc2V0U2hpZnQ7XG4gICAgfVxuICB9XG4gIGlmIChsaXN0Ll9fb3duZXJJRCkge1xuICAgIGxpc3Quc2l6ZSA9IG5ld0NhcGFjaXR5IC0gbmV3T3JpZ2luO1xuICAgIGxpc3QuX29yaWdpbiA9IG5ld09yaWdpbjtcbiAgICBsaXN0Ll9jYXBhY2l0eSA9IG5ld0NhcGFjaXR5O1xuICAgIGxpc3QuX2xldmVsID0gbmV3TGV2ZWw7XG4gICAgbGlzdC5fcm9vdCA9IG5ld1Jvb3Q7XG4gICAgbGlzdC5fdGFpbCA9IG5ld1RhaWw7XG4gICAgbGlzdC5fX2hhc2ggPSB1bmRlZmluZWQ7XG4gICAgbGlzdC5fX2FsdGVyZWQgPSB0cnVlO1xuICAgIHJldHVybiBsaXN0O1xuICB9XG4gIHJldHVybiBtYWtlTGlzdChuZXdPcmlnaW4sIG5ld0NhcGFjaXR5LCBuZXdMZXZlbCwgbmV3Um9vdCwgbmV3VGFpbCk7XG59XG5mdW5jdGlvbiBtZXJnZUludG9MaXN0V2l0aChsaXN0LCBtZXJnZXIsIGl0ZXJhYmxlcykge1xuICB2YXIgaXRlcnMgPSBbXTtcbiAgdmFyIG1heFNpemUgPSAwO1xuICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgaXRlcmFibGVzLmxlbmd0aDsgaWkrKykge1xuICAgIHZhciB2YWx1ZSA9IGl0ZXJhYmxlc1tpaV07XG4gICAgdmFyIGl0ZXIgPSBJdGVyYWJsZSh2YWx1ZSk7XG4gICAgaWYgKGl0ZXIuc2l6ZSA+IG1heFNpemUpIHtcbiAgICAgIG1heFNpemUgPSBpdGVyLnNpemU7XG4gICAgfVxuICAgIGlmICghaXNJdGVyYWJsZSh2YWx1ZSkpIHtcbiAgICAgIGl0ZXIgPSBpdGVyLm1hcCgoZnVuY3Rpb24odikge1xuICAgICAgICByZXR1cm4gZnJvbUpTKHYpO1xuICAgICAgfSkpO1xuICAgIH1cbiAgICBpdGVycy5wdXNoKGl0ZXIpO1xuICB9XG4gIGlmIChtYXhTaXplID4gbGlzdC5zaXplKSB7XG4gICAgbGlzdCA9IGxpc3Quc2V0U2l6ZShtYXhTaXplKTtcbiAgfVxuICByZXR1cm4gbWVyZ2VJbnRvQ29sbGVjdGlvbldpdGgobGlzdCwgbWVyZ2VyLCBpdGVycyk7XG59XG5mdW5jdGlvbiBnZXRUYWlsT2Zmc2V0KHNpemUpIHtcbiAgcmV0dXJuIHNpemUgPCBTSVpFID8gMCA6ICgoKHNpemUgLSAxKSA+Pj4gU0hJRlQpIDw8IFNISUZUKTtcbn1cbnZhciBTdGFjayA9IGZ1bmN0aW9uIFN0YWNrKHZhbHVlKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAwID8gZW1wdHlTdGFjaygpIDogdmFsdWUgJiYgdmFsdWUuY29uc3RydWN0b3IgPT09ICRTdGFjayA/IHZhbHVlIDogZW1wdHlTdGFjaygpLnVuc2hpZnRBbGwodmFsdWUpO1xufTtcbnZhciAkU3RhY2sgPSBTdGFjaztcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFN0YWNrLCB7XG4gIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fX3RvU3RyaW5nKCdTdGFjayBbJywgJ10nKTtcbiAgfSxcbiAgZ2V0OiBmdW5jdGlvbihpbmRleCwgbm90U2V0VmFsdWUpIHtcbiAgICB2YXIgaGVhZCA9IHRoaXMuX2hlYWQ7XG4gICAgd2hpbGUgKGhlYWQgJiYgaW5kZXgtLSkge1xuICAgICAgaGVhZCA9IGhlYWQubmV4dDtcbiAgICB9XG4gICAgcmV0dXJuIGhlYWQgPyBoZWFkLnZhbHVlIDogbm90U2V0VmFsdWU7XG4gIH0sXG4gIHBlZWs6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9oZWFkICYmIHRoaXMuX2hlYWQudmFsdWU7XG4gIH0sXG4gIHB1c2g6IGZ1bmN0aW9uKCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdmFyIG5ld1NpemUgPSB0aGlzLnNpemUgKyBhcmd1bWVudHMubGVuZ3RoO1xuICAgIHZhciBoZWFkID0gdGhpcy5faGVhZDtcbiAgICBmb3IgKHZhciBpaSA9IGFyZ3VtZW50cy5sZW5ndGggLSAxOyBpaSA+PSAwOyBpaS0tKSB7XG4gICAgICBoZWFkID0ge1xuICAgICAgICB2YWx1ZTogYXJndW1lbnRzW2lpXSxcbiAgICAgICAgbmV4dDogaGVhZFxuICAgICAgfTtcbiAgICB9XG4gICAgaWYgKHRoaXMuX19vd25lcklEKSB7XG4gICAgICB0aGlzLnNpemUgPSBuZXdTaXplO1xuICAgICAgdGhpcy5faGVhZCA9IGhlYWQ7XG4gICAgICB0aGlzLl9faGFzaCA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuX19hbHRlcmVkID0gdHJ1ZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gbWFrZVN0YWNrKG5ld1NpemUsIGhlYWQpO1xuICB9LFxuICBwdXNoQWxsOiBmdW5jdGlvbihpdGVyKSB7XG4gICAgaXRlciA9IEl0ZXJhYmxlKGl0ZXIpO1xuICAgIGlmIChpdGVyLnNpemUgPT09IDApIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgbmV3U2l6ZSA9IHRoaXMuc2l6ZTtcbiAgICB2YXIgaGVhZCA9IHRoaXMuX2hlYWQ7XG4gICAgaXRlci5yZXZlcnNlKCkuZm9yRWFjaCgoZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIG5ld1NpemUrKztcbiAgICAgIGhlYWQgPSB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgbmV4dDogaGVhZFxuICAgICAgfTtcbiAgICB9KSk7XG4gICAgaWYgKHRoaXMuX19vd25lcklEKSB7XG4gICAgICB0aGlzLnNpemUgPSBuZXdTaXplO1xuICAgICAgdGhpcy5faGVhZCA9IGhlYWQ7XG4gICAgICB0aGlzLl9faGFzaCA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuX19hbHRlcmVkID0gdHJ1ZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gbWFrZVN0YWNrKG5ld1NpemUsIGhlYWQpO1xuICB9LFxuICBwb3A6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnNsaWNlKDEpO1xuICB9LFxuICB1bnNoaWZ0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5wdXNoLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIHVuc2hpZnRBbGw6IGZ1bmN0aW9uKGl0ZXIpIHtcbiAgICByZXR1cm4gdGhpcy5wdXNoQWxsKGl0ZXIpO1xuICB9LFxuICBzaGlmdDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucG9wLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNsZWFyOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5zaXplID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgaWYgKHRoaXMuX19vd25lcklEKSB7XG4gICAgICB0aGlzLnNpemUgPSAwO1xuICAgICAgdGhpcy5faGVhZCA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuX19oYXNoID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5fX2FsdGVyZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBlbXB0eVN0YWNrKCk7XG4gIH0sXG4gIHNsaWNlOiBmdW5jdGlvbihiZWdpbiwgZW5kKSB7XG4gICAgaWYgKHdob2xlU2xpY2UoYmVnaW4sIGVuZCwgdGhpcy5zaXplKSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciByZXNvbHZlZEJlZ2luID0gcmVzb2x2ZUJlZ2luKGJlZ2luLCB0aGlzLnNpemUpO1xuICAgIHZhciByZXNvbHZlZEVuZCA9IHJlc29sdmVFbmQoZW5kLCB0aGlzLnNpemUpO1xuICAgIGlmIChyZXNvbHZlZEVuZCAhPT0gdGhpcy5zaXplKSB7XG4gICAgICByZXR1cm4gJHRyYWNldXJSdW50aW1lLnN1cGVyQ2FsbCh0aGlzLCAkU3RhY2sucHJvdG90eXBlLCBcInNsaWNlXCIsIFtiZWdpbiwgZW5kXSk7XG4gICAgfVxuICAgIHZhciBuZXdTaXplID0gdGhpcy5zaXplIC0gcmVzb2x2ZWRCZWdpbjtcbiAgICB2YXIgaGVhZCA9IHRoaXMuX2hlYWQ7XG4gICAgd2hpbGUgKHJlc29sdmVkQmVnaW4tLSkge1xuICAgICAgaGVhZCA9IGhlYWQubmV4dDtcbiAgICB9XG4gICAgaWYgKHRoaXMuX19vd25lcklEKSB7XG4gICAgICB0aGlzLnNpemUgPSBuZXdTaXplO1xuICAgICAgdGhpcy5faGVhZCA9IGhlYWQ7XG4gICAgICB0aGlzLl9faGFzaCA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuX19hbHRlcmVkID0gdHJ1ZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gbWFrZVN0YWNrKG5ld1NpemUsIGhlYWQpO1xuICB9LFxuICBfX2Vuc3VyZU93bmVyOiBmdW5jdGlvbihvd25lcklEKSB7XG4gICAgaWYgKG93bmVySUQgPT09IHRoaXMuX19vd25lcklEKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgaWYgKCFvd25lcklEKSB7XG4gICAgICB0aGlzLl9fb3duZXJJRCA9IG93bmVySUQ7XG4gICAgICB0aGlzLl9fYWx0ZXJlZCA9IGZhbHNlO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBtYWtlU3RhY2sodGhpcy5zaXplLCB0aGlzLl9oZWFkLCBvd25lcklELCB0aGlzLl9faGFzaCk7XG4gIH0sXG4gIF9faXRlcmF0ZTogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgcmV0dXJuIHRoaXMudG9TZXEoKS5jYWNoZVJlc3VsdC5fX2l0ZXJhdGUoZm4sIHJldmVyc2UpO1xuICAgIH1cbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgdmFyIG5vZGUgPSB0aGlzLl9oZWFkO1xuICAgIHdoaWxlIChub2RlKSB7XG4gICAgICBpZiAoZm4obm9kZS52YWx1ZSwgaXRlcmF0aW9ucysrLCB0aGlzKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBub2RlID0gbm9kZS5uZXh0O1xuICAgIH1cbiAgICByZXR1cm4gaXRlcmF0aW9ucztcbiAgfSxcbiAgX19pdGVyYXRvcjogZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICByZXR1cm4gdGhpcy50b1NlcSgpLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcih0eXBlLCByZXZlcnNlKTtcbiAgICB9XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIHZhciBub2RlID0gdGhpcy5faGVhZDtcbiAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgIGlmIChub2RlKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IG5vZGUudmFsdWU7XG4gICAgICAgIG5vZGUgPSBub2RlLm5leHQ7XG4gICAgICAgIHJldHVybiBpdGVyYXRvclZhbHVlKHR5cGUsIGl0ZXJhdGlvbnMrKywgdmFsdWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGl0ZXJhdG9yRG9uZSgpO1xuICAgIH0pKTtcbiAgfVxufSwge29mOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcyhhcmd1bWVudHMpO1xuICB9fSwgSW5kZXhlZENvbGxlY3Rpb24pO1xuZnVuY3Rpb24gaXNTdGFjayhtYXliZVN0YWNrKSB7XG4gIHJldHVybiAhIShtYXliZVN0YWNrICYmIG1heWJlU3RhY2tbSVNfU1RBQ0tfU0VOVElORUxdKTtcbn1cblN0YWNrLmlzU3RhY2sgPSBpc1N0YWNrO1xudmFyIElTX1NUQUNLX1NFTlRJTkVMID0gJ0BAX19JTU1VVEFCTEVfU1RBQ0tfX0BAJztcbnZhciBTdGFja1Byb3RvdHlwZSA9IFN0YWNrLnByb3RvdHlwZTtcblN0YWNrUHJvdG90eXBlW0lTX1NUQUNLX1NFTlRJTkVMXSA9IHRydWU7XG5TdGFja1Byb3RvdHlwZS53aXRoTXV0YXRpb25zID0gTWFwUHJvdG90eXBlLndpdGhNdXRhdGlvbnM7XG5TdGFja1Byb3RvdHlwZS5hc011dGFibGUgPSBNYXBQcm90b3R5cGUuYXNNdXRhYmxlO1xuU3RhY2tQcm90b3R5cGUuYXNJbW11dGFibGUgPSBNYXBQcm90b3R5cGUuYXNJbW11dGFibGU7XG5TdGFja1Byb3RvdHlwZS53YXNBbHRlcmVkID0gTWFwUHJvdG90eXBlLndhc0FsdGVyZWQ7XG5mdW5jdGlvbiBtYWtlU3RhY2soc2l6ZSwgaGVhZCwgb3duZXJJRCwgaGFzaCkge1xuICB2YXIgbWFwID0gT2JqZWN0LmNyZWF0ZShTdGFja1Byb3RvdHlwZSk7XG4gIG1hcC5zaXplID0gc2l6ZTtcbiAgbWFwLl9oZWFkID0gaGVhZDtcbiAgbWFwLl9fb3duZXJJRCA9IG93bmVySUQ7XG4gIG1hcC5fX2hhc2ggPSBoYXNoO1xuICBtYXAuX19hbHRlcmVkID0gZmFsc2U7XG4gIHJldHVybiBtYXA7XG59XG52YXIgRU1QVFlfU1RBQ0s7XG5mdW5jdGlvbiBlbXB0eVN0YWNrKCkge1xuICByZXR1cm4gRU1QVFlfU1RBQ0sgfHwgKEVNUFRZX1NUQUNLID0gbWFrZVN0YWNrKDApKTtcbn1cbnZhciBTZXQgPSBmdW5jdGlvbiBTZXQodmFsdWUpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDAgPyBlbXB0eVNldCgpIDogdmFsdWUgJiYgdmFsdWUuY29uc3RydWN0b3IgPT09ICRTZXQgPyB2YWx1ZSA6IGVtcHR5U2V0KCkudW5pb24odmFsdWUpO1xufTtcbnZhciAkU2V0ID0gU2V0O1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoU2V0LCB7XG4gIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fX3RvU3RyaW5nKCdTZXQgeycsICd9Jyk7XG4gIH0sXG4gIGhhczogZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwLmhhcyh2YWx1ZSk7XG4gIH0sXG4gIGFkZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YXIgbmV3TWFwID0gdGhpcy5fbWFwLnNldCh2YWx1ZSwgdHJ1ZSk7XG4gICAgaWYgKHRoaXMuX19vd25lcklEKSB7XG4gICAgICB0aGlzLnNpemUgPSBuZXdNYXAuc2l6ZTtcbiAgICAgIHRoaXMuX21hcCA9IG5ld01hcDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gbmV3TWFwID09PSB0aGlzLl9tYXAgPyB0aGlzIDogbWFrZVNldChuZXdNYXApO1xuICB9LFxuICByZW1vdmU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdmFyIG5ld01hcCA9IHRoaXMuX21hcC5yZW1vdmUodmFsdWUpO1xuICAgIGlmICh0aGlzLl9fb3duZXJJRCkge1xuICAgICAgdGhpcy5zaXplID0gbmV3TWFwLnNpemU7XG4gICAgICB0aGlzLl9tYXAgPSBuZXdNYXA7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIG5ld01hcCA9PT0gdGhpcy5fbWFwID8gdGhpcyA6IG5ld01hcC5zaXplID09PSAwID8gZW1wdHlTZXQoKSA6IG1ha2VTZXQobmV3TWFwKTtcbiAgfSxcbiAgY2xlYXI6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnNpemUgPT09IDApIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBpZiAodGhpcy5fX293bmVySUQpIHtcbiAgICAgIHRoaXMuc2l6ZSA9IDA7XG4gICAgICB0aGlzLl9tYXAuY2xlYXIoKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gZW1wdHlTZXQoKTtcbiAgfSxcbiAgdW5pb246IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVycyA9IGFyZ3VtZW50cztcbiAgICBpZiAoaXRlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMud2l0aE11dGF0aW9ucygoZnVuY3Rpb24oc2V0KSB7XG4gICAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgaXRlcnMubGVuZ3RoOyBpaSsrKSB7XG4gICAgICAgIEl0ZXJhYmxlKGl0ZXJzW2lpXSkuZm9yRWFjaCgoZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gc2V0LmFkZCh2YWx1ZSk7XG4gICAgICAgIH0pKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gIH0sXG4gIGludGVyc2VjdDogZnVuY3Rpb24oKSB7XG4gICAgZm9yICh2YXIgaXRlcnMgPSBbXSxcbiAgICAgICAgJF9fOCA9IDA7ICRfXzggPCBhcmd1bWVudHMubGVuZ3RoOyAkX184KyspXG4gICAgICBpdGVyc1skX184XSA9IGFyZ3VtZW50c1skX184XTtcbiAgICBpZiAoaXRlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgaXRlcnMgPSBpdGVycy5tYXAoKGZ1bmN0aW9uKGl0ZXIpIHtcbiAgICAgIHJldHVybiBJdGVyYWJsZShpdGVyKTtcbiAgICB9KSk7XG4gICAgdmFyIG9yaWdpbmFsU2V0ID0gdGhpcztcbiAgICByZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKChmdW5jdGlvbihzZXQpIHtcbiAgICAgIG9yaWdpbmFsU2V0LmZvckVhY2goKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGlmICghaXRlcnMuZXZlcnkoKGZ1bmN0aW9uKGl0ZXIpIHtcbiAgICAgICAgICByZXR1cm4gaXRlci5jb250YWlucyh2YWx1ZSk7XG4gICAgICAgIH0pKSkge1xuICAgICAgICAgIHNldC5yZW1vdmUodmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgfSkpO1xuICB9LFxuICBzdWJ0cmFjdDogZnVuY3Rpb24oKSB7XG4gICAgZm9yICh2YXIgaXRlcnMgPSBbXSxcbiAgICAgICAgJF9fOSA9IDA7ICRfXzkgPCBhcmd1bWVudHMubGVuZ3RoOyAkX185KyspXG4gICAgICBpdGVyc1skX185XSA9IGFyZ3VtZW50c1skX185XTtcbiAgICBpZiAoaXRlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgaXRlcnMgPSBpdGVycy5tYXAoKGZ1bmN0aW9uKGl0ZXIpIHtcbiAgICAgIHJldHVybiBJdGVyYWJsZShpdGVyKTtcbiAgICB9KSk7XG4gICAgdmFyIG9yaWdpbmFsU2V0ID0gdGhpcztcbiAgICByZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKChmdW5jdGlvbihzZXQpIHtcbiAgICAgIG9yaWdpbmFsU2V0LmZvckVhY2goKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGlmIChpdGVycy5zb21lKChmdW5jdGlvbihpdGVyKSB7XG4gICAgICAgICAgcmV0dXJuIGl0ZXIuY29udGFpbnModmFsdWUpO1xuICAgICAgICB9KSkpIHtcbiAgICAgICAgICBzZXQucmVtb3ZlKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgIH0pKTtcbiAgfSxcbiAgbWVyZ2U6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnVuaW9uLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIG1lcmdlV2l0aDogZnVuY3Rpb24obWVyZ2VyKSB7XG4gICAgZm9yICh2YXIgaXRlcnMgPSBbXSxcbiAgICAgICAgJF9fMTAgPSAxOyAkX18xMCA8IGFyZ3VtZW50cy5sZW5ndGg7ICRfXzEwKyspXG4gICAgICBpdGVyc1skX18xMCAtIDFdID0gYXJndW1lbnRzWyRfXzEwXTtcbiAgICByZXR1cm4gdGhpcy51bmlvbi5hcHBseSh0aGlzLCBpdGVycyk7XG4gIH0sXG4gIHdhc0FsdGVyZWQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9tYXAud2FzQWx0ZXJlZCgpO1xuICB9LFxuICBfX2l0ZXJhdGU6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIHJldHVybiB0aGlzLl9tYXAuX19pdGVyYXRlKChmdW5jdGlvbihfLCBrKSB7XG4gICAgICByZXR1cm4gZm4oaywgaywgJF9fMCk7XG4gICAgfSksIHJldmVyc2UpO1xuICB9LFxuICBfX2l0ZXJhdG9yOiBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcC5tYXAoKGZ1bmN0aW9uKF8sIGspIHtcbiAgICAgIHJldHVybiBrO1xuICAgIH0pKS5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICB9LFxuICBfX2Vuc3VyZU93bmVyOiBmdW5jdGlvbihvd25lcklEKSB7XG4gICAgaWYgKG93bmVySUQgPT09IHRoaXMuX19vd25lcklEKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdmFyIG5ld01hcCA9IHRoaXMuX21hcC5fX2Vuc3VyZU93bmVyKG93bmVySUQpO1xuICAgIGlmICghb3duZXJJRCkge1xuICAgICAgdGhpcy5fX293bmVySUQgPSBvd25lcklEO1xuICAgICAgdGhpcy5fbWFwID0gbmV3TWFwO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBtYWtlU2V0KG5ld01hcCwgb3duZXJJRCk7XG4gIH1cbn0sIHtcbiAgb2Y6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzKGFyZ3VtZW50cyk7XG4gIH0sXG4gIGZyb21LZXlzOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzKEtleWVkU2VxKHZhbHVlKS5mbGlwKCkpO1xuICB9XG59LCBTZXRDb2xsZWN0aW9uKTtcbmZ1bmN0aW9uIGlzU2V0KG1heWJlU2V0KSB7XG4gIHJldHVybiAhIShtYXliZVNldCAmJiBtYXliZVNldFtJU19TRVRfU0VOVElORUxdKTtcbn1cblNldC5pc1NldCA9IGlzU2V0O1xudmFyIElTX1NFVF9TRU5USU5FTCA9ICdAQF9fSU1NVVRBQkxFX1NFVF9fQEAnO1xudmFyIFNldFByb3RvdHlwZSA9IFNldC5wcm90b3R5cGU7XG5TZXRQcm90b3R5cGVbSVNfU0VUX1NFTlRJTkVMXSA9IHRydWU7XG5TZXRQcm90b3R5cGVbREVMRVRFXSA9IFNldFByb3RvdHlwZS5yZW1vdmU7XG5TZXRQcm90b3R5cGUubWVyZ2VEZWVwID0gU2V0UHJvdG90eXBlLm1lcmdlO1xuU2V0UHJvdG90eXBlLm1lcmdlRGVlcFdpdGggPSBTZXRQcm90b3R5cGUubWVyZ2VXaXRoO1xuU2V0UHJvdG90eXBlLndpdGhNdXRhdGlvbnMgPSBNYXBQcm90b3R5cGUud2l0aE11dGF0aW9ucztcblNldFByb3RvdHlwZS5hc011dGFibGUgPSBNYXBQcm90b3R5cGUuYXNNdXRhYmxlO1xuU2V0UHJvdG90eXBlLmFzSW1tdXRhYmxlID0gTWFwUHJvdG90eXBlLmFzSW1tdXRhYmxlO1xuZnVuY3Rpb24gbWFrZVNldChtYXAsIG93bmVySUQpIHtcbiAgdmFyIHNldCA9IE9iamVjdC5jcmVhdGUoU2V0UHJvdG90eXBlKTtcbiAgc2V0LnNpemUgPSBtYXAgPyBtYXAuc2l6ZSA6IDA7XG4gIHNldC5fbWFwID0gbWFwO1xuICBzZXQuX19vd25lcklEID0gb3duZXJJRDtcbiAgcmV0dXJuIHNldDtcbn1cbnZhciBFTVBUWV9TRVQ7XG5mdW5jdGlvbiBlbXB0eVNldCgpIHtcbiAgcmV0dXJuIEVNUFRZX1NFVCB8fCAoRU1QVFlfU0VUID0gbWFrZVNldChlbXB0eU1hcCgpKSk7XG59XG52YXIgT3JkZXJlZE1hcCA9IGZ1bmN0aW9uIE9yZGVyZWRNYXAodmFsdWUpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDAgPyBlbXB0eU9yZGVyZWRNYXAoKSA6IHZhbHVlICYmIHZhbHVlLmNvbnN0cnVjdG9yID09PSAkT3JkZXJlZE1hcCA/IHZhbHVlIDogZW1wdHlPcmRlcmVkTWFwKCkubWVyZ2UoS2V5ZWRJdGVyYWJsZSh2YWx1ZSkpO1xufTtcbnZhciAkT3JkZXJlZE1hcCA9IE9yZGVyZWRNYXA7XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShPcmRlcmVkTWFwLCB7XG4gIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fX3RvU3RyaW5nKCdPcmRlcmVkTWFwIHsnLCAnfScpO1xuICB9LFxuICBnZXQ6IGZ1bmN0aW9uKGssIG5vdFNldFZhbHVlKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fbWFwLmdldChrKTtcbiAgICByZXR1cm4gaW5kZXggIT09IHVuZGVmaW5lZCA/IHRoaXMuX2xpc3QuZ2V0KGluZGV4KVsxXSA6IG5vdFNldFZhbHVlO1xuICB9LFxuICBjbGVhcjogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuc2l6ZSA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGlmICh0aGlzLl9fb3duZXJJRCkge1xuICAgICAgdGhpcy5zaXplID0gMDtcbiAgICAgIHRoaXMuX21hcC5jbGVhcigpO1xuICAgICAgdGhpcy5fbGlzdC5jbGVhcigpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBlbXB0eU9yZGVyZWRNYXAoKTtcbiAgfSxcbiAgc2V0OiBmdW5jdGlvbihrLCB2KSB7XG4gICAgcmV0dXJuIHVwZGF0ZU9yZGVyZWRNYXAodGhpcywgaywgdik7XG4gIH0sXG4gIHJlbW92ZTogZnVuY3Rpb24oaykge1xuICAgIHJldHVybiB1cGRhdGVPcmRlcmVkTWFwKHRoaXMsIGssIE5PVF9TRVQpO1xuICB9LFxuICB3YXNBbHRlcmVkOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwLndhc0FsdGVyZWQoKSB8fCB0aGlzLl9saXN0Lndhc0FsdGVyZWQoKTtcbiAgfSxcbiAgX19pdGVyYXRlOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICByZXR1cm4gdGhpcy5fbGlzdC5fX2l0ZXJhdGUoKGZ1bmN0aW9uKGVudHJ5KSB7XG4gICAgICByZXR1cm4gZm4oZW50cnlbMV0sIGVudHJ5WzBdLCAkX18wKTtcbiAgICB9KSwgcmV2ZXJzZSk7XG4gIH0sXG4gIF9faXRlcmF0b3I6IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICByZXR1cm4gdGhpcy5fbGlzdC5mcm9tRW50cnlTZXEoKS5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICB9LFxuICBfX2Vuc3VyZU93bmVyOiBmdW5jdGlvbihvd25lcklEKSB7XG4gICAgaWYgKG93bmVySUQgPT09IHRoaXMuX19vd25lcklEKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdmFyIG5ld01hcCA9IHRoaXMuX21hcC5fX2Vuc3VyZU93bmVyKG93bmVySUQpO1xuICAgIHZhciBuZXdMaXN0ID0gdGhpcy5fbGlzdC5fX2Vuc3VyZU93bmVyKG93bmVySUQpO1xuICAgIGlmICghb3duZXJJRCkge1xuICAgICAgdGhpcy5fX293bmVySUQgPSBvd25lcklEO1xuICAgICAgdGhpcy5fbWFwID0gbmV3TWFwO1xuICAgICAgdGhpcy5fbGlzdCA9IG5ld0xpc3Q7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIG1ha2VPcmRlcmVkTWFwKG5ld01hcCwgbmV3TGlzdCwgb3duZXJJRCwgdGhpcy5fX2hhc2gpO1xuICB9XG59LCB7b2Y6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzKGFyZ3VtZW50cyk7XG4gIH19LCBNYXApO1xuZnVuY3Rpb24gaXNPcmRlcmVkTWFwKG1heWJlT3JkZXJlZE1hcCkge1xuICByZXR1cm4gISEobWF5YmVPcmRlcmVkTWFwICYmIG1heWJlT3JkZXJlZE1hcFtJU19PUkRFUkVEX01BUF9TRU5USU5FTF0pO1xufVxuT3JkZXJlZE1hcC5pc09yZGVyZWRNYXAgPSBpc09yZGVyZWRNYXA7XG52YXIgSVNfT1JERVJFRF9NQVBfU0VOVElORUwgPSAnQEBfX0lNTVVUQUJMRV9PUkRFUkVEX01BUF9fQEAnO1xuT3JkZXJlZE1hcC5wcm90b3R5cGVbSVNfT1JERVJFRF9NQVBfU0VOVElORUxdID0gdHJ1ZTtcbk9yZGVyZWRNYXAucHJvdG90eXBlW0RFTEVURV0gPSBPcmRlcmVkTWFwLnByb3RvdHlwZS5yZW1vdmU7XG5mdW5jdGlvbiBtYWtlT3JkZXJlZE1hcChtYXAsIGxpc3QsIG93bmVySUQsIGhhc2gpIHtcbiAgdmFyIG9tYXAgPSBPYmplY3QuY3JlYXRlKE9yZGVyZWRNYXAucHJvdG90eXBlKTtcbiAgb21hcC5zaXplID0gbWFwID8gbWFwLnNpemUgOiAwO1xuICBvbWFwLl9tYXAgPSBtYXA7XG4gIG9tYXAuX2xpc3QgPSBsaXN0O1xuICBvbWFwLl9fb3duZXJJRCA9IG93bmVySUQ7XG4gIG9tYXAuX19oYXNoID0gaGFzaDtcbiAgcmV0dXJuIG9tYXA7XG59XG52YXIgRU1QVFlfT1JERVJFRF9NQVA7XG5mdW5jdGlvbiBlbXB0eU9yZGVyZWRNYXAoKSB7XG4gIHJldHVybiBFTVBUWV9PUkRFUkVEX01BUCB8fCAoRU1QVFlfT1JERVJFRF9NQVAgPSBtYWtlT3JkZXJlZE1hcChlbXB0eU1hcCgpLCBlbXB0eUxpc3QoKSkpO1xufVxuZnVuY3Rpb24gdXBkYXRlT3JkZXJlZE1hcChvbWFwLCBrLCB2KSB7XG4gIHZhciBtYXAgPSBvbWFwLl9tYXA7XG4gIHZhciBsaXN0ID0gb21hcC5fbGlzdDtcbiAgdmFyIGkgPSBtYXAuZ2V0KGspO1xuICB2YXIgaGFzID0gaSAhPT0gdW5kZWZpbmVkO1xuICB2YXIgcmVtb3ZlZCA9IHYgPT09IE5PVF9TRVQ7XG4gIGlmICgoIWhhcyAmJiByZW1vdmVkKSB8fCAoaGFzICYmIHYgPT09IGxpc3QuZ2V0KGkpWzFdKSkge1xuICAgIHJldHVybiBvbWFwO1xuICB9XG4gIGlmICghaGFzKSB7XG4gICAgaSA9IGxpc3Quc2l6ZTtcbiAgfVxuICB2YXIgbmV3TWFwID0gcmVtb3ZlZCA/IG1hcC5yZW1vdmUoaykgOiBoYXMgPyBtYXAgOiBtYXAuc2V0KGssIGkpO1xuICB2YXIgbmV3TGlzdCA9IHJlbW92ZWQgPyBsaXN0LnJlbW92ZShpKSA6IGxpc3Quc2V0KGksIFtrLCB2XSk7XG4gIGlmIChvbWFwLl9fb3duZXJJRCkge1xuICAgIG9tYXAuc2l6ZSA9IG5ld01hcC5zaXplO1xuICAgIG9tYXAuX21hcCA9IG5ld01hcDtcbiAgICBvbWFwLl9saXN0ID0gbmV3TGlzdDtcbiAgICBvbWFwLl9faGFzaCA9IHVuZGVmaW5lZDtcbiAgICByZXR1cm4gb21hcDtcbiAgfVxuICByZXR1cm4gbWFrZU9yZGVyZWRNYXAobmV3TWFwLCBuZXdMaXN0KTtcbn1cbnZhciBSZWNvcmQgPSBmdW5jdGlvbiBSZWNvcmQoZGVmYXVsdFZhbHVlcywgbmFtZSkge1xuICB2YXIgUmVjb3JkVHlwZSA9IGZ1bmN0aW9uKHZhbHVlcykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBSZWNvcmRUeXBlKSkge1xuICAgICAgcmV0dXJuIG5ldyBSZWNvcmRUeXBlKHZhbHVlcyk7XG4gICAgfVxuICAgIHRoaXMuX21hcCA9IGFyZ3VtZW50cy5sZW5ndGggPT09IDAgPyBNYXAoKSA6IE1hcCh2YWx1ZXMpO1xuICB9O1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGRlZmF1bHRWYWx1ZXMpO1xuICB2YXIgUmVjb3JkVHlwZVByb3RvdHlwZSA9IFJlY29yZFR5cGUucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShSZWNvcmRQcm90b3R5cGUpO1xuICBSZWNvcmRUeXBlUHJvdG90eXBlLmNvbnN0cnVjdG9yID0gUmVjb3JkVHlwZTtcbiAgbmFtZSAmJiAoUmVjb3JkVHlwZVByb3RvdHlwZS5fbmFtZSA9IG5hbWUpO1xuICBSZWNvcmRUeXBlUHJvdG90eXBlLl9kZWZhdWx0VmFsdWVzID0gZGVmYXVsdFZhbHVlcztcbiAgUmVjb3JkVHlwZVByb3RvdHlwZS5fa2V5cyA9IGtleXM7XG4gIFJlY29yZFR5cGVQcm90b3R5cGUuc2l6ZSA9IGtleXMubGVuZ3RoO1xuICB0cnkge1xuICAgIEl0ZXJhYmxlKGRlZmF1bHRWYWx1ZXMpLmZvckVhY2goKGZ1bmN0aW9uKF8sIGtleSkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFJlY29yZFR5cGUucHJvdG90eXBlLCBrZXksIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5nZXQoa2V5KTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIGludmFyaWFudCh0aGlzLl9fb3duZXJJRCwgJ0Nhbm5vdCBzZXQgb24gYW4gaW1tdXRhYmxlIHJlY29yZC4nKTtcbiAgICAgICAgICB0aGlzLnNldChrZXksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSkpO1xuICB9IGNhdGNoIChlcnJvcikge31cbiAgcmV0dXJuIFJlY29yZFR5cGU7XG59O1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoUmVjb3JkLCB7XG4gIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fX3RvU3RyaW5nKHRoaXMuX25hbWUgKyAnIHsnLCAnfScpO1xuICB9LFxuICBoYXM6IGZ1bmN0aW9uKGspIHtcbiAgICByZXR1cm4gdGhpcy5fZGVmYXVsdFZhbHVlcy5oYXNPd25Qcm9wZXJ0eShrKTtcbiAgfSxcbiAgZ2V0OiBmdW5jdGlvbihrLCBub3RTZXRWYWx1ZSkge1xuICAgIGlmIChub3RTZXRWYWx1ZSAhPT0gdW5kZWZpbmVkICYmICF0aGlzLmhhcyhrKSkge1xuICAgICAgcmV0dXJuIG5vdFNldFZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fbWFwLmdldChrLCB0aGlzLl9kZWZhdWx0VmFsdWVzW2tdKTtcbiAgfSxcbiAgY2xlYXI6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9fb3duZXJJRCkge1xuICAgICAgdGhpcy5fbWFwLmNsZWFyKCk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdmFyIFN1cGVyUmVjb3JkID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaXMpLmNvbnN0cnVjdG9yO1xuICAgIHJldHVybiBTdXBlclJlY29yZC5fZW1wdHkgfHwgKFN1cGVyUmVjb3JkLl9lbXB0eSA9IG1ha2VSZWNvcmQodGhpcywgZW1wdHlNYXAoKSkpO1xuICB9LFxuICBzZXQ6IGZ1bmN0aW9uKGssIHYpIHtcbiAgICBpZiAoIXRoaXMuaGFzKGspKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBzZXQgdW5rbm93biBrZXkgXCInICsgayArICdcIiBvbiAnICsgdGhpcy5fbmFtZSk7XG4gICAgfVxuICAgIHZhciBuZXdNYXAgPSB0aGlzLl9tYXAuc2V0KGssIHYpO1xuICAgIGlmICh0aGlzLl9fb3duZXJJRCB8fCBuZXdNYXAgPT09IHRoaXMuX21hcCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBtYWtlUmVjb3JkKHRoaXMsIG5ld01hcCk7XG4gIH0sXG4gIHJlbW92ZTogZnVuY3Rpb24oaykge1xuICAgIGlmICghdGhpcy5oYXMoaykpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgbmV3TWFwID0gdGhpcy5fbWFwLnJlbW92ZShrKTtcbiAgICBpZiAodGhpcy5fX293bmVySUQgfHwgbmV3TWFwID09PSB0aGlzLl9tYXApIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gbWFrZVJlY29yZCh0aGlzLCBuZXdNYXApO1xuICB9LFxuICBrZXlzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwLmtleXMoKTtcbiAgfSxcbiAgdmFsdWVzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwLnZhbHVlcygpO1xuICB9LFxuICBlbnRyaWVzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwLmVudHJpZXMoKTtcbiAgfSxcbiAgd2FzQWx0ZXJlZDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcC53YXNBbHRlcmVkKCk7XG4gIH0sXG4gIF9faXRlcmF0b3I6IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwLl9faXRlcmF0b3IodHlwZSwgcmV2ZXJzZSk7XG4gIH0sXG4gIF9faXRlcmF0ZTogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgcmV0dXJuIEl0ZXJhYmxlKHRoaXMuX2RlZmF1bHRWYWx1ZXMpLm1hcCgoZnVuY3Rpb24oXywgaykge1xuICAgICAgcmV0dXJuICRfXzAuZ2V0KGspO1xuICAgIH0pKS5fX2l0ZXJhdGUoZm4sIHJldmVyc2UpO1xuICB9LFxuICBfX2Vuc3VyZU93bmVyOiBmdW5jdGlvbihvd25lcklEKSB7XG4gICAgaWYgKG93bmVySUQgPT09IHRoaXMuX19vd25lcklEKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdmFyIG5ld01hcCA9IHRoaXMuX21hcCAmJiB0aGlzLl9tYXAuX19lbnN1cmVPd25lcihvd25lcklEKTtcbiAgICBpZiAoIW93bmVySUQpIHtcbiAgICAgIHRoaXMuX19vd25lcklEID0gb3duZXJJRDtcbiAgICAgIHRoaXMuX21hcCA9IG5ld01hcDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gbWFrZVJlY29yZCh0aGlzLCBuZXdNYXAsIG93bmVySUQpO1xuICB9XG59LCB7fSwgS2V5ZWRDb2xsZWN0aW9uKTtcbnZhciBSZWNvcmRQcm90b3R5cGUgPSBSZWNvcmQucHJvdG90eXBlO1xuUmVjb3JkUHJvdG90eXBlLl9uYW1lID0gJ1JlY29yZCc7XG5SZWNvcmRQcm90b3R5cGVbREVMRVRFXSA9IFJlY29yZFByb3RvdHlwZS5yZW1vdmU7XG5SZWNvcmRQcm90b3R5cGUubWVyZ2UgPSBNYXBQcm90b3R5cGUubWVyZ2U7XG5SZWNvcmRQcm90b3R5cGUubWVyZ2VXaXRoID0gTWFwUHJvdG90eXBlLm1lcmdlV2l0aDtcblJlY29yZFByb3RvdHlwZS5tZXJnZURlZXAgPSBNYXBQcm90b3R5cGUubWVyZ2VEZWVwO1xuUmVjb3JkUHJvdG90eXBlLm1lcmdlRGVlcFdpdGggPSBNYXBQcm90b3R5cGUubWVyZ2VEZWVwV2l0aDtcblJlY29yZFByb3RvdHlwZS51cGRhdGUgPSBNYXBQcm90b3R5cGUudXBkYXRlO1xuUmVjb3JkUHJvdG90eXBlLnVwZGF0ZUluID0gTWFwUHJvdG90eXBlLnVwZGF0ZUluO1xuUmVjb3JkUHJvdG90eXBlLndpdGhNdXRhdGlvbnMgPSBNYXBQcm90b3R5cGUud2l0aE11dGF0aW9ucztcblJlY29yZFByb3RvdHlwZS5hc011dGFibGUgPSBNYXBQcm90b3R5cGUuYXNNdXRhYmxlO1xuUmVjb3JkUHJvdG90eXBlLmFzSW1tdXRhYmxlID0gTWFwUHJvdG90eXBlLmFzSW1tdXRhYmxlO1xuZnVuY3Rpb24gbWFrZVJlY29yZChsaWtlUmVjb3JkLCBtYXAsIG93bmVySUQpIHtcbiAgdmFyIHJlY29yZCA9IE9iamVjdC5jcmVhdGUoT2JqZWN0LmdldFByb3RvdHlwZU9mKGxpa2VSZWNvcmQpKTtcbiAgcmVjb3JkLl9tYXAgPSBtYXA7XG4gIHJlY29yZC5fX293bmVySUQgPSBvd25lcklEO1xuICByZXR1cm4gcmVjb3JkO1xufVxudmFyIFJhbmdlID0gZnVuY3Rpb24gUmFuZ2Uoc3RhcnQsIGVuZCwgc3RlcCkge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgJFJhbmdlKSkge1xuICAgIHJldHVybiBuZXcgJFJhbmdlKHN0YXJ0LCBlbmQsIHN0ZXApO1xuICB9XG4gIGludmFyaWFudChzdGVwICE9PSAwLCAnQ2Fubm90IHN0ZXAgYSBSYW5nZSBieSAwJyk7XG4gIHN0YXJ0ID0gc3RhcnQgfHwgMDtcbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5kID0gSW5maW5pdHk7XG4gIH1cbiAgaWYgKHN0YXJ0ID09PSBlbmQgJiYgX19FTVBUWV9SQU5HRSkge1xuICAgIHJldHVybiBfX0VNUFRZX1JBTkdFO1xuICB9XG4gIHN0ZXAgPSBzdGVwID09PSB1bmRlZmluZWQgPyAxIDogTWF0aC5hYnMoc3RlcCk7XG4gIGlmIChlbmQgPCBzdGFydCkge1xuICAgIHN0ZXAgPSAtc3RlcDtcbiAgfVxuICB0aGlzLl9zdGFydCA9IHN0YXJ0O1xuICB0aGlzLl9lbmQgPSBlbmQ7XG4gIHRoaXMuX3N0ZXAgPSBzdGVwO1xuICB0aGlzLnNpemUgPSBNYXRoLm1heCgwLCBNYXRoLmNlaWwoKGVuZCAtIHN0YXJ0KSAvIHN0ZXAgLSAxKSArIDEpO1xufTtcbnZhciAkUmFuZ2UgPSBSYW5nZTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFJhbmdlLCB7XG4gIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5zaXplID09PSAwKSB7XG4gICAgICByZXR1cm4gJ1JhbmdlIFtdJztcbiAgICB9XG4gICAgcmV0dXJuICdSYW5nZSBbICcgKyB0aGlzLl9zdGFydCArICcuLi4nICsgdGhpcy5fZW5kICsgKHRoaXMuX3N0ZXAgPiAxID8gJyBieSAnICsgdGhpcy5fc3RlcCA6ICcnKSArICcgXSc7XG4gIH0sXG4gIGdldDogZnVuY3Rpb24oaW5kZXgsIG5vdFNldFZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuaGFzKGluZGV4KSA/IHRoaXMuX3N0YXJ0ICsgd3JhcEluZGV4KHRoaXMsIGluZGV4KSAqIHRoaXMuX3N0ZXAgOiBub3RTZXRWYWx1ZTtcbiAgfSxcbiAgY29udGFpbnM6IGZ1bmN0aW9uKHNlYXJjaFZhbHVlKSB7XG4gICAgdmFyIHBvc3NpYmxlSW5kZXggPSAoc2VhcmNoVmFsdWUgLSB0aGlzLl9zdGFydCkgLyB0aGlzLl9zdGVwO1xuICAgIHJldHVybiBwb3NzaWJsZUluZGV4ID49IDAgJiYgcG9zc2libGVJbmRleCA8IHRoaXMuc2l6ZSAmJiBwb3NzaWJsZUluZGV4ID09PSBNYXRoLmZsb29yKHBvc3NpYmxlSW5kZXgpO1xuICB9LFxuICBzbGljZTogZnVuY3Rpb24oYmVnaW4sIGVuZCkge1xuICAgIGlmICh3aG9sZVNsaWNlKGJlZ2luLCBlbmQsIHRoaXMuc2l6ZSkpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBiZWdpbiA9IHJlc29sdmVCZWdpbihiZWdpbiwgdGhpcy5zaXplKTtcbiAgICBlbmQgPSByZXNvbHZlRW5kKGVuZCwgdGhpcy5zaXplKTtcbiAgICBpZiAoZW5kIDw9IGJlZ2luKSB7XG4gICAgICByZXR1cm4gX19FTVBUWV9SQU5HRTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyAkUmFuZ2UodGhpcy5nZXQoYmVnaW4sIHRoaXMuX2VuZCksIHRoaXMuZ2V0KGVuZCwgdGhpcy5fZW5kKSwgdGhpcy5fc3RlcCk7XG4gIH0sXG4gIGluZGV4T2Y6IGZ1bmN0aW9uKHNlYXJjaFZhbHVlKSB7XG4gICAgdmFyIG9mZnNldFZhbHVlID0gc2VhcmNoVmFsdWUgLSB0aGlzLl9zdGFydDtcbiAgICBpZiAob2Zmc2V0VmFsdWUgJSB0aGlzLl9zdGVwID09PSAwKSB7XG4gICAgICB2YXIgaW5kZXggPSBvZmZzZXRWYWx1ZSAvIHRoaXMuX3N0ZXA7XG4gICAgICBpZiAoaW5kZXggPj0gMCAmJiBpbmRleCA8IHRoaXMuc2l6ZSkge1xuICAgICAgICByZXR1cm4gaW5kZXg7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbiAgfSxcbiAgbGFzdEluZGV4T2Y6IGZ1bmN0aW9uKHNlYXJjaFZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuaW5kZXhPZihzZWFyY2hWYWx1ZSk7XG4gIH0sXG4gIHRha2U6IGZ1bmN0aW9uKGFtb3VudCkge1xuICAgIHJldHVybiB0aGlzLnNsaWNlKDAsIE1hdGgubWF4KDAsIGFtb3VudCkpO1xuICB9LFxuICBza2lwOiBmdW5jdGlvbihhbW91bnQpIHtcbiAgICByZXR1cm4gdGhpcy5zbGljZShNYXRoLm1heCgwLCBhbW91bnQpKTtcbiAgfSxcbiAgX19pdGVyYXRlOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciBtYXhJbmRleCA9IHRoaXMuc2l6ZSAtIDE7XG4gICAgdmFyIHN0ZXAgPSB0aGlzLl9zdGVwO1xuICAgIHZhciB2YWx1ZSA9IHJldmVyc2UgPyB0aGlzLl9zdGFydCArIG1heEluZGV4ICogc3RlcCA6IHRoaXMuX3N0YXJ0O1xuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPD0gbWF4SW5kZXg7IGlpKyspIHtcbiAgICAgIGlmIChmbih2YWx1ZSwgaWksIHRoaXMpID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gaWkgKyAxO1xuICAgICAgfVxuICAgICAgdmFsdWUgKz0gcmV2ZXJzZSA/IC1zdGVwIDogc3RlcDtcbiAgICB9XG4gICAgcmV0dXJuIGlpO1xuICB9LFxuICBfX2l0ZXJhdG9yOiBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgdmFyIG1heEluZGV4ID0gdGhpcy5zaXplIC0gMTtcbiAgICB2YXIgc3RlcCA9IHRoaXMuX3N0ZXA7XG4gICAgdmFyIHZhbHVlID0gcmV2ZXJzZSA/IHRoaXMuX3N0YXJ0ICsgbWF4SW5kZXggKiBzdGVwIDogdGhpcy5fc3RhcnQ7XG4gICAgdmFyIGlpID0gMDtcbiAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgIHZhciB2ID0gdmFsdWU7XG4gICAgICB2YWx1ZSArPSByZXZlcnNlID8gLXN0ZXAgOiBzdGVwO1xuICAgICAgcmV0dXJuIGlpID4gbWF4SW5kZXggPyBpdGVyYXRvckRvbmUoKSA6IGl0ZXJhdG9yVmFsdWUodHlwZSwgaWkrKywgdik7XG4gICAgfSkpO1xuICB9LFxuICBfX2RlZXBFcXVhbHM6IGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgcmV0dXJuIG90aGVyIGluc3RhbmNlb2YgJFJhbmdlID8gdGhpcy5fc3RhcnQgPT09IG90aGVyLl9zdGFydCAmJiB0aGlzLl9lbmQgPT09IG90aGVyLl9lbmQgJiYgdGhpcy5fc3RlcCA9PT0gb3RoZXIuX3N0ZXAgOiAkdHJhY2V1clJ1bnRpbWUuc3VwZXJDYWxsKHRoaXMsICRSYW5nZS5wcm90b3R5cGUsIFwiX19kZWVwRXF1YWxzXCIsIFtvdGhlcl0pO1xuICB9XG59LCB7fSwgSW5kZXhlZFNlcSk7XG52YXIgUmFuZ2VQcm90b3R5cGUgPSBSYW5nZS5wcm90b3R5cGU7XG5SYW5nZVByb3RvdHlwZS5fX3RvSlMgPSBSYW5nZVByb3RvdHlwZS50b0FycmF5O1xuUmFuZ2VQcm90b3R5cGUuZmlyc3QgPSBMaXN0UHJvdG90eXBlLmZpcnN0O1xuUmFuZ2VQcm90b3R5cGUubGFzdCA9IExpc3RQcm90b3R5cGUubGFzdDtcbnZhciBfX0VNUFRZX1JBTkdFID0gUmFuZ2UoMCwgMCk7XG52YXIgUmVwZWF0ID0gZnVuY3Rpb24gUmVwZWF0KHZhbHVlLCB0aW1lcykge1xuICBpZiAodGltZXMgPD0gMCAmJiBFTVBUWV9SRVBFQVQpIHtcbiAgICByZXR1cm4gRU1QVFlfUkVQRUFUO1xuICB9XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiAkUmVwZWF0KSkge1xuICAgIHJldHVybiBuZXcgJFJlcGVhdCh2YWx1ZSwgdGltZXMpO1xuICB9XG4gIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gIHRoaXMuc2l6ZSA9IHRpbWVzID09PSB1bmRlZmluZWQgPyBJbmZpbml0eSA6IE1hdGgubWF4KDAsIHRpbWVzKTtcbiAgaWYgKHRoaXMuc2l6ZSA9PT0gMCkge1xuICAgIEVNUFRZX1JFUEVBVCA9IHRoaXM7XG4gIH1cbn07XG52YXIgJFJlcGVhdCA9IFJlcGVhdDtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFJlcGVhdCwge1xuICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuc2l6ZSA9PT0gMCkge1xuICAgICAgcmV0dXJuICdSZXBlYXQgW10nO1xuICAgIH1cbiAgICByZXR1cm4gJ1JlcGVhdCBbICcgKyB0aGlzLl92YWx1ZSArICcgJyArIHRoaXMuc2l6ZSArICcgdGltZXMgXSc7XG4gIH0sXG4gIGdldDogZnVuY3Rpb24oaW5kZXgsIG5vdFNldFZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuaGFzKGluZGV4KSA/IHRoaXMuX3ZhbHVlIDogbm90U2V0VmFsdWU7XG4gIH0sXG4gIGNvbnRhaW5zOiBmdW5jdGlvbihzZWFyY2hWYWx1ZSkge1xuICAgIHJldHVybiBpcyh0aGlzLl92YWx1ZSwgc2VhcmNoVmFsdWUpO1xuICB9LFxuICBzbGljZTogZnVuY3Rpb24oYmVnaW4sIGVuZCkge1xuICAgIHZhciBzaXplID0gdGhpcy5zaXplO1xuICAgIHJldHVybiB3aG9sZVNsaWNlKGJlZ2luLCBlbmQsIHNpemUpID8gdGhpcyA6IG5ldyAkUmVwZWF0KHRoaXMuX3ZhbHVlLCByZXNvbHZlRW5kKGVuZCwgc2l6ZSkgLSByZXNvbHZlQmVnaW4oYmVnaW4sIHNpemUpKTtcbiAgfSxcbiAgcmV2ZXJzZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIGluZGV4T2Y6IGZ1bmN0aW9uKHNlYXJjaFZhbHVlKSB7XG4gICAgaWYgKGlzKHRoaXMuX3ZhbHVlLCBzZWFyY2hWYWx1ZSkpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICByZXR1cm4gLTE7XG4gIH0sXG4gIGxhc3RJbmRleE9mOiBmdW5jdGlvbihzZWFyY2hWYWx1ZSkge1xuICAgIGlmIChpcyh0aGlzLl92YWx1ZSwgc2VhcmNoVmFsdWUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5zaXplO1xuICAgIH1cbiAgICByZXR1cm4gLTE7XG4gIH0sXG4gIF9faXRlcmF0ZTogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgdGhpcy5zaXplOyBpaSsrKSB7XG4gICAgICBpZiAoZm4odGhpcy5fdmFsdWUsIGlpLCB0aGlzKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIGlpICsgMTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGlpO1xuICB9LFxuICBfX2l0ZXJhdG9yOiBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIHZhciBpaSA9IDA7XG4gICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gaWkgPCAkX18wLnNpemUgPyBpdGVyYXRvclZhbHVlKHR5cGUsIGlpKyssICRfXzAuX3ZhbHVlKSA6IGl0ZXJhdG9yRG9uZSgpO1xuICAgIH0pKTtcbiAgfSxcbiAgX19kZWVwRXF1YWxzOiBmdW5jdGlvbihvdGhlcikge1xuICAgIHJldHVybiBvdGhlciBpbnN0YW5jZW9mICRSZXBlYXQgPyBpcyh0aGlzLl92YWx1ZSwgb3RoZXIuX3ZhbHVlKSA6ICR0cmFjZXVyUnVudGltZS5zdXBlckNhbGwodGhpcywgJFJlcGVhdC5wcm90b3R5cGUsIFwiX19kZWVwRXF1YWxzXCIsIFtvdGhlcl0pO1xuICB9XG59LCB7fSwgSW5kZXhlZFNlcSk7XG52YXIgUmVwZWF0UHJvdG90eXBlID0gUmVwZWF0LnByb3RvdHlwZTtcblJlcGVhdFByb3RvdHlwZS5sYXN0ID0gUmVwZWF0UHJvdG90eXBlLmZpcnN0O1xuUmVwZWF0UHJvdG90eXBlLmhhcyA9IFJhbmdlUHJvdG90eXBlLmhhcztcblJlcGVhdFByb3RvdHlwZS50YWtlID0gUmFuZ2VQcm90b3R5cGUudGFrZTtcblJlcGVhdFByb3RvdHlwZS5za2lwID0gUmFuZ2VQcm90b3R5cGUuc2tpcDtcblJlcGVhdFByb3RvdHlwZS5fX3RvSlMgPSBSYW5nZVByb3RvdHlwZS5fX3RvSlM7XG52YXIgRU1QVFlfUkVQRUFUO1xudmFyIEltbXV0YWJsZSA9IHtcbiAgSXRlcmFibGU6IEl0ZXJhYmxlLFxuICBTZXE6IFNlcSxcbiAgQ29sbGVjdGlvbjogQ29sbGVjdGlvbixcbiAgTWFwOiBNYXAsXG4gIExpc3Q6IExpc3QsXG4gIFN0YWNrOiBTdGFjayxcbiAgU2V0OiBTZXQsXG4gIE9yZGVyZWRNYXA6IE9yZGVyZWRNYXAsXG4gIFJlY29yZDogUmVjb3JkLFxuICBSYW5nZTogUmFuZ2UsXG4gIFJlcGVhdDogUmVwZWF0LFxuICBpczogaXMsXG4gIGZyb21KUzogZnJvbUpTXG59O1xuXG4gIHJldHVybiBJbW11dGFibGU7XG59XG50eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgPyBtb2R1bGUuZXhwb3J0cyA9IHVuaXZlcnNhbE1vZHVsZSgpIDpcbiAgdHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKHVuaXZlcnNhbE1vZHVsZSkgOlxuICAgIEltbXV0YWJsZSA9IHVuaXZlcnNhbE1vZHVsZSgpO1xuIiwiLy8gQ29weXJpZ2h0IChjKSAyMDE0IFBhdHJpY2sgRHVicm95IDxwZHVicm95QGdtYWlsLmNvbT5cbi8vIFRoaXMgc29mdHdhcmUgaXMgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBNSVQgTGljZW5zZS5cblxuLyogZ2xvYmFsIC1XZWFrTWFwICovXG5cbnZhciBleHRlbmQgPSByZXF1aXJlKCd1dGlsLWV4dGVuZCcpLFxuICAgIFdlYWtNYXAgPSByZXF1aXJlKCcuL3RoaXJkX3BhcnR5L1dlYWtNYXAnKTtcblxuLy8gQW4gaW50ZXJuYWwgb2JqZWN0IHRoYXQgY2FuIGJlIHJldHVybmVkIGZyb20gYSB2aXNpdG9yIGZ1bmN0aW9uIHRvXG4vLyBwcmV2ZW50IGEgdG9wLWRvd24gd2FsayBmcm9tIHdhbGtpbmcgc3VidHJlZXMgb2YgYSBub2RlLlxudmFyIHN0b3BSZWN1cnNpb24gPSB7fTtcblxuLy8gQW4gaW50ZXJuYWwgb2JqZWN0IHRoYXQgY2FuIGJlIHJldHVybmVkIGZyb20gYSB2aXNpdG9yIGZ1bmN0aW9uIHRvXG4vLyBjYXVzZSB0aGUgd2FsayB0byBpbW1lZGlhdGVseSBzdG9wLlxudmFyIHN0b3BXYWxrID0ge307XG5cbnZhciBoYXNPd25Qcm9wID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLy8gSGVscGVyc1xuLy8gLS0tLS0tLVxuXG5mdW5jdGlvbiBpc0VsZW1lbnQob2JqKSB7XG4gIHJldHVybiAhIShvYmogJiYgb2JqLm5vZGVUeXBlID09PSAxKTtcbn1cblxuZnVuY3Rpb24gaXNPYmplY3Qob2JqKSB7XG4gIHZhciB0eXBlID0gdHlwZW9mIG9iajtcbiAgcmV0dXJuIHR5cGUgPT09ICdmdW5jdGlvbicgfHwgdHlwZSA9PT0gJ29iamVjdCcgJiYgISFvYmo7XG59XG5cbmZ1bmN0aW9uIGVhY2gob2JqLCBwcmVkaWNhdGUpIHtcbiAgZm9yICh2YXIgayBpbiBvYmopIHtcbiAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICBpZiAocHJlZGljYXRlKG9ialtrXSwgaywgb2JqKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLy8gTWFrZXMgYSBzaGFsbG93IGNvcHkgb2YgYGFycmAsIGFuZCBhZGRzIGBvYmpgIHRvIHRoZSBlbmQgb2YgdGhlIGNvcHkuXG5mdW5jdGlvbiBjb3B5QW5kUHVzaChhcnIsIG9iaikge1xuICB2YXIgcmVzdWx0ID0gYXJyLnNsaWNlKCk7XG4gIHJlc3VsdC5wdXNoKG9iaik7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8vIEltcGxlbWVudHMgdGhlIGRlZmF1bHQgdHJhdmVyc2FsIHN0cmF0ZWd5OiBpZiBgb2JqYCBpcyBhIERPTSBub2RlLCB3YWxrXG4vLyBpdHMgRE9NIGNoaWxkcmVuOyBvdGhlcndpc2UsIHdhbGsgYWxsIHRoZSBvYmplY3RzIGl0IHJlZmVyZW5jZXMuXG5mdW5jdGlvbiBkZWZhdWx0VHJhdmVyc2FsKG9iaikge1xuICByZXR1cm4gaXNFbGVtZW50KG9iaikgPyBvYmouY2hpbGRyZW4gOiBvYmo7XG59XG5cbi8vIFdhbGsgdGhlIHRyZWUgcmVjdXJzaXZlbHkgYmVnaW5uaW5nIHdpdGggYHJvb3RgLCBjYWxsaW5nIGBiZWZvcmVGdW5jYFxuLy8gYmVmb3JlIHZpc2l0aW5nIGFuIG9iamVjdHMgZGVzY2VuZGVudHMsIGFuZCBgYWZ0ZXJGdW5jYCBhZnRlcndhcmRzLlxuLy8gSWYgYGNvbGxlY3RSZXN1bHRzYCBpcyB0cnVlLCB0aGUgbGFzdCBhcmd1bWVudCB0byBgYWZ0ZXJGdW5jYCB3aWxsIGJlIGFcbi8vIGNvbGxlY3Rpb24gb2YgdGhlIHJlc3VsdHMgb2Ygd2Fsa2luZyB0aGUgbm9kZSdzIHN1YnRyZWVzLlxuZnVuY3Rpb24gd2Fsa0ltcGwocm9vdCwgdHJhdmVyc2FsU3RyYXRlZ3ksIGJlZm9yZUZ1bmMsIGFmdGVyRnVuYywgY29udGV4dCwgY29sbGVjdFJlc3VsdHMpIHtcbiAgcmV0dXJuIChmdW5jdGlvbiBfd2FsayhzdGFjaywgdmFsdWUsIGtleSwgcGFyZW50KSB7XG4gICAgaWYgKGlzT2JqZWN0KHZhbHVlKSAmJiBzdGFjay5pbmRleE9mKHZhbHVlKSA+PSAwKVxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQSBjeWNsZSB3YXMgZGV0ZWN0ZWQgYXQgJyArIHZhbHVlKTtcblxuICAgIGlmIChiZWZvcmVGdW5jKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gYmVmb3JlRnVuYy5jYWxsKGNvbnRleHQsIHZhbHVlLCBrZXksIHBhcmVudCk7XG4gICAgICBpZiAocmVzdWx0ID09PSBzdG9wV2FsaykgcmV0dXJuIHN0b3BXYWxrO1xuICAgICAgaWYgKHJlc3VsdCA9PT0gc3RvcFJlY3Vyc2lvbikgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzdWJSZXN1bHRzO1xuICAgIHZhciB0YXJnZXQgPSB0cmF2ZXJzYWxTdHJhdGVneSh2YWx1ZSk7XG5cbiAgICBpZiAoaXNPYmplY3QodGFyZ2V0KSAmJiBPYmplY3Qua2V5cyh0YXJnZXQpLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIENvbGxlY3QgcmVzdWx0cyBmcm9tIHN1YnRyZWVzIGluIHRoZSBzYW1lIHNoYXBlIGFzIHRoZSB0YXJnZXQuXG4gICAgICBpZiAoY29sbGVjdFJlc3VsdHMpIHN1YlJlc3VsdHMgPSBBcnJheS5pc0FycmF5KHRhcmdldCkgPyBbXSA6IHt9O1xuXG4gICAgICB2YXIgb2sgPSBlYWNoKHRhcmdldCwgZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IF93YWxrKGNvcHlBbmRQdXNoKHN0YWNrLCB2YWx1ZSksIG9iaiwga2V5LCB2YWx1ZSk7XG4gICAgICAgIGlmIChyZXN1bHQgPT09IHN0b3BXYWxrKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmIChzdWJSZXN1bHRzKSBzdWJSZXN1bHRzW2tleV0gPSByZXN1bHQ7XG4gICAgICB9KTtcbiAgICAgIGlmICghb2spIHJldHVybiBzdG9wV2FsaztcbiAgICB9XG4gICAgaWYgKGFmdGVyRnVuYykgcmV0dXJuIGFmdGVyRnVuYy5jYWxsKGNvbnRleHQsIHZhbHVlLCBrZXksIHBhcmVudCwgc3ViUmVzdWx0cyk7XG4gIH0pKFtdLCByb290KTtcbn1cblxuLy8gSW50ZXJuYWwgaGVscGVyIHByb3ZpZGluZyB0aGUgaW1wbGVtZW50YXRpb24gZm9yIGBwbHVja2AgYW5kIGBwbHVja1JlY2AuXG5mdW5jdGlvbiBwbHVjayhvYmosIHByb3BlcnR5TmFtZSwgcmVjdXJzaXZlKSB7XG4gIHZhciByZXN1bHRzID0gW107XG4gIHRoaXMucHJlb3JkZXIob2JqLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgaWYgKCFyZWN1cnNpdmUgJiYga2V5ID09IHByb3BlcnR5TmFtZSlcbiAgICAgIHJldHVybiBzdG9wUmVjdXJzaW9uO1xuICAgIGlmIChoYXNPd25Qcm9wLmNhbGwodmFsdWUsIHByb3BlcnR5TmFtZSkpXG4gICAgICByZXN1bHRzW3Jlc3VsdHMubGVuZ3RoXSA9IHZhbHVlW3Byb3BlcnR5TmFtZV07XG4gIH0pO1xuICByZXR1cm4gcmVzdWx0cztcbn1cblxuZnVuY3Rpb24gZGVmaW5lRW51bWVyYWJsZVByb3BlcnR5KG9iaiwgcHJvcE5hbWUsIGdldHRlckZuKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIHByb3BOYW1lLCB7XG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICBnZXQ6IGdldHRlckZuXG4gIH0pO1xufVxuXG4vLyBSZXR1cm5zIGFuIG9iamVjdCBjb250YWluaW5nIHRoZSB3YWxrIGZ1bmN0aW9ucy4gSWYgYHRyYXZlcnNhbFN0cmF0ZWd5YFxuLy8gaXMgc3BlY2lmaWVkLCBpdCBpcyBhIGZ1bmN0aW9uIGRldGVybWluaW5nIGhvdyBvYmplY3RzIHNob3VsZCBiZVxuLy8gdHJhdmVyc2VkLiBHaXZlbiBhbiBvYmplY3QsIGl0IHJldHVybnMgdGhlIG9iamVjdCB0byBiZSByZWN1cnNpdmVseVxuLy8gd2Fsa2VkLiBUaGUgZGVmYXVsdCBzdHJhdGVneSBpcyBlcXVpdmFsZW50IHRvIGBfLmlkZW50aXR5YCBmb3IgcmVndWxhclxuLy8gb2JqZWN0cywgYW5kIGZvciBET00gbm9kZXMgaXQgcmV0dXJucyB0aGUgbm9kZSdzIERPTSBjaGlsZHJlbi5cbmZ1bmN0aW9uIFdhbGtlcih0cmF2ZXJzYWxTdHJhdGVneSkge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2Fsa2VyKSlcbiAgICByZXR1cm4gbmV3IFdhbGtlcih0cmF2ZXJzYWxTdHJhdGVneSk7XG4gIHRoaXMuX3RyYXZlcnNhbFN0cmF0ZWd5ID0gdHJhdmVyc2FsU3RyYXRlZ3kgfHwgZGVmYXVsdFRyYXZlcnNhbDtcbn1cblxuZXh0ZW5kKFdhbGtlci5wcm90b3R5cGUsIHtcbiAgLy8gUGVyZm9ybXMgYSBwcmVvcmRlciB0cmF2ZXJzYWwgb2YgYG9iamAgYW5kIHJldHVybnMgdGhlIGZpcnN0IHZhbHVlXG4gIC8vIHdoaWNoIHBhc3NlcyBhIHRydXRoIHRlc3QuXG4gIGZpbmQ6IGZ1bmN0aW9uKG9iaiwgdmlzaXRvciwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgdGhpcy5wcmVvcmRlcihvYmosIGZ1bmN0aW9uKHZhbHVlLCBrZXksIHBhcmVudCkge1xuICAgICAgaWYgKHZpc2l0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwga2V5LCBwYXJlbnQpKSB7XG4gICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gc3RvcFdhbGs7XG4gICAgICB9XG4gICAgfSwgY29udGV4dCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcblxuICAvLyBSZWN1cnNpdmVseSB0cmF2ZXJzZXMgYG9iamAgYW5kIHJldHVybnMgYWxsIHRoZSBlbGVtZW50cyB0aGF0IHBhc3MgYVxuICAvLyB0cnV0aCB0ZXN0LiBgc3RyYXRlZ3lgIGlzIHRoZSB0cmF2ZXJzYWwgZnVuY3Rpb24gdG8gdXNlLCBlLmcuIGBwcmVvcmRlcmBcbiAgLy8gb3IgYHBvc3RvcmRlcmAuXG4gIGZpbHRlcjogZnVuY3Rpb24ob2JqLCBzdHJhdGVneSwgdmlzaXRvciwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgaWYgKG9iaiA9PT0gbnVsbCkgcmV0dXJuIHJlc3VsdHM7XG4gICAgc3RyYXRlZ3kob2JqLCBmdW5jdGlvbih2YWx1ZSwga2V5LCBwYXJlbnQpIHtcbiAgICAgIGlmICh2aXNpdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGtleSwgcGFyZW50KSkgcmVzdWx0cy5wdXNoKHZhbHVlKTtcbiAgICB9LCBudWxsLCB0aGlzLl90cmF2ZXJzYWxTdHJhdGVneSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH0sXG5cbiAgLy8gUmVjdXJzaXZlbHkgdHJhdmVyc2VzIGBvYmpgIGFuZCByZXR1cm5zIGFsbCB0aGUgZWxlbWVudHMgZm9yIHdoaWNoIGFcbiAgLy8gdHJ1dGggdGVzdCBmYWlscy5cbiAgcmVqZWN0OiBmdW5jdGlvbihvYmosIHN0cmF0ZWd5LCB2aXNpdG9yLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyKG9iaiwgc3RyYXRlZ3ksIGZ1bmN0aW9uKHZhbHVlLCBrZXksIHBhcmVudCkge1xuICAgICAgcmV0dXJuICF2aXNpdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGtleSwgcGFyZW50KTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBQcm9kdWNlcyBhIG5ldyBhcnJheSBvZiB2YWx1ZXMgYnkgcmVjdXJzaXZlbHkgdHJhdmVyc2luZyBgb2JqYCBhbmRcbiAgLy8gbWFwcGluZyBlYWNoIHZhbHVlIHRocm91Z2ggdGhlIHRyYW5zZm9ybWF0aW9uIGZ1bmN0aW9uIGB2aXNpdG9yYC5cbiAgLy8gYHN0cmF0ZWd5YCBpcyB0aGUgdHJhdmVyc2FsIGZ1bmN0aW9uIHRvIHVzZSwgZS5nLiBgcHJlb3JkZXJgIG9yXG4gIC8vIGBwb3N0b3JkZXJgLlxuICBtYXA6IGZ1bmN0aW9uKG9iaiwgc3RyYXRlZ3ksIHZpc2l0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIHN0cmF0ZWd5KG9iaiwgZnVuY3Rpb24odmFsdWUsIGtleSwgcGFyZW50KSB7XG4gICAgICByZXN1bHRzW3Jlc3VsdHMubGVuZ3RoXSA9IHZpc2l0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwga2V5LCBwYXJlbnQpO1xuICAgIH0sIG51bGwsIHRoaXMuX3RyYXZlcnNhbFN0cmF0ZWd5KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfSxcblxuICAvLyBSZXR1cm4gdGhlIHZhbHVlIG9mIHByb3BlcnRpZXMgbmFtZWQgYHByb3BlcnR5TmFtZWAgcmVhY2hhYmxlIGZyb20gdGhlXG4gIC8vIHRyZWUgcm9vdGVkIGF0IGBvYmpgLiBSZXN1bHRzIGFyZSBub3QgcmVjdXJzaXZlbHkgc2VhcmNoZWQ7IHVzZVxuICAvLyBgcGx1Y2tSZWNgIGZvciB0aGF0LlxuICBwbHVjazogZnVuY3Rpb24ob2JqLCBwcm9wZXJ0eU5hbWUpIHtcbiAgICByZXR1cm4gcGx1Y2suY2FsbCh0aGlzLCBvYmosIHByb3BlcnR5TmFtZSwgZmFsc2UpO1xuICB9LFxuXG4gIC8vIFZlcnNpb24gb2YgYHBsdWNrYCB3aGljaCByZWN1cnNpdmVseSBzZWFyY2hlcyByZXN1bHRzIGZvciBuZXN0ZWQgb2JqZWN0c1xuICAvLyB3aXRoIGEgcHJvcGVydHkgbmFtZWQgYHByb3BlcnR5TmFtZWAuXG4gIHBsdWNrUmVjOiBmdW5jdGlvbihvYmosIHByb3BlcnR5TmFtZSkge1xuICAgIHJldHVybiBwbHVjay5jYWxsKHRoaXMsIG9iaiwgcHJvcGVydHlOYW1lLCB0cnVlKTtcbiAgfSxcblxuICAvLyBSZWN1cnNpdmVseSB0cmF2ZXJzZXMgYG9iamAgaW4gYSBkZXB0aC1maXJzdCBmYXNoaW9uLCBpbnZva2luZyB0aGVcbiAgLy8gYHZpc2l0b3JgIGZ1bmN0aW9uIGZvciBlYWNoIG9iamVjdCBvbmx5IGFmdGVyIHRyYXZlcnNpbmcgaXRzIGNoaWxkcmVuLlxuICAvLyBgdHJhdmVyc2FsU3RyYXRlZ3lgIGlzIGludGVuZGVkIGZvciBpbnRlcm5hbCBjYWxsZXJzLCBhbmQgaXMgbm90IHBhcnRcbiAgLy8gb2YgdGhlIHB1YmxpYyBBUEkuXG4gIHBvc3RvcmRlcjogZnVuY3Rpb24ob2JqLCB2aXNpdG9yLCBjb250ZXh0LCB0cmF2ZXJzYWxTdHJhdGVneSkge1xuICAgIHRyYXZlcnNhbFN0cmF0ZWd5ID0gdHJhdmVyc2FsU3RyYXRlZ3kgfHwgdGhpcy5fdHJhdmVyc2FsU3RyYXRlZ3k7XG4gICAgd2Fsa0ltcGwob2JqLCB0cmF2ZXJzYWxTdHJhdGVneSwgbnVsbCwgdmlzaXRvciwgY29udGV4dCk7XG4gIH0sXG5cbiAgLy8gUmVjdXJzaXZlbHkgdHJhdmVyc2VzIGBvYmpgIGluIGEgZGVwdGgtZmlyc3QgZmFzaGlvbiwgaW52b2tpbmcgdGhlXG4gIC8vIGB2aXNpdG9yYCBmdW5jdGlvbiBmb3IgZWFjaCBvYmplY3QgYmVmb3JlIHRyYXZlcnNpbmcgaXRzIGNoaWxkcmVuLlxuICAvLyBgdHJhdmVyc2FsU3RyYXRlZ3lgIGlzIGludGVuZGVkIGZvciBpbnRlcm5hbCBjYWxsZXJzLCBhbmQgaXMgbm90IHBhcnRcbiAgLy8gb2YgdGhlIHB1YmxpYyBBUEkuXG4gIHByZW9yZGVyOiBmdW5jdGlvbihvYmosIHZpc2l0b3IsIGNvbnRleHQsIHRyYXZlcnNhbFN0cmF0ZWd5KSB7XG4gICAgdHJhdmVyc2FsU3RyYXRlZ3kgPSB0cmF2ZXJzYWxTdHJhdGVneSB8fCB0aGlzLl90cmF2ZXJzYWxTdHJhdGVneTtcbiAgICB3YWxrSW1wbChvYmosIHRyYXZlcnNhbFN0cmF0ZWd5LCB2aXNpdG9yLCBudWxsLCBjb250ZXh0KTtcbiAgfSxcblxuICAvLyBCdWlsZHMgdXAgYSBzaW5nbGUgdmFsdWUgYnkgZG9pbmcgYSBwb3N0LW9yZGVyIHRyYXZlcnNhbCBvZiBgb2JqYCBhbmRcbiAgLy8gY2FsbGluZyB0aGUgYHZpc2l0b3JgIGZ1bmN0aW9uIG9uIGVhY2ggb2JqZWN0IGluIHRoZSB0cmVlLiBGb3IgbGVhZlxuICAvLyBvYmplY3RzLCB0aGUgYG1lbW9gIGFyZ3VtZW50IHRvIGB2aXNpdG9yYCBpcyB0aGUgdmFsdWUgb2YgdGhlIGBsZWFmTWVtb2BcbiAgLy8gYXJndW1lbnQgdG8gYHJlZHVjZWAuIEZvciBub24tbGVhZiBvYmplY3RzLCBgbWVtb2AgaXMgYSBjb2xsZWN0aW9uIG9mXG4gIC8vIHRoZSByZXN1bHRzIG9mIGNhbGxpbmcgYHJlZHVjZWAgb24gdGhlIG9iamVjdCdzIGNoaWxkcmVuLlxuICByZWR1Y2U6IGZ1bmN0aW9uKG9iaiwgdmlzaXRvciwgbGVhZk1lbW8sIGNvbnRleHQpIHtcbiAgICB2YXIgcmVkdWNlciA9IGZ1bmN0aW9uKHZhbHVlLCBrZXksIHBhcmVudCwgc3ViUmVzdWx0cykge1xuICAgICAgcmV0dXJuIHZpc2l0b3Ioc3ViUmVzdWx0cyB8fCBsZWFmTWVtbywgdmFsdWUsIGtleSwgcGFyZW50KTtcbiAgICB9O1xuICAgIHJldHVybiB3YWxrSW1wbChvYmosIHRoaXMuX3RyYXZlcnNhbFN0cmF0ZWd5LCBudWxsLCByZWR1Y2VyLCBjb250ZXh0LCB0cnVlKTtcbiAgfSxcblxuICAvLyBBbiAnYXR0cmlidXRlJyBpcyBhIHZhbHVlIHRoYXQgaXMgY2FsY3VsYXRlZCBieSBpbnZva2luZyBhIHZpc2l0b3JcbiAgLy8gZnVuY3Rpb24gb24gYSBub2RlLiBUaGUgZmlyc3QgYXJndW1lbnQgb2YgdGhlIHZpc2l0b3IgaXMgYSBjb2xsZWN0aW9uXG4gIC8vIG9mIHRoZSBhdHRyaWJ1dGUgdmFsdWVzIGZvciB0aGUgbm9kZSdzIGNoaWxkcmVuLiBUaGVzZSBhcmUgY2FsY3VsYXRlZFxuICAvLyBsYXppbHkgLS0gaW4gdGhpcyB3YXkgdGhlIHZpc2l0b3IgY2FuIGRlY2lkZSBpbiB3aGF0IG9yZGVyIHRvIHZpc2l0IHRoZVxuICAvLyBzdWJ0cmVlcy5cbiAgY3JlYXRlQXR0cmlidXRlOiBmdW5jdGlvbih2aXNpdG9yLCBkZWZhdWx0VmFsdWUsIGNvbnRleHQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1lbW8gPSBuZXcgV2Vha01hcCgpO1xuICAgIGZ1bmN0aW9uIF92aXNpdChzdGFjaywgdmFsdWUsIGtleSwgcGFyZW50KSB7XG4gICAgICBpZiAoaXNPYmplY3QodmFsdWUpICYmIHN0YWNrLmluZGV4T2YodmFsdWUpID49IDApXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0EgY3ljbGUgd2FzIGRldGVjdGVkIGF0ICcgKyB2YWx1ZSk7XG5cbiAgICAgIGlmIChtZW1vLmhhcyh2YWx1ZSkpXG4gICAgICAgIHJldHVybiBtZW1vLmdldCh2YWx1ZSk7XG5cbiAgICAgIHZhciBzdWJSZXN1bHRzO1xuICAgICAgdmFyIHRhcmdldCA9IHNlbGYuX3RyYXZlcnNhbFN0cmF0ZWd5KHZhbHVlKTtcbiAgICAgIGlmIChpc09iamVjdCh0YXJnZXQpICYmIE9iamVjdC5rZXlzKHRhcmdldCkubGVuZ3RoID4gMCkge1xuICAgICAgICBzdWJSZXN1bHRzID0ge307XG4gICAgICAgIGVhY2godGFyZ2V0LCBmdW5jdGlvbihjaGlsZCwgaykge1xuICAgICAgICAgIGRlZmluZUVudW1lcmFibGVQcm9wZXJ0eShzdWJSZXN1bHRzLCBrLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBfdmlzaXQoY29weUFuZFB1c2goc3RhY2ssdmFsdWUpLCBjaGlsZCwgaywgdmFsdWUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHZhciByZXN1bHQgPSB2aXNpdG9yLmNhbGwoY29udGV4dCwgc3ViUmVzdWx0cywgdmFsdWUsIGtleSwgcGFyZW50KTtcbiAgICAgIG1lbW8uc2V0KHZhbHVlLCByZXN1bHQpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikgeyByZXR1cm4gX3Zpc2l0KFtdLCBvYmopOyB9O1xuICB9XG59KTtcblxudmFyIFdhbGtlclByb3RvID0gV2Fsa2VyLnByb3RvdHlwZTtcblxuLy8gU2V0IHVwIGEgZmV3IGNvbnZlbmllbnQgYWxpYXNlcy5cbldhbGtlclByb3RvLmVhY2ggPSBXYWxrZXJQcm90by5wcmVvcmRlcjtcbldhbGtlclByb3RvLmNvbGxlY3QgPSBXYWxrZXJQcm90by5tYXA7XG5XYWxrZXJQcm90by5kZXRlY3QgPSBXYWxrZXJQcm90by5maW5kO1xuV2Fsa2VyUHJvdG8uc2VsZWN0ID0gV2Fsa2VyUHJvdG8uZmlsdGVyO1xuXG4vLyBFeHBvcnQgdGhlIHdhbGtlciBjb25zdHJ1Y3RvciwgYnV0IG1ha2UgaXQgYmVoYXZlIGxpa2UgYW4gaW5zdGFuY2UuXG5XYWxrZXIuX3RyYXZlcnNhbFN0cmF0ZWd5ID0gZGVmYXVsdFRyYXZlcnNhbDtcbm1vZHVsZS5leHBvcnRzID0gZXh0ZW5kKFdhbGtlciwgV2Fsa2VyUHJvdG8pO1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbm1vZHVsZS5leHBvcnRzID0gZXh0ZW5kO1xuZnVuY3Rpb24gZXh0ZW5kKG9yaWdpbiwgYWRkKSB7XG4gIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgaWYgKCFhZGQgfHwgdHlwZW9mIGFkZCAhPT0gJ29iamVjdCcpIHJldHVybiBvcmlnaW47XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTIgVGhlIFBvbHltZXIgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGEgQlNELXN0eWxlXG4gKiBsaWNlbnNlIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUuXG4gKi9cblxuaWYgKHR5cGVvZiBXZWFrTWFwID09PSAndW5kZWZpbmVkJykge1xuICAoZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRlZmluZVByb3BlcnR5ID0gT2JqZWN0LmRlZmluZVByb3BlcnR5O1xuICAgIHZhciBjb3VudGVyID0gRGF0ZS5ub3coKSAlIDFlOTtcblxuICAgIHZhciBXZWFrTWFwID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLm5hbWUgPSAnX19zdCcgKyAoTWF0aC5yYW5kb20oKSAqIDFlOSA+Pj4gMCkgKyAoY291bnRlcisrICsgJ19fJyk7XG4gICAgfTtcblxuICAgIFdlYWtNYXAucHJvdG90eXBlID0ge1xuICAgICAgc2V0OiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICAgIHZhciBlbnRyeSA9IGtleVt0aGlzLm5hbWVdO1xuICAgICAgICBpZiAoZW50cnkgJiYgZW50cnlbMF0gPT09IGtleSlcbiAgICAgICAgICBlbnRyeVsxXSA9IHZhbHVlO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgZGVmaW5lUHJvcGVydHkoa2V5LCB0aGlzLm5hbWUsIHt2YWx1ZTogW2tleSwgdmFsdWVdLCB3cml0YWJsZTogdHJ1ZX0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH0sXG4gICAgICBnZXQ6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIgZW50cnk7XG4gICAgICAgIHJldHVybiAoZW50cnkgPSBrZXlbdGhpcy5uYW1lXSkgJiYgZW50cnlbMF0gPT09IGtleSA/XG4gICAgICAgICAgICBlbnRyeVsxXSA6IHVuZGVmaW5lZDtcbiAgICAgIH0sXG4gICAgICBkZWxldGU6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIgZW50cnkgPSBrZXlbdGhpcy5uYW1lXTtcbiAgICAgICAgaWYgKCFlbnRyeSB8fCBlbnRyeVswXSAhPT0ga2V5KSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGVudHJ5WzBdID0gZW50cnlbMV0gPSB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICAgIGhhczogZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBlbnRyeSA9IGtleVt0aGlzLm5hbWVdO1xuICAgICAgICBpZiAoIWVudHJ5KSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiBlbnRyeVswXSA9PT0ga2V5O1xuICAgICAgfVxuICAgIH07XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IFdlYWtNYXA7XG4gIH0pKCk7XG59IGVsc2Uge1xuICBtb2R1bGUuZXhwb3J0cyA9IFdlYWtNYXA7XG59XG4iLCIhZnVuY3Rpb24oZSl7aWYoXCJvYmplY3RcIj09dHlwZW9mIGV4cG9ydHMmJlwidW5kZWZpbmVkXCIhPXR5cGVvZiBtb2R1bGUpbW9kdWxlLmV4cG9ydHM9ZSgpO2Vsc2UgaWYoXCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kKWRlZmluZShbXSxlKTtlbHNle3ZhciBmO1widW5kZWZpbmVkXCIhPXR5cGVvZiB3aW5kb3c/Zj13aW5kb3c6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIGdsb2JhbD9mPWdsb2JhbDpcInVuZGVmaW5lZFwiIT10eXBlb2Ygc2VsZiYmKGY9c2VsZiksZi5wbT1lKCl9fShmdW5jdGlvbigpe3ZhciBkZWZpbmUsbW9kdWxlLGV4cG9ydHM7cmV0dXJuIChmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pKHsxOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcbnZhciBpdGVyYWJsZSA9IF9kZXJlcV8oJy4vbGliL2l0ZXJhYmxlJyk7XG52YXIgaXNJdGVyYWJsZSA9IGl0ZXJhYmxlLmlzSXRlcmFibGU7XG52YXIgdG9BcnJheSA9IGl0ZXJhYmxlLnRvQXJyYXk7XG5cbnZhciBBcnJheVByb3RvID0gQXJyYXkucHJvdG90eXBlO1xuXG4vLyBNYXRjaEZhaWx1cmVcbi8vIC0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBNYXRjaEZhaWx1cmUodmFsdWUsIHN0YWNrKSB7XG4gIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgdGhpcy5zdGFjayA9IHN0YWNrO1xufVxuXG5NYXRjaEZhaWx1cmUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAnbWF0Y2ggZmFpbHVyZSc7XG59O1xuXG4vLyBQYXR0ZXJuXG4vLyAtLS0tLS0tXG5cbmZ1bmN0aW9uIFBhdHRlcm4oKSB7fVxuXG4vLyBDcmVhdGVzIGEgY3VzdG9tIFBhdHRlcm4gY2xhc3MuIElmIGBwcm9wc2AgaGFzIGFuICdpbml0JyBwcm9wZXJ0eSwgaXQgd2lsbFxuLy8gYmUgY2FsbGVkIHRvIGluaXRpYWxpemUgbmV3bHktY3JlYXRlZCBpbnN0YW5jZXMuIEFsbCBvdGhlciBwcm9wZXJ0aWVzIGluXG4vLyBgcHJvcHNgIHdpbGwgYmUgY29waWVkIHRvIHRoZSBwcm90b3R5cGUgb2YgdGhlIG5ldyBjb25zdHJ1Y3Rvci5cblBhdHRlcm4uZXh0ZW5kID0gZnVuY3Rpb24ocHJvcHMpIHtcbiAgdmFyIHByb3RvID0gY3Rvci5wcm90b3R5cGUgPSBuZXcgUGF0dGVybigpO1xuICBmb3IgKHZhciBrIGluIHByb3BzKSB7XG4gICAgaWYgKGsgIT09ICdpbml0JyAmJiBrICE9ICdtYXRjaCcpIHtcbiAgICAgIHByb3RvW2tdID0gcHJvcHNba107XG4gICAgfVxuICB9XG4gIGVuc3VyZSh0eXBlb2YgcHJvcHMubWF0Y2ggPT09ICdmdW5jdGlvbicsIFwiUGF0dGVybnMgbXVzdCBoYXZlIGEgJ21hdGNoJyBtZXRob2RcIik7XG4gIHByb3RvLl9tYXRjaCA9IHByb3BzLm1hdGNoO1xuXG4gIGZ1bmN0aW9uIGN0b3IoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghKHNlbGYgaW5zdGFuY2VvZiBjdG9yKSkge1xuICAgICAgc2VsZiA9IE9iamVjdC5jcmVhdGUocHJvdG8pO1xuICAgIH1cbiAgICBpZiAoJ2luaXQnIGluIHByb3BzKSB7XG4gICAgICBwcm9wcy5pbml0LmFwcGx5KHNlbGYsIEFycmF5UHJvdG8uc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcbiAgICB9XG4gICAgZW5zdXJlKHR5cGVvZiBzZWxmLmFyaXR5ID09PSAnbnVtYmVyJywgXCJQYXR0ZXJucyBtdXN0IGhhdmUgYW4gJ2FyaXR5JyBwcm9wZXJ0eVwiKTtcbiAgICByZXR1cm4gc2VsZjtcbiAgfVxuICBjdG9yLmZyb21BcnJheSA9IGZ1bmN0aW9uKGFycikgeyByZXR1cm4gY3Rvci5hcHBseShudWxsLCBhcnIpOyB9O1xuICByZXR1cm4gY3Rvcjtcbn07XG5cbi8vIEV4cG9zZSBzb21lIHVzZWZ1bCBmdW5jdGlvbnMgYXMgaW5zdGFuY2UgbWV0aG9kcyBvbiBQYXR0ZXJuLlxuUGF0dGVybi5wcm90b3R5cGUucGVyZm9ybU1hdGNoID0gcGVyZm9ybU1hdGNoO1xuUGF0dGVybi5wcm90b3R5cGUuZ2V0QXJpdHkgPSBnZXRBcml0eTtcblxuLy8gV3JhcHMgdGhlIHVzZXItc3BlY2lmaWVkIGBtYXRjaGAgZnVuY3Rpb24gd2l0aCBzb21lIGV4dHJhIGNoZWNrcy5cblBhdHRlcm4ucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gIHZhciBicyA9IFtdO1xuICB2YXIgYW5zID0gdGhpcy5fbWF0Y2godmFsdWUsIGJzKTtcbiAgaWYgKGFucykge1xuICAgIGVuc3VyZShicy5sZW5ndGggPT09IHRoaXMuYXJpdHksXG4gICAgICAgICAgICdJbmNvbnNpc3RlbnQgcGF0dGVybiBhcml0eTogZXhwZWN0ZWQgJyArIHRoaXMuYXJpdHkgKyAnLCBhY3R1YWwgJyArIGJzLmxlbmd0aCk7XG4gICAgYmluZGluZ3MucHVzaC5hcHBseShiaW5kaW5ncywgYnMpO1xuICB9XG4gIHJldHVybiBhbnM7XG59O1xuXG4vLyBUeXBlcyBvZiBwYXR0ZXJuXG4vLyAtLS0tLS0tLS0tLS0tLS0tXG5cbk1hdGNoZXIuaXMgPSBQYXR0ZXJuLmV4dGVuZCh7XG4gIGluaXQ6IGZ1bmN0aW9uKGV4cGVjdGVkVmFsdWUpIHtcbiAgICB0aGlzLmV4cGVjdGVkVmFsdWUgPSBleHBlY3RlZFZhbHVlO1xuICB9LFxuICBhcml0eTogMCxcbiAgbWF0Y2g6IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICAgIHJldHVybiBfZXF1YWxpdHlNYXRjaCh2YWx1ZSwgdGhpcy5leHBlY3RlZFZhbHVlLCBiaW5kaW5ncyk7XG4gIH1cbn0pO1xuXG5NYXRjaGVyLml0ZXJhYmxlID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbigvKiBwYXR0ZXJuLCAuLi4gKi8pIHtcbiAgICB0aGlzLnBhdHRlcm5zID0gQXJyYXlQcm90by5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgdGhpcy5hcml0eSA9IHRoaXMucGF0dGVybnNcbiAgICAgIC5tYXAoZnVuY3Rpb24ocGF0dGVybikgeyByZXR1cm4gZ2V0QXJpdHkocGF0dGVybik7IH0pXG4gICAgICAucmVkdWNlKGZ1bmN0aW9uKGExLCBhMikgeyByZXR1cm4gYTEgKyBhMjsgfSwgMCk7XG4gIH0sXG4gIG1hdGNoOiBmdW5jdGlvbih2YWx1ZSwgYmluZGluZ3MpIHtcbiAgICByZXR1cm4gaXNJdGVyYWJsZSh2YWx1ZSkgP1xuICAgICAgX2FycmF5TWF0Y2godG9BcnJheSh2YWx1ZSksIHRoaXMucGF0dGVybnMsIGJpbmRpbmdzKSA6XG4gICAgICBmYWxzZTtcbiAgfVxufSk7XG5cbk1hdGNoZXIubWFueSA9IFBhdHRlcm4uZXh0ZW5kKHtcbiAgaW5pdDogZnVuY3Rpb24ocGF0dGVybikge1xuICAgIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG4gIH0sXG4gIGFyaXR5OiAxLFxuICBtYXRjaDogZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiJ21hbnknIHBhdHRlcm4gdXNlZCBvdXRzaWRlIGFycmF5IHBhdHRlcm5cIik7XG4gIH1cbn0pO1xuXG5NYXRjaGVyLm9wdCA9IFBhdHRlcm4uZXh0ZW5kKHtcbiAgaW5pdDogZnVuY3Rpb24ocGF0dGVybikge1xuICAgIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG4gIH0sXG4gIGFyaXR5OiAxLFxuICBtYXRjaDogZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiJ29wdCcgcGF0dGVybiB1c2VkIG91dHNpZGUgYXJyYXkgcGF0dGVyblwiKTtcbiAgfVxufSk7XG5cbk1hdGNoZXIudHJhbnMgPSBQYXR0ZXJuLmV4dGVuZCh7XG4gIGluaXQ6IGZ1bmN0aW9uKHBhdHRlcm4sIGZ1bmMpIHtcbiAgICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xuICAgIHRoaXMuZnVuYyA9IGZ1bmM7XG4gICAgZW5zdXJlKFxuICAgICAgdHlwZW9mIGZ1bmMgPT09ICdmdW5jdGlvbicgJiYgZnVuYy5sZW5ndGggPT09IGdldEFyaXR5KHBhdHRlcm4pLFxuICAgICAgJ2Z1bmMgbXVzdCBiZSBhICcgKyBnZXRBcml0eShwYXR0ZXJuKSArICctYXJndW1lbnQgZnVuY3Rpb24nXG4gICAgKTtcbiAgfSxcbiAgYXJpdHk6IDEsXG4gIG1hdGNoOiBmdW5jdGlvbih2YWx1ZSwgYmluZGluZ3MpIHtcbiAgICB2YXIgYnMgPSBbXTtcbiAgICBpZiAocGVyZm9ybU1hdGNoKHZhbHVlLCB0aGlzLnBhdHRlcm4sIGJzKSkge1xuICAgICAgdmFyIGFucyA9IHRoaXMuZnVuYy5hcHBseSh0aGlzLnRoaXNPYmosIGJzKTtcbiAgICAgIGJpbmRpbmdzLnB1c2goYW5zKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn0pO1xuXG5NYXRjaGVyLndoZW4gPSBQYXR0ZXJuLmV4dGVuZCh7XG4gIGluaXQ6IGZ1bmN0aW9uKHBhdHRlcm4sIHByZWRpY2F0ZSkge1xuICAgIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG4gICAgdGhpcy5wcmVkaWNhdGUgPSBwcmVkaWNhdGU7XG4gICAgdGhpcy5hcml0eSA9IGdldEFyaXR5KHBhdHRlcm4pO1xuICAgIGVuc3VyZShcbiAgICAgIHR5cGVvZiBwcmVkaWNhdGUgPT09ICdmdW5jdGlvbicgJiYgcHJlZGljYXRlLmxlbmd0aCA9PT0gdGhpcy5hcml0eSxcbiAgICAgICdwcmVkaWNhdGUgbXVzdCBiZSBhICcgKyB0aGlzLmFyaXR5ICsgJy1hcmd1bWVudCBmdW5jdGlvbidcbiAgICApO1xuICB9LFxuICBtYXRjaDogZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gICAgdmFyIGJzID0gW107XG4gICAgaWYgKHBlcmZvcm1NYXRjaCh2YWx1ZSwgdGhpcy5wYXR0ZXJuLCBicykgJiZcbiAgICAgICAgdGhpcy5wcmVkaWNhdGUuYXBwbHkodGhpcy50aGlzT2JqLCBicykpIHtcbiAgICAgIGJpbmRpbmdzLnB1c2guYXBwbHkoYmluZGluZ3MsIGJzKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn0pO1xuXG5NYXRjaGVyLm9yID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbigvKiBwMSwgcDIsIC4uLiAqLykge1xuICAgIGVuc3VyZShhcmd1bWVudHMubGVuZ3RoID49IDEsIFwiJ29yJyByZXF1aXJlcyBhdCBsZWFzdCBvbmUgcGF0dGVyblwiKTtcbiAgICB0aGlzLnBhdHRlcm5zID0gQXJyYXlQcm90by5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgdGhpcy5hcml0eSA9IGVuc3VyZVVuaWZvcm1Bcml0eSh0aGlzLnBhdHRlcm5zLCAnb3InKTtcbiAgfSxcbiAgbWF0Y2g6IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICAgIHZhciBwYXR0ZXJucyA9IHRoaXMucGF0dGVybnM7XG4gICAgdmFyIGFucyA9IGZhbHNlO1xuICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IHBhdHRlcm5zLmxlbmd0aCAmJiAhYW5zOyBpZHgrKykge1xuICAgICAgYW5zID0gcGVyZm9ybU1hdGNoKHZhbHVlLCBwYXR0ZXJuc1tpZHhdLCBiaW5kaW5ncyk7XG4gICAgfVxuICAgIHJldHVybiBhbnM7XG4gIH0sXG59KTtcblxuTWF0Y2hlci5hbmQgPSBQYXR0ZXJuLmV4dGVuZCh7XG4gIGluaXQ6IGZ1bmN0aW9uKC8qIHAxLCBwMiwgLi4uICovKSB7XG4gICAgZW5zdXJlKGFyZ3VtZW50cy5sZW5ndGggPj0gMSwgXCInYW5kJyByZXF1aXJlcyBhdCBsZWFzdCBvbmUgcGF0dGVyblwiKTtcbiAgICB0aGlzLnBhdHRlcm5zID0gQXJyYXlQcm90by5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgdGhpcy5hcml0eSA9IHRoaXMucGF0dGVybnMucmVkdWNlKGZ1bmN0aW9uKHN1bSwgcCkge1xuICAgICAgcmV0dXJuIHN1bSArIGdldEFyaXR5KHApOyB9LFxuICAgIDApO1xuICB9LFxuICBtYXRjaDogZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gICAgdmFyIHBhdHRlcm5zID0gdGhpcy5wYXR0ZXJucztcbiAgICB2YXIgYW5zID0gdHJ1ZTtcbiAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBwYXR0ZXJucy5sZW5ndGggJiYgYW5zOyBpZHgrKykge1xuICAgICAgYW5zID0gcGVyZm9ybU1hdGNoKHZhbHVlLCBwYXR0ZXJuc1tpZHhdLCBiaW5kaW5ncyk7XG4gICAgfVxuICAgIHJldHVybiBhbnM7XG4gIH1cbn0pO1xuXG4vLyBIZWxwZXJzXG4vLyAtLS0tLS0tXG5cbmZ1bmN0aW9uIF9hcnJheU1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncykge1xuICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZhciB2SWR4ID0gMDtcbiAgdmFyIHBJZHggPSAwO1xuICB3aGlsZSAocElkeCA8IHBhdHRlcm4ubGVuZ3RoKSB7XG4gICAgdmFyIHAgPSBwYXR0ZXJuW3BJZHgrK107XG4gICAgaWYgKHAgaW5zdGFuY2VvZiBNYXRjaGVyLm1hbnkpIHtcbiAgICAgIHAgPSBwLnBhdHRlcm47XG4gICAgICB2YXIgdnMgPSBbXTtcbiAgICAgIHdoaWxlICh2SWR4IDwgdmFsdWUubGVuZ3RoICYmIHBlcmZvcm1NYXRjaCh2YWx1ZVt2SWR4XSwgcCwgdnMpKSB7XG4gICAgICAgIHZJZHgrKztcbiAgICAgIH1cbiAgICAgIGJpbmRpbmdzLnB1c2godnMpO1xuICAgIH0gZWxzZSBpZiAocCBpbnN0YW5jZW9mIE1hdGNoZXIub3B0KSB7XG4gICAgICB2YXIgYW5zID0gdklkeCA8IHZhbHVlLmxlbmd0aCA/IHBlcmZvcm1NYXRjaCh2YWx1ZVt2SWR4XSwgcC5wYXR0ZXJuLCBbXSkgOiBmYWxzZTtcbiAgICAgIGlmIChhbnMpIHtcbiAgICAgICAgYmluZGluZ3MucHVzaChhbnMpO1xuICAgICAgICB2SWR4Kys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBiaW5kaW5ncy5wdXNoKHVuZGVmaW5lZCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChwZXJmb3JtTWF0Y2godmFsdWVbdklkeF0sIHAsIGJpbmRpbmdzKSkge1xuICAgICAgdklkeCsrO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB2SWR4ID09PSB2YWx1ZS5sZW5ndGggJiYgcElkeCA9PT0gcGF0dGVybi5sZW5ndGg7XG59XG5cbmZ1bmN0aW9uIF9vYmpNYXRjaCh2YWx1ZSwgcGF0dGVybiwgYmluZGluZ3MpIHtcbiAgZm9yICh2YXIgayBpbiBwYXR0ZXJuKSB7XG4gICAgaWYgKHBhdHRlcm4uaGFzT3duUHJvcGVydHkoaykgJiZcbiAgICAgICAgIShrIGluIHZhbHVlKSB8fFxuICAgICAgICAhcGVyZm9ybU1hdGNoKHZhbHVlW2tdLCBwYXR0ZXJuW2tdLCBiaW5kaW5ncykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIF9mdW5jdGlvbk1hdGNoKHZhbHVlLCBmdW5jLCBiaW5kaW5ncykge1xuICBpZiAoZnVuYyh2YWx1ZSkpIHtcbiAgICBiaW5kaW5ncy5wdXNoKHZhbHVlKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIF9lcXVhbGl0eU1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncykge1xuICByZXR1cm4gdmFsdWUgPT09IHBhdHRlcm47XG59XG5cbmZ1bmN0aW9uIF9yZWdFeHBNYXRjaCh2YWx1ZSwgcGF0dGVybiwgYmluZGluZ3MpIHtcbiAgdmFyIGFucyA9IHBhdHRlcm4uZXhlYyh2YWx1ZSk7XG4gIGlmIChhbnMgIT09IG51bGwgJiYgYW5zWzBdID09PSB2YWx1ZSkge1xuICAgIGJpbmRpbmdzLnB1c2goYW5zKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHBlcmZvcm1NYXRjaCh2YWx1ZSwgcGF0dGVybiwgYmluZGluZ3MpIHtcbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBQYXR0ZXJuKSB7XG4gICAgcmV0dXJuIHBhdHRlcm4ubWF0Y2godmFsdWUsIGJpbmRpbmdzKTtcbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHBhdHRlcm4pKSB7XG4gICAgcmV0dXJuIF9hcnJheU1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncyk7XG4gIH0gZWxzZSBpZiAocGF0dGVybiBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgIHJldHVybiBfcmVnRXhwTWF0Y2godmFsdWUsIHBhdHRlcm4sIGJpbmRpbmdzKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgcGF0dGVybiA9PT0gJ29iamVjdCcgJiYgcGF0dGVybiAhPT0gbnVsbCkge1xuICAgIHJldHVybiBfb2JqTWF0Y2godmFsdWUsIHBhdHRlcm4sIGJpbmRpbmdzKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgcGF0dGVybiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBfZnVuY3Rpb25NYXRjaCh2YWx1ZSwgcGF0dGVybiwgYmluZGluZ3MpO1xuICB9XG4gIHJldHVybiBfZXF1YWxpdHlNYXRjaCh2YWx1ZSwgcGF0dGVybiwgYmluZGluZ3MpO1xufVxuXG5mdW5jdGlvbiBnZXRBcml0eShwYXR0ZXJuKSB7XG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgUGF0dGVybikge1xuICAgIHJldHVybiBwYXR0ZXJuLmFyaXR5O1xuICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocGF0dGVybikpIHtcbiAgICByZXR1cm4gcGF0dGVyblxuICAgICAgLm1hcChmdW5jdGlvbihwKSB7IHJldHVybiBnZXRBcml0eShwKTsgfSlcbiAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYTEsIGEyKSB7IHJldHVybiBhMSArIGEyOyB9LCAwKTtcbiAgfSBlbHNlIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgcmV0dXJuIDE7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHBhdHRlcm4gPT09ICdvYmplY3QnICYmIHBhdHRlcm4gIT09IG51bGwpIHtcbiAgICB2YXIgYW5zID0gMDtcbiAgICBmb3IgKHZhciBrIGluIHBhdHRlcm4pIHtcbiAgICAgIGlmIChwYXR0ZXJuLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgIGFucyArPSBnZXRBcml0eShwYXR0ZXJuW2tdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFucztcbiAgfSBlbHNlIGlmICh0eXBlb2YgcGF0dGVybiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiAxO1xuICB9XG4gIHJldHVybiAwO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVVbmlmb3JtQXJpdHkocGF0dGVybnMsIG9wKSB7XG4gIHZhciByZXN1bHQgPSBnZXRBcml0eShwYXR0ZXJuc1swXSk7XG4gIGZvciAodmFyIGlkeCA9IDE7IGlkeCA8IHBhdHRlcm5zLmxlbmd0aDsgaWR4KyspIHtcbiAgICB2YXIgYSA9IGdldEFyaXR5KHBhdHRlcm5zW2lkeF0pO1xuICAgIGlmIChhICE9PSByZXN1bHQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihvcCArICc6IGV4cGVjdGVkIGFyaXR5ICcgKyByZXN1bHQgKyAnIGF0IGluZGV4ICcgKyBpZHggKyAnLCBnb3QgJyArIGEpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBlbnN1cmUoY29uZCwgbWVzc2FnZSkge1xuICBpZiAoIWNvbmQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gIH1cbn1cblxuLy8gTWF0Y2hlclxuLy8gLS0tLS0tLVxuXG5mdW5jdGlvbiBNYXRjaGVyKCkge1xuICB0aGlzLnBhdHRlcm5zID0gW107XG4gIHRoaXMudGhpc09iaiA9IHVuZGVmaW5lZDtcbn1cblxuTWF0Y2hlci5wcm90b3R5cGUud2l0aFRoaXMgPSBmdW5jdGlvbihvYmopIHtcbiAgdGhpcy50aGlzT2JqID0gb2JqO1xuICByZXR1cm4gdGhpcztcbn07XG5cbk1hdGNoZXIucHJvdG90eXBlLmFkZENhc2UgPSBmdW5jdGlvbihwYXR0ZXJuLCBvcHRGdW5jKSB7XG4gIHRoaXMucGF0dGVybnMucHVzaChNYXRjaGVyLnRyYW5zKHBhdHRlcm4sIG9wdEZ1bmMpKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5NYXRjaGVyLnByb3RvdHlwZS5tYXRjaCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGVuc3VyZSh0aGlzLnBhdHRlcm5zLmxlbmd0aCA+IDAsICdNYXRjaGVyIHJlcXVpcmVzIGF0IGxlYXN0IG9uZSBjYXNlJyk7XG5cbiAgdmFyIGJpbmRpbmdzID0gW107XG4gIGlmIChNYXRjaGVyLm9yLmZyb21BcnJheSh0aGlzLnBhdHRlcm5zKS5tYXRjaCh2YWx1ZSwgYmluZGluZ3MpKSB7XG4gICAgcmV0dXJuIGJpbmRpbmdzWzBdO1xuICB9XG4gIHRocm93IG5ldyBNYXRjaEZhaWx1cmUodmFsdWUsIG5ldyBFcnJvcigpLnN0YWNrKTtcbn07XG5cbk1hdGNoZXIucHJvdG90eXBlLnRvRnVuY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHsgcmV0dXJuIHNlbGYubWF0Y2godmFsdWUpOyB9O1xufTtcblxuLy8gUHJpbWl0aXZlIHBhdHRlcm5zXG5cbk1hdGNoZXIuXyAgICAgID0gZnVuY3Rpb24oeCkgeyByZXR1cm4gdHJ1ZTsgfTtcbk1hdGNoZXIuYm9vbCAgID0gZnVuY3Rpb24oeCkgeyByZXR1cm4gdHlwZW9mIHggPT09ICdib29sZWFuJzsgfTtcbk1hdGNoZXIubnVtYmVyID0gZnVuY3Rpb24oeCkgeyByZXR1cm4gdHlwZW9mIHggPT09ICdudW1iZXInOyB9O1xuTWF0Y2hlci5zdHJpbmcgPSBmdW5jdGlvbih4KSB7IHJldHVybiB0eXBlb2YgeCA9PT0gJ3N0cmluZyc7IH07XG5NYXRjaGVyLmNoYXIgICA9IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHR5cGVvZiB4ID09PSAnc3RyaW5nJyAmJiB4Lmxlbmd0aCA9PT0gMDsgfTtcblxuLy8gT3BlcmF0b3JzXG5cbk1hdGNoZXIuaW5zdGFuY2VPZiA9IGZ1bmN0aW9uKGNsYXp6KSB7IHJldHVybiBmdW5jdGlvbih4KSB7IHJldHVybiB4IGluc3RhbmNlb2YgY2xheno7IH07IH07XG5cbk1hdGNoZXIuTWF0Y2hGYWlsdXJlID0gTWF0Y2hGYWlsdXJlO1xuXG4vLyBUZXJzZSBpbnRlcmZhY2Vcbi8vIC0tLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBtYXRjaCh2YWx1ZSAvKiAsIHBhdDEsIGZ1bjEsIHBhdDIsIGZ1bjIsIC4uLiAqLykge1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcblxuICAvLyBXaGVuIGNhbGxlZCB3aXRoIGp1c3QgYSB2YWx1ZSBhbmQgYSBwYXR0ZXJuLCByZXR1cm4gdGhlIGJpbmRpbmdzIGlmXG4gIC8vIHRoZSBtYXRjaCB3YXMgc3VjY2Vzc2Z1bCwgb3RoZXJ3aXNlIG51bGwuXG4gIGlmIChhcmdzLmxlbmd0aCA9PT0gMikge1xuICAgIHZhciBiaW5kaW5ncyA9IFtdO1xuICAgIGlmIChwZXJmb3JtTWF0Y2godmFsdWUsIGFyZ3VtZW50c1sxXSwgYmluZGluZ3MpKSB7XG4gICAgICByZXR1cm4gYmluZGluZ3M7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgZW5zdXJlKFxuICAgICAgYXJncy5sZW5ndGggPiAyICYmIGFyZ3MubGVuZ3RoICUgMiA9PT0gMSxcbiAgICAgICdtYXRjaCBjYWxsZWQgd2l0aCBpbnZhbGlkIGFyZ3VtZW50cycpO1xuICB2YXIgbSA9IG5ldyBNYXRjaGVyKCk7XG4gIGZvciAodmFyIGlkeCA9IDE7IGlkeCA8IGFyZ3MubGVuZ3RoOyBpZHggKz0gMikge1xuICAgIHZhciBwYXR0ZXJuID0gYXJnc1tpZHhdO1xuICAgIHZhciBmdW5jID0gYXJnc1tpZHggKyAxXTtcbiAgICBtLmFkZENhc2UocGF0dGVybiwgZnVuYyk7XG4gIH1cbiAgcmV0dXJuIG0ubWF0Y2godmFsdWUpO1xufVxuXG4vLyBFeHBvcnRzXG4vLyAtLS0tLS0tXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBNYXRjaGVyOiBNYXRjaGVyLFxuICBtYXRjaDogbWF0Y2gsXG4gIFBhdHRlcm46IFBhdHRlcm5cbn07XG5cbn0se1wiLi9saWIvaXRlcmFibGVcIjoyfV0sMjpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4vKiBnbG9iYWwgU3ltYm9sICovXG5cbnZhciBJVEVSQVRPUl9TWU1CT0wgPSB0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmIFN5bWJvbC5pdGVyYXRvcjtcbnZhciBGQUtFX0lURVJBVE9SX1NZTUJPTCA9ICdAQGl0ZXJhdG9yJztcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLy8gSGVscGVyc1xuLy8gLS0tLS0tLVxuXG5mdW5jdGlvbiBpc1N0cmluZyhvYmopIHtcblx0cmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgU3RyaW5nXSc7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKG9iaikge1xuXHRyZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBOdW1iZXJdJztcbn1cblxuZnVuY3Rpb24gaXNBcnJheUxpa2Uob2JqKSB7XG5cdHJldHVybiBpc051bWJlcihvYmoubGVuZ3RoKSAmJiAhaXNTdHJpbmcob2JqKTtcbn1cblxuLy8gQXJyYXlJdGVyYXRvclxuLy8gLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBBcnJheUl0ZXJhdG9yKGl0ZXJhdGVlKSB7XG5cdHRoaXMuX2l0ZXJhdGVlID0gaXRlcmF0ZWU7XG5cdHRoaXMuX2kgPSAwO1xuXHR0aGlzLl9sZW4gPSBpdGVyYXRlZS5sZW5ndGg7XG59XG5cbkFycmF5SXRlcmF0b3IucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbigpIHtcblx0aWYgKHRoaXMuX2kgPCB0aGlzLl9sZW4pIHtcblx0XHRyZXR1cm4geyBkb25lOiBmYWxzZSwgdmFsdWU6IHRoaXMuX2l0ZXJhdGVlW3RoaXMuX2krK10gfTtcblx0fVxuXHRyZXR1cm4geyBkb25lOiB0cnVlIH07XG59O1xuXG5BcnJheUl0ZXJhdG9yLnByb3RvdHlwZVtGQUtFX0lURVJBVE9SX1NZTUJPTF0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH07XG5cbmlmIChJVEVSQVRPUl9TWU1CT0wpIHtcblx0QXJyYXlJdGVyYXRvci5wcm90b3R5cGVbSVRFUkFUT1JfU1lNQk9MXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfTtcbn1cblxuLy8gRXhwb3J0c1xuLy8gLS0tLS0tLVxuXG4vLyBSZXR1cm5zIGFuIGl0ZXJhdG9yIChhbiBvYmplY3QgdGhhdCBoYXMgYSBuZXh0KCkgbWV0aG9kKSBmb3IgYG9iamAuXG4vLyBGaXJzdCwgaXQgdHJpZXMgdG8gdXNlIHRoZSBFUzYgaXRlcmF0b3IgcHJvdG9jb2wgKFN5bWJvbC5pdGVyYXRvcikuXG4vLyBJdCBmYWxscyBiYWNrIHRvIHRoZSAnZmFrZScgaXRlcmF0b3IgcHJvdG9jb2wgKCdAQGl0ZXJhdG9yJykgdGhhdCBpc1xuLy8gdXNlZCBieSBzb21lIGxpYnJhcmllcyAoZS5nLiBpbW11dGFibGUtanMpLiBGaW5hbGx5LCBpZiB0aGUgb2JqZWN0IGhhc1xuLy8gYSBudW1lcmljIGBsZW5ndGhgIHByb3BlcnR5IGFuZCBpcyBub3QgYSBzdHJpbmcsIGl0IGlzIHRyZWF0ZWQgYXMgYW4gQXJyYXlcbi8vIHRvIGJlIGl0ZXJhdGVkIHVzaW5nIGFuIEFycmF5SXRlcmF0b3IuXG5mdW5jdGlvbiBnZXRJdGVyYXRvcihvYmopIHtcblx0aWYgKCFvYmopIHtcblx0XHRyZXR1cm47XG5cdH1cblx0aWYgKElURVJBVE9SX1NZTUJPTCAmJiB0eXBlb2Ygb2JqW0lURVJBVE9SX1NZTUJPTF0gPT09ICdmdW5jdGlvbicpIHtcblx0XHRyZXR1cm4gb2JqW0lURVJBVE9SX1NZTUJPTF0oKTtcblx0fVxuXHRpZiAodHlwZW9mIG9ialtGQUtFX0lURVJBVE9SX1NZTUJPTF0gPT09ICdmdW5jdGlvbicpIHtcblx0XHRyZXR1cm4gb2JqW0ZBS0VfSVRFUkFUT1JfU1lNQk9MXSgpO1xuXHR9XG5cdGlmIChpc0FycmF5TGlrZShvYmopKSB7XG5cdFx0cmV0dXJuIG5ldyBBcnJheUl0ZXJhdG9yKG9iaik7XG5cdH1cbn1cblxuZnVuY3Rpb24gaXNJdGVyYWJsZShvYmopIHtcblx0aWYgKG9iaikge1xuXHRcdHJldHVybiAoSVRFUkFUT1JfU1lNQk9MICYmIHR5cGVvZiBvYmpbSVRFUkFUT1JfU1lNQk9MXSA9PT0gJ2Z1bmN0aW9uJykgfHxcblx0XHRcdFx0XHQgdHlwZW9mIG9ialtGQUtFX0lURVJBVE9SX1NZTUJPTF0gPT09ICdmdW5jdGlvbicgfHxcblx0XHRcdFx0XHQgaXNBcnJheUxpa2Uob2JqKTtcblx0fVxuXHRyZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHRvQXJyYXkoaXRlcmFibGUpIHtcblx0dmFyIGl0ZXIgPSBnZXRJdGVyYXRvcihpdGVyYWJsZSk7XG5cdGlmIChpdGVyKSB7XG5cdFx0dmFyIHJlc3VsdCA9IFtdO1xuXHRcdHZhciBuZXh0O1xuXHRcdHdoaWxlICghKG5leHQgPSBpdGVyLm5leHQoKSkuZG9uZSkge1xuXHRcdFx0cmVzdWx0LnB1c2gobmV4dC52YWx1ZSk7XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGdldEl0ZXJhdG9yOiBnZXRJdGVyYXRvcixcblx0aXNJdGVyYWJsZTogaXNJdGVyYWJsZSxcblx0dG9BcnJheTogdG9BcnJheVxufTtcblxufSx7fV19LHt9LFsxXSkoMSlcbn0pO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYkltNXZaR1ZmYlc5a2RXeGxjeTlpY205M2MyVnlhV1o1TDI1dlpHVmZiVzlrZFd4bGN5OWljbTkzYzJWeUxYQmhZMnN2WDNCeVpXeDFaR1V1YW5NaUxDSXZWWE5sY25NdlpIVmljbTk1TDJSbGRpOWpaR2N2Y0dGMGRHVnliaTF0WVhSamFDOXBibVJsZUM1cWN5SXNJaTlWYzJWeWN5OWtkV0p5YjNrdlpHVjJMMk5rWnk5d1lYUjBaWEp1TFcxaGRHTm9MMnhwWWk5cGRHVnlZV0pzWlM1cWN5SmRMQ0p1WVcxbGN5STZXMTBzSW0xaGNIQnBibWR6SWpvaVFVRkJRVHRCUTBGQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHM3UVVNeldVRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRU0lzSW1acGJHVWlPaUpuWlc1bGNtRjBaV1F1YW5NaUxDSnpiM1Z5WTJWU2IyOTBJam9pSWl3aWMyOTFjbU5sYzBOdmJuUmxiblFpT2xzaUtHWjFibU4wYVc5dUlHVW9kQ3h1TEhJcGUyWjFibU4wYVc5dUlITW9ieXgxS1h0cFppZ2hibHR2WFNsN2FXWW9JWFJiYjEwcGUzWmhjaUJoUFhSNWNHVnZaaUJ5WlhGMWFYSmxQVDFjSW1aMWJtTjBhVzl1WENJbUpuSmxjWFZwY21VN2FXWW9JWFVtSm1FcGNtVjBkWEp1SUdFb2J5d2hNQ2s3YVdZb2FTbHlaWFIxY200Z2FTaHZMQ0V3S1R0MllYSWdaajF1WlhjZ1JYSnliM0lvWENKRFlXNXViM1FnWm1sdVpDQnRiMlIxYkdVZ0oxd2lLMjhyWENJblhDSXBPM1JvY205M0lHWXVZMjlrWlQxY0lrMVBSRlZNUlY5T1QxUmZSazlWVGtSY0lpeG1mWFpoY2lCc1BXNWJiMTA5ZTJWNGNHOXlkSE02ZTMxOU8zUmJiMTFiTUYwdVkyRnNiQ2hzTG1WNGNHOXlkSE1zWm5WdVkzUnBiMjRvWlNsN2RtRnlJRzQ5ZEZ0dlhWc3hYVnRsWFR0eVpYUjFjbTRnY3lodVAyNDZaU2w5TEd3c2JDNWxlSEJ2Y25SekxHVXNkQ3h1TEhJcGZYSmxkSFZ5YmlCdVcyOWRMbVY0Y0c5eWRITjlkbUZ5SUdrOWRIbHdaVzltSUhKbGNYVnBjbVU5UFZ3aVpuVnVZM1JwYjI1Y0lpWW1jbVZ4ZFdseVpUdG1iM0lvZG1GeUlHODlNRHR2UEhJdWJHVnVaM1JvTzI4ckt5bHpLSEpiYjEwcE8zSmxkSFZ5YmlCemZTa2lMQ0oyWVhJZ2FYUmxjbUZpYkdVZ1BTQnlaWEYxYVhKbEtDY3VMMnhwWWk5cGRHVnlZV0pzWlNjcE8xeHVkbUZ5SUdselNYUmxjbUZpYkdVZ1BTQnBkR1Z5WVdKc1pTNXBjMGwwWlhKaFlteGxPMXh1ZG1GeUlIUnZRWEp5WVhrZ1BTQnBkR1Z5WVdKc1pTNTBiMEZ5Y21GNU8xeHVYRzUyWVhJZ1FYSnlZWGxRY205MGJ5QTlJRUZ5Y21GNUxuQnliM1J2ZEhsd1pUdGNibHh1THk4Z1RXRjBZMmhHWVdsc2RYSmxYRzR2THlBdExTMHRMUzB0TFMwdExTMWNibHh1Wm5WdVkzUnBiMjRnVFdGMFkyaEdZV2xzZFhKbEtIWmhiSFZsTENCemRHRmpheWtnZTF4dUlDQjBhR2x6TG5aaGJIVmxJRDBnZG1Gc2RXVTdYRzRnSUhSb2FYTXVjM1JoWTJzZ1BTQnpkR0ZqYXp0Y2JuMWNibHh1VFdGMFkyaEdZV2xzZFhKbExuQnliM1J2ZEhsd1pTNTBiMU4wY21sdVp5QTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQnlaWFIxY200Z0oyMWhkR05vSUdaaGFXeDFjbVVuTzF4dWZUdGNibHh1THk4Z1VHRjBkR1Z5Ymx4dUx5OGdMUzB0TFMwdExWeHVYRzVtZFc1amRHbHZiaUJRWVhSMFpYSnVLQ2tnZTMxY2JseHVMeThnUTNKbFlYUmxjeUJoSUdOMWMzUnZiU0JRWVhSMFpYSnVJR05zWVhOekxpQkpaaUJnY0hKdmNITmdJR2hoY3lCaGJpQW5hVzVwZENjZ2NISnZjR1Z5ZEhrc0lHbDBJSGRwYkd4Y2JpOHZJR0psSUdOaGJHeGxaQ0IwYnlCcGJtbDBhV0ZzYVhwbElHNWxkMng1TFdOeVpXRjBaV1FnYVc1emRHRnVZMlZ6TGlCQmJHd2diM1JvWlhJZ2NISnZjR1Z5ZEdsbGN5QnBibHh1THk4Z1lIQnliM0J6WUNCM2FXeHNJR0psSUdOdmNHbGxaQ0IwYnlCMGFHVWdjSEp2ZEc5MGVYQmxJRzltSUhSb1pTQnVaWGNnWTI5dWMzUnlkV04wYjNJdVhHNVFZWFIwWlhKdUxtVjRkR1Z1WkNBOUlHWjFibU4wYVc5dUtIQnliM0J6S1NCN1hHNGdJSFpoY2lCd2NtOTBieUE5SUdOMGIzSXVjSEp2ZEc5MGVYQmxJRDBnYm1WM0lGQmhkSFJsY200b0tUdGNiaUFnWm05eUlDaDJZWElnYXlCcGJpQndjbTl3Y3lrZ2UxeHVJQ0FnSUdsbUlDaHJJQ0U5UFNBbmFXNXBkQ2NnSmlZZ2F5QWhQU0FuYldGMFkyZ25LU0I3WEc0Z0lDQWdJQ0J3Y205MGIxdHJYU0E5SUhCeWIzQnpXMnRkTzF4dUlDQWdJSDFjYmlBZ2ZWeHVJQ0JsYm5OMWNtVW9kSGx3Wlc5bUlIQnliM0J6TG0xaGRHTm9JRDA5UFNBblpuVnVZM1JwYjI0bkxDQmNJbEJoZEhSbGNtNXpJRzExYzNRZ2FHRjJaU0JoSUNkdFlYUmphQ2NnYldWMGFHOWtYQ0lwTzF4dUlDQndjbTkwYnk1ZmJXRjBZMmdnUFNCd2NtOXdjeTV0WVhSamFEdGNibHh1SUNCbWRXNWpkR2x2YmlCamRHOXlLQ2tnZTF4dUlDQWdJSFpoY2lCelpXeG1JRDBnZEdocGN6dGNiaUFnSUNCcFppQW9JU2h6Wld4bUlHbHVjM1JoYm1ObGIyWWdZM1J2Y2lrcElIdGNiaUFnSUNBZ0lITmxiR1lnUFNCUFltcGxZM1F1WTNKbFlYUmxLSEJ5YjNSdktUdGNiaUFnSUNCOVhHNGdJQ0FnYVdZZ0tDZHBibWwwSnlCcGJpQndjbTl3Y3lrZ2UxeHVJQ0FnSUNBZ2NISnZjSE11YVc1cGRDNWhjSEJzZVNoelpXeG1MQ0JCY25KaGVWQnliM1J2TG5Oc2FXTmxMbU5oYkd3b1lYSm5kVzFsYm5SektTazdYRzRnSUNBZ2ZWeHVJQ0FnSUdWdWMzVnlaU2gwZVhCbGIyWWdjMlZzWmk1aGNtbDBlU0E5UFQwZ0oyNTFiV0psY2ljc0lGd2lVR0YwZEdWeWJuTWdiWFZ6ZENCb1lYWmxJR0Z1SUNkaGNtbDBlU2NnY0hKdmNHVnlkSGxjSWlrN1hHNGdJQ0FnY21WMGRYSnVJSE5sYkdZN1hHNGdJSDFjYmlBZ1kzUnZjaTVtY205dFFYSnlZWGtnUFNCbWRXNWpkR2x2YmloaGNuSXBJSHNnY21WMGRYSnVJR04wYjNJdVlYQndiSGtvYm5Wc2JDd2dZWEp5S1RzZ2ZUdGNiaUFnY21WMGRYSnVJR04wYjNJN1hHNTlPMXh1WEc0dkx5QkZlSEJ2YzJVZ2MyOXRaU0IxYzJWbWRXd2dablZ1WTNScGIyNXpJR0Z6SUdsdWMzUmhibU5sSUcxbGRHaHZaSE1nYjI0Z1VHRjBkR1Z5Ymk1Y2JsQmhkSFJsY200dWNISnZkRzkwZVhCbExuQmxjbVp2Y20xTllYUmphQ0E5SUhCbGNtWnZjbTFOWVhSamFEdGNibEJoZEhSbGNtNHVjSEp2ZEc5MGVYQmxMbWRsZEVGeWFYUjVJRDBnWjJWMFFYSnBkSGs3WEc1Y2JpOHZJRmR5WVhCeklIUm9aU0IxYzJWeUxYTndaV05wWm1sbFpDQmdiV0YwWTJoZ0lHWjFibU4wYVc5dUlIZHBkR2dnYzI5dFpTQmxlSFJ5WVNCamFHVmphM011WEc1UVlYUjBaWEp1TG5CeWIzUnZkSGx3WlM1dFlYUmphQ0E5SUdaMWJtTjBhVzl1S0haaGJIVmxMQ0JpYVc1a2FXNW5jeWtnZTF4dUlDQjJZWElnWW5NZ1BTQmJYVHRjYmlBZ2RtRnlJR0Z1Y3lBOUlIUm9hWE11WDIxaGRHTm9LSFpoYkhWbExDQmljeWs3WEc0Z0lHbG1JQ2hoYm5NcElIdGNiaUFnSUNCbGJuTjFjbVVvWW5NdWJHVnVaM1JvSUQwOVBTQjBhR2x6TG1GeWFYUjVMRnh1SUNBZ0lDQWdJQ0FnSUNBblNXNWpiMjV6YVhOMFpXNTBJSEJoZEhSbGNtNGdZWEpwZEhrNklHVjRjR1ZqZEdWa0lDY2dLeUIwYUdsekxtRnlhWFI1SUNzZ0p5d2dZV04wZFdGc0lDY2dLeUJpY3k1c1pXNW5kR2dwTzF4dUlDQWdJR0pwYm1ScGJtZHpMbkIxYzJndVlYQndiSGtvWW1sdVpHbHVaM01zSUdKektUdGNiaUFnZlZ4dUlDQnlaWFIxY200Z1lXNXpPMXh1ZlR0Y2JseHVMeThnVkhsd1pYTWdiMllnY0dGMGRHVnlibHh1THk4Z0xTMHRMUzB0TFMwdExTMHRMUzB0TFZ4dVhHNU5ZWFJqYUdWeUxtbHpJRDBnVUdGMGRHVnliaTVsZUhSbGJtUW9lMXh1SUNCcGJtbDBPaUJtZFc1amRHbHZiaWhsZUhCbFkzUmxaRlpoYkhWbEtTQjdYRzRnSUNBZ2RHaHBjeTVsZUhCbFkzUmxaRlpoYkhWbElEMGdaWGh3WldOMFpXUldZV3gxWlR0Y2JpQWdmU3hjYmlBZ1lYSnBkSGs2SURBc1hHNGdJRzFoZEdOb09pQm1kVzVqZEdsdmJpaDJZV3gxWlN3Z1ltbHVaR2x1WjNNcElIdGNiaUFnSUNCeVpYUjFjbTRnWDJWeGRXRnNhWFI1VFdGMFkyZ29kbUZzZFdVc0lIUm9hWE11Wlhod1pXTjBaV1JXWVd4MVpTd2dZbWx1WkdsdVozTXBPMXh1SUNCOVhHNTlLVHRjYmx4dVRXRjBZMmhsY2k1cGRHVnlZV0pzWlNBOUlGQmhkSFJsY200dVpYaDBaVzVrS0h0Y2JpQWdhVzVwZERvZ1puVnVZM1JwYjI0b0x5b2djR0YwZEdWeWJpd2dMaTR1SUNvdktTQjdYRzRnSUNBZ2RHaHBjeTV3WVhSMFpYSnVjeUE5SUVGeWNtRjVVSEp2ZEc4dWMyeHBZMlV1WTJGc2JDaGhjbWQxYldWdWRITXBPMXh1SUNBZ0lIUm9hWE11WVhKcGRIa2dQU0IwYUdsekxuQmhkSFJsY201elhHNGdJQ0FnSUNBdWJXRndLR1oxYm1OMGFXOXVLSEJoZEhSbGNtNHBJSHNnY21WMGRYSnVJR2RsZEVGeWFYUjVLSEJoZEhSbGNtNHBPeUI5S1Z4dUlDQWdJQ0FnTG5KbFpIVmpaU2htZFc1amRHbHZiaWhoTVN3Z1lUSXBJSHNnY21WMGRYSnVJR0V4SUNzZ1lUSTdJSDBzSURBcE8xeHVJQ0I5TEZ4dUlDQnRZWFJqYURvZ1puVnVZM1JwYjI0b2RtRnNkV1VzSUdKcGJtUnBibWR6S1NCN1hHNGdJQ0FnY21WMGRYSnVJR2x6U1hSbGNtRmliR1VvZG1Gc2RXVXBJRDljYmlBZ0lDQWdJRjloY25KaGVVMWhkR05vS0hSdlFYSnlZWGtvZG1Gc2RXVXBMQ0IwYUdsekxuQmhkSFJsY201ekxDQmlhVzVrYVc1bmN5a2dPbHh1SUNBZ0lDQWdabUZzYzJVN1hHNGdJSDFjYm4wcE8xeHVYRzVOWVhSamFHVnlMbTFoYm5rZ1BTQlFZWFIwWlhKdUxtVjRkR1Z1WkNoN1hHNGdJR2x1YVhRNklHWjFibU4wYVc5dUtIQmhkSFJsY200cElIdGNiaUFnSUNCMGFHbHpMbkJoZEhSbGNtNGdQU0J3WVhSMFpYSnVPMXh1SUNCOUxGeHVJQ0JoY21sMGVUb2dNU3hjYmlBZ2JXRjBZMmc2SUdaMWJtTjBhVzl1S0haaGJIVmxMQ0JpYVc1a2FXNW5jeWtnZTF4dUlDQWdJSFJvY205M0lHNWxkeUJGY25KdmNpaGNJaWR0WVc1NUp5QndZWFIwWlhKdUlIVnpaV1FnYjNWMGMybGtaU0JoY25KaGVTQndZWFIwWlhKdVhDSXBPMXh1SUNCOVhHNTlLVHRjYmx4dVRXRjBZMmhsY2k1dmNIUWdQU0JRWVhSMFpYSnVMbVY0ZEdWdVpDaDdYRzRnSUdsdWFYUTZJR1oxYm1OMGFXOXVLSEJoZEhSbGNtNHBJSHRjYmlBZ0lDQjBhR2x6TG5CaGRIUmxjbTRnUFNCd1lYUjBaWEp1TzF4dUlDQjlMRnh1SUNCaGNtbDBlVG9nTVN4Y2JpQWdiV0YwWTJnNklHWjFibU4wYVc5dUtIWmhiSFZsTENCaWFXNWthVzVuY3lrZ2UxeHVJQ0FnSUhSb2NtOTNJRzVsZHlCRmNuSnZjaWhjSWlkdmNIUW5JSEJoZEhSbGNtNGdkWE5sWkNCdmRYUnphV1JsSUdGeWNtRjVJSEJoZEhSbGNtNWNJaWs3WEc0Z0lIMWNibjBwTzF4dVhHNU5ZWFJqYUdWeUxuUnlZVzV6SUQwZ1VHRjBkR1Z5Ymk1bGVIUmxibVFvZTF4dUlDQnBibWwwT2lCbWRXNWpkR2x2Ymlod1lYUjBaWEp1TENCbWRXNWpLU0I3WEc0Z0lDQWdkR2hwY3k1d1lYUjBaWEp1SUQwZ2NHRjBkR1Z5Ymp0Y2JpQWdJQ0IwYUdsekxtWjFibU1nUFNCbWRXNWpPMXh1SUNBZ0lHVnVjM1Z5WlNoY2JpQWdJQ0FnSUhSNWNHVnZaaUJtZFc1aklEMDlQU0FuWm5WdVkzUnBiMjRuSUNZbUlHWjFibU11YkdWdVozUm9JRDA5UFNCblpYUkJjbWwwZVNod1lYUjBaWEp1S1N4Y2JpQWdJQ0FnSUNkbWRXNWpJRzExYzNRZ1ltVWdZU0FuSUNzZ1oyVjBRWEpwZEhrb2NHRjBkR1Z5YmlrZ0t5QW5MV0Z5WjNWdFpXNTBJR1oxYm1OMGFXOXVKMXh1SUNBZ0lDazdYRzRnSUgwc1hHNGdJR0Z5YVhSNU9pQXhMRnh1SUNCdFlYUmphRG9nWm5WdVkzUnBiMjRvZG1Gc2RXVXNJR0pwYm1ScGJtZHpLU0I3WEc0Z0lDQWdkbUZ5SUdKeklEMGdXMTA3WEc0Z0lDQWdhV1lnS0hCbGNtWnZjbTFOWVhSamFDaDJZV3gxWlN3Z2RHaHBjeTV3WVhSMFpYSnVMQ0JpY3lrcElIdGNiaUFnSUNBZ0lIWmhjaUJoYm5NZ1BTQjBhR2x6TG1aMWJtTXVZWEJ3Ykhrb2RHaHBjeTUwYUdselQySnFMQ0JpY3lrN1hHNGdJQ0FnSUNCaWFXNWthVzVuY3k1d2RYTm9LR0Z1Y3lrN1hHNGdJQ0FnSUNCeVpYUjFjbTRnZEhKMVpUdGNiaUFnSUNCOVhHNGdJQ0FnY21WMGRYSnVJR1poYkhObE8xeHVJQ0I5WEc1OUtUdGNibHh1VFdGMFkyaGxjaTUzYUdWdUlEMGdVR0YwZEdWeWJpNWxlSFJsYm1Rb2UxeHVJQ0JwYm1sME9pQm1kVzVqZEdsdmJpaHdZWFIwWlhKdUxDQndjbVZrYVdOaGRHVXBJSHRjYmlBZ0lDQjBhR2x6TG5CaGRIUmxjbTRnUFNCd1lYUjBaWEp1TzF4dUlDQWdJSFJvYVhNdWNISmxaR2xqWVhSbElEMGdjSEpsWkdsallYUmxPMXh1SUNBZ0lIUm9hWE11WVhKcGRIa2dQU0JuWlhSQmNtbDBlU2h3WVhSMFpYSnVLVHRjYmlBZ0lDQmxibk4xY21Vb1hHNGdJQ0FnSUNCMGVYQmxiMllnY0hKbFpHbGpZWFJsSUQwOVBTQW5ablZ1WTNScGIyNG5JQ1ltSUhCeVpXUnBZMkYwWlM1c1pXNW5kR2dnUFQwOUlIUm9hWE11WVhKcGRIa3NYRzRnSUNBZ0lDQW5jSEpsWkdsallYUmxJRzExYzNRZ1ltVWdZU0FuSUNzZ2RHaHBjeTVoY21sMGVTQXJJQ2N0WVhKbmRXMWxiblFnWm5WdVkzUnBiMjRuWEc0Z0lDQWdLVHRjYmlBZ2ZTeGNiaUFnYldGMFkyZzZJR1oxYm1OMGFXOXVLSFpoYkhWbExDQmlhVzVrYVc1bmN5a2dlMXh1SUNBZ0lIWmhjaUJpY3lBOUlGdGRPMXh1SUNBZ0lHbG1JQ2h3WlhKbWIzSnRUV0YwWTJnb2RtRnNkV1VzSUhSb2FYTXVjR0YwZEdWeWJpd2dZbk1wSUNZbVhHNGdJQ0FnSUNBZ0lIUm9hWE11Y0hKbFpHbGpZWFJsTG1Gd2NHeDVLSFJvYVhNdWRHaHBjMDlpYWl3Z1luTXBLU0I3WEc0Z0lDQWdJQ0JpYVc1a2FXNW5jeTV3ZFhOb0xtRndjR3g1S0dKcGJtUnBibWR6TENCaWN5azdYRzRnSUNBZ0lDQnlaWFIxY200Z2RISjFaVHRjYmlBZ0lDQjlYRzRnSUNBZ2NtVjBkWEp1SUdaaGJITmxPMXh1SUNCOVhHNTlLVHRjYmx4dVRXRjBZMmhsY2k1dmNpQTlJRkJoZEhSbGNtNHVaWGgwWlc1a0tIdGNiaUFnYVc1cGREb2dablZ1WTNScGIyNG9MeW9nY0RFc0lIQXlMQ0F1TGk0Z0tpOHBJSHRjYmlBZ0lDQmxibk4xY21Vb1lYSm5kVzFsYm5SekxteGxibWQwYUNBK1BTQXhMQ0JjSWlkdmNpY2djbVZ4ZFdseVpYTWdZWFFnYkdWaGMzUWdiMjVsSUhCaGRIUmxjbTVjSWlrN1hHNGdJQ0FnZEdocGN5NXdZWFIwWlhKdWN5QTlJRUZ5Y21GNVVISnZkRzh1YzJ4cFkyVXVZMkZzYkNoaGNtZDFiV1Z1ZEhNcE8xeHVJQ0FnSUhSb2FYTXVZWEpwZEhrZ1BTQmxibk4xY21WVmJtbG1iM0p0UVhKcGRIa29kR2hwY3k1d1lYUjBaWEp1Y3l3Z0oyOXlKeWs3WEc0Z0lIMHNYRzRnSUcxaGRHTm9PaUJtZFc1amRHbHZiaWgyWVd4MVpTd2dZbWx1WkdsdVozTXBJSHRjYmlBZ0lDQjJZWElnY0dGMGRHVnlibk1nUFNCMGFHbHpMbkJoZEhSbGNtNXpPMXh1SUNBZ0lIWmhjaUJoYm5NZ1BTQm1ZV3h6WlR0Y2JpQWdJQ0JtYjNJZ0tIWmhjaUJwWkhnZ1BTQXdPeUJwWkhnZ1BDQndZWFIwWlhKdWN5NXNaVzVuZEdnZ0ppWWdJV0Z1Y3pzZ2FXUjRLeXNwSUh0Y2JpQWdJQ0FnSUdGdWN5QTlJSEJsY21admNtMU5ZWFJqYUNoMllXeDFaU3dnY0dGMGRHVnlibk5iYVdSNFhTd2dZbWx1WkdsdVozTXBPMXh1SUNBZ0lIMWNiaUFnSUNCeVpYUjFjbTRnWVc1ek8xeHVJQ0I5TEZ4dWZTazdYRzVjYmsxaGRHTm9aWEl1WVc1a0lEMGdVR0YwZEdWeWJpNWxlSFJsYm1Rb2UxeHVJQ0JwYm1sME9pQm1kVzVqZEdsdmJpZ3ZLaUJ3TVN3Z2NESXNJQzR1TGlBcUx5a2dlMXh1SUNBZ0lHVnVjM1Z5WlNoaGNtZDFiV1Z1ZEhNdWJHVnVaM1JvSUQ0OUlERXNJRndpSjJGdVpDY2djbVZ4ZFdseVpYTWdZWFFnYkdWaGMzUWdiMjVsSUhCaGRIUmxjbTVjSWlrN1hHNGdJQ0FnZEdocGN5NXdZWFIwWlhKdWN5QTlJRUZ5Y21GNVVISnZkRzh1YzJ4cFkyVXVZMkZzYkNoaGNtZDFiV1Z1ZEhNcE8xeHVJQ0FnSUhSb2FYTXVZWEpwZEhrZ1BTQjBhR2x6TG5CaGRIUmxjbTV6TG5KbFpIVmpaU2htZFc1amRHbHZiaWh6ZFcwc0lIQXBJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQnpkVzBnS3lCblpYUkJjbWwwZVNod0tUc2dmU3hjYmlBZ0lDQXdLVHRjYmlBZ2ZTeGNiaUFnYldGMFkyZzZJR1oxYm1OMGFXOXVLSFpoYkhWbExDQmlhVzVrYVc1bmN5a2dlMXh1SUNBZ0lIWmhjaUJ3WVhSMFpYSnVjeUE5SUhSb2FYTXVjR0YwZEdWeWJuTTdYRzRnSUNBZ2RtRnlJR0Z1Y3lBOUlIUnlkV1U3WEc0Z0lDQWdabTl5SUNoMllYSWdhV1I0SUQwZ01Ec2dhV1I0SUR3Z2NHRjBkR1Z5Ym5NdWJHVnVaM1JvSUNZbUlHRnVjenNnYVdSNEt5c3BJSHRjYmlBZ0lDQWdJR0Z1Y3lBOUlIQmxjbVp2Y20xTllYUmphQ2gyWVd4MVpTd2djR0YwZEdWeWJuTmJhV1I0WFN3Z1ltbHVaR2x1WjNNcE8xeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdZVzV6TzF4dUlDQjlYRzU5S1R0Y2JseHVMeThnU0dWc2NHVnljMXh1THk4Z0xTMHRMUzB0TFZ4dVhHNW1kVzVqZEdsdmJpQmZZWEp5WVhsTllYUmphQ2gyWVd4MVpTd2djR0YwZEdWeWJpd2dZbWx1WkdsdVozTXBJSHRjYmlBZ2FXWWdLQ0ZCY25KaGVTNXBjMEZ5Y21GNUtIWmhiSFZsS1NrZ2UxeHVJQ0FnSUhKbGRIVnliaUJtWVd4elpUdGNiaUFnZlZ4dUlDQjJZWElnZGtsa2VDQTlJREE3WEc0Z0lIWmhjaUJ3U1dSNElEMGdNRHRjYmlBZ2QyaHBiR1VnS0hCSlpIZ2dQQ0J3WVhSMFpYSnVMbXhsYm1kMGFDa2dlMXh1SUNBZ0lIWmhjaUJ3SUQwZ2NHRjBkR1Z5Ymx0d1NXUjRLeXRkTzF4dUlDQWdJR2xtSUNod0lHbHVjM1JoYm1ObGIyWWdUV0YwWTJobGNpNXRZVzU1S1NCN1hHNGdJQ0FnSUNCd0lEMGdjQzV3WVhSMFpYSnVPMXh1SUNBZ0lDQWdkbUZ5SUhaeklEMGdXMTA3WEc0Z0lDQWdJQ0IzYUdsc1pTQW9ka2xrZUNBOElIWmhiSFZsTG14bGJtZDBhQ0FtSmlCd1pYSm1iM0p0VFdGMFkyZ29kbUZzZFdWYmRrbGtlRjBzSUhBc0lIWnpLU2tnZTF4dUlDQWdJQ0FnSUNCMlNXUjRLeXM3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdJQ0JpYVc1a2FXNW5jeTV3ZFhOb0tIWnpLVHRjYmlBZ0lDQjlJR1ZzYzJVZ2FXWWdLSEFnYVc1emRHRnVZMlZ2WmlCTllYUmphR1Z5TG05d2RDa2dlMXh1SUNBZ0lDQWdkbUZ5SUdGdWN5QTlJSFpKWkhnZ1BDQjJZV3gxWlM1c1pXNW5kR2dnUHlCd1pYSm1iM0p0VFdGMFkyZ29kbUZzZFdWYmRrbGtlRjBzSUhBdWNHRjBkR1Z5Yml3Z1cxMHBJRG9nWm1Gc2MyVTdYRzRnSUNBZ0lDQnBaaUFvWVc1ektTQjdYRzRnSUNBZ0lDQWdJR0pwYm1ScGJtZHpMbkIxYzJnb1lXNXpLVHRjYmlBZ0lDQWdJQ0FnZGtsa2VDc3JPMXh1SUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdZbWx1WkdsdVozTXVjSFZ6YUNoMWJtUmxabWx1WldRcE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgwZ1pXeHpaU0JwWmlBb2NHVnlabTl5YlUxaGRHTm9LSFpoYkhWbFczWkpaSGhkTENCd0xDQmlhVzVrYVc1bmN5a3BJSHRjYmlBZ0lDQWdJSFpKWkhnckt6dGNiaUFnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnY21WMGRYSnVJR1poYkhObE8xeHVJQ0FnSUgxY2JpQWdmVnh1SUNCeVpYUjFjbTRnZGtsa2VDQTlQVDBnZG1Gc2RXVXViR1Z1WjNSb0lDWW1JSEJKWkhnZ1BUMDlJSEJoZEhSbGNtNHViR1Z1WjNSb08xeHVmVnh1WEc1bWRXNWpkR2x2YmlCZmIySnFUV0YwWTJnb2RtRnNkV1VzSUhCaGRIUmxjbTRzSUdKcGJtUnBibWR6S1NCN1hHNGdJR1p2Y2lBb2RtRnlJR3NnYVc0Z2NHRjBkR1Z5YmlrZ2UxeHVJQ0FnSUdsbUlDaHdZWFIwWlhKdUxtaGhjMDkzYmxCeWIzQmxjblI1S0dzcElDWW1YRzRnSUNBZ0lDQWdJQ0VvYXlCcGJpQjJZV3gxWlNrZ2ZIeGNiaUFnSUNBZ0lDQWdJWEJsY21admNtMU5ZWFJqYUNoMllXeDFaVnRyWFN3Z2NHRjBkR1Z5Ymx0clhTd2dZbWx1WkdsdVozTXBLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdabUZzYzJVN1hHNGdJQ0FnZlZ4dUlDQjlYRzRnSUhKbGRIVnliaUIwY25WbE8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCZlpuVnVZM1JwYjI1TllYUmphQ2gyWVd4MVpTd2dablZ1WXl3Z1ltbHVaR2x1WjNNcElIdGNiaUFnYVdZZ0tHWjFibU1vZG1Gc2RXVXBLU0I3WEc0Z0lDQWdZbWx1WkdsdVozTXVjSFZ6YUNoMllXeDFaU2s3WEc0Z0lDQWdjbVYwZFhKdUlIUnlkV1U3WEc0Z0lIMWNiaUFnY21WMGRYSnVJR1poYkhObE8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCZlpYRjFZV3hwZEhsTllYUmphQ2gyWVd4MVpTd2djR0YwZEdWeWJpd2dZbWx1WkdsdVozTXBJSHRjYmlBZ2NtVjBkWEp1SUhaaGJIVmxJRDA5UFNCd1lYUjBaWEp1TzF4dWZWeHVYRzVtZFc1amRHbHZiaUJmY21WblJYaHdUV0YwWTJnb2RtRnNkV1VzSUhCaGRIUmxjbTRzSUdKcGJtUnBibWR6S1NCN1hHNGdJSFpoY2lCaGJuTWdQU0J3WVhSMFpYSnVMbVY0WldNb2RtRnNkV1VwTzF4dUlDQnBaaUFvWVc1eklDRTlQU0J1ZFd4c0lDWW1JR0Z1YzFzd1hTQTlQVDBnZG1Gc2RXVXBJSHRjYmlBZ0lDQmlhVzVrYVc1bmN5NXdkWE5vS0dGdWN5azdYRzRnSUNBZ2NtVjBkWEp1SUhSeWRXVTdYRzRnSUgxY2JpQWdjbVYwZFhKdUlHWmhiSE5sTzF4dWZWeHVYRzVtZFc1amRHbHZiaUJ3WlhKbWIzSnRUV0YwWTJnb2RtRnNkV1VzSUhCaGRIUmxjbTRzSUdKcGJtUnBibWR6S1NCN1hHNGdJR2xtSUNod1lYUjBaWEp1SUdsdWMzUmhibU5sYjJZZ1VHRjBkR1Z5YmlrZ2UxeHVJQ0FnSUhKbGRIVnliaUJ3WVhSMFpYSnVMbTFoZEdOb0tIWmhiSFZsTENCaWFXNWthVzVuY3lrN1hHNGdJSDBnWld4elpTQnBaaUFvUVhKeVlYa3VhWE5CY25KaGVTaHdZWFIwWlhKdUtTa2dlMXh1SUNBZ0lISmxkSFZ5YmlCZllYSnlZWGxOWVhSamFDaDJZV3gxWlN3Z2NHRjBkR1Z5Yml3Z1ltbHVaR2x1WjNNcE8xeHVJQ0I5SUdWc2MyVWdhV1lnS0hCaGRIUmxjbTRnYVc1emRHRnVZMlZ2WmlCU1pXZEZlSEFwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdYM0psWjBWNGNFMWhkR05vS0haaGJIVmxMQ0J3WVhSMFpYSnVMQ0JpYVc1a2FXNW5jeWs3WEc0Z0lIMGdaV3h6WlNCcFppQW9kSGx3Wlc5bUlIQmhkSFJsY200Z1BUMDlJQ2R2WW1wbFkzUW5JQ1ltSUhCaGRIUmxjbTRnSVQwOUlHNTFiR3dwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdYMjlpYWsxaGRHTm9LSFpoYkhWbExDQndZWFIwWlhKdUxDQmlhVzVrYVc1bmN5azdYRzRnSUgwZ1pXeHpaU0JwWmlBb2RIbHdaVzltSUhCaGRIUmxjbTRnUFQwOUlDZG1kVzVqZEdsdmJpY3BJSHRjYmlBZ0lDQnlaWFIxY200Z1gyWjFibU4wYVc5dVRXRjBZMmdvZG1Gc2RXVXNJSEJoZEhSbGNtNHNJR0pwYm1ScGJtZHpLVHRjYmlBZ2ZWeHVJQ0J5WlhSMWNtNGdYMlZ4ZFdGc2FYUjVUV0YwWTJnb2RtRnNkV1VzSUhCaGRIUmxjbTRzSUdKcGJtUnBibWR6S1R0Y2JuMWNibHh1Wm5WdVkzUnBiMjRnWjJWMFFYSnBkSGtvY0dGMGRHVnliaWtnZTF4dUlDQnBaaUFvY0dGMGRHVnliaUJwYm5OMFlXNWpaVzltSUZCaGRIUmxjbTRwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdjR0YwZEdWeWJpNWhjbWwwZVR0Y2JpQWdmU0JsYkhObElHbG1JQ2hCY25KaGVTNXBjMEZ5Y21GNUtIQmhkSFJsY200cEtTQjdYRzRnSUNBZ2NtVjBkWEp1SUhCaGRIUmxjbTVjYmlBZ0lDQWdJQzV0WVhBb1puVnVZM1JwYjI0b2NDa2dleUJ5WlhSMWNtNGdaMlYwUVhKcGRIa29jQ2s3SUgwcFhHNGdJQ0FnSUNBdWNtVmtkV05sS0daMWJtTjBhVzl1S0dFeExDQmhNaWtnZXlCeVpYUjFjbTRnWVRFZ0t5QmhNanNnZlN3Z01DazdYRzRnSUgwZ1pXeHpaU0JwWmlBb2NHRjBkR1Z5YmlCcGJuTjBZVzVqWlc5bUlGSmxaMFY0Y0NrZ2UxeHVJQ0FnSUhKbGRIVnliaUF4TzF4dUlDQjlJR1ZzYzJVZ2FXWWdLSFI1Y0dWdlppQndZWFIwWlhKdUlEMDlQU0FuYjJKcVpXTjBKeUFtSmlCd1lYUjBaWEp1SUNFOVBTQnVkV3hzS1NCN1hHNGdJQ0FnZG1GeUlHRnVjeUE5SURBN1hHNGdJQ0FnWm05eUlDaDJZWElnYXlCcGJpQndZWFIwWlhKdUtTQjdYRzRnSUNBZ0lDQnBaaUFvY0dGMGRHVnliaTVvWVhOUGQyNVFjbTl3WlhKMGVTaHJLU2tnZTF4dUlDQWdJQ0FnSUNCaGJuTWdLejBnWjJWMFFYSnBkSGtvY0dGMGRHVnlibHRyWFNrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQmhibk03WEc0Z0lIMGdaV3h6WlNCcFppQW9kSGx3Wlc5bUlIQmhkSFJsY200Z1BUMDlJQ2RtZFc1amRHbHZiaWNwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdNVHRjYmlBZ2ZWeHVJQ0J5WlhSMWNtNGdNRHRjYm4xY2JseHVablZ1WTNScGIyNGdaVzV6ZFhKbFZXNXBabTl5YlVGeWFYUjVLSEJoZEhSbGNtNXpMQ0J2Y0NrZ2UxeHVJQ0IyWVhJZ2NtVnpkV3gwSUQwZ1oyVjBRWEpwZEhrb2NHRjBkR1Z5Ym5OYk1GMHBPMXh1SUNCbWIzSWdLSFpoY2lCcFpIZ2dQU0F4T3lCcFpIZ2dQQ0J3WVhSMFpYSnVjeTVzWlc1bmRHZzdJR2xrZUNzcktTQjdYRzRnSUNBZ2RtRnlJR0VnUFNCblpYUkJjbWwwZVNod1lYUjBaWEp1YzF0cFpIaGRLVHRjYmlBZ0lDQnBaaUFvWVNBaFBUMGdjbVZ6ZFd4MEtTQjdYRzRnSUNBZ0lDQjBhSEp2ZHlCdVpYY2dSWEp5YjNJb2IzQWdLeUFuT2lCbGVIQmxZM1JsWkNCaGNtbDBlU0FuSUNzZ2NtVnpkV3gwSUNzZ0p5QmhkQ0JwYm1SbGVDQW5JQ3NnYVdSNElDc2dKeXdnWjI5MElDY2dLeUJoS1R0Y2JpQWdJQ0I5WEc0Z0lIMWNiaUFnY21WMGRYSnVJSEpsYzNWc2REdGNibjFjYmx4dVpuVnVZM1JwYjI0Z1pXNXpkWEpsS0dOdmJtUXNJRzFsYzNOaFoyVXBJSHRjYmlBZ2FXWWdLQ0ZqYjI1a0tTQjdYRzRnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0cxbGMzTmhaMlVwTzF4dUlDQjlYRzU5WEc1Y2JpOHZJRTFoZEdOb1pYSmNiaTh2SUMwdExTMHRMUzFjYmx4dVpuVnVZM1JwYjI0Z1RXRjBZMmhsY2lncElIdGNiaUFnZEdocGN5NXdZWFIwWlhKdWN5QTlJRnRkTzF4dUlDQjBhR2x6TG5Sb2FYTlBZbW9nUFNCMWJtUmxabWx1WldRN1hHNTlYRzVjYmsxaGRHTm9aWEl1Y0hKdmRHOTBlWEJsTG5kcGRHaFVhR2x6SUQwZ1puVnVZM1JwYjI0b2IySnFLU0I3WEc0Z0lIUm9hWE11ZEdocGMwOWlhaUE5SUc5aWFqdGNiaUFnY21WMGRYSnVJSFJvYVhNN1hHNTlPMXh1WEc1TllYUmphR1Z5TG5CeWIzUnZkSGx3WlM1aFpHUkRZWE5sSUQwZ1puVnVZM1JwYjI0b2NHRjBkR1Z5Yml3Z2IzQjBSblZ1WXlrZ2UxeHVJQ0IwYUdsekxuQmhkSFJsY201ekxuQjFjMmdvVFdGMFkyaGxjaTUwY21GdWN5aHdZWFIwWlhKdUxDQnZjSFJHZFc1aktTazdYRzRnSUhKbGRIVnliaUIwYUdsek8xeHVmVHRjYmx4dVRXRjBZMmhsY2k1d2NtOTBiM1I1Y0dVdWJXRjBZMmdnUFNCbWRXNWpkR2x2YmloMllXeDFaU2tnZTF4dUlDQmxibk4xY21Vb2RHaHBjeTV3WVhSMFpYSnVjeTVzWlc1bmRHZ2dQaUF3TENBblRXRjBZMmhsY2lCeVpYRjFhWEpsY3lCaGRDQnNaV0Z6ZENCdmJtVWdZMkZ6WlNjcE8xeHVYRzRnSUhaaGNpQmlhVzVrYVc1bmN5QTlJRnRkTzF4dUlDQnBaaUFvVFdGMFkyaGxjaTV2Y2k1bWNtOXRRWEp5WVhrb2RHaHBjeTV3WVhSMFpYSnVjeWt1YldGMFkyZ29kbUZzZFdVc0lHSnBibVJwYm1kektTa2dlMXh1SUNBZ0lISmxkSFZ5YmlCaWFXNWthVzVuYzFzd1hUdGNiaUFnZlZ4dUlDQjBhSEp2ZHlCdVpYY2dUV0YwWTJoR1lXbHNkWEpsS0haaGJIVmxMQ0J1WlhjZ1JYSnliM0lvS1M1emRHRmpheWs3WEc1OU8xeHVYRzVOWVhSamFHVnlMbkJ5YjNSdmRIbHdaUzUwYjBaMWJtTjBhVzl1SUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUhaaGNpQnpaV3htSUQwZ2RHaHBjenRjYmlBZ2NtVjBkWEp1SUdaMWJtTjBhVzl1S0haaGJIVmxLU0I3SUhKbGRIVnliaUJ6Wld4bUxtMWhkR05vS0haaGJIVmxLVHNnZlR0Y2JuMDdYRzVjYmk4dklGQnlhVzFwZEdsMlpTQndZWFIwWlhKdWMxeHVYRzVOWVhSamFHVnlMbDhnSUNBZ0lDQTlJR1oxYm1OMGFXOXVLSGdwSUhzZ2NtVjBkWEp1SUhSeWRXVTdJSDA3WEc1TllYUmphR1Z5TG1KdmIyd2dJQ0E5SUdaMWJtTjBhVzl1S0hncElIc2djbVYwZFhKdUlIUjVjR1Z2WmlCNElEMDlQU0FuWW05dmJHVmhiaWM3SUgwN1hHNU5ZWFJqYUdWeUxtNTFiV0psY2lBOUlHWjFibU4wYVc5dUtIZ3BJSHNnY21WMGRYSnVJSFI1Y0dWdlppQjRJRDA5UFNBbmJuVnRZbVZ5SnpzZ2ZUdGNiazFoZEdOb1pYSXVjM1J5YVc1bklEMGdablZ1WTNScGIyNG9lQ2tnZXlCeVpYUjFjbTRnZEhsd1pXOW1JSGdnUFQwOUlDZHpkSEpwYm1jbk95QjlPMXh1VFdGMFkyaGxjaTVqYUdGeUlDQWdQU0JtZFc1amRHbHZiaWg0S1NCN0lISmxkSFZ5YmlCMGVYQmxiMllnZUNBOVBUMGdKM04wY21sdVp5Y2dKaVlnZUM1c1pXNW5kR2dnUFQwOUlEQTdJSDA3WEc1Y2JpOHZJRTl3WlhKaGRHOXljMXh1WEc1TllYUmphR1Z5TG1sdWMzUmhibU5sVDJZZ1BTQm1kVzVqZEdsdmJpaGpiR0Y2ZWlrZ2V5QnlaWFIxY200Z1puVnVZM1JwYjI0b2VDa2dleUJ5WlhSMWNtNGdlQ0JwYm5OMFlXNWpaVzltSUdOc1lYcDZPeUI5T3lCOU8xeHVYRzVOWVhSamFHVnlMazFoZEdOb1JtRnBiSFZ5WlNBOUlFMWhkR05vUm1GcGJIVnlaVHRjYmx4dUx5OGdWR1Z5YzJVZ2FXNTBaWEptWVdObFhHNHZMeUF0TFMwdExTMHRMUzB0TFMwdExTMWNibHh1Wm5WdVkzUnBiMjRnYldGMFkyZ29kbUZzZFdVZ0x5b2dMQ0J3WVhReExDQm1kVzR4TENCd1lYUXlMQ0JtZFc0eUxDQXVMaTRnS2k4cElIdGNiaUFnZG1GeUlHRnlaM01nUFNCaGNtZDFiV1Z1ZEhNN1hHNWNiaUFnTHk4Z1YyaGxiaUJqWVd4c1pXUWdkMmwwYUNCcWRYTjBJR0VnZG1Gc2RXVWdZVzVrSUdFZ2NHRjBkR1Z5Yml3Z2NtVjBkWEp1SUhSb1pTQmlhVzVrYVc1bmN5QnBabHh1SUNBdkx5QjBhR1VnYldGMFkyZ2dkMkZ6SUhOMVkyTmxjM05tZFd3c0lHOTBhR1Z5ZDJselpTQnVkV3hzTGx4dUlDQnBaaUFvWVhKbmN5NXNaVzVuZEdnZ1BUMDlJRElwSUh0Y2JpQWdJQ0IyWVhJZ1ltbHVaR2x1WjNNZ1BTQmJYVHRjYmlBZ0lDQnBaaUFvY0dWeVptOXliVTFoZEdOb0tIWmhiSFZsTENCaGNtZDFiV1Z1ZEhOYk1WMHNJR0pwYm1ScGJtZHpLU2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJR0pwYm1ScGJtZHpPMXh1SUNBZ0lIMWNiaUFnSUNCeVpYUjFjbTRnYm5Wc2JEdGNiaUFnZlZ4dVhHNGdJR1Z1YzNWeVpTaGNiaUFnSUNBZ0lHRnlaM011YkdWdVozUm9JRDRnTWlBbUppQmhjbWR6TG14bGJtZDBhQ0FsSURJZ1BUMDlJREVzWEc0Z0lDQWdJQ0FuYldGMFkyZ2dZMkZzYkdWa0lIZHBkR2dnYVc1MllXeHBaQ0JoY21kMWJXVnVkSE1uS1R0Y2JpQWdkbUZ5SUcwZ1BTQnVaWGNnVFdGMFkyaGxjaWdwTzF4dUlDQm1iM0lnS0haaGNpQnBaSGdnUFNBeE95QnBaSGdnUENCaGNtZHpMbXhsYm1kMGFEc2dhV1I0SUNzOUlESXBJSHRjYmlBZ0lDQjJZWElnY0dGMGRHVnliaUE5SUdGeVozTmJhV1I0WFR0Y2JpQWdJQ0IyWVhJZ1puVnVZeUE5SUdGeVozTmJhV1I0SUNzZ01WMDdYRzRnSUNBZ2JTNWhaR1JEWVhObEtIQmhkSFJsY200c0lHWjFibU1wTzF4dUlDQjlYRzRnSUhKbGRIVnliaUJ0TG0xaGRHTm9LSFpoYkhWbEtUdGNibjFjYmx4dUx5OGdSWGh3YjNKMGMxeHVMeThnTFMwdExTMHRMVnh1WEc1dGIyUjFiR1V1Wlhod2IzSjBjeUE5SUh0Y2JpQWdUV0YwWTJobGNqb2dUV0YwWTJobGNpeGNiaUFnYldGMFkyZzZJRzFoZEdOb0xGeHVJQ0JRWVhSMFpYSnVPaUJRWVhSMFpYSnVYRzU5TzF4dUlpd2lMeW9nWjJ4dlltRnNJRk41YldKdmJDQXFMMXh1WEc1MllYSWdTVlJGVWtGVVQxSmZVMWxOUWs5TUlEMGdkSGx3Wlc5bUlGTjViV0p2YkNBOVBUMGdKMloxYm1OMGFXOXVKeUFtSmlCVGVXMWliMnd1YVhSbGNtRjBiM0k3WEc1MllYSWdSa0ZMUlY5SlZFVlNRVlJQVWw5VFdVMUNUMHdnUFNBblFFQnBkR1Z5WVhSdmNpYzdYRzVjYm5aaGNpQjBiMU4wY21sdVp5QTlJRTlpYW1WamRDNXdjbTkwYjNSNWNHVXVkRzlUZEhKcGJtYzdYRzVjYmk4dklFaGxiSEJsY25OY2JpOHZJQzB0TFMwdExTMWNibHh1Wm5WdVkzUnBiMjRnYVhOVGRISnBibWNvYjJKcUtTQjdYRzVjZEhKbGRIVnliaUIwYjFOMGNtbHVaeTVqWVd4c0tHOWlhaWtnUFQwOUlDZGJiMkpxWldOMElGTjBjbWx1WjEwbk8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCcGMwNTFiV0psY2lodlltb3BJSHRjYmx4MGNtVjBkWEp1SUhSdlUzUnlhVzVuTG1OaGJHd29iMkpxS1NBOVBUMGdKMXR2WW1wbFkzUWdUblZ0WW1WeVhTYzdYRzU5WEc1Y2JtWjFibU4wYVc5dUlHbHpRWEp5WVhsTWFXdGxLRzlpYWlrZ2UxeHVYSFJ5WlhSMWNtNGdhWE5PZFcxaVpYSW9iMkpxTG14bGJtZDBhQ2tnSmlZZ0lXbHpVM1J5YVc1bktHOWlhaWs3WEc1OVhHNWNiaTh2SUVGeWNtRjVTWFJsY21GMGIzSmNiaTh2SUMwdExTMHRMUzB0TFMwdExTMWNibHh1Wm5WdVkzUnBiMjRnUVhKeVlYbEpkR1Z5WVhSdmNpaHBkR1Z5WVhSbFpTa2dlMXh1WEhSMGFHbHpMbDlwZEdWeVlYUmxaU0E5SUdsMFpYSmhkR1ZsTzF4dVhIUjBhR2x6TGw5cElEMGdNRHRjYmx4MGRHaHBjeTVmYkdWdUlEMGdhWFJsY21GMFpXVXViR1Z1WjNSb08xeHVmVnh1WEc1QmNuSmhlVWwwWlhKaGRHOXlMbkJ5YjNSdmRIbHdaUzV1WlhoMElEMGdablZ1WTNScGIyNG9LU0I3WEc1Y2RHbG1JQ2gwYUdsekxsOXBJRHdnZEdocGN5NWZiR1Z1S1NCN1hHNWNkRngwY21WMGRYSnVJSHNnWkc5dVpUb2dabUZzYzJVc0lIWmhiSFZsT2lCMGFHbHpMbDlwZEdWeVlYUmxaVnQwYUdsekxsOXBLeXRkSUgwN1hHNWNkSDFjYmx4MGNtVjBkWEp1SUhzZ1pHOXVaVG9nZEhKMVpTQjlPMXh1ZlR0Y2JseHVRWEp5WVhsSmRHVnlZWFJ2Y2k1d2NtOTBiM1I1Y0dWYlJrRkxSVjlKVkVWU1FWUlBVbDlUV1UxQ1QweGRJRDBnWm5WdVkzUnBiMjRvS1NCN0lISmxkSFZ5YmlCMGFHbHpPeUI5TzF4dVhHNXBaaUFvU1ZSRlVrRlVUMUpmVTFsTlFrOU1LU0I3WEc1Y2RFRnljbUY1U1hSbGNtRjBiM0l1Y0hKdmRHOTBlWEJsVzBsVVJWSkJWRTlTWDFOWlRVSlBURjBnUFNCbWRXNWpkR2x2YmlncElIc2djbVYwZFhKdUlIUm9hWE03SUgwN1hHNTlYRzVjYmk4dklFVjRjRzl5ZEhOY2JpOHZJQzB0TFMwdExTMWNibHh1THk4Z1VtVjBkWEp1Y3lCaGJpQnBkR1Z5WVhSdmNpQW9ZVzRnYjJKcVpXTjBJSFJvWVhRZ2FHRnpJR0VnYm1WNGRDZ3BJRzFsZEdodlpDa2dabTl5SUdCdlltcGdMbHh1THk4Z1JtbHljM1FzSUdsMElIUnlhV1Z6SUhSdklIVnpaU0IwYUdVZ1JWTTJJR2wwWlhKaGRHOXlJSEJ5YjNSdlkyOXNJQ2hUZVcxaWIyd3VhWFJsY21GMGIzSXBMbHh1THk4Z1NYUWdabUZzYkhNZ1ltRmpheUIwYnlCMGFHVWdKMlpoYTJVbklHbDBaWEpoZEc5eUlIQnliM1J2WTI5c0lDZ25RRUJwZEdWeVlYUnZjaWNwSUhSb1lYUWdhWE5jYmk4dklIVnpaV1FnWW5rZ2MyOXRaU0JzYVdKeVlYSnBaWE1nS0dVdVp5NGdhVzF0ZFhSaFlteGxMV3B6S1M0Z1JtbHVZV3hzZVN3Z2FXWWdkR2hsSUc5aWFtVmpkQ0JvWVhOY2JpOHZJR0VnYm5WdFpYSnBZeUJnYkdWdVozUm9ZQ0J3Y205d1pYSjBlU0JoYm1RZ2FYTWdibTkwSUdFZ2MzUnlhVzVuTENCcGRDQnBjeUIwY21WaGRHVmtJR0Z6SUdGdUlFRnljbUY1WEc0dkx5QjBieUJpWlNCcGRHVnlZWFJsWkNCMWMybHVaeUJoYmlCQmNuSmhlVWwwWlhKaGRHOXlMbHh1Wm5WdVkzUnBiMjRnWjJWMFNYUmxjbUYwYjNJb2IySnFLU0I3WEc1Y2RHbG1JQ2doYjJKcUtTQjdYRzVjZEZ4MGNtVjBkWEp1TzF4dVhIUjlYRzVjZEdsbUlDaEpWRVZTUVZSUFVsOVRXVTFDVDB3Z0ppWWdkSGx3Wlc5bUlHOWlhbHRKVkVWU1FWUlBVbDlUV1UxQ1QweGRJRDA5UFNBblpuVnVZM1JwYjI0bktTQjdYRzVjZEZ4MGNtVjBkWEp1SUc5aWFsdEpWRVZTUVZSUFVsOVRXVTFDVDB4ZEtDazdYRzVjZEgxY2JseDBhV1lnS0hSNWNHVnZaaUJ2WW1wYlJrRkxSVjlKVkVWU1FWUlBVbDlUV1UxQ1QweGRJRDA5UFNBblpuVnVZM1JwYjI0bktTQjdYRzVjZEZ4MGNtVjBkWEp1SUc5aWFsdEdRVXRGWDBsVVJWSkJWRTlTWDFOWlRVSlBURjBvS1R0Y2JseDBmVnh1WEhScFppQW9hWE5CY25KaGVVeHBhMlVvYjJKcUtTa2dlMXh1WEhSY2RISmxkSFZ5YmlCdVpYY2dRWEp5WVhsSmRHVnlZWFJ2Y2lodlltb3BPMXh1WEhSOVhHNTlYRzVjYm1aMWJtTjBhVzl1SUdselNYUmxjbUZpYkdVb2IySnFLU0I3WEc1Y2RHbG1JQ2h2WW1vcElIdGNibHgwWEhSeVpYUjFjbTRnS0VsVVJWSkJWRTlTWDFOWlRVSlBUQ0FtSmlCMGVYQmxiMllnYjJKcVcwbFVSVkpCVkU5U1gxTlpUVUpQVEYwZ1BUMDlJQ2RtZFc1amRHbHZiaWNwSUh4OFhHNWNkRngwWEhSY2RGeDBJSFI1Y0dWdlppQnZZbXBiUmtGTFJWOUpWRVZTUVZSUFVsOVRXVTFDVDB4ZElEMDlQU0FuWm5WdVkzUnBiMjRuSUh4OFhHNWNkRngwWEhSY2RGeDBJR2x6UVhKeVlYbE1hV3RsS0c5aWFpazdYRzVjZEgxY2JseDBjbVYwZFhKdUlHWmhiSE5sTzF4dWZWeHVYRzVtZFc1amRHbHZiaUIwYjBGeWNtRjVLR2wwWlhKaFlteGxLU0I3WEc1Y2RIWmhjaUJwZEdWeUlEMGdaMlYwU1hSbGNtRjBiM0lvYVhSbGNtRmliR1VwTzF4dVhIUnBaaUFvYVhSbGNpa2dlMXh1WEhSY2RIWmhjaUJ5WlhOMWJIUWdQU0JiWFR0Y2JseDBYSFIyWVhJZ2JtVjRkRHRjYmx4MFhIUjNhR2xzWlNBb0lTaHVaWGgwSUQwZ2FYUmxjaTV1WlhoMEtDa3BMbVJ2Ym1VcElIdGNibHgwWEhSY2RISmxjM1ZzZEM1d2RYTm9LRzVsZUhRdWRtRnNkV1VwTzF4dVhIUmNkSDFjYmx4MFhIUnlaWFIxY200Z2NtVnpkV3gwTzF4dVhIUjlYRzU5WEc1Y2JtMXZaSFZzWlM1bGVIQnZjblJ6SUQwZ2UxeHVYSFJuWlhSSmRHVnlZWFJ2Y2pvZ1oyVjBTWFJsY21GMGIzSXNYRzVjZEdselNYUmxjbUZpYkdVNklHbHpTWFJsY21GaWJHVXNYRzVjZEhSdlFYSnlZWGs2SUhSdlFYSnlZWGxjYm4wN1hHNGlYWDA9XG5cbiIsIi8vIEJhc2VkIG9uIGh0dHBzOi8vZ2l0aHViLmNvbS9Qb2x5bWVyL1dlYWtNYXAvYmxvYi9jNDY4NWE5ZTNhNTc5YzI1M2NjZjhlNzM3OWMwNDdjM2ExZjk5MTA2L3dlYWttYXAuanNcblxuLypcbiAqIENvcHlyaWdodCAyMDEyIFRoZSBQb2x5bWVyIEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhIEJTRC1zdHlsZVxuICogbGljZW5zZSB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlLlxuICovXG5cbmlmICh0eXBlb2YgV2Vha01hcCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIHZhciBkZWZpbmVQcm9wZXJ0eSA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eTtcbiAgICB2YXIgY291bnRlciA9IERhdGUubm93KCkgJSAxZTk7XG5cbiAgICB2YXIgV2Vha01hcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5uYW1lID0gJ19fc3QnICsgKE1hdGgucmFuZG9tKCkgKiAxZTkgPj4+IDApICsgKGNvdW50ZXIrKyArICdfXycpO1xuICAgIH07XG5cbiAgICBXZWFrTWFwLnByb3RvdHlwZSA9IHtcbiAgICAgIHNldDogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgICB2YXIgZW50cnkgPSBrZXlbdGhpcy5uYW1lXTtcbiAgICAgICAgaWYgKGVudHJ5ICYmIGVudHJ5WzBdID09PSBrZXkpXG4gICAgICAgICAgZW50cnlbMV0gPSB2YWx1ZTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGRlZmluZVByb3BlcnR5KGtleSwgdGhpcy5uYW1lLCB7dmFsdWU6IFtrZXksIHZhbHVlXSwgd3JpdGFibGU6IHRydWV9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9LFxuICAgICAgZ2V0OiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGVudHJ5O1xuICAgICAgICByZXR1cm4gKGVudHJ5ID0ga2V5W3RoaXMubmFtZV0pICYmIGVudHJ5WzBdID09PSBrZXkgP1xuICAgICAgICAgICAgZW50cnlbMV0gOiB1bmRlZmluZWQ7XG4gICAgICB9LFxuICAgICAgZGVsZXRlOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGVudHJ5ID0ga2V5W3RoaXMubmFtZV07XG4gICAgICAgIGlmICghZW50cnkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgdmFyIGhhc1ZhbHVlID0gZW50cnlbMF0gPT09IGtleTtcbiAgICAgICAgZW50cnlbMF0gPSBlbnRyeVsxXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIGhhc1ZhbHVlO1xuICAgICAgfSxcbiAgICAgIGhhczogZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBlbnRyeSA9IGtleVt0aGlzLm5hbWVdO1xuICAgICAgICBpZiAoIWVudHJ5KSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiBlbnRyeVswXSA9PT0ga2V5O1xuICAgICAgfVxuICAgIH07XG5cbiAgICAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB3aW5kb3cpLldlYWtNYXAgPSBXZWFrTWFwO1xuICB9KSgpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5yZXF1aXJlKCc2dG81L3BvbHlmaWxsJyk7XG5yZXF1aXJlKCc2dG81L3JlZ2lzdGVyJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBWYXQ6IHJlcXVpcmUoJy4vbGliL3ZhdCcpLFxuICBtYXRjaDoge1xuICBcdEFOWTogcmVxdWlyZSgnLi90aGlyZF9wYXJ0eS9wYXR0ZXJuLW1hdGNoJykuTWF0Y2hlci5fXG4gIH1cbn07XG4iXX0=
