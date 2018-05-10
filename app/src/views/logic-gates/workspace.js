var BoardView = React.createFactory(require('../shared/board')),
    SpacerView = React.createFactory(require('../shared/spacer')),
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

  interfaceOption: function (name) {
    return this.props.activity && this.props.activity.interface ? this.props.activity.interface[name] : false;
  },

  render: function () {
    var showBusLabels = this.interfaceOption('showBusLabels'),
        showProbe = this.interfaceOption('showProbe'),
        showInputAutoToggles = this.interfaceOption('showInputAutoToggles'),
        showGlobalIOWires = this.interfaceOption('showGlobalIOWires'),
        showBreadboardColors = this.interfaceOption('showBreadboardColors'),
        selectedConstants,
        spacersAndBoards, i, height;

    if (this.props.userBoardNumber == -1) {
      return div({id: 'workspace', style: {width: this.props.constants.WORKSPACE_WIDTH}});
    }
    else if (this.state.selectedBoard) {
      selectedConstants = this.props.constants.selectedConstants(true);
      return div({id: 'workspace', style: {width: this.props.constants.WORKSPACE_WIDTH, top: (this.props.constants.WORKSPACE_HEIGHT - selectedConstants.BOARD_HEIGHT) / 2}},
        BoardView({
          constants: this.props.constants,
          board: this.state.selectedBoard,
          editable: this.props.soloMode || (this.props.userBoardNumber === this.state.selectedBoard.number),
          selected: true,
          user: this.props.users[this.state.selectedBoard.number],
          logicChipDrawer: this.props.activity ? this.props.activity.boards[this.state.selectedBoard.number].logicChipDrawer : null,
          toggleBoard: this.props.soloMode || (this.props.userBoardNumber === this.state.selectedBoard.number) ? this.toggleBoard : null,
          toggleBoardButtonStyle: {marginTop: -35},
          showProbe: (showProbe == 'edit') || (showProbe == 'all'),
          showPinColors: this.props.showPinColors,
          showPinouts: this.props.showPinouts,
          showBusColors: this.props.showBusColors,
          stepping: true,
          forceRerender: this.props.forceRerender,
          soloMode: this.props.soloMode,
          showBusLabels: showBusLabels,
          showInputAutoToggles: showInputAutoToggles,
          showBreadboardColors: showBreadboardColors
        })
      );
    }
    else {
      selectedConstants = this.props.constants.selectedConstants(false);
      height = (this.props.boards.length * selectedConstants.BOARD_HEIGHT) + ((this.props.boards.length - 1) * this.props.constants.SPACER_HEIGHT);

      spacersAndBoards = [];
      for (i = 0; i < this.props.boards.length; i++) {
        if (i > 0) {
          spacersAndBoards.push(SpacerView({
            key: 'spacer' + i,
            constants: this.props.constants,
            connector: this.props.boards[i].connectors.input
          }));
        }
        spacersAndBoards.push(BoardView({
          key: 'board' + i,
          constants: this.props.constants,
          board: this.props.boards[i],
          editable: this.props.soloMode || (this.props.userBoardNumber === i),
          user: this.props.users[i],
          logicChipDrawer: this.props.activity ? this.props.activity.boards[i].logicChipDrawer : null,
          toggleBoard: this.props.soloMode || (this.props.userBoardNumber === i) ? this.toggleBoard : null,
          showPinColors: this.props.showPinColors,
          showPinouts: this.props.showPinouts,
          showBusColors: this.props.showBusColors,
          showProbe: showProbe == 'all',
          stepping: true,
          forceRerender: this.props.forceRerender,
          soloMode: this.props.soloMode,
          showBusLabels: showBusLabels,
          showInputAutoToggles: showInputAutoToggles
        }));
      }
      spacersAndBoards.push(BusView({
        key: 'bus' + i,
        constants: this.props.constants,
        boards: this.props.boards,
        height: height,
        inputSize: this.props.activity.busInputSize,
        outputSize: this.props.activity.busOutputSize,
        showGlobalIOWires: showGlobalIOWires
      }));

      return div({
        id: 'workspace',
        style: {
          width: this.props.constants.WORKSPACE_WIDTH,
          height: height
        }},
        spacersAndBoards
      );
    }
  }
});
