var config = require('../../config'),
    logController = require('../../controllers/shared/log'),
    OtherCircuits, Popup, PopupIFrame, CircuitLink, CircuitImage, ScaledIFrame;

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
          },
          className = "modalDialog" + (props.tutorialShowing ? " other-circuits-popup-with-tutorial" : "");

      if (!$anchor.length) {
        $anchor = $('<div id="other-circuits-popup" class="' + className + '"></div>').appendTo('body');
      }

      setTimeout(function() {
        $anchor[0].style.opacity = 1;
      }, 100);

      return ReactDOM.render(Popup({
        circuit: props.circuit,
        activityName: props.activityName,
        groupName: props.groupName,
        classInfoUrl: props.classInfoUrl,
        numClients: props.numClients,
        buttonClicked: closePopup,
        ttWorkbench: props.ttWorkbench
      }), $anchor.get(0));
    },

    closePopup: function () {
      var $anchor = $('#other-circuits-popup'),
          node = $anchor.get(0);
      if (node) {
        ReactDOM.unmountComponentAtNode(node);
      }
      $anchor.remove();
    }
  },

  showClicked: function () {
    var self = this;
    this.setState({showPopup: true});
    setTimeout(function () {
      self.setState({showPopup: false});
    }, 100);
  },

  render: function () {
    var self = this;

    if (self.state.showPopup) {
      setTimeout(function () {
        OtherCircuits.showPopup(self.props);
      });
    }

    return React.DOM.button({onClick: this.showClicked}, this.props.label || 'View All Circuits');
  },

});

PopupIFrame = React.createFactory(React.createClass({
  displayName: 'OtherCircuitsPopupIFrame',

  shouldComponentUpdate: function () {
    return false;
  },

  componentDidMount: function () {
    var iframe = this.refs.iframe,
        payload = {
          circuit: this.props.circuit,
          activityName: this.props.activityName,
          groupName: this.props.groupName,
          classInfoUrl: this.props.classInfoUrl,
          ttWorkbench: this.props.ttWorkbench
        };
    iframe.onload = function () {
      iframe.contentWindow.postMessage(JSON.stringify(payload), window.location.origin);
    };
  },

  render: function () {
    var src = '?view-other-circuit!' + (this.props.hideZoomDetails ? "&hide-zoom-details!" : "");
    return React.DOM.iframe({ref: 'iframe', src: src, style: {width: 740, height: 500}}, 'Loading...');
  }
}));

