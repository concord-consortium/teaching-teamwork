var circle = React.DOM.circle,
         g = React.DOM.g;

module.exports = React.createClass({
  displayName: 'BreadboardHoleView',

  startDrag: function (e) {
    this.props.drawConnection(this.props.hole, e);
  },

  mouseOver: function () {
    this.props.reportHover(this.props.hole);
  },

  mouseOut: function () {
    this.props.reportHover(null);
  },

  render: function () {
    return g({onMouseDown: this.startDrag, onMouseOver: this.mouseOver, onMouseOut: this.mouseOut},
              circle({cx: this.props.hole.cx, cy: this.props.hole.cy, r: this.props.hole.size, opacity: 0}),
              circle({cx: this.props.hole.cx, cy: this.props.hole.cy, r: this.props.hole.size / 2, opacity: this.props.showColors ? 1 : 0, fill: this.props.hole.getColor()})
    );
  }
});
