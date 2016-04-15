// import pathseg polyfill
require('../vendor/pathseg.js');

var App = React.createFactory(require('./views/app'));
ReactDOM.render(App({}), document.getElementById('content'));
