/* jshint esversion: 6 */

const fs = require("fs");
const jwt = require("jsonwebtoken");
const superagent = require("superagent");

const createETSLog = require("../app/public/ets-log-converter/index.js").createETSLog;
const levelMap = require("./get-level-map.js").getLevelMap();
const PapaParse = require("../app/public/ets-log-converter/papaparse.min.js");

const settingsPath = "./log-downloader.json";
if (!fs.existsSync(settingsPath)) {
  console.error(`${settingsPath} does not exist, creating an empty one for you to fill...`);
  fs.writeFileSync(settingsPath, JSON.stringify({
    portalRootUrl: "https://learn.concord.org/",
    portalUserId: 0,
    offeringIds: [],
    hmacSecret: ""
  }, null, 2));
  process.exit(1);
}
const settings = require(settingsPath);

if (!fs.existsSync("logs")) {
  fs.mkdirSync("logs");
}

const offerings = settings.offeringIds.map((offeringId) => {
  const payload = {
    exp: Math.round(Date.now() / 1000) + (60* 60),
    uid: settings.portalUserId,
    claims: {
      offering_info_url: `${settings.portalRootUrl}api/v1/offerings/${offeringId}`
    }
  };
  return {
    id: offeringId,
    jwt: jwt.sign(payload, settings.hmacSecret)
  };
});

const attachmentRegex = /filename="([^"]+)"/;

const downloadAndSave = () => {
  const offering = offerings.shift();
  if (offering) {
    const url = `https://log-puller.herokuapp.com/download?portal_token=${offering.jwt}`;
    console.log(`Getting ${offering.id} - ${url}`)
    superagent
      .get(url)
      .end((err, res) => {
        if (err) {
          console.error(offering.id, err.toString());
        }
        else if (!res.header["content-disposition"]) {
          console.error(offering.id, res.text);
        }
        else {
          const matches = res.header["content-disposition"].match(attachmentRegex);
          if (matches) {
            const jsonFilename = matches[1];
            fs.writeFileSync(`logs/${jsonFilename}`, res.text);

            const rows = createETSLog(JSON.parse(res.text), "", levelMap);
            const csvFilename = jsonFilename.replace(".json", ".csv");
            fs.writeFileSync(`logs/${csvFilename}`, PapaParse.unparse(rows));
          }
        }

        // give a breather between queries
        setTimeout(() => {
          downloadAndSave();
        }, 1000);
      });
  }
};

downloadAndSave();
