var line = React.DOM.line,
    div = React.DOM.div,
    svg = React.DOM.svg,
    wireColors = require('../../data/shared/wire-colors');

module.exports = React.createClass({
  displayName: 'RibbonView',

  render: function () {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        wires = [],
        boardLeft = selectedConstants.BOARD_LEFT,
        hole, i;

    if (this.props.connector) {
      this.props.connector.calculatePosition(this.props.constants, this.props.selected);
      for (i = 0; i < this.props.connector.holes.length; i++) {
        hole = this.props.connector.holes[i];
        if (!hole.hasForcedVoltage) {
          wires.push(line({key: i, x1: hole.cx + boardLeft, y1: 0, x2: hole.cx + boardLeft, y2: this.props.constants.RIBBON_HEIGHT, strokeWidth: selectedConstants.WIRE_WIDTH, stroke: wireColors[i % wireColors.length]}));
        }
      }
    }
    return div({className: 'ribbon', style: {height: this.props.constants.RIBBON_HEIGHT}},
      svg({}, wires)
    );
  }
});
