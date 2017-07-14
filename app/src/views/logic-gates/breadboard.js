var g = React.DOM.g,
    circle = React.DOM.circle;

module.exports = React.createClass({
  displayName: 'BreadboardView',

  render: function () {
    var holes = this.props.breadboard.holes,
        holeViews = [];
    for (var i = 0; i < holes.length; i++) {
      var hole = holes[i],
          props = {cx: hole.dimensions.x, cy: hole.dimensions.y, r: hole.dimensions.size};
      props.visibility = 'hidden';
      props.key = "bb-hole-"+i;
      holeViews.push(circle(props));
    }

    return g({id: "breadboard"},
      holeViews
    );
  }
});
