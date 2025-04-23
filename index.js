require("dotenv").config();
const express  = require("express");
const multer   = require("multer");
const cors     = require("cors");
const { PixelbinConfig, PixelbinClient, url: PixelbinUrl } = require("@pixelbin/admin");

const app    = express();
const upload = multer();
app.use(cors());

// Variables d’environnement
const {
PIXELBIN_API_TOKEN,    // ta Server-Side API Key
PIXELBIN_CLOUD_NAME,   // ex. "black-dawn-dff45b"
PIXELBIN_ZONE_SLUG,    // ex. "default"
PIXELBIN_UPLOAD_DIR    // ex. "shopify-uploads"
} = process.env;

// Debug au démarrage
console.log("🔑 Token starts with:", PIXELBIN_API_TOKEN?.slice(0,8));
console.log("☁️ CloudName:", PIXELBIN_CLOUD_NAME);
console.log("🏷 ZoneSlug:", PIXELBIN_ZONE_SLUG);
console.log("📁 Upload Dir:", PIXELBIN_UPLOAD_DIR);

const config = new PixelbinConfig({
domain:    "[https://api.pixelbin.io](https://api.pixelbin.io/)",
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
const { buffer, originalname } = req.file;
const basename = originalname.replace(/\.\w+$/, "");
const extMatch = originalname.match(/\.(\w+)$/);
const format   = extMatch ? extMatch[1] : "png";
  
