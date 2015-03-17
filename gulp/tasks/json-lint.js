var gulp        = require('gulp');
var config      = require('../config').activities;
var jsonlint    = require("gulp-jsonlint");
var es          = require('event-stream');
var beep        = require('beepbeep');

var exitOnJSONError = function () {
  return es.map(function (file, cb) {
    if (file.jsonlint && !file.jsonlint.success) {
      beep();
      if (process.env.EXIT_ON_ERRORS) {
        console.log('Aborting json-lint because of json formatting error(s) (see above for errors)');
        process.exit(1);
      }
    }
    return cb(null, file);
  });
};

gulp.task('json-lint', function(){
  return gulp.src(config.json, { base: config.base })
    .pipe(jsonlint())
    .pipe(jsonlint.reporter())
    .pipe(exitOnJSONError())
});

