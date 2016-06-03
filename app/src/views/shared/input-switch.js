var g = React.DOM.g,
    circle = React.DOM.circle;

module.exports = React.createClass({
  displayName: 'InputSwitchView',

  getInitialState: function () {
    return {
      value: 0
    };
  },

  toggle: function (e) {
    var value = this.state.value ? 0 : 1;
    e.preventDefault();
    e.stopPropagation();
    this.setState({value: value});
    this.props.hole.setValue(value);
  },

  render: function () {
    return g({},
      circle({cx: this.props.hole.cx, cy: this.props.constants.INPUT_SWITCHES_HEIGHT / 2, r: this.props.hole.radius, fill: this.state.value ? '#0f0' : '#f00', onClick: this.props.selected && this.props.editable ? this.toggle : null})
    );
  }
});
