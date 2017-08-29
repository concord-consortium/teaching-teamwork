var userController = require('../../controllers/shared/user'),
    logController = require('../../controllers/shared/log'),
    ChatItems, ChatItem;

module.exports = React.createClass({

  displayName: 'SidebarChat',

  getInitialState: function() {
    var items = [];

    if (this.props.initialChatMessage) {
      items.push({
        prefix: 'Welcome!',
        message: this.props.initialChatMessage
      });
    }

    return {
      items: items,
      numExistingUsers: 0,
      chatType: "unselected"
    };
  },

  getJoinedMessage: function (numExistingUsers) {
    var slotsRemaining = this.props.numClients - numExistingUsers,
        nums = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"],
        cap = function (string) {
          return string.charAt(0).toUpperCase() + string.slice(1);
        },
        message = " ";

    if (slotsRemaining > 1) {
      // One of three users is here
      message += cap(nums[numExistingUsers]) + " of " + nums[this.props.numClients] + " users is here.";
    } else if (slotsRemaining == 1) {
      // Two of you are now here. One more to go before you can get started!
      message += cap(nums[numExistingUsers]) + " of you are now here. One more to go before you can get started!";
    } else {
      message += "You're all here! Time to start this challenge.";
    }

    return message;
  },

  componentWillMount: function() {
    var self = this;
    userController.onGroupRefCreation(function() {
      self.firebaseRef = userController.getFirebaseGroupRef().child("chat");
      self.firebaseRef.orderByChild('time').on("child_added", function(dataSnapshot) {
        var items = self.state.items.slice(0),
            item = dataSnapshot.val(),
            numExistingUsers = self.state.numExistingUsers;

        if (item.type == "joined") {
          numExistingUsers = Math.min(self.state.numExistingUsers + 1, self.props.numClients);
          item.message += self.getJoinedMessage(numExistingUsers);
        }
        else if (item.type == "left") {
          numExistingUsers = Math.max(self.state.numExistingUsers - 1, 0);
        }

        if (numExistingUsers !== self.state.numExistingUsers) {
          self.setState({numExistingUsers: numExistingUsers});
        }

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
        message = input.value.replace(/^\s+|\s+$/, '');
    e.preventDefault();
    if ((message.length > 0) && (this.state.chatType !== "unselected")) {
      this.firebaseRef.push({
        user: userController.getUsername(),
        message: message,
        type: this.state.chatType,
        time: firebase.database.ServerValue.TIMESTAMP
      });
      input.value = '';
      type.focus();
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

  render: function() {
    var disabled = this.state.chatType === "unselected";
    return (
      <div className="sidebar-chat">
        <ChatItems items={ this.state.items } />
        <div className="sidebar-chat-input">
          <form onSubmit={ this.handleSubmit }>
            <select ref="chatType" className="sidebar-chat-type" value={this.state.chatType} onChange={this.typeChanged}>
              <option value="unselected">Select message type...</option>
              <option value="suggestion">Make Suggestion</option>
              <option value="question">Ask Question</option>
              <option value="inform">Inform Teammates</option>
              <option value="emotion">Express Emotion</option>
              <option value="agree">Agree</option>
              <option value="disagree">Disagree</option>
            </select>
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
    </div>;
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
