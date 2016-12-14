var iframePhone = require('iframe-phone'),
    controller;

function LaraController() {
}
LaraController.prototype = {
  laraPhone: null,
  loadedFromLara: false,
  loadedGlobalState: false,
  globalState: null,
  loadedGlobalStateCallback: null,
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
      this.laraPhone.addListener("loadInteractiveGlobal", function(state) {
        self._globalStateLoaded(state);
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

  waitForGlobalState: function (callback) {
    var self = this;
    if (this.loadedGlobalState) {
      callback(this.globalState);
    }
    else {
      this.loadedGlobalStateCallback = callback;
      setTimeout(function () {
        if (!self.loadedGlobalState) {
          this.loadedGlobalStateCallback = null;
          callback(null);
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

  _globalStateLoaded: function (state) {
    this.loadedGlobalState = true;
    this.globalState = state;
    if (this.loadedGlobalStateCallback) {
      this.loadedGlobalStateCallback(state);
    }
  }
};

controller = new LaraController();
controller.init();

module.exports = controller;
