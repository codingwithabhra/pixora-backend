const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({

    albumId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Album",
        required: true,
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    name: {
        type: String,
        trim: true,
        required: true,
    },
    filePath: {
        type: String,
        required: true,
    },
    tags: [
        {
            type: String,
            trim: true,
        }
    ],
    person: { //Name of the person in the image (if tagged)
        type: String,
        default: "",
        trim: true,
    },
    isFavourite: {
        type: Boolean,
        default: false,
    },
    comments: [
        {
            type: String,
            trim: true,
        },
    ],
    size: {
        type: Number,
        required: true,
    },
    publicId: {
        type: String,
        required: true
    }
},
    {
        timestamps: true,
    });

const Image = mongoose.model("Image", ImageSchema);

module.exports = Image;