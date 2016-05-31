var BoardView = React.createFactory(require('../shared/board')),
    RibbonView = React.createFactory(require('../shared/ribbon')),
    events = require('../shared/events'),
    div = React.DOM.div;

module.exports = React.createClass({
  displayName: 'WorkspaceView',

  getInitialState: function () {
    return {
      selectedBoard: null
    };
  },

  toggleBoard: function (board) {
    var previousBoard = this.state.selectedBoard,
        selectedBoard = board === this.state.selectedBoard ? null : board;
    this.setState({selectedBoard: selectedBoard});
    if (selectedBoard) {
      events.logEvent(events.OPENED_BOARD_EVENT, selectedBoard.number);
    }
    else {
      events.logEvent(events.CLOSED_BOARD_EVENT, previousBoard ? previousBoard.number : -1);
    }
  },

  componentWillReceiveProps: function (nextProps) {
    this.setState({selectedBoard: nextProps.boards[nextProps.userBoardNumber]});
  },

  render: function () {
    var selectedConstants;

    if (this.props.userBoardNumber == -1) {
      return div({id: 'workspace', style: {width: this.props.constants.WORKSPACE_WIDTH}});
    }
    else if (this.state.selectedBoard) {
      selectedConstants = this.props.constants.selectedConstants(true);
      return div({id: 'workspace', style: {width: this.props.constants.WORKSPACE_WIDTH, top: (this.props.constants.WORKSPACE_HEIGHT - selectedConstants.BOARD_HEIGHT) / 2}},
        RibbonView({
          constants: this.props.constants,
          connector: this.state.selectedBoard.connectors.input
        }),
        BoardView({
          constants: this.props.constants,
          board: this.state.selectedBoard,
          editable: this.props.userBoardNumber === this.state.selectedBoard.number,
          selected: true,
          user: this.props.users[this.state.selectedBoard.number],
          logicChipDrawer: this.props.activity ? this.props.activity.boards[this.props.userBoardNumber].logicChipDrawer : null,
          toggleBoard: this.props.userBoardNumber === this.state.selectedBoard.number ? this.toggleBoard : null,
          showProbe: true
        }),
        RibbonView({
          constants: this.props.constants,
          connector: this.state.selectedBoard.connectors.output
        })
      );
    }
    else {
      return div({id: 'workspace', style: {width: this.props.constants.WORKSPACE_WIDTH}},
        RibbonView({
          constants: this.props.constants,
          connector: this.props.boards[0].connectors.input
        }),
        BoardView({
          constants: this.props.constants,
          board: this.props.boards[0],
          editable: this.props.userBoardNumber === 0,
          user: this.props.users[0],
          logicChipDrawer: this.props.activity ? this.props.activity.boards[0].logicChipDrawer : null,
          toggleBoard: this.props.userBoardNumber === 0 ? this.toggleBoard : null
        }),
        RibbonView({
          constants: this.props.constants,
          connector: this.props.boards[0].connectors.output
        }),
        BoardView({
          constants: this.props.constants,
          board: this.props.boards[1],
          editable: this.props.userBoardNumber === 1,
          user: this.props.users[1],
          logicChipDrawer: this.props.activity ? this.props.activity.boards[1].logicChipDrawer : null,
          toggleBoard: this.props.userBoardNumber === 1 ? this.toggleBoard : null
        })
      );
    }
  }
});
