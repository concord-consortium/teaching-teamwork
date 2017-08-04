var colors = require('./colors'),
    ConnectorHoleView = React.createFactory(require('./connector-hole')),
    ConnectorSelectorView = React.createFactory(require('./connector-selector')),
    DIPBankView = React.createFactory(require('./dip-bank')),
    LEDBankView = React.createFactory(require('./led-bank')),
    svg = React.DOM.svg,
    rect = React.DOM.rect,
    text = React.DOM.text,
    title = React.DOM.title;

module.exports = React.createClass({
  displayName: 'ConnectorView',

  render: function () {
    var position = this.props.connector.position,
        selectedConstants = this.props.constants.selectedConstants(this.props.selected),
        fontSize = selectedConstants.BUS_FONT_SIZE,
        holes = [],
        labels = [],
        numHoles = this.props.connector.holes.length,
        hole, i, backgroundRect, inputRect, outputRect, selectorRect, positiveSelector, negativeSelector, dipBank, ledBank;

    for (i = 0; i < numHoles; i++) {
      hole = this.props.connector.holes[i];
      holes.push(ConnectorHoleView({key: i, connector: this.props.connector, hole: hole, selected: this.props.selected, editable: this.props.editable, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover, forceRerender: this.props.forceRerender, showBusColors: this.props.showBusColors}));
      if (this.props.showBusLabels && (this.props.connector.type == 'bus')) {
        labels.push(text({key: i, x: position.x + position.width + hole.radius, y: hole.cy + (fontSize / 2), fontSize: fontSize, fill: '#000', style: {textAnchor: 'start'}}, hole.label));
      }
    }

    if (this.props.connector.type == 'input') {
      dipBank = DIPBankView({key: 'dipbank', connector: this.props.connector, selected: this.props.selected, editable: this.props.editable, forceRerender: this.props.forceRerender});
      if (this.props.showInputAutoToggles) {
        selectorRect = rect({x: position.x + position.width, y: 0, width: position.selectorBackgroundWidth, height: position.height, fill: colors.inputSelectorBackground},
          title({}, "Cycles the switches in forward or reverse binary order")
        );
        negativeSelector = ConnectorSelectorView({key: 'negative', direction: 'negative', connector: this.props.connector, selected: this.props.selected, editable: this.props.editable, cx: position.negativeSelectorCX, cy: position.height / 2, width: position.selectorWidth, height: position.selectorHeight, forceRerender: this.props.forceRerender});
        positiveSelector = ConnectorSelectorView({key: 'positive', direction: 'positive', connector: this.props.connector, selected: this.props.selected, editable: this.props.editable, cx: position.positiveSelectorCX, cy: position.height / 2, width: position.selectorWidth, height: position.selectorHeight, forceRerender: this.props.forceRerender});
      }
    }
    else if (this.props.connector.type == 'output') {
      ledBank = LEDBankView({key: 'dipbank', connector: this.props.connector});
    }
    else if (this.props.connector.type == 'bus') {
      backgroundRect = rect({x: position.x, y: position.y, width: position.width, height: position.height, fill: '#aaa'});
    }

    if (position.inputHeight > 0) {
      inputRect = rect({x: position.x, y: position.y, width: position.width, height: position.inputHeight, fill: colors.busInput});
    }
    if (position.outputHeight > 0) {
      outputRect = rect({x: position.x, y: position.y + position.height - position.outputHeight, width: position.width, height: position.outputHeight, fill: colors.busOutput});
    }

    return svg({},
      backgroundRect,
      ledBank,
      inputRect,
      outputRect,
      selectorRect,
      negativeSelector,
      positiveSelector,
      holes,
      dipBank,
      labels
    );
  }
});
