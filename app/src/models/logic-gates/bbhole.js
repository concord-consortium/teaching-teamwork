var TTL = require('../shared/ttl');

var BBHole = function(options) {
  this.rowName = options.rowName;
  this.columnIndex = options.columnIndex;
  this.strip = options.strip;
  this.cx = options.dimensions.cx;
  this.cy = options.dimensions.cy;
  this.coords = this.cx+"-"+this.cy;
  this.size = options.dimensions.size;
  this.column = options.column || 0;
  this.row = options.row || 0;
  this.connected = !!options.connected || false;
  this.inputMode = !!options.inputMode;
  this.voltage = options.hasOwnProperty("voltage") ? options.voltage : TTL.INVALID_VOLTAGE;
  this.startingVoltage = this.voltage;
  this.type = options.type;
  this.hasForcedVoltage = !!options.hasForcedVoltage;
  this.forcedVoltage = options.hasOwnProperty("forcedVoltage") ? options.forcedVoltage : TTL.INVALID_VOLTAGE;

  this.forceShowProbe = true;
};

BBHole.prototype.setVoltage = function(newVoltage) {
  this.voltage = newVoltage;
};
BBHole.prototype.getVoltage = function(ignoreForcedVoltage) {
  return this.hasForcedVoltage && !ignoreForcedVoltage ? this.forcedVoltage : this.voltage;
};
BBHole.prototype.getLogicLevel = function (ignoreForcedVoltage) {
  return TTL.getVoltageLogicLevel(this.getVoltage(ignoreForcedVoltage));
};
BBHole.prototype.isLow = function () {
  return TTL.isLow(this.getLogicLevel());
};
BBHole.prototype.isInvalid = function () {
  return TTL.isInvalid(this.getLogicLevel());
};
BBHole.prototype.isHigh = function () {
  return TTL.isHigh(this.getLogicLevel());
};
BBHole.prototype.reset = function () {
  this.voltage = this.startingVoltage;
};
BBHole.prototype.getColor = function () {
  return this.hasForcedVoltage ? TTL.getColor(this.forcedVoltage) : TTL.getColor(this.voltage);
};
BBHole.prototype.setForcedVoltage = function (voltage) {
  this.forcedVoltage = voltage;
};

BBHole.prototype.serialize = function(label) {
  var serialized = {connector: "breadboard"};
  serialized[label] = "hole";
  return serialized;
};

BBHole.prototype.toString = function() {
  return "bbhole:"+this.coords;
};

module.exports = BBHole;