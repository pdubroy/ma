'use strict';

var Immutable = require('Immutable');
var isEqual = require('./isEqual');

function ANY() { return true; }
ANY.toString = function() { return '(ANY)'; };

function partial(b) {
  if (!(b instanceof Immutable.Sequence))
    b = Immutable.fromJS(b);

  // Returns true if every key in `b` has the same value as in `a`, otherwise
  // false. Any keys in `a` that are not in `b` are irrelevant.
  return function matchSubset(a) {
    if (!(a instanceof Immutable.Sequence))
      a = Immutable.fromJS(a);

    return isEqual(a, a.merge(b));
  };
}

module.exports = {
  ANY: ANY,
  partial: partial
};
