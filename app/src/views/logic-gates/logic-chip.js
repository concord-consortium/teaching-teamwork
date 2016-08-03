var PinView = React.createFactory(require('../shared/pin')),
    PinLabelView = React.createFactory(require('../shared/pin-label')),
    constants = require('./constants'),
    events = require('../shared/events'),
    line = React.DOM.line,
    g = React.DOM.g,
    rect = React.DOM.rect,
    text = React.DOM.text,
    title = React.DOM.title,
    circle = React.DOM.circle;

module.exports = React.createClass({
  displayName: 'LogicChipView',

  componentWillMount: function () {
    var pos = this.props.snapToGrid(this.props.component.layout);
    if (!this.props.component.position) {
      this.props.component.position = {
        x: pos.x,
        y: pos.y
      };
    }
    if (this.props.startDragPos) {
      this.startDrag(this.props.startDragPos);
    }
  },

  setPosition: function (x, y) {
    this.props.component.position.x = x;
    this.props.component.position.y = y;
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
        position = this.props.component.position;

    label.x = position.x + (position.width / 2);
    label.y = position.y + (position.height / 2) + (selectedConstants.CHIP_LABEL_SIZE / 4);
    label.labelSize = selectedConstants.CHIP_LABEL_SIZE;
  },

  startDrag: function (startDragPos) {
    var $window = $(window),
        position = this.props.component.position,
        startX = position.x,
        startY = position.y,
        startDragX = startDragPos.x,
        startDragY = startDragPos.y,
        self = this,
        moved = false,
        drag, stopDrag;

    drag = function (e) {
      var r = self.props.logicChipDragRect,
          newX = Math.min(r.right - position.width, Math.max(r.left, startX + (e.pageX - startDragX))),
          newY = Math.min(r.bottom - position.height, Math.max(r.top, startY + (e.pageY - startDragY)));

      moved = true;
      e.preventDefault();
      e.stopPropagation();
      self.setPosition(newX, newY);
      self.setState({dragging: true});
      self.props.layoutChanged();
    };

    stopDrag = function (e) {
      var pos = self.props.snapToGrid(self.props.component.position);
      e.stopPropagation();
      e.preventDefault();
      self.setPosition(pos.x, pos.y);
      self.setState({dragging: false});
      if (self.props.stopLogicChipDrawerDrag) {
        self.props.stopLogicChipDrawerDrag({type: self.props.component.type, x: position.x, y: position.y});
      }
      else if (moved) {
        events.logEvent(events.MOVE_LOGIC_CHIP_EVENT, null, {board: self.props.component.board, chip: self.props.component});
      }
      self.props.layoutChanged();
      $window.off('mousemove', drag);
      $window.off('mouseup', stopDrag);
    };
    if (self.props.componentClicked) {
      this.props.componentClicked(this.props.component);
    }
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
      '7486': 'Quad 2-Input XOR',
      '7404': 'Hex Inverter',
      '7411': 'Tri 3-Input AND'
    };
    return titles[this.props.component.type];
  },

  render: function () {
    var pins = [],
        selectedConstants = constants.selectedConstants(this.props.selected),
        position = this.props.component.position,
        pin,
        i, groundComponent, vccComponents, vccPos, label, labelText, rectParams;

    this.layout();

    for (i = 0; i < this.props.component.pins.length; i++) {
      pin = this.props.component.pins[i];
      pins.push(PinView({key: 'pin' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
      pins.push(PinLabelView({key: 'label' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, reportHover: this.props.reportHover}));
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

    rectParams = {x: position.x, y: position.y, width: position.width, height: position.height, fill: '#333'};
    if (this.props.editable && this.props.selected && this.props.componentSelected) {
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
