require("dotenv").config();
const express  = require("express");
const multer   = require("multer");
const cors     = require("cors");
const { PixelbinConfig, PixelbinClient, url: PixelbinUrl } = require("@pixelbin/admin");

const app    = express();
const upload = multer();
app.use(cors());

// Tes vars d’environnement
const {
  PIXELBIN_API_TOKEN,
  PIXELBIN_CLOUD_NAME,
  PIXELBIN_UPLOAD_DIR
} = process.env;

// Init PixelBin
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
    // 1) upload de l'image brute
    const { buffer, originalname } = req.file;
    const basename = originalname.replace(/\.\w+$/, "");
    const extMatch = originalname.match(/\.(\w+)$/);
    const format   = extMatch ? extMatch[1] : undefined;

    const upResult = await pixelbin.uploader.upload({
      file:      buffer,
      name:      basename,
      path:      PIXELBIN_UPLOAD_DIR,
      format:    format,
      access:    "public-read",
      overwrite: true,
    });
    const originalUrl = upResult.url;

    // 2) génération de l'URL upscalée ×4
    const transformedUrl = PixelbinUrl.objToUrl({
      cloudName: PIXELBIN_CLOUD_NAME,
      zone:      PIXELBIN_CLOUD_NAME,         // ← on passe bien la zone
      version:   "v2",
      baseUrl:   "https://cdn.pixelbin.io",
      filePath:  `${PIXELBIN_UPLOAD_DIR}/${basename}.${format}`,
      transformations: [
        {
          plugin: "sr",
          name:   "upscale",
          values: [{ key: "t", value: "4x" }]
        }
      ]
    });

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
