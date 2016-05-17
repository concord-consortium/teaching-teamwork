var boardWatcher = require('../../controllers/pic/board-watcher'),
    ConnectorView = React.createFactory(require('./connector')),
    WireView = React.createFactory(require('./wire')),
    ProbeView = React.createFactory(require('./probe')),
    events = require('../shared/events'),
    div = React.DOM.div,
    span = React.DOM.span,
    div = React.DOM.div,
    svg = React.DOM.svg,
    line = React.DOM.line,
    path = React.DOM.path,
    button = React.DOM.button;

module.exports = React.createClass({
  displayName: 'BoardView',

  toggleBoard: function () {
    this.props.toggleBoard(this.props.board);
  },

  getInitialState: function () {
    return {
      drawConnection: null,
      hoverSource: null,
      wires: this.props.board.wires,
      probeSource: this.props.board.probe ? this.props.board.probe.source : null,
      probePos: this.props.board.probe ? this.props.board.probe.pos : null,
      selectedWires: [],
      drawBox: null,
      draggingProbe: false
    };
  },

  componentDidMount: function () {
    boardWatcher.addListener(this.props.board, this.updateWatchedBoard);
    $(window).on('keyup', this.keyUp);
    $(window).on('keydown', this.keyDown);

    // used to find wire click position
    this.svgOffset = $(this.refs.svg).offset();
  },

  componentWillUnmount: function () {
    boardWatcher.removeListener(this.props.board, this.updateWatchedBoard);
    $(window).off('keyup', this.keyUp);
    $(window).off('keydown', this.keyDown);
  },

  keyDown: function (e) {
    // 46 is the delete key which maps to 8 on Macs
    // this is needed so Chrome on Macs don't trigger a back navigation
    if ((e.keyCode == 46) || (e.keyCode == 8)) {
      e.preventDefault();
      e.stopPropagation();
    }
  },

  keyUp: function (e) {
    var i, selectedWire;

    // 46 is the delete key which maps to 8 on Macs
    if (!((e.keyCode == 46) || (e.keyCode == 8))) {
      return;
    }

    if (this.props.selected && this.props.editable) {
      for (i = 0; i < this.state.selectedWires.length; i++) {
        selectedWire = this.state.selectedWires[i];
        this.props.board.removeWire(selectedWire.source, selectedWire.dest);
        events.logEvent(events.REMOVE_WIRE_EVENT, null, {board: this.props.board, source: selectedWire.source});
      }
      this.setState({
        wires: this.props.board.wires,
        selectedWires: []
      });
    }
    e.preventDefault();
    e.stopPropagation();
  },

  updateWatchedBoard: function (board, boardInfo) {
    var probe = {source: null, pos: null},
        probeInfo;

    // move the probe
    if (boardInfo && boardInfo.probe) {
      probeInfo = boardInfo.probe;
      if (probeInfo.to === 'pin') {
        probe.source = board.components[probeInfo.component].pins[probeInfo.pin.index];
      }
      else if (probeInfo.to === 'hole') {
        probe.source = board.connectors[probeInfo.connector].holes[probeInfo.hole.index];
      }
    }
    this.setProbe(probe);
  },

  reportHover: function (hoverSource) {
    this.setState({hoverSource: hoverSource});
  },

  setProbe: function (probe) {
    this.props.board.probe = probe;
    this.setState({probeSource: probe.source, probePos: probe.pos});
  },

  drawConnection: function (source, e, color, callback) {
    var $window = $(window),
        self = this,
        moved = false,
        drag, stopDrag;

    e.preventDefault();
    e.stopPropagation();

    this.setState({
      drawConnection: {
        x1: source.cx,
        y1: source.cy,
        x2: source.cx,
        y2: source.cy,
        strokeWidth: this.props.constants.selectedConstants(this.props.selected).WIRE_WIDTH,
        stroke: color,
        reflection: source.getBezierReflection() * this.props.board.bezierReflectionModifier
      }
    });

    drag = function (e) {
      moved = true;
      e.preventDefault();
      self.state.drawConnection.x2 = e.pageX - self.svgOffset.left;
      self.state.drawConnection.y2 = e.pageY - self.svgOffset.top;
      self.setState({drawConnection: self.state.drawConnection});
    };

    stopDrag = function (e) {
      var dest = self.state.hoverSource,
          addedWire = false,
          wire;

      e.stopPropagation();
      e.preventDefault();

      $window.off('mousemove', drag);
      $window.off('mouseup', stopDrag);
      self.setState({drawConnection: null});

      if (moved && dest && (dest !== source)) {
        addedWire = true;
        wire = self.props.board.addWire(source, dest, (source.color || dest.color || color));
        self.setState({
          wires: self.props.board.wires,
          selectedWires: [wire]
        });
        events.logEvent(events.ADD_WIRE_EVENT, null, {board: self.props.board, source: source, dest: dest});
      }

      if (callback) {
        callback(addedWire);
      }
    };

    $window.on('mousemove', drag);
    $window.on('mouseup', stopDrag);
  },

  distance: function (endpoint, x, y) {
    var a = endpoint.cx - x,
        b = endpoint.cy - y;
    return Math.sqrt((a*a) + (b*b));
  },

  wireSelected: function (wire, e) {
    // check if click is near an endpoint
    var x = e.pageX - this.svgOffset.left,
        y = e.pageY - this.svgOffset.top,
        sourceDistance = this.distance(wire.source, x, y),
        destDistance = this.distance(wire.dest, x, y),
        shortestDistance = Math.min(sourceDistance, destDistance),
        self = this;

    if (shortestDistance <= 20) {
      this.props.board.removeWire(wire.source, wire.dest);
      this.setState({
        wires: this.props.board.wires,
        selectedWires: []
      });
      this.drawConnection(shortestDistance == sourceDistance ? wire.dest : wire.source, e, wire.color, function (addedWire) {
        var newWire;
        if (!addedWire) {
          newWire = self.props.board.addWire(wire.source, wire.dest, wire.color);
          self.setState({
            wires: self.props.board.wires,
            selectedWires: [newWire]
          });
        }
      });
    }
    else {
      this.setState({selectedWires: [wire]});
    }
  },

  backgroundMouseDown: function (e) {
    var $window = $(window),
        self = this,
        drag, stopDrag, getPath, x1, y1;

    this.setState({selectedWires: []});

    // allow for bounding box drawing around wires for mass selection
    e.preventDefault();

    x1 = e.pageX - this.svgOffset.left;
    y1 = e.pageY - this.svgOffset.top;

    // use path instead of rect as svg rect doesn't support negative widths or heights
    getPath = function (x2, y2) {
      return ["M", x1, ",", y1, " ", x2, ",", y1, " ", x2, ",", y2, " ", x1, ",", y2, " ", x1, ",", y1].join("");
    };

    this.setState({
      drawBox: {
        x1: x1,
        y1: y1,
        path: getPath(x1, y1),
        strokeWidth: this.props.constants.selectedConstants(this.props.selected).WIRE_WIDTH,
        stroke: '#555',
        strokeDasharray: [10, 5]
      }
    });

    drag = function (e) {
      var x2 = e.pageX - self.svgOffset.left,
          y2 = e.pageY - self.svgOffset.top;
      e.preventDefault();
      self.state.drawBox.x2 = x2;
      self.state.drawBox.y2 = y2;
      self.state.drawBox.path = getPath(x2, y2);
      self.setState({drawBox: self.state.drawBox});
    };

    stopDrag = function (e) {
      var selectedWires = [],
          r, enclosed, i, wire;

      e.stopPropagation();
      e.preventDefault();
      $window.off('mousemove', drag);
      $window.off('mouseup', stopDrag);

      // check bounding box for wires
      r = {
        x1: Math.min(self.state.drawBox.x1, self.state.drawBox.x2),
        y1: Math.min(self.state.drawBox.y1, self.state.drawBox.y2),
        x2: Math.max(self.state.drawBox.x1, self.state.drawBox.x2),
        y2: Math.max(self.state.drawBox.y1, self.state.drawBox.y2)
      };
      enclosed = function (x, y) {
        return (r.x1 <= x) && (x <= r.x2) && (r.y1 <= y) && (y <= r.y2);
      };
      for (i = 0; i < self.props.board.wires.length; i++) {
        wire = self.props.board.wires[i];
        if (enclosed(wire.source.cx, wire.source.cy) || enclosed(wire.dest.cx, wire.dest.cy)) {
          selectedWires.push(wire);
        }
      }

      self.setState({
        drawBox: null,
        selectedWires: selectedWires
      });
    };

    $window.on('mousemove', drag);
    $window.on('mouseup', stopDrag);
  },

  draggingProbe: function (draggingProbe) {
    this.setState({draggingProbe: draggingProbe});
  },

  render: function () {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        style = {
          width: this.props.constants.WORKSPACE_WIDTH,
          height: selectedConstants.BOARD_HEIGHT,
          position: 'relative'
        },
        connectors = [],
        components = [],
        wires = [],
        componentIndex = 0,
        editableWires = !this.state.draggingProbe && !this.state.drawConnection && !this.state.drawBox && (this.props.editable && this.props.selected),
        name, component, i, wire;

    // used to find wire click position
    this.svgOffset = $(this.refs.svg).offset();

    // resolve input values
    this.props.board.resolveCircuitInputValues();

    // calculate the position so the wires can be updated
    if (this.props.board.connectors.input) {
      this.props.board.connectors.input.calculatePosition(this.props.constants, this.props.selected);
      connectors.push(ConnectorView({key: 'input', constants: this.props.constants, connector: this.props.board.connectors.input, selected: this.props.selected, editable: this.props.editable, drawConnection: this.drawConnection, reportHover: this.reportHover}));
    }
    if (this.props.board.connectors.output) {
      this.props.board.connectors.output.calculatePosition(this.props.constants, this.props.selected);
      connectors.push(ConnectorView({key: 'output', constants: this.props.constants, connector: this.props.board.connectors.output, selected: this.props.selected, editable: this.props.editable, drawConnection: this.drawConnection, reportHover: this.reportHover}));
    }

    for (name in this.props.board.components) {
      if (this.props.board.components.hasOwnProperty(name)) {
        component = this.props.board.components[name];
        component.calculatePosition(this.props.constants, this.props.selected, componentIndex++, this.props.board.numComponents);
        components.push(component.view({key: name, constants: this.props.constants, component: component, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, drawConnection: this.drawConnection, reportHover: this.reportHover}));
      }
    }

    for (i = 0; i < this.props.board.wires.length; i++) {
      wire = this.props.board.wires[i];
      wires.push(WireView({key: i, constants: this.props.constants, wire: wire, board: this.props.board, editable: editableWires, width: selectedConstants.WIRE_WIDTH, wireSelected: this.wireSelected, selected: this.state.selectedWires.indexOf(wire) !== -1}));
    }

    return div({className: this.props.editable ? 'board editable-board' : 'board', style: style},
      span({className: this.props.editable ? 'board-user editable-board-user' : 'board-user'}, ('Circuit ' + (this.props.board.number + 1) + ': ') + (this.props.user ? this.props.user.name : '(unclaimed)')),
      svg({className: 'board-area', onMouseDown: this.props.selected && this.props.editable ? this.backgroundMouseDown : null, ref: 'svg'},
        connectors,
        components,
        wires,
        (this.state.drawConnection ? line({x1: this.state.drawConnection.x1, x2: this.state.drawConnection.x2, y1: this.state.drawConnection.y1, y2: this.state.drawConnection.y2, stroke: this.state.drawConnection.stroke, strokeWidth: this.state.drawConnection.strokeWidth, fill: 'none', style: {pointerEvents: 'none'}}) : null),
        (this.state.drawBox ? path({d: this.state.drawBox.path, stroke: this.state.drawBox.stroke, strokeWidth: this.state.drawBox.strokeWidth, strokeDasharray: this.state.drawBox.strokeDasharray, fill: 'none', style: {pointerEvents: 'none'}}) : null),
        this.props.showProbe ? ProbeView({constants: this.props.constants, board: this.props.board, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, probeSource: this.state.probeSource, hoverSource: this.state.hoverSource, pos: this.state.probePos, setProbe: this.setProbe, svgOffset: this.svgOffset, draggingProbe: this.draggingProbe}) : null
      ),
      this.props.toggleBoard ? span({className: 'board-toggle'}, button({onClick: this.toggleBoard}, this.props.selected ? 'View All Circuits' : (this.props.editable ? 'Edit Circuit' : 'View Circuit'))) : null
    );
  }
});
