var userController       = require('../../controllers/shared/user'),
    WorkbenchAdaptor     = require('../../data/shared/workbenchAdaptor'),
    WorkbenchFBConnector = require('../../data/shared/workbenchFBConnector');

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

    // listen for workbench load requests
    window.addEventListener("message", function (event) {
      var dialStates = {},
          i,
          model,
          payload,
          clientNumber,
          workbenchAdaptor,
          workbench,
          //redrawTimeout,
          multimeter,
          meter,
          waitForLoad,
          moveProbe,
          updateProbes,
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
          var leadForHole, prevProbes;

          if (sparks.workbenchController && sparks.workbenchController.breadboardView && sparks.workbenchController.breadboardView.multimeter && sparks.workbenchController.breadboardController) {

            $('.breadboard svg').css({width: 740});
            $('.breadboard svg')[0].setAttribute('viewBox', "60 0 740 500");
            $("g[info=probes]").attr({transform: "matrix(0.05 0 0 0.05 60 -100)"});

            multimeter = sparks.workbenchController.breadboardView.multimeter;
            meter = sparks.workbenchController.workbench.meter;

            // get the dial angles
            for (i = 0; i < 360; i++) {
              model = multimeter.mmbox.model(i);
              if (model && model.length === 2 && !dialStates.hasOwnProperty(model[1])) {
                dialStates[model[1]] = model;
              }
            }

            // listen for circuit changes
            userController.createFirebaseGroupRef(payload.activityName, payload.groupName);
            userController.getFirebaseGroupRef().child('clients').on('value', function(snapshot) {
              var data = snapshot.val(),
                  i;

              if (data) {
                sparks.workbenchController.breadboardController.clearHoleMap();
                for (i in data) {
                  if (data.hasOwnProperty(i)) {
                    workbenchAdaptor.updateClient(i, data[i], i == clientNumber);
                  }
                }
                if (prevProbes) {
                  updateProbes(prevProbes);
                }
                meter.update();
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

            moveProbe = function (color, locOrPos) {
              var probe = multimeter.probe[color],
                  lead;

              if ((locOrPos.event === 'attached') && locOrPos.hole) {
                lead = leadForHole(locOrPos.hole);
                if (probe.lead != lead) {
                  probe.lead = lead;
                  probe.lead.probe = this;
                  probe.lead.highlight(2);
                  probe.snap();
                  meter.setProbeLocation("probe_"+color, locOrPos.hole);
                }
              }
              else if ((locOrPos.event === 'dropped') && locOrPos.position) {
                probe.move(locOrPos.position);
                probe.lead = null;
                probe.image.update();
                meter.setProbeLocation("probe_"+color, null);
              }
            };

            updateProbes = function (probes) {
              if (probes.black) {
                moveProbe('black', probes.black);
              }
              if (probes.red) {
                moveProbe('red', probes.red);
              }
              meter.update();
            };

            // listen for meter changes
            userController.getFirebaseGroupRef().child('meters').child(clientNumber).on('value', function (snapshot) {
              var data = snapshot.val();

              if (data) {
                // set the probes
                if (data.probes) {
                  prevProbes = data.probes;
                  updateProbes(data.probes);
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
                  username = "(unclaimed)",
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

              $("#userLabel").html(username).css({backgroundColor: ['#f00', '#228b22', '#00f'][clientNumber % 3]});
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