ScaledIFrame = React.createFactory(React.createClass({
  displayName: 'OtherCircuitsScaledIFrame',

  shouldComponentUpdate: function () {
    return false;
  },

  componentDidMount: function () {
    var iframe = this.refs.iframe,
        loadMessage = 'loaded:scaled:' + this.props.circuit,
        payload = {
          circuit: this.props.circuit,
          activityName: this.props.activityName,
          groupName: this.props.groupName,
          classInfoUrl: this.props.classInfoUrl,
          ttWorkbench: this.props.ttWorkbench,
          loadMessage: loadMessage
        },
        listenForLoad = function (event) {
          if (event.data === loadMessage) {
            iframe.style.display = 'block';
            window.removeEventListener("message", listenForLoad);
          }
        };

    iframe.onload = function () {
      iframe.contentWindow.postMessage(JSON.stringify(payload), window.location.origin);
    };
    window.addEventListener("message", listenForLoad);
  },

  render: function () {
    var scale = 'scale(' + this.props.scale + ')',
        src = '?view-other-circuit!' + (this.props.hideZoomDetails ? "&hide-zoom-details!" : ""),
        origin = '0 0',
        style = {
          width: 740,
          height: 500,
          display: 'none',
          msTransform: scale,
          MozTransform: scale,
          OTransform: scale,
          WebkitTransform: scale,
          transform: scale,
          msTransformOrigin: origin,
          MozTransformOrigin: origin,
          OTransformOrigin: origin,
          WebkitTransformOrigin: origin,
          transformOrigin: origin
        };
    return React.DOM.iframe({ref: 'iframe', src: src, style: style});
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

  getInitialState: function () {
    this.imageInfo = this.props.ttWorkbench.otherCircuits;
    this.breadboards = this.imageInfo.breadboards;
    return {};
  },

  drawImageLayer: function () {
    var context = this.refs.imageLayer.getContext('2d'),
        image = new Image(),
        self = this;

    image.src = /^https?:\/\//.test(this.imageInfo.image) ? this.imageInfo.image : config.modelsBase + this.imageInfo.image;
    image.onload = function () {
      context.drawImage(image, 0, 0);
      self.drawClickLayer();
    };
  },

  drawClickLayer: function () {
    var canvas = this.refs.clickLayer,
        context = canvas.getContext('2d'),
        breadboard = this.breadboards[this.props.selectedCircuit - 1];

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.beginPath();
    context.lineWidth = 5;
    context.strokeStyle = '#f3951d';
    context.rect(breadboard.x, breadboard.y, breadboard.width, breadboard.height);
    context.stroke();
    context.closePath();
  },

  canvasClicked: function (e) {
    var canvas = this.refs.clickLayer,
        offset = $(canvas).offset(),
        x = e.pageX - offset.left,
        y = e.pageY - offset.top,
        i, breadboard;

    e.preventDefault();
    for (i = 0; i < this.breadboards.length; i++) {
      breadboard = this.breadboards[i];
      if ((x >= breadboard.x) && (x <= breadboard.x + breadboard.width) && (y >= breadboard.y) && (y <= breadboard.y + breadboard.height)) {
        this.props.clicked(i + 1);
        break;
      }
    }
  },

  componentDidMount: function () {
    this.drawImageLayer();
  },

  componentDidUpdate: function () {
    this.drawClickLayer();
  },

  render: function () {
    var canvasStyle = {
          position: 'absolute',
          top: 0,
          left: 0
        },
        iframes = [],
        i, breadboard, iframeStyle, hideZoomDetails;

    for (i = 0; i < this.breadboards.length; i++) {
      hideZoomDetails = this.props.hideZoomDetails && ((i + 1) !== this.props.circuit);
      breadboard = this.breadboards[i];
      iframeStyle = {
        position: 'absolute',
        top: breadboard.y,
        left: breadboard.x
      };
      iframes.push(React.DOM.div({key: i, style: iframeStyle}, ScaledIFrame({scale: breadboard.width / 740, circuit: i + 1, hideZoomDetails: hideZoomDetails, activityName: this.props.activityName, groupName: this.props.groupName, classInfoUrl: this.props.classInfoUrl, ttWorkbench: this.props.ttWorkbench})));
    }

    return React.DOM.div({style: {position: 'relative', margin: 10, width: this.imageInfo.width, height: this.imageInfo.height}},
      React.DOM.canvas({ref: 'imageLayer', width: this.imageInfo.width, height: this.imageInfo.height, style: canvasStyle}),
      iframes,
      React.DOM.canvas({ref: 'clickLayer', width: this.imageInfo.width, height: this.imageInfo.height, style: canvasStyle, onClick: this.canvasClicked})
    );
  }
}));

Popup = React.createFactory(React.createClass({

  displayName: 'OtherCircuitsPopup',

  getInitialState: function () {
    return {
      selectedCircuit: 1
    };
  },

  componentDidMount: function () {
    logController.logEvent("Opened Zoom View");
  },

  componentWillUnmount: function () {
    logController.logEvent("Closed Zoom View");
  },

  selectedCircuit: function (selectedCircuit) {
    logController.logEvent("Selected Circuit in Zoom", selectedCircuit);
    this.setState({selectedCircuit: selectedCircuit});
  },

  render: function () {
    var links = [],
        iframes = [],
        haveImage =  this.props.ttWorkbench.otherCircuits && this.props.ttWorkbench.otherCircuits.image && this.props.ttWorkbench.otherCircuits.breadboards,
        interface = this.props.ttWorkbench.interface || {},
        circuit,
        selected,
        hideZoomDetails;

    for (circuit = 1; circuit <= this.props.numClients; circuit++) {
      selected = circuit == this.state.selectedCircuit;
      hideZoomDetails = interface.hideZoomDetails && (circuit !== this.props.circuit);
      if (!haveImage) {
        links.push(CircuitLink({key: circuit, clicked: this.selectedCircuit, circuit: circuit, selected: selected}));
      }
      iframes.push(React.DOM.div({key: circuit, style: {display: selected ? 'block' : 'none'}}, PopupIFrame({circuit: circuit, hideZoomDetails: hideZoomDetails, activityName: this.props.activityName, groupName: this.props.groupName, classInfoUrl: this.props.classInfoUrl, ttWorkbench: this.props.ttWorkbench})));
    }

    return React.DOM.div({className: 'other-circuits-button-popup'},
      React.DOM.button({style: {'float': 'right'}, onClick: this.props.buttonClicked}, 'X'),
      React.DOM.h1({}, 'All Circuits'),
      (haveImage ? CircuitImage({circuit: this.props.circuit, selectedCircuit: this.state.selectedCircuit, clicked: this.selectedCircuit, activityName: this.props.activityName, groupName: this.props.groupName, classInfoUrl: this.props.classInfoUrl, ttWorkbench: this.props.ttWorkbench, hideZoomDetails: interface.hideZoomDetails}) : null),
      (links.length > 0 ? React.DOM.div({className: 'links'}, links) : null),
      React.DOM.div({className: 'iframes'}, iframes)
    );
  }
}));
