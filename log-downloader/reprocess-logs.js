/* jshint esversion: 6 */

const fs = require("fs");
const path = require("path");
const createETSLog = require("../app/public/ets-log-converter/index.js").createETSLog;
const PapaParse = require("../app/public/ets-log-converter/papaparse.min.js");

fs.readdirSync("logs").forEach(file => {
  if (path.extname(file) === ".json") {
    const json = require(`./logs/${file}`);
    const rows = createETSLog(json, "");
    fs.writeFileSync(`./logs/${file.replace(".json", ".csv")}`, PapaParse.unparse(rows));
  }
});