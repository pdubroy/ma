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

  // Handle vectors from immutable-js.
  var areVectors =
      a.constructor === Immutable.Vector && a.constructor === b.constructor;

  if (!areVectors) {
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
  if (!areArrays && !areVectors) {
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
  if (areArrays || areVectors) {
    // Compare array lengths to determine if a deep comparison is necessary.
    size = a.length;
    result = size === b.length;
    if (result) {
      // Deep compare the contents, ignoring non-numeric properties.
      if (areVectors) {
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
