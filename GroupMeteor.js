// simple-todos.js
Groups = new Mongo.Collection("groups");

if (Meteor.isClient) {
  // This code only runs on the client

  Meteor.subscribe("groups");

  Template.body.helpers({
    groups: function () {
      return Groups.find({}, {sort: {createdAt: -1}});
    }
  });

  Template.body.events({
    "submit .new-group": function (event) {
      // Grab value from text field
      var groupName = event.target.text.value;
      // Check that textfield isn't empty
      if(groupName != ''){
        Meteor.call("addGroup", groupName);
      }
      // Clear form
      event.target.text.value = "";
      // Prevent default form submit
      return false;
    },
    "submit .new-number": function (event) {
      // Grab value from text field
      var newNumber = event.target.number.value;

      if(newNumber != ''){
        Meteor.call("addNumber", this, newNumber);
      }
      // Clear form
      event.target.number.value = "";
      // Prevent default form submit
      return false;
    },
    "click .text-blast": function(){
      Meteor.call("textBlast");
    }
  });

  Template.group.events({
    "click .toggle-checked-group": function () {
      // Set the checked property to the opposite of its current value
      Meteor.call("setCheckedGroup", this._id, ! this.checked);
    },
    "click .toggle-checked-number": function () {
      // Set the checked property to the opposite of its current value
      var data = Template.instance().data;
      Meteor.call("setCheckedNumber", data._id, this.number, ! this.checked);
    },
    "click .delete": function () {
      Meteor.call("deleteGroup", this._id);
    },
    "click .deleteNumber": function () {
      var data = Template.instance().data;
      Meteor.call("deleteNumber", data._id, this.number);
    }
  });

  // At the bottom of the client code
  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

Meteor.methods({
  addGroup: function (name) {
    // Make sure the user is logged in before creating a group
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
    Groups.insert({
      name: name,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username,
      checked: false,
      numbers: []
    });
  },
  addNumber: function (group, newNumber) {
    // Make sure the user is logged in before adding a number
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Groups.update({_id:group._id}, {$addToSet: {numbers: {"number":newNumber, "checked": true }}})

  },
  deleteGroup: function (groupId) {
    Groups.remove(
      groupId
    );
  },
  deleteNumber: function (groupId, number) {
    //Delete number from group.
    Groups.update(
      groupId, 
      { $pull: 
        {
          numbers: 
          {
            "number": number
          }
        }
      }
    );
  },
  setCheckedGroup: function (groupId, setChecked) {
    Groups.update( {_id:groupId}, { $set: { checked: setChecked} });
  },
  setCheckedNumber: function (groupId, number, setChecked) {
    Groups.update({ _id:groupId, "numbers.number":number},
      { $set: {"numbers.$.checked": setChecked}}
    );
  },
  textBlast: function(){
    var phonebook = [];
    var recipients = Groups.find({owner: this.userId, numbers: { $elemMatch: {"checked": true}}});
    recipients.forEach(function(recipient){
      for(var index in recipient.numbers){
        //console.log(recipient.numbers[number].number);
        phonebook.push(recipient.numbers[index].number);
      }
    });
    console.log(phonebook);
  }
});

// At the bottom of simple-todos.js
if (Meteor.isServer) {
  Meteor.publish("groups", function () {
    return Groups.find({
        owner: this.userId
    });
  });
}