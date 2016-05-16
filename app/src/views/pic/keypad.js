var PinView = React.createFactory(require('../shared/pin')),
    ButtonView = React.createFactory(require('./button')),
    events = require('../shared/events'),
    text = React.DOM.text,
    g = React.DOM.g,
    rect = React.DOM.rect;

module.exports = React.createClass({
  displayName: 'KeypadView',

  componentWillMount: function () {
    this.props.component.addListener(this.keypadChanged);
  },

  componentWillUnmount: function () {
    this.props.component.removeListener(this.keypadChanged);
  },

  keypadChanged: function (keypad) {
    this.setState({pushedButton: keypad.pushedButton});
  },

  getInitialState: function () {
    return {
      pushedButton: this.props.component.pushedButton
    };
  },

  pushButton: function (button) {
    if (this.props.editable) {
      this.props.component.pushButton(button);
      this.setState({pushedButton: this.props.component.pushedButton});
      events.logEvent(events.PUSHED_BUTTON_EVENT, button, {board: this.props.component.board});
    }
  },

  render: function () {
    var p = this.props.component.position,
        pins = [],
        buttons = [],
        i, pin, button;

    for (i = 0; i < this.props.component.pins.length; i++) {
      pin = this.props.component.pins[i];
      pins.push(PinView({key: 'pin' + i, constants: this.props.constants, pin: pin, selected: this.props.selected, editable: this.props.editable, stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
      pins.push(text({key: 'label' + i, x: pin.label.x, y: pin.label.y, fontSize: pin.labelSize, fill: '#333', style: {textAnchor: pin.label.anchor}}, pin.label.text));
    }

    for (i = 0; i < this.props.component.buttons.length; i++) {
      button = this.props.component.buttons[i];
      buttons.push(ButtonView({key: i, constants: this.props.constants, button: button, selected: this.props.selected, editable: this.props.editable, pushed: button === this.state.pushedButton, pushButton: this.pushButton}));
    }

    return g({},
      rect({x: p.pad.x, y: p.pad.y, width: p.pad.width, height: p.pad.height, fill: '#333'}),
      pins,
      buttons
    );
  }
});
