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
