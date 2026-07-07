const express = require('express');
const router = express.Router();
const fs = require('fs');

const Album = require('../models/Album.model');
const Image = require('../models/Image.model');
const User = require('../models/User.model');

const cloudinary = require('../imageSettings/cloudinary');
const upload = require('../imageSettings/imageMiddleware');

const authMiddleware = require('../middleware/authMiddleware');

//upload image
router.post("/albums/:albumId/images", authMiddleware, upload.single("image"), async (req, res) => {
    try {
        const { tags, person, isFavourite } = req.body;

        const album = await Album.findById(req.params.albumId);

        if (!album) {
            return res.status(404).json(
                {
                    message: "Album not found"
                });
        };

        const hasAccess = album.ownerId.equals(req.user._id) || album.sharedUsers.some(user => user.equals(req.user._id));

        if (!hasAccess) {
            return res.status(403).json({ message: "Access denied" });
        };

        if (!req.file) {
            return res.status(400).json({ message: "Image required" });
        };

        //upload to cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "Pixora/Albums"
        });

        //delete the temporary file so that the uploads folder doesn't keep growing
        fs.unlinkSync(req.file.path);

        //file size
        const image = await Image.create({
            albumId: album._id,
            uploadedBy: req.user._id,
            name: req.file.originalname,
            filePath: result.secure_url,
            size: req.file.size,
            tags: tags ? Array.isArray(tags) ? tags: tags.split(",").map(tag => tag.trim()) : [],
            person,
            isFavourite: isFavourite === "true",
            publicId: result.public_id,
        });

        res.status(201).json({ message: "Image uploaded successfully", image });

    } catch (error) {
        console.log("The error is :", error);
        res.status(500).json({ message: "Image could not be uploaded" });
    }
});

//favourite image
router.post("/albums/:albumId/images/:imageId/favourite", authMiddleware, async (req, res) => {
    try {
        const { isFavourite } = req.body;

        const image = await Image.findById(req.params.imageId);

        if (!image) {
            return res.status(404).json({ message: "Image not found" });
        };

        image.isFavourite = isFavourite;
        await image.save();

        res.json({ message: "Favorite image updated", image });
    } catch (error) {
        console.log("The error is :", error);
        res.status(500).json({ message: "Failed to add favourite image" });
    };
});

//add comment
router.post("/albums/:albumId/images/:imageId/comments", authMiddleware, async (req, res) => {
    try {
        const { comment } = req.body;
        const image = await Image.findById(req.params.imageId);
        if (!image) {
            return res.status(404).json({ message: "Image not found" });
        };
        image.comments.push(comment);
        await image.save();
        res.status(201).json({ message: "Comment added", image });
    } catch (error) {
        console.log("The error is :", error);
        res.status(500).json({ message: "Filed to add comment" });
    };
});

//delete image
router.delete("/albums/:albumId/images/:imageId", authMiddleware, async (req, res) => {
    try {
        const image = await Image.findById(req.params.imageId);
        if (!image) {
            return res.status(404).json({ message: "Image not found" });
        };
        //checking ownership
        const album = await Album.findById(image.albumId);
        if (!album.ownerId.equals(req.user._id)){
            return res.status(403).json({ message: "Only owner can delete image" });
        };

        await cloudinary.uploader.destroy(publicId);
        await Image.findByIdAndDelete(req.params.imageId);

        res.json({ message: "Image deleted successfully" });
    } catch (error) {
        console.log("The error is :", error);
        res.status(500).json({ message: "Filed to delete image" });
    }
});

module.exports = router;