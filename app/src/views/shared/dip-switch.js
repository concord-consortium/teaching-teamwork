var g = React.DOM.g,
    circle = React.DOM.circle,
    path = React.DOM.path,
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
        layout = {x: hole.cx - radius, y: 6 + (position.height - (radius * 2))/2, width: radius * 2, height: radius},
        cx = layout.x + radius,
        cy = layout.y + radius,
        endX  = layout.x + (radius * 2),
        endY = hole.isLow() ? (layout.y-radius) : (layout.y+(radius*3)),
        controlY = hole.isLow() ? (cy+3) : (cy-3),
        dSwitch = "m"+layout.x+","+endY+"L"+(cx-2)+","+cy+"C"+(cx-2)+","+controlY+","+(cx+2)+","+controlY+","+(cx+2)+","+cy+"L"+endX+","+endY,
        dShine = "m"+(cx+1)+","+cy+"L"+(endX-1)+","+endY,
        baseColor = hole.isLow() ? "blue" : "red";

    return g({onClick: this.props.editable ? this.handleToggle : null, style: { cursor: "pointer" }},
      circle({cx: cx, cy: cy, r: radius, fill: baseColor}),
      circle({cx: cx, cy: cy, r: radius-1, fill: "#777"}),
      path({d: dSwitch, fill: "#BEBEBE"}),
      path({d: dShine, stroke: "#DDD"}),
      circle({cx: cx, cy: endY, r: radius, fill: "#EEE"}),
      circle({cx: cx-1, cy: endY-1, r: radius-0.7, fill: "#CECECE"})
    );
  }
});
