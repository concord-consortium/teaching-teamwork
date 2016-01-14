(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var App = React.createFactory(require('./views/app'));
React.render(App({}), document.getElementById('content'));




},{"./views/app":10}],2:[function(require,module,exports){
module.exports = {
  modelsBase: "activities/"
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


},{"./user":5}],4:[function(require,module,exports){
var logManagerUrl    = 'http://teaching-teamwork-log-manager.herokuapp.com/api/logs',
    xhrObserver      = require('../data/xhrObserver'),
    activityName,
    session,
    username,
    groupname,
    client,
    logEventListeners,
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
      var request = xhrObserver.createObservedXMLHttpRequest();
      request.repeatablePost(logManagerUrl, 'application/json; charset=UTF-8', JSON.stringify(data));
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
    };

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
    sparks.logController.addListener(function(evt) {
      logEvent(evt.name, null, evt.value);
    });
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


},{"../data/xhrObserver":9}],5:[function(require,module,exports){
var UserRegistrationView = require('../views/userRegistration.jsx'),
    groups = require('../data/group-names'),
    logController = require('./log'),
    userController,
    numClients,
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
    serverSkew;

// scratch
var fbUrlDomain = 'https://teaching-teamwork.firebaseio.com/';
var fbUrlBase = fbUrlDomain + 'dev/';

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
    userName = '';

    // GET GROUP NAME AND USER NAME FROM LARA SESSION
    // GET REAL USERNAME FROM LARA
    // LOG ALL

    if (numClients > 1) {
      UserRegistrationView.open(this, {form: "groupname", numClients: numClients});
    }
  },

  checkGroupName: function(groupName) {
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

      if (!userName) {
        if (!users) {
          userName = members[0];
        } else {
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
      // remove any users who haven't pinged in 5 seconds from the list,
      // opening the slot up to another user
      for (var user in users) {
        if (!users.hasOwnProperty(user)) {
          continue;
        }
        var age = Math.floor(Date.now()/1000) - users[user].lastAction;
        if (age > 5) {
          firebaseUsersRef.child(user).remove();
          delete users[user];
        }
      }

      if (userName && (!users || Object.keys(users).length) < numClients) {
        firebaseUsersRef.child(userName).set({lastAction: Math.floor(Date.now()/1000)});
        self.startPinging();
      }

      UserRegistrationView.open(self, {form: "groupconfirm", users: users, userName: userName});
    });

    logController.logEvent("Started to join group", groupName);
  },

  rejectGroupName: function() {
    this.stopPinging();
    // clean up
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
    });
    UserRegistrationView.open(this, {form: "groupname"});

    logController.logEvent("Rejected Group", groupName);
  },

  setGroupName: function(groupName) {
    var self = this;

    firebaseUsersRef.off("value", groupUsersListener);

    logController.setGroupName(groupName);

    notifyGroupRefCreation();

    // annoyingly we have to get out of this before the off() call is finalized
    setTimeout(function(){
      boardsSelectionListener = firebaseUsersRef.on("value", function(snapshot) {
        var users = snapshot.val();

        // remove any users who haven't pinged in 5 seconds from the list,
        // opening the slot up to another user
        for (var user in users) {
          if (!users.hasOwnProperty(user)) {
            continue;
          }
          var age = Math.floor(Date.now()/1000) - users[user].lastAction;
          if (age > 5) {
            firebaseUsersRef.child(user).remove();
          }
        }
        UserRegistrationView.open(self, {form: "selectboard", numClients: numClients, users: users, userName: userName});
      });
    }, 1);
  },

  selectClient: function(_client) {
    client = _client;
    firebaseUsersRef.child(userName).set({client: client, lastAction: Math.floor(Date.now()/1000)});
  },

  selectedClient: function() {
    firebaseUsersRef.off("value");
    UserRegistrationView.close();
    callback(client);
  },

  // ping firebase every second so we show we're still an active member of the group.
  startPinging: function() {
    this.ping = setInterval(function() {
      firebaseUsersRef.child(userName).child("lastAction").set(Math.floor(Date.now()/1000));
    }, 1000);
  },

  stopPinging: function() {
    if (this.ping) {
      clearInterval(this.ping);
    }
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


},{"../data/group-names":6,"../views/userRegistration.jsx":19,"./log":4}],6:[function(require,module,exports){
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
      "Cherry", "Plum", "Grape"
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
];


},{}],7:[function(require,module,exports){
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
  }
};

