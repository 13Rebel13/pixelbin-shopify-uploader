require("dotenv").config();
const express      = require("express");
const bodyParser   = require("body-parser");
const multer       = require("multer");
const cors         = require("cors");
const { Shopify }  = require("@shopify/shopify-api");
const {
  PixelbinConfig,
  PixelbinClient
} = require("@pixelbin/admin");

const app    = express();
const upload = multer();

// Middlewares
app.use(cors());
app.use(bodyParser.json()); // pour parser les webhooks Shopify

// Variables d’environnement attendues
const {
  PIXELBIN_API_TOKEN,
  PIXELBIN_CLOUD_NAME,
  PIXELBIN_ZONE_SLUG,
  PIXELBIN_UPLOAD_DIR,
  SHOPIFY_STORE,          // ex. "maboutique.myshopify.com"
  SHOPIFY_ACCESS_TOKEN    // token Admin REST API
} = process.env;

// Debug au démarrage
console.log("🔑 PixelBin Token…", PIXELBIN_API_TOKEN?.slice(0,8));
console.log("☁️ CloudName:", PIXELBIN_CLOUD_NAME);
console.log("🏷 ZoneSlug:", PIXELBIN_ZONE_SLUG);
console.log("📁 UploadDir:", PIXELBIN_UPLOAD_DIR);
console.log("🛒 Shopify Store:", SHOPIFY_STORE);

// Init PixelBin
const pbConfig = new PixelbinConfig({
  domain:    "https://api.pixelbin.io",
  cloudName: PIXELBIN_CLOUD_NAME,
  zoneSlug:  PIXELBIN_ZONE_SLUG,
  apiSecret: PIXELBIN_API_TOKEN,
});
const pixelbin = new PixelbinClient(pbConfig);

// === Webhook orders/create ===
app.post("/webhooks/orders/create", async (req, res) => {
  // 1) Acknowledge
  res.status(200).send("OK");

  const order      = req.body;
  const customerId = order.customer?.id;
  if (!customerId) return;

  // 2) Calcul des crédits achetés
  let totalCredits = 0;
  for (const line of order.line_items) {
    const m = line.variant_title.match(/(\d+)\s*crédits/i);
    if (m) totalCredits += parseInt(m[1], 10) * line.quantity;
  }
  if (totalCredits === 0) return;

  try {
    // 3) Init client Shopify REST
    const client = new Shopify.Clients.Rest(
      SHOPIFY_STORE,
      SHOPIFY_ACCESS_TOKEN
    );

    // 4) Lecture du métachamp existant
    const mfRes = await client.get({
      path: `customers/${customerId}/metafields`,
      query: { namespace: "tools", key: "credits" }
    });
    const existing = mfRes.body.metafields[0];
    const oldValue = existing ? parseInt(existing.value, 10) : 0;
    const newValue = oldValue + totalCredits;

    // 5) Création ou mise à jour du métachamp
    let path, data;
    if (existing) {
      path = `metafields/${existing.id}`;
      data = { metafield: { id: existing.id, value: newValue.toString() } };
    } else {
      path = "metafields";
      data = {
        metafield: {
          namespace:      "tools",
          key:            "credits",
          type:           "number_integer",
          owner_id:       customerId,
          owner_resource: "customer",
          value:          newValue.toString()
        }
      };
    }
    await client.put({
      path,
      data,
      type: "application/json"
    });

    console.log(`+${totalCredits} crédits ajoutés au client ${customerId}`);
  } catch (e) {
    console.error("❌ Webhook processing error:", e);
  }
});

// === Endpoint d’upload PixelBin ===
app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucune image envoyée." });
  }

  try {
    const { buffer, originalname } = req.file;
    // 1) Crée un basename propre
    const basename = originalname
      .replace(/\s+/g, "_")
      .replace(/[\(\)]/g, "")
      .replace(/\.\w+$/, "");

    // 2) Ajoute un suffixe timestamp
    const uniqueName = `${basename}-${Date.now()}`;

    // 3) Upload via SDK PixelBin
    const upResult = await pixelbin.uploader.upload({
      file:      buffer,
      name:      uniqueName,
      path:      PIXELBIN_UPLOAD_DIR,
      format:    (originalname.match(/\.(\w+)$/) || [])[1] || "png",
      access:    "public-read",
      overwrite: true,
    });

    const originalUrl   = upResult.url;
    const transformSeg  = `/sr.upscale(t:4x)/`;
    const transformedUrl = originalUrl.replace("/original/", transformSeg);

    return res.json({ originalUrl, transformedUrl });
  } catch (err) {
    console.error("❌ Erreur PixelBin :", err);
    return res.status(500).json({ error: "PixelBin", details: err.message });
  }
});

// Démarrage du serveur
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Proxy & Webhook server démarré sur le port ${PORT}`);
});
