var LogicChipView = React.createFactory(require('../../views/logic-gates/logic-chip')),
    Pin = require('../shared/pin'),
    TTL = require('../shared/ttl');

var LogicChip = function (options) {
  var i, pin, outputPins, inputMode;

  this.name = 'logic-chip';
  this.view = LogicChipView;
  this.board = options.board;
  this.type = options.type;
  this.layout = options.layout;
  this.selectable = options.selectable;

  this.position = {
    x: this.layout.x,
    y: this.layout.y,
    width: 120,
    height: 50
  };

  switch (this.type) {
    case '7402':
      outputPins = [0, 3, 9, 12, 13];
      break;
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
    inputMode = outputPins.indexOf(i) === -1;
    pin = {
      number: i,
      voltage: 1.5,
      inputMode: inputMode,
      placement: i < 7 ? 'bottom' : 'top',
      column: i < 7 ? i : 13 - i,
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

  this.pinWires = [];    // ghost wires to bb holes
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
    pinDY = i === 0 ? -(selectedConstants.PIN_HEIGHT / 2) : 2.4 * selectedConstants.PIN_HEIGHT;

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
LogicChip.prototype.getTopLeftPinOffset = function(constants, selected) {
  var selectedConstants = constants.selectedConstants(selected),
      position = this.position,
      pinDX = (position.width - (selectedConstants.PIN_WIDTH * 7)) / 8;
  return {
    x: pinDX,
    y: 0 - selectedConstants.PIN_HEIGHT
  };

};
LogicChip.prototype.isEnergized = function() {
  return this.pins[13].getVoltage() > TTL.INVALID_VOLTAGE &&
    this.pins[6].getVoltage() < TTL.INVALID_VOLTAGE;
};
LogicChip.prototype.mapAndSetPins = function (pinConnections, inputVoltages, fn) {
  var inputLogicLevels = {},
      isEnergized = this.isEnergized(),
      pin, pinVoltage, logicLevels, i, j, inputPinNumbers, outputPinNumber;

  for (i = 0; i < pinConnections.length; i++) {
    inputPinNumbers = pinConnections[i][0];
    for (j = 0; j < inputPinNumbers.length; j++) {
      pin = this.pins[inputPinNumbers[j] - 1];
      pinVoltage = pin.getVoltage();
      inputLogicLevels[inputPinNumbers[j]] = TTL.getVoltageLogicLevel(pinVoltage);
    }
  }

  for (i = 0; i < pinConnections.length; i++) {
    inputPinNumbers = pinConnections[i][0];
    outputPinNumber = pinConnections[i][1];
    logicLevels = [];
    for (j = 0; j < inputPinNumbers.length; j++) {
      logicLevels.push(inputLogicLevels[inputPinNumbers[j]]);
    }
    pinVoltage = isEnergized ? TTL.getVoltage(fn.apply(this, logicLevels)) : TTL.INVALID_VOLTAGE;
    this.pins[outputPinNumber - 1].setVoltage(pinVoltage);
  }
};
LogicChip.prototype.standardPinConnections = [
  [[1, 2], 3],
  [[4, 5], 6],
  [[10, 9], 8],
  [[13, 12], 11]
];
LogicChip.prototype.resolveOutputVoltages = function (inputVoltages) {  // TODO: use input voltages
  // NOTE: all pin indexes are 1 based below to make it easier to verify against 1-based pinout diagrams
  switch (this.type) {
    // Quad 2-Input NAND
    case '7400':
      this.mapAndSetPins(this.standardPinConnections, inputVoltages, function (a, b) {
        if (TTL.isInvalid(a) || TTL.isInvalid(b)) {
          return TTL.INVALID;
        }
        return TTL.getBooleanLogicLevel(!(TTL.isHigh(a) && TTL.isHigh(b)));
      });
      break;

    // Quad 2-Input NOR
    case '7402':
      this.mapAndSetPins([
        [[2, 3], 1],
        [[5, 6], 4],
        [[9, 8], 10],
        [[12, 11], 13]
      ], inputVoltages, function (a, b) {
        return TTL.getBooleanLogicLevel(!(TTL.isHigh(a) || TTL.isHigh(b)));
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
      ], inputVoltages, function (a) {
        if (TTL.isInvalid(a)) {
          return TTL.INVALID;
        }
        return TTL.getBooleanLogicLevel(!TTL.isHigh(a));
      });
      break;

    // Quad 2-input AND
    case '7408':
      this.mapAndSetPins(this.standardPinConnections, inputVoltages, function (a, b) {
        if (TTL.isInvalid(a) || TTL.isInvalid(b)) {
          return TTL.INVALID;
        }
        return TTL.getBooleanLogicLevel(TTL.isHigh(a) && TTL.isHigh(b));
      });
      break;

    // Tri 3-Input AND
    case '7411':
      this.mapAndSetPins([
        [[1, 2, 13], 12],
        [[3, 4, 5], 6],
        [[9, 10, 11], 8]
      ], inputVoltages, function (a, b, c) {
        if (TTL.isInvalid(a) || TTL.isInvalid(b) || TTL.isInvalid(c)) {
          return TTL.INVALID;
        }
        return TTL.getBooleanLogicLevel(TTL.isHigh(a) && TTL.isHigh(b) && TTL.isHigh(c));
      });
      break;

    // Quad 2-input OR
    case '7432':
      this.mapAndSetPins(this.standardPinConnections, inputVoltages, function (a, b) {
        return TTL.getBooleanLogicLevel(TTL.isHigh(a) || TTL.isHigh(b));
      });
      break;

    // Quad 2-Input XOR
    case '7486':
      this.mapAndSetPins(this.standardPinConnections, inputVoltages, function (a, b) {
        return TTL.getBooleanLogicLevel((TTL.isHigh(a) || TTL.isHigh(b)) && !(TTL.isHigh(a) && TTL.isHigh(b)));
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
LogicChip.prototype.setBoard = function (board) {
  var i;
  this.board = board;
  for (i = 0; i < this.pins.length; i++) {
    this.pins[i].board = board;
  }
};


module.exports = LogicChip;
