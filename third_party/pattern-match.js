!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.pm=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var iterable = _dereq_('./lib/iterable');
var isIterable = iterable.isIterable;
var toArray = iterable.toArray;

var FAIL = { fail: true };
var ArrayProto = Array.prototype;

function MatchFailure(value, stack) {
  this.value = value;
  this.stack = stack;
}

MatchFailure.prototype.toString = function() {
  return 'match failure';
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
      FAIL;
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
    var ans = performMatch(value, this.pattern, bs);
    if (ans === FAIL) {
      return FAIL;
    } else {
      ans = this.func.apply(this.thisObj, bs);
      bindings.push(ans);
      return ans;
    }
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
    var ans = performMatch(value, this.pattern, bs);
    if (ans === FAIL || !this.predicate.apply(this.thisObj, bs)) {
      return FAIL;
    } else {
      bindings.push.apply(bindings, bs);
      return value;
    }
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
    var ans = FAIL;
    for (var idx = 0; idx < patterns.length && ans === FAIL; idx++) {
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
    var ans;
    for (var idx = 0; idx < patterns.length && ans !== FAIL; idx++) {
      ans = performMatch(value, patterns[idx], bindings);
    }
    return ans;
  }
});

// Helpers
// -------

function _arrayMatch(value, pattern, bindings) {
  if (!Array.isArray(value)) {
    return FAIL;
  }
  var vIdx = 0;
  var pIdx = 0;
  while (pIdx < pattern.length) {
    var p = pattern[pIdx++];
    if (p instanceof Many) {
      p = p.pattern;
      var vs = [];
      while (vIdx < value.length && performMatch(value[vIdx], p, vs) !== FAIL) {
        vIdx++;
      }
      bindings.push(vs);
    } else if (p instanceof Opt) {
      var ans = vIdx < value.length ? performMatch(value[vIdx], p.pattern, []) : FAIL;
      if (ans === FAIL) {
        bindings.push(undefined);
      } else {
        bindings.push(ans);
        vIdx++;
      }
    } else if (performMatch(value[vIdx], p, bindings) !== FAIL) {
      vIdx++;
    } else {
      return FAIL;
    }
  }
  return vIdx === value.length && pIdx === pattern.length ? value : FAIL;
}

function _objMatch(value, pattern, bindings) {
  for (var k in pattern) {
    if (pattern.hasOwnProperty(k) &&
        !(k in value) ||
        performMatch(value[k], pattern[k], bindings) === FAIL) {
      return FAIL;
    }
  }
  return value;
}

function _functionMatch(value, func, bindings) {
  if (func(value)) {
    bindings.push(value);
    return value;
  } else {
    return FAIL;
  }
}

function _equalityMatch(value, pattern, bindings) {
  return value === pattern ? value : FAIL;
}

function _regExpMatch(value, pattern, bindings) {
  var ans = pattern.exec(value);
  if (ans !== null && ans[0] === value) {
    bindings.push(ans);
    return value;
  } else {
    return FAIL;
  }
}

