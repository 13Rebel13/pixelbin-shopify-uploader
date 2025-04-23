require("dotenv").config();
const express  = require("express");
const multer   = require("multer");
const cors     = require("cors");
const { PixelbinConfig, PixelbinClient } = require("@pixelbin/admin");

const app    = express();
const upload = multer();
app.use(cors());

// Variables d’environnement sur Render
const {
  PIXELBIN_API_TOKEN,   // ton token PixelBin
  PIXELBIN_CLOUD_NAME,  // ex. "black-dawn-dff45b"
  PIXELBIN_ZONE_SLUG,   // ex. "default"
  PIXELBIN_UPLOAD_DIR   // ex. "shopify-uploads"
} = process.env;

// Init du client PixelBin
const config = new PixelbinConfig({
  domain:    "https://api.pixelbin.io",
  cloudName: PIXELBIN_CLOUD_NAME,
  zoneSlug:  PIXELBIN_ZONE_SLUG,
  apiSecret: PIXELBIN_API_TOKEN,
});
const pixelbin = new PixelbinClient(config);

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucune image envoyée." });
  }
  try {
    // On ne touche qu’aux PNG que Photoroom te génère
    const buffer       = req.file.buffer;
    const originalName = req.file.originalname.replace(/\s+/g, "_"); // sans espaces
    const basename     = originalName.replace(/\.\w+$/, "");

    const result = await pixelbin.uploader.upload({
      file:      buffer,
      name:      basename,
      path:      PIXELBIN_UPLOAD_DIR,
      format:    "png",
      access:    "public-read",
      overwrite: true,
    });

    return res.json({ url: result.url });
  } catch (err) {
    console.error("❌ Erreur PixelBin :", err);
    return res.status(500).json({ error: "PixelBin", details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`🚀 Proxy PixelBin démarré sur le port ${PORT}`)
);
