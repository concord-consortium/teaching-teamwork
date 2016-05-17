var Connector = require('../../models/shared/connector'),
    Board = require('../../models/shared/board'),
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
          new Board({number: 0, bezierReflectionModifier: 1, components: {}, connectors: {input: board0Input, output: board0Output}}),
          new Board({number: 1, bezierReflectionModifier: -0.5, components: {}, connectors: {input: board1Input, output: board1Output}})
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
      demo: window.location.search.indexOf('demo') !== -1,
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
    this.setState({addedAllChipsAndWires: !this.state.addedAllChipsAndWires});
  },

  updateWatchedBoard: function (board, boardInfo) {
    var wires;

    // update the wires
    wires = (boardInfo ? boardInfo.wires : null) || [];
    board.updateWires(wires);
  },

  checkIfCircuitIsCorrect: function () {
    // TODO
  },

  render: function () {
    return div({},
      h1({}, "Teaching Teamwork Logic Gates Activity"),
      this.state.currentUser ? h2({}, "Circuit " + (this.state.currentBoard + 1) + " (User: " + this.state.currentUser + ", Group: " + this.state.currentGroup + ")") : null,
      WeGotItView({currentUser: this.state.currentUser, checkIfCircuitIsCorrect: this.checkIfCircuitIsCorrect}),
      div({id: 'logicapp'},
        WorkspaceView({constants: constants, boards: this.state.boards, users: this.state.users, userBoardNumber: this.state.userBoardNumber}),
        this.state.demo ? DemoControlView({toggleAllChipsAndWires: this.toggleAllChipsAndWires, addedAllChipsAndWires: this.state.addedAllChipsAndWires}) : null,
        SidebarChatView({numClients: 2, top: this.state.demo ? 75 : 0})
      )
    );
  }
});
