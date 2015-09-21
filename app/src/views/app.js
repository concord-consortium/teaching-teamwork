var PageView              = React.createFactory(require('./page.jsx')),
    WorkbenchAdaptor      = require('../data/workbenchAdaptor'),
    WorkbenchFBConnector  = require('../data/workbenchFBConnector'),
    logController         = require('../controllers/log'),
    userController        = require('../controllers/user'),
    eventsController      = require('../controllers/events'),
    config                = require('../config'),
    OtherCircuitView      = React.createFactory(require('./view-other-circuit')),
    viewOtherCircuit      = !!window.location.search.match(/view-other-circuit!/);

module.exports = React.createClass({
  displayName: 'App',

  getInitialState: function () {
    return {
      activity: null,
      circuit: 0,
      breadboard: null,
      client: null,
      editorState: null,
      showEditor: !!window.location.search.match(/editor/),
      showSubmit: false,
      goals: null,
      nextActivity: null,
      activityName: null,
      ttWorkbench: null
    };
  },

  render: function () {
    if (viewOtherCircuit) {
      return OtherCircuitView({});
    }
    else {
      return PageView({
        activity: this.state.activity,
        circuit: this.state.circuit,
        breadboard: this.state.breadboard,
        client: this.state.client,
        parseAndStartActivity: this.parseAndStartActivity,
        editorState: this.state.editorState,
        showEditor: this.state.showEditor,
        showSubmit: this.state.showSubmit,
        goals: this.state.goals,
        nextActivity: this.state.nextActivity,
        activityName: this.state.activityName,
        ttWorkbench: this.state.ttWorkbench
      });
    }
  },

  componentDidMount: function () {
    var activityName = window.location.hash.substring(1);

    if (!viewOtherCircuit) {
      // load blank workbench
      sparks.createWorkbench({"circuit": []}, "breadboard-wrapper");

      // load and start activity if present
      if (activityName.length > 0) {
        this.loadActivity(activityName);
      }
    }
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

      var activityUrl = config.modelsBase + activityName + ".json";

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

  startActivity: function (activityName, ttWorkbench) {
    var self = this,
        workbenchAdaptor, workbenchFBConnector, workbench, waitForBreadboardView;

    logController.init(activityName);

    // initially set the state to get the name of the activity
    this.setState({activity: ttWorkbench});

    userController.init(ttWorkbench.clients.length, activityName, function(clientNumber) {
      var circuit = (1 * clientNumber) + 1;

      logController.setClientNumber(clientNumber);

      // look for a model and update the workbench values if found
      // NOTE: the callback might be called more than once if there is a race condition setting the model values
      self.preProcessWorkbench(ttWorkbench, function (ttWorkbench) {

        // set the event controller
        eventsController.init({
          clientNumber: clientNumber,
          numClients: ttWorkbench.clients.length,
          logging: ttWorkbench.logging
        });

        // reset state after processing the workbench
        self.setState({
          activity: ttWorkbench,
          ttWorkbench: JSON.parse(JSON.stringify(ttWorkbench)), // this makes a deep clone before the circuit connections are modified by processTTWorkbench
          activityName: activityName
        });

        workbenchAdaptor = new WorkbenchAdaptor(clientNumber);
        workbenchFBConnector = new WorkbenchFBConnector(userController, clientNumber, workbenchAdaptor);
        workbench = workbenchAdaptor.processTTWorkbench(ttWorkbench);

        // In solo mode when the user has already entered their name is a race condition where the
        // breadboard view has not been created yet which causes the createWorkbench() call to not insert
        // the components.  This function waits until the breadboard view is available.
        waitForBreadboardView = function (callback) {
          var check = function () {
            if (sparks.workbenchController.breadboardView) {
              callback();
            }
            else {
              setTimeout(check, 10);
            }
          };
          check();
        };

        waitForBreadboardView(function () {
          try {
            sparks.createWorkbench(workbench, "breadboard-wrapper");
          }
          catch (e) {
            // sparks is throwing an error when computing the distance between points on load
            if (console.error) {
              console.error(e);
            }
          }

          // reset the circuit in firebase so that any old info doesn't display in the submit popup
          workbenchFBConnector.setClientCircuit();
          workbenchFBConnector.resetMeters();

          self.setState({
            client: ttWorkbench.clients[circuit - 1],
            circuit: circuit,
            breadboard: sparks.workbenchController.breadboardController,
            showSubmit: !!ttWorkbench.goals,
            goals: ttWorkbench.goals,
            nextActivity: ttWorkbench.nextActivity
          });

          // append the requested local component values to each event logged
          var appendComponents = ttWorkbench.logging && ttWorkbench.logging.append && ttWorkbench.logging.append.local && ttWorkbench.logging.append.local.components ? ttWorkbench.logging.append.local.components : [];
          if (appendComponents.length > 0) {
            logController.addLogEventListener(function (data) {
              for (var i = 0; i < appendComponents.length; i++) {
                var component = appendComponents[i],
                    sparksComponent = sparks.workbenchController.breadboardController.component(component.name);
                data[component.name] = sparksComponent ? sparksComponent[component.measurement] : 'unknown';
              }
            });
          }

          // append the remote event values to each event logged
          logController.addLogEventListener(function (data) {
            eventsController.appendRemoteEventValues(data);
          });

          logController.startListeningToCircuitEvents();

          logController.logEvents(ttWorkbench.logging && ttWorkbench.logging.startActivity ? ttWorkbench.logging.startActivity : null);
        });
      });
    });
  },

  preProcessWorkbench: function (workbench, cb) {
    var self = this,
        applyModel = function (model) {
          var json = JSON.stringify(workbench),
              key;
          for (key in model) {
            if (model.hasOwnProperty(key)) {
              json = json.replace(new RegExp('\\$' + key + '\\b', 'g'), model[key]);
            }
          }
          logController.logEvent('model name', workbench.model.name);
          logController.logEvent('model options', null, workbench.model.options || {});
          logController.logEvent('model values', null, model);
          cb(JSON.parse(json));
        },
        models = {
          "three-resistors": this.threeResistorsModel
        },
        generateModel, modelRef, usersRef;

    // skip if no model defined (not an error)
    if (!workbench.model) {
      return cb(workbench);
    }
    if (!workbench.model.name) {
      alert("Model found in activity JSON without a name");
      return cb(workbench);
    }
    if (!models.hasOwnProperty(workbench.model.name)) {
      alert("Unknown model found in activity JSON: " + workbench.model.name);
      return cb(workbench);
    }

    // create the handler
    generateModel = function () {
      return models[workbench.model.name].call(self, workbench.model.options || {});
    };

    // check if we are in solo mode
    if (!userController.getFirebaseGroupRef()) {

      // yes so just generate the model values
      applyModel(generateModel());
    }
    else {

      // check if we are the only user
      usersRef = userController.getFirebaseGroupRef().child('users');
      usersRef.once("value", function(snap) {
        var users = snap.val(),
            onlyUser = !users || Object.keys(users).length == 1;

        // check if the model exists
        modelRef = userController.getFirebaseGroupRef().child("model");
        modelRef.once("value", function (snap) {
          var model = snap.val();

          // listen for model changes
          modelRef.on("value", function (snap) {
            applyModel(snap.val());
          });

          // if we are the only user or the model doesn't exist create it
          if (onlyUser || !model) {
            modelRef.set(generateModel());
          }
          else {
            applyModel(model);
          }
        });
      });
    }
  },

  uniformResistor: function (min, max, notInSet) {
    var bc = sparks.workbenchController.breadboardController,
        value, resistor;

    notInSet = notInSet || [];
    do {
      resistor = bc.component({
        "kind": "resistor",
        "type": "resistor",
        "resistance": ["uniform", min, max],
        "UID": "model",
        "connections": "c14,c20",
        "tolerance": 0.1
      });
      value = resistor.resistance;
      bc.removeComponent(resistor);
    } while (notInSet.indexOf(value) !== -1);

    return value;
  },

  threeResistorsModel: function (options) {
    var level = options.level || 1,
        R1 = this.uniformResistor(100, 1000, []),
        R2 = this.uniformResistor(100, 1000, [R1]),
        R3 = this.uniformResistor(100, 1000, [R1, R2]),

        GoalR = this.uniformResistor(100, 1000, []),
        GoalR1 = this.uniformResistor(100, 1000, [GoalR]),
        GoalR2 = this.uniformResistor(100, 1000, [GoalR, GoalR1]),
        GoalR3 = this.uniformResistor(100, 1000, [GoalR, GoalR1, GoalR2]),

        model = {
          E: 6 + Math.round(Math.random() * (20 - 6)), // from 6 to 20 volts
          R: 0,
          R1: R1,
          R2: R2,
          R3: R3
        },

        round = function (value) {
          return Math.round(value * Math.pow(10,2)) / Math.pow(10,2);
        };

    switch (level) {
      // Level 1: known E, R = 0, all goals the same
      case 1:
        model.GoalR1 = model.GoalR2 = model.GoalR3 = GoalR;
        break;

      // Level 2: known E, known R​ ≠ 0​, all goals the same
      case 2:
        model.R = model.GoalR1 = model.GoalR2 = model.GoalR3 = GoalR;
        break;

      // Level 3: known E, known R ≠ 0​, goals different
      // Level 4: unknown E, known R ≠ 0, goals different
      // Level 5: unknown E, unknown R ≠ 0, goals different
      case 3:
      case 4:
      case 5:
        model.R = GoalR;
        model.GoalR1 = GoalR1;
        model.GoalR2 = GoalR2;
        model.GoalR3 = GoalR3;
        break;

      default:
        alert("Unknown level in three-resistors model: " + level);
        break;
    }

    model.V1 = round((model.E * model.GoalR1) / (model.R + model.GoalR1 + model.GoalR2 + model.GoalR3));
    model.V2 = round((model.E * model.GoalR2) / (model.R + model.GoalR1 + model.GoalR2 + model.GoalR3));
    model.V3 = round((model.E * model.GoalR3) / (model.R + model.GoalR1 + model.GoalR2 + model.GoalR3));

    return model;
  }
});






