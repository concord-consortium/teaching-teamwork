var TTL = require('./ttl');

var Hole = function (options) {
  this.isPin = false; // to allow for easy checks against pins in circuits
  this.index = options.index;
  this.cx = options.cx;
  this.cy = options.cy;
  this.radius = options.radius;
  this.color = options.color;
  this.connector = options.connector;
  this.voltage = options.voltage || 0;
  this.startingVoltage = this.voltage;
  this.label = options.label;
  this.inputMode = options.inputMode;
  this.toggleable = options.toggleable;
  this.type = options.type;
  this.hasForcedVoltage = !!options.toggleable;
  this.forcedVoltage = TTL.LOW_VOLTAGE;
  this.powered = false;
  this.hasSource = false;
  this.hasSink = false;
  this.isSource = !!options.isSource;
  this.isSink = !!options.isSink;
};
Hole.prototype.getBezierReflection = function () {
  return this.connector.type === 'input' ? 1 : -1;
};
Hole.prototype.setVoltage = function (newVoltage) {
  this.voltage = newVoltage;
};
Hole.prototype.getVoltage = function (ignoreForcedVoltage) {
  return this.hasForcedVoltage && !ignoreForcedVoltage ? this.forcedVoltage : this.voltage;
};
Hole.prototype.getLogicLevel = function (ignoreForcedVoltage) {
  return TTL.getVoltageLogicLevel(this.getVoltage(ignoreForcedVoltage));
};
Hole.prototype.isLow = function () {
  return TTL.isLow(this.getLogicLevel());
};
Hole.prototype.isInvalid = function () {
  return TTL.isInvalid(this.getLogicLevel());
};
Hole.prototype.isHigh = function () {
  return TTL.isHigh(this.getLogicLevel());
};
Hole.prototype.reset = function () {
  this.voltage = this.startingVoltage;
  this.powered = false;
  this.hasSource = false;
  this.hasSink = false;
};
Hole.prototype.getColor = function (showVoltageColor) {
  showVoltageColor = this.powered && (showVoltageColor || (this.type == 'output'));
  return this.hasForcedVoltage ? TTL.getColor(this.forcedVoltage) : (showVoltageColor ? TTL.getColor(this.voltage) : this.color);
};
Hole.prototype.toggleForcedVoltage = function () {
  if (this.forcedVoltage == TTL.HIGH_VOLTAGE) {
    this.forcedVoltage = TTL.LOW_VOLTAGE;
  }
  else {
    this.forcedVoltage = TTL.HIGH_VOLTAGE;
  }
  return this.forcedVoltage;
};
Hole.prototype.setForcedVoltage = function (voltage) {
  this.forcedVoltage = voltage;
};
Hole.prototype.getLabel = function () {
  return this.label + " " + this.getVoltage(this.powered) + "V (" + this.getLogicLevel(this.powered).toLowerCase() + ")";
};
Hole.prototype.toString = function () {
  return ['connector', this.connector.type, this.index, 'board', this.connector.board ? this.connector.board.number : -1].join(':');
};

module.exports = Hole;
