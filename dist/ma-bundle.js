!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.ma=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

/* jshint esnext: true */

module.exports = {
  // Return an Array with all the values from `gen`.
  toArray: function (gen) {
    var result = [];
    for (var _iterator = gen[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) {
      var x = _step.value;
      result.push(x);
    }

    return result;
  },
  // Return the first value from `gen` that passes a truth test.
  find: function (gen, predicate, thisArg) {
    for (var _iterator2 = gen[Symbol.iterator](), _step2; !(_step2 = _iterator2.next()).done;) {
      var x = _step2.value;
      if (predicate.call(thisArg, x)) return x;
    }
  },
  // Return the first value from `gen`.
  first: function (gen) {
    return gen.next().value;
  }
};

},{}],2:[function(require,module,exports){
"use strict";

var getMatches = regeneratorRuntime.mark(function getMatches(arr, pattern) {
  var p, i;
  return regeneratorRuntime.wrap(function getMatches$(_context) {
    while (true) switch (_context.prev = _context.next) {
      case 0: p = convertPattern(pattern);
        i = 0;
      case 2:
        if (!(i < arr.size)) {
          _context.next = 9;
          break;
        }
        if (!(match(arr.get(i).value, p) !== null)) {
          _context.next = 6;
          break;
        }
        _context.next = 6;
        return i;
      case 6: ++i;
        _context.next = 2;
        break;
      case 9:
      case "end": return _context.stop();
    }
  }, getMatches, this);
});

var getDeepMatches = regeneratorRuntime.mark(function getDeepMatches(arr, pattern) {
  var p, path, i, root, bindings, rootPath;
  return regeneratorRuntime.wrap(function getDeepMatches$(_context2) {
    while (true) switch (_context2.prev = _context2.next) {
      case 0: p = convertPattern(pattern);
        path = [];
        i = 0;
      case 3:
        if (!(i < arr.size)) {
          _context2.next = 14;
          break;
        }
        path.push(i);
        root = arr.get(i).value;
        if (!((bindings = matchDeep(root, p, path)) !== null)) {
          _context2.next = 10;
          break;
        }
        rootPath = path.slice(1);
        _context2.next = 10;
        return { index: path[0], root: root, path: rootPath, bindings: bindings };
      case 10:
        path.pop();
      case 11: ++i;
        _context2.next = 3;
        break;
      case 14:
      case "end": return _context2.stop();
    }
  }, getDeepMatches, this);
});

/* jshint esnext: true */

"use strict";

var assert = require("assert"), EventEmitter = require("events").EventEmitter, Immutable = require("immutable"), util = require("util"), walk = require("tree-walk");

var pm = require("../third_party/pattern-match"), gu = require("./generator-util");
require("../third_party/weakmap.js");

var match = pm.match, Pattern = pm.Pattern;

var Reaction = Immutable.Record({ pattern: null, callback: null }, "Reaction");
var Observer = Immutable.Record({ pattern: null, callback: null }, "Observer");

var instanceOf = pm.Matcher.instanceOf;

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
    return (value instanceof this.ctor && this.performMatch(value.toObject(), this.objPattern, bindings));
  }
});

// Custom pattern for matching Immutable.List objects.
var immutableList = Pattern.extend({
  init: function (arrPattern) {
    this.arrPattern = arrPattern;
    this.arity = this.getArity(arrPattern);
  },
  match: function (value, bindings) {
    return (Immutable.List.isList(value) && this.performMatch(value.toArray(), this.arrPattern, bindings));
  }
});

// Private helpers
// ---------------

function convertPattern(p) {
  return immutableWalker.reduce(p, function (memo, node, key, parent) {
    if (Array.isArray(node)) return immutableList(memo || []);
    if (typeof node === "function") return node;
    if (node instanceof Immutable.Record) return immutableObj(memo || {}, node.constructor);
    if (node instanceof Object) return immutableObj(memo || {});
    assert(!memo);
    return node;
  });
}

function find(arr, pattern) {
  return gu.first(getMatches(arr, pattern));
}

// Recursively tries to match `obj` with `pattern`.
function matchDeep(obj, pattern, path) {
  var result;
  if ((result = match(obj, pattern)) !== null) return result;

  var isList = obj && Immutable.List.isList(obj);
  var isMap = obj && Immutable.Map.isMap(obj);

  if (isList || isMap) {
    for (var it = obj.entries();;) {
      var entry = it.next();
      if (entry.done) break;
      path.push(entry.value[0]);
      if ((result = matchDeep(entry.value[1], pattern, path)) !== null) return result;
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

Vat.prototype._init = function () {
  this._store = Immutable.List();
  this._waiting = [];
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
  var result = this._store.get(index).value;
  this._updateStore(function () {
    return this._store.splice(index, 1);
  });
  return result;
};

Vat.prototype._tryReaction = function (r) {
  // Prevent this reaction from matching against objects it's already matched.
  // FIXME: This should really check for a match _at the same path_.
  var store = this._store;
  function accept(m) {
    var record = store.get(m.index);
    if (!record.reactions.has(r)) {
      record.reactions.set(r, true);
      return true;
    }
  }
  var match = gu.find(getDeepMatches(store, r.pattern), accept);
  if (!match) return;

  if (r instanceof Reaction) this._doWithoutHistory(function () {
    this._removeAt(match.index);
  });

  var arity = r.callback.length;
  var expectedArity = match.bindings.length + 1;
  assert(arity === expectedArity, "Bad function arity: expected " + expectedArity + ", got " + arity);

  var root = match.root;
  var value = root.getIn(match.path);
  var newValue = root.updateIn(match.path, function () {
    return r.callback.apply(null, [value].concat(match.bindings));
  });

  if (r instanceof Reaction) {
    // Put the object back in the vat, replacing the matched part with the
    // result of the reaction function.
    if (newValue === void 0) throw new TypeError("Reactions must return a value");
    if (newValue !== null) this.put(newValue);
  }
};

Vat.prototype.put = function (value) {
  // Copy the reactions before updating the store, as a reaction shouldn't be
  // able to immediately react to itself.
  var observers = this.try_copy_all(instanceOf(Observer));
  var reactions = this.try_copy_all(instanceOf(Reaction));

  // Update the store.
  var storedObj = {
    value: Immutable.fromJS(value),
    reactions: new WeakMap()
  };
  this._updateStore(function () {
    return this._store.push(storedObj);
  });

  // A really naive version of deferred take/copy. This should
  // probably be written in a more efficient way.
  var self = this;
  this._waiting = this._waiting.filter(function (info) {
    return !self._try(info.pattern, info.op, info.callback);
  });

  // TODO: A blocking take/copy is basically a one-time observer. They should
  // be implemented in the same way.
  observers.forEach(this._tryReaction, this);
  reactions.forEach(this._tryReaction, this);
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

// A reaction is a process that attempts to `take` a given pattern every
// time the tuple space changes. If the `reaction` function produces a result,
// the result is put into the tuple space.
Vat.prototype.addReaction = function (pattern, reaction) {
  this.put(new Reaction({ pattern: pattern, callback: reaction }));
};

Vat.prototype.addObserver = function (pattern, cb) {
  this.put(new Observer({ pattern: pattern, callback: cb }));
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

Vat.Reaction = Reaction;
Vat.Observer = Observer;

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

!function (e) {
  if ("object" == typeof exports && "undefined" != typeof module) module.exports = e();else if ("function" == typeof define && define.amd) define([], e);else {
    var f;"undefined" != typeof window ? f = window : "undefined" != typeof global ? f = global : "undefined" != typeof self && (f = self), f.pm = e();
  }
}(function () {
  var define, module, exports;return (function e(t, n, r) {
    function s(o, u) {
      if (!n[o]) {
        if (!t[o]) {
          var a = typeof require == "function" && require;if (!u && a) return a(o, !0);if (i) return i(o, !0);var f = new Error("Cannot find module '" + o + "'");throw f.code = "MODULE_NOT_FOUND", f;
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
          return (ITERATOR_SYMBOL && typeof obj[ITERATOR_SYMBOL] === "function") || typeof obj[FAKE_ITERATOR_SYMBOL] === "function" || isArrayLike(obj);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9saWIvZ2VuZXJhdG9yLXV0aWwuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9saWIvdmF0LmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbGliLzZ0bzUvcG9seWZpbGwuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvNnRvNS9saWIvNnRvNS90cmFuc2Zvcm1hdGlvbi90cmFuc2Zvcm1lcnMvZXM2LWdlbmVyYXRvcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc2hpbS9lczYtc2hpbS5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc3ltYm9sL2ltcGxlbWVudC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc3ltYm9sL2lzLWltcGxlbWVudGVkLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbm9kZV9tb2R1bGVzL2VzNi1zeW1ib2wvbm9kZV9tb2R1bGVzL2QvaW5kZXguanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvNnRvNS9ub2RlX21vZHVsZXMvZXM2LXN5bWJvbC9ub2RlX21vZHVsZXMvZXM1LWV4dC9nbG9iYWwuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvNnRvNS9ub2RlX21vZHVsZXMvZXM2LXN5bWJvbC9ub2RlX21vZHVsZXMvZXM1LWV4dC9vYmplY3QvYXNzaWduL2luZGV4LmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbm9kZV9tb2R1bGVzL2VzNi1zeW1ib2wvbm9kZV9tb2R1bGVzL2VzNS1leHQvb2JqZWN0L2Fzc2lnbi9pcy1pbXBsZW1lbnRlZC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc3ltYm9sL25vZGVfbW9kdWxlcy9lczUtZXh0L29iamVjdC9hc3NpZ24vc2hpbS5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc3ltYm9sL25vZGVfbW9kdWxlcy9lczUtZXh0L29iamVjdC9pcy1jYWxsYWJsZS5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc3ltYm9sL25vZGVfbW9kdWxlcy9lczUtZXh0L29iamVjdC9rZXlzL2luZGV4LmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbm9kZV9tb2R1bGVzL2VzNi1zeW1ib2wvbm9kZV9tb2R1bGVzL2VzNS1leHQvb2JqZWN0L2tleXMvaXMtaW1wbGVtZW50ZWQuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvNnRvNS9ub2RlX21vZHVsZXMvZXM2LXN5bWJvbC9ub2RlX21vZHVsZXMvZXM1LWV4dC9vYmplY3Qva2V5cy9zaGltLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbm9kZV9tb2R1bGVzL2VzNi1zeW1ib2wvbm9kZV9tb2R1bGVzL2VzNS1leHQvb2JqZWN0L25vcm1hbGl6ZS1vcHRpb25zLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbm9kZV9tb2R1bGVzL2VzNi1zeW1ib2wvbm9kZV9tb2R1bGVzL2VzNS1leHQvb2JqZWN0L3ZhbGlkLXZhbHVlLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbm9kZV9tb2R1bGVzL2VzNi1zeW1ib2wvbm9kZV9tb2R1bGVzL2VzNS1leHQvc3RyaW5nLyMvY29udGFpbnMvaW5kZXguanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvNnRvNS9ub2RlX21vZHVsZXMvZXM2LXN5bWJvbC9ub2RlX21vZHVsZXMvZXM1LWV4dC9zdHJpbmcvIy9jb250YWlucy9pcy1pbXBsZW1lbnRlZC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc3ltYm9sL25vZGVfbW9kdWxlcy9lczUtZXh0L3N0cmluZy8jL2NvbnRhaW5zL3NoaW0uanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvNnRvNS9ub2RlX21vZHVsZXMvZXM2LXN5bWJvbC9wb2x5ZmlsbC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L3BvbHlmaWxsLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbGliL19lbXB0eS5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9hc3NlcnQvYXNzZXJ0LmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvaW1tdXRhYmxlL2Rpc3QvaW1tdXRhYmxlLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzL3RyZWUtd2Fsay9pbmRleC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy90cmVlLXdhbGsvbm9kZV9tb2R1bGVzL3V0aWwtZXh0ZW5kL2V4dGVuZC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy90cmVlLXdhbGsvdGhpcmRfcGFydHkvV2Vha01hcC9pbmRleC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL3RoaXJkX3BhcnR5L3BhdHRlcm4tbWF0Y2guanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS90aGlyZF9wYXJ0eS93ZWFrbWFwLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7O0FDRUEsTUFBTSxDQUFDLE9BQU8sR0FBRzs7QUFFZixTQUFPLEVBQUEsVUFBQyxHQUFHLEVBQUU7QUFDWCxRQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7eUJBQ0YsR0FBRztVQUFSLENBQUM7QUFDUixZQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7QUFFakIsV0FBTyxNQUFNLENBQUM7R0FDZjs7QUFFRCxNQUFJLEVBQUEsVUFBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRTswQkFDZCxHQUFHO1VBQVIsQ0FBQztBQUNSLFVBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQzVCLE9BQU8sQ0FBQyxDQUFDOztHQUVkOztBQUVELE9BQUssRUFBQSxVQUFDLEdBQUcsRUFBRTtBQUNULFdBQU8sR0FBRyxDQUFDLElBQUksRUFBRSxDQUFD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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsY0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzkrREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTs7QUNEQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVrQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6aUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDL0NBLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxNQUFHLFFBQVEsSUFBRSxPQUFPLE9BQU8sSUFBRSxXQUFXLElBQUUsT0FBTyxNQUFNLEVBQUMsTUFBTSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUcsVUFBVSxJQUFFLE9BQU8sTUFBTSxJQUFFLE1BQU0sQ0FBQyxHQUFHLEVBQUMsTUFBTSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFJO0FBQUMsUUFBSSxDQUFDLENBQUMsV0FBVyxJQUFFLE9BQU8sTUFBTSxHQUFDLENBQUMsR0FBQyxNQUFNLEdBQUMsV0FBVyxJQUFFLE9BQU8sTUFBTSxHQUFDLENBQUMsR0FBQyxNQUFNLEdBQUMsV0FBVyxJQUFFLE9BQU8sSUFBSSxJQUFFLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxFQUFFLENBQUE7R0FBQztDQUFDLENBQUMsWUFBVTtBQUFDLE1BQUksTUFBTSxFQUFDLE1BQU0sRUFBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxZQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsY0FBSSxDQUFDLEdBQUMsT0FBTyxPQUFPLElBQUUsVUFBVSxJQUFFLE9BQU8sQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsR0FBQyxDQUFDLEdBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMs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LEtBQUssR0FBRyxDQUFDO09BQ3pCO0tBQ0YsQ0FBQzs7QUFFRixLQUFDLE9BQU8sTUFBTSxLQUFLLFdBQVcsR0FBRyxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztHQUNyRSxDQUFDLEVBQUUsQ0FBQztDQUNOOzs7Ozs7Ozs7OztBQ3pDQztBQUNBO0FBQ0MsT0FBRyxFQUFFLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIGpzaGludCBlc25leHQ6IHRydWUgKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIC8vIFJldHVybiBhbiBBcnJheSB3aXRoIGFsbCB0aGUgdmFsdWVzIGZyb20gYGdlbmAuXG4gIHRvQXJyYXkoZ2VuKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIGZvciAodmFyIHggb2YgZ2VuKSB7XG4gICAgICByZXN1bHQucHVzaCh4KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcbiAgLy8gUmV0dXJuIHRoZSBmaXJzdCB2YWx1ZSBmcm9tIGBnZW5gIHRoYXQgcGFzc2VzIGEgdHJ1dGggdGVzdC5cbiAgZmluZChnZW4sIHByZWRpY2F0ZSwgdGhpc0FyZykge1xuICAgIGZvciAodmFyIHggb2YgZ2VuKSB7XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwodGhpc0FyZywgeCkpXG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfSxcbiAgLy8gUmV0dXJuIHRoZSBmaXJzdCB2YWx1ZSBmcm9tIGBnZW5gLlxuICBmaXJzdChnZW4pIHtcbiAgICByZXR1cm4gZ2VuLm5leHQoKS52YWx1ZTtcbiAgfVxufTtcbiIsIi8qIGpzaGludCBlc25leHQ6IHRydWUgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JyksXG4gICAgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyLFxuICAgIEltbXV0YWJsZSA9IHJlcXVpcmUoJ2ltbXV0YWJsZScpLFxuICAgIHV0aWwgPSByZXF1aXJlKCd1dGlsJyksXG4gICAgd2FsayA9IHJlcXVpcmUoJ3RyZWUtd2FsaycpO1xuXG52YXIgcG0gPSByZXF1aXJlKCcuLi90aGlyZF9wYXJ0eS9wYXR0ZXJuLW1hdGNoJyksXG4gICAgZ3UgPSByZXF1aXJlKCcuL2dlbmVyYXRvci11dGlsJyk7XG5yZXF1aXJlKCcuLi90aGlyZF9wYXJ0eS93ZWFrbWFwLmpzJyk7XG5cbnZhciBtYXRjaCA9IHBtLm1hdGNoLFxuICAgIFBhdHRlcm4gPSBwbS5QYXR0ZXJuO1xuXG52YXIgUmVhY3Rpb24gPSBJbW11dGFibGUuUmVjb3JkKHsgcGF0dGVybjogbnVsbCwgY2FsbGJhY2s6IG51bGwgfSwgJ1JlYWN0aW9uJyk7XG52YXIgT2JzZXJ2ZXIgPSBJbW11dGFibGUuUmVjb3JkKHsgcGF0dGVybjogbnVsbCwgY2FsbGJhY2s6IG51bGwgfSwgJ09ic2VydmVyJyk7XG5cbnZhciBpbnN0YW5jZU9mID0gcG0uTWF0Y2hlci5pbnN0YW5jZU9mO1xuXG4vLyBDdXN0b20gd2Fsa2VyIGZvciB3YWxraW5nIGltbXV0YWJsZS1qcyBvYmplY3RzLlxudmFyIGltbXV0YWJsZVdhbGtlciA9IHdhbGsoZnVuY3Rpb24obm9kZSkge1xuICByZXR1cm4gSW1tdXRhYmxlLkl0ZXJhYmxlLmlzSXRlcmFibGUobm9kZSkgPyBub2RlLnRvSlMoKSA6IG5vZGU7XG59KTtcblxuLy8gQ3VzdG9tIHBhdHRlcm4gZm9yIG1hdGNoaW5nIEltbXV0YWJsZS5NYXAgYW5kIEltbXV0YWJsZS5SZWNvcmQgb2JqZWN0cy5cbnZhciBpbW11dGFibGVPYmogPSBQYXR0ZXJuLmV4dGVuZCh7XG4gIGluaXQ6IGZ1bmN0aW9uKG9ialBhdHRlcm4sIGN0b3IpIHtcbiAgICB0aGlzLm9ialBhdHRlcm4gPSBvYmpQYXR0ZXJuO1xuICAgIHRoaXMuY3RvciA9IGN0b3IgfHwgSW1tdXRhYmxlLk1hcDtcbiAgICB0aGlzLmFyaXR5ID0gdGhpcy5nZXRBcml0eShvYmpQYXR0ZXJuKTtcbiAgfSxcbiAgbWF0Y2g6IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICAgIHJldHVybiAodmFsdWUgaW5zdGFuY2VvZiB0aGlzLmN0b3IgJiZcbiAgICAgICAgICAgIHRoaXMucGVyZm9ybU1hdGNoKHZhbHVlLnRvT2JqZWN0KCksIHRoaXMub2JqUGF0dGVybiwgYmluZGluZ3MpKTtcbiAgfVxufSk7XG5cbi8vIEN1c3RvbSBwYXR0ZXJuIGZvciBtYXRjaGluZyBJbW11dGFibGUuTGlzdCBvYmplY3RzLlxudmFyIGltbXV0YWJsZUxpc3QgPSBQYXR0ZXJuLmV4dGVuZCh7XG4gIGluaXQ6IGZ1bmN0aW9uKGFyclBhdHRlcm4pIHtcbiAgICB0aGlzLmFyclBhdHRlcm4gPSBhcnJQYXR0ZXJuO1xuICAgIHRoaXMuYXJpdHkgPSB0aGlzLmdldEFyaXR5KGFyclBhdHRlcm4pO1xuICB9LFxuICBtYXRjaDogZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gICAgcmV0dXJuIChJbW11dGFibGUuTGlzdC5pc0xpc3QodmFsdWUpICYmXG4gICAgICAgICAgICB0aGlzLnBlcmZvcm1NYXRjaCh2YWx1ZS50b0FycmF5KCksIHRoaXMuYXJyUGF0dGVybiwgYmluZGluZ3MpKTtcbiAgfVxufSk7XG5cbi8vIFByaXZhdGUgaGVscGVyc1xuLy8gLS0tLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIGNvbnZlcnRQYXR0ZXJuKHApIHtcbiAgcmV0dXJuIGltbXV0YWJsZVdhbGtlci5yZWR1Y2UocCwgZnVuY3Rpb24obWVtbywgbm9kZSwga2V5LCBwYXJlbnQpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShub2RlKSlcbiAgICAgIHJldHVybiBpbW11dGFibGVMaXN0KG1lbW8gfHwgW10pO1xuICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgIHJldHVybiBub2RlO1xuICAgIGlmIChub2RlIGluc3RhbmNlb2YgSW1tdXRhYmxlLlJlY29yZClcbiAgICAgIHJldHVybiBpbW11dGFibGVPYmoobWVtbyB8fCB7fSwgbm9kZS5jb25zdHJ1Y3Rvcik7XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBPYmplY3QpXG4gICAgICByZXR1cm4gaW1tdXRhYmxlT2JqKG1lbW8gfHwge30pO1xuICAgIGFzc2VydCghbWVtbyk7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiogZ2V0TWF0Y2hlcyhhcnIsIHBhdHRlcm4pIHtcbiAgdmFyIHAgPSBjb252ZXJ0UGF0dGVybihwYXR0ZXJuKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIuc2l6ZTsgKytpKSB7XG4gICAgaWYgKG1hdGNoKGFyci5nZXQoaSkudmFsdWUsIHApICE9PSBudWxsKVxuICAgICAgeWllbGQgaTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kKGFyciwgcGF0dGVybikge1xuICByZXR1cm4gZ3UuZmlyc3QoZ2V0TWF0Y2hlcyhhcnIsIHBhdHRlcm4pKTtcbn1cblxuZnVuY3Rpb24qIGdldERlZXBNYXRjaGVzKGFyciwgcGF0dGVybikge1xuICB2YXIgcCA9IGNvbnZlcnRQYXR0ZXJuKHBhdHRlcm4pO1xuICB2YXIgcGF0aCA9IFtdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5zaXplOyArK2kpIHtcbiAgICBwYXRoLnB1c2goaSk7XG4gICAgdmFyIHJvb3QgPSBhcnIuZ2V0KGkpLnZhbHVlO1xuICAgIHZhciBiaW5kaW5ncztcbiAgICBpZiAoKGJpbmRpbmdzID0gbWF0Y2hEZWVwKHJvb3QsIHAsIHBhdGgpKSAhPT0gbnVsbCkge1xuICAgICAgdmFyIHJvb3RQYXRoID0gcGF0aC5zbGljZSgxKTtcbiAgICAgIHlpZWxkIHsgaW5kZXg6IHBhdGhbMF0sIHJvb3Q6IHJvb3QsIHBhdGg6IHJvb3RQYXRoLCBiaW5kaW5nczogYmluZGluZ3MgfTtcbiAgICB9XG4gICAgcGF0aC5wb3AoKTtcbiAgfVxufVxuXG4vLyBSZWN1cnNpdmVseSB0cmllcyB0byBtYXRjaCBgb2JqYCB3aXRoIGBwYXR0ZXJuYC5cbmZ1bmN0aW9uIG1hdGNoRGVlcChvYmosIHBhdHRlcm4sIHBhdGgpIHtcbiAgdmFyIHJlc3VsdDtcbiAgaWYgKChyZXN1bHQgPSBtYXRjaChvYmosIHBhdHRlcm4pKSAhPT0gbnVsbClcbiAgICByZXR1cm4gcmVzdWx0O1xuXG4gIHZhciBpc0xpc3QgPSBvYmogJiYgSW1tdXRhYmxlLkxpc3QuaXNMaXN0KG9iaik7XG4gIHZhciBpc01hcCA9IG9iaiAmJiBJbW11dGFibGUuTWFwLmlzTWFwKG9iaik7XG5cbiAgaWYgKGlzTGlzdCB8fCBpc01hcCkge1xuICAgIGZvciAodmFyIGl0ID0gb2JqLmVudHJpZXMoKTs7KSB7XG4gICAgICB2YXIgZW50cnkgPSBpdC5uZXh0KCk7XG4gICAgICBpZiAoZW50cnkuZG9uZSkgYnJlYWs7XG4gICAgICBwYXRoLnB1c2goZW50cnkudmFsdWVbMF0pO1xuICAgICAgaWYgKChyZXN1bHQgPSBtYXRjaERlZXAoZW50cnkudmFsdWVbMV0sIHBhdHRlcm4sIHBhdGgpKSAhPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIHBhdGgucG9wKCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vLyBWYXQgaW1wbGVtZW50YXRpb25cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBBIFZhdCBpcyBhIHR1cGxlLXNwYWNlIGxpa2UgdGhpbmcuIEV2ZW50dWFsbHksIEknZCBsaWtlIHRvIHN1cHBvcnQgb2JqZWN0c1xuLy8gYW5kIG5vdCBqdXN0IHR1cGxlcywgYW5kICdvYmplY3Qgc3BhY2UnIGlzIHN1Y2ggYSBib3JpbmcgbmFtZS5cbmZ1bmN0aW9uIFZhdCgpIHtcbiAgdGhpcy5faW5pdCgpO1xuXG4gIC8vIFN0b3JlIHRoaXMgVmF0J3MgaGlzdG9yeSBpbiBhIFZhdCwgYnV0IHN0b3AgdGhlIHJlY3Vyc2lvbiB0aGVyZSAtLSBkb24ndFxuICAvLyBrZWVwIGEgaGlzdG9yeSBvZiB0aGUgaGlzdG9yeS5cbiAgdGhpcy5faGlzdG9yeSA9IE9iamVjdC5jcmVhdGUoVmF0LnByb3RvdHlwZSk7XG4gIHRoaXMuX2hpc3RvcnkuX2luaXQoKTtcbiAgdGhpcy5faGlzdG9yeS5wdXQodGhpcy5fc3RvcmUpO1xufVxuXG51dGlsLmluaGVyaXRzKFZhdCwgRXZlbnRFbWl0dGVyKTtcblxuVmF0LnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9zdG9yZSA9IEltbXV0YWJsZS5MaXN0KCk7XG4gIHRoaXMuX3dhaXRpbmcgPSBbXTtcbn07XG5cblZhdC5wcm90b3R5cGUuX3VwZGF0ZVN0b3JlID0gZnVuY3Rpb24odXBkYXRlRm4pIHtcbiAgdGhpcy5fc3RvcmUgPSB1cGRhdGVGbi5jYWxsKHRoaXMpO1xuICBpZiAodGhpcy5faGlzdG9yeSkge1xuICAgIHRoaXMuX2hpc3RvcnkucHV0KHRoaXMuX3N0b3JlKTtcblxuICAgIC8vIFRPRE86IEdldCByaWQgb2YgY2hhbmdlIGV2ZW50cyBlbnRpcmVseS5cbiAgICB0aGlzLmVtaXQoJ2NoYW5nZScpO1xuICB9XG59O1xuXG5WYXQucHJvdG90eXBlLl9kb1dpdGhvdXRIaXN0b3J5ID0gZnVuY3Rpb24oZm4pIHtcbiAgdmFyIGhpc3QgPSB0aGlzLl9oaXN0b3J5O1xuICB0aGlzLl9oaXN0b3J5ID0gbnVsbDtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZm4uY2FsbCh0aGlzKTtcbiAgfSBmaW5hbGx5IHtcbiAgICB0aGlzLl9oaXN0b3J5ID0gaGlzdDtcbiAgfVxufTtcblxuVmF0LnByb3RvdHlwZS5fdHJ5ID0gZnVuY3Rpb24ocGF0dGVybiwgb3AsIGNiKSB7XG4gIHZhciByZXN1bHQgPSB0aGlzWyd0cnlfJyArIG9wXS5jYWxsKHRoaXMsIHBhdHRlcm4pO1xuICBpZiAocmVzdWx0KSB7XG4gICAgY2IocmVzdWx0KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59O1xuXG5WYXQucHJvdG90eXBlLl90cnlPcldhaXQgPSBmdW5jdGlvbihwYXR0ZXJuLCBvcCwgY2IpIHtcbiAgaWYgKCF0aGlzLl90cnkocGF0dGVybiwgb3AsIGNiKSkge1xuICAgIHRoaXMuX3dhaXRpbmcucHVzaCh7XG4gICAgICBwYXR0ZXJuOiBwYXR0ZXJuLFxuICAgICAgb3A6IG9wLFxuICAgICAgY2FsbGJhY2s6IGNiXG4gICAgfSk7XG4gIH1cbn07XG5cblZhdC5wcm90b3R5cGUuX3JlbW92ZUF0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgdmFyIHJlc3VsdCA9IHRoaXMuX3N0b3JlLmdldChpbmRleCkudmFsdWU7XG4gIHRoaXMuX3VwZGF0ZVN0b3JlKGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9zdG9yZS5zcGxpY2UoaW5kZXgsIDEpO1xuICB9KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cblZhdC5wcm90b3R5cGUuX3RyeVJlYWN0aW9uID0gZnVuY3Rpb24ocikge1xuICAvLyBQcmV2ZW50IHRoaXMgcmVhY3Rpb24gZnJvbSBtYXRjaGluZyBhZ2FpbnN0IG9iamVjdHMgaXQncyBhbHJlYWR5IG1hdGNoZWQuXG4gIC8vIEZJWE1FOiBUaGlzIHNob3VsZCByZWFsbHkgY2hlY2sgZm9yIGEgbWF0Y2ggX2F0IHRoZSBzYW1lIHBhdGhfLlxuICB2YXIgc3RvcmUgPSB0aGlzLl9zdG9yZTtcbiAgZnVuY3Rpb24gYWNjZXB0KG0pIHtcbiAgICB2YXIgcmVjb3JkID0gc3RvcmUuZ2V0KG0uaW5kZXgpO1xuICAgIGlmICghcmVjb3JkLnJlYWN0aW9ucy5oYXMocikpIHtcbiAgICAgIHJlY29yZC5yZWFjdGlvbnMuc2V0KHIsIHRydWUpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHZhciBtYXRjaCA9IGd1LmZpbmQoZ2V0RGVlcE1hdGNoZXMoc3RvcmUsIHIucGF0dGVybiksIGFjY2VwdCk7XG4gIGlmICghbWF0Y2gpIHJldHVybjtcblxuICBpZiAociBpbnN0YW5jZW9mIFJlYWN0aW9uKVxuICAgIHRoaXMuX2RvV2l0aG91dEhpc3RvcnkoZnVuY3Rpb24oKSB7IHRoaXMuX3JlbW92ZUF0KG1hdGNoLmluZGV4KTsgfSk7XG5cbiAgdmFyIGFyaXR5ID0gci5jYWxsYmFjay5sZW5ndGg7XG4gIHZhciBleHBlY3RlZEFyaXR5ID0gbWF0Y2guYmluZGluZ3MubGVuZ3RoICsgMTtcbiAgYXNzZXJ0KGFyaXR5ID09PSBleHBlY3RlZEFyaXR5LFxuICAgICAgJ0JhZCBmdW5jdGlvbiBhcml0eTogZXhwZWN0ZWQgJyArIGV4cGVjdGVkQXJpdHkgKyAnLCBnb3QgJyArIGFyaXR5KTtcblxuICB2YXIgcm9vdCA9IG1hdGNoLnJvb3Q7XG4gIHZhciB2YWx1ZSA9IHJvb3QuZ2V0SW4obWF0Y2gucGF0aCk7XG4gIHZhciBuZXdWYWx1ZSA9IHJvb3QudXBkYXRlSW4obWF0Y2gucGF0aCwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHIuY2FsbGJhY2suYXBwbHkobnVsbCwgW3ZhbHVlXS5jb25jYXQobWF0Y2guYmluZGluZ3MpKTtcbiAgfSk7XG5cbiAgaWYgKHIgaW5zdGFuY2VvZiBSZWFjdGlvbikge1xuICAgIC8vIFB1dCB0aGUgb2JqZWN0IGJhY2sgaW4gdGhlIHZhdCwgcmVwbGFjaW5nIHRoZSBtYXRjaGVkIHBhcnQgd2l0aCB0aGVcbiAgICAvLyByZXN1bHQgb2YgdGhlIHJlYWN0aW9uIGZ1bmN0aW9uLlxuICAgIGlmIChuZXdWYWx1ZSA9PT0gdm9pZCAwKVxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignUmVhY3Rpb25zIG11c3QgcmV0dXJuIGEgdmFsdWUnKTtcbiAgICBpZiAobmV3VmFsdWUgIT09IG51bGwpXG4gICAgICB0aGlzLnB1dChuZXdWYWx1ZSk7XG4gIH1cbn07XG5cblZhdC5wcm90b3R5cGUucHV0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgLy8gQ29weSB0aGUgcmVhY3Rpb25zIGJlZm9yZSB1cGRhdGluZyB0aGUgc3RvcmUsIGFzIGEgcmVhY3Rpb24gc2hvdWxkbid0IGJlXG4gIC8vIGFibGUgdG8gaW1tZWRpYXRlbHkgcmVhY3QgdG8gaXRzZWxmLlxuICB2YXIgb2JzZXJ2ZXJzID0gdGhpcy50cnlfY29weV9hbGwoaW5zdGFuY2VPZihPYnNlcnZlcikpO1xuICB2YXIgcmVhY3Rpb25zID0gdGhpcy50cnlfY29weV9hbGwoaW5zdGFuY2VPZihSZWFjdGlvbikpO1xuXG4gIC8vIFVwZGF0ZSB0aGUgc3RvcmUuXG4gIHZhciBzdG9yZWRPYmogPSB7XG4gICAgdmFsdWU6IEltbXV0YWJsZS5mcm9tSlModmFsdWUpLFxuICAgIHJlYWN0aW9uczogbmV3IFdlYWtNYXAoKVxuICB9O1xuICB0aGlzLl91cGRhdGVTdG9yZShmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fc3RvcmUucHVzaChzdG9yZWRPYmopO1xuICB9KTtcblxuICAvLyBBIHJlYWxseSBuYWl2ZSB2ZXJzaW9uIG9mIGRlZmVycmVkIHRha2UvY29weS4gVGhpcyBzaG91bGRcbiAgLy8gcHJvYmFibHkgYmUgd3JpdHRlbiBpbiBhIG1vcmUgZWZmaWNpZW50IHdheS5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl93YWl0aW5nID0gdGhpcy5fd2FpdGluZy5maWx0ZXIoZnVuY3Rpb24oaW5mbykge1xuICAgIHJldHVybiAhc2VsZi5fdHJ5KGluZm8ucGF0dGVybiwgaW5mby5vcCwgaW5mby5jYWxsYmFjayk7XG4gIH0pO1xuXG4gIC8vIFRPRE86IEEgYmxvY2tpbmcgdGFrZS9jb3B5IGlzIGJhc2ljYWxseSBhIG9uZS10aW1lIG9ic2VydmVyLiBUaGV5IHNob3VsZFxuICAvLyBiZSBpbXBsZW1lbnRlZCBpbiB0aGUgc2FtZSB3YXkuXG4gIG9ic2VydmVycy5mb3JFYWNoKHRoaXMuX3RyeVJlYWN0aW9uLCB0aGlzKTtcbiAgcmVhY3Rpb25zLmZvckVhY2godGhpcy5fdHJ5UmVhY3Rpb24sIHRoaXMpO1xufTtcblxuVmF0LnByb3RvdHlwZS50cnlfY29weSA9IGZ1bmN0aW9uKHBhdHRlcm4pIHtcbiAgdmFyIGkgPSBmaW5kKHRoaXMuX3N0b3JlLCBwYXR0ZXJuKTtcbiAgcmV0dXJuIGkgPj0gMCA/IHRoaXMuX3N0b3JlLmdldChpKS52YWx1ZSA6IG51bGw7XG59O1xuXG5WYXQucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbihwYXR0ZXJuLCBjYikge1xuICB0aGlzLl90cnlPcldhaXQocGF0dGVybiwgJ2NvcHknLCBjYik7XG59O1xuXG5WYXQucHJvdG90eXBlLnRyeV9jb3B5X2FsbCA9IGZ1bmN0aW9uKHBhdHRlcm4pIHtcbiAgdmFyIG1hdGNoZXMgPSBndS50b0FycmF5KGdldE1hdGNoZXModGhpcy5fc3RvcmUsIHBhdHRlcm4pKTtcbiAgcmV0dXJuIG1hdGNoZXMubWFwKGkgPT4gdGhpcy5fc3RvcmUuZ2V0KGkpLnZhbHVlKTtcbn07XG5cblZhdC5wcm90b3R5cGUudHJ5X3Rha2UgPSBmdW5jdGlvbihwYXR0ZXJuLCBkZWVwKSB7XG4gIGlmIChkZWVwKSB7XG4gICAgdmFyIHJlc3VsdCA9IGd1LmZpcnN0KGdldERlZXBNYXRjaGVzKHRoaXMuX3N0b3JlLCBwYXR0ZXJuKSk7XG4gICAgaWYgKHJlc3VsdCkge1xuICAgICAgdGhpcy5fcmVtb3ZlQXQocmVzdWx0LmluZGV4KTtcbiAgICAgIHJldHVybiBbcmVzdWx0LnJvb3QsIHJlc3VsdC5wYXRoXTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgdmFyIGkgPSBmaW5kKHRoaXMuX3N0b3JlLCBwYXR0ZXJuKTtcbiAgcmV0dXJuIGkgPj0gMCA/IHRoaXMuX3JlbW92ZUF0KGkpIDogbnVsbDtcbn07XG5cblZhdC5wcm90b3R5cGUudGFrZSA9IGZ1bmN0aW9uKHBhdHRlcm4sIGNiKSB7XG4gIHRoaXMuX3RyeU9yV2FpdChwYXR0ZXJuLCAndGFrZScsIGNiKTtcbn07XG5cbi8vIEEgcmVhY3Rpb24gaXMgYSBwcm9jZXNzIHRoYXQgYXR0ZW1wdHMgdG8gYHRha2VgIGEgZ2l2ZW4gcGF0dGVybiBldmVyeVxuLy8gdGltZSB0aGUgdHVwbGUgc3BhY2UgY2hhbmdlcy4gSWYgdGhlIGByZWFjdGlvbmAgZnVuY3Rpb24gcHJvZHVjZXMgYSByZXN1bHQsXG4vLyB0aGUgcmVzdWx0IGlzIHB1dCBpbnRvIHRoZSB0dXBsZSBzcGFjZS5cblZhdC5wcm90b3R5cGUuYWRkUmVhY3Rpb24gPSBmdW5jdGlvbihwYXR0ZXJuLCByZWFjdGlvbikge1xuICB0aGlzLnB1dChuZXcgUmVhY3Rpb24oeyBwYXR0ZXJuOiBwYXR0ZXJuLCBjYWxsYmFjazogcmVhY3Rpb24gfSkpO1xufTtcblxuVmF0LnByb3RvdHlwZS5hZGRPYnNlcnZlciA9IGZ1bmN0aW9uKHBhdHRlcm4sIGNiKSB7XG4gIHRoaXMucHV0KG5ldyBPYnNlcnZlcih7IHBhdHRlcm46IHBhdHRlcm4sIGNhbGxiYWNrOiBjYiB9KSk7XG59O1xuXG5WYXQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKHBhdHRlcm4sIGNiKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy50YWtlKHBhdHRlcm4sIGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgc2VsZi5wdXQoY2IobWF0Y2gpKTtcbiAgfSk7XG59O1xuXG4vLyBEb2VzIHdoYXQgeW91J2QgZXhwZWN0LlxuVmF0LnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLl9zdG9yZS5zaXplO1xufTtcblxuVmF0LlJlYWN0aW9uID0gUmVhY3Rpb247XG5WYXQuT2JzZXJ2ZXIgPSBPYnNlcnZlcjtcblxuLy8gRXhwb3J0c1xuLy8gLS0tLS0tLVxuXG5tb2R1bGUuZXhwb3J0cyA9IFZhdDtcbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qIGpzaGludCBuZXdjYXA6IGZhbHNlICovXG5cbnZhciBlbnN1cmVTeW1ib2wgPSBmdW5jdGlvbiAoa2V5KSB7XG4gIFN5bWJvbFtrZXldID0gU3ltYm9sW2tleV0gfHwgU3ltYm9sKCk7XG59O1xuXG52YXIgZW5zdXJlUHJvdG8gPSBmdW5jdGlvbiAoQ29uc3RydWN0b3IsIGtleSwgdmFsKSB7XG4gIHZhciBwcm90byA9IENvbnN0cnVjdG9yLnByb3RvdHlwZTtcbiAgcHJvdG9ba2V5XSA9IHByb3RvW2tleV0gfHwgdmFsO1xufTtcblxuLy9cblxuaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgcmVxdWlyZShcImVzNi1zeW1ib2wvaW1wbGVtZW50XCIpO1xufVxuXG5yZXF1aXJlKFwiZXM2LXNoaW1cIik7XG5yZXF1aXJlKFwiLi90cmFuc2Zvcm1hdGlvbi90cmFuc2Zvcm1lcnMvZXM2LWdlbmVyYXRvcnMvcnVudGltZVwiKTtcblxuLy8gQWJzdHJhY3QgcmVmZXJlbmNlc1xuXG5lbnN1cmVTeW1ib2woXCJyZWZlcmVuY2VHZXRcIik7XG5lbnN1cmVTeW1ib2woXCJyZWZlcmVuY2VTZXRcIik7XG5lbnN1cmVTeW1ib2woXCJyZWZlcmVuY2VEZWxldGVcIik7XG5cbmVuc3VyZVByb3RvKEZ1bmN0aW9uLCBTeW1ib2wucmVmZXJlbmNlR2V0LCBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9KTtcblxuZW5zdXJlUHJvdG8oTWFwLCBTeW1ib2wucmVmZXJlbmNlR2V0LCBNYXAucHJvdG90eXBlLmdldCk7XG5lbnN1cmVQcm90byhNYXAsIFN5bWJvbC5yZWZlcmVuY2VTZXQsIE1hcC5wcm90b3R5cGUuc2V0KTtcbmVuc3VyZVByb3RvKE1hcCwgU3ltYm9sLnJlZmVyZW5jZURlbGV0ZSwgTWFwLnByb3RvdHlwZS5kZWxldGUpO1xuXG5pZiAoZ2xvYmFsLldlYWtNYXApIHtcbiAgZW5zdXJlUHJvdG8oV2Vha01hcCwgU3ltYm9sLnJlZmVyZW5jZUdldCwgV2Vha01hcC5wcm90b3R5cGUuZ2V0KTtcbiAgZW5zdXJlUHJvdG8oV2Vha01hcCwgU3ltYm9sLnJlZmVyZW5jZVNldCwgV2Vha01hcC5wcm90b3R5cGUuc2V0KTtcbiAgZW5zdXJlUHJvdG8oV2Vha01hcCwgU3ltYm9sLnJlZmVyZW5jZURlbGV0ZSwgV2Vha01hcC5wcm90b3R5cGUuZGVsZXRlKTtcbn1cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLyoqXG4qIENvcHlyaWdodCAoYykgMjAxNCwgRmFjZWJvb2ssIEluYy5cbiogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbipcbiogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4qIGh0dHBzOi8vcmF3LmdpdGh1Yi5jb20vZmFjZWJvb2svcmVnZW5lcmF0b3IvbWFzdGVyL0xJQ0VOU0UgZmlsZS4gQW5cbiogYWRkaXRpb25hbCBncmFudCBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluXG4qIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiovXG5cbnZhciBpdGVyYXRvclN5bWJvbCA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBTeW1ib2wuaXRlcmF0b3IgfHwgXCJAQGl0ZXJhdG9yXCI7XG52YXIgcnVudGltZSA9IGdsb2JhbC5yZWdlbmVyYXRvclJ1bnRpbWUgPSBleHBvcnRzO1xudmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbnZhciB3cmFwID0gcnVudGltZS53cmFwID0gZnVuY3Rpb24gd3JhcChpbm5lckZuLCBvdXRlckZuLCBzZWxmLCB0cnlMaXN0KSB7XG4gIHJldHVybiBuZXcgR2VuZXJhdG9yKGlubmVyRm4sIG91dGVyRm4sIHNlbGYgfHwgbnVsbCwgdHJ5TGlzdCB8fCBbXSk7XG59O1xuXG52YXIgR2VuU3RhdGVTdXNwZW5kZWRTdGFydCA9IFwic3VzcGVuZGVkU3RhcnRcIjtcbnZhciBHZW5TdGF0ZVN1c3BlbmRlZFlpZWxkID0gXCJzdXNwZW5kZWRZaWVsZFwiO1xudmFyIEdlblN0YXRlRXhlY3V0aW5nID0gXCJleGVjdXRpbmdcIjtcbnZhciBHZW5TdGF0ZUNvbXBsZXRlZCA9IFwiY29tcGxldGVkXCI7XG5cbi8vIFJldHVybmluZyB0aGlzIG9iamVjdCBmcm9tIHRoZSBpbm5lckZuIGhhcyB0aGUgc2FtZSBlZmZlY3QgYXNcbi8vIGJyZWFraW5nIG91dCBvZiB0aGUgZGlzcGF0Y2ggc3dpdGNoIHN0YXRlbWVudC5cbnZhciBDb250aW51ZVNlbnRpbmVsID0ge307XG5cbi8vIER1bW15IGNvbnN0cnVjdG9yIHRoYXQgd2UgdXNlIGFzIHRoZSAuY29uc3RydWN0b3IgcHJvcGVydHkgZm9yXG4vLyBmdW5jdGlvbnMgdGhhdCByZXR1cm4gR2VuZXJhdG9yIG9iamVjdHMuXG5mdW5jdGlvbiBHZW5lcmF0b3JGdW5jdGlvbigpIHt9XG52YXIgR0ZwID0gZnVuY3Rpb24gR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGUoKSB7fTtcbnZhciBHcCA9IEdGcC5wcm90b3R5cGUgPSBHZW5lcmF0b3IucHJvdG90eXBlO1xuKEdGcC5jb25zdHJ1Y3RvciA9IEdlbmVyYXRvckZ1bmN0aW9uKS5wcm90b3R5cGUgPSBHcC5jb25zdHJ1Y3RvciA9IEdGcDtcblxucnVudGltZS5pc0dlbmVyYXRvckZ1bmN0aW9uID0gZnVuY3Rpb24gKGdlbkZ1bikge1xuICB2YXIgY3RvciA9IGdlbkZ1biAmJiBnZW5GdW4uY29uc3RydWN0b3I7XG4gIHJldHVybiBjdG9yID8gR2VuZXJhdG9yRnVuY3Rpb24ubmFtZSA9PT0gY3Rvci5uYW1lIDogZmFsc2U7XG59O1xuXG5ydW50aW1lLm1hcmsgPSBmdW5jdGlvbiAoZ2VuRnVuKSB7XG4gIGdlbkZ1bi5fX3Byb3RvX18gPSBHRnA7XG4gIGdlbkZ1bi5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEdwKTtcbiAgcmV0dXJuIGdlbkZ1bjtcbn07XG5cbnJ1bnRpbWUuYXN5bmMgPSBmdW5jdGlvbiAoaW5uZXJGbiwgb3V0ZXJGbiwgc2VsZiwgdHJ5TGlzdCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHZhciBnZW5lcmF0b3IgPSB3cmFwKGlubmVyRm4sIG91dGVyRm4sIHNlbGYsIHRyeUxpc3QpO1xuICAgIHZhciBjYWxsTmV4dCA9IHN0ZXAuYmluZChnZW5lcmF0b3IubmV4dCk7XG4gICAgdmFyIGNhbGxUaHJvdyA9IHN0ZXAuYmluZChnZW5lcmF0b3JbXCJ0aHJvd1wiXSk7XG5cbiAgICBmdW5jdGlvbiBzdGVwKGFyZykge1xuICAgICAgdmFyIGluZm87XG4gICAgICB2YXIgdmFsdWU7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGluZm8gPSB0aGlzKGFyZyk7XG4gICAgICAgIHZhbHVlID0gaW5mby52YWx1ZTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHJldHVybiByZWplY3QoZXJyb3IpO1xuICAgICAgfVxuXG4gICAgICBpZiAoaW5mby5kb25lKSB7XG4gICAgICAgIHJlc29sdmUodmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgUHJvbWlzZS5yZXNvbHZlKHZhbHVlKS50aGVuKGNhbGxOZXh0LCBjYWxsVGhyb3cpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNhbGxOZXh0KCk7XG4gIH0pO1xufTtcblxuZnVuY3Rpb24gR2VuZXJhdG9yKGlubmVyRm4sIG91dGVyRm4sIHNlbGYsIHRyeUxpc3QpIHtcbiAgdmFyIGdlbmVyYXRvciA9IG91dGVyRm4gPyBPYmplY3QuY3JlYXRlKG91dGVyRm4ucHJvdG90eXBlKSA6IHRoaXM7XG4gIHZhciBjb250ZXh0ID0gbmV3IENvbnRleHQodHJ5TGlzdCk7XG4gIHZhciBzdGF0ZSA9IEdlblN0YXRlU3VzcGVuZGVkU3RhcnQ7XG5cbiAgZnVuY3Rpb24gaW52b2tlKG1ldGhvZCwgYXJnKSB7XG4gICAgaWYgKHN0YXRlID09PSBHZW5TdGF0ZUV4ZWN1dGluZykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR2VuZXJhdG9yIGlzIGFscmVhZHkgcnVubmluZ1wiKTtcbiAgICB9XG5cbiAgICBpZiAoc3RhdGUgPT09IEdlblN0YXRlQ29tcGxldGVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHZW5lcmF0b3IgaGFzIGFscmVhZHkgZmluaXNoZWRcIik7XG4gICAgfVxuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHZhciBkZWxlZ2F0ZSA9IGNvbnRleHQuZGVsZWdhdGU7XG4gICAgICB2YXIgaW5mbztcblxuICAgICAgaWYgKGRlbGVnYXRlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaW5mbyA9IGRlbGVnYXRlLml0ZXJhdG9yW21ldGhvZF0oYXJnKTtcblxuICAgICAgICAgIC8vIERlbGVnYXRlIGdlbmVyYXRvciByYW4gYW5kIGhhbmRsZWQgaXRzIG93biBleGNlcHRpb25zIHNvXG4gICAgICAgICAgLy8gcmVnYXJkbGVzcyBvZiB3aGF0IHRoZSBtZXRob2Qgd2FzLCB3ZSBjb250aW51ZSBhcyBpZiBpdCBpc1xuICAgICAgICAgIC8vIFwibmV4dFwiIHdpdGggYW4gdW5kZWZpbmVkIGFyZy5cbiAgICAgICAgICBtZXRob2QgPSBcIm5leHRcIjtcbiAgICAgICAgICBhcmcgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgfSBjYXRjaCAodW5jYXVnaHQpIHtcbiAgICAgICAgICBjb250ZXh0LmRlbGVnYXRlID0gbnVsbDtcblxuICAgICAgICAgIC8vIExpa2UgcmV0dXJuaW5nIGdlbmVyYXRvci50aHJvdyh1bmNhdWdodCksIGJ1dCB3aXRob3V0IHRoZVxuICAgICAgICAgIC8vIG92ZXJoZWFkIG9mIGFuIGV4dHJhIGZ1bmN0aW9uIGNhbGwuXG4gICAgICAgICAgbWV0aG9kID0gXCJ0aHJvd1wiO1xuICAgICAgICAgIGFyZyA9IHVuY2F1Z2h0O1xuXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaW5mby5kb25lKSB7XG4gICAgICAgICAgY29udGV4dFtkZWxlZ2F0ZS5yZXN1bHROYW1lXSA9IGluZm8udmFsdWU7XG4gICAgICAgICAgY29udGV4dC5uZXh0ID0gZGVsZWdhdGUubmV4dExvYztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdGF0ZSA9IEdlblN0YXRlU3VzcGVuZGVkWWllbGQ7XG4gICAgICAgICAgcmV0dXJuIGluZm87XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZXh0LmRlbGVnYXRlID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgaWYgKG1ldGhvZCA9PT0gXCJuZXh0XCIpIHtcbiAgICAgICAgaWYgKHN0YXRlID09PSBHZW5TdGF0ZVN1c3BlbmRlZFN0YXJ0ICYmXG4gICAgICAgICAgICB0eXBlb2YgYXJnICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgLy8gaHR0cHM6Ly9wZW9wbGUubW96aWxsYS5vcmcvfmpvcmVuZG9yZmYvZXM2LWRyYWZ0Lmh0bWwjc2VjLWdlbmVyYXRvcnJlc3VtZVxuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgICBcImF0dGVtcHQgdG8gc2VuZCBcIiArIEpTT04uc3RyaW5naWZ5KGFyZykgKyBcIiB0byBuZXdib3JuIGdlbmVyYXRvclwiXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdGF0ZSA9PT0gR2VuU3RhdGVTdXNwZW5kZWRZaWVsZCkge1xuICAgICAgICAgIGNvbnRleHQuc2VudCA9IGFyZztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgY29udGV4dC5zZW50O1xuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSBpZiAobWV0aG9kID09PSBcInRocm93XCIpIHtcbiAgICAgICAgaWYgKHN0YXRlID09PSBHZW5TdGF0ZVN1c3BlbmRlZFN0YXJ0KSB7XG4gICAgICAgICAgc3RhdGUgPSBHZW5TdGF0ZUNvbXBsZXRlZDtcbiAgICAgICAgICB0aHJvdyBhcmc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29udGV4dC5kaXNwYXRjaEV4Y2VwdGlvbihhcmcpKSB7XG4gICAgICAgICAgLy8gSWYgdGhlIGRpc3BhdGNoZWQgZXhjZXB0aW9uIHdhcyBjYXVnaHQgYnkgYSBjYXRjaCBibG9jayxcbiAgICAgICAgICAvLyB0aGVuIGxldCB0aGF0IGNhdGNoIGJsb2NrIGhhbmRsZSB0aGUgZXhjZXB0aW9uIG5vcm1hbGx5LlxuICAgICAgICAgIG1ldGhvZCA9IFwibmV4dFwiO1xuICAgICAgICAgIGFyZyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICB9IGVsc2UgaWYgKG1ldGhvZCA9PT0gXCJyZXR1cm5cIikge1xuICAgICAgICBjb250ZXh0LmFicnVwdChcInJldHVyblwiLCBhcmcpO1xuICAgICAgfVxuXG4gICAgICBzdGF0ZSA9IEdlblN0YXRlRXhlY3V0aW5nO1xuXG4gICAgICB0cnkge1xuICAgICAgICB2YXIgdmFsdWUgPSBpbm5lckZuLmNhbGwoc2VsZiwgY29udGV4dCk7XG5cbiAgICAgICAgLy8gSWYgYW4gZXhjZXB0aW9uIGlzIHRocm93biBmcm9tIGlubmVyRm4sIHdlIGxlYXZlIHN0YXRlID09PVxuICAgICAgICAvLyBHZW5TdGF0ZUV4ZWN1dGluZyBhbmQgbG9vcCBiYWNrIGZvciBhbm90aGVyIGludm9jYXRpb24uXG4gICAgICAgIHN0YXRlID0gY29udGV4dC5kb25lID8gR2VuU3RhdGVDb21wbGV0ZWQgOiBHZW5TdGF0ZVN1c3BlbmRlZFlpZWxkO1xuXG4gICAgICAgIGluZm8gPSB7XG4gICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgIGRvbmU6IGNvbnRleHQuZG9uZVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh2YWx1ZSA9PT0gQ29udGludWVTZW50aW5lbCkge1xuICAgICAgICAgIGlmIChjb250ZXh0LmRlbGVnYXRlICYmIG1ldGhvZCA9PT0gXCJuZXh0XCIpIHtcbiAgICAgICAgICAgIC8vIERlbGliZXJhdGVseSBmb3JnZXQgdGhlIGxhc3Qgc2VudCB2YWx1ZSBzbyB0aGF0IHdlIGRvbid0XG4gICAgICAgICAgICAvLyBhY2NpZGVudGFsbHkgcGFzcyBpdCBvbiB0byB0aGUgZGVsZWdhdGUuXG4gICAgICAgICAgICBhcmcgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBpbmZvO1xuICAgICAgICB9XG5cbiAgICAgIH0gY2F0Y2ggKHRocm93bikge1xuICAgICAgICBzdGF0ZSA9IEdlblN0YXRlQ29tcGxldGVkO1xuXG4gICAgICAgIGlmIChtZXRob2QgPT09IFwibmV4dFwiKSB7XG4gICAgICAgICAgY29udGV4dC5kaXNwYXRjaEV4Y2VwdGlvbih0aHJvd24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFyZyA9IHRocm93bjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdlbmVyYXRvci5uZXh0ID0gaW52b2tlLmJpbmQoZ2VuZXJhdG9yLCBcIm5leHRcIik7XG4gIGdlbmVyYXRvcltcInRocm93XCJdID0gaW52b2tlLmJpbmQoZ2VuZXJhdG9yLCBcInRocm93XCIpO1xuICBnZW5lcmF0b3JbXCJyZXR1cm5cIl0gPSBpbnZva2UuYmluZChnZW5lcmF0b3IsIFwicmV0dXJuXCIpO1xuXG4gIHJldHVybiBnZW5lcmF0b3I7XG59XG5cbkdwW2l0ZXJhdG9yU3ltYm9sXSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5HcC50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIFwiW29iamVjdCBHZW5lcmF0b3JdXCI7XG59O1xuXG5mdW5jdGlvbiBwdXNoVHJ5RW50cnkodHJpcGxlKSB7XG4gIHZhciBlbnRyeSA9IHsgdHJ5TG9jOiB0cmlwbGVbMF0gfTtcblxuICBpZiAoMSBpbiB0cmlwbGUpIHtcbiAgICBlbnRyeS5jYXRjaExvYyA9IHRyaXBsZVsxXTtcbiAgfVxuXG4gIGlmICgyIGluIHRyaXBsZSkge1xuICAgIGVudHJ5LmZpbmFsbHlMb2MgPSB0cmlwbGVbMl07XG4gIH1cblxuICB0aGlzLnRyeUVudHJpZXMucHVzaChlbnRyeSk7XG59XG5cbmZ1bmN0aW9uIHJlc2V0VHJ5RW50cnkoZW50cnksIGkpIHtcbiAgdmFyIHJlY29yZCA9IGVudHJ5LmNvbXBsZXRpb24gfHwge307XG4gIHJlY29yZC50eXBlID0gaSA9PT0gMCA/IFwibm9ybWFsXCIgOiBcInJldHVyblwiO1xuICBkZWxldGUgcmVjb3JkLmFyZztcbiAgZW50cnkuY29tcGxldGlvbiA9IHJlY29yZDtcbn1cblxuZnVuY3Rpb24gQ29udGV4dCh0cnlMaXN0KSB7XG4gIC8vIFRoZSByb290IGVudHJ5IG9iamVjdCAoZWZmZWN0aXZlbHkgYSB0cnkgc3RhdGVtZW50IHdpdGhvdXQgYSBjYXRjaFxuICAvLyBvciBhIGZpbmFsbHkgYmxvY2spIGdpdmVzIHVzIGEgcGxhY2UgdG8gc3RvcmUgdmFsdWVzIHRocm93biBmcm9tXG4gIC8vIGxvY2F0aW9ucyB3aGVyZSB0aGVyZSBpcyBubyBlbmNsb3NpbmcgdHJ5IHN0YXRlbWVudC5cbiAgdGhpcy50cnlFbnRyaWVzID0gW3sgdHJ5TG9jOiBcInJvb3RcIiB9XTtcbiAgdHJ5TGlzdC5mb3JFYWNoKHB1c2hUcnlFbnRyeSwgdGhpcyk7XG4gIHRoaXMucmVzZXQoKTtcbn1cblxucnVudGltZS5rZXlzID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICB2YXIga2V5cyA9IFtdO1xuICBmb3IgKHZhciBrZXkgaW4gb2JqZWN0KSB7XG4gICAga2V5cy5wdXNoKGtleSk7XG4gIH1cbiAga2V5cy5yZXZlcnNlKCk7XG5cbiAgLy8gUmF0aGVyIHRoYW4gcmV0dXJuaW5nIGFuIG9iamVjdCB3aXRoIGEgbmV4dCBtZXRob2QsIHdlIGtlZXBcbiAgLy8gdGhpbmdzIHNpbXBsZSBhbmQgcmV0dXJuIHRoZSBuZXh0IGZ1bmN0aW9uIGl0c2VsZi5cbiAgcmV0dXJuIGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgd2hpbGUgKGtleXMubGVuZ3RoKSB7XG4gICAgICB2YXIga2V5ID0ga2V5cy5wb3AoKTtcbiAgICAgIGlmIChrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgIG5leHQudmFsdWUgPSBrZXk7XG4gICAgICAgIG5leHQuZG9uZSA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gbmV4dDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUbyBhdm9pZCBjcmVhdGluZyBhbiBhZGRpdGlvbmFsIG9iamVjdCwgd2UganVzdCBoYW5nIHRoZSAudmFsdWVcbiAgICAvLyBhbmQgLmRvbmUgcHJvcGVydGllcyBvZmYgdGhlIG5leHQgZnVuY3Rpb24gb2JqZWN0IGl0c2VsZi4gVGhpc1xuICAgIC8vIGFsc28gZW5zdXJlcyB0aGF0IHRoZSBtaW5pZmllciB3aWxsIG5vdCBhbm9ueW1pemUgdGhlIGZ1bmN0aW9uLlxuICAgIG5leHQuZG9uZSA9IHRydWU7XG4gICAgcmV0dXJuIG5leHQ7XG4gIH07XG59O1xuXG5mdW5jdGlvbiB2YWx1ZXMoaXRlcmFibGUpIHtcbiAgdmFyIGl0ZXJhdG9yID0gaXRlcmFibGU7XG4gIGlmIChpdGVyYXRvclN5bWJvbCBpbiBpdGVyYWJsZSkge1xuICAgIGl0ZXJhdG9yID0gaXRlcmFibGVbaXRlcmF0b3JTeW1ib2xdKCk7XG4gIH0gZWxzZSBpZiAoIWlzTmFOKGl0ZXJhYmxlLmxlbmd0aCkpIHtcbiAgICB2YXIgaSA9IC0xO1xuICAgIGl0ZXJhdG9yID0gZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgIHdoaWxlICgrK2kgPCBpdGVyYWJsZS5sZW5ndGgpIHtcbiAgICAgICAgaWYgKGkgaW4gaXRlcmFibGUpIHtcbiAgICAgICAgICBuZXh0LnZhbHVlID0gaXRlcmFibGVbaV07XG4gICAgICAgICAgbmV4dC5kb25lID0gZmFsc2U7XG4gICAgICAgICAgcmV0dXJuIG5leHQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG5leHQuZG9uZSA9IHRydWU7XG4gICAgICByZXR1cm4gbmV4dDtcbiAgICB9O1xuICAgIGl0ZXJhdG9yLm5leHQgPSBpdGVyYXRvcjtcbiAgfVxuICByZXR1cm4gaXRlcmF0b3I7XG59XG5ydW50aW1lLnZhbHVlcyA9IHZhbHVlcztcblxuQ29udGV4dC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBDb250ZXh0LFxuXG4gIHJlc2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5wcmV2ID0gMDtcbiAgICB0aGlzLm5leHQgPSAwO1xuICAgIHRoaXMuc2VudCA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmRvbmUgPSBmYWxzZTtcbiAgICB0aGlzLmRlbGVnYXRlID0gbnVsbDtcblxuICAgIHRoaXMudHJ5RW50cmllcy5mb3JFYWNoKHJlc2V0VHJ5RW50cnkpO1xuXG4gICAgLy8gUHJlLWluaXRpYWxpemUgYXQgbGVhc3QgMjAgdGVtcG9yYXJ5IHZhcmlhYmxlcyB0byBlbmFibGUgaGlkZGVuXG4gICAgLy8gY2xhc3Mgb3B0aW1pemF0aW9ucyBmb3Igc2ltcGxlIGdlbmVyYXRvcnMuXG4gICAgZm9yICh2YXIgdGVtcEluZGV4ID0gMCwgdGVtcE5hbWU7XG4gICAgICAgICBoYXNPd24uY2FsbCh0aGlzLCB0ZW1wTmFtZSA9IFwidFwiICsgdGVtcEluZGV4KSB8fCB0ZW1wSW5kZXggPCAyMDtcbiAgICAgICAgICsrdGVtcEluZGV4KSB7XG4gICAgICB0aGlzW3RlbXBOYW1lXSA9IG51bGw7XG4gICAgfVxuICB9LFxuXG4gIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRvbmUgPSB0cnVlO1xuXG4gICAgdmFyIHJvb3RFbnRyeSA9IHRoaXMudHJ5RW50cmllc1swXTtcbiAgICB2YXIgcm9vdFJlY29yZCA9IHJvb3RFbnRyeS5jb21wbGV0aW9uO1xuICAgIGlmIChyb290UmVjb3JkLnR5cGUgPT09IFwidGhyb3dcIikge1xuICAgICAgdGhyb3cgcm9vdFJlY29yZC5hcmc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucnZhbDtcbiAgfSxcblxuICBkaXNwYXRjaEV4Y2VwdGlvbjogZnVuY3Rpb24gKGV4Y2VwdGlvbikge1xuICAgIGlmICh0aGlzLmRvbmUpIHtcbiAgICAgIHRocm93IGV4Y2VwdGlvbjtcbiAgICB9XG5cbiAgICB2YXIgY29udGV4dCA9IHRoaXM7XG4gICAgZnVuY3Rpb24gaGFuZGxlKGxvYywgY2F1Z2h0KSB7XG4gICAgICByZWNvcmQudHlwZSA9IFwidGhyb3dcIjtcbiAgICAgIHJlY29yZC5hcmcgPSBleGNlcHRpb247XG4gICAgICBjb250ZXh0Lm5leHQgPSBsb2M7XG4gICAgICByZXR1cm4gISFjYXVnaHQ7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IHRoaXMudHJ5RW50cmllcy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgdmFyIGVudHJ5ID0gdGhpcy50cnlFbnRyaWVzW2ldO1xuICAgICAgdmFyIHJlY29yZCA9IGVudHJ5LmNvbXBsZXRpb247XG5cbiAgICAgIGlmIChlbnRyeS50cnlMb2MgPT09IFwicm9vdFwiKSB7XG4gICAgICAgIC8vIEV4Y2VwdGlvbiB0aHJvd24gb3V0c2lkZSBvZiBhbnkgdHJ5IGJsb2NrIHRoYXQgY291bGQgaGFuZGxlXG4gICAgICAgIC8vIGl0LCBzbyBzZXQgdGhlIGNvbXBsZXRpb24gdmFsdWUgb2YgdGhlIGVudGlyZSBmdW5jdGlvbiB0b1xuICAgICAgICAvLyB0aHJvdyB0aGUgZXhjZXB0aW9uLlxuICAgICAgICByZXR1cm4gaGFuZGxlKFwiZW5kXCIpO1xuICAgICAgfVxuXG4gICAgICBpZiAoZW50cnkudHJ5TG9jIDw9IHRoaXMucHJldikge1xuICAgICAgICB2YXIgaGFzQ2F0Y2ggPSBoYXNPd24uY2FsbChlbnRyeSwgXCJjYXRjaExvY1wiKTtcbiAgICAgICAgdmFyIGhhc0ZpbmFsbHkgPSBoYXNPd24uY2FsbChlbnRyeSwgXCJmaW5hbGx5TG9jXCIpO1xuXG4gICAgICAgIGlmIChoYXNDYXRjaCAmJiBoYXNGaW5hbGx5KSB7XG4gICAgICAgICAgaWYgKHRoaXMucHJldiA8IGVudHJ5LmNhdGNoTG9jKSB7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlKGVudHJ5LmNhdGNoTG9jLCB0cnVlKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMucHJldiA8IGVudHJ5LmZpbmFsbHlMb2MpIHtcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGUoZW50cnkuZmluYWxseUxvYyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAoaGFzQ2F0Y2gpIHtcbiAgICAgICAgICBpZiAodGhpcy5wcmV2IDwgZW50cnkuY2F0Y2hMb2MpIHtcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGUoZW50cnkuY2F0Y2hMb2MsIHRydWUpO1xuICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2UgaWYgKGhhc0ZpbmFsbHkpIHtcbiAgICAgICAgICBpZiAodGhpcy5wcmV2IDwgZW50cnkuZmluYWxseUxvYykge1xuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZShlbnRyeS5maW5hbGx5TG9jKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0cnkgc3RhdGVtZW50IHdpdGhvdXQgY2F0Y2ggb3IgZmluYWxseVwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBfZmluZEZpbmFsbHlFbnRyeTogZnVuY3Rpb24gKGZpbmFsbHlMb2MpIHtcbiAgICBmb3IgKHZhciBpID0gdGhpcy50cnlFbnRyaWVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICB2YXIgZW50cnkgPSB0aGlzLnRyeUVudHJpZXNbaV07XG4gICAgICBpZiAoZW50cnkudHJ5TG9jIDw9IHRoaXMucHJldiAmJlxuICAgICAgICAgIGhhc093bi5jYWxsKGVudHJ5LCBcImZpbmFsbHlMb2NcIikgJiYgKFxuICAgICAgICAgICAgZW50cnkuZmluYWxseUxvYyA9PT0gZmluYWxseUxvYyB8fFxuICAgICAgICAgICAgdGhpcy5wcmV2IDwgZW50cnkuZmluYWxseUxvYykpIHtcbiAgICAgICAgcmV0dXJuIGVudHJ5O1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBhYnJ1cHQ6IGZ1bmN0aW9uICh0eXBlLCBhcmcpIHtcbiAgICB2YXIgZW50cnkgPSB0aGlzLl9maW5kRmluYWxseUVudHJ5KCk7XG4gICAgdmFyIHJlY29yZCA9IGVudHJ5ID8gZW50cnkuY29tcGxldGlvbiA6IHt9O1xuXG4gICAgcmVjb3JkLnR5cGUgPSB0eXBlO1xuICAgIHJlY29yZC5hcmcgPSBhcmc7XG5cbiAgICBpZiAoZW50cnkpIHtcbiAgICAgIHRoaXMubmV4dCA9IGVudHJ5LmZpbmFsbHlMb2M7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29tcGxldGUocmVjb3JkKTtcbiAgICB9XG5cbiAgICByZXR1cm4gQ29udGludWVTZW50aW5lbDtcbiAgfSxcblxuICBjb21wbGV0ZTogZnVuY3Rpb24gKHJlY29yZCkge1xuICAgIGlmIChyZWNvcmQudHlwZSA9PT0gXCJ0aHJvd1wiKSB7XG4gICAgICB0aHJvdyByZWNvcmQuYXJnO1xuICAgIH1cblxuICAgIGlmIChyZWNvcmQudHlwZSA9PT0gXCJicmVha1wiIHx8IHJlY29yZC50eXBlID09PSBcImNvbnRpbnVlXCIpIHtcbiAgICAgIHRoaXMubmV4dCA9IHJlY29yZC5hcmc7XG4gICAgfSBlbHNlIGlmIChyZWNvcmQudHlwZSA9PT0gXCJyZXR1cm5cIikge1xuICAgICAgdGhpcy5ydmFsID0gcmVjb3JkLmFyZztcbiAgICAgIHRoaXMubmV4dCA9IFwiZW5kXCI7XG4gICAgfVxuXG4gICAgcmV0dXJuIENvbnRpbnVlU2VudGluZWw7XG4gIH0sXG5cbiAgZmluaXNoOiBmdW5jdGlvbiAoZmluYWxseUxvYykge1xuICAgIHZhciBlbnRyeSA9IHRoaXMuX2ZpbmRGaW5hbGx5RW50cnkoZmluYWxseUxvYyk7XG4gICAgcmV0dXJuIHRoaXMuY29tcGxldGUoZW50cnkuY29tcGxldGlvbik7XG4gIH0sXG5cbiAgXCJjYXRjaFwiOiBmdW5jdGlvbiAodHJ5TG9jKSB7XG4gICAgZm9yICh2YXIgaSA9IHRoaXMudHJ5RW50cmllcy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgdmFyIGVudHJ5ID0gdGhpcy50cnlFbnRyaWVzW2ldO1xuICAgICAgaWYgKGVudHJ5LnRyeUxvYyA9PT0gdHJ5TG9jKSB7XG4gICAgICAgIHZhciByZWNvcmQgPSBlbnRyeS5jb21wbGV0aW9uO1xuICAgICAgICB2YXIgdGhyb3duO1xuICAgICAgICBpZiAocmVjb3JkLnR5cGUgPT09IFwidGhyb3dcIikge1xuICAgICAgICAgIHRocm93biA9IHJlY29yZC5hcmc7XG4gICAgICAgICAgcmVzZXRUcnlFbnRyeShlbnRyeSwgaSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRocm93bjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUaGUgY29udGV4dC5jYXRjaCBtZXRob2QgbXVzdCBvbmx5IGJlIGNhbGxlZCB3aXRoIGEgbG9jYXRpb25cbiAgICAvLyBhcmd1bWVudCB0aGF0IGNvcnJlc3BvbmRzIHRvIGEga25vd24gY2F0Y2ggYmxvY2suXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiaWxsZWdhbCBjYXRjaCBhdHRlbXB0XCIpO1xuICB9LFxuXG4gIGRlbGVnYXRlWWllbGQ6IGZ1bmN0aW9uIChpdGVyYWJsZSwgcmVzdWx0TmFtZSwgbmV4dExvYykge1xuICAgIHRoaXMuZGVsZWdhdGUgPSB7XG4gICAgICBpdGVyYXRvcjogdmFsdWVzKGl0ZXJhYmxlKSxcbiAgICAgIHJlc3VsdE5hbWU6IHJlc3VsdE5hbWUsXG4gICAgICBuZXh0TG9jOiBuZXh0TG9jXG4gICAgfTtcblxuICAgIHJldHVybiBDb250aW51ZVNlbnRpbmVsO1xuICB9XG59O1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuIC8qIVxuICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9wYXVsbWlsbHIvZXM2LXNoaW1cbiAgKiBAbGljZW5zZSBlczYtc2hpbSBDb3B5cmlnaHQgMjAxMy0yMDE0IGJ5IFBhdWwgTWlsbGVyIChodHRwOi8vcGF1bG1pbGxyLmNvbSlcbiAgKiAgIGFuZCBjb250cmlidXRvcnMsICBNSVQgTGljZW5zZVxuICAqIGVzNi1zaGltOiB2MC4yMS4wXG4gICogc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9wYXVsbWlsbHIvZXM2LXNoaW0vYmxvYi9tYXN0ZXIvTElDRU5TRVxuICAqIERldGFpbHMgYW5kIGRvY3VtZW50YXRpb246XG4gICogaHR0cHM6Ly9naXRodWIuY29tL3BhdWxtaWxsci9lczYtc2hpbS9cbiAgKi9cblxuLy8gVU1EIChVbml2ZXJzYWwgTW9kdWxlIERlZmluaXRpb24pXG4vLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3VtZGpzL3VtZC9ibG9iL21hc3Rlci9yZXR1cm5FeHBvcnRzLmpzXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgLy8gTm9kZS4gRG9lcyBub3Qgd29yayB3aXRoIHN0cmljdCBDb21tb25KUywgYnV0XG4gICAgLy8gb25seSBDb21tb25KUy1saWtlIGVudmlyb21lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cyxcbiAgICAvLyBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICByb290LnJldHVybkV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIGlzQ2FsbGFibGVXaXRob3V0TmV3ID0gZnVuY3Rpb24gKGZ1bmMpIHtcbiAgICB0cnkgeyBmdW5jKCk7IH1cbiAgICBjYXRjaCAoZSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICB2YXIgc3VwcG9ydHNTdWJjbGFzc2luZyA9IGZ1bmN0aW9uIChDLCBmKSB7XG4gICAgLyoganNoaW50IHByb3RvOnRydWUgKi9cbiAgICB0cnkge1xuICAgICAgdmFyIFN1YiA9IGZ1bmN0aW9uICgpIHsgQy5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyB9O1xuICAgICAgaWYgKCFTdWIuX19wcm90b19fKSB7IHJldHVybiBmYWxzZTsgLyogc2tpcCB0ZXN0IG9uIElFIDwgMTEgKi8gfVxuICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKFN1YiwgQyk7XG4gICAgICBTdWIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShDLnByb3RvdHlwZSwge1xuICAgICAgICBjb25zdHJ1Y3RvcjogeyB2YWx1ZTogQyB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBmKFN1Yik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfTtcblxuICB2YXIgYXJlUHJvcGVydHlEZXNjcmlwdG9yc1N1cHBvcnRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHt9LCAneCcsIHt9KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHsgLyogdGhpcyBpcyBJRSA4LiAqL1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfTtcblxuICB2YXIgc3RhcnRzV2l0aFJlamVjdHNSZWdleCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmVqZWN0c1JlZ2V4ID0gZmFsc2U7XG4gICAgaWYgKFN0cmluZy5wcm90b3R5cGUuc3RhcnRzV2l0aCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgJy9hLycuc3RhcnRzV2l0aCgvYS8pO1xuICAgICAgfSBjYXRjaCAoZSkgeyAvKiB0aGlzIGlzIHNwZWMgY29tcGxpYW50ICovXG4gICAgICAgIHJlamVjdHNSZWdleCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZWplY3RzUmVnZXg7XG4gIH07XG5cbiAgLypqc2hpbnQgZXZpbDogdHJ1ZSAqL1xuICB2YXIgZ2V0R2xvYmFsID0gbmV3IEZ1bmN0aW9uKCdyZXR1cm4gdGhpczsnKTtcbiAgLypqc2hpbnQgZXZpbDogZmFsc2UgKi9cblxuICB2YXIgZ2xvYmFscyA9IGdldEdsb2JhbCgpO1xuICB2YXIgZ2xvYmFsX2lzRmluaXRlID0gZ2xvYmFscy5pc0Zpbml0ZTtcbiAgdmFyIHN1cHBvcnRzRGVzY3JpcHRvcnMgPSAhIU9iamVjdC5kZWZpbmVQcm9wZXJ0eSAmJiBhcmVQcm9wZXJ0eURlc2NyaXB0b3JzU3VwcG9ydGVkKCk7XG4gIHZhciBzdGFydHNXaXRoSXNDb21wbGlhbnQgPSBzdGFydHNXaXRoUmVqZWN0c1JlZ2V4KCk7XG4gIHZhciBfc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG4gIHZhciBfaW5kZXhPZiA9IFN0cmluZy5wcm90b3R5cGUuaW5kZXhPZjtcbiAgdmFyIF90b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG4gIHZhciBfaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuICB2YXIgQXJyYXlJdGVyYXRvcjsgLy8gbWFrZSBvdXIgaW1wbGVtZW50YXRpb24gcHJpdmF0ZVxuXG4gIHZhciBkZWZpbmVQcm9wZXJ0eSA9IGZ1bmN0aW9uIChvYmplY3QsIG5hbWUsIHZhbHVlLCBmb3JjZSkge1xuICAgIGlmICghZm9yY2UgJiYgbmFtZSBpbiBvYmplY3QpIHsgcmV0dXJuOyB9XG4gICAgaWYgKHN1cHBvcnRzRGVzY3JpcHRvcnMpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIG5hbWUsIHtcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIHZhbHVlOiB2YWx1ZVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9iamVjdFtuYW1lXSA9IHZhbHVlO1xuICAgIH1cbiAgfTtcblxuICAvLyBEZWZpbmUgY29uZmlndXJhYmxlLCB3cml0YWJsZSBhbmQgbm9uLWVudW1lcmFibGUgcHJvcHNcbiAgLy8gaWYgdGhleSBkb27igJl0IGV4aXN0LlxuICB2YXIgZGVmaW5lUHJvcGVydGllcyA9IGZ1bmN0aW9uIChvYmplY3QsIG1hcCkge1xuICAgIE9iamVjdC5rZXlzKG1hcCkuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xuICAgICAgdmFyIG1ldGhvZCA9IG1hcFtuYW1lXTtcbiAgICAgIGRlZmluZVByb3BlcnR5KG9iamVjdCwgbmFtZSwgbWV0aG9kLCBmYWxzZSk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gU2ltcGxlIHNoaW0gZm9yIE9iamVjdC5jcmVhdGUgb24gRVMzIGJyb3dzZXJzXG4gIC8vICh1bmxpa2UgcmVhbCBzaGltLCBubyBhdHRlbXB0IHRvIHN1cHBvcnQgYHByb3RvdHlwZSA9PT0gbnVsbGApXG4gIHZhciBjcmVhdGUgPSBPYmplY3QuY3JlYXRlIHx8IGZ1bmN0aW9uIChwcm90b3R5cGUsIHByb3BlcnRpZXMpIHtcbiAgICBmdW5jdGlvbiBUeXBlKCkge31cbiAgICBUeXBlLnByb3RvdHlwZSA9IHByb3RvdHlwZTtcbiAgICB2YXIgb2JqZWN0ID0gbmV3IFR5cGUoKTtcbiAgICBpZiAodHlwZW9mIHByb3BlcnRpZXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBkZWZpbmVQcm9wZXJ0aWVzKG9iamVjdCwgcHJvcGVydGllcyk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3Q7XG4gIH07XG5cbiAgLy8gVGhpcyBpcyBhIHByaXZhdGUgbmFtZSBpbiB0aGUgZXM2IHNwZWMsIGVxdWFsIHRvICdbU3ltYm9sLml0ZXJhdG9yXSdcbiAgLy8gd2UncmUgZ29pbmcgdG8gdXNlIGFuIGFyYml0cmFyeSBfLXByZWZpeGVkIG5hbWUgdG8gbWFrZSBvdXIgc2hpbXNcbiAgLy8gd29yayBwcm9wZXJseSB3aXRoIGVhY2ggb3RoZXIsIGV2ZW4gdGhvdWdoIHdlIGRvbid0IGhhdmUgZnVsbCBJdGVyYXRvclxuICAvLyBzdXBwb3J0LiAgVGhhdCBpcywgYEFycmF5LmZyb20obWFwLmtleXMoKSlgIHdpbGwgd29yaywgYnV0IHdlIGRvbid0XG4gIC8vIHByZXRlbmQgdG8gZXhwb3J0IGEgXCJyZWFsXCIgSXRlcmF0b3IgaW50ZXJmYWNlLlxuICB2YXIgJGl0ZXJhdG9yJCA9ICh0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmIFN5bWJvbC5pdGVyYXRvcikgfHwgJ19lczYtc2hpbSBpdGVyYXRvcl8nO1xuICAvLyBGaXJlZm94IHNoaXBzIGEgcGFydGlhbCBpbXBsZW1lbnRhdGlvbiB1c2luZyB0aGUgbmFtZSBAQGl0ZXJhdG9yLlxuICAvLyBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD05MDcwNzcjYzE0XG4gIC8vIFNvIHVzZSB0aGF0IG5hbWUgaWYgd2UgZGV0ZWN0IGl0LlxuICBpZiAoZ2xvYmFscy5TZXQgJiYgdHlwZW9mIG5ldyBnbG9iYWxzLlNldCgpWydAQGl0ZXJhdG9yJ10gPT09ICdmdW5jdGlvbicpIHtcbiAgICAkaXRlcmF0b3IkID0gJ0BAaXRlcmF0b3InO1xuICB9XG4gIHZhciBhZGRJdGVyYXRvciA9IGZ1bmN0aW9uIChwcm90b3R5cGUsIGltcGwpIHtcbiAgICBpZiAoIWltcGwpIHsgaW1wbCA9IGZ1bmN0aW9uIGl0ZXJhdG9yKCkgeyByZXR1cm4gdGhpczsgfTsgfVxuICAgIHZhciBvID0ge307XG4gICAgb1skaXRlcmF0b3IkXSA9IGltcGw7XG4gICAgZGVmaW5lUHJvcGVydGllcyhwcm90b3R5cGUsIG8pO1xuICAgIC8qIGpzaGludCBub3R5cGVvZjogdHJ1ZSAqL1xuICAgIGlmICghcHJvdG90eXBlWyRpdGVyYXRvciRdICYmIHR5cGVvZiAkaXRlcmF0b3IkID09PSAnc3ltYm9sJykge1xuICAgICAgLy8gaW1wbGVtZW50YXRpb25zIGFyZSBidWdneSB3aGVuICRpdGVyYXRvciQgaXMgYSBTeW1ib2xcbiAgICAgIHByb3RvdHlwZVskaXRlcmF0b3IkXSA9IGltcGw7XG4gICAgfVxuICB9O1xuXG4gIC8vIHRha2VuIGRpcmVjdGx5IGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2xqaGFyYi9pcy1hcmd1bWVudHMvYmxvYi9tYXN0ZXIvaW5kZXguanNcbiAgLy8gY2FuIGJlIHJlcGxhY2VkIHdpdGggcmVxdWlyZSgnaXMtYXJndW1lbnRzJykgaWYgd2UgZXZlciB1c2UgYSBidWlsZCBwcm9jZXNzIGluc3RlYWRcbiAgdmFyIGlzQXJndW1lbnRzID0gZnVuY3Rpb24gaXNBcmd1bWVudHModmFsdWUpIHtcbiAgICB2YXIgc3RyID0gX3RvU3RyaW5nLmNhbGwodmFsdWUpO1xuICAgIHZhciByZXN1bHQgPSBzdHIgPT09ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xuICAgIGlmICghcmVzdWx0KSB7XG4gICAgICByZXN1bHQgPSBzdHIgIT09ICdbb2JqZWN0IEFycmF5XScgJiZcbiAgICAgICAgdmFsdWUgIT09IG51bGwgJiZcbiAgICAgICAgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJlxuICAgICAgICB0eXBlb2YgdmFsdWUubGVuZ3RoID09PSAnbnVtYmVyJyAmJlxuICAgICAgICB2YWx1ZS5sZW5ndGggPj0gMCAmJlxuICAgICAgICBfdG9TdHJpbmcuY2FsbCh2YWx1ZS5jYWxsZWUpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIHZhciBlbXVsYXRlRVM2Y29uc3RydWN0ID0gZnVuY3Rpb24gKG8pIHtcbiAgICBpZiAoIUVTLlR5cGVJc09iamVjdChvKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKCdiYWQgb2JqZWN0Jyk7IH1cbiAgICAvLyBlczUgYXBwcm94aW1hdGlvbiB0byBlczYgc3ViY2xhc3Mgc2VtYW50aWNzOiBpbiBlczYsICduZXcgRm9vJ1xuICAgIC8vIHdvdWxkIGludm9rZSBGb28uQEBjcmVhdGUgdG8gYWxsb2NhdGlvbi9pbml0aWFsaXplIHRoZSBuZXcgb2JqZWN0LlxuICAgIC8vIEluIGVzNSB3ZSBqdXN0IGdldCB0aGUgcGxhaW4gb2JqZWN0LiAgU28gaWYgd2UgZGV0ZWN0IGFuXG4gICAgLy8gdW5pbml0aWFsaXplZCBvYmplY3QsIGludm9rZSBvLmNvbnN0cnVjdG9yLkBAY3JlYXRlXG4gICAgaWYgKCFvLl9lczZjb25zdHJ1Y3QpIHtcbiAgICAgIGlmIChvLmNvbnN0cnVjdG9yICYmIEVTLklzQ2FsbGFibGUoby5jb25zdHJ1Y3RvclsnQEBjcmVhdGUnXSkpIHtcbiAgICAgICAgbyA9IG8uY29uc3RydWN0b3JbJ0BAY3JlYXRlJ10obyk7XG4gICAgICB9XG4gICAgICBkZWZpbmVQcm9wZXJ0aWVzKG8sIHsgX2VzNmNvbnN0cnVjdDogdHJ1ZSB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG87XG4gIH07XG5cbiAgdmFyIEVTID0ge1xuICAgIENoZWNrT2JqZWN0Q29lcmNpYmxlOiBmdW5jdGlvbiAoeCwgb3B0TWVzc2FnZSkge1xuICAgICAgLyoganNoaW50IGVxbnVsbDp0cnVlICovXG4gICAgICBpZiAoeCA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3Iob3B0TWVzc2FnZSB8fCAnQ2Fubm90IGNhbGwgbWV0aG9kIG9uICcgKyB4KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB4O1xuICAgIH0sXG5cbiAgICBUeXBlSXNPYmplY3Q6IGZ1bmN0aW9uICh4KSB7XG4gICAgICAvKiBqc2hpbnQgZXFudWxsOnRydWUgKi9cbiAgICAgIC8vIHRoaXMgaXMgZXhwZW5zaXZlIHdoZW4gaXQgcmV0dXJucyBmYWxzZTsgdXNlIHRoaXMgZnVuY3Rpb25cbiAgICAgIC8vIHdoZW4geW91IGV4cGVjdCBpdCB0byByZXR1cm4gdHJ1ZSBpbiB0aGUgY29tbW9uIGNhc2UuXG4gICAgICByZXR1cm4geCAhPSBudWxsICYmIE9iamVjdCh4KSA9PT0geDtcbiAgICB9LFxuXG4gICAgVG9PYmplY3Q6IGZ1bmN0aW9uIChvLCBvcHRNZXNzYWdlKSB7XG4gICAgICByZXR1cm4gT2JqZWN0KEVTLkNoZWNrT2JqZWN0Q29lcmNpYmxlKG8sIG9wdE1lc3NhZ2UpKTtcbiAgICB9LFxuXG4gICAgSXNDYWxsYWJsZTogZnVuY3Rpb24gKHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgICAvLyBzb21lIHZlcnNpb25zIG9mIElFIHNheSB0aGF0IHR5cGVvZiAvYWJjLyA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgICBfdG9TdHJpbmcuY2FsbCh4KSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbiAgICB9LFxuXG4gICAgVG9JbnQzMjogZnVuY3Rpb24gKHgpIHtcbiAgICAgIHJldHVybiB4ID4+IDA7XG4gICAgfSxcblxuICAgIFRvVWludDMyOiBmdW5jdGlvbiAoeCkge1xuICAgICAgcmV0dXJuIHggPj4+IDA7XG4gICAgfSxcblxuICAgIFRvSW50ZWdlcjogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB2YXIgbnVtYmVyID0gK3ZhbHVlO1xuICAgICAgaWYgKE51bWJlci5pc05hTihudW1iZXIpKSB7IHJldHVybiAwOyB9XG4gICAgICBpZiAobnVtYmVyID09PSAwIHx8ICFOdW1iZXIuaXNGaW5pdGUobnVtYmVyKSkgeyByZXR1cm4gbnVtYmVyOyB9XG4gICAgICByZXR1cm4gKG51bWJlciA+IDAgPyAxIDogLTEpICogTWF0aC5mbG9vcihNYXRoLmFicyhudW1iZXIpKTtcbiAgICB9LFxuXG4gICAgVG9MZW5ndGg6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgdmFyIGxlbiA9IEVTLlRvSW50ZWdlcih2YWx1ZSk7XG4gICAgICBpZiAobGVuIDw9IDApIHsgcmV0dXJuIDA7IH0gLy8gaW5jbHVkZXMgY29udmVydGluZyAtMCB0byArMFxuICAgICAgaWYgKGxlbiA+IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSKSB7IHJldHVybiBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUjsgfVxuICAgICAgcmV0dXJuIGxlbjtcbiAgICB9LFxuXG4gICAgU2FtZVZhbHVlOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgaWYgKGEgPT09IGIpIHtcbiAgICAgICAgLy8gMCA9PT0gLTAsIGJ1dCB0aGV5IGFyZSBub3QgaWRlbnRpY2FsLlxuICAgICAgICBpZiAoYSA9PT0gMCkgeyByZXR1cm4gMSAvIGEgPT09IDEgLyBiOyB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIE51bWJlci5pc05hTihhKSAmJiBOdW1iZXIuaXNOYU4oYik7XG4gICAgfSxcblxuICAgIFNhbWVWYWx1ZVplcm86IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAvLyBzYW1lIGFzIFNhbWVWYWx1ZSBleGNlcHQgZm9yIFNhbWVWYWx1ZVplcm8oKzAsIC0wKSA9PSB0cnVlXG4gICAgICByZXR1cm4gKGEgPT09IGIpIHx8IChOdW1iZXIuaXNOYU4oYSkgJiYgTnVtYmVyLmlzTmFOKGIpKTtcbiAgICB9LFxuXG4gICAgSXNJdGVyYWJsZTogZnVuY3Rpb24gKG8pIHtcbiAgICAgIHJldHVybiBFUy5UeXBlSXNPYmplY3QobykgJiZcbiAgICAgICAgKHR5cGVvZiBvWyRpdGVyYXRvciRdICE9PSAndW5kZWZpbmVkJyB8fCBpc0FyZ3VtZW50cyhvKSk7XG4gICAgfSxcblxuICAgIEdldEl0ZXJhdG9yOiBmdW5jdGlvbiAobykge1xuICAgICAgaWYgKGlzQXJndW1lbnRzKG8pKSB7XG4gICAgICAgIC8vIHNwZWNpYWwgY2FzZSBzdXBwb3J0IGZvciBgYXJndW1lbnRzYFxuICAgICAgICByZXR1cm4gbmV3IEFycmF5SXRlcmF0b3IobywgJ3ZhbHVlJyk7XG4gICAgICB9XG4gICAgICB2YXIgaXRGbiA9IG9bJGl0ZXJhdG9yJF07XG4gICAgICBpZiAoIUVTLklzQ2FsbGFibGUoaXRGbikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsdWUgaXMgbm90IGFuIGl0ZXJhYmxlJyk7XG4gICAgICB9XG4gICAgICB2YXIgaXQgPSBpdEZuLmNhbGwobyk7XG4gICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChpdCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYmFkIGl0ZXJhdG9yJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gaXQ7XG4gICAgfSxcblxuICAgIEl0ZXJhdG9yTmV4dDogZnVuY3Rpb24gKGl0KSB7XG4gICAgICB2YXIgcmVzdWx0ID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBpdC5uZXh0KGFyZ3VtZW50c1sxXSkgOiBpdC5uZXh0KCk7XG4gICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChyZXN1bHQpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2JhZCBpdGVyYXRvcicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgQ29uc3RydWN0OiBmdW5jdGlvbiAoQywgYXJncykge1xuICAgICAgLy8gQ3JlYXRlRnJvbUNvbnN0cnVjdG9yXG4gICAgICB2YXIgb2JqO1xuICAgICAgaWYgKEVTLklzQ2FsbGFibGUoQ1snQEBjcmVhdGUnXSkpIHtcbiAgICAgICAgb2JqID0gQ1snQEBjcmVhdGUnXSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gT3JkaW5hcnlDcmVhdGVGcm9tQ29uc3RydWN0b3JcbiAgICAgICAgb2JqID0gY3JlYXRlKEMucHJvdG90eXBlIHx8IG51bGwpO1xuICAgICAgfVxuICAgICAgLy8gTWFyayB0aGF0IHdlJ3ZlIHVzZWQgdGhlIGVzNiBjb25zdHJ1Y3QgcGF0aFxuICAgICAgLy8gKHNlZSBlbXVsYXRlRVM2Y29uc3RydWN0KVxuICAgICAgZGVmaW5lUHJvcGVydGllcyhvYmosIHsgX2VzNmNvbnN0cnVjdDogdHJ1ZSB9KTtcbiAgICAgIC8vIENhbGwgdGhlIGNvbnN0cnVjdG9yLlxuICAgICAgdmFyIHJlc3VsdCA9IEMuYXBwbHkob2JqLCBhcmdzKTtcbiAgICAgIHJldHVybiBFUy5UeXBlSXNPYmplY3QocmVzdWx0KSA/IHJlc3VsdCA6IG9iajtcbiAgICB9XG4gIH07XG5cbiAgdmFyIG51bWJlckNvbnZlcnNpb24gPSAoZnVuY3Rpb24gKCkge1xuICAgIC8vIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2luZXhvcmFibGV0YXNoL3BvbHlmaWxsL2Jsb2IvbWFzdGVyL3R5cGVkYXJyYXkuanMjTDE3Ni1MMjY2XG4gICAgLy8gd2l0aCBwZXJtaXNzaW9uIGFuZCBsaWNlbnNlLCBwZXIgaHR0cHM6Ly90d2l0dGVyLmNvbS9pbmV4b3JhYmxldGFzaC9zdGF0dXMvMzcyMjA2NTA5NTQwNjU5MjAwXG5cbiAgICBmdW5jdGlvbiByb3VuZFRvRXZlbihuKSB7XG4gICAgICB2YXIgdyA9IE1hdGguZmxvb3IobiksIGYgPSBuIC0gdztcbiAgICAgIGlmIChmIDwgMC41KSB7XG4gICAgICAgIHJldHVybiB3O1xuICAgICAgfVxuICAgICAgaWYgKGYgPiAwLjUpIHtcbiAgICAgICAgcmV0dXJuIHcgKyAxO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHcgJSAyID8gdyArIDEgOiB3O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhY2tJRUVFNzU0KHYsIGViaXRzLCBmYml0cykge1xuICAgICAgdmFyIGJpYXMgPSAoMSA8PCAoZWJpdHMgLSAxKSkgLSAxLFxuICAgICAgICBzLCBlLCBmLFxuICAgICAgICBpLCBiaXRzLCBzdHIsIGJ5dGVzO1xuXG4gICAgICAvLyBDb21wdXRlIHNpZ24sIGV4cG9uZW50LCBmcmFjdGlvblxuICAgICAgaWYgKHYgIT09IHYpIHtcbiAgICAgICAgLy8gTmFOXG4gICAgICAgIC8vIGh0dHA6Ly9kZXYudzMub3JnLzIwMDYvd2ViYXBpL1dlYklETC8jZXMtdHlwZS1tYXBwaW5nXG4gICAgICAgIGUgPSAoMSA8PCBlYml0cykgLSAxO1xuICAgICAgICBmID0gTWF0aC5wb3coMiwgZmJpdHMgLSAxKTtcbiAgICAgICAgcyA9IDA7XG4gICAgICB9IGVsc2UgaWYgKHYgPT09IEluZmluaXR5IHx8IHYgPT09IC1JbmZpbml0eSkge1xuICAgICAgICBlID0gKDEgPDwgZWJpdHMpIC0gMTtcbiAgICAgICAgZiA9IDA7XG4gICAgICAgIHMgPSAodiA8IDApID8gMSA6IDA7XG4gICAgICB9IGVsc2UgaWYgKHYgPT09IDApIHtcbiAgICAgICAgZSA9IDA7XG4gICAgICAgIGYgPSAwO1xuICAgICAgICBzID0gKDEgLyB2ID09PSAtSW5maW5pdHkpID8gMSA6IDA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzID0gdiA8IDA7XG4gICAgICAgIHYgPSBNYXRoLmFicyh2KTtcblxuICAgICAgICBpZiAodiA+PSBNYXRoLnBvdygyLCAxIC0gYmlhcykpIHtcbiAgICAgICAgICBlID0gTWF0aC5taW4oTWF0aC5mbG9vcihNYXRoLmxvZyh2KSAvIE1hdGguTE4yKSwgMTAyMyk7XG4gICAgICAgICAgZiA9IHJvdW5kVG9FdmVuKHYgLyBNYXRoLnBvdygyLCBlKSAqIE1hdGgucG93KDIsIGZiaXRzKSk7XG4gICAgICAgICAgaWYgKGYgLyBNYXRoLnBvdygyLCBmYml0cykgPj0gMikge1xuICAgICAgICAgICAgZSA9IGUgKyAxO1xuICAgICAgICAgICAgZiA9IDE7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChlID4gYmlhcykge1xuICAgICAgICAgICAgLy8gT3ZlcmZsb3dcbiAgICAgICAgICAgIGUgPSAoMSA8PCBlYml0cykgLSAxO1xuICAgICAgICAgICAgZiA9IDA7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE5vcm1hbFxuICAgICAgICAgICAgZSA9IGUgKyBiaWFzO1xuICAgICAgICAgICAgZiA9IGYgLSBNYXRoLnBvdygyLCBmYml0cyk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFN1Ym5vcm1hbFxuICAgICAgICAgIGUgPSAwO1xuICAgICAgICAgIGYgPSByb3VuZFRvRXZlbih2IC8gTWF0aC5wb3coMiwgMSAtIGJpYXMgLSBmYml0cykpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFBhY2sgc2lnbiwgZXhwb25lbnQsIGZyYWN0aW9uXG4gICAgICBiaXRzID0gW107XG4gICAgICBmb3IgKGkgPSBmYml0czsgaTsgaSAtPSAxKSB7XG4gICAgICAgIGJpdHMucHVzaChmICUgMiA/IDEgOiAwKTtcbiAgICAgICAgZiA9IE1hdGguZmxvb3IoZiAvIDIpO1xuICAgICAgfVxuICAgICAgZm9yIChpID0gZWJpdHM7IGk7IGkgLT0gMSkge1xuICAgICAgICBiaXRzLnB1c2goZSAlIDIgPyAxIDogMCk7XG4gICAgICAgIGUgPSBNYXRoLmZsb29yKGUgLyAyKTtcbiAgICAgIH1cbiAgICAgIGJpdHMucHVzaChzID8gMSA6IDApO1xuICAgICAgYml0cy5yZXZlcnNlKCk7XG4gICAgICBzdHIgPSBiaXRzLmpvaW4oJycpO1xuXG4gICAgICAvLyBCaXRzIHRvIGJ5dGVzXG4gICAgICBieXRlcyA9IFtdO1xuICAgICAgd2hpbGUgKHN0ci5sZW5ndGgpIHtcbiAgICAgICAgYnl0ZXMucHVzaChwYXJzZUludChzdHIuc2xpY2UoMCwgOCksIDIpKTtcbiAgICAgICAgc3RyID0gc3RyLnNsaWNlKDgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGJ5dGVzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVucGFja0lFRUU3NTQoYnl0ZXMsIGViaXRzLCBmYml0cykge1xuICAgICAgLy8gQnl0ZXMgdG8gYml0c1xuICAgICAgdmFyIGJpdHMgPSBbXSwgaSwgaiwgYiwgc3RyLFxuICAgICAgICAgIGJpYXMsIHMsIGUsIGY7XG5cbiAgICAgIGZvciAoaSA9IGJ5dGVzLmxlbmd0aDsgaTsgaSAtPSAxKSB7XG4gICAgICAgIGIgPSBieXRlc1tpIC0gMV07XG4gICAgICAgIGZvciAoaiA9IDg7IGo7IGogLT0gMSkge1xuICAgICAgICAgIGJpdHMucHVzaChiICUgMiA/IDEgOiAwKTtcbiAgICAgICAgICBiID0gYiA+PiAxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBiaXRzLnJldmVyc2UoKTtcbiAgICAgIHN0ciA9IGJpdHMuam9pbignJyk7XG5cbiAgICAgIC8vIFVucGFjayBzaWduLCBleHBvbmVudCwgZnJhY3Rpb25cbiAgICAgIGJpYXMgPSAoMSA8PCAoZWJpdHMgLSAxKSkgLSAxO1xuICAgICAgcyA9IHBhcnNlSW50KHN0ci5zbGljZSgwLCAxKSwgMikgPyAtMSA6IDE7XG4gICAgICBlID0gcGFyc2VJbnQoc3RyLnNsaWNlKDEsIDEgKyBlYml0cyksIDIpO1xuICAgICAgZiA9IHBhcnNlSW50KHN0ci5zbGljZSgxICsgZWJpdHMpLCAyKTtcblxuICAgICAgLy8gUHJvZHVjZSBudW1iZXJcbiAgICAgIGlmIChlID09PSAoMSA8PCBlYml0cykgLSAxKSB7XG4gICAgICAgIHJldHVybiBmICE9PSAwID8gTmFOIDogcyAqIEluZmluaXR5O1xuICAgICAgfSBlbHNlIGlmIChlID4gMCkge1xuICAgICAgICAvLyBOb3JtYWxpemVkXG4gICAgICAgIHJldHVybiBzICogTWF0aC5wb3coMiwgZSAtIGJpYXMpICogKDEgKyBmIC8gTWF0aC5wb3coMiwgZmJpdHMpKTtcbiAgICAgIH0gZWxzZSBpZiAoZiAhPT0gMCkge1xuICAgICAgICAvLyBEZW5vcm1hbGl6ZWRcbiAgICAgICAgcmV0dXJuIHMgKiBNYXRoLnBvdygyLCAtKGJpYXMgLSAxKSkgKiAoZiAvIE1hdGgucG93KDIsIGZiaXRzKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcyA8IDAgPyAtMCA6IDA7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdW5wYWNrRmxvYXQ2NChiKSB7IHJldHVybiB1bnBhY2tJRUVFNzU0KGIsIDExLCA1Mik7IH1cbiAgICBmdW5jdGlvbiBwYWNrRmxvYXQ2NCh2KSB7IHJldHVybiBwYWNrSUVFRTc1NCh2LCAxMSwgNTIpOyB9XG4gICAgZnVuY3Rpb24gdW5wYWNrRmxvYXQzMihiKSB7IHJldHVybiB1bnBhY2tJRUVFNzU0KGIsIDgsIDIzKTsgfVxuICAgIGZ1bmN0aW9uIHBhY2tGbG9hdDMyKHYpIHsgcmV0dXJuIHBhY2tJRUVFNzU0KHYsIDgsIDIzKTsgfVxuXG4gICAgdmFyIGNvbnZlcnNpb25zID0ge1xuICAgICAgdG9GbG9hdDMyOiBmdW5jdGlvbiAobnVtKSB7IHJldHVybiB1bnBhY2tGbG9hdDMyKHBhY2tGbG9hdDMyKG51bSkpOyB9XG4gICAgfTtcbiAgICBpZiAodHlwZW9mIEZsb2F0MzJBcnJheSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHZhciBmbG9hdDMyYXJyYXkgPSBuZXcgRmxvYXQzMkFycmF5KDEpO1xuICAgICAgY29udmVyc2lvbnMudG9GbG9hdDMyID0gZnVuY3Rpb24gKG51bSkge1xuICAgICAgICBmbG9hdDMyYXJyYXlbMF0gPSBudW07XG4gICAgICAgIHJldHVybiBmbG9hdDMyYXJyYXlbMF07XG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gY29udmVyc2lvbnM7XG4gIH0oKSk7XG5cbiAgZGVmaW5lUHJvcGVydGllcyhTdHJpbmcsIHtcbiAgICBmcm9tQ29kZVBvaW50OiBmdW5jdGlvbiBmcm9tQ29kZVBvaW50KF8pIHsgLy8gbGVuZ3RoID0gMVxuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgdmFyIG5leHQ7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5leHQgPSBOdW1iZXIoYXJndW1lbnRzW2ldKTtcbiAgICAgICAgaWYgKCFFUy5TYW1lVmFsdWUobmV4dCwgRVMuVG9JbnRlZ2VyKG5leHQpKSB8fCBuZXh0IDwgMCB8fCBuZXh0ID4gMHgxMEZGRkYpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW52YWxpZCBjb2RlIHBvaW50ICcgKyBuZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChuZXh0IDwgMHgxMDAwMCkge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKFN0cmluZy5mcm9tQ2hhckNvZGUobmV4dCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG5leHQgLT0gMHgxMDAwMDtcbiAgICAgICAgICByZXN1bHQucHVzaChTdHJpbmcuZnJvbUNoYXJDb2RlKChuZXh0ID4+IDEwKSArIDB4RDgwMCkpO1xuICAgICAgICAgIHJlc3VsdC5wdXNoKFN0cmluZy5mcm9tQ2hhckNvZGUoKG5leHQgJSAweDQwMCkgKyAweERDMDApKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdC5qb2luKCcnKTtcbiAgICB9LFxuXG4gICAgcmF3OiBmdW5jdGlvbiByYXcoY2FsbFNpdGUpIHsgLy8gcmF3Lmxlbmd0aD09PTFcbiAgICAgIHZhciBjb29rZWQgPSBFUy5Ub09iamVjdChjYWxsU2l0ZSwgJ2JhZCBjYWxsU2l0ZScpO1xuICAgICAgdmFyIHJhd1ZhbHVlID0gY29va2VkLnJhdztcbiAgICAgIHZhciByYXdTdHJpbmcgPSBFUy5Ub09iamVjdChyYXdWYWx1ZSwgJ2JhZCByYXcgdmFsdWUnKTtcbiAgICAgIHZhciBsZW4gPSByYXdTdHJpbmcubGVuZ3RoO1xuICAgICAgdmFyIGxpdGVyYWxzZWdtZW50cyA9IEVTLlRvTGVuZ3RoKGxlbik7XG4gICAgICBpZiAobGl0ZXJhbHNlZ21lbnRzIDw9IDApIHtcbiAgICAgICAgcmV0dXJuICcnO1xuICAgICAgfVxuXG4gICAgICB2YXIgc3RyaW5nRWxlbWVudHMgPSBbXTtcbiAgICAgIHZhciBuZXh0SW5kZXggPSAwO1xuICAgICAgdmFyIG5leHRLZXksIG5leHQsIG5leHRTZWcsIG5leHRTdWI7XG4gICAgICB3aGlsZSAobmV4dEluZGV4IDwgbGl0ZXJhbHNlZ21lbnRzKSB7XG4gICAgICAgIG5leHRLZXkgPSBTdHJpbmcobmV4dEluZGV4KTtcbiAgICAgICAgbmV4dCA9IHJhd1N0cmluZ1tuZXh0S2V5XTtcbiAgICAgICAgbmV4dFNlZyA9IFN0cmluZyhuZXh0KTtcbiAgICAgICAgc3RyaW5nRWxlbWVudHMucHVzaChuZXh0U2VnKTtcbiAgICAgICAgaWYgKG5leHRJbmRleCArIDEgPj0gbGl0ZXJhbHNlZ21lbnRzKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbmV4dCA9IG5leHRJbmRleCArIDEgPCBhcmd1bWVudHMubGVuZ3RoID8gYXJndW1lbnRzW25leHRJbmRleCArIDFdIDogJyc7XG4gICAgICAgIG5leHRTdWIgPSBTdHJpbmcobmV4dCk7XG4gICAgICAgIHN0cmluZ0VsZW1lbnRzLnB1c2gobmV4dFN1Yik7XG4gICAgICAgIG5leHRJbmRleCsrO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0cmluZ0VsZW1lbnRzLmpvaW4oJycpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gRmlyZWZveCAzMSByZXBvcnRzIHRoaXMgZnVuY3Rpb24ncyBsZW5ndGggYXMgMFxuICAvLyBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD0xMDYyNDg0XG4gIGlmIChTdHJpbmcuZnJvbUNvZGVQb2ludC5sZW5ndGggIT09IDEpIHtcbiAgICB2YXIgb3JpZ2luYWxGcm9tQ29kZVBvaW50ID0gU3RyaW5nLmZyb21Db2RlUG9pbnQ7XG4gICAgZGVmaW5lUHJvcGVydHkoU3RyaW5nLCAnZnJvbUNvZGVQb2ludCcsIGZ1bmN0aW9uIChfKSB7IHJldHVybiBvcmlnaW5hbEZyb21Db2RlUG9pbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTsgfSwgdHJ1ZSk7XG4gIH1cblxuICB2YXIgU3RyaW5nU2hpbXMgPSB7XG4gICAgLy8gRmFzdCByZXBlYXQsIHVzZXMgdGhlIGBFeHBvbmVudGlhdGlvbiBieSBzcXVhcmluZ2AgYWxnb3JpdGhtLlxuICAgIC8vIFBlcmY6IGh0dHA6Ly9qc3BlcmYuY29tL3N0cmluZy1yZXBlYXQyLzJcbiAgICByZXBlYXQ6IChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgcmVwZWF0ID0gZnVuY3Rpb24gKHMsIHRpbWVzKSB7XG4gICAgICAgIGlmICh0aW1lcyA8IDEpIHsgcmV0dXJuICcnOyB9XG4gICAgICAgIGlmICh0aW1lcyAlIDIpIHsgcmV0dXJuIHJlcGVhdChzLCB0aW1lcyAtIDEpICsgczsgfVxuICAgICAgICB2YXIgaGFsZiA9IHJlcGVhdChzLCB0aW1lcyAvIDIpO1xuICAgICAgICByZXR1cm4gaGFsZiArIGhhbGY7XG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gZnVuY3Rpb24gKHRpbWVzKSB7XG4gICAgICAgIHZhciB0aGlzU3RyID0gU3RyaW5nKEVTLkNoZWNrT2JqZWN0Q29lcmNpYmxlKHRoaXMpKTtcbiAgICAgICAgdGltZXMgPSBFUy5Ub0ludGVnZXIodGltZXMpO1xuICAgICAgICBpZiAodGltZXMgPCAwIHx8IHRpbWVzID09PSBJbmZpbml0eSkge1xuICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIFN0cmluZyNyZXBlYXQgdmFsdWUnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVwZWF0KHRoaXNTdHIsIHRpbWVzKTtcbiAgICAgIH07XG4gICAgfSkoKSxcblxuICAgIHN0YXJ0c1dpdGg6IGZ1bmN0aW9uIChzZWFyY2hTdHIpIHtcbiAgICAgIHZhciB0aGlzU3RyID0gU3RyaW5nKEVTLkNoZWNrT2JqZWN0Q29lcmNpYmxlKHRoaXMpKTtcbiAgICAgIGlmIChfdG9TdHJpbmcuY2FsbChzZWFyY2hTdHIpID09PSAnW29iamVjdCBSZWdFeHBdJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5ub3QgY2FsbCBtZXRob2QgXCJzdGFydHNXaXRoXCIgd2l0aCBhIHJlZ2V4Jyk7XG4gICAgICB9XG4gICAgICBzZWFyY2hTdHIgPSBTdHJpbmcoc2VhcmNoU3RyKTtcbiAgICAgIHZhciBzdGFydEFyZyA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogdm9pZCAwO1xuICAgICAgdmFyIHN0YXJ0ID0gTWF0aC5tYXgoRVMuVG9JbnRlZ2VyKHN0YXJ0QXJnKSwgMCk7XG4gICAgICByZXR1cm4gdGhpc1N0ci5zbGljZShzdGFydCwgc3RhcnQgKyBzZWFyY2hTdHIubGVuZ3RoKSA9PT0gc2VhcmNoU3RyO1xuICAgIH0sXG5cbiAgICBlbmRzV2l0aDogZnVuY3Rpb24gKHNlYXJjaFN0cikge1xuICAgICAgdmFyIHRoaXNTdHIgPSBTdHJpbmcoRVMuQ2hlY2tPYmplY3RDb2VyY2libGUodGhpcykpO1xuICAgICAgaWYgKF90b1N0cmluZy5jYWxsKHNlYXJjaFN0cikgPT09ICdbb2JqZWN0IFJlZ0V4cF0nKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjYWxsIG1ldGhvZCBcImVuZHNXaXRoXCIgd2l0aCBhIHJlZ2V4Jyk7XG4gICAgICB9XG4gICAgICBzZWFyY2hTdHIgPSBTdHJpbmcoc2VhcmNoU3RyKTtcbiAgICAgIHZhciB0aGlzTGVuID0gdGhpc1N0ci5sZW5ndGg7XG4gICAgICB2YXIgcG9zQXJnID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiB2b2lkIDA7XG4gICAgICB2YXIgcG9zID0gdHlwZW9mIHBvc0FyZyA9PT0gJ3VuZGVmaW5lZCcgPyB0aGlzTGVuIDogRVMuVG9JbnRlZ2VyKHBvc0FyZyk7XG4gICAgICB2YXIgZW5kID0gTWF0aC5taW4oTWF0aC5tYXgocG9zLCAwKSwgdGhpc0xlbik7XG4gICAgICByZXR1cm4gdGhpc1N0ci5zbGljZShlbmQgLSBzZWFyY2hTdHIubGVuZ3RoLCBlbmQpID09PSBzZWFyY2hTdHI7XG4gICAgfSxcblxuICAgIGluY2x1ZGVzOiBmdW5jdGlvbiBpbmNsdWRlcyhzZWFyY2hTdHJpbmcpIHtcbiAgICAgIHZhciBwb3NpdGlvbiA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogdm9pZCAwO1xuICAgICAgLy8gU29tZWhvdyB0aGlzIHRyaWNrIG1ha2VzIG1ldGhvZCAxMDAlIGNvbXBhdCB3aXRoIHRoZSBzcGVjLlxuICAgICAgcmV0dXJuIF9pbmRleE9mLmNhbGwodGhpcywgc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikgIT09IC0xO1xuICAgIH0sXG5cbiAgICBjb2RlUG9pbnRBdDogZnVuY3Rpb24gKHBvcykge1xuICAgICAgdmFyIHRoaXNTdHIgPSBTdHJpbmcoRVMuQ2hlY2tPYmplY3RDb2VyY2libGUodGhpcykpO1xuICAgICAgdmFyIHBvc2l0aW9uID0gRVMuVG9JbnRlZ2VyKHBvcyk7XG4gICAgICB2YXIgbGVuZ3RoID0gdGhpc1N0ci5sZW5ndGg7XG4gICAgICBpZiAocG9zaXRpb24gPCAwIHx8IHBvc2l0aW9uID49IGxlbmd0aCkgeyByZXR1cm47IH1cbiAgICAgIHZhciBmaXJzdCA9IHRoaXNTdHIuY2hhckNvZGVBdChwb3NpdGlvbik7XG4gICAgICB2YXIgaXNFbmQgPSAocG9zaXRpb24gKyAxID09PSBsZW5ndGgpO1xuICAgICAgaWYgKGZpcnN0IDwgMHhEODAwIHx8IGZpcnN0ID4gMHhEQkZGIHx8IGlzRW5kKSB7IHJldHVybiBmaXJzdDsgfVxuICAgICAgdmFyIHNlY29uZCA9IHRoaXNTdHIuY2hhckNvZGVBdChwb3NpdGlvbiArIDEpO1xuICAgICAgaWYgKHNlY29uZCA8IDB4REMwMCB8fCBzZWNvbmQgPiAweERGRkYpIHsgcmV0dXJuIGZpcnN0OyB9XG4gICAgICByZXR1cm4gKChmaXJzdCAtIDB4RDgwMCkgKiAxMDI0KSArIChzZWNvbmQgLSAweERDMDApICsgMHgxMDAwMDtcbiAgICB9XG4gIH07XG4gIGRlZmluZVByb3BlcnRpZXMoU3RyaW5nLnByb3RvdHlwZSwgU3RyaW5nU2hpbXMpO1xuXG4gIHZhciBoYXNTdHJpbmdUcmltQnVnID0gJ1xcdTAwODUnLnRyaW0oKS5sZW5ndGggIT09IDE7XG4gIGlmIChoYXNTdHJpbmdUcmltQnVnKSB7XG4gICAgdmFyIG9yaWdpbmFsU3RyaW5nVHJpbSA9IFN0cmluZy5wcm90b3R5cGUudHJpbTtcbiAgICBkZWxldGUgU3RyaW5nLnByb3RvdHlwZS50cmltO1xuICAgIC8vIHdoaXRlc3BhY2UgZnJvbTogaHR0cDovL2VzNS5naXRodWIuaW8vI3gxNS41LjQuMjBcbiAgICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9lcy1zaGltcy9lczUtc2hpbS9ibG9iL3YzLjQuMC9lczUtc2hpbS5qcyNMMTMwNC1MMTMyNFxuICAgIHZhciB3cyA9IFtcbiAgICAgICdcXHgwOVxceDBBXFx4MEJcXHgwQ1xceDBEXFx4MjBcXHhBMFxcdTE2ODBcXHUxODBFXFx1MjAwMFxcdTIwMDFcXHUyMDAyXFx1MjAwMycsXG4gICAgICAnXFx1MjAwNFxcdTIwMDVcXHUyMDA2XFx1MjAwN1xcdTIwMDhcXHUyMDA5XFx1MjAwQVxcdTIwMkZcXHUyMDVGXFx1MzAwMFxcdTIwMjgnLFxuICAgICAgJ1xcdTIwMjlcXHVGRUZGJ1xuICAgIF0uam9pbignJyk7XG4gICAgdmFyIHRyaW1SZWdleHAgPSBuZXcgUmVnRXhwKCcoXlsnICsgd3MgKyAnXSspfChbJyArIHdzICsgJ10rJCknLCAnZycpO1xuICAgIGRlZmluZVByb3BlcnRpZXMoU3RyaW5nLnByb3RvdHlwZSwge1xuICAgICAgdHJpbTogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodHlwZW9mIHRoaXMgPT09ICd1bmRlZmluZWQnIHx8IHRoaXMgPT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2FuJ3QgY29udmVydCBcIiArIHRoaXMgKyAnIHRvIG9iamVjdCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBTdHJpbmcodGhpcykucmVwbGFjZSh0cmltUmVnZXhwLCAnJyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvLyBzZWUgaHR0cHM6Ly9wZW9wbGUubW96aWxsYS5vcmcvfmpvcmVuZG9yZmYvZXM2LWRyYWZ0Lmh0bWwjc2VjLXN0cmluZy5wcm90b3R5cGUtQEBpdGVyYXRvclxuICB2YXIgU3RyaW5nSXRlcmF0b3IgPSBmdW5jdGlvbiAocykge1xuICAgIHRoaXMuX3MgPSBTdHJpbmcoRVMuQ2hlY2tPYmplY3RDb2VyY2libGUocykpO1xuICAgIHRoaXMuX2kgPSAwO1xuICB9O1xuICBTdHJpbmdJdGVyYXRvci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcyA9IHRoaXMuX3MsIGkgPSB0aGlzLl9pO1xuICAgIGlmICh0eXBlb2YgcyA9PT0gJ3VuZGVmaW5lZCcgfHwgaSA+PSBzLmxlbmd0aCkge1xuICAgICAgdGhpcy5fcyA9IHZvaWQgMDtcbiAgICAgIHJldHVybiB7IHZhbHVlOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcbiAgICB9XG4gICAgdmFyIGZpcnN0ID0gcy5jaGFyQ29kZUF0KGkpLCBzZWNvbmQsIGxlbjtcbiAgICBpZiAoZmlyc3QgPCAweEQ4MDAgfHwgZmlyc3QgPiAweERCRkYgfHwgKGkgKyAxKSA9PSBzLmxlbmd0aCkge1xuICAgICAgbGVuID0gMTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2Vjb25kID0gcy5jaGFyQ29kZUF0KGkgKyAxKTtcbiAgICAgIGxlbiA9IChzZWNvbmQgPCAweERDMDAgfHwgc2Vjb25kID4gMHhERkZGKSA/IDEgOiAyO1xuICAgIH1cbiAgICB0aGlzLl9pID0gaSArIGxlbjtcbiAgICByZXR1cm4geyB2YWx1ZTogcy5zdWJzdHIoaSwgbGVuKSwgZG9uZTogZmFsc2UgfTtcbiAgfTtcbiAgYWRkSXRlcmF0b3IoU3RyaW5nSXRlcmF0b3IucHJvdG90eXBlKTtcbiAgYWRkSXRlcmF0b3IoU3RyaW5nLnByb3RvdHlwZSwgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgU3RyaW5nSXRlcmF0b3IodGhpcyk7XG4gIH0pO1xuXG4gIGlmICghc3RhcnRzV2l0aElzQ29tcGxpYW50KSB7XG4gICAgLy8gRmlyZWZveCBoYXMgYSBub25jb21wbGlhbnQgc3RhcnRzV2l0aCBpbXBsZW1lbnRhdGlvblxuICAgIFN0cmluZy5wcm90b3R5cGUuc3RhcnRzV2l0aCA9IFN0cmluZ1NoaW1zLnN0YXJ0c1dpdGg7XG4gICAgU3RyaW5nLnByb3RvdHlwZS5lbmRzV2l0aCA9IFN0cmluZ1NoaW1zLmVuZHNXaXRoO1xuICB9XG5cbiAgdmFyIEFycmF5U2hpbXMgPSB7XG4gICAgZnJvbTogZnVuY3Rpb24gKGl0ZXJhYmxlKSB7XG4gICAgICB2YXIgbWFwRm4gPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IHZvaWQgMDtcblxuICAgICAgdmFyIGxpc3QgPSBFUy5Ub09iamVjdChpdGVyYWJsZSwgJ2JhZCBpdGVyYWJsZScpO1xuICAgICAgaWYgKHR5cGVvZiBtYXBGbiAhPT0gJ3VuZGVmaW5lZCcgJiYgIUVTLklzQ2FsbGFibGUobWFwRm4pKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FycmF5LmZyb206IHdoZW4gcHJvdmlkZWQsIHRoZSBzZWNvbmQgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICB9XG5cbiAgICAgIHZhciBoYXNUaGlzQXJnID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XG4gICAgICB2YXIgdGhpc0FyZyA9IGhhc1RoaXNBcmcgPyBhcmd1bWVudHNbMl0gOiB2b2lkIDA7XG5cbiAgICAgIHZhciB1c2luZ0l0ZXJhdG9yID0gRVMuSXNJdGVyYWJsZShsaXN0KTtcbiAgICAgIC8vIGRvZXMgdGhlIHNwZWMgcmVhbGx5IG1lYW4gdGhhdCBBcnJheXMgc2hvdWxkIHVzZSBBcnJheUl0ZXJhdG9yP1xuICAgICAgLy8gaHR0cHM6Ly9idWdzLmVjbWFzY3JpcHQub3JnL3Nob3dfYnVnLmNnaT9pZD0yNDE2XG4gICAgICAvL2lmIChBcnJheS5pc0FycmF5KGxpc3QpKSB7IHVzaW5nSXRlcmF0b3I9ZmFsc2U7IH1cblxuICAgICAgdmFyIGxlbmd0aDtcbiAgICAgIHZhciByZXN1bHQsIGksIHZhbHVlO1xuICAgICAgaWYgKHVzaW5nSXRlcmF0b3IpIHtcbiAgICAgICAgaSA9IDA7XG4gICAgICAgIHJlc3VsdCA9IEVTLklzQ2FsbGFibGUodGhpcykgPyBPYmplY3QobmV3IHRoaXMoKSkgOiBbXTtcbiAgICAgICAgdmFyIGl0ID0gdXNpbmdJdGVyYXRvciA/IEVTLkdldEl0ZXJhdG9yKGxpc3QpIDogbnVsbDtcbiAgICAgICAgdmFyIGl0ZXJhdGlvblZhbHVlO1xuXG4gICAgICAgIGRvIHtcbiAgICAgICAgICBpdGVyYXRpb25WYWx1ZSA9IEVTLkl0ZXJhdG9yTmV4dChpdCk7XG4gICAgICAgICAgaWYgKCFpdGVyYXRpb25WYWx1ZS5kb25lKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGl0ZXJhdGlvblZhbHVlLnZhbHVlO1xuICAgICAgICAgICAgaWYgKG1hcEZuKSB7XG4gICAgICAgICAgICAgIHJlc3VsdFtpXSA9IGhhc1RoaXNBcmcgPyBtYXBGbi5jYWxsKHRoaXNBcmcsIHZhbHVlLCBpKSA6IG1hcEZuKHZhbHVlLCBpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdFtpXSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSB3aGlsZSAoIWl0ZXJhdGlvblZhbHVlLmRvbmUpO1xuICAgICAgICBsZW5ndGggPSBpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGVuZ3RoID0gRVMuVG9MZW5ndGgobGlzdC5sZW5ndGgpO1xuICAgICAgICByZXN1bHQgPSBFUy5Jc0NhbGxhYmxlKHRoaXMpID8gT2JqZWN0KG5ldyB0aGlzKGxlbmd0aCkpIDogbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgICAgICAgIHZhbHVlID0gbGlzdFtpXTtcbiAgICAgICAgICBpZiAobWFwRm4pIHtcbiAgICAgICAgICAgIHJlc3VsdFtpXSA9IGhhc1RoaXNBcmcgPyBtYXBGbi5jYWxsKHRoaXNBcmcsIHZhbHVlLCBpKSA6IG1hcEZuKHZhbHVlLCBpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0W2ldID0gdmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJlc3VsdC5sZW5ndGggPSBsZW5ndGg7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICBvZjogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIEFycmF5LmZyb20oYXJndW1lbnRzKTtcbiAgICB9XG4gIH07XG4gIGRlZmluZVByb3BlcnRpZXMoQXJyYXksIEFycmF5U2hpbXMpO1xuXG4gIHZhciBhcnJheUZyb21Td2FsbG93c05lZ2F0aXZlTGVuZ3RocyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIEFycmF5LmZyb20oeyBsZW5ndGg6IC0xIH0pLmxlbmd0aCA9PT0gMDtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuICAvLyBGaXhlcyBhIEZpcmVmb3ggYnVnIGluIHYzMlxuICAvLyBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD0xMDYzOTkzXG4gIGlmICghYXJyYXlGcm9tU3dhbGxvd3NOZWdhdGl2ZUxlbmd0aHMoKSkge1xuICAgIGRlZmluZVByb3BlcnR5KEFycmF5LCAnZnJvbScsIEFycmF5U2hpbXMuZnJvbSwgdHJ1ZSk7XG4gIH1cblxuICAvLyBPdXIgQXJyYXlJdGVyYXRvciBpcyBwcml2YXRlOyBzZWVcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3BhdWxtaWxsci9lczYtc2hpbS9pc3N1ZXMvMjUyXG4gIEFycmF5SXRlcmF0b3IgPSBmdW5jdGlvbiAoYXJyYXksIGtpbmQpIHtcbiAgICAgIHRoaXMuaSA9IDA7XG4gICAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG4gICAgICB0aGlzLmtpbmQgPSBraW5kO1xuICB9O1xuXG4gIGRlZmluZVByb3BlcnRpZXMoQXJyYXlJdGVyYXRvci5wcm90b3R5cGUsIHtcbiAgICBuZXh0OiBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgaSA9IHRoaXMuaSwgYXJyYXkgPSB0aGlzLmFycmF5O1xuICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEFycmF5SXRlcmF0b3IpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ05vdCBhbiBBcnJheUl0ZXJhdG9yJyk7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIGFycmF5ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB2YXIgbGVuID0gRVMuVG9MZW5ndGgoYXJyYXkubGVuZ3RoKTtcbiAgICAgICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgIHZhciBraW5kID0gdGhpcy5raW5kO1xuICAgICAgICAgIHZhciByZXR2YWw7XG4gICAgICAgICAgaWYgKGtpbmQgPT09ICdrZXknKSB7XG4gICAgICAgICAgICByZXR2YWwgPSBpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoa2luZCA9PT0gJ3ZhbHVlJykge1xuICAgICAgICAgICAgcmV0dmFsID0gYXJyYXlbaV07XG4gICAgICAgICAgfSBlbHNlIGlmIChraW5kID09PSAnZW50cnknKSB7XG4gICAgICAgICAgICByZXR2YWwgPSBbaSwgYXJyYXlbaV1dO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmkgPSBpICsgMTtcbiAgICAgICAgICByZXR1cm4geyB2YWx1ZTogcmV0dmFsLCBkb25lOiBmYWxzZSB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLmFycmF5ID0gdm9pZCAwO1xuICAgICAgcmV0dXJuIHsgdmFsdWU6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xuICAgIH1cbiAgfSk7XG4gIGFkZEl0ZXJhdG9yKEFycmF5SXRlcmF0b3IucHJvdG90eXBlKTtcblxuICB2YXIgQXJyYXlQcm90b3R5cGVTaGltcyA9IHtcbiAgICBjb3B5V2l0aGluOiBmdW5jdGlvbiAodGFyZ2V0LCBzdGFydCkge1xuICAgICAgdmFyIGVuZCA9IGFyZ3VtZW50c1syXTsgLy8gY29weVdpdGhpbi5sZW5ndGggbXVzdCBiZSAyXG4gICAgICB2YXIgbyA9IEVTLlRvT2JqZWN0KHRoaXMpO1xuICAgICAgdmFyIGxlbiA9IEVTLlRvTGVuZ3RoKG8ubGVuZ3RoKTtcbiAgICAgIHRhcmdldCA9IEVTLlRvSW50ZWdlcih0YXJnZXQpO1xuICAgICAgc3RhcnQgPSBFUy5Ub0ludGVnZXIoc3RhcnQpO1xuICAgICAgdmFyIHRvID0gdGFyZ2V0IDwgMCA/IE1hdGgubWF4KGxlbiArIHRhcmdldCwgMCkgOiBNYXRoLm1pbih0YXJnZXQsIGxlbik7XG4gICAgICB2YXIgZnJvbSA9IHN0YXJ0IDwgMCA/IE1hdGgubWF4KGxlbiArIHN0YXJ0LCAwKSA6IE1hdGgubWluKHN0YXJ0LCBsZW4pO1xuICAgICAgZW5kID0gdHlwZW9mIGVuZCA9PT0gJ3VuZGVmaW5lZCcgPyBsZW4gOiBFUy5Ub0ludGVnZXIoZW5kKTtcbiAgICAgIHZhciBmaW4gPSBlbmQgPCAwID8gTWF0aC5tYXgobGVuICsgZW5kLCAwKSA6IE1hdGgubWluKGVuZCwgbGVuKTtcbiAgICAgIHZhciBjb3VudCA9IE1hdGgubWluKGZpbiAtIGZyb20sIGxlbiAtIHRvKTtcbiAgICAgIHZhciBkaXJlY3Rpb24gPSAxO1xuICAgICAgaWYgKGZyb20gPCB0byAmJiB0byA8IChmcm9tICsgY291bnQpKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IC0xO1xuICAgICAgICBmcm9tICs9IGNvdW50IC0gMTtcbiAgICAgICAgdG8gKz0gY291bnQgLSAxO1xuICAgICAgfVxuICAgICAgd2hpbGUgKGNvdW50ID4gMCkge1xuICAgICAgICBpZiAoX2hhc093blByb3BlcnR5LmNhbGwobywgZnJvbSkpIHtcbiAgICAgICAgICBvW3RvXSA9IG9bZnJvbV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIG9bZnJvbV07XG4gICAgICAgIH1cbiAgICAgICAgZnJvbSArPSBkaXJlY3Rpb247XG4gICAgICAgIHRvICs9IGRpcmVjdGlvbjtcbiAgICAgICAgY291bnQgLT0gMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvO1xuICAgIH0sXG5cbiAgICBmaWxsOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhciBzdGFydCA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogdm9pZCAwO1xuICAgICAgdmFyIGVuZCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyID8gYXJndW1lbnRzWzJdIDogdm9pZCAwO1xuICAgICAgdmFyIE8gPSBFUy5Ub09iamVjdCh0aGlzKTtcbiAgICAgIHZhciBsZW4gPSBFUy5Ub0xlbmd0aChPLmxlbmd0aCk7XG4gICAgICBzdGFydCA9IEVTLlRvSW50ZWdlcih0eXBlb2Ygc3RhcnQgPT09ICd1bmRlZmluZWQnID8gMCA6IHN0YXJ0KTtcbiAgICAgIGVuZCA9IEVTLlRvSW50ZWdlcih0eXBlb2YgZW5kID09PSAndW5kZWZpbmVkJyA/IGxlbiA6IGVuZCk7XG5cbiAgICAgIHZhciByZWxhdGl2ZVN0YXJ0ID0gc3RhcnQgPCAwID8gTWF0aC5tYXgobGVuICsgc3RhcnQsIDApIDogTWF0aC5taW4oc3RhcnQsIGxlbik7XG4gICAgICB2YXIgcmVsYXRpdmVFbmQgPSBlbmQgPCAwID8gbGVuICsgZW5kIDogZW5kO1xuXG4gICAgICBmb3IgKHZhciBpID0gcmVsYXRpdmVTdGFydDsgaSA8IGxlbiAmJiBpIDwgcmVsYXRpdmVFbmQ7ICsraSkge1xuICAgICAgICBPW2ldID0gdmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gTztcbiAgICB9LFxuXG4gICAgZmluZDogZnVuY3Rpb24gZmluZChwcmVkaWNhdGUpIHtcbiAgICAgIHZhciBsaXN0ID0gRVMuVG9PYmplY3QodGhpcyk7XG4gICAgICB2YXIgbGVuZ3RoID0gRVMuVG9MZW5ndGgobGlzdC5sZW5ndGgpO1xuICAgICAgaWYgKCFFUy5Jc0NhbGxhYmxlKHByZWRpY2F0ZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJyYXkjZmluZDogcHJlZGljYXRlIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgfVxuICAgICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IG51bGw7XG4gICAgICBmb3IgKHZhciBpID0gMCwgdmFsdWU7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICB2YWx1ZSA9IGxpc3RbaV07XG4gICAgICAgIGlmICh0aGlzQXJnKSB7XG4gICAgICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKHRoaXNBcmcsIHZhbHVlLCBpLCBsaXN0KSkgeyByZXR1cm4gdmFsdWU7IH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAocHJlZGljYXRlKHZhbHVlLCBpLCBsaXN0KSkgeyByZXR1cm4gdmFsdWU7IH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH0sXG5cbiAgICBmaW5kSW5kZXg6IGZ1bmN0aW9uIGZpbmRJbmRleChwcmVkaWNhdGUpIHtcbiAgICAgIHZhciBsaXN0ID0gRVMuVG9PYmplY3QodGhpcyk7XG4gICAgICB2YXIgbGVuZ3RoID0gRVMuVG9MZW5ndGgobGlzdC5sZW5ndGgpO1xuICAgICAgaWYgKCFFUy5Jc0NhbGxhYmxlKHByZWRpY2F0ZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJyYXkjZmluZEluZGV4OiBwcmVkaWNhdGUgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICB9XG4gICAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogbnVsbDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHRoaXNBcmcpIHtcbiAgICAgICAgICBpZiAocHJlZGljYXRlLmNhbGwodGhpc0FyZywgbGlzdFtpXSwgaSwgbGlzdCkpIHsgcmV0dXJuIGk7IH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAocHJlZGljYXRlKGxpc3RbaV0sIGksIGxpc3QpKSB7IHJldHVybiBpOyB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiAtMTtcbiAgICB9LFxuXG4gICAga2V5czogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5ldyBBcnJheUl0ZXJhdG9yKHRoaXMsICdrZXknKTtcbiAgICB9LFxuXG4gICAgdmFsdWVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmV3IEFycmF5SXRlcmF0b3IodGhpcywgJ3ZhbHVlJyk7XG4gICAgfSxcblxuICAgIGVudHJpZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuZXcgQXJyYXlJdGVyYXRvcih0aGlzLCAnZW50cnknKTtcbiAgICB9XG4gIH07XG4gIC8vIFNhZmFyaSA3LjEgZGVmaW5lcyBBcnJheSNrZXlzIGFuZCBBcnJheSNlbnRyaWVzIG5hdGl2ZWx5LFxuICAvLyBidXQgdGhlIHJlc3VsdGluZyBBcnJheUl0ZXJhdG9yIG9iamVjdHMgZG9uJ3QgaGF2ZSBhIFwibmV4dFwiIG1ldGhvZC5cbiAgaWYgKEFycmF5LnByb3RvdHlwZS5rZXlzICYmICFFUy5Jc0NhbGxhYmxlKFsxXS5rZXlzKCkubmV4dCkpIHtcbiAgICBkZWxldGUgQXJyYXkucHJvdG90eXBlLmtleXM7XG4gIH1cbiAgaWYgKEFycmF5LnByb3RvdHlwZS5lbnRyaWVzICYmICFFUy5Jc0NhbGxhYmxlKFsxXS5lbnRyaWVzKCkubmV4dCkpIHtcbiAgICBkZWxldGUgQXJyYXkucHJvdG90eXBlLmVudHJpZXM7XG4gIH1cblxuICAvLyBDaHJvbWUgMzggZGVmaW5lcyBBcnJheSNrZXlzIGFuZCBBcnJheSNlbnRyaWVzLCBhbmQgQXJyYXkjQEBpdGVyYXRvciwgYnV0IG5vdCBBcnJheSN2YWx1ZXNcbiAgaWYgKEFycmF5LnByb3RvdHlwZS5rZXlzICYmIEFycmF5LnByb3RvdHlwZS5lbnRyaWVzICYmICFBcnJheS5wcm90b3R5cGUudmFsdWVzICYmIEFycmF5LnByb3RvdHlwZVskaXRlcmF0b3IkXSkge1xuICAgIGRlZmluZVByb3BlcnRpZXMoQXJyYXkucHJvdG90eXBlLCB7XG4gICAgICB2YWx1ZXM6IEFycmF5LnByb3RvdHlwZVskaXRlcmF0b3IkXVxuICAgIH0pO1xuICB9XG4gIGRlZmluZVByb3BlcnRpZXMoQXJyYXkucHJvdG90eXBlLCBBcnJheVByb3RvdHlwZVNoaW1zKTtcblxuICBhZGRJdGVyYXRvcihBcnJheS5wcm90b3R5cGUsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMudmFsdWVzKCk7IH0pO1xuICAvLyBDaHJvbWUgZGVmaW5lcyBrZXlzL3ZhbHVlcy9lbnRyaWVzIG9uIEFycmF5LCBidXQgZG9lc24ndCBnaXZlIHVzXG4gIC8vIGFueSB3YXkgdG8gaWRlbnRpZnkgaXRzIGl0ZXJhdG9yLiAgU28gYWRkIG91ciBvd24gc2hpbW1lZCBmaWVsZC5cbiAgaWYgKE9iamVjdC5nZXRQcm90b3R5cGVPZikge1xuICAgIGFkZEl0ZXJhdG9yKE9iamVjdC5nZXRQcm90b3R5cGVPZihbXS52YWx1ZXMoKSkpO1xuICB9XG5cbiAgdmFyIG1heFNhZmVJbnRlZ2VyID0gTWF0aC5wb3coMiwgNTMpIC0gMTtcbiAgZGVmaW5lUHJvcGVydGllcyhOdW1iZXIsIHtcbiAgICBNQVhfU0FGRV9JTlRFR0VSOiBtYXhTYWZlSW50ZWdlcixcbiAgICBNSU5fU0FGRV9JTlRFR0VSOiAtbWF4U2FmZUludGVnZXIsXG4gICAgRVBTSUxPTjogMi4yMjA0NDYwNDkyNTAzMTNlLTE2LFxuXG4gICAgcGFyc2VJbnQ6IGdsb2JhbHMucGFyc2VJbnQsXG4gICAgcGFyc2VGbG9hdDogZ2xvYmFscy5wYXJzZUZsb2F0LFxuXG4gICAgaXNGaW5pdGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgZ2xvYmFsX2lzRmluaXRlKHZhbHVlKTtcbiAgICB9LFxuXG4gICAgaXNJbnRlZ2VyOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHJldHVybiBOdW1iZXIuaXNGaW5pdGUodmFsdWUpICYmXG4gICAgICAgIEVTLlRvSW50ZWdlcih2YWx1ZSkgPT09IHZhbHVlO1xuICAgIH0sXG5cbiAgICBpc1NhZmVJbnRlZ2VyOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHJldHVybiBOdW1iZXIuaXNJbnRlZ2VyKHZhbHVlKSAmJiBNYXRoLmFicyh2YWx1ZSkgPD0gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVI7XG4gICAgfSxcblxuICAgIGlzTmFOOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIC8vIE5hTiAhPT0gTmFOLCBidXQgdGhleSBhcmUgaWRlbnRpY2FsLlxuICAgICAgLy8gTmFOcyBhcmUgdGhlIG9ubHkgbm9uLXJlZmxleGl2ZSB2YWx1ZSwgaS5lLiwgaWYgeCAhPT0geCxcbiAgICAgIC8vIHRoZW4geCBpcyBOYU4uXG4gICAgICAvLyBpc05hTiBpcyBicm9rZW46IGl0IGNvbnZlcnRzIGl0cyBhcmd1bWVudCB0byBudW1iZXIsIHNvXG4gICAgICAvLyBpc05hTignZm9vJykgPT4gdHJ1ZVxuICAgICAgcmV0dXJuIHZhbHVlICE9PSB2YWx1ZTtcbiAgICB9XG5cbiAgfSk7XG5cbiAgLy8gV29yayBhcm91bmQgYnVncyBpbiBBcnJheSNmaW5kIGFuZCBBcnJheSNmaW5kSW5kZXggLS0gZWFybHlcbiAgLy8gaW1wbGVtZW50YXRpb25zIHNraXBwZWQgaG9sZXMgaW4gc3BhcnNlIGFycmF5cy4gKE5vdGUgdGhhdCB0aGVcbiAgLy8gaW1wbGVtZW50YXRpb25zIG9mIGZpbmQvZmluZEluZGV4IGluZGlyZWN0bHkgdXNlIHNoaW1tZWRcbiAgLy8gbWV0aG9kcyBvZiBOdW1iZXIsIHNvIHRoaXMgdGVzdCBoYXMgdG8gaGFwcGVuIGRvd24gaGVyZS4pXG4gIGlmICghWywgMV0uZmluZChmdW5jdGlvbiAoaXRlbSwgaWR4KSB7IHJldHVybiBpZHggPT09IDA7IH0pKSB7XG4gICAgZGVmaW5lUHJvcGVydHkoQXJyYXkucHJvdG90eXBlLCAnZmluZCcsIEFycmF5UHJvdG90eXBlU2hpbXMuZmluZCwgdHJ1ZSk7XG4gIH1cbiAgaWYgKFssIDFdLmZpbmRJbmRleChmdW5jdGlvbiAoaXRlbSwgaWR4KSB7IHJldHVybiBpZHggPT09IDA7IH0pICE9PSAwKSB7XG4gICAgZGVmaW5lUHJvcGVydHkoQXJyYXkucHJvdG90eXBlLCAnZmluZEluZGV4JywgQXJyYXlQcm90b3R5cGVTaGltcy5maW5kSW5kZXgsIHRydWUpO1xuICB9XG5cbiAgaWYgKHN1cHBvcnRzRGVzY3JpcHRvcnMpIHtcbiAgICBkZWZpbmVQcm9wZXJ0aWVzKE9iamVjdCwge1xuICAgICAgZ2V0UHJvcGVydHlEZXNjcmlwdG9yOiBmdW5jdGlvbiAoc3ViamVjdCwgbmFtZSkge1xuICAgICAgICB2YXIgcGQgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHN1YmplY3QsIG5hbWUpO1xuICAgICAgICB2YXIgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yoc3ViamVjdCk7XG4gICAgICAgIHdoaWxlICh0eXBlb2YgcGQgPT09ICd1bmRlZmluZWQnICYmIHByb3RvICE9PSBudWxsKSB7XG4gICAgICAgICAgcGQgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHByb3RvLCBuYW1lKTtcbiAgICAgICAgICBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihwcm90byk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBkO1xuICAgICAgfSxcblxuICAgICAgZ2V0UHJvcGVydHlOYW1lczogZnVuY3Rpb24gKHN1YmplY3QpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHN1YmplY3QpO1xuICAgICAgICB2YXIgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yoc3ViamVjdCk7XG5cbiAgICAgICAgdmFyIGFkZFByb3BlcnR5ID0gZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgaWYgKHJlc3VsdC5pbmRleE9mKHByb3BlcnR5KSA9PT0gLTEpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHByb3BlcnR5KTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgd2hpbGUgKHByb3RvICE9PSBudWxsKSB7XG4gICAgICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMocHJvdG8pLmZvckVhY2goYWRkUHJvcGVydHkpO1xuICAgICAgICAgIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHByb3RvKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgZGVmaW5lUHJvcGVydGllcyhPYmplY3QsIHtcbiAgICAgIC8vIDE5LjEuMy4xXG4gICAgICBhc3NpZ246IGZ1bmN0aW9uICh0YXJnZXQsIHNvdXJjZSkge1xuICAgICAgICBpZiAoIUVTLlR5cGVJc09iamVjdCh0YXJnZXQpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigndGFyZ2V0IG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5yZWR1Y2UuY2FsbChhcmd1bWVudHMsIGZ1bmN0aW9uICh0YXJnZXQsIHNvdXJjZSkge1xuICAgICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhPYmplY3Qoc291cmNlKSkucmVkdWNlKGZ1bmN0aW9uICh0YXJnZXQsIGtleSkge1xuICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgICAgICAgfSwgdGFyZ2V0KTtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuXG4gICAgICBpczogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIEVTLlNhbWVWYWx1ZShhLCBiKTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIDE5LjEuMy45XG4gICAgICAvLyBzaGltIGZyb20gaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vV2ViUmVmbGVjdGlvbi81NTkzNTU0XG4gICAgICBzZXRQcm90b3R5cGVPZjogKGZ1bmN0aW9uIChPYmplY3QsIG1hZ2ljKSB7XG4gICAgICAgIHZhciBzZXQ7XG5cbiAgICAgICAgdmFyIGNoZWNrQXJncyA9IGZ1bmN0aW9uIChPLCBwcm90bykge1xuICAgICAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KE8pKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdjYW5ub3Qgc2V0IHByb3RvdHlwZSBvbiBhIG5vbi1vYmplY3QnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCEocHJvdG8gPT09IG51bGwgfHwgRVMuVHlwZUlzT2JqZWN0KHByb3RvKSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2NhbiBvbmx5IHNldCBwcm90b3R5cGUgdG8gYW4gb2JqZWN0IG9yIG51bGwnICsgcHJvdG8pO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgc2V0UHJvdG90eXBlT2YgPSBmdW5jdGlvbiAoTywgcHJvdG8pIHtcbiAgICAgICAgICBjaGVja0FyZ3MoTywgcHJvdG8pO1xuICAgICAgICAgIHNldC5jYWxsKE8sIHByb3RvKTtcbiAgICAgICAgICByZXR1cm4gTztcbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIHRoaXMgd29ya3MgYWxyZWFkeSBpbiBGaXJlZm94IGFuZCBTYWZhcmlcbiAgICAgICAgICBzZXQgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKE9iamVjdC5wcm90b3R5cGUsIG1hZ2ljKS5zZXQ7XG4gICAgICAgICAgc2V0LmNhbGwoe30sIG51bGwpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUgIT09IHt9W21hZ2ljXSkge1xuICAgICAgICAgICAgLy8gSUUgPCAxMSBjYW5ub3QgYmUgc2hpbW1lZFxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBwcm9iYWJseSBDaHJvbWUgb3Igc29tZSBvbGQgTW9iaWxlIHN0b2NrIGJyb3dzZXJcbiAgICAgICAgICBzZXQgPSBmdW5jdGlvbiAocHJvdG8pIHtcbiAgICAgICAgICAgIHRoaXNbbWFnaWNdID0gcHJvdG87XG4gICAgICAgICAgfTtcbiAgICAgICAgICAvLyBwbGVhc2Ugbm90ZSB0aGF0IHRoaXMgd2lsbCAqKm5vdCoqIHdvcmtcbiAgICAgICAgICAvLyBpbiB0aG9zZSBicm93c2VycyB0aGF0IGRvIG5vdCBpbmhlcml0XG4gICAgICAgICAgLy8gX19wcm90b19fIGJ5IG1pc3Rha2UgZnJvbSBPYmplY3QucHJvdG90eXBlXG4gICAgICAgICAgLy8gaW4gdGhlc2UgY2FzZXMgd2Ugc2hvdWxkIHByb2JhYmx5IHRocm93IGFuIGVycm9yXG4gICAgICAgICAgLy8gb3IgYXQgbGVhc3QgYmUgaW5mb3JtZWQgYWJvdXQgdGhlIGlzc3VlXG4gICAgICAgICAgc2V0UHJvdG90eXBlT2YucG9seWZpbGwgPSBzZXRQcm90b3R5cGVPZihcbiAgICAgICAgICAgIHNldFByb3RvdHlwZU9mKHt9LCBudWxsKSxcbiAgICAgICAgICAgIE9iamVjdC5wcm90b3R5cGVcbiAgICAgICAgICApIGluc3RhbmNlb2YgT2JqZWN0O1xuICAgICAgICAgIC8vIHNldFByb3RvdHlwZU9mLnBvbHlmaWxsID09PSB0cnVlIG1lYW5zIGl0IHdvcmtzIGFzIG1lYW50XG4gICAgICAgICAgLy8gc2V0UHJvdG90eXBlT2YucG9seWZpbGwgPT09IGZhbHNlIG1lYW5zIGl0J3Mgbm90IDEwMCUgcmVsaWFibGVcbiAgICAgICAgICAvLyBzZXRQcm90b3R5cGVPZi5wb2x5ZmlsbCA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgLy8gb3JcbiAgICAgICAgICAvLyBzZXRQcm90b3R5cGVPZi5wb2x5ZmlsbCA9PSAgbnVsbCBtZWFucyBpdCdzIG5vdCBhIHBvbHlmaWxsXG4gICAgICAgICAgLy8gd2hpY2ggbWVhbnMgaXQgd29ya3MgYXMgZXhwZWN0ZWRcbiAgICAgICAgICAvLyB3ZSBjYW4gZXZlbiBkZWxldGUgT2JqZWN0LnByb3RvdHlwZS5fX3Byb3RvX187XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNldFByb3RvdHlwZU9mO1xuICAgICAgfSkoT2JqZWN0LCAnX19wcm90b19fJylcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFdvcmthcm91bmQgYnVnIGluIE9wZXJhIDEyIHdoZXJlIHNldFByb3RvdHlwZU9mKHgsIG51bGwpIGRvZXNuJ3Qgd29yayxcbiAgLy8gYnV0IE9iamVjdC5jcmVhdGUobnVsbCkgZG9lcy5cbiAgaWYgKE9iamVjdC5zZXRQcm90b3R5cGVPZiAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2YgJiZcbiAgICAgIE9iamVjdC5nZXRQcm90b3R5cGVPZihPYmplY3Quc2V0UHJvdG90eXBlT2Yoe30sIG51bGwpKSAhPT0gbnVsbCAmJlxuICAgICAgT2JqZWN0LmdldFByb3RvdHlwZU9mKE9iamVjdC5jcmVhdGUobnVsbCkpID09PSBudWxsKSB7XG4gICAgKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBGQUtFTlVMTCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICB2YXIgZ3BvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mLCBzcG8gPSBPYmplY3Quc2V0UHJvdG90eXBlT2Y7XG4gICAgICBPYmplY3QuZ2V0UHJvdG90eXBlT2YgPSBmdW5jdGlvbiAobykge1xuICAgICAgICB2YXIgcmVzdWx0ID0gZ3BvKG8pO1xuICAgICAgICByZXR1cm4gcmVzdWx0ID09PSBGQUtFTlVMTCA/IG51bGwgOiByZXN1bHQ7XG4gICAgICB9O1xuICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mID0gZnVuY3Rpb24gKG8sIHApIHtcbiAgICAgICAgaWYgKHAgPT09IG51bGwpIHsgcCA9IEZBS0VOVUxMOyB9XG4gICAgICAgIHJldHVybiBzcG8obywgcCk7XG4gICAgICB9O1xuICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mLnBvbHlmaWxsID0gZmFsc2U7XG4gICAgfSkoKTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgT2JqZWN0LmtleXMoJ2ZvbycpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgdmFyIG9yaWdpbmFsT2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzO1xuICAgIE9iamVjdC5rZXlzID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgcmV0dXJuIG9yaWdpbmFsT2JqZWN0S2V5cyhFUy5Ub09iamVjdChvYmopKTtcbiAgICB9O1xuICB9XG5cbiAgdmFyIE1hdGhTaGltcyA9IHtcbiAgICBhY29zaDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB2YWx1ZSA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAoTnVtYmVyLmlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA8IDEpIHsgcmV0dXJuIE5hTjsgfVxuICAgICAgaWYgKHZhbHVlID09PSAxKSB7IHJldHVybiAwOyB9XG4gICAgICBpZiAodmFsdWUgPT09IEluZmluaXR5KSB7IHJldHVybiB2YWx1ZTsgfVxuICAgICAgcmV0dXJuIE1hdGgubG9nKHZhbHVlICsgTWF0aC5zcXJ0KHZhbHVlICogdmFsdWUgLSAxKSk7XG4gICAgfSxcblxuICAgIGFzaW5oOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhbHVlID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmICh2YWx1ZSA9PT0gMCB8fCAhZ2xvYmFsX2lzRmluaXRlKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWUgPCAwID8gLU1hdGguYXNpbmgoLXZhbHVlKSA6IE1hdGgubG9nKHZhbHVlICsgTWF0aC5zcXJ0KHZhbHVlICogdmFsdWUgKyAxKSk7XG4gICAgfSxcblxuICAgIGF0YW5oOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhbHVlID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmIChOdW1iZXIuaXNOYU4odmFsdWUpIHx8IHZhbHVlIDwgLTEgfHwgdmFsdWUgPiAxKSB7XG4gICAgICAgIHJldHVybiBOYU47XG4gICAgICB9XG4gICAgICBpZiAodmFsdWUgPT09IC0xKSB7IHJldHVybiAtSW5maW5pdHk7IH1cbiAgICAgIGlmICh2YWx1ZSA9PT0gMSkgeyByZXR1cm4gSW5maW5pdHk7IH1cbiAgICAgIGlmICh2YWx1ZSA9PT0gMCkgeyByZXR1cm4gdmFsdWU7IH1cbiAgICAgIHJldHVybiAwLjUgKiBNYXRoLmxvZygoMSArIHZhbHVlKSAvICgxIC0gdmFsdWUpKTtcbiAgICB9LFxuXG4gICAgY2JydDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB2YWx1ZSA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAodmFsdWUgPT09IDApIHsgcmV0dXJuIHZhbHVlOyB9XG4gICAgICB2YXIgbmVnYXRlID0gdmFsdWUgPCAwLCByZXN1bHQ7XG4gICAgICBpZiAobmVnYXRlKSB7IHZhbHVlID0gLXZhbHVlOyB9XG4gICAgICByZXN1bHQgPSBNYXRoLnBvdyh2YWx1ZSwgMSAvIDMpO1xuICAgICAgcmV0dXJuIG5lZ2F0ZSA/IC1yZXN1bHQgOiByZXN1bHQ7XG4gICAgfSxcblxuICAgIGNsejMyOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIC8vIFNlZSBodHRwczovL2J1Z3MuZWNtYXNjcmlwdC5vcmcvc2hvd19idWcuY2dpP2lkPTI0NjVcbiAgICAgIHZhbHVlID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIHZhciBudW1iZXIgPSBFUy5Ub1VpbnQzMih2YWx1ZSk7XG4gICAgICBpZiAobnVtYmVyID09PSAwKSB7XG4gICAgICAgIHJldHVybiAzMjtcbiAgICAgIH1cbiAgICAgIHJldHVybiAzMiAtIChudW1iZXIpLnRvU3RyaW5nKDIpLmxlbmd0aDtcbiAgICB9LFxuXG4gICAgY29zaDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB2YWx1ZSA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAodmFsdWUgPT09IDApIHsgcmV0dXJuIDE7IH0gLy8gKzAgb3IgLTBcbiAgICAgIGlmIChOdW1iZXIuaXNOYU4odmFsdWUpKSB7IHJldHVybiBOYU47IH1cbiAgICAgIGlmICghZ2xvYmFsX2lzRmluaXRlKHZhbHVlKSkgeyByZXR1cm4gSW5maW5pdHk7IH1cbiAgICAgIGlmICh2YWx1ZSA8IDApIHsgdmFsdWUgPSAtdmFsdWU7IH1cbiAgICAgIGlmICh2YWx1ZSA+IDIxKSB7IHJldHVybiBNYXRoLmV4cCh2YWx1ZSkgLyAyOyB9XG4gICAgICByZXR1cm4gKE1hdGguZXhwKHZhbHVlKSArIE1hdGguZXhwKC12YWx1ZSkpIC8gMjtcbiAgICB9LFxuXG4gICAgZXhwbTE6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgdmFsdWUgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKHZhbHVlID09PSAtSW5maW5pdHkpIHsgcmV0dXJuIC0xOyB9XG4gICAgICBpZiAoIWdsb2JhbF9pc0Zpbml0ZSh2YWx1ZSkgfHwgdmFsdWUgPT09IDApIHsgcmV0dXJuIHZhbHVlOyB9XG4gICAgICByZXR1cm4gTWF0aC5leHAodmFsdWUpIC0gMTtcbiAgICB9LFxuXG4gICAgaHlwb3Q6IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICB2YXIgYW55TmFOID0gZmFsc2U7XG4gICAgICB2YXIgYWxsWmVybyA9IHRydWU7XG4gICAgICB2YXIgYW55SW5maW5pdHkgPSBmYWxzZTtcbiAgICAgIHZhciBudW1iZXJzID0gW107XG4gICAgICBBcnJheS5wcm90b3R5cGUuZXZlcnkuY2FsbChhcmd1bWVudHMsIGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgICAgdmFyIG51bSA9IE51bWJlcihhcmcpO1xuICAgICAgICBpZiAoTnVtYmVyLmlzTmFOKG51bSkpIHtcbiAgICAgICAgICBhbnlOYU4gPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKG51bSA9PT0gSW5maW5pdHkgfHwgbnVtID09PSAtSW5maW5pdHkpIHtcbiAgICAgICAgICBhbnlJbmZpbml0eSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAobnVtICE9PSAwKSB7XG4gICAgICAgICAgYWxsWmVybyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhbnlJbmZpbml0eSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmICghYW55TmFOKSB7XG4gICAgICAgICAgbnVtYmVycy5wdXNoKE1hdGguYWJzKG51bSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSk7XG4gICAgICBpZiAoYW55SW5maW5pdHkpIHsgcmV0dXJuIEluZmluaXR5OyB9XG4gICAgICBpZiAoYW55TmFOKSB7IHJldHVybiBOYU47IH1cbiAgICAgIGlmIChhbGxaZXJvKSB7IHJldHVybiAwOyB9XG5cbiAgICAgIG51bWJlcnMuc29ydChmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gYiAtIGE7IH0pO1xuICAgICAgdmFyIGxhcmdlc3QgPSBudW1iZXJzWzBdO1xuICAgICAgdmFyIGRpdmlkZWQgPSBudW1iZXJzLm1hcChmdW5jdGlvbiAobnVtYmVyKSB7IHJldHVybiBudW1iZXIgLyBsYXJnZXN0OyB9KTtcbiAgICAgIHZhciBzdW0gPSBkaXZpZGVkLnJlZHVjZShmdW5jdGlvbiAoc3VtLCBudW1iZXIpIHsgcmV0dXJuIHN1bSArPSBudW1iZXIgKiBudW1iZXI7IH0sIDApO1xuICAgICAgcmV0dXJuIGxhcmdlc3QgKiBNYXRoLnNxcnQoc3VtKTtcbiAgICB9LFxuXG4gICAgbG9nMjogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICByZXR1cm4gTWF0aC5sb2codmFsdWUpICogTWF0aC5MT0cyRTtcbiAgICB9LFxuXG4gICAgbG9nMTA6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIE1hdGgubG9nKHZhbHVlKSAqIE1hdGguTE9HMTBFO1xuICAgIH0sXG5cbiAgICBsb2cxcDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB2YWx1ZSA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAodmFsdWUgPCAtMSB8fCBOdW1iZXIuaXNOYU4odmFsdWUpKSB7IHJldHVybiBOYU47IH1cbiAgICAgIGlmICh2YWx1ZSA9PT0gMCB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHsgcmV0dXJuIHZhbHVlOyB9XG4gICAgICBpZiAodmFsdWUgPT09IC0xKSB7IHJldHVybiAtSW5maW5pdHk7IH1cbiAgICAgIHZhciByZXN1bHQgPSAwO1xuICAgICAgdmFyIG4gPSA1MDtcblxuICAgICAgaWYgKHZhbHVlIDwgMCB8fCB2YWx1ZSA+IDEpIHsgcmV0dXJuIE1hdGgubG9nKDEgKyB2YWx1ZSk7IH1cbiAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGlmICgoaSAlIDIpID09PSAwKSB7XG4gICAgICAgICAgcmVzdWx0IC09IE1hdGgucG93KHZhbHVlLCBpKSAvIGk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0ICs9IE1hdGgucG93KHZhbHVlLCBpKSAvIGk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgc2lnbjogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB2YXIgbnVtYmVyID0gK3ZhbHVlO1xuICAgICAgaWYgKG51bWJlciA9PT0gMCkgeyByZXR1cm4gbnVtYmVyOyB9XG4gICAgICBpZiAoTnVtYmVyLmlzTmFOKG51bWJlcikpIHsgcmV0dXJuIG51bWJlcjsgfVxuICAgICAgcmV0dXJuIG51bWJlciA8IDAgPyAtMSA6IDE7XG4gICAgfSxcblxuICAgIHNpbmg6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgdmFsdWUgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKCFnbG9iYWxfaXNGaW5pdGUodmFsdWUpIHx8IHZhbHVlID09PSAwKSB7IHJldHVybiB2YWx1ZTsgfVxuICAgICAgcmV0dXJuIChNYXRoLmV4cCh2YWx1ZSkgLSBNYXRoLmV4cCgtdmFsdWUpKSAvIDI7XG4gICAgfSxcblxuICAgIHRhbmg6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgdmFsdWUgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKE51bWJlci5pc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IDApIHsgcmV0dXJuIHZhbHVlOyB9XG4gICAgICBpZiAodmFsdWUgPT09IEluZmluaXR5KSB7IHJldHVybiAxOyB9XG4gICAgICBpZiAodmFsdWUgPT09IC1JbmZpbml0eSkgeyByZXR1cm4gLTE7IH1cbiAgICAgIHJldHVybiAoTWF0aC5leHAodmFsdWUpIC0gTWF0aC5leHAoLXZhbHVlKSkgLyAoTWF0aC5leHAodmFsdWUpICsgTWF0aC5leHAoLXZhbHVlKSk7XG4gICAgfSxcblxuICAgIHRydW5jOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhciBudW1iZXIgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgcmV0dXJuIG51bWJlciA8IDAgPyAtTWF0aC5mbG9vcigtbnVtYmVyKSA6IE1hdGguZmxvb3IobnVtYmVyKTtcbiAgICB9LFxuXG4gICAgaW11bDogZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgIC8vIHRha2VuIGZyb20gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvTWF0aC9pbXVsXG4gICAgICB4ID0gRVMuVG9VaW50MzIoeCk7XG4gICAgICB5ID0gRVMuVG9VaW50MzIoeSk7XG4gICAgICB2YXIgYWggID0gKHggPj4+IDE2KSAmIDB4ZmZmZjtcbiAgICAgIHZhciBhbCA9IHggJiAweGZmZmY7XG4gICAgICB2YXIgYmggID0gKHkgPj4+IDE2KSAmIDB4ZmZmZjtcbiAgICAgIHZhciBibCA9IHkgJiAweGZmZmY7XG4gICAgICAvLyB0aGUgc2hpZnQgYnkgMCBmaXhlcyB0aGUgc2lnbiBvbiB0aGUgaGlnaCBwYXJ0XG4gICAgICAvLyB0aGUgZmluYWwgfDAgY29udmVydHMgdGhlIHVuc2lnbmVkIHZhbHVlIGludG8gYSBzaWduZWQgdmFsdWVcbiAgICAgIHJldHVybiAoKGFsICogYmwpICsgKCgoYWggKiBibCArIGFsICogYmgpIDw8IDE2KSA+Pj4gMCl8MCk7XG4gICAgfSxcblxuICAgIGZyb3VuZDogZnVuY3Rpb24gKHgpIHtcbiAgICAgIGlmICh4ID09PSAwIHx8IHggPT09IEluZmluaXR5IHx8IHggPT09IC1JbmZpbml0eSB8fCBOdW1iZXIuaXNOYU4oeCkpIHtcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgICB9XG4gICAgICB2YXIgbnVtID0gTnVtYmVyKHgpO1xuICAgICAgcmV0dXJuIG51bWJlckNvbnZlcnNpb24udG9GbG9hdDMyKG51bSk7XG4gICAgfVxuICB9O1xuICBkZWZpbmVQcm9wZXJ0aWVzKE1hdGgsIE1hdGhTaGltcyk7XG5cbiAgaWYgKE1hdGguaW11bCgweGZmZmZmZmZmLCA1KSAhPT0gLTUpIHtcbiAgICAvLyBTYWZhcmkgNi4xLCBhdCBsZWFzdCwgcmVwb3J0cyBcIjBcIiBmb3IgdGhpcyB2YWx1ZVxuICAgIE1hdGguaW11bCA9IE1hdGhTaGltcy5pbXVsO1xuICB9XG5cbiAgLy8gUHJvbWlzZXNcbiAgLy8gU2ltcGxlc3QgcG9zc2libGUgaW1wbGVtZW50YXRpb247IHVzZSBhIDNyZC1wYXJ0eSBsaWJyYXJ5IGlmIHlvdVxuICAvLyB3YW50IHRoZSBiZXN0IHBvc3NpYmxlIHNwZWVkIGFuZC9vciBsb25nIHN0YWNrIHRyYWNlcy5cbiAgdmFyIFByb21pc2VTaGltID0gKGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBQcm9taXNlLCBQcm9taXNlJHByb3RvdHlwZTtcblxuICAgIEVTLklzUHJvbWlzZSA9IGZ1bmN0aW9uIChwcm9taXNlKSB7XG4gICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChwcm9taXNlKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIXByb21pc2UuX3Byb21pc2VDb25zdHJ1Y3Rvcikge1xuICAgICAgICAvLyBfcHJvbWlzZUNvbnN0cnVjdG9yIGlzIGEgYml0IG1vcmUgdW5pcXVlIHRoYW4gX3N0YXR1cywgc28gd2UnbGxcbiAgICAgICAgLy8gY2hlY2sgdGhhdCBpbnN0ZWFkIG9mIHRoZSBbW1Byb21pc2VTdGF0dXNdXSBpbnRlcm5hbCBmaWVsZC5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwcm9taXNlLl9zdGF0dXMgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gdW5pbml0aWFsaXplZFxuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIC8vIFwiUHJvbWlzZUNhcGFiaWxpdHlcIiBpbiB0aGUgc3BlYyBpcyB3aGF0IG1vc3QgcHJvbWlzZSBpbXBsZW1lbnRhdGlvbnNcbiAgICAvLyBjYWxsIGEgXCJkZWZlcnJlZFwiLlxuICAgIHZhciBQcm9taXNlQ2FwYWJpbGl0eSA9IGZ1bmN0aW9uIChDKSB7XG4gICAgICBpZiAoIUVTLklzQ2FsbGFibGUoQykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYmFkIHByb21pc2UgY29uc3RydWN0b3InKTtcbiAgICAgIH1cbiAgICAgIHZhciBjYXBhYmlsaXR5ID0gdGhpcztcbiAgICAgIHZhciByZXNvbHZlciA9IGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgY2FwYWJpbGl0eS5yZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgICAgY2FwYWJpbGl0eS5yZWplY3QgPSByZWplY3Q7XG4gICAgICB9O1xuICAgICAgY2FwYWJpbGl0eS5wcm9taXNlID0gRVMuQ29uc3RydWN0KEMsIFtyZXNvbHZlcl0pO1xuICAgICAgLy8gc2VlIGh0dHBzOi8vYnVncy5lY21hc2NyaXB0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MjQ3OFxuICAgICAgaWYgKCFjYXBhYmlsaXR5LnByb21pc2UuX2VzNmNvbnN0cnVjdCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdiYWQgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xuICAgICAgfVxuICAgICAgaWYgKCEoRVMuSXNDYWxsYWJsZShjYXBhYmlsaXR5LnJlc29sdmUpICYmXG4gICAgICAgICAgICBFUy5Jc0NhbGxhYmxlKGNhcGFiaWxpdHkucmVqZWN0KSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYmFkIHByb21pc2UgY29uc3RydWN0b3InKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gZmluZCBhbiBhcHByb3ByaWF0ZSBzZXRJbW1lZGlhdGUtYWxpa2VcbiAgICB2YXIgc2V0VGltZW91dCA9IGdsb2JhbHMuc2V0VGltZW91dDtcbiAgICB2YXIgbWFrZVplcm9UaW1lb3V0O1xuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiBFUy5Jc0NhbGxhYmxlKHdpbmRvdy5wb3N0TWVzc2FnZSkpIHtcbiAgICAgIG1ha2VaZXJvVGltZW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gZnJvbSBodHRwOi8vZGJhcm9uLm9yZy9sb2cvMjAxMDAzMDktZmFzdGVyLXRpbWVvdXRzXG4gICAgICAgIHZhciB0aW1lb3V0cyA9IFtdO1xuICAgICAgICB2YXIgbWVzc2FnZU5hbWUgPSAnemVyby10aW1lb3V0LW1lc3NhZ2UnO1xuICAgICAgICB2YXIgc2V0WmVyb1RpbWVvdXQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICB0aW1lb3V0cy5wdXNoKGZuKTtcbiAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UobWVzc2FnZU5hbWUsICcqJyk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBoYW5kbGVNZXNzYWdlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKGV2ZW50LnNvdXJjZSA9PSB3aW5kb3cgJiYgZXZlbnQuZGF0YSA9PSBtZXNzYWdlTmFtZSkge1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBpZiAodGltZW91dHMubGVuZ3RoID09PSAwKSB7IHJldHVybjsgfVxuICAgICAgICAgICAgdmFyIGZuID0gdGltZW91dHMuc2hpZnQoKTtcbiAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGhhbmRsZU1lc3NhZ2UsIHRydWUpO1xuICAgICAgICByZXR1cm4gc2V0WmVyb1RpbWVvdXQ7XG4gICAgICB9O1xuICAgIH1cbiAgICB2YXIgbWFrZVByb21pc2VBc2FwID0gZnVuY3Rpb24gKCkge1xuICAgICAgLy8gQW4gZWZmaWNpZW50IHRhc2stc2NoZWR1bGVyIGJhc2VkIG9uIGEgcHJlLWV4aXN0aW5nIFByb21pc2VcbiAgICAgIC8vIGltcGxlbWVudGF0aW9uLCB3aGljaCB3ZSBjYW4gdXNlIGV2ZW4gaWYgd2Ugb3ZlcnJpZGUgdGhlXG4gICAgICAvLyBnbG9iYWwgUHJvbWlzZSBiZWxvdyAoaW4gb3JkZXIgdG8gd29ya2Fyb3VuZCBidWdzKVxuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL1JheW5vcy9vYnNlcnYtaGFzaC9pc3N1ZXMvMiNpc3N1ZWNvbW1lbnQtMzU4NTc2NzFcbiAgICAgIHZhciBQID0gZ2xvYmFscy5Qcm9taXNlO1xuICAgICAgcmV0dXJuIFAgJiYgUC5yZXNvbHZlICYmIGZ1bmN0aW9uICh0YXNrKSB7XG4gICAgICAgIHJldHVybiBQLnJlc29sdmUoKS50aGVuKHRhc2spO1xuICAgICAgfTtcbiAgICB9O1xuICAgIHZhciBlbnF1ZXVlID0gRVMuSXNDYWxsYWJsZShnbG9iYWxzLnNldEltbWVkaWF0ZSkgP1xuICAgICAgZ2xvYmFscy5zZXRJbW1lZGlhdGUuYmluZChnbG9iYWxzKSA6XG4gICAgICB0eXBlb2YgcHJvY2VzcyA9PT0gJ29iamVjdCcgJiYgcHJvY2Vzcy5uZXh0VGljayA/IHByb2Nlc3MubmV4dFRpY2sgOlxuICAgICAgbWFrZVByb21pc2VBc2FwKCkgfHxcbiAgICAgIChFUy5Jc0NhbGxhYmxlKG1ha2VaZXJvVGltZW91dCkgPyBtYWtlWmVyb1RpbWVvdXQoKSA6XG4gICAgICBmdW5jdGlvbiAodGFzaykgeyBzZXRUaW1lb3V0KHRhc2ssIDApOyB9KTsgLy8gZmFsbGJhY2tcblxuICAgIHZhciB0cmlnZ2VyUHJvbWlzZVJlYWN0aW9ucyA9IGZ1bmN0aW9uIChyZWFjdGlvbnMsIHgpIHtcbiAgICAgIHJlYWN0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChyZWFjdGlvbikge1xuICAgICAgICBlbnF1ZXVlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAvLyBQcm9taXNlUmVhY3Rpb25UYXNrXG4gICAgICAgICAgdmFyIGhhbmRsZXIgPSByZWFjdGlvbi5oYW5kbGVyO1xuICAgICAgICAgIHZhciBjYXBhYmlsaXR5ID0gcmVhY3Rpb24uY2FwYWJpbGl0eTtcbiAgICAgICAgICB2YXIgcmVzb2x2ZSA9IGNhcGFiaWxpdHkucmVzb2x2ZTtcbiAgICAgICAgICB2YXIgcmVqZWN0ID0gY2FwYWJpbGl0eS5yZWplY3Q7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBoYW5kbGVyKHgpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gY2FwYWJpbGl0eS5wcm9taXNlKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3NlbGYgcmVzb2x1dGlvbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHVwZGF0ZVJlc3VsdCA9XG4gICAgICAgICAgICAgIHVwZGF0ZVByb21pc2VGcm9tUG90ZW50aWFsVGhlbmFibGUocmVzdWx0LCBjYXBhYmlsaXR5KTtcbiAgICAgICAgICAgIGlmICghdXBkYXRlUmVzdWx0KSB7XG4gICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgdXBkYXRlUHJvbWlzZUZyb21Qb3RlbnRpYWxUaGVuYWJsZSA9IGZ1bmN0aW9uICh4LCBjYXBhYmlsaXR5KSB7XG4gICAgICBpZiAoIUVTLlR5cGVJc09iamVjdCh4KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICB2YXIgcmVzb2x2ZSA9IGNhcGFiaWxpdHkucmVzb2x2ZTtcbiAgICAgIHZhciByZWplY3QgPSBjYXBhYmlsaXR5LnJlamVjdDtcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciB0aGVuID0geC50aGVuOyAvLyBvbmx5IG9uZSBpbnZvY2F0aW9uIG9mIGFjY2Vzc29yXG4gICAgICAgIGlmICghRVMuSXNDYWxsYWJsZSh0aGVuKSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgdGhlbi5jYWxsKHgsIHJlc29sdmUsIHJlamVjdCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJlamVjdChlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICB2YXIgcHJvbWlzZVJlc29sdXRpb25IYW5kbGVyID0gZnVuY3Rpb24gKHByb21pc2UsIG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgaWYgKHggPT09IHByb21pc2UpIHtcbiAgICAgICAgICByZXR1cm4gb25SZWplY3RlZChuZXcgVHlwZUVycm9yKCdzZWxmIHJlc29sdXRpb24nKSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIEMgPSBwcm9taXNlLl9wcm9taXNlQ29uc3RydWN0b3I7XG4gICAgICAgIHZhciBjYXBhYmlsaXR5ID0gbmV3IFByb21pc2VDYXBhYmlsaXR5KEMpO1xuICAgICAgICB2YXIgdXBkYXRlUmVzdWx0ID0gdXBkYXRlUHJvbWlzZUZyb21Qb3RlbnRpYWxUaGVuYWJsZSh4LCBjYXBhYmlsaXR5KTtcbiAgICAgICAgaWYgKHVwZGF0ZVJlc3VsdCkge1xuICAgICAgICAgIHJldHVybiBjYXBhYmlsaXR5LnByb21pc2UudGhlbihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIG9uRnVsZmlsbGVkKHgpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH07XG5cbiAgICBQcm9taXNlID0gZnVuY3Rpb24gKHJlc29sdmVyKSB7XG4gICAgICB2YXIgcHJvbWlzZSA9IHRoaXM7XG4gICAgICBwcm9taXNlID0gZW11bGF0ZUVTNmNvbnN0cnVjdChwcm9taXNlKTtcbiAgICAgIGlmICghcHJvbWlzZS5fcHJvbWlzZUNvbnN0cnVjdG9yKSB7XG4gICAgICAgIC8vIHdlIHVzZSBfcHJvbWlzZUNvbnN0cnVjdG9yIGFzIGEgc3RhbmQtaW4gZm9yIHRoZSBpbnRlcm5hbFxuICAgICAgICAvLyBbW1Byb21pc2VTdGF0dXNdXSBmaWVsZDsgaXQncyBhIGxpdHRsZSBtb3JlIHVuaXF1ZS5cbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYmFkIHByb21pc2UnKTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgcHJvbWlzZS5fc3RhdHVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdwcm9taXNlIGFscmVhZHkgaW5pdGlhbGl6ZWQnKTtcbiAgICAgIH1cbiAgICAgIC8vIHNlZSBodHRwczovL2J1Z3MuZWNtYXNjcmlwdC5vcmcvc2hvd19idWcuY2dpP2lkPTI0ODJcbiAgICAgIGlmICghRVMuSXNDYWxsYWJsZShyZXNvbHZlcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbm90IGEgdmFsaWQgcmVzb2x2ZXInKTtcbiAgICAgIH1cbiAgICAgIHByb21pc2UuX3N0YXR1cyA9ICd1bnJlc29sdmVkJztcbiAgICAgIHByb21pc2UuX3Jlc29sdmVSZWFjdGlvbnMgPSBbXTtcbiAgICAgIHByb21pc2UuX3JlamVjdFJlYWN0aW9ucyA9IFtdO1xuXG4gICAgICB2YXIgcmVzb2x2ZSA9IGZ1bmN0aW9uIChyZXNvbHV0aW9uKSB7XG4gICAgICAgIGlmIChwcm9taXNlLl9zdGF0dXMgIT09ICd1bnJlc29sdmVkJykgeyByZXR1cm47IH1cbiAgICAgICAgdmFyIHJlYWN0aW9ucyA9IHByb21pc2UuX3Jlc29sdmVSZWFjdGlvbnM7XG4gICAgICAgIHByb21pc2UuX3Jlc3VsdCA9IHJlc29sdXRpb247XG4gICAgICAgIHByb21pc2UuX3Jlc29sdmVSZWFjdGlvbnMgPSB2b2lkIDA7XG4gICAgICAgIHByb21pc2UuX3JlamVjdFJlYWN0aW9ucyA9IHZvaWQgMDtcbiAgICAgICAgcHJvbWlzZS5fc3RhdHVzID0gJ2hhcy1yZXNvbHV0aW9uJztcbiAgICAgICAgdHJpZ2dlclByb21pc2VSZWFjdGlvbnMocmVhY3Rpb25zLCByZXNvbHV0aW9uKTtcbiAgICAgIH07XG4gICAgICB2YXIgcmVqZWN0ID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICBpZiAocHJvbWlzZS5fc3RhdHVzICE9PSAndW5yZXNvbHZlZCcpIHsgcmV0dXJuOyB9XG4gICAgICAgIHZhciByZWFjdGlvbnMgPSBwcm9taXNlLl9yZWplY3RSZWFjdGlvbnM7XG4gICAgICAgIHByb21pc2UuX3Jlc3VsdCA9IHJlYXNvbjtcbiAgICAgICAgcHJvbWlzZS5fcmVzb2x2ZVJlYWN0aW9ucyA9IHZvaWQgMDtcbiAgICAgICAgcHJvbWlzZS5fcmVqZWN0UmVhY3Rpb25zID0gdm9pZCAwO1xuICAgICAgICBwcm9taXNlLl9zdGF0dXMgPSAnaGFzLXJlamVjdGlvbic7XG4gICAgICAgIHRyaWdnZXJQcm9taXNlUmVhY3Rpb25zKHJlYWN0aW9ucywgcmVhc29uKTtcbiAgICAgIH07XG4gICAgICB0cnkge1xuICAgICAgICByZXNvbHZlcihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZWplY3QoZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9O1xuICAgIFByb21pc2UkcHJvdG90eXBlID0gUHJvbWlzZS5wcm90b3R5cGU7XG4gICAgZGVmaW5lUHJvcGVydGllcyhQcm9taXNlLCB7XG4gICAgICAnQEBjcmVhdGUnOiBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHZhciBjb25zdHJ1Y3RvciA9IHRoaXM7XG4gICAgICAgIC8vIEFsbG9jYXRlUHJvbWlzZVxuICAgICAgICAvLyBUaGUgYG9iamAgcGFyYW1ldGVyIGlzIGEgaGFjayB3ZSB1c2UgZm9yIGVzNVxuICAgICAgICAvLyBjb21wYXRpYmlsaXR5LlxuICAgICAgICB2YXIgcHJvdG90eXBlID0gY29uc3RydWN0b3IucHJvdG90eXBlIHx8IFByb21pc2UkcHJvdG90eXBlO1xuICAgICAgICBvYmogPSBvYmogfHwgY3JlYXRlKHByb3RvdHlwZSk7XG4gICAgICAgIGRlZmluZVByb3BlcnRpZXMob2JqLCB7XG4gICAgICAgICAgX3N0YXR1czogdm9pZCAwLFxuICAgICAgICAgIF9yZXN1bHQ6IHZvaWQgMCxcbiAgICAgICAgICBfcmVzb2x2ZVJlYWN0aW9uczogdm9pZCAwLFxuICAgICAgICAgIF9yZWplY3RSZWFjdGlvbnM6IHZvaWQgMCxcbiAgICAgICAgICBfcHJvbWlzZUNvbnN0cnVjdG9yOiB2b2lkIDBcbiAgICAgICAgfSk7XG4gICAgICAgIG9iai5fcHJvbWlzZUNvbnN0cnVjdG9yID0gY29uc3RydWN0b3I7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgX3Byb21pc2VBbGxSZXNvbHZlciA9IGZ1bmN0aW9uIChpbmRleCwgdmFsdWVzLCBjYXBhYmlsaXR5LCByZW1haW5pbmcpIHtcbiAgICAgIHZhciBkb25lID0gZmFsc2U7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgaWYgKGRvbmUpIHsgcmV0dXJuOyB9IC8vIHByb3RlY3QgYWdhaW5zdCBiZWluZyBjYWxsZWQgbXVsdGlwbGUgdGltZXNcbiAgICAgICAgZG9uZSA9IHRydWU7XG4gICAgICAgIHZhbHVlc1tpbmRleF0gPSB4O1xuICAgICAgICBpZiAoKC0tcmVtYWluaW5nLmNvdW50KSA9PT0gMCkge1xuICAgICAgICAgIHZhciByZXNvbHZlID0gY2FwYWJpbGl0eS5yZXNvbHZlO1xuICAgICAgICAgIHJlc29sdmUodmFsdWVzKTsgLy8gY2FsbCB3LyB0aGlzPT09dW5kZWZpbmVkXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfTtcblxuICAgIFByb21pc2UuYWxsID0gZnVuY3Rpb24gKGl0ZXJhYmxlKSB7XG4gICAgICB2YXIgQyA9IHRoaXM7XG4gICAgICB2YXIgY2FwYWJpbGl0eSA9IG5ldyBQcm9taXNlQ2FwYWJpbGl0eShDKTtcbiAgICAgIHZhciByZXNvbHZlID0gY2FwYWJpbGl0eS5yZXNvbHZlO1xuICAgICAgdmFyIHJlamVjdCA9IGNhcGFiaWxpdHkucmVqZWN0O1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKCFFUy5Jc0l0ZXJhYmxlKGl0ZXJhYmxlKSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2JhZCBpdGVyYWJsZScpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpdCA9IEVTLkdldEl0ZXJhdG9yKGl0ZXJhYmxlKTtcbiAgICAgICAgdmFyIHZhbHVlcyA9IFtdLCByZW1haW5pbmcgPSB7IGNvdW50OiAxIH07XG4gICAgICAgIGZvciAodmFyIGluZGV4ID0gMDsgOyBpbmRleCsrKSB7XG4gICAgICAgICAgdmFyIG5leHQgPSBFUy5JdGVyYXRvck5leHQoaXQpO1xuICAgICAgICAgIGlmIChuZXh0LmRvbmUpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgbmV4dFByb21pc2UgPSBDLnJlc29sdmUobmV4dC52YWx1ZSk7XG4gICAgICAgICAgdmFyIHJlc29sdmVFbGVtZW50ID0gX3Byb21pc2VBbGxSZXNvbHZlcihcbiAgICAgICAgICAgIGluZGV4LCB2YWx1ZXMsIGNhcGFiaWxpdHksIHJlbWFpbmluZ1xuICAgICAgICAgICk7XG4gICAgICAgICAgcmVtYWluaW5nLmNvdW50Kys7XG4gICAgICAgICAgbmV4dFByb21pc2UudGhlbihyZXNvbHZlRWxlbWVudCwgY2FwYWJpbGl0eS5yZWplY3QpO1xuICAgICAgICB9XG4gICAgICAgIGlmICgoLS1yZW1haW5pbmcuY291bnQpID09PSAwKSB7XG4gICAgICAgICAgcmVzb2x2ZSh2YWx1ZXMpOyAvLyBjYWxsIHcvIHRoaXM9PT11bmRlZmluZWRcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZWplY3QoZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY2FwYWJpbGl0eS5wcm9taXNlO1xuICAgIH07XG5cbiAgICBQcm9taXNlLnJhY2UgPSBmdW5jdGlvbiAoaXRlcmFibGUpIHtcbiAgICAgIHZhciBDID0gdGhpcztcbiAgICAgIHZhciBjYXBhYmlsaXR5ID0gbmV3IFByb21pc2VDYXBhYmlsaXR5KEMpO1xuICAgICAgdmFyIHJlc29sdmUgPSBjYXBhYmlsaXR5LnJlc29sdmU7XG4gICAgICB2YXIgcmVqZWN0ID0gY2FwYWJpbGl0eS5yZWplY3Q7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAoIUVTLklzSXRlcmFibGUoaXRlcmFibGUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYmFkIGl0ZXJhYmxlJyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGl0ID0gRVMuR2V0SXRlcmF0b3IoaXRlcmFibGUpO1xuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgIHZhciBuZXh0ID0gRVMuSXRlcmF0b3JOZXh0KGl0KTtcbiAgICAgICAgICBpZiAobmV4dC5kb25lKSB7XG4gICAgICAgICAgICAvLyBJZiBpdGVyYWJsZSBoYXMgbm8gaXRlbXMsIHJlc3VsdGluZyBwcm9taXNlIHdpbGwgbmV2ZXJcbiAgICAgICAgICAgIC8vIHJlc29sdmU7IHNlZTpcbiAgICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9kb21lbmljL3Byb21pc2VzLXVud3JhcHBpbmcvaXNzdWVzLzc1XG4gICAgICAgICAgICAvLyBodHRwczovL2J1Z3MuZWNtYXNjcmlwdC5vcmcvc2hvd19idWcuY2dpP2lkPTI1MTVcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgbmV4dFByb21pc2UgPSBDLnJlc29sdmUobmV4dC52YWx1ZSk7XG4gICAgICAgICAgbmV4dFByb21pc2UudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJlamVjdChlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjYXBhYmlsaXR5LnByb21pc2U7XG4gICAgfTtcblxuICAgIFByb21pc2UucmVqZWN0ID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgdmFyIEMgPSB0aGlzO1xuICAgICAgdmFyIGNhcGFiaWxpdHkgPSBuZXcgUHJvbWlzZUNhcGFiaWxpdHkoQyk7XG4gICAgICB2YXIgcmVqZWN0ID0gY2FwYWJpbGl0eS5yZWplY3Q7XG4gICAgICByZWplY3QocmVhc29uKTsgLy8gY2FsbCB3aXRoIHRoaXM9PT11bmRlZmluZWRcbiAgICAgIHJldHVybiBjYXBhYmlsaXR5LnByb21pc2U7XG4gICAgfTtcblxuICAgIFByb21pc2UucmVzb2x2ZSA9IGZ1bmN0aW9uICh2KSB7XG4gICAgICB2YXIgQyA9IHRoaXM7XG4gICAgICBpZiAoRVMuSXNQcm9taXNlKHYpKSB7XG4gICAgICAgIHZhciBjb25zdHJ1Y3RvciA9IHYuX3Byb21pc2VDb25zdHJ1Y3RvcjtcbiAgICAgICAgaWYgKGNvbnN0cnVjdG9yID09PSBDKSB7IHJldHVybiB2OyB9XG4gICAgICB9XG4gICAgICB2YXIgY2FwYWJpbGl0eSA9IG5ldyBQcm9taXNlQ2FwYWJpbGl0eShDKTtcbiAgICAgIHZhciByZXNvbHZlID0gY2FwYWJpbGl0eS5yZXNvbHZlO1xuICAgICAgcmVzb2x2ZSh2KTsgLy8gY2FsbCB3aXRoIHRoaXM9PT11bmRlZmluZWRcbiAgICAgIHJldHVybiBjYXBhYmlsaXR5LnByb21pc2U7XG4gICAgfTtcblxuICAgIFByb21pc2UucHJvdG90eXBlWydjYXRjaCddID0gZnVuY3Rpb24gKG9uUmVqZWN0ZWQpIHtcbiAgICAgIHJldHVybiB0aGlzLnRoZW4odm9pZCAwLCBvblJlamVjdGVkKTtcbiAgICB9O1xuXG4gICAgUHJvbWlzZS5wcm90b3R5cGUudGhlbiA9IGZ1bmN0aW9uIChvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkge1xuICAgICAgdmFyIHByb21pc2UgPSB0aGlzO1xuICAgICAgaWYgKCFFUy5Jc1Byb21pc2UocHJvbWlzZSkpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcignbm90IGEgcHJvbWlzZScpOyB9XG4gICAgICAvLyB0aGlzLmNvbnN0cnVjdG9yIG5vdCB0aGlzLl9wcm9taXNlQ29uc3RydWN0b3I7IHNlZVxuICAgICAgLy8gaHR0cHM6Ly9idWdzLmVjbWFzY3JpcHQub3JnL3Nob3dfYnVnLmNnaT9pZD0yNTEzXG4gICAgICB2YXIgQyA9IHRoaXMuY29uc3RydWN0b3I7XG4gICAgICB2YXIgY2FwYWJpbGl0eSA9IG5ldyBQcm9taXNlQ2FwYWJpbGl0eShDKTtcbiAgICAgIGlmICghRVMuSXNDYWxsYWJsZShvblJlamVjdGVkKSkge1xuICAgICAgICBvblJlamVjdGVkID0gZnVuY3Rpb24gKGUpIHsgdGhyb3cgZTsgfTtcbiAgICAgIH1cbiAgICAgIGlmICghRVMuSXNDYWxsYWJsZShvbkZ1bGZpbGxlZCkpIHtcbiAgICAgICAgb25GdWxmaWxsZWQgPSBmdW5jdGlvbiAoeCkgeyByZXR1cm4geDsgfTtcbiAgICAgIH1cbiAgICAgIHZhciByZXNvbHV0aW9uSGFuZGxlciA9XG4gICAgICAgIHByb21pc2VSZXNvbHV0aW9uSGFuZGxlcihwcm9taXNlLCBvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCk7XG4gICAgICB2YXIgcmVzb2x2ZVJlYWN0aW9uID1cbiAgICAgICAgeyBjYXBhYmlsaXR5OiBjYXBhYmlsaXR5LCBoYW5kbGVyOiByZXNvbHV0aW9uSGFuZGxlciB9O1xuICAgICAgdmFyIHJlamVjdFJlYWN0aW9uID1cbiAgICAgICAgeyBjYXBhYmlsaXR5OiBjYXBhYmlsaXR5LCBoYW5kbGVyOiBvblJlamVjdGVkIH07XG4gICAgICBzd2l0Y2ggKHByb21pc2UuX3N0YXR1cykge1xuICAgICAgY2FzZSAndW5yZXNvbHZlZCc6XG4gICAgICAgIHByb21pc2UuX3Jlc29sdmVSZWFjdGlvbnMucHVzaChyZXNvbHZlUmVhY3Rpb24pO1xuICAgICAgICBwcm9taXNlLl9yZWplY3RSZWFjdGlvbnMucHVzaChyZWplY3RSZWFjdGlvbik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnaGFzLXJlc29sdXRpb24nOlxuICAgICAgICB0cmlnZ2VyUHJvbWlzZVJlYWN0aW9ucyhbcmVzb2x2ZVJlYWN0aW9uXSwgcHJvbWlzZS5fcmVzdWx0KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdoYXMtcmVqZWN0aW9uJzpcbiAgICAgICAgdHJpZ2dlclByb21pc2VSZWFjdGlvbnMoW3JlamVjdFJlYWN0aW9uXSwgcHJvbWlzZS5fcmVzdWx0KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCd1bmV4cGVjdGVkJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY2FwYWJpbGl0eS5wcm9taXNlO1xuICAgIH07XG5cbiAgICByZXR1cm4gUHJvbWlzZTtcbiAgfSkoKTtcblxuICAvLyBDaHJvbWUncyBuYXRpdmUgUHJvbWlzZSBoYXMgZXh0cmEgbWV0aG9kcyB0aGF0IGl0IHNob3VsZG4ndCBoYXZlLiBMZXQncyByZW1vdmUgdGhlbS5cbiAgaWYgKGdsb2JhbHMuUHJvbWlzZSkge1xuICAgIGRlbGV0ZSBnbG9iYWxzLlByb21pc2UuYWNjZXB0O1xuICAgIGRlbGV0ZSBnbG9iYWxzLlByb21pc2UuZGVmZXI7XG4gICAgZGVsZXRlIGdsb2JhbHMuUHJvbWlzZS5wcm90b3R5cGUuY2hhaW47XG4gIH1cblxuICAvLyBleHBvcnQgdGhlIFByb21pc2UgY29uc3RydWN0b3IuXG4gIGRlZmluZVByb3BlcnRpZXMoZ2xvYmFscywgeyBQcm9taXNlOiBQcm9taXNlU2hpbSB9KTtcbiAgLy8gSW4gQ2hyb21lIDMzIChhbmQgdGhlcmVhYm91dHMpIFByb21pc2UgaXMgZGVmaW5lZCwgYnV0IHRoZVxuICAvLyBpbXBsZW1lbnRhdGlvbiBpcyBidWdneSBpbiBhIG51bWJlciBvZiB3YXlzLiAgTGV0J3MgY2hlY2sgc3ViY2xhc3NpbmdcbiAgLy8gc3VwcG9ydCB0byBzZWUgaWYgd2UgaGF2ZSBhIGJ1Z2d5IGltcGxlbWVudGF0aW9uLlxuICB2YXIgcHJvbWlzZVN1cHBvcnRzU3ViY2xhc3NpbmcgPSBzdXBwb3J0c1N1YmNsYXNzaW5nKGdsb2JhbHMuUHJvbWlzZSwgZnVuY3Rpb24gKFMpIHtcbiAgICByZXR1cm4gUy5yZXNvbHZlKDQyKSBpbnN0YW5jZW9mIFM7XG4gIH0pO1xuICB2YXIgcHJvbWlzZUlnbm9yZXNOb25GdW5jdGlvblRoZW5DYWxsYmFja3MgPSAoZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICBnbG9iYWxzLlByb21pc2UucmVqZWN0KDQyKS50aGVuKG51bGwsIDUpLnRoZW4obnVsbCwgZnVuY3Rpb24gKCkge30pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH0oKSk7XG4gIHZhciBwcm9taXNlUmVxdWlyZXNPYmplY3RDb250ZXh0ID0gKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkgeyBQcm9taXNlLmNhbGwoMywgZnVuY3Rpb24gKCkge30pOyB9IGNhdGNoIChlKSB7IHJldHVybiB0cnVlOyB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KCkpO1xuICBpZiAoIXByb21pc2VTdXBwb3J0c1N1YmNsYXNzaW5nIHx8ICFwcm9taXNlSWdub3Jlc05vbkZ1bmN0aW9uVGhlbkNhbGxiYWNrcyB8fCAhcHJvbWlzZVJlcXVpcmVzT2JqZWN0Q29udGV4dCkge1xuICAgIGdsb2JhbHMuUHJvbWlzZSA9IFByb21pc2VTaGltO1xuICB9XG5cbiAgLy8gTWFwIGFuZCBTZXQgcmVxdWlyZSBhIHRydWUgRVM1IGVudmlyb25tZW50XG4gIC8vIFRoZWlyIGZhc3QgcGF0aCBhbHNvIHJlcXVpcmVzIHRoYXQgdGhlIGVudmlyb25tZW50IHByZXNlcnZlXG4gIC8vIHByb3BlcnR5IGluc2VydGlvbiBvcmRlciwgd2hpY2ggaXMgbm90IGd1YXJhbnRlZWQgYnkgdGhlIHNwZWMuXG4gIHZhciB0ZXN0T3JkZXIgPSBmdW5jdGlvbiAoYSkge1xuICAgIHZhciBiID0gT2JqZWN0LmtleXMoYS5yZWR1Y2UoZnVuY3Rpb24gKG8sIGspIHtcbiAgICAgIG9ba10gPSB0cnVlO1xuICAgICAgcmV0dXJuIG87XG4gICAgfSwge30pKTtcbiAgICByZXR1cm4gYS5qb2luKCc6JykgPT09IGIuam9pbignOicpO1xuICB9O1xuICB2YXIgcHJlc2VydmVzSW5zZXJ0aW9uT3JkZXIgPSB0ZXN0T3JkZXIoWyd6JywgJ2EnLCAnYmInXSk7XG4gIC8vIHNvbWUgZW5naW5lcyAoZWcsIENocm9tZSkgb25seSBwcmVzZXJ2ZSBpbnNlcnRpb24gb3JkZXIgZm9yIHN0cmluZyBrZXlzXG4gIHZhciBwcmVzZXJ2ZXNOdW1lcmljSW5zZXJ0aW9uT3JkZXIgPSB0ZXN0T3JkZXIoWyd6JywgMSwgJ2EnLCAnMycsIDJdKTtcblxuICBpZiAoc3VwcG9ydHNEZXNjcmlwdG9ycykge1xuXG4gICAgdmFyIGZhc3RrZXkgPSBmdW5jdGlvbiBmYXN0a2V5KGtleSkge1xuICAgICAgaWYgKCFwcmVzZXJ2ZXNJbnNlcnRpb25PcmRlcikge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHZhciB0eXBlID0gdHlwZW9mIGtleTtcbiAgICAgIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gJyQnICsga2V5O1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJykge1xuICAgICAgICAvLyBub3RlIHRoYXQgLTAgd2lsbCBnZXQgY29lcmNlZCB0byBcIjBcIiB3aGVuIHVzZWQgYXMgYSBwcm9wZXJ0eSBrZXlcbiAgICAgICAgaWYgKCFwcmVzZXJ2ZXNOdW1lcmljSW5zZXJ0aW9uT3JkZXIpIHtcbiAgICAgICAgICByZXR1cm4gJ24nICsga2V5O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBrZXk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9O1xuXG4gICAgdmFyIGVtcHR5T2JqZWN0ID0gZnVuY3Rpb24gZW1wdHlPYmplY3QoKSB7XG4gICAgICAvLyBhY2NvbW9kYXRlIHNvbWUgb2xkZXIgbm90LXF1aXRlLUVTNSBicm93c2Vyc1xuICAgICAgcmV0dXJuIE9iamVjdC5jcmVhdGUgPyBPYmplY3QuY3JlYXRlKG51bGwpIDoge307XG4gICAgfTtcblxuICAgIHZhciBjb2xsZWN0aW9uU2hpbXMgPSB7XG4gICAgICBNYXA6IChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgdmFyIGVtcHR5ID0ge307XG5cbiAgICAgICAgZnVuY3Rpb24gTWFwRW50cnkoa2V5LCB2YWx1ZSkge1xuICAgICAgICAgIHRoaXMua2V5ID0ga2V5O1xuICAgICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICB0aGlzLm5leHQgPSBudWxsO1xuICAgICAgICAgIHRoaXMucHJldiA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBNYXBFbnRyeS5wcm90b3R5cGUuaXNSZW1vdmVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmtleSA9PT0gZW1wdHk7XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gTWFwSXRlcmF0b3IobWFwLCBraW5kKSB7XG4gICAgICAgICAgdGhpcy5oZWFkID0gbWFwLl9oZWFkO1xuICAgICAgICAgIHRoaXMuaSA9IHRoaXMuaGVhZDtcbiAgICAgICAgICB0aGlzLmtpbmQgPSBraW5kO1xuICAgICAgICB9XG5cbiAgICAgICAgTWFwSXRlcmF0b3IucHJvdG90eXBlID0ge1xuICAgICAgICAgIG5leHQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBpID0gdGhpcy5pLCBraW5kID0gdGhpcy5raW5kLCBoZWFkID0gdGhpcy5oZWFkLCByZXN1bHQ7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuaSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2hpbGUgKGkuaXNSZW1vdmVkKCkgJiYgaSAhPT0gaGVhZCkge1xuICAgICAgICAgICAgICAvLyBiYWNrIHVwIG9mZiBvZiByZW1vdmVkIGVudHJpZXNcbiAgICAgICAgICAgICAgaSA9IGkucHJldjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGFkdmFuY2UgdG8gbmV4dCB1bnJldHVybmVkIGVsZW1lbnQuXG4gICAgICAgICAgICB3aGlsZSAoaS5uZXh0ICE9PSBoZWFkKSB7XG4gICAgICAgICAgICAgIGkgPSBpLm5leHQ7XG4gICAgICAgICAgICAgIGlmICghaS5pc1JlbW92ZWQoKSkge1xuICAgICAgICAgICAgICAgIGlmIChraW5kID09PSAna2V5Jykge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gaS5rZXk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChraW5kID09PSAndmFsdWUnKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQgPSBpLnZhbHVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQgPSBbaS5rZXksIGkudmFsdWVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmkgPSBpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiByZXN1bHQsIGRvbmU6IGZhbHNlIH07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIG9uY2UgdGhlIGl0ZXJhdG9yIGlzIGRvbmUsIGl0IGlzIGRvbmUgZm9yZXZlci5cbiAgICAgICAgICAgIHRoaXMuaSA9IHZvaWQgMDtcbiAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGFkZEl0ZXJhdG9yKE1hcEl0ZXJhdG9yLnByb3RvdHlwZSk7XG5cbiAgICAgICAgZnVuY3Rpb24gTWFwKGl0ZXJhYmxlKSB7XG4gICAgICAgICAgdmFyIG1hcCA9IHRoaXM7XG4gICAgICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QobWFwKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignTWFwIGRvZXMgbm90IGFjY2VwdCBhcmd1bWVudHMgd2hlbiBjYWxsZWQgYXMgYSBmdW5jdGlvbicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBtYXAgPSBlbXVsYXRlRVM2Y29uc3RydWN0KG1hcCk7XG4gICAgICAgICAgaWYgKCFtYXAuX2VzNm1hcCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYmFkIG1hcCcpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBoZWFkID0gbmV3IE1hcEVudHJ5KG51bGwsIG51bGwpO1xuICAgICAgICAgIC8vIGNpcmN1bGFyIGRvdWJseS1saW5rZWQgbGlzdC5cbiAgICAgICAgICBoZWFkLm5leHQgPSBoZWFkLnByZXYgPSBoZWFkO1xuXG4gICAgICAgICAgZGVmaW5lUHJvcGVydGllcyhtYXAsIHtcbiAgICAgICAgICAgIF9oZWFkOiBoZWFkLFxuICAgICAgICAgICAgX3N0b3JhZ2U6IGVtcHR5T2JqZWN0KCksXG4gICAgICAgICAgICBfc2l6ZTogMFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gT3B0aW9uYWxseSBpbml0aWFsaXplIG1hcCBmcm9tIGl0ZXJhYmxlXG4gICAgICAgICAgaWYgKHR5cGVvZiBpdGVyYWJsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgaXRlcmFibGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHZhciBpdCA9IEVTLkdldEl0ZXJhdG9yKGl0ZXJhYmxlKTtcbiAgICAgICAgICAgIHZhciBhZGRlciA9IG1hcC5zZXQ7XG4gICAgICAgICAgICBpZiAoIUVTLklzQ2FsbGFibGUoYWRkZXIpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ2JhZCBtYXAnKTsgfVxuICAgICAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgICAgdmFyIG5leHQgPSBFUy5JdGVyYXRvck5leHQoaXQpO1xuICAgICAgICAgICAgICBpZiAobmV4dC5kb25lKSB7IGJyZWFrOyB9XG4gICAgICAgICAgICAgIHZhciBuZXh0SXRlbSA9IG5leHQudmFsdWU7XG4gICAgICAgICAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KG5leHRJdGVtKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2V4cGVjdGVkIGl0ZXJhYmxlIG9mIHBhaXJzJyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgYWRkZXIuY2FsbChtYXAsIG5leHRJdGVtWzBdLCBuZXh0SXRlbVsxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBtYXA7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIE1hcCRwcm90b3R5cGUgPSBNYXAucHJvdG90eXBlO1xuICAgICAgICBkZWZpbmVQcm9wZXJ0aWVzKE1hcCwge1xuICAgICAgICAgICdAQGNyZWF0ZSc6IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgICAgIHZhciBjb25zdHJ1Y3RvciA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgcHJvdG90eXBlID0gY29uc3RydWN0b3IucHJvdG90eXBlIHx8IE1hcCRwcm90b3R5cGU7XG4gICAgICAgICAgICBvYmogPSBvYmogfHwgY3JlYXRlKHByb3RvdHlwZSk7XG4gICAgICAgICAgICBkZWZpbmVQcm9wZXJ0aWVzKG9iaiwgeyBfZXM2bWFwOiB0cnVlIH0pO1xuICAgICAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShNYXAucHJvdG90eXBlLCAnc2l6ZScsIHtcbiAgICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuX3NpemUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3NpemUgbWV0aG9kIGNhbGxlZCBvbiBpbmNvbXBhdGlibGUgTWFwJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc2l6ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGRlZmluZVByb3BlcnRpZXMoTWFwLnByb3RvdHlwZSwge1xuICAgICAgICAgIGdldDogZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgdmFyIGZrZXkgPSBmYXN0a2V5KGtleSk7XG4gICAgICAgICAgICBpZiAoZmtleSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAvLyBmYXN0IE8oMSkgcGF0aFxuICAgICAgICAgICAgICB2YXIgZW50cnkgPSB0aGlzLl9zdG9yYWdlW2ZrZXldO1xuICAgICAgICAgICAgICBpZiAoZW50cnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZW50cnkudmFsdWU7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaGVhZCA9IHRoaXMuX2hlYWQsIGkgPSBoZWFkO1xuICAgICAgICAgICAgd2hpbGUgKChpID0gaS5uZXh0KSAhPT0gaGVhZCkge1xuICAgICAgICAgICAgICBpZiAoRVMuU2FtZVZhbHVlWmVybyhpLmtleSwga2V5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpLnZhbHVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGhhczogZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgdmFyIGZrZXkgPSBmYXN0a2V5KGtleSk7XG4gICAgICAgICAgICBpZiAoZmtleSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAvLyBmYXN0IE8oMSkgcGF0aFxuICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIHRoaXMuX3N0b3JhZ2VbZmtleV0gIT09ICd1bmRlZmluZWQnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGhlYWQgPSB0aGlzLl9oZWFkLCBpID0gaGVhZDtcbiAgICAgICAgICAgIHdoaWxlICgoaSA9IGkubmV4dCkgIT09IGhlYWQpIHtcbiAgICAgICAgICAgICAgaWYgKEVTLlNhbWVWYWx1ZVplcm8oaS5rZXksIGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBzZXQ6IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gICAgICAgICAgICB2YXIgaGVhZCA9IHRoaXMuX2hlYWQsIGkgPSBoZWFkLCBlbnRyeTtcbiAgICAgICAgICAgIHZhciBma2V5ID0gZmFzdGtleShrZXkpO1xuICAgICAgICAgICAgaWYgKGZrZXkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgLy8gZmFzdCBPKDEpIHBhdGhcbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9zdG9yYWdlW2ZrZXldICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2VbZmtleV0udmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbnRyeSA9IHRoaXMuX3N0b3JhZ2VbZmtleV0gPSBuZXcgTWFwRW50cnkoa2V5LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaSA9IGhlYWQucHJldjtcbiAgICAgICAgICAgICAgICAvLyBmYWxsIHRocm91Z2hcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2hpbGUgKChpID0gaS5uZXh0KSAhPT0gaGVhZCkge1xuICAgICAgICAgICAgICBpZiAoRVMuU2FtZVZhbHVlWmVybyhpLmtleSwga2V5KSkge1xuICAgICAgICAgICAgICAgIGkudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZW50cnkgPSBlbnRyeSB8fCBuZXcgTWFwRW50cnkoa2V5LCB2YWx1ZSk7XG4gICAgICAgICAgICBpZiAoRVMuU2FtZVZhbHVlKC0wLCBrZXkpKSB7XG4gICAgICAgICAgICAgIGVudHJ5LmtleSA9ICswOyAvLyBjb2VyY2UgLTAgdG8gKzAgaW4gZW50cnlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVudHJ5Lm5leHQgPSB0aGlzLl9oZWFkO1xuICAgICAgICAgICAgZW50cnkucHJldiA9IHRoaXMuX2hlYWQucHJldjtcbiAgICAgICAgICAgIGVudHJ5LnByZXYubmV4dCA9IGVudHJ5O1xuICAgICAgICAgICAgZW50cnkubmV4dC5wcmV2ID0gZW50cnk7XG4gICAgICAgICAgICB0aGlzLl9zaXplICs9IDE7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgJ2RlbGV0ZSc6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIHZhciBoZWFkID0gdGhpcy5faGVhZCwgaSA9IGhlYWQ7XG4gICAgICAgICAgICB2YXIgZmtleSA9IGZhc3RrZXkoa2V5KTtcbiAgICAgICAgICAgIGlmIChma2V5ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIC8vIGZhc3QgTygxKSBwYXRoXG4gICAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5fc3RvcmFnZVtma2V5XSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaSA9IHRoaXMuX3N0b3JhZ2VbZmtleV0ucHJldjtcbiAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX3N0b3JhZ2VbZmtleV07XG4gICAgICAgICAgICAgIC8vIGZhbGwgdGhyb3VnaFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2hpbGUgKChpID0gaS5uZXh0KSAhPT0gaGVhZCkge1xuICAgICAgICAgICAgICBpZiAoRVMuU2FtZVZhbHVlWmVybyhpLmtleSwga2V5KSkge1xuICAgICAgICAgICAgICAgIGkua2V5ID0gaS52YWx1ZSA9IGVtcHR5O1xuICAgICAgICAgICAgICAgIGkucHJldi5uZXh0ID0gaS5uZXh0O1xuICAgICAgICAgICAgICAgIGkubmV4dC5wcmV2ID0gaS5wcmV2O1xuICAgICAgICAgICAgICAgIHRoaXMuX3NpemUgLT0gMTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBjbGVhcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fc2l6ZSA9IDA7XG4gICAgICAgICAgICB0aGlzLl9zdG9yYWdlID0gZW1wdHlPYmplY3QoKTtcbiAgICAgICAgICAgIHZhciBoZWFkID0gdGhpcy5faGVhZCwgaSA9IGhlYWQsIHAgPSBpLm5leHQ7XG4gICAgICAgICAgICB3aGlsZSAoKGkgPSBwKSAhPT0gaGVhZCkge1xuICAgICAgICAgICAgICBpLmtleSA9IGkudmFsdWUgPSBlbXB0eTtcbiAgICAgICAgICAgICAgcCA9IGkubmV4dDtcbiAgICAgICAgICAgICAgaS5uZXh0ID0gaS5wcmV2ID0gaGVhZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGhlYWQubmV4dCA9IGhlYWQucHJldiA9IGhlYWQ7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGtleXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWFwSXRlcmF0b3IodGhpcywgJ2tleScpO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICB2YWx1ZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWFwSXRlcmF0b3IodGhpcywgJ3ZhbHVlJyk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGVudHJpZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWFwSXRlcmF0b3IodGhpcywgJ2tleSt2YWx1ZScpO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBmb3JFYWNoOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBjb250ZXh0ID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiBudWxsO1xuICAgICAgICAgICAgdmFyIGl0ID0gdGhpcy5lbnRyaWVzKCk7XG4gICAgICAgICAgICBmb3IgKHZhciBlbnRyeSA9IGl0Lm5leHQoKTsgIWVudHJ5LmRvbmU7IGVudHJ5ID0gaXQubmV4dCgpKSB7XG4gICAgICAgICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbChjb250ZXh0LCBlbnRyeS52YWx1ZVsxXSwgZW50cnkudmFsdWVbMF0sIHRoaXMpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVudHJ5LnZhbHVlWzFdLCBlbnRyeS52YWx1ZVswXSwgdGhpcyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBhZGRJdGVyYXRvcihNYXAucHJvdG90eXBlLCBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLmVudHJpZXMoKTsgfSk7XG5cbiAgICAgICAgcmV0dXJuIE1hcDtcbiAgICAgIH0pKCksXG5cbiAgICAgIFNldDogKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gQ3JlYXRpbmcgYSBNYXAgaXMgZXhwZW5zaXZlLiAgVG8gc3BlZWQgdXAgdGhlIGNvbW1vbiBjYXNlIG9mXG4gICAgICAgIC8vIFNldHMgY29udGFpbmluZyBvbmx5IHN0cmluZyBvciBudW1lcmljIGtleXMsIHdlIHVzZSBhbiBvYmplY3RcbiAgICAgICAgLy8gYXMgYmFja2luZyBzdG9yYWdlIGFuZCBsYXppbHkgY3JlYXRlIGEgZnVsbCBNYXAgb25seSB3aGVuXG4gICAgICAgIC8vIHJlcXVpcmVkLlxuICAgICAgICB2YXIgU2V0U2hpbSA9IGZ1bmN0aW9uIFNldChpdGVyYWJsZSkge1xuICAgICAgICAgIHZhciBzZXQgPSB0aGlzO1xuICAgICAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KHNldCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1NldCBkb2VzIG5vdCBhY2NlcHQgYXJndW1lbnRzIHdoZW4gY2FsbGVkIGFzIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc2V0ID0gZW11bGF0ZUVTNmNvbnN0cnVjdChzZXQpO1xuICAgICAgICAgIGlmICghc2V0Ll9lczZzZXQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2JhZCBzZXQnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkZWZpbmVQcm9wZXJ0aWVzKHNldCwge1xuICAgICAgICAgICAgJ1tbU2V0RGF0YV1dJzogbnVsbCxcbiAgICAgICAgICAgIF9zdG9yYWdlOiBlbXB0eU9iamVjdCgpXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBPcHRpb25hbGx5IGluaXRpYWxpemUgbWFwIGZyb20gaXRlcmFibGVcbiAgICAgICAgICBpZiAodHlwZW9mIGl0ZXJhYmxlICE9PSAndW5kZWZpbmVkJyAmJiBpdGVyYWJsZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdmFyIGl0ID0gRVMuR2V0SXRlcmF0b3IoaXRlcmFibGUpO1xuICAgICAgICAgICAgdmFyIGFkZGVyID0gc2V0LmFkZDtcbiAgICAgICAgICAgIGlmICghRVMuSXNDYWxsYWJsZShhZGRlcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcignYmFkIHNldCcpOyB9XG4gICAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgICB2YXIgbmV4dCA9IEVTLkl0ZXJhdG9yTmV4dChpdCk7XG4gICAgICAgICAgICAgIGlmIChuZXh0LmRvbmUpIHsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgdmFyIG5leHRJdGVtID0gbmV4dC52YWx1ZTtcbiAgICAgICAgICAgICAgYWRkZXIuY2FsbChzZXQsIG5leHRJdGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHNldDtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIFNldCRwcm90b3R5cGUgPSBTZXRTaGltLnByb3RvdHlwZTtcbiAgICAgICAgZGVmaW5lUHJvcGVydGllcyhTZXRTaGltLCB7XG4gICAgICAgICAgJ0BAY3JlYXRlJzogZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAgICAgdmFyIGNvbnN0cnVjdG9yID0gdGhpcztcbiAgICAgICAgICAgIHZhciBwcm90b3R5cGUgPSBjb25zdHJ1Y3Rvci5wcm90b3R5cGUgfHwgU2V0JHByb3RvdHlwZTtcbiAgICAgICAgICAgIG9iaiA9IG9iaiB8fCBjcmVhdGUocHJvdG90eXBlKTtcbiAgICAgICAgICAgIGRlZmluZVByb3BlcnRpZXMob2JqLCB7IF9lczZzZXQ6IHRydWUgfSk7XG4gICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU3dpdGNoIGZyb20gdGhlIG9iamVjdCBiYWNraW5nIHN0b3JhZ2UgdG8gYSBmdWxsIE1hcC5cbiAgICAgICAgdmFyIGVuc3VyZU1hcCA9IGZ1bmN0aW9uIGVuc3VyZU1hcChzZXQpIHtcbiAgICAgICAgICBpZiAoIXNldFsnW1tTZXREYXRhXV0nXSkge1xuICAgICAgICAgICAgdmFyIG0gPSBzZXRbJ1tbU2V0RGF0YV1dJ10gPSBuZXcgY29sbGVjdGlvblNoaW1zLk1hcCgpO1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoc2V0Ll9zdG9yYWdlKS5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgICAgICAgICAgIC8vIGZhc3QgY2hlY2sgZm9yIGxlYWRpbmcgJyQnXG4gICAgICAgICAgICAgIGlmIChrLmNoYXJDb2RlQXQoMCkgPT09IDM2KSB7XG4gICAgICAgICAgICAgICAgayA9IGsuc2xpY2UoMSk7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoay5jaGFyQXQoMCkgPT09ICduJykge1xuICAgICAgICAgICAgICAgIGsgPSAray5zbGljZSgxKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBrID0gK2s7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbS5zZXQoaywgayk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHNldC5fc3RvcmFnZSA9IG51bGw7IC8vIGZyZWUgb2xkIGJhY2tpbmcgc3RvcmFnZVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoU2V0U2hpbS5wcm90b3R5cGUsICdzaXplJywge1xuICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5fc3RvcmFnZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3BhdWxtaWxsci9lczYtc2hpbS9pc3N1ZXMvMTc2XG4gICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3NpemUgbWV0aG9kIGNhbGxlZCBvbiBpbmNvbXBhdGlibGUgU2V0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbnN1cmVNYXAodGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpc1snW1tTZXREYXRhXV0nXS5zaXplO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZGVmaW5lUHJvcGVydGllcyhTZXRTaGltLnByb3RvdHlwZSwge1xuICAgICAgICAgIGhhczogZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgdmFyIGZrZXk7XG4gICAgICAgICAgICBpZiAodGhpcy5fc3RvcmFnZSAmJiAoZmtleSA9IGZhc3RrZXkoa2V5KSkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICEhdGhpcy5fc3RvcmFnZVtma2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVuc3VyZU1hcCh0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzWydbW1NldERhdGFdXSddLmhhcyhrZXkpO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBhZGQ6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIHZhciBma2V5O1xuICAgICAgICAgICAgaWYgKHRoaXMuX3N0b3JhZ2UgJiYgKGZrZXkgPSBmYXN0a2V5KGtleSkpICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2VbZmtleV0gPSB0cnVlO1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVuc3VyZU1hcCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXNbJ1tbU2V0RGF0YV1dJ10uc2V0KGtleSwga2V5KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICAnZGVsZXRlJzogZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgdmFyIGZrZXk7XG4gICAgICAgICAgICBpZiAodGhpcy5fc3RvcmFnZSAmJiAoZmtleSA9IGZhc3RrZXkoa2V5KSkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgdmFyIGhhc0ZLZXkgPSBfaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLl9zdG9yYWdlLCBma2V5KTtcbiAgICAgICAgICAgICAgcmV0dXJuIChkZWxldGUgdGhpcy5fc3RvcmFnZVtma2V5XSkgJiYgaGFzRktleTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVuc3VyZU1hcCh0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzWydbW1NldERhdGFdXSddWydkZWxldGUnXShrZXkpO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBjbGVhcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX3N0b3JhZ2UpIHtcbiAgICAgICAgICAgICAgdGhpcy5fc3RvcmFnZSA9IGVtcHR5T2JqZWN0KCk7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzWydbW1NldERhdGFdXSddLmNsZWFyKCk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIHZhbHVlczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZW5zdXJlTWFwKHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbJ1tbU2V0RGF0YV1dJ10udmFsdWVzKCk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGVudHJpZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGVuc3VyZU1hcCh0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzWydbW1NldERhdGFdXSddLmVudHJpZXMoKTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgZm9yRWFjaDogZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgY29udGV4dCA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogbnVsbDtcbiAgICAgICAgICAgIHZhciBlbnRpcmVTZXQgPSB0aGlzO1xuICAgICAgICAgICAgZW5zdXJlTWFwKGVudGlyZVNldCk7XG4gICAgICAgICAgICB0aGlzWydbW1NldERhdGFdXSddLmZvckVhY2goZnVuY3Rpb24gKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsKGNvbnRleHQsIGtleSwga2V5LCBlbnRpcmVTZXQpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGtleSwga2V5LCBlbnRpcmVTZXQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBkZWZpbmVQcm9wZXJ0eShTZXRTaGltLCAna2V5cycsIFNldFNoaW0udmFsdWVzLCB0cnVlKTtcbiAgICAgICAgYWRkSXRlcmF0b3IoU2V0U2hpbS5wcm90b3R5cGUsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMudmFsdWVzKCk7IH0pO1xuXG4gICAgICAgIHJldHVybiBTZXRTaGltO1xuICAgICAgfSkoKVxuICAgIH07XG4gICAgZGVmaW5lUHJvcGVydGllcyhnbG9iYWxzLCBjb2xsZWN0aW9uU2hpbXMpO1xuXG4gICAgaWYgKGdsb2JhbHMuTWFwIHx8IGdsb2JhbHMuU2V0KSB7XG4gICAgICAvKlxuICAgICAgICAtIEluIEZpcmVmb3ggPCAyMywgTWFwI3NpemUgaXMgYSBmdW5jdGlvbi5cbiAgICAgICAgLSBJbiBhbGwgY3VycmVudCBGaXJlZm94LCBTZXQjZW50cmllcy9rZXlzL3ZhbHVlcyAmIE1hcCNjbGVhciBkbyBub3QgZXhpc3RcbiAgICAgICAgLSBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD04Njk5OTZcbiAgICAgICAgLSBJbiBGaXJlZm94IDI0LCBNYXAgYW5kIFNldCBkbyBub3QgaW1wbGVtZW50IGZvckVhY2hcbiAgICAgICAgLSBJbiBGaXJlZm94IDI1IGF0IGxlYXN0LCBNYXAgYW5kIFNldCBhcmUgY2FsbGFibGUgd2l0aG91dCBcIm5ld1wiXG4gICAgICAqL1xuICAgICAgaWYgKFxuICAgICAgICB0eXBlb2YgZ2xvYmFscy5NYXAucHJvdG90eXBlLmNsZWFyICE9PSAnZnVuY3Rpb24nIHx8XG4gICAgICAgIG5ldyBnbG9iYWxzLlNldCgpLnNpemUgIT09IDAgfHxcbiAgICAgICAgbmV3IGdsb2JhbHMuTWFwKCkuc2l6ZSAhPT0gMCB8fFxuICAgICAgICB0eXBlb2YgZ2xvYmFscy5NYXAucHJvdG90eXBlLmtleXMgIT09ICdmdW5jdGlvbicgfHxcbiAgICAgICAgdHlwZW9mIGdsb2JhbHMuU2V0LnByb3RvdHlwZS5rZXlzICE9PSAnZnVuY3Rpb24nIHx8XG4gICAgICAgIHR5cGVvZiBnbG9iYWxzLk1hcC5wcm90b3R5cGUuZm9yRWFjaCAhPT0gJ2Z1bmN0aW9uJyB8fFxuICAgICAgICB0eXBlb2YgZ2xvYmFscy5TZXQucHJvdG90eXBlLmZvckVhY2ggIT09ICdmdW5jdGlvbicgfHxcbiAgICAgICAgaXNDYWxsYWJsZVdpdGhvdXROZXcoZ2xvYmFscy5NYXApIHx8XG4gICAgICAgIGlzQ2FsbGFibGVXaXRob3V0TmV3KGdsb2JhbHMuU2V0KSB8fFxuICAgICAgICAhc3VwcG9ydHNTdWJjbGFzc2luZyhnbG9iYWxzLk1hcCwgZnVuY3Rpb24gKE0pIHtcbiAgICAgICAgICB2YXIgbSA9IG5ldyBNKFtdKTtcbiAgICAgICAgICAvLyBGaXJlZm94IDMyIGlzIG9rIHdpdGggdGhlIGluc3RhbnRpYXRpbmcgdGhlIHN1YmNsYXNzIGJ1dCB3aWxsXG4gICAgICAgICAgLy8gdGhyb3cgd2hlbiB0aGUgbWFwIGlzIHVzZWQuXG4gICAgICAgICAgbS5zZXQoNDIsIDQyKTtcbiAgICAgICAgICByZXR1cm4gbSBpbnN0YW5jZW9mIE07XG4gICAgICAgIH0pXG4gICAgICApIHtcbiAgICAgICAgZ2xvYmFscy5NYXAgPSBjb2xsZWN0aW9uU2hpbXMuTWFwO1xuICAgICAgICBnbG9iYWxzLlNldCA9IGNvbGxlY3Rpb25TaGltcy5TZXQ7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChnbG9iYWxzLlNldC5wcm90b3R5cGUua2V5cyAhPT0gZ2xvYmFscy5TZXQucHJvdG90eXBlLnZhbHVlcykge1xuICAgICAgZGVmaW5lUHJvcGVydHkoZ2xvYmFscy5TZXQucHJvdG90eXBlLCAna2V5cycsIGdsb2JhbHMuU2V0LnByb3RvdHlwZS52YWx1ZXMsIHRydWUpO1xuICAgIH1cbiAgICAvLyBTaGltIGluY29tcGxldGUgaXRlcmF0b3IgaW1wbGVtZW50YXRpb25zLlxuICAgIGFkZEl0ZXJhdG9yKE9iamVjdC5nZXRQcm90b3R5cGVPZigobmV3IGdsb2JhbHMuTWFwKCkpLmtleXMoKSkpO1xuICAgIGFkZEl0ZXJhdG9yKE9iamVjdC5nZXRQcm90b3R5cGVPZigobmV3IGdsb2JhbHMuU2V0KCkpLmtleXMoKSkpO1xuICB9XG5cbiAgcmV0dXJuIGdsb2JhbHM7XG59KSk7XG5cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoJ19wcm9jZXNzJykpIiwiJ3VzZSBzdHJpY3QnO1xuXG5pZiAoIXJlcXVpcmUoJy4vaXMtaW1wbGVtZW50ZWQnKSgpKSB7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyZXF1aXJlKCdlczUtZXh0L2dsb2JhbCcpLCAnU3ltYm9sJyxcblx0XHR7IHZhbHVlOiByZXF1aXJlKCcuL3BvbHlmaWxsJyksIGNvbmZpZ3VyYWJsZTogdHJ1ZSwgZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0XHR3cml0YWJsZTogdHJ1ZSB9KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBzeW1ib2w7XG5cdGlmICh0eXBlb2YgU3ltYm9sICE9PSAnZnVuY3Rpb24nKSByZXR1cm4gZmFsc2U7XG5cdHN5bWJvbCA9IFN5bWJvbCgndGVzdCBzeW1ib2wnKTtcblx0dHJ5IHsgU3RyaW5nKHN5bWJvbCk7IH0gY2F0Y2ggKGUpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdGlmICh0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSAnc3ltYm9sJykgcmV0dXJuIHRydWU7XG5cblx0Ly8gUmV0dXJuICd0cnVlJyBmb3IgcG9seWZpbGxzXG5cdGlmICh0eXBlb2YgU3ltYm9sLmlzQ29uY2F0U3ByZWFkYWJsZSAhPT0gJ29iamVjdCcpIHJldHVybiBmYWxzZTtcblx0aWYgKHR5cGVvZiBTeW1ib2wuaXNSZWdFeHAgIT09ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG5cdGlmICh0eXBlb2YgU3ltYm9sLml0ZXJhdG9yICE9PSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuXHRpZiAodHlwZW9mIFN5bWJvbC50b1ByaW1pdGl2ZSAhPT0gJ29iamVjdCcpIHJldHVybiBmYWxzZTtcblx0aWYgKHR5cGVvZiBTeW1ib2wudG9TdHJpbmdUYWcgIT09ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG5cdGlmICh0eXBlb2YgU3ltYm9sLnVuc2NvcGFibGVzICE9PSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuXG5cdHJldHVybiB0cnVlO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGFzc2lnbiAgICAgICAgPSByZXF1aXJlKCdlczUtZXh0L29iamVjdC9hc3NpZ24nKVxuICAsIG5vcm1hbGl6ZU9wdHMgPSByZXF1aXJlKCdlczUtZXh0L29iamVjdC9ub3JtYWxpemUtb3B0aW9ucycpXG4gICwgaXNDYWxsYWJsZSAgICA9IHJlcXVpcmUoJ2VzNS1leHQvb2JqZWN0L2lzLWNhbGxhYmxlJylcbiAgLCBjb250YWlucyAgICAgID0gcmVxdWlyZSgnZXM1LWV4dC9zdHJpbmcvIy9jb250YWlucycpXG5cbiAgLCBkO1xuXG5kID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZHNjciwgdmFsdWUvKiwgb3B0aW9ucyovKSB7XG5cdHZhciBjLCBlLCB3LCBvcHRpb25zLCBkZXNjO1xuXHRpZiAoKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB8fCAodHlwZW9mIGRzY3IgIT09ICdzdHJpbmcnKSkge1xuXHRcdG9wdGlvbnMgPSB2YWx1ZTtcblx0XHR2YWx1ZSA9IGRzY3I7XG5cdFx0ZHNjciA9IG51bGw7XG5cdH0gZWxzZSB7XG5cdFx0b3B0aW9ucyA9IGFyZ3VtZW50c1syXTtcblx0fVxuXHRpZiAoZHNjciA9PSBudWxsKSB7XG5cdFx0YyA9IHcgPSB0cnVlO1xuXHRcdGUgPSBmYWxzZTtcblx0fSBlbHNlIHtcblx0XHRjID0gY29udGFpbnMuY2FsbChkc2NyLCAnYycpO1xuXHRcdGUgPSBjb250YWlucy5jYWxsKGRzY3IsICdlJyk7XG5cdFx0dyA9IGNvbnRhaW5zLmNhbGwoZHNjciwgJ3cnKTtcblx0fVxuXG5cdGRlc2MgPSB7IHZhbHVlOiB2YWx1ZSwgY29uZmlndXJhYmxlOiBjLCBlbnVtZXJhYmxlOiBlLCB3cml0YWJsZTogdyB9O1xuXHRyZXR1cm4gIW9wdGlvbnMgPyBkZXNjIDogYXNzaWduKG5vcm1hbGl6ZU9wdHMob3B0aW9ucyksIGRlc2MpO1xufTtcblxuZC5ncyA9IGZ1bmN0aW9uIChkc2NyLCBnZXQsIHNldC8qLCBvcHRpb25zKi8pIHtcblx0dmFyIGMsIGUsIG9wdGlvbnMsIGRlc2M7XG5cdGlmICh0eXBlb2YgZHNjciAhPT0gJ3N0cmluZycpIHtcblx0XHRvcHRpb25zID0gc2V0O1xuXHRcdHNldCA9IGdldDtcblx0XHRnZXQgPSBkc2NyO1xuXHRcdGRzY3IgPSBudWxsO1xuXHR9IGVsc2Uge1xuXHRcdG9wdGlvbnMgPSBhcmd1bWVudHNbM107XG5cdH1cblx0aWYgKGdldCA9PSBudWxsKSB7XG5cdFx0Z2V0ID0gdW5kZWZpbmVkO1xuXHR9IGVsc2UgaWYgKCFpc0NhbGxhYmxlKGdldCkpIHtcblx0XHRvcHRpb25zID0gZ2V0O1xuXHRcdGdldCA9IHNldCA9IHVuZGVmaW5lZDtcblx0fSBlbHNlIGlmIChzZXQgPT0gbnVsbCkge1xuXHRcdHNldCA9IHVuZGVmaW5lZDtcblx0fSBlbHNlIGlmICghaXNDYWxsYWJsZShzZXQpKSB7XG5cdFx0b3B0aW9ucyA9IHNldDtcblx0XHRzZXQgPSB1bmRlZmluZWQ7XG5cdH1cblx0aWYgKGRzY3IgPT0gbnVsbCkge1xuXHRcdGMgPSB0cnVlO1xuXHRcdGUgPSBmYWxzZTtcblx0fSBlbHNlIHtcblx0XHRjID0gY29udGFpbnMuY2FsbChkc2NyLCAnYycpO1xuXHRcdGUgPSBjb250YWlucy5jYWxsKGRzY3IsICdlJyk7XG5cdH1cblxuXHRkZXNjID0geyBnZXQ6IGdldCwgc2V0OiBzZXQsIGNvbmZpZ3VyYWJsZTogYywgZW51bWVyYWJsZTogZSB9O1xuXHRyZXR1cm4gIW9wdGlvbnMgPyBkZXNjIDogYXNzaWduKG5vcm1hbGl6ZU9wdHMob3B0aW9ucyksIGRlc2MpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgRnVuY3Rpb24oXCJyZXR1cm4gdGhpc1wiKSgpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vaXMtaW1wbGVtZW50ZWQnKSgpXG5cdD8gT2JqZWN0LmFzc2lnblxuXHQ6IHJlcXVpcmUoJy4vc2hpbScpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIGFzc2lnbiA9IE9iamVjdC5hc3NpZ24sIG9iajtcblx0aWYgKHR5cGVvZiBhc3NpZ24gIT09ICdmdW5jdGlvbicpIHJldHVybiBmYWxzZTtcblx0b2JqID0geyBmb286ICdyYXonIH07XG5cdGFzc2lnbihvYmosIHsgYmFyOiAnZHdhJyB9LCB7IHRyenk6ICd0cnp5JyB9KTtcblx0cmV0dXJuIChvYmouZm9vICsgb2JqLmJhciArIG9iai50cnp5KSA9PT0gJ3JhemR3YXRyenknO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGtleXMgID0gcmVxdWlyZSgnLi4va2V5cycpXG4gICwgdmFsdWUgPSByZXF1aXJlKCcuLi92YWxpZC12YWx1ZScpXG5cbiAgLCBtYXggPSBNYXRoLm1heDtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZGVzdCwgc3JjLyosIOKApnNyY24qLykge1xuXHR2YXIgZXJyb3IsIGksIGwgPSBtYXgoYXJndW1lbnRzLmxlbmd0aCwgMiksIGFzc2lnbjtcblx0ZGVzdCA9IE9iamVjdCh2YWx1ZShkZXN0KSk7XG5cdGFzc2lnbiA9IGZ1bmN0aW9uIChrZXkpIHtcblx0XHR0cnkgeyBkZXN0W2tleV0gPSBzcmNba2V5XTsgfSBjYXRjaCAoZSkge1xuXHRcdFx0aWYgKCFlcnJvcikgZXJyb3IgPSBlO1xuXHRcdH1cblx0fTtcblx0Zm9yIChpID0gMTsgaSA8IGw7ICsraSkge1xuXHRcdHNyYyA9IGFyZ3VtZW50c1tpXTtcblx0XHRrZXlzKHNyYykuZm9yRWFjaChhc3NpZ24pO1xuXHR9XG5cdGlmIChlcnJvciAhPT0gdW5kZWZpbmVkKSB0aHJvdyBlcnJvcjtcblx0cmV0dXJuIGRlc3Q7XG59O1xuIiwiLy8gRGVwcmVjYXRlZFxuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ2Z1bmN0aW9uJzsgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2lzLWltcGxlbWVudGVkJykoKVxuXHQ/IE9iamVjdC5rZXlzXG5cdDogcmVxdWlyZSgnLi9zaGltJyk7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuXHR0cnkge1xuXHRcdE9iamVjdC5rZXlzKCdwcmltaXRpdmUnKTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSBjYXRjaCAoZSkgeyByZXR1cm4gZmFsc2U7IH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBrZXlzID0gT2JqZWN0LmtleXM7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iamVjdCkge1xuXHRyZXR1cm4ga2V5cyhvYmplY3QgPT0gbnVsbCA/IG9iamVjdCA6IE9iamVjdChvYmplY3QpKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBhc3NpZ24gPSByZXF1aXJlKCcuL2Fzc2lnbicpXG5cbiAgLCBmb3JFYWNoID0gQXJyYXkucHJvdG90eXBlLmZvckVhY2hcbiAgLCBjcmVhdGUgPSBPYmplY3QuY3JlYXRlLCBnZXRQcm90b3R5cGVPZiA9IE9iamVjdC5nZXRQcm90b3R5cGVPZlxuXG4gICwgcHJvY2VzcztcblxucHJvY2VzcyA9IGZ1bmN0aW9uIChzcmMsIG9iaikge1xuXHR2YXIgcHJvdG8gPSBnZXRQcm90b3R5cGVPZihzcmMpO1xuXHRyZXR1cm4gYXNzaWduKHByb3RvID8gcHJvY2Vzcyhwcm90bywgb2JqKSA6IG9iaiwgc3JjKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9wdGlvbnMvKiwg4oCmb3B0aW9ucyovKSB7XG5cdHZhciByZXN1bHQgPSBjcmVhdGUobnVsbCk7XG5cdGZvckVhY2guY2FsbChhcmd1bWVudHMsIGZ1bmN0aW9uIChvcHRpb25zKSB7XG5cdFx0aWYgKG9wdGlvbnMgPT0gbnVsbCkgcmV0dXJuO1xuXHRcdHByb2Nlc3MoT2JqZWN0KG9wdGlvbnMpLCByZXN1bHQpO1xuXHR9KTtcblx0cmV0dXJuIHJlc3VsdDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHZhbHVlKSB7XG5cdGlmICh2YWx1ZSA9PSBudWxsKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHVzZSBudWxsIG9yIHVuZGVmaW5lZFwiKTtcblx0cmV0dXJuIHZhbHVlO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2lzLWltcGxlbWVudGVkJykoKVxuXHQ/IFN0cmluZy5wcm90b3R5cGUuY29udGFpbnNcblx0OiByZXF1aXJlKCcuL3NoaW0nKTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHN0ciA9ICdyYXpkd2F0cnp5JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG5cdGlmICh0eXBlb2Ygc3RyLmNvbnRhaW5zICE9PSAnZnVuY3Rpb24nKSByZXR1cm4gZmFsc2U7XG5cdHJldHVybiAoKHN0ci5jb250YWlucygnZHdhJykgPT09IHRydWUpICYmIChzdHIuY29udGFpbnMoJ2ZvbycpID09PSBmYWxzZSkpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGluZGV4T2YgPSBTdHJpbmcucHJvdG90eXBlLmluZGV4T2Y7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHNlYXJjaFN0cmluZy8qLCBwb3NpdGlvbiovKSB7XG5cdHJldHVybiBpbmRleE9mLmNhbGwodGhpcywgc2VhcmNoU3RyaW5nLCBhcmd1bWVudHNbMV0pID4gLTE7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZCA9IHJlcXVpcmUoJ2QnKVxuXG4gICwgY3JlYXRlID0gT2JqZWN0LmNyZWF0ZSwgZGVmaW5lUHJvcGVydGllcyA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzXG4gICwgZ2VuZXJhdGVOYW1lLCBTeW1ib2w7XG5cbmdlbmVyYXRlTmFtZSA9IChmdW5jdGlvbiAoKSB7XG5cdHZhciBjcmVhdGVkID0gY3JlYXRlKG51bGwpO1xuXHRyZXR1cm4gZnVuY3Rpb24gKGRlc2MpIHtcblx0XHR2YXIgcG9zdGZpeCA9IDA7XG5cdFx0d2hpbGUgKGNyZWF0ZWRbZGVzYyArIChwb3N0Zml4IHx8ICcnKV0pICsrcG9zdGZpeDtcblx0XHRkZXNjICs9IChwb3N0Zml4IHx8ICcnKTtcblx0XHRjcmVhdGVkW2Rlc2NdID0gdHJ1ZTtcblx0XHRyZXR1cm4gJ0BAJyArIGRlc2M7XG5cdH07XG59KCkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN5bWJvbCA9IGZ1bmN0aW9uIChkZXNjcmlwdGlvbikge1xuXHR2YXIgc3ltYm9sO1xuXHRpZiAodGhpcyBpbnN0YW5jZW9mIFN5bWJvbCkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ1R5cGVFcnJvcjogU3ltYm9sIGlzIG5vdCBhIGNvbnN0cnVjdG9yJyk7XG5cdH1cblx0c3ltYm9sID0gY3JlYXRlKFN5bWJvbC5wcm90b3R5cGUpO1xuXHRkZXNjcmlwdGlvbiA9IChkZXNjcmlwdGlvbiA9PT0gdW5kZWZpbmVkID8gJycgOiBTdHJpbmcoZGVzY3JpcHRpb24pKTtcblx0cmV0dXJuIGRlZmluZVByb3BlcnRpZXMoc3ltYm9sLCB7XG5cdFx0X19kZXNjcmlwdGlvbl9fOiBkKCcnLCBkZXNjcmlwdGlvbiksXG5cdFx0X19uYW1lX186IGQoJycsIGdlbmVyYXRlTmFtZShkZXNjcmlwdGlvbikpXG5cdH0pO1xufTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoU3ltYm9sLCB7XG5cdGNyZWF0ZTogZCgnJywgU3ltYm9sKCdjcmVhdGUnKSksXG5cdGhhc0luc3RhbmNlOiBkKCcnLCBTeW1ib2woJ2hhc0luc3RhbmNlJykpLFxuXHRpc0NvbmNhdFNwcmVhZGFibGU6IGQoJycsIFN5bWJvbCgnaXNDb25jYXRTcHJlYWRhYmxlJykpLFxuXHRpc1JlZ0V4cDogZCgnJywgU3ltYm9sKCdpc1JlZ0V4cCcpKSxcblx0aXRlcmF0b3I6IGQoJycsIFN5bWJvbCgnaXRlcmF0b3InKSksXG5cdHRvUHJpbWl0aXZlOiBkKCcnLCBTeW1ib2woJ3RvUHJpbWl0aXZlJykpLFxuXHR0b1N0cmluZ1RhZzogZCgnJywgU3ltYm9sKCd0b1N0cmluZ1RhZycpKSxcblx0dW5zY29wYWJsZXM6IGQoJycsIFN5bWJvbCgndW5zY29wYWJsZXMnKSlcbn0pO1xuXG5kZWZpbmVQcm9wZXJ0aWVzKFN5bWJvbC5wcm90b3R5cGUsIHtcblx0cHJvcGVyVG9TdHJpbmc6IGQoZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiAnU3ltYm9sICgnICsgdGhpcy5fX2Rlc2NyaXB0aW9uX18gKyAnKSc7XG5cdH0pLFxuXHR0b1N0cmluZzogZCgnJywgZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5fX25hbWVfXzsgfSlcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFN5bWJvbC5wcm90b3R5cGUsIFN5bWJvbC50b1ByaW1pdGl2ZSwgZCgnJyxcblx0ZnVuY3Rpb24gKGhpbnQpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ29udmVyc2lvbiBvZiBzeW1ib2wgb2JqZWN0cyBpcyBub3QgYWxsb3dlZFwiKTtcblx0fSkpO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFN5bWJvbC5wcm90b3R5cGUsIFN5bWJvbC50b1N0cmluZ1RhZywgZCgnYycsICdTeW1ib2wnKSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2xpYi82dG81L3BvbHlmaWxsXCIpO1xuIixudWxsLCIvLyBodHRwOi8vd2lraS5jb21tb25qcy5vcmcvd2lraS9Vbml0X1Rlc3RpbmcvMS4wXG4vL1xuLy8gVEhJUyBJUyBOT1QgVEVTVEVEIE5PUiBMSUtFTFkgVE8gV09SSyBPVVRTSURFIFY4IVxuLy9cbi8vIE9yaWdpbmFsbHkgZnJvbSBuYXJ3aGFsLmpzIChodHRwOi8vbmFyd2hhbGpzLm9yZylcbi8vIENvcHlyaWdodCAoYykgMjAwOSBUaG9tYXMgUm9iaW5zb24gPDI4MG5vcnRoLmNvbT5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4vLyBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSAnU29mdHdhcmUnKSwgdG9cbi8vIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlXG4vLyByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Jcbi8vIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4vLyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4vLyBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgJ0FTIElTJywgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuLy8gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4vLyBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbi8vIEFVVEhPUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOXG4vLyBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OXG4vLyBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gd2hlbiB1c2VkIGluIG5vZGUsIHRoaXMgd2lsbCBhY3R1YWxseSBsb2FkIHRoZSB1dGlsIG1vZHVsZSB3ZSBkZXBlbmQgb25cbi8vIHZlcnN1cyBsb2FkaW5nIHRoZSBidWlsdGluIHV0aWwgbW9kdWxlIGFzIGhhcHBlbnMgb3RoZXJ3aXNlXG4vLyB0aGlzIGlzIGEgYnVnIGluIG5vZGUgbW9kdWxlIGxvYWRpbmcgYXMgZmFyIGFzIEkgYW0gY29uY2VybmVkXG52YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwvJyk7XG5cbnZhciBwU2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG52YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLy8gMS4gVGhlIGFzc2VydCBtb2R1bGUgcHJvdmlkZXMgZnVuY3Rpb25zIHRoYXQgdGhyb3dcbi8vIEFzc2VydGlvbkVycm9yJ3Mgd2hlbiBwYXJ0aWN1bGFyIGNvbmRpdGlvbnMgYXJlIG5vdCBtZXQuIFRoZVxuLy8gYXNzZXJ0IG1vZHVsZSBtdXN0IGNvbmZvcm0gdG8gdGhlIGZvbGxvd2luZyBpbnRlcmZhY2UuXG5cbnZhciBhc3NlcnQgPSBtb2R1bGUuZXhwb3J0cyA9IG9rO1xuXG4vLyAyLiBUaGUgQXNzZXJ0aW9uRXJyb3IgaXMgZGVmaW5lZCBpbiBhc3NlcnQuXG4vLyBuZXcgYXNzZXJ0LkFzc2VydGlvbkVycm9yKHsgbWVzc2FnZTogbWVzc2FnZSxcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3R1YWw6IGFjdHVhbCxcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZDogZXhwZWN0ZWQgfSlcblxuYXNzZXJ0LkFzc2VydGlvbkVycm9yID0gZnVuY3Rpb24gQXNzZXJ0aW9uRXJyb3Iob3B0aW9ucykge1xuICB0aGlzLm5hbWUgPSAnQXNzZXJ0aW9uRXJyb3InO1xuICB0aGlzLmFjdHVhbCA9IG9wdGlvbnMuYWN0dWFsO1xuICB0aGlzLmV4cGVjdGVkID0gb3B0aW9ucy5leHBlY3RlZDtcbiAgdGhpcy5vcGVyYXRvciA9IG9wdGlvbnMub3BlcmF0b3I7XG4gIGlmIChvcHRpb25zLm1lc3NhZ2UpIHtcbiAgICB0aGlzLm1lc3NhZ2UgPSBvcHRpb25zLm1lc3NhZ2U7XG4gICAgdGhpcy5nZW5lcmF0ZWRNZXNzYWdlID0gZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5tZXNzYWdlID0gZ2V0TWVzc2FnZSh0aGlzKTtcbiAgICB0aGlzLmdlbmVyYXRlZE1lc3NhZ2UgPSB0cnVlO1xuICB9XG4gIHZhciBzdGFja1N0YXJ0RnVuY3Rpb24gPSBvcHRpb25zLnN0YWNrU3RhcnRGdW5jdGlvbiB8fCBmYWlsO1xuXG4gIGlmIChFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSkge1xuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHN0YWNrU3RhcnRGdW5jdGlvbik7XG4gIH1cbiAgZWxzZSB7XG4gICAgLy8gbm9uIHY4IGJyb3dzZXJzIHNvIHdlIGNhbiBoYXZlIGEgc3RhY2t0cmFjZVxuICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoKTtcbiAgICBpZiAoZXJyLnN0YWNrKSB7XG4gICAgICB2YXIgb3V0ID0gZXJyLnN0YWNrO1xuXG4gICAgICAvLyB0cnkgdG8gc3RyaXAgdXNlbGVzcyBmcmFtZXNcbiAgICAgIHZhciBmbl9uYW1lID0gc3RhY2tTdGFydEZ1bmN0aW9uLm5hbWU7XG4gICAgICB2YXIgaWR4ID0gb3V0LmluZGV4T2YoJ1xcbicgKyBmbl9uYW1lKTtcbiAgICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgICAvLyBvbmNlIHdlIGhhdmUgbG9jYXRlZCB0aGUgZnVuY3Rpb24gZnJhbWVcbiAgICAgICAgLy8gd2UgbmVlZCB0byBzdHJpcCBvdXQgZXZlcnl0aGluZyBiZWZvcmUgaXQgKGFuZCBpdHMgbGluZSlcbiAgICAgICAgdmFyIG5leHRfbGluZSA9IG91dC5pbmRleE9mKCdcXG4nLCBpZHggKyAxKTtcbiAgICAgICAgb3V0ID0gb3V0LnN1YnN0cmluZyhuZXh0X2xpbmUgKyAxKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zdGFjayA9IG91dDtcbiAgICB9XG4gIH1cbn07XG5cbi8vIGFzc2VydC5Bc3NlcnRpb25FcnJvciBpbnN0YW5jZW9mIEVycm9yXG51dGlsLmluaGVyaXRzKGFzc2VydC5Bc3NlcnRpb25FcnJvciwgRXJyb3IpO1xuXG5mdW5jdGlvbiByZXBsYWNlcihrZXksIHZhbHVlKSB7XG4gIGlmICh1dGlsLmlzVW5kZWZpbmVkKHZhbHVlKSkge1xuICAgIHJldHVybiAnJyArIHZhbHVlO1xuICB9XG4gIGlmICh1dGlsLmlzTnVtYmVyKHZhbHVlKSAmJiAoaXNOYU4odmFsdWUpIHx8ICFpc0Zpbml0ZSh2YWx1ZSkpKSB7XG4gICAgcmV0dXJuIHZhbHVlLnRvU3RyaW5nKCk7XG4gIH1cbiAgaWYgKHV0aWwuaXNGdW5jdGlvbih2YWx1ZSkgfHwgdXRpbC5pc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWUudG9TdHJpbmcoKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIHRydW5jYXRlKHMsIG4pIHtcbiAgaWYgKHV0aWwuaXNTdHJpbmcocykpIHtcbiAgICByZXR1cm4gcy5sZW5ndGggPCBuID8gcyA6IHMuc2xpY2UoMCwgbik7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHM7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0TWVzc2FnZShzZWxmKSB7XG4gIHJldHVybiB0cnVuY2F0ZShKU09OLnN0cmluZ2lmeShzZWxmLmFjdHVhbCwgcmVwbGFjZXIpLCAxMjgpICsgJyAnICtcbiAgICAgICAgIHNlbGYub3BlcmF0b3IgKyAnICcgK1xuICAgICAgICAgdHJ1bmNhdGUoSlNPTi5zdHJpbmdpZnkoc2VsZi5leHBlY3RlZCwgcmVwbGFjZXIpLCAxMjgpO1xufVxuXG4vLyBBdCBwcmVzZW50IG9ubHkgdGhlIHRocmVlIGtleXMgbWVudGlvbmVkIGFib3ZlIGFyZSB1c2VkIGFuZFxuLy8gdW5kZXJzdG9vZCBieSB0aGUgc3BlYy4gSW1wbGVtZW50YXRpb25zIG9yIHN1YiBtb2R1bGVzIGNhbiBwYXNzXG4vLyBvdGhlciBrZXlzIHRvIHRoZSBBc3NlcnRpb25FcnJvcidzIGNvbnN0cnVjdG9yIC0gdGhleSB3aWxsIGJlXG4vLyBpZ25vcmVkLlxuXG4vLyAzLiBBbGwgb2YgdGhlIGZvbGxvd2luZyBmdW5jdGlvbnMgbXVzdCB0aHJvdyBhbiBBc3NlcnRpb25FcnJvclxuLy8gd2hlbiBhIGNvcnJlc3BvbmRpbmcgY29uZGl0aW9uIGlzIG5vdCBtZXQsIHdpdGggYSBtZXNzYWdlIHRoYXRcbi8vIG1heSBiZSB1bmRlZmluZWQgaWYgbm90IHByb3ZpZGVkLiAgQWxsIGFzc2VydGlvbiBtZXRob2RzIHByb3ZpZGVcbi8vIGJvdGggdGhlIGFjdHVhbCBhbmQgZXhwZWN0ZWQgdmFsdWVzIHRvIHRoZSBhc3NlcnRpb24gZXJyb3IgZm9yXG4vLyBkaXNwbGF5IHB1cnBvc2VzLlxuXG5mdW5jdGlvbiBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsIG9wZXJhdG9yLCBzdGFja1N0YXJ0RnVuY3Rpb24pIHtcbiAgdGhyb3cgbmV3IGFzc2VydC5Bc3NlcnRpb25FcnJvcih7XG4gICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICBhY3R1YWw6IGFjdHVhbCxcbiAgICBleHBlY3RlZDogZXhwZWN0ZWQsXG4gICAgb3BlcmF0b3I6IG9wZXJhdG9yLFxuICAgIHN0YWNrU3RhcnRGdW5jdGlvbjogc3RhY2tTdGFydEZ1bmN0aW9uXG4gIH0pO1xufVxuXG4vLyBFWFRFTlNJT04hIGFsbG93cyBmb3Igd2VsbCBiZWhhdmVkIGVycm9ycyBkZWZpbmVkIGVsc2V3aGVyZS5cbmFzc2VydC5mYWlsID0gZmFpbDtcblxuLy8gNC4gUHVyZSBhc3NlcnRpb24gdGVzdHMgd2hldGhlciBhIHZhbHVlIGlzIHRydXRoeSwgYXMgZGV0ZXJtaW5lZFxuLy8gYnkgISFndWFyZC5cbi8vIGFzc2VydC5vayhndWFyZCwgbWVzc2FnZV9vcHQpO1xuLy8gVGhpcyBzdGF0ZW1lbnQgaXMgZXF1aXZhbGVudCB0byBhc3NlcnQuZXF1YWwodHJ1ZSwgISFndWFyZCxcbi8vIG1lc3NhZ2Vfb3B0KTsuIFRvIHRlc3Qgc3RyaWN0bHkgZm9yIHRoZSB2YWx1ZSB0cnVlLCB1c2Vcbi8vIGFzc2VydC5zdHJpY3RFcXVhbCh0cnVlLCBndWFyZCwgbWVzc2FnZV9vcHQpOy5cblxuZnVuY3Rpb24gb2sodmFsdWUsIG1lc3NhZ2UpIHtcbiAgaWYgKCF2YWx1ZSkgZmFpbCh2YWx1ZSwgdHJ1ZSwgbWVzc2FnZSwgJz09JywgYXNzZXJ0Lm9rKTtcbn1cbmFzc2VydC5vayA9IG9rO1xuXG4vLyA1LiBUaGUgZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIHNoYWxsb3csIGNvZXJjaXZlIGVxdWFsaXR5IHdpdGhcbi8vID09LlxuLy8gYXNzZXJ0LmVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LmVxdWFsID0gZnVuY3Rpb24gZXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsICE9IGV4cGVjdGVkKSBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICc9PScsIGFzc2VydC5lcXVhbCk7XG59O1xuXG4vLyA2LiBUaGUgbm9uLWVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBmb3Igd2hldGhlciB0d28gb2JqZWN0cyBhcmUgbm90IGVxdWFsXG4vLyB3aXRoICE9IGFzc2VydC5ub3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5ub3RFcXVhbCA9IGZ1bmN0aW9uIG5vdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCA9PSBleHBlY3RlZCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJyE9JywgYXNzZXJ0Lm5vdEVxdWFsKTtcbiAgfVxufTtcblxuLy8gNy4gVGhlIGVxdWl2YWxlbmNlIGFzc2VydGlvbiB0ZXN0cyBhIGRlZXAgZXF1YWxpdHkgcmVsYXRpb24uXG4vLyBhc3NlcnQuZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LmRlZXBFcXVhbCA9IGZ1bmN0aW9uIGRlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmICghX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkKSkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJ2RlZXBFcXVhbCcsIGFzc2VydC5kZWVwRXF1YWwpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBfZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQpIHtcbiAgLy8gNy4xLiBBbGwgaWRlbnRpY2FsIHZhbHVlcyBhcmUgZXF1aXZhbGVudCwgYXMgZGV0ZXJtaW5lZCBieSA9PT0uXG4gIGlmIChhY3R1YWwgPT09IGV4cGVjdGVkKSB7XG4gICAgcmV0dXJuIHRydWU7XG5cbiAgfSBlbHNlIGlmICh1dGlsLmlzQnVmZmVyKGFjdHVhbCkgJiYgdXRpbC5pc0J1ZmZlcihleHBlY3RlZCkpIHtcbiAgICBpZiAoYWN0dWFsLmxlbmd0aCAhPSBleHBlY3RlZC5sZW5ndGgpIHJldHVybiBmYWxzZTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYWN0dWFsLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYWN0dWFsW2ldICE9PSBleHBlY3RlZFtpXSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuXG4gIC8vIDcuMi4gSWYgdGhlIGV4cGVjdGVkIHZhbHVlIGlzIGEgRGF0ZSBvYmplY3QsIHRoZSBhY3R1YWwgdmFsdWUgaXNcbiAgLy8gZXF1aXZhbGVudCBpZiBpdCBpcyBhbHNvIGEgRGF0ZSBvYmplY3QgdGhhdCByZWZlcnMgdG8gdGhlIHNhbWUgdGltZS5cbiAgfSBlbHNlIGlmICh1dGlsLmlzRGF0ZShhY3R1YWwpICYmIHV0aWwuaXNEYXRlKGV4cGVjdGVkKSkge1xuICAgIHJldHVybiBhY3R1YWwuZ2V0VGltZSgpID09PSBleHBlY3RlZC5nZXRUaW1lKCk7XG5cbiAgLy8gNy4zIElmIHRoZSBleHBlY3RlZCB2YWx1ZSBpcyBhIFJlZ0V4cCBvYmplY3QsIHRoZSBhY3R1YWwgdmFsdWUgaXNcbiAgLy8gZXF1aXZhbGVudCBpZiBpdCBpcyBhbHNvIGEgUmVnRXhwIG9iamVjdCB3aXRoIHRoZSBzYW1lIHNvdXJjZSBhbmRcbiAgLy8gcHJvcGVydGllcyAoYGdsb2JhbGAsIGBtdWx0aWxpbmVgLCBgbGFzdEluZGV4YCwgYGlnbm9yZUNhc2VgKS5cbiAgfSBlbHNlIGlmICh1dGlsLmlzUmVnRXhwKGFjdHVhbCkgJiYgdXRpbC5pc1JlZ0V4cChleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gYWN0dWFsLnNvdXJjZSA9PT0gZXhwZWN0ZWQuc291cmNlICYmXG4gICAgICAgICAgIGFjdHVhbC5nbG9iYWwgPT09IGV4cGVjdGVkLmdsb2JhbCAmJlxuICAgICAgICAgICBhY3R1YWwubXVsdGlsaW5lID09PSBleHBlY3RlZC5tdWx0aWxpbmUgJiZcbiAgICAgICAgICAgYWN0dWFsLmxhc3RJbmRleCA9PT0gZXhwZWN0ZWQubGFzdEluZGV4ICYmXG4gICAgICAgICAgIGFjdHVhbC5pZ25vcmVDYXNlID09PSBleHBlY3RlZC5pZ25vcmVDYXNlO1xuXG4gIC8vIDcuNC4gT3RoZXIgcGFpcnMgdGhhdCBkbyBub3QgYm90aCBwYXNzIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0JyxcbiAgLy8gZXF1aXZhbGVuY2UgaXMgZGV0ZXJtaW5lZCBieSA9PS5cbiAgfSBlbHNlIGlmICghdXRpbC5pc09iamVjdChhY3R1YWwpICYmICF1dGlsLmlzT2JqZWN0KGV4cGVjdGVkKSkge1xuICAgIHJldHVybiBhY3R1YWwgPT0gZXhwZWN0ZWQ7XG5cbiAgLy8gNy41IEZvciBhbGwgb3RoZXIgT2JqZWN0IHBhaXJzLCBpbmNsdWRpbmcgQXJyYXkgb2JqZWN0cywgZXF1aXZhbGVuY2UgaXNcbiAgLy8gZGV0ZXJtaW5lZCBieSBoYXZpbmcgdGhlIHNhbWUgbnVtYmVyIG9mIG93bmVkIHByb3BlcnRpZXMgKGFzIHZlcmlmaWVkXG4gIC8vIHdpdGggT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKSwgdGhlIHNhbWUgc2V0IG9mIGtleXNcbiAgLy8gKGFsdGhvdWdoIG5vdCBuZWNlc3NhcmlseSB0aGUgc2FtZSBvcmRlciksIGVxdWl2YWxlbnQgdmFsdWVzIGZvciBldmVyeVxuICAvLyBjb3JyZXNwb25kaW5nIGtleSwgYW5kIGFuIGlkZW50aWNhbCAncHJvdG90eXBlJyBwcm9wZXJ0eS4gTm90ZTogdGhpc1xuICAvLyBhY2NvdW50cyBmb3IgYm90aCBuYW1lZCBhbmQgaW5kZXhlZCBwcm9wZXJ0aWVzIG9uIEFycmF5cy5cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gb2JqRXF1aXYoYWN0dWFsLCBleHBlY3RlZCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNBcmd1bWVudHMob2JqZWN0KSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PSAnW29iamVjdCBBcmd1bWVudHNdJztcbn1cblxuZnVuY3Rpb24gb2JqRXF1aXYoYSwgYikge1xuICBpZiAodXRpbC5pc051bGxPclVuZGVmaW5lZChhKSB8fCB1dGlsLmlzTnVsbE9yVW5kZWZpbmVkKGIpKVxuICAgIHJldHVybiBmYWxzZTtcbiAgLy8gYW4gaWRlbnRpY2FsICdwcm90b3R5cGUnIHByb3BlcnR5LlxuICBpZiAoYS5wcm90b3R5cGUgIT09IGIucHJvdG90eXBlKSByZXR1cm4gZmFsc2U7XG4gIC8vfn5+SSd2ZSBtYW5hZ2VkIHRvIGJyZWFrIE9iamVjdC5rZXlzIHRocm91Z2ggc2NyZXd5IGFyZ3VtZW50cyBwYXNzaW5nLlxuICAvLyAgIENvbnZlcnRpbmcgdG8gYXJyYXkgc29sdmVzIHRoZSBwcm9ibGVtLlxuICBpZiAoaXNBcmd1bWVudHMoYSkpIHtcbiAgICBpZiAoIWlzQXJndW1lbnRzKGIpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGEgPSBwU2xpY2UuY2FsbChhKTtcbiAgICBiID0gcFNsaWNlLmNhbGwoYik7XG4gICAgcmV0dXJuIF9kZWVwRXF1YWwoYSwgYik7XG4gIH1cbiAgdHJ5IHtcbiAgICB2YXIga2EgPSBvYmplY3RLZXlzKGEpLFxuICAgICAgICBrYiA9IG9iamVjdEtleXMoYiksXG4gICAgICAgIGtleSwgaTtcbiAgfSBjYXRjaCAoZSkgey8vaGFwcGVucyB3aGVuIG9uZSBpcyBhIHN0cmluZyBsaXRlcmFsIGFuZCB0aGUgb3RoZXIgaXNuJ3RcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLy8gaGF2aW5nIHRoZSBzYW1lIG51bWJlciBvZiBvd25lZCBwcm9wZXJ0aWVzIChrZXlzIGluY29ycG9yYXRlc1xuICAvLyBoYXNPd25Qcm9wZXJ0eSlcbiAgaWYgKGthLmxlbmd0aCAhPSBrYi5sZW5ndGgpXG4gICAgcmV0dXJuIGZhbHNlO1xuICAvL3RoZSBzYW1lIHNldCBvZiBrZXlzIChhbHRob3VnaCBub3QgbmVjZXNzYXJpbHkgdGhlIHNhbWUgb3JkZXIpLFxuICBrYS5zb3J0KCk7XG4gIGtiLnNvcnQoKTtcbiAgLy9+fn5jaGVhcCBrZXkgdGVzdFxuICBmb3IgKGkgPSBrYS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGlmIChrYVtpXSAhPSBrYltpXSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAvL2VxdWl2YWxlbnQgdmFsdWVzIGZvciBldmVyeSBjb3JyZXNwb25kaW5nIGtleSwgYW5kXG4gIC8vfn5+cG9zc2libHkgZXhwZW5zaXZlIGRlZXAgdGVzdFxuICBmb3IgKGkgPSBrYS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGtleSA9IGthW2ldO1xuICAgIGlmICghX2RlZXBFcXVhbChhW2tleV0sIGJba2V5XSkpIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLy8gOC4gVGhlIG5vbi1lcXVpdmFsZW5jZSBhc3NlcnRpb24gdGVzdHMgZm9yIGFueSBkZWVwIGluZXF1YWxpdHkuXG4vLyBhc3NlcnQubm90RGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0Lm5vdERlZXBFcXVhbCA9IGZ1bmN0aW9uIG5vdERlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChfZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQpKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnbm90RGVlcEVxdWFsJywgYXNzZXJ0Lm5vdERlZXBFcXVhbCk7XG4gIH1cbn07XG5cbi8vIDkuIFRoZSBzdHJpY3QgZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIHN0cmljdCBlcXVhbGl0eSwgYXMgZGV0ZXJtaW5lZCBieSA9PT0uXG4vLyBhc3NlcnQuc3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQuc3RyaWN0RXF1YWwgPSBmdW5jdGlvbiBzdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgIT09IGV4cGVjdGVkKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnPT09JywgYXNzZXJ0LnN0cmljdEVxdWFsKTtcbiAgfVxufTtcblxuLy8gMTAuIFRoZSBzdHJpY3Qgbm9uLWVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBmb3Igc3RyaWN0IGluZXF1YWxpdHksIGFzXG4vLyBkZXRlcm1pbmVkIGJ5ICE9PS4gIGFzc2VydC5ub3RTdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5ub3RTdHJpY3RFcXVhbCA9IGZ1bmN0aW9uIG5vdFN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCA9PT0gZXhwZWN0ZWQpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICchPT0nLCBhc3NlcnQubm90U3RyaWN0RXF1YWwpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBleHBlY3RlZEV4Y2VwdGlvbihhY3R1YWwsIGV4cGVjdGVkKSB7XG4gIGlmICghYWN0dWFsIHx8ICFleHBlY3RlZCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZXhwZWN0ZWQpID09ICdbb2JqZWN0IFJlZ0V4cF0nKSB7XG4gICAgcmV0dXJuIGV4cGVjdGVkLnRlc3QoYWN0dWFsKTtcbiAgfSBlbHNlIGlmIChhY3R1YWwgaW5zdGFuY2VvZiBleHBlY3RlZCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKGV4cGVjdGVkLmNhbGwoe30sIGFjdHVhbCkgPT09IHRydWUpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gX3Rocm93cyhzaG91bGRUaHJvdywgYmxvY2ssIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIHZhciBhY3R1YWw7XG5cbiAgaWYgKHV0aWwuaXNTdHJpbmcoZXhwZWN0ZWQpKSB7XG4gICAgbWVzc2FnZSA9IGV4cGVjdGVkO1xuICAgIGV4cGVjdGVkID0gbnVsbDtcbiAgfVxuXG4gIHRyeSB7XG4gICAgYmxvY2soKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGFjdHVhbCA9IGU7XG4gIH1cblxuICBtZXNzYWdlID0gKGV4cGVjdGVkICYmIGV4cGVjdGVkLm5hbWUgPyAnICgnICsgZXhwZWN0ZWQubmFtZSArICcpLicgOiAnLicpICtcbiAgICAgICAgICAgIChtZXNzYWdlID8gJyAnICsgbWVzc2FnZSA6ICcuJyk7XG5cbiAgaWYgKHNob3VsZFRocm93ICYmICFhY3R1YWwpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsICdNaXNzaW5nIGV4cGVjdGVkIGV4Y2VwdGlvbicgKyBtZXNzYWdlKTtcbiAgfVxuXG4gIGlmICghc2hvdWxkVGhyb3cgJiYgZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLCBleHBlY3RlZCkpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsICdHb3QgdW53YW50ZWQgZXhjZXB0aW9uJyArIG1lc3NhZ2UpO1xuICB9XG5cbiAgaWYgKChzaG91bGRUaHJvdyAmJiBhY3R1YWwgJiYgZXhwZWN0ZWQgJiZcbiAgICAgICFleHBlY3RlZEV4Y2VwdGlvbihhY3R1YWwsIGV4cGVjdGVkKSkgfHwgKCFzaG91bGRUaHJvdyAmJiBhY3R1YWwpKSB7XG4gICAgdGhyb3cgYWN0dWFsO1xuICB9XG59XG5cbi8vIDExLiBFeHBlY3RlZCB0byB0aHJvdyBhbiBlcnJvcjpcbi8vIGFzc2VydC50aHJvd3MoYmxvY2ssIEVycm9yX29wdCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQudGhyb3dzID0gZnVuY3Rpb24oYmxvY2ssIC8qb3B0aW9uYWwqL2Vycm9yLCAvKm9wdGlvbmFsKi9tZXNzYWdlKSB7XG4gIF90aHJvd3MuYXBwbHkodGhpcywgW3RydWVdLmNvbmNhdChwU2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG59O1xuXG4vLyBFWFRFTlNJT04hIFRoaXMgaXMgYW5ub3lpbmcgdG8gd3JpdGUgb3V0c2lkZSB0aGlzIG1vZHVsZS5cbmFzc2VydC5kb2VzTm90VGhyb3cgPSBmdW5jdGlvbihibG9jaywgLypvcHRpb25hbCovbWVzc2FnZSkge1xuICBfdGhyb3dzLmFwcGx5KHRoaXMsIFtmYWxzZV0uY29uY2F0KHBTbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbn07XG5cbmFzc2VydC5pZkVycm9yID0gZnVuY3Rpb24oZXJyKSB7IGlmIChlcnIpIHt0aHJvdyBlcnI7fX07XG5cbnZhciBvYmplY3RLZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24gKG9iaikge1xuICB2YXIga2V5cyA9IFtdO1xuICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgaWYgKGhhc093bi5jYWxsKG9iaiwga2V5KSkga2V5cy5wdXNoKGtleSk7XG4gIH1cbiAgcmV0dXJuIGtleXM7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNCdWZmZXIoYXJnKSB7XG4gIHJldHVybiBhcmcgJiYgdHlwZW9mIGFyZyA9PT0gJ29iamVjdCdcbiAgICAmJiB0eXBlb2YgYXJnLmNvcHkgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLmZpbGwgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLnJlYWRVSW50OCA9PT0gJ2Z1bmN0aW9uJztcbn0iLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsKXtcbi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgLy8gQWxsb3cgZm9yIGRlcHJlY2F0aW5nIHRoaW5ncyBpbiB0aGUgcHJvY2VzcyBvZiBzdGFydGluZyB1cC5cbiAgaWYgKGlzVW5kZWZpbmVkKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmRlcHJlY2F0ZShmbiwgbXNnKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBpZiAocHJvY2Vzcy5ub0RlcHJlY2F0aW9uID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52aXJvbjtcbmV4cG9ydHMuZGVidWdsb2cgPSBmdW5jdGlvbihzZXQpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKGRlYnVnRW52aXJvbikpXG4gICAgZGVidWdFbnZpcm9uID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJztcbiAgc2V0ID0gc2V0LnRvVXBwZXJDYXNlKCk7XG4gIGlmICghZGVidWdzW3NldF0pIHtcbiAgICBpZiAobmV3IFJlZ0V4cCgnXFxcXGInICsgc2V0ICsgJ1xcXFxiJywgJ2knKS50ZXN0KGRlYnVnRW52aXJvbikpIHtcbiAgICAgIHZhciBwaWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCclcyAlZDogJXMnLCBzZXQsIHBpZCwgbXNnKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlYnVnc1tzZXRdO1xufTtcblxuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzLCBjdHgpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBJRSBkb2Vzbid0IG1ha2UgZXJyb3IgZmllbGRzIG5vbi1lbnVtZXJhYmxlXG4gIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9kd3c1MnNidCh2PXZzLjk0KS5hc3B4XG4gIGlmIChpc0Vycm9yKHZhbHVlKVxuICAgICAgJiYgKGtleXMuaW5kZXhPZignbWVzc2FnZScpID49IDAgfHwga2V5cy5pbmRleE9mKCdkZXNjcmlwdGlvbicpID49IDApKSB7XG4gICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoJ19wcm9jZXNzJyksdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIvKipcbiAqICBDb3B5cmlnaHQgKGMpIDIwMTQsIEZhY2Vib29rLCBJbmMuXG4gKiAgQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiAgVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiAgTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiAgb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKi9cbmZ1bmN0aW9uIHVuaXZlcnNhbE1vZHVsZSgpIHtcbiAgdmFyICRPYmplY3QgPSBPYmplY3Q7XG5cbmZ1bmN0aW9uIGNyZWF0ZUNsYXNzKGN0b3IsIG1ldGhvZHMsIHN0YXRpY01ldGhvZHMsIHN1cGVyQ2xhc3MpIHtcbiAgdmFyIHByb3RvO1xuICBpZiAoc3VwZXJDbGFzcykge1xuICAgIHZhciBzdXBlclByb3RvID0gc3VwZXJDbGFzcy5wcm90b3R5cGU7XG4gICAgcHJvdG8gPSAkT2JqZWN0LmNyZWF0ZShzdXBlclByb3RvKTtcbiAgfSBlbHNlIHtcbiAgICBwcm90byA9IGN0b3IucHJvdG90eXBlO1xuICB9XG4gICRPYmplY3Qua2V5cyhtZXRob2RzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICBwcm90b1trZXldID0gbWV0aG9kc1trZXldO1xuICB9KTtcbiAgJE9iamVjdC5rZXlzKHN0YXRpY01ldGhvZHMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgIGN0b3Jba2V5XSA9IHN0YXRpY01ldGhvZHNba2V5XTtcbiAgfSk7XG4gIHByb3RvLmNvbnN0cnVjdG9yID0gY3RvcjtcbiAgY3Rvci5wcm90b3R5cGUgPSBwcm90bztcbiAgcmV0dXJuIGN0b3I7XG59XG5cbmZ1bmN0aW9uIHN1cGVyQ2FsbChzZWxmLCBwcm90bywgbmFtZSwgYXJncykge1xuICByZXR1cm4gJE9iamVjdC5nZXRQcm90b3R5cGVPZihwcm90bylbbmFtZV0uYXBwbHkoc2VsZiwgYXJncyk7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRTdXBlckNhbGwoc2VsZiwgcHJvdG8sIGFyZ3MpIHtcbiAgc3VwZXJDYWxsKHNlbGYsIHByb3RvLCAnY29uc3RydWN0b3InLCBhcmdzKTtcbn1cblxudmFyICR0cmFjZXVyUnVudGltZSA9IHt9O1xuJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzID0gY3JlYXRlQ2xhc3M7XG4kdHJhY2V1clJ1bnRpbWUuc3VwZXJDYWxsID0gc3VwZXJDYWxsO1xuJHRyYWNldXJSdW50aW1lLmRlZmF1bHRTdXBlckNhbGwgPSBkZWZhdWx0U3VwZXJDYWxsO1xuXCJ1c2Ugc3RyaWN0XCI7XG5mdW5jdGlvbiBpcyhmaXJzdCwgc2Vjb25kKSB7XG4gIGlmIChmaXJzdCA9PT0gc2Vjb25kKSB7XG4gICAgcmV0dXJuIGZpcnN0ICE9PSAwIHx8IHNlY29uZCAhPT0gMCB8fCAxIC8gZmlyc3QgPT09IDEgLyBzZWNvbmQ7XG4gIH1cbiAgaWYgKGZpcnN0ICE9PSBmaXJzdCkge1xuICAgIHJldHVybiBzZWNvbmQgIT09IHNlY29uZDtcbiAgfVxuICBpZiAoZmlyc3QgJiYgdHlwZW9mIGZpcnN0LmVxdWFscyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBmaXJzdC5lcXVhbHMoc2Vjb25kKTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5mdW5jdGlvbiBpbnZhcmlhbnQoY29uZGl0aW9uLCBlcnJvcikge1xuICBpZiAoIWNvbmRpdGlvbilcbiAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3IpO1xufVxudmFyIERFTEVURSA9ICdkZWxldGUnO1xudmFyIFNISUZUID0gNTtcbnZhciBTSVpFID0gMSA8PCBTSElGVDtcbnZhciBNQVNLID0gU0laRSAtIDE7XG52YXIgTk9UX1NFVCA9IHt9O1xudmFyIENIQU5HRV9MRU5HVEggPSB7dmFsdWU6IGZhbHNlfTtcbnZhciBESURfQUxURVIgPSB7dmFsdWU6IGZhbHNlfTtcbmZ1bmN0aW9uIE1ha2VSZWYocmVmKSB7XG4gIHJlZi52YWx1ZSA9IGZhbHNlO1xuICByZXR1cm4gcmVmO1xufVxuZnVuY3Rpb24gU2V0UmVmKHJlZikge1xuICByZWYgJiYgKHJlZi52YWx1ZSA9IHRydWUpO1xufVxuZnVuY3Rpb24gT3duZXJJRCgpIHt9XG5mdW5jdGlvbiBhcnJDb3B5KGFyciwgb2Zmc2V0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8fCAwO1xuICB2YXIgbGVuID0gTWF0aC5tYXgoMCwgYXJyLmxlbmd0aCAtIG9mZnNldCk7XG4gIHZhciBuZXdBcnIgPSBuZXcgQXJyYXkobGVuKTtcbiAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IGxlbjsgaWkrKykge1xuICAgIG5ld0FycltpaV0gPSBhcnJbaWkgKyBvZmZzZXRdO1xuICB9XG4gIHJldHVybiBuZXdBcnI7XG59XG5mdW5jdGlvbiBhc3NlcnROb3RJbmZpbml0ZShzaXplKSB7XG4gIGludmFyaWFudChzaXplICE9PSBJbmZpbml0eSwgJ0Nhbm5vdCBwZXJmb3JtIHRoaXMgYWN0aW9uIHdpdGggYW4gaW5maW5pdGUgc2l6ZS4nKTtcbn1cbmZ1bmN0aW9uIGVuc3VyZVNpemUoaXRlcikge1xuICBpZiAoaXRlci5zaXplID09PSB1bmRlZmluZWQpIHtcbiAgICBpdGVyLnNpemUgPSBpdGVyLl9faXRlcmF0ZShyZXR1cm5UcnVlKTtcbiAgfVxuICByZXR1cm4gaXRlci5zaXplO1xufVxuZnVuY3Rpb24gd3JhcEluZGV4KGl0ZXIsIGluZGV4KSB7XG4gIHJldHVybiBpbmRleCA+PSAwID8gaW5kZXggOiBlbnN1cmVTaXplKGl0ZXIpICsgaW5kZXg7XG59XG5mdW5jdGlvbiByZXR1cm5UcnVlKCkge1xuICByZXR1cm4gdHJ1ZTtcbn1cbmZ1bmN0aW9uIGlzUGxhaW5PYmoodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlICYmIHZhbHVlLmNvbnN0cnVjdG9yID09PSBPYmplY3Q7XG59XG5mdW5jdGlvbiB3aG9sZVNsaWNlKGJlZ2luLCBlbmQsIHNpemUpIHtcbiAgcmV0dXJuIChiZWdpbiA9PT0gMCB8fCAoc2l6ZSAhPT0gdW5kZWZpbmVkICYmIGJlZ2luIDw9IC1zaXplKSkgJiYgKGVuZCA9PT0gdW5kZWZpbmVkIHx8IChzaXplICE9PSB1bmRlZmluZWQgJiYgZW5kID49IHNpemUpKTtcbn1cbmZ1bmN0aW9uIHJlc29sdmVCZWdpbihiZWdpbiwgc2l6ZSkge1xuICByZXR1cm4gcmVzb2x2ZUluZGV4KGJlZ2luLCBzaXplLCAwKTtcbn1cbmZ1bmN0aW9uIHJlc29sdmVFbmQoZW5kLCBzaXplKSB7XG4gIHJldHVybiByZXNvbHZlSW5kZXgoZW5kLCBzaXplLCBzaXplKTtcbn1cbmZ1bmN0aW9uIHJlc29sdmVJbmRleChpbmRleCwgc2l6ZSwgZGVmYXVsdEluZGV4KSB7XG4gIHJldHVybiBpbmRleCA9PT0gdW5kZWZpbmVkID8gZGVmYXVsdEluZGV4IDogaW5kZXggPCAwID8gTWF0aC5tYXgoMCwgc2l6ZSArIGluZGV4KSA6IHNpemUgPT09IHVuZGVmaW5lZCA/IGluZGV4IDogTWF0aC5taW4oc2l6ZSwgaW5kZXgpO1xufVxuZnVuY3Rpb24gaGFzaChvKSB7XG4gIGlmICghbykge1xuICAgIHJldHVybiAwO1xuICB9XG4gIGlmIChvID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIDE7XG4gIH1cbiAgdmFyIHR5cGUgPSB0eXBlb2YgbztcbiAgaWYgKHR5cGUgPT09ICdudW1iZXInKSB7XG4gICAgaWYgKChvIHwgMCkgPT09IG8pIHtcbiAgICAgIHJldHVybiBvICYgSEFTSF9NQVhfVkFMO1xuICAgIH1cbiAgICBvID0gJycgKyBvO1xuICAgIHR5cGUgPSAnc3RyaW5nJztcbiAgfVxuICBpZiAodHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gby5sZW5ndGggPiBTVFJJTkdfSEFTSF9DQUNIRV9NSU5fU1RSTEVOID8gY2FjaGVkSGFzaFN0cmluZyhvKSA6IGhhc2hTdHJpbmcobyk7XG4gIH1cbiAgaWYgKG8uaGFzaENvZGUpIHtcbiAgICByZXR1cm4gaGFzaCh0eXBlb2Ygby5oYXNoQ29kZSA9PT0gJ2Z1bmN0aW9uJyA/IG8uaGFzaENvZGUoKSA6IG8uaGFzaENvZGUpO1xuICB9XG4gIHJldHVybiBoYXNoSlNPYmoobyk7XG59XG5mdW5jdGlvbiBjYWNoZWRIYXNoU3RyaW5nKHN0cmluZykge1xuICB2YXIgaGFzaCA9IHN0cmluZ0hhc2hDYWNoZVtzdHJpbmddO1xuICBpZiAoaGFzaCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgaGFzaCA9IGhhc2hTdHJpbmcoc3RyaW5nKTtcbiAgICBpZiAoU1RSSU5HX0hBU0hfQ0FDSEVfU0laRSA9PT0gU1RSSU5HX0hBU0hfQ0FDSEVfTUFYX1NJWkUpIHtcbiAgICAgIFNUUklOR19IQVNIX0NBQ0hFX1NJWkUgPSAwO1xuICAgICAgc3RyaW5nSGFzaENhY2hlID0ge307XG4gICAgfVxuICAgIFNUUklOR19IQVNIX0NBQ0hFX1NJWkUrKztcbiAgICBzdHJpbmdIYXNoQ2FjaGVbc3RyaW5nXSA9IGhhc2g7XG4gIH1cbiAgcmV0dXJuIGhhc2g7XG59XG5mdW5jdGlvbiBoYXNoU3RyaW5nKHN0cmluZykge1xuICB2YXIgaGFzaCA9IDA7XG4gIGZvciAodmFyIGlpID0gMDsgaWkgPCBzdHJpbmcubGVuZ3RoOyBpaSsrKSB7XG4gICAgaGFzaCA9ICgzMSAqIGhhc2ggKyBzdHJpbmcuY2hhckNvZGVBdChpaSkpICYgSEFTSF9NQVhfVkFMO1xuICB9XG4gIHJldHVybiBoYXNoO1xufVxuZnVuY3Rpb24gaGFzaEpTT2JqKG9iaikge1xuICB2YXIgaGFzaCA9IHdlYWtNYXAgJiYgd2Vha01hcC5nZXQob2JqKTtcbiAgaWYgKGhhc2gpXG4gICAgcmV0dXJuIGhhc2g7XG4gIGhhc2ggPSBvYmpbVUlEX0hBU0hfS0VZXTtcbiAgaWYgKGhhc2gpXG4gICAgcmV0dXJuIGhhc2g7XG4gIGlmICghY2FuRGVmaW5lUHJvcGVydHkpIHtcbiAgICBoYXNoID0gb2JqLnByb3BlcnR5SXNFbnVtZXJhYmxlICYmIG9iai5wcm9wZXJ0eUlzRW51bWVyYWJsZVtVSURfSEFTSF9LRVldO1xuICAgIGlmIChoYXNoKVxuICAgICAgcmV0dXJuIGhhc2g7XG4gICAgaGFzaCA9IGdldElFTm9kZUhhc2gob2JqKTtcbiAgICBpZiAoaGFzaClcbiAgICAgIHJldHVybiBoYXNoO1xuICB9XG4gIGlmIChPYmplY3QuaXNFeHRlbnNpYmxlICYmICFPYmplY3QuaXNFeHRlbnNpYmxlKG9iaikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vbi1leHRlbnNpYmxlIG9iamVjdHMgYXJlIG5vdCBhbGxvd2VkIGFzIGtleXMuJyk7XG4gIH1cbiAgaGFzaCA9ICsrb2JqSGFzaFVJRCAmIEhBU0hfTUFYX1ZBTDtcbiAgaWYgKHdlYWtNYXApIHtcbiAgICB3ZWFrTWFwLnNldChvYmosIGhhc2gpO1xuICB9IGVsc2UgaWYgKGNhbkRlZmluZVByb3BlcnR5KSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwgVUlEX0hBU0hfS0VZLCB7XG4gICAgICAnZW51bWVyYWJsZSc6IGZhbHNlLFxuICAgICAgJ2NvbmZpZ3VyYWJsZSc6IGZhbHNlLFxuICAgICAgJ3dyaXRhYmxlJzogZmFsc2UsXG4gICAgICAndmFsdWUnOiBoYXNoXG4gICAgfSk7XG4gIH0gZWxzZSBpZiAob2JqLnByb3BlcnR5SXNFbnVtZXJhYmxlICYmIG9iai5wcm9wZXJ0eUlzRW51bWVyYWJsZSA9PT0gb2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZSkge1xuICAgIG9iai5wcm9wZXJ0eUlzRW51bWVyYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgICBvYmoucHJvcGVydHlJc0VudW1lcmFibGVbVUlEX0hBU0hfS0VZXSA9IGhhc2g7XG4gIH0gZWxzZSBpZiAob2JqLm5vZGVUeXBlKSB7XG4gICAgb2JqW1VJRF9IQVNIX0tFWV0gPSBoYXNoO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIHNldCBhIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5IG9uIG9iamVjdC4nKTtcbiAgfVxuICByZXR1cm4gaGFzaDtcbn1cbnZhciBjYW5EZWZpbmVQcm9wZXJ0eSA9IChmdW5jdGlvbigpIHtcbiAgdHJ5IHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoe30sICd4Jywge30pO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59KCkpO1xuZnVuY3Rpb24gZ2V0SUVOb2RlSGFzaChub2RlKSB7XG4gIGlmIChub2RlICYmIG5vZGUubm9kZVR5cGUgPiAwKSB7XG4gICAgc3dpdGNoIChub2RlLm5vZGVUeXBlKSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHJldHVybiBub2RlLnVuaXF1ZUlEO1xuICAgICAgY2FzZSA5OlxuICAgICAgICByZXR1cm4gbm9kZS5kb2N1bWVudEVsZW1lbnQgJiYgbm9kZS5kb2N1bWVudEVsZW1lbnQudW5pcXVlSUQ7XG4gICAgfVxuICB9XG59XG52YXIgd2Vha01hcCA9IHR5cGVvZiBXZWFrTWFwID09PSAnZnVuY3Rpb24nICYmIG5ldyBXZWFrTWFwKCk7XG52YXIgSEFTSF9NQVhfVkFMID0gMHg3RkZGRkZGRjtcbnZhciBvYmpIYXNoVUlEID0gMDtcbnZhciBVSURfSEFTSF9LRVkgPSAnX19pbW11dGFibGVoYXNoX18nO1xuaWYgKHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicpIHtcbiAgVUlEX0hBU0hfS0VZID0gU3ltYm9sKFVJRF9IQVNIX0tFWSk7XG59XG52YXIgU1RSSU5HX0hBU0hfQ0FDSEVfTUlOX1NUUkxFTiA9IDE2O1xudmFyIFNUUklOR19IQVNIX0NBQ0hFX01BWF9TSVpFID0gMjU1O1xudmFyIFNUUklOR19IQVNIX0NBQ0hFX1NJWkUgPSAwO1xudmFyIHN0cmluZ0hhc2hDYWNoZSA9IHt9O1xudmFyIElURVJBVEVfS0VZUyA9IDA7XG52YXIgSVRFUkFURV9WQUxVRVMgPSAxO1xudmFyIElURVJBVEVfRU5UUklFUyA9IDI7XG52YXIgRkFVWF9JVEVSQVRPUl9TWU1CT0wgPSAnQEBpdGVyYXRvcic7XG52YXIgUkVBTF9JVEVSQVRPUl9TWU1CT0wgPSB0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmIFN5bWJvbC5pdGVyYXRvcjtcbnZhciBJVEVSQVRPUl9TWU1CT0wgPSBSRUFMX0lURVJBVE9SX1NZTUJPTCB8fCBGQVVYX0lURVJBVE9SX1NZTUJPTDtcbnZhciBJdGVyYXRvciA9IGZ1bmN0aW9uIEl0ZXJhdG9yKG5leHQpIHtcbiAgdGhpcy5uZXh0ID0gbmV4dDtcbn07XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShJdGVyYXRvciwge3RvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJ1tJdGVyYXRvcl0nO1xuICB9fSwge30pO1xuSXRlcmF0b3IuS0VZUyA9IElURVJBVEVfS0VZUztcbkl0ZXJhdG9yLlZBTFVFUyA9IElURVJBVEVfVkFMVUVTO1xuSXRlcmF0b3IuRU5UUklFUyA9IElURVJBVEVfRU5UUklFUztcbnZhciBJdGVyYXRvclByb3RvdHlwZSA9IEl0ZXJhdG9yLnByb3RvdHlwZTtcbkl0ZXJhdG9yUHJvdG90eXBlLmluc3BlY3QgPSBJdGVyYXRvclByb3RvdHlwZS50b1NvdXJjZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy50b1N0cmluZygpO1xufTtcbkl0ZXJhdG9yUHJvdG90eXBlW0lURVJBVE9SX1NZTUJPTF0gPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXM7XG59O1xuZnVuY3Rpb24gaXRlcmF0b3JWYWx1ZSh0eXBlLCBrLCB2LCBpdGVyYXRvclJlc3VsdCkge1xuICB2YXIgdmFsdWUgPSB0eXBlID09PSAwID8gayA6IHR5cGUgPT09IDEgPyB2IDogW2ssIHZdO1xuICBpdGVyYXRvclJlc3VsdCA/IChpdGVyYXRvclJlc3VsdC52YWx1ZSA9IHZhbHVlKSA6IChpdGVyYXRvclJlc3VsdCA9IHtcbiAgICB2YWx1ZTogdmFsdWUsXG4gICAgZG9uZTogZmFsc2VcbiAgfSk7XG4gIHJldHVybiBpdGVyYXRvclJlc3VsdDtcbn1cbmZ1bmN0aW9uIGl0ZXJhdG9yRG9uZSgpIHtcbiAgcmV0dXJuIHtcbiAgICB2YWx1ZTogdW5kZWZpbmVkLFxuICAgIGRvbmU6IHRydWVcbiAgfTtcbn1cbmZ1bmN0aW9uIGhhc0l0ZXJhdG9yKG1heWJlSXRlcmFibGUpIHtcbiAgcmV0dXJuICEhX2l0ZXJhdG9yRm4obWF5YmVJdGVyYWJsZSk7XG59XG5mdW5jdGlvbiBpc0l0ZXJhdG9yKG1heWJlSXRlcmF0b3IpIHtcbiAgcmV0dXJuIG1heWJlSXRlcmF0b3IgJiYgdHlwZW9mIG1heWJlSXRlcmF0b3IubmV4dCA9PT0gJ2Z1bmN0aW9uJztcbn1cbmZ1bmN0aW9uIGdldEl0ZXJhdG9yKGl0ZXJhYmxlKSB7XG4gIHZhciBpdGVyYXRvckZuID0gX2l0ZXJhdG9yRm4oaXRlcmFibGUpO1xuICByZXR1cm4gaXRlcmF0b3JGbiAmJiBpdGVyYXRvckZuLmNhbGwoaXRlcmFibGUpO1xufVxuZnVuY3Rpb24gX2l0ZXJhdG9yRm4oaXRlcmFibGUpIHtcbiAgdmFyIGl0ZXJhdG9yRm4gPSBpdGVyYWJsZSAmJiAoKFJFQUxfSVRFUkFUT1JfU1lNQk9MICYmIGl0ZXJhYmxlW1JFQUxfSVRFUkFUT1JfU1lNQk9MXSkgfHwgaXRlcmFibGVbRkFVWF9JVEVSQVRPUl9TWU1CT0xdKTtcbiAgaWYgKHR5cGVvZiBpdGVyYXRvckZuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGl0ZXJhdG9yRm47XG4gIH1cbn1cbnZhciBJdGVyYWJsZSA9IGZ1bmN0aW9uIEl0ZXJhYmxlKHZhbHVlKSB7XG4gIHJldHVybiBpc0l0ZXJhYmxlKHZhbHVlKSA/IHZhbHVlIDogU2VxLmFwcGx5KHVuZGVmaW5lZCwgYXJndW1lbnRzKTtcbn07XG52YXIgJEl0ZXJhYmxlID0gSXRlcmFibGU7XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShJdGVyYWJsZSwge1xuICB0b0FycmF5OiBmdW5jdGlvbigpIHtcbiAgICBhc3NlcnROb3RJbmZpbml0ZSh0aGlzLnNpemUpO1xuICAgIHZhciBhcnJheSA9IG5ldyBBcnJheSh0aGlzLnNpemUgfHwgMCk7XG4gICAgdGhpcy52YWx1ZVNlcSgpLl9faXRlcmF0ZSgoZnVuY3Rpb24odiwgaSkge1xuICAgICAgYXJyYXlbaV0gPSB2O1xuICAgIH0pKTtcbiAgICByZXR1cm4gYXJyYXk7XG4gIH0sXG4gIHRvSW5kZXhlZFNlcTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBUb0luZGV4ZWRTZXF1ZW5jZSh0aGlzKTtcbiAgfSxcbiAgdG9KUzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudG9TZXEoKS5tYXAoKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlLnRvSlMgPT09ICdmdW5jdGlvbicgPyB2YWx1ZS50b0pTKCkgOiB2YWx1ZTtcbiAgICB9KSkuX190b0pTKCk7XG4gIH0sXG4gIHRvS2V5ZWRTZXE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgVG9LZXllZFNlcXVlbmNlKHRoaXMsIHRydWUpO1xuICB9LFxuICB0b01hcDogZnVuY3Rpb24oKSB7XG4gICAgYXNzZXJ0Tm90SW5maW5pdGUodGhpcy5zaXplKTtcbiAgICByZXR1cm4gTWFwKHRoaXMudG9LZXllZFNlcSgpKTtcbiAgfSxcbiAgdG9PYmplY3Q6IGZ1bmN0aW9uKCkge1xuICAgIGFzc2VydE5vdEluZmluaXRlKHRoaXMuc2l6ZSk7XG4gICAgdmFyIG9iamVjdCA9IHt9O1xuICAgIHRoaXMuX19pdGVyYXRlKChmdW5jdGlvbih2LCBrKSB7XG4gICAgICBvYmplY3Rba10gPSB2O1xuICAgIH0pKTtcbiAgICByZXR1cm4gb2JqZWN0O1xuICB9LFxuICB0b09yZGVyZWRNYXA6IGZ1bmN0aW9uKCkge1xuICAgIGFzc2VydE5vdEluZmluaXRlKHRoaXMuc2l6ZSk7XG4gICAgcmV0dXJuIE9yZGVyZWRNYXAodGhpcy50b0tleWVkU2VxKCkpO1xuICB9LFxuICB0b1NldDogZnVuY3Rpb24oKSB7XG4gICAgYXNzZXJ0Tm90SW5maW5pdGUodGhpcy5zaXplKTtcbiAgICByZXR1cm4gU2V0KHRoaXMpO1xuICB9LFxuICB0b1NldFNlcTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBUb1NldFNlcXVlbmNlKHRoaXMsIHRydWUpO1xuICB9LFxuICB0b1NlcTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGlzSW5kZXhlZCh0aGlzKSA/IHRoaXMudG9JbmRleGVkU2VxKCkgOiBpc0tleWVkKHRoaXMpID8gdGhpcy50b0tleWVkU2VxKCkgOiB0aGlzLnRvU2V0U2VxKCk7XG4gIH0sXG4gIHRvU3RhY2s6IGZ1bmN0aW9uKCkge1xuICAgIGFzc2VydE5vdEluZmluaXRlKHRoaXMuc2l6ZSk7XG4gICAgcmV0dXJuIFN0YWNrKHRoaXMpO1xuICB9LFxuICB0b0xpc3Q6IGZ1bmN0aW9uKCkge1xuICAgIGFzc2VydE5vdEluZmluaXRlKHRoaXMuc2l6ZSk7XG4gICAgcmV0dXJuIExpc3QodGhpcyk7XG4gIH0sXG4gIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJ1tJdGVyYWJsZV0nO1xuICB9LFxuICBfX3RvU3RyaW5nOiBmdW5jdGlvbihoZWFkLCB0YWlsKSB7XG4gICAgaWYgKHRoaXMuc2l6ZSA9PT0gMCkge1xuICAgICAgcmV0dXJuIGhlYWQgKyB0YWlsO1xuICAgIH1cbiAgICByZXR1cm4gaGVhZCArICcgJyArIHRoaXMudG9TZXEoKS5tYXAodGhpcy5fX3RvU3RyaW5nTWFwcGVyKS5qb2luKCcsICcpICsgJyAnICsgdGFpbDtcbiAgfSxcbiAgY29uY2F0OiBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciB2YWx1ZXMgPSBbXSxcbiAgICAgICAgJF9fMiA9IDA7ICRfXzIgPCBhcmd1bWVudHMubGVuZ3RoOyAkX18yKyspXG4gICAgICB2YWx1ZXNbJF9fMl0gPSBhcmd1bWVudHNbJF9fMl07XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIGNvbmNhdEZhY3RvcnkodGhpcywgdmFsdWVzLCB0cnVlKSk7XG4gIH0sXG4gIGNvbnRhaW5zOiBmdW5jdGlvbihzZWFyY2hWYWx1ZSkge1xuICAgIHJldHVybiB0aGlzLnNvbWUoKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gaXModmFsdWUsIHNlYXJjaFZhbHVlKTtcbiAgICB9KSk7XG4gIH0sXG4gIGVudHJpZXM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9faXRlcmF0b3IoSVRFUkFURV9FTlRSSUVTKTtcbiAgfSxcbiAgZXZlcnk6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHZhciByZXR1cm5WYWx1ZSA9IHRydWU7XG4gICAgdGhpcy5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYsIGssIGMpIHtcbiAgICAgIGlmICghcHJlZGljYXRlLmNhbGwoY29udGV4dCwgdiwgaywgYykpIHtcbiAgICAgICAgcmV0dXJuVmFsdWUgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0pKTtcbiAgICByZXR1cm4gcmV0dXJuVmFsdWU7XG4gIH0sXG4gIGZpbHRlcjogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIGZpbHRlckZhY3RvcnkodGhpcywgcHJlZGljYXRlLCBjb250ZXh0LCB0cnVlKSk7XG4gIH0sXG4gIGZpbmQ6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCwgbm90U2V0VmFsdWUpIHtcbiAgICB2YXIgZm91bmRWYWx1ZSA9IG5vdFNldFZhbHVlO1xuICAgIHRoaXMuX19pdGVyYXRlKChmdW5jdGlvbih2LCBrLCBjKSB7XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwoY29udGV4dCwgdiwgaywgYykpIHtcbiAgICAgICAgZm91bmRWYWx1ZSA9IHY7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9KSk7XG4gICAgcmV0dXJuIGZvdW5kVmFsdWU7XG4gIH0sXG4gIGZvckVhY2g6IGZ1bmN0aW9uKHNpZGVFZmZlY3QsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gdGhpcy5fX2l0ZXJhdGUoY29udGV4dCA/IHNpZGVFZmZlY3QuYmluZChjb250ZXh0KSA6IHNpZGVFZmZlY3QpO1xuICB9LFxuICBqb2luOiBmdW5jdGlvbihzZXBhcmF0b3IpIHtcbiAgICBzZXBhcmF0b3IgPSBzZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/ICcnICsgc2VwYXJhdG9yIDogJywnO1xuICAgIHZhciBqb2luZWQgPSAnJztcbiAgICB2YXIgaXNGaXJzdCA9IHRydWU7XG4gICAgdGhpcy5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlzRmlyc3QgPyAoaXNGaXJzdCA9IGZhbHNlKSA6IChqb2luZWQgKz0gc2VwYXJhdG9yKTtcbiAgICAgIGpvaW5lZCArPSB2ICE9PSBudWxsICYmIHYgIT09IHVuZGVmaW5lZCA/IHYgOiAnJztcbiAgICB9KSk7XG4gICAgcmV0dXJuIGpvaW5lZDtcbiAgfSxcbiAga2V5czogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX19pdGVyYXRvcihJVEVSQVRFX0tFWVMpO1xuICB9LFxuICBtYXA6IGZ1bmN0aW9uKG1hcHBlciwgY29udGV4dCkge1xuICAgIHJldHVybiByZWlmeSh0aGlzLCBtYXBGYWN0b3J5KHRoaXMsIG1hcHBlciwgY29udGV4dCkpO1xuICB9LFxuICByZWR1Y2U6IGZ1bmN0aW9uKHJlZHVjZXIsIGluaXRpYWxSZWR1Y3Rpb24sIGNvbnRleHQpIHtcbiAgICB2YXIgcmVkdWN0aW9uO1xuICAgIHZhciB1c2VGaXJzdDtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgIHVzZUZpcnN0ID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVkdWN0aW9uID0gaW5pdGlhbFJlZHVjdGlvbjtcbiAgICB9XG4gICAgdGhpcy5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYsIGssIGMpIHtcbiAgICAgIGlmICh1c2VGaXJzdCkge1xuICAgICAgICB1c2VGaXJzdCA9IGZhbHNlO1xuICAgICAgICByZWR1Y3Rpb24gPSB2O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVkdWN0aW9uID0gcmVkdWNlci5jYWxsKGNvbnRleHQsIHJlZHVjdGlvbiwgdiwgaywgYyk7XG4gICAgICB9XG4gICAgfSkpO1xuICAgIHJldHVybiByZWR1Y3Rpb247XG4gIH0sXG4gIHJlZHVjZVJpZ2h0OiBmdW5jdGlvbihyZWR1Y2VyLCBpbml0aWFsUmVkdWN0aW9uLCBjb250ZXh0KSB7XG4gICAgdmFyIHJldmVyc2VkID0gdGhpcy50b0tleWVkU2VxKCkucmV2ZXJzZSgpO1xuICAgIHJldHVybiByZXZlcnNlZC5yZWR1Y2UuYXBwbHkocmV2ZXJzZWQsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIHJldmVyc2U6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiByZWlmeSh0aGlzLCByZXZlcnNlRmFjdG9yeSh0aGlzLCB0cnVlKSk7XG4gIH0sXG4gIHNsaWNlOiBmdW5jdGlvbihiZWdpbiwgZW5kKSB7XG4gICAgaWYgKHdob2xlU2xpY2UoYmVnaW4sIGVuZCwgdGhpcy5zaXplKSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciByZXNvbHZlZEJlZ2luID0gcmVzb2x2ZUJlZ2luKGJlZ2luLCB0aGlzLnNpemUpO1xuICAgIHZhciByZXNvbHZlZEVuZCA9IHJlc29sdmVFbmQoZW5kLCB0aGlzLnNpemUpO1xuICAgIGlmIChyZXNvbHZlZEJlZ2luICE9PSByZXNvbHZlZEJlZ2luIHx8IHJlc29sdmVkRW5kICE9PSByZXNvbHZlZEVuZCkge1xuICAgICAgcmV0dXJuIHRoaXMudG9TZXEoKS5jYWNoZVJlc3VsdCgpLnNsaWNlKGJlZ2luLCBlbmQpO1xuICAgIH1cbiAgICB2YXIgc2tpcHBlZCA9IHJlc29sdmVkQmVnaW4gPT09IDAgPyB0aGlzIDogdGhpcy5za2lwKHJlc29sdmVkQmVnaW4pO1xuICAgIHJldHVybiByZWlmeSh0aGlzLCByZXNvbHZlZEVuZCA9PT0gdW5kZWZpbmVkIHx8IHJlc29sdmVkRW5kID09PSB0aGlzLnNpemUgPyBza2lwcGVkIDogc2tpcHBlZC50YWtlKHJlc29sdmVkRW5kIC0gcmVzb2x2ZWRCZWdpbikpO1xuICB9LFxuICBzb21lOiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gIXRoaXMuZXZlcnkobm90KHByZWRpY2F0ZSksIGNvbnRleHQpO1xuICB9LFxuICBzb3J0OiBmdW5jdGlvbihjb21wYXJhdG9yKSB7XG4gICAgcmV0dXJuIHRoaXMuc29ydEJ5KHZhbHVlTWFwcGVyLCBjb21wYXJhdG9yKTtcbiAgfSxcbiAgdmFsdWVzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fX2l0ZXJhdG9yKElURVJBVEVfVkFMVUVTKTtcbiAgfSxcbiAgYnV0TGFzdDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuc2xpY2UoMCwgLTEpO1xuICB9LFxuICBjb3VudDogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIGVuc3VyZVNpemUocHJlZGljYXRlID8gdGhpcy50b1NlcSgpLmZpbHRlcihwcmVkaWNhdGUsIGNvbnRleHQpIDogdGhpcyk7XG4gIH0sXG4gIGNvdW50Qnk6IGZ1bmN0aW9uKGdyb3VwZXIsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gY291bnRCeUZhY3RvcnkodGhpcywgZ3JvdXBlciwgY29udGV4dCk7XG4gIH0sXG4gIGVxdWFsczogZnVuY3Rpb24ob3RoZXIpIHtcbiAgICBpZiAodGhpcyA9PT0gb3RoZXIpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoIW90aGVyIHx8IHR5cGVvZiBvdGhlci5lcXVhbHMgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKHRoaXMuc2l6ZSAhPT0gdW5kZWZpbmVkICYmIG90aGVyLnNpemUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKHRoaXMuc2l6ZSAhPT0gb3RoZXIuc2l6ZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5zaXplID09PSAwICYmIG90aGVyLnNpemUgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0aGlzLl9faGFzaCAhPT0gdW5kZWZpbmVkICYmIG90aGVyLl9faGFzaCAhPT0gdW5kZWZpbmVkICYmIHRoaXMuX19oYXNoICE9PSBvdGhlci5fX2hhc2gpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX19kZWVwRXF1YWxzKG90aGVyKTtcbiAgfSxcbiAgX19kZWVwRXF1YWxzOiBmdW5jdGlvbihvdGhlcikge1xuICAgIHZhciBlbnRyaWVzID0gdGhpcy5lbnRyaWVzKCk7XG4gICAgcmV0dXJuIHR5cGVvZiBvdGhlci5ldmVyeSA9PT0gJ2Z1bmN0aW9uJyAmJiBvdGhlci5ldmVyeSgoZnVuY3Rpb24odiwgaykge1xuICAgICAgdmFyIGVudHJ5ID0gZW50cmllcy5uZXh0KCkudmFsdWU7XG4gICAgICByZXR1cm4gZW50cnkgJiYgaXMoZW50cnlbMF0sIGspICYmIGlzKGVudHJ5WzFdLCB2KTtcbiAgICB9KSkgJiYgZW50cmllcy5uZXh0KCkuZG9uZTtcbiAgfSxcbiAgZW50cnlTZXE6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVyYWJsZSA9IHRoaXM7XG4gICAgaWYgKGl0ZXJhYmxlLl9jYWNoZSkge1xuICAgICAgcmV0dXJuIG5ldyBBcnJheVNlcShpdGVyYWJsZS5fY2FjaGUpO1xuICAgIH1cbiAgICB2YXIgZW50cmllc1NlcXVlbmNlID0gaXRlcmFibGUudG9TZXEoKS5tYXAoZW50cnlNYXBwZXIpLnRvSW5kZXhlZFNlcSgpO1xuICAgIGVudHJpZXNTZXF1ZW5jZS5mcm9tRW50cnlTZXEgPSAoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gaXRlcmFibGUudG9TZXEoKTtcbiAgICB9KTtcbiAgICByZXR1cm4gZW50cmllc1NlcXVlbmNlO1xuICB9LFxuICBmaWx0ZXJOb3Q6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcihub3QocHJlZGljYXRlKSwgY29udGV4dCk7XG4gIH0sXG4gIGZpbmRMYXN0OiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQsIG5vdFNldFZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMudG9LZXllZFNlcSgpLnJldmVyc2UoKS5maW5kKHByZWRpY2F0ZSwgY29udGV4dCwgbm90U2V0VmFsdWUpO1xuICB9LFxuICBmaXJzdDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZmluZChyZXR1cm5UcnVlKTtcbiAgfSxcbiAgZmxhdE1hcDogZnVuY3Rpb24obWFwcGVyLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIGZsYXRNYXBGYWN0b3J5KHRoaXMsIG1hcHBlciwgY29udGV4dCkpO1xuICB9LFxuICBmbGF0dGVuOiBmdW5jdGlvbihkZXB0aCkge1xuICAgIHJldHVybiByZWlmeSh0aGlzLCBmbGF0dGVuRmFjdG9yeSh0aGlzLCBkZXB0aCwgdHJ1ZSkpO1xuICB9LFxuICBmcm9tRW50cnlTZXE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgRnJvbUVudHJpZXNTZXF1ZW5jZSh0aGlzKTtcbiAgfSxcbiAgZ2V0OiBmdW5jdGlvbihzZWFyY2hLZXksIG5vdFNldFZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuZmluZCgoZnVuY3Rpb24oXywga2V5KSB7XG4gICAgICByZXR1cm4gaXMoa2V5LCBzZWFyY2hLZXkpO1xuICAgIH0pLCB1bmRlZmluZWQsIG5vdFNldFZhbHVlKTtcbiAgfSxcbiAgZ2V0SW46IGZ1bmN0aW9uKHNlYXJjaEtleVBhdGgsIG5vdFNldFZhbHVlKSB7XG4gICAgdmFyIG5lc3RlZCA9IHRoaXM7XG4gICAgaWYgKHNlYXJjaEtleVBhdGgpIHtcbiAgICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBzZWFyY2hLZXlQYXRoLmxlbmd0aDsgaWkrKykge1xuICAgICAgICBuZXN0ZWQgPSBuZXN0ZWQgJiYgbmVzdGVkLmdldCA/IG5lc3RlZC5nZXQoc2VhcmNoS2V5UGF0aFtpaV0sIE5PVF9TRVQpIDogTk9UX1NFVDtcbiAgICAgICAgaWYgKG5lc3RlZCA9PT0gTk9UX1NFVCkge1xuICAgICAgICAgIHJldHVybiBub3RTZXRWYWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmVzdGVkO1xuICB9LFxuICBncm91cEJ5OiBmdW5jdGlvbihncm91cGVyLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIGdyb3VwQnlGYWN0b3J5KHRoaXMsIGdyb3VwZXIsIGNvbnRleHQpO1xuICB9LFxuICBoYXM6IGZ1bmN0aW9uKHNlYXJjaEtleSkge1xuICAgIHJldHVybiB0aGlzLmdldChzZWFyY2hLZXksIE5PVF9TRVQpICE9PSBOT1RfU0VUO1xuICB9LFxuICBpc1N1YnNldDogZnVuY3Rpb24oaXRlcikge1xuICAgIGl0ZXIgPSB0eXBlb2YgaXRlci5jb250YWlucyA9PT0gJ2Z1bmN0aW9uJyA/IGl0ZXIgOiAkSXRlcmFibGUoaXRlcik7XG4gICAgcmV0dXJuIHRoaXMuZXZlcnkoKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gaXRlci5jb250YWlucyh2YWx1ZSk7XG4gICAgfSkpO1xuICB9LFxuICBpc1N1cGVyc2V0OiBmdW5jdGlvbihpdGVyKSB7XG4gICAgcmV0dXJuIGl0ZXIuaXNTdWJzZXQodGhpcyk7XG4gIH0sXG4gIGtleVNlcTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudG9TZXEoKS5tYXAoa2V5TWFwcGVyKS50b0luZGV4ZWRTZXEoKTtcbiAgfSxcbiAgbGFzdDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudG9TZXEoKS5yZXZlcnNlKCkuZmlyc3QoKTtcbiAgfSxcbiAgbWF4OiBmdW5jdGlvbihjb21wYXJhdG9yKSB7XG4gICAgcmV0dXJuIHRoaXMubWF4QnkodmFsdWVNYXBwZXIsIGNvbXBhcmF0b3IpO1xuICB9LFxuICBtYXhCeTogZnVuY3Rpb24obWFwcGVyLCBjb21wYXJhdG9yKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIGNvbXBhcmF0b3IgPSBjb21wYXJhdG9yIHx8IGRlZmF1bHRDb21wYXJhdG9yO1xuICAgIHZhciBtYXhFbnRyeSA9IHRoaXMuZW50cnlTZXEoKS5yZWR1Y2UoKGZ1bmN0aW9uKG1heCwgbmV4dCkge1xuICAgICAgcmV0dXJuIGNvbXBhcmF0b3IobWFwcGVyKG5leHRbMV0sIG5leHRbMF0sICRfXzApLCBtYXBwZXIobWF4WzFdLCBtYXhbMF0sICRfXzApKSA+IDAgPyBuZXh0IDogbWF4O1xuICAgIH0pKTtcbiAgICByZXR1cm4gbWF4RW50cnkgJiYgbWF4RW50cnlbMV07XG4gIH0sXG4gIG1pbjogZnVuY3Rpb24oY29tcGFyYXRvcikge1xuICAgIHJldHVybiB0aGlzLm1pbkJ5KHZhbHVlTWFwcGVyLCBjb21wYXJhdG9yKTtcbiAgfSxcbiAgbWluQnk6IGZ1bmN0aW9uKG1hcHBlciwgY29tcGFyYXRvcikge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICBjb21wYXJhdG9yID0gY29tcGFyYXRvciB8fCBkZWZhdWx0Q29tcGFyYXRvcjtcbiAgICB2YXIgbWluRW50cnkgPSB0aGlzLmVudHJ5U2VxKCkucmVkdWNlKChmdW5jdGlvbihtaW4sIG5leHQpIHtcbiAgICAgIHJldHVybiBjb21wYXJhdG9yKG1hcHBlcihuZXh0WzFdLCBuZXh0WzBdLCAkX18wKSwgbWFwcGVyKG1pblsxXSwgbWluWzBdLCAkX18wKSkgPCAwID8gbmV4dCA6IG1pbjtcbiAgICB9KSk7XG4gICAgcmV0dXJuIG1pbkVudHJ5ICYmIG1pbkVudHJ5WzFdO1xuICB9LFxuICByZXN0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5zbGljZSgxKTtcbiAgfSxcbiAgc2tpcDogZnVuY3Rpb24oYW1vdW50KSB7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIHNraXBGYWN0b3J5KHRoaXMsIGFtb3VudCwgdHJ1ZSkpO1xuICB9LFxuICBza2lwTGFzdDogZnVuY3Rpb24oYW1vdW50KSB7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIHRoaXMudG9TZXEoKS5yZXZlcnNlKCkuc2tpcChhbW91bnQpLnJldmVyc2UoKSk7XG4gIH0sXG4gIHNraXBXaGlsZTogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIHNraXBXaGlsZUZhY3RvcnkodGhpcywgcHJlZGljYXRlLCBjb250ZXh0LCB0cnVlKSk7XG4gIH0sXG4gIHNraXBVbnRpbDogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHRoaXMuc2tpcFdoaWxlKG5vdChwcmVkaWNhdGUpLCBjb250ZXh0KTtcbiAgfSxcbiAgc29ydEJ5OiBmdW5jdGlvbihtYXBwZXIsIGNvbXBhcmF0b3IpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgY29tcGFyYXRvciA9IGNvbXBhcmF0b3IgfHwgZGVmYXVsdENvbXBhcmF0b3I7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIG5ldyBBcnJheVNlcSh0aGlzLmVudHJ5U2VxKCkuZW50cnlTZXEoKS50b0FycmF5KCkuc29ydCgoZnVuY3Rpb24oYSwgYikge1xuICAgICAgcmV0dXJuIGNvbXBhcmF0b3IobWFwcGVyKGFbMV1bMV0sIGFbMV1bMF0sICRfXzApLCBtYXBwZXIoYlsxXVsxXSwgYlsxXVswXSwgJF9fMCkpIHx8IGFbMF0gLSBiWzBdO1xuICAgIH0pKSkuZnJvbUVudHJ5U2VxKCkudmFsdWVTZXEoKS5mcm9tRW50cnlTZXEoKSk7XG4gIH0sXG4gIHRha2U6IGZ1bmN0aW9uKGFtb3VudCkge1xuICAgIHJldHVybiByZWlmeSh0aGlzLCB0YWtlRmFjdG9yeSh0aGlzLCBhbW91bnQpKTtcbiAgfSxcbiAgdGFrZUxhc3Q6IGZ1bmN0aW9uKGFtb3VudCkge1xuICAgIHJldHVybiByZWlmeSh0aGlzLCB0aGlzLnRvU2VxKCkucmV2ZXJzZSgpLnRha2UoYW1vdW50KS5yZXZlcnNlKCkpO1xuICB9LFxuICB0YWtlV2hpbGU6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHJldHVybiByZWlmeSh0aGlzLCB0YWtlV2hpbGVGYWN0b3J5KHRoaXMsIHByZWRpY2F0ZSwgY29udGV4dCkpO1xuICB9LFxuICB0YWtlVW50aWw6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHJldHVybiB0aGlzLnRha2VXaGlsZShub3QocHJlZGljYXRlKSwgY29udGV4dCk7XG4gIH0sXG4gIHZhbHVlU2VxOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy50b0luZGV4ZWRTZXEoKTtcbiAgfSxcbiAgaGFzaENvZGU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9faGFzaCB8fCAodGhpcy5fX2hhc2ggPSB0aGlzLnNpemUgPT09IEluZmluaXR5ID8gMCA6IHRoaXMucmVkdWNlKChmdW5jdGlvbihoLCB2LCBrKSB7XG4gICAgICByZXR1cm4gKGggKyAoaGFzaCh2KSBeICh2ID09PSBrID8gMCA6IGhhc2goaykpKSkgJiBIQVNIX01BWF9WQUw7XG4gICAgfSksIDApKTtcbiAgfVxufSwge30pO1xudmFyIElTX0lURVJBQkxFX1NFTlRJTkVMID0gJ0BAX19JTU1VVEFCTEVfSVRFUkFCTEVfX0BAJztcbnZhciBJU19LRVlFRF9TRU5USU5FTCA9ICdAQF9fSU1NVVRBQkxFX0tFWUVEX19AQCc7XG52YXIgSVNfSU5ERVhFRF9TRU5USU5FTCA9ICdAQF9fSU1NVVRBQkxFX0lOREVYRURfX0BAJztcbnZhciBJdGVyYWJsZVByb3RvdHlwZSA9IEl0ZXJhYmxlLnByb3RvdHlwZTtcbkl0ZXJhYmxlUHJvdG90eXBlW0lTX0lURVJBQkxFX1NFTlRJTkVMXSA9IHRydWU7XG5JdGVyYWJsZVByb3RvdHlwZVtJVEVSQVRPUl9TWU1CT0xdID0gSXRlcmFibGVQcm90b3R5cGUudmFsdWVzO1xuSXRlcmFibGVQcm90b3R5cGUudG9KU09OID0gSXRlcmFibGVQcm90b3R5cGUudG9KUztcbkl0ZXJhYmxlUHJvdG90eXBlLl9fdG9KUyA9IEl0ZXJhYmxlUHJvdG90eXBlLnRvQXJyYXk7XG5JdGVyYWJsZVByb3RvdHlwZS5fX3RvU3RyaW5nTWFwcGVyID0gcXVvdGVTdHJpbmc7XG5JdGVyYWJsZVByb3RvdHlwZS5pbnNwZWN0ID0gSXRlcmFibGVQcm90b3R5cGUudG9Tb3VyY2UgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKTtcbn07XG5JdGVyYWJsZVByb3RvdHlwZS5jaGFpbiA9IEl0ZXJhYmxlUHJvdG90eXBlLmZsYXRNYXA7XG4oZnVuY3Rpb24oKSB7XG4gIHRyeSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEl0ZXJhYmxlUHJvdG90eXBlLCAnbGVuZ3RoJywge2dldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghSXRlcmFibGUubm9MZW5ndGhXYXJuaW5nKSB7XG4gICAgICAgICAgdmFyIHN0YWNrO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgc3RhY2sgPSBlcnJvci5zdGFjaztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHN0YWNrLmluZGV4T2YoJ193cmFwT2JqZWN0JykgPT09IC0xKSB7XG4gICAgICAgICAgICBjb25zb2xlICYmIGNvbnNvbGUud2FybiAmJiBjb25zb2xlLndhcm4oJ2l0ZXJhYmxlLmxlbmd0aCBoYXMgYmVlbiBkZXByZWNhdGVkLCAnICsgJ3VzZSBpdGVyYWJsZS5zaXplIG9yIGl0ZXJhYmxlLmNvdW50KCkuICcgKyAnVGhpcyB3YXJuaW5nIHdpbGwgYmVjb21lIGEgc2lsZW50IGVycm9yIGluIGEgZnV0dXJlIHZlcnNpb24uICcgKyBzdGFjayk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zaXplO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfX0pO1xuICB9IGNhdGNoIChlKSB7fVxufSkoKTtcbnZhciBLZXllZEl0ZXJhYmxlID0gZnVuY3Rpb24gS2V5ZWRJdGVyYWJsZSh2YWx1ZSkge1xuICByZXR1cm4gaXNLZXllZCh2YWx1ZSkgPyB2YWx1ZSA6IEtleWVkU2VxLmFwcGx5KHVuZGVmaW5lZCwgYXJndW1lbnRzKTtcbn07XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShLZXllZEl0ZXJhYmxlLCB7XG4gIGZsaXA6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiByZWlmeSh0aGlzLCBmbGlwRmFjdG9yeSh0aGlzKSk7XG4gIH0sXG4gIGZpbmRLZXk6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHZhciBmb3VuZEtleTtcbiAgICB0aGlzLl9faXRlcmF0ZSgoZnVuY3Rpb24odiwgaywgYykge1xuICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHYsIGssIGMpKSB7XG4gICAgICAgIGZvdW5kS2V5ID0gaztcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0pKTtcbiAgICByZXR1cm4gZm91bmRLZXk7XG4gIH0sXG4gIGZpbmRMYXN0S2V5OiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gdGhpcy50b1NlcSgpLnJldmVyc2UoKS5maW5kS2V5KHByZWRpY2F0ZSwgY29udGV4dCk7XG4gIH0sXG4gIGtleU9mOiBmdW5jdGlvbihzZWFyY2hWYWx1ZSkge1xuICAgIHJldHVybiB0aGlzLmZpbmRLZXkoKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gaXModmFsdWUsIHNlYXJjaFZhbHVlKTtcbiAgICB9KSk7XG4gIH0sXG4gIGxhc3RLZXlPZjogZnVuY3Rpb24oc2VhcmNoVmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy50b1NlcSgpLnJldmVyc2UoKS5rZXlPZihzZWFyY2hWYWx1ZSk7XG4gIH0sXG4gIG1hcEVudHJpZXM6IGZ1bmN0aW9uKG1hcHBlciwgY29udGV4dCkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIHRoaXMudG9TZXEoKS5tYXAoKGZ1bmN0aW9uKHYsIGspIHtcbiAgICAgIHJldHVybiBtYXBwZXIuY2FsbChjb250ZXh0LCBbaywgdl0sIGl0ZXJhdGlvbnMrKywgJF9fMCk7XG4gICAgfSkpLmZyb21FbnRyeVNlcSgpKTtcbiAgfSxcbiAgbWFwS2V5czogZnVuY3Rpb24obWFwcGVyLCBjb250ZXh0KSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIHJldHVybiByZWlmeSh0aGlzLCB0aGlzLnRvU2VxKCkuZmxpcCgpLm1hcCgoZnVuY3Rpb24oaywgdikge1xuICAgICAgcmV0dXJuIG1hcHBlci5jYWxsKGNvbnRleHQsIGssIHYsICRfXzApO1xuICAgIH0pKS5mbGlwKCkpO1xuICB9XG59LCB7fSwgSXRlcmFibGUpO1xudmFyIEtleWVkSXRlcmFibGVQcm90b3R5cGUgPSBLZXllZEl0ZXJhYmxlLnByb3RvdHlwZTtcbktleWVkSXRlcmFibGVQcm90b3R5cGVbSVNfS0VZRURfU0VOVElORUxdID0gdHJ1ZTtcbktleWVkSXRlcmFibGVQcm90b3R5cGVbSVRFUkFUT1JfU1lNQk9MXSA9IEl0ZXJhYmxlUHJvdG90eXBlLmVudHJpZXM7XG5LZXllZEl0ZXJhYmxlUHJvdG90eXBlLl9fdG9KUyA9IEl0ZXJhYmxlUHJvdG90eXBlLnRvT2JqZWN0O1xuS2V5ZWRJdGVyYWJsZVByb3RvdHlwZS5fX3RvU3RyaW5nTWFwcGVyID0gKGZ1bmN0aW9uKHYsIGspIHtcbiAgcmV0dXJuIGsgKyAnOiAnICsgcXVvdGVTdHJpbmcodik7XG59KTtcbnZhciBJbmRleGVkSXRlcmFibGUgPSBmdW5jdGlvbiBJbmRleGVkSXRlcmFibGUodmFsdWUpIHtcbiAgcmV0dXJuIGlzSW5kZXhlZCh2YWx1ZSkgPyB2YWx1ZSA6IEluZGV4ZWRTZXEuYXBwbHkodW5kZWZpbmVkLCBhcmd1bWVudHMpO1xufTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKEluZGV4ZWRJdGVyYWJsZSwge1xuICB0b0tleWVkU2VxOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFRvS2V5ZWRTZXF1ZW5jZSh0aGlzLCBmYWxzZSk7XG4gIH0sXG4gIGNvbmNhdDogZnVuY3Rpb24oKSB7XG4gICAgZm9yICh2YXIgdmFsdWVzID0gW10sXG4gICAgICAgICRfXzMgPSAwOyAkX18zIDwgYXJndW1lbnRzLmxlbmd0aDsgJF9fMysrKVxuICAgICAgdmFsdWVzWyRfXzNdID0gYXJndW1lbnRzWyRfXzNdO1xuICAgIHJldHVybiByZWlmeSh0aGlzLCBjb25jYXRGYWN0b3J5KHRoaXMsIHZhbHVlcywgZmFsc2UpKTtcbiAgfSxcbiAgZmlsdGVyOiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgZmlsdGVyRmFjdG9yeSh0aGlzLCBwcmVkaWNhdGUsIGNvbnRleHQsIGZhbHNlKSk7XG4gIH0sXG4gIGZpbmRJbmRleDogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgdmFyIGtleSA9IHRoaXMudG9LZXllZFNlcSgpLmZpbmRLZXkocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICByZXR1cm4ga2V5ID09PSB1bmRlZmluZWQgPyAtMSA6IGtleTtcbiAgfSxcbiAgaW5kZXhPZjogZnVuY3Rpb24oc2VhcmNoVmFsdWUpIHtcbiAgICB2YXIga2V5ID0gdGhpcy50b0tleWVkU2VxKCkua2V5T2Yoc2VhcmNoVmFsdWUpO1xuICAgIHJldHVybiBrZXkgPT09IHVuZGVmaW5lZCA/IC0xIDoga2V5O1xuICB9LFxuICBsYXN0SW5kZXhPZjogZnVuY3Rpb24oc2VhcmNoVmFsdWUpIHtcbiAgICB2YXIga2V5ID0gdGhpcy50b0tleWVkU2VxKCkubGFzdEtleU9mKHNlYXJjaFZhbHVlKTtcbiAgICByZXR1cm4ga2V5ID09PSB1bmRlZmluZWQgPyAtMSA6IGtleTtcbiAgfSxcbiAgcmV2ZXJzZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIHJldmVyc2VGYWN0b3J5KHRoaXMsIGZhbHNlKSk7XG4gIH0sXG4gIHNwbGljZTogZnVuY3Rpb24oaW5kZXgsIHJlbW92ZU51bSkge1xuICAgIHZhciBudW1BcmdzID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICByZW1vdmVOdW0gPSBNYXRoLm1heChyZW1vdmVOdW0gfCAwLCAwKTtcbiAgICBpZiAobnVtQXJncyA9PT0gMCB8fCAobnVtQXJncyA9PT0gMiAmJiAhcmVtb3ZlTnVtKSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGluZGV4ID0gcmVzb2x2ZUJlZ2luKGluZGV4LCB0aGlzLnNpemUpO1xuICAgIHZhciBzcGxpY2VkID0gdGhpcy5zbGljZSgwLCBpbmRleCk7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIG51bUFyZ3MgPT09IDEgPyBzcGxpY2VkIDogc3BsaWNlZC5jb25jYXQoYXJyQ29weShhcmd1bWVudHMsIDIpLCB0aGlzLnNsaWNlKGluZGV4ICsgcmVtb3ZlTnVtKSkpO1xuICB9LFxuICBmaW5kTGFzdEluZGV4OiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICB2YXIga2V5ID0gdGhpcy50b0tleWVkU2VxKCkuZmluZExhc3RLZXkocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICByZXR1cm4ga2V5ID09PSB1bmRlZmluZWQgPyAtMSA6IGtleTtcbiAgfSxcbiAgZmlyc3Q6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmdldCgwKTtcbiAgfSxcbiAgZmxhdHRlbjogZnVuY3Rpb24oZGVwdGgpIHtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgZmxhdHRlbkZhY3RvcnkodGhpcywgZGVwdGgsIGZhbHNlKSk7XG4gIH0sXG4gIGdldDogZnVuY3Rpb24oaW5kZXgsIG5vdFNldFZhbHVlKSB7XG4gICAgaW5kZXggPSB3cmFwSW5kZXgodGhpcywgaW5kZXgpO1xuICAgIHJldHVybiAoaW5kZXggPCAwIHx8ICh0aGlzLnNpemUgPT09IEluZmluaXR5IHx8ICh0aGlzLnNpemUgIT09IHVuZGVmaW5lZCAmJiBpbmRleCA+IHRoaXMuc2l6ZSkpKSA/IG5vdFNldFZhbHVlIDogdGhpcy5maW5kKChmdW5jdGlvbihfLCBrZXkpIHtcbiAgICAgIHJldHVybiBrZXkgPT09IGluZGV4O1xuICAgIH0pLCB1bmRlZmluZWQsIG5vdFNldFZhbHVlKTtcbiAgfSxcbiAgaGFzOiBmdW5jdGlvbihpbmRleCkge1xuICAgIGluZGV4ID0gd3JhcEluZGV4KHRoaXMsIGluZGV4KTtcbiAgICByZXR1cm4gaW5kZXggPj0gMCAmJiAodGhpcy5zaXplICE9PSB1bmRlZmluZWQgPyB0aGlzLnNpemUgPT09IEluZmluaXR5IHx8IGluZGV4IDwgdGhpcy5zaXplIDogdGhpcy5pbmRleE9mKGluZGV4KSAhPT0gLTEpO1xuICB9LFxuICBpbnRlcnBvc2U6IGZ1bmN0aW9uKHNlcGFyYXRvcikge1xuICAgIHJldHVybiByZWlmeSh0aGlzLCBpbnRlcnBvc2VGYWN0b3J5KHRoaXMsIHNlcGFyYXRvcikpO1xuICB9LFxuICBsYXN0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5nZXQoLTEpO1xuICB9LFxuICBza2lwOiBmdW5jdGlvbihhbW91bnQpIHtcbiAgICB2YXIgaXRlciA9IHRoaXM7XG4gICAgdmFyIHNraXBTZXEgPSBza2lwRmFjdG9yeShpdGVyLCBhbW91bnQsIGZhbHNlKTtcbiAgICBpZiAoaXNTZXEoaXRlcikgJiYgc2tpcFNlcSAhPT0gaXRlcikge1xuICAgICAgc2tpcFNlcS5nZXQgPSBmdW5jdGlvbihpbmRleCwgbm90U2V0VmFsdWUpIHtcbiAgICAgICAgaW5kZXggPSB3cmFwSW5kZXgodGhpcywgaW5kZXgpO1xuICAgICAgICByZXR1cm4gaW5kZXggPj0gMCA/IGl0ZXIuZ2V0KGluZGV4ICsgYW1vdW50LCBub3RTZXRWYWx1ZSkgOiBub3RTZXRWYWx1ZTtcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiByZWlmeSh0aGlzLCBza2lwU2VxKTtcbiAgfSxcbiAgc2tpcFdoaWxlOiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgc2tpcFdoaWxlRmFjdG9yeSh0aGlzLCBwcmVkaWNhdGUsIGNvbnRleHQsIGZhbHNlKSk7XG4gIH0sXG4gIHNvcnRCeTogZnVuY3Rpb24obWFwcGVyLCBjb21wYXJhdG9yKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIGNvbXBhcmF0b3IgPSBjb21wYXJhdG9yIHx8IGRlZmF1bHRDb21wYXJhdG9yO1xuICAgIHJldHVybiByZWlmeSh0aGlzLCBuZXcgQXJyYXlTZXEodGhpcy5lbnRyeVNlcSgpLnRvQXJyYXkoKS5zb3J0KChmdW5jdGlvbihhLCBiKSB7XG4gICAgICByZXR1cm4gY29tcGFyYXRvcihtYXBwZXIoYVsxXSwgYVswXSwgJF9fMCksIG1hcHBlcihiWzFdLCBiWzBdLCAkX18wKSkgfHwgYVswXSAtIGJbMF07XG4gICAgfSkpKS5mcm9tRW50cnlTZXEoKS52YWx1ZVNlcSgpKTtcbiAgfSxcbiAgdGFrZTogZnVuY3Rpb24oYW1vdW50KSB7XG4gICAgdmFyIGl0ZXIgPSB0aGlzO1xuICAgIHZhciB0YWtlU2VxID0gdGFrZUZhY3RvcnkoaXRlciwgYW1vdW50KTtcbiAgICBpZiAoaXNTZXEoaXRlcikgJiYgdGFrZVNlcSAhPT0gaXRlcikge1xuICAgICAgdGFrZVNlcS5nZXQgPSBmdW5jdGlvbihpbmRleCwgbm90U2V0VmFsdWUpIHtcbiAgICAgICAgaW5kZXggPSB3cmFwSW5kZXgodGhpcywgaW5kZXgpO1xuICAgICAgICByZXR1cm4gaW5kZXggPj0gMCAmJiBpbmRleCA8IGFtb3VudCA/IGl0ZXIuZ2V0KGluZGV4LCBub3RTZXRWYWx1ZSkgOiBub3RTZXRWYWx1ZTtcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiByZWlmeSh0aGlzLCB0YWtlU2VxKTtcbiAgfVxufSwge30sIEl0ZXJhYmxlKTtcbkluZGV4ZWRJdGVyYWJsZS5wcm90b3R5cGVbSVNfSU5ERVhFRF9TRU5USU5FTF0gPSB0cnVlO1xudmFyIFNldEl0ZXJhYmxlID0gZnVuY3Rpb24gU2V0SXRlcmFibGUodmFsdWUpIHtcbiAgcmV0dXJuIGlzSXRlcmFibGUodmFsdWUpICYmICFpc0Fzc29jaWF0aXZlKHZhbHVlKSA/IHZhbHVlIDogU2V0U2VxLmFwcGx5KHVuZGVmaW5lZCwgYXJndW1lbnRzKTtcbn07XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShTZXRJdGVyYWJsZSwge1xuICBnZXQ6IGZ1bmN0aW9uKHZhbHVlLCBub3RTZXRWYWx1ZSkge1xuICAgIHJldHVybiB0aGlzLmhhcyh2YWx1ZSkgPyB2YWx1ZSA6IG5vdFNldFZhbHVlO1xuICB9LFxuICBjb250YWluczogZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5oYXModmFsdWUpO1xuICB9LFxuICBrZXlTZXE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnZhbHVlU2VxKCk7XG4gIH1cbn0sIHt9LCBJdGVyYWJsZSk7XG5TZXRJdGVyYWJsZS5wcm90b3R5cGUuaGFzID0gSXRlcmFibGVQcm90b3R5cGUuY29udGFpbnM7XG5mdW5jdGlvbiBpc0l0ZXJhYmxlKG1heWJlSXRlcmFibGUpIHtcbiAgcmV0dXJuICEhKG1heWJlSXRlcmFibGUgJiYgbWF5YmVJdGVyYWJsZVtJU19JVEVSQUJMRV9TRU5USU5FTF0pO1xufVxuZnVuY3Rpb24gaXNLZXllZChtYXliZUtleWVkKSB7XG4gIHJldHVybiAhIShtYXliZUtleWVkICYmIG1heWJlS2V5ZWRbSVNfS0VZRURfU0VOVElORUxdKTtcbn1cbmZ1bmN0aW9uIGlzSW5kZXhlZChtYXliZUluZGV4ZWQpIHtcbiAgcmV0dXJuICEhKG1heWJlSW5kZXhlZCAmJiBtYXliZUluZGV4ZWRbSVNfSU5ERVhFRF9TRU5USU5FTF0pO1xufVxuZnVuY3Rpb24gaXNBc3NvY2lhdGl2ZShtYXliZUFzc29jaWF0aXZlKSB7XG4gIHJldHVybiBpc0tleWVkKG1heWJlQXNzb2NpYXRpdmUpIHx8IGlzSW5kZXhlZChtYXliZUFzc29jaWF0aXZlKTtcbn1cbkl0ZXJhYmxlLmlzSXRlcmFibGUgPSBpc0l0ZXJhYmxlO1xuSXRlcmFibGUuaXNLZXllZCA9IGlzS2V5ZWQ7XG5JdGVyYWJsZS5pc0luZGV4ZWQgPSBpc0luZGV4ZWQ7XG5JdGVyYWJsZS5pc0Fzc29jaWF0aXZlID0gaXNBc3NvY2lhdGl2ZTtcbkl0ZXJhYmxlLktleWVkID0gS2V5ZWRJdGVyYWJsZTtcbkl0ZXJhYmxlLkluZGV4ZWQgPSBJbmRleGVkSXRlcmFibGU7XG5JdGVyYWJsZS5TZXQgPSBTZXRJdGVyYWJsZTtcbkl0ZXJhYmxlLkl0ZXJhdG9yID0gSXRlcmF0b3I7XG5mdW5jdGlvbiB2YWx1ZU1hcHBlcih2KSB7XG4gIHJldHVybiB2O1xufVxuZnVuY3Rpb24ga2V5TWFwcGVyKHYsIGspIHtcbiAgcmV0dXJuIGs7XG59XG5mdW5jdGlvbiBlbnRyeU1hcHBlcih2LCBrKSB7XG4gIHJldHVybiBbaywgdl07XG59XG5mdW5jdGlvbiBub3QocHJlZGljYXRlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gIXByZWRpY2F0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9O1xufVxuZnVuY3Rpb24gcXVvdGVTdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgPyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkgOiB2YWx1ZTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDb21wYXJhdG9yKGEsIGIpIHtcbiAgcmV0dXJuIGEgPiBiID8gMSA6IGEgPCBiID8gLTEgOiAwO1xufVxuZnVuY3Rpb24gbWl4aW4oY3RvciwgbWV0aG9kcykge1xuICB2YXIgcHJvdG8gPSBjdG9yLnByb3RvdHlwZTtcbiAgT2JqZWN0LmtleXMobWV0aG9kcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBwcm90b1trZXldID0gbWV0aG9kc1trZXldO1xuICB9KTtcbiAgcmV0dXJuIGN0b3I7XG59XG52YXIgU2VxID0gZnVuY3Rpb24gU2VxKHZhbHVlKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAwID8gZW1wdHlTZXF1ZW5jZSgpIDogKGlzSXRlcmFibGUodmFsdWUpID8gdmFsdWUgOiBzZXFGcm9tVmFsdWUodmFsdWUsIGZhbHNlKSkudG9TZXEoKTtcbn07XG52YXIgJFNlcSA9IFNlcTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFNlcSwge1xuICB0b1NlcTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fX3RvU3RyaW5nKCdTZXEgeycsICd9Jyk7XG4gIH0sXG4gIGNhY2hlUmVzdWx0OiBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuX2NhY2hlICYmIHRoaXMuX19pdGVyYXRlVW5jYWNoZWQpIHtcbiAgICAgIHRoaXMuX2NhY2hlID0gdGhpcy5lbnRyeVNlcSgpLnRvQXJyYXkoKTtcbiAgICAgIHRoaXMuc2l6ZSA9IHRoaXMuX2NhY2hlLmxlbmd0aDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIF9faXRlcmF0ZTogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICByZXR1cm4gc2VxSXRlcmF0ZSh0aGlzLCBmbiwgcmV2ZXJzZSwgdHJ1ZSk7XG4gIH0sXG4gIF9faXRlcmF0b3I6IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICByZXR1cm4gc2VxSXRlcmF0b3IodGhpcywgdHlwZSwgcmV2ZXJzZSwgdHJ1ZSk7XG4gIH1cbn0sIHtvZjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICRTZXEoYXJndW1lbnRzKTtcbiAgfX0sIEl0ZXJhYmxlKTtcbnZhciBLZXllZFNlcSA9IGZ1bmN0aW9uIEtleWVkU2VxKHZhbHVlKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIGVtcHR5U2VxdWVuY2UoKS50b0tleWVkU2VxKCk7XG4gIH1cbiAgaWYgKCFpc0l0ZXJhYmxlKHZhbHVlKSkge1xuICAgIHZhbHVlID0gc2VxRnJvbVZhbHVlKHZhbHVlLCBmYWxzZSk7XG4gIH1cbiAgcmV0dXJuIGlzS2V5ZWQodmFsdWUpID8gdmFsdWUudG9TZXEoKSA6IHZhbHVlLmZyb21FbnRyeVNlcSgpO1xufTtcbnZhciAkS2V5ZWRTZXEgPSBLZXllZFNlcTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKEtleWVkU2VxLCB7XG4gIHRvS2V5ZWRTZXE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICB0b1NlcTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn0sIHtvZjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICRLZXllZFNlcShhcmd1bWVudHMpO1xuICB9fSwgU2VxKTtcbm1peGluKEtleWVkU2VxLCBLZXllZEl0ZXJhYmxlLnByb3RvdHlwZSk7XG52YXIgSW5kZXhlZFNlcSA9IGZ1bmN0aW9uIEluZGV4ZWRTZXEodmFsdWUpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDAgPyBlbXB0eVNlcXVlbmNlKCkgOiAoaXNJdGVyYWJsZSh2YWx1ZSkgPyB2YWx1ZSA6IHNlcUZyb21WYWx1ZSh2YWx1ZSwgZmFsc2UpKS50b0luZGV4ZWRTZXEoKTtcbn07XG52YXIgJEluZGV4ZWRTZXEgPSBJbmRleGVkU2VxO1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoSW5kZXhlZFNlcSwge1xuICB0b0luZGV4ZWRTZXE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX190b1N0cmluZygnU2VxIFsnLCAnXScpO1xuICB9LFxuICBfX2l0ZXJhdGU6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgcmV0dXJuIHNlcUl0ZXJhdGUodGhpcywgZm4sIHJldmVyc2UsIGZhbHNlKTtcbiAgfSxcbiAgX19pdGVyYXRvcjogZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHJldHVybiBzZXFJdGVyYXRvcih0aGlzLCB0eXBlLCByZXZlcnNlLCBmYWxzZSk7XG4gIH1cbn0sIHtvZjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICRJbmRleGVkU2VxKGFyZ3VtZW50cyk7XG4gIH19LCBTZXEpO1xubWl4aW4oSW5kZXhlZFNlcSwgSW5kZXhlZEl0ZXJhYmxlLnByb3RvdHlwZSk7XG52YXIgU2V0U2VxID0gZnVuY3Rpb24gU2V0U2VxKHZhbHVlKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAwID8gZW1wdHlTZXF1ZW5jZSgpLnRvU2V0U2VxKCkgOiAoaXNJdGVyYWJsZSh2YWx1ZSkgPyB2YWx1ZSA6IHNlcUZyb21WYWx1ZSh2YWx1ZSwgZmFsc2UpKS50b1NldFNlcSgpO1xufTtcbnZhciAkU2V0U2VxID0gU2V0U2VxO1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoU2V0U2VxLCB7dG9TZXRTZXE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzO1xuICB9fSwge29mOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJFNldFNlcShhcmd1bWVudHMpO1xuICB9fSwgU2VxKTtcbm1peGluKFNldFNlcSwgU2V0SXRlcmFibGUucHJvdG90eXBlKTtcblNlcS5pc1NlcSA9IGlzU2VxO1xuU2VxLktleWVkID0gS2V5ZWRTZXE7XG5TZXEuU2V0ID0gU2V0U2VxO1xuU2VxLkluZGV4ZWQgPSBJbmRleGVkU2VxO1xudmFyIElTX1NFUV9TRU5USU5FTCA9ICdAQF9fSU1NVVRBQkxFX1NFUV9fQEAnO1xuU2VxLnByb3RvdHlwZVtJU19TRVFfU0VOVElORUxdID0gdHJ1ZTtcbnZhciBBcnJheVNlcSA9IGZ1bmN0aW9uIEFycmF5U2VxKGFycmF5KSB7XG4gIHRoaXMuX2FycmF5ID0gYXJyYXk7XG4gIHRoaXMuc2l6ZSA9IGFycmF5Lmxlbmd0aDtcbn07XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShBcnJheVNlcSwge1xuICBnZXQ6IGZ1bmN0aW9uKGluZGV4LCBub3RTZXRWYWx1ZSkge1xuICAgIHJldHVybiB0aGlzLmhhcyhpbmRleCkgPyB0aGlzLl9hcnJheVt3cmFwSW5kZXgodGhpcywgaW5kZXgpXSA6IG5vdFNldFZhbHVlO1xuICB9LFxuICBfX2l0ZXJhdGU6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyIGFycmF5ID0gdGhpcy5fYXJyYXk7XG4gICAgdmFyIG1heEluZGV4ID0gYXJyYXkubGVuZ3RoIC0gMTtcbiAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDw9IG1heEluZGV4OyBpaSsrKSB7XG4gICAgICBpZiAoZm4oYXJyYXlbcmV2ZXJzZSA/IG1heEluZGV4IC0gaWkgOiBpaV0sIGlpLCB0aGlzKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIGlpICsgMTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGlpO1xuICB9LFxuICBfX2l0ZXJhdG9yOiBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgdmFyIGFycmF5ID0gdGhpcy5fYXJyYXk7XG4gICAgdmFyIG1heEluZGV4ID0gYXJyYXkubGVuZ3RoIC0gMTtcbiAgICB2YXIgaWkgPSAwO1xuICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGlpID4gbWF4SW5kZXggPyBpdGVyYXRvckRvbmUoKSA6IGl0ZXJhdG9yVmFsdWUodHlwZSwgaWksIGFycmF5W3JldmVyc2UgPyBtYXhJbmRleCAtIGlpKysgOiBpaSsrXSk7XG4gICAgfSkpO1xuICB9XG59LCB7fSwgSW5kZXhlZFNlcSk7XG52YXIgT2JqZWN0U2VxID0gZnVuY3Rpb24gT2JqZWN0U2VxKG9iamVjdCkge1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iamVjdCk7XG4gIHRoaXMuX29iamVjdCA9IG9iamVjdDtcbiAgdGhpcy5fa2V5cyA9IGtleXM7XG4gIHRoaXMuc2l6ZSA9IGtleXMubGVuZ3RoO1xufTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKE9iamVjdFNlcSwge1xuICBnZXQ6IGZ1bmN0aW9uKGtleSwgbm90U2V0VmFsdWUpIHtcbiAgICBpZiAobm90U2V0VmFsdWUgIT09IHVuZGVmaW5lZCAmJiAhdGhpcy5oYXMoa2V5KSkge1xuICAgICAgcmV0dXJuIG5vdFNldFZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fb2JqZWN0W2tleV07XG4gIH0sXG4gIGhhczogZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuX29iamVjdC5oYXNPd25Qcm9wZXJ0eShrZXkpO1xuICB9LFxuICBfX2l0ZXJhdGU6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyIG9iamVjdCA9IHRoaXMuX29iamVjdDtcbiAgICB2YXIga2V5cyA9IHRoaXMuX2tleXM7XG4gICAgdmFyIG1heEluZGV4ID0ga2V5cy5sZW5ndGggLSAxO1xuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPD0gbWF4SW5kZXg7IGlpKyspIHtcbiAgICAgIHZhciBrZXkgPSBrZXlzW3JldmVyc2UgPyBtYXhJbmRleCAtIGlpIDogaWldO1xuICAgICAgaWYgKGZuKG9iamVjdFtrZXldLCBrZXksIHRoaXMpID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gaWkgKyAxO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaWk7XG4gIH0sXG4gIF9faXRlcmF0b3I6IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICB2YXIgb2JqZWN0ID0gdGhpcy5fb2JqZWN0O1xuICAgIHZhciBrZXlzID0gdGhpcy5fa2V5cztcbiAgICB2YXIgbWF4SW5kZXggPSBrZXlzLmxlbmd0aCAtIDE7XG4gICAgdmFyIGlpID0gMDtcbiAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgIHZhciBrZXkgPSBrZXlzW3JldmVyc2UgPyBtYXhJbmRleCAtIGlpIDogaWldO1xuICAgICAgcmV0dXJuIGlpKysgPiBtYXhJbmRleCA/IGl0ZXJhdG9yRG9uZSgpIDogaXRlcmF0b3JWYWx1ZSh0eXBlLCBrZXksIG9iamVjdFtrZXldKTtcbiAgICB9KSk7XG4gIH1cbn0sIHt9LCBLZXllZFNlcSk7XG52YXIgSXRlcmFibGVTZXEgPSBmdW5jdGlvbiBJdGVyYWJsZVNlcShpdGVyYWJsZSkge1xuICB0aGlzLl9pdGVyYWJsZSA9IGl0ZXJhYmxlO1xuICB0aGlzLnNpemUgPSBpdGVyYWJsZS5sZW5ndGggfHwgaXRlcmFibGUuc2l6ZTtcbn07XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShJdGVyYWJsZVNlcSwge1xuICBfX2l0ZXJhdGVVbmNhY2hlZDogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdGUoZm4sIHJldmVyc2UpO1xuICAgIH1cbiAgICB2YXIgaXRlcmFibGUgPSB0aGlzLl9pdGVyYWJsZTtcbiAgICB2YXIgaXRlcmF0b3IgPSBnZXRJdGVyYXRvcihpdGVyYWJsZSk7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIGlmIChpc0l0ZXJhdG9yKGl0ZXJhdG9yKSkge1xuICAgICAgdmFyIHN0ZXA7XG4gICAgICB3aGlsZSAoIShzdGVwID0gaXRlcmF0b3IubmV4dCgpKS5kb25lKSB7XG4gICAgICAgIGlmIChmbihzdGVwLnZhbHVlLCBpdGVyYXRpb25zKyssIHRoaXMpID09PSBmYWxzZSkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpdGVyYXRpb25zO1xuICB9LFxuICBfX2l0ZXJhdG9yVW5jYWNoZWQ6IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICAgIH1cbiAgICB2YXIgaXRlcmFibGUgPSB0aGlzLl9pdGVyYWJsZTtcbiAgICB2YXIgaXRlcmF0b3IgPSBnZXRJdGVyYXRvcihpdGVyYWJsZSk7XG4gICAgaWYgKCFpc0l0ZXJhdG9yKGl0ZXJhdG9yKSkge1xuICAgICAgcmV0dXJuIG5ldyBJdGVyYXRvcihpdGVyYXRvckRvbmUpO1xuICAgIH1cbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc3RlcCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgIHJldHVybiBzdGVwLmRvbmUgPyBzdGVwIDogaXRlcmF0b3JWYWx1ZSh0eXBlLCBpdGVyYXRpb25zKyssIHN0ZXAudmFsdWUpO1xuICAgIH0pKTtcbiAgfVxufSwge30sIEluZGV4ZWRTZXEpO1xudmFyIEl0ZXJhdG9yU2VxID0gZnVuY3Rpb24gSXRlcmF0b3JTZXEoaXRlcmF0b3IpIHtcbiAgdGhpcy5faXRlcmF0b3IgPSBpdGVyYXRvcjtcbiAgdGhpcy5faXRlcmF0b3JDYWNoZSA9IFtdO1xufTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKEl0ZXJhdG9yU2VxLCB7XG4gIF9faXRlcmF0ZVVuY2FjaGVkOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZShmbiwgcmV2ZXJzZSk7XG4gICAgfVxuICAgIHZhciBpdGVyYXRvciA9IHRoaXMuX2l0ZXJhdG9yO1xuICAgIHZhciBjYWNoZSA9IHRoaXMuX2l0ZXJhdG9yQ2FjaGU7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIHdoaWxlIChpdGVyYXRpb25zIDwgY2FjaGUubGVuZ3RoKSB7XG4gICAgICBpZiAoZm4oY2FjaGVbaXRlcmF0aW9uc10sIGl0ZXJhdGlvbnMrKywgdGhpcykgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBpdGVyYXRpb25zO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgc3RlcDtcbiAgICB3aGlsZSAoIShzdGVwID0gaXRlcmF0b3IubmV4dCgpKS5kb25lKSB7XG4gICAgICB2YXIgdmFsID0gc3RlcC52YWx1ZTtcbiAgICAgIGNhY2hlW2l0ZXJhdGlvbnNdID0gdmFsO1xuICAgICAgaWYgKGZuKHZhbCwgaXRlcmF0aW9ucysrLCB0aGlzKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpdGVyYXRpb25zO1xuICB9LFxuICBfX2l0ZXJhdG9yVW5jYWNoZWQ6IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICAgIH1cbiAgICB2YXIgaXRlcmF0b3IgPSB0aGlzLl9pdGVyYXRvcjtcbiAgICB2YXIgY2FjaGUgPSB0aGlzLl9pdGVyYXRvckNhY2hlO1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgIGlmIChpdGVyYXRpb25zID49IGNhY2hlLmxlbmd0aCkge1xuICAgICAgICB2YXIgc3RlcCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgaWYgKHN0ZXAuZG9uZSkge1xuICAgICAgICAgIHJldHVybiBzdGVwO1xuICAgICAgICB9XG4gICAgICAgIGNhY2hlW2l0ZXJhdGlvbnNdID0gc3RlcC52YWx1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpdGVyYXRvclZhbHVlKHR5cGUsIGl0ZXJhdGlvbnMsIGNhY2hlW2l0ZXJhdGlvbnMrK10pO1xuICAgIH0pKTtcbiAgfVxufSwge30sIEluZGV4ZWRTZXEpO1xuZnVuY3Rpb24gaXNTZXEobWF5YmVTZXEpIHtcbiAgcmV0dXJuICEhKG1heWJlU2VxICYmIG1heWJlU2VxW0lTX1NFUV9TRU5USU5FTF0pO1xufVxudmFyIEVNUFRZX1NFUTtcbmZ1bmN0aW9uIGVtcHR5U2VxdWVuY2UoKSB7XG4gIHJldHVybiBFTVBUWV9TRVEgfHwgKEVNUFRZX1NFUSA9IG5ldyBBcnJheVNlcShbXSkpO1xufVxuZnVuY3Rpb24gbWF5YmVTZXFGcm9tVmFsdWUodmFsdWUsIG1heWJlU2luZ2xldG9uKSB7XG4gIHJldHVybiAobWF5YmVTaW5nbGV0b24gJiYgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyA/IHVuZGVmaW5lZCA6IGlzQXJyYXlMaWtlKHZhbHVlKSA/IG5ldyBBcnJheVNlcSh2YWx1ZSkgOiBpc0l0ZXJhdG9yKHZhbHVlKSA/IG5ldyBJdGVyYXRvclNlcSh2YWx1ZSkgOiBoYXNJdGVyYXRvcih2YWx1ZSkgPyBuZXcgSXRlcmFibGVTZXEodmFsdWUpIDogKG1heWJlU2luZ2xldG9uID8gaXNQbGFpbk9iaih2YWx1ZSkgOiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSA/IG5ldyBPYmplY3RTZXEodmFsdWUpIDogdW5kZWZpbmVkKTtcbn1cbmZ1bmN0aW9uIHNlcUZyb21WYWx1ZSh2YWx1ZSwgbWF5YmVTaW5nbGV0b24pIHtcbiAgdmFyIHNlcSA9IG1heWJlU2VxRnJvbVZhbHVlKHZhbHVlLCBtYXliZVNpbmdsZXRvbik7XG4gIGlmIChzZXEgPT09IHVuZGVmaW5lZCkge1xuICAgIGlmIChtYXliZVNpbmdsZXRvbikge1xuICAgICAgc2VxID0gbmV3IEFycmF5U2VxKFt2YWx1ZV0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFeHBlY3RlZCBpdGVyYWJsZTogJyArIHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHNlcTtcbn1cbmZ1bmN0aW9uIGlzQXJyYXlMaWtlKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUubGVuZ3RoID09PSAnbnVtYmVyJztcbn1cbmZ1bmN0aW9uIHNlcUl0ZXJhdGUoc2VxLCBmbiwgcmV2ZXJzZSwgdXNlS2V5cykge1xuICBhc3NlcnROb3RJbmZpbml0ZShzZXEuc2l6ZSk7XG4gIHZhciBjYWNoZSA9IHNlcS5fY2FjaGU7XG4gIGlmIChjYWNoZSkge1xuICAgIHZhciBtYXhJbmRleCA9IGNhY2hlLmxlbmd0aCAtIDE7XG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8PSBtYXhJbmRleDsgaWkrKykge1xuICAgICAgdmFyIGVudHJ5ID0gY2FjaGVbcmV2ZXJzZSA/IG1heEluZGV4IC0gaWkgOiBpaV07XG4gICAgICBpZiAoZm4oZW50cnlbMV0sIHVzZUtleXMgPyBlbnRyeVswXSA6IGlpLCBzZXEpID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gaWkgKyAxO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaWk7XG4gIH1cbiAgcmV0dXJuIHNlcS5fX2l0ZXJhdGVVbmNhY2hlZChmbiwgcmV2ZXJzZSk7XG59XG5mdW5jdGlvbiBzZXFJdGVyYXRvcihzZXEsIHR5cGUsIHJldmVyc2UsIHVzZUtleXMpIHtcbiAgdmFyIGNhY2hlID0gc2VxLl9jYWNoZTtcbiAgaWYgKGNhY2hlKSB7XG4gICAgdmFyIG1heEluZGV4ID0gY2FjaGUubGVuZ3RoIC0gMTtcbiAgICB2YXIgaWkgPSAwO1xuICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGVudHJ5ID0gY2FjaGVbcmV2ZXJzZSA/IG1heEluZGV4IC0gaWkgOiBpaV07XG4gICAgICByZXR1cm4gaWkrKyA+IG1heEluZGV4ID8gaXRlcmF0b3JEb25lKCkgOiBpdGVyYXRvclZhbHVlKHR5cGUsIHVzZUtleXMgPyBlbnRyeVswXSA6IGlpIC0gMSwgZW50cnlbMV0pO1xuICAgIH0pKTtcbiAgfVxuICByZXR1cm4gc2VxLl9faXRlcmF0b3JVbmNhY2hlZCh0eXBlLCByZXZlcnNlKTtcbn1cbmZ1bmN0aW9uIGZyb21KUyhqc29uLCBjb252ZXJ0ZXIpIHtcbiAgaWYgKGNvbnZlcnRlcikge1xuICAgIHJldHVybiBfZnJvbUpTV2l0aChjb252ZXJ0ZXIsIGpzb24sICcnLCB7Jyc6IGpzb259KTtcbiAgfVxuICByZXR1cm4gX2Zyb21KU0RlZmF1bHQoanNvbik7XG59XG5mdW5jdGlvbiBfZnJvbUpTV2l0aChjb252ZXJ0ZXIsIGpzb24sIGtleSwgcGFyZW50SlNPTikge1xuICBpZiAoQXJyYXkuaXNBcnJheShqc29uKSB8fCBpc1BsYWluT2JqKGpzb24pKSB7XG4gICAgcmV0dXJuIGNvbnZlcnRlci5jYWxsKHBhcmVudEpTT04sIGtleSwgSXRlcmFibGUoanNvbikubWFwKChmdW5jdGlvbih2LCBrKSB7XG4gICAgICByZXR1cm4gX2Zyb21KU1dpdGgoY29udmVydGVyLCB2LCBrLCBqc29uKTtcbiAgICB9KSkpO1xuICB9XG4gIHJldHVybiBqc29uO1xufVxuZnVuY3Rpb24gX2Zyb21KU0RlZmF1bHQoanNvbikge1xuICBpZiAoanNvbiAmJiB0eXBlb2YganNvbiA9PT0gJ29iamVjdCcpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShqc29uKSkge1xuICAgICAgcmV0dXJuIEl0ZXJhYmxlKGpzb24pLm1hcChfZnJvbUpTRGVmYXVsdCkudG9MaXN0KCk7XG4gICAgfVxuICAgIGlmIChqc29uLmNvbnN0cnVjdG9yID09PSBPYmplY3QpIHtcbiAgICAgIHJldHVybiBJdGVyYWJsZShqc29uKS5tYXAoX2Zyb21KU0RlZmF1bHQpLnRvTWFwKCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBqc29uO1xufVxudmFyIENvbGxlY3Rpb24gPSBmdW5jdGlvbiBDb2xsZWN0aW9uKCkge1xuICB0aHJvdyBUeXBlRXJyb3IoJ0Fic3RyYWN0Jyk7XG59O1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoQ29sbGVjdGlvbiwge30sIHt9LCBJdGVyYWJsZSk7XG52YXIgS2V5ZWRDb2xsZWN0aW9uID0gZnVuY3Rpb24gS2V5ZWRDb2xsZWN0aW9uKCkge1xuICAkdHJhY2V1clJ1bnRpbWUuZGVmYXVsdFN1cGVyQ2FsbCh0aGlzLCAkS2V5ZWRDb2xsZWN0aW9uLnByb3RvdHlwZSwgYXJndW1lbnRzKTtcbn07XG52YXIgJEtleWVkQ29sbGVjdGlvbiA9IEtleWVkQ29sbGVjdGlvbjtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKEtleWVkQ29sbGVjdGlvbiwge30sIHt9LCBDb2xsZWN0aW9uKTtcbm1peGluKEtleWVkQ29sbGVjdGlvbiwgS2V5ZWRJdGVyYWJsZS5wcm90b3R5cGUpO1xudmFyIEluZGV4ZWRDb2xsZWN0aW9uID0gZnVuY3Rpb24gSW5kZXhlZENvbGxlY3Rpb24oKSB7XG4gICR0cmFjZXVyUnVudGltZS5kZWZhdWx0U3VwZXJDYWxsKHRoaXMsICRJbmRleGVkQ29sbGVjdGlvbi5wcm90b3R5cGUsIGFyZ3VtZW50cyk7XG59O1xudmFyICRJbmRleGVkQ29sbGVjdGlvbiA9IEluZGV4ZWRDb2xsZWN0aW9uO1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoSW5kZXhlZENvbGxlY3Rpb24sIHt9LCB7fSwgQ29sbGVjdGlvbik7XG5taXhpbihJbmRleGVkQ29sbGVjdGlvbiwgSW5kZXhlZEl0ZXJhYmxlLnByb3RvdHlwZSk7XG52YXIgU2V0Q29sbGVjdGlvbiA9IGZ1bmN0aW9uIFNldENvbGxlY3Rpb24oKSB7XG4gICR0cmFjZXVyUnVudGltZS5kZWZhdWx0U3VwZXJDYWxsKHRoaXMsICRTZXRDb2xsZWN0aW9uLnByb3RvdHlwZSwgYXJndW1lbnRzKTtcbn07XG52YXIgJFNldENvbGxlY3Rpb24gPSBTZXRDb2xsZWN0aW9uO1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoU2V0Q29sbGVjdGlvbiwge30sIHt9LCBDb2xsZWN0aW9uKTtcbm1peGluKFNldENvbGxlY3Rpb24sIFNldEl0ZXJhYmxlLnByb3RvdHlwZSk7XG5Db2xsZWN0aW9uLktleWVkID0gS2V5ZWRDb2xsZWN0aW9uO1xuQ29sbGVjdGlvbi5JbmRleGVkID0gSW5kZXhlZENvbGxlY3Rpb247XG5Db2xsZWN0aW9uLlNldCA9IFNldENvbGxlY3Rpb247XG52YXIgTWFwID0gZnVuY3Rpb24gTWFwKHZhbHVlKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAwID8gZW1wdHlNYXAoKSA6IHZhbHVlICYmIHZhbHVlLmNvbnN0cnVjdG9yID09PSAkTWFwID8gdmFsdWUgOiBlbXB0eU1hcCgpLm1lcmdlKEtleWVkSXRlcmFibGUodmFsdWUpKTtcbn07XG52YXIgJE1hcCA9IE1hcDtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKE1hcCwge1xuICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX190b1N0cmluZygnTWFwIHsnLCAnfScpO1xuICB9LFxuICBnZXQ6IGZ1bmN0aW9uKGssIG5vdFNldFZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Jvb3QgPyB0aGlzLl9yb290LmdldCgwLCBoYXNoKGspLCBrLCBub3RTZXRWYWx1ZSkgOiBub3RTZXRWYWx1ZTtcbiAgfSxcbiAgc2V0OiBmdW5jdGlvbihrLCB2KSB7XG4gICAgcmV0dXJuIHVwZGF0ZU1hcCh0aGlzLCBrLCB2KTtcbiAgfSxcbiAgc2V0SW46IGZ1bmN0aW9uKGtleVBhdGgsIHYpIHtcbiAgICBpbnZhcmlhbnQoa2V5UGF0aC5sZW5ndGggPiAwLCAnUmVxdWlyZXMgbm9uLWVtcHR5IGtleSBwYXRoLicpO1xuICAgIHJldHVybiB0aGlzLnVwZGF0ZUluKGtleVBhdGgsIChmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB2O1xuICAgIH0pKTtcbiAgfSxcbiAgcmVtb3ZlOiBmdW5jdGlvbihrKSB7XG4gICAgcmV0dXJuIHVwZGF0ZU1hcCh0aGlzLCBrLCBOT1RfU0VUKTtcbiAgfSxcbiAgcmVtb3ZlSW46IGZ1bmN0aW9uKGtleVBhdGgpIHtcbiAgICBpbnZhcmlhbnQoa2V5UGF0aC5sZW5ndGggPiAwLCAnUmVxdWlyZXMgbm9uLWVtcHR5IGtleSBwYXRoLicpO1xuICAgIHJldHVybiB0aGlzLnVwZGF0ZUluKGtleVBhdGgsIChmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBOT1RfU0VUO1xuICAgIH0pKTtcbiAgfSxcbiAgdXBkYXRlOiBmdW5jdGlvbihrLCBub3RTZXRWYWx1ZSwgdXBkYXRlcikge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAxID8gayh0aGlzKSA6IHRoaXMudXBkYXRlSW4oW2tdLCBub3RTZXRWYWx1ZSwgdXBkYXRlcik7XG4gIH0sXG4gIHVwZGF0ZUluOiBmdW5jdGlvbihrZXlQYXRoLCBub3RTZXRWYWx1ZSwgdXBkYXRlcikge1xuICAgIGlmICghdXBkYXRlcikge1xuICAgICAgdXBkYXRlciA9IG5vdFNldFZhbHVlO1xuICAgICAgbm90U2V0VmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiBrZXlQYXRoLmxlbmd0aCA9PT0gMCA/IHVwZGF0ZXIodGhpcykgOiB1cGRhdGVJbkRlZXBNYXAodGhpcywga2V5UGF0aCwgbm90U2V0VmFsdWUsIHVwZGF0ZXIsIDApO1xuICB9LFxuICBjbGVhcjogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuc2l6ZSA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGlmICh0aGlzLl9fb3duZXJJRCkge1xuICAgICAgdGhpcy5zaXplID0gMDtcbiAgICAgIHRoaXMuX3Jvb3QgPSBudWxsO1xuICAgICAgdGhpcy5fX2hhc2ggPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9fYWx0ZXJlZCA9IHRydWU7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIGVtcHR5TWFwKCk7XG4gIH0sXG4gIG1lcmdlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbWVyZ2VJbnRvTWFwV2l0aCh0aGlzLCB1bmRlZmluZWQsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIG1lcmdlV2l0aDogZnVuY3Rpb24obWVyZ2VyKSB7XG4gICAgZm9yICh2YXIgaXRlcnMgPSBbXSxcbiAgICAgICAgJF9fNCA9IDE7ICRfXzQgPCBhcmd1bWVudHMubGVuZ3RoOyAkX180KyspXG4gICAgICBpdGVyc1skX180IC0gMV0gPSBhcmd1bWVudHNbJF9fNF07XG4gICAgcmV0dXJuIG1lcmdlSW50b01hcFdpdGgodGhpcywgbWVyZ2VyLCBpdGVycyk7XG4gIH0sXG4gIG1lcmdlRGVlcDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG1lcmdlSW50b01hcFdpdGgodGhpcywgZGVlcE1lcmdlcih1bmRlZmluZWQpLCBhcmd1bWVudHMpO1xuICB9LFxuICBtZXJnZURlZXBXaXRoOiBmdW5jdGlvbihtZXJnZXIpIHtcbiAgICBmb3IgKHZhciBpdGVycyA9IFtdLFxuICAgICAgICAkX181ID0gMTsgJF9fNSA8IGFyZ3VtZW50cy5sZW5ndGg7ICRfXzUrKylcbiAgICAgIGl0ZXJzWyRfXzUgLSAxXSA9IGFyZ3VtZW50c1skX181XTtcbiAgICByZXR1cm4gbWVyZ2VJbnRvTWFwV2l0aCh0aGlzLCBkZWVwTWVyZ2VyKG1lcmdlciksIGl0ZXJzKTtcbiAgfSxcbiAgd2l0aE11dGF0aW9uczogZnVuY3Rpb24oZm4pIHtcbiAgICB2YXIgbXV0YWJsZSA9IHRoaXMuYXNNdXRhYmxlKCk7XG4gICAgZm4obXV0YWJsZSk7XG4gICAgcmV0dXJuIG11dGFibGUud2FzQWx0ZXJlZCgpID8gbXV0YWJsZS5fX2Vuc3VyZU93bmVyKHRoaXMuX19vd25lcklEKSA6IHRoaXM7XG4gIH0sXG4gIGFzTXV0YWJsZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX19vd25lcklEID8gdGhpcyA6IHRoaXMuX19lbnN1cmVPd25lcihuZXcgT3duZXJJRCgpKTtcbiAgfSxcbiAgYXNJbW11dGFibGU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9fZW5zdXJlT3duZXIoKTtcbiAgfSxcbiAgd2FzQWx0ZXJlZDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX19hbHRlcmVkO1xuICB9LFxuICBfX2l0ZXJhdG9yOiBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgcmV0dXJuIG5ldyBNYXBJdGVyYXRvcih0aGlzLCB0eXBlLCByZXZlcnNlKTtcbiAgfSxcbiAgX19pdGVyYXRlOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgdGhpcy5fcm9vdCAmJiB0aGlzLl9yb290Lml0ZXJhdGUoKGZ1bmN0aW9uKGVudHJ5KSB7XG4gICAgICBpdGVyYXRpb25zKys7XG4gICAgICByZXR1cm4gZm4oZW50cnlbMV0sIGVudHJ5WzBdLCAkX18wKTtcbiAgICB9KSwgcmV2ZXJzZSk7XG4gICAgcmV0dXJuIGl0ZXJhdGlvbnM7XG4gIH0sXG4gIF9fZW5zdXJlT3duZXI6IGZ1bmN0aW9uKG93bmVySUQpIHtcbiAgICBpZiAob3duZXJJRCA9PT0gdGhpcy5fX293bmVySUQpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBpZiAoIW93bmVySUQpIHtcbiAgICAgIHRoaXMuX19vd25lcklEID0gb3duZXJJRDtcbiAgICAgIHRoaXMuX19hbHRlcmVkID0gZmFsc2U7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIG1ha2VNYXAodGhpcy5zaXplLCB0aGlzLl9yb290LCBvd25lcklELCB0aGlzLl9faGFzaCk7XG4gIH1cbn0sIHt9LCBLZXllZENvbGxlY3Rpb24pO1xuZnVuY3Rpb24gaXNNYXAobWF5YmVNYXApIHtcbiAgcmV0dXJuICEhKG1heWJlTWFwICYmIG1heWJlTWFwW0lTX01BUF9TRU5USU5FTF0pO1xufVxuTWFwLmlzTWFwID0gaXNNYXA7XG52YXIgSVNfTUFQX1NFTlRJTkVMID0gJ0BAX19JTU1VVEFCTEVfTUFQX19AQCc7XG52YXIgTWFwUHJvdG90eXBlID0gTWFwLnByb3RvdHlwZTtcbk1hcFByb3RvdHlwZVtJU19NQVBfU0VOVElORUxdID0gdHJ1ZTtcbk1hcFByb3RvdHlwZVtERUxFVEVdID0gTWFwUHJvdG90eXBlLnJlbW92ZTtcbnZhciBCaXRtYXBJbmRleGVkTm9kZSA9IGZ1bmN0aW9uIEJpdG1hcEluZGV4ZWROb2RlKG93bmVySUQsIGJpdG1hcCwgbm9kZXMpIHtcbiAgdGhpcy5vd25lcklEID0gb3duZXJJRDtcbiAgdGhpcy5iaXRtYXAgPSBiaXRtYXA7XG4gIHRoaXMubm9kZXMgPSBub2Rlcztcbn07XG52YXIgJEJpdG1hcEluZGV4ZWROb2RlID0gQml0bWFwSW5kZXhlZE5vZGU7XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShCaXRtYXBJbmRleGVkTm9kZSwge1xuICBnZXQ6IGZ1bmN0aW9uKHNoaWZ0LCBoYXNoLCBrZXksIG5vdFNldFZhbHVlKSB7XG4gICAgdmFyIGJpdCA9ICgxIDw8ICgoc2hpZnQgPT09IDAgPyBoYXNoIDogaGFzaCA+Pj4gc2hpZnQpICYgTUFTSykpO1xuICAgIHZhciBiaXRtYXAgPSB0aGlzLmJpdG1hcDtcbiAgICByZXR1cm4gKGJpdG1hcCAmIGJpdCkgPT09IDAgPyBub3RTZXRWYWx1ZSA6IHRoaXMubm9kZXNbcG9wQ291bnQoYml0bWFwICYgKGJpdCAtIDEpKV0uZ2V0KHNoaWZ0ICsgU0hJRlQsIGhhc2gsIGtleSwgbm90U2V0VmFsdWUpO1xuICB9LFxuICB1cGRhdGU6IGZ1bmN0aW9uKG93bmVySUQsIHNoaWZ0LCBoYXNoLCBrZXksIHZhbHVlLCBkaWRDaGFuZ2VTaXplLCBkaWRBbHRlcikge1xuICAgIHZhciBoYXNoRnJhZyA9IChzaGlmdCA9PT0gMCA/IGhhc2ggOiBoYXNoID4+PiBzaGlmdCkgJiBNQVNLO1xuICAgIHZhciBiaXQgPSAxIDw8IGhhc2hGcmFnO1xuICAgIHZhciBiaXRtYXAgPSB0aGlzLmJpdG1hcDtcbiAgICB2YXIgZXhpc3RzID0gKGJpdG1hcCAmIGJpdCkgIT09IDA7XG4gICAgaWYgKCFleGlzdHMgJiYgdmFsdWUgPT09IE5PVF9TRVQpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgaWR4ID0gcG9wQ291bnQoYml0bWFwICYgKGJpdCAtIDEpKTtcbiAgICB2YXIgbm9kZXMgPSB0aGlzLm5vZGVzO1xuICAgIHZhciBub2RlID0gZXhpc3RzID8gbm9kZXNbaWR4XSA6IHVuZGVmaW5lZDtcbiAgICB2YXIgbmV3Tm9kZSA9IHVwZGF0ZU5vZGUobm9kZSwgb3duZXJJRCwgc2hpZnQgKyBTSElGVCwgaGFzaCwga2V5LCB2YWx1ZSwgZGlkQ2hhbmdlU2l6ZSwgZGlkQWx0ZXIpO1xuICAgIGlmIChuZXdOb2RlID09PSBub2RlKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgaWYgKCFleGlzdHMgJiYgbmV3Tm9kZSAmJiBub2Rlcy5sZW5ndGggPj0gTUFYX0JJVE1BUF9TSVpFKSB7XG4gICAgICByZXR1cm4gZXhwYW5kTm9kZXMob3duZXJJRCwgbm9kZXMsIGJpdG1hcCwgaGFzaEZyYWcsIG5ld05vZGUpO1xuICAgIH1cbiAgICBpZiAoZXhpc3RzICYmICFuZXdOb2RlICYmIG5vZGVzLmxlbmd0aCA9PT0gMiAmJiBpc0xlYWZOb2RlKG5vZGVzW2lkeCBeIDFdKSkge1xuICAgICAgcmV0dXJuIG5vZGVzW2lkeCBeIDFdO1xuICAgIH1cbiAgICBpZiAoZXhpc3RzICYmIG5ld05vZGUgJiYgbm9kZXMubGVuZ3RoID09PSAxICYmIGlzTGVhZk5vZGUobmV3Tm9kZSkpIHtcbiAgICAgIHJldHVybiBuZXdOb2RlO1xuICAgIH1cbiAgICB2YXIgaXNFZGl0YWJsZSA9IG93bmVySUQgJiYgb3duZXJJRCA9PT0gdGhpcy5vd25lcklEO1xuICAgIHZhciBuZXdCaXRtYXAgPSBleGlzdHMgPyBuZXdOb2RlID8gYml0bWFwIDogYml0bWFwIF4gYml0IDogYml0bWFwIHwgYml0O1xuICAgIHZhciBuZXdOb2RlcyA9IGV4aXN0cyA/IG5ld05vZGUgPyBzZXRJbihub2RlcywgaWR4LCBuZXdOb2RlLCBpc0VkaXRhYmxlKSA6IHNwbGljZU91dChub2RlcywgaWR4LCBpc0VkaXRhYmxlKSA6IHNwbGljZUluKG5vZGVzLCBpZHgsIG5ld05vZGUsIGlzRWRpdGFibGUpO1xuICAgIGlmIChpc0VkaXRhYmxlKSB7XG4gICAgICB0aGlzLmJpdG1hcCA9IG5ld0JpdG1hcDtcbiAgICAgIHRoaXMubm9kZXMgPSBuZXdOb2RlcztcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gbmV3ICRCaXRtYXBJbmRleGVkTm9kZShvd25lcklELCBuZXdCaXRtYXAsIG5ld05vZGVzKTtcbiAgfSxcbiAgaXRlcmF0ZTogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgbm9kZXMgPSB0aGlzLm5vZGVzO1xuICAgIGZvciAodmFyIGlpID0gMCxcbiAgICAgICAgbWF4SW5kZXggPSBub2Rlcy5sZW5ndGggLSAxOyBpaSA8PSBtYXhJbmRleDsgaWkrKykge1xuICAgICAgaWYgKG5vZGVzW3JldmVyc2UgPyBtYXhJbmRleCAtIGlpIDogaWldLml0ZXJhdGUoZm4sIHJldmVyc2UpID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICB9XG59LCB7fSk7XG52YXIgQXJyYXlOb2RlID0gZnVuY3Rpb24gQXJyYXlOb2RlKG93bmVySUQsIGNvdW50LCBub2Rlcykge1xuICB0aGlzLm93bmVySUQgPSBvd25lcklEO1xuICB0aGlzLmNvdW50ID0gY291bnQ7XG4gIHRoaXMubm9kZXMgPSBub2Rlcztcbn07XG52YXIgJEFycmF5Tm9kZSA9IEFycmF5Tm9kZTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKEFycmF5Tm9kZSwge1xuICBnZXQ6IGZ1bmN0aW9uKHNoaWZ0LCBoYXNoLCBrZXksIG5vdFNldFZhbHVlKSB7XG4gICAgdmFyIGlkeCA9IChzaGlmdCA9PT0gMCA/IGhhc2ggOiBoYXNoID4+PiBzaGlmdCkgJiBNQVNLO1xuICAgIHZhciBub2RlID0gdGhpcy5ub2Rlc1tpZHhdO1xuICAgIHJldHVybiBub2RlID8gbm9kZS5nZXQoc2hpZnQgKyBTSElGVCwgaGFzaCwga2V5LCBub3RTZXRWYWx1ZSkgOiBub3RTZXRWYWx1ZTtcbiAgfSxcbiAgdXBkYXRlOiBmdW5jdGlvbihvd25lcklELCBzaGlmdCwgaGFzaCwga2V5LCB2YWx1ZSwgZGlkQ2hhbmdlU2l6ZSwgZGlkQWx0ZXIpIHtcbiAgICB2YXIgaWR4ID0gKHNoaWZ0ID09PSAwID8gaGFzaCA6IGhhc2ggPj4+IHNoaWZ0KSAmIE1BU0s7XG4gICAgdmFyIHJlbW92ZWQgPSB2YWx1ZSA9PT0gTk9UX1NFVDtcbiAgICB2YXIgbm9kZXMgPSB0aGlzLm5vZGVzO1xuICAgIHZhciBub2RlID0gbm9kZXNbaWR4XTtcbiAgICBpZiAocmVtb3ZlZCAmJiAhbm9kZSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciBuZXdOb2RlID0gdXBkYXRlTm9kZShub2RlLCBvd25lcklELCBzaGlmdCArIFNISUZULCBoYXNoLCBrZXksIHZhbHVlLCBkaWRDaGFuZ2VTaXplLCBkaWRBbHRlcik7XG4gICAgaWYgKG5ld05vZGUgPT09IG5vZGUpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgbmV3Q291bnQgPSB0aGlzLmNvdW50O1xuICAgIGlmICghbm9kZSkge1xuICAgICAgbmV3Q291bnQrKztcbiAgICB9IGVsc2UgaWYgKCFuZXdOb2RlKSB7XG4gICAgICBuZXdDb3VudC0tO1xuICAgICAgaWYgKG5ld0NvdW50IDwgTUlOX0FSUkFZX1NJWkUpIHtcbiAgICAgICAgcmV0dXJuIHBhY2tOb2Rlcyhvd25lcklELCBub2RlcywgbmV3Q291bnQsIGlkeCk7XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBpc0VkaXRhYmxlID0gb3duZXJJRCAmJiBvd25lcklEID09PSB0aGlzLm93bmVySUQ7XG4gICAgdmFyIG5ld05vZGVzID0gc2V0SW4obm9kZXMsIGlkeCwgbmV3Tm9kZSwgaXNFZGl0YWJsZSk7XG4gICAgaWYgKGlzRWRpdGFibGUpIHtcbiAgICAgIHRoaXMuY291bnQgPSBuZXdDb3VudDtcbiAgICAgIHRoaXMubm9kZXMgPSBuZXdOb2RlcztcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gbmV3ICRBcnJheU5vZGUob3duZXJJRCwgbmV3Q291bnQsIG5ld05vZGVzKTtcbiAgfSxcbiAgaXRlcmF0ZTogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgbm9kZXMgPSB0aGlzLm5vZGVzO1xuICAgIGZvciAodmFyIGlpID0gMCxcbiAgICAgICAgbWF4SW5kZXggPSBub2Rlcy5sZW5ndGggLSAxOyBpaSA8PSBtYXhJbmRleDsgaWkrKykge1xuICAgICAgdmFyIG5vZGUgPSBub2Rlc1tyZXZlcnNlID8gbWF4SW5kZXggLSBpaSA6IGlpXTtcbiAgICAgIGlmIChub2RlICYmIG5vZGUuaXRlcmF0ZShmbiwgcmV2ZXJzZSkgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0sIHt9KTtcbnZhciBIYXNoQ29sbGlzaW9uTm9kZSA9IGZ1bmN0aW9uIEhhc2hDb2xsaXNpb25Ob2RlKG93bmVySUQsIGhhc2gsIGVudHJpZXMpIHtcbiAgdGhpcy5vd25lcklEID0gb3duZXJJRDtcbiAgdGhpcy5oYXNoID0gaGFzaDtcbiAgdGhpcy5lbnRyaWVzID0gZW50cmllcztcbn07XG52YXIgJEhhc2hDb2xsaXNpb25Ob2RlID0gSGFzaENvbGxpc2lvbk5vZGU7XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShIYXNoQ29sbGlzaW9uTm9kZSwge1xuICBnZXQ6IGZ1bmN0aW9uKHNoaWZ0LCBoYXNoLCBrZXksIG5vdFNldFZhbHVlKSB7XG4gICAgdmFyIGVudHJpZXMgPSB0aGlzLmVudHJpZXM7XG4gICAgZm9yICh2YXIgaWkgPSAwLFxuICAgICAgICBsZW4gPSBlbnRyaWVzLmxlbmd0aDsgaWkgPCBsZW47IGlpKyspIHtcbiAgICAgIGlmIChpcyhrZXksIGVudHJpZXNbaWldWzBdKSkge1xuICAgICAgICByZXR1cm4gZW50cmllc1tpaV1bMV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBub3RTZXRWYWx1ZTtcbiAgfSxcbiAgdXBkYXRlOiBmdW5jdGlvbihvd25lcklELCBzaGlmdCwgaGFzaCwga2V5LCB2YWx1ZSwgZGlkQ2hhbmdlU2l6ZSwgZGlkQWx0ZXIpIHtcbiAgICB2YXIgcmVtb3ZlZCA9IHZhbHVlID09PSBOT1RfU0VUO1xuICAgIGlmIChoYXNoICE9PSB0aGlzLmhhc2gpIHtcbiAgICAgIGlmIChyZW1vdmVkKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgU2V0UmVmKGRpZEFsdGVyKTtcbiAgICAgIFNldFJlZihkaWRDaGFuZ2VTaXplKTtcbiAgICAgIHJldHVybiBtZXJnZUludG9Ob2RlKHRoaXMsIG93bmVySUQsIHNoaWZ0LCBoYXNoLCBba2V5LCB2YWx1ZV0pO1xuICAgIH1cbiAgICB2YXIgZW50cmllcyA9IHRoaXMuZW50cmllcztcbiAgICB2YXIgaWR4ID0gMDtcbiAgICBmb3IgKHZhciBsZW4gPSBlbnRyaWVzLmxlbmd0aDsgaWR4IDwgbGVuOyBpZHgrKykge1xuICAgICAgaWYgKGlzKGtleSwgZW50cmllc1tpZHhdWzBdKSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGV4aXN0cyA9IGlkeCA8IGxlbjtcbiAgICBpZiAocmVtb3ZlZCAmJiAhZXhpc3RzKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgU2V0UmVmKGRpZEFsdGVyKTtcbiAgICAocmVtb3ZlZCB8fCAhZXhpc3RzKSAmJiBTZXRSZWYoZGlkQ2hhbmdlU2l6ZSk7XG4gICAgaWYgKHJlbW92ZWQgJiYgbGVuID09PSAyKSB7XG4gICAgICByZXR1cm4gbmV3IFZhbHVlTm9kZShvd25lcklELCB0aGlzLmhhc2gsIGVudHJpZXNbaWR4IF4gMV0pO1xuICAgIH1cbiAgICB2YXIgaXNFZGl0YWJsZSA9IG93bmVySUQgJiYgb3duZXJJRCA9PT0gdGhpcy5vd25lcklEO1xuICAgIHZhciBuZXdFbnRyaWVzID0gaXNFZGl0YWJsZSA/IGVudHJpZXMgOiBhcnJDb3B5KGVudHJpZXMpO1xuICAgIGlmIChleGlzdHMpIHtcbiAgICAgIGlmIChyZW1vdmVkKSB7XG4gICAgICAgIGlkeCA9PT0gbGVuIC0gMSA/IG5ld0VudHJpZXMucG9wKCkgOiAobmV3RW50cmllc1tpZHhdID0gbmV3RW50cmllcy5wb3AoKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXdFbnRyaWVzW2lkeF0gPSBba2V5LCB2YWx1ZV07XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG5ld0VudHJpZXMucHVzaChba2V5LCB2YWx1ZV0pO1xuICAgIH1cbiAgICBpZiAoaXNFZGl0YWJsZSkge1xuICAgICAgdGhpcy5lbnRyaWVzID0gbmV3RW50cmllcztcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gbmV3ICRIYXNoQ29sbGlzaW9uTm9kZShvd25lcklELCB0aGlzLmhhc2gsIG5ld0VudHJpZXMpO1xuICB9LFxuICBpdGVyYXRlOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciBlbnRyaWVzID0gdGhpcy5lbnRyaWVzO1xuICAgIGZvciAodmFyIGlpID0gMCxcbiAgICAgICAgbWF4SW5kZXggPSBlbnRyaWVzLmxlbmd0aCAtIDE7IGlpIDw9IG1heEluZGV4OyBpaSsrKSB7XG4gICAgICBpZiAoZm4oZW50cmllc1tyZXZlcnNlID8gbWF4SW5kZXggLSBpaSA6IGlpXSkgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0sIHt9KTtcbnZhciBWYWx1ZU5vZGUgPSBmdW5jdGlvbiBWYWx1ZU5vZGUob3duZXJJRCwgaGFzaCwgZW50cnkpIHtcbiAgdGhpcy5vd25lcklEID0gb3duZXJJRDtcbiAgdGhpcy5oYXNoID0gaGFzaDtcbiAgdGhpcy5lbnRyeSA9IGVudHJ5O1xufTtcbnZhciAkVmFsdWVOb2RlID0gVmFsdWVOb2RlO1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoVmFsdWVOb2RlLCB7XG4gIGdldDogZnVuY3Rpb24oc2hpZnQsIGhhc2gsIGtleSwgbm90U2V0VmFsdWUpIHtcbiAgICByZXR1cm4gaXMoa2V5LCB0aGlzLmVudHJ5WzBdKSA/IHRoaXMuZW50cnlbMV0gOiBub3RTZXRWYWx1ZTtcbiAgfSxcbiAgdXBkYXRlOiBmdW5jdGlvbihvd25lcklELCBzaGlmdCwgaGFzaCwga2V5LCB2YWx1ZSwgZGlkQ2hhbmdlU2l6ZSwgZGlkQWx0ZXIpIHtcbiAgICB2YXIgcmVtb3ZlZCA9IHZhbHVlID09PSBOT1RfU0VUO1xuICAgIHZhciBrZXlNYXRjaCA9IGlzKGtleSwgdGhpcy5lbnRyeVswXSk7XG4gICAgaWYgKGtleU1hdGNoID8gdmFsdWUgPT09IHRoaXMuZW50cnlbMV0gOiByZW1vdmVkKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgU2V0UmVmKGRpZEFsdGVyKTtcbiAgICBpZiAocmVtb3ZlZCkge1xuICAgICAgU2V0UmVmKGRpZENoYW5nZVNpemUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoa2V5TWF0Y2gpIHtcbiAgICAgIGlmIChvd25lcklEICYmIG93bmVySUQgPT09IHRoaXMub3duZXJJRCkge1xuICAgICAgICB0aGlzLmVudHJ5WzFdID0gdmFsdWU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyAkVmFsdWVOb2RlKG93bmVySUQsIGhhc2gsIFtrZXksIHZhbHVlXSk7XG4gICAgfVxuICAgIFNldFJlZihkaWRDaGFuZ2VTaXplKTtcbiAgICByZXR1cm4gbWVyZ2VJbnRvTm9kZSh0aGlzLCBvd25lcklELCBzaGlmdCwgaGFzaCwgW2tleSwgdmFsdWVdKTtcbiAgfSxcbiAgaXRlcmF0ZTogZnVuY3Rpb24oZm4pIHtcbiAgICByZXR1cm4gZm4odGhpcy5lbnRyeSk7XG4gIH1cbn0sIHt9KTtcbnZhciBNYXBJdGVyYXRvciA9IGZ1bmN0aW9uIE1hcEl0ZXJhdG9yKG1hcCwgdHlwZSwgcmV2ZXJzZSkge1xuICB0aGlzLl90eXBlID0gdHlwZTtcbiAgdGhpcy5fcmV2ZXJzZSA9IHJldmVyc2U7XG4gIHRoaXMuX3N0YWNrID0gbWFwLl9yb290ICYmIG1hcEl0ZXJhdG9yRnJhbWUobWFwLl9yb290KTtcbn07XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShNYXBJdGVyYXRvciwge25leHQ6IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0eXBlID0gdGhpcy5fdHlwZTtcbiAgICB2YXIgc3RhY2sgPSB0aGlzLl9zdGFjaztcbiAgICB3aGlsZSAoc3RhY2spIHtcbiAgICAgIHZhciBub2RlID0gc3RhY2subm9kZTtcbiAgICAgIHZhciBpbmRleCA9IHN0YWNrLmluZGV4Kys7XG4gICAgICB2YXIgbWF4SW5kZXg7XG4gICAgICBpZiAobm9kZS5lbnRyeSkge1xuICAgICAgICBpZiAoaW5kZXggPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gbWFwSXRlcmF0b3JWYWx1ZSh0eXBlLCBub2RlLmVudHJ5KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChub2RlLmVudHJpZXMpIHtcbiAgICAgICAgbWF4SW5kZXggPSBub2RlLmVudHJpZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgaWYgKGluZGV4IDw9IG1heEluZGV4KSB7XG4gICAgICAgICAgcmV0dXJuIG1hcEl0ZXJhdG9yVmFsdWUodHlwZSwgbm9kZS5lbnRyaWVzW3RoaXMuX3JldmVyc2UgPyBtYXhJbmRleCAtIGluZGV4IDogaW5kZXhdKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWF4SW5kZXggPSBub2RlLm5vZGVzLmxlbmd0aCAtIDE7XG4gICAgICAgIGlmIChpbmRleCA8PSBtYXhJbmRleCkge1xuICAgICAgICAgIHZhciBzdWJOb2RlID0gbm9kZS5ub2Rlc1t0aGlzLl9yZXZlcnNlID8gbWF4SW5kZXggLSBpbmRleCA6IGluZGV4XTtcbiAgICAgICAgICBpZiAoc3ViTm9kZSkge1xuICAgICAgICAgICAgaWYgKHN1Yk5vZGUuZW50cnkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG1hcEl0ZXJhdG9yVmFsdWUodHlwZSwgc3ViTm9kZS5lbnRyeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGFjayA9IHRoaXMuX3N0YWNrID0gbWFwSXRlcmF0b3JGcmFtZShzdWJOb2RlLCBzdGFjayk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzdGFjayA9IHRoaXMuX3N0YWNrID0gdGhpcy5fc3RhY2suX19wcmV2O1xuICAgIH1cbiAgICByZXR1cm4gaXRlcmF0b3JEb25lKCk7XG4gIH19LCB7fSwgSXRlcmF0b3IpO1xuZnVuY3Rpb24gbWFwSXRlcmF0b3JWYWx1ZSh0eXBlLCBlbnRyeSkge1xuICByZXR1cm4gaXRlcmF0b3JWYWx1ZSh0eXBlLCBlbnRyeVswXSwgZW50cnlbMV0pO1xufVxuZnVuY3Rpb24gbWFwSXRlcmF0b3JGcmFtZShub2RlLCBwcmV2KSB7XG4gIHJldHVybiB7XG4gICAgbm9kZTogbm9kZSxcbiAgICBpbmRleDogMCxcbiAgICBfX3ByZXY6IHByZXZcbiAgfTtcbn1cbmZ1bmN0aW9uIG1ha2VNYXAoc2l6ZSwgcm9vdCwgb3duZXJJRCwgaGFzaCkge1xuICB2YXIgbWFwID0gT2JqZWN0LmNyZWF0ZShNYXBQcm90b3R5cGUpO1xuICBtYXAuc2l6ZSA9IHNpemU7XG4gIG1hcC5fcm9vdCA9IHJvb3Q7XG4gIG1hcC5fX293bmVySUQgPSBvd25lcklEO1xuICBtYXAuX19oYXNoID0gaGFzaDtcbiAgbWFwLl9fYWx0ZXJlZCA9IGZhbHNlO1xuICByZXR1cm4gbWFwO1xufVxudmFyIEVNUFRZX01BUDtcbmZ1bmN0aW9uIGVtcHR5TWFwKCkge1xuICByZXR1cm4gRU1QVFlfTUFQIHx8IChFTVBUWV9NQVAgPSBtYWtlTWFwKDApKTtcbn1cbmZ1bmN0aW9uIHVwZGF0ZU1hcChtYXAsIGssIHYpIHtcbiAgdmFyIGRpZENoYW5nZVNpemUgPSBNYWtlUmVmKENIQU5HRV9MRU5HVEgpO1xuICB2YXIgZGlkQWx0ZXIgPSBNYWtlUmVmKERJRF9BTFRFUik7XG4gIHZhciBuZXdSb290ID0gdXBkYXRlTm9kZShtYXAuX3Jvb3QsIG1hcC5fX293bmVySUQsIDAsIGhhc2goayksIGssIHYsIGRpZENoYW5nZVNpemUsIGRpZEFsdGVyKTtcbiAgaWYgKCFkaWRBbHRlci52YWx1ZSkge1xuICAgIHJldHVybiBtYXA7XG4gIH1cbiAgdmFyIG5ld1NpemUgPSBtYXAuc2l6ZSArIChkaWRDaGFuZ2VTaXplLnZhbHVlID8gdiA9PT0gTk9UX1NFVCA/IC0xIDogMSA6IDApO1xuICBpZiAobWFwLl9fb3duZXJJRCkge1xuICAgIG1hcC5zaXplID0gbmV3U2l6ZTtcbiAgICBtYXAuX3Jvb3QgPSBuZXdSb290O1xuICAgIG1hcC5fX2hhc2ggPSB1bmRlZmluZWQ7XG4gICAgbWFwLl9fYWx0ZXJlZCA9IHRydWU7XG4gICAgcmV0dXJuIG1hcDtcbiAgfVxuICByZXR1cm4gbmV3Um9vdCA/IG1ha2VNYXAobmV3U2l6ZSwgbmV3Um9vdCkgOiBlbXB0eU1hcCgpO1xufVxuZnVuY3Rpb24gdXBkYXRlTm9kZShub2RlLCBvd25lcklELCBzaGlmdCwgaGFzaCwga2V5LCB2YWx1ZSwgZGlkQ2hhbmdlU2l6ZSwgZGlkQWx0ZXIpIHtcbiAgaWYgKCFub2RlKSB7XG4gICAgaWYgKHZhbHVlID09PSBOT1RfU0VUKSB7XG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gICAgU2V0UmVmKGRpZEFsdGVyKTtcbiAgICBTZXRSZWYoZGlkQ2hhbmdlU2l6ZSk7XG4gICAgcmV0dXJuIG5ldyBWYWx1ZU5vZGUob3duZXJJRCwgaGFzaCwgW2tleSwgdmFsdWVdKTtcbiAgfVxuICByZXR1cm4gbm9kZS51cGRhdGUob3duZXJJRCwgc2hpZnQsIGhhc2gsIGtleSwgdmFsdWUsIGRpZENoYW5nZVNpemUsIGRpZEFsdGVyKTtcbn1cbmZ1bmN0aW9uIGlzTGVhZk5vZGUobm9kZSkge1xuICByZXR1cm4gbm9kZS5jb25zdHJ1Y3RvciA9PT0gVmFsdWVOb2RlIHx8IG5vZGUuY29uc3RydWN0b3IgPT09IEhhc2hDb2xsaXNpb25Ob2RlO1xufVxuZnVuY3Rpb24gbWVyZ2VJbnRvTm9kZShub2RlLCBvd25lcklELCBzaGlmdCwgaGFzaCwgZW50cnkpIHtcbiAgaWYgKG5vZGUuaGFzaCA9PT0gaGFzaCkge1xuICAgIHJldHVybiBuZXcgSGFzaENvbGxpc2lvbk5vZGUob3duZXJJRCwgaGFzaCwgW25vZGUuZW50cnksIGVudHJ5XSk7XG4gIH1cbiAgdmFyIGlkeDEgPSAoc2hpZnQgPT09IDAgPyBub2RlLmhhc2ggOiBub2RlLmhhc2ggPj4+IHNoaWZ0KSAmIE1BU0s7XG4gIHZhciBpZHgyID0gKHNoaWZ0ID09PSAwID8gaGFzaCA6IGhhc2ggPj4+IHNoaWZ0KSAmIE1BU0s7XG4gIHZhciBuZXdOb2RlO1xuICB2YXIgbm9kZXMgPSBpZHgxID09PSBpZHgyID8gW21lcmdlSW50b05vZGUobm9kZSwgb3duZXJJRCwgc2hpZnQgKyBTSElGVCwgaGFzaCwgZW50cnkpXSA6ICgobmV3Tm9kZSA9IG5ldyBWYWx1ZU5vZGUob3duZXJJRCwgaGFzaCwgZW50cnkpKSwgaWR4MSA8IGlkeDIgPyBbbm9kZSwgbmV3Tm9kZV0gOiBbbmV3Tm9kZSwgbm9kZV0pO1xuICByZXR1cm4gbmV3IEJpdG1hcEluZGV4ZWROb2RlKG93bmVySUQsICgxIDw8IGlkeDEpIHwgKDEgPDwgaWR4MiksIG5vZGVzKTtcbn1cbmZ1bmN0aW9uIHBhY2tOb2Rlcyhvd25lcklELCBub2RlcywgY291bnQsIGV4Y2x1ZGluZykge1xuICB2YXIgYml0bWFwID0gMDtcbiAgdmFyIHBhY2tlZElJID0gMDtcbiAgdmFyIHBhY2tlZE5vZGVzID0gbmV3IEFycmF5KGNvdW50KTtcbiAgZm9yICh2YXIgaWkgPSAwLFxuICAgICAgYml0ID0gMSxcbiAgICAgIGxlbiA9IG5vZGVzLmxlbmd0aDsgaWkgPCBsZW47IGlpKyssIGJpdCA8PD0gMSkge1xuICAgIHZhciBub2RlID0gbm9kZXNbaWldO1xuICAgIGlmIChub2RlICE9PSB1bmRlZmluZWQgJiYgaWkgIT09IGV4Y2x1ZGluZykge1xuICAgICAgYml0bWFwIHw9IGJpdDtcbiAgICAgIHBhY2tlZE5vZGVzW3BhY2tlZElJKytdID0gbm9kZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5ldyBCaXRtYXBJbmRleGVkTm9kZShvd25lcklELCBiaXRtYXAsIHBhY2tlZE5vZGVzKTtcbn1cbmZ1bmN0aW9uIGV4cGFuZE5vZGVzKG93bmVySUQsIG5vZGVzLCBiaXRtYXAsIGluY2x1ZGluZywgbm9kZSkge1xuICB2YXIgY291bnQgPSAwO1xuICB2YXIgZXhwYW5kZWROb2RlcyA9IG5ldyBBcnJheShTSVpFKTtcbiAgZm9yICh2YXIgaWkgPSAwOyBiaXRtYXAgIT09IDA7IGlpKyssIGJpdG1hcCA+Pj49IDEpIHtcbiAgICBleHBhbmRlZE5vZGVzW2lpXSA9IGJpdG1hcCAmIDEgPyBub2Rlc1tjb3VudCsrXSA6IHVuZGVmaW5lZDtcbiAgfVxuICBleHBhbmRlZE5vZGVzW2luY2x1ZGluZ10gPSBub2RlO1xuICByZXR1cm4gbmV3IEFycmF5Tm9kZShvd25lcklELCBjb3VudCArIDEsIGV4cGFuZGVkTm9kZXMpO1xufVxuZnVuY3Rpb24gbWVyZ2VJbnRvTWFwV2l0aChtYXAsIG1lcmdlciwgaXRlcmFibGVzKSB7XG4gIHZhciBpdGVycyA9IFtdO1xuICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgaXRlcmFibGVzLmxlbmd0aDsgaWkrKykge1xuICAgIHZhciB2YWx1ZSA9IGl0ZXJhYmxlc1tpaV07XG4gICAgdmFyIGl0ZXIgPSBLZXllZEl0ZXJhYmxlKHZhbHVlKTtcbiAgICBpZiAoIWlzSXRlcmFibGUodmFsdWUpKSB7XG4gICAgICBpdGVyID0gaXRlci5tYXAoKGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgcmV0dXJuIGZyb21KUyh2KTtcbiAgICAgIH0pKTtcbiAgICB9XG4gICAgaXRlcnMucHVzaChpdGVyKTtcbiAgfVxuICByZXR1cm4gbWVyZ2VJbnRvQ29sbGVjdGlvbldpdGgobWFwLCBtZXJnZXIsIGl0ZXJzKTtcbn1cbmZ1bmN0aW9uIGRlZXBNZXJnZXIobWVyZ2VyKSB7XG4gIHJldHVybiAoZnVuY3Rpb24oZXhpc3RpbmcsIHZhbHVlKSB7XG4gICAgcmV0dXJuIGV4aXN0aW5nICYmIGV4aXN0aW5nLm1lcmdlRGVlcFdpdGggJiYgaXNJdGVyYWJsZSh2YWx1ZSkgPyBleGlzdGluZy5tZXJnZURlZXBXaXRoKG1lcmdlciwgdmFsdWUpIDogbWVyZ2VyID8gbWVyZ2VyKGV4aXN0aW5nLCB2YWx1ZSkgOiB2YWx1ZTtcbiAgfSk7XG59XG5mdW5jdGlvbiBtZXJnZUludG9Db2xsZWN0aW9uV2l0aChjb2xsZWN0aW9uLCBtZXJnZXIsIGl0ZXJzKSB7XG4gIGlmIChpdGVycy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gY29sbGVjdGlvbjtcbiAgfVxuICByZXR1cm4gY29sbGVjdGlvbi53aXRoTXV0YXRpb25zKChmdW5jdGlvbihjb2xsZWN0aW9uKSB7XG4gICAgdmFyIG1lcmdlSW50b01hcCA9IG1lcmdlciA/IChmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICBjb2xsZWN0aW9uLnVwZGF0ZShrZXksIE5PVF9TRVQsIChmdW5jdGlvbihleGlzdGluZykge1xuICAgICAgICByZXR1cm4gZXhpc3RpbmcgPT09IE5PVF9TRVQgPyB2YWx1ZSA6IG1lcmdlcihleGlzdGluZywgdmFsdWUpO1xuICAgICAgfSkpO1xuICAgIH0pIDogKGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgIGNvbGxlY3Rpb24uc2V0KGtleSwgdmFsdWUpO1xuICAgIH0pO1xuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBpdGVycy5sZW5ndGg7IGlpKyspIHtcbiAgICAgIGl0ZXJzW2lpXS5mb3JFYWNoKG1lcmdlSW50b01hcCk7XG4gICAgfVxuICB9KSk7XG59XG5mdW5jdGlvbiB1cGRhdGVJbkRlZXBNYXAoY29sbGVjdGlvbiwga2V5UGF0aCwgbm90U2V0VmFsdWUsIHVwZGF0ZXIsIG9mZnNldCkge1xuICBpbnZhcmlhbnQoIWNvbGxlY3Rpb24gfHwgY29sbGVjdGlvbi5zZXQsICd1cGRhdGVJbiB3aXRoIGludmFsaWQga2V5UGF0aCcpO1xuICB2YXIga2V5ID0ga2V5UGF0aFtvZmZzZXRdO1xuICB2YXIgZXhpc3RpbmcgPSBjb2xsZWN0aW9uID8gY29sbGVjdGlvbi5nZXQoa2V5LCBOT1RfU0VUKSA6IE5PVF9TRVQ7XG4gIHZhciBleGlzdGluZ1ZhbHVlID0gZXhpc3RpbmcgPT09IE5PVF9TRVQgPyB1bmRlZmluZWQgOiBleGlzdGluZztcbiAgdmFyIHZhbHVlID0gb2Zmc2V0ID09PSBrZXlQYXRoLmxlbmd0aCAtIDEgPyB1cGRhdGVyKGV4aXN0aW5nID09PSBOT1RfU0VUID8gbm90U2V0VmFsdWUgOiBleGlzdGluZykgOiB1cGRhdGVJbkRlZXBNYXAoZXhpc3RpbmdWYWx1ZSwga2V5UGF0aCwgbm90U2V0VmFsdWUsIHVwZGF0ZXIsIG9mZnNldCArIDEpO1xuICByZXR1cm4gdmFsdWUgPT09IGV4aXN0aW5nVmFsdWUgPyBjb2xsZWN0aW9uIDogdmFsdWUgPT09IE5PVF9TRVQgPyBjb2xsZWN0aW9uICYmIGNvbGxlY3Rpb24ucmVtb3ZlKGtleSkgOiAoY29sbGVjdGlvbiB8fCBlbXB0eU1hcCgpKS5zZXQoa2V5LCB2YWx1ZSk7XG59XG5mdW5jdGlvbiBwb3BDb3VudCh4KSB7XG4gIHggPSB4IC0gKCh4ID4+IDEpICYgMHg1NTU1NTU1NSk7XG4gIHggPSAoeCAmIDB4MzMzMzMzMzMpICsgKCh4ID4+IDIpICYgMHgzMzMzMzMzMyk7XG4gIHggPSAoeCArICh4ID4+IDQpKSAmIDB4MGYwZjBmMGY7XG4gIHggPSB4ICsgKHggPj4gOCk7XG4gIHggPSB4ICsgKHggPj4gMTYpO1xuICByZXR1cm4geCAmIDB4N2Y7XG59XG5mdW5jdGlvbiBzZXRJbihhcnJheSwgaWR4LCB2YWwsIGNhbkVkaXQpIHtcbiAgdmFyIG5ld0FycmF5ID0gY2FuRWRpdCA/IGFycmF5IDogYXJyQ29weShhcnJheSk7XG4gIG5ld0FycmF5W2lkeF0gPSB2YWw7XG4gIHJldHVybiBuZXdBcnJheTtcbn1cbmZ1bmN0aW9uIHNwbGljZUluKGFycmF5LCBpZHgsIHZhbCwgY2FuRWRpdCkge1xuICB2YXIgbmV3TGVuID0gYXJyYXkubGVuZ3RoICsgMTtcbiAgaWYgKGNhbkVkaXQgJiYgaWR4ICsgMSA9PT0gbmV3TGVuKSB7XG4gICAgYXJyYXlbaWR4XSA9IHZhbDtcbiAgICByZXR1cm4gYXJyYXk7XG4gIH1cbiAgdmFyIG5ld0FycmF5ID0gbmV3IEFycmF5KG5ld0xlbik7XG4gIHZhciBhZnRlciA9IDA7XG4gIGZvciAodmFyIGlpID0gMDsgaWkgPCBuZXdMZW47IGlpKyspIHtcbiAgICBpZiAoaWkgPT09IGlkeCkge1xuICAgICAgbmV3QXJyYXlbaWldID0gdmFsO1xuICAgICAgYWZ0ZXIgPSAtMTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmV3QXJyYXlbaWldID0gYXJyYXlbaWkgKyBhZnRlcl07XG4gICAgfVxuICB9XG4gIHJldHVybiBuZXdBcnJheTtcbn1cbmZ1bmN0aW9uIHNwbGljZU91dChhcnJheSwgaWR4LCBjYW5FZGl0KSB7XG4gIHZhciBuZXdMZW4gPSBhcnJheS5sZW5ndGggLSAxO1xuICBpZiAoY2FuRWRpdCAmJiBpZHggPT09IG5ld0xlbikge1xuICAgIGFycmF5LnBvcCgpO1xuICAgIHJldHVybiBhcnJheTtcbiAgfVxuICB2YXIgbmV3QXJyYXkgPSBuZXcgQXJyYXkobmV3TGVuKTtcbiAgdmFyIGFmdGVyID0gMDtcbiAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IG5ld0xlbjsgaWkrKykge1xuICAgIGlmIChpaSA9PT0gaWR4KSB7XG4gICAgICBhZnRlciA9IDE7XG4gICAgfVxuICAgIG5ld0FycmF5W2lpXSA9IGFycmF5W2lpICsgYWZ0ZXJdO1xuICB9XG4gIHJldHVybiBuZXdBcnJheTtcbn1cbnZhciBNQVhfQklUTUFQX1NJWkUgPSBTSVpFIC8gMjtcbnZhciBNSU5fQVJSQVlfU0laRSA9IFNJWkUgLyA0O1xudmFyIFRvS2V5ZWRTZXF1ZW5jZSA9IGZ1bmN0aW9uIFRvS2V5ZWRTZXF1ZW5jZShpbmRleGVkLCB1c2VLZXlzKSB7XG4gIHRoaXMuX2l0ZXIgPSBpbmRleGVkO1xuICB0aGlzLl91c2VLZXlzID0gdXNlS2V5cztcbiAgdGhpcy5zaXplID0gaW5kZXhlZC5zaXplO1xufTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFRvS2V5ZWRTZXF1ZW5jZSwge1xuICBnZXQ6IGZ1bmN0aW9uKGtleSwgbm90U2V0VmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5faXRlci5nZXQoa2V5LCBub3RTZXRWYWx1ZSk7XG4gIH0sXG4gIGhhczogZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuX2l0ZXIuaGFzKGtleSk7XG4gIH0sXG4gIHZhbHVlU2VxOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5faXRlci52YWx1ZVNlcSgpO1xuICB9LFxuICByZXZlcnNlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgdmFyIHJldmVyc2VkU2VxdWVuY2UgPSByZXZlcnNlRmFjdG9yeSh0aGlzLCB0cnVlKTtcbiAgICBpZiAoIXRoaXMuX3VzZUtleXMpIHtcbiAgICAgIHJldmVyc2VkU2VxdWVuY2UudmFsdWVTZXEgPSAoZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAkX18wLl9pdGVyLnRvU2VxKCkucmV2ZXJzZSgpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZXZlcnNlZFNlcXVlbmNlO1xuICB9LFxuICBtYXA6IGZ1bmN0aW9uKG1hcHBlciwgY29udGV4dCkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICB2YXIgbWFwcGVkU2VxdWVuY2UgPSBtYXBGYWN0b3J5KHRoaXMsIG1hcHBlciwgY29udGV4dCk7XG4gICAgaWYgKCF0aGlzLl91c2VLZXlzKSB7XG4gICAgICBtYXBwZWRTZXF1ZW5jZS52YWx1ZVNlcSA9IChmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICRfXzAuX2l0ZXIudG9TZXEoKS5tYXAobWFwcGVyLCBjb250ZXh0KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gbWFwcGVkU2VxdWVuY2U7XG4gIH0sXG4gIF9faXRlcmF0ZTogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgdmFyIGlpO1xuICAgIHJldHVybiB0aGlzLl9pdGVyLl9faXRlcmF0ZSh0aGlzLl91c2VLZXlzID8gKGZ1bmN0aW9uKHYsIGspIHtcbiAgICAgIHJldHVybiBmbih2LCBrLCAkX18wKTtcbiAgICB9KSA6ICgoaWkgPSByZXZlcnNlID8gcmVzb2x2ZVNpemUodGhpcykgOiAwKSwgKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHJldHVybiBmbih2LCByZXZlcnNlID8gLS1paSA6IGlpKyssICRfXzApO1xuICAgIH0pKSwgcmV2ZXJzZSk7XG4gIH0sXG4gIF9faXRlcmF0b3I6IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICBpZiAodGhpcy5fdXNlS2V5cykge1xuICAgICAgcmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRvcih0eXBlLCByZXZlcnNlKTtcbiAgICB9XG4gICAgdmFyIGl0ZXJhdG9yID0gdGhpcy5faXRlci5fX2l0ZXJhdG9yKElURVJBVEVfVkFMVUVTLCByZXZlcnNlKTtcbiAgICB2YXIgaWkgPSByZXZlcnNlID8gcmVzb2x2ZVNpemUodGhpcykgOiAwO1xuICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHN0ZXAgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICByZXR1cm4gc3RlcC5kb25lID8gc3RlcCA6IGl0ZXJhdG9yVmFsdWUodHlwZSwgcmV2ZXJzZSA/IC0taWkgOiBpaSsrLCBzdGVwLnZhbHVlLCBzdGVwKTtcbiAgICB9KSk7XG4gIH1cbn0sIHt9LCBLZXllZFNlcSk7XG52YXIgVG9JbmRleGVkU2VxdWVuY2UgPSBmdW5jdGlvbiBUb0luZGV4ZWRTZXF1ZW5jZShpdGVyKSB7XG4gIHRoaXMuX2l0ZXIgPSBpdGVyO1xuICB0aGlzLnNpemUgPSBpdGVyLnNpemU7XG59O1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoVG9JbmRleGVkU2VxdWVuY2UsIHtcbiAgY29udGFpbnM6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuX2l0ZXIuY29udGFpbnModmFsdWUpO1xuICB9LFxuICBfX2l0ZXJhdGU6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICByZXR1cm4gdGhpcy5faXRlci5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHJldHVybiBmbih2LCBpdGVyYXRpb25zKyssICRfXzApO1xuICAgIH0pLCByZXZlcnNlKTtcbiAgfSxcbiAgX19pdGVyYXRvcjogZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHZhciBpdGVyYXRvciA9IHRoaXMuX2l0ZXIuX19pdGVyYXRvcihJVEVSQVRFX1ZBTFVFUywgcmV2ZXJzZSk7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHN0ZXAgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICByZXR1cm4gc3RlcC5kb25lID8gc3RlcCA6IGl0ZXJhdG9yVmFsdWUodHlwZSwgaXRlcmF0aW9ucysrLCBzdGVwLnZhbHVlLCBzdGVwKTtcbiAgICB9KSk7XG4gIH1cbn0sIHt9LCBJbmRleGVkU2VxKTtcbnZhciBUb1NldFNlcXVlbmNlID0gZnVuY3Rpb24gVG9TZXRTZXF1ZW5jZShpdGVyKSB7XG4gIHRoaXMuX2l0ZXIgPSBpdGVyO1xuICB0aGlzLnNpemUgPSBpdGVyLnNpemU7XG59O1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoVG9TZXRTZXF1ZW5jZSwge1xuICBoYXM6IGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiB0aGlzLl9pdGVyLmNvbnRhaW5zKGtleSk7XG4gIH0sXG4gIF9faXRlcmF0ZTogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgcmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRlKChmdW5jdGlvbih2KSB7XG4gICAgICByZXR1cm4gZm4odiwgdiwgJF9fMCk7XG4gICAgfSksIHJldmVyc2UpO1xuICB9LFxuICBfX2l0ZXJhdG9yOiBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgdmFyIGl0ZXJhdG9yID0gdGhpcy5faXRlci5fX2l0ZXJhdG9yKElURVJBVEVfVkFMVUVTLCByZXZlcnNlKTtcbiAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzdGVwID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgcmV0dXJuIHN0ZXAuZG9uZSA/IHN0ZXAgOiBpdGVyYXRvclZhbHVlKHR5cGUsIHN0ZXAudmFsdWUsIHN0ZXAudmFsdWUsIHN0ZXApO1xuICAgIH0pKTtcbiAgfVxufSwge30sIFNldFNlcSk7XG52YXIgRnJvbUVudHJpZXNTZXF1ZW5jZSA9IGZ1bmN0aW9uIEZyb21FbnRyaWVzU2VxdWVuY2UoZW50cmllcykge1xuICB0aGlzLl9pdGVyID0gZW50cmllcztcbiAgdGhpcy5zaXplID0gZW50cmllcy5zaXplO1xufTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKEZyb21FbnRyaWVzU2VxdWVuY2UsIHtcbiAgZW50cnlTZXE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9pdGVyLnRvU2VxKCk7XG4gIH0sXG4gIF9faXRlcmF0ZTogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgcmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRlKChmdW5jdGlvbihlbnRyeSkge1xuICAgICAgaWYgKGVudHJ5KSB7XG4gICAgICAgIHZhbGlkYXRlRW50cnkoZW50cnkpO1xuICAgICAgICByZXR1cm4gZm4oZW50cnlbMV0sIGVudHJ5WzBdLCAkX18wKTtcbiAgICAgIH1cbiAgICB9KSwgcmV2ZXJzZSk7XG4gIH0sXG4gIF9faXRlcmF0b3I6IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICB2YXIgaXRlcmF0b3IgPSB0aGlzLl9pdGVyLl9faXRlcmF0b3IoSVRFUkFURV9WQUxVRVMsIHJldmVyc2UpO1xuICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgdmFyIHN0ZXAgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIGlmIChzdGVwLmRvbmUpIHtcbiAgICAgICAgICByZXR1cm4gc3RlcDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZW50cnkgPSBzdGVwLnZhbHVlO1xuICAgICAgICBpZiAoZW50cnkpIHtcbiAgICAgICAgICB2YWxpZGF0ZUVudHJ5KGVudHJ5KTtcbiAgICAgICAgICByZXR1cm4gdHlwZSA9PT0gSVRFUkFURV9FTlRSSUVTID8gc3RlcCA6IGl0ZXJhdG9yVmFsdWUodHlwZSwgZW50cnlbMF0sIGVudHJ5WzFdLCBzdGVwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pKTtcbiAgfVxufSwge30sIEtleWVkU2VxKTtcblRvSW5kZXhlZFNlcXVlbmNlLnByb3RvdHlwZS5jYWNoZVJlc3VsdCA9IFRvS2V5ZWRTZXF1ZW5jZS5wcm90b3R5cGUuY2FjaGVSZXN1bHQgPSBUb1NldFNlcXVlbmNlLnByb3RvdHlwZS5jYWNoZVJlc3VsdCA9IEZyb21FbnRyaWVzU2VxdWVuY2UucHJvdG90eXBlLmNhY2hlUmVzdWx0ID0gY2FjaGVSZXN1bHRUaHJvdWdoO1xuZnVuY3Rpb24gZmxpcEZhY3RvcnkoaXRlcmFibGUpIHtcbiAgdmFyIGZsaXBTZXF1ZW5jZSA9IG1ha2VTZXF1ZW5jZShpdGVyYWJsZSk7XG4gIGZsaXBTZXF1ZW5jZS5faXRlciA9IGl0ZXJhYmxlO1xuICBmbGlwU2VxdWVuY2Uuc2l6ZSA9IGl0ZXJhYmxlLnNpemU7XG4gIGZsaXBTZXF1ZW5jZS5mbGlwID0gKGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBpdGVyYWJsZTtcbiAgfSk7XG4gIGZsaXBTZXF1ZW5jZS5yZXZlcnNlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJldmVyc2VkU2VxdWVuY2UgPSBpdGVyYWJsZS5yZXZlcnNlLmFwcGx5KHRoaXMpO1xuICAgIHJldmVyc2VkU2VxdWVuY2UuZmxpcCA9IChmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBpdGVyYWJsZS5yZXZlcnNlKCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJldmVyc2VkU2VxdWVuY2U7XG4gIH07XG4gIGZsaXBTZXF1ZW5jZS5oYXMgPSAoZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIGl0ZXJhYmxlLmNvbnRhaW5zKGtleSk7XG4gIH0pO1xuICBmbGlwU2VxdWVuY2UuY29udGFpbnMgPSAoZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIGl0ZXJhYmxlLmhhcyhrZXkpO1xuICB9KTtcbiAgZmxpcFNlcXVlbmNlLmNhY2hlUmVzdWx0ID0gY2FjaGVSZXN1bHRUaHJvdWdoO1xuICBmbGlwU2VxdWVuY2UuX19pdGVyYXRlVW5jYWNoZWQgPSBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICByZXR1cm4gaXRlcmFibGUuX19pdGVyYXRlKChmdW5jdGlvbih2LCBrKSB7XG4gICAgICByZXR1cm4gZm4oaywgdiwgJF9fMCkgIT09IGZhbHNlO1xuICAgIH0pLCByZXZlcnNlKTtcbiAgfTtcbiAgZmxpcFNlcXVlbmNlLl9faXRlcmF0b3JVbmNhY2hlZCA9IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICBpZiAodHlwZSA9PT0gSVRFUkFURV9FTlRSSUVTKSB7XG4gICAgICB2YXIgaXRlcmF0b3IgPSBpdGVyYWJsZS5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICAgICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzdGVwID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICBpZiAoIXN0ZXAuZG9uZSkge1xuICAgICAgICAgIHZhciBrID0gc3RlcC52YWx1ZVswXTtcbiAgICAgICAgICBzdGVwLnZhbHVlWzBdID0gc3RlcC52YWx1ZVsxXTtcbiAgICAgICAgICBzdGVwLnZhbHVlWzFdID0gaztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RlcDtcbiAgICAgIH0pKTtcbiAgICB9XG4gICAgcmV0dXJuIGl0ZXJhYmxlLl9faXRlcmF0b3IodHlwZSA9PT0gSVRFUkFURV9WQUxVRVMgPyBJVEVSQVRFX0tFWVMgOiBJVEVSQVRFX1ZBTFVFUywgcmV2ZXJzZSk7XG4gIH07XG4gIHJldHVybiBmbGlwU2VxdWVuY2U7XG59XG5mdW5jdGlvbiBtYXBGYWN0b3J5KGl0ZXJhYmxlLCBtYXBwZXIsIGNvbnRleHQpIHtcbiAgdmFyIG1hcHBlZFNlcXVlbmNlID0gbWFrZVNlcXVlbmNlKGl0ZXJhYmxlKTtcbiAgbWFwcGVkU2VxdWVuY2Uuc2l6ZSA9IGl0ZXJhYmxlLnNpemU7XG4gIG1hcHBlZFNlcXVlbmNlLmhhcyA9IChmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4gaXRlcmFibGUuaGFzKGtleSk7XG4gIH0pO1xuICBtYXBwZWRTZXF1ZW5jZS5nZXQgPSAoZnVuY3Rpb24oa2V5LCBub3RTZXRWYWx1ZSkge1xuICAgIHZhciB2ID0gaXRlcmFibGUuZ2V0KGtleSwgTk9UX1NFVCk7XG4gICAgcmV0dXJuIHYgPT09IE5PVF9TRVQgPyBub3RTZXRWYWx1ZSA6IG1hcHBlci5jYWxsKGNvbnRleHQsIHYsIGtleSwgaXRlcmFibGUpO1xuICB9KTtcbiAgbWFwcGVkU2VxdWVuY2UuX19pdGVyYXRlVW5jYWNoZWQgPSBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICByZXR1cm4gaXRlcmFibGUuX19pdGVyYXRlKChmdW5jdGlvbih2LCBrLCBjKSB7XG4gICAgICByZXR1cm4gZm4obWFwcGVyLmNhbGwoY29udGV4dCwgdiwgaywgYyksIGssICRfXzApICE9PSBmYWxzZTtcbiAgICB9KSwgcmV2ZXJzZSk7XG4gIH07XG4gIG1hcHBlZFNlcXVlbmNlLl9faXRlcmF0b3JVbmNhY2hlZCA9IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICB2YXIgaXRlcmF0b3IgPSBpdGVyYWJsZS5fX2l0ZXJhdG9yKElURVJBVEVfRU5UUklFUywgcmV2ZXJzZSk7XG4gICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc3RlcCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgIGlmIChzdGVwLmRvbmUpIHtcbiAgICAgICAgcmV0dXJuIHN0ZXA7XG4gICAgICB9XG4gICAgICB2YXIgZW50cnkgPSBzdGVwLnZhbHVlO1xuICAgICAgdmFyIGtleSA9IGVudHJ5WzBdO1xuICAgICAgcmV0dXJuIGl0ZXJhdG9yVmFsdWUodHlwZSwga2V5LCBtYXBwZXIuY2FsbChjb250ZXh0LCBlbnRyeVsxXSwga2V5LCBpdGVyYWJsZSksIHN0ZXApO1xuICAgIH0pKTtcbiAgfTtcbiAgcmV0dXJuIG1hcHBlZFNlcXVlbmNlO1xufVxuZnVuY3Rpb24gcmV2ZXJzZUZhY3RvcnkoaXRlcmFibGUsIHVzZUtleXMpIHtcbiAgdmFyIHJldmVyc2VkU2VxdWVuY2UgPSBtYWtlU2VxdWVuY2UoaXRlcmFibGUpO1xuICByZXZlcnNlZFNlcXVlbmNlLl9pdGVyID0gaXRlcmFibGU7XG4gIHJldmVyc2VkU2VxdWVuY2Uuc2l6ZSA9IGl0ZXJhYmxlLnNpemU7XG4gIHJldmVyc2VkU2VxdWVuY2UucmV2ZXJzZSA9IChmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gaXRlcmFibGU7XG4gIH0pO1xuICBpZiAoaXRlcmFibGUuZmxpcCkge1xuICAgIHJldmVyc2VkU2VxdWVuY2UuZmxpcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGZsaXBTZXF1ZW5jZSA9IGZsaXBGYWN0b3J5KGl0ZXJhYmxlKTtcbiAgICAgIGZsaXBTZXF1ZW5jZS5yZXZlcnNlID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gaXRlcmFibGUuZmxpcCgpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gZmxpcFNlcXVlbmNlO1xuICAgIH07XG4gIH1cbiAgcmV2ZXJzZWRTZXF1ZW5jZS5nZXQgPSAoZnVuY3Rpb24oa2V5LCBub3RTZXRWYWx1ZSkge1xuICAgIHJldHVybiBpdGVyYWJsZS5nZXQodXNlS2V5cyA/IGtleSA6IC0xIC0ga2V5LCBub3RTZXRWYWx1ZSk7XG4gIH0pO1xuICByZXZlcnNlZFNlcXVlbmNlLmhhcyA9IChmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4gaXRlcmFibGUuaGFzKHVzZUtleXMgPyBrZXkgOiAtMSAtIGtleSk7XG4gIH0pO1xuICByZXZlcnNlZFNlcXVlbmNlLmNvbnRhaW5zID0gKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIGl0ZXJhYmxlLmNvbnRhaW5zKHZhbHVlKTtcbiAgfSk7XG4gIHJldmVyc2VkU2VxdWVuY2UuY2FjaGVSZXN1bHQgPSBjYWNoZVJlc3VsdFRocm91Z2g7XG4gIHJldmVyc2VkU2VxdWVuY2UuX19pdGVyYXRlID0gZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgcmV0dXJuIGl0ZXJhYmxlLl9faXRlcmF0ZSgoZnVuY3Rpb24odiwgaykge1xuICAgICAgcmV0dXJuIGZuKHYsIGssICRfXzApO1xuICAgIH0pLCAhcmV2ZXJzZSk7XG4gIH07XG4gIHJldmVyc2VkU2VxdWVuY2UuX19pdGVyYXRvciA9IChmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgcmV0dXJuIGl0ZXJhYmxlLl9faXRlcmF0b3IodHlwZSwgIXJldmVyc2UpO1xuICB9KTtcbiAgcmV0dXJuIHJldmVyc2VkU2VxdWVuY2U7XG59XG5mdW5jdGlvbiBmaWx0ZXJGYWN0b3J5KGl0ZXJhYmxlLCBwcmVkaWNhdGUsIGNvbnRleHQsIHVzZUtleXMpIHtcbiAgdmFyIGZpbHRlclNlcXVlbmNlID0gbWFrZVNlcXVlbmNlKGl0ZXJhYmxlKTtcbiAgaWYgKHVzZUtleXMpIHtcbiAgICBmaWx0ZXJTZXF1ZW5jZS5oYXMgPSAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICB2YXIgdiA9IGl0ZXJhYmxlLmdldChrZXksIE5PVF9TRVQpO1xuICAgICAgcmV0dXJuIHYgIT09IE5PVF9TRVQgJiYgISFwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2LCBrZXksIGl0ZXJhYmxlKTtcbiAgICB9KTtcbiAgICBmaWx0ZXJTZXF1ZW5jZS5nZXQgPSAoZnVuY3Rpb24oa2V5LCBub3RTZXRWYWx1ZSkge1xuICAgICAgdmFyIHYgPSBpdGVyYWJsZS5nZXQoa2V5LCBOT1RfU0VUKTtcbiAgICAgIHJldHVybiB2ICE9PSBOT1RfU0VUICYmIHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHYsIGtleSwgaXRlcmFibGUpID8gdiA6IG5vdFNldFZhbHVlO1xuICAgIH0pO1xuICB9XG4gIGZpbHRlclNlcXVlbmNlLl9faXRlcmF0ZVVuY2FjaGVkID0gZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIGl0ZXJhYmxlLl9faXRlcmF0ZSgoZnVuY3Rpb24odiwgaywgYykge1xuICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHYsIGssIGMpKSB7XG4gICAgICAgIGl0ZXJhdGlvbnMrKztcbiAgICAgICAgcmV0dXJuIGZuKHYsIHVzZUtleXMgPyBrIDogaXRlcmF0aW9ucyAtIDEsICRfXzApO1xuICAgICAgfVxuICAgIH0pLCByZXZlcnNlKTtcbiAgICByZXR1cm4gaXRlcmF0aW9ucztcbiAgfTtcbiAgZmlsdGVyU2VxdWVuY2UuX19pdGVyYXRvclVuY2FjaGVkID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHZhciBpdGVyYXRvciA9IGl0ZXJhYmxlLl9faXRlcmF0b3IoSVRFUkFURV9FTlRSSUVTLCByZXZlcnNlKTtcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICB2YXIgc3RlcCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgaWYgKHN0ZXAuZG9uZSkge1xuICAgICAgICAgIHJldHVybiBzdGVwO1xuICAgICAgICB9XG4gICAgICAgIHZhciBlbnRyeSA9IHN0ZXAudmFsdWU7XG4gICAgICAgIHZhciBrZXkgPSBlbnRyeVswXTtcbiAgICAgICAgdmFyIHZhbHVlID0gZW50cnlbMV07XG4gICAgICAgIGlmIChwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2YWx1ZSwga2V5LCBpdGVyYWJsZSkpIHtcbiAgICAgICAgICByZXR1cm4gaXRlcmF0b3JWYWx1ZSh0eXBlLCB1c2VLZXlzID8ga2V5IDogaXRlcmF0aW9ucysrLCB2YWx1ZSwgc3RlcCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KSk7XG4gIH07XG4gIHJldHVybiBmaWx0ZXJTZXF1ZW5jZTtcbn1cbmZ1bmN0aW9uIGNvdW50QnlGYWN0b3J5KGl0ZXJhYmxlLCBncm91cGVyLCBjb250ZXh0KSB7XG4gIHZhciBncm91cHMgPSBNYXAoKS5hc011dGFibGUoKTtcbiAgaXRlcmFibGUuX19pdGVyYXRlKChmdW5jdGlvbih2LCBrKSB7XG4gICAgZ3JvdXBzLnVwZGF0ZShncm91cGVyLmNhbGwoY29udGV4dCwgdiwgaywgaXRlcmFibGUpLCAwLCAoZnVuY3Rpb24oYSkge1xuICAgICAgcmV0dXJuIGEgKyAxO1xuICAgIH0pKTtcbiAgfSkpO1xuICByZXR1cm4gZ3JvdXBzLmFzSW1tdXRhYmxlKCk7XG59XG5mdW5jdGlvbiBncm91cEJ5RmFjdG9yeShpdGVyYWJsZSwgZ3JvdXBlciwgY29udGV4dCkge1xuICB2YXIgaXNLZXllZEl0ZXIgPSBpc0tleWVkKGl0ZXJhYmxlKTtcbiAgdmFyIGdyb3VwcyA9IE1hcCgpLmFzTXV0YWJsZSgpO1xuICBpdGVyYWJsZS5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYsIGspIHtcbiAgICBncm91cHMudXBkYXRlKGdyb3VwZXIuY2FsbChjb250ZXh0LCB2LCBrLCBpdGVyYWJsZSksIFtdLCAoZnVuY3Rpb24oYSkge1xuICAgICAgcmV0dXJuIChhLnB1c2goaXNLZXllZEl0ZXIgPyBbaywgdl0gOiB2KSwgYSk7XG4gICAgfSkpO1xuICB9KSk7XG4gIHZhciBjb2VyY2UgPSBpdGVyYWJsZUNsYXNzKGl0ZXJhYmxlKTtcbiAgcmV0dXJuIGdyb3Vwcy5tYXAoKGZ1bmN0aW9uKGFycikge1xuICAgIHJldHVybiByZWlmeShpdGVyYWJsZSwgY29lcmNlKGFycikpO1xuICB9KSk7XG59XG5mdW5jdGlvbiB0YWtlRmFjdG9yeShpdGVyYWJsZSwgYW1vdW50KSB7XG4gIGlmIChhbW91bnQgPiBpdGVyYWJsZS5zaXplKSB7XG4gICAgcmV0dXJuIGl0ZXJhYmxlO1xuICB9XG4gIGlmIChhbW91bnQgPCAwKSB7XG4gICAgYW1vdW50ID0gMDtcbiAgfVxuICB2YXIgdGFrZVNlcXVlbmNlID0gbWFrZVNlcXVlbmNlKGl0ZXJhYmxlKTtcbiAgdGFrZVNlcXVlbmNlLnNpemUgPSBpdGVyYWJsZS5zaXplICYmIE1hdGgubWluKGl0ZXJhYmxlLnNpemUsIGFtb3VudCk7XG4gIHRha2VTZXF1ZW5jZS5fX2l0ZXJhdGVVbmNhY2hlZCA9IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIGlmIChhbW91bnQgPT09IDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdGUoZm4sIHJldmVyc2UpO1xuICAgIH1cbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgaXRlcmFibGUuX19pdGVyYXRlKChmdW5jdGlvbih2LCBrKSB7XG4gICAgICByZXR1cm4gKytpdGVyYXRpb25zICYmIGZuKHYsIGssICRfXzApICE9PSBmYWxzZSAmJiBpdGVyYXRpb25zIDwgYW1vdW50O1xuICAgIH0pKTtcbiAgICByZXR1cm4gaXRlcmF0aW9ucztcbiAgfTtcbiAgdGFrZVNlcXVlbmNlLl9faXRlcmF0b3JVbmNhY2hlZCA9IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICAgIH1cbiAgICB2YXIgaXRlcmF0b3IgPSBhbW91bnQgJiYgaXRlcmFibGUuX19pdGVyYXRvcih0eXBlLCByZXZlcnNlKTtcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoaXRlcmF0aW9ucysrID4gYW1vdW50KSB7XG4gICAgICAgIHJldHVybiBpdGVyYXRvckRvbmUoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpdGVyYXRvci5uZXh0KCk7XG4gICAgfSkpO1xuICB9O1xuICByZXR1cm4gdGFrZVNlcXVlbmNlO1xufVxuZnVuY3Rpb24gdGFrZVdoaWxlRmFjdG9yeShpdGVyYWJsZSwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gIHZhciB0YWtlU2VxdWVuY2UgPSBtYWtlU2VxdWVuY2UoaXRlcmFibGUpO1xuICB0YWtlU2VxdWVuY2UuX19pdGVyYXRlVW5jYWNoZWQgPSBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdGUoZm4sIHJldmVyc2UpO1xuICAgIH1cbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgaXRlcmFibGUuX19pdGVyYXRlKChmdW5jdGlvbih2LCBrLCBjKSB7XG4gICAgICByZXR1cm4gcHJlZGljYXRlLmNhbGwoY29udGV4dCwgdiwgaywgYykgJiYgKytpdGVyYXRpb25zICYmIGZuKHYsIGssICRfXzApO1xuICAgIH0pKTtcbiAgICByZXR1cm4gaXRlcmF0aW9ucztcbiAgfTtcbiAgdGFrZVNlcXVlbmNlLl9faXRlcmF0b3JVbmNhY2hlZCA9IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgaWYgKHJldmVyc2UpIHtcbiAgICAgIHJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcih0eXBlLCByZXZlcnNlKTtcbiAgICB9XG4gICAgdmFyIGl0ZXJhdG9yID0gaXRlcmFibGUuX19pdGVyYXRvcihJVEVSQVRFX0VOVFJJRVMsIHJldmVyc2UpO1xuICAgIHZhciBpdGVyYXRpbmcgPSB0cnVlO1xuICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCFpdGVyYXRpbmcpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yRG9uZSgpO1xuICAgICAgfVxuICAgICAgdmFyIHN0ZXAgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICBpZiAoc3RlcC5kb25lKSB7XG4gICAgICAgIHJldHVybiBzdGVwO1xuICAgICAgfVxuICAgICAgdmFyIGVudHJ5ID0gc3RlcC52YWx1ZTtcbiAgICAgIHZhciBrID0gZW50cnlbMF07XG4gICAgICB2YXIgdiA9IGVudHJ5WzFdO1xuICAgICAgaWYgKCFwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2LCBrLCAkX18wKSkge1xuICAgICAgICBpdGVyYXRpbmcgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yRG9uZSgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHR5cGUgPT09IElURVJBVEVfRU5UUklFUyA/IHN0ZXAgOiBpdGVyYXRvclZhbHVlKHR5cGUsIGssIHYsIHN0ZXApO1xuICAgIH0pKTtcbiAgfTtcbiAgcmV0dXJuIHRha2VTZXF1ZW5jZTtcbn1cbmZ1bmN0aW9uIHNraXBGYWN0b3J5KGl0ZXJhYmxlLCBhbW91bnQsIHVzZUtleXMpIHtcbiAgaWYgKGFtb3VudCA8PSAwKSB7XG4gICAgcmV0dXJuIGl0ZXJhYmxlO1xuICB9XG4gIHZhciBza2lwU2VxdWVuY2UgPSBtYWtlU2VxdWVuY2UoaXRlcmFibGUpO1xuICBza2lwU2VxdWVuY2Uuc2l6ZSA9IGl0ZXJhYmxlLnNpemUgJiYgTWF0aC5tYXgoMCwgaXRlcmFibGUuc2l6ZSAtIGFtb3VudCk7XG4gIHNraXBTZXF1ZW5jZS5fX2l0ZXJhdGVVbmNhY2hlZCA9IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZShmbiwgcmV2ZXJzZSk7XG4gICAgfVxuICAgIHZhciBza2lwcGVkID0gMDtcbiAgICB2YXIgaXNTa2lwcGluZyA9IHRydWU7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIGl0ZXJhYmxlLl9faXRlcmF0ZSgoZnVuY3Rpb24odiwgaykge1xuICAgICAgaWYgKCEoaXNTa2lwcGluZyAmJiAoaXNTa2lwcGluZyA9IHNraXBwZWQrKyA8IGFtb3VudCkpKSB7XG4gICAgICAgIGl0ZXJhdGlvbnMrKztcbiAgICAgICAgcmV0dXJuIGZuKHYsIHVzZUtleXMgPyBrIDogaXRlcmF0aW9ucyAtIDEsICRfXzApO1xuICAgICAgfVxuICAgIH0pKTtcbiAgICByZXR1cm4gaXRlcmF0aW9ucztcbiAgfTtcbiAgc2tpcFNlcXVlbmNlLl9faXRlcmF0b3JVbmNhY2hlZCA9IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICAgIH1cbiAgICB2YXIgaXRlcmF0b3IgPSBhbW91bnQgJiYgaXRlcmFibGUuX19pdGVyYXRvcih0eXBlLCByZXZlcnNlKTtcbiAgICB2YXIgc2tpcHBlZCA9IDA7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgd2hpbGUgKHNraXBwZWQgPCBhbW91bnQpIHtcbiAgICAgICAgc2tpcHBlZCsrO1xuICAgICAgICBpdGVyYXRvci5uZXh0KCk7XG4gICAgICB9XG4gICAgICB2YXIgc3RlcCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgIGlmICh1c2VLZXlzIHx8IHR5cGUgPT09IElURVJBVEVfVkFMVUVTKSB7XG4gICAgICAgIHJldHVybiBzdGVwO1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSBJVEVSQVRFX0tFWVMpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yVmFsdWUodHlwZSwgaXRlcmF0aW9ucysrLCB1bmRlZmluZWQsIHN0ZXApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yVmFsdWUodHlwZSwgaXRlcmF0aW9ucysrLCBzdGVwLnZhbHVlWzFdLCBzdGVwKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gIH07XG4gIHJldHVybiBza2lwU2VxdWVuY2U7XG59XG5mdW5jdGlvbiBza2lwV2hpbGVGYWN0b3J5KGl0ZXJhYmxlLCBwcmVkaWNhdGUsIGNvbnRleHQsIHVzZUtleXMpIHtcbiAgdmFyIHNraXBTZXF1ZW5jZSA9IG1ha2VTZXF1ZW5jZShpdGVyYWJsZSk7XG4gIHNraXBTZXF1ZW5jZS5fX2l0ZXJhdGVVbmNhY2hlZCA9IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZShmbiwgcmV2ZXJzZSk7XG4gICAgfVxuICAgIHZhciBpc1NraXBwaW5nID0gdHJ1ZTtcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgaXRlcmFibGUuX19pdGVyYXRlKChmdW5jdGlvbih2LCBrLCBjKSB7XG4gICAgICBpZiAoIShpc1NraXBwaW5nICYmIChpc1NraXBwaW5nID0gcHJlZGljYXRlLmNhbGwoY29udGV4dCwgdiwgaywgYykpKSkge1xuICAgICAgICBpdGVyYXRpb25zKys7XG4gICAgICAgIHJldHVybiBmbih2LCB1c2VLZXlzID8gayA6IGl0ZXJhdGlvbnMgLSAxLCAkX18wKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gICAgcmV0dXJuIGl0ZXJhdGlvbnM7XG4gIH07XG4gIHNraXBTZXF1ZW5jZS5fX2l0ZXJhdG9yVW5jYWNoZWQgPSBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0b3IodHlwZSwgcmV2ZXJzZSk7XG4gICAgfVxuICAgIHZhciBpdGVyYXRvciA9IGl0ZXJhYmxlLl9faXRlcmF0b3IoSVRFUkFURV9FTlRSSUVTLCByZXZlcnNlKTtcbiAgICB2YXIgc2tpcHBpbmcgPSB0cnVlO1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzdGVwLFxuICAgICAgICAgIGssXG4gICAgICAgICAgdjtcbiAgICAgIGRvIHtcbiAgICAgICAgc3RlcCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgaWYgKHN0ZXAuZG9uZSkge1xuICAgICAgICAgIGlmICh1c2VLZXlzIHx8IHR5cGUgPT09IElURVJBVEVfVkFMVUVTKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RlcDtcbiAgICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09IElURVJBVEVfS0VZUykge1xuICAgICAgICAgICAgcmV0dXJuIGl0ZXJhdG9yVmFsdWUodHlwZSwgaXRlcmF0aW9ucysrLCB1bmRlZmluZWQsIHN0ZXApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gaXRlcmF0b3JWYWx1ZSh0eXBlLCBpdGVyYXRpb25zKyssIHN0ZXAudmFsdWVbMV0sIHN0ZXApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgZW50cnkgPSBzdGVwLnZhbHVlO1xuICAgICAgICBrID0gZW50cnlbMF07XG4gICAgICAgIHYgPSBlbnRyeVsxXTtcbiAgICAgICAgc2tpcHBpbmcgJiYgKHNraXBwaW5nID0gcHJlZGljYXRlLmNhbGwoY29udGV4dCwgdiwgaywgJF9fMCkpO1xuICAgICAgfSB3aGlsZSAoc2tpcHBpbmcpO1xuICAgICAgcmV0dXJuIHR5cGUgPT09IElURVJBVEVfRU5UUklFUyA/IHN0ZXAgOiBpdGVyYXRvclZhbHVlKHR5cGUsIGssIHYsIHN0ZXApO1xuICAgIH0pKTtcbiAgfTtcbiAgcmV0dXJuIHNraXBTZXF1ZW5jZTtcbn1cbmZ1bmN0aW9uIGNvbmNhdEZhY3RvcnkoaXRlcmFibGUsIHZhbHVlcywgdXNlS2V5cykge1xuICB2YXIgaXNLZXllZEl0ZXIgPSBpc0tleWVkKGl0ZXJhYmxlKTtcbiAgdmFyIGl0ZXJzID0gbmV3IEFycmF5U2VxKFtpdGVyYWJsZV0uY29uY2F0KHZhbHVlcykpLm1hcCgoZnVuY3Rpb24odikge1xuICAgIGlmICghaXNJdGVyYWJsZSh2KSkge1xuICAgICAgdiA9IHNlcUZyb21WYWx1ZSh2LCB0cnVlKTtcbiAgICB9XG4gICAgaWYgKGlzS2V5ZWRJdGVyKSB7XG4gICAgICB2ID0gS2V5ZWRJdGVyYWJsZSh2KTtcbiAgICB9XG4gICAgcmV0dXJuIHY7XG4gIH0pKTtcbiAgaWYgKGlzS2V5ZWRJdGVyKSB7XG4gICAgaXRlcnMgPSBpdGVycy50b0tleWVkU2VxKCk7XG4gIH0gZWxzZSBpZiAoIWlzSW5kZXhlZChpdGVyYWJsZSkpIHtcbiAgICBpdGVycyA9IGl0ZXJzLnRvU2V0U2VxKCk7XG4gIH1cbiAgdmFyIGZsYXQgPSBpdGVycy5mbGF0dGVuKHRydWUpO1xuICBmbGF0LnNpemUgPSBpdGVycy5yZWR1Y2UoKGZ1bmN0aW9uKHN1bSwgc2VxKSB7XG4gICAgaWYgKHN1bSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB2YXIgc2l6ZSA9IHNlcS5zaXplO1xuICAgICAgaWYgKHNpemUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gc3VtICsgc2l6ZTtcbiAgICAgIH1cbiAgICB9XG4gIH0pLCAwKTtcbiAgcmV0dXJuIGZsYXQ7XG59XG5mdW5jdGlvbiBmbGF0dGVuRmFjdG9yeShpdGVyYWJsZSwgZGVwdGgsIHVzZUtleXMpIHtcbiAgdmFyIGZsYXRTZXF1ZW5jZSA9IG1ha2VTZXF1ZW5jZShpdGVyYWJsZSk7XG4gIGZsYXRTZXF1ZW5jZS5fX2l0ZXJhdGVVbmNhY2hlZCA9IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIHZhciBzdG9wcGVkID0gZmFsc2U7XG4gICAgZnVuY3Rpb24gZmxhdERlZXAoaXRlciwgY3VycmVudERlcHRoKSB7XG4gICAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgICBpdGVyLl9faXRlcmF0ZSgoZnVuY3Rpb24odiwgaykge1xuICAgICAgICBpZiAoKCFkZXB0aCB8fCBjdXJyZW50RGVwdGggPCBkZXB0aCkgJiYgaXNJdGVyYWJsZSh2KSkge1xuICAgICAgICAgIGZsYXREZWVwKHYsIGN1cnJlbnREZXB0aCArIDEpO1xuICAgICAgICB9IGVsc2UgaWYgKGZuKHYsIHVzZUtleXMgPyBrIDogaXRlcmF0aW9ucysrLCAkX18wKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBzdG9wcGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gIXN0b3BwZWQ7XG4gICAgICB9KSwgcmV2ZXJzZSk7XG4gICAgfVxuICAgIGZsYXREZWVwKGl0ZXJhYmxlLCAwKTtcbiAgICByZXR1cm4gaXRlcmF0aW9ucztcbiAgfTtcbiAgZmxhdFNlcXVlbmNlLl9faXRlcmF0b3JVbmNhY2hlZCA9IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICB2YXIgaXRlcmF0b3IgPSBpdGVyYWJsZS5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICAgIHZhciBzdGFjayA9IFtdO1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgIHdoaWxlIChpdGVyYXRvcikge1xuICAgICAgICB2YXIgc3RlcCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgaWYgKHN0ZXAuZG9uZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICBpdGVyYXRvciA9IHN0YWNrLnBvcCgpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHZhciB2ID0gc3RlcC52YWx1ZTtcbiAgICAgICAgaWYgKHR5cGUgPT09IElURVJBVEVfRU5UUklFUykge1xuICAgICAgICAgIHYgPSB2WzFdO1xuICAgICAgICB9XG4gICAgICAgIGlmICgoIWRlcHRoIHx8IHN0YWNrLmxlbmd0aCA8IGRlcHRoKSAmJiBpc0l0ZXJhYmxlKHYpKSB7XG4gICAgICAgICAgc3RhY2sucHVzaChpdGVyYXRvcik7XG4gICAgICAgICAgaXRlcmF0b3IgPSB2Ll9faXRlcmF0b3IodHlwZSwgcmV2ZXJzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHVzZUtleXMgPyBzdGVwIDogaXRlcmF0b3JWYWx1ZSh0eXBlLCBpdGVyYXRpb25zKyssIHYsIHN0ZXApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaXRlcmF0b3JEb25lKCk7XG4gICAgfSkpO1xuICB9O1xuICByZXR1cm4gZmxhdFNlcXVlbmNlO1xufVxuZnVuY3Rpb24gZmxhdE1hcEZhY3RvcnkoaXRlcmFibGUsIG1hcHBlciwgY29udGV4dCkge1xuICB2YXIgY29lcmNlID0gaXRlcmFibGVDbGFzcyhpdGVyYWJsZSk7XG4gIHJldHVybiBpdGVyYWJsZS50b1NlcSgpLm1hcCgoZnVuY3Rpb24odiwgaykge1xuICAgIHJldHVybiBjb2VyY2UobWFwcGVyLmNhbGwoY29udGV4dCwgdiwgaywgaXRlcmFibGUpKTtcbiAgfSkpLmZsYXR0ZW4odHJ1ZSk7XG59XG5mdW5jdGlvbiBpbnRlcnBvc2VGYWN0b3J5KGl0ZXJhYmxlLCBzZXBhcmF0b3IpIHtcbiAgdmFyIGludGVycG9zZWRTZXF1ZW5jZSA9IG1ha2VTZXF1ZW5jZShpdGVyYWJsZSk7XG4gIGludGVycG9zZWRTZXF1ZW5jZS5zaXplID0gaXRlcmFibGUuc2l6ZSAmJiBpdGVyYWJsZS5zaXplICogMiAtIDE7XG4gIGludGVycG9zZWRTZXF1ZW5jZS5fX2l0ZXJhdGVVbmNhY2hlZCA9IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICBpdGVyYWJsZS5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYsIGspIHtcbiAgICAgIHJldHVybiAoIWl0ZXJhdGlvbnMgfHwgZm4oc2VwYXJhdG9yLCBpdGVyYXRpb25zKyssICRfXzApICE9PSBmYWxzZSkgJiYgZm4odiwgaXRlcmF0aW9ucysrLCAkX18wKSAhPT0gZmFsc2U7XG4gICAgfSksIHJldmVyc2UpO1xuICAgIHJldHVybiBpdGVyYXRpb25zO1xuICB9O1xuICBpbnRlcnBvc2VkU2VxdWVuY2UuX19pdGVyYXRvclVuY2FjaGVkID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHZhciBpdGVyYXRvciA9IGl0ZXJhYmxlLl9faXRlcmF0b3IoSVRFUkFURV9WQUxVRVMsIHJldmVyc2UpO1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICB2YXIgc3RlcDtcbiAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgIGlmICghc3RlcCB8fCBpdGVyYXRpb25zICUgMikge1xuICAgICAgICBzdGVwID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICBpZiAoc3RlcC5kb25lKSB7XG4gICAgICAgICAgcmV0dXJuIHN0ZXA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBpdGVyYXRpb25zICUgMiA/IGl0ZXJhdG9yVmFsdWUodHlwZSwgaXRlcmF0aW9ucysrLCBzZXBhcmF0b3IpIDogaXRlcmF0b3JWYWx1ZSh0eXBlLCBpdGVyYXRpb25zKyssIHN0ZXAudmFsdWUsIHN0ZXApO1xuICAgIH0pKTtcbiAgfTtcbiAgcmV0dXJuIGludGVycG9zZWRTZXF1ZW5jZTtcbn1cbmZ1bmN0aW9uIHJlaWZ5KGl0ZXIsIHNlcSkge1xuICByZXR1cm4gaXNTZXEoaXRlcikgPyBzZXEgOiBpdGVyLmNvbnN0cnVjdG9yKHNlcSk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZUVudHJ5KGVudHJ5KSB7XG4gIGlmIChlbnRyeSAhPT0gT2JqZWN0KGVudHJ5KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIFtLLCBWXSB0dXBsZTogJyArIGVudHJ5KTtcbiAgfVxufVxuZnVuY3Rpb24gcmVzb2x2ZVNpemUoaXRlcikge1xuICBhc3NlcnROb3RJbmZpbml0ZShpdGVyLnNpemUpO1xuICByZXR1cm4gZW5zdXJlU2l6ZShpdGVyKTtcbn1cbmZ1bmN0aW9uIGl0ZXJhYmxlQ2xhc3MoaXRlcmFibGUpIHtcbiAgcmV0dXJuIGlzS2V5ZWQoaXRlcmFibGUpID8gS2V5ZWRJdGVyYWJsZSA6IGlzSW5kZXhlZChpdGVyYWJsZSkgPyBJbmRleGVkSXRlcmFibGUgOiBTZXRJdGVyYWJsZTtcbn1cbmZ1bmN0aW9uIG1ha2VTZXF1ZW5jZShpdGVyYWJsZSkge1xuICByZXR1cm4gT2JqZWN0LmNyZWF0ZSgoaXNLZXllZChpdGVyYWJsZSkgPyBLZXllZFNlcSA6IGlzSW5kZXhlZChpdGVyYWJsZSkgPyBJbmRleGVkU2VxIDogU2V0U2VxKS5wcm90b3R5cGUpO1xufVxuZnVuY3Rpb24gY2FjaGVSZXN1bHRUaHJvdWdoKCkge1xuICBpZiAodGhpcy5faXRlci5jYWNoZVJlc3VsdCkge1xuICAgIHRoaXMuX2l0ZXIuY2FjaGVSZXN1bHQoKTtcbiAgICB0aGlzLnNpemUgPSB0aGlzLl9pdGVyLnNpemU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFNlcS5wcm90b3R5cGUuY2FjaGVSZXN1bHQuY2FsbCh0aGlzKTtcbiAgfVxufVxudmFyIExpc3QgPSBmdW5jdGlvbiBMaXN0KHZhbHVlKSB7XG4gIHZhciBlbXB0eSA9IGVtcHR5TGlzdCgpO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBlbXB0eTtcbiAgfVxuICBpZiAodmFsdWUgJiYgdmFsdWUuY29uc3RydWN0b3IgPT09ICRMaXN0KSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIHZhbHVlID0gSXRlcmFibGUodmFsdWUpO1xuICB2YXIgc2l6ZSA9IHZhbHVlLnNpemU7XG4gIGlmIChzaXplID09PSAwKSB7XG4gICAgcmV0dXJuIGVtcHR5O1xuICB9XG4gIGlmIChzaXplID4gMCAmJiBzaXplIDwgU0laRSkge1xuICAgIHJldHVybiBtYWtlTGlzdCgwLCBzaXplLCBTSElGVCwgbnVsbCwgbmV3IFZOb2RlKHZhbHVlLnRvQXJyYXkoKSkpO1xuICB9XG4gIHJldHVybiBlbXB0eS5tZXJnZSh2YWx1ZSk7XG59O1xudmFyICRMaXN0ID0gTGlzdDtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKExpc3QsIHtcbiAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9fdG9TdHJpbmcoJ0xpc3QgWycsICddJyk7XG4gIH0sXG4gIGdldDogZnVuY3Rpb24oaW5kZXgsIG5vdFNldFZhbHVlKSB7XG4gICAgaW5kZXggPSB3cmFwSW5kZXgodGhpcywgaW5kZXgpO1xuICAgIGlmIChpbmRleCA8IDAgfHwgaW5kZXggPj0gdGhpcy5zaXplKSB7XG4gICAgICByZXR1cm4gbm90U2V0VmFsdWU7XG4gICAgfVxuICAgIGluZGV4ICs9IHRoaXMuX29yaWdpbjtcbiAgICB2YXIgbm9kZSA9IGxpc3ROb2RlRm9yKHRoaXMsIGluZGV4KTtcbiAgICByZXR1cm4gbm9kZSAmJiBub2RlLmFycmF5W2luZGV4ICYgTUFTS107XG4gIH0sXG4gIHNldDogZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG4gICAgcmV0dXJuIHVwZGF0ZUxpc3QodGhpcywgaW5kZXgsIHZhbHVlKTtcbiAgfSxcbiAgcmVtb3ZlOiBmdW5jdGlvbihpbmRleCkge1xuICAgIHJldHVybiAhdGhpcy5oYXMoaW5kZXgpID8gdGhpcyA6IGluZGV4ID09PSAwID8gdGhpcy5zaGlmdCgpIDogaW5kZXggPT09IHRoaXMuc2l6ZSAtIDEgPyB0aGlzLnBvcCgpIDogdGhpcy5zcGxpY2UoaW5kZXgsIDEpO1xuICB9LFxuICBjbGVhcjogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuc2l6ZSA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGlmICh0aGlzLl9fb3duZXJJRCkge1xuICAgICAgdGhpcy5zaXplID0gdGhpcy5fb3JpZ2luID0gdGhpcy5fY2FwYWNpdHkgPSAwO1xuICAgICAgdGhpcy5fbGV2ZWwgPSBTSElGVDtcbiAgICAgIHRoaXMuX3Jvb3QgPSB0aGlzLl90YWlsID0gbnVsbDtcbiAgICAgIHRoaXMuX19oYXNoID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5fX2FsdGVyZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBlbXB0eUxpc3QoKTtcbiAgfSxcbiAgcHVzaDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZhbHVlcyA9IGFyZ3VtZW50cztcbiAgICB2YXIgb2xkU2l6ZSA9IHRoaXMuc2l6ZTtcbiAgICByZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKChmdW5jdGlvbihsaXN0KSB7XG4gICAgICBzZXRMaXN0Qm91bmRzKGxpc3QsIDAsIG9sZFNpemUgKyB2YWx1ZXMubGVuZ3RoKTtcbiAgICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCB2YWx1ZXMubGVuZ3RoOyBpaSsrKSB7XG4gICAgICAgIGxpc3Quc2V0KG9sZFNpemUgKyBpaSwgdmFsdWVzW2lpXSk7XG4gICAgICB9XG4gICAgfSkpO1xuICB9LFxuICBwb3A6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzZXRMaXN0Qm91bmRzKHRoaXMsIDAsIC0xKTtcbiAgfSxcbiAgdW5zaGlmdDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZhbHVlcyA9IGFyZ3VtZW50cztcbiAgICByZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKChmdW5jdGlvbihsaXN0KSB7XG4gICAgICBzZXRMaXN0Qm91bmRzKGxpc3QsIC12YWx1ZXMubGVuZ3RoKTtcbiAgICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCB2YWx1ZXMubGVuZ3RoOyBpaSsrKSB7XG4gICAgICAgIGxpc3Quc2V0KGlpLCB2YWx1ZXNbaWldKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gIH0sXG4gIHNoaWZ0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gc2V0TGlzdEJvdW5kcyh0aGlzLCAxKTtcbiAgfSxcbiAgbWVyZ2U6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBtZXJnZUludG9MaXN0V2l0aCh0aGlzLCB1bmRlZmluZWQsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIG1lcmdlV2l0aDogZnVuY3Rpb24obWVyZ2VyKSB7XG4gICAgZm9yICh2YXIgaXRlcnMgPSBbXSxcbiAgICAgICAgJF9fNiA9IDE7ICRfXzYgPCBhcmd1bWVudHMubGVuZ3RoOyAkX182KyspXG4gICAgICBpdGVyc1skX182IC0gMV0gPSBhcmd1bWVudHNbJF9fNl07XG4gICAgcmV0dXJuIG1lcmdlSW50b0xpc3RXaXRoKHRoaXMsIG1lcmdlciwgaXRlcnMpO1xuICB9LFxuICBtZXJnZURlZXA6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBtZXJnZUludG9MaXN0V2l0aCh0aGlzLCBkZWVwTWVyZ2VyKHVuZGVmaW5lZCksIGFyZ3VtZW50cyk7XG4gIH0sXG4gIG1lcmdlRGVlcFdpdGg6IGZ1bmN0aW9uKG1lcmdlcikge1xuICAgIGZvciAodmFyIGl0ZXJzID0gW10sXG4gICAgICAgICRfXzcgPSAxOyAkX183IDwgYXJndW1lbnRzLmxlbmd0aDsgJF9fNysrKVxuICAgICAgaXRlcnNbJF9fNyAtIDFdID0gYXJndW1lbnRzWyRfXzddO1xuICAgIHJldHVybiBtZXJnZUludG9MaXN0V2l0aCh0aGlzLCBkZWVwTWVyZ2VyKG1lcmdlciksIGl0ZXJzKTtcbiAgfSxcbiAgc2V0U2l6ZTogZnVuY3Rpb24oc2l6ZSkge1xuICAgIHJldHVybiBzZXRMaXN0Qm91bmRzKHRoaXMsIDAsIHNpemUpO1xuICB9LFxuICBzbGljZTogZnVuY3Rpb24oYmVnaW4sIGVuZCkge1xuICAgIHZhciBzaXplID0gdGhpcy5zaXplO1xuICAgIGlmICh3aG9sZVNsaWNlKGJlZ2luLCBlbmQsIHNpemUpKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIHNldExpc3RCb3VuZHModGhpcywgcmVzb2x2ZUJlZ2luKGJlZ2luLCBzaXplKSwgcmVzb2x2ZUVuZChlbmQsIHNpemUpKTtcbiAgfSxcbiAgX19pdGVyYXRvcjogZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHJldHVybiBuZXcgTGlzdEl0ZXJhdG9yKHRoaXMsIHR5cGUsIHJldmVyc2UpO1xuICB9LFxuICBfX2l0ZXJhdGU6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICB2YXIgZWFjaEZuID0gKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHJldHVybiBmbih2LCBpdGVyYXRpb25zKyssICRfXzApO1xuICAgIH0pO1xuICAgIHZhciB0YWlsT2Zmc2V0ID0gZ2V0VGFpbE9mZnNldCh0aGlzLl9jYXBhY2l0eSk7XG4gICAgaWYgKHJldmVyc2UpIHtcbiAgICAgIGl0ZXJhdGVWTm9kZSh0aGlzLl90YWlsLCAwLCB0YWlsT2Zmc2V0IC0gdGhpcy5fb3JpZ2luLCB0aGlzLl9jYXBhY2l0eSAtIHRoaXMuX29yaWdpbiwgZWFjaEZuLCByZXZlcnNlKSAmJiBpdGVyYXRlVk5vZGUodGhpcy5fcm9vdCwgdGhpcy5fbGV2ZWwsIC10aGlzLl9vcmlnaW4sIHRhaWxPZmZzZXQgLSB0aGlzLl9vcmlnaW4sIGVhY2hGbiwgcmV2ZXJzZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGl0ZXJhdGVWTm9kZSh0aGlzLl9yb290LCB0aGlzLl9sZXZlbCwgLXRoaXMuX29yaWdpbiwgdGFpbE9mZnNldCAtIHRoaXMuX29yaWdpbiwgZWFjaEZuLCByZXZlcnNlKSAmJiBpdGVyYXRlVk5vZGUodGhpcy5fdGFpbCwgMCwgdGFpbE9mZnNldCAtIHRoaXMuX29yaWdpbiwgdGhpcy5fY2FwYWNpdHkgLSB0aGlzLl9vcmlnaW4sIGVhY2hGbiwgcmV2ZXJzZSk7XG4gICAgfVxuICAgIHJldHVybiBpdGVyYXRpb25zO1xuICB9LFxuICBfX2Vuc3VyZU93bmVyOiBmdW5jdGlvbihvd25lcklEKSB7XG4gICAgaWYgKG93bmVySUQgPT09IHRoaXMuX19vd25lcklEKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgaWYgKCFvd25lcklEKSB7XG4gICAgICB0aGlzLl9fb3duZXJJRCA9IG93bmVySUQ7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIG1ha2VMaXN0KHRoaXMuX29yaWdpbiwgdGhpcy5fY2FwYWNpdHksIHRoaXMuX2xldmVsLCB0aGlzLl9yb290LCB0aGlzLl90YWlsLCBvd25lcklELCB0aGlzLl9faGFzaCk7XG4gIH1cbn0sIHtvZjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMoYXJndW1lbnRzKTtcbiAgfX0sIEluZGV4ZWRDb2xsZWN0aW9uKTtcbmZ1bmN0aW9uIGlzTGlzdChtYXliZUxpc3QpIHtcbiAgcmV0dXJuICEhKG1heWJlTGlzdCAmJiBtYXliZUxpc3RbSVNfTElTVF9TRU5USU5FTF0pO1xufVxuTGlzdC5pc0xpc3QgPSBpc0xpc3Q7XG52YXIgSVNfTElTVF9TRU5USU5FTCA9ICdAQF9fSU1NVVRBQkxFX0xJU1RfX0BAJztcbnZhciBMaXN0UHJvdG90eXBlID0gTGlzdC5wcm90b3R5cGU7XG5MaXN0UHJvdG90eXBlW0lTX0xJU1RfU0VOVElORUxdID0gdHJ1ZTtcbkxpc3RQcm90b3R5cGVbREVMRVRFXSA9IExpc3RQcm90b3R5cGUucmVtb3ZlO1xuTGlzdFByb3RvdHlwZS5zZXRJbiA9IE1hcFByb3RvdHlwZS5zZXRJbjtcbkxpc3RQcm90b3R5cGUucmVtb3ZlSW4gPSBNYXBQcm90b3R5cGUucmVtb3ZlSW47XG5MaXN0UHJvdG90eXBlLnVwZGF0ZSA9IE1hcFByb3RvdHlwZS51cGRhdGU7XG5MaXN0UHJvdG90eXBlLnVwZGF0ZUluID0gTWFwUHJvdG90eXBlLnVwZGF0ZUluO1xuTGlzdFByb3RvdHlwZS53aXRoTXV0YXRpb25zID0gTWFwUHJvdG90eXBlLndpdGhNdXRhdGlvbnM7XG5MaXN0UHJvdG90eXBlLmFzTXV0YWJsZSA9IE1hcFByb3RvdHlwZS5hc011dGFibGU7XG5MaXN0UHJvdG90eXBlLmFzSW1tdXRhYmxlID0gTWFwUHJvdG90eXBlLmFzSW1tdXRhYmxlO1xuTGlzdFByb3RvdHlwZS53YXNBbHRlcmVkID0gTWFwUHJvdG90eXBlLndhc0FsdGVyZWQ7XG52YXIgVk5vZGUgPSBmdW5jdGlvbiBWTm9kZShhcnJheSwgb3duZXJJRCkge1xuICB0aGlzLmFycmF5ID0gYXJyYXk7XG4gIHRoaXMub3duZXJJRCA9IG93bmVySUQ7XG59O1xudmFyICRWTm9kZSA9IFZOb2RlO1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoVk5vZGUsIHtcbiAgcmVtb3ZlQmVmb3JlOiBmdW5jdGlvbihvd25lcklELCBsZXZlbCwgaW5kZXgpIHtcbiAgICBpZiAoaW5kZXggPT09IGxldmVsID8gMSA8PCBsZXZlbCA6IDAgfHwgdGhpcy5hcnJheS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgb3JpZ2luSW5kZXggPSAoaW5kZXggPj4+IGxldmVsKSAmIE1BU0s7XG4gICAgaWYgKG9yaWdpbkluZGV4ID49IHRoaXMuYXJyYXkubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gbmV3ICRWTm9kZShbXSwgb3duZXJJRCk7XG4gICAgfVxuICAgIHZhciByZW1vdmluZ0ZpcnN0ID0gb3JpZ2luSW5kZXggPT09IDA7XG4gICAgdmFyIG5ld0NoaWxkO1xuICAgIGlmIChsZXZlbCA+IDApIHtcbiAgICAgIHZhciBvbGRDaGlsZCA9IHRoaXMuYXJyYXlbb3JpZ2luSW5kZXhdO1xuICAgICAgbmV3Q2hpbGQgPSBvbGRDaGlsZCAmJiBvbGRDaGlsZC5yZW1vdmVCZWZvcmUob3duZXJJRCwgbGV2ZWwgLSBTSElGVCwgaW5kZXgpO1xuICAgICAgaWYgKG5ld0NoaWxkID09PSBvbGRDaGlsZCAmJiByZW1vdmluZ0ZpcnN0KSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAocmVtb3ZpbmdGaXJzdCAmJiAhbmV3Q2hpbGQpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgZWRpdGFibGUgPSBlZGl0YWJsZVZOb2RlKHRoaXMsIG93bmVySUQpO1xuICAgIGlmICghcmVtb3ZpbmdGaXJzdCkge1xuICAgICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IG9yaWdpbkluZGV4OyBpaSsrKSB7XG4gICAgICAgIGVkaXRhYmxlLmFycmF5W2lpXSA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG5ld0NoaWxkKSB7XG4gICAgICBlZGl0YWJsZS5hcnJheVtvcmlnaW5JbmRleF0gPSBuZXdDaGlsZDtcbiAgICB9XG4gICAgcmV0dXJuIGVkaXRhYmxlO1xuICB9LFxuICByZW1vdmVBZnRlcjogZnVuY3Rpb24ob3duZXJJRCwgbGV2ZWwsIGluZGV4KSB7XG4gICAgaWYgKGluZGV4ID09PSBsZXZlbCA/IDEgPDwgbGV2ZWwgOiAwIHx8IHRoaXMuYXJyYXkubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdmFyIHNpemVJbmRleCA9ICgoaW5kZXggLSAxKSA+Pj4gbGV2ZWwpICYgTUFTSztcbiAgICBpZiAoc2l6ZUluZGV4ID49IHRoaXMuYXJyYXkubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdmFyIHJlbW92aW5nTGFzdCA9IHNpemVJbmRleCA9PT0gdGhpcy5hcnJheS5sZW5ndGggLSAxO1xuICAgIHZhciBuZXdDaGlsZDtcbiAgICBpZiAobGV2ZWwgPiAwKSB7XG4gICAgICB2YXIgb2xkQ2hpbGQgPSB0aGlzLmFycmF5W3NpemVJbmRleF07XG4gICAgICBuZXdDaGlsZCA9IG9sZENoaWxkICYmIG9sZENoaWxkLnJlbW92ZUFmdGVyKG93bmVySUQsIGxldmVsIC0gU0hJRlQsIGluZGV4KTtcbiAgICAgIGlmIChuZXdDaGlsZCA9PT0gb2xkQ2hpbGQgJiYgcmVtb3ZpbmdMYXN0KSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAocmVtb3ZpbmdMYXN0ICYmICFuZXdDaGlsZCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciBlZGl0YWJsZSA9IGVkaXRhYmxlVk5vZGUodGhpcywgb3duZXJJRCk7XG4gICAgaWYgKCFyZW1vdmluZ0xhc3QpIHtcbiAgICAgIGVkaXRhYmxlLmFycmF5LnBvcCgpO1xuICAgIH1cbiAgICBpZiAobmV3Q2hpbGQpIHtcbiAgICAgIGVkaXRhYmxlLmFycmF5W3NpemVJbmRleF0gPSBuZXdDaGlsZDtcbiAgICB9XG4gICAgcmV0dXJuIGVkaXRhYmxlO1xuICB9XG59LCB7fSk7XG5mdW5jdGlvbiBpdGVyYXRlVk5vZGUobm9kZSwgbGV2ZWwsIG9mZnNldCwgbWF4LCBmbiwgcmV2ZXJzZSkge1xuICB2YXIgaWk7XG4gIHZhciBhcnJheSA9IG5vZGUgJiYgbm9kZS5hcnJheTtcbiAgaWYgKGxldmVsID09PSAwKSB7XG4gICAgdmFyIGZyb20gPSBvZmZzZXQgPCAwID8gLW9mZnNldCA6IDA7XG4gICAgdmFyIHRvID0gbWF4IC0gb2Zmc2V0O1xuICAgIGlmICh0byA+IFNJWkUpIHtcbiAgICAgIHRvID0gU0laRTtcbiAgICB9XG4gICAgZm9yIChpaSA9IGZyb207IGlpIDwgdG87IGlpKyspIHtcbiAgICAgIGlmIChmbihhcnJheSAmJiBhcnJheVtyZXZlcnNlID8gZnJvbSArIHRvIC0gMSAtIGlpIDogaWldKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgc3RlcCA9IDEgPDwgbGV2ZWw7XG4gICAgdmFyIG5ld0xldmVsID0gbGV2ZWwgLSBTSElGVDtcbiAgICBmb3IgKGlpID0gMDsgaWkgPD0gTUFTSzsgaWkrKykge1xuICAgICAgdmFyIGxldmVsSW5kZXggPSByZXZlcnNlID8gTUFTSyAtIGlpIDogaWk7XG4gICAgICB2YXIgbmV3T2Zmc2V0ID0gb2Zmc2V0ICsgKGxldmVsSW5kZXggPDwgbGV2ZWwpO1xuICAgICAgaWYgKG5ld09mZnNldCA8IG1heCAmJiBuZXdPZmZzZXQgKyBzdGVwID4gMCkge1xuICAgICAgICB2YXIgbmV4dE5vZGUgPSBhcnJheSAmJiBhcnJheVtsZXZlbEluZGV4XTtcbiAgICAgICAgaWYgKCFpdGVyYXRlVk5vZGUobmV4dE5vZGUsIG5ld0xldmVsLCBuZXdPZmZzZXQsIG1heCwgZm4sIHJldmVyc2UpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufVxudmFyIExpc3RJdGVyYXRvciA9IGZ1bmN0aW9uIExpc3RJdGVyYXRvcihsaXN0LCB0eXBlLCByZXZlcnNlKSB7XG4gIHRoaXMuX3R5cGUgPSB0eXBlO1xuICB0aGlzLl9yZXZlcnNlID0gISFyZXZlcnNlO1xuICB0aGlzLl9tYXhJbmRleCA9IGxpc3Quc2l6ZSAtIDE7XG4gIHZhciB0YWlsT2Zmc2V0ID0gZ2V0VGFpbE9mZnNldChsaXN0Ll9jYXBhY2l0eSk7XG4gIHZhciByb290U3RhY2sgPSBsaXN0SXRlcmF0b3JGcmFtZShsaXN0Ll9yb290ICYmIGxpc3QuX3Jvb3QuYXJyYXksIGxpc3QuX2xldmVsLCAtbGlzdC5fb3JpZ2luLCB0YWlsT2Zmc2V0IC0gbGlzdC5fb3JpZ2luIC0gMSk7XG4gIHZhciB0YWlsU3RhY2sgPSBsaXN0SXRlcmF0b3JGcmFtZShsaXN0Ll90YWlsICYmIGxpc3QuX3RhaWwuYXJyYXksIDAsIHRhaWxPZmZzZXQgLSBsaXN0Ll9vcmlnaW4sIGxpc3QuX2NhcGFjaXR5IC0gbGlzdC5fb3JpZ2luIC0gMSk7XG4gIHRoaXMuX3N0YWNrID0gcmV2ZXJzZSA/IHRhaWxTdGFjayA6IHJvb3RTdGFjaztcbiAgdGhpcy5fc3RhY2suX19wcmV2ID0gcmV2ZXJzZSA/IHJvb3RTdGFjayA6IHRhaWxTdGFjaztcbn07XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShMaXN0SXRlcmF0b3IsIHtuZXh0OiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc3RhY2sgPSB0aGlzLl9zdGFjaztcbiAgICB3aGlsZSAoc3RhY2spIHtcbiAgICAgIHZhciBhcnJheSA9IHN0YWNrLmFycmF5O1xuICAgICAgdmFyIHJhd0luZGV4ID0gc3RhY2suaW5kZXgrKztcbiAgICAgIGlmICh0aGlzLl9yZXZlcnNlKSB7XG4gICAgICAgIHJhd0luZGV4ID0gTUFTSyAtIHJhd0luZGV4O1xuICAgICAgICBpZiAocmF3SW5kZXggPiBzdGFjay5yYXdNYXgpIHtcbiAgICAgICAgICByYXdJbmRleCA9IHN0YWNrLnJhd01heDtcbiAgICAgICAgICBzdGFjay5pbmRleCA9IFNJWkUgLSByYXdJbmRleDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHJhd0luZGV4ID49IDAgJiYgcmF3SW5kZXggPCBTSVpFICYmIHJhd0luZGV4IDw9IHN0YWNrLnJhd01heCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBhcnJheSAmJiBhcnJheVtyYXdJbmRleF07XG4gICAgICAgIGlmIChzdGFjay5sZXZlbCA9PT0gMCkge1xuICAgICAgICAgIHZhciB0eXBlID0gdGhpcy5fdHlwZTtcbiAgICAgICAgICB2YXIgaW5kZXg7XG4gICAgICAgICAgaWYgKHR5cGUgIT09IDEpIHtcbiAgICAgICAgICAgIGluZGV4ID0gc3RhY2sub2Zmc2V0ICsgKHJhd0luZGV4IDw8IHN0YWNrLmxldmVsKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9yZXZlcnNlKSB7XG4gICAgICAgICAgICAgIGluZGV4ID0gdGhpcy5fbWF4SW5kZXggLSBpbmRleDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGl0ZXJhdG9yVmFsdWUodHlwZSwgaW5kZXgsIHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9zdGFjayA9IHN0YWNrID0gbGlzdEl0ZXJhdG9yRnJhbWUodmFsdWUgJiYgdmFsdWUuYXJyYXksIHN0YWNrLmxldmVsIC0gU0hJRlQsIHN0YWNrLm9mZnNldCArIChyYXdJbmRleCA8PCBzdGFjay5sZXZlbCksIHN0YWNrLm1heCwgc3RhY2spO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgc3RhY2sgPSB0aGlzLl9zdGFjayA9IHRoaXMuX3N0YWNrLl9fcHJldjtcbiAgICB9XG4gICAgcmV0dXJuIGl0ZXJhdG9yRG9uZSgpO1xuICB9fSwge30sIEl0ZXJhdG9yKTtcbmZ1bmN0aW9uIGxpc3RJdGVyYXRvckZyYW1lKGFycmF5LCBsZXZlbCwgb2Zmc2V0LCBtYXgsIHByZXZGcmFtZSkge1xuICByZXR1cm4ge1xuICAgIGFycmF5OiBhcnJheSxcbiAgICBsZXZlbDogbGV2ZWwsXG4gICAgb2Zmc2V0OiBvZmZzZXQsXG4gICAgbWF4OiBtYXgsXG4gICAgcmF3TWF4OiAoKG1heCAtIG9mZnNldCkgPj4gbGV2ZWwpLFxuICAgIGluZGV4OiAwLFxuICAgIF9fcHJldjogcHJldkZyYW1lXG4gIH07XG59XG5mdW5jdGlvbiBtYWtlTGlzdChvcmlnaW4sIGNhcGFjaXR5LCBsZXZlbCwgcm9vdCwgdGFpbCwgb3duZXJJRCwgaGFzaCkge1xuICB2YXIgbGlzdCA9IE9iamVjdC5jcmVhdGUoTGlzdFByb3RvdHlwZSk7XG4gIGxpc3Quc2l6ZSA9IGNhcGFjaXR5IC0gb3JpZ2luO1xuICBsaXN0Ll9vcmlnaW4gPSBvcmlnaW47XG4gIGxpc3QuX2NhcGFjaXR5ID0gY2FwYWNpdHk7XG4gIGxpc3QuX2xldmVsID0gbGV2ZWw7XG4gIGxpc3QuX3Jvb3QgPSByb290O1xuICBsaXN0Ll90YWlsID0gdGFpbDtcbiAgbGlzdC5fX293bmVySUQgPSBvd25lcklEO1xuICBsaXN0Ll9faGFzaCA9IGhhc2g7XG4gIGxpc3QuX19hbHRlcmVkID0gZmFsc2U7XG4gIHJldHVybiBsaXN0O1xufVxudmFyIEVNUFRZX0xJU1Q7XG5mdW5jdGlvbiBlbXB0eUxpc3QoKSB7XG4gIHJldHVybiBFTVBUWV9MSVNUIHx8IChFTVBUWV9MSVNUID0gbWFrZUxpc3QoMCwgMCwgU0hJRlQpKTtcbn1cbmZ1bmN0aW9uIHVwZGF0ZUxpc3QobGlzdCwgaW5kZXgsIHZhbHVlKSB7XG4gIGluZGV4ID0gd3JhcEluZGV4KGxpc3QsIGluZGV4KTtcbiAgaWYgKGluZGV4ID49IGxpc3Quc2l6ZSB8fCBpbmRleCA8IDApIHtcbiAgICByZXR1cm4gbGlzdC53aXRoTXV0YXRpb25zKChmdW5jdGlvbihsaXN0KSB7XG4gICAgICBpbmRleCA8IDAgPyBzZXRMaXN0Qm91bmRzKGxpc3QsIGluZGV4KS5zZXQoMCwgdmFsdWUpIDogc2V0TGlzdEJvdW5kcyhsaXN0LCAwLCBpbmRleCArIDEpLnNldChpbmRleCwgdmFsdWUpO1xuICAgIH0pKTtcbiAgfVxuICBpbmRleCArPSBsaXN0Ll9vcmlnaW47XG4gIHZhciBuZXdUYWlsID0gbGlzdC5fdGFpbDtcbiAgdmFyIG5ld1Jvb3QgPSBsaXN0Ll9yb290O1xuICB2YXIgZGlkQWx0ZXIgPSBNYWtlUmVmKERJRF9BTFRFUik7XG4gIGlmIChpbmRleCA+PSBnZXRUYWlsT2Zmc2V0KGxpc3QuX2NhcGFjaXR5KSkge1xuICAgIG5ld1RhaWwgPSB1cGRhdGVWTm9kZShuZXdUYWlsLCBsaXN0Ll9fb3duZXJJRCwgMCwgaW5kZXgsIHZhbHVlLCBkaWRBbHRlcik7XG4gIH0gZWxzZSB7XG4gICAgbmV3Um9vdCA9IHVwZGF0ZVZOb2RlKG5ld1Jvb3QsIGxpc3QuX19vd25lcklELCBsaXN0Ll9sZXZlbCwgaW5kZXgsIHZhbHVlLCBkaWRBbHRlcik7XG4gIH1cbiAgaWYgKCFkaWRBbHRlci52YWx1ZSkge1xuICAgIHJldHVybiBsaXN0O1xuICB9XG4gIGlmIChsaXN0Ll9fb3duZXJJRCkge1xuICAgIGxpc3QuX3Jvb3QgPSBuZXdSb290O1xuICAgIGxpc3QuX3RhaWwgPSBuZXdUYWlsO1xuICAgIGxpc3QuX19oYXNoID0gdW5kZWZpbmVkO1xuICAgIGxpc3QuX19hbHRlcmVkID0gdHJ1ZTtcbiAgICByZXR1cm4gbGlzdDtcbiAgfVxuICByZXR1cm4gbWFrZUxpc3QobGlzdC5fb3JpZ2luLCBsaXN0Ll9jYXBhY2l0eSwgbGlzdC5fbGV2ZWwsIG5ld1Jvb3QsIG5ld1RhaWwpO1xufVxuZnVuY3Rpb24gdXBkYXRlVk5vZGUobm9kZSwgb3duZXJJRCwgbGV2ZWwsIGluZGV4LCB2YWx1ZSwgZGlkQWx0ZXIpIHtcbiAgdmFyIGlkeCA9IChpbmRleCA+Pj4gbGV2ZWwpICYgTUFTSztcbiAgdmFyIG5vZGVIYXMgPSBub2RlICYmIGlkeCA8IG5vZGUuYXJyYXkubGVuZ3RoO1xuICBpZiAoIW5vZGVIYXMgJiYgdmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBub2RlO1xuICB9XG4gIHZhciBuZXdOb2RlO1xuICBpZiAobGV2ZWwgPiAwKSB7XG4gICAgdmFyIGxvd2VyTm9kZSA9IG5vZGUgJiYgbm9kZS5hcnJheVtpZHhdO1xuICAgIHZhciBuZXdMb3dlck5vZGUgPSB1cGRhdGVWTm9kZShsb3dlck5vZGUsIG93bmVySUQsIGxldmVsIC0gU0hJRlQsIGluZGV4LCB2YWx1ZSwgZGlkQWx0ZXIpO1xuICAgIGlmIChuZXdMb3dlck5vZGUgPT09IGxvd2VyTm9kZSkge1xuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuICAgIG5ld05vZGUgPSBlZGl0YWJsZVZOb2RlKG5vZGUsIG93bmVySUQpO1xuICAgIG5ld05vZGUuYXJyYXlbaWR4XSA9IG5ld0xvd2VyTm9kZTtcbiAgICByZXR1cm4gbmV3Tm9kZTtcbiAgfVxuICBpZiAobm9kZUhhcyAmJiBub2RlLmFycmF5W2lkeF0gPT09IHZhbHVlKSB7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cbiAgU2V0UmVmKGRpZEFsdGVyKTtcbiAgbmV3Tm9kZSA9IGVkaXRhYmxlVk5vZGUobm9kZSwgb3duZXJJRCk7XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkICYmIGlkeCA9PT0gbmV3Tm9kZS5hcnJheS5sZW5ndGggLSAxKSB7XG4gICAgbmV3Tm9kZS5hcnJheS5wb3AoKTtcbiAgfSBlbHNlIHtcbiAgICBuZXdOb2RlLmFycmF5W2lkeF0gPSB2YWx1ZTtcbiAgfVxuICByZXR1cm4gbmV3Tm9kZTtcbn1cbmZ1bmN0aW9uIGVkaXRhYmxlVk5vZGUobm9kZSwgb3duZXJJRCkge1xuICBpZiAob3duZXJJRCAmJiBub2RlICYmIG93bmVySUQgPT09IG5vZGUub3duZXJJRCkge1xuICAgIHJldHVybiBub2RlO1xuICB9XG4gIHJldHVybiBuZXcgVk5vZGUobm9kZSA/IG5vZGUuYXJyYXkuc2xpY2UoKSA6IFtdLCBvd25lcklEKTtcbn1cbmZ1bmN0aW9uIGxpc3ROb2RlRm9yKGxpc3QsIHJhd0luZGV4KSB7XG4gIGlmIChyYXdJbmRleCA+PSBnZXRUYWlsT2Zmc2V0KGxpc3QuX2NhcGFjaXR5KSkge1xuICAgIHJldHVybiBsaXN0Ll90YWlsO1xuICB9XG4gIGlmIChyYXdJbmRleCA8IDEgPDwgKGxpc3QuX2xldmVsICsgU0hJRlQpKSB7XG4gICAgdmFyIG5vZGUgPSBsaXN0Ll9yb290O1xuICAgIHZhciBsZXZlbCA9IGxpc3QuX2xldmVsO1xuICAgIHdoaWxlIChub2RlICYmIGxldmVsID4gMCkge1xuICAgICAgbm9kZSA9IG5vZGUuYXJyYXlbKHJhd0luZGV4ID4+PiBsZXZlbCkgJiBNQVNLXTtcbiAgICAgIGxldmVsIC09IFNISUZUO1xuICAgIH1cbiAgICByZXR1cm4gbm9kZTtcbiAgfVxufVxuZnVuY3Rpb24gc2V0TGlzdEJvdW5kcyhsaXN0LCBiZWdpbiwgZW5kKSB7XG4gIHZhciBvd25lciA9IGxpc3QuX19vd25lcklEIHx8IG5ldyBPd25lcklEKCk7XG4gIHZhciBvbGRPcmlnaW4gPSBsaXN0Ll9vcmlnaW47XG4gIHZhciBvbGRDYXBhY2l0eSA9IGxpc3QuX2NhcGFjaXR5O1xuICB2YXIgbmV3T3JpZ2luID0gb2xkT3JpZ2luICsgYmVnaW47XG4gIHZhciBuZXdDYXBhY2l0eSA9IGVuZCA9PT0gdW5kZWZpbmVkID8gb2xkQ2FwYWNpdHkgOiBlbmQgPCAwID8gb2xkQ2FwYWNpdHkgKyBlbmQgOiBvbGRPcmlnaW4gKyBlbmQ7XG4gIGlmIChuZXdPcmlnaW4gPT09IG9sZE9yaWdpbiAmJiBuZXdDYXBhY2l0eSA9PT0gb2xkQ2FwYWNpdHkpIHtcbiAgICByZXR1cm4gbGlzdDtcbiAgfVxuICBpZiAobmV3T3JpZ2luID49IG5ld0NhcGFjaXR5KSB7XG4gICAgcmV0dXJuIGxpc3QuY2xlYXIoKTtcbiAgfVxuICB2YXIgbmV3TGV2ZWwgPSBsaXN0Ll9sZXZlbDtcbiAgdmFyIG5ld1Jvb3QgPSBsaXN0Ll9yb290O1xuICB2YXIgb2Zmc2V0U2hpZnQgPSAwO1xuICB3aGlsZSAobmV3T3JpZ2luICsgb2Zmc2V0U2hpZnQgPCAwKSB7XG4gICAgbmV3Um9vdCA9IG5ldyBWTm9kZShuZXdSb290ICYmIG5ld1Jvb3QuYXJyYXkubGVuZ3RoID8gW3VuZGVmaW5lZCwgbmV3Um9vdF0gOiBbXSwgb3duZXIpO1xuICAgIG5ld0xldmVsICs9IFNISUZUO1xuICAgIG9mZnNldFNoaWZ0ICs9IDEgPDwgbmV3TGV2ZWw7XG4gIH1cbiAgaWYgKG9mZnNldFNoaWZ0KSB7XG4gICAgbmV3T3JpZ2luICs9IG9mZnNldFNoaWZ0O1xuICAgIG9sZE9yaWdpbiArPSBvZmZzZXRTaGlmdDtcbiAgICBuZXdDYXBhY2l0eSArPSBvZmZzZXRTaGlmdDtcbiAgICBvbGRDYXBhY2l0eSArPSBvZmZzZXRTaGlmdDtcbiAgfVxuICB2YXIgb2xkVGFpbE9mZnNldCA9IGdldFRhaWxPZmZzZXQob2xkQ2FwYWNpdHkpO1xuICB2YXIgbmV3VGFpbE9mZnNldCA9IGdldFRhaWxPZmZzZXQobmV3Q2FwYWNpdHkpO1xuICB3aGlsZSAobmV3VGFpbE9mZnNldCA+PSAxIDw8IChuZXdMZXZlbCArIFNISUZUKSkge1xuICAgIG5ld1Jvb3QgPSBuZXcgVk5vZGUobmV3Um9vdCAmJiBuZXdSb290LmFycmF5Lmxlbmd0aCA/IFtuZXdSb290XSA6IFtdLCBvd25lcik7XG4gICAgbmV3TGV2ZWwgKz0gU0hJRlQ7XG4gIH1cbiAgdmFyIG9sZFRhaWwgPSBsaXN0Ll90YWlsO1xuICB2YXIgbmV3VGFpbCA9IG5ld1RhaWxPZmZzZXQgPCBvbGRUYWlsT2Zmc2V0ID8gbGlzdE5vZGVGb3IobGlzdCwgbmV3Q2FwYWNpdHkgLSAxKSA6IG5ld1RhaWxPZmZzZXQgPiBvbGRUYWlsT2Zmc2V0ID8gbmV3IFZOb2RlKFtdLCBvd25lcikgOiBvbGRUYWlsO1xuICBpZiAob2xkVGFpbCAmJiBuZXdUYWlsT2Zmc2V0ID4gb2xkVGFpbE9mZnNldCAmJiBuZXdPcmlnaW4gPCBvbGRDYXBhY2l0eSAmJiBvbGRUYWlsLmFycmF5Lmxlbmd0aCkge1xuICAgIG5ld1Jvb3QgPSBlZGl0YWJsZVZOb2RlKG5ld1Jvb3QsIG93bmVyKTtcbiAgICB2YXIgbm9kZSA9IG5ld1Jvb3Q7XG4gICAgZm9yICh2YXIgbGV2ZWwgPSBuZXdMZXZlbDsgbGV2ZWwgPiBTSElGVDsgbGV2ZWwgLT0gU0hJRlQpIHtcbiAgICAgIHZhciBpZHggPSAob2xkVGFpbE9mZnNldCA+Pj4gbGV2ZWwpICYgTUFTSztcbiAgICAgIG5vZGUgPSBub2RlLmFycmF5W2lkeF0gPSBlZGl0YWJsZVZOb2RlKG5vZGUuYXJyYXlbaWR4XSwgb3duZXIpO1xuICAgIH1cbiAgICBub2RlLmFycmF5WyhvbGRUYWlsT2Zmc2V0ID4+PiBTSElGVCkgJiBNQVNLXSA9IG9sZFRhaWw7XG4gIH1cbiAgaWYgKG5ld0NhcGFjaXR5IDwgb2xkQ2FwYWNpdHkpIHtcbiAgICBuZXdUYWlsID0gbmV3VGFpbCAmJiBuZXdUYWlsLnJlbW92ZUFmdGVyKG93bmVyLCAwLCBuZXdDYXBhY2l0eSk7XG4gIH1cbiAgaWYgKG5ld09yaWdpbiA+PSBuZXdUYWlsT2Zmc2V0KSB7XG4gICAgbmV3T3JpZ2luIC09IG5ld1RhaWxPZmZzZXQ7XG4gICAgbmV3Q2FwYWNpdHkgLT0gbmV3VGFpbE9mZnNldDtcbiAgICBuZXdMZXZlbCA9IFNISUZUO1xuICAgIG5ld1Jvb3QgPSBudWxsO1xuICAgIG5ld1RhaWwgPSBuZXdUYWlsICYmIG5ld1RhaWwucmVtb3ZlQmVmb3JlKG93bmVyLCAwLCBuZXdPcmlnaW4pO1xuICB9IGVsc2UgaWYgKG5ld09yaWdpbiA+IG9sZE9yaWdpbiB8fCBuZXdUYWlsT2Zmc2V0IDwgb2xkVGFpbE9mZnNldCkge1xuICAgIG9mZnNldFNoaWZ0ID0gMDtcbiAgICB3aGlsZSAobmV3Um9vdCkge1xuICAgICAgdmFyIGJlZ2luSW5kZXggPSAobmV3T3JpZ2luID4+PiBuZXdMZXZlbCkgJiBNQVNLO1xuICAgICAgaWYgKGJlZ2luSW5kZXggIT09IChuZXdUYWlsT2Zmc2V0ID4+PiBuZXdMZXZlbCkgJiBNQVNLKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgaWYgKGJlZ2luSW5kZXgpIHtcbiAgICAgICAgb2Zmc2V0U2hpZnQgKz0gKDEgPDwgbmV3TGV2ZWwpICogYmVnaW5JbmRleDtcbiAgICAgIH1cbiAgICAgIG5ld0xldmVsIC09IFNISUZUO1xuICAgICAgbmV3Um9vdCA9IG5ld1Jvb3QuYXJyYXlbYmVnaW5JbmRleF07XG4gICAgfVxuICAgIGlmIChuZXdSb290ICYmIG5ld09yaWdpbiA+IG9sZE9yaWdpbikge1xuICAgICAgbmV3Um9vdCA9IG5ld1Jvb3QucmVtb3ZlQmVmb3JlKG93bmVyLCBuZXdMZXZlbCwgbmV3T3JpZ2luIC0gb2Zmc2V0U2hpZnQpO1xuICAgIH1cbiAgICBpZiAobmV3Um9vdCAmJiBuZXdUYWlsT2Zmc2V0IDwgb2xkVGFpbE9mZnNldCkge1xuICAgICAgbmV3Um9vdCA9IG5ld1Jvb3QucmVtb3ZlQWZ0ZXIob3duZXIsIG5ld0xldmVsLCBuZXdUYWlsT2Zmc2V0IC0gb2Zmc2V0U2hpZnQpO1xuICAgIH1cbiAgICBpZiAob2Zmc2V0U2hpZnQpIHtcbiAgICAgIG5ld09yaWdpbiAtPSBvZmZzZXRTaGlmdDtcbiAgICAgIG5ld0NhcGFjaXR5IC09IG9mZnNldFNoaWZ0O1xuICAgIH1cbiAgfVxuICBpZiAobGlzdC5fX293bmVySUQpIHtcbiAgICBsaXN0LnNpemUgPSBuZXdDYXBhY2l0eSAtIG5ld09yaWdpbjtcbiAgICBsaXN0Ll9vcmlnaW4gPSBuZXdPcmlnaW47XG4gICAgbGlzdC5fY2FwYWNpdHkgPSBuZXdDYXBhY2l0eTtcbiAgICBsaXN0Ll9sZXZlbCA9IG5ld0xldmVsO1xuICAgIGxpc3QuX3Jvb3QgPSBuZXdSb290O1xuICAgIGxpc3QuX3RhaWwgPSBuZXdUYWlsO1xuICAgIGxpc3QuX19oYXNoID0gdW5kZWZpbmVkO1xuICAgIGxpc3QuX19hbHRlcmVkID0gdHJ1ZTtcbiAgICByZXR1cm4gbGlzdDtcbiAgfVxuICByZXR1cm4gbWFrZUxpc3QobmV3T3JpZ2luLCBuZXdDYXBhY2l0eSwgbmV3TGV2ZWwsIG5ld1Jvb3QsIG5ld1RhaWwpO1xufVxuZnVuY3Rpb24gbWVyZ2VJbnRvTGlzdFdpdGgobGlzdCwgbWVyZ2VyLCBpdGVyYWJsZXMpIHtcbiAgdmFyIGl0ZXJzID0gW107XG4gIHZhciBtYXhTaXplID0gMDtcbiAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IGl0ZXJhYmxlcy5sZW5ndGg7IGlpKyspIHtcbiAgICB2YXIgdmFsdWUgPSBpdGVyYWJsZXNbaWldO1xuICAgIHZhciBpdGVyID0gSXRlcmFibGUodmFsdWUpO1xuICAgIGlmIChpdGVyLnNpemUgPiBtYXhTaXplKSB7XG4gICAgICBtYXhTaXplID0gaXRlci5zaXplO1xuICAgIH1cbiAgICBpZiAoIWlzSXRlcmFibGUodmFsdWUpKSB7XG4gICAgICBpdGVyID0gaXRlci5tYXAoKGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgcmV0dXJuIGZyb21KUyh2KTtcbiAgICAgIH0pKTtcbiAgICB9XG4gICAgaXRlcnMucHVzaChpdGVyKTtcbiAgfVxuICBpZiAobWF4U2l6ZSA+IGxpc3Quc2l6ZSkge1xuICAgIGxpc3QgPSBsaXN0LnNldFNpemUobWF4U2l6ZSk7XG4gIH1cbiAgcmV0dXJuIG1lcmdlSW50b0NvbGxlY3Rpb25XaXRoKGxpc3QsIG1lcmdlciwgaXRlcnMpO1xufVxuZnVuY3Rpb24gZ2V0VGFpbE9mZnNldChzaXplKSB7XG4gIHJldHVybiBzaXplIDwgU0laRSA/IDAgOiAoKChzaXplIC0gMSkgPj4+IFNISUZUKSA8PCBTSElGVCk7XG59XG52YXIgU3RhY2sgPSBmdW5jdGlvbiBTdGFjayh2YWx1ZSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMCA/IGVtcHR5U3RhY2soKSA6IHZhbHVlICYmIHZhbHVlLmNvbnN0cnVjdG9yID09PSAkU3RhY2sgPyB2YWx1ZSA6IGVtcHR5U3RhY2soKS51bnNoaWZ0QWxsKHZhbHVlKTtcbn07XG52YXIgJFN0YWNrID0gU3RhY2s7XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShTdGFjaywge1xuICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX190b1N0cmluZygnU3RhY2sgWycsICddJyk7XG4gIH0sXG4gIGdldDogZnVuY3Rpb24oaW5kZXgsIG5vdFNldFZhbHVlKSB7XG4gICAgdmFyIGhlYWQgPSB0aGlzLl9oZWFkO1xuICAgIHdoaWxlIChoZWFkICYmIGluZGV4LS0pIHtcbiAgICAgIGhlYWQgPSBoZWFkLm5leHQ7XG4gICAgfVxuICAgIHJldHVybiBoZWFkID8gaGVhZC52YWx1ZSA6IG5vdFNldFZhbHVlO1xuICB9LFxuICBwZWVrOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5faGVhZCAmJiB0aGlzLl9oZWFkLnZhbHVlO1xuICB9LFxuICBwdXNoOiBmdW5jdGlvbigpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciBuZXdTaXplID0gdGhpcy5zaXplICsgYXJndW1lbnRzLmxlbmd0aDtcbiAgICB2YXIgaGVhZCA9IHRoaXMuX2hlYWQ7XG4gICAgZm9yICh2YXIgaWkgPSBhcmd1bWVudHMubGVuZ3RoIC0gMTsgaWkgPj0gMDsgaWktLSkge1xuICAgICAgaGVhZCA9IHtcbiAgICAgICAgdmFsdWU6IGFyZ3VtZW50c1tpaV0sXG4gICAgICAgIG5leHQ6IGhlYWRcbiAgICAgIH07XG4gICAgfVxuICAgIGlmICh0aGlzLl9fb3duZXJJRCkge1xuICAgICAgdGhpcy5zaXplID0gbmV3U2l6ZTtcbiAgICAgIHRoaXMuX2hlYWQgPSBoZWFkO1xuICAgICAgdGhpcy5fX2hhc2ggPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9fYWx0ZXJlZCA9IHRydWU7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIG1ha2VTdGFjayhuZXdTaXplLCBoZWFkKTtcbiAgfSxcbiAgcHVzaEFsbDogZnVuY3Rpb24oaXRlcikge1xuICAgIGl0ZXIgPSBJdGVyYWJsZShpdGVyKTtcbiAgICBpZiAoaXRlci5zaXplID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdmFyIG5ld1NpemUgPSB0aGlzLnNpemU7XG4gICAgdmFyIGhlYWQgPSB0aGlzLl9oZWFkO1xuICAgIGl0ZXIucmV2ZXJzZSgpLmZvckVhY2goKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBuZXdTaXplKys7XG4gICAgICBoZWFkID0ge1xuICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgIG5leHQ6IGhlYWRcbiAgICAgIH07XG4gICAgfSkpO1xuICAgIGlmICh0aGlzLl9fb3duZXJJRCkge1xuICAgICAgdGhpcy5zaXplID0gbmV3U2l6ZTtcbiAgICAgIHRoaXMuX2hlYWQgPSBoZWFkO1xuICAgICAgdGhpcy5fX2hhc2ggPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9fYWx0ZXJlZCA9IHRydWU7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIG1ha2VTdGFjayhuZXdTaXplLCBoZWFkKTtcbiAgfSxcbiAgcG9wOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5zbGljZSgxKTtcbiAgfSxcbiAgdW5zaGlmdDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucHVzaC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9LFxuICB1bnNoaWZ0QWxsOiBmdW5jdGlvbihpdGVyKSB7XG4gICAgcmV0dXJuIHRoaXMucHVzaEFsbChpdGVyKTtcbiAgfSxcbiAgc2hpZnQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnBvcC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9LFxuICBjbGVhcjogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuc2l6ZSA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGlmICh0aGlzLl9fb3duZXJJRCkge1xuICAgICAgdGhpcy5zaXplID0gMDtcbiAgICAgIHRoaXMuX2hlYWQgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9faGFzaCA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuX19hbHRlcmVkID0gdHJ1ZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gZW1wdHlTdGFjaygpO1xuICB9LFxuICBzbGljZTogZnVuY3Rpb24oYmVnaW4sIGVuZCkge1xuICAgIGlmICh3aG9sZVNsaWNlKGJlZ2luLCBlbmQsIHRoaXMuc2l6ZSkpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgcmVzb2x2ZWRCZWdpbiA9IHJlc29sdmVCZWdpbihiZWdpbiwgdGhpcy5zaXplKTtcbiAgICB2YXIgcmVzb2x2ZWRFbmQgPSByZXNvbHZlRW5kKGVuZCwgdGhpcy5zaXplKTtcbiAgICBpZiAocmVzb2x2ZWRFbmQgIT09IHRoaXMuc2l6ZSkge1xuICAgICAgcmV0dXJuICR0cmFjZXVyUnVudGltZS5zdXBlckNhbGwodGhpcywgJFN0YWNrLnByb3RvdHlwZSwgXCJzbGljZVwiLCBbYmVnaW4sIGVuZF0pO1xuICAgIH1cbiAgICB2YXIgbmV3U2l6ZSA9IHRoaXMuc2l6ZSAtIHJlc29sdmVkQmVnaW47XG4gICAgdmFyIGhlYWQgPSB0aGlzLl9oZWFkO1xuICAgIHdoaWxlIChyZXNvbHZlZEJlZ2luLS0pIHtcbiAgICAgIGhlYWQgPSBoZWFkLm5leHQ7XG4gICAgfVxuICAgIGlmICh0aGlzLl9fb3duZXJJRCkge1xuICAgICAgdGhpcy5zaXplID0gbmV3U2l6ZTtcbiAgICAgIHRoaXMuX2hlYWQgPSBoZWFkO1xuICAgICAgdGhpcy5fX2hhc2ggPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9fYWx0ZXJlZCA9IHRydWU7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIG1ha2VTdGFjayhuZXdTaXplLCBoZWFkKTtcbiAgfSxcbiAgX19lbnN1cmVPd25lcjogZnVuY3Rpb24ob3duZXJJRCkge1xuICAgIGlmIChvd25lcklEID09PSB0aGlzLl9fb3duZXJJRCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGlmICghb3duZXJJRCkge1xuICAgICAgdGhpcy5fX293bmVySUQgPSBvd25lcklEO1xuICAgICAgdGhpcy5fX2FsdGVyZWQgPSBmYWxzZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gbWFrZVN0YWNrKHRoaXMuc2l6ZSwgdGhpcy5faGVhZCwgb3duZXJJRCwgdGhpcy5fX2hhc2gpO1xuICB9LFxuICBfX2l0ZXJhdGU6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgaWYgKHJldmVyc2UpIHtcbiAgICAgIHJldHVybiB0aGlzLnRvU2VxKCkuY2FjaGVSZXN1bHQuX19pdGVyYXRlKGZuLCByZXZlcnNlKTtcbiAgICB9XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIHZhciBub2RlID0gdGhpcy5faGVhZDtcbiAgICB3aGlsZSAobm9kZSkge1xuICAgICAgaWYgKGZuKG5vZGUudmFsdWUsIGl0ZXJhdGlvbnMrKywgdGhpcykgPT09IGZhbHNlKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgbm9kZSA9IG5vZGUubmV4dDtcbiAgICB9XG4gICAgcmV0dXJuIGl0ZXJhdGlvbnM7XG4gIH0sXG4gIF9faXRlcmF0b3I6IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgcmV0dXJuIHRoaXMudG9TZXEoKS5jYWNoZVJlc3VsdCgpLl9faXRlcmF0b3IodHlwZSwgcmV2ZXJzZSk7XG4gICAgfVxuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICB2YXIgbm9kZSA9IHRoaXMuX2hlYWQ7XG4gICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICBpZiAobm9kZSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBub2RlLnZhbHVlO1xuICAgICAgICBub2RlID0gbm9kZS5uZXh0O1xuICAgICAgICByZXR1cm4gaXRlcmF0b3JWYWx1ZSh0eXBlLCBpdGVyYXRpb25zKyssIHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpdGVyYXRvckRvbmUoKTtcbiAgICB9KSk7XG4gIH1cbn0sIHtvZjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMoYXJndW1lbnRzKTtcbiAgfX0sIEluZGV4ZWRDb2xsZWN0aW9uKTtcbmZ1bmN0aW9uIGlzU3RhY2sobWF5YmVTdGFjaykge1xuICByZXR1cm4gISEobWF5YmVTdGFjayAmJiBtYXliZVN0YWNrW0lTX1NUQUNLX1NFTlRJTkVMXSk7XG59XG5TdGFjay5pc1N0YWNrID0gaXNTdGFjaztcbnZhciBJU19TVEFDS19TRU5USU5FTCA9ICdAQF9fSU1NVVRBQkxFX1NUQUNLX19AQCc7XG52YXIgU3RhY2tQcm90b3R5cGUgPSBTdGFjay5wcm90b3R5cGU7XG5TdGFja1Byb3RvdHlwZVtJU19TVEFDS19TRU5USU5FTF0gPSB0cnVlO1xuU3RhY2tQcm90b3R5cGUud2l0aE11dGF0aW9ucyA9IE1hcFByb3RvdHlwZS53aXRoTXV0YXRpb25zO1xuU3RhY2tQcm90b3R5cGUuYXNNdXRhYmxlID0gTWFwUHJvdG90eXBlLmFzTXV0YWJsZTtcblN0YWNrUHJvdG90eXBlLmFzSW1tdXRhYmxlID0gTWFwUHJvdG90eXBlLmFzSW1tdXRhYmxlO1xuU3RhY2tQcm90b3R5cGUud2FzQWx0ZXJlZCA9IE1hcFByb3RvdHlwZS53YXNBbHRlcmVkO1xuZnVuY3Rpb24gbWFrZVN0YWNrKHNpemUsIGhlYWQsIG93bmVySUQsIGhhc2gpIHtcbiAgdmFyIG1hcCA9IE9iamVjdC5jcmVhdGUoU3RhY2tQcm90b3R5cGUpO1xuICBtYXAuc2l6ZSA9IHNpemU7XG4gIG1hcC5faGVhZCA9IGhlYWQ7XG4gIG1hcC5fX293bmVySUQgPSBvd25lcklEO1xuICBtYXAuX19oYXNoID0gaGFzaDtcbiAgbWFwLl9fYWx0ZXJlZCA9IGZhbHNlO1xuICByZXR1cm4gbWFwO1xufVxudmFyIEVNUFRZX1NUQUNLO1xuZnVuY3Rpb24gZW1wdHlTdGFjaygpIHtcbiAgcmV0dXJuIEVNUFRZX1NUQUNLIHx8IChFTVBUWV9TVEFDSyA9IG1ha2VTdGFjaygwKSk7XG59XG52YXIgU2V0ID0gZnVuY3Rpb24gU2V0KHZhbHVlKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAwID8gZW1wdHlTZXQoKSA6IHZhbHVlICYmIHZhbHVlLmNvbnN0cnVjdG9yID09PSAkU2V0ID8gdmFsdWUgOiBlbXB0eVNldCgpLnVuaW9uKHZhbHVlKTtcbn07XG52YXIgJFNldCA9IFNldDtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFNldCwge1xuICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX190b1N0cmluZygnU2V0IHsnLCAnfScpO1xuICB9LFxuICBoYXM6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcC5oYXModmFsdWUpO1xuICB9LFxuICBhZGQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdmFyIG5ld01hcCA9IHRoaXMuX21hcC5zZXQodmFsdWUsIHRydWUpO1xuICAgIGlmICh0aGlzLl9fb3duZXJJRCkge1xuICAgICAgdGhpcy5zaXplID0gbmV3TWFwLnNpemU7XG4gICAgICB0aGlzLl9tYXAgPSBuZXdNYXA7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIG5ld01hcCA9PT0gdGhpcy5fbWFwID8gdGhpcyA6IG1ha2VTZXQobmV3TWFwKTtcbiAgfSxcbiAgcmVtb3ZlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhciBuZXdNYXAgPSB0aGlzLl9tYXAucmVtb3ZlKHZhbHVlKTtcbiAgICBpZiAodGhpcy5fX293bmVySUQpIHtcbiAgICAgIHRoaXMuc2l6ZSA9IG5ld01hcC5zaXplO1xuICAgICAgdGhpcy5fbWFwID0gbmV3TWFwO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBuZXdNYXAgPT09IHRoaXMuX21hcCA/IHRoaXMgOiBuZXdNYXAuc2l6ZSA9PT0gMCA/IGVtcHR5U2V0KCkgOiBtYWtlU2V0KG5ld01hcCk7XG4gIH0sXG4gIGNsZWFyOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5zaXplID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgaWYgKHRoaXMuX19vd25lcklEKSB7XG4gICAgICB0aGlzLnNpemUgPSAwO1xuICAgICAgdGhpcy5fbWFwLmNsZWFyKCk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIGVtcHR5U2V0KCk7XG4gIH0sXG4gIHVuaW9uOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlcnMgPSBhcmd1bWVudHM7XG4gICAgaWYgKGl0ZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLndpdGhNdXRhdGlvbnMoKGZ1bmN0aW9uKHNldCkge1xuICAgICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IGl0ZXJzLmxlbmd0aDsgaWkrKykge1xuICAgICAgICBJdGVyYWJsZShpdGVyc1tpaV0pLmZvckVhY2goKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIHNldC5hZGQodmFsdWUpO1xuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgfSkpO1xuICB9LFxuICBpbnRlcnNlY3Q6IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIGl0ZXJzID0gW10sXG4gICAgICAgICRfXzggPSAwOyAkX184IDwgYXJndW1lbnRzLmxlbmd0aDsgJF9fOCsrKVxuICAgICAgaXRlcnNbJF9fOF0gPSBhcmd1bWVudHNbJF9fOF07XG4gICAgaWYgKGl0ZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGl0ZXJzID0gaXRlcnMubWFwKChmdW5jdGlvbihpdGVyKSB7XG4gICAgICByZXR1cm4gSXRlcmFibGUoaXRlcik7XG4gICAgfSkpO1xuICAgIHZhciBvcmlnaW5hbFNldCA9IHRoaXM7XG4gICAgcmV0dXJuIHRoaXMud2l0aE11dGF0aW9ucygoZnVuY3Rpb24oc2V0KSB7XG4gICAgICBvcmlnaW5hbFNldC5mb3JFYWNoKChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBpZiAoIWl0ZXJzLmV2ZXJ5KChmdW5jdGlvbihpdGVyKSB7XG4gICAgICAgICAgcmV0dXJuIGl0ZXIuY29udGFpbnModmFsdWUpO1xuICAgICAgICB9KSkpIHtcbiAgICAgICAgICBzZXQucmVtb3ZlKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgIH0pKTtcbiAgfSxcbiAgc3VidHJhY3Q6IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIGl0ZXJzID0gW10sXG4gICAgICAgICRfXzkgPSAwOyAkX185IDwgYXJndW1lbnRzLmxlbmd0aDsgJF9fOSsrKVxuICAgICAgaXRlcnNbJF9fOV0gPSBhcmd1bWVudHNbJF9fOV07XG4gICAgaWYgKGl0ZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGl0ZXJzID0gaXRlcnMubWFwKChmdW5jdGlvbihpdGVyKSB7XG4gICAgICByZXR1cm4gSXRlcmFibGUoaXRlcik7XG4gICAgfSkpO1xuICAgIHZhciBvcmlnaW5hbFNldCA9IHRoaXM7XG4gICAgcmV0dXJuIHRoaXMud2l0aE11dGF0aW9ucygoZnVuY3Rpb24oc2V0KSB7XG4gICAgICBvcmlnaW5hbFNldC5mb3JFYWNoKChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBpZiAoaXRlcnMuc29tZSgoZnVuY3Rpb24oaXRlcikge1xuICAgICAgICAgIHJldHVybiBpdGVyLmNvbnRhaW5zKHZhbHVlKTtcbiAgICAgICAgfSkpKSB7XG4gICAgICAgICAgc2V0LnJlbW92ZSh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICB9KSk7XG4gIH0sXG4gIG1lcmdlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy51bmlvbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9LFxuICBtZXJnZVdpdGg6IGZ1bmN0aW9uKG1lcmdlcikge1xuICAgIGZvciAodmFyIGl0ZXJzID0gW10sXG4gICAgICAgICRfXzEwID0gMTsgJF9fMTAgPCBhcmd1bWVudHMubGVuZ3RoOyAkX18xMCsrKVxuICAgICAgaXRlcnNbJF9fMTAgLSAxXSA9IGFyZ3VtZW50c1skX18xMF07XG4gICAgcmV0dXJuIHRoaXMudW5pb24uYXBwbHkodGhpcywgaXRlcnMpO1xuICB9LFxuICB3YXNBbHRlcmVkOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwLndhc0FsdGVyZWQoKTtcbiAgfSxcbiAgX19pdGVyYXRlOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICByZXR1cm4gdGhpcy5fbWFwLl9faXRlcmF0ZSgoZnVuY3Rpb24oXywgaykge1xuICAgICAgcmV0dXJuIGZuKGssIGssICRfXzApO1xuICAgIH0pLCByZXZlcnNlKTtcbiAgfSxcbiAgX19pdGVyYXRvcjogZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHJldHVybiB0aGlzLl9tYXAubWFwKChmdW5jdGlvbihfLCBrKSB7XG4gICAgICByZXR1cm4gaztcbiAgICB9KSkuX19pdGVyYXRvcih0eXBlLCByZXZlcnNlKTtcbiAgfSxcbiAgX19lbnN1cmVPd25lcjogZnVuY3Rpb24ob3duZXJJRCkge1xuICAgIGlmIChvd25lcklEID09PSB0aGlzLl9fb3duZXJJRCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciBuZXdNYXAgPSB0aGlzLl9tYXAuX19lbnN1cmVPd25lcihvd25lcklEKTtcbiAgICBpZiAoIW93bmVySUQpIHtcbiAgICAgIHRoaXMuX19vd25lcklEID0gb3duZXJJRDtcbiAgICAgIHRoaXMuX21hcCA9IG5ld01hcDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gbWFrZVNldChuZXdNYXAsIG93bmVySUQpO1xuICB9XG59LCB7XG4gIG9mOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcyhhcmd1bWVudHMpO1xuICB9LFxuICBmcm9tS2V5czogZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcyhLZXllZFNlcSh2YWx1ZSkuZmxpcCgpKTtcbiAgfVxufSwgU2V0Q29sbGVjdGlvbik7XG5mdW5jdGlvbiBpc1NldChtYXliZVNldCkge1xuICByZXR1cm4gISEobWF5YmVTZXQgJiYgbWF5YmVTZXRbSVNfU0VUX1NFTlRJTkVMXSk7XG59XG5TZXQuaXNTZXQgPSBpc1NldDtcbnZhciBJU19TRVRfU0VOVElORUwgPSAnQEBfX0lNTVVUQUJMRV9TRVRfX0BAJztcbnZhciBTZXRQcm90b3R5cGUgPSBTZXQucHJvdG90eXBlO1xuU2V0UHJvdG90eXBlW0lTX1NFVF9TRU5USU5FTF0gPSB0cnVlO1xuU2V0UHJvdG90eXBlW0RFTEVURV0gPSBTZXRQcm90b3R5cGUucmVtb3ZlO1xuU2V0UHJvdG90eXBlLm1lcmdlRGVlcCA9IFNldFByb3RvdHlwZS5tZXJnZTtcblNldFByb3RvdHlwZS5tZXJnZURlZXBXaXRoID0gU2V0UHJvdG90eXBlLm1lcmdlV2l0aDtcblNldFByb3RvdHlwZS53aXRoTXV0YXRpb25zID0gTWFwUHJvdG90eXBlLndpdGhNdXRhdGlvbnM7XG5TZXRQcm90b3R5cGUuYXNNdXRhYmxlID0gTWFwUHJvdG90eXBlLmFzTXV0YWJsZTtcblNldFByb3RvdHlwZS5hc0ltbXV0YWJsZSA9IE1hcFByb3RvdHlwZS5hc0ltbXV0YWJsZTtcbmZ1bmN0aW9uIG1ha2VTZXQobWFwLCBvd25lcklEKSB7XG4gIHZhciBzZXQgPSBPYmplY3QuY3JlYXRlKFNldFByb3RvdHlwZSk7XG4gIHNldC5zaXplID0gbWFwID8gbWFwLnNpemUgOiAwO1xuICBzZXQuX21hcCA9IG1hcDtcbiAgc2V0Ll9fb3duZXJJRCA9IG93bmVySUQ7XG4gIHJldHVybiBzZXQ7XG59XG52YXIgRU1QVFlfU0VUO1xuZnVuY3Rpb24gZW1wdHlTZXQoKSB7XG4gIHJldHVybiBFTVBUWV9TRVQgfHwgKEVNUFRZX1NFVCA9IG1ha2VTZXQoZW1wdHlNYXAoKSkpO1xufVxudmFyIE9yZGVyZWRNYXAgPSBmdW5jdGlvbiBPcmRlcmVkTWFwKHZhbHVlKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAwID8gZW1wdHlPcmRlcmVkTWFwKCkgOiB2YWx1ZSAmJiB2YWx1ZS5jb25zdHJ1Y3RvciA9PT0gJE9yZGVyZWRNYXAgPyB2YWx1ZSA6IGVtcHR5T3JkZXJlZE1hcCgpLm1lcmdlKEtleWVkSXRlcmFibGUodmFsdWUpKTtcbn07XG52YXIgJE9yZGVyZWRNYXAgPSBPcmRlcmVkTWFwO1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoT3JkZXJlZE1hcCwge1xuICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX190b1N0cmluZygnT3JkZXJlZE1hcCB7JywgJ30nKTtcbiAgfSxcbiAgZ2V0OiBmdW5jdGlvbihrLCBub3RTZXRWYWx1ZSkge1xuICAgIHZhciBpbmRleCA9IHRoaXMuX21hcC5nZXQoayk7XG4gICAgcmV0dXJuIGluZGV4ICE9PSB1bmRlZmluZWQgPyB0aGlzLl9saXN0LmdldChpbmRleClbMV0gOiBub3RTZXRWYWx1ZTtcbiAgfSxcbiAgY2xlYXI6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnNpemUgPT09IDApIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBpZiAodGhpcy5fX293bmVySUQpIHtcbiAgICAgIHRoaXMuc2l6ZSA9IDA7XG4gICAgICB0aGlzLl9tYXAuY2xlYXIoKTtcbiAgICAgIHRoaXMuX2xpc3QuY2xlYXIoKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gZW1wdHlPcmRlcmVkTWFwKCk7XG4gIH0sXG4gIHNldDogZnVuY3Rpb24oaywgdikge1xuICAgIHJldHVybiB1cGRhdGVPcmRlcmVkTWFwKHRoaXMsIGssIHYpO1xuICB9LFxuICByZW1vdmU6IGZ1bmN0aW9uKGspIHtcbiAgICByZXR1cm4gdXBkYXRlT3JkZXJlZE1hcCh0aGlzLCBrLCBOT1RfU0VUKTtcbiAgfSxcbiAgd2FzQWx0ZXJlZDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcC53YXNBbHRlcmVkKCkgfHwgdGhpcy5fbGlzdC53YXNBbHRlcmVkKCk7XG4gIH0sXG4gIF9faXRlcmF0ZTogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgcmV0dXJuIHRoaXMuX2xpc3QuX19pdGVyYXRlKChmdW5jdGlvbihlbnRyeSkge1xuICAgICAgcmV0dXJuIGZuKGVudHJ5WzFdLCBlbnRyeVswXSwgJF9fMCk7XG4gICAgfSksIHJldmVyc2UpO1xuICB9LFxuICBfX2l0ZXJhdG9yOiBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xpc3QuZnJvbUVudHJ5U2VxKCkuX19pdGVyYXRvcih0eXBlLCByZXZlcnNlKTtcbiAgfSxcbiAgX19lbnN1cmVPd25lcjogZnVuY3Rpb24ob3duZXJJRCkge1xuICAgIGlmIChvd25lcklEID09PSB0aGlzLl9fb3duZXJJRCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciBuZXdNYXAgPSB0aGlzLl9tYXAuX19lbnN1cmVPd25lcihvd25lcklEKTtcbiAgICB2YXIgbmV3TGlzdCA9IHRoaXMuX2xpc3QuX19lbnN1cmVPd25lcihvd25lcklEKTtcbiAgICBpZiAoIW93bmVySUQpIHtcbiAgICAgIHRoaXMuX19vd25lcklEID0gb3duZXJJRDtcbiAgICAgIHRoaXMuX21hcCA9IG5ld01hcDtcbiAgICAgIHRoaXMuX2xpc3QgPSBuZXdMaXN0O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBtYWtlT3JkZXJlZE1hcChuZXdNYXAsIG5ld0xpc3QsIG93bmVySUQsIHRoaXMuX19oYXNoKTtcbiAgfVxufSwge29mOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcyhhcmd1bWVudHMpO1xuICB9fSwgTWFwKTtcbmZ1bmN0aW9uIGlzT3JkZXJlZE1hcChtYXliZU9yZGVyZWRNYXApIHtcbiAgcmV0dXJuICEhKG1heWJlT3JkZXJlZE1hcCAmJiBtYXliZU9yZGVyZWRNYXBbSVNfT1JERVJFRF9NQVBfU0VOVElORUxdKTtcbn1cbk9yZGVyZWRNYXAuaXNPcmRlcmVkTWFwID0gaXNPcmRlcmVkTWFwO1xudmFyIElTX09SREVSRURfTUFQX1NFTlRJTkVMID0gJ0BAX19JTU1VVEFCTEVfT1JERVJFRF9NQVBfX0BAJztcbk9yZGVyZWRNYXAucHJvdG90eXBlW0lTX09SREVSRURfTUFQX1NFTlRJTkVMXSA9IHRydWU7XG5PcmRlcmVkTWFwLnByb3RvdHlwZVtERUxFVEVdID0gT3JkZXJlZE1hcC5wcm90b3R5cGUucmVtb3ZlO1xuZnVuY3Rpb24gbWFrZU9yZGVyZWRNYXAobWFwLCBsaXN0LCBvd25lcklELCBoYXNoKSB7XG4gIHZhciBvbWFwID0gT2JqZWN0LmNyZWF0ZShPcmRlcmVkTWFwLnByb3RvdHlwZSk7XG4gIG9tYXAuc2l6ZSA9IG1hcCA/IG1hcC5zaXplIDogMDtcbiAgb21hcC5fbWFwID0gbWFwO1xuICBvbWFwLl9saXN0ID0gbGlzdDtcbiAgb21hcC5fX293bmVySUQgPSBvd25lcklEO1xuICBvbWFwLl9faGFzaCA9IGhhc2g7XG4gIHJldHVybiBvbWFwO1xufVxudmFyIEVNUFRZX09SREVSRURfTUFQO1xuZnVuY3Rpb24gZW1wdHlPcmRlcmVkTWFwKCkge1xuICByZXR1cm4gRU1QVFlfT1JERVJFRF9NQVAgfHwgKEVNUFRZX09SREVSRURfTUFQID0gbWFrZU9yZGVyZWRNYXAoZW1wdHlNYXAoKSwgZW1wdHlMaXN0KCkpKTtcbn1cbmZ1bmN0aW9uIHVwZGF0ZU9yZGVyZWRNYXAob21hcCwgaywgdikge1xuICB2YXIgbWFwID0gb21hcC5fbWFwO1xuICB2YXIgbGlzdCA9IG9tYXAuX2xpc3Q7XG4gIHZhciBpID0gbWFwLmdldChrKTtcbiAgdmFyIGhhcyA9IGkgIT09IHVuZGVmaW5lZDtcbiAgdmFyIHJlbW92ZWQgPSB2ID09PSBOT1RfU0VUO1xuICBpZiAoKCFoYXMgJiYgcmVtb3ZlZCkgfHwgKGhhcyAmJiB2ID09PSBsaXN0LmdldChpKVsxXSkpIHtcbiAgICByZXR1cm4gb21hcDtcbiAgfVxuICBpZiAoIWhhcykge1xuICAgIGkgPSBsaXN0LnNpemU7XG4gIH1cbiAgdmFyIG5ld01hcCA9IHJlbW92ZWQgPyBtYXAucmVtb3ZlKGspIDogaGFzID8gbWFwIDogbWFwLnNldChrLCBpKTtcbiAgdmFyIG5ld0xpc3QgPSByZW1vdmVkID8gbGlzdC5yZW1vdmUoaSkgOiBsaXN0LnNldChpLCBbaywgdl0pO1xuICBpZiAob21hcC5fX293bmVySUQpIHtcbiAgICBvbWFwLnNpemUgPSBuZXdNYXAuc2l6ZTtcbiAgICBvbWFwLl9tYXAgPSBuZXdNYXA7XG4gICAgb21hcC5fbGlzdCA9IG5ld0xpc3Q7XG4gICAgb21hcC5fX2hhc2ggPSB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIG9tYXA7XG4gIH1cbiAgcmV0dXJuIG1ha2VPcmRlcmVkTWFwKG5ld01hcCwgbmV3TGlzdCk7XG59XG52YXIgUmVjb3JkID0gZnVuY3Rpb24gUmVjb3JkKGRlZmF1bHRWYWx1ZXMsIG5hbWUpIHtcbiAgdmFyIFJlY29yZFR5cGUgPSBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUmVjb3JkVHlwZSkpIHtcbiAgICAgIHJldHVybiBuZXcgUmVjb3JkVHlwZSh2YWx1ZXMpO1xuICAgIH1cbiAgICB0aGlzLl9tYXAgPSBhcmd1bWVudHMubGVuZ3RoID09PSAwID8gTWFwKCkgOiBNYXAodmFsdWVzKTtcbiAgfTtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhkZWZhdWx0VmFsdWVzKTtcbiAgdmFyIFJlY29yZFR5cGVQcm90b3R5cGUgPSBSZWNvcmRUeXBlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUmVjb3JkUHJvdG90eXBlKTtcbiAgUmVjb3JkVHlwZVByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFJlY29yZFR5cGU7XG4gIG5hbWUgJiYgKFJlY29yZFR5cGVQcm90b3R5cGUuX25hbWUgPSBuYW1lKTtcbiAgUmVjb3JkVHlwZVByb3RvdHlwZS5fZGVmYXVsdFZhbHVlcyA9IGRlZmF1bHRWYWx1ZXM7XG4gIFJlY29yZFR5cGVQcm90b3R5cGUuX2tleXMgPSBrZXlzO1xuICBSZWNvcmRUeXBlUHJvdG90eXBlLnNpemUgPSBrZXlzLmxlbmd0aDtcbiAgdHJ5IHtcbiAgICBJdGVyYWJsZShkZWZhdWx0VmFsdWVzKS5mb3JFYWNoKChmdW5jdGlvbihfLCBrZXkpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShSZWNvcmRUeXBlLnByb3RvdHlwZSwga2V5LCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KGtleSk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICBpbnZhcmlhbnQodGhpcy5fX293bmVySUQsICdDYW5ub3Qgc2V0IG9uIGFuIGltbXV0YWJsZSByZWNvcmQuJyk7XG4gICAgICAgICAgdGhpcy5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHt9XG4gIHJldHVybiBSZWNvcmRUeXBlO1xufTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFJlY29yZCwge1xuICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX190b1N0cmluZyh0aGlzLl9uYW1lICsgJyB7JywgJ30nKTtcbiAgfSxcbiAgaGFzOiBmdW5jdGlvbihrKSB7XG4gICAgcmV0dXJuIHRoaXMuX2RlZmF1bHRWYWx1ZXMuaGFzT3duUHJvcGVydHkoayk7XG4gIH0sXG4gIGdldDogZnVuY3Rpb24oaywgbm90U2V0VmFsdWUpIHtcbiAgICBpZiAobm90U2V0VmFsdWUgIT09IHVuZGVmaW5lZCAmJiAhdGhpcy5oYXMoaykpIHtcbiAgICAgIHJldHVybiBub3RTZXRWYWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX21hcC5nZXQoaywgdGhpcy5fZGVmYXVsdFZhbHVlc1trXSk7XG4gIH0sXG4gIGNsZWFyOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fX293bmVySUQpIHtcbiAgICAgIHRoaXMuX21hcC5jbGVhcigpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciBTdXBlclJlY29yZCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih0aGlzKS5jb25zdHJ1Y3RvcjtcbiAgICByZXR1cm4gU3VwZXJSZWNvcmQuX2VtcHR5IHx8IChTdXBlclJlY29yZC5fZW1wdHkgPSBtYWtlUmVjb3JkKHRoaXMsIGVtcHR5TWFwKCkpKTtcbiAgfSxcbiAgc2V0OiBmdW5jdGlvbihrLCB2KSB7XG4gICAgaWYgKCF0aGlzLmhhcyhrKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3Qgc2V0IHVua25vd24ga2V5IFwiJyArIGsgKyAnXCIgb24gJyArIHRoaXMuX25hbWUpO1xuICAgIH1cbiAgICB2YXIgbmV3TWFwID0gdGhpcy5fbWFwLnNldChrLCB2KTtcbiAgICBpZiAodGhpcy5fX293bmVySUQgfHwgbmV3TWFwID09PSB0aGlzLl9tYXApIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gbWFrZVJlY29yZCh0aGlzLCBuZXdNYXApO1xuICB9LFxuICByZW1vdmU6IGZ1bmN0aW9uKGspIHtcbiAgICBpZiAoIXRoaXMuaGFzKGspKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdmFyIG5ld01hcCA9IHRoaXMuX21hcC5yZW1vdmUoayk7XG4gICAgaWYgKHRoaXMuX19vd25lcklEIHx8IG5ld01hcCA9PT0gdGhpcy5fbWFwKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIG1ha2VSZWNvcmQodGhpcywgbmV3TWFwKTtcbiAgfSxcbiAga2V5czogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcC5rZXlzKCk7XG4gIH0sXG4gIHZhbHVlczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcC52YWx1ZXMoKTtcbiAgfSxcbiAgZW50cmllczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcC5lbnRyaWVzKCk7XG4gIH0sXG4gIHdhc0FsdGVyZWQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9tYXAud2FzQWx0ZXJlZCgpO1xuICB9LFxuICBfX2l0ZXJhdG9yOiBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcC5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICB9LFxuICBfX2l0ZXJhdGU6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIHJldHVybiBJdGVyYWJsZSh0aGlzLl9kZWZhdWx0VmFsdWVzKS5tYXAoKGZ1bmN0aW9uKF8sIGspIHtcbiAgICAgIHJldHVybiAkX18wLmdldChrKTtcbiAgICB9KSkuX19pdGVyYXRlKGZuLCByZXZlcnNlKTtcbiAgfSxcbiAgX19lbnN1cmVPd25lcjogZnVuY3Rpb24ob3duZXJJRCkge1xuICAgIGlmIChvd25lcklEID09PSB0aGlzLl9fb3duZXJJRCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciBuZXdNYXAgPSB0aGlzLl9tYXAgJiYgdGhpcy5fbWFwLl9fZW5zdXJlT3duZXIob3duZXJJRCk7XG4gICAgaWYgKCFvd25lcklEKSB7XG4gICAgICB0aGlzLl9fb3duZXJJRCA9IG93bmVySUQ7XG4gICAgICB0aGlzLl9tYXAgPSBuZXdNYXA7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIG1ha2VSZWNvcmQodGhpcywgbmV3TWFwLCBvd25lcklEKTtcbiAgfVxufSwge30sIEtleWVkQ29sbGVjdGlvbik7XG52YXIgUmVjb3JkUHJvdG90eXBlID0gUmVjb3JkLnByb3RvdHlwZTtcblJlY29yZFByb3RvdHlwZS5fbmFtZSA9ICdSZWNvcmQnO1xuUmVjb3JkUHJvdG90eXBlW0RFTEVURV0gPSBSZWNvcmRQcm90b3R5cGUucmVtb3ZlO1xuUmVjb3JkUHJvdG90eXBlLm1lcmdlID0gTWFwUHJvdG90eXBlLm1lcmdlO1xuUmVjb3JkUHJvdG90eXBlLm1lcmdlV2l0aCA9IE1hcFByb3RvdHlwZS5tZXJnZVdpdGg7XG5SZWNvcmRQcm90b3R5cGUubWVyZ2VEZWVwID0gTWFwUHJvdG90eXBlLm1lcmdlRGVlcDtcblJlY29yZFByb3RvdHlwZS5tZXJnZURlZXBXaXRoID0gTWFwUHJvdG90eXBlLm1lcmdlRGVlcFdpdGg7XG5SZWNvcmRQcm90b3R5cGUudXBkYXRlID0gTWFwUHJvdG90eXBlLnVwZGF0ZTtcblJlY29yZFByb3RvdHlwZS51cGRhdGVJbiA9IE1hcFByb3RvdHlwZS51cGRhdGVJbjtcblJlY29yZFByb3RvdHlwZS53aXRoTXV0YXRpb25zID0gTWFwUHJvdG90eXBlLndpdGhNdXRhdGlvbnM7XG5SZWNvcmRQcm90b3R5cGUuYXNNdXRhYmxlID0gTWFwUHJvdG90eXBlLmFzTXV0YWJsZTtcblJlY29yZFByb3RvdHlwZS5hc0ltbXV0YWJsZSA9IE1hcFByb3RvdHlwZS5hc0ltbXV0YWJsZTtcbmZ1bmN0aW9uIG1ha2VSZWNvcmQobGlrZVJlY29yZCwgbWFwLCBvd25lcklEKSB7XG4gIHZhciByZWNvcmQgPSBPYmplY3QuY3JlYXRlKE9iamVjdC5nZXRQcm90b3R5cGVPZihsaWtlUmVjb3JkKSk7XG4gIHJlY29yZC5fbWFwID0gbWFwO1xuICByZWNvcmQuX19vd25lcklEID0gb3duZXJJRDtcbiAgcmV0dXJuIHJlY29yZDtcbn1cbnZhciBSYW5nZSA9IGZ1bmN0aW9uIFJhbmdlKHN0YXJ0LCBlbmQsIHN0ZXApIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mICRSYW5nZSkpIHtcbiAgICByZXR1cm4gbmV3ICRSYW5nZShzdGFydCwgZW5kLCBzdGVwKTtcbiAgfVxuICBpbnZhcmlhbnQoc3RlcCAhPT0gMCwgJ0Nhbm5vdCBzdGVwIGEgUmFuZ2UgYnkgMCcpO1xuICBzdGFydCA9IHN0YXJ0IHx8IDA7XG4gIGlmIChlbmQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuZCA9IEluZmluaXR5O1xuICB9XG4gIGlmIChzdGFydCA9PT0gZW5kICYmIF9fRU1QVFlfUkFOR0UpIHtcbiAgICByZXR1cm4gX19FTVBUWV9SQU5HRTtcbiAgfVxuICBzdGVwID0gc3RlcCA9PT0gdW5kZWZpbmVkID8gMSA6IE1hdGguYWJzKHN0ZXApO1xuICBpZiAoZW5kIDwgc3RhcnQpIHtcbiAgICBzdGVwID0gLXN0ZXA7XG4gIH1cbiAgdGhpcy5fc3RhcnQgPSBzdGFydDtcbiAgdGhpcy5fZW5kID0gZW5kO1xuICB0aGlzLl9zdGVwID0gc3RlcDtcbiAgdGhpcy5zaXplID0gTWF0aC5tYXgoMCwgTWF0aC5jZWlsKChlbmQgLSBzdGFydCkgLyBzdGVwIC0gMSkgKyAxKTtcbn07XG52YXIgJFJhbmdlID0gUmFuZ2U7XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShSYW5nZSwge1xuICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuc2l6ZSA9PT0gMCkge1xuICAgICAgcmV0dXJuICdSYW5nZSBbXSc7XG4gICAgfVxuICAgIHJldHVybiAnUmFuZ2UgWyAnICsgdGhpcy5fc3RhcnQgKyAnLi4uJyArIHRoaXMuX2VuZCArICh0aGlzLl9zdGVwID4gMSA/ICcgYnkgJyArIHRoaXMuX3N0ZXAgOiAnJykgKyAnIF0nO1xuICB9LFxuICBnZXQ6IGZ1bmN0aW9uKGluZGV4LCBub3RTZXRWYWx1ZSkge1xuICAgIHJldHVybiB0aGlzLmhhcyhpbmRleCkgPyB0aGlzLl9zdGFydCArIHdyYXBJbmRleCh0aGlzLCBpbmRleCkgKiB0aGlzLl9zdGVwIDogbm90U2V0VmFsdWU7XG4gIH0sXG4gIGNvbnRhaW5zOiBmdW5jdGlvbihzZWFyY2hWYWx1ZSkge1xuICAgIHZhciBwb3NzaWJsZUluZGV4ID0gKHNlYXJjaFZhbHVlIC0gdGhpcy5fc3RhcnQpIC8gdGhpcy5fc3RlcDtcbiAgICByZXR1cm4gcG9zc2libGVJbmRleCA+PSAwICYmIHBvc3NpYmxlSW5kZXggPCB0aGlzLnNpemUgJiYgcG9zc2libGVJbmRleCA9PT0gTWF0aC5mbG9vcihwb3NzaWJsZUluZGV4KTtcbiAgfSxcbiAgc2xpY2U6IGZ1bmN0aW9uKGJlZ2luLCBlbmQpIHtcbiAgICBpZiAod2hvbGVTbGljZShiZWdpbiwgZW5kLCB0aGlzLnNpemUpKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgYmVnaW4gPSByZXNvbHZlQmVnaW4oYmVnaW4sIHRoaXMuc2l6ZSk7XG4gICAgZW5kID0gcmVzb2x2ZUVuZChlbmQsIHRoaXMuc2l6ZSk7XG4gICAgaWYgKGVuZCA8PSBiZWdpbikge1xuICAgICAgcmV0dXJuIF9fRU1QVFlfUkFOR0U7XG4gICAgfVxuICAgIHJldHVybiBuZXcgJFJhbmdlKHRoaXMuZ2V0KGJlZ2luLCB0aGlzLl9lbmQpLCB0aGlzLmdldChlbmQsIHRoaXMuX2VuZCksIHRoaXMuX3N0ZXApO1xuICB9LFxuICBpbmRleE9mOiBmdW5jdGlvbihzZWFyY2hWYWx1ZSkge1xuICAgIHZhciBvZmZzZXRWYWx1ZSA9IHNlYXJjaFZhbHVlIC0gdGhpcy5fc3RhcnQ7XG4gICAgaWYgKG9mZnNldFZhbHVlICUgdGhpcy5fc3RlcCA9PT0gMCkge1xuICAgICAgdmFyIGluZGV4ID0gb2Zmc2V0VmFsdWUgLyB0aGlzLl9zdGVwO1xuICAgICAgaWYgKGluZGV4ID49IDAgJiYgaW5kZXggPCB0aGlzLnNpemUpIHtcbiAgICAgICAgcmV0dXJuIGluZGV4O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG4gIH0sXG4gIGxhc3RJbmRleE9mOiBmdW5jdGlvbihzZWFyY2hWYWx1ZSkge1xuICAgIHJldHVybiB0aGlzLmluZGV4T2Yoc2VhcmNoVmFsdWUpO1xuICB9LFxuICB0YWtlOiBmdW5jdGlvbihhbW91bnQpIHtcbiAgICByZXR1cm4gdGhpcy5zbGljZSgwLCBNYXRoLm1heCgwLCBhbW91bnQpKTtcbiAgfSxcbiAgc2tpcDogZnVuY3Rpb24oYW1vdW50KSB7XG4gICAgcmV0dXJuIHRoaXMuc2xpY2UoTWF0aC5tYXgoMCwgYW1vdW50KSk7XG4gIH0sXG4gIF9faXRlcmF0ZTogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgbWF4SW5kZXggPSB0aGlzLnNpemUgLSAxO1xuICAgIHZhciBzdGVwID0gdGhpcy5fc3RlcDtcbiAgICB2YXIgdmFsdWUgPSByZXZlcnNlID8gdGhpcy5fc3RhcnQgKyBtYXhJbmRleCAqIHN0ZXAgOiB0aGlzLl9zdGFydDtcbiAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDw9IG1heEluZGV4OyBpaSsrKSB7XG4gICAgICBpZiAoZm4odmFsdWUsIGlpLCB0aGlzKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIGlpICsgMTtcbiAgICAgIH1cbiAgICAgIHZhbHVlICs9IHJldmVyc2UgPyAtc3RlcCA6IHN0ZXA7XG4gICAgfVxuICAgIHJldHVybiBpaTtcbiAgfSxcbiAgX19pdGVyYXRvcjogZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHZhciBtYXhJbmRleCA9IHRoaXMuc2l6ZSAtIDE7XG4gICAgdmFyIHN0ZXAgPSB0aGlzLl9zdGVwO1xuICAgIHZhciB2YWx1ZSA9IHJldmVyc2UgPyB0aGlzLl9zdGFydCArIG1heEluZGV4ICogc3RlcCA6IHRoaXMuX3N0YXJ0O1xuICAgIHZhciBpaSA9IDA7XG4gICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdiA9IHZhbHVlO1xuICAgICAgdmFsdWUgKz0gcmV2ZXJzZSA/IC1zdGVwIDogc3RlcDtcbiAgICAgIHJldHVybiBpaSA+IG1heEluZGV4ID8gaXRlcmF0b3JEb25lKCkgOiBpdGVyYXRvclZhbHVlKHR5cGUsIGlpKyssIHYpO1xuICAgIH0pKTtcbiAgfSxcbiAgX19kZWVwRXF1YWxzOiBmdW5jdGlvbihvdGhlcikge1xuICAgIHJldHVybiBvdGhlciBpbnN0YW5jZW9mICRSYW5nZSA/IHRoaXMuX3N0YXJ0ID09PSBvdGhlci5fc3RhcnQgJiYgdGhpcy5fZW5kID09PSBvdGhlci5fZW5kICYmIHRoaXMuX3N0ZXAgPT09IG90aGVyLl9zdGVwIDogJHRyYWNldXJSdW50aW1lLnN1cGVyQ2FsbCh0aGlzLCAkUmFuZ2UucHJvdG90eXBlLCBcIl9fZGVlcEVxdWFsc1wiLCBbb3RoZXJdKTtcbiAgfVxufSwge30sIEluZGV4ZWRTZXEpO1xudmFyIFJhbmdlUHJvdG90eXBlID0gUmFuZ2UucHJvdG90eXBlO1xuUmFuZ2VQcm90b3R5cGUuX190b0pTID0gUmFuZ2VQcm90b3R5cGUudG9BcnJheTtcblJhbmdlUHJvdG90eXBlLmZpcnN0ID0gTGlzdFByb3RvdHlwZS5maXJzdDtcblJhbmdlUHJvdG90eXBlLmxhc3QgPSBMaXN0UHJvdG90eXBlLmxhc3Q7XG52YXIgX19FTVBUWV9SQU5HRSA9IFJhbmdlKDAsIDApO1xudmFyIFJlcGVhdCA9IGZ1bmN0aW9uIFJlcGVhdCh2YWx1ZSwgdGltZXMpIHtcbiAgaWYgKHRpbWVzIDw9IDAgJiYgRU1QVFlfUkVQRUFUKSB7XG4gICAgcmV0dXJuIEVNUFRZX1JFUEVBVDtcbiAgfVxuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgJFJlcGVhdCkpIHtcbiAgICByZXR1cm4gbmV3ICRSZXBlYXQodmFsdWUsIHRpbWVzKTtcbiAgfVxuICB0aGlzLl92YWx1ZSA9IHZhbHVlO1xuICB0aGlzLnNpemUgPSB0aW1lcyA9PT0gdW5kZWZpbmVkID8gSW5maW5pdHkgOiBNYXRoLm1heCgwLCB0aW1lcyk7XG4gIGlmICh0aGlzLnNpemUgPT09IDApIHtcbiAgICBFTVBUWV9SRVBFQVQgPSB0aGlzO1xuICB9XG59O1xudmFyICRSZXBlYXQgPSBSZXBlYXQ7XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShSZXBlYXQsIHtcbiAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnNpemUgPT09IDApIHtcbiAgICAgIHJldHVybiAnUmVwZWF0IFtdJztcbiAgICB9XG4gICAgcmV0dXJuICdSZXBlYXQgWyAnICsgdGhpcy5fdmFsdWUgKyAnICcgKyB0aGlzLnNpemUgKyAnIHRpbWVzIF0nO1xuICB9LFxuICBnZXQ6IGZ1bmN0aW9uKGluZGV4LCBub3RTZXRWYWx1ZSkge1xuICAgIHJldHVybiB0aGlzLmhhcyhpbmRleCkgPyB0aGlzLl92YWx1ZSA6IG5vdFNldFZhbHVlO1xuICB9LFxuICBjb250YWluczogZnVuY3Rpb24oc2VhcmNoVmFsdWUpIHtcbiAgICByZXR1cm4gaXModGhpcy5fdmFsdWUsIHNlYXJjaFZhbHVlKTtcbiAgfSxcbiAgc2xpY2U6IGZ1bmN0aW9uKGJlZ2luLCBlbmQpIHtcbiAgICB2YXIgc2l6ZSA9IHRoaXMuc2l6ZTtcbiAgICByZXR1cm4gd2hvbGVTbGljZShiZWdpbiwgZW5kLCBzaXplKSA/IHRoaXMgOiBuZXcgJFJlcGVhdCh0aGlzLl92YWx1ZSwgcmVzb2x2ZUVuZChlbmQsIHNpemUpIC0gcmVzb2x2ZUJlZ2luKGJlZ2luLCBzaXplKSk7XG4gIH0sXG4gIHJldmVyc2U6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBpbmRleE9mOiBmdW5jdGlvbihzZWFyY2hWYWx1ZSkge1xuICAgIGlmIChpcyh0aGlzLl92YWx1ZSwgc2VhcmNoVmFsdWUpKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgcmV0dXJuIC0xO1xuICB9LFxuICBsYXN0SW5kZXhPZjogZnVuY3Rpb24oc2VhcmNoVmFsdWUpIHtcbiAgICBpZiAoaXModGhpcy5fdmFsdWUsIHNlYXJjaFZhbHVlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuc2l6ZTtcbiAgICB9XG4gICAgcmV0dXJuIC0xO1xuICB9LFxuICBfX2l0ZXJhdGU6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IHRoaXMuc2l6ZTsgaWkrKykge1xuICAgICAgaWYgKGZuKHRoaXMuX3ZhbHVlLCBpaSwgdGhpcykgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBpaSArIDE7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpaTtcbiAgfSxcbiAgX19pdGVyYXRvcjogZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICB2YXIgaWkgPSAwO1xuICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGlpIDwgJF9fMC5zaXplID8gaXRlcmF0b3JWYWx1ZSh0eXBlLCBpaSsrLCAkX18wLl92YWx1ZSkgOiBpdGVyYXRvckRvbmUoKTtcbiAgICB9KSk7XG4gIH0sXG4gIF9fZGVlcEVxdWFsczogZnVuY3Rpb24ob3RoZXIpIHtcbiAgICByZXR1cm4gb3RoZXIgaW5zdGFuY2VvZiAkUmVwZWF0ID8gaXModGhpcy5fdmFsdWUsIG90aGVyLl92YWx1ZSkgOiAkdHJhY2V1clJ1bnRpbWUuc3VwZXJDYWxsKHRoaXMsICRSZXBlYXQucHJvdG90eXBlLCBcIl9fZGVlcEVxdWFsc1wiLCBbb3RoZXJdKTtcbiAgfVxufSwge30sIEluZGV4ZWRTZXEpO1xudmFyIFJlcGVhdFByb3RvdHlwZSA9IFJlcGVhdC5wcm90b3R5cGU7XG5SZXBlYXRQcm90b3R5cGUubGFzdCA9IFJlcGVhdFByb3RvdHlwZS5maXJzdDtcblJlcGVhdFByb3RvdHlwZS5oYXMgPSBSYW5nZVByb3RvdHlwZS5oYXM7XG5SZXBlYXRQcm90b3R5cGUudGFrZSA9IFJhbmdlUHJvdG90eXBlLnRha2U7XG5SZXBlYXRQcm90b3R5cGUuc2tpcCA9IFJhbmdlUHJvdG90eXBlLnNraXA7XG5SZXBlYXRQcm90b3R5cGUuX190b0pTID0gUmFuZ2VQcm90b3R5cGUuX190b0pTO1xudmFyIEVNUFRZX1JFUEVBVDtcbnZhciBJbW11dGFibGUgPSB7XG4gIEl0ZXJhYmxlOiBJdGVyYWJsZSxcbiAgU2VxOiBTZXEsXG4gIENvbGxlY3Rpb246IENvbGxlY3Rpb24sXG4gIE1hcDogTWFwLFxuICBMaXN0OiBMaXN0LFxuICBTdGFjazogU3RhY2ssXG4gIFNldDogU2V0LFxuICBPcmRlcmVkTWFwOiBPcmRlcmVkTWFwLFxuICBSZWNvcmQ6IFJlY29yZCxcbiAgUmFuZ2U6IFJhbmdlLFxuICBSZXBlYXQ6IFJlcGVhdCxcbiAgaXM6IGlzLFxuICBmcm9tSlM6IGZyb21KU1xufTtcblxuICByZXR1cm4gSW1tdXRhYmxlO1xufVxudHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnID8gbW9kdWxlLmV4cG9ydHMgPSB1bml2ZXJzYWxNb2R1bGUoKSA6XG4gIHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSh1bml2ZXJzYWxNb2R1bGUpIDpcbiAgICBJbW11dGFibGUgPSB1bml2ZXJzYWxNb2R1bGUoKTtcbiIsIi8vIENvcHlyaWdodCAoYykgMjAxNCBQYXRyaWNrIER1YnJveSA8cGR1YnJveUBnbWFpbC5jb20+XG4vLyBUaGlzIHNvZnR3YXJlIGlzIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgTUlUIExpY2Vuc2UuXG5cbi8qIGdsb2JhbCAtV2Vha01hcCAqL1xuXG52YXIgZXh0ZW5kID0gcmVxdWlyZSgndXRpbC1leHRlbmQnKSxcbiAgICBXZWFrTWFwID0gcmVxdWlyZSgnLi90aGlyZF9wYXJ0eS9XZWFrTWFwJyk7XG5cbi8vIEFuIGludGVybmFsIG9iamVjdCB0aGF0IGNhbiBiZSByZXR1cm5lZCBmcm9tIGEgdmlzaXRvciBmdW5jdGlvbiB0b1xuLy8gcHJldmVudCBhIHRvcC1kb3duIHdhbGsgZnJvbSB3YWxraW5nIHN1YnRyZWVzIG9mIGEgbm9kZS5cbnZhciBzdG9wUmVjdXJzaW9uID0ge307XG5cbi8vIEFuIGludGVybmFsIG9iamVjdCB0aGF0IGNhbiBiZSByZXR1cm5lZCBmcm9tIGEgdmlzaXRvciBmdW5jdGlvbiB0b1xuLy8gY2F1c2UgdGhlIHdhbGsgdG8gaW1tZWRpYXRlbHkgc3RvcC5cbnZhciBzdG9wV2FsayA9IHt9O1xuXG52YXIgaGFzT3duUHJvcCA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbi8vIEhlbHBlcnNcbi8vIC0tLS0tLS1cblxuZnVuY3Rpb24gaXNFbGVtZW50KG9iaikge1xuICByZXR1cm4gISEob2JqICYmIG9iai5ub2RlVHlwZSA9PT0gMSk7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KG9iaikge1xuICB2YXIgdHlwZSA9IHR5cGVvZiBvYmo7XG4gIHJldHVybiB0eXBlID09PSAnZnVuY3Rpb24nIHx8IHR5cGUgPT09ICdvYmplY3QnICYmICEhb2JqO1xufVxuXG5mdW5jdGlvbiBlYWNoKG9iaiwgcHJlZGljYXRlKSB7XG4gIGZvciAodmFyIGsgaW4gb2JqKSB7XG4gICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgaWYgKHByZWRpY2F0ZShvYmpba10sIGssIG9iaikpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8vIE1ha2VzIGEgc2hhbGxvdyBjb3B5IG9mIGBhcnJgLCBhbmQgYWRkcyBgb2JqYCB0byB0aGUgZW5kIG9mIHRoZSBjb3B5LlxuZnVuY3Rpb24gY29weUFuZFB1c2goYXJyLCBvYmopIHtcbiAgdmFyIHJlc3VsdCA9IGFyci5zbGljZSgpO1xuICByZXN1bHQucHVzaChvYmopO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vLyBJbXBsZW1lbnRzIHRoZSBkZWZhdWx0IHRyYXZlcnNhbCBzdHJhdGVneTogaWYgYG9iamAgaXMgYSBET00gbm9kZSwgd2Fsa1xuLy8gaXRzIERPTSBjaGlsZHJlbjsgb3RoZXJ3aXNlLCB3YWxrIGFsbCB0aGUgb2JqZWN0cyBpdCByZWZlcmVuY2VzLlxuZnVuY3Rpb24gZGVmYXVsdFRyYXZlcnNhbChvYmopIHtcbiAgcmV0dXJuIGlzRWxlbWVudChvYmopID8gb2JqLmNoaWxkcmVuIDogb2JqO1xufVxuXG4vLyBXYWxrIHRoZSB0cmVlIHJlY3Vyc2l2ZWx5IGJlZ2lubmluZyB3aXRoIGByb290YCwgY2FsbGluZyBgYmVmb3JlRnVuY2Bcbi8vIGJlZm9yZSB2aXNpdGluZyBhbiBvYmplY3RzIGRlc2NlbmRlbnRzLCBhbmQgYGFmdGVyRnVuY2AgYWZ0ZXJ3YXJkcy5cbi8vIElmIGBjb2xsZWN0UmVzdWx0c2AgaXMgdHJ1ZSwgdGhlIGxhc3QgYXJndW1lbnQgdG8gYGFmdGVyRnVuY2Agd2lsbCBiZSBhXG4vLyBjb2xsZWN0aW9uIG9mIHRoZSByZXN1bHRzIG9mIHdhbGtpbmcgdGhlIG5vZGUncyBzdWJ0cmVlcy5cbmZ1bmN0aW9uIHdhbGtJbXBsKHJvb3QsIHRyYXZlcnNhbFN0cmF0ZWd5LCBiZWZvcmVGdW5jLCBhZnRlckZ1bmMsIGNvbnRleHQsIGNvbGxlY3RSZXN1bHRzKSB7XG4gIHJldHVybiAoZnVuY3Rpb24gX3dhbGsoc3RhY2ssIHZhbHVlLCBrZXksIHBhcmVudCkge1xuICAgIGlmIChpc09iamVjdCh2YWx1ZSkgJiYgc3RhY2suaW5kZXhPZih2YWx1ZSkgPj0gMClcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0EgY3ljbGUgd2FzIGRldGVjdGVkIGF0ICcgKyB2YWx1ZSk7XG5cbiAgICBpZiAoYmVmb3JlRnVuYykge1xuICAgICAgdmFyIHJlc3VsdCA9IGJlZm9yZUZ1bmMuY2FsbChjb250ZXh0LCB2YWx1ZSwga2V5LCBwYXJlbnQpO1xuICAgICAgaWYgKHJlc3VsdCA9PT0gc3RvcFdhbGspIHJldHVybiBzdG9wV2FsaztcbiAgICAgIGlmIChyZXN1bHQgPT09IHN0b3BSZWN1cnNpb24pIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc3ViUmVzdWx0cztcbiAgICB2YXIgdGFyZ2V0ID0gdHJhdmVyc2FsU3RyYXRlZ3kodmFsdWUpO1xuXG4gICAgaWYgKGlzT2JqZWN0KHRhcmdldCkgJiYgT2JqZWN0LmtleXModGFyZ2V0KS5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBDb2xsZWN0IHJlc3VsdHMgZnJvbSBzdWJ0cmVlcyBpbiB0aGUgc2FtZSBzaGFwZSBhcyB0aGUgdGFyZ2V0LlxuICAgICAgaWYgKGNvbGxlY3RSZXN1bHRzKSBzdWJSZXN1bHRzID0gQXJyYXkuaXNBcnJheSh0YXJnZXQpID8gW10gOiB7fTtcblxuICAgICAgdmFyIG9rID0gZWFjaCh0YXJnZXQsIGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBfd2Fsayhjb3B5QW5kUHVzaChzdGFjaywgdmFsdWUpLCBvYmosIGtleSwgdmFsdWUpO1xuICAgICAgICBpZiAocmVzdWx0ID09PSBzdG9wV2FsaykgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoc3ViUmVzdWx0cykgc3ViUmVzdWx0c1trZXldID0gcmVzdWx0O1xuICAgICAgfSk7XG4gICAgICBpZiAoIW9rKSByZXR1cm4gc3RvcFdhbGs7XG4gICAgfVxuICAgIGlmIChhZnRlckZ1bmMpIHJldHVybiBhZnRlckZ1bmMuY2FsbChjb250ZXh0LCB2YWx1ZSwga2V5LCBwYXJlbnQsIHN1YlJlc3VsdHMpO1xuICB9KShbXSwgcm9vdCk7XG59XG5cbi8vIEludGVybmFsIGhlbHBlciBwcm92aWRpbmcgdGhlIGltcGxlbWVudGF0aW9uIGZvciBgcGx1Y2tgIGFuZCBgcGx1Y2tSZWNgLlxuZnVuY3Rpb24gcGx1Y2sob2JqLCBwcm9wZXJ0eU5hbWUsIHJlY3Vyc2l2ZSkge1xuICB2YXIgcmVzdWx0cyA9IFtdO1xuICB0aGlzLnByZW9yZGVyKG9iaiwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgIGlmICghcmVjdXJzaXZlICYmIGtleSA9PSBwcm9wZXJ0eU5hbWUpXG4gICAgICByZXR1cm4gc3RvcFJlY3Vyc2lvbjtcbiAgICBpZiAoaGFzT3duUHJvcC5jYWxsKHZhbHVlLCBwcm9wZXJ0eU5hbWUpKVxuICAgICAgcmVzdWx0c1tyZXN1bHRzLmxlbmd0aF0gPSB2YWx1ZVtwcm9wZXJ0eU5hbWVdO1xuICB9KTtcbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmZ1bmN0aW9uIGRlZmluZUVudW1lcmFibGVQcm9wZXJ0eShvYmosIHByb3BOYW1lLCBnZXR0ZXJGbikge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBwcm9wTmFtZSwge1xuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgZ2V0OiBnZXR0ZXJGblxuICB9KTtcbn1cblxuLy8gUmV0dXJucyBhbiBvYmplY3QgY29udGFpbmluZyB0aGUgd2FsayBmdW5jdGlvbnMuIElmIGB0cmF2ZXJzYWxTdHJhdGVneWBcbi8vIGlzIHNwZWNpZmllZCwgaXQgaXMgYSBmdW5jdGlvbiBkZXRlcm1pbmluZyBob3cgb2JqZWN0cyBzaG91bGQgYmVcbi8vIHRyYXZlcnNlZC4gR2l2ZW4gYW4gb2JqZWN0LCBpdCByZXR1cm5zIHRoZSBvYmplY3QgdG8gYmUgcmVjdXJzaXZlbHlcbi8vIHdhbGtlZC4gVGhlIGRlZmF1bHQgc3RyYXRlZ3kgaXMgZXF1aXZhbGVudCB0byBgXy5pZGVudGl0eWAgZm9yIHJlZ3VsYXJcbi8vIG9iamVjdHMsIGFuZCBmb3IgRE9NIG5vZGVzIGl0IHJldHVybnMgdGhlIG5vZGUncyBET00gY2hpbGRyZW4uXG5mdW5jdGlvbiBXYWxrZXIodHJhdmVyc2FsU3RyYXRlZ3kpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdhbGtlcikpXG4gICAgcmV0dXJuIG5ldyBXYWxrZXIodHJhdmVyc2FsU3RyYXRlZ3kpO1xuICB0aGlzLl90cmF2ZXJzYWxTdHJhdGVneSA9IHRyYXZlcnNhbFN0cmF0ZWd5IHx8IGRlZmF1bHRUcmF2ZXJzYWw7XG59XG5cbmV4dGVuZChXYWxrZXIucHJvdG90eXBlLCB7XG4gIC8vIFBlcmZvcm1zIGEgcHJlb3JkZXIgdHJhdmVyc2FsIG9mIGBvYmpgIGFuZCByZXR1cm5zIHRoZSBmaXJzdCB2YWx1ZVxuICAvLyB3aGljaCBwYXNzZXMgYSB0cnV0aCB0ZXN0LlxuICBmaW5kOiBmdW5jdGlvbihvYmosIHZpc2l0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIHRoaXMucHJlb3JkZXIob2JqLCBmdW5jdGlvbih2YWx1ZSwga2V5LCBwYXJlbnQpIHtcbiAgICAgIGlmICh2aXNpdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGtleSwgcGFyZW50KSkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHN0b3BXYWxrO1xuICAgICAgfVxuICAgIH0sIGNvbnRleHQpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH0sXG5cbiAgLy8gUmVjdXJzaXZlbHkgdHJhdmVyc2VzIGBvYmpgIGFuZCByZXR1cm5zIGFsbCB0aGUgZWxlbWVudHMgdGhhdCBwYXNzIGFcbiAgLy8gdHJ1dGggdGVzdC4gYHN0cmF0ZWd5YCBpcyB0aGUgdHJhdmVyc2FsIGZ1bmN0aW9uIHRvIHVzZSwgZS5nLiBgcHJlb3JkZXJgXG4gIC8vIG9yIGBwb3N0b3JkZXJgLlxuICBmaWx0ZXI6IGZ1bmN0aW9uKG9iaiwgc3RyYXRlZ3ksIHZpc2l0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIGlmIChvYmogPT09IG51bGwpIHJldHVybiByZXN1bHRzO1xuICAgIHN0cmF0ZWd5KG9iaiwgZnVuY3Rpb24odmFsdWUsIGtleSwgcGFyZW50KSB7XG4gICAgICBpZiAodmlzaXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBrZXksIHBhcmVudCkpIHJlc3VsdHMucHVzaCh2YWx1ZSk7XG4gICAgfSwgbnVsbCwgdGhpcy5fdHJhdmVyc2FsU3RyYXRlZ3kpO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9LFxuXG4gIC8vIFJlY3Vyc2l2ZWx5IHRyYXZlcnNlcyBgb2JqYCBhbmQgcmV0dXJucyBhbGwgdGhlIGVsZW1lbnRzIGZvciB3aGljaCBhXG4gIC8vIHRydXRoIHRlc3QgZmFpbHMuXG4gIHJlamVjdDogZnVuY3Rpb24ob2JqLCBzdHJhdGVneSwgdmlzaXRvciwgY29udGV4dCkge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcihvYmosIHN0cmF0ZWd5LCBmdW5jdGlvbih2YWx1ZSwga2V5LCBwYXJlbnQpIHtcbiAgICAgIHJldHVybiAhdmlzaXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBrZXksIHBhcmVudCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gUHJvZHVjZXMgYSBuZXcgYXJyYXkgb2YgdmFsdWVzIGJ5IHJlY3Vyc2l2ZWx5IHRyYXZlcnNpbmcgYG9iamAgYW5kXG4gIC8vIG1hcHBpbmcgZWFjaCB2YWx1ZSB0aHJvdWdoIHRoZSB0cmFuc2Zvcm1hdGlvbiBmdW5jdGlvbiBgdmlzaXRvcmAuXG4gIC8vIGBzdHJhdGVneWAgaXMgdGhlIHRyYXZlcnNhbCBmdW5jdGlvbiB0byB1c2UsIGUuZy4gYHByZW9yZGVyYCBvclxuICAvLyBgcG9zdG9yZGVyYC5cbiAgbWFwOiBmdW5jdGlvbihvYmosIHN0cmF0ZWd5LCB2aXNpdG9yLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICBzdHJhdGVneShvYmosIGZ1bmN0aW9uKHZhbHVlLCBrZXksIHBhcmVudCkge1xuICAgICAgcmVzdWx0c1tyZXN1bHRzLmxlbmd0aF0gPSB2aXNpdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGtleSwgcGFyZW50KTtcbiAgICB9LCBudWxsLCB0aGlzLl90cmF2ZXJzYWxTdHJhdGVneSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH0sXG5cbiAgLy8gUmV0dXJuIHRoZSB2YWx1ZSBvZiBwcm9wZXJ0aWVzIG5hbWVkIGBwcm9wZXJ0eU5hbWVgIHJlYWNoYWJsZSBmcm9tIHRoZVxuICAvLyB0cmVlIHJvb3RlZCBhdCBgb2JqYC4gUmVzdWx0cyBhcmUgbm90IHJlY3Vyc2l2ZWx5IHNlYXJjaGVkOyB1c2VcbiAgLy8gYHBsdWNrUmVjYCBmb3IgdGhhdC5cbiAgcGx1Y2s6IGZ1bmN0aW9uKG9iaiwgcHJvcGVydHlOYW1lKSB7XG4gICAgcmV0dXJuIHBsdWNrLmNhbGwodGhpcywgb2JqLCBwcm9wZXJ0eU5hbWUsIGZhbHNlKTtcbiAgfSxcblxuICAvLyBWZXJzaW9uIG9mIGBwbHVja2Agd2hpY2ggcmVjdXJzaXZlbHkgc2VhcmNoZXMgcmVzdWx0cyBmb3IgbmVzdGVkIG9iamVjdHNcbiAgLy8gd2l0aCBhIHByb3BlcnR5IG5hbWVkIGBwcm9wZXJ0eU5hbWVgLlxuICBwbHVja1JlYzogZnVuY3Rpb24ob2JqLCBwcm9wZXJ0eU5hbWUpIHtcbiAgICByZXR1cm4gcGx1Y2suY2FsbCh0aGlzLCBvYmosIHByb3BlcnR5TmFtZSwgdHJ1ZSk7XG4gIH0sXG5cbiAgLy8gUmVjdXJzaXZlbHkgdHJhdmVyc2VzIGBvYmpgIGluIGEgZGVwdGgtZmlyc3QgZmFzaGlvbiwgaW52b2tpbmcgdGhlXG4gIC8vIGB2aXNpdG9yYCBmdW5jdGlvbiBmb3IgZWFjaCBvYmplY3Qgb25seSBhZnRlciB0cmF2ZXJzaW5nIGl0cyBjaGlsZHJlbi5cbiAgLy8gYHRyYXZlcnNhbFN0cmF0ZWd5YCBpcyBpbnRlbmRlZCBmb3IgaW50ZXJuYWwgY2FsbGVycywgYW5kIGlzIG5vdCBwYXJ0XG4gIC8vIG9mIHRoZSBwdWJsaWMgQVBJLlxuICBwb3N0b3JkZXI6IGZ1bmN0aW9uKG9iaiwgdmlzaXRvciwgY29udGV4dCwgdHJhdmVyc2FsU3RyYXRlZ3kpIHtcbiAgICB0cmF2ZXJzYWxTdHJhdGVneSA9IHRyYXZlcnNhbFN0cmF0ZWd5IHx8IHRoaXMuX3RyYXZlcnNhbFN0cmF0ZWd5O1xuICAgIHdhbGtJbXBsKG9iaiwgdHJhdmVyc2FsU3RyYXRlZ3ksIG51bGwsIHZpc2l0b3IsIGNvbnRleHQpO1xuICB9LFxuXG4gIC8vIFJlY3Vyc2l2ZWx5IHRyYXZlcnNlcyBgb2JqYCBpbiBhIGRlcHRoLWZpcnN0IGZhc2hpb24sIGludm9raW5nIHRoZVxuICAvLyBgdmlzaXRvcmAgZnVuY3Rpb24gZm9yIGVhY2ggb2JqZWN0IGJlZm9yZSB0cmF2ZXJzaW5nIGl0cyBjaGlsZHJlbi5cbiAgLy8gYHRyYXZlcnNhbFN0cmF0ZWd5YCBpcyBpbnRlbmRlZCBmb3IgaW50ZXJuYWwgY2FsbGVycywgYW5kIGlzIG5vdCBwYXJ0XG4gIC8vIG9mIHRoZSBwdWJsaWMgQVBJLlxuICBwcmVvcmRlcjogZnVuY3Rpb24ob2JqLCB2aXNpdG9yLCBjb250ZXh0LCB0cmF2ZXJzYWxTdHJhdGVneSkge1xuICAgIHRyYXZlcnNhbFN0cmF0ZWd5ID0gdHJhdmVyc2FsU3RyYXRlZ3kgfHwgdGhpcy5fdHJhdmVyc2FsU3RyYXRlZ3k7XG4gICAgd2Fsa0ltcGwob2JqLCB0cmF2ZXJzYWxTdHJhdGVneSwgdmlzaXRvciwgbnVsbCwgY29udGV4dCk7XG4gIH0sXG5cbiAgLy8gQnVpbGRzIHVwIGEgc2luZ2xlIHZhbHVlIGJ5IGRvaW5nIGEgcG9zdC1vcmRlciB0cmF2ZXJzYWwgb2YgYG9iamAgYW5kXG4gIC8vIGNhbGxpbmcgdGhlIGB2aXNpdG9yYCBmdW5jdGlvbiBvbiBlYWNoIG9iamVjdCBpbiB0aGUgdHJlZS4gRm9yIGxlYWZcbiAgLy8gb2JqZWN0cywgdGhlIGBtZW1vYCBhcmd1bWVudCB0byBgdmlzaXRvcmAgaXMgdGhlIHZhbHVlIG9mIHRoZSBgbGVhZk1lbW9gXG4gIC8vIGFyZ3VtZW50IHRvIGByZWR1Y2VgLiBGb3Igbm9uLWxlYWYgb2JqZWN0cywgYG1lbW9gIGlzIGEgY29sbGVjdGlvbiBvZlxuICAvLyB0aGUgcmVzdWx0cyBvZiBjYWxsaW5nIGByZWR1Y2VgIG9uIHRoZSBvYmplY3QncyBjaGlsZHJlbi5cbiAgcmVkdWNlOiBmdW5jdGlvbihvYmosIHZpc2l0b3IsIGxlYWZNZW1vLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlZHVjZXIgPSBmdW5jdGlvbih2YWx1ZSwga2V5LCBwYXJlbnQsIHN1YlJlc3VsdHMpIHtcbiAgICAgIHJldHVybiB2aXNpdG9yKHN1YlJlc3VsdHMgfHwgbGVhZk1lbW8sIHZhbHVlLCBrZXksIHBhcmVudCk7XG4gICAgfTtcbiAgICByZXR1cm4gd2Fsa0ltcGwob2JqLCB0aGlzLl90cmF2ZXJzYWxTdHJhdGVneSwgbnVsbCwgcmVkdWNlciwgY29udGV4dCwgdHJ1ZSk7XG4gIH0sXG5cbiAgLy8gQW4gJ2F0dHJpYnV0ZScgaXMgYSB2YWx1ZSB0aGF0IGlzIGNhbGN1bGF0ZWQgYnkgaW52b2tpbmcgYSB2aXNpdG9yXG4gIC8vIGZ1bmN0aW9uIG9uIGEgbm9kZS4gVGhlIGZpcnN0IGFyZ3VtZW50IG9mIHRoZSB2aXNpdG9yIGlzIGEgY29sbGVjdGlvblxuICAvLyBvZiB0aGUgYXR0cmlidXRlIHZhbHVlcyBmb3IgdGhlIG5vZGUncyBjaGlsZHJlbi4gVGhlc2UgYXJlIGNhbGN1bGF0ZWRcbiAgLy8gbGF6aWx5IC0tIGluIHRoaXMgd2F5IHRoZSB2aXNpdG9yIGNhbiBkZWNpZGUgaW4gd2hhdCBvcmRlciB0byB2aXNpdCB0aGVcbiAgLy8gc3VidHJlZXMuXG4gIGNyZWF0ZUF0dHJpYnV0ZTogZnVuY3Rpb24odmlzaXRvciwgZGVmYXVsdFZhbHVlLCBjb250ZXh0KSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBtZW1vID0gbmV3IFdlYWtNYXAoKTtcbiAgICBmdW5jdGlvbiBfdmlzaXQoc3RhY2ssIHZhbHVlLCBrZXksIHBhcmVudCkge1xuICAgICAgaWYgKGlzT2JqZWN0KHZhbHVlKSAmJiBzdGFjay5pbmRleE9mKHZhbHVlKSA+PSAwKVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBIGN5Y2xlIHdhcyBkZXRlY3RlZCBhdCAnICsgdmFsdWUpO1xuXG4gICAgICBpZiAobWVtby5oYXModmFsdWUpKVxuICAgICAgICByZXR1cm4gbWVtby5nZXQodmFsdWUpO1xuXG4gICAgICB2YXIgc3ViUmVzdWx0cztcbiAgICAgIHZhciB0YXJnZXQgPSBzZWxmLl90cmF2ZXJzYWxTdHJhdGVneSh2YWx1ZSk7XG4gICAgICBpZiAoaXNPYmplY3QodGFyZ2V0KSAmJiBPYmplY3Qua2V5cyh0YXJnZXQpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgc3ViUmVzdWx0cyA9IHt9O1xuICAgICAgICBlYWNoKHRhcmdldCwgZnVuY3Rpb24oY2hpbGQsIGspIHtcbiAgICAgICAgICBkZWZpbmVFbnVtZXJhYmxlUHJvcGVydHkoc3ViUmVzdWx0cywgaywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gX3Zpc2l0KGNvcHlBbmRQdXNoKHN0YWNrLHZhbHVlKSwgY2hpbGQsIGssIHZhbHVlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICB2YXIgcmVzdWx0ID0gdmlzaXRvci5jYWxsKGNvbnRleHQsIHN1YlJlc3VsdHMsIHZhbHVlLCBrZXksIHBhcmVudCk7XG4gICAgICBtZW1vLnNldCh2YWx1ZSwgcmVzdWx0KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHsgcmV0dXJuIF92aXNpdChbXSwgb2JqKTsgfTtcbiAgfVxufSk7XG5cbnZhciBXYWxrZXJQcm90byA9IFdhbGtlci5wcm90b3R5cGU7XG5cbi8vIFNldCB1cCBhIGZldyBjb252ZW5pZW50IGFsaWFzZXMuXG5XYWxrZXJQcm90by5lYWNoID0gV2Fsa2VyUHJvdG8ucHJlb3JkZXI7XG5XYWxrZXJQcm90by5jb2xsZWN0ID0gV2Fsa2VyUHJvdG8ubWFwO1xuV2Fsa2VyUHJvdG8uZGV0ZWN0ID0gV2Fsa2VyUHJvdG8uZmluZDtcbldhbGtlclByb3RvLnNlbGVjdCA9IFdhbGtlclByb3RvLmZpbHRlcjtcblxuLy8gRXhwb3J0IHRoZSB3YWxrZXIgY29uc3RydWN0b3IsIGJ1dCBtYWtlIGl0IGJlaGF2ZSBsaWtlIGFuIGluc3RhbmNlLlxuV2Fsa2VyLl90cmF2ZXJzYWxTdHJhdGVneSA9IGRlZmF1bHRUcmF2ZXJzYWw7XG5tb2R1bGUuZXhwb3J0cyA9IGV4dGVuZChXYWxrZXIsIFdhbGtlclByb3RvKTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5tb2R1bGUuZXhwb3J0cyA9IGV4dGVuZDtcbmZ1bmN0aW9uIGV4dGVuZChvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8IHR5cGVvZiBhZGQgIT09ICdvYmplY3QnKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufVxuIiwiLypcbiAqIENvcHlyaWdodCAyMDEyIFRoZSBQb2x5bWVyIEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhIEJTRC1zdHlsZVxuICogbGljZW5zZSB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlLlxuICovXG5cbmlmICh0eXBlb2YgV2Vha01hcCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIHZhciBkZWZpbmVQcm9wZXJ0eSA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eTtcbiAgICB2YXIgY291bnRlciA9IERhdGUubm93KCkgJSAxZTk7XG5cbiAgICB2YXIgV2Vha01hcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5uYW1lID0gJ19fc3QnICsgKE1hdGgucmFuZG9tKCkgKiAxZTkgPj4+IDApICsgKGNvdW50ZXIrKyArICdfXycpO1xuICAgIH07XG5cbiAgICBXZWFrTWFwLnByb3RvdHlwZSA9IHtcbiAgICAgIHNldDogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgICB2YXIgZW50cnkgPSBrZXlbdGhpcy5uYW1lXTtcbiAgICAgICAgaWYgKGVudHJ5ICYmIGVudHJ5WzBdID09PSBrZXkpXG4gICAgICAgICAgZW50cnlbMV0gPSB2YWx1ZTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGRlZmluZVByb3BlcnR5KGtleSwgdGhpcy5uYW1lLCB7dmFsdWU6IFtrZXksIHZhbHVlXSwgd3JpdGFibGU6IHRydWV9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9LFxuICAgICAgZ2V0OiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGVudHJ5O1xuICAgICAgICByZXR1cm4gKGVudHJ5ID0ga2V5W3RoaXMubmFtZV0pICYmIGVudHJ5WzBdID09PSBrZXkgP1xuICAgICAgICAgICAgZW50cnlbMV0gOiB1bmRlZmluZWQ7XG4gICAgICB9LFxuICAgICAgZGVsZXRlOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGVudHJ5ID0ga2V5W3RoaXMubmFtZV07XG4gICAgICAgIGlmICghZW50cnkgfHwgZW50cnlbMF0gIT09IGtleSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBlbnRyeVswXSA9IGVudHJ5WzFdID0gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgICBoYXM6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIgZW50cnkgPSBrZXlbdGhpcy5uYW1lXTtcbiAgICAgICAgaWYgKCFlbnRyeSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICByZXR1cm4gZW50cnlbMF0gPT09IGtleTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBXZWFrTWFwO1xuICB9KSgpO1xufSBlbHNlIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBXZWFrTWFwO1xufVxuIiwiIWZ1bmN0aW9uKGUpe2lmKFwib2JqZWN0XCI9PXR5cGVvZiBleHBvcnRzJiZcInVuZGVmaW5lZFwiIT10eXBlb2YgbW9kdWxlKW1vZHVsZS5leHBvcnRzPWUoKTtlbHNlIGlmKFwiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZClkZWZpbmUoW10sZSk7ZWxzZXt2YXIgZjtcInVuZGVmaW5lZFwiIT10eXBlb2Ygd2luZG93P2Y9d2luZG93OlwidW5kZWZpbmVkXCIhPXR5cGVvZiBnbG9iYWw/Zj1nbG9iYWw6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIHNlbGYmJihmPXNlbGYpLGYucG09ZSgpfX0oZnVuY3Rpb24oKXt2YXIgZGVmaW5lLG1vZHVsZSxleHBvcnRzO3JldHVybiAoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSh7MTpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG52YXIgaXRlcmFibGUgPSBfZGVyZXFfKCcuL2xpYi9pdGVyYWJsZScpO1xudmFyIGlzSXRlcmFibGUgPSBpdGVyYWJsZS5pc0l0ZXJhYmxlO1xudmFyIHRvQXJyYXkgPSBpdGVyYWJsZS50b0FycmF5O1xuXG52YXIgQXJyYXlQcm90byA9IEFycmF5LnByb3RvdHlwZTtcblxuLy8gTWF0Y2hGYWlsdXJlXG4vLyAtLS0tLS0tLS0tLS1cblxuZnVuY3Rpb24gTWF0Y2hGYWlsdXJlKHZhbHVlLCBzdGFjaykge1xuICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gIHRoaXMuc3RhY2sgPSBzdGFjaztcbn1cblxuTWF0Y2hGYWlsdXJlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJ21hdGNoIGZhaWx1cmUnO1xufTtcblxuLy8gUGF0dGVyblxuLy8gLS0tLS0tLVxuXG5mdW5jdGlvbiBQYXR0ZXJuKCkge31cblxuLy8gQ3JlYXRlcyBhIGN1c3RvbSBQYXR0ZXJuIGNsYXNzLiBJZiBgcHJvcHNgIGhhcyBhbiAnaW5pdCcgcHJvcGVydHksIGl0IHdpbGxcbi8vIGJlIGNhbGxlZCB0byBpbml0aWFsaXplIG5ld2x5LWNyZWF0ZWQgaW5zdGFuY2VzLiBBbGwgb3RoZXIgcHJvcGVydGllcyBpblxuLy8gYHByb3BzYCB3aWxsIGJlIGNvcGllZCB0byB0aGUgcHJvdG90eXBlIG9mIHRoZSBuZXcgY29uc3RydWN0b3IuXG5QYXR0ZXJuLmV4dGVuZCA9IGZ1bmN0aW9uKHByb3BzKSB7XG4gIHZhciBwcm90byA9IGN0b3IucHJvdG90eXBlID0gbmV3IFBhdHRlcm4oKTtcbiAgZm9yICh2YXIgayBpbiBwcm9wcykge1xuICAgIGlmIChrICE9PSAnaW5pdCcgJiYgayAhPSAnbWF0Y2gnKSB7XG4gICAgICBwcm90b1trXSA9IHByb3BzW2tdO1xuICAgIH1cbiAgfVxuICBlbnN1cmUodHlwZW9mIHByb3BzLm1hdGNoID09PSAnZnVuY3Rpb24nLCBcIlBhdHRlcm5zIG11c3QgaGF2ZSBhICdtYXRjaCcgbWV0aG9kXCIpO1xuICBwcm90by5fbWF0Y2ggPSBwcm9wcy5tYXRjaDtcblxuICBmdW5jdGlvbiBjdG9yKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIShzZWxmIGluc3RhbmNlb2YgY3RvcikpIHtcbiAgICAgIHNlbGYgPSBPYmplY3QuY3JlYXRlKHByb3RvKTtcbiAgICB9XG4gICAgaWYgKCdpbml0JyBpbiBwcm9wcykge1xuICAgICAgcHJvcHMuaW5pdC5hcHBseShzZWxmLCBBcnJheVByb3RvLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XG4gICAgfVxuICAgIGVuc3VyZSh0eXBlb2Ygc2VsZi5hcml0eSA9PT0gJ251bWJlcicsIFwiUGF0dGVybnMgbXVzdCBoYXZlIGFuICdhcml0eScgcHJvcGVydHlcIik7XG4gICAgcmV0dXJuIHNlbGY7XG4gIH1cbiAgY3Rvci5mcm9tQXJyYXkgPSBmdW5jdGlvbihhcnIpIHsgcmV0dXJuIGN0b3IuYXBwbHkobnVsbCwgYXJyKTsgfTtcbiAgcmV0dXJuIGN0b3I7XG59O1xuXG4vLyBFeHBvc2Ugc29tZSB1c2VmdWwgZnVuY3Rpb25zIGFzIGluc3RhbmNlIG1ldGhvZHMgb24gUGF0dGVybi5cblBhdHRlcm4ucHJvdG90eXBlLnBlcmZvcm1NYXRjaCA9IHBlcmZvcm1NYXRjaDtcblBhdHRlcm4ucHJvdG90eXBlLmdldEFyaXR5ID0gZ2V0QXJpdHk7XG5cbi8vIFdyYXBzIHRoZSB1c2VyLXNwZWNpZmllZCBgbWF0Y2hgIGZ1bmN0aW9uIHdpdGggc29tZSBleHRyYSBjaGVja3MuXG5QYXR0ZXJuLnByb3RvdHlwZS5tYXRjaCA9IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICB2YXIgYnMgPSBbXTtcbiAgdmFyIGFucyA9IHRoaXMuX21hdGNoKHZhbHVlLCBicyk7XG4gIGlmIChhbnMpIHtcbiAgICBlbnN1cmUoYnMubGVuZ3RoID09PSB0aGlzLmFyaXR5LFxuICAgICAgICAgICAnSW5jb25zaXN0ZW50IHBhdHRlcm4gYXJpdHk6IGV4cGVjdGVkICcgKyB0aGlzLmFyaXR5ICsgJywgYWN0dWFsICcgKyBicy5sZW5ndGgpO1xuICAgIGJpbmRpbmdzLnB1c2guYXBwbHkoYmluZGluZ3MsIGJzKTtcbiAgfVxuICByZXR1cm4gYW5zO1xufTtcblxuLy8gVHlwZXMgb2YgcGF0dGVyblxuLy8gLS0tLS0tLS0tLS0tLS0tLVxuXG5NYXRjaGVyLmlzID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbihleHBlY3RlZFZhbHVlKSB7XG4gICAgdGhpcy5leHBlY3RlZFZhbHVlID0gZXhwZWN0ZWRWYWx1ZTtcbiAgfSxcbiAgYXJpdHk6IDAsXG4gIG1hdGNoOiBmdW5jdGlvbih2YWx1ZSwgYmluZGluZ3MpIHtcbiAgICByZXR1cm4gX2VxdWFsaXR5TWF0Y2godmFsdWUsIHRoaXMuZXhwZWN0ZWRWYWx1ZSwgYmluZGluZ3MpO1xuICB9XG59KTtcblxuTWF0Y2hlci5pdGVyYWJsZSA9IFBhdHRlcm4uZXh0ZW5kKHtcbiAgaW5pdDogZnVuY3Rpb24oLyogcGF0dGVybiwgLi4uICovKSB7XG4gICAgdGhpcy5wYXR0ZXJucyA9IEFycmF5UHJvdG8uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIHRoaXMuYXJpdHkgPSB0aGlzLnBhdHRlcm5zXG4gICAgICAubWFwKGZ1bmN0aW9uKHBhdHRlcm4pIHsgcmV0dXJuIGdldEFyaXR5KHBhdHRlcm4pOyB9KVxuICAgICAgLnJlZHVjZShmdW5jdGlvbihhMSwgYTIpIHsgcmV0dXJuIGExICsgYTI7IH0sIDApO1xuICB9LFxuICBtYXRjaDogZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gICAgcmV0dXJuIGlzSXRlcmFibGUodmFsdWUpID9cbiAgICAgIF9hcnJheU1hdGNoKHRvQXJyYXkodmFsdWUpLCB0aGlzLnBhdHRlcm5zLCBiaW5kaW5ncykgOlxuICAgICAgZmFsc2U7XG4gIH1cbn0pO1xuXG5NYXRjaGVyLm1hbnkgPSBQYXR0ZXJuLmV4dGVuZCh7XG4gIGluaXQ6IGZ1bmN0aW9uKHBhdHRlcm4pIHtcbiAgICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xuICB9LFxuICBhcml0eTogMSxcbiAgbWF0Y2g6IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICAgIHRocm93IG5ldyBFcnJvcihcIidtYW55JyBwYXR0ZXJuIHVzZWQgb3V0c2lkZSBhcnJheSBwYXR0ZXJuXCIpO1xuICB9XG59KTtcblxuTWF0Y2hlci5vcHQgPSBQYXR0ZXJuLmV4dGVuZCh7XG4gIGluaXQ6IGZ1bmN0aW9uKHBhdHRlcm4pIHtcbiAgICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xuICB9LFxuICBhcml0eTogMSxcbiAgbWF0Y2g6IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICAgIHRocm93IG5ldyBFcnJvcihcIidvcHQnIHBhdHRlcm4gdXNlZCBvdXRzaWRlIGFycmF5IHBhdHRlcm5cIik7XG4gIH1cbn0pO1xuXG5NYXRjaGVyLnRyYW5zID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbihwYXR0ZXJuLCBmdW5jKSB7XG4gICAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbiAgICB0aGlzLmZ1bmMgPSBmdW5jO1xuICAgIGVuc3VyZShcbiAgICAgIHR5cGVvZiBmdW5jID09PSAnZnVuY3Rpb24nICYmIGZ1bmMubGVuZ3RoID09PSBnZXRBcml0eShwYXR0ZXJuKSxcbiAgICAgICdmdW5jIG11c3QgYmUgYSAnICsgZ2V0QXJpdHkocGF0dGVybikgKyAnLWFyZ3VtZW50IGZ1bmN0aW9uJ1xuICAgICk7XG4gIH0sXG4gIGFyaXR5OiAxLFxuICBtYXRjaDogZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gICAgdmFyIGJzID0gW107XG4gICAgaWYgKHBlcmZvcm1NYXRjaCh2YWx1ZSwgdGhpcy5wYXR0ZXJuLCBicykpIHtcbiAgICAgIHZhciBhbnMgPSB0aGlzLmZ1bmMuYXBwbHkodGhpcy50aGlzT2JqLCBicyk7XG4gICAgICBiaW5kaW5ncy5wdXNoKGFucyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59KTtcblxuTWF0Y2hlci53aGVuID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbihwYXR0ZXJuLCBwcmVkaWNhdGUpIHtcbiAgICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xuICAgIHRoaXMucHJlZGljYXRlID0gcHJlZGljYXRlO1xuICAgIHRoaXMuYXJpdHkgPSBnZXRBcml0eShwYXR0ZXJuKTtcbiAgICBlbnN1cmUoXG4gICAgICB0eXBlb2YgcHJlZGljYXRlID09PSAnZnVuY3Rpb24nICYmIHByZWRpY2F0ZS5sZW5ndGggPT09IHRoaXMuYXJpdHksXG4gICAgICAncHJlZGljYXRlIG11c3QgYmUgYSAnICsgdGhpcy5hcml0eSArICctYXJndW1lbnQgZnVuY3Rpb24nXG4gICAgKTtcbiAgfSxcbiAgbWF0Y2g6IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICAgIHZhciBicyA9IFtdO1xuICAgIGlmIChwZXJmb3JtTWF0Y2godmFsdWUsIHRoaXMucGF0dGVybiwgYnMpICYmXG4gICAgICAgIHRoaXMucHJlZGljYXRlLmFwcGx5KHRoaXMudGhpc09iaiwgYnMpKSB7XG4gICAgICBiaW5kaW5ncy5wdXNoLmFwcGx5KGJpbmRpbmdzLCBicyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59KTtcblxuTWF0Y2hlci5vciA9IFBhdHRlcm4uZXh0ZW5kKHtcbiAgaW5pdDogZnVuY3Rpb24oLyogcDEsIHAyLCAuLi4gKi8pIHtcbiAgICBlbnN1cmUoYXJndW1lbnRzLmxlbmd0aCA+PSAxLCBcIidvcicgcmVxdWlyZXMgYXQgbGVhc3Qgb25lIHBhdHRlcm5cIik7XG4gICAgdGhpcy5wYXR0ZXJucyA9IEFycmF5UHJvdG8uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIHRoaXMuYXJpdHkgPSBlbnN1cmVVbmlmb3JtQXJpdHkodGhpcy5wYXR0ZXJucywgJ29yJyk7XG4gIH0sXG4gIG1hdGNoOiBmdW5jdGlvbih2YWx1ZSwgYmluZGluZ3MpIHtcbiAgICB2YXIgcGF0dGVybnMgPSB0aGlzLnBhdHRlcm5zO1xuICAgIHZhciBhbnMgPSBmYWxzZTtcbiAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBwYXR0ZXJucy5sZW5ndGggJiYgIWFuczsgaWR4KyspIHtcbiAgICAgIGFucyA9IHBlcmZvcm1NYXRjaCh2YWx1ZSwgcGF0dGVybnNbaWR4XSwgYmluZGluZ3MpO1xuICAgIH1cbiAgICByZXR1cm4gYW5zO1xuICB9LFxufSk7XG5cbk1hdGNoZXIuYW5kID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbigvKiBwMSwgcDIsIC4uLiAqLykge1xuICAgIGVuc3VyZShhcmd1bWVudHMubGVuZ3RoID49IDEsIFwiJ2FuZCcgcmVxdWlyZXMgYXQgbGVhc3Qgb25lIHBhdHRlcm5cIik7XG4gICAgdGhpcy5wYXR0ZXJucyA9IEFycmF5UHJvdG8uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIHRoaXMuYXJpdHkgPSB0aGlzLnBhdHRlcm5zLnJlZHVjZShmdW5jdGlvbihzdW0sIHApIHtcbiAgICAgIHJldHVybiBzdW0gKyBnZXRBcml0eShwKTsgfSxcbiAgICAwKTtcbiAgfSxcbiAgbWF0Y2g6IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICAgIHZhciBwYXR0ZXJucyA9IHRoaXMucGF0dGVybnM7XG4gICAgdmFyIGFucyA9IHRydWU7XG4gICAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgcGF0dGVybnMubGVuZ3RoICYmIGFuczsgaWR4KyspIHtcbiAgICAgIGFucyA9IHBlcmZvcm1NYXRjaCh2YWx1ZSwgcGF0dGVybnNbaWR4XSwgYmluZGluZ3MpO1xuICAgIH1cbiAgICByZXR1cm4gYW5zO1xuICB9XG59KTtcblxuLy8gSGVscGVyc1xuLy8gLS0tLS0tLVxuXG5mdW5jdGlvbiBfYXJyYXlNYXRjaCh2YWx1ZSwgcGF0dGVybiwgYmluZGluZ3MpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB2YXIgdklkeCA9IDA7XG4gIHZhciBwSWR4ID0gMDtcbiAgd2hpbGUgKHBJZHggPCBwYXR0ZXJuLmxlbmd0aCkge1xuICAgIHZhciBwID0gcGF0dGVybltwSWR4KytdO1xuICAgIGlmIChwIGluc3RhbmNlb2YgTWF0Y2hlci5tYW55KSB7XG4gICAgICBwID0gcC5wYXR0ZXJuO1xuICAgICAgdmFyIHZzID0gW107XG4gICAgICB3aGlsZSAodklkeCA8IHZhbHVlLmxlbmd0aCAmJiBwZXJmb3JtTWF0Y2godmFsdWVbdklkeF0sIHAsIHZzKSkge1xuICAgICAgICB2SWR4Kys7XG4gICAgICB9XG4gICAgICBiaW5kaW5ncy5wdXNoKHZzKTtcbiAgICB9IGVsc2UgaWYgKHAgaW5zdGFuY2VvZiBNYXRjaGVyLm9wdCkge1xuICAgICAgdmFyIGFucyA9IHZJZHggPCB2YWx1ZS5sZW5ndGggPyBwZXJmb3JtTWF0Y2godmFsdWVbdklkeF0sIHAucGF0dGVybiwgW10pIDogZmFsc2U7XG4gICAgICBpZiAoYW5zKSB7XG4gICAgICAgIGJpbmRpbmdzLnB1c2goYW5zKTtcbiAgICAgICAgdklkeCsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYmluZGluZ3MucHVzaCh1bmRlZmluZWQpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocGVyZm9ybU1hdGNoKHZhbHVlW3ZJZHhdLCBwLCBiaW5kaW5ncykpIHtcbiAgICAgIHZJZHgrKztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdklkeCA9PT0gdmFsdWUubGVuZ3RoICYmIHBJZHggPT09IHBhdHRlcm4ubGVuZ3RoO1xufVxuXG5mdW5jdGlvbiBfb2JqTWF0Y2godmFsdWUsIHBhdHRlcm4sIGJpbmRpbmdzKSB7XG4gIGZvciAodmFyIGsgaW4gcGF0dGVybikge1xuICAgIGlmIChwYXR0ZXJuLmhhc093blByb3BlcnR5KGspICYmXG4gICAgICAgICEoayBpbiB2YWx1ZSkgfHxcbiAgICAgICAgIXBlcmZvcm1NYXRjaCh2YWx1ZVtrXSwgcGF0dGVybltrXSwgYmluZGluZ3MpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBfZnVuY3Rpb25NYXRjaCh2YWx1ZSwgZnVuYywgYmluZGluZ3MpIHtcbiAgaWYgKGZ1bmModmFsdWUpKSB7XG4gICAgYmluZGluZ3MucHVzaCh2YWx1ZSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBfZXF1YWxpdHlNYXRjaCh2YWx1ZSwgcGF0dGVybiwgYmluZGluZ3MpIHtcbiAgcmV0dXJuIHZhbHVlID09PSBwYXR0ZXJuO1xufVxuXG5mdW5jdGlvbiBfcmVnRXhwTWF0Y2godmFsdWUsIHBhdHRlcm4sIGJpbmRpbmdzKSB7XG4gIHZhciBhbnMgPSBwYXR0ZXJuLmV4ZWModmFsdWUpO1xuICBpZiAoYW5zICE9PSBudWxsICYmIGFuc1swXSA9PT0gdmFsdWUpIHtcbiAgICBiaW5kaW5ncy5wdXNoKGFucyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBwZXJmb3JtTWF0Y2godmFsdWUsIHBhdHRlcm4sIGJpbmRpbmdzKSB7XG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgUGF0dGVybikge1xuICAgIHJldHVybiBwYXR0ZXJuLm1hdGNoKHZhbHVlLCBiaW5kaW5ncyk7XG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShwYXR0ZXJuKSkge1xuICAgIHJldHVybiBfYXJyYXlNYXRjaCh2YWx1ZSwgcGF0dGVybiwgYmluZGluZ3MpO1xuICB9IGVsc2UgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICByZXR1cm4gX3JlZ0V4cE1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncyk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHBhdHRlcm4gPT09ICdvYmplY3QnICYmIHBhdHRlcm4gIT09IG51bGwpIHtcbiAgICByZXR1cm4gX29iak1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncyk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHBhdHRlcm4gPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gX2Z1bmN0aW9uTWF0Y2godmFsdWUsIHBhdHRlcm4sIGJpbmRpbmdzKTtcbiAgfVxuICByZXR1cm4gX2VxdWFsaXR5TWF0Y2godmFsdWUsIHBhdHRlcm4sIGJpbmRpbmdzKTtcbn1cblxuZnVuY3Rpb24gZ2V0QXJpdHkocGF0dGVybikge1xuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIFBhdHRlcm4pIHtcbiAgICByZXR1cm4gcGF0dGVybi5hcml0eTtcbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHBhdHRlcm4pKSB7XG4gICAgcmV0dXJuIHBhdHRlcm5cbiAgICAgIC5tYXAoZnVuY3Rpb24ocCkgeyByZXR1cm4gZ2V0QXJpdHkocCk7IH0pXG4gICAgICAucmVkdWNlKGZ1bmN0aW9uKGExLCBhMikgeyByZXR1cm4gYTEgKyBhMjsgfSwgMCk7XG4gIH0gZWxzZSBpZiAocGF0dGVybiBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgIHJldHVybiAxO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBwYXR0ZXJuID09PSAnb2JqZWN0JyAmJiBwYXR0ZXJuICE9PSBudWxsKSB7XG4gICAgdmFyIGFucyA9IDA7XG4gICAgZm9yICh2YXIgayBpbiBwYXR0ZXJuKSB7XG4gICAgICBpZiAocGF0dGVybi5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICBhbnMgKz0gZ2V0QXJpdHkocGF0dGVybltrXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhbnM7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHBhdHRlcm4gPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gMTtcbiAgfVxuICByZXR1cm4gMDtcbn1cblxuZnVuY3Rpb24gZW5zdXJlVW5pZm9ybUFyaXR5KHBhdHRlcm5zLCBvcCkge1xuICB2YXIgcmVzdWx0ID0gZ2V0QXJpdHkocGF0dGVybnNbMF0pO1xuICBmb3IgKHZhciBpZHggPSAxOyBpZHggPCBwYXR0ZXJucy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdmFyIGEgPSBnZXRBcml0eShwYXR0ZXJuc1tpZHhdKTtcbiAgICBpZiAoYSAhPT0gcmVzdWx0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3Iob3AgKyAnOiBleHBlY3RlZCBhcml0eSAnICsgcmVzdWx0ICsgJyBhdCBpbmRleCAnICsgaWR4ICsgJywgZ290ICcgKyBhKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZW5zdXJlKGNvbmQsIG1lc3NhZ2UpIHtcbiAgaWYgKCFjb25kKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICB9XG59XG5cbi8vIE1hdGNoZXJcbi8vIC0tLS0tLS1cblxuZnVuY3Rpb24gTWF0Y2hlcigpIHtcbiAgdGhpcy5wYXR0ZXJucyA9IFtdO1xuICB0aGlzLnRoaXNPYmogPSB1bmRlZmluZWQ7XG59XG5cbk1hdGNoZXIucHJvdG90eXBlLndpdGhUaGlzID0gZnVuY3Rpb24ob2JqKSB7XG4gIHRoaXMudGhpc09iaiA9IG9iajtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5NYXRjaGVyLnByb3RvdHlwZS5hZGRDYXNlID0gZnVuY3Rpb24ocGF0dGVybiwgb3B0RnVuYykge1xuICB0aGlzLnBhdHRlcm5zLnB1c2goTWF0Y2hlci50cmFucyhwYXR0ZXJuLCBvcHRGdW5jKSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuTWF0Y2hlci5wcm90b3R5cGUubWF0Y2ggPSBmdW5jdGlvbih2YWx1ZSkge1xuICBlbnN1cmUodGhpcy5wYXR0ZXJucy5sZW5ndGggPiAwLCAnTWF0Y2hlciByZXF1aXJlcyBhdCBsZWFzdCBvbmUgY2FzZScpO1xuXG4gIHZhciBiaW5kaW5ncyA9IFtdO1xuICBpZiAoTWF0Y2hlci5vci5mcm9tQXJyYXkodGhpcy5wYXR0ZXJucykubWF0Y2godmFsdWUsIGJpbmRpbmdzKSkge1xuICAgIHJldHVybiBiaW5kaW5nc1swXTtcbiAgfVxuICB0aHJvdyBuZXcgTWF0Y2hGYWlsdXJlKHZhbHVlLCBuZXcgRXJyb3IoKS5zdGFjayk7XG59O1xuXG5NYXRjaGVyLnByb3RvdHlwZS50b0Z1bmN0aW9uID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7IHJldHVybiBzZWxmLm1hdGNoKHZhbHVlKTsgfTtcbn07XG5cbi8vIFByaW1pdGl2ZSBwYXR0ZXJuc1xuXG5NYXRjaGVyLl8gICAgICA9IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHRydWU7IH07XG5NYXRjaGVyLmJvb2wgICA9IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHR5cGVvZiB4ID09PSAnYm9vbGVhbic7IH07XG5NYXRjaGVyLm51bWJlciA9IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHR5cGVvZiB4ID09PSAnbnVtYmVyJzsgfTtcbk1hdGNoZXIuc3RyaW5nID0gZnVuY3Rpb24oeCkgeyByZXR1cm4gdHlwZW9mIHggPT09ICdzdHJpbmcnOyB9O1xuTWF0Y2hlci5jaGFyICAgPSBmdW5jdGlvbih4KSB7IHJldHVybiB0eXBlb2YgeCA9PT0gJ3N0cmluZycgJiYgeC5sZW5ndGggPT09IDA7IH07XG5cbi8vIE9wZXJhdG9yc1xuXG5NYXRjaGVyLmluc3RhbmNlT2YgPSBmdW5jdGlvbihjbGF6eikgeyByZXR1cm4gZnVuY3Rpb24oeCkgeyByZXR1cm4geCBpbnN0YW5jZW9mIGNsYXp6OyB9OyB9O1xuXG5NYXRjaGVyLk1hdGNoRmFpbHVyZSA9IE1hdGNoRmFpbHVyZTtcblxuLy8gVGVyc2UgaW50ZXJmYWNlXG4vLyAtLS0tLS0tLS0tLS0tLS1cblxuZnVuY3Rpb24gbWF0Y2godmFsdWUgLyogLCBwYXQxLCBmdW4xLCBwYXQyLCBmdW4yLCAuLi4gKi8pIHtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG5cbiAgLy8gV2hlbiBjYWxsZWQgd2l0aCBqdXN0IGEgdmFsdWUgYW5kIGEgcGF0dGVybiwgcmV0dXJuIHRoZSBiaW5kaW5ncyBpZlxuICAvLyB0aGUgbWF0Y2ggd2FzIHN1Y2Nlc3NmdWwsIG90aGVyd2lzZSBudWxsLlxuICBpZiAoYXJncy5sZW5ndGggPT09IDIpIHtcbiAgICB2YXIgYmluZGluZ3MgPSBbXTtcbiAgICBpZiAocGVyZm9ybU1hdGNoKHZhbHVlLCBhcmd1bWVudHNbMV0sIGJpbmRpbmdzKSkge1xuICAgICAgcmV0dXJuIGJpbmRpbmdzO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGVuc3VyZShcbiAgICAgIGFyZ3MubGVuZ3RoID4gMiAmJiBhcmdzLmxlbmd0aCAlIDIgPT09IDEsXG4gICAgICAnbWF0Y2ggY2FsbGVkIHdpdGggaW52YWxpZCBhcmd1bWVudHMnKTtcbiAgdmFyIG0gPSBuZXcgTWF0Y2hlcigpO1xuICBmb3IgKHZhciBpZHggPSAxOyBpZHggPCBhcmdzLmxlbmd0aDsgaWR4ICs9IDIpIHtcbiAgICB2YXIgcGF0dGVybiA9IGFyZ3NbaWR4XTtcbiAgICB2YXIgZnVuYyA9IGFyZ3NbaWR4ICsgMV07XG4gICAgbS5hZGRDYXNlKHBhdHRlcm4sIGZ1bmMpO1xuICB9XG4gIHJldHVybiBtLm1hdGNoKHZhbHVlKTtcbn1cblxuLy8gRXhwb3J0c1xuLy8gLS0tLS0tLVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgTWF0Y2hlcjogTWF0Y2hlcixcbiAgbWF0Y2g6IG1hdGNoLFxuICBQYXR0ZXJuOiBQYXR0ZXJuXG59O1xuXG59LHtcIi4vbGliL2l0ZXJhYmxlXCI6Mn1dLDI6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuLyogZ2xvYmFsIFN5bWJvbCAqL1xuXG52YXIgSVRFUkFUT1JfU1lNQk9MID0gdHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiBTeW1ib2wuaXRlcmF0b3I7XG52YXIgRkFLRV9JVEVSQVRPUl9TWU1CT0wgPSAnQEBpdGVyYXRvcic7XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8vIEhlbHBlcnNcbi8vIC0tLS0tLS1cblxuZnVuY3Rpb24gaXNTdHJpbmcob2JqKSB7XG5cdHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IFN0cmluZ10nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihvYmopIHtcblx0cmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgTnVtYmVyXSc7XG59XG5cbmZ1bmN0aW9uIGlzQXJyYXlMaWtlKG9iaikge1xuXHRyZXR1cm4gaXNOdW1iZXIob2JqLmxlbmd0aCkgJiYgIWlzU3RyaW5nKG9iaik7XG59XG5cbi8vIEFycmF5SXRlcmF0b3Jcbi8vIC0tLS0tLS0tLS0tLS1cblxuZnVuY3Rpb24gQXJyYXlJdGVyYXRvcihpdGVyYXRlZSkge1xuXHR0aGlzLl9pdGVyYXRlZSA9IGl0ZXJhdGVlO1xuXHR0aGlzLl9pID0gMDtcblx0dGhpcy5fbGVuID0gaXRlcmF0ZWUubGVuZ3RoO1xufVxuXG5BcnJheUl0ZXJhdG9yLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24oKSB7XG5cdGlmICh0aGlzLl9pIDwgdGhpcy5fbGVuKSB7XG5cdFx0cmV0dXJuIHsgZG9uZTogZmFsc2UsIHZhbHVlOiB0aGlzLl9pdGVyYXRlZVt0aGlzLl9pKytdIH07XG5cdH1cblx0cmV0dXJuIHsgZG9uZTogdHJ1ZSB9O1xufTtcblxuQXJyYXlJdGVyYXRvci5wcm90b3R5cGVbRkFLRV9JVEVSQVRPUl9TWU1CT0xdID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9O1xuXG5pZiAoSVRFUkFUT1JfU1lNQk9MKSB7XG5cdEFycmF5SXRlcmF0b3IucHJvdG90eXBlW0lURVJBVE9SX1NZTUJPTF0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH07XG59XG5cbi8vIEV4cG9ydHNcbi8vIC0tLS0tLS1cblxuLy8gUmV0dXJucyBhbiBpdGVyYXRvciAoYW4gb2JqZWN0IHRoYXQgaGFzIGEgbmV4dCgpIG1ldGhvZCkgZm9yIGBvYmpgLlxuLy8gRmlyc3QsIGl0IHRyaWVzIHRvIHVzZSB0aGUgRVM2IGl0ZXJhdG9yIHByb3RvY29sIChTeW1ib2wuaXRlcmF0b3IpLlxuLy8gSXQgZmFsbHMgYmFjayB0byB0aGUgJ2Zha2UnIGl0ZXJhdG9yIHByb3RvY29sICgnQEBpdGVyYXRvcicpIHRoYXQgaXNcbi8vIHVzZWQgYnkgc29tZSBsaWJyYXJpZXMgKGUuZy4gaW1tdXRhYmxlLWpzKS4gRmluYWxseSwgaWYgdGhlIG9iamVjdCBoYXNcbi8vIGEgbnVtZXJpYyBgbGVuZ3RoYCBwcm9wZXJ0eSBhbmQgaXMgbm90IGEgc3RyaW5nLCBpdCBpcyB0cmVhdGVkIGFzIGFuIEFycmF5XG4vLyB0byBiZSBpdGVyYXRlZCB1c2luZyBhbiBBcnJheUl0ZXJhdG9yLlxuZnVuY3Rpb24gZ2V0SXRlcmF0b3Iob2JqKSB7XG5cdGlmICghb2JqKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGlmIChJVEVSQVRPUl9TWU1CT0wgJiYgdHlwZW9mIG9ialtJVEVSQVRPUl9TWU1CT0xdID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0cmV0dXJuIG9ialtJVEVSQVRPUl9TWU1CT0xdKCk7XG5cdH1cblx0aWYgKHR5cGVvZiBvYmpbRkFLRV9JVEVSQVRPUl9TWU1CT0xdID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0cmV0dXJuIG9ialtGQUtFX0lURVJBVE9SX1NZTUJPTF0oKTtcblx0fVxuXHRpZiAoaXNBcnJheUxpa2Uob2JqKSkge1xuXHRcdHJldHVybiBuZXcgQXJyYXlJdGVyYXRvcihvYmopO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGlzSXRlcmFibGUob2JqKSB7XG5cdGlmIChvYmopIHtcblx0XHRyZXR1cm4gKElURVJBVE9SX1NZTUJPTCAmJiB0eXBlb2Ygb2JqW0lURVJBVE9SX1NZTUJPTF0gPT09ICdmdW5jdGlvbicpIHx8XG5cdFx0XHRcdFx0IHR5cGVvZiBvYmpbRkFLRV9JVEVSQVRPUl9TWU1CT0xdID09PSAnZnVuY3Rpb24nIHx8XG5cdFx0XHRcdFx0IGlzQXJyYXlMaWtlKG9iaik7XG5cdH1cblx0cmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiB0b0FycmF5KGl0ZXJhYmxlKSB7XG5cdHZhciBpdGVyID0gZ2V0SXRlcmF0b3IoaXRlcmFibGUpO1xuXHRpZiAoaXRlcikge1xuXHRcdHZhciByZXN1bHQgPSBbXTtcblx0XHR2YXIgbmV4dDtcblx0XHR3aGlsZSAoIShuZXh0ID0gaXRlci5uZXh0KCkpLmRvbmUpIHtcblx0XHRcdHJlc3VsdC5wdXNoKG5leHQudmFsdWUpO1xuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRnZXRJdGVyYXRvcjogZ2V0SXRlcmF0b3IsXG5cdGlzSXRlcmFibGU6IGlzSXRlcmFibGUsXG5cdHRvQXJyYXk6IHRvQXJyYXlcbn07XG5cbn0se31dfSx7fSxbMV0pKDEpXG59KTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnpiM1Z5WTJWeklqcGJJbTV2WkdWZmJXOWtkV3hsY3k5aWNtOTNjMlZ5YVdaNUwyNXZaR1ZmYlc5a2RXeGxjeTlpY205M2MyVnlMWEJoWTJzdlgzQnlaV3gxWkdVdWFuTWlMQ0l2VlhObGNuTXZaSFZpY205NUwyUmxkaTlqWkdjdmNHRjBkR1Z5YmkxdFlYUmphQzlwYm1SbGVDNXFjeUlzSWk5VmMyVnljeTlrZFdKeWIza3ZaR1YyTDJOa1p5OXdZWFIwWlhKdUxXMWhkR05vTDJ4cFlpOXBkR1Z5WVdKc1pTNXFjeUpkTENKdVlXMWxjeUk2VzEwc0ltMWhjSEJwYm1keklqb2lRVUZCUVR0QlEwRkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVRzN1FVTXpXVUU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVNJc0ltWnBiR1VpT2lKblpXNWxjbUYwWldRdWFuTWlMQ0p6YjNWeVkyVlNiMjkwSWpvaUlpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lLR1oxYm1OMGFXOXVJR1VvZEN4dUxISXBlMloxYm1OMGFXOXVJSE1vYnl4MUtYdHBaaWdoYmx0dlhTbDdhV1lvSVhSYmIxMHBlM1poY2lCaFBYUjVjR1Z2WmlCeVpYRjFhWEpsUFQxY0ltWjFibU4wYVc5dVhDSW1KbkpsY1hWcGNtVTdhV1lvSVhVbUptRXBjbVYwZFhKdUlHRW9ieXdoTUNrN2FXWW9hU2x5WlhSMWNtNGdhU2h2TENFd0tUdDJZWElnWmoxdVpYY2dSWEp5YjNJb1hDSkRZVzV1YjNRZ1ptbHVaQ0J0YjJSMWJHVWdKMXdpSzI4clhDSW5YQ0lwTzNSb2NtOTNJR1l1WTI5a1pUMWNJazFQUkZWTVJWOU9UMVJmUms5VlRrUmNJaXhtZlhaaGNpQnNQVzViYjEwOWUyVjRjRzl5ZEhNNmUzMTlPM1JiYjExYk1GMHVZMkZzYkNoc0xtVjRjRzl5ZEhNc1puVnVZM1JwYjI0b1pTbDdkbUZ5SUc0OWRGdHZYVnN4WFZ0bFhUdHlaWFIxY200Z2N5aHVQMjQ2WlNsOUxHd3NiQzVsZUhCdmNuUnpMR1VzZEN4dUxISXBmWEpsZEhWeWJpQnVXMjlkTG1WNGNHOXlkSE45ZG1GeUlHazlkSGx3Wlc5bUlISmxjWFZwY21VOVBWd2lablZ1WTNScGIyNWNJaVltY21WeGRXbHlaVHRtYjNJb2RtRnlJRzg5TUR0dlBISXViR1Z1WjNSb08yOHJLeWx6S0hKYmIxMHBPM0psZEhWeWJpQnpmU2tpTENKMllYSWdhWFJsY21GaWJHVWdQU0J5WlhGMWFYSmxLQ2N1TDJ4cFlpOXBkR1Z5WVdKc1pTY3BPMXh1ZG1GeUlHbHpTWFJsY21GaWJHVWdQU0JwZEdWeVlXSnNaUzVwYzBsMFpYSmhZbXhsTzF4dWRtRnlJSFJ2UVhKeVlYa2dQU0JwZEdWeVlXSnNaUzUwYjBGeWNtRjVPMXh1WEc1MllYSWdRWEp5WVhsUWNtOTBieUE5SUVGeWNtRjVMbkJ5YjNSdmRIbHdaVHRjYmx4dUx5OGdUV0YwWTJoR1lXbHNkWEpsWEc0dkx5QXRMUzB0TFMwdExTMHRMUzFjYmx4dVpuVnVZM1JwYjI0Z1RXRjBZMmhHWVdsc2RYSmxLSFpoYkhWbExDQnpkR0ZqYXlrZ2UxeHVJQ0IwYUdsekxuWmhiSFZsSUQwZ2RtRnNkV1U3WEc0Z0lIUm9hWE11YzNSaFkyc2dQU0J6ZEdGamF6dGNibjFjYmx4dVRXRjBZMmhHWVdsc2RYSmxMbkJ5YjNSdmRIbHdaUzUwYjFOMGNtbHVaeUE5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0J5WlhSMWNtNGdKMjFoZEdOb0lHWmhhV3gxY21Vbk8xeHVmVHRjYmx4dUx5OGdVR0YwZEdWeWJseHVMeThnTFMwdExTMHRMVnh1WEc1bWRXNWpkR2x2YmlCUVlYUjBaWEp1S0NrZ2UzMWNibHh1THk4Z1EzSmxZWFJsY3lCaElHTjFjM1J2YlNCUVlYUjBaWEp1SUdOc1lYTnpMaUJKWmlCZ2NISnZjSE5nSUdoaGN5QmhiaUFuYVc1cGRDY2djSEp2Y0dWeWRIa3NJR2wwSUhkcGJHeGNiaTh2SUdKbElHTmhiR3hsWkNCMGJ5QnBibWwwYVdGc2FYcGxJRzVsZDJ4NUxXTnlaV0YwWldRZ2FXNXpkR0Z1WTJWekxpQkJiR3dnYjNSb1pYSWdjSEp2Y0dWeWRHbGxjeUJwYmx4dUx5OGdZSEJ5YjNCellDQjNhV3hzSUdKbElHTnZjR2xsWkNCMGJ5QjBhR1VnY0hKdmRHOTBlWEJsSUc5bUlIUm9aU0J1WlhjZ1kyOXVjM1J5ZFdOMGIzSXVYRzVRWVhSMFpYSnVMbVY0ZEdWdVpDQTlJR1oxYm1OMGFXOXVLSEJ5YjNCektTQjdYRzRnSUhaaGNpQndjbTkwYnlBOUlHTjBiM0l1Y0hKdmRHOTBlWEJsSUQwZ2JtVjNJRkJoZEhSbGNtNG9LVHRjYmlBZ1ptOXlJQ2gyWVhJZ2F5QnBiaUJ3Y205d2N5a2dlMXh1SUNBZ0lHbG1JQ2hySUNFOVBTQW5hVzVwZENjZ0ppWWdheUFoUFNBbmJXRjBZMmduS1NCN1hHNGdJQ0FnSUNCd2NtOTBiMXRyWFNBOUlIQnliM0J6VzJ0ZE8xeHVJQ0FnSUgxY2JpQWdmVnh1SUNCbGJuTjFjbVVvZEhsd1pXOW1JSEJ5YjNCekxtMWhkR05vSUQwOVBTQW5ablZ1WTNScGIyNG5MQ0JjSWxCaGRIUmxjbTV6SUcxMWMzUWdhR0YyWlNCaElDZHRZWFJqYUNjZ2JXVjBhRzlrWENJcE8xeHVJQ0J3Y205MGJ5NWZiV0YwWTJnZ1BTQndjbTl3Y3k1dFlYUmphRHRjYmx4dUlDQm1kVzVqZEdsdmJpQmpkRzl5S0NrZ2UxeHVJQ0FnSUhaaGNpQnpaV3htSUQwZ2RHaHBjenRjYmlBZ0lDQnBaaUFvSVNoelpXeG1JR2x1YzNSaGJtTmxiMllnWTNSdmNpa3BJSHRjYmlBZ0lDQWdJSE5sYkdZZ1BTQlBZbXBsWTNRdVkzSmxZWFJsS0hCeWIzUnZLVHRjYmlBZ0lDQjlYRzRnSUNBZ2FXWWdLQ2RwYm1sMEp5QnBiaUJ3Y205d2N5a2dlMXh1SUNBZ0lDQWdjSEp2Y0hNdWFXNXBkQzVoY0hCc2VTaHpaV3htTENCQmNuSmhlVkJ5YjNSdkxuTnNhV05sTG1OaGJHd29ZWEpuZFcxbGJuUnpLU2s3WEc0Z0lDQWdmVnh1SUNBZ0lHVnVjM1Z5WlNoMGVYQmxiMllnYzJWc1ppNWhjbWwwZVNBOVBUMGdKMjUxYldKbGNpY3NJRndpVUdGMGRHVnlibk1nYlhWemRDQm9ZWFpsSUdGdUlDZGhjbWwwZVNjZ2NISnZjR1Z5ZEhsY0lpazdYRzRnSUNBZ2NtVjBkWEp1SUhObGJHWTdYRzRnSUgxY2JpQWdZM1J2Y2k1bWNtOXRRWEp5WVhrZ1BTQm1kVzVqZEdsdmJpaGhjbklwSUhzZ2NtVjBkWEp1SUdOMGIzSXVZWEJ3Ykhrb2JuVnNiQ3dnWVhKeUtUc2dmVHRjYmlBZ2NtVjBkWEp1SUdOMGIzSTdYRzU5TzF4dVhHNHZMeUJGZUhCdmMyVWdjMjl0WlNCMWMyVm1kV3dnWm5WdVkzUnBiMjV6SUdGeklHbHVjM1JoYm1ObElHMWxkR2h2WkhNZ2IyNGdVR0YwZEdWeWJpNWNibEJoZEhSbGNtNHVjSEp2ZEc5MGVYQmxMbkJsY21admNtMU5ZWFJqYUNBOUlIQmxjbVp2Y20xTllYUmphRHRjYmxCaGRIUmxjbTR1Y0hKdmRHOTBlWEJsTG1kbGRFRnlhWFI1SUQwZ1oyVjBRWEpwZEhrN1hHNWNiaTh2SUZkeVlYQnpJSFJvWlNCMWMyVnlMWE53WldOcFptbGxaQ0JnYldGMFkyaGdJR1oxYm1OMGFXOXVJSGRwZEdnZ2MyOXRaU0JsZUhSeVlTQmphR1ZqYTNNdVhHNVFZWFIwWlhKdUxuQnliM1J2ZEhsd1pTNXRZWFJqYUNBOUlHWjFibU4wYVc5dUtIWmhiSFZsTENCaWFXNWthVzVuY3lrZ2UxeHVJQ0IyWVhJZ1luTWdQU0JiWFR0Y2JpQWdkbUZ5SUdGdWN5QTlJSFJvYVhNdVgyMWhkR05vS0haaGJIVmxMQ0JpY3lrN1hHNGdJR2xtSUNoaGJuTXBJSHRjYmlBZ0lDQmxibk4xY21Vb1luTXViR1Z1WjNSb0lEMDlQU0IwYUdsekxtRnlhWFI1TEZ4dUlDQWdJQ0FnSUNBZ0lDQW5TVzVqYjI1emFYTjBaVzUwSUhCaGRIUmxjbTRnWVhKcGRIazZJR1Y0Y0dWamRHVmtJQ2NnS3lCMGFHbHpMbUZ5YVhSNUlDc2dKeXdnWVdOMGRXRnNJQ2NnS3lCaWN5NXNaVzVuZEdncE8xeHVJQ0FnSUdKcGJtUnBibWR6TG5CMWMyZ3VZWEJ3Ykhrb1ltbHVaR2x1WjNNc0lHSnpLVHRjYmlBZ2ZWeHVJQ0J5WlhSMWNtNGdZVzV6TzF4dWZUdGNibHh1THk4Z1ZIbHdaWE1nYjJZZ2NHRjBkR1Z5Ymx4dUx5OGdMUzB0TFMwdExTMHRMUzB0TFMwdExWeHVYRzVOWVhSamFHVnlMbWx6SUQwZ1VHRjBkR1Z5Ymk1bGVIUmxibVFvZTF4dUlDQnBibWwwT2lCbWRXNWpkR2x2YmlobGVIQmxZM1JsWkZaaGJIVmxLU0I3WEc0Z0lDQWdkR2hwY3k1bGVIQmxZM1JsWkZaaGJIVmxJRDBnWlhod1pXTjBaV1JXWVd4MVpUdGNiaUFnZlN4Y2JpQWdZWEpwZEhrNklEQXNYRzRnSUcxaGRHTm9PaUJtZFc1amRHbHZiaWgyWVd4MVpTd2dZbWx1WkdsdVozTXBJSHRjYmlBZ0lDQnlaWFIxY200Z1gyVnhkV0ZzYVhSNVRXRjBZMmdvZG1Gc2RXVXNJSFJvYVhNdVpYaHdaV04wWldSV1lXeDFaU3dnWW1sdVpHbHVaM01wTzF4dUlDQjlYRzU5S1R0Y2JseHVUV0YwWTJobGNpNXBkR1Z5WVdKc1pTQTlJRkJoZEhSbGNtNHVaWGgwWlc1a0tIdGNiaUFnYVc1cGREb2dablZ1WTNScGIyNG9MeW9nY0dGMGRHVnliaXdnTGk0dUlDb3ZLU0I3WEc0Z0lDQWdkR2hwY3k1d1lYUjBaWEp1Y3lBOUlFRnljbUY1VUhKdmRHOHVjMnhwWTJVdVkyRnNiQ2hoY21kMWJXVnVkSE1wTzF4dUlDQWdJSFJvYVhNdVlYSnBkSGtnUFNCMGFHbHpMbkJoZEhSbGNtNXpYRzRnSUNBZ0lDQXViV0Z3S0daMWJtTjBhVzl1S0hCaGRIUmxjbTRwSUhzZ2NtVjBkWEp1SUdkbGRFRnlhWFI1S0hCaGRIUmxjbTRwT3lCOUtWeHVJQ0FnSUNBZ0xuSmxaSFZqWlNobWRXNWpkR2x2YmloaE1Td2dZVElwSUhzZ2NtVjBkWEp1SUdFeElDc2dZVEk3SUgwc0lEQXBPMXh1SUNCOUxGeHVJQ0J0WVhSamFEb2dablZ1WTNScGIyNG9kbUZzZFdVc0lHSnBibVJwYm1kektTQjdYRzRnSUNBZ2NtVjBkWEp1SUdselNYUmxjbUZpYkdVb2RtRnNkV1VwSUQ5Y2JpQWdJQ0FnSUY5aGNuSmhlVTFoZEdOb0tIUnZRWEp5WVhrb2RtRnNkV1VwTENCMGFHbHpMbkJoZEhSbGNtNXpMQ0JpYVc1a2FXNW5jeWtnT2x4dUlDQWdJQ0FnWm1Gc2MyVTdYRzRnSUgxY2JuMHBPMXh1WEc1TllYUmphR1Z5TG0xaGJua2dQU0JRWVhSMFpYSnVMbVY0ZEdWdVpDaDdYRzRnSUdsdWFYUTZJR1oxYm1OMGFXOXVLSEJoZEhSbGNtNHBJSHRjYmlBZ0lDQjBhR2x6TG5CaGRIUmxjbTRnUFNCd1lYUjBaWEp1TzF4dUlDQjlMRnh1SUNCaGNtbDBlVG9nTVN4Y2JpQWdiV0YwWTJnNklHWjFibU4wYVc5dUtIWmhiSFZsTENCaWFXNWthVzVuY3lrZ2UxeHVJQ0FnSUhSb2NtOTNJRzVsZHlCRmNuSnZjaWhjSWlkdFlXNTVKeUJ3WVhSMFpYSnVJSFZ6WldRZ2IzVjBjMmxrWlNCaGNuSmhlU0J3WVhSMFpYSnVYQ0lwTzF4dUlDQjlYRzU5S1R0Y2JseHVUV0YwWTJobGNpNXZjSFFnUFNCUVlYUjBaWEp1TG1WNGRHVnVaQ2g3WEc0Z0lHbHVhWFE2SUdaMWJtTjBhVzl1S0hCaGRIUmxjbTRwSUh0Y2JpQWdJQ0IwYUdsekxuQmhkSFJsY200Z1BTQndZWFIwWlhKdU8xeHVJQ0I5TEZ4dUlDQmhjbWwwZVRvZ01TeGNiaUFnYldGMFkyZzZJR1oxYm1OMGFXOXVLSFpoYkhWbExDQmlhVzVrYVc1bmN5a2dlMXh1SUNBZ0lIUm9jbTkzSUc1bGR5QkZjbkp2Y2loY0lpZHZjSFFuSUhCaGRIUmxjbTRnZFhObFpDQnZkWFJ6YVdSbElHRnljbUY1SUhCaGRIUmxjbTVjSWlrN1hHNGdJSDFjYm4wcE8xeHVYRzVOWVhSamFHVnlMblJ5WVc1eklEMGdVR0YwZEdWeWJpNWxlSFJsYm1Rb2UxeHVJQ0JwYm1sME9pQm1kVzVqZEdsdmJpaHdZWFIwWlhKdUxDQm1kVzVqS1NCN1hHNGdJQ0FnZEdocGN5NXdZWFIwWlhKdUlEMGdjR0YwZEdWeWJqdGNiaUFnSUNCMGFHbHpMbVoxYm1NZ1BTQm1kVzVqTzF4dUlDQWdJR1Z1YzNWeVpTaGNiaUFnSUNBZ0lIUjVjR1Z2WmlCbWRXNWpJRDA5UFNBblpuVnVZM1JwYjI0bklDWW1JR1oxYm1NdWJHVnVaM1JvSUQwOVBTQm5aWFJCY21sMGVTaHdZWFIwWlhKdUtTeGNiaUFnSUNBZ0lDZG1kVzVqSUcxMWMzUWdZbVVnWVNBbklDc2daMlYwUVhKcGRIa29jR0YwZEdWeWJpa2dLeUFuTFdGeVozVnRaVzUwSUdaMWJtTjBhVzl1SjF4dUlDQWdJQ2s3WEc0Z0lIMHNYRzRnSUdGeWFYUjVPaUF4TEZ4dUlDQnRZWFJqYURvZ1puVnVZM1JwYjI0b2RtRnNkV1VzSUdKcGJtUnBibWR6S1NCN1hHNGdJQ0FnZG1GeUlHSnpJRDBnVzEwN1hHNGdJQ0FnYVdZZ0tIQmxjbVp2Y20xTllYUmphQ2gyWVd4MVpTd2dkR2hwY3k1d1lYUjBaWEp1TENCaWN5a3BJSHRjYmlBZ0lDQWdJSFpoY2lCaGJuTWdQU0IwYUdsekxtWjFibU11WVhCd2JIa29kR2hwY3k1MGFHbHpUMkpxTENCaWN5azdYRzRnSUNBZ0lDQmlhVzVrYVc1bmN5NXdkWE5vS0dGdWN5azdYRzRnSUNBZ0lDQnlaWFIxY200Z2RISjFaVHRjYmlBZ0lDQjlYRzRnSUNBZ2NtVjBkWEp1SUdaaGJITmxPMXh1SUNCOVhHNTlLVHRjYmx4dVRXRjBZMmhsY2k1M2FHVnVJRDBnVUdGMGRHVnliaTVsZUhSbGJtUW9lMXh1SUNCcGJtbDBPaUJtZFc1amRHbHZiaWh3WVhSMFpYSnVMQ0J3Y21Wa2FXTmhkR1VwSUh0Y2JpQWdJQ0IwYUdsekxuQmhkSFJsY200Z1BTQndZWFIwWlhKdU8xeHVJQ0FnSUhSb2FYTXVjSEpsWkdsallYUmxJRDBnY0hKbFpHbGpZWFJsTzF4dUlDQWdJSFJvYVhNdVlYSnBkSGtnUFNCblpYUkJjbWwwZVNod1lYUjBaWEp1S1R0Y2JpQWdJQ0JsYm5OMWNtVW9YRzRnSUNBZ0lDQjBlWEJsYjJZZ2NISmxaR2xqWVhSbElEMDlQU0FuWm5WdVkzUnBiMjRuSUNZbUlIQnlaV1JwWTJGMFpTNXNaVzVuZEdnZ1BUMDlJSFJvYVhNdVlYSnBkSGtzWEc0Z0lDQWdJQ0FuY0hKbFpHbGpZWFJsSUcxMWMzUWdZbVVnWVNBbklDc2dkR2hwY3k1aGNtbDBlU0FySUNjdFlYSm5kVzFsYm5RZ1puVnVZM1JwYjI0blhHNGdJQ0FnS1R0Y2JpQWdmU3hjYmlBZ2JXRjBZMmc2SUdaMWJtTjBhVzl1S0haaGJIVmxMQ0JpYVc1a2FXNW5jeWtnZTF4dUlDQWdJSFpoY2lCaWN5QTlJRnRkTzF4dUlDQWdJR2xtSUNod1pYSm1iM0p0VFdGMFkyZ29kbUZzZFdVc0lIUm9hWE11Y0dGMGRHVnliaXdnWW5NcElDWW1YRzRnSUNBZ0lDQWdJSFJvYVhNdWNISmxaR2xqWVhSbExtRndjR3g1S0hSb2FYTXVkR2hwYzA5aWFpd2dZbk1wS1NCN1hHNGdJQ0FnSUNCaWFXNWthVzVuY3k1d2RYTm9MbUZ3Y0d4NUtHSnBibVJwYm1kekxDQmljeWs3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdkSEoxWlR0Y2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlHWmhiSE5sTzF4dUlDQjlYRzU5S1R0Y2JseHVUV0YwWTJobGNpNXZjaUE5SUZCaGRIUmxjbTR1WlhoMFpXNWtLSHRjYmlBZ2FXNXBkRG9nWm5WdVkzUnBiMjRvTHlvZ2NERXNJSEF5TENBdUxpNGdLaThwSUh0Y2JpQWdJQ0JsYm5OMWNtVW9ZWEpuZFcxbGJuUnpMbXhsYm1kMGFDQStQU0F4TENCY0lpZHZjaWNnY21WeGRXbHlaWE1nWVhRZ2JHVmhjM1FnYjI1bElIQmhkSFJsY201Y0lpazdYRzRnSUNBZ2RHaHBjeTV3WVhSMFpYSnVjeUE5SUVGeWNtRjVVSEp2ZEc4dWMyeHBZMlV1WTJGc2JDaGhjbWQxYldWdWRITXBPMXh1SUNBZ0lIUm9hWE11WVhKcGRIa2dQU0JsYm5OMWNtVlZibWxtYjNKdFFYSnBkSGtvZEdocGN5NXdZWFIwWlhKdWN5d2dKMjl5SnlrN1hHNGdJSDBzWEc0Z0lHMWhkR05vT2lCbWRXNWpkR2x2YmloMllXeDFaU3dnWW1sdVpHbHVaM01wSUh0Y2JpQWdJQ0IyWVhJZ2NHRjBkR1Z5Ym5NZ1BTQjBhR2x6TG5CaGRIUmxjbTV6TzF4dUlDQWdJSFpoY2lCaGJuTWdQU0JtWVd4elpUdGNiaUFnSUNCbWIzSWdLSFpoY2lCcFpIZ2dQU0F3T3lCcFpIZ2dQQ0J3WVhSMFpYSnVjeTVzWlc1bmRHZ2dKaVlnSVdGdWN6c2dhV1I0S3lzcElIdGNiaUFnSUNBZ0lHRnVjeUE5SUhCbGNtWnZjbTFOWVhSamFDaDJZV3gxWlN3Z2NHRjBkR1Z5Ym5OYmFXUjRYU3dnWW1sdVpHbHVaM01wTzF4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z1lXNXpPMXh1SUNCOUxGeHVmU2s3WEc1Y2JrMWhkR05vWlhJdVlXNWtJRDBnVUdGMGRHVnliaTVsZUhSbGJtUW9lMXh1SUNCcGJtbDBPaUJtZFc1amRHbHZiaWd2S2lCd01Td2djRElzSUM0dUxpQXFMeWtnZTF4dUlDQWdJR1Z1YzNWeVpTaGhjbWQxYldWdWRITXViR1Z1WjNSb0lENDlJREVzSUZ3aUoyRnVaQ2NnY21WeGRXbHlaWE1nWVhRZ2JHVmhjM1FnYjI1bElIQmhkSFJsY201Y0lpazdYRzRnSUNBZ2RHaHBjeTV3WVhSMFpYSnVjeUE5SUVGeWNtRjVVSEp2ZEc4dWMyeHBZMlV1WTJGc2JDaGhjbWQxYldWdWRITXBPMXh1SUNBZ0lIUm9hWE11WVhKcGRIa2dQU0IwYUdsekxuQmhkSFJsY201ekxuSmxaSFZqWlNobWRXNWpkR2x2YmloemRXMHNJSEFwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJ6ZFcwZ0t5Qm5aWFJCY21sMGVTaHdLVHNnZlN4Y2JpQWdJQ0F3S1R0Y2JpQWdmU3hjYmlBZ2JXRjBZMmc2SUdaMWJtTjBhVzl1S0haaGJIVmxMQ0JpYVc1a2FXNW5jeWtnZTF4dUlDQWdJSFpoY2lCd1lYUjBaWEp1Y3lBOUlIUm9hWE11Y0dGMGRHVnlibk03WEc0Z0lDQWdkbUZ5SUdGdWN5QTlJSFJ5ZFdVN1hHNGdJQ0FnWm05eUlDaDJZWElnYVdSNElEMGdNRHNnYVdSNElEd2djR0YwZEdWeWJuTXViR1Z1WjNSb0lDWW1JR0Z1Y3pzZ2FXUjRLeXNwSUh0Y2JpQWdJQ0FnSUdGdWN5QTlJSEJsY21admNtMU5ZWFJqYUNoMllXeDFaU3dnY0dGMGRHVnlibk5iYVdSNFhTd2dZbWx1WkdsdVozTXBPMXh1SUNBZ0lIMWNiaUFnSUNCeVpYUjFjbTRnWVc1ek8xeHVJQ0I5WEc1OUtUdGNibHh1THk4Z1NHVnNjR1Z5YzF4dUx5OGdMUzB0TFMwdExWeHVYRzVtZFc1amRHbHZiaUJmWVhKeVlYbE5ZWFJqYUNoMllXeDFaU3dnY0dGMGRHVnliaXdnWW1sdVpHbHVaM01wSUh0Y2JpQWdhV1lnS0NGQmNuSmhlUzVwYzBGeWNtRjVLSFpoYkhWbEtTa2dlMXh1SUNBZ0lISmxkSFZ5YmlCbVlXeHpaVHRjYmlBZ2ZWeHVJQ0IyWVhJZ2RrbGtlQ0E5SURBN1hHNGdJSFpoY2lCd1NXUjRJRDBnTUR0Y2JpQWdkMmhwYkdVZ0tIQkpaSGdnUENCd1lYUjBaWEp1TG14bGJtZDBhQ2tnZTF4dUlDQWdJSFpoY2lCd0lEMGdjR0YwZEdWeWJsdHdTV1I0S3l0ZE8xeHVJQ0FnSUdsbUlDaHdJR2x1YzNSaGJtTmxiMllnVFdGMFkyaGxjaTV0WVc1NUtTQjdYRzRnSUNBZ0lDQndJRDBnY0M1d1lYUjBaWEp1TzF4dUlDQWdJQ0FnZG1GeUlIWnpJRDBnVzEwN1hHNGdJQ0FnSUNCM2FHbHNaU0FvZGtsa2VDQThJSFpoYkhWbExteGxibWQwYUNBbUppQndaWEptYjNKdFRXRjBZMmdvZG1Gc2RXVmJka2xrZUYwc0lIQXNJSFp6S1NrZ2UxeHVJQ0FnSUNBZ0lDQjJTV1I0S3lzN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCaWFXNWthVzVuY3k1d2RYTm9LSFp6S1R0Y2JpQWdJQ0I5SUdWc2MyVWdhV1lnS0hBZ2FXNXpkR0Z1WTJWdlppQk5ZWFJqYUdWeUxtOXdkQ2tnZTF4dUlDQWdJQ0FnZG1GeUlHRnVjeUE5SUhaSlpIZ2dQQ0IyWVd4MVpTNXNaVzVuZEdnZ1B5QndaWEptYjNKdFRXRjBZMmdvZG1Gc2RXVmJka2xrZUYwc0lIQXVjR0YwZEdWeWJpd2dXMTBwSURvZ1ptRnNjMlU3WEc0Z0lDQWdJQ0JwWmlBb1lXNXpLU0I3WEc0Z0lDQWdJQ0FnSUdKcGJtUnBibWR6TG5CMWMyZ29ZVzV6S1R0Y2JpQWdJQ0FnSUNBZ2RrbGtlQ3NyTzF4dUlDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnWW1sdVpHbHVaM011Y0hWemFDaDFibVJsWm1sdVpXUXBPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lIMGdaV3h6WlNCcFppQW9jR1Z5Wm05eWJVMWhkR05vS0haaGJIVmxXM1pKWkhoZExDQndMQ0JpYVc1a2FXNW5jeWtwSUh0Y2JpQWdJQ0FnSUhaSlpIZ3JLenRjYmlBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUdaaGJITmxPMXh1SUNBZ0lIMWNiaUFnZlZ4dUlDQnlaWFIxY200Z2RrbGtlQ0E5UFQwZ2RtRnNkV1V1YkdWdVozUm9JQ1ltSUhCSlpIZ2dQVDA5SUhCaGRIUmxjbTR1YkdWdVozUm9PMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQmZiMkpxVFdGMFkyZ29kbUZzZFdVc0lIQmhkSFJsY200c0lHSnBibVJwYm1kektTQjdYRzRnSUdadmNpQW9kbUZ5SUdzZ2FXNGdjR0YwZEdWeWJpa2dlMXh1SUNBZ0lHbG1JQ2h3WVhSMFpYSnVMbWhoYzA5M2JsQnliM0JsY25SNUtHc3BJQ1ltWEc0Z0lDQWdJQ0FnSUNFb2F5QnBiaUIyWVd4MVpTa2dmSHhjYmlBZ0lDQWdJQ0FnSVhCbGNtWnZjbTFOWVhSamFDaDJZV3gxWlZ0clhTd2djR0YwZEdWeWJsdHJYU3dnWW1sdVpHbHVaM01wS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnWm1Gc2MyVTdYRzRnSUNBZ2ZWeHVJQ0I5WEc0Z0lISmxkSFZ5YmlCMGNuVmxPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQmZablZ1WTNScGIyNU5ZWFJqYUNoMllXeDFaU3dnWm5WdVl5d2dZbWx1WkdsdVozTXBJSHRjYmlBZ2FXWWdLR1oxYm1Nb2RtRnNkV1VwS1NCN1hHNGdJQ0FnWW1sdVpHbHVaM011Y0hWemFDaDJZV3gxWlNrN1hHNGdJQ0FnY21WMGRYSnVJSFJ5ZFdVN1hHNGdJSDFjYmlBZ2NtVjBkWEp1SUdaaGJITmxPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQmZaWEYxWVd4cGRIbE5ZWFJqYUNoMllXeDFaU3dnY0dGMGRHVnliaXdnWW1sdVpHbHVaM01wSUh0Y2JpQWdjbVYwZFhKdUlIWmhiSFZsSUQwOVBTQndZWFIwWlhKdU8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCZmNtVm5SWGh3VFdGMFkyZ29kbUZzZFdVc0lIQmhkSFJsY200c0lHSnBibVJwYm1kektTQjdYRzRnSUhaaGNpQmhibk1nUFNCd1lYUjBaWEp1TG1WNFpXTW9kbUZzZFdVcE8xeHVJQ0JwWmlBb1lXNXpJQ0U5UFNCdWRXeHNJQ1ltSUdGdWMxc3dYU0E5UFQwZ2RtRnNkV1VwSUh0Y2JpQWdJQ0JpYVc1a2FXNW5jeTV3ZFhOb0tHRnVjeWs3WEc0Z0lDQWdjbVYwZFhKdUlIUnlkV1U3WEc0Z0lIMWNiaUFnY21WMGRYSnVJR1poYkhObE8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCd1pYSm1iM0p0VFdGMFkyZ29kbUZzZFdVc0lIQmhkSFJsY200c0lHSnBibVJwYm1kektTQjdYRzRnSUdsbUlDaHdZWFIwWlhKdUlHbHVjM1JoYm1ObGIyWWdVR0YwZEdWeWJpa2dlMXh1SUNBZ0lISmxkSFZ5YmlCd1lYUjBaWEp1TG0xaGRHTm9LSFpoYkhWbExDQmlhVzVrYVc1bmN5azdYRzRnSUgwZ1pXeHpaU0JwWmlBb1FYSnlZWGt1YVhOQmNuSmhlU2h3WVhSMFpYSnVLU2tnZTF4dUlDQWdJSEpsZEhWeWJpQmZZWEp5WVhsTllYUmphQ2gyWVd4MVpTd2djR0YwZEdWeWJpd2dZbWx1WkdsdVozTXBPMXh1SUNCOUlHVnNjMlVnYVdZZ0tIQmhkSFJsY200Z2FXNXpkR0Z1WTJWdlppQlNaV2RGZUhBcElIdGNiaUFnSUNCeVpYUjFjbTRnWDNKbFowVjRjRTFoZEdOb0tIWmhiSFZsTENCd1lYUjBaWEp1TENCaWFXNWthVzVuY3lrN1hHNGdJSDBnWld4elpTQnBaaUFvZEhsd1pXOW1JSEJoZEhSbGNtNGdQVDA5SUNkdlltcGxZM1FuSUNZbUlIQmhkSFJsY200Z0lUMDlJRzUxYkd3cElIdGNiaUFnSUNCeVpYUjFjbTRnWDI5aWFrMWhkR05vS0haaGJIVmxMQ0J3WVhSMFpYSnVMQ0JpYVc1a2FXNW5jeWs3WEc0Z0lIMGdaV3h6WlNCcFppQW9kSGx3Wlc5bUlIQmhkSFJsY200Z1BUMDlJQ2RtZFc1amRHbHZiaWNwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdYMloxYm1OMGFXOXVUV0YwWTJnb2RtRnNkV1VzSUhCaGRIUmxjbTRzSUdKcGJtUnBibWR6S1R0Y2JpQWdmVnh1SUNCeVpYUjFjbTRnWDJWeGRXRnNhWFI1VFdGMFkyZ29kbUZzZFdVc0lIQmhkSFJsY200c0lHSnBibVJwYm1kektUdGNibjFjYmx4dVpuVnVZM1JwYjI0Z1oyVjBRWEpwZEhrb2NHRjBkR1Z5YmlrZ2UxeHVJQ0JwWmlBb2NHRjBkR1Z5YmlCcGJuTjBZVzVqWlc5bUlGQmhkSFJsY200cElIdGNiaUFnSUNCeVpYUjFjbTRnY0dGMGRHVnliaTVoY21sMGVUdGNiaUFnZlNCbGJITmxJR2xtSUNoQmNuSmhlUzVwYzBGeWNtRjVLSEJoZEhSbGNtNHBLU0I3WEc0Z0lDQWdjbVYwZFhKdUlIQmhkSFJsY201Y2JpQWdJQ0FnSUM1dFlYQW9ablZ1WTNScGIyNG9jQ2tnZXlCeVpYUjFjbTRnWjJWMFFYSnBkSGtvY0NrN0lIMHBYRzRnSUNBZ0lDQXVjbVZrZFdObEtHWjFibU4wYVc5dUtHRXhMQ0JoTWlrZ2V5QnlaWFIxY200Z1lURWdLeUJoTWpzZ2ZTd2dNQ2s3WEc0Z0lIMGdaV3h6WlNCcFppQW9jR0YwZEdWeWJpQnBibk4wWVc1alpXOW1JRkpsWjBWNGNDa2dlMXh1SUNBZ0lISmxkSFZ5YmlBeE8xeHVJQ0I5SUdWc2MyVWdhV1lnS0hSNWNHVnZaaUJ3WVhSMFpYSnVJRDA5UFNBbmIySnFaV04wSnlBbUppQndZWFIwWlhKdUlDRTlQU0J1ZFd4c0tTQjdYRzRnSUNBZ2RtRnlJR0Z1Y3lBOUlEQTdYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2F5QnBiaUJ3WVhSMFpYSnVLU0I3WEc0Z0lDQWdJQ0JwWmlBb2NHRjBkR1Z5Ymk1b1lYTlBkMjVRY205d1pYSjBlU2hyS1NrZ2UxeHVJQ0FnSUNBZ0lDQmhibk1nS3owZ1oyVjBRWEpwZEhrb2NHRjBkR1Z5Ymx0clhTazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJoYm5NN1hHNGdJSDBnWld4elpTQnBaaUFvZEhsd1pXOW1JSEJoZEhSbGNtNGdQVDA5SUNkbWRXNWpkR2x2YmljcElIdGNiaUFnSUNCeVpYUjFjbTRnTVR0Y2JpQWdmVnh1SUNCeVpYUjFjbTRnTUR0Y2JuMWNibHh1Wm5WdVkzUnBiMjRnWlc1emRYSmxWVzVwWm05eWJVRnlhWFI1S0hCaGRIUmxjbTV6TENCdmNDa2dlMXh1SUNCMllYSWdjbVZ6ZFd4MElEMGdaMlYwUVhKcGRIa29jR0YwZEdWeWJuTmJNRjBwTzF4dUlDQm1iM0lnS0haaGNpQnBaSGdnUFNBeE95QnBaSGdnUENCd1lYUjBaWEp1Y3k1c1pXNW5kR2c3SUdsa2VDc3JLU0I3WEc0Z0lDQWdkbUZ5SUdFZ1BTQm5aWFJCY21sMGVTaHdZWFIwWlhKdWMxdHBaSGhkS1R0Y2JpQWdJQ0JwWmlBb1lTQWhQVDBnY21WemRXeDBLU0I3WEc0Z0lDQWdJQ0IwYUhKdmR5QnVaWGNnUlhKeWIzSW9iM0FnS3lBbk9pQmxlSEJsWTNSbFpDQmhjbWwwZVNBbklDc2djbVZ6ZFd4MElDc2dKeUJoZENCcGJtUmxlQ0FuSUNzZ2FXUjRJQ3NnSnl3Z1oyOTBJQ2NnS3lCaEtUdGNiaUFnSUNCOVhHNGdJSDFjYmlBZ2NtVjBkWEp1SUhKbGMzVnNkRHRjYm4xY2JseHVablZ1WTNScGIyNGdaVzV6ZFhKbEtHTnZibVFzSUcxbGMzTmhaMlVwSUh0Y2JpQWdhV1lnS0NGamIyNWtLU0I3WEc0Z0lDQWdkR2h5YjNjZ2JtVjNJRVZ5Y205eUtHMWxjM05oWjJVcE8xeHVJQ0I5WEc1OVhHNWNiaTh2SUUxaGRHTm9aWEpjYmk4dklDMHRMUzB0TFMxY2JseHVablZ1WTNScGIyNGdUV0YwWTJobGNpZ3BJSHRjYmlBZ2RHaHBjeTV3WVhSMFpYSnVjeUE5SUZ0ZE8xeHVJQ0IwYUdsekxuUm9hWE5QWW1vZ1BTQjFibVJsWm1sdVpXUTdYRzU5WEc1Y2JrMWhkR05vWlhJdWNISnZkRzkwZVhCbExuZHBkR2hVYUdseklEMGdablZ1WTNScGIyNG9iMkpxS1NCN1hHNGdJSFJvYVhNdWRHaHBjMDlpYWlBOUlHOWlhanRjYmlBZ2NtVjBkWEp1SUhSb2FYTTdYRzU5TzF4dVhHNU5ZWFJqYUdWeUxuQnliM1J2ZEhsd1pTNWhaR1JEWVhObElEMGdablZ1WTNScGIyNG9jR0YwZEdWeWJpd2diM0IwUm5WdVl5a2dlMXh1SUNCMGFHbHpMbkJoZEhSbGNtNXpMbkIxYzJnb1RXRjBZMmhsY2k1MGNtRnVjeWh3WVhSMFpYSnVMQ0J2Y0hSR2RXNWpLU2s3WEc0Z0lISmxkSFZ5YmlCMGFHbHpPMXh1ZlR0Y2JseHVUV0YwWTJobGNpNXdjbTkwYjNSNWNHVXViV0YwWTJnZ1BTQm1kVzVqZEdsdmJpaDJZV3gxWlNrZ2UxeHVJQ0JsYm5OMWNtVW9kR2hwY3k1d1lYUjBaWEp1Y3k1c1pXNW5kR2dnUGlBd0xDQW5UV0YwWTJobGNpQnlaWEYxYVhKbGN5QmhkQ0JzWldGemRDQnZibVVnWTJGelpTY3BPMXh1WEc0Z0lIWmhjaUJpYVc1a2FXNW5jeUE5SUZ0ZE8xeHVJQ0JwWmlBb1RXRjBZMmhsY2k1dmNpNW1jbTl0UVhKeVlYa29kR2hwY3k1d1lYUjBaWEp1Y3lrdWJXRjBZMmdvZG1Gc2RXVXNJR0pwYm1ScGJtZHpLU2tnZTF4dUlDQWdJSEpsZEhWeWJpQmlhVzVrYVc1bmMxc3dYVHRjYmlBZ2ZWeHVJQ0IwYUhKdmR5QnVaWGNnVFdGMFkyaEdZV2xzZFhKbEtIWmhiSFZsTENCdVpYY2dSWEp5YjNJb0tTNXpkR0ZqYXlrN1hHNTlPMXh1WEc1TllYUmphR1Z5TG5CeWIzUnZkSGx3WlM1MGIwWjFibU4wYVc5dUlEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lIWmhjaUJ6Wld4bUlEMGdkR2hwY3p0Y2JpQWdjbVYwZFhKdUlHWjFibU4wYVc5dUtIWmhiSFZsS1NCN0lISmxkSFZ5YmlCelpXeG1MbTFoZEdOb0tIWmhiSFZsS1RzZ2ZUdGNibjA3WEc1Y2JpOHZJRkJ5YVcxcGRHbDJaU0J3WVhSMFpYSnVjMXh1WEc1TllYUmphR1Z5TGw4Z0lDQWdJQ0E5SUdaMWJtTjBhVzl1S0hncElIc2djbVYwZFhKdUlIUnlkV1U3SUgwN1hHNU5ZWFJqYUdWeUxtSnZiMndnSUNBOUlHWjFibU4wYVc5dUtIZ3BJSHNnY21WMGRYSnVJSFI1Y0dWdlppQjRJRDA5UFNBblltOXZiR1ZoYmljN0lIMDdYRzVOWVhSamFHVnlMbTUxYldKbGNpQTlJR1oxYm1OMGFXOXVLSGdwSUhzZ2NtVjBkWEp1SUhSNWNHVnZaaUI0SUQwOVBTQW5iblZ0WW1WeUp6c2dmVHRjYmsxaGRHTm9aWEl1YzNSeWFXNW5JRDBnWm5WdVkzUnBiMjRvZUNrZ2V5QnlaWFIxY200Z2RIbHdaVzltSUhnZ1BUMDlJQ2R6ZEhKcGJtY25PeUI5TzF4dVRXRjBZMmhsY2k1amFHRnlJQ0FnUFNCbWRXNWpkR2x2YmloNEtTQjdJSEpsZEhWeWJpQjBlWEJsYjJZZ2VDQTlQVDBnSjNOMGNtbHVaeWNnSmlZZ2VDNXNaVzVuZEdnZ1BUMDlJREE3SUgwN1hHNWNiaTh2SUU5d1pYSmhkRzl5YzF4dVhHNU5ZWFJqYUdWeUxtbHVjM1JoYm1ObFQyWWdQU0JtZFc1amRHbHZiaWhqYkdGNmVpa2dleUJ5WlhSMWNtNGdablZ1WTNScGIyNG9lQ2tnZXlCeVpYUjFjbTRnZUNCcGJuTjBZVzVqWlc5bUlHTnNZWHA2T3lCOU95QjlPMXh1WEc1TllYUmphR1Z5TGsxaGRHTm9SbUZwYkhWeVpTQTlJRTFoZEdOb1JtRnBiSFZ5WlR0Y2JseHVMeThnVkdWeWMyVWdhVzUwWlhKbVlXTmxYRzR2THlBdExTMHRMUzB0TFMwdExTMHRMUzFjYmx4dVpuVnVZM1JwYjI0Z2JXRjBZMmdvZG1Gc2RXVWdMeW9nTENCd1lYUXhMQ0JtZFc0eExDQndZWFF5TENCbWRXNHlMQ0F1TGk0Z0tpOHBJSHRjYmlBZ2RtRnlJR0Z5WjNNZ1BTQmhjbWQxYldWdWRITTdYRzVjYmlBZ0x5OGdWMmhsYmlCallXeHNaV1FnZDJsMGFDQnFkWE4wSUdFZ2RtRnNkV1VnWVc1a0lHRWdjR0YwZEdWeWJpd2djbVYwZFhKdUlIUm9aU0JpYVc1a2FXNW5jeUJwWmx4dUlDQXZMeUIwYUdVZ2JXRjBZMmdnZDJGeklITjFZMk5sYzNObWRXd3NJRzkwYUdWeWQybHpaU0J1ZFd4c0xseHVJQ0JwWmlBb1lYSm5jeTVzWlc1bmRHZ2dQVDA5SURJcElIdGNiaUFnSUNCMllYSWdZbWx1WkdsdVozTWdQU0JiWFR0Y2JpQWdJQ0JwWmlBb2NHVnlabTl5YlUxaGRHTm9LSFpoYkhWbExDQmhjbWQxYldWdWRITmJNVjBzSUdKcGJtUnBibWR6S1NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUdKcGJtUnBibWR6TzF4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z2JuVnNiRHRjYmlBZ2ZWeHVYRzRnSUdWdWMzVnlaU2hjYmlBZ0lDQWdJR0Z5WjNNdWJHVnVaM1JvSUQ0Z01pQW1KaUJoY21kekxteGxibWQwYUNBbElESWdQVDA5SURFc1hHNGdJQ0FnSUNBbmJXRjBZMmdnWTJGc2JHVmtJSGRwZEdnZ2FXNTJZV3hwWkNCaGNtZDFiV1Z1ZEhNbktUdGNiaUFnZG1GeUlHMGdQU0J1WlhjZ1RXRjBZMmhsY2lncE8xeHVJQ0JtYjNJZ0tIWmhjaUJwWkhnZ1BTQXhPeUJwWkhnZ1BDQmhjbWR6TG14bGJtZDBhRHNnYVdSNElDczlJRElwSUh0Y2JpQWdJQ0IyWVhJZ2NHRjBkR1Z5YmlBOUlHRnlaM05iYVdSNFhUdGNiaUFnSUNCMllYSWdablZ1WXlBOUlHRnlaM05iYVdSNElDc2dNVjA3WEc0Z0lDQWdiUzVoWkdSRFlYTmxLSEJoZEhSbGNtNHNJR1oxYm1NcE8xeHVJQ0I5WEc0Z0lISmxkSFZ5YmlCdExtMWhkR05vS0haaGJIVmxLVHRjYm4xY2JseHVMeThnUlhod2IzSjBjMXh1THk4Z0xTMHRMUzB0TFZ4dVhHNXRiMlIxYkdVdVpYaHdiM0owY3lBOUlIdGNiaUFnVFdGMFkyaGxjam9nVFdGMFkyaGxjaXhjYmlBZ2JXRjBZMmc2SUcxaGRHTm9MRnh1SUNCUVlYUjBaWEp1T2lCUVlYUjBaWEp1WEc1OU8xeHVJaXdpTHlvZ1oyeHZZbUZzSUZONWJXSnZiQ0FxTDF4dVhHNTJZWElnU1ZSRlVrRlVUMUpmVTFsTlFrOU1JRDBnZEhsd1pXOW1JRk41YldKdmJDQTlQVDBnSjJaMWJtTjBhVzl1SnlBbUppQlRlVzFpYjJ3dWFYUmxjbUYwYjNJN1hHNTJZWElnUmtGTFJWOUpWRVZTUVZSUFVsOVRXVTFDVDB3Z1BTQW5RRUJwZEdWeVlYUnZjaWM3WEc1Y2JuWmhjaUIwYjFOMGNtbHVaeUE5SUU5aWFtVmpkQzV3Y205MGIzUjVjR1V1ZEc5VGRISnBibWM3WEc1Y2JpOHZJRWhsYkhCbGNuTmNiaTh2SUMwdExTMHRMUzFjYmx4dVpuVnVZM1JwYjI0Z2FYTlRkSEpwYm1jb2IySnFLU0I3WEc1Y2RISmxkSFZ5YmlCMGIxTjBjbWx1Wnk1allXeHNLRzlpYWlrZ1BUMDlJQ2RiYjJKcVpXTjBJRk4wY21sdVoxMG5PMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQnBjMDUxYldKbGNpaHZZbW9wSUh0Y2JseDBjbVYwZFhKdUlIUnZVM1J5YVc1bkxtTmhiR3dvYjJKcUtTQTlQVDBnSjF0dlltcGxZM1FnVG5WdFltVnlYU2M3WEc1OVhHNWNibVoxYm1OMGFXOXVJR2x6UVhKeVlYbE1hV3RsS0c5aWFpa2dlMXh1WEhSeVpYUjFjbTRnYVhOT2RXMWlaWElvYjJKcUxteGxibWQwYUNrZ0ppWWdJV2x6VTNSeWFXNW5LRzlpYWlrN1hHNTlYRzVjYmk4dklFRnljbUY1U1hSbGNtRjBiM0pjYmk4dklDMHRMUzB0TFMwdExTMHRMUzFjYmx4dVpuVnVZM1JwYjI0Z1FYSnlZWGxKZEdWeVlYUnZjaWhwZEdWeVlYUmxaU2tnZTF4dVhIUjBhR2x6TGw5cGRHVnlZWFJsWlNBOUlHbDBaWEpoZEdWbE8xeHVYSFIwYUdsekxsOXBJRDBnTUR0Y2JseDBkR2hwY3k1ZmJHVnVJRDBnYVhSbGNtRjBaV1V1YkdWdVozUm9PMXh1ZlZ4dVhHNUJjbkpoZVVsMFpYSmhkRzl5TG5CeWIzUnZkSGx3WlM1dVpYaDBJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNWNkR2xtSUNoMGFHbHpMbDlwSUR3Z2RHaHBjeTVmYkdWdUtTQjdYRzVjZEZ4MGNtVjBkWEp1SUhzZ1pHOXVaVG9nWm1Gc2MyVXNJSFpoYkhWbE9pQjBhR2x6TGw5cGRHVnlZWFJsWlZ0MGFHbHpMbDlwS3l0ZElIMDdYRzVjZEgxY2JseDBjbVYwZFhKdUlIc2daRzl1WlRvZ2RISjFaU0I5TzF4dWZUdGNibHh1UVhKeVlYbEpkR1Z5WVhSdmNpNXdjbTkwYjNSNWNHVmJSa0ZMUlY5SlZFVlNRVlJQVWw5VFdVMUNUMHhkSUQwZ1puVnVZM1JwYjI0b0tTQjdJSEpsZEhWeWJpQjBhR2x6T3lCOU8xeHVYRzVwWmlBb1NWUkZVa0ZVVDFKZlUxbE5RazlNS1NCN1hHNWNkRUZ5Y21GNVNYUmxjbUYwYjNJdWNISnZkRzkwZVhCbFcwbFVSVkpCVkU5U1gxTlpUVUpQVEYwZ1BTQm1kVzVqZEdsdmJpZ3BJSHNnY21WMGRYSnVJSFJvYVhNN0lIMDdYRzU5WEc1Y2JpOHZJRVY0Y0c5eWRITmNiaTh2SUMwdExTMHRMUzFjYmx4dUx5OGdVbVYwZFhKdWN5QmhiaUJwZEdWeVlYUnZjaUFvWVc0Z2IySnFaV04wSUhSb1lYUWdhR0Z6SUdFZ2JtVjRkQ2dwSUcxbGRHaHZaQ2tnWm05eUlHQnZZbXBnTGx4dUx5OGdSbWx5YzNRc0lHbDBJSFJ5YVdWeklIUnZJSFZ6WlNCMGFHVWdSVk0ySUdsMFpYSmhkRzl5SUhCeWIzUnZZMjlzSUNoVGVXMWliMnd1YVhSbGNtRjBiM0lwTGx4dUx5OGdTWFFnWm1Gc2JITWdZbUZqYXlCMGJ5QjBhR1VnSjJaaGEyVW5JR2wwWlhKaGRHOXlJSEJ5YjNSdlkyOXNJQ2duUUVCcGRHVnlZWFJ2Y2ljcElIUm9ZWFFnYVhOY2JpOHZJSFZ6WldRZ1lua2djMjl0WlNCc2FXSnlZWEpwWlhNZ0tHVXVaeTRnYVcxdGRYUmhZbXhsTFdwektTNGdSbWx1WVd4c2VTd2dhV1lnZEdobElHOWlhbVZqZENCb1lYTmNiaTh2SUdFZ2JuVnRaWEpwWXlCZ2JHVnVaM1JvWUNCd2NtOXdaWEowZVNCaGJtUWdhWE1nYm05MElHRWdjM1J5YVc1bkxDQnBkQ0JwY3lCMGNtVmhkR1ZrSUdGeklHRnVJRUZ5Y21GNVhHNHZMeUIwYnlCaVpTQnBkR1Z5WVhSbFpDQjFjMmx1WnlCaGJpQkJjbkpoZVVsMFpYSmhkRzl5TGx4dVpuVnVZM1JwYjI0Z1oyVjBTWFJsY21GMGIzSW9iMkpxS1NCN1hHNWNkR2xtSUNnaGIySnFLU0I3WEc1Y2RGeDBjbVYwZFhKdU8xeHVYSFI5WEc1Y2RHbG1JQ2hKVkVWU1FWUlBVbDlUV1UxQ1Qwd2dKaVlnZEhsd1pXOW1JRzlpYWx0SlZFVlNRVlJQVWw5VFdVMUNUMHhkSUQwOVBTQW5ablZ1WTNScGIyNG5LU0I3WEc1Y2RGeDBjbVYwZFhKdUlHOWlhbHRKVkVWU1FWUlBVbDlUV1UxQ1QweGRLQ2s3WEc1Y2RIMWNibHgwYVdZZ0tIUjVjR1Z2WmlCdlltcGJSa0ZMUlY5SlZFVlNRVlJQVWw5VFdVMUNUMHhkSUQwOVBTQW5ablZ1WTNScGIyNG5LU0I3WEc1Y2RGeDBjbVYwZFhKdUlHOWlhbHRHUVV0RlgwbFVSVkpCVkU5U1gxTlpUVUpQVEYwb0tUdGNibHgwZlZ4dVhIUnBaaUFvYVhOQmNuSmhlVXhwYTJVb2IySnFLU2tnZTF4dVhIUmNkSEpsZEhWeWJpQnVaWGNnUVhKeVlYbEpkR1Z5WVhSdmNpaHZZbW9wTzF4dVhIUjlYRzU5WEc1Y2JtWjFibU4wYVc5dUlHbHpTWFJsY21GaWJHVW9iMkpxS1NCN1hHNWNkR2xtSUNodlltb3BJSHRjYmx4MFhIUnlaWFIxY200Z0tFbFVSVkpCVkU5U1gxTlpUVUpQVENBbUppQjBlWEJsYjJZZ2IySnFXMGxVUlZKQlZFOVNYMU5aVFVKUFRGMGdQVDA5SUNkbWRXNWpkR2x2YmljcElIeDhYRzVjZEZ4MFhIUmNkRngwSUhSNWNHVnZaaUJ2WW1wYlJrRkxSVjlKVkVWU1FWUlBVbDlUV1UxQ1QweGRJRDA5UFNBblpuVnVZM1JwYjI0bklIeDhYRzVjZEZ4MFhIUmNkRngwSUdselFYSnlZWGxNYVd0bEtHOWlhaWs3WEc1Y2RIMWNibHgwY21WMGRYSnVJR1poYkhObE8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCMGIwRnljbUY1S0dsMFpYSmhZbXhsS1NCN1hHNWNkSFpoY2lCcGRHVnlJRDBnWjJWMFNYUmxjbUYwYjNJb2FYUmxjbUZpYkdVcE8xeHVYSFJwWmlBb2FYUmxjaWtnZTF4dVhIUmNkSFpoY2lCeVpYTjFiSFFnUFNCYlhUdGNibHgwWEhSMllYSWdibVY0ZER0Y2JseDBYSFIzYUdsc1pTQW9JU2h1WlhoMElEMGdhWFJsY2k1dVpYaDBLQ2twTG1SdmJtVXBJSHRjYmx4MFhIUmNkSEpsYzNWc2RDNXdkWE5vS0c1bGVIUXVkbUZzZFdVcE8xeHVYSFJjZEgxY2JseDBYSFJ5WlhSMWNtNGdjbVZ6ZFd4ME8xeHVYSFI5WEc1OVhHNWNibTF2WkhWc1pTNWxlSEJ2Y25SeklEMGdlMXh1WEhSblpYUkpkR1Z5WVhSdmNqb2daMlYwU1hSbGNtRjBiM0lzWEc1Y2RHbHpTWFJsY21GaWJHVTZJR2x6U1hSbGNtRmliR1VzWEc1Y2RIUnZRWEp5WVhrNklIUnZRWEp5WVhsY2JuMDdYRzRpWFgwPVxuXG4iLCIvLyBCYXNlZCBvbiBodHRwczovL2dpdGh1Yi5jb20vUG9seW1lci9XZWFrTWFwL2Jsb2IvYzQ2ODVhOWUzYTU3OWMyNTNjY2Y4ZTczNzljMDQ3YzNhMWY5OTEwNi93ZWFrbWFwLmpzXG5cbi8qXG4gKiBDb3B5cmlnaHQgMjAxMiBUaGUgUG9seW1lciBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYSBCU0Qtc3R5bGVcbiAqIGxpY2Vuc2UgdGhhdCBjYW4gYmUgZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZS5cbiAqL1xuXG5pZiAodHlwZW9mIFdlYWtNYXAgPT09ICd1bmRlZmluZWQnKSB7XG4gIChmdW5jdGlvbigpIHtcbiAgICB2YXIgZGVmaW5lUHJvcGVydHkgPSBPYmplY3QuZGVmaW5lUHJvcGVydHk7XG4gICAgdmFyIGNvdW50ZXIgPSBEYXRlLm5vdygpICUgMWU5O1xuXG4gICAgdmFyIFdlYWtNYXAgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMubmFtZSA9ICdfX3N0JyArIChNYXRoLnJhbmRvbSgpICogMWU5ID4+PiAwKSArIChjb3VudGVyKysgKyAnX18nKTtcbiAgICB9O1xuXG4gICAgV2Vha01hcC5wcm90b3R5cGUgPSB7XG4gICAgICBzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgICAgdmFyIGVudHJ5ID0ga2V5W3RoaXMubmFtZV07XG4gICAgICAgIGlmIChlbnRyeSAmJiBlbnRyeVswXSA9PT0ga2V5KVxuICAgICAgICAgIGVudHJ5WzFdID0gdmFsdWU7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBkZWZpbmVQcm9wZXJ0eShrZXksIHRoaXMubmFtZSwge3ZhbHVlOiBba2V5LCB2YWx1ZV0sIHdyaXRhYmxlOiB0cnVlfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfSxcbiAgICAgIGdldDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBlbnRyeTtcbiAgICAgICAgcmV0dXJuIChlbnRyeSA9IGtleVt0aGlzLm5hbWVdKSAmJiBlbnRyeVswXSA9PT0ga2V5ID9cbiAgICAgICAgICAgIGVudHJ5WzFdIDogdW5kZWZpbmVkO1xuICAgICAgfSxcbiAgICAgIGRlbGV0ZTogZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBlbnRyeSA9IGtleVt0aGlzLm5hbWVdO1xuICAgICAgICBpZiAoIWVudHJ5KSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHZhciBoYXNWYWx1ZSA9IGVudHJ5WzBdID09PSBrZXk7XG4gICAgICAgIGVudHJ5WzBdID0gZW50cnlbMV0gPSB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiBoYXNWYWx1ZTtcbiAgICAgIH0sXG4gICAgICBoYXM6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIgZW50cnkgPSBrZXlbdGhpcy5uYW1lXTtcbiAgICAgICAgaWYgKCFlbnRyeSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICByZXR1cm4gZW50cnlbMF0gPT09IGtleTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogd2luZG93KS5XZWFrTWFwID0gV2Vha01hcDtcbiAgfSkoKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxucmVxdWlyZSgnNnRvNS9wb2x5ZmlsbCcpO1xucmVxdWlyZSgnNnRvNS9yZWdpc3RlcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgVmF0OiByZXF1aXJlKCcuL2xpYi92YXQnKSxcbiAgbWF0Y2g6IHtcbiAgXHRBTlk6IHJlcXVpcmUoJy4vdGhpcmRfcGFydHkvcGF0dGVybi1tYXRjaCcpLk1hdGNoZXIuX1xuICB9XG59O1xuIl19
