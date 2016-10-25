var workspaceWidth = 936 - 200,
    constants;

module.exports = constants = {
  WORKSPACE_HEIGHT: 768,
  WORKSPACE_WIDTH: workspaceWidth,
  RIBBON_HEIGHT: 21,
  SPACER_HEIGHT: 21,
  SELECTED_FILL: '#bbb',
  UNSELECTED_FILL: '#777',

  selectedConstants: function (selected) {
    var boardHeight,
        boardLeft = 50;

    if (selected) {
      boardHeight = constants.WORKSPACE_HEIGHT * 0.5;
      return {
        WIRE_WIDTH: 3,
        FOO_WIRE_WIDTH: 1,
        CONNECTOR_HOLE_DIAMETER: 15,
        CONNECTOR_HOLE_MARGIN: 4,
        CONNECTOR_SPACING: 20,
        BOARD_WIDTH: workspaceWidth,
        BOARD_HEIGHT: boardHeight,
        BOARD_LEFT: 0,
        COMPONENT_WIDTH: boardHeight * 0.5,
        COMPONENT_HEIGHT: boardHeight * 0.5,
        COMPONENT_SPACING: boardHeight * 0.25,
        PIC_FONT_SIZE: 12,
        BUTTON_FONT_SIZE: 16,
        BUS_FONT_SIZE: 14,
        PIN_WIDTH: 13.72,
        PIN_HEIGHT: 13.72,
        PROBE_WIDTH: 150,
        PROBE_NEEDLE_HEIGHT: 5,
        PROBE_HEIGHT: 20,
        PROBE_MARGIN: 10,
        AUTO_TOGGLE_SELECTOR_WIDTH: 15,
        AUTO_TOGGLE_SELECTOR_HEIGHT: 10,
        AUTO_TOGGLE_SELECTOR_MARGIN: 3
      };
    }
    else {
      boardHeight = (constants.WORKSPACE_HEIGHT - (2 * constants.RIBBON_HEIGHT)) / 3;
      return {
        WIRE_WIDTH: 2,
        FOO_WIRE_WIDTH: 1,
        CONNECTOR_HOLE_DIAMETER: 10,
        CONNECTOR_HOLE_MARGIN: 3,
        CONNECTOR_SPACING: 15,
        BOARD_WIDTH: workspaceWidth - boardLeft,
        BOARD_HEIGHT: boardHeight,
        BOARD_LEFT: boardLeft,
        COMPONENT_WIDTH: boardHeight * 0.5,
        COMPONENT_HEIGHT: boardHeight * 0.5,
        COMPONENT_SPACING: boardHeight * 0.5,
        PIC_FONT_SIZE: 8,
        BUTTON_FONT_SIZE: 13,
        BUS_FONT_SIZE: 10,
        PIN_WIDTH: 8.64,
        PIN_HEIGHT: 8.64,
        PROBE_WIDTH: 95,
        PROBE_NEEDLE_HEIGHT: 3,
        PROBE_HEIGHT: 12,
        PROBE_MARGIN: 10,
        AUTO_TOGGLE_SELECTOR_WIDTH: 15,
        AUTO_TOGGLE_SELECTOR_HEIGHT: 10,
        AUTO_TOGGLE_SELECTOR_MARGIN: 3
      };
    }
  }
};
