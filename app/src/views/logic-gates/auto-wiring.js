var div = React.DOM.div,
    button = React.DOM.button;

module.exports = React.createClass({
  displayName: 'AutoWiringView',

  toggleAllChipsAndWires: function () {
    this.props.toggleAllChipsAndWires();
  },

  render: function () {
    return div({id: 'auto-wiring'},
      div({id: 'auto-wiring-title'}, 'Auto Wiring'),
      div({id: 'auto-wiring-area'},
        button({onClick: this.toggleAllChipsAndWires}, 'Toggle Chips/Wires')
      )
    );
  }
});
