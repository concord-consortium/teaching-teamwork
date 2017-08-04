var circle = React.DOM.circle;

module.exports = React.createClass({
  displayName: 'ConnectorHoleView',

  startDrag: function (e) {
    if (this.props.hole.connected) {
      return;
    }
    this.props.drawConnection(this.props.hole, e);
  },

  mouseOver: function () {
    if (this.props.hole.connected) {
      return;
    }
    this.props.reportHover(this.props.hole);
  },

  mouseOut: function () {
    this.props.reportHover(null);
  },

  render: function () {
    return circle({cx: this.props.hole.cx, cy: this.props.hole.cy, r: this.props.hole.size,
      opacity: 0, onMouseDown: this.startDrag, onMouseOver: this.mouseOver, onMouseOut: this.mouseOut});
  }
});
