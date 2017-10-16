var logController = require('../../controllers/shared/log');

var chatText = function (interface) {
  if (interface.enableChatType) {
    return "Use the chat area in the right sidebar to select a message type and then send a message.";
  }
  return "Use the chat area in the right sidebar to send a message.";
};

var steps = [
  {title: "Change the resistor", text: "Double-click on the resistor above and use the drop down to select a new resistance value."},
  {title: "Use the multimeter to measure voltage", text: "Move the black and red probes to the leads on either side of the resistor and then look at the measurement in the red multimeter."},
  {title: "Change the mode on the multimeter", text: "Turn the dial on the multimeter to change the scale to measure current or resistance."},
  {title: "View all the circuits", text: "Click the \"View All Circuits\" button near the top of the page to see everyone's circuits.<br>Click the <button>X</button> button at the top of the All Circuits pop-up to close it."},
  {title: "Use the calculator", text: "Click the Calculator button and make a quick calculation. Please do not use your own calculator in this activity."},
  {title: "Lift a lead", text: "Lift the lead and place the probe on the loose wire."},
  {title: "Send a chat message", textFn: chatText},
  {title: "Have fun and play around!", text: "Try selecting a new type of measurement on the multimeter or the \"We got it!\" button."}
];

var UNSTARTED_STEP = -1;
var STARTING_STEP = 0;

var countdownInterval;
var tutorialTimeout;
var tutorialAboutToTimeout;

