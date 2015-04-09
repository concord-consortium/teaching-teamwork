var userController = require('../controllers/user'),
    logController = require('../controllers/log'),
    ChatItems, ChatItem;

module.exports = React.createClass({

  displayName: 'SidebarChat',

  getInitialState: function() {
    return {items: []};
  },

  componentWillMount: function() {
    var self = this;
    userController.onGroupRefCreation(function() {
      self.firebaseRef = userController.getFirebaseGroupRef().child("chat");
      self.firebaseRef.on("child_added", function(dataSnapshot) {
        var items = self.state.items.slice(0);
        items.push(dataSnapshot.val());
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
    var input = this.refs.text.getDOMNode(),
        message = input.value;
    e.preventDefault();
    this.firebaseRef.push({
      user: userController.getUsername(),
      message: message
    });
    input.value = '';
    input.focus();
    logController.logEvent("Sent message", message);
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
    console.log('componentDidUpdate ' + prevProps.items.length + ' / ' + this.props.items.length);
    if (prevProps.items.length !== this.props.items.length) {
      var items = this.refs.items ? this.refs.items.getDOMNode() : null;
      if (items) {
        items.scrollTop = items.scrollHeight;
      }
    }
  },

  render: function () {
    var user = userController.getUsername();
    return <div ref="items" className="sidebar-chat-items">
      {this.props.items.map(function(item, i) {
        return <ChatItem key={ i } item={ item } me={ item.user == user } />;
      })}
    </div>;
  }
});

ChatItem = React.createClass({
  displayName: 'ChatItem',

  render: function () {
    return <div className={ this.props.me ? 'chat-item chat-item-me' : 'chat-item chat-item-others' }>
        <b>{ this.props.item.user }:</b> { this.props.item.message }
      </div>;
  }
});

