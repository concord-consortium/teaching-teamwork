var div = React.DOM.div,
    button = React.DOM.button;

module.exports = React.createClass({
  displayName: 'AutoWiringView',

  toggleAllWires: function () {
    this.props.toggleAllWires();
  },

  render: function () {
    return div({id: 'auto-wiring', style: {top: this.props.top}},
      div({id: 'auto-wiring-title'}, 'Auto Wiring'),
      div({id: 'auto-wiring-area'},
        button({onClick: this.toggleAllWires}, 'Toggle Wires')
      )
    );
  }
});
