const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const friendsSchema = new Schema({
    friender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    friendee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

// Creating an index to ensure that each friendship is unique
friendsSchema.index({ friender: 1, friendee: 1 }, { unique: true });

const Friends = mongoose.model('Friends', friendsSchema);

module.exports = Friends;
