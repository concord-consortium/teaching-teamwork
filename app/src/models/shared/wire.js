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
    return this.dest.getBezierReflection ? this.dest.getBezierReflection() : 0;
  }
  return this.source.getBezierReflection ? this.source.getBezierReflection() : 0;
};
Wire.GenerateId = function (source, dest, color) {
  var sourceId = source.toString(),
      destId = dest.toString(),
      firstId = sourceId < destId ? sourceId : destId,
      secondId = firstId === sourceId ? destId : sourceId;
  return [firstId, secondId, color].join(',');
};
Wire.toString = function () {
  return this.id;
};

module.exports = Wire;
