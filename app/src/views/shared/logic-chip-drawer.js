var g = React.DOM.g,
    rect = React.DOM.rect,
    text = React.DOM.text,
    title = React.DOM.title,
    ChipView;

ChipView = React.createFactory(React.createClass({
  displayName: 'ChipView',

  startDrag: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.props.startDrag({type: this.props.type}, e.pageX, e.pageY);
  },

  getTitle: function () {
    var titles = {
      '7408': 'Quad 2-Input AND',
      '7432': 'Quad 2-Input OR',
      '7404': 'Hex Inverter',
    };
    return titles[this.props.type];
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
        pins.push(rect({x: pinX, y: pinY, width: pinWidth, height: pinWidth, fill: '#777'}));
      }
    }

    return g({onMouseDown: enableHandlers ? this.startDrag : null},
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

  backgroundMouseDown: function (e) {
    e.preventDefault();
    e.stopPropagation();
  },

  render: function () {
    var self = this,
        chips = [],
        chipWidth = this.props.layout.width * 0.6,
        chipHeight = chipWidth * 1.5,
        chipMargin = (this.props.layout.width - chipWidth) / 2,
        numChips = Object.keys(this.props.chips).length,
        chipX = this.props.layout.x + chipMargin,
        chipY = this.props.layout.y + ((this.props.layout.height - ((numChips * chipHeight) + ((numChips - 1) * chipMargin))) / 2),
        i;

    i = 0;
    $.each(this.props.chips, function (type, chip) {
      chips.push(ChipView({type: type, chip: chip, x: chipX, y: chipY + (i * (chipHeight + chipMargin)), width: chipWidth, height: chipHeight, selected: self.props.selected, editable: self.props.editable, startDrag: self.props.startDrag}));
      i++;
    });
    return g({},
      rect({x: this.props.layout.x, y: this.props.layout.y, width: this.props.layout.width, height: this.props.layout.height, fill: '#aaa', onMouseDown: this.backgroundMouseDown}),
      chips
    );
  }
});