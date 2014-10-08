'use strict';

var Immutable = require('immutable'),
    test = require('tape');

var Vat = require('../lib/vat');
var _ = Vat.ANY;

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
  t.ok(vat.try_take(t2), 'succeeds with matching tuple');
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
  t.notOk(vat.try_copy({}));
  t.ok(vat.try_copy({ foo: 3 }));
  t.notOk(vat.try_copy({ foo: 2 }));
  t.ok(vat.try_copy({ foo: _ }));

  vat.put({ a: 1, b: 2 });
  t.notOk(vat.try_copy({ a: 1 }));
  t.ok(vat.try_copy({ a: 1, b: 2 }));

  // For now, a pattern must specify *all* the keys in order to match.
  t.notOk(vat.try_copy({ a: 1 }));

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
  t.deepEqual(result[0], Immutable.fromJS(tup));
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

  vat.addReaction([_, '+', _, _], function(match) {
    var id = match.get(0);
    var result = match.get(2) + match.get(3);
    vat.addReaction([_, _, id, _], function(m) {
      return [m.get(0), m.get(1), result, m.get(3)];
    });
    vat.addReaction([_, _, _, id], function(m) {
      return [m.get(0), m.get(1), m.get(2), result];
    });
  });

  var id = '@@foo';
  vat.put([0, 0, id, 0]);
  vat.put([id, '+', 13, 3]);
  t.ok(vat.try_copy([0, 0, 16, 0]));

  vat.put([0, 0, 0, id]);
  t.ok(vat.try_copy([0, 0, 0, 16]));

  // Test that Immutable.Vectors work as return values, not only Arrays.
  vat.addReaction(['test'], function(t) {
    return t.push('yes');
  });
  vat.put(['test']);
  t.ok(vat.try_take(['test', 'yes']));

  t.end();
});

test('deep reactions', function(t) {
  var vat = new Vat();

  vat.addReaction(['+', isNumber, isNumber], function(match) {
    return match.get(1) + match.get(2);
  });

  vat.addReaction(['*', isNumber, isNumber], function(match) {
    return match.get(1) * match.get(2);
  });

  vat.put(['+', 13, ['*', ['+', 3, 7], ['*', 1, 2]]]);
  t.ok(vat.try_take(33));
  t.notOk(vat.try_copy(_));

  t.end();
});

// Ensure that an identity reaction won't just continuously trigger itself.
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
