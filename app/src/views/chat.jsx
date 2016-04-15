var GoalTable = require('./goalTable.jsx'),
    GoalTableFactory = React.createFactory(GoalTable),
    ReactTransitionGroup = React.addons.TransitionGroup,
    userController = require('../controllers/user'),
    logController = require('../controllers/log');

module.exports = React.createClass({
  displayName: 'Chat',

  getInitialState: function() {
    this.items = [];
    return {items: [], text: ""};
  },
  componentWillMount: function() {
    var self = this;
    userController.onGroupRefCreation(function() {
      self.firebaseRef = userController.getFirebaseGroupRef().child("chat");
      self.firebaseRef.orderByChild('time').on("child_added", function(dataSnapshot) {
        self.items.push(dataSnapshot.val());
        self.setState({
          items: self.items
        });
      }.bind(self));
    });
  },
  componentWillUnmount: function() {
    this.firebaseRef.off();
  },
  onChange: function(e) {
    this.setState({text: e.target.value});
  },
  handleSubmit: function(e) {
    e.preventDefault();
    this.firebaseRef.push({
      user: userController.getUsername(),
      message: this.state.text,
      time: Firebase.ServerValue.TIMESTAMP
    });
    logController.logEvent("Sent message", this.state.text);
    this.setState({text: ""});
  },
  handleSendVal: function(e) {
    e.preventDefault();
    var val   = sparks.workbenchController.workbench.meter.dmm.currentValue,
      units = sparks.workbenchController.workbench.meter.dmm.currentUnits || "V";

    this.firebaseRef.push({
      user: userController.getUsername(),
      message: val+" "+units,
      val: val,
      units: units,
      time: Firebase.ServerValue.TIMESTAMP
    });
    logController.logEvent("Sent value", val+" "+units);
  },
  render: function() {

    var table = null,
        sendMeas = null;

    if (this.props.simpleMeasurementGame) {
      table = GoalTableFactory(this.props.simpleMeasurementGame);
      sendMeas = <button id="send-val" onClick={ this.handleSendVal }>Send measurement</button>;
    }

    var Message = React.createClass({
      componentDidEnter: function() {
        $('#messages').stop().animate({
          scrollTop: $("#messages")[0].scrollHeight
        }, 800);
      },
      render: function() {
        return <div key={ this.props.i } className='chat'><b>{ this.props.item.user }:</b> { this.props.item.message }</div>;
      }
    });

    return (
      <div id="chat">
        <div id="messages">
          <ReactTransitionGroup>
            {this.state.items.map(function(item, i) {
              return <Message i={ i } item={ item } />;
            })}
          </ReactTransitionGroup>
        </div>
        { table }
        <div id="input">
          <form onSubmit={ this.handleSubmit }>
            Send chat:
              <input onChange={ this.onChange } value={ this.state.text }type="text" size="70" id="send-chat" />
              <button id="send" onClick={ this.handleSubmit }>Send</button>
              { sendMeas }
          </form>
        </div>
      </div>
    );
  }
});
