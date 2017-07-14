var Hole = function(stripName, dimensions, column) {
  this.stripName = stripName;
  this.dimensions = dimensions;
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
      new Hole("top-pos-rail", {x: x, y: d.powerRail.top.pos.y, size: d.holeSize}),
      new Hole("top-neg-rail", {x: x, y: d.powerRail.top.neg.y, size: d.holeSize}),
      new Hole("bottom-pos-rail", {x: x, y: d.powerRail.bottom.pos.y, size: d.holeSize}),
      new Hole("bottom-neg-rail", {x: x, y: d.powerRail.bottom.neg.y,  size: d.holeSize})
    );
  }

  for (i = 0; i < 30; i++) {
    x = d.body.x + (i * d.holeSpaceX);
    for (var j = 0; j < 5; j++) {
      topY = d.body.top.y + (j * d.holeSpaceY);
      bottomY = d.body.bottom.y + (j * d.holeSpaceY);
      this.holes.push(
        new Hole("top-body-"+i, {x: x, y: topY, size: d.holeSize}, i),
        new Hole("bottom-body-"+i, {x: x, y: bottomY, size: d.holeSize}, i)
      );
    }
  }
};

module.exports = Breadboard;
