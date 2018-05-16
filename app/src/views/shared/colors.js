var mixedWires = ['#00cc00', '#aa0000', '#f77a04', '#d33ad8', '#f7f322', '#36adf7', '#eee'];

module.exports = {
  wire: '#00cc00',
  mixedWires: mixedWires,
  busInput: '#66c2e6',
  busOutput: '#b45ec6',
  inputSelector: '#333',
  inputSelectorBackground: '#ccc',
  randomWireColor: function () {
    return mixedWires[Math.floor(Math.random() * mixedWires.length)];
  }
};

