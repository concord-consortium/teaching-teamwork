var gulp        = require('gulp');
var browserify  = require('browserify');
var source      = require("vinyl-source-stream");
var reactify    = require('reactify');
var config      = require('../config').js;
var package     = require('../../package.json');
var replace     = require('gulp-replace');
var gitRev      = require('git-rev-sync')

var tt_version = package.version;
var tt_build_date = (new Date()).toString();
var tt_commit_hash = gitRev.long();

gulp.task('browserify-breadboard', function(){
  var b = browserify();
  b.transform(reactify); // use the reactify transform
  b.add(config.src.breadboard);
  return b.bundle()
    .pipe(source('breadboard.js'))
    .pipe(replace('__TT_VERSION__', tt_version))
    .pipe(replace('__TT_BUILD_DATE__', tt_build_date))
    .pipe(replace('__TT_COMMIT_HASH_FALLBACK__', tt_commit_hash))
    .pipe(gulp.dest(config.dest));
});

gulp.task('browserify-pic', function(){
  var b = browserify();
  b.transform(reactify); // use the reactify transform
  b.add(config.src.pic);
  return b.bundle()
    .pipe(source('pic.js'))
    .pipe(replace('__TT_VERSION__', tt_version))
    .pipe(replace('__TT_BUILD_DATE__', tt_build_date))
    .pipe(replace('__TT_COMMIT_HASH_FALLBACK__', tt_commit_hash))
    .pipe(gulp.dest(config.dest));
});

gulp.task('browserify-logic-gates', function(){
  var b = browserify();
  b.transform(reactify); // use the reactify transform
  b.add(config.src.logicGates);
  return b.bundle()
    .pipe(source('logic-gates.js'))
    .pipe(replace('__TT_VERSION__', tt_version))
    .pipe(replace('__TT_BUILD_DATE__', tt_build_date))
    .pipe(replace('__TT_COMMIT_HASH_FALLBACK__', tt_commit_hash))
    .pipe(gulp.dest(config.dest));
});
