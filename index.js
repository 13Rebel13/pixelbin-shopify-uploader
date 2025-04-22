const express = require("express");
const multer = require("multer");
const fetch = require("node-fetch");
const FormData = require("form-data");
const cors = require("cors");
require("dotenv").config(); // 🔄 Charge les variables d’environnement depuis .env

const app = express();
const upload = multer();
app.use(cors());

// 🔐 Clé API Pixelbin
const PIXELBIN_API_KEY = process.env.PIXELBIN_API_KEY;

// 📁 Chemin dans Pixelbin Storage (ex: "shopify-uploads")
const PIXELBIN_DATASET_PATH = process.env.PIXELBIN_DATASET_PATH;

// ⚙️ (Optionnel) preset d'amélioration d'image
const PIXELBIN_PRESET = process.env.PIXELBIN_PRESET || ""; // Si vide, on ne l’ajoute pas

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucune image reçue." });
  }

  try {
    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    formData.append("path", PIXELBIN_DATASET_PATH);

    if (PIXELBIN_PRESET) {
      formData.append("preset", PIXELBIN_PRESET);
    }

    const response = await fetch("https://api.pixelbin.io/v2/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PIXELBIN_API_KEY}`,
      },
      body: formData,
    });

    const result = await response.json();
    console.log("📦 Réponse Pixelbin :", result);

    if (response.ok && result?.url) {
      return res.json({ url: result.url });
    } else {
      return res.status(500).json({
        error: "Erreur lors de l'envoi à Pixelbin",
        details: result,
      });
    }
  } catch (err) {
    console.error("❌ Erreur serveur :", err);
    return res.status(500).json({
      error: "Erreur interne",
      details: err.message,
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur Pixelbin actif sur le port ${PORT}`);
});
