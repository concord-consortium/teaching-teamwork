var userController   = require('../controllers/user');

module.exports = React.createClass({

  displayName: 'ViewOtherCircuit',

  shouldComponentUpdate: function () {
    return false;
  },

  render: function () {
    return React.DOM.div({},
      React.DOM.div({style: {position: 'absolute'}}, 'Loading...'),
      React.DOM.div({id: "breadboard-wrapper"})
    );
  },

  componentDidMount: function () {
    var initialDraw = true,
        redraw;
    
    // load blank workbench
    try {
      sparks.createWorkbench({"circuit": []}, "breadboard-wrapper");
    }
    catch (e) {
    }
    
    redraw = function (circuit) {
      var i, ii, comp;
      
      sparks.workbenchController.breadboardController.clear();
      for (i = 0, ii = circuit.length; i < ii; i++) {
        comp = circuit[i];
        sparks.workbenchController.breadboardController.insertComponent(comp.type, comp);          
      }
    };
    
    // listen for workbench load requests
    window.addEventListener("message", function (event) {
      var payload,
          clientNumber,
          redrawTimeout;

      if (event.origin == window.location.origin) {
        payload = JSON.parse(event.data);
        
        clientNumber = payload.circuit - 1;
        
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
        
      }
    }, false);
  }
});






