var TTL = require('./ttl');

var Pin = function (options) {
  this.board = options.component.board;
  this.isPin = true; // to allow for easy checks against holes in circuits
  this.inputMode = options.inputMode;
  this.placement = options.placement;
  this.number = options.number;
  this.x = options.x;
  this.y = options.y;
  this.cx = options.x + (options.width / 2);
  this.cy = options.y + (options.height / 2);
  this.height = options.height;
  this.width = options.width;
  this.labelSize = options.labelSize;
  this.label = options.label;
  this.component = options.component;
  this.bezierReflection = options.bezierReflection || 1;
  this.notConnectable = options.notConnectable || false;
  this.connected = options.connected || options.isGround || options.isVcc || false;
  this.voltage = options.voltage || 0;
  this.startingVoltage = this.voltage;
};
Pin.prototype.getBezierReflection = function () {
  return this.bezierReflection;
};
Pin.prototype.setVoltage = function (newVoltage) {
  this.pulseProbeDuration = this.pulseProbeDuration || (newVoltage != this.voltage ? 1 : 0);
  this.voltage = newVoltage;
};
Pin.prototype.getVoltage = function () {
  return this.connected || !this.inputMode ? this.voltage : TTL.INVALID_VOLTAGE;
};
Pin.prototype.getLogicLevel = function () {
  return TTL.getVoltageLogicLevel(this.getVoltage());
};
Pin.prototype.isLow = function () {
  return TTL.isLow(this.getLogicLevel());
};
Pin.prototype.isInvalid = function () {
  return TTL.isInvalid(this.getLogicLevel());
};
Pin.prototype.isHigh = function () {
  return TTL.isHigh(this.getLogicLevel());
};
Pin.prototype.getColor = function () {
  return TTL.getColor(this.getVoltage());
};
Pin.prototype.reset = function () {
  this.voltage = this.startingVoltage;
  this.pulseProbeDuration = 0;
};
Pin.prototype.getLabel = function () {
  return this.getVoltage() + "V " + (this.inputMode ? "input" : "output") + " (" + this.getLogicLevel().toLowerCase() + ")";
};
Pin.prototype.toString = function () {
  return ['component', this.component.name, this.number, 'board', this.component.board.number].join(':');
};

module.exports = Pin;
