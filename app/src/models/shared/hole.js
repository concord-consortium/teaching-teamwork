var TTL = require('./ttl');

var Hole = function (options) {
  this.isPin = false; // to allow for easy checks against pins in circuits
  this.index = options.index;
  this.cx = options.cx;
  this.cy = options.cy;
  this.radius = options.radius;
  this.color = options.color;
  this.connector = options.connector;
  this.connected = options.connected || false;
  this.voltage = options.voltage || 0;
  this.startingVoltage = this.voltage;
  this.label = options.label;
  this.inputMode = options.inputMode;
  this.connectedHole = null; // set via Connector.prototype.setConnectsTo
};
Hole.prototype.getBezierReflection = function () {
  return this.connector.type === 'input' ? 1 : -1;
};
Hole.prototype.setVoltage = function (newVoltage) {
  this.pulseProbeDuration = this.pulseProbeDuration || (newVoltage != this.voltage ? 1 : 0);
  this.voltage = newVoltage;
};
Hole.prototype.getVoltage = function () {
  return this.voltage;
};
Hole.prototype.getLogicLevel = function () {
  return TTL.getVoltageLogicLevel(this.voltage);
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
  this.pulseProbeDuration = 0;
};
Hole.prototype.getColor = function (editableInput) {
  return editableInput ? TTL.getColor(this.voltage) : this.color;
};

module.exports = Hole;
