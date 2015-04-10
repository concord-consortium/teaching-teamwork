var OtherCircuits, Popup, PopupIFrame, CircuitLink;

module.exports = OtherCircuits = React.createClass({

  displayName: 'OtherCircuits',

  getInitialState: function () {
    return {
      showPopup: false
    };
  },

  statics: {
    showPopup: function(props) {
      var $anchor = $('#other-circuits-popup'),
          closePopup = function (e) {
            e.preventDefault();
            OtherCircuits.closePopup();
          };

      if (!$anchor.length) {
        $anchor = $('<div id="other-circuits-popup" class="modalDialog"></div>').appendTo('body');
      }

      setTimeout(function() {
        $anchor[0].style.opacity = 1;
      }, 100);

      return React.render(Popup({
        circuit: props.circuit,
        activity: props.activity,
        buttonClicked: closePopup
      }), $anchor.get(0));
    },

    closePopup: function () {
      var $anchor = $('#other-circuits-popup');
      React.unmountComponentAtNode($anchor.get(0));
      $anchor.remove();
    }
  },

  showClicked: function () {
    this.setState({showPopup: true});
  },

  render: function () {
    var self = this;

    setTimeout(function () {
      if (self.state.showPopup) {
        OtherCircuits.showPopup(self.props);
      }
      else {
        OtherCircuits.closePopup();
      }
    });

    return React.DOM.div({className: 'other-circuits-button-wrapper'},
      React.DOM.button({onClick: this.showClicked}, this.props.label || 'View All Circuits')
    );
  },

});

PopupIFrame = React.createFactory(React.createClass({
  displayName: 'OtherCircuitsPopupIFrame',

  shouldComponentUpdate: function () {
    return false;
  },

  componentDidMount: function () {
    var iframe = this.refs.iframe.getDOMNode(),
        payload = {
          circuit: this.props.circuit,
          activity: this.props.activity
        };
    iframe.onload = function () {
      iframe.contentWindow.postMessage(JSON.stringify(payload), window.location.origin);
    };
  },

  render: function () {
    return React.DOM.iframe({ref: 'iframe', src: '?view-other-circuit!', style: {width: 800, height: 500}, onLoad: this.loaded});
  }
}));

CircuitLink = React.createFactory(React.createClass({
  displayName: 'CircuitLink',

  clicked: function (e) {
    e.preventDefault();
    this.props.clicked(this.props.circuit);
  },

  render: function () {
    return React.DOM.a({href: '#', onClick: this.clicked, className: this.props.selected ? 'selected' : ''}, "Circuit " + this.props.circuit);
  }
}));

Popup = React.createFactory(React.createClass({

  displayName: 'OtherCircuitsPopup',

  getInitialState: function () {
    return {
      selectedCircuit: parseInt(this.props.circuit, 10) === 1 ? 2 : 1
    };
  },

  linkClicked: function (selectedCircuit) {
    this.setState({selectedCircuit: selectedCircuit});
  },

  render: function () {
    var links = [],
        iframes = [],
        circuit,
        selected;

    for (circuit = 1; circuit <= this.props.activity.clients.length; circuit++) {
      selected = circuit == this.state.selectedCircuit;
      links.push(CircuitLink({key: circuit, clicked: this.linkClicked, circuit: circuit, selected: selected}));
      iframes.push(React.DOM.div({key: circuit, style: {display: selected ? 'block' : 'none'}}, PopupIFrame({circuit: circuit, activity: this.props.activity})));
    }
    links.push(React.DOM.button({onClick: this.props.buttonClicked}, 'Close'));

    return React.DOM.div({className: 'other-circuits-button-popup'},
      React.DOM.h1({}, 'All Circuits'),
      React.DOM.div({className: 'links'}, links),
      React.DOM.div({className: 'iframes'}, iframes)
    );
  }
}));
