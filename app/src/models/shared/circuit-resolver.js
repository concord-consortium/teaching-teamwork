var Circuit = require("./circuit"),
    Connector = require("./connector"),
    Wire = require("./wire");

var CircuitResolver = function (options) {
  var i;

  this.boards = options.boards || [];
  this.circuits = [];
  this.components = [];
  this.busSize = options.busSize || 0;
  this.busInputSize = options.busInputSize || 0;
  this.busOutputSize = options.busOutputSize || 0;
  this.busOutputStartIndex = this.busSize - this.busOutputSize;
  this.runner = options.runner || null;

  this.numWires = 0;

  // wire the global i/o up
  this.input = options.busInputSize > 0 ? new Connector({type: 'input', count: options.busInputSize}) : null;
  this.output = options.busOutputSize > 0 ? new Connector({type: 'output', count: options.busOutputSize}) : null;

  this.inputIndices = [];
  this.outputIndices = [];
  for (i = 0; i < this.busInputSize; i++) {
    this.inputIndices.push(i);
  }
  for (i = this.busOutputStartIndex; i < this.busSize; i++) {
    this.outputIndices.push(i);
  }
};

CircuitResolver.prototype.rewire = function (includeGlobalIO) {
  var graph = {},
      isBusHole, addToGraph, addToCircuit, addBusWire;

  isBusHole = function (endPoint) {
    return endPoint.connector && (endPoint.connector.type == 'bus');
  };

  addToGraph = function (source, dest, wire) {
    var key = source.toString();
    if (!graph[key]) {
      graph[key] = {
        endPoint: source,
        adjacent: [],
        visited: false
      };
    }
    graph[key].adjacent.push({endPoint: dest, wire: wire});
  };

  addToCircuit = function (key, circuit) {
    var node = graph[key],
        i, adjacent, adjacentKey;

    node.visited = true;
    (node.endPoint.inputMode ? circuit.inputs : circuit.outputs).push(node.endPoint);
    for (i = 0; i < node.adjacent.length; i++) {
      adjacent = node.adjacent[i];
      adjacentKey = adjacent.endPoint.toString();
      if (!graph[adjacentKey].visited) {
        addToCircuit(adjacentKey, circuit);
      }
    }
  };

  addBusWire = function (options) {
    var busWire = new Wire({
      source: options.source,
      dest: options.dest
    });
    addToGraph(busWire.source, busWire.dest, busWire);
    addToGraph(busWire.dest, busWire.source, busWire);
  };

  // clear the existing circuits
  this.numWires = 0;
  this.circuits = [];

  // create a graph of all the wire end points
  this.forEach(this.boards, function (board) {
    this.forEach(board.wires, function (wire) {
      var sourceOnBus = isBusHole(wire.source),
          destOnBus = isBusHole(wire.dest),
          sourceIsGlobalInput = sourceOnBus && (this.inputIndices.indexOf(wire.source.index) != -1),
          sourceIsGlobalOutput = sourceOnBus && (this.outputIndices.indexOf(wire.source.index) != -1),
          destIsGlobalInput = destOnBus && (this.inputIndices.indexOf(wire.dest.index) != -1),
          destIsGlobalOutput = destOnBus && (this.outputIndices.indexOf(wire.dest.index) != -1);

      this.numWires++;

      addToGraph(wire.source, wire.dest, wire);
      addToGraph(wire.dest, wire.source, wire);

      // create the bus ghost wires
      if (sourceOnBus || destOnBus) {
        this.forEach(this.boards, function (otherBoard) {
          // wire this board to the other boards
          if (board != otherBoard) {
            addBusWire({
              source: sourceOnBus ? otherBoard.connectors.bus.holes[wire.source.index] : wire.source,
              dest: destOnBus ? otherBoard.connectors.bus.holes[wire.dest.index] : wire.dest
            });
            this.numWires++;
          }

          // wire this board to the global i/o
          if (includeGlobalIO && (sourceIsGlobalInput || sourceIsGlobalOutput || destIsGlobalInput || destIsGlobalOutput)) {
            addBusWire({
              source: sourceIsGlobalInput ? this.input.holes[wire.source.index] : (sourceIsGlobalOutput ? this.output.holes[wire.source.index - this.busOutputStartIndex] : wire.source),
              dest: destIsGlobalInput ? this.input.holes[wire.dest.index] : (destIsGlobalOutput ? this.output.holes[wire.dest.index - this.busOutputStartIndex] : wire.dest)
            });
            this.numWires++;
          }
        });
      }
    });
  });

  // search the graph to find all circuits
  this.forEach(Object.keys(graph), function (key) {
    var circuit;
    if (!graph[key].visited) {
      circuit = new Circuit({inputs: [], outputs: [], id: this.circuits.length + 1});
      this.circuits.push(circuit);
      addToCircuit(key, circuit);
    }
  });

  // resolve all the circuits
  this.resolve(true);
};

