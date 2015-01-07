/* jshint esnext: true */

// Return an Array with all the values from `gen`.
function toArray(gen) {
  var result = [];
  for (var x of gen) {
    result.push(x);
  }
  return result;
}

module.exports = {
  toArray,
  // Return the first value from `gen` that passes a truth test.
  find(gen, predicate, thisArg) {
    for (var x of gen) {
      if (predicate.call(thisArg, x))
        return x;
    }
  },
  filter(gen, predicate, thisArg) {
    return toArray(gen).filter(predicate, thisArg);
  },
  // Return the first value from `gen`.
  first(gen) {
    return gen.next().value;
  }
};
