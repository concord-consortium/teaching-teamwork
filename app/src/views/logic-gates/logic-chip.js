var PinView = React.createFactory(require('../shared/pin')),
    line = React.DOM.line,
    g = React.DOM.g,
    rect = React.DOM.rect,
    text = React.DOM.text,
    circle = React.DOM.circle;

module.exports = React.createClass({
  displayName: 'LogicChipView',

  pinWire: function (pin, dx) {
    var s;
    dx = dx || 1;
    s = {x1: pin.x + (pin.width * dx), y1: pin.y + (pin.height / 2), x2: pin.x + pin.width + (2 * pin.width * dx), y2: pin.y + (pin.height / 2)};
    s.line = this.wireSegment(s).line;
    return s;
  },

  wireSegment: function (s, key) {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        segment = {x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, strokeWidth: selectedConstants.FOO_WIRE_WIDTH, stroke: '#333'};
    if (key) {
      segment.key = key;
    }
    segment.line = line(segment);
    return segment;
  },

  renderGround: function (pin, p) {
    var p2 = {x: p.x, y: p.y + pin.height},
        segments = [this.wireSegment({key: pin.name + 'down', x1: p.x, y1: p.y, x2: p2.x, y2: p2.y}).line],
        s, width, height, i;

    for (i = 0; i < 3; i++) {
      width = pin.width - (pin.width * (0.33 * i));
      height = i * (pin.height / 4);
      s = {x1: p2.x - (width / 2), y1: p2.y + height, x2: p2.x + (width / 2), y2: p2.y + height};
      segments.push(this.wireSegment(s, pin.name + i).line);
    }

    return g({}, segments);
  },

  render: function () {
    var p = this.props.component.position,
        pins = [],
        pin,
        i, groundComponents, vccComponents, s1, w1, label, labelText;

    for (i = 0; i < this.props.component.pins.length; i++) {
      pin = this.props.component.pins[i];
      pins.push(PinView({key: 'pin' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
      pins.push(text({key: 'label' + i, x: pin.label.x, y: pin.label.y, fontSize: pin.labelSize, fill: '#fff', style: {textAnchor: pin.label.anchor}}, pin.label.text));
    }

    pin = this.props.component.pins[6];
    s1 = {x1: pin.x, y1: pin.y + (pin.height / 2), x2: pin.x - (2 * pin.width), y2: pin.y + (pin.height / 2)};
    groundComponents = g({},
      this.wireSegment(s1).line,
      this.renderGround(pin, {x: s1.x2, y: s1.y2})
    );

    w1 = this.pinWire(this.props.component.pins[13]);
    vccComponents = g({},
      w1.line,
      circle({cx: w1.x2 + (pin.width / 2), cy: w1.y2, r: pin.width / 2, fill: 'none', stroke: '#333'})
    );

    label = this.props.component.label;
    labelText = text({key: 'label', x: label.x, y: label.y, fontSize: label.labelSize, fill: '#fff', style: {textAnchor: label.anchor}}, label.text);

    return g({},
      rect({x: p.chip.x, y: p.chip.y, width: p.chip.width, height: p.chip.height, fill: '#333'}),
      pins,
      groundComponents,
      vccComponents,
      labelText
    );
  }
});
