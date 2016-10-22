var path = window.location.pathname;

path = path.substr(path.indexOf('/teaching-teamwork') + '/teaching-teamwork'.length);
if (path.indexOf('/dist') != -1) {
  path = path.substr(path.indexOf('/dist') + '/dist'.length);
}

if (path == '/') {
  path += 'breadboard/';
}

if (window.location.search.length > 0) {
  path += window.location.search;
}
if (window.location.hash.length > 0) {
  path += window.location.hash;
}

path = 'http://teaching-teamwork.concord.org' + path;

document.write('<a href=' + path + '>' + path + '</a>');

window.location = path;