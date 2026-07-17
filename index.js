const express = require("express");
const app = express();
require("dotenv").config();

app.use(express.json());

const cors = require("cors");

const corsOption = {
    origin: ["http://localhost:5173", "https://pixora-3u5f.vercel.app" ],
    credentials: true,
    optionSuccessStatus: 200,
};

app.use(cors(corsOption));

// ---------------------------------------- DATABASE CONNECTION ----------------------------------------

const { initialisedatabase } = require("./db/db.connect");
initialisedatabase();

// ---------------------------------------- AUTH ROUTES ----------------------------------------

const authRoutes = require("./routes/User.routes");
app.use("/auth", authRoutes);

// ---------------------------------------- ALBUM ROUTES ----------------------------------------

const albumRoutes = require("./routes/Album.routes");
app.use("/albums", albumRoutes);

// ---------------------------------------- IMAGE ROUTES ----------------------------------------

const imageRoutes = require("./routes/Image.routes");
app.use("/", imageRoutes);

// ---------------------------------------- TEST ROUTE ----------------------------------------

app.get("/", (req, res) => {
    res.send("Pixora Backend Running 🚀");
});

// ---------------------------------------- SERVER ----------------------------------------

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});