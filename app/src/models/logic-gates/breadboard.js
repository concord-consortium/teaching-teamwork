var TTL = require('../shared/ttl'),
    Wire = require("../shared/wire"),
    BBHole = require("./bbhole"),
    BBStrip = require("./bbstrip");

var Breadboard = function(board, constants) {
  this.board = board;
  this.constants = constants;
  this.holes = [];
  this.holeMap = {};
  this.bodyHolesMap = [];
  this.holeRowMap = {};
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

  var d = this.dimensions,
      x, topY, bottomY, gaps;

  var rowName = function (rowIndex) {
        return String.fromCharCode(97 + rowIndex);
      };

  for (var i = 0; i < 25; i++) {
    gaps = Math.floor(i/5);
    x = d.powerRail.x + ((i+gaps) * d.holeSpaceX);
    this.holes.push(
      new BBHole({board: board, rowName: "top+", columnIndex: i, dimensions: {cx: x, cy: d.powerRail.top.pos.y, size: d.holeSize}, type: "output", hasForcedVoltage: true, forcedVoltage: TTL.HIGH_VOLTAGE, isSource: true}),
      new BBHole({board: board, rowName: "top-", columnIndex: i, dimensions: {cx: x, cy: d.powerRail.top.neg.y, size: d.holeSize}, type: "output", hasForcedVoltage: true, forcedVoltage: TTL.LOW_VOLTAGE, isSink: true}),
      new BBHole({board: board, rowName: "bottom+", columnIndex: i, dimensions: {cx: x, cy: d.powerRail.bottom.pos.y, size: d.holeSize}, type: "output", hasForcedVoltage: true, forcedVoltage: TTL.HIGH_VOLTAGE, isSource: true}),
      new BBHole({board: board, rowName: "bottom-", columnIndex: i, dimensions: {cx: x, cy: d.powerRail.bottom.neg.y,  size: d.holeSize}, type: "output", hasForcedVoltage: true, forcedVoltage: TTL.LOW_VOLTAGE, isSink: true})
    );
  }

  for (i = 0; i < 30; i++) {
    var topStrip = this.createStrip("top-"+i),
        bottomStrip = this.createStrip("bottom-"+i),
        lastTopHole = null,
        lastBottomHole = null,
        topHole, bottomHole;
    this.bodyHolesMap[i] = [];

    x = d.body.x + (i * d.holeSpaceX);
    for (var j = 0; j < 5; j++) {
      topY = d.body.top.y + (j * d.holeSpaceY);
      bottomY = d.body.bottom.y + (j * d.holeSpaceY);
      topHole = new BBHole({board: board, rowName: rowName(j), columnIndex: (29 - i), strip: topStrip, dimensions: {cx: x, cy: topY, size: d.holeSize}, column: i, row: j, inputMode: true, type: "input"});
      bottomHole = new BBHole({board: board, rowName: rowName(j+5), columnIndex: (29 - i), strip: bottomStrip, dimensions: {cx: x, cy: bottomY, size: d.holeSize}, column: i, row: j + 5, inputMode: true, type: "input"});
      this.holes.push(
        topHole,
        bottomHole
      );
      this.bodyHolesMap[i][j] = this.holeMap[topHole] = topHole;
      this.bodyHolesMap[i][j+5] = this.holeMap[bottomHole] = bottomHole;
      topStrip.addHole(topHole);
      bottomStrip.addHole(bottomHole);

      this.addStripWire(topStrip, lastTopHole, topHole);
      this.addStripWire(bottomStrip, lastBottomHole, bottomHole);
      lastTopHole = topHole;
      lastBottomHole = bottomHole;
    }
  }

  var ii, hole;
  for (i = 0, ii = this.holes.length; i < ii; i++) {
    hole = this.holes[i];
    if (!this.holeRowMap[hole.rowName]) {
      this.holeRowMap[hole.rowName] = {holes: []};
    }
    this.holeRowMap[hole.rowName].holes[hole.columnIndex] = hole;
  }
};

Breadboard.prototype.findHole = function(serializedId) {
  for (var i = 0, ii = this.holes.length; i < ii; i++) {
    if (this.holes[i].serializedId == serializedId) {
      return this.holes[i];
    }
  }
};

Breadboard.prototype.createStrip = function(name) {
  var strip = new BBStrip(name);
  this.strips[name] = strip;
  return strip;
};

Breadboard.prototype.addStripWire = function (strip, hole1, hole2) {
  if (hole1 && hole2) {
    strip.wires.push(new Wire({source: hole1, dest: hole2}));
  }
};

Breadboard.prototype.placeComponent = function(component, componentList) {
  var offset = component.getTopLeftPinOffset(this.constants, true),
      constants = this.constants.selectedConstants(true),
      pinPos = {x: component.position.x + offset.x, y: component.position.y + offset.y},
      hole = this.getNearestHole(pinPos, true),
      firstColumn = hole.column,
      firstRow = hole.row,
      pin, column, row, i, ii;


  component.position.x = hole.cx - offset.x - (constants.PIN_WIDTH/2);
  component.position.y = hole.cy - offset.y;

  // check if another component exists at the placement
  if (componentList) {
    for (i = 0, ii = componentList.length; i < ii; i++) {
      var testComponent = componentList[i];
      if ((testComponent !== component) && (testComponent.position.x == component.position.x) && (testComponent.position.y == component.position.y)) {
        return false;
      }
    }
  }

  component.pinWires = [];
  for (i = 0, ii = component.pins.length; i < ii; i++) {
    pin = component.pins[i];
    column = firstColumn + pin.column;
    row = pin.placement === "top" ? firstRow : firstRow + 3;
    component.pinWires.push(new Wire({
      source: this.bodyHolesMap[column][row], // NOTE: do NOT change source/dest pair here as it is assumed source is breadboard and dest is pin in circuit-resolver
      dest: pin
    }));
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
  component.pinWires = [];
};

Breadboard.prototype.reset = function () {
  for (var i = 0, ii = this.holes.length; i < ii; i++) {
    this.holes[i].reset();
  }
};


module.exports = Breadboard;
