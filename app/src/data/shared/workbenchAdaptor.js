/**
 The workbench adaptor takes a TT-workbench definition such as

{
  externalComponents: [
    { comp1 ... connections: "0:a1,1:b2" }
  ],
  clients: [
    {
      circuit: [
        { comp2 ... connections: "a1,b2" },
      ],
      view_prop1: x,
      view_prop2: x
    },
    {
      circuit: [
        { comp3 ... connections: "a1,b2" },
      ],
      view_prop1: y,
      view_prop2: y
    }
 }

 and transforms it for consumption by breadboard.js to (in this case for client-0):

{
  circuit: [
    { comp1 ..., connections: "a1,1:b2", hidden: true },
    { comp2 ..., connections: "a1,b2" },
    { comp3 ..., connections: "1:a1,1:b2", hidden: true }
  ],
  view_prop1: x,
  view_prop2: x
}

when client-0 makes changes, it pushes just those component values to the backend.
**/

var WorkbenchAdaptor = function(client) {
  this.client = client;
};

WorkbenchAdaptor.prototype = {
  processTTWorkbench: function(ttWorkbench) {
    var workbenchDef = {
         circuit: []
        },
        comps, comp, clients, ownCircuit, clientProps,
        i, ii, j, jj;

    // copy externalComponents as hidden components
    comps = ttWorkbench.externalComponents;
    if (comps) {
      for (i = 0, ii = comps.length; i < ii; i++) {
        comp = comps[i];
        this.validate(comp);
        comp.hidden = true;
        // removes any x: from connection if x == client
        comp.connections = comp.connections.replace(new RegExp(this.client+":","g"),"");
        workbenchDef.circuit.push(comp);
      }
    }

    // copy client components, hiding those that aren't the client's
    clients = ttWorkbench.clients;
    for (i = 0, ii = clients.length; i < ii; i++) {

      comps = clients[i].circuit;
      ownCircuit = i == this.client;

      if (comps) {
        for (j = 0, jj = comps.length; j < jj; j++) {
          comp = comps[j];
          this.validate(comp);
          comp.hidden = !ownCircuit;
          // transforms other clients connections, e.g. "a1,b2", to "0:L1,0:L2"
          if (!ownCircuit) {
            comp.connections = i+":"+comp.connections.split(",").join(","+i+":");
            comp.connections = comp.connections.replace(/[abcde](\d)/g,"L$1");
            comp.connections = comp.connections.replace(/[fghij](\d)/g,"L$1");
          }
          workbenchDef.circuit.push(comp);
        }
      }

    }

    // copy non-circuit properties from the appropriate client def
    clientProps = ttWorkbench.clients[this.client];
    for (var prop in clientProps) {
      if (clientProps.hasOwnProperty(prop) && prop != "circuit") {
        workbenchDef[prop] = clientProps[prop];
      }
    }

    return workbenchDef;
  },

  validate: function (comp) {
    if (!comp.type) {
      throw new Error("Component is missing a type");
    }
    if (!comp.connections && (comp.UID != "source")) {
      throw new Error("Component is missing connections");
    }
  },

  getClientCircuit: function() {
    var circuit = JSON.parse(sparks.workbenchController.serialize()).circuit,
        ownCircuit = [];

    for (var i = 0, ii = circuit.length; i < ii; i++) {
      var comp = circuit[i];
      // turn off bitwise checking for this line
      // jshint bitwise:false
      if (!~comp.connections.indexOf(":") && comp.type != "powerLead") {
        // jshint bitwise:true
        // ugly
        var nodes = comp.connections.replace(/ghost/g, '').split(","),
            bbHoles = sparks.workbenchController.breadboardController.getHoles();
        if (bbHoles[nodes[0]] || bbHoles[nodes[1]]) {
          ownCircuit.push(comp);
        }
      }
    }

    return ownCircuit;
  },

  updateClient: function(client, newCircuit, isMyCircuit) {
    var clientCircuit = [],
        clientUIDs = [],
        comp, oldCircuit, i, ii, j, k, removeMyComponent, removeOtherComponent, uid, newComponent;

    if (!newCircuit) {
      return;
    }

    for (i = 0, ii = newCircuit.length; i < ii; i++) {
      comp = newCircuit[i];

      // skip remote ghosts
      if (!isMyCircuit && (comp.connections.indexOf('ghost') != -1)) {
        continue;
      }

      // save ghost hole information
      comp.savedConnectionList = comp.connections.slice(0).split(',');
      comp.connections = comp.connections.replace(/ghost/g, '');

      // transforms other clients connections, e.g. "a1,b2", to "0:a1,0:b2"
      if (!isMyCircuit) {
        comp.connections = client+":"+comp.connections.split(",").join(","+client+":");
        comp.connections = comp.connections.replace(/[abcde](\d)/g,"L$1");
        comp.connections = comp.connections.replace(/[fghij](\d)/g,"L$1");
      }
      clientCircuit.push(comp);
      clientUIDs.push(comp.UID);
    }

    // update in place
    oldCircuit = JSON.parse(sparks.workbenchController.serialize()).circuit;
    for (i = 0, ii = oldCircuit.length; i < ii; i++) {
      comp = oldCircuit[i];
      removeMyComponent = isMyCircuit && (clientUIDs.indexOf(comp.UID) != -1);
      removeOtherComponent = !isMyCircuit && (comp.connections.indexOf(client+":") != comp.connections.lastIndexOf(client+":"));
      if (removeMyComponent || removeOtherComponent) {
        sparks.workbenchController.breadboardController.remove(comp.type, comp.connections);
      }
    }

    for (i = 0, ii = clientCircuit.length; i < ii; i++) {
      comp = clientCircuit[i];
      comp.hidden = !isMyCircuit;
      uid = sparks.workbenchController.breadboardController.insertComponent(comp.type, comp);
      newComponent = sparks.workbenchController.breadboardView.component[uid];

      // disconnect the leads of components with ghost holes
      if (newComponent) {
        for (j = 0, k = comp.savedConnectionList.length; j < k; j++) {
          if (comp.savedConnectionList[j].indexOf('ghost') != -1) {
            newComponent.leads[j].disconnect();
          }
        }
      }
    }
    sparks.workbenchController.workbench.meter.update();
  },

  isCurrentFlowing: function (circuit) {
    if (circuit) {
      for (var i = 0, ii = circuit.length; i < ii; i++) {
        if (circuit[i].connections.indexOf("ghost") !== -1) {
          return false;
        }
      }
    }
    return true;
  }
};

module.exports = WorkbenchAdaptor;
