var div = React.DOM.div;

module.exports = React.createClass({
  displayName: 'BoardEditorView',

  render: function () {
    var selectedConstants = this.props.constants.selectedConstants(true);

    return div({className: 'pic-info'},
      div({className: 'pic-info-title-wrapper', style: {width: this.props.constants.WORKSPACE_WIDTH}},
        div({className: 'pic-info-title'}, 'Code')
      ),
      div({className: 'pic-info-code-wrapper', style: {width: this.props.constants.WORKSPACE_WIDTH, top: selectedConstants.BOARD_HEIGHT + 28 }},
        div({className: 'pic-info-code'}, this.props.board.components.pic.code.asm)
      )
    );
  }
});
