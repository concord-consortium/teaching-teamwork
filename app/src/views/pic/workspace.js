var BoardView = React.createFactory(require('../shared/board')),
    BoardEditorView = React.createFactory(require('./board-editor')),
    SpacerView = React.createFactory(require('../shared/spacer')),
    BusView = React.createFactory(require('../shared/bus')),
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

  render: function () {
    var editable, selectedConstants;
    if (this.state.selectedBoard) {
      editable = this.props.soloMode || (this.props.userBoardNumber === this.state.selectedBoard.number);
      selectedConstants = this.props.constants.selectedConstants(true);
      return div({id: 'workspace'},
        editable ? null : div({style: {height: (this.props.constants.WORKSPACE_HEIGHT - selectedConstants.BOARD_HEIGHT) / 2}}), // this centers the BoardView below
        BoardView({
          constants: this.props.constants,
          key: 'selectedBoard' + this.state.selectedBoard.number,
          board: this.state.selectedBoard,
          selected: true,
          editable: editable,
          user: this.props.users[this.state.selectedBoard.number],
          stepping: this.props.stepping,
          showPinColors: this.props.showPinColors,
          showBusColors: this.props.showBusColors,
          toggleBoard: this.toggleBoard,
          showProbe: (this.props.showProbe == 'edit') || (this.props.showProbe == 'all'),
          wireSettings: this.props.wireSettings,
          forceRerender: this.props.forceRerender,
          soloMode: this.props.soloMode,
          showBusLabels: this.props.showBusLabels,
          showInputAutoToggles: this.props.showInputAutoToggles
        }),
        editable ? BoardEditorView({constants: this.props.constants, board: this.state.selectedBoard}) : null
      );
    }
    else {
      return div({id: 'workspace', style: {width: this.props.constants.WORKSPACE_WIDTH}},
        BoardView({
          constants: this.props.constants,
          board: this.props.boards[0],
          editable: this.props.soloMode || (this.props.userBoardNumber === 0),
          user: this.props.users[0],
          stepping: this.props.stepping,
          showPinColors: this.props.showPinColors,
          showBusColors: this.props.showBusColors,
          toggleBoard: this.toggleBoard,
          showProbe: this.props.showProbe == 'all',
          wireSettings: this.props.wireSettings,
          forceRerender: this.props.forceRerender,
          soloMode: this.props.soloMode,
          showBusLabels: this.props.showBusLabels,
          showInputAutoToggles: this.props.showInputAutoToggles
        }),
        SpacerView({
          constants: this.props.constants
        }),
        BoardView({
          constants: this.props.constants,
          board: this.props.boards[1],
          editable: this.props.soloMode || (this.props.userBoardNumber === 1),
          user: this.props.users[1],
          stepping: this.props.stepping,
          showPinColors: this.props.showPinColors,
          showBusColors: this.props.showBusColors,
          toggleBoard: this.toggleBoard,
          showProbe: this.props.showProbe == 'all',
          wireSettings: this.props.wireSettings,
          forceRerender: this.props.forceRerender,
          soloMode: this.props.soloMode,
          showBusLabels: this.props.showBusLabels,
          showInputAutoToggles: this.props.showInputAutoToggles
        }),
        SpacerView({
          constants: this.props.constants
        }),
        BoardView({
          constants: this.props.constants,
          board: this.props.boards[2],
          editable: this.props.soloMode || (this.props.userBoardNumber === 2),
          user: this.props.users[2],
          stepping: this.props.stepping,
          showPinColors: this.props.showPinColors,
          showBusColors: this.props.showBusColors,
          toggleBoard: this.toggleBoard,
          showProbe: this.props.showProbe == 'all',
          wireSettings: this.props.wireSettings,
          forceRerender: this.props.forceRerender,
          soloMode: this.props.soloMode,
          showBusLabels: this.props.showBusLabels,
          showInputAutoToggles: this.props.showInputAutoToggles
        }),
        BusView({
          constants: this.props.constants,
          boards: [this.props.boards[0], this.props.boards[1], this.props.boards[2]]
        })
      );
    }
  }
});
