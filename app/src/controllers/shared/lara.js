var iframePhone = require('iframe-phone'),
    controller;

function LaraController() {
}
LaraController.prototype = {
  laraPhone: null,
  loadedFromLara: false,
  gotInitInteractive: false,
  gotInitInteractiveCallback: null,
  globalState: null,
  classInfoUrl: null,
  connected: false,
  connectionCallback: null,

  init: function() {
    var self = this;

    // for now just check if in iframe
    try {
      this.loadedFromLara = window.self !== window.top;
    } catch (e) {
      this.loadedFromLara = true;
    }

    if (this.loadedFromLara) {
      this.laraPhone = iframePhone.getIFrameEndpoint();
      this.laraPhone.addListener('hello', function () {
        self.connected = true;
        if (self.connectionCallback) {
          self.connectionCallback();
        }
        self.laraPhone.post('interactiveState', {
          lara_options: {
            reporting_url: window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port : '') + window.location.pathname + '?report'
          }
        });
      });
      this.laraPhone.addListener("initInteractive", function(options) {
        if (options) {
          // the classInfoUrl is only present when LARA is invoked via the portal
          if (options.classInfoUrl && (options.classInfoUrl.length > 0)) {
            self.classInfoUrl = options.classInfoUrl;
          }
        }
        self.globalState = options && options.globalInteractiveState || {};
        self.gotInitInteractive = true;
        if (self.gotInitInteractiveCallback) {
          self.gotInitInteractiveCallback(self.globalState, self.classInfoUrl);
        }
      });
      this.laraPhone.initialize();
    }
  },

  waitForConnection: function (callback) {
    if (this.connected) {
      callback();
    }
    else {
      this.connectionCallback = callback;
    }
  },

  waitForInitInteractive: function (callback) {
    var self = this;
    if (this.gotInitInteractive) {
      callback(this.globalState, this.classInfoUrl);
    }
    else {
      this.gotInitInteractiveCallback = callback;
      setTimeout(function () {
        if (!self.gotInitInteractive) {
          self.gotInitInteractiveCallback = null;
          callback(this.globalState, self.classInfoUrl);
        }
      }, 5000);
    }
  },

  log: function (data) {
    this.laraPhone.post('log', data);
  },

  setGlobalState: function (state) {
    if (this.loadedFromLara) {
      this.laraPhone.post('interactiveStateGlobal', state);
    }
  },

  enableForwardNav: function (enableForwardNav, message) {
    if (this.loadedFromLara) {
      this.laraPhone.post('navigation', {enableForwardNav: enableForwardNav, message: message});
    }
  }
};

controller = new LaraController();
controller.init();

module.exports = controller;
