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
      color: '#555', // ['blue', '#0f0', 'purple', '#cccc00'][i],
      connector: self,
      label: options.labels ? options.labels[i] : null,
      inputMode: this.type === 'output', // seems weird but output connector holes have values set so their holes are in "inputMode" like the pins
      toggleable: this.type == 'input'
    }));
  }
};
Connector.prototype.calculatePosition = function (constants, selected) {
  var selectedConstants = constants.selectedConstants(selected),
      holeWidth = selectedConstants.CONNECTOR_HOLE_DIAMETER + (selectedConstants.CONNECTOR_HOLE_MARGIN * 2),
      radius = selectedConstants.CONNECTOR_HOLE_DIAMETER / 2,
      vertical = this.type == 'bus',
      dx = vertical ? 0 : holeWidth,
      dy = vertical ? holeWidth : 0,
      i, cx, cy, hole;


  if (vertical) {
    this.position.width = holeWidth;
    this.position.height = holeWidth * this.count;
    this.position.x = 0;
    this.position.y = (selectedConstants.BOARD_HEIGHT - this.position.height) / 2;

    cy = this.position.y + selectedConstants.CONNECTOR_HOLE_MARGIN + radius;
    cx = holeWidth / 2;
  }
  else {
    this.position.width = holeWidth * this.count;
    this.position.height = holeWidth;
    this.position.x = (constants.WORKSPACE_WIDTH - this.position.width) / 2;
    this.position.y = this.type === 'input' ? 0 : selectedConstants.BOARD_HEIGHT - this.position.height;

    cy = this.type === 'input' ? this.position.y + selectedConstants.CONNECTOR_HOLE_MARGIN + radius : selectedConstants.BOARD_HEIGHT - (selectedConstants.CONNECTOR_HOLE_MARGIN + radius);
    cx = ((constants.WORKSPACE_WIDTH - this.position.width) / 2) + (holeWidth / 2);
  }

  for (i = 0; i < this.count; i++) {
    hole = this.holes[i];
    hole.cx = cx + (i * dx);
    hole.cy = cy + (i * dy);
    hole.radius =  radius;
  }
};
Connector.prototype.setHoleVoltage = function (index, voltage) {
  if ((index < this.holes.length) && (voltage !== 'x')) {
    this.holes[index].setVoltage(voltage);
  }
};
Connector.prototype.setHoleVoltages = function (voltages) {
  var i;
  for (i = 0; i < voltages.length; i++) {
    this.setHoleVoltage(i, voltages[i]);
  }
};
Connector.prototype.clearHoleVoltages = function () {
  var i;
  for (i = 0; i < this.holes.length; i++) {
    this.holes[i].setVoltage(0);
  }
};
Connector.prototype.getHoleVoltage = function (index) {
  return index < this.holes.length ? this.holes[index].getVoltage() : null;
};
Connector.prototype.getHoleVoltages = function () {
  var voltages = [],
      i;
  for (i = 0; i < this.holes.length; i++) {
    voltages.push(this.getHoleVoltage(i));
  }
  return voltages;
};
Connector.prototype.setConnectsTo = function (toConnector) {
  var i;
  this.connectsTo = toConnector;
  for (i = 0; i < this.holes.length; i++) {
    this.holes[i].connectedHole = toConnector.holes[i];
  }
};
Connector.prototype.updateFromConnectedBoard = function () {
  var i;
  for (i = 0; i < this.holes.length; i++) {
    if (this.holes[i].connectedHole) {
      this.holes[i].setVoltage(this.holes[i].connectedHole.getVoltage());
    }
  }
};

module.exports = Connector;
