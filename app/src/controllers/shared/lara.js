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
  classInfo: null,
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
        var done = function (classInfo) {
          self.classInfo = classInfo;
          self.gotInitInteractive = true;
          if (self.gotInitInteractiveCallback) {
            self.gotInitInteractiveCallback(self.globalState, classInfo);
          }
        };
        self.globalState = options && options.globalInteractiveState || {};
        // the classInfoUrl is only present when LARA is invoked via the portal
        if (options && options.classInfoUrl && (options.classInfoUrl.length > 0)) {
          $.ajax({
            url: options.classInfoUrl,
            crossDomain: true,
            xhrFields: {
              withCredentials: true
            }
          }).done(function (data) {
            var a = document.createElement("A");
            a.href = options.classInfoUrl;
            done({
              portal: a.host,
              classHash: data.class_hash,
              interactiveId: options.interactive.id,
              email: options.authInfo.email
            });
          }).fail(function () {
            alert("Unable to request class information from portal.");
          });
        }
        else {
          done();
        }
      });
      this.laraPhone.addListener('getInteractiveState', function () {
        self.laraPhone.post('interactiveState', 'nochange');
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
      callback(this.globalState, this.classHash);
    }
    else {
      this.gotInitInteractiveCallback = callback;
      setTimeout(function () {
        if (!self.gotInitInteractive) {
          self.gotInitInteractiveCallback = null;
          callback(self.globalState, self.classInfo);
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
