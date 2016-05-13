var div = React.DOM.div,
    constants = require('../../views/pic/constants');

module.exports = React.createClass({
  displayName: 'BoardEditorView',

  render: function () {
    var selectedConstants = constants.selectedConstants(true),
        style = {
          width: constants.WORKSPACE_WIDTH,
          top: selectedConstants.BOARD_HEIGHT + 28
        };

    return div({className: 'pic-info'},
      div({className: 'pic-info-title'}, 'Code'),
      div({className: 'pic-info-code-wrapper', style: style},
        div({className: 'pic-info-code'}, this.props.board.components.pic.code.asm)
      )
    );
  }
});
