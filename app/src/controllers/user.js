var UserRegistrationView = require('../views/userRegistration.jsx'),
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
var fbUrlBase = fbUrlDomain + '/dev/';

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
    userName = $.trim($.cookie('userName') || '');
    if (userName.length === 0) {
      UserRegistrationView.open(this, {form: "username"});
    }
    else {
      userController.setName(userName);
    }
  },

  setName: function(name) {
    userName = name;
    $.cookie('userName', name);
    logController.setUserName(userName);
    if (numClients > 1) {
      groupName = $.trim($.cookie('groupName') || '');
      if (groupName.length === 0) {
        UserRegistrationView.open(this, {form: "groupname"});
      }
      else {
        userController.checkGroupName(groupName);
      }
    } else {
      UserRegistrationView.close();
      callback(0);
    }
  },

  checkGroupName: function(name) {
    var date = getDate(),
        self = this;

    groupName = name;

    fbUrl = fbUrlBase + date + "-" + name + "/activities/" + activityName + "/";

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

  setGroupName: function(name) {
    var self = this;
    groupName = name;
    $.cookie('groupName', name);

    firebaseUsersRef.off("value", groupUsersListener);

    logController.setGroupName(groupName);

    notifyGroupRefCreation();

    this.startPinging();

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
  }
};
