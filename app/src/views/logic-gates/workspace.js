var BoardView = React.createFactory(require('../shared/board')),
    RibbonView = React.createFactory(require('../shared/ribbon')),
    div = React.DOM.div;

module.exports = React.createClass({
  displayName: 'WorkspaceView',

  render: function () {
    return div({id: 'workspace', style: {width: this.props.constants.WORKSPACE_WIDTH}},
      BoardView({
        constants: this.props.constants,
        board: this.props.boards[0],
        editable: this.props.userBoardNumber === 0,
        selected: true,
        user: this.props.users[0],
        logicChipDrawer: {
          chips: [{type: '7408', max: 3}, {type: '7432', max: 2}]
        }
      }),
      RibbonView({
        constants: this.props.constants,
        connector: this.props.boards[0].connectors.output
      }),
      BoardView({
        constants: this.props.constants,
        board: this.props.boards[1],
        editable: this.props.userBoardNumber === 1,
        selected: true,
        user: this.props.users[1],
        logicChipDrawer: {
          chips: [{type: '7432', max: 2}]
        }
      })
    );
  }
});
