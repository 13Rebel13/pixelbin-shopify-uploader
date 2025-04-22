require("dotenv").config();
const express = require("express");
const multer  = require("multer");
const cors    = require("cors");
const { PixelbinConfig, PixelbinClient } = require("@pixelbin/admin");

const app    = express();
const upload = multer();
app.use(cors());

const PIXELBIN_API_TOKEN  = process.env.PIXELBIN_API_TOKEN;
const PIXELBIN_UPLOAD_DIR = process.env.PIXELBIN_UPLOAD_DIR;
const PIXELBIN_DOMAIN     = process.env.PIXELBIN_DOMAIN || "https://api.pixelbin.io";

// Debug key
console.log("🔑 PIXELBIN_API_TOKEN starts with:", PIXELBIN_API_TOKEN?.slice(0, 8));

const config   = new PixelbinConfig({
  domain:    PIXELBIN_DOMAIN,
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
    const extMatch     = originalName.match(/\.(\w+)$/);
    const format       = extMatch ? extMatch[1] : undefined;

    // ← ICI on active overwrite pour écraser l'ancien fichier
    const result = await pixelbin.uploader.upload({
      file:      buffer,
      name:      originalName,
      path:      PIXELBIN_UPLOAD_DIR,
      format:    format,
      access:    "public-read",
      overwrite: true,            // ← flag overwrite activé
    });

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
