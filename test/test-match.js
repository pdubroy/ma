'use strict';

var Immutable = require('immutable'),
    test = require('tape');

var isEqual = require('../lib/isEqual'),
    match = require('..').match;

var partial = match.partial;

// Tests
// -----

test('ANY', function(t) {
  t.ok(isEqual({}, match.ANY));
  t.ok(isEqual({ a: 'foo' }, match.ANY));
  t.ok(isEqual(3, match.ANY));
  t.ok(isEqual(null, match.ANY));

  t.end();
});

test('partial', function(t) {
  var o = { a: 2, b: 3 };
  t.ok(isEqual(o, partial({})));
  t.ok(isEqual(o, partial({ a: 2})));
  t.notOk(isEqual(o, partial({ a: 2, b: 3, c: 0 })));
  t.notOk(isEqual(o, partial({ a: 2, b: 1 })));

  t.notOk(isEqual({ a: { b: 2 } }, partial({ a: {} })), 'partial does not apply recursively');
  t.ok(isEqual({ a: { b: 2, c: 1 }}, { a: partial({ b: 2 })}), 'nested partial works');

  t.end();
});

test('records', function(t) {
  var T = Immutable.Record({ x: 0, y: 0 });
  var r1 = new T({ x: 1, y: 1 });

  t.ok(isEqual(r1, r1));
  t.ok(isEqual(r1, new T({ x: 1, y: 1 })));

  t.ok(isEqual(r1, partial(T, { x: 1 })));
  t.notOk(isEqual(r1, partial(T, { x: 1, y: 0 })));
  t.notOk(isEqual(r1, partial(T, { x: match.ANY })));

  t.end();
});
