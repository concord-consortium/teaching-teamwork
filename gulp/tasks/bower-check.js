// checks if the required bower components exist and are the correct version

var gulp   = require('gulp');
var fs     = require('fs');
var path   = require('path');
var beep   = require('beepbeep');

var error = function (message) {
  beep();
  console.error(message);
  if (process.env.EXIT_ON_ERRORS) {
    process.exit(1);
  }
};

gulp.task('bower-check', function() {
  var rootPath = path.resolve(__dirname, '../../'),
      getPath = function (to) {
        return path.resolve(rootPath, to);
      },
      bower = require(getPath('bower.json')),
      component;

  for (component in bower.dependencies) {
    (function (component) {
      // note: we are loading the dotfile which is maintained by bower with the currently installed package
      var requiredVersion = bower.dependencies[component],
          componentPackagePath = getPath('bower_components/' + component + '/.bower.json'),
          componentPackage;

      // handle the react#0.12.2 case
      if (requiredVersion.indexOf('#') !== -1) {
        requiredVersion = requiredVersion.split('#')[1];
      }

      fs.exists(componentPackagePath, function (exists) {
        if (exists) {
          componentPackage = require(componentPackagePath);
          if (componentPackage.version != requiredVersion) {
            error('Please run "bower update".  The ' + component + ' bower component installed version number (' +  componentPackage.version + ') does not match the required version number (' + requiredVersion + ')');
          }
        }
        else {
          error('Please run "bower install".  The ' + component + ' bower component is not installed!');
        }
      });
    })(component);
  }
});
