// adapted from http://thecodeplayer.com/walkthrough/javascript-css3-calculator

var logController = require('../controllers/log');

module.exports = React.createClass({

  displayName: 'Calculator',

  getInitialState: function() {
    this.backspace = String.fromCharCode(8592);
    this.inverse = '1/x';
    this.squareRoot = String.fromCharCode(8730);
    this.equals = '=';
    this.plusMinus = String.fromCharCode(177);

    return {
      input: '',
      open: false,
      evaled: false,
      error: false,
      closeRight: 10,
      closeTop: 10,
      openRight: 10,
      openTop: 10
    };
  },

  open: function (e) {
    logController.logEvent("Opened calculator");
    this.setState({open: true});
    e.preventDefault();
  },

  close: function (e) {
    logController.logEvent("Closed calculator");
    this.setState({open: false});
    e.preventDefault();
  },

  clear: function (e) {
    logController.logEvent("Cleared calculator");
    this.setState({
      input: '',
      evaled: false,
      error: false
    });
    e.preventDefault();
  },

  eval: function (e) {
    var input = this.state.input,
        equation = input.replace(/(\+|\-|\*|\/|\.)$/, ''),
        key = e.target.innerHTML,
        error = false,
        evaled;

    if (equation) {
      if (key === this.inverse) {
        equation = "1/(" + equation + ")";
      }
      else if (key === this.squareRoot) {
        equation = "Math.sqrt(" + equation + ")";
      }
      try {
        evaled = eval(equation);
        error = isNaN(evaled) || !isFinite(evaled);
        if (!error) {
          input = evaled.toString();
        }
        logController.logEvent("Calculation performed", null, {
          "key": key,
          "calculation": equation,
          "result": evaled.toString()
        });
      }
      catch (e) {
        logController.logEvent("Calculation error", null, {
          "key": key,
          "calculation": equation,
          "error": e.toString()
        });
        error = true;
      }
      this.setState({
        input: input,
        evaled: !error,
        error: error
      });
    }

    e.stopPropagation();
    e.preventDefault();
  },

  keyPressed: function (e) {
    var input = this.state.input,
        preInput = input,
        empty = input.length === 0,
        endsWithOperator = input.match(/(\+|\-|\*|\/)$/),
        key = e.target.innerHTML,
        evaled = false;

    // ignore clicks off the buttons
    if (e.target.nodeName !== 'SPAN') {
      return;
    }

    if (key.match(/(\+|\-|\*|\/)/)) {
      if (!empty) {
        if (!endsWithOperator || key == '-') {
          input += key;
        }
        else if (input.length > 1) {
          input = input.replace(/.$/, key);
        }
      }
      else if (empty && key == '-') {
        input += key;
      }
    }
    else if (key == '.') {
      if (!input.match(/\./g) && !this.state.evaled) {
        input += key;
      }
    }
    else if (key === this.backspace) {
      if (!empty && !this.state.error) {
        input = input.substr(0, input.length - 1);
      }
    }
    else if (key === this.plusMinus) {
      if (input.match(/^-/)) {
        input = input.replace(/^-/, '');
      }
      else {
        input = '-' + input;
      }
      evaled = this.state.evaled;
    }
    else if (this.state.evaled) {
      input = key;
    }
    else {
      input += key;
    }

    logController.logEvent("Calculator button pressed", null, {
      "button": key,
      "preCalculation": preInput,
      "postCalculation": input,
      "changed": this.state.input != input
    });

    if (this.state.input != input) {
      this.setState({
        input: input,
        evaled: evaled
      });
    }

    e.preventDefault();
  },

  startDrag: function (e) {
    this.dragging = (this.state.open && (e.target.nodeName != 'SPAN'));
    this.dragged = false;
    if (!this.dragging) {
      return;
    }
    this.startCalculatorPos = {
      right: this.state.openRight,
      top: this.state.openTop,
    };
    this.startMousePos = {
      x: e.clientX,
      y: e.clientY
    };
  },

  drag: function (e) {
    var newPos;
    if (this.dragging) {
      // the calculations are reversed here only because we are setting the right pos and not the left
      newPos = {
        openRight: this.startCalculatorPos.right + (this.startMousePos.x - e.clientX),
        openTop: this.startCalculatorPos.top + (e.clientY - this.startMousePos.y)
      };
      if ((newPos.openRight != this.state.openRight) || (newPos.openTop != this.state.openTop)) {
        this.setState(newPos);
        this.dragged = true;
      }
    }
  },

  endDrag:  function (e) {
    if (this.dragged) {
      logController.logEvent("Calculator dragged", null, {
        "startTop": this.startCalculatorPos.top,
        "startRight": this.startCalculatorPos.right,
        "endTop": this.state.openTop,
        "endRight": this.state.openRight,
      });
      this.dragged = false;
    }
    this.dragging = false;
  },

  render: function() {
    var style = {
      top: this.state.open ? this.state.openTop : this.state.closeTop,
      right: this.state.open ? this.state.openRight : this.state.closeRight
    };

    if (this.state.open) {
      return (
        <div id="calculator" onMouseDown={ this.startDrag } onMouseMove={ this.drag } onMouseUp={ this.endDrag } style={ style }>
          <div className="top very-top">
            <span className="title">Calculator</span>
            <span className="close" onClick={ this.close }>X</span>
          </div>

          <div className="top">
            <span className="clear" onClick={ this.clear }>C</span>
            <div className={ this.state.error ? 'screen screen-error' : 'screen' }>{ this.state.input }</div>
          </div>

          <div className="keys" onClick={ this.keyPressed }>
            <span>7</span>
            <span>8</span>
            <span>9</span>
            <span className="operator">+</span>
            <span className="operator operator-right">{this.backspace}</span>

            <span>4</span>
            <span>5</span>
            <span>6</span>
            <span className="operator">-</span>
            <span className="eval eval-right" onClick={ this.eval }>{this.inverse}</span>

            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span className="operator">/</span>
            <span className="eval eval-right" onClick={ this.eval }>{this.squareRoot}</span>

            <span>0</span>
            <span>.</span>
            <span className="operator">{this.plusMinus}</span>
            <span className="operator">*</span>
            <span className="eval eval-right" onClick={ this.eval }>{this.equals}</span>
          </div>
        </div>
      );
    }
    else {
      return (
        <div id="open-calculator" onClick={ this.open } style={ style }>
          Calculator
        </div>
      );
    }
  }
});
