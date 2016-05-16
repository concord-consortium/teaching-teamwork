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

module.exports = Connector;
