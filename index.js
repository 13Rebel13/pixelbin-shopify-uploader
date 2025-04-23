require("dotenv").config();
const express  = require("express");
const multer   = require("multer");
const cors     = require("cors");
const FormData = require("form-data");
const fetch    = require("node-fetch");

const app    = express();
const upload = multer();
app.use(cors());

const {
  PIXELBIN_API_TOKEN,
  PIXELBIN_CLOUD_NAME,
  PIXELBIN_UPLOAD_DIR,
  PIXELBIN_PRESET      // ← assure-toi que c’est bien défini
} = process.env;

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucune image envoyée." });

  try {
    const { buffer, originalname, mimetype } = req.file;
    const basename = originalname
      .replace(/\s+/g, "_")
      .replace(/\.\w+$/, "");

    const form = new FormData();
    form.append("file", buffer, {
      filename: basename,
      contentType: mimetype
    });
    form.append("path",   PIXELBIN_UPLOAD_DIR);
    form.append("name",   basename);
    form.append("preset", PIXELBIN_PRESET);

    const headers = form.getHeaders();
    headers.Authorization = `Bearer ${PIXELBIN_API_TOKEN}`;

    const apiRes = await fetch("https://api.pixelbin.io/v2/upload", {
      method: "POST",
      headers,
      body: form
    });
    const json = await apiRes.json();
    if (!apiRes.ok || !json.url) {
      console.error("❌ PixelBin error:", json);
      return res.status(500).json({ error: "Erreur PixelBin", details: json });
    }

    const originalUrl    = json.url;
    // remplace /original/ par /<preset>/ pour récupérer la version transformée
    const transformedUrl = originalUrl.replace("/original/", `/${PIXELBIN_PRESET}/`);

    return res.json({ originalUrl, transformedUrl });
  } catch (err) {
    console.error("❌ Serveur error:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Proxy PixelBin démarré sur le port ${PORT}`));
