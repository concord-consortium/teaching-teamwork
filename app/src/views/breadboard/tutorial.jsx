var logController = require('../../controllers/shared/log');

var steps = [
  {title: "Change the resistor", text: "Double click on the resistor above and use the drop down to select a new resistance value."},
  {title: "Use the multimeter", text: "Move the black and red probes to the leads on either side of the resistor and then look at the measurement in the red multimeter."},
  {title: "View all the circuits", text: "Click the \"View All Circuits\" button near the top of the page to see everyones circuits."},
  {title: "Send a chat message", text: "Use the chat area in the right sidebar to send a message."},
  {title: "Have fun and play around!", text: "Try moving the probes around or selecting a new type of measurement on the multimeter or click the \"We got it!\" button."}
];

module.exports = React.createClass({

  displayName: 'Tutorial',

  getInitialState: function () {
    return {
      step: -1,
      completed: false,
      blockFreePlay: false
    };
  },

  componentWillReceiveProps: function(nextProps) {
    if ((this.props.ttWorkbench !== nextProps.ttWorkbench) && (this.state.step === -1)) {
      var self = this,
          interface = nextProps.ttWorkbench.interface || {};

      if (interface.showTutorial) {
        self.setState({step: 0});

        var nextStepIfCurrentStepIs = function (testStep, callback) {
          if (self.state.step === testStep) {
            self.setState({completed: true});
            setTimeout(function () {
              self.setState({
                step: testStep + 1,
                completed: false
              });
            }, 1000);
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
              break;
            case "DMM measurement":
              nextStepIfCurrentStepIs(1);
              break;
            case "Closed Zoom View":
              nextStepIfCurrentStepIs(2);
              break;
            case "Sent message":
              nextStepIfCurrentStepIs(3, function () {
                if (interface.tutorialFreePlayDuration > 0) {
                  setTimeout(function () {
                    self.setState({blockFreePlay: true});
                  }, interface.tutorialFreePlayDuration * 1000);
                }
              });
              break;
          }
        });
      }
    }
  },

  render: function () {
    var step = this.state.step,
        info;

    if (step === -1) {
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
               <div className="tutorial-step">Teaching Teamwork Tutorial</div>
               <div className="tutorial-step-title">{this.state.completed ? "✔ " : ""}Step {step + 1} of {steps.length}: {steps[step].title}</div>
               <div className="tutorial-step-text">{steps[step].text}</div>
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
