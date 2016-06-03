var gulp        = require('gulp');
var browserify  = require('browserify');
var source      = require("vinyl-source-stream");
var reactify    = require('reactify');
var config      = require('../config').js;

gulp.task('browserify-breadboard', function(){
  var b = browserify();
  b.transform(reactify); // use the reactify transform
  b.add(config.src.breadboard);
  return b.bundle()
    .pipe(source('breadboard.js'))
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

gulp.task('browserify-logic-gates', function(){
  var b = browserify();
  b.transform(reactify); // use the reactify transform
  b.add(config.src.logicGates);
  return b.bundle()
    .pipe(source('logic-gates.js'))
    .pipe(gulp.dest(config.dest));
});
