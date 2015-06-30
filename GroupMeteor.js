// GroupMeteor.js
Groups = new Mongo.Collection("groups");

if (Meteor.isClient) {

    Meteor.subscribe("groups");

    Template.body.helpers({
        groups: function () {
            // Find all groups and list the newest groups first
            return Groups.find({}, {sort: {createdAt: -1}});
        }
    });

    Template.body.events({
        "submit .new-group": function (event) {
            // Grab value from text field
            var newGroup = event.target.text.value;
            // Check that text field is not blank before adding group
            if (newGroup !== '') {
                Meteor.call("addGroup", newGroup);
            }
            // Clear form
            event.target.text.value = "";
            // Prevent default form submit
            return false;
        },
        "submit .new-number": function (event) {
            // Grab value from text field
            var newNumber = event.target.number.value;
            // Check that text field is not blank before adding number
            if (newNumber !== '') {
                Meteor.call("addNumber", this._id, newNumber);
            }
            // Clear form
            event.target.number.value = "";
            // Prevent default form submit
            return false;
        },
        "click .send": function () {
            // Grab value from text field
            var newMessage = document.getElementById('new-message').value;
            // Check that text field is not blank before adding number
            if (newMessage !== '') {
                Meteor.call("sendMessage", newMessage);
                // Clear form
                document.getElementById('new-message').value = '';
                alert('Your message is being sent.');
            }
        }
    });

    Template.group.events({
        "click .toggle-group": function () {
            // Set the checked property to the opposite of its current value
            Meteor.call("checkGroup", this._id, !this.checked);
        },
        "click .toggle-number": function () {
            // Get the number's group data
            var data = Template.instance().data;
            // Set the checked property to the opposite of its current value
            Meteor.call("checkNumber", data._id, this.number, !this.checked);
        },
        "click .delete-group": function () {
            Meteor.call("deleteGroup", this._id);
        },
        "click .delete-number": function () {
            // Get the number's group data
            var group = Template.instance().data;
            Meteor.call("deleteNumber", group._id, this.number);
        }
    });
    // Configure Accounts to require username instead of email
    Accounts.ui.config({
        passwordSignupFields: "USERNAME_ONLY"
    });
}

if (Meteor.isServer) {
    Meteor.publish("groups", function () {
        return Groups.find({
            owner: this.userId
        });
    });

    Meteor.methods({
        addGroup: function (name) {
            Groups.insert({
                name: name,
                createdAt: new Date(),
                owner: Meteor.userId(),
                checked: false,
                numbers: []
            });
        },
        addNumber: function (groupId, number) {
            Groups.update(
                {_id: groupId},
                {$addToSet: {numbers: {"number": number, "checked": true }}}
            );
        },
        deleteGroup: function (groupId) {
            Groups.remove(
                {_id: groupId}
            );
        },
        deleteNumber: function (groupId, number) {
            Groups.update(
                {_id: groupId}, 
                { $pull: { numbers: {"number": number}}}
            );
        },
        checkGroup: function (groupId, isChecked) {
            Groups.update(
                {_id: groupId}, 
                { $set: { checked: isChecked}}
            );
            if (isChecked) {
                // Set everyone number in the group to true when the group is set to true
                // NEEDS FIX  
            }
            else {
                // Set everyone number in the group to false when the group is set to false
                // Groups.update({_id: groupId}, { $set: {"numbers.0.checked": setChecked}});
                // NEEDS FIX
            }
        },
        checkNumber: function (groupId, number, isChecked) {
            Groups.update(
                { _id: groupId, "numbers.number": number }, 
                { $set: {"numbers.$.checked": isChecked} }
            );
        },
        sendMessage: function (outgoingMessage) {
            var phonebook = [];
            // Find all checked numbers across all groups
            var recipients = 
                Groups.find(
                    {numbers: { $elemMatch: {"checked": true}}}
                );
            // Add each number from our query to our phonebook
            recipients.forEach(function (recipient) {
                for (var index in recipient.numbers) {
                    phonebook.push(recipient.numbers[index].number);
                }
            });
            // Place all numbers in a Set so no number is texted more than once
            var uniquePhoneBook = new Set(phonebook);
            // Use Twilio REST API to text each number in the unique phonebook
            uniquePhoneBook.forEach(function (number) {
                HTTP.call(
                    "POST",
                    'https://api.twilio.com/2010-04-01/Accounts/AC4f2f0aabf2fbaae0d3b59ee1638f0f22/SMS/Messages.json', {
                        params: {
                            From: process.env.TWILIO_NUMBER, // Your Twilio number. alternatively, set as environment variable
                            To: number,
                            Body: outgoingMessage
                        },
                        // Set your credentials as environment variables 
                        // so that they are not loaded on the client
                        auth:
                            process.env.TWILIO_ACCOUNT_SID + ':' +
                            process.env.TWILIO_AUTH_TOKEN
                    },
                    // Print error or success to console
                    function (error) {
                        if (error) {
                            console.log(error);
                        }
                        else {
                            console.log('SMS sent successfully.');
                        }
                    }
                );
            });
        }
    });
}