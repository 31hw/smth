/* SMTH Music — shared helpers */
"use strict";

window.SmthUtils = (function () {
  const csrfToken = () =>
    (document.querySelector('meta[name="csrf-token"]') || {}).content || "";

  const esc = (str) =>
    String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const fmtTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return "0:00";
    const total = Math.round(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m + ":" + String(s).padStart(2, "0");
  };

  const apiFetch = (url, options = {}) => {
    options.headers = Object.assign(
      { "X-CSRF-Token": csrfToken() },
      options.headers || {}
    );
    return fetch(url, options).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.error || "Request failed (" + res.status + ")");
        err.status = res.status;
        throw err;
      }
      return data;
    });
  };

  return { csrfToken, esc, fmtTime, apiFetch };
})();
