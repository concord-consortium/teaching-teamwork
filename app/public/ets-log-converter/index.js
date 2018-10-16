var levelMap = {
  "three-resistors-level1": 1,
  "three-resistors-level2": 2,
  "three-resistors-level3": 3,
  "three-resistors-level4": 4,
  "three-resistors-level5": 5,
  "three-resistors-levelA": 2,
  "three-resistors-levelA-no-pulldown": 2,
  "three-resistors-levelA-with-pulldown": 2,
  "three-resistors-levelB": 3,
  "three-resistors-levelB-no-pulldown": 3,
  "three-resistors-levelB-with-pulldown": 3,
  "three-resistors-levelC": 4,
  "three-resistors-levelC-no-pulldown": 4,
  "three-resistors-levelC-with-pulldown": 4,
  "three-resistors-levelD": 5,
  "three-resistors-levelD-no-pulldown": 5,
  "three-resistors-levelD-with-pulldown": 5,
  "three-resistors-solo-level1": 1,
  "three-resistors-solo-level2": 2,
  "three-resistors-solo-level3": 3,
  "three-resistors-solo-level4": 4,
  "three-resistors-solo-level5": 5,
  "three-resistors-solo-levelA": 2,
  "three-resistors-solo-levelB": 3,
  "three-resistors-solo-levelC": 4,
  "three-resistors-solo-levelD": 5,
  "three-resistors-tutorial-no-pulldown": 2,
  "three-resistors-tutorial-with-pulldown": 2
};

var isTrue = function (val) {
  return (val !== "false") && !!val;
};

var parseUnknownValuesSubmitted = function (obj) {
  var p = obj.parameters,
          needR = isTrue(p["R: Need"]),
          needE = isTrue(p["E: Need"]),
          correctR = isTrue(p["R: Correct"]),
          correctE = isTrue(p["E: Correct"]);
  return {
    needR: needR,
    needE: needE,
    correctR: correctR,
    correctE: correctE,
    eValue: p["E: Value"],
    eUnit: p["E: Unit"],
    rValue: p["R: Value"],
    rUnit: p["R: Unit"]
  };
};

