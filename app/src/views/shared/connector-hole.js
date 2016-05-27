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
      if (!addedWire && !moved && (self.props.connector.type == 'input')) {
        alert('clicked!');
      }
    });
  },

  render: function () {
    var enableHandlers = this.props.selected && this.props.editable,
        shape;

    if (this.props.connector.type == 'input') {
      shape = rect({x: this.props.hole.cx - this.props.hole.radius, y: this.props.hole.cy - this.props.hole.radius, width: this.props.hole.radius * 2, height: this.props.hole.radius * 2, fill: this.props.hole.color, onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null},
        title({}, this.props.hole.label)
      );
    }
    else {
      shape = circle({cx: this.props.hole.cx, cy: this.props.hole.cy, r: this.props.hole.radius, fill: this.props.hole.color, onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null},
        title({}, this.props.hole.label)
      );
    }

    return g({}, shape);
  }
});
