var path = React.DOM.path,
    events = require('../shared/events'),
    colors = require('./colors');

module.exports = React.createClass({
  displayName: 'ConnectorSelectorView',

  handleClick: function () {
    this.props.connector.autoToggleSwitches(this.props.direction);
    this.props.connector.board.resolver.resolve(true);
    this.props.forceRerender();
    events.logEvent(events.AUTO_TOGGLED_SWITCHES_EVENT, this.props.direction, {board: this.props.connector.board});
  },

  render: function () {
    var halfWidth = this.props.width / 2,
        halfHeight = this.props.height / 2,
        positive = this.props.direction == 'positive',
        dx = positive ? -1 : 1;

    return path({
      d: ["M", this.props.cx + (halfWidth * dx), " ", this.props.cy - halfHeight, " l", (halfWidth * -dx), " ", halfHeight, " l", halfWidth * dx, " ", halfHeight + " z"].join(""),
      fill: colors.inputSelector,
      onClick: this.props.editable ? this.handleClick : null
    });
  }
});
