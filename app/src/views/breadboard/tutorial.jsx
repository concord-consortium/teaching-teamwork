var logController = require('../../controllers/shared/log'),
    laraController = require('../../controllers/shared/lara');

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

var liftedLead = false;
var probeLocation = {
  red: null,
  black: null
};

module.exports = React.createClass({

  displayName: 'Tutorial',

  getInitialState: function () {
    return {
      enabled: false,
      step: UNSTARTED_STEP,
      completed: false,
      inFreePlay: false,
      blockFreePlay: false,
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

    if (enabled && nextProps.ttWorkbench && (this.state.step === UNSTARTED_STEP)) {
      this.startTutorial(nextProps.ttWorkbench);
    }
   },

  startTutorial: function (ttWorkbench) {

    // logged steps are 1-based as that is what is displayed in the UI
    var logStartedStep = function (step) {
      logController.logEvent("Started tutorial step", null, {number: step + 1, title: steps[step].title});
    };
    var logCompletedStep = function (step, timedOut) {
      logController.logEvent("Completed tutorial step", null, {number: step + 1, title: steps[step].title, timedOut: timedOut || false});
    };

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
        tutorialStepPauseDuration = interface.tutorialStepPauseDuration || 2;

    if (interface.showTutorial) {
      var nextStepIfCurrentStepIs = function (currentStep, timedOut) {
        var nextStep = currentStep + 1,
            moveToNextStep = function () {
              resetTimers();
              self.setState({
                step: nextStep,
                completed: false,
                timingOutIn: 0,
                timedOut: false
              });
              logStartedStep(nextStep);
            };

        if (self.state.step === currentStep) {
          resetTimers();
          self.setState({completed: true});
          logCompletedStep(currentStep, timedOut);

          if (nextStep >= steps.length - 1) {
            moveToNextStep();
            self.setState({inFreePlay: true});
            if (tutorialFreePlayDuration > 0) {
              self.setState({timingOutIn: tutorialFreePlayDuration});
              startCountdownInterval();
              waitForAnThen(tutorialFreePlayDuration, function () {
                self.setState({blockFreePlay: true});
                logCompletedStep(nextStep, true);
                laraController.enableForwardNav(true);
              });
            }
          }
          else {
            waitForAnThen(tutorialStepPauseDuration, function () {
              moveToNextStep();
              startStepTimer(nextStep);
            });
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

      var startStepTimer = function (step) {
        var tutorialAboutToTimeoutDuration = interface.tutorialAboutToTimeoutDuration || 5,
            tutorialTimeoutDurationForStepKey = "tutorialTimeoutDurationStep" + (step + 1),
            tutorialTimeoutDuration = interface[tutorialTimeoutDurationForStepKey] || interface.tutorialTimeoutDuration || 30,
            tutorialTimeoutDurationMinusAbout = tutorialTimeoutDuration - tutorialAboutToTimeoutDuration;

        resetTimers();
        if (tutorialTimeoutDurationMinusAbout > 0) {
          tutorialTimeout = waitForAnThen(tutorialTimeoutDurationMinusAbout, function () {
            self.setState({timingOutIn: tutorialAboutToTimeoutDuration});
            startCountdownInterval();

            tutorialAboutToTimeout = waitForAnThen(tutorialAboutToTimeoutDuration, function () {
              self.setState({timedOut: true});
              nextStepIfCurrentStepIs(self.state.step, true);
            });
          });
        }
      };

      var probeIsOnResistorEdge = function (color) {
        return (probeLocation[color] === "c20") || (probeLocation[color] === "c14");
      };

      var checkIfLeadLiftedAndProbesSet = function () {
        if ((self.state.step === 5) && liftedLead && probeIsOnResistorEdge("red") && probeIsOnResistorEdge("black") && (probeLocation.red !== probeLocation.black)) {
          nextStepIfCurrentStepIs(5);
        }
      };

      logController.addLogEventListener(function (data) {
        switch (data.event) {
          case "Changed circuit":
            if (data.parameters.type === "changed component value") {
              nextStepIfCurrentStepIs(0);
            }
            else if (data.parameters.type === "disconnect lead") {
              liftedLead = true;
              checkIfLeadLiftedAndProbesSet();
            }
            break;
          case "Attached probe":
            probeLocation[data.parameters.color] = data.parameters.location;
            checkIfLeadLiftedAndProbesSet();
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

      laraController.enableForwardNav(false, "Please complete the tutorial before moving to the next page.");
      self.setState({step: STARTING_STEP, interface: interface});
      startStepTimer(STARTING_STEP);
      logStartedStep(STARTING_STEP);
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
