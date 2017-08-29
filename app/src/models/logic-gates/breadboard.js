var TTL = require('../shared/ttl');

var BBStrip = function(name) {
  this.name = name;
  this.setInitialVoltage();
};

BBStrip.prototype.setVoltage = function(v) {
  if (this.name.indexOf("pos") === -1 && this.name.indexOf("neg") === -1) {
    this.voltage = v;
  }
};

BBStrip.prototype.setInitialVoltage = function() {
  this.voltage = 1.5;
  if (this.name.indexOf("pos") > -1) {
    this.voltage = 3;
  } else if (this.name.indexOf("neg") > -1) {
    this.voltage = 0;
  }
};

var BBHole = function(strip, dimensions, column, row) {
  this.strip = strip;
  this.cx = dimensions.cx;
  this.cy = dimensions.cy;
  this.coords = this.cx+"-"+this.cy;
  this.size = dimensions.size;
  this.column = column || 0;
  this.row = row || 0;
  this.connected = false;
};

BBHole.prototype.setVoltage = function(v) {
  this.strip.setVoltage(v);
};
BBHole.prototype.getVoltage = function() {
  return this.strip.voltage;
};
BBHole.prototype.getLogicLevel = function (ignoreForcedVoltage) {
  return TTL.getVoltageLogicLevel(this.getVoltage(ignoreForcedVoltage));
};
BBHole.prototype.isLow = function () {
  return TTL.isLow(this.getLogicLevel());
};
BBHole.prototype.isInvalid = function () {
  return TTL.isInvalid(this.getLogicLevel());
};
BBHole.prototype.isHigh = function () {
  return TTL.isHigh(this.getLogicLevel());
};
BBHole.prototype.resetStrip = function() {
  this.strip.setInitialVoltage();
};

BBHole.prototype.serialize = function(label) {
  var serialized = {connector: "breadboard", strip: this.strip.name};
  serialized[label] = "hole";
  return serialized;
};

BBHole.prototype.toString = function() {
  return "bbhole:"+this.coords;
};

var Breadboard = function(constants) {
  this.constants = constants;
  this.holes = [];
  this.bodyHolesMap = [];
  this.strips = {};
  this.dimensions = {
    holeSize: 8,
    holeSpaceX: 15.95,
    holeSpaceY: 17.8,
    powerRail: {
      x: 98,
      top: {
        pos: {
          y: 64
        },
        neg: {
          y: 80
        }
      },
      bottom: {
        pos: {
          y: 334
        },
        neg: {
          y: 350
        }
      }
    },
    body: {
      x: 90,
      top: {
        y: 120
      },
      bottom: {
        y: 223
      }
    }
  };

  var topPosRail = this.createStrip("pos-rail-top"),
      topNegRail = this.createStrip("neg-rail-top"),
      bottomPosRail = this.createStrip("pos-rail-bottom"),
      bottomNegRail = this.createStrip("neg-rail-bottom");

  var d = this.dimensions,
      x, topY, bottomY, gaps;

  for (var i = 0; i < 25; i++) {
    gaps = Math.floor(i/5);
    x = d.powerRail.x + ((i+gaps) * d.holeSpaceX);
    this.holes.push(
      new BBHole(topPosRail, {cx: x, cy: d.powerRail.top.pos.y, size: d.holeSize}),
      new BBHole(topNegRail, {cx: x, cy: d.powerRail.top.neg.y, size: d.holeSize}),
      new BBHole(bottomPosRail, {cx: x, cy: d.powerRail.bottom.pos.y, size: d.holeSize}),
      new BBHole(bottomNegRail, {cx: x, cy: d.powerRail.bottom.neg.y,  size: d.holeSize})
    );
  }

  for (i = 0; i < 30; i++) {
    var topStrip = this.createStrip("top-"+i),
        bottomStrip = this.createStrip("bottom-"+i),
        topHole, bottomHole;
    this.bodyHolesMap[i] = [];

    x = d.body.x + (i * d.holeSpaceX);
    for (var j = 0; j < 5; j++) {
      topY = d.body.top.y + (j * d.holeSpaceY);
      bottomY = d.body.bottom.y + (j * d.holeSpaceY);
      topHole = new BBHole(topStrip, {cx: x, cy: topY, size: d.holeSize}, i, j);
      bottomHole = new BBHole(bottomStrip, {cx: x, cy: bottomY, size: d.holeSize}, i, + 5);
      this.holes.push(
        topHole,
        bottomHole
      );
      this.bodyHolesMap[i][j] = topHole;
      this.bodyHolesMap[i][j+5] = bottomHole;
    }
  }
};

