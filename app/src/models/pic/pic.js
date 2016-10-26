var PICView = React.createFactory(require('../../views/pic/pic')),
    Pin = require('../shared/pin'),
    TTL = require('../shared/ttl'),
    layout = require('../../views/shared/layout');

var PIC = function (options) {
  var i, pin, notConnectable;

  this.name = 'pic';
  this.view = PICView;
  this.board = options.board;
  this.resolver = options.resolver;

  this.pins = [];
  this.pinMap = {};
  for (i = 0; i < 18; i++) {
    notConnectable = [3, 4, 11, 12, 13].indexOf(i) !== -1;

    pin = {
      number: i,
      voltage: [3, 11, 12, 13].indexOf(i) !== -1 ? TTL.HIGH_VOLTAGE : TTL.LOW_VOLTAGE,
      inputMode: !notConnectable,
      placement: i < 9 ? 'left' : 'right',
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
      text: ['RA2', 'RA3', 'RA4', 'MCL', 'GND', 'RB0', 'RB1', 'RB2', 'RB3', 'RA1', 'RA0', 'XTAL', 'XTAL', 'VCC', 'RB7', 'RB6', 'RB5', 'RB4'][i],
      color: '#fff'
    };
    pin = new Pin(pin);
    this.pins.push(pin);
    this.pinMap[pin.label.text] = pin;
  }

  // in reverse order so we can scan it quickly in the getter/setter
  this.portAPins = [this.pinMap.RA0, this.pinMap.RA1, this.pinMap.RA2, this.pinMap.RA3, this.pinMap.RA4];
  this.portBPins = [this.pinMap.RB0, this.pinMap.RB1, this.pinMap.RB2, this.pinMap.RB3, this.pinMap.RB4, this.pinMap.RB5, this.pinMap.RB6, this.pinMap.RB7];

  this.ip = 0;
  this.code = options.code;
  this.emulator = options.code.js(this);
};
PIC.prototype.reset = function () {
  this.ip = 0;
  this.trisPortA(0xff);
  this.trisPortB(0xff);
  this.emulator.start();
};
PIC.prototype.calculatePosition = function (constants, selected, index, count) {
  var selectedConstants = constants.selectedConstants(selected),
      chipWidth, pinDY, i, j, pin, pinNumber;

  this.position = layout.calculateComponentRect(constants, selected, index, count);

  chipWidth = this.position.width / 2;

  this.position.chip = {
    x: this.position.x + (chipWidth / 2),
    y: this.position.y,
    width: chipWidth,
    height: this.position.height
  };

  pinDY = (this.position.chip.height - (selectedConstants.PIN_WIDTH * 9)) / 10;

  for (i = 0; i < 2; i++) {
    for (j = 0; j < 9; j++) {
      pinNumber = (i * 9) + j;
      pin = this.pins[pinNumber];
      pin.x = (this.position.chip.x - selectedConstants.PIN_WIDTH) + (i * (this.position.chip.width + selectedConstants.PIN_WIDTH));
      pin.y = this.position.chip.y + pinDY + (j * (selectedConstants.PIN_HEIGHT + pinDY));
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
};
PIC.prototype.resolveOutputVoltages = function () {
  // nothing to do here for the pic
};
PIC.prototype.evaluateCurrentPICInstruction = function () {
  var restartLoop = false;
  if (this.ip < this.emulator.loop.length) {
    restartLoop = this.emulator.loop[this.ip]();
  }
  this.ip = restartLoop ? 0 : (this.ip + 1) % this.emulator.loop.length;
  return restartLoop;
};
PIC.prototype.evaluateRemainingPICInstructions = function () {
  var restartLoop = false;
  while (!restartLoop && (this.ip < this.emulator.loop.length)) {
    restartLoop = this.emulator.loop[this.ip]();
    this.ip++;
  }
  this.ip = 0;
};
PIC.prototype.trisPortA = function (mask) {
  this.setPinListInputMode(this.portAPins, mask);
};
PIC.prototype.trisPortB = function (mask) {
  this.setPinListInputMode(this.portBPins, mask);
};
PIC.prototype.getPortA = function () {
  return this.getPinListValue(this.portAPins);
};
PIC.prototype.getPortB = function () {
  return this.getPinListValue(this.portBPins);
};
PIC.prototype.setPortA = function (value) {
  this.setPinListValue(this.portAPins, value);
};
PIC.prototype.setPortB = function (value) {
  this.setPinListValue(this.portBPins, value);
};
PIC.prototype.getPinListValue = function (list) {
  var value = 0,
      i;

  if (this.hasResolver()) {
    this.board.resolver.resolveComponentOutputVoltages();
  }
  for (i = 0; i < list.length; i++) {
    value = value | ((list[i].inputMode && list[i].isHigh() ? 1 : 0) << i);
  }
  return value;
};
PIC.prototype.setPinListValue = function (list, value) {
  var i;
  for (i = 0; i < list.length; i++) {
    if (!list[i].inputMode) {
      list[i].setVoltage(TTL.getBooleanVoltage(value & (1 << i)));
    }
  }
  this.resolve();
};
PIC.prototype.setPinListInputMode = function (list, mask) {
  var i;
  for (i = 0; i < list.length; i++) {
    list[i].inputMode = !!(mask & (1 << i));
  }
  this.resolve();
};
PIC.prototype.hasResolver = function () {
  return this.board && this.board.resolver;
};
PIC.prototype.resolve = function () {
  if (this.hasResolver()) {
    this.board.resolver.resolve();
  }
};
PIC.prototype.setBoard = function (board) {
  var i;
  this.board = board;
  for (i = 0; i < this.pins.length; i++) {
    this.pins[i].board = board;
  }
};

module.exports = PIC;
