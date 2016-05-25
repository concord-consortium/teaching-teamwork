var PinView = React.createFactory(require('../shared/pin')),
    constants = require('./constants'),
    line = React.DOM.line,
    g = React.DOM.g,
    rect = React.DOM.rect,
    text = React.DOM.text,
    title = React.DOM.title,
    circle = React.DOM.circle;

module.exports = React.createClass({
  displayName: 'LogicChipView',

  getInitialState: function () {
    var pos = this.props.snapToGrid(this.props.component.layout);
    this.props.component.position = {
      x: pos.x,
      y: pos.y,
      width: this.props.component.layout.width,
      height: this.props.component.layout.height
    };
    return this.props.component.position;
  },

  componentWillMount: function () {
    if (this.props.startDragPos) {
      this.startDrag(this.props.startDragPos);
    }
  },

  setPosition: function (x, y) {
    this.props.component.position.x = x;
    this.props.component.position.y = y;
    this.setState({x: x, y: y});
  },

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
    var p2 = {x: p.x, y: p.y + (1.5 * pin.height)},
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

  layout: function () {
    var label = this.props.component.label,
        selectedConstants = constants.selectedConstants(this.props.selected),
        pinDX, pinDY, i, j, pin, pinNumber, xOffset, y;

    pinDX = (this.state.width - (selectedConstants.PIN_WIDTH * 7)) / 8;

    for (i = 0; i < 2; i++) {
      y = i === 0 ? this.state.y + this.state.height : this.state.y - selectedConstants.PIN_HEIGHT;
      pinDY = i === 0 ? -(selectedConstants.PIN_HEIGHT / 2) : 2 * selectedConstants.PIN_HEIGHT;

      for (j = 0; j < 7; j++) {
        pinNumber = (i * 7) + j;
        pin = this.props.component.pins[pinNumber];
        xOffset = i === 0 ? j : 6 - j;

        pin.x = this.state.x + pinDX + (xOffset * (selectedConstants.PIN_WIDTH + pinDX));
        pin.y = y;

        pin.cx = pin.x + (selectedConstants.PIN_WIDTH / 2);
        pin.cy = pin.y + (selectedConstants.PIN_HEIGHT / 2);
        pin.width = selectedConstants.PIN_WIDTH;
        pin.height = selectedConstants.PIN_HEIGHT;
        pin.labelSize = selectedConstants.PIC_FONT_SIZE;
        pin.label.x = pin.x + (selectedConstants.PIN_WIDTH / 2);
        pin.label.y = pin.y + pinDY;
        pin.label.anchor = 'middle';
      }
    }

    label.x = this.state.x + (this.state.width / 2);
    label.y = this.state.y + (this.state.height / 2) + (selectedConstants.CHIP_LABEL_SIZE / 4);
    label.labelSize = selectedConstants.CHIP_LABEL_SIZE;
  },

  startDrag: function (startDragPos) {
    var $window = $(window),
        startX = this.state.x,
        startY = this.state.y,
        startDragX = startDragPos.x,
        startDragY = startDragPos.y,
        self = this,
        moved = false,
        drag, stopDrag;

    drag = function (e) {
      moved = true;
      e.preventDefault();
      e.stopPropagation();
      self.setPosition(startX + (e.pageX - startDragX), startY + (e.pageY - startDragY));
      self.props.layoutChanged();
    };

    stopDrag = function (e) {
      var pos = self.props.snapToGrid(self.state);
      e.stopPropagation();
      e.preventDefault();
      self.setPosition(pos.x, pos.y);
      if (self.props.stopDrag) {
        self.props.stopDrag({type: self.props.component.type, x: self.state.x, y: self.state.y});
      }
      if (!moved && self.props.componentClicked) {
        self.props.componentClicked(self.props.component);
      }
      self.props.layoutChanged();
      $window.off('mousemove', drag);
      $window.off('mouseup', stopDrag);
    };

    $window.on('mousemove', drag);
    $window.on('mouseup', stopDrag);
  },

  mouseDown: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.startDrag({x: e.pageX, y: e.pageY});
  },

  getTitle: function () {
    var titles = {
      '7408': 'Quad 2-Input AND',
      '7432': 'Quad 2-Input OR',
      '7404': 'Hex Inverter',
    };
    return titles[this.props.component.type];
  },

  render: function () {
    var pins = [],
        selectedConstants = constants.selectedConstants(this.props.selected),
        pin,
        i, groundComponent, vccComponents, vccPos, label, labelText, rectParams;

    this.layout();

    for (i = 0; i < this.props.component.pins.length; i++) {
      pin = this.props.component.pins[i];
      pins.push(PinView({key: 'pin' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
      pins.push(text({key: 'label' + i, x: pin.label.x, y: pin.label.y, fontSize: pin.labelSize, fill: '#fff', style: {textAnchor: pin.label.anchor}}, pin.label.text));
    }

    pin = this.props.component.pins[6];
    groundComponent = this.renderGround(pin, {x: pin.cx, y: pin.cy});

    pin = this.props.component.pins[13];
    vccPos = {x1: pin.cx, y1: pin.cy, x2: pin.cx, y2: pin.cy - (1.25 * pin.width)};
    vccComponents = g({},
      line({x1: vccPos.x1, y1: vccPos.y1, x2: vccPos.x2, y2: vccPos.y2, strokeWidth: selectedConstants.FOO_WIRE_WIDTH, stroke: '#333'}),
      circle({cx: vccPos.x2, cy: vccPos.y2 - (pin.width / 2), r: pin.width / 2, fill: 'none', stroke: '#333'})
    );

    label = this.props.component.label;
    labelText = text({key: 'label', x: label.x, y: label.y, fontSize: label.labelSize, fill: '#fff', style: {textAnchor: label.anchor}}, label.text);

    rectParams = {x: this.state.x, y: this.state.y, width: this.state.width, height: this.state.height, fill: '#333'};
    if (this.props.componentSelected) {
      rectParams.stroke = '#f00';
      rectParams.strokeWidth = 2;
    }

    return g({onMouseDown: this.props.selected && this.props.editable ? this.mouseDown : null},
      rect(rectParams),
      pins,
      groundComponent,
      vccComponents,
      labelText,
      title({}, this.getTitle())
    );
  }
});