Breadboard.prototype.findHole = function(coords) {
  for (var i = 0, ii = this.holes.length; i < ii; i++) {
    if (this.holes[i].coords == coords) {
      return this.holes[i];
    }
  }
};

Breadboard.prototype.createStrip = function(name) {
  var strip = new BBStrip(name);
  this.strips[name] = strip;
  return strip;
};

Breadboard.prototype.placeComponent = function(component) {
  var offset = component.getTopLeftPinOffset(this.constants, true),
      constants = this.constants.selectedConstants(true),
      pinPos = {x: component.position.x + offset.x, y: component.position.y + offset.y},
      hole = this.getNearestHole(pinPos, true),
      oldHoles, i, ii, j, jj;

  // we have to uplug component before move so we don't block our own holes, but
  // we keep a ref to those holes in case we need to plug the component back to its
  // old location
  oldHoles = this.unplugComponent(component);

  component.position.x = hole.cx - offset.x - (constants.PIN_WIDTH/2);
  component.position.y = hole.cy - offset.y;

  var firstColumn = hole.column,
      firstRow = hole.row,
      pin, placement, colOffset, column, row, stripName;

  // first we have to loop through all the holes and see if it's a valid location
  for (i = 0, ii = component.pins.length; i < ii; i++) {
    pin = component.pins[i];
    colOffset = pin.column;
    column = firstColumn + colOffset;
    for (j = 0, jj = 4; j < jj; j++) {
      row = firstRow + j;
      if (this.bodyHolesMap[column][row].connected) {
        // reset any old holes
        for (i = 0, ii = oldHoles.length; i<ii; i++) {
          oldHoles[i].connected = true;
        }
        return false;
      }
    }
  }

  // now add the chip
  component.holes = [];
  for (i = 0, ii = component.pins.length; i < ii; i++) {
    pin = component.pins[i];
    placement = pin.placement;
    colOffset = pin.column;
    column = firstColumn + colOffset;
    stripName = placement + "-" + column;
    pin.setBBStrip(this.strips[stripName]);
    for (j = 0, jj = 4; j < jj; j++) {
      row = firstRow + j;
      this.bodyHolesMap[column][row].connected = true;
      component.holes.push(this.bodyHolesMap[column][row]);
    }
  }
  return true;
};

Breadboard.prototype.getNearestHole = function(pos, restrictToFitChip) {
  var smallestDistance = Infinity,
      nearestHole = null,
      hole;
  for (var i = 0, ii = this.holes.length; i < ii; i++) {
    hole = this.holes[i];
    if (restrictToFitChip && (hole.row < 2 || hole.row > 4 || hole.column > 23)) {
      continue;
    }

    var dx = pos.x - hole.cx,
        dy = pos.y - hole.cy,
        dSquared = (dx * dx) + (dy * dy);
    if (dSquared < smallestDistance) {
      smallestDistance = dSquared;
      nearestHole = hole;
    }
  }
  return nearestHole;
};

Breadboard.prototype.unplugComponent = function(component) {
  if (!component.holes) {
    component.holes = [];
  }
  for (var i = 0, ii = component.holes.length; i<ii; i++) {
    component.holes[i].connected = false;
  }
  return component.holes;
};

module.exports = Breadboard;
