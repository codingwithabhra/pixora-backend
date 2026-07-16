const multer = require('multer');
const path = require('path');

//Multer is a middleware that helps in uploading files in NODE.js applications
//for multer ===> 
//   1. we define a config,
const storage = multer.diskStorage({});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

    const extension = path.extname(file.originalname).toLowerCase();

    if (!allowedTypes.includes(extension)) {
        return cb(new Error("Only image files are accepted."));
    };

    cb(null, true);
};

const upload = multer({
    storage,
    // limits: {
    //     fileSize: 5 * 1024 * 1024
    // },
    fileFilter
});

module.exports = upload;