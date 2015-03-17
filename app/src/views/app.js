var PageView              = React.createFactory(require('./page.jsx')),
    WorkbenchAdaptor      = require('../data/workbenchAdaptor'),
    WorkbenchFBConnector  = require('../data/workbenchFBConnector'),
    logController         = require('../controllers/log'),
    userController        = require('../controllers/user'),
    config                = require('../config');

module.exports = React.createClass({
  displayName: 'App',

  getInitialState: function () {
    return {
      activity: null,
      circuit: 0,
      breadboard: null,
      client: null,
      editorState: null,
      showEditor: !!window.location.search.match(/editor/)
    };
  },

  render: function () {
    return PageView({
      activity: this.state.activity,
      circuit: this.state.circuit,
      breadboard: this.state.breadboard,
      client: this.state.client,
      parseAndStartActivity: this.parseAndStartActivity,
      editorState: this.state.editorState,
      showEditor: this.state.showEditor
    });
  },

  componentDidMount: function () {
    var activityName = window.location.hash.substring(1);

    // load blank workbench
    sparks.createWorkbench({"circuit": []}, "breadboard-wrapper");

    // load and start activity if present
    if (activityName.length > 0) {
      this.loadActivity(activityName);
    }
  },

  loadActivity: function(activityName) {
    var self = this,
        localPrefix = 'local:',
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

      var firebase = new Firebase('https://teaching-teamwork.firebaseio.com/dev/activities/' + editorState.username + '/' + editorState.filename);
      firebase.once('value', function (snapshot) {
        var jsonData = snapshot.val();
        if (jsonData) {
          setStateAndParseAndStartActivity(jsonData);
        }
        else {
          alert("No data found for REMOTE activity at " + url);
        }
      }, function (error) {
        alert("Could not find REMOTE activity at " + url);
      });
    }
    else {
      editorState = {via: 'server', filename: activityName};

      activityUrl = config.modelsBase + activityName + ".json";

      request = new XMLHttpRequest();
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
        workbenchAdaptor, workbenchFBConnector, eventName, eventData, value, parameters;

    logController.init(activityName);
    this.setState({activity: ttWorkbench});

    userController.init(ttWorkbench.clients.length, function(clientNumber) {
      var circuit = (1 * clientNumber) + 1;

      logController.setClientNumber(clientNumber);
      workbenchAdaptor = new WorkbenchAdaptor(clientNumber)
      workbenchFBConnector = new WorkbenchFBConnector(userController, clientNumber, workbenchAdaptor);
      workbench = workbenchAdaptor.processTTWorkbench(ttWorkbench);
      try {
        sparks.createWorkbench(workbench, "breadboard-wrapper");
      }
      catch (e) {
        // sparks is throwing an error when computing the distance between points on load
      }

      self.setState({
        client: ttWorkbench.clients[circuit - 1],
        circuit: circuit,
        breadboard: sparks.workbenchController.breadboardController
      });

      logController.startListeningToCircuitEvents();

      if (ttWorkbench.logEvent) {
        for (eventName in ttWorkbench.logEvent) {
          eventData = ttWorkbench.logEvent[eventName];
          value = eventData.hasOwnProperty("value") ? eventData.value : null;
          parameters = eventData.hasOwnProperty("parameters") ? eventData.parameters : null;
          if (value || parameters) {
            logController.logEvent(eventName, value, parameters);
          }
        }
      }
    });
  }
});






