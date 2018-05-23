// NOTE: the __TT* variables are replaced by the browserify gulp task

var div = React.DOM.div,
    a = React.DOM.a;

module.exports = React.createClass({
  displayName: 'Version',

  render: function() {
    var commitHash = '__TT_COMMIT_HASH__',
        version = commitHash.substr(0, 8);

    return div({className: "version-wrapper"},
      div({className: 'version-info'},
        'Build ',
        a({href: 'https://github.com/concord-consortium/teaching-teamwork/commit/' + commitHash, target: '_blank', title: commitHash}, version),
        ', built on __TT_BUILD_DATE__')
    );
  }
});
