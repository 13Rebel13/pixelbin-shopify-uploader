require("dotenv").config();
const express      = require("express");
const multer       = require("multer");
const cors         = require("cors");
const { PixelbinConfig, PixelbinClient, url: PixelbinUrl } = require("@pixelbin/admin");

const app    = express();
const upload = multer();
app.use(cors());

// 🚩 Tes variables d'env
const {
  PIXELBIN_API_TOKEN,     // Server-Side API Key
  PIXELBIN_CLOUD_NAME,    // ex. "black-dawn-dff45b"
  PIXELBIN_ZONE_SLUG,     // ta zone, ou vide pour default
  PIXELBIN_UPLOAD_DIR,    // ex. "shopify-uploads"
  PIXELBIN_PRESET         // ex. "super_resolution"
} = process.env;

// Config du client (on n'a plus besoin de zoneSlug pour l'upload)
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
    // 1) Upload l'image brute
    const buffer       = req.file.buffer;
    const originalName = req.file.originalname;
    const basename     = originalName.replace(/\.\w+$/, "");
    const extMatch     = originalName.match(/\.(\w+)$/);
    const format       = extMatch ? extMatch[1] : undefined;

    const result = await pixelbin.assets.fileUpload({
      file:       Buffer.from(buffer),
      name:       basename,
      path:       PIXELBIN_UPLOAD_DIR,
      overwrite:  true
    });

    const originalUrl = result.url; // ex. ".../original/basename.png"

    // 2) Construis l'URL upscalée avec le preset ML (plugin "sr", transformation "upscale") :contentReference[oaicite:0]{index=0}
    const transformedUrl = PixelbinUrl.objToUrl({
      cloudName:      PIXELBIN_CLOUD_NAME,
      zone:           PIXELBIN_ZONE_SLUG || PIXELBIN_CLOUD_NAME,
      version:        "v2",
      baseUrl:        "https://cdn.pixelbin.io",
      filePath:       `${PIXELBIN_UPLOAD_DIR}/${basename}.${format}`,
      transformations: [
        { plugin: "sr", name: "upscale" }
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
