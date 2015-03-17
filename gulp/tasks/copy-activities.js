var gulp        = require('gulp');
var config      = require('../config').activities;

gulp.task('copy-activities', function(){
  return gulp.src(config.src, { base: config.base })
    .pipe(gulp.dest(config.dest))
});
