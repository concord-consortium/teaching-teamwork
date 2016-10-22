(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// import pathseg polyfill
require('../vendor/pathseg.js');

var App = React.createFactory(require('./views/breadboard/app'));
ReactDOM.render(App({}), document.getElementById('content'));


},{"../vendor/pathseg.js":26,"./views/breadboard/app":12}],2:[function(require,module,exports){
module.exports = {
  modelsBase: "../activities/breadboard/"
};


},{}],3:[function(require,module,exports){
var userController = require('./user');

var EventsController = function() {
};

EventsController.prototype = {

  init: function(options) {
    var self = this,
        i, j;

    this.options = options;

    this.myEventValues = {sparks: {}};
    this.remoteEventValues = {};
    this.myRemoteEventsFirebaseRef = null;

    // setup the remote sparks event object for ourself and for each client
    this.remoteSparksEvents = this.options.logging && this.options.logging.append && this.options.logging.append.remote && this.options.logging.append.remote.events && this.options.logging.append.remote.events.sparks ? this.options.logging.append.remote.events.sparks : [];
    for (i=0; i < this.options.numClients; i++) {
      this.remoteEventValues[i] = {sparks: {}};
      for (j=0; j < this.remoteSparksEvents.length; j++) {
        this.myEventValues.sparks[this.remoteSparksEvents[j]] = null;
        this.remoteEventValues[i].sparks[this.remoteSparksEvents[j]] = null;
      }
    }

    // add event listeners in group mode
    if (self.options.numClients > 1) {
      this.remoteEventsFirebaseRef = userController.getFirebaseGroupRef().child('events');

      // track all remote event changes so we can append then to the log
      this.remoteEventsFirebaseRef.on("value", function(snapshot) {
        var snapshotValues = snapshot.val(),
            clientIndex, eventType, eventName, events;

        if (!snapshotValues) {
          return;
        }

        // merge the snapshot values into the saved remote values
        for (clientIndex=0; clientIndex < self.options.numClients; clientIndex++) {
          if (snapshotValues[clientIndex]) {
            for (eventType in self.remoteEventValues[clientIndex]) {
              if (self.remoteEventValues[clientIndex].hasOwnProperty(eventType) && snapshotValues[clientIndex].hasOwnProperty(eventType)) {
                events = self.remoteEventValues[clientIndex][eventType];
                for (eventName in events) {
                  if (events.hasOwnProperty(eventName)) {
                    events[eventName] = snapshotValues[clientIndex][eventType].hasOwnProperty(eventName) ? snapshotValues[clientIndex][eventType][eventName] : null;
                  }
                }
              }
            }
          }
        }
      });

      this.myRemoteEventsFirebaseRef = this.remoteEventsFirebaseRef.child(options.clientNumber);
      this.myRemoteEventsFirebaseRef.set(this.myEventValues);
    }
  },

  handleLocalSparksEvent: function(event) {
    // check if event is one we need to replicate in FB
    if (this.remoteSparksEvents.indexOf(event.name) !== -1) {
      this.myEventValues.sparks[event.name] = event.value;
      if (this.myRemoteEventsFirebaseRef) {
        this.myRemoteEventsFirebaseRef.set(this.myEventValues);
      }
    }
  },

  appendRemoteEventValues: function(data) {
    var clientIndex, key, eventType, eventName, events;

    if (!this.options) {
      return;
    }

    // append each remote event value to the log
    for (clientIndex=0; clientIndex < this.options.numClients; clientIndex++) {
      if (this.remoteEventValues[clientIndex]) {
        for (eventType in this.remoteEventValues[clientIndex]) {
          if (this.remoteEventValues[clientIndex].hasOwnProperty(eventType)) {
            events = this.remoteEventValues[clientIndex][eventType];
            for (eventName in events) {
              if (events.hasOwnProperty(eventName)) {
                key = ['circuit ' + (clientIndex + 1), eventType, eventName].join(':');
                this._appendObjectValues(data, key, this.remoteEventValues[clientIndex][eventType][eventName]);
              }
            }
          }
        }
      }
    }
  },

  _appendObjectValues: function(data, key, objectOrValue) {
    var childKey;

    if ($.isPlainObject(objectOrValue)) {
      for (childKey in objectOrValue) {
        if (objectOrValue.hasOwnProperty(childKey)) {
          this._appendObjectValues(data, [key, childKey].join(':'), objectOrValue[childKey]);
        }
      }
    }
    else {
      // remove spaces if otherwise a numeric answer - the DMM uses spaces to separate the 7-segment display values
      if (/^[\d\s\.]+$/.test(objectOrValue)) {
        objectOrValue = objectOrValue.replace(/\s/g, '');
      }
      data[key] = objectOrValue;
    }
  }
};

module.exports = new EventsController();


},{"./user":6}],4:[function(require,module,exports){
var iframePhone = require('iframe-phone'),
    controller;

function LaraController() {
}
LaraController.prototype = {
  laraPhone: null,
  loadedFromLara: false,
  loadedGlobalState: false,
  globalState: null,
  loadedGlobalStateCallback: null,
  connected: false,
  connectionCallback: null,

  init: function() {
    var self = this;

    // for now just check if in iframe
    try {
      this.loadedFromLara = window.self !== window.top;
    } catch (e) {
      this.loadedFromLara = true;
    }

    if (this.loadedFromLara) {
      this.laraPhone = iframePhone.getIFrameEndpoint();
      this.laraPhone.addListener('hello', function () {
        self.connected = true;
        if (self.connectionCallback) {
          self.connectionCallback();
        }
      });
      this.laraPhone.addListener("loadInteractiveGlobal", function(state) {
        self._globalStateLoaded(state);
      });
      // this message is not in the production lara
      this.laraPhone.addListener("loadInteractiveNullGlobal", function() {
        //self._globalStateLoaded(null);
      });
      this.laraPhone.initialize();
    }
  },

  waitForConnection: function (callback) {
    if (this.connected) {
      callback();
    }
    else {
      this.connectionCallback = callback;
    }
  },

  waitForGlobalState: function (callback) {
    var self = this;
    if (this.loadedGlobalState) {
      callback(this.globalState);
    }
    else {
      this.loadedGlobalStateCallback = callback;
      setTimeout(function () {
        if (!self.loadedGlobalState) {
          this.loadedGlobalStateCallback = null;
          callback(null);
        }
      }, 5000);
    }
  },

  log: function (data) {
    this.laraPhone.post('log', data);
  },

  setGlobalState: function (state) {
    if (this.loadedFromLara) {
      this.laraPhone.post('interactiveStateGlobal', state);
    }
  },

  _globalStateLoaded: function (state) {
    this.loadedGlobalState = true;
    this.globalState = state;
    if (this.loadedGlobalStateCallback) {
      this.loadedGlobalStateCallback(state);
    }
  }
};

controller = new LaraController();
controller.init();

module.exports = controller;


},{"iframe-phone":31}],5:[function(require,module,exports){
var logManagerUrl  = '//teaching-teamwork-log-manager.herokuapp.com/api/logs',
    xhrObserver    = require('../../data/shared/xhrObserver'),
    laraController = require('./lara'),
    logToConsole = window.location.search.indexOf('logToConsole') !== -1,
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

      if (logToConsole && console && console.log) {
        console.log("LOG: " + eventName);
        if ((value !== undefined) && (value !== null)) {
          console.log("  VALUE: " + value);
        }
        if (parameters !== undefined) {
          console.log("  PARMS: " + JSON.stringify(parameters));
        }
      }

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


},{"../../data/shared/xhrObserver":11,"./lara":4}],6:[function(require,module,exports){
var UserRegistrationView = require('../../views/shared/userRegistration.jsx'),
    groups = require('../../data/shared/group-names'),
    logController = require('./log'),
    laraController = require('./lara'),
    userController,
    numClients,
    numExistingUsers,
    activityName,
    userName,
    groupName,
    firebaseGroupRef,
    firebaseUsersRef,
    fbUrl,
    groupUsersListener,
    boardsSelectionListener,
    groupRefCreationListeners,
    client,
    callback,
    serverSkew,
    onDisconnectRef;

// scratch
var fbUrlDomain = 'https://teaching-teamwork.firebaseio.com/';
var fbUrlDir = (localStorage ? localStorage.getItem('fbUrlDir') || null : null) || '2016/';  // to make local dev testing easier
var fbUrlBase = fbUrlDomain + fbUrlDir;

var getDate = function() {
  var today = new Date(),
      dd = today.getDate(),
      mm = today.getMonth()+1,
      yyyy = today.getFullYear();

  if(dd<10) {
      dd='0'+dd;
  }

  if(mm<10) {
      mm='0'+mm;
  }

  return yyyy+'-'+mm+'-'+dd;
};

var notifyGroupRefCreation = function() {
  if (groupRefCreationListeners) {
    for (var i = 0, ii = groupRefCreationListeners.length; i < ii; i++) {
      groupRefCreationListeners.pop()();
    }
  }
};

// listen for timestamp skews
serverSkew = 0;
var offsetRef = new Firebase(fbUrlDomain + '.info/serverTimeOffset');
offsetRef.on("value", function(snap) {
  serverSkew = snap.val();
});

module.exports = userController = {

  init: function(_numClients, _activityName, _callback) {
    numClients = _numClients;
    activityName = _activityName;
    callback = _callback;
    userName = null;

    if (numClients > 1) {
      var self = this;
      this.getIdentityFromLara(function (identity) {
        if (identity && identity.groupName) {
          self.tryToEnterGroup(identity.groupName, identity.userName);
        }
        else {
          UserRegistrationView.open(self, {form: "groupname", numClients: numClients});
        }
      });
    } else {
      callback(0);
    }
  },

  getIdentityFromLara: function (callback) {
    if (laraController.loadedFromLara) {
      UserRegistrationView.open(this, {form: "gettingGlobalState"});
      laraController.waitForGlobalState(function (state) {
        UserRegistrationView.close();
        callback(state && state.identity ? state.identity : null);
      });
    }
    else {
      callback(null);
    }
  },

  tryToEnterGroup: function(groupName, preferredUserName) {
    var self = this,
        group, members;

    for (var i = 0, ii = groups.length; i < ii; i++) {
      if (groups[i].name == groupName) {
        group = groups[i];
        break;
      }
    }

    members = group.members;

    this.createFirebaseGroupRef(activityName, groupName);

    firebaseUsersRef = firebaseGroupRef.child('users');
    groupUsersListener = firebaseUsersRef.on("value", function(snapshot) {
      var users = snapshot.val() || {};

      userName = preferredUserName || userName;

      numExistingUsers = Object.keys(users).length;
      if (!userName) {
        if (!users || !numExistingUsers) {
          userName = members[0];

          // if we're the first user, delete any existing data
          firebaseGroupRef.child('chat').set({});
          firebaseGroupRef.child('clients').set({});
          firebaseGroupRef.child('model').set({});
        } else if (numExistingUsers < numClients) {
          for (var i = 0, ii=members.length; i<ii; i++) {
            if (!users[members[i]]) {
              userName = members[i];
              break;
            }
          }
        }
      } else {
        delete users[userName];
      }

      if (userName && (!users || Object.keys(users).length) < numClients) {
        firebaseUsersRef.child(userName).set({here: true});
        onDisconnectRef = firebaseUsersRef.child(userName).onDisconnect();
        onDisconnectRef.set({});
      }

      UserRegistrationView.open(self, {form: "groupconfirm", users: users, userName: userName, groupName: groupName, numExistingUsers: numExistingUsers});
    });

    logController.logEvent("Started to join group", groupName);
  },

  rejectGroupName: function() {
    firebaseUsersRef.off("value", groupUsersListener);

    // clean up
    if (onDisconnectRef) {
      onDisconnectRef.cancel();
    }
    if (userName) {
      firebaseUsersRef.once("value", function(snapshot) {
        var users = snapshot.val();
        delete users[userName];
        if (Object.keys(users).length) {
          // delete ourselves
          firebaseUsersRef.child(userName).remove();
        } else {
          // delete the room if we are the only member
          firebaseGroupRef.remove();
        }
        userName = null;
      });
    }

    UserRegistrationView.open(this, {form: "groupname"});


    logController.logEvent("Rejected Group", groupName);
  },

  setGroupName: function(_groupName) {
    var self = this;

    groupName = _groupName;

    firebaseUsersRef.off("value", groupUsersListener);

    logController.setGroupName(groupName);
    logController.setUserName(userName);
    laraController.setGlobalState({
      identity: {
        groupName: groupName,
        userName: userName
      }
    });

    notifyGroupRefCreation();

    // annoyingly we have to get out of this before the off() call is finalized
    setTimeout(function(){
      boardsSelectionListener = firebaseUsersRef.on("value", function(snapshot) {
        var users = snapshot.val();
        UserRegistrationView.open(self, {form: "selectboard", numClients: numClients, users: users, userName: userName});
      });
    }, 1);
  },

  selectClient: function(_client) {
    client = _client;
    firebaseUsersRef.child(userName).set({client: client});
  },

  setUnknownValues: function (unknownValues) {
    firebaseUsersRef.child(userName).set({client: client, unknownValues: unknownValues});
  },

  selectedClient: function() {
    firebaseUsersRef.off("value");
    UserRegistrationView.close();

    var chatRef = firebaseGroupRef.child('chat'),
        message = userName + " has joined on Circuit "+((client*1)+1)+".";

    chatRef.push({
      user: "System",
      message: message,
      type: "joined",
      time: Firebase.ServerValue.TIMESTAMP
    });
    var disconnectMessageRef = chatRef.push();
    disconnectMessageRef.onDisconnect().set({
      user: "System",
      message: userName + " has left",
      type: "left",
      time: Firebase.ServerValue.TIMESTAMP
    });
    callback(client);
  },

  getUsername: function() {
    return userName;
  },

  getGroupname: function() {
    return groupName;
  },

  getClient: function () {
    return client;
  },

  getServerSkew: function () {
    return serverSkew;
  },

  getFirebaseGroupRef: function() {
    return firebaseGroupRef;
  },

  getOtherClientNos: function() {
    var ret = [];
    for (var i = 0; i < numClients; i++) {
      if (i != client) {
        ret.push(i);
      }
    }
    return ret;
  },

  onGroupRefCreation: function(callback) {
    if (firebaseGroupRef) {
      callback();
    } else {
      if (!groupRefCreationListeners) {
        groupRefCreationListeners = [];
      }
      groupRefCreationListeners.push(callback);
    }
  },

  createFirebaseGroupRef: function (activityName, groupName) {
    fbUrl = fbUrlBase + getDate() + "-" + groupName + "/activities/" + activityName + "/";
    firebaseGroupRef = new Firebase(fbUrl);
    return firebaseGroupRef;
  }
};


},{"../../data/shared/group-names":7,"../../views/shared/userRegistration.jsx":24,"./lara":4,"./log":5}],7:[function(require,module,exports){
var sortByName = function (a, b) {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
};

module.exports = [
  {
    name: "Animals",
    members: [
      "Lion", "Tiger", "Bear"
    ]
  },
  {
    name: "Birds",
    members: [
      "Eagle", "Seagull", "Hawk"
    ]
  },
  {
    name: "Vehicles",
    members: [
      "Truck", "Car", "Van"
    ]
  },
  {
    name: "Tools",
    members: [
      "Hammer", "Pliers", "Wrench"
    ]
  },
  {
    name: "Office",
    members: [
      "Pencil", "Paper", "Pen"
    ]
  },
  {
    name: "Geography",
    members: [
      "Mountain", "Plain", "Valley"
    ]
  },
  {
    name: "Water",
    members: [
      "Ocean", "River", "Lake"
    ]
  },
  {
    name: "Weather",
    members: [
      "Rain", "Snow", "Sleet"
    ]
  },
  {
    name: "Dogs",
    members: [
      "Poodle", "Collie", "Spaniel"
    ]
  },
  {
    name: "Pets",
    members: [
      "Dog", "Cat", "Hamster"
    ]
  },
  {
    name: "Kitchen",
    members: [
      "Pot", "Pan", "Skillet"
    ]
  },
  {
    name: "Sides",
    members: [
      "Soup", "Salad", "Roll"
    ]
  },
  {
    name: "Dessert",
    members: [
      "Cake", "Icecream", "Pie"
    ]
  },
  {
    name: "Fruit",
    members: [
      "Peach", "Plum", "Grape"
    ]
  },
  {
    name: "Vegetable",
    members: [
      "Lettuce", "Celery", "Tomato"
    ]
  },
  {
    name: "Potatoes",
    members: [
      "Mashed", "Baked", "Fries"
    ]
  },
  {
    name: "Colors",
    members: [
      "Blue", "Red", "Green"
    ]
  },
  {
    name: "Instruments",
    members: [
      "Guitar", "Horn", "Piano"
    ]
  },
  {
    name: "Shapes",
    members: [
      "Circle", "Square", "Triangle"
    ]
  },
  {
    name: "Directions",
    members: [
      "North", "East", "West"
    ]
  },
  {
    name: "Towns",
    members: [
      "Acton", "Maynard", "Concord"
    ]
  },
  {
    name: "States",
    members: [
      "Utah", "Ohio", "Iowa"
    ]
  }
].sort(sortByName);


},{}],8:[function(require,module,exports){
module.exports = function() {
  try {
    return window.self !== window.top;
  }
  catch (e) {
    return true;
  }
};


},{}],9:[function(require,module,exports){
/**
 The workbench adaptor takes a TT-workbench definition such as

{
  externalComponents: [
    { comp1 ... connections: "0:a1,1:b2" }
  ],
  clients: [
    {
      circuit: [
        { comp2 ... connections: "a1,b2" },
      ],
      view_prop1: x,
      view_prop2: x
    },
    {
      circuit: [
        { comp3 ... connections: "a1,b2" },
      ],
      view_prop1: y,
      view_prop2: y
    }
 }

 and transforms it for consumption by breadboard.js to (in this case for client-0):

{
  circuit: [
    { comp1 ..., connections: "a1,1:b2", hidden: true },
    { comp2 ..., connections: "a1,b2" },
    { comp3 ..., connections: "1:a1,1:b2", hidden: true }
  ],
  view_prop1: x,
  view_prop2: x
}

when client-0 makes changes, it pushes just those component values to the backend.
**/

var WorkbenchAdaptor = function(client) {
  this.client = client;
};

WorkbenchAdaptor.prototype = {
  processTTWorkbench: function(ttWorkbench) {
    var workbenchDef = {
         circuit: []
        },
        comps, comp, clients, ownCircuit, clientProps,
        i, ii, j, jj;

    // copy externalComponents as hidden components
    comps = ttWorkbench.externalComponents;
    if (comps) {
      for (i = 0, ii = comps.length; i < ii; i++) {
        comp = comps[i];
        this.validate(comp);
        comp.hidden = true;
        // removes any x: from connection if x == client
        comp.connections = comp.connections.replace(new RegExp(this.client+":","g"),"");
        workbenchDef.circuit.push(comp);
      }
    }

    // copy client components, hiding those that aren't the client's
    clients = ttWorkbench.clients;
    for (i = 0, ii = clients.length; i < ii; i++) {

      comps = clients[i].circuit;
      ownCircuit = i == this.client;

      if (comps) {
        for (j = 0, jj = comps.length; j < jj; j++) {
          comp = comps[j];
          this.validate(comp);
          comp.hidden = !ownCircuit;
          // transforms other clients connections, e.g. "a1,b2", to "0:L1,0:L2"
          if (!ownCircuit) {
            comp.connections = i+":"+comp.connections.split(",").join(","+i+":");
            comp.connections = comp.connections.replace(/[abcde](\d)/g,"L$1");
            comp.connections = comp.connections.replace(/[fghij](\d)/g,"L$1");
          }
          workbenchDef.circuit.push(comp);
        }
      }

    }

    // copy non-circuit properties from the appropriate client def
    clientProps = ttWorkbench.clients[this.client];
    for (var prop in clientProps) {
      if (clientProps.hasOwnProperty(prop) && prop != "circuit") {
        workbenchDef[prop] = clientProps[prop];
      }
    }

    return workbenchDef;
  },

  validate: function (comp) {
    if (!comp.type) {
      throw new Error("Component is missing a type");
    }
    if (!comp.connections && (comp.UID != "source")) {
      throw new Error("Component is missing connections");
    }
  },

  getClientCircuit: function() {
    var circuit = JSON.parse(sparks.workbenchController.serialize()).circuit,
        ownCircuit = [];

    for (var i = 0, ii = circuit.length; i < ii; i++) {
      var comp = circuit[i];
      // turn off bitwise checking for this line
      // jshint bitwise:false
      if (!~comp.connections.indexOf(":") && comp.type != "powerLead") {
        // jshint bitwise:true
        // ugly
        var nodes = comp.connections.replace(/ghost/g, '').split(","),
            bbHoles = sparks.workbenchController.breadboardController.getHoles();
        if (bbHoles[nodes[0]] || bbHoles[nodes[1]]) {
          ownCircuit.push(comp);
        }
      }
    }

    return ownCircuit;
  },

  updateClient: function(client, newCircuit, isMyCircuit) {
    var clientCircuit = [],
        clientUIDs = [],
        comp, oldCircuit, i, ii, j, k, removeMyComponent, removeOtherComponent, uid, newComponent;

    if (!newCircuit) {
      return;
    }

    for (i = 0, ii = newCircuit.length; i < ii; i++) {
      comp = newCircuit[i];

      // skip remote ghosts
      if (!isMyCircuit && (comp.connections.indexOf('ghost') != -1)) {
        continue;
      }

      // save ghost hole information
      comp.savedConnectionList = comp.connections.slice(0).split(',');
      comp.connections = comp.connections.replace(/ghost/g, '');

      // transforms other clients connections, e.g. "a1,b2", to "0:a1,0:b2"
      if (!isMyCircuit) {
        comp.connections = client+":"+comp.connections.split(",").join(","+client+":");
        comp.connections = comp.connections.replace(/[abcde](\d)/g,"L$1");
        comp.connections = comp.connections.replace(/[fghij](\d)/g,"L$1");
      }
      clientCircuit.push(comp);
      clientUIDs.push(comp.UID);
    }

    // update in place
    oldCircuit = JSON.parse(sparks.workbenchController.serialize()).circuit;
    for (i = 0, ii = oldCircuit.length; i < ii; i++) {
      comp = oldCircuit[i];
      removeMyComponent = isMyCircuit && (clientUIDs.indexOf(comp.UID) != -1);
      removeOtherComponent = !isMyCircuit && (comp.connections.indexOf(client+":") != comp.connections.lastIndexOf(client+":"));
      if (removeMyComponent || removeOtherComponent) {
        sparks.workbenchController.breadboardController.remove(comp.type, comp.connections);
      }
    }

    for (i = 0, ii = clientCircuit.length; i < ii; i++) {
      comp = clientCircuit[i];
      comp.hidden = !isMyCircuit;
      uid = sparks.workbenchController.breadboardController.insertComponent(comp.type, comp);
      newComponent = sparks.workbenchController.breadboardView.component[uid];

      // disconnect the leads of components with ghost holes
      if (newComponent) {
        for (j = 0, k = comp.savedConnectionList.length; j < k; j++) {
          if (comp.savedConnectionList[j].indexOf('ghost') != -1) {
            newComponent.leads[j].disconnect();
          }
        }
      }
    }
    sparks.workbenchController.workbench.meter.update();
  },

  isCurrentFlowing: function (circuit) {
    if (circuit) {
      for (var i = 0, ii = circuit.length; i < ii; i++) {
        if (circuit[i].connections.indexOf("ghost") !== -1) {
          return false;
        }
      }
    }
    return true;
  }
};

module.exports = WorkbenchAdaptor;


},{}],10:[function(require,module,exports){
var eventsController = require('../../controllers/shared/events'),
    logController = require('../../controllers/shared/log'),
    clientListFirebaseRef,
    myCircuitFirebaseRef,
    myMeterFirebaseRef,
    clientNumber,
    wa,
    userController;

function init() {
  sparks.logController.addListener(function(evt) {
    switch (evt.name) {
      case "Changed circuit":
        myCircuitFirebaseRef.set(wa.getClientCircuit());
        break;
      case "Moved DMM dial":
        myMeterFirebaseRef.child('DMM').set(evt.value.value);
        break;
      case "Attached probe":
        myMeterFirebaseRef.child('probes').child(evt.value.color).set({event: 'attached', hole: evt.value.location});
        break;
      case "Dropped probe":
        myMeterFirebaseRef.child('probes').child(evt.value.color).set({event: 'dropped', position: evt.value.position});
        break;
    }
    eventsController.handleLocalSparksEvent(evt);
  });

  // scratch
  var otherClients = userController.getOtherClientNos();
  for (var i = 0, ii = otherClients.length; i < ii; i++) {
    var otherClient = otherClients[i];
    addClientListener(otherClient);
  }
}

function addClientListener(client) {
  clientListFirebaseRef.child(client).on("value", function(snapshot) {
    var circuit = snapshot.val();
    logController.updateIfCurrentFlowing(circuit);
    wa.updateClient(client, circuit, false);
  });
}

function WorkbenchFBConnector(_userController, _clientNumber, _wa) {
  if (!_userController.getFirebaseGroupRef()) {
    return;
  }
  userController = _userController;
  clientNumber = _clientNumber;
  clientListFirebaseRef = userController.getFirebaseGroupRef().child('clients');
  myCircuitFirebaseRef = clientListFirebaseRef.child(clientNumber);

  myMeterFirebaseRef = userController.getFirebaseGroupRef().child('meters').child(clientNumber);

  wa = _wa;
  logController.setWorkbenchAdapter(_wa);
  init();
}

WorkbenchFBConnector.prototype.setClientCircuit = function () {
  if (myCircuitFirebaseRef) {
    myCircuitFirebaseRef.set(wa.getClientCircuit());
  }
};

WorkbenchFBConnector.prototype.resetMeters = function () {
  if (myMeterFirebaseRef) {
    myMeterFirebaseRef.set({});
  }
};

module.exports = WorkbenchFBConnector;


},{"../../controllers/shared/events":3,"../../controllers/shared/log":5}],11:[function(require,module,exports){
var xhrObserver;

function XHRObserver() {
  this.connectionListeners = [];
}

XHRObserver.prototype = {

  online: true,

  setOnline: function(online) {
    this.online = online;
    this.notifyListeners();
  },

  addConnectionListener: function(listener) {
    this.connectionListeners.push(listener);
  },

  notifyListeners: function() {
    for (var i = 0; i < this.connectionListeners.length; i++) {
      this.connectionListeners[i](this.online);
    }
  },

  createObservedXMLHttpRequest: function(successCallback) {
    var request = new XMLHttpRequest();

    request.repeatablePost = function(url, contentHeader, data) {
      request._repeat = true;
      request._url = url;
      request._contentHeader = contentHeader;
      request._data = data;

      request.open('POST', url, true);
      request.setRequestHeader('Content-Type', contentHeader);
      request.send(data);
    };

    request.onerror = this.onError;
    request.onload = function(evt) {
      if (request.status >= 200 && request.status < 400) {
        xhrObserver.setOnline(true);
        if (successCallback) {
          successCallback();
        }
      } else {
        xhrObserver.onError(evt);
      }
    };



    return request;
  },

  onError: function(evt) {
    xhrObserver.setOnline(false);

    if (evt.currentTarget._repeat) {
      setTimeout(function() {
        var request = evt.currentTarget;
        request.open('POST', request._url, true);
        request.setRequestHeader('Content-Type', request._contentHeader);
        request.send(request._data);
      }, 2000);
    }
  }

};

module.exports = xhrObserver = new XHRObserver();


},{}],12:[function(require,module,exports){
var PageView              = React.createFactory(require('./page.jsx')),
    WorkbenchAdaptor      = require('../../data/shared/workbenchAdaptor'),
    WorkbenchFBConnector  = require('../../data/shared/workbenchFBConnector'),
    logController         = require('../../controllers/shared/log'),
    userController        = require('../../controllers/shared/user'),
    eventsController      = require('../../controllers/shared/events'),
    config                = require('../../config'),
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
      ttWorkbench: null,
      model: null
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
        ttWorkbench: this.state.ttWorkbench,
        model: this.state.model
      });
    }
  },

  componentDidMount: function () {
    var activityName = window.location.hash.substring(1) || "three-resistors-level1";

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
      self.preProcessWorkbench(ttWorkbench, function (ttWorkbench, model) {

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
          activityName: activityName,
          model: model
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
            $('.breadboard svg').css({width: 740});
            $('.breadboard svg')[0].setAttribute('viewBox', "60 0 740 500");
            $("g[info=probes]").attr({transform: "matrix(0.05 0 0 0.05 60 -100)"});
          }
          catch (e) {
            // sparks is throwing an error when computing the distance between points on load
            if (console.error) {
              console.error(e);
            }
          }

          // change the resistor editor to use a select instead of a slider and manually place it because of positioning issues with the svg viewbox change
          sparks.workbenchController.breadboardView.useSelectInPropertyEditor = true;
          sparks.workbenchController.breadboardView.setTooltipPosition({top: 145, left: 215});

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
          cb(JSON.parse(json), model);
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
        R1     = this.uniformResistor(100, 1000, []),
        R2     = this.uniformResistor(100, 1000, [R1]),
        R3     = this.uniformResistor(100, 1000, [R1, R2]),
        GoalR  = this.uniformResistor(100, 1000, [R1, R2, R3]),
        GoalR1 = this.uniformResistor(100, 1000, [R1, R2, R3, GoalR]),
        GoalR2 = this.uniformResistor(100, 1000, [R1, R2, R3, GoalR, GoalR1]),
        GoalR3 = this.uniformResistor(100, 1000, [R1, R2, R3, GoalR, GoalR1, GoalR2]),

        model = {
          E: 6 + Math.round(Math.random() * (19 - 6)), // from 6 to 19 volts
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


},{"../../config":2,"../../controllers/shared/events":3,"../../controllers/shared/log":5,"../../controllers/shared/user":6,"../../data/shared/workbenchAdaptor":9,"../../data/shared/workbenchFBConnector":10,"./page.jsx":19,"./view-other-circuit":22}],13:[function(require,module,exports){
// adapted from http://thecodeplayer.com/walkthrough/javascript-css3-calculator
/*jslint evil: true */

var logController = require('../../controllers/shared/log');

module.exports = React.createClass({

  displayName: 'Calculator',

  getInitialState: function() {
    this.inverse = '1/x';
    this.squareRoot = String.fromCharCode(8730);
    this.equals = '=';

    return {
      input: '',
      open: false,
      evaled: false,
      error: false,
      memory: "",
      mrcPressedOnce: false,
      closeRight: 10,
      closeTop: 10,
      openRight: 10,
      openTop: 10
    };
  },

  open: function (e) {
    logController.logEvent("Opened calculator");
    this.setState({open: true});
    e.preventDefault();
  },

  close: function (e) {
    logController.logEvent("Closed calculator");
    this.setState({open: false});
    e.preventDefault();
  },

  clear: function (e) {
    logController.logEvent("Cleared calculator");
    this.setState({
      input: '',
      evaled: false,
      error: false,
      mrcPressedOnce: false
    });
    e.preventDefault();
  },

  eval: function (e) {
    var input = this.state.input,
        equation = input.replace(/(\+|\-|\*|\/|\.)$/, '')     // lop off any remaining ops at end.
                        .replace(/÷/g, '/')                   // replace visually-nice symbols with actual
                        .replace(/–/g, '-')
                        .replace(/x/g, '*'),
        key = e.target.innerHTML,
        error = false,
        evaled;

    if (equation) {
      if (key === this.inverse) {
        equation = "1/(" + equation + ")";
      }
      else if (key === this.squareRoot) {
        equation = "Math.sqrt(" + equation + ")";
      }
      try {
        evaled = eval(equation);
        error = isNaN(evaled) || !isFinite(evaled);
        if (!error) {
          input = evaled.toString();
        }
        logController.logEvent("Calculation performed", null, {
          "key": key,
          "calculation": equation,
          "result": evaled.toString()
        });
      }
      catch (err) {
        logController.logEvent("Calculation error", null, {
          "key": key,
          "calculation": equation,
          "error": err.toString()
        });
        error = true;
      }
      this.setState({
        input: input,
        evaled: !error,
        error: error,
        mrcPressedOnce: false
      });
    }

    e.stopPropagation();
    e.preventDefault();
  },

  mrcPressed: function (e) {
    if (!this.state.mrcPressedOnce) {
      var input = this.state.input,
          endsWithOperator = input.match(/(\+|–|x|÷)$/),
          evaled = false;
      if (endsWithOperator) {
        input += this.state.memory;
      } else {
        input = this.state.memory;
        evaled = true;
      }

      this.setState({
        input: input,
        mrcPressedOnce: true,
        evaled: evaled
      });
    } else {
      this.setState({
        memory: "",
        mrcPressedOnce: false
      });
    }

    e.stopPropagation();
    e.preventDefault();
  },

  mplusPressed: function() {
    var evaled = this.state.evaled,
        input = this.state.input,
        containsOperator = input.match(/(\+|–|x|÷)/),
        memory = this.state.memory;
    if (evaled || !containsOperator) {
      if (memory) {
        memory = (parseFloat(memory) + parseFloat(input)).toString();
      } else {
        memory = input;
      }
    }

    this.setState({
      memory: memory,
      mrcPressedOnce: false
    });
  },

  keyPressed: function (e) {
    var input = this.state.input,
        preInput = input,
        empty = input.length === 0,
        endsWithOperator = input.match(/(\+|–|x|÷)$/),
        key = e.target.innerHTML,
        evaled = false;

    // ignore clicks off the buttons
    if (e.target.nodeName !== 'SPAN') {
      return;
    }

    if (key.match(/(\+|–|x|÷)/)) {
      if (!empty) {
        if (!endsWithOperator || key == '-') {
          input += key;
        }
        else if (input.length > 1) {
          input = input.replace(/.$/, key);
        }
      }
      else if (empty && key == '-') {
        input += key;
      }
    }
    else if (key == '.') {
      if (!input.match(/\.\d*$/g) && !this.state.evaled) {
        input += key;
      }
    }
    else if (this.state.evaled) {
      input = key;
    }
    else {
      input += key;
    }

    logController.logEvent("Calculator button pressed", null, {
      "button": key,
      "preCalculation": preInput,
      "postCalculation": input,
      "changed": this.state.input != input
    });

    if (this.state.input != input) {
      this.setState({
        input: input,
        evaled: evaled,
        mrcPressedOnce: false
      });
    }

    e.preventDefault();
  },

  keyboardChange: function (e) {
    var newValue = e.target.value;

    // only allow keyboard updates that match the following format:
    // start with a number or period, and contains only numbers, periods, or operators
    if (/^(\d|\.)(\d|\.|\+|-|–|\/|÷|\*|x)*$/.test(newValue) || !newValue) {
      // update the expression to use our pretty operators
      newValue = newValue.replace(/\//g, '÷')
                  .replace(/-/g, '–')
                  .replace(/\*/g, 'x');
      this.setState({
        input: newValue,
        evaled: false,
        mrcPressedOnce: false
      });
    }
  },

  keyboardPress: function(e) {
    if (e.key == "Enter") {
      this.eval(e);
    }
  },

  startDrag: function (e) {
    this.dragging = (this.state.open && (e.target.nodeName != 'SPAN'));
    this.dragged = false;
    if (!this.dragging) {
      return;
    }
    this.startCalculatorPos = {
      right: this.state.openRight,
      top: this.state.openTop,
    };
    this.startMousePos = {
      x: e.clientX,
      y: e.clientY
    };
  },

  drag: function (e) {
    var newPos;
    if (this.dragging) {
      // the calculations are reversed here only because we are setting the right pos and not the left
      newPos = {
        openRight: this.startCalculatorPos.right + (this.startMousePos.x - e.clientX),
        openTop: this.startCalculatorPos.top + (e.clientY - this.startMousePos.y)
      };
      if ((newPos.openRight != this.state.openRight) || (newPos.openTop != this.state.openTop)) {
        this.setState(newPos);
        this.dragged = true;
      }
    }
  },

  endDrag:  function () {
    if (this.dragged) {
      logController.logEvent("Calculator dragged", null, {
        "startTop": this.startCalculatorPos.top,
        "startRight": this.startCalculatorPos.right,
        "endTop": this.state.openTop,
        "endRight": this.state.openRight,
      });
      this.dragged = false;
    }
    this.dragging = false;
  },

  render: function() {
    var style = {
          top: this.state.open ? this.state.openTop : this.state.closeTop,
          right: this.state.open ? this.state.openRight : this.state.closeRight
        },
        mShowing = !!this.state.memory,
        mClass = "memory" + (mShowing ? "" : " hidden");

    if (this.state.open) {
      return (
        React.createElement("div", {id: "calculator", onMouseDown:  this.startDrag, onMouseMove:  this.drag, onMouseUp:  this.endDrag, style:  style }, 
          React.createElement("div", {className: "top very-top"}, 
            React.createElement("span", {className: "close", onClick:  this.close}, "X")
          ), 

          React.createElement("div", {className: "top"}, 
            React.createElement("div", {className:  mClass }, "M"), 
            React.createElement("input", {className:  this.state.error ? 'screen screen-error' : 'screen', value:  this.state.input, onChange:  this.keyboardChange, onKeyPress:  this.keyboardPress})
          ), 

          React.createElement("div", {className: "topRow"}, 
            React.createElement("span", {className: "clear", onClick:  this.clear}, "C"), 
            React.createElement("span", {className: "memory", onClick:  this.mrcPressed}, "MRC"), 
            React.createElement("span", {className: "memory", onClick:  this.mplusPressed}, "M+"), 
            React.createElement("span", {className: "eval squareroot", onClick:  this.eval}, this.squareRoot), 
            React.createElement("span", {className: "eval", onClick:  this.eval}, this.inverse)
          ), 

          React.createElement("div", {className: "keys", onClick:  this.keyPressed}, 

            React.createElement("span", null, "7"), 
            React.createElement("span", null, "8"), 
            React.createElement("span", null, "9"), 
            React.createElement("span", {className: "operator"}, "+"), 

            React.createElement("span", null, "4"), 
            React.createElement("span", null, "5"), 
            React.createElement("span", null, "6"), 
            React.createElement("span", {className: "operator"}, "–"), 

            React.createElement("span", null, "1"), 
            React.createElement("span", null, "2"), 
            React.createElement("span", null, "3"), 
            React.createElement("span", {className: "operator"}, "÷"), 

            React.createElement("span", null, "0"), 
            React.createElement("span", null, "."), 
            React.createElement("span", {className: "eval", onClick:  this.eval}, this.equals), 
            React.createElement("span", {className: "operator multiply"}, "x")
          )
        )
      );
    }
    else {
      return (
        React.createElement("div", {id: "open-calculator", onClick:  this.open, style:  style }, 
          "Calculator"
        )
      );
    }
  }
});


},{"../../controllers/shared/log":5}],14:[function(require,module,exports){
var xhrObserver = require('../../data/shared/xhrObserver');
var logController = require('../../controllers/shared/log');

module.exports = React.createClass({
  displayName: 'Connection',

  getInitialState: function() {
    return {connected: true};
  },

  componentWillMount: function() {
    var self = this;
    xhrObserver.addConnectionListener(function(connected) {
      var now = Date.now();
      if (connected && !self.state.connected) {
        logController.logEvent("Reconnected", null, {disconnectTime: self.state.disconnectTime, disconnectDuration: now - self.state.disconnectTime});
      }
      self.setState(connected ? {connected: true} : {connected: false, disconnectTime: now});
    });
  },

  render: function() {
    var alert;
    if (!this.state.connected) {
      alert = (
                React.createElement("div", {id: "connection-alert"}, 
                  React.createElement("h2", null, "Connection Lost"), 
                  React.createElement("p", null, "This computer appears to have lost connection to the web."), 
                  React.createElement("p", null, "Please try and resolve connection issues before trying to refresh the page."), 
                  React.createElement("p", null, "This message will disappear when connection is reestablished.")
                )
              );
    }
    return (
      React.createElement("div", null, 
        React.createElement("div", {id: "connection-status"}, 
          React.createElement("div", {className:  this.state.connected ? "online" : "offline"}), 
          this.state.connected ? "Online" : "Offline"
        ), 
         alert 
      )
    );
  }
});


},{"../../controllers/shared/log":5,"../../data/shared/xhrObserver":11}],15:[function(require,module,exports){
/* global CodeMirror: false */

var div = React.DOM.div,
    span = React.DOM.span,
    italics = React.DOM.i,
    storagePrefix = 'local:',
    loginKey = 'editor:login',
    Header, Toolbar, Editor, Dialog, FileListItem;

module.exports = React.createClass({

  displayName: 'EditorView',

  componentDidMount: function() {
    var rawLoginInfo = localStorage.getItem(loginKey),
        loginInfo = rawLoginInfo ? JSON.parse(rawLoginInfo) : null;
    if (loginInfo && loginInfo.email && loginInfo.password) {
      this.login(loginInfo.email, loginInfo.password);
    }
  },

  getInitialState: function () {
    var state = this.getEmptyState();
    state.showDialog = false;
    this.firebase = new Firebase('https://teaching-teamwork.firebaseio.com/dev/');
    this.authClient = null;
    this.remoteUrlWatcher = null;
    return state;
  },

  getEmptyState: function () {
    return {
      filename: null,
      dirty: false,
      empty: true,
      text: this.getEmptyDoc(),
      newed: true,
      user: this.state ? this.state.user : null,
      username: this.state ? this.state.username : null,
      remoteUrl: null,
      via: null,
      published: false
    };
  },

  getEmptyDoc: function () {
    return JSON.stringify({
      "name": "",
      "externalComponents": [],
      "clients": []
    }, null, 2);
  },

  okIfDirty: function () {
    if (this.state.dirty) {
      return confirm('The current activity is not saved.  Are you sure you want to continue?');
    }
    return true;
  },

  hideDialog: function () {
    this.setState({showDialog: false});
  },

  newFile: function () {
    this.setState(this.getEmptyState());
  },

  getRemoteUrl: function (filename) {
    return this.state.username && filename ? ('https://teaching-teamwork.firebaseio.com/dev/activities/' + this.state.username + '/' + filename) : null;
  },

  componentWillUpdate: function (nextProps, nextState) {
    var self = this;

    if (nextState.remoteUrl != this.state.remoteUrl) {
      if (this.remoteUrlWatcher) {
        this.remoteUrlWatcher.off();
        this.remoteUrlWatcher = null;
      }
      if (nextState.remoteUrl) {
        this.remoteUrlWatcher = new Firebase(nextState.remoteUrl);
        this.remoteUrlWatcher.on("value", function (snapshot) {
          self.setState({published: !!snapshot.val()});
        });
      }
    }

    if (JSON.stringify(nextProps.editorState) != JSON.stringify(this.props.editorState)) {
      this.setState({
        filename: nextProps.editorState.filename,
        remoteUrl: this.getRemoteUrl(nextProps.editorState.filename),
        via: nextProps.editorState.via,
        text: nextProps.editorState.text,
        dirty: false,
        empty: nextProps.editorState.text.length === 0,
        opened: false
      });
    }
  },

  openFile: function (localOrRemoteFilename) {
    var self = this,
        slashPos = localOrRemoteFilename.indexOf('/'),
        username = slashPos ? localOrRemoteFilename.substr(0, slashPos) : null,
        filename = slashPos ? localOrRemoteFilename.substr(slashPos + 1) : null,
        url = username && filename ? ('https://teaching-teamwork.firebaseio.com/dev/activities/' + username + '/' + filename) : null,
        firebase = url ? new Firebase(url) : null,
        text = !firebase ? localStorage.getItem(storagePrefix + localOrRemoteFilename) : null;

    if (text) {
      this.setState({
        filename: localOrRemoteFilename,
        remoteUrl: this.getRemoteUrl(localOrRemoteFilename),
        via: null,
        text: text,
        dirty: false,
        empty: text.length === 0,
        opened: true
      });
      this.hideDialog();
    }
    else if (firebase) {
      firebase.once('value', function (snapshot) {
        var jsonData = snapshot.val();
        if (jsonData) {
          self.setState({
            filename: filename,
            remoteUrl: self.getRemoteUrl(filename),
            via: 'user ' + username,
            text: jsonData,
            dirty: false,
            empty: jsonData.length === 0,
            opened: true
          });
          self.hideDialog();
        }
        else {
          alert("No data found for REMOTE activity at " + url);
        }
      }, function () {
        alert("Could not find REMOTE activity at " + url);
      });
    }
    else {
      alert('Unable to open ' + filename);
    }
  },

  saveFile: function (filename) {
    localStorage.setItem(storagePrefix + filename, this.state.text);
    this.setState({
      filename: filename,
      dirty: false,
      remoteUrl: this.getRemoteUrl(filename),
      via: null
    });
    this.hideDialog();
  },

  deleteFile: function () {
    localStorage.removeItem(storagePrefix + this.state.filename);
    this.newFile();
  },

  useFile: function () {
    this.props.parseAndStartActivity(this.state.filename || 'New Activity', this.state.text);
  },

  useRemoteFile: function () {
    window.open('#remote:' + this.state.username + '/' + this.state.filename);
  },

  formatText: function () {
    try {
      this.setState({text: JSON.stringify(JSON.parse(this.state.text), null, 2)});
    }
    catch (e) {
      alert('Unable to format invalid JSON!');
    }
  },

  isValidText: function (message) {
    try {
      JSON.parse(this.state.text);
      return true;
    }
    catch (e) {
      alert(message || 'The JSON is NOT valid');
      return false;
    }
  },

  login: function (email, password) {
    email = email || prompt('Email?');
    password = password || (email ? prompt('Password?') : null);

    if (email && password) {
      var self = this;
      this.firebase.authWithPassword({
        email: email,
        password: password
      }, function (error, authData) {
        var atPos = authData && authData.password && authData.password.email ? authData.password.email.indexOf('@') : 0,
            username = atPos ? authData.password.email.substr(0, atPos) : null;
        if (error) {
          alert(error);
        }
        else {
          localStorage.setItem(loginKey, JSON.stringify({
            email: email,
            password: password
          }));
        }
        self.setState({
          user: authData,
          username: username,
          remoteUrl: self.getRemoteUrl(self.state.filename)
        });
      });
    }
  },

  logout: function () {
    if (confirm('Are you sure you want to logout?')) {
      this.firebase.unauth();
      this.setState({user: null});
      localStorage.setItem(loginKey, null);
    }
  },

  publishFile: function () {
    this.firebase.child('activities').child(this.state.username).child(this.state.filename).set(this.state.text);
  },

  getPublishedFiles: function (callback) {
    this.firebase.child('activities').once('value', function (snapshot) {
      callback(snapshot ? snapshot.val() : null);
    });
  },

  handleToolbar: function (button) {
    var self = this,
        showDialog = function () {
          self.setState({showDialog: self.state.showDialog ? false : button});
        };

    switch (button) {
      case 'New':
        if (this.okIfDirty()) {
          this.newFile();
        }
        break;
      case 'Open':
        if (this.state.showDialog || this.okIfDirty()) {
          showDialog();
        }
        break;
      case 'Save':
        if (this.isValidText('Sorry, you must fix the JSON errors before you can save.')) {
          if (this.state.filename) {
            this.saveFile(this.state.filename);
          }
          else {
            showDialog();
          }
        }
        break;
      case 'Save As':
        if (this.isValidText('Sorry, you must fix the JSON errors before you can save.')) {
          showDialog();
        }
        break;
      case 'Use':
        this.useFile(true);
        break;
      case 'Use Remote':
        if (this.okIfDirty()) {
          this.useRemoteFile(false);
        }
        break;
      case 'Delete':
        if (confirm('Are you sure you want to delete this?')) {
          this.deleteFile();
        }
        break;
      case 'Format':
        this.formatText();
        break;
      case 'Validate':
        if (this.isValidText()) {
          alert('The JSON is valid');
        }
        break;
      case 'Login':
        this.login();
        break;
      case 'Logout':
        this.logout();
        break;
      case 'Publish':
        if (this.isValidText('Sorry, you must fix the JSON errors before you can publish.') && this.okIfDirty()) {
          this.publishFile();
        }
        break;
    }
  },

  editorChanged: function (text) {
    var empty = text.length === 0;
    this.setState({
      empty: empty,
      dirty: !empty && !this.state.opened && !this.state.newed,
      text: text,
      opened: false,
      newed: false
    });
  },

  render: function () {
    return div({id: 'editor'},
      Header({
        filename: this.state.filename,
        dirty: this.state.dirty,
        user: this.state.user,
        username: this.state.username,
        via: this.state.via,
        published: this.state.published
      }),
      Toolbar({
        filename: this.state.filename,
        dirty: this.state.dirty,
        empty: this.state.empty,
        user: this.state.user,
        onButtonPressed: this.handleToolbar,
        published: this.state.published
      }),
      Editor({
        changed: this.editorChanged,
        text: this.state.text
      }),
      Dialog({
        show: this.state.showDialog,
        hideDialog: this.hideDialog,
        openFile: this.openFile,
        saveFile: this.saveFile,
        getPublishedFiles: this.getPublishedFiles
      })
    );
  }
});

Header = React.createFactory(React.createClass({
  displayName: 'Header',

  render: function () {
    var alert = function (type, show, text) {
      return show ? span({className: 'alert alert-' + type}, text) : null;
    };
    return div({className: 'header'},
      'Teaching Teamwork Activity Editor - ',
      span({}, this.props.filename || italics({}, 'New Activity')),
      this.props.via ? italics({}, ' (via ', this.props.via, ')') : null,
      alert('warning', this.props.dirty, 'UNSAVED'),
      alert('info', this.props.published && !this.props.dirty, 'PUBLISHED'),
      alert('warning', this.props.published && this.props.dirty, 'CHANGES NOT PUBLISHED'),
      div({style: {float: 'right'}}, this.props.user ? (this.props.user.password.email + ' (' + this.props.username + ')') : null)
    );
  }
}));

Toolbar = React.createFactory(React.createClass({
  displayName: 'Toolbar',

  clicked: function (e) {
    var button = e.target;
    if ((button.nodeName != 'SPAN') || (button.className == 'disabled')) {
      return;
    }
    this.props.onButtonPressed(button.innerHTML);
  },

  render: function () {
    var disabledProps = {className: 'disabled'},
        dirtyProps = this.props.dirty ? {} : disabledProps,
        emptyProps = this.props.empty ? disabledProps : {},
        filenameProps = this.props.filename === null ? {className: 'disabled'} : {};

    return div({className: 'toolbar', onClick: this.clicked},
      span({}, 'New'),
      span({}, 'Open'),
      span(dirtyProps, 'Save'),
      span(emptyProps, 'Save As'),
      span(emptyProps, 'Format'),
      span(emptyProps, 'Validate'),
      span(filenameProps, 'Use'),
      this.props.user ? span(filenameProps, 'Publish') : null,
      this.props.user ? span(this.props.published ? {} : disabledProps, 'Use Remote') : null,
      span({}, this.props.user ? 'Logout' : 'Login'),
      span({className: this.props.filename === null ? 'disabled' : null, style: {'float': 'right'}}, 'Delete')
    );
  }
}));

Editor = React.createFactory(React.createClass({
  displayName: 'Editor',

  componentDidMount: function() {
    this.editor = CodeMirror.fromTextArea(this.refs.editor, {
      lineNumbers: true,
      matchBrackets: true,
      autoCloseBrackets: true,
      mode: 'application/json',
      tabSize: 2,
      electricChars: true,
      lint: true,
      gutters: ["CodeMirror-lint-markers"],
    });
    this.editor.on('change', this.handleChange);
  },

  shouldComponentUpdate: function() {
    return false;
  },

  componentWillReceiveProps: function (nextProps) {
    if (this.editor.getValue() != nextProps.text) {
      this.editor.setValue(nextProps.text);
    }
  },

  handleChange: function() {
    if (!this.editor) {
      return;
    }
    this.props.changed(this.editor.getValue());
  },

  render: function () {
    return div({className: 'text'}, React.DOM.textarea({
      ref: 'editor',
      defaultValue: this.props.text
    }));
  }
}));

FileListItem = React.createFactory(React.createClass({
  displayName: 'FileListItem',

  clicked: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.props.clicked(this.props.file);
  },

  render: function () {
    return div({className: 'filelistitem', onClick: this.clicked}, this.props.file);
  }
}));

Dialog = React.createFactory(React.createClass({
  displayName: 'Dialog',

  getInitialState: function () {
    this.lastFileClick = null;
    return {
      localFiles: [],
      remoteFiles: []
    };
  },

  findFiles: function () {
    var self = this,
        localFiles = [],
        remoteFiles = [],
        i, len, key;
    for (i = 0, len = localStorage.length; i < len; ++i ) {
      key = localStorage.key(i);
      if (key.substr(0, storagePrefix.length) == storagePrefix) {
        localFiles.push(key.substr(storagePrefix.length));
      }
    }
    this.setState({
      localFiles: localFiles,
      remoteFiles: []
    });

    this.props.getPublishedFiles(function (publishedFiles) {
      if (publishedFiles) {
        for (var username in publishedFiles) {
          if (publishedFiles.hasOwnProperty(username)) {
            for (var filename in publishedFiles[username]) {
              if (publishedFiles[username].hasOwnProperty(filename)) {
                remoteFiles.push(username + '/' + filename);
              }
            }
          }
        }
        self.setState({remoteFiles: remoteFiles});
      }
    });
  },

  componentWillReceiveProps: function (nextProps) {
    if (nextProps.show) {
      var input = this.refs.fileinput;
      input.value = '';
      setTimeout(function () {
        input.focus();
      }, 10);
      this.findFiles();
    }
  },

  checkForEnter: function (e) {
    if (e.which == 13) {
      this.buttonClicked();
    }
  },

  buttonClicked: function () {
    var filename = this.refs.fileinput.value.replace(/^\s+|\s+$/g, '');
    if (filename.length > 0) {
      switch (this.props.show) {
        case 'Open':
          this.props.openFile(filename);
          break;
        case 'Save':
        case 'Save As':
          this.props.saveFile(filename);
          break;
      }
    }
  },

  fileClicked: function (filename) {
    this.refs.fileinput.value = filename;
    var now = (new Date()).getTime();
    if (now - this.lastFileClick < 250) {
      this.buttonClicked();
    }
    this.lastFileClick = now;
  },

  render: function () {
    var files = [div({className: 'fileheader', key: 'local-header'}, 'Local Files')],
        i, len;
    for (i = 0, len = this.state.localFiles.length; i < len; i++) {
      files.push(FileListItem({file: this.state.localFiles[i], key: 'local' + i, clicked: this.fileClicked}));
    }
    if ((this.props.show == 'Open') && (this.state.remoteFiles.length > 0)) {
      files.push(div({className: 'fileheader', key: 'remote-header', style: {marginTop: 10}}, 'Remote Files'));
      for (i = 0, len = this.state.remoteFiles.length; i < len; i++) {
        files.push(FileListItem({file: this.state.remoteFiles[i], key: 'remote' + i, clicked: this.fileClicked}));
      }
    }

    return div({className: 'dialog', style: {'display': this.props.show ? 'block' : 'none'}},
      div({className: 'title'},
        this.props.show,
        div({className: 'close', onClick: this.props.hideDialog}, 'X')
      ),
      div({className: 'inner'},
        div({className: 'filelist', onClick: this.fileClicked}, files),
        React.DOM.input({className: 'fileinput', type: 'text', ref: 'fileinput', onKeyUp: this.checkForEnter}),
        React.DOM.button({className: 'button', onClick: this.buttonClicked}, this.props.show)
      )
    );
  }
}));


},{}],16:[function(require,module,exports){
var userController = require('../../controllers/shared/user'),
    logController = require('../../controllers/shared/log'),
    AlertView = React.createFactory(require('../shared/alert')),
    div = React.DOM.div,
    p = React.DOM.p,
    strong = React.DOM.strong,
    input = React.DOM.input,
    button = React.DOM.button,
    select = React.DOM.select,
    option = React.DOM.option;

module.exports = React.createClass({

  displayName: 'EnterUnknowns',

  getInitialState: function () {
    return {
      E: '',
      R: '',
      EUnit: '',
      RUnit: '',
      pluralize: this.props.activity.enterUnknowns.E && this.props.activity.enterUnknowns.R,
      eCorrect: false,
      rCorrect: false,
      alert: null
    };
  },

  filterInput: function (currentValue, newValue) {
    newValue = $.trim(newValue);
    if (newValue.length === 0) {
      return '';
    }
    return isNaN(parseInt(newValue, 10)) ? currentValue : newValue;
  },

  eChanged: function () {
    this.setState({E: this.filterInput(this.state.E, this.refs.E.value)});
  },

  rChanged: function () {
    this.setState({R: this.filterInput(this.state.R, this.refs.R.value)});
  },

  eUnitChanged: function () {
    this.setState({EUnit: this.refs.eUnit.value});
  },

  rUnitChanged: function () {
    this.setState({RUnit: this.refs.rUnit.value});
  },

  submit: function () {
    var needE = this.props.activity.enterUnknowns.E,
        haveE = this.state.E.length > 0,
        haveEUnit = this.state.EUnit.length > 0,
        needR = this.props.activity.enterUnknowns.R,
        haveR = this.state.R.length > 0,
        haveRUnit = this.state.RUnit.length > 0,
        eCorrect = false,
        rCorrect = false,
        alert = null;

    eCorrect = this.state.eCorrect || ((this.state.E == this.props.model.E) && (this.state.EUnit == 'volts'));
    rCorrect = this.state.rCorrect || ((this.state.R == this.props.model.R) && (this.state.RUnit== 'ohms'));
    if ((needE && !eCorrect) && (needR && !rCorrect)) {
      alert = "Sorry, both of your E and R values or units are incorrect";
    }
    else if (needE && !eCorrect) {
      alert = "Sorry, your E value or unit is incorrect";
    }
    else if (needR && !rCorrect) {
      alert = "Sorry, your R value or unit is incorrect";
    }

    this.setState({
      eCorrect: eCorrect,
      rCorrect: rCorrect,
      alert: alert
    });

    userController.setUnknownValues({
      E: {
        have: haveE && haveEUnit,
        correct: eCorrect
      },
      R: {
        have: haveR && haveRUnit,
        correct: rCorrect
      }
    });

    logController.logEvent("Unknown Values Submitted", null, {
      'E: Need': needE,
      'E: Have Value': needE && haveE,
      'E: Have Unit': needE && haveEUnit,
      'E: Value': this.state.E,
      'E: Unit': this.state.EUnit,
      'E: Correct Value': this.props.model.E,
      'E: Correct': eCorrect,
      'R: Need': needR,
      'R: Have Value': needR && haveR,
      'R: Have Unit': needR && haveRUnit,
      'R: Value': this.state.R,
      'R: Unit': this.state.RUnit,
      'R: Correct Value': this.props.model.R,
      'R: Correct': rCorrect
    });
  },

  pluralize: function (text) {
    return this.state.pluralize ? text + 's' : text;
  },

  closeAlert: function () {
    this.setState({alert: null});
  },

  renderUnknown: function (component, correct, onValueChange, onUnitChange) {
    var units = [
          option({key: 'none', value: ''}, ''),
          option({key: 'volts', value: 'volts'}, 'volts'),
          option({key: 'ohms', value: 'ohms'}, 'ohms')
        ];
    if (correct) {
      return p({}, component + ': ' + this.props.model[component] + ' ' + (component == 'E' ? 'volts' : 'ohms'));
    }
    return p({}, component + ': ', input({ref: component, value: this.state[component], onChange: onValueChange}), select({ref: component.toLowerCase(component) + 'Unit', value: this.state[component + 'Unit'], onChange: onUnitChange}, units));
  },

  render: function () {
    var showMessage = (!this.props.activity.enterUnknowns.E || this.state.eCorrect) && (!this.props.activity.enterUnknowns.R || this.state.rCorrect);
    return div({id: 'enter-unknowns'},
      p({}, strong({}, "Enter Unknown " + this.pluralize("Value"))),
      this.props.activity.enterUnknowns.E ? this.renderUnknown('E', this.state.eCorrect, this.eChanged, this.eUnitChanged) : null,
      this.props.activity.enterUnknowns.R ? this.renderUnknown('R', this.state.rCorrect, this.rChanged, this.rUnitChanged) : null,
      showMessage ? p({}, "You have entered the correct " + this.pluralize("value") + " and " + this.pluralize("unit") + ".") : button({onClick: this.submit}, "Submit Unknown " + this.pluralize("Value")),
      this.state.alert ? AlertView({message: this.state.alert, onClose: this.closeAlert}) : null
    );
  }
});


},{"../../controllers/shared/log":5,"../../controllers/shared/user":6,"../shared/alert":23}],17:[function(require,module,exports){
// adapted from SPARKS math-parser.js

module.exports = React.createClass({

  displayName: 'Notes',

  render: function () {
    if (!this.props.text) {
      return React.DOM.div({});
    }
    return React.DOM.div({className: this.props.className || 'notes', dangerouslySetInnerHTML: {__html: this.calculateMeasurement(this.props.text)}});
  },

  calculateMeasurement: function (text){
    var context = {
          breadboard: this.props.breadboard
        },
        components = this.props.breadboard ? this.props.breadboard.getComponents() : null,
        result,
        key;

    // short-circuit
    if (text === undefined || text === null || text === "") {
      return "";
    }
    if (!isNaN(Number(text))) {
      return text;
    }

    // convert to string
    text = "" + text;

    // add the components to the the context to eval in
    if (components) {
      for (key in components) {
        if (components.hasOwnProperty(key)) {
          context[key] = components[key];
        }
      }
    }

    // replace all the bracket delimited javascript
    // jshint ignore:start
    // with and eval might be evil but we need them here
    result = text.replace(/\[([^\]]+)\]/g, function (match, contents) {
      try {
        with (context) {
          return eval(contents);
        }
      }
      catch (e) {
        return '<i>n/a</i>';
      }
    });
    // jshint ignore:end

    // convert
    result = this.convertMeasurement(result);

    // and standardize
    result = this.standardizeUnits(result);

    return result;
  },

  isMeasurement: function(string) {
    return !!string.match(/^\s?\d+.?\d*\s?\D+\s?$/);
  },

  convertMeasurement: function(measurement) {
    if (!this.isMeasurement(measurement)){
      return measurement;
    }

    var numPattern = /\d+\.?\d*/g;
    var nmatched = measurement.match(numPattern);
    if (!nmatched){
      return measurement;
    }
    var value = nmatched[0];

    var unitPattern =  /(?=\d*.?\d*)[^\d\.\s]+/g;
    var umatched = measurement.match(unitPattern);
    if (!umatched){
      return measurement;
    }
    var unit = umatched[0];

    var eng = this.toEngineering(value, unit);
    return eng.value + " " + eng.units;
  },

  toEngineering: function (value, units) {
    var isShort = (units.length == 1 || units == "Hz"),
        prefix  = "";

    value = Number(value);
    if (value >= 1000000){
      prefix = isShort ? "M" : "mega";
      value = this.round(value/1000000,2);
    } else if (value >= 1000){
      prefix = isShort ? "k" : "kilo";
      value = this.round(value/1000,2);
    } else if (value === 0 ) {
      value = 0;
    } else if (value < 0.000000001){
      prefix = isShort ? "p" : "pico";
      value = this.round(value * 1000000000000,2);
    } else if (value < 0.000001){
      prefix = isShort ? "n" : "nano";
      value = this.round(value * 1000000000,2);
    } else if (value < 0.001){
      prefix = isShort ? "μ" : "micro";
      value = this.round(value * 1000000,2);
    } else if (value < 1) {
      prefix = isShort ? "m" : "milli";
      value = this.round(value * 1000,2);
    } else {
      value = this.round(value,2);
    }
    units = prefix + units;

    return {"value": value, "units": units};
  },

  round: function(num, dec) {
    return Math.round( Math.round( num * Math.pow( 10, dec + 2 ) ) / Math.pow( 10, 2 ) ) / Math.pow(10,dec);
  },

  standardizeUnits: function (string) {
    return string
      .replace(/ohms/gi,"&#x2126;")
      .replace("micro","&#x00b5;")
      .replace("milli","m")
      .replace("kilo","k")
      .replace("mega","M");
  }
});

},{}],18:[function(require,module,exports){
var config = require('../../config'),
    logController = require('../../controllers/shared/log'),
    OtherCircuits, Popup, PopupIFrame, CircuitLink, CircuitImage, ScaledIFrame;

module.exports = OtherCircuits = React.createClass({

  displayName: 'OtherCircuits',

  getInitialState: function () {
    return {
      showPopup: false
    };
  },

  statics: {
    showPopup: function(props) {
      var $anchor = $('#other-circuits-popup'),
          closePopup = function (e) {
            e.preventDefault();
            OtherCircuits.closePopup();
          };

      if (!$anchor.length) {
        $anchor = $('<div id="other-circuits-popup" class="modalDialog"></div>').appendTo('body');
      }

      setTimeout(function() {
        $anchor[0].style.opacity = 1;
      }, 100);

      return ReactDOM.render(Popup({
        circuit: props.circuit,
        activityName: props.activityName,
        groupName: props.groupName,
        numClients: props.numClients,
        buttonClicked: closePopup,
        ttWorkbench: props.ttWorkbench
      }), $anchor.get(0));
    },

    closePopup: function () {
      var $anchor = $('#other-circuits-popup'),
          node = $anchor.get(0);
      if (node) {
        ReactDOM.unmountComponentAtNode(node);
      }
      $anchor.remove();
    }
  },

  showClicked: function () {
    this.setState({showPopup: true});
  },

  render: function () {
    var self = this;

    setTimeout(function () {
      if (self.state.showPopup) {
        OtherCircuits.showPopup(self.props);
      }
      else {
        OtherCircuits.closePopup();
      }
    });

    return React.DOM.button({onClick: this.showClicked}, this.props.label || 'View All Circuits');
  },

});

PopupIFrame = React.createFactory(React.createClass({
  displayName: 'OtherCircuitsPopupIFrame',

  shouldComponentUpdate: function () {
    return false;
  },

  componentDidMount: function () {
    var iframe = this.refs.iframe,
        payload = {
          circuit: this.props.circuit,
          activityName: this.props.activityName,
          groupName: this.props.groupName,
          ttWorkbench: this.props.ttWorkbench
        };
    iframe.onload = function () {
      iframe.contentWindow.postMessage(JSON.stringify(payload), window.location.origin);
    };
  },

  render: function () {
    return React.DOM.iframe({ref: 'iframe', src: '?view-other-circuit!', style: {width: 740, height: 500}}, 'Loading...');
  }
}));

ScaledIFrame = React.createFactory(React.createClass({
  displayName: 'OtherCircuitsScaledIFrame',

  shouldComponentUpdate: function () {
    return false;
  },

  componentDidMount: function () {
    var iframe = this.refs.iframe,
        loadMessage = 'loaded:scaled:' + this.props.circuit,
        payload = {
          circuit: this.props.circuit,
          activityName: this.props.activityName,
          groupName: this.props.groupName,
          ttWorkbench: this.props.ttWorkbench,
          loadMessage: loadMessage
        },
        listenForLoad = function (event) {
          if (event.data === loadMessage) {
            iframe.style.display = 'block';
            window.removeEventListener("message", listenForLoad);
          }
        };

    iframe.onload = function () {
      iframe.contentWindow.postMessage(JSON.stringify(payload), window.location.origin);
    };
    window.addEventListener("message", listenForLoad);
  },

  render: function () {
    var scale = 'scale(' + this.props.scale + ')',
        origin = '0 0',
        style = {
          width: 740,
          height: 500,
          display: 'none',
          msTransform: scale,
          MozTransform: scale,
          OTransform: scale,
          WebkitTransform: scale,
          transform: scale,
          msTransformOrigin: origin,
          MozTransformOrigin: origin,
          OTransformOrigin: origin,
          WebkitTransformOrigin: origin,
          transformOrigin: origin
        };
    return React.DOM.iframe({ref: 'iframe', src: '?view-other-circuit!', style: style});
  }
}));

CircuitLink = React.createFactory(React.createClass({
  displayName: 'CircuitLink',

  clicked: function (e) {
    e.preventDefault();
    this.props.clicked(this.props.circuit);
  },

  render: function () {
    return React.DOM.a({href: '#', onClick: this.clicked, className: this.props.selected ? 'selected' : ''}, "Circuit " + this.props.circuit);
  }
}));

CircuitImage = React.createFactory(React.createClass({

  displayName: 'CircuitImage',

  getInitialState: function () {
    this.imageInfo = this.props.ttWorkbench.otherCircuits;
    this.breadboards = this.imageInfo.breadboards;
    return {};
  },

  drawImageLayer: function () {
    var context = this.refs.imageLayer.getContext('2d'),
        image = new Image(),
        self = this;

    image.src = /^https?:\/\//.test(this.imageInfo.image) ? this.imageInfo.image : config.modelsBase + this.imageInfo.image;
    image.onload = function () {
      context.drawImage(image, 0, 0);
      self.drawClickLayer();
    };
  },

  drawClickLayer: function () {
    var canvas = this.refs.clickLayer,
        context = canvas.getContext('2d'),
        breadboard = this.breadboards[this.props.selectedCircuit - 1];

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.beginPath();
    context.lineWidth = 5;
    context.strokeStyle = '#f3951d';
    context.rect(breadboard.x, breadboard.y, breadboard.width, breadboard.height);
    context.stroke();
    context.closePath();
  },

  canvasClicked: function (e) {
    var canvas = this.refs.clickLayer,
        offset = $(canvas).offset(),
        x = e.pageX - offset.left,
        y = e.pageY - offset.top,
        i, breadboard;

    e.preventDefault();
    for (i = 0; i < this.breadboards.length; i++) {
      breadboard = this.breadboards[i];
      if ((x >= breadboard.x) && (x <= breadboard.x + breadboard.width) && (y >= breadboard.y) && (y <= breadboard.y + breadboard.height)) {
        this.props.clicked(i + 1);
        break;
      }
    }
  },

  componentDidMount: function () {
    this.drawImageLayer();
  },

  componentDidUpdate: function () {
    this.drawClickLayer();
  },

  render: function () {
    var canvasStyle = {
          position: 'absolute',
          top: 0,
          left: 0
        },
        iframes = [],
        i, breadboard, iframeStyle;

    for (i = 0; i < this.breadboards.length; i++) {
      breadboard = this.breadboards[i];
      iframeStyle = {
        position: 'absolute',
        top: breadboard.y,
        left: breadboard.x
      };
      iframes.push(React.DOM.div({key: i, style: iframeStyle}, ScaledIFrame({scale: breadboard.width / 740, circuit: i + 1, activityName: this.props.activityName, groupName: this.props.groupName, ttWorkbench: this.props.ttWorkbench})));
    }

    return React.DOM.div({style: {position: 'relative', margin: 10, width: this.imageInfo.width, height: this.imageInfo.height}},
      React.DOM.canvas({ref: 'imageLayer', width: this.imageInfo.width, height: this.imageInfo.height, style: canvasStyle}),
      iframes,
      React.DOM.canvas({ref: 'clickLayer', width: this.imageInfo.width, height: this.imageInfo.height, style: canvasStyle, onClick: this.canvasClicked})
    );
  }
}));

Popup = React.createFactory(React.createClass({

  displayName: 'OtherCircuitsPopup',

  getInitialState: function () {
    return {
      selectedCircuit: 1
    };
  },

  componentDidMount: function () {
    logController.logEvent("Opened Zoom View");
  },

  componentWillUnmount: function () {
    logController.logEvent("Closed Zoom View");
  },

  selectedCircuit: function (selectedCircuit) {
    logController.logEvent("Selected Circuit in Zoom", selectedCircuit);
    this.setState({selectedCircuit: selectedCircuit});
  },

  render: function () {
    var links = [],
        iframes = [],
        haveImage =  this.props.ttWorkbench.otherCircuits && this.props.ttWorkbench.otherCircuits.image && this.props.ttWorkbench.otherCircuits.breadboards,
        circuit,
        selected;

    for (circuit = 1; circuit <= this.props.numClients; circuit++) {
      selected = circuit == this.state.selectedCircuit;
      if (!haveImage) {
        links.push(CircuitLink({key: circuit, clicked: this.selectedCircuit, circuit: circuit, selected: selected}));
      }
      iframes.push(React.DOM.div({key: circuit, style: {display: selected ? 'block' : 'none'}}, PopupIFrame({circuit: circuit, activityName: this.props.activityName, groupName: this.props.groupName, ttWorkbench: this.props.ttWorkbench})));
    }

    return React.DOM.div({className: 'other-circuits-button-popup'},
      React.DOM.button({style: {'float': 'right'}, onClick: this.props.buttonClicked}, 'X'),
      React.DOM.h1({}, 'All Circuits'),
      (haveImage ? CircuitImage({selectedCircuit: this.state.selectedCircuit, clicked: this.selectedCircuit, activityName: this.props.activityName, groupName: this.props.groupName, ttWorkbench: this.props.ttWorkbench}) : null),
      (links.length > 0 ? React.DOM.div({className: 'links'}, links) : null),
      React.DOM.div({className: 'iframes'}, iframes)
    );
  }
}));


},{"../../config":2,"../../controllers/shared/log":5}],19:[function(require,module,exports){
var userController = require('../../controllers/shared/user'),
    SidebarChatView = require('./sidebar-chat.jsx'),
    SidebarChatViewFactory = React.createFactory(SidebarChatView),
    CalculatorView = require('./calculator.jsx'),
    NotesView = require('./notes'),
    ConnectionView = require('./connection.jsx'),
    EditorView = require('./editor'),
    SubmitButtonView = require('./submitButton'),
    OtherCircuitsView = require('./other-circuits'),
    inIframe = require('../../data/shared/in-iframe'),
    EnterUnknownsView = require('./enter-unknowns'),
    VersionView = require('../shared/version'),
    config = require('../../config');

module.exports = React.createClass({

  displayName: 'Page',

  getInitialState: function () {
    return {
      inIframe: inIframe()
    };
  },

  render: function() {
    var activity = this.props.activity ? this.props.activity : {},
        activityName = activity.name ? ': ' + activity.name : '',
        title = this.state.inIframe ? null : (React.createElement("h1", null, "Teaching Teamwork",  activityName )),
        hasMultipleClients = activity.clients && (activity.clients.length > 1),
        username = userController.getUsername(),
        groupname = userController.getGroupname(),
        circuit = hasMultipleClients && this.props.circuit ? (React.createElement("h2", null, "Circuit ",  this.props.circuit,  username ? ' (User: ' + username : '',  groupname ? ', Group: ' + groupname + ')': ')')) : null,
        notes = this.props.client ? (this.props.client.notes || "") : "",
        connection = React.createElement(ConnectionView, null),
        editor = this.props.showEditor ? (React.createElement(EditorView, {parseAndStartActivity:  this.props.parseAndStartActivity, editorState:  this.props.editorState})) : null,
        wrapperClass = hasMultipleClients ? 'multiple-clients' : null,
        enterUnknowns = activity.enterUnknowns && (activity.enterUnknowns.E || activity.enterUnknowns.R),
        image = activity.image ? (React.createElement("div", {id: "image-wrapper", className:  wrapperClass }, React.createElement("img", {src:  /^https?:\/\//.test(activity.image) ? activity.image : config.modelsBase + activity.image}), enterUnknowns ? React.createElement(EnterUnknownsView, {activity: activity, model: this.props.model}) : null)) : null,
        submitButton = this.props.showSubmit && this.props.circuit ? (React.createElement(SubmitButtonView, {label: hasMultipleClients ? 'We got it!' : "I got it!", goals:  this.props.goals, nextActivity:  this.props.nextActivity, enterUnknowns: activity.enterUnknowns})) : null,
        otherCircuitsButton = hasMultipleClients && this.props.circuit ? (React.createElement(OtherCircuitsView, {circuit:  this.props.circuit, numClients:  activity.clients.length, activityName:  this.props.activityName, groupName:  userController.getGroupname(), ttWorkbench:  this.props.ttWorkbench})) : null,
        calculator = this.props.circuit ? (React.createElement(CalculatorView, null)) : null,
        chatProps = hasMultipleClients ? $.extend({}, activity, {numClients: activity.clients.length}) : null;

    return (
      React.createElement("div", {className: "tt-page"}, 
         title, 
         circuit, 
        React.createElement("div", {id: "top-button-wrapper"}, 
           submitButton, 
           otherCircuitsButton 
        ), 
        React.createElement("div", {id: "notes-wrapper", className:  wrapperClass }, React.createElement(NotesView, {text:  notes, className: "tt-notes", breadboard:  this.props.breadboard})), 
        React.createElement("div", {id: "breadboard-and-chat-wrapper", className:  wrapperClass }, 
          React.createElement("div", {id: "breadboard-wrapper", className:  wrapperClass }), 
           hasMultipleClients ? (React.DOM.div({id: "sidebar-chat-wrapper", className: wrapperClass}, SidebarChatViewFactory(chatProps))) : null
        ), 
         image, 
         calculator, 
         connection, 
         editor, 
        React.createElement(VersionView, null)
      )
    );
  }
});


},{"../../config":2,"../../controllers/shared/user":6,"../../data/shared/in-iframe":8,"../shared/version":25,"./calculator.jsx":13,"./connection.jsx":14,"./editor":15,"./enter-unknowns":16,"./notes":17,"./other-circuits":18,"./sidebar-chat.jsx":20,"./submitButton":21}],20:[function(require,module,exports){
var userController = require('../../controllers/shared/user'),
    logController = require('../../controllers/shared/log'),
    ChatItems, ChatItem;

module.exports = React.createClass({

  displayName: 'SidebarChat',

  getInitialState: function() {
    var items = [];

    if (this.props.initialChatMessage) {
      items.push({
        prefix: 'Welcome!',
        message: this.props.initialChatMessage
      });
    }

    return {
      items: items,
      numExistingUsers: 0
    };
  },

  getJoinedMessage: function (numExistingUsers) {
    var slotsRemaining = this.props.numClients - numExistingUsers,
        nums = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"],
        cap = function (string) {
          return string.charAt(0).toUpperCase() + string.slice(1);
        },
        message = " ";

    if (slotsRemaining > 1) {
      // One of three users is here
      message += cap(nums[numExistingUsers]) + " of " + nums[this.props.numClients] + " users is here.";
    } else if (slotsRemaining == 1) {
      // Two of you are now here. One more to go before you can get started!
      message += cap(nums[numExistingUsers]) + " of you are now here. One more to go before you can get started!";
    } else {
      message += "You're all here! Time to start this challenge.";
    }

    return message;
  },

  componentWillMount: function() {
    var self = this;
    userController.onGroupRefCreation(function() {
      self.firebaseRef = userController.getFirebaseGroupRef().child("chat");
      self.firebaseRef.orderByChild('time').on("child_added", function(dataSnapshot) {
        var items = self.state.items.slice(0),
            item = dataSnapshot.val(),
            numExistingUsers = self.state.numExistingUsers;

        if (item.type == "joined") {
          numExistingUsers = Math.min(self.state.numExistingUsers + 1, self.props.numClients);
          item.message += self.getJoinedMessage(numExistingUsers);
        }
        else if (item.type == "left") {
          numExistingUsers = Math.max(self.state.numExistingUsers - 1, 0);
        }

        if (numExistingUsers !== self.state.numExistingUsers) {
          self.setState({numExistingUsers: numExistingUsers});
        }

        items.push(item);

        self.setState({
          items: items
        });
      }.bind(self));
    });
  },

  componentWillUnmount: function() {
    this.firebaseRef.off();
  },

  handleSubmit: function(e) {
    var input = this.refs.text,
        message = input.value.replace(/^\s+|\s+$/, '');
    e.preventDefault();
    if (message.length > 0) {
      this.firebaseRef.push({
        user: userController.getUsername(),
        message: message,
        time: Firebase.ServerValue.TIMESTAMP
      });
      input.value = '';
      input.focus();
      logController.logEvent("Sent message", message);
    }
  },

  listenForEnter: function (e) {
    if (e.keyCode === 13) {
      this.handleSubmit(e);
    }
  },

  render: function() {
    return (
      React.createElement("div", {className: "sidebar-chat"}, 
        React.createElement(ChatItems, {items:  this.state.items}), 
        React.createElement("div", {className: "sidebar-chat-input"}, 
          React.createElement("form", {onSubmit:  this.handleSubmit}, 
            React.createElement("textarea", {ref: "text", placeholder: "Enter chat message here...", onKeyDown: this.listenForEnter}), 
            React.createElement("br", null), 
            React.createElement("button", {onClick:  this.handleSubmit}, "Send Chat Message")
          )
        )
      )
    );
  }
});

ChatItems = React.createClass({
  displayName: 'ChatItems',

  componentDidUpdate: function (prevProps) {
    if (prevProps.items.length !== this.props.items.length) {
      if (this.refs.items) {
        this.refs.items.scrollTop = this.refs.items.scrollHeight;
      }
    }
  },

  render: function () {
    var user = userController.getUsername();
    return React.createElement("div", {ref: "items", className: "sidebar-chat-items"}, 
      this.props.items.map(function(item, i) {
        var owner = (item.user == user) ? "me" : item.user == "System" ? "system" : "others";
        return React.createElement(ChatItem, {key:  i, item:  item, owner:  owner });
      })
    );
  }
});

ChatItem = React.createClass({
  displayName: 'ChatItem',

  render: function () {
    var className = 'chat-item chat-item-'+this.props.owner;
    return React.createElement("div", {className:  className }, 
        React.createElement("b", null,  this.props.item.prefix || (this.props.item.user + ':') ), " ",  this.props.item.message
      );
  }
});


},{"../../controllers/shared/log":5,"../../controllers/shared/user":6}],21:[function(require,module,exports){
var userController = require('../../controllers/shared/user'),
    logController = require('../../controllers/shared/log'),
    SubmitButton, Popup;

module.exports = SubmitButton = React.createClass({

  displayName: 'SubmitButton',

  getInitialState: function () {
    return {
      submitted: null,
      allCorrect: false,
      goalValues: {},
      closePopup: false,
      nextActivity: this.props.nextActivity,
      enterUnknowns: this.props.enterUnknowns,
      numCircuits: this.props.goals.length
    };
  },

  componentWillMount: function () {
    var self = this;

    userController.onGroupRefCreation(function() {
      var otherClients, i, updateFromClient;

      // listen for submits
      self.submitRef = userController.getFirebaseGroupRef().child("submitted");
      self.submitRef.on("value", function(dataSnapshot) {
        var submitValue = dataSnapshot.val(),
            skew = userController.getServerSkew(),
            now = (new Date().getTime()) + skew;

        // ignore submits over 10 seconds old
        if (submitValue && (submitValue.at < now - (10 * 1000))) {
          return;
        }

        // get the measurements and create the popup data
        self.getPopupData(function (table, allCorrect) {
          // only log from the submitters instance
          if (submitValue && (submitValue.user == userController.getUsername())) {
            logController.logEvent("Submit clicked when all correct", allCorrect);
          }
          self.setState({
            submitted: submitValue,
            table: table,
            allCorrect: allCorrect,
            closePopup: false
          });
        });
      });

      // recalculate table on client updates
      updateFromClient = function() {
        self.getPopupData(function (table, allCorrect) {
          self.setState({
            table: table,
            allCorrect: allCorrect,
          });
        });
      };

      // listen for client updates
      self.clientListRef = userController.getFirebaseGroupRef().child('clients');
      otherClients = userController.getOtherClientNos();
      for (i = 0; i < otherClients.length; i++) {
        self.clientListRef.child(otherClients[i]).on("value", updateFromClient);
      }
    });
  },

  componentWillUnmount: function() {
    this.submitRef.off();
    this.clientListRef.off();
  },

  getMeasurement: function (client, measurement, callback) {
    var bc = sparks.workbenchController.breadboardController,
        matches = measurement.match(/^((component_)([^\(]+)\(([^\)]+)\))|(([^\(]+)\(([^,]+),([^\)]+)\))$/),
        // see: http://regexper.com/#%5E((component_)(%5B%5E%5C(%5D%2B)%5C((%5B%5E%5C)%5D%2B)%5C))%7C((%5B%5E%5C(%5D%2B)%5C((%5B%5E%2C%5D%2B)%2C(%5B%5E%5C)%5D%2B)%5C))%24
        renameConnection = function (s) {
          return s.replace(/[abcdefghij](\d)/g, "L$1");
        },
        type, component, c1, c2;

    if (matches) {
      if (matches[1]) {
        type = matches[3];
        component = bc.getComponents()[matches[4]];
        if (!component || !component.connections) {
          return callback(0);
        }
        c1 = component.connections[0].name;
        c2 = component.connections[1].name;
      }
      else {
        type = matches[6];
        c1 = client + ':' + renameConnection(matches[7]);
        c2 = client + ':' + renameConnection(matches[8]);
      }

      bc.query(type, c1 + ',' + c2, function (ciso) {
        var result = 0,
            p1, p2, v1, v2, current;

        if (ciso) {
          p1 = bc.getHole(c1).nodeName();
          p2 = bc.getHole(c2).nodeName();

          if (type === "resistance") {
            if (p1 != p2) {
              current = ciso.getCurrent('ohmmeterBattery');
              result = 1 / current.magnitude;
            }
          }
          else {
            v1 = ciso.getVoltageAt(p1);
            v2 = ciso.getVoltageAt(p2);

            if (v1 && v2) {
              switch (type) {
                case "voltage":
                  result = v1.real - v2.real;
                  break;
                case "ac_voltage":
                  result = v1.subtract(v2).magnitude;
                  break;
                case "current":
                  result = v1.subtract(v2).magnitude / 1e-6;
                  break;
              }
            }
          }
        }

        result = Math.round(result*Math.pow(10,2))/Math.pow(10,2);

        callback(result);
      });
    }
    else {
      callback(0);
    }
  },

  getPopupData: function (callback) {
    var self = this,
        queue = [],
        table = [],
        allCorrect = true,
        logParams = {},
        client, goalName, processQueue;

    // gather the goal names into a queue for async processing
    for (client = 0; client < this.props.goals.length; client++) {
      for (goalName in this.props.goals[client]) {
        if (this.props.goals[client].hasOwnProperty(goalName)) {
          queue.push({
            client: client,
            name: goalName,
            goal: this.props.goals[client][goalName]
          });
        }
      }
    }

    // drain the queue
    processQueue = function () {
      var item = queue.shift(),
          goal = item ? item.goal : null;

      if (item) {
        self.getMeasurement(item.client, item.goal.measurement, function (clientValue) {
          var units, tolerance, absGoalValue, absClientGoalValue, correct;

          units = goal.units || '';

          tolerance = goal.value * (goal.tolerance || 0);
          tolerance = Math.round(tolerance * Math.pow(10,4)) / Math.pow(10,4);

          absGoalValue = Math.abs(goal.value);
          absClientGoalValue = Math.abs(clientValue);

          correct = (absClientGoalValue >= (absGoalValue - tolerance)) && (absClientGoalValue <= (absGoalValue + tolerance));

          table.push({
            correct: (correct ? 'Yes' : 'No'),
            correctClass: (correct ? 'correct' : 'incorrect'),
            client: item.client,
            goal: item.name,
            goalValue: absGoalValue + units,
            currentValue: absClientGoalValue + units
          });

          logParams[item.name + ': Goal'] = absGoalValue;
          logParams[item.name + ': Measured'] = absClientGoalValue;

          allCorrect = allCorrect && correct;

          processQueue();
        });
      }
      else {
        if (allCorrect) {
          logController.logEvent("Goals met", null, logParams);
        }
        callback(table, allCorrect);
      }
    };
    processQueue();
  },

  submitClicked: function (e) {
    var self = this,
        username = userController.getUsername();

    e.preventDefault();

    logController.logEvent("Submit clicked", username);

    // if in solo mode then just populate the table
    if (!this.submitRef) {
      this.getPopupData(function (table, allCorrect) {
        logController.logEvent("Submit clicked when all correct", allCorrect);
        self.setState({
          submitted: true,
          table: table,
          allCorrect: allCorrect,
          closePopup: false
        });
      });
    }
    else {
      // add the submit - this will trigger our submitRef watcher
      this.submitRef.set({
        user: username,
        at: Firebase.ServerValue.TIMESTAMP
      });
    }
  },

  popupButtonClicked: function (dontRedirect) {
    var inIframe = (function() { try { return window.self !== window.top; } catch (e) { return true; } })();

    logController.logEvent("Submit close button clicked", this.state.allCorrect ? 'done' : 'resume');

    // don't redirect when iframed in LARA or told not to redirect (as we are waiting on unknown values to be reported)
    if (this.state.allCorrect && !inIframe && !dontRedirect) {
      window.location = 'http://concord.org/projects/teaching-teamwork/activities2';
    }
    else {
      this.setState({closePopup: true});
    }
  },

  statics: {
    showPopup: function(props, multipleClients, buttonClicked) {
      var $anchor = $('#submit-popup'),
          closePopup = function (e, dontRedirect) {
            e.preventDefault();
            SubmitButton.closePopup();
            buttonClicked(dontRedirect);
          };

      if (!$anchor.length) {
        $anchor = $('<div id="submit-popup" class="modalDialog"></div>').appendTo('body');
      }

      setTimeout(function() {
        $anchor[0].style.opacity = 1;
      }, 100);

      return ReactDOM.render(Popup({
        table: props.table,
        waiting: props.waiting,
        allCorrect: props.allCorrect,
        nextActivity: props.nextActivity,
        enterUnknowns: props.enterUnknowns,
        numCircuits: props.numCircuits,
        multipleClients: multipleClients,
        buttonClicked: closePopup,
      }), $anchor.get(0));
    },

    closePopup: function () {
      var $anchor = $('#submit-popup'),
          node = $anchor.get(0);
      if (node) {
        ReactDOM.unmountComponentAtNode(node);
      }
      $anchor.remove();
    }
  },

  render: function () {
    var self = this;

    setTimeout(function () {
      if (self.state.submitted && !self.state.closePopup) {
        SubmitButton.showPopup(self.state, self.props.goals.length > 1, self.popupButtonClicked);
      }
      else {
        SubmitButton.closePopup();
      }
    });

    return React.DOM.button({onClick: this.submitClicked}, this.props.label || 'Submit');
  },

});

Popup = React.createFactory(React.createClass({
  displayName: 'Popup',

  getInitialState: function () {
    return {
      unknownValues: {},
      showEColumn: this.props.enterUnknowns && this.props.enterUnknowns.E,
      showRColumn: this.props.enterUnknowns && this.props.enterUnknowns.R,
      haveAllUnknowns: false
    };
  },

  componentWillMount: function () {
    var self = this;
    // listen for user unknown value updates if needed
    if (self.props.enterUnknowns) {
      self.usersRef = userController.getFirebaseGroupRef().child('users');
      self.usersRef.on("value", function(dataSnapshot) {
        var users = dataSnapshot.val(),
            unknownValues = {},
            haveAllUnknowns = true,
            i;

        $.each(users, function (name, info) {
          if (info.hasOwnProperty("client")) {
            unknownValues[info.client] = info.unknownValues || {};
          }
        });

        for (i = 0; i < self.props.numCircuits; i++) {
          haveAllUnknowns = haveAllUnknowns &&   // all have to be true
                            unknownValues[i] &&  // circuit has unknown values set by the user
                            (!self.props.enterUnknowns.E || (unknownValues[i].E && unknownValues[i].E.have)) &&  // either E isn't needed or it has a value
                            (!self.props.enterUnknowns.R || (unknownValues[i].R && unknownValues[i].R.have)); // either R isn't needed or it has a value
        }

        self.setState({
          unknownValues: unknownValues,
          haveAllUnknowns: haveAllUnknowns
        });
      });
    }
  },

  componentWillUnmount: function () {
    if (this.usersRef) {
      this.usersRef.off();
    }
  },

  renderUnknownColumnValue: function (circuit, component) {
    var unknownValue = this.state.unknownValues[circuit] && this.state.unknownValues[circuit][component] ? this.state.unknownValues[circuit][component] : null;
    if (unknownValue && unknownValue.have) {
      return React.DOM.span({dangerouslySetInnerHTML: {__html: unknownValue.correct ? '&#x2714;' : '&#x2718;'}});
    }
    return '';
  },

  buttonClicked: function (e) {
    var dontRedirect = this.props.enterUnknowns && !this.state.haveAllUnknowns;
    this.props.buttonClicked(e, dontRedirect);
  },

  render: function () {
    var circuitRows = [],
      th = React.DOM.th,
      td = React.DOM.td,
      i, row, title, label;

    if (this.props.allCorrect) {

      title = 'All Goals Are Correct!';
      label = this.props.nextActivity ? this.props.nextActivity : 'All Done!';

      // change button label if all client unknowns have or have not been entered
      if (this.props.enterUnknowns && !this.state.haveAllUnknowns) {
        label = 'Waiting for all unknown values to be entered...';
      }

      circuitRows.push(React.DOM.tr({key: 'header'},
        this.props.multipleClients ? th({}, 'Circuit') : null,
        th({}, 'Goal'),
        th({}, 'Goal Value'),
        th({}, 'Measured Value'),
        th({}, 'Correct'),
        this.state.showEColumn ? th({}, 'E?') : null,
        this.state.showRColumn ? th({}, 'R?') : null
      ));

      for (i = 0; i < this.props.table.length; i++) {
        row = this.props.table[i];
        circuitRows.push(React.DOM.tr({key: i},
          this.props.multipleClients ? td({}, row.client + 1) : null,
          td({}, row.goal),
          td({}, row.goalValue),
          td({}, row.currentValue),
          td({className: row.correctClass}, row.correct),
          this.state.showEColumn ? td({}, this.renderUnknownColumnValue(i, 'E')) : null,
          this.state.showRColumn ? td({}, this.renderUnknownColumnValue(i, 'R')) : null
        ));
      }
    }
    else {
      title = 'Some Goals Have Not Been Met';
      label = 'Keep Trying...';
    }

    return React.DOM.div({className: 'submit-button-popup'},
      React.DOM.h1({}, title),
      (this.props.allCorrect ? React.DOM.table({}, React.DOM.tbody({}, circuitRows)) : React.DOM.p({}, (this.props.multipleClients ? "At least one of your team's voltage drops doesn't match that player's goal. Try again." : "At least one of your voltage drops doesn't match the goal. Try again."))),
      React.DOM.button({onClick: this.buttonClicked}, label)
    );
  }
}));


},{"../../controllers/shared/log":5,"../../controllers/shared/user":6}],22:[function(require,module,exports){
var userController       = require('../../controllers/shared/user'),
    WorkbenchAdaptor     = require('../../data/shared/workbenchAdaptor'),
    WorkbenchFBConnector = require('../../data/shared/workbenchFBConnector');

module.exports = React.createClass({

  displayName: 'ViewOtherCircuit',

  shouldComponentUpdate: function () {
    return false;
  },

  render: function () {
    return React.DOM.div({},
      React.DOM.div({style: {position: 'absolute'}}, 'Loading...'),
      React.DOM.div({id: "breadboard-wrapper"}),
      React.DOM.div({id: "userLabel", style: {position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#777', opacity: 0.75, color: '#fff', textAlign: 'center', height: 70, fontSize: 48, padding: 10, fontWeight: 'bold'}}),
      // add a click absorber
      React.DOM.div({style: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0}})
    );
  },

  componentDidMount: function () {

    // listen for workbench load requests
    window.addEventListener("message", function (event) {
      var dialStates = {},
          i,
          model,
          payload,
          clientNumber,
          workbenchAdaptor,
          workbench,
          //redrawTimeout,
          multimeter,
          meter,
          waitForLoad,
          moveProbe,
          updateProbes,
          workbenchFBConnector;

      if (event.origin == window.location.origin) {
        payload = JSON.parse(event.data);

        clientNumber = payload.circuit - 1;

        workbenchAdaptor = new WorkbenchAdaptor(clientNumber);
        workbenchFBConnector = new WorkbenchFBConnector(userController, clientNumber, workbenchAdaptor);
        workbench = workbenchAdaptor.processTTWorkbench(payload.ttWorkbench);
        try {
          sparks.createWorkbench(workbench, "breadboard-wrapper");
        }
        catch (e) {
        }

        // get the dmm and find the dial angles once it loads
        waitForLoad = function () {
          var leadForHole, prevProbes;

          if (sparks.workbenchController && sparks.workbenchController.breadboardView && sparks.workbenchController.breadboardView.multimeter && sparks.workbenchController.breadboardController) {

            $('.breadboard svg').css({width: 740});
            $('.breadboard svg')[0].setAttribute('viewBox', "60 0 740 500");
            $("g[info=probes]").attr({transform: "matrix(0.05 0 0 0.05 60 -100)"});

            multimeter = sparks.workbenchController.breadboardView.multimeter;
            meter = sparks.workbenchController.workbench.meter;

            // get the dial angles
            for (i = 0; i < 360; i++) {
              model = multimeter.mmbox.model(i);
              if (model && model.length === 2 && !dialStates.hasOwnProperty(model[1])) {
                dialStates[model[1]] = model;
              }
            }

            // listen for circuit changes
            userController.createFirebaseGroupRef(payload.activityName, payload.groupName);
            userController.getFirebaseGroupRef().child('clients').on('value', function(snapshot) {
              var data = snapshot.val(),
                  i;

              if (data) {
                sparks.workbenchController.breadboardController.clearHoleMap();
                for (i in data) {
                  if (data.hasOwnProperty(i)) {
                    workbenchAdaptor.updateClient(i, data[i], i == clientNumber);
                  }
                }
                if (prevProbes) {
                  updateProbes(prevProbes);
                }
                meter.update();
              }
            });

            // find the lead for a hole
            leadForHole = function (hole) {
              var itemsList = sparks.workbenchController.breadboardView.itemslist,
                  i, j, lead;
              for (i = itemsList.length; i--; ) {
                for (j = itemsList[i].leads.length; j--; ) {
                  lead = itemsList[i].leads[j];
                  if (lead.hole == hole) {
                    return lead;
                  }
                }
              }
              return false;
            };

            moveProbe = function (color, locOrPos) {
              var probe = multimeter.probe[color],
                  lead;

              if ((locOrPos.event === 'attached') && locOrPos.hole) {
                lead = leadForHole(locOrPos.hole);
                if (probe.lead != lead) {
                  probe.lead = lead;
                  probe.lead.probe = this;
                  probe.lead.highlight(2);
                  probe.snap();
                  meter.setProbeLocation("probe_"+color, locOrPos.hole);
                }
              }
              else if ((locOrPos.event === 'dropped') && locOrPos.position) {
                probe.move(locOrPos.position);
                probe.lead = null;
                probe.image.update();
                meter.setProbeLocation("probe_"+color, null);
              }
            };

            updateProbes = function (probes) {
              if (probes.black) {
                moveProbe('black', probes.black);
              }
              if (probes.red) {
                moveProbe('red', probes.red);
              }
              meter.update();
            };

            // listen for meter changes
            userController.getFirebaseGroupRef().child('meters').child(clientNumber).on('value', function (snapshot) {
              var data = snapshot.val();

              if (data) {
                // set the probes
                if (data.probes) {
                  prevProbes = data.probes;
                  updateProbes(data.probes);
                }

                // set the DMM
                if (data.DMM) {
                  if (dialStates[data.DMM]) {
                    multimeter.mmbox.setState(dialStates[data.DMM]);
                  }
                }
              }
            });

            // listen for user changes
            userController.getFirebaseGroupRef().child('users').on('value', function (snapshot) {
              var data = snapshot.val(),
                  username = "(unclaimed)",
                  key;

              if (data) {
                for (key in data) {
                  if (data.hasOwnProperty(key)) {
                    if (data[key].client == clientNumber) {
                      username = key;
                      break;
                    }
                  }
                }
              }

              $("#userLabel").html(username).css({backgroundColor: ['#f00', '#228b22', '#00f'][clientNumber % 3]});
            });

          }
          else {
            setTimeout(waitForLoad, 100);
          }
        };
        waitForLoad();

        // tell the parent that we are loaded after we redraw
        if (payload.loadMessage) {
          setTimeout(function () {
            parent.postMessage(payload.loadMessage, '*');
          }, 10);
        }
      }
    }, false);
  }
});


},{"../../controllers/shared/user":6,"../../data/shared/workbenchAdaptor":9,"../../data/shared/workbenchFBConnector":10}],23:[function(require,module,exports){
var div = React.DOM.div,
    button = React.DOM.button;

module.exports = React.createClass({
  displayName: 'Alert',

  render: function() {
    return div({className: "alert-wrapper"},
      div({className: 'alert-background'}),
      div({className: "alert-window-wrapper"},
        div({className: "alert-window"},
          div({className: "alert-message"}, this.props.message),
          div({className: "alert-button-wrapper"},
            button({onClick: this.props.onClose}, 'Ok')
          )
        )
      )
    );
  }
});


},{}],24:[function(require,module,exports){
var userController, UserRegistrationView, UserRegistrationViewFactory,
    groups = require('../../data/shared/group-names');

// add a global UserRegistrationView variable because its statics are called in other modules
module.exports = window.UserRegistrationView = UserRegistrationView = React.createClass({
  displayName: 'UserRegistration',

  statics: {
    // open a dialog with props object as props
    open: function(_userController, data) {
      userController = _userController;
      var $anchor = $('#user-registration');
      if (!$anchor.length) {
        $anchor = $('<div id="user-registration" class="modalDialog"></div>').appendTo('body');
      }

      setTimeout(function() {
        $('#user-registration')[0].style.opacity = 1;
      }, 250);

      return ReactDOM.render(
        UserRegistrationViewFactory(data),
        $anchor.get(0)
      );
    },

    // close a dialog
    close: function() {
      var node = $('#user-registration').get(0);
      if (node) {
        ReactDOM.unmountComponentAtNode(node);
      }
      $('#user-registration').remove();
    }
  },
  getInitialState: function() {
    return {
      groupName: this.props.groupName || ""
    };
  },
  handleGroupNameChange: function(event) {
    this.setState({groupName: event.target.value});
  },
  handleGroupSelected: function(e) {
    e.preventDefault();
    userController.tryToEnterGroup(this.state.groupName);
  },
  handleJoinGroup: function() {
    userController.setGroupName(this.state.groupName);
  },
  handleRejectGroup: function() {
    this.setState({groupName: ''});
    userController.rejectGroupName();
  },
  handleClientSelection: function(event) {
    userController.selectClient(event.target.value);
  },
  handleClientSelected: function(e) {
    e.preventDefault();
    userController.selectedClient();
  },
  handleSubmit: function (e) {
    e.preventDefault();
  },
  componentDidMount: function () {
    var self = this,
        focusAndSelect = function (ref) {
          var node = self.refs[ref] ? self.refs[ref] : null;
          if (node) {
            node.focus();
            node.select();
          }
        };
    if (this.props.form == 'username') {
      focusAndSelect('userName');
    }
    else if (this.props.form == 'groupname') {
      focusAndSelect('groupName');
    }
  },
  render: function() {
    var form;
    if (this.props.form == 'gettingGlobalState') {
      form = (
        React.createElement("div", null, 
          React.createElement("h3", null, "Checking for previously set group and username")
        )
      );
    }
    else if (this.props.form == 'groupname' || !this.state.groupName) {
      var groupOptions = groups.map(function(group, i) {
        return (React.createElement("option", {key: i, value: group.name}, group.name));
      });
      groupOptions.unshift(React.createElement("option", {key: "placeholder", value: "", disabled: "disabled"}, "Select a team"));
      form = (
        React.createElement("div", null, 
          React.createElement("h3", null, "Welcome!"), 
          React.createElement("div", null, 
            "This activity requires a team of ", this.props.numClients, " users."
          ), 
          React.createElement("h3", null, "Please select your team:"), 
          React.createElement("label", null, 
            React.createElement("select", {value: this.state.groupName, onChange:  this.handleGroupNameChange}, 
               groupOptions 
            ), 
            React.createElement("button", {onClick:  this.handleGroupSelected}, "Select")
          )
        )
      );
    } else if (this.props.form == 'groupconfirm') {
      if (!this.props.userName) {
        form = (
          React.createElement("div", null, 
            React.createElement("h3", null, "Group name: ",  this.state.groupName), 
            React.createElement("div", null, 
              "There are already ",  this.props.numExistingUsers, " in this group."
            ), 
            React.createElement("label", null, 
              React.createElement("button", {onClick:  this.handleRejectGroup}, "Enter a different group")
            )
          )
        );
      } else {
        var userDetails,
            groupDetails,
            joinStr,
            keys = Object.keys(this.props.users),
            userName = this.props.userName;

        userDetails = (
          React.createElement("div", null, 
            React.createElement("label", null, "You have been assigned the name ", React.createElement("b", null, userName), ".")
          )
        );

        if (keys.length === 0) {
          groupDetails = (
            React.createElement("div", null, 
              React.createElement("label", null, "You are the first member of this group.")
            )
          );
        } else {
          groupDetails = (
            React.createElement("div", null, 
              React.createElement("label", null, "These are the other people currently in this group:"), 
              React.createElement("ul", null, 
                keys.map(function(result) {
                  return React.createElement("li", null, React.createElement("b", null, result));
                })
              )
            )
          );
        }

        joinStr = (keys.length ? "join" : "create");

        form = (
          React.createElement("div", null, 
            React.createElement("h3", null, "Group name: ",  this.state.groupName), 
             userDetails, 
             groupDetails, 
            React.createElement("div", {style: {marginTop: 10}}, "Do you want to ",  joinStr, " this group?"), 
            React.createElement("label", null, 
              React.createElement("button", {onClick:  this.handleJoinGroup}, "Yes, ",  joinStr ), 
              React.createElement("button", {onClick:  this.handleRejectGroup}, "No, enter a different group")
            )
          )
        );
      }
    } else if (this.props.form == 'selectboard') {
      var clientChoices = [],
          submittable = false;
      for (var i = 0, ii = this.props.numClients; i < ii; i++) {
        var userSpan = ( React.createElement("i", null, "currently unclaimed") ),
            isOwn = false,
            selected = false,
            valid = true,
            selectedUsers = [];
        for (var user in this.props.users) {
          if (this.props.users[user].client == i) {
            selectedUsers.push(user);
            if (user == this.props.userName) {
              isOwn = true;
              selected = true;
            }
            if (selectedUsers.length > 1) {
              valid = false;
            }
            userSpan = ( React.createElement("span", {className:  valid ? "" : "error"},  selectedUsers.join(", ") ) );
          }
        }
        if (isOwn && selectedUsers.length == 1) {
          submittable = true;
        }

        clientChoices.push(
          React.createElement("div", {key:  i }, 
            React.createElement("input", {type: "radio", name: "clientSelection", value:  i, onClick:  this.handleClientSelection}), "Circuit ",  i+1, " (",  userSpan, ")"
          ) );
      }

      form = (
        React.createElement("div", null, 
          React.createElement("h3", null, "Select Circuit"), 
           clientChoices, 
          React.createElement("label", null, 
            React.createElement("button", {disabled:  !submittable, onClick:  this.handleClientSelected}, "Select"), 
            React.createElement("button", {onClick:  this.handleRejectGroup}, "Enter a different group")
          )
        )
      );
    }

    return (
      React.createElement("form", {onSubmit:  this.handleSubmit}, 
         form 
      )
    );
  }
});

// used because JSX deprecated the spread function in the transformer
UserRegistrationViewFactory = React.createFactory(UserRegistrationView);


},{"../../data/shared/group-names":7}],25:[function(require,module,exports){
// NOTE: the __TT* variables are replaced by the browserify gulp task

var div = React.DOM.div,
    a = React.DOM.a;

module.exports = React.createClass({
  displayName: 'Version',

  renderGitCommit: function () {
    var commitHash = 'e7a7125a0b18c69a15bab40e77e295842323a841';

    if (commitHash[0] != '_') {
      return div({className: 'version-info'},
        a({href: 'https://github.com/concord-consortium/teaching-teamwork/commit/' + commitHash, target: '_blank'}, 'Commit: ' + commitHash)
      );
    }
    else {
      return null;
    }
  },

  render: function() {
    return div({className: "version-wrapper"},
      div({className: 'version-info'}, 'Version 1.0.1, built on Sat Oct 22 2016 02:30:17 GMT-0700 (PDT)'),
      this.renderGitCommit()
    );
  }
});


},{}],26:[function(require,module,exports){
// SVGPathSeg API polyfill
// https://github.com/progers/pathseg
//
// This is a drop-in replacement for the SVGPathSeg and SVGPathSegList APIs that were removed from
// SVG2 (https://lists.w3.org/Archives/Public/www-svg/2015Jun/0044.html), including the latest spec
// changes which were implemented in Firefox 43 and Chrome 46.

(function() { "use strict";
    if (!("SVGPathSeg" in window)) {
        // Spec: http://www.w3.org/TR/SVG11/single-page.html#paths-InterfaceSVGPathSeg
        window.SVGPathSeg = function(type, typeAsLetter, owningPathSegList) {
            this.pathSegType = type;
            this.pathSegTypeAsLetter = typeAsLetter;
            this._owningPathSegList = owningPathSegList;
        }

        SVGPathSeg.prototype.classname = "SVGPathSeg";

        SVGPathSeg.PATHSEG_UNKNOWN = 0;
        SVGPathSeg.PATHSEG_CLOSEPATH = 1;
        SVGPathSeg.PATHSEG_MOVETO_ABS = 2;
        SVGPathSeg.PATHSEG_MOVETO_REL = 3;
        SVGPathSeg.PATHSEG_LINETO_ABS = 4;
        SVGPathSeg.PATHSEG_LINETO_REL = 5;
        SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS = 6;
        SVGPathSeg.PATHSEG_CURVETO_CUBIC_REL = 7;
        SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_ABS = 8;
        SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_REL = 9;
        SVGPathSeg.PATHSEG_ARC_ABS = 10;
        SVGPathSeg.PATHSEG_ARC_REL = 11;
        SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_ABS = 12;
        SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_REL = 13;
        SVGPathSeg.PATHSEG_LINETO_VERTICAL_ABS = 14;
        SVGPathSeg.PATHSEG_LINETO_VERTICAL_REL = 15;
        SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_ABS = 16;
        SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_REL = 17;
        SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS = 18;
        SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_REL = 19;

        // Notify owning PathSegList on any changes so they can be synchronized back to the path element.
        SVGPathSeg.prototype._segmentChanged = function() {
            if (this._owningPathSegList)
                this._owningPathSegList.segmentChanged(this);
        }

        window.SVGPathSegClosePath = function(owningPathSegList) {
            SVGPathSeg.call(this, SVGPathSeg.PATHSEG_CLOSEPATH, "z", owningPathSegList);
        }
        SVGPathSegClosePath.prototype = Object.create(SVGPathSeg.prototype);
        SVGPathSegClosePath.prototype.toString = function() { return "[object SVGPathSegClosePath]"; }
        SVGPathSegClosePath.prototype._asPathString = function() { return this.pathSegTypeAsLetter; }
        SVGPathSegClosePath.prototype.clone = function() { return new SVGPathSegClosePath(undefined); }

        window.SVGPathSegMovetoAbs = function(owningPathSegList, x, y) {
            SVGPathSeg.call(this, SVGPathSeg.PATHSEG_MOVETO_ABS, "M", owningPathSegList);
            this._x = x;
            this._y = y;
        }
        SVGPathSegMovetoAbs.prototype = Object.create(SVGPathSeg.prototype);
        SVGPathSegMovetoAbs.prototype.toString = function() { return "[object SVGPathSegMovetoAbs]"; }
        SVGPathSegMovetoAbs.prototype._asPathString = function() { return this.pathSegTypeAsLetter + " " + this._x + " " + this._y; }
        SVGPathSegMovetoAbs.prototype.clone = function() { return new SVGPathSegMovetoAbs(undefined, this._x, this._y); }
        Object.defineProperty(SVGPathSegMovetoAbs.prototype, "x", { get: function() { return this._x; }, set: function(x) { this._x = x; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegMovetoAbs.prototype, "y", { get: function() { return this._y; }, set: function(y) { this._y = y; this._segmentChanged(); }, enumerable: true });

        window.SVGPathSegMovetoRel = function(owningPathSegList, x, y) {
            SVGPathSeg.call(this, SVGPathSeg.PATHSEG_MOVETO_REL, "m", owningPathSegList);
            this._x = x;
            this._y = y;
        }
        SVGPathSegMovetoRel.prototype = Object.create(SVGPathSeg.prototype);
        SVGPathSegMovetoRel.prototype.toString = function() { return "[object SVGPathSegMovetoRel]"; }
        SVGPathSegMovetoRel.prototype._asPathString = function() { return this.pathSegTypeAsLetter + " " + this._x + " " + this._y; }
        SVGPathSegMovetoRel.prototype.clone = function() { return new SVGPathSegMovetoRel(undefined, this._x, this._y); }
        Object.defineProperty(SVGPathSegMovetoRel.prototype, "x", { get: function() { return this._x; }, set: function(x) { this._x = x; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegMovetoRel.prototype, "y", { get: function() { return this._y; }, set: function(y) { this._y = y; this._segmentChanged(); }, enumerable: true });

        window.SVGPathSegLinetoAbs = function(owningPathSegList, x, y) {
            SVGPathSeg.call(this, SVGPathSeg.PATHSEG_LINETO_ABS, "L", owningPathSegList);
            this._x = x;
            this._y = y;
        }
        SVGPathSegLinetoAbs.prototype = Object.create(SVGPathSeg.prototype);
        SVGPathSegLinetoAbs.prototype.toString = function() { return "[object SVGPathSegLinetoAbs]"; }
        SVGPathSegLinetoAbs.prototype._asPathString = function() { return this.pathSegTypeAsLetter + " " + this._x + " " + this._y; }
        SVGPathSegLinetoAbs.prototype.clone = function() { return new SVGPathSegLinetoAbs(undefined, this._x, this._y); }
        Object.defineProperty(SVGPathSegLinetoAbs.prototype, "x", { get: function() { return this._x; }, set: function(x) { this._x = x; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegLinetoAbs.prototype, "y", { get: function() { return this._y; }, set: function(y) { this._y = y; this._segmentChanged(); }, enumerable: true });

        window.SVGPathSegLinetoRel = function(owningPathSegList, x, y) {
            SVGPathSeg.call(this, SVGPathSeg.PATHSEG_LINETO_REL, "l", owningPathSegList);
            this._x = x;
            this._y = y;
        }
        SVGPathSegLinetoRel.prototype = Object.create(SVGPathSeg.prototype);
        SVGPathSegLinetoRel.prototype.toString = function() { return "[object SVGPathSegLinetoRel]"; }
        SVGPathSegLinetoRel.prototype._asPathString = function() { return this.pathSegTypeAsLetter + " " + this._x + " " + this._y; }
        SVGPathSegLinetoRel.prototype.clone = function() { return new SVGPathSegLinetoRel(undefined, this._x, this._y); }
        Object.defineProperty(SVGPathSegLinetoRel.prototype, "x", { get: function() { return this._x; }, set: function(x) { this._x = x; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegLinetoRel.prototype, "y", { get: function() { return this._y; }, set: function(y) { this._y = y; this._segmentChanged(); }, enumerable: true });

        window.SVGPathSegCurvetoCubicAbs = function(owningPathSegList, x, y, x1, y1, x2, y2) {
            SVGPathSeg.call(this, SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS, "C", owningPathSegList);
            this._x = x;
            this._y = y;
            this._x1 = x1;
            this._y1 = y1;
            this._x2 = x2;
            this._y2 = y2;
        }
        SVGPathSegCurvetoCubicAbs.prototype = Object.create(SVGPathSeg.prototype);
        SVGPathSegCurvetoCubicAbs.prototype.toString = function() { return "[object SVGPathSegCurvetoCubicAbs]"; }
        SVGPathSegCurvetoCubicAbs.prototype._asPathString = function() { return this.pathSegTypeAsLetter + " " + this._x1 + " " + this._y1 + " " + this._x2 + " " + this._y2 + " " + this._x + " " + this._y; }
        SVGPathSegCurvetoCubicAbs.prototype.clone = function() { return new SVGPathSegCurvetoCubicAbs(undefined, this._x, this._y, this._x1, this._y1, this._x2, this._y2); }
        Object.defineProperty(SVGPathSegCurvetoCubicAbs.prototype, "x", { get: function() { return this._x; }, set: function(x) { this._x = x; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoCubicAbs.prototype, "y", { get: function() { return this._y; }, set: function(y) { this._y = y; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoCubicAbs.prototype, "x1", { get: function() { return this._x1; }, set: function(x1) { this._x1 = x1; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoCubicAbs.prototype, "y1", { get: function() { return this._y1; }, set: function(y1) { this._y1 = y1; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoCubicAbs.prototype, "x2", { get: function() { return this._x2; }, set: function(x2) { this._x2 = x2; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoCubicAbs.prototype, "y2", { get: function() { return this._y2; }, set: function(y2) { this._y2 = y2; this._segmentChanged(); }, enumerable: true });

        window.SVGPathSegCurvetoCubicRel = function(owningPathSegList, x, y, x1, y1, x2, y2) {
            SVGPathSeg.call(this, SVGPathSeg.PATHSEG_CURVETO_CUBIC_REL, "c", owningPathSegList);
            this._x = x;
            this._y = y;
            this._x1 = x1;
            this._y1 = y1;
            this._x2 = x2;
            this._y2 = y2;
        }
        SVGPathSegCurvetoCubicRel.prototype = Object.create(SVGPathSeg.prototype);
        SVGPathSegCurvetoCubicRel.prototype.toString = function() { return "[object SVGPathSegCurvetoCubicRel]"; }
        SVGPathSegCurvetoCubicRel.prototype._asPathString = function() { return this.pathSegTypeAsLetter + " " + this._x1 + " " + this._y1 + " " + this._x2 + " " + this._y2 + " " + this._x + " " + this._y; }
        SVGPathSegCurvetoCubicRel.prototype.clone = function() { return new SVGPathSegCurvetoCubicRel(undefined, this._x, this._y, this._x1, this._y1, this._x2, this._y2); }
        Object.defineProperty(SVGPathSegCurvetoCubicRel.prototype, "x", { get: function() { return this._x; }, set: function(x) { this._x = x; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoCubicRel.prototype, "y", { get: function() { return this._y; }, set: function(y) { this._y = y; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoCubicRel.prototype, "x1", { get: function() { return this._x1; }, set: function(x1) { this._x1 = x1; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoCubicRel.prototype, "y1", { get: function() { return this._y1; }, set: function(y1) { this._y1 = y1; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoCubicRel.prototype, "x2", { get: function() { return this._x2; }, set: function(x2) { this._x2 = x2; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoCubicRel.prototype, "y2", { get: function() { return this._y2; }, set: function(y2) { this._y2 = y2; this._segmentChanged(); }, enumerable: true });

        window.SVGPathSegCurvetoQuadraticAbs = function(owningPathSegList, x, y, x1, y1) {
            SVGPathSeg.call(this, SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_ABS, "Q", owningPathSegList);
            this._x = x;
            this._y = y;
            this._x1 = x1;
            this._y1 = y1;
        }
        SVGPathSegCurvetoQuadraticAbs.prototype = Object.create(SVGPathSeg.prototype);
        SVGPathSegCurvetoQuadraticAbs.prototype.toString = function() { return "[object SVGPathSegCurvetoQuadraticAbs]"; }
        SVGPathSegCurvetoQuadraticAbs.prototype._asPathString = function() { return this.pathSegTypeAsLetter + " " + this._x1 + " " + this._y1 + " " + this._x + " " + this._y; }
        SVGPathSegCurvetoQuadraticAbs.prototype.clone = function() { return new SVGPathSegCurvetoQuadraticAbs(undefined, this._x, this._y, this._x1, this._y1); }
        Object.defineProperty(SVGPathSegCurvetoQuadraticAbs.prototype, "x", { get: function() { return this._x; }, set: function(x) { this._x = x; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoQuadraticAbs.prototype, "y", { get: function() { return this._y; }, set: function(y) { this._y = y; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoQuadraticAbs.prototype, "x1", { get: function() { return this._x1; }, set: function(x1) { this._x1 = x1; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoQuadraticAbs.prototype, "y1", { get: function() { return this._y1; }, set: function(y1) { this._y1 = y1; this._segmentChanged(); }, enumerable: true });

        window.SVGPathSegCurvetoQuadraticRel = function(owningPathSegList, x, y, x1, y1) {
            SVGPathSeg.call(this, SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_REL, "q", owningPathSegList);
            this._x = x;
            this._y = y;
            this._x1 = x1;
            this._y1 = y1;
        }
        SVGPathSegCurvetoQuadraticRel.prototype = Object.create(SVGPathSeg.prototype);
        SVGPathSegCurvetoQuadraticRel.prototype.toString = function() { return "[object SVGPathSegCurvetoQuadraticRel]"; }
        SVGPathSegCurvetoQuadraticRel.prototype._asPathString = function() { return this.pathSegTypeAsLetter + " " + this._x1 + " " + this._y1 + " " + this._x + " " + this._y; }
        SVGPathSegCurvetoQuadraticRel.prototype.clone = function() { return new SVGPathSegCurvetoQuadraticRel(undefined, this._x, this._y, this._x1, this._y1); }
        Object.defineProperty(SVGPathSegCurvetoQuadraticRel.prototype, "x", { get: function() { return this._x; }, set: function(x) { this._x = x; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoQuadraticRel.prototype, "y", { get: function() { return this._y; }, set: function(y) { this._y = y; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoQuadraticRel.prototype, "x1", { get: function() { return this._x1; }, set: function(x1) { this._x1 = x1; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoQuadraticRel.prototype, "y1", { get: function() { return this._y1; }, set: function(y1) { this._y1 = y1; this._segmentChanged(); }, enumerable: true });

        window.SVGPathSegArcAbs = function(owningPathSegList, x, y, r1, r2, angle, largeArcFlag, sweepFlag) {
            SVGPathSeg.call(this, SVGPathSeg.PATHSEG_ARC_ABS, "A", owningPathSegList);
            this._x = x;
            this._y = y;
            this._r1 = r1;
            this._r2 = r2;
            this._angle = angle;
            this._largeArcFlag = largeArcFlag;
            this._sweepFlag = sweepFlag;
        }
        SVGPathSegArcAbs.prototype = Object.create(SVGPathSeg.prototype);
        SVGPathSegArcAbs.prototype.toString = function() { return "[object SVGPathSegArcAbs]"; }
        SVGPathSegArcAbs.prototype._asPathString = function() { return this.pathSegTypeAsLetter + " " + this._r1 + " " + this._r2 + " " + this._angle + " " + (this._largeArcFlag ? "1" : "0") + " " + (this._sweepFlag ? "1" : "0") + " " + this._x + " " + this._y; }
        SVGPathSegArcAbs.prototype.clone = function() { return new SVGPathSegArcAbs(undefined, this._x, this._y, this._r1, this._r2, this._angle, this._largeArcFlag, this._sweepFlag); }
        Object.defineProperty(SVGPathSegArcAbs.prototype, "x", { get: function() { return this._x; }, set: function(x) { this._x = x; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegArcAbs.prototype, "y", { get: function() { return this._y; }, set: function(y) { this._y = y; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegArcAbs.prototype, "r1", { get: function() { return this._r1; }, set: function(r1) { this._r1 = r1; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegArcAbs.prototype, "r2", { get: function() { return this._r2; }, set: function(r2) { this._r2 = r2; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegArcAbs.prototype, "angle", { get: function() { return this._angle; }, set: function(angle) { this._angle = angle; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegArcAbs.prototype, "largeArcFlag", { get: function() { return this._largeArcFlag; }, set: function(largeArcFlag) { this._largeArcFlag = largeArcFlag; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegArcAbs.prototype, "sweepFlag", { get: function() { return this._sweepFlag; }, set: function(sweepFlag) { this._sweepFlag = sweepFlag; this._segmentChanged(); }, enumerable: true });

        window.SVGPathSegArcRel = function(owningPathSegList, x, y, r1, r2, angle, largeArcFlag, sweepFlag) {
            SVGPathSeg.call(this, SVGPathSeg.PATHSEG_ARC_REL, "a", owningPathSegList);
            this._x = x;
            this._y = y;
            this._r1 = r1;
            this._r2 = r2;
            this._angle = angle;
            this._largeArcFlag = largeArcFlag;
            this._sweepFlag = sweepFlag;
        }
        SVGPathSegArcRel.prototype = Object.create(SVGPathSeg.prototype);
        SVGPathSegArcRel.prototype.toString = function() { return "[object SVGPathSegArcRel]"; }
        SVGPathSegArcRel.prototype._asPathString = function() { return this.pathSegTypeAsLetter + " " + this._r1 + " " + this._r2 + " " + this._angle + " " + (this._largeArcFlag ? "1" : "0") + " " + (this._sweepFlag ? "1" : "0") + " " + this._x + " " + this._y; }
        SVGPathSegArcRel.prototype.clone = function() { return new SVGPathSegArcRel(undefined, this._x, this._y, this._r1, this._r2, this._angle, this._largeArcFlag, this._sweepFlag); }
        Object.defineProperty(SVGPathSegArcRel.prototype, "x", { get: function() { return this._x; }, set: function(x) { this._x = x; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegArcRel.prototype, "y", { get: function() { return this._y; }, set: function(y) { this._y = y; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegArcRel.prototype, "r1", { get: function() { return this._r1; }, set: function(r1) { this._r1 = r1; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegArcRel.prototype, "r2", { get: function() { return this._r2; }, set: function(r2) { this._r2 = r2; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegArcRel.prototype, "angle", { get: function() { return this._angle; }, set: function(angle) { this._angle = angle; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegArcRel.prototype, "largeArcFlag", { get: function() { return this._largeArcFlag; }, set: function(largeArcFlag) { this._largeArcFlag = largeArcFlag; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegArcRel.prototype, "sweepFlag", { get: function() { return this._sweepFlag; }, set: function(sweepFlag) { this._sweepFlag = sweepFlag; this._segmentChanged(); }, enumerable: true });

        window.SVGPathSegLinetoHorizontalAbs = function(owningPathSegList, x) {
            SVGPathSeg.call(this, SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_ABS, "H", owningPathSegList);
            this._x = x;
        }
        SVGPathSegLinetoHorizontalAbs.prototype = Object.create(SVGPathSeg.prototype);
        SVGPathSegLinetoHorizontalAbs.prototype.toString = function() { return "[object SVGPathSegLinetoHorizontalAbs]"; }
        SVGPathSegLinetoHorizontalAbs.prototype._asPathString = function() { return this.pathSegTypeAsLetter + " " + this._x; }
        SVGPathSegLinetoHorizontalAbs.prototype.clone = function() { return new SVGPathSegLinetoHorizontalAbs(undefined, this._x); }
        Object.defineProperty(SVGPathSegLinetoHorizontalAbs.prototype, "x", { get: function() { return this._x; }, set: function(x) { this._x = x; this._segmentChanged(); }, enumerable: true });

        window.SVGPathSegLinetoHorizontalRel = function(owningPathSegList, x) {
            SVGPathSeg.call(this, SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_REL, "h", owningPathSegList);
            this._x = x;
        }
        SVGPathSegLinetoHorizontalRel.prototype = Object.create(SVGPathSeg.prototype);
        SVGPathSegLinetoHorizontalRel.prototype.toString = function() { return "[object SVGPathSegLinetoHorizontalRel]"; }
        SVGPathSegLinetoHorizontalRel.prototype._asPathString = function() { return this.pathSegTypeAsLetter + " " + this._x; }
        SVGPathSegLinetoHorizontalRel.prototype.clone = function() { return new SVGPathSegLinetoHorizontalRel(undefined, this._x); }
        Object.defineProperty(SVGPathSegLinetoHorizontalRel.prototype, "x", { get: function() { return this._x; }, set: function(x) { this._x = x; this._segmentChanged(); }, enumerable: true });

        window.SVGPathSegLinetoVerticalAbs = function(owningPathSegList, y) {
            SVGPathSeg.call(this, SVGPathSeg.PATHSEG_LINETO_VERTICAL_ABS, "V", owningPathSegList);
            this._y = y;
        }
        SVGPathSegLinetoVerticalAbs.prototype = Object.create(SVGPathSeg.prototype);
        SVGPathSegLinetoVerticalAbs.prototype.toString = function() { return "[object SVGPathSegLinetoVerticalAbs]"; }
        SVGPathSegLinetoVerticalAbs.prototype._asPathString = function() { return this.pathSegTypeAsLetter + " " + this._y; }
        SVGPathSegLinetoVerticalAbs.prototype.clone = function() { return new SVGPathSegLinetoVerticalAbs(undefined, this._y); }
        Object.defineProperty(SVGPathSegLinetoVerticalAbs.prototype, "y", { get: function() { return this._y; }, set: function(y) { this._y = y; this._segmentChanged(); }, enumerable: true });

        window.SVGPathSegLinetoVerticalRel = function(owningPathSegList, y) {
            SVGPathSeg.call(this, SVGPathSeg.PATHSEG_LINETO_VERTICAL_REL, "v", owningPathSegList);
            this._y = y;
        }
        SVGPathSegLinetoVerticalRel.prototype = Object.create(SVGPathSeg.prototype);
        SVGPathSegLinetoVerticalRel.prototype.toString = function() { return "[object SVGPathSegLinetoVerticalRel]"; }
        SVGPathSegLinetoVerticalRel.prototype._asPathString = function() { return this.pathSegTypeAsLetter + " " + this._y; }
        SVGPathSegLinetoVerticalRel.prototype.clone = function() { return new SVGPathSegLinetoVerticalRel(undefined, this._y); }
        Object.defineProperty(SVGPathSegLinetoVerticalRel.prototype, "y", { get: function() { return this._y; }, set: function(y) { this._y = y; this._segmentChanged(); }, enumerable: true });

        window.SVGPathSegCurvetoCubicSmoothAbs = function(owningPathSegList, x, y, x2, y2) {
            SVGPathSeg.call(this, SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_ABS, "S", owningPathSegList);
            this._x = x;
            this._y = y;
            this._x2 = x2;
            this._y2 = y2;
        }
        SVGPathSegCurvetoCubicSmoothAbs.prototype = Object.create(SVGPathSeg.prototype);
        SVGPathSegCurvetoCubicSmoothAbs.prototype.toString = function() { return "[object SVGPathSegCurvetoCubicSmoothAbs]"; }
        SVGPathSegCurvetoCubicSmoothAbs.prototype._asPathString = function() { return this.pathSegTypeAsLetter + " " + this._x2 + " " + this._y2 + " " + this._x + " " + this._y; }
        SVGPathSegCurvetoCubicSmoothAbs.prototype.clone = function() { return new SVGPathSegCurvetoCubicSmoothAbs(undefined, this._x, this._y, this._x2, this._y2); }
        Object.defineProperty(SVGPathSegCurvetoCubicSmoothAbs.prototype, "x", { get: function() { return this._x; }, set: function(x) { this._x = x; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoCubicSmoothAbs.prototype, "y", { get: function() { return this._y; }, set: function(y) { this._y = y; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoCubicSmoothAbs.prototype, "x2", { get: function() { return this._x2; }, set: function(x2) { this._x2 = x2; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoCubicSmoothAbs.prototype, "y2", { get: function() { return this._y2; }, set: function(y2) { this._y2 = y2; this._segmentChanged(); }, enumerable: true });

        window.SVGPathSegCurvetoCubicSmoothRel = function(owningPathSegList, x, y, x2, y2) {
            SVGPathSeg.call(this, SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_REL, "s", owningPathSegList);
            this._x = x;
            this._y = y;
            this._x2 = x2;
            this._y2 = y2;
        }
        SVGPathSegCurvetoCubicSmoothRel.prototype = Object.create(SVGPathSeg.prototype);
        SVGPathSegCurvetoCubicSmoothRel.prototype.toString = function() { return "[object SVGPathSegCurvetoCubicSmoothRel]"; }
        SVGPathSegCurvetoCubicSmoothRel.prototype._asPathString = function() { return this.pathSegTypeAsLetter + " " + this._x2 + " " + this._y2 + " " + this._x + " " + this._y; }
        SVGPathSegCurvetoCubicSmoothRel.prototype.clone = function() { return new SVGPathSegCurvetoCubicSmoothRel(undefined, this._x, this._y, this._x2, this._y2); }
        Object.defineProperty(SVGPathSegCurvetoCubicSmoothRel.prototype, "x", { get: function() { return this._x; }, set: function(x) { this._x = x; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoCubicSmoothRel.prototype, "y", { get: function() { return this._y; }, set: function(y) { this._y = y; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoCubicSmoothRel.prototype, "x2", { get: function() { return this._x2; }, set: function(x2) { this._x2 = x2; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoCubicSmoothRel.prototype, "y2", { get: function() { return this._y2; }, set: function(y2) { this._y2 = y2; this._segmentChanged(); }, enumerable: true });

        window.SVGPathSegCurvetoQuadraticSmoothAbs = function(owningPathSegList, x, y) {
            SVGPathSeg.call(this, SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS, "T", owningPathSegList);
            this._x = x;
            this._y = y;
        }
        SVGPathSegCurvetoQuadraticSmoothAbs.prototype = Object.create(SVGPathSeg.prototype);
        SVGPathSegCurvetoQuadraticSmoothAbs.prototype.toString = function() { return "[object SVGPathSegCurvetoQuadraticSmoothAbs]"; }
        SVGPathSegCurvetoQuadraticSmoothAbs.prototype._asPathString = function() { return this.pathSegTypeAsLetter + " " + this._x + " " + this._y; }
        SVGPathSegCurvetoQuadraticSmoothAbs.prototype.clone = function() { return new SVGPathSegCurvetoQuadraticSmoothAbs(undefined, this._x, this._y); }
        Object.defineProperty(SVGPathSegCurvetoQuadraticSmoothAbs.prototype, "x", { get: function() { return this._x; }, set: function(x) { this._x = x; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoQuadraticSmoothAbs.prototype, "y", { get: function() { return this._y; }, set: function(y) { this._y = y; this._segmentChanged(); }, enumerable: true });

        window.SVGPathSegCurvetoQuadraticSmoothRel = function(owningPathSegList, x, y) {
            SVGPathSeg.call(this, SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_REL, "t", owningPathSegList);
            this._x = x;
            this._y = y;
        }
        SVGPathSegCurvetoQuadraticSmoothRel.prototype = Object.create(SVGPathSeg.prototype);
        SVGPathSegCurvetoQuadraticSmoothRel.prototype.toString = function() { return "[object SVGPathSegCurvetoQuadraticSmoothRel]"; }
        SVGPathSegCurvetoQuadraticSmoothRel.prototype._asPathString = function() { return this.pathSegTypeAsLetter + " " + this._x + " " + this._y; }
        SVGPathSegCurvetoQuadraticSmoothRel.prototype.clone = function() { return new SVGPathSegCurvetoQuadraticSmoothRel(undefined, this._x, this._y); }
        Object.defineProperty(SVGPathSegCurvetoQuadraticSmoothRel.prototype, "x", { get: function() { return this._x; }, set: function(x) { this._x = x; this._segmentChanged(); }, enumerable: true });
        Object.defineProperty(SVGPathSegCurvetoQuadraticSmoothRel.prototype, "y", { get: function() { return this._y; }, set: function(y) { this._y = y; this._segmentChanged(); }, enumerable: true });

        // Add createSVGPathSeg* functions to SVGPathElement.
        // Spec: http://www.w3.org/TR/SVG11/single-page.html#paths-InterfaceSVGPathElement.
        SVGPathElement.prototype.createSVGPathSegClosePath = function() { return new SVGPathSegClosePath(undefined); }
        SVGPathElement.prototype.createSVGPathSegMovetoAbs = function(x, y) { return new SVGPathSegMovetoAbs(undefined, x, y); }
        SVGPathElement.prototype.createSVGPathSegMovetoRel = function(x, y) { return new SVGPathSegMovetoRel(undefined, x, y); }
        SVGPathElement.prototype.createSVGPathSegLinetoAbs = function(x, y) { return new SVGPathSegLinetoAbs(undefined, x, y); }
        SVGPathElement.prototype.createSVGPathSegLinetoRel = function(x, y) { return new SVGPathSegLinetoRel(undefined, x, y); }
        SVGPathElement.prototype.createSVGPathSegCurvetoCubicAbs = function(x, y, x1, y1, x2, y2) { return new SVGPathSegCurvetoCubicAbs(undefined, x, y, x1, y1, x2, y2); }
        SVGPathElement.prototype.createSVGPathSegCurvetoCubicRel = function(x, y, x1, y1, x2, y2) { return new SVGPathSegCurvetoCubicRel(undefined, x, y, x1, y1, x2, y2); }
        SVGPathElement.prototype.createSVGPathSegCurvetoQuadraticAbs = function(x, y, x1, y1) { return new SVGPathSegCurvetoQuadraticAbs(undefined, x, y, x1, y1); }
        SVGPathElement.prototype.createSVGPathSegCurvetoQuadraticRel = function(x, y, x1, y1) { return new SVGPathSegCurvetoQuadraticRel(undefined, x, y, x1, y1); }
        SVGPathElement.prototype.createSVGPathSegArcAbs = function(x, y, r1, r2, angle, largeArcFlag, sweepFlag) { return new SVGPathSegArcAbs(undefined, x, y, r1, r2, angle, largeArcFlag, sweepFlag); }
        SVGPathElement.prototype.createSVGPathSegArcRel = function(x, y, r1, r2, angle, largeArcFlag, sweepFlag) { return new SVGPathSegArcRel(undefined, x, y, r1, r2, angle, largeArcFlag, sweepFlag); }
        SVGPathElement.prototype.createSVGPathSegLinetoHorizontalAbs = function(x) { return new SVGPathSegLinetoHorizontalAbs(undefined, x); }
        SVGPathElement.prototype.createSVGPathSegLinetoHorizontalRel = function(x) { return new SVGPathSegLinetoHorizontalRel(undefined, x); }
        SVGPathElement.prototype.createSVGPathSegLinetoVerticalAbs = function(y) { return new SVGPathSegLinetoVerticalAbs(undefined, y); }
        SVGPathElement.prototype.createSVGPathSegLinetoVerticalRel = function(y) { return new SVGPathSegLinetoVerticalRel(undefined, y); }
        SVGPathElement.prototype.createSVGPathSegCurvetoCubicSmoothAbs = function(x, y, x2, y2) { return new SVGPathSegCurvetoCubicSmoothAbs(undefined, x, y, x2, y2); }
        SVGPathElement.prototype.createSVGPathSegCurvetoCubicSmoothRel = function(x, y, x2, y2) { return new SVGPathSegCurvetoCubicSmoothRel(undefined, x, y, x2, y2); }
        SVGPathElement.prototype.createSVGPathSegCurvetoQuadraticSmoothAbs = function(x, y) { return new SVGPathSegCurvetoQuadraticSmoothAbs(undefined, x, y); }
        SVGPathElement.prototype.createSVGPathSegCurvetoQuadraticSmoothRel = function(x, y) { return new SVGPathSegCurvetoQuadraticSmoothRel(undefined, x, y); }
    }

    if (!("SVGPathSegList" in window)) {
        // Spec: http://www.w3.org/TR/SVG11/single-page.html#paths-InterfaceSVGPathSegList
        window.SVGPathSegList = function(pathElement) {
            this._pathElement = pathElement;
            this._list = this._parsePath(this._pathElement.getAttribute("d"));

            // Use a MutationObserver to catch changes to the path's "d" attribute.
            this._mutationObserverConfig = { "attributes": true, "attributeFilter": ["d"] };
            this._pathElementMutationObserver = new MutationObserver(this._updateListFromPathMutations.bind(this));
            this._pathElementMutationObserver.observe(this._pathElement, this._mutationObserverConfig);
        }

        SVGPathSegList.prototype.classname = "SVGPathSegList";

        Object.defineProperty(SVGPathSegList.prototype, "numberOfItems", {
            get: function() {
                this._checkPathSynchronizedToList();
                return this._list.length;
            },
            enumerable: true
        });

        // Add the pathSegList accessors to SVGPathElement.
        // Spec: http://www.w3.org/TR/SVG11/single-page.html#paths-InterfaceSVGAnimatedPathData
        Object.defineProperty(SVGPathElement.prototype, "pathSegList", {
            get: function() {
                if (!this._pathSegList)
                    this._pathSegList = new SVGPathSegList(this);
                return this._pathSegList;
            },
            enumerable: true
        });
        // FIXME: The following are not implemented and simply return SVGPathElement.pathSegList.
        Object.defineProperty(SVGPathElement.prototype, "normalizedPathSegList", { get: function() { return this.pathSegList; }, enumerable: true });
        Object.defineProperty(SVGPathElement.prototype, "animatedPathSegList", { get: function() { return this.pathSegList; }, enumerable: true });
        Object.defineProperty(SVGPathElement.prototype, "animatedNormalizedPathSegList", { get: function() { return this.pathSegList; }, enumerable: true });

        // Process any pending mutations to the path element and update the list as needed.
        // This should be the first call of all public functions and is needed because
        // MutationObservers are not synchronous so we can have pending asynchronous mutations.
        SVGPathSegList.prototype._checkPathSynchronizedToList = function() {
            this._updateListFromPathMutations(this._pathElementMutationObserver.takeRecords());
        }

        SVGPathSegList.prototype._updateListFromPathMutations = function(mutationRecords) {
            if (!this._pathElement)
                return;
            var hasPathMutations = false;
            mutationRecords.forEach(function(record) {
                if (record.attributeName == "d")
                    hasPathMutations = true;
            });
            if (hasPathMutations)
                this._list = this._parsePath(this._pathElement.getAttribute("d"));
        }

        // Serialize the list and update the path's 'd' attribute.
        SVGPathSegList.prototype._writeListToPath = function() {
            this._pathElementMutationObserver.disconnect();
            this._pathElement.setAttribute("d", SVGPathSegList._pathSegArrayAsString(this._list));
            this._pathElementMutationObserver.observe(this._pathElement, this._mutationObserverConfig);
        }

        // When a path segment changes the list needs to be synchronized back to the path element.
        SVGPathSegList.prototype.segmentChanged = function(pathSeg) {
            this._writeListToPath();
        }

        SVGPathSegList.prototype.clear = function() {
            this._checkPathSynchronizedToList();

            this._list.forEach(function(pathSeg) {
                pathSeg._owningPathSegList = null;
            });
            this._list = [];
            this._writeListToPath();
        }

        SVGPathSegList.prototype.initialize = function(newItem) {
            this._checkPathSynchronizedToList();

            this._list = [newItem];
            newItem._owningPathSegList = this;
            this._writeListToPath();
            return newItem;
        }

        SVGPathSegList.prototype._checkValidIndex = function(index) {
            if (isNaN(index) || index < 0 || index >= this.numberOfItems)
                throw "INDEX_SIZE_ERR";
        }

        SVGPathSegList.prototype.getItem = function(index) {
            this._checkPathSynchronizedToList();

            this._checkValidIndex(index);
            return this._list[index];
        }

        SVGPathSegList.prototype.insertItemBefore = function(newItem, index) {
            this._checkPathSynchronizedToList();

            // Spec: If the index is greater than or equal to numberOfItems, then the new item is appended to the end of the list.
            if (index > this.numberOfItems)
                index = this.numberOfItems;
            if (newItem._owningPathSegList) {
                // SVG2 spec says to make a copy.
                newItem = newItem.clone();
            }
            this._list.splice(index, 0, newItem);
            newItem._owningPathSegList = this;
            this._writeListToPath();
            return newItem;
        }

        SVGPathSegList.prototype.replaceItem = function(newItem, index) {
            this._checkPathSynchronizedToList();

            if (newItem._owningPathSegList) {
                // SVG2 spec says to make a copy.
                newItem = newItem.clone();
            }
            this._checkValidIndex(index);
            this._list[index] = newItem;
            newItem._owningPathSegList = this;
            this._writeListToPath();
            return newItem;
        }

        SVGPathSegList.prototype.removeItem = function(index) {
            this._checkPathSynchronizedToList();

            this._checkValidIndex(index);
            var item = this._list[index];
            this._list.splice(index, 1);
            this._writeListToPath();
            return item;
        }

        SVGPathSegList.prototype.appendItem = function(newItem) {
            this._checkPathSynchronizedToList();

            if (newItem._owningPathSegList) {
                // SVG2 spec says to make a copy.
                newItem = newItem.clone();
            }
            this._list.push(newItem);
            newItem._owningPathSegList = this;
            // TODO: Optimize this to just append to the existing attribute.
            this._writeListToPath();
            return newItem;
        }

        SVGPathSegList._pathSegArrayAsString = function(pathSegArray) {
            var string = "";
            var first = true;
            pathSegArray.forEach(function(pathSeg) {
                if (first) {
                    first = false;
                    string += pathSeg._asPathString();
                } else {
                    string += " " + pathSeg._asPathString();
                }
            });
            return string;
        }

        // This closely follows SVGPathParser::parsePath from Source/core/svg/SVGPathParser.cpp.
        SVGPathSegList.prototype._parsePath = function(string) {
            if (!string || string.length == 0)
                return [];

            var owningPathSegList = this;

            var Builder = function() {
                this.pathSegList = [];
            }

            Builder.prototype.appendSegment = function(pathSeg) {
                this.pathSegList.push(pathSeg);
            }

            var Source = function(string) {
                this._string = string;
                this._currentIndex = 0;
                this._endIndex = this._string.length;
                this._previousCommand = SVGPathSeg.PATHSEG_UNKNOWN;

                this._skipOptionalSpaces();
            }

            Source.prototype._isCurrentSpace = function() {
                var character = this._string[this._currentIndex];
                return character <= " " && (character == " " || character == "\n" || character == "\t" || character == "\r" || character == "\f");
            }

            Source.prototype._skipOptionalSpaces = function() {
                while (this._currentIndex < this._endIndex && this._isCurrentSpace())
                    this._currentIndex++;
                return this._currentIndex < this._endIndex;
            }

            Source.prototype._skipOptionalSpacesOrDelimiter = function() {
                if (this._currentIndex < this._endIndex && !this._isCurrentSpace() && this._string.charAt(this._currentIndex) != ",")
                    return false;
                if (this._skipOptionalSpaces()) {
                    if (this._currentIndex < this._endIndex && this._string.charAt(this._currentIndex) == ",") {
                        this._currentIndex++;
                        this._skipOptionalSpaces();
                    }
                }
                return this._currentIndex < this._endIndex;
            }

            Source.prototype.hasMoreData = function() {
                return this._currentIndex < this._endIndex;
            }

            Source.prototype.peekSegmentType = function() {
                var lookahead = this._string[this._currentIndex];
                return this._pathSegTypeFromChar(lookahead);
            }

            Source.prototype._pathSegTypeFromChar = function(lookahead) {
                switch (lookahead) {
                case "Z":
                case "z":
                    return SVGPathSeg.PATHSEG_CLOSEPATH;
                case "M":
                    return SVGPathSeg.PATHSEG_MOVETO_ABS;
                case "m":
                    return SVGPathSeg.PATHSEG_MOVETO_REL;
                case "L":
                    return SVGPathSeg.PATHSEG_LINETO_ABS;
                case "l":
                    return SVGPathSeg.PATHSEG_LINETO_REL;
                case "C":
                    return SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS;
                case "c":
                    return SVGPathSeg.PATHSEG_CURVETO_CUBIC_REL;
                case "Q":
                    return SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_ABS;
                case "q":
                    return SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_REL;
                case "A":
                    return SVGPathSeg.PATHSEG_ARC_ABS;
                case "a":
                    return SVGPathSeg.PATHSEG_ARC_REL;
                case "H":
                    return SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_ABS;
                case "h":
                    return SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_REL;
                case "V":
                    return SVGPathSeg.PATHSEG_LINETO_VERTICAL_ABS;
                case "v":
                    return SVGPathSeg.PATHSEG_LINETO_VERTICAL_REL;
                case "S":
                    return SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_ABS;
                case "s":
                    return SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_REL;
                case "T":
                    return SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS;
                case "t":
                    return SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_REL;
                default:
                    return SVGPathSeg.PATHSEG_UNKNOWN;
                }
            }

            Source.prototype._nextCommandHelper = function(lookahead, previousCommand) {
                // Check for remaining coordinates in the current command.
                if ((lookahead == "+" || lookahead == "-" || lookahead == "." || (lookahead >= "0" && lookahead <= "9")) && previousCommand != SVGPathSeg.PATHSEG_CLOSEPATH) {
                    if (previousCommand == SVGPathSeg.PATHSEG_MOVETO_ABS)
                        return SVGPathSeg.PATHSEG_LINETO_ABS;
                    if (previousCommand == SVGPathSeg.PATHSEG_MOVETO_REL)
                        return SVGPathSeg.PATHSEG_LINETO_REL;
                    return previousCommand;
                }
                return SVGPathSeg.PATHSEG_UNKNOWN;
            }

            Source.prototype.initialCommandIsMoveTo = function() {
                // If the path is empty it is still valid, so return true.
                if (!this.hasMoreData())
                    return true;
                var command = this.peekSegmentType();
                // Path must start with moveTo.
                return command == SVGPathSeg.PATHSEG_MOVETO_ABS || command == SVGPathSeg.PATHSEG_MOVETO_REL;
            }

            // Parse a number from an SVG path. This very closely follows genericParseNumber(...) from Source/core/svg/SVGParserUtilities.cpp.
            // Spec: http://www.w3.org/TR/SVG11/single-page.html#paths-PathDataBNF
            Source.prototype._parseNumber = function() {
                var exponent = 0;
                var integer = 0;
                var frac = 1;
                var decimal = 0;
                var sign = 1;
                var expsign = 1;

                var startIndex = this._currentIndex;

                this._skipOptionalSpaces();

                // Read the sign.
                if (this._currentIndex < this._endIndex && this._string.charAt(this._currentIndex) == "+")
                    this._currentIndex++;
                else if (this._currentIndex < this._endIndex && this._string.charAt(this._currentIndex) == "-") {
                    this._currentIndex++;
                    sign = -1;
                }

                if (this._currentIndex == this._endIndex || ((this._string.charAt(this._currentIndex) < "0" || this._string.charAt(this._currentIndex) > "9") && this._string.charAt(this._currentIndex) != "."))
                    // The first character of a number must be one of [0-9+-.].
                    return undefined;

                // Read the integer part, build right-to-left.
                var startIntPartIndex = this._currentIndex;
                while (this._currentIndex < this._endIndex && this._string.charAt(this._currentIndex) >= "0" && this._string.charAt(this._currentIndex) <= "9")
                    this._currentIndex++; // Advance to first non-digit.

                if (this._currentIndex != startIntPartIndex) {
                    var scanIntPartIndex = this._currentIndex - 1;
                    var multiplier = 1;
                    while (scanIntPartIndex >= startIntPartIndex) {
                        integer += multiplier * (this._string.charAt(scanIntPartIndex--) - "0");
                        multiplier *= 10;
                    }
                }

                // Read the decimals.
                if (this._currentIndex < this._endIndex && this._string.charAt(this._currentIndex) == ".") {
                    this._currentIndex++;

                    // There must be a least one digit following the .
                    if (this._currentIndex >= this._endIndex || this._string.charAt(this._currentIndex) < "0" || this._string.charAt(this._currentIndex) > "9")
                        return undefined;
                    while (this._currentIndex < this._endIndex && this._string.charAt(this._currentIndex) >= "0" && this._string.charAt(this._currentIndex) <= "9")
                        decimal += (this._string.charAt(this._currentIndex++) - "0") * (frac *= 0.1);
                }

                // Read the exponent part.
                if (this._currentIndex != startIndex && this._currentIndex + 1 < this._endIndex && (this._string.charAt(this._currentIndex) == "e" || this._string.charAt(this._currentIndex) == "E") && (this._string.charAt(this._currentIndex + 1) != "x" && this._string.charAt(this._currentIndex + 1) != "m")) {
                    this._currentIndex++;

                    // Read the sign of the exponent.
                    if (this._string.charAt(this._currentIndex) == "+") {
                        this._currentIndex++;
                    } else if (this._string.charAt(this._currentIndex) == "-") {
                        this._currentIndex++;
                        expsign = -1;
                    }

                    // There must be an exponent.
                    if (this._currentIndex >= this._endIndex || this._string.charAt(this._currentIndex) < "0" || this._string.charAt(this._currentIndex) > "9")
                        return undefined;

                    while (this._currentIndex < this._endIndex && this._string.charAt(this._currentIndex) >= "0" && this._string.charAt(this._currentIndex) <= "9") {
                        exponent *= 10;
                        exponent += (this._string.charAt(this._currentIndex) - "0");
                        this._currentIndex++;
                    }
                }

                var number = integer + decimal;
                number *= sign;

                if (exponent)
                    number *= Math.pow(10, expsign * exponent);

                if (startIndex == this._currentIndex)
                    return undefined;

                this._skipOptionalSpacesOrDelimiter();

                return number;
            }

            Source.prototype._parseArcFlag = function() {
                if (this._currentIndex >= this._endIndex)
                    return undefined;
                var flag = false;
                var flagChar = this._string.charAt(this._currentIndex++);
                if (flagChar == "0")
                    flag = false;
                else if (flagChar == "1")
                    flag = true;
                else
                    return undefined;

                this._skipOptionalSpacesOrDelimiter();
                return flag;
            }

            Source.prototype.parseSegment = function() {
                var lookahead = this._string[this._currentIndex];
                var command = this._pathSegTypeFromChar(lookahead);
                if (command == SVGPathSeg.PATHSEG_UNKNOWN) {
                    // Possibly an implicit command. Not allowed if this is the first command.
                    if (this._previousCommand == SVGPathSeg.PATHSEG_UNKNOWN)
                        return null;
                    command = this._nextCommandHelper(lookahead, this._previousCommand);
                    if (command == SVGPathSeg.PATHSEG_UNKNOWN)
                        return null;
                } else {
                    this._currentIndex++;
                }

                this._previousCommand = command;

                switch (command) {
                case SVGPathSeg.PATHSEG_MOVETO_REL:
                    return new SVGPathSegMovetoRel(owningPathSegList, this._parseNumber(), this._parseNumber());
                case SVGPathSeg.PATHSEG_MOVETO_ABS:
                    return new SVGPathSegMovetoAbs(owningPathSegList, this._parseNumber(), this._parseNumber());
                case SVGPathSeg.PATHSEG_LINETO_REL:
                    return new SVGPathSegLinetoRel(owningPathSegList, this._parseNumber(), this._parseNumber());
                case SVGPathSeg.PATHSEG_LINETO_ABS:
                    return new SVGPathSegLinetoAbs(owningPathSegList, this._parseNumber(), this._parseNumber());
                case SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_REL:
                    return new SVGPathSegLinetoHorizontalRel(owningPathSegList, this._parseNumber());
                case SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_ABS:
                    return new SVGPathSegLinetoHorizontalAbs(owningPathSegList, this._parseNumber());
                case SVGPathSeg.PATHSEG_LINETO_VERTICAL_REL:
                    return new SVGPathSegLinetoVerticalRel(owningPathSegList, this._parseNumber());
                case SVGPathSeg.PATHSEG_LINETO_VERTICAL_ABS:
                    return new SVGPathSegLinetoVerticalAbs(owningPathSegList, this._parseNumber());
                case SVGPathSeg.PATHSEG_CLOSEPATH:
                    this._skipOptionalSpaces();
                    return new SVGPathSegClosePath(owningPathSegList);
                case SVGPathSeg.PATHSEG_CURVETO_CUBIC_REL:
                    var points = {x1: this._parseNumber(), y1: this._parseNumber(), x2: this._parseNumber(), y2: this._parseNumber(), x: this._parseNumber(), y: this._parseNumber()};
                    return new SVGPathSegCurvetoCubicRel(owningPathSegList, points.x, points.y, points.x1, points.y1, points.x2, points.y2);
                case SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS:
                    var points = {x1: this._parseNumber(), y1: this._parseNumber(), x2: this._parseNumber(), y2: this._parseNumber(), x: this._parseNumber(), y: this._parseNumber()};
                    return new SVGPathSegCurvetoCubicAbs(owningPathSegList, points.x, points.y, points.x1, points.y1, points.x2, points.y2);
                case SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_REL:
                    var points = {x2: this._parseNumber(), y2: this._parseNumber(), x: this._parseNumber(), y: this._parseNumber()};
                    return new SVGPathSegCurvetoCubicSmoothRel(owningPathSegList, points.x, points.y, points.x2, points.y2);
                case SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_ABS:
                    var points = {x2: this._parseNumber(), y2: this._parseNumber(), x: this._parseNumber(), y: this._parseNumber()};
                    return new SVGPathSegCurvetoCubicSmoothAbs(owningPathSegList, points.x, points.y, points.x2, points.y2);
                case SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_REL:
                    var points = {x1: this._parseNumber(), y1: this._parseNumber(), x: this._parseNumber(), y: this._parseNumber()};
                    return new SVGPathSegCurvetoQuadraticRel(owningPathSegList, points.x, points.y, points.x1, points.y1);
                case SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_ABS:
                    var points = {x1: this._parseNumber(), y1: this._parseNumber(), x: this._parseNumber(), y: this._parseNumber()};
                    return new SVGPathSegCurvetoQuadraticAbs(owningPathSegList, points.x, points.y, points.x1, points.y1);
                case SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_REL:
                    return new SVGPathSegCurvetoQuadraticSmoothRel(owningPathSegList, this._parseNumber(), this._parseNumber());
                case SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS:
                    return new SVGPathSegCurvetoQuadraticSmoothAbs(owningPathSegList, this._parseNumber(), this._parseNumber());
                case SVGPathSeg.PATHSEG_ARC_REL:
                    var points = {x1: this._parseNumber(), y1: this._parseNumber(), arcAngle: this._parseNumber(), arcLarge: this._parseArcFlag(), arcSweep: this._parseArcFlag(), x: this._parseNumber(), y: this._parseNumber()};
                    return new SVGPathSegArcRel(owningPathSegList, points.x, points.y, points.x1, points.y1, points.arcAngle, points.arcLarge, points.arcSweep);
                case SVGPathSeg.PATHSEG_ARC_ABS:
                    var points = {x1: this._parseNumber(), y1: this._parseNumber(), arcAngle: this._parseNumber(), arcLarge: this._parseArcFlag(), arcSweep: this._parseArcFlag(), x: this._parseNumber(), y: this._parseNumber()};
                    return new SVGPathSegArcAbs(owningPathSegList, points.x, points.y, points.x1, points.y1, points.arcAngle, points.arcLarge, points.arcSweep);
                default:
                    throw "Unknown path seg type."
                }
            }

            var builder = new Builder();
            var source = new Source(string);

            if (!source.initialCommandIsMoveTo())
                return [];
            while (source.hasMoreData()) {
                var pathSeg = source.parseSegment();
                if (!pathSeg)
                    return [];
                builder.appendSegment(pathSeg);
            }

            return builder.pathSegList;
        }
    }
}());


},{}],27:[function(require,module,exports){
var structuredClone = require('./structured-clone');
var HELLO_INTERVAL_LENGTH = 200;
var HELLO_TIMEOUT_LENGTH = 60000;

function IFrameEndpoint() {
  var parentOrigin;
  var listeners = {};
  var isInitialized = false;
  var connected = false;
  var postMessageQueue = [];
  var helloInterval;

  function postToTarget(message, target) {
    // See http://dev.opera.com/articles/view/window-postmessage-messagechannel/#crossdoc
    //     https://github.com/Modernizr/Modernizr/issues/388
    //     http://jsfiddle.net/ryanseddon/uZTgD/2/
    if (structuredClone.supported()) {
      window.parent.postMessage(message, target);
    } else {
      window.parent.postMessage(JSON.stringify(message), target);
    }
  }

  function post(type, content) {
    var message;
    // Message object can be constructed from 'type' and 'content' arguments or it can be passed
    // as the first argument.
    if (arguments.length === 1 && typeof type === 'object' && typeof type.type === 'string') {
      message = type;
    } else {
      message = {
        type: type,
        content: content
      };
    }
    if (connected) {
      postToTarget(message, parentOrigin);
    } else {
      postMessageQueue.push(message);
    }
  }

  // Only the initial 'hello' message goes permissively to a '*' target (because due to cross origin
  // restrictions we can't find out our parent's origin until they voluntarily send us a message
  // with it.)
  function postHello() {
    postToTarget({
      type: 'hello',
      origin: document.location.href.match(/(.*?\/\/.*?)\//)[1]
    }, '*');
  }

  function addListener(type, fn) {
    listeners[type] = fn;
  }

  function removeAllListeners() {
    listeners = {};
  }

  function getListenerNames() {
    return Object.keys(listeners);
  }

  function messageListener(message) {
      // Anyone can send us a message. Only pay attention to messages from parent.
      if (message.source !== window.parent) return;

      var messageData = message.data;

      if (typeof messageData === 'string') messageData = JSON.parse(messageData);

      // We don't know origin property of parent window until it tells us.
      if (!connected && messageData.type === 'hello') {
        // This is the return handshake from the embedding window.
        parentOrigin = messageData.origin;
        connected = true;
        stopPostingHello();
        while(postMessageQueue.length > 0) {
          post(postMessageQueue.shift());
        }
      }

      // Perhaps-redundantly insist on checking origin as well as source window of message.
      if (message.origin === parentOrigin) {
        if (listeners[messageData.type]) listeners[messageData.type](messageData.content);
      }
   }

   function disconnect() {
     connected = false;
     stopPostingHello();
     window.removeEventListener('message', messsageListener);
   }

  /**
    Initialize communication with the parent frame. This should not be called until the app's custom
    listeners are registered (via our 'addListener' public method) because, once we open the
    communication, the parent window may send any messages it may have queued. Messages for which
    we don't have handlers will be silently ignored.
  */
  function initialize() {
    if (isInitialized) {
      return;
    }
    isInitialized = true;
    if (window.parent === window) return;

    // We kick off communication with the parent window by sending a "hello" message. Then we wait
    // for a handshake (another "hello" message) from the parent window.
    postHello();
    startPostingHello();
    window.addEventListener('message', messageListener, false);
  }

  function startPostingHello() {
    if (helloInterval) {
      stopPostingHello();
    }
    helloInterval = window.setInterval(postHello, HELLO_INTERVAL_LENGTH);
    window.setTimeout(stopPostingHello, HELLO_TIMEOUT_LENGTH);
  }

  function stopPostingHello() {
    window.clearInterval(helloInterval);
    helloInterval = null;
  }

  // Public API.
  return {
    initialize        : initialize,
    getListenerNames  : getListenerNames,
    addListener       : addListener,
    removeAllListeners: removeAllListeners,
    disconnect        : disconnect,
    post              : post
  };
}

var instance = null;

// IFrameEndpoint is a singleton, as iframe can't have multiple parents anyway.
module.exports = function getIFrameEndpoint() {
  if (!instance) {
    instance = new IFrameEndpoint();
  }
  return instance;
};
},{"./structured-clone":30}],28:[function(require,module,exports){
"use strict";

var ParentEndpoint = require('./parent-endpoint');
var getIFrameEndpoint = require('./iframe-endpoint');

// Not a real UUID as there's an RFC for that (needed for proper distributed computing).
// But in this fairly parochial situation, we just need to be fairly sure to avoid repeats.
function getPseudoUUID() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var len = chars.length;
    var ret = [];

    for (var i = 0; i < 10; i++) {
        ret.push(chars[Math.floor(Math.random() * len)]);
    }
    return ret.join('');
}

module.exports = function IframePhoneRpcEndpoint(handler, namespace, targetWindow, targetOrigin, phone) {
    var pendingCallbacks = Object.create({});

    // if it's a non-null object, rather than a function, 'handler' is really an options object
    if (handler && typeof handler === 'object') {
        namespace = handler.namespace;
        targetWindow = handler.targetWindow;
        targetOrigin = handler.targetOrigin;
        phone = handler.phone;
        handler = handler.handler;
    }

    if ( ! phone ) {
        if (targetWindow === window.parent) {
            phone = getIFrameEndpoint();
            phone.initialize();
        } else {
            phone = new ParentEndpoint(targetWindow, targetOrigin);
        }
    }

    phone.addListener(namespace, function(message) {
        var callbackObj;

        if (message.messageType === 'call' && typeof this.handler === 'function') {
            this.handler.call(undefined, message.value, function(returnValue) {
                phone.post(namespace, {
                    messageType: 'returnValue',
                    uuid: message.uuid,
                    value: returnValue
                });
            });
        } else if (message.messageType === 'returnValue') {
            callbackObj = pendingCallbacks[message.uuid];

            if (callbackObj) {
                window.clearTimeout(callbackObj.timeout);
                if (callbackObj.callback) {
                    callbackObj.callback.call(undefined, message.value);
                }
                pendingCallbacks[message.uuid] = null;
            }
        }
    }.bind(this));

    function call(message, callback) {
        var uuid = getPseudoUUID();

        pendingCallbacks[uuid] = {
            callback: callback,
            timeout: window.setTimeout(function() {
                if (callback) {
                    callback(undefined, new Error("IframePhone timed out waiting for reply"));
                }
            }, 2000)
        };

        phone.post(namespace, {
            messageType: 'call',
            uuid: uuid,
            value: message
        });
    }

    function disconnect() {
        phone.disconnect();
    }

    this.handler = handler;
    this.call = call.bind(this);
    this.disconnect = disconnect.bind(this);
};

},{"./iframe-endpoint":27,"./parent-endpoint":29}],29:[function(require,module,exports){
var structuredClone = require('./structured-clone');

/**
  Call as:
    new ParentEndpoint(targetWindow, targetOrigin, afterConnectedCallback)
      targetWindow is a WindowProxy object. (Messages will be sent to it)

      targetOrigin is the origin of the targetWindow. (Messages will be restricted to this origin)

      afterConnectedCallback is an optional callback function to be called when the connection is
        established.

  OR (less secure):
    new ParentEndpoint(targetIframe, afterConnectedCallback)

      targetIframe is a DOM object (HTMLIframeElement); messages will be sent to its contentWindow.

      afterConnectedCallback is an optional callback function

    In this latter case, targetOrigin will be inferred from the value of the src attribute of the
    provided DOM object at the time of the constructor invocation. This is less secure because the
    iframe might have been navigated to an unexpected domain before constructor invocation.

  Note that it is important to specify the expected origin of the iframe's content to safeguard
  against sending messages to an unexpected domain. This might happen if our iframe is navigated to
  a third-party URL unexpectedly. Furthermore, having a reference to Window object (as in the first
  form of the constructor) does not protect against sending a message to the wrong domain. The
  window object is actualy a WindowProxy which transparently proxies the Window object of the
  underlying iframe, so that when the iframe is navigated, the "same" WindowProxy now references a
  completely differeent Window object, possibly controlled by a hostile domain.

  See http://www.esdiscuss.org/topic/a-dom-use-case-that-can-t-be-emulated-with-direct-proxies for
  more about this weird behavior of WindowProxies (the type returned by <iframe>.contentWindow).
*/

module.exports = function ParentEndpoint(targetWindowOrIframeEl, targetOrigin, afterConnectedCallback) {
  var selfOrigin = window.location.href.match(/(.*?\/\/.*?)\//)[1];
  var postMessageQueue = [];
  var connected = false;
  var handlers = {};
  var targetWindowIsIframeElement;

  function getOrigin(iframe) {
    return iframe.src.match(/(.*?\/\/.*?)\//)[1];
  }

  function post(type, content) {
    var message;
    // Message object can be constructed from 'type' and 'content' arguments or it can be passed
    // as the first argument.
    if (arguments.length === 1 && typeof type === 'object' && typeof type.type === 'string') {
      message = type;
    } else {
      message = {
        type: type,
        content: content
      };
    }
    if (connected) {
      var tWindow = getTargetWindow();
      // if we are laready connected ... send the message
      message.origin = selfOrigin;
      // See http://dev.opera.com/articles/view/window-postmessage-messagechannel/#crossdoc
      //     https://github.com/Modernizr/Modernizr/issues/388
      //     http://jsfiddle.net/ryanseddon/uZTgD/2/
      if (structuredClone.supported()) {
        tWindow.postMessage(message, targetOrigin);
      } else {
        tWindow.postMessage(JSON.stringify(message), targetOrigin);
      }
    } else {
      // else queue up the messages to send after connection complete.
      postMessageQueue.push(message);
    }
  }

  function addListener(messageName, func) {
    handlers[messageName] = func;
  }

  function removeListener(messageName) {
    handlers[messageName] = null;
  }

  // Note that this function can't be used when IFrame element hasn't been added to DOM yet
  // (.contentWindow would be null). At the moment risk is purely theoretical, as the parent endpoint
  // only listens for an incoming 'hello' message and the first time we call this function
  // is in #receiveMessage handler (so iframe had to be initialized before, as it could send 'hello').
  // It would become important when we decide to refactor the way how communication is initialized.
  function getTargetWindow() {
    if (targetWindowIsIframeElement) {
      var tWindow = targetWindowOrIframeEl.contentWindow;
      if (!tWindow) {
        throw "IFrame element needs to be added to DOM before communication " +
              "can be started (.contentWindow is not available)";
      }
      return tWindow;
    }
    return targetWindowOrIframeEl;
  }

  function receiveMessage(message) {
    var messageData;
    if (message.source === getTargetWindow() && message.origin === targetOrigin) {
      messageData = message.data;
      if (typeof messageData === 'string') {
        messageData = JSON.parse(messageData);
      }
      if (handlers[messageData.type]) {
        handlers[messageData.type](messageData.content);
      } else {
        console.log("cant handle type: " + messageData.type);
      }
    }
  }

  function disconnect() {
    connected = false;
    window.removeEventListener('message', receiveMessage);
  }

  // handle the case that targetWindowOrIframeEl is actually an <iframe> rather than a Window(Proxy) object
  // Note that if it *is* a WindowProxy, this probe will throw a SecurityException, but in that case
  // we also don't need to do anything
  try {
    targetWindowIsIframeElement = targetWindowOrIframeEl.constructor === HTMLIFrameElement;
  } catch (e) {
    targetWindowIsIframeElement = false;
  }

  if (targetWindowIsIframeElement) {
    // Infer the origin ONLY if the user did not supply an explicit origin, i.e., if the second
    // argument is empty or is actually a callback (meaning it is supposed to be the
    // afterConnectionCallback)
    if (!targetOrigin || targetOrigin.constructor === Function) {
      afterConnectedCallback = targetOrigin;
      targetOrigin = getOrigin(targetWindowOrIframeEl);
    }
  }

  // when we receive 'hello':
  addListener('hello', function() {
    connected = true;

    // send hello response
    post('hello');

    // give the user a chance to do things now that we are connected
    // note that is will happen before any queued messages
    if (afterConnectedCallback && typeof afterConnectedCallback === "function") {
      afterConnectedCallback();
    }

    // Now send any messages that have been queued up ...
    while(postMessageQueue.length > 0) {
      post(postMessageQueue.shift());
    }
  });

  window.addEventListener('message', receiveMessage, false);

  // Public API.
  return {
    post: post,
    addListener: addListener,
    removeListener: removeListener,
    disconnect: disconnect,
    getTargetWindow: getTargetWindow,
    targetOrigin: targetOrigin
  };
};

},{"./structured-clone":30}],30:[function(require,module,exports){
var featureSupported = false;

(function () {
  var result = 0;

  if (!!window.postMessage) {
    try {
      // Safari 5.1 will sometimes throw an exception and sometimes won't, lolwut?
      // When it doesn't we capture the message event and check the
      // internal [[Class]] property of the message being passed through.
      // Safari will pass through DOM nodes as Null iOS safari on the other hand
      // passes it through as DOMWindow, gotcha.
      window.onmessage = function(e){
        var type = Object.prototype.toString.call(e.data);
        result = (type.indexOf("Null") != -1 || type.indexOf("DOMWindow") != -1) ? 1 : 0;
        featureSupported = {
          'structuredClones': result
        };
      };
      // Spec states you can't transmit DOM nodes and it will throw an error
      // postMessage implimentations that support cloned data will throw.
      window.postMessage(document.createElement("a"),"*");
    } catch(e) {
      // BBOS6 throws but doesn't pass through the correct exception
      // so check error message
      result = (e.DATA_CLONE_ERR || e.message == "Cannot post cyclic structures.") ? 1 : 0;
      featureSupported = {
        'structuredClones': result
      };
    }
  }
}());

exports.supported = function supported() {
  return featureSupported && featureSupported.structuredClones > 0;
};

},{}],31:[function(require,module,exports){
module.exports = {
  /**
   * Allows to communicate with an iframe.
   */
  ParentEndpoint:  require('./lib/parent-endpoint'),
  /**
   * Allows to communicate with a parent page.
   * IFrameEndpoint is a singleton, as iframe can't have multiple parents anyway.
   */
  getIFrameEndpoint: require('./lib/iframe-endpoint'),
  structuredClone: require('./lib/structured-clone'),

  // TODO: May be misnamed
  IframePhoneRpcEndpoint: require('./lib/iframe-phone-rpc-endpoint')

};

},{"./lib/iframe-endpoint":27,"./lib/iframe-phone-rpc-endpoint":28,"./lib/parent-endpoint":29,"./lib/structured-clone":30}]},{},[1]);
