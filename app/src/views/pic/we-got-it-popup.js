var div = React.DOM.div,
    h2 = React.DOM.h2,
    button = React.DOM.button;

module.exports = React.createClass({
  displayName: 'WeGotItPopupView',

  clicked: function () {
    this.props.hidePopup();
  },

  render: function () {
    var allCorrect = this.props.allCorrect;
    return div({id: "we-got-it-popup"},
      div({id: "we-got-it-popup-background"}),
      div({id: "we-got-it-popup-dialog-wrapper"},
        div({id: "we-got-it-popup-dialog"},
          h2({}, allCorrect ? "All the wires are correct!" : "Sorry, the circuit is not correctly wired."),
          div({}, allCorrect ? "Your circuit is correctly wired from the keypad to the LED." : "Your circuit is not correctly wired from the keypad to the LED."),
          button({onClick: this.clicked}, allCorrect ? "All Done!" : "Keep Trying..." )
        )
      )
    );
  }
});