var eventMap = {
  "Started session": {
    code: 1000,
    desc: "started session"
  },
  "Rejoined": {
    code: 1010,
    desc: "rejoined session"
  },
  "Joined Group": {
    code: 1100,
    desc: "joined [group]",
    data01: "event_value"
  },
  "model name": {
    code: 1200,
    desc: "loaded [activity]",
    data01: "event_value"
  },
  "model options": {
    code: 1210,
    desc: "loaded [level]",
    data01: "level" // TODO
  },
  "model values": {
    code: 1300,
    desc: "loaded goals [R1] [R2] [R3]",
    data01: "GoalR1",
    data02: "GoalR2",
    data03: "GoalR3"
  },
  "Activity Settings": {
    code: 1310,
    desc: "loaded initial [E] [R0] [R1] [R2] [R3]",
    data01: "E",
    data02: "R0",
    data03: "r1",
    data04: "r2",
    data05: "r3"
  },
  "Activity Goals": {
    code: 1320,
    desc: "loaded goals [V1] [V2] [V3]",
    data01: "V1",
    data02: "V2",
    data03: "V3"
  },
  "Started to join group": {
    code: 1500,
    desc: "chose [group]",
    data01: "event_value"
  },
  "Rejected Group": {
    code: 1510,
    desc: "rejected [group]",
    data01: "event_value"
  },
  "Selected Username": {
    code: 1600,
    desc: "chose [username]",
    data01: "event_value"
  },
  "Selected board": {
    code: 1700,
    desc: "chose [board]",
    data01: "event_value"
  },
  "Calculator dragged": {
    code: 2400,
    desc: "dragged calculator from [top] [right] to [top] [right]",
    data01: "startTop",
    data02: "startRight",
    data03: "endTop",
    data04: "endRight"
  },
  "Changed circuit": {
    codeFn: function (type) {
      switch (type) {
        case "disconnect lead": return 3100;
        case "connect lead": return 3110;
        case "changed component value": return 4000;
      }
    },
    descFn: function (type) {
      switch (type) {
        case "disconnect lead": return "disconnected lead at [location]";
        case "connect lead": return "reconnected lead at [location]";
        case "changed component value": return "changed [resistor] from [value] to [value] via [keypress]";
      }
    },
    data01Fn: function (type) {
      switch (type) {
        case "disconnect lead": return "location";
        case "connect lead": return "location";
        case "changed component value": return "UID";
      }
    },
    data02Fn: function (type) {
      if (type === "changed component value") {
        return "*previous_r*";
      }
    },
    data03Fn: function (type) {
      if (type === "changed component value") {
        return "value";
      }
    },
    data04Fn: function (type) {
      if (type === "changed component value") {
        return "via";
      }
    }
  },
  "Attached probe": {
    code: 3200,
    desc: "attached [probe] at [location]",
    data01: "color",
    data02: "location"
  },
  "Detached probe": {
    code: 3210,
    desc: "detached [probe] at [location]",
    data01: "color",
    data02: "location"
  },
  "Dropped probe": {
    code: 3220,
    desc: "dropped [probe] at [location]",
    data01: "color",
    data02: "position"
  },
  "Moved DMM dial": {
    code: 3300,
    desc: "changed DMM from [value] to [value]",
    data01: "*previous_DMM*",
    data02: "value"
  },
  "Opened calculator": {
    code: 3400,
    desc: "opened calculator"
  },
  "Closed calculator": {
    code: 3410,
    desc: "closed calculator"
  },
  "Cleared calculator": {
    code: 3420,
    desc: "cleared calculator"
  },
  "Calculator button pressed": {
    code: 3450,
    desc: "clicked [button] to change calculator from [value] to [value]",
    data01: "button",
    data02: "preCalculation",
    data03: "postCalculation"
  },
  "Opened Zoom View": {
    code: 3500,
    desc: "opened zoom"
  },
  "Closed Zoom View": {
    code: 3510,
    desc: "closed zoom"
  },
  "DMM measurement": {
    code: 4300,
    desc: "took [measurement] with [red probe] [black probe] [dial position] [result]",
    data01: "measurement",
    data02: "red_probe",
    data03: "black_probe",
    data04: "dial_position",
    data05: "result"
  },
  "Calculation performed": {
    code: 4400,
    desc: "performed [calculation] with [result]",
    data01: "calculation",
    data02: "result"
  },
  "Calculation error": {
    code: 4410,
    desc: "received [error] on [calculation]",
    data01: "error",
    data02: "calculation"
  },
  "Selected Circuit in Zoom": {
    code: 4500,
    desc: "viewed [board] in zoom",
    data01: "event_value"
  },
  "Sent message": {
    code: 5000,
    // sent message changed from event_value to {message, type}
    descFn: function (type, obj) {
      return obj.parameters.hasOwnProperty("type") ? "sent [chat] of [type]" : "sent [chat]";
    },
    data01Fn: function (type, obj) {
      return obj.parameters.hasOwnProperty("message") ? "message" : "event_value";
    },
    data02Fn: function (type, obj) {
      return obj.parameters.hasOwnProperty("type") ? "type" : undefined;
    }
  },
  "Submit clicked": {
    code: 6000,
    desc: "clicked submit"
  },
  "Goals met": {
    code: 6100,
    desc: "received success message"
  },
  "Submit close button clicked": {
    code: 6200,
    desc: "closed submit window"
  },
  "Started tutorial step": {
    code: 7000,
    desc: "started tutorial step [number] with title '[title]'",
    data01: "number",
    data02: "title"
  },
  "Completed tutorial step": {
    code: 7000,
    desc: "completed tutorial step [number] with title '[title]', timed out is [timed out]",
    data01: "number",
    data02: "title",
    data03: "timedOut"
  },
  "Unknown Values Submitted": {
    codeFn: function (type, obj) {
      var p = parseUnknownValuesSubmitted(obj);
      if (!p.needR && !p.needE) {
        return 4600;
      }
      if (!p.needR && p.needE) {
        return 4601;
      }
      if (p.needR && !p.needE) {
        return 4602;
      }
      return 4603;
    },
    descFn: function (type, obj) {
      var p = parseUnknownValuesSubmitted(obj);
      if (!p.needR && !p.needE) {
        return "The user does not need E or R and submitted";
      }
      if (!p.needR && p.needE) {
        return "The user needs E and submitted the [correct/incorrect] E value of [e value] [e unit]";
      }
      if (p.needR && !p.needE) {
        return "The user needs R and submitted the [correct/incorrect] R value of [r value] [r unit]";
      }
      return "The user needs E and R and submitted the [correct/incorrect] E value of [e value] [e unit] and the [correct/incorrect] R value of [r value] [r unit]";
    },
    data01Fn: function (type, obj) {
      var p = parseUnknownValuesSubmitted(obj);
      if (p.needE) {
        obj.parameters._data01 = p.correctE ? "correct" : "incorrect";
        return "_data01";
      }
      else if (p.needR) {
        obj.parameters._data01 = p.correctR ? "correct" : "incorrect";
        return "_data01";
      }
    },
    data02Fn: function (type, obj) {
      var p = parseUnknownValuesSubmitted(obj);
      if (p.needE) {
        obj.parameters._eValue = p.eValue;
        return "_eValue";
      }
      else if (p.needR) {
        obj.parameters._rValue = p.rValue;
        return "_rValue";
      }
    },
    data03Fn: function (type, obj) {
      var p = parseUnknownValuesSubmitted(obj);
      if (p.needE) {
        obj.parameters._eUnit = p.eUnit;
        return "_eUnit";
      }
      else if (p.needR) {
        obj.parameters._rUnit = p.rUnit;
        return "_rUnit";
      }
    },
    data04Fn: function (type, obj) {
      var p = parseUnknownValuesSubmitted(obj);
      if (p.needE && p.needR) {
        obj.parameters._data04 = p.correctR ? "correct" : "incorrect";
        return "_data04";
      }
    },
    data05Fn: function (type, obj) {
      var p = parseUnknownValuesSubmitted(obj);
      if (p.needE && p.needR) {
        obj.parameters._rValue = p.rValue;
        return "_rValue";
      }
    },
    data06Fn: function (type, obj) {
      var p = parseUnknownValuesSubmitted(obj);
      if (p.needE && p.needR) {
        obj.parameters._rUnit = p.rUnit;
        return "_rUnit";
      }
    }
  }
};

