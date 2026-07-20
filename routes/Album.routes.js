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

        const exists = await Album.findOne({
            ownerId: req.user._id,
            name
        });

        if (exists) {
            return res.status(409).json({
                message: "Album already exists."
            });
        }

        const album = await Album.create({
            name,
            description: description || "",
            ownerId: req.user._id
        });

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

        const albumsWithPreview = await Promise.all(
            albums.map(async (album) => {
                const previewImages = await Image.find({ albumId: album._id })
                    .limit(4)
                    .select("filePath");

                const totalImages = await Image.countDocuments({
                    albumId: album._id
                });

                return {
                    ...album.toObject(),
                    previewImages,
                    totalImages
                };
            })
        );

        res.json(albumsWithPreview);

    } catch (error) {
        console.log("The error is - ", error);
        res.status(500).json({ error: "Failed to fetch albums from database" });
    }
});

// GET ONLY SHARED ALBUMS
router.get("/shared/albumlist", authMiddleware, async (req, res) => {
    try {
        const albums = await Album.find({
            ownerId: req.user._id,
            sharedUsers: { $exists: true, $ne: [] }
        })
            .populate("ownerId", "name email")
            .populate("sharedUsers", "name email");

        const albumsWithPreview = await Promise.all(
            albums.map(async (album) => {

                const previewImages = await Image.find({
                    albumId: album._id
                })
                    .limit(4)
                    .select("filePath");

                const totalImages = await Image.countDocuments({
                    albumId: album._id
                });

                return {
                    ...album.toObject(),
                    previewImages,
                    totalImages,
                };
            })
        );
        res.json(albumsWithPreview);

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Failed to fetch shared albums" });
    }
});

//UPDATE PARTICULAR ALBUM--------------------------------
router.post("/:albumId", authMiddleware, async (req, res) => {

    try {

        const { description } = req.body;

        const album = await Album.findById(req.params.albumId);

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

    } catch (error) {
        console.log("The error is : ", error);
        res.status(500).json({
            message: error.message
        });
    };
});

//DELETE A ALBUM-----------------------------
router.delete("/:albumId", authMiddleware, async (req, res) => {

    try {

        const album = await Album.findById(req.params.albumId);

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

    } catch (error) {
        console.log("The error is : ", error);
        res.status(500).json({
            message: error.message
        });

    }
});


//ALBUM SHARING---------------------------------------
router.post("/:albumId/share", authMiddleware, async (req, res) => {

    try {

        const { userIds } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {

            return res.status(400).json({
                message: "User id is required."
            });
        }

        const album = await Album.findById(req.params.albumId);

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
            _id: { $in: userIds }
        });

        if (users.length !== userIds.length) {

            return res.status(404).json({
                message: "Some users do not exist."
            });
        }

        users.forEach((user) => {
            if (
                !album.sharedUsers.some((sharedUserId) =>
                    sharedUserId.equals(user._id)
                )
            ) {
                album.sharedUsers.push(user._id);
            }
        });

        await album.save();

        // Return populated shared users
        const updatedAlbum = await Album.findById(album._id)
            .populate("sharedUsers", "name email");

        res.status(200).json({
            message: "Album shared successfully.",
            sharedUsers: updatedAlbum.sharedUsers
        });

    } catch (error) {
        console.log("The error is : ", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET ALBUMS SHARED WITH ME
router.get("/shared-with-me", authMiddleware, async (req, res) => {

    try {

        const albums = await Album.find({
            ownerId: { $ne: req.user._id },   // not my album
            sharedUsers: req.user._id         // shared with me
        })
            .populate("ownerId", "name email profilePicture")
            .populate("sharedUsers", "name email");

        const albumsWithPreview = await Promise.all(

            albums.map(async (album) => {

                const previewImages = await Image.find({
                    albumId: album._id
                })
                    .limit(4)
                    .select("filePath");

                const totalImages = await Image.countDocuments({
                    albumId: album._id
                });

                return {
                    ...album.toObject(),
                    previewImages,
                    totalImages
                };
            })

        );

        res.json(albumsWithPreview);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            message: "Failed to fetch shared albums"
        });

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

module.exports = router;