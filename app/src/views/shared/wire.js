var layout = require('../../views/shared/layout'),
    g = React.DOM.g,
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

  renderPlainWire: function() {
    var wire = this.props.wire,
        color = this.props.wireSettings ? this.props.wireSettings.color: wire.color;


    return path({
      className: 'wire',
      d: layout.getBezierPath({x1: wire.source.cx, y1: wire.source.cy, x2: wire.dest.cx, y2: wire.dest.cy, reflection: wire.getBezierReflection() * this.props.board.bezierReflectionModifier, wireSettings: this.props.wireSettings}),
      strokeWidth: this.props.width,
      stroke: this.props.selected && this.props.editable ? '#42f4f1' : (this.state.hovering ? '#2eadab' : color),
      fill: 'none',
      onMouseOver: this.props.enablePointerEvents ? this.mouseOver : null,
      onMouseOut: this.props.enablePointerEvents ? this.mouseOut : null,
      onMouseDown: this.props.enablePointerEvents ? this.mouseDown : null,
      pointerEvents: this.props.enablePointerEvents ? 'stroke' : 'none'
    });
  },

  renderWireWithLeads: function() {
    var wire = this.props.wire,
        color = this.props.wireSettings ? this.props.wireSettings.color: wire.color,
        dx = wire.dest.cx - wire.source.cx,
        dy = wire.dest.cy - wire.source.cy,
        length = Math.sqrt((dx * dx)+(dy * dy)),
        leadLength = 10,
        leadPerc = leadLength / length,
        leadDx = dx * leadPerc,
        leadDy = dy * leadPerc,
        lead1 = {x: wire.source.cx + leadDx, y: wire.source.cy + leadDy},
        lead2 = {x: wire.dest.cx - leadDx, y: wire.dest.cy - leadDy};


    return g({},
      path({
        className: 'wire',
        d: layout.getBezierPath({x1: wire.source.cx, y1: wire.source.cy, x2: lead1.x, y2: lead1.y, reflection: wire.getBezierReflection() * this.props.board.bezierReflectionModifier, wireSettings: this.props.wireSettings}),
        strokeWidth: this.props.width - 0.5,
        stroke: '#999',
        strokeLinecap: 'round',
        fill: 'none',
        onMouseOver: this.props.enablePointerEvents ? this.mouseOver : null,
        onMouseOut: this.props.enablePointerEvents ? this.mouseOut : null,
        onMouseDown: this.props.enablePointerEvents ? this.mouseDown : null,
        pointerEvents: this.props.enablePointerEvents ? 'stroke' : 'none'
      }),
      path({
        className: 'wire',
        d: layout.getBezierPath({x1: lead2.x, y1: lead2.y, x2: wire.dest.cx, y2: wire.dest.cy, reflection: wire.getBezierReflection() * this.props.board.bezierReflectionModifier, wireSettings: this.props.wireSettings}),
        strokeWidth: this.props.width - 0.5,
        stroke: '#999',
        strokeLinecap: 'round',
        fill: 'none',
        onMouseOver: this.props.enablePointerEvents ? this.mouseOver : null,
        onMouseOut: this.props.enablePointerEvents ? this.mouseOut : null,
        onMouseDown: this.props.enablePointerEvents ? this.mouseDown : null,
        pointerEvents: this.props.enablePointerEvents ? 'stroke' : 'none'
      }),
      path({
        className: 'wire',
        d: layout.getBezierPath({x1: lead1.x, y1: lead1.y, x2: lead2.x, y2: lead2.y, reflection: wire.getBezierReflection() * this.props.board.bezierReflectionModifier, wireSettings: this.props.wireSettings}),
        strokeWidth: this.props.width,
        stroke: this.props.selected && this.props.editable ? '#42f4f1' : (this.state.hovering ? '#2eadab' : color),
        fill: 'none',
        onMouseOver: this.props.enablePointerEvents ? this.mouseOver : null,
        onMouseOut: this.props.enablePointerEvents ? this.mouseOut : null,
        onMouseDown: this.props.enablePointerEvents ? this.mouseDown : null,
        pointerEvents: this.props.enablePointerEvents ? 'stroke' : 'none'
      })
    );
  },

  render: function () {
    var isStraight = Math.abs(this.props.board.bezierReflectionModifier) < 0.3;
    if (isStraight) {
      return this.renderWireWithLeads();
    } else {
      return this.renderPlainWire();
    }
  }
});
