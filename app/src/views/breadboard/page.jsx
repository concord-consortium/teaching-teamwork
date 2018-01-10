var userController = require('../../controllers/shared/user'),
    SidebarChatView = require('./sidebar-chat.jsx'),
    SidebarChatViewFactory = React.createFactory(SidebarChatView),
    CalculatorView = require('./calculator.jsx'),
    NotesView = require('./notes'),
    SubmitButtonView = require('./submitButton'),
    OtherCircuitsView = require('./other-circuits'),
    inIframe = require('../../data/shared/in-iframe'),
    EnterUnknownsView = require('./enter-unknowns'),
    VersionView = require('../shared/version'),
    OfflineCheckView = require('../shared/offline-check'),
    TutorialView = require('./tutorial.jsx'),
    config = require('../../config'),
    disableWaitingRoomOverride = window.location.search.indexOf('disableWaitingRoom') !== -1;

module.exports = React.createClass({

  displayName: 'Page',

  getInitialState: function () {
    return {
      inIframe: inIframe(),
      showWaitingRoom: true,
      waitingRoomMessage: null,
      renderedWaitingRoom: false,
      leftWaitingRoom: false,
      tutorialShowing: false,
      allCorrect: false
    };
  },

  getInterface: function () {
    var activity = this.props.activity ? this.props.activity : {};
    return activity.interface || {};
  },

  waitingRoomEnabled: function () {
    return !disableWaitingRoomOverride && this.getInterface().enableWaitingRoom;
  },

  setWaitingRoomInfo: function (slotsRemaining, waitingRoomMessage) {
    var leftWaitingRoom = this.state.leftWaitingRoom || (slotsRemaining === 0),
        interface = this.getInterface(),
        showWaitingRoom = this.waitingRoomEnabled() && (slotsRemaining > 0) && (!leftWaitingRoom || interface.enablePersistentWaitingRoom);
    if (slotsRemaining === 0) {
      this.setState({leftWaitingRoom: true});
    }
    this.setState({
      showWaitingRoom: showWaitingRoom,
      waitingRoomMessage: waitingRoomMessage
    });
  },

  setTutorialShowing: function () {
    this.setState({tutorialShowing: true});
  },

  setAllCorrect: function (allCorrect) {
    this.setState({allCorrect: allCorrect});
  },

  renderWaitingRoom: function () {
    return <div className="waiting-room">
             <div className="waiting-room-background" />
             <div className="waiting-room-message" >
               {this.state.waitingRoomMessage}
             </div>
           </div>;
  },

  render: function() {
    var activity = this.props.activity ? this.props.activity : {},
        interface = activity.interface || {},
        activityName = activity.name ? ': ' + activity.name : '',
        title = this.state.inIframe ? null : (<h1>Teaching Teamwork{ activityName }</h1>),
        hasMultipleClients = activity.clients && (activity.clients.length > 1),
        username = userController.getUsername(),
        groupname = userController.getGroupname(),
        circuit = hasMultipleClients && this.props.circuit ? (<h2>Circuit { this.props.circuit }{ username ? ' (User: ' + username : '' }{ groupname ? ', Group: ' + groupname + ')': ')' }</h2>) : null,
        notes = this.props.client ? (this.props.client.notes || "") : "",
        wrapperClass = hasMultipleClients ? 'multiple-clients' : null,
        enterUnknowns = activity.enterUnknowns && (activity.enterUnknowns.E || activity.enterUnknowns.R),
        image = activity.image ? (<div id="image-wrapper" className={ wrapperClass }><img src={ /^https?:\/\//.test(activity.image) ? activity.image : config.modelsBase + activity.image } />{enterUnknowns ? <EnterUnknownsView activity={activity} model={this.props.model} /> : null}</div>) : null,
        submitButton = this.props.showSubmit && this.props.circuit ? (<SubmitButtonView label={hasMultipleClients ? 'We got it!' : "I got it!"} goals={ this.props.goals } nextActivity={ this.props.nextActivity } enterUnknowns={activity.enterUnknowns} disableForwardNav={interface.disableForwardNav} setAllCorrect={this.setAllCorrect} hasMultipleClients={hasMultipleClients} />) : null,
        otherCircuitsButton = hasMultipleClients && this.props.circuit ? (<OtherCircuitsView circuit={ this.props.circuit } numClients={ activity.clients.length } activityName={ this.props.activityName } groupName={ userController.getGroupname() } classInfoUrl={ userController.getClassInfoUrl() } ttWorkbench={ this.props.ttWorkbench } tutorialShowing={this.state.tutorialShowing} />) : null,
        calculator = this.props.circuit ? (<CalculatorView />) : null,
        chatProps = hasMultipleClients ? $.extend({}, activity, {numClients: activity.clients.length, setWaitingRoomInfo: this.setWaitingRoomInfo, allCorrect: this.state.allCorrect}) : null,
        belowTutorialClassname = "below-tutorial" + (this.state.tutorialShowing ? " below-tutorial-showing" : "");

    return (
      <div className="tt-page">
        <TutorialView ttWorkbench={ this.props.ttWorkbench } enabled={!hasMultipleClients || !this.waitingRoomEnabled() || !this.state.showWaitingRoom} setTutorialShowing={this.setTutorialShowing} />
        <div className={belowTutorialClassname}>
          { title }
          { circuit }
          <OfflineCheckView />
          <div id="top-button-wrapper">
            { submitButton }
            { otherCircuitsButton }
          </div>
          <div id="notes-wrapper" className={ wrapperClass }><NotesView text={ notes } className="tt-notes" breadboard={ this.props.breadboard } /></div>
          <div id="breadboard-and-chat-wrapper" className={ wrapperClass }>
            <div id="breadboard-wrapper" className={ wrapperClass } />
            { hasMultipleClients ? (React.DOM.div({id: "sidebar-chat-wrapper", className: wrapperClass}, SidebarChatViewFactory(chatProps))) : null }
          </div>
          { image }
          { calculator }
          <VersionView/>
        </div>
        { hasMultipleClients && this.waitingRoomEnabled() && this.state.showWaitingRoom ? this.renderWaitingRoom() : null}
      </div>
    );
  }
});
