require("dotenv").config();
const express = require("express");
const multer  = require("multer");
const cors    = require("cors");
const FormData = require("form-data");
const fetch   = require("node-fetch");

const app    = express();
const upload = multer();
app.use(cors());

const PIXELBIN_API_TOKEN  = process.env.PIXELBIN_API_TOKEN;
const PIXELBIN_UPLOAD_DIR = process.env.PIXELBIN_UPLOAD_DIR;
const PIXELBIN_PRESET     = process.env.PIXELBIN_PRESET;

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucune image envoyée." });
  }
  try {
    // Préparer le FormData pour l’upload
    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename:    req.file.originalname,
      contentType: req.file.mimetype
    });
    formData.append("path",   PIXELBIN_UPLOAD_DIR);
    formData.append("preset", PIXELBIN_PRESET);

    // Récupérer les headers multipart (inclut boundary)
    const formHeaders = formData.getHeaders();

    // Appel direct à l’API public de PixelBin
    const response = await fetch("https://api.pixelbin.io/v2/upload", {
      method:  "POST",
      headers: {
        Authorization: `Bearer ${PIXELBIN_API_TOKEN}`,
        ...formHeaders
      },
      body: formData
    });

    const result = await response.json();
    if (response.ok && result.url) {
      return res.json({ url: result.url });
    } else {
      console.error("❌ Erreur PixelBin:", result);
      return res.status(500).json({ error: "Erreur PixelBin", details: result });
    }
  } catch (err) {
    console.error("❌ Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Proxy PixelBin démarré sur le port ${PORT}`);
});
