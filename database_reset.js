// This could be part of your server.js or a separate script
const mongoose = require('mongoose');
const Counter = require('./models/Counter');  
const User = require('./models/User');  

mongoose.connect('mongodb://localhost/users').then(async () => {
    console.log('Connected to Database');

    Counter.findOne({_id: 'userId'}).then((foundCounter) => {
        if (!foundCounter) {
            console.log('Creating userId counter...');
            new Counter({_id: 'userId', seq: 0}).save().then(() => {
                console.log('userId counter initialized.');
            }).catch(err => console.error('Failed to create userId counter:', err));
        } else {
            foundCounter.seq = 0;
            foundCounter.save().then(() => {
                console.log('userId counter reset.');
            }).catch(err => console.error('Failed to reset userId counter:', err));
        }
    }).catch(err => console.error('Error checking for userId counter:', err));

    // Delete all users
    User.deleteMany({})
        .then(result => {
            console.log('All users deleted:', result.deletedCount);
            // Optional: Close the connection after the operation
            mongoose.connection.close();
        })
        .catch(err => {
            console.error('Error deleting users:', err);
        });
}).catch(err => console.error('Failed to connect to MongoDB:', err));
