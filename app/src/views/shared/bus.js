var line = React.DOM.line,
    div = React.DOM.div,
    svg = React.DOM.svg,
    wireColors = require('../../data/shared/wire-colors');

module.exports = React.createClass({
  displayName: 'BusView',

  render: function () {
    var selectedConstants = this.props.constants.selectedConstants(false),
        wires = [],
        keyIndex = 0,
        connectorPositions = [],
        hole, i, j, x, y, board, connector, wireMargin, wireStartPositions, wireStartPosition, firstConnectorPosition, lastConnectorPosition, wireEndPosition, style;

    if (this.props.boards && this.props.boards[0].connectors.bus) {
      wireMargin = selectedConstants.BOARD_LEFT / (this.props.boards[0].connectors.bus.holes.length + 1);
      x = wireMargin;

      for (i = 0; i < this.props.boards.length; i++) {
        board = this.props.boards[i];
        connector = board.connectors.bus;
        y = ((selectedConstants.BOARD_HEIGHT + this.props.constants.RIBBON_HEIGHT) * i) + (this.props.hasTopRibbon ? this.props.constants.RIBBON_HEIGHT : 0);
        wireStartPositions = [];
        for (j = 0; j < connector.holes.length; j++) {
          hole = connector.holes[j];
          wireStartPosition = {
            x: x + (wireMargin * j),
            y: y + hole.cy
          };
          wireStartPositions.push(wireStartPosition);
          wires.push(line({key: 'h'+(keyIndex++), x1: wireStartPosition.x, y1: wireStartPosition.y, x2: selectedConstants.BOARD_LEFT, y2: wireStartPosition.y, strokeWidth: selectedConstants.WIRE_WIDTH, stroke: wireColors[j % wireColors.length]}));
        }
        connectorPositions.push(wireStartPositions);
      }

      firstConnectorPosition = connectorPositions[0];
      lastConnectorPosition = connectorPositions[connectorPositions.length - 1];
      for (i = 0; i < firstConnectorPosition.length; i++) {
        wireStartPosition = firstConnectorPosition[i];
        wireEndPosition = lastConnectorPosition[i];
        wires.push(line({key: 'v'+(keyIndex++), x1: wireStartPosition.x, y1: wireStartPosition.y, x2: wireEndPosition.x, y2: wireEndPosition.y, strokeWidth: selectedConstants.WIRE_WIDTH, stroke: wireColors[i % wireColors.length]}));
      }
    }

    style = {width: selectedConstants.BOARD_LEFT};
    if (this.props.height) {
      style.height = this.props.height;
    }
    return div({className: 'bus', style: style},
      svg({}, wires)
    );
  }
});
