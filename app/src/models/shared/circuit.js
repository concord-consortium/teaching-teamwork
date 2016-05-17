var Circuit = function (options) {
  this.source = options.source;
  this.dest = options.dest;
};
Circuit.ResolveWires = function (wires) {
  var circuits = [],
      wire, i, source, dest;

  for (i = 0; i < wires.length; i++) {
    wire = wires[i];

    source = Circuit.FindTerminal(wire, wire.source);
    dest = Circuit.FindTerminal(wire, wire.dest);
    if ((source === 'circular') || (dest === 'circular')) {
      alert('A circular wire graph was found.  Aborting!');
      return false;
    }
    circuits.push(new Circuit({
      source: source,
      dest: dest
    }));
  }
  return circuits;
};
Circuit.FindTerminal = function (wire, pinOrHole) {
  var terminal = pinOrHole,
      foundWire = true,
      otherConnector, otherHole, otherWire, i;

  while (terminal.connector && terminal.connector.connectsTo && foundWire) {
    otherConnector = terminal.connector.connectsTo;
    otherHole = otherConnector.holes[terminal.index];

    foundWire = false;
    for (i = 0; i < otherConnector.board.wires.length; i++) {
      otherWire = otherConnector.board.wires[i];
      if (otherWire === wire) {
        return 'circular';
      }
      if ((otherWire.source === otherHole) || (otherWire.dest === otherHole)) {
        terminal = otherWire.source === otherHole ? otherWire.dest : otherWire.source;
        foundWire = true;
        break;
      }
    }
  }

  return terminal;
};

Circuit.prototype.resolveInputValues = function () {
  var input = null,
      output = null;

  if (this.source.isPin && this.dest.isPin) {
    if (this.source.inputMode && !this.dest.inputMode) {
      input = this.source;
      output = this.dest;
    }
    else if (!this.source.inputMode && this.dest.inputMode) {
      input = this.dest;
      output = this.source;
    }
  }
  else if (this.source.isPin && !this.source.inputMode) {
    input = this.dest;
    output = this.source;
  }
  else if (this.dest.isPin && !this.dest.inputMode) {
    input = this.source;
    output = this.dest;
  }

  if (input && output) {
    input.setValue(output.value);
  }
};

module.exports = Circuit;
