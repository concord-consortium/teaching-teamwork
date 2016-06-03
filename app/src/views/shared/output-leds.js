var OutputLEDView = React.createFactory(require('./output-led')),
    div = React.DOM.div,
    svg = React.DOM.svg;

module.exports = React.createClass({
  displayName: 'OutputLEDsView',

  render: function () {
    var leds = [],
        i;

    if (this.props.connector) {
      for (i = 0; i < this.props.connector.holes.length; i++) {
        leds.push(OutputLEDView({key: i, hole: this.props.connector.holes[i], constants: this.props.constants}));
      }
    }

    return div({style: {height: this.props.constants.OUTPUT_LEDS_HEIGHT}},
      svg({},
        leds
      )
    );
  }
});
