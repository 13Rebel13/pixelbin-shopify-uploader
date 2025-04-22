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
  PIXELBIN_PRESET    // ex. "sr" pour super-resolution plugin
} = process.env;

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucune image envoyée." });
  }

  try {
    // 1) Upload direct du binaire
    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename:    req.file.originalname,
      contentType: req.file.mimetype
    });
    form.append("path",   PIXELBIN_UPLOAD_DIR);

    const headers = form.getHeaders();
    headers.Authorization = `Bearer ${PIXELBIN_API_TOKEN}`;

    const upRes = await fetch(
      "https://api.pixelbin.io/service/platform/assets/v1.0/upload/direct",
      { method: "POST", headers, body: form }
    );
    const upJson = await upRes.json();
    if (!upRes.ok || !upJson.url) {
      console.error("❌ Erreur PixelBin upload direct:", upJson);
      return res.status(500).json({ error: "Erreur PixelBin", details: upJson });
    }
    const originalUrl = upJson.url;

    // 2) Construire l'URL ML upscale à la volée
    // on suppose un plugin ML sr.upscale()
    const filename = req.file.originalname.replace(/\.\w+$/, "");
    const extMatch = req.file.originalname.match(/\.(\w+)$/);
    const format   = extMatch ? extMatch[1] : undefined;
    const transformedUrl = PixelbinUrl.objToUrl({
      cloudName: PIXELBIN_CLOUD_NAME,
      version:   "v2",
      baseUrl:   "https://cdn.pixelbin.io",
      filePath:  `${PIXELBIN_UPLOAD_DIR}/${filename}.${format}`,
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
app.listen(PORT, () => console.log(`🚀 Proxy PixelBin démarré sur port ${PORT}`));
