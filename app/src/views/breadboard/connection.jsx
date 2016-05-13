var xhrObserver = require('../../data/shared/xhrObserver');
var logController = require('../../controllers/shared/log');

module.exports = React.createClass({
  displayName: 'Connection',

  getInitialState: function() {
    return {connected: true};
  },

  componentWillMount: function() {
    var self = this;
    xhrObserver.addConnectionListener(function(connected) {
      var now = Date.now();
      if (connected && !self.state.connected) {
        logController.logEvent("Reconnected", null, {disconnectTime: self.state.disconnectTime, disconnectDuration: now - self.state.disconnectTime});
      }
      self.setState(connected ? {connected: true} : {connected: false, disconnectTime: now});
    });
  },

  render: function() {
    var alert;
    if (!this.state.connected) {
      alert = (
                <div id="connection-alert">
                  <h2>Connection Lost</h2>
                  <p>This computer appears to have lost connection to the web.</p>
                  <p>Please try and resolve connection issues before trying to refresh the page.</p>
                  <p>This message will disappear when connection is reestablished.</p>
                </div>
              );
    }
    return (
      <div>
        <div id="connection-status">
          <div className={ this.state.connected ? "online" : "offline"}></div>
          {this.state.connected ? "Online" : "Offline"}
        </div>
        { alert }
      </div>
    );
  }
});
