var circuitId = 1;

var Circuit = function (options) {
  this.inputs = options.inputs;
  this.outputs = options.outputs;
  this.id = options.id || circuitId++;
};

Circuit.prototype.resolveInputVoltages = function (debugMessage) {
  this.setAverageOutputVoltage(this.inputs, debugMessage);
};

Circuit.prototype.resolveOutputVoltages = function (debugMessage) {
  this.setAverageOutputVoltage(this.outputs, debugMessage);
};

Circuit.prototype.setAverageOutputVoltage = function (list, debugMessage) {
  var totalOutputVoltage = 0,
      averageVoltage = 0,
      debug = [],
      i, voltage;

  if (this.outputs.length > 0) {
    for (i = 0; i < this.outputs.length; i++) {
      voltage = this.outputs[i].getVoltage();
      if (debugMessage) {
        debug.push(this.outputs[i].toString() + "@" + voltage + "V");
      }
      totalOutputVoltage += voltage;
    }
    averageVoltage = totalOutputVoltage / this.outputs.length;
    if (debugMessage) {
      debug = ["(" + debug.join("+") + ")/" + this.outputs.length + "=" + averageVoltage + "V"];
    }
  }

  for (i = 0; i < list.length; i++) {
    list[i].setVoltage(averageVoltage);
    if (debugMessage) {
      list[i].addDebugMessage("Circuit #" + this.id + " " + debugMessage + ": " + debug.join(""));
    }
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

Circuit.prototype.getOutputState = function () {
  var outputState = [],
      i;
  for (i = 0; i < this.outputs.length; i++) {
    outputState.push(this.outputs[i].toString() + '=' + this.outputs[i].getVoltage());
  }
  return outputState.join(',');
};

Circuit.prototype.clearDebugMessages = function () {
  var i;
  for (i = 0; i < this.inputs.length; i++) {
    this.inputs[i].clearDebugMessages();
  }
  for (i = 0; i < this.outputs.length; i++) {
    this.outputs[i].clearDebugMessages();
  }
};

module.exports = Circuit;
