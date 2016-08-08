var LogicChipView = React.createFactory(require('../../views/logic-gates/logic-chip')),
    Pin = require('../shared/pin'),
    TTL = require('../shared/ttl');

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
    y: this.layout.y,
    width: 150,
    height: 75
  };

  switch (this.type) {
    case '7404':
      outputPins = [1, 3, 5, 6, 7, 9, 11, 13];
      break;
    case '7411':
      outputPins = [5, 6, 7, 11, 13];
      break;
    default:
      outputPins = [2, 5, 6, 7, 10, 13];
      break;
  }

  this.pins = [];
  this.pinMap = {};
  for (i = 0; i < 14; i++) {
    pin = {
      number: i,
      voltage: i == 13 ? TTL.HIGH_VOLTAGE : TTL.LOW_VOLTAGE,
      inputMode: outputPins.indexOf(i) === -1,
      placement: i < 7 ? 'bottom' : 'top',
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
LogicChip.prototype.calculatePosition = function (constants, selected) {
  var selectedConstants = constants.selectedConstants(selected),
      position = this.position,
      pinDX, pinDY, i, j, pin, pinNumber, xOffset, y;

  pinDX = (position.width - (selectedConstants.PIN_WIDTH * 7)) / 8;

  for (i = 0; i < 2; i++) {
    y = i === 0 ? position.y + position.height : position.y - selectedConstants.PIN_HEIGHT;
    pinDY = i === 0 ? -(selectedConstants.PIN_HEIGHT / 2) : 2 * selectedConstants.PIN_HEIGHT;

    for (j = 0; j < 7; j++) {
      pinNumber = (i * 7) + j;
      pin = this.pins[pinNumber];
      xOffset = i === 0 ? j : 6 - j;

      pin.x = position.x + pinDX + (xOffset * (selectedConstants.PIN_WIDTH + pinDX));
      pin.y = y;

      pin.cx = pin.x + (selectedConstants.PIN_WIDTH / 2);
      pin.cy = pin.y + (selectedConstants.PIN_HEIGHT / 2);
      pin.width = selectedConstants.PIN_WIDTH;
      pin.height = selectedConstants.PIN_HEIGHT;
      pin.labelSize = selectedConstants.PIC_FONT_SIZE;
      pin.label.x = pin.x + (selectedConstants.PIN_WIDTH / 2);
      pin.label.y = pin.y + pinDY;
      pin.label.anchor = 'middle';
    }
  }
};
LogicChip.prototype.mapAndSetPins = function (pinConnections, fn) {
  var logicLevels, i, j, inputPinNumbers, outputPinNumber;

  for (i = 0; i < pinConnections.length; i++) {
    inputPinNumbers = pinConnections[i][0];
    outputPinNumber = pinConnections[i][1];
    logicLevels = [];
    for (j = 0; j < inputPinNumbers.length; j++) {
      logicLevels.push(TTL.getVoltageLogicLevel(this.pins[inputPinNumbers[j] - 1].getVoltage()));
    }
    this.pins[outputPinNumber - 1].setVoltage(TTL.getVoltage(fn.apply(this, logicLevels)));
  }
};
LogicChip.prototype.standardPinConnections = [
  [[1, 2], 3],
  [[4, 5], 6],
  [[10, 9], 8],
  [[13, 12], 11]
];
LogicChip.prototype.resolveOutputVoltages = function () {
  // NOTE: all pin indexes are 1 based below to make it easier to verify against 1-based pinout diagrams
  switch (this.type) {
    // Quad 2-input AND
    case '7408':
      this.mapAndSetPins(this.standardPinConnections, function (a, b) {
        if (TTL.isInvalid(a) || TTL.isInvalid(b)) {
          return TTL.INVALID;
        }
        return TTL.getBooleanLogicLevel(TTL.isHigh(a) && TTL.isHigh(b));
      });
      break;

    // Quad 2-input OR
    case '7432':
      this.mapAndSetPins(this.standardPinConnections, function (a, b) {
        return TTL.getBooleanLogicLevel(TTL.isHigh(a) || TTL.isHigh(b));
      });
      break;

    // Quad 2-Input XOR
    case '7486':
      this.mapAndSetPins(this.standardPinConnections, function (a, b) {
        return TTL.getBooleanLogicLevel((TTL.isHigh(a) || TTL.isHigh(b)) && !(TTL.isHigh(a) && TTL.isHigh(b)));
      });
      break;

    // Hex Inverter
    case '7404':
      this.mapAndSetPins([
        [[1], 2],
        [[3], 4],
        [[5], 6],
        [[9], 8],
        [[11], 10],
        [[13], 12],
      ], function (a) {
        if (TTL.isInvalid(a)) {
          return TTL.INVALID;
        }
        return TTL.getBooleanLogicLevel(!TTL.isHigh(a));
      });
      break;

    // Tri 3-Input AND
    case '7411':
      this.mapAndSetPins([
        [[1, 2, 13], 12],
        [[3, 4, 5], 6],
        [[9, 10, 11], 8]
      ], function (a, b, c) {
        if (TTL.isInvalid(a) || TTL.isInvalid(b) || TTL.isInvalid(c)) {
          return TTL.INVALID;
        }
        return TTL.getBooleanLogicLevel(TTL.isHigh(a) && TTL.isHigh(b) && TTL.isHigh(c));
      });
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