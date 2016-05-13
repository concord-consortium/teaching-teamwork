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
      numExistingUsers: 0
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
        message = input.value.replace(/^\s+|\s+$/, '');
    e.preventDefault();
    if (message.length > 0) {
      this.firebaseRef.push({
        user: userController.getUsername(),
        message: message,
        time: Firebase.ServerValue.TIMESTAMP
      });
      input.value = '';
      input.focus();
      logController.logEvent("Sent message", message);
    }
  },

  listenForEnter: function (e) {
    if (e.keyCode === 13) {
      this.handleSubmit(e);
    }
  },

  render: function() {
    return (
      <div className="sidebar-chat">
        <ChatItems items={ this.state.items } />
        <div className="sidebar-chat-input">
          <form onSubmit={ this.handleSubmit }>
            <textarea ref="text" placeholder="Enter chat message here..." onKeyDown={this.listenForEnter} />
            <br/>
            <button onClick={ this.handleSubmit }>Send Chat Message</button>
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
    return <div className={ className }>
        <b>{ this.props.item.prefix || (this.props.item.user + ':') }</b> { this.props.item.message }
      </div>;
  }
});
