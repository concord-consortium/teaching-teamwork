var app = './app';
var dest = './dist';
var bower = './bower_components';

module.exports = {
  trim: {
    src: app + '/**/*',
    dest: app
  },
  js: {
    src: {
      breadboard: app + '/src/breadboard.js',
      pic: app + '/src/pic.js'
    },
    allSrc: app + '/src/**/*',
    allJS: app + '/src/**/*.js',
    allJSX: app + '/src/**/*.jsx',
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
    src: [bower + '/breadboard/**/*', bower + '/codemirror/**/*', bower + '/jsonlint/**/*', bower + '/mathjs/**/*', bower + '/jquery.cookie/**/*', bower + '/jquery/**/*', bower + '/react/**/*'],
    base: bower + '/',
    dest: dest + '/vendor'
  }
};
