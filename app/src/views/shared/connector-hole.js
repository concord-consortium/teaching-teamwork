var g = React.DOM.g,
    circle = React.DOM.circle,
    title = React.DOM.title;

module.exports = React.createClass({
  displayName: 'ConnectorHoleView',

  mouseOver: function () {
    this.props.reportHover(this.props.hole);
  },

  mouseOut: function () {
    this.props.reportHover(null);
  },

  startDrag: function (e) {
    var self = this;
    this.props.drawConnection(this.props.hole, e, this.props.hole.color, function (addedWire, moved) {
      if (!addedWire && !moved) {
        self.handleToggle();
      }
    });
  },

  handleToggle: function () {
    if (!this.props.hole.toggleable) {
      this.props.hole.toggleForcedVoltage();
      this.props.hole.connector.board.resolveIOVoltagesAcrossAllBoards();
      this.props.forceRerender();
    }
  },

  render: function () {
    var enableHandlers = this.props.selected && this.props.editable;
    return g({}, circle({cx: this.props.hole.cx, cy: this.props.hole.cy, r: this.props.hole.radius, fill: this.props.hole.getColor(), onClick: !enableHandlers && this.props.editable ? this.handleToggle : null, onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null},
      title({}, this.props.hole.label)
    ));
  }
});
