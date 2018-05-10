var circle = React.DOM.circle,
         g = React.DOM.g;

module.exports = React.createClass({
  displayName: 'BreadboardHoleView',

  startDrag: function (e) {
    if (this.props.editable) {
      this.props.drawConnection(this.props.hole, e);
    }
  },

  mouseOver: function () {
    this.props.reportHover(this.props.hole);
  },

  mouseOut: function () {
    this.props.reportHover(null);
  },

  render: function () {
    var editable = this.props.editable;
    return g({onMouseDown: editable ? this.startDrag : null, onMouseOver: editable ? this.mouseOver : null, onMouseOut: editable ? this.mouseOut : null},
              circle({cx: this.props.hole.cx, cy: this.props.hole.cy, r: this.props.hole.size, opacity: 0}),
              circle({cx: this.props.hole.cx, cy: this.props.hole.cy, r: this.props.hole.size / 2, opacity: this.props.showColors ? 1 : 0, fill: this.props.hole.getColor()})
    );
  }
});