var createETSLog = function (input, teamPrefix, levelMap) {
  var rows = [],
      lastObj = null;

  var getLevel = function (p) {
    return levelMap[p.levelName];
  };

  // filter out all but the teaching teamwork events we care about
  input = input.filter(function (obj) {
    return obj.parameters && obj.parameters.levelName && !!obj.parameters.levelName.match(/^three-resistors/) && eventMap[obj.event];
  });

  // sort by time?
  input.sort(function (a, b) {
    var aTime = new Date(a.time),
        bTime = new Date(b.time);
    return aTime.getTime() - bTime.getTime();
  });

  // find the initial model and r values
  var modelValues = {};
  var rValues = {};
  var prevRValues = {};
  var prevDMMValue = {};
  var parseValues = function (unparsed) {
    var parsed = {};
    Object.keys(unparsed).forEach(function (key) {
      parsed[key] = parseFloat(unparsed[key]);
      if (isNaN(parsed[key])) {
        parsed[key] = unparsed[key];
      }
    });
    return parsed;
  };
  input.forEach(function (obj) {
    var p = obj.parameters;

    // fake groupname for solo data
    if (!p.groupname) {
      p.groupname = "solo";
    }

    var level = getLevel(p);
    if (obj.event === "model values") {
      if (!modelValues[p.groupname] || !modelValues[p.groupname][level]) {
        modelValues[p.groupname] = modelValues[p.groupname] || {};
        modelValues[p.groupname][level] = parseValues(p);
      }
    }
    if ((p.hasOwnProperty("r1") && p.hasOwnProperty("r2") && p.hasOwnProperty("r3")) && (!rValues[p.groupname] || !rValues[p.groupname][level] || !rValues[p.groupname][level][p.username])) {
      rValues[p.groupname] = rValues[p.groupname] || {};
      rValues[p.groupname][level] = rValues[p.groupname][level] || {};
      rValues[p.groupname][level][p.username] = parseValues(p);
    }

    if (!prevDMMValue[p.groupname] || !prevDMMValue[p.groupname][level] || !prevDMMValue[p.groupname][level][p.username]) {
      prevDMMValue[p.groupname] = prevDMMValue[p.groupname] || {};
      prevDMMValue[p.groupname][level] = prevDMMValue[p.groupname][level] || {};
      prevDMMValue[p.groupname][level][p.username] = "dcv_20"; // DMM always starts at this setting

      prevRValues[p.groupname] = prevRValues[p.groupname] || {};
      prevRValues[p.groupname][level] = prevRValues[p.groupname][level] || {};
      prevRValues[p.groupname][level][p.username] = {r1: "n/a", r2: "n/a", r3: "n/a"};
    }
  });

  var zeroPad = function (n) {
    return n < 10 ? "0" + n : n;
  };
  var round = function (value) {
    return Math.round(value * Math.pow(10,2)) / Math.pow(10,2);
  };
  var getVoltage = function (r, mv, rv) {
    var voltage = round((mv.E * r) / (mv.R + rv.r1 + rv.r2 + rv.r3));
    return isNaN(voltage) ? "" : voltage;
  };

  input.forEach(function (obj) {
    var p = obj.parameters,
        event = eventMap[obj.event],
        data = function (num) {
          var prefix = "data" + num,
              prefixFn = prefix + "Fn",
              field;

          if (event.hasOwnProperty(prefixFn)) {
            field = event[prefixFn](p.type, obj);
          }
          else if (event.hasOwnProperty(prefix)) {
            field = event[prefix];
          }

          if (field !== undefined) {
            if (field === "event_value") {
              return obj.event_value;
            }
            if (field === "*previous_r*") {
              var prevRV = prevRValues[p.groupname] && prevRValues[p.groupname][level] && prevRValues[p.groupname][level][p.username] ? prevRValues[p.groupname][level][p.username] : {r1: 0, r2: 0, r3: 0};
              return prevRV[p.UID] || "n/a";
            }
            if (field === "*previous_DMM*") {
              return prevDMMValue[p.groupname] && prevDMMValue[p.groupname][level] && prevDMMValue[p.groupname][level][p.username] ? prevDMMValue[p.groupname][level][p.username] : "n/a";
            }
            return p.hasOwnProperty(field) ? p[field] : "*** UNKNOWN FIELD: '" + field + "' ***";
          }
        },
        level = getLevel(p);

    if (obj.event === "model values") {
      modelValues[p.groupname][level] = parseValues(obj.parameters);
    }
    if (p.hasOwnProperty("r1") && p.hasOwnProperty("r2") && p.hasOwnProperty("r3") && (p.r1 !== "unknown") && (p.r2 !== "unknown") && (p.r3 !== "unknown")) {
      prevRValues[p.groupname][level][p.username] = rValues[p.groupname][level][p.username];
      rValues[p.groupname][level][p.username] = parseValues(p);
    }

    var mv = modelValues[p.groupname] && modelValues[p.groupname][level] ? modelValues[p.groupname][level] : {E: 0, R: 0, GoalR1: 0, GoalR2: 0, GoalR3: 0, V1: 0, V2: 0, V3: 0};
    var rv = rValues[p.groupname] && rValues[p.groupname][level] && rValues[p.groupname][level][p.username] ? rValues[p.groupname][level][p.username] : {r1: 0, r2: 0, r3: 0};

    var date = new Date(obj.time);
    var time = date.getTime();

    var lastDate = new Date(lastObj ? lastObj.time : obj.time);
    var lastTime = lastDate.getTime();

    rows.push({
      "TeamID": teamPrefix + p.groupname,
      "StudentID": obj.username.replace(/^(\d+).*$/, "$1"),
      "Activity": p.levelName,
      "TaskLevel": level,
      "Player": p.username,
      "Board": parseInt(p.board, 10) + 1,
      "EventDate": zeroPad(date.getMonth() + 1) + "/" + zeroPad(date.getDate()) + "/" + date.getFullYear(),
      "EventTime": date.toTimeString().split(" ")[0],
      "EventTimestamp": time,
      "TimeSpent": (time - lastTime) / 1000,
      "DataCode": event.codeFn ? event.codeFn(p.type, obj) : event.code,
      "DataDesc": event.descFn ? event.descFn(p.type, obj) : event.desc,
      "Data01": data("01"),
      "Data02": data("02"),
      "Data03": data("03"),
      "Data04": data("04"),
      "Data05": data("05"),
      "Data06": data("06"),
      "ContextE": mv.E,
      "ContextR0": mv.R,
      "ContextR1": rv.r1,
      "ContextR2": rv.r2,
      "ContextR3": rv.r3,
      "ContextGR1": mv.GoalR1,
      "ContextGR2": mv.GoalR2,
      "ContextGR3": mv.GoalR3,
      "ContextV1": getVoltage(rv.r1, mv, rv),
      "ContextV2": getVoltage(rv.r2, mv, rv),
      "ContextV3": getVoltage(rv.r3, mv, rv),
      "ContextGV1": mv.V1,
      "ContextGV2": mv.V2,
      "ContextGV3": mv.V3,
      "ContextConnected": p.currentFlowing === "true"
    });

    if (obj.event === "Moved DMM dial") {
      prevDMMValue[p.groupname][level][p.username] = p.value;
    }

    lastObj = obj;
  });

  return rows;
};

