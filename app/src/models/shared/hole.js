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
  this.startingValue = this.value;
  this.label = options.label;
};
Hole.prototype.getBezierReflection = function () {
  return this.connector.type === 'input' ? 1 : -1;
};
Hole.prototype.setValue = function (newValue) {
  this.pulseProbeDuration = this.pulseProbeDuration || (newValue != this.value ? 1 : 0);
  this.value = newValue;
};
Hole.prototype.getValue = function () {
  return this.value;
};
Hole.prototype.reset = function () {
  this.value = this.startingValue;
  this.pulseProbeDuration = 0;
};
Hole.prototype.getColor = function () {
  return this.color;
};

module.exports = Hole;
