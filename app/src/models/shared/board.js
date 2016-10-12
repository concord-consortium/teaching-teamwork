var Hole = require('./hole'),
    Pin = require('./pin'),
    Wire = require('./wire'),
    Circuit = require('./circuit'),
    LogicChip =  require('../logic-gates/logic-chip');

var Board = function (options) {
  this.number = options.number;
  this.components = options.components;
  this.connectors = options.connectors;
  this.bezierReflectionModifier = options.bezierReflectionModifier;
  this.logicDrawer = options.logicDrawer;
  this.wires = [];
  this.circuits = [];
  this.allBoards = [];
  this.fixedComponents = options.fixedComponents || false;
  this.updateComponentList();

  // reset the pic so the pin output is set
  if (this.components.pic) {
    this.components.pic.reset();
  }
};
Board.prototype.updateComponentList = function () {
  var self = this,
      i, name;

  this.pinsAndHoles = [];
  this.componentList = [];
  this.numComponents = 0;

  for (name in this.components) {
    if (this.components.hasOwnProperty(name)) {
      this.componentList.push(this.components[name]);
      this.numComponents++;
      for (i = 0; i < this.components[name].pins.length; i++) {
        this.pinsAndHoles.push(this.components[name].pins[i]);
      }
      this.components[name].board = this;
    }
  }
  $.each(this.connectors, function (name, connector) {
    if (connector) {
      for (var i = 0; i < connector.holes.length; i++) {
        self.pinsAndHoles.push(connector.holes[i]);
      }
    }
  });
};
Board.prototype.clear = function () {
  var i;
  this.wires = [];
  this.circuits = [];
  if (!this.fixedComponents) {
    this.components = {};
    this.updateComponentList();
  }
  this.reset();
  for (i = 0; i < this.pinsAndHoles.length; i++) {
    this.pinsAndHoles[i].connected = false;
  }
};
Board.prototype.reset = function () {
  var i;
  for (i = 0; i < this.pinsAndHoles.length; i++) {
    this.pinsAndHoles[i].reset();
  }
  for (i = 0; i < this.componentList.length; i++) {
    this.componentList[i].reset();
  }
};
Board.prototype.updateWires = function (newSerializedWires) {
  var toRemove = [],
      currentSerializedWires, i, index, endpoints;

  // quick check to see if there are changes
  currentSerializedWires = this.serializeWiresToArray();
  if (JSON.stringify(newSerializedWires) == JSON.stringify(currentSerializedWires)) {
    return;
  }

  // compare the current wires with the new wires
  for (i = 0; i < currentSerializedWires.length; i++) {
    index = newSerializedWires.indexOf(currentSerializedWires[i]);
    if (index === -1) {
      // in current but not in new so remove
      toRemove.push(currentSerializedWires[i]);
    }
    else {
      // in both so delete from new
      newSerializedWires.splice(index, 1);
    }
  }

  // now toRemove contains wires to remove and newSerializedWires contains wires to add
  for (i = 0; i < toRemove.length; i++) {
    endpoints = this.findSerializedWireEndpoints(toRemove[i]);
    if (endpoints.source && endpoints.dest) {
      this.removeWire(endpoints.source, endpoints.dest);
    }
  }
  for (i = 0; i < newSerializedWires.length; i++) {
    endpoints = this.findSerializedWireEndpoints(newSerializedWires[i]);
    if (endpoints.source && endpoints.dest) {
      this.addWire(endpoints.source, endpoints.dest, endpoints.color);
    }
  }
};
Board.prototype.serializeWiresToArray = function () {
  var serialized = [],
      i;
  for (i = 0; i < this.wires.length; i++) {
    serialized.push(this.wires[i].id);
  }
  return serialized;
};
Board.prototype.findSerializedWireEndpoints = function (serializedWire) {
  var self = this,
      parts = serializedWire.split(','),
      findEndpoint = function (parts) {
        var type = parts[0],
            instance = parts[1] || '',
            index = parseInt(parts[2] || '0', 10),
            endpoint = null;
        if ((type == 'connector') && self.connectors[instance]) {
          endpoint = self.connectors[instance].holes[index];
        }
        else if ((type == 'component') && self.components[instance]) {
          endpoint = self.components[instance].pins[index];
        }
        return endpoint;
      };

  return {
    source: findEndpoint(parts[0].split(':')),
    dest: findEndpoint((parts[1] || '').split(':')),
    color: parts[2] || ''
  };
};
Board.prototype.serializeEndpoint = function (endPoint, label) {
  var serialized;
  if (endPoint instanceof Hole) {
    serialized = {
      connector: endPoint.connector.type,
      hole: {
        index: endPoint.index,
        color: endPoint.color
      }
    };
    serialized[label] = 'hole';
  }
  else if (endPoint instanceof Pin) {
    serialized = {
      component: endPoint.component.name,
      pin: {
        index: endPoint.number,
        name: endPoint.label.text
      }
    };
    serialized[label] = 'pin';
  }
  else {
    serialized = {};
  }
  serialized.board = this.number;
  return serialized;
};
Board.prototype.removeWire = function (source, dest) {
  var numSourceConnections = 0,
      numDestConnections = 0,
      i;

  // determine the number of wires connected at the source and dest endpoints
  for (i = 0; i < this.wires.length; i++) {
    if (this.wires[i].source == source) {
      numSourceConnections++;
    }
    if (this.wires[i].dest == dest) {
      numDestConnections++;
    }
  }

  for (i = 0; i < this.wires.length; i++) {
    if (this.wires[i].connects(source, dest)) {
      // set as disconnected if this is the only wire connected to the endpoint
      this.wires[i].source.connected = (numSourceConnections > 1);
      this.wires[i].dest.connected = (numDestConnections > 1);
      if (this.wires[i].source.inputMode) {
        this.wires[i].source.reset();
      }
      if (this.wires[i].dest.inputMode) {
        this.wires[i].dest.reset();
      }
      this.wires.splice(i, 1);
      this.resolveCircuitsAcrossAllBoards();
      return true;
    }
  }
  return false;
};
Board.prototype.addWire = function (source, dest, color) {
  var i, id, wire;

  if (!source || !dest) {
    return null;
  }
  /*
  if ((source.connector && dest.connector) && (source.connector === dest.connector)) {
    alert("Sorry, you can't wire connectors to themselves.");
    return false;
  }
  if (source.component === dest.component) {
    alert("Sorry, you can't wire a component's pin to the same component.");
    return false;
  }
  */
  if (source.notConnectable || dest.notConnectable) {
    alert("Sorry, you can't add a wire to the " + (source.notConnectable ? source.label.text : dest.label.text) + ' pin.  It is already connected to a breadboard component.');
    return null;
  }

  // don't allow duplicate wires
  id = Wire.GenerateId(source, dest, color);
  for (i = 0; i < this.wires.length; i++) {
    if (this.wires[i].id === id) {
      return null;
    }
  }

  wire = new Wire({
    source: source,
    dest: dest,
    color: '#00f' // color used to be settable but is now forced to blue
  });
  this.wires.push(wire);
  if (!this.resolveCircuits()) {
    this.wires.pop();
    return null;
  }
  source.connected = true;
  dest.connected = true;
  return wire;
};
Board.prototype.resolveCircuits = function() {
  var newCircuits;

  if (this.wires.length === 0) {
    this.circuits = [];
    return true;
  }

  newCircuits = Circuit.ResolveWires(this.wires);
  if (newCircuits) {
    this.circuits = newCircuits;
    return true;
  }

  return false;
};
Board.prototype.resolveCircuitsAcrossAllBoards = function() {
  var i;
  // reset and resolve all the circuits first
  for (i = 0; i < this.allBoards.length; i++) {
    this.allBoards[i].reset();
    this.allBoards[i].resolveCircuits();
  }
  // and then resolve all the io values
  for (i = 0; i < this.allBoards.length; i++) {
    this.allBoards[i].resolveIOVoltages();
  }
};
Board.prototype.resolveCircuitInputVoltages = function () {
  var i;
  if (this.connectors.input) {
    this.connectors.input.updateFromConnectedBoard();
  }
  for (i = 0; i < this.circuits.length; i++) {
    this.circuits[i].resolveInputVoltages();
  }
};
Board.prototype.resolveComponentOutputVoltages = function () {
  var i;
  for (i = 0; i < this.componentList.length; i++) {
    this.componentList[i].resolveOutputVoltages();
  }
};
Board.prototype.resolveCircuitOutputVoltages = function () {
  var i;
  for (i = 0; i < this.circuits.length; i++) {
    this.circuits[i].resolveOutputVoltages();
  }
};
Board.prototype.resolveIOVoltagesAcrossAllBoards = function() {
  var i;
  for (i = 0; i < this.allBoards.length; i++) {
    this.allBoards[i].resolveIOVoltages();
  }
};
Board.prototype.resolveIOVoltages = function () {
  this.resolveCircuitInputVoltages();
  this.resolveComponentOutputVoltages();
  this.resolveCircuitOutputVoltages();
  // this final call is to set the output connector values
  this.resolveCircuitInputVoltages();
};
Board.prototype.addComponent = function (name, component) {
  component.name = name;
  this.components[name] = component;
  this.updateComponentList();
};
Board.prototype.removeComponent = function (component) {
  delete this.components[component.name];
  this.updateComponentList();
};
Board.prototype.setConnectors = function (connectors) {
  this.connectors = connectors;
  this.updateComponentList();
};
Board.prototype.serializeComponents = function () {
  var serialized = {};
  $.each(this.components, function (name, component) {
    serialized[name] = component.serialize ? component.serialize() : {};
  });
  return serialized;
};
Board.prototype.updateComponents = function (newSerializedComponents) {
  var self = this,
      toRemove = [],
      wiresToRemove = [],
      currentSerializedComponents, i, j, name, component, wire;

  // quick check to see if there are changes
  currentSerializedComponents = this.serializeComponents();
  if (JSON.stringify(newSerializedComponents) == JSON.stringify(currentSerializedComponents)) {
    return;
  }

  // compare the current components with the new components
  $.each(currentSerializedComponents, function (name) {
    if (newSerializedComponents[name]) {
      self.components[name].position.x = newSerializedComponents[name].x;
      self.components[name].position.y = newSerializedComponents[name].y;

      // in both so delete from new
      delete newSerializedComponents[name];
    }
    else {
      toRemove.push(name);
    }
  });

  // now toRemove contains components to remove and newSerializedComponents contains components to add
  for (i = 0; i < toRemove.length; i++) {

    name = toRemove[i];
    component = this.components[name];

    for (j = 0; j < this.wires.length; j++) {
      wire = this.wires[j];
      if ((wire.source.component == component) || (wire.dest.component == component)) {
        // this is pushed instead of directly removed because this.removeWire() alters this.wires and we are looping over it here
        wiresToRemove.push(wire);
      }
    }
    for (j = 0; j < wiresToRemove.length; j++) {
      wire = wiresToRemove[j];
      this.removeWire(wire.source, wire.dest);
    }

    delete this.components[name];
  }
  $.each(newSerializedComponents, function (name, serializeComponent) {
    var component;

    if (serializeComponent.type == 'logic-chip') {
      component = new LogicChip({type: serializeComponent.chipType, layout: {x: serializeComponent.x, y: serializeComponent.y}});
      self.addComponent(name, component);
    }
  });

  this.updateComponentList();
};

module.exports = Board;
