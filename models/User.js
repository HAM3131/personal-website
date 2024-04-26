const mongoose = require('mongoose');
const Counter = require('./Counter');

const userSchema = new mongoose.Schema({
    userid: {
        type: Number,
        unique: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    display_name: {
        type: String,
        required: true
    },
    password: { // Store passwords securely using hashing in production
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        default: 'No Go :('
    },
    timer: { // Store the time code for when the user's timer will end
        type: Number,
        default: 0
    }
});

userSchema.pre('save', async function (next) {
    if (this.isNew) {
        const counter = await Counter.findByIdAndUpdate('userId', { $inc: { seq: 1 } }, { new: true, upsert: true });
        this.userid = counter.seq;
    }
    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
