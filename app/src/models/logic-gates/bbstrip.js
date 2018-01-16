var TTL = require('../shared/ttl');

var BBStrip = function(name) {
  this.holes = [];
  this.name = name;
  this.setInitialVoltage();
};

BBStrip.prototype.addHole = function (hole) {
  this.holes.push(hole);
};

BBStrip.prototype.setInitialVoltage = function() {
  this.voltage = TTL.INVALID_VOLTAGE;
  if (this.name.indexOf("pos") > -1) {
    this.voltage = TTL.HIGH_VOLTAGE;
  } else if (this.name.indexOf("neg") > -1) {
    this.voltage = TTL.LOW_VOLTAGE;
  }
};

module.exports = BBStrip;