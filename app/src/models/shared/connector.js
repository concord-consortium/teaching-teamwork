var Hole = require('./hole');

var Connector = function (options) {
  var self = this,
      i;

  this.type = options.type;
  this.count = options.count;
  this.position = {};

  this.holes = [];
  for (i = 0; i < this.count; i++) {
    this.holes.push(new Hole({
      index: i,
      x: 0,
      y: 0,
      radius: 0,
      color: ['blue', '#0f0', 'purple', '#cccc00'][i],
      connector: self
    }));
  }
};
Connector.prototype.calculatePosition = function (constants, selected) {
  var selectedConstants = constants.selectedConstants(selected),
      i, cx, cy, radius, holeWidth, hole;

  holeWidth = selectedConstants.CONNECTOR_HOLE_DIAMETER + (selectedConstants.CONNECTOR_HOLE_MARGIN * 2);
  this.position.width = holeWidth * this.count;
  this.position.height = holeWidth;
  this.position.x = (constants.WORKSPACE_WIDTH - this.position.width) / 2;
  this.position.y = this.type === 'input' ? 0 : selectedConstants.BOARD_HEIGHT - this.position.height;

  radius = selectedConstants.CONNECTOR_HOLE_DIAMETER / 2;
  cy = this.type === 'input' ? this.position.y + selectedConstants.CONNECTOR_HOLE_MARGIN + radius : selectedConstants.BOARD_HEIGHT - (selectedConstants.CONNECTOR_HOLE_MARGIN + radius);
  cx = ((constants.WORKSPACE_WIDTH - this.position.width) / 2) + (holeWidth / 2);

  for (i = 0; i < this.count; i++) {
    hole = this.holes[i];
    hole.cx = cx + (i * holeWidth);
    hole.cy = cy;
    hole.radius =  radius;
  }
};
Connector.prototype.setHoleValue = function (index, value) {
  if ((index < this.holes.length) && (value !== 'x')) {
    this.holes[index].setValue(value);
  }
};
Connector.prototype.setHoleValues = function (values) {
  var i;
  for (i = 0; i < values.length; i++) {
    this.setHoleValue(i, values[i]);
  }
};
Connector.prototype.getHoleValue = function (index) {
  return index < this.holes.length ? this.holes[index].value : null;
};
Connector.prototype.getHoleValues = function () {
  var values = [],
      i;
  for (i = 0; i < this.holes.length; i++) {
    values.push(this.getHoleValue(i));
  }
  return values;
};

module.exports = Connector;
