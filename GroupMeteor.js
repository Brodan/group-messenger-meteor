// GroupMeteor.js
Groups = new Mongo.Collection("groups");

if (Meteor.isClient) {
    // Specify which collections from the server the client subscribes to
    Meteor.subscribe("groups");

    Template.body.helpers({
        groups: function () {
            // Find all groups and list the newest groups first
            return Groups.find({}, {sort: {createdAt: -1}});
        }
    });

    Template.body.events({
        "submit .new-group": function (event) {
            // Grab group name from text field
            var newGroup = event.target.group.value;
            // Check that text field is not blank before adding group
            if (newGroup !== '') {
                Meteor.call("addGroup", newGroup);
            }
            // Clear the text field for next entry
            event.target.group.value = "";
            // Prevent default form submit
            return false;
        },
        "submit .new-number": function (event) {
            // Grab phone number from text field
            var newNumber = event.target.number.value;
            // Check that text field is not blank before adding number
            if (newNumber !== '') {
                Meteor.call("addNumber", this._id, newNumber);
            }
            // Clear the text field for next entry
            event.target.number.value = "";
            // Prevent default form submit
            return false;
        },
        "submit .new-text": function (event) {
            // Grab text message from text field
            var newMessage = event.target.message.value;
            // Check that message field is not blank before sending texts
            if (newMessage !== '') {
                Meteor.call("sendMessage", newMessage);
            }
            // Clear the text field
            event.target.message.value = "";
            alert('Your message is being sent!');
            // Prevent default form submit
            return false;
        }
    });

    Template.group.events({
        "click .toggle-group": function () {
            // Set the checked property to the opposite of its current value
            Meteor.call("toggleGroup", this._id, !this.checked);
        },
        "click .toggle-number": function () {
            // Get the number's group data
            var data = Template.instance().data;
            // Set the checked property to the opposite of its current value
            Meteor.call("toggleNumber", data._id, this.number, !this.checked);
        },
        "click .delete-group": function () {
            // Remove a group from our collection
            Meteor.call("deleteGroup", this._id);
        },
        "click .delete-number": function () {
            // Get the number's group data
            var group = Template.instance().data;
            // Remove a number from a particular group
            Meteor.call("deleteNumber", group._id, this.number);
        }
    });
    // Configure Accounts to require username instead of email
    Accounts.ui.config({
        passwordSignupFields: "USERNAME_ONLY"
    });
}

if (Meteor.isServer) {
    // Specify which collections are sent to the client
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
        toggleGroup: function (groupId, toggle) {
            Groups.update(
                {_id: groupId}, 
                { $set: { checked: toggle}}
            );
            // Find every number that differs from Group's "checked" boolean
            var numbers = 
                Groups.find(
                    {numbers: { $elemMatch: {"checked": !toggle}}}
                );
            // Set all numbers to match Group's "checked" boolean
            numbers.forEach(function (setter) {
                for (var index in setter.numbers) {
                    Groups.update(
                        { _id: groupId, "numbers.number": setter.numbers[index].number }, 
                        { $set: {"numbers.$.checked": toggle} }
                    );
                }
            });
        },
        toggleNumber: function (groupId, number, toggle) {
            Groups.update(
                { _id: groupId, "numbers.number": number }, 
                { $set: {"numbers.$.checked": toggle} }
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
                    'https://api.twilio.com/2010-04-01/Accounts/' + 
                    process.env.TWILIO_ACCOUNT_SID + '/SMS/Messages.json', {
                        params: {
                            From: process.env.TWILIO_NUMBER, // Your Twilio number. Use environment variable
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