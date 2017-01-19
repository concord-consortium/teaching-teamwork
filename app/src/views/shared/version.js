// NOTE: the __TT* variables are replaced by the browserify gulp task

var div = React.DOM.div,
    a = React.DOM.a;

module.exports = React.createClass({
  displayName: 'Version',

  renderGitCommit: function () {
    var commitHash = '__TT_COMMIT_HASH__';

    if (commitHash[0] != '_') {
      return div({className: 'version-info'},
        a({href: 'https://github.com/concord-consortium/teaching-teamwork/commit/' + commitHash, target: '_blank'}, 'Commit: ' + commitHash)
      );
    }
    else {
      return null;
    }
  },

  render: function() {
    return div({className: "version-wrapper"},
      div({className: 'version-info'}, 'Version __TT_VERSION__, built on __TT_BUILD_DATE__'),
      this.renderGitCommit()
    );
  }
});
