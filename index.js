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
  PIXELBIN_API_TOKEN,   // ton Bearer Token PixelBin
  PIXELBIN_CLOUD_NAME,  // ex. "black-dawn-dff45b"
  PIXELBIN_UPLOAD_DIR,  // ex. "shopify-uploads"
  PIXELBIN_PRESET       // ex. "sr.upscale(t:4x)"
} = process.env;

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucune image envoyée." });
  }

  try {
    // Prépare le form-data
    const { buffer, originalname, mimetype } = req.file;
    const basename = originalname.replace(/\.\w+$/, "");
    const form = new FormData();
    form.append("file", buffer, {
      filename:    originalname,
      contentType: mimetype
    });
    form.append("name",   basename);
    form.append("path",   PIXELBIN_UPLOAD_DIR);
    form.append("preset", PIXELBIN_PRESET);

    // Envoi direct à l’API publique (pas de signature nécessaire)
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

    // Construis l’URL finale directement avec le preset dans le chemin
    // (l’API publique renvoie toujours /original/, on remplace)
    const originalUrl    = json.url;
    const transformSeg   = `/${PIXELBIN_PRESET}/`;
    const transformedUrl = originalUrl.replace("/original/", transformSeg);

    return res.json({ originalUrl, transformedUrl });
  } catch (e) {
    console.error("❌ Serveur error:", e);
    return res.status(500).json({ error: "Erreur serveur", details: e.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Proxy PixelBin démarré sur le port ${PORT}`));
