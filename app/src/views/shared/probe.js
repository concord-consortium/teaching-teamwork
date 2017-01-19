var events = require('../shared/events'),
    TTL = require('../../models/shared/ttl'),
    g = React.DOM.g,
    path = React.DOM.path,
    circle = React.DOM.circle,
    rect = React.DOM.rect,
    text = React.DOM.text;

module.exports = React.createClass({
  displayName: 'ProbeView',

  getInitialState: function () {
    return {
      dragging: false,
      lowColor: TTL.getColor(TTL.LOW_VOLTAGE),
      highColor: TTL.getColor(TTL.HIGH_VOLTAGE),
      invalidColor: TTL.getColor(TTL.INVALID_VOLTAGE)
    };
  },

  startDrag: function (e) {
    var $window = $(window),
        self = this,
        drag, stopDrag;

    this.props.draggingProbe(true);

    e.preventDefault();
    e.stopPropagation();

    this.setState({animationStart: this.getCurrentPos(), animationStep: 0});
    this.props.setProbe({source: null, pos: this.getNewPos(e)});
    this.setAnimationTimer();

    drag = function (e) {
      e.preventDefault();
      self.props.setProbe({source: null, pos: self.getNewPos(e)});
    };

    stopDrag = function (e) {
      self.props.draggingProbe(false);
      self.setState({animationStart: null});

      e.preventDefault();
      $window.off('mousemove', drag);
      $window.off('mouseup', stopDrag);
      self.props.setProbe({source: self.props.hoverSource, pos: null});
      events.logEvent(events.MOVED_PROBE_EVENT, self.props.hoverSource, {board: self.props.board});
    };

    $window.on('mousemove', drag);
    $window.on('mouseup', stopDrag);
  },

  getNewPos: function (e) {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected);
    return {x: (e.pageX - this.props.svgOffset.left), y: (e.pageY - this.props.svgOffset.top) - (selectedConstants.PROBE_HEIGHT / 2)};
  },

  getCurrentPos: function () {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected);
    return {
      x: this.props.probeSource ? this.props.probeSource.cx : (this.props.pos ? this.props.pos.x : selectedConstants.BOARD_WIDTH - selectedConstants.PROBE_WIDTH - selectedConstants.PROBE_MARGIN),
      y: this.props.probeSource ? this.props.probeSource.cy - (selectedConstants.PROBE_HEIGHT / 2) : (this.props.pos ? this.props.pos.y : selectedConstants.BOARD_HEIGHT - selectedConstants.PROBE_HEIGHT - selectedConstants.PROBE_MARGIN)
    };
  },

  setAnimationTimer: function () {
    clearTimeout(this.animationTimer);
    this.animationTimer = setTimeout(this.animate, 15);
  },

  animate: function () {
    if (this.state.animationStep < 9) {
      this.setState({animationStep: this.state.animationStep + 1});
      this.setAnimationTimer();
    }
    else {
      this.setState({animationStart: null});
    }
  },

  getAnimatedPos: function (currentPos) {
    var dx, dy, percentage, pos;
    if (!this.state.animationStart) {
      return currentPos;
    }
    percentage = this.state.animationStep / 10;
    dx = currentPos.x - this.state.animationStart.x;
    dy = currentPos.y - this.state.animationStart.y;
    pos = {
      x: this.state.animationStart.x + (dx * percentage),
      y: this.state.animationStart.y + (dy * percentage)
    };
    return pos;
  },

  // copied from http://stackoverflow.com/a/9232092
  truncateDecimals: function (num, digits) {
    var numS = num.toString(),
        decPos = numS.indexOf('.'),
        substrLength = decPos == -1 ? numS.length : 1 + decPos + digits,
        trimmedResult = numS.substr(0, substrLength),
        finalResult = isNaN(trimmedResult) ? 0 : trimmedResult;

    return parseFloat(finalResult);
  },

  render: function () {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        width = selectedConstants.PROBE_WIDTH,
        height = selectedConstants.PROBE_HEIGHT,
        halfNeedleHeight = selectedConstants.PROBE_NEEDLE_HEIGHT / 2,
        pos = this.getAnimatedPos(this.getCurrentPos()),
        x = pos.x,
        y = pos.y,
        middleY = y + (height / 2),
        defaultFill = 0.125,
        redFill = defaultFill,
        greenFill = defaultFill,
        amberFill = defaultFill,
        voltage = "--",
        needlePath, handlePath, rotation;

    if (this.props.probeSource && (!this.props.probeSource.inputMode || this.props.probeSource.connected)) {

      voltage = this.truncateDecimals(this.props.probeSource.getVoltage(), 2);

      if (this.props.probeSource.isHigh()) {
        redFill = 1;
      }
      else if (this.props.probeSource.isLow()) {
        greenFill = 1;
      }
      else {
        amberFill = 1;
      }
    }

    needlePath = [
      'M', x, ',', middleY, ' ',
      'L', x + halfNeedleHeight, ',', middleY - halfNeedleHeight, ' ',
      'L', x + height, ',', middleY - halfNeedleHeight, ' ',
      'L', x + height, ',', middleY + halfNeedleHeight, ' ',
      'L', x + halfNeedleHeight, ',', middleY + halfNeedleHeight, ' ',
      'L', x, ',', middleY, ' '
    ].join('');

    handlePath = [
      'M', x + height, ',', middleY - halfNeedleHeight, ' ',
      'L', x + (2 * height), ',', y, ' ',
      'L', x + width, ',', y, ' ',
      'L', x + width, ',', y + height, ' ',
      'L', x + (2 * height), ',', y + height, ' ',
      'L', x + height, ',', middleY + halfNeedleHeight, ' '
    ].join('');

    // vary the rotation lineraly from +15 at the top of the board to -15 at the bottom so the lights can be seen
    rotation = 15 - ((y / selectedConstants.BOARD_HEIGHT) * 30);

    return g({transform: ['rotate(', rotation, ' ',  x, ' ', y + (height / 2), ')'].join(''), onMouseDown: this.props.selected && this.props.editable ? this.startDrag : null},
      path({d: needlePath, fill: '#c0c0c0', stroke: '#777', style: {pointerEvents: 'none'}}),
      path({d: handlePath, fill: '#eee', stroke: '#777'}), // '#FDCA6E'
      rect({x: x + (2 * height), y: y + (0.15 * height), width: (2 * height), height: (0.7 * height), stroke: '#555', fill: '#ddd'}),
      text({x: x + (3 * height), y: middleY + 1, fontSize: selectedConstants.PROBE_HEIGHT * 0.6, fill: '#000', style: {textAnchor: 'middle'}, dominantBaseline: 'middle'}, voltage),
      circle({cx: x + (4.75 * height), cy: middleY, r: height / 4, fill: this.state.highColor, stroke: '#ccc', fillOpacity: redFill}),
      circle({cx: x + (5.75 * height), cy: middleY, r: height / 4, fill: this.state.lowColor, stroke: '#ccc', fillOpacity: greenFill}),
      circle({cx: x + (6.75 * height), cy: middleY, r: height / 4, fill: this.state.invalidColor, stroke: '#ccc', fillOpacity: amberFill})
    );
  }
});

