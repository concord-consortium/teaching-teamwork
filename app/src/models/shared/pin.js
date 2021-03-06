var TTL = require('./ttl');

var Pin = function (options) {
  this.board = options.component.board;
  this.isPin = true; // to allow for easy checks against holes in circuits
  this.inputMode = options.inputMode;
  this.placement = options.placement;
  this.column = options.column;
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
  this.voltage = options.voltage || 0;
  this.startingVoltage = this.voltage;
  this.powered = false;
  this.hasSource = false;
  this.hasSink = false;
  this.isSource = !!options.isSource;
  this.isSink = !!options.isSink;
};
Pin.prototype.getBezierReflection = function () {
  return this.bezierReflection;
};
Pin.prototype.setVoltage = function (newVoltage) {
  this.voltage = newVoltage;
};
Pin.prototype.getVoltage = function () {
  return this.voltage;
};
Pin.prototype.getLogicLevel = function () {
  return TTL.getVoltageLogicLevel(this.voltage);
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
  this.powered = false;
  this.hasSource = false;
  this.hasSink = false;

};
Pin.prototype.getLabel = function () {
  if (!this.powered) {
    return "";
  }
  return this.getVoltage() + "V " + (this.inputMode ? "input" : "output") + " (" + this.getLogicLevel().toLowerCase() + ")";
};
Pin.prototype.toString = function () {
  return ['component', this.component.name, (this.number + 1), 'board', this.component.board ? this.component.board.number : "none"].join(':');
};

module.exports = Pin;
