/* jshint esnext: true */

module.exports = {
  // Return an Array with all the values from `gen`.
  toArray(gen) {
    var result = [];
    for (var x of gen) {
      result.push(x);
    }
    return result;
  },
  // Return the first value from `gen` that passes a truth test.
  find(gen, predicate, thisArg) {
    for (var x of gen) {
      if (predicate.call(thisArg, x))
        return x;
    }
  },
  // Return the first value from `gen`.
  first(gen) {
    return gen.next().value;
  }
};
