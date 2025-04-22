require("dotenv").config();
const express  = require("express");
const multer   = require("multer");
const cors     = require("cors");
const { Readable } = require("stream");
const { PixelbinConfig, PixelbinClient, url: PixelbinUrl } = require("@pixelbin/admin");

const app    = express();
const upload = multer();
app.use(cors());

// Tes variables d'env
const {
  PIXELBIN_API_TOKEN,    // Server-side API Key
  PIXELBIN_CLOUD_NAME,   // e.g. "black-dawn-dff45b"
  PIXELBIN_UPLOAD_DIR,   // e.g. "shopify-uploads"
  PIXELBIN_PRESET        // e.g. "sr" pour super-resolution
} = process.env;

// Init du client PixelBin
const config   = new PixelbinConfig({
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
    // 1) Upload du fichier brut
    const buffer       = req.file.buffer;
    const originalName = req.file.originalname;
    const basename     = originalName.replace(/\.\w+$/, "");
    const extMatch     = originalName.match(/\.(\w+)$/);
    const format       = extMatch ? extMatch[1] : undefined;

    const upResult = await pixelbin.assets.fileUpload({
      file:      Readable.from(buffer),
      name:      basename,
      path:      PIXELBIN_UPLOAD_DIR,
      overwrite: true
    });
    const originalUrl = upResult.url;

    // 2) Génération de l'URL upscalée
    const transformedUrl = PixelbinUrl.objToUrl({
      cloudName:      PIXELBIN_CLOUD_NAME,
      version:        "v2",
      baseUrl:        "https://cdn.pixelbin.io",
      filePath:       `${PIXELBIN_UPLOAD_DIR}/${basename}.${format}`,
      transformations: [
        { plugin: PIXELBIN_PRESET, name: "upscale" }
      ]
    });

    return res.json({ originalUrl, transformedUrl });
  } catch (err) {
    console.error("❌ Erreur PixelBin :", err);
    return res.status(500).json({ error: "Erreur PixelBin", details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Proxy PixelBin démarré sur le port ${PORT}`));
