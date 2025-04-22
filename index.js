require("dotenv").config();
const express  = require("express");
const multer   = require("multer");
const cors     = require("cors");
const { Readable } = require("stream");
const { PixelbinConfig, PixelbinClient } = require("@pixelbin/admin");

const app    = express();
const upload = multer();
app.use(cors());

// Variables d'env
const {
  PIXELBIN_API_TOKEN,
  PIXELBIN_CLOUD_NAME,
  PIXELBIN_UPLOAD_DIR,
  PIXELBIN_DOMAIN = "https://api.pixelbin.io"
} = process.env;

// Debug
console.log("🔑 TOKEN:", PIXELBIN_API_TOKEN?.slice(0,8));
console.log("☁️ CLOUD:", PIXELBIN_CLOUD_NAME);

const config = new PixelbinConfig({
  domain:    PIXELBIN_DOMAIN,
  cloudName: PIXELBIN_CLOUD_NAME,
  apiSecret: PIXELBIN_API_TOKEN,
});
const pixelbin = new PixelbinClient(config);

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucune image envoyée." });
  }

  try {
    const buffer       = req.file.buffer;
    const originalName = req.file.originalname;
    const basename     = originalName.replace(/\.\w+$/, "");

    // 🚀 Upload fiable via le SDK (Buffer -> Readable stream) :contentReference[oaicite:0]{index=0}
    const result = await pixelbin.assets.fileUpload({
      file: Readable.from(buffer),
      name: basename,
      options: { originalFilename: originalName },
      overwrite: true,
      path: PIXELBIN_UPLOAD_DIR
    });

    return res.json({ url: result.url });
  } catch (err) {
    console.error("❌ Erreur PixelBin :", err.message || err);
    return res
      .status(500)
      .json({ error: "Erreur PixelBin", details: err.message || err });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`🚀 Proxy PixelBin démarré sur le port ${PORT}`)
);