module.exports = React.createClass({

  displayName: 'Tutorial',

  getInitialState: function () {
    return {
      enabled: false,
      step: UNSTARTED_STEP,
      completed: false,
      inFreePlay: false,
      blockFreePlay: false,
      liftedLead: false,
      liftedLeadLocation: null,
      timingOutIn: 0,
      timedOut: false,
      interface: {}
    };
  },

  componentWillReceiveProps: function(nextProps) {
    var enabled = this.state.enabled;

    if (nextProps.enabled && !this.state.enabled) {
      enabled = true;
      this.setState({enabled: true});
    }

    if (enabled && this.nextProps.ttWorkbench && (this.state.step === UNSTARTED_STEP)) {
      this.startTutorial(nextProps.ttWorkbench);
    }
   },

  startTutorial: function (ttWorkbench) {

    var waitForAnThen = function (seconds, callback) {
      return setTimeout(callback, seconds * 1000);
    };

    var resetTimers = function () {
      clearInterval(countdownInterval);
      clearTimeout(tutorialTimeout);
      clearTimeout(tutorialAboutToTimeout);
    };

    var self = this,
        interface = ttWorkbench.interface || {},
        tutorialFreePlayDuration = interface.tutorialFreePlayDuration || 0,
        tutorialStepPauseDuration = interface.tutorialStepPauseDuration || 2,
        tutorialAboutToTimeoutDuration = interface.tutorialAboutToTimeoutDuration || 5,
        tutorialTimeoutDuration = (interface.tutorialTimeoutDuration || 30) - tutorialAboutToTimeoutDuration;

    if (interface.showTutorial) {
      var nextStepIfCurrentStepIs = function (testStep, callback) {
        var nextStep = testStep + 1,
            moveToNextStep = function () {
              resetTimers();
              self.setState({
                step: nextStep,
                completed: false,
                timingOutIn: 0,
                timedOut: false
              });
            };

        if (self.state.step === testStep) {
          resetTimers();
          self.setState({completed: true});

          if (nextStep >= steps.length - 1) {
            moveToNextStep();
            self.setState({inFreePlay: true});
            if (tutorialFreePlayDuration > 0) {
              self.setState({timingOutIn: tutorialFreePlayDuration});
              startCountdownInterval();
              waitForAnThen(tutorialFreePlayDuration, function () {
                self.setState({blockFreePlay: true});
              });
            }
          }
          else {
            waitForAnThen(tutorialStepPauseDuration, function () {
              moveToNextStep();
              startStepTimer();
            });
          }

          if (callback) {
            callback();
          }
        }
      };

      var startCountdownInterval = function () {
        clearInterval(countdownInterval);
        countdownInterval = setInterval(function () {
          if (self.state.timingOutIn > 0) {
            self.setState({timingOutIn: self.state.timingOutIn - 1});
          }
          else {
            clearInterval(countdownInterval);
          }
        }, 1000);
      };

      var startStepTimer = function () {
        resetTimers();
        if (tutorialTimeoutDuration > 0) {
          tutorialTimeout = waitForAnThen(tutorialTimeoutDuration, function () {
            self.setState({timingOutIn: tutorialAboutToTimeoutDuration});
            startCountdownInterval();

            tutorialAboutToTimeout = waitForAnThen(tutorialAboutToTimeoutDuration, function () {
              self.setState({timedOut: true});
              nextStepIfCurrentStepIs(self.state.step);
            });
          });
        }
      };

      logController.addLogEventListener(function (data) {
        switch (data.event) {
          case "Changed circuit":
            if (data.parameters.type === "changed component value") {
              nextStepIfCurrentStepIs(0);
            }
            else if (data.parameters.type === "disconnect lead") {
              if (self.state.step === 5) {
                self.setState({liftedLead: true, liftedLeadLocation: data.parameters.location});
              }
            }
            break;
          case "Attached probe":
            if ((self.state.step === 5) && self.state.liftedLead && (data.parameters.location === self.state.liftedLeadLocation)) {
              nextStepIfCurrentStepIs(5);
            }
            break;
          case "DMM measurement":
            nextStepIfCurrentStepIs(1);
            break;
          case "Moved DMM dial":
            nextStepIfCurrentStepIs(2);
            break;
          case "Closed Zoom View":
            nextStepIfCurrentStepIs(3);
            break;
          case "Calculation performed":
            nextStepIfCurrentStepIs(4);
            break;
          case "Sent message":
            nextStepIfCurrentStepIs(6);
        }
      });

      self.setState({step: STARTING_STEP, interface: interface});
      startStepTimer();
    }
  },

  render: function () {
    var step = this.state.step,
        timeoutMessage = "&nbsp;",
        info, plural, prefix, stepText;

    if (!this.state.enabled || (step === UNSTARTED_STEP)) {
      return null;
    }

    if (this.state.blockFreePlay) {
      info = <div>
               <div className="tutorial-step-title">Practice time is over.</div>
               <div className="tutorial-step-text">Click "Next" to begin the activity.</div>
             </div>;
    }
    else {
      if (!this.state.completed && (this.state.timingOutIn > 0)) {
        plural = this.state.timingOutIn === 1 ? "" : "s";
        if (this.state.inFreePlay) {
          timeoutMessage = "You have " + this.state.timingOutIn + " second" + plural + " to play around.";
        }
        else {
          timeoutMessage = "This step will time out in " + this.state.timingOutIn + " second" + plural + " and will automatically move to the next step.";
        }
      }
      prefix = this.state.completed ? (this.state.timedOut ? "✗ " : "✔ ") : "";
      stepText = steps[step].textFn ? steps[step].textFn(this.state.interface) : steps[step].text;
      info = <div>
               <div className="tutorial-step">Tutorial</div>
               <div className="tutorial-step-title">{prefix}Step {step + 1} of {steps.length}: {steps[step].title}</div>
               <div className="tutorial-step-text" dangerouslySetInnerHTML={{__html: stepText}}/>
               {timeoutMessage ? <div className="tutorial-timeout-text" dangerouslySetInnerHTML={{__html: timeoutMessage}}/> : null}
             </div>;
    }

    return (
      <div className={this.state.blockFreePlay ? "tutorial-block-free-play" : "tutorial"}>
        <div className="tutorial-background"></div>
        <div className="tutorial-info">{info}</div>
      </div>
    );
  },

});
