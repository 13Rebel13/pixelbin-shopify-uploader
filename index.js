require("dotenv").config();
const express  = require("express");
const multer   = require("multer");
const cors     = require("cors");
const FormData = require("form-data");
const fetch    = require("node-fetch");
const { url: PixelbinUrl } = require("@pixelbin/admin");

const app    = express();
const upload = multer();
app.use(cors());

const {
  PIXELBIN_API_TOKEN,
  PIXELBIN_CLOUD_NAME,
  PIXELBIN_UPLOAD_DIR,
  PIXELBIN_PRESET    // par exemple "sr" pour super‐resolution
} = process.env;

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucune image envoyée." });

  try {
    // 1) Upload direct : on passe asset, pas file
    const form = new FormData();
    form.append("asset", req.file.buffer, {
      filename:    req.file.originalname,
      contentType: req.file.mimetype
    });
    form.append("path", PIXELBIN_UPLOAD_DIR);

    const headers = form.getHeaders();
    headers.Authorization = `Bearer ${PIXELBIN_API_TOKEN}`;

    const upRes  = await fetch(
      "https://api.pixelbin.io/service/platform/assets/v1.0/upload/direct",
      { method: "POST", headers, body: form }
    );
    const upJson = await upRes.json();
    if (!upRes.ok || !upJson.url) {
      console.error("❌ Erreur PixelBin upload direct:", upJson);
      return res.status(500).json({ error: "Erreur PixelBin", details: upJson });
    }
    const originalUrl = upJson.url;

    // 2) Génération de l’URL upscalée
    const filename = req.file.originalname.replace(/\.\w+$/, "");
    const ext      = (req.file.originalname.match(/\.(\w+)$/) || [])[1];
    const transformedUrl = PixelbinUrl.objToUrl({
      cloudName: PIXELBIN_CLOUD_NAME,
      version:   "v2",
      baseUrl:   "https://cdn.pixelbin.io",
      filePath:  `${PIXELBIN_UPLOAD_DIR}/${filename}.${ext}`,
      transformations: [
        { plugin: PIXELBIN_PRESET, name: "upscale" }
      ]
    });

    return res.json({ originalUrl, transformedUrl });
  } catch (err) {
    console.error("❌ Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Proxy PixelBin démarré sur le port ${PORT}`));