if (typeof exports !== "undefined") {
  // if being required by the downloader just export the create function
  exports.createETSLog = createETSLog;
}
else {
  (function () {
    var div = React.DOM.div,
        strong = React.DOM.strong,
        form = React.DOM.form,
        input = React.DOM.input,
        link = React.DOM.a;

    var component = function (options) {
      return React.createFactory(React.createClass(options));
    };

    var App = component({
      getInitialState: function () {
        return {
          file: null,
          teamPrefix: null,
          munging: false,
          csvOutput: null
        };
      },

      componentDidUpdate: function () {
        if (this.refs.teamPrefix) {
          this.refs.teamPrefix.focus();
        }
      },

      dragHover: function (e) {
        e.stopPropagation();
        e.preventDefault();
      },

      drop: function (e) {
        this.dragHover(e);

        var files = e.target.files || e.dataTransfer.files;
        var file = files[0];

        if (file) {
          if (file.name.match(/\.json$/i)) {
            this.setState({file: file});
          }
          else {
            alert("The dropped file needs to be a JSON file (ie have a .json extension)");
          }
        }
      },

      renderDragDrop: function () {
        return (
          div({id: "file-drag"}, "Drop an exported \"log-puller\" JSON log file onto this page")
        );
      },

      getTeamPrefix: function (e) {
        e.stopPropagation();
        e.preventDefault();
        this.setState({
          teamPrefix: this.refs.teamPrefix.value.replace(/^\s+|\s+$/, ""),
          munging: true
        });

        setTimeout(this.mungeFile.bind(this), 1);
      },

      renderTeamPrefix: function () {
        return (
          div({},
            div({},
              strong({}, "Please enter a prefix to use for the teams (can be blank):")
            ),
            div({},
              form({onSubmit: this.getTeamPrefix},
                input({type: "text", ref: "teamPrefix"})
              )
            )
          )
        );
      },

      renderMunging: function () {
        return strong({}, "Creating the CSV...");
      },

      renderDownloadButton: function () {
        var blob = new Blob([this.state.csvOutput], {type: "text/csv"}),
            filename = this.state.file.name.replace(/\.json$/, ".csv");
        return (
          div({},
            link({href: URL.createObjectURL(blob), download: filename},
              "Click here to download the CSV (" + filename + ")"
            ),
            div({style: {marginTop: 20, fontSize: 12, textAlign: "center"}}, "(reload the page to convert another file...)")
          )
        );
      },

      renderStep: function () {
        if (this.state.file === null) {
          return this.renderDragDrop();
        }
        if (this.state.teamPrefix === null) {
          return this.renderTeamPrefix();
        }
        if (this.state.munging) {
          return this.renderMunging();
        }
        return this.renderDownloadButton();
      },

      render: function () {
        return (
          div({id: "flex-container", onDragOver: this.dragHover, onDragLeave: this.dragHover, onDrop: this.drop},
            div({id: "flex-item"},
              this.renderStep()
            ),
            div({id: "top-nav"}, "ETS Breadboard Log Converter")
          )
        );
      },

      mungeFile: function () {
        var self = this,
            reader = new FileReader();

        reader.onload = function() {
          try {
            var rows = createETSLog(JSON.parse(reader.result), self.state.teamPrefix, levelMap);

            self.setState({
              munging: false,
              csvOutput:  Papa.unparse(rows)
            });
          }
          catch (ex) {
            alert(ex.toString());
          }
        };
        reader.readAsText(this.state.file);
      }
    });

    ReactDOM.render(App({}), document.getElementById("app"));
  })();
}