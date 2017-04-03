var g = React.DOM.g,
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
    this.props.drawConnection(this.props.hole, e, this.props.hole.color);
  },

  renderTopHole: function (hole, enableHandlers) {
    var radius = hole.radius;
    return rect({x: hole.cx - radius, y: hole.cy - radius, width: radius * 2, height: radius * 2, fill: hole.color, onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null},
      title({}, hole.getLabel())
    );
  },

  renderBus: function (hole, enableHandlers) {
    var radius = hole.radius;
    return rect({x: hole.cx - radius, y: hole.cy - radius, width: radius * 2, height: radius * 2, fill: hole.getColor(this.props.showBusColors), onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null},
      title({}, hole.getLabel())
    );
  },

  render: function () {
    var enableHandlers = this.props.selected && this.props.editable,
        hole = this.props.hole,
        symbol = hole.type == 'bus' ? this.renderBus(hole, enableHandlers) : this.renderTopHole(hole, enableHandlers);
    return g({}, symbol);
  }
});
