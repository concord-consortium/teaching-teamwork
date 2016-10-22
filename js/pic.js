(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var AppView = React.createFactory(require('./views/pic/app'));
ReactDOM.render(AppView({}), document.getElementById('content'));


},{"./views/pic/app":28}],2:[function(require,module,exports){
var userController = require('../shared/user');

var BoardWatcher = function () {
  this.firebase = null;
  this.listeners = {};
};
BoardWatcher.prototype.startListeners = function (numBoards) {
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
      }, i;

  this.firebase = userController.getFirebaseGroupRef().child('clients');

  for (i = 0; i < numBoards; i++) {
    this.firebase.child(i).on('value', listenerCallbackFn(i));
  }
};

// NOTE: the if (this.firebase) conditionals are needed below because startListeners is not called in the PIC solo mode

BoardWatcher.prototype.movedProbe = function (board, probeInfo) {
  if (this.firebase) {
    this.firebase.child(board.number).child('probe').set(probeInfo);
  }
};
BoardWatcher.prototype.pushedButton = function (board, buttonValue) {
  if (this.firebase) {
    this.firebase.child(board.number).child('button').set(buttonValue);
  }
};
BoardWatcher.prototype.circuitChanged = function (board) {
  if (this.firebase) {
    this.firebase.child(board.number).child('layout').set({
      wires: board.serializeWiresToArray(),
      components: board.serializeComponents(),
      inputs: board.serializeInputs()
    });
  }
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


},{"iframe-phone":64}],4:[function(require,module,exports){
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


},{"../../data/shared/xhrObserver":11,"./lara":3}],5:[function(require,module,exports){
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


},{"../../data/shared/group-names":8,"../../views/shared/userRegistration.jsx":54,"./lara":3,"./log":4}],6:[function(require,module,exports){
module.exports = {
  '7400': 'Quad 2-Input NAND',
  '7402': 'Quad 2-Input NOR',
  '7404': 'Hex Inverter',
  '7408': 'Quad 2-Input AND',
  '7411': 'Tri 3-Input AND',
  '7432': 'Quad 2-Input OR',
  '7486': 'Quad 2-Input XOR'
};


},{}],7:[function(require,module,exports){
var code = [];
code.push({
  asm: [
    ";*************************************************************************************",
    ";  Lab Assignment: TT Board 1",
    ";  Program File Name: TT Circuit 1.asm",
    ";",
    ";   Software:",
    ";   This program takes a key that is pressed on the keypad and",
    ";   converts it to a 4 bit binary number RRCC Where RR is Row and CC is column",
    ";",
    ";*************************************************************************************",
    "",
    ";======================= Configuration Register Programming =====================",
    ";This loading of the CONFIG register with the WDT turned off and the security",
    ";inactive.",
    "",
    " __CONFIG 0x3FFA   ;0x3FFA hex = b'11 1111 1111 1010'",
    "",
    ";  Bits 13 - 4 Code Protect Bits, Bit 3 Power Up Timer, Bit 2 Watch Dog Timer,",
    ";  Bits 1 and 0 are Oscillator Select Bits",
    ";",
    ";=========================================================================",
    ";============================= Equates=====================================",
    "",
    "Keypr      equ 0x0c    ;First DRAM location used as short term storage",
    "Col        equ 0x0d    ;Second DRAM location used as short term storage",
    "Row        equ 0x0e    ;Third DRAM location used for short term storage",
    ";=========================================================================",
    ";  Information the assembler needs to create proper files and program output",
    "",
    "",
    "   title\"TT Circuit 1\"   ;Title of lab printed on History File",
    "   list p=16f84A       ;Directive telling Assembler which PIC to use",
    "   #include <ETR261.h> ;Header file to make programming simpler",
    "",
    ";=========================================================================",
    "",
    "           org 00h     ;starting address for the program in PRAM",
    "           goto Start  ;skip over the interrupt address",
    "           org 04h     ;starting address for the start of code",
    "           retfie      ;return from interrupt to take care of an false interrupt",
    "",
    ";=========================================================================",
    "",
    "Start      movlw   0xf0        ;setup PORTA",
    "           tris    PORTA",
    "",
    "           movlw   0x87        ;setup PORTB",
    "           tris    PORTB",
    "           movlw   0x0F",
    "           movwf   PORTA",
    "again      movlw   0xf0        ;scan row 1",
    "           movwf   Row",
    "           movwf   PORTB",
    "           call    KEY",
    "",
    "           movlw   0xe8        ;scan row 2",
    "           movwf   Row",
    "           movwf   PORTB",
    "           call    KEY",
    "",
    "           movlw   0xd8        ;scan row 3",
    "           movwf   Row",
    "           movwf   PORTB",
    "           call    KEY",
    "",
    "           movlw   0xb8        ;scan row 4",
    "           movwf   Row",
    "           movwf   PORTB",
    "           call    KEY",
    "           goto    again",
    "",
    "KEY",
    "           movlw   0x06",
    "           movwf   Col",
    "           btfss   PORTB,0     ;scan column 3",
    "           call    KEYPRESS",
    "",
    "           movlw   0x05",
    "           movwf   Col",
    "           btfss   PORTB,1     ;scan column 2",
    "           call    KEYPRESS",
    "",
    "           movlw   0x03",
    "           movwf   Col",
    "           btfss   PORTB,2     ;scan column 1",
    "           call    KEYPRESS",
    "           return",
    "",
    "KEYPRESS   movf    Row,w",
    "           andlw   0xf8",
    "           iorwf   Col,w",
    "           movwf   Keypr",
    "           movf    Keypr,w",
    "           sublw   0xf3",
    "           btfss   STATUS,Z",
    "           goto    two",
    "           movlw   0x00",
    "           movwf   PORTA",
    "           return",
    "two        movf    Keypr,w",
    "           sublw   0xf5",
    "           btfss   STATUS,Z",
    "           goto    three",
    "           movlw   0x01",
    "           movwf   PORTA",
    "           return",
    "three      movf    Keypr,w",
    "           sublw   0xf6",
    "           btfss   STATUS,Z",
    "           goto    four",
    "           movlw   0x02",
    "           movwf   PORTA",
    "           return",
    "four       movf    Keypr,w",
    "           sublw   0xeb",
    "           btfss   STATUS,Z",
    "           goto    five",
    "           movlw   0x04",
    "           movwf   PORTA",
    "           return",
    "five       movf    Keypr,w",
    "           sublw   0xed",
    "           btfss   STATUS,Z",
    "           goto    six",
    "           movlw   0x05",
    "           movwf   PORTA",
    "           return",
    "six        movf    Keypr,w",
    "           sublw   0xee",
    "           btfss   STATUS,Z",
    "           goto    seven",
    "           movlw   0x06",
    "           movwf   PORTA",
    "           return",
    "seven      movf    Keypr,w",
    "           sublw   0xdb",
    "           btfss   STATUS,Z",
    "           goto    eight",
    "           movlw   0x08",
    "           movwf   PORTA",
    "           return",
    "eight      movf    Keypr,w",
    "           sublw   0xdd",
    "           btfss   STATUS,Z",
    "           goto    nine",
    "           movlw   0x09",
    "           movwf   PORTA",
    "           return",
    "nine       movf    Keypr,w",
    "           sublw   0xde",
    "           btfss   STATUS,Z",
    "           goto    Asterisk",
    "           movlw   0x0A",
    "           movwf   PORTA",
    "           return",
    "Asterisk   movf    Keypr,w",
    "           sublw   0xbe",
    "           btfss   STATUS,Z",
    "           goto    zero",
    "           movlw   0x0C",
    "           movwf   PORTA",
    "           return",
    "zero       movf    Keypr,w",
    "           sublw   0xbd",
    "           btfss   STATUS,Z",
    "           goto    Pound",
    "           movlw   0x0D",
    "           movwf   PORTA",
    "           return",
    "Pound      movf    Keypr,w",
    "           sublw   0xbb",
    "           btfss   STATUS,Z",
    "           return",
    "           movlw   0x0E",
    "           movwf   PORTA",
    "           return",
    "",
    "           end"
    ].join('\n'),
  js: function (pic) {
    var checkRow;

    checkRow = function (number) {
      return function () {
        var row = number << 2,
            input;

        pic.setPortB([0xf0, 0xe8, 0xd8, 0xb8][number]);
        input = pic.getPortB();

        if (input === 0x06) {
          pic.setPortA(row + 0x0);
        }
        if (input === 0x05) {
          pic.setPortA(row + 0x1);
        }
        if (input === 0x03) {
          pic.setPortA(row + 0x2);
        }
      };
    };

    return {
      start: function () {
        pic.trisPortA(0xf0);
        pic.trisPortB(0x87);
        pic.setPortA(0x0f);
      },
      loop: [checkRow(0), checkRow(1), checkRow(2), checkRow(3)]
    };
  }
});

code.push({
  asm: [
    ";*************************************************************************************",
    ";  Lab Assignment: TT Board 2 ",
    ";  Program File Name: TT Circuit 2.asm",
    ";",
    ";   Software:  ",
    ";   This program takes row and column information from circuit 1 and converts that  ",
    ";   to a BCD number representing the key pressed in circuit 1.",
    ";",
    ";*************************************************************************************",
    "",
    ";======================= Configuration Register Programming =====================",
    ";This loading of the CONFIG register with the WDT turned off and the security",
    ";inactive.",
    "",
    " __CONFIG 0x3FFA   ;0x3FFA hex = b'11 1111 1111 1010'",
    "",
    ";  Bits 13 - 4 Code Protect Bits, Bit 3 Power Up Timer, Bit 2 Watch Dog Timer,",
    ";  Bits 1 and 0 are Oscillator Select Bits",
    ";",
    ";=========================================================================",
    ";============================= Equates=====================================",
    "",
    "Keypr      equ 0x0c    ;First DRAM location used as short term storage",
    "",
    ";=========================================================================",
    ";  Information the assembler needs to create proper files and program output",
    "",
    "",
    "   title\"TT Circuit 2\"       ;Title of lab printed on History File",
    "   list p=16f84A           ;Directive telling Assembler which PIC to use",
    "   #include <ETR261.h>     ;Header file to make programming simpler",
    "",
    ";=========================================================================",
    "",
    "           org 00h     ;starting address for the program in PRAM",
    "           goto Start  ;skip over the interrupt address",
    "           org 04h     ;starting address for the start of code",
    "           retfie      ;return from interrupt to take care of an false interrupt",
    "",
    ";=========================================================================",
    "",
    "Start      movlw   0xf0        ;setup PORTA bit0 -bit 4 outputs ",
    "           tris    PORTA",
    "           ",
    "           movlw   0xff        ;setup PORTB all inputs",
    "           tris    PORTB",
    "           movlw   0x0F",
    "           movwf   PORTA",
    "",
    "again      movf    PORTB,W",
    "           movwf   Keypr",
    "           call    KEYPRESS",
    "           goto    again",
    "",
    "KEYPRESS   ",
    "           movf    Keypr,w",
    "           sublw   0x00",
    "           btfss   STATUS,Z",
    "           goto    two",
    "           movlw   0x01",
    "           movwf   PORTA",
    "           return",
    "two        movf    Keypr,w",
    "           sublw   0x01",
    "           btfss   STATUS,Z",
    "           goto    three",
    "           movlw   0x02",
    "           movwf   PORTA",
    "           return",
    "three      movf    Keypr,w",
    "           sublw   0x02",
    "           btfss   STATUS,Z",
    "           goto    four",
    "           movlw   0x03",
    "           movwf   PORTA",
    "           return",
    "four       movf    Keypr,w",
    "           sublw   0x04",
    "           btfss   STATUS,Z",
    "           goto    five",
    "           movlw   0x04",
    "           movwf   PORTA",
    "           return",
    "five       movf    Keypr,w",
    "           sublw   0x05",
    "           btfss   STATUS,Z",
    "           goto    six",
    "           movlw   0x05",
    "           movwf   PORTA",
    "           return",
    "six        movf    Keypr,w",
    "           sublw   0x06",
    "           btfss   STATUS,Z",
    "           goto    seven",
    "           movlw   0x06",
    "           movwf   PORTA",
    "           return",
    "seven      movf    Keypr,w",
    "           sublw   0x08",
    "           btfss   STATUS,Z",
    "           goto    eight",
    "           movlw   0x07",
    "           movwf   PORTA",
    "           return",
    "eight      movf    Keypr,w",
    "           sublw   0x09",
    "           btfss   STATUS,Z",
    "           goto    nine",
    "           movlw   0x08",
    "           movwf   PORTA",
    "           return",
    "nine       movf    Keypr,w",
    "           sublw   0x0A",
    "           btfss   STATUS,Z",
    "           goto    Asterisk",
    "           movlw   0x09",
    "           movwf   PORTA",
    "           return",
    "Asterisk   movf    Keypr,w",
    "           sublw   0x0C",
    "           btfss   STATUS,Z",
    "           goto    zero",
    "           movlw   0x0A",
    "           movwf   PORTA",
    "           return",
    "zero       movf    Keypr,w",
    "           sublw   0x0E",
    "           btfss   STATUS,Z",
    "           goto    Blank",
    "           movlw   0x0D",
    "           movwf   PORTA",
    "           return",
    "Blank      movf    Keypr,w",
    "           sublw   0x0E",
    "           btfss   STATUS,Z",
    "           goto    Pound",
    "           movlw   0x00",
    "           movwf   PORTA",
    "           return",
    "Pound      movf    Keypr,w",
    "           sublw   0x0C",
    "           btfss   STATUS,Z",
    "           return",
    "           movlw   0x0F",
    "           movwf   PORTA",
    "           return",
    "",
    "",
    "           end"
    ].join('\n'),
  js: function (pic) {
    var inputMap, mapRowColToBCD;

    inputMap = {
      0: 1,
      1: 2,
      2: 3,
      3: 0x0f,
      4: 4,
      5: 5,
      6: 6,
      7: 0x0f,
      8: 7,
      9: 8,
      10: 9,
      11: 0x0f,
      12: 0xa,
      13: 0,
      14: 0x0f,
      15: 0x0f
    };

    mapRowColToBCD = function () {
      pic.setPortA(inputMap[pic.getPortB()]);
    };

    return {
      start: function () {
        pic.trisPortA(0xf0);
        pic.trisPortB(0xff);
        pic.setPortA(0x0f);
      },
      loop: [mapRowColToBCD]
    };
  }
});

code.push({
  asm: [
      ";*************************************************************************************",
      ";    Lab Assignment: TT Board 3 ",
      ";    Program File Name: TT Circuit 3",
      ";",
      ";   Software:    ",
      ";   This program converts BCD to 7 segment information for a CA display",
      ";   ",
      ";",
      ";*************************************************************************************",
      "",
      ";======================= Configuration Register Programming =====================",
      ";This loading of the CONFIG register with the WDT turned off and the security",
      ";inactive.",
      "",
      " __CONFIG 0x3FFA ;0x3FFA hex = b'11 1111 1111 1010'",
      "",
      ";  Bits 13 - 4 Code Protect Bits, Bit 3 Power Up Timer, Bit 2 Watch Dog Timer,",
      ";  Bits 1 and 0 are Oscillator Select Bits",
      ";",
      ";=========================================================================",
      ";============================= Equates=====================================",
      "",
      "",
      ";=========================================================================",
      ";  Information the assembler needs to create proper files and program output",
      "",
      "",
      " title\"TT Circuit 3\"       ;Title of lab printed on History File",
      " list p=16f84A           ;Directive telling Assembler which PIC to use",
      " #include <ETR261.h>     ;Header file to make programming simpler",
      "",
      ";=========================================================================",
      "",
      "         org 00h     ;starting address for the program in PRAM",
      "         goto Start  ;skip over the interrupt address",
      "         org 04h     ;starting address for the start of code",
      "         retfie      ;return from interrupt to take care of an false interrupt",
      "",
      ";=========================================================================",
      "",
      "Start                                ",
      "",
      ";============================= Configure Port B ==============================",
      "Start        movlw   0x80        ;all bits as outputs but bit7",
      "     tris    PORTB",
      "     ",
      "     movlw   0xff        ;setup PORTA all inputs",
      "     tris    PORTA",
      ";=========================================================================",
      "",
      "Main     movf    PORTA,W",
      "     call    table",
      "     movwf   PORTB",
      "     goto    Main",
      "                             ",
      "",
      "",
      "table        addwf   PCL",
      "     retlw   0xc0    ;0",
      "     retlw   0xf9    ;1",
      "     retlw   0xa4    ;2",
      "     retlw   0xb0    ;3",
      "     retlw   0x99    ;4",
      "     retlw   0x92    ;5",
      "     retlw   0x83    ;6",
      "     retlw   0xf8    ;7",
      "     retlw   0x80    ;8",
      "     retlw   0x98    ;9",
      "     retlw   0xbf    ;blank",
      "     retlw   0xff    ;blank",
      "     retlw   0xff    ;blank",
      "     retlw   0xff    ;blank",
      "     retlw   0xff    ;blank",
      "     retlw   0xff    ;blank",
      "     ",
      "     end",
      ""
    ].join('\n'),
  js: function (pic) {
    var inputMap, mapBCDTo7SegmentDisplay;

    inputMap = {
      0: 0xc0,
      1: 0xf9,
      2: 0xa4,
      3: 0xb0,
      4: 0x99,
      5: 0x92,
      6: 0x83,
      7: 0xf8,
      8: 0x80,
      9: 0x98,
      10: 0xbf,
      11: 0xff,
      12: 0xff,
      13: 0xff,
      14: 0xff,
      15: 0xff
    };

    mapBCDTo7SegmentDisplay = function () {
      pic.setPortB(inputMap[pic.getPortA()]);
    };

    return {
      start: function () {
        pic.trisPortA(0xff);
        pic.trisPortB(0x80);
      },
      loop: [mapBCDTo7SegmentDisplay]
    };
  }
});

module.exports = code;


},{}],8:[function(require,module,exports){
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


},{}],9:[function(require,module,exports){
module.exports = function() {
  try {
    return window.self !== window.top;
  }
  catch (e) {
    return true;
  }
};


},{}],10:[function(require,module,exports){
// culled from http://godsnotwheregodsnot.blogspot.ru/2013/11/kmeans-color-quantization-seeding.html
module.exports = ["#FF4A46","#008941","#006FA6","#A30059","#7A4900","#0000A6","#B79762","#004D43","#8FB0FF","#997D87","#5A0007","#809693","#FEFFE6","#1B4400","#4FC601","#3B5DFF","#4A3B53","#FF2F80","#61615A","#BA0900","#6B7900","#00C2A0","#FFAA92","#FF90C9","#B903AA","#D16100","#DDEFFF","#000035","#7B4F4B","#A1C299","#300018","#0AA6D8","#013349","#00846F","#372101","#FFB500","#C2FFED","#A079BF","#CC0744","#C0B9B2","#C2FF99","#001E09","#00489C","#6F0062","#0CBD66","#EEC3FF","#456D75","#B77B68","#7A87A1","#788D66","#885578","#FAD09F","#FF8A9A","#D157A0","#BEC459","#456648","#0086ED","#886F4C","#34362D","#B4A8BD","#00A6AA","#452C2C","#636375","#A3C8C9","#FF913F","#938A81","#575329","#00FECF","#B05B6F","#8CD0FF","#3B9700","#04F757","#C8A1A1","#1E6E00","#7900D7","#A77500","#6367A9","#A05837","#6B002C","#772600","#D790FF","#9B9700","#549E79","#FFF69F","#201625","#72418F","#BC23FF","#99ADC0","#3A2465","#922329","#5B4534","#FDE8DC","#404E55","#0089A3","#CB7E98","#A4E804","#324E72","#6A3A4C","#83AB58","#001C1E","#D1F7CE","#004B28","#C8D0F6","#A3A489","#806C66","#222800","#BF5650","#E83000","#66796D","#DA007C","#FF1A59","#8ADBB4","#1E0200","#5B4E51","#C895C5","#320033","#FF6832","#66E1D3","#CFCDAC","#D0AC94","#7ED379","#012C58","#7A7BFF","#D68E01","#353339","#78AFA1","#FEB2C6","#75797C","#837393","#943A4D","#B5F4FF","#D2DCD5","#9556BD","#6A714A","#001325","#02525F","#0AA3F7","#E98176","#DBD5DD","#5EBCD1","#3D4F44","#7E6405","#02684E","#962B75","#8D8546","#9695C5","#E773CE","#D86A78","#3E89BE","#CA834E","#518A87","#5B113C","#55813B","#E704C4","#00005F","#A97399","#4B8160","#59738A","#FF5DA7","#F7C9BF","#643127","#513A01","#6B94AA","#51A058","#A45B02","#1D1702","#E20027","#E7AB63","#4C6001","#9C6966","#64547B","#97979E","#006A66","#391406","#F4D749","#0045D2","#006C31","#DDB6D0","#7C6571","#9FB2A4","#00D891","#15A08A","#BC65E9","#FFFFFE","#C6DC99","#203B3C","#671190","#6B3A64","#F5E1FF","#FFA0F2","#CCAA35","#374527","#8BB400","#797868","#C6005A","#3B000A","#C86240","#29607C","#402334","#7D5A44","#CCB87C","#B88183","#AA5199","#B5D6C3","#A38469","#9F94F0","#A74571","#B894A6","#71BB8C","#00B433","#789EC9","#6D80BA","#953F00","#5EFF03","#E4FFFC","#1BE177","#BCB1E5","#76912F","#003109","#0060CD","#D20096","#895563","#29201D","#5B3213","#A76F42","#89412E","#1A3A2A","#494B5A","#A88C85","#F4ABAA","#A3F3AB","#00C6C8","#EA8B66","#958A9F","#BDC9D2","#9FA064","#BE4700","#658188","#83A485","#453C23","#47675D","#3A3F00","#061203","#DFFB71","#868E7E","#98D058","#6C8F7D","#D7BFC2","#3C3E6E","#D83D66","#2F5D9B","#6C5E46","#D25B88","#5B656C","#00B57F","#545C46","#866097","#365D25","#252F99","#00CCFF","#674E60","#FC009C","#92896B"];

},{}],11:[function(require,module,exports){
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
    y: this.layout.y,
    width: 150,
    height: 75
  };

  switch (this.type) {
    case '7402':
      outputPins = [0, 3, 9, 12, 13];
      break;
    case '7404':
      outputPins = [1, 3, 5, 6, 7, 9, 11, 13];
      break;
    case '7411':
      outputPins = [5, 6, 7, 11, 13];
      break;
    default:
      outputPins = [2, 5, 6, 7, 10, 13];
      break;
  }

  this.pins = [];
  this.pinMap = {};
  for (i = 0; i < 14; i++) {
    pin = {
      number: i,
      voltage: i == 13 ? TTL.HIGH_VOLTAGE : TTL.LOW_VOLTAGE,
      inputMode: outputPins.indexOf(i) === -1,
      placement: i < 7 ? 'bottom' : 'top',
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
LogicChip.prototype.calculatePosition = function (constants, selected) {
  var selectedConstants = constants.selectedConstants(selected),
      position = this.position,
      pinDX, pinDY, i, j, pin, pinNumber, xOffset, y;

  pinDX = (position.width - (selectedConstants.PIN_WIDTH * 7)) / 8;

  for (i = 0; i < 2; i++) {
    y = i === 0 ? position.y + position.height : position.y - selectedConstants.PIN_HEIGHT;
    pinDY = i === 0 ? -(selectedConstants.PIN_HEIGHT / 2) : 2 * selectedConstants.PIN_HEIGHT;

    for (j = 0; j < 7; j++) {
      pinNumber = (i * 7) + j;
      pin = this.pins[pinNumber];
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
    // Quad 2-Input NAND
    case '7400':
      this.mapAndSetPins(this.standardPinConnections, function (a, b) {
        if (TTL.isInvalid(a) || TTL.isInvalid(b)) {
          return TTL.INVALID;
        }
        return TTL.getBooleanLogicLevel(!(TTL.isHigh(a) && TTL.isHigh(b)));
      });
      break;

    // Quad 2-Input NOR
    case '7402':
      this.mapAndSetPins([
        [[2, 3], 1],
        [[5, 6], 4],
        [[9, 8], 10],
        [[12, 11], 13]
      ], function (a, b) {
        return TTL.getBooleanLogicLevel(!(TTL.isHigh(a) || TTL.isHigh(b)));
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

    // Quad 2-input AND
    case '7408':
      this.mapAndSetPins(this.standardPinConnections, function (a, b) {
        if (TTL.isInvalid(a) || TTL.isInvalid(b)) {
          return TTL.INVALID;
        }
        return TTL.getBooleanLogicLevel(TTL.isHigh(a) && TTL.isHigh(b));
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
LogicChip.prototype.setBoard = function (board) {
  var i;
  this.board = board;
  for (i = 0; i < this.pins.length; i++) {
    this.pins[i].board = board;
  }
};


module.exports = LogicChip;


},{"../../views/logic-gates/logic-chip":27,"../shared/pin":23,"../shared/ttl":24}],13:[function(require,module,exports){
var Button = function (options) {
  this.value = options.value;
  this.intValue = options.intValue;
  this.x = options.x;
  this.y = options.y;
  this.cx = options.x + (options.width / 2);
  this.cy = options.y + (options.height / 2);
  this.height = options.height;
  this.width = options.width;
  this.labelSize = options.labelSize;
  this.label = options.label;
  this.component = options.component;
};

module.exports = Button;


},{}],14:[function(require,module,exports){
var KeypadView = React.createFactory(require('../../views/pic/keypad')),
    Pin = require('../shared/pin'),
    TTL = require('../shared/ttl'),
    Button = require('./button'),
    layout = require('../../views/shared/layout');

var Keypad = function () {
  var i, pin, button, values;

  this.name = 'keypad';
  this.view = KeypadView;

  this.pushedButton = null;

  this.pins = [];
  this.pinMap = {};
  for (i = 0; i < 7; i++) {
    pin = {
      number: i,
      inputMode: i > 2,
      placement: i < 3 ? 'top' : 'right',
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      labelSize: 0,
      component: this,
      bezierReflection: 1
    };
    pin.label = {
      x: 0,
      y: 0,
      anchor: 'end',
      //text: ['RB0', 'RB1', 'RB2', 'RB3', 'RB4', 'RB5', 'RB6'][i]
      text: ['COL0', 'COL1', 'COL2', 'ROW0', 'ROW1', 'ROW2', 'ROW3'][i],
      color: '#000'
    };
    pin = new Pin(pin);
    this.pins.push(pin);
    this.pinMap[pin.label.text] = pin;
  }

  values = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  this.buttons = [];
  for (i = 0; i < 12; i++) {
    button = {
      value: values[i],
      intValue: parseInt(values[i]),
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      labelSize: 0,
      component: this
    };
    button.label = {
      x: 0,
      y: 0,
      anchor: 'middle',
      text: values[i],
    };
    this.buttons.push(new Button(button));
  }
  this.bottomButtonValues = [this.buttons[9].value, this.buttons[10].value, this.buttons[11].value];

  this.listeners = [];
};
Keypad.prototype.calculatePosition = function (constants, selected, index, count) {
  var selectedConstants = constants.selectedConstants(selected),
      padWidth, padHeight, i, pin, j, button, buttonWidth, buttonHeight, buttonDX, buttonDY;

  this.position = layout.calculateComponentRect(constants, selected, index, count, selectedConstants.COMPONENT_WIDTH * 1.5, selectedConstants.COMPONENT_HEIGHT * 1.5);

  padWidth = this.position.width * 0.8;
  padHeight = this.position.height * 0.9;

  this.position.pad = {
    x: this.position.x + ((this.position.width - padWidth) / 2),
    y: this.position.y + ((this.position.height - padHeight) / 2),
    width: padWidth,
    height: padHeight
  };

  // buttons
  buttonWidth = padWidth / 5;
  buttonHeight = buttonWidth;
  buttonDX = (padWidth - (buttonWidth * 3)) / 4;
  buttonDY = (padHeight - (buttonHeight * 4)) / 5;

  for (i = 0; i < 3; i++) {
    for (j = 0; j < 4; j++) {
      button = this.buttons[(j * 3) + i];
      button.x = this.position.pad.x + buttonDX + (i * (buttonWidth + buttonDX));
      button.y = this.position.pad.y + buttonDY + (j * (buttonHeight + buttonDY));
      button.cx = button.x + (buttonWidth / 2);
      button.cy = button.y + (buttonHeight / 2);
      button.height = buttonWidth;
      button.width = buttonHeight;
      button.labelSize = selectedConstants.BUTTON_FONT_SIZE;
      button.label.x = (button.x + (buttonWidth / 2));
      button.label.y = (button.y + ((buttonHeight + selectedConstants.BUTTON_FONT_SIZE) / 2.25));
    }
  }

  // upper pins
  for (i = 0; i < 3; i++) {
    pin = this.pins[i];
    pin.x = this.buttons[i].cx - (selectedConstants.PIN_WIDTH / 2);
    pin.y = this.position.pad.y - selectedConstants.PIN_HEIGHT;
    pin.label.x = pin.x + (selectedConstants.PIN_WIDTH / 2);
    pin.label.y = this.position.pad.y - (1.5 * selectedConstants.PIC_FONT_SIZE);
    pin.label.anchor = 'middle';
  }

  // right side pins
  for (i = 3; i < this.pins.length; i++) {
    pin = this.pins[i];
    pin.x = this.position.pad.x + this.position.pad.width;
    pin.y = this.buttons[(i - 3) * 3].cy - (selectedConstants.PIN_HEIGHT / 2);
    pin.label.x = pin.x + (1.5  * selectedConstants.PIN_WIDTH);
    pin.label.y = pin.y + ((selectedConstants.PIN_HEIGHT + selectedConstants.PIC_FONT_SIZE) / 2.25);
    pin.label.anchor = 'start';
  }

  // update all pins
  for (i = 0; i < this.pins.length; i++) {
    pin = this.pins[i];
    pin.cx = pin.x + (selectedConstants.PIN_WIDTH / 2);
    pin.cy = pin.y + (selectedConstants.PIN_HEIGHT / 2);
    pin.width = selectedConstants.PIN_WIDTH;
    pin.height = selectedConstants.PIN_HEIGHT;
    pin.labelSize = selectedConstants.PIC_FONT_SIZE;
  }
};
Keypad.prototype.addListener = function (listener) {
  this.listeners.push(listener);
};
Keypad.prototype.removeListener = function (listener) {
  this.listeners.splice(this.listeners.indexOf(listener), 1);
};
Keypad.prototype.notify = function () {
  var i;
  for (i = 0; i < this.listeners.length; i++) {
    this.listeners[i](this);
  }
};
Keypad.prototype.reset = function () {
};
Keypad.prototype.pushButton = function (button, skipNotify) {
  this.pushedButton = button;
  if (!skipNotify) {
    this.notify();
  }
};
Keypad.prototype.selectButtonValue = function (value, skipNotify) {
  var self = this;
  $.each(this.buttons, function (index, button) {
    if (button.value == value) {
      self.pushButton(button, skipNotify);
      return false;
    }
  });
};
Keypad.prototype.getPushedButtonValue = function () {
  return this.pushedButton ? this.pushedButton.value : null;
};
Keypad.prototype.resolveOutputVoltages = function () {
  var colValue = 7,
      intValue, bottomButtonIndex;

  if (this.pushedButton) {
    intValue = this.pushedButton.intValue;
    bottomButtonIndex = this.bottomButtonValues.indexOf(this.pushedButton.value);

    if (this.pinMap.ROW0.isLow() && ((intValue >= 1) && (intValue <= 3))) {
      colValue = colValue & ~(1 << (intValue - 1));
    }
    else if (this.pinMap.ROW1.isLow() && ((intValue >= 4) && (intValue <= 6))) {
      colValue = colValue & ~(1 << (intValue - 4));
    }
    else if (this.pinMap.ROW2.isLow() && ((intValue >= 7) && (intValue <= 9))) {
      colValue = colValue & ~(1 << (intValue - 7));
    }
    else if (this.pinMap.ROW3.isLow() && (bottomButtonIndex !== -1)) {
      colValue = colValue & ~(1 << bottomButtonIndex);
    }
  }

  this.pinMap.COL0.setVoltage(TTL.getBooleanVoltage(colValue & 1));
  this.pinMap.COL1.setVoltage(TTL.getBooleanVoltage(colValue & 2));
  this.pinMap.COL2.setVoltage(TTL.getBooleanVoltage(colValue & 4));
};

module.exports = Keypad;


},{"../../views/pic/keypad":33,"../../views/shared/layout":46,"../shared/pin":23,"../shared/ttl":24,"./button":13}],15:[function(require,module,exports){
var LEDView = React.createFactory(require('../../views/pic/led')),
    Pin = require('../shared/pin'),
    Segment = require('./segment'),
    layout = require('../../views/shared/layout');

var LED = function () {
  var i, pin, segmentLayoutMap, segment;

  this.name = 'led';
  this.view = LEDView;

  this.pins = [];
  this.pinMap = {};
  for (i = 0; i < 10; i++) {
    pin = {
      number: i,
      inputMode: true,
      placement: i < 5 ? 'top' : 'bottom',
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      labelSize: 0,
      component: this,
      notConnectable: [2, 7].indexOf(i) !== -1
    };
    pin.label = {
      x: 0,
      y: 0,
      anchor: 'end',
      text: ['g', 'f', 'ca', 'a', 'b', 'e', 'd', 'ca', 'c', 'DP'][i],
      color: '#fff'
    };
    pin = new Pin(pin);
    this.pins.push(pin);
    this.pinMap[pin.label.text] = pin;
  }

  this.segments = [];
  segmentLayoutMap = [
    {x: 0, y: 0, rotation: 0},
    {x: 1, y: 0, rotation: 90},
    {x: 1, y: 1, rotation: 90},
    {x: 0, y: 2, rotation: 0},
    {x: 0, y: 1, rotation: 90},
    {x: 0, y: 0, rotation: 90},
    {x: 0, y: 1, rotation: 0}
  ];
  for (i = 0; i < 7; i++) {
    segment = {
      number: i,
      layout: segmentLayoutMap[i],
      component: this,
      pin: this.pinMap[['a', 'b', 'c', 'd', 'e', 'f', 'g', 'DP'][i]]
    };
    this.segments.push(new Segment(segment));
  }

  this.decimalPoint = {
    layout: {x: 1, y: 2}
  };
};
LED.prototype.calculatePosition = function (constants, selected, index, count) {
  var selectedConstants = constants.selectedConstants(selected),
      displayWidth, displayHeight, i, pin, pinDX, segmentWidth, segmentHeight, segment, pathCommands, endCapSize, p;

  this.position = layout.calculateComponentRect(constants, selected, index, count);

  displayWidth = this.position.width * 0.8;
  displayHeight = this.position.height * 0.9;

  this.position.display = {
    x: this.position.x + ((this.position.width - displayWidth) / 2),
    y: this.position.y + ((this.position.height - displayHeight) / 2),
    width: displayWidth,
    height: displayHeight
  };

  // pins
  pinDX = (this.position.display.width - (selectedConstants.PIN_WIDTH * 5)) / 6;
  for (i = 0; i < this.pins.length; i++) {
    pin = this.pins[i];
    pin.x = this.position.display.x + pinDX + ((i % (this.pins.length / 2)) * (selectedConstants.PIN_WIDTH + pinDX));
    pin.y = i < 5 ? this.position.display.y - selectedConstants.PIN_HEIGHT : this.position.display.y + this.position.display.height;
    pin.cx = pin.x + (selectedConstants.PIN_WIDTH / 2);
    pin.cy = pin.y + (selectedConstants.PIN_HEIGHT / 2);
    pin.width = selectedConstants.PIN_WIDTH;
    pin.height = selectedConstants.PIN_HEIGHT;
    pin.labelSize = selectedConstants.PIC_FONT_SIZE;
    pin.label.x = pin.x + (selectedConstants.PIN_WIDTH / 2);
    pin.label.y = i < 5 ? this.position.display.y + (1.5 * selectedConstants.PIC_FONT_SIZE) : this.position.display.y + this.position.display.height - (0.75 * selectedConstants.PIC_FONT_SIZE);
    pin.label.anchor = 'middle';
  }

  // segments
  segmentWidth = this.position.display.width / 3;
  segmentHeight = this.position.display.width / 12;
  p = this.position.segments = {
    x: this.position.display.x + ((this.position.display.width - segmentWidth) / 2),
    y: this.position.display.y + ((this.position.display.height - (segmentWidth * 2)) / 2) - (segmentHeight / 2), // y is rotated to width = height
    segmentWidth: segmentWidth,
    segmentHeight: segmentHeight
  };

  endCapSize = segmentHeight / 2;
  pathCommands = [
    'M', p.x, ',', p.y + endCapSize, ' ',
    'L', p.x + endCapSize, ',', p.y, ' ',
    'L', p.x + segmentWidth - endCapSize, ',', p.y, ' ',
    'L', p.x + segmentWidth, ',', p.y + endCapSize, ' ',
    'L', p.x + segmentWidth - endCapSize, ',', p.y + segmentHeight, ' ',
    'L', p.x + endCapSize, ',', p.y + segmentHeight, ' ',
    'L', p.x, ',', p.y + endCapSize, ' '
  ].join('');

  for (i = 0; i < this.segments.length; i++) {
    segment = this.segments[i];
    segment.transform = ['translate(', segment.layout.x * segmentWidth, ',', segment.layout.y * segmentWidth, ')'].join('');
    if (segment.layout.rotation) {
      segment.transform = [segment.transform, ' rotate(', segment.layout.rotation, ' ', this.position.segments.x, ' ', this.position.segments.y + (segmentHeight / 2), ')'].join('');
    }
    segment.pathCommands = pathCommands;
  }

  this.decimalPoint.cx = this.position.segments.x + segmentWidth + segmentHeight + endCapSize;
  this.decimalPoint.cy = this.position.segments.y + (2 * segmentWidth) + endCapSize;
  this.decimalPoint.radius = endCapSize;
};
LED.prototype.reset = function () {
  // nothing to do for LED
};
LED.prototype.resolveOutputVoltages = function () {
  // nothing to do for LED
};
LED.prototype.getPinBitField = function () {
  var bitfield = 0,
      i;
  for (i = 0; i < this.pins.length; i++) {
    bitfield = bitfield | ((this.pins[i].isHigh() ? 1 : 0) << i);
  }
  return bitfield;
};

module.exports = LED;


},{"../../views/pic/led":34,"../../views/shared/layout":46,"../shared/pin":23,"./segment":17}],16:[function(require,module,exports){
var PICView = React.createFactory(require('../../views/pic/pic')),
    Pin = require('../shared/pin'),
    TTL = require('../shared/ttl'),
    layout = require('../../views/shared/layout');

var PIC = function (options) {
  var i, pin, notConnectable;

  this.name = 'pic';
  this.view = PICView;
  this.board = options.board;
  this.resolver = options.resolver;

  this.pins = [];
  this.pinMap = {};
  for (i = 0; i < 18; i++) {
    notConnectable = [3, 4, 11, 12, 13].indexOf(i) !== -1;

    pin = {
      number: i,
      voltage: [3, 11, 12, 13].indexOf(i) !== -1 ? TTL.HIGH_VOLTAGE : TTL.LOW_VOLTAGE,
      inputMode: !notConnectable,
      placement: i < 9 ? 'left' : 'right',
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      labelSize: 0,
      component: this,
      notConnectable: notConnectable
    };
    pin.label = {
      x: 0,
      y: 0,
      anchor: 'end',
      text: ['RA2', 'RA3', 'RA4', 'MCL', 'GND', 'RB0', 'RB1', 'RB2', 'RB3', 'RA1', 'RA0', 'XTAL', 'XTAL', 'VCC', 'RB7', 'RB6', 'RB5', 'RB4'][i],
      color: '#fff'
    };
    pin = new Pin(pin);
    this.pins.push(pin);
    this.pinMap[pin.label.text] = pin;
  }

  // in reverse order so we can scan it quickly in the getter/setter
  this.portAPins = [this.pinMap.RA0, this.pinMap.RA1, this.pinMap.RA2, this.pinMap.RA3, this.pinMap.RA4];
  this.portBPins = [this.pinMap.RB0, this.pinMap.RB1, this.pinMap.RB2, this.pinMap.RB3, this.pinMap.RB4, this.pinMap.RB5, this.pinMap.RB6, this.pinMap.RB7];

  this.ip = 0;
  this.code = options.code;
  this.emulator = options.code.js(this);
};
PIC.prototype.reset = function () {
  this.ip = 0;
  this.trisPortA(0xff);
  this.trisPortB(0xff);
  this.emulator.start();
};
PIC.prototype.calculatePosition = function (constants, selected, index, count) {
  var selectedConstants = constants.selectedConstants(selected),
      chipWidth, pinDY, i, j, pin, pinNumber;

  this.position = layout.calculateComponentRect(constants, selected, index, count);

  chipWidth = this.position.width / 2;

  this.position.chip = {
    x: this.position.x + (chipWidth / 2),
    y: this.position.y,
    width: chipWidth,
    height: this.position.height
  };

  pinDY = (this.position.chip.height - (selectedConstants.PIN_WIDTH * 9)) / 10;

  for (i = 0; i < 2; i++) {
    for (j = 0; j < 9; j++) {
      pinNumber = (i * 9) + j;
      pin = this.pins[pinNumber];
      pin.x = (this.position.chip.x - selectedConstants.PIN_WIDTH) + (i * (this.position.chip.width + selectedConstants.PIN_WIDTH));
      pin.y = this.position.chip.y + pinDY + (j * (selectedConstants.PIN_HEIGHT + pinDY));
      pin.cx = pin.x + (selectedConstants.PIN_WIDTH / 2);
      pin.cy = pin.y + (selectedConstants.PIN_HEIGHT / 2);
      pin.width = selectedConstants.PIN_WIDTH;
      pin.height = selectedConstants.PIN_HEIGHT;
      pin.labelSize = selectedConstants.PIC_FONT_SIZE;
      pin.label.x = pin.x + ((i ? -0.5 : 1.5) * selectedConstants.PIN_WIDTH);
      pin.label.y = pin.y + ((selectedConstants.PIN_HEIGHT + pin.labelSize) / 2.25);
      pin.label.anchor = i ? 'end' : 'start';
    }
  }
};
PIC.prototype.resolveOutputVoltages = function () {
  // nothing to do here for the pic
};
PIC.prototype.evaluateCurrentPICInstruction = function () {
  var restartLoop = false;
  if (this.ip < this.emulator.loop.length) {
    restartLoop = this.emulator.loop[this.ip]();
  }
  this.ip = restartLoop ? 0 : (this.ip + 1) % this.emulator.loop.length;
  return restartLoop;
};
PIC.prototype.evaluateRemainingPICInstructions = function () {
  var restartLoop = false;
  while (!restartLoop && (this.ip < this.emulator.loop.length)) {
    restartLoop = this.emulator.loop[this.ip]();
    this.ip++;
  }
  this.ip = 0;
};
PIC.prototype.trisPortA = function (mask) {
  this.setPinListInputMode(this.portAPins, mask);
};
PIC.prototype.trisPortB = function (mask) {
  this.setPinListInputMode(this.portBPins, mask);
};
PIC.prototype.getPortA = function () {
  return this.getPinListValue(this.portAPins);
};
PIC.prototype.getPortB = function () {
  return this.getPinListValue(this.portBPins);
};
PIC.prototype.setPortA = function (value) {
  this.setPinListValue(this.portAPins, value);
};
PIC.prototype.setPortB = function (value) {
  this.setPinListValue(this.portBPins, value);
};
PIC.prototype.getPinListValue = function (list) {
  var value = 0,
      i;

  if (this.hasResolver()) {
    this.board.resolver.resolveComponentOutputVoltages();
  }
  for (i = 0; i < list.length; i++) {
    value = value | ((list[i].inputMode && list[i].isHigh() ? 1 : 0) << i);
  }
  return value;
};
PIC.prototype.setPinListValue = function (list, value) {
  var i, outputMode;
  for (i = 0; i < list.length; i++) {
    outputMode = !list[i].inputMode;
    list[i].setVoltage(TTL.getBooleanVoltage(outputMode && (value & (1 << i))));
  }
  this.resolve();
};
PIC.prototype.setPinListInputMode = function (list, mask) {
  var i;
  for (i = 0; i < list.length; i++) {
    list[i].inputMode = !!(mask & (1 << i));
  }
  this.resolve();
};
PIC.prototype.hasResolver = function () {
  return this.board && this.board.resolver;
};
PIC.prototype.resolve = function () {
  if (this.hasResolver()) {
    this.board.resolver.resolve();
  }
};
PIC.prototype.setBoard = function (board) {
  var i;
  this.board = board;
  for (i = 0; i < this.pins.length; i++) {
    this.pins[i].board = board;
  }
};

module.exports = PIC;


},{"../../views/pic/pic":35,"../../views/shared/layout":46,"../shared/pin":23,"../shared/ttl":24}],17:[function(require,module,exports){
var Segment = function (options) {
  this.index = options.index;
  this.layout = options.layout;
  this.component = options.component;
  this.pin = options.pin;
};

module.exports = Segment;


},{}],18:[function(require,module,exports){
var Hole = require('./hole'),
    Pin = require('./pin'),
    Wire = require('./wire'),
    LogicChip =  require('../logic-gates/logic-chip');

var Board = function (options) {
  this.number = options.number;
  this.components = options.components;
  this.connectors = options.connectors;
  this.bezierReflectionModifier = options.bezierReflectionModifier;
  this.logicDrawer = options.logicDrawer;
  this.wires = [];
  this.fixedComponents = options.fixedComponents || false;
  this.updateComponentList();

  this.resolver = options.resolver;
  if (this.resolver) {
    this.resolver.updateComponents();
  }

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
    if (connector) {
      for (var i = 0; i < connector.holes.length; i++) {
        self.pinsAndHoles.push(connector.holes[i]);
      }
    }
  });

  if (this.resolver) {
    this.resolver.updateComponents();
  }
};
Board.prototype.clear = function () {
  var i;
  this.wires = [];
  if (!this.fixedComponents) {
    this.components = {};
    this.updateComponentList();
  }
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
Board.prototype.updateInputs = function (newInputs) {
  var input = this.connectors.input,
      length = Math.min(newInputs.length, input.count),
      i;
  for (i = 0; i < length; i++) {
    input.holes[i].setForcedVoltage(newInputs[i]);
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
  var numSourceConnections = 0,
      numDestConnections = 0,
      i;

  // determine the number of wires connected at the source and dest endpoints
  for (i = 0; i < this.wires.length; i++) {
    if (this.wires[i].source == source) {
      numSourceConnections++;
    }
    if (this.wires[i].dest == dest) {
      numDestConnections++;
    }
  }

  for (i = 0; i < this.wires.length; i++) {
    if (this.wires[i].connects(source, dest)) {
      // set as disconnected if this is the only wire connected to the endpoint
      this.wires[i].source.connected = (numSourceConnections > 1);
      this.wires[i].dest.connected = (numDestConnections > 1);
      if (this.wires[i].source.inputMode) {
        this.wires[i].source.reset();
      }
      if (this.wires[i].dest.inputMode) {
        this.wires[i].dest.reset();
      }
      this.wires.splice(i, 1);
      this.resolver.rewire();
      this.resolver.resolve();
      return true;
    }
  }
  return false;
};
Board.prototype.addWire = function (source, dest, color, skipResolver) {
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
    color: '#ffa500' // color used to be settable but is now forced
  });
  this.wires.push(wire);
  if (!skipResolver) {
    this.resolver.rewire();
  }
  source.connected = true;
  dest.connected = true;
  return wire;
};
Board.prototype.addComponent = function (name, component) {
  component.name = name;
  component.setBoard(this);
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
      wiresToRemove = [],
      currentSerializedComponents, i, j, name, component, wire;

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
    component = this.components[name];

    for (j = 0; j < this.wires.length; j++) {
      wire = this.wires[j];
      if ((wire.source.component == component) || (wire.dest.component == component)) {
        // this is pushed instead of directly removed because this.removeWire() alters this.wires and we are looping over it here
        wiresToRemove.push(wire);
      }
    }
    for (j = 0; j < wiresToRemove.length; j++) {
      wire = wiresToRemove[j];
      this.removeWire(wire.source, wire.dest);
    }

    delete this.components[name];
  }
  $.each(newSerializedComponents, function (name, serializeComponent) {
    var component;

    if (serializeComponent.type == 'logic-chip') {
      component = new LogicChip({type: serializeComponent.chipType, layout: {x: serializeComponent.x, y: serializeComponent.y}});
      self.addComponent(name, component);
    }
  });

  this.updateComponentList();
};
Board.prototype.serializeInputs = function () {
  var serialized = [];
  $.each(this.connectors.input.holes, function (index, hole) {
    serialized.push(hole.getVoltage());
  });
  return serialized;
};

module.exports = Board;


},{"../logic-gates/logic-chip":12,"./hole":22,"./pin":23,"./wire":25}],19:[function(require,module,exports){
var Circuit = require("./circuit"),
    Connector = require("./connector"),
    Wire = require("./wire");

var CircuitResolver = function (options) {
  var i;

  this.boards = options.boards || [];
  this.circuits = [];
  this.components = [];
  this.busSize = options.busSize || 0;
  this.busInputSize = options.busInputSize || 0;
  this.busOutputSize = options.busOutputSize || 0;
  this.busOutputStartIndex = this.busSize - this.busOutputSize;

  // wire the global i/o up
  this.input = options.busInputSize > 0 ? new Connector({type: 'input', count: options.busInputSize}) : null;
  this.output = options.busOutputSize > 0 ? new Connector({type: 'output', count: options.busOutputSize}) : null;

  this.inputIndices = [];
  this.outputIndices = [];
  for (i = 0; i < this.busInputSize; i++) {
    this.inputIndices.push(i);
  }
  for (i = this.busOutputStartIndex; i < this.busSize; i++) {
    this.outputIndices.push(i);
  }
};
CircuitResolver.prototype.rewire = function (includeGlobalIO) {
  var graph = {},
      isBusHole, addToGraph, addToCircuit, addBusWire;

  isBusHole = function (endPoint) {
    return endPoint.connector && (endPoint.connector.type == 'bus');
  };

  addToGraph = function (source, dest, wire) {
    var key = source.toString();
    if (!graph[key]) {
      graph[key] = {
        endPoint: source,
        adjacent: [],
        visited: false
      };
    }
    graph[key].adjacent.push({endPoint: dest, wire: wire});
  };

  addToCircuit = function (key, circuit) {
    var node = graph[key],
        i, adjacent, adjacentKey;

    node.visited = true;
    (node.endPoint.inputMode ? circuit.inputs : circuit.outputs).push(node.endPoint);
    for (i = 0; i < node.adjacent.length; i++) {
      adjacent = node.adjacent[i];
      adjacentKey = adjacent.endPoint.toString();
      if (!graph[adjacentKey].visited) {
        addToCircuit(adjacentKey, circuit);
      }
    }
  };

  addBusWire = function (options) {
    var busWire = new Wire({
      source: options.source,
      dest: options.dest
    });
    addToGraph(busWire.source, busWire.dest, busWire);
    addToGraph(busWire.dest, busWire.source, busWire);
  };

  // clear the existing circuits
  this.circuits = [];

  // create a graph of all the wire end points
  this.forEach(this.boards, function (board) {
    this.forEach(board.wires, function (wire) {
      var sourceOnBus = isBusHole(wire.source),
          destOnBus = isBusHole(wire.dest),
          sourceIsGlobalInput = sourceOnBus && (this.inputIndices.indexOf(wire.source.index) != -1),
          sourceIsGlobalOutput = sourceOnBus && (this.outputIndices.indexOf(wire.source.index) != -1),
          destIsGlobalInput = destOnBus && (this.inputIndices.indexOf(wire.dest.index) != -1),
          destIsGlobalOutput = destOnBus && (this.outputIndices.indexOf(wire.dest.index) != -1);

      addToGraph(wire.source, wire.dest, wire);
      addToGraph(wire.dest, wire.source, wire);

      // create the bus ghost wires
      if (sourceOnBus || destOnBus) {
        this.forEach(this.boards, function (otherBoard) {
          // wire this board to the other boards
          if (board != otherBoard) {
            addBusWire({
              source: sourceOnBus ? otherBoard.connectors.bus.holes[wire.source.index] : wire.source,
              dest: destOnBus ? otherBoard.connectors.bus.holes[wire.dest.index] : wire.dest
            });
          }

          // wire this board to the global i/o
          if (includeGlobalIO && (sourceIsGlobalInput || sourceIsGlobalOutput || destIsGlobalInput || destIsGlobalOutput)) {
            addBusWire({
              source: sourceIsGlobalInput ? this.input.holes[wire.source.index] : (sourceIsGlobalOutput ? this.output.holes[wire.source.index - this.busOutputStartIndex] : wire.source),
              dest: destIsGlobalInput ? this.input.holes[wire.dest.index] : (destIsGlobalOutput ? this.output.holes[wire.dest.index - this.busOutputStartIndex] : wire.dest)
            });
          }
        });
      }
    });
  });

  // search the graph to find all circuits
  this.forEach(Object.keys(graph), function (key) {
    var circuit;
    if (!graph[key].visited) {
      circuit = new Circuit({inputs: [], outputs: []});
      this.circuits.push(circuit);
      addToCircuit(key, circuit);
    }
  });

  // resolve all the circuits
  this.resolve();
};
CircuitResolver.prototype.forEach = function(list, fn) {
  var i;
  for (i = 0; i < list.length; i++) {
    fn.call(this, list[i], i);
  }
};
CircuitResolver.prototype.updateComponents = function () {
  this.components = [];
  this.forEach(this.boards, function (board) {
    this.forEach(board.componentList, function (component) {
      this.components.push(component);
    });
  });
};
CircuitResolver.prototype.resolveCircuitInputVoltages = function () {
  this.forEach(this.circuits, function (circuit) {
    circuit.resolveInputVoltages();
  });
};
CircuitResolver.prototype.resolveComponentOutputVoltages = function () {
  this.forEach(this.components, function (component) {
    component.resolveOutputVoltages();
  });
};
CircuitResolver.prototype.resolveCircuitOutputVoltages = function () {
  this.forEach(this.circuits, function (circuit) {
    circuit.resolveOutputVoltages();
  });
};
CircuitResolver.prototype.resolve = function () {
  this.forEach(this.components, function () {
    this.resolveCircuitInputVoltages();
    this.resolveComponentOutputVoltages();
    this.resolveCircuitOutputVoltages();
    this.resolveCircuitInputVoltages(); // this sets the global output
  });
};


module.exports = CircuitResolver;


},{"./circuit":20,"./connector":21,"./wire":25}],20:[function(require,module,exports){
var Circuit = function (options) {
  this.inputs = options.inputs;
  this.outputs = options.outputs;
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

Circuit.prototype.toString = function () {
  var inputs = [],
      outputs = [],
      i;

  for (i = 0; i < this.inputs.length; i++) {
    inputs.push(this.inputs[i].toString() + ' = ' + this.inputs[i].getVoltage());
  }
  for (i = 0; i < this.outputs.length; i++) {
    outputs.push(this.outputs[i].toString() + ' = ' + this.outputs[i].getVoltage());
  }
  return JSON.stringify({inputs: inputs, outputs: outputs});
};

module.exports = Circuit;


},{}],21:[function(require,module,exports){
var Hole = require('./hole');

var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

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
      label: letters[i],
      inputMode: this.type != 'input', // seems weird but output connector holes have values set so their holes are in "inputMode" like the pins
      toggleable: this.type == 'input',
      type: options.type
    }));
  }
};
Connector.prototype.calculatePosition = function (constants, selected, allConnectors) {
  var selectedConstants = constants.selectedConstants(selected),
      holeWidth = selectedConstants.CONNECTOR_HOLE_DIAMETER + (selectedConstants.CONNECTOR_HOLE_MARGIN * 2),
      radius = selectedConstants.CONNECTOR_HOLE_DIAMETER / 2,
      vertical = this.type == 'bus',
      dx = vertical ? 0 : holeWidth,
      dy = vertical ? holeWidth : 0,
      inputWidth, outputWidth, totalWidth, i, cx, cy, hole;


  if (vertical) {
    this.position.width = holeWidth;
    this.position.height = holeWidth * this.count;
    this.position.x = 0;
    this.position.y = (selectedConstants.BOARD_HEIGHT - this.position.height) / 2;

    cy = this.position.y + selectedConstants.CONNECTOR_HOLE_MARGIN + radius;
    cx = holeWidth / 2;
  }
  else {
    inputWidth = totalWidth = (allConnectors.input ? holeWidth * allConnectors.input.count : 0);
    if ((inputWidth > 0) && allConnectors.output) {
      totalWidth += selectedConstants.CONNECTOR_SPACING;
    }
    outputWidth = (allConnectors.output ? holeWidth * allConnectors.output.count : 0);
    totalWidth += outputWidth;

    this.position.width = this.type == 'input' ? inputWidth : outputWidth;
    this.position.height = holeWidth;
    this.position.x = ((constants.WORKSPACE_WIDTH - totalWidth) / 2) + (this.type == 'output' ? (inputWidth + selectedConstants.CONNECTOR_SPACING) : 0);
    this.position.y = 0;

    cy = this.position.y + selectedConstants.CONNECTOR_HOLE_MARGIN + radius;
    cx = this.position.x + (holeWidth / 2);
  }

  for (i = 0; i < this.count; i++) {
    hole = this.holes[i];
    hole.cx = cx + (i * dx);
    hole.cy = cy + (i * dy);
    hole.radius =  radius;
  }
};
Connector.prototype.setHoleVoltage = function (index, voltage, forced) {
  if ((index < this.holes.length) && (voltage !== 'x')) {
    this.holes[index][forced ? "setForcedVoltage" : "setVoltage"](voltage);
  }
};
Connector.prototype.setHoleVoltages = function (voltages, forced) {
  var i;
  for (i = 0; i < voltages.length; i++) {
    this.setHoleVoltage(i, voltages[i], forced);
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

module.exports = Connector;


},{"./hole":22}],22:[function(require,module,exports){
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
  this.toggleable = options.toggleable;
  this.type = options.type;
  this.hasForcedVoltage = !!options.toggleable;
  this.forcedVoltage = TTL.LOW_VOLTAGE;
};
Hole.prototype.getBezierReflection = function () {
  return this.connector.type === 'input' ? 1 : -1;
};
Hole.prototype.setVoltage = function (newVoltage) {
  this.pulseProbeDuration = this.pulseProbeDuration || (newVoltage != this.voltage ? 1 : 0);
  this.voltage = newVoltage;
};
Hole.prototype.getVoltage = function () {
  return this.hasForcedVoltage ? this.forcedVoltage : this.voltage;
};
Hole.prototype.getLogicLevel = function () {
  return TTL.getVoltageLogicLevel(this.getVoltage());
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
Hole.prototype.getColor = function (showVoltageColor) {
  showVoltageColor = showVoltageColor || (this.connected && (this.type == 'output'));
  return this.hasForcedVoltage ? TTL.getColor(this.forcedVoltage) : (showVoltageColor ? TTL.getColor(this.voltage) : this.color);
};
Hole.prototype.toggleForcedVoltage = function () {
  if (this.forcedVoltage == TTL.HIGH_VOLTAGE) {
    this.forcedVoltage = TTL.LOW_VOLTAGE;
  }
  else {
    this.forcedVoltage = TTL.HIGH_VOLTAGE;
  }
  return this.forcedVoltage;
};
Hole.prototype.setForcedVoltage = function (voltage) {
  this.forcedVoltage = voltage;
};
Hole.prototype.getLabel = function () {
  return this.getVoltage() + "V (" + this.getLogicLevel().toLowerCase() + ")";
};
Hole.prototype.toString = function () {
  return ['connector', this.connector.type, this.index, 'board', this.connector.board ? this.connector.board.number : -1].join(':');
};

module.exports = Hole;


},{"./ttl":24}],23:[function(require,module,exports){
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
Pin.prototype.getLabel = function () {
  return this.getVoltage() + "V " + (this.inputMode ? "input" : "output") + " (" + this.getLogicLevel().toLowerCase() + ")";
};
Pin.prototype.toString = function () {
  return ['component', this.component.name, this.number, 'board', this.component.board.number].join(':');
};

module.exports = Pin;


},{"./ttl":24}],24:[function(require,module,exports){
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
        'LOW': 'blue',
        'INVALID': '#ffbf00',
        'HIGH': 'red'
      };
    }
    return TTL.COLOR_MAP[TTL.getVoltageLogicLevel(voltage)];
  }
};


},{}],25:[function(require,module,exports){
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
  var sourceId = source.toString(),
      destId = dest.toString(),
      firstId = sourceId < destId ? sourceId : destId,
      secondId = firstId === sourceId ? destId : sourceId;
  return [firstId, secondId, color].join(',');
};
Wire.toString = function () {
  return this.id;
};

module.exports = Wire;


},{}],26:[function(require,module,exports){
var workspaceWidth = 936 - 200,
    logicDrawerWidth = 100,
    constants;

module.exports = constants = {
  WORKSPACE_HEIGHT: 768,
  WORKSPACE_WIDTH: workspaceWidth,
  RIBBON_HEIGHT: 21,
  SPACER_HEIGHT: 21,
  INPUT_SWITCHES_HEIGHT: 21,
  OUTPUT_LEDS_HEIGHT: 21,
  SELECTED_FILL: '#bbb',
  UNSELECTED_FILL: '#777',

  selectedConstants: function (selected) {
    var boardHeight = (constants.WORKSPACE_HEIGHT - constants.SPACER_HEIGHT) / 2,
        boardLeft = selected ? 0 : 50,
        logicDrawerLayout = {
          x: workspaceWidth - logicDrawerWidth - boardLeft,
          y: 0,
          width: logicDrawerWidth,
          height: boardHeight
        };

    return {
      WIRE_WIDTH: selected ? 3 : 2,
      FOO_WIRE_WIDTH: 1,
      CONNECTOR_HOLE_DIAMETER: 15,
      CONNECTOR_HOLE_MARGIN: 4,
      CONNECTOR_SPACING: 20,
      BOARD_WIDTH: workspaceWidth - boardLeft,
      BOARD_HEIGHT: boardHeight,
      BOARD_LEFT: boardLeft,
      COMPONENT_WIDTH: boardHeight * 0.5,
      COMPONENT_HEIGHT: boardHeight * 0.5,
      COMPONENT_SPACING: boardHeight * 0.5,
      PIC_FONT_SIZE: 12,
      CHIP_LABEL_SIZE: 16,
      BUTTON_FONT_SIZE: 16,
      BUS_FONT_SIZE: 14,
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


},{}],27:[function(require,module,exports){
var PinView = React.createFactory(require('../shared/pin')),
    PinLabelView = React.createFactory(require('../shared/pin-label')),
    constants = require('./constants'),
    events = require('../shared/events'),
    chipNames = require('../../data/logic-gates/chip-names'),
    line = React.DOM.line,
    g = React.DOM.g,
    rect = React.DOM.rect,
    text = React.DOM.text,
    title = React.DOM.title,
    //path = React.DOM.path,
    circle = React.DOM.circle;

module.exports = React.createClass({
  displayName: 'LogicChipView',

  getInitialState: function () {
    return {
      hovering: false
    };
  },

  componentWillMount: function () {
    var pos = this.props.snapToGrid(this.props.component.layout);
    if (!this.props.component.position) {
      this.props.component.position = {
        x: pos.x,
        y: pos.y
      };
    }
    if (this.props.startDragPos) {
      this.startDrag(this.props.startDragPos);
    }
  },

  setPosition: function (x, y) {
    this.props.component.position.x = x;
    this.props.component.position.y = y;
    //console.log(this.props.component.name, x, y);
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
        position = this.props.component.position;

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

  mouseOver: function () {
    this.setState({hovering: true});
  },

  mouseOut: function () {
    this.setState({hovering: false});
  },

  getTitle: function () {
    return chipNames[this.props.component.type] || 'Unknown';
  },

  renderQuad: function (source1PinIndex, source2PinIndex, destPinIndex, renderConnectorFn) {
    var source1Pin = this.props.component.pins[source1PinIndex],
        source2Pin = this.props.component.pins[source2PinIndex],
        destPin = this.props.component.pins[destPinIndex],
        width = 18,
        height = 18,
        dy = source1Pin.placement == 'bottom' ? -1 : 1,
        edgeY = source1Pin.placement == 'bottom' ? source1Pin.y : source1Pin.y + source1Pin.height,
        x = source1Pin.cx + ((destPin.cx - source1Pin.cx - width) / 2),
        y = edgeY + ((source1Pin.height * 1.25) * dy),
        oneThirdsY = y + ((height * dy) * (1/3)),
        twoThirdsY = y + ((height * dy) * (2/3)),
        turnX = source1Pin.cx + ((x - source1Pin.cx) / 2),
        turnY = edgeY + ((height / 2) * dy),
        midY = y + ((height / 2) * dy);

    return g({},
      line({x1: source1Pin.cx, y1: edgeY, x2: source1Pin.cx, y2: twoThirdsY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: source1Pin.cx, y1: twoThirdsY, x2: x, y2: twoThirdsY, strokeWidth: 1, stroke: '#fff'}),

      line({x1: source2Pin.cx, y1: edgeY, x2: source2Pin.cx, y2: turnY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: source2Pin.cx, y1: turnY, x2: turnX, y2: turnY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: turnX, y1: turnY, x2: turnX, y2: oneThirdsY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: turnX, y1: oneThirdsY, x2: x, y2: oneThirdsY, strokeWidth: 1, stroke: '#fff'}),

      line({x1: x + width, y1: midY, x2: destPin.cx, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: destPin.cx, y1: midY, x2: destPin.cx, y2: edgeY, strokeWidth: 1, stroke: '#fff'}),

      renderConnectorFn ? renderConnectorFn(x, y, width, height, dy) : null
    );
  },

  renderReversedQuad: function (source1PinIndex, source2PinIndex, destPinIndex, renderConnectorFn) {
    var source1Pin = this.props.component.pins[source1PinIndex],
        source2Pin = this.props.component.pins[source2PinIndex],
        destPin = this.props.component.pins[destPinIndex],
        width = 18,
        height = 18,
        dy = source1Pin.placement == 'bottom' ? -1 : 1,
        edgeY = source1Pin.placement == 'bottom' ? source1Pin.y : source1Pin.y + source1Pin.height,
        x = source1Pin.cx - ((source1Pin.cx - destPin.cx - width) / 2),
        y = edgeY + ((source1Pin.height * 1.25) * dy),
        oneThirdsY = y + ((height * dy) * (1/3)),
        twoThirdsY = y + ((height * dy) * (2/3)),
        turnX = source1Pin.cx + ((x - source1Pin.cx) / 2),
        turnY = edgeY + ((height / 2) * dy),
        midY = y + ((height / 2) * dy);

    return g({},
      line({x1: source1Pin.cx, y1: edgeY, x2: source1Pin.cx, y2: twoThirdsY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: source1Pin.cx, y1: twoThirdsY, x2: x, y2: twoThirdsY, strokeWidth: 1, stroke: '#fff'}),

      line({x1: source2Pin.cx, y1: edgeY, x2: source2Pin.cx, y2: turnY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: source2Pin.cx, y1: turnY, x2: turnX, y2: turnY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: turnX, y1: turnY, x2: turnX, y2: oneThirdsY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: turnX, y1: oneThirdsY, x2: x, y2: oneThirdsY, strokeWidth: 1, stroke: '#fff'}),

      line({x1: x - width, y1: midY, x2: destPin.cx, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: destPin.cx, y1: midY, x2: destPin.cx, y2: edgeY, strokeWidth: 1, stroke: '#fff'}),

      renderConnectorFn ? renderConnectorFn(x - width, y, width, height, dy) : null
    );
  },

  // combination of
  renderFirstTriple: function (renderConnectorFn) {
    var source1Pin = this.props.component.pins[0],
        source2Pin = this.props.component.pins[1],
        source3Pin = this.props.component.pins[12],
        destPin = this.props.component.pins[11],
        width = 18,
        height = 18,
        dy = -1,
        edgeY = source1Pin.y,
        destY = destPin.y + destPin.height,
        x = source1Pin.cx + ((destPin.cx - source1Pin.cx - width) / 2),
        y = edgeY + ((source1Pin.height * 2) * dy),
        oneQuarterY = y + ((height * dy) * (1/4)),
        threeQuartersY = y + ((height * dy) * (3/4)),
        turnX = source1Pin.cx + ((x - source1Pin.cx) / 2),
        turnY = edgeY + ((height / 2) * dy),
        destTurnY = destY + (height / 2),
        midY = y + ((height / 2) * dy);

    return g({},
      line({x1: source1Pin.cx, y1: edgeY, x2: source1Pin.cx, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: source1Pin.cx, y1: midY, x2: x, y2: midY, strokeWidth: 1, stroke: '#fff'}),

      line({x1: source2Pin.cx, y1: edgeY, x2: source2Pin.cx, y2: turnY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: source2Pin.cx, y1: turnY, x2: turnX, y2: turnY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: turnX, y1: turnY, x2: turnX, y2: oneQuarterY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: turnX, y1: oneQuarterY, x2: x, y2: oneQuarterY, strokeWidth: 1, stroke: '#fff'}),

      line({x1: source3Pin.cx, y1: destY, x2: source3Pin.cx, y2: destTurnY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: source3Pin.cx, y1: destTurnY, x2: turnX, y2: destTurnY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: turnX, y1: destTurnY, x2: turnX, y2: threeQuartersY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: turnX, y1: threeQuartersY, x2: x, y2: threeQuartersY, strokeWidth: 1, stroke: '#fff'}),

      line({x1: x + width, y1: midY, x2: destPin.cx, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: destPin.cx, y1: midY, x2: destPin.cx, y2: destY, strokeWidth: 1, stroke: '#fff'}),

      renderConnectorFn ? renderConnectorFn(x, y, width, height, dy) : null
    );
  },

  // all top or bottom pins
  renderMirroredTriple: function (source1PinIndex, source2PinIndex, source3PinIndex, destPinIndex, renderConnectorFn) {
    var source1Pin = this.props.component.pins[source1PinIndex],
        source2Pin = this.props.component.pins[source2PinIndex],
        source3Pin = this.props.component.pins[source3PinIndex],
        destPin = this.props.component.pins[destPinIndex],
        width = 18,
        height = 18,
        dy = source1Pin.placement == 'bottom' ? -1 : 1,
        edgeY = source1Pin.placement == 'bottom' ? source1Pin.y : source1Pin.y + source1Pin.height,
        x = destPin.cx - (2 * destPin.width),
        y = edgeY + ((source1Pin.height * 1.25) * dy),
        oneQuarterY = y + ((height * dy) * (1/4)),
        threeQuartersY = y + ((height * dy) * (3/4)),
        turnX = source1Pin.cx + ((x - source1Pin.cx) * (7/8)),
        turnY = edgeY + ((height / 2) * dy),
        midY = y + ((height / 2) * dy);

    return g({},
      line({x1: source1Pin.cx, y1: edgeY, x2: source1Pin.cx, y2: threeQuartersY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: source1Pin.cx, y1: threeQuartersY, x2: x, y2: threeQuartersY, strokeWidth: 1, stroke: '#fff'}),

      line({x1: source2Pin.cx, y1: edgeY, x2: source2Pin.cx, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: source2Pin.cx, y1: midY, x2: x, y2: midY, strokeWidth: 1, stroke: '#fff'}),

      line({x1: source3Pin.cx, y1: edgeY, x2: source3Pin.cx, y2: turnY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: source3Pin.cx, y1: turnY, x2: turnX, y2: turnY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: turnX, y1: turnY, x2: turnX, y2: oneQuarterY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: turnX, y1: oneQuarterY, x2: x, y2: oneQuarterY, strokeWidth: 1, stroke: '#fff'}),

      line({x1: x + width, y1: midY, x2: destPin.cx, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: destPin.cx, y1: midY, x2: destPin.cx, y2: edgeY, strokeWidth: 1, stroke: '#fff'}),

      renderConnectorFn ? renderConnectorFn(x, y, width, height, dy) : null
    );
  },

  renderInverter: function (sourcePinIndex, destPinIndex) {
    var sourcePin = this.props.component.pins[sourcePinIndex],
        destPin = this.props.component.pins[destPinIndex],
        width = 12,
        height = 12,
        radius = 2,
        dy = sourcePin.placement == 'bottom' ? -1 : 1,
        edgeY = sourcePin.placement == 'bottom' ? sourcePin.y : sourcePin.y + sourcePin.height,
        x = sourcePin.cx + ((destPin.cx - sourcePin.cx - width) / 2),
        y = edgeY + ((sourcePin.height * 1.25) * dy),
        midY = y + ((height / 2) * dy);

    return g({},
      line({x1: sourcePin.cx, y1: edgeY, x2: sourcePin.cx, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: sourcePin.cx, y1: midY, x2: x, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      // the star commented out lines draw a graphical inverter
      //* line({x1: x, y1: y, x2: x + width, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      //* line({x1: x + width, y1: midY, x2: x, y2: y + (height * dy), strokeWidth: 1, stroke: '#fff'}),
      //* line({x1: x, y1: y + (height * dy), x2: x, y2: y, strokeWidth: 1, stroke: '#fff'}),
      line({x1: x + width, y1: midY, x2: destPin.cx, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: x + width + (2 * radius), y1: midY, x2: destPin.cx, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: destPin.cx, y1: midY, x2: destPin.cx, y2: edgeY, strokeWidth: 1, stroke: '#fff'}),
      //* circle({cx: x + width + radius, cy: midY, r: radius, fill: 'none', stroke: '#fff'}),
      this.renderText(x, y, width, height, dy, 'NOT')
    );
  },

  renderAnd: function (x, y, width, height, dy) {
    return this.renderText(x, y, width, height, dy, 'AND');
    /*
    // WORKING GRAPHICAL AND GATE:
    var r = height / 2,
        cx = x + width - r,
        cy = y + ((height * dy) / 2);

    // from http://stackoverflow.com/a/18473154
    function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
      var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;
      return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
      };
    }

    function describeArc(x, y, radius, startAngle, endAngle){
      var start = polarToCartesian(x, y, radius, endAngle);
      var end = polarToCartesian(x, y, radius, startAngle);
      var arcSweep = endAngle - startAngle <= 180 ? "0" : "1";
      var d = [
          "M", start.x, start.y,
          "A", radius, radius, 0, arcSweep, 0, end.x, end.y
      ].join(" ");
      return path({d: d, strokeWidth: 1, stroke: '#fff', fill: 'none'});
    }

    return g({},
      line({x1: x, y1: y, x2: cx, y2: y, strokeWidth: 1, stroke: '#fff'}),
      line({x1: x, y1: y, x2: x, y2: y + (height * dy), strokeWidth: 1, stroke: '#fff'}),
      line({x1: x, y1: y + (height * dy), x2: cx, y2: y + (height * dy), strokeWidth: 1, stroke: '#fff'}),
      describeArc(cx, cy, r, 0, 180)
    );
    */
  },

  renderOr: function (x, y, width, height, dy) {
    return this.renderText(x, y, width, height, dy, 'OR');
  },

  renderXor: function (x, y, width, height, dy) {
    return this.renderText(x, y, width, height, dy, 'XOR');
  },

  renderNand: function (x, y, width, height, dy) {
    return this.renderText(x, y, width, height, dy, 'NAND');
  },

  renderNor: function (x, y, width, height, dy) {
    return this.renderText(x, y, width, height, dy, 'NOR');
  },

  renderText: function (x, y, width, height, dy, label) {
    return text({x: x + (width / 2), y: y + ((height * dy) / 2), fontSize: 7, fill: '#fff', style: {textAnchor: 'middle', dominantBaseline: 'central'}}, label);
  },

  renderPinOut: function () {
    var pinOut = null;

    switch (this.props.component.type) {
      case '7400':
        // Quad 2-Input NAND
        pinOut = g({style: {pointerEvents: 'none'}},
          this.renderQuad(0, 1, 2, this.renderNand),
          this.renderQuad(3, 4, 5, this.renderNand),
          this.renderQuad(9, 8, 7, this.renderNand),
          this.renderQuad(12, 11, 10, this.renderNand)
        );
        break;
      case '7402':
        // "Reversed" Quad 2-Input NOR
        pinOut = g({style: {pointerEvents: 'none'}},
          this.renderReversedQuad(2, 1, 0, this.renderNor),
          this.renderReversedQuad(5, 4, 3, this.renderNor),
          this.renderReversedQuad(7, 8, 9, this.renderNor),
          this.renderReversedQuad(10, 11, 12, this.renderNor)
        );
        break;
      case '7404':
        // Hex Inverter
        pinOut = g({style: {pointerEvents: 'none'}},
          this.renderInverter(0, 1),
          this.renderInverter(2, 3),
          this.renderInverter(4, 5),
          this.renderInverter(8, 7),
          this.renderInverter(10, 9),
          this.renderInverter(12, 11)
        );
        break;
      case '7408':
        // Quad 2-Input AND
        pinOut = g({style: {pointerEvents: 'none'}},
          this.renderQuad(0, 1, 2, this.renderAnd),
          this.renderQuad(3, 4, 5, this.renderAnd),
          this.renderQuad(9, 8, 7, this.renderAnd),
          this.renderQuad(12, 11, 10, this.renderAnd)
        );
        break;
      case '7411':
        // Tri 3-Input AND
        pinOut = g({style: {pointerEvents: 'none'}},
          this.renderFirstTriple(this.renderAnd),
          this.renderMirroredTriple(2, 3, 4, 5, this.renderAnd),
          this.renderMirroredTriple(10, 9, 8, 7, this.renderAnd)
        );
        break;
      case '7432':
        // Quad 2-Input OR
        pinOut = g({style: {pointerEvents: 'none'}},
          this.renderQuad(0, 1, 2, this.renderOr),
          this.renderQuad(3, 4, 5, this.renderOr),
          this.renderQuad(9, 8, 7, this.renderOr),
          this.renderQuad(12, 11, 10, this.renderOr)
        );
        break;
      case '7486':
        //Quad 2-Input XOR
        pinOut = g({style: {pointerEvents: 'none'}},
          this.renderQuad(0, 1, 2, this.renderXor),
          this.renderQuad(3, 4, 5, this.renderXor),
          this.renderQuad(9, 8, 7, this.renderXor),
          this.renderQuad(12, 11, 10, this.renderXor)
        );
        break;
    }
    return pinOut;
  },

  render: function () {
    var pins = [],
        selectedConstants = constants.selectedConstants(this.props.selected),
        position = this.props.component.position,
        showPinOut = this.props.showPinouts && (this.state.hovering || (this.props.editable && this.props.selected && this.props.componentSelected)),
        pin, i, groundComponent, vccComponents, vccPos, label, labelText, rectParams, pinOut;

    this.layout();

    for (i = 0; i < this.props.component.pins.length; i++) {
      pin = this.props.component.pins[i];
      pins.push(PinView({key: 'pin' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, showPinColors: this.props.showPinColors, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
      if (!showPinOut) {
        pins.push(PinLabelView({key: 'label' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, reportHover: this.props.reportHover}));
      }
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
    labelText = showPinOut ? null : text({key: 'label', x: label.x, y: label.y, fontSize: label.labelSize, fill: '#fff', style: {textAnchor: label.anchor}}, label.text);

    rectParams = {x: position.x, y: position.y, width: position.width, height: position.height, fill: '#333'};
    if (this.props.editable && this.props.selected && this.props.componentSelected) {
      rectParams.stroke = '#f00';
      rectParams.strokeWidth = 2;
    }

    pinOut = showPinOut ? this.renderPinOut() : null;

    return g({onMouseDown: this.props.selected && this.props.editable ? this.mouseDown : null, onMouseOver: this.mouseOver, onMouseOut: this.mouseOut},
      rect(rectParams),
      pins,
      groundComponent,
      vccComponents,
      labelText,
      pinOut,
      title({}, this.getTitle())
    );
  }
});


},{"../../data/logic-gates/chip-names":6,"../shared/events":45,"../shared/pin":50,"../shared/pin-label":49,"./constants":26}],28:[function(require,module,exports){
var Connector = require('../../models/shared/connector'),
    Board = require('../../models/shared/board'),
    Keypad = require('../../models/pic/keypad'),
    PIC = require('../../models/pic/pic'),
    LED = require('../../models/pic/led'),
    CircuitResolver = require('../../models/shared/circuit-resolver'),
    picCode = require('../../data/pic/pic-code'),
    boardWatcher = require('../../controllers/pic/board-watcher'),
    userController = require('../../controllers/shared/user'),
    logController = require('../../controllers/shared/log'),
    WeGotItView = React.createFactory(require('../shared/we-got-it')),
    WorkspaceView = React.createFactory(require('./workspace')),
    SimulatorControlView = React.createFactory(require('./simulator-control')),
    AutoWiringView = React.createFactory(require('./auto-wiring')),
    SidebarChatView = React.createFactory(require('../shared/sidebar-chat')),
    WireControlsView = React.createFactory(require('../shared/wire-controls')),
    OfflineCheckView = React.createFactory(require('../shared/offline-check')),
    VersionView = React.createFactory(require('../shared/version')),
    events = require('../shared/events'),
    constants = require('./constants'),
    colors = require('../shared/colors'),
    inIframe = require('../../data/shared/in-iframe'),
    div = React.DOM.div,
    h1 = React.DOM.h1,
    h2 = React.DOM.h2;

module.exports = React.createClass({
  displayName: 'AppView',

  hasUrlOption: function (option) {
    return window.location.search.indexOf(option) !== -1;
  },

  getInitialState: function () {
    var numBoards = 3,
        busSize = 8,
        bezierReflectionModifiers = [1, -0.5, 0.75],
        components = [],
        connectors = [],
        boards = [],
        i, setBoard;

    this.circuitResolver = new CircuitResolver({busSize: busSize, busInputSize: 0, busOutputSize: 0});

    setBoard = function (hash, board) {
      var keys = Object.keys(hash),
          i;
      for (i = 0; i < keys.length; i++) {
        hash[keys[i]].board = board;
      }
    };

    for (i = 0; i < numBoards; i++) {
      connectors.push({
        bus: new Connector({type: 'bus', count: busSize}),
        input: new Connector({type: 'input', count: 8}),
        output: new Connector({type: 'output', count: 8})
      });

      switch (i) {
        case 0:
          components.push({
            keypad: new Keypad(),
            pic: new PIC({code: picCode[0]})
          });
          break;
        case 1:
          components.push({
            pic: new PIC({code: picCode[1]})
          });
          break;
        case 2:
          components.push({
            pic: new PIC({code: picCode[2]}),
            led: new LED()
          });
          break;
      }

      boards.push(new Board({
        number: i,
        bezierReflectionModifier: bezierReflectionModifiers[i],
        components: components[i],
        connectors: connectors[i],
        fixedComponents: true,
        resolver: this.circuitResolver
      }));

      setBoard(components[i], boards[i]);
      setBoard(connectors[i], boards[i]);
    }

    this.circuitResolver.boards = boards;
    this.circuitResolver.updateComponents();

    return {
      boards: boards,
      running: true,
      showPinColors: this.hasUrlOption('showPinColors'),
      showBusColors: this.hasUrlOption('showBusColors'),
      showAutoWiring: this.hasUrlOption('allowAutoWiring'),
      showSimulator: this.hasUrlOption('showSimulator'),
      showWireControls: this.hasUrlOption('wireSettings'),
      soloMode: this.hasUrlOption('soloMode'),
      showBusLabels: this.hasUrlOption('showBusLabels'),
      showProbe: this.hasUrlOption('showProbeInEdit') ? 'edit' : this.hasUrlOption('hideProbe') ? false : 'all',
      userBoardNumber: -1,
      users: {},
      currentBoard: 0,
      currentUser: null,
      currentGroup: null,
      wireSettings: {color: colors.wire, curvyness: 0.25},
      inIframe: inIframe()
    };
  },

  componentDidMount: function() {
    var activityName = 'pic',
        self = this;

    logController.init(activityName);

    if (this.state.soloMode) {
      logController.setClientNumber(0);
    }
    else {
      boardWatcher.addListener(this.state.boards[0], this.updateWatchedBoard);
      boardWatcher.addListener(this.state.boards[1], this.updateWatchedBoard);
      boardWatcher.addListener(this.state.boards[2], this.updateWatchedBoard);

      userController.init(3, activityName, function(userBoardNumber) {
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
          boardWatcher.startListeners(3);
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

  componentWillUnmount: function () {
    boardWatcher.removeListener(this.state.boards[0], this.updateWatchedBoard);
    boardWatcher.removeListener(this.state.boards[1], this.updateWatchedBoard);
    boardWatcher.removeListener(this.state.boards[2], this.updateWatchedBoard);
  },

  forceRerender: function () {
    this.setState({boards: this.state.boards});
  },

  updateWatchedBoard: function (board, boardInfo) {
    var wires, inputs;

    if (boardInfo && board.components.keypad) {
      board.components.keypad.selectButtonValue(boardInfo.button);
    }

    // update the wires
    wires = (boardInfo && boardInfo.layout ? boardInfo.layout.wires : null) || [];
    board.updateWires(wires);

    // update the inputs
    inputs = (boardInfo && boardInfo.layout ? boardInfo.layout.inputs : null) || [];
    board.updateInputs(inputs);
  },

  checkIfCircuitIsCorrect: function (callback) {
    var self = this,
        inputs = [
          {value: '1', bitfield: 107},
          {value: '2', bitfield: 258},
          {value: '3', bitfield: 34},
          {value: '4', bitfield: 104},
          {value: '5', bitfield: 48},
          {value: '6', bitfield: 24},
          {value: '7', bitfield: 99},
          {value: '8', bitfield: 0},
          {value: '9', bitfield: 96},
          {value: '0', bitfield: 1},
          {value: '*', bitfield: 378},
          {value: '#', bitfield: 379}
        ],
        keypad = this.state.boards[0].components.keypad,
        led = this.state.boards[2].components.led,
        allCorrect, startingKeypadValue, input, i, selectButton;

    selectButton = function (value) {
      var boards = self.state.boards,
          numBoards = boards.length,
          i, j;

      // reset all the boards
      for (i = 0; i < numBoards; i++) {
        boards[i].reset();
      }

      // set the input without notifing
      keypad.selectButtonValue(value, true);

      // evaluate all the boards so the keypad input propogates to the led
      for (i = 0; i < numBoards; i++) {
        for (j = 0; j < numBoards; j++) {
          boards[j].components.pic.evaluateRemainingPICInstructions();
        }
      }
    };

    // save the current keypad number
    startingKeypadValue = keypad.getPushedButtonValue();

    // check each keypad input for led output
    for (i = 0; i < inputs.length; i++) {
      input = inputs[i];

      selectButton(input.value);

      // check the output
      allCorrect = led.getPinBitField() == input.bitfield;
      if (!allCorrect) {
        break;
      }
    }

    // reset to the saved keypad number without notifing
    selectButton(startingKeypadValue);

    callback(allCorrect);
  },

  simulate: function (step) {
    var i, pic;

    if (this.state.running || step) {
      for (i = 0; i < this.state.boards.length; i++) {
        pic = this.state.boards[i].components.pic;
        if (step) {
          pic.evaluateCurrentPICInstruction();
        }
        else {
          pic.evaluateRemainingPICInstructions();
        }
      }
      this.setState({boards: this.state.boards});
    }
  },

  reset: function () {
    for (var i = 0; i < this.state.boards.length; i++) {
      this.state.boards[i].reset();
    }
    this.setState({boards: this.state.boards});
    events.logEvent(events.RESET_EVENT);
  },

  run: function (run, skipLogging) {
    clearInterval(this.simulatorInterval);
    if (run) {
      this.simulatorInterval = setInterval(this.simulate, 100);
    }
    this.setState({running: run});
    if (!skipLogging) {
      events.logEvent(run ? events.RUN_EVENT : events.STOP_EVENT);
    }
  },

  step: function () {
    this.simulate(true);
    events.logEvent(events.STEP_EVENT);
  },

  toggleAllWires: function () {
    var defaultColor = colors.wire,

        b0 = this.state.boards[0],
        b0Keypad = b0.components.keypad.pinMap,
        b0PIC = b0.components.pic.pinMap,
        b0Bus = b0.connectors.bus.holes,

        b1 = this.state.boards[1],
        b1PIC = b1.components.pic.pinMap,
        b1Bus = b1.connectors.bus.holes,

        b2 = this.state.boards[2],
        b2PIC = b2.components.pic.pinMap,
        b2LED = b2.components.led.pinMap,
        b2Bus = b2.connectors.bus.holes,
        wire, boardWires, i, j, hasWires;

    boardWires = [
      [
        {source: b0Keypad.COL0, dest: b0PIC.RB0, color: defaultColor},
        {source: b0Keypad.COL1, dest: b0PIC.RB1, color: defaultColor},
        {source: b0Keypad.COL2, dest: b0PIC.RB2, color: defaultColor},
        {source: b0Keypad.ROW0, dest: b0PIC.RB3, color: defaultColor},
        {source: b0Keypad.ROW1, dest: b0PIC.RB4, color: defaultColor},
        {source: b0Keypad.ROW2, dest: b0PIC.RB5, color: defaultColor},
        {source: b0Keypad.ROW3, dest: b0PIC.RB6, color: defaultColor},
        {source: b0PIC.RA0, dest: b0Bus[0], color: b0Bus[0].color},
        {source: b0PIC.RA1, dest: b0Bus[1], color: b0Bus[1].color},
        {source: b0PIC.RA2, dest: b0Bus[2], color: b0Bus[2].color},
        {source: b0PIC.RA3, dest: b0Bus[3], color: b0Bus[3].color}
      ],
      [
        {source: b1Bus[0], dest: b1PIC.RB0, color: b1Bus[0].color},
        {source: b1Bus[1], dest: b1PIC.RB1, color: b1Bus[1].color},
        {source: b1Bus[2], dest: b1PIC.RB2, color: b1Bus[2].color},
        {source: b1Bus[3], dest: b1PIC.RB3, color: b1Bus[3].color},
        {source: b1PIC.RA0, dest: b1Bus[4], color: b1Bus[4].color},
        {source: b1PIC.RA1, dest: b1Bus[5], color: b1Bus[5].color},
        {source: b1PIC.RA2, dest: b1Bus[6], color: b1Bus[6].color},
        {source: b1PIC.RA3, dest: b1Bus[7], color: b1Bus[7].color}
      ],
      [
        {source: b2Bus[4], dest: b2PIC.RA0, color: b2Bus[4].color},
        {source: b2Bus[5], dest: b2PIC.RA1, color: b2Bus[5].color},
        {source: b2Bus[6], dest: b2PIC.RA2, color: b2Bus[6].color},
        {source: b2Bus[7], dest: b2PIC.RA3, color: b2Bus[7].color},
        {source: b2PIC.RB0, dest: b2LED.a, color: defaultColor},
        {source: b2PIC.RB1, dest: b2LED.b, color: defaultColor},
        {source: b2PIC.RB2, dest: b2LED.c, color: defaultColor},
        {source: b2PIC.RB3, dest: b2LED.d, color: defaultColor},
        {source: b2PIC.RB4, dest: b2LED.e, color: defaultColor},
        {source: b2PIC.RB5, dest: b2LED.f, color: defaultColor},
        {source: b2PIC.RB6, dest: b2LED.g, color: defaultColor}
      ]
    ];

    // check if any have wires
    hasWires = false;
    for (i = 0; i < this.state.boards.length; i++) {
      hasWires = hasWires || (this.state.boards[i].wires.length > 0);
    }

    for (i = 0; i < this.state.boards.length; i++) {
      this.state.boards[i].clear();
      if (!hasWires) {
        for (j = 0; j < boardWires[i].length; j++) {
          wire = boardWires[i][j];
          // add the wire without resolving the circuits
          this.state.boards[i].addWire(wire.source, wire.dest, wire.color, true);
        }
      }
      boardWatcher.circuitChanged(this.state.boards[i]);
    }

    // rewire and resolve
    this.circuitResolver.rewire();

    this.setState({boards: this.state.boards});
  },

  updateWireSettings: function (newSettings) {
    this.setState({wireSettings: newSettings});
  },

  render: function () {
    var autoWiringTop = this.state.showSimulator ? 75 : 0,
        sidebarTop = autoWiringTop + (this.state.showAutoWiring ? 75 : 0);

    return div({},
      this.state.showWireControls ? WireControlsView({wireSettings: this.state.wireSettings, updateWireSettings: this.updateWireSettings}) : null,
      this.state.inIframe ? null : h1({}, "Teaching Teamwork PIC Activity"),
      this.state.currentUser ? h2({}, "Circuit " + (this.state.currentBoard + 1) + " (User: " + this.state.currentUser + ", Group: " + this.state.currentGroup + ")") : null,
      OfflineCheckView({}),
      WeGotItView({currentUser: this.state.currentUser, checkIfCircuitIsCorrect: this.checkIfCircuitIsCorrect, soloMode: this.state.soloMode}),
      div({id: 'picapp'},
        WorkspaceView({constants: constants, boards: this.state.boards, stepping: !this.state.running, showPinColors: this.state.showPinColors, users: this.state.users, userBoardNumber: this.state.userBoardNumber, wireSettings: this.state.wireSettings, forceRerender: this.forceRerender, soloMode: this.state.soloMode, showBusLabels: this.state.showBusLabels, showProbe: this.state.showProbe, showBusColors: this.state.showBusColors}),
        this.state.showSimulator ? SimulatorControlView({running: this.state.running, run: this.run, step: this.step, reset: this.reset}) : null,
        this.state.showAutoWiring ? AutoWiringView({top: autoWiringTop, running: this.state.running, toggleAllWires: this.toggleAllWires}) : null,
        this.state.soloMode ? null : SidebarChatView({numClients: 3, top: sidebarTop})
      ),
      VersionView({})
    );
  }
});


},{"../../controllers/pic/board-watcher":2,"../../controllers/shared/log":4,"../../controllers/shared/user":5,"../../data/pic/pic-code":7,"../../data/shared/in-iframe":9,"../../models/pic/keypad":14,"../../models/pic/led":15,"../../models/pic/pic":16,"../../models/shared/board":18,"../../models/shared/circuit-resolver":19,"../../models/shared/connector":21,"../shared/colors":42,"../shared/events":45,"../shared/offline-check":48,"../shared/sidebar-chat":52,"../shared/version":55,"../shared/we-got-it":57,"../shared/wire-controls":58,"./auto-wiring":29,"./constants":32,"./simulator-control":36,"./workspace":37}],29:[function(require,module,exports){
var div = React.DOM.div,
    button = React.DOM.button;

module.exports = React.createClass({
  displayName: 'AutoWiringView',

  toggleAllWires: function () {
    this.props.toggleAllWires();
  },

  render: function () {
    return div({id: 'auto-wiring', style: {top: this.props.top}},
      div({id: 'auto-wiring-title'}, 'Auto Wiring'),
      div({id: 'auto-wiring-area'},
        button({onClick: this.toggleAllWires}, 'Toggle Wires')
      )
    );
  }
});


},{}],30:[function(require,module,exports){
var div = React.DOM.div;

module.exports = React.createClass({
  displayName: 'BoardEditorView',

  render: function () {
    var selectedConstants = this.props.constants.selectedConstants(true);

    return div({className: 'pic-info'},
      div({className: 'pic-info-title-wrapper', style: {width: this.props.constants.WORKSPACE_WIDTH}},
        div({className: 'pic-info-title'}, 'Code')
      ),
      div({className: 'pic-info-code-wrapper', style: {width: this.props.constants.WORKSPACE_WIDTH, top: selectedConstants.BOARD_HEIGHT + 28 }},
        div({className: 'pic-info-code'}, this.props.board.components.pic.code.asm)
      )
    );
  }
});


},{}],31:[function(require,module,exports){
var g = React.DOM.g,
    rect = React.DOM.rect,
    text = React.DOM.text;

module.exports = React.createClass({
  displayName: 'ButtonView',

  onClick: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.props.pushButton(this.props.button);
  },

  render: function () {
    var onClick = this.onClick;
    return g({onClick: onClick, style: {cursor: 'pointer'}},
      rect({x: this.props.button.x, y: this.props.button.y, width: this.props.button.width, height: this.props.button.height, fill: this.props.pushed ? this.props.constants.SELECTED_FILL : this.props.constants.UNSELECTED_FILL}),
      text({x: this.props.button.label.x, y: this.props.button.label.y, fontSize: this.props.button.labelSize, fill: '#fff', style: {textAnchor: this.props.button.label.anchor}}, this.props.button.label.text)
    );
  }
});


},{}],32:[function(require,module,exports){
var workspaceWidth = 936 - 200,
    constants;

module.exports = constants = {
  WORKSPACE_HEIGHT: 768,
  WORKSPACE_WIDTH: workspaceWidth,
  RIBBON_HEIGHT: 21,
  SPACER_HEIGHT: 21,
  SELECTED_FILL: '#bbb',
  UNSELECTED_FILL: '#777',

  selectedConstants: function (selected) {
    var boardHeight,
        boardLeft = 50;

    if (selected) {
      boardHeight = constants.WORKSPACE_HEIGHT * 0.5;
      return {
        WIRE_WIDTH: 3,
        FOO_WIRE_WIDTH: 1,
        CONNECTOR_HOLE_DIAMETER: 15,
        CONNECTOR_HOLE_MARGIN: 4,
        CONNECTOR_SPACING: 20,
        BOARD_WIDTH: workspaceWidth,
        BOARD_HEIGHT: boardHeight,
        BOARD_LEFT: 0,
        COMPONENT_WIDTH: boardHeight * 0.5,
        COMPONENT_HEIGHT: boardHeight * 0.5,
        COMPONENT_SPACING: boardHeight * 0.25,
        PIC_FONT_SIZE: 12,
        BUTTON_FONT_SIZE: 16,
        BUS_FONT_SIZE: 14,
        PIN_WIDTH: 13.72,
        PIN_HEIGHT: 13.72,
        PROBE_WIDTH: 150,
        PROBE_NEEDLE_HEIGHT: 5,
        PROBE_HEIGHT: 20,
        PROBE_MARGIN: 10
      };
    }
    else {
      boardHeight = (constants.WORKSPACE_HEIGHT - (2 * constants.RIBBON_HEIGHT)) / 3;
      return {
        WIRE_WIDTH: 2,
        FOO_WIRE_WIDTH: 1,
        CONNECTOR_HOLE_DIAMETER: 10,
        CONNECTOR_HOLE_MARGIN: 3,
        CONNECTOR_SPACING: 15,
        BOARD_WIDTH: workspaceWidth - boardLeft,
        BOARD_HEIGHT: boardHeight,
        BOARD_LEFT: boardLeft,
        COMPONENT_WIDTH: boardHeight * 0.5,
        COMPONENT_HEIGHT: boardHeight * 0.5,
        COMPONENT_SPACING: boardHeight * 0.5,
        PIC_FONT_SIZE: 8,
        BUTTON_FONT_SIZE: 13,
        BUS_FONT_SIZE: 10,
        PIN_WIDTH: 8.64,
        PIN_HEIGHT: 8.64,
        PROBE_WIDTH: 95,
        PROBE_NEEDLE_HEIGHT: 3,
        PROBE_HEIGHT: 12,
        PROBE_MARGIN: 10
      };
    }
  }
};


},{}],33:[function(require,module,exports){
var PinView = React.createFactory(require('../shared/pin')),
    PinLabelView = React.createFactory(require('../shared/pin-label')),
    ButtonView = React.createFactory(require('./button')),
    events = require('../shared/events'),
    g = React.DOM.g,
    rect = React.DOM.rect;

module.exports = React.createClass({
  displayName: 'KeypadView',

  componentWillMount: function () {
    this.props.component.addListener(this.keypadChanged);
  },

  componentWillUnmount: function () {
    this.props.component.removeListener(this.keypadChanged);
  },

  keypadChanged: function (keypad) {
    this.setState({pushedButton: keypad.pushedButton});
  },

  getInitialState: function () {
    return {
      pushedButton: this.props.component.pushedButton
    };
  },

  pushButton: function (button) {
    if (this.props.editable) {
      this.props.component.pushButton(button);
      this.setState({pushedButton: this.props.component.pushedButton});
      events.logEvent(events.PUSHED_BUTTON_EVENT, button, {board: this.props.component.board});
    }
  },

  render: function () {
    var p = this.props.component.position,
        pins = [],
        buttons = [],
        i, pin, button;

    for (i = 0; i < this.props.component.pins.length; i++) {
      pin = this.props.component.pins[i];
      pins.push(PinView({key: 'pin' + i, constants: this.props.constants, pin: pin, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, showPinColors: this.props.showPinColors, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
      pins.push(PinLabelView({key: 'label' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, reportHover: this.props.reportHover}));
    }

    for (i = 0; i < this.props.component.buttons.length; i++) {
      button = this.props.component.buttons[i];
      buttons.push(ButtonView({key: i, constants: this.props.constants, button: button, selected: this.props.selected, editable: this.props.editable, pushed: button === this.state.pushedButton, pushButton: this.pushButton}));
    }

    return g({},
      rect({x: p.pad.x, y: p.pad.y, width: p.pad.width, height: p.pad.height, fill: '#333'}),
      pins,
      buttons
    );
  }
});


},{"../shared/events":45,"../shared/pin":50,"../shared/pin-label":49,"./button":31}],34:[function(require,module,exports){
var PinView = React.createFactory(require('../shared/pin')),
    PinLabelView = React.createFactory(require('../shared/pin-label')),
    path = React.DOM.path,
    g = React.DOM.g,
    line = React.DOM.line,
    circle = React.DOM.circle,
    rect = React.DOM.rect;

module.exports = React.createClass({
  displayName: 'LEDView',

  render: function () {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        p = this.props.component.position,
        decimalPoint = this.props.component.decimalPoint,
        pins = [],
        pin,
        segments = [],
        segment,
        i, ccComponents, ccPin, pinPos;

    for (i = 0; i < this.props.component.pins.length; i++) {
      pin = this.props.component.pins[i];
      pins.push(PinView({key: 'pin' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, showPinColors: this.props.showPinColors, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
      pins.push(PinLabelView({key: 'label' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, reportHover: this.props.reportHover}));
    }

    for (i = 0; i < this.props.component.segments.length; i++) {
      segment = this.props.component.segments[i];
      segments.push(path({key: 'segment' + i, d: segment.pathCommands, fill: segment.pin.connected && segment.pin.isLow() ? '#ccff00' : this.props.constants.UNSELECTED_FILL, transform: segment.transform}));
    }

    ccPin = this.props.component.pins[7];
    pinPos = {x1: ccPin.x + (ccPin.width / 2), y1: ccPin.y + ccPin.height, x2: ccPin.x + (ccPin.width / 2), y2: ccPin.y + ccPin.height + (3 * ccPin.width)};
    ccComponents = g({},
      line({x1: pinPos.x1, y1: pinPos.y1, x2: pinPos.x2, y2: pinPos.y2, strokeWidth: selectedConstants.FOO_WIRE_WIDTH, stroke: '#333'}),
      circle({cx: pinPos.x2, cy: pinPos.y2 + (pin.height / 2), r: pin.height / 2, fill: 'none', stroke: '#333'})
    );

    return g({},
      rect({x: p.display.x, y: p.display.y, width: p.display.width, height: p.display.height, fill: '#333'}),
      pins,
      segments,
      circle({cx: decimalPoint.cx, cy: decimalPoint.cy, r: decimalPoint.radius, fill: this.props.component.pinMap.DP.connected && !this.props.component.pinMap.DP.value ? '#ccff00' : this.props.constants.UNSELECTED_FILL}),
      ccComponents
    );
  }
});


},{"../shared/pin":50,"../shared/pin-label":49}],35:[function(require,module,exports){
var PinView = React.createFactory(require('../shared/pin')),
    PinLabelView = React.createFactory(require('../shared/pin-label')),
    line = React.DOM.line,
    g = React.DOM.g,
    rect = React.DOM.rect,
    circle = React.DOM.circle;

module.exports = React.createClass({
  displayName: 'PICView',

  pinWire: function (pin, dx) {
    var s;
    dx = dx || 1;
    s = {x1: pin.x + (pin.width * dx), y1: pin.y + (pin.height / 2), x2: pin.x + pin.width + (3 * pin.width * dx), y2: pin.y + (pin.height / 2)};
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
    var p2 = {x: p.x, y: p.y + pin.height},
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

  resistor: function (pin, p) {
    var width = pin.width / 4,
        height = pin.height / 2,
        r = {x1: p.x, y1: p.y, x2: p.x - (12 * width), y2: p.y},
        segments = [
          this.wireSegment({x1: r.x1,                 y1: r.y1,          x2: r.x1 - width,         y2: p.y + height}).line,
          this.wireSegment({x1: r.x1 -      width,    y1: r.y1 + height, x2: r.x1 - (2 * width),   y2: p.y - height}).line,
          this.wireSegment({x1: r.x1 - (2 * width),   y1: r.y1 - height, x2: r.x1 - (3 * width),   y2: p.y + height}).line,
          this.wireSegment({x1: r.x1 - (3 * width),   y1: r.y1 + height, x2: r.x1 - (4 * width),   y2: p.y - height}).line,
          this.wireSegment({x1: r.x1 - (4 * width),   y1: r.y1 - height, x2: r.x1 - (5 * width),   y2: p.y + height}).line,
          this.wireSegment({x1: r.x1 - (5 * width),   y1: r.y1 + height, x2: r.x1 - (6 * width),   y2: p.y - height}).line,
          this.wireSegment({x1: r.x1 - (6 * width),   y1: r.y1 - height, x2: r.x1 - (6.5 * width), y2: p.y}).line,
          this.wireSegment({x1: r.x1 - (6.5 * width), y1: r.y1,          x2: r.x2,                 y2: r.y2}).line
        ];
    r.lines = g({}, segments);
    return r;
  },

  capacitor: function (pin, p) {
    var width = pin.width / 2,
        height = pin.height / 2,
        c = {x1: p.x, y1: p.y, x2: p.x + width, y2: p.y},
        segments = [
          this.wireSegment({x1: c.x1, y1: c.y1 - height, x2: c.x1, y2: c.y1 + height}).line,
          this.wireSegment({x1: c.x2, y1: c.y2 - height, x2: c.x2, y2: c.y2 + height}).line
        ];
    c.lines = g({}, segments);
    return c;
  },

  renderCrystal: function (p) {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        height = p.height / 5,
        width = p.width * 0.8,
        segments = [
          this.wireSegment({x1: p.x, y1: p.y, x2: p.x, y2: p.y + height}).line,
          this.wireSegment({x1: p.x - width, y1: p.y + height, x2: p.x + width, y2: p.y + height}).line,
          rect({x: p.x - p.width, y: p.y + (2 * height), width: (p.width * 2), height: p.height - (4 * height), strokeWidth: selectedConstants.FOO_WIRE_WIDTH, stroke: '#333', fill: 'none'}),
          this.wireSegment({x1: p.x - width, y1: p.y + p.height - height, x2: p.x + width, y2: p.y + p.height - height}).line,
          this.wireSegment({x1: p.x, y1: p.y + p.height, x2: p.x, y2: p.y + p.height - height}).line
        ];
    return g({}, segments);
  },

  render: function () {
    var p = this.props.component.position,
        pins = [],
        pin,
        i, groundComponents, mclComponents, xtalComponents, vccComponents, s1, w1, w2, r, w3, w4, w5, w6, c1, c2;

    for (i = 0; i < this.props.component.pins.length; i++) {
      pin = this.props.component.pins[i];
      pins.push(PinView({key: 'pin' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, showPinColors: this.props.showPinColors, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
      pins.push(PinLabelView({key: 'label' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, reportHover: this.props.reportHover}));
    }

    pin = this.props.component.pinMap.GND;
    s1 = {x1: pin.x, y1: pin.y + (pin.height / 2), x2: pin.x - (3 * pin.width), y2: pin.y + (pin.height / 2)};
    groundComponents = g({},
      this.wireSegment(s1).line,
      this.renderGround(pin, {x: s1.x2, y: s1.y2})
    );

    pin = this.props.component.pinMap.MCL;
    s1 = {x1: pin.x, y1: pin.y + (pin.height / 2), x2: pin.x - pin.width, y2: pin.y + (pin.height / 2)};
    r = this.resistor(pin, {x: s1.x2, y: s1.y2});
    mclComponents = g({},
      this.wireSegment(s1).line,
      r.lines,
      circle({cx: r.x2 - (pin.width / 2), cy: r.y2, r: pin.width / 2, fill: 'none', stroke: '#333'})
    );

    pin = this.props.component.pinMap.XTAL;
    w1 = this.pinWire(this.props.component.pins[11]);
    w2 = this.pinWire(this.props.component.pins[12]);
    c1 = this.capacitor(this.props.component.pins[11], {x: w1.x2, y: w1.y2});
    c2 = this.capacitor(this.props.component.pins[12], {x: w2.x2, y: w2.y2});
    w3 = this.wireSegment({x1: c1.x2, y1: w1.y2, x2: w1.x2 + (2 * pin.width), y2: w1.y2});
    w4 = this.wireSegment({x1: c2.x2, y1: w2.y2, x2: w3.x2, y2: w2.y2});
    w5 = this.wireSegment({x1: w2.x2 + (2 * pin.width), y1: w1.y2 + ((w2.y2 - w1.y2) / 2), x2: w2.x2 + (4 * pin.width), y2: w1.y2 + ((w2.y2 - w1.y2) / 2)});
    w6 = this.wireSegment({x1: w5.x2, y1: w5.y2, x2: w5.x2, y2: w5.y2 + (pin.height)});
    xtalComponents = g({},
      w1.line,
      w2.line,
      this.renderCrystal({x: w1.x1 + ((w1.x2 - w1.x1) / 2), y: w1.y1, width: (w1.x2 - w1.x1) / 4, height: w2.y1 - w1.y1}),
      c1.lines,
      c2.lines,
      w3.line,
      w4.line,
      this.wireSegment({x1: w3.x2, y1: w3.y2, x2: w4.x2, y2: w4.y2}).line,
      w5.line,
      w6.line,
      this.renderGround(pin, {x: w6.x2, y: w6.y2})
    );

    w1 = this.pinWire(this.props.component.pins[13]);
    vccComponents = g({},
      w1.line,
      circle({cx: w1.x2 + (pin.width / 2), cy: w1.y2, r: pin.width / 2, fill: 'none', stroke: '#333'})
    );

    return g({},
      rect({x: p.chip.x, y: p.chip.y, width: p.chip.width, height: p.chip.height, fill: '#333'}),
      pins,
      groundComponents,
      mclComponents,
      xtalComponents,
      vccComponents
    );
  }
});


},{"../shared/pin":50,"../shared/pin-label":49}],36:[function(require,module,exports){
var button = React.DOM.button,
    div = React.DOM.div;
  
module.exports = React.createClass({
  displayName: 'SimulatorControlView',

  stop: function () {
    this.props.run(false);
  },

  run: function () {
    this.props.run(true);
  },

  step: function () {
    this.props.step();
  },

  reset: function () {
    this.props.reset();
  },

  render: function () {
    var controls = [];
    if (this.props.running) {
      controls.push(button({key: 'stop', onClick: this.stop}, 'Stop'));
    }
    else {
      controls.push(button({key: 'run', onClick: this.run}, 'Run'));
      controls.push(button({key: 'step', onClick: this.step}, 'Step'));
      controls.push(button({key: 'reset', onClick: this.reset}, 'Reset'));
    }

    return div({id: 'simulator-control'},
      div({id: 'simulator-control-title'}, 'Simulator'),
      div({id: 'simulator-control-area'}, controls)
    );
  }
});


},{}],37:[function(require,module,exports){
var BoardView = React.createFactory(require('../shared/board')),
    BoardEditorView = React.createFactory(require('./board-editor')),
    SpacerView = React.createFactory(require('../shared/spacer')),
    BusView = React.createFactory(require('../shared/bus')),
    events = require('../shared/events'),
    div = React.DOM.div;

module.exports = React.createClass({
  displayName: 'WorkspaceView',

  getInitialState: function () {
    return {
      selectedBoard: null
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

  render: function () {
    var editable, selectedConstants;
    if (this.state.selectedBoard) {
      editable = this.props.soloMode || (this.props.userBoardNumber === this.state.selectedBoard.number);
      selectedConstants = this.props.constants.selectedConstants(true);
      return div({id: 'workspace'},
        editable ? null : div({style: {height: (this.props.constants.WORKSPACE_HEIGHT - selectedConstants.BOARD_HEIGHT) / 2}}), // this centers the BoardView below
        BoardView({
          constants: this.props.constants,
          key: 'selectedBoard' + this.state.selectedBoard.number,
          board: this.state.selectedBoard,
          selected: true,
          editable: editable,
          user: this.props.users[this.state.selectedBoard.number],
          stepping: this.props.stepping,
          showPinColors: this.props.showPinColors,
          showBusColors: this.props.showBusColors,
          toggleBoard: this.toggleBoard,
          showProbe: (this.props.showProbe == 'edit') || (this.props.showProbe == 'all'),
          wireSettings: this.props.wireSettings,
          forceRerender: this.props.forceRerender,
          soloMode: this.props.soloMode,
          showBusLabels: this.props.showBusLabels
        }),
        editable ? BoardEditorView({constants: this.props.constants, board: this.state.selectedBoard}) : null
      );
    }
    else {
      return div({id: 'workspace', style: {width: this.props.constants.WORKSPACE_WIDTH}},
        BoardView({
          constants: this.props.constants,
          board: this.props.boards[0],
          editable: this.props.soloMode || (this.props.userBoardNumber === 0),
          user: this.props.users[0],
          stepping: this.props.stepping,
          showPinColors: this.props.showPinColors,
          showBusColors: this.props.showBusColors,
          toggleBoard: this.toggleBoard,
          showProbe: this.props.showProbe == 'all',
          wireSettings: this.props.wireSettings,
          forceRerender: this.props.forceRerender,
          soloMode: this.props.soloMode,
          showBusLabels: this.props.showBusLabels
        }),
        SpacerView({
          constants: this.props.constants
        }),
        BoardView({
          constants: this.props.constants,
          board: this.props.boards[1],
          editable: this.props.soloMode || (this.props.userBoardNumber === 1),
          user: this.props.users[1],
          stepping: this.props.stepping,
          showPinColors: this.props.showPinColors,
          showBusColors: this.props.showBusColors,
          toggleBoard: this.toggleBoard,
          showProbe: this.props.showProbe == 'all',
          wireSettings: this.props.wireSettings,
          forceRerender: this.props.forceRerender,
          soloMode: this.props.soloMode,
          showBusLabels: this.props.showBusLabels
        }),
        SpacerView({
          constants: this.props.constants
        }),
        BoardView({
          constants: this.props.constants,
          board: this.props.boards[2],
          editable: this.props.soloMode || (this.props.userBoardNumber === 2),
          user: this.props.users[2],
          stepping: this.props.stepping,
          showPinColors: this.props.showPinColors,
          showBusColors: this.props.showBusColors,
          toggleBoard: this.toggleBoard,
          showProbe: this.props.showProbe == 'all',
          wireSettings: this.props.wireSettings,
          forceRerender: this.props.forceRerender,
          soloMode: this.props.soloMode,
          showBusLabels: this.props.showBusLabels
        }),
        BusView({
          constants: this.props.constants,
          boards: [this.props.boards[0], this.props.boards[1], this.props.boards[2]]
        })
      );
    }
  }
});


},{"../shared/board":38,"../shared/bus":39,"../shared/events":45,"../shared/spacer":53,"./board-editor":30}],38:[function(require,module,exports){
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
        events.logEvent(events.REMOVE_WIRE_EVENT, null, {board: this.props.board, source: wire.source, dest: wire.dest});
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
          dx = self.state.drawConnection ? (self.state.drawConnection.x2 - self.state.drawConnection.x1) : 0,
          dy = self.state.drawConnection ? (self.state.drawConnection.y2 - self.state.drawConnection.y1) : 0,
          wire;

      e.stopPropagation();
      e.preventDefault();

      $window.off('mousemove', drag);
      $window.off('mouseup', stopDrag);
      self.setState({drawConnection: null});

      // this handles slight movements of the mouse
      if (moved) {
        moved = (dx * dx) + (dy * dy) > 10;
      }

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
        draggingChip = new LogicChip({type: chip.type, layout: {x: chipX, y: chipY}});

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
      var component = new LogicChip({type: chip.type, layout: {x: chip.x, y: chip.y}, selectable: true});
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
    var self = this,
        selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        style = {
          width: selectedConstants.BOARD_WIDTH,
          height: selectedConstants.BOARD_HEIGHT,
          position: 'relative',
          left: selectedConstants.BOARD_LEFT
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

    this.props.board.resolver.resolveCircuitInputVoltages();

    // calculate the position so the wires can be updated
    $.each(['input', 'output', 'bus'], function (index, connectorName) {
      var connector = self.props.board.connectors[connectorName];
      if (connector) {
        connector.calculatePosition(self.props.constants, self.props.selected, self.props.board.connectors);
        connectors.push(ConnectorView({key: connectorName, constants: self.props.constants, connector: connector, selected: self.props.selected, editable: self.props.editable, drawConnection: self.drawConnection, reportHover: self.reportHover, forceRerender: self.props.forceRerender, showBusLabels: self.props.showBusLabels, showBusColors: self.props.showBusColors}));
      }
    });

    for (name in this.props.board.components) {
      if (this.props.board.components.hasOwnProperty(name)) {
        component = this.props.board.components[name];
        if (component.calculatePosition) {
          component.calculatePosition(this.props.constants, this.props.selected, componentIndex++, this.props.board.numComponents);
        }
        components.push(component.view({key: name, constants: this.props.constants, component: component, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, showPinColors: this.props.showPinColors, showPinouts: this.props.showPinouts, drawConnection: this.drawConnection, reportHover: this.reportHover, layoutChanged: this.layoutChanged, snapToGrid: this.snapToGrid, componentSelected: this.state.selectedComponents.indexOf(component) !== -1, componentClicked: this.componentSelected, logicChipDragRect: logicChipDragRect}));
      }
    }

    for (i = 0; i < this.props.board.wires.length; i++) {
      wire = this.props.board.wires[i];
      wires.push(WireView({key: i, constants: this.props.constants, wire: wire, board: this.props.board, editable: this.props.editable, enablePointerEvents: enableWirePointerEvents, width: selectedConstants.WIRE_WIDTH, wireSelected: this.wireSelected, selected: this.state.selectedWires.indexOf(wire) !== -1, wireSettings: this.props.wireSettings}));
    }

    return div({className: this.props.editable ? 'board editable-board' : 'board', style: style},
      span({className: this.props.editable ? 'board-user editable-board-user' : 'board-user'}, ('Circuit ' + (this.props.board.number + 1)) + (this.props.user ? ': ' + this.props.user.name : (this.props.soloMode ? '' : ': (unclaimed)'))),
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


},{"../../controllers/pic/board-watcher":2,"../../models/logic-gates/logic-chip":12,"../shared/events":45,"./connector":44,"./layout":46,"./logic-chip-drawer":47,"./probe":51,"./wire":59}],39:[function(require,module,exports){
var line = React.DOM.line,
    div = React.DOM.div,
    svg = React.DOM.svg,
    wireColors = require('../../data/shared/wire-colors');

module.exports = React.createClass({
  displayName: 'BusView',

  render: function () {
    var selectedConstants = this.props.constants.selectedConstants(false),
        wires = [],
        keyIndex = 0,
        connectorPositions = [],
        hole, i, j, x, y, board, connector, wireMargin, wireStartPositions, wireStartPosition, firstConnectorPosition, lastConnectorPosition, wireEndPosition, style;

    if (this.props.boards && this.props.boards[0].connectors.bus) {
      wireMargin = selectedConstants.BOARD_LEFT / (this.props.boards[0].connectors.bus.holes.length + 1);
      x = wireMargin;

      for (i = 0; i < this.props.boards.length; i++) {
        board = this.props.boards[i];
        connector = board.connectors.bus;
        y = ((selectedConstants.BOARD_HEIGHT + this.props.constants.RIBBON_HEIGHT) * i);
        wireStartPositions = [];
        for (j = 0; j < connector.holes.length; j++) {
          hole = connector.holes[j];
          wireStartPosition = {
            x: x + (wireMargin * j),
            y: y + hole.cy
          };
          wireStartPositions.push(wireStartPosition);
          wires.push(line({key: 'h'+(keyIndex++), x1: wireStartPosition.x, y1: wireStartPosition.y, x2: selectedConstants.BOARD_LEFT, y2: wireStartPosition.y, strokeWidth: selectedConstants.WIRE_WIDTH, stroke: wireColors[j % wireColors.length]}));
        }
        connectorPositions.push(wireStartPositions);
      }

      firstConnectorPosition = connectorPositions[0];
      lastConnectorPosition = connectorPositions[connectorPositions.length - 1];
      for (i = 0; i < firstConnectorPosition.length; i++) {
        wireStartPosition = firstConnectorPosition[i];
        wireEndPosition = lastConnectorPosition[i];
        wires.push(line({key: 'v'+(keyIndex++), x1: wireStartPosition.x, y1: wireStartPosition.y, x2: wireEndPosition.x, y2: wireEndPosition.y, strokeWidth: selectedConstants.WIRE_WIDTH, stroke: wireColors[i % wireColors.length]}));
      }

      if (this.props.inputSize) {
        for (i = 0; i < this.props.inputSize; i++) {
          wireEndPosition = firstConnectorPosition[i];
          wires.push(line({key: 'i'+(keyIndex++), x1: wireEndPosition.x, y1: 0, x2: wireEndPosition.x, y2: wireEndPosition.y, strokeWidth: selectedConstants.WIRE_WIDTH, stroke: wireColors[i % wireColors.length]}));
        }
      }
      if (this.props.outputSize) {
        for (i = lastConnectorPosition.length - 1; i >= lastConnectorPosition.length - this.props.outputSize; i--) {
          wireStartPosition = lastConnectorPosition[i];
          wires.push(line({key: 'i'+(keyIndex++), x1: wireStartPosition.x, y1: wireStartPosition.y, x2: wireStartPosition.x, y2: this.props.height, strokeWidth: selectedConstants.WIRE_WIDTH, stroke: wireColors[i % wireColors.length]}));
        }
      }
    }

    style = {width: selectedConstants.BOARD_LEFT};
    if (this.props.height) {
      style.height = this.props.height;
    }
    return div({className: 'bus', style: style},
      svg({}, wires)
    );
  }
});


},{"../../data/shared/wire-colors":10}],40:[function(require,module,exports){
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


},{}],41:[function(require,module,exports){
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


},{"../../controllers/shared/user":5,"./chat-item":40}],42:[function(require,module,exports){
module.exports = {
  wire: '#ffa500'
};

},{}],43:[function(require,module,exports){
var g = React.DOM.g,
    circle = React.DOM.circle,
    rect = React.DOM.rect,
    title = React.DOM.title,
    events = require('../shared/events');

module.exports = React.createClass({
  displayName: 'ConnectorHoleView',

  mouseOver: function () {
    this.props.reportHover(this.props.hole);
  },

  mouseOut: function () {
    this.props.reportHover(null);
  },

  startDrag: function (e) {
    var self = this;
    this.props.drawConnection(this.props.hole, e, this.props.hole.color, function (addedWire, moved) {
      if (!addedWire && !moved) {
        self.handleToggle();
      }
    });
  },

  handleToggle: function () {
    if (this.props.hole.toggleable) {
      var newVoltage = this.props.hole.toggleForcedVoltage();
      this.props.hole.connector.board.resolver.resolve();
      this.props.forceRerender();
      events.logEvent(events.TOGGLED_SWITCH_EVENT, newVoltage, {board: this.props.hole.connector.board, hole: this.props.hole});
    }
  },

  renderInput: function (hole, enableHandlers) {
    var radius = hole.radius,
        layout = {x: hole.cx - radius, y: hole.cy - radius, width: radius * 2, height: radius},
        isLow = hole.isLow(),
        backgroundColor = '#777';
    return g({onClick: !enableHandlers && this.props.editable ? this.handleToggle : null, onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null},
      rect({x: layout.x, y: layout.y, width: layout.width, height: layout.height, fill: isLow ? hole.getColor() : backgroundColor},
        title({}, hole.getLabel())
      ),
      rect({x: layout.x, y: layout.y + layout.height, width: layout.width, height: layout.height, fill: !isLow ? hole.getColor() : backgroundColor},
        title({}, hole.getLabel())
      )
    );
  },

  renderOutput: function (hole, enableHandlers) {
    return circle({cx: hole.cx, cy: hole.cy, r: hole.radius, fill: hole.getColor(), onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null},
      title({}, hole.getLabel())
    );
  },

  renderBus: function (hole, enableHandlers) {
    var radius = hole.radius;
    return rect({x: hole.cx - radius, y: hole.cy - radius, width: radius * 2, height: radius * 2, fill: hole.getColor(this.props.showBusColors), onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null},
      title({}, hole.getLabel())
    );
  },

  render: function () {
    var enableHandlers = this.props.selected && this.props.editable,
        hole = this.props.hole,
        symbol = hole.type == 'input' ? this.renderInput(hole, enableHandlers) : (hole.type == 'output' ? this.renderOutput(hole, enableHandlers) : this.renderBus(hole, enableHandlers));
    return g({}, symbol);
  }
});


},{"../shared/events":45}],44:[function(require,module,exports){
var ConnectorHoleView = React.createFactory(require('./connector-hole')),
    svg = React.DOM.svg,
    rect = React.DOM.rect,
    text = React.DOM.text;

module.exports = React.createClass({
  displayName: 'ConnectorView',

  render: function () {
    var position = this.props.connector.position,
        selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        fontSize = selectedConstants.BUS_FONT_SIZE,
        holes = [],
        labels = [],
        hole, i;

    for (i = 0; i < this.props.connector.holes.length; i++) {
      hole = this.props.connector.holes[i];
      holes.push(ConnectorHoleView({key: i, connector: this.props.connector, hole: hole, selected: this.props.selected, editable: this.props.editable, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover, forceRerender: this.props.forceRerender, showBusColors: this.props.showBusColors}));
      if (this.props.showBusLabels && (this.props.connector.type == 'bus')) {
        labels.push(text({x: position.x + position.width + hole.radius, y: hole.cy + (fontSize / 2), fontSize: fontSize, fill: '#000', style: {textAnchor: 'start'}}, hole.label));
      }
    }

    return svg({},
      rect({x: position.x, y: position.y, width: position.width, height: position.height, fill: '#aaa'}),
      holes,
      labels
    );
  }
});


},{"./connector-hole":43}],45:[function(require,module,exports){
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
  TOGGLED_SWITCH_EVENT: 'Toggled Switch',

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
    else if (eventName == events.TOGGLED_SWITCH_EVENT) {
      loggedValue = value;
      loggedParameters = {
        switch: parameters.hole.index,
        board: parameters.board.number
      };
      boardWatcher.circuitChanged(parameters.board);
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
        source: parameters.board.serializeEndpoint(parameters.source, 'type'),
        dest: parameters.board.serializeEndpoint(parameters.dest, 'type')
      };
      boardWatcher.circuitChanged(parameters.board);
    }
    else if ((eventName == events.ADD_LOGIC_CHIP_EVENT) || (eventName == events.REMOVE_LOGIC_CHIP_EVENT) || (eventName == events.MOVE_LOGIC_CHIP_EVENT)) {
      loggedParameters = {
        name: parameters.chip.name,
        type: parameters.chip.type,
        x: parameters.chip.position.x,
        y: parameters.chip.position.y
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


},{"../../controllers/pic/board-watcher":2,"../../controllers/shared/log":4}],46:[function(require,module,exports){
module.exports = {
  getBezierPath: function (options) {
    var closeCutoff = 300,
        normalize, dy, dx, dist, x3, y3, x4, y4, height, curvyness, closeModifier;

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
    closeModifier = 2.5 * curvyness * (1 - (Math.min(dist, closeCutoff) / closeCutoff));
    height = dist * (curvyness + closeModifier);
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
        connectorHeight = selectedConstants.CONNECTOR_HOLE_DIAMETER + (selectedConstants.CONNECTOR_HOLE_MARGIN * 2),
        startX, position;

    componentWidth = componentWidth || selectedConstants.COMPONENT_WIDTH;
    componentHeight = componentHeight || selectedConstants.COMPONENT_HEIGHT;

    startX = (constants.WORKSPACE_WIDTH - (count * componentWidth) - ((count - 1) * selectedConstants.COMPONENT_SPACING)) / 2;

    position = {
      x: startX + (index * (componentWidth + selectedConstants.COMPONENT_SPACING)),
      y: ((selectedConstants.BOARD_HEIGHT - componentHeight + connectorHeight) / 2),
      width: componentWidth,
      height: componentHeight
    };

    return position;
  }
};


},{}],47:[function(require,module,exports){
var g = React.DOM.g,
    rect = React.DOM.rect,
    text = React.DOM.text,
    title = React.DOM.title,
    path = React.DOM.path,
    chipNames = require('../../data/logic-gates/chip-names'),
    ChipView;

ChipView = React.createFactory(React.createClass({
  displayName: 'ChipView',

  startDrag: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.props.startDrag({type: this.props.type}, e.pageX, e.pageY);
  },

  getTitle: function () {
    return chipNames[this.props.type] || 'Unknown';
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

    return g({onMouseDown: enableHandlers ? this.startDrag : null, onWheel: this.props.onWheel},
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

  getInitialState: function () {
    return {
      scrollSteps: 0,
      maxScrollSteps: Object.keys(this.props.chips).length - 3
    };
  },

  backgroundMouseDown: function (e) {
    e.preventDefault();
    e.stopPropagation();
  },

  scrollUp: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      scrollSteps: Math.max(this.state.scrollSteps - 1, 0)
    });
  },

  scrollDown: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      scrollSteps: Math.min(this.state.scrollSteps + 1, this.state.maxScrollSteps)
    });
  },

  onWheel: function (e) {
    if (e.deltaY < 0) {
      this.scrollUp(e);
    }
    else {
      this.scrollDown(e);
    }
  },

  render: function () {
    var self = this,
        chips = [],
        chipWidth = this.props.layout.width * 0.6,
        chipHeight = chipWidth * 1.5,
        chipMargin = (this.props.layout.width - chipWidth) / 2,
        numChips = Object.keys(this.props.chips).length,
        totalHeight = (numChips * chipHeight) + ((numChips - 1) * chipMargin),
        needsScroller = totalHeight > this.props.layout.height,
        chipX = this.props.layout.x + chipMargin,
        chipY = this.props.layout.y + chipMargin - (this.state.scrollSteps * (chipHeight + chipMargin)),
        scrollButtonHeight = 16,
        upButton = null,
        downButton = null,
        triangleWidth = scrollButtonHeight / 2,
        triangleHeight = scrollButtonHeight / 2,
        triangleX = this.props.layout.x + ((this.props.layout.width - triangleWidth) / 2),
        triangleY, trianglePath, i;

    if (needsScroller) {
      chipY = this.props.layout.y + scrollButtonHeight + (chipMargin / 2) - (this.state.scrollSteps * (chipHeight + chipMargin));

      triangleY = this.props.layout.y + (scrollButtonHeight / 2) + (triangleHeight / 2);
      trianglePath = ["M", triangleX, " ", triangleY, " l", (triangleWidth / 2), " -", triangleHeight, " l", (triangleWidth / 2), " ", triangleHeight, " Z"].join("");
      upButton = this.state.scrollSteps === 0 ? null : g({},
        rect({x: this.props.layout.x, y: this.props.layout.y, width: this.props.layout.width, height: scrollButtonHeight, fill: '#eee', onMouseDown: this.scrollUp}),
        path({d: trianglePath, fill: '#333', stroke: '#333', strokeWidth: 1})
      );

      triangleY = this.props.layout.y + this.props.layout.height - (scrollButtonHeight / 2) - (triangleHeight / 2);
      trianglePath = ["M", triangleX, " ", triangleY, " l", (triangleWidth / 2), " ", triangleHeight, " l", (triangleWidth / 2), " -", triangleHeight, " Z"].join("");
      downButton = this.state.scrollSteps === this.state.maxScrollSteps ? null : g({},
        rect({x: this.props.layout.x, y: this.props.layout.y + this.props.layout.height - scrollButtonHeight, width: this.props.layout.width, height: scrollButtonHeight, fill: '#eee', onMouseDown: this.scrollDown}),
        path({d: trianglePath, fill: '#333', stroke: '#333', strokeWidth: 1})
      );
    }
    else {
      chipY = this.props.layout.y + ((this.props.layout.height - ((numChips * chipHeight) + ((numChips - 1) * chipMargin))) / 2);
    }

    i = 0;
    $.each(this.props.chips, function (type, chip) {
      chips.push(ChipView({type: type, chip: chip, x: chipX, y: chipY + (i * (chipHeight + chipMargin)), width: chipWidth, height: chipHeight, selected: self.props.selected, editable: self.props.editable, startDrag: self.props.startDrag, onWheel: self.onWheel}));
      i++;
    });
    return g({},
      rect({x: this.props.layout.x, y: this.props.layout.y, width: this.props.layout.width, height: this.props.layout.height, fill: '#aaa', onMouseDown: this.backgroundMouseDown, onWheel: this.onWheel}),
      chips,
      upButton,
      downButton
    );
  }
});


},{"../../data/logic-gates/chip-names":6}],48:[function(require,module,exports){
var logController = require('../../controllers/shared/log'),
    div = React.DOM.div,
    h2 = React.DOM.h2,
    p = React.DOM.p;

module.exports = React.createClass({
  displayName: 'OfflineCheck',

  getInitialState: function() {
    return {
      connected: true,
      startTime: Date.now()
    };
  },

  componentWillMount: function() {
    var self = this,
        fb = new Firebase('https://teaching-teamwork.firebaseio.com');

    fb.child('.info/connected').on('value', function(connectedSnap) {
      self.statusChange(connectedSnap.val(), true);
    });
  },

  statusChange: function (connected, checkStartTime) {
    var now = Date.now();
    if (!checkStartTime || (now - this.state.startTime > 5000)) {
      if (connected && !this.state.connected) {
        logController.logEvent("Reconnected", null, {disconnectTime: this.state.disconnectTime, disconnectDuration: now - this.state.disconnectTime});
      }
      this.setState(connected ? {connected: true} : {connected: false, disconnectTime: now});
    }

  },

  clicked: function () {
    if (window.location.search.indexOf('testOffline') !== -1) {
      this.statusChange(!this.state.connected, false);
    }
  },

  render: function() {
    var alert = null;

    if (!this.state.connected) {
      alert = div({id: "connection-alert"},
        h2({}, "Connection Lost"),
        p({}, "This computer appears to have lost connection to the web."),
        p({}, "Please try and resolve connection issues before trying to refresh the page."),
        p({}, "This message will disappear when connection is reestablished.")
      );
    }
    return div({onClick: this.clicked},
      div({id: "connection-status"},
        div({className: this.state.connected ? "online" : "offline"}),
        this.state.connected ? "Online" : "Offline"
      ),
      alert ? div({id: "connection-alert-background"}) : null,
      alert ? alert : null
    );
  }
});


},{"../../controllers/shared/log":4}],49:[function(require,module,exports){
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


},{}],50:[function(require,module,exports){
var colors = require('./colors'),
    g = React.DOM.g,
    rect = React.DOM.rect,
    title = React.DOM.title;

module.exports = React.createClass({
  displayName: 'PinView',

  mouseOver: function () {
    this.props.reportHover(this.props.pin);
  },

  mouseOut: function () {
    this.props.reportHover(null);
  },

  startDrag: function (e) {
    this.props.drawConnection(this.props.pin, e, colors.wire);
  },

  renderPin: function (pin, enableHandlers) {
    return g({onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null},
      rect({x: pin.x, y: pin.y, width: pin.width, height: pin.height, fill: '#777'},
        title({}, pin.getLabel())
      )
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
        inputRect = {x: pin.x + (pin.width / 2), y: pin.y, width: pin.width / 2, height: pin.height};
        outputRect = {x: pin.x, y: pin.y, width: pin.width / 2, height: pin.height};
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
        showColors = this.props.stepping && this.props.showPinColors && !pin.notConnectable,
        enableHandlers = this.props.selected && this.props.editable;

    return showColors ? this.renderIOPin(pin, enableHandlers) : this.renderPin(pin, enableHandlers);
  }
});


},{"./colors":42}],51:[function(require,module,exports){
var events = require('../shared/events'),
    TTL = require('../../models/shared/ttl'),
    g = React.DOM.g,
    path = React.DOM.path,
    circle = React.DOM.circle,
    rect = React.DOM.rect,
    text = React.DOM.text;

module.exports = React.createClass({
  displayName: 'ProbeView',

  getInitialState: function () {
    return {
      dragging: false,
      lowColor: TTL.getColor(TTL.LOW_VOLTAGE),
      highColor: TTL.getColor(TTL.HIGH_VOLTAGE),
      invalidColor: TTL.getColor(TTL.INVALID_VOLTAGE)
    };
  },

  startDrag: function (e) {
    var $window = $(window),
        self = this,
        drag, stopDrag;

    this.props.draggingProbe(true);

    e.preventDefault();
    e.stopPropagation();

    this.setState({animationStart: this.getCurrentPos(), animationStep: 0});
    this.props.setProbe({source: null, pos: this.getNewPos(e)});
    this.setAnimationTimer();

    drag = function (e) {
      e.preventDefault();
      self.props.setProbe({source: null, pos: self.getNewPos(e)});
    };

    stopDrag = function (e) {
      self.props.draggingProbe(false);
      self.setState({animationStart: null});

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

  getNewPos: function (e) {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected);
    return {x: (e.pageX - this.props.svgOffset.left), y: (e.pageY - this.props.svgOffset.top) - (selectedConstants.PROBE_HEIGHT / 2)};
  },

  getCurrentPos: function () {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected);
    return {
      x: this.props.probeSource ? this.props.probeSource.cx : (this.props.pos ? this.props.pos.x : selectedConstants.BOARD_WIDTH - selectedConstants.PROBE_WIDTH - selectedConstants.PROBE_MARGIN),
      y: this.props.probeSource ? this.props.probeSource.cy - (selectedConstants.PROBE_HEIGHT / 2) : (this.props.pos ? this.props.pos.y : selectedConstants.BOARD_HEIGHT - selectedConstants.PROBE_HEIGHT - selectedConstants.PROBE_MARGIN)
    };
  },

  setAnimationTimer: function () {
    clearTimeout(this.animationTimer);
    this.animationTimer = setTimeout(this.animate, 15);
  },

  animate: function () {
    if (this.state.animationStep < 9) {
      this.setState({animationStep: this.state.animationStep + 1});
      this.setAnimationTimer();
    }
    else {
      this.setState({animationStart: null});
    }
  },

  getAnimatedPos: function (currentPos) {
    var dx, dy, percentage, pos;
    if (!this.state.animationStart) {
      return currentPos;
    }
    percentage = this.state.animationStep / 10;
    dx = currentPos.x - this.state.animationStart.x;
    dy = currentPos.y - this.state.animationStart.y;
    pos = {
      x: this.state.animationStart.x + (dx * percentage),
      y: this.state.animationStart.y + (dy * percentage)
    };
    return pos;
  },

  // copied from http://stackoverflow.com/a/9232092
  truncateDecimals: function (num, digits) {
    var numS = num.toString(),
        decPos = numS.indexOf('.'),
        substrLength = decPos == -1 ? numS.length : 1 + decPos + digits,
        trimmedResult = numS.substr(0, substrLength),
        finalResult = isNaN(trimmedResult) ? 0 : trimmedResult;

    return parseFloat(finalResult);
  },

  render: function () {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        width = selectedConstants.PROBE_WIDTH,
        height = selectedConstants.PROBE_HEIGHT,
        halfNeedleHeight = selectedConstants.PROBE_NEEDLE_HEIGHT / 2,
        pos = this.getAnimatedPos(this.getCurrentPos()),
        x = pos.x,
        y = pos.y,
        middleY = y + (height / 2),
        defaultFill = 0.125,
        redFill = defaultFill,
        greenFill = defaultFill,
        amberFill = defaultFill,
        voltage = "--",
        needlePath, handlePath, rotation;

    if (this.props.probeSource && (!this.props.probeSource.inputMode || this.props.probeSource.connected)) {

      voltage = this.truncateDecimals(this.props.probeSource.getVoltage(), 2);

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
      rect({x: x + (2 * height), y: y + (0.15 * height), width: (2 * height), height: (0.7 * height), stroke: '#555', fill: '#ddd'}),
      text({x: x + (3 * height), y: middleY + 1, fontSize: selectedConstants.PROBE_HEIGHT * 0.6, fill: '#000', style: {textAnchor: 'middle'}, dominantBaseline: 'middle'}, voltage),
      circle({cx: x + (4.75 * height), cy: middleY, r: height / 4, fill: this.state.highColor, stroke: '#ccc', fillOpacity: redFill}),
      circle({cx: x + (5.75 * height), cy: middleY, r: height / 4, fill: this.state.lowColor, stroke: '#ccc', fillOpacity: greenFill}),
      circle({cx: x + (6.75 * height), cy: middleY, r: height / 4, fill: this.state.invalidColor, stroke: '#ccc', fillOpacity: amberFill})
    );
  }
});



},{"../../models/shared/ttl":24,"../shared/events":45}],52:[function(require,module,exports){
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


},{"../../controllers/shared/log":4,"../../controllers/shared/user":5,"./chat-items":41}],53:[function(require,module,exports){
var div = React.DOM.div;

module.exports = React.createClass({
  displayName: 'SpacerView',

  render: function () {
    return div({className: 'spacer', style: {height: this.props.constants.SPACER_HEIGHT}});
  }
});


},{}],54:[function(require,module,exports){
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


},{"../../data/shared/group-names":8}],55:[function(require,module,exports){
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


},{}],56:[function(require,module,exports){
var div = React.DOM.div,
    h2 = React.DOM.h2,
    logController = require('../../controllers/shared/log'),
    button = React.DOM.button;

module.exports = React.createClass({
  displayName: 'WeGotItPopupView',

  clicked: function () {
    logController.logEvent("Submit close button clicked", this.props.allCorrect ? 'done' : 'resume');
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


},{"../../controllers/shared/log":4}],57:[function(require,module,exports){
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
          if (self.userClickedSubmit) {
            logController.logEvent("Submit clicked", userController.getUsername(), {correct: allCorrect});
            self.userClickedSubmit = false;
          }
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
    var self = this;

    e.preventDefault();

    if (this.props.soloMode) {
      this.props.checkIfCircuitIsCorrect(function (allCorrect) {
        logController.logEvent("Submit clicked", "n/a", {correct: allCorrect});
        self.setState({showPopup: true, allCorrect: allCorrect});
      });
    }
    else {
      this.userClickedSubmit = true;
      this.submitRef.set({
        user: userController.getUsername(),
        at: Firebase.ServerValue.TIMESTAMP
      });
    }
  },

  render: function () {
    if (this.props.currentUser || this.props.soloMode) {
      return div({id: "we-got-it"},
        button({onClick: this.clicked}, this.props.soloMode ? "I got it!" : "We got it!"),
        this.state.showPopup ? WeGotItPopupView({allCorrect: this.state.allCorrect, hidePopup: this.hidePopup}) : null
      );
    }
    else {
      return null;
    }
  }
});


},{"../../controllers/shared/log":4,"../../controllers/shared/user":5,"./we-got-it-popup":56}],58:[function(require,module,exports){
var div = React.DOM.div,
    b = React.DOM.b,
    input = React.DOM.input,
    button = React.DOM.button;

// this is here to allow others to tweak the wire colors and curvature

module.exports = React.createClass({
  displayName: 'WireControls',

  update: function () {
    this.props.updateWireSettings({
      color: this.refs.color.value,
      curvyness: this.refs.curvyness.value
    });
  },

  render: function () {
    return div({style: {textAlign: 'center', backgroundColor: '#00f', padding: '5px 0', color: '#fff'}},
      b({}, 'Wire Settings:'),
      ' Color: (RGB) ',
      input({style: {width: 100, margin: '0 10px'}, ref: 'color', defaultValue: this.props.wireSettings.color}),
      ' Curvyness: (0 to 1) ',
      input({style: {width: 50, margin: '0 10px'}, ref: 'curvyness', defaultValue: this.props.wireSettings.curvyness}),
      button({onClick: this.update, style: {margin: '0 10px'}}, 'Update')
    );
  }
});


},{}],59:[function(require,module,exports){
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
      pointerEvents: this.props.enablePointerEvents ? 'stroke' : 'none'
    });
  }
});


},{"../../views/shared/layout":46}],60:[function(require,module,exports){
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
},{"./structured-clone":63}],61:[function(require,module,exports){
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

},{"./iframe-endpoint":60,"./parent-endpoint":62}],62:[function(require,module,exports){
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

},{"./structured-clone":63}],63:[function(require,module,exports){
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

},{}],64:[function(require,module,exports){
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

},{"./lib/iframe-endpoint":60,"./lib/iframe-phone-rpc-endpoint":61,"./lib/parent-endpoint":62,"./lib/structured-clone":63}]},{},[1]);
