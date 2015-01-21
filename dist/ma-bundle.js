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
  find: function (gen, predicate, thisArg) {
    for (var _iterator2 = gen[Symbol.iterator](), _step2; !(_step2 = _iterator2.next()).done;) {
      var x = _step2.value;
      if (predicate.call(thisArg, x)) return x;
    }
  },
  filter: function (gen, predicate, thisArg) {
    return toArray(gen).filter(predicate, thisArg);
  },
  // Return the first value from `gen`.
  first: function (gen) {
    return gen.next().value;
  }
};

},{}],2:[function(require,module,exports){
"use strict";

var _slice = Array.prototype.slice;
var _toArray = function (arr) {
  return Array.isArray(arr) ? arr : Array.from(arr);
};

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

// NOTE: This does not return all possible matches, due to the way `matchDeep`
// works.
var getDeepMatches = regeneratorRuntime.mark(function getDeepMatches(arr, pattern) {
  var p, path, i, root, bindings, rootPath;
  return regeneratorRuntime.wrap(function getDeepMatches$(_context2) {
    while (true) switch (_context2.prev = _context2.next) {
      case 0: p = convertPattern(pattern);
        i = 0;
      case 2:
        if (!(i < arr.size)) {
          _context2.next = 12;
          break;
        }
        path = [i];
        root = arr.get(i).value;
        if (!((bindings = matchDeep(root, p, path)) !== null)) {
          _context2.next = 9;
          break;
        }
        rootPath = path.slice(1);
        _context2.next = 9;
        return { index: path[0], root: root, path: rootPath, bindings: bindings };
      case 9: ++i;
        _context2.next = 2;
        break;
      case 12:
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

// A pattern type which allows restricted matching on Reactions.
var reaction = Pattern.extend({
  init: function (r) {
    this.reaction = r;
  },
  match: function (value, bindings) {
    var r = this.reaction;
    // Only match if the pattern and the callback are identical. More general
    // matching on reactions needs more thought.
    return ((value instanceof Reaction || value instanceof Observer) && value.pattern === r.pattern && value.callback === r.callback);
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

// Recursively tries to match `obj` with `pattern`. NOTE: This only returns
// the first deep match found in a given object.
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
  var _this = this;
  var result = this._store.get(index).value;
  this._updateStore(function () {
    return _this._store.splice(index, 1);
  });
  return result;
};

Vat.prototype._collectReactionCandidates = function () {
  var _temp;
  var lists = _slice.call(arguments);

  var candidates = [];
  var store = this._store;
  (_temp = []).concat.apply(_temp, _toArray(lists)).forEach(function (r) {
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
  var _this2 = this;
  if (r instanceof Reaction) this._doWithoutHistory(function () {
    return _this2._removeAt(match.index);
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
  var _this3 = this;
  // To detect conflicts, keep track of all paths that are touched.
  var reactionPaths = Object.create(null);

  Object.keys(candidates).reverse().forEach(function (i) {
    // Sort candidates based on path length (longest to shortest).
    var sorted = candidates[i].slice().sort(function (a, b) {
      return a[1].path.length - b[1].path.length;
    });

    // Execute each reaction, detecting conflicts as we go.
    sorted.forEach(function (_ref) {
      var _ref2 = _toArray(_ref);

      var reaction = _ref2[0];
      var match = _ref2[1];
      var path = match.path;

      // Check all ancestor paths to see if one was already touched.
      var pathString;
      for (var j = 0; j <= path.length; ++j) {
        pathString = [i].concat(path.slice(0, j)).join("/") + "/";
        if (pathString in reactionPaths) throw new Error("Reaction conflict");
      }
      reactionPaths[pathString] = reaction._name;

      _this3._runReaction(reaction, match);
    });
  });
};

Vat.prototype.put = function (value) {
  var _this4 = this;
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
    return _this4._store.push(storedObj);
  });

  // A really naive version of deferred take/copy. This should
  // probably be written in a more efficient way.
  var self = this;
  this._waiting = this._waiting.filter(function (info) {
    return !self._try(info.pattern, info.op, info.callback);
  });

  var candidates = this._collectReactionCandidates(reactions, observers);
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
  var _this5 = this;
  var matches = gu.toArray(getMatches(this._store, pattern));
  return matches.map(function (i) {
    return _this5._store.get(i).value;
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
  var r = new Reaction({ pattern: pattern, callback: reaction });
  this.put(r);
  return r;
};

Vat.prototype.addObserver = function (pattern, cb) {
  var o = new Observer({ pattern: pattern, callback: cb });
  this.put(o);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9saWIvZ2VuZXJhdG9yLXV0aWwuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9saWIvdmF0LmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbGliLzZ0bzUvcG9seWZpbGwuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvNnRvNS9saWIvNnRvNS90cmFuc2Zvcm1hdGlvbi90cmFuc2Zvcm1lcnMvZXM2LWdlbmVyYXRvcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc2hpbS9lczYtc2hpbS5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc3ltYm9sL2ltcGxlbWVudC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc3ltYm9sL2lzLWltcGxlbWVudGVkLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbm9kZV9tb2R1bGVzL2VzNi1zeW1ib2wvbm9kZV9tb2R1bGVzL2QvaW5kZXguanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvNnRvNS9ub2RlX21vZHVsZXMvZXM2LXN5bWJvbC9ub2RlX21vZHVsZXMvZXM1LWV4dC9nbG9iYWwuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvNnRvNS9ub2RlX21vZHVsZXMvZXM2LXN5bWJvbC9ub2RlX21vZHVsZXMvZXM1LWV4dC9vYmplY3QvYXNzaWduL2luZGV4LmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbm9kZV9tb2R1bGVzL2VzNi1zeW1ib2wvbm9kZV9tb2R1bGVzL2VzNS1leHQvb2JqZWN0L2Fzc2lnbi9pcy1pbXBsZW1lbnRlZC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc3ltYm9sL25vZGVfbW9kdWxlcy9lczUtZXh0L29iamVjdC9hc3NpZ24vc2hpbS5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc3ltYm9sL25vZGVfbW9kdWxlcy9lczUtZXh0L29iamVjdC9pcy1jYWxsYWJsZS5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc3ltYm9sL25vZGVfbW9kdWxlcy9lczUtZXh0L29iamVjdC9rZXlzL2luZGV4LmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbm9kZV9tb2R1bGVzL2VzNi1zeW1ib2wvbm9kZV9tb2R1bGVzL2VzNS1leHQvb2JqZWN0L2tleXMvaXMtaW1wbGVtZW50ZWQuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvNnRvNS9ub2RlX21vZHVsZXMvZXM2LXN5bWJvbC9ub2RlX21vZHVsZXMvZXM1LWV4dC9vYmplY3Qva2V5cy9zaGltLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbm9kZV9tb2R1bGVzL2VzNi1zeW1ib2wvbm9kZV9tb2R1bGVzL2VzNS1leHQvb2JqZWN0L25vcm1hbGl6ZS1vcHRpb25zLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbm9kZV9tb2R1bGVzL2VzNi1zeW1ib2wvbm9kZV9tb2R1bGVzL2VzNS1leHQvb2JqZWN0L3ZhbGlkLXZhbHVlLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzLzZ0bzUvbm9kZV9tb2R1bGVzL2VzNi1zeW1ib2wvbm9kZV9tb2R1bGVzL2VzNS1leHQvc3RyaW5nLyMvY29udGFpbnMvaW5kZXguanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvNnRvNS9ub2RlX21vZHVsZXMvZXM2LXN5bWJvbC9ub2RlX21vZHVsZXMvZXM1LWV4dC9zdHJpbmcvIy9jb250YWlucy9pcy1pbXBsZW1lbnRlZC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L25vZGVfbW9kdWxlcy9lczYtc3ltYm9sL25vZGVfbW9kdWxlcy9lczUtZXh0L3N0cmluZy8jL2NvbnRhaW5zL3NoaW0uanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvNnRvNS9ub2RlX21vZHVsZXMvZXM2LXN5bWJvbC9wb2x5ZmlsbC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy82dG81L3BvbHlmaWxsLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbGliL19lbXB0eS5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9hc3NlcnQvYXNzZXJ0LmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS9ub2RlX21vZHVsZXMvaW1tdXRhYmxlL2Rpc3QvaW1tdXRhYmxlLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvbm9kZV9tb2R1bGVzL3RyZWUtd2Fsay9pbmRleC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy90cmVlLXdhbGsvbm9kZV9tb2R1bGVzL3V0aWwtZXh0ZW5kL2V4dGVuZC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL25vZGVfbW9kdWxlcy90cmVlLXdhbGsvdGhpcmRfcGFydHkvV2Vha01hcC9pbmRleC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L21hL3RoaXJkX3BhcnR5L3BhdHRlcm4tbWF0Y2guanMiLCIvVXNlcnMvZHVicm95L2Rldi9tYS90aGlyZF9wYXJ0eS93ZWFrbWFwLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvbWEvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztBQ0dBLFNBQVMsT0FBTyxDQUFDLEdBQUcsRUFBRTtBQUNwQixNQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7dUJBQ0YsR0FBRztRQUFSLENBQUM7QUFDUixVQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7QUFFakIsU0FBTyxNQUFNLENBQUM7Q0FDZjs7QUFFRCxNQUFNLENBQUMsT0FBTyxHQUFHO0FBQ2YsU0FBTyxFQUFQLE9BQU87O0FBRVAsTUFBSSxFQUFBLFVBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUU7MEJBQ2QsR0FBRztVQUFSLENBQUM7QUFDUixVQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUM1QixPQUFPLENBQUMsQ0FBQzs7R0FFZDtBQUNELFFBQU0sRUFBQSxVQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsT0FB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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xjQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOStEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBOztBQ0RBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWtCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ppSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMvQ0EsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLE1BQUcsUUFBUSxJQUFFLE9BQU8sT0FBTyxJQUFFLFdBQVcsSUFBRSxPQUFPLE1BQU0sRUFBQyxNQUFNLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBRyxVQUFVLElBQUUsT0FBTyxNQUFNLElBQUUsTUFBTSxDQUFDLEdBQUcsRUFBQyxNQUFNLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUk7QUFBQyxRQUFJLENBQUMsQ0FBQyxXQUFXLElBQUUsT0FBTyxNQUFNLEdBQUMsQ0FBQyxHQUFDLE1BQU0sR0FBQyxXQUFXLElBQUUsT0FBTyxNQUFNLEdBQUMsQ0FBQyxHQUFDLE1BQU0sR0FBQyxXQUFXLElBQUUsT0FBTyxJQUFJLElBQUUsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLEVBQUUsQ0FBQTtHQUFDO0NBQUMsQ0FBQyxZQUFVO0FBQUMsTUFBSSxNQUFNLEVBQUMsTUFBTSxFQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFlBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxjQUFJLENBQUMsR0FBQyxPQUFPLE9BQU8sSUFBRSxVQUFVLElBQUUsT0FBTyxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksS0FBSyxDQUFDLHNCQUFzQixHQUFDLENBQUMsR0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEdBQUMsa0JBQWtCLEVBQUMsQ0FBQyxDQUFBO1NBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUMsT0FBTyxFQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLGNBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQTtLQUFDLElBQUks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QVMsQ0FBQztPQUMxQjtBQUNELGdCQUFRLFVBQVMsR0FBRyxFQUFFO0FBQ3BCLFlBQUksS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDM0IsWUFBSSxDQUFDLEtBQUssRUFBRSxPQUFPLEtBQUssQ0FBQztBQUN6QixZQUFJLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDO0FBQ2hDLGFBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDO0FBQ2hDLGVBQU8sUUFBUSxDQUFDO09BQ2pCO0FBQ0QsU0FBRyxFQUFFLFVBQVMsR0FBRyxFQUFFO0FBQ2pCLFlBQUksS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDM0IsWUFBSSxDQUFDLEtBQUssRUFBRSxPQUFPLEtBQUssQ0FBQztBQUN6QixlQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUM7T0FDekI7S0FDRixDQUFDOztBQUVGLEtBQUMsT0FBTyxNQUFNLEtBQUssV0FBVyxHQUFHLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0dBQ3JFLENBQUMsRUFBRSxDQUFDO0NBQ047Ozs7Ozs7Ozs7O0FDekNDO0FBQ0E7QUFDQyxPQUFHLEVBQUUsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoganNoaW50IGVzbmV4dDogdHJ1ZSAqL1xuXG4vLyBSZXR1cm4gYW4gQXJyYXkgd2l0aCBhbGwgdGhlIHZhbHVlcyBmcm9tIGBnZW5gLlxuZnVuY3Rpb24gdG9BcnJheShnZW4pIHtcbiAgdmFyIHJlc3VsdCA9IFtdO1xuICBmb3IgKHZhciB4IG9mIGdlbikge1xuICAgIHJlc3VsdC5wdXNoKHgpO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICB0b0FycmF5LFxuICAvLyBSZXR1cm4gdGhlIGZpcnN0IHZhbHVlIGZyb20gYGdlbmAgdGhhdCBwYXNzZXMgYSB0cnV0aCB0ZXN0LlxuICBmaW5kKGdlbiwgcHJlZGljYXRlLCB0aGlzQXJnKSB7XG4gICAgZm9yICh2YXIgeCBvZiBnZW4pIHtcbiAgICAgIGlmIChwcmVkaWNhdGUuY2FsbCh0aGlzQXJnLCB4KSlcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9LFxuICBmaWx0ZXIoZ2VuLCBwcmVkaWNhdGUsIHRoaXNBcmcpIHtcbiAgICByZXR1cm4gdG9BcnJheShnZW4pLmZpbHRlcihwcmVkaWNhdGUsIHRoaXNBcmcpO1xuICB9LFxuICAvLyBSZXR1cm4gdGhlIGZpcnN0IHZhbHVlIGZyb20gYGdlbmAuXG4gIGZpcnN0KGdlbikge1xuICAgIHJldHVybiBnZW4ubmV4dCgpLnZhbHVlO1xuICB9XG59O1xuIiwiLyoganNoaW50IGVzbmV4dDogdHJ1ZSAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKSxcbiAgICBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXIsXG4gICAgSW1tdXRhYmxlID0gcmVxdWlyZSgnaW1tdXRhYmxlJyksXG4gICAgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKSxcbiAgICB3YWxrID0gcmVxdWlyZSgndHJlZS13YWxrJyk7XG5cbnZhciBwbSA9IHJlcXVpcmUoJy4uL3RoaXJkX3BhcnR5L3BhdHRlcm4tbWF0Y2gnKSxcbiAgICBndSA9IHJlcXVpcmUoJy4vZ2VuZXJhdG9yLXV0aWwnKTtcbnJlcXVpcmUoJy4uL3RoaXJkX3BhcnR5L3dlYWttYXAuanMnKTtcblxudmFyIG1hdGNoID0gcG0ubWF0Y2gsXG4gICAgUGF0dGVybiA9IHBtLlBhdHRlcm47XG5cbnZhciBSZWFjdGlvbiA9IEltbXV0YWJsZS5SZWNvcmQoeyBwYXR0ZXJuOiBudWxsLCBjYWxsYmFjazogbnVsbCB9LCAnUmVhY3Rpb24nKTtcbnZhciBPYnNlcnZlciA9IEltbXV0YWJsZS5SZWNvcmQoeyBwYXR0ZXJuOiBudWxsLCBjYWxsYmFjazogbnVsbCB9LCAnT2JzZXJ2ZXInKTtcblxudmFyIGluc3RhbmNlT2YgPSBwbS5NYXRjaGVyLmluc3RhbmNlT2Y7XG5cbi8vIEN1c3RvbSB3YWxrZXIgZm9yIHdhbGtpbmcgaW1tdXRhYmxlLWpzIG9iamVjdHMuXG52YXIgaW1tdXRhYmxlV2Fsa2VyID0gd2FsayhmdW5jdGlvbihub2RlKSB7XG4gIHJldHVybiBJbW11dGFibGUuSXRlcmFibGUuaXNJdGVyYWJsZShub2RlKSA/IG5vZGUudG9KUygpIDogbm9kZTtcbn0pO1xuXG4vLyBDdXN0b20gcGF0dGVybiBmb3IgbWF0Y2hpbmcgSW1tdXRhYmxlLk1hcCBhbmQgSW1tdXRhYmxlLlJlY29yZCBvYmplY3RzLlxudmFyIGltbXV0YWJsZU9iaiA9IFBhdHRlcm4uZXh0ZW5kKHtcbiAgaW5pdDogZnVuY3Rpb24ob2JqUGF0dGVybiwgY3Rvcikge1xuICAgIHRoaXMub2JqUGF0dGVybiA9IG9ialBhdHRlcm47XG4gICAgdGhpcy5jdG9yID0gY3RvciB8fCBJbW11dGFibGUuTWFwO1xuICAgIHRoaXMuYXJpdHkgPSB0aGlzLmdldEFyaXR5KG9ialBhdHRlcm4pO1xuICB9LFxuICBtYXRjaDogZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gICAgcmV0dXJuICh2YWx1ZSBpbnN0YW5jZW9mIHRoaXMuY3RvciAmJlxuICAgICAgICAgICAgdGhpcy5wZXJmb3JtTWF0Y2godmFsdWUudG9PYmplY3QoKSwgdGhpcy5vYmpQYXR0ZXJuLCBiaW5kaW5ncykpO1xuICB9XG59KTtcblxuLy8gQ3VzdG9tIHBhdHRlcm4gZm9yIG1hdGNoaW5nIEltbXV0YWJsZS5MaXN0IG9iamVjdHMuXG52YXIgaW1tdXRhYmxlTGlzdCA9IFBhdHRlcm4uZXh0ZW5kKHtcbiAgaW5pdDogZnVuY3Rpb24oYXJyUGF0dGVybikge1xuICAgIHRoaXMuYXJyUGF0dGVybiA9IGFyclBhdHRlcm47XG4gICAgdGhpcy5hcml0eSA9IHRoaXMuZ2V0QXJpdHkoYXJyUGF0dGVybik7XG4gIH0sXG4gIG1hdGNoOiBmdW5jdGlvbih2YWx1ZSwgYmluZGluZ3MpIHtcbiAgICByZXR1cm4gKEltbXV0YWJsZS5MaXN0LmlzTGlzdCh2YWx1ZSkgJiZcbiAgICAgICAgICAgIHRoaXMucGVyZm9ybU1hdGNoKHZhbHVlLnRvQXJyYXkoKSwgdGhpcy5hcnJQYXR0ZXJuLCBiaW5kaW5ncykpO1xuICB9XG59KTtcblxuLy8gQSBwYXR0ZXJuIHR5cGUgd2hpY2ggYWxsb3dzIHJlc3RyaWN0ZWQgbWF0Y2hpbmcgb24gUmVhY3Rpb25zLlxudmFyIHJlYWN0aW9uID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbihyKSB7XG4gICAgdGhpcy5yZWFjdGlvbiA9IHI7XG4gIH0sXG4gIG1hdGNoOiBmdW5jdGlvbih2YWx1ZSwgYmluZGluZ3MpIHtcbiAgICB2YXIgciA9IHRoaXMucmVhY3Rpb247XG4gICAgLy8gT25seSBtYXRjaCBpZiB0aGUgcGF0dGVybiBhbmQgdGhlIGNhbGxiYWNrIGFyZSBpZGVudGljYWwuIE1vcmUgZ2VuZXJhbFxuICAgIC8vIG1hdGNoaW5nIG9uIHJlYWN0aW9ucyBuZWVkcyBtb3JlIHRob3VnaHQuXG4gICAgcmV0dXJuICgodmFsdWUgaW5zdGFuY2VvZiBSZWFjdGlvbiB8fCB2YWx1ZSBpbnN0YW5jZW9mIE9ic2VydmVyKSAmJlxuICAgICAgICAgICAgdmFsdWUucGF0dGVybiA9PT0gci5wYXR0ZXJuICYmIHZhbHVlLmNhbGxiYWNrID09PSByLmNhbGxiYWNrKTtcbiAgfSxcbiAgYXJpdHk6IDBcbn0pO1xuXG4vLyBQcml2YXRlIGhlbHBlcnNcbi8vIC0tLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBjb252ZXJ0UGF0dGVybihwKSB7XG4gIHJldHVybiBpbW11dGFibGVXYWxrZXIucmVkdWNlKHAsIGZ1bmN0aW9uKG1lbW8sIG5vZGUsIGtleSwgcGFyZW50KSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkobm9kZSkpXG4gICAgICByZXR1cm4gaW1tdXRhYmxlTGlzdChtZW1vIHx8IFtdKTtcbiAgICBpZiAodHlwZW9mIG5vZGUgPT09ICdmdW5jdGlvbicpXG4gICAgICByZXR1cm4gbm9kZTtcbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFJlYWN0aW9uIHx8IG5vZGUgaW5zdGFuY2VvZiBPYnNlcnZlcilcbiAgICAgIHJldHVybiByZWFjdGlvbihub2RlKTtcbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIEltbXV0YWJsZS5SZWNvcmQpXG4gICAgICByZXR1cm4gaW1tdXRhYmxlT2JqKG1lbW8gfHwge30sIG5vZGUuY29uc3RydWN0b3IpO1xuICAgIGlmIChub2RlIGluc3RhbmNlb2YgT2JqZWN0KVxuICAgICAgcmV0dXJuIGltbXV0YWJsZU9iaihtZW1vIHx8IHt9KTtcbiAgICBhc3NlcnQoIW1lbW8pO1xuICAgIHJldHVybiBub2RlO1xuICB9KTtcbn1cblxuZnVuY3Rpb24qIGdldE1hdGNoZXMoYXJyLCBwYXR0ZXJuKSB7XG4gIHZhciBwID0gY29udmVydFBhdHRlcm4ocGF0dGVybik7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLnNpemU7ICsraSkge1xuICAgIGlmIChtYXRjaChhcnIuZ2V0KGkpLnZhbHVlLCBwKSAhPT0gbnVsbClcbiAgICAgIHlpZWxkIGk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZmluZChhcnIsIHBhdHRlcm4pIHtcbiAgdmFyIHJlc3VsdCA9IGd1LmZpcnN0KGdldE1hdGNoZXMoYXJyLCBwYXR0ZXJuKSk7XG4gIHJldHVybiByZXN1bHQgPT09IHVuZGVmaW5lZCA/IC0xIDogcmVzdWx0O1xufVxuXG4vLyBOT1RFOiBUaGlzIGRvZXMgbm90IHJldHVybiBhbGwgcG9zc2libGUgbWF0Y2hlcywgZHVlIHRvIHRoZSB3YXkgYG1hdGNoRGVlcGBcbi8vIHdvcmtzLlxuZnVuY3Rpb24qIGdldERlZXBNYXRjaGVzKGFyciwgcGF0dGVybikge1xuICB2YXIgcCA9IGNvbnZlcnRQYXR0ZXJuKHBhdHRlcm4pO1xuICB2YXIgcGF0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIuc2l6ZTsgKytpKSB7XG4gICAgcGF0aCA9IFtpXTtcbiAgICB2YXIgcm9vdCA9IGFyci5nZXQoaSkudmFsdWU7XG4gICAgdmFyIGJpbmRpbmdzO1xuICAgIGlmICgoYmluZGluZ3MgPSBtYXRjaERlZXAocm9vdCwgcCwgcGF0aCkpICE9PSBudWxsKSB7XG4gICAgICB2YXIgcm9vdFBhdGggPSBwYXRoLnNsaWNlKDEpO1xuICAgICAgeWllbGQgeyBpbmRleDogcGF0aFswXSwgcm9vdDogcm9vdCwgcGF0aDogcm9vdFBhdGgsIGJpbmRpbmdzOiBiaW5kaW5ncyB9O1xuICAgIH1cbiAgfVxufVxuXG4vLyBSZWN1cnNpdmVseSB0cmllcyB0byBtYXRjaCBgb2JqYCB3aXRoIGBwYXR0ZXJuYC4gTk9URTogVGhpcyBvbmx5IHJldHVybnNcbi8vIHRoZSBmaXJzdCBkZWVwIG1hdGNoIGZvdW5kIGluIGEgZ2l2ZW4gb2JqZWN0LlxuZnVuY3Rpb24gbWF0Y2hEZWVwKG9iaiwgcGF0dGVybiwgcGF0aCkge1xuICB2YXIgcmVzdWx0O1xuICBpZiAoKHJlc3VsdCA9IG1hdGNoKG9iaiwgcGF0dGVybikpICE9PSBudWxsKVxuICAgIHJldHVybiByZXN1bHQ7XG5cbiAgdmFyIGlzTGlzdCA9IG9iaiAmJiBJbW11dGFibGUuTGlzdC5pc0xpc3Qob2JqKTtcbiAgdmFyIGlzTWFwID0gb2JqICYmIEltbXV0YWJsZS5NYXAuaXNNYXAob2JqKTtcblxuICBpZiAoaXNMaXN0IHx8IGlzTWFwKSB7XG4gICAgZm9yICh2YXIgaXQgPSBvYmouZW50cmllcygpOzspIHtcbiAgICAgIHZhciBlbnRyeSA9IGl0Lm5leHQoKTtcbiAgICAgIGlmIChlbnRyeS5kb25lKSBicmVhaztcbiAgICAgIHBhdGgucHVzaChlbnRyeS52YWx1ZVswXSk7XG4gICAgICBpZiAoKHJlc3VsdCA9IG1hdGNoRGVlcChlbnRyeS52YWx1ZVsxXSwgcGF0dGVybiwgcGF0aCkpICE9PSBudWxsKVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgcGF0aC5wb3AoKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8vIFZhdCBpbXBsZW1lbnRhdGlvblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIEEgVmF0IGlzIGEgdHVwbGUtc3BhY2UgbGlrZSB0aGluZy4gRXZlbnR1YWxseSwgSSdkIGxpa2UgdG8gc3VwcG9ydCBvYmplY3RzXG4vLyBhbmQgbm90IGp1c3QgdHVwbGVzLCBhbmQgJ29iamVjdCBzcGFjZScgaXMgc3VjaCBhIGJvcmluZyBuYW1lLlxuZnVuY3Rpb24gVmF0KCkge1xuICB0aGlzLl9pbml0KCk7XG5cbiAgLy8gU3RvcmUgdGhpcyBWYXQncyBoaXN0b3J5IGluIGEgVmF0LCBidXQgc3RvcCB0aGUgcmVjdXJzaW9uIHRoZXJlIC0tIGRvbid0XG4gIC8vIGtlZXAgYSBoaXN0b3J5IG9mIHRoZSBoaXN0b3J5LlxuICB0aGlzLl9oaXN0b3J5ID0gT2JqZWN0LmNyZWF0ZShWYXQucHJvdG90eXBlKTtcbiAgdGhpcy5faGlzdG9yeS5faW5pdCgpO1xuICB0aGlzLl9oaXN0b3J5LnB1dCh0aGlzLl9zdG9yZSk7XG59XG5cbnV0aWwuaW5oZXJpdHMoVmF0LCBFdmVudEVtaXR0ZXIpO1xuXG5WYXQucHJvdG90eXBlLl9pbml0ID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX3N0b3JlID0gSW1tdXRhYmxlLkxpc3QoKTtcbiAgdGhpcy5fd2FpdGluZyA9IFtdO1xufTtcblxuVmF0LnByb3RvdHlwZS5fdXBkYXRlU3RvcmUgPSBmdW5jdGlvbih1cGRhdGVGbikge1xuICB0aGlzLl9zdG9yZSA9IHVwZGF0ZUZuLmNhbGwodGhpcyk7XG4gIGlmICh0aGlzLl9oaXN0b3J5KSB7XG4gICAgdGhpcy5faGlzdG9yeS5wdXQodGhpcy5fc3RvcmUpO1xuXG4gICAgLy8gVE9ETzogR2V0IHJpZCBvZiBjaGFuZ2UgZXZlbnRzIGVudGlyZWx5LlxuICAgIHRoaXMuZW1pdCgnY2hhbmdlJyk7XG4gIH1cbn07XG5cblZhdC5wcm90b3R5cGUuX2RvV2l0aG91dEhpc3RvcnkgPSBmdW5jdGlvbihmbikge1xuICB2YXIgaGlzdCA9IHRoaXMuX2hpc3Rvcnk7XG4gIHRoaXMuX2hpc3RvcnkgPSBudWxsO1xuICB0cnkge1xuICAgIHJldHVybiBmbi5jYWxsKHRoaXMpO1xuICB9IGZpbmFsbHkge1xuICAgIHRoaXMuX2hpc3RvcnkgPSBoaXN0O1xuICB9XG59O1xuXG5WYXQucHJvdG90eXBlLl90cnkgPSBmdW5jdGlvbihwYXR0ZXJuLCBvcCwgY2IpIHtcbiAgdmFyIHJlc3VsdCA9IHRoaXNbJ3RyeV8nICsgb3BdLmNhbGwodGhpcywgcGF0dGVybik7XG4gIGlmIChyZXN1bHQpIHtcbiAgICBjYihyZXN1bHQpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cblZhdC5wcm90b3R5cGUuX3RyeU9yV2FpdCA9IGZ1bmN0aW9uKHBhdHRlcm4sIG9wLCBjYikge1xuICBpZiAoIXRoaXMuX3RyeShwYXR0ZXJuLCBvcCwgY2IpKSB7XG4gICAgdGhpcy5fd2FpdGluZy5wdXNoKHtcbiAgICAgIHBhdHRlcm46IHBhdHRlcm4sXG4gICAgICBvcDogb3AsXG4gICAgICBjYWxsYmFjazogY2JcbiAgICB9KTtcbiAgfVxufTtcblxuVmF0LnByb3RvdHlwZS5fcmVtb3ZlQXQgPSBmdW5jdGlvbihpbmRleCkge1xuICB2YXIgcmVzdWx0ID0gdGhpcy5fc3RvcmUuZ2V0KGluZGV4KS52YWx1ZTtcbiAgdGhpcy5fdXBkYXRlU3RvcmUoKCkgPT4gdGhpcy5fc3RvcmUuc3BsaWNlKGluZGV4LCAxKSk7XG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG5WYXQucHJvdG90eXBlLl9jb2xsZWN0UmVhY3Rpb25DYW5kaWRhdGVzID0gZnVuY3Rpb24oLi4ubGlzdHMpIHtcbiAgdmFyIGNhbmRpZGF0ZXMgPSBbXTtcbiAgdmFyIHN0b3JlID0gdGhpcy5fc3RvcmU7XG4gIFtdLmNvbmNhdCguLi5saXN0cykuZm9yRWFjaChmdW5jdGlvbihyKSB7XG4gICAgLy8gUHJldmVudCB0aGlzIHJlYWN0aW9uIGZyb20gbWF0Y2hpbmcgYWdhaW5zdCBvYmplY3RzIGl0J3MgYWxyZWFkeSBtYXRjaGVkLlxuICAgIC8vIEZJWE1FOiBUaGlzIHNob3VsZCByZWFsbHkgY2hlY2sgZm9yIGEgbWF0Y2ggX2F0IHRoZSBzYW1lIHBhdGhfLlxuICAgIGZ1bmN0aW9uIGFjY2VwdChtKSB7XG4gICAgICB2YXIgcmVjb3JkID0gc3RvcmUuZ2V0KG0uaW5kZXgpO1xuICAgICAgaWYgKCFyZWNvcmQucmVhY3Rpb25zLmhhcyhyKSkge1xuICAgICAgICByZWNvcmQucmVhY3Rpb25zLnNldChyLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIG1hdGNoZXMgPSBndS5maWx0ZXIoZ2V0RGVlcE1hdGNoZXMoc3RvcmUsIHIucGF0dGVybiksIGFjY2VwdCk7XG4gICAgbWF0Y2hlcy5mb3JFYWNoKG0gPT4ge1xuICAgICAgdmFyIGkgPSBtLmluZGV4O1xuICAgICAgaWYgKCFjYW5kaWRhdGVzLmhhc093blByb3BlcnR5KGkpKVxuICAgICAgICBjYW5kaWRhdGVzW2ldID0gW107XG4gICAgICBjYW5kaWRhdGVzW2ldLnB1c2goW3IsIG1dKTtcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBjYW5kaWRhdGVzO1xufTtcblxuVmF0LnByb3RvdHlwZS5fcnVuUmVhY3Rpb24gPSBmdW5jdGlvbihyLCBtYXRjaCkge1xuICBpZiAociBpbnN0YW5jZW9mIFJlYWN0aW9uKVxuICAgIHRoaXMuX2RvV2l0aG91dEhpc3RvcnkoKCkgPT4gdGhpcy5fcmVtb3ZlQXQobWF0Y2guaW5kZXgpKTtcblxuICB2YXIgYXJpdHkgPSByLmNhbGxiYWNrLmxlbmd0aDtcbiAgdmFyIGV4cGVjdGVkQXJpdHkgPSBtYXRjaC5iaW5kaW5ncy5sZW5ndGggKyAxO1xuICBhc3NlcnQoYXJpdHkgPT09IGV4cGVjdGVkQXJpdHksXG4gICAgICAnQmFkIGZ1bmN0aW9uIGFyaXR5OiBleHBlY3RlZCAnICsgZXhwZWN0ZWRBcml0eSArICcsIGdvdCAnICsgYXJpdHkpO1xuXG4gIHZhciByb290ID0gbWF0Y2gucm9vdDtcbiAgdmFyIHZhbHVlLCBuZXdWYWx1ZTtcblxuICBmdW5jdGlvbiBhcHBseUNhbGxiYWNrKCkge1xuICAgIHJldHVybiByLmNhbGxiYWNrLmFwcGx5KG51bGwsIFt2YWx1ZV0uY29uY2F0KG1hdGNoLmJpbmRpbmdzKSk7XG4gIH1cblxuICBpZiAobWF0Y2gucGF0aC5sZW5ndGggPT09IDApIHtcbiAgICB2YWx1ZSA9IHJvb3Q7XG4gICAgbmV3VmFsdWUgPSBhcHBseUNhbGxiYWNrKCk7XG4gIH0gZWxzZSB7XG4gICAgdmFsdWUgPSByb290LmdldEluKG1hdGNoLnBhdGgpO1xuICAgIG5ld1ZhbHVlID0gcm9vdC51cGRhdGVJbihtYXRjaC5wYXRoLCBhcHBseUNhbGxiYWNrKTtcbiAgfVxuXG4gIGlmIChyIGluc3RhbmNlb2YgUmVhY3Rpb24pIHtcbiAgICAvLyBQdXQgdGhlIG9iamVjdCBiYWNrIGluIHRoZSB2YXQsIHJlcGxhY2luZyB0aGUgbWF0Y2hlZCBwYXJ0IHdpdGggdGhlXG4gICAgLy8gcmVzdWx0IG9mIHRoZSByZWFjdGlvbiBmdW5jdGlvbi5cbiAgICBpZiAobmV3VmFsdWUgPT09IHZvaWQgMClcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1JlYWN0aW9ucyBtdXN0IHJldHVybiBhIHZhbHVlJyk7XG4gICAgaWYgKG5ld1ZhbHVlICE9PSBudWxsKVxuICAgICAgdGhpcy5wdXQobmV3VmFsdWUpO1xuICB9XG59O1xuXG5WYXQucHJvdG90eXBlLl9leGVjdXRlUmVhY3Rpb25zID0gZnVuY3Rpb24oY2FuZGlkYXRlcykge1xuICAvLyBUbyBkZXRlY3QgY29uZmxpY3RzLCBrZWVwIHRyYWNrIG9mIGFsbCBwYXRocyB0aGF0IGFyZSB0b3VjaGVkLlxuICB2YXIgcmVhY3Rpb25QYXRocyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgT2JqZWN0LmtleXMoY2FuZGlkYXRlcykucmV2ZXJzZSgpLmZvckVhY2goaSA9PiB7XG4gICAgLy8gU29ydCBjYW5kaWRhdGVzIGJhc2VkIG9uIHBhdGggbGVuZ3RoIChsb25nZXN0IHRvIHNob3J0ZXN0KS5cbiAgICB2YXIgc29ydGVkID0gY2FuZGlkYXRlc1tpXS5zbGljZSgpLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgIHJldHVybiBhWzFdLnBhdGgubGVuZ3RoIC0gYlsxXS5wYXRoLmxlbmd0aDtcbiAgICB9KTtcblxuICAgIC8vIEV4ZWN1dGUgZWFjaCByZWFjdGlvbiwgZGV0ZWN0aW5nIGNvbmZsaWN0cyBhcyB3ZSBnby5cbiAgICBzb3J0ZWQuZm9yRWFjaCgoW3JlYWN0aW9uLCBtYXRjaF0pID0+IHtcbiAgICAgIHZhciBwYXRoID0gbWF0Y2gucGF0aDtcblxuICAgICAgLy8gQ2hlY2sgYWxsIGFuY2VzdG9yIHBhdGhzIHRvIHNlZSBpZiBvbmUgd2FzIGFscmVhZHkgdG91Y2hlZC5cbiAgICAgIHZhciBwYXRoU3RyaW5nO1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPD0gcGF0aC5sZW5ndGg7ICsraikge1xuICAgICAgICBwYXRoU3RyaW5nID0gW2ldLmNvbmNhdChwYXRoLnNsaWNlKDAsIGopKS5qb2luKCcvJykgKyAnLyc7XG4gICAgICAgIGlmIChwYXRoU3RyaW5nIGluIHJlYWN0aW9uUGF0aHMpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZWFjdGlvbiBjb25mbGljdCcpO1xuICAgICAgfVxuICAgICAgcmVhY3Rpb25QYXRoc1twYXRoU3RyaW5nXSA9IHJlYWN0aW9uLl9uYW1lO1xuXG4gICAgICB0aGlzLl9ydW5SZWFjdGlvbihyZWFjdGlvbiwgbWF0Y2gpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cblZhdC5wcm90b3R5cGUucHV0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgLy8gQ29weSB0aGUgcmVhY3Rpb25zIGJlZm9yZSB1cGRhdGluZyB0aGUgc3RvcmUsIGFzIGEgcmVhY3Rpb24gc2hvdWxkbid0IGJlXG4gIC8vIGFibGUgdG8gaW1tZWRpYXRlbHkgcmVhY3QgdG8gaXRzZWxmLlxuICB2YXIgb2JzZXJ2ZXJzID0gdGhpcy50cnlfY29weV9hbGwoaW5zdGFuY2VPZihPYnNlcnZlcikpO1xuICB2YXIgcmVhY3Rpb25zID0gdGhpcy50cnlfY29weV9hbGwoaW5zdGFuY2VPZihSZWFjdGlvbikpO1xuXG4gIC8vIFVwZGF0ZSB0aGUgc3RvcmUuXG4gIHZhciBzdG9yZWRPYmogPSB7XG4gICAgdmFsdWU6IEltbXV0YWJsZS5mcm9tSlModmFsdWUpLFxuICAgIHJlYWN0aW9uczogbmV3IFdlYWtNYXAoKVxuICB9O1xuICB0aGlzLl91cGRhdGVTdG9yZSgoKSA9PiB0aGlzLl9zdG9yZS5wdXNoKHN0b3JlZE9iaikpO1xuXG4gIC8vIEEgcmVhbGx5IG5haXZlIHZlcnNpb24gb2YgZGVmZXJyZWQgdGFrZS9jb3B5LiBUaGlzIHNob3VsZFxuICAvLyBwcm9iYWJseSBiZSB3cml0dGVuIGluIGEgbW9yZSBlZmZpY2llbnQgd2F5LlxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuX3dhaXRpbmcgPSB0aGlzLl93YWl0aW5nLmZpbHRlcihmdW5jdGlvbihpbmZvKSB7XG4gICAgcmV0dXJuICFzZWxmLl90cnkoaW5mby5wYXR0ZXJuLCBpbmZvLm9wLCBpbmZvLmNhbGxiYWNrKTtcbiAgfSk7XG5cbiAgdmFyIGNhbmRpZGF0ZXMgPSB0aGlzLl9jb2xsZWN0UmVhY3Rpb25DYW5kaWRhdGVzKHJlYWN0aW9ucywgb2JzZXJ2ZXJzKTtcbiAgdGhpcy5fZXhlY3V0ZVJlYWN0aW9ucyhjYW5kaWRhdGVzKTtcbn07XG5cblZhdC5wcm90b3R5cGUudHJ5X2NvcHkgPSBmdW5jdGlvbihwYXR0ZXJuKSB7XG4gIHZhciBpID0gZmluZCh0aGlzLl9zdG9yZSwgcGF0dGVybik7XG4gIHJldHVybiBpID49IDAgPyB0aGlzLl9zdG9yZS5nZXQoaSkudmFsdWUgOiBudWxsO1xufTtcblxuVmF0LnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24ocGF0dGVybiwgY2IpIHtcbiAgdGhpcy5fdHJ5T3JXYWl0KHBhdHRlcm4sICdjb3B5JywgY2IpO1xufTtcblxuVmF0LnByb3RvdHlwZS50cnlfY29weV9hbGwgPSBmdW5jdGlvbihwYXR0ZXJuKSB7XG4gIHZhciBtYXRjaGVzID0gZ3UudG9BcnJheShnZXRNYXRjaGVzKHRoaXMuX3N0b3JlLCBwYXR0ZXJuKSk7XG4gIHJldHVybiBtYXRjaGVzLm1hcChpID0+IHRoaXMuX3N0b3JlLmdldChpKS52YWx1ZSk7XG59O1xuXG5WYXQucHJvdG90eXBlLnRyeV90YWtlID0gZnVuY3Rpb24ocGF0dGVybiwgZGVlcCkge1xuICBpZiAoZGVlcCkge1xuICAgIHZhciByZXN1bHQgPSBndS5maXJzdChnZXREZWVwTWF0Y2hlcyh0aGlzLl9zdG9yZSwgcGF0dGVybikpO1xuICAgIGlmIChyZXN1bHQpIHtcbiAgICAgIHRoaXMuX3JlbW92ZUF0KHJlc3VsdC5pbmRleCk7XG4gICAgICByZXR1cm4gW3Jlc3VsdC5yb290LCByZXN1bHQucGF0aF07XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHZhciBpID0gZmluZCh0aGlzLl9zdG9yZSwgcGF0dGVybik7XG4gIHJldHVybiBpID49IDAgPyB0aGlzLl9yZW1vdmVBdChpKSA6IG51bGw7XG59O1xuXG5WYXQucHJvdG90eXBlLnRha2UgPSBmdW5jdGlvbihwYXR0ZXJuLCBjYikge1xuICB0aGlzLl90cnlPcldhaXQocGF0dGVybiwgJ3Rha2UnLCBjYik7XG59O1xuXG4vLyBBIHJlYWN0aW9uIGlzIGEgcHJvY2VzcyB0aGF0IGF0dGVtcHRzIHRvIGB0YWtlYCBhIGdpdmVuIHBhdHRlcm4gZXZlcnlcbi8vIHRpbWUgdGhlIHR1cGxlIHNwYWNlIGNoYW5nZXMuIElmIHRoZSBgcmVhY3Rpb25gIGZ1bmN0aW9uIHByb2R1Y2VzIGEgcmVzdWx0LFxuLy8gdGhlIHJlc3VsdCBpcyBwdXQgaW50byB0aGUgdHVwbGUgc3BhY2UuXG5WYXQucHJvdG90eXBlLmFkZFJlYWN0aW9uID0gZnVuY3Rpb24ocGF0dGVybiwgcmVhY3Rpb24pIHtcbiAgdmFyIHIgPSBuZXcgUmVhY3Rpb24oeyBwYXR0ZXJuOiBwYXR0ZXJuLCBjYWxsYmFjazogcmVhY3Rpb24gfSk7XG4gIHRoaXMucHV0KHIpO1xuICByZXR1cm4gcjtcbn07XG5cblZhdC5wcm90b3R5cGUuYWRkT2JzZXJ2ZXIgPSBmdW5jdGlvbihwYXR0ZXJuLCBjYikge1xuICB2YXIgbyA9IG5ldyBPYnNlcnZlcih7IHBhdHRlcm46IHBhdHRlcm4sIGNhbGxiYWNrOiBjYiB9KTtcbiAgdGhpcy5wdXQobyk7XG4gIHJldHVybiBvO1xufTtcblxuVmF0LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbihwYXR0ZXJuLCBjYikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMudGFrZShwYXR0ZXJuLCBmdW5jdGlvbihtYXRjaCkge1xuICAgIHNlbGYucHV0KGNiKG1hdGNoKSk7XG4gIH0pO1xufTtcblxuLy8gRG9lcyB3aGF0IHlvdSdkIGV4cGVjdC5cblZhdC5wcm90b3R5cGUuc2l6ZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5fc3RvcmUuc2l6ZTtcbn07XG5cblZhdC5SZWFjdGlvbiA9IFJlYWN0aW9uO1xuVmF0Lk9ic2VydmVyID0gT2JzZXJ2ZXI7XG5cbi8vIEV4cG9ydHNcbi8vIC0tLS0tLS1cblxubW9kdWxlLmV4cG9ydHMgPSBWYXQ7XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKiBqc2hpbnQgbmV3Y2FwOiBmYWxzZSAqL1xuXG52YXIgZW5zdXJlU3ltYm9sID0gZnVuY3Rpb24gKGtleSkge1xuICBTeW1ib2xba2V5XSA9IFN5bWJvbFtrZXldIHx8IFN5bWJvbCgpO1xufTtcblxudmFyIGVuc3VyZVByb3RvID0gZnVuY3Rpb24gKENvbnN0cnVjdG9yLCBrZXksIHZhbCkge1xuICB2YXIgcHJvdG8gPSBDb25zdHJ1Y3Rvci5wcm90b3R5cGU7XG4gIHByb3RvW2tleV0gPSBwcm90b1trZXldIHx8IHZhbDtcbn07XG5cbi8vXG5cbmlmICh0eXBlb2YgU3ltYm9sID09PSBcInVuZGVmaW5lZFwiKSB7XG4gIHJlcXVpcmUoXCJlczYtc3ltYm9sL2ltcGxlbWVudFwiKTtcbn1cblxucmVxdWlyZShcImVzNi1zaGltXCIpO1xucmVxdWlyZShcIi4vdHJhbnNmb3JtYXRpb24vdHJhbnNmb3JtZXJzL2VzNi1nZW5lcmF0b3JzL3J1bnRpbWVcIik7XG5cbi8vIEFic3RyYWN0IHJlZmVyZW5jZXNcblxuZW5zdXJlU3ltYm9sKFwicmVmZXJlbmNlR2V0XCIpO1xuZW5zdXJlU3ltYm9sKFwicmVmZXJlbmNlU2V0XCIpO1xuZW5zdXJlU3ltYm9sKFwicmVmZXJlbmNlRGVsZXRlXCIpO1xuXG5lbnN1cmVQcm90byhGdW5jdGlvbiwgU3ltYm9sLnJlZmVyZW5jZUdldCwgZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSk7XG5cbmVuc3VyZVByb3RvKE1hcCwgU3ltYm9sLnJlZmVyZW5jZUdldCwgTWFwLnByb3RvdHlwZS5nZXQpO1xuZW5zdXJlUHJvdG8oTWFwLCBTeW1ib2wucmVmZXJlbmNlU2V0LCBNYXAucHJvdG90eXBlLnNldCk7XG5lbnN1cmVQcm90byhNYXAsIFN5bWJvbC5yZWZlcmVuY2VEZWxldGUsIE1hcC5wcm90b3R5cGUuZGVsZXRlKTtcblxuaWYgKGdsb2JhbC5XZWFrTWFwKSB7XG4gIGVuc3VyZVByb3RvKFdlYWtNYXAsIFN5bWJvbC5yZWZlcmVuY2VHZXQsIFdlYWtNYXAucHJvdG90eXBlLmdldCk7XG4gIGVuc3VyZVByb3RvKFdlYWtNYXAsIFN5bWJvbC5yZWZlcmVuY2VTZXQsIFdlYWtNYXAucHJvdG90eXBlLnNldCk7XG4gIGVuc3VyZVByb3RvKFdlYWtNYXAsIFN5bWJvbC5yZWZlcmVuY2VEZWxldGUsIFdlYWtNYXAucHJvdG90eXBlLmRlbGV0ZSk7XG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qKlxuKiBDb3B5cmlnaHQgKGMpIDIwMTQsIEZhY2Vib29rLCBJbmMuXG4qIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4qXG4qIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuKiBodHRwczovL3Jhdy5naXRodWIuY29tL2ZhY2Vib29rL3JlZ2VuZXJhdG9yL21hc3Rlci9MSUNFTlNFIGZpbGUuIEFuXG4qIGFkZGl0aW9uYWwgZ3JhbnQgb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpblxuKiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4qL1xuXG52YXIgaXRlcmF0b3JTeW1ib2wgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgU3ltYm9sLml0ZXJhdG9yIHx8IFwiQEBpdGVyYXRvclwiO1xudmFyIHJ1bnRpbWUgPSBnbG9iYWwucmVnZW5lcmF0b3JSdW50aW1lID0gZXhwb3J0cztcbnZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG52YXIgd3JhcCA9IHJ1bnRpbWUud3JhcCA9IGZ1bmN0aW9uIHdyYXAoaW5uZXJGbiwgb3V0ZXJGbiwgc2VsZiwgdHJ5TGlzdCkge1xuICByZXR1cm4gbmV3IEdlbmVyYXRvcihpbm5lckZuLCBvdXRlckZuLCBzZWxmIHx8IG51bGwsIHRyeUxpc3QgfHwgW10pO1xufTtcblxudmFyIEdlblN0YXRlU3VzcGVuZGVkU3RhcnQgPSBcInN1c3BlbmRlZFN0YXJ0XCI7XG52YXIgR2VuU3RhdGVTdXNwZW5kZWRZaWVsZCA9IFwic3VzcGVuZGVkWWllbGRcIjtcbnZhciBHZW5TdGF0ZUV4ZWN1dGluZyA9IFwiZXhlY3V0aW5nXCI7XG52YXIgR2VuU3RhdGVDb21wbGV0ZWQgPSBcImNvbXBsZXRlZFwiO1xuXG4vLyBSZXR1cm5pbmcgdGhpcyBvYmplY3QgZnJvbSB0aGUgaW5uZXJGbiBoYXMgdGhlIHNhbWUgZWZmZWN0IGFzXG4vLyBicmVha2luZyBvdXQgb2YgdGhlIGRpc3BhdGNoIHN3aXRjaCBzdGF0ZW1lbnQuXG52YXIgQ29udGludWVTZW50aW5lbCA9IHt9O1xuXG4vLyBEdW1teSBjb25zdHJ1Y3RvciB0aGF0IHdlIHVzZSBhcyB0aGUgLmNvbnN0cnVjdG9yIHByb3BlcnR5IGZvclxuLy8gZnVuY3Rpb25zIHRoYXQgcmV0dXJuIEdlbmVyYXRvciBvYmplY3RzLlxuZnVuY3Rpb24gR2VuZXJhdG9yRnVuY3Rpb24oKSB7fVxudmFyIEdGcCA9IGZ1bmN0aW9uIEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlKCkge307XG52YXIgR3AgPSBHRnAucHJvdG90eXBlID0gR2VuZXJhdG9yLnByb3RvdHlwZTtcbihHRnAuY29uc3RydWN0b3IgPSBHZW5lcmF0b3JGdW5jdGlvbikucHJvdG90eXBlID0gR3AuY29uc3RydWN0b3IgPSBHRnA7XG5cbnJ1bnRpbWUuaXNHZW5lcmF0b3JGdW5jdGlvbiA9IGZ1bmN0aW9uIChnZW5GdW4pIHtcbiAgdmFyIGN0b3IgPSBnZW5GdW4gJiYgZ2VuRnVuLmNvbnN0cnVjdG9yO1xuICByZXR1cm4gY3RvciA/IEdlbmVyYXRvckZ1bmN0aW9uLm5hbWUgPT09IGN0b3IubmFtZSA6IGZhbHNlO1xufTtcblxucnVudGltZS5tYXJrID0gZnVuY3Rpb24gKGdlbkZ1bikge1xuICBnZW5GdW4uX19wcm90b19fID0gR0ZwO1xuICBnZW5GdW4ucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShHcCk7XG4gIHJldHVybiBnZW5GdW47XG59O1xuXG5ydW50aW1lLmFzeW5jID0gZnVuY3Rpb24gKGlubmVyRm4sIG91dGVyRm4sIHNlbGYsIHRyeUxpc3QpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICB2YXIgZ2VuZXJhdG9yID0gd3JhcChpbm5lckZuLCBvdXRlckZuLCBzZWxmLCB0cnlMaXN0KTtcbiAgICB2YXIgY2FsbE5leHQgPSBzdGVwLmJpbmQoZ2VuZXJhdG9yLm5leHQpO1xuICAgIHZhciBjYWxsVGhyb3cgPSBzdGVwLmJpbmQoZ2VuZXJhdG9yW1widGhyb3dcIl0pO1xuXG4gICAgZnVuY3Rpb24gc3RlcChhcmcpIHtcbiAgICAgIHZhciBpbmZvO1xuICAgICAgdmFyIHZhbHVlO1xuXG4gICAgICB0cnkge1xuICAgICAgICBpbmZvID0gdGhpcyhhcmcpO1xuICAgICAgICB2YWx1ZSA9IGluZm8udmFsdWU7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICByZXR1cm4gcmVqZWN0KGVycm9yKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGluZm8uZG9uZSkge1xuICAgICAgICByZXNvbHZlKHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIFByb21pc2UucmVzb2x2ZSh2YWx1ZSkudGhlbihjYWxsTmV4dCwgY2FsbFRocm93KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjYWxsTmV4dCgpO1xuICB9KTtcbn07XG5cbmZ1bmN0aW9uIEdlbmVyYXRvcihpbm5lckZuLCBvdXRlckZuLCBzZWxmLCB0cnlMaXN0KSB7XG4gIHZhciBnZW5lcmF0b3IgPSBvdXRlckZuID8gT2JqZWN0LmNyZWF0ZShvdXRlckZuLnByb3RvdHlwZSkgOiB0aGlzO1xuICB2YXIgY29udGV4dCA9IG5ldyBDb250ZXh0KHRyeUxpc3QpO1xuICB2YXIgc3RhdGUgPSBHZW5TdGF0ZVN1c3BlbmRlZFN0YXJ0O1xuXG4gIGZ1bmN0aW9uIGludm9rZShtZXRob2QsIGFyZykge1xuICAgIGlmIChzdGF0ZSA9PT0gR2VuU3RhdGVFeGVjdXRpbmcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IHJ1bm5pbmdcIik7XG4gICAgfVxuXG4gICAgaWYgKHN0YXRlID09PSBHZW5TdGF0ZUNvbXBsZXRlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR2VuZXJhdG9yIGhhcyBhbHJlYWR5IGZpbmlzaGVkXCIpO1xuICAgIH1cblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICB2YXIgZGVsZWdhdGUgPSBjb250ZXh0LmRlbGVnYXRlO1xuICAgICAgdmFyIGluZm87XG5cbiAgICAgIGlmIChkZWxlZ2F0ZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGluZm8gPSBkZWxlZ2F0ZS5pdGVyYXRvclttZXRob2RdKGFyZyk7XG5cbiAgICAgICAgICAvLyBEZWxlZ2F0ZSBnZW5lcmF0b3IgcmFuIGFuZCBoYW5kbGVkIGl0cyBvd24gZXhjZXB0aW9ucyBzb1xuICAgICAgICAgIC8vIHJlZ2FyZGxlc3Mgb2Ygd2hhdCB0aGUgbWV0aG9kIHdhcywgd2UgY29udGludWUgYXMgaWYgaXQgaXNcbiAgICAgICAgICAvLyBcIm5leHRcIiB3aXRoIGFuIHVuZGVmaW5lZCBhcmcuXG4gICAgICAgICAgbWV0aG9kID0gXCJuZXh0XCI7XG4gICAgICAgICAgYXJnID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIH0gY2F0Y2ggKHVuY2F1Z2h0KSB7XG4gICAgICAgICAgY29udGV4dC5kZWxlZ2F0ZSA9IG51bGw7XG5cbiAgICAgICAgICAvLyBMaWtlIHJldHVybmluZyBnZW5lcmF0b3IudGhyb3codW5jYXVnaHQpLCBidXQgd2l0aG91dCB0aGVcbiAgICAgICAgICAvLyBvdmVyaGVhZCBvZiBhbiBleHRyYSBmdW5jdGlvbiBjYWxsLlxuICAgICAgICAgIG1ldGhvZCA9IFwidGhyb3dcIjtcbiAgICAgICAgICBhcmcgPSB1bmNhdWdodDtcblxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGluZm8uZG9uZSkge1xuICAgICAgICAgIGNvbnRleHRbZGVsZWdhdGUucmVzdWx0TmFtZV0gPSBpbmZvLnZhbHVlO1xuICAgICAgICAgIGNvbnRleHQubmV4dCA9IGRlbGVnYXRlLm5leHRMb2M7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RhdGUgPSBHZW5TdGF0ZVN1c3BlbmRlZFlpZWxkO1xuICAgICAgICAgIHJldHVybiBpbmZvO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGV4dC5kZWxlZ2F0ZSA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIGlmIChtZXRob2QgPT09IFwibmV4dFwiKSB7XG4gICAgICAgIGlmIChzdGF0ZSA9PT0gR2VuU3RhdGVTdXNwZW5kZWRTdGFydCAmJlxuICAgICAgICAgICAgdHlwZW9mIGFyZyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgIC8vIGh0dHBzOi8vcGVvcGxlLm1vemlsbGEub3JnL35qb3JlbmRvcmZmL2VzNi1kcmFmdC5odG1sI3NlYy1nZW5lcmF0b3JyZXN1bWVcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgXCJhdHRlbXB0IHRvIHNlbmQgXCIgKyBKU09OLnN0cmluZ2lmeShhcmcpICsgXCIgdG8gbmV3Ym9ybiBnZW5lcmF0b3JcIlxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3RhdGUgPT09IEdlblN0YXRlU3VzcGVuZGVkWWllbGQpIHtcbiAgICAgICAgICBjb250ZXh0LnNlbnQgPSBhcmc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIGNvbnRleHQuc2VudDtcbiAgICAgICAgfVxuXG4gICAgICB9IGVsc2UgaWYgKG1ldGhvZCA9PT0gXCJ0aHJvd1wiKSB7XG4gICAgICAgIGlmIChzdGF0ZSA9PT0gR2VuU3RhdGVTdXNwZW5kZWRTdGFydCkge1xuICAgICAgICAgIHN0YXRlID0gR2VuU3RhdGVDb21wbGV0ZWQ7XG4gICAgICAgICAgdGhyb3cgYXJnO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbnRleHQuZGlzcGF0Y2hFeGNlcHRpb24oYXJnKSkge1xuICAgICAgICAgIC8vIElmIHRoZSBkaXNwYXRjaGVkIGV4Y2VwdGlvbiB3YXMgY2F1Z2h0IGJ5IGEgY2F0Y2ggYmxvY2ssXG4gICAgICAgICAgLy8gdGhlbiBsZXQgdGhhdCBjYXRjaCBibG9jayBoYW5kbGUgdGhlIGV4Y2VwdGlvbiBub3JtYWxseS5cbiAgICAgICAgICBtZXRob2QgPSBcIm5leHRcIjtcbiAgICAgICAgICBhcmcgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgfSBlbHNlIGlmIChtZXRob2QgPT09IFwicmV0dXJuXCIpIHtcbiAgICAgICAgY29udGV4dC5hYnJ1cHQoXCJyZXR1cm5cIiwgYXJnKTtcbiAgICAgIH1cblxuICAgICAgc3RhdGUgPSBHZW5TdGF0ZUV4ZWN1dGluZztcblxuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIHZhbHVlID0gaW5uZXJGbi5jYWxsKHNlbGYsIGNvbnRleHQpO1xuXG4gICAgICAgIC8vIElmIGFuIGV4Y2VwdGlvbiBpcyB0aHJvd24gZnJvbSBpbm5lckZuLCB3ZSBsZWF2ZSBzdGF0ZSA9PT1cbiAgICAgICAgLy8gR2VuU3RhdGVFeGVjdXRpbmcgYW5kIGxvb3AgYmFjayBmb3IgYW5vdGhlciBpbnZvY2F0aW9uLlxuICAgICAgICBzdGF0ZSA9IGNvbnRleHQuZG9uZSA/IEdlblN0YXRlQ29tcGxldGVkIDogR2VuU3RhdGVTdXNwZW5kZWRZaWVsZDtcblxuICAgICAgICBpbmZvID0ge1xuICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICBkb25lOiBjb250ZXh0LmRvbmVcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodmFsdWUgPT09IENvbnRpbnVlU2VudGluZWwpIHtcbiAgICAgICAgICBpZiAoY29udGV4dC5kZWxlZ2F0ZSAmJiBtZXRob2QgPT09IFwibmV4dFwiKSB7XG4gICAgICAgICAgICAvLyBEZWxpYmVyYXRlbHkgZm9yZ2V0IHRoZSBsYXN0IHNlbnQgdmFsdWUgc28gdGhhdCB3ZSBkb24ndFxuICAgICAgICAgICAgLy8gYWNjaWRlbnRhbGx5IHBhc3MgaXQgb24gdG8gdGhlIGRlbGVnYXRlLlxuICAgICAgICAgICAgYXJnID0gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gaW5mbztcbiAgICAgICAgfVxuXG4gICAgICB9IGNhdGNoICh0aHJvd24pIHtcbiAgICAgICAgc3RhdGUgPSBHZW5TdGF0ZUNvbXBsZXRlZDtcblxuICAgICAgICBpZiAobWV0aG9kID09PSBcIm5leHRcIikge1xuICAgICAgICAgIGNvbnRleHQuZGlzcGF0Y2hFeGNlcHRpb24odGhyb3duKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhcmcgPSB0aHJvd247XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZW5lcmF0b3IubmV4dCA9IGludm9rZS5iaW5kKGdlbmVyYXRvciwgXCJuZXh0XCIpO1xuICBnZW5lcmF0b3JbXCJ0aHJvd1wiXSA9IGludm9rZS5iaW5kKGdlbmVyYXRvciwgXCJ0aHJvd1wiKTtcbiAgZ2VuZXJhdG9yW1wicmV0dXJuXCJdID0gaW52b2tlLmJpbmQoZ2VuZXJhdG9yLCBcInJldHVyblwiKTtcblxuICByZXR1cm4gZ2VuZXJhdG9yO1xufVxuXG5HcFtpdGVyYXRvclN5bWJvbF0gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzO1xufTtcblxuR3AudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBcIltvYmplY3QgR2VuZXJhdG9yXVwiO1xufTtcblxuZnVuY3Rpb24gcHVzaFRyeUVudHJ5KHRyaXBsZSkge1xuICB2YXIgZW50cnkgPSB7IHRyeUxvYzogdHJpcGxlWzBdIH07XG5cbiAgaWYgKDEgaW4gdHJpcGxlKSB7XG4gICAgZW50cnkuY2F0Y2hMb2MgPSB0cmlwbGVbMV07XG4gIH1cblxuICBpZiAoMiBpbiB0cmlwbGUpIHtcbiAgICBlbnRyeS5maW5hbGx5TG9jID0gdHJpcGxlWzJdO1xuICB9XG5cbiAgdGhpcy50cnlFbnRyaWVzLnB1c2goZW50cnkpO1xufVxuXG5mdW5jdGlvbiByZXNldFRyeUVudHJ5KGVudHJ5LCBpKSB7XG4gIHZhciByZWNvcmQgPSBlbnRyeS5jb21wbGV0aW9uIHx8IHt9O1xuICByZWNvcmQudHlwZSA9IGkgPT09IDAgPyBcIm5vcm1hbFwiIDogXCJyZXR1cm5cIjtcbiAgZGVsZXRlIHJlY29yZC5hcmc7XG4gIGVudHJ5LmNvbXBsZXRpb24gPSByZWNvcmQ7XG59XG5cbmZ1bmN0aW9uIENvbnRleHQodHJ5TGlzdCkge1xuICAvLyBUaGUgcm9vdCBlbnRyeSBvYmplY3QgKGVmZmVjdGl2ZWx5IGEgdHJ5IHN0YXRlbWVudCB3aXRob3V0IGEgY2F0Y2hcbiAgLy8gb3IgYSBmaW5hbGx5IGJsb2NrKSBnaXZlcyB1cyBhIHBsYWNlIHRvIHN0b3JlIHZhbHVlcyB0aHJvd24gZnJvbVxuICAvLyBsb2NhdGlvbnMgd2hlcmUgdGhlcmUgaXMgbm8gZW5jbG9zaW5nIHRyeSBzdGF0ZW1lbnQuXG4gIHRoaXMudHJ5RW50cmllcyA9IFt7IHRyeUxvYzogXCJyb290XCIgfV07XG4gIHRyeUxpc3QuZm9yRWFjaChwdXNoVHJ5RW50cnksIHRoaXMpO1xuICB0aGlzLnJlc2V0KCk7XG59XG5cbnJ1bnRpbWUua2V5cyA9IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgdmFyIGtleXMgPSBbXTtcbiAgZm9yICh2YXIga2V5IGluIG9iamVjdCkge1xuICAgIGtleXMucHVzaChrZXkpO1xuICB9XG4gIGtleXMucmV2ZXJzZSgpO1xuXG4gIC8vIFJhdGhlciB0aGFuIHJldHVybmluZyBhbiBvYmplY3Qgd2l0aCBhIG5leHQgbWV0aG9kLCB3ZSBrZWVwXG4gIC8vIHRoaW5ncyBzaW1wbGUgYW5kIHJldHVybiB0aGUgbmV4dCBmdW5jdGlvbiBpdHNlbGYuXG4gIHJldHVybiBmdW5jdGlvbiBuZXh0KCkge1xuICAgIHdoaWxlIChrZXlzLmxlbmd0aCkge1xuICAgICAgdmFyIGtleSA9IGtleXMucG9wKCk7XG4gICAgICBpZiAoa2V5IGluIG9iamVjdCkge1xuICAgICAgICBuZXh0LnZhbHVlID0ga2V5O1xuICAgICAgICBuZXh0LmRvbmUgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIG5leHQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVG8gYXZvaWQgY3JlYXRpbmcgYW4gYWRkaXRpb25hbCBvYmplY3QsIHdlIGp1c3QgaGFuZyB0aGUgLnZhbHVlXG4gICAgLy8gYW5kIC5kb25lIHByb3BlcnRpZXMgb2ZmIHRoZSBuZXh0IGZ1bmN0aW9uIG9iamVjdCBpdHNlbGYuIFRoaXNcbiAgICAvLyBhbHNvIGVuc3VyZXMgdGhhdCB0aGUgbWluaWZpZXIgd2lsbCBub3QgYW5vbnltaXplIHRoZSBmdW5jdGlvbi5cbiAgICBuZXh0LmRvbmUgPSB0cnVlO1xuICAgIHJldHVybiBuZXh0O1xuICB9O1xufTtcblxuZnVuY3Rpb24gdmFsdWVzKGl0ZXJhYmxlKSB7XG4gIHZhciBpdGVyYXRvciA9IGl0ZXJhYmxlO1xuICBpZiAoaXRlcmF0b3JTeW1ib2wgaW4gaXRlcmFibGUpIHtcbiAgICBpdGVyYXRvciA9IGl0ZXJhYmxlW2l0ZXJhdG9yU3ltYm9sXSgpO1xuICB9IGVsc2UgaWYgKCFpc05hTihpdGVyYWJsZS5sZW5ndGgpKSB7XG4gICAgdmFyIGkgPSAtMTtcbiAgICBpdGVyYXRvciA9IGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgICB3aGlsZSAoKytpIDwgaXRlcmFibGUubGVuZ3RoKSB7XG4gICAgICAgIGlmIChpIGluIGl0ZXJhYmxlKSB7XG4gICAgICAgICAgbmV4dC52YWx1ZSA9IGl0ZXJhYmxlW2ldO1xuICAgICAgICAgIG5leHQuZG9uZSA9IGZhbHNlO1xuICAgICAgICAgIHJldHVybiBuZXh0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBuZXh0LmRvbmUgPSB0cnVlO1xuICAgICAgcmV0dXJuIG5leHQ7XG4gICAgfTtcbiAgICBpdGVyYXRvci5uZXh0ID0gaXRlcmF0b3I7XG4gIH1cbiAgcmV0dXJuIGl0ZXJhdG9yO1xufVxucnVudGltZS52YWx1ZXMgPSB2YWx1ZXM7XG5cbkNvbnRleHQucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogQ29udGV4dCxcblxuICByZXNldDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucHJldiA9IDA7XG4gICAgdGhpcy5uZXh0ID0gMDtcbiAgICB0aGlzLnNlbnQgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5kb25lID0gZmFsc2U7XG4gICAgdGhpcy5kZWxlZ2F0ZSA9IG51bGw7XG5cbiAgICB0aGlzLnRyeUVudHJpZXMuZm9yRWFjaChyZXNldFRyeUVudHJ5KTtcblxuICAgIC8vIFByZS1pbml0aWFsaXplIGF0IGxlYXN0IDIwIHRlbXBvcmFyeSB2YXJpYWJsZXMgdG8gZW5hYmxlIGhpZGRlblxuICAgIC8vIGNsYXNzIG9wdGltaXphdGlvbnMgZm9yIHNpbXBsZSBnZW5lcmF0b3JzLlxuICAgIGZvciAodmFyIHRlbXBJbmRleCA9IDAsIHRlbXBOYW1lO1xuICAgICAgICAgaGFzT3duLmNhbGwodGhpcywgdGVtcE5hbWUgPSBcInRcIiArIHRlbXBJbmRleCkgfHwgdGVtcEluZGV4IDwgMjA7XG4gICAgICAgICArK3RlbXBJbmRleCkge1xuICAgICAgdGhpc1t0ZW1wTmFtZV0gPSBudWxsO1xuICAgIH1cbiAgfSxcblxuICBzdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kb25lID0gdHJ1ZTtcblxuICAgIHZhciByb290RW50cnkgPSB0aGlzLnRyeUVudHJpZXNbMF07XG4gICAgdmFyIHJvb3RSZWNvcmQgPSByb290RW50cnkuY29tcGxldGlvbjtcbiAgICBpZiAocm9vdFJlY29yZC50eXBlID09PSBcInRocm93XCIpIHtcbiAgICAgIHRocm93IHJvb3RSZWNvcmQuYXJnO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJ2YWw7XG4gIH0sXG5cbiAgZGlzcGF0Y2hFeGNlcHRpb246IGZ1bmN0aW9uIChleGNlcHRpb24pIHtcbiAgICBpZiAodGhpcy5kb25lKSB7XG4gICAgICB0aHJvdyBleGNlcHRpb247XG4gICAgfVxuXG4gICAgdmFyIGNvbnRleHQgPSB0aGlzO1xuICAgIGZ1bmN0aW9uIGhhbmRsZShsb2MsIGNhdWdodCkge1xuICAgICAgcmVjb3JkLnR5cGUgPSBcInRocm93XCI7XG4gICAgICByZWNvcmQuYXJnID0gZXhjZXB0aW9uO1xuICAgICAgY29udGV4dC5uZXh0ID0gbG9jO1xuICAgICAgcmV0dXJuICEhY2F1Z2h0O1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSB0aGlzLnRyeUVudHJpZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIHZhciBlbnRyeSA9IHRoaXMudHJ5RW50cmllc1tpXTtcbiAgICAgIHZhciByZWNvcmQgPSBlbnRyeS5jb21wbGV0aW9uO1xuXG4gICAgICBpZiAoZW50cnkudHJ5TG9jID09PSBcInJvb3RcIikge1xuICAgICAgICAvLyBFeGNlcHRpb24gdGhyb3duIG91dHNpZGUgb2YgYW55IHRyeSBibG9jayB0aGF0IGNvdWxkIGhhbmRsZVxuICAgICAgICAvLyBpdCwgc28gc2V0IHRoZSBjb21wbGV0aW9uIHZhbHVlIG9mIHRoZSBlbnRpcmUgZnVuY3Rpb24gdG9cbiAgICAgICAgLy8gdGhyb3cgdGhlIGV4Y2VwdGlvbi5cbiAgICAgICAgcmV0dXJuIGhhbmRsZShcImVuZFwiKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGVudHJ5LnRyeUxvYyA8PSB0aGlzLnByZXYpIHtcbiAgICAgICAgdmFyIGhhc0NhdGNoID0gaGFzT3duLmNhbGwoZW50cnksIFwiY2F0Y2hMb2NcIik7XG4gICAgICAgIHZhciBoYXNGaW5hbGx5ID0gaGFzT3duLmNhbGwoZW50cnksIFwiZmluYWxseUxvY1wiKTtcblxuICAgICAgICBpZiAoaGFzQ2F0Y2ggJiYgaGFzRmluYWxseSkge1xuICAgICAgICAgIGlmICh0aGlzLnByZXYgPCBlbnRyeS5jYXRjaExvYykge1xuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZShlbnRyeS5jYXRjaExvYywgdHJ1ZSk7XG4gICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnByZXYgPCBlbnRyeS5maW5hbGx5TG9jKSB7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlKGVudHJ5LmZpbmFsbHlMb2MpO1xuICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2UgaWYgKGhhc0NhdGNoKSB7XG4gICAgICAgICAgaWYgKHRoaXMucHJldiA8IGVudHJ5LmNhdGNoTG9jKSB7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlKGVudHJ5LmNhdGNoTG9jLCB0cnVlKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIGlmIChoYXNGaW5hbGx5KSB7XG4gICAgICAgICAgaWYgKHRoaXMucHJldiA8IGVudHJ5LmZpbmFsbHlMb2MpIHtcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGUoZW50cnkuZmluYWxseUxvYyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidHJ5IHN0YXRlbWVudCB3aXRob3V0IGNhdGNoIG9yIGZpbmFsbHlcIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgX2ZpbmRGaW5hbGx5RW50cnk6IGZ1bmN0aW9uIChmaW5hbGx5TG9jKSB7XG4gICAgZm9yICh2YXIgaSA9IHRoaXMudHJ5RW50cmllcy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgdmFyIGVudHJ5ID0gdGhpcy50cnlFbnRyaWVzW2ldO1xuICAgICAgaWYgKGVudHJ5LnRyeUxvYyA8PSB0aGlzLnByZXYgJiZcbiAgICAgICAgICBoYXNPd24uY2FsbChlbnRyeSwgXCJmaW5hbGx5TG9jXCIpICYmIChcbiAgICAgICAgICAgIGVudHJ5LmZpbmFsbHlMb2MgPT09IGZpbmFsbHlMb2MgfHxcbiAgICAgICAgICAgIHRoaXMucHJldiA8IGVudHJ5LmZpbmFsbHlMb2MpKSB7XG4gICAgICAgIHJldHVybiBlbnRyeTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgYWJydXB0OiBmdW5jdGlvbiAodHlwZSwgYXJnKSB7XG4gICAgdmFyIGVudHJ5ID0gdGhpcy5fZmluZEZpbmFsbHlFbnRyeSgpO1xuICAgIHZhciByZWNvcmQgPSBlbnRyeSA/IGVudHJ5LmNvbXBsZXRpb24gOiB7fTtcblxuICAgIHJlY29yZC50eXBlID0gdHlwZTtcbiAgICByZWNvcmQuYXJnID0gYXJnO1xuXG4gICAgaWYgKGVudHJ5KSB7XG4gICAgICB0aGlzLm5leHQgPSBlbnRyeS5maW5hbGx5TG9jO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbXBsZXRlKHJlY29yZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIENvbnRpbnVlU2VudGluZWw7XG4gIH0sXG5cbiAgY29tcGxldGU6IGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICBpZiAocmVjb3JkLnR5cGUgPT09IFwidGhyb3dcIikge1xuICAgICAgdGhyb3cgcmVjb3JkLmFyZztcbiAgICB9XG5cbiAgICBpZiAocmVjb3JkLnR5cGUgPT09IFwiYnJlYWtcIiB8fCByZWNvcmQudHlwZSA9PT0gXCJjb250aW51ZVwiKSB7XG4gICAgICB0aGlzLm5leHQgPSByZWNvcmQuYXJnO1xuICAgIH0gZWxzZSBpZiAocmVjb3JkLnR5cGUgPT09IFwicmV0dXJuXCIpIHtcbiAgICAgIHRoaXMucnZhbCA9IHJlY29yZC5hcmc7XG4gICAgICB0aGlzLm5leHQgPSBcImVuZFwiO1xuICAgIH1cblxuICAgIHJldHVybiBDb250aW51ZVNlbnRpbmVsO1xuICB9LFxuXG4gIGZpbmlzaDogZnVuY3Rpb24gKGZpbmFsbHlMb2MpIHtcbiAgICB2YXIgZW50cnkgPSB0aGlzLl9maW5kRmluYWxseUVudHJ5KGZpbmFsbHlMb2MpO1xuICAgIHJldHVybiB0aGlzLmNvbXBsZXRlKGVudHJ5LmNvbXBsZXRpb24pO1xuICB9LFxuXG4gIFwiY2F0Y2hcIjogZnVuY3Rpb24gKHRyeUxvYykge1xuICAgIGZvciAodmFyIGkgPSB0aGlzLnRyeUVudHJpZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIHZhciBlbnRyeSA9IHRoaXMudHJ5RW50cmllc1tpXTtcbiAgICAgIGlmIChlbnRyeS50cnlMb2MgPT09IHRyeUxvYykge1xuICAgICAgICB2YXIgcmVjb3JkID0gZW50cnkuY29tcGxldGlvbjtcbiAgICAgICAgdmFyIHRocm93bjtcbiAgICAgICAgaWYgKHJlY29yZC50eXBlID09PSBcInRocm93XCIpIHtcbiAgICAgICAgICB0aHJvd24gPSByZWNvcmQuYXJnO1xuICAgICAgICAgIHJlc2V0VHJ5RW50cnkoZW50cnksIGkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aHJvd247XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVGhlIGNvbnRleHQuY2F0Y2ggbWV0aG9kIG11c3Qgb25seSBiZSBjYWxsZWQgd2l0aCBhIGxvY2F0aW9uXG4gICAgLy8gYXJndW1lbnQgdGhhdCBjb3JyZXNwb25kcyB0byBhIGtub3duIGNhdGNoIGJsb2NrLlxuICAgIHRocm93IG5ldyBFcnJvcihcImlsbGVnYWwgY2F0Y2ggYXR0ZW1wdFwiKTtcbiAgfSxcblxuICBkZWxlZ2F0ZVlpZWxkOiBmdW5jdGlvbiAoaXRlcmFibGUsIHJlc3VsdE5hbWUsIG5leHRMb2MpIHtcbiAgICB0aGlzLmRlbGVnYXRlID0ge1xuICAgICAgaXRlcmF0b3I6IHZhbHVlcyhpdGVyYWJsZSksXG4gICAgICByZXN1bHROYW1lOiByZXN1bHROYW1lLFxuICAgICAgbmV4dExvYzogbmV4dExvY1xuICAgIH07XG5cbiAgICByZXR1cm4gQ29udGludWVTZW50aW5lbDtcbiAgfVxufTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbiAvKiFcbiAgKiBodHRwczovL2dpdGh1Yi5jb20vcGF1bG1pbGxyL2VzNi1zaGltXG4gICogQGxpY2Vuc2UgZXM2LXNoaW0gQ29weXJpZ2h0IDIwMTMtMjAxNCBieSBQYXVsIE1pbGxlciAoaHR0cDovL3BhdWxtaWxsci5jb20pXG4gICogICBhbmQgY29udHJpYnV0b3JzLCAgTUlUIExpY2Vuc2VcbiAgKiBlczYtc2hpbTogdjAuMjEuMFxuICAqIHNlZSBodHRwczovL2dpdGh1Yi5jb20vcGF1bG1pbGxyL2VzNi1zaGltL2Jsb2IvbWFzdGVyL0xJQ0VOU0VcbiAgKiBEZXRhaWxzIGFuZCBkb2N1bWVudGF0aW9uOlxuICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9wYXVsbWlsbHIvZXM2LXNoaW0vXG4gICovXG5cbi8vIFVNRCAoVW5pdmVyc2FsIE1vZHVsZSBEZWZpbml0aW9uKVxuLy8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS91bWRqcy91bWQvYmxvYi9tYXN0ZXIvcmV0dXJuRXhwb3J0cy5qc1xuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIC8vIE5vZGUuIERvZXMgbm90IHdvcmsgd2l0aCBzdHJpY3QgQ29tbW9uSlMsIGJ1dFxuICAgIC8vIG9ubHkgQ29tbW9uSlMtbGlrZSBlbnZpcm9tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsXG4gICAgLy8gbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgcm9vdC5yZXR1cm5FeHBvcnRzID0gZmFjdG9yeSgpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciBpc0NhbGxhYmxlV2l0aG91dE5ldyA9IGZ1bmN0aW9uIChmdW5jKSB7XG4gICAgdHJ5IHsgZnVuYygpOyB9XG4gICAgY2F0Y2ggKGUpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgdmFyIHN1cHBvcnRzU3ViY2xhc3NpbmcgPSBmdW5jdGlvbiAoQywgZikge1xuICAgIC8qIGpzaGludCBwcm90bzp0cnVlICovXG4gICAgdHJ5IHtcbiAgICAgIHZhciBTdWIgPSBmdW5jdGlvbiAoKSB7IEMuYXBwbHkodGhpcywgYXJndW1lbnRzKTsgfTtcbiAgICAgIGlmICghU3ViLl9fcHJvdG9fXykgeyByZXR1cm4gZmFsc2U7IC8qIHNraXAgdGVzdCBvbiBJRSA8IDExICovIH1cbiAgICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZihTdWIsIEMpO1xuICAgICAgU3ViLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQy5wcm90b3R5cGUsIHtcbiAgICAgICAgY29uc3RydWN0b3I6IHsgdmFsdWU6IEMgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gZihTdWIpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIGFyZVByb3BlcnR5RGVzY3JpcHRvcnNTdXBwb3J0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh7fSwgJ3gnLCB7fSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7IC8qIHRoaXMgaXMgSUUgOC4gKi9cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIHN0YXJ0c1dpdGhSZWplY3RzUmVnZXggPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJlamVjdHNSZWdleCA9IGZhbHNlO1xuICAgIGlmIChTdHJpbmcucHJvdG90eXBlLnN0YXJ0c1dpdGgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgICcvYS8nLnN0YXJ0c1dpdGgoL2EvKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHsgLyogdGhpcyBpcyBzcGVjIGNvbXBsaWFudCAqL1xuICAgICAgICByZWplY3RzUmVnZXggPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVqZWN0c1JlZ2V4O1xuICB9O1xuXG4gIC8qanNoaW50IGV2aWw6IHRydWUgKi9cbiAgdmFyIGdldEdsb2JhbCA9IG5ldyBGdW5jdGlvbigncmV0dXJuIHRoaXM7Jyk7XG4gIC8qanNoaW50IGV2aWw6IGZhbHNlICovXG5cbiAgdmFyIGdsb2JhbHMgPSBnZXRHbG9iYWwoKTtcbiAgdmFyIGdsb2JhbF9pc0Zpbml0ZSA9IGdsb2JhbHMuaXNGaW5pdGU7XG4gIHZhciBzdXBwb3J0c0Rlc2NyaXB0b3JzID0gISFPYmplY3QuZGVmaW5lUHJvcGVydHkgJiYgYXJlUHJvcGVydHlEZXNjcmlwdG9yc1N1cHBvcnRlZCgpO1xuICB2YXIgc3RhcnRzV2l0aElzQ29tcGxpYW50ID0gc3RhcnRzV2l0aFJlamVjdHNSZWdleCgpO1xuICB2YXIgX3NsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuICB2YXIgX2luZGV4T2YgPSBTdHJpbmcucHJvdG90eXBlLmluZGV4T2Y7XG4gIHZhciBfdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICB2YXIgX2hhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbiAgdmFyIEFycmF5SXRlcmF0b3I7IC8vIG1ha2Ugb3VyIGltcGxlbWVudGF0aW9uIHByaXZhdGVcblxuICB2YXIgZGVmaW5lUHJvcGVydHkgPSBmdW5jdGlvbiAob2JqZWN0LCBuYW1lLCB2YWx1ZSwgZm9yY2UpIHtcbiAgICBpZiAoIWZvcmNlICYmIG5hbWUgaW4gb2JqZWN0KSB7IHJldHVybjsgfVxuICAgIGlmIChzdXBwb3J0c0Rlc2NyaXB0b3JzKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBuYW1lLCB7XG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBvYmplY3RbbmFtZV0gPSB2YWx1ZTtcbiAgICB9XG4gIH07XG5cbiAgLy8gRGVmaW5lIGNvbmZpZ3VyYWJsZSwgd3JpdGFibGUgYW5kIG5vbi1lbnVtZXJhYmxlIHByb3BzXG4gIC8vIGlmIHRoZXkgZG9u4oCZdCBleGlzdC5cbiAgdmFyIGRlZmluZVByb3BlcnRpZXMgPSBmdW5jdGlvbiAob2JqZWN0LCBtYXApIHtcbiAgICBPYmplY3Qua2V5cyhtYXApLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgIHZhciBtZXRob2QgPSBtYXBbbmFtZV07XG4gICAgICBkZWZpbmVQcm9wZXJ0eShvYmplY3QsIG5hbWUsIG1ldGhvZCwgZmFsc2UpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIFNpbXBsZSBzaGltIGZvciBPYmplY3QuY3JlYXRlIG9uIEVTMyBicm93c2Vyc1xuICAvLyAodW5saWtlIHJlYWwgc2hpbSwgbm8gYXR0ZW1wdCB0byBzdXBwb3J0IGBwcm90b3R5cGUgPT09IG51bGxgKVxuICB2YXIgY3JlYXRlID0gT2JqZWN0LmNyZWF0ZSB8fCBmdW5jdGlvbiAocHJvdG90eXBlLCBwcm9wZXJ0aWVzKSB7XG4gICAgZnVuY3Rpb24gVHlwZSgpIHt9XG4gICAgVHlwZS5wcm90b3R5cGUgPSBwcm90b3R5cGU7XG4gICAgdmFyIG9iamVjdCA9IG5ldyBUeXBlKCk7XG4gICAgaWYgKHR5cGVvZiBwcm9wZXJ0aWVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgZGVmaW5lUHJvcGVydGllcyhvYmplY3QsIHByb3BlcnRpZXMpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0O1xuICB9O1xuXG4gIC8vIFRoaXMgaXMgYSBwcml2YXRlIG5hbWUgaW4gdGhlIGVzNiBzcGVjLCBlcXVhbCB0byAnW1N5bWJvbC5pdGVyYXRvcl0nXG4gIC8vIHdlJ3JlIGdvaW5nIHRvIHVzZSBhbiBhcmJpdHJhcnkgXy1wcmVmaXhlZCBuYW1lIHRvIG1ha2Ugb3VyIHNoaW1zXG4gIC8vIHdvcmsgcHJvcGVybHkgd2l0aCBlYWNoIG90aGVyLCBldmVuIHRob3VnaCB3ZSBkb24ndCBoYXZlIGZ1bGwgSXRlcmF0b3JcbiAgLy8gc3VwcG9ydC4gIFRoYXQgaXMsIGBBcnJheS5mcm9tKG1hcC5rZXlzKCkpYCB3aWxsIHdvcmssIGJ1dCB3ZSBkb24ndFxuICAvLyBwcmV0ZW5kIHRvIGV4cG9ydCBhIFwicmVhbFwiIEl0ZXJhdG9yIGludGVyZmFjZS5cbiAgdmFyICRpdGVyYXRvciQgPSAodHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiBTeW1ib2wuaXRlcmF0b3IpIHx8ICdfZXM2LXNoaW0gaXRlcmF0b3JfJztcbiAgLy8gRmlyZWZveCBzaGlwcyBhIHBhcnRpYWwgaW1wbGVtZW50YXRpb24gdXNpbmcgdGhlIG5hbWUgQEBpdGVyYXRvci5cbiAgLy8gaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9OTA3MDc3I2MxNFxuICAvLyBTbyB1c2UgdGhhdCBuYW1lIGlmIHdlIGRldGVjdCBpdC5cbiAgaWYgKGdsb2JhbHMuU2V0ICYmIHR5cGVvZiBuZXcgZ2xvYmFscy5TZXQoKVsnQEBpdGVyYXRvciddID09PSAnZnVuY3Rpb24nKSB7XG4gICAgJGl0ZXJhdG9yJCA9ICdAQGl0ZXJhdG9yJztcbiAgfVxuICB2YXIgYWRkSXRlcmF0b3IgPSBmdW5jdGlvbiAocHJvdG90eXBlLCBpbXBsKSB7XG4gICAgaWYgKCFpbXBsKSB7IGltcGwgPSBmdW5jdGlvbiBpdGVyYXRvcigpIHsgcmV0dXJuIHRoaXM7IH07IH1cbiAgICB2YXIgbyA9IHt9O1xuICAgIG9bJGl0ZXJhdG9yJF0gPSBpbXBsO1xuICAgIGRlZmluZVByb3BlcnRpZXMocHJvdG90eXBlLCBvKTtcbiAgICAvKiBqc2hpbnQgbm90eXBlb2Y6IHRydWUgKi9cbiAgICBpZiAoIXByb3RvdHlwZVskaXRlcmF0b3IkXSAmJiB0eXBlb2YgJGl0ZXJhdG9yJCA9PT0gJ3N5bWJvbCcpIHtcbiAgICAgIC8vIGltcGxlbWVudGF0aW9ucyBhcmUgYnVnZ3kgd2hlbiAkaXRlcmF0b3IkIGlzIGEgU3ltYm9sXG4gICAgICBwcm90b3R5cGVbJGl0ZXJhdG9yJF0gPSBpbXBsO1xuICAgIH1cbiAgfTtcblxuICAvLyB0YWtlbiBkaXJlY3RseSBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9samhhcmIvaXMtYXJndW1lbnRzL2Jsb2IvbWFzdGVyL2luZGV4LmpzXG4gIC8vIGNhbiBiZSByZXBsYWNlZCB3aXRoIHJlcXVpcmUoJ2lzLWFyZ3VtZW50cycpIGlmIHdlIGV2ZXIgdXNlIGEgYnVpbGQgcHJvY2VzcyBpbnN0ZWFkXG4gIHZhciBpc0FyZ3VtZW50cyA9IGZ1bmN0aW9uIGlzQXJndW1lbnRzKHZhbHVlKSB7XG4gICAgdmFyIHN0ciA9IF90b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgICB2YXIgcmVzdWx0ID0gc3RyID09PSAnW29iamVjdCBBcmd1bWVudHNdJztcbiAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgcmVzdWx0ID0gc3RyICE9PSAnW29iamVjdCBBcnJheV0nICYmXG4gICAgICAgIHZhbHVlICE9PSBudWxsICYmXG4gICAgICAgIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiZcbiAgICAgICAgdHlwZW9mIHZhbHVlLmxlbmd0aCA9PT0gJ251bWJlcicgJiZcbiAgICAgICAgdmFsdWUubGVuZ3RoID49IDAgJiZcbiAgICAgICAgX3RvU3RyaW5nLmNhbGwodmFsdWUuY2FsbGVlKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICB2YXIgZW11bGF0ZUVTNmNvbnN0cnVjdCA9IGZ1bmN0aW9uIChvKSB7XG4gICAgaWYgKCFFUy5UeXBlSXNPYmplY3QobykpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcignYmFkIG9iamVjdCcpOyB9XG4gICAgLy8gZXM1IGFwcHJveGltYXRpb24gdG8gZXM2IHN1YmNsYXNzIHNlbWFudGljczogaW4gZXM2LCAnbmV3IEZvbydcbiAgICAvLyB3b3VsZCBpbnZva2UgRm9vLkBAY3JlYXRlIHRvIGFsbG9jYXRpb24vaW5pdGlhbGl6ZSB0aGUgbmV3IG9iamVjdC5cbiAgICAvLyBJbiBlczUgd2UganVzdCBnZXQgdGhlIHBsYWluIG9iamVjdC4gIFNvIGlmIHdlIGRldGVjdCBhblxuICAgIC8vIHVuaW5pdGlhbGl6ZWQgb2JqZWN0LCBpbnZva2Ugby5jb25zdHJ1Y3Rvci5AQGNyZWF0ZVxuICAgIGlmICghby5fZXM2Y29uc3RydWN0KSB7XG4gICAgICBpZiAoby5jb25zdHJ1Y3RvciAmJiBFUy5Jc0NhbGxhYmxlKG8uY29uc3RydWN0b3JbJ0BAY3JlYXRlJ10pKSB7XG4gICAgICAgIG8gPSBvLmNvbnN0cnVjdG9yWydAQGNyZWF0ZSddKG8pO1xuICAgICAgfVxuICAgICAgZGVmaW5lUHJvcGVydGllcyhvLCB7IF9lczZjb25zdHJ1Y3Q6IHRydWUgfSk7XG4gICAgfVxuICAgIHJldHVybiBvO1xuICB9O1xuXG4gIHZhciBFUyA9IHtcbiAgICBDaGVja09iamVjdENvZXJjaWJsZTogZnVuY3Rpb24gKHgsIG9wdE1lc3NhZ2UpIHtcbiAgICAgIC8qIGpzaGludCBlcW51bGw6dHJ1ZSAqL1xuICAgICAgaWYgKHggPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG9wdE1lc3NhZ2UgfHwgJ0Nhbm5vdCBjYWxsIG1ldGhvZCBvbiAnICsgeCk7XG4gICAgICB9XG4gICAgICByZXR1cm4geDtcbiAgICB9LFxuXG4gICAgVHlwZUlzT2JqZWN0OiBmdW5jdGlvbiAoeCkge1xuICAgICAgLyoganNoaW50IGVxbnVsbDp0cnVlICovXG4gICAgICAvLyB0aGlzIGlzIGV4cGVuc2l2ZSB3aGVuIGl0IHJldHVybnMgZmFsc2U7IHVzZSB0aGlzIGZ1bmN0aW9uXG4gICAgICAvLyB3aGVuIHlvdSBleHBlY3QgaXQgdG8gcmV0dXJuIHRydWUgaW4gdGhlIGNvbW1vbiBjYXNlLlxuICAgICAgcmV0dXJuIHggIT0gbnVsbCAmJiBPYmplY3QoeCkgPT09IHg7XG4gICAgfSxcblxuICAgIFRvT2JqZWN0OiBmdW5jdGlvbiAobywgb3B0TWVzc2FnZSkge1xuICAgICAgcmV0dXJuIE9iamVjdChFUy5DaGVja09iamVjdENvZXJjaWJsZShvLCBvcHRNZXNzYWdlKSk7XG4gICAgfSxcblxuICAgIElzQ2FsbGFibGU6IGZ1bmN0aW9uICh4KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbicgJiZcbiAgICAgICAgLy8gc29tZSB2ZXJzaW9ucyBvZiBJRSBzYXkgdGhhdCB0eXBlb2YgL2FiYy8gPT09ICdmdW5jdGlvbidcbiAgICAgICAgX3RvU3RyaW5nLmNhbGwoeCkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gICAgfSxcblxuICAgIFRvSW50MzI6IGZ1bmN0aW9uICh4KSB7XG4gICAgICByZXR1cm4geCA+PiAwO1xuICAgIH0sXG5cbiAgICBUb1VpbnQzMjogZnVuY3Rpb24gKHgpIHtcbiAgICAgIHJldHVybiB4ID4+PiAwO1xuICAgIH0sXG5cbiAgICBUb0ludGVnZXI6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgdmFyIG51bWJlciA9ICt2YWx1ZTtcbiAgICAgIGlmIChOdW1iZXIuaXNOYU4obnVtYmVyKSkgeyByZXR1cm4gMDsgfVxuICAgICAgaWYgKG51bWJlciA9PT0gMCB8fCAhTnVtYmVyLmlzRmluaXRlKG51bWJlcikpIHsgcmV0dXJuIG51bWJlcjsgfVxuICAgICAgcmV0dXJuIChudW1iZXIgPiAwID8gMSA6IC0xKSAqIE1hdGguZmxvb3IoTWF0aC5hYnMobnVtYmVyKSk7XG4gICAgfSxcblxuICAgIFRvTGVuZ3RoOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhciBsZW4gPSBFUy5Ub0ludGVnZXIodmFsdWUpO1xuICAgICAgaWYgKGxlbiA8PSAwKSB7IHJldHVybiAwOyB9IC8vIGluY2x1ZGVzIGNvbnZlcnRpbmcgLTAgdG8gKzBcbiAgICAgIGlmIChsZW4gPiBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUikgeyByZXR1cm4gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVI7IH1cbiAgICAgIHJldHVybiBsZW47XG4gICAgfSxcblxuICAgIFNhbWVWYWx1ZTogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgIGlmIChhID09PSBiKSB7XG4gICAgICAgIC8vIDAgPT09IC0wLCBidXQgdGhleSBhcmUgbm90IGlkZW50aWNhbC5cbiAgICAgICAgaWYgKGEgPT09IDApIHsgcmV0dXJuIDEgLyBhID09PSAxIC8gYjsgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBOdW1iZXIuaXNOYU4oYSkgJiYgTnVtYmVyLmlzTmFOKGIpO1xuICAgIH0sXG5cbiAgICBTYW1lVmFsdWVaZXJvOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgLy8gc2FtZSBhcyBTYW1lVmFsdWUgZXhjZXB0IGZvciBTYW1lVmFsdWVaZXJvKCswLCAtMCkgPT0gdHJ1ZVxuICAgICAgcmV0dXJuIChhID09PSBiKSB8fCAoTnVtYmVyLmlzTmFOKGEpICYmIE51bWJlci5pc05hTihiKSk7XG4gICAgfSxcblxuICAgIElzSXRlcmFibGU6IGZ1bmN0aW9uIChvKSB7XG4gICAgICByZXR1cm4gRVMuVHlwZUlzT2JqZWN0KG8pICYmXG4gICAgICAgICh0eXBlb2Ygb1skaXRlcmF0b3IkXSAhPT0gJ3VuZGVmaW5lZCcgfHwgaXNBcmd1bWVudHMobykpO1xuICAgIH0sXG5cbiAgICBHZXRJdGVyYXRvcjogZnVuY3Rpb24gKG8pIHtcbiAgICAgIGlmIChpc0FyZ3VtZW50cyhvKSkge1xuICAgICAgICAvLyBzcGVjaWFsIGNhc2Ugc3VwcG9ydCBmb3IgYGFyZ3VtZW50c2BcbiAgICAgICAgcmV0dXJuIG5ldyBBcnJheUl0ZXJhdG9yKG8sICd2YWx1ZScpO1xuICAgICAgfVxuICAgICAgdmFyIGl0Rm4gPSBvWyRpdGVyYXRvciRdO1xuICAgICAgaWYgKCFFUy5Jc0NhbGxhYmxlKGl0Rm4pKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ZhbHVlIGlzIG5vdCBhbiBpdGVyYWJsZScpO1xuICAgICAgfVxuICAgICAgdmFyIGl0ID0gaXRGbi5jYWxsKG8pO1xuICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QoaXQpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2JhZCBpdGVyYXRvcicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGl0O1xuICAgIH0sXG5cbiAgICBJdGVyYXRvck5leHQ6IGZ1bmN0aW9uIChpdCkge1xuICAgICAgdmFyIHJlc3VsdCA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gaXQubmV4dChhcmd1bWVudHNbMV0pIDogaXQubmV4dCgpO1xuICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QocmVzdWx0KSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdiYWQgaXRlcmF0b3InKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIENvbnN0cnVjdDogZnVuY3Rpb24gKEMsIGFyZ3MpIHtcbiAgICAgIC8vIENyZWF0ZUZyb21Db25zdHJ1Y3RvclxuICAgICAgdmFyIG9iajtcbiAgICAgIGlmIChFUy5Jc0NhbGxhYmxlKENbJ0BAY3JlYXRlJ10pKSB7XG4gICAgICAgIG9iaiA9IENbJ0BAY3JlYXRlJ10oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE9yZGluYXJ5Q3JlYXRlRnJvbUNvbnN0cnVjdG9yXG4gICAgICAgIG9iaiA9IGNyZWF0ZShDLnByb3RvdHlwZSB8fCBudWxsKTtcbiAgICAgIH1cbiAgICAgIC8vIE1hcmsgdGhhdCB3ZSd2ZSB1c2VkIHRoZSBlczYgY29uc3RydWN0IHBhdGhcbiAgICAgIC8vIChzZWUgZW11bGF0ZUVTNmNvbnN0cnVjdClcbiAgICAgIGRlZmluZVByb3BlcnRpZXMob2JqLCB7IF9lczZjb25zdHJ1Y3Q6IHRydWUgfSk7XG4gICAgICAvLyBDYWxsIHRoZSBjb25zdHJ1Y3Rvci5cbiAgICAgIHZhciByZXN1bHQgPSBDLmFwcGx5KG9iaiwgYXJncyk7XG4gICAgICByZXR1cm4gRVMuVHlwZUlzT2JqZWN0KHJlc3VsdCkgPyByZXN1bHQgOiBvYmo7XG4gICAgfVxuICB9O1xuXG4gIHZhciBudW1iZXJDb252ZXJzaW9uID0gKGZ1bmN0aW9uICgpIHtcbiAgICAvLyBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9pbmV4b3JhYmxldGFzaC9wb2x5ZmlsbC9ibG9iL21hc3Rlci90eXBlZGFycmF5LmpzI0wxNzYtTDI2NlxuICAgIC8vIHdpdGggcGVybWlzc2lvbiBhbmQgbGljZW5zZSwgcGVyIGh0dHBzOi8vdHdpdHRlci5jb20vaW5leG9yYWJsZXRhc2gvc3RhdHVzLzM3MjIwNjUwOTU0MDY1OTIwMFxuXG4gICAgZnVuY3Rpb24gcm91bmRUb0V2ZW4obikge1xuICAgICAgdmFyIHcgPSBNYXRoLmZsb29yKG4pLCBmID0gbiAtIHc7XG4gICAgICBpZiAoZiA8IDAuNSkge1xuICAgICAgICByZXR1cm4gdztcbiAgICAgIH1cbiAgICAgIGlmIChmID4gMC41KSB7XG4gICAgICAgIHJldHVybiB3ICsgMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB3ICUgMiA/IHcgKyAxIDogdztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYWNrSUVFRTc1NCh2LCBlYml0cywgZmJpdHMpIHtcbiAgICAgIHZhciBiaWFzID0gKDEgPDwgKGViaXRzIC0gMSkpIC0gMSxcbiAgICAgICAgcywgZSwgZixcbiAgICAgICAgaSwgYml0cywgc3RyLCBieXRlcztcblxuICAgICAgLy8gQ29tcHV0ZSBzaWduLCBleHBvbmVudCwgZnJhY3Rpb25cbiAgICAgIGlmICh2ICE9PSB2KSB7XG4gICAgICAgIC8vIE5hTlxuICAgICAgICAvLyBodHRwOi8vZGV2LnczLm9yZy8yMDA2L3dlYmFwaS9XZWJJREwvI2VzLXR5cGUtbWFwcGluZ1xuICAgICAgICBlID0gKDEgPDwgZWJpdHMpIC0gMTtcbiAgICAgICAgZiA9IE1hdGgucG93KDIsIGZiaXRzIC0gMSk7XG4gICAgICAgIHMgPSAwO1xuICAgICAgfSBlbHNlIGlmICh2ID09PSBJbmZpbml0eSB8fCB2ID09PSAtSW5maW5pdHkpIHtcbiAgICAgICAgZSA9ICgxIDw8IGViaXRzKSAtIDE7XG4gICAgICAgIGYgPSAwO1xuICAgICAgICBzID0gKHYgPCAwKSA/IDEgOiAwO1xuICAgICAgfSBlbHNlIGlmICh2ID09PSAwKSB7XG4gICAgICAgIGUgPSAwO1xuICAgICAgICBmID0gMDtcbiAgICAgICAgcyA9ICgxIC8gdiA9PT0gLUluZmluaXR5KSA/IDEgOiAwO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcyA9IHYgPCAwO1xuICAgICAgICB2ID0gTWF0aC5hYnModik7XG5cbiAgICAgICAgaWYgKHYgPj0gTWF0aC5wb3coMiwgMSAtIGJpYXMpKSB7XG4gICAgICAgICAgZSA9IE1hdGgubWluKE1hdGguZmxvb3IoTWF0aC5sb2codikgLyBNYXRoLkxOMiksIDEwMjMpO1xuICAgICAgICAgIGYgPSByb3VuZFRvRXZlbih2IC8gTWF0aC5wb3coMiwgZSkgKiBNYXRoLnBvdygyLCBmYml0cykpO1xuICAgICAgICAgIGlmIChmIC8gTWF0aC5wb3coMiwgZmJpdHMpID49IDIpIHtcbiAgICAgICAgICAgIGUgPSBlICsgMTtcbiAgICAgICAgICAgIGYgPSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZSA+IGJpYXMpIHtcbiAgICAgICAgICAgIC8vIE92ZXJmbG93XG4gICAgICAgICAgICBlID0gKDEgPDwgZWJpdHMpIC0gMTtcbiAgICAgICAgICAgIGYgPSAwO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBOb3JtYWxcbiAgICAgICAgICAgIGUgPSBlICsgYmlhcztcbiAgICAgICAgICAgIGYgPSBmIC0gTWF0aC5wb3coMiwgZmJpdHMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBTdWJub3JtYWxcbiAgICAgICAgICBlID0gMDtcbiAgICAgICAgICBmID0gcm91bmRUb0V2ZW4odiAvIE1hdGgucG93KDIsIDEgLSBiaWFzIC0gZmJpdHMpKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBQYWNrIHNpZ24sIGV4cG9uZW50LCBmcmFjdGlvblxuICAgICAgYml0cyA9IFtdO1xuICAgICAgZm9yIChpID0gZmJpdHM7IGk7IGkgLT0gMSkge1xuICAgICAgICBiaXRzLnB1c2goZiAlIDIgPyAxIDogMCk7XG4gICAgICAgIGYgPSBNYXRoLmZsb29yKGYgLyAyKTtcbiAgICAgIH1cbiAgICAgIGZvciAoaSA9IGViaXRzOyBpOyBpIC09IDEpIHtcbiAgICAgICAgYml0cy5wdXNoKGUgJSAyID8gMSA6IDApO1xuICAgICAgICBlID0gTWF0aC5mbG9vcihlIC8gMik7XG4gICAgICB9XG4gICAgICBiaXRzLnB1c2gocyA/IDEgOiAwKTtcbiAgICAgIGJpdHMucmV2ZXJzZSgpO1xuICAgICAgc3RyID0gYml0cy5qb2luKCcnKTtcblxuICAgICAgLy8gQml0cyB0byBieXRlc1xuICAgICAgYnl0ZXMgPSBbXTtcbiAgICAgIHdoaWxlIChzdHIubGVuZ3RoKSB7XG4gICAgICAgIGJ5dGVzLnB1c2gocGFyc2VJbnQoc3RyLnNsaWNlKDAsIDgpLCAyKSk7XG4gICAgICAgIHN0ciA9IHN0ci5zbGljZSg4KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBieXRlcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1bnBhY2tJRUVFNzU0KGJ5dGVzLCBlYml0cywgZmJpdHMpIHtcbiAgICAgIC8vIEJ5dGVzIHRvIGJpdHNcbiAgICAgIHZhciBiaXRzID0gW10sIGksIGosIGIsIHN0cixcbiAgICAgICAgICBiaWFzLCBzLCBlLCBmO1xuXG4gICAgICBmb3IgKGkgPSBieXRlcy5sZW5ndGg7IGk7IGkgLT0gMSkge1xuICAgICAgICBiID0gYnl0ZXNbaSAtIDFdO1xuICAgICAgICBmb3IgKGogPSA4OyBqOyBqIC09IDEpIHtcbiAgICAgICAgICBiaXRzLnB1c2goYiAlIDIgPyAxIDogMCk7XG4gICAgICAgICAgYiA9IGIgPj4gMTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYml0cy5yZXZlcnNlKCk7XG4gICAgICBzdHIgPSBiaXRzLmpvaW4oJycpO1xuXG4gICAgICAvLyBVbnBhY2sgc2lnbiwgZXhwb25lbnQsIGZyYWN0aW9uXG4gICAgICBiaWFzID0gKDEgPDwgKGViaXRzIC0gMSkpIC0gMTtcbiAgICAgIHMgPSBwYXJzZUludChzdHIuc2xpY2UoMCwgMSksIDIpID8gLTEgOiAxO1xuICAgICAgZSA9IHBhcnNlSW50KHN0ci5zbGljZSgxLCAxICsgZWJpdHMpLCAyKTtcbiAgICAgIGYgPSBwYXJzZUludChzdHIuc2xpY2UoMSArIGViaXRzKSwgMik7XG5cbiAgICAgIC8vIFByb2R1Y2UgbnVtYmVyXG4gICAgICBpZiAoZSA9PT0gKDEgPDwgZWJpdHMpIC0gMSkge1xuICAgICAgICByZXR1cm4gZiAhPT0gMCA/IE5hTiA6IHMgKiBJbmZpbml0eTtcbiAgICAgIH0gZWxzZSBpZiAoZSA+IDApIHtcbiAgICAgICAgLy8gTm9ybWFsaXplZFxuICAgICAgICByZXR1cm4gcyAqIE1hdGgucG93KDIsIGUgLSBiaWFzKSAqICgxICsgZiAvIE1hdGgucG93KDIsIGZiaXRzKSk7XG4gICAgICB9IGVsc2UgaWYgKGYgIT09IDApIHtcbiAgICAgICAgLy8gRGVub3JtYWxpemVkXG4gICAgICAgIHJldHVybiBzICogTWF0aC5wb3coMiwgLShiaWFzIC0gMSkpICogKGYgLyBNYXRoLnBvdygyLCBmYml0cykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHMgPCAwID8gLTAgOiAwO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVucGFja0Zsb2F0NjQoYikgeyByZXR1cm4gdW5wYWNrSUVFRTc1NChiLCAxMSwgNTIpOyB9XG4gICAgZnVuY3Rpb24gcGFja0Zsb2F0NjQodikgeyByZXR1cm4gcGFja0lFRUU3NTQodiwgMTEsIDUyKTsgfVxuICAgIGZ1bmN0aW9uIHVucGFja0Zsb2F0MzIoYikgeyByZXR1cm4gdW5wYWNrSUVFRTc1NChiLCA4LCAyMyk7IH1cbiAgICBmdW5jdGlvbiBwYWNrRmxvYXQzMih2KSB7IHJldHVybiBwYWNrSUVFRTc1NCh2LCA4LCAyMyk7IH1cblxuICAgIHZhciBjb252ZXJzaW9ucyA9IHtcbiAgICAgIHRvRmxvYXQzMjogZnVuY3Rpb24gKG51bSkgeyByZXR1cm4gdW5wYWNrRmxvYXQzMihwYWNrRmxvYXQzMihudW0pKTsgfVxuICAgIH07XG4gICAgaWYgKHR5cGVvZiBGbG9hdDMyQXJyYXkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB2YXIgZmxvYXQzMmFycmF5ID0gbmV3IEZsb2F0MzJBcnJheSgxKTtcbiAgICAgIGNvbnZlcnNpb25zLnRvRmxvYXQzMiA9IGZ1bmN0aW9uIChudW0pIHtcbiAgICAgICAgZmxvYXQzMmFycmF5WzBdID0gbnVtO1xuICAgICAgICByZXR1cm4gZmxvYXQzMmFycmF5WzBdO1xuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnZlcnNpb25zO1xuICB9KCkpO1xuXG4gIGRlZmluZVByb3BlcnRpZXMoU3RyaW5nLCB7XG4gICAgZnJvbUNvZGVQb2ludDogZnVuY3Rpb24gZnJvbUNvZGVQb2ludChfKSB7IC8vIGxlbmd0aCA9IDFcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIHZhciBuZXh0O1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBuZXh0ID0gTnVtYmVyKGFyZ3VtZW50c1tpXSk7XG4gICAgICAgIGlmICghRVMuU2FtZVZhbHVlKG5leHQsIEVTLlRvSW50ZWdlcihuZXh0KSkgfHwgbmV4dCA8IDAgfHwgbmV4dCA+IDB4MTBGRkZGKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgY29kZSBwb2ludCAnICsgbmV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobmV4dCA8IDB4MTAwMDApIHtcbiAgICAgICAgICByZXN1bHQucHVzaChTdHJpbmcuZnJvbUNoYXJDb2RlKG5leHQpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuZXh0IC09IDB4MTAwMDA7XG4gICAgICAgICAgcmVzdWx0LnB1c2goU3RyaW5nLmZyb21DaGFyQ29kZSgobmV4dCA+PiAxMCkgKyAweEQ4MDApKTtcbiAgICAgICAgICByZXN1bHQucHVzaChTdHJpbmcuZnJvbUNoYXJDb2RlKChuZXh0ICUgMHg0MDApICsgMHhEQzAwKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQuam9pbignJyk7XG4gICAgfSxcblxuICAgIHJhdzogZnVuY3Rpb24gcmF3KGNhbGxTaXRlKSB7IC8vIHJhdy5sZW5ndGg9PT0xXG4gICAgICB2YXIgY29va2VkID0gRVMuVG9PYmplY3QoY2FsbFNpdGUsICdiYWQgY2FsbFNpdGUnKTtcbiAgICAgIHZhciByYXdWYWx1ZSA9IGNvb2tlZC5yYXc7XG4gICAgICB2YXIgcmF3U3RyaW5nID0gRVMuVG9PYmplY3QocmF3VmFsdWUsICdiYWQgcmF3IHZhbHVlJyk7XG4gICAgICB2YXIgbGVuID0gcmF3U3RyaW5nLmxlbmd0aDtcbiAgICAgIHZhciBsaXRlcmFsc2VnbWVudHMgPSBFUy5Ub0xlbmd0aChsZW4pO1xuICAgICAgaWYgKGxpdGVyYWxzZWdtZW50cyA8PSAwKSB7XG4gICAgICAgIHJldHVybiAnJztcbiAgICAgIH1cblxuICAgICAgdmFyIHN0cmluZ0VsZW1lbnRzID0gW107XG4gICAgICB2YXIgbmV4dEluZGV4ID0gMDtcbiAgICAgIHZhciBuZXh0S2V5LCBuZXh0LCBuZXh0U2VnLCBuZXh0U3ViO1xuICAgICAgd2hpbGUgKG5leHRJbmRleCA8IGxpdGVyYWxzZWdtZW50cykge1xuICAgICAgICBuZXh0S2V5ID0gU3RyaW5nKG5leHRJbmRleCk7XG4gICAgICAgIG5leHQgPSByYXdTdHJpbmdbbmV4dEtleV07XG4gICAgICAgIG5leHRTZWcgPSBTdHJpbmcobmV4dCk7XG4gICAgICAgIHN0cmluZ0VsZW1lbnRzLnB1c2gobmV4dFNlZyk7XG4gICAgICAgIGlmIChuZXh0SW5kZXggKyAxID49IGxpdGVyYWxzZWdtZW50cykge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIG5leHQgPSBuZXh0SW5kZXggKyAxIDwgYXJndW1lbnRzLmxlbmd0aCA/IGFyZ3VtZW50c1tuZXh0SW5kZXggKyAxXSA6ICcnO1xuICAgICAgICBuZXh0U3ViID0gU3RyaW5nKG5leHQpO1xuICAgICAgICBzdHJpbmdFbGVtZW50cy5wdXNoKG5leHRTdWIpO1xuICAgICAgICBuZXh0SW5kZXgrKztcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdHJpbmdFbGVtZW50cy5qb2luKCcnKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEZpcmVmb3ggMzEgcmVwb3J0cyB0aGlzIGZ1bmN0aW9uJ3MgbGVuZ3RoIGFzIDBcbiAgLy8gaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTA2MjQ4NFxuICBpZiAoU3RyaW5nLmZyb21Db2RlUG9pbnQubGVuZ3RoICE9PSAxKSB7XG4gICAgdmFyIG9yaWdpbmFsRnJvbUNvZGVQb2ludCA9IFN0cmluZy5mcm9tQ29kZVBvaW50O1xuICAgIGRlZmluZVByb3BlcnR5KFN0cmluZywgJ2Zyb21Db2RlUG9pbnQnLCBmdW5jdGlvbiAoXykgeyByZXR1cm4gb3JpZ2luYWxGcm9tQ29kZVBvaW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7IH0sIHRydWUpO1xuICB9XG5cbiAgdmFyIFN0cmluZ1NoaW1zID0ge1xuICAgIC8vIEZhc3QgcmVwZWF0LCB1c2VzIHRoZSBgRXhwb25lbnRpYXRpb24gYnkgc3F1YXJpbmdgIGFsZ29yaXRobS5cbiAgICAvLyBQZXJmOiBodHRwOi8vanNwZXJmLmNvbS9zdHJpbmctcmVwZWF0Mi8yXG4gICAgcmVwZWF0OiAoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHJlcGVhdCA9IGZ1bmN0aW9uIChzLCB0aW1lcykge1xuICAgICAgICBpZiAodGltZXMgPCAxKSB7IHJldHVybiAnJzsgfVxuICAgICAgICBpZiAodGltZXMgJSAyKSB7IHJldHVybiByZXBlYXQocywgdGltZXMgLSAxKSArIHM7IH1cbiAgICAgICAgdmFyIGhhbGYgPSByZXBlYXQocywgdGltZXMgLyAyKTtcbiAgICAgICAgcmV0dXJuIGhhbGYgKyBoYWxmO1xuICAgICAgfTtcblxuICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aW1lcykge1xuICAgICAgICB2YXIgdGhpc1N0ciA9IFN0cmluZyhFUy5DaGVja09iamVjdENvZXJjaWJsZSh0aGlzKSk7XG4gICAgICAgIHRpbWVzID0gRVMuVG9JbnRlZ2VyKHRpbWVzKTtcbiAgICAgICAgaWYgKHRpbWVzIDwgMCB8fCB0aW1lcyA9PT0gSW5maW5pdHkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW52YWxpZCBTdHJpbmcjcmVwZWF0IHZhbHVlJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcGVhdCh0aGlzU3RyLCB0aW1lcyk7XG4gICAgICB9O1xuICAgIH0pKCksXG5cbiAgICBzdGFydHNXaXRoOiBmdW5jdGlvbiAoc2VhcmNoU3RyKSB7XG4gICAgICB2YXIgdGhpc1N0ciA9IFN0cmluZyhFUy5DaGVja09iamVjdENvZXJjaWJsZSh0aGlzKSk7XG4gICAgICBpZiAoX3RvU3RyaW5nLmNhbGwoc2VhcmNoU3RyKSA9PT0gJ1tvYmplY3QgUmVnRXhwXScpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ2Fubm90IGNhbGwgbWV0aG9kIFwic3RhcnRzV2l0aFwiIHdpdGggYSByZWdleCcpO1xuICAgICAgfVxuICAgICAgc2VhcmNoU3RyID0gU3RyaW5nKHNlYXJjaFN0cik7XG4gICAgICB2YXIgc3RhcnRBcmcgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IHZvaWQgMDtcbiAgICAgIHZhciBzdGFydCA9IE1hdGgubWF4KEVTLlRvSW50ZWdlcihzdGFydEFyZyksIDApO1xuICAgICAgcmV0dXJuIHRoaXNTdHIuc2xpY2Uoc3RhcnQsIHN0YXJ0ICsgc2VhcmNoU3RyLmxlbmd0aCkgPT09IHNlYXJjaFN0cjtcbiAgICB9LFxuXG4gICAgZW5kc1dpdGg6IGZ1bmN0aW9uIChzZWFyY2hTdHIpIHtcbiAgICAgIHZhciB0aGlzU3RyID0gU3RyaW5nKEVTLkNoZWNrT2JqZWN0Q29lcmNpYmxlKHRoaXMpKTtcbiAgICAgIGlmIChfdG9TdHJpbmcuY2FsbChzZWFyY2hTdHIpID09PSAnW29iamVjdCBSZWdFeHBdJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5ub3QgY2FsbCBtZXRob2QgXCJlbmRzV2l0aFwiIHdpdGggYSByZWdleCcpO1xuICAgICAgfVxuICAgICAgc2VhcmNoU3RyID0gU3RyaW5nKHNlYXJjaFN0cik7XG4gICAgICB2YXIgdGhpc0xlbiA9IHRoaXNTdHIubGVuZ3RoO1xuICAgICAgdmFyIHBvc0FyZyA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogdm9pZCAwO1xuICAgICAgdmFyIHBvcyA9IHR5cGVvZiBwb3NBcmcgPT09ICd1bmRlZmluZWQnID8gdGhpc0xlbiA6IEVTLlRvSW50ZWdlcihwb3NBcmcpO1xuICAgICAgdmFyIGVuZCA9IE1hdGgubWluKE1hdGgubWF4KHBvcywgMCksIHRoaXNMZW4pO1xuICAgICAgcmV0dXJuIHRoaXNTdHIuc2xpY2UoZW5kIC0gc2VhcmNoU3RyLmxlbmd0aCwgZW5kKSA9PT0gc2VhcmNoU3RyO1xuICAgIH0sXG5cbiAgICBpbmNsdWRlczogZnVuY3Rpb24gaW5jbHVkZXMoc2VhcmNoU3RyaW5nKSB7XG4gICAgICB2YXIgcG9zaXRpb24gPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IHZvaWQgMDtcbiAgICAgIC8vIFNvbWVob3cgdGhpcyB0cmljayBtYWtlcyBtZXRob2QgMTAwJSBjb21wYXQgd2l0aCB0aGUgc3BlYy5cbiAgICAgIHJldHVybiBfaW5kZXhPZi5jYWxsKHRoaXMsIHNlYXJjaFN0cmluZywgcG9zaXRpb24pICE9PSAtMTtcbiAgICB9LFxuXG4gICAgY29kZVBvaW50QXQ6IGZ1bmN0aW9uIChwb3MpIHtcbiAgICAgIHZhciB0aGlzU3RyID0gU3RyaW5nKEVTLkNoZWNrT2JqZWN0Q29lcmNpYmxlKHRoaXMpKTtcbiAgICAgIHZhciBwb3NpdGlvbiA9IEVTLlRvSW50ZWdlcihwb3MpO1xuICAgICAgdmFyIGxlbmd0aCA9IHRoaXNTdHIubGVuZ3RoO1xuICAgICAgaWYgKHBvc2l0aW9uIDwgMCB8fCBwb3NpdGlvbiA+PSBsZW5ndGgpIHsgcmV0dXJuOyB9XG4gICAgICB2YXIgZmlyc3QgPSB0aGlzU3RyLmNoYXJDb2RlQXQocG9zaXRpb24pO1xuICAgICAgdmFyIGlzRW5kID0gKHBvc2l0aW9uICsgMSA9PT0gbGVuZ3RoKTtcbiAgICAgIGlmIChmaXJzdCA8IDB4RDgwMCB8fCBmaXJzdCA+IDB4REJGRiB8fCBpc0VuZCkgeyByZXR1cm4gZmlyc3Q7IH1cbiAgICAgIHZhciBzZWNvbmQgPSB0aGlzU3RyLmNoYXJDb2RlQXQocG9zaXRpb24gKyAxKTtcbiAgICAgIGlmIChzZWNvbmQgPCAweERDMDAgfHwgc2Vjb25kID4gMHhERkZGKSB7IHJldHVybiBmaXJzdDsgfVxuICAgICAgcmV0dXJuICgoZmlyc3QgLSAweEQ4MDApICogMTAyNCkgKyAoc2Vjb25kIC0gMHhEQzAwKSArIDB4MTAwMDA7XG4gICAgfVxuICB9O1xuICBkZWZpbmVQcm9wZXJ0aWVzKFN0cmluZy5wcm90b3R5cGUsIFN0cmluZ1NoaW1zKTtcblxuICB2YXIgaGFzU3RyaW5nVHJpbUJ1ZyA9ICdcXHUwMDg1Jy50cmltKCkubGVuZ3RoICE9PSAxO1xuICBpZiAoaGFzU3RyaW5nVHJpbUJ1Zykge1xuICAgIHZhciBvcmlnaW5hbFN0cmluZ1RyaW0gPSBTdHJpbmcucHJvdG90eXBlLnRyaW07XG4gICAgZGVsZXRlIFN0cmluZy5wcm90b3R5cGUudHJpbTtcbiAgICAvLyB3aGl0ZXNwYWNlIGZyb206IGh0dHA6Ly9lczUuZ2l0aHViLmlvLyN4MTUuNS40LjIwXG4gICAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBodHRwczovL2dpdGh1Yi5jb20vZXMtc2hpbXMvZXM1LXNoaW0vYmxvYi92My40LjAvZXM1LXNoaW0uanMjTDEzMDQtTDEzMjRcbiAgICB2YXIgd3MgPSBbXG4gICAgICAnXFx4MDlcXHgwQVxceDBCXFx4MENcXHgwRFxceDIwXFx4QTBcXHUxNjgwXFx1MTgwRVxcdTIwMDBcXHUyMDAxXFx1MjAwMlxcdTIwMDMnLFxuICAgICAgJ1xcdTIwMDRcXHUyMDA1XFx1MjAwNlxcdTIwMDdcXHUyMDA4XFx1MjAwOVxcdTIwMEFcXHUyMDJGXFx1MjA1RlxcdTMwMDBcXHUyMDI4JyxcbiAgICAgICdcXHUyMDI5XFx1RkVGRidcbiAgICBdLmpvaW4oJycpO1xuICAgIHZhciB0cmltUmVnZXhwID0gbmV3IFJlZ0V4cCgnKF5bJyArIHdzICsgJ10rKXwoWycgKyB3cyArICddKyQpJywgJ2cnKTtcbiAgICBkZWZpbmVQcm9wZXJ0aWVzKFN0cmluZy5wcm90b3R5cGUsIHtcbiAgICAgIHRyaW06IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzID09PSAndW5kZWZpbmVkJyB8fCB0aGlzID09PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbid0IGNvbnZlcnQgXCIgKyB0aGlzICsgJyB0byBvYmplY3QnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gU3RyaW5nKHRoaXMpLnJlcGxhY2UodHJpbVJlZ2V4cCwgJycpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8gc2VlIGh0dHBzOi8vcGVvcGxlLm1vemlsbGEub3JnL35qb3JlbmRvcmZmL2VzNi1kcmFmdC5odG1sI3NlYy1zdHJpbmcucHJvdG90eXBlLUBAaXRlcmF0b3JcbiAgdmFyIFN0cmluZ0l0ZXJhdG9yID0gZnVuY3Rpb24gKHMpIHtcbiAgICB0aGlzLl9zID0gU3RyaW5nKEVTLkNoZWNrT2JqZWN0Q29lcmNpYmxlKHMpKTtcbiAgICB0aGlzLl9pID0gMDtcbiAgfTtcbiAgU3RyaW5nSXRlcmF0b3IucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHMgPSB0aGlzLl9zLCBpID0gdGhpcy5faTtcbiAgICBpZiAodHlwZW9mIHMgPT09ICd1bmRlZmluZWQnIHx8IGkgPj0gcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuX3MgPSB2b2lkIDA7XG4gICAgICByZXR1cm4geyB2YWx1ZTogdm9pZCAwLCBkb25lOiB0cnVlIH07XG4gICAgfVxuICAgIHZhciBmaXJzdCA9IHMuY2hhckNvZGVBdChpKSwgc2Vjb25kLCBsZW47XG4gICAgaWYgKGZpcnN0IDwgMHhEODAwIHx8IGZpcnN0ID4gMHhEQkZGIHx8IChpICsgMSkgPT0gcy5sZW5ndGgpIHtcbiAgICAgIGxlbiA9IDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlY29uZCA9IHMuY2hhckNvZGVBdChpICsgMSk7XG4gICAgICBsZW4gPSAoc2Vjb25kIDwgMHhEQzAwIHx8IHNlY29uZCA+IDB4REZGRikgPyAxIDogMjtcbiAgICB9XG4gICAgdGhpcy5faSA9IGkgKyBsZW47XG4gICAgcmV0dXJuIHsgdmFsdWU6IHMuc3Vic3RyKGksIGxlbiksIGRvbmU6IGZhbHNlIH07XG4gIH07XG4gIGFkZEl0ZXJhdG9yKFN0cmluZ0l0ZXJhdG9yLnByb3RvdHlwZSk7XG4gIGFkZEl0ZXJhdG9yKFN0cmluZy5wcm90b3R5cGUsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IFN0cmluZ0l0ZXJhdG9yKHRoaXMpO1xuICB9KTtcblxuICBpZiAoIXN0YXJ0c1dpdGhJc0NvbXBsaWFudCkge1xuICAgIC8vIEZpcmVmb3ggaGFzIGEgbm9uY29tcGxpYW50IHN0YXJ0c1dpdGggaW1wbGVtZW50YXRpb25cbiAgICBTdHJpbmcucHJvdG90eXBlLnN0YXJ0c1dpdGggPSBTdHJpbmdTaGltcy5zdGFydHNXaXRoO1xuICAgIFN0cmluZy5wcm90b3R5cGUuZW5kc1dpdGggPSBTdHJpbmdTaGltcy5lbmRzV2l0aDtcbiAgfVxuXG4gIHZhciBBcnJheVNoaW1zID0ge1xuICAgIGZyb206IGZ1bmN0aW9uIChpdGVyYWJsZSkge1xuICAgICAgdmFyIG1hcEZuID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiB2b2lkIDA7XG5cbiAgICAgIHZhciBsaXN0ID0gRVMuVG9PYmplY3QoaXRlcmFibGUsICdiYWQgaXRlcmFibGUnKTtcbiAgICAgIGlmICh0eXBlb2YgbWFwRm4gIT09ICd1bmRlZmluZWQnICYmICFFUy5Jc0NhbGxhYmxlKG1hcEZuKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcnJheS5mcm9tOiB3aGVuIHByb3ZpZGVkLCB0aGUgc2Vjb25kIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgfVxuXG4gICAgICB2YXIgaGFzVGhpc0FyZyA9IGFyZ3VtZW50cy5sZW5ndGggPiAyO1xuICAgICAgdmFyIHRoaXNBcmcgPSBoYXNUaGlzQXJnID8gYXJndW1lbnRzWzJdIDogdm9pZCAwO1xuXG4gICAgICB2YXIgdXNpbmdJdGVyYXRvciA9IEVTLklzSXRlcmFibGUobGlzdCk7XG4gICAgICAvLyBkb2VzIHRoZSBzcGVjIHJlYWxseSBtZWFuIHRoYXQgQXJyYXlzIHNob3VsZCB1c2UgQXJyYXlJdGVyYXRvcj9cbiAgICAgIC8vIGh0dHBzOi8vYnVncy5lY21hc2NyaXB0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MjQxNlxuICAgICAgLy9pZiAoQXJyYXkuaXNBcnJheShsaXN0KSkgeyB1c2luZ0l0ZXJhdG9yPWZhbHNlOyB9XG5cbiAgICAgIHZhciBsZW5ndGg7XG4gICAgICB2YXIgcmVzdWx0LCBpLCB2YWx1ZTtcbiAgICAgIGlmICh1c2luZ0l0ZXJhdG9yKSB7XG4gICAgICAgIGkgPSAwO1xuICAgICAgICByZXN1bHQgPSBFUy5Jc0NhbGxhYmxlKHRoaXMpID8gT2JqZWN0KG5ldyB0aGlzKCkpIDogW107XG4gICAgICAgIHZhciBpdCA9IHVzaW5nSXRlcmF0b3IgPyBFUy5HZXRJdGVyYXRvcihsaXN0KSA6IG51bGw7XG4gICAgICAgIHZhciBpdGVyYXRpb25WYWx1ZTtcblxuICAgICAgICBkbyB7XG4gICAgICAgICAgaXRlcmF0aW9uVmFsdWUgPSBFUy5JdGVyYXRvck5leHQoaXQpO1xuICAgICAgICAgIGlmICghaXRlcmF0aW9uVmFsdWUuZG9uZSkge1xuICAgICAgICAgICAgdmFsdWUgPSBpdGVyYXRpb25WYWx1ZS52YWx1ZTtcbiAgICAgICAgICAgIGlmIChtYXBGbikge1xuICAgICAgICAgICAgICByZXN1bHRbaV0gPSBoYXNUaGlzQXJnID8gbWFwRm4uY2FsbCh0aGlzQXJnLCB2YWx1ZSwgaSkgOiBtYXBGbih2YWx1ZSwgaSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHRbaV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gd2hpbGUgKCFpdGVyYXRpb25WYWx1ZS5kb25lKTtcbiAgICAgICAgbGVuZ3RoID0gaTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxlbmd0aCA9IEVTLlRvTGVuZ3RoKGxpc3QubGVuZ3RoKTtcbiAgICAgICAgcmVzdWx0ID0gRVMuSXNDYWxsYWJsZSh0aGlzKSA/IE9iamVjdChuZXcgdGhpcyhsZW5ndGgpKSA6IG5ldyBBcnJheShsZW5ndGgpO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICB2YWx1ZSA9IGxpc3RbaV07XG4gICAgICAgICAgaWYgKG1hcEZuKSB7XG4gICAgICAgICAgICByZXN1bHRbaV0gPSBoYXNUaGlzQXJnID8gbWFwRm4uY2FsbCh0aGlzQXJnLCB2YWx1ZSwgaSkgOiBtYXBGbih2YWx1ZSwgaSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdFtpXSA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXN1bHQubGVuZ3RoID0gbGVuZ3RoO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgb2Y6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKGFyZ3VtZW50cyk7XG4gICAgfVxuICB9O1xuICBkZWZpbmVQcm9wZXJ0aWVzKEFycmF5LCBBcnJheVNoaW1zKTtcblxuICB2YXIgYXJyYXlGcm9tU3dhbGxvd3NOZWdhdGl2ZUxlbmd0aHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKHsgbGVuZ3RoOiAtMSB9KS5sZW5ndGggPT09IDA7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfTtcbiAgLy8gRml4ZXMgYSBGaXJlZm94IGJ1ZyBpbiB2MzJcbiAgLy8gaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTA2Mzk5M1xuICBpZiAoIWFycmF5RnJvbVN3YWxsb3dzTmVnYXRpdmVMZW5ndGhzKCkpIHtcbiAgICBkZWZpbmVQcm9wZXJ0eShBcnJheSwgJ2Zyb20nLCBBcnJheVNoaW1zLmZyb20sIHRydWUpO1xuICB9XG5cbiAgLy8gT3VyIEFycmF5SXRlcmF0b3IgaXMgcHJpdmF0ZTsgc2VlXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9wYXVsbWlsbHIvZXM2LXNoaW0vaXNzdWVzLzI1MlxuICBBcnJheUl0ZXJhdG9yID0gZnVuY3Rpb24gKGFycmF5LCBraW5kKSB7XG4gICAgICB0aGlzLmkgPSAwO1xuICAgICAgdGhpcy5hcnJheSA9IGFycmF5O1xuICAgICAgdGhpcy5raW5kID0ga2luZDtcbiAgfTtcblxuICBkZWZpbmVQcm9wZXJ0aWVzKEFycmF5SXRlcmF0b3IucHJvdG90eXBlLCB7XG4gICAgbmV4dDogZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGkgPSB0aGlzLmksIGFycmF5ID0gdGhpcy5hcnJheTtcbiAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBBcnJheUl0ZXJhdG9yKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdOb3QgYW4gQXJyYXlJdGVyYXRvcicpO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBhcnJheSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdmFyIGxlbiA9IEVTLlRvTGVuZ3RoKGFycmF5Lmxlbmd0aCk7XG4gICAgICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICB2YXIga2luZCA9IHRoaXMua2luZDtcbiAgICAgICAgICB2YXIgcmV0dmFsO1xuICAgICAgICAgIGlmIChraW5kID09PSAna2V5Jykge1xuICAgICAgICAgICAgcmV0dmFsID0gaTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGtpbmQgPT09ICd2YWx1ZScpIHtcbiAgICAgICAgICAgIHJldHZhbCA9IGFycmF5W2ldO1xuICAgICAgICAgIH0gZWxzZSBpZiAoa2luZCA9PT0gJ2VudHJ5Jykge1xuICAgICAgICAgICAgcmV0dmFsID0gW2ksIGFycmF5W2ldXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5pID0gaSArIDE7XG4gICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IHJldHZhbCwgZG9uZTogZmFsc2UgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy5hcnJheSA9IHZvaWQgMDtcbiAgICAgIHJldHVybiB7IHZhbHVlOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcbiAgICB9XG4gIH0pO1xuICBhZGRJdGVyYXRvcihBcnJheUl0ZXJhdG9yLnByb3RvdHlwZSk7XG5cbiAgdmFyIEFycmF5UHJvdG90eXBlU2hpbXMgPSB7XG4gICAgY29weVdpdGhpbjogZnVuY3Rpb24gKHRhcmdldCwgc3RhcnQpIHtcbiAgICAgIHZhciBlbmQgPSBhcmd1bWVudHNbMl07IC8vIGNvcHlXaXRoaW4ubGVuZ3RoIG11c3QgYmUgMlxuICAgICAgdmFyIG8gPSBFUy5Ub09iamVjdCh0aGlzKTtcbiAgICAgIHZhciBsZW4gPSBFUy5Ub0xlbmd0aChvLmxlbmd0aCk7XG4gICAgICB0YXJnZXQgPSBFUy5Ub0ludGVnZXIodGFyZ2V0KTtcbiAgICAgIHN0YXJ0ID0gRVMuVG9JbnRlZ2VyKHN0YXJ0KTtcbiAgICAgIHZhciB0byA9IHRhcmdldCA8IDAgPyBNYXRoLm1heChsZW4gKyB0YXJnZXQsIDApIDogTWF0aC5taW4odGFyZ2V0LCBsZW4pO1xuICAgICAgdmFyIGZyb20gPSBzdGFydCA8IDAgPyBNYXRoLm1heChsZW4gKyBzdGFydCwgMCkgOiBNYXRoLm1pbihzdGFydCwgbGVuKTtcbiAgICAgIGVuZCA9IHR5cGVvZiBlbmQgPT09ICd1bmRlZmluZWQnID8gbGVuIDogRVMuVG9JbnRlZ2VyKGVuZCk7XG4gICAgICB2YXIgZmluID0gZW5kIDwgMCA/IE1hdGgubWF4KGxlbiArIGVuZCwgMCkgOiBNYXRoLm1pbihlbmQsIGxlbik7XG4gICAgICB2YXIgY291bnQgPSBNYXRoLm1pbihmaW4gLSBmcm9tLCBsZW4gLSB0byk7XG4gICAgICB2YXIgZGlyZWN0aW9uID0gMTtcbiAgICAgIGlmIChmcm9tIDwgdG8gJiYgdG8gPCAoZnJvbSArIGNvdW50KSkge1xuICAgICAgICBkaXJlY3Rpb24gPSAtMTtcbiAgICAgICAgZnJvbSArPSBjb3VudCAtIDE7XG4gICAgICAgIHRvICs9IGNvdW50IC0gMTtcbiAgICAgIH1cbiAgICAgIHdoaWxlIChjb3VudCA+IDApIHtcbiAgICAgICAgaWYgKF9oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIGZyb20pKSB7XG4gICAgICAgICAgb1t0b10gPSBvW2Zyb21dO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSBvW2Zyb21dO1xuICAgICAgICB9XG4gICAgICAgIGZyb20gKz0gZGlyZWN0aW9uO1xuICAgICAgICB0byArPSBkaXJlY3Rpb247XG4gICAgICAgIGNvdW50IC09IDE7XG4gICAgICB9XG4gICAgICByZXR1cm4gbztcbiAgICB9LFxuXG4gICAgZmlsbDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB2YXIgc3RhcnQgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IHZvaWQgMDtcbiAgICAgIHZhciBlbmQgPSBhcmd1bWVudHMubGVuZ3RoID4gMiA/IGFyZ3VtZW50c1syXSA6IHZvaWQgMDtcbiAgICAgIHZhciBPID0gRVMuVG9PYmplY3QodGhpcyk7XG4gICAgICB2YXIgbGVuID0gRVMuVG9MZW5ndGgoTy5sZW5ndGgpO1xuICAgICAgc3RhcnQgPSBFUy5Ub0ludGVnZXIodHlwZW9mIHN0YXJ0ID09PSAndW5kZWZpbmVkJyA/IDAgOiBzdGFydCk7XG4gICAgICBlbmQgPSBFUy5Ub0ludGVnZXIodHlwZW9mIGVuZCA9PT0gJ3VuZGVmaW5lZCcgPyBsZW4gOiBlbmQpO1xuXG4gICAgICB2YXIgcmVsYXRpdmVTdGFydCA9IHN0YXJ0IDwgMCA/IE1hdGgubWF4KGxlbiArIHN0YXJ0LCAwKSA6IE1hdGgubWluKHN0YXJ0LCBsZW4pO1xuICAgICAgdmFyIHJlbGF0aXZlRW5kID0gZW5kIDwgMCA/IGxlbiArIGVuZCA6IGVuZDtcblxuICAgICAgZm9yICh2YXIgaSA9IHJlbGF0aXZlU3RhcnQ7IGkgPCBsZW4gJiYgaSA8IHJlbGF0aXZlRW5kOyArK2kpIHtcbiAgICAgICAgT1tpXSA9IHZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIE87XG4gICAgfSxcblxuICAgIGZpbmQ6IGZ1bmN0aW9uIGZpbmQocHJlZGljYXRlKSB7XG4gICAgICB2YXIgbGlzdCA9IEVTLlRvT2JqZWN0KHRoaXMpO1xuICAgICAgdmFyIGxlbmd0aCA9IEVTLlRvTGVuZ3RoKGxpc3QubGVuZ3RoKTtcbiAgICAgIGlmICghRVMuSXNDYWxsYWJsZShwcmVkaWNhdGUpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FycmF5I2ZpbmQ6IHByZWRpY2F0ZSBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgIH1cbiAgICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiBudWxsO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIHZhbHVlOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFsdWUgPSBsaXN0W2ldO1xuICAgICAgICBpZiAodGhpc0FyZykge1xuICAgICAgICAgIGlmIChwcmVkaWNhdGUuY2FsbCh0aGlzQXJnLCB2YWx1ZSwgaSwgbGlzdCkpIHsgcmV0dXJuIHZhbHVlOyB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHByZWRpY2F0ZSh2YWx1ZSwgaSwgbGlzdCkpIHsgcmV0dXJuIHZhbHVlOyB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9LFxuXG4gICAgZmluZEluZGV4OiBmdW5jdGlvbiBmaW5kSW5kZXgocHJlZGljYXRlKSB7XG4gICAgICB2YXIgbGlzdCA9IEVTLlRvT2JqZWN0KHRoaXMpO1xuICAgICAgdmFyIGxlbmd0aCA9IEVTLlRvTGVuZ3RoKGxpc3QubGVuZ3RoKTtcbiAgICAgIGlmICghRVMuSXNDYWxsYWJsZShwcmVkaWNhdGUpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FycmF5I2ZpbmRJbmRleDogcHJlZGljYXRlIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgfVxuICAgICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IG51bGw7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh0aGlzQXJnKSB7XG4gICAgICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKHRoaXNBcmcsIGxpc3RbaV0sIGksIGxpc3QpKSB7IHJldHVybiBpOyB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHByZWRpY2F0ZShsaXN0W2ldLCBpLCBsaXN0KSkgeyByZXR1cm4gaTsgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gLTE7XG4gICAgfSxcblxuICAgIGtleXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuZXcgQXJyYXlJdGVyYXRvcih0aGlzLCAna2V5Jyk7XG4gICAgfSxcblxuICAgIHZhbHVlczogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5ldyBBcnJheUl0ZXJhdG9yKHRoaXMsICd2YWx1ZScpO1xuICAgIH0sXG5cbiAgICBlbnRyaWVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmV3IEFycmF5SXRlcmF0b3IodGhpcywgJ2VudHJ5Jyk7XG4gICAgfVxuICB9O1xuICAvLyBTYWZhcmkgNy4xIGRlZmluZXMgQXJyYXkja2V5cyBhbmQgQXJyYXkjZW50cmllcyBuYXRpdmVseSxcbiAgLy8gYnV0IHRoZSByZXN1bHRpbmcgQXJyYXlJdGVyYXRvciBvYmplY3RzIGRvbid0IGhhdmUgYSBcIm5leHRcIiBtZXRob2QuXG4gIGlmIChBcnJheS5wcm90b3R5cGUua2V5cyAmJiAhRVMuSXNDYWxsYWJsZShbMV0ua2V5cygpLm5leHQpKSB7XG4gICAgZGVsZXRlIEFycmF5LnByb3RvdHlwZS5rZXlzO1xuICB9XG4gIGlmIChBcnJheS5wcm90b3R5cGUuZW50cmllcyAmJiAhRVMuSXNDYWxsYWJsZShbMV0uZW50cmllcygpLm5leHQpKSB7XG4gICAgZGVsZXRlIEFycmF5LnByb3RvdHlwZS5lbnRyaWVzO1xuICB9XG5cbiAgLy8gQ2hyb21lIDM4IGRlZmluZXMgQXJyYXkja2V5cyBhbmQgQXJyYXkjZW50cmllcywgYW5kIEFycmF5I0BAaXRlcmF0b3IsIGJ1dCBub3QgQXJyYXkjdmFsdWVzXG4gIGlmIChBcnJheS5wcm90b3R5cGUua2V5cyAmJiBBcnJheS5wcm90b3R5cGUuZW50cmllcyAmJiAhQXJyYXkucHJvdG90eXBlLnZhbHVlcyAmJiBBcnJheS5wcm90b3R5cGVbJGl0ZXJhdG9yJF0pIHtcbiAgICBkZWZpbmVQcm9wZXJ0aWVzKEFycmF5LnByb3RvdHlwZSwge1xuICAgICAgdmFsdWVzOiBBcnJheS5wcm90b3R5cGVbJGl0ZXJhdG9yJF1cbiAgICB9KTtcbiAgfVxuICBkZWZpbmVQcm9wZXJ0aWVzKEFycmF5LnByb3RvdHlwZSwgQXJyYXlQcm90b3R5cGVTaGltcyk7XG5cbiAgYWRkSXRlcmF0b3IoQXJyYXkucHJvdG90eXBlLCBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLnZhbHVlcygpOyB9KTtcbiAgLy8gQ2hyb21lIGRlZmluZXMga2V5cy92YWx1ZXMvZW50cmllcyBvbiBBcnJheSwgYnV0IGRvZXNuJ3QgZ2l2ZSB1c1xuICAvLyBhbnkgd2F5IHRvIGlkZW50aWZ5IGl0cyBpdGVyYXRvci4gIFNvIGFkZCBvdXIgb3duIHNoaW1tZWQgZmllbGQuXG4gIGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YpIHtcbiAgICBhZGRJdGVyYXRvcihPYmplY3QuZ2V0UHJvdG90eXBlT2YoW10udmFsdWVzKCkpKTtcbiAgfVxuXG4gIHZhciBtYXhTYWZlSW50ZWdlciA9IE1hdGgucG93KDIsIDUzKSAtIDE7XG4gIGRlZmluZVByb3BlcnRpZXMoTnVtYmVyLCB7XG4gICAgTUFYX1NBRkVfSU5URUdFUjogbWF4U2FmZUludGVnZXIsXG4gICAgTUlOX1NBRkVfSU5URUdFUjogLW1heFNhZmVJbnRlZ2VyLFxuICAgIEVQU0lMT046IDIuMjIwNDQ2MDQ5MjUwMzEzZS0xNixcblxuICAgIHBhcnNlSW50OiBnbG9iYWxzLnBhcnNlSW50LFxuICAgIHBhcnNlRmxvYXQ6IGdsb2JhbHMucGFyc2VGbG9hdCxcblxuICAgIGlzRmluaXRlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmIGdsb2JhbF9pc0Zpbml0ZSh2YWx1ZSk7XG4gICAgfSxcblxuICAgIGlzSW50ZWdlcjogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKHZhbHVlKSAmJlxuICAgICAgICBFUy5Ub0ludGVnZXIodmFsdWUpID09PSB2YWx1ZTtcbiAgICB9LFxuXG4gICAgaXNTYWZlSW50ZWdlcjogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICByZXR1cm4gTnVtYmVyLmlzSW50ZWdlcih2YWx1ZSkgJiYgTWF0aC5hYnModmFsdWUpIDw9IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xuICAgIH0sXG5cbiAgICBpc05hTjogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAvLyBOYU4gIT09IE5hTiwgYnV0IHRoZXkgYXJlIGlkZW50aWNhbC5cbiAgICAgIC8vIE5hTnMgYXJlIHRoZSBvbmx5IG5vbi1yZWZsZXhpdmUgdmFsdWUsIGkuZS4sIGlmIHggIT09IHgsXG4gICAgICAvLyB0aGVuIHggaXMgTmFOLlxuICAgICAgLy8gaXNOYU4gaXMgYnJva2VuOiBpdCBjb252ZXJ0cyBpdHMgYXJndW1lbnQgdG8gbnVtYmVyLCBzb1xuICAgICAgLy8gaXNOYU4oJ2ZvbycpID0+IHRydWVcbiAgICAgIHJldHVybiB2YWx1ZSAhPT0gdmFsdWU7XG4gICAgfVxuXG4gIH0pO1xuXG4gIC8vIFdvcmsgYXJvdW5kIGJ1Z3MgaW4gQXJyYXkjZmluZCBhbmQgQXJyYXkjZmluZEluZGV4IC0tIGVhcmx5XG4gIC8vIGltcGxlbWVudGF0aW9ucyBza2lwcGVkIGhvbGVzIGluIHNwYXJzZSBhcnJheXMuIChOb3RlIHRoYXQgdGhlXG4gIC8vIGltcGxlbWVudGF0aW9ucyBvZiBmaW5kL2ZpbmRJbmRleCBpbmRpcmVjdGx5IHVzZSBzaGltbWVkXG4gIC8vIG1ldGhvZHMgb2YgTnVtYmVyLCBzbyB0aGlzIHRlc3QgaGFzIHRvIGhhcHBlbiBkb3duIGhlcmUuKVxuICBpZiAoIVssIDFdLmZpbmQoZnVuY3Rpb24gKGl0ZW0sIGlkeCkgeyByZXR1cm4gaWR4ID09PSAwOyB9KSkge1xuICAgIGRlZmluZVByb3BlcnR5KEFycmF5LnByb3RvdHlwZSwgJ2ZpbmQnLCBBcnJheVByb3RvdHlwZVNoaW1zLmZpbmQsIHRydWUpO1xuICB9XG4gIGlmIChbLCAxXS5maW5kSW5kZXgoZnVuY3Rpb24gKGl0ZW0sIGlkeCkgeyByZXR1cm4gaWR4ID09PSAwOyB9KSAhPT0gMCkge1xuICAgIGRlZmluZVByb3BlcnR5KEFycmF5LnByb3RvdHlwZSwgJ2ZpbmRJbmRleCcsIEFycmF5UHJvdG90eXBlU2hpbXMuZmluZEluZGV4LCB0cnVlKTtcbiAgfVxuXG4gIGlmIChzdXBwb3J0c0Rlc2NyaXB0b3JzKSB7XG4gICAgZGVmaW5lUHJvcGVydGllcyhPYmplY3QsIHtcbiAgICAgIGdldFByb3BlcnR5RGVzY3JpcHRvcjogZnVuY3Rpb24gKHN1YmplY3QsIG5hbWUpIHtcbiAgICAgICAgdmFyIHBkID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihzdWJqZWN0LCBuYW1lKTtcbiAgICAgICAgdmFyIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHN1YmplY3QpO1xuICAgICAgICB3aGlsZSAodHlwZW9mIHBkID09PSAndW5kZWZpbmVkJyAmJiBwcm90byAhPT0gbnVsbCkge1xuICAgICAgICAgIHBkID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihwcm90bywgbmFtZSk7XG4gICAgICAgICAgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocHJvdG8pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwZDtcbiAgICAgIH0sXG5cbiAgICAgIGdldFByb3BlcnR5TmFtZXM6IGZ1bmN0aW9uIChzdWJqZWN0KSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhzdWJqZWN0KTtcbiAgICAgICAgdmFyIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHN1YmplY3QpO1xuXG4gICAgICAgIHZhciBhZGRQcm9wZXJ0eSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgIGlmIChyZXN1bHQuaW5kZXhPZihwcm9wZXJ0eSkgPT09IC0xKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaChwcm9wZXJ0eSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHdoaWxlIChwcm90byAhPT0gbnVsbCkge1xuICAgICAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHByb3RvKS5mb3JFYWNoKGFkZFByb3BlcnR5KTtcbiAgICAgICAgICBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihwcm90byk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGRlZmluZVByb3BlcnRpZXMoT2JqZWN0LCB7XG4gICAgICAvLyAxOS4xLjMuMVxuICAgICAgYXNzaWduOiBmdW5jdGlvbiAodGFyZ2V0LCBzb3VyY2UpIHtcbiAgICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QodGFyZ2V0KSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3RhcmdldCBtdXN0IGJlIGFuIG9iamVjdCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUucmVkdWNlLmNhbGwoYXJndW1lbnRzLCBmdW5jdGlvbiAodGFyZ2V0LCBzb3VyY2UpIHtcbiAgICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoT2JqZWN0KHNvdXJjZSkpLnJlZHVjZShmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHtcbiAgICAgICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV07XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgICAgICAgIH0sIHRhcmdldCk7XG4gICAgICAgIH0pO1xuICAgICAgfSxcblxuICAgICAgaXM6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHJldHVybiBFUy5TYW1lVmFsdWUoYSwgYik7XG4gICAgICB9LFxuXG4gICAgICAvLyAxOS4xLjMuOVxuICAgICAgLy8gc2hpbSBmcm9tIGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL1dlYlJlZmxlY3Rpb24vNTU5MzU1NFxuICAgICAgc2V0UHJvdG90eXBlT2Y6IChmdW5jdGlvbiAoT2JqZWN0LCBtYWdpYykge1xuICAgICAgICB2YXIgc2V0O1xuXG4gICAgICAgIHZhciBjaGVja0FyZ3MgPSBmdW5jdGlvbiAoTywgcHJvdG8pIHtcbiAgICAgICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChPKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignY2Fubm90IHNldCBwcm90b3R5cGUgb24gYSBub24tb2JqZWN0Jyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghKHByb3RvID09PSBudWxsIHx8IEVTLlR5cGVJc09iamVjdChwcm90bykpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdjYW4gb25seSBzZXQgcHJvdG90eXBlIHRvIGFuIG9iamVjdCBvciBudWxsJyArIHByb3RvKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHNldFByb3RvdHlwZU9mID0gZnVuY3Rpb24gKE8sIHByb3RvKSB7XG4gICAgICAgICAgY2hlY2tBcmdzKE8sIHByb3RvKTtcbiAgICAgICAgICBzZXQuY2FsbChPLCBwcm90byk7XG4gICAgICAgICAgcmV0dXJuIE87XG4gICAgICAgIH07XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyB0aGlzIHdvcmtzIGFscmVhZHkgaW4gRmlyZWZveCBhbmQgU2FmYXJpXG4gICAgICAgICAgc2V0ID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihPYmplY3QucHJvdG90eXBlLCBtYWdpYykuc2V0O1xuICAgICAgICAgIHNldC5jYWxsKHt9LCBudWxsKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlICE9PSB7fVttYWdpY10pIHtcbiAgICAgICAgICAgIC8vIElFIDwgMTEgY2Fubm90IGJlIHNoaW1tZWRcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gcHJvYmFibHkgQ2hyb21lIG9yIHNvbWUgb2xkIE1vYmlsZSBzdG9jayBicm93c2VyXG4gICAgICAgICAgc2V0ID0gZnVuY3Rpb24gKHByb3RvKSB7XG4gICAgICAgICAgICB0aGlzW21hZ2ljXSA9IHByb3RvO1xuICAgICAgICAgIH07XG4gICAgICAgICAgLy8gcGxlYXNlIG5vdGUgdGhhdCB0aGlzIHdpbGwgKipub3QqKiB3b3JrXG4gICAgICAgICAgLy8gaW4gdGhvc2UgYnJvd3NlcnMgdGhhdCBkbyBub3QgaW5oZXJpdFxuICAgICAgICAgIC8vIF9fcHJvdG9fXyBieSBtaXN0YWtlIGZyb20gT2JqZWN0LnByb3RvdHlwZVxuICAgICAgICAgIC8vIGluIHRoZXNlIGNhc2VzIHdlIHNob3VsZCBwcm9iYWJseSB0aHJvdyBhbiBlcnJvclxuICAgICAgICAgIC8vIG9yIGF0IGxlYXN0IGJlIGluZm9ybWVkIGFib3V0IHRoZSBpc3N1ZVxuICAgICAgICAgIHNldFByb3RvdHlwZU9mLnBvbHlmaWxsID0gc2V0UHJvdG90eXBlT2YoXG4gICAgICAgICAgICBzZXRQcm90b3R5cGVPZih7fSwgbnVsbCksXG4gICAgICAgICAgICBPYmplY3QucHJvdG90eXBlXG4gICAgICAgICAgKSBpbnN0YW5jZW9mIE9iamVjdDtcbiAgICAgICAgICAvLyBzZXRQcm90b3R5cGVPZi5wb2x5ZmlsbCA9PT0gdHJ1ZSBtZWFucyBpdCB3b3JrcyBhcyBtZWFudFxuICAgICAgICAgIC8vIHNldFByb3RvdHlwZU9mLnBvbHlmaWxsID09PSBmYWxzZSBtZWFucyBpdCdzIG5vdCAxMDAlIHJlbGlhYmxlXG4gICAgICAgICAgLy8gc2V0UHJvdG90eXBlT2YucG9seWZpbGwgPT09IHVuZGVmaW5lZFxuICAgICAgICAgIC8vIG9yXG4gICAgICAgICAgLy8gc2V0UHJvdG90eXBlT2YucG9seWZpbGwgPT0gIG51bGwgbWVhbnMgaXQncyBub3QgYSBwb2x5ZmlsbFxuICAgICAgICAgIC8vIHdoaWNoIG1lYW5zIGl0IHdvcmtzIGFzIGV4cGVjdGVkXG4gICAgICAgICAgLy8gd2UgY2FuIGV2ZW4gZGVsZXRlIE9iamVjdC5wcm90b3R5cGUuX19wcm90b19fO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZXRQcm90b3R5cGVPZjtcbiAgICAgIH0pKE9iamVjdCwgJ19fcHJvdG9fXycpXG4gICAgfSk7XG4gIH1cblxuICAvLyBXb3JrYXJvdW5kIGJ1ZyBpbiBPcGVyYSAxMiB3aGVyZSBzZXRQcm90b3R5cGVPZih4LCBudWxsKSBkb2Vzbid0IHdvcmssXG4gIC8vIGJ1dCBPYmplY3QuY3JlYXRlKG51bGwpIGRvZXMuXG4gIGlmIChPYmplY3Quc2V0UHJvdG90eXBlT2YgJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mICYmXG4gICAgICBPYmplY3QuZ2V0UHJvdG90eXBlT2YoT2JqZWN0LnNldFByb3RvdHlwZU9mKHt9LCBudWxsKSkgIT09IG51bGwgJiZcbiAgICAgIE9iamVjdC5nZXRQcm90b3R5cGVPZihPYmplY3QuY3JlYXRlKG51bGwpKSA9PT0gbnVsbCkge1xuICAgIChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgRkFLRU5VTEwgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgdmFyIGdwbyA9IE9iamVjdC5nZXRQcm90b3R5cGVPZiwgc3BvID0gT2JqZWN0LnNldFByb3RvdHlwZU9mO1xuICAgICAgT2JqZWN0LmdldFByb3RvdHlwZU9mID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IGdwbyhvKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdCA9PT0gRkFLRU5VTEwgPyBudWxsIDogcmVzdWx0O1xuICAgICAgfTtcbiAgICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZiA9IGZ1bmN0aW9uIChvLCBwKSB7XG4gICAgICAgIGlmIChwID09PSBudWxsKSB7IHAgPSBGQUtFTlVMTDsgfVxuICAgICAgICByZXR1cm4gc3BvKG8sIHApO1xuICAgICAgfTtcbiAgICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZi5wb2x5ZmlsbCA9IGZhbHNlO1xuICAgIH0pKCk7XG4gIH1cblxuICB0cnkge1xuICAgIE9iamVjdC5rZXlzKCdmb28nKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHZhciBvcmlnaW5hbE9iamVjdEtleXMgPSBPYmplY3Qua2V5cztcbiAgICBPYmplY3Qua2V5cyA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgIHJldHVybiBvcmlnaW5hbE9iamVjdEtleXMoRVMuVG9PYmplY3Qob2JqKSk7XG4gICAgfTtcbiAgfVxuXG4gIHZhciBNYXRoU2hpbXMgPSB7XG4gICAgYWNvc2g6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgdmFsdWUgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKE51bWJlci5pc05hTih2YWx1ZSkgfHwgdmFsdWUgPCAxKSB7IHJldHVybiBOYU47IH1cbiAgICAgIGlmICh2YWx1ZSA9PT0gMSkgeyByZXR1cm4gMDsgfVxuICAgICAgaWYgKHZhbHVlID09PSBJbmZpbml0eSkgeyByZXR1cm4gdmFsdWU7IH1cbiAgICAgIHJldHVybiBNYXRoLmxvZyh2YWx1ZSArIE1hdGguc3FydCh2YWx1ZSAqIHZhbHVlIC0gMSkpO1xuICAgIH0sXG5cbiAgICBhc2luaDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB2YWx1ZSA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAodmFsdWUgPT09IDAgfHwgIWdsb2JhbF9pc0Zpbml0ZSh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlIDwgMCA/IC1NYXRoLmFzaW5oKC12YWx1ZSkgOiBNYXRoLmxvZyh2YWx1ZSArIE1hdGguc3FydCh2YWx1ZSAqIHZhbHVlICsgMSkpO1xuICAgIH0sXG5cbiAgICBhdGFuaDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB2YWx1ZSA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAoTnVtYmVyLmlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA8IC0xIHx8IHZhbHVlID4gMSkge1xuICAgICAgICByZXR1cm4gTmFOO1xuICAgICAgfVxuICAgICAgaWYgKHZhbHVlID09PSAtMSkgeyByZXR1cm4gLUluZmluaXR5OyB9XG4gICAgICBpZiAodmFsdWUgPT09IDEpIHsgcmV0dXJuIEluZmluaXR5OyB9XG4gICAgICBpZiAodmFsdWUgPT09IDApIHsgcmV0dXJuIHZhbHVlOyB9XG4gICAgICByZXR1cm4gMC41ICogTWF0aC5sb2coKDEgKyB2YWx1ZSkgLyAoMSAtIHZhbHVlKSk7XG4gICAgfSxcblxuICAgIGNicnQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgdmFsdWUgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKHZhbHVlID09PSAwKSB7IHJldHVybiB2YWx1ZTsgfVxuICAgICAgdmFyIG5lZ2F0ZSA9IHZhbHVlIDwgMCwgcmVzdWx0O1xuICAgICAgaWYgKG5lZ2F0ZSkgeyB2YWx1ZSA9IC12YWx1ZTsgfVxuICAgICAgcmVzdWx0ID0gTWF0aC5wb3codmFsdWUsIDEgLyAzKTtcbiAgICAgIHJldHVybiBuZWdhdGUgPyAtcmVzdWx0IDogcmVzdWx0O1xuICAgIH0sXG5cbiAgICBjbHozMjogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAvLyBTZWUgaHR0cHM6Ly9idWdzLmVjbWFzY3JpcHQub3JnL3Nob3dfYnVnLmNnaT9pZD0yNDY1XG4gICAgICB2YWx1ZSA9IE51bWJlcih2YWx1ZSk7XG4gICAgICB2YXIgbnVtYmVyID0gRVMuVG9VaW50MzIodmFsdWUpO1xuICAgICAgaWYgKG51bWJlciA9PT0gMCkge1xuICAgICAgICByZXR1cm4gMzI7XG4gICAgICB9XG4gICAgICByZXR1cm4gMzIgLSAobnVtYmVyKS50b1N0cmluZygyKS5sZW5ndGg7XG4gICAgfSxcblxuICAgIGNvc2g6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgdmFsdWUgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKHZhbHVlID09PSAwKSB7IHJldHVybiAxOyB9IC8vICswIG9yIC0wXG4gICAgICBpZiAoTnVtYmVyLmlzTmFOKHZhbHVlKSkgeyByZXR1cm4gTmFOOyB9XG4gICAgICBpZiAoIWdsb2JhbF9pc0Zpbml0ZSh2YWx1ZSkpIHsgcmV0dXJuIEluZmluaXR5OyB9XG4gICAgICBpZiAodmFsdWUgPCAwKSB7IHZhbHVlID0gLXZhbHVlOyB9XG4gICAgICBpZiAodmFsdWUgPiAyMSkgeyByZXR1cm4gTWF0aC5leHAodmFsdWUpIC8gMjsgfVxuICAgICAgcmV0dXJuIChNYXRoLmV4cCh2YWx1ZSkgKyBNYXRoLmV4cCgtdmFsdWUpKSAvIDI7XG4gICAgfSxcblxuICAgIGV4cG0xOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhbHVlID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmICh2YWx1ZSA9PT0gLUluZmluaXR5KSB7IHJldHVybiAtMTsgfVxuICAgICAgaWYgKCFnbG9iYWxfaXNGaW5pdGUodmFsdWUpIHx8IHZhbHVlID09PSAwKSB7IHJldHVybiB2YWx1ZTsgfVxuICAgICAgcmV0dXJuIE1hdGguZXhwKHZhbHVlKSAtIDE7XG4gICAgfSxcblxuICAgIGh5cG90OiBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgdmFyIGFueU5hTiA9IGZhbHNlO1xuICAgICAgdmFyIGFsbFplcm8gPSB0cnVlO1xuICAgICAgdmFyIGFueUluZmluaXR5ID0gZmFsc2U7XG4gICAgICB2YXIgbnVtYmVycyA9IFtdO1xuICAgICAgQXJyYXkucHJvdG90eXBlLmV2ZXJ5LmNhbGwoYXJndW1lbnRzLCBmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgIHZhciBudW0gPSBOdW1iZXIoYXJnKTtcbiAgICAgICAgaWYgKE51bWJlci5pc05hTihudW0pKSB7XG4gICAgICAgICAgYW55TmFOID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChudW0gPT09IEluZmluaXR5IHx8IG51bSA9PT0gLUluZmluaXR5KSB7XG4gICAgICAgICAgYW55SW5maW5pdHkgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKG51bSAhPT0gMCkge1xuICAgICAgICAgIGFsbFplcm8gPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYW55SW5maW5pdHkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAoIWFueU5hTikge1xuICAgICAgICAgIG51bWJlcnMucHVzaChNYXRoLmFicyhudW0pKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pO1xuICAgICAgaWYgKGFueUluZmluaXR5KSB7IHJldHVybiBJbmZpbml0eTsgfVxuICAgICAgaWYgKGFueU5hTikgeyByZXR1cm4gTmFOOyB9XG4gICAgICBpZiAoYWxsWmVybykgeyByZXR1cm4gMDsgfVxuXG4gICAgICBudW1iZXJzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGIgLSBhOyB9KTtcbiAgICAgIHZhciBsYXJnZXN0ID0gbnVtYmVyc1swXTtcbiAgICAgIHZhciBkaXZpZGVkID0gbnVtYmVycy5tYXAoZnVuY3Rpb24gKG51bWJlcikgeyByZXR1cm4gbnVtYmVyIC8gbGFyZ2VzdDsgfSk7XG4gICAgICB2YXIgc3VtID0gZGl2aWRlZC5yZWR1Y2UoZnVuY3Rpb24gKHN1bSwgbnVtYmVyKSB7IHJldHVybiBzdW0gKz0gbnVtYmVyICogbnVtYmVyOyB9LCAwKTtcbiAgICAgIHJldHVybiBsYXJnZXN0ICogTWF0aC5zcXJ0KHN1bSk7XG4gICAgfSxcblxuICAgIGxvZzI6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIE1hdGgubG9nKHZhbHVlKSAqIE1hdGguTE9HMkU7XG4gICAgfSxcblxuICAgIGxvZzEwOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHJldHVybiBNYXRoLmxvZyh2YWx1ZSkgKiBNYXRoLkxPRzEwRTtcbiAgICB9LFxuXG4gICAgbG9nMXA6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgdmFsdWUgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKHZhbHVlIDwgLTEgfHwgTnVtYmVyLmlzTmFOKHZhbHVlKSkgeyByZXR1cm4gTmFOOyB9XG4gICAgICBpZiAodmFsdWUgPT09IDAgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7IHJldHVybiB2YWx1ZTsgfVxuICAgICAgaWYgKHZhbHVlID09PSAtMSkgeyByZXR1cm4gLUluZmluaXR5OyB9XG4gICAgICB2YXIgcmVzdWx0ID0gMDtcbiAgICAgIHZhciBuID0gNTA7XG5cbiAgICAgIGlmICh2YWx1ZSA8IDAgfHwgdmFsdWUgPiAxKSB7IHJldHVybiBNYXRoLmxvZygxICsgdmFsdWUpOyB9XG4gICAgICBmb3IgKHZhciBpID0gMTsgaSA8IG47IGkrKykge1xuICAgICAgICBpZiAoKGkgJSAyKSA9PT0gMCkge1xuICAgICAgICAgIHJlc3VsdCAtPSBNYXRoLnBvdyh2YWx1ZSwgaSkgLyBpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdCArPSBNYXRoLnBvdyh2YWx1ZSwgaSkgLyBpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIHNpZ246IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgdmFyIG51bWJlciA9ICt2YWx1ZTtcbiAgICAgIGlmIChudW1iZXIgPT09IDApIHsgcmV0dXJuIG51bWJlcjsgfVxuICAgICAgaWYgKE51bWJlci5pc05hTihudW1iZXIpKSB7IHJldHVybiBudW1iZXI7IH1cbiAgICAgIHJldHVybiBudW1iZXIgPCAwID8gLTEgOiAxO1xuICAgIH0sXG5cbiAgICBzaW5oOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhbHVlID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmICghZ2xvYmFsX2lzRmluaXRlKHZhbHVlKSB8fCB2YWx1ZSA9PT0gMCkgeyByZXR1cm4gdmFsdWU7IH1cbiAgICAgIHJldHVybiAoTWF0aC5leHAodmFsdWUpIC0gTWF0aC5leHAoLXZhbHVlKSkgLyAyO1xuICAgIH0sXG5cbiAgICB0YW5oOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhbHVlID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmIChOdW1iZXIuaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSAwKSB7IHJldHVybiB2YWx1ZTsgfVxuICAgICAgaWYgKHZhbHVlID09PSBJbmZpbml0eSkgeyByZXR1cm4gMTsgfVxuICAgICAgaWYgKHZhbHVlID09PSAtSW5maW5pdHkpIHsgcmV0dXJuIC0xOyB9XG4gICAgICByZXR1cm4gKE1hdGguZXhwKHZhbHVlKSAtIE1hdGguZXhwKC12YWx1ZSkpIC8gKE1hdGguZXhwKHZhbHVlKSArIE1hdGguZXhwKC12YWx1ZSkpO1xuICAgIH0sXG5cbiAgICB0cnVuYzogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB2YXIgbnVtYmVyID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIHJldHVybiBudW1iZXIgPCAwID8gLU1hdGguZmxvb3IoLW51bWJlcikgOiBNYXRoLmZsb29yKG51bWJlcik7XG4gICAgfSxcblxuICAgIGltdWw6IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICAvLyB0YWtlbiBmcm9tIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL01hdGgvaW11bFxuICAgICAgeCA9IEVTLlRvVWludDMyKHgpO1xuICAgICAgeSA9IEVTLlRvVWludDMyKHkpO1xuICAgICAgdmFyIGFoICA9ICh4ID4+PiAxNikgJiAweGZmZmY7XG4gICAgICB2YXIgYWwgPSB4ICYgMHhmZmZmO1xuICAgICAgdmFyIGJoICA9ICh5ID4+PiAxNikgJiAweGZmZmY7XG4gICAgICB2YXIgYmwgPSB5ICYgMHhmZmZmO1xuICAgICAgLy8gdGhlIHNoaWZ0IGJ5IDAgZml4ZXMgdGhlIHNpZ24gb24gdGhlIGhpZ2ggcGFydFxuICAgICAgLy8gdGhlIGZpbmFsIHwwIGNvbnZlcnRzIHRoZSB1bnNpZ25lZCB2YWx1ZSBpbnRvIGEgc2lnbmVkIHZhbHVlXG4gICAgICByZXR1cm4gKChhbCAqIGJsKSArICgoKGFoICogYmwgKyBhbCAqIGJoKSA8PCAxNikgPj4+IDApfDApO1xuICAgIH0sXG5cbiAgICBmcm91bmQ6IGZ1bmN0aW9uICh4KSB7XG4gICAgICBpZiAoeCA9PT0gMCB8fCB4ID09PSBJbmZpbml0eSB8fCB4ID09PSAtSW5maW5pdHkgfHwgTnVtYmVyLmlzTmFOKHgpKSB7XG4gICAgICAgIHJldHVybiB4O1xuICAgICAgfVxuICAgICAgdmFyIG51bSA9IE51bWJlcih4KTtcbiAgICAgIHJldHVybiBudW1iZXJDb252ZXJzaW9uLnRvRmxvYXQzMihudW0pO1xuICAgIH1cbiAgfTtcbiAgZGVmaW5lUHJvcGVydGllcyhNYXRoLCBNYXRoU2hpbXMpO1xuXG4gIGlmIChNYXRoLmltdWwoMHhmZmZmZmZmZiwgNSkgIT09IC01KSB7XG4gICAgLy8gU2FmYXJpIDYuMSwgYXQgbGVhc3QsIHJlcG9ydHMgXCIwXCIgZm9yIHRoaXMgdmFsdWVcbiAgICBNYXRoLmltdWwgPSBNYXRoU2hpbXMuaW11bDtcbiAgfVxuXG4gIC8vIFByb21pc2VzXG4gIC8vIFNpbXBsZXN0IHBvc3NpYmxlIGltcGxlbWVudGF0aW9uOyB1c2UgYSAzcmQtcGFydHkgbGlicmFyeSBpZiB5b3VcbiAgLy8gd2FudCB0aGUgYmVzdCBwb3NzaWJsZSBzcGVlZCBhbmQvb3IgbG9uZyBzdGFjayB0cmFjZXMuXG4gIHZhciBQcm9taXNlU2hpbSA9IChmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgUHJvbWlzZSwgUHJvbWlzZSRwcm90b3R5cGU7XG5cbiAgICBFUy5Jc1Byb21pc2UgPSBmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QocHJvbWlzZSkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKCFwcm9taXNlLl9wcm9taXNlQ29uc3RydWN0b3IpIHtcbiAgICAgICAgLy8gX3Byb21pc2VDb25zdHJ1Y3RvciBpcyBhIGJpdCBtb3JlIHVuaXF1ZSB0aGFuIF9zdGF0dXMsIHNvIHdlJ2xsXG4gICAgICAgIC8vIGNoZWNrIHRoYXQgaW5zdGVhZCBvZiB0aGUgW1tQcm9taXNlU3RhdHVzXV0gaW50ZXJuYWwgZmllbGQuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgcHJvbWlzZS5fc3RhdHVzID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vIHVuaW5pdGlhbGl6ZWRcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICAvLyBcIlByb21pc2VDYXBhYmlsaXR5XCIgaW4gdGhlIHNwZWMgaXMgd2hhdCBtb3N0IHByb21pc2UgaW1wbGVtZW50YXRpb25zXG4gICAgLy8gY2FsbCBhIFwiZGVmZXJyZWRcIi5cbiAgICB2YXIgUHJvbWlzZUNhcGFiaWxpdHkgPSBmdW5jdGlvbiAoQykge1xuICAgICAgaWYgKCFFUy5Jc0NhbGxhYmxlKEMpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2JhZCBwcm9taXNlIGNvbnN0cnVjdG9yJyk7XG4gICAgICB9XG4gICAgICB2YXIgY2FwYWJpbGl0eSA9IHRoaXM7XG4gICAgICB2YXIgcmVzb2x2ZXIgPSBmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGNhcGFiaWxpdHkucmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICAgIGNhcGFiaWxpdHkucmVqZWN0ID0gcmVqZWN0O1xuICAgICAgfTtcbiAgICAgIGNhcGFiaWxpdHkucHJvbWlzZSA9IEVTLkNvbnN0cnVjdChDLCBbcmVzb2x2ZXJdKTtcbiAgICAgIC8vIHNlZSBodHRwczovL2J1Z3MuZWNtYXNjcmlwdC5vcmcvc2hvd19idWcuY2dpP2lkPTI0NzhcbiAgICAgIGlmICghY2FwYWJpbGl0eS5wcm9taXNlLl9lczZjb25zdHJ1Y3QpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYmFkIHByb21pc2UgY29uc3RydWN0b3InKTtcbiAgICAgIH1cbiAgICAgIGlmICghKEVTLklzQ2FsbGFibGUoY2FwYWJpbGl0eS5yZXNvbHZlKSAmJlxuICAgICAgICAgICAgRVMuSXNDYWxsYWJsZShjYXBhYmlsaXR5LnJlamVjdCkpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2JhZCBwcm9taXNlIGNvbnN0cnVjdG9yJyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8vIGZpbmQgYW4gYXBwcm9wcmlhdGUgc2V0SW1tZWRpYXRlLWFsaWtlXG4gICAgdmFyIHNldFRpbWVvdXQgPSBnbG9iYWxzLnNldFRpbWVvdXQ7XG4gICAgdmFyIG1ha2VaZXJvVGltZW91dDtcbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgRVMuSXNDYWxsYWJsZSh3aW5kb3cucG9zdE1lc3NhZ2UpKSB7XG4gICAgICBtYWtlWmVyb1RpbWVvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIGZyb20gaHR0cDovL2RiYXJvbi5vcmcvbG9nLzIwMTAwMzA5LWZhc3Rlci10aW1lb3V0c1xuICAgICAgICB2YXIgdGltZW91dHMgPSBbXTtcbiAgICAgICAgdmFyIG1lc3NhZ2VOYW1lID0gJ3plcm8tdGltZW91dC1tZXNzYWdlJztcbiAgICAgICAgdmFyIHNldFplcm9UaW1lb3V0ID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgdGltZW91dHMucHVzaChmbik7XG4gICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKG1lc3NhZ2VOYW1lLCAnKicpO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgaGFuZGxlTWVzc2FnZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIGlmIChldmVudC5zb3VyY2UgPT0gd2luZG93ICYmIGV2ZW50LmRhdGEgPT0gbWVzc2FnZU5hbWUpIHtcbiAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgaWYgKHRpbWVvdXRzLmxlbmd0aCA9PT0gMCkgeyByZXR1cm47IH1cbiAgICAgICAgICAgIHZhciBmbiA9IHRpbWVvdXRzLnNoaWZ0KCk7XG4gICAgICAgICAgICBmbigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBoYW5kbGVNZXNzYWdlLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIHNldFplcm9UaW1lb3V0O1xuICAgICAgfTtcbiAgICB9XG4gICAgdmFyIG1ha2VQcm9taXNlQXNhcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIEFuIGVmZmljaWVudCB0YXNrLXNjaGVkdWxlciBiYXNlZCBvbiBhIHByZS1leGlzdGluZyBQcm9taXNlXG4gICAgICAvLyBpbXBsZW1lbnRhdGlvbiwgd2hpY2ggd2UgY2FuIHVzZSBldmVuIGlmIHdlIG92ZXJyaWRlIHRoZVxuICAgICAgLy8gZ2xvYmFsIFByb21pc2UgYmVsb3cgKGluIG9yZGVyIHRvIHdvcmthcm91bmQgYnVncylcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9SYXlub3Mvb2JzZXJ2LWhhc2gvaXNzdWVzLzIjaXNzdWVjb21tZW50LTM1ODU3NjcxXG4gICAgICB2YXIgUCA9IGdsb2JhbHMuUHJvbWlzZTtcbiAgICAgIHJldHVybiBQICYmIFAucmVzb2x2ZSAmJiBmdW5jdGlvbiAodGFzaykge1xuICAgICAgICByZXR1cm4gUC5yZXNvbHZlKCkudGhlbih0YXNrKTtcbiAgICAgIH07XG4gICAgfTtcbiAgICB2YXIgZW5xdWV1ZSA9IEVTLklzQ2FsbGFibGUoZ2xvYmFscy5zZXRJbW1lZGlhdGUpID9cbiAgICAgIGdsb2JhbHMuc2V0SW1tZWRpYXRlLmJpbmQoZ2xvYmFscykgOlxuICAgICAgdHlwZW9mIHByb2Nlc3MgPT09ICdvYmplY3QnICYmIHByb2Nlc3MubmV4dFRpY2sgPyBwcm9jZXNzLm5leHRUaWNrIDpcbiAgICAgIG1ha2VQcm9taXNlQXNhcCgpIHx8XG4gICAgICAoRVMuSXNDYWxsYWJsZShtYWtlWmVyb1RpbWVvdXQpID8gbWFrZVplcm9UaW1lb3V0KCkgOlxuICAgICAgZnVuY3Rpb24gKHRhc2spIHsgc2V0VGltZW91dCh0YXNrLCAwKTsgfSk7IC8vIGZhbGxiYWNrXG5cbiAgICB2YXIgdHJpZ2dlclByb21pc2VSZWFjdGlvbnMgPSBmdW5jdGlvbiAocmVhY3Rpb25zLCB4KSB7XG4gICAgICByZWFjdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAocmVhY3Rpb24pIHtcbiAgICAgICAgZW5xdWV1ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgLy8gUHJvbWlzZVJlYWN0aW9uVGFza1xuICAgICAgICAgIHZhciBoYW5kbGVyID0gcmVhY3Rpb24uaGFuZGxlcjtcbiAgICAgICAgICB2YXIgY2FwYWJpbGl0eSA9IHJlYWN0aW9uLmNhcGFiaWxpdHk7XG4gICAgICAgICAgdmFyIHJlc29sdmUgPSBjYXBhYmlsaXR5LnJlc29sdmU7XG4gICAgICAgICAgdmFyIHJlamVjdCA9IGNhcGFiaWxpdHkucmVqZWN0O1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gaGFuZGxlcih4KTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IGNhcGFiaWxpdHkucHJvbWlzZSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdzZWxmIHJlc29sdXRpb24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciB1cGRhdGVSZXN1bHQgPVxuICAgICAgICAgICAgICB1cGRhdGVQcm9taXNlRnJvbVBvdGVudGlhbFRoZW5hYmxlKHJlc3VsdCwgY2FwYWJpbGl0eSk7XG4gICAgICAgICAgICBpZiAoIXVwZGF0ZVJlc3VsdCkge1xuICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyIHVwZGF0ZVByb21pc2VGcm9tUG90ZW50aWFsVGhlbmFibGUgPSBmdW5jdGlvbiAoeCwgY2FwYWJpbGl0eSkge1xuICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QoeCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgdmFyIHJlc29sdmUgPSBjYXBhYmlsaXR5LnJlc29sdmU7XG4gICAgICB2YXIgcmVqZWN0ID0gY2FwYWJpbGl0eS5yZWplY3Q7XG4gICAgICB0cnkge1xuICAgICAgICB2YXIgdGhlbiA9IHgudGhlbjsgLy8gb25seSBvbmUgaW52b2NhdGlvbiBvZiBhY2Nlc3NvclxuICAgICAgICBpZiAoIUVTLklzQ2FsbGFibGUodGhlbikpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICAgIHRoZW4uY2FsbCh4LCByZXNvbHZlLCByZWplY3QpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZWplY3QoZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4gICAgdmFyIHByb21pc2VSZXNvbHV0aW9uSGFuZGxlciA9IGZ1bmN0aW9uIChwcm9taXNlLCBvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIGlmICh4ID09PSBwcm9taXNlKSB7XG4gICAgICAgICAgcmV0dXJuIG9uUmVqZWN0ZWQobmV3IFR5cGVFcnJvcignc2VsZiByZXNvbHV0aW9uJykpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBDID0gcHJvbWlzZS5fcHJvbWlzZUNvbnN0cnVjdG9yO1xuICAgICAgICB2YXIgY2FwYWJpbGl0eSA9IG5ldyBQcm9taXNlQ2FwYWJpbGl0eShDKTtcbiAgICAgICAgdmFyIHVwZGF0ZVJlc3VsdCA9IHVwZGF0ZVByb21pc2VGcm9tUG90ZW50aWFsVGhlbmFibGUoeCwgY2FwYWJpbGl0eSk7XG4gICAgICAgIGlmICh1cGRhdGVSZXN1bHQpIHtcbiAgICAgICAgICByZXR1cm4gY2FwYWJpbGl0eS5wcm9taXNlLnRoZW4ob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBvbkZ1bGZpbGxlZCh4KTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgUHJvbWlzZSA9IGZ1bmN0aW9uIChyZXNvbHZlcikge1xuICAgICAgdmFyIHByb21pc2UgPSB0aGlzO1xuICAgICAgcHJvbWlzZSA9IGVtdWxhdGVFUzZjb25zdHJ1Y3QocHJvbWlzZSk7XG4gICAgICBpZiAoIXByb21pc2UuX3Byb21pc2VDb25zdHJ1Y3Rvcikge1xuICAgICAgICAvLyB3ZSB1c2UgX3Byb21pc2VDb25zdHJ1Y3RvciBhcyBhIHN0YW5kLWluIGZvciB0aGUgaW50ZXJuYWxcbiAgICAgICAgLy8gW1tQcm9taXNlU3RhdHVzXV0gZmllbGQ7IGl0J3MgYSBsaXR0bGUgbW9yZSB1bmlxdWUuXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2JhZCBwcm9taXNlJyk7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHByb21pc2UuX3N0YXR1cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigncHJvbWlzZSBhbHJlYWR5IGluaXRpYWxpemVkJyk7XG4gICAgICB9XG4gICAgICAvLyBzZWUgaHR0cHM6Ly9idWdzLmVjbWFzY3JpcHQub3JnL3Nob3dfYnVnLmNnaT9pZD0yNDgyXG4gICAgICBpZiAoIUVTLklzQ2FsbGFibGUocmVzb2x2ZXIpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ25vdCBhIHZhbGlkIHJlc29sdmVyJyk7XG4gICAgICB9XG4gICAgICBwcm9taXNlLl9zdGF0dXMgPSAndW5yZXNvbHZlZCc7XG4gICAgICBwcm9taXNlLl9yZXNvbHZlUmVhY3Rpb25zID0gW107XG4gICAgICBwcm9taXNlLl9yZWplY3RSZWFjdGlvbnMgPSBbXTtcblxuICAgICAgdmFyIHJlc29sdmUgPSBmdW5jdGlvbiAocmVzb2x1dGlvbikge1xuICAgICAgICBpZiAocHJvbWlzZS5fc3RhdHVzICE9PSAndW5yZXNvbHZlZCcpIHsgcmV0dXJuOyB9XG4gICAgICAgIHZhciByZWFjdGlvbnMgPSBwcm9taXNlLl9yZXNvbHZlUmVhY3Rpb25zO1xuICAgICAgICBwcm9taXNlLl9yZXN1bHQgPSByZXNvbHV0aW9uO1xuICAgICAgICBwcm9taXNlLl9yZXNvbHZlUmVhY3Rpb25zID0gdm9pZCAwO1xuICAgICAgICBwcm9taXNlLl9yZWplY3RSZWFjdGlvbnMgPSB2b2lkIDA7XG4gICAgICAgIHByb21pc2UuX3N0YXR1cyA9ICdoYXMtcmVzb2x1dGlvbic7XG4gICAgICAgIHRyaWdnZXJQcm9taXNlUmVhY3Rpb25zKHJlYWN0aW9ucywgcmVzb2x1dGlvbik7XG4gICAgICB9O1xuICAgICAgdmFyIHJlamVjdCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgaWYgKHByb21pc2UuX3N0YXR1cyAhPT0gJ3VucmVzb2x2ZWQnKSB7IHJldHVybjsgfVxuICAgICAgICB2YXIgcmVhY3Rpb25zID0gcHJvbWlzZS5fcmVqZWN0UmVhY3Rpb25zO1xuICAgICAgICBwcm9taXNlLl9yZXN1bHQgPSByZWFzb247XG4gICAgICAgIHByb21pc2UuX3Jlc29sdmVSZWFjdGlvbnMgPSB2b2lkIDA7XG4gICAgICAgIHByb21pc2UuX3JlamVjdFJlYWN0aW9ucyA9IHZvaWQgMDtcbiAgICAgICAgcHJvbWlzZS5fc3RhdHVzID0gJ2hhcy1yZWplY3Rpb24nO1xuICAgICAgICB0cmlnZ2VyUHJvbWlzZVJlYWN0aW9ucyhyZWFjdGlvbnMsIHJlYXNvbik7XG4gICAgICB9O1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzb2x2ZXIocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfTtcbiAgICBQcm9taXNlJHByb3RvdHlwZSA9IFByb21pc2UucHJvdG90eXBlO1xuICAgIGRlZmluZVByb3BlcnRpZXMoUHJvbWlzZSwge1xuICAgICAgJ0BAY3JlYXRlJzogZnVuY3Rpb24gKG9iaikge1xuICAgICAgICB2YXIgY29uc3RydWN0b3IgPSB0aGlzO1xuICAgICAgICAvLyBBbGxvY2F0ZVByb21pc2VcbiAgICAgICAgLy8gVGhlIGBvYmpgIHBhcmFtZXRlciBpcyBhIGhhY2sgd2UgdXNlIGZvciBlczVcbiAgICAgICAgLy8gY29tcGF0aWJpbGl0eS5cbiAgICAgICAgdmFyIHByb3RvdHlwZSA9IGNvbnN0cnVjdG9yLnByb3RvdHlwZSB8fCBQcm9taXNlJHByb3RvdHlwZTtcbiAgICAgICAgb2JqID0gb2JqIHx8IGNyZWF0ZShwcm90b3R5cGUpO1xuICAgICAgICBkZWZpbmVQcm9wZXJ0aWVzKG9iaiwge1xuICAgICAgICAgIF9zdGF0dXM6IHZvaWQgMCxcbiAgICAgICAgICBfcmVzdWx0OiB2b2lkIDAsXG4gICAgICAgICAgX3Jlc29sdmVSZWFjdGlvbnM6IHZvaWQgMCxcbiAgICAgICAgICBfcmVqZWN0UmVhY3Rpb25zOiB2b2lkIDAsXG4gICAgICAgICAgX3Byb21pc2VDb25zdHJ1Y3Rvcjogdm9pZCAwXG4gICAgICAgIH0pO1xuICAgICAgICBvYmouX3Byb21pc2VDb25zdHJ1Y3RvciA9IGNvbnN0cnVjdG9yO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIF9wcm9taXNlQWxsUmVzb2x2ZXIgPSBmdW5jdGlvbiAoaW5kZXgsIHZhbHVlcywgY2FwYWJpbGl0eSwgcmVtYWluaW5nKSB7XG4gICAgICB2YXIgZG9uZSA9IGZhbHNlO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIGlmIChkb25lKSB7IHJldHVybjsgfSAvLyBwcm90ZWN0IGFnYWluc3QgYmVpbmcgY2FsbGVkIG11bHRpcGxlIHRpbWVzXG4gICAgICAgIGRvbmUgPSB0cnVlO1xuICAgICAgICB2YWx1ZXNbaW5kZXhdID0geDtcbiAgICAgICAgaWYgKCgtLXJlbWFpbmluZy5jb3VudCkgPT09IDApIHtcbiAgICAgICAgICB2YXIgcmVzb2x2ZSA9IGNhcGFiaWxpdHkucmVzb2x2ZTtcbiAgICAgICAgICByZXNvbHZlKHZhbHVlcyk7IC8vIGNhbGwgdy8gdGhpcz09PXVuZGVmaW5lZFxuICAgICAgICB9XG4gICAgICB9O1xuICAgIH07XG5cbiAgICBQcm9taXNlLmFsbCA9IGZ1bmN0aW9uIChpdGVyYWJsZSkge1xuICAgICAgdmFyIEMgPSB0aGlzO1xuICAgICAgdmFyIGNhcGFiaWxpdHkgPSBuZXcgUHJvbWlzZUNhcGFiaWxpdHkoQyk7XG4gICAgICB2YXIgcmVzb2x2ZSA9IGNhcGFiaWxpdHkucmVzb2x2ZTtcbiAgICAgIHZhciByZWplY3QgPSBjYXBhYmlsaXR5LnJlamVjdDtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICghRVMuSXNJdGVyYWJsZShpdGVyYWJsZSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdiYWQgaXRlcmFibGUnKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaXQgPSBFUy5HZXRJdGVyYXRvcihpdGVyYWJsZSk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSBbXSwgcmVtYWluaW5nID0geyBjb3VudDogMSB9O1xuICAgICAgICBmb3IgKHZhciBpbmRleCA9IDA7IDsgaW5kZXgrKykge1xuICAgICAgICAgIHZhciBuZXh0ID0gRVMuSXRlcmF0b3JOZXh0KGl0KTtcbiAgICAgICAgICBpZiAobmV4dC5kb25lKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIG5leHRQcm9taXNlID0gQy5yZXNvbHZlKG5leHQudmFsdWUpO1xuICAgICAgICAgIHZhciByZXNvbHZlRWxlbWVudCA9IF9wcm9taXNlQWxsUmVzb2x2ZXIoXG4gICAgICAgICAgICBpbmRleCwgdmFsdWVzLCBjYXBhYmlsaXR5LCByZW1haW5pbmdcbiAgICAgICAgICApO1xuICAgICAgICAgIHJlbWFpbmluZy5jb3VudCsrO1xuICAgICAgICAgIG5leHRQcm9taXNlLnRoZW4ocmVzb2x2ZUVsZW1lbnQsIGNhcGFiaWxpdHkucmVqZWN0KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoKC0tcmVtYWluaW5nLmNvdW50KSA9PT0gMCkge1xuICAgICAgICAgIHJlc29sdmUodmFsdWVzKTsgLy8gY2FsbCB3LyB0aGlzPT09dW5kZWZpbmVkXG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNhcGFiaWxpdHkucHJvbWlzZTtcbiAgICB9O1xuXG4gICAgUHJvbWlzZS5yYWNlID0gZnVuY3Rpb24gKGl0ZXJhYmxlKSB7XG4gICAgICB2YXIgQyA9IHRoaXM7XG4gICAgICB2YXIgY2FwYWJpbGl0eSA9IG5ldyBQcm9taXNlQ2FwYWJpbGl0eShDKTtcbiAgICAgIHZhciByZXNvbHZlID0gY2FwYWJpbGl0eS5yZXNvbHZlO1xuICAgICAgdmFyIHJlamVjdCA9IGNhcGFiaWxpdHkucmVqZWN0O1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKCFFUy5Jc0l0ZXJhYmxlKGl0ZXJhYmxlKSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2JhZCBpdGVyYWJsZScpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpdCA9IEVTLkdldEl0ZXJhdG9yKGl0ZXJhYmxlKTtcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICB2YXIgbmV4dCA9IEVTLkl0ZXJhdG9yTmV4dChpdCk7XG4gICAgICAgICAgaWYgKG5leHQuZG9uZSkge1xuICAgICAgICAgICAgLy8gSWYgaXRlcmFibGUgaGFzIG5vIGl0ZW1zLCByZXN1bHRpbmcgcHJvbWlzZSB3aWxsIG5ldmVyXG4gICAgICAgICAgICAvLyByZXNvbHZlOyBzZWU6XG4gICAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vZG9tZW5pYy9wcm9taXNlcy11bndyYXBwaW5nL2lzc3Vlcy83NVxuICAgICAgICAgICAgLy8gaHR0cHM6Ly9idWdzLmVjbWFzY3JpcHQub3JnL3Nob3dfYnVnLmNnaT9pZD0yNTE1XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIG5leHRQcm9taXNlID0gQy5yZXNvbHZlKG5leHQudmFsdWUpO1xuICAgICAgICAgIG5leHRQcm9taXNlLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZWplY3QoZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY2FwYWJpbGl0eS5wcm9taXNlO1xuICAgIH07XG5cbiAgICBQcm9taXNlLnJlamVjdCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgIHZhciBDID0gdGhpcztcbiAgICAgIHZhciBjYXBhYmlsaXR5ID0gbmV3IFByb21pc2VDYXBhYmlsaXR5KEMpO1xuICAgICAgdmFyIHJlamVjdCA9IGNhcGFiaWxpdHkucmVqZWN0O1xuICAgICAgcmVqZWN0KHJlYXNvbik7IC8vIGNhbGwgd2l0aCB0aGlzPT09dW5kZWZpbmVkXG4gICAgICByZXR1cm4gY2FwYWJpbGl0eS5wcm9taXNlO1xuICAgIH07XG5cbiAgICBQcm9taXNlLnJlc29sdmUgPSBmdW5jdGlvbiAodikge1xuICAgICAgdmFyIEMgPSB0aGlzO1xuICAgICAgaWYgKEVTLklzUHJvbWlzZSh2KSkge1xuICAgICAgICB2YXIgY29uc3RydWN0b3IgPSB2Ll9wcm9taXNlQ29uc3RydWN0b3I7XG4gICAgICAgIGlmIChjb25zdHJ1Y3RvciA9PT0gQykgeyByZXR1cm4gdjsgfVxuICAgICAgfVxuICAgICAgdmFyIGNhcGFiaWxpdHkgPSBuZXcgUHJvbWlzZUNhcGFiaWxpdHkoQyk7XG4gICAgICB2YXIgcmVzb2x2ZSA9IGNhcGFiaWxpdHkucmVzb2x2ZTtcbiAgICAgIHJlc29sdmUodik7IC8vIGNhbGwgd2l0aCB0aGlzPT09dW5kZWZpbmVkXG4gICAgICByZXR1cm4gY2FwYWJpbGl0eS5wcm9taXNlO1xuICAgIH07XG5cbiAgICBQcm9taXNlLnByb3RvdHlwZVsnY2F0Y2gnXSA9IGZ1bmN0aW9uIChvblJlamVjdGVkKSB7XG4gICAgICByZXR1cm4gdGhpcy50aGVuKHZvaWQgMCwgb25SZWplY3RlZCk7XG4gICAgfTtcblxuICAgIFByb21pc2UucHJvdG90eXBlLnRoZW4gPSBmdW5jdGlvbiAob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpIHtcbiAgICAgIHZhciBwcm9taXNlID0gdGhpcztcbiAgICAgIGlmICghRVMuSXNQcm9taXNlKHByb21pc2UpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ25vdCBhIHByb21pc2UnKTsgfVxuICAgICAgLy8gdGhpcy5jb25zdHJ1Y3RvciBub3QgdGhpcy5fcHJvbWlzZUNvbnN0cnVjdG9yOyBzZWVcbiAgICAgIC8vIGh0dHBzOi8vYnVncy5lY21hc2NyaXB0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MjUxM1xuICAgICAgdmFyIEMgPSB0aGlzLmNvbnN0cnVjdG9yO1xuICAgICAgdmFyIGNhcGFiaWxpdHkgPSBuZXcgUHJvbWlzZUNhcGFiaWxpdHkoQyk7XG4gICAgICBpZiAoIUVTLklzQ2FsbGFibGUob25SZWplY3RlZCkpIHtcbiAgICAgICAgb25SZWplY3RlZCA9IGZ1bmN0aW9uIChlKSB7IHRocm93IGU7IH07XG4gICAgICB9XG4gICAgICBpZiAoIUVTLklzQ2FsbGFibGUob25GdWxmaWxsZWQpKSB7XG4gICAgICAgIG9uRnVsZmlsbGVkID0gZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHg7IH07XG4gICAgICB9XG4gICAgICB2YXIgcmVzb2x1dGlvbkhhbmRsZXIgPVxuICAgICAgICBwcm9taXNlUmVzb2x1dGlvbkhhbmRsZXIocHJvbWlzZSwgb25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpO1xuICAgICAgdmFyIHJlc29sdmVSZWFjdGlvbiA9XG4gICAgICAgIHsgY2FwYWJpbGl0eTogY2FwYWJpbGl0eSwgaGFuZGxlcjogcmVzb2x1dGlvbkhhbmRsZXIgfTtcbiAgICAgIHZhciByZWplY3RSZWFjdGlvbiA9XG4gICAgICAgIHsgY2FwYWJpbGl0eTogY2FwYWJpbGl0eSwgaGFuZGxlcjogb25SZWplY3RlZCB9O1xuICAgICAgc3dpdGNoIChwcm9taXNlLl9zdGF0dXMpIHtcbiAgICAgIGNhc2UgJ3VucmVzb2x2ZWQnOlxuICAgICAgICBwcm9taXNlLl9yZXNvbHZlUmVhY3Rpb25zLnB1c2gocmVzb2x2ZVJlYWN0aW9uKTtcbiAgICAgICAgcHJvbWlzZS5fcmVqZWN0UmVhY3Rpb25zLnB1c2gocmVqZWN0UmVhY3Rpb24pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2hhcy1yZXNvbHV0aW9uJzpcbiAgICAgICAgdHJpZ2dlclByb21pc2VSZWFjdGlvbnMoW3Jlc29sdmVSZWFjdGlvbl0sIHByb21pc2UuX3Jlc3VsdCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnaGFzLXJlamVjdGlvbic6XG4gICAgICAgIHRyaWdnZXJQcm9taXNlUmVhY3Rpb25zKFtyZWplY3RSZWFjdGlvbl0sIHByb21pc2UuX3Jlc3VsdCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigndW5leHBlY3RlZCcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNhcGFiaWxpdHkucHJvbWlzZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFByb21pc2U7XG4gIH0pKCk7XG5cbiAgLy8gQ2hyb21lJ3MgbmF0aXZlIFByb21pc2UgaGFzIGV4dHJhIG1ldGhvZHMgdGhhdCBpdCBzaG91bGRuJ3QgaGF2ZS4gTGV0J3MgcmVtb3ZlIHRoZW0uXG4gIGlmIChnbG9iYWxzLlByb21pc2UpIHtcbiAgICBkZWxldGUgZ2xvYmFscy5Qcm9taXNlLmFjY2VwdDtcbiAgICBkZWxldGUgZ2xvYmFscy5Qcm9taXNlLmRlZmVyO1xuICAgIGRlbGV0ZSBnbG9iYWxzLlByb21pc2UucHJvdG90eXBlLmNoYWluO1xuICB9XG5cbiAgLy8gZXhwb3J0IHRoZSBQcm9taXNlIGNvbnN0cnVjdG9yLlxuICBkZWZpbmVQcm9wZXJ0aWVzKGdsb2JhbHMsIHsgUHJvbWlzZTogUHJvbWlzZVNoaW0gfSk7XG4gIC8vIEluIENocm9tZSAzMyAoYW5kIHRoZXJlYWJvdXRzKSBQcm9taXNlIGlzIGRlZmluZWQsIGJ1dCB0aGVcbiAgLy8gaW1wbGVtZW50YXRpb24gaXMgYnVnZ3kgaW4gYSBudW1iZXIgb2Ygd2F5cy4gIExldCdzIGNoZWNrIHN1YmNsYXNzaW5nXG4gIC8vIHN1cHBvcnQgdG8gc2VlIGlmIHdlIGhhdmUgYSBidWdneSBpbXBsZW1lbnRhdGlvbi5cbiAgdmFyIHByb21pc2VTdXBwb3J0c1N1YmNsYXNzaW5nID0gc3VwcG9ydHNTdWJjbGFzc2luZyhnbG9iYWxzLlByb21pc2UsIGZ1bmN0aW9uIChTKSB7XG4gICAgcmV0dXJuIFMucmVzb2x2ZSg0MikgaW5zdGFuY2VvZiBTO1xuICB9KTtcbiAgdmFyIHByb21pc2VJZ25vcmVzTm9uRnVuY3Rpb25UaGVuQ2FsbGJhY2tzID0gKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgZ2xvYmFscy5Qcm9taXNlLnJlamVjdCg0MikudGhlbihudWxsLCA1KS50aGVuKG51bGwsIGZ1bmN0aW9uICgpIHt9KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9KCkpO1xuICB2YXIgcHJvbWlzZVJlcXVpcmVzT2JqZWN0Q29udGV4dCA9IChmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHsgUHJvbWlzZS5jYWxsKDMsIGZ1bmN0aW9uICgpIHt9KTsgfSBjYXRjaCAoZSkgeyByZXR1cm4gdHJ1ZTsgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSgpKTtcbiAgaWYgKCFwcm9taXNlU3VwcG9ydHNTdWJjbGFzc2luZyB8fCAhcHJvbWlzZUlnbm9yZXNOb25GdW5jdGlvblRoZW5DYWxsYmFja3MgfHwgIXByb21pc2VSZXF1aXJlc09iamVjdENvbnRleHQpIHtcbiAgICBnbG9iYWxzLlByb21pc2UgPSBQcm9taXNlU2hpbTtcbiAgfVxuXG4gIC8vIE1hcCBhbmQgU2V0IHJlcXVpcmUgYSB0cnVlIEVTNSBlbnZpcm9ubWVudFxuICAvLyBUaGVpciBmYXN0IHBhdGggYWxzbyByZXF1aXJlcyB0aGF0IHRoZSBlbnZpcm9ubWVudCBwcmVzZXJ2ZVxuICAvLyBwcm9wZXJ0eSBpbnNlcnRpb24gb3JkZXIsIHdoaWNoIGlzIG5vdCBndWFyYW50ZWVkIGJ5IHRoZSBzcGVjLlxuICB2YXIgdGVzdE9yZGVyID0gZnVuY3Rpb24gKGEpIHtcbiAgICB2YXIgYiA9IE9iamVjdC5rZXlzKGEucmVkdWNlKGZ1bmN0aW9uIChvLCBrKSB7XG4gICAgICBvW2tdID0gdHJ1ZTtcbiAgICAgIHJldHVybiBvO1xuICAgIH0sIHt9KSk7XG4gICAgcmV0dXJuIGEuam9pbignOicpID09PSBiLmpvaW4oJzonKTtcbiAgfTtcbiAgdmFyIHByZXNlcnZlc0luc2VydGlvbk9yZGVyID0gdGVzdE9yZGVyKFsneicsICdhJywgJ2JiJ10pO1xuICAvLyBzb21lIGVuZ2luZXMgKGVnLCBDaHJvbWUpIG9ubHkgcHJlc2VydmUgaW5zZXJ0aW9uIG9yZGVyIGZvciBzdHJpbmcga2V5c1xuICB2YXIgcHJlc2VydmVzTnVtZXJpY0luc2VydGlvbk9yZGVyID0gdGVzdE9yZGVyKFsneicsIDEsICdhJywgJzMnLCAyXSk7XG5cbiAgaWYgKHN1cHBvcnRzRGVzY3JpcHRvcnMpIHtcblxuICAgIHZhciBmYXN0a2V5ID0gZnVuY3Rpb24gZmFzdGtleShrZXkpIHtcbiAgICAgIGlmICghcHJlc2VydmVzSW5zZXJ0aW9uT3JkZXIpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICB2YXIgdHlwZSA9IHR5cGVvZiBrZXk7XG4gICAgICBpZiAodHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuICckJyArIGtleTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgLy8gbm90ZSB0aGF0IC0wIHdpbGwgZ2V0IGNvZXJjZWQgdG8gXCIwXCIgd2hlbiB1c2VkIGFzIGEgcHJvcGVydHkga2V5XG4gICAgICAgIGlmICghcHJlc2VydmVzTnVtZXJpY0luc2VydGlvbk9yZGVyKSB7XG4gICAgICAgICAgcmV0dXJuICduJyArIGtleTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfTtcblxuICAgIHZhciBlbXB0eU9iamVjdCA9IGZ1bmN0aW9uIGVtcHR5T2JqZWN0KCkge1xuICAgICAgLy8gYWNjb21vZGF0ZSBzb21lIG9sZGVyIG5vdC1xdWl0ZS1FUzUgYnJvd3NlcnNcbiAgICAgIHJldHVybiBPYmplY3QuY3JlYXRlID8gT2JqZWN0LmNyZWF0ZShudWxsKSA6IHt9O1xuICAgIH07XG5cbiAgICB2YXIgY29sbGVjdGlvblNoaW1zID0ge1xuICAgICAgTWFwOiAoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHZhciBlbXB0eSA9IHt9O1xuXG4gICAgICAgIGZ1bmN0aW9uIE1hcEVudHJ5KGtleSwgdmFsdWUpIHtcbiAgICAgICAgICB0aGlzLmtleSA9IGtleTtcbiAgICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgdGhpcy5uZXh0ID0gbnVsbDtcbiAgICAgICAgICB0aGlzLnByZXYgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgTWFwRW50cnkucHJvdG90eXBlLmlzUmVtb3ZlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5rZXkgPT09IGVtcHR5O1xuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIE1hcEl0ZXJhdG9yKG1hcCwga2luZCkge1xuICAgICAgICAgIHRoaXMuaGVhZCA9IG1hcC5faGVhZDtcbiAgICAgICAgICB0aGlzLmkgPSB0aGlzLmhlYWQ7XG4gICAgICAgICAgdGhpcy5raW5kID0ga2luZDtcbiAgICAgICAgfVxuXG4gICAgICAgIE1hcEl0ZXJhdG9yLnByb3RvdHlwZSA9IHtcbiAgICAgICAgICBuZXh0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgaSA9IHRoaXMuaSwga2luZCA9IHRoaXMua2luZCwgaGVhZCA9IHRoaXMuaGVhZCwgcmVzdWx0O1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLmkgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdoaWxlIChpLmlzUmVtb3ZlZCgpICYmIGkgIT09IGhlYWQpIHtcbiAgICAgICAgICAgICAgLy8gYmFjayB1cCBvZmYgb2YgcmVtb3ZlZCBlbnRyaWVzXG4gICAgICAgICAgICAgIGkgPSBpLnByZXY7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBhZHZhbmNlIHRvIG5leHQgdW5yZXR1cm5lZCBlbGVtZW50LlxuICAgICAgICAgICAgd2hpbGUgKGkubmV4dCAhPT0gaGVhZCkge1xuICAgICAgICAgICAgICBpID0gaS5uZXh0O1xuICAgICAgICAgICAgICBpZiAoIWkuaXNSZW1vdmVkKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoa2luZCA9PT0gJ2tleScpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGkua2V5O1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2luZCA9PT0gJ3ZhbHVlJykge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gaS52YWx1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gW2kua2V5LCBpLnZhbHVlXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5pID0gaTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogcmVzdWx0LCBkb25lOiBmYWxzZSB9O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBvbmNlIHRoZSBpdGVyYXRvciBpcyBkb25lLCBpdCBpcyBkb25lIGZvcmV2ZXIuXG4gICAgICAgICAgICB0aGlzLmkgPSB2b2lkIDA7XG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogdm9pZCAwLCBkb25lOiB0cnVlIH07XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBhZGRJdGVyYXRvcihNYXBJdGVyYXRvci5wcm90b3R5cGUpO1xuXG4gICAgICAgIGZ1bmN0aW9uIE1hcChpdGVyYWJsZSkge1xuICAgICAgICAgIHZhciBtYXAgPSB0aGlzO1xuICAgICAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KG1hcCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ01hcCBkb2VzIG5vdCBhY2NlcHQgYXJndW1lbnRzIHdoZW4gY2FsbGVkIGFzIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbWFwID0gZW11bGF0ZUVTNmNvbnN0cnVjdChtYXApO1xuICAgICAgICAgIGlmICghbWFwLl9lczZtYXApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2JhZCBtYXAnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgaGVhZCA9IG5ldyBNYXBFbnRyeShudWxsLCBudWxsKTtcbiAgICAgICAgICAvLyBjaXJjdWxhciBkb3VibHktbGlua2VkIGxpc3QuXG4gICAgICAgICAgaGVhZC5uZXh0ID0gaGVhZC5wcmV2ID0gaGVhZDtcblxuICAgICAgICAgIGRlZmluZVByb3BlcnRpZXMobWFwLCB7XG4gICAgICAgICAgICBfaGVhZDogaGVhZCxcbiAgICAgICAgICAgIF9zdG9yYWdlOiBlbXB0eU9iamVjdCgpLFxuICAgICAgICAgICAgX3NpemU6IDBcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIE9wdGlvbmFsbHkgaW5pdGlhbGl6ZSBtYXAgZnJvbSBpdGVyYWJsZVxuICAgICAgICAgIGlmICh0eXBlb2YgaXRlcmFibGUgIT09ICd1bmRlZmluZWQnICYmIGl0ZXJhYmxlICE9PSBudWxsKSB7XG4gICAgICAgICAgICB2YXIgaXQgPSBFUy5HZXRJdGVyYXRvcihpdGVyYWJsZSk7XG4gICAgICAgICAgICB2YXIgYWRkZXIgPSBtYXAuc2V0O1xuICAgICAgICAgICAgaWYgKCFFUy5Jc0NhbGxhYmxlKGFkZGVyKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKCdiYWQgbWFwJyk7IH1cbiAgICAgICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICAgIHZhciBuZXh0ID0gRVMuSXRlcmF0b3JOZXh0KGl0KTtcbiAgICAgICAgICAgICAgaWYgKG5leHQuZG9uZSkgeyBicmVhazsgfVxuICAgICAgICAgICAgICB2YXIgbmV4dEl0ZW0gPSBuZXh0LnZhbHVlO1xuICAgICAgICAgICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChuZXh0SXRlbSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdleHBlY3RlZCBpdGVyYWJsZSBvZiBwYWlycycpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGFkZGVyLmNhbGwobWFwLCBuZXh0SXRlbVswXSwgbmV4dEl0ZW1bMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gbWFwO1xuICAgICAgICB9XG4gICAgICAgIHZhciBNYXAkcHJvdG90eXBlID0gTWFwLnByb3RvdHlwZTtcbiAgICAgICAgZGVmaW5lUHJvcGVydGllcyhNYXAsIHtcbiAgICAgICAgICAnQEBjcmVhdGUnOiBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgICAgICB2YXIgY29uc3RydWN0b3IgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIHByb3RvdHlwZSA9IGNvbnN0cnVjdG9yLnByb3RvdHlwZSB8fCBNYXAkcHJvdG90eXBlO1xuICAgICAgICAgICAgb2JqID0gb2JqIHx8IGNyZWF0ZShwcm90b3R5cGUpO1xuICAgICAgICAgICAgZGVmaW5lUHJvcGVydGllcyhvYmosIHsgX2VzNm1hcDogdHJ1ZSB9KTtcbiAgICAgICAgICAgIHJldHVybiBvYmo7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoTWFwLnByb3RvdHlwZSwgJ3NpemUnLCB7XG4gICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9zaXplID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdzaXplIG1ldGhvZCBjYWxsZWQgb24gaW5jb21wYXRpYmxlIE1hcCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NpemU7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBkZWZpbmVQcm9wZXJ0aWVzKE1hcC5wcm90b3R5cGUsIHtcbiAgICAgICAgICBnZXQ6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIHZhciBma2V5ID0gZmFzdGtleShrZXkpO1xuICAgICAgICAgICAgaWYgKGZrZXkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgLy8gZmFzdCBPKDEpIHBhdGhcbiAgICAgICAgICAgICAgdmFyIGVudHJ5ID0gdGhpcy5fc3RvcmFnZVtma2V5XTtcbiAgICAgICAgICAgICAgaWYgKGVudHJ5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVudHJ5LnZhbHVlO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGhlYWQgPSB0aGlzLl9oZWFkLCBpID0gaGVhZDtcbiAgICAgICAgICAgIHdoaWxlICgoaSA9IGkubmV4dCkgIT09IGhlYWQpIHtcbiAgICAgICAgICAgICAgaWYgKEVTLlNhbWVWYWx1ZVplcm8oaS5rZXksIGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaS52YWx1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBoYXM6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIHZhciBma2V5ID0gZmFzdGtleShrZXkpO1xuICAgICAgICAgICAgaWYgKGZrZXkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgLy8gZmFzdCBPKDEpIHBhdGhcbiAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiB0aGlzLl9zdG9yYWdlW2ZrZXldICE9PSAndW5kZWZpbmVkJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBoZWFkID0gdGhpcy5faGVhZCwgaSA9IGhlYWQ7XG4gICAgICAgICAgICB3aGlsZSAoKGkgPSBpLm5leHQpICE9PSBoZWFkKSB7XG4gICAgICAgICAgICAgIGlmIChFUy5TYW1lVmFsdWVaZXJvKGkua2V5LCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgc2V0OiBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgICAgICAgICAgdmFyIGhlYWQgPSB0aGlzLl9oZWFkLCBpID0gaGVhZCwgZW50cnk7XG4gICAgICAgICAgICB2YXIgZmtleSA9IGZhc3RrZXkoa2V5KTtcbiAgICAgICAgICAgIGlmIChma2V5ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIC8vIGZhc3QgTygxKSBwYXRoXG4gICAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5fc3RvcmFnZVtma2V5XSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdG9yYWdlW2ZrZXldLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZW50cnkgPSB0aGlzLl9zdG9yYWdlW2ZrZXldID0gbmV3IE1hcEVudHJ5KGtleSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIGkgPSBoZWFkLnByZXY7XG4gICAgICAgICAgICAgICAgLy8gZmFsbCB0aHJvdWdoXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdoaWxlICgoaSA9IGkubmV4dCkgIT09IGhlYWQpIHtcbiAgICAgICAgICAgICAgaWYgKEVTLlNhbWVWYWx1ZVplcm8oaS5rZXksIGtleSkpIHtcbiAgICAgICAgICAgICAgICBpLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVudHJ5ID0gZW50cnkgfHwgbmV3IE1hcEVudHJ5KGtleSwgdmFsdWUpO1xuICAgICAgICAgICAgaWYgKEVTLlNhbWVWYWx1ZSgtMCwga2V5KSkge1xuICAgICAgICAgICAgICBlbnRyeS5rZXkgPSArMDsgLy8gY29lcmNlIC0wIHRvICswIGluIGVudHJ5XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbnRyeS5uZXh0ID0gdGhpcy5faGVhZDtcbiAgICAgICAgICAgIGVudHJ5LnByZXYgPSB0aGlzLl9oZWFkLnByZXY7XG4gICAgICAgICAgICBlbnRyeS5wcmV2Lm5leHQgPSBlbnRyeTtcbiAgICAgICAgICAgIGVudHJ5Lm5leHQucHJldiA9IGVudHJ5O1xuICAgICAgICAgICAgdGhpcy5fc2l6ZSArPSAxO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgICdkZWxldGUnOiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICB2YXIgaGVhZCA9IHRoaXMuX2hlYWQsIGkgPSBoZWFkO1xuICAgICAgICAgICAgdmFyIGZrZXkgPSBmYXN0a2V5KGtleSk7XG4gICAgICAgICAgICBpZiAoZmtleSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAvLyBmYXN0IE8oMSkgcGF0aFxuICAgICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuX3N0b3JhZ2VbZmtleV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGkgPSB0aGlzLl9zdG9yYWdlW2ZrZXldLnByZXY7XG4gICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9zdG9yYWdlW2ZrZXldO1xuICAgICAgICAgICAgICAvLyBmYWxsIHRocm91Z2hcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdoaWxlICgoaSA9IGkubmV4dCkgIT09IGhlYWQpIHtcbiAgICAgICAgICAgICAgaWYgKEVTLlNhbWVWYWx1ZVplcm8oaS5rZXksIGtleSkpIHtcbiAgICAgICAgICAgICAgICBpLmtleSA9IGkudmFsdWUgPSBlbXB0eTtcbiAgICAgICAgICAgICAgICBpLnByZXYubmV4dCA9IGkubmV4dDtcbiAgICAgICAgICAgICAgICBpLm5leHQucHJldiA9IGkucHJldjtcbiAgICAgICAgICAgICAgICB0aGlzLl9zaXplIC09IDE7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgY2xlYXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuX3NpemUgPSAwO1xuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZSA9IGVtcHR5T2JqZWN0KCk7XG4gICAgICAgICAgICB2YXIgaGVhZCA9IHRoaXMuX2hlYWQsIGkgPSBoZWFkLCBwID0gaS5uZXh0O1xuICAgICAgICAgICAgd2hpbGUgKChpID0gcCkgIT09IGhlYWQpIHtcbiAgICAgICAgICAgICAgaS5rZXkgPSBpLnZhbHVlID0gZW1wdHk7XG4gICAgICAgICAgICAgIHAgPSBpLm5leHQ7XG4gICAgICAgICAgICAgIGkubmV4dCA9IGkucHJldiA9IGhlYWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBoZWFkLm5leHQgPSBoZWFkLnByZXYgPSBoZWFkO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBrZXlzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1hcEl0ZXJhdG9yKHRoaXMsICdrZXknKTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgdmFsdWVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1hcEl0ZXJhdG9yKHRoaXMsICd2YWx1ZScpO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBlbnRyaWVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1hcEl0ZXJhdG9yKHRoaXMsICdrZXkrdmFsdWUnKTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgZm9yRWFjaDogZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgY29udGV4dCA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogbnVsbDtcbiAgICAgICAgICAgIHZhciBpdCA9IHRoaXMuZW50cmllcygpO1xuICAgICAgICAgICAgZm9yICh2YXIgZW50cnkgPSBpdC5uZXh0KCk7ICFlbnRyeS5kb25lOyBlbnRyeSA9IGl0Lm5leHQoKSkge1xuICAgICAgICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwoY29udGV4dCwgZW50cnkudmFsdWVbMV0sIGVudHJ5LnZhbHVlWzBdLCB0aGlzKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlbnRyeS52YWx1ZVsxXSwgZW50cnkudmFsdWVbMF0sIHRoaXMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgYWRkSXRlcmF0b3IoTWFwLnByb3RvdHlwZSwgZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5lbnRyaWVzKCk7IH0pO1xuXG4gICAgICAgIHJldHVybiBNYXA7XG4gICAgICB9KSgpLFxuXG4gICAgICBTZXQ6IChmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIENyZWF0aW5nIGEgTWFwIGlzIGV4cGVuc2l2ZS4gIFRvIHNwZWVkIHVwIHRoZSBjb21tb24gY2FzZSBvZlxuICAgICAgICAvLyBTZXRzIGNvbnRhaW5pbmcgb25seSBzdHJpbmcgb3IgbnVtZXJpYyBrZXlzLCB3ZSB1c2UgYW4gb2JqZWN0XG4gICAgICAgIC8vIGFzIGJhY2tpbmcgc3RvcmFnZSBhbmQgbGF6aWx5IGNyZWF0ZSBhIGZ1bGwgTWFwIG9ubHkgd2hlblxuICAgICAgICAvLyByZXF1aXJlZC5cbiAgICAgICAgdmFyIFNldFNoaW0gPSBmdW5jdGlvbiBTZXQoaXRlcmFibGUpIHtcbiAgICAgICAgICB2YXIgc2V0ID0gdGhpcztcbiAgICAgICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChzZXQpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdTZXQgZG9lcyBub3QgYWNjZXB0IGFyZ3VtZW50cyB3aGVuIGNhbGxlZCBhcyBhIGZ1bmN0aW9uJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHNldCA9IGVtdWxhdGVFUzZjb25zdHJ1Y3Qoc2V0KTtcbiAgICAgICAgICBpZiAoIXNldC5fZXM2c2V0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdiYWQgc2V0Jyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZGVmaW5lUHJvcGVydGllcyhzZXQsIHtcbiAgICAgICAgICAgICdbW1NldERhdGFdXSc6IG51bGwsXG4gICAgICAgICAgICBfc3RvcmFnZTogZW1wdHlPYmplY3QoKVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gT3B0aW9uYWxseSBpbml0aWFsaXplIG1hcCBmcm9tIGl0ZXJhYmxlXG4gICAgICAgICAgaWYgKHR5cGVvZiBpdGVyYWJsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgaXRlcmFibGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHZhciBpdCA9IEVTLkdldEl0ZXJhdG9yKGl0ZXJhYmxlKTtcbiAgICAgICAgICAgIHZhciBhZGRlciA9IHNldC5hZGQ7XG4gICAgICAgICAgICBpZiAoIUVTLklzQ2FsbGFibGUoYWRkZXIpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ2JhZCBzZXQnKTsgfVxuICAgICAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgICAgdmFyIG5leHQgPSBFUy5JdGVyYXRvck5leHQoaXQpO1xuICAgICAgICAgICAgICBpZiAobmV4dC5kb25lKSB7IGJyZWFrOyB9XG4gICAgICAgICAgICAgIHZhciBuZXh0SXRlbSA9IG5leHQudmFsdWU7XG4gICAgICAgICAgICAgIGFkZGVyLmNhbGwoc2V0LCBuZXh0SXRlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBzZXQ7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBTZXQkcHJvdG90eXBlID0gU2V0U2hpbS5wcm90b3R5cGU7XG4gICAgICAgIGRlZmluZVByb3BlcnRpZXMoU2V0U2hpbSwge1xuICAgICAgICAgICdAQGNyZWF0ZSc6IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgICAgIHZhciBjb25zdHJ1Y3RvciA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgcHJvdG90eXBlID0gY29uc3RydWN0b3IucHJvdG90eXBlIHx8IFNldCRwcm90b3R5cGU7XG4gICAgICAgICAgICBvYmogPSBvYmogfHwgY3JlYXRlKHByb3RvdHlwZSk7XG4gICAgICAgICAgICBkZWZpbmVQcm9wZXJ0aWVzKG9iaiwgeyBfZXM2c2V0OiB0cnVlIH0pO1xuICAgICAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFN3aXRjaCBmcm9tIHRoZSBvYmplY3QgYmFja2luZyBzdG9yYWdlIHRvIGEgZnVsbCBNYXAuXG4gICAgICAgIHZhciBlbnN1cmVNYXAgPSBmdW5jdGlvbiBlbnN1cmVNYXAoc2V0KSB7XG4gICAgICAgICAgaWYgKCFzZXRbJ1tbU2V0RGF0YV1dJ10pIHtcbiAgICAgICAgICAgIHZhciBtID0gc2V0WydbW1NldERhdGFdXSddID0gbmV3IGNvbGxlY3Rpb25TaGltcy5NYXAoKTtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKHNldC5fc3RvcmFnZSkuZm9yRWFjaChmdW5jdGlvbiAoaykge1xuICAgICAgICAgICAgICAvLyBmYXN0IGNoZWNrIGZvciBsZWFkaW5nICckJ1xuICAgICAgICAgICAgICBpZiAoay5jaGFyQ29kZUF0KDApID09PSAzNikge1xuICAgICAgICAgICAgICAgIGsgPSBrLnNsaWNlKDEpO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGsuY2hhckF0KDApID09PSAnbicpIHtcbiAgICAgICAgICAgICAgICBrID0gK2suc2xpY2UoMSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgayA9ICtrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG0uc2V0KGssIGspO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzZXQuX3N0b3JhZ2UgPSBudWxsOyAvLyBmcmVlIG9sZCBiYWNraW5nIHN0b3JhZ2VcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFNldFNoaW0ucHJvdG90eXBlLCAnc2l6ZScsIHtcbiAgICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuX3N0b3JhZ2UgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9wYXVsbWlsbHIvZXM2LXNoaW0vaXNzdWVzLzE3NlxuICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdzaXplIG1ldGhvZCBjYWxsZWQgb24gaW5jb21wYXRpYmxlIFNldCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZW5zdXJlTWFwKHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbJ1tbU2V0RGF0YV1dJ10uc2l6ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGRlZmluZVByb3BlcnRpZXMoU2V0U2hpbS5wcm90b3R5cGUsIHtcbiAgICAgICAgICBoYXM6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIHZhciBma2V5O1xuICAgICAgICAgICAgaWYgKHRoaXMuX3N0b3JhZ2UgJiYgKGZrZXkgPSBmYXN0a2V5KGtleSkpICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJldHVybiAhIXRoaXMuX3N0b3JhZ2VbZmtleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbnN1cmVNYXAodGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpc1snW1tTZXREYXRhXV0nXS5oYXMoa2V5KTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgYWRkOiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICB2YXIgZmtleTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9zdG9yYWdlICYmIChma2V5ID0gZmFzdGtleShrZXkpKSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICB0aGlzLl9zdG9yYWdlW2ZrZXldID0gdHJ1ZTtcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbnN1cmVNYXAodGhpcyk7XG4gICAgICAgICAgICB0aGlzWydbW1NldERhdGFdXSddLnNldChrZXksIGtleSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgJ2RlbGV0ZSc6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIHZhciBma2V5O1xuICAgICAgICAgICAgaWYgKHRoaXMuX3N0b3JhZ2UgJiYgKGZrZXkgPSBmYXN0a2V5KGtleSkpICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHZhciBoYXNGS2V5ID0gX2hhc093blByb3BlcnR5LmNhbGwodGhpcy5fc3RvcmFnZSwgZmtleSk7XG4gICAgICAgICAgICAgIHJldHVybiAoZGVsZXRlIHRoaXMuX3N0b3JhZ2VbZmtleV0pICYmIGhhc0ZLZXk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbnN1cmVNYXAodGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpc1snW1tTZXREYXRhXV0nXVsnZGVsZXRlJ10oa2V5KTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgY2xlYXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9zdG9yYWdlKSB7XG4gICAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2UgPSBlbXB0eU9iamVjdCgpO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpc1snW1tTZXREYXRhXV0nXS5jbGVhcigpO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICB2YWx1ZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGVuc3VyZU1hcCh0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzWydbW1NldERhdGFdXSddLnZhbHVlcygpO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBlbnRyaWVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBlbnN1cmVNYXAodGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpc1snW1tTZXREYXRhXV0nXS5lbnRyaWVzKCk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGZvckVhY2g6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IG51bGw7XG4gICAgICAgICAgICB2YXIgZW50aXJlU2V0ID0gdGhpcztcbiAgICAgICAgICAgIGVuc3VyZU1hcChlbnRpcmVTZXQpO1xuICAgICAgICAgICAgdGhpc1snW1tTZXREYXRhXV0nXS5mb3JFYWNoKGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbChjb250ZXh0LCBrZXksIGtleSwgZW50aXJlU2V0KTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhrZXksIGtleSwgZW50aXJlU2V0KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgZGVmaW5lUHJvcGVydHkoU2V0U2hpbSwgJ2tleXMnLCBTZXRTaGltLnZhbHVlcywgdHJ1ZSk7XG4gICAgICAgIGFkZEl0ZXJhdG9yKFNldFNoaW0ucHJvdG90eXBlLCBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLnZhbHVlcygpOyB9KTtcblxuICAgICAgICByZXR1cm4gU2V0U2hpbTtcbiAgICAgIH0pKClcbiAgICB9O1xuICAgIGRlZmluZVByb3BlcnRpZXMoZ2xvYmFscywgY29sbGVjdGlvblNoaW1zKTtcblxuICAgIGlmIChnbG9iYWxzLk1hcCB8fCBnbG9iYWxzLlNldCkge1xuICAgICAgLypcbiAgICAgICAgLSBJbiBGaXJlZm94IDwgMjMsIE1hcCNzaXplIGlzIGEgZnVuY3Rpb24uXG4gICAgICAgIC0gSW4gYWxsIGN1cnJlbnQgRmlyZWZveCwgU2V0I2VudHJpZXMva2V5cy92YWx1ZXMgJiBNYXAjY2xlYXIgZG8gbm90IGV4aXN0XG4gICAgICAgIC0gaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9ODY5OTk2XG4gICAgICAgIC0gSW4gRmlyZWZveCAyNCwgTWFwIGFuZCBTZXQgZG8gbm90IGltcGxlbWVudCBmb3JFYWNoXG4gICAgICAgIC0gSW4gRmlyZWZveCAyNSBhdCBsZWFzdCwgTWFwIGFuZCBTZXQgYXJlIGNhbGxhYmxlIHdpdGhvdXQgXCJuZXdcIlxuICAgICAgKi9cbiAgICAgIGlmIChcbiAgICAgICAgdHlwZW9mIGdsb2JhbHMuTWFwLnByb3RvdHlwZS5jbGVhciAhPT0gJ2Z1bmN0aW9uJyB8fFxuICAgICAgICBuZXcgZ2xvYmFscy5TZXQoKS5zaXplICE9PSAwIHx8XG4gICAgICAgIG5ldyBnbG9iYWxzLk1hcCgpLnNpemUgIT09IDAgfHxcbiAgICAgICAgdHlwZW9mIGdsb2JhbHMuTWFwLnByb3RvdHlwZS5rZXlzICE9PSAnZnVuY3Rpb24nIHx8XG4gICAgICAgIHR5cGVvZiBnbG9iYWxzLlNldC5wcm90b3R5cGUua2V5cyAhPT0gJ2Z1bmN0aW9uJyB8fFxuICAgICAgICB0eXBlb2YgZ2xvYmFscy5NYXAucHJvdG90eXBlLmZvckVhY2ggIT09ICdmdW5jdGlvbicgfHxcbiAgICAgICAgdHlwZW9mIGdsb2JhbHMuU2V0LnByb3RvdHlwZS5mb3JFYWNoICE9PSAnZnVuY3Rpb24nIHx8XG4gICAgICAgIGlzQ2FsbGFibGVXaXRob3V0TmV3KGdsb2JhbHMuTWFwKSB8fFxuICAgICAgICBpc0NhbGxhYmxlV2l0aG91dE5ldyhnbG9iYWxzLlNldCkgfHxcbiAgICAgICAgIXN1cHBvcnRzU3ViY2xhc3NpbmcoZ2xvYmFscy5NYXAsIGZ1bmN0aW9uIChNKSB7XG4gICAgICAgICAgdmFyIG0gPSBuZXcgTShbXSk7XG4gICAgICAgICAgLy8gRmlyZWZveCAzMiBpcyBvayB3aXRoIHRoZSBpbnN0YW50aWF0aW5nIHRoZSBzdWJjbGFzcyBidXQgd2lsbFxuICAgICAgICAgIC8vIHRocm93IHdoZW4gdGhlIG1hcCBpcyB1c2VkLlxuICAgICAgICAgIG0uc2V0KDQyLCA0Mik7XG4gICAgICAgICAgcmV0dXJuIG0gaW5zdGFuY2VvZiBNO1xuICAgICAgICB9KVxuICAgICAgKSB7XG4gICAgICAgIGdsb2JhbHMuTWFwID0gY29sbGVjdGlvblNoaW1zLk1hcDtcbiAgICAgICAgZ2xvYmFscy5TZXQgPSBjb2xsZWN0aW9uU2hpbXMuU2V0O1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZ2xvYmFscy5TZXQucHJvdG90eXBlLmtleXMgIT09IGdsb2JhbHMuU2V0LnByb3RvdHlwZS52YWx1ZXMpIHtcbiAgICAgIGRlZmluZVByb3BlcnR5KGdsb2JhbHMuU2V0LnByb3RvdHlwZSwgJ2tleXMnLCBnbG9iYWxzLlNldC5wcm90b3R5cGUudmFsdWVzLCB0cnVlKTtcbiAgICB9XG4gICAgLy8gU2hpbSBpbmNvbXBsZXRlIGl0ZXJhdG9yIGltcGxlbWVudGF0aW9ucy5cbiAgICBhZGRJdGVyYXRvcihPYmplY3QuZ2V0UHJvdG90eXBlT2YoKG5ldyBnbG9iYWxzLk1hcCgpKS5rZXlzKCkpKTtcbiAgICBhZGRJdGVyYXRvcihPYmplY3QuZ2V0UHJvdG90eXBlT2YoKG5ldyBnbG9iYWxzLlNldCgpKS5rZXlzKCkpKTtcbiAgfVxuXG4gIHJldHVybiBnbG9iYWxzO1xufSkpO1xuXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpKSIsIid1c2Ugc3RyaWN0JztcblxuaWYgKCFyZXF1aXJlKCcuL2lzLWltcGxlbWVudGVkJykoKSkge1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkocmVxdWlyZSgnZXM1LWV4dC9nbG9iYWwnKSwgJ1N5bWJvbCcsXG5cdFx0eyB2YWx1ZTogcmVxdWlyZSgnLi9wb2x5ZmlsbCcpLCBjb25maWd1cmFibGU6IHRydWUsIGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdFx0d3JpdGFibGU6IHRydWUgfSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgc3ltYm9sO1xuXHRpZiAodHlwZW9mIFN5bWJvbCAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGZhbHNlO1xuXHRzeW1ib2wgPSBTeW1ib2woJ3Rlc3Qgc3ltYm9sJyk7XG5cdHRyeSB7IFN0cmluZyhzeW1ib2wpOyB9IGNhdGNoIChlKSB7IHJldHVybiBmYWxzZTsgfVxuXHRpZiAodHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gJ3N5bWJvbCcpIHJldHVybiB0cnVlO1xuXG5cdC8vIFJldHVybiAndHJ1ZScgZm9yIHBvbHlmaWxsc1xuXHRpZiAodHlwZW9mIFN5bWJvbC5pc0NvbmNhdFNwcmVhZGFibGUgIT09ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG5cdGlmICh0eXBlb2YgU3ltYm9sLmlzUmVnRXhwICE9PSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuXHRpZiAodHlwZW9mIFN5bWJvbC5pdGVyYXRvciAhPT0gJ29iamVjdCcpIHJldHVybiBmYWxzZTtcblx0aWYgKHR5cGVvZiBTeW1ib2wudG9QcmltaXRpdmUgIT09ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG5cdGlmICh0eXBlb2YgU3ltYm9sLnRvU3RyaW5nVGFnICE9PSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuXHRpZiAodHlwZW9mIFN5bWJvbC51bnNjb3BhYmxlcyAhPT0gJ29iamVjdCcpIHJldHVybiBmYWxzZTtcblxuXHRyZXR1cm4gdHJ1ZTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBhc3NpZ24gICAgICAgID0gcmVxdWlyZSgnZXM1LWV4dC9vYmplY3QvYXNzaWduJylcbiAgLCBub3JtYWxpemVPcHRzID0gcmVxdWlyZSgnZXM1LWV4dC9vYmplY3Qvbm9ybWFsaXplLW9wdGlvbnMnKVxuICAsIGlzQ2FsbGFibGUgICAgPSByZXF1aXJlKCdlczUtZXh0L29iamVjdC9pcy1jYWxsYWJsZScpXG4gICwgY29udGFpbnMgICAgICA9IHJlcXVpcmUoJ2VzNS1leHQvc3RyaW5nLyMvY29udGFpbnMnKVxuXG4gICwgZDtcblxuZCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGRzY3IsIHZhbHVlLyosIG9wdGlvbnMqLykge1xuXHR2YXIgYywgZSwgdywgb3B0aW9ucywgZGVzYztcblx0aWYgKChhcmd1bWVudHMubGVuZ3RoIDwgMikgfHwgKHR5cGVvZiBkc2NyICE9PSAnc3RyaW5nJykpIHtcblx0XHRvcHRpb25zID0gdmFsdWU7XG5cdFx0dmFsdWUgPSBkc2NyO1xuXHRcdGRzY3IgPSBudWxsO1xuXHR9IGVsc2Uge1xuXHRcdG9wdGlvbnMgPSBhcmd1bWVudHNbMl07XG5cdH1cblx0aWYgKGRzY3IgPT0gbnVsbCkge1xuXHRcdGMgPSB3ID0gdHJ1ZTtcblx0XHRlID0gZmFsc2U7XG5cdH0gZWxzZSB7XG5cdFx0YyA9IGNvbnRhaW5zLmNhbGwoZHNjciwgJ2MnKTtcblx0XHRlID0gY29udGFpbnMuY2FsbChkc2NyLCAnZScpO1xuXHRcdHcgPSBjb250YWlucy5jYWxsKGRzY3IsICd3Jyk7XG5cdH1cblxuXHRkZXNjID0geyB2YWx1ZTogdmFsdWUsIGNvbmZpZ3VyYWJsZTogYywgZW51bWVyYWJsZTogZSwgd3JpdGFibGU6IHcgfTtcblx0cmV0dXJuICFvcHRpb25zID8gZGVzYyA6IGFzc2lnbihub3JtYWxpemVPcHRzKG9wdGlvbnMpLCBkZXNjKTtcbn07XG5cbmQuZ3MgPSBmdW5jdGlvbiAoZHNjciwgZ2V0LCBzZXQvKiwgb3B0aW9ucyovKSB7XG5cdHZhciBjLCBlLCBvcHRpb25zLCBkZXNjO1xuXHRpZiAodHlwZW9mIGRzY3IgIT09ICdzdHJpbmcnKSB7XG5cdFx0b3B0aW9ucyA9IHNldDtcblx0XHRzZXQgPSBnZXQ7XG5cdFx0Z2V0ID0gZHNjcjtcblx0XHRkc2NyID0gbnVsbDtcblx0fSBlbHNlIHtcblx0XHRvcHRpb25zID0gYXJndW1lbnRzWzNdO1xuXHR9XG5cdGlmIChnZXQgPT0gbnVsbCkge1xuXHRcdGdldCA9IHVuZGVmaW5lZDtcblx0fSBlbHNlIGlmICghaXNDYWxsYWJsZShnZXQpKSB7XG5cdFx0b3B0aW9ucyA9IGdldDtcblx0XHRnZXQgPSBzZXQgPSB1bmRlZmluZWQ7XG5cdH0gZWxzZSBpZiAoc2V0ID09IG51bGwpIHtcblx0XHRzZXQgPSB1bmRlZmluZWQ7XG5cdH0gZWxzZSBpZiAoIWlzQ2FsbGFibGUoc2V0KSkge1xuXHRcdG9wdGlvbnMgPSBzZXQ7XG5cdFx0c2V0ID0gdW5kZWZpbmVkO1xuXHR9XG5cdGlmIChkc2NyID09IG51bGwpIHtcblx0XHRjID0gdHJ1ZTtcblx0XHRlID0gZmFsc2U7XG5cdH0gZWxzZSB7XG5cdFx0YyA9IGNvbnRhaW5zLmNhbGwoZHNjciwgJ2MnKTtcblx0XHRlID0gY29udGFpbnMuY2FsbChkc2NyLCAnZScpO1xuXHR9XG5cblx0ZGVzYyA9IHsgZ2V0OiBnZXQsIHNldDogc2V0LCBjb25maWd1cmFibGU6IGMsIGVudW1lcmFibGU6IGUgfTtcblx0cmV0dXJuICFvcHRpb25zID8gZGVzYyA6IGFzc2lnbihub3JtYWxpemVPcHRzKG9wdGlvbnMpLCBkZXNjKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEZ1bmN0aW9uKFwicmV0dXJuIHRoaXNcIikoKTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2lzLWltcGxlbWVudGVkJykoKVxuXHQ/IE9iamVjdC5hc3NpZ25cblx0OiByZXF1aXJlKCcuL3NoaW0nKTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBhc3NpZ24gPSBPYmplY3QuYXNzaWduLCBvYmo7XG5cdGlmICh0eXBlb2YgYXNzaWduICE9PSAnZnVuY3Rpb24nKSByZXR1cm4gZmFsc2U7XG5cdG9iaiA9IHsgZm9vOiAncmF6JyB9O1xuXHRhc3NpZ24ob2JqLCB7IGJhcjogJ2R3YScgfSwgeyB0cnp5OiAndHJ6eScgfSk7XG5cdHJldHVybiAob2JqLmZvbyArIG9iai5iYXIgKyBvYmoudHJ6eSkgPT09ICdyYXpkd2F0cnp5Jztcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBrZXlzICA9IHJlcXVpcmUoJy4uL2tleXMnKVxuICAsIHZhbHVlID0gcmVxdWlyZSgnLi4vdmFsaWQtdmFsdWUnKVxuXG4gICwgbWF4ID0gTWF0aC5tYXg7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGRlc3QsIHNyYy8qLCDigKZzcmNuKi8pIHtcblx0dmFyIGVycm9yLCBpLCBsID0gbWF4KGFyZ3VtZW50cy5sZW5ndGgsIDIpLCBhc3NpZ247XG5cdGRlc3QgPSBPYmplY3QodmFsdWUoZGVzdCkpO1xuXHRhc3NpZ24gPSBmdW5jdGlvbiAoa2V5KSB7XG5cdFx0dHJ5IHsgZGVzdFtrZXldID0gc3JjW2tleV07IH0gY2F0Y2ggKGUpIHtcblx0XHRcdGlmICghZXJyb3IpIGVycm9yID0gZTtcblx0XHR9XG5cdH07XG5cdGZvciAoaSA9IDE7IGkgPCBsOyArK2kpIHtcblx0XHRzcmMgPSBhcmd1bWVudHNbaV07XG5cdFx0a2V5cyhzcmMpLmZvckVhY2goYXNzaWduKTtcblx0fVxuXHRpZiAoZXJyb3IgIT09IHVuZGVmaW5lZCkgdGhyb3cgZXJyb3I7XG5cdHJldHVybiBkZXN0O1xufTtcbiIsIi8vIERlcHJlY2F0ZWRcblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdmdW5jdGlvbic7IH07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9pcy1pbXBsZW1lbnRlZCcpKClcblx0PyBPYmplY3Qua2V5c1xuXHQ6IHJlcXVpcmUoJy4vc2hpbScpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcblx0dHJ5IHtcblx0XHRPYmplY3Qua2V5cygncHJpbWl0aXZlJyk7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH0gY2F0Y2ggKGUpIHsgcmV0dXJuIGZhbHNlOyB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIga2V5cyA9IE9iamVjdC5rZXlzO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmplY3QpIHtcblx0cmV0dXJuIGtleXMob2JqZWN0ID09IG51bGwgPyBvYmplY3QgOiBPYmplY3Qob2JqZWN0KSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYXNzaWduID0gcmVxdWlyZSgnLi9hc3NpZ24nKVxuXG4gICwgZm9yRWFjaCA9IEFycmF5LnByb3RvdHlwZS5mb3JFYWNoXG4gICwgY3JlYXRlID0gT2JqZWN0LmNyZWF0ZSwgZ2V0UHJvdG90eXBlT2YgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2ZcblxuICAsIHByb2Nlc3M7XG5cbnByb2Nlc3MgPSBmdW5jdGlvbiAoc3JjLCBvYmopIHtcblx0dmFyIHByb3RvID0gZ2V0UHJvdG90eXBlT2Yoc3JjKTtcblx0cmV0dXJuIGFzc2lnbihwcm90byA/IHByb2Nlc3MocHJvdG8sIG9iaikgOiBvYmosIHNyYyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvcHRpb25zLyosIOKApm9wdGlvbnMqLykge1xuXHR2YXIgcmVzdWx0ID0gY3JlYXRlKG51bGwpO1xuXHRmb3JFYWNoLmNhbGwoYXJndW1lbnRzLCBmdW5jdGlvbiAob3B0aW9ucykge1xuXHRcdGlmIChvcHRpb25zID09IG51bGwpIHJldHVybjtcblx0XHRwcm9jZXNzKE9iamVjdChvcHRpb25zKSwgcmVzdWx0KTtcblx0fSk7XG5cdHJldHVybiByZXN1bHQ7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRpZiAodmFsdWUgPT0gbnVsbCkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB1c2UgbnVsbCBvciB1bmRlZmluZWRcIik7XG5cdHJldHVybiB2YWx1ZTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9pcy1pbXBsZW1lbnRlZCcpKClcblx0PyBTdHJpbmcucHJvdG90eXBlLmNvbnRhaW5zXG5cdDogcmVxdWlyZSgnLi9zaGltJyk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBzdHIgPSAncmF6ZHdhdHJ6eSc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuXHRpZiAodHlwZW9mIHN0ci5jb250YWlucyAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGZhbHNlO1xuXHRyZXR1cm4gKChzdHIuY29udGFpbnMoJ2R3YScpID09PSB0cnVlKSAmJiAoc3RyLmNvbnRhaW5zKCdmb28nKSA9PT0gZmFsc2UpKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBpbmRleE9mID0gU3RyaW5nLnByb3RvdHlwZS5pbmRleE9mO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzZWFyY2hTdHJpbmcvKiwgcG9zaXRpb24qLykge1xuXHRyZXR1cm4gaW5kZXhPZi5jYWxsKHRoaXMsIHNlYXJjaFN0cmluZywgYXJndW1lbnRzWzFdKSA+IC0xO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGQgPSByZXF1aXJlKCdkJylcblxuICAsIGNyZWF0ZSA9IE9iamVjdC5jcmVhdGUsIGRlZmluZVByb3BlcnRpZXMgPSBPYmplY3QuZGVmaW5lUHJvcGVydGllc1xuICAsIGdlbmVyYXRlTmFtZSwgU3ltYm9sO1xuXG5nZW5lcmF0ZU5hbWUgPSAoZnVuY3Rpb24gKCkge1xuXHR2YXIgY3JlYXRlZCA9IGNyZWF0ZShudWxsKTtcblx0cmV0dXJuIGZ1bmN0aW9uIChkZXNjKSB7XG5cdFx0dmFyIHBvc3RmaXggPSAwO1xuXHRcdHdoaWxlIChjcmVhdGVkW2Rlc2MgKyAocG9zdGZpeCB8fCAnJyldKSArK3Bvc3RmaXg7XG5cdFx0ZGVzYyArPSAocG9zdGZpeCB8fCAnJyk7XG5cdFx0Y3JlYXRlZFtkZXNjXSA9IHRydWU7XG5cdFx0cmV0dXJuICdAQCcgKyBkZXNjO1xuXHR9O1xufSgpKTtcblxubW9kdWxlLmV4cG9ydHMgPSBTeW1ib2wgPSBmdW5jdGlvbiAoZGVzY3JpcHRpb24pIHtcblx0dmFyIHN5bWJvbDtcblx0aWYgKHRoaXMgaW5zdGFuY2VvZiBTeW1ib2wpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdUeXBlRXJyb3I6IFN5bWJvbCBpcyBub3QgYSBjb25zdHJ1Y3RvcicpO1xuXHR9XG5cdHN5bWJvbCA9IGNyZWF0ZShTeW1ib2wucHJvdG90eXBlKTtcblx0ZGVzY3JpcHRpb24gPSAoZGVzY3JpcHRpb24gPT09IHVuZGVmaW5lZCA/ICcnIDogU3RyaW5nKGRlc2NyaXB0aW9uKSk7XG5cdHJldHVybiBkZWZpbmVQcm9wZXJ0aWVzKHN5bWJvbCwge1xuXHRcdF9fZGVzY3JpcHRpb25fXzogZCgnJywgZGVzY3JpcHRpb24pLFxuXHRcdF9fbmFtZV9fOiBkKCcnLCBnZW5lcmF0ZU5hbWUoZGVzY3JpcHRpb24pKVxuXHR9KTtcbn07XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFN5bWJvbCwge1xuXHRjcmVhdGU6IGQoJycsIFN5bWJvbCgnY3JlYXRlJykpLFxuXHRoYXNJbnN0YW5jZTogZCgnJywgU3ltYm9sKCdoYXNJbnN0YW5jZScpKSxcblx0aXNDb25jYXRTcHJlYWRhYmxlOiBkKCcnLCBTeW1ib2woJ2lzQ29uY2F0U3ByZWFkYWJsZScpKSxcblx0aXNSZWdFeHA6IGQoJycsIFN5bWJvbCgnaXNSZWdFeHAnKSksXG5cdGl0ZXJhdG9yOiBkKCcnLCBTeW1ib2woJ2l0ZXJhdG9yJykpLFxuXHR0b1ByaW1pdGl2ZTogZCgnJywgU3ltYm9sKCd0b1ByaW1pdGl2ZScpKSxcblx0dG9TdHJpbmdUYWc6IGQoJycsIFN5bWJvbCgndG9TdHJpbmdUYWcnKSksXG5cdHVuc2NvcGFibGVzOiBkKCcnLCBTeW1ib2woJ3Vuc2NvcGFibGVzJykpXG59KTtcblxuZGVmaW5lUHJvcGVydGllcyhTeW1ib2wucHJvdG90eXBlLCB7XG5cdHByb3BlclRvU3RyaW5nOiBkKGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gJ1N5bWJvbCAoJyArIHRoaXMuX19kZXNjcmlwdGlvbl9fICsgJyknO1xuXHR9KSxcblx0dG9TdHJpbmc6IGQoJycsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX19uYW1lX187IH0pXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTeW1ib2wucHJvdG90eXBlLCBTeW1ib2wudG9QcmltaXRpdmUsIGQoJycsXG5cdGZ1bmN0aW9uIChoaW50KSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihcIkNvbnZlcnNpb24gb2Ygc3ltYm9sIG9iamVjdHMgaXMgbm90IGFsbG93ZWRcIik7XG5cdH0pKTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTeW1ib2wucHJvdG90eXBlLCBTeW1ib2wudG9TdHJpbmdUYWcsIGQoJ2MnLCAnU3ltYm9sJykpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9saWIvNnRvNS9wb2x5ZmlsbFwiKTtcbiIsbnVsbCwiLy8gaHR0cDovL3dpa2kuY29tbW9uanMub3JnL3dpa2kvVW5pdF9UZXN0aW5nLzEuMFxuLy9cbi8vIFRISVMgSVMgTk9UIFRFU1RFRCBOT1IgTElLRUxZIFRPIFdPUksgT1VUU0lERSBWOCFcbi8vXG4vLyBPcmlnaW5hbGx5IGZyb20gbmFyd2hhbC5qcyAoaHR0cDovL25hcndoYWxqcy5vcmcpXG4vLyBDb3B5cmlnaHQgKGMpIDIwMDkgVGhvbWFzIFJvYmluc29uIDwyODBub3J0aC5jb20+XG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuLy8gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgJ1NvZnR3YXJlJyksIHRvXG4vLyBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZVxuLy8gcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yXG4vLyBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuLy8gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuLy8gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEICdBUyBJUycsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1Jcbi8vIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuLy8gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4vLyBBVVRIT1JTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTlxuLy8gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTlxuLy8gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIHdoZW4gdXNlZCBpbiBub2RlLCB0aGlzIHdpbGwgYWN0dWFsbHkgbG9hZCB0aGUgdXRpbCBtb2R1bGUgd2UgZGVwZW5kIG9uXG4vLyB2ZXJzdXMgbG9hZGluZyB0aGUgYnVpbHRpbiB1dGlsIG1vZHVsZSBhcyBoYXBwZW5zIG90aGVyd2lzZVxuLy8gdGhpcyBpcyBhIGJ1ZyBpbiBub2RlIG1vZHVsZSBsb2FkaW5nIGFzIGZhciBhcyBJIGFtIGNvbmNlcm5lZFxudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsLycpO1xuXG52YXIgcFNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xudmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbi8vIDEuIFRoZSBhc3NlcnQgbW9kdWxlIHByb3ZpZGVzIGZ1bmN0aW9ucyB0aGF0IHRocm93XG4vLyBBc3NlcnRpb25FcnJvcidzIHdoZW4gcGFydGljdWxhciBjb25kaXRpb25zIGFyZSBub3QgbWV0LiBUaGVcbi8vIGFzc2VydCBtb2R1bGUgbXVzdCBjb25mb3JtIHRvIHRoZSBmb2xsb3dpbmcgaW50ZXJmYWNlLlxuXG52YXIgYXNzZXJ0ID0gbW9kdWxlLmV4cG9ydHMgPSBvaztcblxuLy8gMi4gVGhlIEFzc2VydGlvbkVycm9yIGlzIGRlZmluZWQgaW4gYXNzZXJ0LlxuLy8gbmV3IGFzc2VydC5Bc3NlcnRpb25FcnJvcih7IG1lc3NhZ2U6IG1lc3NhZ2UsXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0dWFsOiBhY3R1YWwsXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IGV4cGVjdGVkIH0pXG5cbmFzc2VydC5Bc3NlcnRpb25FcnJvciA9IGZ1bmN0aW9uIEFzc2VydGlvbkVycm9yKG9wdGlvbnMpIHtcbiAgdGhpcy5uYW1lID0gJ0Fzc2VydGlvbkVycm9yJztcbiAgdGhpcy5hY3R1YWwgPSBvcHRpb25zLmFjdHVhbDtcbiAgdGhpcy5leHBlY3RlZCA9IG9wdGlvbnMuZXhwZWN0ZWQ7XG4gIHRoaXMub3BlcmF0b3IgPSBvcHRpb25zLm9wZXJhdG9yO1xuICBpZiAob3B0aW9ucy5tZXNzYWdlKSB7XG4gICAgdGhpcy5tZXNzYWdlID0gb3B0aW9ucy5tZXNzYWdlO1xuICAgIHRoaXMuZ2VuZXJhdGVkTWVzc2FnZSA9IGZhbHNlO1xuICB9IGVsc2Uge1xuICAgIHRoaXMubWVzc2FnZSA9IGdldE1lc3NhZ2UodGhpcyk7XG4gICAgdGhpcy5nZW5lcmF0ZWRNZXNzYWdlID0gdHJ1ZTtcbiAgfVxuICB2YXIgc3RhY2tTdGFydEZ1bmN0aW9uID0gb3B0aW9ucy5zdGFja1N0YXJ0RnVuY3Rpb24gfHwgZmFpbDtcblxuICBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIHtcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBzdGFja1N0YXJ0RnVuY3Rpb24pO1xuICB9XG4gIGVsc2Uge1xuICAgIC8vIG5vbiB2OCBicm93c2VycyBzbyB3ZSBjYW4gaGF2ZSBhIHN0YWNrdHJhY2VcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKCk7XG4gICAgaWYgKGVyci5zdGFjaykge1xuICAgICAgdmFyIG91dCA9IGVyci5zdGFjaztcblxuICAgICAgLy8gdHJ5IHRvIHN0cmlwIHVzZWxlc3MgZnJhbWVzXG4gICAgICB2YXIgZm5fbmFtZSA9IHN0YWNrU3RhcnRGdW5jdGlvbi5uYW1lO1xuICAgICAgdmFyIGlkeCA9IG91dC5pbmRleE9mKCdcXG4nICsgZm5fbmFtZSk7XG4gICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgLy8gb25jZSB3ZSBoYXZlIGxvY2F0ZWQgdGhlIGZ1bmN0aW9uIGZyYW1lXG4gICAgICAgIC8vIHdlIG5lZWQgdG8gc3RyaXAgb3V0IGV2ZXJ5dGhpbmcgYmVmb3JlIGl0IChhbmQgaXRzIGxpbmUpXG4gICAgICAgIHZhciBuZXh0X2xpbmUgPSBvdXQuaW5kZXhPZignXFxuJywgaWR4ICsgMSk7XG4gICAgICAgIG91dCA9IG91dC5zdWJzdHJpbmcobmV4dF9saW5lICsgMSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuc3RhY2sgPSBvdXQ7XG4gICAgfVxuICB9XG59O1xuXG4vLyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IgaW5zdGFuY2VvZiBFcnJvclxudXRpbC5pbmhlcml0cyhhc3NlcnQuQXNzZXJ0aW9uRXJyb3IsIEVycm9yKTtcblxuZnVuY3Rpb24gcmVwbGFjZXIoa2V5LCB2YWx1ZSkge1xuICBpZiAodXRpbC5pc1VuZGVmaW5lZCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gJycgKyB2YWx1ZTtcbiAgfVxuICBpZiAodXRpbC5pc051bWJlcih2YWx1ZSkgJiYgKGlzTmFOKHZhbHVlKSB8fCAhaXNGaW5pdGUodmFsdWUpKSkge1xuICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpO1xuICB9XG4gIGlmICh1dGlsLmlzRnVuY3Rpb24odmFsdWUpIHx8IHV0aWwuaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlLnRvU3RyaW5nKCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiB0cnVuY2F0ZShzLCBuKSB7XG4gIGlmICh1dGlsLmlzU3RyaW5nKHMpKSB7XG4gICAgcmV0dXJuIHMubGVuZ3RoIDwgbiA/IHMgOiBzLnNsaWNlKDAsIG4pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldE1lc3NhZ2Uoc2VsZikge1xuICByZXR1cm4gdHJ1bmNhdGUoSlNPTi5zdHJpbmdpZnkoc2VsZi5hY3R1YWwsIHJlcGxhY2VyKSwgMTI4KSArICcgJyArXG4gICAgICAgICBzZWxmLm9wZXJhdG9yICsgJyAnICtcbiAgICAgICAgIHRydW5jYXRlKEpTT04uc3RyaW5naWZ5KHNlbGYuZXhwZWN0ZWQsIHJlcGxhY2VyKSwgMTI4KTtcbn1cblxuLy8gQXQgcHJlc2VudCBvbmx5IHRoZSB0aHJlZSBrZXlzIG1lbnRpb25lZCBhYm92ZSBhcmUgdXNlZCBhbmRcbi8vIHVuZGVyc3Rvb2QgYnkgdGhlIHNwZWMuIEltcGxlbWVudGF0aW9ucyBvciBzdWIgbW9kdWxlcyBjYW4gcGFzc1xuLy8gb3RoZXIga2V5cyB0byB0aGUgQXNzZXJ0aW9uRXJyb3IncyBjb25zdHJ1Y3RvciAtIHRoZXkgd2lsbCBiZVxuLy8gaWdub3JlZC5cblxuLy8gMy4gQWxsIG9mIHRoZSBmb2xsb3dpbmcgZnVuY3Rpb25zIG11c3QgdGhyb3cgYW4gQXNzZXJ0aW9uRXJyb3Jcbi8vIHdoZW4gYSBjb3JyZXNwb25kaW5nIGNvbmRpdGlvbiBpcyBub3QgbWV0LCB3aXRoIGEgbWVzc2FnZSB0aGF0XG4vLyBtYXkgYmUgdW5kZWZpbmVkIGlmIG5vdCBwcm92aWRlZC4gIEFsbCBhc3NlcnRpb24gbWV0aG9kcyBwcm92aWRlXG4vLyBib3RoIHRoZSBhY3R1YWwgYW5kIGV4cGVjdGVkIHZhbHVlcyB0byB0aGUgYXNzZXJ0aW9uIGVycm9yIGZvclxuLy8gZGlzcGxheSBwdXJwb3Nlcy5cblxuZnVuY3Rpb24gZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCBvcGVyYXRvciwgc3RhY2tTdGFydEZ1bmN0aW9uKSB7XG4gIHRocm93IG5ldyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3Ioe1xuICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgYWN0dWFsOiBhY3R1YWwsXG4gICAgZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuICAgIG9wZXJhdG9yOiBvcGVyYXRvcixcbiAgICBzdGFja1N0YXJ0RnVuY3Rpb246IHN0YWNrU3RhcnRGdW5jdGlvblxuICB9KTtcbn1cblxuLy8gRVhURU5TSU9OISBhbGxvd3MgZm9yIHdlbGwgYmVoYXZlZCBlcnJvcnMgZGVmaW5lZCBlbHNld2hlcmUuXG5hc3NlcnQuZmFpbCA9IGZhaWw7XG5cbi8vIDQuIFB1cmUgYXNzZXJ0aW9uIHRlc3RzIHdoZXRoZXIgYSB2YWx1ZSBpcyB0cnV0aHksIGFzIGRldGVybWluZWRcbi8vIGJ5ICEhZ3VhcmQuXG4vLyBhc3NlcnQub2soZ3VhcmQsIG1lc3NhZ2Vfb3B0KTtcbi8vIFRoaXMgc3RhdGVtZW50IGlzIGVxdWl2YWxlbnQgdG8gYXNzZXJ0LmVxdWFsKHRydWUsICEhZ3VhcmQsXG4vLyBtZXNzYWdlX29wdCk7LiBUbyB0ZXN0IHN0cmljdGx5IGZvciB0aGUgdmFsdWUgdHJ1ZSwgdXNlXG4vLyBhc3NlcnQuc3RyaWN0RXF1YWwodHJ1ZSwgZ3VhcmQsIG1lc3NhZ2Vfb3B0KTsuXG5cbmZ1bmN0aW9uIG9rKHZhbHVlLCBtZXNzYWdlKSB7XG4gIGlmICghdmFsdWUpIGZhaWwodmFsdWUsIHRydWUsIG1lc3NhZ2UsICc9PScsIGFzc2VydC5vayk7XG59XG5hc3NlcnQub2sgPSBvaztcblxuLy8gNS4gVGhlIGVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBzaGFsbG93LCBjb2VyY2l2ZSBlcXVhbGl0eSB3aXRoXG4vLyA9PS5cbi8vIGFzc2VydC5lcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5lcXVhbCA9IGZ1bmN0aW9uIGVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCAhPSBleHBlY3RlZCkgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnPT0nLCBhc3NlcnQuZXF1YWwpO1xufTtcblxuLy8gNi4gVGhlIG5vbi1lcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgZm9yIHdoZXRoZXIgdHdvIG9iamVjdHMgYXJlIG5vdCBlcXVhbFxuLy8gd2l0aCAhPSBhc3NlcnQubm90RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQubm90RXF1YWwgPSBmdW5jdGlvbiBub3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgPT0gZXhwZWN0ZWQpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICchPScsIGFzc2VydC5ub3RFcXVhbCk7XG4gIH1cbn07XG5cbi8vIDcuIFRoZSBlcXVpdmFsZW5jZSBhc3NlcnRpb24gdGVzdHMgYSBkZWVwIGVxdWFsaXR5IHJlbGF0aW9uLlxuLy8gYXNzZXJ0LmRlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5kZWVwRXF1YWwgPSBmdW5jdGlvbiBkZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoIV9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCkpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICdkZWVwRXF1YWwnLCBhc3NlcnQuZGVlcEVxdWFsKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkKSB7XG4gIC8vIDcuMS4gQWxsIGlkZW50aWNhbCB2YWx1ZXMgYXJlIGVxdWl2YWxlbnQsIGFzIGRldGVybWluZWQgYnkgPT09LlxuICBpZiAoYWN0dWFsID09PSBleHBlY3RlZCkge1xuICAgIHJldHVybiB0cnVlO1xuXG4gIH0gZWxzZSBpZiAodXRpbC5pc0J1ZmZlcihhY3R1YWwpICYmIHV0aWwuaXNCdWZmZXIoZXhwZWN0ZWQpKSB7XG4gICAgaWYgKGFjdHVhbC5sZW5ndGggIT0gZXhwZWN0ZWQubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFjdHVhbC5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFjdHVhbFtpXSAhPT0gZXhwZWN0ZWRbaV0pIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcblxuICAvLyA3LjIuIElmIHRoZSBleHBlY3RlZCB2YWx1ZSBpcyBhIERhdGUgb2JqZWN0LCB0aGUgYWN0dWFsIHZhbHVlIGlzXG4gIC8vIGVxdWl2YWxlbnQgaWYgaXQgaXMgYWxzbyBhIERhdGUgb2JqZWN0IHRoYXQgcmVmZXJzIHRvIHRoZSBzYW1lIHRpbWUuXG4gIH0gZWxzZSBpZiAodXRpbC5pc0RhdGUoYWN0dWFsKSAmJiB1dGlsLmlzRGF0ZShleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gYWN0dWFsLmdldFRpbWUoKSA9PT0gZXhwZWN0ZWQuZ2V0VGltZSgpO1xuXG4gIC8vIDcuMyBJZiB0aGUgZXhwZWN0ZWQgdmFsdWUgaXMgYSBSZWdFeHAgb2JqZWN0LCB0aGUgYWN0dWFsIHZhbHVlIGlzXG4gIC8vIGVxdWl2YWxlbnQgaWYgaXQgaXMgYWxzbyBhIFJlZ0V4cCBvYmplY3Qgd2l0aCB0aGUgc2FtZSBzb3VyY2UgYW5kXG4gIC8vIHByb3BlcnRpZXMgKGBnbG9iYWxgLCBgbXVsdGlsaW5lYCwgYGxhc3RJbmRleGAsIGBpZ25vcmVDYXNlYCkuXG4gIH0gZWxzZSBpZiAodXRpbC5pc1JlZ0V4cChhY3R1YWwpICYmIHV0aWwuaXNSZWdFeHAoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGFjdHVhbC5zb3VyY2UgPT09IGV4cGVjdGVkLnNvdXJjZSAmJlxuICAgICAgICAgICBhY3R1YWwuZ2xvYmFsID09PSBleHBlY3RlZC5nbG9iYWwgJiZcbiAgICAgICAgICAgYWN0dWFsLm11bHRpbGluZSA9PT0gZXhwZWN0ZWQubXVsdGlsaW5lICYmXG4gICAgICAgICAgIGFjdHVhbC5sYXN0SW5kZXggPT09IGV4cGVjdGVkLmxhc3RJbmRleCAmJlxuICAgICAgICAgICBhY3R1YWwuaWdub3JlQ2FzZSA9PT0gZXhwZWN0ZWQuaWdub3JlQ2FzZTtcblxuICAvLyA3LjQuIE90aGVyIHBhaXJzIHRoYXQgZG8gbm90IGJvdGggcGFzcyB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCcsXG4gIC8vIGVxdWl2YWxlbmNlIGlzIGRldGVybWluZWQgYnkgPT0uXG4gIH0gZWxzZSBpZiAoIXV0aWwuaXNPYmplY3QoYWN0dWFsKSAmJiAhdXRpbC5pc09iamVjdChleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gYWN0dWFsID09IGV4cGVjdGVkO1xuXG4gIC8vIDcuNSBGb3IgYWxsIG90aGVyIE9iamVjdCBwYWlycywgaW5jbHVkaW5nIEFycmF5IG9iamVjdHMsIGVxdWl2YWxlbmNlIGlzXG4gIC8vIGRldGVybWluZWQgYnkgaGF2aW5nIHRoZSBzYW1lIG51bWJlciBvZiBvd25lZCBwcm9wZXJ0aWVzIChhcyB2ZXJpZmllZFxuICAvLyB3aXRoIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCksIHRoZSBzYW1lIHNldCBvZiBrZXlzXG4gIC8vIChhbHRob3VnaCBub3QgbmVjZXNzYXJpbHkgdGhlIHNhbWUgb3JkZXIpLCBlcXVpdmFsZW50IHZhbHVlcyBmb3IgZXZlcnlcbiAgLy8gY29ycmVzcG9uZGluZyBrZXksIGFuZCBhbiBpZGVudGljYWwgJ3Byb3RvdHlwZScgcHJvcGVydHkuIE5vdGU6IHRoaXNcbiAgLy8gYWNjb3VudHMgZm9yIGJvdGggbmFtZWQgYW5kIGluZGV4ZWQgcHJvcGVydGllcyBvbiBBcnJheXMuXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG9iakVxdWl2KGFjdHVhbCwgZXhwZWN0ZWQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzQXJndW1lbnRzKG9iamVjdCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iamVjdCkgPT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG59XG5cbmZ1bmN0aW9uIG9iakVxdWl2KGEsIGIpIHtcbiAgaWYgKHV0aWwuaXNOdWxsT3JVbmRlZmluZWQoYSkgfHwgdXRpbC5pc051bGxPclVuZGVmaW5lZChiKSlcbiAgICByZXR1cm4gZmFsc2U7XG4gIC8vIGFuIGlkZW50aWNhbCAncHJvdG90eXBlJyBwcm9wZXJ0eS5cbiAgaWYgKGEucHJvdG90eXBlICE9PSBiLnByb3RvdHlwZSkgcmV0dXJuIGZhbHNlO1xuICAvL35+fkkndmUgbWFuYWdlZCB0byBicmVhayBPYmplY3Qua2V5cyB0aHJvdWdoIHNjcmV3eSBhcmd1bWVudHMgcGFzc2luZy5cbiAgLy8gICBDb252ZXJ0aW5nIHRvIGFycmF5IHNvbHZlcyB0aGUgcHJvYmxlbS5cbiAgaWYgKGlzQXJndW1lbnRzKGEpKSB7XG4gICAgaWYgKCFpc0FyZ3VtZW50cyhiKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBhID0gcFNsaWNlLmNhbGwoYSk7XG4gICAgYiA9IHBTbGljZS5jYWxsKGIpO1xuICAgIHJldHVybiBfZGVlcEVxdWFsKGEsIGIpO1xuICB9XG4gIHRyeSB7XG4gICAgdmFyIGthID0gb2JqZWN0S2V5cyhhKSxcbiAgICAgICAga2IgPSBvYmplY3RLZXlzKGIpLFxuICAgICAgICBrZXksIGk7XG4gIH0gY2F0Y2ggKGUpIHsvL2hhcHBlbnMgd2hlbiBvbmUgaXMgYSBzdHJpbmcgbGl0ZXJhbCBhbmQgdGhlIG90aGVyIGlzbid0XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vIGhhdmluZyB0aGUgc2FtZSBudW1iZXIgb2Ygb3duZWQgcHJvcGVydGllcyAoa2V5cyBpbmNvcnBvcmF0ZXNcbiAgLy8gaGFzT3duUHJvcGVydHkpXG4gIGlmIChrYS5sZW5ndGggIT0ga2IubGVuZ3RoKVxuICAgIHJldHVybiBmYWxzZTtcbiAgLy90aGUgc2FtZSBzZXQgb2Yga2V5cyAoYWx0aG91Z2ggbm90IG5lY2Vzc2FyaWx5IHRoZSBzYW1lIG9yZGVyKSxcbiAga2Euc29ydCgpO1xuICBrYi5zb3J0KCk7XG4gIC8vfn5+Y2hlYXAga2V5IHRlc3RcbiAgZm9yIChpID0ga2EubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBpZiAoa2FbaV0gIT0ga2JbaV0pXG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLy9lcXVpdmFsZW50IHZhbHVlcyBmb3IgZXZlcnkgY29ycmVzcG9uZGluZyBrZXksIGFuZFxuICAvL35+fnBvc3NpYmx5IGV4cGVuc2l2ZSBkZWVwIHRlc3RcbiAgZm9yIChpID0ga2EubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBrZXkgPSBrYVtpXTtcbiAgICBpZiAoIV9kZWVwRXF1YWwoYVtrZXldLCBiW2tleV0pKSByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8vIDguIFRoZSBub24tZXF1aXZhbGVuY2UgYXNzZXJ0aW9uIHRlc3RzIGZvciBhbnkgZGVlcCBpbmVxdWFsaXR5LlxuLy8gYXNzZXJ0Lm5vdERlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5ub3REZWVwRXF1YWwgPSBmdW5jdGlvbiBub3REZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkKSkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJ25vdERlZXBFcXVhbCcsIGFzc2VydC5ub3REZWVwRXF1YWwpO1xuICB9XG59O1xuXG4vLyA5LiBUaGUgc3RyaWN0IGVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBzdHJpY3QgZXF1YWxpdHksIGFzIGRldGVybWluZWQgYnkgPT09LlxuLy8gYXNzZXJ0LnN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LnN0cmljdEVxdWFsID0gZnVuY3Rpb24gc3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsICE9PSBleHBlY3RlZCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJz09PScsIGFzc2VydC5zdHJpY3RFcXVhbCk7XG4gIH1cbn07XG5cbi8vIDEwLiBUaGUgc3RyaWN0IG5vbi1lcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgZm9yIHN0cmljdCBpbmVxdWFsaXR5LCBhc1xuLy8gZGV0ZXJtaW5lZCBieSAhPT0uICBhc3NlcnQubm90U3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQubm90U3RyaWN0RXF1YWwgPSBmdW5jdGlvbiBub3RTdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgPT09IGV4cGVjdGVkKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnIT09JywgYXNzZXJ0Lm5vdFN0cmljdEVxdWFsKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLCBleHBlY3RlZCkge1xuICBpZiAoIWFjdHVhbCB8fCAhZXhwZWN0ZWQpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGV4cGVjdGVkKSA9PSAnW29iamVjdCBSZWdFeHBdJykge1xuICAgIHJldHVybiBleHBlY3RlZC50ZXN0KGFjdHVhbCk7XG4gIH0gZWxzZSBpZiAoYWN0dWFsIGluc3RhbmNlb2YgZXhwZWN0ZWQpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChleHBlY3RlZC5jYWxsKHt9LCBhY3R1YWwpID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIF90aHJvd3Moc2hvdWxkVGhyb3csIGJsb2NrLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICB2YXIgYWN0dWFsO1xuXG4gIGlmICh1dGlsLmlzU3RyaW5nKGV4cGVjdGVkKSkge1xuICAgIG1lc3NhZ2UgPSBleHBlY3RlZDtcbiAgICBleHBlY3RlZCA9IG51bGw7XG4gIH1cblxuICB0cnkge1xuICAgIGJsb2NrKCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBhY3R1YWwgPSBlO1xuICB9XG5cbiAgbWVzc2FnZSA9IChleHBlY3RlZCAmJiBleHBlY3RlZC5uYW1lID8gJyAoJyArIGV4cGVjdGVkLm5hbWUgKyAnKS4nIDogJy4nKSArXG4gICAgICAgICAgICAobWVzc2FnZSA/ICcgJyArIG1lc3NhZ2UgOiAnLicpO1xuXG4gIGlmIChzaG91bGRUaHJvdyAmJiAhYWN0dWFsKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCAnTWlzc2luZyBleHBlY3RlZCBleGNlcHRpb24nICsgbWVzc2FnZSk7XG4gIH1cblxuICBpZiAoIXNob3VsZFRocm93ICYmIGV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCwgZXhwZWN0ZWQpKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCAnR290IHVud2FudGVkIGV4Y2VwdGlvbicgKyBtZXNzYWdlKTtcbiAgfVxuXG4gIGlmICgoc2hvdWxkVGhyb3cgJiYgYWN0dWFsICYmIGV4cGVjdGVkICYmXG4gICAgICAhZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLCBleHBlY3RlZCkpIHx8ICghc2hvdWxkVGhyb3cgJiYgYWN0dWFsKSkge1xuICAgIHRocm93IGFjdHVhbDtcbiAgfVxufVxuXG4vLyAxMS4gRXhwZWN0ZWQgdG8gdGhyb3cgYW4gZXJyb3I6XG4vLyBhc3NlcnQudGhyb3dzKGJsb2NrLCBFcnJvcl9vcHQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LnRocm93cyA9IGZ1bmN0aW9uKGJsb2NrLCAvKm9wdGlvbmFsKi9lcnJvciwgLypvcHRpb25hbCovbWVzc2FnZSkge1xuICBfdGhyb3dzLmFwcGx5KHRoaXMsIFt0cnVlXS5jb25jYXQocFNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xufTtcblxuLy8gRVhURU5TSU9OISBUaGlzIGlzIGFubm95aW5nIHRvIHdyaXRlIG91dHNpZGUgdGhpcyBtb2R1bGUuXG5hc3NlcnQuZG9lc05vdFRocm93ID0gZnVuY3Rpb24oYmxvY2ssIC8qb3B0aW9uYWwqL21lc3NhZ2UpIHtcbiAgX3Rocm93cy5hcHBseSh0aGlzLCBbZmFsc2VdLmNvbmNhdChwU2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG59O1xuXG5hc3NlcnQuaWZFcnJvciA9IGZ1bmN0aW9uKGVycikgeyBpZiAoZXJyKSB7dGhyb3cgZXJyO319O1xuXG52YXIgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgdmFyIGtleXMgPSBbXTtcbiAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgIGlmIChoYXNPd24uY2FsbChvYmosIGtleSkpIGtleXMucHVzaChrZXkpO1xuICB9XG4gIHJldHVybiBrZXlzO1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIGZvcm1hdFJlZ0V4cCA9IC8lW3NkaiVdL2c7XG5leHBvcnRzLmZvcm1hdCA9IGZ1bmN0aW9uKGYpIHtcbiAgaWYgKCFpc1N0cmluZyhmKSkge1xuICAgIHZhciBvYmplY3RzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG9iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gIH1cblxuICB2YXIgaSA9IDE7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCA9PT0gJyUlJykgcmV0dXJuICclJztcbiAgICBpZiAoaSA+PSBsZW4pIHJldHVybiB4O1xuICAgIHN3aXRjaCAoeCkge1xuICAgICAgY2FzZSAnJXMnOiByZXR1cm4gU3RyaW5nKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVqJzpcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnc1tpKytdKTtcbiAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfSk7XG4gIGZvciAodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKSB7XG4gICAgaWYgKGlzTnVsbCh4KSB8fCAhaXNPYmplY3QoeCkpIHtcbiAgICAgIHN0ciArPSAnICcgKyB4O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAnICsgaW5zcGVjdCh4KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblxuLy8gTWFyayB0aGF0IGEgbWV0aG9kIHNob3VsZCBub3QgYmUgdXNlZC5cbi8vIFJldHVybnMgYSBtb2RpZmllZCBmdW5jdGlvbiB3aGljaCB3YXJucyBvbmNlIGJ5IGRlZmF1bHQuXG4vLyBJZiAtLW5vLWRlcHJlY2F0aW9uIGlzIHNldCwgdGhlbiBpdCBpcyBhIG5vLW9wLlxuZXhwb3J0cy5kZXByZWNhdGUgPSBmdW5jdGlvbihmbiwgbXNnKSB7XG4gIC8vIEFsbG93IGZvciBkZXByZWNhdGluZyB0aGluZ3MgaW4gdGhlIHByb2Nlc3Mgb2Ygc3RhcnRpbmcgdXAuXG4gIGlmIChpc1VuZGVmaW5lZChnbG9iYWwucHJvY2VzcykpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sIG1zZykuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHByb2Nlc3Mubm9EZXByZWNhdGlvbiA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIHZhciB3YXJuZWQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZGVwcmVjYXRlZCgpIHtcbiAgICBpZiAoIXdhcm5lZCkge1xuICAgICAgaWYgKHByb2Nlc3MudGhyb3dEZXByZWNhdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICAgIH0gZWxzZSBpZiAocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKSB7XG4gICAgICAgIGNvbnNvbGUudHJhY2UobXNnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgIH1cbiAgICAgIHdhcm5lZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgcmV0dXJuIGRlcHJlY2F0ZWQ7XG59O1xuXG5cbnZhciBkZWJ1Z3MgPSB7fTtcbnZhciBkZWJ1Z0Vudmlyb247XG5leHBvcnRzLmRlYnVnbG9nID0gZnVuY3Rpb24oc2V0KSB7XG4gIGlmIChpc1VuZGVmaW5lZChkZWJ1Z0Vudmlyb24pKVxuICAgIGRlYnVnRW52aXJvbiA9IHByb2Nlc3MuZW52Lk5PREVfREVCVUcgfHwgJyc7XG4gIHNldCA9IHNldC50b1VwcGVyQ2FzZSgpO1xuICBpZiAoIWRlYnVnc1tzZXRdKSB7XG4gICAgaWYgKG5ldyBSZWdFeHAoJ1xcXFxiJyArIHNldCArICdcXFxcYicsICdpJykudGVzdChkZWJ1Z0Vudmlyb24pKSB7XG4gICAgICB2YXIgcGlkID0gcHJvY2Vzcy5waWQ7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXNnID0gZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignJXMgJWQ6ICVzJywgc2V0LCBwaWQsIG1zZyk7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge307XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWJ1Z3Nbc2V0XTtcbn07XG5cblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QgdGhhdCBhbHRlcnMgdGhlIG91dHB1dC5cbiAqL1xuLyogbGVnYWN5OiBvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIG9wdHMpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25zXG4gIHZhciBjdHggPSB7XG4gICAgc2VlbjogW10sXG4gICAgc3R5bGl6ZTogc3R5bGl6ZU5vQ29sb3JcbiAgfTtcbiAgLy8gbGVnYWN5Li4uXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIGN0eC5kZXB0aCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gNCkgY3R4LmNvbG9ycyA9IGFyZ3VtZW50c1szXTtcbiAgaWYgKGlzQm9vbGVhbihvcHRzKSkge1xuICAgIC8vIGxlZ2FjeS4uLlxuICAgIGN0eC5zaG93SGlkZGVuID0gb3B0cztcbiAgfSBlbHNlIGlmIChvcHRzKSB7XG4gICAgLy8gZ290IGFuIFwib3B0aW9uc1wiIG9iamVjdFxuICAgIGV4cG9ydHMuX2V4dGVuZChjdHgsIG9wdHMpO1xuICB9XG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5zaG93SGlkZGVuKSkgY3R4LnNob3dIaWRkZW4gPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpIGN0eC5kZXB0aCA9IDI7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY29sb3JzKSkgY3R4LmNvbG9ycyA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmN1c3RvbUluc3BlY3QpKSBjdHguY3VzdG9tSW5zcGVjdCA9IHRydWU7XG4gIGlmIChjdHguY29sb3JzKSBjdHguc3R5bGl6ZSA9IHN0eWxpemVXaXRoQ29sb3I7XG4gIHJldHVybiBmb3JtYXRWYWx1ZShjdHgsIG9iaiwgY3R4LmRlcHRoKTtcbn1cbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cblxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG5pbnNwZWN0LmNvbG9ycyA9IHtcbiAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAndW5kZXJsaW5lJyA6IFs0LCAyNF0sXG4gICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgJ2dyZXknIDogWzkwLCAzOV0sXG4gICdibGFjaycgOiBbMzAsIDM5XSxcbiAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICdjeWFuJyA6IFszNiwgMzldLFxuICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAncmVkJyA6IFszMSwgMzldLFxuICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG4vLyBEb24ndCB1c2UgJ2JsdWUnIG5vdCB2aXNpYmxlIG9uIGNtZC5leGVcbmluc3BlY3Quc3R5bGVzID0ge1xuICAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgJ251bWJlcic6ICd5ZWxsb3cnLFxuICAnYm9vbGVhbic6ICd5ZWxsb3cnLFxuICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAnbnVsbCc6ICdib2xkJyxcbiAgJ3N0cmluZyc6ICdncmVlbicsXG4gICdkYXRlJzogJ21hZ2VudGEnLFxuICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAncmVnZXhwJzogJ3JlZCdcbn07XG5cblxuZnVuY3Rpb24gc3R5bGl6ZVdpdGhDb2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICB2YXIgc3R5bGUgPSBpbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO1xuXG4gIGlmIChzdHlsZSkge1xuICAgIHJldHVybiAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVsxXSArICdtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc3R5bGl6ZU5vQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgcmV0dXJuIHN0cjtcbn1cblxuXG5mdW5jdGlvbiBhcnJheVRvSGFzaChhcnJheSkge1xuICB2YXIgaGFzaCA9IHt9O1xuXG4gIGFycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpIHtcbiAgICBoYXNoW3ZhbF0gPSB0cnVlO1xuICB9KTtcblxuICByZXR1cm4gaGFzaDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMpIHtcbiAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgaWYgKGN0eC5jdXN0b21JbnNwZWN0ICYmXG4gICAgICB2YWx1ZSAmJlxuICAgICAgaXNGdW5jdGlvbih2YWx1ZS5pbnNwZWN0KSAmJlxuICAgICAgLy8gRmlsdGVyIG91dCB0aGUgdXRpbCBtb2R1bGUsIGl0J3MgaW5zcGVjdCBmdW5jdGlvbiBpcyBzcGVjaWFsXG4gICAgICB2YWx1ZS5pbnNwZWN0ICE9PSBleHBvcnRzLmluc3BlY3QgJiZcbiAgICAgIC8vIEFsc28gZmlsdGVyIG91dCBhbnkgcHJvdG90eXBlIG9iamVjdHMgdXNpbmcgdGhlIGNpcmN1bGFyIGNoZWNrLlxuICAgICAgISh2YWx1ZS5jb25zdHJ1Y3RvciAmJiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT09IHZhbHVlKSkge1xuICAgIHZhciByZXQgPSB2YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcywgY3R4KTtcbiAgICBpZiAoIWlzU3RyaW5nKHJldCkpIHtcbiAgICAgIHJldCA9IGZvcm1hdFZhbHVlKGN0eCwgcmV0LCByZWN1cnNlVGltZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgdmFyIHByaW1pdGl2ZSA9IGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKTtcbiAgaWYgKHByaW1pdGl2ZSkge1xuICAgIHJldHVybiBwcmltaXRpdmU7XG4gIH1cblxuICAvLyBMb29rIHVwIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICB2YXIgdmlzaWJsZUtleXMgPSBhcnJheVRvSGFzaChrZXlzKTtcblxuICBpZiAoY3R4LnNob3dIaWRkZW4pIHtcbiAgICBrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModmFsdWUpO1xuICB9XG5cbiAgLy8gSUUgZG9lc24ndCBtYWtlIGVycm9yIGZpZWxkcyBub24tZW51bWVyYWJsZVxuICAvLyBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvaWUvZHd3NTJzYnQodj12cy45NCkuYXNweFxuICBpZiAoaXNFcnJvcih2YWx1ZSlcbiAgICAgICYmIChrZXlzLmluZGV4T2YoJ21lc3NhZ2UnKSA+PSAwIHx8IGtleXMuaW5kZXhPZignZGVzY3JpcHRpb24nKSA+PSAwKSkge1xuICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICAvLyBTb21lIHR5cGUgb2Ygb2JqZWN0IHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdmFyIG5hbWUgPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW0Z1bmN0aW9uJyArIG5hbWUgKyAnXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfVxuICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdkYXRlJyk7XG4gICAgfVxuICAgIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYmFzZSA9ICcnLCBhcnJheSA9IGZhbHNlLCBicmFjZXMgPSBbJ3snLCAnfSddO1xuXG4gIC8vIE1ha2UgQXJyYXkgc2F5IHRoYXQgdGhleSBhcmUgQXJyYXlcbiAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgYXJyYXkgPSB0cnVlO1xuICAgIGJyYWNlcyA9IFsnWycsICddJ107XG4gIH1cblxuICAvLyBNYWtlIGZ1bmN0aW9ucyBzYXkgdGhhdCB0aGV5IGFyZSBmdW5jdGlvbnNcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgdmFyIG4gPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICBiYXNlID0gJyBbRnVuY3Rpb24nICsgbiArICddJztcbiAgfVxuXG4gIC8vIE1ha2UgUmVnRXhwcyBzYXkgdGhhdCB0aGV5IGFyZSBSZWdFeHBzXG4gIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZGF0ZXMgd2l0aCBwcm9wZXJ0aWVzIGZpcnN0IHNheSB0aGUgZGF0ZVxuICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBEYXRlLnByb3RvdHlwZS50b1VUQ1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZXJyb3Igd2l0aCBtZXNzYWdlIGZpcnN0IHNheSB0aGUgZXJyb3JcbiAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiAoIWFycmF5IHx8IHZhbHVlLmxlbmd0aCA9PSAwKSkge1xuICAgIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgYnJhY2VzWzFdO1xuICB9XG5cbiAgaWYgKHJlY3Vyc2VUaW1lcyA8IDApIHtcbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tPYmplY3RdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cblxuICBjdHguc2Vlbi5wdXNoKHZhbHVlKTtcblxuICB2YXIgb3V0cHV0O1xuICBpZiAoYXJyYXkpIHtcbiAgICBvdXRwdXQgPSBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKTtcbiAgfSBlbHNlIHtcbiAgICBvdXRwdXQgPSBrZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGN0eC5zZWVuLnBvcCgpO1xuXG4gIHJldHVybiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhciBzaW1wbGUgPSAnXFwnJyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC9eXCJ8XCIkL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKSArICdcXCcnO1xuICAgIHJldHVybiBjdHguc3R5bGl6ZShzaW1wbGUsICdzdHJpbmcnKTtcbiAgfVxuICBpZiAoaXNOdW1iZXIodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnbnVtYmVyJyk7XG4gIGlmIChpc0Jvb2xlYW4odmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnYm9vbGVhbicpO1xuICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gIGlmIChpc051bGwodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IodmFsdWUpIHtcbiAgcmV0dXJuICdbJyArIEVycm9yLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSArICddJztcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIFN0cmluZyhpKSkpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAgU3RyaW5nKGkpLCB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKCcnKTtcbiAgICB9XG4gIH1cbiAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBrZXksIHRydWUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpIHtcbiAgdmFyIG5hbWUsIHN0ciwgZGVzYztcbiAgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIGtleSkgfHwgeyB2YWx1ZTogdmFsdWVba2V5XSB9O1xuICBpZiAoZGVzYy5nZXQpIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmICghaGFzT3duUHJvcGVydHkodmlzaWJsZUtleXMsIGtleSkpIHtcbiAgICBuYW1lID0gJ1snICsga2V5ICsgJ10nO1xuICB9XG4gIGlmICghc3RyKSB7XG4gICAgaWYgKGN0eC5zZWVuLmluZGV4T2YoZGVzYy52YWx1ZSkgPCAwKSB7XG4gICAgICBpZiAoaXNOdWxsKHJlY3Vyc2VUaW1lcykpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBpZiAoYXJyYXkgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cigxLCBuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICduYW1lJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG59XG5cblxuZnVuY3Rpb24gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpIHtcbiAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgdmFyIGxlbmd0aCA9IG91dHB1dC5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3VyKSB7XG4gICAgbnVtTGluZXNFc3QrKztcbiAgICBpZiAoY3VyLmluZGV4T2YoJ1xcbicpID49IDApIG51bUxpbmVzRXN0Kys7XG4gICAgcmV0dXJuIHByZXYgKyBjdXIucmVwbGFjZSgvXFx1MDAxYlxcW1xcZFxcZD9tL2csICcnKS5sZW5ndGggKyAxO1xuICB9LCAwKTtcblxuICBpZiAobGVuZ3RoID4gNjApIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICtcbiAgICAgICAgICAgKGJhc2UgPT09ICcnID8gJycgOiBiYXNlICsgJ1xcbiAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIG91dHB1dC5qb2luKCcsXFxuICAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIGJyYWNlc1sxXTtcbiAgfVxuXG4gIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgJyAnICsgb3V0cHV0LmpvaW4oJywgJykgKyAnICcgKyBicmFjZXNbMV07XG59XG5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gaXNPYmplY3QocmUpICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gaXNPYmplY3QoZCkgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuXG5mdW5jdGlvbiBpc0Vycm9yKGUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGUpICYmXG4gICAgICAob2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXScgfHwgZSBpbnN0YW5jZW9mIEVycm9yKTtcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSByZXF1aXJlKCcuL3N1cHBvcnQvaXNCdWZmZXInKTtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5cbmZ1bmN0aW9uIHBhZChuKSB7XG4gIHJldHVybiBuIDwgMTAgPyAnMCcgKyBuLnRvU3RyaW5nKDEwKSA6IG4udG9TdHJpbmcoMTApO1xufVxuXG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cblxuLy8gbG9nIGlzIGp1c3QgYSB0aGluIHdyYXBwZXIgdG8gY29uc29sZS5sb2cgdGhhdCBwcmVwZW5kcyBhIHRpbWVzdGFtcFxuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJyVzIC0gJXMnLCB0aW1lc3RhbXAoKSwgZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKSk7XG59O1xuXG5cbi8qKlxuICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICpcbiAqIFRoZSBGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgZnJvbSBsYW5nLmpzIHJld3JpdHRlbiBhcyBhIHN0YW5kYWxvbmVcbiAqIGZ1bmN0aW9uIChub3Qgb24gRnVuY3Rpb24ucHJvdG90eXBlKS4gTk9URTogSWYgdGhpcyBmaWxlIGlzIHRvIGJlIGxvYWRlZFxuICogZHVyaW5nIGJvb3RzdHJhcHBpbmcgdGhpcyBmdW5jdGlvbiBuZWVkcyB0byBiZSByZXdyaXR0ZW4gdXNpbmcgc29tZSBuYXRpdmVcbiAqIGZ1bmN0aW9ucyBhcyBwcm90b3R5cGUgc2V0dXAgdXNpbmcgbm9ybWFsIEphdmFTY3JpcHQgZG9lcyBub3Qgd29yayBhc1xuICogZXhwZWN0ZWQgZHVyaW5nIGJvb3RzdHJhcHBpbmcgKHNlZSBtaXJyb3IuanMgaW4gcjExNDkwMykuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZVxuICogICAgIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1cGVyQ3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBpbmhlcml0IHByb3RvdHlwZSBmcm9tLlxuICovXG5leHBvcnRzLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuZXhwb3J0cy5fZXh0ZW5kID0gZnVuY3Rpb24ob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCAhaXNPYmplY3QoYWRkKSkgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gIH1cbiAgcmV0dXJuIG9yaWdpbjtcbn07XG5cbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiLyoqXG4gKiAgQ29weXJpZ2h0IChjKSAyMDE0LCBGYWNlYm9vaywgSW5jLlxuICogIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG5mdW5jdGlvbiB1bml2ZXJzYWxNb2R1bGUoKSB7XG4gIHZhciAkT2JqZWN0ID0gT2JqZWN0O1xuXG5mdW5jdGlvbiBjcmVhdGVDbGFzcyhjdG9yLCBtZXRob2RzLCBzdGF0aWNNZXRob2RzLCBzdXBlckNsYXNzKSB7XG4gIHZhciBwcm90bztcbiAgaWYgKHN1cGVyQ2xhc3MpIHtcbiAgICB2YXIgc3VwZXJQcm90byA9IHN1cGVyQ2xhc3MucHJvdG90eXBlO1xuICAgIHByb3RvID0gJE9iamVjdC5jcmVhdGUoc3VwZXJQcm90byk7XG4gIH0gZWxzZSB7XG4gICAgcHJvdG8gPSBjdG9yLnByb3RvdHlwZTtcbiAgfVxuICAkT2JqZWN0LmtleXMobWV0aG9kcykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgcHJvdG9ba2V5XSA9IG1ldGhvZHNba2V5XTtcbiAgfSk7XG4gICRPYmplY3Qua2V5cyhzdGF0aWNNZXRob2RzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICBjdG9yW2tleV0gPSBzdGF0aWNNZXRob2RzW2tleV07XG4gIH0pO1xuICBwcm90by5jb25zdHJ1Y3RvciA9IGN0b3I7XG4gIGN0b3IucHJvdG90eXBlID0gcHJvdG87XG4gIHJldHVybiBjdG9yO1xufVxuXG5mdW5jdGlvbiBzdXBlckNhbGwoc2VsZiwgcHJvdG8sIG5hbWUsIGFyZ3MpIHtcbiAgcmV0dXJuICRPYmplY3QuZ2V0UHJvdG90eXBlT2YocHJvdG8pW25hbWVdLmFwcGx5KHNlbGYsIGFyZ3MpO1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0U3VwZXJDYWxsKHNlbGYsIHByb3RvLCBhcmdzKSB7XG4gIHN1cGVyQ2FsbChzZWxmLCBwcm90bywgJ2NvbnN0cnVjdG9yJywgYXJncyk7XG59XG5cbnZhciAkdHJhY2V1clJ1bnRpbWUgPSB7fTtcbiR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcyA9IGNyZWF0ZUNsYXNzO1xuJHRyYWNldXJSdW50aW1lLnN1cGVyQ2FsbCA9IHN1cGVyQ2FsbDtcbiR0cmFjZXVyUnVudGltZS5kZWZhdWx0U3VwZXJDYWxsID0gZGVmYXVsdFN1cGVyQ2FsbDtcblwidXNlIHN0cmljdFwiO1xuZnVuY3Rpb24gaXMoZmlyc3QsIHNlY29uZCkge1xuICBpZiAoZmlyc3QgPT09IHNlY29uZCkge1xuICAgIHJldHVybiBmaXJzdCAhPT0gMCB8fCBzZWNvbmQgIT09IDAgfHwgMSAvIGZpcnN0ID09PSAxIC8gc2Vjb25kO1xuICB9XG4gIGlmIChmaXJzdCAhPT0gZmlyc3QpIHtcbiAgICByZXR1cm4gc2Vjb25kICE9PSBzZWNvbmQ7XG4gIH1cbiAgaWYgKGZpcnN0ICYmIHR5cGVvZiBmaXJzdC5lcXVhbHMgPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZmlyc3QuZXF1YWxzKHNlY29uZCk7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuZnVuY3Rpb24gaW52YXJpYW50KGNvbmRpdGlvbiwgZXJyb3IpIHtcbiAgaWYgKCFjb25kaXRpb24pXG4gICAgdGhyb3cgbmV3IEVycm9yKGVycm9yKTtcbn1cbnZhciBERUxFVEUgPSAnZGVsZXRlJztcbnZhciBTSElGVCA9IDU7XG52YXIgU0laRSA9IDEgPDwgU0hJRlQ7XG52YXIgTUFTSyA9IFNJWkUgLSAxO1xudmFyIE5PVF9TRVQgPSB7fTtcbnZhciBDSEFOR0VfTEVOR1RIID0ge3ZhbHVlOiBmYWxzZX07XG52YXIgRElEX0FMVEVSID0ge3ZhbHVlOiBmYWxzZX07XG5mdW5jdGlvbiBNYWtlUmVmKHJlZikge1xuICByZWYudmFsdWUgPSBmYWxzZTtcbiAgcmV0dXJuIHJlZjtcbn1cbmZ1bmN0aW9uIFNldFJlZihyZWYpIHtcbiAgcmVmICYmIChyZWYudmFsdWUgPSB0cnVlKTtcbn1cbmZ1bmN0aW9uIE93bmVySUQoKSB7fVxuZnVuY3Rpb24gYXJyQ29weShhcnIsIG9mZnNldCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfHwgMDtcbiAgdmFyIGxlbiA9IE1hdGgubWF4KDAsIGFyci5sZW5ndGggLSBvZmZzZXQpO1xuICB2YXIgbmV3QXJyID0gbmV3IEFycmF5KGxlbik7XG4gIGZvciAodmFyIGlpID0gMDsgaWkgPCBsZW47IGlpKyspIHtcbiAgICBuZXdBcnJbaWldID0gYXJyW2lpICsgb2Zmc2V0XTtcbiAgfVxuICByZXR1cm4gbmV3QXJyO1xufVxuZnVuY3Rpb24gYXNzZXJ0Tm90SW5maW5pdGUoc2l6ZSkge1xuICBpbnZhcmlhbnQoc2l6ZSAhPT0gSW5maW5pdHksICdDYW5ub3QgcGVyZm9ybSB0aGlzIGFjdGlvbiB3aXRoIGFuIGluZmluaXRlIHNpemUuJyk7XG59XG5mdW5jdGlvbiBlbnN1cmVTaXplKGl0ZXIpIHtcbiAgaWYgKGl0ZXIuc2l6ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgaXRlci5zaXplID0gaXRlci5fX2l0ZXJhdGUocmV0dXJuVHJ1ZSk7XG4gIH1cbiAgcmV0dXJuIGl0ZXIuc2l6ZTtcbn1cbmZ1bmN0aW9uIHdyYXBJbmRleChpdGVyLCBpbmRleCkge1xuICByZXR1cm4gaW5kZXggPj0gMCA/IGluZGV4IDogZW5zdXJlU2l6ZShpdGVyKSArIGluZGV4O1xufVxuZnVuY3Rpb24gcmV0dXJuVHJ1ZSgpIHtcbiAgcmV0dXJuIHRydWU7XG59XG5mdW5jdGlvbiBpc1BsYWluT2JqKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAmJiB2YWx1ZS5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0O1xufVxuZnVuY3Rpb24gd2hvbGVTbGljZShiZWdpbiwgZW5kLCBzaXplKSB7XG4gIHJldHVybiAoYmVnaW4gPT09IDAgfHwgKHNpemUgIT09IHVuZGVmaW5lZCAmJiBiZWdpbiA8PSAtc2l6ZSkpICYmIChlbmQgPT09IHVuZGVmaW5lZCB8fCAoc2l6ZSAhPT0gdW5kZWZpbmVkICYmIGVuZCA+PSBzaXplKSk7XG59XG5mdW5jdGlvbiByZXNvbHZlQmVnaW4oYmVnaW4sIHNpemUpIHtcbiAgcmV0dXJuIHJlc29sdmVJbmRleChiZWdpbiwgc2l6ZSwgMCk7XG59XG5mdW5jdGlvbiByZXNvbHZlRW5kKGVuZCwgc2l6ZSkge1xuICByZXR1cm4gcmVzb2x2ZUluZGV4KGVuZCwgc2l6ZSwgc2l6ZSk7XG59XG5mdW5jdGlvbiByZXNvbHZlSW5kZXgoaW5kZXgsIHNpemUsIGRlZmF1bHRJbmRleCkge1xuICByZXR1cm4gaW5kZXggPT09IHVuZGVmaW5lZCA/IGRlZmF1bHRJbmRleCA6IGluZGV4IDwgMCA/IE1hdGgubWF4KDAsIHNpemUgKyBpbmRleCkgOiBzaXplID09PSB1bmRlZmluZWQgPyBpbmRleCA6IE1hdGgubWluKHNpemUsIGluZGV4KTtcbn1cbmZ1bmN0aW9uIGhhc2gobykge1xuICBpZiAoIW8pIHtcbiAgICByZXR1cm4gMDtcbiAgfVxuICBpZiAobyA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiAxO1xuICB9XG4gIHZhciB0eXBlID0gdHlwZW9mIG87XG4gIGlmICh0eXBlID09PSAnbnVtYmVyJykge1xuICAgIGlmICgobyB8IDApID09PSBvKSB7XG4gICAgICByZXR1cm4gbyAmIEhBU0hfTUFYX1ZBTDtcbiAgICB9XG4gICAgbyA9ICcnICsgbztcbiAgICB0eXBlID0gJ3N0cmluZyc7XG4gIH1cbiAgaWYgKHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIG8ubGVuZ3RoID4gU1RSSU5HX0hBU0hfQ0FDSEVfTUlOX1NUUkxFTiA/IGNhY2hlZEhhc2hTdHJpbmcobykgOiBoYXNoU3RyaW5nKG8pO1xuICB9XG4gIGlmIChvLmhhc2hDb2RlKSB7XG4gICAgcmV0dXJuIGhhc2godHlwZW9mIG8uaGFzaENvZGUgPT09ICdmdW5jdGlvbicgPyBvLmhhc2hDb2RlKCkgOiBvLmhhc2hDb2RlKTtcbiAgfVxuICByZXR1cm4gaGFzaEpTT2JqKG8pO1xufVxuZnVuY3Rpb24gY2FjaGVkSGFzaFN0cmluZyhzdHJpbmcpIHtcbiAgdmFyIGhhc2ggPSBzdHJpbmdIYXNoQ2FjaGVbc3RyaW5nXTtcbiAgaWYgKGhhc2ggPT09IHVuZGVmaW5lZCkge1xuICAgIGhhc2ggPSBoYXNoU3RyaW5nKHN0cmluZyk7XG4gICAgaWYgKFNUUklOR19IQVNIX0NBQ0hFX1NJWkUgPT09IFNUUklOR19IQVNIX0NBQ0hFX01BWF9TSVpFKSB7XG4gICAgICBTVFJJTkdfSEFTSF9DQUNIRV9TSVpFID0gMDtcbiAgICAgIHN0cmluZ0hhc2hDYWNoZSA9IHt9O1xuICAgIH1cbiAgICBTVFJJTkdfSEFTSF9DQUNIRV9TSVpFKys7XG4gICAgc3RyaW5nSGFzaENhY2hlW3N0cmluZ10gPSBoYXNoO1xuICB9XG4gIHJldHVybiBoYXNoO1xufVxuZnVuY3Rpb24gaGFzaFN0cmluZyhzdHJpbmcpIHtcbiAgdmFyIGhhc2ggPSAwO1xuICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgc3RyaW5nLmxlbmd0aDsgaWkrKykge1xuICAgIGhhc2ggPSAoMzEgKiBoYXNoICsgc3RyaW5nLmNoYXJDb2RlQXQoaWkpKSAmIEhBU0hfTUFYX1ZBTDtcbiAgfVxuICByZXR1cm4gaGFzaDtcbn1cbmZ1bmN0aW9uIGhhc2hKU09iaihvYmopIHtcbiAgdmFyIGhhc2ggPSB3ZWFrTWFwICYmIHdlYWtNYXAuZ2V0KG9iaik7XG4gIGlmIChoYXNoKVxuICAgIHJldHVybiBoYXNoO1xuICBoYXNoID0gb2JqW1VJRF9IQVNIX0tFWV07XG4gIGlmIChoYXNoKVxuICAgIHJldHVybiBoYXNoO1xuICBpZiAoIWNhbkRlZmluZVByb3BlcnR5KSB7XG4gICAgaGFzaCA9IG9iai5wcm9wZXJ0eUlzRW51bWVyYWJsZSAmJiBvYmoucHJvcGVydHlJc0VudW1lcmFibGVbVUlEX0hBU0hfS0VZXTtcbiAgICBpZiAoaGFzaClcbiAgICAgIHJldHVybiBoYXNoO1xuICAgIGhhc2ggPSBnZXRJRU5vZGVIYXNoKG9iaik7XG4gICAgaWYgKGhhc2gpXG4gICAgICByZXR1cm4gaGFzaDtcbiAgfVxuICBpZiAoT2JqZWN0LmlzRXh0ZW5zaWJsZSAmJiAhT2JqZWN0LmlzRXh0ZW5zaWJsZShvYmopKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdOb24tZXh0ZW5zaWJsZSBvYmplY3RzIGFyZSBub3QgYWxsb3dlZCBhcyBrZXlzLicpO1xuICB9XG4gIGhhc2ggPSArK29iakhhc2hVSUQgJiBIQVNIX01BWF9WQUw7XG4gIGlmICh3ZWFrTWFwKSB7XG4gICAgd2Vha01hcC5zZXQob2JqLCBoYXNoKTtcbiAgfSBlbHNlIGlmIChjYW5EZWZpbmVQcm9wZXJ0eSkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIFVJRF9IQVNIX0tFWSwge1xuICAgICAgJ2VudW1lcmFibGUnOiBmYWxzZSxcbiAgICAgICdjb25maWd1cmFibGUnOiBmYWxzZSxcbiAgICAgICd3cml0YWJsZSc6IGZhbHNlLFxuICAgICAgJ3ZhbHVlJzogaGFzaFxuICAgIH0pO1xuICB9IGVsc2UgaWYgKG9iai5wcm9wZXJ0eUlzRW51bWVyYWJsZSAmJiBvYmoucHJvcGVydHlJc0VudW1lcmFibGUgPT09IG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUpIHtcbiAgICBvYmoucHJvcGVydHlJc0VudW1lcmFibGUgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gICAgb2JqLnByb3BlcnR5SXNFbnVtZXJhYmxlW1VJRF9IQVNIX0tFWV0gPSBoYXNoO1xuICB9IGVsc2UgaWYgKG9iai5ub2RlVHlwZSkge1xuICAgIG9ialtVSURfSEFTSF9LRVldID0gaGFzaDtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBzZXQgYSBub24tZW51bWVyYWJsZSBwcm9wZXJ0eSBvbiBvYmplY3QuJyk7XG4gIH1cbiAgcmV0dXJuIGhhc2g7XG59XG52YXIgY2FuRGVmaW5lUHJvcGVydHkgPSAoZnVuY3Rpb24oKSB7XG4gIHRyeSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHt9LCAneCcsIHt9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufSgpKTtcbmZ1bmN0aW9uIGdldElFTm9kZUhhc2gobm9kZSkge1xuICBpZiAobm9kZSAmJiBub2RlLm5vZGVUeXBlID4gMCkge1xuICAgIHN3aXRjaCAobm9kZS5ub2RlVHlwZSkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICByZXR1cm4gbm9kZS51bmlxdWVJRDtcbiAgICAgIGNhc2UgOTpcbiAgICAgICAgcmV0dXJuIG5vZGUuZG9jdW1lbnRFbGVtZW50ICYmIG5vZGUuZG9jdW1lbnRFbGVtZW50LnVuaXF1ZUlEO1xuICAgIH1cbiAgfVxufVxudmFyIHdlYWtNYXAgPSB0eXBlb2YgV2Vha01hcCA9PT0gJ2Z1bmN0aW9uJyAmJiBuZXcgV2Vha01hcCgpO1xudmFyIEhBU0hfTUFYX1ZBTCA9IDB4N0ZGRkZGRkY7XG52YXIgb2JqSGFzaFVJRCA9IDA7XG52YXIgVUlEX0hBU0hfS0VZID0gJ19faW1tdXRhYmxlaGFzaF9fJztcbmlmICh0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nKSB7XG4gIFVJRF9IQVNIX0tFWSA9IFN5bWJvbChVSURfSEFTSF9LRVkpO1xufVxudmFyIFNUUklOR19IQVNIX0NBQ0hFX01JTl9TVFJMRU4gPSAxNjtcbnZhciBTVFJJTkdfSEFTSF9DQUNIRV9NQVhfU0laRSA9IDI1NTtcbnZhciBTVFJJTkdfSEFTSF9DQUNIRV9TSVpFID0gMDtcbnZhciBzdHJpbmdIYXNoQ2FjaGUgPSB7fTtcbnZhciBJVEVSQVRFX0tFWVMgPSAwO1xudmFyIElURVJBVEVfVkFMVUVTID0gMTtcbnZhciBJVEVSQVRFX0VOVFJJRVMgPSAyO1xudmFyIEZBVVhfSVRFUkFUT1JfU1lNQk9MID0gJ0BAaXRlcmF0b3InO1xudmFyIFJFQUxfSVRFUkFUT1JfU1lNQk9MID0gdHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiBTeW1ib2wuaXRlcmF0b3I7XG52YXIgSVRFUkFUT1JfU1lNQk9MID0gUkVBTF9JVEVSQVRPUl9TWU1CT0wgfHwgRkFVWF9JVEVSQVRPUl9TWU1CT0w7XG52YXIgSXRlcmF0b3IgPSBmdW5jdGlvbiBJdGVyYXRvcihuZXh0KSB7XG4gIHRoaXMubmV4dCA9IG5leHQ7XG59O1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoSXRlcmF0b3IsIHt0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICdbSXRlcmF0b3JdJztcbiAgfX0sIHt9KTtcbkl0ZXJhdG9yLktFWVMgPSBJVEVSQVRFX0tFWVM7XG5JdGVyYXRvci5WQUxVRVMgPSBJVEVSQVRFX1ZBTFVFUztcbkl0ZXJhdG9yLkVOVFJJRVMgPSBJVEVSQVRFX0VOVFJJRVM7XG52YXIgSXRlcmF0b3JQcm90b3R5cGUgPSBJdGVyYXRvci5wcm90b3R5cGU7XG5JdGVyYXRvclByb3RvdHlwZS5pbnNwZWN0ID0gSXRlcmF0b3JQcm90b3R5cGUudG9Tb3VyY2UgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKTtcbn07XG5JdGVyYXRvclByb3RvdHlwZVtJVEVSQVRPUl9TWU1CT0xdID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzO1xufTtcbmZ1bmN0aW9uIGl0ZXJhdG9yVmFsdWUodHlwZSwgaywgdiwgaXRlcmF0b3JSZXN1bHQpIHtcbiAgdmFyIHZhbHVlID0gdHlwZSA9PT0gMCA/IGsgOiB0eXBlID09PSAxID8gdiA6IFtrLCB2XTtcbiAgaXRlcmF0b3JSZXN1bHQgPyAoaXRlcmF0b3JSZXN1bHQudmFsdWUgPSB2YWx1ZSkgOiAoaXRlcmF0b3JSZXN1bHQgPSB7XG4gICAgdmFsdWU6IHZhbHVlLFxuICAgIGRvbmU6IGZhbHNlXG4gIH0pO1xuICByZXR1cm4gaXRlcmF0b3JSZXN1bHQ7XG59XG5mdW5jdGlvbiBpdGVyYXRvckRvbmUoKSB7XG4gIHJldHVybiB7XG4gICAgdmFsdWU6IHVuZGVmaW5lZCxcbiAgICBkb25lOiB0cnVlXG4gIH07XG59XG5mdW5jdGlvbiBoYXNJdGVyYXRvcihtYXliZUl0ZXJhYmxlKSB7XG4gIHJldHVybiAhIV9pdGVyYXRvckZuKG1heWJlSXRlcmFibGUpO1xufVxuZnVuY3Rpb24gaXNJdGVyYXRvcihtYXliZUl0ZXJhdG9yKSB7XG4gIHJldHVybiBtYXliZUl0ZXJhdG9yICYmIHR5cGVvZiBtYXliZUl0ZXJhdG9yLm5leHQgPT09ICdmdW5jdGlvbic7XG59XG5mdW5jdGlvbiBnZXRJdGVyYXRvcihpdGVyYWJsZSkge1xuICB2YXIgaXRlcmF0b3JGbiA9IF9pdGVyYXRvckZuKGl0ZXJhYmxlKTtcbiAgcmV0dXJuIGl0ZXJhdG9yRm4gJiYgaXRlcmF0b3JGbi5jYWxsKGl0ZXJhYmxlKTtcbn1cbmZ1bmN0aW9uIF9pdGVyYXRvckZuKGl0ZXJhYmxlKSB7XG4gIHZhciBpdGVyYXRvckZuID0gaXRlcmFibGUgJiYgKChSRUFMX0lURVJBVE9SX1NZTUJPTCAmJiBpdGVyYWJsZVtSRUFMX0lURVJBVE9SX1NZTUJPTF0pIHx8IGl0ZXJhYmxlW0ZBVVhfSVRFUkFUT1JfU1lNQk9MXSk7XG4gIGlmICh0eXBlb2YgaXRlcmF0b3JGbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBpdGVyYXRvckZuO1xuICB9XG59XG52YXIgSXRlcmFibGUgPSBmdW5jdGlvbiBJdGVyYWJsZSh2YWx1ZSkge1xuICByZXR1cm4gaXNJdGVyYWJsZSh2YWx1ZSkgPyB2YWx1ZSA6IFNlcS5hcHBseSh1bmRlZmluZWQsIGFyZ3VtZW50cyk7XG59O1xudmFyICRJdGVyYWJsZSA9IEl0ZXJhYmxlO1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoSXRlcmFibGUsIHtcbiAgdG9BcnJheTogZnVuY3Rpb24oKSB7XG4gICAgYXNzZXJ0Tm90SW5maW5pdGUodGhpcy5zaXplKTtcbiAgICB2YXIgYXJyYXkgPSBuZXcgQXJyYXkodGhpcy5zaXplIHx8IDApO1xuICAgIHRoaXMudmFsdWVTZXEoKS5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYsIGkpIHtcbiAgICAgIGFycmF5W2ldID0gdjtcbiAgICB9KSk7XG4gICAgcmV0dXJuIGFycmF5O1xuICB9LFxuICB0b0luZGV4ZWRTZXE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgVG9JbmRleGVkU2VxdWVuY2UodGhpcyk7XG4gIH0sXG4gIHRvSlM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnRvU2VxKCkubWFwKChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZS50b0pTID09PSAnZnVuY3Rpb24nID8gdmFsdWUudG9KUygpIDogdmFsdWU7XG4gICAgfSkpLl9fdG9KUygpO1xuICB9LFxuICB0b0tleWVkU2VxOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFRvS2V5ZWRTZXF1ZW5jZSh0aGlzLCB0cnVlKTtcbiAgfSxcbiAgdG9NYXA6IGZ1bmN0aW9uKCkge1xuICAgIGFzc2VydE5vdEluZmluaXRlKHRoaXMuc2l6ZSk7XG4gICAgcmV0dXJuIE1hcCh0aGlzLnRvS2V5ZWRTZXEoKSk7XG4gIH0sXG4gIHRvT2JqZWN0OiBmdW5jdGlvbigpIHtcbiAgICBhc3NlcnROb3RJbmZpbml0ZSh0aGlzLnNpemUpO1xuICAgIHZhciBvYmplY3QgPSB7fTtcbiAgICB0aGlzLl9faXRlcmF0ZSgoZnVuY3Rpb24odiwgaykge1xuICAgICAgb2JqZWN0W2tdID0gdjtcbiAgICB9KSk7XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfSxcbiAgdG9PcmRlcmVkTWFwOiBmdW5jdGlvbigpIHtcbiAgICBhc3NlcnROb3RJbmZpbml0ZSh0aGlzLnNpemUpO1xuICAgIHJldHVybiBPcmRlcmVkTWFwKHRoaXMudG9LZXllZFNlcSgpKTtcbiAgfSxcbiAgdG9TZXQ6IGZ1bmN0aW9uKCkge1xuICAgIGFzc2VydE5vdEluZmluaXRlKHRoaXMuc2l6ZSk7XG4gICAgcmV0dXJuIFNldCh0aGlzKTtcbiAgfSxcbiAgdG9TZXRTZXE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgVG9TZXRTZXF1ZW5jZSh0aGlzLCB0cnVlKTtcbiAgfSxcbiAgdG9TZXE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBpc0luZGV4ZWQodGhpcykgPyB0aGlzLnRvSW5kZXhlZFNlcSgpIDogaXNLZXllZCh0aGlzKSA/IHRoaXMudG9LZXllZFNlcSgpIDogdGhpcy50b1NldFNlcSgpO1xuICB9LFxuICB0b1N0YWNrOiBmdW5jdGlvbigpIHtcbiAgICBhc3NlcnROb3RJbmZpbml0ZSh0aGlzLnNpemUpO1xuICAgIHJldHVybiBTdGFjayh0aGlzKTtcbiAgfSxcbiAgdG9MaXN0OiBmdW5jdGlvbigpIHtcbiAgICBhc3NlcnROb3RJbmZpbml0ZSh0aGlzLnNpemUpO1xuICAgIHJldHVybiBMaXN0KHRoaXMpO1xuICB9LFxuICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICdbSXRlcmFibGVdJztcbiAgfSxcbiAgX190b1N0cmluZzogZnVuY3Rpb24oaGVhZCwgdGFpbCkge1xuICAgIGlmICh0aGlzLnNpemUgPT09IDApIHtcbiAgICAgIHJldHVybiBoZWFkICsgdGFpbDtcbiAgICB9XG4gICAgcmV0dXJuIGhlYWQgKyAnICcgKyB0aGlzLnRvU2VxKCkubWFwKHRoaXMuX190b1N0cmluZ01hcHBlcikuam9pbignLCAnKSArICcgJyArIHRhaWw7XG4gIH0sXG4gIGNvbmNhdDogZnVuY3Rpb24oKSB7XG4gICAgZm9yICh2YXIgdmFsdWVzID0gW10sXG4gICAgICAgICRfXzIgPSAwOyAkX18yIDwgYXJndW1lbnRzLmxlbmd0aDsgJF9fMisrKVxuICAgICAgdmFsdWVzWyRfXzJdID0gYXJndW1lbnRzWyRfXzJdO1xuICAgIHJldHVybiByZWlmeSh0aGlzLCBjb25jYXRGYWN0b3J5KHRoaXMsIHZhbHVlcywgdHJ1ZSkpO1xuICB9LFxuICBjb250YWluczogZnVuY3Rpb24oc2VhcmNoVmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5zb21lKChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIGlzKHZhbHVlLCBzZWFyY2hWYWx1ZSk7XG4gICAgfSkpO1xuICB9LFxuICBlbnRyaWVzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fX2l0ZXJhdG9yKElURVJBVEVfRU5UUklFUyk7XG4gIH0sXG4gIGV2ZXJ5OiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmV0dXJuVmFsdWUgPSB0cnVlO1xuICAgIHRoaXMuX19pdGVyYXRlKChmdW5jdGlvbih2LCBrLCBjKSB7XG4gICAgICBpZiAoIXByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHYsIGssIGMpKSB7XG4gICAgICAgIHJldHVyblZhbHVlID0gZmFsc2U7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9KSk7XG4gICAgcmV0dXJuIHJldHVyblZhbHVlO1xuICB9LFxuICBmaWx0ZXI6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHJldHVybiByZWlmeSh0aGlzLCBmaWx0ZXJGYWN0b3J5KHRoaXMsIHByZWRpY2F0ZSwgY29udGV4dCwgdHJ1ZSkpO1xuICB9LFxuICBmaW5kOiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQsIG5vdFNldFZhbHVlKSB7XG4gICAgdmFyIGZvdW5kVmFsdWUgPSBub3RTZXRWYWx1ZTtcbiAgICB0aGlzLl9faXRlcmF0ZSgoZnVuY3Rpb24odiwgaywgYykge1xuICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHYsIGssIGMpKSB7XG4gICAgICAgIGZvdW5kVmFsdWUgPSB2O1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSkpO1xuICAgIHJldHVybiBmb3VuZFZhbHVlO1xuICB9LFxuICBmb3JFYWNoOiBmdW5jdGlvbihzaWRlRWZmZWN0LCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHRoaXMuX19pdGVyYXRlKGNvbnRleHQgPyBzaWRlRWZmZWN0LmJpbmQoY29udGV4dCkgOiBzaWRlRWZmZWN0KTtcbiAgfSxcbiAgam9pbjogZnVuY3Rpb24oc2VwYXJhdG9yKSB7XG4gICAgc2VwYXJhdG9yID0gc2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyAnJyArIHNlcGFyYXRvciA6ICcsJztcbiAgICB2YXIgam9pbmVkID0gJyc7XG4gICAgdmFyIGlzRmlyc3QgPSB0cnVlO1xuICAgIHRoaXMuX19pdGVyYXRlKChmdW5jdGlvbih2KSB7XG4gICAgICBpc0ZpcnN0ID8gKGlzRmlyc3QgPSBmYWxzZSkgOiAoam9pbmVkICs9IHNlcGFyYXRvcik7XG4gICAgICBqb2luZWQgKz0gdiAhPT0gbnVsbCAmJiB2ICE9PSB1bmRlZmluZWQgPyB2IDogJyc7XG4gICAgfSkpO1xuICAgIHJldHVybiBqb2luZWQ7XG4gIH0sXG4gIGtleXM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9faXRlcmF0b3IoSVRFUkFURV9LRVlTKTtcbiAgfSxcbiAgbWFwOiBmdW5jdGlvbihtYXBwZXIsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgbWFwRmFjdG9yeSh0aGlzLCBtYXBwZXIsIGNvbnRleHQpKTtcbiAgfSxcbiAgcmVkdWNlOiBmdW5jdGlvbihyZWR1Y2VyLCBpbml0aWFsUmVkdWN0aW9uLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlZHVjdGlvbjtcbiAgICB2YXIgdXNlRmlyc3Q7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICB1c2VGaXJzdCA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlZHVjdGlvbiA9IGluaXRpYWxSZWR1Y3Rpb247XG4gICAgfVxuICAgIHRoaXMuX19pdGVyYXRlKChmdW5jdGlvbih2LCBrLCBjKSB7XG4gICAgICBpZiAodXNlRmlyc3QpIHtcbiAgICAgICAgdXNlRmlyc3QgPSBmYWxzZTtcbiAgICAgICAgcmVkdWN0aW9uID0gdjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlZHVjdGlvbiA9IHJlZHVjZXIuY2FsbChjb250ZXh0LCByZWR1Y3Rpb24sIHYsIGssIGMpO1xuICAgICAgfVxuICAgIH0pKTtcbiAgICByZXR1cm4gcmVkdWN0aW9uO1xuICB9LFxuICByZWR1Y2VSaWdodDogZnVuY3Rpb24ocmVkdWNlciwgaW5pdGlhbFJlZHVjdGlvbiwgY29udGV4dCkge1xuICAgIHZhciByZXZlcnNlZCA9IHRoaXMudG9LZXllZFNlcSgpLnJldmVyc2UoKTtcbiAgICByZXR1cm4gcmV2ZXJzZWQucmVkdWNlLmFwcGx5KHJldmVyc2VkLCBhcmd1bWVudHMpO1xuICB9LFxuICByZXZlcnNlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgcmV2ZXJzZUZhY3RvcnkodGhpcywgdHJ1ZSkpO1xuICB9LFxuICBzbGljZTogZnVuY3Rpb24oYmVnaW4sIGVuZCkge1xuICAgIGlmICh3aG9sZVNsaWNlKGJlZ2luLCBlbmQsIHRoaXMuc2l6ZSkpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgcmVzb2x2ZWRCZWdpbiA9IHJlc29sdmVCZWdpbihiZWdpbiwgdGhpcy5zaXplKTtcbiAgICB2YXIgcmVzb2x2ZWRFbmQgPSByZXNvbHZlRW5kKGVuZCwgdGhpcy5zaXplKTtcbiAgICBpZiAocmVzb2x2ZWRCZWdpbiAhPT0gcmVzb2x2ZWRCZWdpbiB8fCByZXNvbHZlZEVuZCAhPT0gcmVzb2x2ZWRFbmQpIHtcbiAgICAgIHJldHVybiB0aGlzLnRvU2VxKCkuY2FjaGVSZXN1bHQoKS5zbGljZShiZWdpbiwgZW5kKTtcbiAgICB9XG4gICAgdmFyIHNraXBwZWQgPSByZXNvbHZlZEJlZ2luID09PSAwID8gdGhpcyA6IHRoaXMuc2tpcChyZXNvbHZlZEJlZ2luKTtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgcmVzb2x2ZWRFbmQgPT09IHVuZGVmaW5lZCB8fCByZXNvbHZlZEVuZCA9PT0gdGhpcy5zaXplID8gc2tpcHBlZCA6IHNraXBwZWQudGFrZShyZXNvbHZlZEVuZCAtIHJlc29sdmVkQmVnaW4pKTtcbiAgfSxcbiAgc29tZTogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuICF0aGlzLmV2ZXJ5KG5vdChwcmVkaWNhdGUpLCBjb250ZXh0KTtcbiAgfSxcbiAgc29ydDogZnVuY3Rpb24oY29tcGFyYXRvcikge1xuICAgIHJldHVybiB0aGlzLnNvcnRCeSh2YWx1ZU1hcHBlciwgY29tcGFyYXRvcik7XG4gIH0sXG4gIHZhbHVlczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX19pdGVyYXRvcihJVEVSQVRFX1ZBTFVFUyk7XG4gIH0sXG4gIGJ1dExhc3Q6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnNsaWNlKDAsIC0xKTtcbiAgfSxcbiAgY291bnQ6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHJldHVybiBlbnN1cmVTaXplKHByZWRpY2F0ZSA/IHRoaXMudG9TZXEoKS5maWx0ZXIocHJlZGljYXRlLCBjb250ZXh0KSA6IHRoaXMpO1xuICB9LFxuICBjb3VudEJ5OiBmdW5jdGlvbihncm91cGVyLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIGNvdW50QnlGYWN0b3J5KHRoaXMsIGdyb3VwZXIsIGNvbnRleHQpO1xuICB9LFxuICBlcXVhbHM6IGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgaWYgKHRoaXMgPT09IG90aGVyKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKCFvdGhlciB8fCB0eXBlb2Ygb3RoZXIuZXF1YWxzICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICh0aGlzLnNpemUgIT09IHVuZGVmaW5lZCAmJiBvdGhlci5zaXplICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICh0aGlzLnNpemUgIT09IG90aGVyLnNpemUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuc2l6ZSA9PT0gMCAmJiBvdGhlci5zaXplID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodGhpcy5fX2hhc2ggIT09IHVuZGVmaW5lZCAmJiBvdGhlci5fX2hhc2ggIT09IHVuZGVmaW5lZCAmJiB0aGlzLl9faGFzaCAhPT0gb3RoZXIuX19oYXNoKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9fZGVlcEVxdWFscyhvdGhlcik7XG4gIH0sXG4gIF9fZGVlcEVxdWFsczogZnVuY3Rpb24ob3RoZXIpIHtcbiAgICB2YXIgZW50cmllcyA9IHRoaXMuZW50cmllcygpO1xuICAgIHJldHVybiB0eXBlb2Ygb3RoZXIuZXZlcnkgPT09ICdmdW5jdGlvbicgJiYgb3RoZXIuZXZlcnkoKGZ1bmN0aW9uKHYsIGspIHtcbiAgICAgIHZhciBlbnRyeSA9IGVudHJpZXMubmV4dCgpLnZhbHVlO1xuICAgICAgcmV0dXJuIGVudHJ5ICYmIGlzKGVudHJ5WzBdLCBrKSAmJiBpcyhlbnRyeVsxXSwgdik7XG4gICAgfSkpICYmIGVudHJpZXMubmV4dCgpLmRvbmU7XG4gIH0sXG4gIGVudHJ5U2VxOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlcmFibGUgPSB0aGlzO1xuICAgIGlmIChpdGVyYWJsZS5fY2FjaGUpIHtcbiAgICAgIHJldHVybiBuZXcgQXJyYXlTZXEoaXRlcmFibGUuX2NhY2hlKTtcbiAgICB9XG4gICAgdmFyIGVudHJpZXNTZXF1ZW5jZSA9IGl0ZXJhYmxlLnRvU2VxKCkubWFwKGVudHJ5TWFwcGVyKS50b0luZGV4ZWRTZXEoKTtcbiAgICBlbnRyaWVzU2VxdWVuY2UuZnJvbUVudHJ5U2VxID0gKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGl0ZXJhYmxlLnRvU2VxKCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGVudHJpZXNTZXF1ZW5jZTtcbiAgfSxcbiAgZmlsdGVyTm90OiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIobm90KHByZWRpY2F0ZSksIGNvbnRleHQpO1xuICB9LFxuICBmaW5kTGFzdDogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0LCBub3RTZXRWYWx1ZSkge1xuICAgIHJldHVybiB0aGlzLnRvS2V5ZWRTZXEoKS5yZXZlcnNlKCkuZmluZChwcmVkaWNhdGUsIGNvbnRleHQsIG5vdFNldFZhbHVlKTtcbiAgfSxcbiAgZmlyc3Q6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmZpbmQocmV0dXJuVHJ1ZSk7XG4gIH0sXG4gIGZsYXRNYXA6IGZ1bmN0aW9uKG1hcHBlciwgY29udGV4dCkge1xuICAgIHJldHVybiByZWlmeSh0aGlzLCBmbGF0TWFwRmFjdG9yeSh0aGlzLCBtYXBwZXIsIGNvbnRleHQpKTtcbiAgfSxcbiAgZmxhdHRlbjogZnVuY3Rpb24oZGVwdGgpIHtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgZmxhdHRlbkZhY3RvcnkodGhpcywgZGVwdGgsIHRydWUpKTtcbiAgfSxcbiAgZnJvbUVudHJ5U2VxOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IEZyb21FbnRyaWVzU2VxdWVuY2UodGhpcyk7XG4gIH0sXG4gIGdldDogZnVuY3Rpb24oc2VhcmNoS2V5LCBub3RTZXRWYWx1ZSkge1xuICAgIHJldHVybiB0aGlzLmZpbmQoKGZ1bmN0aW9uKF8sIGtleSkge1xuICAgICAgcmV0dXJuIGlzKGtleSwgc2VhcmNoS2V5KTtcbiAgICB9KSwgdW5kZWZpbmVkLCBub3RTZXRWYWx1ZSk7XG4gIH0sXG4gIGdldEluOiBmdW5jdGlvbihzZWFyY2hLZXlQYXRoLCBub3RTZXRWYWx1ZSkge1xuICAgIHZhciBuZXN0ZWQgPSB0aGlzO1xuICAgIGlmIChzZWFyY2hLZXlQYXRoKSB7XG4gICAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgc2VhcmNoS2V5UGF0aC5sZW5ndGg7IGlpKyspIHtcbiAgICAgICAgbmVzdGVkID0gbmVzdGVkICYmIG5lc3RlZC5nZXQgPyBuZXN0ZWQuZ2V0KHNlYXJjaEtleVBhdGhbaWldLCBOT1RfU0VUKSA6IE5PVF9TRVQ7XG4gICAgICAgIGlmIChuZXN0ZWQgPT09IE5PVF9TRVQpIHtcbiAgICAgICAgICByZXR1cm4gbm90U2V0VmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5lc3RlZDtcbiAgfSxcbiAgZ3JvdXBCeTogZnVuY3Rpb24oZ3JvdXBlciwgY29udGV4dCkge1xuICAgIHJldHVybiBncm91cEJ5RmFjdG9yeSh0aGlzLCBncm91cGVyLCBjb250ZXh0KTtcbiAgfSxcbiAgaGFzOiBmdW5jdGlvbihzZWFyY2hLZXkpIHtcbiAgICByZXR1cm4gdGhpcy5nZXQoc2VhcmNoS2V5LCBOT1RfU0VUKSAhPT0gTk9UX1NFVDtcbiAgfSxcbiAgaXNTdWJzZXQ6IGZ1bmN0aW9uKGl0ZXIpIHtcbiAgICBpdGVyID0gdHlwZW9mIGl0ZXIuY29udGFpbnMgPT09ICdmdW5jdGlvbicgPyBpdGVyIDogJEl0ZXJhYmxlKGl0ZXIpO1xuICAgIHJldHVybiB0aGlzLmV2ZXJ5KChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIGl0ZXIuY29udGFpbnModmFsdWUpO1xuICAgIH0pKTtcbiAgfSxcbiAgaXNTdXBlcnNldDogZnVuY3Rpb24oaXRlcikge1xuICAgIHJldHVybiBpdGVyLmlzU3Vic2V0KHRoaXMpO1xuICB9LFxuICBrZXlTZXE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnRvU2VxKCkubWFwKGtleU1hcHBlcikudG9JbmRleGVkU2VxKCk7XG4gIH0sXG4gIGxhc3Q6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnRvU2VxKCkucmV2ZXJzZSgpLmZpcnN0KCk7XG4gIH0sXG4gIG1heDogZnVuY3Rpb24oY29tcGFyYXRvcikge1xuICAgIHJldHVybiB0aGlzLm1heEJ5KHZhbHVlTWFwcGVyLCBjb21wYXJhdG9yKTtcbiAgfSxcbiAgbWF4Qnk6IGZ1bmN0aW9uKG1hcHBlciwgY29tcGFyYXRvcikge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICBjb21wYXJhdG9yID0gY29tcGFyYXRvciB8fCBkZWZhdWx0Q29tcGFyYXRvcjtcbiAgICB2YXIgbWF4RW50cnkgPSB0aGlzLmVudHJ5U2VxKCkucmVkdWNlKChmdW5jdGlvbihtYXgsIG5leHQpIHtcbiAgICAgIHJldHVybiBjb21wYXJhdG9yKG1hcHBlcihuZXh0WzFdLCBuZXh0WzBdLCAkX18wKSwgbWFwcGVyKG1heFsxXSwgbWF4WzBdLCAkX18wKSkgPiAwID8gbmV4dCA6IG1heDtcbiAgICB9KSk7XG4gICAgcmV0dXJuIG1heEVudHJ5ICYmIG1heEVudHJ5WzFdO1xuICB9LFxuICBtaW46IGZ1bmN0aW9uKGNvbXBhcmF0b3IpIHtcbiAgICByZXR1cm4gdGhpcy5taW5CeSh2YWx1ZU1hcHBlciwgY29tcGFyYXRvcik7XG4gIH0sXG4gIG1pbkJ5OiBmdW5jdGlvbihtYXBwZXIsIGNvbXBhcmF0b3IpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgY29tcGFyYXRvciA9IGNvbXBhcmF0b3IgfHwgZGVmYXVsdENvbXBhcmF0b3I7XG4gICAgdmFyIG1pbkVudHJ5ID0gdGhpcy5lbnRyeVNlcSgpLnJlZHVjZSgoZnVuY3Rpb24obWluLCBuZXh0KSB7XG4gICAgICByZXR1cm4gY29tcGFyYXRvcihtYXBwZXIobmV4dFsxXSwgbmV4dFswXSwgJF9fMCksIG1hcHBlcihtaW5bMV0sIG1pblswXSwgJF9fMCkpIDwgMCA/IG5leHQgOiBtaW47XG4gICAgfSkpO1xuICAgIHJldHVybiBtaW5FbnRyeSAmJiBtaW5FbnRyeVsxXTtcbiAgfSxcbiAgcmVzdDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuc2xpY2UoMSk7XG4gIH0sXG4gIHNraXA6IGZ1bmN0aW9uKGFtb3VudCkge1xuICAgIHJldHVybiByZWlmeSh0aGlzLCBza2lwRmFjdG9yeSh0aGlzLCBhbW91bnQsIHRydWUpKTtcbiAgfSxcbiAgc2tpcExhc3Q6IGZ1bmN0aW9uKGFtb3VudCkge1xuICAgIHJldHVybiByZWlmeSh0aGlzLCB0aGlzLnRvU2VxKCkucmV2ZXJzZSgpLnNraXAoYW1vdW50KS5yZXZlcnNlKCkpO1xuICB9LFxuICBza2lwV2hpbGU6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHJldHVybiByZWlmeSh0aGlzLCBza2lwV2hpbGVGYWN0b3J5KHRoaXMsIHByZWRpY2F0ZSwgY29udGV4dCwgdHJ1ZSkpO1xuICB9LFxuICBza2lwVW50aWw6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHJldHVybiB0aGlzLnNraXBXaGlsZShub3QocHJlZGljYXRlKSwgY29udGV4dCk7XG4gIH0sXG4gIHNvcnRCeTogZnVuY3Rpb24obWFwcGVyLCBjb21wYXJhdG9yKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIGNvbXBhcmF0b3IgPSBjb21wYXJhdG9yIHx8IGRlZmF1bHRDb21wYXJhdG9yO1xuICAgIHJldHVybiByZWlmeSh0aGlzLCBuZXcgQXJyYXlTZXEodGhpcy5lbnRyeVNlcSgpLmVudHJ5U2VxKCkudG9BcnJheSgpLnNvcnQoKGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgIHJldHVybiBjb21wYXJhdG9yKG1hcHBlcihhWzFdWzFdLCBhWzFdWzBdLCAkX18wKSwgbWFwcGVyKGJbMV1bMV0sIGJbMV1bMF0sICRfXzApKSB8fCBhWzBdIC0gYlswXTtcbiAgICB9KSkpLmZyb21FbnRyeVNlcSgpLnZhbHVlU2VxKCkuZnJvbUVudHJ5U2VxKCkpO1xuICB9LFxuICB0YWtlOiBmdW5jdGlvbihhbW91bnQpIHtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgdGFrZUZhY3RvcnkodGhpcywgYW1vdW50KSk7XG4gIH0sXG4gIHRha2VMYXN0OiBmdW5jdGlvbihhbW91bnQpIHtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgdGhpcy50b1NlcSgpLnJldmVyc2UoKS50YWtlKGFtb3VudCkucmV2ZXJzZSgpKTtcbiAgfSxcbiAgdGFrZVdoaWxlOiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgdGFrZVdoaWxlRmFjdG9yeSh0aGlzLCBwcmVkaWNhdGUsIGNvbnRleHQpKTtcbiAgfSxcbiAgdGFrZVVudGlsOiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gdGhpcy50YWtlV2hpbGUobm90KHByZWRpY2F0ZSksIGNvbnRleHQpO1xuICB9LFxuICB2YWx1ZVNlcTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudG9JbmRleGVkU2VxKCk7XG4gIH0sXG4gIGhhc2hDb2RlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fX2hhc2ggfHwgKHRoaXMuX19oYXNoID0gdGhpcy5zaXplID09PSBJbmZpbml0eSA/IDAgOiB0aGlzLnJlZHVjZSgoZnVuY3Rpb24oaCwgdiwgaykge1xuICAgICAgcmV0dXJuIChoICsgKGhhc2godikgXiAodiA9PT0gayA/IDAgOiBoYXNoKGspKSkpICYgSEFTSF9NQVhfVkFMO1xuICAgIH0pLCAwKSk7XG4gIH1cbn0sIHt9KTtcbnZhciBJU19JVEVSQUJMRV9TRU5USU5FTCA9ICdAQF9fSU1NVVRBQkxFX0lURVJBQkxFX19AQCc7XG52YXIgSVNfS0VZRURfU0VOVElORUwgPSAnQEBfX0lNTVVUQUJMRV9LRVlFRF9fQEAnO1xudmFyIElTX0lOREVYRURfU0VOVElORUwgPSAnQEBfX0lNTVVUQUJMRV9JTkRFWEVEX19AQCc7XG52YXIgSXRlcmFibGVQcm90b3R5cGUgPSBJdGVyYWJsZS5wcm90b3R5cGU7XG5JdGVyYWJsZVByb3RvdHlwZVtJU19JVEVSQUJMRV9TRU5USU5FTF0gPSB0cnVlO1xuSXRlcmFibGVQcm90b3R5cGVbSVRFUkFUT1JfU1lNQk9MXSA9IEl0ZXJhYmxlUHJvdG90eXBlLnZhbHVlcztcbkl0ZXJhYmxlUHJvdG90eXBlLnRvSlNPTiA9IEl0ZXJhYmxlUHJvdG90eXBlLnRvSlM7XG5JdGVyYWJsZVByb3RvdHlwZS5fX3RvSlMgPSBJdGVyYWJsZVByb3RvdHlwZS50b0FycmF5O1xuSXRlcmFibGVQcm90b3R5cGUuX190b1N0cmluZ01hcHBlciA9IHF1b3RlU3RyaW5nO1xuSXRlcmFibGVQcm90b3R5cGUuaW5zcGVjdCA9IEl0ZXJhYmxlUHJvdG90eXBlLnRvU291cmNlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnRvU3RyaW5nKCk7XG59O1xuSXRlcmFibGVQcm90b3R5cGUuY2hhaW4gPSBJdGVyYWJsZVByb3RvdHlwZS5mbGF0TWFwO1xuKGZ1bmN0aW9uKCkge1xuICB0cnkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShJdGVyYWJsZVByb3RvdHlwZSwgJ2xlbmd0aCcsIHtnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoIUl0ZXJhYmxlLm5vTGVuZ3RoV2FybmluZykge1xuICAgICAgICAgIHZhciBzdGFjaztcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHN0YWNrID0gZXJyb3Iuc3RhY2s7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzdGFjay5pbmRleE9mKCdfd3JhcE9iamVjdCcpID09PSAtMSkge1xuICAgICAgICAgICAgY29uc29sZSAmJiBjb25zb2xlLndhcm4gJiYgY29uc29sZS53YXJuKCdpdGVyYWJsZS5sZW5ndGggaGFzIGJlZW4gZGVwcmVjYXRlZCwgJyArICd1c2UgaXRlcmFibGUuc2l6ZSBvciBpdGVyYWJsZS5jb3VudCgpLiAnICsgJ1RoaXMgd2FybmluZyB3aWxsIGJlY29tZSBhIHNpbGVudCBlcnJvciBpbiBhIGZ1dHVyZSB2ZXJzaW9uLiAnICsgc3RhY2spO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2l6ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH19KTtcbiAgfSBjYXRjaCAoZSkge31cbn0pKCk7XG52YXIgS2V5ZWRJdGVyYWJsZSA9IGZ1bmN0aW9uIEtleWVkSXRlcmFibGUodmFsdWUpIHtcbiAgcmV0dXJuIGlzS2V5ZWQodmFsdWUpID8gdmFsdWUgOiBLZXllZFNlcS5hcHBseSh1bmRlZmluZWQsIGFyZ3VtZW50cyk7XG59O1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoS2V5ZWRJdGVyYWJsZSwge1xuICBmbGlwOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgZmxpcEZhY3RvcnkodGhpcykpO1xuICB9LFxuICBmaW5kS2V5OiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICB2YXIgZm91bmRLZXk7XG4gICAgdGhpcy5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYsIGssIGMpIHtcbiAgICAgIGlmIChwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2LCBrLCBjKSkge1xuICAgICAgICBmb3VuZEtleSA9IGs7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9KSk7XG4gICAgcmV0dXJuIGZvdW5kS2V5O1xuICB9LFxuICBmaW5kTGFzdEtleTogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHRoaXMudG9TZXEoKS5yZXZlcnNlKCkuZmluZEtleShwcmVkaWNhdGUsIGNvbnRleHQpO1xuICB9LFxuICBrZXlPZjogZnVuY3Rpb24oc2VhcmNoVmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5maW5kS2V5KChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIGlzKHZhbHVlLCBzZWFyY2hWYWx1ZSk7XG4gICAgfSkpO1xuICB9LFxuICBsYXN0S2V5T2Y6IGZ1bmN0aW9uKHNlYXJjaFZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMudG9TZXEoKS5yZXZlcnNlKCkua2V5T2Yoc2VhcmNoVmFsdWUpO1xuICB9LFxuICBtYXBFbnRyaWVzOiBmdW5jdGlvbihtYXBwZXIsIGNvbnRleHQpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIHJldHVybiByZWlmeSh0aGlzLCB0aGlzLnRvU2VxKCkubWFwKChmdW5jdGlvbih2LCBrKSB7XG4gICAgICByZXR1cm4gbWFwcGVyLmNhbGwoY29udGV4dCwgW2ssIHZdLCBpdGVyYXRpb25zKyssICRfXzApO1xuICAgIH0pKS5mcm9tRW50cnlTZXEoKSk7XG4gIH0sXG4gIG1hcEtleXM6IGZ1bmN0aW9uKG1hcHBlciwgY29udGV4dCkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICByZXR1cm4gcmVpZnkodGhpcywgdGhpcy50b1NlcSgpLmZsaXAoKS5tYXAoKGZ1bmN0aW9uKGssIHYpIHtcbiAgICAgIHJldHVybiBtYXBwZXIuY2FsbChjb250ZXh0LCBrLCB2LCAkX18wKTtcbiAgICB9KSkuZmxpcCgpKTtcbiAgfVxufSwge30sIEl0ZXJhYmxlKTtcbnZhciBLZXllZEl0ZXJhYmxlUHJvdG90eXBlID0gS2V5ZWRJdGVyYWJsZS5wcm90b3R5cGU7XG5LZXllZEl0ZXJhYmxlUHJvdG90eXBlW0lTX0tFWUVEX1NFTlRJTkVMXSA9IHRydWU7XG5LZXllZEl0ZXJhYmxlUHJvdG90eXBlW0lURVJBVE9SX1NZTUJPTF0gPSBJdGVyYWJsZVByb3RvdHlwZS5lbnRyaWVzO1xuS2V5ZWRJdGVyYWJsZVByb3RvdHlwZS5fX3RvSlMgPSBJdGVyYWJsZVByb3RvdHlwZS50b09iamVjdDtcbktleWVkSXRlcmFibGVQcm90b3R5cGUuX190b1N0cmluZ01hcHBlciA9IChmdW5jdGlvbih2LCBrKSB7XG4gIHJldHVybiBrICsgJzogJyArIHF1b3RlU3RyaW5nKHYpO1xufSk7XG52YXIgSW5kZXhlZEl0ZXJhYmxlID0gZnVuY3Rpb24gSW5kZXhlZEl0ZXJhYmxlKHZhbHVlKSB7XG4gIHJldHVybiBpc0luZGV4ZWQodmFsdWUpID8gdmFsdWUgOiBJbmRleGVkU2VxLmFwcGx5KHVuZGVmaW5lZCwgYXJndW1lbnRzKTtcbn07XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShJbmRleGVkSXRlcmFibGUsIHtcbiAgdG9LZXllZFNlcTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBUb0tleWVkU2VxdWVuY2UodGhpcywgZmFsc2UpO1xuICB9LFxuICBjb25jYXQ6IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIHZhbHVlcyA9IFtdLFxuICAgICAgICAkX18zID0gMDsgJF9fMyA8IGFyZ3VtZW50cy5sZW5ndGg7ICRfXzMrKylcbiAgICAgIHZhbHVlc1skX18zXSA9IGFyZ3VtZW50c1skX18zXTtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgY29uY2F0RmFjdG9yeSh0aGlzLCB2YWx1ZXMsIGZhbHNlKSk7XG4gIH0sXG4gIGZpbHRlcjogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIGZpbHRlckZhY3RvcnkodGhpcywgcHJlZGljYXRlLCBjb250ZXh0LCBmYWxzZSkpO1xuICB9LFxuICBmaW5kSW5kZXg6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHZhciBrZXkgPSB0aGlzLnRvS2V5ZWRTZXEoKS5maW5kS2V5KHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgcmV0dXJuIGtleSA9PT0gdW5kZWZpbmVkID8gLTEgOiBrZXk7XG4gIH0sXG4gIGluZGV4T2Y6IGZ1bmN0aW9uKHNlYXJjaFZhbHVlKSB7XG4gICAgdmFyIGtleSA9IHRoaXMudG9LZXllZFNlcSgpLmtleU9mKHNlYXJjaFZhbHVlKTtcbiAgICByZXR1cm4ga2V5ID09PSB1bmRlZmluZWQgPyAtMSA6IGtleTtcbiAgfSxcbiAgbGFzdEluZGV4T2Y6IGZ1bmN0aW9uKHNlYXJjaFZhbHVlKSB7XG4gICAgdmFyIGtleSA9IHRoaXMudG9LZXllZFNlcSgpLmxhc3RLZXlPZihzZWFyY2hWYWx1ZSk7XG4gICAgcmV0dXJuIGtleSA9PT0gdW5kZWZpbmVkID8gLTEgOiBrZXk7XG4gIH0sXG4gIHJldmVyc2U6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiByZWlmeSh0aGlzLCByZXZlcnNlRmFjdG9yeSh0aGlzLCBmYWxzZSkpO1xuICB9LFxuICBzcGxpY2U6IGZ1bmN0aW9uKGluZGV4LCByZW1vdmVOdW0pIHtcbiAgICB2YXIgbnVtQXJncyA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgcmVtb3ZlTnVtID0gTWF0aC5tYXgocmVtb3ZlTnVtIHwgMCwgMCk7XG4gICAgaWYgKG51bUFyZ3MgPT09IDAgfHwgKG51bUFyZ3MgPT09IDIgJiYgIXJlbW92ZU51bSkpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBpbmRleCA9IHJlc29sdmVCZWdpbihpbmRleCwgdGhpcy5zaXplKTtcbiAgICB2YXIgc3BsaWNlZCA9IHRoaXMuc2xpY2UoMCwgaW5kZXgpO1xuICAgIHJldHVybiByZWlmeSh0aGlzLCBudW1BcmdzID09PSAxID8gc3BsaWNlZCA6IHNwbGljZWQuY29uY2F0KGFyckNvcHkoYXJndW1lbnRzLCAyKSwgdGhpcy5zbGljZShpbmRleCArIHJlbW92ZU51bSkpKTtcbiAgfSxcbiAgZmluZExhc3RJbmRleDogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgdmFyIGtleSA9IHRoaXMudG9LZXllZFNlcSgpLmZpbmRMYXN0S2V5KHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgcmV0dXJuIGtleSA9PT0gdW5kZWZpbmVkID8gLTEgOiBrZXk7XG4gIH0sXG4gIGZpcnN0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5nZXQoMCk7XG4gIH0sXG4gIGZsYXR0ZW46IGZ1bmN0aW9uKGRlcHRoKSB7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIGZsYXR0ZW5GYWN0b3J5KHRoaXMsIGRlcHRoLCBmYWxzZSkpO1xuICB9LFxuICBnZXQ6IGZ1bmN0aW9uKGluZGV4LCBub3RTZXRWYWx1ZSkge1xuICAgIGluZGV4ID0gd3JhcEluZGV4KHRoaXMsIGluZGV4KTtcbiAgICByZXR1cm4gKGluZGV4IDwgMCB8fCAodGhpcy5zaXplID09PSBJbmZpbml0eSB8fCAodGhpcy5zaXplICE9PSB1bmRlZmluZWQgJiYgaW5kZXggPiB0aGlzLnNpemUpKSkgPyBub3RTZXRWYWx1ZSA6IHRoaXMuZmluZCgoZnVuY3Rpb24oXywga2V5KSB7XG4gICAgICByZXR1cm4ga2V5ID09PSBpbmRleDtcbiAgICB9KSwgdW5kZWZpbmVkLCBub3RTZXRWYWx1ZSk7XG4gIH0sXG4gIGhhczogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICBpbmRleCA9IHdyYXBJbmRleCh0aGlzLCBpbmRleCk7XG4gICAgcmV0dXJuIGluZGV4ID49IDAgJiYgKHRoaXMuc2l6ZSAhPT0gdW5kZWZpbmVkID8gdGhpcy5zaXplID09PSBJbmZpbml0eSB8fCBpbmRleCA8IHRoaXMuc2l6ZSA6IHRoaXMuaW5kZXhPZihpbmRleCkgIT09IC0xKTtcbiAgfSxcbiAgaW50ZXJwb3NlOiBmdW5jdGlvbihzZXBhcmF0b3IpIHtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgaW50ZXJwb3NlRmFjdG9yeSh0aGlzLCBzZXBhcmF0b3IpKTtcbiAgfSxcbiAgbGFzdDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0KC0xKTtcbiAgfSxcbiAgc2tpcDogZnVuY3Rpb24oYW1vdW50KSB7XG4gICAgdmFyIGl0ZXIgPSB0aGlzO1xuICAgIHZhciBza2lwU2VxID0gc2tpcEZhY3RvcnkoaXRlciwgYW1vdW50LCBmYWxzZSk7XG4gICAgaWYgKGlzU2VxKGl0ZXIpICYmIHNraXBTZXEgIT09IGl0ZXIpIHtcbiAgICAgIHNraXBTZXEuZ2V0ID0gZnVuY3Rpb24oaW5kZXgsIG5vdFNldFZhbHVlKSB7XG4gICAgICAgIGluZGV4ID0gd3JhcEluZGV4KHRoaXMsIGluZGV4KTtcbiAgICAgICAgcmV0dXJuIGluZGV4ID49IDAgPyBpdGVyLmdldChpbmRleCArIGFtb3VudCwgbm90U2V0VmFsdWUpIDogbm90U2V0VmFsdWU7XG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gcmVpZnkodGhpcywgc2tpcFNlcSk7XG4gIH0sXG4gIHNraXBXaGlsZTogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHJlaWZ5KHRoaXMsIHNraXBXaGlsZUZhY3RvcnkodGhpcywgcHJlZGljYXRlLCBjb250ZXh0LCBmYWxzZSkpO1xuICB9LFxuICBzb3J0Qnk6IGZ1bmN0aW9uKG1hcHBlciwgY29tcGFyYXRvcikge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICBjb21wYXJhdG9yID0gY29tcGFyYXRvciB8fCBkZWZhdWx0Q29tcGFyYXRvcjtcbiAgICByZXR1cm4gcmVpZnkodGhpcywgbmV3IEFycmF5U2VxKHRoaXMuZW50cnlTZXEoKS50b0FycmF5KCkuc29ydCgoZnVuY3Rpb24oYSwgYikge1xuICAgICAgcmV0dXJuIGNvbXBhcmF0b3IobWFwcGVyKGFbMV0sIGFbMF0sICRfXzApLCBtYXBwZXIoYlsxXSwgYlswXSwgJF9fMCkpIHx8IGFbMF0gLSBiWzBdO1xuICAgIH0pKSkuZnJvbUVudHJ5U2VxKCkudmFsdWVTZXEoKSk7XG4gIH0sXG4gIHRha2U6IGZ1bmN0aW9uKGFtb3VudCkge1xuICAgIHZhciBpdGVyID0gdGhpcztcbiAgICB2YXIgdGFrZVNlcSA9IHRha2VGYWN0b3J5KGl0ZXIsIGFtb3VudCk7XG4gICAgaWYgKGlzU2VxKGl0ZXIpICYmIHRha2VTZXEgIT09IGl0ZXIpIHtcbiAgICAgIHRha2VTZXEuZ2V0ID0gZnVuY3Rpb24oaW5kZXgsIG5vdFNldFZhbHVlKSB7XG4gICAgICAgIGluZGV4ID0gd3JhcEluZGV4KHRoaXMsIGluZGV4KTtcbiAgICAgICAgcmV0dXJuIGluZGV4ID49IDAgJiYgaW5kZXggPCBhbW91bnQgPyBpdGVyLmdldChpbmRleCwgbm90U2V0VmFsdWUpIDogbm90U2V0VmFsdWU7XG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gcmVpZnkodGhpcywgdGFrZVNlcSk7XG4gIH1cbn0sIHt9LCBJdGVyYWJsZSk7XG5JbmRleGVkSXRlcmFibGUucHJvdG90eXBlW0lTX0lOREVYRURfU0VOVElORUxdID0gdHJ1ZTtcbnZhciBTZXRJdGVyYWJsZSA9IGZ1bmN0aW9uIFNldEl0ZXJhYmxlKHZhbHVlKSB7XG4gIHJldHVybiBpc0l0ZXJhYmxlKHZhbHVlKSAmJiAhaXNBc3NvY2lhdGl2ZSh2YWx1ZSkgPyB2YWx1ZSA6IFNldFNlcS5hcHBseSh1bmRlZmluZWQsIGFyZ3VtZW50cyk7XG59O1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoU2V0SXRlcmFibGUsIHtcbiAgZ2V0OiBmdW5jdGlvbih2YWx1ZSwgbm90U2V0VmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5oYXModmFsdWUpID8gdmFsdWUgOiBub3RTZXRWYWx1ZTtcbiAgfSxcbiAgY29udGFpbnM6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuaGFzKHZhbHVlKTtcbiAgfSxcbiAga2V5U2VxOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZVNlcSgpO1xuICB9XG59LCB7fSwgSXRlcmFibGUpO1xuU2V0SXRlcmFibGUucHJvdG90eXBlLmhhcyA9IEl0ZXJhYmxlUHJvdG90eXBlLmNvbnRhaW5zO1xuZnVuY3Rpb24gaXNJdGVyYWJsZShtYXliZUl0ZXJhYmxlKSB7XG4gIHJldHVybiAhIShtYXliZUl0ZXJhYmxlICYmIG1heWJlSXRlcmFibGVbSVNfSVRFUkFCTEVfU0VOVElORUxdKTtcbn1cbmZ1bmN0aW9uIGlzS2V5ZWQobWF5YmVLZXllZCkge1xuICByZXR1cm4gISEobWF5YmVLZXllZCAmJiBtYXliZUtleWVkW0lTX0tFWUVEX1NFTlRJTkVMXSk7XG59XG5mdW5jdGlvbiBpc0luZGV4ZWQobWF5YmVJbmRleGVkKSB7XG4gIHJldHVybiAhIShtYXliZUluZGV4ZWQgJiYgbWF5YmVJbmRleGVkW0lTX0lOREVYRURfU0VOVElORUxdKTtcbn1cbmZ1bmN0aW9uIGlzQXNzb2NpYXRpdmUobWF5YmVBc3NvY2lhdGl2ZSkge1xuICByZXR1cm4gaXNLZXllZChtYXliZUFzc29jaWF0aXZlKSB8fCBpc0luZGV4ZWQobWF5YmVBc3NvY2lhdGl2ZSk7XG59XG5JdGVyYWJsZS5pc0l0ZXJhYmxlID0gaXNJdGVyYWJsZTtcbkl0ZXJhYmxlLmlzS2V5ZWQgPSBpc0tleWVkO1xuSXRlcmFibGUuaXNJbmRleGVkID0gaXNJbmRleGVkO1xuSXRlcmFibGUuaXNBc3NvY2lhdGl2ZSA9IGlzQXNzb2NpYXRpdmU7XG5JdGVyYWJsZS5LZXllZCA9IEtleWVkSXRlcmFibGU7XG5JdGVyYWJsZS5JbmRleGVkID0gSW5kZXhlZEl0ZXJhYmxlO1xuSXRlcmFibGUuU2V0ID0gU2V0SXRlcmFibGU7XG5JdGVyYWJsZS5JdGVyYXRvciA9IEl0ZXJhdG9yO1xuZnVuY3Rpb24gdmFsdWVNYXBwZXIodikge1xuICByZXR1cm4gdjtcbn1cbmZ1bmN0aW9uIGtleU1hcHBlcih2LCBrKSB7XG4gIHJldHVybiBrO1xufVxuZnVuY3Rpb24gZW50cnlNYXBwZXIodiwgaykge1xuICByZXR1cm4gW2ssIHZdO1xufVxuZnVuY3Rpb24gbm90KHByZWRpY2F0ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICFwcmVkaWNhdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcbn1cbmZ1bmN0aW9uIHF1b3RlU3RyaW5nKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gSlNPTi5zdHJpbmdpZnkodmFsdWUpIDogdmFsdWU7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q29tcGFyYXRvcihhLCBiKSB7XG4gIHJldHVybiBhID4gYiA/IDEgOiBhIDwgYiA/IC0xIDogMDtcbn1cbmZ1bmN0aW9uIG1peGluKGN0b3IsIG1ldGhvZHMpIHtcbiAgdmFyIHByb3RvID0gY3Rvci5wcm90b3R5cGU7XG4gIE9iamVjdC5rZXlzKG1ldGhvZHMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgcHJvdG9ba2V5XSA9IG1ldGhvZHNba2V5XTtcbiAgfSk7XG4gIHJldHVybiBjdG9yO1xufVxudmFyIFNlcSA9IGZ1bmN0aW9uIFNlcSh2YWx1ZSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMCA/IGVtcHR5U2VxdWVuY2UoKSA6IChpc0l0ZXJhYmxlKHZhbHVlKSA/IHZhbHVlIDogc2VxRnJvbVZhbHVlKHZhbHVlLCBmYWxzZSkpLnRvU2VxKCk7XG59O1xudmFyICRTZXEgPSBTZXE7XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShTZXEsIHtcbiAgdG9TZXE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX190b1N0cmluZygnU2VxIHsnLCAnfScpO1xuICB9LFxuICBjYWNoZVJlc3VsdDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLl9jYWNoZSAmJiB0aGlzLl9faXRlcmF0ZVVuY2FjaGVkKSB7XG4gICAgICB0aGlzLl9jYWNoZSA9IHRoaXMuZW50cnlTZXEoKS50b0FycmF5KCk7XG4gICAgICB0aGlzLnNpemUgPSB0aGlzLl9jYWNoZS5sZW5ndGg7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBfX2l0ZXJhdGU6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgcmV0dXJuIHNlcUl0ZXJhdGUodGhpcywgZm4sIHJldmVyc2UsIHRydWUpO1xuICB9LFxuICBfX2l0ZXJhdG9yOiBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgcmV0dXJuIHNlcUl0ZXJhdG9yKHRoaXMsIHR5cGUsIHJldmVyc2UsIHRydWUpO1xuICB9XG59LCB7b2Y6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAkU2VxKGFyZ3VtZW50cyk7XG4gIH19LCBJdGVyYWJsZSk7XG52YXIgS2V5ZWRTZXEgPSBmdW5jdGlvbiBLZXllZFNlcSh2YWx1ZSkge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBlbXB0eVNlcXVlbmNlKCkudG9LZXllZFNlcSgpO1xuICB9XG4gIGlmICghaXNJdGVyYWJsZSh2YWx1ZSkpIHtcbiAgICB2YWx1ZSA9IHNlcUZyb21WYWx1ZSh2YWx1ZSwgZmFsc2UpO1xuICB9XG4gIHJldHVybiBpc0tleWVkKHZhbHVlKSA/IHZhbHVlLnRvU2VxKCkgOiB2YWx1ZS5mcm9tRW50cnlTZXEoKTtcbn07XG52YXIgJEtleWVkU2VxID0gS2V5ZWRTZXE7XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShLZXllZFNlcSwge1xuICB0b0tleWVkU2VxOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgdG9TZXE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzO1xuICB9XG59LCB7b2Y6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAkS2V5ZWRTZXEoYXJndW1lbnRzKTtcbiAgfX0sIFNlcSk7XG5taXhpbihLZXllZFNlcSwgS2V5ZWRJdGVyYWJsZS5wcm90b3R5cGUpO1xudmFyIEluZGV4ZWRTZXEgPSBmdW5jdGlvbiBJbmRleGVkU2VxKHZhbHVlKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAwID8gZW1wdHlTZXF1ZW5jZSgpIDogKGlzSXRlcmFibGUodmFsdWUpID8gdmFsdWUgOiBzZXFGcm9tVmFsdWUodmFsdWUsIGZhbHNlKSkudG9JbmRleGVkU2VxKCk7XG59O1xudmFyICRJbmRleGVkU2VxID0gSW5kZXhlZFNlcTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKEluZGV4ZWRTZXEsIHtcbiAgdG9JbmRleGVkU2VxOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9fdG9TdHJpbmcoJ1NlcSBbJywgJ10nKTtcbiAgfSxcbiAgX19pdGVyYXRlOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHJldHVybiBzZXFJdGVyYXRlKHRoaXMsIGZuLCByZXZlcnNlLCBmYWxzZSk7XG4gIH0sXG4gIF9faXRlcmF0b3I6IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICByZXR1cm4gc2VxSXRlcmF0b3IodGhpcywgdHlwZSwgcmV2ZXJzZSwgZmFsc2UpO1xuICB9XG59LCB7b2Y6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAkSW5kZXhlZFNlcShhcmd1bWVudHMpO1xuICB9fSwgU2VxKTtcbm1peGluKEluZGV4ZWRTZXEsIEluZGV4ZWRJdGVyYWJsZS5wcm90b3R5cGUpO1xudmFyIFNldFNlcSA9IGZ1bmN0aW9uIFNldFNlcSh2YWx1ZSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMCA/IGVtcHR5U2VxdWVuY2UoKS50b1NldFNlcSgpIDogKGlzSXRlcmFibGUodmFsdWUpID8gdmFsdWUgOiBzZXFGcm9tVmFsdWUodmFsdWUsIGZhbHNlKSkudG9TZXRTZXEoKTtcbn07XG52YXIgJFNldFNlcSA9IFNldFNlcTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFNldFNlcSwge3RvU2V0U2VxOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfX0sIHtvZjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICRTZXRTZXEoYXJndW1lbnRzKTtcbiAgfX0sIFNlcSk7XG5taXhpbihTZXRTZXEsIFNldEl0ZXJhYmxlLnByb3RvdHlwZSk7XG5TZXEuaXNTZXEgPSBpc1NlcTtcblNlcS5LZXllZCA9IEtleWVkU2VxO1xuU2VxLlNldCA9IFNldFNlcTtcblNlcS5JbmRleGVkID0gSW5kZXhlZFNlcTtcbnZhciBJU19TRVFfU0VOVElORUwgPSAnQEBfX0lNTVVUQUJMRV9TRVFfX0BAJztcblNlcS5wcm90b3R5cGVbSVNfU0VRX1NFTlRJTkVMXSA9IHRydWU7XG52YXIgQXJyYXlTZXEgPSBmdW5jdGlvbiBBcnJheVNlcShhcnJheSkge1xuICB0aGlzLl9hcnJheSA9IGFycmF5O1xuICB0aGlzLnNpemUgPSBhcnJheS5sZW5ndGg7XG59O1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoQXJyYXlTZXEsIHtcbiAgZ2V0OiBmdW5jdGlvbihpbmRleCwgbm90U2V0VmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5oYXMoaW5kZXgpID8gdGhpcy5fYXJyYXlbd3JhcEluZGV4KHRoaXMsIGluZGV4KV0gOiBub3RTZXRWYWx1ZTtcbiAgfSxcbiAgX19pdGVyYXRlOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciBhcnJheSA9IHRoaXMuX2FycmF5O1xuICAgIHZhciBtYXhJbmRleCA9IGFycmF5Lmxlbmd0aCAtIDE7XG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8PSBtYXhJbmRleDsgaWkrKykge1xuICAgICAgaWYgKGZuKGFycmF5W3JldmVyc2UgPyBtYXhJbmRleCAtIGlpIDogaWldLCBpaSwgdGhpcykgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBpaSArIDE7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpaTtcbiAgfSxcbiAgX19pdGVyYXRvcjogZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHZhciBhcnJheSA9IHRoaXMuX2FycmF5O1xuICAgIHZhciBtYXhJbmRleCA9IGFycmF5Lmxlbmd0aCAtIDE7XG4gICAgdmFyIGlpID0gMDtcbiAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBpaSA+IG1heEluZGV4ID8gaXRlcmF0b3JEb25lKCkgOiBpdGVyYXRvclZhbHVlKHR5cGUsIGlpLCBhcnJheVtyZXZlcnNlID8gbWF4SW5kZXggLSBpaSsrIDogaWkrK10pO1xuICAgIH0pKTtcbiAgfVxufSwge30sIEluZGV4ZWRTZXEpO1xudmFyIE9iamVjdFNlcSA9IGZ1bmN0aW9uIE9iamVjdFNlcShvYmplY3QpIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmplY3QpO1xuICB0aGlzLl9vYmplY3QgPSBvYmplY3Q7XG4gIHRoaXMuX2tleXMgPSBrZXlzO1xuICB0aGlzLnNpemUgPSBrZXlzLmxlbmd0aDtcbn07XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShPYmplY3RTZXEsIHtcbiAgZ2V0OiBmdW5jdGlvbihrZXksIG5vdFNldFZhbHVlKSB7XG4gICAgaWYgKG5vdFNldFZhbHVlICE9PSB1bmRlZmluZWQgJiYgIXRoaXMuaGFzKGtleSkpIHtcbiAgICAgIHJldHVybiBub3RTZXRWYWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX29iamVjdFtrZXldO1xuICB9LFxuICBoYXM6IGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiB0aGlzLl9vYmplY3QuaGFzT3duUHJvcGVydHkoa2V5KTtcbiAgfSxcbiAgX19pdGVyYXRlOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciBvYmplY3QgPSB0aGlzLl9vYmplY3Q7XG4gICAgdmFyIGtleXMgPSB0aGlzLl9rZXlzO1xuICAgIHZhciBtYXhJbmRleCA9IGtleXMubGVuZ3RoIC0gMTtcbiAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDw9IG1heEluZGV4OyBpaSsrKSB7XG4gICAgICB2YXIga2V5ID0ga2V5c1tyZXZlcnNlID8gbWF4SW5kZXggLSBpaSA6IGlpXTtcbiAgICAgIGlmIChmbihvYmplY3Rba2V5XSwga2V5LCB0aGlzKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIGlpICsgMTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGlpO1xuICB9LFxuICBfX2l0ZXJhdG9yOiBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgdmFyIG9iamVjdCA9IHRoaXMuX29iamVjdDtcbiAgICB2YXIga2V5cyA9IHRoaXMuX2tleXM7XG4gICAgdmFyIG1heEluZGV4ID0ga2V5cy5sZW5ndGggLSAxO1xuICAgIHZhciBpaSA9IDA7XG4gICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIga2V5ID0ga2V5c1tyZXZlcnNlID8gbWF4SW5kZXggLSBpaSA6IGlpXTtcbiAgICAgIHJldHVybiBpaSsrID4gbWF4SW5kZXggPyBpdGVyYXRvckRvbmUoKSA6IGl0ZXJhdG9yVmFsdWUodHlwZSwga2V5LCBvYmplY3Rba2V5XSk7XG4gICAgfSkpO1xuICB9XG59LCB7fSwgS2V5ZWRTZXEpO1xudmFyIEl0ZXJhYmxlU2VxID0gZnVuY3Rpb24gSXRlcmFibGVTZXEoaXRlcmFibGUpIHtcbiAgdGhpcy5faXRlcmFibGUgPSBpdGVyYWJsZTtcbiAgdGhpcy5zaXplID0gaXRlcmFibGUubGVuZ3RoIHx8IGl0ZXJhYmxlLnNpemU7XG59O1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoSXRlcmFibGVTZXEsIHtcbiAgX19pdGVyYXRlVW5jYWNoZWQ6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgaWYgKHJldmVyc2UpIHtcbiAgICAgIHJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRlKGZuLCByZXZlcnNlKTtcbiAgICB9XG4gICAgdmFyIGl0ZXJhYmxlID0gdGhpcy5faXRlcmFibGU7XG4gICAgdmFyIGl0ZXJhdG9yID0gZ2V0SXRlcmF0b3IoaXRlcmFibGUpO1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICBpZiAoaXNJdGVyYXRvcihpdGVyYXRvcikpIHtcbiAgICAgIHZhciBzdGVwO1xuICAgICAgd2hpbGUgKCEoc3RlcCA9IGl0ZXJhdG9yLm5leHQoKSkuZG9uZSkge1xuICAgICAgICBpZiAoZm4oc3RlcC52YWx1ZSwgaXRlcmF0aW9ucysrLCB0aGlzKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaXRlcmF0aW9ucztcbiAgfSxcbiAgX19pdGVyYXRvclVuY2FjaGVkOiBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgaWYgKHJldmVyc2UpIHtcbiAgICAgIHJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcih0eXBlLCByZXZlcnNlKTtcbiAgICB9XG4gICAgdmFyIGl0ZXJhYmxlID0gdGhpcy5faXRlcmFibGU7XG4gICAgdmFyIGl0ZXJhdG9yID0gZ2V0SXRlcmF0b3IoaXRlcmFibGUpO1xuICAgIGlmICghaXNJdGVyYXRvcihpdGVyYXRvcikpIHtcbiAgICAgIHJldHVybiBuZXcgSXRlcmF0b3IoaXRlcmF0b3JEb25lKTtcbiAgICB9XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHN0ZXAgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICByZXR1cm4gc3RlcC5kb25lID8gc3RlcCA6IGl0ZXJhdG9yVmFsdWUodHlwZSwgaXRlcmF0aW9ucysrLCBzdGVwLnZhbHVlKTtcbiAgICB9KSk7XG4gIH1cbn0sIHt9LCBJbmRleGVkU2VxKTtcbnZhciBJdGVyYXRvclNlcSA9IGZ1bmN0aW9uIEl0ZXJhdG9yU2VxKGl0ZXJhdG9yKSB7XG4gIHRoaXMuX2l0ZXJhdG9yID0gaXRlcmF0b3I7XG4gIHRoaXMuX2l0ZXJhdG9yQ2FjaGUgPSBbXTtcbn07XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShJdGVyYXRvclNlcSwge1xuICBfX2l0ZXJhdGVVbmNhY2hlZDogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdGUoZm4sIHJldmVyc2UpO1xuICAgIH1cbiAgICB2YXIgaXRlcmF0b3IgPSB0aGlzLl9pdGVyYXRvcjtcbiAgICB2YXIgY2FjaGUgPSB0aGlzLl9pdGVyYXRvckNhY2hlO1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICB3aGlsZSAoaXRlcmF0aW9ucyA8IGNhY2hlLmxlbmd0aCkge1xuICAgICAgaWYgKGZuKGNhY2hlW2l0ZXJhdGlvbnNdLCBpdGVyYXRpb25zKyssIHRoaXMpID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gaXRlcmF0aW9ucztcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIHN0ZXA7XG4gICAgd2hpbGUgKCEoc3RlcCA9IGl0ZXJhdG9yLm5leHQoKSkuZG9uZSkge1xuICAgICAgdmFyIHZhbCA9IHN0ZXAudmFsdWU7XG4gICAgICBjYWNoZVtpdGVyYXRpb25zXSA9IHZhbDtcbiAgICAgIGlmIChmbih2YWwsIGl0ZXJhdGlvbnMrKywgdGhpcykgPT09IGZhbHNlKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaXRlcmF0aW9ucztcbiAgfSxcbiAgX19pdGVyYXRvclVuY2FjaGVkOiBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgaWYgKHJldmVyc2UpIHtcbiAgICAgIHJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcih0eXBlLCByZXZlcnNlKTtcbiAgICB9XG4gICAgdmFyIGl0ZXJhdG9yID0gdGhpcy5faXRlcmF0b3I7XG4gICAgdmFyIGNhY2hlID0gdGhpcy5faXRlcmF0b3JDYWNoZTtcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoaXRlcmF0aW9ucyA+PSBjYWNoZS5sZW5ndGgpIHtcbiAgICAgICAgdmFyIHN0ZXAgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIGlmIChzdGVwLmRvbmUpIHtcbiAgICAgICAgICByZXR1cm4gc3RlcDtcbiAgICAgICAgfVxuICAgICAgICBjYWNoZVtpdGVyYXRpb25zXSA9IHN0ZXAudmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gaXRlcmF0b3JWYWx1ZSh0eXBlLCBpdGVyYXRpb25zLCBjYWNoZVtpdGVyYXRpb25zKytdKTtcbiAgICB9KSk7XG4gIH1cbn0sIHt9LCBJbmRleGVkU2VxKTtcbmZ1bmN0aW9uIGlzU2VxKG1heWJlU2VxKSB7XG4gIHJldHVybiAhIShtYXliZVNlcSAmJiBtYXliZVNlcVtJU19TRVFfU0VOVElORUxdKTtcbn1cbnZhciBFTVBUWV9TRVE7XG5mdW5jdGlvbiBlbXB0eVNlcXVlbmNlKCkge1xuICByZXR1cm4gRU1QVFlfU0VRIHx8IChFTVBUWV9TRVEgPSBuZXcgQXJyYXlTZXEoW10pKTtcbn1cbmZ1bmN0aW9uIG1heWJlU2VxRnJvbVZhbHVlKHZhbHVlLCBtYXliZVNpbmdsZXRvbikge1xuICByZXR1cm4gKG1heWJlU2luZ2xldG9uICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgPyB1bmRlZmluZWQgOiBpc0FycmF5TGlrZSh2YWx1ZSkgPyBuZXcgQXJyYXlTZXEodmFsdWUpIDogaXNJdGVyYXRvcih2YWx1ZSkgPyBuZXcgSXRlcmF0b3JTZXEodmFsdWUpIDogaGFzSXRlcmF0b3IodmFsdWUpID8gbmV3IEl0ZXJhYmxlU2VxKHZhbHVlKSA6IChtYXliZVNpbmdsZXRvbiA/IGlzUGxhaW5PYmoodmFsdWUpIDogdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JykgPyBuZXcgT2JqZWN0U2VxKHZhbHVlKSA6IHVuZGVmaW5lZCk7XG59XG5mdW5jdGlvbiBzZXFGcm9tVmFsdWUodmFsdWUsIG1heWJlU2luZ2xldG9uKSB7XG4gIHZhciBzZXEgPSBtYXliZVNlcUZyb21WYWx1ZSh2YWx1ZSwgbWF5YmVTaW5nbGV0b24pO1xuICBpZiAoc2VxID09PSB1bmRlZmluZWQpIHtcbiAgICBpZiAobWF5YmVTaW5nbGV0b24pIHtcbiAgICAgIHNlcSA9IG5ldyBBcnJheVNlcShbdmFsdWVdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgaXRlcmFibGU6ICcgKyB2YWx1ZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzZXE7XG59XG5mdW5jdGlvbiBpc0FycmF5TGlrZSh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlLmxlbmd0aCA9PT0gJ251bWJlcic7XG59XG5mdW5jdGlvbiBzZXFJdGVyYXRlKHNlcSwgZm4sIHJldmVyc2UsIHVzZUtleXMpIHtcbiAgYXNzZXJ0Tm90SW5maW5pdGUoc2VxLnNpemUpO1xuICB2YXIgY2FjaGUgPSBzZXEuX2NhY2hlO1xuICBpZiAoY2FjaGUpIHtcbiAgICB2YXIgbWF4SW5kZXggPSBjYWNoZS5sZW5ndGggLSAxO1xuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPD0gbWF4SW5kZXg7IGlpKyspIHtcbiAgICAgIHZhciBlbnRyeSA9IGNhY2hlW3JldmVyc2UgPyBtYXhJbmRleCAtIGlpIDogaWldO1xuICAgICAgaWYgKGZuKGVudHJ5WzFdLCB1c2VLZXlzID8gZW50cnlbMF0gOiBpaSwgc2VxKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIGlpICsgMTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGlpO1xuICB9XG4gIHJldHVybiBzZXEuX19pdGVyYXRlVW5jYWNoZWQoZm4sIHJldmVyc2UpO1xufVxuZnVuY3Rpb24gc2VxSXRlcmF0b3Ioc2VxLCB0eXBlLCByZXZlcnNlLCB1c2VLZXlzKSB7XG4gIHZhciBjYWNoZSA9IHNlcS5fY2FjaGU7XG4gIGlmIChjYWNoZSkge1xuICAgIHZhciBtYXhJbmRleCA9IGNhY2hlLmxlbmd0aCAtIDE7XG4gICAgdmFyIGlpID0gMDtcbiAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgIHZhciBlbnRyeSA9IGNhY2hlW3JldmVyc2UgPyBtYXhJbmRleCAtIGlpIDogaWldO1xuICAgICAgcmV0dXJuIGlpKysgPiBtYXhJbmRleCA/IGl0ZXJhdG9yRG9uZSgpIDogaXRlcmF0b3JWYWx1ZSh0eXBlLCB1c2VLZXlzID8gZW50cnlbMF0gOiBpaSAtIDEsIGVudHJ5WzFdKTtcbiAgICB9KSk7XG4gIH1cbiAgcmV0dXJuIHNlcS5fX2l0ZXJhdG9yVW5jYWNoZWQodHlwZSwgcmV2ZXJzZSk7XG59XG5mdW5jdGlvbiBmcm9tSlMoanNvbiwgY29udmVydGVyKSB7XG4gIGlmIChjb252ZXJ0ZXIpIHtcbiAgICByZXR1cm4gX2Zyb21KU1dpdGgoY29udmVydGVyLCBqc29uLCAnJywgeycnOiBqc29ufSk7XG4gIH1cbiAgcmV0dXJuIF9mcm9tSlNEZWZhdWx0KGpzb24pO1xufVxuZnVuY3Rpb24gX2Zyb21KU1dpdGgoY29udmVydGVyLCBqc29uLCBrZXksIHBhcmVudEpTT04pIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkoanNvbikgfHwgaXNQbGFpbk9iaihqc29uKSkge1xuICAgIHJldHVybiBjb252ZXJ0ZXIuY2FsbChwYXJlbnRKU09OLCBrZXksIEl0ZXJhYmxlKGpzb24pLm1hcCgoZnVuY3Rpb24odiwgaykge1xuICAgICAgcmV0dXJuIF9mcm9tSlNXaXRoKGNvbnZlcnRlciwgdiwgaywganNvbik7XG4gICAgfSkpKTtcbiAgfVxuICByZXR1cm4ganNvbjtcbn1cbmZ1bmN0aW9uIF9mcm9tSlNEZWZhdWx0KGpzb24pIHtcbiAgaWYgKGpzb24gJiYgdHlwZW9mIGpzb24gPT09ICdvYmplY3QnKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoanNvbikpIHtcbiAgICAgIHJldHVybiBJdGVyYWJsZShqc29uKS5tYXAoX2Zyb21KU0RlZmF1bHQpLnRvTGlzdCgpO1xuICAgIH1cbiAgICBpZiAoanNvbi5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KSB7XG4gICAgICByZXR1cm4gSXRlcmFibGUoanNvbikubWFwKF9mcm9tSlNEZWZhdWx0KS50b01hcCgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4ganNvbjtcbn1cbnZhciBDb2xsZWN0aW9uID0gZnVuY3Rpb24gQ29sbGVjdGlvbigpIHtcbiAgdGhyb3cgVHlwZUVycm9yKCdBYnN0cmFjdCcpO1xufTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKENvbGxlY3Rpb24sIHt9LCB7fSwgSXRlcmFibGUpO1xudmFyIEtleWVkQ29sbGVjdGlvbiA9IGZ1bmN0aW9uIEtleWVkQ29sbGVjdGlvbigpIHtcbiAgJHRyYWNldXJSdW50aW1lLmRlZmF1bHRTdXBlckNhbGwodGhpcywgJEtleWVkQ29sbGVjdGlvbi5wcm90b3R5cGUsIGFyZ3VtZW50cyk7XG59O1xudmFyICRLZXllZENvbGxlY3Rpb24gPSBLZXllZENvbGxlY3Rpb247XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShLZXllZENvbGxlY3Rpb24sIHt9LCB7fSwgQ29sbGVjdGlvbik7XG5taXhpbihLZXllZENvbGxlY3Rpb24sIEtleWVkSXRlcmFibGUucHJvdG90eXBlKTtcbnZhciBJbmRleGVkQ29sbGVjdGlvbiA9IGZ1bmN0aW9uIEluZGV4ZWRDb2xsZWN0aW9uKCkge1xuICAkdHJhY2V1clJ1bnRpbWUuZGVmYXVsdFN1cGVyQ2FsbCh0aGlzLCAkSW5kZXhlZENvbGxlY3Rpb24ucHJvdG90eXBlLCBhcmd1bWVudHMpO1xufTtcbnZhciAkSW5kZXhlZENvbGxlY3Rpb24gPSBJbmRleGVkQ29sbGVjdGlvbjtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKEluZGV4ZWRDb2xsZWN0aW9uLCB7fSwge30sIENvbGxlY3Rpb24pO1xubWl4aW4oSW5kZXhlZENvbGxlY3Rpb24sIEluZGV4ZWRJdGVyYWJsZS5wcm90b3R5cGUpO1xudmFyIFNldENvbGxlY3Rpb24gPSBmdW5jdGlvbiBTZXRDb2xsZWN0aW9uKCkge1xuICAkdHJhY2V1clJ1bnRpbWUuZGVmYXVsdFN1cGVyQ2FsbCh0aGlzLCAkU2V0Q29sbGVjdGlvbi5wcm90b3R5cGUsIGFyZ3VtZW50cyk7XG59O1xudmFyICRTZXRDb2xsZWN0aW9uID0gU2V0Q29sbGVjdGlvbjtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFNldENvbGxlY3Rpb24sIHt9LCB7fSwgQ29sbGVjdGlvbik7XG5taXhpbihTZXRDb2xsZWN0aW9uLCBTZXRJdGVyYWJsZS5wcm90b3R5cGUpO1xuQ29sbGVjdGlvbi5LZXllZCA9IEtleWVkQ29sbGVjdGlvbjtcbkNvbGxlY3Rpb24uSW5kZXhlZCA9IEluZGV4ZWRDb2xsZWN0aW9uO1xuQ29sbGVjdGlvbi5TZXQgPSBTZXRDb2xsZWN0aW9uO1xudmFyIE1hcCA9IGZ1bmN0aW9uIE1hcCh2YWx1ZSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMCA/IGVtcHR5TWFwKCkgOiB2YWx1ZSAmJiB2YWx1ZS5jb25zdHJ1Y3RvciA9PT0gJE1hcCA/IHZhbHVlIDogZW1wdHlNYXAoKS5tZXJnZShLZXllZEl0ZXJhYmxlKHZhbHVlKSk7XG59O1xudmFyICRNYXAgPSBNYXA7XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShNYXAsIHtcbiAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9fdG9TdHJpbmcoJ01hcCB7JywgJ30nKTtcbiAgfSxcbiAgZ2V0OiBmdW5jdGlvbihrLCBub3RTZXRWYWx1ZSkge1xuICAgIHJldHVybiB0aGlzLl9yb290ID8gdGhpcy5fcm9vdC5nZXQoMCwgaGFzaChrKSwgaywgbm90U2V0VmFsdWUpIDogbm90U2V0VmFsdWU7XG4gIH0sXG4gIHNldDogZnVuY3Rpb24oaywgdikge1xuICAgIHJldHVybiB1cGRhdGVNYXAodGhpcywgaywgdik7XG4gIH0sXG4gIHNldEluOiBmdW5jdGlvbihrZXlQYXRoLCB2KSB7XG4gICAgaW52YXJpYW50KGtleVBhdGgubGVuZ3RoID4gMCwgJ1JlcXVpcmVzIG5vbi1lbXB0eSBrZXkgcGF0aC4nKTtcbiAgICByZXR1cm4gdGhpcy51cGRhdGVJbihrZXlQYXRoLCAoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdjtcbiAgICB9KSk7XG4gIH0sXG4gIHJlbW92ZTogZnVuY3Rpb24oaykge1xuICAgIHJldHVybiB1cGRhdGVNYXAodGhpcywgaywgTk9UX1NFVCk7XG4gIH0sXG4gIHJlbW92ZUluOiBmdW5jdGlvbihrZXlQYXRoKSB7XG4gICAgaW52YXJpYW50KGtleVBhdGgubGVuZ3RoID4gMCwgJ1JlcXVpcmVzIG5vbi1lbXB0eSBrZXkgcGF0aC4nKTtcbiAgICByZXR1cm4gdGhpcy51cGRhdGVJbihrZXlQYXRoLCAoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gTk9UX1NFVDtcbiAgICB9KSk7XG4gIH0sXG4gIHVwZGF0ZTogZnVuY3Rpb24oaywgbm90U2V0VmFsdWUsIHVwZGF0ZXIpIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSA/IGsodGhpcykgOiB0aGlzLnVwZGF0ZUluKFtrXSwgbm90U2V0VmFsdWUsIHVwZGF0ZXIpO1xuICB9LFxuICB1cGRhdGVJbjogZnVuY3Rpb24oa2V5UGF0aCwgbm90U2V0VmFsdWUsIHVwZGF0ZXIpIHtcbiAgICBpZiAoIXVwZGF0ZXIpIHtcbiAgICAgIHVwZGF0ZXIgPSBub3RTZXRWYWx1ZTtcbiAgICAgIG5vdFNldFZhbHVlID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4ga2V5UGF0aC5sZW5ndGggPT09IDAgPyB1cGRhdGVyKHRoaXMpIDogdXBkYXRlSW5EZWVwTWFwKHRoaXMsIGtleVBhdGgsIG5vdFNldFZhbHVlLCB1cGRhdGVyLCAwKTtcbiAgfSxcbiAgY2xlYXI6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnNpemUgPT09IDApIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBpZiAodGhpcy5fX293bmVySUQpIHtcbiAgICAgIHRoaXMuc2l6ZSA9IDA7XG4gICAgICB0aGlzLl9yb290ID0gbnVsbDtcbiAgICAgIHRoaXMuX19oYXNoID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5fX2FsdGVyZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBlbXB0eU1hcCgpO1xuICB9LFxuICBtZXJnZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG1lcmdlSW50b01hcFdpdGgodGhpcywgdW5kZWZpbmVkLCBhcmd1bWVudHMpO1xuICB9LFxuICBtZXJnZVdpdGg6IGZ1bmN0aW9uKG1lcmdlcikge1xuICAgIGZvciAodmFyIGl0ZXJzID0gW10sXG4gICAgICAgICRfXzQgPSAxOyAkX180IDwgYXJndW1lbnRzLmxlbmd0aDsgJF9fNCsrKVxuICAgICAgaXRlcnNbJF9fNCAtIDFdID0gYXJndW1lbnRzWyRfXzRdO1xuICAgIHJldHVybiBtZXJnZUludG9NYXBXaXRoKHRoaXMsIG1lcmdlciwgaXRlcnMpO1xuICB9LFxuICBtZXJnZURlZXA6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBtZXJnZUludG9NYXBXaXRoKHRoaXMsIGRlZXBNZXJnZXIodW5kZWZpbmVkKSwgYXJndW1lbnRzKTtcbiAgfSxcbiAgbWVyZ2VEZWVwV2l0aDogZnVuY3Rpb24obWVyZ2VyKSB7XG4gICAgZm9yICh2YXIgaXRlcnMgPSBbXSxcbiAgICAgICAgJF9fNSA9IDE7ICRfXzUgPCBhcmd1bWVudHMubGVuZ3RoOyAkX181KyspXG4gICAgICBpdGVyc1skX181IC0gMV0gPSBhcmd1bWVudHNbJF9fNV07XG4gICAgcmV0dXJuIG1lcmdlSW50b01hcFdpdGgodGhpcywgZGVlcE1lcmdlcihtZXJnZXIpLCBpdGVycyk7XG4gIH0sXG4gIHdpdGhNdXRhdGlvbnM6IGZ1bmN0aW9uKGZuKSB7XG4gICAgdmFyIG11dGFibGUgPSB0aGlzLmFzTXV0YWJsZSgpO1xuICAgIGZuKG11dGFibGUpO1xuICAgIHJldHVybiBtdXRhYmxlLndhc0FsdGVyZWQoKSA/IG11dGFibGUuX19lbnN1cmVPd25lcih0aGlzLl9fb3duZXJJRCkgOiB0aGlzO1xuICB9LFxuICBhc011dGFibGU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9fb3duZXJJRCA/IHRoaXMgOiB0aGlzLl9fZW5zdXJlT3duZXIobmV3IE93bmVySUQoKSk7XG4gIH0sXG4gIGFzSW1tdXRhYmxlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fX2Vuc3VyZU93bmVyKCk7XG4gIH0sXG4gIHdhc0FsdGVyZWQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9fYWx0ZXJlZDtcbiAgfSxcbiAgX19pdGVyYXRvcjogZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHJldHVybiBuZXcgTWFwSXRlcmF0b3IodGhpcywgdHlwZSwgcmV2ZXJzZSk7XG4gIH0sXG4gIF9faXRlcmF0ZTogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIHRoaXMuX3Jvb3QgJiYgdGhpcy5fcm9vdC5pdGVyYXRlKChmdW5jdGlvbihlbnRyeSkge1xuICAgICAgaXRlcmF0aW9ucysrO1xuICAgICAgcmV0dXJuIGZuKGVudHJ5WzFdLCBlbnRyeVswXSwgJF9fMCk7XG4gICAgfSksIHJldmVyc2UpO1xuICAgIHJldHVybiBpdGVyYXRpb25zO1xuICB9LFxuICBfX2Vuc3VyZU93bmVyOiBmdW5jdGlvbihvd25lcklEKSB7XG4gICAgaWYgKG93bmVySUQgPT09IHRoaXMuX19vd25lcklEKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgaWYgKCFvd25lcklEKSB7XG4gICAgICB0aGlzLl9fb3duZXJJRCA9IG93bmVySUQ7XG4gICAgICB0aGlzLl9fYWx0ZXJlZCA9IGZhbHNlO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBtYWtlTWFwKHRoaXMuc2l6ZSwgdGhpcy5fcm9vdCwgb3duZXJJRCwgdGhpcy5fX2hhc2gpO1xuICB9XG59LCB7fSwgS2V5ZWRDb2xsZWN0aW9uKTtcbmZ1bmN0aW9uIGlzTWFwKG1heWJlTWFwKSB7XG4gIHJldHVybiAhIShtYXliZU1hcCAmJiBtYXliZU1hcFtJU19NQVBfU0VOVElORUxdKTtcbn1cbk1hcC5pc01hcCA9IGlzTWFwO1xudmFyIElTX01BUF9TRU5USU5FTCA9ICdAQF9fSU1NVVRBQkxFX01BUF9fQEAnO1xudmFyIE1hcFByb3RvdHlwZSA9IE1hcC5wcm90b3R5cGU7XG5NYXBQcm90b3R5cGVbSVNfTUFQX1NFTlRJTkVMXSA9IHRydWU7XG5NYXBQcm90b3R5cGVbREVMRVRFXSA9IE1hcFByb3RvdHlwZS5yZW1vdmU7XG52YXIgQml0bWFwSW5kZXhlZE5vZGUgPSBmdW5jdGlvbiBCaXRtYXBJbmRleGVkTm9kZShvd25lcklELCBiaXRtYXAsIG5vZGVzKSB7XG4gIHRoaXMub3duZXJJRCA9IG93bmVySUQ7XG4gIHRoaXMuYml0bWFwID0gYml0bWFwO1xuICB0aGlzLm5vZGVzID0gbm9kZXM7XG59O1xudmFyICRCaXRtYXBJbmRleGVkTm9kZSA9IEJpdG1hcEluZGV4ZWROb2RlO1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoQml0bWFwSW5kZXhlZE5vZGUsIHtcbiAgZ2V0OiBmdW5jdGlvbihzaGlmdCwgaGFzaCwga2V5LCBub3RTZXRWYWx1ZSkge1xuICAgIHZhciBiaXQgPSAoMSA8PCAoKHNoaWZ0ID09PSAwID8gaGFzaCA6IGhhc2ggPj4+IHNoaWZ0KSAmIE1BU0spKTtcbiAgICB2YXIgYml0bWFwID0gdGhpcy5iaXRtYXA7XG4gICAgcmV0dXJuIChiaXRtYXAgJiBiaXQpID09PSAwID8gbm90U2V0VmFsdWUgOiB0aGlzLm5vZGVzW3BvcENvdW50KGJpdG1hcCAmIChiaXQgLSAxKSldLmdldChzaGlmdCArIFNISUZULCBoYXNoLCBrZXksIG5vdFNldFZhbHVlKTtcbiAgfSxcbiAgdXBkYXRlOiBmdW5jdGlvbihvd25lcklELCBzaGlmdCwgaGFzaCwga2V5LCB2YWx1ZSwgZGlkQ2hhbmdlU2l6ZSwgZGlkQWx0ZXIpIHtcbiAgICB2YXIgaGFzaEZyYWcgPSAoc2hpZnQgPT09IDAgPyBoYXNoIDogaGFzaCA+Pj4gc2hpZnQpICYgTUFTSztcbiAgICB2YXIgYml0ID0gMSA8PCBoYXNoRnJhZztcbiAgICB2YXIgYml0bWFwID0gdGhpcy5iaXRtYXA7XG4gICAgdmFyIGV4aXN0cyA9IChiaXRtYXAgJiBiaXQpICE9PSAwO1xuICAgIGlmICghZXhpc3RzICYmIHZhbHVlID09PSBOT1RfU0VUKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdmFyIGlkeCA9IHBvcENvdW50KGJpdG1hcCAmIChiaXQgLSAxKSk7XG4gICAgdmFyIG5vZGVzID0gdGhpcy5ub2RlcztcbiAgICB2YXIgbm9kZSA9IGV4aXN0cyA/IG5vZGVzW2lkeF0gOiB1bmRlZmluZWQ7XG4gICAgdmFyIG5ld05vZGUgPSB1cGRhdGVOb2RlKG5vZGUsIG93bmVySUQsIHNoaWZ0ICsgU0hJRlQsIGhhc2gsIGtleSwgdmFsdWUsIGRpZENoYW5nZVNpemUsIGRpZEFsdGVyKTtcbiAgICBpZiAobmV3Tm9kZSA9PT0gbm9kZSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGlmICghZXhpc3RzICYmIG5ld05vZGUgJiYgbm9kZXMubGVuZ3RoID49IE1BWF9CSVRNQVBfU0laRSkge1xuICAgICAgcmV0dXJuIGV4cGFuZE5vZGVzKG93bmVySUQsIG5vZGVzLCBiaXRtYXAsIGhhc2hGcmFnLCBuZXdOb2RlKTtcbiAgICB9XG4gICAgaWYgKGV4aXN0cyAmJiAhbmV3Tm9kZSAmJiBub2Rlcy5sZW5ndGggPT09IDIgJiYgaXNMZWFmTm9kZShub2Rlc1tpZHggXiAxXSkpIHtcbiAgICAgIHJldHVybiBub2Rlc1tpZHggXiAxXTtcbiAgICB9XG4gICAgaWYgKGV4aXN0cyAmJiBuZXdOb2RlICYmIG5vZGVzLmxlbmd0aCA9PT0gMSAmJiBpc0xlYWZOb2RlKG5ld05vZGUpKSB7XG4gICAgICByZXR1cm4gbmV3Tm9kZTtcbiAgICB9XG4gICAgdmFyIGlzRWRpdGFibGUgPSBvd25lcklEICYmIG93bmVySUQgPT09IHRoaXMub3duZXJJRDtcbiAgICB2YXIgbmV3Qml0bWFwID0gZXhpc3RzID8gbmV3Tm9kZSA/IGJpdG1hcCA6IGJpdG1hcCBeIGJpdCA6IGJpdG1hcCB8IGJpdDtcbiAgICB2YXIgbmV3Tm9kZXMgPSBleGlzdHMgPyBuZXdOb2RlID8gc2V0SW4obm9kZXMsIGlkeCwgbmV3Tm9kZSwgaXNFZGl0YWJsZSkgOiBzcGxpY2VPdXQobm9kZXMsIGlkeCwgaXNFZGl0YWJsZSkgOiBzcGxpY2VJbihub2RlcywgaWR4LCBuZXdOb2RlLCBpc0VkaXRhYmxlKTtcbiAgICBpZiAoaXNFZGl0YWJsZSkge1xuICAgICAgdGhpcy5iaXRtYXAgPSBuZXdCaXRtYXA7XG4gICAgICB0aGlzLm5vZGVzID0gbmV3Tm9kZXM7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIG5ldyAkQml0bWFwSW5kZXhlZE5vZGUob3duZXJJRCwgbmV3Qml0bWFwLCBuZXdOb2Rlcyk7XG4gIH0sXG4gIGl0ZXJhdGU6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyIG5vZGVzID0gdGhpcy5ub2RlcztcbiAgICBmb3IgKHZhciBpaSA9IDAsXG4gICAgICAgIG1heEluZGV4ID0gbm9kZXMubGVuZ3RoIC0gMTsgaWkgPD0gbWF4SW5kZXg7IGlpKyspIHtcbiAgICAgIGlmIChub2Rlc1tyZXZlcnNlID8gbWF4SW5kZXggLSBpaSA6IGlpXS5pdGVyYXRlKGZuLCByZXZlcnNlKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfVxufSwge30pO1xudmFyIEFycmF5Tm9kZSA9IGZ1bmN0aW9uIEFycmF5Tm9kZShvd25lcklELCBjb3VudCwgbm9kZXMpIHtcbiAgdGhpcy5vd25lcklEID0gb3duZXJJRDtcbiAgdGhpcy5jb3VudCA9IGNvdW50O1xuICB0aGlzLm5vZGVzID0gbm9kZXM7XG59O1xudmFyICRBcnJheU5vZGUgPSBBcnJheU5vZGU7XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShBcnJheU5vZGUsIHtcbiAgZ2V0OiBmdW5jdGlvbihzaGlmdCwgaGFzaCwga2V5LCBub3RTZXRWYWx1ZSkge1xuICAgIHZhciBpZHggPSAoc2hpZnQgPT09IDAgPyBoYXNoIDogaGFzaCA+Pj4gc2hpZnQpICYgTUFTSztcbiAgICB2YXIgbm9kZSA9IHRoaXMubm9kZXNbaWR4XTtcbiAgICByZXR1cm4gbm9kZSA/IG5vZGUuZ2V0KHNoaWZ0ICsgU0hJRlQsIGhhc2gsIGtleSwgbm90U2V0VmFsdWUpIDogbm90U2V0VmFsdWU7XG4gIH0sXG4gIHVwZGF0ZTogZnVuY3Rpb24ob3duZXJJRCwgc2hpZnQsIGhhc2gsIGtleSwgdmFsdWUsIGRpZENoYW5nZVNpemUsIGRpZEFsdGVyKSB7XG4gICAgdmFyIGlkeCA9IChzaGlmdCA9PT0gMCA/IGhhc2ggOiBoYXNoID4+PiBzaGlmdCkgJiBNQVNLO1xuICAgIHZhciByZW1vdmVkID0gdmFsdWUgPT09IE5PVF9TRVQ7XG4gICAgdmFyIG5vZGVzID0gdGhpcy5ub2RlcztcbiAgICB2YXIgbm9kZSA9IG5vZGVzW2lkeF07XG4gICAgaWYgKHJlbW92ZWQgJiYgIW5vZGUpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgbmV3Tm9kZSA9IHVwZGF0ZU5vZGUobm9kZSwgb3duZXJJRCwgc2hpZnQgKyBTSElGVCwgaGFzaCwga2V5LCB2YWx1ZSwgZGlkQ2hhbmdlU2l6ZSwgZGlkQWx0ZXIpO1xuICAgIGlmIChuZXdOb2RlID09PSBub2RlKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdmFyIG5ld0NvdW50ID0gdGhpcy5jb3VudDtcbiAgICBpZiAoIW5vZGUpIHtcbiAgICAgIG5ld0NvdW50Kys7XG4gICAgfSBlbHNlIGlmICghbmV3Tm9kZSkge1xuICAgICAgbmV3Q291bnQtLTtcbiAgICAgIGlmIChuZXdDb3VudCA8IE1JTl9BUlJBWV9TSVpFKSB7XG4gICAgICAgIHJldHVybiBwYWNrTm9kZXMob3duZXJJRCwgbm9kZXMsIG5ld0NvdW50LCBpZHgpO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgaXNFZGl0YWJsZSA9IG93bmVySUQgJiYgb3duZXJJRCA9PT0gdGhpcy5vd25lcklEO1xuICAgIHZhciBuZXdOb2RlcyA9IHNldEluKG5vZGVzLCBpZHgsIG5ld05vZGUsIGlzRWRpdGFibGUpO1xuICAgIGlmIChpc0VkaXRhYmxlKSB7XG4gICAgICB0aGlzLmNvdW50ID0gbmV3Q291bnQ7XG4gICAgICB0aGlzLm5vZGVzID0gbmV3Tm9kZXM7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIG5ldyAkQXJyYXlOb2RlKG93bmVySUQsIG5ld0NvdW50LCBuZXdOb2Rlcyk7XG4gIH0sXG4gIGl0ZXJhdGU6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyIG5vZGVzID0gdGhpcy5ub2RlcztcbiAgICBmb3IgKHZhciBpaSA9IDAsXG4gICAgICAgIG1heEluZGV4ID0gbm9kZXMubGVuZ3RoIC0gMTsgaWkgPD0gbWF4SW5kZXg7IGlpKyspIHtcbiAgICAgIHZhciBub2RlID0gbm9kZXNbcmV2ZXJzZSA/IG1heEluZGV4IC0gaWkgOiBpaV07XG4gICAgICBpZiAobm9kZSAmJiBub2RlLml0ZXJhdGUoZm4sIHJldmVyc2UpID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICB9XG59LCB7fSk7XG52YXIgSGFzaENvbGxpc2lvbk5vZGUgPSBmdW5jdGlvbiBIYXNoQ29sbGlzaW9uTm9kZShvd25lcklELCBoYXNoLCBlbnRyaWVzKSB7XG4gIHRoaXMub3duZXJJRCA9IG93bmVySUQ7XG4gIHRoaXMuaGFzaCA9IGhhc2g7XG4gIHRoaXMuZW50cmllcyA9IGVudHJpZXM7XG59O1xudmFyICRIYXNoQ29sbGlzaW9uTm9kZSA9IEhhc2hDb2xsaXNpb25Ob2RlO1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoSGFzaENvbGxpc2lvbk5vZGUsIHtcbiAgZ2V0OiBmdW5jdGlvbihzaGlmdCwgaGFzaCwga2V5LCBub3RTZXRWYWx1ZSkge1xuICAgIHZhciBlbnRyaWVzID0gdGhpcy5lbnRyaWVzO1xuICAgIGZvciAodmFyIGlpID0gMCxcbiAgICAgICAgbGVuID0gZW50cmllcy5sZW5ndGg7IGlpIDwgbGVuOyBpaSsrKSB7XG4gICAgICBpZiAoaXMoa2V5LCBlbnRyaWVzW2lpXVswXSkpIHtcbiAgICAgICAgcmV0dXJuIGVudHJpZXNbaWldWzFdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm90U2V0VmFsdWU7XG4gIH0sXG4gIHVwZGF0ZTogZnVuY3Rpb24ob3duZXJJRCwgc2hpZnQsIGhhc2gsIGtleSwgdmFsdWUsIGRpZENoYW5nZVNpemUsIGRpZEFsdGVyKSB7XG4gICAgdmFyIHJlbW92ZWQgPSB2YWx1ZSA9PT0gTk9UX1NFVDtcbiAgICBpZiAoaGFzaCAhPT0gdGhpcy5oYXNoKSB7XG4gICAgICBpZiAocmVtb3ZlZCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIFNldFJlZihkaWRBbHRlcik7XG4gICAgICBTZXRSZWYoZGlkQ2hhbmdlU2l6ZSk7XG4gICAgICByZXR1cm4gbWVyZ2VJbnRvTm9kZSh0aGlzLCBvd25lcklELCBzaGlmdCwgaGFzaCwgW2tleSwgdmFsdWVdKTtcbiAgICB9XG4gICAgdmFyIGVudHJpZXMgPSB0aGlzLmVudHJpZXM7XG4gICAgdmFyIGlkeCA9IDA7XG4gICAgZm9yICh2YXIgbGVuID0gZW50cmllcy5sZW5ndGg7IGlkeCA8IGxlbjsgaWR4KyspIHtcbiAgICAgIGlmIChpcyhrZXksIGVudHJpZXNbaWR4XVswXSkpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBleGlzdHMgPSBpZHggPCBsZW47XG4gICAgaWYgKHJlbW92ZWQgJiYgIWV4aXN0cykge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIFNldFJlZihkaWRBbHRlcik7XG4gICAgKHJlbW92ZWQgfHwgIWV4aXN0cykgJiYgU2V0UmVmKGRpZENoYW5nZVNpemUpO1xuICAgIGlmIChyZW1vdmVkICYmIGxlbiA9PT0gMikge1xuICAgICAgcmV0dXJuIG5ldyBWYWx1ZU5vZGUob3duZXJJRCwgdGhpcy5oYXNoLCBlbnRyaWVzW2lkeCBeIDFdKTtcbiAgICB9XG4gICAgdmFyIGlzRWRpdGFibGUgPSBvd25lcklEICYmIG93bmVySUQgPT09IHRoaXMub3duZXJJRDtcbiAgICB2YXIgbmV3RW50cmllcyA9IGlzRWRpdGFibGUgPyBlbnRyaWVzIDogYXJyQ29weShlbnRyaWVzKTtcbiAgICBpZiAoZXhpc3RzKSB7XG4gICAgICBpZiAocmVtb3ZlZCkge1xuICAgICAgICBpZHggPT09IGxlbiAtIDEgPyBuZXdFbnRyaWVzLnBvcCgpIDogKG5ld0VudHJpZXNbaWR4XSA9IG5ld0VudHJpZXMucG9wKCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV3RW50cmllc1tpZHhdID0gW2tleSwgdmFsdWVdO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBuZXdFbnRyaWVzLnB1c2goW2tleSwgdmFsdWVdKTtcbiAgICB9XG4gICAgaWYgKGlzRWRpdGFibGUpIHtcbiAgICAgIHRoaXMuZW50cmllcyA9IG5ld0VudHJpZXM7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIG5ldyAkSGFzaENvbGxpc2lvbk5vZGUob3duZXJJRCwgdGhpcy5oYXNoLCBuZXdFbnRyaWVzKTtcbiAgfSxcbiAgaXRlcmF0ZTogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgZW50cmllcyA9IHRoaXMuZW50cmllcztcbiAgICBmb3IgKHZhciBpaSA9IDAsXG4gICAgICAgIG1heEluZGV4ID0gZW50cmllcy5sZW5ndGggLSAxOyBpaSA8PSBtYXhJbmRleDsgaWkrKykge1xuICAgICAgaWYgKGZuKGVudHJpZXNbcmV2ZXJzZSA/IG1heEluZGV4IC0gaWkgOiBpaV0pID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICB9XG59LCB7fSk7XG52YXIgVmFsdWVOb2RlID0gZnVuY3Rpb24gVmFsdWVOb2RlKG93bmVySUQsIGhhc2gsIGVudHJ5KSB7XG4gIHRoaXMub3duZXJJRCA9IG93bmVySUQ7XG4gIHRoaXMuaGFzaCA9IGhhc2g7XG4gIHRoaXMuZW50cnkgPSBlbnRyeTtcbn07XG52YXIgJFZhbHVlTm9kZSA9IFZhbHVlTm9kZTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFZhbHVlTm9kZSwge1xuICBnZXQ6IGZ1bmN0aW9uKHNoaWZ0LCBoYXNoLCBrZXksIG5vdFNldFZhbHVlKSB7XG4gICAgcmV0dXJuIGlzKGtleSwgdGhpcy5lbnRyeVswXSkgPyB0aGlzLmVudHJ5WzFdIDogbm90U2V0VmFsdWU7XG4gIH0sXG4gIHVwZGF0ZTogZnVuY3Rpb24ob3duZXJJRCwgc2hpZnQsIGhhc2gsIGtleSwgdmFsdWUsIGRpZENoYW5nZVNpemUsIGRpZEFsdGVyKSB7XG4gICAgdmFyIHJlbW92ZWQgPSB2YWx1ZSA9PT0gTk9UX1NFVDtcbiAgICB2YXIga2V5TWF0Y2ggPSBpcyhrZXksIHRoaXMuZW50cnlbMF0pO1xuICAgIGlmIChrZXlNYXRjaCA/IHZhbHVlID09PSB0aGlzLmVudHJ5WzFdIDogcmVtb3ZlZCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIFNldFJlZihkaWRBbHRlcik7XG4gICAgaWYgKHJlbW92ZWQpIHtcbiAgICAgIFNldFJlZihkaWRDaGFuZ2VTaXplKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGtleU1hdGNoKSB7XG4gICAgICBpZiAob3duZXJJRCAmJiBvd25lcklEID09PSB0aGlzLm93bmVySUQpIHtcbiAgICAgICAgdGhpcy5lbnRyeVsxXSA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgJFZhbHVlTm9kZShvd25lcklELCBoYXNoLCBba2V5LCB2YWx1ZV0pO1xuICAgIH1cbiAgICBTZXRSZWYoZGlkQ2hhbmdlU2l6ZSk7XG4gICAgcmV0dXJuIG1lcmdlSW50b05vZGUodGhpcywgb3duZXJJRCwgc2hpZnQsIGhhc2gsIFtrZXksIHZhbHVlXSk7XG4gIH0sXG4gIGl0ZXJhdGU6IGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIGZuKHRoaXMuZW50cnkpO1xuICB9XG59LCB7fSk7XG52YXIgTWFwSXRlcmF0b3IgPSBmdW5jdGlvbiBNYXBJdGVyYXRvcihtYXAsIHR5cGUsIHJldmVyc2UpIHtcbiAgdGhpcy5fdHlwZSA9IHR5cGU7XG4gIHRoaXMuX3JldmVyc2UgPSByZXZlcnNlO1xuICB0aGlzLl9zdGFjayA9IG1hcC5fcm9vdCAmJiBtYXBJdGVyYXRvckZyYW1lKG1hcC5fcm9vdCk7XG59O1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoTWFwSXRlcmF0b3IsIHtuZXh0OiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdHlwZSA9IHRoaXMuX3R5cGU7XG4gICAgdmFyIHN0YWNrID0gdGhpcy5fc3RhY2s7XG4gICAgd2hpbGUgKHN0YWNrKSB7XG4gICAgICB2YXIgbm9kZSA9IHN0YWNrLm5vZGU7XG4gICAgICB2YXIgaW5kZXggPSBzdGFjay5pbmRleCsrO1xuICAgICAgdmFyIG1heEluZGV4O1xuICAgICAgaWYgKG5vZGUuZW50cnkpIHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIG1hcEl0ZXJhdG9yVmFsdWUodHlwZSwgbm9kZS5lbnRyeSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAobm9kZS5lbnRyaWVzKSB7XG4gICAgICAgIG1heEluZGV4ID0gbm9kZS5lbnRyaWVzLmxlbmd0aCAtIDE7XG4gICAgICAgIGlmIChpbmRleCA8PSBtYXhJbmRleCkge1xuICAgICAgICAgIHJldHVybiBtYXBJdGVyYXRvclZhbHVlKHR5cGUsIG5vZGUuZW50cmllc1t0aGlzLl9yZXZlcnNlID8gbWF4SW5kZXggLSBpbmRleCA6IGluZGV4XSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1heEluZGV4ID0gbm9kZS5ub2Rlcy5sZW5ndGggLSAxO1xuICAgICAgICBpZiAoaW5kZXggPD0gbWF4SW5kZXgpIHtcbiAgICAgICAgICB2YXIgc3ViTm9kZSA9IG5vZGUubm9kZXNbdGhpcy5fcmV2ZXJzZSA/IG1heEluZGV4IC0gaW5kZXggOiBpbmRleF07XG4gICAgICAgICAgaWYgKHN1Yk5vZGUpIHtcbiAgICAgICAgICAgIGlmIChzdWJOb2RlLmVudHJ5KSB7XG4gICAgICAgICAgICAgIHJldHVybiBtYXBJdGVyYXRvclZhbHVlKHR5cGUsIHN1Yk5vZGUuZW50cnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhY2sgPSB0aGlzLl9zdGFjayA9IG1hcEl0ZXJhdG9yRnJhbWUoc3ViTm9kZSwgc3RhY2spO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc3RhY2sgPSB0aGlzLl9zdGFjayA9IHRoaXMuX3N0YWNrLl9fcHJldjtcbiAgICB9XG4gICAgcmV0dXJuIGl0ZXJhdG9yRG9uZSgpO1xuICB9fSwge30sIEl0ZXJhdG9yKTtcbmZ1bmN0aW9uIG1hcEl0ZXJhdG9yVmFsdWUodHlwZSwgZW50cnkpIHtcbiAgcmV0dXJuIGl0ZXJhdG9yVmFsdWUodHlwZSwgZW50cnlbMF0sIGVudHJ5WzFdKTtcbn1cbmZ1bmN0aW9uIG1hcEl0ZXJhdG9yRnJhbWUobm9kZSwgcHJldikge1xuICByZXR1cm4ge1xuICAgIG5vZGU6IG5vZGUsXG4gICAgaW5kZXg6IDAsXG4gICAgX19wcmV2OiBwcmV2XG4gIH07XG59XG5mdW5jdGlvbiBtYWtlTWFwKHNpemUsIHJvb3QsIG93bmVySUQsIGhhc2gpIHtcbiAgdmFyIG1hcCA9IE9iamVjdC5jcmVhdGUoTWFwUHJvdG90eXBlKTtcbiAgbWFwLnNpemUgPSBzaXplO1xuICBtYXAuX3Jvb3QgPSByb290O1xuICBtYXAuX19vd25lcklEID0gb3duZXJJRDtcbiAgbWFwLl9faGFzaCA9IGhhc2g7XG4gIG1hcC5fX2FsdGVyZWQgPSBmYWxzZTtcbiAgcmV0dXJuIG1hcDtcbn1cbnZhciBFTVBUWV9NQVA7XG5mdW5jdGlvbiBlbXB0eU1hcCgpIHtcbiAgcmV0dXJuIEVNUFRZX01BUCB8fCAoRU1QVFlfTUFQID0gbWFrZU1hcCgwKSk7XG59XG5mdW5jdGlvbiB1cGRhdGVNYXAobWFwLCBrLCB2KSB7XG4gIHZhciBkaWRDaGFuZ2VTaXplID0gTWFrZVJlZihDSEFOR0VfTEVOR1RIKTtcbiAgdmFyIGRpZEFsdGVyID0gTWFrZVJlZihESURfQUxURVIpO1xuICB2YXIgbmV3Um9vdCA9IHVwZGF0ZU5vZGUobWFwLl9yb290LCBtYXAuX19vd25lcklELCAwLCBoYXNoKGspLCBrLCB2LCBkaWRDaGFuZ2VTaXplLCBkaWRBbHRlcik7XG4gIGlmICghZGlkQWx0ZXIudmFsdWUpIHtcbiAgICByZXR1cm4gbWFwO1xuICB9XG4gIHZhciBuZXdTaXplID0gbWFwLnNpemUgKyAoZGlkQ2hhbmdlU2l6ZS52YWx1ZSA/IHYgPT09IE5PVF9TRVQgPyAtMSA6IDEgOiAwKTtcbiAgaWYgKG1hcC5fX293bmVySUQpIHtcbiAgICBtYXAuc2l6ZSA9IG5ld1NpemU7XG4gICAgbWFwLl9yb290ID0gbmV3Um9vdDtcbiAgICBtYXAuX19oYXNoID0gdW5kZWZpbmVkO1xuICAgIG1hcC5fX2FsdGVyZWQgPSB0cnVlO1xuICAgIHJldHVybiBtYXA7XG4gIH1cbiAgcmV0dXJuIG5ld1Jvb3QgPyBtYWtlTWFwKG5ld1NpemUsIG5ld1Jvb3QpIDogZW1wdHlNYXAoKTtcbn1cbmZ1bmN0aW9uIHVwZGF0ZU5vZGUobm9kZSwgb3duZXJJRCwgc2hpZnQsIGhhc2gsIGtleSwgdmFsdWUsIGRpZENoYW5nZVNpemUsIGRpZEFsdGVyKSB7XG4gIGlmICghbm9kZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gTk9UX1NFVCkge1xuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuICAgIFNldFJlZihkaWRBbHRlcik7XG4gICAgU2V0UmVmKGRpZENoYW5nZVNpemUpO1xuICAgIHJldHVybiBuZXcgVmFsdWVOb2RlKG93bmVySUQsIGhhc2gsIFtrZXksIHZhbHVlXSk7XG4gIH1cbiAgcmV0dXJuIG5vZGUudXBkYXRlKG93bmVySUQsIHNoaWZ0LCBoYXNoLCBrZXksIHZhbHVlLCBkaWRDaGFuZ2VTaXplLCBkaWRBbHRlcik7XG59XG5mdW5jdGlvbiBpc0xlYWZOb2RlKG5vZGUpIHtcbiAgcmV0dXJuIG5vZGUuY29uc3RydWN0b3IgPT09IFZhbHVlTm9kZSB8fCBub2RlLmNvbnN0cnVjdG9yID09PSBIYXNoQ29sbGlzaW9uTm9kZTtcbn1cbmZ1bmN0aW9uIG1lcmdlSW50b05vZGUobm9kZSwgb3duZXJJRCwgc2hpZnQsIGhhc2gsIGVudHJ5KSB7XG4gIGlmIChub2RlLmhhc2ggPT09IGhhc2gpIHtcbiAgICByZXR1cm4gbmV3IEhhc2hDb2xsaXNpb25Ob2RlKG93bmVySUQsIGhhc2gsIFtub2RlLmVudHJ5LCBlbnRyeV0pO1xuICB9XG4gIHZhciBpZHgxID0gKHNoaWZ0ID09PSAwID8gbm9kZS5oYXNoIDogbm9kZS5oYXNoID4+PiBzaGlmdCkgJiBNQVNLO1xuICB2YXIgaWR4MiA9IChzaGlmdCA9PT0gMCA/IGhhc2ggOiBoYXNoID4+PiBzaGlmdCkgJiBNQVNLO1xuICB2YXIgbmV3Tm9kZTtcbiAgdmFyIG5vZGVzID0gaWR4MSA9PT0gaWR4MiA/IFttZXJnZUludG9Ob2RlKG5vZGUsIG93bmVySUQsIHNoaWZ0ICsgU0hJRlQsIGhhc2gsIGVudHJ5KV0gOiAoKG5ld05vZGUgPSBuZXcgVmFsdWVOb2RlKG93bmVySUQsIGhhc2gsIGVudHJ5KSksIGlkeDEgPCBpZHgyID8gW25vZGUsIG5ld05vZGVdIDogW25ld05vZGUsIG5vZGVdKTtcbiAgcmV0dXJuIG5ldyBCaXRtYXBJbmRleGVkTm9kZShvd25lcklELCAoMSA8PCBpZHgxKSB8ICgxIDw8IGlkeDIpLCBub2Rlcyk7XG59XG5mdW5jdGlvbiBwYWNrTm9kZXMob3duZXJJRCwgbm9kZXMsIGNvdW50LCBleGNsdWRpbmcpIHtcbiAgdmFyIGJpdG1hcCA9IDA7XG4gIHZhciBwYWNrZWRJSSA9IDA7XG4gIHZhciBwYWNrZWROb2RlcyA9IG5ldyBBcnJheShjb3VudCk7XG4gIGZvciAodmFyIGlpID0gMCxcbiAgICAgIGJpdCA9IDEsXG4gICAgICBsZW4gPSBub2Rlcy5sZW5ndGg7IGlpIDwgbGVuOyBpaSsrLCBiaXQgPDw9IDEpIHtcbiAgICB2YXIgbm9kZSA9IG5vZGVzW2lpXTtcbiAgICBpZiAobm9kZSAhPT0gdW5kZWZpbmVkICYmIGlpICE9PSBleGNsdWRpbmcpIHtcbiAgICAgIGJpdG1hcCB8PSBiaXQ7XG4gICAgICBwYWNrZWROb2Rlc1twYWNrZWRJSSsrXSA9IG5vZGU7XG4gICAgfVxuICB9XG4gIHJldHVybiBuZXcgQml0bWFwSW5kZXhlZE5vZGUob3duZXJJRCwgYml0bWFwLCBwYWNrZWROb2Rlcyk7XG59XG5mdW5jdGlvbiBleHBhbmROb2Rlcyhvd25lcklELCBub2RlcywgYml0bWFwLCBpbmNsdWRpbmcsIG5vZGUpIHtcbiAgdmFyIGNvdW50ID0gMDtcbiAgdmFyIGV4cGFuZGVkTm9kZXMgPSBuZXcgQXJyYXkoU0laRSk7XG4gIGZvciAodmFyIGlpID0gMDsgYml0bWFwICE9PSAwOyBpaSsrLCBiaXRtYXAgPj4+PSAxKSB7XG4gICAgZXhwYW5kZWROb2Rlc1tpaV0gPSBiaXRtYXAgJiAxID8gbm9kZXNbY291bnQrK10gOiB1bmRlZmluZWQ7XG4gIH1cbiAgZXhwYW5kZWROb2Rlc1tpbmNsdWRpbmddID0gbm9kZTtcbiAgcmV0dXJuIG5ldyBBcnJheU5vZGUob3duZXJJRCwgY291bnQgKyAxLCBleHBhbmRlZE5vZGVzKTtcbn1cbmZ1bmN0aW9uIG1lcmdlSW50b01hcFdpdGgobWFwLCBtZXJnZXIsIGl0ZXJhYmxlcykge1xuICB2YXIgaXRlcnMgPSBbXTtcbiAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IGl0ZXJhYmxlcy5sZW5ndGg7IGlpKyspIHtcbiAgICB2YXIgdmFsdWUgPSBpdGVyYWJsZXNbaWldO1xuICAgIHZhciBpdGVyID0gS2V5ZWRJdGVyYWJsZSh2YWx1ZSk7XG4gICAgaWYgKCFpc0l0ZXJhYmxlKHZhbHVlKSkge1xuICAgICAgaXRlciA9IGl0ZXIubWFwKChmdW5jdGlvbih2KSB7XG4gICAgICAgIHJldHVybiBmcm9tSlModik7XG4gICAgICB9KSk7XG4gICAgfVxuICAgIGl0ZXJzLnB1c2goaXRlcik7XG4gIH1cbiAgcmV0dXJuIG1lcmdlSW50b0NvbGxlY3Rpb25XaXRoKG1hcCwgbWVyZ2VyLCBpdGVycyk7XG59XG5mdW5jdGlvbiBkZWVwTWVyZ2VyKG1lcmdlcikge1xuICByZXR1cm4gKGZ1bmN0aW9uKGV4aXN0aW5nLCB2YWx1ZSkge1xuICAgIHJldHVybiBleGlzdGluZyAmJiBleGlzdGluZy5tZXJnZURlZXBXaXRoICYmIGlzSXRlcmFibGUodmFsdWUpID8gZXhpc3RpbmcubWVyZ2VEZWVwV2l0aChtZXJnZXIsIHZhbHVlKSA6IG1lcmdlciA/IG1lcmdlcihleGlzdGluZywgdmFsdWUpIDogdmFsdWU7XG4gIH0pO1xufVxuZnVuY3Rpb24gbWVyZ2VJbnRvQ29sbGVjdGlvbldpdGgoY29sbGVjdGlvbiwgbWVyZ2VyLCBpdGVycykge1xuICBpZiAoaXRlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIGNvbGxlY3Rpb247XG4gIH1cbiAgcmV0dXJuIGNvbGxlY3Rpb24ud2l0aE11dGF0aW9ucygoZnVuY3Rpb24oY29sbGVjdGlvbikge1xuICAgIHZhciBtZXJnZUludG9NYXAgPSBtZXJnZXIgPyAoZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgY29sbGVjdGlvbi51cGRhdGUoa2V5LCBOT1RfU0VULCAoZnVuY3Rpb24oZXhpc3RpbmcpIHtcbiAgICAgICAgcmV0dXJuIGV4aXN0aW5nID09PSBOT1RfU0VUID8gdmFsdWUgOiBtZXJnZXIoZXhpc3RpbmcsIHZhbHVlKTtcbiAgICAgIH0pKTtcbiAgICB9KSA6IChmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICBjb2xsZWN0aW9uLnNldChrZXksIHZhbHVlKTtcbiAgICB9KTtcbiAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgaXRlcnMubGVuZ3RoOyBpaSsrKSB7XG4gICAgICBpdGVyc1tpaV0uZm9yRWFjaChtZXJnZUludG9NYXApO1xuICAgIH1cbiAgfSkpO1xufVxuZnVuY3Rpb24gdXBkYXRlSW5EZWVwTWFwKGNvbGxlY3Rpb24sIGtleVBhdGgsIG5vdFNldFZhbHVlLCB1cGRhdGVyLCBvZmZzZXQpIHtcbiAgaW52YXJpYW50KCFjb2xsZWN0aW9uIHx8IGNvbGxlY3Rpb24uc2V0LCAndXBkYXRlSW4gd2l0aCBpbnZhbGlkIGtleVBhdGgnKTtcbiAgdmFyIGtleSA9IGtleVBhdGhbb2Zmc2V0XTtcbiAgdmFyIGV4aXN0aW5nID0gY29sbGVjdGlvbiA/IGNvbGxlY3Rpb24uZ2V0KGtleSwgTk9UX1NFVCkgOiBOT1RfU0VUO1xuICB2YXIgZXhpc3RpbmdWYWx1ZSA9IGV4aXN0aW5nID09PSBOT1RfU0VUID8gdW5kZWZpbmVkIDogZXhpc3Rpbmc7XG4gIHZhciB2YWx1ZSA9IG9mZnNldCA9PT0ga2V5UGF0aC5sZW5ndGggLSAxID8gdXBkYXRlcihleGlzdGluZyA9PT0gTk9UX1NFVCA/IG5vdFNldFZhbHVlIDogZXhpc3RpbmcpIDogdXBkYXRlSW5EZWVwTWFwKGV4aXN0aW5nVmFsdWUsIGtleVBhdGgsIG5vdFNldFZhbHVlLCB1cGRhdGVyLCBvZmZzZXQgKyAxKTtcbiAgcmV0dXJuIHZhbHVlID09PSBleGlzdGluZ1ZhbHVlID8gY29sbGVjdGlvbiA6IHZhbHVlID09PSBOT1RfU0VUID8gY29sbGVjdGlvbiAmJiBjb2xsZWN0aW9uLnJlbW92ZShrZXkpIDogKGNvbGxlY3Rpb24gfHwgZW1wdHlNYXAoKSkuc2V0KGtleSwgdmFsdWUpO1xufVxuZnVuY3Rpb24gcG9wQ291bnQoeCkge1xuICB4ID0geCAtICgoeCA+PiAxKSAmIDB4NTU1NTU1NTUpO1xuICB4ID0gKHggJiAweDMzMzMzMzMzKSArICgoeCA+PiAyKSAmIDB4MzMzMzMzMzMpO1xuICB4ID0gKHggKyAoeCA+PiA0KSkgJiAweDBmMGYwZjBmO1xuICB4ID0geCArICh4ID4+IDgpO1xuICB4ID0geCArICh4ID4+IDE2KTtcbiAgcmV0dXJuIHggJiAweDdmO1xufVxuZnVuY3Rpb24gc2V0SW4oYXJyYXksIGlkeCwgdmFsLCBjYW5FZGl0KSB7XG4gIHZhciBuZXdBcnJheSA9IGNhbkVkaXQgPyBhcnJheSA6IGFyckNvcHkoYXJyYXkpO1xuICBuZXdBcnJheVtpZHhdID0gdmFsO1xuICByZXR1cm4gbmV3QXJyYXk7XG59XG5mdW5jdGlvbiBzcGxpY2VJbihhcnJheSwgaWR4LCB2YWwsIGNhbkVkaXQpIHtcbiAgdmFyIG5ld0xlbiA9IGFycmF5Lmxlbmd0aCArIDE7XG4gIGlmIChjYW5FZGl0ICYmIGlkeCArIDEgPT09IG5ld0xlbikge1xuICAgIGFycmF5W2lkeF0gPSB2YWw7XG4gICAgcmV0dXJuIGFycmF5O1xuICB9XG4gIHZhciBuZXdBcnJheSA9IG5ldyBBcnJheShuZXdMZW4pO1xuICB2YXIgYWZ0ZXIgPSAwO1xuICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgbmV3TGVuOyBpaSsrKSB7XG4gICAgaWYgKGlpID09PSBpZHgpIHtcbiAgICAgIG5ld0FycmF5W2lpXSA9IHZhbDtcbiAgICAgIGFmdGVyID0gLTE7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5ld0FycmF5W2lpXSA9IGFycmF5W2lpICsgYWZ0ZXJdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbmV3QXJyYXk7XG59XG5mdW5jdGlvbiBzcGxpY2VPdXQoYXJyYXksIGlkeCwgY2FuRWRpdCkge1xuICB2YXIgbmV3TGVuID0gYXJyYXkubGVuZ3RoIC0gMTtcbiAgaWYgKGNhbkVkaXQgJiYgaWR4ID09PSBuZXdMZW4pIHtcbiAgICBhcnJheS5wb3AoKTtcbiAgICByZXR1cm4gYXJyYXk7XG4gIH1cbiAgdmFyIG5ld0FycmF5ID0gbmV3IEFycmF5KG5ld0xlbik7XG4gIHZhciBhZnRlciA9IDA7XG4gIGZvciAodmFyIGlpID0gMDsgaWkgPCBuZXdMZW47IGlpKyspIHtcbiAgICBpZiAoaWkgPT09IGlkeCkge1xuICAgICAgYWZ0ZXIgPSAxO1xuICAgIH1cbiAgICBuZXdBcnJheVtpaV0gPSBhcnJheVtpaSArIGFmdGVyXTtcbiAgfVxuICByZXR1cm4gbmV3QXJyYXk7XG59XG52YXIgTUFYX0JJVE1BUF9TSVpFID0gU0laRSAvIDI7XG52YXIgTUlOX0FSUkFZX1NJWkUgPSBTSVpFIC8gNDtcbnZhciBUb0tleWVkU2VxdWVuY2UgPSBmdW5jdGlvbiBUb0tleWVkU2VxdWVuY2UoaW5kZXhlZCwgdXNlS2V5cykge1xuICB0aGlzLl9pdGVyID0gaW5kZXhlZDtcbiAgdGhpcy5fdXNlS2V5cyA9IHVzZUtleXM7XG4gIHRoaXMuc2l6ZSA9IGluZGV4ZWQuc2l6ZTtcbn07XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShUb0tleWVkU2VxdWVuY2UsIHtcbiAgZ2V0OiBmdW5jdGlvbihrZXksIG5vdFNldFZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuX2l0ZXIuZ2V0KGtleSwgbm90U2V0VmFsdWUpO1xuICB9LFxuICBoYXM6IGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiB0aGlzLl9pdGVyLmhhcyhrZXkpO1xuICB9LFxuICB2YWx1ZVNlcTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2l0ZXIudmFsdWVTZXEoKTtcbiAgfSxcbiAgcmV2ZXJzZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIHZhciByZXZlcnNlZFNlcXVlbmNlID0gcmV2ZXJzZUZhY3RvcnkodGhpcywgdHJ1ZSk7XG4gICAgaWYgKCF0aGlzLl91c2VLZXlzKSB7XG4gICAgICByZXZlcnNlZFNlcXVlbmNlLnZhbHVlU2VxID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gJF9fMC5faXRlci50b1NlcSgpLnJldmVyc2UoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcmV2ZXJzZWRTZXF1ZW5jZTtcbiAgfSxcbiAgbWFwOiBmdW5jdGlvbihtYXBwZXIsIGNvbnRleHQpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgdmFyIG1hcHBlZFNlcXVlbmNlID0gbWFwRmFjdG9yeSh0aGlzLCBtYXBwZXIsIGNvbnRleHQpO1xuICAgIGlmICghdGhpcy5fdXNlS2V5cykge1xuICAgICAgbWFwcGVkU2VxdWVuY2UudmFsdWVTZXEgPSAoZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAkX18wLl9pdGVyLnRvU2VxKCkubWFwKG1hcHBlciwgY29udGV4dCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG1hcHBlZFNlcXVlbmNlO1xuICB9LFxuICBfX2l0ZXJhdGU6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIHZhciBpaTtcbiAgICByZXR1cm4gdGhpcy5faXRlci5fX2l0ZXJhdGUodGhpcy5fdXNlS2V5cyA/IChmdW5jdGlvbih2LCBrKSB7XG4gICAgICByZXR1cm4gZm4odiwgaywgJF9fMCk7XG4gICAgfSkgOiAoKGlpID0gcmV2ZXJzZSA/IHJlc29sdmVTaXplKHRoaXMpIDogMCksIChmdW5jdGlvbih2KSB7XG4gICAgICByZXR1cm4gZm4odiwgcmV2ZXJzZSA/IC0taWkgOiBpaSsrLCAkX18wKTtcbiAgICB9KSksIHJldmVyc2UpO1xuICB9LFxuICBfX2l0ZXJhdG9yOiBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgaWYgKHRoaXMuX3VzZUtleXMpIHtcbiAgICAgIHJldHVybiB0aGlzLl9pdGVyLl9faXRlcmF0b3IodHlwZSwgcmV2ZXJzZSk7XG4gICAgfVxuICAgIHZhciBpdGVyYXRvciA9IHRoaXMuX2l0ZXIuX19pdGVyYXRvcihJVEVSQVRFX1ZBTFVFUywgcmV2ZXJzZSk7XG4gICAgdmFyIGlpID0gcmV2ZXJzZSA/IHJlc29sdmVTaXplKHRoaXMpIDogMDtcbiAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzdGVwID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgcmV0dXJuIHN0ZXAuZG9uZSA/IHN0ZXAgOiBpdGVyYXRvclZhbHVlKHR5cGUsIHJldmVyc2UgPyAtLWlpIDogaWkrKywgc3RlcC52YWx1ZSwgc3RlcCk7XG4gICAgfSkpO1xuICB9XG59LCB7fSwgS2V5ZWRTZXEpO1xudmFyIFRvSW5kZXhlZFNlcXVlbmNlID0gZnVuY3Rpb24gVG9JbmRleGVkU2VxdWVuY2UoaXRlcikge1xuICB0aGlzLl9pdGVyID0gaXRlcjtcbiAgdGhpcy5zaXplID0gaXRlci5zaXplO1xufTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFRvSW5kZXhlZFNlcXVlbmNlLCB7XG4gIGNvbnRhaW5zOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLl9pdGVyLmNvbnRhaW5zKHZhbHVlKTtcbiAgfSxcbiAgX19pdGVyYXRlOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgcmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRlKChmdW5jdGlvbih2KSB7XG4gICAgICByZXR1cm4gZm4odiwgaXRlcmF0aW9ucysrLCAkX18wKTtcbiAgICB9KSwgcmV2ZXJzZSk7XG4gIH0sXG4gIF9faXRlcmF0b3I6IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICB2YXIgaXRlcmF0b3IgPSB0aGlzLl9pdGVyLl9faXRlcmF0b3IoSVRFUkFURV9WQUxVRVMsIHJldmVyc2UpO1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzdGVwID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgcmV0dXJuIHN0ZXAuZG9uZSA/IHN0ZXAgOiBpdGVyYXRvclZhbHVlKHR5cGUsIGl0ZXJhdGlvbnMrKywgc3RlcC52YWx1ZSwgc3RlcCk7XG4gICAgfSkpO1xuICB9XG59LCB7fSwgSW5kZXhlZFNlcSk7XG52YXIgVG9TZXRTZXF1ZW5jZSA9IGZ1bmN0aW9uIFRvU2V0U2VxdWVuY2UoaXRlcikge1xuICB0aGlzLl9pdGVyID0gaXRlcjtcbiAgdGhpcy5zaXplID0gaXRlci5zaXplO1xufTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFRvU2V0U2VxdWVuY2UsIHtcbiAgaGFzOiBmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5faXRlci5jb250YWlucyhrZXkpO1xuICB9LFxuICBfX2l0ZXJhdGU6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIHJldHVybiB0aGlzLl9pdGVyLl9faXRlcmF0ZSgoZnVuY3Rpb24odikge1xuICAgICAgcmV0dXJuIGZuKHYsIHYsICRfXzApO1xuICAgIH0pLCByZXZlcnNlKTtcbiAgfSxcbiAgX19pdGVyYXRvcjogZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHZhciBpdGVyYXRvciA9IHRoaXMuX2l0ZXIuX19pdGVyYXRvcihJVEVSQVRFX1ZBTFVFUywgcmV2ZXJzZSk7XG4gICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc3RlcCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgIHJldHVybiBzdGVwLmRvbmUgPyBzdGVwIDogaXRlcmF0b3JWYWx1ZSh0eXBlLCBzdGVwLnZhbHVlLCBzdGVwLnZhbHVlLCBzdGVwKTtcbiAgICB9KSk7XG4gIH1cbn0sIHt9LCBTZXRTZXEpO1xudmFyIEZyb21FbnRyaWVzU2VxdWVuY2UgPSBmdW5jdGlvbiBGcm9tRW50cmllc1NlcXVlbmNlKGVudHJpZXMpIHtcbiAgdGhpcy5faXRlciA9IGVudHJpZXM7XG4gIHRoaXMuc2l6ZSA9IGVudHJpZXMuc2l6ZTtcbn07XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShGcm9tRW50cmllc1NlcXVlbmNlLCB7XG4gIGVudHJ5U2VxOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5faXRlci50b1NlcSgpO1xuICB9LFxuICBfX2l0ZXJhdGU6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIHJldHVybiB0aGlzLl9pdGVyLl9faXRlcmF0ZSgoZnVuY3Rpb24oZW50cnkpIHtcbiAgICAgIGlmIChlbnRyeSkge1xuICAgICAgICB2YWxpZGF0ZUVudHJ5KGVudHJ5KTtcbiAgICAgICAgcmV0dXJuIGZuKGVudHJ5WzFdLCBlbnRyeVswXSwgJF9fMCk7XG4gICAgICB9XG4gICAgfSksIHJldmVyc2UpO1xuICB9LFxuICBfX2l0ZXJhdG9yOiBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgdmFyIGl0ZXJhdG9yID0gdGhpcy5faXRlci5fX2l0ZXJhdG9yKElURVJBVEVfVkFMVUVTLCByZXZlcnNlKTtcbiAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIHZhciBzdGVwID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICBpZiAoc3RlcC5kb25lKSB7XG4gICAgICAgICAgcmV0dXJuIHN0ZXA7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGVudHJ5ID0gc3RlcC52YWx1ZTtcbiAgICAgICAgaWYgKGVudHJ5KSB7XG4gICAgICAgICAgdmFsaWRhdGVFbnRyeShlbnRyeSk7XG4gICAgICAgICAgcmV0dXJuIHR5cGUgPT09IElURVJBVEVfRU5UUklFUyA/IHN0ZXAgOiBpdGVyYXRvclZhbHVlKHR5cGUsIGVudHJ5WzBdLCBlbnRyeVsxXSwgc3RlcCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KSk7XG4gIH1cbn0sIHt9LCBLZXllZFNlcSk7XG5Ub0luZGV4ZWRTZXF1ZW5jZS5wcm90b3R5cGUuY2FjaGVSZXN1bHQgPSBUb0tleWVkU2VxdWVuY2UucHJvdG90eXBlLmNhY2hlUmVzdWx0ID0gVG9TZXRTZXF1ZW5jZS5wcm90b3R5cGUuY2FjaGVSZXN1bHQgPSBGcm9tRW50cmllc1NlcXVlbmNlLnByb3RvdHlwZS5jYWNoZVJlc3VsdCA9IGNhY2hlUmVzdWx0VGhyb3VnaDtcbmZ1bmN0aW9uIGZsaXBGYWN0b3J5KGl0ZXJhYmxlKSB7XG4gIHZhciBmbGlwU2VxdWVuY2UgPSBtYWtlU2VxdWVuY2UoaXRlcmFibGUpO1xuICBmbGlwU2VxdWVuY2UuX2l0ZXIgPSBpdGVyYWJsZTtcbiAgZmxpcFNlcXVlbmNlLnNpemUgPSBpdGVyYWJsZS5zaXplO1xuICBmbGlwU2VxdWVuY2UuZmxpcCA9IChmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gaXRlcmFibGU7XG4gIH0pO1xuICBmbGlwU2VxdWVuY2UucmV2ZXJzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXZlcnNlZFNlcXVlbmNlID0gaXRlcmFibGUucmV2ZXJzZS5hcHBseSh0aGlzKTtcbiAgICByZXZlcnNlZFNlcXVlbmNlLmZsaXAgPSAoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gaXRlcmFibGUucmV2ZXJzZSgpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXZlcnNlZFNlcXVlbmNlO1xuICB9O1xuICBmbGlwU2VxdWVuY2UuaGFzID0gKGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiBpdGVyYWJsZS5jb250YWlucyhrZXkpO1xuICB9KTtcbiAgZmxpcFNlcXVlbmNlLmNvbnRhaW5zID0gKGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiBpdGVyYWJsZS5oYXMoa2V5KTtcbiAgfSk7XG4gIGZsaXBTZXF1ZW5jZS5jYWNoZVJlc3VsdCA9IGNhY2hlUmVzdWx0VGhyb3VnaDtcbiAgZmxpcFNlcXVlbmNlLl9faXRlcmF0ZVVuY2FjaGVkID0gZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgcmV0dXJuIGl0ZXJhYmxlLl9faXRlcmF0ZSgoZnVuY3Rpb24odiwgaykge1xuICAgICAgcmV0dXJuIGZuKGssIHYsICRfXzApICE9PSBmYWxzZTtcbiAgICB9KSwgcmV2ZXJzZSk7XG4gIH07XG4gIGZsaXBTZXF1ZW5jZS5fX2l0ZXJhdG9yVW5jYWNoZWQgPSBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgaWYgKHR5cGUgPT09IElURVJBVEVfRU5UUklFUykge1xuICAgICAgdmFyIGl0ZXJhdG9yID0gaXRlcmFibGUuX19pdGVyYXRvcih0eXBlLCByZXZlcnNlKTtcbiAgICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc3RlcCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgaWYgKCFzdGVwLmRvbmUpIHtcbiAgICAgICAgICB2YXIgayA9IHN0ZXAudmFsdWVbMF07XG4gICAgICAgICAgc3RlcC52YWx1ZVswXSA9IHN0ZXAudmFsdWVbMV07XG4gICAgICAgICAgc3RlcC52YWx1ZVsxXSA9IGs7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0ZXA7XG4gICAgICB9KSk7XG4gICAgfVxuICAgIHJldHVybiBpdGVyYWJsZS5fX2l0ZXJhdG9yKHR5cGUgPT09IElURVJBVEVfVkFMVUVTID8gSVRFUkFURV9LRVlTIDogSVRFUkFURV9WQUxVRVMsIHJldmVyc2UpO1xuICB9O1xuICByZXR1cm4gZmxpcFNlcXVlbmNlO1xufVxuZnVuY3Rpb24gbWFwRmFjdG9yeShpdGVyYWJsZSwgbWFwcGVyLCBjb250ZXh0KSB7XG4gIHZhciBtYXBwZWRTZXF1ZW5jZSA9IG1ha2VTZXF1ZW5jZShpdGVyYWJsZSk7XG4gIG1hcHBlZFNlcXVlbmNlLnNpemUgPSBpdGVyYWJsZS5zaXplO1xuICBtYXBwZWRTZXF1ZW5jZS5oYXMgPSAoZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIGl0ZXJhYmxlLmhhcyhrZXkpO1xuICB9KTtcbiAgbWFwcGVkU2VxdWVuY2UuZ2V0ID0gKGZ1bmN0aW9uKGtleSwgbm90U2V0VmFsdWUpIHtcbiAgICB2YXIgdiA9IGl0ZXJhYmxlLmdldChrZXksIE5PVF9TRVQpO1xuICAgIHJldHVybiB2ID09PSBOT1RfU0VUID8gbm90U2V0VmFsdWUgOiBtYXBwZXIuY2FsbChjb250ZXh0LCB2LCBrZXksIGl0ZXJhYmxlKTtcbiAgfSk7XG4gIG1hcHBlZFNlcXVlbmNlLl9faXRlcmF0ZVVuY2FjaGVkID0gZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgcmV0dXJuIGl0ZXJhYmxlLl9faXRlcmF0ZSgoZnVuY3Rpb24odiwgaywgYykge1xuICAgICAgcmV0dXJuIGZuKG1hcHBlci5jYWxsKGNvbnRleHQsIHYsIGssIGMpLCBrLCAkX18wKSAhPT0gZmFsc2U7XG4gICAgfSksIHJldmVyc2UpO1xuICB9O1xuICBtYXBwZWRTZXF1ZW5jZS5fX2l0ZXJhdG9yVW5jYWNoZWQgPSBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgdmFyIGl0ZXJhdG9yID0gaXRlcmFibGUuX19pdGVyYXRvcihJVEVSQVRFX0VOVFJJRVMsIHJldmVyc2UpO1xuICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHN0ZXAgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICBpZiAoc3RlcC5kb25lKSB7XG4gICAgICAgIHJldHVybiBzdGVwO1xuICAgICAgfVxuICAgICAgdmFyIGVudHJ5ID0gc3RlcC52YWx1ZTtcbiAgICAgIHZhciBrZXkgPSBlbnRyeVswXTtcbiAgICAgIHJldHVybiBpdGVyYXRvclZhbHVlKHR5cGUsIGtleSwgbWFwcGVyLmNhbGwoY29udGV4dCwgZW50cnlbMV0sIGtleSwgaXRlcmFibGUpLCBzdGVwKTtcbiAgICB9KSk7XG4gIH07XG4gIHJldHVybiBtYXBwZWRTZXF1ZW5jZTtcbn1cbmZ1bmN0aW9uIHJldmVyc2VGYWN0b3J5KGl0ZXJhYmxlLCB1c2VLZXlzKSB7XG4gIHZhciByZXZlcnNlZFNlcXVlbmNlID0gbWFrZVNlcXVlbmNlKGl0ZXJhYmxlKTtcbiAgcmV2ZXJzZWRTZXF1ZW5jZS5faXRlciA9IGl0ZXJhYmxlO1xuICByZXZlcnNlZFNlcXVlbmNlLnNpemUgPSBpdGVyYWJsZS5zaXplO1xuICByZXZlcnNlZFNlcXVlbmNlLnJldmVyc2UgPSAoZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGl0ZXJhYmxlO1xuICB9KTtcbiAgaWYgKGl0ZXJhYmxlLmZsaXApIHtcbiAgICByZXZlcnNlZFNlcXVlbmNlLmZsaXAgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBmbGlwU2VxdWVuY2UgPSBmbGlwRmFjdG9yeShpdGVyYWJsZSk7XG4gICAgICBmbGlwU2VxdWVuY2UucmV2ZXJzZSA9IChmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhYmxlLmZsaXAoKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGZsaXBTZXF1ZW5jZTtcbiAgICB9O1xuICB9XG4gIHJldmVyc2VkU2VxdWVuY2UuZ2V0ID0gKGZ1bmN0aW9uKGtleSwgbm90U2V0VmFsdWUpIHtcbiAgICByZXR1cm4gaXRlcmFibGUuZ2V0KHVzZUtleXMgPyBrZXkgOiAtMSAtIGtleSwgbm90U2V0VmFsdWUpO1xuICB9KTtcbiAgcmV2ZXJzZWRTZXF1ZW5jZS5oYXMgPSAoZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIGl0ZXJhYmxlLmhhcyh1c2VLZXlzID8ga2V5IDogLTEgLSBrZXkpO1xuICB9KTtcbiAgcmV2ZXJzZWRTZXF1ZW5jZS5jb250YWlucyA9IChmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiBpdGVyYWJsZS5jb250YWlucyh2YWx1ZSk7XG4gIH0pO1xuICByZXZlcnNlZFNlcXVlbmNlLmNhY2hlUmVzdWx0ID0gY2FjaGVSZXN1bHRUaHJvdWdoO1xuICByZXZlcnNlZFNlcXVlbmNlLl9faXRlcmF0ZSA9IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIHJldHVybiBpdGVyYWJsZS5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYsIGspIHtcbiAgICAgIHJldHVybiBmbih2LCBrLCAkX18wKTtcbiAgICB9KSwgIXJldmVyc2UpO1xuICB9O1xuICByZXZlcnNlZFNlcXVlbmNlLl9faXRlcmF0b3IgPSAoZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHJldHVybiBpdGVyYWJsZS5fX2l0ZXJhdG9yKHR5cGUsICFyZXZlcnNlKTtcbiAgfSk7XG4gIHJldHVybiByZXZlcnNlZFNlcXVlbmNlO1xufVxuZnVuY3Rpb24gZmlsdGVyRmFjdG9yeShpdGVyYWJsZSwgcHJlZGljYXRlLCBjb250ZXh0LCB1c2VLZXlzKSB7XG4gIHZhciBmaWx0ZXJTZXF1ZW5jZSA9IG1ha2VTZXF1ZW5jZShpdGVyYWJsZSk7XG4gIGlmICh1c2VLZXlzKSB7XG4gICAgZmlsdGVyU2VxdWVuY2UuaGFzID0gKGZ1bmN0aW9uKGtleSkge1xuICAgICAgdmFyIHYgPSBpdGVyYWJsZS5nZXQoa2V5LCBOT1RfU0VUKTtcbiAgICAgIHJldHVybiB2ICE9PSBOT1RfU0VUICYmICEhcHJlZGljYXRlLmNhbGwoY29udGV4dCwgdiwga2V5LCBpdGVyYWJsZSk7XG4gICAgfSk7XG4gICAgZmlsdGVyU2VxdWVuY2UuZ2V0ID0gKGZ1bmN0aW9uKGtleSwgbm90U2V0VmFsdWUpIHtcbiAgICAgIHZhciB2ID0gaXRlcmFibGUuZ2V0KGtleSwgTk9UX1NFVCk7XG4gICAgICByZXR1cm4gdiAhPT0gTk9UX1NFVCAmJiBwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2LCBrZXksIGl0ZXJhYmxlKSA/IHYgOiBub3RTZXRWYWx1ZTtcbiAgICB9KTtcbiAgfVxuICBmaWx0ZXJTZXF1ZW5jZS5fX2l0ZXJhdGVVbmNhY2hlZCA9IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICBpdGVyYWJsZS5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYsIGssIGMpIHtcbiAgICAgIGlmIChwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2LCBrLCBjKSkge1xuICAgICAgICBpdGVyYXRpb25zKys7XG4gICAgICAgIHJldHVybiBmbih2LCB1c2VLZXlzID8gayA6IGl0ZXJhdGlvbnMgLSAxLCAkX18wKTtcbiAgICAgIH1cbiAgICB9KSwgcmV2ZXJzZSk7XG4gICAgcmV0dXJuIGl0ZXJhdGlvbnM7XG4gIH07XG4gIGZpbHRlclNlcXVlbmNlLl9faXRlcmF0b3JVbmNhY2hlZCA9IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICB2YXIgaXRlcmF0b3IgPSBpdGVyYWJsZS5fX2l0ZXJhdG9yKElURVJBVEVfRU5UUklFUywgcmV2ZXJzZSk7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgdmFyIHN0ZXAgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIGlmIChzdGVwLmRvbmUpIHtcbiAgICAgICAgICByZXR1cm4gc3RlcDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZW50cnkgPSBzdGVwLnZhbHVlO1xuICAgICAgICB2YXIga2V5ID0gZW50cnlbMF07XG4gICAgICAgIHZhciB2YWx1ZSA9IGVudHJ5WzFdO1xuICAgICAgICBpZiAocHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGtleSwgaXRlcmFibGUpKSB7XG4gICAgICAgICAgcmV0dXJuIGl0ZXJhdG9yVmFsdWUodHlwZSwgdXNlS2V5cyA/IGtleSA6IGl0ZXJhdGlvbnMrKywgdmFsdWUsIHN0ZXApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSkpO1xuICB9O1xuICByZXR1cm4gZmlsdGVyU2VxdWVuY2U7XG59XG5mdW5jdGlvbiBjb3VudEJ5RmFjdG9yeShpdGVyYWJsZSwgZ3JvdXBlciwgY29udGV4dCkge1xuICB2YXIgZ3JvdXBzID0gTWFwKCkuYXNNdXRhYmxlKCk7XG4gIGl0ZXJhYmxlLl9faXRlcmF0ZSgoZnVuY3Rpb24odiwgaykge1xuICAgIGdyb3Vwcy51cGRhdGUoZ3JvdXBlci5jYWxsKGNvbnRleHQsIHYsIGssIGl0ZXJhYmxlKSwgMCwgKGZ1bmN0aW9uKGEpIHtcbiAgICAgIHJldHVybiBhICsgMTtcbiAgICB9KSk7XG4gIH0pKTtcbiAgcmV0dXJuIGdyb3Vwcy5hc0ltbXV0YWJsZSgpO1xufVxuZnVuY3Rpb24gZ3JvdXBCeUZhY3RvcnkoaXRlcmFibGUsIGdyb3VwZXIsIGNvbnRleHQpIHtcbiAgdmFyIGlzS2V5ZWRJdGVyID0gaXNLZXllZChpdGVyYWJsZSk7XG4gIHZhciBncm91cHMgPSBNYXAoKS5hc011dGFibGUoKTtcbiAgaXRlcmFibGUuX19pdGVyYXRlKChmdW5jdGlvbih2LCBrKSB7XG4gICAgZ3JvdXBzLnVwZGF0ZShncm91cGVyLmNhbGwoY29udGV4dCwgdiwgaywgaXRlcmFibGUpLCBbXSwgKGZ1bmN0aW9uKGEpIHtcbiAgICAgIHJldHVybiAoYS5wdXNoKGlzS2V5ZWRJdGVyID8gW2ssIHZdIDogdiksIGEpO1xuICAgIH0pKTtcbiAgfSkpO1xuICB2YXIgY29lcmNlID0gaXRlcmFibGVDbGFzcyhpdGVyYWJsZSk7XG4gIHJldHVybiBncm91cHMubWFwKChmdW5jdGlvbihhcnIpIHtcbiAgICByZXR1cm4gcmVpZnkoaXRlcmFibGUsIGNvZXJjZShhcnIpKTtcbiAgfSkpO1xufVxuZnVuY3Rpb24gdGFrZUZhY3RvcnkoaXRlcmFibGUsIGFtb3VudCkge1xuICBpZiAoYW1vdW50ID4gaXRlcmFibGUuc2l6ZSkge1xuICAgIHJldHVybiBpdGVyYWJsZTtcbiAgfVxuICBpZiAoYW1vdW50IDwgMCkge1xuICAgIGFtb3VudCA9IDA7XG4gIH1cbiAgdmFyIHRha2VTZXF1ZW5jZSA9IG1ha2VTZXF1ZW5jZShpdGVyYWJsZSk7XG4gIHRha2VTZXF1ZW5jZS5zaXplID0gaXRlcmFibGUuc2l6ZSAmJiBNYXRoLm1pbihpdGVyYWJsZS5zaXplLCBhbW91bnQpO1xuICB0YWtlU2VxdWVuY2UuX19pdGVyYXRlVW5jYWNoZWQgPSBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICBpZiAoYW1vdW50ID09PSAwKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgaWYgKHJldmVyc2UpIHtcbiAgICAgIHJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRlKGZuLCByZXZlcnNlKTtcbiAgICB9XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIGl0ZXJhYmxlLl9faXRlcmF0ZSgoZnVuY3Rpb24odiwgaykge1xuICAgICAgcmV0dXJuICsraXRlcmF0aW9ucyAmJiBmbih2LCBrLCAkX18wKSAhPT0gZmFsc2UgJiYgaXRlcmF0aW9ucyA8IGFtb3VudDtcbiAgICB9KSk7XG4gICAgcmV0dXJuIGl0ZXJhdGlvbnM7XG4gIH07XG4gIHRha2VTZXF1ZW5jZS5fX2l0ZXJhdG9yVW5jYWNoZWQgPSBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgaWYgKHJldmVyc2UpIHtcbiAgICAgIHJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcih0eXBlLCByZXZlcnNlKTtcbiAgICB9XG4gICAgdmFyIGl0ZXJhdG9yID0gYW1vdW50ICYmIGl0ZXJhYmxlLl9faXRlcmF0b3IodHlwZSwgcmV2ZXJzZSk7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKGl0ZXJhdGlvbnMrKyA+IGFtb3VudCkge1xuICAgICAgICByZXR1cm4gaXRlcmF0b3JEb25lKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gaXRlcmF0b3IubmV4dCgpO1xuICAgIH0pKTtcbiAgfTtcbiAgcmV0dXJuIHRha2VTZXF1ZW5jZTtcbn1cbmZ1bmN0aW9uIHRha2VXaGlsZUZhY3RvcnkoaXRlcmFibGUsIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICB2YXIgdGFrZVNlcXVlbmNlID0gbWFrZVNlcXVlbmNlKGl0ZXJhYmxlKTtcbiAgdGFrZVNlcXVlbmNlLl9faXRlcmF0ZVVuY2FjaGVkID0gZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgaWYgKHJldmVyc2UpIHtcbiAgICAgIHJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRlKGZuLCByZXZlcnNlKTtcbiAgICB9XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIGl0ZXJhYmxlLl9faXRlcmF0ZSgoZnVuY3Rpb24odiwgaywgYykge1xuICAgICAgcmV0dXJuIHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHYsIGssIGMpICYmICsraXRlcmF0aW9ucyAmJiBmbih2LCBrLCAkX18wKTtcbiAgICB9KSk7XG4gICAgcmV0dXJuIGl0ZXJhdGlvbnM7XG4gIH07XG4gIHRha2VTZXF1ZW5jZS5fX2l0ZXJhdG9yVW5jYWNoZWQgPSBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0b3IodHlwZSwgcmV2ZXJzZSk7XG4gICAgfVxuICAgIHZhciBpdGVyYXRvciA9IGl0ZXJhYmxlLl9faXRlcmF0b3IoSVRFUkFURV9FTlRSSUVTLCByZXZlcnNlKTtcbiAgICB2YXIgaXRlcmF0aW5nID0gdHJ1ZTtcbiAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgIGlmICghaXRlcmF0aW5nKSB7XG4gICAgICAgIHJldHVybiBpdGVyYXRvckRvbmUoKTtcbiAgICAgIH1cbiAgICAgIHZhciBzdGVwID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgaWYgKHN0ZXAuZG9uZSkge1xuICAgICAgICByZXR1cm4gc3RlcDtcbiAgICAgIH1cbiAgICAgIHZhciBlbnRyeSA9IHN0ZXAudmFsdWU7XG4gICAgICB2YXIgayA9IGVudHJ5WzBdO1xuICAgICAgdmFyIHYgPSBlbnRyeVsxXTtcbiAgICAgIGlmICghcHJlZGljYXRlLmNhbGwoY29udGV4dCwgdiwgaywgJF9fMCkpIHtcbiAgICAgICAgaXRlcmF0aW5nID0gZmFsc2U7XG4gICAgICAgIHJldHVybiBpdGVyYXRvckRvbmUoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0eXBlID09PSBJVEVSQVRFX0VOVFJJRVMgPyBzdGVwIDogaXRlcmF0b3JWYWx1ZSh0eXBlLCBrLCB2LCBzdGVwKTtcbiAgICB9KSk7XG4gIH07XG4gIHJldHVybiB0YWtlU2VxdWVuY2U7XG59XG5mdW5jdGlvbiBza2lwRmFjdG9yeShpdGVyYWJsZSwgYW1vdW50LCB1c2VLZXlzKSB7XG4gIGlmIChhbW91bnQgPD0gMCkge1xuICAgIHJldHVybiBpdGVyYWJsZTtcbiAgfVxuICB2YXIgc2tpcFNlcXVlbmNlID0gbWFrZVNlcXVlbmNlKGl0ZXJhYmxlKTtcbiAgc2tpcFNlcXVlbmNlLnNpemUgPSBpdGVyYWJsZS5zaXplICYmIE1hdGgubWF4KDAsIGl0ZXJhYmxlLnNpemUgLSBhbW91bnQpO1xuICBza2lwU2VxdWVuY2UuX19pdGVyYXRlVW5jYWNoZWQgPSBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdGUoZm4sIHJldmVyc2UpO1xuICAgIH1cbiAgICB2YXIgc2tpcHBlZCA9IDA7XG4gICAgdmFyIGlzU2tpcHBpbmcgPSB0cnVlO1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICBpdGVyYWJsZS5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYsIGspIHtcbiAgICAgIGlmICghKGlzU2tpcHBpbmcgJiYgKGlzU2tpcHBpbmcgPSBza2lwcGVkKysgPCBhbW91bnQpKSkge1xuICAgICAgICBpdGVyYXRpb25zKys7XG4gICAgICAgIHJldHVybiBmbih2LCB1c2VLZXlzID8gayA6IGl0ZXJhdGlvbnMgLSAxLCAkX18wKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gICAgcmV0dXJuIGl0ZXJhdGlvbnM7XG4gIH07XG4gIHNraXBTZXF1ZW5jZS5fX2l0ZXJhdG9yVW5jYWNoZWQgPSBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgaWYgKHJldmVyc2UpIHtcbiAgICAgIHJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcih0eXBlLCByZXZlcnNlKTtcbiAgICB9XG4gICAgdmFyIGl0ZXJhdG9yID0gYW1vdW50ICYmIGl0ZXJhYmxlLl9faXRlcmF0b3IodHlwZSwgcmV2ZXJzZSk7XG4gICAgdmFyIHNraXBwZWQgPSAwO1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgIHdoaWxlIChza2lwcGVkIDwgYW1vdW50KSB7XG4gICAgICAgIHNraXBwZWQrKztcbiAgICAgICAgaXRlcmF0b3IubmV4dCgpO1xuICAgICAgfVxuICAgICAgdmFyIHN0ZXAgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICBpZiAodXNlS2V5cyB8fCB0eXBlID09PSBJVEVSQVRFX1ZBTFVFUykge1xuICAgICAgICByZXR1cm4gc3RlcDtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gSVRFUkFURV9LRVlTKSB7XG4gICAgICAgIHJldHVybiBpdGVyYXRvclZhbHVlKHR5cGUsIGl0ZXJhdGlvbnMrKywgdW5kZWZpbmVkLCBzdGVwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBpdGVyYXRvclZhbHVlKHR5cGUsIGl0ZXJhdGlvbnMrKywgc3RlcC52YWx1ZVsxXSwgc3RlcCk7XG4gICAgICB9XG4gICAgfSkpO1xuICB9O1xuICByZXR1cm4gc2tpcFNlcXVlbmNlO1xufVxuZnVuY3Rpb24gc2tpcFdoaWxlRmFjdG9yeShpdGVyYWJsZSwgcHJlZGljYXRlLCBjb250ZXh0LCB1c2VLZXlzKSB7XG4gIHZhciBza2lwU2VxdWVuY2UgPSBtYWtlU2VxdWVuY2UoaXRlcmFibGUpO1xuICBza2lwU2VxdWVuY2UuX19pdGVyYXRlVW5jYWNoZWQgPSBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdGUoZm4sIHJldmVyc2UpO1xuICAgIH1cbiAgICB2YXIgaXNTa2lwcGluZyA9IHRydWU7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIGl0ZXJhYmxlLl9faXRlcmF0ZSgoZnVuY3Rpb24odiwgaywgYykge1xuICAgICAgaWYgKCEoaXNTa2lwcGluZyAmJiAoaXNTa2lwcGluZyA9IHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHYsIGssIGMpKSkpIHtcbiAgICAgICAgaXRlcmF0aW9ucysrO1xuICAgICAgICByZXR1cm4gZm4odiwgdXNlS2V5cyA/IGsgOiBpdGVyYXRpb25zIC0gMSwgJF9fMCk7XG4gICAgICB9XG4gICAgfSkpO1xuICAgIHJldHVybiBpdGVyYXRpb25zO1xuICB9O1xuICBza2lwU2VxdWVuY2UuX19pdGVyYXRvclVuY2FjaGVkID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICAgIH1cbiAgICB2YXIgaXRlcmF0b3IgPSBpdGVyYWJsZS5fX2l0ZXJhdG9yKElURVJBVEVfRU5UUklFUywgcmV2ZXJzZSk7XG4gICAgdmFyIHNraXBwaW5nID0gdHJ1ZTtcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc3RlcCxcbiAgICAgICAgICBrLFxuICAgICAgICAgIHY7XG4gICAgICBkbyB7XG4gICAgICAgIHN0ZXAgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIGlmIChzdGVwLmRvbmUpIHtcbiAgICAgICAgICBpZiAodXNlS2V5cyB8fCB0eXBlID09PSBJVEVSQVRFX1ZBTFVFUykge1xuICAgICAgICAgICAgcmV0dXJuIHN0ZXA7XG4gICAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSBJVEVSQVRFX0tFWVMpIHtcbiAgICAgICAgICAgIHJldHVybiBpdGVyYXRvclZhbHVlKHR5cGUsIGl0ZXJhdGlvbnMrKywgdW5kZWZpbmVkLCBzdGVwKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGl0ZXJhdG9yVmFsdWUodHlwZSwgaXRlcmF0aW9ucysrLCBzdGVwLnZhbHVlWzFdLCBzdGVwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGVudHJ5ID0gc3RlcC52YWx1ZTtcbiAgICAgICAgayA9IGVudHJ5WzBdO1xuICAgICAgICB2ID0gZW50cnlbMV07XG4gICAgICAgIHNraXBwaW5nICYmIChza2lwcGluZyA9IHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHYsIGssICRfXzApKTtcbiAgICAgIH0gd2hpbGUgKHNraXBwaW5nKTtcbiAgICAgIHJldHVybiB0eXBlID09PSBJVEVSQVRFX0VOVFJJRVMgPyBzdGVwIDogaXRlcmF0b3JWYWx1ZSh0eXBlLCBrLCB2LCBzdGVwKTtcbiAgICB9KSk7XG4gIH07XG4gIHJldHVybiBza2lwU2VxdWVuY2U7XG59XG5mdW5jdGlvbiBjb25jYXRGYWN0b3J5KGl0ZXJhYmxlLCB2YWx1ZXMsIHVzZUtleXMpIHtcbiAgdmFyIGlzS2V5ZWRJdGVyID0gaXNLZXllZChpdGVyYWJsZSk7XG4gIHZhciBpdGVycyA9IG5ldyBBcnJheVNlcShbaXRlcmFibGVdLmNvbmNhdCh2YWx1ZXMpKS5tYXAoKGZ1bmN0aW9uKHYpIHtcbiAgICBpZiAoIWlzSXRlcmFibGUodikpIHtcbiAgICAgIHYgPSBzZXFGcm9tVmFsdWUodiwgdHJ1ZSk7XG4gICAgfVxuICAgIGlmIChpc0tleWVkSXRlcikge1xuICAgICAgdiA9IEtleWVkSXRlcmFibGUodik7XG4gICAgfVxuICAgIHJldHVybiB2O1xuICB9KSk7XG4gIGlmIChpc0tleWVkSXRlcikge1xuICAgIGl0ZXJzID0gaXRlcnMudG9LZXllZFNlcSgpO1xuICB9IGVsc2UgaWYgKCFpc0luZGV4ZWQoaXRlcmFibGUpKSB7XG4gICAgaXRlcnMgPSBpdGVycy50b1NldFNlcSgpO1xuICB9XG4gIHZhciBmbGF0ID0gaXRlcnMuZmxhdHRlbih0cnVlKTtcbiAgZmxhdC5zaXplID0gaXRlcnMucmVkdWNlKChmdW5jdGlvbihzdW0sIHNlcSkge1xuICAgIGlmIChzdW0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgdmFyIHNpemUgPSBzZXEuc2l6ZTtcbiAgICAgIGlmIChzaXplICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHN1bSArIHNpemU7XG4gICAgICB9XG4gICAgfVxuICB9KSwgMCk7XG4gIHJldHVybiBmbGF0O1xufVxuZnVuY3Rpb24gZmxhdHRlbkZhY3RvcnkoaXRlcmFibGUsIGRlcHRoLCB1c2VLZXlzKSB7XG4gIHZhciBmbGF0U2VxdWVuY2UgPSBtYWtlU2VxdWVuY2UoaXRlcmFibGUpO1xuICBmbGF0U2VxdWVuY2UuX19pdGVyYXRlVW5jYWNoZWQgPSBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICB2YXIgc3RvcHBlZCA9IGZhbHNlO1xuICAgIGZ1bmN0aW9uIGZsYXREZWVwKGl0ZXIsIGN1cnJlbnREZXB0aCkge1xuICAgICAgdmFyICRfXzAgPSB0aGlzO1xuICAgICAgaXRlci5fX2l0ZXJhdGUoKGZ1bmN0aW9uKHYsIGspIHtcbiAgICAgICAgaWYgKCghZGVwdGggfHwgY3VycmVudERlcHRoIDwgZGVwdGgpICYmIGlzSXRlcmFibGUodikpIHtcbiAgICAgICAgICBmbGF0RGVlcCh2LCBjdXJyZW50RGVwdGggKyAxKTtcbiAgICAgICAgfSBlbHNlIGlmIChmbih2LCB1c2VLZXlzID8gayA6IGl0ZXJhdGlvbnMrKywgJF9fMCkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgc3RvcHBlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICFzdG9wcGVkO1xuICAgICAgfSksIHJldmVyc2UpO1xuICAgIH1cbiAgICBmbGF0RGVlcChpdGVyYWJsZSwgMCk7XG4gICAgcmV0dXJuIGl0ZXJhdGlvbnM7XG4gIH07XG4gIGZsYXRTZXF1ZW5jZS5fX2l0ZXJhdG9yVW5jYWNoZWQgPSBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgdmFyIGl0ZXJhdG9yID0gaXRlcmFibGUuX19pdGVyYXRvcih0eXBlLCByZXZlcnNlKTtcbiAgICB2YXIgc3RhY2sgPSBbXTtcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICB3aGlsZSAoaXRlcmF0b3IpIHtcbiAgICAgICAgdmFyIHN0ZXAgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIGlmIChzdGVwLmRvbmUgIT09IGZhbHNlKSB7XG4gICAgICAgICAgaXRlcmF0b3IgPSBzdGFjay5wb3AoKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdiA9IHN0ZXAudmFsdWU7XG4gICAgICAgIGlmICh0eXBlID09PSBJVEVSQVRFX0VOVFJJRVMpIHtcbiAgICAgICAgICB2ID0gdlsxXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoKCFkZXB0aCB8fCBzdGFjay5sZW5ndGggPCBkZXB0aCkgJiYgaXNJdGVyYWJsZSh2KSkge1xuICAgICAgICAgIHN0YWNrLnB1c2goaXRlcmF0b3IpO1xuICAgICAgICAgIGl0ZXJhdG9yID0gdi5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB1c2VLZXlzID8gc3RlcCA6IGl0ZXJhdG9yVmFsdWUodHlwZSwgaXRlcmF0aW9ucysrLCB2LCBzdGVwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGl0ZXJhdG9yRG9uZSgpO1xuICAgIH0pKTtcbiAgfTtcbiAgcmV0dXJuIGZsYXRTZXF1ZW5jZTtcbn1cbmZ1bmN0aW9uIGZsYXRNYXBGYWN0b3J5KGl0ZXJhYmxlLCBtYXBwZXIsIGNvbnRleHQpIHtcbiAgdmFyIGNvZXJjZSA9IGl0ZXJhYmxlQ2xhc3MoaXRlcmFibGUpO1xuICByZXR1cm4gaXRlcmFibGUudG9TZXEoKS5tYXAoKGZ1bmN0aW9uKHYsIGspIHtcbiAgICByZXR1cm4gY29lcmNlKG1hcHBlci5jYWxsKGNvbnRleHQsIHYsIGssIGl0ZXJhYmxlKSk7XG4gIH0pKS5mbGF0dGVuKHRydWUpO1xufVxuZnVuY3Rpb24gaW50ZXJwb3NlRmFjdG9yeShpdGVyYWJsZSwgc2VwYXJhdG9yKSB7XG4gIHZhciBpbnRlcnBvc2VkU2VxdWVuY2UgPSBtYWtlU2VxdWVuY2UoaXRlcmFibGUpO1xuICBpbnRlcnBvc2VkU2VxdWVuY2Uuc2l6ZSA9IGl0ZXJhYmxlLnNpemUgJiYgaXRlcmFibGUuc2l6ZSAqIDIgLSAxO1xuICBpbnRlcnBvc2VkU2VxdWVuY2UuX19pdGVyYXRlVW5jYWNoZWQgPSBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgaXRlcmFibGUuX19pdGVyYXRlKChmdW5jdGlvbih2LCBrKSB7XG4gICAgICByZXR1cm4gKCFpdGVyYXRpb25zIHx8IGZuKHNlcGFyYXRvciwgaXRlcmF0aW9ucysrLCAkX18wKSAhPT0gZmFsc2UpICYmIGZuKHYsIGl0ZXJhdGlvbnMrKywgJF9fMCkgIT09IGZhbHNlO1xuICAgIH0pLCByZXZlcnNlKTtcbiAgICByZXR1cm4gaXRlcmF0aW9ucztcbiAgfTtcbiAgaW50ZXJwb3NlZFNlcXVlbmNlLl9faXRlcmF0b3JVbmNhY2hlZCA9IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICB2YXIgaXRlcmF0b3IgPSBpdGVyYWJsZS5fX2l0ZXJhdG9yKElURVJBVEVfVkFMVUVTLCByZXZlcnNlKTtcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgdmFyIHN0ZXA7XG4gICAgcmV0dXJuIG5ldyBJdGVyYXRvcigoZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoIXN0ZXAgfHwgaXRlcmF0aW9ucyAlIDIpIHtcbiAgICAgICAgc3RlcCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgaWYgKHN0ZXAuZG9uZSkge1xuICAgICAgICAgIHJldHVybiBzdGVwO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaXRlcmF0aW9ucyAlIDIgPyBpdGVyYXRvclZhbHVlKHR5cGUsIGl0ZXJhdGlvbnMrKywgc2VwYXJhdG9yKSA6IGl0ZXJhdG9yVmFsdWUodHlwZSwgaXRlcmF0aW9ucysrLCBzdGVwLnZhbHVlLCBzdGVwKTtcbiAgICB9KSk7XG4gIH07XG4gIHJldHVybiBpbnRlcnBvc2VkU2VxdWVuY2U7XG59XG5mdW5jdGlvbiByZWlmeShpdGVyLCBzZXEpIHtcbiAgcmV0dXJuIGlzU2VxKGl0ZXIpID8gc2VxIDogaXRlci5jb25zdHJ1Y3RvcihzZXEpO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVFbnRyeShlbnRyeSkge1xuICBpZiAoZW50cnkgIT09IE9iamVjdChlbnRyeSkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFeHBlY3RlZCBbSywgVl0gdHVwbGU6ICcgKyBlbnRyeSk7XG4gIH1cbn1cbmZ1bmN0aW9uIHJlc29sdmVTaXplKGl0ZXIpIHtcbiAgYXNzZXJ0Tm90SW5maW5pdGUoaXRlci5zaXplKTtcbiAgcmV0dXJuIGVuc3VyZVNpemUoaXRlcik7XG59XG5mdW5jdGlvbiBpdGVyYWJsZUNsYXNzKGl0ZXJhYmxlKSB7XG4gIHJldHVybiBpc0tleWVkKGl0ZXJhYmxlKSA/IEtleWVkSXRlcmFibGUgOiBpc0luZGV4ZWQoaXRlcmFibGUpID8gSW5kZXhlZEl0ZXJhYmxlIDogU2V0SXRlcmFibGU7XG59XG5mdW5jdGlvbiBtYWtlU2VxdWVuY2UoaXRlcmFibGUpIHtcbiAgcmV0dXJuIE9iamVjdC5jcmVhdGUoKGlzS2V5ZWQoaXRlcmFibGUpID8gS2V5ZWRTZXEgOiBpc0luZGV4ZWQoaXRlcmFibGUpID8gSW5kZXhlZFNlcSA6IFNldFNlcSkucHJvdG90eXBlKTtcbn1cbmZ1bmN0aW9uIGNhY2hlUmVzdWx0VGhyb3VnaCgpIHtcbiAgaWYgKHRoaXMuX2l0ZXIuY2FjaGVSZXN1bHQpIHtcbiAgICB0aGlzLl9pdGVyLmNhY2hlUmVzdWx0KCk7XG4gICAgdGhpcy5zaXplID0gdGhpcy5faXRlci5zaXplO1xuICAgIHJldHVybiB0aGlzO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBTZXEucHJvdG90eXBlLmNhY2hlUmVzdWx0LmNhbGwodGhpcyk7XG4gIH1cbn1cbnZhciBMaXN0ID0gZnVuY3Rpb24gTGlzdCh2YWx1ZSkge1xuICB2YXIgZW1wdHkgPSBlbXB0eUxpc3QoKTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gZW1wdHk7XG4gIH1cbiAgaWYgKHZhbHVlICYmIHZhbHVlLmNvbnN0cnVjdG9yID09PSAkTGlzdCkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICB2YWx1ZSA9IEl0ZXJhYmxlKHZhbHVlKTtcbiAgdmFyIHNpemUgPSB2YWx1ZS5zaXplO1xuICBpZiAoc2l6ZSA9PT0gMCkge1xuICAgIHJldHVybiBlbXB0eTtcbiAgfVxuICBpZiAoc2l6ZSA+IDAgJiYgc2l6ZSA8IFNJWkUpIHtcbiAgICByZXR1cm4gbWFrZUxpc3QoMCwgc2l6ZSwgU0hJRlQsIG51bGwsIG5ldyBWTm9kZSh2YWx1ZS50b0FycmF5KCkpKTtcbiAgfVxuICByZXR1cm4gZW1wdHkubWVyZ2UodmFsdWUpO1xufTtcbnZhciAkTGlzdCA9IExpc3Q7XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShMaXN0LCB7XG4gIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fX3RvU3RyaW5nKCdMaXN0IFsnLCAnXScpO1xuICB9LFxuICBnZXQ6IGZ1bmN0aW9uKGluZGV4LCBub3RTZXRWYWx1ZSkge1xuICAgIGluZGV4ID0gd3JhcEluZGV4KHRoaXMsIGluZGV4KTtcbiAgICBpZiAoaW5kZXggPCAwIHx8IGluZGV4ID49IHRoaXMuc2l6ZSkge1xuICAgICAgcmV0dXJuIG5vdFNldFZhbHVlO1xuICAgIH1cbiAgICBpbmRleCArPSB0aGlzLl9vcmlnaW47XG4gICAgdmFyIG5vZGUgPSBsaXN0Tm9kZUZvcih0aGlzLCBpbmRleCk7XG4gICAgcmV0dXJuIG5vZGUgJiYgbm9kZS5hcnJheVtpbmRleCAmIE1BU0tdO1xuICB9LFxuICBzZXQ6IGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuICAgIHJldHVybiB1cGRhdGVMaXN0KHRoaXMsIGluZGV4LCB2YWx1ZSk7XG4gIH0sXG4gIHJlbW92ZTogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICByZXR1cm4gIXRoaXMuaGFzKGluZGV4KSA/IHRoaXMgOiBpbmRleCA9PT0gMCA/IHRoaXMuc2hpZnQoKSA6IGluZGV4ID09PSB0aGlzLnNpemUgLSAxID8gdGhpcy5wb3AoKSA6IHRoaXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgfSxcbiAgY2xlYXI6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnNpemUgPT09IDApIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBpZiAodGhpcy5fX293bmVySUQpIHtcbiAgICAgIHRoaXMuc2l6ZSA9IHRoaXMuX29yaWdpbiA9IHRoaXMuX2NhcGFjaXR5ID0gMDtcbiAgICAgIHRoaXMuX2xldmVsID0gU0hJRlQ7XG4gICAgICB0aGlzLl9yb290ID0gdGhpcy5fdGFpbCA9IG51bGw7XG4gICAgICB0aGlzLl9faGFzaCA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuX19hbHRlcmVkID0gdHJ1ZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gZW1wdHlMaXN0KCk7XG4gIH0sXG4gIHB1c2g6IGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZXMgPSBhcmd1bWVudHM7XG4gICAgdmFyIG9sZFNpemUgPSB0aGlzLnNpemU7XG4gICAgcmV0dXJuIHRoaXMud2l0aE11dGF0aW9ucygoZnVuY3Rpb24obGlzdCkge1xuICAgICAgc2V0TGlzdEJvdW5kcyhsaXN0LCAwLCBvbGRTaXplICsgdmFsdWVzLmxlbmd0aCk7XG4gICAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgdmFsdWVzLmxlbmd0aDsgaWkrKykge1xuICAgICAgICBsaXN0LnNldChvbGRTaXplICsgaWksIHZhbHVlc1tpaV0pO1xuICAgICAgfVxuICAgIH0pKTtcbiAgfSxcbiAgcG9wOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gc2V0TGlzdEJvdW5kcyh0aGlzLCAwLCAtMSk7XG4gIH0sXG4gIHVuc2hpZnQ6IGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZXMgPSBhcmd1bWVudHM7XG4gICAgcmV0dXJuIHRoaXMud2l0aE11dGF0aW9ucygoZnVuY3Rpb24obGlzdCkge1xuICAgICAgc2V0TGlzdEJvdW5kcyhsaXN0LCAtdmFsdWVzLmxlbmd0aCk7XG4gICAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgdmFsdWVzLmxlbmd0aDsgaWkrKykge1xuICAgICAgICBsaXN0LnNldChpaSwgdmFsdWVzW2lpXSk7XG4gICAgICB9XG4gICAgfSkpO1xuICB9LFxuICBzaGlmdDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHNldExpc3RCb3VuZHModGhpcywgMSk7XG4gIH0sXG4gIG1lcmdlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbWVyZ2VJbnRvTGlzdFdpdGgodGhpcywgdW5kZWZpbmVkLCBhcmd1bWVudHMpO1xuICB9LFxuICBtZXJnZVdpdGg6IGZ1bmN0aW9uKG1lcmdlcikge1xuICAgIGZvciAodmFyIGl0ZXJzID0gW10sXG4gICAgICAgICRfXzYgPSAxOyAkX182IDwgYXJndW1lbnRzLmxlbmd0aDsgJF9fNisrKVxuICAgICAgaXRlcnNbJF9fNiAtIDFdID0gYXJndW1lbnRzWyRfXzZdO1xuICAgIHJldHVybiBtZXJnZUludG9MaXN0V2l0aCh0aGlzLCBtZXJnZXIsIGl0ZXJzKTtcbiAgfSxcbiAgbWVyZ2VEZWVwOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbWVyZ2VJbnRvTGlzdFdpdGgodGhpcywgZGVlcE1lcmdlcih1bmRlZmluZWQpLCBhcmd1bWVudHMpO1xuICB9LFxuICBtZXJnZURlZXBXaXRoOiBmdW5jdGlvbihtZXJnZXIpIHtcbiAgICBmb3IgKHZhciBpdGVycyA9IFtdLFxuICAgICAgICAkX183ID0gMTsgJF9fNyA8IGFyZ3VtZW50cy5sZW5ndGg7ICRfXzcrKylcbiAgICAgIGl0ZXJzWyRfXzcgLSAxXSA9IGFyZ3VtZW50c1skX183XTtcbiAgICByZXR1cm4gbWVyZ2VJbnRvTGlzdFdpdGgodGhpcywgZGVlcE1lcmdlcihtZXJnZXIpLCBpdGVycyk7XG4gIH0sXG4gIHNldFNpemU6IGZ1bmN0aW9uKHNpemUpIHtcbiAgICByZXR1cm4gc2V0TGlzdEJvdW5kcyh0aGlzLCAwLCBzaXplKTtcbiAgfSxcbiAgc2xpY2U6IGZ1bmN0aW9uKGJlZ2luLCBlbmQpIHtcbiAgICB2YXIgc2l6ZSA9IHRoaXMuc2l6ZTtcbiAgICBpZiAod2hvbGVTbGljZShiZWdpbiwgZW5kLCBzaXplKSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBzZXRMaXN0Qm91bmRzKHRoaXMsIHJlc29sdmVCZWdpbihiZWdpbiwgc2l6ZSksIHJlc29sdmVFbmQoZW5kLCBzaXplKSk7XG4gIH0sXG4gIF9faXRlcmF0b3I6IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICByZXR1cm4gbmV3IExpc3RJdGVyYXRvcih0aGlzLCB0eXBlLCByZXZlcnNlKTtcbiAgfSxcbiAgX19pdGVyYXRlOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgdmFyIGVhY2hGbiA9IChmdW5jdGlvbih2KSB7XG4gICAgICByZXR1cm4gZm4odiwgaXRlcmF0aW9ucysrLCAkX18wKTtcbiAgICB9KTtcbiAgICB2YXIgdGFpbE9mZnNldCA9IGdldFRhaWxPZmZzZXQodGhpcy5fY2FwYWNpdHkpO1xuICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICBpdGVyYXRlVk5vZGUodGhpcy5fdGFpbCwgMCwgdGFpbE9mZnNldCAtIHRoaXMuX29yaWdpbiwgdGhpcy5fY2FwYWNpdHkgLSB0aGlzLl9vcmlnaW4sIGVhY2hGbiwgcmV2ZXJzZSkgJiYgaXRlcmF0ZVZOb2RlKHRoaXMuX3Jvb3QsIHRoaXMuX2xldmVsLCAtdGhpcy5fb3JpZ2luLCB0YWlsT2Zmc2V0IC0gdGhpcy5fb3JpZ2luLCBlYWNoRm4sIHJldmVyc2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpdGVyYXRlVk5vZGUodGhpcy5fcm9vdCwgdGhpcy5fbGV2ZWwsIC10aGlzLl9vcmlnaW4sIHRhaWxPZmZzZXQgLSB0aGlzLl9vcmlnaW4sIGVhY2hGbiwgcmV2ZXJzZSkgJiYgaXRlcmF0ZVZOb2RlKHRoaXMuX3RhaWwsIDAsIHRhaWxPZmZzZXQgLSB0aGlzLl9vcmlnaW4sIHRoaXMuX2NhcGFjaXR5IC0gdGhpcy5fb3JpZ2luLCBlYWNoRm4sIHJldmVyc2UpO1xuICAgIH1cbiAgICByZXR1cm4gaXRlcmF0aW9ucztcbiAgfSxcbiAgX19lbnN1cmVPd25lcjogZnVuY3Rpb24ob3duZXJJRCkge1xuICAgIGlmIChvd25lcklEID09PSB0aGlzLl9fb3duZXJJRCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGlmICghb3duZXJJRCkge1xuICAgICAgdGhpcy5fX293bmVySUQgPSBvd25lcklEO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBtYWtlTGlzdCh0aGlzLl9vcmlnaW4sIHRoaXMuX2NhcGFjaXR5LCB0aGlzLl9sZXZlbCwgdGhpcy5fcm9vdCwgdGhpcy5fdGFpbCwgb3duZXJJRCwgdGhpcy5fX2hhc2gpO1xuICB9XG59LCB7b2Y6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzKGFyZ3VtZW50cyk7XG4gIH19LCBJbmRleGVkQ29sbGVjdGlvbik7XG5mdW5jdGlvbiBpc0xpc3QobWF5YmVMaXN0KSB7XG4gIHJldHVybiAhIShtYXliZUxpc3QgJiYgbWF5YmVMaXN0W0lTX0xJU1RfU0VOVElORUxdKTtcbn1cbkxpc3QuaXNMaXN0ID0gaXNMaXN0O1xudmFyIElTX0xJU1RfU0VOVElORUwgPSAnQEBfX0lNTVVUQUJMRV9MSVNUX19AQCc7XG52YXIgTGlzdFByb3RvdHlwZSA9IExpc3QucHJvdG90eXBlO1xuTGlzdFByb3RvdHlwZVtJU19MSVNUX1NFTlRJTkVMXSA9IHRydWU7XG5MaXN0UHJvdG90eXBlW0RFTEVURV0gPSBMaXN0UHJvdG90eXBlLnJlbW92ZTtcbkxpc3RQcm90b3R5cGUuc2V0SW4gPSBNYXBQcm90b3R5cGUuc2V0SW47XG5MaXN0UHJvdG90eXBlLnJlbW92ZUluID0gTWFwUHJvdG90eXBlLnJlbW92ZUluO1xuTGlzdFByb3RvdHlwZS51cGRhdGUgPSBNYXBQcm90b3R5cGUudXBkYXRlO1xuTGlzdFByb3RvdHlwZS51cGRhdGVJbiA9IE1hcFByb3RvdHlwZS51cGRhdGVJbjtcbkxpc3RQcm90b3R5cGUud2l0aE11dGF0aW9ucyA9IE1hcFByb3RvdHlwZS53aXRoTXV0YXRpb25zO1xuTGlzdFByb3RvdHlwZS5hc011dGFibGUgPSBNYXBQcm90b3R5cGUuYXNNdXRhYmxlO1xuTGlzdFByb3RvdHlwZS5hc0ltbXV0YWJsZSA9IE1hcFByb3RvdHlwZS5hc0ltbXV0YWJsZTtcbkxpc3RQcm90b3R5cGUud2FzQWx0ZXJlZCA9IE1hcFByb3RvdHlwZS53YXNBbHRlcmVkO1xudmFyIFZOb2RlID0gZnVuY3Rpb24gVk5vZGUoYXJyYXksIG93bmVySUQpIHtcbiAgdGhpcy5hcnJheSA9IGFycmF5O1xuICB0aGlzLm93bmVySUQgPSBvd25lcklEO1xufTtcbnZhciAkVk5vZGUgPSBWTm9kZTtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFZOb2RlLCB7XG4gIHJlbW92ZUJlZm9yZTogZnVuY3Rpb24ob3duZXJJRCwgbGV2ZWwsIGluZGV4KSB7XG4gICAgaWYgKGluZGV4ID09PSBsZXZlbCA/IDEgPDwgbGV2ZWwgOiAwIHx8IHRoaXMuYXJyYXkubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdmFyIG9yaWdpbkluZGV4ID0gKGluZGV4ID4+PiBsZXZlbCkgJiBNQVNLO1xuICAgIGlmIChvcmlnaW5JbmRleCA+PSB0aGlzLmFycmF5Lmxlbmd0aCkge1xuICAgICAgcmV0dXJuIG5ldyAkVk5vZGUoW10sIG93bmVySUQpO1xuICAgIH1cbiAgICB2YXIgcmVtb3ZpbmdGaXJzdCA9IG9yaWdpbkluZGV4ID09PSAwO1xuICAgIHZhciBuZXdDaGlsZDtcbiAgICBpZiAobGV2ZWwgPiAwKSB7XG4gICAgICB2YXIgb2xkQ2hpbGQgPSB0aGlzLmFycmF5W29yaWdpbkluZGV4XTtcbiAgICAgIG5ld0NoaWxkID0gb2xkQ2hpbGQgJiYgb2xkQ2hpbGQucmVtb3ZlQmVmb3JlKG93bmVySUQsIGxldmVsIC0gU0hJRlQsIGluZGV4KTtcbiAgICAgIGlmIChuZXdDaGlsZCA9PT0gb2xkQ2hpbGQgJiYgcmVtb3ZpbmdGaXJzdCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHJlbW92aW5nRmlyc3QgJiYgIW5ld0NoaWxkKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdmFyIGVkaXRhYmxlID0gZWRpdGFibGVWTm9kZSh0aGlzLCBvd25lcklEKTtcbiAgICBpZiAoIXJlbW92aW5nRmlyc3QpIHtcbiAgICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBvcmlnaW5JbmRleDsgaWkrKykge1xuICAgICAgICBlZGl0YWJsZS5hcnJheVtpaV0gPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChuZXdDaGlsZCkge1xuICAgICAgZWRpdGFibGUuYXJyYXlbb3JpZ2luSW5kZXhdID0gbmV3Q2hpbGQ7XG4gICAgfVxuICAgIHJldHVybiBlZGl0YWJsZTtcbiAgfSxcbiAgcmVtb3ZlQWZ0ZXI6IGZ1bmN0aW9uKG93bmVySUQsIGxldmVsLCBpbmRleCkge1xuICAgIGlmIChpbmRleCA9PT0gbGV2ZWwgPyAxIDw8IGxldmVsIDogMCB8fCB0aGlzLmFycmF5Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciBzaXplSW5kZXggPSAoKGluZGV4IC0gMSkgPj4+IGxldmVsKSAmIE1BU0s7XG4gICAgaWYgKHNpemVJbmRleCA+PSB0aGlzLmFycmF5Lmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciByZW1vdmluZ0xhc3QgPSBzaXplSW5kZXggPT09IHRoaXMuYXJyYXkubGVuZ3RoIC0gMTtcbiAgICB2YXIgbmV3Q2hpbGQ7XG4gICAgaWYgKGxldmVsID4gMCkge1xuICAgICAgdmFyIG9sZENoaWxkID0gdGhpcy5hcnJheVtzaXplSW5kZXhdO1xuICAgICAgbmV3Q2hpbGQgPSBvbGRDaGlsZCAmJiBvbGRDaGlsZC5yZW1vdmVBZnRlcihvd25lcklELCBsZXZlbCAtIFNISUZULCBpbmRleCk7XG4gICAgICBpZiAobmV3Q2hpbGQgPT09IG9sZENoaWxkICYmIHJlbW92aW5nTGFzdCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHJlbW92aW5nTGFzdCAmJiAhbmV3Q2hpbGQpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgZWRpdGFibGUgPSBlZGl0YWJsZVZOb2RlKHRoaXMsIG93bmVySUQpO1xuICAgIGlmICghcmVtb3ZpbmdMYXN0KSB7XG4gICAgICBlZGl0YWJsZS5hcnJheS5wb3AoKTtcbiAgICB9XG4gICAgaWYgKG5ld0NoaWxkKSB7XG4gICAgICBlZGl0YWJsZS5hcnJheVtzaXplSW5kZXhdID0gbmV3Q2hpbGQ7XG4gICAgfVxuICAgIHJldHVybiBlZGl0YWJsZTtcbiAgfVxufSwge30pO1xuZnVuY3Rpb24gaXRlcmF0ZVZOb2RlKG5vZGUsIGxldmVsLCBvZmZzZXQsIG1heCwgZm4sIHJldmVyc2UpIHtcbiAgdmFyIGlpO1xuICB2YXIgYXJyYXkgPSBub2RlICYmIG5vZGUuYXJyYXk7XG4gIGlmIChsZXZlbCA9PT0gMCkge1xuICAgIHZhciBmcm9tID0gb2Zmc2V0IDwgMCA/IC1vZmZzZXQgOiAwO1xuICAgIHZhciB0byA9IG1heCAtIG9mZnNldDtcbiAgICBpZiAodG8gPiBTSVpFKSB7XG4gICAgICB0byA9IFNJWkU7XG4gICAgfVxuICAgIGZvciAoaWkgPSBmcm9tOyBpaSA8IHRvOyBpaSsrKSB7XG4gICAgICBpZiAoZm4oYXJyYXkgJiYgYXJyYXlbcmV2ZXJzZSA/IGZyb20gKyB0byAtIDEgLSBpaSA6IGlpXSkgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFyIHN0ZXAgPSAxIDw8IGxldmVsO1xuICAgIHZhciBuZXdMZXZlbCA9IGxldmVsIC0gU0hJRlQ7XG4gICAgZm9yIChpaSA9IDA7IGlpIDw9IE1BU0s7IGlpKyspIHtcbiAgICAgIHZhciBsZXZlbEluZGV4ID0gcmV2ZXJzZSA/IE1BU0sgLSBpaSA6IGlpO1xuICAgICAgdmFyIG5ld09mZnNldCA9IG9mZnNldCArIChsZXZlbEluZGV4IDw8IGxldmVsKTtcbiAgICAgIGlmIChuZXdPZmZzZXQgPCBtYXggJiYgbmV3T2Zmc2V0ICsgc3RlcCA+IDApIHtcbiAgICAgICAgdmFyIG5leHROb2RlID0gYXJyYXkgJiYgYXJyYXlbbGV2ZWxJbmRleF07XG4gICAgICAgIGlmICghaXRlcmF0ZVZOb2RlKG5leHROb2RlLCBuZXdMZXZlbCwgbmV3T2Zmc2V0LCBtYXgsIGZuLCByZXZlcnNlKSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cbnZhciBMaXN0SXRlcmF0b3IgPSBmdW5jdGlvbiBMaXN0SXRlcmF0b3IobGlzdCwgdHlwZSwgcmV2ZXJzZSkge1xuICB0aGlzLl90eXBlID0gdHlwZTtcbiAgdGhpcy5fcmV2ZXJzZSA9ICEhcmV2ZXJzZTtcbiAgdGhpcy5fbWF4SW5kZXggPSBsaXN0LnNpemUgLSAxO1xuICB2YXIgdGFpbE9mZnNldCA9IGdldFRhaWxPZmZzZXQobGlzdC5fY2FwYWNpdHkpO1xuICB2YXIgcm9vdFN0YWNrID0gbGlzdEl0ZXJhdG9yRnJhbWUobGlzdC5fcm9vdCAmJiBsaXN0Ll9yb290LmFycmF5LCBsaXN0Ll9sZXZlbCwgLWxpc3QuX29yaWdpbiwgdGFpbE9mZnNldCAtIGxpc3QuX29yaWdpbiAtIDEpO1xuICB2YXIgdGFpbFN0YWNrID0gbGlzdEl0ZXJhdG9yRnJhbWUobGlzdC5fdGFpbCAmJiBsaXN0Ll90YWlsLmFycmF5LCAwLCB0YWlsT2Zmc2V0IC0gbGlzdC5fb3JpZ2luLCBsaXN0Ll9jYXBhY2l0eSAtIGxpc3QuX29yaWdpbiAtIDEpO1xuICB0aGlzLl9zdGFjayA9IHJldmVyc2UgPyB0YWlsU3RhY2sgOiByb290U3RhY2s7XG4gIHRoaXMuX3N0YWNrLl9fcHJldiA9IHJldmVyc2UgPyByb290U3RhY2sgOiB0YWlsU3RhY2s7XG59O1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoTGlzdEl0ZXJhdG9yLCB7bmV4dDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHN0YWNrID0gdGhpcy5fc3RhY2s7XG4gICAgd2hpbGUgKHN0YWNrKSB7XG4gICAgICB2YXIgYXJyYXkgPSBzdGFjay5hcnJheTtcbiAgICAgIHZhciByYXdJbmRleCA9IHN0YWNrLmluZGV4Kys7XG4gICAgICBpZiAodGhpcy5fcmV2ZXJzZSkge1xuICAgICAgICByYXdJbmRleCA9IE1BU0sgLSByYXdJbmRleDtcbiAgICAgICAgaWYgKHJhd0luZGV4ID4gc3RhY2sucmF3TWF4KSB7XG4gICAgICAgICAgcmF3SW5kZXggPSBzdGFjay5yYXdNYXg7XG4gICAgICAgICAgc3RhY2suaW5kZXggPSBTSVpFIC0gcmF3SW5kZXg7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChyYXdJbmRleCA+PSAwICYmIHJhd0luZGV4IDwgU0laRSAmJiByYXdJbmRleCA8PSBzdGFjay5yYXdNYXgpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gYXJyYXkgJiYgYXJyYXlbcmF3SW5kZXhdO1xuICAgICAgICBpZiAoc3RhY2subGV2ZWwgPT09IDApIHtcbiAgICAgICAgICB2YXIgdHlwZSA9IHRoaXMuX3R5cGU7XG4gICAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICAgIGlmICh0eXBlICE9PSAxKSB7XG4gICAgICAgICAgICBpbmRleCA9IHN0YWNrLm9mZnNldCArIChyYXdJbmRleCA8PCBzdGFjay5sZXZlbCk7XG4gICAgICAgICAgICBpZiAodGhpcy5fcmV2ZXJzZSkge1xuICAgICAgICAgICAgICBpbmRleCA9IHRoaXMuX21heEluZGV4IC0gaW5kZXg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBpdGVyYXRvclZhbHVlKHR5cGUsIGluZGV4LCB2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fc3RhY2sgPSBzdGFjayA9IGxpc3RJdGVyYXRvckZyYW1lKHZhbHVlICYmIHZhbHVlLmFycmF5LCBzdGFjay5sZXZlbCAtIFNISUZULCBzdGFjay5vZmZzZXQgKyAocmF3SW5kZXggPDwgc3RhY2subGV2ZWwpLCBzdGFjay5tYXgsIHN0YWNrKTtcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHN0YWNrID0gdGhpcy5fc3RhY2sgPSB0aGlzLl9zdGFjay5fX3ByZXY7XG4gICAgfVxuICAgIHJldHVybiBpdGVyYXRvckRvbmUoKTtcbiAgfX0sIHt9LCBJdGVyYXRvcik7XG5mdW5jdGlvbiBsaXN0SXRlcmF0b3JGcmFtZShhcnJheSwgbGV2ZWwsIG9mZnNldCwgbWF4LCBwcmV2RnJhbWUpIHtcbiAgcmV0dXJuIHtcbiAgICBhcnJheTogYXJyYXksXG4gICAgbGV2ZWw6IGxldmVsLFxuICAgIG9mZnNldDogb2Zmc2V0LFxuICAgIG1heDogbWF4LFxuICAgIHJhd01heDogKChtYXggLSBvZmZzZXQpID4+IGxldmVsKSxcbiAgICBpbmRleDogMCxcbiAgICBfX3ByZXY6IHByZXZGcmFtZVxuICB9O1xufVxuZnVuY3Rpb24gbWFrZUxpc3Qob3JpZ2luLCBjYXBhY2l0eSwgbGV2ZWwsIHJvb3QsIHRhaWwsIG93bmVySUQsIGhhc2gpIHtcbiAgdmFyIGxpc3QgPSBPYmplY3QuY3JlYXRlKExpc3RQcm90b3R5cGUpO1xuICBsaXN0LnNpemUgPSBjYXBhY2l0eSAtIG9yaWdpbjtcbiAgbGlzdC5fb3JpZ2luID0gb3JpZ2luO1xuICBsaXN0Ll9jYXBhY2l0eSA9IGNhcGFjaXR5O1xuICBsaXN0Ll9sZXZlbCA9IGxldmVsO1xuICBsaXN0Ll9yb290ID0gcm9vdDtcbiAgbGlzdC5fdGFpbCA9IHRhaWw7XG4gIGxpc3QuX19vd25lcklEID0gb3duZXJJRDtcbiAgbGlzdC5fX2hhc2ggPSBoYXNoO1xuICBsaXN0Ll9fYWx0ZXJlZCA9IGZhbHNlO1xuICByZXR1cm4gbGlzdDtcbn1cbnZhciBFTVBUWV9MSVNUO1xuZnVuY3Rpb24gZW1wdHlMaXN0KCkge1xuICByZXR1cm4gRU1QVFlfTElTVCB8fCAoRU1QVFlfTElTVCA9IG1ha2VMaXN0KDAsIDAsIFNISUZUKSk7XG59XG5mdW5jdGlvbiB1cGRhdGVMaXN0KGxpc3QsIGluZGV4LCB2YWx1ZSkge1xuICBpbmRleCA9IHdyYXBJbmRleChsaXN0LCBpbmRleCk7XG4gIGlmIChpbmRleCA+PSBsaXN0LnNpemUgfHwgaW5kZXggPCAwKSB7XG4gICAgcmV0dXJuIGxpc3Qud2l0aE11dGF0aW9ucygoZnVuY3Rpb24obGlzdCkge1xuICAgICAgaW5kZXggPCAwID8gc2V0TGlzdEJvdW5kcyhsaXN0LCBpbmRleCkuc2V0KDAsIHZhbHVlKSA6IHNldExpc3RCb3VuZHMobGlzdCwgMCwgaW5kZXggKyAxKS5zZXQoaW5kZXgsIHZhbHVlKTtcbiAgICB9KSk7XG4gIH1cbiAgaW5kZXggKz0gbGlzdC5fb3JpZ2luO1xuICB2YXIgbmV3VGFpbCA9IGxpc3QuX3RhaWw7XG4gIHZhciBuZXdSb290ID0gbGlzdC5fcm9vdDtcbiAgdmFyIGRpZEFsdGVyID0gTWFrZVJlZihESURfQUxURVIpO1xuICBpZiAoaW5kZXggPj0gZ2V0VGFpbE9mZnNldChsaXN0Ll9jYXBhY2l0eSkpIHtcbiAgICBuZXdUYWlsID0gdXBkYXRlVk5vZGUobmV3VGFpbCwgbGlzdC5fX293bmVySUQsIDAsIGluZGV4LCB2YWx1ZSwgZGlkQWx0ZXIpO1xuICB9IGVsc2Uge1xuICAgIG5ld1Jvb3QgPSB1cGRhdGVWTm9kZShuZXdSb290LCBsaXN0Ll9fb3duZXJJRCwgbGlzdC5fbGV2ZWwsIGluZGV4LCB2YWx1ZSwgZGlkQWx0ZXIpO1xuICB9XG4gIGlmICghZGlkQWx0ZXIudmFsdWUpIHtcbiAgICByZXR1cm4gbGlzdDtcbiAgfVxuICBpZiAobGlzdC5fX293bmVySUQpIHtcbiAgICBsaXN0Ll9yb290ID0gbmV3Um9vdDtcbiAgICBsaXN0Ll90YWlsID0gbmV3VGFpbDtcbiAgICBsaXN0Ll9faGFzaCA9IHVuZGVmaW5lZDtcbiAgICBsaXN0Ll9fYWx0ZXJlZCA9IHRydWU7XG4gICAgcmV0dXJuIGxpc3Q7XG4gIH1cbiAgcmV0dXJuIG1ha2VMaXN0KGxpc3QuX29yaWdpbiwgbGlzdC5fY2FwYWNpdHksIGxpc3QuX2xldmVsLCBuZXdSb290LCBuZXdUYWlsKTtcbn1cbmZ1bmN0aW9uIHVwZGF0ZVZOb2RlKG5vZGUsIG93bmVySUQsIGxldmVsLCBpbmRleCwgdmFsdWUsIGRpZEFsdGVyKSB7XG4gIHZhciBpZHggPSAoaW5kZXggPj4+IGxldmVsKSAmIE1BU0s7XG4gIHZhciBub2RlSGFzID0gbm9kZSAmJiBpZHggPCBub2RlLmFycmF5Lmxlbmd0aDtcbiAgaWYgKCFub2RlSGFzICYmIHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuICB2YXIgbmV3Tm9kZTtcbiAgaWYgKGxldmVsID4gMCkge1xuICAgIHZhciBsb3dlck5vZGUgPSBub2RlICYmIG5vZGUuYXJyYXlbaWR4XTtcbiAgICB2YXIgbmV3TG93ZXJOb2RlID0gdXBkYXRlVk5vZGUobG93ZXJOb2RlLCBvd25lcklELCBsZXZlbCAtIFNISUZULCBpbmRleCwgdmFsdWUsIGRpZEFsdGVyKTtcbiAgICBpZiAobmV3TG93ZXJOb2RlID09PSBsb3dlck5vZGUpIHtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgICBuZXdOb2RlID0gZWRpdGFibGVWTm9kZShub2RlLCBvd25lcklEKTtcbiAgICBuZXdOb2RlLmFycmF5W2lkeF0gPSBuZXdMb3dlck5vZGU7XG4gICAgcmV0dXJuIG5ld05vZGU7XG4gIH1cbiAgaWYgKG5vZGVIYXMgJiYgbm9kZS5hcnJheVtpZHhdID09PSB2YWx1ZSkge1xuICAgIHJldHVybiBub2RlO1xuICB9XG4gIFNldFJlZihkaWRBbHRlcik7XG4gIG5ld05vZGUgPSBlZGl0YWJsZVZOb2RlKG5vZGUsIG93bmVySUQpO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCAmJiBpZHggPT09IG5ld05vZGUuYXJyYXkubGVuZ3RoIC0gMSkge1xuICAgIG5ld05vZGUuYXJyYXkucG9wKCk7XG4gIH0gZWxzZSB7XG4gICAgbmV3Tm9kZS5hcnJheVtpZHhdID0gdmFsdWU7XG4gIH1cbiAgcmV0dXJuIG5ld05vZGU7XG59XG5mdW5jdGlvbiBlZGl0YWJsZVZOb2RlKG5vZGUsIG93bmVySUQpIHtcbiAgaWYgKG93bmVySUQgJiYgbm9kZSAmJiBvd25lcklEID09PSBub2RlLm93bmVySUQpIHtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuICByZXR1cm4gbmV3IFZOb2RlKG5vZGUgPyBub2RlLmFycmF5LnNsaWNlKCkgOiBbXSwgb3duZXJJRCk7XG59XG5mdW5jdGlvbiBsaXN0Tm9kZUZvcihsaXN0LCByYXdJbmRleCkge1xuICBpZiAocmF3SW5kZXggPj0gZ2V0VGFpbE9mZnNldChsaXN0Ll9jYXBhY2l0eSkpIHtcbiAgICByZXR1cm4gbGlzdC5fdGFpbDtcbiAgfVxuICBpZiAocmF3SW5kZXggPCAxIDw8IChsaXN0Ll9sZXZlbCArIFNISUZUKSkge1xuICAgIHZhciBub2RlID0gbGlzdC5fcm9vdDtcbiAgICB2YXIgbGV2ZWwgPSBsaXN0Ll9sZXZlbDtcbiAgICB3aGlsZSAobm9kZSAmJiBsZXZlbCA+IDApIHtcbiAgICAgIG5vZGUgPSBub2RlLmFycmF5WyhyYXdJbmRleCA+Pj4gbGV2ZWwpICYgTUFTS107XG4gICAgICBsZXZlbCAtPSBTSElGVDtcbiAgICB9XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cbn1cbmZ1bmN0aW9uIHNldExpc3RCb3VuZHMobGlzdCwgYmVnaW4sIGVuZCkge1xuICB2YXIgb3duZXIgPSBsaXN0Ll9fb3duZXJJRCB8fCBuZXcgT3duZXJJRCgpO1xuICB2YXIgb2xkT3JpZ2luID0gbGlzdC5fb3JpZ2luO1xuICB2YXIgb2xkQ2FwYWNpdHkgPSBsaXN0Ll9jYXBhY2l0eTtcbiAgdmFyIG5ld09yaWdpbiA9IG9sZE9yaWdpbiArIGJlZ2luO1xuICB2YXIgbmV3Q2FwYWNpdHkgPSBlbmQgPT09IHVuZGVmaW5lZCA/IG9sZENhcGFjaXR5IDogZW5kIDwgMCA/IG9sZENhcGFjaXR5ICsgZW5kIDogb2xkT3JpZ2luICsgZW5kO1xuICBpZiAobmV3T3JpZ2luID09PSBvbGRPcmlnaW4gJiYgbmV3Q2FwYWNpdHkgPT09IG9sZENhcGFjaXR5KSB7XG4gICAgcmV0dXJuIGxpc3Q7XG4gIH1cbiAgaWYgKG5ld09yaWdpbiA+PSBuZXdDYXBhY2l0eSkge1xuICAgIHJldHVybiBsaXN0LmNsZWFyKCk7XG4gIH1cbiAgdmFyIG5ld0xldmVsID0gbGlzdC5fbGV2ZWw7XG4gIHZhciBuZXdSb290ID0gbGlzdC5fcm9vdDtcbiAgdmFyIG9mZnNldFNoaWZ0ID0gMDtcbiAgd2hpbGUgKG5ld09yaWdpbiArIG9mZnNldFNoaWZ0IDwgMCkge1xuICAgIG5ld1Jvb3QgPSBuZXcgVk5vZGUobmV3Um9vdCAmJiBuZXdSb290LmFycmF5Lmxlbmd0aCA/IFt1bmRlZmluZWQsIG5ld1Jvb3RdIDogW10sIG93bmVyKTtcbiAgICBuZXdMZXZlbCArPSBTSElGVDtcbiAgICBvZmZzZXRTaGlmdCArPSAxIDw8IG5ld0xldmVsO1xuICB9XG4gIGlmIChvZmZzZXRTaGlmdCkge1xuICAgIG5ld09yaWdpbiArPSBvZmZzZXRTaGlmdDtcbiAgICBvbGRPcmlnaW4gKz0gb2Zmc2V0U2hpZnQ7XG4gICAgbmV3Q2FwYWNpdHkgKz0gb2Zmc2V0U2hpZnQ7XG4gICAgb2xkQ2FwYWNpdHkgKz0gb2Zmc2V0U2hpZnQ7XG4gIH1cbiAgdmFyIG9sZFRhaWxPZmZzZXQgPSBnZXRUYWlsT2Zmc2V0KG9sZENhcGFjaXR5KTtcbiAgdmFyIG5ld1RhaWxPZmZzZXQgPSBnZXRUYWlsT2Zmc2V0KG5ld0NhcGFjaXR5KTtcbiAgd2hpbGUgKG5ld1RhaWxPZmZzZXQgPj0gMSA8PCAobmV3TGV2ZWwgKyBTSElGVCkpIHtcbiAgICBuZXdSb290ID0gbmV3IFZOb2RlKG5ld1Jvb3QgJiYgbmV3Um9vdC5hcnJheS5sZW5ndGggPyBbbmV3Um9vdF0gOiBbXSwgb3duZXIpO1xuICAgIG5ld0xldmVsICs9IFNISUZUO1xuICB9XG4gIHZhciBvbGRUYWlsID0gbGlzdC5fdGFpbDtcbiAgdmFyIG5ld1RhaWwgPSBuZXdUYWlsT2Zmc2V0IDwgb2xkVGFpbE9mZnNldCA/IGxpc3ROb2RlRm9yKGxpc3QsIG5ld0NhcGFjaXR5IC0gMSkgOiBuZXdUYWlsT2Zmc2V0ID4gb2xkVGFpbE9mZnNldCA/IG5ldyBWTm9kZShbXSwgb3duZXIpIDogb2xkVGFpbDtcbiAgaWYgKG9sZFRhaWwgJiYgbmV3VGFpbE9mZnNldCA+IG9sZFRhaWxPZmZzZXQgJiYgbmV3T3JpZ2luIDwgb2xkQ2FwYWNpdHkgJiYgb2xkVGFpbC5hcnJheS5sZW5ndGgpIHtcbiAgICBuZXdSb290ID0gZWRpdGFibGVWTm9kZShuZXdSb290LCBvd25lcik7XG4gICAgdmFyIG5vZGUgPSBuZXdSb290O1xuICAgIGZvciAodmFyIGxldmVsID0gbmV3TGV2ZWw7IGxldmVsID4gU0hJRlQ7IGxldmVsIC09IFNISUZUKSB7XG4gICAgICB2YXIgaWR4ID0gKG9sZFRhaWxPZmZzZXQgPj4+IGxldmVsKSAmIE1BU0s7XG4gICAgICBub2RlID0gbm9kZS5hcnJheVtpZHhdID0gZWRpdGFibGVWTm9kZShub2RlLmFycmF5W2lkeF0sIG93bmVyKTtcbiAgICB9XG4gICAgbm9kZS5hcnJheVsob2xkVGFpbE9mZnNldCA+Pj4gU0hJRlQpICYgTUFTS10gPSBvbGRUYWlsO1xuICB9XG4gIGlmIChuZXdDYXBhY2l0eSA8IG9sZENhcGFjaXR5KSB7XG4gICAgbmV3VGFpbCA9IG5ld1RhaWwgJiYgbmV3VGFpbC5yZW1vdmVBZnRlcihvd25lciwgMCwgbmV3Q2FwYWNpdHkpO1xuICB9XG4gIGlmIChuZXdPcmlnaW4gPj0gbmV3VGFpbE9mZnNldCkge1xuICAgIG5ld09yaWdpbiAtPSBuZXdUYWlsT2Zmc2V0O1xuICAgIG5ld0NhcGFjaXR5IC09IG5ld1RhaWxPZmZzZXQ7XG4gICAgbmV3TGV2ZWwgPSBTSElGVDtcbiAgICBuZXdSb290ID0gbnVsbDtcbiAgICBuZXdUYWlsID0gbmV3VGFpbCAmJiBuZXdUYWlsLnJlbW92ZUJlZm9yZShvd25lciwgMCwgbmV3T3JpZ2luKTtcbiAgfSBlbHNlIGlmIChuZXdPcmlnaW4gPiBvbGRPcmlnaW4gfHwgbmV3VGFpbE9mZnNldCA8IG9sZFRhaWxPZmZzZXQpIHtcbiAgICBvZmZzZXRTaGlmdCA9IDA7XG4gICAgd2hpbGUgKG5ld1Jvb3QpIHtcbiAgICAgIHZhciBiZWdpbkluZGV4ID0gKG5ld09yaWdpbiA+Pj4gbmV3TGV2ZWwpICYgTUFTSztcbiAgICAgIGlmIChiZWdpbkluZGV4ICE9PSAobmV3VGFpbE9mZnNldCA+Pj4gbmV3TGV2ZWwpICYgTUFTSykge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGlmIChiZWdpbkluZGV4KSB7XG4gICAgICAgIG9mZnNldFNoaWZ0ICs9ICgxIDw8IG5ld0xldmVsKSAqIGJlZ2luSW5kZXg7XG4gICAgICB9XG4gICAgICBuZXdMZXZlbCAtPSBTSElGVDtcbiAgICAgIG5ld1Jvb3QgPSBuZXdSb290LmFycmF5W2JlZ2luSW5kZXhdO1xuICAgIH1cbiAgICBpZiAobmV3Um9vdCAmJiBuZXdPcmlnaW4gPiBvbGRPcmlnaW4pIHtcbiAgICAgIG5ld1Jvb3QgPSBuZXdSb290LnJlbW92ZUJlZm9yZShvd25lciwgbmV3TGV2ZWwsIG5ld09yaWdpbiAtIG9mZnNldFNoaWZ0KTtcbiAgICB9XG4gICAgaWYgKG5ld1Jvb3QgJiYgbmV3VGFpbE9mZnNldCA8IG9sZFRhaWxPZmZzZXQpIHtcbiAgICAgIG5ld1Jvb3QgPSBuZXdSb290LnJlbW92ZUFmdGVyKG93bmVyLCBuZXdMZXZlbCwgbmV3VGFpbE9mZnNldCAtIG9mZnNldFNoaWZ0KTtcbiAgICB9XG4gICAgaWYgKG9mZnNldFNoaWZ0KSB7XG4gICAgICBuZXdPcmlnaW4gLT0gb2Zmc2V0U2hpZnQ7XG4gICAgICBuZXdDYXBhY2l0eSAtPSBvZmZzZXRTaGlmdDtcbiAgICB9XG4gIH1cbiAgaWYgKGxpc3QuX19vd25lcklEKSB7XG4gICAgbGlzdC5zaXplID0gbmV3Q2FwYWNpdHkgLSBuZXdPcmlnaW47XG4gICAgbGlzdC5fb3JpZ2luID0gbmV3T3JpZ2luO1xuICAgIGxpc3QuX2NhcGFjaXR5ID0gbmV3Q2FwYWNpdHk7XG4gICAgbGlzdC5fbGV2ZWwgPSBuZXdMZXZlbDtcbiAgICBsaXN0Ll9yb290ID0gbmV3Um9vdDtcbiAgICBsaXN0Ll90YWlsID0gbmV3VGFpbDtcbiAgICBsaXN0Ll9faGFzaCA9IHVuZGVmaW5lZDtcbiAgICBsaXN0Ll9fYWx0ZXJlZCA9IHRydWU7XG4gICAgcmV0dXJuIGxpc3Q7XG4gIH1cbiAgcmV0dXJuIG1ha2VMaXN0KG5ld09yaWdpbiwgbmV3Q2FwYWNpdHksIG5ld0xldmVsLCBuZXdSb290LCBuZXdUYWlsKTtcbn1cbmZ1bmN0aW9uIG1lcmdlSW50b0xpc3RXaXRoKGxpc3QsIG1lcmdlciwgaXRlcmFibGVzKSB7XG4gIHZhciBpdGVycyA9IFtdO1xuICB2YXIgbWF4U2l6ZSA9IDA7XG4gIGZvciAodmFyIGlpID0gMDsgaWkgPCBpdGVyYWJsZXMubGVuZ3RoOyBpaSsrKSB7XG4gICAgdmFyIHZhbHVlID0gaXRlcmFibGVzW2lpXTtcbiAgICB2YXIgaXRlciA9IEl0ZXJhYmxlKHZhbHVlKTtcbiAgICBpZiAoaXRlci5zaXplID4gbWF4U2l6ZSkge1xuICAgICAgbWF4U2l6ZSA9IGl0ZXIuc2l6ZTtcbiAgICB9XG4gICAgaWYgKCFpc0l0ZXJhYmxlKHZhbHVlKSkge1xuICAgICAgaXRlciA9IGl0ZXIubWFwKChmdW5jdGlvbih2KSB7XG4gICAgICAgIHJldHVybiBmcm9tSlModik7XG4gICAgICB9KSk7XG4gICAgfVxuICAgIGl0ZXJzLnB1c2goaXRlcik7XG4gIH1cbiAgaWYgKG1heFNpemUgPiBsaXN0LnNpemUpIHtcbiAgICBsaXN0ID0gbGlzdC5zZXRTaXplKG1heFNpemUpO1xuICB9XG4gIHJldHVybiBtZXJnZUludG9Db2xsZWN0aW9uV2l0aChsaXN0LCBtZXJnZXIsIGl0ZXJzKTtcbn1cbmZ1bmN0aW9uIGdldFRhaWxPZmZzZXQoc2l6ZSkge1xuICByZXR1cm4gc2l6ZSA8IFNJWkUgPyAwIDogKCgoc2l6ZSAtIDEpID4+PiBTSElGVCkgPDwgU0hJRlQpO1xufVxudmFyIFN0YWNrID0gZnVuY3Rpb24gU3RhY2sodmFsdWUpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDAgPyBlbXB0eVN0YWNrKCkgOiB2YWx1ZSAmJiB2YWx1ZS5jb25zdHJ1Y3RvciA9PT0gJFN0YWNrID8gdmFsdWUgOiBlbXB0eVN0YWNrKCkudW5zaGlmdEFsbCh2YWx1ZSk7XG59O1xudmFyICRTdGFjayA9IFN0YWNrO1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoU3RhY2ssIHtcbiAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9fdG9TdHJpbmcoJ1N0YWNrIFsnLCAnXScpO1xuICB9LFxuICBnZXQ6IGZ1bmN0aW9uKGluZGV4LCBub3RTZXRWYWx1ZSkge1xuICAgIHZhciBoZWFkID0gdGhpcy5faGVhZDtcbiAgICB3aGlsZSAoaGVhZCAmJiBpbmRleC0tKSB7XG4gICAgICBoZWFkID0gaGVhZC5uZXh0O1xuICAgIH1cbiAgICByZXR1cm4gaGVhZCA/IGhlYWQudmFsdWUgOiBub3RTZXRWYWx1ZTtcbiAgfSxcbiAgcGVlazogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hlYWQgJiYgdGhpcy5faGVhZC52YWx1ZTtcbiAgfSxcbiAgcHVzaDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgbmV3U2l6ZSA9IHRoaXMuc2l6ZSArIGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgdmFyIGhlYWQgPSB0aGlzLl9oZWFkO1xuICAgIGZvciAodmFyIGlpID0gYXJndW1lbnRzLmxlbmd0aCAtIDE7IGlpID49IDA7IGlpLS0pIHtcbiAgICAgIGhlYWQgPSB7XG4gICAgICAgIHZhbHVlOiBhcmd1bWVudHNbaWldLFxuICAgICAgICBuZXh0OiBoZWFkXG4gICAgICB9O1xuICAgIH1cbiAgICBpZiAodGhpcy5fX293bmVySUQpIHtcbiAgICAgIHRoaXMuc2l6ZSA9IG5ld1NpemU7XG4gICAgICB0aGlzLl9oZWFkID0gaGVhZDtcbiAgICAgIHRoaXMuX19oYXNoID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5fX2FsdGVyZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBtYWtlU3RhY2sobmV3U2l6ZSwgaGVhZCk7XG4gIH0sXG4gIHB1c2hBbGw6IGZ1bmN0aW9uKGl0ZXIpIHtcbiAgICBpdGVyID0gSXRlcmFibGUoaXRlcik7XG4gICAgaWYgKGl0ZXIuc2l6ZSA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciBuZXdTaXplID0gdGhpcy5zaXplO1xuICAgIHZhciBoZWFkID0gdGhpcy5faGVhZDtcbiAgICBpdGVyLnJldmVyc2UoKS5mb3JFYWNoKChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgbmV3U2l6ZSsrO1xuICAgICAgaGVhZCA9IHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBuZXh0OiBoZWFkXG4gICAgICB9O1xuICAgIH0pKTtcbiAgICBpZiAodGhpcy5fX293bmVySUQpIHtcbiAgICAgIHRoaXMuc2l6ZSA9IG5ld1NpemU7XG4gICAgICB0aGlzLl9oZWFkID0gaGVhZDtcbiAgICAgIHRoaXMuX19oYXNoID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5fX2FsdGVyZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBtYWtlU3RhY2sobmV3U2l6ZSwgaGVhZCk7XG4gIH0sXG4gIHBvcDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuc2xpY2UoMSk7XG4gIH0sXG4gIHVuc2hpZnQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnB1c2guYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfSxcbiAgdW5zaGlmdEFsbDogZnVuY3Rpb24oaXRlcikge1xuICAgIHJldHVybiB0aGlzLnB1c2hBbGwoaXRlcik7XG4gIH0sXG4gIHNoaWZ0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5wb3AuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfSxcbiAgY2xlYXI6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnNpemUgPT09IDApIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBpZiAodGhpcy5fX293bmVySUQpIHtcbiAgICAgIHRoaXMuc2l6ZSA9IDA7XG4gICAgICB0aGlzLl9oZWFkID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5fX2hhc2ggPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9fYWx0ZXJlZCA9IHRydWU7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIGVtcHR5U3RhY2soKTtcbiAgfSxcbiAgc2xpY2U6IGZ1bmN0aW9uKGJlZ2luLCBlbmQpIHtcbiAgICBpZiAod2hvbGVTbGljZShiZWdpbiwgZW5kLCB0aGlzLnNpemUpKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdmFyIHJlc29sdmVkQmVnaW4gPSByZXNvbHZlQmVnaW4oYmVnaW4sIHRoaXMuc2l6ZSk7XG4gICAgdmFyIHJlc29sdmVkRW5kID0gcmVzb2x2ZUVuZChlbmQsIHRoaXMuc2l6ZSk7XG4gICAgaWYgKHJlc29sdmVkRW5kICE9PSB0aGlzLnNpemUpIHtcbiAgICAgIHJldHVybiAkdHJhY2V1clJ1bnRpbWUuc3VwZXJDYWxsKHRoaXMsICRTdGFjay5wcm90b3R5cGUsIFwic2xpY2VcIiwgW2JlZ2luLCBlbmRdKTtcbiAgICB9XG4gICAgdmFyIG5ld1NpemUgPSB0aGlzLnNpemUgLSByZXNvbHZlZEJlZ2luO1xuICAgIHZhciBoZWFkID0gdGhpcy5faGVhZDtcbiAgICB3aGlsZSAocmVzb2x2ZWRCZWdpbi0tKSB7XG4gICAgICBoZWFkID0gaGVhZC5uZXh0O1xuICAgIH1cbiAgICBpZiAodGhpcy5fX293bmVySUQpIHtcbiAgICAgIHRoaXMuc2l6ZSA9IG5ld1NpemU7XG4gICAgICB0aGlzLl9oZWFkID0gaGVhZDtcbiAgICAgIHRoaXMuX19oYXNoID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5fX2FsdGVyZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBtYWtlU3RhY2sobmV3U2l6ZSwgaGVhZCk7XG4gIH0sXG4gIF9fZW5zdXJlT3duZXI6IGZ1bmN0aW9uKG93bmVySUQpIHtcbiAgICBpZiAob3duZXJJRCA9PT0gdGhpcy5fX293bmVySUQpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBpZiAoIW93bmVySUQpIHtcbiAgICAgIHRoaXMuX19vd25lcklEID0gb3duZXJJRDtcbiAgICAgIHRoaXMuX19hbHRlcmVkID0gZmFsc2U7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIG1ha2VTdGFjayh0aGlzLnNpemUsIHRoaXMuX2hlYWQsIG93bmVySUQsIHRoaXMuX19oYXNoKTtcbiAgfSxcbiAgX19pdGVyYXRlOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICByZXR1cm4gdGhpcy50b1NlcSgpLmNhY2hlUmVzdWx0Ll9faXRlcmF0ZShmbiwgcmV2ZXJzZSk7XG4gICAgfVxuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICB2YXIgbm9kZSA9IHRoaXMuX2hlYWQ7XG4gICAgd2hpbGUgKG5vZGUpIHtcbiAgICAgIGlmIChmbihub2RlLnZhbHVlLCBpdGVyYXRpb25zKyssIHRoaXMpID09PSBmYWxzZSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIG5vZGUgPSBub2RlLm5leHQ7XG4gICAgfVxuICAgIHJldHVybiBpdGVyYXRpb25zO1xuICB9LFxuICBfX2l0ZXJhdG9yOiBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgaWYgKHJldmVyc2UpIHtcbiAgICAgIHJldHVybiB0aGlzLnRvU2VxKCkuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICAgIH1cbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgdmFyIG5vZGUgPSB0aGlzLl9oZWFkO1xuICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKG5vZGUpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gbm9kZS52YWx1ZTtcbiAgICAgICAgbm9kZSA9IG5vZGUubmV4dDtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yVmFsdWUodHlwZSwgaXRlcmF0aW9ucysrLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gaXRlcmF0b3JEb25lKCk7XG4gICAgfSkpO1xuICB9XG59LCB7b2Y6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzKGFyZ3VtZW50cyk7XG4gIH19LCBJbmRleGVkQ29sbGVjdGlvbik7XG5mdW5jdGlvbiBpc1N0YWNrKG1heWJlU3RhY2spIHtcbiAgcmV0dXJuICEhKG1heWJlU3RhY2sgJiYgbWF5YmVTdGFja1tJU19TVEFDS19TRU5USU5FTF0pO1xufVxuU3RhY2suaXNTdGFjayA9IGlzU3RhY2s7XG52YXIgSVNfU1RBQ0tfU0VOVElORUwgPSAnQEBfX0lNTVVUQUJMRV9TVEFDS19fQEAnO1xudmFyIFN0YWNrUHJvdG90eXBlID0gU3RhY2sucHJvdG90eXBlO1xuU3RhY2tQcm90b3R5cGVbSVNfU1RBQ0tfU0VOVElORUxdID0gdHJ1ZTtcblN0YWNrUHJvdG90eXBlLndpdGhNdXRhdGlvbnMgPSBNYXBQcm90b3R5cGUud2l0aE11dGF0aW9ucztcblN0YWNrUHJvdG90eXBlLmFzTXV0YWJsZSA9IE1hcFByb3RvdHlwZS5hc011dGFibGU7XG5TdGFja1Byb3RvdHlwZS5hc0ltbXV0YWJsZSA9IE1hcFByb3RvdHlwZS5hc0ltbXV0YWJsZTtcblN0YWNrUHJvdG90eXBlLndhc0FsdGVyZWQgPSBNYXBQcm90b3R5cGUud2FzQWx0ZXJlZDtcbmZ1bmN0aW9uIG1ha2VTdGFjayhzaXplLCBoZWFkLCBvd25lcklELCBoYXNoKSB7XG4gIHZhciBtYXAgPSBPYmplY3QuY3JlYXRlKFN0YWNrUHJvdG90eXBlKTtcbiAgbWFwLnNpemUgPSBzaXplO1xuICBtYXAuX2hlYWQgPSBoZWFkO1xuICBtYXAuX19vd25lcklEID0gb3duZXJJRDtcbiAgbWFwLl9faGFzaCA9IGhhc2g7XG4gIG1hcC5fX2FsdGVyZWQgPSBmYWxzZTtcbiAgcmV0dXJuIG1hcDtcbn1cbnZhciBFTVBUWV9TVEFDSztcbmZ1bmN0aW9uIGVtcHR5U3RhY2soKSB7XG4gIHJldHVybiBFTVBUWV9TVEFDSyB8fCAoRU1QVFlfU1RBQ0sgPSBtYWtlU3RhY2soMCkpO1xufVxudmFyIFNldCA9IGZ1bmN0aW9uIFNldCh2YWx1ZSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMCA/IGVtcHR5U2V0KCkgOiB2YWx1ZSAmJiB2YWx1ZS5jb25zdHJ1Y3RvciA9PT0gJFNldCA/IHZhbHVlIDogZW1wdHlTZXQoKS51bmlvbih2YWx1ZSk7XG59O1xudmFyICRTZXQgPSBTZXQ7XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShTZXQsIHtcbiAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9fdG9TdHJpbmcoJ1NldCB7JywgJ30nKTtcbiAgfSxcbiAgaGFzOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLl9tYXAuaGFzKHZhbHVlKTtcbiAgfSxcbiAgYWRkOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhciBuZXdNYXAgPSB0aGlzLl9tYXAuc2V0KHZhbHVlLCB0cnVlKTtcbiAgICBpZiAodGhpcy5fX293bmVySUQpIHtcbiAgICAgIHRoaXMuc2l6ZSA9IG5ld01hcC5zaXplO1xuICAgICAgdGhpcy5fbWFwID0gbmV3TWFwO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBuZXdNYXAgPT09IHRoaXMuX21hcCA/IHRoaXMgOiBtYWtlU2V0KG5ld01hcCk7XG4gIH0sXG4gIHJlbW92ZTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YXIgbmV3TWFwID0gdGhpcy5fbWFwLnJlbW92ZSh2YWx1ZSk7XG4gICAgaWYgKHRoaXMuX19vd25lcklEKSB7XG4gICAgICB0aGlzLnNpemUgPSBuZXdNYXAuc2l6ZTtcbiAgICAgIHRoaXMuX21hcCA9IG5ld01hcDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gbmV3TWFwID09PSB0aGlzLl9tYXAgPyB0aGlzIDogbmV3TWFwLnNpemUgPT09IDAgPyBlbXB0eVNldCgpIDogbWFrZVNldChuZXdNYXApO1xuICB9LFxuICBjbGVhcjogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuc2l6ZSA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGlmICh0aGlzLl9fb3duZXJJRCkge1xuICAgICAgdGhpcy5zaXplID0gMDtcbiAgICAgIHRoaXMuX21hcC5jbGVhcigpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBlbXB0eVNldCgpO1xuICB9LFxuICB1bmlvbjogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZXJzID0gYXJndW1lbnRzO1xuICAgIGlmIChpdGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKChmdW5jdGlvbihzZXQpIHtcbiAgICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBpdGVycy5sZW5ndGg7IGlpKyspIHtcbiAgICAgICAgSXRlcmFibGUoaXRlcnNbaWldKS5mb3JFYWNoKChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBzZXQuYWRkKHZhbHVlKTtcbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgIH0pKTtcbiAgfSxcbiAgaW50ZXJzZWN0OiBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciBpdGVycyA9IFtdLFxuICAgICAgICAkX184ID0gMDsgJF9fOCA8IGFyZ3VtZW50cy5sZW5ndGg7ICRfXzgrKylcbiAgICAgIGl0ZXJzWyRfXzhdID0gYXJndW1lbnRzWyRfXzhdO1xuICAgIGlmIChpdGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBpdGVycyA9IGl0ZXJzLm1hcCgoZnVuY3Rpb24oaXRlcikge1xuICAgICAgcmV0dXJuIEl0ZXJhYmxlKGl0ZXIpO1xuICAgIH0pKTtcbiAgICB2YXIgb3JpZ2luYWxTZXQgPSB0aGlzO1xuICAgIHJldHVybiB0aGlzLndpdGhNdXRhdGlvbnMoKGZ1bmN0aW9uKHNldCkge1xuICAgICAgb3JpZ2luYWxTZXQuZm9yRWFjaCgoZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgaWYgKCFpdGVycy5ldmVyeSgoZnVuY3Rpb24oaXRlcikge1xuICAgICAgICAgIHJldHVybiBpdGVyLmNvbnRhaW5zKHZhbHVlKTtcbiAgICAgICAgfSkpKSB7XG4gICAgICAgICAgc2V0LnJlbW92ZSh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICB9KSk7XG4gIH0sXG4gIHN1YnRyYWN0OiBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciBpdGVycyA9IFtdLFxuICAgICAgICAkX185ID0gMDsgJF9fOSA8IGFyZ3VtZW50cy5sZW5ndGg7ICRfXzkrKylcbiAgICAgIGl0ZXJzWyRfXzldID0gYXJndW1lbnRzWyRfXzldO1xuICAgIGlmIChpdGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBpdGVycyA9IGl0ZXJzLm1hcCgoZnVuY3Rpb24oaXRlcikge1xuICAgICAgcmV0dXJuIEl0ZXJhYmxlKGl0ZXIpO1xuICAgIH0pKTtcbiAgICB2YXIgb3JpZ2luYWxTZXQgPSB0aGlzO1xuICAgIHJldHVybiB0aGlzLndpdGhNdXRhdGlvbnMoKGZ1bmN0aW9uKHNldCkge1xuICAgICAgb3JpZ2luYWxTZXQuZm9yRWFjaCgoZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgaWYgKGl0ZXJzLnNvbWUoKGZ1bmN0aW9uKGl0ZXIpIHtcbiAgICAgICAgICByZXR1cm4gaXRlci5jb250YWlucyh2YWx1ZSk7XG4gICAgICAgIH0pKSkge1xuICAgICAgICAgIHNldC5yZW1vdmUodmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgfSkpO1xuICB9LFxuICBtZXJnZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudW5pb24uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfSxcbiAgbWVyZ2VXaXRoOiBmdW5jdGlvbihtZXJnZXIpIHtcbiAgICBmb3IgKHZhciBpdGVycyA9IFtdLFxuICAgICAgICAkX18xMCA9IDE7ICRfXzEwIDwgYXJndW1lbnRzLmxlbmd0aDsgJF9fMTArKylcbiAgICAgIGl0ZXJzWyRfXzEwIC0gMV0gPSBhcmd1bWVudHNbJF9fMTBdO1xuICAgIHJldHVybiB0aGlzLnVuaW9uLmFwcGx5KHRoaXMsIGl0ZXJzKTtcbiAgfSxcbiAgd2FzQWx0ZXJlZDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcC53YXNBbHRlcmVkKCk7XG4gIH0sXG4gIF9faXRlcmF0ZTogZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgcmV0dXJuIHRoaXMuX21hcC5fX2l0ZXJhdGUoKGZ1bmN0aW9uKF8sIGspIHtcbiAgICAgIHJldHVybiBmbihrLCBrLCAkX18wKTtcbiAgICB9KSwgcmV2ZXJzZSk7XG4gIH0sXG4gIF9faXRlcmF0b3I6IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwLm1hcCgoZnVuY3Rpb24oXywgaykge1xuICAgICAgcmV0dXJuIGs7XG4gICAgfSkpLl9faXRlcmF0b3IodHlwZSwgcmV2ZXJzZSk7XG4gIH0sXG4gIF9fZW5zdXJlT3duZXI6IGZ1bmN0aW9uKG93bmVySUQpIHtcbiAgICBpZiAob3duZXJJRCA9PT0gdGhpcy5fX293bmVySUQpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgbmV3TWFwID0gdGhpcy5fbWFwLl9fZW5zdXJlT3duZXIob3duZXJJRCk7XG4gICAgaWYgKCFvd25lcklEKSB7XG4gICAgICB0aGlzLl9fb3duZXJJRCA9IG93bmVySUQ7XG4gICAgICB0aGlzLl9tYXAgPSBuZXdNYXA7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIG1ha2VTZXQobmV3TWFwLCBvd25lcklEKTtcbiAgfVxufSwge1xuICBvZjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMoYXJndW1lbnRzKTtcbiAgfSxcbiAgZnJvbUtleXM6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMoS2V5ZWRTZXEodmFsdWUpLmZsaXAoKSk7XG4gIH1cbn0sIFNldENvbGxlY3Rpb24pO1xuZnVuY3Rpb24gaXNTZXQobWF5YmVTZXQpIHtcbiAgcmV0dXJuICEhKG1heWJlU2V0ICYmIG1heWJlU2V0W0lTX1NFVF9TRU5USU5FTF0pO1xufVxuU2V0LmlzU2V0ID0gaXNTZXQ7XG52YXIgSVNfU0VUX1NFTlRJTkVMID0gJ0BAX19JTU1VVEFCTEVfU0VUX19AQCc7XG52YXIgU2V0UHJvdG90eXBlID0gU2V0LnByb3RvdHlwZTtcblNldFByb3RvdHlwZVtJU19TRVRfU0VOVElORUxdID0gdHJ1ZTtcblNldFByb3RvdHlwZVtERUxFVEVdID0gU2V0UHJvdG90eXBlLnJlbW92ZTtcblNldFByb3RvdHlwZS5tZXJnZURlZXAgPSBTZXRQcm90b3R5cGUubWVyZ2U7XG5TZXRQcm90b3R5cGUubWVyZ2VEZWVwV2l0aCA9IFNldFByb3RvdHlwZS5tZXJnZVdpdGg7XG5TZXRQcm90b3R5cGUud2l0aE11dGF0aW9ucyA9IE1hcFByb3RvdHlwZS53aXRoTXV0YXRpb25zO1xuU2V0UHJvdG90eXBlLmFzTXV0YWJsZSA9IE1hcFByb3RvdHlwZS5hc011dGFibGU7XG5TZXRQcm90b3R5cGUuYXNJbW11dGFibGUgPSBNYXBQcm90b3R5cGUuYXNJbW11dGFibGU7XG5mdW5jdGlvbiBtYWtlU2V0KG1hcCwgb3duZXJJRCkge1xuICB2YXIgc2V0ID0gT2JqZWN0LmNyZWF0ZShTZXRQcm90b3R5cGUpO1xuICBzZXQuc2l6ZSA9IG1hcCA/IG1hcC5zaXplIDogMDtcbiAgc2V0Ll9tYXAgPSBtYXA7XG4gIHNldC5fX293bmVySUQgPSBvd25lcklEO1xuICByZXR1cm4gc2V0O1xufVxudmFyIEVNUFRZX1NFVDtcbmZ1bmN0aW9uIGVtcHR5U2V0KCkge1xuICByZXR1cm4gRU1QVFlfU0VUIHx8IChFTVBUWV9TRVQgPSBtYWtlU2V0KGVtcHR5TWFwKCkpKTtcbn1cbnZhciBPcmRlcmVkTWFwID0gZnVuY3Rpb24gT3JkZXJlZE1hcCh2YWx1ZSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMCA/IGVtcHR5T3JkZXJlZE1hcCgpIDogdmFsdWUgJiYgdmFsdWUuY29uc3RydWN0b3IgPT09ICRPcmRlcmVkTWFwID8gdmFsdWUgOiBlbXB0eU9yZGVyZWRNYXAoKS5tZXJnZShLZXllZEl0ZXJhYmxlKHZhbHVlKSk7XG59O1xudmFyICRPcmRlcmVkTWFwID0gT3JkZXJlZE1hcDtcbigkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKE9yZGVyZWRNYXAsIHtcbiAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9fdG9TdHJpbmcoJ09yZGVyZWRNYXAgeycsICd9Jyk7XG4gIH0sXG4gIGdldDogZnVuY3Rpb24oaywgbm90U2V0VmFsdWUpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLl9tYXAuZ2V0KGspO1xuICAgIHJldHVybiBpbmRleCAhPT0gdW5kZWZpbmVkID8gdGhpcy5fbGlzdC5nZXQoaW5kZXgpWzFdIDogbm90U2V0VmFsdWU7XG4gIH0sXG4gIGNsZWFyOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5zaXplID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgaWYgKHRoaXMuX19vd25lcklEKSB7XG4gICAgICB0aGlzLnNpemUgPSAwO1xuICAgICAgdGhpcy5fbWFwLmNsZWFyKCk7XG4gICAgICB0aGlzLl9saXN0LmNsZWFyKCk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIGVtcHR5T3JkZXJlZE1hcCgpO1xuICB9LFxuICBzZXQ6IGZ1bmN0aW9uKGssIHYpIHtcbiAgICByZXR1cm4gdXBkYXRlT3JkZXJlZE1hcCh0aGlzLCBrLCB2KTtcbiAgfSxcbiAgcmVtb3ZlOiBmdW5jdGlvbihrKSB7XG4gICAgcmV0dXJuIHVwZGF0ZU9yZGVyZWRNYXAodGhpcywgaywgTk9UX1NFVCk7XG4gIH0sXG4gIHdhc0FsdGVyZWQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9tYXAud2FzQWx0ZXJlZCgpIHx8IHRoaXMuX2xpc3Qud2FzQWx0ZXJlZCgpO1xuICB9LFxuICBfX2l0ZXJhdGU6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyICRfXzAgPSB0aGlzO1xuICAgIHJldHVybiB0aGlzLl9saXN0Ll9faXRlcmF0ZSgoZnVuY3Rpb24oZW50cnkpIHtcbiAgICAgIHJldHVybiBmbihlbnRyeVsxXSwgZW50cnlbMF0sICRfXzApO1xuICAgIH0pLCByZXZlcnNlKTtcbiAgfSxcbiAgX19pdGVyYXRvcjogZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHJldHVybiB0aGlzLl9saXN0LmZyb21FbnRyeVNlcSgpLl9faXRlcmF0b3IodHlwZSwgcmV2ZXJzZSk7XG4gIH0sXG4gIF9fZW5zdXJlT3duZXI6IGZ1bmN0aW9uKG93bmVySUQpIHtcbiAgICBpZiAob3duZXJJRCA9PT0gdGhpcy5fX293bmVySUQpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgbmV3TWFwID0gdGhpcy5fbWFwLl9fZW5zdXJlT3duZXIob3duZXJJRCk7XG4gICAgdmFyIG5ld0xpc3QgPSB0aGlzLl9saXN0Ll9fZW5zdXJlT3duZXIob3duZXJJRCk7XG4gICAgaWYgKCFvd25lcklEKSB7XG4gICAgICB0aGlzLl9fb3duZXJJRCA9IG93bmVySUQ7XG4gICAgICB0aGlzLl9tYXAgPSBuZXdNYXA7XG4gICAgICB0aGlzLl9saXN0ID0gbmV3TGlzdDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gbWFrZU9yZGVyZWRNYXAobmV3TWFwLCBuZXdMaXN0LCBvd25lcklELCB0aGlzLl9faGFzaCk7XG4gIH1cbn0sIHtvZjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMoYXJndW1lbnRzKTtcbiAgfX0sIE1hcCk7XG5mdW5jdGlvbiBpc09yZGVyZWRNYXAobWF5YmVPcmRlcmVkTWFwKSB7XG4gIHJldHVybiAhIShtYXliZU9yZGVyZWRNYXAgJiYgbWF5YmVPcmRlcmVkTWFwW0lTX09SREVSRURfTUFQX1NFTlRJTkVMXSk7XG59XG5PcmRlcmVkTWFwLmlzT3JkZXJlZE1hcCA9IGlzT3JkZXJlZE1hcDtcbnZhciBJU19PUkRFUkVEX01BUF9TRU5USU5FTCA9ICdAQF9fSU1NVVRBQkxFX09SREVSRURfTUFQX19AQCc7XG5PcmRlcmVkTWFwLnByb3RvdHlwZVtJU19PUkRFUkVEX01BUF9TRU5USU5FTF0gPSB0cnVlO1xuT3JkZXJlZE1hcC5wcm90b3R5cGVbREVMRVRFXSA9IE9yZGVyZWRNYXAucHJvdG90eXBlLnJlbW92ZTtcbmZ1bmN0aW9uIG1ha2VPcmRlcmVkTWFwKG1hcCwgbGlzdCwgb3duZXJJRCwgaGFzaCkge1xuICB2YXIgb21hcCA9IE9iamVjdC5jcmVhdGUoT3JkZXJlZE1hcC5wcm90b3R5cGUpO1xuICBvbWFwLnNpemUgPSBtYXAgPyBtYXAuc2l6ZSA6IDA7XG4gIG9tYXAuX21hcCA9IG1hcDtcbiAgb21hcC5fbGlzdCA9IGxpc3Q7XG4gIG9tYXAuX19vd25lcklEID0gb3duZXJJRDtcbiAgb21hcC5fX2hhc2ggPSBoYXNoO1xuICByZXR1cm4gb21hcDtcbn1cbnZhciBFTVBUWV9PUkRFUkVEX01BUDtcbmZ1bmN0aW9uIGVtcHR5T3JkZXJlZE1hcCgpIHtcbiAgcmV0dXJuIEVNUFRZX09SREVSRURfTUFQIHx8IChFTVBUWV9PUkRFUkVEX01BUCA9IG1ha2VPcmRlcmVkTWFwKGVtcHR5TWFwKCksIGVtcHR5TGlzdCgpKSk7XG59XG5mdW5jdGlvbiB1cGRhdGVPcmRlcmVkTWFwKG9tYXAsIGssIHYpIHtcbiAgdmFyIG1hcCA9IG9tYXAuX21hcDtcbiAgdmFyIGxpc3QgPSBvbWFwLl9saXN0O1xuICB2YXIgaSA9IG1hcC5nZXQoayk7XG4gIHZhciBoYXMgPSBpICE9PSB1bmRlZmluZWQ7XG4gIHZhciByZW1vdmVkID0gdiA9PT0gTk9UX1NFVDtcbiAgaWYgKCghaGFzICYmIHJlbW92ZWQpIHx8IChoYXMgJiYgdiA9PT0gbGlzdC5nZXQoaSlbMV0pKSB7XG4gICAgcmV0dXJuIG9tYXA7XG4gIH1cbiAgaWYgKCFoYXMpIHtcbiAgICBpID0gbGlzdC5zaXplO1xuICB9XG4gIHZhciBuZXdNYXAgPSByZW1vdmVkID8gbWFwLnJlbW92ZShrKSA6IGhhcyA/IG1hcCA6IG1hcC5zZXQoaywgaSk7XG4gIHZhciBuZXdMaXN0ID0gcmVtb3ZlZCA/IGxpc3QucmVtb3ZlKGkpIDogbGlzdC5zZXQoaSwgW2ssIHZdKTtcbiAgaWYgKG9tYXAuX19vd25lcklEKSB7XG4gICAgb21hcC5zaXplID0gbmV3TWFwLnNpemU7XG4gICAgb21hcC5fbWFwID0gbmV3TWFwO1xuICAgIG9tYXAuX2xpc3QgPSBuZXdMaXN0O1xuICAgIG9tYXAuX19oYXNoID0gdW5kZWZpbmVkO1xuICAgIHJldHVybiBvbWFwO1xuICB9XG4gIHJldHVybiBtYWtlT3JkZXJlZE1hcChuZXdNYXAsIG5ld0xpc3QpO1xufVxudmFyIFJlY29yZCA9IGZ1bmN0aW9uIFJlY29yZChkZWZhdWx0VmFsdWVzLCBuYW1lKSB7XG4gIHZhciBSZWNvcmRUeXBlID0gZnVuY3Rpb24odmFsdWVzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFJlY29yZFR5cGUpKSB7XG4gICAgICByZXR1cm4gbmV3IFJlY29yZFR5cGUodmFsdWVzKTtcbiAgICB9XG4gICAgdGhpcy5fbWFwID0gYXJndW1lbnRzLmxlbmd0aCA9PT0gMCA/IE1hcCgpIDogTWFwKHZhbHVlcyk7XG4gIH07XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZGVmYXVsdFZhbHVlcyk7XG4gIHZhciBSZWNvcmRUeXBlUHJvdG90eXBlID0gUmVjb3JkVHlwZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFJlY29yZFByb3RvdHlwZSk7XG4gIFJlY29yZFR5cGVQcm90b3R5cGUuY29uc3RydWN0b3IgPSBSZWNvcmRUeXBlO1xuICBuYW1lICYmIChSZWNvcmRUeXBlUHJvdG90eXBlLl9uYW1lID0gbmFtZSk7XG4gIFJlY29yZFR5cGVQcm90b3R5cGUuX2RlZmF1bHRWYWx1ZXMgPSBkZWZhdWx0VmFsdWVzO1xuICBSZWNvcmRUeXBlUHJvdG90eXBlLl9rZXlzID0ga2V5cztcbiAgUmVjb3JkVHlwZVByb3RvdHlwZS5zaXplID0ga2V5cy5sZW5ndGg7XG4gIHRyeSB7XG4gICAgSXRlcmFibGUoZGVmYXVsdFZhbHVlcykuZm9yRWFjaCgoZnVuY3Rpb24oXywga2V5KSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoUmVjb3JkVHlwZS5wcm90b3R5cGUsIGtleSwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmdldChrZXkpO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgaW52YXJpYW50KHRoaXMuX19vd25lcklELCAnQ2Fubm90IHNldCBvbiBhbiBpbW11dGFibGUgcmVjb3JkLicpO1xuICAgICAgICAgIHRoaXMuc2V0KGtleSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7fVxuICByZXR1cm4gUmVjb3JkVHlwZTtcbn07XG4oJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShSZWNvcmQsIHtcbiAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9fdG9TdHJpbmcodGhpcy5fbmFtZSArICcgeycsICd9Jyk7XG4gIH0sXG4gIGhhczogZnVuY3Rpb24oaykge1xuICAgIHJldHVybiB0aGlzLl9kZWZhdWx0VmFsdWVzLmhhc093blByb3BlcnR5KGspO1xuICB9LFxuICBnZXQ6IGZ1bmN0aW9uKGssIG5vdFNldFZhbHVlKSB7XG4gICAgaWYgKG5vdFNldFZhbHVlICE9PSB1bmRlZmluZWQgJiYgIXRoaXMuaGFzKGspKSB7XG4gICAgICByZXR1cm4gbm90U2V0VmFsdWU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9tYXAuZ2V0KGssIHRoaXMuX2RlZmF1bHRWYWx1ZXNba10pO1xuICB9LFxuICBjbGVhcjogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX19vd25lcklEKSB7XG4gICAgICB0aGlzLl9tYXAuY2xlYXIoKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgU3VwZXJSZWNvcmQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodGhpcykuY29uc3RydWN0b3I7XG4gICAgcmV0dXJuIFN1cGVyUmVjb3JkLl9lbXB0eSB8fCAoU3VwZXJSZWNvcmQuX2VtcHR5ID0gbWFrZVJlY29yZCh0aGlzLCBlbXB0eU1hcCgpKSk7XG4gIH0sXG4gIHNldDogZnVuY3Rpb24oaywgdikge1xuICAgIGlmICghdGhpcy5oYXMoaykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHNldCB1bmtub3duIGtleSBcIicgKyBrICsgJ1wiIG9uICcgKyB0aGlzLl9uYW1lKTtcbiAgICB9XG4gICAgdmFyIG5ld01hcCA9IHRoaXMuX21hcC5zZXQoaywgdik7XG4gICAgaWYgKHRoaXMuX19vd25lcklEIHx8IG5ld01hcCA9PT0gdGhpcy5fbWFwKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIG1ha2VSZWNvcmQodGhpcywgbmV3TWFwKTtcbiAgfSxcbiAgcmVtb3ZlOiBmdW5jdGlvbihrKSB7XG4gICAgaWYgKCF0aGlzLmhhcyhrKSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciBuZXdNYXAgPSB0aGlzLl9tYXAucmVtb3ZlKGspO1xuICAgIGlmICh0aGlzLl9fb3duZXJJRCB8fCBuZXdNYXAgPT09IHRoaXMuX21hcCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBtYWtlUmVjb3JkKHRoaXMsIG5ld01hcCk7XG4gIH0sXG4gIGtleXM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9tYXAua2V5cygpO1xuICB9LFxuICB2YWx1ZXM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9tYXAudmFsdWVzKCk7XG4gIH0sXG4gIGVudHJpZXM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9tYXAuZW50cmllcygpO1xuICB9LFxuICB3YXNBbHRlcmVkOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwLndhc0FsdGVyZWQoKTtcbiAgfSxcbiAgX19pdGVyYXRvcjogZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgIHJldHVybiB0aGlzLl9tYXAuX19pdGVyYXRvcih0eXBlLCByZXZlcnNlKTtcbiAgfSxcbiAgX19pdGVyYXRlOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIHZhciAkX18wID0gdGhpcztcbiAgICByZXR1cm4gSXRlcmFibGUodGhpcy5fZGVmYXVsdFZhbHVlcykubWFwKChmdW5jdGlvbihfLCBrKSB7XG4gICAgICByZXR1cm4gJF9fMC5nZXQoayk7XG4gICAgfSkpLl9faXRlcmF0ZShmbiwgcmV2ZXJzZSk7XG4gIH0sXG4gIF9fZW5zdXJlT3duZXI6IGZ1bmN0aW9uKG93bmVySUQpIHtcbiAgICBpZiAob3duZXJJRCA9PT0gdGhpcy5fX293bmVySUQpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgbmV3TWFwID0gdGhpcy5fbWFwICYmIHRoaXMuX21hcC5fX2Vuc3VyZU93bmVyKG93bmVySUQpO1xuICAgIGlmICghb3duZXJJRCkge1xuICAgICAgdGhpcy5fX293bmVySUQgPSBvd25lcklEO1xuICAgICAgdGhpcy5fbWFwID0gbmV3TWFwO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBtYWtlUmVjb3JkKHRoaXMsIG5ld01hcCwgb3duZXJJRCk7XG4gIH1cbn0sIHt9LCBLZXllZENvbGxlY3Rpb24pO1xudmFyIFJlY29yZFByb3RvdHlwZSA9IFJlY29yZC5wcm90b3R5cGU7XG5SZWNvcmRQcm90b3R5cGUuX25hbWUgPSAnUmVjb3JkJztcblJlY29yZFByb3RvdHlwZVtERUxFVEVdID0gUmVjb3JkUHJvdG90eXBlLnJlbW92ZTtcblJlY29yZFByb3RvdHlwZS5tZXJnZSA9IE1hcFByb3RvdHlwZS5tZXJnZTtcblJlY29yZFByb3RvdHlwZS5tZXJnZVdpdGggPSBNYXBQcm90b3R5cGUubWVyZ2VXaXRoO1xuUmVjb3JkUHJvdG90eXBlLm1lcmdlRGVlcCA9IE1hcFByb3RvdHlwZS5tZXJnZURlZXA7XG5SZWNvcmRQcm90b3R5cGUubWVyZ2VEZWVwV2l0aCA9IE1hcFByb3RvdHlwZS5tZXJnZURlZXBXaXRoO1xuUmVjb3JkUHJvdG90eXBlLnVwZGF0ZSA9IE1hcFByb3RvdHlwZS51cGRhdGU7XG5SZWNvcmRQcm90b3R5cGUudXBkYXRlSW4gPSBNYXBQcm90b3R5cGUudXBkYXRlSW47XG5SZWNvcmRQcm90b3R5cGUud2l0aE11dGF0aW9ucyA9IE1hcFByb3RvdHlwZS53aXRoTXV0YXRpb25zO1xuUmVjb3JkUHJvdG90eXBlLmFzTXV0YWJsZSA9IE1hcFByb3RvdHlwZS5hc011dGFibGU7XG5SZWNvcmRQcm90b3R5cGUuYXNJbW11dGFibGUgPSBNYXBQcm90b3R5cGUuYXNJbW11dGFibGU7XG5mdW5jdGlvbiBtYWtlUmVjb3JkKGxpa2VSZWNvcmQsIG1hcCwgb3duZXJJRCkge1xuICB2YXIgcmVjb3JkID0gT2JqZWN0LmNyZWF0ZShPYmplY3QuZ2V0UHJvdG90eXBlT2YobGlrZVJlY29yZCkpO1xuICByZWNvcmQuX21hcCA9IG1hcDtcbiAgcmVjb3JkLl9fb3duZXJJRCA9IG93bmVySUQ7XG4gIHJldHVybiByZWNvcmQ7XG59XG52YXIgUmFuZ2UgPSBmdW5jdGlvbiBSYW5nZShzdGFydCwgZW5kLCBzdGVwKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiAkUmFuZ2UpKSB7XG4gICAgcmV0dXJuIG5ldyAkUmFuZ2Uoc3RhcnQsIGVuZCwgc3RlcCk7XG4gIH1cbiAgaW52YXJpYW50KHN0ZXAgIT09IDAsICdDYW5ub3Qgc3RlcCBhIFJhbmdlIGJ5IDAnKTtcbiAgc3RhcnQgPSBzdGFydCB8fCAwO1xuICBpZiAoZW5kID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmQgPSBJbmZpbml0eTtcbiAgfVxuICBpZiAoc3RhcnQgPT09IGVuZCAmJiBfX0VNUFRZX1JBTkdFKSB7XG4gICAgcmV0dXJuIF9fRU1QVFlfUkFOR0U7XG4gIH1cbiAgc3RlcCA9IHN0ZXAgPT09IHVuZGVmaW5lZCA/IDEgOiBNYXRoLmFicyhzdGVwKTtcbiAgaWYgKGVuZCA8IHN0YXJ0KSB7XG4gICAgc3RlcCA9IC1zdGVwO1xuICB9XG4gIHRoaXMuX3N0YXJ0ID0gc3RhcnQ7XG4gIHRoaXMuX2VuZCA9IGVuZDtcbiAgdGhpcy5fc3RlcCA9IHN0ZXA7XG4gIHRoaXMuc2l6ZSA9IE1hdGgubWF4KDAsIE1hdGguY2VpbCgoZW5kIC0gc3RhcnQpIC8gc3RlcCAtIDEpICsgMSk7XG59O1xudmFyICRSYW5nZSA9IFJhbmdlO1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoUmFuZ2UsIHtcbiAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnNpemUgPT09IDApIHtcbiAgICAgIHJldHVybiAnUmFuZ2UgW10nO1xuICAgIH1cbiAgICByZXR1cm4gJ1JhbmdlIFsgJyArIHRoaXMuX3N0YXJ0ICsgJy4uLicgKyB0aGlzLl9lbmQgKyAodGhpcy5fc3RlcCA+IDEgPyAnIGJ5ICcgKyB0aGlzLl9zdGVwIDogJycpICsgJyBdJztcbiAgfSxcbiAgZ2V0OiBmdW5jdGlvbihpbmRleCwgbm90U2V0VmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5oYXMoaW5kZXgpID8gdGhpcy5fc3RhcnQgKyB3cmFwSW5kZXgodGhpcywgaW5kZXgpICogdGhpcy5fc3RlcCA6IG5vdFNldFZhbHVlO1xuICB9LFxuICBjb250YWluczogZnVuY3Rpb24oc2VhcmNoVmFsdWUpIHtcbiAgICB2YXIgcG9zc2libGVJbmRleCA9IChzZWFyY2hWYWx1ZSAtIHRoaXMuX3N0YXJ0KSAvIHRoaXMuX3N0ZXA7XG4gICAgcmV0dXJuIHBvc3NpYmxlSW5kZXggPj0gMCAmJiBwb3NzaWJsZUluZGV4IDwgdGhpcy5zaXplICYmIHBvc3NpYmxlSW5kZXggPT09IE1hdGguZmxvb3IocG9zc2libGVJbmRleCk7XG4gIH0sXG4gIHNsaWNlOiBmdW5jdGlvbihiZWdpbiwgZW5kKSB7XG4gICAgaWYgKHdob2xlU2xpY2UoYmVnaW4sIGVuZCwgdGhpcy5zaXplKSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGJlZ2luID0gcmVzb2x2ZUJlZ2luKGJlZ2luLCB0aGlzLnNpemUpO1xuICAgIGVuZCA9IHJlc29sdmVFbmQoZW5kLCB0aGlzLnNpemUpO1xuICAgIGlmIChlbmQgPD0gYmVnaW4pIHtcbiAgICAgIHJldHVybiBfX0VNUFRZX1JBTkdFO1xuICAgIH1cbiAgICByZXR1cm4gbmV3ICRSYW5nZSh0aGlzLmdldChiZWdpbiwgdGhpcy5fZW5kKSwgdGhpcy5nZXQoZW5kLCB0aGlzLl9lbmQpLCB0aGlzLl9zdGVwKTtcbiAgfSxcbiAgaW5kZXhPZjogZnVuY3Rpb24oc2VhcmNoVmFsdWUpIHtcbiAgICB2YXIgb2Zmc2V0VmFsdWUgPSBzZWFyY2hWYWx1ZSAtIHRoaXMuX3N0YXJ0O1xuICAgIGlmIChvZmZzZXRWYWx1ZSAlIHRoaXMuX3N0ZXAgPT09IDApIHtcbiAgICAgIHZhciBpbmRleCA9IG9mZnNldFZhbHVlIC8gdGhpcy5fc3RlcDtcbiAgICAgIGlmIChpbmRleCA+PSAwICYmIGluZGV4IDwgdGhpcy5zaXplKSB7XG4gICAgICAgIHJldHVybiBpbmRleDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIC0xO1xuICB9LFxuICBsYXN0SW5kZXhPZjogZnVuY3Rpb24oc2VhcmNoVmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5pbmRleE9mKHNlYXJjaFZhbHVlKTtcbiAgfSxcbiAgdGFrZTogZnVuY3Rpb24oYW1vdW50KSB7XG4gICAgcmV0dXJuIHRoaXMuc2xpY2UoMCwgTWF0aC5tYXgoMCwgYW1vdW50KSk7XG4gIH0sXG4gIHNraXA6IGZ1bmN0aW9uKGFtb3VudCkge1xuICAgIHJldHVybiB0aGlzLnNsaWNlKE1hdGgubWF4KDAsIGFtb3VudCkpO1xuICB9LFxuICBfX2l0ZXJhdGU6IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgdmFyIG1heEluZGV4ID0gdGhpcy5zaXplIC0gMTtcbiAgICB2YXIgc3RlcCA9IHRoaXMuX3N0ZXA7XG4gICAgdmFyIHZhbHVlID0gcmV2ZXJzZSA/IHRoaXMuX3N0YXJ0ICsgbWF4SW5kZXggKiBzdGVwIDogdGhpcy5fc3RhcnQ7XG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8PSBtYXhJbmRleDsgaWkrKykge1xuICAgICAgaWYgKGZuKHZhbHVlLCBpaSwgdGhpcykgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBpaSArIDE7XG4gICAgICB9XG4gICAgICB2YWx1ZSArPSByZXZlcnNlID8gLXN0ZXAgOiBzdGVwO1xuICAgIH1cbiAgICByZXR1cm4gaWk7XG4gIH0sXG4gIF9faXRlcmF0b3I6IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICB2YXIgbWF4SW5kZXggPSB0aGlzLnNpemUgLSAxO1xuICAgIHZhciBzdGVwID0gdGhpcy5fc3RlcDtcbiAgICB2YXIgdmFsdWUgPSByZXZlcnNlID8gdGhpcy5fc3RhcnQgKyBtYXhJbmRleCAqIHN0ZXAgOiB0aGlzLl9zdGFydDtcbiAgICB2YXIgaWkgPSAwO1xuICAgIHJldHVybiBuZXcgSXRlcmF0b3IoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHYgPSB2YWx1ZTtcbiAgICAgIHZhbHVlICs9IHJldmVyc2UgPyAtc3RlcCA6IHN0ZXA7XG4gICAgICByZXR1cm4gaWkgPiBtYXhJbmRleCA/IGl0ZXJhdG9yRG9uZSgpIDogaXRlcmF0b3JWYWx1ZSh0eXBlLCBpaSsrLCB2KTtcbiAgICB9KSk7XG4gIH0sXG4gIF9fZGVlcEVxdWFsczogZnVuY3Rpb24ob3RoZXIpIHtcbiAgICByZXR1cm4gb3RoZXIgaW5zdGFuY2VvZiAkUmFuZ2UgPyB0aGlzLl9zdGFydCA9PT0gb3RoZXIuX3N0YXJ0ICYmIHRoaXMuX2VuZCA9PT0gb3RoZXIuX2VuZCAmJiB0aGlzLl9zdGVwID09PSBvdGhlci5fc3RlcCA6ICR0cmFjZXVyUnVudGltZS5zdXBlckNhbGwodGhpcywgJFJhbmdlLnByb3RvdHlwZSwgXCJfX2RlZXBFcXVhbHNcIiwgW290aGVyXSk7XG4gIH1cbn0sIHt9LCBJbmRleGVkU2VxKTtcbnZhciBSYW5nZVByb3RvdHlwZSA9IFJhbmdlLnByb3RvdHlwZTtcblJhbmdlUHJvdG90eXBlLl9fdG9KUyA9IFJhbmdlUHJvdG90eXBlLnRvQXJyYXk7XG5SYW5nZVByb3RvdHlwZS5maXJzdCA9IExpc3RQcm90b3R5cGUuZmlyc3Q7XG5SYW5nZVByb3RvdHlwZS5sYXN0ID0gTGlzdFByb3RvdHlwZS5sYXN0O1xudmFyIF9fRU1QVFlfUkFOR0UgPSBSYW5nZSgwLCAwKTtcbnZhciBSZXBlYXQgPSBmdW5jdGlvbiBSZXBlYXQodmFsdWUsIHRpbWVzKSB7XG4gIGlmICh0aW1lcyA8PSAwICYmIEVNUFRZX1JFUEVBVCkge1xuICAgIHJldHVybiBFTVBUWV9SRVBFQVQ7XG4gIH1cbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mICRSZXBlYXQpKSB7XG4gICAgcmV0dXJuIG5ldyAkUmVwZWF0KHZhbHVlLCB0aW1lcyk7XG4gIH1cbiAgdGhpcy5fdmFsdWUgPSB2YWx1ZTtcbiAgdGhpcy5zaXplID0gdGltZXMgPT09IHVuZGVmaW5lZCA/IEluZmluaXR5IDogTWF0aC5tYXgoMCwgdGltZXMpO1xuICBpZiAodGhpcy5zaXplID09PSAwKSB7XG4gICAgRU1QVFlfUkVQRUFUID0gdGhpcztcbiAgfVxufTtcbnZhciAkUmVwZWF0ID0gUmVwZWF0O1xuKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoUmVwZWF0LCB7XG4gIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5zaXplID09PSAwKSB7XG4gICAgICByZXR1cm4gJ1JlcGVhdCBbXSc7XG4gICAgfVxuICAgIHJldHVybiAnUmVwZWF0IFsgJyArIHRoaXMuX3ZhbHVlICsgJyAnICsgdGhpcy5zaXplICsgJyB0aW1lcyBdJztcbiAgfSxcbiAgZ2V0OiBmdW5jdGlvbihpbmRleCwgbm90U2V0VmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5oYXMoaW5kZXgpID8gdGhpcy5fdmFsdWUgOiBub3RTZXRWYWx1ZTtcbiAgfSxcbiAgY29udGFpbnM6IGZ1bmN0aW9uKHNlYXJjaFZhbHVlKSB7XG4gICAgcmV0dXJuIGlzKHRoaXMuX3ZhbHVlLCBzZWFyY2hWYWx1ZSk7XG4gIH0sXG4gIHNsaWNlOiBmdW5jdGlvbihiZWdpbiwgZW5kKSB7XG4gICAgdmFyIHNpemUgPSB0aGlzLnNpemU7XG4gICAgcmV0dXJuIHdob2xlU2xpY2UoYmVnaW4sIGVuZCwgc2l6ZSkgPyB0aGlzIDogbmV3ICRSZXBlYXQodGhpcy5fdmFsdWUsIHJlc29sdmVFbmQoZW5kLCBzaXplKSAtIHJlc29sdmVCZWdpbihiZWdpbiwgc2l6ZSkpO1xuICB9LFxuICByZXZlcnNlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgaW5kZXhPZjogZnVuY3Rpb24oc2VhcmNoVmFsdWUpIHtcbiAgICBpZiAoaXModGhpcy5fdmFsdWUsIHNlYXJjaFZhbHVlKSkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHJldHVybiAtMTtcbiAgfSxcbiAgbGFzdEluZGV4T2Y6IGZ1bmN0aW9uKHNlYXJjaFZhbHVlKSB7XG4gICAgaWYgKGlzKHRoaXMuX3ZhbHVlLCBzZWFyY2hWYWx1ZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnNpemU7XG4gICAgfVxuICAgIHJldHVybiAtMTtcbiAgfSxcbiAgX19pdGVyYXRlOiBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCB0aGlzLnNpemU7IGlpKyspIHtcbiAgICAgIGlmIChmbih0aGlzLl92YWx1ZSwgaWksIHRoaXMpID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gaWkgKyAxO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaWk7XG4gIH0sXG4gIF9faXRlcmF0b3I6IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgdmFyIGlpID0gMDtcbiAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKChmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBpaSA8ICRfXzAuc2l6ZSA/IGl0ZXJhdG9yVmFsdWUodHlwZSwgaWkrKywgJF9fMC5fdmFsdWUpIDogaXRlcmF0b3JEb25lKCk7XG4gICAgfSkpO1xuICB9LFxuICBfX2RlZXBFcXVhbHM6IGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgcmV0dXJuIG90aGVyIGluc3RhbmNlb2YgJFJlcGVhdCA/IGlzKHRoaXMuX3ZhbHVlLCBvdGhlci5fdmFsdWUpIDogJHRyYWNldXJSdW50aW1lLnN1cGVyQ2FsbCh0aGlzLCAkUmVwZWF0LnByb3RvdHlwZSwgXCJfX2RlZXBFcXVhbHNcIiwgW290aGVyXSk7XG4gIH1cbn0sIHt9LCBJbmRleGVkU2VxKTtcbnZhciBSZXBlYXRQcm90b3R5cGUgPSBSZXBlYXQucHJvdG90eXBlO1xuUmVwZWF0UHJvdG90eXBlLmxhc3QgPSBSZXBlYXRQcm90b3R5cGUuZmlyc3Q7XG5SZXBlYXRQcm90b3R5cGUuaGFzID0gUmFuZ2VQcm90b3R5cGUuaGFzO1xuUmVwZWF0UHJvdG90eXBlLnRha2UgPSBSYW5nZVByb3RvdHlwZS50YWtlO1xuUmVwZWF0UHJvdG90eXBlLnNraXAgPSBSYW5nZVByb3RvdHlwZS5za2lwO1xuUmVwZWF0UHJvdG90eXBlLl9fdG9KUyA9IFJhbmdlUHJvdG90eXBlLl9fdG9KUztcbnZhciBFTVBUWV9SRVBFQVQ7XG52YXIgSW1tdXRhYmxlID0ge1xuICBJdGVyYWJsZTogSXRlcmFibGUsXG4gIFNlcTogU2VxLFxuICBDb2xsZWN0aW9uOiBDb2xsZWN0aW9uLFxuICBNYXA6IE1hcCxcbiAgTGlzdDogTGlzdCxcbiAgU3RhY2s6IFN0YWNrLFxuICBTZXQ6IFNldCxcbiAgT3JkZXJlZE1hcDogT3JkZXJlZE1hcCxcbiAgUmVjb3JkOiBSZWNvcmQsXG4gIFJhbmdlOiBSYW5nZSxcbiAgUmVwZWF0OiBSZXBlYXQsXG4gIGlzOiBpcyxcbiAgZnJvbUpTOiBmcm9tSlNcbn07XG5cbiAgcmV0dXJuIEltbXV0YWJsZTtcbn1cbnR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyA/IG1vZHVsZS5leHBvcnRzID0gdW5pdmVyc2FsTW9kdWxlKCkgOlxuICB0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUodW5pdmVyc2FsTW9kdWxlKSA6XG4gICAgSW1tdXRhYmxlID0gdW5pdmVyc2FsTW9kdWxlKCk7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIDIwMTQgUGF0cmljayBEdWJyb3kgPHBkdWJyb3lAZ21haWwuY29tPlxuLy8gVGhpcyBzb2Z0d2FyZSBpcyBkaXN0cmlidXRlZCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIE1JVCBMaWNlbnNlLlxuXG4vKiBnbG9iYWwgLVdlYWtNYXAgKi9cblxudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ3V0aWwtZXh0ZW5kJyksXG4gICAgV2Vha01hcCA9IHJlcXVpcmUoJy4vdGhpcmRfcGFydHkvV2Vha01hcCcpO1xuXG4vLyBBbiBpbnRlcm5hbCBvYmplY3QgdGhhdCBjYW4gYmUgcmV0dXJuZWQgZnJvbSBhIHZpc2l0b3IgZnVuY3Rpb24gdG9cbi8vIHByZXZlbnQgYSB0b3AtZG93biB3YWxrIGZyb20gd2Fsa2luZyBzdWJ0cmVlcyBvZiBhIG5vZGUuXG52YXIgc3RvcFJlY3Vyc2lvbiA9IHt9O1xuXG4vLyBBbiBpbnRlcm5hbCBvYmplY3QgdGhhdCBjYW4gYmUgcmV0dXJuZWQgZnJvbSBhIHZpc2l0b3IgZnVuY3Rpb24gdG9cbi8vIGNhdXNlIHRoZSB3YWxrIHRvIGltbWVkaWF0ZWx5IHN0b3AuXG52YXIgc3RvcFdhbGsgPSB7fTtcblxudmFyIGhhc093blByb3AgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG4vLyBIZWxwZXJzXG4vLyAtLS0tLS0tXG5cbmZ1bmN0aW9uIGlzRWxlbWVudChvYmopIHtcbiAgcmV0dXJuICEhKG9iaiAmJiBvYmoubm9kZVR5cGUgPT09IDEpO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChvYmopIHtcbiAgdmFyIHR5cGUgPSB0eXBlb2Ygb2JqO1xuICByZXR1cm4gdHlwZSA9PT0gJ2Z1bmN0aW9uJyB8fCB0eXBlID09PSAnb2JqZWN0JyAmJiAhIW9iajtcbn1cblxuZnVuY3Rpb24gZWFjaChvYmosIHByZWRpY2F0ZSkge1xuICBmb3IgKHZhciBrIGluIG9iaikge1xuICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgIGlmIChwcmVkaWNhdGUob2JqW2tdLCBrLCBvYmopKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vLyBNYWtlcyBhIHNoYWxsb3cgY29weSBvZiBgYXJyYCwgYW5kIGFkZHMgYG9iamAgdG8gdGhlIGVuZCBvZiB0aGUgY29weS5cbmZ1bmN0aW9uIGNvcHlBbmRQdXNoKGFyciwgb2JqKSB7XG4gIHZhciByZXN1bHQgPSBhcnIuc2xpY2UoKTtcbiAgcmVzdWx0LnB1c2gob2JqKTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy8gSW1wbGVtZW50cyB0aGUgZGVmYXVsdCB0cmF2ZXJzYWwgc3RyYXRlZ3k6IGlmIGBvYmpgIGlzIGEgRE9NIG5vZGUsIHdhbGtcbi8vIGl0cyBET00gY2hpbGRyZW47IG90aGVyd2lzZSwgd2FsayBhbGwgdGhlIG9iamVjdHMgaXQgcmVmZXJlbmNlcy5cbmZ1bmN0aW9uIGRlZmF1bHRUcmF2ZXJzYWwob2JqKSB7XG4gIHJldHVybiBpc0VsZW1lbnQob2JqKSA/IG9iai5jaGlsZHJlbiA6IG9iajtcbn1cblxuLy8gV2FsayB0aGUgdHJlZSByZWN1cnNpdmVseSBiZWdpbm5pbmcgd2l0aCBgcm9vdGAsIGNhbGxpbmcgYGJlZm9yZUZ1bmNgXG4vLyBiZWZvcmUgdmlzaXRpbmcgYW4gb2JqZWN0cyBkZXNjZW5kZW50cywgYW5kIGBhZnRlckZ1bmNgIGFmdGVyd2FyZHMuXG4vLyBJZiBgY29sbGVjdFJlc3VsdHNgIGlzIHRydWUsIHRoZSBsYXN0IGFyZ3VtZW50IHRvIGBhZnRlckZ1bmNgIHdpbGwgYmUgYVxuLy8gY29sbGVjdGlvbiBvZiB0aGUgcmVzdWx0cyBvZiB3YWxraW5nIHRoZSBub2RlJ3Mgc3VidHJlZXMuXG5mdW5jdGlvbiB3YWxrSW1wbChyb290LCB0cmF2ZXJzYWxTdHJhdGVneSwgYmVmb3JlRnVuYywgYWZ0ZXJGdW5jLCBjb250ZXh0LCBjb2xsZWN0UmVzdWx0cykge1xuICByZXR1cm4gKGZ1bmN0aW9uIF93YWxrKHN0YWNrLCB2YWx1ZSwga2V5LCBwYXJlbnQpIHtcbiAgICBpZiAoaXNPYmplY3QodmFsdWUpICYmIHN0YWNrLmluZGV4T2YodmFsdWUpID49IDApXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBIGN5Y2xlIHdhcyBkZXRlY3RlZCBhdCAnICsgdmFsdWUpO1xuXG4gICAgaWYgKGJlZm9yZUZ1bmMpIHtcbiAgICAgIHZhciByZXN1bHQgPSBiZWZvcmVGdW5jLmNhbGwoY29udGV4dCwgdmFsdWUsIGtleSwgcGFyZW50KTtcbiAgICAgIGlmIChyZXN1bHQgPT09IHN0b3BXYWxrKSByZXR1cm4gc3RvcFdhbGs7XG4gICAgICBpZiAocmVzdWx0ID09PSBzdG9wUmVjdXJzaW9uKSByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHN1YlJlc3VsdHM7XG4gICAgdmFyIHRhcmdldCA9IHRyYXZlcnNhbFN0cmF0ZWd5KHZhbHVlKTtcblxuICAgIGlmIChpc09iamVjdCh0YXJnZXQpICYmIE9iamVjdC5rZXlzKHRhcmdldCkubGVuZ3RoID4gMCkge1xuICAgICAgLy8gQ29sbGVjdCByZXN1bHRzIGZyb20gc3VidHJlZXMgaW4gdGhlIHNhbWUgc2hhcGUgYXMgdGhlIHRhcmdldC5cbiAgICAgIGlmIChjb2xsZWN0UmVzdWx0cykgc3ViUmVzdWx0cyA9IEFycmF5LmlzQXJyYXkodGFyZ2V0KSA/IFtdIDoge307XG5cbiAgICAgIHZhciBvayA9IGVhY2godGFyZ2V0LCBmdW5jdGlvbihvYmosIGtleSkge1xuICAgICAgICB2YXIgcmVzdWx0ID0gX3dhbGsoY29weUFuZFB1c2goc3RhY2ssIHZhbHVlKSwgb2JqLCBrZXksIHZhbHVlKTtcbiAgICAgICAgaWYgKHJlc3VsdCA9PT0gc3RvcFdhbGspIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKHN1YlJlc3VsdHMpIHN1YlJlc3VsdHNba2V5XSA9IHJlc3VsdDtcbiAgICAgIH0pO1xuICAgICAgaWYgKCFvaykgcmV0dXJuIHN0b3BXYWxrO1xuICAgIH1cbiAgICBpZiAoYWZ0ZXJGdW5jKSByZXR1cm4gYWZ0ZXJGdW5jLmNhbGwoY29udGV4dCwgdmFsdWUsIGtleSwgcGFyZW50LCBzdWJSZXN1bHRzKTtcbiAgfSkoW10sIHJvb3QpO1xufVxuXG4vLyBJbnRlcm5hbCBoZWxwZXIgcHJvdmlkaW5nIHRoZSBpbXBsZW1lbnRhdGlvbiBmb3IgYHBsdWNrYCBhbmQgYHBsdWNrUmVjYC5cbmZ1bmN0aW9uIHBsdWNrKG9iaiwgcHJvcGVydHlOYW1lLCByZWN1cnNpdmUpIHtcbiAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgdGhpcy5wcmVvcmRlcihvYmosIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICBpZiAoIXJlY3Vyc2l2ZSAmJiBrZXkgPT0gcHJvcGVydHlOYW1lKVxuICAgICAgcmV0dXJuIHN0b3BSZWN1cnNpb247XG4gICAgaWYgKGhhc093blByb3AuY2FsbCh2YWx1ZSwgcHJvcGVydHlOYW1lKSlcbiAgICAgIHJlc3VsdHNbcmVzdWx0cy5sZW5ndGhdID0gdmFsdWVbcHJvcGVydHlOYW1lXTtcbiAgfSk7XG4gIHJldHVybiByZXN1bHRzO1xufVxuXG5mdW5jdGlvbiBkZWZpbmVFbnVtZXJhYmxlUHJvcGVydHkob2JqLCBwcm9wTmFtZSwgZ2V0dGVyRm4pIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwgcHJvcE5hbWUsIHtcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGdldDogZ2V0dGVyRm5cbiAgfSk7XG59XG5cbi8vIFJldHVybnMgYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHdhbGsgZnVuY3Rpb25zLiBJZiBgdHJhdmVyc2FsU3RyYXRlZ3lgXG4vLyBpcyBzcGVjaWZpZWQsIGl0IGlzIGEgZnVuY3Rpb24gZGV0ZXJtaW5pbmcgaG93IG9iamVjdHMgc2hvdWxkIGJlXG4vLyB0cmF2ZXJzZWQuIEdpdmVuIGFuIG9iamVjdCwgaXQgcmV0dXJucyB0aGUgb2JqZWN0IHRvIGJlIHJlY3Vyc2l2ZWx5XG4vLyB3YWxrZWQuIFRoZSBkZWZhdWx0IHN0cmF0ZWd5IGlzIGVxdWl2YWxlbnQgdG8gYF8uaWRlbnRpdHlgIGZvciByZWd1bGFyXG4vLyBvYmplY3RzLCBhbmQgZm9yIERPTSBub2RlcyBpdCByZXR1cm5zIHRoZSBub2RlJ3MgRE9NIGNoaWxkcmVuLlxuZnVuY3Rpb24gV2Fsa2VyKHRyYXZlcnNhbFN0cmF0ZWd5KSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXYWxrZXIpKVxuICAgIHJldHVybiBuZXcgV2Fsa2VyKHRyYXZlcnNhbFN0cmF0ZWd5KTtcbiAgdGhpcy5fdHJhdmVyc2FsU3RyYXRlZ3kgPSB0cmF2ZXJzYWxTdHJhdGVneSB8fCBkZWZhdWx0VHJhdmVyc2FsO1xufVxuXG5leHRlbmQoV2Fsa2VyLnByb3RvdHlwZSwge1xuICAvLyBQZXJmb3JtcyBhIHByZW9yZGVyIHRyYXZlcnNhbCBvZiBgb2JqYCBhbmQgcmV0dXJucyB0aGUgZmlyc3QgdmFsdWVcbiAgLy8gd2hpY2ggcGFzc2VzIGEgdHJ1dGggdGVzdC5cbiAgZmluZDogZnVuY3Rpb24ob2JqLCB2aXNpdG9yLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICB0aGlzLnByZW9yZGVyKG9iaiwgZnVuY3Rpb24odmFsdWUsIGtleSwgcGFyZW50KSB7XG4gICAgICBpZiAodmlzaXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBrZXksIHBhcmVudCkpIHtcbiAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIHJldHVybiBzdG9wV2FsaztcbiAgICAgIH1cbiAgICB9LCBjb250ZXh0KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuXG4gIC8vIFJlY3Vyc2l2ZWx5IHRyYXZlcnNlcyBgb2JqYCBhbmQgcmV0dXJucyBhbGwgdGhlIGVsZW1lbnRzIHRoYXQgcGFzcyBhXG4gIC8vIHRydXRoIHRlc3QuIGBzdHJhdGVneWAgaXMgdGhlIHRyYXZlcnNhbCBmdW5jdGlvbiB0byB1c2UsIGUuZy4gYHByZW9yZGVyYFxuICAvLyBvciBgcG9zdG9yZGVyYC5cbiAgZmlsdGVyOiBmdW5jdGlvbihvYmosIHN0cmF0ZWd5LCB2aXNpdG9yLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICBpZiAob2JqID09PSBudWxsKSByZXR1cm4gcmVzdWx0cztcbiAgICBzdHJhdGVneShvYmosIGZ1bmN0aW9uKHZhbHVlLCBrZXksIHBhcmVudCkge1xuICAgICAgaWYgKHZpc2l0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwga2V5LCBwYXJlbnQpKSByZXN1bHRzLnB1c2godmFsdWUpO1xuICAgIH0sIG51bGwsIHRoaXMuX3RyYXZlcnNhbFN0cmF0ZWd5KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfSxcblxuICAvLyBSZWN1cnNpdmVseSB0cmF2ZXJzZXMgYG9iamAgYW5kIHJldHVybnMgYWxsIHRoZSBlbGVtZW50cyBmb3Igd2hpY2ggYVxuICAvLyB0cnV0aCB0ZXN0IGZhaWxzLlxuICByZWplY3Q6IGZ1bmN0aW9uKG9iaiwgc3RyYXRlZ3ksIHZpc2l0b3IsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIob2JqLCBzdHJhdGVneSwgZnVuY3Rpb24odmFsdWUsIGtleSwgcGFyZW50KSB7XG4gICAgICByZXR1cm4gIXZpc2l0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwga2V5LCBwYXJlbnQpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFByb2R1Y2VzIGEgbmV3IGFycmF5IG9mIHZhbHVlcyBieSByZWN1cnNpdmVseSB0cmF2ZXJzaW5nIGBvYmpgIGFuZFxuICAvLyBtYXBwaW5nIGVhY2ggdmFsdWUgdGhyb3VnaCB0aGUgdHJhbnNmb3JtYXRpb24gZnVuY3Rpb24gYHZpc2l0b3JgLlxuICAvLyBgc3RyYXRlZ3lgIGlzIHRoZSB0cmF2ZXJzYWwgZnVuY3Rpb24gdG8gdXNlLCBlLmcuIGBwcmVvcmRlcmAgb3JcbiAgLy8gYHBvc3RvcmRlcmAuXG4gIG1hcDogZnVuY3Rpb24ob2JqLCBzdHJhdGVneSwgdmlzaXRvciwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgc3RyYXRlZ3kob2JqLCBmdW5jdGlvbih2YWx1ZSwga2V5LCBwYXJlbnQpIHtcbiAgICAgIHJlc3VsdHNbcmVzdWx0cy5sZW5ndGhdID0gdmlzaXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBrZXksIHBhcmVudCk7XG4gICAgfSwgbnVsbCwgdGhpcy5fdHJhdmVyc2FsU3RyYXRlZ3kpO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9LFxuXG4gIC8vIFJldHVybiB0aGUgdmFsdWUgb2YgcHJvcGVydGllcyBuYW1lZCBgcHJvcGVydHlOYW1lYCByZWFjaGFibGUgZnJvbSB0aGVcbiAgLy8gdHJlZSByb290ZWQgYXQgYG9iamAuIFJlc3VsdHMgYXJlIG5vdCByZWN1cnNpdmVseSBzZWFyY2hlZDsgdXNlXG4gIC8vIGBwbHVja1JlY2AgZm9yIHRoYXQuXG4gIHBsdWNrOiBmdW5jdGlvbihvYmosIHByb3BlcnR5TmFtZSkge1xuICAgIHJldHVybiBwbHVjay5jYWxsKHRoaXMsIG9iaiwgcHJvcGVydHlOYW1lLCBmYWxzZSk7XG4gIH0sXG5cbiAgLy8gVmVyc2lvbiBvZiBgcGx1Y2tgIHdoaWNoIHJlY3Vyc2l2ZWx5IHNlYXJjaGVzIHJlc3VsdHMgZm9yIG5lc3RlZCBvYmplY3RzXG4gIC8vIHdpdGggYSBwcm9wZXJ0eSBuYW1lZCBgcHJvcGVydHlOYW1lYC5cbiAgcGx1Y2tSZWM6IGZ1bmN0aW9uKG9iaiwgcHJvcGVydHlOYW1lKSB7XG4gICAgcmV0dXJuIHBsdWNrLmNhbGwodGhpcywgb2JqLCBwcm9wZXJ0eU5hbWUsIHRydWUpO1xuICB9LFxuXG4gIC8vIFJlY3Vyc2l2ZWx5IHRyYXZlcnNlcyBgb2JqYCBpbiBhIGRlcHRoLWZpcnN0IGZhc2hpb24sIGludm9raW5nIHRoZVxuICAvLyBgdmlzaXRvcmAgZnVuY3Rpb24gZm9yIGVhY2ggb2JqZWN0IG9ubHkgYWZ0ZXIgdHJhdmVyc2luZyBpdHMgY2hpbGRyZW4uXG4gIC8vIGB0cmF2ZXJzYWxTdHJhdGVneWAgaXMgaW50ZW5kZWQgZm9yIGludGVybmFsIGNhbGxlcnMsIGFuZCBpcyBub3QgcGFydFxuICAvLyBvZiB0aGUgcHVibGljIEFQSS5cbiAgcG9zdG9yZGVyOiBmdW5jdGlvbihvYmosIHZpc2l0b3IsIGNvbnRleHQsIHRyYXZlcnNhbFN0cmF0ZWd5KSB7XG4gICAgdHJhdmVyc2FsU3RyYXRlZ3kgPSB0cmF2ZXJzYWxTdHJhdGVneSB8fCB0aGlzLl90cmF2ZXJzYWxTdHJhdGVneTtcbiAgICB3YWxrSW1wbChvYmosIHRyYXZlcnNhbFN0cmF0ZWd5LCBudWxsLCB2aXNpdG9yLCBjb250ZXh0KTtcbiAgfSxcblxuICAvLyBSZWN1cnNpdmVseSB0cmF2ZXJzZXMgYG9iamAgaW4gYSBkZXB0aC1maXJzdCBmYXNoaW9uLCBpbnZva2luZyB0aGVcbiAgLy8gYHZpc2l0b3JgIGZ1bmN0aW9uIGZvciBlYWNoIG9iamVjdCBiZWZvcmUgdHJhdmVyc2luZyBpdHMgY2hpbGRyZW4uXG4gIC8vIGB0cmF2ZXJzYWxTdHJhdGVneWAgaXMgaW50ZW5kZWQgZm9yIGludGVybmFsIGNhbGxlcnMsIGFuZCBpcyBub3QgcGFydFxuICAvLyBvZiB0aGUgcHVibGljIEFQSS5cbiAgcHJlb3JkZXI6IGZ1bmN0aW9uKG9iaiwgdmlzaXRvciwgY29udGV4dCwgdHJhdmVyc2FsU3RyYXRlZ3kpIHtcbiAgICB0cmF2ZXJzYWxTdHJhdGVneSA9IHRyYXZlcnNhbFN0cmF0ZWd5IHx8IHRoaXMuX3RyYXZlcnNhbFN0cmF0ZWd5O1xuICAgIHdhbGtJbXBsKG9iaiwgdHJhdmVyc2FsU3RyYXRlZ3ksIHZpc2l0b3IsIG51bGwsIGNvbnRleHQpO1xuICB9LFxuXG4gIC8vIEJ1aWxkcyB1cCBhIHNpbmdsZSB2YWx1ZSBieSBkb2luZyBhIHBvc3Qtb3JkZXIgdHJhdmVyc2FsIG9mIGBvYmpgIGFuZFxuICAvLyBjYWxsaW5nIHRoZSBgdmlzaXRvcmAgZnVuY3Rpb24gb24gZWFjaCBvYmplY3QgaW4gdGhlIHRyZWUuIEZvciBsZWFmXG4gIC8vIG9iamVjdHMsIHRoZSBgbWVtb2AgYXJndW1lbnQgdG8gYHZpc2l0b3JgIGlzIHRoZSB2YWx1ZSBvZiB0aGUgYGxlYWZNZW1vYFxuICAvLyBhcmd1bWVudCB0byBgcmVkdWNlYC4gRm9yIG5vbi1sZWFmIG9iamVjdHMsIGBtZW1vYCBpcyBhIGNvbGxlY3Rpb24gb2ZcbiAgLy8gdGhlIHJlc3VsdHMgb2YgY2FsbGluZyBgcmVkdWNlYCBvbiB0aGUgb2JqZWN0J3MgY2hpbGRyZW4uXG4gIHJlZHVjZTogZnVuY3Rpb24ob2JqLCB2aXNpdG9yLCBsZWFmTWVtbywgY29udGV4dCkge1xuICAgIHZhciByZWR1Y2VyID0gZnVuY3Rpb24odmFsdWUsIGtleSwgcGFyZW50LCBzdWJSZXN1bHRzKSB7XG4gICAgICByZXR1cm4gdmlzaXRvcihzdWJSZXN1bHRzIHx8IGxlYWZNZW1vLCB2YWx1ZSwga2V5LCBwYXJlbnQpO1xuICAgIH07XG4gICAgcmV0dXJuIHdhbGtJbXBsKG9iaiwgdGhpcy5fdHJhdmVyc2FsU3RyYXRlZ3ksIG51bGwsIHJlZHVjZXIsIGNvbnRleHQsIHRydWUpO1xuICB9LFxuXG4gIC8vIEFuICdhdHRyaWJ1dGUnIGlzIGEgdmFsdWUgdGhhdCBpcyBjYWxjdWxhdGVkIGJ5IGludm9raW5nIGEgdmlzaXRvclxuICAvLyBmdW5jdGlvbiBvbiBhIG5vZGUuIFRoZSBmaXJzdCBhcmd1bWVudCBvZiB0aGUgdmlzaXRvciBpcyBhIGNvbGxlY3Rpb25cbiAgLy8gb2YgdGhlIGF0dHJpYnV0ZSB2YWx1ZXMgZm9yIHRoZSBub2RlJ3MgY2hpbGRyZW4uIFRoZXNlIGFyZSBjYWxjdWxhdGVkXG4gIC8vIGxhemlseSAtLSBpbiB0aGlzIHdheSB0aGUgdmlzaXRvciBjYW4gZGVjaWRlIGluIHdoYXQgb3JkZXIgdG8gdmlzaXQgdGhlXG4gIC8vIHN1YnRyZWVzLlxuICBjcmVhdGVBdHRyaWJ1dGU6IGZ1bmN0aW9uKHZpc2l0b3IsIGRlZmF1bHRWYWx1ZSwgY29udGV4dCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbWVtbyA9IG5ldyBXZWFrTWFwKCk7XG4gICAgZnVuY3Rpb24gX3Zpc2l0KHN0YWNrLCB2YWx1ZSwga2V5LCBwYXJlbnQpIHtcbiAgICAgIGlmIChpc09iamVjdCh2YWx1ZSkgJiYgc3RhY2suaW5kZXhPZih2YWx1ZSkgPj0gMClcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQSBjeWNsZSB3YXMgZGV0ZWN0ZWQgYXQgJyArIHZhbHVlKTtcblxuICAgICAgaWYgKG1lbW8uaGFzKHZhbHVlKSlcbiAgICAgICAgcmV0dXJuIG1lbW8uZ2V0KHZhbHVlKTtcblxuICAgICAgdmFyIHN1YlJlc3VsdHM7XG4gICAgICB2YXIgdGFyZ2V0ID0gc2VsZi5fdHJhdmVyc2FsU3RyYXRlZ3kodmFsdWUpO1xuICAgICAgaWYgKGlzT2JqZWN0KHRhcmdldCkgJiYgT2JqZWN0LmtleXModGFyZ2V0KS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHN1YlJlc3VsdHMgPSB7fTtcbiAgICAgICAgZWFjaCh0YXJnZXQsIGZ1bmN0aW9uKGNoaWxkLCBrKSB7XG4gICAgICAgICAgZGVmaW5lRW51bWVyYWJsZVByb3BlcnR5KHN1YlJlc3VsdHMsIGssIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIF92aXNpdChjb3B5QW5kUHVzaChzdGFjayx2YWx1ZSksIGNoaWxkLCBrLCB2YWx1ZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgdmFyIHJlc3VsdCA9IHZpc2l0b3IuY2FsbChjb250ZXh0LCBzdWJSZXN1bHRzLCB2YWx1ZSwga2V5LCBwYXJlbnQpO1xuICAgICAgbWVtby5zZXQodmFsdWUsIHJlc3VsdCk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7IHJldHVybiBfdmlzaXQoW10sIG9iaik7IH07XG4gIH1cbn0pO1xuXG52YXIgV2Fsa2VyUHJvdG8gPSBXYWxrZXIucHJvdG90eXBlO1xuXG4vLyBTZXQgdXAgYSBmZXcgY29udmVuaWVudCBhbGlhc2VzLlxuV2Fsa2VyUHJvdG8uZWFjaCA9IFdhbGtlclByb3RvLnByZW9yZGVyO1xuV2Fsa2VyUHJvdG8uY29sbGVjdCA9IFdhbGtlclByb3RvLm1hcDtcbldhbGtlclByb3RvLmRldGVjdCA9IFdhbGtlclByb3RvLmZpbmQ7XG5XYWxrZXJQcm90by5zZWxlY3QgPSBXYWxrZXJQcm90by5maWx0ZXI7XG5cbi8vIEV4cG9ydCB0aGUgd2Fsa2VyIGNvbnN0cnVjdG9yLCBidXQgbWFrZSBpdCBiZWhhdmUgbGlrZSBhbiBpbnN0YW5jZS5cbldhbGtlci5fdHJhdmVyc2FsU3RyYXRlZ3kgPSBkZWZhdWx0VHJhdmVyc2FsO1xubW9kdWxlLmV4cG9ydHMgPSBleHRlbmQoV2Fsa2VyLCBXYWxrZXJQcm90byk7XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxubW9kdWxlLmV4cG9ydHMgPSBleHRlbmQ7XG5mdW5jdGlvbiBleHRlbmQob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCB0eXBlb2YgYWRkICE9PSAnb2JqZWN0JykgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gIH1cbiAgcmV0dXJuIG9yaWdpbjtcbn1cbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxMiBUaGUgUG9seW1lciBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYSBCU0Qtc3R5bGVcbiAqIGxpY2Vuc2UgdGhhdCBjYW4gYmUgZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZS5cbiAqL1xuXG5pZiAodHlwZW9mIFdlYWtNYXAgPT09ICd1bmRlZmluZWQnKSB7XG4gIChmdW5jdGlvbigpIHtcbiAgICB2YXIgZGVmaW5lUHJvcGVydHkgPSBPYmplY3QuZGVmaW5lUHJvcGVydHk7XG4gICAgdmFyIGNvdW50ZXIgPSBEYXRlLm5vdygpICUgMWU5O1xuXG4gICAgdmFyIFdlYWtNYXAgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMubmFtZSA9ICdfX3N0JyArIChNYXRoLnJhbmRvbSgpICogMWU5ID4+PiAwKSArIChjb3VudGVyKysgKyAnX18nKTtcbiAgICB9O1xuXG4gICAgV2Vha01hcC5wcm90b3R5cGUgPSB7XG4gICAgICBzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgICAgdmFyIGVudHJ5ID0ga2V5W3RoaXMubmFtZV07XG4gICAgICAgIGlmIChlbnRyeSAmJiBlbnRyeVswXSA9PT0ga2V5KVxuICAgICAgICAgIGVudHJ5WzFdID0gdmFsdWU7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBkZWZpbmVQcm9wZXJ0eShrZXksIHRoaXMubmFtZSwge3ZhbHVlOiBba2V5LCB2YWx1ZV0sIHdyaXRhYmxlOiB0cnVlfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfSxcbiAgICAgIGdldDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBlbnRyeTtcbiAgICAgICAgcmV0dXJuIChlbnRyeSA9IGtleVt0aGlzLm5hbWVdKSAmJiBlbnRyeVswXSA9PT0ga2V5ID9cbiAgICAgICAgICAgIGVudHJ5WzFdIDogdW5kZWZpbmVkO1xuICAgICAgfSxcbiAgICAgIGRlbGV0ZTogZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBlbnRyeSA9IGtleVt0aGlzLm5hbWVdO1xuICAgICAgICBpZiAoIWVudHJ5IHx8IGVudHJ5WzBdICE9PSBrZXkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgZW50cnlbMF0gPSBlbnRyeVsxXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgICAgaGFzOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGVudHJ5ID0ga2V5W3RoaXMubmFtZV07XG4gICAgICAgIGlmICghZW50cnkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIGVudHJ5WzBdID09PSBrZXk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIG1vZHVsZS5leHBvcnRzID0gV2Vha01hcDtcbiAgfSkoKTtcbn0gZWxzZSB7XG4gIG1vZHVsZS5leHBvcnRzID0gV2Vha01hcDtcbn1cbiIsIiFmdW5jdGlvbihlKXtpZihcIm9iamVjdFwiPT10eXBlb2YgZXhwb3J0cyYmXCJ1bmRlZmluZWRcIiE9dHlwZW9mIG1vZHVsZSltb2R1bGUuZXhwb3J0cz1lKCk7ZWxzZSBpZihcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQpZGVmaW5lKFtdLGUpO2Vsc2V7dmFyIGY7XCJ1bmRlZmluZWRcIiE9dHlwZW9mIHdpbmRvdz9mPXdpbmRvdzpcInVuZGVmaW5lZFwiIT10eXBlb2YgZ2xvYmFsP2Y9Z2xvYmFsOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBzZWxmJiYoZj1zZWxmKSxmLnBtPWUoKX19KGZ1bmN0aW9uKCl7dmFyIGRlZmluZSxtb2R1bGUsZXhwb3J0cztyZXR1cm4gKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkoezE6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xudmFyIGl0ZXJhYmxlID0gX2RlcmVxXygnLi9saWIvaXRlcmFibGUnKTtcbnZhciBpc0l0ZXJhYmxlID0gaXRlcmFibGUuaXNJdGVyYWJsZTtcbnZhciB0b0FycmF5ID0gaXRlcmFibGUudG9BcnJheTtcblxudmFyIEFycmF5UHJvdG8gPSBBcnJheS5wcm90b3R5cGU7XG5cbi8vIE1hdGNoRmFpbHVyZVxuLy8gLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIE1hdGNoRmFpbHVyZSh2YWx1ZSwgc3RhY2spIHtcbiAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICB0aGlzLnN0YWNrID0gc3RhY2s7XG59XG5cbk1hdGNoRmFpbHVyZS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICdtYXRjaCBmYWlsdXJlJztcbn07XG5cbi8vIFBhdHRlcm5cbi8vIC0tLS0tLS1cblxuZnVuY3Rpb24gUGF0dGVybigpIHt9XG5cbi8vIENyZWF0ZXMgYSBjdXN0b20gUGF0dGVybiBjbGFzcy4gSWYgYHByb3BzYCBoYXMgYW4gJ2luaXQnIHByb3BlcnR5LCBpdCB3aWxsXG4vLyBiZSBjYWxsZWQgdG8gaW5pdGlhbGl6ZSBuZXdseS1jcmVhdGVkIGluc3RhbmNlcy4gQWxsIG90aGVyIHByb3BlcnRpZXMgaW5cbi8vIGBwcm9wc2Agd2lsbCBiZSBjb3BpZWQgdG8gdGhlIHByb3RvdHlwZSBvZiB0aGUgbmV3IGNvbnN0cnVjdG9yLlxuUGF0dGVybi5leHRlbmQgPSBmdW5jdGlvbihwcm9wcykge1xuICB2YXIgcHJvdG8gPSBjdG9yLnByb3RvdHlwZSA9IG5ldyBQYXR0ZXJuKCk7XG4gIGZvciAodmFyIGsgaW4gcHJvcHMpIHtcbiAgICBpZiAoayAhPT0gJ2luaXQnICYmIGsgIT0gJ21hdGNoJykge1xuICAgICAgcHJvdG9ba10gPSBwcm9wc1trXTtcbiAgICB9XG4gIH1cbiAgZW5zdXJlKHR5cGVvZiBwcm9wcy5tYXRjaCA9PT0gJ2Z1bmN0aW9uJywgXCJQYXR0ZXJucyBtdXN0IGhhdmUgYSAnbWF0Y2gnIG1ldGhvZFwiKTtcbiAgcHJvdG8uX21hdGNoID0gcHJvcHMubWF0Y2g7XG5cbiAgZnVuY3Rpb24gY3RvcigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCEoc2VsZiBpbnN0YW5jZW9mIGN0b3IpKSB7XG4gICAgICBzZWxmID0gT2JqZWN0LmNyZWF0ZShwcm90byk7XG4gICAgfVxuICAgIGlmICgnaW5pdCcgaW4gcHJvcHMpIHtcbiAgICAgIHByb3BzLmluaXQuYXBwbHkoc2VsZiwgQXJyYXlQcm90by5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuICAgIH1cbiAgICBlbnN1cmUodHlwZW9mIHNlbGYuYXJpdHkgPT09ICdudW1iZXInLCBcIlBhdHRlcm5zIG11c3QgaGF2ZSBhbiAnYXJpdHknIHByb3BlcnR5XCIpO1xuICAgIHJldHVybiBzZWxmO1xuICB9XG4gIGN0b3IuZnJvbUFycmF5ID0gZnVuY3Rpb24oYXJyKSB7IHJldHVybiBjdG9yLmFwcGx5KG51bGwsIGFycik7IH07XG4gIHJldHVybiBjdG9yO1xufTtcblxuLy8gRXhwb3NlIHNvbWUgdXNlZnVsIGZ1bmN0aW9ucyBhcyBpbnN0YW5jZSBtZXRob2RzIG9uIFBhdHRlcm4uXG5QYXR0ZXJuLnByb3RvdHlwZS5wZXJmb3JtTWF0Y2ggPSBwZXJmb3JtTWF0Y2g7XG5QYXR0ZXJuLnByb3RvdHlwZS5nZXRBcml0eSA9IGdldEFyaXR5O1xuXG4vLyBXcmFwcyB0aGUgdXNlci1zcGVjaWZpZWQgYG1hdGNoYCBmdW5jdGlvbiB3aXRoIHNvbWUgZXh0cmEgY2hlY2tzLlxuUGF0dGVybi5wcm90b3R5cGUubWF0Y2ggPSBmdW5jdGlvbih2YWx1ZSwgYmluZGluZ3MpIHtcbiAgdmFyIGJzID0gW107XG4gIHZhciBhbnMgPSB0aGlzLl9tYXRjaCh2YWx1ZSwgYnMpO1xuICBpZiAoYW5zKSB7XG4gICAgZW5zdXJlKGJzLmxlbmd0aCA9PT0gdGhpcy5hcml0eSxcbiAgICAgICAgICAgJ0luY29uc2lzdGVudCBwYXR0ZXJuIGFyaXR5OiBleHBlY3RlZCAnICsgdGhpcy5hcml0eSArICcsIGFjdHVhbCAnICsgYnMubGVuZ3RoKTtcbiAgICBiaW5kaW5ncy5wdXNoLmFwcGx5KGJpbmRpbmdzLCBicyk7XG4gIH1cbiAgcmV0dXJuIGFucztcbn07XG5cbi8vIFR5cGVzIG9mIHBhdHRlcm5cbi8vIC0tLS0tLS0tLS0tLS0tLS1cblxuTWF0Y2hlci5pcyA9IFBhdHRlcm4uZXh0ZW5kKHtcbiAgaW5pdDogZnVuY3Rpb24oZXhwZWN0ZWRWYWx1ZSkge1xuICAgIHRoaXMuZXhwZWN0ZWRWYWx1ZSA9IGV4cGVjdGVkVmFsdWU7XG4gIH0sXG4gIGFyaXR5OiAwLFxuICBtYXRjaDogZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gICAgcmV0dXJuIF9lcXVhbGl0eU1hdGNoKHZhbHVlLCB0aGlzLmV4cGVjdGVkVmFsdWUsIGJpbmRpbmdzKTtcbiAgfVxufSk7XG5cbk1hdGNoZXIuaXRlcmFibGUgPSBQYXR0ZXJuLmV4dGVuZCh7XG4gIGluaXQ6IGZ1bmN0aW9uKC8qIHBhdHRlcm4sIC4uLiAqLykge1xuICAgIHRoaXMucGF0dGVybnMgPSBBcnJheVByb3RvLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICB0aGlzLmFyaXR5ID0gdGhpcy5wYXR0ZXJuc1xuICAgICAgLm1hcChmdW5jdGlvbihwYXR0ZXJuKSB7IHJldHVybiBnZXRBcml0eShwYXR0ZXJuKTsgfSlcbiAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYTEsIGEyKSB7IHJldHVybiBhMSArIGEyOyB9LCAwKTtcbiAgfSxcbiAgbWF0Y2g6IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICAgIHJldHVybiBpc0l0ZXJhYmxlKHZhbHVlKSA/XG4gICAgICBfYXJyYXlNYXRjaCh0b0FycmF5KHZhbHVlKSwgdGhpcy5wYXR0ZXJucywgYmluZGluZ3MpIDpcbiAgICAgIGZhbHNlO1xuICB9XG59KTtcblxuTWF0Y2hlci5tYW55ID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbihwYXR0ZXJuKSB7XG4gICAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbiAgfSxcbiAgYXJpdHk6IDEsXG4gIG1hdGNoOiBmdW5jdGlvbih2YWx1ZSwgYmluZGluZ3MpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCInbWFueScgcGF0dGVybiB1c2VkIG91dHNpZGUgYXJyYXkgcGF0dGVyblwiKTtcbiAgfVxufSk7XG5cbk1hdGNoZXIub3B0ID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbihwYXR0ZXJuKSB7XG4gICAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbiAgfSxcbiAgYXJpdHk6IDEsXG4gIG1hdGNoOiBmdW5jdGlvbih2YWx1ZSwgYmluZGluZ3MpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCInb3B0JyBwYXR0ZXJuIHVzZWQgb3V0c2lkZSBhcnJheSBwYXR0ZXJuXCIpO1xuICB9XG59KTtcblxuTWF0Y2hlci50cmFucyA9IFBhdHRlcm4uZXh0ZW5kKHtcbiAgaW5pdDogZnVuY3Rpb24ocGF0dGVybiwgZnVuYykge1xuICAgIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG4gICAgdGhpcy5mdW5jID0gZnVuYztcbiAgICBlbnN1cmUoXG4gICAgICB0eXBlb2YgZnVuYyA9PT0gJ2Z1bmN0aW9uJyAmJiBmdW5jLmxlbmd0aCA9PT0gZ2V0QXJpdHkocGF0dGVybiksXG4gICAgICAnZnVuYyBtdXN0IGJlIGEgJyArIGdldEFyaXR5KHBhdHRlcm4pICsgJy1hcmd1bWVudCBmdW5jdGlvbidcbiAgICApO1xuICB9LFxuICBhcml0eTogMSxcbiAgbWF0Y2g6IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICAgIHZhciBicyA9IFtdO1xuICAgIGlmIChwZXJmb3JtTWF0Y2godmFsdWUsIHRoaXMucGF0dGVybiwgYnMpKSB7XG4gICAgICB2YXIgYW5zID0gdGhpcy5mdW5jLmFwcGx5KHRoaXMudGhpc09iaiwgYnMpO1xuICAgICAgYmluZGluZ3MucHVzaChhbnMpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufSk7XG5cbk1hdGNoZXIud2hlbiA9IFBhdHRlcm4uZXh0ZW5kKHtcbiAgaW5pdDogZnVuY3Rpb24ocGF0dGVybiwgcHJlZGljYXRlKSB7XG4gICAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbiAgICB0aGlzLnByZWRpY2F0ZSA9IHByZWRpY2F0ZTtcbiAgICB0aGlzLmFyaXR5ID0gZ2V0QXJpdHkocGF0dGVybik7XG4gICAgZW5zdXJlKFxuICAgICAgdHlwZW9mIHByZWRpY2F0ZSA9PT0gJ2Z1bmN0aW9uJyAmJiBwcmVkaWNhdGUubGVuZ3RoID09PSB0aGlzLmFyaXR5LFxuICAgICAgJ3ByZWRpY2F0ZSBtdXN0IGJlIGEgJyArIHRoaXMuYXJpdHkgKyAnLWFyZ3VtZW50IGZ1bmN0aW9uJ1xuICAgICk7XG4gIH0sXG4gIG1hdGNoOiBmdW5jdGlvbih2YWx1ZSwgYmluZGluZ3MpIHtcbiAgICB2YXIgYnMgPSBbXTtcbiAgICBpZiAocGVyZm9ybU1hdGNoKHZhbHVlLCB0aGlzLnBhdHRlcm4sIGJzKSAmJlxuICAgICAgICB0aGlzLnByZWRpY2F0ZS5hcHBseSh0aGlzLnRoaXNPYmosIGJzKSkge1xuICAgICAgYmluZGluZ3MucHVzaC5hcHBseShiaW5kaW5ncywgYnMpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufSk7XG5cbk1hdGNoZXIub3IgPSBQYXR0ZXJuLmV4dGVuZCh7XG4gIGluaXQ6IGZ1bmN0aW9uKC8qIHAxLCBwMiwgLi4uICovKSB7XG4gICAgZW5zdXJlKGFyZ3VtZW50cy5sZW5ndGggPj0gMSwgXCInb3InIHJlcXVpcmVzIGF0IGxlYXN0IG9uZSBwYXR0ZXJuXCIpO1xuICAgIHRoaXMucGF0dGVybnMgPSBBcnJheVByb3RvLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICB0aGlzLmFyaXR5ID0gZW5zdXJlVW5pZm9ybUFyaXR5KHRoaXMucGF0dGVybnMsICdvcicpO1xuICB9LFxuICBtYXRjaDogZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gICAgdmFyIHBhdHRlcm5zID0gdGhpcy5wYXR0ZXJucztcbiAgICB2YXIgYW5zID0gZmFsc2U7XG4gICAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgcGF0dGVybnMubGVuZ3RoICYmICFhbnM7IGlkeCsrKSB7XG4gICAgICBhbnMgPSBwZXJmb3JtTWF0Y2godmFsdWUsIHBhdHRlcm5zW2lkeF0sIGJpbmRpbmdzKTtcbiAgICB9XG4gICAgcmV0dXJuIGFucztcbiAgfSxcbn0pO1xuXG5NYXRjaGVyLmFuZCA9IFBhdHRlcm4uZXh0ZW5kKHtcbiAgaW5pdDogZnVuY3Rpb24oLyogcDEsIHAyLCAuLi4gKi8pIHtcbiAgICBlbnN1cmUoYXJndW1lbnRzLmxlbmd0aCA+PSAxLCBcIidhbmQnIHJlcXVpcmVzIGF0IGxlYXN0IG9uZSBwYXR0ZXJuXCIpO1xuICAgIHRoaXMucGF0dGVybnMgPSBBcnJheVByb3RvLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICB0aGlzLmFyaXR5ID0gdGhpcy5wYXR0ZXJucy5yZWR1Y2UoZnVuY3Rpb24oc3VtLCBwKSB7XG4gICAgICByZXR1cm4gc3VtICsgZ2V0QXJpdHkocCk7IH0sXG4gICAgMCk7XG4gIH0sXG4gIG1hdGNoOiBmdW5jdGlvbih2YWx1ZSwgYmluZGluZ3MpIHtcbiAgICB2YXIgcGF0dGVybnMgPSB0aGlzLnBhdHRlcm5zO1xuICAgIHZhciBhbnMgPSB0cnVlO1xuICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IHBhdHRlcm5zLmxlbmd0aCAmJiBhbnM7IGlkeCsrKSB7XG4gICAgICBhbnMgPSBwZXJmb3JtTWF0Y2godmFsdWUsIHBhdHRlcm5zW2lkeF0sIGJpbmRpbmdzKTtcbiAgICB9XG4gICAgcmV0dXJuIGFucztcbiAgfVxufSk7XG5cbi8vIEhlbHBlcnNcbi8vIC0tLS0tLS1cblxuZnVuY3Rpb24gX2FycmF5TWF0Y2godmFsdWUsIHBhdHRlcm4sIGJpbmRpbmdzKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmFyIHZJZHggPSAwO1xuICB2YXIgcElkeCA9IDA7XG4gIHdoaWxlIChwSWR4IDwgcGF0dGVybi5sZW5ndGgpIHtcbiAgICB2YXIgcCA9IHBhdHRlcm5bcElkeCsrXTtcbiAgICBpZiAocCBpbnN0YW5jZW9mIE1hdGNoZXIubWFueSkge1xuICAgICAgcCA9IHAucGF0dGVybjtcbiAgICAgIHZhciB2cyA9IFtdO1xuICAgICAgd2hpbGUgKHZJZHggPCB2YWx1ZS5sZW5ndGggJiYgcGVyZm9ybU1hdGNoKHZhbHVlW3ZJZHhdLCBwLCB2cykpIHtcbiAgICAgICAgdklkeCsrO1xuICAgICAgfVxuICAgICAgYmluZGluZ3MucHVzaCh2cyk7XG4gICAgfSBlbHNlIGlmIChwIGluc3RhbmNlb2YgTWF0Y2hlci5vcHQpIHtcbiAgICAgIHZhciBhbnMgPSB2SWR4IDwgdmFsdWUubGVuZ3RoID8gcGVyZm9ybU1hdGNoKHZhbHVlW3ZJZHhdLCBwLnBhdHRlcm4sIFtdKSA6IGZhbHNlO1xuICAgICAgaWYgKGFucykge1xuICAgICAgICBiaW5kaW5ncy5wdXNoKGFucyk7XG4gICAgICAgIHZJZHgrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJpbmRpbmdzLnB1c2godW5kZWZpbmVkKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHBlcmZvcm1NYXRjaCh2YWx1ZVt2SWR4XSwgcCwgYmluZGluZ3MpKSB7XG4gICAgICB2SWR4Kys7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHZJZHggPT09IHZhbHVlLmxlbmd0aCAmJiBwSWR4ID09PSBwYXR0ZXJuLmxlbmd0aDtcbn1cblxuZnVuY3Rpb24gX29iak1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncykge1xuICBmb3IgKHZhciBrIGluIHBhdHRlcm4pIHtcbiAgICBpZiAocGF0dGVybi5oYXNPd25Qcm9wZXJ0eShrKSAmJlxuICAgICAgICAhKGsgaW4gdmFsdWUpIHx8XG4gICAgICAgICFwZXJmb3JtTWF0Y2godmFsdWVba10sIHBhdHRlcm5ba10sIGJpbmRpbmdzKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gX2Z1bmN0aW9uTWF0Y2godmFsdWUsIGZ1bmMsIGJpbmRpbmdzKSB7XG4gIGlmIChmdW5jKHZhbHVlKSkge1xuICAgIGJpbmRpbmdzLnB1c2godmFsdWUpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gX2VxdWFsaXR5TWF0Y2godmFsdWUsIHBhdHRlcm4sIGJpbmRpbmdzKSB7XG4gIHJldHVybiB2YWx1ZSA9PT0gcGF0dGVybjtcbn1cblxuZnVuY3Rpb24gX3JlZ0V4cE1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncykge1xuICB2YXIgYW5zID0gcGF0dGVybi5leGVjKHZhbHVlKTtcbiAgaWYgKGFucyAhPT0gbnVsbCAmJiBhbnNbMF0gPT09IHZhbHVlKSB7XG4gICAgYmluZGluZ3MucHVzaChhbnMpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gcGVyZm9ybU1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncykge1xuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIFBhdHRlcm4pIHtcbiAgICByZXR1cm4gcGF0dGVybi5tYXRjaCh2YWx1ZSwgYmluZGluZ3MpO1xuICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocGF0dGVybikpIHtcbiAgICByZXR1cm4gX2FycmF5TWF0Y2godmFsdWUsIHBhdHRlcm4sIGJpbmRpbmdzKTtcbiAgfSBlbHNlIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgcmV0dXJuIF9yZWdFeHBNYXRjaCh2YWx1ZSwgcGF0dGVybiwgYmluZGluZ3MpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBwYXR0ZXJuID09PSAnb2JqZWN0JyAmJiBwYXR0ZXJuICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIF9vYmpNYXRjaCh2YWx1ZSwgcGF0dGVybiwgYmluZGluZ3MpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBwYXR0ZXJuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIF9mdW5jdGlvbk1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncyk7XG4gIH1cbiAgcmV0dXJuIF9lcXVhbGl0eU1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncyk7XG59XG5cbmZ1bmN0aW9uIGdldEFyaXR5KHBhdHRlcm4pIHtcbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBQYXR0ZXJuKSB7XG4gICAgcmV0dXJuIHBhdHRlcm4uYXJpdHk7XG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShwYXR0ZXJuKSkge1xuICAgIHJldHVybiBwYXR0ZXJuXG4gICAgICAubWFwKGZ1bmN0aW9uKHApIHsgcmV0dXJuIGdldEFyaXR5KHApOyB9KVxuICAgICAgLnJlZHVjZShmdW5jdGlvbihhMSwgYTIpIHsgcmV0dXJuIGExICsgYTI7IH0sIDApO1xuICB9IGVsc2UgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICByZXR1cm4gMTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgcGF0dGVybiA9PT0gJ29iamVjdCcgJiYgcGF0dGVybiAhPT0gbnVsbCkge1xuICAgIHZhciBhbnMgPSAwO1xuICAgIGZvciAodmFyIGsgaW4gcGF0dGVybikge1xuICAgICAgaWYgKHBhdHRlcm4uaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgYW5zICs9IGdldEFyaXR5KHBhdHRlcm5ba10pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYW5zO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBwYXR0ZXJuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIDE7XG4gIH1cbiAgcmV0dXJuIDA7XG59XG5cbmZ1bmN0aW9uIGVuc3VyZVVuaWZvcm1Bcml0eShwYXR0ZXJucywgb3ApIHtcbiAgdmFyIHJlc3VsdCA9IGdldEFyaXR5KHBhdHRlcm5zWzBdKTtcbiAgZm9yICh2YXIgaWR4ID0gMTsgaWR4IDwgcGF0dGVybnMubGVuZ3RoOyBpZHgrKykge1xuICAgIHZhciBhID0gZ2V0QXJpdHkocGF0dGVybnNbaWR4XSk7XG4gICAgaWYgKGEgIT09IHJlc3VsdCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKG9wICsgJzogZXhwZWN0ZWQgYXJpdHkgJyArIHJlc3VsdCArICcgYXQgaW5kZXggJyArIGlkeCArICcsIGdvdCAnICsgYSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGVuc3VyZShjb25kLCBtZXNzYWdlKSB7XG4gIGlmICghY29uZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgfVxufVxuXG4vLyBNYXRjaGVyXG4vLyAtLS0tLS0tXG5cbmZ1bmN0aW9uIE1hdGNoZXIoKSB7XG4gIHRoaXMucGF0dGVybnMgPSBbXTtcbiAgdGhpcy50aGlzT2JqID0gdW5kZWZpbmVkO1xufVxuXG5NYXRjaGVyLnByb3RvdHlwZS53aXRoVGhpcyA9IGZ1bmN0aW9uKG9iaikge1xuICB0aGlzLnRoaXNPYmogPSBvYmo7XG4gIHJldHVybiB0aGlzO1xufTtcblxuTWF0Y2hlci5wcm90b3R5cGUuYWRkQ2FzZSA9IGZ1bmN0aW9uKHBhdHRlcm4sIG9wdEZ1bmMpIHtcbiAgdGhpcy5wYXR0ZXJucy5wdXNoKE1hdGNoZXIudHJhbnMocGF0dGVybiwgb3B0RnVuYykpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbk1hdGNoZXIucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgZW5zdXJlKHRoaXMucGF0dGVybnMubGVuZ3RoID4gMCwgJ01hdGNoZXIgcmVxdWlyZXMgYXQgbGVhc3Qgb25lIGNhc2UnKTtcblxuICB2YXIgYmluZGluZ3MgPSBbXTtcbiAgaWYgKE1hdGNoZXIub3IuZnJvbUFycmF5KHRoaXMucGF0dGVybnMpLm1hdGNoKHZhbHVlLCBiaW5kaW5ncykpIHtcbiAgICByZXR1cm4gYmluZGluZ3NbMF07XG4gIH1cbiAgdGhyb3cgbmV3IE1hdGNoRmFpbHVyZSh2YWx1ZSwgbmV3IEVycm9yKCkuc3RhY2spO1xufTtcblxuTWF0Y2hlci5wcm90b3R5cGUudG9GdW5jdGlvbiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiBmdW5jdGlvbih2YWx1ZSkgeyByZXR1cm4gc2VsZi5tYXRjaCh2YWx1ZSk7IH07XG59O1xuXG4vLyBQcmltaXRpdmUgcGF0dGVybnNcblxuTWF0Y2hlci5fICAgICAgPSBmdW5jdGlvbih4KSB7IHJldHVybiB0cnVlOyB9O1xuTWF0Y2hlci5ib29sICAgPSBmdW5jdGlvbih4KSB7IHJldHVybiB0eXBlb2YgeCA9PT0gJ2Jvb2xlYW4nOyB9O1xuTWF0Y2hlci5udW1iZXIgPSBmdW5jdGlvbih4KSB7IHJldHVybiB0eXBlb2YgeCA9PT0gJ251bWJlcic7IH07XG5NYXRjaGVyLnN0cmluZyA9IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHR5cGVvZiB4ID09PSAnc3RyaW5nJzsgfTtcbk1hdGNoZXIuY2hhciAgID0gZnVuY3Rpb24oeCkgeyByZXR1cm4gdHlwZW9mIHggPT09ICdzdHJpbmcnICYmIHgubGVuZ3RoID09PSAwOyB9O1xuXG4vLyBPcGVyYXRvcnNcblxuTWF0Y2hlci5pbnN0YW5jZU9mID0gZnVuY3Rpb24oY2xhenopIHsgcmV0dXJuIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggaW5zdGFuY2VvZiBjbGF6ejsgfTsgfTtcblxuTWF0Y2hlci5NYXRjaEZhaWx1cmUgPSBNYXRjaEZhaWx1cmU7XG5cbi8vIFRlcnNlIGludGVyZmFjZVxuLy8gLS0tLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIG1hdGNoKHZhbHVlIC8qICwgcGF0MSwgZnVuMSwgcGF0MiwgZnVuMiwgLi4uICovKSB7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuXG4gIC8vIFdoZW4gY2FsbGVkIHdpdGgganVzdCBhIHZhbHVlIGFuZCBhIHBhdHRlcm4sIHJldHVybiB0aGUgYmluZGluZ3MgaWZcbiAgLy8gdGhlIG1hdGNoIHdhcyBzdWNjZXNzZnVsLCBvdGhlcndpc2UgbnVsbC5cbiAgaWYgKGFyZ3MubGVuZ3RoID09PSAyKSB7XG4gICAgdmFyIGJpbmRpbmdzID0gW107XG4gICAgaWYgKHBlcmZvcm1NYXRjaCh2YWx1ZSwgYXJndW1lbnRzWzFdLCBiaW5kaW5ncykpIHtcbiAgICAgIHJldHVybiBiaW5kaW5ncztcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBlbnN1cmUoXG4gICAgICBhcmdzLmxlbmd0aCA+IDIgJiYgYXJncy5sZW5ndGggJSAyID09PSAxLFxuICAgICAgJ21hdGNoIGNhbGxlZCB3aXRoIGludmFsaWQgYXJndW1lbnRzJyk7XG4gIHZhciBtID0gbmV3IE1hdGNoZXIoKTtcbiAgZm9yICh2YXIgaWR4ID0gMTsgaWR4IDwgYXJncy5sZW5ndGg7IGlkeCArPSAyKSB7XG4gICAgdmFyIHBhdHRlcm4gPSBhcmdzW2lkeF07XG4gICAgdmFyIGZ1bmMgPSBhcmdzW2lkeCArIDFdO1xuICAgIG0uYWRkQ2FzZShwYXR0ZXJuLCBmdW5jKTtcbiAgfVxuICByZXR1cm4gbS5tYXRjaCh2YWx1ZSk7XG59XG5cbi8vIEV4cG9ydHNcbi8vIC0tLS0tLS1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIE1hdGNoZXI6IE1hdGNoZXIsXG4gIG1hdGNoOiBtYXRjaCxcbiAgUGF0dGVybjogUGF0dGVyblxufTtcblxufSx7XCIuL2xpYi9pdGVyYWJsZVwiOjJ9XSwyOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcbi8qIGdsb2JhbCBTeW1ib2wgKi9cblxudmFyIElURVJBVE9SX1NZTUJPTCA9IHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgU3ltYm9sLml0ZXJhdG9yO1xudmFyIEZBS0VfSVRFUkFUT1JfU1lNQk9MID0gJ0BAaXRlcmF0b3InO1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vLyBIZWxwZXJzXG4vLyAtLS0tLS0tXG5cbmZ1bmN0aW9uIGlzU3RyaW5nKG9iaikge1xuXHRyZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBTdHJpbmddJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIob2JqKSB7XG5cdHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IE51bWJlcl0nO1xufVxuXG5mdW5jdGlvbiBpc0FycmF5TGlrZShvYmopIHtcblx0cmV0dXJuIGlzTnVtYmVyKG9iai5sZW5ndGgpICYmICFpc1N0cmluZyhvYmopO1xufVxuXG4vLyBBcnJheUl0ZXJhdG9yXG4vLyAtLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIEFycmF5SXRlcmF0b3IoaXRlcmF0ZWUpIHtcblx0dGhpcy5faXRlcmF0ZWUgPSBpdGVyYXRlZTtcblx0dGhpcy5faSA9IDA7XG5cdHRoaXMuX2xlbiA9IGl0ZXJhdGVlLmxlbmd0aDtcbn1cblxuQXJyYXlJdGVyYXRvci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uKCkge1xuXHRpZiAodGhpcy5faSA8IHRoaXMuX2xlbikge1xuXHRcdHJldHVybiB7IGRvbmU6IGZhbHNlLCB2YWx1ZTogdGhpcy5faXRlcmF0ZWVbdGhpcy5faSsrXSB9O1xuXHR9XG5cdHJldHVybiB7IGRvbmU6IHRydWUgfTtcbn07XG5cbkFycmF5SXRlcmF0b3IucHJvdG90eXBlW0ZBS0VfSVRFUkFUT1JfU1lNQk9MXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfTtcblxuaWYgKElURVJBVE9SX1NZTUJPTCkge1xuXHRBcnJheUl0ZXJhdG9yLnByb3RvdHlwZVtJVEVSQVRPUl9TWU1CT0xdID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9O1xufVxuXG4vLyBFeHBvcnRzXG4vLyAtLS0tLS0tXG5cbi8vIFJldHVybnMgYW4gaXRlcmF0b3IgKGFuIG9iamVjdCB0aGF0IGhhcyBhIG5leHQoKSBtZXRob2QpIGZvciBgb2JqYC5cbi8vIEZpcnN0LCBpdCB0cmllcyB0byB1c2UgdGhlIEVTNiBpdGVyYXRvciBwcm90b2NvbCAoU3ltYm9sLml0ZXJhdG9yKS5cbi8vIEl0IGZhbGxzIGJhY2sgdG8gdGhlICdmYWtlJyBpdGVyYXRvciBwcm90b2NvbCAoJ0BAaXRlcmF0b3InKSB0aGF0IGlzXG4vLyB1c2VkIGJ5IHNvbWUgbGlicmFyaWVzIChlLmcuIGltbXV0YWJsZS1qcykuIEZpbmFsbHksIGlmIHRoZSBvYmplY3QgaGFzXG4vLyBhIG51bWVyaWMgYGxlbmd0aGAgcHJvcGVydHkgYW5kIGlzIG5vdCBhIHN0cmluZywgaXQgaXMgdHJlYXRlZCBhcyBhbiBBcnJheVxuLy8gdG8gYmUgaXRlcmF0ZWQgdXNpbmcgYW4gQXJyYXlJdGVyYXRvci5cbmZ1bmN0aW9uIGdldEl0ZXJhdG9yKG9iaikge1xuXHRpZiAoIW9iaikge1xuXHRcdHJldHVybjtcblx0fVxuXHRpZiAoSVRFUkFUT1JfU1lNQk9MICYmIHR5cGVvZiBvYmpbSVRFUkFUT1JfU1lNQk9MXSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdHJldHVybiBvYmpbSVRFUkFUT1JfU1lNQk9MXSgpO1xuXHR9XG5cdGlmICh0eXBlb2Ygb2JqW0ZBS0VfSVRFUkFUT1JfU1lNQk9MXSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdHJldHVybiBvYmpbRkFLRV9JVEVSQVRPUl9TWU1CT0xdKCk7XG5cdH1cblx0aWYgKGlzQXJyYXlMaWtlKG9iaikpIHtcblx0XHRyZXR1cm4gbmV3IEFycmF5SXRlcmF0b3Iob2JqKTtcblx0fVxufVxuXG5mdW5jdGlvbiBpc0l0ZXJhYmxlKG9iaikge1xuXHRpZiAob2JqKSB7XG5cdFx0cmV0dXJuIChJVEVSQVRPUl9TWU1CT0wgJiYgdHlwZW9mIG9ialtJVEVSQVRPUl9TWU1CT0xdID09PSAnZnVuY3Rpb24nKSB8fFxuXHRcdFx0XHRcdCB0eXBlb2Ygb2JqW0ZBS0VfSVRFUkFUT1JfU1lNQk9MXSA9PT0gJ2Z1bmN0aW9uJyB8fFxuXHRcdFx0XHRcdCBpc0FycmF5TGlrZShvYmopO1xuXHR9XG5cdHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gdG9BcnJheShpdGVyYWJsZSkge1xuXHR2YXIgaXRlciA9IGdldEl0ZXJhdG9yKGl0ZXJhYmxlKTtcblx0aWYgKGl0ZXIpIHtcblx0XHR2YXIgcmVzdWx0ID0gW107XG5cdFx0dmFyIG5leHQ7XG5cdFx0d2hpbGUgKCEobmV4dCA9IGl0ZXIubmV4dCgpKS5kb25lKSB7XG5cdFx0XHRyZXN1bHQucHVzaChuZXh0LnZhbHVlKTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0Z2V0SXRlcmF0b3I6IGdldEl0ZXJhdG9yLFxuXHRpc0l0ZXJhYmxlOiBpc0l0ZXJhYmxlLFxuXHR0b0FycmF5OiB0b0FycmF5XG59O1xuXG59LHt9XX0se30sWzFdKSgxKVxufSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OWljbTkzYzJWeWFXWjVMMjV2WkdWZmJXOWtkV3hsY3k5aWNtOTNjMlZ5TFhCaFkyc3ZYM0J5Wld4MVpHVXVhbk1pTENJdlZYTmxjbk12WkhWaWNtOTVMMlJsZGk5alpHY3ZjR0YwZEdWeWJpMXRZWFJqYUM5cGJtUmxlQzVxY3lJc0lpOVZjMlZ5Y3k5a2RXSnliM2t2WkdWMkwyTmtaeTl3WVhSMFpYSnVMVzFoZEdOb0wyeHBZaTlwZEdWeVlXSnNaUzVxY3lKZExDSnVZVzFsY3lJNlcxMHNJbTFoY0hCcGJtZHpJam9pUVVGQlFUdEJRMEZCTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUczdRVU16V1VFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFTSXNJbVpwYkdVaU9pSm5aVzVsY21GMFpXUXVhbk1pTENKemIzVnlZMlZTYjI5MElqb2lJaXdpYzI5MWNtTmxjME52Ym5SbGJuUWlPbHNpS0daMWJtTjBhVzl1SUdVb2RDeHVMSElwZTJaMWJtTjBhVzl1SUhNb2J5eDFLWHRwWmlnaGJsdHZYU2w3YVdZb0lYUmJiMTBwZTNaaGNpQmhQWFI1Y0dWdlppQnlaWEYxYVhKbFBUMWNJbVoxYm1OMGFXOXVYQ0ltSm5KbGNYVnBjbVU3YVdZb0lYVW1KbUVwY21WMGRYSnVJR0VvYnl3aE1DazdhV1lvYVNseVpYUjFjbTRnYVNodkxDRXdLVHQyWVhJZ1pqMXVaWGNnUlhKeWIzSW9YQ0pEWVc1dWIzUWdabWx1WkNCdGIyUjFiR1VnSjF3aUsyOHJYQ0luWENJcE8zUm9jbTkzSUdZdVkyOWtaVDFjSWsxUFJGVk1SVjlPVDFSZlJrOVZUa1JjSWl4bWZYWmhjaUJzUFc1YmIxMDllMlY0Y0c5eWRITTZlMzE5TzNSYmIxMWJNRjB1WTJGc2JDaHNMbVY0Y0c5eWRITXNablZ1WTNScGIyNG9aU2w3ZG1GeUlHNDlkRnR2WFZzeFhWdGxYVHR5WlhSMWNtNGdjeWh1UDI0NlpTbDlMR3dzYkM1bGVIQnZjblJ6TEdVc2RDeHVMSElwZlhKbGRIVnliaUJ1VzI5ZExtVjRjRzl5ZEhOOWRtRnlJR2s5ZEhsd1pXOW1JSEpsY1hWcGNtVTlQVndpWm5WdVkzUnBiMjVjSWlZbWNtVnhkV2x5WlR0bWIzSW9kbUZ5SUc4OU1EdHZQSEl1YkdWdVozUm9PMjhyS3lsektISmJiMTBwTzNKbGRIVnliaUJ6ZlNraUxDSjJZWElnYVhSbGNtRmliR1VnUFNCeVpYRjFhWEpsS0NjdUwyeHBZaTlwZEdWeVlXSnNaU2NwTzF4dWRtRnlJR2x6U1hSbGNtRmliR1VnUFNCcGRHVnlZV0pzWlM1cGMwbDBaWEpoWW14bE8xeHVkbUZ5SUhSdlFYSnlZWGtnUFNCcGRHVnlZV0pzWlM1MGIwRnljbUY1TzF4dVhHNTJZWElnUVhKeVlYbFFjbTkwYnlBOUlFRnljbUY1TG5CeWIzUnZkSGx3WlR0Y2JseHVMeThnVFdGMFkyaEdZV2xzZFhKbFhHNHZMeUF0TFMwdExTMHRMUzB0TFMxY2JseHVablZ1WTNScGIyNGdUV0YwWTJoR1lXbHNkWEpsS0haaGJIVmxMQ0J6ZEdGamF5a2dlMXh1SUNCMGFHbHpMblpoYkhWbElEMGdkbUZzZFdVN1hHNGdJSFJvYVhNdWMzUmhZMnNnUFNCemRHRmphenRjYm4xY2JseHVUV0YwWTJoR1lXbHNkWEpsTG5CeWIzUnZkSGx3WlM1MGIxTjBjbWx1WnlBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNCeVpYUjFjbTRnSjIxaGRHTm9JR1poYVd4MWNtVW5PMXh1ZlR0Y2JseHVMeThnVUdGMGRHVnlibHh1THk4Z0xTMHRMUzB0TFZ4dVhHNW1kVzVqZEdsdmJpQlFZWFIwWlhKdUtDa2dlMzFjYmx4dUx5OGdRM0psWVhSbGN5QmhJR04xYzNSdmJTQlFZWFIwWlhKdUlHTnNZWE56TGlCSlppQmdjSEp2Y0hOZ0lHaGhjeUJoYmlBbmFXNXBkQ2NnY0hKdmNHVnlkSGtzSUdsMElIZHBiR3hjYmk4dklHSmxJR05oYkd4bFpDQjBieUJwYm1sMGFXRnNhWHBsSUc1bGQyeDVMV055WldGMFpXUWdhVzV6ZEdGdVkyVnpMaUJCYkd3Z2IzUm9aWElnY0hKdmNHVnlkR2xsY3lCcGJseHVMeThnWUhCeWIzQnpZQ0IzYVd4c0lHSmxJR052Y0dsbFpDQjBieUIwYUdVZ2NISnZkRzkwZVhCbElHOW1JSFJvWlNCdVpYY2dZMjl1YzNSeWRXTjBiM0l1WEc1UVlYUjBaWEp1TG1WNGRHVnVaQ0E5SUdaMWJtTjBhVzl1S0hCeWIzQnpLU0I3WEc0Z0lIWmhjaUJ3Y205MGJ5QTlJR04wYjNJdWNISnZkRzkwZVhCbElEMGdibVYzSUZCaGRIUmxjbTRvS1R0Y2JpQWdabTl5SUNoMllYSWdheUJwYmlCd2NtOXdjeWtnZTF4dUlDQWdJR2xtSUNocklDRTlQU0FuYVc1cGRDY2dKaVlnYXlBaFBTQW5iV0YwWTJnbktTQjdYRzRnSUNBZ0lDQndjbTkwYjF0clhTQTlJSEJ5YjNCelcydGRPMXh1SUNBZ0lIMWNiaUFnZlZ4dUlDQmxibk4xY21Vb2RIbHdaVzltSUhCeWIzQnpMbTFoZEdOb0lEMDlQU0FuWm5WdVkzUnBiMjRuTENCY0lsQmhkSFJsY201eklHMTFjM1FnYUdGMlpTQmhJQ2R0WVhSamFDY2diV1YwYUc5a1hDSXBPMXh1SUNCd2NtOTBieTVmYldGMFkyZ2dQU0J3Y205d2N5NXRZWFJqYUR0Y2JseHVJQ0JtZFc1amRHbHZiaUJqZEc5eUtDa2dlMXh1SUNBZ0lIWmhjaUJ6Wld4bUlEMGdkR2hwY3p0Y2JpQWdJQ0JwWmlBb0lTaHpaV3htSUdsdWMzUmhibU5sYjJZZ1kzUnZjaWtwSUh0Y2JpQWdJQ0FnSUhObGJHWWdQU0JQWW1wbFkzUXVZM0psWVhSbEtIQnliM1J2S1R0Y2JpQWdJQ0I5WEc0Z0lDQWdhV1lnS0NkcGJtbDBKeUJwYmlCd2NtOXdjeWtnZTF4dUlDQWdJQ0FnY0hKdmNITXVhVzVwZEM1aGNIQnNlU2h6Wld4bUxDQkJjbkpoZVZCeWIzUnZMbk5zYVdObExtTmhiR3dvWVhKbmRXMWxiblJ6S1NrN1hHNGdJQ0FnZlZ4dUlDQWdJR1Z1YzNWeVpTaDBlWEJsYjJZZ2MyVnNaaTVoY21sMGVTQTlQVDBnSjI1MWJXSmxjaWNzSUZ3aVVHRjBkR1Z5Ym5NZ2JYVnpkQ0JvWVhabElHRnVJQ2RoY21sMGVTY2djSEp2Y0dWeWRIbGNJaWs3WEc0Z0lDQWdjbVYwZFhKdUlITmxiR1k3WEc0Z0lIMWNiaUFnWTNSdmNpNW1jbTl0UVhKeVlYa2dQU0JtZFc1amRHbHZiaWhoY25JcElIc2djbVYwZFhKdUlHTjBiM0l1WVhCd2JIa29iblZzYkN3Z1lYSnlLVHNnZlR0Y2JpQWdjbVYwZFhKdUlHTjBiM0k3WEc1OU8xeHVYRzR2THlCRmVIQnZjMlVnYzI5dFpTQjFjMlZtZFd3Z1puVnVZM1JwYjI1eklHRnpJR2x1YzNSaGJtTmxJRzFsZEdodlpITWdiMjRnVUdGMGRHVnliaTVjYmxCaGRIUmxjbTR1Y0hKdmRHOTBlWEJsTG5CbGNtWnZjbTFOWVhSamFDQTlJSEJsY21admNtMU5ZWFJqYUR0Y2JsQmhkSFJsY200dWNISnZkRzkwZVhCbExtZGxkRUZ5YVhSNUlEMGdaMlYwUVhKcGRIazdYRzVjYmk4dklGZHlZWEJ6SUhSb1pTQjFjMlZ5TFhOd1pXTnBabWxsWkNCZ2JXRjBZMmhnSUdaMWJtTjBhVzl1SUhkcGRHZ2djMjl0WlNCbGVIUnlZU0JqYUdWamEzTXVYRzVRWVhSMFpYSnVMbkJ5YjNSdmRIbHdaUzV0WVhSamFDQTlJR1oxYm1OMGFXOXVLSFpoYkhWbExDQmlhVzVrYVc1bmN5a2dlMXh1SUNCMllYSWdZbk1nUFNCYlhUdGNiaUFnZG1GeUlHRnVjeUE5SUhSb2FYTXVYMjFoZEdOb0tIWmhiSFZsTENCaWN5azdYRzRnSUdsbUlDaGhibk1wSUh0Y2JpQWdJQ0JsYm5OMWNtVW9Zbk11YkdWdVozUm9JRDA5UFNCMGFHbHpMbUZ5YVhSNUxGeHVJQ0FnSUNBZ0lDQWdJQ0FuU1c1amIyNXphWE4wWlc1MElIQmhkSFJsY200Z1lYSnBkSGs2SUdWNGNHVmpkR1ZrSUNjZ0t5QjBhR2x6TG1GeWFYUjVJQ3NnSnl3Z1lXTjBkV0ZzSUNjZ0t5QmljeTVzWlc1bmRHZ3BPMXh1SUNBZ0lHSnBibVJwYm1kekxuQjFjMmd1WVhCd2JIa29ZbWx1WkdsdVozTXNJR0p6S1R0Y2JpQWdmVnh1SUNCeVpYUjFjbTRnWVc1ek8xeHVmVHRjYmx4dUx5OGdWSGx3WlhNZ2IyWWdjR0YwZEdWeWJseHVMeThnTFMwdExTMHRMUzB0TFMwdExTMHRMVnh1WEc1TllYUmphR1Z5TG1seklEMGdVR0YwZEdWeWJpNWxlSFJsYm1Rb2UxeHVJQ0JwYm1sME9pQm1kVzVqZEdsdmJpaGxlSEJsWTNSbFpGWmhiSFZsS1NCN1hHNGdJQ0FnZEdocGN5NWxlSEJsWTNSbFpGWmhiSFZsSUQwZ1pYaHdaV04wWldSV1lXeDFaVHRjYmlBZ2ZTeGNiaUFnWVhKcGRIazZJREFzWEc0Z0lHMWhkR05vT2lCbWRXNWpkR2x2YmloMllXeDFaU3dnWW1sdVpHbHVaM01wSUh0Y2JpQWdJQ0J5WlhSMWNtNGdYMlZ4ZFdGc2FYUjVUV0YwWTJnb2RtRnNkV1VzSUhSb2FYTXVaWGh3WldOMFpXUldZV3gxWlN3Z1ltbHVaR2x1WjNNcE8xeHVJQ0I5WEc1OUtUdGNibHh1VFdGMFkyaGxjaTVwZEdWeVlXSnNaU0E5SUZCaGRIUmxjbTR1WlhoMFpXNWtLSHRjYmlBZ2FXNXBkRG9nWm5WdVkzUnBiMjRvTHlvZ2NHRjBkR1Z5Yml3Z0xpNHVJQ292S1NCN1hHNGdJQ0FnZEdocGN5NXdZWFIwWlhKdWN5QTlJRUZ5Y21GNVVISnZkRzh1YzJ4cFkyVXVZMkZzYkNoaGNtZDFiV1Z1ZEhNcE8xeHVJQ0FnSUhSb2FYTXVZWEpwZEhrZ1BTQjBhR2x6TG5CaGRIUmxjbTV6WEc0Z0lDQWdJQ0F1YldGd0tHWjFibU4wYVc5dUtIQmhkSFJsY200cElIc2djbVYwZFhKdUlHZGxkRUZ5YVhSNUtIQmhkSFJsY200cE95QjlLVnh1SUNBZ0lDQWdMbkpsWkhWalpTaG1kVzVqZEdsdmJpaGhNU3dnWVRJcElIc2djbVYwZFhKdUlHRXhJQ3NnWVRJN0lIMHNJREFwTzF4dUlDQjlMRnh1SUNCdFlYUmphRG9nWm5WdVkzUnBiMjRvZG1Gc2RXVXNJR0pwYm1ScGJtZHpLU0I3WEc0Z0lDQWdjbVYwZFhKdUlHbHpTWFJsY21GaWJHVW9kbUZzZFdVcElEOWNiaUFnSUNBZ0lGOWhjbkpoZVUxaGRHTm9LSFJ2UVhKeVlYa29kbUZzZFdVcExDQjBhR2x6TG5CaGRIUmxjbTV6TENCaWFXNWthVzVuY3lrZ09seHVJQ0FnSUNBZ1ptRnNjMlU3WEc0Z0lIMWNibjBwTzF4dVhHNU5ZWFJqYUdWeUxtMWhibmtnUFNCUVlYUjBaWEp1TG1WNGRHVnVaQ2g3WEc0Z0lHbHVhWFE2SUdaMWJtTjBhVzl1S0hCaGRIUmxjbTRwSUh0Y2JpQWdJQ0IwYUdsekxuQmhkSFJsY200Z1BTQndZWFIwWlhKdU8xeHVJQ0I5TEZ4dUlDQmhjbWwwZVRvZ01TeGNiaUFnYldGMFkyZzZJR1oxYm1OMGFXOXVLSFpoYkhWbExDQmlhVzVrYVc1bmN5a2dlMXh1SUNBZ0lIUm9jbTkzSUc1bGR5QkZjbkp2Y2loY0lpZHRZVzU1SnlCd1lYUjBaWEp1SUhWelpXUWdiM1YwYzJsa1pTQmhjbkpoZVNCd1lYUjBaWEp1WENJcE8xeHVJQ0I5WEc1OUtUdGNibHh1VFdGMFkyaGxjaTV2Y0hRZ1BTQlFZWFIwWlhKdUxtVjRkR1Z1WkNoN1hHNGdJR2x1YVhRNklHWjFibU4wYVc5dUtIQmhkSFJsY200cElIdGNiaUFnSUNCMGFHbHpMbkJoZEhSbGNtNGdQU0J3WVhSMFpYSnVPMXh1SUNCOUxGeHVJQ0JoY21sMGVUb2dNU3hjYmlBZ2JXRjBZMmc2SUdaMWJtTjBhVzl1S0haaGJIVmxMQ0JpYVc1a2FXNW5jeWtnZTF4dUlDQWdJSFJvY205M0lHNWxkeUJGY25KdmNpaGNJaWR2Y0hRbklIQmhkSFJsY200Z2RYTmxaQ0J2ZFhSemFXUmxJR0Z5Y21GNUlIQmhkSFJsY201Y0lpazdYRzRnSUgxY2JuMHBPMXh1WEc1TllYUmphR1Z5TG5SeVlXNXpJRDBnVUdGMGRHVnliaTVsZUhSbGJtUW9lMXh1SUNCcGJtbDBPaUJtZFc1amRHbHZiaWh3WVhSMFpYSnVMQ0JtZFc1aktTQjdYRzRnSUNBZ2RHaHBjeTV3WVhSMFpYSnVJRDBnY0dGMGRHVnlianRjYmlBZ0lDQjBhR2x6TG1aMWJtTWdQU0JtZFc1ak8xeHVJQ0FnSUdWdWMzVnlaU2hjYmlBZ0lDQWdJSFI1Y0dWdlppQm1kVzVqSUQwOVBTQW5ablZ1WTNScGIyNG5JQ1ltSUdaMWJtTXViR1Z1WjNSb0lEMDlQU0JuWlhSQmNtbDBlU2h3WVhSMFpYSnVLU3hjYmlBZ0lDQWdJQ2RtZFc1aklHMTFjM1FnWW1VZ1lTQW5JQ3NnWjJWMFFYSnBkSGtvY0dGMGRHVnliaWtnS3lBbkxXRnlaM1Z0Wlc1MElHWjFibU4wYVc5dUoxeHVJQ0FnSUNrN1hHNGdJSDBzWEc0Z0lHRnlhWFI1T2lBeExGeHVJQ0J0WVhSamFEb2dablZ1WTNScGIyNG9kbUZzZFdVc0lHSnBibVJwYm1kektTQjdYRzRnSUNBZ2RtRnlJR0p6SUQwZ1cxMDdYRzRnSUNBZ2FXWWdLSEJsY21admNtMU5ZWFJqYUNoMllXeDFaU3dnZEdocGN5NXdZWFIwWlhKdUxDQmljeWtwSUh0Y2JpQWdJQ0FnSUhaaGNpQmhibk1nUFNCMGFHbHpMbVoxYm1NdVlYQndiSGtvZEdocGN5NTBhR2x6VDJKcUxDQmljeWs3WEc0Z0lDQWdJQ0JpYVc1a2FXNW5jeTV3ZFhOb0tHRnVjeWs3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdkSEoxWlR0Y2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlHWmhiSE5sTzF4dUlDQjlYRzU5S1R0Y2JseHVUV0YwWTJobGNpNTNhR1Z1SUQwZ1VHRjBkR1Z5Ymk1bGVIUmxibVFvZTF4dUlDQnBibWwwT2lCbWRXNWpkR2x2Ymlod1lYUjBaWEp1TENCd2NtVmthV05oZEdVcElIdGNiaUFnSUNCMGFHbHpMbkJoZEhSbGNtNGdQU0J3WVhSMFpYSnVPMXh1SUNBZ0lIUm9hWE11Y0hKbFpHbGpZWFJsSUQwZ2NISmxaR2xqWVhSbE8xeHVJQ0FnSUhSb2FYTXVZWEpwZEhrZ1BTQm5aWFJCY21sMGVTaHdZWFIwWlhKdUtUdGNiaUFnSUNCbGJuTjFjbVVvWEc0Z0lDQWdJQ0IwZVhCbGIyWWdjSEpsWkdsallYUmxJRDA5UFNBblpuVnVZM1JwYjI0bklDWW1JSEJ5WldScFkyRjBaUzVzWlc1bmRHZ2dQVDA5SUhSb2FYTXVZWEpwZEhrc1hHNGdJQ0FnSUNBbmNISmxaR2xqWVhSbElHMTFjM1FnWW1VZ1lTQW5JQ3NnZEdocGN5NWhjbWwwZVNBcklDY3RZWEpuZFcxbGJuUWdablZ1WTNScGIyNG5YRzRnSUNBZ0tUdGNiaUFnZlN4Y2JpQWdiV0YwWTJnNklHWjFibU4wYVc5dUtIWmhiSFZsTENCaWFXNWthVzVuY3lrZ2UxeHVJQ0FnSUhaaGNpQmljeUE5SUZ0ZE8xeHVJQ0FnSUdsbUlDaHdaWEptYjNKdFRXRjBZMmdvZG1Gc2RXVXNJSFJvYVhNdWNHRjBkR1Z5Yml3Z1luTXBJQ1ltWEc0Z0lDQWdJQ0FnSUhSb2FYTXVjSEpsWkdsallYUmxMbUZ3Y0d4NUtIUm9hWE11ZEdocGMwOWlhaXdnWW5NcEtTQjdYRzRnSUNBZ0lDQmlhVzVrYVc1bmN5NXdkWE5vTG1Gd2NHeDVLR0pwYm1ScGJtZHpMQ0JpY3lrN1hHNGdJQ0FnSUNCeVpYUjFjbTRnZEhKMVpUdGNiaUFnSUNCOVhHNGdJQ0FnY21WMGRYSnVJR1poYkhObE8xeHVJQ0I5WEc1OUtUdGNibHh1VFdGMFkyaGxjaTV2Y2lBOUlGQmhkSFJsY200dVpYaDBaVzVrS0h0Y2JpQWdhVzVwZERvZ1puVnVZM1JwYjI0b0x5b2djREVzSUhBeUxDQXVMaTRnS2k4cElIdGNiaUFnSUNCbGJuTjFjbVVvWVhKbmRXMWxiblJ6TG14bGJtZDBhQ0ErUFNBeExDQmNJaWR2Y2ljZ2NtVnhkV2x5WlhNZ1lYUWdiR1ZoYzNRZ2IyNWxJSEJoZEhSbGNtNWNJaWs3WEc0Z0lDQWdkR2hwY3k1d1lYUjBaWEp1Y3lBOUlFRnljbUY1VUhKdmRHOHVjMnhwWTJVdVkyRnNiQ2hoY21kMWJXVnVkSE1wTzF4dUlDQWdJSFJvYVhNdVlYSnBkSGtnUFNCbGJuTjFjbVZWYm1sbWIzSnRRWEpwZEhrb2RHaHBjeTV3WVhSMFpYSnVjeXdnSjI5eUp5azdYRzRnSUgwc1hHNGdJRzFoZEdOb09pQm1kVzVqZEdsdmJpaDJZV3gxWlN3Z1ltbHVaR2x1WjNNcElIdGNiaUFnSUNCMllYSWdjR0YwZEdWeWJuTWdQU0IwYUdsekxuQmhkSFJsY201ek8xeHVJQ0FnSUhaaGNpQmhibk1nUFNCbVlXeHpaVHRjYmlBZ0lDQm1iM0lnS0haaGNpQnBaSGdnUFNBd095QnBaSGdnUENCd1lYUjBaWEp1Y3k1c1pXNW5kR2dnSmlZZ0lXRnVjenNnYVdSNEt5c3BJSHRjYmlBZ0lDQWdJR0Z1Y3lBOUlIQmxjbVp2Y20xTllYUmphQ2gyWVd4MVpTd2djR0YwZEdWeWJuTmJhV1I0WFN3Z1ltbHVaR2x1WjNNcE8xeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdZVzV6TzF4dUlDQjlMRnh1ZlNrN1hHNWNiazFoZEdOb1pYSXVZVzVrSUQwZ1VHRjBkR1Z5Ymk1bGVIUmxibVFvZTF4dUlDQnBibWwwT2lCbWRXNWpkR2x2YmlndktpQndNU3dnY0RJc0lDNHVMaUFxTHlrZ2UxeHVJQ0FnSUdWdWMzVnlaU2hoY21kMWJXVnVkSE11YkdWdVozUm9JRDQ5SURFc0lGd2lKMkZ1WkNjZ2NtVnhkV2x5WlhNZ1lYUWdiR1ZoYzNRZ2IyNWxJSEJoZEhSbGNtNWNJaWs3WEc0Z0lDQWdkR2hwY3k1d1lYUjBaWEp1Y3lBOUlFRnljbUY1VUhKdmRHOHVjMnhwWTJVdVkyRnNiQ2hoY21kMWJXVnVkSE1wTzF4dUlDQWdJSFJvYVhNdVlYSnBkSGtnUFNCMGFHbHpMbkJoZEhSbGNtNXpMbkpsWkhWalpTaG1kVzVqZEdsdmJpaHpkVzBzSUhBcElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCemRXMGdLeUJuWlhSQmNtbDBlU2h3S1RzZ2ZTeGNiaUFnSUNBd0tUdGNiaUFnZlN4Y2JpQWdiV0YwWTJnNklHWjFibU4wYVc5dUtIWmhiSFZsTENCaWFXNWthVzVuY3lrZ2UxeHVJQ0FnSUhaaGNpQndZWFIwWlhKdWN5QTlJSFJvYVhNdWNHRjBkR1Z5Ym5NN1hHNGdJQ0FnZG1GeUlHRnVjeUE5SUhSeWRXVTdYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2FXUjRJRDBnTURzZ2FXUjRJRHdnY0dGMGRHVnlibk11YkdWdVozUm9JQ1ltSUdGdWN6c2dhV1I0S3lzcElIdGNiaUFnSUNBZ0lHRnVjeUE5SUhCbGNtWnZjbTFOWVhSamFDaDJZV3gxWlN3Z2NHRjBkR1Z5Ym5OYmFXUjRYU3dnWW1sdVpHbHVaM01wTzF4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z1lXNXpPMXh1SUNCOVhHNTlLVHRjYmx4dUx5OGdTR1ZzY0dWeWMxeHVMeThnTFMwdExTMHRMVnh1WEc1bWRXNWpkR2x2YmlCZllYSnlZWGxOWVhSamFDaDJZV3gxWlN3Z2NHRjBkR1Z5Yml3Z1ltbHVaR2x1WjNNcElIdGNiaUFnYVdZZ0tDRkJjbkpoZVM1cGMwRnljbUY1S0haaGJIVmxLU2tnZTF4dUlDQWdJSEpsZEhWeWJpQm1ZV3h6WlR0Y2JpQWdmVnh1SUNCMllYSWdka2xrZUNBOUlEQTdYRzRnSUhaaGNpQndTV1I0SUQwZ01EdGNiaUFnZDJocGJHVWdLSEJKWkhnZ1BDQndZWFIwWlhKdUxteGxibWQwYUNrZ2UxeHVJQ0FnSUhaaGNpQndJRDBnY0dGMGRHVnlibHR3U1dSNEt5dGRPMXh1SUNBZ0lHbG1JQ2h3SUdsdWMzUmhibU5sYjJZZ1RXRjBZMmhsY2k1dFlXNTVLU0I3WEc0Z0lDQWdJQ0J3SUQwZ2NDNXdZWFIwWlhKdU8xeHVJQ0FnSUNBZ2RtRnlJSFp6SUQwZ1cxMDdYRzRnSUNBZ0lDQjNhR2xzWlNBb2RrbGtlQ0E4SUhaaGJIVmxMbXhsYm1kMGFDQW1KaUJ3WlhKbWIzSnRUV0YwWTJnb2RtRnNkV1ZiZGtsa2VGMHNJSEFzSUhaektTa2dlMXh1SUNBZ0lDQWdJQ0IyU1dSNEt5czdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQmlhVzVrYVc1bmN5NXdkWE5vS0haektUdGNiaUFnSUNCOUlHVnNjMlVnYVdZZ0tIQWdhVzV6ZEdGdVkyVnZaaUJOWVhSamFHVnlMbTl3ZENrZ2UxeHVJQ0FnSUNBZ2RtRnlJR0Z1Y3lBOUlIWkpaSGdnUENCMllXeDFaUzVzWlc1bmRHZ2dQeUJ3WlhKbWIzSnRUV0YwWTJnb2RtRnNkV1ZiZGtsa2VGMHNJSEF1Y0dGMGRHVnliaXdnVzEwcElEb2dabUZzYzJVN1hHNGdJQ0FnSUNCcFppQW9ZVzV6S1NCN1hHNGdJQ0FnSUNBZ0lHSnBibVJwYm1kekxuQjFjMmdvWVc1ektUdGNiaUFnSUNBZ0lDQWdka2xrZUNzck8xeHVJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ1ltbHVaR2x1WjNNdWNIVnphQ2gxYm1SbFptbHVaV1FwTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJSDBnWld4elpTQnBaaUFvY0dWeVptOXliVTFoZEdOb0tIWmhiSFZsVzNaSlpIaGRMQ0J3TENCaWFXNWthVzVuY3lrcElIdGNiaUFnSUNBZ0lIWkpaSGdyS3p0Y2JpQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHWmhiSE5sTzF4dUlDQWdJSDFjYmlBZ2ZWeHVJQ0J5WlhSMWNtNGdka2xrZUNBOVBUMGdkbUZzZFdVdWJHVnVaM1JvSUNZbUlIQkpaSGdnUFQwOUlIQmhkSFJsY200dWJHVnVaM1JvTzF4dWZWeHVYRzVtZFc1amRHbHZiaUJmYjJKcVRXRjBZMmdvZG1Gc2RXVXNJSEJoZEhSbGNtNHNJR0pwYm1ScGJtZHpLU0I3WEc0Z0lHWnZjaUFvZG1GeUlHc2dhVzRnY0dGMGRHVnliaWtnZTF4dUlDQWdJR2xtSUNod1lYUjBaWEp1TG1oaGMwOTNibEJ5YjNCbGNuUjVLR3NwSUNZbVhHNGdJQ0FnSUNBZ0lDRW9heUJwYmlCMllXeDFaU2tnZkh4Y2JpQWdJQ0FnSUNBZ0lYQmxjbVp2Y20xTllYUmphQ2gyWVd4MVpWdHJYU3dnY0dGMGRHVnlibHRyWFN3Z1ltbHVaR2x1WjNNcEtTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z1ptRnNjMlU3WEc0Z0lDQWdmVnh1SUNCOVhHNGdJSEpsZEhWeWJpQjBjblZsTzF4dWZWeHVYRzVtZFc1amRHbHZiaUJmWm5WdVkzUnBiMjVOWVhSamFDaDJZV3gxWlN3Z1puVnVZeXdnWW1sdVpHbHVaM01wSUh0Y2JpQWdhV1lnS0daMWJtTW9kbUZzZFdVcEtTQjdYRzRnSUNBZ1ltbHVaR2x1WjNNdWNIVnphQ2gyWVd4MVpTazdYRzRnSUNBZ2NtVjBkWEp1SUhSeWRXVTdYRzRnSUgxY2JpQWdjbVYwZFhKdUlHWmhiSE5sTzF4dWZWeHVYRzVtZFc1amRHbHZiaUJmWlhGMVlXeHBkSGxOWVhSamFDaDJZV3gxWlN3Z2NHRjBkR1Z5Yml3Z1ltbHVaR2x1WjNNcElIdGNiaUFnY21WMGRYSnVJSFpoYkhWbElEMDlQU0J3WVhSMFpYSnVPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQmZjbVZuUlhod1RXRjBZMmdvZG1Gc2RXVXNJSEJoZEhSbGNtNHNJR0pwYm1ScGJtZHpLU0I3WEc0Z0lIWmhjaUJoYm5NZ1BTQndZWFIwWlhKdUxtVjRaV01vZG1Gc2RXVXBPMXh1SUNCcFppQW9ZVzV6SUNFOVBTQnVkV3hzSUNZbUlHRnVjMXN3WFNBOVBUMGdkbUZzZFdVcElIdGNiaUFnSUNCaWFXNWthVzVuY3k1d2RYTm9LR0Z1Y3lrN1hHNGdJQ0FnY21WMGRYSnVJSFJ5ZFdVN1hHNGdJSDFjYmlBZ2NtVjBkWEp1SUdaaGJITmxPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQndaWEptYjNKdFRXRjBZMmdvZG1Gc2RXVXNJSEJoZEhSbGNtNHNJR0pwYm1ScGJtZHpLU0I3WEc0Z0lHbG1JQ2h3WVhSMFpYSnVJR2x1YzNSaGJtTmxiMllnVUdGMGRHVnliaWtnZTF4dUlDQWdJSEpsZEhWeWJpQndZWFIwWlhKdUxtMWhkR05vS0haaGJIVmxMQ0JpYVc1a2FXNW5jeWs3WEc0Z0lIMGdaV3h6WlNCcFppQW9RWEp5WVhrdWFYTkJjbkpoZVNod1lYUjBaWEp1S1NrZ2UxeHVJQ0FnSUhKbGRIVnliaUJmWVhKeVlYbE5ZWFJqYUNoMllXeDFaU3dnY0dGMGRHVnliaXdnWW1sdVpHbHVaM01wTzF4dUlDQjlJR1ZzYzJVZ2FXWWdLSEJoZEhSbGNtNGdhVzV6ZEdGdVkyVnZaaUJTWldkRmVIQXBJSHRjYmlBZ0lDQnlaWFIxY200Z1gzSmxaMFY0Y0UxaGRHTm9LSFpoYkhWbExDQndZWFIwWlhKdUxDQmlhVzVrYVc1bmN5azdYRzRnSUgwZ1pXeHpaU0JwWmlBb2RIbHdaVzltSUhCaGRIUmxjbTRnUFQwOUlDZHZZbXBsWTNRbklDWW1JSEJoZEhSbGNtNGdJVDA5SUc1MWJHd3BJSHRjYmlBZ0lDQnlaWFIxY200Z1gyOWlhazFoZEdOb0tIWmhiSFZsTENCd1lYUjBaWEp1TENCaWFXNWthVzVuY3lrN1hHNGdJSDBnWld4elpTQnBaaUFvZEhsd1pXOW1JSEJoZEhSbGNtNGdQVDA5SUNkbWRXNWpkR2x2YmljcElIdGNiaUFnSUNCeVpYUjFjbTRnWDJaMWJtTjBhVzl1VFdGMFkyZ29kbUZzZFdVc0lIQmhkSFJsY200c0lHSnBibVJwYm1kektUdGNiaUFnZlZ4dUlDQnlaWFIxY200Z1gyVnhkV0ZzYVhSNVRXRjBZMmdvZG1Gc2RXVXNJSEJoZEhSbGNtNHNJR0pwYm1ScGJtZHpLVHRjYm4xY2JseHVablZ1WTNScGIyNGdaMlYwUVhKcGRIa29jR0YwZEdWeWJpa2dlMXh1SUNCcFppQW9jR0YwZEdWeWJpQnBibk4wWVc1alpXOW1JRkJoZEhSbGNtNHBJSHRjYmlBZ0lDQnlaWFIxY200Z2NHRjBkR1Z5Ymk1aGNtbDBlVHRjYmlBZ2ZTQmxiSE5sSUdsbUlDaEJjbkpoZVM1cGMwRnljbUY1S0hCaGRIUmxjbTRwS1NCN1hHNGdJQ0FnY21WMGRYSnVJSEJoZEhSbGNtNWNiaUFnSUNBZ0lDNXRZWEFvWm5WdVkzUnBiMjRvY0NrZ2V5QnlaWFIxY200Z1oyVjBRWEpwZEhrb2NDazdJSDBwWEc0Z0lDQWdJQ0F1Y21Wa2RXTmxLR1oxYm1OMGFXOXVLR0V4TENCaE1pa2dleUJ5WlhSMWNtNGdZVEVnS3lCaE1qc2dmU3dnTUNrN1hHNGdJSDBnWld4elpTQnBaaUFvY0dGMGRHVnliaUJwYm5OMFlXNWpaVzltSUZKbFowVjRjQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQXhPMXh1SUNCOUlHVnNjMlVnYVdZZ0tIUjVjR1Z2WmlCd1lYUjBaWEp1SUQwOVBTQW5iMkpxWldOMEp5QW1KaUJ3WVhSMFpYSnVJQ0U5UFNCdWRXeHNLU0I3WEc0Z0lDQWdkbUZ5SUdGdWN5QTlJREE3WEc0Z0lDQWdabTl5SUNoMllYSWdheUJwYmlCd1lYUjBaWEp1S1NCN1hHNGdJQ0FnSUNCcFppQW9jR0YwZEdWeWJpNW9ZWE5QZDI1UWNtOXdaWEowZVNocktTa2dlMXh1SUNBZ0lDQWdJQ0JoYm5NZ0t6MGdaMlYwUVhKcGRIa29jR0YwZEdWeWJsdHJYU2s3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlCaGJuTTdYRzRnSUgwZ1pXeHpaU0JwWmlBb2RIbHdaVzltSUhCaGRIUmxjbTRnUFQwOUlDZG1kVzVqZEdsdmJpY3BJSHRjYmlBZ0lDQnlaWFIxY200Z01UdGNiaUFnZlZ4dUlDQnlaWFIxY200Z01EdGNibjFjYmx4dVpuVnVZM1JwYjI0Z1pXNXpkWEpsVlc1cFptOXliVUZ5YVhSNUtIQmhkSFJsY201ekxDQnZjQ2tnZTF4dUlDQjJZWElnY21WemRXeDBJRDBnWjJWMFFYSnBkSGtvY0dGMGRHVnlibk5iTUYwcE8xeHVJQ0JtYjNJZ0tIWmhjaUJwWkhnZ1BTQXhPeUJwWkhnZ1BDQndZWFIwWlhKdWN5NXNaVzVuZEdnN0lHbGtlQ3NyS1NCN1hHNGdJQ0FnZG1GeUlHRWdQU0JuWlhSQmNtbDBlU2h3WVhSMFpYSnVjMXRwWkhoZEtUdGNiaUFnSUNCcFppQW9ZU0FoUFQwZ2NtVnpkV3gwS1NCN1hHNGdJQ0FnSUNCMGFISnZkeUJ1WlhjZ1JYSnliM0lvYjNBZ0t5QW5PaUJsZUhCbFkzUmxaQ0JoY21sMGVTQW5JQ3NnY21WemRXeDBJQ3NnSnlCaGRDQnBibVJsZUNBbklDc2dhV1I0SUNzZ0p5d2daMjkwSUNjZ0t5QmhLVHRjYmlBZ0lDQjlYRzRnSUgxY2JpQWdjbVYwZFhKdUlISmxjM1ZzZER0Y2JuMWNibHh1Wm5WdVkzUnBiMjRnWlc1emRYSmxLR052Ym1Rc0lHMWxjM05oWjJVcElIdGNiaUFnYVdZZ0tDRmpiMjVrS1NCN1hHNGdJQ0FnZEdoeWIzY2dibVYzSUVWeWNtOXlLRzFsYzNOaFoyVXBPMXh1SUNCOVhHNTlYRzVjYmk4dklFMWhkR05vWlhKY2JpOHZJQzB0TFMwdExTMWNibHh1Wm5WdVkzUnBiMjRnVFdGMFkyaGxjaWdwSUh0Y2JpQWdkR2hwY3k1d1lYUjBaWEp1Y3lBOUlGdGRPMXh1SUNCMGFHbHpMblJvYVhOUFltb2dQU0IxYm1SbFptbHVaV1E3WEc1OVhHNWNiazFoZEdOb1pYSXVjSEp2ZEc5MGVYQmxMbmRwZEdoVWFHbHpJRDBnWm5WdVkzUnBiMjRvYjJKcUtTQjdYRzRnSUhSb2FYTXVkR2hwYzA5aWFpQTlJRzlpYWp0Y2JpQWdjbVYwZFhKdUlIUm9hWE03WEc1OU8xeHVYRzVOWVhSamFHVnlMbkJ5YjNSdmRIbHdaUzVoWkdSRFlYTmxJRDBnWm5WdVkzUnBiMjRvY0dGMGRHVnliaXdnYjNCMFJuVnVZeWtnZTF4dUlDQjBhR2x6TG5CaGRIUmxjbTV6TG5CMWMyZ29UV0YwWTJobGNpNTBjbUZ1Y3lod1lYUjBaWEp1TENCdmNIUkdkVzVqS1NrN1hHNGdJSEpsZEhWeWJpQjBhR2x6TzF4dWZUdGNibHh1VFdGMFkyaGxjaTV3Y205MGIzUjVjR1V1YldGMFkyZ2dQU0JtZFc1amRHbHZiaWgyWVd4MVpTa2dlMXh1SUNCbGJuTjFjbVVvZEdocGN5NXdZWFIwWlhKdWN5NXNaVzVuZEdnZ1BpQXdMQ0FuVFdGMFkyaGxjaUJ5WlhGMWFYSmxjeUJoZENCc1pXRnpkQ0J2Ym1VZ1kyRnpaU2NwTzF4dVhHNGdJSFpoY2lCaWFXNWthVzVuY3lBOUlGdGRPMXh1SUNCcFppQW9UV0YwWTJobGNpNXZjaTVtY205dFFYSnlZWGtvZEdocGN5NXdZWFIwWlhKdWN5a3ViV0YwWTJnb2RtRnNkV1VzSUdKcGJtUnBibWR6S1NrZ2UxeHVJQ0FnSUhKbGRIVnliaUJpYVc1a2FXNW5jMXN3WFR0Y2JpQWdmVnh1SUNCMGFISnZkeUJ1WlhjZ1RXRjBZMmhHWVdsc2RYSmxLSFpoYkhWbExDQnVaWGNnUlhKeWIzSW9LUzV6ZEdGamF5azdYRzU5TzF4dVhHNU5ZWFJqYUdWeUxuQnliM1J2ZEhsd1pTNTBiMFoxYm1OMGFXOXVJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJSFpoY2lCelpXeG1JRDBnZEdocGN6dGNiaUFnY21WMGRYSnVJR1oxYm1OMGFXOXVLSFpoYkhWbEtTQjdJSEpsZEhWeWJpQnpaV3htTG0xaGRHTm9LSFpoYkhWbEtUc2dmVHRjYm4wN1hHNWNiaTh2SUZCeWFXMXBkR2wyWlNCd1lYUjBaWEp1YzF4dVhHNU5ZWFJqYUdWeUxsOGdJQ0FnSUNBOUlHWjFibU4wYVc5dUtIZ3BJSHNnY21WMGRYSnVJSFJ5ZFdVN0lIMDdYRzVOWVhSamFHVnlMbUp2YjJ3Z0lDQTlJR1oxYm1OMGFXOXVLSGdwSUhzZ2NtVjBkWEp1SUhSNWNHVnZaaUI0SUQwOVBTQW5ZbTl2YkdWaGJpYzdJSDA3WEc1TllYUmphR1Z5TG01MWJXSmxjaUE5SUdaMWJtTjBhVzl1S0hncElIc2djbVYwZFhKdUlIUjVjR1Z2WmlCNElEMDlQU0FuYm5WdFltVnlKenNnZlR0Y2JrMWhkR05vWlhJdWMzUnlhVzVuSUQwZ1puVnVZM1JwYjI0b2VDa2dleUJ5WlhSMWNtNGdkSGx3Wlc5bUlIZ2dQVDA5SUNkemRISnBibWNuT3lCOU8xeHVUV0YwWTJobGNpNWphR0Z5SUNBZ1BTQm1kVzVqZEdsdmJpaDRLU0I3SUhKbGRIVnliaUIwZVhCbGIyWWdlQ0E5UFQwZ0ozTjBjbWx1WnljZ0ppWWdlQzVzWlc1bmRHZ2dQVDA5SURBN0lIMDdYRzVjYmk4dklFOXdaWEpoZEc5eWMxeHVYRzVOWVhSamFHVnlMbWx1YzNSaGJtTmxUMllnUFNCbWRXNWpkR2x2YmloamJHRjZlaWtnZXlCeVpYUjFjbTRnWm5WdVkzUnBiMjRvZUNrZ2V5QnlaWFIxY200Z2VDQnBibk4wWVc1alpXOW1JR05zWVhwNk95QjlPeUI5TzF4dVhHNU5ZWFJqYUdWeUxrMWhkR05vUm1GcGJIVnlaU0E5SUUxaGRHTm9SbUZwYkhWeVpUdGNibHh1THk4Z1ZHVnljMlVnYVc1MFpYSm1ZV05sWEc0dkx5QXRMUzB0TFMwdExTMHRMUzB0TFMxY2JseHVablZ1WTNScGIyNGdiV0YwWTJnb2RtRnNkV1VnTHlvZ0xDQndZWFF4TENCbWRXNHhMQ0J3WVhReUxDQm1kVzR5TENBdUxpNGdLaThwSUh0Y2JpQWdkbUZ5SUdGeVozTWdQU0JoY21kMWJXVnVkSE03WEc1Y2JpQWdMeThnVjJobGJpQmpZV3hzWldRZ2QybDBhQ0JxZFhOMElHRWdkbUZzZFdVZ1lXNWtJR0VnY0dGMGRHVnliaXdnY21WMGRYSnVJSFJvWlNCaWFXNWthVzVuY3lCcFpseHVJQ0F2THlCMGFHVWdiV0YwWTJnZ2QyRnpJSE4xWTJObGMzTm1kV3dzSUc5MGFHVnlkMmx6WlNCdWRXeHNMbHh1SUNCcFppQW9ZWEpuY3k1c1pXNW5kR2dnUFQwOUlESXBJSHRjYmlBZ0lDQjJZWElnWW1sdVpHbHVaM01nUFNCYlhUdGNiaUFnSUNCcFppQW9jR1Z5Wm05eWJVMWhkR05vS0haaGJIVmxMQ0JoY21kMWJXVnVkSE5iTVYwc0lHSnBibVJwYm1kektTa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHSnBibVJwYm1kek8xeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdiblZzYkR0Y2JpQWdmVnh1WEc0Z0lHVnVjM1Z5WlNoY2JpQWdJQ0FnSUdGeVozTXViR1Z1WjNSb0lENGdNaUFtSmlCaGNtZHpMbXhsYm1kMGFDQWxJRElnUFQwOUlERXNYRzRnSUNBZ0lDQW5iV0YwWTJnZ1kyRnNiR1ZrSUhkcGRHZ2dhVzUyWVd4cFpDQmhjbWQxYldWdWRITW5LVHRjYmlBZ2RtRnlJRzBnUFNCdVpYY2dUV0YwWTJobGNpZ3BPMXh1SUNCbWIzSWdLSFpoY2lCcFpIZ2dQU0F4T3lCcFpIZ2dQQ0JoY21kekxteGxibWQwYURzZ2FXUjRJQ3M5SURJcElIdGNiaUFnSUNCMllYSWdjR0YwZEdWeWJpQTlJR0Z5WjNOYmFXUjRYVHRjYmlBZ0lDQjJZWElnWm5WdVl5QTlJR0Z5WjNOYmFXUjRJQ3NnTVYwN1hHNGdJQ0FnYlM1aFpHUkRZWE5sS0hCaGRIUmxjbTRzSUdaMWJtTXBPMXh1SUNCOVhHNGdJSEpsZEhWeWJpQnRMbTFoZEdOb0tIWmhiSFZsS1R0Y2JuMWNibHh1THk4Z1JYaHdiM0owYzF4dUx5OGdMUzB0TFMwdExWeHVYRzV0YjJSMWJHVXVaWGh3YjNKMGN5QTlJSHRjYmlBZ1RXRjBZMmhsY2pvZ1RXRjBZMmhsY2l4Y2JpQWdiV0YwWTJnNklHMWhkR05vTEZ4dUlDQlFZWFIwWlhKdU9pQlFZWFIwWlhKdVhHNTlPMXh1SWl3aUx5b2daMnh2WW1Gc0lGTjViV0p2YkNBcUwxeHVYRzUyWVhJZ1NWUkZVa0ZVVDFKZlUxbE5RazlNSUQwZ2RIbHdaVzltSUZONWJXSnZiQ0E5UFQwZ0oyWjFibU4wYVc5dUp5QW1KaUJUZVcxaWIyd3VhWFJsY21GMGIzSTdYRzUyWVhJZ1JrRkxSVjlKVkVWU1FWUlBVbDlUV1UxQ1Qwd2dQU0FuUUVCcGRHVnlZWFJ2Y2ljN1hHNWNiblpoY2lCMGIxTjBjbWx1WnlBOUlFOWlhbVZqZEM1d2NtOTBiM1I1Y0dVdWRHOVRkSEpwYm1jN1hHNWNiaTh2SUVobGJIQmxjbk5jYmk4dklDMHRMUzB0TFMxY2JseHVablZ1WTNScGIyNGdhWE5UZEhKcGJtY29iMkpxS1NCN1hHNWNkSEpsZEhWeWJpQjBiMU4wY21sdVp5NWpZV3hzS0c5aWFpa2dQVDA5SUNkYmIySnFaV04wSUZOMGNtbHVaMTBuTzF4dWZWeHVYRzVtZFc1amRHbHZiaUJwYzA1MWJXSmxjaWh2WW1vcElIdGNibHgwY21WMGRYSnVJSFJ2VTNSeWFXNW5MbU5oYkd3b2IySnFLU0E5UFQwZ0oxdHZZbXBsWTNRZ1RuVnRZbVZ5WFNjN1hHNTlYRzVjYm1aMWJtTjBhVzl1SUdselFYSnlZWGxNYVd0bEtHOWlhaWtnZTF4dVhIUnlaWFIxY200Z2FYTk9kVzFpWlhJb2IySnFMbXhsYm1kMGFDa2dKaVlnSVdselUzUnlhVzVuS0c5aWFpazdYRzU5WEc1Y2JpOHZJRUZ5Y21GNVNYUmxjbUYwYjNKY2JpOHZJQzB0TFMwdExTMHRMUzB0TFMxY2JseHVablZ1WTNScGIyNGdRWEp5WVhsSmRHVnlZWFJ2Y2locGRHVnlZWFJsWlNrZ2UxeHVYSFIwYUdsekxsOXBkR1Z5WVhSbFpTQTlJR2wwWlhKaGRHVmxPMXh1WEhSMGFHbHpMbDlwSUQwZ01EdGNibHgwZEdocGN5NWZiR1Z1SUQwZ2FYUmxjbUYwWldVdWJHVnVaM1JvTzF4dWZWeHVYRzVCY25KaGVVbDBaWEpoZEc5eUxuQnliM1J2ZEhsd1pTNXVaWGgwSUQwZ1puVnVZM1JwYjI0b0tTQjdYRzVjZEdsbUlDaDBhR2x6TGw5cElEd2dkR2hwY3k1ZmJHVnVLU0I3WEc1Y2RGeDBjbVYwZFhKdUlIc2daRzl1WlRvZ1ptRnNjMlVzSUhaaGJIVmxPaUIwYUdsekxsOXBkR1Z5WVhSbFpWdDBhR2x6TGw5cEt5dGRJSDA3WEc1Y2RIMWNibHgwY21WMGRYSnVJSHNnWkc5dVpUb2dkSEoxWlNCOU8xeHVmVHRjYmx4dVFYSnlZWGxKZEdWeVlYUnZjaTV3Y205MGIzUjVjR1ZiUmtGTFJWOUpWRVZTUVZSUFVsOVRXVTFDVDB4ZElEMGdablZ1WTNScGIyNG9LU0I3SUhKbGRIVnliaUIwYUdsek95QjlPMXh1WEc1cFppQW9TVlJGVWtGVVQxSmZVMWxOUWs5TUtTQjdYRzVjZEVGeWNtRjVTWFJsY21GMGIzSXVjSEp2ZEc5MGVYQmxXMGxVUlZKQlZFOVNYMU5aVFVKUFRGMGdQU0JtZFc1amRHbHZiaWdwSUhzZ2NtVjBkWEp1SUhSb2FYTTdJSDA3WEc1OVhHNWNiaTh2SUVWNGNHOXlkSE5jYmk4dklDMHRMUzB0TFMxY2JseHVMeThnVW1WMGRYSnVjeUJoYmlCcGRHVnlZWFJ2Y2lBb1lXNGdiMkpxWldOMElIUm9ZWFFnYUdGeklHRWdibVY0ZENncElHMWxkR2h2WkNrZ1ptOXlJR0J2WW1wZ0xseHVMeThnUm1seWMzUXNJR2wwSUhSeWFXVnpJSFJ2SUhWelpTQjBhR1VnUlZNMklHbDBaWEpoZEc5eUlIQnliM1J2WTI5c0lDaFRlVzFpYjJ3dWFYUmxjbUYwYjNJcExseHVMeThnU1hRZ1ptRnNiSE1nWW1GamF5QjBieUIwYUdVZ0oyWmhhMlVuSUdsMFpYSmhkRzl5SUhCeWIzUnZZMjlzSUNnblFFQnBkR1Z5WVhSdmNpY3BJSFJvWVhRZ2FYTmNiaTh2SUhWelpXUWdZbmtnYzI5dFpTQnNhV0p5WVhKcFpYTWdLR1V1Wnk0Z2FXMXRkWFJoWW14bExXcHpLUzRnUm1sdVlXeHNlU3dnYVdZZ2RHaGxJRzlpYW1WamRDQm9ZWE5jYmk4dklHRWdiblZ0WlhKcFl5QmdiR1Z1WjNSb1lDQndjbTl3WlhKMGVTQmhibVFnYVhNZ2JtOTBJR0VnYzNSeWFXNW5MQ0JwZENCcGN5QjBjbVZoZEdWa0lHRnpJR0Z1SUVGeWNtRjVYRzR2THlCMGJ5QmlaU0JwZEdWeVlYUmxaQ0IxYzJsdVp5QmhiaUJCY25KaGVVbDBaWEpoZEc5eUxseHVablZ1WTNScGIyNGdaMlYwU1hSbGNtRjBiM0lvYjJKcUtTQjdYRzVjZEdsbUlDZ2hiMkpxS1NCN1hHNWNkRngwY21WMGRYSnVPMXh1WEhSOVhHNWNkR2xtSUNoSlZFVlNRVlJQVWw5VFdVMUNUMHdnSmlZZ2RIbHdaVzltSUc5aWFsdEpWRVZTUVZSUFVsOVRXVTFDVDB4ZElEMDlQU0FuWm5WdVkzUnBiMjRuS1NCN1hHNWNkRngwY21WMGRYSnVJRzlpYWx0SlZFVlNRVlJQVWw5VFdVMUNUMHhkS0NrN1hHNWNkSDFjYmx4MGFXWWdLSFI1Y0dWdlppQnZZbXBiUmtGTFJWOUpWRVZTUVZSUFVsOVRXVTFDVDB4ZElEMDlQU0FuWm5WdVkzUnBiMjRuS1NCN1hHNWNkRngwY21WMGRYSnVJRzlpYWx0R1FVdEZYMGxVUlZKQlZFOVNYMU5aVFVKUFRGMG9LVHRjYmx4MGZWeHVYSFJwWmlBb2FYTkJjbkpoZVV4cGEyVW9iMkpxS1NrZ2UxeHVYSFJjZEhKbGRIVnliaUJ1WlhjZ1FYSnlZWGxKZEdWeVlYUnZjaWh2WW1vcE8xeHVYSFI5WEc1OVhHNWNibVoxYm1OMGFXOXVJR2x6U1hSbGNtRmliR1VvYjJKcUtTQjdYRzVjZEdsbUlDaHZZbW9wSUh0Y2JseDBYSFJ5WlhSMWNtNGdLRWxVUlZKQlZFOVNYMU5aVFVKUFRDQW1KaUIwZVhCbGIyWWdiMkpxVzBsVVJWSkJWRTlTWDFOWlRVSlBURjBnUFQwOUlDZG1kVzVqZEdsdmJpY3BJSHg4WEc1Y2RGeDBYSFJjZEZ4MElIUjVjR1Z2WmlCdlltcGJSa0ZMUlY5SlZFVlNRVlJQVWw5VFdVMUNUMHhkSUQwOVBTQW5ablZ1WTNScGIyNG5JSHg4WEc1Y2RGeDBYSFJjZEZ4MElHbHpRWEp5WVhsTWFXdGxLRzlpYWlrN1hHNWNkSDFjYmx4MGNtVjBkWEp1SUdaaGJITmxPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQjBiMEZ5Y21GNUtHbDBaWEpoWW14bEtTQjdYRzVjZEhaaGNpQnBkR1Z5SUQwZ1oyVjBTWFJsY21GMGIzSW9hWFJsY21GaWJHVXBPMXh1WEhScFppQW9hWFJsY2lrZ2UxeHVYSFJjZEhaaGNpQnlaWE4xYkhRZ1BTQmJYVHRjYmx4MFhIUjJZWElnYm1WNGREdGNibHgwWEhSM2FHbHNaU0FvSVNodVpYaDBJRDBnYVhSbGNpNXVaWGgwS0NrcExtUnZibVVwSUh0Y2JseDBYSFJjZEhKbGMzVnNkQzV3ZFhOb0tHNWxlSFF1ZG1Gc2RXVXBPMXh1WEhSY2RIMWNibHgwWEhSeVpYUjFjbTRnY21WemRXeDBPMXh1WEhSOVhHNTlYRzVjYm0xdlpIVnNaUzVsZUhCdmNuUnpJRDBnZTF4dVhIUm5aWFJKZEdWeVlYUnZjam9nWjJWMFNYUmxjbUYwYjNJc1hHNWNkR2x6U1hSbGNtRmliR1U2SUdselNYUmxjbUZpYkdVc1hHNWNkSFJ2UVhKeVlYazZJSFJ2UVhKeVlYbGNibjA3WEc0aVhYMD1cblxuIiwiLy8gQmFzZWQgb24gaHR0cHM6Ly9naXRodWIuY29tL1BvbHltZXIvV2Vha01hcC9ibG9iL2M0Njg1YTllM2E1NzljMjUzY2NmOGU3Mzc5YzA0N2MzYTFmOTkxMDYvd2Vha21hcC5qc1xuXG4vKlxuICogQ29weXJpZ2h0IDIwMTIgVGhlIFBvbHltZXIgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGEgQlNELXN0eWxlXG4gKiBsaWNlbnNlIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUuXG4gKi9cblxuaWYgKHR5cGVvZiBXZWFrTWFwID09PSAndW5kZWZpbmVkJykge1xuICAoZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRlZmluZVByb3BlcnR5ID0gT2JqZWN0LmRlZmluZVByb3BlcnR5O1xuICAgIHZhciBjb3VudGVyID0gRGF0ZS5ub3coKSAlIDFlOTtcblxuICAgIHZhciBXZWFrTWFwID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLm5hbWUgPSAnX19zdCcgKyAoTWF0aC5yYW5kb20oKSAqIDFlOSA+Pj4gMCkgKyAoY291bnRlcisrICsgJ19fJyk7XG4gICAgfTtcblxuICAgIFdlYWtNYXAucHJvdG90eXBlID0ge1xuICAgICAgc2V0OiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICAgIHZhciBlbnRyeSA9IGtleVt0aGlzLm5hbWVdO1xuICAgICAgICBpZiAoZW50cnkgJiYgZW50cnlbMF0gPT09IGtleSlcbiAgICAgICAgICBlbnRyeVsxXSA9IHZhbHVlO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgZGVmaW5lUHJvcGVydHkoa2V5LCB0aGlzLm5hbWUsIHt2YWx1ZTogW2tleSwgdmFsdWVdLCB3cml0YWJsZTogdHJ1ZX0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH0sXG4gICAgICBnZXQ6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIgZW50cnk7XG4gICAgICAgIHJldHVybiAoZW50cnkgPSBrZXlbdGhpcy5uYW1lXSkgJiYgZW50cnlbMF0gPT09IGtleSA/XG4gICAgICAgICAgICBlbnRyeVsxXSA6IHVuZGVmaW5lZDtcbiAgICAgIH0sXG4gICAgICBkZWxldGU6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIgZW50cnkgPSBrZXlbdGhpcy5uYW1lXTtcbiAgICAgICAgaWYgKCFlbnRyeSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB2YXIgaGFzVmFsdWUgPSBlbnRyeVswXSA9PT0ga2V5O1xuICAgICAgICBlbnRyeVswXSA9IGVudHJ5WzFdID0gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gaGFzVmFsdWU7XG4gICAgICB9LFxuICAgICAgaGFzOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGVudHJ5ID0ga2V5W3RoaXMubmFtZV07XG4gICAgICAgIGlmICghZW50cnkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIGVudHJ5WzBdID09PSBrZXk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6IHdpbmRvdykuV2Vha01hcCA9IFdlYWtNYXA7XG4gIH0pKCk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnJlcXVpcmUoJzZ0bzUvcG9seWZpbGwnKTtcbnJlcXVpcmUoJzZ0bzUvcmVnaXN0ZXInKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFZhdDogcmVxdWlyZSgnLi9saWIvdmF0JyksXG4gIG1hdGNoOiB7XG4gIFx0QU5ZOiByZXF1aXJlKCcuL3RoaXJkX3BhcnR5L3BhdHRlcm4tbWF0Y2gnKS5NYXRjaGVyLl9cbiAgfVxufTtcbiJdfQ==
