const express = require("express");
const multer = require("multer");
const cors = require("cors");
const FormData = require("form-data");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
const upload = multer();
app.use(cors());

const PIXELBIN_API_TOKEN = process.env.PIXELBIN_API_TOKEN; // Doit être défini dans ton .env sur Render
const PIXELBIN_DATASET = "shopify-uploads"; // nom du dossier créé dans ton storage Pixelbin
const PIXELBIN_PRESET = "super_resolution"; // nom du preset utilisé (doit exister dans Pixelbin)

// Route POST pour l'upload d'image
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
    formData.append("path", PIXELBIN_DATASET);
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

    if (response.ok && result?.url) {
      return res.json({ url: result.url });
    } else {
      return res.status(500).json({ error: "Erreur Pixelbin", details: result });
    }

  } catch (err) {
    console.error("❌ Erreur serveur :", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur Pixelbin actif sur le port ${PORT}`);
});
