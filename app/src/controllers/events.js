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
