var config = require('../config'),
    OtherCircuits, Popup, PopupIFrame, CircuitLink, CircuitImage;

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
        activityName: props.activityName,
        groupName: props.groupName,
        numClients: props.numClients,
        buttonClicked: closePopup,
        ttWorkbench: props.ttWorkbench
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
          activityName: this.props.activityName,
          groupName: this.props.groupName,
          ttWorkbench: this.props.ttWorkbench
        };
    iframe.onload = function () {
      iframe.contentWindow.postMessage(JSON.stringify(payload), window.location.origin);
    };
  },

  render: function () {
    return React.DOM.iframe({ref: 'iframe', src: '?view-other-circuit!', style: {width: 800, height: 500}, onLoad: this.loaded}, 'Loading...');
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

CircuitImage = React.createFactory(React.createClass({
  
  displayName: 'CircuitImage',
  
  render: function () {
    return React.DOM.img({src: /^https?:\/\//.test(this.props.image) ? this.props.image : config.modelsBase + this.props.image });
  }
}));

Popup = React.createFactory(React.createClass({

  displayName: 'OtherCircuitsPopup',

  getInitialState: function () {
    return {
      selectedCircuit: 1
    };
  },

  selectedCircuit: function (selectedCircuit) {
    this.setState({selectedCircuit: selectedCircuit});
  },

  render: function () {
    var links = [],
        iframes = [],
        haveImage =  this.props.ttWorkbench.otherCircuits && this.props.ttWorkbench.otherCircuits.image && this.props.ttWorkbench.otherCircuits.breadboards,
        circuit,
        selected;

    for (circuit = 1; circuit <= this.props.numClients; circuit++) {
      selected = circuit == this.state.selectedCircuit;
      if (!haveImage) {
        links.push(CircuitLink({key: circuit, clicked: this.selectedCircuit, circuit: circuit, selected: selected}));
      }
      iframes.push(React.DOM.div({key: circuit, style: {display: selected ? 'block' : 'none'}}, PopupIFrame({circuit: circuit, activityName: this.props.activityName, groupName: this.props.groupName, ttWorkbench: this.props.ttWorkbench})));
    }
    //links.push(React.DOM.button({key: 'close', onClick: this.props.buttonClicked}, 'Close'));

    return React.DOM.div({className: 'other-circuits-button-popup'},
      React.DOM.button({style: {'float': 'right'}, onClick: this.props.buttonClicked}, 'X'),
      React.DOM.h1({}, 'All Circuits'),
      (haveImage ? CircuitImage({image: this.props.ttWorkbench.otherCircuits.image, breadboards: this.props.ttWorkbench.otherCircuits.breadboards}) : null),
      (links.length > 0 ? React.DOM.div({className: 'links'}, links) : null),
      React.DOM.div({className: 'iframes'}, iframes)
    );
  }
}));
