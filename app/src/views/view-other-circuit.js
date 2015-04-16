var userController       = require('../controllers/user'),
    WorkbenchAdaptor     = require('../data/workbenchAdaptor'),
    forceWiresToBlueHack = require('../hacks/forceWiresToBlue');

module.exports = React.createClass({

  displayName: 'ViewOtherCircuit',

  shouldComponentUpdate: function () {
    return false;
  },

  render: function () {
    return React.DOM.div({},
      React.DOM.div({style: {position: 'absolute'}}, 'Loading...'),
      React.DOM.div({id: "breadboard-wrapper"}),
      // add a click absorber
      React.DOM.div({style: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0}})
    );
  },

  componentDidMount: function () {
    var initialDraw = true,
        redraw;
    
    redraw = function (circuit) {
      var i, ii, comp;
      
      if (!circuit) {
        return;
      }
      
      sparks.workbenchController.breadboardController.clear();
      for (i = 0, ii = circuit.length; i < ii; i++) {
        comp = circuit[i];
        sparks.workbenchController.breadboardController.insertComponent(comp.type, comp);          
      }
      
      // HACK: force all wires to blue
      forceWiresToBlueHack();
    };
    
    // listen for workbench load requests
    window.addEventListener("message", function (event) {
      var payload,
          clientNumber,
          workbenchAdaptor,
          workbench,
          redrawTimeout;

      if (event.origin == window.location.origin) {
        payload = JSON.parse(event.data);
        
        clientNumber = payload.circuit - 1;
        
        workbenchAdaptor = new WorkbenchAdaptor(clientNumber);
        workbench = workbenchAdaptor.processTTWorkbench(payload.ttWorkbench);
        try {
          sparks.createWorkbench(workbench, "breadboard-wrapper");
        }
        catch (e) {
        }
        
        userController.createFirebaseGroupRef(payload.activityName, payload.groupName);
        userController.getFirebaseGroupRef().child('clients').child(clientNumber).on('value', function(snapshot) {
          if (initialDraw) {
            redraw(snapshot.val());
          }
          else {
            clearTimeout(redrawTimeout);
            redrawTimeout = setTimeout(function () {
              redraw(snapshot.val());
            }, 500);
          }
        });

        // tell the parent that we are loaded after we redraw
        if (payload.loadMessage) {
          setTimeout(function () {
            parent.postMessage(payload.loadMessage, '*');
          }, 10);
        }
      }
    }, false);
  }
});






