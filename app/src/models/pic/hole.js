var Hole = function (options) {
  this.isPin = false; // to allow for easy checks against pins in circuits
  this.index = options.index;
  this.cx = options.cx;
  this.cy = options.cy;
  this.radius = options.radius;
  this.color = options.color;
  this.connector = options.connector;
  this.connected = options.connected || false;
  this.value = options.value || 0;
};
Hole.prototype.getBezierReflection = function () {
  return this.connector.type === 'input' ? 1 : -1;
};
Hole.prototype.setValue = function (newValue) {
  this.pulseProbeDuration = this.pulseProbeDuration || (newValue != this.value ? 1 : 0);
  this.value = newValue;
};
Hole.prototype.reset = function () {
  this.value = this.startingValue;
  this.pulseProbeDuration = 0;
};

module.exports = Hole;
