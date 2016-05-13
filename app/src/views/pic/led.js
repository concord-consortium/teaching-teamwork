var PinView = React.createFactory(require('./pin')),
    constants = require('./constants'),
    text = React.DOM.text,
    path = React.DOM.path,
    g = React.DOM.g,
    line = React.DOM.line,
    circle = React.DOM.circle,
    rect = React.DOM.rect;

module.exports = React.createClass({
  displayName: 'LEDView',

  render: function () {
    var selectedConstants = constants.selectedConstants(this.props.selected),
        p = this.props.component.position,
        decimalPoint = this.props.component.decimalPoint,
        pins = [],
        pin,
        segments = [],
        segment,
        i, ccComponents, ccPin, pinPos;

    for (i = 0; i < this.props.component.pins.length; i++) {
      pin = this.props.component.pins[i];
      pins.push(PinView({key: 'pin' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
      pins.push(text({key: 'label' + i, x: pin.label.x, y: pin.label.y, fontSize: pin.labelSize, fill: '#fff', style: {textAnchor: pin.label.anchor}}, pin.label.text));
    }

    for (i = 0; i < this.props.component.segments.length; i++) {
      segment = this.props.component.segments[i];
      segments.push(path({key: 'segment' + i, d: segment.pathCommands, fill: segment.pin.connected && !segment.pin.value ? '#ccff00' : constants.UNSELECTED_FILL, transform: segment.transform}));
    }

    ccPin = this.props.component.pins[7];
    pinPos = {x1: ccPin.x + (ccPin.width / 2), y1: ccPin.y + ccPin.height, x2: ccPin.x + (ccPin.width / 2), y2: ccPin.y + ccPin.height + (3 * ccPin.width)};
    ccComponents = g({},
      line({x1: pinPos.x1, y1: pinPos.y1, x2: pinPos.x2, y2: pinPos.y2, strokeWidth: selectedConstants.FOO_WIRE_WIDTH, stroke: '#333'}),
      circle({cx: pinPos.x2, cy: pinPos.y2 + (pin.height / 2), r: pin.height / 2, fill: 'none', stroke: '#333'})
    );

    return g({},
      rect({x: p.display.x, y: p.display.y, width: p.display.width, height: p.display.height, fill: '#333'}),
      pins,
      segments,
      circle({cx: decimalPoint.cx, cy: decimalPoint.cy, r: decimalPoint.radius, fill: this.props.component.pinMap.DP.connected && !this.props.component.pinMap.DP.value ? '#ccff00' : constants.UNSELECTED_FILL}),
      ccComponents
    );
  }
});
