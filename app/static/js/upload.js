/* SMTH Music — drag & drop upload with progress */
"use strict";

window.SmthUpload = (function () {
  function init() {
    const form = document.getElementById("upload-form");
    if (!form) return;

    const zone = document.getElementById("dropzone");
    const input = document.getElementById("file-input");
    const progress = document.getElementById("upload-progress");
    const fill = document.getElementById("progress-fill");
    const btn = document.getElementById("upload-btn");

    zone.addEventListener("click", () => input.click());
    zone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") input.click();
    });
    ["dragenter", "dragover"].forEach((ev) =>
      zone.addEventListener(ev, (e) => {
        e.preventDefault();
        zone.classList.add("dragover");
      })
    );
    ["dragleave", "drop"].forEach((ev) =>
      zone.addEventListener(ev, (e) => {
        e.preventDefault();
        zone.classList.remove("dragover");
      })
    );
    zone.addEventListener("drop", (e) => {
      if (e.dataTransfer.files.length) input.files = e.dataTransfer.files;
      refreshLabel();
    });
    input.addEventListener("change", refreshLabel);

    function refreshLabel() {
      if (input.files.length) {
        zone.innerHTML =
          "<strong>" + SmthUtils.esc(input.files[0].name) + "</strong>" +
          "<span>click to change</span>";
      }
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!input.files.length) {
        Toast.show("Pick an MP3 first.", "error");
        return;
      }
      const data = new FormData(form);
      data.set("file", input.files[0]);
      const xhr = new XMLHttpRequest();
      progress.hidden = false;
      btn.disabled = true;
      btn.textContent = "Uploading…";

      xhr.upload.addEventListener("progress", (ev) => {
        if (ev.lengthComputable) {
          fill.style.width = Math.round((ev.loaded / ev.total) * 100) + "%";
        }
      });
      xhr.addEventListener("load", () => {
        progress.hidden = true;
        btn.disabled = false;
        btn.textContent = "Submit for review";
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status === 200 && res.ok) {
            Toast.show(res.message || "Queued for review ✔");
            form.reset();
            refreshLabel();
            fill.style.width = "0%";
          } else {
            Toast.show(res.error || "Upload failed.", "error");
          }
        } catch {
          Toast.show("Upload failed — is the file a valid MP3?", "error");
        }
      });
      xhr.addEventListener("error", () => {
        progress.hidden = true;
        btn.disabled = false;
        btn.textContent = "Submit for review";
        Toast.show("Network error during upload.", "error");
      });

      xhr.open("POST", form.getAttribute("action") || "/api/upload");
      xhr.setRequestHeader("X-CSRF-Token", SmthUtils.csrfToken());
      xhr.send(data);
    });
  }

  document.addEventListener("DOMContentLoaded", init);

  return { init };
})();
