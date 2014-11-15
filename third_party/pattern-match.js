!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.pm=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var iterable = _dereq_('./lib/iterable');
var isIterable = iterable.isIterable;
var toArray = iterable.toArray;

var FAIL = { fail: true };
var ArrayProto = Array.prototype;

// MatchFailure
// ------------

function MatchFailure(value, stack) {
  this.value = value;
  this.stack = stack;
}

MatchFailure.prototype.toString = function() {
  return 'match failure';
};

// MatchResult
// -----------

// A MatchResult is used to wrap an arbitrary value into a 'truthy' object
// that can be returned from a Pattern's `match` method.
function MatchResult(value) {
  this.value = value;
}

MatchResult.prototype.toString = function() {
  return '[MatchResult: ' + this.value + ']';
};

// Pattern
// -------

function Pattern() {}

// Creates a custom Pattern class. If `props` has an 'init' property, it will
// be called to initialize newly-created instances. All other properties in
// `props` will be copied to the prototype of the new constructor.
Pattern.extend = function(props) {
  function ctor() {
    var self = this;
    if (!(self instanceof ctor)) {
      self = new ctor();
    }
    if ('init' in props) {
      props.init.apply(self, ArrayProto.slice.call(arguments));
    }
    ensure(typeof self.match === 'function', "Patterns must have a 'match' method");
    ensure(typeof self.arity === 'number', "Patterns must have an 'arity' property");
    return self;
  }
  var proto = ctor.prototype = new Pattern();
  for (var k in props) {
    if (k !== 'init') {
      proto[k] = props[k];
    }
  }
  return ctor;
};

// Expose some useful functions as instance methods on Pattern.
Pattern.prototype.performMatch = performMatch;
Pattern.prototype.getArity = getArity;

// Types of pattern
// ----------------

var Is = Pattern.extend({
  init: function(expectedValue) {
    this.expectedValue = expectedValue;
  },
  arity: 0,
  match: function(value, bindings) {
    return _equalityMatch(value, this.expectedValue, bindings);
  }
});

var Iterable = Pattern.extend({
  init: function(patterns) {
    this.patterns = patterns;
    this.arity = patterns
      .map(function(pattern) { return getArity(pattern); })
      .reduce(function(a1, a2) { return a1 + a2; }, 0);
  },
  match: function(value, bindings) {
    return isIterable(value) ?
      _arrayMatch(toArray(value), this.patterns, bindings) :
      false;
  }
});

var Many = Pattern.extend({
  init: function(pattern) {
    this.pattern = pattern;
  },
  arity: 1,
  match: function(value, bindings) {
    throw new Error("'many' pattern used outside array pattern");
  }
});

var Opt = Pattern.extend({
  init: function(pattern) {
    this.pattern = pattern;
  },
  arity: 1,
  match: function(value, bindings) {
    throw new Error("'opt' pattern used outside array pattern");
  }
});

var Trans = Pattern.extend({
  init: function(pattern, func) {
    this.pattern = pattern;
    this.func = func;
    ensure(
      typeof func === 'function' && func.length === getArity(pattern),
      'func must be a ' + getArity(pattern) + '-argument function'
    );
  },
  arity: 1,
  match: function(value, bindings) {
    var bs = [];
    if (performMatch(value, this.pattern, bs)) {
      var ans = this.func.apply(this.thisObj, bs);
      bindings.push(ans);
      return new MatchResult(ans);
    }
    return false;
  }
});

var When = Pattern.extend({
  init: function(pattern, predicate) {
    this.pattern = pattern;
    this.predicate = predicate;
    this.arity = getArity(pattern);
    ensure(
      typeof predicate === 'function' && predicate.length === this.arity,
      'predicate must be a ' + this.arity + '-argument function'
    );
  },
  match: function(value, bindings) {
    var bs = [];
    if (performMatch(value, this.pattern, bs) &&
        this.predicate.apply(this.thisObj, bs)) {
      bindings.push.apply(bindings, bs);
      return true;
    }
    return false;
  }
});

var Or = Pattern.extend({
  init: function(patterns) {
    ensure(patterns.length >= 2, "'or' requires at least two patterns");
    this.patterns = patterns;
    this.arity = ensureUniformArity(patterns, 'or');
  },
  match: function(value, bindings) {
    var patterns = this.patterns;
    var ans = false;
    for (var idx = 0; idx < patterns.length && !ans; idx++) {
      ans = performMatch(value, patterns[idx], bindings);
    }
    return ans;
  }
});

