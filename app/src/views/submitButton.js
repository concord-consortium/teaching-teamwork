var userController = require('../controllers/user'),
    logController = require('../controllers/log'),
    SubmitButton, Popup;

module.exports = SubmitButton = React.createClass({

  displayName: 'SubmitButton',

  getInitialState: function () {
    return {
      submitted: null,
      allCorrect: false,
      goalValues: {},
      closePopup: false,
      nextActivity: this.props.nextActivity
    };
  },

  componentWillMount: function () {
    var self = this;

    userController.onGroupRefCreation(function() {
      var otherClients, i, updateFromClient;

      // listen for submits
      self.submitRef = userController.getFirebaseGroupRef().child("submitted");
      self.submitRef.on("value", function(dataSnapshot) {
        var submitValue = dataSnapshot.val(),
            skew = userController.getServerSkew(),
            now = (new Date().getTime()) + skew;

        // ignore submits over 10 seconds old
        if (submitValue && (submitValue.at < now - (10 * 1000))) {
          return;
        }

        // get the measurements and create the popup data
        self.getPopupData(function (table, allCorrect) {
          self.setState({
            submitted: submitValue,
            table: table,
            allCorrect: allCorrect,
            closePopup: false
          });
        });
      });

      // recalculate table on client updates
      updateFromClient = function() {
        self.getPopupData(function (table, allCorrect) {
          self.setState({
            table: table,
            allCorrect: allCorrect,
          });
        });
      };

      // listen for client updates
      self.clientListRef = userController.getFirebaseGroupRef().child('clients');
      otherClients = userController.getOtherClientNos();
      for (i = 0; i < otherClients.length; i++) {
        self.clientListRef.child(otherClients[i]).on("value", updateFromClient);
      }
    });
  },

  componentWillUnmount: function() {
    this.submitRef.off();
    this.clientListRef.off();
  },

  getMeasurement: function (client, measurement, callback) {
    var bc = sparks.workbenchController.breadboardController,
        matches = measurement.match(/^((component_)([^\(]+)\(([^\)]+)\))|(([^\(]+)\(([^,]+),([^\)]+)\))$/),
        // see: http://regexper.com/#%5E((component_)(%5B%5E%5C(%5D%2B)%5C((%5B%5E%5C)%5D%2B)%5C))%7C((%5B%5E%5C(%5D%2B)%5C((%5B%5E%2C%5D%2B)%2C(%5B%5E%5C)%5D%2B)%5C))%24
        renameConnection = function (s) {
          return s.replace(/[abcdefghij](\d)/g, "L$1");
        },
        type, component, c1, c2;

    if (matches) {
      if (matches[1]) {
        type = matches[3];
        component = bc.getComponents()[matches[4]];
        if (!component || !component.connections) {
          return callback(0);
        }
        c1 = component.connections[0].name;
        c2 = component.connections[1].name;
      }
      else {
        type = matches[6];
        c1 = client + ':' + renameConnection(matches[7]);
        c2 = client + ':' + renameConnection(matches[8]);
      }

      bc.query(type, c1 + ',' + c2, function (ciso) {
        var result = 0,
            p1, p2, v1, v2, current;

        if (ciso) {
          p1 = bc.getHole(c1).nodeName();
          p2 = bc.getHole(c2).nodeName();

          if (type === "resistance") {
            if (p1 != p2) {
              current = ciso.getCurrent('ohmmeterBattery');
              result = 1 / current.magnitude;
            }
          }
          else {
            v1 = ciso.getVoltageAt(p1);
            v2 = ciso.getVoltageAt(p2);

            if (v1 && v2) {
              switch (type) {
                case "voltage":
                  result = v1.real - v2.real;
                  break;
                case "ac_voltage":
                  result = v1.subtract(v2).magnitude;
                  break;
                case "current":
                  result = v1.subtract(v2).magnitude / 1e-6;
                  break;
              }
            }
          }
        }

        result = Math.round(result*Math.pow(10,2))/Math.pow(10,2);

        callback(result);
      });
    }
    else {
      callback(0);
    }
  },

  getPopupData: function (callback) {
    var self = this,
        queue = [],
        table = [],
        allCorrect = true,
        logParams = {},
        client, goalName, processQueue;

    // gather the goal names into a queue for async processing
    for (client = 0; client < this.props.goals.length; client++) {
      for (goalName in this.props.goals[client]) {
        if (this.props.goals[client].hasOwnProperty(goalName)) {
          queue.push({
            client: client,
            name: goalName,
            goal: this.props.goals[client][goalName]
          });
        }
      }
    }

    // drain the queue
    processQueue = function () {
      var item = queue.shift(),
          goal = item ? item.goal : null;

      if (item) {
        self.getMeasurement(item.client, item.goal.measurement, function (clientValue) {
          var units, tolerance, absGoalValue, absClientGoalValue, correct;

          units = goal.units || '';

          tolerance = goal.value * (goal.tolerance || 0);
          tolerance = Math.round(tolerance * Math.pow(10,4)) / Math.pow(10,4);

          absGoalValue = Math.abs(goal.value);
          absClientGoalValue = Math.abs(clientValue);

          correct = (absClientGoalValue >= (absGoalValue - tolerance)) && (absClientGoalValue <= (absGoalValue + tolerance));

          table.push({
            correct: (correct ? 'Yes' : 'No'),
            correctClass: (correct ? 'correct' : 'incorrect'),
            client: item.client,
            goal: item.name,
            goalValue: absGoalValue + units,
            currentValue: absClientGoalValue + units
          });

          logParams[item.name + ': Goal'] = absGoalValue;
          logParams[item.name + ': Measured'] = absClientGoalValue;

          allCorrect = allCorrect && correct;

          processQueue();
        });
      }
      else {
        logController.logEvent(allCorrect ? "Goals met" : "Goals not met", null, logParams);
        callback(table, allCorrect);
      }
    };
    processQueue();
  },

  submitClicked: function (e) {
    var self = this,
        username = userController.getUsername();

    e.preventDefault();

    // if in solo mode then just populate the table
    if (!this.submitRef) {
      this.getPopupData(function (table, allCorrect) {
        self.setState({
          submitted: true,
          table: table,
          allCorrect: allCorrect,
          closePopup: false
        });
      });
    }
    else {
      // add the submit - this will trigger our submitRef watcher
      this.submitRef.set({
        user: username,
        at: Firebase.ServerValue.TIMESTAMP
      });
    }
    logController.logEvent("Submit clicked", username);
  },

  popupButtonClicked: function () {
    logController.logEvent("Submit close button clicked", this.state.allCorrect ? 'done' : 'resume');

    if (this.state.allCorrect) {
      window.location = 'http://concord.org/projects/teaching-teamwork/activities2';
    }
    else {
      this.setState({closePopup: true});
    }
  },

  statics: {
    showPopup: function(props, multipleClients, buttonClicked) {
      var $anchor = $('#submit-popup'),
          closePopup = function (e) {
            e.preventDefault();
            SubmitButton.closePopup();
            buttonClicked();
          };

      if (!$anchor.length) {
        $anchor = $('<div id="submit-popup" class="modalDialog"></div>').appendTo('body');
      }

      setTimeout(function() {
        $anchor[0].style.opacity = 1;
      }, 100);

      return React.render(Popup({
        table: props.table,
        waiting: props.waiting,
        allCorrect: props.allCorrect,
        nextActivity: props.nextActivity,
        multipleClients: multipleClients,
        buttonClicked: closePopup,
      }), $anchor.get(0));
    },

    closePopup: function () {
      var $anchor = $('#submit-popup');
      React.unmountComponentAtNode($anchor.get(0));
      $anchor.remove();
    }
  },

  render: function () {
    var self = this;

    setTimeout(function () {
      if (self.state.submitted && !self.state.closePopup) {
        SubmitButton.showPopup(self.state, self.props.goals.length > 1, self.popupButtonClicked);
      }
      else {
        SubmitButton.closePopup();
      }
    });

    return React.DOM.div({className: 'submit-button-wrapper'},
      React.DOM.button({onClick: this.submitClicked}, this.props.label || 'Submit')
    );
  },

});

