var userController       = require('../controllers/user'),
    WorkbenchAdaptor     = require('../data/workbenchAdaptor'),
    WorkbenchFBConnector = require('../data/workbenchFBConnector'),
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
      React.DOM.div({id: "userLabel", style: {position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#777', opacity: 0.75, color: '#fff', textAlign: 'center', height: 70, fontSize: 48, padding: 10, fontWeight: 'bold'}}),
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

      for (i = 0, ii = circuit.length; i < ii; i++) {
        comp = circuit[i];
        sparks.workbenchController.breadboardController.remove(comp.type, comp.connections);
        sparks.workbenchController.breadboardController.insertComponent(comp.type, comp);
      }

      // HACK: force all wires to blue
      forceWiresToBlueHack();

      initialDraw = false;
    };

    // listen for workbench load requests
    window.addEventListener("message", function (event) {
      var dialStates = {},
          i,
          model,
          payload,
          clientNumber,
          workbenchAdaptor,
          workbench,
          redrawTimeout,
          multimeter,
          dmm,
          waitForLoad,
          moveProbe,
          workbenchFBConnector;

      if (event.origin == window.location.origin) {
        payload = JSON.parse(event.data);

        clientNumber = payload.circuit - 1;

        workbenchAdaptor = new WorkbenchAdaptor(clientNumber);
        workbenchFBConnector = new WorkbenchFBConnector(userController, clientNumber, workbenchAdaptor);
        workbench = workbenchAdaptor.processTTWorkbench(payload.ttWorkbench);
        try {
          sparks.createWorkbench(workbench, "breadboard-wrapper");
        }
        catch (e) {
        }

        // get the dmm and find the dial angles once it loads
        waitForLoad = function () {
          var leadForHole;

          if (sparks.workbenchController && sparks.workbenchController.breadboardView && sparks.workbenchController.breadboardView.multimeter) {
            multimeter = sparks.workbenchController.breadboardView.multimeter;
            dmm = sparks.workbenchController.workbench.meter.dmm;

            // get the dial angles
            for (i = 0; i < 360; i++) {
              model = multimeter.mmbox.model(i);
              if (model && model.length === 2 && !dialStates.hasOwnProperty(model[1])) {
                dialStates[model[1]] = model;
              }
            }

            // listen for circuit changes
            userController.createFirebaseGroupRef(payload.activityName, payload.groupName);
            userController.getFirebaseGroupRef().child('clients').child(clientNumber).on('value', function(snapshot) {
              var data = snapshot.val();

              if (data) {
                if (initialDraw) {
                  redraw(data);
                }
                else {
                  clearTimeout(redrawTimeout);
                  redrawTimeout = setTimeout(function () {
                    redraw(data);
                  }, 500);
                }
              }
            });

            // find the lead for a hole
            leadForHole = function (hole) {
              var itemsList = sparks.workbenchController.breadboardView.itemslist,
                  i, j, lead;
              for (i = itemsList.length; i--; ) {
                for (j = itemsList[i].leads.length; j--; ) {
                  lead = itemsList[i].leads[j];
                  if (lead.hole == hole) {
                    return lead;
                  }
                }
              }
              return false;
            };

            moveProbe = function (color, hole) {
              var lead = leadForHole(hole);
              if (multimeter.probe[color].lead != lead) {
                multimeter.probe[color].setState(lead);
              }
            };

            // listen for meter changes
            userController.getFirebaseGroupRef().child('meters').child(clientNumber).on('value', function (snapshot) {
              var data = snapshot.val();

              if (data) {
                // set the probes
                if (data.probes) {
                  if (data.probes.black) {
                    moveProbe('black', data.probes.black);
                  }
                  if (data.probes.red) {
                    moveProbe('red', data.probes.red);
                  }
                }

                // set the DMM
                if (data.DMM) {
                  if (dialStates[data.DMM]) {
                    multimeter.mmbox.setState(dialStates[data.DMM]);
                  }
                }
              }
            });

            // listen for user changes
            userController.getFirebaseGroupRef().child('users').on('value', function (snapshot) {
              var data = snapshot.val(),
                  username = "",
                  key;

              if (data) {
                for (key in data) {
                  if (data.hasOwnProperty(key)) {
                    if (data[key].client == clientNumber) {
                      username = key;
                      break;
                    }
                  }
                }
              }

              $("#userLabel").html(username).css({backgroundColor: ['#f00', '#0f0', '#00f'][clientNumber % 3]});
            });

          }
          else {
            setTimeout(waitForLoad, 100);
          }
        };
        waitForLoad();

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






