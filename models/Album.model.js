const mongoose = require('mongoose');

const AlbumSchema = new mongoose.Schema({

    name: {
        type: String,
        trim: true,
        required: true,
    },
    description: {
        type: String,
        trim: true,
        default: "",
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    sharedUsers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    ],
},
    {
        timestamps: true,
    });

const Album = mongoose.model("Album", AlbumSchema);

module.exports = Album;