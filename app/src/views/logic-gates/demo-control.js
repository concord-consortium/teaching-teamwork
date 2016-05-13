var div = React.DOM.div,
    button = React.DOM.button;

module.exports = React.createClass({
  displayName: 'DemoControlView',

  toggleAllChipsAndWires: function () {
    this.props.toggleAllChipsAndWires();
  },

  render: function () {
    return div({id: 'demo-control'},
      div({id: 'demo-control-title'}, 'Demo Control'),
      div({id: 'demo-control-area'},
        button({onClick: this.toggleAllChipsAndWires}, (this.props.addedAllChipsAndWires ? '-' : '+') + ' Chips and Wires')
      )
    );
  }
});