function performMatch(value, pattern, bindings) {
  if (pattern instanceof Pattern) {
    ensure(typeof pattern.match === 'function', "Patterns must have a 'match' method");
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
    ensure(typeof pattern.arity === 'number', "Patterns must have an 'arity' property");
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
    if (ans !== FAIL) {
      return ans;
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
  try {
    return m.match(v);
  } catch (e) {
    if (e instanceof MatchFailure) {
      return FAIL;
    } else {
      throw e;
    }
  }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZHVicm95L2Rldi9jZGcvcGF0dGVybi1tYXRjaC9pbmRleC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L2NkZy9wYXR0ZXJuLW1hdGNoL2xpYi9pdGVyYWJsZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBpdGVyYWJsZSA9IHJlcXVpcmUoJy4vbGliL2l0ZXJhYmxlJyk7XG52YXIgaXNJdGVyYWJsZSA9IGl0ZXJhYmxlLmlzSXRlcmFibGU7XG52YXIgdG9BcnJheSA9IGl0ZXJhYmxlLnRvQXJyYXk7XG5cbnZhciBGQUlMID0geyBmYWlsOiB0cnVlIH07XG52YXIgQXJyYXlQcm90byA9IEFycmF5LnByb3RvdHlwZTtcblxuZnVuY3Rpb24gTWF0Y2hGYWlsdXJlKHZhbHVlLCBzdGFjaykge1xuICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gIHRoaXMuc3RhY2sgPSBzdGFjaztcbn1cblxuTWF0Y2hGYWlsdXJlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJ21hdGNoIGZhaWx1cmUnO1xufTtcblxuLy8gUGF0dGVyblxuLy8gLS0tLS0tLVxuXG5mdW5jdGlvbiBQYXR0ZXJuKCkge31cblxuLy8gQ3JlYXRlcyBhIGN1c3RvbSBQYXR0ZXJuIGNsYXNzLiBJZiBgcHJvcHNgIGhhcyBhbiAnaW5pdCcgcHJvcGVydHksIGl0IHdpbGxcbi8vIGJlIGNhbGxlZCB0byBpbml0aWFsaXplIG5ld2x5LWNyZWF0ZWQgaW5zdGFuY2VzLiBBbGwgb3RoZXIgcHJvcGVydGllcyBpblxuLy8gYHByb3BzYCB3aWxsIGJlIGNvcGllZCB0byB0aGUgcHJvdG90eXBlIG9mIHRoZSBuZXcgY29uc3RydWN0b3IuXG5QYXR0ZXJuLmV4dGVuZCA9IGZ1bmN0aW9uKHByb3BzKSB7XG4gIGZ1bmN0aW9uIGN0b3IoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghKHNlbGYgaW5zdGFuY2VvZiBjdG9yKSkge1xuICAgICAgc2VsZiA9IG5ldyBjdG9yKCk7XG4gICAgfVxuICAgIGlmICgnaW5pdCcgaW4gcHJvcHMpIHtcbiAgICAgIHByb3BzLmluaXQuYXBwbHkoc2VsZiwgQXJyYXlQcm90by5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuICAgIH1cbiAgICByZXR1cm4gc2VsZjtcbiAgfVxuICB2YXIgcHJvdG8gPSBjdG9yLnByb3RvdHlwZSA9IG5ldyBQYXR0ZXJuKCk7XG4gIGZvciAodmFyIGsgaW4gcHJvcHMpIHtcbiAgICBpZiAoayAhPT0gJ2luaXQnKSB7XG4gICAgICBwcm90b1trXSA9IHByb3BzW2tdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gY3Rvcjtcbn07XG5cbi8vIEV4cG9zZSBzb21lIHVzZWZ1bCBmdW5jdGlvbnMgYXMgaW5zdGFuY2UgbWV0aG9kcyBvbiBQYXR0ZXJuLlxuUGF0dGVybi5wcm90b3R5cGUucGVyZm9ybU1hdGNoID0gcGVyZm9ybU1hdGNoO1xuUGF0dGVybi5wcm90b3R5cGUuZ2V0QXJpdHkgPSBnZXRBcml0eTtcblxuLy8gVHlwZXMgb2YgcGF0dGVyblxuLy8gLS0tLS0tLS0tLS0tLS0tLVxuXG52YXIgSXMgPSBQYXR0ZXJuLmV4dGVuZCh7XG4gIGluaXQ6IGZ1bmN0aW9uKGV4cGVjdGVkVmFsdWUpIHtcbiAgICB0aGlzLmV4cGVjdGVkVmFsdWUgPSBleHBlY3RlZFZhbHVlO1xuICB9LFxuICBhcml0eTogMCxcbiAgbWF0Y2g6IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICAgIHJldHVybiBfZXF1YWxpdHlNYXRjaCh2YWx1ZSwgdGhpcy5leHBlY3RlZFZhbHVlLCBiaW5kaW5ncyk7XG4gIH1cbn0pO1xuXG52YXIgSXRlcmFibGUgPSBQYXR0ZXJuLmV4dGVuZCh7XG4gIGluaXQ6IGZ1bmN0aW9uKHBhdHRlcm5zKSB7XG4gICAgdGhpcy5wYXR0ZXJucyA9IHBhdHRlcm5zO1xuICAgIHRoaXMuYXJpdHkgPSBwYXR0ZXJuc1xuICAgICAgLm1hcChmdW5jdGlvbihwYXR0ZXJuKSB7IHJldHVybiBnZXRBcml0eShwYXR0ZXJuKTsgfSlcbiAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYTEsIGEyKSB7IHJldHVybiBhMSArIGEyOyB9LCAwKTtcbiAgfSxcbiAgbWF0Y2g6IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICAgIHJldHVybiBpc0l0ZXJhYmxlKHZhbHVlKSA/XG4gICAgICBfYXJyYXlNYXRjaCh0b0FycmF5KHZhbHVlKSwgdGhpcy5wYXR0ZXJucywgYmluZGluZ3MpIDpcbiAgICAgIEZBSUw7XG4gIH1cbn0pO1xuXG52YXIgTWFueSA9IFBhdHRlcm4uZXh0ZW5kKHtcbiAgaW5pdDogZnVuY3Rpb24ocGF0dGVybikge1xuICAgIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG4gIH0sXG4gIGFyaXR5OiAxLFxuICBtYXRjaDogZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiJ21hbnknIHBhdHRlcm4gdXNlZCBvdXRzaWRlIGFycmF5IHBhdHRlcm5cIik7XG4gIH1cbn0pO1xuXG52YXIgT3B0ID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbihwYXR0ZXJuKSB7XG4gICAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbiAgfSxcbiAgYXJpdHk6IDEsXG4gIG1hdGNoOiBmdW5jdGlvbih2YWx1ZSwgYmluZGluZ3MpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCInb3B0JyBwYXR0ZXJuIHVzZWQgb3V0c2lkZSBhcnJheSBwYXR0ZXJuXCIpO1xuICB9XG59KTtcblxudmFyIFRyYW5zID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbihwYXR0ZXJuLCBmdW5jKSB7XG4gICAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbiAgICB0aGlzLmZ1bmMgPSBmdW5jO1xuICAgIGVuc3VyZShcbiAgICAgIHR5cGVvZiBmdW5jID09PSAnZnVuY3Rpb24nICYmIGZ1bmMubGVuZ3RoID09PSBnZXRBcml0eShwYXR0ZXJuKSxcbiAgICAgICdmdW5jIG11c3QgYmUgYSAnICsgZ2V0QXJpdHkocGF0dGVybikgKyAnLWFyZ3VtZW50IGZ1bmN0aW9uJ1xuICAgICk7XG4gIH0sXG4gIGFyaXR5OiAxLFxuICBtYXRjaDogZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gICAgdmFyIGJzID0gW107XG4gICAgdmFyIGFucyA9IHBlcmZvcm1NYXRjaCh2YWx1ZSwgdGhpcy5wYXR0ZXJuLCBicyk7XG4gICAgaWYgKGFucyA9PT0gRkFJTCkge1xuICAgICAgcmV0dXJuIEZBSUw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFucyA9IHRoaXMuZnVuYy5hcHBseSh0aGlzLnRoaXNPYmosIGJzKTtcbiAgICAgIGJpbmRpbmdzLnB1c2goYW5zKTtcbiAgICAgIHJldHVybiBhbnM7XG4gICAgfVxuICB9XG59KTtcblxudmFyIFdoZW4gPSBQYXR0ZXJuLmV4dGVuZCh7XG4gIGluaXQ6IGZ1bmN0aW9uKHBhdHRlcm4sIHByZWRpY2F0ZSkge1xuICAgIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG4gICAgdGhpcy5wcmVkaWNhdGUgPSBwcmVkaWNhdGU7XG4gICAgdGhpcy5hcml0eSA9IGdldEFyaXR5KHBhdHRlcm4pO1xuICAgIGVuc3VyZShcbiAgICAgIHR5cGVvZiBwcmVkaWNhdGUgPT09ICdmdW5jdGlvbicgJiYgcHJlZGljYXRlLmxlbmd0aCA9PT0gdGhpcy5hcml0eSxcbiAgICAgICdwcmVkaWNhdGUgbXVzdCBiZSBhICcgKyB0aGlzLmFyaXR5ICsgJy1hcmd1bWVudCBmdW5jdGlvbidcbiAgICApO1xuICB9LFxuICBtYXRjaDogZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gICAgdmFyIGJzID0gW107XG4gICAgdmFyIGFucyA9IHBlcmZvcm1NYXRjaCh2YWx1ZSwgdGhpcy5wYXR0ZXJuLCBicyk7XG4gICAgaWYgKGFucyA9PT0gRkFJTCB8fCAhdGhpcy5wcmVkaWNhdGUuYXBwbHkodGhpcy50aGlzT2JqLCBicykpIHtcbiAgICAgIHJldHVybiBGQUlMO1xuICAgIH0gZWxzZSB7XG4gICAgICBiaW5kaW5ncy5wdXNoLmFwcGx5KGJpbmRpbmdzLCBicyk7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICB9XG59KTtcblxudmFyIE9yID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbihwYXR0ZXJucykge1xuICAgIGVuc3VyZShwYXR0ZXJucy5sZW5ndGggPj0gMiwgXCInb3InIHJlcXVpcmVzIGF0IGxlYXN0IHR3byBwYXR0ZXJuc1wiKTtcbiAgICB0aGlzLnBhdHRlcm5zID0gcGF0dGVybnM7XG4gICAgdGhpcy5hcml0eSA9IGVuc3VyZVVuaWZvcm1Bcml0eShwYXR0ZXJucywgJ29yJyk7XG4gIH0sXG4gIG1hdGNoOiBmdW5jdGlvbih2YWx1ZSwgYmluZGluZ3MpIHtcbiAgICB2YXIgcGF0dGVybnMgPSB0aGlzLnBhdHRlcm5zO1xuICAgIHZhciBhbnMgPSBGQUlMO1xuICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IHBhdHRlcm5zLmxlbmd0aCAmJiBhbnMgPT09IEZBSUw7IGlkeCsrKSB7XG4gICAgICBhbnMgPSBwZXJmb3JtTWF0Y2godmFsdWUsIHBhdHRlcm5zW2lkeF0sIGJpbmRpbmdzKTtcbiAgICB9XG4gICAgcmV0dXJuIGFucztcbiAgfVxufSk7XG5cbnZhciBBbmQgPSBQYXR0ZXJuLmV4dGVuZCh7XG4gIGluaXQ6IGZ1bmN0aW9uKHBhdHRlcm5zKSB7XG4gICAgZW5zdXJlKHBhdHRlcm5zLmxlbmd0aCA+PSAyLCBcIidhbmQnIHJlcXVpcmVzIGF0IGxlYXN0IHR3byBwYXR0ZXJuc1wiKTtcbiAgICB0aGlzLnBhdHRlcm5zID0gcGF0dGVybnM7XG4gICAgdGhpcy5hcml0eSA9IHBhdHRlcm5zLnJlZHVjZShmdW5jdGlvbihzdW0sIHApIHtcbiAgICAgIHJldHVybiBzdW0gKyBnZXRBcml0eShwKTsgfSxcbiAgICAwKTtcbiAgfSxcbiAgbWF0Y2g6IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICAgIHZhciBwYXR0ZXJucyA9IHRoaXMucGF0dGVybnM7XG4gICAgdmFyIGFucztcbiAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBwYXR0ZXJucy5sZW5ndGggJiYgYW5zICE9PSBGQUlMOyBpZHgrKykge1xuICAgICAgYW5zID0gcGVyZm9ybU1hdGNoKHZhbHVlLCBwYXR0ZXJuc1tpZHhdLCBiaW5kaW5ncyk7XG4gICAgfVxuICAgIHJldHVybiBhbnM7XG4gIH1cbn0pO1xuXG4vLyBIZWxwZXJzXG4vLyAtLS0tLS0tXG5cbmZ1bmN0aW9uIF9hcnJheU1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncykge1xuICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgcmV0dXJuIEZBSUw7XG4gIH1cbiAgdmFyIHZJZHggPSAwO1xuICB2YXIgcElkeCA9IDA7XG4gIHdoaWxlIChwSWR4IDwgcGF0dGVybi5sZW5ndGgpIHtcbiAgICB2YXIgcCA9IHBhdHRlcm5bcElkeCsrXTtcbiAgICBpZiAocCBpbnN0YW5jZW9mIE1hbnkpIHtcbiAgICAgIHAgPSBwLnBhdHRlcm47XG4gICAgICB2YXIgdnMgPSBbXTtcbiAgICAgIHdoaWxlICh2SWR4IDwgdmFsdWUubGVuZ3RoICYmIHBlcmZvcm1NYXRjaCh2YWx1ZVt2SWR4XSwgcCwgdnMpICE9PSBGQUlMKSB7XG4gICAgICAgIHZJZHgrKztcbiAgICAgIH1cbiAgICAgIGJpbmRpbmdzLnB1c2godnMpO1xuICAgIH0gZWxzZSBpZiAocCBpbnN0YW5jZW9mIE9wdCkge1xuICAgICAgdmFyIGFucyA9IHZJZHggPCB2YWx1ZS5sZW5ndGggPyBwZXJmb3JtTWF0Y2godmFsdWVbdklkeF0sIHAucGF0dGVybiwgW10pIDogRkFJTDtcbiAgICAgIGlmIChhbnMgPT09IEZBSUwpIHtcbiAgICAgICAgYmluZGluZ3MucHVzaCh1bmRlZmluZWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYmluZGluZ3MucHVzaChhbnMpO1xuICAgICAgICB2SWR4Kys7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChwZXJmb3JtTWF0Y2godmFsdWVbdklkeF0sIHAsIGJpbmRpbmdzKSAhPT0gRkFJTCkge1xuICAgICAgdklkeCsrO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gRkFJTDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHZJZHggPT09IHZhbHVlLmxlbmd0aCAmJiBwSWR4ID09PSBwYXR0ZXJuLmxlbmd0aCA/IHZhbHVlIDogRkFJTDtcbn1cblxuZnVuY3Rpb24gX29iak1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncykge1xuICBmb3IgKHZhciBrIGluIHBhdHRlcm4pIHtcbiAgICBpZiAocGF0dGVybi5oYXNPd25Qcm9wZXJ0eShrKSAmJlxuICAgICAgICAhKGsgaW4gdmFsdWUpIHx8XG4gICAgICAgIHBlcmZvcm1NYXRjaCh2YWx1ZVtrXSwgcGF0dGVybltrXSwgYmluZGluZ3MpID09PSBGQUlMKSB7XG4gICAgICByZXR1cm4gRkFJTDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBfZnVuY3Rpb25NYXRjaCh2YWx1ZSwgZnVuYywgYmluZGluZ3MpIHtcbiAgaWYgKGZ1bmModmFsdWUpKSB7XG4gICAgYmluZGluZ3MucHVzaCh2YWx1ZSk7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBGQUlMO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9lcXVhbGl0eU1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncykge1xuICByZXR1cm4gdmFsdWUgPT09IHBhdHRlcm4gPyB2YWx1ZSA6IEZBSUw7XG59XG5cbmZ1bmN0aW9uIF9yZWdFeHBNYXRjaCh2YWx1ZSwgcGF0dGVybiwgYmluZGluZ3MpIHtcbiAgdmFyIGFucyA9IHBhdHRlcm4uZXhlYyh2YWx1ZSk7XG4gIGlmIChhbnMgIT09IG51bGwgJiYgYW5zWzBdID09PSB2YWx1ZSkge1xuICAgIGJpbmRpbmdzLnB1c2goYW5zKTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIEZBSUw7XG4gIH1cbn1cblxuZnVuY3Rpb24gcGVyZm9ybU1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncykge1xuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIFBhdHRlcm4pIHtcbiAgICBlbnN1cmUodHlwZW9mIHBhdHRlcm4ubWF0Y2ggPT09ICdmdW5jdGlvbicsIFwiUGF0dGVybnMgbXVzdCBoYXZlIGEgJ21hdGNoJyBtZXRob2RcIik7XG4gICAgcmV0dXJuIHBhdHRlcm4ubWF0Y2godmFsdWUsIGJpbmRpbmdzKTtcbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHBhdHRlcm4pKSB7XG4gICAgcmV0dXJuIF9hcnJheU1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncyk7XG4gIH0gZWxzZSBpZiAocGF0dGVybiBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgIHJldHVybiBfcmVnRXhwTWF0Y2godmFsdWUsIHBhdHRlcm4sIGJpbmRpbmdzKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgcGF0dGVybiA9PT0gJ29iamVjdCcgJiYgcGF0dGVybiAhPT0gbnVsbCkge1xuICAgIHJldHVybiBfb2JqTWF0Y2godmFsdWUsIHBhdHRlcm4sIGJpbmRpbmdzKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgcGF0dGVybiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBfZnVuY3Rpb25NYXRjaCh2YWx1ZSwgcGF0dGVybiwgYmluZGluZ3MpO1xuICB9XG4gIHJldHVybiBfZXF1YWxpdHlNYXRjaCh2YWx1ZSwgcGF0dGVybiwgYmluZGluZ3MpO1xufVxuXG5mdW5jdGlvbiBnZXRBcml0eShwYXR0ZXJuKSB7XG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgUGF0dGVybikge1xuICAgIGVuc3VyZSh0eXBlb2YgcGF0dGVybi5hcml0eSA9PT0gJ251bWJlcicsIFwiUGF0dGVybnMgbXVzdCBoYXZlIGFuICdhcml0eScgcHJvcGVydHlcIik7XG4gICAgcmV0dXJuIHBhdHRlcm4uYXJpdHk7XG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShwYXR0ZXJuKSkge1xuICAgIHJldHVybiBwYXR0ZXJuXG4gICAgICAubWFwKGZ1bmN0aW9uKHApIHsgcmV0dXJuIGdldEFyaXR5KHApOyB9KVxuICAgICAgLnJlZHVjZShmdW5jdGlvbihhMSwgYTIpIHsgcmV0dXJuIGExICsgYTI7IH0sIDApO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBwYXR0ZXJuID09PSAnZnVuY3Rpb24nIHx8IHBhdHRlcm4gaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICByZXR1cm4gMTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgcGF0dGVybiA9PT0gJ29iamVjdCcpIHtcbiAgICB2YXIgYW5zID0gMDtcbiAgICBmb3IgKHZhciBrIGluIHBhdHRlcm4pIHtcbiAgICAgIGlmIChwYXR0ZXJuLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgIGFucyArPSBnZXRBcml0eShwYXR0ZXJuW2tdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFucztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gMDtcbiAgfVxufVxuXG5mdW5jdGlvbiBlbnN1cmVVbmlmb3JtQXJpdHkocGF0dGVybnMsIG9wKSB7XG4gIHZhciByZXN1bHQgPSBnZXRBcml0eShwYXR0ZXJuc1swXSk7XG4gIGZvciAodmFyIGlkeCA9IDE7IGlkeCA8IHBhdHRlcm5zLmxlbmd0aDsgaWR4KyspIHtcbiAgICB2YXIgYSA9IGdldEFyaXR5KHBhdHRlcm5zW2lkeF0pO1xuICAgIGlmIChhICE9PSByZXN1bHQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihvcCArICc6IGV4cGVjdGVkIGFyaXR5ICcgKyByZXN1bHQgKyAnIGF0IGluZGV4ICcgKyBpZHggKyAnLCBnb3QgJyArIGEpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBlbnN1cmUoY29uZCwgbWVzc2FnZSkge1xuICBpZiAoIWNvbmQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gIH1cbn1cblxuLy8gTWF0Y2hlclxuLy8gLS0tLS0tLVxuXG5mdW5jdGlvbiBNYXRjaGVyKCkge1xuICB0aGlzLnBhdHRlcm5zID0gW107XG4gIHRoaXMudGhpc09iaiA9IHVuZGVmaW5lZDtcbn1cblxuTWF0Y2hlci5wcm90b3R5cGUud2l0aFRoaXMgPSBmdW5jdGlvbihvYmopIHtcbiAgdGhpcy50aGlzT2JqID0gb2JqO1xuICByZXR1cm4gdGhpcztcbn07XG5cbk1hdGNoZXIucHJvdG90eXBlLmFkZENhc2UgPSBmdW5jdGlvbihwYXR0ZXJuLCBvcHRGdW5jKSB7XG4gIHRoaXMucGF0dGVybnMucHVzaChvcHRGdW5jID8gTWF0Y2hlci50cmFucyhwYXR0ZXJuLCBvcHRGdW5jKSA6IHBhdHRlcm4pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbk1hdGNoZXIucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgdGhpcy5wYXR0ZXJucy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdmFyIGFucyA9IHBlcmZvcm1NYXRjaCh2YWx1ZSwgdGhpcy5wYXR0ZXJuc1tpZHhdLCBbXSk7XG4gICAgaWYgKGFucyAhPT0gRkFJTCkge1xuICAgICAgcmV0dXJuIGFucztcbiAgICB9XG4gIH1cbiAgdGhyb3cgbmV3IE1hdGNoRmFpbHVyZSh2YWx1ZSwgbmV3IEVycm9yKCkuc3RhY2spO1xufTtcblxuTWF0Y2hlci5wcm90b3R5cGUudG9GdW5jdGlvbiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiBmdW5jdGlvbih2YWx1ZSkgeyByZXR1cm4gc2VsZi5tYXRjaCh2YWx1ZSk7IH07XG59O1xuXG4vLyBQcmltaXRpdmUgcGF0dGVybnNcblxuTWF0Y2hlci5fICAgICAgPSBmdW5jdGlvbih4KSB7IHJldHVybiB0cnVlOyB9O1xuTWF0Y2hlci5ib29sICAgPSBmdW5jdGlvbih4KSB7IHJldHVybiB0eXBlb2YgeCA9PT0gJ2Jvb2xlYW4nOyB9O1xuTWF0Y2hlci5udW1iZXIgPSBmdW5jdGlvbih4KSB7IHJldHVybiB0eXBlb2YgeCA9PT0gJ251bWJlcic7IH07XG5NYXRjaGVyLnN0cmluZyA9IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHR5cGVvZiB4ID09PSAnc3RyaW5nJzsgfTtcbk1hdGNoZXIuY2hhciAgID0gZnVuY3Rpb24oeCkgeyByZXR1cm4gdHlwZW9mIHggPT09ICdzdHJpbmcnICYmIHgubGVuZ3RoID09PSAwOyB9O1xuXG4vLyBDb21iaW5hdG9yc1xuXG5NYXRjaGVyLmlzICAgICAgID0gZnVuY3Rpb24oZXhwZWN0ZWRWYWx1ZSkgICAgIHsgcmV0dXJuIG5ldyBJcyhleHBlY3RlZFZhbHVlKTsgfTtcbk1hdGNoZXIuaXRlcmFibGUgPSBmdW5jdGlvbigvKiBwMSwgcDIsIC4uLiAqLykgeyByZXR1cm4gbmV3IEl0ZXJhYmxlKEFycmF5UHJvdG8uc2xpY2UuY2FsbChhcmd1bWVudHMpKTsgfTtcbk1hdGNoZXIubWFueSAgICAgPSBmdW5jdGlvbihwYXR0ZXJuKSAgICAgICAgICAgeyByZXR1cm4gbmV3IE1hbnkocGF0dGVybik7IH07XG5NYXRjaGVyLm9wdCAgICAgID0gZnVuY3Rpb24ocGF0dGVybikgICAgICAgICAgIHsgcmV0dXJuIG5ldyBPcHQocGF0dGVybik7IH07XG5NYXRjaGVyLnRyYW5zICAgID0gZnVuY3Rpb24ocGF0dGVybiwgZnVuYykgICAgIHsgcmV0dXJuIG5ldyBUcmFucyhwYXR0ZXJuLCBmdW5jKTsgfTtcbk1hdGNoZXIud2hlbiAgICAgPSBmdW5jdGlvbihwYXR0ZXJuLCBwcmVkKSAgICAgeyByZXR1cm4gbmV3IFdoZW4ocGF0dGVybiwgcHJlZCk7IH07XG5NYXRjaGVyLm9yICAgICAgID0gZnVuY3Rpb24oLyogcDEsIHAyLCAuLi4gKi8pIHsgcmV0dXJuIG5ldyBPcihBcnJheVByb3RvLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7IH07XG5NYXRjaGVyLmFuZCAgICAgID0gZnVuY3Rpb24oLyogcDEsIHAyLCAuLi4gKi8pIHsgcmV0dXJuIG5ldyBBbmQoQXJyYXlQcm90by5zbGljZS5jYWxsKGFyZ3VtZW50cykpOyB9O1xuXG4vLyBPcGVyYXRvcnNcblxuTWF0Y2hlci5pbnN0YW5jZU9mID0gZnVuY3Rpb24oY2xhenopIHsgcmV0dXJuIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggaW5zdGFuY2VvZiBjbGF6ejsgfTsgfTtcblxuTWF0Y2hlci5NYXRjaEZhaWx1cmUgPSBNYXRjaEZhaWx1cmU7XG5cbi8vIFRlcnNlIGludGVyZmFjZVxuLy8gLS0tLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIG1hdGNoKHYgLyogLCBwYXQxLCBmdW4xLCBwYXQyLCBmdW4yLCAuLi4gKi8pIHtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIC8vIEFsbG93IGNhbGxpbmcgdy8gMiBhcmdzLCB3aGVyZSB0aGUgc2Vjb25kIGFyZyBpcyBhbiBBcnJheSBbcDEsIGYxLCAuLi5dLlxuICBpZiAoYXJncy5sZW5ndGggPT09IDIgJiYgQXJyYXkuaXNBcnJheShhcmdzWzFdKSkge1xuICAgIGFyZ3MgPSBbYXJnc1swXV0uY29uY2F0KGFyZ3NbMV0pO1xuICB9XG4gIGlmIChhcmdzLmxlbmd0aCAlIDIgIT09IDEpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ21hdGNoIGNhbGxlZCB3aXRoIGludmFsaWQgYXJndW1lbnRzJyk7XG4gIH1cbiAgdmFyIG0gPSBuZXcgTWF0Y2hlcigpO1xuICBmb3IgKHZhciBpZHggPSAxOyBpZHggPCBhcmdzLmxlbmd0aDsgaWR4ICs9IDIpIHtcbiAgICB2YXIgcGF0dGVybiA9IGFyZ3NbaWR4XTtcbiAgICB2YXIgZnVuYyA9IGFyZ3NbaWR4ICsgMV07XG4gICAgbS5hZGRDYXNlKHBhdHRlcm4sIGZ1bmMpO1xuICB9XG4gIHRyeSB7XG4gICAgcmV0dXJuIG0ubWF0Y2godik7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBpZiAoZSBpbnN0YW5jZW9mIE1hdGNoRmFpbHVyZSkge1xuICAgICAgcmV0dXJuIEZBSUw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG59XG5cbm1hdGNoLkZBSUwgPSBGQUlMO1xuXG4vLyBFeHBvcnRzXG4vLyAtLS0tLS0tXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBNYXRjaGVyOiBNYXRjaGVyLFxuICBtYXRjaDogbWF0Y2gsXG4gIFBhdHRlcm46IFBhdHRlcm5cbn07XG4iLCIvKiBnbG9iYWwgU3ltYm9sICovXG5cbnZhciBJVEVSQVRPUl9TWU1CT0wgPSB0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmIFN5bWJvbC5pdGVyYXRvcjtcbnZhciBGQUtFX0lURVJBVE9SX1NZTUJPTCA9ICdAQGl0ZXJhdG9yJztcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLy8gSGVscGVyc1xuLy8gLS0tLS0tLVxuXG5mdW5jdGlvbiBpc1N0cmluZyhvYmopIHtcblx0cmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgU3RyaW5nXSc7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKG9iaikge1xuXHRyZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBOdW1iZXJdJztcbn1cblxuZnVuY3Rpb24gaXNBcnJheUxpa2Uob2JqKSB7XG5cdHJldHVybiBpc051bWJlcihvYmoubGVuZ3RoKSAmJiAhaXNTdHJpbmcob2JqKTtcbn1cblxuLy8gQXJyYXlJdGVyYXRvclxuLy8gLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBBcnJheUl0ZXJhdG9yKGl0ZXJhdGVlKSB7XG5cdHRoaXMuX2l0ZXJhdGVlID0gaXRlcmF0ZWU7XG5cdHRoaXMuX2kgPSAwO1xuXHR0aGlzLl9sZW4gPSBpdGVyYXRlZS5sZW5ndGg7XG59XG5cbkFycmF5SXRlcmF0b3IucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbigpIHtcblx0aWYgKHRoaXMuX2kgPCB0aGlzLl9sZW4pIHtcblx0XHRyZXR1cm4geyBkb25lOiBmYWxzZSwgdmFsdWU6IHRoaXMuX2l0ZXJhdGVlW3RoaXMuX2krK10gfTtcblx0fVxuXHRyZXR1cm4geyBkb25lOiB0cnVlIH07XG59O1xuXG5BcnJheUl0ZXJhdG9yLnByb3RvdHlwZVtGQUtFX0lURVJBVE9SX1NZTUJPTF0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH07XG5cbmlmIChJVEVSQVRPUl9TWU1CT0wpIHtcblx0QXJyYXlJdGVyYXRvci5wcm90b3R5cGVbSVRFUkFUT1JfU1lNQk9MXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfTtcbn1cblxuLy8gRXhwb3J0c1xuLy8gLS0tLS0tLVxuXG4vLyBSZXR1cm5zIGFuIGl0ZXJhdG9yIChhbiBvYmplY3QgdGhhdCBoYXMgYSBuZXh0KCkgbWV0aG9kKSBmb3IgYG9iamAuXG4vLyBGaXJzdCwgaXQgdHJpZXMgdG8gdXNlIHRoZSBFUzYgaXRlcmF0b3IgcHJvdG9jb2wgKFN5bWJvbC5pdGVyYXRvcikuXG4vLyBJdCBmYWxscyBiYWNrIHRvIHRoZSAnZmFrZScgaXRlcmF0b3IgcHJvdG9jb2wgKCdAQGl0ZXJhdG9yJykgdGhhdCBpc1xuLy8gdXNlZCBieSBzb21lIGxpYnJhcmllcyAoZS5nLiBpbW11dGFibGUtanMpLiBGaW5hbGx5LCBpZiB0aGUgb2JqZWN0IGhhc1xuLy8gYSBudW1lcmljIGBsZW5ndGhgIHByb3BlcnR5IGFuZCBpcyBub3QgYSBzdHJpbmcsIGl0IGlzIHRyZWF0ZWQgYXMgYW4gQXJyYXlcbi8vIHRvIGJlIGl0ZXJhdGVkIHVzaW5nIGFuIEFycmF5SXRlcmF0b3IuXG5mdW5jdGlvbiBnZXRJdGVyYXRvcihvYmopIHtcblx0aWYgKCFvYmopIHtcblx0XHRyZXR1cm47XG5cdH1cblx0aWYgKElURVJBVE9SX1NZTUJPTCAmJiB0eXBlb2Ygb2JqW0lURVJBVE9SX1NZTUJPTF0gPT09ICdmdW5jdGlvbicpIHtcblx0XHRyZXR1cm4gb2JqW0lURVJBVE9SX1NZTUJPTF0oKTtcblx0fVxuXHRpZiAodHlwZW9mIG9ialtGQUtFX0lURVJBVE9SX1NZTUJPTF0gPT09ICdmdW5jdGlvbicpIHtcblx0XHRyZXR1cm4gb2JqW0ZBS0VfSVRFUkFUT1JfU1lNQk9MXSgpO1xuXHR9XG5cdGlmIChpc0FycmF5TGlrZShvYmopKSB7XG5cdFx0cmV0dXJuIG5ldyBBcnJheUl0ZXJhdG9yKG9iaik7XG5cdH1cbn1cblxuZnVuY3Rpb24gaXNJdGVyYWJsZShvYmopIHtcblx0aWYgKG9iaikge1xuXHRcdHJldHVybiAoSVRFUkFUT1JfU1lNQk9MICYmIHR5cGVvZiBvYmpbSVRFUkFUT1JfU1lNQk9MXSA9PT0gJ2Z1bmN0aW9uJykgfHxcblx0XHRcdFx0XHQgdHlwZW9mIG9ialtGQUtFX0lURVJBVE9SX1NZTUJPTF0gPT09ICdmdW5jdGlvbicgfHxcblx0XHRcdFx0XHQgaXNBcnJheUxpa2Uob2JqKTtcblx0fVxuXHRyZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHRvQXJyYXkoaXRlcmFibGUpIHtcblx0dmFyIGl0ZXIgPSBnZXRJdGVyYXRvcihpdGVyYWJsZSk7XG5cdGlmIChpdGVyKSB7XG5cdFx0dmFyIHJlc3VsdCA9IFtdO1xuXHRcdHZhciBuZXh0O1xuXHRcdHdoaWxlICghKG5leHQgPSBpdGVyLm5leHQoKSkuZG9uZSkge1xuXHRcdFx0cmVzdWx0LnB1c2gobmV4dC52YWx1ZSk7XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGdldEl0ZXJhdG9yOiBnZXRJdGVyYXRvcixcblx0aXNJdGVyYWJsZTogaXNJdGVyYWJsZSxcblx0dG9BcnJheTogdG9BcnJheVxufTtcbiJdfQ==

