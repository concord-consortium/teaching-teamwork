(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var AppView = React.createFactory(require('./views/logic-gates/app'));
ReactDOM.render(AppView({}), document.getElementById('content'));


},{"./views/logic-gates/app":16}],2:[function(require,module,exports){
var userController = require('../shared/user');

var BoardWatcher = function () {
  this.firebase = null;
  this.listeners = {};
};
BoardWatcher.prototype.startListeners = function () {
  var self = this,
      listenerCallbackFn = function (boardNumber) {
        return function (snapshot) {
          var i;
          if (self.listeners[boardNumber]) {
            for (i = 0; i < self.listeners[boardNumber].length; i++) {
              self.listeners[boardNumber][i].listener(self.listeners[boardNumber][i].board, snapshot.val());
            }
          }
        };
      };

  this.firebase = userController.getFirebaseGroupRef().child('clients');
  this.firebase.child(0).on('value', listenerCallbackFn(0));
  this.firebase.child(1).on('value', listenerCallbackFn(1));
  this.firebase.child(2).on('value', listenerCallbackFn(2));
};
BoardWatcher.prototype.movedProbe = function (board, probeInfo) {
  this.firebase.child(board.number).child('probe').set(probeInfo);
};
BoardWatcher.prototype.pushedButton = function (board, buttonValue) {
  this.firebase.child(board.number).child('button').set(buttonValue);
};
BoardWatcher.prototype.circuitChanged = function (board) {
  this.firebase.child(board.number).child('wires').set(board.serializeWiresToArray());
  this.firebase.child(board.number).child('components').set(board.serializeComponents());
};
BoardWatcher.prototype.addListener = function (board, listener) {
  this.listeners[board.number] = this.listeners[board.number] || [];
  this.listeners[board.number].push({
    board: board,
    listener: listener
  });
};
BoardWatcher.prototype.removeListener = function (board, listener) {
  var listeners = this.listeners[board.number] || [],
      newListeners = [],
      i;
  for (i = 0; i < listeners.length; i++) {
    if (listeners[i].listener !== listener) {
      newListeners.push(listeners[i]);
    }
  }
  this.listeners[board.number] = newListeners;
};

module.exports = new BoardWatcher();


},{"../shared/user":5}],3:[function(require,module,exports){
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


},{"iframe-phone":41}],4:[function(require,module,exports){
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


},{"../../data/shared/xhrObserver":7,"./lara":3}],5:[function(require,module,exports){
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


},{"../../data/shared/group-names":6,"../../views/shared/userRegistration.jsx":33,"./lara":3,"./log":4}],6:[function(require,module,exports){
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


},{}],7:[function(require,module,exports){
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


},{}],8:[function(require,module,exports){
var LogicChipView = React.createFactory(require('../../views/logic-gates/logic-chip')),
    Pin = require('../shared/pin'),
    TTL = require('../shared/ttl');

var LogicChip = function (options) {
  var i, pin, outputPins;

  this.name = 'logic-chip';
  this.view = LogicChipView;
  this.board = options.board;
  this.type = options.type;
  this.layout = options.layout;
  this.selectable = options.selectable;

  this.position = {
    x: this.layout.x,
    y: this.layout.y
  };

  this.pins = [];
  this.pinMap = {};
  for (i = 0; i < 14; i++) {
    if (this.type == '7404') {
      outputPins = [1, 3, 5, 6, 7, 9, 11, 13];
    }
    else {
      outputPins = [2, 5, 6, 7, 10, 13];
    }

    pin = {
      number: i,
      voltage: i == 13 ? TTL.HIGH_VOLTAGE : TTL.LOW_VOLTAGE,
      inputMode: outputPins.indexOf(i) === -1,
      placement: i < 7 ? 'left' : 'right',
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      labelSize: 0,
      component: this,
      notConnectable: false,
      isGround: i == 6,
      isVcc: i == 13
    };
    pin.label = {
      x: 0,
      y: 0,
      anchor: 'end',
      text: String(i + 1),
      color: '#fff'
    };
    pin = new Pin(pin);
    this.pins.push(pin);
    this.pinMap[pin.label.text] = pin;
  }

  this.label = {
    x: 0,
    y: 0,
    labelSize: 0,
    anchor: 'middle',
    text: this.type
  };
};
LogicChip.prototype.reset = function () {
  var i;
  for (i = 0; i < this.pins.length; i++) {
    this.pins[i].reset();
  }
};
LogicChip.prototype.mapAndSetPins = function (pinConnections, fn) {
  var logicLevels, i, j, inputPinNumbers, outputPinNumber;

  for (i = 0; i < pinConnections.length; i++) {
    inputPinNumbers = pinConnections[i][0];
    outputPinNumber = pinConnections[i][1];
    logicLevels = [];
    for (j = 0; j < inputPinNumbers.length; j++) {
      logicLevels.push(TTL.getVoltageLogicLevel(this.pins[inputPinNumbers[j] - 1].getVoltage()));
    }
    this.pins[outputPinNumber - 1].setVoltage(TTL.getVoltage(fn.apply(this, logicLevels)));
  }
};
LogicChip.prototype.standardPinConnections = [
  [[1, 2], 3],
  [[4, 5], 6],
  [[10, 9], 8],
  [[13, 12], 11]
];
LogicChip.prototype.resolveOutputVoltages = function () {
  // NOTE: all pin indexes are 1 based below to make it easier to verify against 1-based pinout diagrams
  switch (this.type) {
    // Quad 2-input AND
    case '7408':
      this.mapAndSetPins(this.standardPinConnections, function (a, b) {
        if (TTL.isInvalid(a) || TTL.isInvalid(b)) {
          return TTL.INVALID;
        }
        return TTL.getBooleanLogicLevel(TTL.isHigh(a) && TTL.isHigh(b));
      });
      break;

    // Quad 2-input OR
    case '7432':
      this.mapAndSetPins(this.standardPinConnections, function (a, b) {
        return TTL.getBooleanLogicLevel(TTL.isHigh(a) || TTL.isHigh(b));
      });
      break;

    // Quad 2-Input XOR
    case '7486':
      this.mapAndSetPins(this.standardPinConnections, function (a, b) {
        return TTL.getBooleanLogicLevel((TTL.isHigh(a) || TTL.isHigh(b)) && !(TTL.isHigh(a) && TTL.isHigh(b)));
      });
      break;

    // Hex Inverter
    case '7404':
      this.mapAndSetPins([
        [[1], 2],
        [[3], 4],
        [[5], 6],
        [[9], 8],
        [[11], 10],
        [[13], 12],
      ], function (a) {
        if (TTL.isInvalid(a)) {
          return TTL.INVALID;
        }
        return TTL.getBooleanLogicLevel(!TTL.isHigh(a));
      });
      break;

    // Tri 3-Input AND
    case '7411':
      this.mapAndSetPins([
        [[1, 2, 13], 12],
        [[3, 4, 5], 6],
        [[9, 10, 11], 8]
      ], function (a, b, c) {
        if (TTL.isInvalid(a) || TTL.isInvalid(b) || TTL.isInvalid(c)) {
          return TTL.INVALID;
        }
        return TTL.getBooleanLogicLevel(TTL.isHigh(a) && TTL.isHigh(b) && TTL.isHigh(c));
      });
      break;
  }
};
LogicChip.prototype.serialize = function () {
  return {
    type: 'logic-chip',
    chipType: this.type,
    x: this.position.x,
    y: this.position.y
  };
};


module.exports = LogicChip;


},{"../../views/logic-gates/logic-chip":18,"../shared/pin":13,"../shared/ttl":14}],9:[function(require,module,exports){
var Hole = require('./hole'),
    Pin = require('./pin'),
    Wire = require('./wire'),
    Circuit = require('./circuit'),
    LogicChip =  require('../logic-gates/logic-chip');

var Board = function (options) {
  this.number = options.number;
  this.components = options.components;
  this.connectors = options.connectors;
  this.bezierReflectionModifier = options.bezierReflectionModifier;
  this.logicDrawer = options.logicDrawer;
  this.wires = [];
  this.circuits = [];
  this.allBoards = [];
  this.updateComponentList();

  // reset the pic so the pin output is set
  if (this.components.pic) {
    this.components.pic.reset();
  }
};
Board.prototype.updateComponentList = function () {
  var self = this,
      i, name;

  this.pinsAndHoles = [];
  this.componentList = [];
  this.numComponents = 0;

  for (name in this.components) {
    if (this.components.hasOwnProperty(name)) {
      this.componentList.push(this.components[name]);
      this.numComponents++;
      for (i = 0; i < this.components[name].pins.length; i++) {
        this.pinsAndHoles.push(this.components[name].pins[i]);
      }
      this.components[name].board = this;
    }
  }
  $.each(this.connectors, function (name, connector) {
    for (var i = 0; i < connector.holes.length; i++) {
      self.pinsAndHoles.push(connector.holes[i]);
    }
  });
};
Board.prototype.clear = function () {
  var i;
  this.wires = [];
  this.circuits = [];
  this.reset();
  for (i = 0; i < this.pinsAndHoles.length; i++) {
    this.pinsAndHoles[i].connected = false;
  }
};
Board.prototype.reset = function () {
  var i;
  for (i = 0; i < this.pinsAndHoles.length; i++) {
    this.pinsAndHoles[i].reset();
  }
  for (i = 0; i < this.componentList.length; i++) {
    this.componentList[i].reset();
  }
};
Board.prototype.updateWires = function (newSerializedWires) {
  var toRemove = [],
      currentSerializedWires, i, index, endpoints;

  // quick check to see if there are changes
  currentSerializedWires = this.serializeWiresToArray();
  if (JSON.stringify(newSerializedWires) == JSON.stringify(currentSerializedWires)) {
    return;
  }

  // compare the current wires with the new wires
  for (i = 0; i < currentSerializedWires.length; i++) {
    index = newSerializedWires.indexOf(currentSerializedWires[i]);
    if (index === -1) {
      // in current but not in new so remove
      toRemove.push(currentSerializedWires[i]);
    }
    else {
      // in both so delete from new
      newSerializedWires.splice(index, 1);
    }
  }

  // now toRemove contains wires to remove and newSerializedWires contains wires to add
  for (i = 0; i < toRemove.length; i++) {
    endpoints = this.findSerializedWireEndpoints(toRemove[i]);
    if (endpoints.source && endpoints.dest) {
      this.removeWire(endpoints.source, endpoints.dest);
    }
  }
  for (i = 0; i < newSerializedWires.length; i++) {
    endpoints = this.findSerializedWireEndpoints(newSerializedWires[i]);
    if (endpoints.source && endpoints.dest) {
      this.addWire(endpoints.source, endpoints.dest, endpoints.color);
    }
  }
};
Board.prototype.serializeWiresToArray = function () {
  var serialized = [],
      i;
  for (i = 0; i < this.wires.length; i++) {
    serialized.push(this.wires[i].id);
  }
  return serialized;
};
Board.prototype.findSerializedWireEndpoints = function (serializedWire) {
  var self = this,
      parts = serializedWire.split(','),
      findEndpoint = function (parts) {
        var type = parts[0],
            instance = parts[1] || '',
            index = parseInt(parts[2] || '0', 10),
            endpoint = null;
        if ((type == 'connector') && self.connectors[instance]) {
          endpoint = self.connectors[instance].holes[index];
        }
        else if ((type == 'component') && self.components[instance]) {
          endpoint = self.components[instance].pins[index];
        }
        return endpoint;
      };

  return {
    source: findEndpoint(parts[0].split(':')),
    dest: findEndpoint((parts[1] || '').split(':')),
    color: parts[2] || ''
  };
};
Board.prototype.serializeEndpoint = function (endPoint, label) {
  var serialized;
  if (endPoint instanceof Hole) {
    serialized = {
      connector: endPoint.connector.type,
      hole: {
        index: endPoint.index,
        color: endPoint.color
      }
    };
    serialized[label] = 'hole';
  }
  else if (endPoint instanceof Pin) {
    serialized = {
      component: endPoint.component.name,
      pin: {
        index: endPoint.number,
        name: endPoint.label.text
      }
    };
    serialized[label] = 'pin';
  }
  else {
    serialized = {};
  }
  serialized.board = this.number;
  return serialized;
};
Board.prototype.removeWire = function (source, dest) {
  var i;

  for (i = 0; i < this.wires.length; i++) {
    if (this.wires[i].connects(source, dest)) {
      if (this.wires[i].source.inputMode) {
        this.wires[i].source.reset();
      }
      this.wires[i].source.connected = false;
      if (this.wires[i].dest.inputMode) {
        this.wires[i].dest.reset();
      }
      this.wires[i].dest.connected = false;
      this.wires.splice(i, 1);
      this.resolveCircuitsAcrossAllBoards();
      return true;
    }
  }
  return false;
};
Board.prototype.addWire = function (source, dest, color) {
  var i, id, wire;

  if (!source || !dest) {
    return null;
  }
  /*
  if ((source.connector && dest.connector) && (source.connector === dest.connector)) {
    alert("Sorry, you can't wire connectors to themselves.");
    return false;
  }
  if (source.component === dest.component) {
    alert("Sorry, you can't wire a component's pin to the same component.");
    return false;
  }
  */
  if (source.notConnectable || dest.notConnectable) {
    alert("Sorry, you can't add a wire to the " + (source.notConnectable ? source.label.text : dest.label.text) + ' pin.  It is already connected to a breadboard component.');
    return null;
  }

  // don't allow duplicate wires
  id = Wire.GenerateId(source, dest, color);
  for (i = 0; i < this.wires.length; i++) {
    if (this.wires[i].id === id) {
      return null;
    }
  }

  wire = new Wire({
    source: source,
    dest: dest,
    color: color
  });
  this.wires.push(wire);
  if (!this.resolveCircuits()) {
    this.wires.pop();
    return null;
  }
  source.connected = true;
  dest.connected = true;
  return wire;
};
Board.prototype.resolveCircuits = function() {
  var newCircuits;

  if (this.wires.length === 0) {
    this.circuits = [];
    return true;
  }

  newCircuits = Circuit.ResolveWires(this.wires);
  if (newCircuits) {
    this.circuits = newCircuits;
    return true;
  }

  return false;
};
Board.prototype.resolveCircuitsAcrossAllBoards = function() {
  var i;
  // reset and resolve all the circuits first
  for (i = 0; i < this.allBoards.length; i++) {
    this.allBoards[i].reset();
    this.allBoards[i].resolveCircuits();
  }
  // and then resolve all the io values
  for (i = 0; i < this.allBoards.length; i++) {
    this.allBoards[i].resolveIOVoltages();
  }
};
Board.prototype.resolveCircuitInputVoltages = function () {
  var i;
  if (this.connectors.input) {
    this.connectors.input.updateFromConnectedBoard();
  }
  for (i = 0; i < this.circuits.length; i++) {
    this.circuits[i].resolveInputVoltages();
  }
};
Board.prototype.resolveComponentOutputVoltages = function () {
  var i;
  for (i = 0; i < this.componentList.length; i++) {
    this.componentList[i].resolveOutputVoltages();
  }
};
Board.prototype.resolveCircuitOutputVoltages = function () {
  var i;
  for (i = 0; i < this.circuits.length; i++) {
    this.circuits[i].resolveOutputVoltages();
  }
};
Board.prototype.resolveIOVoltages = function () {
  this.resolveCircuitInputVoltages();
  this.resolveComponentOutputVoltages();
  this.resolveCircuitOutputVoltages();
  // this final call is to set the output connector values
  this.resolveCircuitInputVoltages();
};
Board.prototype.addComponent = function (name, component) {
  component.name = name;
  this.components[name] = component;
  this.updateComponentList();
};
Board.prototype.removeComponent = function (component) {
  delete this.components[component.name];
  this.updateComponentList();
};
Board.prototype.setConnectors = function (connectors) {
  this.connectors = connectors;
  this.updateComponentList();
};
Board.prototype.serializeComponents = function () {
  var serialized = {};
  $.each(this.components, function (name, component) {
    serialized[name] = component.serialize ? component.serialize() : {};
  });
  return serialized;
};
Board.prototype.updateComponents = function (newSerializedComponents) {
  var self = this,
      toRemove = [],
      currentSerializedComponents, i, name;

  // quick check to see if there are changes
  currentSerializedComponents = this.serializeComponents();
  if (JSON.stringify(newSerializedComponents) == JSON.stringify(currentSerializedComponents)) {
    return;
  }

  // compare the current components with the new components
  $.each(currentSerializedComponents, function (name) {
    if (newSerializedComponents[name]) {
      self.components[name].position.x = newSerializedComponents[name].x;
      self.components[name].position.y = newSerializedComponents[name].y;

      // in both so delete from new
      delete newSerializedComponents[name];
    }
    else {
      toRemove.push(name);
    }
  });

  // now toRemove contains components to remove and newSerializedComponents contains components to add
  for (i = 0; i < toRemove.length; i++) {
    name = toRemove[i];
    delete this.components[name];
  }
  $.each(newSerializedComponents, function (name, serializeComponent) {
    var component;

    if (serializeComponent.type == 'logic-chip') {
      component = new LogicChip({type: serializeComponent.chipType, layout: {x: serializeComponent.x, y: serializeComponent.y, width: 150, height: 75}});
      self.addComponent(name, component);
    }
  });

  this.updateComponentList();
};

module.exports = Board;


},{"../logic-gates/logic-chip":8,"./circuit":10,"./hole":12,"./pin":13,"./wire":15}],10:[function(require,module,exports){
var Circuit = function (options) {
  this.inputs = options.inputs;
  this.outputs = options.outputs;
};
Circuit.ResolveWires = function (allWires) {
  var circuits = [],
      addToCircuit, wire, testWire, i, j, numWires, inputs, outputs;

  addToCircuit = function (wire) {
    (wire.source.inputMode ? inputs : outputs).push(wire.source);
    (wire.dest.inputMode ? inputs : outputs).push(wire.dest);
  };

  numWires = allWires.length;
  for (i = 0; i < numWires; i++) {
    wire = allWires[i];
    inputs = [];
    outputs = [];
    addToCircuit(wire);

    for (j = i + 1; j < numWires; j++) {
      testWire = allWires[j];
      if ((wire.source == testWire.source) || (wire.source == testWire.dest) || (wire.dest == testWire.source) || (wire.dest == testWire.dest)) {
        addToCircuit(testWire);
      }
    }

    if (inputs.length + outputs.length > 0) {
      circuits.push(new Circuit({
        inputs: inputs,
        outputs: outputs
      }));
    }
  }

  return circuits;
};

Circuit.prototype.resolveInputVoltages = function () {
  this.setAverageOutputVoltage(this.inputs);
};

Circuit.prototype.resolveOutputVoltages = function () {
  this.setAverageOutputVoltage(this.outputs);
};

Circuit.prototype.setAverageOutputVoltage = function (list) {
  var totalOutputVoltage = 0,
      averageVoltage = 0,
      i;

  if (this.outputs.length > 0) {
    for (i = 0; i < this.outputs.length; i++) {
      totalOutputVoltage += this.outputs[i].getVoltage();
    }
    averageVoltage = totalOutputVoltage / this.outputs.length;
  }

  for (i = 0; i < list.length; i++) {
    list[i].setVoltage(averageVoltage);
  }
};

module.exports = Circuit;


},{}],11:[function(require,module,exports){
var Hole = require('./hole');

var Connector = function (options) {
  var self = this,
      i;

  this.type = options.type;
  this.count = options.count;
  this.position = {};

  this.holes = [];
  for (i = 0; i < this.count; i++) {
    this.holes.push(new Hole({
      index: i,
      x: 0,
      y: 0,
      radius: 0,
      color: '#555', // ['blue', '#0f0', 'purple', '#cccc00'][i],
      connector: self,
      label: options.labels ? options.labels[i] : null,
      inputMode: this.type === 'output' // seems weird but output connector holes have values set so their holes are in "inputMode" like the pins
    }));
  }
};
Connector.prototype.calculatePosition = function (constants, selected) {
  var selectedConstants = constants.selectedConstants(selected),
      i, cx, cy, radius, holeWidth, hole;

  holeWidth = selectedConstants.CONNECTOR_HOLE_DIAMETER + (selectedConstants.CONNECTOR_HOLE_MARGIN * 2);
  this.position.width = holeWidth * this.count;
  this.position.height = holeWidth;
  this.position.x = (constants.WORKSPACE_WIDTH - this.position.width) / 2;
  this.position.y = this.type === 'input' ? 0 : selectedConstants.BOARD_HEIGHT - this.position.height;

  radius = selectedConstants.CONNECTOR_HOLE_DIAMETER / 2;
  cy = this.type === 'input' ? this.position.y + selectedConstants.CONNECTOR_HOLE_MARGIN + radius : selectedConstants.BOARD_HEIGHT - (selectedConstants.CONNECTOR_HOLE_MARGIN + radius);
  cx = ((constants.WORKSPACE_WIDTH - this.position.width) / 2) + (holeWidth / 2);

  for (i = 0; i < this.count; i++) {
    hole = this.holes[i];
    hole.cx = cx + (i * holeWidth);
    hole.cy = cy;
    hole.radius =  radius;
  }
};
Connector.prototype.setHoleVoltage = function (index, voltage) {
  if ((index < this.holes.length) && (voltage !== 'x')) {
    this.holes[index].setVoltage(voltage);
  }
};
Connector.prototype.setHoleVoltages = function (voltages) {
  var i;
  for (i = 0; i < voltages.length; i++) {
    this.setHoleVoltage(i, voltages[i]);
  }
};
Connector.prototype.clearHoleVoltages = function () {
  var i;
  for (i = 0; i < this.holes.length; i++) {
    this.holes[i].setVoltage(0);
  }
};
Connector.prototype.getHoleVoltage = function (index) {
  return index < this.holes.length ? this.holes[index].getVoltage() : null;
};
Connector.prototype.getHoleVoltages = function () {
  var voltages = [],
      i;
  for (i = 0; i < this.holes.length; i++) {
    voltages.push(this.getHoleVoltage(i));
  }
  return voltages;
};
Connector.prototype.setConnectsTo = function (toConnector) {
  var i;
  this.connectsTo = toConnector;
  for (i = 0; i < this.holes.length; i++) {
    this.holes[i].connectedHole = toConnector.holes[i];
  }
};
Connector.prototype.updateFromConnectedBoard = function () {
  var i;
  for (i = 0; i < this.holes.length; i++) {
    if (this.holes[i].connectedHole) {
      this.holes[i].setVoltage(this.holes[i].connectedHole.getVoltage());
    }
  }
};

module.exports = Connector;


},{"./hole":12}],12:[function(require,module,exports){
var TTL = require('./ttl');

var Hole = function (options) {
  this.isPin = false; // to allow for easy checks against pins in circuits
  this.index = options.index;
  this.cx = options.cx;
  this.cy = options.cy;
  this.radius = options.radius;
  this.color = options.color;
  this.connector = options.connector;
  this.connected = options.connected || false;
  this.voltage = options.voltage || 0;
  this.startingVoltage = this.voltage;
  this.label = options.label;
  this.inputMode = options.inputMode;
  this.connectedHole = null; // set via Connector.prototype.setConnectsTo
};
Hole.prototype.getBezierReflection = function () {
  return this.connector.type === 'input' ? 1 : -1;
};
Hole.prototype.setVoltage = function (newVoltage) {
  this.pulseProbeDuration = this.pulseProbeDuration || (newVoltage != this.voltage ? 1 : 0);
  this.voltage = newVoltage;
};
Hole.prototype.getVoltage = function () {
  return this.voltage;
};
Hole.prototype.getLogicLevel = function () {
  return TTL.getVoltageLogicLevel(this.voltage);
};
Hole.prototype.isLow = function () {
  return TTL.isLow(this.getLogicLevel());
};
Hole.prototype.isInvalid = function () {
  return TTL.isInvalid(this.getLogicLevel());
};
Hole.prototype.isHigh = function () {
  return TTL.isHigh(this.getLogicLevel());
};
Hole.prototype.reset = function () {
  this.voltage = this.startingVoltage;
  this.pulseProbeDuration = 0;
};
Hole.prototype.getColor = function () {
  return this.color;
};

module.exports = Hole;


},{"./ttl":14}],13:[function(require,module,exports){
var TTL = require('./ttl');

var Pin = function (options) {
  this.board = options.component.board;
  this.isPin = true; // to allow for easy checks against holes in circuits
  this.inputMode = options.inputMode;
  this.placement = options.placement;
  this.number = options.number;
  this.x = options.x;
  this.y = options.y;
  this.cx = options.x + (options.width / 2);
  this.cy = options.y + (options.height / 2);
  this.height = options.height;
  this.width = options.width;
  this.labelSize = options.labelSize;
  this.label = options.label;
  this.component = options.component;
  this.bezierReflection = options.bezierReflection || 1;
  this.notConnectable = options.notConnectable || false;
  this.connected = options.connected || false;
  this.voltage = options.voltage || 0;
  this.startingVoltage = this.voltage;
};
Pin.prototype.getBezierReflection = function () {
  return this.bezierReflection;
};
Pin.prototype.setVoltage = function (newVoltage) {
  this.pulseProbeDuration = this.pulseProbeDuration || (newVoltage != this.voltage ? 1 : 0);
  this.voltage = newVoltage;
};
Pin.prototype.getVoltage = function () {
  return this.voltage;
};
Pin.prototype.getLogicLevel = function () {
  return TTL.getVoltageLogicLevel(this.voltage);
};
Pin.prototype.isLow = function () {
  return TTL.isLow(this.getLogicLevel());
};
Pin.prototype.isInvalid = function () {
  return TTL.isInvalid(this.getLogicLevel());
};
Pin.prototype.isHigh = function () {
  return TTL.isHigh(this.getLogicLevel());
};
Pin.prototype.getColor = function () {
  return TTL.getColor(this.voltage);
};
Pin.prototype.reset = function () {
  this.voltage = this.startingVoltage;
  this.pulseProbeDuration = 0;
};

module.exports = Pin;


},{"./ttl":14}],14:[function(require,module,exports){
var TTL = module.exports = {
  LOW: 'LOW',
  INVALID: 'INVALID',
  HIGH: 'HIGH',

  LOW_VOLTAGE: 0,
  INVALID_VOLTAGE: 1.5,
  HIGH_VOLTAGE: 5,

  getVoltageLogicLevel: function (voltage) {
    return voltage <= 0.8 ? TTL.LOW : (voltage < 2 ? TTL.INVALID : TTL.HIGH);
  },

  getBooleanLogicLevel: function (boolean) {
    return boolean ? TTL.HIGH : TTL.LOW;
  },

  getBooleanVoltage: function (boolean) {
    return boolean ? TTL.HIGH_VOLTAGE : TTL.LOW_VOLTAGE;
  },

  getVoltage: function (logicLevel) {
    if (!TTL.VOLTAGE_MAP) {
      TTL.VOLTAGE_MAP = {
        'LOW': TTL.LOW_VOLTAGE,
        'INVALID': TTL.INVALID_VOLTAGE,
        'HIGH': TTL.HIGH_VOLTAGE
      };
    }
    return TTL.VOLTAGE_MAP[logicLevel];
  },

  isInvalid: function (logicLevel) {
    return logicLevel === TTL.INVALID;
  },

  isLow: function (logicLevel) {
    return logicLevel === TTL.LOW;
  },

  isHigh: function (logicLevel) {
    return logicLevel === TTL.HIGH;
  },

  getColor: function (voltage) {
    if (!TTL.COLOR_MAP) {
      TTL.COLOR_MAP = {
        'LOW': 'green',
        'INVALID': '#ffbf00',
        'HIGH': 'red'
      };
    }
    return TTL.COLOR_MAP[TTL.getVoltageLogicLevel(voltage)];
  }
};


},{}],15:[function(require,module,exports){
var Hole = require('./hole'),
    Pin = require('./pin');

var Wire = function (options) {
  this.source = options.source;
  this.dest = options.dest;
  this.color = options.color;
  this.id = Wire.GenerateId(this.source, this.dest, this.color);
};
Wire.prototype.connects = function (source, dest) {
  return ((this.source === source) && (this.dest === dest)) || ((this.source === dest) && (this.dest === source));
};
Wire.prototype.getBezierReflection = function () {
  if (this.dest.connector) {
    return this.dest.getBezierReflection();
  }
  return this.source.getBezierReflection();
};
Wire.GenerateId = function (source, dest, color) {
  var sourceId = Wire.EndpointId(source),
      destId = Wire.EndpointId(dest),
      firstId = sourceId < destId ? sourceId : destId,
      secondId = firstId === sourceId ? destId : sourceId;
  return [firstId, secondId, color].join(',');
};
Wire.EndpointId = function (endPoint) {
  var id;
  if (endPoint instanceof Hole) {
    id = ['connector', endPoint.connector.type, endPoint.index].join(':');
  }
  else if (endPoint instanceof Pin) {
    id = ['component', endPoint.component.name, endPoint.number].join(':');
  }
  else {
    id = 'unknown';
  }
  return id;
};

module.exports = Wire;


},{"./hole":12,"./pin":13}],16:[function(require,module,exports){
var Connector = require('../../models/shared/connector'),
    Board = require('../../models/shared/board'),
    TTL = require('../../models/shared/ttl'),
    //LogicChip =  require('../../models/logic-gates/logic-chip'),
    boardWatcher = require('../../controllers/pic/board-watcher'),
    userController = require('../../controllers/shared/user'),
    logController = require('../../controllers/shared/log'),
    SidebarChatView = React.createFactory(require('../shared/sidebar-chat')),
    WeGotItView = React.createFactory(require('../shared/we-got-it')),
    WorkspaceView = React.createFactory(require('./workspace')),
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
      activity: null
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
    var self = this;

    this.setupConnectors(activity);

    this.setState({activity: activity});

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

    // update the wires
    wires = (boardInfo ? boardInfo.wires : null) || [];
    board.updateWires(wires);

    // update the components
    components = (boardInfo ? boardInfo.components : null) || [];
    board.updateComponents(components);

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

  render: function () {
    return div({},
      h1({}, "Teaching Teamwork" + (this.state.activity ? ": " + this.state.activity.name : "")),
      this.state.currentUser ? h2({}, "Circuit " + (this.state.currentBoard + 1) + " (User: " + this.state.currentUser + ", Group: " + this.state.currentGroup + ")") : null,
      WeGotItView({currentUser: this.state.currentUser, checkIfCircuitIsCorrect: this.checkIfCircuitIsCorrect}),
      div({id: 'logicapp'},
        WorkspaceView({constants: constants, boards: this.state.boards, users: this.state.users, userBoardNumber: this.state.userBoardNumber, activity: this.state.activity}),
        SidebarChatView({numClients: 2, top: 0})
      )
    );
  }
});


},{"../../controllers/pic/board-watcher":2,"../../controllers/shared/log":4,"../../controllers/shared/user":5,"../../models/shared/board":9,"../../models/shared/connector":11,"../../models/shared/ttl":14,"../shared/sidebar-chat":32,"../shared/we-got-it":35,"./constants":17,"./workspace":19}],17:[function(require,module,exports){
var workspaceWidth = 936 - 200,
    logicDrawerWidth = 100,
    constants;

module.exports = constants = {
  WORKSPACE_HEIGHT: 768,
  WORKSPACE_WIDTH: workspaceWidth,
  RIBBON_HEIGHT: 21,
  INPUT_SWITCHES_HEIGHT: 21,
  OUTPUT_LEDS_HEIGHT: 21,
  SELECTED_FILL: '#bbb',
  UNSELECTED_FILL: '#777',

  // in the logic gate activity there is no difference in layout between selected and unselected activities but we need to maintain this shared function signature
  selectedConstants: function () {
    var boardHeight = (constants.WORKSPACE_HEIGHT - (2 * constants.RIBBON_HEIGHT)) / 2,
        logicDrawerLayout = {
          x: workspaceWidth - logicDrawerWidth,
          y: 0,
          width: logicDrawerWidth,
          height: boardHeight
        };

    return {
      WIRE_WIDTH: 3,
      FOO_WIRE_WIDTH: 1,
      CONNECTOR_HOLE_DIAMETER: 15,
      CONNECTOR_HOLE_MARGIN: 4,
      BOARD_HEIGHT: boardHeight,
      COMPONENT_WIDTH: boardHeight * 0.5,
      COMPONENT_HEIGHT: boardHeight * 0.5,
      COMPONENT_SPACING: boardHeight * 0.5,
      PIC_FONT_SIZE: 12,
      CHIP_LABEL_SIZE: 16,
      BUTTON_FONT_SIZE: 16,
      PIN_WIDTH: 13.72,
      PIN_HEIGHT: 13.72,
      PROBE_WIDTH: 150,
      PROBE_NEEDLE_HEIGHT: 5,
      PROBE_HEIGHT: 20,
      PROBE_MARGIN: 10,
      LOGIC_DRAWER_LAYOUT: logicDrawerLayout
    };
  }
};


},{}],18:[function(require,module,exports){
var PinView = React.createFactory(require('../shared/pin')),
    PinLabelView = React.createFactory(require('../shared/pin-label')),
    constants = require('./constants'),
    events = require('../shared/events'),
    line = React.DOM.line,
    g = React.DOM.g,
    rect = React.DOM.rect,
    text = React.DOM.text,
    title = React.DOM.title,
    circle = React.DOM.circle;

module.exports = React.createClass({
  displayName: 'LogicChipView',

  componentWillMount: function () {
    var pos = this.props.snapToGrid(this.props.component.layout);
    if (!this.props.component.position) {
      this.props.component.position = {
        x: pos.x,
        y: pos.y
      };
    }
    // TODO: fix me - the width and height are not set when the chip is dragged to the board
    if (!this.props.component.position.width) {
      this.props.component.position.width = this.props.component.layout.width;
      this.props.component.position.height = this.props.component.layout.height;
    }
    if (this.props.startDragPos) {
      this.startDrag(this.props.startDragPos);
    }
  },

  setPosition: function (x, y) {
    this.props.component.position.x = x;
    this.props.component.position.y = y;
  },

  pinWire: function (pin, dx) {
    var s;
    dx = dx || 1;
    s = {x1: pin.x + (pin.width * dx), y1: pin.y + (pin.height / 2), x2: pin.x + pin.width + (2 * pin.width * dx), y2: pin.y + (pin.height / 2)};
    s.line = this.wireSegment(s).line;
    return s;
  },

  wireSegment: function (s, key) {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        segment = {x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, strokeWidth: selectedConstants.FOO_WIRE_WIDTH, stroke: '#333'};
    if (key) {
      segment.key = key;
    }
    segment.line = line(segment);
    return segment;
  },

  renderGround: function (pin, p) {
    var p2 = {x: p.x, y: p.y + (1.5 * pin.height)},
        segments = [this.wireSegment({key: pin.name + 'down', x1: p.x, y1: p.y, x2: p2.x, y2: p2.y}).line],
        s, width, height, i;

    for (i = 0; i < 3; i++) {
      width = pin.width - (pin.width * (0.33 * i));
      height = i * (pin.height / 4);
      s = {x1: p2.x - (width / 2), y1: p2.y + height, x2: p2.x + (width / 2), y2: p2.y + height};
      segments.push(this.wireSegment(s, pin.name + i).line);
    }

    return g({}, segments);
  },

  layout: function () {
    var label = this.props.component.label,
        selectedConstants = constants.selectedConstants(this.props.selected),
        position = this.props.component.position,
        pinDX, pinDY, i, j, pin, pinNumber, xOffset, y;

    pinDX = (position.width - (selectedConstants.PIN_WIDTH * 7)) / 8;

    for (i = 0; i < 2; i++) {
      y = i === 0 ? position.y + position.height : position.y - selectedConstants.PIN_HEIGHT;
      pinDY = i === 0 ? -(selectedConstants.PIN_HEIGHT / 2) : 2 * selectedConstants.PIN_HEIGHT;

      for (j = 0; j < 7; j++) {
        pinNumber = (i * 7) + j;
        pin = this.props.component.pins[pinNumber];
        xOffset = i === 0 ? j : 6 - j;

        pin.x = position.x + pinDX + (xOffset * (selectedConstants.PIN_WIDTH + pinDX));
        pin.y = y;

        pin.cx = pin.x + (selectedConstants.PIN_WIDTH / 2);
        pin.cy = pin.y + (selectedConstants.PIN_HEIGHT / 2);
        pin.width = selectedConstants.PIN_WIDTH;
        pin.height = selectedConstants.PIN_HEIGHT;
        pin.labelSize = selectedConstants.PIC_FONT_SIZE;
        pin.label.x = pin.x + (selectedConstants.PIN_WIDTH / 2);
        pin.label.y = pin.y + pinDY;
        pin.label.anchor = 'middle';
      }
    }

    label.x = position.x + (position.width / 2);
    label.y = position.y + (position.height / 2) + (selectedConstants.CHIP_LABEL_SIZE / 4);
    label.labelSize = selectedConstants.CHIP_LABEL_SIZE;
  },

  startDrag: function (startDragPos) {
    var $window = $(window),
        position = this.props.component.position,
        startX = position.x,
        startY = position.y,
        startDragX = startDragPos.x,
        startDragY = startDragPos.y,
        self = this,
        moved = false,
        drag, stopDrag;

    drag = function (e) {
      var r = self.props.logicChipDragRect,
          newX = Math.min(r.right - position.width, Math.max(r.left, startX + (e.pageX - startDragX))),
          newY = Math.min(r.bottom - position.height, Math.max(r.top, startY + (e.pageY - startDragY)));

      moved = true;
      e.preventDefault();
      e.stopPropagation();
      self.setPosition(newX, newY);
      self.setState({dragging: true});
      self.props.layoutChanged();
    };

    stopDrag = function (e) {
      var pos = self.props.snapToGrid(self.props.component.position);
      e.stopPropagation();
      e.preventDefault();
      self.setPosition(pos.x, pos.y);
      self.setState({dragging: false});
      if (self.props.stopLogicChipDrawerDrag) {
        self.props.stopLogicChipDrawerDrag({type: self.props.component.type, x: position.x, y: position.y});
      }
      else if (moved) {
        events.logEvent(events.MOVE_LOGIC_CHIP_EVENT, null, {board: self.props.component.board, chip: self.props.component});
      }
      self.props.layoutChanged();
      $window.off('mousemove', drag);
      $window.off('mouseup', stopDrag);
    };
    if (self.props.componentClicked) {
      this.props.componentClicked(this.props.component);
    }
    $window.on('mousemove', drag);
    $window.on('mouseup', stopDrag);
  },

  mouseDown: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.startDrag({x: e.pageX, y: e.pageY});
  },

  getTitle: function () {
    var titles = {
      '7408': 'Quad 2-Input AND',
      '7432': 'Quad 2-Input OR',
      '7486': 'Quad 2-Input XOR',
      '7404': 'Hex Inverter',
      '7411': 'Tri 3-Input AND'
    };
    return titles[this.props.component.type];
  },

  render: function () {
    var pins = [],
        selectedConstants = constants.selectedConstants(this.props.selected),
        position = this.props.component.position,
        pin,
        i, groundComponent, vccComponents, vccPos, label, labelText, rectParams;

    this.layout();

    for (i = 0; i < this.props.component.pins.length; i++) {
      pin = this.props.component.pins[i];
      pins.push(PinView({key: 'pin' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
      pins.push(PinLabelView({key: 'label' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, reportHover: this.props.reportHover}));
    }

    pin = this.props.component.pins[6];
    groundComponent = this.renderGround(pin, {x: pin.cx, y: pin.cy});

    pin = this.props.component.pins[13];
    vccPos = {x1: pin.cx, y1: pin.cy, x2: pin.cx, y2: pin.cy - (1.25 * pin.width)};
    vccComponents = g({},
      line({x1: vccPos.x1, y1: vccPos.y1, x2: vccPos.x2, y2: vccPos.y2, strokeWidth: selectedConstants.FOO_WIRE_WIDTH, stroke: '#333'}),
      circle({cx: vccPos.x2, cy: vccPos.y2 - (pin.width / 2), r: pin.width / 2, fill: 'none', stroke: '#333'})
    );

    label = this.props.component.label;
    labelText = text({key: 'label', x: label.x, y: label.y, fontSize: label.labelSize, fill: '#fff', style: {textAnchor: label.anchor}}, label.text);

    rectParams = {x: position.x, y: position.y, width: position.width, height: position.height, fill: '#333'};
    if (this.props.editable && this.props.selected && this.props.componentSelected) {
      rectParams.stroke = '#f00';
      rectParams.strokeWidth = 2;
    }

    return g({onMouseDown: this.props.selected && this.props.editable ? this.mouseDown : null},
      rect(rectParams),
      pins,
      groundComponent,
      vccComponents,
      labelText,
      title({}, this.getTitle())
    );
  }
});


},{"../shared/events":25,"../shared/pin":29,"../shared/pin-label":28,"./constants":17}],19:[function(require,module,exports){
var BoardView = React.createFactory(require('../shared/board')),
    RibbonView = React.createFactory(require('../shared/ribbon')),
    events = require('../shared/events'),
    div = React.DOM.div;

module.exports = React.createClass({
  displayName: 'WorkspaceView',

  getInitialState: function () {
    return {
      selectedBoard: null,
      userBoardNumber: -1
    };
  },

  toggleBoard: function (board) {
    var previousBoard = this.state.selectedBoard,
        selectedBoard = board === this.state.selectedBoard ? null : board;
    this.setState({selectedBoard: selectedBoard});
    if (selectedBoard) {
      events.logEvent(events.OPENED_BOARD_EVENT, selectedBoard.number);
    }
    else {
      events.logEvent(events.CLOSED_BOARD_EVENT, previousBoard ? previousBoard.number : -1);
    }
  },

  componentWillReceiveProps: function (nextProps) {
    // show only the board when the user selects a board at the start
    if (this.state.userBoardNumber != nextProps.userBoardNumber) {
      this.setState({
        userBoardNumber: nextProps.userBoardNumber,
        selectedBoard: nextProps.boards[nextProps.userBoardNumber]
      });
    }
  },

  render: function () {
    var selectedConstants;

    if (this.props.userBoardNumber == -1) {
      return div({id: 'workspace', style: {width: this.props.constants.WORKSPACE_WIDTH}});
    }
    else if (this.state.selectedBoard) {
      selectedConstants = this.props.constants.selectedConstants(true);
      return div({id: 'workspace', style: {width: this.props.constants.WORKSPACE_WIDTH, top: (this.props.constants.WORKSPACE_HEIGHT - selectedConstants.BOARD_HEIGHT) / 2}},
        RibbonView({
          constants: this.props.constants,
          connector: this.state.selectedBoard.connectors.input
        }),
        BoardView({
          constants: this.props.constants,
          board: this.state.selectedBoard,
          editable: this.props.userBoardNumber === this.state.selectedBoard.number,
          selected: true,
          user: this.props.users[this.state.selectedBoard.number],
          logicChipDrawer: this.props.activity ? this.props.activity.boards[this.props.userBoardNumber].logicChipDrawer : null,
          toggleBoard: this.props.userBoardNumber === this.state.selectedBoard.number ? this.toggleBoard : null,
          toggleBoardButtonStyle: {marginTop: -35},
          showProbe: true
        }),
        RibbonView({
          constants: this.props.constants,
          connector: this.state.selectedBoard.connectors.output
        })
      );
    }
    else {
      return div({id: 'workspace', style: {width: this.props.constants.WORKSPACE_WIDTH}},
        RibbonView({
          constants: this.props.constants,
          connector: this.props.boards[0].connectors.input
        }),
        BoardView({
          constants: this.props.constants,
          board: this.props.boards[0],
          editable: this.props.userBoardNumber === 0,
          user: this.props.users[0],
          logicChipDrawer: this.props.activity ? this.props.activity.boards[0].logicChipDrawer : null,
          toggleBoard: this.props.userBoardNumber === 0 ? this.toggleBoard : null
        }),
        RibbonView({
          constants: this.props.constants,
          connector: this.props.boards[0].connectors.output
        }),
        BoardView({
          constants: this.props.constants,
          board: this.props.boards[1],
          editable: this.props.userBoardNumber === 1,
          user: this.props.users[1],
          logicChipDrawer: this.props.activity ? this.props.activity.boards[1].logicChipDrawer : null,
          toggleBoard: this.props.userBoardNumber === 1 ? this.toggleBoard : null
        })
      );
    }
  }
});


},{"../shared/board":20,"../shared/events":25,"../shared/ribbon":31}],20:[function(require,module,exports){
var boardWatcher = require('../../controllers/pic/board-watcher'),
    ConnectorView = React.createFactory(require('./connector')),
    WireView = React.createFactory(require('./wire')),
    ProbeView = React.createFactory(require('./probe')),
    LogicChipDrawerView = React.createFactory(require('./logic-chip-drawer')),
    events = require('../shared/events'),
    layout = require('./layout'),
    LogicChip =  require('../../models/logic-gates/logic-chip'),
    div = React.DOM.div,
    span = React.DOM.span,
    div = React.DOM.div,
    svg = React.DOM.svg,
    //line = React.DOM.line,
    path = React.DOM.path,
    button = React.DOM.button;

module.exports = React.createClass({
  displayName: 'BoardView',

  toggleBoard: function () {
    this.props.toggleBoard(this.props.board);
  },

  getInitialState: function () {
    return {
      drawConnection: null,
      hoverSource: null,
      wires: this.props.board.wires,
      probeSource: this.props.board.probe ? this.props.board.probe.source : null,
      probePos: this.props.board.probe ? this.props.board.probe.pos : null,
      selectedWires: [],
      selectedComponents: [],
      drawBox: null,
      draggingProbe: false,
      draggingChip: null,
      logicChipDrawer: this.initLogicChipDrawer(this.props.logicChipDrawer),
      nextChipNumber: 0
    };
  },

  componentDidMount: function () {
    boardWatcher.addListener(this.props.board, this.updateWatchedBoard);
    $(window).on('keyup', this.keyUp);
    $(window).on('keydown', this.keyDown);

    // used to find wire click position
    this.svgOffset = $(this.refs.svg).offset();
  },

  componentWillReceiveProps: function (nextProps) {
    if (!this.state.logicChipDrawer && nextProps.logicChipDrawer) {
      this.setState({logicChipDrawer: this.initLogicChipDrawer(nextProps.logicChipDrawer)});
    }
  },

  componentWillUnmount: function () {
    boardWatcher.removeListener(this.props.board, this.updateWatchedBoard);
    $(window).off('keyup', this.keyUp);
    $(window).off('keydown', this.keyDown);
  },

  initLogicChipDrawer: function (rawData) {
    if (rawData) {
      $.each(rawData.chips, function (type, chip) {
        chip.count = 0;
      });
    }
    return rawData;
  },

  chatHasFocus: function () {
    // adapted from http://stackoverflow.com/a/7821694
    var focused = document.activeElement;
    if (!focused || focused == document.body) {
      focused = null;
    }
    else if (document.querySelector) {
      focused = document.querySelector(":focus");
    }
    return focused && ((focused.nodeName === "TEXTAREA") || (focused.nodeName === "INPUT"));
  },

  keyDown: function (e) {
    // ignore when chat has focus
    if (this.chatHasFocus()) {
      return;
    }

    // 46 is the delete key which maps to 8 on Macs
    // this is needed so Chrome on Macs don't trigger a back navigation
    if ((e.keyCode == 46) || (e.keyCode == 8)) {
      e.preventDefault();
      e.stopPropagation();
    }
  },

  keyUp: function (e) {
    var wiresToRemove = [],
        i, j, selectedComponent, wire;

    // ignore when chat has focus
    if (this.chatHasFocus()) {
      return;
    }

    // 46 is the delete key which maps to 8 on Macs
    if (!((e.keyCode == 46) || (e.keyCode == 8))) {
      return;
    }

    if (this.props.selected && this.props.editable) {

      // mark selected wires to remove
      for (i = 0; i < this.state.selectedWires.length; i++) {
        wire = this.state.selectedWires[i];
        if (wiresToRemove.indexOf(wire) === -1) {
          wiresToRemove.push(wire);
        }
      }

      // remove components
      for (i = 0; i < this.state.selectedComponents.length; i++) {
        selectedComponent = this.state.selectedComponents[i];

        // mark connected wires to removed component
        for (j = 0; j < this.props.board.wires.length; j++) {
          wire = this.props.board.wires[j];
          if ((wiresToRemove.indexOf(wire) === -1) && ((wire.source.component == selectedComponent) || (wire.dest.component == selectedComponent))) {
            wiresToRemove.push(wire);
          }
        }

        if (selectedComponent instanceof LogicChip) {
          this.removeLogicChip(selectedComponent);
        }
        else {
          this.props.board.removeComponent(selectedComponent);
          events.logEvent(events.REMOVE_COMPONENT, null, {board: this.props.board, component: selectedComponent});
        }
      }

      for (i = 0; i < wiresToRemove.length; i++) {
        wire = wiresToRemove[i];
        this.props.board.removeWire(wire.source, wire.dest);
        events.logEvent(events.REMOVE_WIRE_EVENT, null, {board: this.props.board, source: wire.source});
      }

      this.setState({
        wires: this.props.board.wires,
        selectedWires: [],
        selectedComponents: []
      });
    }
    e.preventDefault();
    e.stopPropagation();
  },

  updateWatchedBoard: function (board, boardInfo) {
    var probe = {source: null, pos: null},
        probeInfo;

    // move the probe
    if (boardInfo && boardInfo.probe) {
      probeInfo = boardInfo.probe;
      if (probeInfo.to === 'pin') {
        probe.source = board.components[probeInfo.component].pins[probeInfo.pin.index];
      }
      else if (probeInfo.to === 'hole') {
        probe.source = board.connectors[probeInfo.connector].holes[probeInfo.hole.index];
      }
    }
    this.setProbe(probe);
  },

  reportHover: function (hoverSource) {
    this.setState({hoverSource: hoverSource});
  },

  setProbe: function (probe) {
    this.props.board.probe = probe;
    this.setState({probeSource: probe.source, probePos: probe.pos});
    this.blurChatFocus();
  },

  drawConnection: function (source, e, color, callback) {
    var $window = $(window),
        self = this,
        moved = false,
        drag, stopDrag;

    e.preventDefault();
    e.stopPropagation();

    this.blurChatFocus();

    drag = function (e) {
      if (!moved) {
        self.setState({
          selectedWires: [],
          selectedComponents: [],
          drawConnection: {
            x1: source.cx,
            y1: source.cy,
            x2: source.cx,
            y2: source.cy,
            strokeWidth: self.props.constants.selectedConstants(self.props.selected).WIRE_WIDTH,
            stroke: '#f00',
            reflection: source.getBezierReflection() * self.props.board.bezierReflectionModifier
          }
        });
      }
      moved = true;
      e.preventDefault();
      self.state.drawConnection.x2 = e.pageX - self.svgOffset.left;
      self.state.drawConnection.y2 = e.pageY - self.svgOffset.top;
      self.setState({drawConnection: self.state.drawConnection});
    };

    stopDrag = function (e) {
      var dest = self.state.hoverSource,
          addedWire = false,
          wire;

      e.stopPropagation();
      e.preventDefault();

      $window.off('mousemove', drag);
      $window.off('mouseup', stopDrag);
      self.setState({drawConnection: null});

      if (moved && dest && (dest !== source)) {
        addedWire = true;
        wire = self.props.board.addWire(source, dest, (source.color || dest.color || color));
        self.setState({
          wires: self.props.board.wires,
          selectedWires: [wire],
          selectedComponents: []
        });
        events.logEvent(events.ADD_WIRE_EVENT, null, {board: self.props.board, source: source, dest: dest});
      }

      if (callback) {
        callback(addedWire, moved);
      }
    };

    $window.on('mousemove', drag);
    $window.on('mouseup', stopDrag);
  },

  distance: function (endpoint, x, y) {
    var a = endpoint.cx - x,
        b = endpoint.cy - y;
    return Math.sqrt((a*a) + (b*b));
  },

  blurChatFocus: function () {
    // remove focus from chat textbox
    var focused = document.activeElement || (document.querySelector ? document.querySelector(":focus") : null);
    if (focused) {
      focused.blur();
    }
  },

  wireSelected: function (wire, e) {
    // check if click is near an endpoint
    var x = e.pageX - this.svgOffset.left,
        y = e.pageY - this.svgOffset.top,
        sourceDistance = this.distance(wire.source, x, y),
        destDistance = this.distance(wire.dest, x, y),
        shortestDistance = Math.min(sourceDistance, destDistance),
        self = this;

    if (shortestDistance <= 20) {
      this.props.board.removeWire(wire.source, wire.dest);
      this.setState({
        wires: this.props.board.wires,
        selectedWires: [],
        selectedComponents: []
      });
      this.drawConnection(shortestDistance == sourceDistance ? wire.dest : wire.source, e, wire.color, function (addedWire) {
        var newWire;
        if (!addedWire) {
          newWire = self.props.board.addWire(wire.source, wire.dest, wire.color);
          self.setState({
            wires: self.props.board.wires,
            selectedWires: [newWire],
            selectedComponents: []
          });
        }
      });
    }
    else {
      this.setState({selectedWires: [wire], selectedComponents: []});
    }
    this.blurChatFocus();
  },

  backgroundMouseDown: function (e) {
    var $window = $(window),
        self = this,
        drag, stopDrag, getPath, x1, y1;

    this.blurChatFocus();

    this.setState({selectedWires: [], selectedComponents: []});

    // allow for bounding box drawing around wires for mass selection
    e.preventDefault();

    x1 = e.pageX - this.svgOffset.left;
    y1 = e.pageY - this.svgOffset.top;

    // use path instead of rect as svg rect doesn't support negative widths or heights
    getPath = function (x2, y2) {
      return ["M", x1, ",", y1, " ", x2, ",", y1, " ", x2, ",", y2, " ", x1, ",", y2, " ", x1, ",", y1].join("");
    };

    this.setState({
      drawBox: {
        x1: x1,
        y1: y1,
        path: getPath(x1, y1),
        strokeWidth: this.props.constants.selectedConstants(this.props.selected).WIRE_WIDTH,
        stroke: '#555',
        strokeDasharray: [10, 5]
      }
    });

    drag = function (e) {
      var x2 = e.pageX - self.svgOffset.left,
          y2 = e.pageY - self.svgOffset.top;
      e.preventDefault();
      self.state.drawBox.x2 = x2;
      self.state.drawBox.y2 = y2;
      self.state.drawBox.path = getPath(x2, y2);
      self.setState({drawBox: self.state.drawBox});
    };

    stopDrag = function (e) {
      var selectedWires = [],
          selectedComponents = [],
          r, enclosed, i, wire, component;

      e.stopPropagation();
      e.preventDefault();
      $window.off('mousemove', drag);
      $window.off('mouseup', stopDrag);

      // check bounding box for wires
      r = {
        x1: Math.min(self.state.drawBox.x1, self.state.drawBox.x2),
        y1: Math.min(self.state.drawBox.y1, self.state.drawBox.y2),
        x2: Math.max(self.state.drawBox.x1, self.state.drawBox.x2),
        y2: Math.max(self.state.drawBox.y1, self.state.drawBox.y2)
      };
      enclosed = function (x, y) {
        return (r.x1 <= x) && (x <= r.x2) && (r.y1 <= y) && (y <= r.y2);
      };
      for (i = 0; i < self.props.board.wires.length; i++) {
        wire = self.props.board.wires[i];
        if (enclosed(wire.source.cx, wire.source.cy) || enclosed(wire.dest.cx, wire.dest.cy)) {
          selectedWires.push(wire);
        }
      }
      for (i = 0; i < self.props.board.componentList.length; i++) {
        component = self.props.board.componentList[i];
        if (component.selectable && enclosed(component.position.x, component.position.y)) {
          selectedComponents.push(component);
        }
      }

      self.setState({
        drawBox: null,
        selectedWires: selectedWires,
        selectedComponents: selectedComponents
      });
    };

    $window.on('mousemove', drag);
    $window.on('mouseup', stopDrag);
  },

  draggingProbe: function (draggingProbe) {
    this.setState({draggingProbe: draggingProbe});
  },

  layoutChanged: function () {
    this.setState({wires: this.state.wires});
  },

  snapToGrid: function (pos) {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        gridSize = selectedConstants.PIN_WIDTH;
    return {
      x: gridSize * Math.round(pos.x / gridSize),
      y: gridSize * Math.round(pos.y / gridSize)
    };
  },

  startLogicChipDrawerDrag: function (chip, pageX, pageY) {
    var chipCX = 75,
        chipCY = 37,
        chipX = pageX - this.svgOffset.left - chipCX,
        chipY = pageY - this.svgOffset.top - chipCY,
        draggingChip = new LogicChip({type: chip.type, layout: {x: chipX, y: chipY, width: 150, height: 75}});

    this.setState({
      selectedWires: [],
      selectedComponents: [],
      draggingChip: {
        type: chip.type,
        view: draggingChip.view({
          constants: this.props.constants,
          component: draggingChip,
          startDragPos: {x: pageX, y: pageY},
          stopLogicChipDrawerDrag: this.stopLogicChipDrawerDrag,
          layoutChanged: this.layoutChanged,
          snapToGrid: this.snapToGrid,
          selected: true,
          componentSelected: true,
          logicChipDragRect: this.getLogicChipDragRect()
        })
      }
    });
  },

  stopLogicChipDrawerDrag: function (chip) {
    var r = this.getLogicChipDragRect();

    // don't add if hidden by drawer
    if (chip.x < r.right - 100) {
      var component = new LogicChip({type: chip.type, layout: {x: chip.x, y: chip.y, width: 150, height: 75}, selectable: true});
      this.addLogicChip(component);
      this.setState({draggingChip: null, selectedWires: [], selectedComponents: [component]});
    }
    else {
      this.setState({draggingChip: null});
    }
  },

  addLogicChip: function (chip, name) {
    var logicChipDrawer = this.state.logicChipDrawer;

    name = name || "lc" + this.state.nextChipNumber;
    this.props.board.addComponent(name, chip);
    events.logEvent(events.ADD_LOGIC_CHIP_EVENT, null, {board: this.props.board, chip: chip});

    logicChipDrawer.chips[chip.type].count++;
    this.setState({
      logicChipDrawer: logicChipDrawer,
      nextChipNumber: this.state.nextChipNumber + 1
    });
  },

  removeLogicChip: function (chip) {
    var logicChipDrawer = this.state.logicChipDrawer;

    this.props.board.removeComponent(chip);
    events.logEvent(events.REMOVE_LOGIC_CHIP_EVENT, null, {board: this.props.board, chip: chip});

    logicChipDrawer.chips[chip.type].count--;
    this.setState({logicChipDrawer: logicChipDrawer});
  },

  componentSelected: function (component) {
    this.setState({selectedWires: [], selectedComponents: [component]});
  },

  getLogicChipDragRect: function () {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected);
    return selectedConstants.LOGIC_DRAWER_LAYOUT ? {
      top: 10,
      left: 10,
      right: this.props.constants.WORKSPACE_WIDTH - selectedConstants.LOGIC_DRAWER_LAYOUT.width - 10,
      bottom: selectedConstants.BOARD_HEIGHT - 10
    } : {};
  },

  render: function () {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        style = {
          width: this.props.constants.WORKSPACE_WIDTH,
          height: selectedConstants.BOARD_HEIGHT,
          position: 'relative'
        },
        connectors = [],
        components = [],
        wires = [],
        componentIndex = 0,
        enableWirePointerEvents = !this.state.draggingProbe && !this.state.drawConnection && !this.state.drawBox && (this.props.editable && this.props.selected),
        logicChipDragRect = this.getLogicChipDragRect(),
        name, component, i, wire;

    // used to find wire click position
    this.svgOffset = $(this.refs.svg).offset();

    this.props.board.resolveCircuitInputVoltages();

    // calculate the position so the wires can be updated
    if (this.props.board.connectors.input) {
      this.props.board.connectors.input.calculatePosition(this.props.constants, this.props.selected);
      connectors.push(ConnectorView({key: 'input', constants: this.props.constants, connector: this.props.board.connectors.input, selected: this.props.selected, editable: this.props.editable, drawConnection: this.drawConnection, reportHover: this.reportHover}));
    }
    if (this.props.board.connectors.output) {
      this.props.board.connectors.output.calculatePosition(this.props.constants, this.props.selected);
      connectors.push(ConnectorView({key: 'output', constants: this.props.constants, connector: this.props.board.connectors.output, selected: this.props.selected, editable: this.props.editable, drawConnection: this.drawConnection, reportHover: this.reportHover}));
    }

    for (name in this.props.board.components) {
      if (this.props.board.components.hasOwnProperty(name)) {
        component = this.props.board.components[name];
        if (component.calculatePosition) {
          component.calculatePosition(this.props.constants, this.props.selected, componentIndex++, this.props.board.numComponents);
        }
        components.push(component.view({key: name, constants: this.props.constants, component: component, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, drawConnection: this.drawConnection, reportHover: this.reportHover, layoutChanged: this.layoutChanged, snapToGrid: this.snapToGrid, componentSelected: this.state.selectedComponents.indexOf(component) !== -1, componentClicked: this.componentSelected, logicChipDragRect: logicChipDragRect}));
      }
    }

    for (i = 0; i < this.props.board.wires.length; i++) {
      wire = this.props.board.wires[i];
      wires.push(WireView({key: i, constants: this.props.constants, wire: wire, board: this.props.board, editable: this.props.editable, enablePointerEvents: enableWirePointerEvents, width: selectedConstants.WIRE_WIDTH, wireSelected: this.wireSelected, selected: this.state.selectedWires.indexOf(wire) !== -1, wireSettings: this.props.wireSettings}));
    }

    return div({className: this.props.editable ? 'board editable-board' : 'board', style: style},
      span({className: this.props.editable ? 'board-user editable-board-user' : 'board-user'}, ('Circuit ' + (this.props.board.number + 1) + ': ') + (this.props.user ? this.props.user.name : '(unclaimed)')),
      svg({className: 'board-area', onMouseDown: this.props.selected && this.props.editable ? this.backgroundMouseDown : null, ref: 'svg'},
        connectors,
        components,
        wires,
        //(this.state.drawConnection ? line({x1: this.state.drawConnection.x1, x2: this.state.drawConnection.x2, y1: this.state.drawConnection.y1, y2: this.state.drawConnection.y2, stroke: this.state.drawConnection.stroke, strokeWidth: this.state.drawConnection.strokeWidth, fill: 'none', style: {pointerEvents: 'none'}}) : null),
        (this.state.drawConnection ? path({d: layout.getBezierPath({x1: this.state.drawConnection.x1, x2: this.state.drawConnection.x2, y1: this.state.drawConnection.y1, y2: this.state.drawConnection.y2, reflection: this.state.drawConnection.reflection, wireSettings: this.props.wireSettings}), stroke: this.state.drawConnection.stroke, strokeWidth: this.state.drawConnection.strokeWidth, fill: 'none', style: {pointerEvents: 'none'}}) : null),

        (this.state.drawBox ? path({d: this.state.drawBox.path, stroke: this.state.drawBox.stroke, strokeWidth: this.state.drawBox.strokeWidth, strokeDasharray: this.state.drawBox.strokeDasharray, fill: 'none', style: {pointerEvents: 'none'}}) : null),
        this.state.logicChipDrawer && this.props.editable && this.props.selected ? LogicChipDrawerView({chips: this.state.logicChipDrawer.chips, selected: this.props.selected, editable: this.props.editable, startDrag: this.startLogicChipDrawerDrag, layout: selectedConstants.LOGIC_DRAWER_LAYOUT}) : null,
        this.props.showProbe ? ProbeView({constants: this.props.constants, board: this.props.board, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, probeSource: this.state.probeSource, hoverSource: this.state.hoverSource, pos: this.state.probePos, setProbe: this.setProbe, svgOffset: this.svgOffset, draggingProbe: this.draggingProbe}) : null,
        this.state.draggingChip ? this.state.draggingChip.view : null
      ),
      this.props.toggleBoard ? span({className: 'board-toggle', style: this.props.toggleBoardButtonStyle}, button({onClick: this.toggleBoard}, this.props.selected ? 'View All Circuits' : (this.props.editable ? 'Edit Circuit' : 'View Circuit'))) : null
    );
  }
});


},{"../../controllers/pic/board-watcher":2,"../../models/logic-gates/logic-chip":8,"../shared/events":25,"./connector":24,"./layout":26,"./logic-chip-drawer":27,"./probe":30,"./wire":36}],21:[function(require,module,exports){
var div = React.DOM.div,
    b = React.DOM.b;
    
module.exports = React.createClass({
  displayName: 'ChatItemView',

  render: function () {
    return div({className: this.props.me ? 'chat-item chat-item-me' : 'chat-item chat-item-others'},
      b({}, this.props.item.prefix || (this.props.item.user + ':')),
      ' ',
      this.props.item.message
    );
  }
});


},{}],22:[function(require,module,exports){
var userController = require('../../controllers/shared/user'),
    ChatItemView = React.createFactory(require('./chat-item')),
    div = React.DOM.div;

module.exports = React.createClass({
  displayName: 'ChatItemsView',

  componentDidUpdate: function (prevProps) {
    if (prevProps.items.length !== this.props.items.length) {
      if (this.refs.items) {
        this.refs.items.scrollTop = this.refs.items.scrollHeight;
      }
    }
  },

  render: function () {
    var user = userController.getUsername(),
        items;
    items = this.props.items.map(function(item, i) {
      return ChatItemView({key: i, item: item, me: item.user == user});
    });
    return div({ref: 'items', className: 'sidebar-chat-items'}, items);
  }
});


},{"../../controllers/shared/user":5,"./chat-item":21}],23:[function(require,module,exports){
var g = React.DOM.g,
    circle = React.DOM.circle,
    title = React.DOM.title;

module.exports = React.createClass({
  displayName: 'ConnectorHoleView',

  mouseOver: function () {
    this.props.reportHover(this.props.hole);
  },

  mouseOut: function () {
    this.props.reportHover(null);
  },

  startDrag: function (e) {
    this.props.drawConnection(this.props.hole, e, this.props.hole.color);
  },

  render: function () {
    var enableHandlers = this.props.selected && this.props.editable;
    return g({}, circle({cx: this.props.hole.cx, cy: this.props.hole.cy, r: this.props.hole.radius, fill: this.props.hole.getColor(), onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null},
      title({}, this.props.hole.label)
    ));
  }
});


},{}],24:[function(require,module,exports){
var ConnectorHoleView = React.createFactory(require('./connector-hole')),
    svg = React.DOM.svg,
    rect = React.DOM.rect;

module.exports = React.createClass({
  displayName: 'ConnectorView',

  render: function () {
    var position = this.props.connector.position,
        holes = [],
        hole, i;

    for (i = 0; i < this.props.connector.holes.length; i++) {
      hole = this.props.connector.holes[i];
      holes.push(ConnectorHoleView({key: i, connector: this.props.connector, hole: hole, selected: this.props.selected, editable: this.props.editable, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
    }

    return svg({},
      rect({x: position.x, y: position.y, width: position.width, height: position.height, fill: '#aaa'}),
      holes
    );
  }
});


},{"./connector-hole":23}],25:[function(require,module,exports){
var boardWatcher = require('../../controllers/pic/board-watcher'),
    logController = require('../../controllers/shared/log'),
    events;

module.exports = events = {
  MOVED_PROBE_EVENT: 'Moved probe',
  PUSHED_BUTTON_EVENT: 'Pushed button',
  ADD_WIRE_EVENT: 'Add wire',
  REMOVE_WIRE_EVENT: 'Remove wire',
  OPENED_BOARD_EVENT: 'Opened board',
  CLOSED_BOARD_EVENT: 'Closed board',
  RUN_EVENT: 'Run',
  STOP_EVENT: 'Stop',
  STEP_EVENT: 'Step',
  RESET_EVENT: 'Reset',
  ADD_LOGIC_CHIP_EVENT: 'Add Logic Chip',
  REMOVE_LOGIC_CHIP_EVENT: 'Remove Logic Chip',
  MOVE_LOGIC_CHIP_EVENT: 'Move Logic Chip',

  logEvent: function (eventName, value, parameters) {
    var loggedValue = null,
        loggedParameters = null;

    if (eventName === events.MOVED_PROBE_EVENT) {
      loggedParameters = parameters.board.serializeEndpoint(value, 'to');
      boardWatcher.movedProbe(parameters.board, loggedParameters);
    }
    else if (eventName == events.PUSHED_BUTTON_EVENT) {
      loggedValue = value.value;
      loggedParameters = {
        board: value.component.board.number
      };
      boardWatcher.pushedButton(parameters.board, value.value);
    }
    else if (eventName == events.ADD_WIRE_EVENT) {
      loggedParameters = {
        source: parameters.board.serializeEndpoint(parameters.source, 'type'),
        dest: parameters.board.serializeEndpoint(parameters.dest, 'type')
      };
      boardWatcher.circuitChanged(parameters.board);
    }
    else if (eventName == events.REMOVE_WIRE_EVENT) {
      loggedParameters = {
        source: parameters.board.serializeEndpoint(parameters.source, 'type')
      };
      boardWatcher.circuitChanged(parameters.board);
    }
    else if (eventName == events.ADD_LOGIC_CHIP_EVENT) {
      // TODO
      loggedParameters = {
      };
      boardWatcher.circuitChanged(parameters.board);
    }
    else if (eventName == events.REMOVE_LOGIC_CHIP_EVENT) {
      // TODO
      loggedParameters = {
      };
      boardWatcher.circuitChanged(parameters.board);
    }
    else if (eventName == events.MOVE_LOGIC_CHIP_EVENT) {
      // TODO
      loggedParameters = {
      };
      boardWatcher.circuitChanged(parameters.board);
    }
    else {
      // log the raw event value and parameters
      logController.logEvent(eventName, value, parameters);
      return;
    }

    logController.logEvent(eventName, loggedValue, loggedParameters);
  }
};


},{"../../controllers/pic/board-watcher":2,"../../controllers/shared/log":4}],26:[function(require,module,exports){
module.exports = {
  getBezierPath: function (options) {
    var normalize, dy, dx, dist, x3, y3, x4, y4, height, curvyness;

    normalize = function (v, d) {
      var n = v / d;
      if (!isFinite(n)) {
        n = 0;
      }
      return n;
    };

    curvyness = (options.wireSettings ? options.wireSettings.curvyness : 0) || 0.25;

    dx = options.x1 - options.x2;
    dy = options.y1 - options.y2;
    dist = Math.sqrt(dx*dx + dy*dy);
    height = dist * curvyness;
    dx = normalize(dx, dist);
    dy = normalize(dy, dist);
    x3 = (options.x1 + options.x2) / 2;
    y3 = (options.y1 + options.y2) / 2;
    x4 = x3 - height*dy*options.reflection;
    y4 = y3 + height*dx*options.reflection;

    return ['M', options.x1, ',', options.y1, ' Q', x4, ',', y4, ' ', options.x2, ',', options.y2].join('');
  },

  calculateComponentRect: function (constants, selected, index, count, componentWidth, componentHeight) {
    var selectedConstants = constants.selectedConstants(selected),
        startX, position;

    componentWidth = componentWidth || selectedConstants.COMPONENT_WIDTH;
    componentHeight = componentHeight || selectedConstants.COMPONENT_HEIGHT;

    startX = (constants.WORKSPACE_WIDTH - (count * componentWidth) - ((count - 1) * selectedConstants.COMPONENT_SPACING)) / 2;

    position = {
      x: startX + (index * (componentWidth + selectedConstants.COMPONENT_SPACING)),
      y: ((selectedConstants.BOARD_HEIGHT - componentHeight) / 2),
      width: componentWidth,
      height: componentHeight
    };

    return position;
  }
};


},{}],27:[function(require,module,exports){
var g = React.DOM.g,
    rect = React.DOM.rect,
    text = React.DOM.text,
    title = React.DOM.title,
    ChipView;

ChipView = React.createFactory(React.createClass({
  displayName: 'ChipView',

  startDrag: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.props.startDrag({type: this.props.type}, e.pageX, e.pageY);
  },

  getTitle: function () {
    var titles = {
      '7408': 'Quad 2-Input AND',
      '7432': 'Quad 2-Input OR',
      '7486': 'Quad 2-Input XOR',
      '7404': 'Hex Inverter',
      '7411': 'Tri 3-Input AND'
    };
    return titles[this.props.type];
  },

  render: function () {
    var labelX = this.props.x + (this.props.width / 2),
        labelY = this.props.y + (this.props.height / 2),
        available = (this.props.chip.count < this.props.chip.max),
        enableHandlers = this.props.selected && this.props.editable && available,
        pins = [],
        pinWidth = this.props.width / 7,
        pinDY = (this.props.height - (pinWidth * 7)) / 8,
        pinX, pinY, i, j;

    for (i = 0; i < 2; i++) {
      pinX = i === 0 ? this.props.x - pinWidth : this.props.x + this.props.width;
      for (j = 0; j < 7; j++) {
        pinY = this.props.y + pinDY + (j * (pinWidth + pinDY));
        pins.push(rect({x: pinX, y: pinY, width: pinWidth, height: pinWidth, fill: '#777'}));
      }
    }

    return g({onMouseDown: enableHandlers ? this.startDrag : null},
      rect({x: this.props.x, y: this.props.y, width: this.props.width, height: this.props.height, fill: available ? '#333' : '#777'},
        title({}, this.getTitle())
      ),
      pins,
      text({key: 'label', x: labelX, y: labelY, fontSize: 14, fill: '#fff', style: {textAnchor: 'middle', dominantBaseline: 'central'}, transform: 'rotate(-90, ' + labelX + ', ' + labelY + ')'}, this.props.type) // + " (" + this.props.chip.count + "/" + this.props.chip.max + ")")
    );
  }
}));

module.exports = React.createClass({
  displayName: 'LogicChipDrawerView',

  backgroundMouseDown: function (e) {
    e.preventDefault();
    e.stopPropagation();
  },

  render: function () {
    var self = this,
        chips = [],
        chipWidth = this.props.layout.width * 0.6,
        chipHeight = chipWidth * 1.5,
        chipMargin = (this.props.layout.width - chipWidth) / 2,
        numChips = Object.keys(this.props.chips).length,
        chipX = this.props.layout.x + chipMargin,
        chipY = this.props.layout.y + ((this.props.layout.height - ((numChips * chipHeight) + ((numChips - 1) * chipMargin))) / 2),
        i;

    i = 0;
    $.each(this.props.chips, function (type, chip) {
      chips.push(ChipView({type: type, chip: chip, x: chipX, y: chipY + (i * (chipHeight + chipMargin)), width: chipWidth, height: chipHeight, selected: self.props.selected, editable: self.props.editable, startDrag: self.props.startDrag}));
      i++;
    });
    return g({},
      rect({x: this.props.layout.x, y: this.props.layout.y, width: this.props.layout.width, height: this.props.layout.height, fill: '#aaa', onMouseDown: this.backgroundMouseDown}),
      chips
    );
  }
});


},{}],28:[function(require,module,exports){
var text = React.DOM.text;

module.exports = React.createClass({
  displayName: 'PinLabelView',

  mouseOver: function () {
    this.props.reportHover(this.props.pin);
  },

  mouseOut: function () {
    this.props.reportHover(null);
  },

  render: function () {
    var pin = this.props.pin,
      enableHandlers = this.props.selected && this.props.editable;

    return text({key: this.props.key, x: pin.label.x, y: pin.label.y, fontSize: pin.labelSize, fill: pin.label.color, style: {textAnchor: pin.label.anchor}, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null}, pin.label.text);
  }
});


},{}],29:[function(require,module,exports){
var g = React.DOM.g,
    rect = React.DOM.rect;

module.exports = React.createClass({
  displayName: 'PinView',

  mouseOver: function () {
    this.props.reportHover(this.props.pin);
  },

  mouseOut: function () {
    this.props.reportHover(null);
  },

  startDrag: function (e) {
    this.props.drawConnection(this.props.pin, e, '#ddd');
  },

  renderPin: function (pin, enableHandlers) {
    return g({onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null},
      rect({x: pin.x, y: pin.y, width: pin.width, height: pin.height, fill: '#777'})
    );
  },

  renderIOPin: function (pin, enableHandlers) {
    var inputRect, outputRect;

    switch (pin.placement) {
      case 'top':
        inputRect = {x: pin.x, y: pin.y + (pin.height / 2), width: pin.width, height: pin.height / 2};
        outputRect = {x: pin.x, y: pin.y, width: pin.width, height: pin.height / 2};
        break;
      case 'bottom':
        inputRect = {x: pin.x, y: pin.y, width: pin.width, height: pin.height / 2};
        outputRect = {x: pin.x, y: pin.y + (pin.height / 2), width: pin.width, height: pin.height / 2};
        break;
      case 'right':
        inputRect = {x: pin.x, y: pin.y, width: pin.width / 2, height: pin.height};
        outputRect = {x: pin.x + (pin.width / 2), y: pin.y, width: pin.width / 2, height: pin.height};
        break;
      default:
        outputRect = {x: pin.x, y: pin.y, width: pin.width / 2, height: pin.height};
        inputRect = {x: pin.x + (pin.width / 2), y: pin.y, width: pin.width / 2, height: pin.height};
        break;
    }

    inputRect.fill = pin.inputMode && pin.connected ? pin.getColor() : '#777';
    outputRect.fill = !pin.inputMode ? pin.getColor() : '#777';

    return g({onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null},
      rect(inputRect),
      rect(outputRect)
    );
  },

  render: function () {
    var pin = this.props.pin,
        showColors = this.props.stepping && this.props.showDebugPins && !pin.notConnectable,
        enableHandlers = this.props.selected && this.props.editable;

    return showColors ? this.renderIOPin(pin, enableHandlers) : this.renderPin(pin, enableHandlers);
  }
});


},{}],30:[function(require,module,exports){
var events = require('../shared/events'),
    g = React.DOM.g,
    path = React.DOM.path,
    circle = React.DOM.circle;

module.exports = React.createClass({
  displayName: 'ProbeView',

  getInitialState: function () {
    return {
      dragging: false
    };
  },

  startDrag: function (e) {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        $window = $(window),
        self = this,
        drag, stopDrag;

    this.props.draggingProbe(true);

    e.preventDefault();
    e.stopPropagation();

    drag = function (e) {
      e.preventDefault();
      self.props.setProbe({source: null, pos: {x: (e.pageX - self.props.svgOffset.left), y: (e.pageY - self.props.svgOffset.top) - (selectedConstants.PROBE_HEIGHT / 2)}});
    };

    stopDrag = function (e) {
      self.props.draggingProbe(false);

      e.preventDefault();
      $window.off('mousemove', drag);
      $window.off('mouseup', stopDrag);
      if (self.props.hoverSource) {
        self.props.hoverSource.pulseProbeDuration = 0;
      }
      self.props.setProbe({source: self.props.hoverSource, pos: null});
      events.logEvent(events.MOVED_PROBE_EVENT, self.props.hoverSource, {board: self.props.board});
    };

    $window.on('mousemove', drag);
    $window.on('mouseup', stopDrag);
  },

  render: function () {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        width = selectedConstants.PROBE_WIDTH,
        height = selectedConstants.PROBE_HEIGHT,
        halfNeedleHeight = selectedConstants.PROBE_NEEDLE_HEIGHT / 2,
        x = this.props.probeSource ? this.props.probeSource.cx : (this.props.pos ? this.props.pos.x : this.props.constants.WORKSPACE_WIDTH - selectedConstants.PROBE_WIDTH - selectedConstants.PROBE_MARGIN),
        y = this.props.probeSource ? this.props.probeSource.cy - (height / 2) : (this.props.pos ? this.props.pos.y : selectedConstants.BOARD_HEIGHT - selectedConstants.PROBE_HEIGHT - selectedConstants.PROBE_MARGIN),
        middleY = y + (height / 2),
        defaultFill = 0.125,
        redFill = defaultFill,
        greenFill = defaultFill,
        amberFill = defaultFill,
        needlePath, handlePath, rotation;

    if (this.props.probeSource && (!this.props.probeSource.inputMode || this.props.probeSource.connected)) {

      if (this.props.probeSource.isHigh()) {
        redFill = 1;
      }
      else if (this.props.probeSource.isLow()) {
        greenFill = 1;
      }

      if (this.props.probeSource.pulseProbeDuration) {
        amberFill = 1;

        if (this.props.stepping) {
          // show for only 1 step
          this.props.probeSource.pulseProbeDuration = 0;
        }
        else {
          // show for 3 renders (300ms) and then hide for 3 renders (300ms)
          this.props.probeSource.pulseProbeDuration++;
          if (this.props.probeSource.pulseProbeDuration > 3) {
            amberFill = defaultFill;
          }
          if (this.props.probeSource.pulseProbeDuration > 6) {
            this.props.probeSource.pulseProbeDuration = 0;
          }
        }
      }
    }

    needlePath = [
      'M', x, ',', middleY, ' ',
      'L', x + halfNeedleHeight, ',', middleY - halfNeedleHeight, ' ',
      'L', x + height, ',', middleY - halfNeedleHeight, ' ',
      'L', x + height, ',', middleY + halfNeedleHeight, ' ',
      'L', x + halfNeedleHeight, ',', middleY + halfNeedleHeight, ' ',
      'L', x, ',', middleY, ' '
    ].join('');

    handlePath = [
      'M', x + height, ',', middleY - halfNeedleHeight, ' ',
      'L', x + (2 * height), ',', y, ' ',
      'L', x + width, ',', y, ' ',
      'L', x + width, ',', y + height, ' ',
      'L', x + (2 * height), ',', y + height, ' ',
      'L', x + height, ',', middleY + halfNeedleHeight, ' '
    ].join('');

    // vary the rotation lineraly from +15 at the top of the board to -15 at the bottom so the lights can be seen
    rotation = 15 - ((y / selectedConstants.BOARD_HEIGHT) * 30);

    return g({transform: ['rotate(', rotation, ' ',  x, ' ', y + (height / 2), ')'].join(''), onMouseDown: this.props.selected && this.props.editable ? this.startDrag : null},
      path({d: needlePath, fill: '#c0c0c0', stroke: '#777', style: {pointerEvents: 'none'}}),
      path({d: handlePath, fill: '#eee', stroke: '#777'}), // '#FDCA6E'
      circle({cx: x + (4 * height), cy: middleY, r: height / 4, fill: 'red', fillOpacity: redFill}),
      circle({cx: x + (5 * height), cy: middleY, r: height / 4, fill: 'green', fillOpacity: greenFill}),
      circle({cx: x + (6 * height), cy: middleY, r: height / 4, fill: '#ffbf00', fillOpacity: amberFill})
    );
  }
});


},{"../shared/events":25}],31:[function(require,module,exports){
var line = React.DOM.line,
    div = React.DOM.div,
    svg = React.DOM.svg;

module.exports = React.createClass({
  displayName: 'RibbonView',

  render: function () {
    var selectedConstants = this.props.constants.selectedConstants(false),
        wires = [],
        colors = ['#800000', '#008000', '#008080', '#00FFFF', '#000080', '#0000FF', '#800080', '#FF0000'],
        hole, i;

    if (this.props.connector) {
      for (i = 0; i < this.props.connector.holes.length; i++) {
        hole = this.props.connector.holes[i];
        if (!hole.forcedValue) {
          wires.push(line({key: i, x1: hole.cx, y1: 0, x2: hole.cx, y2: this.props.constants.RIBBON_HEIGHT, strokeWidth: selectedConstants.WIRE_WIDTH, stroke: colors[i % colors.length]}));
        }
      }
    }
    return div({style: {height: this.props.constants.RIBBON_HEIGHT}},
      svg({}, wires)
    );
  }
});


},{}],32:[function(require,module,exports){
var userController = require('../../controllers/shared/user'),
    logController = require('../../controllers/shared/log'),
    ChatItems = React.createFactory(require('./chat-items')),
    div = React.DOM.div,
    form = React.DOM.form,
    textarea = React.DOM.textarea,
    br = React.DOM.br,
    button = React.DOM.button;

module.exports = React.createClass({
  displayName: 'SidebarChatView',

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
        nums = ["zero", "one", "two", "three"],
        cap = function (string) {
          return string.charAt(0).toUpperCase() + string.slice(1);
        },
        message = " ";

    if (slotsRemaining > 1) {
      // One of three users is here
      message += cap(nums[numExistingUsers]) + " of " + this.props.numClients + " users is here.";
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
          numExistingUsers = Math.min(self.state.numExistingUsers + 1, this.props.numClients);
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
        message = $.trim(input.value);

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

  render: function () {
    return div({id: 'sidebar-chat', style: {top: this.props.top}},
      div({id: 'sidebar-chat-title'}, 'Chat'),
      ChatItems({items: this.state.items}),
      div({className: 'sidebar-chat-input'},
        form({onSubmit: this.handleSubmit},
          textarea({ref: 'text', placeholder: 'Enter chat message here...', onKeyDown: this.listenForEnter}),
          br({}),
          button({onClick: this.handleSubmit}, 'Send Chat Message')
        )
      )
    );
  }
});


},{"../../controllers/shared/log":4,"../../controllers/shared/user":5,"./chat-items":22}],33:[function(require,module,exports){
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


},{"../../data/shared/group-names":6}],34:[function(require,module,exports){
var div = React.DOM.div,
    h2 = React.DOM.h2,
    button = React.DOM.button;

module.exports = React.createClass({
  displayName: 'WeGotItPopupView',

  clicked: function () {
    this.props.hidePopup();
  },

  render: function () {
    var allCorrect = this.props.allCorrect;
    return div({id: "we-got-it-popup"},
      div({id: "we-got-it-popup-background"}),
      div({id: "we-got-it-popup-dialog-wrapper"},
        div({id: "we-got-it-popup-dialog"},
          h2({}, allCorrect ? "All the wires are correct!" : "Sorry, the circuit is not correctly wired."),
          div({}, allCorrect ? "Your circuit is correctly wired." : "Your circuit is not correctly wired."),
          button({onClick: this.clicked}, allCorrect ? "All Done!" : "Keep Trying..." )
        )
      )
    );
  }
});


},{}],35:[function(require,module,exports){
var WeGotItPopupView = React.createFactory(require('./we-got-it-popup')),
    userController = require('../../controllers/shared/user'),
    logController = require('../../controllers/shared/log'),
    div = React.DOM.div,
    button = React.DOM.button;

module.exports = React.createClass({
  displayName: 'WeGotItView',

  getInitialState: function () {
    return {
      showPopup: false,
      allCorrect: false
    };
  },

  componentWillMount: function () {
    var self = this;

    userController.onGroupRefCreation(function() {
      self.submitRef = userController.getFirebaseGroupRef().child("submitted");
      self.submitRef.on("value", function(dataSnapshot) {
        var submitValue = dataSnapshot.val(),
            skew = userController.getServerSkew(),
            now = (new Date().getTime()) + skew;

        // ignore submits over 10 seconds old
        if (!submitValue || (submitValue.at < now - (10 * 1000))) {
          return;
        }

        self.props.checkIfCircuitIsCorrect(function (allCorrect) {
          self.setState({showPopup: true, allCorrect: allCorrect});
        });
      });
    });
  },

  componentWillUnmount: function() {
    this.submitRef.off();
  },

  hidePopup: function () {
    this.setState({showPopup: false});
  },

  clicked: function (e) {
    var username = userController.getUsername();

    e.preventDefault();

    logController.logEvent("Submit clicked", username);

    this.submitRef.set({
      user: username,
      at: Firebase.ServerValue.TIMESTAMP
    });
  },

  render: function () {
    if (this.props.currentUser) {
      return div({id: "we-got-it"},
        button({onClick: this.clicked}, "We got it!"),
        this.state.showPopup ? WeGotItPopupView({allCorrect: this.state.allCorrect, hidePopup: this.hidePopup}) : null
      );
    }
    else {
      return null;
    }
  }
});


},{"../../controllers/shared/log":4,"../../controllers/shared/user":5,"./we-got-it-popup":34}],36:[function(require,module,exports){
var layout = require('../../views/shared/layout'),
    path = React.DOM.path;

module.exports = React.createClass({
  displayName: 'WireView',

  getInitialState: function () {
    return {
      hovering: false
    };
  },

  mouseOver: function () {
    this.setState({hovering: true});
  },

  mouseOut: function () {
    this.setState({hovering: false});
  },

  mouseDown: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.props.wireSelected(this.props.wire, e);
  },

  render: function () {
    var wire = this.props.wire,
        color = this.props.wireSettings ? this.props.wireSettings.color: wire.color;

    return path({
      key: this.props.key,
      className: 'wire',
      d: layout.getBezierPath({x1: wire.source.cx, y1: wire.source.cy, x2: wire.dest.cx, y2: wire.dest.cy, reflection: wire.getBezierReflection() * this.props.board.bezierReflectionModifier, wireSettings: this.props.wireSettings}),
      strokeWidth: this.props.width,
      stroke: this.props.selected && this.props.editable ? '#f00' : (this.state.hovering ? '#ccff00' : color),
      fill: 'none',
      onMouseOver: this.props.enablePointerEvents ? this.mouseOver : null,
      onMouseOut: this.props.enablePointerEvents ? this.mouseOut : null,
      onMouseDown: this.props.enablePointerEvents ? this.mouseDown : null,
      pointerEvents: this.props.enablePointerEvents ? 'fill' : 'none'
    });
  }
});


},{"../../views/shared/layout":26}],37:[function(require,module,exports){
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
},{"./structured-clone":40}],38:[function(require,module,exports){
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

},{"./iframe-endpoint":37,"./parent-endpoint":39}],39:[function(require,module,exports){
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

},{"./structured-clone":40}],40:[function(require,module,exports){
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

},{}],41:[function(require,module,exports){
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

},{"./lib/iframe-endpoint":37,"./lib/iframe-phone-rpc-endpoint":38,"./lib/parent-endpoint":39,"./lib/structured-clone":40}]},{},[1]);
