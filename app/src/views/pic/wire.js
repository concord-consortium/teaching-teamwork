var layout = require('../../views/pic/layout'),
    path = React.DOM.path;

module.exports = React.createClass({
  displayName: 'WireView',

  getInitialState: function () {
    return {
      hovering: false
    };
  },

  mouseOver: function () {
    this.setState({hovering: true});
  },

  mouseOut: function () {
    this.setState({hovering: false});
  },

  mouseDown: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.props.wireSelected(this.props.wire, e);
  },

  render: function () {
    var wire = this.props.wire;
    return path({
      key: this.props.key,
      className: 'wire',
      d: layout.getBezierPath({x1: wire.source.cx, y1: wire.source.cy, x2: wire.dest.cx, y2: wire.dest.cy, reflection: wire.getBezierReflection() * this.props.board.bezierReflectionModifier}),
      strokeWidth: this.props.width,
      stroke: this.props.selected ? '#f00' : (this.state.hovering ? '#ccff00' : wire.color),
      fill: 'none',
      onMouseOver: this.props.editable ? this.mouseOver : null,
      onMouseOut: this.props.editable ? this.mouseOut : null,
      onMouseDown: this.props.editable ? this.mouseDown : null
    });
  }
});
