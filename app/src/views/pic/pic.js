var PinView = React.createFactory(require('../shared/pin')),
    PinLabelView = React.createFactory(require('../shared/pin-label')),
    line = React.DOM.line,
    g = React.DOM.g,
    rect = React.DOM.rect,
    circle = React.DOM.circle;

module.exports = React.createClass({
  displayName: 'PICView',

  pinWire: function (pin, dx) {
    var s;
    dx = dx || 1;
    s = {x1: pin.x + (pin.width * dx), y1: pin.y + (pin.height / 2), x2: pin.x + pin.width + (3 * pin.width * dx), y2: pin.y + (pin.height / 2)};
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

  resistor: function (pin, p) {
    var width = pin.width / 4,
        height = pin.height / 2,
        r = {x1: p.x, y1: p.y, x2: p.x - (12 * width), y2: p.y},
        segments = [
          this.wireSegment({x1: r.x1,                 y1: r.y1,          x2: r.x1 - width,         y2: p.y + height}).line,
          this.wireSegment({x1: r.x1 -      width,    y1: r.y1 + height, x2: r.x1 - (2 * width),   y2: p.y - height}).line,
          this.wireSegment({x1: r.x1 - (2 * width),   y1: r.y1 - height, x2: r.x1 - (3 * width),   y2: p.y + height}).line,
          this.wireSegment({x1: r.x1 - (3 * width),   y1: r.y1 + height, x2: r.x1 - (4 * width),   y2: p.y - height}).line,
          this.wireSegment({x1: r.x1 - (4 * width),   y1: r.y1 - height, x2: r.x1 - (5 * width),   y2: p.y + height}).line,
          this.wireSegment({x1: r.x1 - (5 * width),   y1: r.y1 + height, x2: r.x1 - (6 * width),   y2: p.y - height}).line,
          this.wireSegment({x1: r.x1 - (6 * width),   y1: r.y1 - height, x2: r.x1 - (6.5 * width), y2: p.y}).line,
          this.wireSegment({x1: r.x1 - (6.5 * width), y1: r.y1,          x2: r.x2,                 y2: r.y2}).line
        ];
    r.lines = g({}, segments);
    return r;
  },

  capacitor: function (pin, p) {
    var width = pin.width / 2,
        height = pin.height / 2,
        c = {x1: p.x, y1: p.y, x2: p.x + width, y2: p.y},
        segments = [
          this.wireSegment({x1: c.x1, y1: c.y1 - height, x2: c.x1, y2: c.y1 + height}).line,
          this.wireSegment({x1: c.x2, y1: c.y2 - height, x2: c.x2, y2: c.y2 + height}).line
        ];
    c.lines = g({}, segments);
    return c;
  },

  renderCrystal: function (p) {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        height = p.height / 5,
        width = p.width * 0.8,
        segments = [
          this.wireSegment({x1: p.x, y1: p.y, x2: p.x, y2: p.y + height}).line,
          this.wireSegment({x1: p.x - width, y1: p.y + height, x2: p.x + width, y2: p.y + height}).line,
          rect({x: p.x - p.width, y: p.y + (2 * height), width: (p.width * 2), height: p.height - (4 * height), strokeWidth: selectedConstants.FOO_WIRE_WIDTH, stroke: '#333', fill: 'none'}),
          this.wireSegment({x1: p.x - width, y1: p.y + p.height - height, x2: p.x + width, y2: p.y + p.height - height}).line,
          this.wireSegment({x1: p.x, y1: p.y + p.height, x2: p.x, y2: p.y + p.height - height}).line
        ];
    return g({}, segments);
  },

  render: function () {
    var p = this.props.component.position,
        pins = [],
        pin,
        i, groundComponents, mclComponents, xtalComponents, vccComponents, s1, w1, w2, r, w3, w4, w5, w6, c1, c2;

    for (i = 0; i < this.props.component.pins.length; i++) {
      pin = this.props.component.pins[i];
      pins.push(PinView({key: 'pin' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
      pins.push(PinLabelView({key: 'label' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, reportHover: this.props.reportHover}));
    }

    pin = this.props.component.pinMap.GND;
    s1 = {x1: pin.x, y1: pin.y + (pin.height / 2), x2: pin.x - (3 * pin.width), y2: pin.y + (pin.height / 2)};
    groundComponents = g({},
      this.wireSegment(s1).line,
      this.renderGround(pin, {x: s1.x2, y: s1.y2})
    );

    pin = this.props.component.pinMap.MCL;
    s1 = {x1: pin.x, y1: pin.y + (pin.height / 2), x2: pin.x - pin.width, y2: pin.y + (pin.height / 2)};
    r = this.resistor(pin, {x: s1.x2, y: s1.y2});
    mclComponents = g({},
      this.wireSegment(s1).line,
      r.lines,
      circle({cx: r.x2 - (pin.width / 2), cy: r.y2, r: pin.width / 2, fill: 'none', stroke: '#333'})
    );

    pin = this.props.component.pinMap.XTAL;
    w1 = this.pinWire(this.props.component.pins[11]);
    w2 = this.pinWire(this.props.component.pins[12]);
    c1 = this.capacitor(this.props.component.pins[11], {x: w1.x2, y: w1.y2});
    c2 = this.capacitor(this.props.component.pins[12], {x: w2.x2, y: w2.y2});
    w3 = this.wireSegment({x1: c1.x2, y1: w1.y2, x2: w1.x2 + (2 * pin.width), y2: w1.y2});
    w4 = this.wireSegment({x1: c2.x2, y1: w2.y2, x2: w3.x2, y2: w2.y2});
    w5 = this.wireSegment({x1: w2.x2 + (2 * pin.width), y1: w1.y2 + ((w2.y2 - w1.y2) / 2), x2: w2.x2 + (4 * pin.width), y2: w1.y2 + ((w2.y2 - w1.y2) / 2)});
    w6 = this.wireSegment({x1: w5.x2, y1: w5.y2, x2: w5.x2, y2: w5.y2 + (pin.height)});
    xtalComponents = g({},
      w1.line,
      w2.line,
      this.renderCrystal({x: w1.x1 + ((w1.x2 - w1.x1) / 2), y: w1.y1, width: (w1.x2 - w1.x1) / 4, height: w2.y1 - w1.y1}),
      c1.lines,
      c2.lines,
      w3.line,
      w4.line,
      this.wireSegment({x1: w3.x2, y1: w3.y2, x2: w4.x2, y2: w4.y2}).line,
      w5.line,
      w6.line,
      this.renderGround(pin, {x: w6.x2, y: w6.y2})
    );

    w1 = this.pinWire(this.props.component.pins[13]);
    vccComponents = g({},
      w1.line,
      circle({cx: w1.x2 + (pin.width / 2), cy: w1.y2, r: pin.width / 2, fill: 'none', stroke: '#333'})
    );

    return g({},
      rect({x: p.chip.x, y: p.chip.y, width: p.chip.width, height: p.chip.height, fill: '#333'}),
      pins,
      groundComponents,
      mclComponents,
      xtalComponents,
      vccComponents
    );
  }
});
