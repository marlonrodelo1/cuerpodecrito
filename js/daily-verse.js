(function DailyVerseModule() {
  'use strict';

  const SCHEDULE_URL  = 'data/verse-schedule.json';
  const CACHE_KEY     = 'daily_verse_';

  async function loadDailyVerse() {
    const today     = new Date();
    const dateKey   = formatDate(today);
    const cacheKey  = CACHE_KEY + dateKey;

    // Intentar caché
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        renderVerse(JSON.parse(cached));
        return;
      } catch(e) { /* fallthrough */ }
    }

    try {
      const schedule = await fetch(SCHEDULE_URL).then(r => r.json());
      const index    = dateToIndex(today, schedule.length);
      const entry    = schedule[index];

      const text = await window.BibleModule.getVerse(entry.slug, entry.chapter, entry.verse);
      const result = {
        text,
        ref:     `${entry.book} ${entry.chapter}:${entry.verse}`,
        link:    `biblia.html#${entry.slug}-${entry.chapter}-${entry.verse}`
      };

      sessionStorage.setItem(cacheKey, JSON.stringify(result));
      renderVerse(result);
    } catch(err) {
      renderError();
      console.warn('DailyVerse error:', err);
    }
  }

  function dateToIndex(date, total) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const seed = (y * 10000) + (m * 100) + d;
    return seed % total;
  }

  function formatDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function renderVerse(data) {
    const loader  = document.getElementById('verse-loader');
    const textEl  = document.getElementById('verse-text');
    const refEl   = document.getElementById('verse-ref');
    const linkEl  = document.getElementById('verse-link');
    if (!textEl) return;

    if (loader)  loader.style.display  = 'none';
    textEl.textContent = data.text;
    refEl.textContent  = '— ' + data.ref;
    if (linkEl) {
      linkEl.href = data.link;
      linkEl.textContent = 'Leer capítulo completo →';
    }
    textEl.style.display  = '';
    refEl.style.display   = '';
    if (linkEl) linkEl.style.display = '';
  }

  function renderError() {
    const loader = document.getElementById('verse-loader');
    if (loader) {
      loader.innerHTML = '<p style="color:var(--color-text-muted)">No se pudo cargar el versículo. Verifica tu conexión.</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('daily-verse-card')) {
      loadDailyVerse();
    }
  });

  // Exportar para uso externo (devocional, etc.)
  window.DailyVerseModule = { loadDailyVerse };
})();
