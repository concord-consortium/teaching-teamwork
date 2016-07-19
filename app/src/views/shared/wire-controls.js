var div = React.DOM.div,
    b = React.DOM.b,
    input = React.DOM.input,
    button = React.DOM.button;

// this is here to allow others to tweak the wire colors and curvature

module.exports = React.createClass({
  displayName: 'WireControls',

  update: function () {
    this.props.updateWireSettings({
      color: this.refs.color.value,
      curvyness: this.refs.curvyness.value
    });
  },

  render: function () {
    return div({style: {textAlign: 'center', backgroundColor: '#00f', padding: '5px 0', color: '#fff'}},
      b({}, 'Wire Settings:'),
      ' Color: (RGB) ',
      input({style: {width: 100, margin: '0 10px'}, ref: 'color', defaultValue: this.props.wireSettings.color}),
      ' Curvyness: (0 to 1) ',
      input({style: {width: 50, margin: '0 10px'}, ref: 'curvyness', defaultValue: this.props.wireSettings.curvyness}),
      button({onClick: this.update, style: {margin: '0 10px'}}, 'Update')
    );
  }
});
