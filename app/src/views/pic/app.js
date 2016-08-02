var Connector = require('../../models/shared/connector'),
    Board = require('../../models/shared/board'),
    Keypad = require('../../models/pic/keypad'),
    PIC = require('../../models/pic/pic'),
    LED = require('../../models/pic/led'),
    picCode = require('../../data/pic/pic-code'),
    boardWatcher = require('../../controllers/pic/board-watcher'),
    userController = require('../../controllers/shared/user'),
    logController = require('../../controllers/shared/log'),
    WeGotItView = React.createFactory(require('../shared/we-got-it')),
    WorkspaceView = React.createFactory(require('./workspace')),
    SimulatorControlView = React.createFactory(require('./simulator-control')),
    DemoControlView = React.createFactory(require('./demo-control')),
    SidebarChatView = React.createFactory(require('../shared/sidebar-chat')),
    WireControlsView = React.createFactory(require('../shared/wire-controls')),
    OfflineCheckView = React.createFactory(require('../shared/offline-check')),
    events = require('../shared/events'),
    constants = require('./constants'),
    div = React.DOM.div,
    h1 = React.DOM.h1,
    h2 = React.DOM.h2;

module.exports = React.createClass({
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

    board0Output.setConnectsTo(board1Input);
    board1Input.setConnectsTo(board0Output);
    board1Output.setConnectsTo(board2Input);
    board2Input.setConnectsTo(board1Output);

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
      showDemo: window.location.search.indexOf('demo') !== -1,
      showSimulator: window.location.search.indexOf('simulator') !== -1,
      showWireControls: window.location.search.indexOf('wireSettings') !== -1,
      userBoardNumber: -1,
      users: {},
      currentBoard: 0,
      currentUser: null,
      currentGroup: null,
      wireSettings: {color: '#ddd', curvyness: 0.25}
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

      logController.setClientNumber(userBoardNumber);

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
    var defaultColor = '#ddd',

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

  updateWireSettings: function (newSettings) {
    this.setState({wireSettings: newSettings});
  },

  render: function () {
    var demoTop = this.state.showSimulator ? 75 : 0,
        sidebarTop = demoTop + (this.state.showDemo ? 75 : 0);

    return div({},
      this.state.showWireControls ? WireControlsView({wireSettings: this.state.wireSettings, updateWireSettings: this.updateWireSettings}) : null,
      h1({}, "Teaching Teamwork PIC Activity"),
      this.state.currentUser ? h2({}, "Circuit " + (this.state.currentBoard + 1) + " (User: " + this.state.currentUser + ", Group: " + this.state.currentGroup + ")") : null,
      WeGotItView({currentUser: this.state.currentUser, checkIfCircuitIsCorrect: this.checkIfCircuitIsCorrect}),
      div({id: 'picapp'},
        WorkspaceView({constants: constants, boards: this.state.boards, stepping: !this.state.running, showDebugPins: this.state.showDebugPins, users: this.state.users, userBoardNumber: this.state.userBoardNumber, wireSettings: this.state.wireSettings}),
        this.state.showSimulator ? SimulatorControlView({running: this.state.running, run: this.run, step: this.step, reset: this.reset}) : null,
        this.state.showDemo ? DemoControlView({top: demoTop, running: this.state.running, toggleAllWires: this.toggleAllWires, toggleDebugPins: this.toggleDebugPins, showDebugPins: this.state.showDebugPins, addedAllWires: this.state.addedAllWires}) : null,
        SidebarChatView({numClients: 3, top: sidebarTop})
      ),
      OfflineCheckView({})
    );
  }
});
