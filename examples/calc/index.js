var createElement = require('virtual-dom/create-element'),
    h = require('virtual-dom/h'),
    Immutable = require('Immutable'),
    vdom = require('virtual-dom'),
    underscore = require('underscore');

var ma = require('../../');
var Vat = ma.Vat

var _ = ma.match.ANY;
var $ = document.querySelector.bind(document);
var ArrayProto = Array.prototype;

// Misc helpers
// ------------

function isNumber(x) {
  return Object.prototype.toString.call(x) === '[object Number]';
}

function stringify(obj) {
  var ctor = obj.constructor;
  if (ctor === Immutable.Vector)
    return obj.__toString('[', ']');
  else if (ctor == Immutable.Map)
    return obj.__toString('{', '}');
  return String(obj);
}

// UI Helpers
// ----------

// Adds an event listener for `event` to the document, and if the target
// element matches `selector`, calls `listenerFn`.
function addHandler(selector, event, listenerFn) {
  document.addEventListener(event, function(e) {
    if (e.target.matches(selector))
      listenerFn.call(e.target, e);
  });
}

function render(stateTuple) {
  var vat = stateTuple.get(0);
  var which = stateTuple.get(1);

  var historySize = vat._history.size();
  var nodes = [
    h('span.bracketed', [h('input#tuple-input')]),
    h('input.button', {
      type: 'button',
      value: 'Add to vat'
    }),
    h('#history-indicators', underscore.times(historySize, function(i) {
      var className = '.dot';
      if (i == which)
        className += '.selected';
      return h(className);
    }))
  ];

  // Depending on the value of `which`, either display the current state of
  // the vat, or one of the previous states.
  // TODO: Figure
  var historyStore = vat._history._store;
  var tuples;

  if (which >= 0 && which < historyStore.length)
    tuples = historyStore.get(which);
  else
    tuples = vat.try_copy_all(_);

  tuples.forEach(function(t) {
    nodes.push(h('div.tuple', stringify(t)));
  });
  // Wrap everything in a top-level div.
  return h('div', nodes);
}

function createView(state) {
  var tree = render(state);
  var root = createElement(tree);
  document.body.appendChild(root);
  return {
    update: function(state) {
      var newTree = render(state);
      root = vdom.patch(root, vdom.diff(tree, newTree));
      tree = newTree;      
    }
  };
}

function addTuple(vat) {
  var input = $('#tuple-input');
  var tuple = eval('[' + input.value + ']');
  vat.put(tuple);
  input.value = '';  
}

// Main
// ----

(function main() {
  var vat = new Vat();
  vat.addReaction(['+', isNumber, isNumber], m => m.get(1) + m.get(2));

  addHandler('input.button', 'click', function() {
    addTuple(vat);
  });
  addHandler('#tuple-input', 'keyup', function(e) {
    if (e.keyCode == 13)
      addTuple(vat);
  });

  // Hold the state in a vat, and re-render the UI whenever the state changes.
  // This is pretty clunky, but it's good to get a feel for some of the
  // different ways of using vats.
  var state = new Vat();
  var view;

  function updateView() {
    var tup = state.try_copy(_);
    if (!tup) return;
    if (view)
      view.update(tup);
    else
      view = createView(tup);
    return tup;
  }

  // There's no special support yet for nested vats, so updating `vat` does
  // not trigger anything in `change`. Do something about this!
  state.on('change', updateView);
  state.put([vat, 0]);

  vat.on('change', function() {
    // Select the most recent history entry.
    state.update([_, _], (t) => t.set(1, t.get(0)._history.size()));
  });

  addHandler('.dot', 'click', function() {
    var dots = this.parentNode.childNodes;
    var index = ArrayProto.indexOf.call(dots, this);
    state.update([_, _], (t) => t.set(1, index));
  });

  // Go back and forth between history states when the arrow keys are pressed.
  addHandler('body', 'keyup', function(e) {
    if (e.keyCode == 37 || e.keyCode == 39) {
      var diff = e.keyCode == 37 ? -1 : 1;
      state.update([_, _], (t) => t.set(1, t.get(1) + diff));
    }
  });
  $('#tuple-input').focus();
})();
