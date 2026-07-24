const express = require('express');
const router = express.Router();
const fs = require('fs');

const Album = require('../models/Album.model');
const Image = require('../models/Image.model');
const User = require('../models/User.model');

const cloudinary = require('../imageSettings/cloudinary');
const upload = require('../imageSettings/imageMiddleware');

const authMiddleware = require('../middleware/authMiddleware');

//get all images of an album
router.get("/albums/:albumId/images", authMiddleware, async (req, res) => {
    try {
        const album = await Album.findById(req.params.albumId);

        if (!album) {
            return res.status(404).json({
                message: "Album not found"
            });
        }

        const hasAccess =
            album.ownerId.equals(req.user._id) ||
            album.sharedUsers.some(user => user.equals(req.user._id));

        if (!hasAccess) {
            return res.status(403).json({
                message: "Access denied"
            })
        }

        const images = await Image.find({
            albumId: req.params.albumId
        });

        res.status(200).json(images);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Failed to fetch images"
        });
    }
})

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

        console.log(req.file);
        console.log(req.file.path);

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
            tags: tags ? Array.isArray(tags) ? tags : tags.split(",").map(tag => tag.trim()) : [],
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
router.post("/albums/:albumId/images/:imageId/favourites", authMiddleware, async (req, res) => {
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

// GET ALL FAVOURITE IMAGES
router.get("/images/favourites", authMiddleware, async (req, res) => {
    try {
        // Find all albums user has access to
        const albums = await Album.find({
            $or: [
                { ownerId: req.user._id },
                { sharedUsers: req.user._id }
            ]
        });
        const albumIds = albums.map(album => album._id);

        // Only favourite images
        const favouriteImages = await Image.find({
            albumId: { $in: albumIds },
            isFavourite: true
        }).populate("albumId", "name");

        res.status(200).json(favouriteImages);

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Failed to fetch favourite images" });
    }
});

//add comment
router.post("/albums/:albumId/images/:imageId/comments", authMiddleware, async (req, res) => {
    try {
        const { comment } = req.body;
        const image = await Image.findById(req.params.imageId);
        if (!image) {
            return res.status(404).json({ message: "Image not found" });
        };
        image.comments.push({ text: comment, commentedBy: req.user._id, });
        await image.save();
        res.status(201).json({ message: "Comment added", image });
    } catch (error) {
        console.log("The error is :", error);
        res.status(500).json({ message: "Filed to add comment" });
    };
});

router.delete("/albums/:albumId/images/:imageId/comments/:commentId", authMiddleware, async (req, res) => {

    try {
        const image = await Image.findById(req.params.imageId);

        if (!image) {
            return res.status(404).json({
                message: "Image not found"
            });
        }
        image.comments = image.comments.filter(
            comment => comment._id.toString() !== req.params.commentId
        );
        await image.save();
        res.status(200).json(image);

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Failed to delete comment"
        });
    }
}
);

//delete image
router.delete("/albums/:albumId/images/:imageId", authMiddleware, async (req, res) => {
    try {
        const image = await Image.findById(req.params.imageId);
        if (!image) {
            return res.status(404).json({ message: "Image not found" });
        };
        //checking ownership
        const album = await Album.findById(image.albumId);
        if (!album.ownerId.equals(req.user._id)) {
            return res.status(403).json({ message: "Only owner can delete image" });
        };

        await cloudinary.uploader.destroy(image.publicId);
        await Image.findByIdAndDelete(req.params.imageId);

        res.json({ message: "Image deleted successfully" });
    } catch (error) {
        console.log("The error is :", error);
        res.status(500).json({ message: "Filed to delete image" });
    }
});

//Get image by id
router.get("/albums/:albumId/images/:imageId", authMiddleware, async (req, res) => {
    try {
        const image = await Image.findById(req.params.imageId).populate("comments.commentedBy", "name");
        if (!image) {
            return res.status(404).json({ message: "image not found" });
        };
        res.status(200).json(image);
    } catch (error) {
        console.log("The error is --", error);
        res.status(500).json({ message: "Failed to fetch image" })
    }
});

//update image by id
router.post("/albums/:albumId/images/:imageId", authMiddleware, async (req, res) => {
    try {
        const { name, tags, person, isFavourite } = req.body;
        const image = await Image.findById(req.params.imageId);
        if (!image) {
            return res.status(404).json({ message: "image not found" });
        };
        image.name = name;
        image.person = person;
        image.isFavourite = isFavourite;

        image.tags = Array.isArray(tags)
            ? tags
            : tags.split(",").map(tag => tag.trim());

        await image.save();

        res.json(image);
    } catch (error) {
        console.log("The error is --", error);
        res.status(500).json({ message: "Failed to update image" })
    }
});

//get all images
router.get("/images", authMiddleware, async (req, res) => {

    try {
        const albums = await Album.find({
            $or: [
                { ownerId: req.user._id },
                { sharedUsers: req.user._id }
            ]
        });

        const albumIds = albums.map(album => album._id);

        const images = await Image.find({
            albumId: {
                $in: albumIds
            }
        }).populate("albumId", "name");
        res.status(200).json(images);

    } catch (error) {

        console.log(error);
        res.status(500).json({
            message: "Failed to fetch images"
        });
    }
});

//get image by tags
router.get("/search", authMiddleware, async(req, res)=> {
    try {
        const { tag } = req.query;

        if(!tag){
            return res.status(400).json({message:"Provide a tag"})
        };

        const image = await Image.find({tags:tag.toLowerCase()});
        res.status(200).json(image);

    } catch (error) {

        console.log(error);
        res.status(500).json({
            message: "Images with that tag, not found"
        });
    }
});

module.exports = router;