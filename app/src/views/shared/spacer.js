var div = React.DOM.div;

module.exports = React.createClass({
  displayName: 'SpacerView',

  render: function () {
    return div({className: 'spacer', style: {height: this.props.constants.SPACER_HEIGHT}});
  }
});
