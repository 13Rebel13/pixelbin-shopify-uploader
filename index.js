<style>
  #pixelbin-container {
    max-width: 800px;
    margin: 40px auto;
    text-align: center;
  }
  #pixelbin-actions {
    margin-bottom: 24px;
  }
  #pixelbin-actions input,
  #pixelbin-actions button {
    vertical-align: middle;
  }
  #uploadBtn {
    background: #007bff;
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 8px;
  }
  #uploadBtn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  #downloadBtn {
    background: #28a745;
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 8px;
    display: none;
  }
  #pixelbin-result {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 20px;
    margin-top: 20px;
  }
  .image-block {
    flex: 0 1 45%;
    text-align: center;
  }
  .image-block img {
    max-width: 100%;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-top: 8px;
  }
  .spinner {
    border: 4px solid rgba(0,0,0,0.1);
    width: 24px; height: 24px;
    border-radius: 50%;
    border-left-color: #000;
    animation: spin 1s linear infinite;
    display: inline-block;
    vertical-align: middle;
    margin-right: 8px;
  }
  @keyframes spin { to { transform: rotate(360deg) } }
</style>

<div id="pixelbin-container">
  <div id="pixelbin-actions">
    <input type="file" id="pixelbin-upload-input" accept="image/png, image/jpeg">
    <button id="uploadBtn">Améliorer l’image</button>
    <button id="downloadBtn">📥 Télécharger</button>
  </div>
  <div id="pixelbin-result"></div>
</div>

<script>
(function(){
  const UPLOAD_URL  = "https://pixelbin-shopify-uploader.onrender.com/upload";
  const input       = document.getElementById("pixelbin-upload-input");
  const uploadBtn   = document.getElementById("uploadBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const result      = document.getElementById("pixelbin-result");
  let finalUrl; // stockera transformedUrl

  uploadBtn.addEventListener("click", async () => {
    if (!input.files.length) return alert("Sélectionnez une image.");
    const file = input.files[0];

    // Affiche preview locale (Avant)
    const reader = new FileReader();
    reader.onload = () => {
      result.innerHTML = `
        <div class="image-block">
          <p>🖼️ Avant :</p>
          <img src="${reader.result}" alt="Avant">
        </div>`;
    };
    reader.readAsDataURL(file);

    // Spinner
    uploadBtn.disabled   = true;
    uploadBtn.textContent = "";
    const spinner = document.createElement("div");
    spinner.className = "spinner";
    uploadBtn.appendChild(spinner);
    downloadBtn.style.display = "none";

    try {
      // Envoi au proxy
      const form = new FormData();
      form.append("image", file);
      const resp = await fetch(UPLOAD_URL, { method: "POST", body: form });
      const { originalUrl, transformedUrl } = await resp.json();
      finalUrl = transformedUrl;

      // Affiche image transformée (Après)
      result.innerHTML += `
        <div class="image-block">
          <p>✨ Après :</p>
          <img src="${transformedUrl}" alt="Après">
        </div>`;

      // Active le bouton Télécharger
      downloadBtn.style.display = "inline-block";
    } catch (e) {
      alert("Erreur : " + e.message);
    } finally {
      uploadBtn.disabled   = false;
      uploadBtn.textContent = "Améliorer l’image";
    }
  });

  downloadBtn.addEventListener("click", async () => {
    if (!finalUrl) return;
    // Va chercher la ressource et télécharge en blob pour forcer le .png
    try {
      const res  = await fetch(encodeURI(finalUrl));
      const blob = await res.blob();
      const ext  = blob.type.split("/")[1] || "png";
      const filename = input.files[0].name.replace(/\.\w+$/, "") + "." + ext;
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      alert("Erreur téléchargement : " + e.message);
    }
  });
})();
</script>
