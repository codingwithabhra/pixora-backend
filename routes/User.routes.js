const express = require('express');
const router = express.Router();

const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const Album = require('../models/Album.model');
const Image = require('../models/Image.model');

const { OAuth2Client } = require("google-auth-library");

const authMiddleware = require('../middleware/authMiddleware');

const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);

// router.get("/google", (req, res) => {
//     const googleURL =
//         `https://accounts.google.com/o/oauth2/v2/auth` +
//         `?client_id=${process.env.GOOGLE_CLIENT_ID}` +
//         `&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}` +
//         `&response_type=code` +
//         `&scope=profile email`;

//     res.redirect(googleURL);
// });

// router.get("/google/callback", async (req, res) => {
//     try {
//         const { code } = req.query;
//         if (!code) {
//             return res.status(404).json({
//                 message: "Authorization code missing"
//             })
//         };

//         //Exchanging code for Google access token
//         const tokenResponse = await axios.post("https://oauth2.googleapis.com/token",
//             {
//                 code,
//                 client_id: process.env.GOOGLE_CLIENT_ID,
//                 client_secret: process.env.GOOGLE_CLIENT_SECRET,
//                 redirect_uri: process.env.GOOGLE_REDIRECT_URI,
//                 grant_type: "authorization_code"
//             }
//         );

//         const accessToken = tokenResponse.data.access_token;

//         //Fetching Google user profile
//         const googleUser = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo",
//             {
//                 headers: {
//                     Authorization: `Bearer ${accessToken}`
//                 }
//             }
//         );

//         const { id, name, email, picture } = googleUser.data;

//         //Find or create user
//         let user = await User.findOne({ googleId:id });
//         if (!user) {
//             user = await User.create({
//                 googleId: id,
//                 name,
//                 email,
//                 profilePicture: picture,
//             });
//         };

//         //Generating JWT
//         const jwtToken = jwt.sign(
//             {
//                 _id: user._id,
//                 email: user.email,
//                 name: user.name,
//             },
//             process.env.JWT_SECRET,
//             {
//                 expiresIn: "7d"
//             }
//         );

//         //Return token
//         res.status(200).json({ token: jwtToken, user });

//     } catch (error) {
//         console.log("The error is --", error);
//         res.status(500).json({ message: "Failed to fetch account" });
//     }
// });

router.post("/google", async (req, res) => {
    try {
        const { id_token } = req.body;

        if (!id_token) {
            return res.status(400).json({
                message: "ID Token is required"
            });
        }

        const ticket = await client.verifyIdToken({
            idToken: id_token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();

        const {
            sub,
            email,
            name,
            picture
        } = payload;

        let user = await User.findOne({
            googleId: sub
        });

        if (!user) {
            user = await User.create({
                googleId: sub,
                email,
                name,
                profilePicture: picture
            });
        }

        const token = jwt.sign(
            {
                _id: user._id,
                email: user.email,
                name: user.name
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            token,
            user
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Google Authentication Failed"
        });
    };
});

router.get("/profile", authMiddleware, async (req, res) => {

    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        res.json(user);
    }

    catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

//fetch all users
router.get("/all-users", authMiddleware, async (req, res) => {
    try {
        const { users } = req.body;
        album.sharedUsers.push(...users);
        res.status(200).json(users);

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Failed to fetch users" });
    }
});

router.get("/myprofile", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const myAlbums = await Album.countDocuments({ownerId: req.user._id});
        const sharedAlbums = await Album.countDocuments({sharedUsers: req.user._id});
        const totalPhotos = await Image.countDocuments({uploadedBy: req.user._id});
        const favourites = await Image.countDocuments({
            uploadedBy: req.user._id,
            isFavourite: true
        });

        res.json({
            user,
            stats: {
                myAlbums,
                sharedAlbums,
                totalPhotos,
                favourites
            }
        });
    }
    catch (error) {
        res.status(500).json({message: error.message});
    }
});

module.exports = router;