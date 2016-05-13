// import pathseg polyfill
require('../vendor/pathseg.js');

var App = React.createFactory(require('./views/breadboard/app'));
ReactDOM.render(App({}), document.getElementById('content'));
