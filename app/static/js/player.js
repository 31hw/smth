/* SMTH Music — bottom player bar logic */
"use strict";

window.SmthPlayer = (function () {
  let queue = [];
  let index = -1;
  let audio = null;

  const els = {};

  function init() {
    audio = document.getElementById("audio");
    ["pb-cover", "pb-title", "pb-artist", "pb-current", "pb-total",
     "btn-play", "btn-prev", "btn-next", "pb-seek", "pb-volume",
     "btn-mute", "pb-speed", "play-icon"].forEach((id) => {
      els[id] = document.getElementById(id);
    });

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", () => {
      els["pb-total"].textContent = SmthUtils.fmtTime(audio.duration);
      els["pb-seek"].max = Math.floor(audio.duration || 0);
    });
    audio.addEventListener("ended", next);

    els["btn-play"].addEventListener("click", toggle);
    els["btn-prev"].addEventListener("click", prev);
    els["btn-next"].addEventListener("click", next);
    els["pb-seek"].addEventListener("input", () => {
      if (audio.duration) audio.currentTime = +els["pb-seek"].value;
    });
    els["pb-volume"].addEventListener("input", () => {
      audio.volume = els["pb-volume"].value / 100;
    });
    els["btn-mute"].addEventListener("click", () => {
      audio.muted = !audio.muted;
      els["btn-mute"].style.opacity = audio.muted ? 0.4 : 1;
    });
    els["pb-speed"].addEventListener("change", () => {
      audio.playbackRate = +els["pb-speed"].value;
    });
  }

  function setQueue(tracks) {
    queue = tracks || [];
  }

  function playTrack(slug) {
    const i = queue.findIndex((t) => t.slug === slug);
    if (i === -1) return;
    index = i;
    loadCurrent();
    audio.play().catch(() => {});
  }

  function loadCurrent() {
    const t = queue[index];
    if (!t) return;
    audio.src = t.stream_url;
    els["pb-title"].textContent = t.title;
    els["pb-artist"].textContent = t.artist;
    els["pb-cover"].textContent = (t.title || "?").charAt(0).toUpperCase();
    els["np-title"].textContent = t.title;
    els["np-artist"].textContent = t.artist || "";
    document
      .querySelectorAll(".card[data-slug]")
      .forEach((c) => c.classList.toggle("playing", c.dataset.slug === t.slug));
    els["play-icon"].innerHTML = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>';
  }

  function updateProgress() {
    if (!audio.duration) return;
    els["pb-current"].textContent = SmthUtils.fmtTime(audio.currentTime);
    els["pb-seek"].value = Math.floor(audio.currentTime);
  }

  function toggle() {
    if (!audio.src) return;
    if (audio.paused) audio.play();
    else audio.pause();
    els["play-icon"].innerHTML = audio.paused
      ? '<path d="M8 5v14l11-7z"/>'
      : '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>';
  }

  function next() {
    if (!queue.length) return;
    index = (index + 1) % queue.length;
    loadCurrent();
    audio.play().catch(() => {});
  }

  function prev() {
    if (!queue.length) return;
    index = (index - 1 + queue.length) % queue.length;
    loadCurrent();
    audio.play().catch(() => {});
  }

  document.addEventListener("DOMContentLoaded", init);

  return { setQueue, playTrack, toggle, next, prev };
})();
