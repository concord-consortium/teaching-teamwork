var UserRegistrationView = require('../../views/shared/userRegistration.jsx'),
    groups = require('../../data/shared/group-names')(),
    logController = require('./log'),
    laraController = require('./lara'),
    userController,
    numClients,
    activityName,
    userName,
    groupName,
    classInfo,
    firebaseGroupRef,
    firebaseUsersRef,
    groupUsersListener,
    groupRefCreationListeners,
    client,
    callback,
    serverSkew,
    onDisconnectRef,
    firebaseConfig = {
      apiKey: "AIzaSyBBodQ91rke-1Th07mQU-YgwvIx079BB8k",
      authDomain: "teaching-teamwork-c9ac4.firebaseapp.com",
      databaseURL: "https://teaching-teamwork-c9ac4.firebaseio.com",
      storageBucket: "teaching-teamwork-c9ac4.appspot.com",
      messagingSenderId: "835296818835"
    };

firebase.initializeApp(firebaseConfig);

var getDatePrefix = function() {
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

  return today.getFullYear() + '/' + yyyy+'-'+mm+'-'+dd;
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
var offsetRef = firebase.database().ref('.info/serverTimeOffset');
offsetRef.on("value", function(snap) {
  serverSkew = snap.val();
});

logController.setGetServerSkew(function () {
  return serverSkew;
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

        var initialSignIn = false;
        firebase.auth().onAuthStateChanged(function(user) {
          if (user && initialSignIn) {
            initialSignIn = false;
            var enteredGroup = false;
            if (identity && identity.groupName) {
              enteredGroup = self.tryToEnterGroup(identity.groupName, identity.userName);
            }
            if (!enteredGroup) {
              UserRegistrationView.open(self, {form: "groupname", numClients: numClients});
            }
          }
        });

        if (laraController.loadedFromLara) {
          laraController.getFirebaseJWT(function (result) {
            if (result.token) {
              initialSignIn = true;
              firebase.auth()
                .signInWithCustomToken(result.token)
                .catch(function(error) {
                  console.error(error);
                  alert("Unable to authenticate using your portal token!");
                });
            }
            else {
              console.error(result);
              alert("Unable to get Firebase JWT from portal!");
            }
          });
        }
        else {
          initialSignIn = true;
          firebase.auth()
            .signInAnonymously()
            .catch(function() {
              alert("Unable to sign in anonymously to Firebase!");
            });
        }
      });
    } else {
      callback(0);
    }
  },

  getIdentityFromLara: function (callback) {
    if (laraController.loadedFromLara) {
      UserRegistrationView.open(this, {form: "gettingGlobalState"});
      laraController.waitForInitInteractive(function (globalState, _classInfo) {
        UserRegistrationView.close();
        classInfo = _classInfo;
        callback(globalState && globalState.identity ? globalState.identity : null);
      });
    }
    else {
      callback(null);
    }
  },

  tryToEnterGroup: function(groupName, preferredUserName) {
    var self = this,
        firstUsersRefCallback = true,
        group, members;

    for (var i = 0, ii = groups.length; i < ii; i++) {
      if (groups[i].name == groupName) {
        group = groups[i];
        break;
      }
    }

    if (!group) {
      return false;
    }

    members = group.members;
    userName = preferredUserName || userName;

    this.createFirebaseGroupRef(activityName, groupName, classInfo);

    firebaseUsersRef = firebaseGroupRef.child('users');
    groupUsersListener = firebaseUsersRef.on("value", function(snapshot) {
      var users = snapshot.val() || {},
          email = self.getEmail();

      // don't allow entering the group with the preferred username if it has been taken, unless the lara user email matches
      // (that way users can reenter groups)
      if (firstUsersRefCallback) {
        if (preferredUserName && users[preferredUserName] && users[preferredUserName].email !== email) {
          userName = null;
        }
        firstUsersRefCallback = false;
      }

      var noExistingUsers = Object.keys(users).length === 0;
      if (!userName) {
        if (noExistingUsers) {
          userName = members[0];

          // if we're the first user, delete any existing data
          firebaseGroupRef.child('chat').set({});
          firebaseGroupRef.child('clients').set({});
          firebaseGroupRef.child('model').set({});
        } else {
          for (var i = 0, ii=members.length; i<ii; i++) {
            if (!users[members[i]] || (users[members[i]].email === email)) {
              userName = members[i];
              break;
            }
          }
        }
      }

      if (userName && (noExistingUsers || !users[userName] || (users[userName].email === email))) {
        if (!users[userName]) {
          users[userName] = {here: true, email: email};
          // wait until after we call setGroupName (which clears this listener)
          setTimeout(function () {
            firebaseUsersRef.child(userName).set(users[userName]);
          }, 1);
        }

        // clear the user on disconnects if not from lara
        if (!classInfo) {
          onDisconnectRef = firebaseUsersRef.child(userName).onDisconnect();
          onDisconnectRef.set({});
        }
      }

      if (userName && groupName) {
        self.setGroupName(groupName, true);
      }
      else {
        UserRegistrationView.open(self, {form: "groupconfirm", users: users, userName: userName, groupName: groupName, numExistingUsers: Object.keys(users).length});
      }
    });

    logController.logEvent("Started to join group", groupName);

    return true;
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

  setGroupName: function(_groupName, autoSelectClient) {
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
      if (autoSelectClient) {
        firebaseUsersRef.once("value", function(snapshot) {
          var users = snapshot.val(),
              email = self.getEmail(),
              previousClient = email ? (users[userName] && (users[userName].email === email) && users[userName].hasOwnProperty("client") ? users[userName].client : null) : null;

          // if the user already has a client (coming back from lara) make sure another user doesn't have it selected
          if (previousClient) {
            Object.keys(users).forEach(function (_userName) {
              if ((_userName !== userName) && (users[_userName].client === previousClient)) {
                previousClient = null;
              }
            });
          }

          if (previousClient) {
            self.selectClient(previousClient);
            self.selectedClient(previousClient);

            // force a click in the window so the delete key works
            UserRegistrationView.open(self, {form: "auto-selected-board", client: parseInt(previousClient) || 0, groupName: groupName, userName: userName});
          }
          else {
            autoSelectClient = false;
            UserRegistrationView.open(self, {form: "selectboard", numClients: numClients, users: users, groupName: groupName, userName: userName});
          }
        });
      }

      firebaseUsersRef.on("value", function(snapshot) {
        var users = snapshot.val();
        if (!autoSelectClient) {
          UserRegistrationView.open(self, {form: "selectboard", numClients: numClients, users: users, groupName: groupName, userName: userName});
        }
      });
    }, 1);
  },

  selectClient: function(_client) {
    client = _client;
    firebaseUsersRef.child(userName).set({client: client, email: this.getEmail()});
  },

  setUnknownValues: function (unknownValues) {
    if (firebaseUsersRef) {
      firebaseUsersRef.child(userName).set({client: client, email: this.getEmail(), unknownValues: unknownValues});
    }
    else if (this.listenForUnknownValues) {
      this.listenForUnknownValues(unknownValues);
    }
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
      time: firebase.database.ServerValue.TIMESTAMP
    });
    var disconnectMessageRef = chatRef.push();
    disconnectMessageRef.onDisconnect().cancel();
    disconnectMessageRef.onDisconnect().set({
      user: "System",
      message: userName + " has left",
      type: "left",
      time: firebase.database.ServerValue.TIMESTAMP
    });
    callback(client);
  },

  getUsername: function() {
    return userName;
  },

  getGroupname: function() {
    return groupName;
  },

  getClassInfo: function() {
    return classInfo;
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

  getEmail: function () {
    return classInfo ? (classInfo.email || null) : null;
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

  createFirebaseGroupRef: function (activityName, groupName, _classInfo) {
    var refName;
    classInfo = _classInfo;
    if (classInfo) {
      var portal = classInfo.portal.replace(/[.$[\]#\/]/g, "_");
      refName = "portals/" + portal + "/classes/" + classInfo.classHash + "/interactives/" + classInfo.interactiveId + "/groups/" + groupName + "/activities/" + activityName + "/";
    }
    else {
      refName = getDatePrefix() + "/no-class-id/" + groupName + "/activities/" + activityName + "/";
    }
    console.log("refName", refName);
    firebaseGroupRef = firebase.database().ref(refName);
    return firebaseGroupRef;
  }
};
