!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.pm=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var iterable = _dereq_('./lib/iterable');
var isIterable = iterable.isIterable;
var toArray = iterable.toArray;

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

// Pattern
// -------

function Pattern() {}

// Creates a custom Pattern class. If `props` has an 'init' property, it will
// be called to initialize newly-created instances. All other properties in
// `props` will be copied to the prototype of the new constructor.
Pattern.extend = function(props) {
  var proto = ctor.prototype = new Pattern();
  for (var k in props) {
    if (k !== 'init' && k != 'match') {
      proto[k] = props[k];
    }
  }
  ensure(typeof props.match === 'function', "Patterns must have a 'match' method");
  proto._match = props.match;

  function ctor() {
    var self = this;
    if (!(self instanceof ctor)) {
      self = Object.create(proto);
    }
    if ('init' in props) {
      props.init.apply(self, ArrayProto.slice.call(arguments));
    }
    ensure(typeof self.arity === 'number', "Patterns must have an 'arity' property");
    return self;
  }
  ctor.fromArray = function(arr) { return ctor.apply(null, arr); };
  return ctor;
};

// Expose some useful functions as instance methods on Pattern.
Pattern.prototype.performMatch = performMatch;
Pattern.prototype.getArity = getArity;

// Wraps the user-specified `match` function with some extra checks.
Pattern.prototype.match = function(value, bindings) {
  var bs = [];
  var ans = this._match(value, bs);
  if (ans) {
    ensure(bs.length === this.arity,
           'Inconsistent pattern arity: expected ' + this.arity + ', actual ' + bs.length);
    bindings.push.apply(bindings, bs);
  }
  return ans;
};

// Types of pattern
// ----------------

Matcher.is = Pattern.extend({
  init: function(expectedValue) {
    this.expectedValue = expectedValue;
  },
  arity: 0,
  match: function(value, bindings) {
    return _equalityMatch(value, this.expectedValue, bindings);
  }
});

Matcher.iterable = Pattern.extend({
  init: function(/* pattern, ... */) {
    this.patterns = ArrayProto.slice.call(arguments);
    this.arity = this.patterns
      .map(function(pattern) { return getArity(pattern); })
      .reduce(function(a1, a2) { return a1 + a2; }, 0);
  },
  match: function(value, bindings) {
    return isIterable(value) ?
      _arrayMatch(toArray(value), this.patterns, bindings) :
      false;
  }
});

Matcher.many = Pattern.extend({
  init: function(pattern) {
    this.pattern = pattern;
  },
  arity: 1,
  match: function(value, bindings) {
    throw new Error("'many' pattern used outside array pattern");
  }
});

Matcher.opt = Pattern.extend({
  init: function(pattern) {
    this.pattern = pattern;
  },
  arity: 1,
  match: function(value, bindings) {
    throw new Error("'opt' pattern used outside array pattern");
  }
});

Matcher.trans = Pattern.extend({
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
      return true;
    }
    return false;
  }
});

