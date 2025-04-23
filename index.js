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
  PIXELBIN_API_TOKEN,    // ta clé server-side
  PIXELBIN_CLOUD_NAME,   // ex. "black-dawn-dff45b"
  PIXELBIN_UPLOAD_DIR    // ex. "shopify-uploads"
} = process.env;

// Init du client PixelBin
const config   = new PixelbinConfig({
  domain:    "https://api.pixelbin.io",
  cloudName: PIXELBIN_CLOUD_NAME,
  apiSecret: PIXELBIN_API_TOKEN,
});
const pixelbin = new PixelbinClient(config);

// Ton preset et le facteur
const PRESET = "sr";
const UPSCALE_FACTOR = "4x";  // x4

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucune image envoyée." });
  }
  try {
    const buffer       = req.file.buffer;
    const originalName = req.file.originalname;
    const basename     = originalName.replace(/\.\w+$/, "");
    const ext          = (originalName.match(/\.(\w+)$/) || [])[1] || "png";

    // 1) Upload
    const up = await pixelbin.uploader.upload({
      file:      buffer,
      name:      basename,
      path:      PIXELBIN_UPLOAD_DIR,
      format:    ext,
      access:    "public-read",
      overwrite: true,
    });
    const originalUrl = up.url;

    // 2) Construction simple de l'URL upscalée
    // On remplace '/original/' par '/sr.upscale(t:4x)/'
    const transformSegment = `/${PRESET}.upscale(t:${UPSCALE_FACTOR})/`;
    const transformedUrl   = originalUrl.replace("/original/", transformSegment);

    return res.json({ originalUrl, transformedUrl });
  } catch (err) {
    console.error("❌ Erreur PixelBin :", err);
    return res
      .status(500)
      .json({ error: "Erreur PixelBin", details: err.message || err });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`🚀 Proxy PixelBin démarré sur le port ${PORT}`)
);
