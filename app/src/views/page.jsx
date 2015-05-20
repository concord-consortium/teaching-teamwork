var userController = require('../controllers/user'),
    //ChatView = require('./chat.jsx'),
    SidebarChatView = require('./sidebar-chat.jsx'),
    MathPadView = require('./mathpad.jsx'),
    NotesView = require('./notes'),
    ConnectionView = require('./connection.jsx'),
    EditorView = require('./editor'),
    SubmitButtonView = require('./submitButton'),
    config = require('../config');

module.exports = React.createClass({

  displayName: 'Page',

  render: function() {
    var activity = this.props.activity ? this.props.activity : {},
        activityName = activity.name ? ': ' + activity.name : '',
        hasMultipleClients = activity.clients && (activity.clients.length > 1),
        username = userController.getUsername(),
        groupname = userController.getGroupname(),
        circuit = hasMultipleClients && this.props.circuit ? (<h2>Circuit { this.props.circuit }{ username ? ' (User: ' + username : '' }{ groupname ? ', Group: ' + groupname + ')': ')' }</h2>) : null,
        notes = this.props.client ? (this.props.client.notes || "") : "",
        connection = <ConnectionView />,
        editor = this.props.showEditor ? (<EditorView parseAndStartActivity={ this.props.parseAndStartActivity } editorState={ this.props.editorState } />) : null,
        wrapperClass = hasMultipleClients ? 'multiple-clients' : null,
        image = activity.image ? (<div id="image-wrapper" className={ wrapperClass }><img src={ /^https?:\/\//.test(activity.image) ? activity.image : config.modelsBase + activity.image } /></div>) : null,
        submitButton = this.props.showSubmit && this.props.circuit ? (<SubmitButtonView label={hasMultipleClients ? 'We got it!' : "I got it!"} goals={ this.props.goals } nextActivity={ this.props.nextActivity } />) : null;

    return (
      <div className="tt-page">
        <h1>Teaching Teamwork{ activityName }</h1>
        { circuit }
        { submitButton }
        <div id="notes-wrapper" className={ wrapperClass }><NotesView text={ notes } className="tt-notes" breadboard={ this.props.breadboard } /></div>
        <div id="breadboard-and-chat-wrapper" className={ wrapperClass }>
          { hasMultipleClients ? (<div id="sidebar-chat-wrapper" className={ wrapperClass }><SidebarChatView {...activity} /></div>) : null }
          <div id="breadboard-wrapper" className={ wrapperClass }></div>
        </div>
        { image }
        <MathPadView />
        { connection }
        { editor }
      </div>
    );
  }
});
