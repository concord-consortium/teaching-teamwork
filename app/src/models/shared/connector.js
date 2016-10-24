var Hole = require('./hole');

var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

var Connector = function (options) {
  var self = this,
      i;

  this.type = options.type;
  this.count = options.count;
  this.position = {};
  this.busInputSize = options.busInputSize || 0;
  this.busOutputSize = options.busOutputSize || 0;

  this.holes = [];
  for (i = 0; i < this.count; i++) {
    this.holes.push(new Hole({
      index: i,
      x: 0,
      y: 0,
      radius: 0,
      color: '#555', // ['blue', '#0f0', 'purple', '#cccc00'][i],
      connector: self,
      label: letters[i],
      inputMode: this.type != 'input', // seems weird but output connector holes have values set so their holes are in "inputMode" like the pins
      toggleable: this.type == 'input',
      type: options.type
    }));
  }
};
Connector.prototype.calculatePosition = function (constants, selected, allConnectors) {
  var selectedConstants = constants.selectedConstants(selected),
      holeWidth = selectedConstants.CONNECTOR_HOLE_DIAMETER + (selectedConstants.CONNECTOR_HOLE_MARGIN * 2),
      radius = selectedConstants.CONNECTOR_HOLE_DIAMETER / 2,
      vertical = this.type == 'bus',
      dx = vertical ? 0 : holeWidth,
      dy = vertical ? holeWidth : 0,
      inputWidth, outputWidth, totalWidth, i, cx, cy, hole;


  if (vertical) {
    this.position.width = holeWidth;
    this.position.height = holeWidth * this.count;
    this.position.x = 0;
    this.position.y = (selectedConstants.BOARD_HEIGHT - this.position.height) / 2;

    this.position.inputHeight = (this.busInputSize * holeWidth);
    this.position.outputHeight = (this.busOutputSize * holeWidth);

    cy = this.position.y + selectedConstants.CONNECTOR_HOLE_MARGIN + radius;
    cx = holeWidth / 2;
  }
  else {
    inputWidth = totalWidth = (allConnectors.input ? holeWidth * allConnectors.input.count : 0);
    if ((inputWidth > 0) && allConnectors.output) {
      totalWidth += selectedConstants.CONNECTOR_SPACING;
    }
    outputWidth = (allConnectors.output ? holeWidth * allConnectors.output.count : 0);
    totalWidth += outputWidth;

    this.position.width = this.type == 'input' ? inputWidth : outputWidth;
    this.position.height = holeWidth;
    this.position.x = ((constants.WORKSPACE_WIDTH - totalWidth) / 2) + (this.type == 'output' ? (inputWidth + selectedConstants.CONNECTOR_SPACING) : 0);
    this.position.y = 0;

    cy = this.position.y + selectedConstants.CONNECTOR_HOLE_MARGIN + radius;
    cx = this.position.x + (holeWidth / 2);
  }

  for (i = 0; i < this.count; i++) {
    hole = this.holes[i];
    hole.cx = cx + (i * dx);
    hole.cy = cy + (i * dy);
    hole.radius =  radius;
  }
};
Connector.prototype.setHoleVoltage = function (index, voltage, forced) {
  if ((index < this.holes.length) && (voltage !== 'x')) {
    this.holes[index][forced ? "setForcedVoltage" : "setVoltage"](voltage);
  }
};
Connector.prototype.setHoleVoltages = function (voltages, forced) {
  var i;
  for (i = 0; i < voltages.length; i++) {
    this.setHoleVoltage(i, voltages[i], forced);
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

module.exports = Connector;
