(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*

  Teaching Teamwork PIC Demo

  This file along with the data/pic-code.js file contains all the code for the PIC demo.  When the demo is
  expanded to a working collaborative environment the components and component state models should probably
  be split into different files for ease of maintanence.

  The app is split into two parts: 1) React components that render 2) component state models.  The state
  models are named Foo with a corresponing React component of FooView.  By splitting the state into
  seperate models an efficent data structure for simulation can be maintained alongside the
  React component tree.

*/

var picCode = require('./data/pic-code'),
    logController = require('./controllers/log'),
    userController = require('./controllers/user'),
    div = React.DOM.div,
    span = React.DOM.span,
    svg = React.DOM.svg,
    rect = React.DOM.rect,
    line = React.DOM.line,
    circle = React.DOM.circle,
    text = React.DOM.text,
    path = React.DOM.path,
    button = React.DOM.button,
    g = React.DOM.g,
    b = React.DOM.b,
    form = React.DOM.form,
    textarea = React.DOM.textarea,
    br = React.DOM.br,
    h1 = React.DOM.h1,
    h2 = React.DOM.h2,
    WORKSPACE_HEIGHT = 768,
    WORKSPACE_WIDTH = 936 - 200,
    RIBBON_HEIGHT = 21,
    SELECTED_FILL = '#bbb',
    UNSELECTED_FILL = '#777',

    MOVED_PROBE_EVENT = 'Moved probe',
    PUSHED_BUTTON_EVENT = 'Pushed button',
    ADD_WIRE_EVENT = 'Add wire',
    REMOVE_WIRE_EVENT = 'Remove wire',
    OPENED_BOARD_EVENT = 'Opened board',
    CLOSED_BOARD_EVENT = 'Closed board',
    RUN_EVENT = 'Run',
    STOP_EVENT = 'Stop',
    STEP_EVENT = 'Step',
    RESET_EVENT = 'Reset',

    AppView, WeGotIt, WeGotItPopup, SidebarChatView, WorkspaceView, BoardView, Board, RibbonView, ConnectorView,
    Keypad, LED, PIC, Connector, KeypadView, LEDView, PICView,
    ConnectorHoleView, Hole, Pin, PinView,
    BoardEditorView, SimulatorControlView, Wire, Button, ButtonView, Segment, Circuit, DemoControlView, ChatItem, ChatItems, ProbeView, BoardWatcher, boardWatcher, WireView;

//
// Helper functions
//

function logEvent(eventName, value, parameters) {
  var loggedValue = null,
      loggedParameters = null;

  if (eventName === MOVED_PROBE_EVENT) {
    loggedParameters = parameters.board.serializeEndpoint(value, 'to');
    boardWatcher.movedProbe(parameters.board, loggedParameters);
  }
  else if (eventName == PUSHED_BUTTON_EVENT) {
    loggedValue = value.value;
    loggedParameters = {
      board: value.component.board.number
    };
    boardWatcher.pushedButton(parameters.board, value.value);
  }
  else if (eventName == ADD_WIRE_EVENT) {
    loggedParameters = {
      source: parameters.board.serializeEndpoint(parameters.source, 'type'),
      dest: parameters.board.serializeEndpoint(parameters.dest, 'type')
    };
    boardWatcher.circuitChanged(parameters.board);
  }
  else if (eventName == REMOVE_WIRE_EVENT) {
    loggedParameters = {
      source: parameters.board.serializeEndpoint(parameters.source, 'type')
    };
    boardWatcher.circuitChanged(parameters.board);
  }
  else {
    // log the raw event value and parameters
    logController.logEvent(eventName, value, parameters);
    return;
  }

  logController.logEvent(eventName, loggedValue, loggedParameters);
}

function createComponent(def) {
  return React.createFactory(React.createClass(def));
}

function selectedConstants(selected) {
  var boardHeight;

  if (selected) {
    boardHeight = WORKSPACE_HEIGHT * 0.5;
    return {
      WIRE_WIDTH: 3,
      FOO_WIRE_WIDTH: 1,
      CONNECTOR_HOLE_DIAMETER: 15,
      CONNECTOR_HOLE_MARGIN: 4,
      BOARD_HEIGHT: boardHeight,
      COMPONENT_WIDTH: boardHeight * 0.5,
      COMPONENT_HEIGHT: boardHeight * 0.5,
      COMPONENT_SPACING: boardHeight * 0.5,
      PIC_FONT_SIZE: 12,
      BUTTON_FONT_SIZE: 16,
      PIN_WIDTH: 13.72,
      PIN_HEIGHT: 13.72,
      PROBE_WIDTH: 150,
      PROBE_NEEDLE_HEIGHT: 5,
      PROBE_HEIGHT: 20,
      PROBE_MARGIN: 10
    };
  }
  else {
    boardHeight = (WORKSPACE_HEIGHT - (2 * RIBBON_HEIGHT)) / 3;
    return {
      WIRE_WIDTH: 2,
      FOO_WIRE_WIDTH: 1,
      CONNECTOR_HOLE_DIAMETER: 10,
      CONNECTOR_HOLE_MARGIN: 3,
      BOARD_HEIGHT: boardHeight,
      COMPONENT_WIDTH: boardHeight * 0.5,
      COMPONENT_HEIGHT: boardHeight * 0.5,
      COMPONENT_SPACING: boardHeight * 0.5,
      PIC_FONT_SIZE: 8,
      BUTTON_FONT_SIZE: 13,
      PIN_WIDTH: 8.64,
      PIN_HEIGHT: 8.64,
      PROBE_WIDTH: 95,
      PROBE_NEEDLE_HEIGHT: 3,
      PROBE_HEIGHT: 12,
      PROBE_MARGIN: 10
    };
  }
}

function getBezierPath(options) {
  var firstPointIsLowest, lowest, highest, midX, midY, perpSlope, x3, y3, reflection;

  firstPointIsLowest = options.y1 > options.y2;
  lowest = {x: firstPointIsLowest ? options.x1 : options.x2, y: firstPointIsLowest ? options.y1: options.y2};
  highest = {x: firstPointIsLowest ? options.x2 : options.x1, y: firstPointIsLowest ? options.y2 : options.y1};

  midX = (lowest.x + highest.x) / 2;
  midY = (lowest.y + highest.y) / 2;
  perpSlope = (lowest.x - highest.x) / (highest.y - lowest.y);
  if (!isFinite(perpSlope)) {
    perpSlope = 1;
  }
  reflection = highest.x >= lowest.x ? options.reflection : -options.reflection;

  x3 = midX + (Math.cos(perpSlope) * 100 * reflection);
  y3 = midY + (Math.sin(perpSlope) * 100 * reflection);

  return ['M', options.x1, ',', options.y1, ' Q', x3, ',', y3, ' ', options.x2, ',', options.y2].join('');
}

function calculateComponentRect(selected, index, count, componentWidth, componentHeight) {

  var constants = selectedConstants(selected),
      startX, position;

  componentWidth = componentWidth || constants.COMPONENT_WIDTH;
  componentHeight = componentHeight || constants.COMPONENT_HEIGHT;

  startX = (WORKSPACE_WIDTH - (count * componentWidth) - ((count - 1) * constants.COMPONENT_SPACING)) / 2;

  position = {
    x: startX + (index * (componentWidth + constants.COMPONENT_SPACING)),
    y: ((constants.BOARD_HEIGHT - componentHeight) / 2),
    width: componentWidth,
    height: componentHeight
  };

  return position;
}

//
// Board Watcher (using Firebase)
//
BoardWatcher = function () {
  this.firebase = null;
  this.listeners = {};
};
BoardWatcher.prototype.startListeners = function () {
  var self = this,
      listenerCallbackFn = function (boardNumber) {
        return function (snapshot) {
          var i;
          if (self.listeners[boardNumber]) {
            for (i = 0; i < self.listeners[boardNumber].length; i++) {
              self.listeners[boardNumber][i].listener(self.listeners[boardNumber][i].board, snapshot.val());
            }
          }
        };
      };

  this.firebase = userController.getFirebaseGroupRef().child('clients');
  this.firebase.child(0).on('value', listenerCallbackFn(0));
  this.firebase.child(1).on('value', listenerCallbackFn(1));
  this.firebase.child(2).on('value', listenerCallbackFn(2));
};
BoardWatcher.prototype.movedProbe = function (board, probeInfo) {
  this.firebase.child(board.number).child('probe').set(probeInfo);
};
BoardWatcher.prototype.pushedButton = function (board, buttonValue) {
  this.firebase.child(board.number).child('button').set(buttonValue);
};
BoardWatcher.prototype.circuitChanged = function (board) {
  this.firebase.child(board.number).child('wires').set(board.serializeWiresToArray());
};
BoardWatcher.prototype.addListener = function (board, listener) {
  this.listeners[board.number] = this.listeners[board.number] || [];
  this.listeners[board.number].push({
    board: board,
    listener: listener
  });
};
BoardWatcher.prototype.removeListener = function (board, listener) {
  var listeners = this.listeners[board.number] || [],
      newListeners = [],
      i;
  for (i = 0; i < listeners.length; i++) {
    if (listeners[i].listener !== listener) {
      newListeners.push(listeners[i]);
    }
  }
  this.listeners[board.number] = newListeners;
};

//
// State models
//

