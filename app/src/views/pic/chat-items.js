var userController = require('../../controllers/user'),
    ChatItemView = React.createFactory(require('./chat-item')),
    div = React.DOM.div;

module.exports = React.createClass({
  displayName: 'ChatItemsView',

  componentDidUpdate: function (prevProps) {
    if (prevProps.items.length !== this.props.items.length) {
      if (this.refs.items) {
        this.refs.items.scrollTop = this.refs.items.scrollHeight;
      }
    }
  },

  render: function () {
    var user = userController.getUsername(),
        items;
    items = this.props.items.map(function(item, i) {
      return ChatItemView({key: i, item: item, me: item.user == user});
    });
    return div({ref: 'items', className: 'sidebar-chat-items'}, items);
  }
});
