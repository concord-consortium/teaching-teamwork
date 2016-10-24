var ConnectorHoleView = React.createFactory(require('./connector-hole')),
    svg = React.DOM.svg,
    rect = React.DOM.rect,
    text = React.DOM.text;

module.exports = React.createClass({
  displayName: 'ConnectorView',

  render: function () {
    var position = this.props.connector.position,
        selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        fontSize = selectedConstants.BUS_FONT_SIZE,
        holes = [],
        labels = [],
        hole, i;

    for (i = 0; i < this.props.connector.holes.length; i++) {
      hole = this.props.connector.holes[i];
      holes.push(ConnectorHoleView({key: i, connector: this.props.connector, hole: hole, selected: this.props.selected, editable: this.props.editable, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover, forceRerender: this.props.forceRerender, showBusColors: this.props.showBusColors}));
      if (this.props.showBusLabels && (this.props.connector.type == 'bus')) {
        labels.push(text({x: position.x + position.width + hole.radius, y: hole.cy + (fontSize / 2), fontSize: fontSize, fill: '#000', style: {textAnchor: 'start'}}, hole.label));
      }
    }

    return svg({},
      rect({x: position.x, y: position.y, width: position.width, height: position.height, fill: '#aaa'}),
      holes,
      labels
    );
  }
});
