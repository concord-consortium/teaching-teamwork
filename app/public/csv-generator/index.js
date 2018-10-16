var div = React.DOM.div,
    strong = React.DOM.strong,
    input = React.DOM.input,
    link = React.DOM.a;

var component = function (options) {
  return React.createFactory(React.createClass(options));
};

var createCSV = function (input, unroll) {
  var columns = {};

  var getColumns = function (obj, parent, skipRecurse) {
    if (obj) {
      Object.keys(obj).forEach(function (key) {
        if (unroll && (typeof obj[key] === "object")) {
          if (!skipRecurse) {
            getColumns(obj[key], key);
          }
        }
        else if (key.length > 0) {
          columns[key] = parent;
        }
      });
    }
  };
  if (input.length > 0) {
    getColumns(input[0], null, true);
  }
  input.forEach(function (obj) {
    getColumns(obj, null);
  });
  var columnKeys = Object.keys(columns);

  var getColumnValue = function (obj, columnName, columnParent) {
    if (obj.hasOwnProperty(columnName)) {
      return obj[columnName];
    }
    else if (columnParent && obj.hasOwnProperty(columnParent) && obj[columnParent].hasOwnProperty(columnName)) {
      return obj[columnParent][columnName];
    }
    return "";
  };

  var rows = [];
  input.forEach(function (obj) {
    var row = {};
    columnKeys.forEach(function (key) {
      var value = getColumnValue(obj, key, columns[key]);
      row[key] = unroll ? value : JSON.stringify(value);
    });
    rows.push(row);
  });
  return rows;
};

var App = component({
  getInitialState: function () {
    return {
      file: null,
      teamPrefix: null,
      munging: false,
      csvOutput: null,
      unroll: true
    };
  },

  dragHover: function (e) {
    e.stopPropagation();
    e.preventDefault();
  },

  drop: function (e) {
    this.dragHover(e);

    var files = e.target.files || e.dataTransfer.files;
    var file = files[0];

    if (file) {
      if (file.name.match(/\.json$/i)) {
        this.setState({file: file, munging: true}, this.mungeFile.bind(this));
      }
      else {
        alert("The dropped file needs to be a JSON file (ie have a .json extension)");
      }
    }
  },

  handleUnrollChecked: function (e) {
    this.setState({unroll: e.target.checked});
  },

  renderDragDrop: function () {
    return (
      div(
        {id: "file-drag"},
        "Drop an exported \"log-puller\" JSON log file onto this page",
        div({id: "options"}, input({type: "checkbox", checked: this.state.unroll, onChange: this.handleUnrollChecked}), "Export all possible columns")
      )
    );
  },

  renderMunging: function () {
    return strong({}, "Creating the CSV...");
  },

  renderDownloadButton: function () {
    var blob = new Blob([this.state.csvOutput], {type: "text/csv"}),
        filename = this.state.file.name.replace(/\.json$/, "-generated.csv");
    return (
      div({},
        link({href: URL.createObjectURL(blob), download: filename},
          "Click here to download the CSV (" + filename + ")"
        ),
        div({style: {marginTop: 20, fontSize: 12, textAlign: "center"}}, "(reload the page to convert another file...)")
      )
    );
  },

  renderStep: function () {
    if (this.state.file === null) {
      return this.renderDragDrop();
    }
    if (this.state.munging) {
      return this.renderMunging();
    }
    return this.renderDownloadButton();
  },

  render: function () {
    return (
      div({id: "flex-container", onDragOver: this.dragHover, onDragLeave: this.dragHover, onDrop: this.drop},
        div({id: "flex-item"},
          this.renderStep()
        ),
        div({id: "top-nav"}, "CSV Generator")
      )
    );
  },

  mungeFile: function () {
    var self = this,
        reader = new FileReader();

    reader.onload = function() {
      try {
        var rows = createCSV(JSON.parse(reader.result), self.state.unroll);

        self.setState({
          munging: false,
          csvOutput:  Papa.unparse(rows)
        });
      }
      catch (ex) {
        alert(ex.toString());
      }
    };
    reader.readAsText(this.state.file);
  }
});

ReactDOM.render(App({}), document.getElementById("app"));
