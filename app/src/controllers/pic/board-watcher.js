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
  this.firebase.child(board.number).child('layout').set({
    wires: board.serializeWiresToArray(),
    components: board.serializeComponents()
  });
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
