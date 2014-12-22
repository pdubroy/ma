'use strict';

require("6to5/register");
require("6to5/polyfill");

module.exports = {
  Vat: require('./lib/vat'),
  match: {
  	ANY: require('./third_party/pattern-match').Matcher._
  }
};
