require("dotenv").config();
const express      = require("express");
const multer       = require("multer");
const cors         = require("cors");
const { Readable } = require("stream");
const { PixelbinConfig, PixelbinClient, url: PixelbinUrl } = require("@pixelbin/admin");

const app    = express();
const upload = multer();
app.use(cors());

// Variables d'environnement
const {
  PIXELBIN_API_TOKEN,
  PIXELBIN_CLOUD_NAME,
  PIXELBIN_ZONE_SLUG,
  PIXELBIN_UPLOAD_DIR,
  PIXELBIN_PRESET      // ex. "super_resolution" ou le plugin sr
} = process.env;

// Debug
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
  if (!req.file) return res.status(400).json({ error: "Aucune image envoyée." });

  try {
    const buffer       = req.file.buffer;
    const originalName = req.file.originalname;
    const basename     = originalName.replace(/\.\w+$/, "");
    const extMatch     = originalName.match(/\.(\w+)$/);
    const format       = extMatch ? extMatch[1] : undefined;

    // 1) Upload du fichier brut
    const upResult = await pixelbin.assets.fileUpload({
      file:             Readable.from(buffer),
      name:             basename,
      options:          { originalFilename: originalName },
      path:             PIXELBIN_UPLOAD_DIR,
      overwrite:        true,
    });
    const originalUrl = upResult.url; // ex. ".../original/basename.png"

    // 2) Génération de l'URL transformée
    const transformedUrl = PixelbinUrl.objToUrl({
      cloudName:      PIXELBIN_CLOUD_NAME,
      zone:           PIXELBIN_ZONE_SLUG || PIXELBIN_CLOUD_NAME,
      version:        "v2",
      baseUrl:        "https://cdn.pixelbin.io",
      filePath:       `${PIXELBIN_UPLOAD_DIR}/${basename}.${format}`,
      transformations: [
        // si ton preset est ML, par exemple super_resolution
        { plugin: PIXELBIN_PRESET, name: "upscale" }
      ]
    });

    return res.json({ originalUrl, transformedUrl });
  } catch (err) {
    console.error("❌ Erreur PixelBin :", err);
    return res.status(500).json({ error: "Erreur PixelBin", details: err.message || err });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Proxy PixelBin démarré sur le port ${PORT}`));
