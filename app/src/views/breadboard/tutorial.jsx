var logController = require('../../controllers/shared/log');

var steps = [
  {title: "Change the resistor", text: "Double-click on the resistor above and use the drop down to select a new resistance value."},
  {title: "Use the multimeter to measure voltage", text: "Move the black and red probes to the leads on either side of the resistor and then look at the measurement in the red multimeter."},
  {title: "Change the mode on the multimeter", text: "Turn the dial on the multimeter to change the scale to measure current or resistance."},
  {title: "View all the circuits", text: "Click the \"View All Circuits\" button near the top of the page to see everyone's circuits.<br>Click the <button>X</button> button at the top of the screen to close the All Circuits pop-up"},
  {title: "Use the calculator", text: "Click the Calculator button and make a quick calculation. Please do not use your own calculator in this activity."},
  {title: "Lift a lead", text: "Lift the lead and place the probe on the loose wire."},
  {title: "Send a chat message", text: "Use the chat area in the right sidebar to send a message."},
  {title: "Have fun and play around!", text: "Try selecting a new type of measurement on the multimeter or clicking the \"Calculator\" or the \"We got it!\" buttons."}
];

var UNSTARTED_STEP = -1;
var STARTING_STEP = 0;

module.exports = React.createClass({

  displayName: 'Tutorial',

  getInitialState: function () {
    return {
      step: UNSTARTED_STEP,
      completed: false,
      blockFreePlay: false,
      liftedLead: false,
      liftedLeadLocation: null
    };
  },

  componentWillReceiveProps: function(nextProps) {
    if ((this.props.ttWorkbench !== nextProps.ttWorkbench) && (this.state.step === UNSTARTED_STEP)) {
      var self = this,
          interface = nextProps.ttWorkbench.interface || {};

      if (interface.showTutorial) {
        self.setState({step: STARTING_STEP});

        var nextStepIfCurrentStepIs = function (testStep, callback) {
          if (self.state.step === testStep) {
            self.setState({completed: true});
            setTimeout(function () {
              self.setState({
                step: testStep + 1,
                completed: false
              });
            }, 2000);
            if (callback) {
              callback();
            }
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
              nextStepIfCurrentStepIs(6, function () {
                if (interface.tutorialFreePlayDuration > 0) {
                  setTimeout(function () {
                    self.setState({blockFreePlay: true});
                  }, interface.tutorialFreePlayDuration * 1000);
                }
              });
          }
        });
      }
    }
  },

  render: function () {
    var step = this.state.step,
        info;

    if (step === UNSTARTED_STEP) {
      return null;
    }

    if (this.state.blockFreePlay) {
      info = <div>
               <div className="tutorial-step-title">Play time is over!</div>
               <div className="tutorial-step-text">Please move on to the next level.</div>
             </div>;
    }
    else {
      info = <div>
               <div className="tutorial-step">Tutorial</div>
               <div className="tutorial-step-title">{this.state.completed ? "✔ " : ""}Step {step + 1} of {steps.length}: {steps[step].title}</div>
               <div className="tutorial-step-text" dangerouslySetInnerHTML={{__html: steps[step].text}}/>
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
