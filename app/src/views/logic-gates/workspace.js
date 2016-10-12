var BoardView = React.createFactory(require('../shared/board')),
    RibbonView = React.createFactory(require('../shared/ribbon')),
    BusView = React.createFactory(require('../shared/bus')),
    events = require('../shared/events'),
    div = React.DOM.div;

module.exports = React.createClass({
  displayName: 'WorkspaceView',

  getInitialState: function () {
    return {
      selectedBoard: null,
      userBoardNumber: -1
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
    // show only the board when the user selects a board at the start
    if (this.state.userBoardNumber != nextProps.userBoardNumber) {
      this.setState({
        userBoardNumber: nextProps.userBoardNumber,
        selectedBoard: this.props.soloMode ? null : nextProps.boards[nextProps.userBoardNumber]
      });
    }
  },

  render: function () {
    var selectedConstants,
        ribbonsAndBoards, i;

    if (this.props.userBoardNumber == -1) {
      return div({id: 'workspace', style: {width: this.props.constants.WORKSPACE_WIDTH}});
    }
    else if (this.state.selectedBoard) {
      selectedConstants = this.props.constants.selectedConstants(true);
      return div({id: 'workspace', style: {width: this.props.constants.WORKSPACE_WIDTH, top: (this.props.constants.WORKSPACE_HEIGHT - selectedConstants.BOARD_HEIGHT) / 2}},
        RibbonView({
          constants: this.props.constants,
          connector: this.state.selectedBoard.connectors.input,
          selected: true
        }),
        BoardView({
          constants: this.props.constants,
          board: this.state.selectedBoard,
          editable: this.props.soloMode || (this.props.userBoardNumber === this.state.selectedBoard.number),
          selected: true,
          user: this.props.users[this.state.selectedBoard.number],
          logicChipDrawer: this.props.activity ? this.props.activity.boards[this.props.userBoardNumber].logicChipDrawer : null,
          toggleBoard: this.props.soloMode || (this.props.userBoardNumber === this.state.selectedBoard.number) ? this.toggleBoard : null,
          toggleBoardButtonStyle: {marginTop: -35},
          showProbe: true,
          showPinColors: this.props.showPinColors,
          showPinouts: this.props.showPinouts,
          stepping: true,
          forceRerender: this.props.forceRerender,
          soloMode: this.props.soloMode
        }),
        RibbonView({
          constants: this.props.constants,
          connector: this.state.selectedBoard.connectors.output,
          selected: true
        })
      );
    }
    else {
      selectedConstants = this.props.constants.selectedConstants(false);
      ribbonsAndBoards = [];
      for (i = 0; i < this.props.boards.length; i++) {
        ribbonsAndBoards.push(RibbonView({
          constants: this.props.constants,
          connector: this.props.boards[i].connectors.input
        }));
        ribbonsAndBoards.push(BoardView({
          constants: this.props.constants,
          board: this.props.boards[i],
          editable: this.props.soloMode || (this.props.userBoardNumber === i),
          user: this.props.users[i],
          logicChipDrawer: this.props.activity ? this.props.activity.boards[i].logicChipDrawer : null,
          toggleBoard: this.props.soloMode || (this.props.userBoardNumber === i) ? this.toggleBoard : null,
          showPinColors: this.props.showPinColors,
          showPinouts: this.props.showPinouts,
          stepping: true,
          forceRerender: this.props.forceRerender,
          soloMode: this.props.soloMode
        }));
      }
      ribbonsAndBoards.push(BusView({
        constants: this.props.constants,
        boards: this.props.boards,
        hasTopRibbon : true
      }));
      return div({id: 'workspace', style: {width: this.props.constants.WORKSPACE_WIDTH, height: (this.props.boards.length * (selectedConstants.BOARD_HEIGHT + this.props.constants.RIBBON_HEIGHT)) + 20}}, ribbonsAndBoards);
    }
  }
});
