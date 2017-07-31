var Hole = function(stripName, dimensions, column) {
  this.stripName = stripName;
  this.cx = dimensions.cx;
  this.cy = dimensions.cy;
  this.size = dimensions.size;
  this.isTopBody = this.stripName.indexOf("top-body") > -1;
  this.column = column || 0;
};

var Breadboard = function(constants) {
  this.constants = constants;
  this.holes = [];
  this.dimensions = {
    holeSize: 8,
    holeSpaceX: 15.95,
    holeSpaceY: 17.8,
    powerRail: {
      x: 98,
      top: {
        pos: {
          y: 58
        },
        neg: {
          y: 74
        }
      },
      bottom: {
        pos: {
          y: 328
        },
        neg: {
          y: 344
        }
      }
    },
    body: {
      x: 90,
      top: {
        y: 114
      },
      bottom: {
        y: 217
      }
    }
  };

  var d = this.dimensions,
      x, topY, bottomY, gaps;

  for (var i = 0; i < 25; i++) {
    gaps = Math.floor(i/5);
    x = d.powerRail.x + ((i+gaps) * d.holeSpaceX);
    this.holes.push(
      new Hole("top-pos-rail", {cx: x, cy: d.powerRail.top.pos.y, size: d.holeSize}),
      new Hole("top-neg-rail", {cx: x, cy: d.powerRail.top.neg.y, size: d.holeSize}),
      new Hole("bottom-pos-rail", {cx: x, cy: d.powerRail.bottom.pos.y, size: d.holeSize}),
      new Hole("bottom-neg-rail", {cx: x, cy: d.powerRail.bottom.neg.y,  size: d.holeSize})
    );
  }

  for (i = 0; i < 30; i++) {
    x = d.body.x + (i * d.holeSpaceX);
    for (var j = 0; j < 5; j++) {
      topY = d.body.top.y + (j * d.holeSpaceY);
      bottomY = d.body.bottom.y + (j * d.holeSpaceY);
      this.holes.push(
        new Hole("top-body-"+i, {cx: x, cy: topY, size: d.holeSize}, i),
        new Hole("bottom-body-"+i, {cx: x, cy: bottomY, size: d.holeSize}, i)
      );
    }
  }
};

Breadboard.prototype.placeComponent = function(component) {
  var offset = component.getTopLeftPinOffset(this.constants, true),
      constants = this.constants.selectedConstants(true),
      pinPos = {x: component.position.x + offset.x, y: component.position.y + offset.y},
      hole = this.getNearestHole(pinPos, true);
  component.position.x = hole.dimensions.x - offset.x - (constants.PIN_WIDTH/2);
  component.position.y = hole.dimensions.y - offset.y;
};

Breadboard.prototype.getNearestHole = function(pos, restrictToFitChip) {
  var smallestDistance = Infinity,
      nearestHole = null,
      hole;
  for (var i = 0, ii = this.holes.length; i < ii; i++) {
    hole = this.holes[i];
    if (restrictToFitChip && (!hole.isTopBody || hole.column > 23)) {
      continue;
    }

    var dx = pos.x - hole.dimensions.x,
        dy = pos.y - hole.dimensions.y,
        dSquared = (dx * dx) + (dy * dy);
    if (dSquared < smallestDistance) {
      smallestDistance = dSquared;
      nearestHole = hole;
    }
  }
  return nearestHole;
};

module.exports = Breadboard;
