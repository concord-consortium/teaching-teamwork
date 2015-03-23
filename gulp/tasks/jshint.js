var gulp    = require('gulp');
var config  = require('../config').js;
var jshint  = require("gulp-jshint");
var stylish = require('jshint-stylish');
var es      = require('event-stream');
var beep    = require('beepbeep');
var react   = require('gulp-react');

var exitOnJSError = function () {
  return es.map(function (file, cb) {
    if (file.jshint && !file.jshint.success) {
      beep();
      if (process.env.EXIT_ON_ERRORS) {
        console.log('Aborting jshint because of error(s) (see above for errors)');
        process.exit(1);
      }
    }
    return cb(null, file);
  });
};

var dump = function () {
  return es.map(function (file, cb) {
    console.log('dump: ' + file.path);
    return cb(null, file);
  });
};

gulp.task('jshint', function(){
  gulp.src(config.allJS)
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
    .pipe(exitOnJSError());
  
  gulp.src(config.allJSX)
    .pipe(react())
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
    .pipe(exitOnJSError());
});
