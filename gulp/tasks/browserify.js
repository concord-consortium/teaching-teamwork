var gulp        = require('gulp');
var browserify  = require('browserify');
var source      = require("vinyl-source-stream");
var reactify    = require('reactify');
var config      = require('../config').js;

gulp.task('browserify-app', function(){
  var b = browserify();
  b.transform(reactify); // use the reactify transform
  b.add(config.src.app);
  return b.bundle()
    .pipe(source('app.js'))
    .pipe(gulp.dest(config.dest));
});

gulp.task('browserify-pic', function(){
  var b = browserify();
  b.transform(reactify); // use the reactify transform
  b.add(config.src.pic);
  return b.bundle()
    .pipe(source('pic.js'))
    .pipe(gulp.dest(config.dest));
});
