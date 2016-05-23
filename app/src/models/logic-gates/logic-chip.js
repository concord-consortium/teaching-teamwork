var LogicChipView = React.createFactory(require('../../views/logic-gates/logic-chip')),
    Pin = require('../shared/pin');

var LogicChip = function (options) {
  var i, pin, notConnectable, outputPins;

  this.name = 'logic-chip';
  this.view = LogicChipView;
  this.board = options.board;
  this.type = options.type;

  this.layout = options.layout;

  this.pins = [];
  this.pinMap = {};
  for (i = 0; i < 14; i++) {
    notConnectable = [6, 13].indexOf(i) !== -1;

    if (this.type == '7404') {
      outputPins = [1, 3, 5, 6, 7, 9, 11, 13];
    }
    else {
      outputPins = [2, 5, 6, 7, 10, 13];
    }

    pin = {
      number: i,
      value: 0,
      inputMode: outputPins.indexOf(i) === -1,
      placement: i < 7 ? 'left' : 'right',
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      labelSize: 0,
      component: this,
      notConnectable: notConnectable
    };
    pin.label = {
      x: 0,
      y: 0,
      anchor: 'end',
      text: String(i + 1)
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

LogicChip.prototype.resolveOutputValues = function () {
  switch (this.type) {
    case '7408':
      this.pins[2].setValue(this.pins[0].value && this.pins[1].value ? 1 : 0);
      this.pins[5].setValue(this.pins[3].value && this.pins[4].value ? 1 : 0);
      this.pins[10].setValue(this.pins[12].value && this.pins[11].value ? 1 : 0);
      this.pins[7].setValue(this.pins[9].value && this.pins[8].value ? 1 : 0);
      break;

    case '7432':
      this.pins[2].setValue(this.pins[0].value || this.pins[1].value ? 1 : 0);
      this.pins[5].setValue(this.pins[3].value || this.pins[4].value ? 1 : 0);
      this.pins[10].setValue(this.pins[12].value || this.pins[11].value ? 1 : 0);
      this.pins[7].setValue(this.pins[9].value || this.pins[8].value ? 1 : 0);
      break;

    case '7404':
      this.pins[1].setValue(this.pins[0].value  ? 0 : 1);
      this.pins[3].setValue(this.pins[2].value  ? 0 : 1);
      this.pins[5].setValue(this.pins[4].value  ? 0 : 1);
      this.pins[7].setValue(this.pins[6].value  ? 0 : 1);
      this.pins[9].setValue(this.pins[8].value  ? 0 : 1);
      this.pins[11].setValue(this.pins[10].value  ? 0 : 1);
      break;
  }
};


module.exports = LogicChip;