CircuitResolver.prototype.forEach = function(list, fn) {
  var i;
  for (i = 0; i < list.length; i++) {
    fn.call(this, list[i], i);
  }
};

CircuitResolver.prototype.updateComponents = function () {
  this.components = [];
  this.forEach(this.boards, function (board) {
    this.forEach(board.componentList, function (component) {
      this.components.push(component);
    });
  });
};

CircuitResolver.prototype.resolveComponentOutputVoltages = function (inputState) {
  this.forEach(this.components, function (component) {
    component.resolveOutputVoltages(inputState);
  });
};

CircuitResolver.prototype.getCircuitInputVoltages = function () {
  var inputVoltages = {};
  this.forEach(this.circuits, function (circuit) {
    circuit.getInputVoltages(inputVoltages);
  });
  return inputVoltages;
};

CircuitResolver.prototype.getCircuitOutputVoltages = function () {
  var outputVoltages = {};
  this.forEach(this.circuits, function (circuit) {
    circuit.getOutputVoltages(outputVoltages);
  });
  return outputVoltages;
};

CircuitResolver.prototype.resolveCircuitOutput = function (circuit) {
  circuit.resolveOutputVoltages();
};

CircuitResolver.prototype.resolveCircuitInput = function (circuit) {
  circuit.resolveInputVoltages();
};

CircuitResolver.prototype.resolve = function (resolveUntilStable, callback) {
  var resolveComponentOutput = function (component) { component.resolveOutputVoltages(initialInputVoltages); },
      stable = false,
      i, initialOutputVoltages, initialInputVoltages, finalOutputVoltages, finalInputVoltages;

  // halt the runner
  if (this.runner) {
    this.runner(false);
  }

  // the numWires max is just a hueristic before giving up looping in the UI thread
  // and moving to a setTimeout resolution loop so we don't lock up the UI
  for (i = 0; i < this.numWires; i++) {

    // resolve each circuits inputs voltage
    this.forEach(this.circuits, this.resolveCircuitInput);

    // get the initial output voltages to test is the circuits changed
    initialOutputVoltages = this.getCircuitOutputVoltages();

    // get the initial input voltages to pass to resolveComponentOutput()
    initialInputVoltages = this.getCircuitInputVoltages();

    // resolve each component with the initial input voltages
    this.forEach(this.components, resolveComponentOutput);

    // resolve each circuits output voltages
    this.forEach(this.circuits, this.resolveCircuitOutput);

    // get the final output voltages
    finalOutputVoltages = this.getCircuitOutputVoltages();

    // resolve each circuits inputs voltage
    this.forEach(this.circuits, this.resolveCircuitInput);

    // get the final input voltages to test for stablity
    finalInputVoltages = this.getCircuitInputVoltages();

    // check if the circuit changed
    stable = (JSON.stringify(initialInputVoltages) === JSON.stringify(finalInputVoltages)) && (JSON.stringify(initialOutputVoltages) === JSON.stringify(finalOutputVoltages));

    // break out if we aren't waiting for it to be stablized or it has stablized
    if (!resolveUntilStable || stable) {
      break;
    }
  }

  if (callback) {
    callback(stable);
  }
  else if (resolveUntilStable && !stable && this.runner) {
    this.runner(true);
  }
};

module.exports = CircuitResolver;
