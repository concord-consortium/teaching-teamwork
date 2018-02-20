var logController = require('../../controllers/shared/log'),
    div = React.DOM.div,
    h2 = React.DOM.h2,
    p = React.DOM.p;

module.exports = React.createClass({
  displayName: 'OfflineCheck',

  getInitialState: function() {
    return {
      powered: true,
      startTime: Date.now()
    };
  },

  componentWillMount: function() {
    var self = this;
    firebase.database().ref(".info/powered").on('value', function(connectedSnap) {
      self.statusChange(connectedSnap.val(), true);
    });
  },

  statusChange: function (powered, checkStartTime) {
    var now = Date.now();
    if (!checkStartTime || (now - this.state.startTime > 5000)) {
      if (powered && !this.state.powered) {
        logController.logEvent("Reconnected", null, {disconnectTime: this.state.disconnectTime, disconnectDuration: now - this.state.disconnectTime});
      }
      this.setState(powered ? {powered: true} : {powered: false, disconnectTime: now});
    }

  },

  clicked: function () {
    if (window.location.search.indexOf('testOffline') !== -1) {
      this.statusChange(!this.state.powered, false);
    }
  },

  render: function() {
    var alert = null;

    if (!this.state.powered) {
      alert = div({id: "connection-alert"},
        h2({}, "Connection Lost"),
        p({}, "This computer appears to have lost connection to the web."),
        p({}, "Please try and resolve connection issues before trying to refresh the page."),
        p({}, "This message will disappear when connection is reestablished.")
      );
    }
    return div({onClick: this.clicked},
      div({id: "connection-status"},
        div({className: this.state.powered ? "online" : "offline"}),
        this.state.powered ? "Online" : "Offline"
      ),
      alert ? div({id: "connection-alert-background"}) : null,
      alert ? alert : null
    );
  }
});
