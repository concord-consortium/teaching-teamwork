var userController, UserRegistrationView;

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

      setTimeout(function(){
        $('#user-registration')[0].style.opacity = 1;},
      100);

      return React.render(
        <UserRegistrationView {...data} />,
        $anchor.get(0)
      );
    },

    // close a dialog
    close: function() {
      React.unmountComponentAtNode($('#user-registration').get(0));
      $('#user-registration').remove();
    }
  },
  getInitialState: function() {
    return {
      userName: $.trim($.cookie('userName') || ''),
      groupName: $.trim($.cookie('groupName') || '')
    };
  },
  handleUserNameChange: function(event) {
    this.setState({userName: event.target.value});
  },
  handleGroupNameChange: function(event) {
    this.setState({groupName: event.target.value});
  },
  handleSubmit: function(e) {
    e.preventDefault();
    if (this.props.form == "username") {
      userController.setName(this.state.userName);
    } else if (this.props.form == "groupname") {
      userController.checkGroupName(this.state.groupName);
    }
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
  selectInput: function () {
  },
  componentDidMount: function () {
    var self = this,
        focusAndSelect = function (ref) {
          var node = self.refs[ref] ? self.refs[ref].getDOMNode() : null;
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
    if (this.props.form == 'username') {
      form = (
        <div>
          <label>
            <span>User Name :</span>
            <input type="text" ref="userName" value={this.state.userName} onChange={this.handleUserNameChange} />
          </label>
        </div>
      );
    } else if (this.props.form == 'groupname') {
      form = (
        <div>
          <h3>Hi { this.state.userName }!</h3>
          <label>
            <span>Group Name :</span>
            <input type="text" ref="groupName" value={this.state.groupName} onChange={this.handleGroupNameChange} />
          </label>
        </div>
      );
    } else if (this.props.form == 'groupconfirm') {
      var groupDetails,
          joinStr,
          keys = Object.keys(this.props.users);
      if (keys.length === 0) {
        groupDetails = (
          <div>
            <label>You are the first member of this group.</label>
          </div>
        );
      } else {
        groupDetails = (
          <div>
            <label>These are the people currently in this group:</label>
            <ul>
              {keys.map(function(result) {
                return <li><b>{result}</b></li>;
              })}
            </ul>
          </div>
        );
      }

      joinStr = (keys.length ? "join" : "create");

      form = (
        <div>
          <h3>Group name: { this.state.groupName }</h3>
          { groupDetails }
          <label>&nbsp;</label>
          <span>Do you want to { joinStr } this group?</span>
          <label>
            <button onClick={ this.handleJoinGroup } >Yes, { joinStr }</button>
            <button onClick={ this.handleRejectGroup } >No, enter a different group</button>
          </label>
        </div>
      );
    } else if (this.props.form == 'selectboard') {
      var clientChoices = [],
          submittable = false;
      for (var i = 0, ii = this.props.numClients; i < ii; i++) {
        var userSpan = ( <i>currently unclaimed</i> ),
            isOwn = false,
            selected = false,
            valid = true,
            selectedUsers = [];
        for (var user in this.props.users) {
          if (this.props.users[user].client == i) {
            selectedUsers.push(user);
            if (user == this.state.userName) {
              isOwn = true;
              selected = true;
            }
            if (selectedUsers.length > 1) {
              valid = false;
            }
            userSpan = ( <span className={ valid ? "" : "error"}>{ selectedUsers.join(", ") }</span> );
          }
        }
        if (isOwn && selectedUsers.length == 1) {
          submittable = true;
        }

        clientChoices.push(
          <div key={ i } >
            <input type="radio" name="clientSelection"  defaultChecked={ selected } value={ i } onClick={ this.handleClientSelection }/>Circuit { i+1 } ({ userSpan })
          </div> );
      }

      form = (
        <div>
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
