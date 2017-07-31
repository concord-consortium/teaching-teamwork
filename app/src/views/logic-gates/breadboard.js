var g = React.DOM.g,
    BreadboardHoleView = React.createFactory(require('./breadboard-hole'));

module.exports = React.createClass({
  displayName: 'BreadboardView',

  render: function () {
    var holes = this.props.breadboard.holes,
        holeViews = [];
    for (var i = 0; i < holes.length; i++) {
      holeViews.push(BreadboardHoleView({hole: holes[i], drawConnection: this.props.drawConnection,
        reportHover: this.props.reportHover, key: "breadboard-hole-"+i}));
    }

    return g({id: "breadboard"},
      holeViews
    );
  }
});
