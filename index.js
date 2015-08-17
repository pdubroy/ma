'use strict';

require('babel/polyfill');

var Vat = require('./lib/vat');

module.exports = {
  Vat: Vat,
  match: {
  	ANY: require('./third_party/pattern-match').Matcher._,
    ALL: Vat.all
  }
};
