'use strict';

var Immutable = require('immutable'),
    test = require('tape');

require('babel/register');
var ma = require('..');

var Vat = ma.Vat;
var _ = ma.match.ANY;

// Helpers
// -------

function isNumber(x) {
  return Object.prototype.toString.call(x) === '[object Number]';
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
  t.ok(vat.try_take(tuple), 'result of try_copy can be re-used as a pattern');

  t.end();
});

test('try_take_all', function(t) {
  var vat = new Vat();

  t.deepEqual(vat.try_take_all(_), [], 'try_take_all');
  vat.put(1);
  t.deepEqual(vat.try_take_all(isNumber), [1], 'try_take_all, one match');
  vat.put(2);
  vat.put(3);
  t.deepEqual(vat.try_take_all(isNumber), [2, 3], 'try_take_all, two matches');

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

  vat.put(3);
  t.ok(vat.try_take(isNumber), 'taking a raw value using a predicate');

  vat.put('foo');
  t.notOk(vat.try_take(isNumber), 'non-matching value is not taken');

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
  vat.step();

  vat.put([0], 'should not trigger the callback again');
  vat.step();

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
  vat.step();

  // ...but a matching one should.
  ready = true;
  vat.put(['foo']);
  vat.step();
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

  vat.put([[0], [1]]);
  result = vat.try_take_all([_], true);
  t.equal(result[0][0], result[1][0], 'root object is the same in both');
  t.deepEqual(result[0][1], [0], 'path to first match is [0]');
  t.deepEqual(result[1][1], [1], 'path to second match is [1]');

  t.end();
});

test('deep matching with maps', function(t) {
  var vat = new Vat();
  vat.put({ x: { greeting: 'ahoy' }});

  t.notOk(vat.try_take({ greeting: _ }));
  t.ok(vat.try_take({ greeting: _ }, true));

  t.end();
});

test('comparator', function(t) {
  var vat = new Vat();
  vat.put(1);
  vat.put(2);
  t.equal(vat.try_copy(isNumber), 1, 'sorted sequentially by default');

  function compareValueDesc(a, b) { return b.value - a.value; }

  vat.comparator = compareValueDesc;
  t.equal(vat.try_copy(isNumber), 2, 'comparator for entire vat');

  t.end();
});

/*
test('aborting reactions', function(t) {
  var vat = new Vat();
  t.plan(6);
  vat.addReaction(isNumber, function(tup, x) {
    t.pass('reaction is hit');
    return Vat.ABORT;
  });
  vat.put(2);
  t.ok(vat.try_copy(2));

  vat.addReaction({
    patterns: [isNumber, _],
    callback: function(vals, x, y) {
     t.pass('second reaction is hit');
      return Vat.ABORT;
    }
  });
  vat.put('a');
  t.ok(vat.try_take(2));
  t.ok(vat.try_take('a'));
  t.equal(vat.size(), 0, 'vat is empty now');

  t.end();
});
*/