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
  this.connected = options.connected || false;
  this.value = options.value || 0;
  this.startingValue = this.value;
};
Pin.prototype.getBezierReflection = function () {
  return this.bezierReflection;
};
Pin.prototype.setValue = function (newValue) {
  this.pulseProbeDuration = this.pulseProbeDuration || (newValue != this.value ? 1 : 0);
  this.value = newValue;
};
Pin.prototype.reset = function () {
  this.value = this.startingValue;
  this.pulseProbeDuration = 0;
};

module.exports = Pin;
