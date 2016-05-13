var BoardView = React.createFactory(require('./board')),
    RibbonView = React.createFactory(require('./ribbon')),
    constants = require('./constants'),
    div = React.DOM.div;

module.exports = React.createClass({
  displayName: 'WorkspaceView',

  getInitialState: function () {
    return {};
  },

  render: function () {
    return div({id: 'workspace', style: {width: constants.WORKSPACE_WIDTH}},
      BoardView({
        board: this.props.boards[0],
        editable: this.props.userBoardNumber === 0,
        user: this.props.users[0]
      }),
      RibbonView({connector: this.props.boards[0].connectors.output}),
      BoardView({
        board: this.props.boards[1],
        editable: this.props.userBoardNumber === 1,
        user: this.props.users[1]
      })
    );
  }
});
