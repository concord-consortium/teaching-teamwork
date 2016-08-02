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

  componentWillMount: function () {
    this.setState({editableInput: (window.location.search.indexOf('editableInput') !== -1) && !this.props.hole.inputMode && this.props.editable});
  },

  startDrag: function (e) {
    var self = this;
    this.props.drawConnection(this.props.hole, e, this.props.hole.color, function (addedWire, moved) {
      if (self.state.editableInput && !addedWire && !moved) {
        self.props.hole.setVoltage(self.props.hole.getVoltage() ? 0 : 5);
        return true; // signal a render
      }
    });
  },

  render: function () {
    var enableHandlers = this.props.selected && this.props.editable;
    return g({}, circle({cx: this.props.hole.cx, cy: this.props.hole.cy, r: this.props.hole.radius, fill: this.props.hole.getColor(this.state.editableInput), onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null},
      title({}, this.props.hole.label)
    ));
  }
});
