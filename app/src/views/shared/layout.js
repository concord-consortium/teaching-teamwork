module.exports = {
  getBezierPath: function (options) {
    var closeCutoff = 500,
        normalize, dy, dx, dist, x3, y3, x4, y4, height, curvyness, closeModifier;

    normalize = function (v, d) {
      var n = v / d;
      if (!isFinite(n)) {
        n = 0;
      }
      return n;
    };

    curvyness = (options.wireSettings ? options.wireSettings.curvyness : 0) || 0.25;

    dx = options.x1 - options.x2;
    dy = options.y1 - options.y2;
    dist = Math.sqrt(dx*dx + dy*dy);
    closeModifier = 5 * curvyness * (1 - (Math.min(dist, closeCutoff) / closeCutoff));
    height = dist * (curvyness + closeModifier);
    dx = normalize(dx, dist);
    dy = normalize(dy, dist);
    x3 = (options.x1 + options.x2) / 2;
    y3 = (options.y1 + options.y2) / 2;
    x4 = x3 - height*dy*options.reflection;
    y4 = y3 + height*dx*options.reflection;

    return ['M', options.x1, ',', options.y1, ' Q', x4, ',', y4, ' ', options.x2, ',', options.y2].join('');
  },

  calculateComponentRect: function (constants, selected, index, count, componentWidth, componentHeight) {
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
