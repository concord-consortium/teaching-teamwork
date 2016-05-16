var g = React.DOM.g,
    circle = React.DOM.circle;
    
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

  render: function () {
    var enableHandlers = this.props.selected && this.props.editable;
    return g({},
      circle({cx: this.props.hole.cx, cy: this.props.hole.cy, r: this.props.hole.radius, fill: this.props.hole.color, onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null})
    );
  }
});
