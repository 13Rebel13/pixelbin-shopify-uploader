require("dotenv").config();
const express  = require("express");
const multer   = require("multer");
const cors     = require("cors");
const FormData = require("form-data");
const fetch    = require("node-fetch");

const app    = express();
const upload = multer();
app.use(cors());

const PIXELBIN_API_TOKEN  = process.env.PIXELBIN_API_TOKEN;
const PIXELBIN_UPLOAD_DIR = process.env.PIXELBIN_UPLOAD_DIR;
const PIXELBIN_PRESET     = process.env.PIXELBIN_PRESET; // ex. "super_resolution"

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucune image envoyée." });

  try {
    const originalName = req.file.originalname;
    const basename     = originalName.replace(/\.\w+$/, "");

    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename: originalName,
      contentType: req.file.mimetype
    });
    form.append("path",   PIXELBIN_UPLOAD_DIR);
    form.append("name",   basename);
    form.append("preset", PIXELBIN_PRESET);

    const headers  = form.getHeaders();
    const response = await fetch("https://api.pixelbin.io/v2/upload", {
      method:  "POST",
      headers: { Authorization: `Bearer ${PIXELBIN_API_TOKEN}`, ...headers },
      body:    form
    });
    const json = await response.json();
    if (!response.ok || !json.url) {
      console.error("❌ Erreur PixelBin:", json);
      return res.status(500).json({ error: "Erreur PixelBin", details: json });
    }

    const originalUrl    = json.url;
    const transformedUrl = originalUrl.replace("/original/", `/${PIXELBIN_PRESET}/`);
    return res.json({ originalUrl, transformedUrl });

  } catch (err) {
    console.error("❌ Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Proxy PixelBin démarré sur le port ${PORT}`));
