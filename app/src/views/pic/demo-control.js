var div = React.DOM.div,
    button = React.DOM.button;
    
module.exports = React.createClass({
  displayName: 'DemoControlView',

  toggleAllWires: function () {
    this.props.toggleAllWires();
  },

  toggleDebugPins: function () {
    this.props.toggleDebugPins();
  },

  render: function () {
    return div({id: 'demo-control'},
      div({id: 'demo-control-title'}, 'Demo Control'),
      div({id: 'demo-control-area'},
        button({onClick: this.toggleAllWires}, (this.props.addedAllWires ? '-' : '+') + ' Wires'),
        !this.props.running ? button({onClick: this.toggleDebugPins}, (this.props.showDebugPins ? '-' : '+') + ' Pin Colors') : null
      )
    );
  }
});
