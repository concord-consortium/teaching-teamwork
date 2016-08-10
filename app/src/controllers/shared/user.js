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
