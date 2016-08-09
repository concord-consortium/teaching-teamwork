var BoardView = React.createFactory(require('../shared/board')),
    BoardEditorView = React.createFactory(require('./board-editor')),
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

  render: function () {
    if (this.state.selectedBoard) {
      return div({id: 'workspace'},
        BoardView({
          constants: this.props.constants,
          key: 'selectedBoard' + this.state.selectedBoard.number,
          board: this.state.selectedBoard,
          selected: true,
          editable: this.props.userBoardNumber === this.state.selectedBoard.number,
          user: this.props.users[this.state.selectedBoard.number],
          stepping: this.props.stepping,
          showPinColors: this.props.showPinColors,
          toggleBoard: this.toggleBoard,
          showProbe: true,
          wireSettings: this.props.wireSettings
        }),
        BoardEditorView({constants: this.props.constants, board: this.state.selectedBoard})
      );
    }
    else {
      return div({id: 'workspace', style: {width: this.props.constants.WORKSPACE_WIDTH}},
        BoardView({
          constants: this.props.constants,
          board: this.props.boards[0],
          editable: this.props.userBoardNumber === 0,
          user: this.props.users[0],
          stepping: this.props.stepping,
          showPinColors: this.props.showPinColors,
          toggleBoard: this.toggleBoard,
          showProbe: true,
          wireSettings: this.props.wireSettings
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
          stepping: this.props.stepping,
          showPinColors: this.props.showPinColors,
          toggleBoard: this.toggleBoard,
          showProbe: true,
          wireSettings: this.props.wireSettings
        }),
        RibbonView({
          constants: this.props.constants,
          connector: this.props.boards[1].connectors.output
        }),
        BoardView({
          constants: this.props.constants,
          board: this.props.boards[2],
          editable: this.props.userBoardNumber === 2,
          user: this.props.users[2],
          stepping: this.props.stepping,
          showPinColors: this.props.showPinColors,
          toggleBoard: this.toggleBoard,
          showProbe: true,
          wireSettings: this.props.wireSettings
        })
      );
    }
  }
});
