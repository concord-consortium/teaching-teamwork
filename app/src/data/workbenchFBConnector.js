var clientListFirebaseRef,
    myCircuitFirebaseRef,
    clientNumber,
    wa,
    userController;

function init() {

  sparks.logController.addListener(function(evt) {
    if (evt.name == "Changed circuit") {
      myCircuitFirebaseRef.set(wa.getClientCircuit());
    }
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
    wa.updateClient(client, snapshot.val());
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

  wa = _wa;
  init();
}

WorkbenchFBConnector.prototype.setClientCircuit = function () {
  if (myCircuitFirebaseRef) {
    myCircuitFirebaseRef.set(wa.getClientCircuit());
  }
};

module.exports = WorkbenchFBConnector;
