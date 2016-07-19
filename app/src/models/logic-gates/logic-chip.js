var LogicChipView = React.createFactory(require('../../views/logic-gates/logic-chip')),
    Pin = require('../shared/pin');

var LogicChip = function (options) {
  var i, pin, outputPins;

  this.name = 'logic-chip';
  this.view = LogicChipView;
  this.board = options.board;
  this.type = options.type;
  this.layout = options.layout;
  this.selectable = options.selectable;

  this.position = {
    x: this.layout.x,
    y: this.layout.y
  };

  this.pins = [];
  this.pinMap = {};
  for (i = 0; i < 14; i++) {
    if (this.type == '7404') {
      outputPins = [1, 3, 5, 6, 7, 9, 11, 13];
    }
    else {
      outputPins = [2, 5, 6, 7, 10, 13];
    }

    pin = {
      number: i,
      value: i == 13 ? 1 : 0,
      inputMode: outputPins.indexOf(i) === -1,
      placement: i < 7 ? 'left' : 'right',
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      labelSize: 0,
      component: this,
      notConnectable: false,
      isGround: i == 6,
      isVcc: i == 13
    };
    pin.label = {
      x: 0,
      y: 0,
      anchor: 'end',
      text: String(i + 1),
      color: '#fff'
    };
    pin = new Pin(pin);
    this.pins.push(pin);
    this.pinMap[pin.label.text] = pin;
  }

  this.label = {
    x: 0,
    y: 0,
    labelSize: 0,
    anchor: 'middle',
    text: this.type
  };
};
LogicChip.prototype.reset = function () {
  var i;
  for (i = 0; i < this.pins.length; i++) {
    this.pins[i].reset();
  }
};
LogicChip.prototype.mapAndSetPins = function (fn, pinConnections) {
  var inputValues, i, j, inputPinNumbers, outputPinNumber;

  for (i = 0; i < pinConnections.length; i++) {
    inputPinNumbers = pinConnections[i][0];
    outputPinNumber = pinConnections[i][1];
    inputValues = [];
    for (j = 0; j < inputPinNumbers.length; j++) {
      inputValues.push(this.pins[inputPinNumbers[j] - 1].getValue());
    }
    this.pins[outputPinNumber - 1].setValue(fn.apply(this, inputValues) ? 1 : 0);
  }
};
LogicChip.prototype.standardPinConnections = [
  [[1, 2], 3],
  [[4, 5], 6],
  [[10, 9], 8],
  [[13, 12], 11]
];
LogicChip.prototype.resolveOutputValues = function () {
  // NOTE: all pin indexes are 1 based below to make it easier to verify against 1-based pinout diagrams
  switch (this.type) {
    // Quad 2-input AND
    case '7408':
      this.mapAndSetPins(function (a, b) { return a && b; }, this.standardPinConnections);
      break;

    // Quad 2-input OR
    case '7432':
      this.mapAndSetPins(function (a, b) { return a || b; }, this.standardPinConnections);
      break;

    // Quad 2-Input XOR
    case '7486':
      this.mapAndSetPins(function (a, b) { return (a || b) && !(a && b); }, this.standardPinConnections);
      break;

    // Hex Inverter
    case '7404':
      this.mapAndSetPins(function (a) { return !a; }, [
        [[1], 2],
        [[3], 4],
        [[5], 6],
        [[9], 8],
        [[11], 10],
        [[13], 12],
      ]);
      break;

    // Tri 3-Input AND
    case '7411':
      this.mapAndSetPins(function (a, b, c) { return a && b && c; }, [
        [[1, 2, 13], 12],
        [[3, 4, 5], 6],
        [[9, 10, 11], 8]
      ]);
      break;
  }
};
LogicChip.prototype.serialize = function () {
  return {
    type: 'logic-chip',
    chipType: this.type,
    x: this.position.x,
    y: this.position.y
  };
};


module.exports = LogicChip;
