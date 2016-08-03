var g = React.DOM.g,
    rect = React.DOM.rect;

module.exports = React.createClass({
  displayName: 'PinView',

  mouseOver: function () {
    this.props.reportHover(this.props.pin);
  },

  mouseOut: function () {
    this.props.reportHover(null);
  },

  startDrag: function (e) {
    this.props.drawConnection(this.props.pin, e, '#ddd');
  },

  renderPin: function (pin, enableHandlers) {
    return g({onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null},
      rect({x: pin.x, y: pin.y, width: pin.width, height: pin.height, fill: '#777'})
    );
  },

  renderIOPin: function (pin, enableHandlers) {
    var inputRect, outputRect;

    switch (pin.placement) {
      case 'top':
        inputRect = {x: pin.x, y: pin.y + (pin.height / 2), width: pin.width, height: pin.height / 2};
        outputRect = {x: pin.x, y: pin.y, width: pin.width, height: pin.height / 2};
        break;
      case 'bottom':
        inputRect = {x: pin.x, y: pin.y, width: pin.width, height: pin.height / 2};
        outputRect = {x: pin.x, y: pin.y + (pin.height / 2), width: pin.width, height: pin.height / 2};
        break;
      case 'right':
        inputRect = {x: pin.x, y: pin.y, width: pin.width / 2, height: pin.height};
        outputRect = {x: pin.x + (pin.width / 2), y: pin.y, width: pin.width / 2, height: pin.height};
        break;
      default:
        inputRect = {x: pin.x + (pin.width / 2), y: pin.y, width: pin.width / 2, height: pin.height};
        outputRect = {x: pin.x, y: pin.y, width: pin.width / 2, height: pin.height};
        break;
    }

    inputRect.fill = pin.inputMode && pin.connected ? pin.getColor() : '#777';
    outputRect.fill = !pin.inputMode ? pin.getColor() : '#777';

    return g({onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null},
      rect(inputRect),
      rect(outputRect)
    );
  },

  render: function () {
    var pin = this.props.pin,
        showColors = this.props.stepping && this.props.showDebugPins && !pin.notConnectable,
        enableHandlers = this.props.selected && this.props.editable;

    return showColors ? this.renderIOPin(pin, enableHandlers) : this.renderPin(pin, enableHandlers);
  }
});
