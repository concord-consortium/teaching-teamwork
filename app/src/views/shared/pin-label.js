var text = React.DOM.text;

module.exports = React.createClass({
  displayName: 'PinLabelView',

  mouseOver: function () {
    this.props.reportHover(this.props.pin);
  },

  mouseOut: function () {
    this.props.reportHover(null);
  },

  render: function () {
    var pin = this.props.pin,
      enableHandlers = this.props.selected && this.props.editable;

    return text({x: pin.label.x, y: pin.label.y, fontSize: pin.labelSize, fill: pin.label.color, style: {textAnchor: pin.label.anchor}, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null}, pin.label.text);
  }
});
