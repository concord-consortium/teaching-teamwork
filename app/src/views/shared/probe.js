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
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        $window = $(window),
        self = this,
        drag, stopDrag;

    this.props.draggingProbe(true);

    e.preventDefault();
    e.stopPropagation();

    drag = function (e) {
      e.preventDefault();
      self.props.setProbe({source: null, pos: {x: (e.pageX - self.props.svgOffset.left), y: (e.pageY - self.props.svgOffset.top) - (selectedConstants.PROBE_HEIGHT / 2)}});
    };

    stopDrag = function (e) {
      self.props.draggingProbe(false);

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

  render: function () {
    var selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        width = selectedConstants.PROBE_WIDTH,
        height = selectedConstants.PROBE_HEIGHT,
        halfNeedleHeight = selectedConstants.PROBE_NEEDLE_HEIGHT / 2,
        x = this.props.probeSource ? this.props.probeSource.cx : (this.props.pos ? this.props.pos.x : this.props.constants.WORKSPACE_WIDTH - selectedConstants.PROBE_WIDTH - selectedConstants.PROBE_MARGIN),
        y = this.props.probeSource ? this.props.probeSource.cy - (height / 2) : (this.props.pos ? this.props.pos.y : selectedConstants.BOARD_HEIGHT - selectedConstants.PROBE_HEIGHT - selectedConstants.PROBE_MARGIN),
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
