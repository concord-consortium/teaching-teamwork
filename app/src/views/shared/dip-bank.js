var svg = React.DOM.svg,
    rect = React.DOM.rect,
    text = React.DOM.text,
    title = React.DOM.title,
    DIPSwitchView = React.createFactory(require('./dip-switch'));

module.exports = React.createClass({
  displayName: 'DIPBank',

  render: function () {
    var position = this.props.connector.position,
        switches = [],
        numHoles = this.props.connector.holes.length,
        backgroundRect, hole, i, one, zero, fontSize;

    if (numHoles === 0) {
      return null;
    }

    for (i = 0; i < numHoles; i++) {
      hole = this.props.connector.holes[i];
      switches.push(DIPSwitchView({key: i, connector: this.props.connector, hole: hole, selected: this.props.selected, editable: this.props.editable, forceRerender: this.props.forceRerender}));
    }

    backgroundRect = rect({x: position.x, y: 6, width: position.width, height: position.height, fill: '#aaa'});

    fontSize = position.height / 2.5;
    zero = text({key: 'zero', x: position.x - fontSize, y: 5 + fontSize-1, fontSize: fontSize, fill: '#000', style: {textAnchor: 'start'}}, '0');
    one = text({key: 'one', x: position.x - fontSize, y: 5 + position.height, fontSize: fontSize, fill: '#000', style: {textAnchor: 'start'}}, '1');

    return svg({},
      backgroundRect,
      switches,
      zero,
      one,
      title({}, 'Switches for input testing')
    );
  }
});
