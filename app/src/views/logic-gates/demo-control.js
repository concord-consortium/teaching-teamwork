var div = React.DOM.div,
    button = React.DOM.button;

module.exports = React.createClass({
  displayName: 'DemoControlView',

  toggleAllChipsAndWires: function () {
    this.props.toggleAllChipsAndWires();
  },

  toggleDebugPins: function () {
    this.props.toggleDebugPins();
  },

  render: function () {
    return div({id: 'demo-control'},
      div({id: 'demo-control-title'}, 'Demo Control'),
      div({id: 'demo-control-area'},
        this.props.hasDemoData ? button({onClick: this.toggleAllChipsAndWires}, (this.props.toggledAllChipsAndWires ? '-' : '+') + ' Chips/Wires') : null,
        button({onClick: this.toggleDebugPins}, (this.props.showDebugPins ? '-' : '+') + ' Pin Colors')
      )
    );
  }
});
