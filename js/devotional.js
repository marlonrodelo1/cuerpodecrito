(function DevotionalModule() {
  'use strict';

  const STORAGE_KEY = 'cdc_devotionals';

  // ─── Storage ───────────────────────────────────────────────
  function getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  function saveAll(devos) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(devos));
  }

  function saveOne(devo) {
    const all = getAll();
    const idx = all.findIndex(d => d.id === devo.id);
    if (idx !== -1) all[idx] = devo;
    else all.unshift(devo);
    all.sort((a, b) => b.date.localeCompare(a.date));
    saveAll(all);
  }

  function deleteOne(id) {
    saveAll(getAll().filter(d => d.id !== id));
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  // ─── Selección del devocional del día ──────────────────────
  function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function getTodaysEntry() {
    const all = getAll();
    if (!all.length) return null;
    const today = getTodayKey();
    const exact = all.find(d => d.date === today);
    if (exact) return exact;
    const past = all.filter(d => d.date <= today);
    if (past.length) return past[0];
    return all[0];
  }

  // ─── Render helpers ────────────────────────────────────────
  function formatDateLabel(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  }

  function renderHomePreview(entry) {
    const content = document.getElementById('devo-content');
    const loader  = document.getElementById('devo-loader');
    if (!content) return;
    const firstVerse = entry.verses && entry.verses[0];
    document.getElementById('devo-date-badge').textContent = formatDateLabel(entry.date);
    document.getElementById('devo-title').textContent      = entry.title;
    document.getElementById('devo-scripture').textContent  = firstVerse
      ? `"${firstVerse.text}" — ${firstVerse.ref}` : '';
    document.getElementById('devo-excerpt').textContent    = entry.body.substring(0, 200) + '…';
    if (loader) loader.style.display = 'none';
    content.style.display = 'block';
  }

  function renderFullPage(entry) {
    const page = document.getElementById('devo-full-page');
    if (!page) return;

    const versesHtml = (entry.verses || []).map(v => `
      <div class="devo-verse-block">
        <p class="devo-scripture-text">"${v.text}"</p>
        <p class="devo-scripture-ref">— ${v.ref}</p>
        <a href="biblia.html" class="devo-bible-link">📖 Leer en la Biblia →</a>
      </div>
    `).join('');

    const imageHtml = entry.image ? `
      <div class="devo-image-wrap">
        <img src="${entry.image}" alt="${entry.title}" class="devo-image" loading="lazy"
             onerror="this.parentElement.style.display='none'">
      </div>
    ` : '';

    page.innerHTML = `
      <div class="devo-page-header anim-fade-up">
        <span class="badge">${formatDateLabel(entry.date)}</span>
        <h1 class="devo-page-title">${entry.title}</h1>
        <div class="divider"></div>
      </div>

      <article class="devo-article anim-fade-up">
        ${imageHtml}

        <div class="devo-verses-list">
          ${versesHtml || '<p style="color:var(--color-text-muted)">Sin versículos añadidos.</p>'}
        </div>

        <div class="devo-body">
          ${entry.body.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('')}
        </div>

        <div class="devo-prayer-block">
          <h3>🙏 Oración del Día</h3>
          <p class="devo-prayer-text">${entry.prayer}</p>
        </div>

        <div class="devo-actions">
          <button class="btn" id="btn-share-devo">📤 Compartir</button>
          <a href="index.html" class="btn btn-outline">← Inicio</a>
          <a href="admin-devocional.html" class="devo-admin-link">✏️ Editar devocional</a>
        </div>
      </article>
    `;

    document.getElementById('btn-share-devo').addEventListener('click', () => {
      const firstVerse = entry.verses && entry.verses[0];
      const shareText  = firstVerse
        ? `"${firstVerse.text}" — ${firstVerse.ref}\n\n${entry.body.substring(0, 120)}…`
        : entry.body.substring(0, 150) + '…';
      const shareData  = { title: `Devocional: ${entry.title}`, text: shareText, url: window.location.href };
      if (navigator.share) {
        navigator.share(shareData).catch(() => {});
      } else {
        navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`)
          .then(() => alert('¡Devocional copiado al portapapeles!'))
          .catch(() => {});
      }
    });
  }

  // ─── Fallback al JSON estático ──────────────────────────────
  async function getFallbackEntry() {
    try {
      const data  = await fetch('data/devotionals.json').then(r => r.json());
      const today = new Date();
      const start = new Date(today.getFullYear(), 0, 0);
      const idx   = Math.floor((today - start) / 86400000) % data.length;
      const e     = data[idx];
      return {
        id:     'static_' + idx,
        date:   today.toISOString().slice(0, 10),
        title:  e.title,
        image:  '',
        body:   e.body,
        verses: [{ ref: e.scripture_ref, text: e.scripture_text }],
        prayer: e.prayer
      };
    } catch(err) { return null; }
  }

  // ─── Init ──────────────────────────────────────────────────
  async function loadDevotional() {
    let entry = getTodaysEntry();
    if (!entry) entry = await getFallbackEntry();
    if (!entry) {
      const loader = document.getElementById('devo-loader');
      if (loader) loader.innerHTML = `
        <p style="color:var(--color-text-muted);text-align:center;">
          No hay devocional para hoy.<br>
          <a href="admin-devocional.html" style="color:var(--color-accent);">+ Agregar devocional</a>
        </p>`;
      return;
    }
    renderHomePreview(entry);
    renderFullPage(entry);
  }

  document.addEventListener('DOMContentLoaded', loadDevotional);

  window.DevotionalModule = { getAll, saveOne, deleteOne, generateId, getTodayKey };
})();
