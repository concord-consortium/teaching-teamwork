require('./chat.jsx');
require('./calculator.jsx');

var config = require('../config');

module.exports = PageView = React.createClass({
  render: function() {
    var title,
        activity = this.props.activity ? this.props.activity : {},
        image = null,
        chat = null,
        src;
        
    if (activity.name) {
      title = <h1>Teaching Teamwork: { activity.name }</h1>
    } else {
      title = <h1>Teaching Teamwork</h1>
    }

    if (activity.image) {
      src = /^https?:\/\//.test(activity.image) ? activity.image : config.modelsBase + activity.image;
      image = <img src={ src } />
    }

    if (activity.clients && activity.clients.length > 1) {
      chat = <ChatView {...activity} />
    }
    return (
      <div className="tt-page">
        { title }
        <h2>Circuit { this.props.circuit }</h2>
        <div id="breadboard-wrapper"></div>
        { chat }
        <div id="image-wrapper">{ image }</div>
        <CalculatorView />
      </div>
    );
  }
});
