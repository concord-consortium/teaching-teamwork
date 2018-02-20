var boardWatcher = require('../../controllers/pic/board-watcher'),
    ConnectorView = React.createFactory(require('./connector')),
    WireView = React.createFactory(require('./wire')),
    ProbeView = React.createFactory(require('./probe')),
    LogicChipDrawerView = React.createFactory(require('./logic-chip-drawer')),
    BreadboardView = React.createFactory(require('../logic-gates/breadboard')),
    events = require('../shared/events'),
    layout = require('./layout'),
    LogicChip =  require('../../models/logic-gates/logic-chip'),
    div = React.DOM.div,
    span = React.DOM.span,
    div = React.DOM.div,
    svg = React.DOM.svg,
    //line = React.DOM.line,
    path = React.DOM.path,
    button = React.DOM.button,
    showCircuitDebugger = window.location.search.indexOf('showCircuitDebugger') !== -1;

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
      selectedComponents: [],
      drawBox: null,
      draggingProbe: false,
      draggingChip: null
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

  chatHasFocus: function () {
    // adapted from http://stackoverflow.com/a/7821694
    var focused = document.activeElement;
    if (!focused || focused == document.body) {
      focused = null;
    }
    else if (document.querySelector) {
      focused = document.querySelector(":focus");
    }
    return focused && ((focused.nodeName === "TEXTAREA") || (focused.nodeName === "INPUT"));
  },

  keyDown: function (e) {
    // ignore when chat has focus
    if (this.chatHasFocus()) {
      return;
    }

    // 46 is the delete key which maps to 8 on Macs
    // this is needed so Chrome on Macs don't trigger a back navigation
    if ((e.keyCode == 46) || (e.keyCode == 8)) {
      e.preventDefault();
      e.stopPropagation();
    }
  },

  keyUp: function (e) {
    var wiresToRemove = [],
        i, j, selectedComponent, wire;

    // ignore when chat has focus
    if (this.chatHasFocus()) {
      return;
    }

    // 46 is the delete key which maps to 8 on Macs
    if (!((e.keyCode == 46) || (e.keyCode == 8))) {
      return;
    }

    if (this.props.selected && this.props.editable) {

      // mark selected wires to remove
      for (i = 0; i < this.state.selectedWires.length; i++) {
        wire = this.state.selectedWires[i];
        if (wiresToRemove.indexOf(wire) === -1) {
          wiresToRemove.push(wire);
        }
      }

      // remove components
      for (i = 0; i < this.state.selectedComponents.length; i++) {
        selectedComponent = this.state.selectedComponents[i];

        // mark powered wires to removed component
        for (j = 0; j < this.props.board.wires.length; j++) {
          wire = this.props.board.wires[j];
          if ((wiresToRemove.indexOf(wire) === -1) && ((wire.source.component == selectedComponent) || (wire.dest.component == selectedComponent))) {
            wiresToRemove.push(wire);
          }
        }

        if (selectedComponent instanceof LogicChip) {
          this.removeLogicChip(selectedComponent);
        }
        else {
          this.props.board.removeComponent(selectedComponent);
          events.logEvent(events.REMOVE_COMPONENT, null, {board: this.props.board, component: selectedComponent});
        }
      }

      for (i = 0; i < wiresToRemove.length; i++) {
        wire = wiresToRemove[i];
        this.props.board.removeWire(wire.source, wire.dest);
        events.logEvent(events.REMOVE_WIRE_EVENT, null, {board: this.props.board, source: wire.source, dest: wire.dest});
      }

      this.setState({
        wires: this.props.board.wires,
        selectedWires: [],
        selectedComponents: []
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
    this.blurChatFocus();
  },

  drawConnection: function (source, e, color, callback) {
    var $window = $(window),
        self = this,
        moved = false,
        bezierReflection = source.getBezierReflection ? source.getBezierReflection() : 1,
        drag, stopDrag;

    e.preventDefault();
    e.stopPropagation();

    this.blurChatFocus();

    drag = function (e) {
      if (!moved) {
        self.setState({
          selectedWires: [],
          selectedComponents: [],
          drawConnection: {
            x1: source.cx,
            y1: source.cy,
            x2: source.cx,
            y2: source.cy,
            strokeWidth: self.props.constants.selectedConstants(self.props.selected).WIRE_WIDTH,
            stroke: '#2eadab',
            reflection: bezierReflection * self.props.board.bezierReflectionModifier
          }
        });
      }
      moved = true;
      e.preventDefault();
      self.state.drawConnection.x2 = e.pageX - self.svgOffset.left;
      self.state.drawConnection.y2 = e.pageY - self.svgOffset.top;
      self.setState({drawConnection: self.state.drawConnection});
    };

    stopDrag = function (e) {
      var dest = self.state.hoverSource,
          addedWire = false,
          dx = self.state.drawConnection ? (self.state.drawConnection.x2 - self.state.drawConnection.x1) : 0,
          dy = self.state.drawConnection ? (self.state.drawConnection.y2 - self.state.drawConnection.y1) : 0,
          wire;

      e.stopPropagation();
      e.preventDefault();

      $window.off('mousemove', drag);
      $window.off('mouseup', stopDrag);
      self.setState({drawConnection: null});

      // this handles slight movements of the mouse
      if (moved) {
        moved = (dx * dx) + (dy * dy) > 10;
      }

      if (moved && dest && (dest !== source)) {
        addedWire = true;
        wire = self.props.board.addWire(source, dest, (source.color || dest.color || color));
        self.setState({
          wires: self.props.board.wires,
          selectedWires: [],
          selectedComponents: []
        });
        events.logEvent(events.ADD_WIRE_EVENT, null, {board: self.props.board, source: source, dest: dest});
      }

      if (callback) {
        callback(addedWire, moved);
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

  blurChatFocus: function () {
    // remove focus from chat textbox
    var focused = document.activeElement || (document.querySelector ? document.querySelector(":focus") : null);
    if (focused) {
      focused.blur();
    }
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
        selectedWires: [],
        selectedComponents: []
      });
      this.drawConnection(shortestDistance == sourceDistance ? wire.dest : wire.source, e, wire.color, function (addedWire) {
        var newWire;
        if (!addedWire) {
          newWire = self.props.board.addWire(wire.source, wire.dest, wire.color);
          self.setState({
            wires: self.props.board.wires,
            selectedWires: [newWire],
            selectedComponents: []
          });
        }
      });
    }
    else {
      this.setState({selectedWires: [wire], selectedComponents: []});
    }
    this.blurChatFocus();
  },

  backgroundMouseDown: function (e) {
    var $window = $(window),
        self = this,
        drag, stopDrag, getPath, x1, y1;

    this.blurChatFocus();

    this.setState({selectedWires: [], selectedComponents: []});

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
          selectedComponents = [],
          r, enclosed, i, wire, component;

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
      for (i = 0; i < self.props.board.componentList.length; i++) {
        component = self.props.board.componentList[i];
        if (component.selectable && enclosed(component.position.x, component.position.y)) {
          selectedComponents.push(component);
        }
      }

      self.setState({
        drawBox: null,
        selectedWires: selectedWires,
        selectedComponents: selectedComponents
      });
    };

    $window.on('mousemove', drag);
    $window.on('mouseup', stopDrag);
  },

  draggingProbe: function (draggingProbe) {
    this.setState({draggingProbe: draggingProbe});
  },

  layoutChanged: function () {
    this.setState({wires: this.state.wires});
  },

  snapToGrid: function (pos) {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        gridSize = selectedConstants.PIN_WIDTH;
    return {
      x: gridSize * Math.round(pos.x / gridSize),
      y: gridSize * Math.round(pos.y / gridSize)
    };
  },

  startLogicChipDrawerDrag: function (chip, pageX, pageY) {
    var chipCX = 75,
        chipCY = 37,
        chipX = pageX - this.svgOffset.left - chipCX,
        chipY = pageY - this.svgOffset.top - chipCY,
        draggingChip = new LogicChip({type: chip.type, layout: {x: chipX, y: chipY}});

    this.setState({
      selectedWires: [],
      selectedComponents: [],
      draggingChip: {
        type: chip.type,
        view: draggingChip.view({
          constants: this.props.constants,
          component: draggingChip,
          startDragPos: {x: pageX, y: pageY},
          stopLogicChipDrawerDrag: this.stopLogicChipDrawerDrag,
          layoutChanged: this.layoutChanged,
          snapToGrid: this.snapToGrid,
          selected: true,
          componentSelected: true,
          logicChipDragRect: this.getLogicChipDragRect()
        })
      }
    });
  },

  stopLogicChipDrawerDrag: function (chip) {
    var r = this.getLogicChipDragRect();

    // don't add if hidden by drawer
    if (chip.x < r.right - 100) {
      var component = new LogicChip({type: chip.type, layout: {x: chip.x, y: chip.y}, selectable: true});
      this.addLogicChip(component);
      this.setState({draggingChip: null, selectedWires: [], selectedComponents: [component]});
    }
    else {
      this.setState({draggingChip: null});
    }
  },

  addLogicChip: function (chip) {
    this.props.board.addComponent("lc-next", chip);
    events.logEvent(events.ADD_LOGIC_CHIP_EVENT, null, {board: this.props.board, chip: chip});
  },

  removeLogicChip: function (chip) {
    this.props.board.removeComponent(chip);
    events.logEvent(events.REMOVE_LOGIC_CHIP_EVENT, null, {board: this.props.board, chip: chip});
  },

  componentSelected: function (component) {
    this.setState({selectedWires: [], selectedComponents: [component]});
  },

  getLogicChipDragRect: function () {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected);
    return selectedConstants.LOGIC_DRAWER_LAYOUT ? {
      top: 10,
      left: 10,
      right: this.props.constants.WORKSPACE_WIDTH - selectedConstants.LOGIC_DRAWER_LAYOUT.width - 10,
      bottom: selectedConstants.BOARD_HEIGHT - 10
    } : {};
  },

  render: function () {
    var self = this,
        selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        style = {
          width: selectedConstants.BOARD_WIDTH,
          height: selectedConstants.BOARD_HEIGHT,
          position: 'relative',
          left: selectedConstants.BOARD_LEFT
        },
        connectors = [],
        components = [],
        wires = [],
        componentIndex = 0,
        enableWirePointerEvents = !this.state.draggingProbe && !this.state.drawConnection && !this.state.drawBox && (this.props.editable && this.props.selected),
        logicChipDragRect = this.getLogicChipDragRect(),
        name, component, i, wire;

    // used to find wire click position
    this.svgOffset = $(this.refs.svg).offset();

    // calculate the position so the wires can be updated
    $.each(['input', 'output', 'bus'], function (index, connectorName) {
      var connector = self.props.board.connectors[connectorName];
      if (connector) {
        connector.calculatePosition(self.props.constants, self.props.selected, self.props.board.connectors);
        connectors.push(ConnectorView({key: connectorName, constants: self.props.constants, connector: connector, selected: self.props.selected, editable: self.props.editable, drawConnection: self.drawConnection, reportHover: self.reportHover, forceRerender: self.props.forceRerender, showBusLabels: self.props.showBusLabels, showBusColors: self.props.showBusColors, showInputAutoToggles: self.props.showInputAutoToggles}));
      }
    });

    for (name in this.props.board.components) {
      if (this.props.board.components.hasOwnProperty(name)) {
        component = this.props.board.components[name];
        if (component.calculatePosition) {
          component.calculatePosition(this.props.constants, this.props.selected, componentIndex++, this.props.board.numComponents);
        }
        components.push(component.view({key: name, constants: this.props.constants, component: component, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, showPinColors: this.props.showPinColors, showPinouts: this.props.showPinouts, drawConnection: this.drawConnection, reportHover: this.reportHover, layoutChanged: this.layoutChanged, snapToGrid: this.snapToGrid, componentSelected: this.state.selectedComponents.indexOf(component) !== -1, componentClicked: this.componentSelected, logicChipDragRect: logicChipDragRect}));
      }
    }

    for (i = 0; i < this.props.board.wires.length; i++) {
      wire = this.props.board.wires[i];
      wires.push(WireView({key: i, constants: this.props.constants, wire: wire, board: this.props.board, editable: this.props.editable, enablePointerEvents: enableWirePointerEvents, width: selectedConstants.WIRE_WIDTH, wireSelected: this.wireSelected, selected: this.state.selectedWires.indexOf(wire) !== -1, wireSettings: this.props.wireSettings}));
    }

    var breadboardView = null;
    if (this.props.board.breadboard) {
      breadboardView = BreadboardView({breadboard: this.props.board.breadboard, drawConnection: this.drawConnection, reportHover: this.reportHover, showColors: this.props.showBreadboardColors});
    }

    return div({className: this.props.editable ? 'board editable-board' : 'board', style: style},
      span({className: this.props.editable ? 'board-user editable-board-user' : 'board-user'}, ('Circuit ' + (this.props.board.number + 1)) + (this.props.user ? ': ' + this.props.user.name : (this.props.soloMode ? '' : ': (unclaimed)'))),
      showCircuitDebugger && this.state.hoverSource ? span({className: "debug-hover"}, this.state.hoverSource.toString() + ": " + this.state.hoverSource.powered + "/" + this.state.hoverSource.inputMode) : null,
      svg({className: 'board-area', onMouseDown: this.props.selected && this.props.editable ? this.backgroundMouseDown : null, ref: 'svg'},
        breadboardView,
        connectors,
        components,
        wires,
        //(this.state.drawConnection ? line({x1: this.state.drawConnection.x1, x2: this.state.drawConnection.x2, y1: this.state.drawConnection.y1, y2: this.state.drawConnection.y2, stroke: this.state.drawConnection.stroke, strokeWidth: this.state.drawConnection.strokeWidth, fill: 'none', style: {pointerEvents: 'none'}}) : null),
        (this.state.drawConnection ? path({d: layout.getBezierPath({x1: this.state.drawConnection.x1, x2: this.state.drawConnection.x2, y1: this.state.drawConnection.y1, y2: this.state.drawConnection.y2, reflection: this.state.drawConnection.reflection, wireSettings: this.props.wireSettings}), stroke: this.state.drawConnection.stroke, strokeWidth: this.state.drawConnection.strokeWidth, fill: 'none', style: {pointerEvents: 'none'}}) : null),

        (this.state.drawBox ? path({d: this.state.drawBox.path, stroke: this.state.drawBox.stroke, strokeWidth: this.state.drawBox.strokeWidth, strokeDasharray: this.state.drawBox.strokeDasharray, fill: 'none', style: {pointerEvents: 'none'}}) : null),
        this.props.logicChipDrawer && this.props.editable && this.props.selected ? LogicChipDrawerView({board: this.props.board, drawer: this.props.logicChipDrawer, selected: this.props.selected, editable: this.props.editable, startDrag: this.startLogicChipDrawerDrag, layout: selectedConstants.LOGIC_DRAWER_LAYOUT}) : null,
        this.props.showProbe ? ProbeView({constants: this.props.constants, board: this.props.board, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, probeSource: this.state.probeSource, hoverSource: this.state.hoverSource, pos: this.state.probePos, setProbe: this.setProbe, svgOffset: this.svgOffset, draggingProbe: this.draggingProbe}) : null,
        this.state.draggingChip ? this.state.draggingChip.view : null
      ),
      this.props.toggleBoard ? span({className: 'board-toggle', style: this.props.toggleBoardButtonStyle}, button({onClick: this.toggleBoard}, this.props.selected ? 'View All Circuits' : (this.props.editable ? 'Edit Circuit' : 'View Circuit'))) : null
    );
  }
});
