var workspaceWidth = 936 - 200,
    logicDrawerWidth = 100,
    constants;

module.exports = constants = {
  WORKSPACE_HEIGHT: 768,
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
      WIRE_WIDTH: selected ? 3 : 2,
      FOO_WIRE_WIDTH: 1,
      CONNECTOR_HOLE_DIAMETER: 15,
      CONNECTOR_HOLE_MARGIN: 4,
      BOARD_WIDTH: workspaceWidth - boardLeft,
      BOARD_HEIGHT: boardHeight,
      BOARD_LEFT: boardLeft,
      COMPONENT_WIDTH: boardHeight * 0.5,
      COMPONENT_HEIGHT: boardHeight * 0.5,
      COMPONENT_SPACING: boardHeight * 0.5,
      PIC_FONT_SIZE: 12,
      CHIP_LABEL_SIZE: 16,
      BUTTON_FONT_SIZE: 16,
      PIN_WIDTH: 13.72,
      PIN_HEIGHT: 13.72,
      PROBE_WIDTH: 150,
      PROBE_NEEDLE_HEIGHT: 5,
      PROBE_HEIGHT: 20,
      PROBE_MARGIN: 10,
      LOGIC_DRAWER_LAYOUT: logicDrawerLayout
    };
  }
};
