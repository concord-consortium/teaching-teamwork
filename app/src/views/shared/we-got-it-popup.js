var div = React.DOM.div,
    h2 = React.DOM.h2,
    table = React.DOM.table,
    thead = React.DOM.thead,
    tbody = React.DOM.tbody,
    tr = React.DOM.tr,
    th = React.DOM.th,
    td = React.DOM.td,
    span = React.DOM.span,
    logController = require('../../controllers/shared/log'),
    button = React.DOM.button;

module.exports = React.createClass({
  displayName: 'WeGotItPopupView',

  clicked: function () {
    logController.logEvent("Submit close button clicked", this.props.allCorrect ? 'done' : 'resume');
    this.props.hidePopup();
  },

  haveTruthTable: function () {
    return ((this.props.truthTable || []).length > 0) && this.props.activity;
  },

  renderTruthTable: function () {
    var truthTable = this.props.truthTable || [],
        activity = this.props.activity,
        inputLabels = activity ? activity.busInputLabels : [],
        outputLabels = activity ? activity.busOutputLabels : [],
        correctTruthTable = activity ? activity.truthTable : null,
        inputLength = 0,
        outputLength = 0,
        rows = [],
        labelRow = null,
        labelRowItems = [];

    if ((truthTable.length === 0) || !activity) {
      return null;
    }

    truthTable.forEach(function (entry, rowIndex) {
      entry.input.forEach(function (input) {
        var cells = [];
        input.forEach(function (x) { cells.push(td({key: cells.length}, x ? 1 : 0)); });
        entry.output.forEach(function (x, columnIndex) {
          var logicValue = x ? 1 : 0;
          var correct = correctTruthTable && correctTruthTable[rowIndex] && correctTruthTable[rowIndex][1] ? correctTruthTable[rowIndex][1][columnIndex] == logicValue : true;
          cells.push(td({key: cells.length}, correct ? span({className: "correct"}, "✔") : span({className: "incorrect"}, "✘")));
        });
        rows.push(tr({key: rows.length}, cells));
        inputLength = Math.max(inputLength, input.length);
        outputLength = Math.max(outputLength, entry.output.length);
      });
    });

    if (inputLabels && outputLabels) {
      var addLabel = function (label) {labelRowItems.push(th({key: labelRowItems.length}, label)); };
      inputLabels.forEach(addLabel);
      outputLabels.forEach(addLabel);
      labelRow = tr({}, labelRowItems);
    }

    return (
      div({},
        table({className: "truth-table"},
          thead({},
            tr({},
              th({colSpan: inputLength}, "Input"),
              th({colSpan: outputLength}, "Output")
            ),
            labelRow
          ),
          tbody({}, rows)
        )
      )
    );
  },

  render: function () {
    var allCorrect = this.props.allCorrect;

    return div({id: "we-got-it-popup"},
      div({id: "we-got-it-popup-background"}),
      div({id: "we-got-it-popup-dialog-wrapper"},
        div({id: "we-got-it-popup-dialog"},
          h2({}, allCorrect ? "All the wires are correct!" : "Sorry, the circuit is not correctly wired."),
          div({}, allCorrect ? "Your circuit is correctly wired." : (this.haveTruthTable() ? "Fix the outputs with ✘ marks in the truth table below..." : "Your circuit is not correctly wired.")),
          this.renderTruthTable(),
          button({onClick: this.clicked}, allCorrect ? "All Done!" : "Keep Trying..." )
        )
      )
    );
  }
});
