var workspaceWidth = 936 - 200,
    logicDrawerWidth = 100,
    constants;

module.exports = constants = {
  WORKSPACE_HEIGHT: 768,
  WORKSPACE_WIDTH: workspaceWidth,
  RIBBON_HEIGHT: 21,
  INPUT_SWITCHES_HEIGHT: 21,
  OUTPUT_LEDS_HEIGHT: 21,
  SELECTED_FILL: '#bbb',
  UNSELECTED_FILL: '#777',

  // in the logic gate activity there is no difference in layout between selected and unselected activities but we need to maintain this shared function signature
  selectedConstants: function () {
    var boardHeight = (constants.WORKSPACE_HEIGHT - (2 * constants.RIBBON_HEIGHT)) / 2,
        logicDrawerLayout = {
          x: workspaceWidth - logicDrawerWidth,
          y: 0,
          width: logicDrawerWidth,
          height: boardHeight
        };

    return {
      WIRE_WIDTH: 3,
      FOO_WIRE_WIDTH: 1,
      CONNECTOR_HOLE_DIAMETER: 15,
      CONNECTOR_HOLE_MARGIN: 4,
      BOARD_HEIGHT: boardHeight,
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
