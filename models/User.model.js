const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({

    googleId: {
        type: String,
        unique: true,
        required: true,
    },
    name: {
        type: String,
        trim: true,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    profilePicture: {
        type: String,
        default: "",
    },
},
    {
        timestamps: true,
    });

const User = mongoose.model("User", UserSchema);

module.exports = User;