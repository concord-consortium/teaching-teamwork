# Teaching Teamwork

Teaching Teamwork was built by [The Concord Consortium](http://concord.org/) for the
[Teaching Teamwork Project](http://concord.org/projects/teaching-teamwork).

## Environments

## Breadboard

This was the initial Teaching Teamwork environment and builds upon the [Breadboard library](https://github.com/concord-consortium/breadboard).
It enables either one or three players to solve analog electronic problems defined using an authorable JSON file.

### Activities

All activities are defined in JSON files contained the `activities/breadboard` folder.  Once an activity is defined and published it can be
used by specifying the activity name after the hash mark in the URL.

For example, the `activities/breadboard/three-resistors-level1.json` activity can be used via
[http://concord-consortium.github.io/teaching-teamwork/#three-resistors-level1](http://concord-consortium.github.io/teaching-teamwork/#three-resistors-level1).

### URL Options

There is only one option that can be specified in the URL query string.  It only needs to be present - it does not need a value assigned to it.

* logToConsole - prints all log messages to the console in a compact form

Example: [http://concord-consortium.github.io/teaching-teamwork/?logToConsole#three-resistors-level1](http://concord-consortium.github.io/teaching-teamwork/?logToConsole#three-resistors-level1)

### JSON File Format

A description of the JSON file format can be found [json-file-formats.md](here).

## PIC

This is the second Teaching Teamwork environment.  It enables either one or three players to build a keypad to led circuit using three
pre-programmed PICs.  The activity is fixed and cannot be authored in a JSON file.

### URL Options

There are many options that can be specified in the URL query string.  These options only need to be present in the query string, they do not
need to have values assigned to them and they can be combined in any order.

* logToConsole - prints all log messages to the console in a compact form
* showPinColors - shows low/high value of the component pins
* allowAutoWiring - enables a "Toggle Wires" button that adds all the wires to the activity, useful for debugging
* showSimulator - enables the PIC simulator buttons to allow for stopping and stepping through the PIC code
* soloMode - enables single user mode, this skips all Firebase login and board selection
* showBusLabels - enables labels next to bus connector holes
* showBusColors - shows low/high value of the bus connector holes
* showProbeInEdit - enables display of probe only when editing a circuit
* hideProbe - hides probe in edit and "all" view

Example: [http://concord-consortium.github.io/teaching-teamwork/pic/?logToConsole&soloMode](http://concord-consortium.github.io/teaching-teamwork/pic/?logToConsole&soloMode)

## Logic Gates

This is the third Teaching Teamwork environment.  It enables one or more players to build 74xx based circuits using a set of chips defined
in an authorable JSON file.

### Activities

All activities are defined in JSON files contained the `activities/logic-gates` folder.  Once an activity is defined and published it can be
used by specifying the activity name after the hash mark in the URL.

For example, the `activities/logic-gates/all-chips.json` activity can be used via
[http://concord-consortium.github.io/teaching-teamwork/logic-gates/#all-chips](http://concord-consortium.github.io/teaching-teamwork/logic-gates/#all-chips).

### URL Options

There are two options that can be specified in the URL query string.  An option only needs to be present - it does not need a value assigned to it.

* logToConsole - prints all log messages to the console in a compact form
* soloMode - enables single user mode, this skips all Firebase login and board selection

Example: [http://concord-consortium.github.io/teaching-teamwork/logic-gates/?logToConsole#all-chips](http://concord-consortium.github.io/teaching-teamwork/logic-gates/?logToConsole#all-chips)

### JSON File Format

A description of the JSON file format can be found [here](json-file-formats.md).

## Building and Running Locally

### Dependencies

* [Node](http://nodejs.org/) `brew install node`
* [Bower](http://bower.io/) `npm install -g bower`
* [Karma](karma-runner.github.io) `npm install -g karma-cli`

We use npm to install the developer tools, and bower to manage the javascript libraries:

```
  npm install
  bower install
```

### Building the library

Breadboard uses [Browserify](http://browserify.org/) to build the script and create the app.js file.

We build automatically and watch for changes using [Gulp](http://gulpjs.com/). Building the dist/ folder is as simple as

```
  npm start
```

Any changes to the script source, the css, or the examples folder will automatically be rebuilt.

### Testing the breadboard library locally

In order to load the example activities in the /examples folder, you just need to serve the contents of the /breadboard directory using a local server, such as Python's SimpleHTTPServer or Live Server.

[Live Server](https://www.npmjs.com/package/live-server) is a simple static server that will automatically reload pages when it detects changes to the source.

```
  npm install -g live-server
  cd dist
  live-server
```

The server runs on port 8080 by default. Open a browser and navigate to

http://localhost:8080/

In combination with Gulp above, this will reload your pages any time any source file is saved.

### Deploying to production

Production releases to S3 are based on the contents of the /dist folder and are built automatically by Travis
for each branch pushed to GitHub and each merge into master.

Merges into master are deployed to http://teaching-teamwork.concord.org.

Other branches are deployed to http://teaching-teamwork.concord.org/branch/<name>.

You can view the status of all the branch deploys [here](https://travis-ci.org/concord-consortium/teaching-teamwork/branches).

### Testing

Tests are written in Jasmine and are run using Karma.

```
  npm test
```

The tests watch for changes and re-run automatically.

### Understanding the code

The TT views are written in [React](http://facebook.github.io/react). React components have a single render() method, which renders DOM elements based on the view's state and properties. The component gets efficiently re-rendered if its
state or properties change.

React [breaks](http://www.code-experience.com/why-you-might-not-need-mvc-with-reactjs/) the traditional MVC pattern, and the view handles much more of the logic and state of the application that we are used to with normal MVC apps. This is ok.

The TT model is contained in Firebase, and is not explicitly re-represented in the app.

## License

Teaching Teamwork is Copyright 2015 (c) by the Concord Consortium and is distributed under the [MIT license](http://www.opensource.org/licenses/MIT).

See license.md for the complete license text.
