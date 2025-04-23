require("dotenv").config();
const express  = require("express");
const multer   = require("multer");
const cors     = require("cors");
const { PixelbinConfig, PixelbinClient, url: PixelbinUrl } = require("@pixelbin/admin");

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

// Debug au démarrage
console.log("🔑 Token…", PIXELBIN_API_TOKEN?.slice(0,8));
console.log("☁️ CloudName:", PIXELBIN_CLOUD_NAME);
console.log("🏷 ZoneSlug:", PIXELBIN_ZONE_SLUG);
console.log("📁 UploadDir:", PIXELBIN_UPLOAD_DIR);

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
    // 1) Crée un basename simple
    const basename = originalname
      .replace(/\s+/g, "_")      // espaces → _
      .replace(/[\(\)]/g, "")    // supprime parenthèses
      .replace(/\.\w+$/, "");    // sans extension

    // 2) Génère un suffixe unique (timestamp)
    const uniqueName = `${basename}-${Date.now()}`;

    // 3) Upload via SDK, sans changer ton flow
    const upResult = await pixelbin.uploader.upload({
      file:      buffer,
      name:      uniqueName,
      path:      PIXELBIN_UPLOAD_DIR,
      format:    (originalname.match(/\.(\w+)$/) || [])[1] || "png",
      access:    "public-read",
      overwrite: true,
    });

    const originalUrl   = upResult.url;
    // Construction de l’URL upscalée ×4
    const transformSeg  = `/sr.upscale(t:4x)/`;
    const transformedUrl = originalUrl.replace("/original/", transformSeg);

    return res.json({ originalUrl, transformedUrl });
  } catch (err) {
    console.error("❌ Erreur PixelBin :", err);
    return res.status(500).json({ error: "PixelBin", details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Proxy PixelBin démarré sur le port ${PORT}`);
});