var And = Pattern.extend({
  init: function(patterns) {
    ensure(patterns.length >= 2, "'and' requires at least two patterns");
    this.patterns = patterns;
    this.arity = patterns.reduce(function(sum, p) {
      return sum + getArity(p); },
    0);
  },
  match: function(value, bindings) {
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
    if (p instanceof Many) {
      p = p.pattern;
      var vs = [];
      while (vIdx < value.length && performMatch(value[vIdx], p, vs)) {
        vIdx++;
      }
      bindings.push(vs);
    } else if (p instanceof Opt) {
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
    if (pattern.hasOwnProperty(k) &&
        !(k in value) ||
        !performMatch(value[k], pattern[k], bindings)) {
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
  } else if (typeof pattern === 'object' && pattern !== null) {
    return _objMatch(value, pattern, bindings);
  } else if (typeof pattern === 'function') {
    return _functionMatch(value, pattern, bindings);
  }
  return _equalityMatch(value, pattern, bindings);
}

function getArity(pattern) {
  if (pattern instanceof Pattern) {
    return pattern.arity;
  } else if (Array.isArray(pattern)) {
    return pattern
      .map(function(p) { return getArity(p); })
      .reduce(function(a1, a2) { return a1 + a2; }, 0);
  } else if (typeof pattern === 'function' || pattern instanceof RegExp) {
    return 1;
  } else if (typeof pattern === 'object') {
    var ans = 0;
    for (var k in pattern) {
      if (pattern.hasOwnProperty(k)) {
        ans += getArity(pattern[k]);
      }
    }
    return ans;
  } else {
    return 0;
  }
}

function ensureUniformArity(patterns, op) {
  var result = getArity(patterns[0]);
  for (var idx = 1; idx < patterns.length; idx++) {
    var a = getArity(patterns[idx]);
    if (a !== result) {
      throw new Error(op + ': expected arity ' + result + ' at index ' + idx + ', got ' + a);
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

Matcher.prototype.withThis = function(obj) {
  this.thisObj = obj;
  return this;
};

Matcher.prototype.addCase = function(pattern, optFunc) {
  this.patterns.push(optFunc ? Matcher.trans(pattern, optFunc) : pattern);
  return this;
};

Matcher.prototype.match = function(value) {
  for (var idx = 0; idx < this.patterns.length; idx++) {
    var ans = performMatch(value, this.patterns[idx], []);
    if (ans) {
      return ans instanceof MatchResult ? ans.value : value;
    }
  }
  throw new MatchFailure(value, new Error().stack);
};

Matcher.prototype.toFunction = function() {
  var self = this;
  return function(value) { return self.match(value); };
};

// Primitive patterns

Matcher._      = function(x) { return true; };
Matcher.bool   = function(x) { return typeof x === 'boolean'; };
Matcher.number = function(x) { return typeof x === 'number'; };
Matcher.string = function(x) { return typeof x === 'string'; };
Matcher.char   = function(x) { return typeof x === 'string' && x.length === 0; };

// Combinators

Matcher.is       = function(expectedValue)     { return new Is(expectedValue); };
Matcher.iterable = function(/* p1, p2, ... */) { return new Iterable(ArrayProto.slice.call(arguments)); };
Matcher.many     = function(pattern)           { return new Many(pattern); };
Matcher.opt      = function(pattern)           { return new Opt(pattern); };
Matcher.trans    = function(pattern, func)     { return new Trans(pattern, func); };
Matcher.when     = function(pattern, pred)     { return new When(pattern, pred); };
Matcher.or       = function(/* p1, p2, ... */) { return new Or(ArrayProto.slice.call(arguments)); };
Matcher.and      = function(/* p1, p2, ... */) { return new And(ArrayProto.slice.call(arguments)); };

// Operators

Matcher.instanceOf = function(clazz) { return function(x) { return x instanceof clazz; }; };

Matcher.MatchFailure = MatchFailure;

// Terse interface
// ---------------

function match(v /* , pat1, fun1, pat2, fun2, ... */) {
  var args = arguments;
  // Allow calling w/ 2 args, where the second arg is an Array [p1, f1, ...].
  if (args.length === 2 && Array.isArray(args[1])) {
    args = [args[0]].concat(args[1]);
  }
  if (args.length % 2 !== 1) {
    throw new Error('match called with invalid arguments');
  }
  var m = new Matcher();
  for (var idx = 1; idx < args.length; idx += 2) {
    var pattern = args[idx];
    var func = args[idx + 1];
    m.addCase(pattern, func);
  }
  m.addCase(Matcher._, function(val) { return FAIL; });
  return m.match(v);
}

match.FAIL = FAIL;

// Exports
// -------

module.exports = {
  Matcher: Matcher,
  match: match,
  Pattern: Pattern
};

},{"./lib/iterable":2}],2:[function(_dereq_,module,exports){
/* global Symbol */

var ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
var FAKE_ITERATOR_SYMBOL = '@@iterator';

var toString = Object.prototype.toString;

// Helpers
// -------

function isString(obj) {
	return toString.call(obj) === '[object String]';
}

function isNumber(obj) {
	return toString.call(obj) === '[object Number]';
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

ArrayIterator.prototype.next = function() {
	if (this._i < this._len) {
		return { done: false, value: this._iteratee[this._i++] };
	}
	return { done: true };
};

ArrayIterator.prototype[FAKE_ITERATOR_SYMBOL] = function() { return this; };

if (ITERATOR_SYMBOL) {
	ArrayIterator.prototype[ITERATOR_SYMBOL] = function() { return this; };
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
	if (ITERATOR_SYMBOL && typeof obj[ITERATOR_SYMBOL] === 'function') {
		return obj[ITERATOR_SYMBOL]();
	}
	if (typeof obj[FAKE_ITERATOR_SYMBOL] === 'function') {
		return obj[FAKE_ITERATOR_SYMBOL]();
	}
	if (isArrayLike(obj)) {
		return new ArrayIterator(obj);
	}
}

function isIterable(obj) {
	if (obj) {
		return (ITERATOR_SYMBOL && typeof obj[ITERATOR_SYMBOL] === 'function') ||
					 typeof obj[FAKE_ITERATOR_SYMBOL] === 'function' ||
					 isArrayLike(obj);
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

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZHVicm95L2Rldi9jZGcvcGF0dGVybi1tYXRjaC9pbmRleC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L2NkZy9wYXR0ZXJuLW1hdGNoL2xpYi9pdGVyYWJsZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGl0ZXJhYmxlID0gcmVxdWlyZSgnLi9saWIvaXRlcmFibGUnKTtcbnZhciBpc0l0ZXJhYmxlID0gaXRlcmFibGUuaXNJdGVyYWJsZTtcbnZhciB0b0FycmF5ID0gaXRlcmFibGUudG9BcnJheTtcblxudmFyIEZBSUwgPSB7IGZhaWw6IHRydWUgfTtcbnZhciBBcnJheVByb3RvID0gQXJyYXkucHJvdG90eXBlO1xuXG4vLyBNYXRjaEZhaWx1cmVcbi8vIC0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBNYXRjaEZhaWx1cmUodmFsdWUsIHN0YWNrKSB7XG4gIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgdGhpcy5zdGFjayA9IHN0YWNrO1xufVxuXG5NYXRjaEZhaWx1cmUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAnbWF0Y2ggZmFpbHVyZSc7XG59O1xuXG4vLyBNYXRjaFJlc3VsdFxuLy8gLS0tLS0tLS0tLS1cblxuLy8gQSBNYXRjaFJlc3VsdCBpcyB1c2VkIHRvIHdyYXAgYW4gYXJiaXRyYXJ5IHZhbHVlIGludG8gYSAndHJ1dGh5JyBvYmplY3Rcbi8vIHRoYXQgY2FuIGJlIHJldHVybmVkIGZyb20gYSBQYXR0ZXJuJ3MgYG1hdGNoYCBtZXRob2QuXG5mdW5jdGlvbiBNYXRjaFJlc3VsdCh2YWx1ZSkge1xuICB0aGlzLnZhbHVlID0gdmFsdWU7XG59XG5cbk1hdGNoUmVzdWx0LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJ1tNYXRjaFJlc3VsdDogJyArIHRoaXMudmFsdWUgKyAnXSc7XG59O1xuXG4vLyBQYXR0ZXJuXG4vLyAtLS0tLS0tXG5cbmZ1bmN0aW9uIFBhdHRlcm4oKSB7fVxuXG4vLyBDcmVhdGVzIGEgY3VzdG9tIFBhdHRlcm4gY2xhc3MuIElmIGBwcm9wc2AgaGFzIGFuICdpbml0JyBwcm9wZXJ0eSwgaXQgd2lsbFxuLy8gYmUgY2FsbGVkIHRvIGluaXRpYWxpemUgbmV3bHktY3JlYXRlZCBpbnN0YW5jZXMuIEFsbCBvdGhlciBwcm9wZXJ0aWVzIGluXG4vLyBgcHJvcHNgIHdpbGwgYmUgY29waWVkIHRvIHRoZSBwcm90b3R5cGUgb2YgdGhlIG5ldyBjb25zdHJ1Y3Rvci5cblBhdHRlcm4uZXh0ZW5kID0gZnVuY3Rpb24ocHJvcHMpIHtcbiAgZnVuY3Rpb24gY3RvcigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCEoc2VsZiBpbnN0YW5jZW9mIGN0b3IpKSB7XG4gICAgICBzZWxmID0gbmV3IGN0b3IoKTtcbiAgICB9XG4gICAgaWYgKCdpbml0JyBpbiBwcm9wcykge1xuICAgICAgcHJvcHMuaW5pdC5hcHBseShzZWxmLCBBcnJheVByb3RvLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XG4gICAgfVxuICAgIGVuc3VyZSh0eXBlb2Ygc2VsZi5tYXRjaCA9PT0gJ2Z1bmN0aW9uJywgXCJQYXR0ZXJucyBtdXN0IGhhdmUgYSAnbWF0Y2gnIG1ldGhvZFwiKTtcbiAgICBlbnN1cmUodHlwZW9mIHNlbGYuYXJpdHkgPT09ICdudW1iZXInLCBcIlBhdHRlcm5zIG11c3QgaGF2ZSBhbiAnYXJpdHknIHByb3BlcnR5XCIpO1xuICAgIHJldHVybiBzZWxmO1xuICB9XG4gIHZhciBwcm90byA9IGN0b3IucHJvdG90eXBlID0gbmV3IFBhdHRlcm4oKTtcbiAgZm9yICh2YXIgayBpbiBwcm9wcykge1xuICAgIGlmIChrICE9PSAnaW5pdCcpIHtcbiAgICAgIHByb3RvW2tdID0gcHJvcHNba107XG4gICAgfVxuICB9XG4gIHJldHVybiBjdG9yO1xufTtcblxuLy8gRXhwb3NlIHNvbWUgdXNlZnVsIGZ1bmN0aW9ucyBhcyBpbnN0YW5jZSBtZXRob2RzIG9uIFBhdHRlcm4uXG5QYXR0ZXJuLnByb3RvdHlwZS5wZXJmb3JtTWF0Y2ggPSBwZXJmb3JtTWF0Y2g7XG5QYXR0ZXJuLnByb3RvdHlwZS5nZXRBcml0eSA9IGdldEFyaXR5O1xuXG4vLyBUeXBlcyBvZiBwYXR0ZXJuXG4vLyAtLS0tLS0tLS0tLS0tLS0tXG5cbnZhciBJcyA9IFBhdHRlcm4uZXh0ZW5kKHtcbiAgaW5pdDogZnVuY3Rpb24oZXhwZWN0ZWRWYWx1ZSkge1xuICAgIHRoaXMuZXhwZWN0ZWRWYWx1ZSA9IGV4cGVjdGVkVmFsdWU7XG4gIH0sXG4gIGFyaXR5OiAwLFxuICBtYXRjaDogZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gICAgcmV0dXJuIF9lcXVhbGl0eU1hdGNoKHZhbHVlLCB0aGlzLmV4cGVjdGVkVmFsdWUsIGJpbmRpbmdzKTtcbiAgfVxufSk7XG5cbnZhciBJdGVyYWJsZSA9IFBhdHRlcm4uZXh0ZW5kKHtcbiAgaW5pdDogZnVuY3Rpb24ocGF0dGVybnMpIHtcbiAgICB0aGlzLnBhdHRlcm5zID0gcGF0dGVybnM7XG4gICAgdGhpcy5hcml0eSA9IHBhdHRlcm5zXG4gICAgICAubWFwKGZ1bmN0aW9uKHBhdHRlcm4pIHsgcmV0dXJuIGdldEFyaXR5KHBhdHRlcm4pOyB9KVxuICAgICAgLnJlZHVjZShmdW5jdGlvbihhMSwgYTIpIHsgcmV0dXJuIGExICsgYTI7IH0sIDApO1xuICB9LFxuICBtYXRjaDogZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gICAgcmV0dXJuIGlzSXRlcmFibGUodmFsdWUpID9cbiAgICAgIF9hcnJheU1hdGNoKHRvQXJyYXkodmFsdWUpLCB0aGlzLnBhdHRlcm5zLCBiaW5kaW5ncykgOlxuICAgICAgZmFsc2U7XG4gIH1cbn0pO1xuXG52YXIgTWFueSA9IFBhdHRlcm4uZXh0ZW5kKHtcbiAgaW5pdDogZnVuY3Rpb24ocGF0dGVybikge1xuICAgIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG4gIH0sXG4gIGFyaXR5OiAxLFxuICBtYXRjaDogZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiJ21hbnknIHBhdHRlcm4gdXNlZCBvdXRzaWRlIGFycmF5IHBhdHRlcm5cIik7XG4gIH1cbn0pO1xuXG52YXIgT3B0ID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbihwYXR0ZXJuKSB7XG4gICAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbiAgfSxcbiAgYXJpdHk6IDEsXG4gIG1hdGNoOiBmdW5jdGlvbih2YWx1ZSwgYmluZGluZ3MpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCInb3B0JyBwYXR0ZXJuIHVzZWQgb3V0c2lkZSBhcnJheSBwYXR0ZXJuXCIpO1xuICB9XG59KTtcblxudmFyIFRyYW5zID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbihwYXR0ZXJuLCBmdW5jKSB7XG4gICAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbiAgICB0aGlzLmZ1bmMgPSBmdW5jO1xuICAgIGVuc3VyZShcbiAgICAgIHR5cGVvZiBmdW5jID09PSAnZnVuY3Rpb24nICYmIGZ1bmMubGVuZ3RoID09PSBnZXRBcml0eShwYXR0ZXJuKSxcbiAgICAgICdmdW5jIG11c3QgYmUgYSAnICsgZ2V0QXJpdHkocGF0dGVybikgKyAnLWFyZ3VtZW50IGZ1bmN0aW9uJ1xuICAgICk7XG4gIH0sXG4gIGFyaXR5OiAxLFxuICBtYXRjaDogZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gICAgdmFyIGJzID0gW107XG4gICAgaWYgKHBlcmZvcm1NYXRjaCh2YWx1ZSwgdGhpcy5wYXR0ZXJuLCBicykpIHtcbiAgICAgIHZhciBhbnMgPSB0aGlzLmZ1bmMuYXBwbHkodGhpcy50aGlzT2JqLCBicyk7XG4gICAgICBiaW5kaW5ncy5wdXNoKGFucyk7XG4gICAgICByZXR1cm4gbmV3IE1hdGNoUmVzdWx0KGFucyk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufSk7XG5cbnZhciBXaGVuID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbihwYXR0ZXJuLCBwcmVkaWNhdGUpIHtcbiAgICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xuICAgIHRoaXMucHJlZGljYXRlID0gcHJlZGljYXRlO1xuICAgIHRoaXMuYXJpdHkgPSBnZXRBcml0eShwYXR0ZXJuKTtcbiAgICBlbnN1cmUoXG4gICAgICB0eXBlb2YgcHJlZGljYXRlID09PSAnZnVuY3Rpb24nICYmIHByZWRpY2F0ZS5sZW5ndGggPT09IHRoaXMuYXJpdHksXG4gICAgICAncHJlZGljYXRlIG11c3QgYmUgYSAnICsgdGhpcy5hcml0eSArICctYXJndW1lbnQgZnVuY3Rpb24nXG4gICAgKTtcbiAgfSxcbiAgbWF0Y2g6IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICAgIHZhciBicyA9IFtdO1xuICAgIGlmIChwZXJmb3JtTWF0Y2godmFsdWUsIHRoaXMucGF0dGVybiwgYnMpICYmXG4gICAgICAgIHRoaXMucHJlZGljYXRlLmFwcGx5KHRoaXMudGhpc09iaiwgYnMpKSB7XG4gICAgICBiaW5kaW5ncy5wdXNoLmFwcGx5KGJpbmRpbmdzLCBicyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59KTtcblxudmFyIE9yID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbihwYXR0ZXJucykge1xuICAgIGVuc3VyZShwYXR0ZXJucy5sZW5ndGggPj0gMiwgXCInb3InIHJlcXVpcmVzIGF0IGxlYXN0IHR3byBwYXR0ZXJuc1wiKTtcbiAgICB0aGlzLnBhdHRlcm5zID0gcGF0dGVybnM7XG4gICAgdGhpcy5hcml0eSA9IGVuc3VyZVVuaWZvcm1Bcml0eShwYXR0ZXJucywgJ29yJyk7XG4gIH0sXG4gIG1hdGNoOiBmdW5jdGlvbih2YWx1ZSwgYmluZGluZ3MpIHtcbiAgICB2YXIgcGF0dGVybnMgPSB0aGlzLnBhdHRlcm5zO1xuICAgIHZhciBhbnMgPSBmYWxzZTtcbiAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBwYXR0ZXJucy5sZW5ndGggJiYgIWFuczsgaWR4KyspIHtcbiAgICAgIGFucyA9IHBlcmZvcm1NYXRjaCh2YWx1ZSwgcGF0dGVybnNbaWR4XSwgYmluZGluZ3MpO1xuICAgIH1cbiAgICByZXR1cm4gYW5zO1xuICB9XG59KTtcblxudmFyIEFuZCA9IFBhdHRlcm4uZXh0ZW5kKHtcbiAgaW5pdDogZnVuY3Rpb24ocGF0dGVybnMpIHtcbiAgICBlbnN1cmUocGF0dGVybnMubGVuZ3RoID49IDIsIFwiJ2FuZCcgcmVxdWlyZXMgYXQgbGVhc3QgdHdvIHBhdHRlcm5zXCIpO1xuICAgIHRoaXMucGF0dGVybnMgPSBwYXR0ZXJucztcbiAgICB0aGlzLmFyaXR5ID0gcGF0dGVybnMucmVkdWNlKGZ1bmN0aW9uKHN1bSwgcCkge1xuICAgICAgcmV0dXJuIHN1bSArIGdldEFyaXR5KHApOyB9LFxuICAgIDApO1xuICB9LFxuICBtYXRjaDogZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gICAgdmFyIHBhdHRlcm5zID0gdGhpcy5wYXR0ZXJucztcbiAgICB2YXIgYW5zID0gdHJ1ZTtcbiAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBwYXR0ZXJucy5sZW5ndGggJiYgYW5zOyBpZHgrKykge1xuICAgICAgYW5zID0gcGVyZm9ybU1hdGNoKHZhbHVlLCBwYXR0ZXJuc1tpZHhdLCBiaW5kaW5ncyk7XG4gICAgfVxuICAgIHJldHVybiBhbnM7XG4gIH1cbn0pO1xuXG4vLyBIZWxwZXJzXG4vLyAtLS0tLS0tXG5cbmZ1bmN0aW9uIF9hcnJheU1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncykge1xuICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZhciB2SWR4ID0gMDtcbiAgdmFyIHBJZHggPSAwO1xuICB3aGlsZSAocElkeCA8IHBhdHRlcm4ubGVuZ3RoKSB7XG4gICAgdmFyIHAgPSBwYXR0ZXJuW3BJZHgrK107XG4gICAgaWYgKHAgaW5zdGFuY2VvZiBNYW55KSB7XG4gICAgICBwID0gcC5wYXR0ZXJuO1xuICAgICAgdmFyIHZzID0gW107XG4gICAgICB3aGlsZSAodklkeCA8IHZhbHVlLmxlbmd0aCAmJiBwZXJmb3JtTWF0Y2godmFsdWVbdklkeF0sIHAsIHZzKSkge1xuICAgICAgICB2SWR4Kys7XG4gICAgICB9XG4gICAgICBiaW5kaW5ncy5wdXNoKHZzKTtcbiAgICB9IGVsc2UgaWYgKHAgaW5zdGFuY2VvZiBPcHQpIHtcbiAgICAgIHZhciBhbnMgPSB2SWR4IDwgdmFsdWUubGVuZ3RoID8gcGVyZm9ybU1hdGNoKHZhbHVlW3ZJZHhdLCBwLnBhdHRlcm4sIFtdKSA6IGZhbHNlO1xuICAgICAgaWYgKGFucykge1xuICAgICAgICBiaW5kaW5ncy5wdXNoKGFucyk7XG4gICAgICAgIHZJZHgrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJpbmRpbmdzLnB1c2godW5kZWZpbmVkKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHBlcmZvcm1NYXRjaCh2YWx1ZVt2SWR4XSwgcCwgYmluZGluZ3MpKSB7XG4gICAgICB2SWR4Kys7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHZJZHggPT09IHZhbHVlLmxlbmd0aCAmJiBwSWR4ID09PSBwYXR0ZXJuLmxlbmd0aDtcbn1cblxuZnVuY3Rpb24gX29iak1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncykge1xuICBmb3IgKHZhciBrIGluIHBhdHRlcm4pIHtcbiAgICBpZiAocGF0dGVybi5oYXNPd25Qcm9wZXJ0eShrKSAmJlxuICAgICAgICAhKGsgaW4gdmFsdWUpIHx8XG4gICAgICAgICFwZXJmb3JtTWF0Y2godmFsdWVba10sIHBhdHRlcm5ba10sIGJpbmRpbmdzKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gX2Z1bmN0aW9uTWF0Y2godmFsdWUsIGZ1bmMsIGJpbmRpbmdzKSB7XG4gIGlmIChmdW5jKHZhbHVlKSkge1xuICAgIGJpbmRpbmdzLnB1c2godmFsdWUpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gX2VxdWFsaXR5TWF0Y2godmFsdWUsIHBhdHRlcm4sIGJpbmRpbmdzKSB7XG4gIHJldHVybiB2YWx1ZSA9PT0gcGF0dGVybjtcbn1cblxuZnVuY3Rpb24gX3JlZ0V4cE1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncykge1xuICB2YXIgYW5zID0gcGF0dGVybi5leGVjKHZhbHVlKTtcbiAgaWYgKGFucyAhPT0gbnVsbCAmJiBhbnNbMF0gPT09IHZhbHVlKSB7XG4gICAgYmluZGluZ3MucHVzaChhbnMpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gcGVyZm9ybU1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncykge1xuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIFBhdHRlcm4pIHtcbiAgICByZXR1cm4gcGF0dGVybi5tYXRjaCh2YWx1ZSwgYmluZGluZ3MpO1xuICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocGF0dGVybikpIHtcbiAgICByZXR1cm4gX2FycmF5TWF0Y2godmFsdWUsIHBhdHRlcm4sIGJpbmRpbmdzKTtcbiAgfSBlbHNlIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgcmV0dXJuIF9yZWdFeHBNYXRjaCh2YWx1ZSwgcGF0dGVybiwgYmluZGluZ3MpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBwYXR0ZXJuID09PSAnb2JqZWN0JyAmJiBwYXR0ZXJuICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIF9vYmpNYXRjaCh2YWx1ZSwgcGF0dGVybiwgYmluZGluZ3MpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBwYXR0ZXJuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIF9mdW5jdGlvbk1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncyk7XG4gIH1cbiAgcmV0dXJuIF9lcXVhbGl0eU1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncyk7XG59XG5cbmZ1bmN0aW9uIGdldEFyaXR5KHBhdHRlcm4pIHtcbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBQYXR0ZXJuKSB7XG4gICAgcmV0dXJuIHBhdHRlcm4uYXJpdHk7XG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShwYXR0ZXJuKSkge1xuICAgIHJldHVybiBwYXR0ZXJuXG4gICAgICAubWFwKGZ1bmN0aW9uKHApIHsgcmV0dXJuIGdldEFyaXR5KHApOyB9KVxuICAgICAgLnJlZHVjZShmdW5jdGlvbihhMSwgYTIpIHsgcmV0dXJuIGExICsgYTI7IH0sIDApO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBwYXR0ZXJuID09PSAnZnVuY3Rpb24nIHx8IHBhdHRlcm4gaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICByZXR1cm4gMTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgcGF0dGVybiA9PT0gJ29iamVjdCcpIHtcbiAgICB2YXIgYW5zID0gMDtcbiAgICBmb3IgKHZhciBrIGluIHBhdHRlcm4pIHtcbiAgICAgIGlmIChwYXR0ZXJuLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgIGFucyArPSBnZXRBcml0eShwYXR0ZXJuW2tdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFucztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gMDtcbiAgfVxufVxuXG5mdW5jdGlvbiBlbnN1cmVVbmlmb3JtQXJpdHkocGF0dGVybnMsIG9wKSB7XG4gIHZhciByZXN1bHQgPSBnZXRBcml0eShwYXR0ZXJuc1swXSk7XG4gIGZvciAodmFyIGlkeCA9IDE7IGlkeCA8IHBhdHRlcm5zLmxlbmd0aDsgaWR4KyspIHtcbiAgICB2YXIgYSA9IGdldEFyaXR5KHBhdHRlcm5zW2lkeF0pO1xuICAgIGlmIChhICE9PSByZXN1bHQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihvcCArICc6IGV4cGVjdGVkIGFyaXR5ICcgKyByZXN1bHQgKyAnIGF0IGluZGV4ICcgKyBpZHggKyAnLCBnb3QgJyArIGEpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBlbnN1cmUoY29uZCwgbWVzc2FnZSkge1xuICBpZiAoIWNvbmQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gIH1cbn1cblxuLy8gTWF0Y2hlclxuLy8gLS0tLS0tLVxuXG5mdW5jdGlvbiBNYXRjaGVyKCkge1xuICB0aGlzLnBhdHRlcm5zID0gW107XG4gIHRoaXMudGhpc09iaiA9IHVuZGVmaW5lZDtcbn1cblxuTWF0Y2hlci5wcm90b3R5cGUud2l0aFRoaXMgPSBmdW5jdGlvbihvYmopIHtcbiAgdGhpcy50aGlzT2JqID0gb2JqO1xuICByZXR1cm4gdGhpcztcbn07XG5cbk1hdGNoZXIucHJvdG90eXBlLmFkZENhc2UgPSBmdW5jdGlvbihwYXR0ZXJuLCBvcHRGdW5jKSB7XG4gIHRoaXMucGF0dGVybnMucHVzaChvcHRGdW5jID8gTWF0Y2hlci50cmFucyhwYXR0ZXJuLCBvcHRGdW5jKSA6IHBhdHRlcm4pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbk1hdGNoZXIucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgdGhpcy5wYXR0ZXJucy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdmFyIGFucyA9IHBlcmZvcm1NYXRjaCh2YWx1ZSwgdGhpcy5wYXR0ZXJuc1tpZHhdLCBbXSk7XG4gICAgaWYgKGFucykge1xuICAgICAgcmV0dXJuIGFucyBpbnN0YW5jZW9mIE1hdGNoUmVzdWx0ID8gYW5zLnZhbHVlIDogdmFsdWU7XG4gICAgfVxuICB9XG4gIHRocm93IG5ldyBNYXRjaEZhaWx1cmUodmFsdWUsIG5ldyBFcnJvcigpLnN0YWNrKTtcbn07XG5cbk1hdGNoZXIucHJvdG90eXBlLnRvRnVuY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHsgcmV0dXJuIHNlbGYubWF0Y2godmFsdWUpOyB9O1xufTtcblxuLy8gUHJpbWl0aXZlIHBhdHRlcm5zXG5cbk1hdGNoZXIuXyAgICAgID0gZnVuY3Rpb24oeCkgeyByZXR1cm4gdHJ1ZTsgfTtcbk1hdGNoZXIuYm9vbCAgID0gZnVuY3Rpb24oeCkgeyByZXR1cm4gdHlwZW9mIHggPT09ICdib29sZWFuJzsgfTtcbk1hdGNoZXIubnVtYmVyID0gZnVuY3Rpb24oeCkgeyByZXR1cm4gdHlwZW9mIHggPT09ICdudW1iZXInOyB9O1xuTWF0Y2hlci5zdHJpbmcgPSBmdW5jdGlvbih4KSB7IHJldHVybiB0eXBlb2YgeCA9PT0gJ3N0cmluZyc7IH07XG5NYXRjaGVyLmNoYXIgICA9IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHR5cGVvZiB4ID09PSAnc3RyaW5nJyAmJiB4Lmxlbmd0aCA9PT0gMDsgfTtcblxuLy8gQ29tYmluYXRvcnNcblxuTWF0Y2hlci5pcyAgICAgICA9IGZ1bmN0aW9uKGV4cGVjdGVkVmFsdWUpICAgICB7IHJldHVybiBuZXcgSXMoZXhwZWN0ZWRWYWx1ZSk7IH07XG5NYXRjaGVyLml0ZXJhYmxlID0gZnVuY3Rpb24oLyogcDEsIHAyLCAuLi4gKi8pIHsgcmV0dXJuIG5ldyBJdGVyYWJsZShBcnJheVByb3RvLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7IH07XG5NYXRjaGVyLm1hbnkgICAgID0gZnVuY3Rpb24ocGF0dGVybikgICAgICAgICAgIHsgcmV0dXJuIG5ldyBNYW55KHBhdHRlcm4pOyB9O1xuTWF0Y2hlci5vcHQgICAgICA9IGZ1bmN0aW9uKHBhdHRlcm4pICAgICAgICAgICB7IHJldHVybiBuZXcgT3B0KHBhdHRlcm4pOyB9O1xuTWF0Y2hlci50cmFucyAgICA9IGZ1bmN0aW9uKHBhdHRlcm4sIGZ1bmMpICAgICB7IHJldHVybiBuZXcgVHJhbnMocGF0dGVybiwgZnVuYyk7IH07XG5NYXRjaGVyLndoZW4gICAgID0gZnVuY3Rpb24ocGF0dGVybiwgcHJlZCkgICAgIHsgcmV0dXJuIG5ldyBXaGVuKHBhdHRlcm4sIHByZWQpOyB9O1xuTWF0Y2hlci5vciAgICAgICA9IGZ1bmN0aW9uKC8qIHAxLCBwMiwgLi4uICovKSB7IHJldHVybiBuZXcgT3IoQXJyYXlQcm90by5zbGljZS5jYWxsKGFyZ3VtZW50cykpOyB9O1xuTWF0Y2hlci5hbmQgICAgICA9IGZ1bmN0aW9uKC8qIHAxLCBwMiwgLi4uICovKSB7IHJldHVybiBuZXcgQW5kKEFycmF5UHJvdG8uc2xpY2UuY2FsbChhcmd1bWVudHMpKTsgfTtcblxuLy8gT3BlcmF0b3JzXG5cbk1hdGNoZXIuaW5zdGFuY2VPZiA9IGZ1bmN0aW9uKGNsYXp6KSB7IHJldHVybiBmdW5jdGlvbih4KSB7IHJldHVybiB4IGluc3RhbmNlb2YgY2xheno7IH07IH07XG5cbk1hdGNoZXIuTWF0Y2hGYWlsdXJlID0gTWF0Y2hGYWlsdXJlO1xuXG4vLyBUZXJzZSBpbnRlcmZhY2Vcbi8vIC0tLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBtYXRjaCh2IC8qICwgcGF0MSwgZnVuMSwgcGF0MiwgZnVuMiwgLi4uICovKSB7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAvLyBBbGxvdyBjYWxsaW5nIHcvIDIgYXJncywgd2hlcmUgdGhlIHNlY29uZCBhcmcgaXMgYW4gQXJyYXkgW3AxLCBmMSwgLi4uXS5cbiAgaWYgKGFyZ3MubGVuZ3RoID09PSAyICYmIEFycmF5LmlzQXJyYXkoYXJnc1sxXSkpIHtcbiAgICBhcmdzID0gW2FyZ3NbMF1dLmNvbmNhdChhcmdzWzFdKTtcbiAgfVxuICBpZiAoYXJncy5sZW5ndGggJSAyICE9PSAxKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdtYXRjaCBjYWxsZWQgd2l0aCBpbnZhbGlkIGFyZ3VtZW50cycpO1xuICB9XG4gIHZhciBtID0gbmV3IE1hdGNoZXIoKTtcbiAgZm9yICh2YXIgaWR4ID0gMTsgaWR4IDwgYXJncy5sZW5ndGg7IGlkeCArPSAyKSB7XG4gICAgdmFyIHBhdHRlcm4gPSBhcmdzW2lkeF07XG4gICAgdmFyIGZ1bmMgPSBhcmdzW2lkeCArIDFdO1xuICAgIG0uYWRkQ2FzZShwYXR0ZXJuLCBmdW5jKTtcbiAgfVxuICBtLmFkZENhc2UoTWF0Y2hlci5fLCBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIEZBSUw7IH0pO1xuICByZXR1cm4gbS5tYXRjaCh2KTtcbn1cblxubWF0Y2guRkFJTCA9IEZBSUw7XG5cbi8vIEV4cG9ydHNcbi8vIC0tLS0tLS1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIE1hdGNoZXI6IE1hdGNoZXIsXG4gIG1hdGNoOiBtYXRjaCxcbiAgUGF0dGVybjogUGF0dGVyblxufTtcbiIsIi8qIGdsb2JhbCBTeW1ib2wgKi9cblxudmFyIElURVJBVE9SX1NZTUJPTCA9IHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgU3ltYm9sLml0ZXJhdG9yO1xudmFyIEZBS0VfSVRFUkFUT1JfU1lNQk9MID0gJ0BAaXRlcmF0b3InO1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vLyBIZWxwZXJzXG4vLyAtLS0tLS0tXG5cbmZ1bmN0aW9uIGlzU3RyaW5nKG9iaikge1xuXHRyZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBTdHJpbmddJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIob2JqKSB7XG5cdHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IE51bWJlcl0nO1xufVxuXG5mdW5jdGlvbiBpc0FycmF5TGlrZShvYmopIHtcblx0cmV0dXJuIGlzTnVtYmVyKG9iai5sZW5ndGgpICYmICFpc1N0cmluZyhvYmopO1xufVxuXG4vLyBBcnJheUl0ZXJhdG9yXG4vLyAtLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIEFycmF5SXRlcmF0b3IoaXRlcmF0ZWUpIHtcblx0dGhpcy5faXRlcmF0ZWUgPSBpdGVyYXRlZTtcblx0dGhpcy5faSA9IDA7XG5cdHRoaXMuX2xlbiA9IGl0ZXJhdGVlLmxlbmd0aDtcbn1cblxuQXJyYXlJdGVyYXRvci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uKCkge1xuXHRpZiAodGhpcy5faSA8IHRoaXMuX2xlbikge1xuXHRcdHJldHVybiB7IGRvbmU6IGZhbHNlLCB2YWx1ZTogdGhpcy5faXRlcmF0ZWVbdGhpcy5faSsrXSB9O1xuXHR9XG5cdHJldHVybiB7IGRvbmU6IHRydWUgfTtcbn07XG5cbkFycmF5SXRlcmF0b3IucHJvdG90eXBlW0ZBS0VfSVRFUkFUT1JfU1lNQk9MXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfTtcblxuaWYgKElURVJBVE9SX1NZTUJPTCkge1xuXHRBcnJheUl0ZXJhdG9yLnByb3RvdHlwZVtJVEVSQVRPUl9TWU1CT0xdID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9O1xufVxuXG4vLyBFeHBvcnRzXG4vLyAtLS0tLS0tXG5cbi8vIFJldHVybnMgYW4gaXRlcmF0b3IgKGFuIG9iamVjdCB0aGF0IGhhcyBhIG5leHQoKSBtZXRob2QpIGZvciBgb2JqYC5cbi8vIEZpcnN0LCBpdCB0cmllcyB0byB1c2UgdGhlIEVTNiBpdGVyYXRvciBwcm90b2NvbCAoU3ltYm9sLml0ZXJhdG9yKS5cbi8vIEl0IGZhbGxzIGJhY2sgdG8gdGhlICdmYWtlJyBpdGVyYXRvciBwcm90b2NvbCAoJ0BAaXRlcmF0b3InKSB0aGF0IGlzXG4vLyB1c2VkIGJ5IHNvbWUgbGlicmFyaWVzIChlLmcuIGltbXV0YWJsZS1qcykuIEZpbmFsbHksIGlmIHRoZSBvYmplY3QgaGFzXG4vLyBhIG51bWVyaWMgYGxlbmd0aGAgcHJvcGVydHkgYW5kIGlzIG5vdCBhIHN0cmluZywgaXQgaXMgdHJlYXRlZCBhcyBhbiBBcnJheVxuLy8gdG8gYmUgaXRlcmF0ZWQgdXNpbmcgYW4gQXJyYXlJdGVyYXRvci5cbmZ1bmN0aW9uIGdldEl0ZXJhdG9yKG9iaikge1xuXHRpZiAoIW9iaikge1xuXHRcdHJldHVybjtcblx0fVxuXHRpZiAoSVRFUkFUT1JfU1lNQk9MICYmIHR5cGVvZiBvYmpbSVRFUkFUT1JfU1lNQk9MXSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdHJldHVybiBvYmpbSVRFUkFUT1JfU1lNQk9MXSgpO1xuXHR9XG5cdGlmICh0eXBlb2Ygb2JqW0ZBS0VfSVRFUkFUT1JfU1lNQk9MXSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdHJldHVybiBvYmpbRkFLRV9JVEVSQVRPUl9TWU1CT0xdKCk7XG5cdH1cblx0aWYgKGlzQXJyYXlMaWtlKG9iaikpIHtcblx0XHRyZXR1cm4gbmV3IEFycmF5SXRlcmF0b3Iob2JqKTtcblx0fVxufVxuXG5mdW5jdGlvbiBpc0l0ZXJhYmxlKG9iaikge1xuXHRpZiAob2JqKSB7XG5cdFx0cmV0dXJuIChJVEVSQVRPUl9TWU1CT0wgJiYgdHlwZW9mIG9ialtJVEVSQVRPUl9TWU1CT0xdID09PSAnZnVuY3Rpb24nKSB8fFxuXHRcdFx0XHRcdCB0eXBlb2Ygb2JqW0ZBS0VfSVRFUkFUT1JfU1lNQk9MXSA9PT0gJ2Z1bmN0aW9uJyB8fFxuXHRcdFx0XHRcdCBpc0FycmF5TGlrZShvYmopO1xuXHR9XG5cdHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gdG9BcnJheShpdGVyYWJsZSkge1xuXHR2YXIgaXRlciA9IGdldEl0ZXJhdG9yKGl0ZXJhYmxlKTtcblx0aWYgKGl0ZXIpIHtcblx0XHR2YXIgcmVzdWx0ID0gW107XG5cdFx0dmFyIG5leHQ7XG5cdFx0d2hpbGUgKCEobmV4dCA9IGl0ZXIubmV4dCgpKS5kb25lKSB7XG5cdFx0XHRyZXN1bHQucHVzaChuZXh0LnZhbHVlKTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0Z2V0SXRlcmF0b3I6IGdldEl0ZXJhdG9yLFxuXHRpc0l0ZXJhYmxlOiBpc0l0ZXJhYmxlLFxuXHR0b0FycmF5OiB0b0FycmF5XG59O1xuIl19

