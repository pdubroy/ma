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

    if (!(a instanceof Immutable.Sequence))
      a = Immutable.fromJS(a);

    return isEqual(a, a.merge(b));
  };
}

module.exports = {
  ANY: ANY,
  partial: partial
};
