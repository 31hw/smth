/* SMTH Music — page-level behaviour */
"use strict";

(function () {
  document.addEventListener("DOMContentLoaded", () => {
    initPlayerData();
    initSearch();
    initGenreChips();
    initPlayButtons();
    initConfirmForms();
    initAccountTabs();
    initPasswordForm();
    refreshAdminBadge();
  });

  let TRACKS = [];

  function initPlayerData() {
    const grid = document.getElementById("track-grid");
    if (grid) {
      TRACKS = Array.from(grid.querySelectorAll(".card")).map((card) => ({
        slug: card.dataset.slug,
        title: card.dataset.title,
        artist: card.dataset.artist,
        album: card.dataset.album,
        genre: card.dataset.genre,
        stream_url: "/music/" + encodeURIComponent(card.dataset.slug) + "/stream",
      }));
      window.SmthPlayer.setQueue(TRACKS);
    }
  }

  function initSearch() {
    const search = document.getElementById("search");
    if (!search) return;
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      document.querySelectorAll(".card").forEach((card) => {
        const hay =
          (card.dataset.title + " " + card.dataset.artist + " " +
           card.dataset.album + " " + card.dataset.genre).toLowerCase();
        card.classList.toggle("hidden", q && !hay.includes(q));
      });
    });
    document.getElementById("nav-search").addEventListener("click", (e) => {
      e.preventDefault();
      const el = document.getElementById("search");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    });
  }

  function initGenreChips() {
    const chips = document.querySelectorAll("#genre-chips .chip");
    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        chips.forEach((c) => c.classList.remove("chip-active"));
        chip.classList.add("chip-active");
        const genre = chip.dataset.genre.toLowerCase();
        document.querySelectorAll(".card").forEach((card) => {
          const match = !genre || (card.dataset.genre || "").toLowerCase() === genre;
          card.classList.toggle("hidden", !match);
        });
      });
    });
  }

  function initPlayButtons() {
    document.querySelectorAll("[data-play]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.SmthPlayer.playTrack(btn.dataset.play);
      });
    });
  }

  function initConfirmForms() {
    document.querySelectorAll("form[data-confirm]").forEach((form) => {
      form.addEventListener("submit", (e) => {
        if (!window.confirm(form.dataset.confirm)) e.preventDefault();
      });
    });
  }

  function initAccountTabs() {
    const tabs = document.querySelectorAll(".side-tab");
    if (!tabs.length) return;
    const show = (name) => {
      tabs.forEach((t) =>
        t.classList.toggle("active", t.dataset.tab === name)
      );
      document.querySelectorAll(".tab-panel").forEach((p) => {
        p.hidden = p.dataset.panel !== name;
      });
      history.replaceState(null, "", "?tab=" + name);
    };
    tabs.forEach((tab) =>
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        show(tab.dataset.tab);
      })
    );
    const hash = new URLSearchParams(location.search).get("tab");
    if (hash) show(hash);
    document.querySelectorAll("[data-goto-tab]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.preventDefault();
        show(el.dataset.gotoTab);
      })
    );
  }

  function initPasswordForm() {
    const form = document.getElementById("password-form");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      SmthUtils.apiFetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(Object.fromEntries(data.entries())),
      })
        .then((res) => Toast.show(res.message || "Updated ✔"))
        .catch((err) => Toast.show(err.message, "error"));
    });
  }

  function refreshAdminBadge() {
    const badge = document.getElementById("admin-badge");
    if (!badge) return;
    fetch("/api/admin/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.pending > 0) {
          badge.textContent = data.pending;
          badge.hidden = false;
        }
      })
      .catch(() => {});
  }
})();
