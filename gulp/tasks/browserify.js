var gulp        = require('gulp');
var browserify  = require('browserify');
var source      = require("vinyl-source-stream");
var reactify    = require('reactify');
var config      = require('../config').js;
var replace     = require('gulp-replace');
var gitRev      = require('git-rev-sync');

var tt_build_date = (new Date()).toString();
var tt_commit_hash = gitRev.long();

var dontExit = function (err) {
  console.log(err.message);
  this.emit('end');
};

gulp.task('browserify-breadboard', function(){
  var b = browserify();
  b.transform(reactify); // use the reactify transform
  b.add(config.src.breadboard);
  return b.bundle()
    .on('error', dontExit)
    .pipe(source('breadboard.js'))
    .pipe(replace('__TT_BUILD_DATE__', tt_build_date))
    .pipe(replace('__TT_COMMIT_HASH__', tt_commit_hash))
    .pipe(gulp.dest(config.dest));
});

gulp.task('browserify-pic', function(){
  var b = browserify();
  b.transform(reactify); // use the reactify transform
  b.add(config.src.pic);
  return b.bundle()
    .on('error', dontExit)
    .pipe(source('pic.js'))
    .pipe(replace('__TT_BUILD_DATE__', tt_build_date))
    .pipe(replace('__TT_COMMIT_HASH__', tt_commit_hash))
    .pipe(gulp.dest(config.dest));
});

gulp.task('browserify-logic-gates', function(){
  var b = browserify();
  b.transform(reactify); // use the reactify transform
  b.add(config.src.logicGates);
  return b.bundle()
    .on('error', dontExit)
    .pipe(source('logic-gates.js'))
    .pipe(replace('__TT_BUILD_DATE__', tt_build_date))
    .pipe(replace('__TT_COMMIT_HASH__', tt_commit_hash))
    .pipe(gulp.dest(config.dest));
});
