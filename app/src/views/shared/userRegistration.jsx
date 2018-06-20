var userController, UserRegistrationView, UserRegistrationViewFactory,
    groups = require('../../data/shared/group-names')();

// add a global UserRegistrationView variable because its statics are called in other modules
module.exports = window.UserRegistrationView = UserRegistrationView = React.createClass({
  displayName: 'UserRegistration',

  statics: {
    // open a dialog with props object as props
    open: function(_userController, data) {
      userController = _userController;
      var $anchor = $('#user-registration');
      if (!$anchor.length) {
        $anchor = $('<div id="user-registration" class="modalDialog"></div>').appendTo('body');
      }

      setTimeout(function() {
        var $anchor = $('#user-registration');
        if ($anchor.length) {
          $anchor[0].style.opacity = 1;
        }
      }, 250);

      return ReactDOM.render(
        UserRegistrationViewFactory(data),
        $anchor.get(0)
      );
    },

    // close a dialog
    close: function() {
      var node = $('#user-registration').get(0);
      if (node) {
        ReactDOM.unmountComponentAtNode(node);
      }
      $('#user-registration').remove();
    }
  },
  getInitialState: function() {
    return {
      groupName: this.props.groupName || (groups.length === 1 ? groups[0].name : "")
    };
  },
  handleGroupNameChange: function(event) {
    this.setState({groupName: event.target.value});
  },
  handleGroupSelected: function(e) {
    e.preventDefault();
    userController.tryToEnterGroup(this.state.groupName);
  },
  handleJoinGroup: function() {
    userController.setGroupName(this.state.groupName);
  },
  handleRejectGroup: function() {
    this.setState({groupName: ''});
    userController.rejectGroupName();
  },
  handleClientSelection: function(event) {
    userController.selectClient(event.target.value);
  },
  handleClientSelected: function(e) {
    e.preventDefault();
    userController.selectedClient();
  },
  handleSubmit: function (e) {
    e.preventDefault();
  },
  handleReady: function (e) {
    e.preventDefault();
    UserRegistrationView.close();
  },
  componentDidMount: function () {
    var self = this,
        focusAndSelect = function (ref) {
          var node = self.refs[ref] ? self.refs[ref] : null;
          if (node) {
            node.focus();
            node.select();
          }
        };
    if (this.props.form == 'username') {
      focusAndSelect('userName');
    }
    else if (this.props.form == 'groupname') {
      focusAndSelect('groupName');
    }
  },
  render: function() {
    var form;
    if (this.props.form == 'auto-selected-board') {
      form = (
        <div>
          <h3>You have been automatically returned to circuit {this.props.client + 1} as {this.props.userName} in {this.props.groupName}.</h3>
          <button onClick={ this.handleReady } >Ok</button>
        </div>
      );
    }
    else if (this.props.form == 'gettingGlobalState') {
      form = (
        <div>
          <h3>Checking for previously set group and username</h3>
        </div>
      );
    }
    else if (this.props.form == 'groupname' || !this.state.groupName) {
      var groupOptions = groups.map(function(group, i) {
        return (<option key={i} value={group.name}>{group.name}</option>);
      });
      groupOptions.unshift(<option key="placeholder" value="" disabled="disabled">Select a team</option>);
      form = (
        <div>
          <h3>Welcome!</h3>
          <div>
            This activity requires a team of {this.props.numClients} users.
          </div>
          <h3>Please select your team:</h3>
          <label>
            <select value={this.state.groupName} onChange={ this.handleGroupNameChange }>
              { groupOptions }
            </select>
            <button onClick={ this.handleGroupSelected } >Select</button>
          </label>
        </div>
      );
    } else if (this.props.form == 'groupconfirm') {
      if (!this.props.userName) {
        form = (
          <div>
            <h3>Group name: { this.state.groupName }</h3>
            <div>
              There are already { this.props.numExistingUsers } in this group.
            </div>
            <label>
              <button onClick={ this.handleRejectGroup } >Enter a different group</button>
            </label>
          </div>
        );
      } else {
        var userDetails,
            groupDetails,
            joinStr,
            keys = Object.keys(this.props.users),
            userName = this.props.userName,
            otherUsers = keys.filter(function (key) {
              return key !== userName;
            });

        userDetails = (
          <p>
            <label>You have been assigned the name <b>{userName}</b>.</label>
          </p>
        );

        if (otherUsers.length === 0) {
          groupDetails = (
            <p>
              <label>You are the first member of this group.</label>
            </p>
          );
        } else {
          groupDetails = (
            <div>
              <p>
                <label>These users are already in this group:</label>
              </p>
              <ul>
                {otherUsers.map(function(result, index) {
                  return <li key={index}><b>{result}</b></li>;
                })}
              </ul>
            </div>
          );
        }

        joinStr = (keys.length ? "join" : "create");

        form = (
          <div>
            <h3>Group name: { this.state.groupName }</h3>
            { userDetails }
            { groupDetails }
            <div style={{marginTop: 10}}>Do you want to { joinStr } this group?</div>
            <label>
              <button onClick={ this.handleJoinGroup } >Yes, { joinStr }</button>
              <button onClick={ this.handleRejectGroup } >No, enter a different group</button>
            </label>
          </div>
        );
      }
    } else if (this.props.form == 'selectboard') {
      var clientChoices = [],
          submittable = false;
      for (var i = 0, ii = this.props.numClients; i < ii; i++) {
        var userSpan = ( <i>currently unclaimed</i> ),
            isOwn = false,
            selected = false,
            valid = true,
            selectedUsers = [],
            defaultChecked = false;

        for (var user in this.props.users) {
          if (this.props.users[user].client == i) {
            selectedUsers.push(user);
            if (user == this.props.userName) {
              isOwn = true;
              selected = true;
            }
            if (selectedUsers.length > 1) {
              valid = false;
            }
            userSpan = ( <span className={ valid ? "" : "error"}>{ selectedUsers.join(", ") }</span> );
            defaultChecked = true;
          }
        }
        if (isOwn && selectedUsers.length == 1) {
          submittable = true;
        }

        clientChoices.push(
          <div key={ i } >
            <input type="radio" name="clientSelection" value={ i } defaultChecked={ defaultChecked } onClick={ this.handleClientSelection }/>Circuit { i+1 } ({ userSpan })
          </div> );
      }

      form = (
        <div>
          <h3>Select Circuit</h3>
          { clientChoices }
          <label>
            <button disabled={ !submittable } onClick={ this.handleClientSelected } >Select</button>
            <button onClick={ this.handleRejectGroup } >Enter a different group</button>
          </label>
        </div>
      );
    }

    return (
      <form onSubmit={ this.handleSubmit }>
        { form }
      </form>
    );
  }
});

// used because JSX deprecated the spread function in the transformer
UserRegistrationViewFactory = React.createFactory(UserRegistrationView);
