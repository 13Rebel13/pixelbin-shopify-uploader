require("dotenv").config();
const express      = require("express");
const multer       = require("multer");
const cors         = require("cors");
const { PixelbinConfig, PixelbinClient } = require("@pixelbin/admin");

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
console.log("☁️ Cloud:", PIXELBIN_CLOUD_NAME);
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
    const { buffer, originalname, mimetype } = req.file;
    // 1) Construire un basename nettoyé
    let base = originalname
      .replace(/\s+/g, "_")           // espaces → underscores
      .replace(/[^\w\-\.]/g, "")      // virer tout sauf alphanum, _, - et .
      .replace(/\.\w+$/, "");         // ôter l’extension

    // 2) Détecter l’extension
    const ext = (originalname.match(/\.(\w+)$/) || [])[1] || mimetype.split("/")[1] || "png";

    // 3) Ajouter un suffixe timestamp pour l’unicité
    const uniqueName = `${base}-${Date.now()}`;

    // 4) Upload via SDK
    const upResult = await pixelbin.uploader.upload({
      file:      buffer,
      name:      uniqueName,
      path:      PIXELBIN_UPLOAD_DIR,
      format:    ext,
      access:    "public-read",
      overwrite: true,
    });

    // 5) On renvoie l’URL finale
    return res.json({ url: upResult.url });
  } catch (err) {
    console.error("❌ Erreur PixelBin :", err);
    return res.status(500).json({ error: "PixelBin", details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`🚀 Proxy PixelBin démarré sur le port ${PORT}`)
);
