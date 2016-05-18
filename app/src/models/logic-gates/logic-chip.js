var LogicChipView = React.createFactory(require('../../views/logic-gates/logic-chip')),
    Pin = require('../shared/pin'),
    layout = require('../../views/shared/layout');

var LogicChip = function (options) {
  var i, pin, notConnectable;

  this.name = 'logic-chip';
  this.view = LogicChipView;
  this.board = options.board;
  this.type = options.type;

  this.pins = [];
  this.pinMap = {};
  for (i = 0; i < 14; i++) {
    notConnectable = [6, 13].indexOf(i) !== -1;

    pin = {
      number: i,
      value: 0,
      inputMode: [2, 5, 6, 7, 10, 13].indexOf(i) === -1,
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
LogicChip.prototype.calculatePosition = function (constants, selected, index, count) {
  var selectedConstants = constants.selectedConstants(selected),
      chipWidth, pinDY, i, j, pin, pinNumber, yOffset;

  this.position = layout.calculateComponentRect(constants, selected, index, count);

  chipWidth = this.position.width / 2;

  this.position.chip = {
    x: this.position.x + (chipWidth / 2),
    y: this.position.y,
    width: chipWidth,
    height: this.position.height
  };

  pinDY = (this.position.chip.height - (selectedConstants.PIN_WIDTH * 7)) / 8;

  for (i = 0; i < 2; i++) {
    for (j = 0; j < 7; j++) {
      pinNumber = (i * 7) + j;
      pin = this.pins[pinNumber];
      yOffset = i === 0 ? j : 6 - j;
      pin.x = (this.position.chip.x - selectedConstants.PIN_WIDTH) + (i * (this.position.chip.width + selectedConstants.PIN_WIDTH));
      pin.y = this.position.chip.y + pinDY + (yOffset * (selectedConstants.PIN_HEIGHT + pinDY));
      pin.cx = pin.x + (selectedConstants.PIN_WIDTH / 2);
      pin.cy = pin.y + (selectedConstants.PIN_HEIGHT / 2);
      pin.width = selectedConstants.PIN_WIDTH;
      pin.height = selectedConstants.PIN_HEIGHT;
      pin.labelSize = selectedConstants.PIC_FONT_SIZE;
      pin.label.x = pin.x + ((i ? -0.5 : 1.5) * selectedConstants.PIN_WIDTH);
      pin.label.y = pin.y + ((selectedConstants.PIN_HEIGHT + pin.labelSize) / 2.25);
      pin.label.anchor = i ? 'end' : 'start';
    }
  }

  this.label.x = this.position.chip.x + (chipWidth / 2);
  this.label.y = this.position.chip.y + (this.position.height / 2);
  this.label.labelSize = selectedConstants.CHIP_LABEL_SIZE;
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
  }
};


module.exports = LogicChip;
