var userController = require('../../controllers/shared/user'),
    logController = require('../../controllers/shared/log'),
    ChatItems, ChatItem;

module.exports = React.createClass({

  displayName: 'SidebarChat',

  getInitialState: function() {
    var items = [];
    var interface = this.props.interface || {};

    if (this.props.initialChatMessage) {
      items.push({
        prefix: 'Welcome!',
        message: this.props.initialChatMessage
      });
    }

    return {
      items: items,
      chatType: "unselected",
      enableChatType: !!interface.enableChatType
    };
  },

  componentWillMount: function() {
    var self = this;
    userController.onGroupRefCreation(function() {
      self.firebaseRef = userController.getFirebaseGroupRef().child("chat");
      self.firebaseRef.orderByChild('time').on("child_added", function(dataSnapshot) {
        var items = self.state.items.slice(0),
            item = dataSnapshot.val();

        items.push(item);

        self.setState({
          items: items
        });
      }.bind(self));
    });
  },

  componentWillUnmount: function() {
    this.firebaseRef.off();
  },

  handleSubmit: function(e) {
    var input = this.refs.text,
        type = this.refs.chatType,
        message = input.value.replace(/^\s+|\s+$/, ''),
        haveType = !this.state.enableChatType || (this.state.chatType !== "unselected");
    e.preventDefault();
    if ((message.length > 0) && haveType) {
      this.firebaseRef.push({
        user: userController.getUsername(),
        message: message,
        type: this.state.chatType,
        time: firebase.database.ServerValue.TIMESTAMP
      });
      input.value = '';
      if (type) { type.focus(); } else { input.focus(); }
      logController.logEvent("Sent message", null, {message: message, type: this.state.chatType});
      this.setState({chatType: "unselected"});
    }
  },

  listenForEnter: function (e) {
    if (e.keyCode === 13) {
      this.handleSubmit(e);
    }
  },

  typeChanged: function (e) {
    this.setState({chatType: e.target.value});
    if (e.target.value !== "unselected") {
      this.refs.text.focus();
    }
  },

  renderChatType: function () {
    if (!this.state.enableChatType) {
      return null;
    }
    return (
      <select ref="chatType" className="sidebar-chat-type" value={this.state.chatType} onChange={this.typeChanged}>
        <option value="unselected">Select message type...</option>
        <option value="suggestion">Make Suggestion</option>
        <option value="question">Ask Question</option>
        <option value="inform">Inform Teammates</option>
        <option value="emotion">Express Emotion</option>
        <option value="agree">Agree</option>
        <option value="disagree">Disagree</option>
      </select>
    );
  },

  render: function() {
    var disabled = this.state.enableChatType && (this.state.chatType === "unselected");
    return (
      <div className="sidebar-chat">
        <ChatItems items={ this.state.items } slotsRemaining={this.props.slotsRemaining} waitingRoomMessage={this.props.waitingRoomMessage} />
        <div className="sidebar-chat-input">
          <form onSubmit={ this.handleSubmit }>
            { this.renderChatType() }
            <textarea ref="text" placeholder="Enter chat message here..." onKeyDown={this.listenForEnter} disabled={disabled} />
            <br/>
            <button onClick={ this.handleSubmit } disabled={disabled}>Send Chat Message</button>
          </form>
        </div>
      </div>
    );
  }
});

ChatItems = React.createClass({
  displayName: 'ChatItems',

  componentDidUpdate: function (prevProps) {
    if (prevProps.items.length !== this.props.items.length) {
      if (this.refs.items) {
        this.refs.items.scrollTop = this.refs.items.scrollHeight;
      }
    }
  },

  render: function () {
    var user = userController.getUsername();
    return <div ref="items" className="sidebar-chat-items">
      {this.props.items.map(function(item, i) {
        var owner = (item.user == user) ? "me" : item.user == "System" ? "system" : "others";
        return <ChatItem key={ i } item={ item } owner={ owner } />;
      })}
      {this.renderWaiting()}
    </div>;
  },

  renderWaiting: function () {
    if (this.props.slotsRemaining && this.props.waitingRoomMessage) {
      return (
        <div className='chat-item chat-item-system'>
          <b>System:</b> { this.props.waitingRoomMessage }
        </div>
      );
    }
  }
});

ChatItem = React.createClass({
  displayName: 'ChatItem',

  render: function () {
    var className = 'chat-item chat-item-'+this.props.owner;
    var typePrefix = "";
    switch (this.props.item.type) {
      case "suggestion": typePrefix = "Suggestion from "; break;
      case "question": typePrefix = "Question from "; break;
      case "inform": typePrefix = "Information from "; break;
      case "emotion": typePrefix = "Emotion from "; break;
      case "agree": typePrefix = "Agreement from "; break;
      case "disagree": typePrefix = "Disagreement from "; break;
    }
    return <div className={ className }>
        <b>{ this.props.item.prefix || (typePrefix + this.props.item.user + ':') }</b> { this.props.item.message }
      </div>;
  }
});
