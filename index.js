require("dotenv").config();
const express  = require("express");
const multer   = require("multer");
const cors     = require("cors");
const { PixelbinConfig, PixelbinClient, url: PixelbinUrl } = require("@pixelbin/admin");

const app    = express();
const upload = multer();
app.use(cors());

const {
  PIXELBIN_API_TOKEN,
  PIXELBIN_CLOUD_NAME,
  PIXELBIN_ZONE_SLUG,    // ex. "default"
  PIXELBIN_UPLOAD_DIR
} = process.env;

// Debug au démarrage
console.log("🔑 Token starts with:", PIXELBIN_API_TOKEN?.slice(0,8));
console.log("☁️ CloudName:", PIXELBIN_CLOUD_NAME);
console.log("🏷 ZoneSlug:", PIXELBIN_ZONE_SLUG);

const config = new PixelbinConfig({
  domain:    "https://api.pixelbin.io",
  cloudName: PIXELBIN_CLOUD_NAME,
  zoneSlug:  PIXELBIN_ZONE_SLUG,    // ← indispensable pour signer
  apiSecret: PIXELBIN_API_TOKEN,
});
const pixelbin = new PixelbinClient(config);

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucune image envoyée." });

  try {
    const { buffer, originalname } = req.file;
    const basename = originalname.replace(/\.\w+$/, "");
    const ext      = (originalname.match(/\.(\w+)$/) || [])[1] || "png";

    // upload brut
    const upRes = await pixelbin.uploader.upload({
      file:      buffer,
      name:      basename,
      path:      PIXELBIN_UPLOAD_DIR,
      format:    ext,
      access:    "public-read",
      overwrite: true,
    });

    const originalUrl = upRes.url;
    // build ×4 URL via simple replace
    const transformSegment = `/sr.upscale(t:4x)/`;
    const transformedUrl   = originalUrl.replace("/original/", transformSegment);

    return res.json({ originalUrl, transformedUrl });
  } catch (err) {
    console.error("❌ Erreur PixelBin :", err);
    return res.status(500).json({ error: "Erreur PixelBin", details: err.message });
  }
});

const PORT = process.env.PORT||10000;
app.listen(PORT, () =>
  console.log(`🚀 Proxy PixelBin démarré sur le port ${PORT}`)
);
