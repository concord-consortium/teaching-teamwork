var gulp = require('gulp');
var config = require('../config');

gulp.task('watch', function() {
    gulp.watch(config.js.allSrc,  ['browserify-app', 'browserify-pic']);
    gulp.watch(config.js.allSrc,  ['jshint']);
    gulp.watch(config.public.src,  ['copy-public']);
    gulp.watch(config.activities.json, ['json-lint']);
    gulp.watch(config.activities.src, ['copy-activities']);
});

gulp.task('build-all', ['browserify-app', 'browserify-pic', 'copy-activities', 'copy-public', 'copy-vendor', 'json-lint', 'bower-check', 'jshint'])

gulp.task('default', ['build-all', 'watch']);
