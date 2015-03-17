var app = './app';
var dest = './dist';
var bower = './bower_components';

module.exports = {
  trim: {
    src: app + '/**/*',
    dest: app
  },
  js: {
    src: app + '/src/app.js',
    allSrc: app + '/src/**/*',
    dest: dest + '/js'
  },
  activities: {
    src: './activities/**/*',
    json: './activities/**/*.json',
    base: './',
    dest: dest
  },
  public: {
    src: app + '/public/**/*',
    base: app + '/public/',
    dest: dest
  },
  vendor: {
    src: [bower + '/breadboard/**/*', bower + '/codemirror/**/*', bower + '/jsonlint/**/*', bower + '/mathjs/**/*'],
    base: bower + '/',
    dest: dest + '/vendor'
  }
};
