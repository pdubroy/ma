'use strict';

require('babel/polyfill');

module.exports = {
  Vat: require('./lib/vat'),
  match: {
  	ANY: require('./third_party/pattern-match').Matcher._
  }
};
