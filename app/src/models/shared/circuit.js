var Circuit = function (options) {
  this.inputs = options.inputs;
  this.outputs = options.outputs;
};
Circuit.ResolveWires = function (allWires) {
  var circuits = [],
      addToCircuit, wire, testWire, i, j, numWires, inputs, outputs;

  addToCircuit = function (wire) {
    (wire.source.inputMode ? inputs : outputs).push(wire.source);
    (wire.dest.inputMode ? inputs : outputs).push(wire.dest);
  };

  numWires = allWires.length;
  for (i = 0; i < numWires; i++) {
    wire = allWires[i];
    inputs = [];
    outputs = [];
    addToCircuit(wire);

    for (j = i + 1; j < numWires; j++) {
      testWire = allWires[j];
      if ((wire.source == testWire.source) || (wire.source == testWire.dest) || (wire.dest == testWire.source) || (wire.dest == testWire.dest)) {
        addToCircuit(testWire);
      }
    }

    if (inputs.length + outputs.length > 0) {
      circuits.push(new Circuit({
        inputs: inputs,
        outputs: outputs
      }));
    }
  }

  return circuits;
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
