// GroupMeteor.js
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
      if(groupName !== ''){
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

      if(newNumber !== ''){
        Meteor.call("addNumber", this, newNumber);
      }
      // Clear form
      event.target.number.value = "";
      // Prevent default form submit
      return false;
    },
    "click .text-blast": function(){
      var outgoingMessage = document.getElementById('new-message').value;
      Meteor.call("textBlast", outgoingMessage);
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

    Groups.update({_id:group._id}, {$addToSet: {numbers: {"number":newNumber, "checked": true }}});

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
    if(setChecked){
      // Set everyone number in the group to true when the group is set to true
      // NEEDS FIX  
    }
    else{
      // Set everyone number in the group to false when the group is set to false
      //Groups.update({_id:groupId}, { $set: {"numbers.0.checked": setChecked}});
      //NEEDS FIX
    }
  },
  setCheckedNumber: function (groupId, number, setChecked) {
    Groups.update({ _id:groupId, "numbers.number":number},
      { $set: {"numbers.$.checked": setChecked}}
    );
  },
  textBlast: function(outgoingMessage){
    var phonebook = [];
    var recipients = Groups.find({owner: this.userId, numbers: { $elemMatch: {"checked": true}}});
    recipients.forEach(function(recipient){
      for(var index in recipient.numbers){
        phonebook.push(recipient.numbers[index].number);
      }
    });
    var uniqueBook = new Set(phonebook);
    uniqueBook.forEach(function(number){
      HTTP.call(
          "POST", 
          'https://api.twilio.com/2010-04-01/Accounts/AC4f2f0aabf2fbaae0d3b59ee1638f0f22/SMS/Messages.json', 
          { 
              params:{
                From: '+14152002277', 
                To: number, 
                Body: outgoingMessage
              }, 
            auth:'AC4f2f0aabf2fbaae0d3b59ee1638f0f22:df206a3847b815f8f54a379b8296e08a'
          },
          function (error, result) {
            if (!error) {
              console.log(result);
            }
            else{
              console.log(error);
            }
          }
      );
    });
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