'use strict';

require('6to5/polyfill');
require('6to5/register');

module.exports = {
  Vat: require('./lib/vat'),
  match: {
  	ANY: require('./third_party/pattern-match').Matcher._
  }
};
