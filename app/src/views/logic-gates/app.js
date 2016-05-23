var Connector = require('../../models/shared/connector'),
    Board = require('../../models/shared/board'),
    LogicChip =  require('../../models/logic-gates/logic-chip'),
    boardWatcher = require('../../controllers/pic/board-watcher'),
    userController = require('../../controllers/shared/user'),
    logController = require('../../controllers/shared/log'),
    SidebarChatView = React.createFactory(require('../shared/sidebar-chat')),
    DemoControlView = React.createFactory(require('./demo-control')),
    WeGotItView = React.createFactory(require('../shared/we-got-it')),
    WorkspaceView = React.createFactory(require('./workspace')),
    constants = require('./constants'),
    div = React.DOM.div,
    h1 = React.DOM.h1,
    h2 = React.DOM.h2;

module.exports = React.createClass({
  displayName: 'AppView',

  getInitialState: function () {
    var board0Input = new Connector({type: 'input', count: 4}),
        board0Output = new Connector({type: 'output', count: 4}),
        board1Input = new Connector({type: 'input', count: 4}),
        board1Output = new Connector({type: 'output', count: 4}),
        boards = [
          new Board({number: 0, bezierReflectionModifier: -0.5, components: {l1: new LogicChip({type: '7408', layout: {x: 50, y: 100, width: 150, height: 75}})}, connectors: {input: board0Input, output: board0Output}}),
          new Board({number: 1, bezierReflectionModifier: -0.5, components: {l1: new LogicChip({type: '7432', layout: {x: 50, y: 100, width: 150, height: 75}})}, connectors: {input: board1Input, output: board1Output}})
        ];

    board0Output.connectsTo = board1Input;
    board1Input.connectsTo = board0Output;

    board0Input.board = boards[0];
    board0Output.board = boards[0];
    board1Input.board = boards[1];
    board1Output.board = boards[1];

    boards[0].allBoards = boards;
    boards[1].allBoards = boards;

    return {
      boards: boards,
      showDemo: window.location.search.indexOf('demo') !== -1,
      addedAllWires: false,
      addedAllChips: false,
      userBoardNumber: -1,
      users: {},
      currentBoard: 0,
      currentUser: null,
      currentGroup: null
    };
  },

  componentDidMount: function() {
    var activityName = 'logic-gates',
        self = this;

    boardWatcher.addListener(this.state.boards[0], this.updateWatchedBoard);
    boardWatcher.addListener(this.state.boards[1], this.updateWatchedBoard);

    logController.init(activityName);
    userController.init(2, activityName, function(userBoardNumber) {
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
  },

  toggleAllChipsAndWires: function () {
    var b0 = this.state.boards[0],
        b0chip = b0.components.l1.pins,
        b0i = b0.connectors.input.holes,
        b0o = b0.connectors.output.holes,

        b1 = this.state.boards[1],
        b1chip = b1.components.l1.pins,
        b1o = b1.connectors.output.holes,
        b1i = b1.connectors.input.holes,

        wire, boardWires, i, j;

    boardWires = [
      [
        {source: b0i[0], dest: b0chip[12], color: b0i[0].color},
        {source: b0i[1], dest: b0chip[1], color: b0i[1].color},
        {source: b0i[2], dest: b0chip[0], color: b0i[2].color},
        {source: b0i[3], dest: b0chip[11], color: b0i[3].color},

        {source: b0chip[2], dest: b0o[0], color: b0o[0].color},
        {source: b0chip[10], dest: b0o[3], color: b0o[3].color}
      ],
      [
        {source: b1i[0], dest: b1chip[0], color: b1i[0].color},
        {source: b1i[3], dest: b1chip[1], color: b1i[3].color},

        {source: b1chip[2], dest: b1o[0], color: b1o[0].color}
      ]
    ];

    for (i = 0; i < this.state.boards.length; i++) {
      this.state.boards[i].clear();
      if (!this.state.addedAllChipsAndWires) {
        for (j = 0; j < boardWires[i].length; j++) {
          wire = boardWires[i][j];
          this.state.boards[i].addWire(wire.source, wire.dest, wire.color);
        }
      }
      boardWatcher.circuitChanged(this.state.boards[i]);
    }

    this.setState({addedAllChipsAndWires: !this.state.addedAllChipsAndWires});
  },

  updateWatchedBoard: function (board, boardInfo) {
    var wires;

    // update the wires
    wires = (boardInfo ? boardInfo.wires : null) || [];
    board.updateWires(wires);
  },

  checkIfCircuitIsCorrect: function (callback) {
    var self = this,
        tests = [
          {input: [0, 0, 1, 1], output: [0, 'x', 'x', 'x']},
          {input: [0, 1, 1, 0], output: [1, 'x', 'x', 'x']},
          {input: [1, 0, 0, 1], output: [1, 'x', 'x', 'x']},
          {input: [1, 1, 0, 0], output: [0, 'x', 'x', 'x']}
        ],
        truthTable = [],
        allCorrect = true,
        runTest, i;

    runTest = function (test, truthTable) {
      var boards = self.state.boards,
          numBoards = boards.length,
          allCorrect = true,
          i, j, output, outputValues, correct, dontCare;

      for (i = 0; i < numBoards; i++) {
        boards[i].reset();
      }

      // set the input connector pins
      boards[0].connectors.input.setHoleValues(test.input);

      // evaluate all the logic-chips in all the boards so the values propogate
      for (i = 0; i < numBoards; i++) {
        for (j = 0; j < boards[i].numComponents; j++) {
          boards[i].resolveIOValues();
        }
      }

      // test the output connector pins
      outputValues = boards[1].connectors.output.getHoleValues();
      output = [];
      for (i = 0; i < test.output.length; i++) {
        dontCare = test.output[i] == 'x';
        correct = dontCare || (test.output[i] == outputValues[i]);
        output.push(dontCare ? 'x' : outputValues[i]);
        allCorrect = allCorrect && correct;
      }

      truthTable.push({
        input: test.input,
        output: output
      });

      return allCorrect;
    };

    // check each test
    for (i = 0; i < tests.length; i++) {
      allCorrect = runTest(tests[i], truthTable) && allCorrect;
    }

    callback(allCorrect, truthTable);
  },

  render: function () {
    return div({},
      h1({}, "Teaching Teamwork Logic Gates Activity"),
      this.state.currentUser ? h2({}, "Circuit " + (this.state.currentBoard + 1) + " (User: " + this.state.currentUser + ", Group: " + this.state.currentGroup + ")") : null,
      WeGotItView({currentUser: this.state.currentUser, checkIfCircuitIsCorrect: this.checkIfCircuitIsCorrect}),
      div({id: 'logicapp'},
        WorkspaceView({constants: constants, boards: this.state.boards, users: this.state.users, userBoardNumber: this.state.userBoardNumber}),
        this.state.showDemo ? DemoControlView({top: 0, toggleAllChipsAndWires: this.toggleAllChipsAndWires, addedAllChipsAndWires: this.state.addedAllChipsAndWires}) : null,
        SidebarChatView({numClients: 2, top: this.state.showDemo ? 75 : 0})
      )
    );
  }
});
