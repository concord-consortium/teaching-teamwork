module.exports = function () {
  var components = sparks.workbenchController && sparks.workbenchController.breadboardView ? sparks.workbenchController.component : {};
  for (var key in components) {
    if (components.hasOwnProperty(key)) {
      var component = components[key];
      if (component.type === 'wire') {
        component.connector.view.find('[type=line]').eq(1).attr('stroke', 'blue');
        component.connector.view.find('[type=line]').eq(2).attr('stroke', 'blue');
      }
    }
  }
};

