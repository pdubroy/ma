'use strict';

var Immutable = require('immutable'),
    test = require('tape');

var ma = require('..');

var Vat = ma.Vat;
var _ = ma.match.ANY;

// Helpers
// -------

function isNumber(x) {
  return Object.prototype.toString.call(x) === '[object Number]';
}

function identity(x) {
  return x;
}

// Tests
// -----

test('basic put, try_copy, and try_take with tuples', function(t) {
  var vat = new Vat();
  var tuple = [1, [], 2];
  var t2 = [1, []];
  vat.put(tuple);
  t.notOk(vat.try_take(t2), 'fails with non-matching tuple');

  tuple.pop();
  t.notOk(vat.try_take(tuple), 'tuples are not stored by reference');

  t2.push(2);
  t.equal(vat.size(), 1);
  t.ok(vat.try_take(t2), 'succeeds with matching tuple');
  t.equal(vat.size(), 0);
  t.notOk(vat.try_take(t2), 'tuple was removed from the vat');

  vat.put(tuple);
  t.ok(t2 = vat.try_copy(tuple));
  t.ok(vat.try_take(tuple), 'result try_copy can be re-used as a pattern');

  t.end();
});

test('tuple patterns', function(t) {
  var vat = new Vat();
  var tuple = [1, [], 2];
  vat.put(tuple);
  t.notOk(vat.try_copy([_, _]), 'fails when cardinality is wrong');
  t.ok(vat.try_copy([_, _, _]), 'succeeds with correct cardinality');

  t.notOk(vat.try_copy([_, _, 3]), 'fails when only last value is wrong');
  t.notOk(vat.try_copy([1, [_], 3]), 'fails when cardinality of nested objects is wrong');

  t.ok(vat.try_copy([_, [], 2]));

  t.end();
});

test('basic put, try_copy, and try_take with maps', function(t) {
  var vat = new Vat();
  vat.put({});
  t.ok(vat.try_take({}));

  vat.put({ foo: 3 });
  t.ok(vat.try_copy({}));
  t.ok(vat.try_copy({ foo: 3 }));
  t.notOk(vat.try_copy({ foo: 2 }));
  t.ok(vat.try_copy({ foo: _ }));

  vat.put({ a: 1, b: 2 });
  t.ok(vat.try_copy({ a: 1 }));
  t.ok(vat.try_copy({ a: 1, b: 2 }));

  t.end();
});

test('basic put, try_copy, and with records', function(t) {
  var vat = new Vat();

  var T = Immutable.Record({ x: 0 });
  var r1 = new T({ x: 1 });

  vat.put(r1);
  t.ok(vat.try_copy(new T({ x: 1 })));

  t.end();
});

test('partial matching of records', function(t) {
  var vat = new Vat();

  var T = Immutable.Record({ x: 0, y: 1 });
  var r1 = new T({ x: 1 });

  vat.put(r1);
  t.ok(vat.try_copy(r1));
  t.ok(vat.try_copy(new T({ x: 1 })));
  t.notOk(vat.try_copy(new T()));
  t.notOk(vat.try_copy(new T({ x: 2 })));
  t.notOk(vat.try_copy(Immutable.Record({ x: 0 })({ x: 1 })));
  t.notOk(vat.try_copy({ x: 1 }));

  t.end();
});

test('predicates', function(t) {
  var vat = new Vat();
  vat.put(['a']);
  t.notOk(vat.try_copy([isNumber]));
  t.ok(vat.try_copy([_]));
  vat.put([1]);
  t.ok(vat.try_copy([isNumber]));

  vat.put([['a'], [1]]);
  t.ok(vat.try_copy([_, [isNumber]]));

  t.end();
});

