var Circuit = function (options) {
  this.inputs = options.inputs;
  this.outputs = options.outputs;
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
      i;

  if (this.outputs.length > 0) {
    for (i = 0; i < this.outputs.length; i++) {
      totalOutputVoltage += this.outputs[i].getVoltage();
    }
    averageVoltage = totalOutputVoltage / this.outputs.length;
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

module.exports = Circuit;
