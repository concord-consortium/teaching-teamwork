var svg = React.DOM.svg,
    circle = React.DOM.circle,
    title = React.DOM.title,
    rect = React.DOM.rect;

module.exports = React.createClass({
  displayName: 'LEDBank',

  render: function () {
    var position = this.props.connector.position,
        leds = [],
        numHoles = this.props.connector.holes.length,
        hole, i;

    for (i = 0; i < numHoles; i++) {
      hole = this.props.connector.holes[i];
      leds.push(circle({key: i, cx: hole.cx, cy: position.height / 2, r: hole.radius, fill: hole.getColor()}));
    }

    return svg({},
      rect({x: position.x, y: 0, width: position.width, height: position.height, fill: '#aaa'}),
      leds,
      title({}, "LED lights for output testing")
    );
  }
});
