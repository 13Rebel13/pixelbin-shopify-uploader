<style>
  #pixelbin-container { max-width:600px; margin:40px auto; text-align:center; }
  #pixelbin-actions { margin-bottom:24px; }
  #uploadBtn {
    background:#007bff;color:#fff;border:none;padding:8px 16px;
    border-radius:4px;cursor:pointer;margin-left:8px;
  }
  #uploadBtn:disabled { opacity:0.6; cursor:not-allowed; }
  #pixelbin-result {
    display:flex;justify-content:space-around;flex-wrap:wrap;gap:20px;
    margin-top:20px;
  }
  #pixelbin-result div { width:45%; }
  #pixelbin-result img {
    max-width:100%;border:1px solid #ddd;border-radius:4px;
  }
  #downloadBtn {
    display:inline-block;margin-top:8px;
    background:#28a745;color:#fff;padding:6px 12px;
    border-radius:4px;text-decoration:none;cursor:pointer;
  }
  .spinner {
    border:4px solid rgba(0,0,0,0.1);width:24px;height:24px;
    border-radius:50%;border-left-color:#000;
    animation:spin 1s linear infinite;display:inline-block;
    vertical-align:middle;margin-right:8px;
  }
  @keyframes spin { to { transform:rotate(360deg) } }
</style>

<div id="pixelbin-container">
  <div id="pixelbin-actions">
    <input type="file" id="pixelbin-upload" accept="image/*">
    <button id="uploadBtn">Améliorer l’image ×4</button>
  </div>
  <div id="pixelbin-result"></div>
</div>

<script>
(function() {
  const UPLOAD_URL = "https://pixelbin-shopify-uploader.onrender.com/upload";
  const input      = document.getElementById("pixelbin-upload");
  const btn        = document.getElementById("uploadBtn");
  const result     = document.getElementById("pixelbin-result");

  btn.addEventListener("click", async () => {
    if (!input.files.length) return alert("Sélectionnez une image.");
    const file = input.files[0];

    // Preview locale
    const reader = new FileReader();
    reader.onload = () => {
      result.innerHTML = `
        <div>
          <p>🖼️ Originale :</p>
          <img src="${reader.result}" alt="Originale">
        </div>`;
    };
    reader.readAsDataURL(file);

    // Affichage spinner
    btn.disabled = true;
    btn.textContent = "";
    const spinner = document.createElement("div");
    spinner.className = "spinner";
    btn.appendChild(spinner);

    try {
      // Envoi vers ton proxy
      const form = new FormData();
      form.append("image", file);
      const resp = await fetch(UPLOAD_URL, { method: "POST", body: form });
      const { originalUrl, transformedUrl } = await resp.json();

      // Affichage de la version ×4
      result.innerHTML += `
        <div>
          <p>✨ Upscalée ×4 :</p>
          <img src="${transformedUrl}" alt="Upscalée">
          <button id="downloadBtn">📥 Télécharger</button>
        </div>`;

      // Forcer le téléchargement en PNG
      document.getElementById("downloadBtn").addEventListener("click", async () => {
        try {
          const url      = encodeURI(transformedUrl);
          const r        = await fetch(url);
          const blob     = await r.blob();
          const filename = file.name.replace(/\.\w+$/, "") + ".png";
          const blobUrl  = URL.createObjectURL(blob);
          const a        = document.createElement("a");
          a.href         = blobUrl;
          a.download     = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(blobUrl);
        } catch (e) {
          alert("Erreur téléchargement : " + e.message);
        }
      });

    } catch (err) {
      alert("Erreur : " + err.message);
    } finally {
      btn.disabled   = false;
      btn.textContent = "Améliorer l’image ×4";
    }
  });
})();
</script>
