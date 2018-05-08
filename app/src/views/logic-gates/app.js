var Connector = require('../../models/shared/connector'),
    Board = require('../../models/shared/board'),
    TTL = require('../../models/shared/ttl'),
    CircuitResolver = require('../../models/shared/circuit-resolver'),
    LogicChip =  require('../../models/logic-gates/logic-chip'),
    boardWatcher = require('../../controllers/pic/board-watcher'),
    userController = require('../../controllers/shared/user'),
    logController = require('../../controllers/shared/log'),
    SidebarChatView = React.createFactory(require('../shared/sidebar-chat')),
    WeGotItView = React.createFactory(require('../shared/we-got-it')),
    WorkspaceView = React.createFactory(require('./workspace')),
    OfflineCheckView = React.createFactory(require('../shared/offline-check')),
    AutoWiringView = React.createFactory(require('./auto-wiring')),
    VersionView = React.createFactory(require('../shared/version')),
    ReportView = React.createFactory(require('../shared/report')),
    CircuitDebuggerView = React.createFactory(require('../shared/circuit-debugger')),
    constants = require('./constants'),
    colors = require('../shared/colors'),
    inIframe = require('../../data/shared/in-iframe'),
    div = React.DOM.div,
    h1 = React.DOM.h1,
    h2 = React.DOM.h2,
    a = React.DOM.a,
    showCircuitDebugger = window.location.search.indexOf('showCircuitDebugger') !== -1,
    Pin = require('../../models/shared/pin'),
    Hole = require('../../models/shared/hole'),
    BBHole = require('../../models/logic-gates/bbhole');

