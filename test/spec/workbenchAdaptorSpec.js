var workbenchAdaptor = require('../../app/src/data/shared/workbenchAdaptor');

describe("the workbench adaptor", function() {

  var wa = new workbenchAdaptor(0);

  it("can load a one-user tt-workbench", function() {
    var ttWorkbench = {
      clients: [
        {
          show_multimeter: true,
          allow_move_yellow_probe: false,
          circuit: [
            {
              "type": "wire",
              "connections": "_"
            }
          ]
        }
      ]
    };

    var workbench = wa.processTTWorkbench(ttWorkbench);

    expect(workbench.show_multimeter).toBe(true);
    expect(workbench.allow_move_yellow_probe).toBe(false);
    expect(workbench.circuit[0].type).toBe("wire");
    expect(workbench.circuit[0].hidden).toBe(false);
  });

  it("can load components from the externalComponents array", function() {
    var ttWorkbench = {
      externalComponents: [
        {
          "type": "resistor",
          "connections": "_"
        }
      ],
      clients: [
        {
          circuit: [
            {
              "type": "wire",
              "connections": "_"
            }
          ]
        }
      ]
    };

    var workbench = wa.processTTWorkbench(ttWorkbench);

    expect(workbench.circuit[0].type).toBe("resistor");
    expect(workbench.circuit[0].hidden).toBe(true);
  });

  it("can load components from other clients", function() {
    var ttWorkbench = {
      externalComponents: [
        {
          "type": "resistor",
          "connections": "_"
        }
      ],
      clients: [
        {
          show_multimeter: false,
          circuit: [
            {
              "type": "wire",
              "connections": "_"
            }
          ]
        },
        {
          show_multimeter: true,
          circuit: [
            {
              "type": "capacitor",
              "connections": "_"
            }
          ]
        },
        {
          show_multimeter: false,
          circuit: [
            {
              "type": "inductor",
              "connections": "_"
            }
          ]
        }
      ]
    };

    // switch up the client
    wa.client = 1;

    var workbench = wa.processTTWorkbench(ttWorkbench);

    expect(workbench.circuit[0].type).toBe("resistor");
    expect(workbench.circuit[0].hidden).toBe(true);

    expect(workbench.circuit[1].type).toBe("wire");
    expect(workbench.circuit[1].hidden).toBe(true);

    expect(workbench.circuit[2].type).toBe("capacitor");
    expect(workbench.circuit[2].hidden).toBe(false);

    expect(workbench.circuit[3].type).toBe("inductor");
    expect(workbench.circuit[3].hidden).toBe(true);

    expect(workbench.show_multimeter).toBe(true);
  });

  it("can load components from other clients and rewrite their nodes", function() {
    var ttWorkbench = {
      externalComponents: [
        {
          type: "wire",
          connections: "0:a1,1:a1"
        }
      ],
      clients: [
        {
          show_multimeter: false,
          circuit: [
            {
              type: "wire",
              connections: "a1,b2"
            }
          ]
        },
        {
          show_multimeter: true,
          circuit: [
            {
              type: "capacitor",
              connections: "a1,b2"
            }
          ]
        },
        {
          show_multimeter: false,
          circuit: [
            {
              type: "inductor",
              connections: "a1,b2"
            }
          ]
        }
      ]
    };

    // switch up the client
    wa.client = 1;

    var workbench = wa.processTTWorkbench(ttWorkbench);

    expect(workbench.circuit[0].connections).toBe("0:a1,a1");
    expect(workbench.circuit[1].connections).toBe("0:L1,0:L2");
    expect(workbench.circuit[2].connections).toBe("a1,b2");
    expect(workbench.circuit[3].connections).toBe("2:L1,2:L2");
  });

  it("can return the user's circuit", function() {
    var ttWorkbench = {
      externalComponents: [
        {
          type: "wire",
          connections: "0:a1,1:a1"
        }
      ],
      clients: [
        {
          show_multimeter: false,
          circuit: [
            {
              type: "wire",
              connections: "a1,b2"
            }
          ]
        },
        {
          show_multimeter: true,
          circuit: [
            {
              type: "capacitor",
              connections: "a1,b2"
            }
          ]
        }
      ]
    };

    // switch up the client
    wa.client = 1;

    var workbench = wa.processTTWorkbench(ttWorkbench);

    var div = document.createElement('div');
    div.id = 'breadboard-wrapper';
    document.getElementsByTagName('body')[0].appendChild(div);

    sparks.createWorkbench(workbench, "breadboard-wrapper");

    var serialized = wa.getClientCircuit();

    expect(serialized.length).toBe(1);
    expect(serialized[0].type).toBe("capacitor");
    expect(serialized[0].connections).toBe("a1,b2");
  });
});
