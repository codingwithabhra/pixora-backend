const express = require('express');
const router = express.Router();

const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

const authMiddleware = require('../middleware/authMiddleware');

router.get("/google", (req, res) => {
    const googleURL =
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${process.env.GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}` +
        `&response_type=code` +
        `&scope=profile email`;

    res.redirect(googleURL);
});

router.get("/google/callback", async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) {
            return res.status(404).json({
                message: "Authorization code missing"
            })
        };

        //Exchanging code for Google access token
        const tokenResponse = await axios.post("https://oauth2.googleapis.com/token",
            {
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                grant_type: "authorization_code"
            }
        );

        const accessToken = tokenResponse.data.access_token;

        //Fetching Google user profile
        const googleUser = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        const { id, name, email, picture } = googleUser.data;

        //Find or create user
        let user = await User.findOne({ googleId:id });
        if (!user) {
            user = await User.create({
                googleId: id,
                name,
                email,
                profilePicture: picture,
            });
        };

        //Generating JWT
        const jwtToken = jwt.sign(
            {
                _id: user._id,
                email: user.email,
                name: user.name,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        //Return token
        res.status(200).json({ token: jwtToken, user });

    } catch (error) {
        console.log("The error is --", error);
        res.status(500).json({ message: "Failed to fetch account" });
    }
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

module.exports = router;