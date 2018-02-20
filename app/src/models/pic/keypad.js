var KeypadView = React.createFactory(require('../../views/pic/keypad')),
    Pin = require('../shared/pin'),
    TTL = require('../shared/ttl'),
    Button = require('./button'),
    layout = require('../../views/shared/layout');

var Keypad = function () {
  var i, pin, button, values;

  this.name = 'keypad';
  this.view = KeypadView;

  this.pushedButton = null;

  this.pins = [];
  this.pinMap = {};
  for (i = 0; i < 7; i++) {
    pin = {
      number: i,
      inputMode: i > 2,
      placement: i < 3 ? 'top' : 'right',
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      labelSize: 0,
      component: this,
      bezierReflection: 1
    };
    pin.label = {
      x: 0,
      y: 0,
      anchor: 'end',
      //text: ['RB0', 'RB1', 'RB2', 'RB3', 'RB4', 'RB5', 'RB6'][i]
      text: ['COL0', 'COL1', 'COL2', 'ROW0', 'ROW1', 'ROW2', 'ROW3'][i],
      color: '#000'
    };
    pin = new Pin(pin);
    this.pins.push(pin);
    this.pinMap[pin.label.text] = pin;
  }

  values = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  this.buttons = [];
  for (i = 0; i < 12; i++) {
    button = {
      value: values[i],
      intValue: parseInt(values[i]),
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      labelSize: 0,
      component: this
    };
    button.label = {
      x: 0,
      y: 0,
      anchor: 'middle',
      text: values[i],
    };
    this.buttons.push(new Button(button));
  }
  this.bottomButtonValues = [this.buttons[9].value, this.buttons[10].value, this.buttons[11].value];

  this.listeners = [];
};
Keypad.prototype.calculatePosition = function (constants, selected, index, count) {
  var selectedConstants = constants.selectedConstants(selected),
      padWidth, padHeight, i, pin, j, button, buttonWidth, buttonHeight, buttonDX, buttonDY;

  this.position = layout.calculateComponentRect(constants, selected, index, count, selectedConstants.COMPONENT_WIDTH * 1.5, selectedConstants.COMPONENT_HEIGHT * 1.5);

  padWidth = this.position.width * 0.8;
  padHeight = this.position.height * 0.9;

  this.position.pad = {
    x: this.position.x + ((this.position.width - padWidth) / 2),
    y: this.position.y + ((this.position.height - padHeight) / 2) + 5,
    width: padWidth,
    height: padHeight
  };

  // buttons
  buttonWidth = padWidth / 5;
  buttonHeight = buttonWidth;
  buttonDX = (padWidth - (buttonWidth * 3)) / 4;
  buttonDY = (padHeight - (buttonHeight * 4)) / 5;

  for (i = 0; i < 3; i++) {
    for (j = 0; j < 4; j++) {
      button = this.buttons[(j * 3) + i];
      button.x = this.position.pad.x + buttonDX + (i * (buttonWidth + buttonDX));
      button.y = this.position.pad.y + buttonDY + (j * (buttonHeight + buttonDY));
      button.cx = button.x + (buttonWidth / 2);
      button.cy = button.y + (buttonHeight / 2);
      button.height = buttonWidth;
      button.width = buttonHeight;
      button.labelSize = selectedConstants.BUTTON_FONT_SIZE;
      button.label.x = (button.x + (buttonWidth / 2));
      button.label.y = (button.y + ((buttonHeight + selectedConstants.BUTTON_FONT_SIZE) / 2.25));
    }
  }

  // upper pins
  for (i = 0; i < 3; i++) {
    pin = this.pins[i];
    pin.x = this.buttons[i].cx - (selectedConstants.PIN_WIDTH / 2);
    pin.y = this.position.pad.y - selectedConstants.PIN_HEIGHT;
    pin.label.x = pin.x + (selectedConstants.PIN_WIDTH / 2);
    pin.label.y = this.position.pad.y - (1.5 * selectedConstants.PIC_FONT_SIZE);
    pin.label.anchor = 'middle';
  }

  // right side pins
  for (i = 3; i < this.pins.length; i++) {
    pin = this.pins[i];
    pin.x = this.position.pad.x + this.position.pad.width;
    pin.y = this.buttons[(i - 3) * 3].cy - (selectedConstants.PIN_HEIGHT / 2);
    pin.label.x = pin.x + (1.5  * selectedConstants.PIN_WIDTH);
    pin.label.y = pin.y + ((selectedConstants.PIN_HEIGHT + selectedConstants.PIC_FONT_SIZE) / 2.25);
    pin.label.anchor = 'start';
  }

  // update all pins
  for (i = 0; i < this.pins.length; i++) {
    pin = this.pins[i];
    pin.cx = pin.x + (selectedConstants.PIN_WIDTH / 2);
    pin.cy = pin.y + (selectedConstants.PIN_HEIGHT / 2);
    pin.width = selectedConstants.PIN_WIDTH;
    pin.height = selectedConstants.PIN_HEIGHT;
    pin.labelSize = selectedConstants.PIC_FONT_SIZE;
  }
};
Keypad.prototype.addListener = function (listener) {
  this.listeners.push(listener);
};
Keypad.prototype.removeListener = function (listener) {
  this.listeners.splice(this.listeners.indexOf(listener), 1);
};
Keypad.prototype.notify = function () {
  var i;
  for (i = 0; i < this.listeners.length; i++) {
    this.listeners[i](this);
  }
};
Keypad.prototype.reset = function () {
};
Keypad.prototype.pushButton = function (button, skipNotify) {
  this.pushedButton = button;
  if (!skipNotify) {
    this.notify();
  }
};
Keypad.prototype.selectButtonValue = function (value, skipNotify) {
  var self = this;
  $.each(this.buttons, function (index, button) {
    if (button.value == value) {
      self.pushButton(button, skipNotify);
      return false;
    }
  });
};
Keypad.prototype.getPushedButtonValue = function () {
  return this.pushedButton ? this.pushedButton.value : null;
};
Keypad.prototype.resolveOutputVoltages = function () {
  var colValue = 7,
      intValue, bottomButtonIndex;

  if (this.pushedButton) {
    intValue = this.pushedButton.intValue;
    bottomButtonIndex = this.bottomButtonValues.indexOf(this.pushedButton.value);

    if (this.pinMap.ROW0.powered && this.pinMap.ROW0.isLow() && ((intValue >= 1) && (intValue <= 3))) {
      colValue = colValue & ~(1 << (intValue - 1));
    }
    else if (this.pinMap.ROW1.powered && this.pinMap.ROW1.isLow() && ((intValue >= 4) && (intValue <= 6))) {
      colValue = colValue & ~(1 << (intValue - 4));
    }
    else if (this.pinMap.ROW2.powered && this.pinMap.ROW2.isLow() && ((intValue >= 7) && (intValue <= 9))) {
      colValue = colValue & ~(1 << (intValue - 7));
    }
    else if (this.pinMap.ROW3.powered && this.pinMap.ROW3.isLow() && (bottomButtonIndex !== -1)) {
      colValue = colValue & ~(1 << bottomButtonIndex);
    }
  }

  this.pinMap.COL0.setVoltage(TTL.getBooleanVoltage(colValue & 1));
  this.pinMap.COL1.setVoltage(TTL.getBooleanVoltage(colValue & 2));
  this.pinMap.COL2.setVoltage(TTL.getBooleanVoltage(colValue & 4));
};

module.exports = Keypad;
