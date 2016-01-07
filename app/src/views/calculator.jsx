// adapted from http://thecodeplayer.com/walkthrough/javascript-css3-calculator
/*jslint evil: true */

var logController = require('../controllers/log');

module.exports = React.createClass({

  displayName: 'Calculator',

  getInitialState: function() {
    this.inverse = '1/x';
    this.squareRoot = String.fromCharCode(8730);
    this.equals = '=';

    return {
      input: '',
      open: false,
      evaled: false,
      error: false,
      memory: "",
      mrcPressedOnce: false,
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
      error: false,
      mrcPressedOnce: false
    });
    e.preventDefault();
  },

  eval: function (e) {
    var input = this.state.input,
        equation = input.replace(/(\+|\-|\*|\/|\.)$/, '')     // lop off any remaining ops at end.
                        .replace(/÷/g, '/')                   // replace visually-nice symbols with actual
                        .replace(/–/g, '-')
                        .replace(/x/g, '*'),
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
      catch (err) {
        logController.logEvent("Calculation error", null, {
          "key": key,
          "calculation": equation,
          "error": err.toString()
        });
        error = true;
      }
      this.setState({
        input: input,
        evaled: !error,
        error: error,
        mrcPressedOnce: false
      });
    }

    e.stopPropagation();
    e.preventDefault();
  },

  mrcPressed: function (e) {
    if (!this.state.mrcPressedOnce) {
      var input = this.state.input,
          endsWithOperator = input.match(/(\+|–|x|÷)$/),
          evaled = false;
      if (endsWithOperator) {
        input += this.state.memory;
      } else {
        input = this.state.memory;
        evaled = true;
      }

      this.setState({
        input: input,
        mrcPressedOnce: true,
        evaled: evaled
      });
    } else {
      this.setState({
        memory: "",
        mrcPressedOnce: false
      });
    }

    e.stopPropagation();
    e.preventDefault();
  },

  mplusPressed: function() {
    var evaled = this.state.evaled,
        input = this.state.input,
        containsOperator = input.match(/(\+|–|x|÷)/),
        memory = this.state.memory;
    if (evaled || !containsOperator) {
      if (memory) {
        memory = (parseFloat(memory) + parseFloat(input)).toString();
      } else {
        memory = input;
      }
    }

    this.setState({
      memory: memory,
      mrcPressedOnce: false
    });
  },

  keyPressed: function (e) {
    var input = this.state.input,
        preInput = input,
        empty = input.length === 0,
        endsWithOperator = input.match(/(\+|–|x|÷)$/),
        key = e.target.innerHTML,
        evaled = false;

    // ignore clicks off the buttons
    if (e.target.nodeName !== 'SPAN') {
      return;
    }

    if (key.match(/(\+|–|x|÷)/)) {
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
      if (!input.match(/\.\d*$/g) && !this.state.evaled) {
        input += key;
      }
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
        evaled: evaled,
        mrcPressedOnce: false
      });
    }

    e.preventDefault();
  },

  keyboardChange: function (e) {
    var newValue = e.target.value;

    // only allow keyboard updates that match the following format:
    // start with a number or period, and contains only numbers, periods, or operators
    if (/^(\d|\.)(\d|\.|\+|-|–|\/|÷|\*|x)*$/.test(newValue) || !newValue) {
      // update the expression to use our pretty operators
      newValue = newValue.replace(/\//g, '÷')
                  .replace(/-/g, '–')
                  .replace(/\*/g, 'x');
      this.setState({
        input: newValue,
        evaled: false,
        mrcPressedOnce: false
      });
    }
  },

  keyboardPress: function(e) {
    if (e.key == "Enter") {
      this.eval(e);
    }
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

  endDrag:  function () {
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
        },
        mShowing = !!this.state.memory,
        mClass = "memory" + (mShowing ? "" : " hidden");

    if (this.state.open) {
      return (
        <div id="calculator" onMouseDown={ this.startDrag } onMouseMove={ this.drag } onMouseUp={ this.endDrag } style={ style }>
          <div className="top very-top">
            <span className="close" onClick={ this.close }>X</span>
          </div>

          <div className="top">
            <div className={ mClass }>M</div>
            <input className={ this.state.error ? 'screen screen-error' : 'screen' } value={ this.state.input } onChange={ this.keyboardChange } onKeyPress={ this.keyboardPress }></input>
          </div>

          <div className="topRow">
            <span className="clear" onClick={ this.clear }>C</span>
            <span className="memory" onClick={ this.mrcPressed }>MRC</span>
            <span className="memory" onClick={ this.mplusPressed }>M+</span>
            <span className="eval squareroot" onClick={ this.eval }>{this.squareRoot}</span>
            <span className="eval" onClick={ this.eval }>{this.inverse}</span>
          </div>

          <div className="keys" onClick={ this.keyPressed }>

            <span>7</span>
            <span>8</span>
            <span>9</span>
            <span className="operator">+</span>

            <span>4</span>
            <span>5</span>
            <span>6</span>
            <span className="operator">–</span>

            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span className="operator">÷</span>

            <span>0</span>
            <span>.</span>
            <span className="eval" onClick={ this.eval }>{this.equals}</span>
            <span className="operator multiply">x</span>
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
