/* global math: false */

var logController = require('../controllers/log'),
    HelpTab, HistoryTab, HistoryItem;

module.exports = React.createClass({
  displayName: 'MathPad',

  getInitialState: function () {
    return {
      open: false,
      closeRight: 10,
      closeTop: 10,
      openRight: 25,
      openTop: 25,
      output: null,
      history: [],
      showHelp: true
    };
  },

  componentDidUpdate: function () {
    this.focus();
  },

  evalute: function (input) {
    var output,
        error = function (isError, text) {
          logController.logEvent("MathPad calculation performed", null, {
            "input": input,
            "output": text,
            "error": isError
          });
          return {error: isError, text: text};
        };
    if (!math || !math.eval) {
      return error(true, 'math.js needs to be included in html file');
    }
    if (input.length === 0) {
      return null;
    }
    try {
      output = math.eval(input, {});
      if (typeof output != 'number') {
        return error(true, 'Unexpected end of expression');
      }
      return error(false, output);
    }
    catch (e) {
      return error(true, e.message.replace(/\(char [^)]+\)/, ''));
    }
  },

  getInput: function () {
    return this.refs.input ? this.refs.input.getDOMNode() : null;
  },

  focus: function (clear) {
    var input = this.getInput();
    if (!input) {
      return;
    }
    if (clear) {
      input.value = '';
    }
    input.focus();
  },

  keyup: function (e) {
    var input = this.getInput().value.replace(/^\s+|\s+$/, ''),
        output = this.evalute(input),
        history;

    if ((e.keyCode == 13) && (input.length > 0)) {
      if (!output.error) {
        history = this.state.history.slice(0);
        history.push({
          input: input,
          output: output,
        });
        this.setState({
          output: null,
          history: history,
          showHelp: false
        });
        logController.logEvent("MathPad item added to history", null, {
          "input": input,
          "output": output.text
        });
        this.focus(true);
      }
    }
    else {
      this.setState({output: output});
    }
  },

  helpTabClicked: function () {
    this.setState({showHelp: true});
    this.focus();
  },

  historyTabClicked: function () {
    this.setState({showHelp: false});
    this.focus();
  },

  historyItemClicked: function (text) {
    var input = this.getInput(),
        startPos, endPos;

    // adapted from http://jsfiddle.net/Znarkus/Z99mK/
    if (document.selection) {
      input.focus();
      document.selection.createRange().text = text;
    }
    else if (input.selectionStart || input.selectionStart === 0) {
      startPos = input.selectionStart;
      endPos = input.selectionEnd;
      input.value = input.value.substring(0, startPos) + text + input.value.substring(endPos, input.value.length);
      input.selectionStart = startPos + text.length;
      input.selectionEnd = startPos + text.length;
    }
    else {
      input.value += text;
    }

    logController.logEvent("MathPad history item clicked", null, {
      "item": text
    });

    input.focus();
  },

  startDrag: function (e) {
    var self = this,
      dragging = true,
      dragged = false,
      startCalculatorPos = {
        right: this.state.openRight,
        top: this.state.openTop,
      },
      startMousePos = {
        x: e.clientX,
        y: e.clientY
      },
      mousemove, mouseup;

    mousemove = function (e) {
      var newPos;
      if (dragging) {
        // the calculations are reversed here only because we are setting the right pos and not the left
        newPos = {
          openRight: startCalculatorPos.right + (startMousePos.x - e.clientX),
          openTop: startCalculatorPos.top + (e.clientY - startMousePos.y)
        };
        if ((newPos.openRight != self.state.openRight) || (newPos.openTop != self.state.openTop)) {
          self.setState(newPos);
          dragged = true;
        }
      }
    };

    mouseup = function () {
      if (dragged) {
        logController.logEvent("MathPad dragged", null, {
          "startTop": startCalculatorPos.top,
          "startRight": startCalculatorPos.right,
          "endTop": self.state.openTop,
          "endRight": self.state.openRight,
        });
        dragged = false;
      }
      dragging = false;

      if (window.removeEventListener) {
        window.removeEventListener('mousemove', mousemove);
        window.removeEventListener('mouseup', mouseup);
      }
      else {
        window.detactEvent('onmousemove', mousemove);
        window.detactEvent('onmouseup', mouseup);
      }

      self.focus();
    };

    if (window.addEventListener) {
      window.addEventListener('mousemove', mousemove, false);
      window.addEventListener('mouseup', mouseup, false);
    }
    else {
      window.attachEvent('onmousemove', mousemove);
      window.attachEvent('onmouseup', mouseup);
    }
  },

  open: function (e) {
    logController.logEvent("Opened MathPad");
    this.setState({open: true});
    e.preventDefault();
  },

  close: function (e) {
    logController.logEvent("Closed MathPad");
    this.setState({open: false});
    e.preventDefault();
  },

  render: function () {
    var output, outputClass, style;

    outputClass = 'output';
    if (this.state.output !== null) {
      if (this.state.output.error) {
        outputClass += ' output-error';
        output = this.state.output.text;
      }
      else {
        output = 'Result: ' + this.state.output.text;
      }
    }
    else {
      output = 'Please enter a math expression above';
    }

    style = {
      top: this.state.open ? this.state.openTop : this.state.closeTop,
      right: this.state.open ? this.state.openRight : this.state.closeRight
    };

    if (this.state.open) {
      return <div className='mathpad mathpad-open' style={style}>
        <div className='title' onMouseDown={this.startDrag} >
          MathPad
          <span className='close' onClick={this.close}>X</span>
        </div>
        <div className='tabs'>
          <div onClick={this.helpTabClicked} className={'tab ' + (this.state.showHelp ? 'active' : 'inactive')}>Help</div>
          <div onClick={this.historyTabClicked} className={'tab ' + (!this.state.showHelp ? 'active' : 'inactive')}>History{this.state.history.length > 0 ? ' (' + this.state.history.length + ')' : ''}</div>
        </div>
        {this.state.showHelp ? <HelpTab /> : <HistoryTab history={this.state.history} itemClicked={this.historyItemClicked} />}
        <div className='input'>
          <input ref='input' onKeyUp={this.keyup} />
        </div>
        <div className={outputClass}>{output}</div>
      </div>;
    }
    else {
      return <div className='mathpad mathpad-closed' onClick={this.open} style={style}>MathPad</div>;
    }
  }
});

