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
  t.ok(isEqual({ a: 2, b: 3 }, partial({})));
  t.ok(isEqual({ a: 2, b: 3 }, partial({ a: 2})));
  t.notOk(isEqual({ a: 1 }, partial({ a: 1, b: 2 })));
  t.notOk(isEqual({ a: 1 }, partial({ a: 2 })));
  t.notOk(isEqual({ a: { b: 2 } }, partial({ a: {} })), 'partial does not apply recursively');

  t.end();
});
