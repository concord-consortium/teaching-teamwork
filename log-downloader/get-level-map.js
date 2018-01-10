/* jshint esversion: 6 */

const fs = require("fs");
const path = require("path");

exports.getLevelMap = () => {
  const activityPath = "../activities/breadboard/";
  const map = {};

  fs.readdirSync(activityPath).forEach(file => {
    const parsed = path.parse(file);
    if (parsed.ext === ".json") {
      const json = require(`${activityPath}${file}`);
      if (json.model && json.model.name === "three-resistors") {
        map[parsed.name] = json.model.options.level;
      }
    }
  });

  return map;
};
