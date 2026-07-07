const express = require('express');
const router = express.Router();

const Album = require('../models/Album.model');
const Image = require('../models/Image.model');
const User = require('../models/User.model');

const authMiddleware = require('../middleware/authMiddleware');

//CREATE ALBUM -----------------------------
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Album name is required" });
        };

        const album = await Album.create({
            name,
            description,
            ownerId: req.user._id
        });

        const exists = await Album.findById({
            ownerId: req.user._id,
            name
        })

        if (exists) {
            return res.status(409).json({ message: "Album name already exists"});
        };

        res.status(201).json({
            message: "Album created successfully.",
            album
        });
    } catch (error) {
        console.log("The error is : ", error);
        res.status(500).json({ error: "Failed to create album" });
    };
});

//GET ALL ALBUM -----------------------------
router.get("/", authMiddleware, async (req, res) => {
    try {
        const albums = await Album.find({
            $or: [
                { ownerId: req.user._id },
                { sharedUsers: req.user._id }
            ]
        }).populate("ownerId", "name email")
            .populate("sharedUsers", "name email");

        if (albums.length !== 0) {
            res.json(albums);
        } else {
            res.status(404).json({ error: "No album found." });
        };

    } catch (error) {
        console.log("The error is - ", error);
        res.status(500).json({ error: "Failed to fetch albums from database" });
    }
});

//GET ALBUM BY ID -----------------------------
router.get("/:albumId", authMiddleware, async (req, res) => {
    try {
        const albumById = await Album.findById(req.params.albumId)
            .populate("ownerId", "name email")
            .populate("sharedUsers", "name email");

        if (!albumById) {
            return res.status(404).json({
                message: "Album not found"
            });
        };

        const hasAccess =
            albumById.ownerId._id.equals(req.user._id) ||
            albumById.sharedUsers.some(user => user._id.equals(req.user._id));

        if (!hasAccess) {
            return res.status(403).json({
                message: "Access denied."
            });
        };

        res.status(200).json(albumById);

    } catch (error) {
        console.log("The error is : ", error);
        res.status(500).json({
            message: "Failed to fetch the album"
        });
    }
});

//UPDATE PARTICULAR ALBUM--------------------------------
router.post("/:albumId", authMiddleware, async (req, res) => {

    try {

        const { description } = req.body;

        const album = await Album.findById({
            albumId: req.params.albumId
        });

        if (!album) {
            return res.status(404).json({
                message: "Album not found."
            });
        }

        if (!album.ownerId.equals(req.user._id)) {

            return res.status(403).json({
                message: "Only owner can update album."
            });
        };

        album.description = description;

        await album.save();

        res.status(200).json({
            message: "Album updated successfully.",
            album
        });

    } catch (err) {
        console.log("The error is : ", error);
        res.status(500).json({
            message: err.message
        });
    };
});

//DELETE A ALBUM-----------------------------
router.delete("/:albumId", authMiddleware, async (req, res) => {

    try {

        const album = await Album.findById({
            albumId: req.params.albumId
        });

        if (!album) {

            return res.status(404).json({
                message: "Album not found."
            });

        }

        if (!album.ownerId.equals(req.user._id)) {

            return res.status(403).json({
                message: "Only owner can delete album."
            });
        }

        // Delete all images belonging to album

        await Image.deleteMany({
            albumId: album._id
        });

        await album.deleteOne();

        res.status(200).json({
            message: "Album deleted successfully."
        });

    } catch (err) {
        console.log("The error is : ", error);
        res.status(500).json({
            message: err.message
        });

    }
});


//ALBUM SHARING---------------------------------------
router.post("/:albumId/share", authMiddleware, async (req, res) => {

    try {

        const { emails } = req.body;

        if (!emails || !Array.isArray(emails)) {

            return res.status(400).json({
                message: "Emails array is required."
            });
        }

        const album = await Album.findById({
            albumId: req.params.albumId
        });

        if (!album) {

            return res.status(404).json({
                message: "Album not found."
            });

        }

        if (!album.ownerId.equals(req.user._id)) {

            return res.status(403).json({
                message: "Only owner can share album."
            });

        }

        const users = await User.find({
            email: { $in: emails }
        });

        if (users.length !== emails.length) {

            return res.status(404).json({
                message: "Some users do not exist."
            });

        }

        users.forEach(user => {

            if (
                !album.sharedUsers.some(
                    shared => shared.equals(user._id)
                )
            ) {
                album.sharedUsers.push(user._id);
            }

        });

        await album.save();

        res.status(200).json({
            message: "Album shared successfully.",
            sharedUsers: users
        });

    } catch (err) {
        console.log("The error is : ", error);
        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

module.exports = router;