require("dotenv").config();
const express      = require("express");
const multer       = require("multer");
const cors         = require("cors");
const { Readable } = require("stream");
const { PixelbinConfig, PixelbinClient } = require("@pixelbin/admin");

const app    = express();
const upload = multer();
app.use(cors());

// Charge tes vars d'env
const {
  PIXELBIN_API_TOKEN,
  PIXELBIN_CLOUD_NAME,
  PIXELBIN_UPLOAD_DIR,
  PIXELBIN_PRESET    // ex. "super_resolution"
} = process.env;

// Debug au démarrage
console.log("🔑 Token:", PIXELBIN_API_TOKEN?.slice(0,8));
console.log("☁️ Cloud:", PIXELBIN_CLOUD_NAME);
console.log("🏷 Preset:", PIXELBIN_PRESET);

const config = new PixelbinConfig({
  domain:    "https://api.pixelbin.io",
  cloudName: PIXELBIN_CLOUD_NAME,
  apiSecret: PIXELBIN_API_TOKEN,
});
const pixelbin = new PixelbinClient(config);

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucune image envoyée." });
  }
  try {
    // Prépare les variables
    const buffer       = req.file.buffer;
    const originalName = req.file.originalname;
    const basename     = originalName.replace(/\.\w+$/, "");

    // Upload via le SDK (flux + nom + preset)
    const result = await pixelbin.assets.fileUpload({
      file:             Readable.from(buffer),
      name:             basename,
      options: { originalFilename: originalName, preset: PIXELBIN_PRESET },
      path:             PIXELBIN_UPLOAD_DIR,
      overwrite:        true,
    });

    // Le SDK te renvoie directement 'url' avec le preset appliqué
    return res.json({ url: result.url });
  } catch (err) {
    console.error("❌ Erreur PixelBin :", err.message || err);
    return res
      .status(500)
      .json({ error: "Erreur PixelBin", details: err.message || err });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Proxy PixelBin démarré sur le port ${PORT}`);
});
