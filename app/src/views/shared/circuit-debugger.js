var div = React.DOM.div,
    table = React.DOM.table,
    thead = React.DOM.thead,
    tbody = React.DOM.tbody,
    tr = React.DOM.tr,
    td = React.DOM.td,
    th = React.DOM.th;

module.exports = React.createClass({
  displayName: 'CircuitDebugger',

  render: function() {
    var circuitResolver = this.props.circuitResolver;
    if (!circuitResolver || (circuitResolver.circuits.length === 0)) {
      return null;
    }

    return div({className: "circuit-debugger"},
      div({className: "circuit-debugger-inner"},
        table({},
          thead({},
            tr({},
              th({}, "#"),
              th({}, "Inputs"),
              th({}, "Outputs")
            )
          ),
          tbody({},
            circuitResolver.circuits.map(function (circuit) {
              return tr({key: circuit.id},
                td({}, circuit.id),
                td({}, circuit.inputs.map(function (input) { return input.toString(); }).join(", ")),
                td({}, circuit.outputs.map(function (input) { return input.toString(); }).join(", "))
              );
            })
          )
        )
      )
    );
  }
});
