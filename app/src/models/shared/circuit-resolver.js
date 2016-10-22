var Circuit = require("./circuit"),
    Connector = require("./connector"),
    Wire = require("./wire");

var CircuitResolver = function (options) {
  this.boards = options.boards || [];
  this.circuits = [];
  this.components = [];

  // wire the global i/o up
  this.input = options.numInputs > 0 ? new Connector({type: 'input', count: options.numInputs}) : null;
  this.output = options.numOutputs > 0 ? new Connector({type: 'output', count: options.numOutputs}) : null;
};
CircuitResolver.prototype.rewire = function () {
  var graph = {},
      isBusHole, addToGraph, addToCircuit;

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

  // clear the existing circuits
  this.circuits = [];

  // create a graph of all the wire end points
  this.forEach(this.boards, function (board) {
    this.forEach(board.wires, function (wire) {
      var sourceOnBus = isBusHole(wire.source),
          destOnBus = isBusHole(wire.dest);

      addToGraph(wire.source, wire.dest, wire);
      addToGraph(wire.dest, wire.source, wire);

      // create the bus ghost wires
      if (sourceOnBus || destOnBus) {
        this.forEach(this.boards, function (otherBoard) {
          var busWire;

          if (board != otherBoard) {
            busWire = new Wire({
              source: sourceOnBus ? otherBoard.connectors.bus.holes[wire.source.index] : wire.source,
              dest: destOnBus ? otherBoard.connectors.bus.holes[wire.dest.index] : wire.dest
            });
            addToGraph(busWire.source, busWire.dest, busWire);
            addToGraph(busWire.dest, busWire.source, busWire);
          }
        });
      }
    });
  });

  // search the graph to find all circuits
  this.forEach(Object.keys(graph), function (key) {
    var circuit;
    if (!graph[key].visited) {
      circuit = new Circuit({inputs: [], outputs: []});
      this.circuits.push(circuit);
      addToCircuit(key, circuit);
    }
  });

  // resolve all the circuits
  this.resolve();
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
CircuitResolver.prototype.resolveCircuitInputVoltages = function () {
  this.forEach(this.circuits, function (circuit) {
    circuit.resolveInputVoltages();
  });
};
CircuitResolver.prototype.resolveComponentOutputVoltages = function () {
  this.forEach(this.components, function (component) {
    component.resolveOutputVoltages();
  });
};
CircuitResolver.prototype.resolveCircuitOutputVoltages = function () {
  this.forEach(this.circuits, function (circuit) {
    circuit.resolveOutputVoltages();
  });
};
CircuitResolver.prototype.resolve = function () {
  this.forEach(this.components, function () {
    this.resolveCircuitInputVoltages();
    this.resolveComponentOutputVoltages();
    this.resolveCircuitOutputVoltages();
  });
};


module.exports = CircuitResolver;
