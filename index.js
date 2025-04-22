require("dotenv").config();
const express  = require("express");
const multer   = require("multer");
const cors     = require("cors");
const { PixelbinConfig, PixelbinClient } = require("@pixelbin/admin");

// Charger et afficher les vars d'env pour debug
console.log("🔑 PIXELBIN_API_TOKEN starts with:", process.env.PIXELBIN_API_TOKEN?.slice(0,8));
console.log("☁️ PIXELBIN_CLOUD_NAME:", process.env.PIXELBIN_CLOUD_NAME);
console.log("🏷 PIXELBIN_ZONE_SLUG:", process.env.PIXELBIN_ZONE_SLUG);

const app    = express();
const upload = multer();
app.use(cors());

const PIXELBIN_API_TOKEN   = process.env.PIXELBIN_API_TOKEN;
const PIXELBIN_CLOUD_NAME  = process.env.PIXELBIN_CLOUD_NAME;
const PIXELBIN_ZONE_SLUG   = process.env.PIXELBIN_ZONE_SLUG;
const PIXELBIN_UPLOAD_DIR  = process.env.PIXELBIN_UPLOAD_DIR;
const PIXELBIN_DOMAIN      = process.env.PIXELBIN_DOMAIN || "https://api.pixelbin.io";

const config = new PixelbinConfig({
  domain:    PIXELBIN_DOMAIN,
  cloudName: PIXELBIN_CLOUD_NAME,
  zoneSlug:  PIXELBIN_ZONE_SLUG,
  apiSecret: PIXELBIN_API_TOKEN,
});
const pixelbin = new PixelbinClient(config);

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucune image envoyée." });
  try {
    const buffer       = req.file.buffer;
    const basename     = req.file.originalname.replace(/\.\w+$/, "");
    const extMatch     = req.file.originalname.match(/\.(\w+)$/);
    const format       = extMatch ? extMatch[1] : undefined;

    const result = await pixelbin.uploader.upload({
      file:      buffer,
      name:      basename,
      path:      PIXELBIN_UPLOAD_DIR,
      format:    format,
      access:    "public-read",
      overwrite: true,
    });
    return res.json({ url: result.url });
  } catch (err) {
    console.error("❌ Erreur PixelBin :", err.message || err);
    return res.status(500).json({ error: "Erreur PixelBin", details: err.message || err });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Proxy PixelBin sur port ${PORT}`));
