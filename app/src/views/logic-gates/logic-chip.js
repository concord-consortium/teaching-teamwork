var PinView = React.createFactory(require('../shared/pin')),
    PinLabelView = React.createFactory(require('../shared/pin-label')),
    constants = require('./constants'),
    events = require('../shared/events'),
    chipNames = require('../../data/logic-gates/chip-names'),
    line = React.DOM.line,
    g = React.DOM.g,
    rect = React.DOM.rect,
    text = React.DOM.text,
    title = React.DOM.title,
    //path = React.DOM.path,
    circle = React.DOM.circle;

module.exports = React.createClass({
  displayName: 'LogicChipView',

  getInitialState: function () {
    return {
      hovering: false
    };
  },

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
    //console.log(this.props.component.name, x, y);
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

  mouseOver: function () {
    this.setState({hovering: true});
  },

  mouseOut: function () {
    this.setState({hovering: false});
  },

  getTitle: function () {
    return chipNames[this.props.component.type] || 'Unknown';
  },

  renderQuad: function (source1PinIndex, source2PinIndex, destPinIndex, renderConnectorFn) {
    var source1Pin = this.props.component.pins[source1PinIndex],
        source2Pin = this.props.component.pins[source2PinIndex],
        destPin = this.props.component.pins[destPinIndex],
        width = 18,
        height = 18,
        dy = source1Pin.placement == 'bottom' ? -1 : 1,
        edgeY = source1Pin.placement == 'bottom' ? source1Pin.y : source1Pin.y + source1Pin.height,
        x = source1Pin.cx + ((destPin.cx - source1Pin.cx - width) / 2),
        y = edgeY + ((source1Pin.height * 1.25) * dy),
        oneThirdsY = y + ((height * dy) * (1/3)),
        twoThirdsY = y + ((height * dy) * (2/3)),
        turnX = source1Pin.cx + ((x - source1Pin.cx) / 2),
        turnY = edgeY + ((height / 2) * dy),
        midY = y + ((height / 2) * dy);

    return g({},
      line({x1: source1Pin.cx, y1: edgeY, x2: source1Pin.cx, y2: twoThirdsY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: source1Pin.cx, y1: twoThirdsY, x2: x, y2: twoThirdsY, strokeWidth: 1, stroke: '#fff'}),

      line({x1: source2Pin.cx, y1: edgeY, x2: source2Pin.cx, y2: turnY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: source2Pin.cx, y1: turnY, x2: turnX, y2: turnY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: turnX, y1: turnY, x2: turnX, y2: oneThirdsY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: turnX, y1: oneThirdsY, x2: x, y2: oneThirdsY, strokeWidth: 1, stroke: '#fff'}),

      line({x1: x + width, y1: midY, x2: destPin.cx, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: destPin.cx, y1: midY, x2: destPin.cx, y2: edgeY, strokeWidth: 1, stroke: '#fff'}),

      renderConnectorFn ? renderConnectorFn(x, y, width, height, dy) : null
    );
  },

  renderReversedQuad: function (source1PinIndex, source2PinIndex, destPinIndex, renderConnectorFn) {
    var source1Pin = this.props.component.pins[source1PinIndex],
        source2Pin = this.props.component.pins[source2PinIndex],
        destPin = this.props.component.pins[destPinIndex],
        width = 18,
        height = 18,
        dy = source1Pin.placement == 'bottom' ? -1 : 1,
        edgeY = source1Pin.placement == 'bottom' ? source1Pin.y : source1Pin.y + source1Pin.height,
        x = source1Pin.cx - ((source1Pin.cx - destPin.cx - width) / 2),
        y = edgeY + ((source1Pin.height * 1.25) * dy),
        oneThirdsY = y + ((height * dy) * (1/3)),
        twoThirdsY = y + ((height * dy) * (2/3)),
        turnX = source1Pin.cx + ((x - source1Pin.cx) / 2),
        turnY = edgeY + ((height / 2) * dy),
        midY = y + ((height / 2) * dy);

    return g({},
      line({x1: source1Pin.cx, y1: edgeY, x2: source1Pin.cx, y2: twoThirdsY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: source1Pin.cx, y1: twoThirdsY, x2: x, y2: twoThirdsY, strokeWidth: 1, stroke: '#fff'}),

      line({x1: source2Pin.cx, y1: edgeY, x2: source2Pin.cx, y2: turnY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: source2Pin.cx, y1: turnY, x2: turnX, y2: turnY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: turnX, y1: turnY, x2: turnX, y2: oneThirdsY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: turnX, y1: oneThirdsY, x2: x, y2: oneThirdsY, strokeWidth: 1, stroke: '#fff'}),

      line({x1: x - width, y1: midY, x2: destPin.cx, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: destPin.cx, y1: midY, x2: destPin.cx, y2: edgeY, strokeWidth: 1, stroke: '#fff'}),

      renderConnectorFn ? renderConnectorFn(x - width, y, width, height, dy) : null
    );
  },

  // combination of
  renderFirstTriple: function (renderConnectorFn) {
    var source1Pin = this.props.component.pins[0],
        source2Pin = this.props.component.pins[1],
        source3Pin = this.props.component.pins[12],
        destPin = this.props.component.pins[11],
        width = 18,
        height = 18,
        dy = -1,
        edgeY = source1Pin.y,
        destY = destPin.y + destPin.height,
        x = source1Pin.cx + ((destPin.cx - source1Pin.cx - width) / 2),
        y = edgeY + ((source1Pin.height * 2) * dy),
        oneQuarterY = y + ((height * dy) * (1/4)),
        threeQuartersY = y + ((height * dy) * (3/4)),
        turnX = source1Pin.cx + ((x - source1Pin.cx) / 2),
        turnY = edgeY + ((height / 2) * dy),
        destTurnY = destY + (height / 2),
        midY = y + ((height / 2) * dy);

    return g({},
      line({x1: source1Pin.cx, y1: edgeY, x2: source1Pin.cx, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: source1Pin.cx, y1: midY, x2: x, y2: midY, strokeWidth: 1, stroke: '#fff'}),

      line({x1: source2Pin.cx, y1: edgeY, x2: source2Pin.cx, y2: turnY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: source2Pin.cx, y1: turnY, x2: turnX, y2: turnY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: turnX, y1: turnY, x2: turnX, y2: oneQuarterY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: turnX, y1: oneQuarterY, x2: x, y2: oneQuarterY, strokeWidth: 1, stroke: '#fff'}),

      line({x1: source3Pin.cx, y1: destY, x2: source3Pin.cx, y2: destTurnY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: source3Pin.cx, y1: destTurnY, x2: turnX, y2: destTurnY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: turnX, y1: destTurnY, x2: turnX, y2: threeQuartersY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: turnX, y1: threeQuartersY, x2: x, y2: threeQuartersY, strokeWidth: 1, stroke: '#fff'}),

      line({x1: x + width, y1: midY, x2: destPin.cx, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: destPin.cx, y1: midY, x2: destPin.cx, y2: destY, strokeWidth: 1, stroke: '#fff'}),

      renderConnectorFn ? renderConnectorFn(x, y, width, height, dy) : null
    );
  },

  // all top or bottom pins
  renderMirroredTriple: function (source1PinIndex, source2PinIndex, source3PinIndex, destPinIndex, renderConnectorFn) {
    var source1Pin = this.props.component.pins[source1PinIndex],
        source2Pin = this.props.component.pins[source2PinIndex],
        source3Pin = this.props.component.pins[source3PinIndex],
        destPin = this.props.component.pins[destPinIndex],
        width = 18,
        height = 18,
        dy = source1Pin.placement == 'bottom' ? -1 : 1,
        edgeY = source1Pin.placement == 'bottom' ? source1Pin.y : source1Pin.y + source1Pin.height,
        x = destPin.cx - (2 * destPin.width),
        y = edgeY + ((source1Pin.height * 1.25) * dy),
        oneQuarterY = y + ((height * dy) * (1/4)),
        threeQuartersY = y + ((height * dy) * (3/4)),
        turnX = source1Pin.cx + ((x - source1Pin.cx) * (7/8)),
        turnY = edgeY + ((height / 2) * dy),
        midY = y + ((height / 2) * dy);

    return g({},
      line({x1: source1Pin.cx, y1: edgeY, x2: source1Pin.cx, y2: threeQuartersY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: source1Pin.cx, y1: threeQuartersY, x2: x, y2: threeQuartersY, strokeWidth: 1, stroke: '#fff'}),

      line({x1: source2Pin.cx, y1: edgeY, x2: source2Pin.cx, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: source2Pin.cx, y1: midY, x2: x, y2: midY, strokeWidth: 1, stroke: '#fff'}),

      line({x1: source3Pin.cx, y1: edgeY, x2: source3Pin.cx, y2: turnY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: source3Pin.cx, y1: turnY, x2: turnX, y2: turnY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: turnX, y1: turnY, x2: turnX, y2: oneQuarterY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: turnX, y1: oneQuarterY, x2: x, y2: oneQuarterY, strokeWidth: 1, stroke: '#fff'}),

      line({x1: x + width, y1: midY, x2: destPin.cx, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: destPin.cx, y1: midY, x2: destPin.cx, y2: edgeY, strokeWidth: 1, stroke: '#fff'}),

      renderConnectorFn ? renderConnectorFn(x, y, width, height, dy) : null
    );
  },

  renderInverter: function (sourcePinIndex, destPinIndex) {
    var sourcePin = this.props.component.pins[sourcePinIndex],
        destPin = this.props.component.pins[destPinIndex],
        width = 12,
        height = 12,
        radius = 2,
        dy = sourcePin.placement == 'bottom' ? -1 : 1,
        edgeY = sourcePin.placement == 'bottom' ? sourcePin.y : sourcePin.y + sourcePin.height,
        x = sourcePin.cx + ((destPin.cx - sourcePin.cx - width) / 2),
        y = edgeY + ((sourcePin.height * 1.25) * dy),
        midY = y + ((height / 2) * dy);

    return g({},
      line({x1: sourcePin.cx, y1: edgeY, x2: sourcePin.cx, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: sourcePin.cx, y1: midY, x2: x, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      // the star commented out lines draw a graphical inverter
      //* line({x1: x, y1: y, x2: x + width, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      //* line({x1: x + width, y1: midY, x2: x, y2: y + (height * dy), strokeWidth: 1, stroke: '#fff'}),
      //* line({x1: x, y1: y + (height * dy), x2: x, y2: y, strokeWidth: 1, stroke: '#fff'}),
      line({x1: x + width, y1: midY, x2: destPin.cx, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: x + width + (2 * radius), y1: midY, x2: destPin.cx, y2: midY, strokeWidth: 1, stroke: '#fff'}),
      line({x1: destPin.cx, y1: midY, x2: destPin.cx, y2: edgeY, strokeWidth: 1, stroke: '#fff'}),
      //* circle({cx: x + width + radius, cy: midY, r: radius, fill: 'none', stroke: '#fff'}),
      this.renderText(x, y, width, height, dy, 'NOT')
    );
  },

  renderAnd: function (x, y, width, height, dy) {
    return this.renderText(x, y, width, height, dy, 'AND');
    /*
    // WORKING GRAPHICAL AND GATE:
    var r = height / 2,
        cx = x + width - r,
        cy = y + ((height * dy) / 2);

    // from http://stackoverflow.com/a/18473154
    function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
      var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;
      return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
      };
    }

    function describeArc(x, y, radius, startAngle, endAngle){
      var start = polarToCartesian(x, y, radius, endAngle);
      var end = polarToCartesian(x, y, radius, startAngle);
      var arcSweep = endAngle - startAngle <= 180 ? "0" : "1";
      var d = [
          "M", start.x, start.y,
          "A", radius, radius, 0, arcSweep, 0, end.x, end.y
      ].join(" ");
      return path({d: d, strokeWidth: 1, stroke: '#fff', fill: 'none'});
    }

    return g({},
      line({x1: x, y1: y, x2: cx, y2: y, strokeWidth: 1, stroke: '#fff'}),
      line({x1: x, y1: y, x2: x, y2: y + (height * dy), strokeWidth: 1, stroke: '#fff'}),
      line({x1: x, y1: y + (height * dy), x2: cx, y2: y + (height * dy), strokeWidth: 1, stroke: '#fff'}),
      describeArc(cx, cy, r, 0, 180)
    );
    */
  },

  renderOr: function (x, y, width, height, dy) {
    return this.renderText(x, y, width, height, dy, 'OR');
  },

  renderXor: function (x, y, width, height, dy) {
    return this.renderText(x, y, width, height, dy, 'XOR');
  },

  renderNand: function (x, y, width, height, dy) {
    return this.renderText(x, y, width, height, dy, 'NAND');
  },

  renderNor: function (x, y, width, height, dy) {
    return this.renderText(x, y, width, height, dy, 'NOR');
  },

  renderText: function (x, y, width, height, dy, label) {
    return text({x: x + (width / 2), y: y + ((height * dy) / 2), fontSize: 7, fill: '#fff', style: {textAnchor: 'middle', dominantBaseline: 'central'}}, label);
  },

  renderPinOut: function () {
    var pinOut = null;

    switch (this.props.component.type) {
      case '7400':
        // Quad 2-Input NAND
        pinOut = g({style: {pointerEvents: 'none'}},
          this.renderQuad(0, 1, 2, this.renderNand),
          this.renderQuad(3, 4, 5, this.renderNand),
          this.renderQuad(9, 8, 7, this.renderNand),
          this.renderQuad(12, 11, 10, this.renderNand)
        );
        break;
      case '7402':
        // "Reversed" Quad 2-Input NOR
        pinOut = g({style: {pointerEvents: 'none'}},
          this.renderReversedQuad(2, 1, 0, this.renderNor),
          this.renderReversedQuad(5, 4, 3, this.renderNor),
          this.renderReversedQuad(7, 8, 9, this.renderNor),
          this.renderReversedQuad(10, 11, 12, this.renderNor)
        );
        break;
      case '7404':
        // Hex Inverter
        pinOut = g({style: {pointerEvents: 'none'}},
          this.renderInverter(0, 1),
          this.renderInverter(2, 3),
          this.renderInverter(4, 5),
          this.renderInverter(8, 7),
          this.renderInverter(10, 9),
          this.renderInverter(12, 11)
        );
        break;
      case '7408':
        // Quad 2-Input AND
        pinOut = g({style: {pointerEvents: 'none'}},
          this.renderQuad(0, 1, 2, this.renderAnd),
          this.renderQuad(3, 4, 5, this.renderAnd),
          this.renderQuad(9, 8, 7, this.renderAnd),
          this.renderQuad(12, 11, 10, this.renderAnd)
        );
        break;
      case '7411':
        // Tri 3-Input AND
        pinOut = g({style: {pointerEvents: 'none'}},
          this.renderFirstTriple(this.renderAnd),
          this.renderMirroredTriple(2, 3, 4, 5, this.renderAnd),
          this.renderMirroredTriple(10, 9, 8, 7, this.renderAnd)
        );
        break;
      case '7432':
        // Quad 2-Input OR
        pinOut = g({style: {pointerEvents: 'none'}},
          this.renderQuad(0, 1, 2, this.renderOr),
          this.renderQuad(3, 4, 5, this.renderOr),
          this.renderQuad(9, 8, 7, this.renderOr),
          this.renderQuad(12, 11, 10, this.renderOr)
        );
        break;
      case '7486':
        //Quad 2-Input XOR
        pinOut = g({style: {pointerEvents: 'none'}},
          this.renderQuad(0, 1, 2, this.renderXor),
          this.renderQuad(3, 4, 5, this.renderXor),
          this.renderQuad(9, 8, 7, this.renderXor),
          this.renderQuad(12, 11, 10, this.renderXor)
        );
        break;
    }
    return pinOut;
  },

  render: function () {
    var pins = [],
        selectedConstants = constants.selectedConstants(this.props.selected),
        position = this.props.component.position,
        showPinOut = this.props.showPinouts && (this.state.hovering || (this.props.editable && this.props.selected && this.props.componentSelected)),
        pin, i, groundComponent, vccComponents, vccPos, label, labelText, rectParams, pinOut;

    this.layout();

    for (i = 0; i < this.props.component.pins.length; i++) {
      pin = this.props.component.pins[i];
      pins.push(PinView({key: 'pin' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, showPinColors: this.props.showPinColors, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
      if (!showPinOut) {
        pins.push(PinLabelView({key: 'label' + i, pin: pin, selected: this.props.selected, editable: this.props.editable, reportHover: this.props.reportHover}));
      }
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
    labelText = showPinOut ? null : text({key: 'label', x: label.x, y: label.y, fontSize: label.labelSize, fill: '#fff', style: {textAnchor: label.anchor}}, label.text);

    rectParams = {x: position.x, y: position.y, width: position.width, height: position.height, fill: '#333'};
    if (this.props.editable && this.props.selected && this.props.componentSelected) {
      rectParams.stroke = '#f00';
      rectParams.strokeWidth = 2;
    }

    pinOut = showPinOut ? this.renderPinOut() : null;

    return g({onMouseDown: this.props.selected && this.props.editable ? this.mouseDown : null, onMouseOver: this.mouseOver, onMouseOut: this.mouseOut},
      rect(rectParams),
      pins,
      groundComponent,
      vccComponents,
      labelText,
      pinOut,
      title({}, this.getTitle())
    );
  }
});
