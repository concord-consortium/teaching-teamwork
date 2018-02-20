var Hole = require('./hole'),
    TTL = require('./ttl');

var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

var Connector = function (options) {
  var self = this,
      isBus = options.type === 'bus',
      startingLetter = options.type === 'input' ? 0 : (letters.length - options.count),
      i;

  this.type = options.type;
  this.count = options.count;
  this.start = options.start || 0;
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
      label: isBus ? (i + 1) : letters[startingLetter + i],
      inputMode: this.type != 'input', // seems weird but output connector holes have values set so their holes are in "inputMode" like the pins
      toggleable: this.type == 'input',
      type: options.type,
      isSource: options.type == 'input',
      isSink: options.type == 'output'
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
      selectorWidth,
      inputWidth, outputWidth, totalWidth, i, cx, cy, hole, holeX, holeY;


  if (vertical) {
    this.position.width = holeWidth;
    this.position.height = holeWidth * this.count;
    this.position.x = 0;
    this.position.y = (selectedConstants.BOARD_HEIGHT - this.position.height) / 2;

    this.position.inputHeight = (this.busInputSize * holeWidth);
    this.position.outputHeight = (this.busOutputSize * holeWidth);

    holeY = cy = this.position.y + selectedConstants.CONNECTOR_HOLE_MARGIN + radius;
    holeX = cx = holeWidth / 2;
  }
  else {
    inputWidth = totalWidth = (allConnectors.input ? holeWidth * allConnectors.input.count : 0);
    selectorWidth = inputWidth > 0 ? selectedConstants.AUTO_TOGGLE_SELECTOR_WIDTH + (selectedConstants.AUTO_TOGGLE_SELECTOR_MARGIN * 3) : 0;
    if ((inputWidth > 0) && allConnectors.output) {
      totalWidth += selectedConstants.CONNECTOR_SPACING + selectorWidth;
    }
    outputWidth = (allConnectors.output ? holeWidth * allConnectors.output.count : 0);
    totalWidth += outputWidth;

    this.position.width = this.type == 'input' ? inputWidth : outputWidth;
    this.position.height = holeWidth * 1.25;
    this.position.x = ((constants.WORKSPACE_WIDTH - totalWidth) / 2) + (this.type == 'output' ? (inputWidth + selectorWidth + selectedConstants.CONNECTOR_SPACING) : 0);
    this.position.y = holeWidth + 6;

    holeY = cy = this.position.y + selectedConstants.CONNECTOR_HOLE_MARGIN + radius;
    holeX = cx = this.position.x + (holeWidth / 2);

    this.position.selectorBackgroundWidth = selectorWidth;
    this.position.negativeSelectorCX = holeX + this.position.width - holeWidth + selectedConstants.AUTO_TOGGLE_SELECTOR_MARGIN + (selectedConstants.AUTO_TOGGLE_SELECTOR_WIDTH / 2);
    this.position.positiveSelectorCX = this.position.negativeSelectorCX + selectedConstants.AUTO_TOGGLE_SELECTOR_MARGIN + selectedConstants.AUTO_TOGGLE_SELECTOR_WIDTH;
    this.position.selectorWidth = selectedConstants.AUTO_TOGGLE_SELECTOR_WIDTH;
    this.position.selectorHeight = selectedConstants.AUTO_TOGGLE_SELECTOR_HEIGHT;
  }

  for (i = 0; i < this.count; i++) {
    hole = this.holes[i];
    hole.cx = holeX + (i * dx);
    hole.cy = holeY + (i * dy);
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
Connector.prototype.autoToggleSwitches = function(direction) {
  var currentValue = 0,
      maxValue = Math.pow(2, this.holes.length) - 1,
      i, bitValue;

  for (i = 0; i < this.holes.length; i++) {
    bitValue = this.holes[(this.holes.length-1)-i].isHigh() ? 1 : 0;
    currentValue += (bitValue << i);
  }

  if (direction == 'positive') {
    currentValue = (currentValue + 1) % (maxValue + 1);
  }
  else {
    currentValue = currentValue > 0 ? currentValue - 1 : maxValue;
  }

  for (i = 0; i < this.holes.length; i++) {
    bitValue = currentValue & (1 << i);
    this.holes[(this.holes.length-1)-i].setForcedVoltage(bitValue ? TTL.HIGH_VOLTAGE : TTL.LOW_VOLTAGE);
  }

  return currentValue;
};

module.exports = Connector;
