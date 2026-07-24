const cloudinary = require('cloudinary');
require('dotenv').config();

//for cloudinary config ===> requirements ---- API Key + API Secret + Cloud Name
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// (async () => {
//   try {
//     const result = await cloudinary.api.ping();
//     console.log(result);
//   } catch (error) {
//     console.log(error);
//   }
// })();

module.exports = cloudinary;