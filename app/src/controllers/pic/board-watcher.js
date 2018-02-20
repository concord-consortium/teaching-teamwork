var userController = require('../shared/user');

var BoardWatcher = function () {
  this.firebase = null;
  this.listeners = {};
};
BoardWatcher.prototype.startListeners = function (numBoards) {
  var self = this,
      listenerCallbackFn = function (boardNumber) {
        return function (snapshot) {
          var i, val;
          if (self.listeners[boardNumber]) {
            val = snapshot.val();
            for (i = 0; i < self.listeners[boardNumber].length; i++) {
              self.listeners[boardNumber][i].listener(self.listeners[boardNumber][i].board, val);
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