module.exports = WorkbenchAdaptor;


},{}],8:[function(require,module,exports){
var eventsController = require('../controllers/events'),
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
    wa.updateClient(client, snapshot.val(), false);
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


},{"../controllers/events":3}],9:[function(require,module,exports){
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


},{}],10:[function(require,module,exports){
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








},{"../config":2,"../controllers/events":3,"../controllers/log":4,"../controllers/user":5,"../data/workbenchAdaptor":7,"../data/workbenchFBConnector":8,"./page.jsx":16,"./view-other-circuit":20}],11:[function(require,module,exports){
// adapted from http://thecodeplayer.com/walkthrough/javascript-css3-calculator
/*jslint evil: true */

var logController = require('../controllers/log');

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


},{"../controllers/log":4}],12:[function(require,module,exports){
var xhrObserver = require('../data/xhrObserver');
var logController = require('../controllers/log');

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


},{"../controllers/log":4,"../data/xhrObserver":9}],13:[function(require,module,exports){
/* global FirebaseSimpleLogin: false */
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

  getAuthClient: function (callback) {
    var self = this;
    this.authClient = this.authClient || new FirebaseSimpleLogin(this.firebase, function(error, user) {
      var atPos = user && user.email ? user.email.indexOf('@') : 0,
          username = atPos ? user.email.substr(0, atPos) : null;
      if (error) {
        alert(error);
      }
      self.setState({
        user: user,
        username: username,
        remoteUrl: self.getRemoteUrl(self.state.filename)
      });
      if (callback) {
        callback(error, user);
      }
    });
    return this.authClient;
  },

  login: function (email, password) {
    var saveLogin = function (error) {
          if (!error) {
            localStorage.setItem(loginKey, JSON.stringify({
              email: email,
              password: password
            }));
          }
        };

    email = email || prompt('Email?');
    password = password || (email ? prompt('Password?') : null);

    if (email && password) {
      this.getAuthClient(saveLogin).login("password", {
        email: email,
        password: password
      });
    }
  },

  logout: function () {
    if (confirm('Are you sure you want to logout?')) {
      this.getAuthClient().logout();
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
      div({style: {float: 'right'}}, this.props.user ? (this.props.user.email + ' (' + this.props.username + ')') : null)
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
    this.editor = CodeMirror.fromTextArea(this.refs.editor.getDOMNode(), {
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
      var input = this.refs.fileinput.getDOMNode();
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
    var filename = this.refs.fileinput.getDOMNode().value.replace(/^\s+|\s+$/g, '');
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
    this.refs.fileinput.getDOMNode().value = filename;
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




},{}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
var config = require('../config'),
    logController = require('../controllers/log'),
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

      return React.render(Popup({
        circuit: props.circuit,
        activityName: props.activityName,
        groupName: props.groupName,
        numClients: props.numClients,
        buttonClicked: closePopup,
        ttWorkbench: props.ttWorkbench
      }), $anchor.get(0));
    },

    closePopup: function () {
      var $anchor = $('#other-circuits-popup');
      React.unmountComponentAtNode($anchor.get(0));
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
    var iframe = this.refs.iframe.getDOMNode(),
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
    return React.DOM.iframe({ref: 'iframe', src: '?view-other-circuit!', style: {width: 800, height: 500}}, 'Loading...');
  }
}));

ScaledIFrame = React.createFactory(React.createClass({
  displayName: 'OtherCircuitsScaledIFrame',

  shouldComponentUpdate: function () {
    return false;
  },

  componentDidMount: function () {
    var iframe = this.refs.iframe.getDOMNode(),
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
          width: 800,
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
    var context = this.refs.imageLayer.getDOMNode().getContext('2d'),
        image = new Image(),
        self = this;

    image.src = /^https?:\/\//.test(this.imageInfo.image) ? this.imageInfo.image : config.modelsBase + this.imageInfo.image;
    image.onload = function () {
      context.drawImage(image, 0, 0);
      self.drawClickLayer();
    };
  },

  drawClickLayer: function () {
    var canvas = this.refs.clickLayer.getDOMNode(),
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
    var canvas = this.refs.clickLayer.getDOMNode(),
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
      iframes.push(React.DOM.div({key: i, style: iframeStyle}, ScaledIFrame({scale: breadboard.width / 800, circuit: i + 1, activityName: this.props.activityName, groupName: this.props.groupName, ttWorkbench: this.props.ttWorkbench})));
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


},{"../config":2,"../controllers/log":4}],16:[function(require,module,exports){
var userController = require('../controllers/user'),
    SidebarChatView = require('./sidebar-chat.jsx'),
    CalculatorView = require('./calculator.jsx'),
    NotesView = require('./notes'),
    ConnectionView = require('./connection.jsx'),
    EditorView = require('./editor'),
    SubmitButtonView = require('./submitButton'),
    OtherCircuitsView = require('./other-circuits'),
    config = require('../config');

module.exports = React.createClass({

  displayName: 'Page',

  render: function() {
    var activity = this.props.activity ? this.props.activity : {},
        activityName = activity.name ? ': ' + activity.name : '',
        hasMultipleClients = activity.clients && (activity.clients.length > 1),
        username = userController.getUsername(),
        groupname = userController.getGroupname(),
        circuit = hasMultipleClients && this.props.circuit ? (React.createElement("h2", null, "Circuit ",  this.props.circuit,  username ? ' (User: ' + username : '',  groupname ? ', Group: ' + groupname + ')': ')')) : null,
        notes = this.props.client ? (this.props.client.notes || "") : "",
        connection = React.createElement(ConnectionView, null),
        editor = this.props.showEditor ? (React.createElement(EditorView, {parseAndStartActivity:  this.props.parseAndStartActivity, editorState:  this.props.editorState})) : null,
        wrapperClass = hasMultipleClients ? 'multiple-clients' : null,
        image = activity.image ? (React.createElement("div", {id: "image-wrapper", className:  wrapperClass }, React.createElement("img", {src:  /^https?:\/\//.test(activity.image) ? activity.image : config.modelsBase + activity.image}))) : null,
        submitButton = this.props.showSubmit && this.props.circuit ? (React.createElement(SubmitButtonView, {label: hasMultipleClients ? 'We got it!' : "I got it!", goals:  this.props.goals, nextActivity:  this.props.nextActivity})) : null,
        otherCircuitsButton = hasMultipleClients && this.props.circuit ? (React.createElement(OtherCircuitsView, {circuit:  this.props.circuit, numClients:  activity.clients.length, activityName:  this.props.activityName, groupName:  userController.getGroupname(), ttWorkbench:  this.props.ttWorkbench})) : null;

    return (
      React.createElement("div", {className: "tt-page"}, 
        React.createElement("h1", null, "Teaching Teamwork",  activityName ), 
         circuit, 
        React.createElement("div", {id: "top-button-wrapper"}, 
           submitButton, 
           otherCircuitsButton 
        ), 
        React.createElement("div", {id: "notes-wrapper", className:  wrapperClass }, React.createElement(NotesView, {text:  notes, className: "tt-notes", breadboard:  this.props.breadboard})), 
        React.createElement("div", {id: "breadboard-and-chat-wrapper", className:  wrapperClass }, 
           hasMultipleClients ? (React.createElement("div", {id: "sidebar-chat-wrapper", className:  wrapperClass }, React.createElement(SidebarChatView, React.__spread({},  activity)))) : null, 
          React.createElement("div", {id: "breadboard-wrapper", className:  wrapperClass })
        ), 
         image, 
        React.createElement(CalculatorView, null), 
         connection, 
         editor 
      )
    );
  }
});


},{"../config":2,"../controllers/user":5,"./calculator.jsx":11,"./connection.jsx":12,"./editor":13,"./notes":14,"./other-circuits":15,"./sidebar-chat.jsx":17,"./submitButton":18}],17:[function(require,module,exports){
var userController = require('../controllers/user'),
    logController = require('../controllers/log'),
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

    return {items: items};
  },

  componentWillMount: function() {
    var self = this;
    userController.onGroupRefCreation(function() {
      self.firebaseRef = userController.getFirebaseGroupRef().child("chat");
      self.firebaseRef.on("child_added", function(dataSnapshot) {
        var items = self.state.items.slice(0);
        items.push(dataSnapshot.val());
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
    var input = this.refs.text.getDOMNode(),
        message = input.value;
    e.preventDefault();
    this.firebaseRef.push({
      user: userController.getUsername(),
      message: message
    });
    input.value = '';
    input.focus();
    logController.logEvent("Sent message", message);
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
      var items = this.refs.items ? this.refs.items.getDOMNode() : null;
      if (items) {
        items.scrollTop = items.scrollHeight;
      }
    }
  },

  render: function () {
    var user = userController.getUsername();
    return React.createElement("div", {ref: "items", className: "sidebar-chat-items"}, 
      this.props.items.map(function(item, i) {
        return React.createElement(ChatItem, {key:  i, item:  item, me:  item.user == user});
      })
    );
  }
});

ChatItem = React.createClass({
  displayName: 'ChatItem',

  render: function () {
    return React.createElement("div", {className:  this.props.me ? 'chat-item chat-item-me' : 'chat-item chat-item-others'}, 
        React.createElement("b", null,  this.props.item.prefix || (this.props.item.user + ':') ), " ",  this.props.item.message
      );
  }
});



},{"../controllers/log":4,"../controllers/user":5}],18:[function(require,module,exports){
var userController = require('../controllers/user'),
    logController = require('../controllers/log'),
    SubmitButton, Popup;

module.exports = SubmitButton = React.createClass({

  displayName: 'SubmitButton',

  getInitialState: function () {
    return {
      submitted: null,
      allCorrect: false,
      goalValues: {},
      closePopup: false,
      nextActivity: this.props.nextActivity
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

    // if in solo mode then just populate the table
    if (!this.submitRef) {
      this.getPopupData(function (table, allCorrect) {
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
    logController.logEvent("Submit clicked", username);
  },

  popupButtonClicked: function () {
    logController.logEvent("Submit close button clicked", this.state.allCorrect ? 'done' : 'resume');

    if (this.state.allCorrect) {
      window.location = 'http://concord.org/projects/teaching-teamwork/activities2';
    }
    else {
      this.setState({closePopup: true});
    }
  },

  statics: {
    showPopup: function(props, multipleClients, buttonClicked) {
      var $anchor = $('#submit-popup'),
          closePopup = function (e) {
            e.preventDefault();
            SubmitButton.closePopup();
            buttonClicked();
          };

      if (!$anchor.length) {
        $anchor = $('<div id="submit-popup" class="modalDialog"></div>').appendTo('body');
      }

      setTimeout(function() {
        $anchor[0].style.opacity = 1;
      }, 100);

      return React.render(Popup({
        table: props.table,
        waiting: props.waiting,
        allCorrect: props.allCorrect,
        nextActivity: props.nextActivity,
        multipleClients: multipleClients,
        buttonClicked: closePopup,
      }), $anchor.get(0));
    },

    closePopup: function () {
      var $anchor = $('#submit-popup');
      React.unmountComponentAtNode($anchor.get(0));
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

  render: function () {
    var circuitRows = [],
      th = React.DOM.th,
      td = React.DOM.td,
      i, row, title, label;

    circuitRows.push(React.DOM.tr({key: 'header'},
      this.props.multipleClients ? th({}, 'Circuit') : null,
      th({}, 'Goal'),
      th({}, 'Goal Value'),
      th({}, 'Measured Value'),
      th({}, 'Correct')
    ));

    for (i = 0; i < this.props.table.length; i++) {
      row = this.props.table[i];
      circuitRows.push(React.DOM.tr({key: i},
        this.props.multipleClients ? td({}, row.client + 1) : null,
        td({}, row.goal),
        td({}, row.goalValue),
        td({}, row.currentValue),
        td({className: row.correctClass}, row.correct)
      ));
    }

    if (this.props.allCorrect) {
      title = 'All Goals Are Correct!';
      label = this.props.nextActivity ? this.props.nextActivity : 'All Done!';
    }
    else {
      title = 'Some Goals Have Not Been Met';
      label = 'Keep Trying...';
    }

    return React.DOM.div({className: 'submit-button-popup'},
      React.DOM.h1({}, title),
      (this.props.allCorrect ? React.DOM.table({}, React.DOM.tbody({}, circuitRows)) : React.DOM.p({}, (this.props.multipleClients ? "At least one of your team's voltage drops doesn't match that player's goal. Try again." : "At least one of your voltage drops doesn't match the goal. Try again."))),
      React.DOM.button({onClick: this.props.buttonClicked}, label)
    );
  }
}));


},{"../controllers/log":4,"../controllers/user":5}],19:[function(require,module,exports){
var userController, UserRegistrationView,
    groups = require('../data/group-names');

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

      return React.render(
        React.createElement(UserRegistrationView, React.__spread({},  data)),
        $anchor.get(0)
      );
    },

    // close a dialog
    close: function() {
      React.unmountComponentAtNode($('#user-registration').get(0));
      $('#user-registration').remove();
    }
  },
  getInitialState: function() {
    var groupName = groups[0].name;
    return {
      groupName: groupName
    };
  },
  handleGroupNameChange: function(event) {
    this.setState({groupName: event.target.value});
  },
  handleSubmit: function(e) {
    e.preventDefault();
    if (this.props.form == "groupname") {
      userController.checkGroupName(this.state.groupName);
    }
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
  selectInput: function () {
  },
  componentDidMount: function () {
    var self = this,
        focusAndSelect = function (ref) {
          var node = self.refs[ref] ? self.refs[ref].getDOMNode() : null;
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
    if (this.props.form == 'groupname' || !this.state.groupName) {
      var groupOptions = groups.map(function(group, i) {
        return (React.createElement("option", {key: i, value: group.name}, group.name));
      });
      form = (
        React.createElement("div", null, 
          React.createElement("h3", null, "Welcome!"), 
          React.createElement("div", null, 
            "This activity requires a team of ", this.props.numClients, " users."
          ), 
          React.createElement("h3", null, "Please select your group:"), 
          React.createElement("label", null, 
            React.createElement("select", {value: this.state.groupName, onChange:  this.handleGroupNameChange}, 
               groupOptions 
            ), 
            React.createElement("button", {onClick:  this.handleSubmit}, "Select")
          )
        )
      );
    } else if (this.props.form == 'groupconfirm') {
      if (!this.props.userName) {
        var numUsers = Object.keys(this.props.users).length;
        form = (
          React.createElement("div", null, 
            React.createElement("h3", null, "Group name: ",  this.state.groupName), 
            React.createElement("div", null, 
              "There are already ", numUsers, " in this group."
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
            React.createElement("label", null, " "), 
            React.createElement("span", null, "Do you want to ",  joinStr, " this group?"), 
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
            React.createElement("input", {type: "radio", name: "clientSelection", defaultChecked:  selected, value:  i, onClick:  this.handleClientSelection}), "Circuit ",  i+1, " (",  userSpan, ")"
          ) );
      }

      form = (
        React.createElement("div", null, 
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


},{"../data/group-names":6}],20:[function(require,module,exports){
var userController       = require('../controllers/user'),
    WorkbenchAdaptor     = require('../data/workbenchAdaptor'),
    WorkbenchFBConnector = require('../data/workbenchFBConnector');

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








},{"../controllers/user":5,"../data/workbenchAdaptor":7,"../data/workbenchFBConnector":8}]},{},[1]);
