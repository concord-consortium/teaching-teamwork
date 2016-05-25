var g = React.DOM.g,
    circle = React.DOM.circle;

module.exports = React.createClass({
  displayName: 'OutputLEDView',

  render: function () {
    return g({},
      circle({cx: this.props.hole.cx, cy: this.props.constants.OUTPUT_LEDS_HEIGHT / 2, r: this.props.hole.radius, fill: this.props.hole.value ? '#0f0' : '#f00'})
    );
  }
});
