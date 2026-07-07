const mongoose = require('mongoose');
require("dotenv").config();

const initialisedatabase = async() => {
    try {
        const connection = await mongoose.connect(process.env.MONGODB);
        if(connection){
            console.log("MongoDB connected successfully");
        }
    } catch (error) {
        console.log("MongoDB connection failed", error);
    };
};

module.exports = { initialisedatabase };