Popup = React.createFactory(React.createClass({
  displayName: 'Popup',

  render: function () {
    var circuitRows = [],
      th = React.DOM.th,
      td = React.DOM.td,
      i, row, title, label;

    circuitRows.push(React.DOM.tr({key: 'header'},
      this.props.multipleClients ? th({}, 'Circuit') : null,
      th({}, 'Goal'),
      th({}, 'Goal Value'),
      th({}, 'Measured Value'),
      th({}, 'Correct')
    ));

    for (i = 0; i < this.props.table.length; i++) {
      row = this.props.table[i];
      circuitRows.push(React.DOM.tr({key: i},
        this.props.multipleClients ? td({}, row.client + 1) : null,
        td({}, row.goal),
        td({}, row.goalValue),
        td({}, row.currentValue),
        td({className: row.correctClass}, row.correct)
      ));
    }

    if (this.props.allCorrect) {
      title = 'All Goals Are Correct!';
      label = this.props.nextActivity ? this.props.nextActivity : 'All Done!';
    }
    else {
      title = 'Some Goals Have Not Been Met';
      label = 'Keep Trying...';
    }

    return React.DOM.div({className: 'submit-button-popup'},
      React.DOM.h1({}, title),
      (this.props.allCorrect ? React.DOM.table({}, React.DOM.tbody({}, circuitRows)) : React.DOM.p({}, "At least one of your team's voltage drops doesn't match that player's goal. Try again.")),
      React.DOM.button({onClick: this.props.buttonClicked}, label)
    );
  }
}));
