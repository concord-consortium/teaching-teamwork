var g = React.DOM.g,
    rect = React.DOM.rect,
    text = React.DOM.text,
    ChipView;

ChipView = React.createFactory(React.createClass({
  displayName: 'ChipView',

  startDrag: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.props.startDrag({type: this.props.type}, e.pageX, e.pageY);
  },

  render: function () {
    var labelX = this.props.x + (this.props.width / 2),
        labelY = this.props.y + (this.props.height / 2);

    return g({onMouseDown: this.props.selected && this.props.editable ? this.startDrag : null},
      rect({x: this.props.x, y: this.props.y, width: this.props.width, height: this.props.height, fill: '#333'}),
      text({key: 'label', x: labelX, y: labelY, fontSize: 14, fill: '#fff', style: {textAnchor: 'middle', dominantBaseline: 'central'}, transform: 'rotate(-90, ' + labelX + ', ' + labelY + ')'}, this.props.type)
    );
  }
}));

module.exports = React.createClass({
  displayName: 'LogicChipDrawerView',

  render: function () {
    var chips = [],
        chipWidth = this.props.layout.width * 0.6,
        chipHeight = chipWidth * 1.5,
        chipMargin = (this.props.layout.width - chipWidth) / 2,
        numChips = this.props.chips.length,
        chipX = this.props.layout.x + chipMargin,
        chipY = this.props.layout.y + ((this.props.layout.height - ((numChips * chipHeight) + ((numChips - 1) * chipMargin))) / 2),
        i, chip;

    for (i = 0; i < numChips; i++) {
      chip = this.props.chips[i];
      chips.push(ChipView({type: chip.type, x: chipX, y: chipY + (i * (chipHeight + chipMargin)), width: chipWidth, height: chipHeight, selected: this.props.selected, editable: this.props.editable, startDrag: this.props.startDrag}));
    }
    return g({},
      rect({x: this.props.layout.x, y: this.props.layout.y, width: this.props.layout.width, height: this.props.layout.height, fill: '#aaa'}),
      chips
    );
  }
});
