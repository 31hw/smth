/* SMTH Music — toast notifications */
"use strict";

window.Toast = (function () {
  const root = () => document.getElementById("toast-root");

  function show(message, kind = "info", ms = 4000) {
    const el = document.createElement("div");
    el.className = "toast" + (kind === "error" ? " toast-error" : "");
    el.textContent = message;
    root().appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity .3s";
      setTimeout(() => el.remove(), 320);
    }, ms);
  }

  return { show };
})();
