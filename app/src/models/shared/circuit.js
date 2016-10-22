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

module.exports = Circuit;
