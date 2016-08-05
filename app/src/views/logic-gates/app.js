var Connector = require('../../models/shared/connector'),
    Board = require('../../models/shared/board'),
    TTL = require('../../models/shared/ttl'),
    LogicChip =  require('../../models/logic-gates/logic-chip'),
    //LogicChip =  require('../../models/logic-gates/logic-chip'),
    boardWatcher = require('../../controllers/pic/board-watcher'),
    userController = require('../../controllers/shared/user'),
    logController = require('../../controllers/shared/log'),
    SidebarChatView = React.createFactory(require('../shared/sidebar-chat')),
    WeGotItView = React.createFactory(require('../shared/we-got-it')),
    WorkspaceView = React.createFactory(require('./workspace')),
    OfflineCheckView = React.createFactory(require('../shared/offline-check')),
    DemoControlView = React.createFactory(require('./demo-control')),
    constants = require('./constants'),
    div = React.DOM.div,
    h1 = React.DOM.h1,
    h2 = React.DOM.h2;

module.exports = React.createClass({
  displayName: 'AppView',

  getInitialState: function () {
    var boards = [
          new Board({
            number: 0,
            bezierReflectionModifier: -0.5,
            components: {},
            connectors: {}
          }),
          new Board({
            number: 1,
            bezierReflectionModifier: -0.5,
            components: {},
            connectors: {}
          })
        ];

    boards[0].allBoards = boards;
    boards[1].allBoards = boards;

    return {
      boards: boards,
      userBoardNumber: -1,
      users: {},
      currentBoard: 0,
      currentUser: null,
      currentGroup: null,
      activity: null,
      showDemo: window.location.search.indexOf('demo') !== -1,
      showDebugPins: false,
      toggledAllChipsAndWires: false,
      hasDemoData: false
    };
  },

  componentDidMount: function() {
    this.loadActivity(window.location.hash.substring(1) || 'single-xor');
  },

  loadActivity: function(activityName) {
    var self = this,
        matches = activityName.match(/^((local):(.+)|(remote):([^/]+)\/(.+))$/),
        setStateAndParseAndStartActivity = function (jsonData) {
          if (jsonData) {
            editorState.text = jsonData;
            self.setState({editorState: editorState});
            var parsedData = self.parseActivity(activityName, jsonData);
            if (parsedData) {
              self.startActivity(activityName, parsedData);
            }
          }
        },
        editorState;

    if (matches && (matches[2] == 'local')) {
      editorState = {via: 'local', filename: matches[3]};

      var rawData = localStorage.getItem(activityName);
      if (rawData) {
        setStateAndParseAndStartActivity(rawData);
      }
      else {
        alert("Could not find LOCAL activity at " + activityName);
      }
    }
    else if (matches && (matches[4] == 'remote')) {
      editorState = {via: 'user ' + matches[5], filename: matches[6], username: matches[5]};

      var url = editorState.username + '/' + editorState.filename,
          firebase = new Firebase('https://teaching-teamwork.firebaseio.com/dev/activities/' + url);
      firebase.once('value', function (snapshot) {
        var jsonData = snapshot.val();
        if (jsonData) {
          setStateAndParseAndStartActivity(jsonData);
        }
        else {
          alert("No data found for REMOTE activity at " + url);
        }
      }, function () {
        alert("Could not find REMOTE activity at " + url);
      });
    }
    else {
      editorState = {via: 'server', filename: activityName};

      var activityUrl = '../activities/logic-gates/' + activityName + ".json";

      var request = new XMLHttpRequest();
      request.open('GET', activityUrl, true);

      request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
          setStateAndParseAndStartActivity(request.responseText);
        } else {
          alert("Could not find activity at "+activityUrl);
        }
      };

      request.send();
    }
  },

  parseAndStartActivity: function (activityName, rawData) {
    var parsedData = this.parseActivity(activityName, rawData);
    if (parsedData) {
      this.startActivity(activityName, parsedData);
    }
  },

  parseActivity: function (activityName, rawData) {
    try {
      return JSON.parse(rawData);
    }
    catch (e) {
      alert('Unable to parse JSON for ' + activityName);
      return null;
    }
  },

  startActivity: function (activityName, activity) {
    var self = this,
        hasDemoData = false,
        i;

    this.setupConnectors(activity);

    for (i = 0; i < activity.boards.length; i++) {
      if (activity.boards[i].demo) {
        hasDemoData = true;
        break;
      }
    }

    this.setState({
      activity: activity,
      hasDemoData: hasDemoData
    });

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

  setupConnectors: function (activity) {
    var board0Input = new Connector({type: 'input', count: activity.input.length, labels: activity.input}),
        board0Output = new Connector({type: 'output', count: activity.ribbon.length, labels: activity.ribbon}),
        board1Input = new Connector({type: 'input', count: activity.ribbon.length, labels: activity.ribbon}),
        board1Output = new Connector({type: 'output', count: activity.output.length, labels: activity.output}),
        boards = this.state.boards;

    boards[0].setConnectors({input: board0Input, output: board0Output});
    boards[1].setConnectors({input: board1Input, output: board1Output});

    board0Output.setConnectsTo(board1Input);
    board1Input.setConnectsTo(board0Output);

    board0Input.board = boards[0];
    board0Output.board = boards[0];
    board1Input.board = boards[1];
    board1Output.board = boards[1];

    this.setState({boards: boards});
  },

  componentWillUnmount: function () {
    boardWatcher.removeListener(this.state.boards[0], this.updateWatchedBoard);
    boardWatcher.removeListener(this.state.boards[1], this.updateWatchedBoard);
  },

  updateWatchedBoard: function (board, boardInfo) {
    var wires, components;

    // update the components
    components = (boardInfo && boardInfo.layout ? boardInfo.layout.components : null) || [];
    board.updateComponents(components);

    // update the wires
    wires = (boardInfo && boardInfo.layout ? boardInfo.layout.wires : null) || [];
    board.updateWires(wires);

    board.resolveIOVoltages();

    this.setState({boards: this.state.boards});
  },

  checkIfCircuitIsCorrect: function (callback) {
    var self = this,
        truthTable = [],
        allCorrect = true,
        boards = this.state.boards,
        numBoards = boards.length,
        generateTests, runTest, resetBoards, resolveBoards, i, tests;

    generateTests = function () {
      var truthTable = self.state.activity.truthTable,
          header = truthTable[0],
          input = self.state.activity.input,
          output = self.state.activity.output,
          defaultTestInput = [],
          defaultTestOutput = [],
          tests = [],
          i, j, testInputVoltages, testOutputLevels, headerPair, holeIndex;

      for (i = 0; i < input.length; i++) {
        defaultTestInput.push('x');
      }
      for (i = 0; i < output.length; i++) {
        defaultTestOutput.push('x');
      }

      // skip the header and generate each test
      for (i = 1; i < truthTable.length; i++) {
        testInputVoltages = defaultTestInput.slice();
        testOutputLevels = defaultTestOutput.slice();

        for (j = 0; j < header.length; j++) {
          headerPair = header[j].split(':');
          if (headerPair[0] == 'input') {
            holeIndex = input.indexOf(headerPair[1]);
            if (holeIndex !== -1) {
              testInputVoltages[holeIndex] = TTL.getBooleanVoltage(truthTable[i][j]);
            }
          } else if (headerPair[0] == 'output') {
            holeIndex = output.indexOf(headerPair[1]);
            if (holeIndex !== -1) {
              testOutputLevels[holeIndex] = TTL.getBooleanLogicLevel(truthTable[i][j]);
            }
          }
        }

        tests.push({
          inputVoltages: testInputVoltages,
          outputLevels: testOutputLevels
        });
      }

      return tests;
    };

    resetBoards = function () {
      var i;
      for (i = 0; i < numBoards; i++) {
        boards[i].reset();
      }
    };

    resolveBoards = function () {
      var i, j;
      // evaluate all the logic-chips in all the boards so the values propogate
      for (i = 0; i < numBoards; i++) {
        for (j = 0; j < boards[i].numComponents; j++) {
          boards[i].resolveIOVoltages();
        }
      }
    };

    runTest = function (test, truthTable) {
      var allCorrect = true,
          i, output, outputVoltages, correct, dontCare;

      resetBoards();
      boards[0].connectors.input.setHoleVoltages(test.inputVoltages);
      resolveBoards();

      outputVoltages = boards[1].connectors.output.getHoleVoltages();
      output = [];
      for (i = 0; i < test.outputLevels.length; i++) {
        dontCare = test.outputLevels[i] == 'x';
        correct = dontCare || (test.outputLevels[i] == TTL.getVoltageLogicLevel(outputVoltages[i]));
        output.push(dontCare ? 'x' : outputVoltages[i]);
        allCorrect = allCorrect && correct;
      }

      truthTable.push({
        input: test.inputVoltages,
        output: output
      });

      return allCorrect;
    };

    // generate and check each test
    tests = generateTests();
    for (i = 0; i < tests.length; i++) {
      allCorrect = runTest(tests[i], truthTable) && allCorrect;
    }

    // reset to 0 inputs
    resetBoards();
    boards[0].connectors.input.clearHoleVoltages();
    resolveBoards();

    callback(allCorrect, truthTable);
  },

  toggleAllChipsAndWires: function () {
    var chipMap = {}, i, j, board, demo, addChip, getEndpoint, wire, wireParts, sourceParts, destParts, source, dest;

    addChip = function (name, chip) {
      chipMap[name] = new LogicChip({type: chip.type, layout: {x: chip.x, y: chip.y}, selectable: true});
      board.addComponent(name, chipMap[name]);
    };

    getEndpoint = function (name, index) {
      var item = chipMap[name] || (name == "in" ? board.connectors.input : (name == "out" ? board.connectors.output : null)),
          endPoint = null;

      if (item) {
        if (item instanceof Connector) {
          endPoint = item.holes[index - 1];
        }
        else {
          endPoint = item.pins[index - 1];
        }
      }

      return endPoint;
    };

    for (i = 0; i < this.state.boards.length; i++) {
      board = this.state.boards[i];
      board.clear();
      if (!this.state.toggledAllChipsAndWires && this.state.activity.boards[i].demo) {
        demo = this.state.activity.boards[i].demo;
        if (demo.chips) {
          $.each(demo.chips, addChip);
        }
        if (demo.wires) {
          for (j = 0; j < demo.wires.length; j++) {
            wire = $.trim(demo.wires[j]);
            if (wire.substr(0, 2) === "//") {
              continue;
            }
            wireParts = wire.split(",");
            sourceParts = $.trim(wireParts[0]).split(":");
            destParts = $.trim(wireParts[1] || "").split(":");

            source = getEndpoint(sourceParts[0], parseInt(sourceParts[1], 10));
            dest = getEndpoint(destParts[0], parseInt(destParts[1], 10));

            if (source && dest) {
              board.addWire(source, dest, '#00f');
            }
          }
        }
      }
      board.updateComponentList();
      boardWatcher.circuitChanged(board);
    }

    this.setState({boards: this.state.boards, toggledAllChipsAndWires: !this.state.toggledAllChipsAndWires});
  },

  toggleDebugPins: function () {
    this.setState({showDebugPins: !this.state.showDebugPins});
  },

  render: function () {
    var demoTop = this.state.showSimulator ? 75 : 0,
        sidebarTop = demoTop + (this.state.showDemo ? 75 : 0);

    return div({},
      h1({}, "Teaching Teamwork" + (this.state.activity ? ": " + this.state.activity.name : "")),
      this.state.currentUser ? h2({}, "Circuit " + (this.state.currentBoard + 1) + " (User: " + this.state.currentUser + ", Group: " + this.state.currentGroup + ")") : null,
      WeGotItView({currentUser: this.state.currentUser, checkIfCircuitIsCorrect: this.checkIfCircuitIsCorrect}),
      div({id: 'logicapp'},
        WorkspaceView({constants: constants, boards: this.state.boards, showDebugPins: this.state.showDebugPins, users: this.state.users, userBoardNumber: this.state.userBoardNumber, activity: this.state.activity}),
        this.state.showDemo ? DemoControlView({top: demoTop, toggleAllChipsAndWires: this.toggleAllChipsAndWires, toggleDebugPins: this.toggleDebugPins, showDebugPins: this.state.showDebugPins, toggledAllChipsAndWires: this.state.toggledAllChipsAndWires, hasDemoData: this.state.hasDemoData}) : null,
        SidebarChatView({numClients: 2, top: sidebarTop})
      ),
      OfflineCheckView({})
    );
  }
});
