var logManagerUrl  = '//teaching-teamwork-log-manager.herokuapp.com/api/logs',
    xhrObserver    = require('../../data/shared/xhrObserver'),
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