Matcher.when = Pattern.extend({
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

Matcher.or = Pattern.extend({
  init: function(/* p1, p2, ... */) {
    ensure(arguments.length >= 1, "'or' requires at least one pattern");
    this.patterns = ArrayProto.slice.call(arguments);
    this.arity = ensureUniformArity(this.patterns, 'or');
  },
  match: function(value, bindings) {
    var patterns = this.patterns;
    var ans = false;
    for (var idx = 0; idx < patterns.length && !ans; idx++) {
      ans = performMatch(value, patterns[idx], bindings);
    }
    return ans;
  },
});

Matcher.and = Pattern.extend({
  init: function(/* p1, p2, ... */) {
    ensure(arguments.length >= 1, "'and' requires at least one pattern");
    this.patterns = ArrayProto.slice.call(arguments);
    this.arity = this.patterns.reduce(function(sum, p) {
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
  } else if (pattern instanceof RegExp) {
    return 1;
  } else if (typeof pattern === 'object' && pattern !== null) {
    var ans = 0;
    for (var k in pattern) {
      if (pattern.hasOwnProperty(k)) {
        ans += getArity(pattern[k]);
      }
    }
    return ans;
  } else if (typeof pattern === 'function') {
    return 1;
  }
  return 0;
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
  this.patterns.push(Matcher.trans(pattern, optFunc));
  return this;
};

Matcher.prototype.match = function(value) {
  ensure(this.patterns.length > 0, 'Matcher requires at least one case');

  var bindings = [];
  if (Matcher.or.fromArray(this.patterns).match(value, bindings)) {
    return bindings[0];
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

// Operators

Matcher.instanceOf = function(clazz) { return function(x) { return x instanceof clazz; }; };

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

  ensure(
      args.length > 2 && args.length % 2 === 1,
      'match called with invalid arguments');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZHVicm95L2Rldi9jZGcvcGF0dGVybi1tYXRjaC9pbmRleC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L2NkZy9wYXR0ZXJuLW1hdGNoL2xpYi9pdGVyYWJsZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgaXRlcmFibGUgPSByZXF1aXJlKCcuL2xpYi9pdGVyYWJsZScpO1xudmFyIGlzSXRlcmFibGUgPSBpdGVyYWJsZS5pc0l0ZXJhYmxlO1xudmFyIHRvQXJyYXkgPSBpdGVyYWJsZS50b0FycmF5O1xuXG52YXIgQXJyYXlQcm90byA9IEFycmF5LnByb3RvdHlwZTtcblxuLy8gTWF0Y2hGYWlsdXJlXG4vLyAtLS0tLS0tLS0tLS1cblxuZnVuY3Rpb24gTWF0Y2hGYWlsdXJlKHZhbHVlLCBzdGFjaykge1xuICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gIHRoaXMuc3RhY2sgPSBzdGFjaztcbn1cblxuTWF0Y2hGYWlsdXJlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJ21hdGNoIGZhaWx1cmUnO1xufTtcblxuLy8gUGF0dGVyblxuLy8gLS0tLS0tLVxuXG5mdW5jdGlvbiBQYXR0ZXJuKCkge31cblxuLy8gQ3JlYXRlcyBhIGN1c3RvbSBQYXR0ZXJuIGNsYXNzLiBJZiBgcHJvcHNgIGhhcyBhbiAnaW5pdCcgcHJvcGVydHksIGl0IHdpbGxcbi8vIGJlIGNhbGxlZCB0byBpbml0aWFsaXplIG5ld2x5LWNyZWF0ZWQgaW5zdGFuY2VzLiBBbGwgb3RoZXIgcHJvcGVydGllcyBpblxuLy8gYHByb3BzYCB3aWxsIGJlIGNvcGllZCB0byB0aGUgcHJvdG90eXBlIG9mIHRoZSBuZXcgY29uc3RydWN0b3IuXG5QYXR0ZXJuLmV4dGVuZCA9IGZ1bmN0aW9uKHByb3BzKSB7XG4gIHZhciBwcm90byA9IGN0b3IucHJvdG90eXBlID0gbmV3IFBhdHRlcm4oKTtcbiAgZm9yICh2YXIgayBpbiBwcm9wcykge1xuICAgIGlmIChrICE9PSAnaW5pdCcgJiYgayAhPSAnbWF0Y2gnKSB7XG4gICAgICBwcm90b1trXSA9IHByb3BzW2tdO1xuICAgIH1cbiAgfVxuICBlbnN1cmUodHlwZW9mIHByb3BzLm1hdGNoID09PSAnZnVuY3Rpb24nLCBcIlBhdHRlcm5zIG11c3QgaGF2ZSBhICdtYXRjaCcgbWV0aG9kXCIpO1xuICBwcm90by5fbWF0Y2ggPSBwcm9wcy5tYXRjaDtcblxuICBmdW5jdGlvbiBjdG9yKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIShzZWxmIGluc3RhbmNlb2YgY3RvcikpIHtcbiAgICAgIHNlbGYgPSBPYmplY3QuY3JlYXRlKHByb3RvKTtcbiAgICB9XG4gICAgaWYgKCdpbml0JyBpbiBwcm9wcykge1xuICAgICAgcHJvcHMuaW5pdC5hcHBseShzZWxmLCBBcnJheVByb3RvLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XG4gICAgfVxuICAgIGVuc3VyZSh0eXBlb2Ygc2VsZi5hcml0eSA9PT0gJ251bWJlcicsIFwiUGF0dGVybnMgbXVzdCBoYXZlIGFuICdhcml0eScgcHJvcGVydHlcIik7XG4gICAgcmV0dXJuIHNlbGY7XG4gIH1cbiAgY3Rvci5mcm9tQXJyYXkgPSBmdW5jdGlvbihhcnIpIHsgcmV0dXJuIGN0b3IuYXBwbHkobnVsbCwgYXJyKTsgfTtcbiAgcmV0dXJuIGN0b3I7XG59O1xuXG4vLyBFeHBvc2Ugc29tZSB1c2VmdWwgZnVuY3Rpb25zIGFzIGluc3RhbmNlIG1ldGhvZHMgb24gUGF0dGVybi5cblBhdHRlcm4ucHJvdG90eXBlLnBlcmZvcm1NYXRjaCA9IHBlcmZvcm1NYXRjaDtcblBhdHRlcm4ucHJvdG90eXBlLmdldEFyaXR5ID0gZ2V0QXJpdHk7XG5cbi8vIFdyYXBzIHRoZSB1c2VyLXNwZWNpZmllZCBgbWF0Y2hgIGZ1bmN0aW9uIHdpdGggc29tZSBleHRyYSBjaGVja3MuXG5QYXR0ZXJuLnByb3RvdHlwZS5tYXRjaCA9IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICB2YXIgYnMgPSBbXTtcbiAgdmFyIGFucyA9IHRoaXMuX21hdGNoKHZhbHVlLCBicyk7XG4gIGlmIChhbnMpIHtcbiAgICBlbnN1cmUoYnMubGVuZ3RoID09PSB0aGlzLmFyaXR5LFxuICAgICAgICAgICAnSW5jb25zaXN0ZW50IHBhdHRlcm4gYXJpdHk6IGV4cGVjdGVkICcgKyB0aGlzLmFyaXR5ICsgJywgYWN0dWFsICcgKyBicy5sZW5ndGgpO1xuICAgIGJpbmRpbmdzLnB1c2guYXBwbHkoYmluZGluZ3MsIGJzKTtcbiAgfVxuICByZXR1cm4gYW5zO1xufTtcblxuLy8gVHlwZXMgb2YgcGF0dGVyblxuLy8gLS0tLS0tLS0tLS0tLS0tLVxuXG5NYXRjaGVyLmlzID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbihleHBlY3RlZFZhbHVlKSB7XG4gICAgdGhpcy5leHBlY3RlZFZhbHVlID0gZXhwZWN0ZWRWYWx1ZTtcbiAgfSxcbiAgYXJpdHk6IDAsXG4gIG1hdGNoOiBmdW5jdGlvbih2YWx1ZSwgYmluZGluZ3MpIHtcbiAgICByZXR1cm4gX2VxdWFsaXR5TWF0Y2godmFsdWUsIHRoaXMuZXhwZWN0ZWRWYWx1ZSwgYmluZGluZ3MpO1xuICB9XG59KTtcblxuTWF0Y2hlci5pdGVyYWJsZSA9IFBhdHRlcm4uZXh0ZW5kKHtcbiAgaW5pdDogZnVuY3Rpb24oLyogcGF0dGVybiwgLi4uICovKSB7XG4gICAgdGhpcy5wYXR0ZXJucyA9IEFycmF5UHJvdG8uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIHRoaXMuYXJpdHkgPSB0aGlzLnBhdHRlcm5zXG4gICAgICAubWFwKGZ1bmN0aW9uKHBhdHRlcm4pIHsgcmV0dXJuIGdldEFyaXR5KHBhdHRlcm4pOyB9KVxuICAgICAgLnJlZHVjZShmdW5jdGlvbihhMSwgYTIpIHsgcmV0dXJuIGExICsgYTI7IH0sIDApO1xuICB9LFxuICBtYXRjaDogZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gICAgcmV0dXJuIGlzSXRlcmFibGUodmFsdWUpID9cbiAgICAgIF9hcnJheU1hdGNoKHRvQXJyYXkodmFsdWUpLCB0aGlzLnBhdHRlcm5zLCBiaW5kaW5ncykgOlxuICAgICAgZmFsc2U7XG4gIH1cbn0pO1xuXG5NYXRjaGVyLm1hbnkgPSBQYXR0ZXJuLmV4dGVuZCh7XG4gIGluaXQ6IGZ1bmN0aW9uKHBhdHRlcm4pIHtcbiAgICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xuICB9LFxuICBhcml0eTogMSxcbiAgbWF0Y2g6IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICAgIHRocm93IG5ldyBFcnJvcihcIidtYW55JyBwYXR0ZXJuIHVzZWQgb3V0c2lkZSBhcnJheSBwYXR0ZXJuXCIpO1xuICB9XG59KTtcblxuTWF0Y2hlci5vcHQgPSBQYXR0ZXJuLmV4dGVuZCh7XG4gIGluaXQ6IGZ1bmN0aW9uKHBhdHRlcm4pIHtcbiAgICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xuICB9LFxuICBhcml0eTogMSxcbiAgbWF0Y2g6IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICAgIHRocm93IG5ldyBFcnJvcihcIidvcHQnIHBhdHRlcm4gdXNlZCBvdXRzaWRlIGFycmF5IHBhdHRlcm5cIik7XG4gIH1cbn0pO1xuXG5NYXRjaGVyLnRyYW5zID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbihwYXR0ZXJuLCBmdW5jKSB7XG4gICAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbiAgICB0aGlzLmZ1bmMgPSBmdW5jO1xuICAgIGVuc3VyZShcbiAgICAgIHR5cGVvZiBmdW5jID09PSAnZnVuY3Rpb24nICYmIGZ1bmMubGVuZ3RoID09PSBnZXRBcml0eShwYXR0ZXJuKSxcbiAgICAgICdmdW5jIG11c3QgYmUgYSAnICsgZ2V0QXJpdHkocGF0dGVybikgKyAnLWFyZ3VtZW50IGZ1bmN0aW9uJ1xuICAgICk7XG4gIH0sXG4gIGFyaXR5OiAxLFxuICBtYXRjaDogZnVuY3Rpb24odmFsdWUsIGJpbmRpbmdzKSB7XG4gICAgdmFyIGJzID0gW107XG4gICAgaWYgKHBlcmZvcm1NYXRjaCh2YWx1ZSwgdGhpcy5wYXR0ZXJuLCBicykpIHtcbiAgICAgIHZhciBhbnMgPSB0aGlzLmZ1bmMuYXBwbHkodGhpcy50aGlzT2JqLCBicyk7XG4gICAgICBiaW5kaW5ncy5wdXNoKGFucyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59KTtcblxuTWF0Y2hlci53aGVuID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbihwYXR0ZXJuLCBwcmVkaWNhdGUpIHtcbiAgICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xuICAgIHRoaXMucHJlZGljYXRlID0gcHJlZGljYXRlO1xuICAgIHRoaXMuYXJpdHkgPSBnZXRBcml0eShwYXR0ZXJuKTtcbiAgICBlbnN1cmUoXG4gICAgICB0eXBlb2YgcHJlZGljYXRlID09PSAnZnVuY3Rpb24nICYmIHByZWRpY2F0ZS5sZW5ndGggPT09IHRoaXMuYXJpdHksXG4gICAgICAncHJlZGljYXRlIG11c3QgYmUgYSAnICsgdGhpcy5hcml0eSArICctYXJndW1lbnQgZnVuY3Rpb24nXG4gICAgKTtcbiAgfSxcbiAgbWF0Y2g6IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICAgIHZhciBicyA9IFtdO1xuICAgIGlmIChwZXJmb3JtTWF0Y2godmFsdWUsIHRoaXMucGF0dGVybiwgYnMpICYmXG4gICAgICAgIHRoaXMucHJlZGljYXRlLmFwcGx5KHRoaXMudGhpc09iaiwgYnMpKSB7XG4gICAgICBiaW5kaW5ncy5wdXNoLmFwcGx5KGJpbmRpbmdzLCBicyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59KTtcblxuTWF0Y2hlci5vciA9IFBhdHRlcm4uZXh0ZW5kKHtcbiAgaW5pdDogZnVuY3Rpb24oLyogcDEsIHAyLCAuLi4gKi8pIHtcbiAgICBlbnN1cmUoYXJndW1lbnRzLmxlbmd0aCA+PSAxLCBcIidvcicgcmVxdWlyZXMgYXQgbGVhc3Qgb25lIHBhdHRlcm5cIik7XG4gICAgdGhpcy5wYXR0ZXJucyA9IEFycmF5UHJvdG8uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIHRoaXMuYXJpdHkgPSBlbnN1cmVVbmlmb3JtQXJpdHkodGhpcy5wYXR0ZXJucywgJ29yJyk7XG4gIH0sXG4gIG1hdGNoOiBmdW5jdGlvbih2YWx1ZSwgYmluZGluZ3MpIHtcbiAgICB2YXIgcGF0dGVybnMgPSB0aGlzLnBhdHRlcm5zO1xuICAgIHZhciBhbnMgPSBmYWxzZTtcbiAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBwYXR0ZXJucy5sZW5ndGggJiYgIWFuczsgaWR4KyspIHtcbiAgICAgIGFucyA9IHBlcmZvcm1NYXRjaCh2YWx1ZSwgcGF0dGVybnNbaWR4XSwgYmluZGluZ3MpO1xuICAgIH1cbiAgICByZXR1cm4gYW5zO1xuICB9LFxufSk7XG5cbk1hdGNoZXIuYW5kID0gUGF0dGVybi5leHRlbmQoe1xuICBpbml0OiBmdW5jdGlvbigvKiBwMSwgcDIsIC4uLiAqLykge1xuICAgIGVuc3VyZShhcmd1bWVudHMubGVuZ3RoID49IDEsIFwiJ2FuZCcgcmVxdWlyZXMgYXQgbGVhc3Qgb25lIHBhdHRlcm5cIik7XG4gICAgdGhpcy5wYXR0ZXJucyA9IEFycmF5UHJvdG8uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIHRoaXMuYXJpdHkgPSB0aGlzLnBhdHRlcm5zLnJlZHVjZShmdW5jdGlvbihzdW0sIHApIHtcbiAgICAgIHJldHVybiBzdW0gKyBnZXRBcml0eShwKTsgfSxcbiAgICAwKTtcbiAgfSxcbiAgbWF0Y2g6IGZ1bmN0aW9uKHZhbHVlLCBiaW5kaW5ncykge1xuICAgIHZhciBwYXR0ZXJucyA9IHRoaXMucGF0dGVybnM7XG4gICAgdmFyIGFucyA9IHRydWU7XG4gICAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgcGF0dGVybnMubGVuZ3RoICYmIGFuczsgaWR4KyspIHtcbiAgICAgIGFucyA9IHBlcmZvcm1NYXRjaCh2YWx1ZSwgcGF0dGVybnNbaWR4XSwgYmluZGluZ3MpO1xuICAgIH1cbiAgICByZXR1cm4gYW5zO1xuICB9XG59KTtcblxuLy8gSGVscGVyc1xuLy8gLS0tLS0tLVxuXG5mdW5jdGlvbiBfYXJyYXlNYXRjaCh2YWx1ZSwgcGF0dGVybiwgYmluZGluZ3MpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB2YXIgdklkeCA9IDA7XG4gIHZhciBwSWR4ID0gMDtcbiAgd2hpbGUgKHBJZHggPCBwYXR0ZXJuLmxlbmd0aCkge1xuICAgIHZhciBwID0gcGF0dGVybltwSWR4KytdO1xuICAgIGlmIChwIGluc3RhbmNlb2YgTWF0Y2hlci5tYW55KSB7XG4gICAgICBwID0gcC5wYXR0ZXJuO1xuICAgICAgdmFyIHZzID0gW107XG4gICAgICB3aGlsZSAodklkeCA8IHZhbHVlLmxlbmd0aCAmJiBwZXJmb3JtTWF0Y2godmFsdWVbdklkeF0sIHAsIHZzKSkge1xuICAgICAgICB2SWR4Kys7XG4gICAgICB9XG4gICAgICBiaW5kaW5ncy5wdXNoKHZzKTtcbiAgICB9IGVsc2UgaWYgKHAgaW5zdGFuY2VvZiBNYXRjaGVyLm9wdCkge1xuICAgICAgdmFyIGFucyA9IHZJZHggPCB2YWx1ZS5sZW5ndGggPyBwZXJmb3JtTWF0Y2godmFsdWVbdklkeF0sIHAucGF0dGVybiwgW10pIDogZmFsc2U7XG4gICAgICBpZiAoYW5zKSB7XG4gICAgICAgIGJpbmRpbmdzLnB1c2goYW5zKTtcbiAgICAgICAgdklkeCsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYmluZGluZ3MucHVzaCh1bmRlZmluZWQpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocGVyZm9ybU1hdGNoKHZhbHVlW3ZJZHhdLCBwLCBiaW5kaW5ncykpIHtcbiAgICAgIHZJZHgrKztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdklkeCA9PT0gdmFsdWUubGVuZ3RoICYmIHBJZHggPT09IHBhdHRlcm4ubGVuZ3RoO1xufVxuXG5mdW5jdGlvbiBfb2JqTWF0Y2godmFsdWUsIHBhdHRlcm4sIGJpbmRpbmdzKSB7XG4gIGZvciAodmFyIGsgaW4gcGF0dGVybikge1xuICAgIGlmIChwYXR0ZXJuLmhhc093blByb3BlcnR5KGspICYmXG4gICAgICAgICEoayBpbiB2YWx1ZSkgfHxcbiAgICAgICAgIXBlcmZvcm1NYXRjaCh2YWx1ZVtrXSwgcGF0dGVybltrXSwgYmluZGluZ3MpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBfZnVuY3Rpb25NYXRjaCh2YWx1ZSwgZnVuYywgYmluZGluZ3MpIHtcbiAgaWYgKGZ1bmModmFsdWUpKSB7XG4gICAgYmluZGluZ3MucHVzaCh2YWx1ZSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBfZXF1YWxpdHlNYXRjaCh2YWx1ZSwgcGF0dGVybiwgYmluZGluZ3MpIHtcbiAgcmV0dXJuIHZhbHVlID09PSBwYXR0ZXJuO1xufVxuXG5mdW5jdGlvbiBfcmVnRXhwTWF0Y2godmFsdWUsIHBhdHRlcm4sIGJpbmRpbmdzKSB7XG4gIHZhciBhbnMgPSBwYXR0ZXJuLmV4ZWModmFsdWUpO1xuICBpZiAoYW5zICE9PSBudWxsICYmIGFuc1swXSA9PT0gdmFsdWUpIHtcbiAgICBiaW5kaW5ncy5wdXNoKGFucyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBwZXJmb3JtTWF0Y2godmFsdWUsIHBhdHRlcm4sIGJpbmRpbmdzKSB7XG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgUGF0dGVybikge1xuICAgIHJldHVybiBwYXR0ZXJuLm1hdGNoKHZhbHVlLCBiaW5kaW5ncyk7XG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShwYXR0ZXJuKSkge1xuICAgIHJldHVybiBfYXJyYXlNYXRjaCh2YWx1ZSwgcGF0dGVybiwgYmluZGluZ3MpO1xuICB9IGVsc2UgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICByZXR1cm4gX3JlZ0V4cE1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncyk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHBhdHRlcm4gPT09ICdvYmplY3QnICYmIHBhdHRlcm4gIT09IG51bGwpIHtcbiAgICByZXR1cm4gX29iak1hdGNoKHZhbHVlLCBwYXR0ZXJuLCBiaW5kaW5ncyk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHBhdHRlcm4gPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gX2Z1bmN0aW9uTWF0Y2godmFsdWUsIHBhdHRlcm4sIGJpbmRpbmdzKTtcbiAgfVxuICByZXR1cm4gX2VxdWFsaXR5TWF0Y2godmFsdWUsIHBhdHRlcm4sIGJpbmRpbmdzKTtcbn1cblxuZnVuY3Rpb24gZ2V0QXJpdHkocGF0dGVybikge1xuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIFBhdHRlcm4pIHtcbiAgICByZXR1cm4gcGF0dGVybi5hcml0eTtcbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHBhdHRlcm4pKSB7XG4gICAgcmV0dXJuIHBhdHRlcm5cbiAgICAgIC5tYXAoZnVuY3Rpb24ocCkgeyByZXR1cm4gZ2V0QXJpdHkocCk7IH0pXG4gICAgICAucmVkdWNlKGZ1bmN0aW9uKGExLCBhMikgeyByZXR1cm4gYTEgKyBhMjsgfSwgMCk7XG4gIH0gZWxzZSBpZiAocGF0dGVybiBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgIHJldHVybiAxO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBwYXR0ZXJuID09PSAnb2JqZWN0JyAmJiBwYXR0ZXJuICE9PSBudWxsKSB7XG4gICAgdmFyIGFucyA9IDA7XG4gICAgZm9yICh2YXIgayBpbiBwYXR0ZXJuKSB7XG4gICAgICBpZiAocGF0dGVybi5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICBhbnMgKz0gZ2V0QXJpdHkocGF0dGVybltrXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhbnM7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHBhdHRlcm4gPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gMTtcbiAgfVxuICByZXR1cm4gMDtcbn1cblxuZnVuY3Rpb24gZW5zdXJlVW5pZm9ybUFyaXR5KHBhdHRlcm5zLCBvcCkge1xuICB2YXIgcmVzdWx0ID0gZ2V0QXJpdHkocGF0dGVybnNbMF0pO1xuICBmb3IgKHZhciBpZHggPSAxOyBpZHggPCBwYXR0ZXJucy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdmFyIGEgPSBnZXRBcml0eShwYXR0ZXJuc1tpZHhdKTtcbiAgICBpZiAoYSAhPT0gcmVzdWx0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3Iob3AgKyAnOiBleHBlY3RlZCBhcml0eSAnICsgcmVzdWx0ICsgJyBhdCBpbmRleCAnICsgaWR4ICsgJywgZ290ICcgKyBhKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZW5zdXJlKGNvbmQsIG1lc3NhZ2UpIHtcbiAgaWYgKCFjb25kKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICB9XG59XG5cbi8vIE1hdGNoZXJcbi8vIC0tLS0tLS1cblxuZnVuY3Rpb24gTWF0Y2hlcigpIHtcbiAgdGhpcy5wYXR0ZXJucyA9IFtdO1xuICB0aGlzLnRoaXNPYmogPSB1bmRlZmluZWQ7XG59XG5cbk1hdGNoZXIucHJvdG90eXBlLndpdGhUaGlzID0gZnVuY3Rpb24ob2JqKSB7XG4gIHRoaXMudGhpc09iaiA9IG9iajtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5NYXRjaGVyLnByb3RvdHlwZS5hZGRDYXNlID0gZnVuY3Rpb24ocGF0dGVybiwgb3B0RnVuYykge1xuICB0aGlzLnBhdHRlcm5zLnB1c2goTWF0Y2hlci50cmFucyhwYXR0ZXJuLCBvcHRGdW5jKSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuTWF0Y2hlci5wcm90b3R5cGUubWF0Y2ggPSBmdW5jdGlvbih2YWx1ZSkge1xuICBlbnN1cmUodGhpcy5wYXR0ZXJucy5sZW5ndGggPiAwLCAnTWF0Y2hlciByZXF1aXJlcyBhdCBsZWFzdCBvbmUgY2FzZScpO1xuXG4gIHZhciBiaW5kaW5ncyA9IFtdO1xuICBpZiAoTWF0Y2hlci5vci5mcm9tQXJyYXkodGhpcy5wYXR0ZXJucykubWF0Y2godmFsdWUsIGJpbmRpbmdzKSkge1xuICAgIHJldHVybiBiaW5kaW5nc1swXTtcbiAgfVxuICB0aHJvdyBuZXcgTWF0Y2hGYWlsdXJlKHZhbHVlLCBuZXcgRXJyb3IoKS5zdGFjayk7XG59O1xuXG5NYXRjaGVyLnByb3RvdHlwZS50b0Z1bmN0aW9uID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7IHJldHVybiBzZWxmLm1hdGNoKHZhbHVlKTsgfTtcbn07XG5cbi8vIFByaW1pdGl2ZSBwYXR0ZXJuc1xuXG5NYXRjaGVyLl8gICAgICA9IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHRydWU7IH07XG5NYXRjaGVyLmJvb2wgICA9IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHR5cGVvZiB4ID09PSAnYm9vbGVhbic7IH07XG5NYXRjaGVyLm51bWJlciA9IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHR5cGVvZiB4ID09PSAnbnVtYmVyJzsgfTtcbk1hdGNoZXIuc3RyaW5nID0gZnVuY3Rpb24oeCkgeyByZXR1cm4gdHlwZW9mIHggPT09ICdzdHJpbmcnOyB9O1xuTWF0Y2hlci5jaGFyICAgPSBmdW5jdGlvbih4KSB7IHJldHVybiB0eXBlb2YgeCA9PT0gJ3N0cmluZycgJiYgeC5sZW5ndGggPT09IDA7IH07XG5cbi8vIE9wZXJhdG9yc1xuXG5NYXRjaGVyLmluc3RhbmNlT2YgPSBmdW5jdGlvbihjbGF6eikgeyByZXR1cm4gZnVuY3Rpb24oeCkgeyByZXR1cm4geCBpbnN0YW5jZW9mIGNsYXp6OyB9OyB9O1xuXG5NYXRjaGVyLk1hdGNoRmFpbHVyZSA9IE1hdGNoRmFpbHVyZTtcblxuLy8gVGVyc2UgaW50ZXJmYWNlXG4vLyAtLS0tLS0tLS0tLS0tLS1cblxuZnVuY3Rpb24gbWF0Y2godmFsdWUgLyogLCBwYXQxLCBmdW4xLCBwYXQyLCBmdW4yLCAuLi4gKi8pIHtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG5cbiAgLy8gV2hlbiBjYWxsZWQgd2l0aCBqdXN0IGEgdmFsdWUgYW5kIGEgcGF0dGVybiwgcmV0dXJuIHRoZSBiaW5kaW5ncyBpZlxuICAvLyB0aGUgbWF0Y2ggd2FzIHN1Y2Nlc3NmdWwsIG90aGVyd2lzZSBudWxsLlxuICBpZiAoYXJncy5sZW5ndGggPT09IDIpIHtcbiAgICB2YXIgYmluZGluZ3MgPSBbXTtcbiAgICBpZiAocGVyZm9ybU1hdGNoKHZhbHVlLCBhcmd1bWVudHNbMV0sIGJpbmRpbmdzKSkge1xuICAgICAgcmV0dXJuIGJpbmRpbmdzO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGVuc3VyZShcbiAgICAgIGFyZ3MubGVuZ3RoID4gMiAmJiBhcmdzLmxlbmd0aCAlIDIgPT09IDEsXG4gICAgICAnbWF0Y2ggY2FsbGVkIHdpdGggaW52YWxpZCBhcmd1bWVudHMnKTtcbiAgdmFyIG0gPSBuZXcgTWF0Y2hlcigpO1xuICBmb3IgKHZhciBpZHggPSAxOyBpZHggPCBhcmdzLmxlbmd0aDsgaWR4ICs9IDIpIHtcbiAgICB2YXIgcGF0dGVybiA9IGFyZ3NbaWR4XTtcbiAgICB2YXIgZnVuYyA9IGFyZ3NbaWR4ICsgMV07XG4gICAgbS5hZGRDYXNlKHBhdHRlcm4sIGZ1bmMpO1xuICB9XG4gIHJldHVybiBtLm1hdGNoKHZhbHVlKTtcbn1cblxuLy8gRXhwb3J0c1xuLy8gLS0tLS0tLVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgTWF0Y2hlcjogTWF0Y2hlcixcbiAgbWF0Y2g6IG1hdGNoLFxuICBQYXR0ZXJuOiBQYXR0ZXJuXG59O1xuIiwiLyogZ2xvYmFsIFN5bWJvbCAqL1xuXG52YXIgSVRFUkFUT1JfU1lNQk9MID0gdHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiBTeW1ib2wuaXRlcmF0b3I7XG52YXIgRkFLRV9JVEVSQVRPUl9TWU1CT0wgPSAnQEBpdGVyYXRvcic7XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8vIEhlbHBlcnNcbi8vIC0tLS0tLS1cblxuZnVuY3Rpb24gaXNTdHJpbmcob2JqKSB7XG5cdHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IFN0cmluZ10nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihvYmopIHtcblx0cmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgTnVtYmVyXSc7XG59XG5cbmZ1bmN0aW9uIGlzQXJyYXlMaWtlKG9iaikge1xuXHRyZXR1cm4gaXNOdW1iZXIob2JqLmxlbmd0aCkgJiYgIWlzU3RyaW5nKG9iaik7XG59XG5cbi8vIEFycmF5SXRlcmF0b3Jcbi8vIC0tLS0tLS0tLS0tLS1cblxuZnVuY3Rpb24gQXJyYXlJdGVyYXRvcihpdGVyYXRlZSkge1xuXHR0aGlzLl9pdGVyYXRlZSA9IGl0ZXJhdGVlO1xuXHR0aGlzLl9pID0gMDtcblx0dGhpcy5fbGVuID0gaXRlcmF0ZWUubGVuZ3RoO1xufVxuXG5BcnJheUl0ZXJhdG9yLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24oKSB7XG5cdGlmICh0aGlzLl9pIDwgdGhpcy5fbGVuKSB7XG5cdFx0cmV0dXJuIHsgZG9uZTogZmFsc2UsIHZhbHVlOiB0aGlzLl9pdGVyYXRlZVt0aGlzLl9pKytdIH07XG5cdH1cblx0cmV0dXJuIHsgZG9uZTogdHJ1ZSB9O1xufTtcblxuQXJyYXlJdGVyYXRvci5wcm90b3R5cGVbRkFLRV9JVEVSQVRPUl9TWU1CT0xdID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9O1xuXG5pZiAoSVRFUkFUT1JfU1lNQk9MKSB7XG5cdEFycmF5SXRlcmF0b3IucHJvdG90eXBlW0lURVJBVE9SX1NZTUJPTF0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH07XG59XG5cbi8vIEV4cG9ydHNcbi8vIC0tLS0tLS1cblxuLy8gUmV0dXJucyBhbiBpdGVyYXRvciAoYW4gb2JqZWN0IHRoYXQgaGFzIGEgbmV4dCgpIG1ldGhvZCkgZm9yIGBvYmpgLlxuLy8gRmlyc3QsIGl0IHRyaWVzIHRvIHVzZSB0aGUgRVM2IGl0ZXJhdG9yIHByb3RvY29sIChTeW1ib2wuaXRlcmF0b3IpLlxuLy8gSXQgZmFsbHMgYmFjayB0byB0aGUgJ2Zha2UnIGl0ZXJhdG9yIHByb3RvY29sICgnQEBpdGVyYXRvcicpIHRoYXQgaXNcbi8vIHVzZWQgYnkgc29tZSBsaWJyYXJpZXMgKGUuZy4gaW1tdXRhYmxlLWpzKS4gRmluYWxseSwgaWYgdGhlIG9iamVjdCBoYXNcbi8vIGEgbnVtZXJpYyBgbGVuZ3RoYCBwcm9wZXJ0eSBhbmQgaXMgbm90IGEgc3RyaW5nLCBpdCBpcyB0cmVhdGVkIGFzIGFuIEFycmF5XG4vLyB0byBiZSBpdGVyYXRlZCB1c2luZyBhbiBBcnJheUl0ZXJhdG9yLlxuZnVuY3Rpb24gZ2V0SXRlcmF0b3Iob2JqKSB7XG5cdGlmICghb2JqKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGlmIChJVEVSQVRPUl9TWU1CT0wgJiYgdHlwZW9mIG9ialtJVEVSQVRPUl9TWU1CT0xdID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0cmV0dXJuIG9ialtJVEVSQVRPUl9TWU1CT0xdKCk7XG5cdH1cblx0aWYgKHR5cGVvZiBvYmpbRkFLRV9JVEVSQVRPUl9TWU1CT0xdID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0cmV0dXJuIG9ialtGQUtFX0lURVJBVE9SX1NZTUJPTF0oKTtcblx0fVxuXHRpZiAoaXNBcnJheUxpa2Uob2JqKSkge1xuXHRcdHJldHVybiBuZXcgQXJyYXlJdGVyYXRvcihvYmopO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGlzSXRlcmFibGUob2JqKSB7XG5cdGlmIChvYmopIHtcblx0XHRyZXR1cm4gKElURVJBVE9SX1NZTUJPTCAmJiB0eXBlb2Ygb2JqW0lURVJBVE9SX1NZTUJPTF0gPT09ICdmdW5jdGlvbicpIHx8XG5cdFx0XHRcdFx0IHR5cGVvZiBvYmpbRkFLRV9JVEVSQVRPUl9TWU1CT0xdID09PSAnZnVuY3Rpb24nIHx8XG5cdFx0XHRcdFx0IGlzQXJyYXlMaWtlKG9iaik7XG5cdH1cblx0cmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiB0b0FycmF5KGl0ZXJhYmxlKSB7XG5cdHZhciBpdGVyID0gZ2V0SXRlcmF0b3IoaXRlcmFibGUpO1xuXHRpZiAoaXRlcikge1xuXHRcdHZhciByZXN1bHQgPSBbXTtcblx0XHR2YXIgbmV4dDtcblx0XHR3aGlsZSAoIShuZXh0ID0gaXRlci5uZXh0KCkpLmRvbmUpIHtcblx0XHRcdHJlc3VsdC5wdXNoKG5leHQudmFsdWUpO1xuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRnZXRJdGVyYXRvcjogZ2V0SXRlcmF0b3IsXG5cdGlzSXRlcmFibGU6IGlzSXRlcmFibGUsXG5cdHRvQXJyYXk6IHRvQXJyYXlcbn07XG4iXX0=

