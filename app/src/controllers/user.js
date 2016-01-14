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
    serverSkew,
    ping;

// scratch
var fbUrlDomain = 'https://teaching-teamwork.firebaseio.com/';
var fbUrlBase = fbUrlDomain + '2016/';

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
      UserRegistrationView.open(this, {form: "groupname", numClients: numClients});
    }
  },

  tryToEnterGroup: function(groupName) {
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

      var numExistingUsers = Object.keys(users).length;

      if (!userName) {
        if (!users) {
          userName = members[0];
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
        firebaseUsersRef.child(userName).set({lastAction: Math.floor(Date.now()/1000)});
        self.startPinging();
      }

      UserRegistrationView.open(self, {form: "groupconfirm", users: users, userName: userName, numExistingUsers: numExistingUsers});
    });

    logController.logEvent("Started to join group", groupName);
  },

  rejectGroupName: function() {
    this.stopPinging();
    // clean up
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
      });
    }

    userName = null;

    firebaseUsersRef.off("value", groupUsersListener);

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
    if (!ping) {
      ping = setInterval(function() {
        firebaseUsersRef.child(userName).child("lastAction").set(Math.floor(Date.now()/1000));
      }, 1000);
    }
  },

  stopPinging: function() {
    if (ping) {
      clearInterval(ping);
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
