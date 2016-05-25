var InputSwitchView = React.createFactory(require('./input-switch')),
    div = React.DOM.div,
    svg = React.DOM.svg;

module.exports = React.createClass({
  displayName: 'InputSwitchesView',

  render: function () {
    var switches = [],
        i;

    if (this.props.connector) {
      for (i = 0; i < this.props.connector.holes.length; i++) {
        switches.push(InputSwitchView({key: i, hole: this.props.connector.holes[i], constants: this.props.constants, selected: this.props.selected, editable: this.props.editable}));
      }
    }

    return div({style: {height: this.props.constants.INPUT_SWITCHES_HEIGHT}},
      svg({},
        switches
      )
    );
  }
});
