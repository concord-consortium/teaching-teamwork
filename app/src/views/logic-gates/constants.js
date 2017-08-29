var workspaceWidth = 936 - 200,
    logicDrawerWidth = 100,
    constants;

module.exports = constants = {
  WORKSPACE_HEIGHT: 790,
  WORKSPACE_WIDTH: workspaceWidth,
  RIBBON_HEIGHT: 21,
  SPACER_HEIGHT: 21,
  INPUT_SWITCHES_HEIGHT: 21,
  OUTPUT_LEDS_HEIGHT: 21,
  SELECTED_FILL: '#bbb',
  UNSELECTED_FILL: '#777',

  selectedConstants: function (selected) {
    var boardHeight = (constants.WORKSPACE_HEIGHT - constants.SPACER_HEIGHT) / 2,
        boardLeft = selected ? 0 : 50,
        logicDrawerLayout = {
          x: workspaceWidth - logicDrawerWidth - boardLeft,
          y: 0,
          width: logicDrawerWidth,
          height: boardHeight
        };

    return {
      WIRE_WIDTH: selected ? 3.5 : 2.5,
      FOO_WIRE_WIDTH: 1,
      CONNECTOR_HOLE_DIAMETER: 10,
      CONNECTOR_HOLE_MARGIN: 4,
      CONNECTOR_SPACING: 20,
      BOARD_WIDTH: workspaceWidth - boardLeft,
      BOARD_HEIGHT: boardHeight,
      BOARD_LEFT: boardLeft,
      COMPONENT_WIDTH: boardHeight * 0.5,
      COMPONENT_HEIGHT: boardHeight * 0.5,
      COMPONENT_SPACING: boardHeight * 0.5,
      PIC_FONT_SIZE: 11,
      CHIP_LABEL_SIZE: 14,
      BUTTON_FONT_SIZE: 16,
      BUS_FONT_SIZE: 14,
      PIN_WIDTH: 7,
      PIN_HEIGHT: 8,
      PROBE_WIDTH: 150,
      PROBE_NEEDLE_HEIGHT: 5,
      PROBE_HEIGHT: 20,
      PROBE_MARGIN: 10,
      LOGIC_DRAWER_LAYOUT: logicDrawerLayout,
      AUTO_TOGGLE_SELECTOR_WIDTH: 20,
      AUTO_TOGGLE_SELECTOR_HEIGHT: 15,
      AUTO_TOGGLE_SELECTOR_MARGIN: 5
    };
  }
};
