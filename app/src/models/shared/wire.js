var Hole = require('./hole'),
    Pin = require('./pin');

var Wire = function (options) {
  this.source = options.source;
  this.dest = options.dest;
  this.color = options.color;
  this.id = Wire.GenerateId(this.source, this.dest, this.color);
};
Wire.prototype.connects = function (source, dest) {
  return ((this.source === source) && (this.dest === dest)) || ((this.source === dest) && (this.dest === source));
};
Wire.prototype.getBezierReflection = function () {
  if (this.dest.connector) {
    return this.dest.getBezierReflection();
  }
  return this.source.getBezierReflection();
};
Wire.GenerateId = function (source, dest, color) {
  var sourceId = Wire.EndpointId(source),
      destId = Wire.EndpointId(dest),
      firstId = sourceId < destId ? sourceId : destId,
      secondId = firstId === sourceId ? destId : sourceId;
  return [firstId, secondId, color].join(',');
};
Wire.EndpointId = function (endPoint) {
  var id;
  if (endPoint instanceof Hole) {
    id = ['connector', endPoint.connector.type, endPoint.index].join(':');
  }
  else if (endPoint instanceof Pin) {
    id = ['component', endPoint.component.name, endPoint.number].join(':');
  }
  else {
    id = 'unknown';
  }
  return id;
};

module.exports = Wire;
