var TTL = require('../shared/ttl');

var BBHole = function(options) {
  this.board = options.board;
  this.rowName = options.rowName;
  this.columnIndex = options.columnIndex;
  this.serializedId = options.rowName + "." + (options.columnIndex + 1);
  this.strip = options.strip;
  this.cx = options.dimensions.cx;
  this.cy = options.dimensions.cy;
  this.coords = this.cx+"-"+this.cy;
  this.size = options.dimensions.size;
  this.column = options.column || 0;
  this.row = options.row || 0;
  this.inputMode = !!options.inputMode;
  this.voltage = options.hasOwnProperty("voltage") ? options.voltage : TTL.INVALID_VOLTAGE;
  this.startingVoltage = this.voltage;
  this.type = options.type;
  this.hasForcedVoltage = !!options.hasForcedVoltage;
  this.forcedVoltage = options.hasOwnProperty("forcedVoltage") ? options.forcedVoltage : TTL.INVALID_VOLTAGE;
  this.powered = false;
  this.hasSource = false;
  this.hasSink = false;
  this.isSource = !!options.isSource;
  this.isSink = !!options.isSink;
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
  this.powered = false;
  this.hasSource = false;
  this.hasSink = false;
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
  return "bbhole:" + this.serializedId + ":board:" + this.board.number;
};

module.exports = BBHole;