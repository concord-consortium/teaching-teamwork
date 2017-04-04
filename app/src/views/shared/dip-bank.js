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

    for (i = 0; i < numHoles; i++) {
      hole = this.props.connector.holes[i];
      switches.push(DIPSwitchView({key: i, connector: this.props.connector, hole: hole, selected: this.props.selected, editable: this.props.editable, forceRerender: this.props.forceRerender}));
    }

    backgroundRect = rect({x: position.x, y: 0, width: position.width, height: position.height, fill: '#aaa'});

    fontSize = position.height / 2.5;
    one = text({key: 'one', x: position.x - fontSize, y: fontSize, fontSize: fontSize, fill: '#000', style: {textAnchor: 'start'}}, '1');
    zero = text({key: 'zero', x: position.x - fontSize, y: position.height - (fontSize / 2), fontSize: fontSize, fill: '#000', style: {textAnchor: 'start'}}, '0');

    return svg({},
      backgroundRect,
      switches,
      one,
      zero,
      title({}, 'Switches for input testing')
    );
  }
});