HelpTab = React.createClass({
  shouldComponentUpdate: function () {
    return false;
  },

  render: function () {
    return <div className='help'>
      <div className='intro'>
        <p>
          Enter an math expression and it will be solved as you type it.  To save it in the history hit the "Enter" key.  To recall an item from this history just click on it.
        </p>
        <p>
          You can enter either calculations like this: "1 + 1" or formulas like this: "sin(e)/cos(1) + 1".  A list of constants and functions are shown below.
        </p>
      </div>
      <div className='header'>Constants</div>
      <table>
        <tbody>
          <tr>
            <td><code>e</code>, <code>E</code></td>
            <td>Euler's number, the base of the natural logarithm.</td>
          </tr>
          <tr>
            <td><code>LN2</code></td>
            <td>Returns the natural logarithm of 2.</td>
          </tr>
          <tr>
            <td><code>LN10</code></td>
            <td>Returns the natural logarithm of 10.</td>
          </tr>
          <tr>
            <td><code>LOG2E</code></td>
            <td>Returns the base-2 logarithm of E.</td>
          </tr>
          <tr>
            <td><code>LOG10E</code></td>
            <td>Returns the base-10 logarithm of E.</td>
          </tr>
          <tr>
            <td><code>phi</code></td>
            <td>Phi is the golden ratio. Two quantities are in the golden ratio if their
            ratio is the same as the ratio of their sum to the larger of the two quantities.
            Phi is defined as <code>(1 + sqrt(5)) / 2</code></td>
          </tr>
          <tr>
            <td><code>pi</code>, <code>PI</code></td>
            <td>The number pi is a mathematical constant that is the ratio of a circle\'s
            circumference to its diameter.</td>
          </tr>
          <tr>
            <td><code>SQRT1_2</code></td>
            <td>Returns the square root of 1/2.</td>
          </tr>
          <tr>
            <td><code>SQRT2</code></td>
            <td>Returns the square root of 2.</td>
          </tr>
          <tr>
            <td><code>tau</code></td>
            <td>Tau is the ratio constant of a circle\'s circumference to radius, equal to
            <code>2 * pi</code>.</td>
          </tr>
        </tbody>
      </table>

      <div className='header'>Functions</div>
      <table>
        <tbody>
          <tr>
            <td><code>abs(x)</code></td>
            <td>Returns the absolute value of a number.</td>
          </tr>
          <tr>
            <td><code>acos(x)</code></td>
            <td>Returns the arccosine of a number.</td>
          </tr>
          <tr>
            <td><code>asin(x)</code></td>
            <td>Returns the arcsine of a number.</td>
          </tr>
          <tr>
            <td><code>atan(x)</code></td>
            <td>Returns the arctangent of a number.</td>
          </tr>
          <tr>
            <td><code>atan2(y, x)</code></td>
            <td>Returns the inverse tangent function with two arguments</td>
          </tr>
          <tr>
            <td><code>cos(x)</code></td>
            <td>Returns the cosine of a number.</td>
          </tr>
          <tr>
            <td><code>log(x)</code></td>
            <td>Returns the natural logarithm (loge, also ln) of a number.</td>
          </tr>
          <tr>
            <td><code>round(x)</code></td>
            <td>Returns the value of a number rounded to the nearest integer.</td>
          </tr>
          <tr>
            <td><code>sin(x)</code></td>
            <td>Returns the sine of a number.</td>
          </tr>
          <tr>
            <td><code>sqrt(x)</code></td>
            <td>Returns the positive square root of a number.</td>
          </tr>
          <tr>
            <td><code>tan(x)</code></td>
            <td>Returns the tangent of a number.</td>
          </tr>
        </tbody>
      </table>
    </div>;
  }
});

HistoryTab = React.createClass({

  componentDidUpdate: function (prevProps) {
    // if history changed then scroll to the bottom
    if ((JSON.stringify(prevProps.history) != JSON.stringify(this.props.history))) {
      var history = this.refs.history ? this.refs.history.getDOMNode() : null;
      if (history) {
        history.scrollTop = history.scrollHeight;
      }
    }
  },

  render: function () {
    var historyItems = [],
        i;
    if (this.props.history.length > 0) {
      for (i = 0; i < this.props.history.length; i++) {
        historyItems.push(<HistoryItem item={this.props.history[i]} key={i} itemClicked={this.props.itemClicked} />);
      }
    }
    return <div className='history' ref='history'>{historyItems.length > 0 ? historyItems : 'Press enter after entering an expression below to move it to the history...'}</div>;
  }
});

HistoryItem = React.createClass({
  displayName: 'HistoryItem',

  itemClicked: function (e) {
    this.props.itemClicked(e.target.innerHTML);
  },

  render: function () {
    return <div className='history-item'>
      <div className='bubble history-input' onClick={this.itemClicked}>{this.props.item.input}</div>
      <div className='bubble history-output' onClick={this.itemClicked}>{this.props.item.output.text}</div>
    </div>;
  }
});
