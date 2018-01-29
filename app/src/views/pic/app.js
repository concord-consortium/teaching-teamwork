var Connector = require('../../models/shared/connector'),
    Board = require('../../models/shared/board'),
    Keypad = require('../../models/pic/keypad'),
    PIC = require('../../models/pic/pic'),
    LED = require('../../models/pic/led'),
    CircuitResolver = require('../../models/shared/circuit-resolver'),
    picCode = require('../../data/pic/pic-code'),
    boardWatcher = require('../../controllers/pic/board-watcher'),
    userController = require('../../controllers/shared/user'),
    logController = require('../../controllers/shared/log'),
    WeGotItView = React.createFactory(require('../shared/we-got-it')),
    WorkspaceView = React.createFactory(require('./workspace')),
    SimulatorControlView = React.createFactory(require('./simulator-control')),
    AutoWiringView = React.createFactory(require('./auto-wiring')),
    SidebarChatView = React.createFactory(require('../shared/sidebar-chat')),
    WireControlsView = React.createFactory(require('../shared/wire-controls')),
    OfflineCheckView = React.createFactory(require('../shared/offline-check')),
    VersionView = React.createFactory(require('../shared/version')),
    ReportView = React.createFactory(require('../shared/report')),
    events = require('../shared/events'),
    constants = require('./constants'),
    colors = require('../shared/colors'),
    inIframe = require('../../data/shared/in-iframe'),
    div = React.DOM.div,
    h1 = React.DOM.h1,
    h2 = React.DOM.h2;

