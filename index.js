require("dotenv").config();
const express = require("express");
const multer  = require("multer");
const cors    = require("cors");

// SDK officiel PixelBin (gère l’upload, la signature, etc.) :contentReference[oaicite:0]{index=0}
const { PixelbinConfig, PixelbinClient } = require("@pixelbin/admin");

const app    = express();
const upload = multer();
app.use(cors());

const PIXELBIN_TOKEN      = process.env.PIXELBIN_API_KEY;
const PIXELBIN_UPLOAD_DIR = process.env.PIXELBIN_UPLOAD_DIR;
const PIXELBIN_DOMAIN     = process.env.PIXELBIN_DOMAIN || "https://api.pixelbin.io";

// Configuration du client PixelBin
const config   = new PixelbinConfig({
  domain:    PIXELBIN_DOMAIN,
  apiSecret: PIXELBIN_TOKEN,
});
const pixelbin = new PixelbinClient(config);

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucune image envoyée." });
  }

  try {
    const buffer       = req.file.buffer;
    const originalName = req.file.originalname;
    // On extrait l'extension pour le format (png, jpg…)
    const extMatch = originalName.match(/\.(\w+)$/);
    const format   = extMatch ? extMatch[1] : undefined;

    // 🚀 Upload via le SDK, qui gère la signature et la fragmentation
    const result = await pixelbin.uploader.upload({
      file:             buffer,
      name:             originalName,
      path:             PIXELBIN_UPLOAD_DIR,
      format:           format,
      access:           "public-read",
      overwrite:        false,
      filenameOverride: false,
    });

    // On renvoie simplement l'URL générée
    return res.json({ url: result.url });
  } catch (err) {
    console.error("❌ Erreur PixelBin :", err);
    return res
      .status(500)
      .json({ error: "Erreur PixelBin", details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Proxy PixelBin démarré sur le port ${PORT}`);
});
