var TTL = require('./ttl');
var circuitId = 1;

var Circuit = function (options) {
  this.inputs = options.inputs;
  this.outputs = options.outputs;
  this.id = options.id || circuitId++;
  this.hasBreadboard = !!options.hasBreadboard;
};

Circuit.prototype.setEndpointFlags = function () {
  var hasSource = !!this.outputs.find(function (output) { return output.isSource; });
  var hasSink = !!this.outputs.find(function (output) { return output.isSink; });
  var powered = this.hasBreadboard ? hasSource || hasSink : true;
  var updateEndpoint = function (endPoint) {
    endPoint.powered = powered;
    endPoint.hasSource = hasSource;
    endPoint.hasSink = hasSink;
  };
  this.inputs.forEach(updateEndpoint);
  this.outputs.forEach(updateEndpoint);
};

Circuit.prototype.updateEndpointPoweredFlag = function () {
  var powered = !this.hasBreadboard || !!this.outputs.find(function (output) { return output.powered; });
  var updateEndpoint = function (endPoint) {
    endPoint.powered = powered;
  };
  if (powered) {
    this.inputs.forEach(updateEndpoint);
    this.outputs.forEach(updateEndpoint);
  }
};

Circuit.prototype.resolveInputVoltages = function () {
  this.setAverageOutputVoltage(this.inputs);
};

Circuit.prototype.resolveOutputVoltages = function () {
  this.setAverageOutputVoltage(this.outputs);
};

Circuit.prototype.setAverageOutputVoltage = function (list) {
  var totalOutputVoltage = 0,
      averageVoltage = 0,
      i, voltage;

  if (this.outputs.length > 0) {
    for (i = 0; i < this.outputs.length; i++) {
      voltage = this.outputs[i].getVoltage();
      totalOutputVoltage += voltage;
    }
    averageVoltage = totalOutputVoltage / this.outputs.length;
  }
  else {
    averageVoltage = TTL.INVALID_VOLTAGE;
  }

  for (i = 0; i < list.length; i++) {
    list[i].setVoltage(averageVoltage);
  }
};

Circuit.prototype.toString = function () {
  var inputs = [],
      outputs = [],
      i;

  for (i = 0; i < this.inputs.length; i++) {
    inputs.push(this.inputs[i].toString() + ' = ' + this.inputs[i].getVoltage());
  }
  for (i = 0; i < this.outputs.length; i++) {
    outputs.push(this.outputs[i].toString() + ' = ' + this.outputs[i].getVoltage());
  }
  return JSON.stringify({inputs: inputs, outputs: outputs});
};

Circuit.prototype.getInputVoltages = function (inputVoltages) {
  var i;
  for (i = 0; i < this.inputs.length; i++) {
    inputVoltages[this.inputs[i].toString()] = this.inputs[i].getVoltage();
  }
};

Circuit.prototype.getOutputVoltages = function (outputVoltages) {
  var i;
  for (i = 0; i < this.outputs.length; i++) {
    outputVoltages[this.outputs[i].toString()] = this.outputs[i].getVoltage();
  }
};

module.exports = Circuit;
