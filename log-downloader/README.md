# Log Downloader Usage

## Get the offering ids

With one or more external activity ids in hand open a rails console on the portal that you wish to extract data from and run the following for each external activity ids:

`> ExternalActivity.find(<id>).offerings.map{|o| o.id}`

## Setup the local configuration

1. Ensure all of the root node packages are installed (use `npm install` in root)
2. Run `node ./log-downloader.js` - it will create a template of the `log-downloader.json` config file
3. Open the `log-downloader.json` config file and fill in the values for the settings
  * `"portalRootUrl":` the root url like `"https://learn.concord.org/"`
  * `"portalUserId":` the user id of a user that has access to the offering api endpoint (like an admin)
  * `"offeringIds":` the list of ids generated in the previous step
  * `"hmacSecret":` this is available either as an environment variable on the portal or in the log-puller Heroku environment options page

## Download and process the files

Run `node ./log-downloader.js` again to do the download and conversion.  The files will be saved in the `logs` sub-directory.

