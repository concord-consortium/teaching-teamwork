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
    this.props.drawConnection(this.props.pin, e, '#555');
  },

  render: function () {
    var pin = this.props.pin,
        showColors = this.props.stepping && this.props.showDebugPins && !pin.notConnectable,
        enableHandlers = this.props.selected && this.props.editable,
        inputRect, outputRect;

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
        outputRect = {x: pin.x, y: pin.y, width: pin.width / 2, height: pin.height};
        inputRect = {x: pin.x + (pin.width / 2), y: pin.y, width: pin.width / 2, height: pin.height};
        break;
    }

    inputRect.fill = showColors && pin.inputMode && pin.connected ? (pin.value ? 'red' : 'green') : '#777';
    outputRect.fill = showColors && !pin.inputMode ? (pin.value ? 'red' : 'green') : '#777';

    return g({onMouseDown: enableHandlers ? this.startDrag : null, onMouseOver: enableHandlers ? this.mouseOver : null, onMouseOut: enableHandlers ? this.mouseOut : null},
      rect(inputRect),
      rect(outputRect)
    );
  }
});
