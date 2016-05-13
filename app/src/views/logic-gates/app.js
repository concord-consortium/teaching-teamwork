var userController = require('../../controllers/shared/user'),
    logController = require('../../controllers/shared/log'),
    SidebarChatView = React.createFactory(require('../shared/sidebar-chat')),
    DemoControlView = React.createFactory(require('./demo-control')),
    div = React.DOM.div,
    h1 = React.DOM.h1,
    h2 = React.DOM.h2;

module.exports = React.createClass({
  displayName: 'AppView',

  getInitialState: function () {
    return {
      demo: window.location.search.indexOf('demo') !== -1,
      addedAllWires: false,
      addedAllChips: false,
      userBoardNumber: -1,
      users: {},
      currentBoard: 0,
      currentUser: null,
      currentGroup: null
    };
  },

  componentDidMount: function() {
    var activityName = 'pic',
        self = this;

    logController.init(activityName);
    userController.init(2, activityName, function(userBoardNumber) {
      var users = self.state.users,
          currentUser = userController.getUsername();

      userBoardNumber = parseInt(userBoardNumber, 10);
      users[userBoardNumber] = {
        name: currentUser
      };

      self.setState({
        userBoardNumber: userBoardNumber,
        users: users,
        currentUser: currentUser,
        currentGroup: userController.getGroupname(),
        currentBoard: userBoardNumber
      });

      userController.onGroupRefCreation(function() {
        //boardWatcher.startListeners();
        userController.getFirebaseGroupRef().child('users').on("value", function(snapshot) {
          var fbUsers = snapshot.val(),
              users = {};
          $.each(fbUsers, function (user) {
            users[parseInt(fbUsers[user].client)] = {
              name: user
            };
          });
          self.setState({users: users});
        });
      });
    });

    // start the simulator without the event logged if set to run at startup
    if (this.state.running) {
      this.run(true, true);
    }
  },

  toggleAllChipsAndWires: function () {
    this.setState({addedAllChipsAndWires: !this.state.addedAllChipsAndWires});
  },

  render: function () {
    return div({},
      h1({}, "Teaching Teamwork Logic Gates Activity"),
      this.state.currentUser ? h2({}, "Circuit " + (this.state.currentBoard + 1) + " (User: " + this.state.currentUser + ", Group: " + this.state.currentGroup + ")") : null,
      //WeGotItView({currentUser: this.state.currentUser, checkIfCircuitIsCorrect: this.checkIfCircuitIsCorrect}),
      div({id: 'logicapp'},
        this.state.demo ? DemoControlView({toggleAllChipsAndWires: this.toggleAllChipsAndWires, addedAllChipsAndWires: this.state.addedAllChipsAndWires}) : null,
        SidebarChatView({top: this.state.demo ? 75 : 0})
      )
    );
  }
});
