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
  PIXELBIN_API_TOKEN,    // Bearer token
  PIXELBIN_CLOUD_NAME,   // ex. "black-dawn-dff45b"
  PIXELBIN_UPLOAD_DIR,   // ex. "shopify-uploads"
  PIXELBIN_PRESET        // ex. "sr.upscale(t:4x)" ou nom de ton preset ML
} = process.env;

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucune image envoyée." });

  try {
    const { buffer, originalname, mimetype } = req.file;
    const basename = originalname.replace(/\.\w+$/, "");

    // Prépare le form-data
    const form = new FormData();
    form.append("file", buffer, { filename: originalname, contentType: mimetype });
    form.append("name", basename);
    form.append("path", PIXELBIN_UPLOAD_DIR);
    form.append("preset", PIXELBIN_PRESET);

    // Appel à l’API publique v2/upload
    const headers = form.getHeaders();
    headers.Authorization = `Bearer ${PIXELBIN_API_TOKEN}`;

    const apiRes = await fetch("https://api.pixelbin.io/v2/upload", {
      method:  "POST",
      headers,
      body:    form
    });
    const json = await apiRes.json();
    if (!apiRes.ok || !json.url) {
      console.error("❌ PixelBin error:", json);
      return res.status(500).json({ error: "Erreur PixelBin", details: json });
    }

    // JSON.url renvoie toujours /original/
    const originalUrl    = json.url;
    // On insère le preset dans le chemin pour l’upscale
    const segment        = `/${PIXELBIN_PRESET}/`;
    const transformedUrl = originalUrl.replace("/original/", segment);

    return res.json({ originalUrl, transformedUrl });
  } catch (e) {
    console.error("❌ Serveur error:", e);
    return res.status(500).json({ error: "Erreur serveur", details: e.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Proxy PixelBin démarré sur le port ${PORT}`));
