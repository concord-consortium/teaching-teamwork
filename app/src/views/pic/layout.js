var constants = require('./constants');

module.exports = {
  getBezierPath: function (options) {
    var firstPointIsLowest, lowest, highest, midX, midY, perpSlope, x3, y3, reflection;

    firstPointIsLowest = options.y1 > options.y2;
    lowest = {x: firstPointIsLowest ? options.x1 : options.x2, y: firstPointIsLowest ? options.y1: options.y2};
    highest = {x: firstPointIsLowest ? options.x2 : options.x1, y: firstPointIsLowest ? options.y2 : options.y1};

    midX = (lowest.x + highest.x) / 2;
    midY = (lowest.y + highest.y) / 2;
    perpSlope = (lowest.x - highest.x) / (highest.y - lowest.y);
    if (!isFinite(perpSlope)) {
      perpSlope = 1;
    }
    reflection = highest.x >= lowest.x ? options.reflection : -options.reflection;

    x3 = midX + (Math.cos(perpSlope) * 100 * reflection);
    y3 = midY + (Math.sin(perpSlope) * 100 * reflection);

    return ['M', options.x1, ',', options.y1, ' Q', x3, ',', y3, ' ', options.x2, ',', options.y2].join('');
  },

  calculateComponentRect: function (selected, index, count, componentWidth, componentHeight) {
    var selectedConstants = constants.selectedConstants(selected),
        startX, position;

    componentWidth = componentWidth || selectedConstants.COMPONENT_WIDTH;
    componentHeight = componentHeight || selectedConstants.COMPONENT_HEIGHT;

    startX = (constants.WORKSPACE_WIDTH - (count * componentWidth) - ((count - 1) * selectedConstants.COMPONENT_SPACING)) / 2;

    position = {
      x: startX + (index * (componentWidth + selectedConstants.COMPONENT_SPACING)),
      y: ((selectedConstants.BOARD_HEIGHT - componentHeight) / 2),
      width: componentWidth,
      height: componentHeight
    };

    return position;
  }
};
