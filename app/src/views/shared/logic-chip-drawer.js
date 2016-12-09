var g = React.DOM.g,
    rect = React.DOM.rect,
    text = React.DOM.text,
    title = React.DOM.title,
    path = React.DOM.path,
    chipNames = require('../../data/logic-gates/chip-names'),
    ChipView;

ChipView = React.createFactory(React.createClass({
  displayName: 'ChipView',

  startDrag: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.props.startDrag({type: this.props.type}, e.pageX, e.pageY);
  },

  getTitle: function () {
    return chipNames[this.props.type] || 'Unknown';
  },

  render: function () {
    var labelX = this.props.x + (this.props.width / 2),
        labelY = this.props.y + (this.props.height / 2),
        available = (this.props.chip.count < this.props.chip.max),
        enableHandlers = this.props.selected && this.props.editable && available,
        pins = [],
        pinWidth = this.props.width / 7,
        pinDY = (this.props.height - (pinWidth * 7)) / 8,
        pinX, pinY, i, j;

    for (i = 0; i < 2; i++) {
      pinX = i === 0 ? this.props.x - pinWidth : this.props.x + this.props.width;
      for (j = 0; j < 7; j++) {
        pinY = this.props.y + pinDY + (j * (pinWidth + pinDY));
        pins.push(rect({key: 'pin' + (i + ':' + j), x: pinX, y: pinY, width: pinWidth, height: pinWidth, fill: '#777'}));
      }
    }

    return g({onMouseDown: enableHandlers ? this.startDrag : null, onWheel: this.props.onWheel},
      rect({x: this.props.x, y: this.props.y, width: this.props.width, height: this.props.height, fill: available ? '#333' : '#777'},
        title({}, this.getTitle())
      ),
      pins,
      text({key: 'label', x: labelX, y: labelY, fontSize: 14, fill: '#fff', style: {textAnchor: 'middle', dominantBaseline: 'central'}, transform: 'rotate(-90, ' + labelX + ', ' + labelY + ')'}, this.props.type) // + " (" + this.props.chip.count + "/" + this.props.chip.max + ")")
    );
  }
}));

module.exports = React.createClass({
  displayName: 'LogicChipDrawerView',

  getInitialState: function () {
    return {
      scrollSteps: 0,
      maxScrollSteps: Object.keys(this.props.chips).length - 3
    };
  },

  backgroundMouseDown: function (e) {
    e.preventDefault();
    e.stopPropagation();
  },

  scrollUp: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      scrollSteps: Math.max(this.state.scrollSteps - 1, 0)
    });
  },

  scrollDown: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      scrollSteps: Math.min(this.state.scrollSteps + 1, this.state.maxScrollSteps)
    });
  },

  onWheel: function (e) {
    if (e.deltaY < 0) {
      this.scrollUp(e);
    }
    else {
      this.scrollDown(e);
    }
  },

  render: function () {
    var self = this,
        chips = [],
        chipWidth = this.props.layout.width * 0.6,
        chipHeight = chipWidth * 1.5,
        chipMargin = (this.props.layout.width - chipWidth) / 2,
        numChips = Object.keys(this.props.chips).length,
        totalHeight = (numChips * chipHeight) + ((numChips - 1) * chipMargin),
        needsScroller = totalHeight > this.props.layout.height,
        chipX = this.props.layout.x + chipMargin,
        chipY = this.props.layout.y + chipMargin - (this.state.scrollSteps * (chipHeight + chipMargin)),
        scrollButtonHeight = 16,
        upButton = null,
        downButton = null,
        triangleWidth = scrollButtonHeight / 2,
        triangleHeight = scrollButtonHeight / 2,
        triangleX = this.props.layout.x + ((this.props.layout.width - triangleWidth) / 2),
        triangleY, trianglePath, i;

    if (needsScroller) {
      chipY = this.props.layout.y + scrollButtonHeight + (chipMargin / 2) - (this.state.scrollSteps * (chipHeight + chipMargin));

      triangleY = this.props.layout.y + (scrollButtonHeight / 2) + (triangleHeight / 2);
      trianglePath = ["M", triangleX, " ", triangleY, " l", (triangleWidth / 2), " -", triangleHeight, " l", (triangleWidth / 2), " ", triangleHeight, " Z"].join("");
      upButton = this.state.scrollSteps === 0 ? null : g({},
        rect({x: this.props.layout.x, y: this.props.layout.y, width: this.props.layout.width, height: scrollButtonHeight, fill: '#eee', onMouseDown: this.scrollUp}),
        path({d: trianglePath, fill: '#333', stroke: '#333', strokeWidth: 1})
      );

      triangleY = this.props.layout.y + this.props.layout.height - (scrollButtonHeight / 2) - (triangleHeight / 2);
      trianglePath = ["M", triangleX, " ", triangleY, " l", (triangleWidth / 2), " ", triangleHeight, " l", (triangleWidth / 2), " -", triangleHeight, " Z"].join("");
      downButton = this.state.scrollSteps === this.state.maxScrollSteps ? null : g({},
        rect({x: this.props.layout.x, y: this.props.layout.y + this.props.layout.height - scrollButtonHeight, width: this.props.layout.width, height: scrollButtonHeight, fill: '#eee', onMouseDown: this.scrollDown}),
        path({d: trianglePath, fill: '#333', stroke: '#333', strokeWidth: 1})
      );
    }
    else {
      chipY = this.props.layout.y + ((this.props.layout.height - ((numChips * chipHeight) + ((numChips - 1) * chipMargin))) / 2);
    }

    i = 0;
    $.each(this.props.chips, function (type, chip) {
      chips.push(ChipView({key: 'chip' + i, type: type, chip: chip, x: chipX, y: chipY + (i * (chipHeight + chipMargin)), width: chipWidth, height: chipHeight, selected: self.props.selected, editable: self.props.editable, startDrag: self.props.startDrag, onWheel: self.onWheel}));
      i++;
    });
    return g({},
      rect({x: this.props.layout.x, y: this.props.layout.y, width: this.props.layout.width, height: this.props.layout.height, fill: '#aaa', onMouseDown: this.backgroundMouseDown, onWheel: this.onWheel}),
      chips,
      upButton,
      downButton
    );
  }
});
