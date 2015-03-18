var ChatView = require('./chat.jsx'),
    MathPadView = require('./mathpad.jsx'),
    NotesView = require('./notes'),
    EditorView = require('./editor'),
    config = require('../config');

module.exports = React.createClass({

  displayName: 'Page',

  render: function() {
    var activity = this.props.activity ? this.props.activity : {},
        activityName = activity.name ? ': ' + activity.name : '',
        hasMultipleClients = activity.clients && (activity.clients.length > 1),
        circuit = hasMultipleClients && this.props.circuit ? (<h2>Circuit { this.props.circuit }</h2>) : null,
        notes = this.props.client ? (this.props.client.notes || "") : "",
        editor = this.props.showEditor ? (<EditorView parseAndStartActivity={ this.props.parseAndStartActivity } editorState={ this.props.editorState } />) : null,
        image = activity.image ? (<img src={ /^https?:\/\//.test(activity.image) ? activity.image : config.modelsBase + activity.image } />) : null;

    return (
      <div className="tt-page">
        <h1>Teaching Teamwork{ activityName }</h1>
        { circuit }
        <div id="breadboard-wrapper"></div>
        { hasMultipleClients ? (<ChatView {...activity} />) : null }
        <div id="image-wrapper">{ image }</div>
        {this.props.activity ? (<MathPadView />) : null }
        <div id="notes-wrapper"><NotesView text={ notes } className="tt-notes" breadboard={ this.props.breadboard } /></div>
        { editor }
      </div>
    );
  }
});