Wire = function (options) {
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

Circuit = function (options) {
  this.source = options.source;
  this.dest = options.dest;
};
Circuit.ResolveWires = function (wires) {
  var circuits = [],
      wire, i, source, dest;

  for (i = 0; i < wires.length; i++) {
    wire = wires[i];

    source = Circuit.FindTerminal(wire, wire.source);
    dest = Circuit.FindTerminal(wire, wire.dest);
    if ((source === 'circular') || (dest === 'circular')) {
      alert('A circular wire graph was found.  Aborting!');
      return false;
    }
    circuits.push(new Circuit({
      source: source,
      dest: dest
    }));
  }
  return circuits;
};
Circuit.FindTerminal = function (wire, pinOrHole) {
  var terminal = pinOrHole,
      foundWire = true,
      otherConnector, otherHole, otherWire, i;

  while (terminal.connector && foundWire) {
    otherConnector = terminal.connector.connectsTo;
    otherHole = otherConnector.holes[terminal.index];

    foundWire = false;
    for (i = 0; i < otherConnector.board.wires.length; i++) {
      otherWire = otherConnector.board.wires[i];
      if (otherWire === wire) {
        return 'circular';
      }
      if ((otherWire.source === otherHole) || (otherWire.dest === otherHole)) {
        terminal = otherWire.source === otherHole ? otherWire.dest : otherWire.source;
        foundWire = true;
        break;
      }
    }
  }

  return terminal;
};

Circuit.prototype.resolveInputValues = function () {
  var input = null,
      output = null;

  if (this.source.isPin && this.dest.isPin) {
    if (this.source.inputMode && !this.dest.inputMode) {
      input = this.source;
      output = this.dest;
    }
    else if (!this.source.inputMode && this.dest.inputMode) {
      input = this.dest;
      output = this.source;
    }
  }
  else if (this.source.isPin && !this.source.inputMode) {
    input = this.dest;
    output = this.source;
  }
  else if (this.dest.isPin && !this.dest.inputMode) {
    input = this.source;
    output = this.dest;
  }

  if (input && output) {
    input.setValue(output.value);
  }
};

Button = function (options) {
  this.value = options.value;
  this.intValue = options.intValue;
  this.x = options.x;
  this.y = options.y;
  this.cx = options.x + (options.width / 2);
  this.cy = options.y + (options.height / 2);
  this.height = options.height;
  this.width = options.width;
  this.labelSize = options.labelSize;
  this.label = options.label;
  this.component = options.component;
};

Segment = function (options) {
  this.index = options.index;
  this.layout = options.layout;
  this.component = options.component;
  this.pin = options.pin;
};

Pin = function (options) {
  this.board = options.component.board;
  this.isPin = true; // to allow for easy checks against holes in circuits
  this.inputMode = options.inputMode;
  this.placement = options.placement;
  this.number = options.number;
  this.x = options.x;
  this.y = options.y;
  this.cx = options.x + (options.width / 2);
  this.cy = options.y + (options.height / 2);
  this.height = options.height;
  this.width = options.width;
  this.labelSize = options.labelSize;
  this.label = options.label;
  this.component = options.component;
  this.bezierReflection = options.bezierReflection || 1;
  this.notConnectable = options.notConnectable || false;
  this.connected = options.connected || false;
  this.value = options.value || 0;
  this.startingValue = this.value;
};
Pin.prototype.getBezierReflection = function () {
  return this.bezierReflection;
};
Pin.prototype.setValue = function (newValue) {
  this.pulseProbeDuration = this.pulseProbeDuration || (newValue != this.value ? 1 : 0);
  this.value = newValue;
};
Pin.prototype.reset = function () {
  this.value = this.startingValue;
  this.pulseProbeDuration = 0;
};

Hole = function (options) {
  this.isPin = false; // to allow for easy checks against pins in circuits
  this.index = options.index;
  this.cx = options.cx;
  this.cy = options.cy;
  this.radius = options.radius;
  this.color = options.color;
  this.connector = options.connector;
  this.connected = options.connected || false;
  this.value = options.value || 0;
};
Hole.prototype.getBezierReflection = function () {
  return this.connector.type === 'input' ? 1 : -1;
};
Hole.prototype.setValue = function (newValue) {
  this.pulseProbeDuration = this.pulseProbeDuration || (newValue != this.value ? 1 : 0);
  this.value = newValue;
};
Hole.prototype.reset = function () {
  this.value = this.startingValue;
  this.pulseProbeDuration = 0;
};

Connector = function (options) {
  var self = this,
      i;

  this.type = options.type;
  this.count = options.count;
  this.position = {};

  this.holes = [];
  for (i = 0; i < this.count; i++) {
    this.holes.push(new Hole({
      index: i,
      x: 0,
      y: 0,
      radius: 0,
      color: ['blue', '#0f0', 'purple', '#cccc00'][i],
      connector: self
    }));
  }
};
Connector.prototype.calculatePosition = function (selected) {
  var constants = selectedConstants(selected),
      i, cx, cy, radius, holeWidth, hole;

  holeWidth = constants.CONNECTOR_HOLE_DIAMETER + (constants.CONNECTOR_HOLE_MARGIN * 2);
  this.position.width = holeWidth * this.count;
  this.position.height = holeWidth;
  this.position.x = (WORKSPACE_WIDTH - this.position.width) / 2;
  this.position.y = this.type === 'input' ? 0 : constants.BOARD_HEIGHT - this.position.height;

  radius = constants.CONNECTOR_HOLE_DIAMETER / 2;
  cy = this.type === 'input' ? this.position.y + constants.CONNECTOR_HOLE_MARGIN + radius : constants.BOARD_HEIGHT - (constants.CONNECTOR_HOLE_MARGIN + radius);
  cx = ((WORKSPACE_WIDTH - this.position.width) / 2) + (holeWidth / 2);

  for (i = 0; i < this.count; i++) {
    hole = this.holes[i];
    hole.cx = cx + (i * holeWidth);
    hole.cy = cy;
    hole.radius =  radius;
  }
};

Keypad = function () {
  var i, pin, button, values;

  this.name = 'keypad';
  this.view = KeypadView;

  this.pushedButton = null;

  this.pins = [];
  this.pinMap = {};
  for (i = 0; i < 7; i++) {
    pin = {
      number: i,
      inputMode: i > 2,
      placement: i < 3 ? 'top' : 'right',
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      labelSize: 0,
      component: this,
      bezierReflection: i < 3 ? -1 : 1 // the top pins should arc the opposite
    };
    pin.label = {
      x: 0,
      y: 0,
      anchor: 'end',
      //text: ['RB0', 'RB1', 'RB2', 'RB3', 'RB4', 'RB5', 'RB6'][i]
      text: ['COL0', 'COL1', 'COL2', 'ROW0', 'ROW1', 'ROW2', 'ROW3'][i]
    };
    pin = new Pin(pin);
    this.pins.push(pin);
    this.pinMap[pin.label.text] = pin;
  }

  values = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  this.buttons = [];
  for (i = 0; i < 12; i++) {
    button = {
      value: values[i],
      intValue: parseInt(values[i]),
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      labelSize: 0,
      component: this
    };
    button.label = {
      x: 0,
      y: 0,
      anchor: 'middle',
      text: values[i],
    };
    this.buttons.push(new Button(button));
  }
  this.bottomButtonValues = [this.buttons[9].value, this.buttons[10].value, this.buttons[11].value];

  this.listeners = [];
};
Keypad.prototype.calculatePosition = function (selected, index, count) {
  var constants = selectedConstants(selected),
      padWidth, padHeight, i, pin, j, button, buttonWidth, buttonHeight, buttonDX, buttonDY;

  this.position = calculateComponentRect(selected, index, count, constants.COMPONENT_WIDTH * 1.5, constants.COMPONENT_HEIGHT * 1.5);

  padWidth = this.position.width * 0.8;
  padHeight = this.position.height * 0.9;

  this.position.pad = {
    x: this.position.x + ((this.position.width - padWidth) / 2),
    y: this.position.y + ((this.position.height - padHeight) / 2),
    width: padWidth,
    height: padHeight
  };

  // buttons
  buttonWidth = padWidth / 5;
  buttonHeight = buttonWidth;
  buttonDX = (padWidth - (buttonWidth * 3)) / 4;
  buttonDY = (padHeight - (buttonHeight * 4)) / 5;

  for (i = 0; i < 3; i++) {
    for (j = 0; j < 4; j++) {
      button = this.buttons[(j * 3) + i];
      button.x = this.position.pad.x + buttonDX + (i * (buttonWidth + buttonDX));
      button.y = this.position.pad.y + buttonDY + (j * (buttonHeight + buttonDY));
      button.cx = button.x + (buttonWidth / 2);
      button.cy = button.y + (buttonHeight / 2);
      button.height = buttonWidth;
      button.width = buttonHeight;
      button.labelSize = constants.BUTTON_FONT_SIZE;
      button.label.x = (button.x + (buttonWidth / 2));
      button.label.y = (button.y + ((buttonHeight + constants.BUTTON_FONT_SIZE) / 2.25));
    }
  }

  // upper pins
  for (i = 0; i < 3; i++) {
    pin = this.pins[i];
    pin.x = this.buttons[i].cx - (constants.PIN_WIDTH / 2);
    pin.y = this.position.pad.y - constants.PIN_HEIGHT;
    pin.label.x = pin.x + (constants.PIN_WIDTH / 2);
    pin.label.y = this.position.pad.y - (1.5 * constants.PIC_FONT_SIZE);
    pin.label.anchor = 'middle';
  }

  // right side pins
  for (i = 3; i < this.pins.length; i++) {
    pin = this.pins[i];
    pin.x = this.position.pad.x + this.position.pad.width;
    pin.y = this.buttons[(i - 3) * 3].cy - (constants.PIN_HEIGHT / 2);
    pin.label.x = pin.x + (1.5  * constants.PIN_WIDTH);
    pin.label.y = pin.y + ((constants.PIN_HEIGHT + constants.PIC_FONT_SIZE) / 2.25);
    pin.label.anchor = 'start';
  }

  // update all pins
  for (i = 0; i < this.pins.length; i++) {
    pin = this.pins[i];
    pin.cx = pin.x + (constants.PIN_WIDTH / 2);
    pin.cy = pin.y + (constants.PIN_HEIGHT / 2);
    pin.width = constants.PIN_WIDTH;
    pin.height = constants.PIN_HEIGHT;
    pin.labelSize = constants.PIC_FONT_SIZE;
  }
};
Keypad.prototype.addListener = function (listener) {
  this.listeners.push(listener);
};
Keypad.prototype.removeListener = function (listener) {
  this.listeners.splice(this.listeners.indexOf(listener), 1);
};
Keypad.prototype.notify = function () {
  var i;
  for (i = 0; i < this.listeners.length; i++) {
    this.listeners[i](this);
  }
};
Keypad.prototype.reset = function () {
};
Keypad.prototype.pushButton = function (button, skipNotify) {
  this.pushedButton = button;
  if (!skipNotify) {
    this.notify();
  }
};
Keypad.prototype.selectButtonValue = function (value, skipNotify) {
  var self = this;
  $.each(this.buttons, function (index, button) {
    if (button.value == value) {
      self.pushButton(button, skipNotify);
      return false;
    }
  });
};
Keypad.prototype.getPushedButtonValue = function () {
  return this.pushedButton ? this.pushedButton.value : null;
};
Keypad.prototype.resolveOutputValues = function () {
  var colValue = 7,
      intValue, bottomButtonIndex;

  if (this.pushedButton) {
    intValue = this.pushedButton.intValue;
    bottomButtonIndex = this.bottomButtonValues.indexOf(this.pushedButton.value);

    if (!this.pinMap.ROW0.value && ((intValue >= 1) && (intValue <= 3))) {
      colValue = colValue & ~(1 << (intValue - 1));
    }
    else if (!this.pinMap.ROW1.value && ((intValue >= 4) && (intValue <= 6))) {
      colValue = colValue & ~(1 << (intValue - 4));
    }
    else if (!this.pinMap.ROW2.value && ((intValue >= 7) && (intValue <= 9))) {
      colValue = colValue & ~(1 << (intValue - 7));
    }
    else if (!this.pinMap.ROW3.value && (bottomButtonIndex !== -1)) {
      colValue = colValue & ~(1 << bottomButtonIndex);
    }
  }

  this.pinMap.COL0.setValue(colValue & 1 ? 1 : 0);
  this.pinMap.COL1.setValue(colValue & 2 ? 1 : 0);
  this.pinMap.COL2.setValue(colValue & 4 ? 1 : 0);
};

LED = function () {
  var i, pin, segmentLayoutMap, segment;

  this.name = 'led';
  this.view = LEDView;

  this.pins = [];
  this.pinMap = {};
  for (i = 0; i < 10; i++) {
    pin = {
      number: i,
      inputMode: true,
      placement: i < 5 ? 'top' : 'bottom',
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      labelSize: 0,
      component: this,
      notConnectable: [2, 7].indexOf(i) !== -1
    };
    pin.label = {
      x: 0,
      y: 0,
      anchor: 'end',
      text: ['g', 'f', 'ca', 'a', 'b', 'e', 'd', 'ca', 'c', 'DP'][i]
    };
    pin = new Pin(pin);
    this.pins.push(pin);
    this.pinMap[pin.label.text] = pin;
  }

  this.segments = [];
  segmentLayoutMap = [
    {x: 0, y: 0, rotation: 0},
    {x: 1, y: 0, rotation: 90},
    {x: 1, y: 1, rotation: 90},
    {x: 0, y: 2, rotation: 0},
    {x: 0, y: 1, rotation: 90},
    {x: 0, y: 0, rotation: 90},
    {x: 0, y: 1, rotation: 0}
  ];
  for (i = 0; i < 7; i++) {
    segment = {
      number: i,
      layout: segmentLayoutMap[i],
      component: this,
      pin: this.pinMap[['a', 'b', 'c', 'd', 'e', 'f', 'g', 'DP'][i]]
    };
    this.segments.push(new Segment(segment));
  }

  this.decimalPoint = {
    layout: {x: 1, y: 2}
  };
};
LED.prototype.calculatePosition = function (selected, index, count) {
  var constants = selectedConstants(selected),
      displayWidth, displayHeight, i, pin, pinDX, segmentWidth, segmentHeight, segment, pathCommands, endCapSize, p;

  this.position = calculateComponentRect(selected, index, count);

  displayWidth = this.position.width * 0.8;
  displayHeight = this.position.height * 0.9;

  this.position.display = {
    x: this.position.x + ((this.position.width - displayWidth) / 2),
    y: this.position.y + ((this.position.height - displayHeight) / 2),
    width: displayWidth,
    height: displayHeight
  };

  // pins
  pinDX = (this.position.display.width - (constants.PIN_WIDTH * 5)) / 6;
  for (i = 0; i < this.pins.length; i++) {
    pin = this.pins[i];
    pin.x = this.position.display.x + pinDX + ((i % (this.pins.length / 2)) * (constants.PIN_WIDTH + pinDX));
    pin.y = i < 5 ? this.position.display.y - constants.PIN_HEIGHT : this.position.display.y + this.position.display.height;
    pin.cx = pin.x + (constants.PIN_WIDTH / 2);
    pin.cy = pin.y + (constants.PIN_HEIGHT / 2);
    pin.width = constants.PIN_WIDTH;
    pin.height = constants.PIN_HEIGHT;
    pin.labelSize = constants.PIC_FONT_SIZE;
    pin.label.x = pin.x + (constants.PIN_WIDTH / 2);
    pin.label.y = i < 5 ? this.position.display.y + (1.5 * constants.PIC_FONT_SIZE) : this.position.display.y + this.position.display.height - (0.75 * constants.PIC_FONT_SIZE);
    pin.label.anchor = 'middle';
  }

  // segments
  segmentWidth = this.position.display.width / 3;
  segmentHeight = this.position.display.width / 12;
  p = this.position.segments = {
    x: this.position.display.x + ((this.position.display.width - segmentWidth) / 2),
    y: this.position.display.y + ((this.position.display.height - (segmentWidth * 2)) / 2) - (segmentHeight / 2), // y is rotated to width = height
    segmentWidth: segmentWidth,
    segmentHeight: segmentHeight
  };

  endCapSize = segmentHeight / 2;
  pathCommands = [
    'M', p.x, ',', p.y + endCapSize, ' ',
    'L', p.x + endCapSize, ',', p.y, ' ',
    'L', p.x + segmentWidth - endCapSize, ',', p.y, ' ',
    'L', p.x + segmentWidth, ',', p.y + endCapSize, ' ',
    'L', p.x + segmentWidth - endCapSize, ',', p.y + segmentHeight, ' ',
    'L', p.x + endCapSize, ',', p.y + segmentHeight, ' ',
    'L', p.x, ',', p.y + endCapSize, ' '
  ].join('');

  for (i = 0; i < this.segments.length; i++) {
    segment = this.segments[i];
    segment.transform = ['translate(', segment.layout.x * segmentWidth, ',', segment.layout.y * segmentWidth, ')'].join('');
    if (segment.layout.rotation) {
      segment.transform = [segment.transform, ' rotate(', segment.layout.rotation, ' ', this.position.segments.x, ' ', this.position.segments.y + (segmentHeight / 2), ')'].join('');
    }
    segment.pathCommands = pathCommands;
  }

  this.decimalPoint.cx = this.position.segments.x + segmentWidth + segmentHeight + endCapSize;
  this.decimalPoint.cy = this.position.segments.y + (2 * segmentWidth) + endCapSize;
  this.decimalPoint.radius = endCapSize;
};
LED.prototype.reset = function () {
  // nothing to do for LED
};
LED.prototype.resolveOutputValues = function () {
  // nothing to do for LED
};
LED.prototype.getPinBitField = function () {
  var bitfield = 0,
      i;
  for (i = 0; i < this.pins.length; i++) {
    bitfield = bitfield | ((this.pins[i].value ? 1 : 0) << i);
  }
  return bitfield;
};

PIC = function (options) {
  var i, pin, notConnectable;

  this.name = 'pic';
  this.view = PICView;
  this.board = options.board;

  this.pins = [];
  this.pinMap = {};
  for (i = 0; i < 18; i++) {
    notConnectable = [3, 4, 11, 12, 13].indexOf(i) !== -1;

    pin = {
      number: i,
      value: [3, 11, 12, 13].indexOf(i) !== -1 ? 1 : 0,
      inputMode: !notConnectable,
      placement: i < 9 ? 'left' : 'right',
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      labelSize: 0,
      component: this,
      notConnectable: notConnectable
    };
    pin.label = {
      x: 0,
      y: 0,
      anchor: 'end',
      text: ['RA2', 'RA3', 'RA4', 'MCL', 'GND', 'RB0', 'RB1', 'RB2', 'RB3', 'RA1', 'RA0', 'XTAL', 'XTAL', 'VCC', 'RB7', 'RB6', 'RB5', 'RB4'][i]
    };
    pin = new Pin(pin);
    this.pins.push(pin);
    this.pinMap[pin.label.text] = pin;
  }

  // in reverse order so we can scan it quickly in the getter/setter
  this.portAPins = [this.pinMap.RA0, this.pinMap.RA1, this.pinMap.RA2, this.pinMap.RA3, this.pinMap.RA4];
  this.portBPins = [this.pinMap.RB0, this.pinMap.RB1, this.pinMap.RB2, this.pinMap.RB3, this.pinMap.RB4, this.pinMap.RB5, this.pinMap.RB6, this.pinMap.RB7];

  this.ip = 0;
  this.code = options.code;
  this.emulator = options.code.js(this);
};
PIC.prototype.reset = function () {
  this.ip = 0;
  this.trisPortA(0xff);
  this.trisPortB(0xff);
  this.emulator.start();
};
PIC.prototype.calculatePosition = function (selected, index, count) {
  var constants = selectedConstants(selected),
      chipWidth, pinDY, i, j, pin, pinNumber;

  this.position = calculateComponentRect(selected, index, count);

  chipWidth = this.position.width / 2;

  this.position.chip = {
    x: this.position.x + (chipWidth / 2),
    y: this.position.y,
    width: chipWidth,
    height: this.position.height
  };

  pinDY = (this.position.chip.height - (constants.PIN_WIDTH * 9)) / 10;

  for (i = 0; i < 2; i++) {
    for (j = 0; j < 9; j++) {
      pinNumber = (i * 9) + j;
      pin = this.pins[pinNumber];
      pin.x = (this.position.chip.x - constants.PIN_WIDTH) + (i * (this.position.chip.width + constants.PIN_WIDTH));
      pin.y = this.position.chip.y + pinDY + (j * (constants.PIN_HEIGHT + pinDY));
      pin.cx = pin.x + (constants.PIN_WIDTH / 2);
      pin.cy = pin.y + (constants.PIN_HEIGHT / 2);
      pin.width = constants.PIN_WIDTH;
      pin.height = constants.PIN_HEIGHT;
      pin.labelSize = constants.PIC_FONT_SIZE;
      pin.label.x = pin.x + ((i ? -0.5 : 1.5) * constants.PIN_WIDTH);
      pin.label.y = pin.y + ((constants.PIN_HEIGHT + pin.labelSize) / 2.25);
      pin.label.anchor = i ? 'end' : 'start';
    }
  }
};
PIC.prototype.resolveOutputValues = function () {
  // nothing to do here for the pic
};
PIC.prototype.evaluateCurrentPICInstruction = function () {
  var restartLoop = false;
  if (this.ip < this.emulator.loop.length) {
    restartLoop = this.emulator.loop[this.ip]();
  }
  this.ip = restartLoop ? 0 : (this.ip + 1) % this.emulator.loop.length;
  return restartLoop;
};
PIC.prototype.evaluateRemainingPICInstructions = function () {
  var restartLoop = false;
  while (!restartLoop && (this.ip < this.emulator.loop.length)) {
    restartLoop = this.emulator.loop[this.ip]();
    this.ip++;
  }
  this.ip = 0;
};
PIC.prototype.trisPortA = function (mask) {
  this.setPinListInputMode(this.portAPins, mask);
};
PIC.prototype.trisPortB = function (mask) {
  this.setPinListInputMode(this.portBPins, mask);
};
PIC.prototype.getPortA = function () {
  return this.getPinListValue(this.portAPins);
};
PIC.prototype.getPortB = function () {
  return this.getPinListValue(this.portBPins);
};
PIC.prototype.setPortA = function (value) {
  this.setPinListValue(this.portAPins, value);
};
PIC.prototype.setPortB = function (value) {
  this.setPinListValue(this.portBPins, value);
};
PIC.prototype.getPinListValue = function (list) {
  var value = 0,
      i;

  // each get causes the board to resolve so that we have the most current value
  this.board.resolveComponentOutputValues();

  for (i = 0; i < list.length; i++) {
    value = value | ((list[i].inputMode && list[i].value ? 1 : 0) << i);
  }
  return value;
};
PIC.prototype.setPinListValue = function (list, value) {
  var i;
  for (i = 0; i < list.length; i++) {
    list[i].setValue(!list[i].inputMode && (value & (1 << i)) ? 1 : 0);
  }
  // each set causes the circuit to be resolved
  this.board.resolveIOValues();
};
PIC.prototype.setPinListInputMode = function (list, mask) {
  var i;
  for (i = 0; i < list.length; i++) {
    list[i].inputMode = !!(mask & (1 << i));
  }
  this.board.resolveIOValues();
};

Board = function (options) {
  var self = this,
      i;

  this.number = options.number;
  this.components = options.components;
  this.connectors = options.connectors;
  this.bezierReflectionModifier = options.bezierReflectionModifier;
  this.wires = [];
  this.circuits = [];

  this.pinsAndHoles = [];
  this.componentList = [];

  this.allBoards = [];

  this.numComponents = 0;
  for (var name in this.components) {
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
    for (var i = 0; i < connector.holes.length; i++) {
      self.pinsAndHoles.push(connector.holes[i]);
    }
  });

  // reset the pic so the pin output is set
  this.components.pic.reset();
};
Board.prototype.clear = function () {
  var i;
  this.wires = [];
  this.circuits = [];
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
  var i;

  for (i = 0; i < this.wires.length; i++) {
    if (this.wires[i].connects(source, dest)) {
      if (this.wires[i].source.inputMode) {
        this.wires[i].source.reset();
      }
      this.wires[i].source.connected = false;
      if (this.wires[i].dest.inputMode) {
        this.wires[i].dest.reset();
      }
      this.wires[i].dest.connected = false;
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
    color: color
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
    this.allBoards[i].resolveIOValues();
  }
};
Board.prototype.resolveCircuitInputValues = function () {
  var i;
  for (i = 0; i < this.circuits.length; i++) {
    this.circuits[i].resolveInputValues();
  }
};
Board.prototype.resolveComponentOutputValues = function () {
  var i;
  for (i = 0; i < this.componentList.length; i++) {
    this.componentList[i].resolveOutputValues();
  }
};
Board.prototype.resolveIOValues = function () {
  // first resolve the input into the components, then the component values and finally the output of the components
  this.resolveCircuitInputValues();
  this.resolveComponentOutputValues();
  this.resolveCircuitInputValues();
};

//
// React Components
//

KeypadView = createComponent({
  displayName: 'KeypadView',

  componentWillMount: function () {
    this.props.component.addListener(this.keypadChanged);
  },

  componentWillUnmount: function () {
    this.props.component.removeListener(this.keypadChanged);
  },

  keypadChanged: function (keypad) {
    this.setState({pushedButton: keypad.pushedButton});
  },

  getInitialState: function () {
    return {
      pushedButton: this.props.component.pushedButton
    };
  },

  pushButton: function (button) {
    if (this.props.editable) {
      this.props.component.pushButton(button);
      this.setState({pushedButton: this.props.component.pushedButton});
      logEvent(PUSHED_BUTTON_EVENT, button, {board: this.props.component.board});
    }
  },

  render: function () {
    var p = this.props.component.position,
        pins = [],
        buttons = [],
        i, pin, button;

    for (i = 0; i < this.props.component.pins.length; i++) {
      pin = this.props.component.pins[i];
      pins.push(PinView({key: 'pin' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
      pins.push(text({key: 'label' + i, x: pin.label.x, y: pin.label.y, fontSize: pin.labelSize, fill: '#333', style: {textAnchor: pin.label.anchor}}, pin.label.text));
    }

    for (i = 0; i < this.props.component.buttons.length; i++) {
      button = this.props.component.buttons[i];
      buttons.push(ButtonView({key: i, button: button, selected: this.props.selected, editable: this.props.editable, pushed: button === this.state.pushedButton, pushButton: this.pushButton}));
    }

    return g({},
      rect({x: p.pad.x, y: p.pad.y, width: p.pad.width, height: p.pad.height, fill: '#333'}),
      pins,
      buttons
    );
  }
});

LEDView = createComponent({
  displayName: 'LEDView',

  render: function () {
    var constants = selectedConstants(this.props.selected),
        p = this.props.component.position,
        decimalPoint = this.props.component.decimalPoint,
        pins = [],
        pin,
        segments = [],
        segment,
        i, ccComponents, ccPin, pinPos;

    for (i = 0; i < this.props.component.pins.length; i++) {
      pin = this.props.component.pins[i];
      pins.push(PinView({key: 'pin' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
      pins.push(text({key: 'label' + i, x: pin.label.x, y: pin.label.y, fontSize: pin.labelSize, fill: '#fff', style: {textAnchor: pin.label.anchor}}, pin.label.text));
    }

    for (i = 0; i < this.props.component.segments.length; i++) {
      segment = this.props.component.segments[i];
      segments.push(path({key: 'segment' + i, d: segment.pathCommands, fill: segment.pin.connected && !segment.pin.value ? '#ccff00' : UNSELECTED_FILL, transform: segment.transform}));
    }

    ccPin = this.props.component.pins[7];
    pinPos = {x1: ccPin.x + (ccPin.width / 2), y1: ccPin.y + ccPin.height, x2: ccPin.x + (ccPin.width / 2), y2: ccPin.y + ccPin.height + (3 * ccPin.width)};
    ccComponents = g({},
      line({x1: pinPos.x1, y1: pinPos.y1, x2: pinPos.x2, y2: pinPos.y2, strokeWidth: constants.FOO_WIRE_WIDTH, stroke: '#333'}),
      circle({cx: pinPos.x2, cy: pinPos.y2 + (pin.height / 2), r: pin.height / 2, fill: 'none', stroke: '#333'})
    );

    return g({},
      rect({x: p.display.x, y: p.display.y, width: p.display.width, height: p.display.height, fill: '#333'}),
      pins,
      segments,
      circle({cx: decimalPoint.cx, cy: decimalPoint.cy, r: decimalPoint.radius, fill: this.props.component.pinMap.DP.connected && !this.props.component.pinMap.DP.value ? '#ccff00' : UNSELECTED_FILL}),
      ccComponents
    );
  }
});

ButtonView = createComponent({
  displayName: 'ButtonView',

  onClick: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.props.pushButton(this.props.button);
  },

  render: function () {
    var onClick = this.onClick;
    return g({onClick: onClick, style: {cursor: 'pointer'}},
      rect({x: this.props.button.x, y: this.props.button.y, width: this.props.button.width, height: this.props.button.height, fill: this.props.pushed ? SELECTED_FILL : UNSELECTED_FILL}),
      text({x: this.props.button.label.x, y: this.props.button.label.y, fontSize: this.props.button.labelSize, fill: '#fff', style: {textAnchor: this.props.button.label.anchor}}, this.props.button.label.text)
    );
  }
});

PinView = createComponent({
  displayName: 'PinView',

  mouseOver: function () {
    this.props.reportHover(this.props.pin);
  },

  mouseOut: function () {
    this.props.reportHover(null);
  },

  startDrag: function (e) {
    this.props.drawConnection(this.props.pin, e, '#555');
  },

  render: function () {
    var pin = this.props.pin,
        showColors = this.props.stepping && this.props.showDebugPins && !pin.notConnectable,
        enableHandlers = this.props.selected && this.props.editable,
        inputRect, outputRect;

    switch (pin.placement) {
      case 'top':
        inputRect = {x: pin.x, y: pin.y + (pin.height / 2), width: pin.width, height: pin.height / 2};
        outputRect = {x: pin.x, y: pin.y, width: pin.width, height: pin.height / 2};
        break;
      case 'bottom':
        inputRect = {x: pin.x, y: pin.y, width: pin.width, height: pin.height / 2};
        outputRect = {x: pin.x, y: pin.y + (pin.height / 2), width: pin.width, height: pin.height / 2};
        break;
      case 'right':
        inputRect = {x: pin.x, y: pin.y, width: pin.width / 2, height: pin.height};
        outputRect = {x: pin.x + (pin.width / 2), y: pin.y, width: pin.width / 2, height: pin.height};
        break;
      default:
        outputRect = {x: pin.x, y: pin.y, width: pin.width / 2, height: pin.height};
        inputRect = {x: pin.x + (pin.width / 2), y: pin.y, width: pin.width / 2, height: pin.height};
        break;
    }

    inputRect.fill = showColors && pin.inputMode && pin.connected ? (pin.value ? 'red' : 'green') : '#777';
    outputRect.fill = showColors && !pin.inputMode ? (pin.value ? 'red' : 'green') : '#777';

    return g({onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null},
      rect(inputRect),
      rect(outputRect)
    );
  }
});

PICView = createComponent({
  displayName: 'PICView',

  pinWire: function (pin, dx) {
    var s;
    dx = dx || 1;
    s = {x1: pin.x + (pin.width * dx), y1: pin.y + (pin.height / 2), x2: pin.x + pin.width + (3 * pin.width * dx), y2: pin.y + (pin.height / 2)};
    s.line = this.wireSegment(s).line;
    return s;
  },

  wireSegment: function (s, key) {
    var constants = selectedConstants(this.props.selected),
        segment = {x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, strokeWidth: constants.FOO_WIRE_WIDTH, stroke: '#333'};
    if (key) {
      segment.key = key;
    }
    segment.line = line(segment);
    return segment;
  },

  renderGround: function (pin, p) {
    var p2 = {x: p.x, y: p.y + pin.height},
        segments = [this.wireSegment({key: pin.name + 'down', x1: p.x, y1: p.y, x2: p2.x, y2: p2.y}).line],
        s, width, height, i;

    for (i = 0; i < 3; i++) {
      width = pin.width - (pin.width * (0.33 * i));
      height = i * (pin.height / 4);
      s = {x1: p2.x - (width / 2), y1: p2.y + height, x2: p2.x + (width / 2), y2: p2.y + height};
      segments.push(this.wireSegment(s, pin.name + i).line);
    }

    return g({}, segments);
  },

  resistor: function (pin, p) {
    var width = pin.width / 4,
        height = pin.height / 2,
        r = {x1: p.x, y1: p.y, x2: p.x - (12 * width), y2: p.y},
        segments = [
          this.wireSegment({x1: r.x1,                 y1: r.y1,          x2: r.x1 - width,         y2: p.y + height}).line,
          this.wireSegment({x1: r.x1 -      width,    y1: r.y1 + height, x2: r.x1 - (2 * width),   y2: p.y - height}).line,
          this.wireSegment({x1: r.x1 - (2 * width),   y1: r.y1 - height, x2: r.x1 - (3 * width),   y2: p.y + height}).line,
          this.wireSegment({x1: r.x1 - (3 * width),   y1: r.y1 + height, x2: r.x1 - (4 * width),   y2: p.y - height}).line,
          this.wireSegment({x1: r.x1 - (4 * width),   y1: r.y1 - height, x2: r.x1 - (5 * width),   y2: p.y + height}).line,
          this.wireSegment({x1: r.x1 - (5 * width),   y1: r.y1 + height, x2: r.x1 - (6 * width),   y2: p.y - height}).line,
          this.wireSegment({x1: r.x1 - (6 * width),   y1: r.y1 - height, x2: r.x1 - (6.5 * width), y2: p.y}).line,
          this.wireSegment({x1: r.x1 - (6.5 * width), y1: r.y1,          x2: r.x2,                 y2: r.y2}).line
        ];
    r.lines = g({}, segments);
    return r;
  },

  capacitor: function (pin, p) {
    var width = pin.width / 2,
        height = pin.height / 2,
        c = {x1: p.x, y1: p.y, x2: p.x + width, y2: p.y},
        segments = [
          this.wireSegment({x1: c.x1, y1: c.y1 - height, x2: c.x1, y2: c.y1 + height}).line,
          this.wireSegment({x1: c.x2, y1: c.y2 - height, x2: c.x2, y2: c.y2 + height}).line
        ];
    c.lines = g({}, segments);
    return c;
  },

  renderCrystal: function (p) {
    var constants = selectedConstants(this.props.selected),
        height = p.height / 5,
        width = p.width * 0.8,
        segments = [
          this.wireSegment({x1: p.x, y1: p.y, x2: p.x, y2: p.y + height}).line,
          this.wireSegment({x1: p.x - width, y1: p.y + height, x2: p.x + width, y2: p.y + height}).line,
          rect({x: p.x - p.width, y: p.y + (2 * height), width: (p.width * 2), height: p.height - (4 * height), strokeWidth: constants.FOO_WIRE_WIDTH, stroke: '#333', fill: 'none'}),
          this.wireSegment({x1: p.x - width, y1: p.y + p.height - height, x2: p.x + width, y2: p.y + p.height - height}).line,
          this.wireSegment({x1: p.x, y1: p.y + p.height, x2: p.x, y2: p.y + p.height - height}).line
        ];
    return g({}, segments);
  },

  render: function () {
    var p = this.props.component.position,
        pins = [],
        pin,
        i, groundComponents, mclComponents, xtalComponents, vccComponents, s1, w1, w2, r, w3, w4, w5, w6, c1, c2;

    for (i = 0; i < this.props.component.pins.length; i++) {
      pin = this.props.component.pins[i];
      pins.push(PinView({key: 'pin' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
      pins.push(text({key: 'label' + i, x: pin.label.x, y: pin.label.y, fontSize: pin.labelSize, fill: '#fff', style: {textAnchor: pin.label.anchor}}, pin.label.text));
    }

    pin = this.props.component.pinMap.GND;
    s1 = {x1: pin.x, y1: pin.y + (pin.height / 2), x2: pin.x - (3 * pin.width), y2: pin.y + (pin.height / 2)};
    groundComponents = g({},
      this.wireSegment(s1).line,
      this.renderGround(pin, {x: s1.x2, y: s1.y2})
    );

    pin = this.props.component.pinMap.MCL;
    s1 = {x1: pin.x, y1: pin.y + (pin.height / 2), x2: pin.x - pin.width, y2: pin.y + (pin.height / 2)};
    r = this.resistor(pin, {x: s1.x2, y: s1.y2});
    mclComponents = g({},
      this.wireSegment(s1).line,
      r.lines,
      circle({cx: r.x2 - (pin.width / 2), cy: r.y2, r: pin.width / 2, fill: 'none', stroke: '#333'})
    );

    pin = this.props.component.pinMap.XTAL;
    w1 = this.pinWire(this.props.component.pins[11]);
    w2 = this.pinWire(this.props.component.pins[12]);
    c1 = this.capacitor(this.props.component.pins[11], {x: w1.x2, y: w1.y2});
    c2 = this.capacitor(this.props.component.pins[12], {x: w2.x2, y: w2.y2});
    w3 = this.wireSegment({x1: c1.x2, y1: w1.y2, x2: w1.x2 + (2 * pin.width), y2: w1.y2});
    w4 = this.wireSegment({x1: c2.x2, y1: w2.y2, x2: w3.x2, y2: w2.y2});
    w5 = this.wireSegment({x1: w2.x2 + (2 * pin.width), y1: w1.y2 + ((w2.y2 - w1.y2) / 2), x2: w2.x2 + (4 * pin.width), y2: w1.y2 + ((w2.y2 - w1.y2) / 2)});
    w6 = this.wireSegment({x1: w5.x2, y1: w5.y2, x2: w5.x2, y2: w5.y2 + (pin.height)});
    xtalComponents = g({},
      w1.line,
      w2.line,
      this.renderCrystal({x: w1.x1 + ((w1.x2 - w1.x1) / 2), y: w1.y1, width: (w1.x2 - w1.x1) / 4, height: w2.y1 - w1.y1}),
      c1.lines,
      c2.lines,
      w3.line,
      w4.line,
      this.wireSegment({x1: w3.x2, y1: w3.y2, x2: w4.x2, y2: w4.y2}).line,
      w5.line,
      w6.line,
      this.renderGround(pin, {x: w6.x2, y: w6.y2})
    );

    w1 = this.pinWire(this.props.component.pins[13]);
    vccComponents = g({},
      w1.line,
      circle({cx: w1.x2 + (pin.width / 2), cy: w1.y2, r: pin.width / 2, fill: 'none', stroke: '#333'})
    );

    return g({},
      rect({x: p.chip.x, y: p.chip.y, width: p.chip.width, height: p.chip.height, fill: '#333'}),
      pins,
      groundComponents,
      mclComponents,
      xtalComponents,
      vccComponents
    );
  }
});

ProbeView = createComponent({
  displayName: 'ProbeView',

  getInitialState: function () {
    return {
      dragging: false
    };
  },

  startDrag: function (e) {
    var constants = selectedConstants(this.props.selected),
        $window = $(window),
        self = this,
        drag, stopDrag;

    this.props.draggingProbe(true);

    e.preventDefault();
    e.stopPropagation();

    drag = function (e) {
      e.preventDefault();
      self.props.setProbe({source: null, pos: {x: (e.pageX - self.props.svgOffset.left), y: (e.pageY - self.props.svgOffset.top) - (constants.PROBE_HEIGHT / 2)}});
    };

    stopDrag = function (e) {
      self.props.draggingProbe(false);

      e.preventDefault();
      $window.off('mousemove', drag);
      $window.off('mouseup', stopDrag);
      if (self.props.hoverSource) {
        self.props.hoverSource.pulseProbeDuration = 0;
      }
      self.props.setProbe({source: self.props.hoverSource, pos: null});
      logEvent(MOVED_PROBE_EVENT, self.props.hoverSource, {board: self.props.board});
    };

    $window.on('mousemove', drag);
    $window.on('mouseup', stopDrag);
  },

  render: function () {
    var constants = selectedConstants(this.props.selected),
        width = constants.PROBE_WIDTH,
        height = constants.PROBE_HEIGHT,
        halfNeedleHeight = constants.PROBE_NEEDLE_HEIGHT / 2,
        x = this.props.probeSource ? this.props.probeSource.cx : (this.props.pos ? this.props.pos.x : WORKSPACE_WIDTH - constants.PROBE_WIDTH - constants.PROBE_MARGIN),
        y = this.props.probeSource ? this.props.probeSource.cy - (height / 2) : (this.props.pos ? this.props.pos.y : constants.BOARD_HEIGHT - constants.PROBE_HEIGHT - constants.PROBE_MARGIN),
        middleY = y + (height / 2),
        defaultFill = 0.125,
        redFill = defaultFill,
        greenFill = defaultFill,
        amberFill = defaultFill,
        needlePath, handlePath;

    if (this.props.probeSource && (!this.props.probeSource.inputMode || this.props.probeSource.connected)) {
      if (this.props.probeSource.value) {
        redFill = 1;
      }
      else {
        greenFill = 1;
      }

      if (this.props.probeSource.pulseProbeDuration) {
        amberFill = 1;

        if (this.props.stepping) {
          // show for only 1 step
          this.props.probeSource.pulseProbeDuration = 0;
        }
        else {
          // show for 3 renders (300ms) and then hide for 3 renders (300ms)
          this.props.probeSource.pulseProbeDuration++;
          if (this.props.probeSource.pulseProbeDuration > 3) {
            amberFill = defaultFill;
          }
          if (this.props.probeSource.pulseProbeDuration > 6) {
            this.props.probeSource.pulseProbeDuration = 0;
          }
        }
      }
    }

    needlePath = [
      'M', x, ',', middleY, ' ',
      'L', x + halfNeedleHeight, ',', middleY - halfNeedleHeight, ' ',
      'L', x + height, ',', middleY - halfNeedleHeight, ' ',
      'L', x + height, ',', middleY + halfNeedleHeight, ' ',
      'L', x + halfNeedleHeight, ',', middleY + halfNeedleHeight, ' ',
      'L', x, ',', middleY, ' '
    ].join('');

    handlePath = [
      'M', x + height, ',', middleY - halfNeedleHeight, ' ',
      'L', x + (2 * height), ',', y, ' ',
      'L', x + width, ',', y, ' ',
      'L', x + width, ',', y + height, ' ',
      'L', x + (2 * height), ',', y + height, ' ',
      'L', x + height, ',', middleY + halfNeedleHeight, ' '
    ].join('');

    return g({transform: ['rotate(-15 ', x, ' ', y + (height / 2), ')'].join(''), onMouseDown: this.props.selected && this.props.editable ? this.startDrag : null},
      path({d: needlePath, fill: '#c0c0c0', stroke: '#777', style: {pointerEvents: 'none'}}),
      path({d: handlePath, fill: '#eee', stroke: '#777'}), // '#FDCA6E'
      circle({cx: x + (4 * height), cy: middleY, r: height / 4, fill: 'red', fillOpacity: redFill}),
      circle({cx: x + (5 * height), cy: middleY, r: height / 4, fill: 'green', fillOpacity: greenFill}),
      circle({cx: x + (6 * height), cy: middleY, r: height / 4, fill: '#ffbf00', fillOpacity: amberFill})
    );
  }
});

BoardView = createComponent({
  displayName: 'BoardView',

  toggleBoard: function () {
    this.props.toggleBoard(this.props.board);
  },

  getInitialState: function () {
    return {
      drawConnection: null,
      hoverSource: null,
      wires: this.props.board.wires,
      probeSource: this.props.board.probe ? this.props.board.probe.source : null,
      probePos: this.props.board.probe ? this.props.board.probe.pos : null,
      selectedWires: [],
      drawBox: null,
      draggingProbe: false
    };
  },

  componentDidMount: function () {
    boardWatcher.addListener(this.props.board, this.updateWatchedBoard);
    $(window).on('keyup', this.keyUp);

    // used to find wire click position
    this.svgOffset = $(this.refs.svg).offset();
  },

  componentWillUnmount: function () {
    boardWatcher.removeListener(this.props.board, this.updateWatchedBoard);
    $(window).off('keyup', this.keyUp);
  },

  keyUp: function (e) {
    var i, selectedWire;

    if (this.props.selected && this.props.editable && (e.keyCode == 46) && (this.state.selectedWires.length > 0)) { // 46 is the delete key
      for (i = 0; i < this.state.selectedWires.length; i++) {
        selectedWire = this.state.selectedWires[i];
        this.props.board.removeWire(selectedWire.source, selectedWire.dest);
        logEvent(REMOVE_WIRE_EVENT, null, {board: this.props.board, source: selectedWire.source});
      }
      this.setState({
        wires: this.props.board.wires,
        selectedWires: []
      });
      e.preventDefault();
    }
  },

  updateWatchedBoard: function (board, boardInfo) {
    var probe = {source: null, pos: null},
        probeInfo;

    // move the probe
    if (boardInfo && boardInfo.probe) {
      probeInfo = boardInfo.probe;
      if (probeInfo.to === 'pin') {
        probe.source = board.components[probeInfo.component].pins[probeInfo.pin.index];
      }
      else if (probeInfo.to === 'hole') {
        probe.source = board.connectors[probeInfo.connector].holes[probeInfo.hole.index];
      }
    }
    this.setProbe(probe);
  },

  reportHover: function (hoverSource) {
    this.setState({hoverSource: hoverSource});
  },

  setProbe: function (probe) {
    this.props.board.probe = probe;
    this.setState({probeSource: probe.source, probePos: probe.pos});
  },

  drawConnection: function (source, e, color, callback) {
    var $window = $(window),
        self = this,
        moved = false,
        drag, stopDrag;

    e.preventDefault();
    e.stopPropagation();

    this.setState({
      drawConnection: {
        x1: source.cx,
        y1: source.cy,
        x2: source.cx,
        y2: source.cy,
        strokeWidth: selectedConstants(this.props.selected).WIRE_WIDTH,
        stroke: color,
        reflection: source.getBezierReflection() * this.props.board.bezierReflectionModifier
      }
    });

    drag = function (e) {
      moved = true;
      e.preventDefault();
      self.state.drawConnection.x2 = e.pageX - self.svgOffset.left;
      self.state.drawConnection.y2 = e.pageY - self.svgOffset.top;
      self.setState({drawConnection: self.state.drawConnection});
    };

    stopDrag = function (e) {
      var dest = self.state.hoverSource,
          addedWire = false,
          wire;

      e.stopPropagation();
      e.preventDefault();

      $window.off('mousemove', drag);
      $window.off('mouseup', stopDrag);
      self.setState({drawConnection: null});

      if (moved && dest && (dest !== source)) {
        addedWire = true;
        wire = self.props.board.addWire(source, dest, (source.color || dest.color || color));
        self.setState({
          wires: self.props.board.wires,
          selectedWires: [wire]
        });
        logEvent(ADD_WIRE_EVENT, null, {board: self.props.board, source: source, dest: dest});
      }

      if (callback) {
        callback(addedWire);
      }
    };

    $window.on('mousemove', drag);
    $window.on('mouseup', stopDrag);
  },

  distance: function (endpoint, x, y) {
    var a = endpoint.cx - x,
        b = endpoint.cy - y;
    return Math.sqrt((a*a) + (b*b));
  },

  wireSelected: function (wire, e) {
    // check if click is near an endpoint
    var x = e.pageX - this.svgOffset.left,
        y = e.pageY - this.svgOffset.top,
        sourceDistance = this.distance(wire.source, x, y),
        destDistance = this.distance(wire.dest, x, y),
        shortestDistance = Math.min(sourceDistance, destDistance),
        self = this;

    if (shortestDistance <= 20) {
      this.props.board.removeWire(wire.source, wire.dest);
      this.setState({
        wires: this.props.board.wires,
        selectedWires: []
      });
      this.drawConnection(shortestDistance == sourceDistance ? wire.dest : wire.source, e, wire.color, function (addedWire) {
        var newWire;
        if (!addedWire) {
          newWire = self.props.board.addWire(wire.source, wire.dest, wire.color);
          self.setState({
            wires: self.props.board.wires,
            selectedWires: [newWire]
          });
        }
      });
    }
    else {
      this.setState({selectedWires: [wire]});
    }
  },

  backgroundMouseDown: function (e) {
    var $window = $(window),
        self = this,
        drag, stopDrag, getPath, x1, y1;

    this.setState({selectedWires: []});

    // allow for bounding box drawing around wires for mass selection
    e.preventDefault();

    x1 = e.pageX - this.svgOffset.left;
    y1 = e.pageY - this.svgOffset.top;

    // use path instead of rect as svg rect doesn't support negative widths or heights
    getPath = function (x2, y2) {
      return ["M", x1, ",", y1, " ", x2, ",", y1, " ", x2, ",", y2, " ", x1, ",", y2, " ", x1, ",", y1].join("");
    };

    this.setState({
      drawBox: {
        x1: x1,
        y1: y1,
        path: getPath(x1, y1),
        strokeWidth: selectedConstants(this.props.selected).WIRE_WIDTH,
        stroke: '#555',
        strokeDasharray: [10, 5]
      }
    });

    drag = function (e) {
      var x2 = e.pageX - self.svgOffset.left,
          y2 = e.pageY - self.svgOffset.top;
      e.preventDefault();
      self.state.drawBox.x2 = x2;
      self.state.drawBox.y2 = y2;
      self.state.drawBox.path = getPath(x2, y2);
      self.setState({drawBox: self.state.drawBox});
    };

    stopDrag = function (e) {
      var selectedWires = [],
          r, enclosed, i, wire;

      e.stopPropagation();
      e.preventDefault();
      $window.off('mousemove', drag);
      $window.off('mouseup', stopDrag);

      // check bounding box for wires
      r = {
        x1: Math.min(self.state.drawBox.x1, self.state.drawBox.x2),
        y1: Math.min(self.state.drawBox.y1, self.state.drawBox.y2),
        x2: Math.max(self.state.drawBox.x1, self.state.drawBox.x2),
        y2: Math.max(self.state.drawBox.y1, self.state.drawBox.y2)
      };
      enclosed = function (x, y) {
        return (r.x1 <= x) && (x <= r.x2) && (r.y1 <= y) && (y <= r.y2);
      };
      for (i = 0; i < self.props.board.wires.length; i++) {
        wire = self.props.board.wires[i];
        if (enclosed(wire.source.cx, wire.source.cy) || enclosed(wire.dest.cx, wire.dest.cy)) {
          selectedWires.push(wire);
        }
      }

      self.setState({
        drawBox: null,
        selectedWires: selectedWires
      });
    };

    $window.on('mousemove', drag);
    $window.on('mouseup', stopDrag);
  },

  draggingProbe: function (draggingProbe) {
    this.setState({draggingProbe: draggingProbe});
  },

  render: function () {
    var constants = selectedConstants(this.props.selected),
        style = {
          width: WORKSPACE_WIDTH,
          height: constants.BOARD_HEIGHT,
          position: 'relative'
        },
        connectors = [],
        components = [],
        wires = [],
        componentIndex = 0,
        editableWires = !this.state.draggingProbe && !this.state.drawConnection && !this.state.drawBox && (this.props.editable && this.props.selected),
        name, component, i, wire;

    // resolve input values
    this.props.board.resolveCircuitInputValues();

    // calculate the position so the wires can be updated
    if (this.props.board.connectors.input) {
      this.props.board.connectors.input.calculatePosition(this.props.selected);
      connectors.push(ConnectorView({key: 'input', connector: this.props.board.connectors.input, selected: this.props.selected, editable: this.props.editable, drawConnection: this.drawConnection, reportHover: this.reportHover}));
    }
    if (this.props.board.connectors.output) {
      this.props.board.connectors.output.calculatePosition(this.props.selected);
      connectors.push(ConnectorView({key: 'output', connector: this.props.board.connectors.output, selected: this.props.selected, editable: this.props.editable, drawConnection: this.drawConnection, reportHover: this.reportHover}));
    }

    for (name in this.props.board.components) {
      if (this.props.board.components.hasOwnProperty(name)) {
        component = this.props.board.components[name];
        component.calculatePosition(this.props.selected, componentIndex++, this.props.board.numComponents);
        components.push(component.view({key: name, component: component, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, drawConnection: this.drawConnection, reportHover: this.reportHover}));
      }
    }

    for (i = 0; i < this.props.board.wires.length; i++) {
      wire = this.props.board.wires[i];
      wires.push(WireView({key: i, wire: wire, board: this.props.board, editable: editableWires, width: constants.WIRE_WIDTH, wireSelected: this.wireSelected, selected: this.state.selectedWires.indexOf(wire) !== -1}));
    }

    return div({className: this.props.editable ? 'board editable-board' : 'board', style: style},
      span({className: this.props.editable ? 'board-user editable-board-user' : 'board-user'}, ('Circuit ' + (this.props.board.number + 1) + ': ') + (this.props.user ? this.props.user.name : '(unclaimed)')),
      svg({className: 'board-area', onMouseDown: this.props.selected && this.props.editable ? this.backgroundMouseDown : null, ref: 'svg'},
        connectors,
        components,
        wires,
        (this.state.drawConnection ? line({x1: this.state.drawConnection.x1, x2: this.state.drawConnection.x2, y1: this.state.drawConnection.y1, y2: this.state.drawConnection.y2, stroke: this.state.drawConnection.stroke, strokeWidth: this.state.drawConnection.strokeWidth, fill: 'none', style: {pointerEvents: 'none'}}) : null),
        (this.state.drawBox ? path({d: this.state.drawBox.path, stroke: this.state.drawBox.stroke, strokeWidth: this.state.drawBox.strokeWidth, strokeDasharray: this.state.drawBox.strokeDasharray, fill: 'none', style: {pointerEvents: 'none'}}) : null),
        ProbeView({board: this.props.board, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, probeSource: this.state.probeSource, hoverSource: this.state.hoverSource, pos: this.state.probePos, setProbe: this.setProbe, svgOffset: this.svgOffset, draggingProbe: this.draggingProbe})
      ),
      span({className: 'board-toggle'}, button({onClick: this.toggleBoard}, this.props.selected ? 'View All Circuits' : (this.props.editable ? 'Edit Circuit' : 'View Circuit')))
    );
  }
});

WireView = createComponent({
  displayName: 'WireView',

  getInitialState: function () {
    return {
      hovering: false
    };
  },

  mouseOver: function () {
    this.setState({hovering: true});
  },

  mouseOut: function () {
    this.setState({hovering: false});
  },

  mouseDown: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.props.wireSelected(this.props.wire, e);
  },

  render: function () {
    var wire = this.props.wire;
    return path({
      key: this.props.key,
      className: 'wire',
      d: getBezierPath({x1: wire.source.cx, y1: wire.source.cy, x2: wire.dest.cx, y2: wire.dest.cy, reflection: wire.getBezierReflection() * this.props.board.bezierReflectionModifier}),
      strokeWidth: this.props.width,
      stroke: this.props.selected ? '#f00' : (this.state.hovering ? '#ccff00' : wire.color),
      fill: 'none',
      onMouseOver: this.props.editable ? this.mouseOver : null,
      onMouseOut: this.props.editable ? this.mouseOut : null,
      onMouseDown: this.props.editable ? this.mouseDown : null
    });
  }
});

ConnectorHoleView = createComponent({
  displayName: 'ConnectorHoleView',

  mouseOver: function () {
    this.props.reportHover(this.props.hole);
  },

  mouseOut: function () {
    this.props.reportHover(null);
  },

  startDrag: function (e) {
    this.props.drawConnection(this.props.hole, e, this.props.hole.color);
  },

  render: function () {
    var enableHandlers = this.props.selected && this.props.editable;
    return g({},
      circle({cx: this.props.hole.cx, cy: this.props.hole.cy, r: this.props.hole.radius, fill: this.props.hole.color, onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null})
    );
  }
});

ConnectorView = createComponent({
  displayName: 'ConnectorView',

  render: function () {
    var position = this.props.connector.position,
        holes = [],
        hole, i;

    for (i = 0; i < this.props.connector.holes.length; i++) {
      hole = this.props.connector.holes[i];
      holes.push(ConnectorHoleView({key: i, connector: this.props.connector, hole: hole, selected: this.props.selected, editable: this.props.editable, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
    }

    return svg({},
      rect({x: position.x, y: position.y, width: position.width, height: position.height, fill: '#aaa'}),
      holes
    );
  }
});

RibbonView = createComponent({
  displayName: 'RibbonView',

  render: function () {
    var constants = selectedConstants(false),
        wires = [],
        hole, i;

    for (i = 0; i < this.props.connector.holes.length; i++) {
      hole = this.props.connector.holes[i];
      wires.push(line({key: i, x1: hole.cx, y1: 0, x2: hole.cx, y2: RIBBON_HEIGHT, strokeWidth: constants.WIRE_WIDTH, stroke: hole.color}));
    }
    return div({style: {height: RIBBON_HEIGHT}},
      svg({}, wires)
    );
  }
});

BoardEditorView = createComponent({
  displayName: 'BoardEditorView',

  render: function () {
    var constants = selectedConstants(true),
      style = {
        width: WORKSPACE_WIDTH,
        top: constants.BOARD_HEIGHT + 28
      };

    return div({className: 'pic-info'},
      div({className: 'pic-info-title'}, 'Code'),
      div({className: 'pic-info-code-wrapper', style: style},
        div({className: 'pic-info-code'}, this.props.board.components.pic.code.asm)
      )
    );
  }
});

WorkspaceView = createComponent({
  displayName: 'WorkspaceView',

  getInitialState: function () {
    return {
      selectedBoard: null
    };
  },

  toggleBoard: function (board) {
    var previousBoard = this.state.selectedBoard,
        selectedBoard = board === this.state.selectedBoard ? null : board;
    this.setState({selectedBoard: selectedBoard});
    if (selectedBoard) {
      logEvent(OPENED_BOARD_EVENT, selectedBoard.number);
    }
    else {
      logEvent(CLOSED_BOARD_EVENT, previousBoard ? previousBoard.number : -1);
    }
  },

  render: function () {
    if (this.state.selectedBoard) {
      return div({id: 'workspace'},
        BoardView({
          key: 'selectedBoard' + this.state.selectedBoard.number,
          board: this.state.selectedBoard,
          selected: true,
          editable: this.props.userBoardNumber === this.state.selectedBoard.number,
          user: this.props.users[this.state.selectedBoard.number],
          stepping: this.props.stepping,
          showDebugPins: this.props.showDebugPins,
          toggleBoard: this.toggleBoard
        }),
        BoardEditorView({board: this.state.selectedBoard})
      );
    }
    else {
      return div({id: 'workspace', style: {width: WORKSPACE_WIDTH}},
        BoardView({
          board: this.props.boards[0],
          editable: this.props.userBoardNumber === 0,
          user: this.props.users[0],
          stepping: this.props.stepping,
          showDebugPins: this.props.showDebugPins,
          toggleBoard: this.toggleBoard
        }),
        RibbonView({connector: this.props.boards[0].connectors.output}),
        BoardView({
          board: this.props.boards[1],
          editable: this.props.userBoardNumber === 1,
          user: this.props.users[1],
          stepping: this.props.stepping,
          showDebugPins: this.props.showDebugPins,
          toggleBoard: this.toggleBoard
        }),
        RibbonView({connector: this.props.boards[1].connectors.output}),
        BoardView({
          board: this.props.boards[2],
          editable: this.props.userBoardNumber === 2,
          user: this.props.users[2],
          stepping: this.props.stepping,
          showDebugPins: this.props.showDebugPins,
          toggleBoard: this.toggleBoard
        })
      );
    }
  }
});

SimulatorControlView = createComponent({
  displayName: 'SimulatorControlView',

  stop: function () {
    this.props.run(false);
  },

  run: function () {
    this.props.run(true);
  },

  step: function () {
    this.props.step();
  },

  reset: function () {
    this.props.reset();
  },

  render: function () {
    var controls = [];
    if (this.props.running) {
      controls.push(button({key: 'stop', onClick: this.stop}, 'Stop'));
    }
    else {
      controls.push(button({key: 'run', onClick: this.run}, 'Run'));
      controls.push(button({key: 'step', onClick: this.step}, 'Step'));
      controls.push(button({key: 'reset', onClick: this.reset}, 'Reset'));
    }

    return div({id: 'simulator-control'},
      div({id: 'simulator-control-title'}, 'Simulator'),
      div({id: 'simulator-control-area'}, controls)
    );
  }
});

DemoControlView = createComponent({
  displayName: 'DemoControlView',

  toggleAllWires: function () {
    this.props.toggleAllWires();
  },

  toggleDebugPins: function () {
    this.props.toggleDebugPins();
  },

  render: function () {
    return div({id: 'demo-control'},
      div({id: 'demo-control-title'}, 'Demo Control'),
      div({id: 'demo-control-area'},
        button({onClick: this.toggleAllWires}, (this.props.addedAllWires ? '-' : '+') + ' Wires'),
        !this.props.running ? button({onClick: this.toggleDebugPins}, (this.props.showDebugPins ? '-' : '+') + ' Pin Colors') : null
      )
    );
  }
});

SidebarChatView = createComponent({
  displayName: 'SidebarChatView',

  getInitialState: function() {
    var items = [];

    if (this.props.initialChatMessage) {
      items.push({
        prefix: 'Welcome!',
        message: this.props.initialChatMessage
      });
    }

    return {
      items: items,
      numExistingUsers: 0
    };
  },

  getJoinedMessage: function (numExistingUsers) {
    var slotsRemaining = 3 - numExistingUsers,
        nums = ["zero", "one", "two", "three"],
        cap = function (string) {
          return string.charAt(0).toUpperCase() + string.slice(1);
        },
        message = " ";

    if (slotsRemaining > 1) {
      // One of three users is here
      message += cap(nums[numExistingUsers]) + " of 3 users is here.";
    } else if (slotsRemaining == 1) {
      // Two of you are now here. One more to go before you can get started!
      message += cap(nums[numExistingUsers]) + " of you are now here. One more to go before you can get started!";
    } else {
      message += "You're all here! Time to start this challenge.";
    }

    return message;
  },

  componentWillMount: function() {
    var self = this;
    userController.onGroupRefCreation(function() {
      self.firebaseRef = userController.getFirebaseGroupRef().child("chat");
      self.firebaseRef.orderByChild('time').on("child_added", function(dataSnapshot) {
        var items = self.state.items.slice(0),
            item = dataSnapshot.val(),
            numExistingUsers = self.state.numExistingUsers;

        if (item.type == "joined") {
          numExistingUsers = Math.min(self.state.numExistingUsers + 1, 3);
          item.message += self.getJoinedMessage(numExistingUsers);
        }
        else if (item.type == "left") {
          numExistingUsers = Math.max(self.state.numExistingUsers - 1, 0);
        }

        if (numExistingUsers !== self.state.numExistingUsers) {
          self.setState({numExistingUsers: numExistingUsers});
        }

        items.push(item);

        self.setState({
          items: items
        });
      }.bind(self));
    });
  },

  componentWillUnmount: function() {
    this.firebaseRef.off();
  },

  handleSubmit: function(e) {
    var input = this.refs.text,
        message = $.trim(input.value);

    e.preventDefault();

    if (message.length > 0) {
      this.firebaseRef.push({
        user: userController.getUsername(),
        message: message,
        time: Firebase.ServerValue.TIMESTAMP
      });
      input.value = '';
      input.focus();
      logEvent("Sent message", message);
    }
  },

  listenForEnter: function (e) {
    if (e.keyCode === 13) {
      this.handleSubmit(e);
    }
  },

  render: function () {
    var style = this.props.demo ? {} : {top: 75};
    return div({id: 'sidebar-chat', style: style},
      div({id: 'sidebar-chat-title'}, 'Chat'),
      ChatItems({items: this.state.items}),
      div({className: 'sidebar-chat-input'},
        form({onSubmit: this.handleSubmit},
          textarea({ref: 'text', placeholder: 'Enter chat message here...', onKeyDown: this.listenForEnter}),
          br({}),
          button({onClick: this.handleSubmit}, 'Send Chat Message')
        )
      )
    );
  }
});

ChatItems = createComponent({
  displayName: 'ChatItems',

  componentDidUpdate: function (prevProps) {
    if (prevProps.items.length !== this.props.items.length) {
      if (this.refs.items) {
        this.refs.items.scrollTop = this.refs.items.scrollHeight;
      }
    }
  },

  render: function () {
    var user = userController.getUsername(),
        items;
    items = this.props.items.map(function(item, i) {
      return ChatItem({key: i, item: item, me: item.user == user});
    });
    return div({ref: 'items', className: 'sidebar-chat-items'}, items);
  }
});

ChatItem = createComponent({
  displayName: 'ChatItem',

  render: function () {
    return div({className: this.props.me ? 'chat-item chat-item-me' : 'chat-item chat-item-others'},
      b({}, this.props.item.prefix || (this.props.item.user + ':')),
      ' ',
      this.props.item.message
    );
  }
});

WeGotItPopup = createComponent({
  displayName: 'WeGotItPopup',

  clicked: function () {
    this.props.hidePopup();
  },

  render: function () {
    var allCorrect = this.props.allCorrect;
    return div({id: "we-got-it-popup"},
      div({id: "we-got-it-popup-background"}),
      div({id: "we-got-it-popup-dialog-wrapper"},
        div({id: "we-got-it-popup-dialog"},
          h2({}, allCorrect ? "All the wires are correct!" : "Sorry, the circuit is not correctly wired."),
          div({}, allCorrect ? "Your circuit is correctly wired from the keypad to the LED." : "Your circuit is not correctly wired from the keypad to the LED."),
          button({onClick: this.clicked}, allCorrect ? "All Done!" : "Keep Trying..." )
        )
      )
    );
  }
});

WeGotIt = createComponent({
  displayName: 'WeGotIt',

  getInitialState: function () {
    return {
      showPopup: false,
      allCorrect: false
    };
  },

  componentWillMount: function () {
    var self = this;

    userController.onGroupRefCreation(function() {
      self.submitRef = userController.getFirebaseGroupRef().child("submitted");
      self.submitRef.on("value", function(dataSnapshot) {
        var submitValue = dataSnapshot.val(),
            skew = userController.getServerSkew(),
            now = (new Date().getTime()) + skew;

        // ignore submits over 10 seconds old
        if (!submitValue || (submitValue.at < now - (10 * 1000))) {
          return;
        }

        self.props.checkIfCircuitIsCorrect(function (allCorrect) {
          self.setState({showPopup: true, allCorrect: allCorrect});
        });
      });
    });
  },

  componentWillUnmount: function() {
    this.submitRef.off();
  },

  hidePopup: function () {
    this.setState({showPopup: false});
  },

  clicked: function (e) {
    var username = userController.getUsername();

    e.preventDefault();

    logController.logEvent("Submit clicked", username);

    this.submitRef.set({
      user: username,
      at: Firebase.ServerValue.TIMESTAMP
    });
  },

  render: function () {
    if (this.props.currentUser) {
      return div({id: "we-got-it"},
        button({onClick: this.clicked}, "We got it!"),
        this.state.showPopup ? WeGotItPopup({allCorrect: this.state.allCorrect, hidePopup: this.hidePopup}) : null
      );
    }
    else {
      return null;
    }
  }
});

AppView = createComponent({
  displayName: 'AppView',

  getInitialState: function () {
    var board0Output = new Connector({type: 'output', count: 4}),
        board1Input = new Connector({type: 'input', count: 4}),
        board1Output = new Connector({type: 'output', count: 4}),
        board2Input = new Connector({type: 'input', count: 4}),
        boards = [
          new Board({number: 0, bezierReflectionModifier: 1, components: {keypad: new Keypad(), pic: new PIC({code: picCode[0]})}, connectors: {output: board0Output}}),
          new Board({number: 1, bezierReflectionModifier: -0.5, components: {pic: new PIC({code: picCode[1]})}, connectors: {input: board1Input, output: board1Output}}),
          new Board({number: 2, bezierReflectionModifier: 0.75, components: {pic: new PIC({code: picCode[2]}), led: new LED()}, connectors: {input: board2Input}})
        ];

    board0Output.connectsTo = board1Input;
    board1Input.connectsTo = board0Output;
    board1Output.connectsTo = board2Input;
    board2Input.connectsTo = board1Output;

    board0Output.board = boards[0];
    board1Input.board = boards[1];
    board1Output.board = boards[1];
    board2Input.board = boards[2];

    boards[0].allBoards = boards;
    boards[1].allBoards = boards;
    boards[2].allBoards = boards;

    return {
      boards: boards,
      running: true,
      showDebugPins: true,
      addedAllWires: false,
      demo: window.location.search.indexOf('demo') !== -1,
      userBoardNumber: -1,
      users: {},
      currentBoard: 0,
      currentUser: null,
      currentGroup: null
    };
  },

  componentDidMount: function() {
    var activityName = 'pic',
        self = this;

    boardWatcher.addListener(this.state.boards[0], this.updateWatchedBoard);
    boardWatcher.addListener(this.state.boards[1], this.updateWatchedBoard);
    boardWatcher.addListener(this.state.boards[2], this.updateWatchedBoard);

    logController.init(activityName);
    userController.init(3, activityName, function(userBoardNumber) {
      var users = self.state.users,
          currentUser = userController.getUsername();

      userBoardNumber = parseInt(userBoardNumber, 10);
      users[userBoardNumber] = {
        name: currentUser
      };

      self.setState({
        userBoardNumber: userBoardNumber,
        users: users,
        currentUser: currentUser,
        currentGroup: userController.getGroupname(),
        currentBoard: userBoardNumber
      });

      userController.onGroupRefCreation(function() {
        boardWatcher.startListeners();
        userController.getFirebaseGroupRef().child('users').on("value", function(snapshot) {
          var fbUsers = snapshot.val(),
              users = {};
          $.each(fbUsers, function (user) {
            users[parseInt(fbUsers[user].client)] = {
              name: user
            };
          });
          self.setState({users: users});
        });
      });
    });

    // start the simulator without the event logged if set to run at startup
    if (this.state.running) {
      this.run(true, true);
    }
  },

  componentWillUnmount: function () {
    boardWatcher.removeListener(this.state.boards[0], this.updateWatchedBoard);
    boardWatcher.removeListener(this.state.boards[1], this.updateWatchedBoard);
    boardWatcher.removeListener(this.state.boards[2], this.updateWatchedBoard);
  },

  updateWatchedBoard: function (board, boardInfo) {
    var wires;

    if (boardInfo && board.components.keypad) {
      board.components.keypad.selectButtonValue(boardInfo.button);
    }

    // update the wires
    wires = (boardInfo ? boardInfo.wires : null) || [];
    board.updateWires(wires);
  },

  checkIfCircuitIsCorrect: function (callback) {
    var self = this,
        inputs = [
          {value: '1', bitfield: 107},
          {value: '2', bitfield: 258},
          {value: '3', bitfield: 34},
          {value: '4', bitfield: 104},
          {value: '5', bitfield: 48},
          {value: '6', bitfield: 24},
          {value: '7', bitfield: 99},
          {value: '8', bitfield: 0},
          {value: '9', bitfield: 96},
          {value: '0', bitfield: 1},
          {value: '*', bitfield: 378},
          {value: '#', bitfield: 379}
        ],
        keypad = this.state.boards[0].components.keypad,
        led = this.state.boards[2].components.led,
        allCorrect, startingKeypadValue, input, i, selectButton;

    selectButton = function (value) {
      var boards = self.state.boards,
          numBoards = boards.length,
          i, j;

      // reset all the boards
      for (i = 0; i < numBoards; i++) {
        boards[i].reset();
      }

      // set the input without notifing
      keypad.selectButtonValue(value, true);

      // evaluate all the boards so the keypad input propogates to the led
      for (i = 0; i < numBoards; i++) {
        for (j = 0; j < numBoards; j++) {
          boards[i].components.pic.evaluateRemainingPICInstructions();
        }
      }
    };

    // save the current keypad number
    startingKeypadValue = keypad.getPushedButtonValue();

    // check each keypad input for led output
    for (i = 0; i < inputs.length; i++) {
      input = inputs[i];

      selectButton(input.value);

      // check the output
      allCorrect = led.getPinBitField() == input.bitfield;
      if (!allCorrect) {
        break;
      }
    }

    // reset to the saved keypad number without notifing
    selectButton(startingKeypadValue);

    callback(allCorrect);
  },

  simulate: function (step) {
    var i, pic;

    if (this.state.running || step) {
      for (i = 0; i < this.state.boards.length; i++) {
        pic = this.state.boards[i].components.pic;
        if (step) {
          pic.evaluateCurrentPICInstruction();
        }
        else {
          pic.evaluateRemainingPICInstructions();
        }
      }
      this.setState({boards: this.state.boards});
    }
  },

  reset: function () {
    for (var i = 0; i < this.state.boards.length; i++) {
      this.state.boards[i].reset();
    }
    this.setState({boards: this.state.boards});
    logEvent(RESET_EVENT);
  },

  run: function (run, skipLogging) {
    clearInterval(this.simulatorInterval);
    if (run) {
      this.simulatorInterval = setInterval(this.simulate, 100);
    }
    this.setState({running: run});
    if (!skipLogging) {
      logEvent(run ? RUN_EVENT : STOP_EVENT);
    }
  },

  step: function () {
    this.simulate(true);
    logEvent(STEP_EVENT);
  },

  toggleAllWires: function () {
    var defaultColor = '#555',

        b0 = this.state.boards[0],
        b0Keypad = b0.components.keypad.pinMap,
        b0PIC = b0.components.pic.pinMap,
        b0o = b0.connectors.output.holes,

        b1 = this.state.boards[1],
        b1PIC = b1.components.pic.pinMap,
        b1o = b1.connectors.output.holes,
        b1i = b1.connectors.input.holes,

        b2 = this.state.boards[2],
        b2PIC = b2.components.pic.pinMap,
        b2LED = b2.components.led.pinMap,
        b2i = b2.connectors.input.holes,
        wire, boardWires, i, j;

    boardWires = [
      [
        {source: b0Keypad.COL0, dest: b0PIC.RB0, color: defaultColor},
        {source: b0Keypad.COL1, dest: b0PIC.RB1, color: defaultColor},
        {source: b0Keypad.COL2, dest: b0PIC.RB2, color: defaultColor},
        {source: b0Keypad.ROW0, dest: b0PIC.RB3, color: defaultColor},
        {source: b0Keypad.ROW1, dest: b0PIC.RB4, color: defaultColor},
        {source: b0Keypad.ROW2, dest: b0PIC.RB5, color: defaultColor},
        {source: b0Keypad.ROW3, dest: b0PIC.RB6, color: defaultColor},
        {source: b0PIC.RA0, dest: b0o[0], color: b0o[0].color},
        {source: b0PIC.RA1, dest: b0o[1], color: b0o[1].color},
        {source: b0PIC.RA2, dest: b0o[2], color: b0o[2].color},
        {source: b0PIC.RA3, dest: b0o[3], color: b0o[3].color}
      ],
      [
        {source: b1i[0], dest: b1PIC.RB0, color: b1i[0].color},
        {source: b1i[1], dest: b1PIC.RB1, color: b1i[1].color},
        {source: b1i[2], dest: b1PIC.RB2, color: b1i[2].color},
        {source: b1i[3], dest: b1PIC.RB3, color: b1i[3].color},
        {source: b1PIC.RA0, dest: b1o[0], color: b1o[0].color},
        {source: b1PIC.RA1, dest: b1o[1], color: b1o[1].color},
        {source: b1PIC.RA2, dest: b1o[2], color: b1o[2].color},
        {source: b1PIC.RA3, dest: b1o[3], color: b1o[3].color}
      ],
      [
        {source: b2i[0], dest: b2PIC.RA0, color: b2i[0].color},
        {source: b2i[1], dest: b2PIC.RA1, color: b2i[1].color},
        {source: b2i[2], dest: b2PIC.RA2, color: b2i[2].color},
        {source: b2i[3], dest: b2PIC.RA3, color: b2i[3].color},
        {source: b2PIC.RB0, dest: b2LED.a, color: defaultColor},
        {source: b2PIC.RB1, dest: b2LED.b, color: defaultColor},
        {source: b2PIC.RB2, dest: b2LED.c, color: defaultColor},
        {source: b2PIC.RB3, dest: b2LED.d, color: defaultColor},
        {source: b2PIC.RB4, dest: b2LED.e, color: defaultColor},
        {source: b2PIC.RB5, dest: b2LED.f, color: defaultColor},
        {source: b2PIC.RB6, dest: b2LED.g, color: defaultColor}
      ]
    ];

    for (i = 0; i < this.state.boards.length; i++) {
      this.state.boards[i].clear();
      if (!this.state.addedAllWires) {
        for (j = 0; j < boardWires[i].length; j++) {
          wire = boardWires[i][j];
          this.state.boards[i].addWire(wire.source, wire.dest, wire.color);
        }
      }
      boardWatcher.circuitChanged(this.state.boards[i]);
    }

    this.setState({boards: this.state.boards, addedAllWires: !this.state.addedAllWires});
  },

  toggleDebugPins: function () {
    this.setState({showDebugPins: !this.state.showDebugPins});
  },

  render: function () {
    return div({},
      h1({}, "Teaching Teamwork PIC Activity"),
      this.state.currentUser ? h2({}, "Circuit " + (this.state.currentBoard + 1) + " (User: " + this.state.currentUser + ", Group: " + this.state.currentGroup + ")") : null,
      WeGotIt({currentUser: this.state.currentUser, checkIfCircuitIsCorrect: this.checkIfCircuitIsCorrect}),
      div({id: 'picapp'},
        WorkspaceView({boards: this.state.boards, stepping: !this.state.running, showDebugPins: this.state.showDebugPins, users: this.state.users, userBoardNumber: this.state.userBoardNumber}),
        SimulatorControlView({running: this.state.running, run: this.run, step: this.step, reset: this.reset}),
        this.state.demo ? DemoControlView({running: this.state.running, toggleAllWires: this.toggleAllWires, toggleDebugPins: this.toggleDebugPins, showDebugPins: this.state.showDebugPins, addedAllWires: this.state.addedAllWires}) : null,
        SidebarChatView({demo: this.state.demo})
      )
    );
  }
});

//
// Main
//

boardWatcher = new BoardWatcher();
ReactDOM.render(AppView({}), document.getElementById('content'));


},{"./controllers/log":3,"./controllers/user":4,"./data/pic-code":6}],2:[function(require,module,exports){
var iframePhone = require('iframe-phone'),
    controller;

function LaraController() {
}
LaraController.prototype = {
  laraPhone: null,
  loadedFromLara: false,
  loadedGlobalState: false,
  globalState: null,
  loadedGlobalStateCallback: null,
  connected: false,
  connectionCallback: null,

  init: function() {
    var self = this;

    // for now just check if in iframe
    try {
      this.loadedFromLara = window.self !== window.top;
    } catch (e) {
      this.loadedFromLara = true;
    }

    if (this.loadedFromLara) {
      this.laraPhone = iframePhone.getIFrameEndpoint();
      this.laraPhone.addListener('hello', function () {
        self.connected = true;
        if (self.connectionCallback) {
          self.connectionCallback();
        }
      });
      this.laraPhone.addListener("loadInteractiveGlobal", function(state) {
        self._globalStateLoaded(state);
      });
      // this message is not in the production lara
      this.laraPhone.addListener("loadInteractiveNullGlobal", function() {
        //self._globalStateLoaded(null);
      });
      this.laraPhone.initialize();
    }
  },

  waitForConnection: function (callback) {
    if (this.connected) {
      callback();
    }
    else {
      this.connectionCallback = callback;
    }
  },

  waitForGlobalState: function (callback) {
    var self = this;
    if (this.loadedGlobalState) {
      callback(this.globalState);
    }
    else {
      this.loadedGlobalStateCallback = callback;
      setTimeout(function () {
        if (!self.loadedGlobalState) {
          this.loadedGlobalStateCallback = null;
          callback(null);
        }
      }, 5000);
    }
  },

  log: function (data) {
    this.laraPhone.post('log', data);
  },

  setGlobalState: function (state) {
    if (this.loadedFromLara) {
      this.laraPhone.post('interactiveStateGlobal', state);
    }
  },

  _globalStateLoaded: function (state) {
    this.loadedGlobalState = true;
    this.globalState = state;
    if (this.loadedGlobalStateCallback) {
      this.loadedGlobalStateCallback(state);
    }
  }
};

controller = new LaraController();
controller.init();

module.exports = controller;


},{"iframe-phone":13}],3:[function(require,module,exports){
var logManagerUrl  = '//teaching-teamwork-log-manager.herokuapp.com/api/logs',
    xhrObserver    = require('../data/xhrObserver'),
    laraController = require('./lara'),
    laraLoggerReady,
    activityName,
    session,
    username,
    groupname,
    client,
    logEventListeners,
    wa,
    currentFlowing = true,
    queue = [],

    generateGUID = function() {
      function S4() {
        // turn off bitwise checking for this line
        // jshint bitwise:false
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        // jshint bitwise:true
      }
      return S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4();
    },

    sendEvent = function(data) {
      //console.log('Log:', data);
      if (laraLoggerReady) {
        logToLARA(data);
      } else {
        var request = xhrObserver.createObservedXMLHttpRequest();
        request.repeatablePost(logManagerUrl, 'application/json; charset=UTF-8', JSON.stringify(data));
      }
    },

    backfillQueue = function(key, value) {
      for (var i = 0, ii = queue.length; i < ii; i++) {
        queue[i][key] = value;
      }
    },

    processQueue = function() {
      while (queue.length) {
        var event = queue.shift();
        sendEvent(event);
      }
    },

    // value: simple value (string, boolean, number)
    // parameters: object
    logEvent = function(eventName, value, parameters) {
      var data = {
        application: "Teaching Teamwork",
        activity: activityName,
        username: username,
        groupname: groupname,
        board: client,
        currentFlowing: currentFlowing,
        session: session,
        time: Date.now(),
        event: eventName,
        event_value: value,
        parameters: parameters
      },
      i;

      // signal the listeners we are logging
      for (i=0; i < logEventListeners.length; i++) {
        logEventListeners[i](data);
      }

      if (typeof client == "undefined") {
        queue.push(data);
      } else {
        sendEvent(data);
      }
    },

    startSession = function() {
      session = generateGUID();
      logEvent("Started session");
    },

    logToLARA = function(data) {
      var laraLogData = {
        action: data.event,
        value: data.event_value,
        data: data
      };

      // these values are redundant with above
      delete data.event;
      delete data.event_value;

      // these values conflict with LARA wrapper
      delete data.application;
      delete data.time;
      delete data.session;

      // rename activity name conflict
      data.levelName = data.activity;
      delete data.activity;

      // flatten parameters
      if (data.parameters) {
        for (var prop in data.parameters) {
          if (!data.parameters.hasOwnProperty(prop)) {continue;}
          data[prop] = data.parameters[prop];
        }
        delete data.parameters;
      }

      laraController.log(laraLogData);
    };

laraController.waitForConnection(function () {
  laraLoggerReady = true;
});

function LogController() {
}

LogController.prototype = {
  logEvent: logEvent,

  init: function(_activityName) {
    activityName = _activityName;
    logEventListeners = [];
    startSession();
  },

  addLogEventListener: function(listener) {
    logEventListeners.push(listener);
  },

  setUserName: function(name) {
    username = name;
    backfillQueue("username", username);
    logEvent("Selected Username", username);
  },

  setGroupName: function(name) {
    groupname = name;
    backfillQueue("groupname", groupname);
    logEvent("Joined Group", groupname);
  },

  setClientNumber: function(clientNumber) {
    client = clientNumber;
    backfillQueue("board", client);
    processQueue();
    logEvent("Selected board", client);
  },

  startListeningToCircuitEvents: function() {
    var self = this;
    sparks.logController.addListener(function(evt) {
      if (evt.name === "Changed circuit") {
        self.updateIfCurrentFlowing(wa.getClientCircuit());
      }
      logEvent(evt.name, null, evt.value);
    });
  },

  updateIfCurrentFlowing: function (circuit) {
    if (wa) {
      currentFlowing = wa.isCurrentFlowing(circuit);
    }
  },

  setWorkbenchAdapter: function (_wa) {
    wa = _wa;
  },

  logEvents: function(events) {
    var eventName, event, value, parameters;

    if (!events) {
      return;
    }
    for (eventName in events) {
      if (events.hasOwnProperty(eventName)) {
        event = events[eventName];
        value = event.hasOwnProperty("value") ? event.value : null;
        parameters = event.hasOwnProperty("parameters") ? event.parameters : null;
        if (value || parameters) {
          logEvent(eventName, value, parameters);
        }
      }
    }
  }
};

module.exports = new LogController();


},{"../data/xhrObserver":7,"./lara":2}],4:[function(require,module,exports){
var UserRegistrationView = require('../views/userRegistration.jsx'),
    groups = require('../data/group-names'),
    logController = require('./log'),
    laraController = require('./lara'),
    userController,
    numClients,
    numExistingUsers,
    activityName,
    userName,
    groupName,
    firebaseGroupRef,
    firebaseUsersRef,
    fbUrl,
    groupUsersListener,
    boardsSelectionListener,
    groupRefCreationListeners,
    client,
    callback,
    serverSkew,
    onDisconnectRef;

// scratch
var fbUrlDomain = 'https://teaching-teamwork.firebaseio.com/';
var fbUrlDir = (localStorage ? localStorage.getItem('fbUrlDir') || null : null) || '2016/';  // to make local dev testing easier
var fbUrlBase = fbUrlDomain + fbUrlDir;

var getDate = function() {
  var today = new Date(),
      dd = today.getDate(),
      mm = today.getMonth()+1,
      yyyy = today.getFullYear();

  if(dd<10) {
      dd='0'+dd;
  }

  if(mm<10) {
      mm='0'+mm;
  }

  return yyyy+'-'+mm+'-'+dd;
};

var notifyGroupRefCreation = function() {
  if (groupRefCreationListeners) {
    for (var i = 0, ii = groupRefCreationListeners.length; i < ii; i++) {
      groupRefCreationListeners.pop()();
    }
  }
};

// listen for timestamp skews
serverSkew = 0;
var offsetRef = new Firebase(fbUrlDomain + '.info/serverTimeOffset');
offsetRef.on("value", function(snap) {
  serverSkew = snap.val();
});

module.exports = userController = {

  init: function(_numClients, _activityName, _callback) {
    numClients = _numClients;
    activityName = _activityName;
    callback = _callback;
    userName = null;

    if (numClients > 1) {
      var self = this;
      this.getIdentityFromLara(function (identity) {
        if (identity && identity.groupName) {
          self.tryToEnterGroup(identity.groupName, identity.userName);
        }
        else {
          UserRegistrationView.open(self, {form: "groupname", numClients: numClients});
        }
      });
    } else {
      callback(0);
    }
  },

  getIdentityFromLara: function (callback) {
    if (laraController.loadedFromLara) {
      UserRegistrationView.open(this, {form: "gettingGlobalState"});
      laraController.waitForGlobalState(function (state) {
        UserRegistrationView.close();
        callback(state && state.identity ? state.identity : null);
      });
    }
    else {
      callback(null);
    }
  },

  tryToEnterGroup: function(groupName, preferredUserName) {
    var self = this,
        group, members;

    for (var i = 0, ii = groups.length; i < ii; i++) {
      if (groups[i].name == groupName) {
        group = groups[i];
        break;
      }
    }

    members = group.members;

    this.createFirebaseGroupRef(activityName, groupName);

    firebaseUsersRef = firebaseGroupRef.child('users');
    groupUsersListener = firebaseUsersRef.on("value", function(snapshot) {
      var users = snapshot.val() || {};

      userName = preferredUserName || userName;

      numExistingUsers = Object.keys(users).length;
      if (!userName) {
        if (!users || !numExistingUsers) {
          userName = members[0];

          // if we're the first user, delete any existing data
          firebaseGroupRef.child('chat').set({});
          firebaseGroupRef.child('clients').set({});
          firebaseGroupRef.child('model').set({});
        } else if (numExistingUsers < numClients) {
          for (var i = 0, ii=members.length; i<ii; i++) {
            if (!users[members[i]]) {
              userName = members[i];
              break;
            }
          }
        }
      } else {
        delete users[userName];
      }

      if (userName && (!users || Object.keys(users).length) < numClients) {
        firebaseUsersRef.child(userName).set({here: true});
        onDisconnectRef = firebaseUsersRef.child(userName).onDisconnect();
        onDisconnectRef.set({});
      }

      UserRegistrationView.open(self, {form: "groupconfirm", users: users, userName: userName, groupName: groupName, numExistingUsers: numExistingUsers});
    });

    logController.logEvent("Started to join group", groupName);
  },

  rejectGroupName: function() {
    firebaseUsersRef.off("value", groupUsersListener);

    // clean up
    if (onDisconnectRef) {
      onDisconnectRef.cancel();
    }
    if (userName) {
      firebaseUsersRef.once("value", function(snapshot) {
        var users = snapshot.val();
        delete users[userName];
        if (Object.keys(users).length) {
          // delete ourselves
          firebaseUsersRef.child(userName).remove();
        } else {
          // delete the room if we are the only member
          firebaseGroupRef.remove();
        }
        userName = null;
      });
    }

    UserRegistrationView.open(this, {form: "groupname"});


    logController.logEvent("Rejected Group", groupName);
  },

  setGroupName: function(_groupName) {
    var self = this;

    groupName = _groupName;

    firebaseUsersRef.off("value", groupUsersListener);

    logController.setGroupName(groupName);
    logController.setUserName(userName);
    laraController.setGlobalState({
      identity: {
        groupName: groupName,
        userName: userName
      }
    });

    notifyGroupRefCreation();

    // annoyingly we have to get out of this before the off() call is finalized
    setTimeout(function(){
      boardsSelectionListener = firebaseUsersRef.on("value", function(snapshot) {
        var users = snapshot.val();
        UserRegistrationView.open(self, {form: "selectboard", numClients: numClients, users: users, userName: userName});
      });
    }, 1);
  },

  selectClient: function(_client) {
    client = _client;
    firebaseUsersRef.child(userName).set({client: client});
  },

  selectedClient: function() {
    firebaseUsersRef.off("value");
    UserRegistrationView.close();

    var chatRef = firebaseGroupRef.child('chat'),
        message = userName + " has joined on Circuit "+((client*1)+1)+".";

    chatRef.push({
      user: "System",
      message: message,
      type: "joined",
      time: Firebase.ServerValue.TIMESTAMP
    });
    var disconnectMessageRef = chatRef.push();
    disconnectMessageRef.onDisconnect().set({
      user: "System",
      message: userName + " has left",
      type: "left",
      time: Firebase.ServerValue.TIMESTAMP
    });
    callback(client);
  },

  getUsername: function() {
    return userName;
  },

  getGroupname: function() {
    return groupName;
  },

  getClient: function () {
    return client;
  },

  getServerSkew: function () {
    return serverSkew;
  },

  getFirebaseGroupRef: function() {
    return firebaseGroupRef;
  },

  getOtherClientNos: function() {
    var ret = [];
    for (var i = 0; i < numClients; i++) {
      if (i != client) {
        ret.push(i);
      }
    }
    return ret;
  },

  onGroupRefCreation: function(callback) {
    if (firebaseGroupRef) {
      callback();
    } else {
      if (!groupRefCreationListeners) {
        groupRefCreationListeners = [];
      }
      groupRefCreationListeners.push(callback);
    }
  },

  createFirebaseGroupRef: function (activityName, groupName) {
    fbUrl = fbUrlBase + getDate() + "-" + groupName + "/activities/" + activityName + "/";
    firebaseGroupRef = new Firebase(fbUrl);
    return firebaseGroupRef;
  }
};


},{"../data/group-names":5,"../views/userRegistration.jsx":8,"./lara":2,"./log":3}],5:[function(require,module,exports){
var sortByName = function (a, b) {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
};

module.exports = [
  {
    name: "Animals",
    members: [
      "Lion", "Tiger", "Bear"
    ]
  },
  {
    name: "Birds",
    members: [
      "Eagle", "Seagull", "Hawk"
    ]
  },
  {
    name: "Vehicles",
    members: [
      "Truck", "Car", "Van"
    ]
  },
  {
    name: "Tools",
    members: [
      "Hammer", "Pliers", "Wrench"
    ]
  },
  {
    name: "Office",
    members: [
      "Pencil", "Paper", "Pen"
    ]
  },
  {
    name: "Geography",
    members: [
      "Mountain", "Plain", "Valley"
    ]
  },
  {
    name: "Water",
    members: [
      "Ocean", "River", "Lake"
    ]
  },
  {
    name: "Weather",
    members: [
      "Rain", "Snow", "Sleet"
    ]
  },
  {
    name: "Dogs",
    members: [
      "Poodle", "Collie", "Spaniel"
    ]
  },
  {
    name: "Pets",
    members: [
      "Dog", "Cat", "Hamster"
    ]
  },
  {
    name: "Kitchen",
    members: [
      "Pot", "Pan", "Skillet"
    ]
  },
  {
    name: "Sides",
    members: [
      "Soup", "Salad", "Roll"
    ]
  },
  {
    name: "Dessert",
    members: [
      "Cake", "Icecream", "Pie"
    ]
  },
  {
    name: "Fruit",
    members: [
      "Peach", "Plum", "Grape"
    ]
  },
  {
    name: "Vegetable",
    members: [
      "Lettuce", "Celery", "Tomato"
    ]
  },
  {
    name: "Potatoes",
    members: [
      "Mashed", "Baked", "Fries"
    ]
  },
  {
    name: "Colors",
    members: [
      "Blue", "Red", "Green"
    ]
  },
  {
    name: "Instruments",
    members: [
      "Guitar", "Horn", "Piano"
    ]
  },
  {
    name: "Shapes",
    members: [
      "Circle", "Square", "Triangle"
    ]
  },
  {
    name: "Directions",
    members: [
      "North", "East", "West"
    ]
  },
  {
    name: "Towns",
    members: [
      "Acton", "Maynard", "Concord"
    ]
  },
  {
    name: "States",
    members: [
      "Utah", "Ohio", "Iowa"
    ]
  }
].sort(sortByName);


},{}],6:[function(require,module,exports){
var code = [];
code.push({
  asm: [
    ";*************************************************************************************",
    ";  Lab Assignment: TT Board 1",
    ";  Program File Name: TT Circuit 1.asm",
    ";",
    ";   Software:",
    ";   This program takes a key that is pressed on the keypad and",
    ";   converts it to a 4 bit binary number RRCC Where RR is Row and CC is column",
    ";",
    ";*************************************************************************************",
    "",
    ";======================= Configuration Register Programming =====================",
    ";This loading of the CONFIG register with the WDT turned off and the security",
    ";inactive.",
    "",
    " __CONFIG 0x3FFA   ;0x3FFA hex = b'11 1111 1111 1010'",
    "",
    ";  Bits 13 - 4 Code Protect Bits, Bit 3 Power Up Timer, Bit 2 Watch Dog Timer,",
    ";  Bits 1 and 0 are Oscillator Select Bits",
    ";",
    ";=========================================================================",
    ";============================= Equates=====================================",
    "",
    "Keypr      equ 0x0c    ;First DRAM location used as short term storage",
    "Col        equ 0x0d    ;Second DRAM location used as short term storage",
    "Row        equ 0x0e    ;Third DRAM location used for short term storage",
    ";=========================================================================",
    ";  Information the assembler needs to create proper files and program output",
    "",
    "",
    "   title\"TT Circuit 1\"   ;Title of lab printed on History File",
    "   list p=16f84A       ;Directive telling Assembler which PIC to use",
    "   #include <ETR261.h> ;Header file to make programming simpler",
    "",
    ";=========================================================================",
    "",
    "           org 00h     ;starting address for the program in PRAM",
    "           goto Start  ;skip over the interrupt address",
    "           org 04h     ;starting address for the start of code",
    "           retfie      ;return from interrupt to take care of an false interrupt",
    "",
    ";=========================================================================",
    "",
    "Start      movlw   0xf0        ;setup PORTA",
    "           tris    PORTA",
    "",
    "           movlw   0x87        ;setup PORTB",
    "           tris    PORTB",
    "           movlw   0x0F",
    "           movwf   PORTA",
    "again      movlw   0xf0        ;scan row 1",
    "           movwf   Row",
    "           movwf   PORTB",
    "           call    KEY",
    "",
    "           movlw   0xe8        ;scan row 2",
    "           movwf   Row",
    "           movwf   PORTB",
    "           call    KEY",
    "",
    "           movlw   0xd8        ;scan row 3",
    "           movwf   Row",
    "           movwf   PORTB",
    "           call    KEY",
    "",
    "           movlw   0xb8        ;scan row 4",
    "           movwf   Row",
    "           movwf   PORTB",
    "           call    KEY",
    "           goto    again",
    "",
    "KEY",
    "           movlw   0x06",
    "           movwf   Col",
    "           btfss   PORTB,0     ;scan column 3",
    "           call    KEYPRESS",
    "",
    "           movlw   0x05",
    "           movwf   Col",
    "           btfss   PORTB,1     ;scan column 2",
    "           call    KEYPRESS",
    "",
    "           movlw   0x03",
    "           movwf   Col",
    "           btfss   PORTB,2     ;scan column 1",
    "           call    KEYPRESS",
    "           return",
    "",
    "KEYPRESS   movf    Row,w",
    "           andlw   0xf8",
    "           iorwf   Col,w",
    "           movwf   Keypr",
    "           movf    Keypr,w",
    "           sublw   0xf3",
    "           btfss   STATUS,Z",
    "           goto    two",
    "           movlw   0x00",
    "           movwf   PORTA",
    "           return",
    "two        movf    Keypr,w",
    "           sublw   0xf5",
    "           btfss   STATUS,Z",
    "           goto    three",
    "           movlw   0x01",
    "           movwf   PORTA",
    "           return",
    "three      movf    Keypr,w",
    "           sublw   0xf6",
    "           btfss   STATUS,Z",
    "           goto    four",
    "           movlw   0x02",
    "           movwf   PORTA",
    "           return",
    "four       movf    Keypr,w",
    "           sublw   0xeb",
    "           btfss   STATUS,Z",
    "           goto    five",
    "           movlw   0x04",
    "           movwf   PORTA",
    "           return",
    "five       movf    Keypr,w",
    "           sublw   0xed",
    "           btfss   STATUS,Z",
    "           goto    six",
    "           movlw   0x05",
    "           movwf   PORTA",
    "           return",
    "six        movf    Keypr,w",
    "           sublw   0xee",
    "           btfss   STATUS,Z",
    "           goto    seven",
    "           movlw   0x06",
    "           movwf   PORTA",
    "           return",
    "seven      movf    Keypr,w",
    "           sublw   0xdb",
    "           btfss   STATUS,Z",
    "           goto    eight",
    "           movlw   0x08",
    "           movwf   PORTA",
    "           return",
    "eight      movf    Keypr,w",
    "           sublw   0xdd",
    "           btfss   STATUS,Z",
    "           goto    nine",
    "           movlw   0x09",
    "           movwf   PORTA",
    "           return",
    "nine       movf    Keypr,w",
    "           sublw   0xde",
    "           btfss   STATUS,Z",
    "           goto    Asterisk",
    "           movlw   0x0A",
    "           movwf   PORTA",
    "           return",
    "Asterisk   movf    Keypr,w",
    "           sublw   0xbe",
    "           btfss   STATUS,Z",
    "           goto    zero",
    "           movlw   0x0C",
    "           movwf   PORTA",
    "           return",
    "zero       movf    Keypr,w",
    "           sublw   0xbd",
    "           btfss   STATUS,Z",
    "           goto    Pound",
    "           movlw   0x0D",
    "           movwf   PORTA",
    "           return",
    "Pound      movf    Keypr,w",
    "           sublw   0xbb",
    "           btfss   STATUS,Z",
    "           return",
    "           movlw   0x0E",
    "           movwf   PORTA",
    "           return",
    "",
    "           end"
    ].join('\n'),
  js: function (pic) {
    var checkRow;

    checkRow = function (number) {
      return function () {
        var row = number << 2,
            input;

        pic.setPortB([0xf0, 0xe8, 0xd8, 0xb8][number]);
        input = pic.getPortB();

        if (input === 0x06) {
          pic.setPortA(row + 0x0);
        }
        if (input === 0x05) {
          pic.setPortA(row + 0x1);
        }
        if (input === 0x03) {
          pic.setPortA(row + 0x2);
        }
      };
    };

    return {
      start: function () {
        pic.trisPortA(0xf0);
        pic.trisPortB(0x87);
        pic.setPortA(0x0f);
      },
      loop: [checkRow(0), checkRow(1), checkRow(2), checkRow(3)]
    };
  }
});

code.push({
  asm: [
    ";*************************************************************************************",
    ";  Lab Assignment: TT Board 2 ",
    ";  Program File Name: TT Circuit 2.asm",
    ";",
    ";   Software:  ",
    ";   This program takes row and column information from circuit 1 and converts that  ",
    ";   it to a BCD number representing the key pressed in circuit 1.",
    ";",
    ";*************************************************************************************",
    "",
    ";======================= Configuration Register Programming =====================",
    ";This loading of the CONFIG register with the WDT turned off and the security",
    ";inactive.",
    "",
    " __CONFIG 0x3FFA   ;0x3FFA hex = b'11 1111 1111 1010'",
    "",
    ";  Bits 13 - 4 Code Protect Bits, Bit 3 Power Up Timer, Bit 2 Watch Dog Timer,",
    ";  Bits 1 and 0 are Oscillator Select Bits",
    ";",
    ";=========================================================================",
    ";============================= Equates=====================================",
    "",
    "Keypr      equ 0x0c    ;First DRAM location used as short term storage",
    "",
    ";=========================================================================",
    ";  Information the assembler needs to create proper files and program output",
    "",
    "",
    "   title\"TT Circuit 2\"       ;Title of lab printed on History File",
    "   list p=16f84A           ;Directive telling Assembler which PIC to use",
    "   #include <ETR261.h>     ;Header file to make programming simpler",
    "",
    ";=========================================================================",
    "",
    "           org 00h     ;starting address for the program in PRAM",
    "           goto Start  ;skip over the interrupt address",
    "           org 04h     ;starting address for the start of code",
    "           retfie      ;return from interrupt to take care of an false interrupt",
    "",
    ";=========================================================================",
    "",
    "Start      movlw   0xf0        ;setup PORTA bit0 -bit 4 outputs ",
    "           tris    PORTA",
    "           ",
    "           movlw   0xff        ;setup PORTB all inputs",
    "           tris    PORTB",
    "           movlw   0x0F",
    "           movwf   PORTA",
    "",
    "again      movf    PORTB,W",
    "           movwf   Keypr",
    "           call    KEYPRESS",
    "           goto    again",
    "",
    "KEYPRESS   ",
    "           movf    Keypr,w",
    "           sublw   0x00",
    "           btfss   STATUS,Z",
    "           goto    two",
    "           movlw   0x01",
    "           movwf   PORTA",
    "           return",
    "two        movf    Keypr,w",
    "           sublw   0x01",
    "           btfss   STATUS,Z",
    "           goto    three",
    "           movlw   0x02",
    "           movwf   PORTA",
    "           return",
    "three      movf    Keypr,w",
    "           sublw   0x02",
    "           btfss   STATUS,Z",
    "           goto    four",
    "           movlw   0x03",
    "           movwf   PORTA",
    "           return",
    "four       movf    Keypr,w",
    "           sublw   0x04",
    "           btfss   STATUS,Z",
    "           goto    five",
    "           movlw   0x04",
    "           movwf   PORTA",
    "           return",
    "five       movf    Keypr,w",
    "           sublw   0x05",
    "           btfss   STATUS,Z",
    "           goto    six",
    "           movlw   0x05",
    "           movwf   PORTA",
    "           return",
    "six        movf    Keypr,w",
    "           sublw   0x06",
    "           btfss   STATUS,Z",
    "           goto    seven",
    "           movlw   0x06",
    "           movwf   PORTA",
    "           return",
    "seven      movf    Keypr,w",
    "           sublw   0x08",
    "           btfss   STATUS,Z",
    "           goto    eight",
    "           movlw   0x07",
    "           movwf   PORTA",
    "           return",
    "eight      movf    Keypr,w",
    "           sublw   0x09",
    "           btfss   STATUS,Z",
    "           goto    nine",
    "           movlw   0x08",
    "           movwf   PORTA",
    "           return",
    "nine       movf    Keypr,w",
    "           sublw   0x0A",
    "           btfss   STATUS,Z",
    "           goto    Asterisk",
    "           movlw   0x09",
    "           movwf   PORTA",
    "           return",
    "Asterisk   movf    Keypr,w",
    "           sublw   0x0C",
    "           btfss   STATUS,Z",
    "           goto    zero",
    "           movlw   0x0A",
    "           movwf   PORTA",
    "           return",
    "zero       movf    Keypr,w",
    "           sublw   0x0E",
    "           btfss   STATUS,Z",
    "           goto    Blank",
    "           movlw   0x0D",
    "           movwf   PORTA",
    "           return",
    "Blank      movf    Keypr,w",
    "           sublw   0x0E",
    "           btfss   STATUS,Z",
    "           goto    Pound",
    "           movlw   0x00",
    "           movwf   PORTA",
    "           return",
    "Pound      movf    Keypr,w",
    "           sublw   0x0C",
    "           btfss   STATUS,Z",
    "           return",
    "           movlw   0x0F",
    "           movwf   PORTA",
    "           return",
    "",
    "",
    "           end"
    ].join('\n'),
  js: function (pic) {
    var inputMap, mapRowColToBCD;

    inputMap = {
      0: 1,
      1: 2,
      2: 3,
      3: 0x0f,
      4: 4,
      5: 5,
      6: 6,
      7: 0x0f,
      8: 7,
      9: 8,
      10: 9,
      11: 0x0f,
      12: 0xa,
      13: 0,
      14: 0x0f,
      15: 0x0f
    };

    mapRowColToBCD = function () {
      pic.setPortA(inputMap[pic.getPortB()]);
    };

    return {
      start: function () {
        pic.trisPortA(0xf0);
        pic.trisPortB(0xff);
        pic.setPortA(0x0f);
      },
      loop: [mapRowColToBCD]
    };
  }
});

code.push({
  asm: [
      ";*************************************************************************************",
      ";    Lab Assignment: TT Board 3 ",
      ";    Program File Name: TT Circuit 3",
      ";",
      ";   Software:    ",
      ";   This program converts BCD to 7 segment information for a CA display",
      ";   ",
      ";",
      ";*************************************************************************************",
      "",
      ";======================= Configuration Register Programming =====================",
      ";This loading of the CONFIG register with the WDT turned off and the security",
      ";inactive.",
      "",
      " __CONFIG 0x3FFA ;0x3FFA hex = b'11 1111 1111 1010'",
      "",
      ";  Bits 13 - 4 Code Protect Bits, Bit 3 Power Up Timer, Bit 2 Watch Dog Timer,",
      ";  Bits 1 and 0 are Oscillator Select Bits",
      ";",
      ";=========================================================================",
      ";============================= Equates=====================================",
      "",
      "",
      ";=========================================================================",
      ";  Information the assembler needs to create proper files and program output",
      "",
      "",
      " title\"TT Circuit 3\"       ;Title of lab printed on History File",
      " list p=16f84A           ;Directive telling Assembler which PIC to use",
      " #include <ETR261.h>     ;Header file to make programming simpler",
      "",
      ";=========================================================================",
      "",
      "         org 00h     ;starting address for the program in PRAM",
      "         goto Start  ;skip over the interrupt address",
      "         org 04h     ;starting address for the start of code",
      "         retfie      ;return from interrupt to take care of an false interrupt",
      "",
      ";=========================================================================",
      "",
      "Start                                ",
      "",
      ";============================= Configure Port B ==============================",
      "Start        movlw   0x80        ;all bits as outputs but bit7",
      "     tris    PORTB",
      "     ",
      "     movlw   0xff        ;setup PORTB all inputs",
      "     tris    PORTA",
      ";=========================================================================",
      "",
      "Main     movf    PORTA,W",
      "     call    table",
      "     movwf   PORTB",
      "     goto    Main",
      "                             ",
      "",
      "",
      "table        addwf   PCL",
      "     retlw   0xc0    ;0",
      "     retlw   0xf9    ;1",
      "     retlw   0xa4    ;2",
      "     retlw   0xb0    ;3",
      "     retlw   0x99    ;4",
      "     retlw   0x92    ;5",
      "     retlw   0x83    ;6",
      "     retlw   0xf8    ;7",
      "     retlw   0x80    ;8",
      "     retlw   0x98    ;9",
      "     retlw   0xbf    ;blank",
      "     retlw   0xff    ;blank",
      "     retlw   0xff    ;blank",
      "     retlw   0xff    ;blank",
      "     retlw   0xff    ;blank",
      "     retlw   0xff    ;blank",
      "     ",
      "     end",
      ""
    ].join('\n'),
  js: function (pic) {
    var inputMap, mapBCDTo7SegmentDisplay;

    inputMap = {
      0: 0xc0,
      1: 0xf9,
      2: 0xa4,
      3: 0xb0,
      4: 0x99,
      5: 0x92,
      6: 0x83,
      7: 0xf8,
      8: 0x80,
      9: 0x98,
      10: 0xbf,
      11: 0xff,
      12: 0xff,
      13: 0xff,
      14: 0xff,
      15: 0xff
    };

    mapBCDTo7SegmentDisplay = function () {
      pic.setPortB(inputMap[pic.getPortA()]);
    };

    return {
      start: function () {
        pic.trisPortA(0xff);
        pic.trisPortB(0x80);
      },
      loop: [mapBCDTo7SegmentDisplay]
    };
  }
});

module.exports = code;


},{}],7:[function(require,module,exports){
var xhrObserver;

function XHRObserver() {
  this.connectionListeners = [];
}

XHRObserver.prototype = {

  online: true,

  setOnline: function(online) {
    this.online = online;
    this.notifyListeners();
  },

  addConnectionListener: function(listener) {
    this.connectionListeners.push(listener);
  },

  notifyListeners: function() {
    for (var i = 0; i < this.connectionListeners.length; i++) {
      this.connectionListeners[i](this.online);
    }
  },

  createObservedXMLHttpRequest: function(successCallback) {
    var request = new XMLHttpRequest();

    request.repeatablePost = function(url, contentHeader, data) {
      request._repeat = true;
      request._url = url;
      request._contentHeader = contentHeader;
      request._data = data;

      request.open('POST', url, true);
      request.setRequestHeader('Content-Type', contentHeader);
      request.send(data);
    };

    request.onerror = this.onError;
    request.onload = function(evt) {
      if (request.status >= 200 && request.status < 400) {
        xhrObserver.setOnline(true);
        if (successCallback) {
          successCallback();
        }
      } else {
        xhrObserver.onError(evt);
      }
    };



    return request;
  },

  onError: function(evt) {
    xhrObserver.setOnline(false);

    if (evt.currentTarget._repeat) {
      setTimeout(function() {
        var request = evt.currentTarget;
        request.open('POST', request._url, true);
        request.setRequestHeader('Content-Type', request._contentHeader);
        request.send(request._data);
      }, 2000);
    }
  }

};

module.exports = xhrObserver = new XHRObserver();


},{}],8:[function(require,module,exports){
var userController, UserRegistrationView, UserRegistrationViewFactory,
    groups = require('../data/group-names');

// add a global UserRegistrationView variable because its statics are called in other modules
module.exports = window.UserRegistrationView = UserRegistrationView = React.createClass({
  displayName: 'UserRegistration',

  statics: {
    // open a dialog with props object as props
    open: function(_userController, data) {
      userController = _userController;
      var $anchor = $('#user-registration');
      if (!$anchor.length) {
        $anchor = $('<div id="user-registration" class="modalDialog"></div>').appendTo('body');
      }

      setTimeout(function() {
        $('#user-registration')[0].style.opacity = 1;
      }, 250);

      return ReactDOM.render(
        UserRegistrationViewFactory(data),
        $anchor.get(0)
      );
    },

    // close a dialog
    close: function() {
      var node = $('#user-registration').get(0);
      if (node) {
        ReactDOM.unmountComponentAtNode(node);
      }
      $('#user-registration').remove();
    }
  },
  getInitialState: function() {
    return {
      groupName: this.props.groupName || ""
    };
  },
  handleGroupNameChange: function(event) {
    this.setState({groupName: event.target.value});
  },
  handleGroupSelected: function(e) {
    e.preventDefault();
    userController.tryToEnterGroup(this.state.groupName);
  },
  handleJoinGroup: function() {
    userController.setGroupName(this.state.groupName);
  },
  handleRejectGroup: function() {
    this.setState({groupName: ''});
    userController.rejectGroupName();
  },
  handleClientSelection: function(event) {
    userController.selectClient(event.target.value);
  },
  handleClientSelected: function(e) {
    e.preventDefault();
    userController.selectedClient();
  },
  handleSubmit: function (e) {
    e.preventDefault();
  },
  componentDidMount: function () {
    var self = this,
        focusAndSelect = function (ref) {
          var node = self.refs[ref] ? self.refs[ref] : null;
          if (node) {
            node.focus();
            node.select();
          }
        };
    if (this.props.form == 'username') {
      focusAndSelect('userName');
    }
    else if (this.props.form == 'groupname') {
      focusAndSelect('groupName');
    }
  },
  render: function() {
    var form;
    if (this.props.form == 'gettingGlobalState') {
      form = (
        React.createElement("div", null, 
          React.createElement("h3", null, "Checking for previously set group and username")
        )
      );
    }
    else if (this.props.form == 'groupname' || !this.state.groupName) {
      var groupOptions = groups.map(function(group, i) {
        return (React.createElement("option", {key: i, value: group.name}, group.name));
      });
      groupOptions.unshift(React.createElement("option", {key: "placeholder", value: "", disabled: "disabled"}, "Select a team"));
      form = (
        React.createElement("div", null, 
          React.createElement("h3", null, "Welcome!"), 
          React.createElement("div", null, 
            "This activity requires a team of ", this.props.numClients, " users."
          ), 
          React.createElement("h3", null, "Please select your team:"), 
          React.createElement("label", null, 
            React.createElement("select", {value: this.state.groupName, onChange:  this.handleGroupNameChange}, 
               groupOptions 
            ), 
            React.createElement("button", {onClick:  this.handleGroupSelected}, "Select")
          )
        )
      );
    } else if (this.props.form == 'groupconfirm') {
      if (!this.props.userName) {
        form = (
          React.createElement("div", null, 
            React.createElement("h3", null, "Group name: ",  this.state.groupName), 
            React.createElement("div", null, 
              "There are already ",  this.props.numExistingUsers, " in this group."
            ), 
            React.createElement("label", null, 
              React.createElement("button", {onClick:  this.handleRejectGroup}, "Enter a different group")
            )
          )
        );
      } else {
        var userDetails,
            groupDetails,
            joinStr,
            keys = Object.keys(this.props.users),
            userName = this.props.userName;

        userDetails = (
          React.createElement("div", null, 
            React.createElement("label", null, "You have been assigned the name ", React.createElement("b", null, userName), ".")
          )
        );

        if (keys.length === 0) {
          groupDetails = (
            React.createElement("div", null, 
              React.createElement("label", null, "You are the first member of this group.")
            )
          );
        } else {
          groupDetails = (
            React.createElement("div", null, 
              React.createElement("label", null, "These are the other people currently in this group:"), 
              React.createElement("ul", null, 
                keys.map(function(result) {
                  return React.createElement("li", null, React.createElement("b", null, result));
                })
              )
            )
          );
        }

        joinStr = (keys.length ? "join" : "create");

        form = (
          React.createElement("div", null, 
            React.createElement("h3", null, "Group name: ",  this.state.groupName), 
             userDetails, 
             groupDetails, 
            React.createElement("div", {style: {marginTop: 10}}, "Do you want to ",  joinStr, " this group?"), 
            React.createElement("label", null, 
              React.createElement("button", {onClick:  this.handleJoinGroup}, "Yes, ",  joinStr ), 
              React.createElement("button", {onClick:  this.handleRejectGroup}, "No, enter a different group")
            )
          )
        );
      }
    } else if (this.props.form == 'selectboard') {
      var clientChoices = [],
          submittable = false;
      for (var i = 0, ii = this.props.numClients; i < ii; i++) {
        var userSpan = ( React.createElement("i", null, "currently unclaimed") ),
            isOwn = false,
            selected = false,
            valid = true,
            selectedUsers = [];
        for (var user in this.props.users) {
          if (this.props.users[user].client == i) {
            selectedUsers.push(user);
            if (user == this.props.userName) {
              isOwn = true;
              selected = true;
            }
            if (selectedUsers.length > 1) {
              valid = false;
            }
            userSpan = ( React.createElement("span", {className:  valid ? "" : "error"},  selectedUsers.join(", ") ) );
          }
        }
        if (isOwn && selectedUsers.length == 1) {
          submittable = true;
        }

        clientChoices.push(
          React.createElement("div", {key:  i }, 
            React.createElement("input", {type: "radio", name: "clientSelection", value:  i, onClick:  this.handleClientSelection}), "Circuit ",  i+1, " (",  userSpan, ")"
          ) );
      }

      form = (
        React.createElement("div", null, 
          React.createElement("h3", null, "Select Circuit"), 
           clientChoices, 
          React.createElement("label", null, 
            React.createElement("button", {disabled:  !submittable, onClick:  this.handleClientSelected}, "Select"), 
            React.createElement("button", {onClick:  this.handleRejectGroup}, "Enter a different group")
          )
        )
      );
    }

    return (
      React.createElement("form", {onSubmit:  this.handleSubmit}, 
         form 
      )
    );
  }
});

// used because JSX deprecated the spread function in the transformer
UserRegistrationViewFactory = React.createFactory(UserRegistrationView);


},{"../data/group-names":5}],9:[function(require,module,exports){
var structuredClone = require('./structured-clone');
var HELLO_INTERVAL_LENGTH = 200;
var HELLO_TIMEOUT_LENGTH = 60000;

function IFrameEndpoint() {
  var parentOrigin;
  var listeners = {};
  var isInitialized = false;
  var connected = false;
  var postMessageQueue = [];
  var helloInterval;

  function postToTarget(message, target) {
    // See http://dev.opera.com/articles/view/window-postmessage-messagechannel/#crossdoc
    //     https://github.com/Modernizr/Modernizr/issues/388
    //     http://jsfiddle.net/ryanseddon/uZTgD/2/
    if (structuredClone.supported()) {
      window.parent.postMessage(message, target);
    } else {
      window.parent.postMessage(JSON.stringify(message), target);
    }
  }

  function post(type, content) {
    var message;
    // Message object can be constructed from 'type' and 'content' arguments or it can be passed
    // as the first argument.
    if (arguments.length === 1 && typeof type === 'object' && typeof type.type === 'string') {
      message = type;
    } else {
      message = {
        type: type,
        content: content
      };
    }
    if (connected) {
      postToTarget(message, parentOrigin);
    } else {
      postMessageQueue.push(message);
    }
  }

  // Only the initial 'hello' message goes permissively to a '*' target (because due to cross origin
  // restrictions we can't find out our parent's origin until they voluntarily send us a message
  // with it.)
  function postHello() {
    postToTarget({
      type: 'hello',
      origin: document.location.href.match(/(.*?\/\/.*?)\//)[1]
    }, '*');
  }

  function addListener(type, fn) {
    listeners[type] = fn;
  }

  function removeAllListeners() {
    listeners = {};
  }

  function getListenerNames() {
    return Object.keys(listeners);
  }

  function messageListener(message) {
      // Anyone can send us a message. Only pay attention to messages from parent.
      if (message.source !== window.parent) return;

      var messageData = message.data;

      if (typeof messageData === 'string') messageData = JSON.parse(messageData);

      // We don't know origin property of parent window until it tells us.
      if (!connected && messageData.type === 'hello') {
        // This is the return handshake from the embedding window.
        parentOrigin = messageData.origin;
        connected = true;
        stopPostingHello();
        while(postMessageQueue.length > 0) {
          post(postMessageQueue.shift());
        }
      }

      // Perhaps-redundantly insist on checking origin as well as source window of message.
      if (message.origin === parentOrigin) {
        if (listeners[messageData.type]) listeners[messageData.type](messageData.content);
      }
   }

   function disconnect() {
     connected = false;
     stopPostingHello();
     window.removeEventListener('message', messsageListener);
   }

  /**
    Initialize communication with the parent frame. This should not be called until the app's custom
    listeners are registered (via our 'addListener' public method) because, once we open the
    communication, the parent window may send any messages it may have queued. Messages for which
    we don't have handlers will be silently ignored.
  */
  function initialize() {
    if (isInitialized) {
      return;
    }
    isInitialized = true;
    if (window.parent === window) return;

    // We kick off communication with the parent window by sending a "hello" message. Then we wait
    // for a handshake (another "hello" message) from the parent window.
    postHello();
    startPostingHello();
    window.addEventListener('message', messageListener, false);
  }

  function startPostingHello() {
    if (helloInterval) {
      stopPostingHello();
    }
    helloInterval = window.setInterval(postHello, HELLO_INTERVAL_LENGTH);
    window.setTimeout(stopPostingHello, HELLO_TIMEOUT_LENGTH);
  }

  function stopPostingHello() {
    window.clearInterval(helloInterval);
    helloInterval = null;
  }

  // Public API.
  return {
    initialize        : initialize,
    getListenerNames  : getListenerNames,
    addListener       : addListener,
    removeAllListeners: removeAllListeners,
    disconnect        : disconnect,
    post              : post
  };
}

var instance = null;

// IFrameEndpoint is a singleton, as iframe can't have multiple parents anyway.
module.exports = function getIFrameEndpoint() {
  if (!instance) {
    instance = new IFrameEndpoint();
  }
  return instance;
};
},{"./structured-clone":12}],10:[function(require,module,exports){
"use strict";

var ParentEndpoint = require('./parent-endpoint');
var getIFrameEndpoint = require('./iframe-endpoint');

// Not a real UUID as there's an RFC for that (needed for proper distributed computing).
// But in this fairly parochial situation, we just need to be fairly sure to avoid repeats.
function getPseudoUUID() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var len = chars.length;
    var ret = [];

    for (var i = 0; i < 10; i++) {
        ret.push(chars[Math.floor(Math.random() * len)]);
    }
    return ret.join('');
}

module.exports = function IframePhoneRpcEndpoint(handler, namespace, targetWindow, targetOrigin, phone) {
    var pendingCallbacks = Object.create({});

    // if it's a non-null object, rather than a function, 'handler' is really an options object
    if (handler && typeof handler === 'object') {
        namespace = handler.namespace;
        targetWindow = handler.targetWindow;
        targetOrigin = handler.targetOrigin;
        phone = handler.phone;
        handler = handler.handler;
    }

    if ( ! phone ) {
        if (targetWindow === window.parent) {
            phone = getIFrameEndpoint();
            phone.initialize();
        } else {
            phone = new ParentEndpoint(targetWindow, targetOrigin);
        }
    }

    phone.addListener(namespace, function(message) {
        var callbackObj;

        if (message.messageType === 'call' && typeof this.handler === 'function') {
            this.handler.call(undefined, message.value, function(returnValue) {
                phone.post(namespace, {
                    messageType: 'returnValue',
                    uuid: message.uuid,
                    value: returnValue
                });
            });
        } else if (message.messageType === 'returnValue') {
            callbackObj = pendingCallbacks[message.uuid];

            if (callbackObj) {
                window.clearTimeout(callbackObj.timeout);
                if (callbackObj.callback) {
                    callbackObj.callback.call(undefined, message.value);
                }
                pendingCallbacks[message.uuid] = null;
            }
        }
    }.bind(this));

    function call(message, callback) {
        var uuid = getPseudoUUID();

        pendingCallbacks[uuid] = {
            callback: callback,
            timeout: window.setTimeout(function() {
                if (callback) {
                    callback(undefined, new Error("IframePhone timed out waiting for reply"));
                }
            }, 2000)
        };

        phone.post(namespace, {
            messageType: 'call',
            uuid: uuid,
            value: message
        });
    }

    function disconnect() {
        phone.disconnect();
    }

    this.handler = handler;
    this.call = call.bind(this);
    this.disconnect = disconnect.bind(this);
};

},{"./iframe-endpoint":9,"./parent-endpoint":11}],11:[function(require,module,exports){
var structuredClone = require('./structured-clone');

/**
  Call as:
    new ParentEndpoint(targetWindow, targetOrigin, afterConnectedCallback)
      targetWindow is a WindowProxy object. (Messages will be sent to it)

      targetOrigin is the origin of the targetWindow. (Messages will be restricted to this origin)

      afterConnectedCallback is an optional callback function to be called when the connection is
        established.

  OR (less secure):
    new ParentEndpoint(targetIframe, afterConnectedCallback)

      targetIframe is a DOM object (HTMLIframeElement); messages will be sent to its contentWindow.

      afterConnectedCallback is an optional callback function

    In this latter case, targetOrigin will be inferred from the value of the src attribute of the
    provided DOM object at the time of the constructor invocation. This is less secure because the
    iframe might have been navigated to an unexpected domain before constructor invocation.

  Note that it is important to specify the expected origin of the iframe's content to safeguard
  against sending messages to an unexpected domain. This might happen if our iframe is navigated to
  a third-party URL unexpectedly. Furthermore, having a reference to Window object (as in the first
  form of the constructor) does not protect against sending a message to the wrong domain. The
  window object is actualy a WindowProxy which transparently proxies the Window object of the
  underlying iframe, so that when the iframe is navigated, the "same" WindowProxy now references a
  completely differeent Window object, possibly controlled by a hostile domain.

  See http://www.esdiscuss.org/topic/a-dom-use-case-that-can-t-be-emulated-with-direct-proxies for
  more about this weird behavior of WindowProxies (the type returned by <iframe>.contentWindow).
*/

module.exports = function ParentEndpoint(targetWindowOrIframeEl, targetOrigin, afterConnectedCallback) {
  var selfOrigin = window.location.href.match(/(.*?\/\/.*?)\//)[1];
  var postMessageQueue = [];
  var connected = false;
  var handlers = {};
  var targetWindowIsIframeElement;

  function getOrigin(iframe) {
    return iframe.src.match(/(.*?\/\/.*?)\//)[1];
  }

  function post(type, content) {
    var message;
    // Message object can be constructed from 'type' and 'content' arguments or it can be passed
    // as the first argument.
    if (arguments.length === 1 && typeof type === 'object' && typeof type.type === 'string') {
      message = type;
    } else {
      message = {
        type: type,
        content: content
      };
    }
    if (connected) {
      var tWindow = getTargetWindow();
      // if we are laready connected ... send the message
      message.origin = selfOrigin;
      // See http://dev.opera.com/articles/view/window-postmessage-messagechannel/#crossdoc
      //     https://github.com/Modernizr/Modernizr/issues/388
      //     http://jsfiddle.net/ryanseddon/uZTgD/2/
      if (structuredClone.supported()) {
        tWindow.postMessage(message, targetOrigin);
      } else {
        tWindow.postMessage(JSON.stringify(message), targetOrigin);
      }
    } else {
      // else queue up the messages to send after connection complete.
      postMessageQueue.push(message);
    }
  }

  function addListener(messageName, func) {
    handlers[messageName] = func;
  }

  function removeListener(messageName) {
    handlers[messageName] = null;
  }

  // Note that this function can't be used when IFrame element hasn't been added to DOM yet
  // (.contentWindow would be null). At the moment risk is purely theoretical, as the parent endpoint
  // only listens for an incoming 'hello' message and the first time we call this function
  // is in #receiveMessage handler (so iframe had to be initialized before, as it could send 'hello').
  // It would become important when we decide to refactor the way how communication is initialized.
  function getTargetWindow() {
    if (targetWindowIsIframeElement) {
      var tWindow = targetWindowOrIframeEl.contentWindow;
      if (!tWindow) {
        throw "IFrame element needs to be added to DOM before communication " +
              "can be started (.contentWindow is not available)";
      }
      return tWindow;
    }
    return targetWindowOrIframeEl;
  }

  function receiveMessage(message) {
    var messageData;
    if (message.source === getTargetWindow() && message.origin === targetOrigin) {
      messageData = message.data;
      if (typeof messageData === 'string') {
        messageData = JSON.parse(messageData);
      }
      if (handlers[messageData.type]) {
        handlers[messageData.type](messageData.content);
      } else {
        console.log("cant handle type: " + messageData.type);
      }
    }
  }

  function disconnect() {
    connected = false;
    window.removeEventListener('message', receiveMessage);
  }

  // handle the case that targetWindowOrIframeEl is actually an <iframe> rather than a Window(Proxy) object
  // Note that if it *is* a WindowProxy, this probe will throw a SecurityException, but in that case
  // we also don't need to do anything
  try {
    targetWindowIsIframeElement = targetWindowOrIframeEl.constructor === HTMLIFrameElement;
  } catch (e) {
    targetWindowIsIframeElement = false;
  }

  if (targetWindowIsIframeElement) {
    // Infer the origin ONLY if the user did not supply an explicit origin, i.e., if the second
    // argument is empty or is actually a callback (meaning it is supposed to be the
    // afterConnectionCallback)
    if (!targetOrigin || targetOrigin.constructor === Function) {
      afterConnectedCallback = targetOrigin;
      targetOrigin = getOrigin(targetWindowOrIframeEl);
    }
  }

  // when we receive 'hello':
  addListener('hello', function() {
    connected = true;

    // send hello response
    post('hello');

    // give the user a chance to do things now that we are connected
    // note that is will happen before any queued messages
    if (afterConnectedCallback && typeof afterConnectedCallback === "function") {
      afterConnectedCallback();
    }

    // Now send any messages that have been queued up ...
    while(postMessageQueue.length > 0) {
      post(postMessageQueue.shift());
    }
  });

  window.addEventListener('message', receiveMessage, false);

  // Public API.
  return {
    post: post,
    addListener: addListener,
    removeListener: removeListener,
    disconnect: disconnect,
    getTargetWindow: getTargetWindow,
    targetOrigin: targetOrigin
  };
};

},{"./structured-clone":12}],12:[function(require,module,exports){
var featureSupported = false;

(function () {
  var result = 0;

  if (!!window.postMessage) {
    try {
      // Safari 5.1 will sometimes throw an exception and sometimes won't, lolwut?
      // When it doesn't we capture the message event and check the
      // internal [[Class]] property of the message being passed through.
      // Safari will pass through DOM nodes as Null iOS safari on the other hand
      // passes it through as DOMWindow, gotcha.
      window.onmessage = function(e){
        var type = Object.prototype.toString.call(e.data);
        result = (type.indexOf("Null") != -1 || type.indexOf("DOMWindow") != -1) ? 1 : 0;
        featureSupported = {
          'structuredClones': result
        };
      };
      // Spec states you can't transmit DOM nodes and it will throw an error
      // postMessage implimentations that support cloned data will throw.
      window.postMessage(document.createElement("a"),"*");
    } catch(e) {
      // BBOS6 throws but doesn't pass through the correct exception
      // so check error message
      result = (e.DATA_CLONE_ERR || e.message == "Cannot post cyclic structures.") ? 1 : 0;
      featureSupported = {
        'structuredClones': result
      };
    }
  }
}());

exports.supported = function supported() {
  return featureSupported && featureSupported.structuredClones > 0;
};

},{}],13:[function(require,module,exports){
module.exports = {
  /**
   * Allows to communicate with an iframe.
   */
  ParentEndpoint:  require('./lib/parent-endpoint'),
  /**
   * Allows to communicate with a parent page.
   * IFrameEndpoint is a singleton, as iframe can't have multiple parents anyway.
   */
  getIFrameEndpoint: require('./lib/iframe-endpoint'),
  structuredClone: require('./lib/structured-clone'),

  // TODO: May be misnamed
  IframePhoneRpcEndpoint: require('./lib/iframe-phone-rpc-endpoint')

};

},{"./lib/iframe-endpoint":9,"./lib/iframe-phone-rpc-endpoint":10,"./lib/parent-endpoint":11,"./lib/structured-clone":12}]},{},[1]);