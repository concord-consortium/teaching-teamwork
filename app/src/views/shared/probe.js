var events = require('../shared/events'),
    g = React.DOM.g,
    path = React.DOM.path,
    circle = React.DOM.circle;

module.exports = React.createClass({
  displayName: 'ProbeView',

  getInitialState: function () {
    return {
      dragging: false
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
      if (self.props.hoverSource) {
        self.props.hoverSource.pulseProbeDuration = 0;
      }
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
      x: this.props.probeSource ? this.props.probeSource.cx : (this.props.pos ? this.props.pos.x : this.props.constants.WORKSPACE_WIDTH - selectedConstants.PROBE_WIDTH - selectedConstants.PROBE_MARGIN),
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
        needlePath, handlePath, rotation;

    if (this.props.probeSource && (!this.props.probeSource.inputMode || this.props.probeSource.connected)) {

      if (this.props.probeSource.isHigh()) {
        redFill = 1;
      }
      else if (this.props.probeSource.isLow()) {
        greenFill = 1;
      }

      if (this.props.probeSource.pulseProbeDuration) {
        amberFill = 1;

        if (this.props.stepping) {
          // show for only 1 step
          this.props.probeSource.pulseProbeDuration = 0;
        }
        else {
          // show for 3 renders (300ms) and then hide for 3 renders (300ms)
          this.props.probeSource.pulseProbeDuration++;
          if (this.props.probeSource.pulseProbeDuration > 3) {
            amberFill = defaultFill;
          }
          if (this.props.probeSource.pulseProbeDuration > 6) {
            this.props.probeSource.pulseProbeDuration = 0;
          }
        }
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
      circle({cx: x + (4 * height), cy: middleY, r: height / 4, fill: 'red', fillOpacity: redFill}),
      circle({cx: x + (5 * height), cy: middleY, r: height / 4, fill: 'green', fillOpacity: greenFill}),
      circle({cx: x + (6 * height), cy: middleY, r: height / 4, fill: '#ffbf00', fillOpacity: amberFill})
    );
  }
});
