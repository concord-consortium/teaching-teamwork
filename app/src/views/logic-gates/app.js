var Connector = require('../../models/shared/connector'),
    Board = require('../../models/shared/board'),
    TTL = require('../../models/shared/ttl'),
    CircuitResolver = require('../../models/shared/circuit-resolver'),
    LogicChip =  require('../../models/logic-gates/logic-chip'),
    //LogicChip =  require('../../models/logic-gates/logic-chip'),
    boardWatcher = require('../../controllers/pic/board-watcher'),
    userController = require('../../controllers/shared/user'),
    logController = require('../../controllers/shared/log'),
    SidebarChatView = React.createFactory(require('../shared/sidebar-chat')),
    WeGotItView = React.createFactory(require('../shared/we-got-it')),
    WorkspaceView = React.createFactory(require('./workspace')),
    OfflineCheckView = React.createFactory(require('../shared/offline-check')),
    AutoWiringView = React.createFactory(require('./auto-wiring')),
    VersionView = React.createFactory(require('../shared/version')),
    constants = require('./constants'),
    colors = require('../shared/colors'),
    inIframe = require('../../data/shared/in-iframe'),
    div = React.DOM.div,
    h1 = React.DOM.h1,
    h2 = React.DOM.h2;

module.exports = React.createClass({
  displayName: 'AppView',

  getInitialState: function () {
    return {
      boards: [],
      userBoardNumber: -1,
      users: {},
      currentBoard: 0,
      currentUser: null,
      currentGroup: null,
      activity: null,
      interface: {},
      inIframe: inIframe(),
      soloMode: window.location.search.indexOf('soloMode') !== -1
    };
  },

  componentDidMount: function() {
    this.loadActivity(window.location.hash.substring(1) || 'single-xor');
  },

  forceRerender: function () {
    this.forceUpdate();
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
        hasAutoWiringData = false,
        interface = activity.interface || {},
        i;

    // create the boards
    this.setupBoards(activity);

    for (i = 0; i < activity.boards.length; i++) {
      if (activity.boards[i].autoWiring) {
        hasAutoWiringData = true;
        break;
      }
    }

    this.setState({
      activity: activity,
      allowAutoWiring: !!interface.allowAutoWiring && hasAutoWiringData,
      showPinColors: !!interface.showPinColors,
      showBusColors: !!interface.showBusColors,
      showPinouts: !!interface.showPinouts,
      notes: activity.notes || false
    });

    logController.init(activityName);

    if (this.state.soloMode) {
      logController.setClientNumber(0);
      this.setState({
        userBoardNumber: 0
      });
    }
    else {
      userController.init(activity.boards.length, activityName, function(userBoardNumber) {
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
          boardWatcher.startListeners(activity.boards.length);
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

  setupBoards: function (activity) {
    var boards = [],
        busInputSize = activity.busInputSize || 0,
        busOutputSize = activity.busOutputSize || 0,
        busSize = Math.max((activity.busSize || 0), (busInputSize + busOutputSize)),
        boardSettings, board, i, input, output, bus;

    this.circuitResolver = new CircuitResolver({busSize: busSize, busInputSize: busInputSize, busOutputSize: busOutputSize});

    for (i = 0; i < activity.boards.length; i++) {
      boardSettings = activity.boards[i];
      input = new Connector({type: 'input', count: boardSettings.localInputSize});
      output = new Connector({type: 'output', count: boardSettings.localOutputSize});
      bus = busSize > 0 ? new Connector({type: 'bus', count: busSize, busInputSize: busInputSize, busOutputSize: busOutputSize}) : null;
      board = new Board({
        number: i,
        bezierReflectionModifier: -0.5,
        components: {},
        connectors: {
          input: input,
          output: output,
          bus: bus
        },
        resolver: this.circuitResolver
      });
      input.board = board;
      output.board = board;
      if (bus) {
        bus.board = board;
      }
      if (!this.state.soloMode) {
        boardWatcher.addListener(board, this.updateWatchedBoard);
      }
      boards.push(board);
    }

    this.circuitResolver.boards = boards;
    this.circuitResolver.updateComponents();

    this.setState({boards: boards});
  },

  componentWillUnmount: function () {
    var i;
    for (i = 0; i < this.state.boards.length; i++) {
      boardWatcher.removeListener(this.state.boards[i], this.updateWatchedBoard);
    }
  },

  updateWatchedBoard: function (board, boardInfo) {
    var wires, components, inputs;

    // update the components
    components = (boardInfo && boardInfo.layout ? boardInfo.layout.components : null) || [];
    board.updateComponents(components);

    // update the wires
    wires = (boardInfo && boardInfo.layout ? boardInfo.layout.wires : null) || [];
    board.updateWires(wires);

    // update the inputs
    inputs = (boardInfo && boardInfo.layout ? boardInfo.layout.inputs : null) || [];
    board.updateInputs(inputs);

    this.circuitResolver.resolve();

    this.setState({boards: this.state.boards});
  },

  checkIfCircuitIsCorrect: function (callback) {
    var self = this,
        truthTable = [],
        allCorrect = true,
        boards = this.state.boards,
        numBoards = boards.length,
        generateTests, runTest, resetBoards, i, tests;

    generateTests = function () {
      var truthTable = self.state.activity.truthTable,
          input = self.circuitResolver.input,
          output = self.circuitResolver.output,
          defaultTestInput = [],
          defaultTestOutput = [],
          tests = [],
          maxCols = input.count + output.count,
          i, j, testInputVoltages, testOutputLevels, numCols;

      for (i = 0; i < input.count; i++) {
        defaultTestInput.push('x');
      }
      for (i = 0; i < output.count; i++) {
        defaultTestOutput.push('x');
      }

      // generate each test
      for (i = 0; i < truthTable.length; i++) {
        testInputVoltages = defaultTestInput.slice();
        testOutputLevels = defaultTestOutput.slice();
        numCols = Math.min(maxCols, truthTable[i].length);

        for (j = 0; j < numCols; j++) {
          if (j < input.count) {
            testInputVoltages[j] = TTL.getBooleanVoltage(truthTable[i][j]);
          }
          else {
            testOutputLevels[j - input.count] = TTL.getBooleanLogicLevel(truthTable[i][j]);
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

    runTest = function (test, truthTable) {
      var allCorrect = true,
          i, output, outputVoltages, outputLevel, correct, dontCare;

      resetBoards();
      self.circuitResolver.input.setHoleVoltages(test.inputVoltages, true);
      self.circuitResolver.resolve();

      outputVoltages = self.circuitResolver.output.getHoleVoltages();
      output = [];
      for (i = 0; i < test.outputLevels.length; i++) {
        dontCare = test.outputLevels[i] == 'x';
        outputLevel = TTL.getVoltageLogicLevel(outputVoltages[i]);
        correct = dontCare || (test.outputLevels[i] == outputLevel);
        output.push(dontCare ? 'x' : outputVoltages[i]);
        allCorrect = allCorrect && correct;
      }

      truthTable.push({
        input: test.inputVoltages,
        output: output
      });

      return allCorrect;
    };

    // rewire the board to include global i/o
    this.circuitResolver.rewire(true);

    // generate and check each test
    tests = generateTests();
    for (i = 0; i < tests.length; i++) {
      allCorrect = runTest(tests[i], truthTable) && allCorrect;
    }

    // rewire to remove global i/o
    this.circuitResolver.rewire();

    // reset to 0 inputs
    resetBoards();
    this.circuitResolver.resolve();

    callback(allCorrect, truthTable);
  },

  toggleAllChipsAndWires: function () {
    var chipMap, holeMap, i, j, board, autoWiring, addChip, getEndpoint, wire, wireParts, sourceParts, destParts, source, dest, mapHoles, hasWires;

    addChip = function (name, chip) {
      chipMap[name] = new LogicChip({type: chip.type, layout: {x: chip.x, y: chip.y}, selectable: true});
      board.addComponent(name, chipMap[name]);
    };

    mapHoles = function (name, connector) {
      var i;
      holeMap[name] = {};
      for (i = 0; i < connector.holes.length; i++) {
        holeMap[name][connector.holes[i].label] = i + 1;
      }
    };

    getEndpoint = function (name, stringIndex) {
      var item = chipMap[name] || (name == "bus" ? board.connectors.bus :  null),
          intIndex = parseInt(stringIndex, 10),
          list = null,
          endPoint = null;


      if (item) {
        if (item instanceof Connector) {
          if (isNaN(intIndex)) {
            intIndex = holeMap[name][stringIndex];
          }
          if (!isNaN(intIndex)) {
            list = item.holes;
          }
        }
        else {
          list = item.pins;
        }
      }

      if (list) {
        if (intIndex - 1 < list.length) {
          endPoint = list[intIndex - 1];
        }
        else {
          console.error("Invalid endpoint index: " + (name + ":" + intIndex));
        }
      }
      if (!endPoint) {
        console.error("Unknown wire endpoint: " + (name + ":" + stringIndex));
      }

      return endPoint;
    };

    hasWires = false;
    for (i = 0; i < this.state.boards.length; i++) {
      hasWires = hasWires || (this.state.boards[i].wires.length > 0);
    }

    for (i = 0; i < this.state.boards.length; i++) {
      board = this.state.boards[i];
      board.clear();
      if (!hasWires && this.state.activity.boards[i].autoWiring) {
        autoWiring = this.state.activity.boards[i].autoWiring;
        chipMap = {};
        if (autoWiring.chips) {
          $.each(autoWiring.chips, addChip);
        }
        if (autoWiring.wires) {
          holeMap = {};
          mapHoles('input', board.connectors.input);
          mapHoles('output', board.connectors.output);
          for (j = 0; j < autoWiring.wires.length; j++) {
            wire = $.trim(autoWiring.wires[j]);
            if (wire.substr(0, 2) === "//") {
              continue;
            }
            wireParts = wire.split(",");
            sourceParts = $.trim(wireParts[0]).split(":");
            destParts = $.trim(wireParts[1] || "").split(":");

            source = getEndpoint($.trim(sourceParts[0]), $.trim(sourceParts[1]));
            dest = getEndpoint($.trim(destParts[0]), $.trim(destParts[1]));

            if (source && dest) {
              board.addWire(source, dest, colors.wire, true);
            }
          }
        }
      }

      this.circuitResolver.rewire();

      board.updateComponentList();
      boardWatcher.circuitChanged(board);
    }

    this.setState({boards: this.state.boards});
  },

  render: function () {
    var sidebarTop = this.state.allowAutoWiring ? 75 : 0;

    return div({},
      this.state.inIframe ? null : h1({}, "Teaching Teamwork" + (this.state.activity ? ": " + this.state.activity.name : "")),
      this.state.currentUser ? h2({}, "Circuit " + (this.state.currentBoard + 1) + " (User: " + this.state.currentUser + ", Group: " + this.state.currentGroup + ")") : null,
      OfflineCheckView({}),
      this.state.notes ? div({className: 'activity-notes', dangerouslySetInnerHTML: {__html: this.state.notes}}) : null,
      WeGotItView({currentUser: this.state.currentUser, checkIfCircuitIsCorrect: this.checkIfCircuitIsCorrect, soloMode: this.state.soloMode}),
      div({id: 'logicapp'},
        WorkspaceView({
          constants: constants,
          boards: this.state.boards,
          users: this.state.users,
          userBoardNumber: this.state.userBoardNumber,
          activity: this.state.activity,
          forceRerender: this.forceRerender,
          soloMode: this.state.soloMode,
          showPinColors: this.state.showPinColors,
          showPinouts: this.state.showPinouts,
          showBusColors: this.state.showBusColors
        }),
        this.state.allowAutoWiring ? AutoWiringView({top: 0, toggleAllChipsAndWires: this.toggleAllChipsAndWires}) : null,
        this.state.soloMode ? null : SidebarChatView({numClients: 2, top: sidebarTop})
      ),
      VersionView({})
    );
  }
});
