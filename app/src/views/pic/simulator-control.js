var button = React.DOM.button,
    div = React.DOM.div;
  
module.exports = React.createClass({
  displayName: 'SimulatorControlView',

  stop: function () {
    this.props.run(false);
  },

  run: function () {
    this.props.run(true);
  },

  step: function () {
    this.props.step();
  },

  reset: function () {
    this.props.reset();
  },

  render: function () {
    var controls = [];
    if (this.props.running) {
      controls.push(button({key: 'stop', onClick: this.stop}, 'Stop'));
    }
    else {
      controls.push(button({key: 'run', onClick: this.run}, 'Run'));
      controls.push(button({key: 'step', onClick: this.step}, 'Step'));
      controls.push(button({key: 'reset', onClick: this.reset}, 'Reset'));
    }

    return div({id: 'simulator-control'},
      div({id: 'simulator-control-title'}, 'Simulator'),
      div({id: 'simulator-control-area'}, controls)
    );
  }
});
