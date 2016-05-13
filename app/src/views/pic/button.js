var constants = require('./constants'),
    g = React.DOM.g,
    rect = React.DOM.rect,
    text = React.DOM.text;

module.exports = React.createClass({
  displayName: 'ButtonView',

  onClick: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.props.pushButton(this.props.button);
  },

  render: function () {
    var onClick = this.onClick;
    return g({onClick: onClick, style: {cursor: 'pointer'}},
      rect({x: this.props.button.x, y: this.props.button.y, width: this.props.button.width, height: this.props.button.height, fill: this.props.pushed ? constants.SELECTED_FILL : constants.UNSELECTED_FILL}),
      text({x: this.props.button.label.x, y: this.props.button.label.y, fontSize: this.props.button.labelSize, fill: '#fff', style: {textAnchor: this.props.button.label.anchor}}, this.props.button.label.text)
    );
  }
});
