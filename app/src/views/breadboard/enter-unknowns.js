var userController = require('../../controllers/shared/user'),
    logController = require('../../controllers/shared/log'),
    AlertView = React.createFactory(require('../shared/alert')),
    div = React.DOM.div,
    p = React.DOM.p,
    strong = React.DOM.strong,
    input = React.DOM.input,
    button = React.DOM.button,
    select = React.DOM.select,
    option = React.DOM.option;

module.exports = React.createClass({

  displayName: 'EnterUnknowns',

  getInitialState: function () {
    return {
      E: '',
      R: '',
      EUnit: '',
      RUnit: '',
      pluralize: this.props.activity.enterUnknowns.E && this.props.activity.enterUnknowns.R,
      eCorrect: false,
      rCorrect: false,
      alert: null
    };
  },

  filterInput: function (currentValue, newValue) {
    newValue = $.trim(newValue);
    if (newValue.length === 0) {
      return '';
    }
    return isNaN(parseInt(newValue, 10)) ? currentValue : newValue;
  },

  eChanged: function () {
    this.setState({E: this.filterInput(this.state.E, this.refs.E.value)});
  },

  rChanged: function () {
    this.setState({R: this.filterInput(this.state.R, this.refs.R.value)});
  },

  eUnitChanged: function () {
    this.setState({EUnit: this.refs.eUnit.value});
  },

  rUnitChanged: function () {
    this.setState({RUnit: this.refs.rUnit.value});
  },

  submit: function () {
    var needE = this.props.activity.enterUnknowns.E,
        haveE = this.state.E.length > 0,
        haveEUnit = this.state.EUnit.length > 0,
        needR = this.props.activity.enterUnknowns.R,
        haveR = this.state.R.length > 0,
        haveRUnit = this.state.RUnit.length > 0,
        eCorrect = false,
        rCorrect = false,
        alert = null;

    eCorrect = this.state.eCorrect || ((this.state.E == this.props.model.E) && (this.state.EUnit == 'volts'));
    rCorrect = this.state.rCorrect || ((this.state.R == this.props.model.R) && (this.state.RUnit== 'ohms'));
    if ((needE && !eCorrect) && (needR && !rCorrect)) {
      alert = "Sorry, both of your E and R values or units are incorrect";
    }
    else if (needE && !eCorrect) {
      alert = "Sorry, your E value or unit is incorrect";
    }
    else if (needR && !rCorrect) {
      alert = "Sorry, your R value or unit is incorrect";
    }

    this.setState({
      eCorrect: eCorrect,
      rCorrect: rCorrect,
      alert: alert
    });

    userController.setUnknownValues({
      E: {
        value: this.state.E,
        have: haveE && haveEUnit,
        correct: eCorrect
      },
      R: {
        value: this.state.R,
        have: haveR && haveRUnit,
        correct: rCorrect
      }
    });

    logController.logEvent("Unknown Values Submitted", null, {
      'E: Need': needE,
      'E: Have Value': needE && haveE,
      'E: Have Unit': needE && haveEUnit,
      'E: Value': this.state.E,
      'E: Unit': this.state.EUnit,
      'E: Correct Value': this.props.model.E,
      'E: Correct': eCorrect,
      'R: Need': needR,
      'R: Have Value': needR && haveR,
      'R: Have Unit': needR && haveRUnit,
      'R: Value': this.state.R,
      'R: Unit': this.state.RUnit,
      'R: Correct Value': this.props.model.R,
      'R: Correct': rCorrect
    });
  },

  pluralize: function (text) {
    return this.state.pluralize ? text + 's' : text;
  },

  closeAlert: function () {
    this.setState({alert: null});
  },

  renderUnknown: function (component, correct, onValueChange, onUnitChange) {
    var units = [
          option({key: 'none', value: ''}, ''),
          option({key: 'volts', value: 'volts'}, 'volts'),
          option({key: 'ohms', value: 'ohms'}, 'ohms')
        ];
    if (correct) {
      return p({}, component + ': ' + this.props.model[component] + ' ' + (component == 'E' ? 'volts' : 'ohms'));
    }
    return p({}, component + ': ', input({ref: component, value: this.state[component], onChange: onValueChange}), select({ref: component.toLowerCase(component) + 'Unit', value: this.state[component + 'Unit'], onChange: onUnitChange}, units));
  },

  render: function () {
    var showMessage = (!this.props.activity.enterUnknowns.E || this.state.eCorrect) && (!this.props.activity.enterUnknowns.R || this.state.rCorrect);
    return div({id: 'enter-unknowns'},
      p({}, strong({}, "Enter Unknown " + this.pluralize("Value"))),
      this.props.activity.enterUnknowns.E ? this.renderUnknown('E', this.state.eCorrect, this.eChanged, this.eUnitChanged) : null,
      this.props.activity.enterUnknowns.R ? this.renderUnknown('R0', this.state.rCorrect, this.rChanged, this.rUnitChanged) : null,
      showMessage ? p({}, "You have entered the correct " + this.pluralize("value") + " and " + this.pluralize("unit") + ".") : button({onClick: this.submit}, "Submit Unknown " + this.pluralize("Value")),
      this.state.alert ? AlertView({message: this.state.alert, onClose: this.closeAlert}) : null
    );
  }
});
