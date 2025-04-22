const express = require("express");
const multer = require("multer");
const fetch = require("node-fetch");
const cors = require("cors");
const FormData = require("form-data");
require("dotenv").config();

const app = express();
const upload = multer();
app.use(cors());

// Configuration depuis les variables d'environnement (.env)
const PIXELBIN_API_TOKEN = process.env.PIXELBIN_API_TOKEN;
const PIXELBIN_PATH = "shopify-uploads"; // Le nom de ton dossier sur Pixelbin
const PIXELBIN_PRESET = "super_resolution"; // Vérifie le nom exact du preset sur Pixelbin

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucune image envoyée." });
  }

  try {
    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    formData.append("path", PIXELBIN_PATH);
    formData.append("preset", PIXELBIN_PRESET);

    const response = await fetch("https://api.pixelbin.io/v2/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PIXELBIN_API_TOKEN}`,
      },
      body: formData,
    });

    const result = await response.json();

    console.log("📦 Réponse Pixelbin :", result);

    if (response.ok && result.url) {
      return res.json({ url: result.url });
    } else {
      return res.status(500).json({ error: "Erreur Pixelbin", details: result });
    }
  } catch (error) {
    console.error("❌ Erreur serveur :", error);
    return res.status(500).json({ error: "Erreur serveur", details: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur Pixelbin en ligne sur le port ${PORT}`);
});
