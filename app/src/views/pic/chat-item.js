var div = React.DOM.div,
    b = React.DOM.b;
    
module.exports = React.createClass({
  displayName: 'ChatItemView',

  render: function () {
    return div({className: this.props.me ? 'chat-item chat-item-me' : 'chat-item chat-item-others'},
      b({}, this.props.item.prefix || (this.props.item.user + ':')),
      ' ',
      this.props.item.message
    );
  }
});
