// NOTE: the __TT* variables are replaced by the browserify gulp task

var div = React.DOM.div,
    a = React.DOM.a,
    loadedFromLara;

try {
  loadedFromLara = window.self !== window.top;
} catch (e) {
  loadedFromLara = true;
}

module.exports = React.createClass({
  displayName: 'Version',

  renderVersion: function (commitHash) {
    var version = commitHash.substr(0, 8),
        href = 'https://github.com/concord-consortium/teaching-teamwork/commit/' + commitHash;
    return loadedFromLara ? version : a({href: href, target: '_blank', title: commitHash}, version);
  },

  render: function() {
    var commitHash = '__TT_COMMIT_HASH__';
    return div({className: "version-wrapper"},
      div({className: 'version-info'},
        'Build ',
        this.renderVersion(commitHash),
        ', built on __TT_BUILD_DATE__')
    );
  }
});
