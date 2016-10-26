var colors = require('./colors'),
    ConnectorHoleView = React.createFactory(require('./connector-hole')),
    ConnectorSelectorView = React.createFactory(require('./connector-selector')),
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
        numHoles = this.props.connector.holes.length,
        firstHole = this.props.connector.holes[0],
        hole, i, inputRect, outputRect, selectorRect, positiveSelector, negativeSelector;

    for (i = 0; i < numHoles; i++) {
      hole = this.props.connector.holes[i];
      holes.push(ConnectorHoleView({key: i, connector: this.props.connector, hole: hole, selected: this.props.selected, editable: this.props.editable, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover, forceRerender: this.props.forceRerender, showBusColors: this.props.showBusColors}));
      if (this.props.showBusLabels && (this.props.connector.type == 'bus')) {
        labels.push(text({x: position.x + position.width + hole.radius, y: hole.cy + (fontSize / 2), fontSize: fontSize, fill: '#000', style: {textAnchor: 'start'}}, hole.label));
      }
    }

    if ((this.props.connector.type == 'input') && this.props.showInputAutoToggles) {
      selectorRect = rect({x: position.x + position.width, y: position.y, width: position.selectorBackgroundWidth, height: position.height, fill: colors.inputSelectorBackground});
      negativeSelector = ConnectorSelectorView({key: 'negative', direction: 'negative', connector: this.props.connector, selected: this.props.selected, editable: this.props.editable, cx: position.negativeSelectorCX, cy: firstHole.cy, width: position.selectorWidth, height: position.selectorHeight, forceRerender: this.props.forceRerender});
      positiveSelector = ConnectorSelectorView({key: 'positive', direction: 'positive', connector: this.props.connector, selected: this.props.selected, editable: this.props.editable, cx: position.positiveSelectorCX, cy: firstHole.cy, width: position.selectorWidth, height: position.selectorHeight, forceRerender: this.props.forceRerender});
    }

    if (position.inputHeight > 0) {
      inputRect = rect({x: position.x, y: position.y, width: position.width, height: position.inputHeight, fill: colors.busInput});
    }
    if (position.outputHeight > 0) {
      outputRect = rect({x: position.x, y: position.y + position.height - position.outputHeight, width: position.width, height: position.outputHeight, fill: colors.busOutput});
    }

    return svg({},
      rect({x: position.x, y: position.y, width: position.width, height: position.height, fill: '#aaa'}),
      inputRect,
      outputRect,
      selectorRect,
      negativeSelector,
      positiveSelector,
      holes,
      labels
    );
  }
});
