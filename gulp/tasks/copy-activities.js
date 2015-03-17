var gulp        = require('gulp');
var config      = require('../config').activities;
var gulpif      = require('gulp-if');
var jsonlint    = require("gulp-jsonlint");

gulp.task('copy-activities', function(){
  gulp.src(config.src, { base: config.base })
    .pipe(gulp.dest(config.dest))
    .pipe(gulpif('*.json', jsonlint()))
    .pipe(gulpif('*.json', jsonlint.reporter()))
});