test('blocking take/copy', function(t) {
  t.plan(6);
  var vat = new Vat();
  vat.copy([_], function(tuple) {
    t.equal(tuple.get(0), 'z');
    t.ok(vat.try_copy([_]));
  });
  vat.put(['z']);
  vat.put([0], 'should not trigger the callback again');
  vat.take([_], function() {
    t.ok(vat.try_take([_]));
    t.notOk(vat.try_take[_]);
  });

  var ready = false;
  vat.take([_], function(tuple) {
    t.ok(ready, 'callback comes when expected');
    t.equal(tuple.get(0), 'foo');
  });
  // A non-matching tuple shouldn't trigger the callback.
  vat.put([0, 1]);

  // ...but a matching one should.
  ready = true;
  vat.put(['foo']);
});

test('deep matching', function(t) {
  var vat = new Vat();
  vat.put([[0]]);
  t.ok(vat.try_take([0], true));
  t.notOk(vat.try_take([_]));

  var tup = [[], [0, 1, 2]];
  vat.put(tup);
  result = vat.try_take([_, _, _]);
  t.notOk(result, 'try_take uses shallow matching by default');

  var result = vat.try_take([_, _, _], true);
  t.ok(result);
  t.ok(Immutable.is(result[0], Immutable.fromJS(tup)));
  var path = result[1];
  t.deepEqual(path, [1]);

  t.end();
});

test('deep matching with maps', function(t) {
  var vat = new Vat();
  vat.put({ x: { greeting: 'ahoy' }});

  t.notOk(vat.try_take({ greeting: _ }));
  t.ok(vat.try_take({ greeting: _ }, true));

  t.end();
});


test('reactions', function(t) {
  var vat = new Vat();

  vat.addReaction([_, '+', _, _], function(val, id, left, right) {
    var result = left + right;
    vat.addReaction([_, _, id, _], function(val, a, b, c) {
      return [a, b, result, c];
    });
    vat.addReaction([_, _, _, id], function(val, a, b, c) {
      return [a, b, c, result];
    });
    return null;
  });

  var id = '@@foo';
  vat.put([0, 0, id, 0]);
  vat.put([id, '+', 13, 3]);
  t.ok(vat.try_copy([0, 0, 16, 0]));

  vat.put([0, 0, 0, id]);
  t.ok(vat.try_copy([0, 0, 0, 16]));

  // Test that Immutable.List instances work as return values, not only Arrays.
  vat.addReaction(['test'], function(t) {
    return t.push('yes');
  });
  vat.put(['test']);
  t.ok(vat.try_take(['test', 'yes']));

  t.end();
});

test('deep reactions', function(t) {
  var vat = new Vat();

  vat.addReaction(['+', isNumber, isNumber], function(val, left, right) {
    return left + right;
  });

  vat.addReaction(['*', isNumber, isNumber], function(val, left, right) {
    return left * right;
  });

  vat.put(['+', 13, ['*', ['+', 3, 7], ['*', 1, 2]]]);
  t.ok(vat.try_take(33));
  t.notOk(vat.try_copy(isNumber));

  t.end();
});

test('reaction bindings', function(t) {
  var vat = new Vat();

  vat.addReaction(['hello', _], function(val, arg1) {
    t.equal(val.get(0), 'hello');
    return arg1;
  });
  vat.put(['hello', 'world']);
  t.ok(vat.try_take('world'));
  vat.put(['hello', 'goodbye']);
  t.ok(vat.try_take('goodbye'));

  vat.addReaction(['add', [_], _], function(val, arg1, arg2) {
    return arg1 + arg2;
  });
  vat.put(['add', [3], 7]);
  t.equal(vat.try_take(10), 10);

  t.end();
});

// Ensure that an identity reaction won't just continuously trigger itself.
// Disabled until I figure out the right solution for this.
if (false) {
  test('fairness', function(t) {
    var vat = new Vat();
    vat.addReaction([_, _], identity);
    vat.addReaction([isNumber, isNumber], function(match) {
      return [match.get(0) * match.get(1)];
    });

    vat.put([3, 7]);
    var match = vat.try_take([_]);
    t.ok(match);
    t.equal(match.get(0), 21);
    t.end();
  });
}
