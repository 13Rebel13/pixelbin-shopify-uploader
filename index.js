// index.js

require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors()); // Autorise toutes les origines — tu peux restreindre à Shopify si besoin
app.use(express.json());

// Pixelbin settings depuis .env
const PIXELBIN_API_KEY = process.env.PIXELBIN_API_KEY;
const PIXELBIN_CLOUDNAME = process.env.PIXELBIN_CLOUDNAME;
const PIXELBIN_ZONE = process.env.PIXELBIN_ZONE || "default";
const PIXELBIN_UPLOAD_DIR = process.env.PIXELBIN_UPLOAD_DIR || "shopify-uploads";

// 📤 Upload endpoint
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const fileName = req.file.originalname;

    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));
    formData.append("path", `${PIXELBIN_UPLOAD_DIR}/${fileName}`);

    const response = await axios.post(
      `https://api.pixelbin.io/v2/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "Authorization": `APIKEY ${PIXELBIN_API_KEY}`,
        },
        params: {
          cloudName: PIXELBIN_CLOUDNAME,
          zone: PIXELBIN_ZONE,
        },
      }
    );

    // Supprimer le fichier temporaire local
    fs.unlinkSync(filePath);

    return res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error("❌ Erreur upload :", error?.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Erreur lors du téléversement",
      details: error?.response?.data || error.message,
    });
  }
});

// 🎉 Lancement du serveur
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur Pixelbin actif sur http://localhost:${PORT}`);
});
