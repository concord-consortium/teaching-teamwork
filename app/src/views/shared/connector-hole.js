var g = React.DOM.g,
    circle = React.DOM.circle,
    rect = React.DOM.rect,
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
    if (this.props.hole.toggleable) {
      this.props.hole.toggleForcedVoltage();
      this.props.hole.connector.board.resolveIOVoltagesAcrossAllBoards();
      this.props.forceRerender();
    }
  },

  renderInput: function (hole, enableHandlers) {
    var radius = hole.radius,
        layout = {x: hole.cx - radius, y: hole.cy - radius, width: radius * 2, height: radius},
        isLow = hole.isLow(),
        backgroundColor = '#777';
    return g({onClick: !enableHandlers && this.props.editable ? this.handleToggle : null, onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null},
      rect({x: layout.x, y: layout.y, width: layout.width, height: layout.height, fill: isLow ? hole.getColor() : backgroundColor},
        title({}, hole.getLabel())
      ),
      rect({x: layout.x, y: layout.y + layout.height, width: layout.width, height: layout.height, fill: !isLow ? hole.getColor() : backgroundColor},
        title({}, hole.getLabel())
      )
    );
  },

  renderOutput: function (hole, enableHandlers) {
    return circle({cx: hole.cx, cy: hole.cy, r: hole.radius, fill: hole.getColor(), onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null},
      title({}, hole.getLabel())
    );
  },

  renderBus: function (hole, enableHandlers) {
    var radius = hole.radius;
    return rect({x: hole.cx - radius, y: hole.cy - radius, width: radius * 2, height: radius * 2, fill: hole.getColor(), onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null},
      title({}, hole.getLabel())
    );
  },

  render: function () {
    var enableHandlers = this.props.selected && this.props.editable,
        hole = this.props.hole,
        symbol = hole.type == 'input' ? this.renderInput(hole, enableHandlers) : (hole.type == 'output' ? this.renderOutput(hole, enableHandlers) : this.renderBus(hole, enableHandlers));
    return g({}, symbol);
  }
});
