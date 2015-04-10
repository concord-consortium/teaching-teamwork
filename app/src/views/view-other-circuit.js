var WorkbenchAdaptor = require('../data/workbenchAdaptor');

module.exports = React.createClass({

  displayName: 'ViewOtherCircuit',

  shouldComponentUpdate: function () {
    return false;
  },

  render: function () {
    return React.DOM.div({id: "breadboard-wrapper"});
  },

  componentDidMount: function () {
    // load blank workbench
    try {
      sparks.createWorkbench({"circuit": []}, "breadboard-wrapper");
    }
    catch (e) {
    }

    // listen for workbench load requests
    window.addEventListener("message", function (event) {
      var payload,
          workbenchAdaptor,
          workbench;

      if (event.origin == window.location.origin) {
        payload = JSON.parse(event.data);
        workbenchAdaptor = new WorkbenchAdaptor(payload.circuit - 1);
        workbench = workbenchAdaptor.processTTWorkbench(payload.ttWorkbench);
        workbench.showComponentEditor = false;
        workbench.show_multimeter = false;
        try {
          sparks.createWorkbench(workbench, "breadboard-wrapper");
        }
        catch (e) {
        }
      }
    }, false);
  }
});






