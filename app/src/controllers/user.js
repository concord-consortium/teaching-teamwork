var UserRegistrationView = require('../views/userRegistration.jsx'),
    logController = require('./log'),
    numClients,
    userName,
    groupName,
    firebaseGroupRef,
    firebaseUsersRef,
    fbUrl,
    groupUsersListener,
    boardsSelectionListener,
    groupRefCreationListeners,
    client,
    callback;

// scratch
var fbUrlBase = 'https://teaching-teamwork.firebaseio.com/dev/';

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


module.exports = {

  init: function(_numClients, _callback) {
    numClients = _numClients;
    callback = _callback;
    UserRegistrationView.open(this, {form: "username"});
  },

  setName: function(name) {
    userName = name;
    logController.setUserName(userName);
    if (numClients > 1) {
      UserRegistrationView.open(this, {form: "groupname"});
    } else {
      UserRegistrationView.close();
      callback(0);
    }
  },

  checkGroupName: function(name) {
    var date = getDate(),
        self = this;

    groupName = name;

    fbUrl = fbUrlBase + date + "-" + name + "/";

    firebaseGroupRef = new Firebase(fbUrl);
    firebaseUsersRef = firebaseGroupRef.child('users');
    groupUsersListener = firebaseUsersRef.on("value", function(snapshot) {
      var users = snapshot.val();
      // pass only other users in the room
      if (users) {
        delete users[userName];
      }
      UserRegistrationView.open(self, {form: "groupconfirm", users: users});
    });

    firebaseUsersRef.child(userName).set({lastAction: Math.floor(Date.now()/1000)});

    logController.logEvent("Started to join group", groupName);
  },

  rejectGroupName: function() {
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

  setGroupName: function(name) {
    var self = this;
    groupName = name;
    firebaseUsersRef.off("value", groupUsersListener);

    logController.setGroupName(groupName);

    notifyGroupRefCreation();

    // annoyingly we have to get out of this before the off() call is finalized
    setTimeout(function(){
      boardsSelectionListener = firebaseUsersRef.on("value", function(snapshot) {
        var users = snapshot.val();
        UserRegistrationView.open(self, {form: "selectboard", numClients: numClients, users: users});
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

  getUsername: function() {
    return userName;
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
  }
};
