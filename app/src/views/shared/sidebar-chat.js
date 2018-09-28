var userController = require('../../controllers/shared/user'),
    logController = require('../../controllers/shared/log'),
    ChatItems = React.createFactory(require('./chat-items')),
    div = React.DOM.div,
    form = React.DOM.form,
    textarea = React.DOM.textarea,
    br = React.DOM.br,
    button = React.DOM.button;

module.exports = React.createClass({
  displayName: 'SidebarChatView',

  getInitialState: function() {
    var items = [];

    if (this.props.initialChatMessage) {
      items.push({
        prefix: 'Welcome!',
        message: this.props.initialChatMessage
      });
    }

    return {
      items: items
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
        message = $.trim(input.value);

    e.preventDefault();

    if (message.length > 0) {
      this.firebaseRef.push({
        user: userController.getUsername(),
        message: message,
        time: firebase.database.ServerValue.TIMESTAMP
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

  render: function () {
    return div({id: 'sidebar-chat', style: {top: this.props.top}},
      div({id: 'sidebar-chat-title'}, 'Chat'),
      ChatItems({items: this.state.items}),
      div({className: 'sidebar-chat-input'},
        form({onSubmit: this.handleSubmit},
          textarea({ref: 'text', placeholder: 'Enter chat message here...', onKeyDown: this.listenForEnter}),
          br({}),
          button({onClick: this.handleSubmit}, 'Send Chat Message')
        )
      )
    );
  }
});