module.exports = React.createClass({
  displayName: 'AppView',

  hasUrlOption: function (option) {
    return window.location.search.indexOf(option) !== -1;
  },

  getInitialState: function () {
    var numBoards = 3,
        busSize = 8,
        bezierReflectionModifiers = [1, -0.5, 0.75],
        components = [],
        connectors = [],
        boards = [],
        i, setBoard;

    this.circuitResolver = new CircuitResolver({busSize: busSize, busInputSize: 0, busOutputSize: 0});

    setBoard = function (hash, board) {
      var keys = Object.keys(hash),
          i;
      for (i = 0; i < keys.length; i++) {
        hash[keys[i]].board = board;
      }
    };

    for (i = 0; i < numBoards; i++) {
      connectors.push({
        bus: new Connector({type: 'bus', count: busSize}),
        input: new Connector({type: 'input', count: 8}),
        output: new Connector({type: 'output', count: 8})
      });

      switch (i) {
        case 0:
          components.push({
            keypad: new Keypad(),
            pic: new PIC({code: picCode[0]})
          });
          break;
        case 1:
          components.push({
            pic: new PIC({code: picCode[1]})
          });
          break;
        case 2:
          components.push({
            pic: new PIC({code: picCode[2]}),
            led: new LED()
          });
          break;
      }

      boards.push(new Board({
        number: i,
        bezierReflectionModifier: bezierReflectionModifiers[i],
        components: components[i],
        connectors: connectors[i],
        fixedComponents: true,
        resolver: this.circuitResolver,
        allBoards: boards
      }));

      setBoard(components[i], boards[i]);
      setBoard(connectors[i], boards[i]);
    }

    this.circuitResolver.boards = boards;
    this.circuitResolver.updateComponents();

    return {
      boards: boards,
      running: true,
      showPinColors: this.hasUrlOption('showPinColors'),
      showBusColors: this.hasUrlOption('showBusColors'),
      showAutoWiring: this.hasUrlOption('allowAutoWiring'),
      showSimulator: this.hasUrlOption('showSimulator'),
      showWireControls: this.hasUrlOption('wireSettings'),
      soloMode: this.hasUrlOption('soloMode'),
      showBusLabels: this.hasUrlOption('showBusLabels'),
      showProbe: this.hasUrlOption('showProbeInEdit') ? 'edit' : this.hasUrlOption('hideProbe') ? false : 'all',
      showInputAutoToggles: !this.hasUrlOption('hideInputAutoToggles'),
      userBoardNumber: -1,
      users: {},
      currentBoard: 0,
      currentUser: null,
      currentGroup: null,
      wireSettings: {color: colors.wire, curvyness: 0.25},
      inIframe: inIframe(),
      showReport: this.hasUrlOption('report')
    };
  },

  componentDidMount: function() {
    var activityName = 'pic',
        self = this;

    if (this.state.showReport) {
      return;
    }

    logController.init(activityName);

    if (this.state.soloMode) {
      logController.setClientNumber(0);
    }
    else {
      boardWatcher.addListener(this.state.boards[0], this.updateWatchedBoard);
      boardWatcher.addListener(this.state.boards[1], this.updateWatchedBoard);
      boardWatcher.addListener(this.state.boards[2], this.updateWatchedBoard);

      userController.init(3, activityName, function(userBoardNumber) {
        var users = self.state.users,
            currentUser = userController.getUsername();

        userBoardNumber = parseInt(userBoardNumber, 10);
        users[userBoardNumber] = {
          name: currentUser
        };

        logController.setClientNumber(userBoardNumber);

        self.setState({
          userBoardNumber: userBoardNumber,
          users: users,
          currentUser: currentUser,
          currentGroup: userController.getGroupname(),
          currentBoard: userBoardNumber
        });

        userController.onGroupRefCreation(function() {
          boardWatcher.startListeners(3);
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
    }

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

  forceRerender: function () {
    this.setState({boards: this.state.boards});
  },

  updateWatchedBoard: function (board, boardInfo) {
    var wires, inputs;

    if (boardInfo && board.components.keypad) {
      board.components.keypad.selectButtonValue(boardInfo.button);
    }

    // update the wires
    wires = (boardInfo && boardInfo.layout ? boardInfo.layout.wires : null) || [];
    board.updateWires(wires);

    // update the inputs
    inputs = (boardInfo && boardInfo.layout ? boardInfo.layout.inputs : null) || [];
    board.updateInputs(inputs);
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
          boards[j].components.pic.evaluateRemainingPICInstructions();
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
    events.logEvent(events.RESET_EVENT);
  },

  run: function (run, skipLogging) {
    clearInterval(this.simulatorInterval);
    if (run) {
      this.simulatorInterval = setInterval(this.simulate, 100);
    }
    this.setState({running: run});
    if (!skipLogging) {
      events.logEvent(run ? events.RUN_EVENT : events.STOP_EVENT);
    }
  },

  step: function () {
    this.simulate(true);
    events.logEvent(events.STEP_EVENT);
  },

  toggleAllWires: function () {
    var defaultColor = colors.wire,

        b0 = this.state.boards[0],
        b0Keypad = b0.components.keypad.pinMap,
        b0PIC = b0.components.pic.pinMap,
        b0Bus = b0.connectors.bus.holes,

        b1 = this.state.boards[1],
        b1PIC = b1.components.pic.pinMap,
        b1Bus = b1.connectors.bus.holes,

        b2 = this.state.boards[2],
        b2PIC = b2.components.pic.pinMap,
        b2LED = b2.components.led.pinMap,
        b2Bus = b2.connectors.bus.holes,
        wire, boardWires, i, j, hasWires;

    boardWires = [
      [
        {source: b0Keypad.COL0, dest: b0PIC.RB0, color: defaultColor},
        {source: b0Keypad.COL1, dest: b0PIC.RB1, color: defaultColor},
        {source: b0Keypad.COL2, dest: b0PIC.RB2, color: defaultColor},
        {source: b0Keypad.ROW0, dest: b0PIC.RB3, color: defaultColor},
        {source: b0Keypad.ROW1, dest: b0PIC.RB4, color: defaultColor},
        {source: b0Keypad.ROW2, dest: b0PIC.RB5, color: defaultColor},
        {source: b0Keypad.ROW3, dest: b0PIC.RB6, color: defaultColor},
        {source: b0PIC.RA0, dest: b0Bus[0], color: b0Bus[0].color},
        {source: b0PIC.RA1, dest: b0Bus[1], color: b0Bus[1].color},
        {source: b0PIC.RA2, dest: b0Bus[2], color: b0Bus[2].color},
        {source: b0PIC.RA3, dest: b0Bus[3], color: b0Bus[3].color}
      ],
      [
        {source: b1Bus[0], dest: b1PIC.RB0, color: b1Bus[0].color},
        {source: b1Bus[1], dest: b1PIC.RB1, color: b1Bus[1].color},
        {source: b1Bus[2], dest: b1PIC.RB2, color: b1Bus[2].color},
        {source: b1Bus[3], dest: b1PIC.RB3, color: b1Bus[3].color},
        {source: b1PIC.RA0, dest: b1Bus[4], color: b1Bus[4].color},
        {source: b1PIC.RA1, dest: b1Bus[5], color: b1Bus[5].color},
        {source: b1PIC.RA2, dest: b1Bus[6], color: b1Bus[6].color},
        {source: b1PIC.RA3, dest: b1Bus[7], color: b1Bus[7].color}
      ],
      [
        {source: b2Bus[4], dest: b2PIC.RA0, color: b2Bus[4].color},
        {source: b2Bus[5], dest: b2PIC.RA1, color: b2Bus[5].color},
        {source: b2Bus[6], dest: b2PIC.RA2, color: b2Bus[6].color},
        {source: b2Bus[7], dest: b2PIC.RA3, color: b2Bus[7].color},
        {source: b2PIC.RB0, dest: b2LED.a, color: defaultColor},
        {source: b2PIC.RB1, dest: b2LED.b, color: defaultColor},
        {source: b2PIC.RB2, dest: b2LED.c, color: defaultColor},
        {source: b2PIC.RB3, dest: b2LED.d, color: defaultColor},
        {source: b2PIC.RB4, dest: b2LED.e, color: defaultColor},
        {source: b2PIC.RB5, dest: b2LED.f, color: defaultColor},
        {source: b2PIC.RB6, dest: b2LED.g, color: defaultColor}
      ]
    ];

    // check if any have wires
    hasWires = false;
    for (i = 0; i < this.state.boards.length; i++) {
      hasWires = hasWires || (this.state.boards[i].wires.length > 0);
    }

    for (i = 0; i < this.state.boards.length; i++) {
      this.state.boards[i].clear();
      if (!hasWires) {
        for (j = 0; j < boardWires[i].length; j++) {
          wire = boardWires[i][j];
          // add the wire without resolving the circuits
          this.state.boards[i].addWire(wire.source, wire.dest, wire.color, true);
        }
      }
      boardWatcher.circuitChanged(this.state.boards[i]);
    }

    // rewire and resolve
    this.circuitResolver.rewire();

    this.setState({boards: this.state.boards});
  },

  updateWireSettings: function (newSettings) {
    this.setState({wireSettings: newSettings});
  },

  render: function () {
    var autoWiringTop = this.state.showSimulator ? 75 : 0,
        sidebarTop = autoWiringTop + (this.state.showAutoWiring ? 75 : 0);

    if (this.state.showReport) {
      return ReportView({});
    }
    else {
      return div({},
        this.state.showWireControls ? WireControlsView({wireSettings: this.state.wireSettings, updateWireSettings: this.updateWireSettings}) : null,
        this.state.inIframe ? null : h1({}, "Teaching Teamwork PIC Activity"),
        this.state.currentUser ? h2({}, "Circuit " + (this.state.currentBoard + 1) + " (User: " + this.state.currentUser + ", Group: " + this.state.currentGroup + ")") : null,
        OfflineCheckView({}),
        WeGotItView({currentUser: this.state.currentUser, checkIfCircuitIsCorrect: this.checkIfCircuitIsCorrect, soloMode: this.state.soloMode}),
        div({id: 'picapp'},
          WorkspaceView({
            constants: constants,
            boards: this.state.boards,
            stepping: !this.state.running,
            users: this.state.users,
            userBoardNumber: this.state.userBoardNumber,
            wireSettings: this.state.wireSettings,
            forceRerender: this.forceRerender,
            soloMode: this.state.soloMode,
            showPinColors: this.state.showPinColors,
            showBusLabels: this.state.showBusLabels,
            showProbe: this.state.showProbe,
            showBusColors: this.state.showBusColors,
            showInputAutoToggles: this.state.showInputAutoToggles
          }),
          this.state.showSimulator ? SimulatorControlView({running: this.state.running, run: this.run, step: this.step, reset: this.reset}) : null,
          this.state.showAutoWiring ? AutoWiringView({top: autoWiringTop, running: this.state.running, toggleAllWires: this.toggleAllWires}) : null,
          this.state.soloMode ? null : SidebarChatView({numClients: 3, top: sidebarTop})
        ),
        VersionView({})
      );
    }
  }
});
