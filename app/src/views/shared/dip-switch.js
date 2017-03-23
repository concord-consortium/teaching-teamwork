var g = React.DOM.g,
    rect = React.DOM.rect,
    events = require('../shared/events');

module.exports = React.createClass({
  displayName: 'DIPSwitchView',

  handleToggle: function () {
    var newVoltage = this.props.hole.toggleForcedVoltage();
    this.props.hole.connector.board.resolver.resolve(true);
    this.props.forceRerender();
    events.logEvent(events.TOGGLED_SWITCH_EVENT, newVoltage, {board: this.props.hole.connector.board, hole: this.props.hole});
  },

  render: function () {
    var hole = this.props.hole,
        radius = hole.radius,
        position = this.props.connector.position,
        layout = {x: hole.cx - radius, y: (position.height - (radius * 2))/2, width: radius * 2, height: radius},
        isLow = hole.isLow(),
        backgroundColor = '#777';

    return g({onClick: this.props.editable ? this.handleToggle : null},
      rect({x: layout.x, y: layout.y, width: layout.width, height: layout.height, fill: !isLow ? hole.getColor() : backgroundColor}),
      rect({x: layout.x, y: layout.y + layout.height, width: layout.width, height: layout.height, fill: isLow ? hole.getColor() : backgroundColor})
    );
  }
});
