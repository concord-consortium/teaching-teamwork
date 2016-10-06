var div = React.DOM.div,
    button = React.DOM.button;

module.exports = React.createClass({
  displayName: 'Alert',

  render: function() {
    return div({className: "alert-wrapper"},
      div({className: 'alert-background'}),
      div({className: "alert-window-wrapper"},
        div({className: "alert-window"},
          div({className: "alert-message"}, this.props.message),
          div({className: "alert-button-wrapper"},
            button({onClick: this.props.onClose}, 'Ok')
          )
        )
      )
    );
  }
});
