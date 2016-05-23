var boardWatcher = require('../../controllers/pic/board-watcher'),
    logController = require('../../controllers/shared/log'),
    events;

module.exports = events = {
  MOVED_PROBE_EVENT: 'Moved probe',
  PUSHED_BUTTON_EVENT: 'Pushed button',
  ADD_WIRE_EVENT: 'Add wire',
  REMOVE_WIRE_EVENT: 'Remove wire',
  OPENED_BOARD_EVENT: 'Opened board',
  CLOSED_BOARD_EVENT: 'Closed board',
  RUN_EVENT: 'Run',
  STOP_EVENT: 'Stop',
  STEP_EVENT: 'Step',
  RESET_EVENT: 'Reset',

  logEvent: function (eventName, value, parameters) {
    var loggedValue = null,
        loggedParameters = null;

    if (eventName === events.MOVED_PROBE_EVENT) {
      loggedParameters = parameters.board.serializeEndpoint(value, 'to');
      boardWatcher.movedProbe(parameters.board, loggedParameters);
    }
    else if (eventName == events.PUSHED_BUTTON_EVENT) {
      loggedValue = value.value;
      loggedParameters = {
        board: value.component.board.number
      };
      boardWatcher.pushedButton(parameters.board, value.value);
    }
    else if (eventName == events.ADD_WIRE_EVENT) {
      loggedParameters = {
        source: parameters.board.serializeEndpoint(parameters.source, 'type'),
        dest: parameters.board.serializeEndpoint(parameters.dest, 'type')
      };
      boardWatcher.circuitChanged(parameters.board);
    }
    else if (eventName == events.REMOVE_WIRE_EVENT) {
      loggedParameters = {
        source: parameters.board.serializeEndpoint(parameters.source, 'type')
      };
      boardWatcher.circuitChanged(parameters.board);
    }
    else {
      // log the raw event value and parameters
      logController.logEvent(eventName, value, parameters);
      return;
    }

    logController.logEvent(eventName, loggedValue, loggedParameters);
  }
};