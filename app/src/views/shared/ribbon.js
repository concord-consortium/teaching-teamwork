var line = React.DOM.line,
    div = React.DOM.div,
    svg = React.DOM.svg;

module.exports = React.createClass({
  displayName: 'RibbonView',

  render: function () {
    var selectedConstants = this.props.constants.selectedConstants(false),
        wires = [],
        colors = ['#800000', '#008000', '#008080', '#00FFFF', '#000080', '#0000FF', '#800080', '#FF0000'],
        hole, i;

    if (this.props.connector) {
      for (i = 0; i < this.props.connector.holes.length; i++) {
        hole = this.props.connector.holes[i];
        wires.push(line({key: i, x1: hole.cx, y1: 0, x2: hole.cx, y2: this.props.constants.RIBBON_HEIGHT, strokeWidth: selectedConstants.WIRE_WIDTH, stroke: colors[i % colors.length]}));
      }
    }
    return div({style: {height: this.props.constants.RIBBON_HEIGHT}},
      svg({}, wires)
    );
  }
});
