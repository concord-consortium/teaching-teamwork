var userController = require('../controllers/user'),
    SidebarChatView = require('./sidebar-chat.jsx'),
    SidebarChatViewFactory = React.createFactory(SidebarChatView),
    CalculatorView = require('./calculator.jsx'),
    NotesView = require('./notes'),
    ConnectionView = require('./connection.jsx'),
    EditorView = require('./editor'),
    SubmitButtonView = require('./submitButton'),
    OtherCircuitsView = require('./other-circuits'),
    config = require('../config');

module.exports = React.createClass({

  displayName: 'Page',

  render: function() {
    var activity = this.props.activity ? this.props.activity : {},
        inIframe = (function() { try { return window.self !== window.top; } catch (e) { return true; } })(),
        activityName = activity.name ? ': ' + activity.name : '',
        title = inIframe ? null : (<h1>Teaching Teamwork{ activityName }</h1>),
        hasMultipleClients = activity.clients && (activity.clients.length > 1),
        username = userController.getUsername(),
        groupname = userController.getGroupname(),
        circuit = hasMultipleClients && this.props.circuit ? (<h2>Circuit { this.props.circuit }{ username ? ' (User: ' + username : '' }{ groupname ? ', Group: ' + groupname + ')': ')' }</h2>) : null,
        notes = this.props.client ? (this.props.client.notes || "") : "",
        connection = <ConnectionView />,
        editor = this.props.showEditor ? (<EditorView parseAndStartActivity={ this.props.parseAndStartActivity } editorState={ this.props.editorState } />) : null,
        wrapperClass = hasMultipleClients ? 'multiple-clients' : null,
        image = activity.image ? (<div id="image-wrapper" className={ wrapperClass }><img src={ /^https?:\/\//.test(activity.image) ? activity.image : config.modelsBase + activity.image } /></div>) : null,
        submitButton = this.props.showSubmit && this.props.circuit ? (<SubmitButtonView label={hasMultipleClients ? 'We got it!' : "I got it!"} goals={ this.props.goals } nextActivity={ this.props.nextActivity } />) : null,
        otherCircuitsButton = hasMultipleClients && this.props.circuit ? (<OtherCircuitsView circuit={ this.props.circuit } numClients={ activity.clients.length } activityName={ this.props.activityName } groupName={ userController.getGroupname() } ttWorkbench={ this.props.ttWorkbench } />) : null,
        calculator = this.props.circuit ? (<CalculatorView />) : null,
        chatProps = hasMultipleClients ? $.extend({}, activity, {numClients: activity.clients.length}) : null;

    return (
      <div className="tt-page">
        { title }
        { circuit }
        <div id="top-button-wrapper">
          { submitButton }
          { otherCircuitsButton }
        </div>
        <div id="notes-wrapper" className={ wrapperClass }><NotesView text={ notes } className="tt-notes" breadboard={ this.props.breadboard } /></div>
        <div id="breadboard-and-chat-wrapper" className={ wrapperClass }>
          { hasMultipleClients ? (React.DOM.div({id: "sidebar-chat-wrapper", className: wrapperClass}, SidebarChatViewFactory(chatProps))) : null }
          <div id="breadboard-wrapper" className={ wrapperClass }></div>
        </div>
        { image }
        { calculator }
        { connection }
        { editor }
      </div>
    );
  }
});