module.exports = React.createClass({
  displayName: 'AppView',

  getInitialState: function () {
    this.parsedActivity = null;
    this.activityFilename = null;

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
      circuitNotStable: false,
      soloMode: window.location.search.indexOf('soloMode') !== -1,
      showReport: window.location.search.indexOf('report') !== -1,
      allowExport: window.location.search.indexOf('allowExport') !== -1
    };
  },

  componentDidMount: function() {
    if (!this.state.showReport) {
      this.loadActivity(window.location.hash.substring(1) || 'single-xor');
    }
  },

  forceRerender: function () {
    this.forceUpdate();
  },

  loadActivity: function(activityName) {
    var self = this,
        activityUrl = '../activities/logic-gates/' + activityName + ".json",
        request = new XMLHttpRequest();

    this.activityFilename = activityName + '.json';

    request.open('GET', activityUrl, true);
    request.onload = function() {
      var jsonData = request.responseText;
      if (request.status >= 200 && request.status < 400) {
        if (jsonData) {
          var parsedData = self.parseActivity(activityName, jsonData);
          if (parsedData) {
            self.startActivity(activityName, parsedData);
          }
        }
      } else {
        alert("Could not find activity at "+activityUrl);
      }
    };

    request.send();
  },

  parseAndStartActivity: function (activityName, rawData) {
    var parsedData = this.parseActivity(activityName, rawData);
    if (parsedData) {
      this.startActivity(activityName, parsedData);
    }
  },

  parseActivity: function (activityName, rawData) {
    try {
      var json = JSON.parse(rawData);
      // keep separate copy of parsed activity so we can updated it on the export
      this.parsedActivity = JSON.parse(JSON.stringify(json));
      return json;
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
        i, allowAutoWiring;

    // create the boards
    this.setupBoards(activity);

    for (i = 0; i < activity.boards.length; i++) {
      if (activity.boards[i].autoWiring) {
        hasAutoWiringData = true;
        break;
      }
    }

    allowAutoWiring = !!interface.allowAutoWiring && hasAutoWiringData;

    this.setState({
      activity: activity,
      allowAutoWiring: allowAutoWiring,
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

        logController.setClientNumber(userBoardNumber);

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

    if (allowAutoWiring && window.location.search.indexOf('autoWire') !== -1) {
      this.toggleAllChipsAndWires();
    }
  },

  run: function (start) {
    var self = this,
        simulate = function () {
          self.circuitResolver.resolve(false, function (stable) {
            if (stable || self.state.circuitNotStable) {
              self.setState({circuitNotStable: !stable});
            }

            self.forceUpdate();
            if (!stable) {
              clearInterval(self.simulatorInterval);
            }
          });
        };

    clearInterval(this.simulatorInterval);
    if (start) {
      this.simulatorInterval = setInterval(simulate, 10);
    }
    this.setState({circuitNotStable: !!start});
  },

  setupBoards: function (activity) {
    var boards = [],
        busInputSize = activity.busInputSize || 0,
        busOutputSize = activity.busOutputSize || 0,
        busInputLabels = activity.busInputLabels || [],
        busOutputLabels = activity.busOutputLabels || [],
        busSize = Math.max((activity.busSize || 0), (busInputSize + busOutputSize)),
        boardSettings, board, i, input, output, bus;

    this.circuitResolver = new CircuitResolver({busSize: busSize, busInputSize: busInputSize, busOutputSize: busOutputSize, runner: this.run});

    for (i = 0; i < activity.boards.length; i++) {
      boardSettings = activity.boards[i];
      input = new Connector({type: 'input', count: boardSettings.localInputSize});
      output = new Connector({type: 'output', count: boardSettings.localOutputSize});
      bus = busSize > 0 ? new Connector({
        type: 'bus',
        count: busSize,
        busInputSize: busInputSize,
        busOutputSize: busOutputSize,
        busInputLabels: busInputLabels,
        busOutputLabels: busOutputLabels
      }) : null;
      board = new Board({
        number: i,
        bezierReflectionModifier: -0.2,
        components: {},
        connectors: {
          input: input,
          output: output,
          bus: bus
        },
        resolver: this.circuitResolver,
        constants:constants,
        useBreadboard: true,
        boards: boards
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

    this.circuitResolver.rewire();
    this.circuitResolver.resolve(true);  // TODO

    this.setState({boards: this.state.boards});
  },

  checkIfCircuitIsCorrect: function (callback) {
    var self = this,
        truthTable = [],
        allCorrect = true,
        boards = this.state.boards,
        numBoards = boards.length,
        validateAndNormalize, generateTests, runTest, resetBoards, i, tests;

    validateAndNormalize = function () {
      var truthTable = self.state.activity.truthTable,
          input = self.circuitResolver.input,
          output = self.circuitResolver.output,
          error = null,
          i, j;

      if (truthTable.length === 0) {
        error = "Empty truth table!";
      }
      else {
        for (i = 0; i < truthTable.length; i++) {
          if (truthTable[i].length != 2) {
            error = "Invalid truth table row length for row " + (i + 1) + " - should be 2, saw " + truthTable[i];
          }
          else {
            // normalize input to an array of arrays
            if (!$.isArray(truthTable[i][0][0])) {
              truthTable[i][0] = [truthTable[i][0]];
            }

            for (j = 0; j < truthTable[i][0].length; j++) {
              if (truthTable[i][0][j].length != input.count) {
                error = "Invalid truth table input count for test " + (j + 1) + " in row " + (i + 1) + " - should be " + input.count + ", saw " + truthTable[i][0][j].length;
              }
              if (error) {
                break;
              }
            }

            if (!error && (truthTable[i][1].length != output.count)) {
                error = "Invalid truth table output count for test " + (j + 1) + " in row " + (i + 1) + " - should be " + output.count + ", saw " + truthTable[i][1].length;
            }
          }

          if (error) {
            break;
          }
        }
      }

      if (error) {
        console.error(error);
        return false;
      }

      return true;
    };

    generateTests = function () {
      var truthTable = self.state.activity.truthTable,
          tests = [],
          i, j, k, testInputVoltages, subtestInputVoltages, testOutputLevels, inputs, outputs;

      for (i = 0; i < truthTable.length; i++) {
        inputs = truthTable[i][0];
        outputs = truthTable[i][1];

        testInputVoltages = [];
        for (j = 0; j < inputs.length; j++) {
          subtestInputVoltages = [];
          for (k = 0; k < inputs[j].length; k++) {
            subtestInputVoltages[k] = TTL.getBooleanVoltage(inputs[j][k]);
          }
          testInputVoltages.push(subtestInputVoltages);
        }

        testOutputLevels = [];
        for (j = 0; j < outputs.length; j++) {
          testOutputLevels.push(outputs[j] !== 'x' ? TTL.getBooleanLogicLevel(outputs[j]) : 'x');
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

      for (i = 0; i < test.inputVoltages.length; i++) {
        self.circuitResolver.input.setHoleVoltages(test.inputVoltages[i], true);
        self.circuitResolver.resolve(true);
      }

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

    // validate the truth table and normalize the inputs to be an array of arrays
    if (!validateAndNormalize()) {
      callback(null, truthTable, this.state.activity);
      return;
    }

    // generate each test
    tests = generateTests();
    for (i = 0; i < tests.length; i++) {
      allCorrect = runTest(tests[i], truthTable) && allCorrect;
    }

    //console.log(JSON.stringify(truthTable, null, 2));

    // rewire to remove global i/o
    this.circuitResolver.rewire();

    // reset to 0 inputs
    resetBoards();
    this.circuitResolver.resolve(true);

    callback(allCorrect, truthTable, this.state.activity);
  },

  exportWire: function (wire) {
    return [this.exportEndpoint(wire.source), this.exportEndpoint(wire.dest)].join(", ");
  },

  exportEndpoint: function (endPoint) {
    if (endPoint instanceof Pin) {
      return endPoint.component.name + ":" + (endPoint.number + 1);
    }
    else if (endPoint instanceof Hole) {
      return endPoint.connector.type + ":" + (endPoint.index + 1);
    }
    else if (endPoint instanceof BBHole) {
      return endPoint.rowName + ":" + (endPoint.columnIndex + 1);
    }
    return "";
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
      var breadboardHoles = board.breadboard ? board.breadboard.holeRowMap : {},
          item = chipMap[name] || board.connectors[name] || breadboardHoles[name] || null,
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
        else if (item.holes) {
          list = item.holes;
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

  getExportFileData: function () {
    var self = this,
        updatedActivity = this.parsedActivity;
    updatedActivity.interface = updatedActivity.interface || {};
    updatedActivity.interface.allowAutoWiring = true;
    updatedActivity.boards = updatedActivity.boards || [];
    this.state.boards.forEach(function (board, i) {
      var autoWiring = {chips: {}, wires: []};
      Object.keys(board.components).forEach(function (id) {
        var chip = board.components[id];
        autoWiring.chips[id] = {
          type: chip.type,
          x: Math.round(chip.layout.x),
          y: Math.round(chip.layout.y)
        };
      });
      board.wires.forEach(function (wire) {
        autoWiring.wires.push(self.exportWire(wire));
      });
      updatedActivity.boards[i].autoWiring = autoWiring;
    });

    var json = JSON.stringify(updatedActivity, null, 2);
    return 'data:text/plain;charset=utf-8,' + encodeURIComponent(json);
  },

  render: function () {
    var sidebarTop = this.state.allowAutoWiring ? 75 : 0;

    if (this.state.showReport) {
      return ReportView({});
    }
    else {
      return div({},
        this.state.inIframe ? null : h1({}, "Teaching Teamwork" + (this.state.activity ? ": " + this.state.activity.name : "")),
        this.state.allowExport && this.parsedActivity ? div({style: {margin: 5, textAlign: 'center'}}, a({href: this.getExportFileData(), download: this.activityFilename || 'activity.json'}, "Export Activity")) : null,
        this.state.currentUser ? h2({}, "Circuit " + (this.state.currentBoard + 1) + " (User: " + this.state.currentUser + ", Group: " + this.state.currentGroup + ")") : null,
        OfflineCheckView({}),
        this.state.notes ? div({className: 'activity-notes', dangerouslySetInnerHTML: {__html: this.state.notes}}) : null,
        this.state.activity && this.state.activity.truthTable ? WeGotItView({currentUser: this.state.currentUser, checkIfCircuitIsCorrect: this.checkIfCircuitIsCorrect, soloMode: this.state.soloMode, disabled: this.state.circuitNotStable}) : null,
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
        VersionView({}),
        showCircuitDebugger ? CircuitDebuggerView({circuitResolver: this.circuitResolver}) : null
      );
    }
  }
});
