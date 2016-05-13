var Button = function (options) {
  this.value = options.value;
  this.intValue = options.intValue;
  this.x = options.x;
  this.y = options.y;
  this.cx = options.x + (options.width / 2);
  this.cy = options.y + (options.height / 2);
  this.height = options.height;
  this.width = options.width;
  this.labelSize = options.labelSize;
  this.label = options.label;
  this.component = options.component;
};

module.exports = Button;
