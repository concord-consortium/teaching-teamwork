var xhrObserver = require('../data/xhrObserver');

module.exports = React.createClass({
  displayName: 'Connection',

  getInitialState: function() {
    return {connected: true};
  },

  componentWillMount: function() {
    var self = this;
    xhrObserver.addConnectionListener(function(connected) {
      self.setState({connected: connected});
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
