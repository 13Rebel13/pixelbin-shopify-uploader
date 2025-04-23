require("dotenv").config();
const express      = require("express");
const multer       = require("multer");
const cors         = require("cors");
const { PixelbinConfig, PixelbinClient } = require("@pixelbin/admin");

const app    = express();
const upload = multer();
app.use(cors());

// Variables d’environnement
const {
  PIXELBIN_API_TOKEN,
  PIXELBIN_CLOUD_NAME,
  PIXELBIN_ZONE_SLUG,
  PIXELBIN_UPLOAD_DIR
} = process.env;

// Init PixelBin
const config   = new PixelbinConfig({
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
    const { buffer, originalname } = req.file;
    // On remplace les espaces et parenthèses, et on retire l'extension
    const base = originalname
      .replace(/\s+/g, "_")
      .replace(/\([\d]+\)/g, "")
      .replace(/\.\w+$/, "");
    // Suffixe timestamp pour l’unicité
    const uniqueName = `${base}-${Date.now()}`;

    const upResult = await pixelbin.uploader.upload({
      file:      buffer,
      name:      uniqueName,
      path:      PIXELBIN_UPLOAD_DIR,
      format:    "png",
      access:    "public-read",
      overwrite: true,
    });

    return res.json({ url: upResult.url });
  } catch (err) {
    console.error("❌ Erreur PixelBin :", err);
    return res.status(500).json({ error: "PixelBin", details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`🚀 Proxy PixelBin démarré sur le port ${PORT}`)
);
