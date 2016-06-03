var WeGotItPopupView = React.createFactory(require('./we-got-it-popup')),
    userController = require('../../controllers/shared/user'),
    logController = require('../../controllers/shared/log'),
    div = React.DOM.div,
    button = React.DOM.button;

module.exports = React.createClass({
  displayName: 'WeGotItView',

  getInitialState: function () {
    return {
      showPopup: false,
      allCorrect: false
    };
  },

  componentWillMount: function () {
    var self = this;

    userController.onGroupRefCreation(function() {
      self.submitRef = userController.getFirebaseGroupRef().child("submitted");
      self.submitRef.on("value", function(dataSnapshot) {
        var submitValue = dataSnapshot.val(),
            skew = userController.getServerSkew(),
            now = (new Date().getTime()) + skew;

        // ignore submits over 10 seconds old
        if (!submitValue || (submitValue.at < now - (10 * 1000))) {
          return;
        }

        self.props.checkIfCircuitIsCorrect(function (allCorrect) {
          self.setState({showPopup: true, allCorrect: allCorrect});
        });
      });
    });
  },

  componentWillUnmount: function() {
    this.submitRef.off();
  },

  hidePopup: function () {
    this.setState({showPopup: false});
  },

  clicked: function (e) {
    var username = userController.getUsername();

    e.preventDefault();

    logController.logEvent("Submit clicked", username);

    this.submitRef.set({
      user: username,
      at: Firebase.ServerValue.TIMESTAMP
    });
  },

  render: function () {
    if (this.props.currentUser) {
      return div({id: "we-got-it"},
        button({onClick: this.clicked}, "We got it!"),
        this.state.showPopup ? WeGotItPopupView({allCorrect: this.state.allCorrect, hidePopup: this.hidePopup}) : null
      );
    }
    else {
      return null;
    }
  }
});
