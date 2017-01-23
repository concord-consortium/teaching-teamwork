var table = React.DOM.table,
    thead = React.DOM.thead,
    tbody = React.DOM.tbody,
    tr = React.DOM.tr,
    td = React.DOM.td;

module.exports = React.createClass({
  displayName: 'Report',

  render: function() {
    return table({className: "report"},
      thead({}),
      tbody({},
        tr({},
          td({}, 'Thanks for using Teaching Teamwork!')
        )
      )
    );
  }
});
