(function DevotionalModule() {
  'use strict';

  const DATA_URL = 'data/devotionals.json';

  function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    return Math.floor((date - start) / 86400000);
  }

  function formatDateLabel(date) {
    return date.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  }

  async function loadDevotional() {
    const today   = new Date();
    const dayIdx  = getDayOfYear(today);

    try {
      const data   = await fetch(DATA_URL).then(r => r.json());
      const entry  = data[dayIdx % data.length];

      // Renderizar en preview de home (si existe)
      renderHomePreview(entry, today);
      // Renderizar en página devocional completa (si existe)
      renderFullPage(entry, today);
    } catch(err) {
      const loader = document.getElementById('devo-loader');
      if (loader) loader.innerHTML = '<p style="color:var(--color-text-muted)">No se pudo cargar el devocional.</p>';
      console.warn('Devotional error:', err);
    }
  }

  function renderHomePreview(entry, today) {
    const content = document.getElementById('devo-content');
    const loader  = document.getElementById('devo-loader');
    if (!content) return;

    document.getElementById('devo-date-badge').textContent = formatDateLabel(today);
    document.getElementById('devo-title').textContent      = entry.title;
    document.getElementById('devo-scripture').textContent  = `"${entry.scripture_text}" — ${entry.scripture_ref}`;
    document.getElementById('devo-excerpt').textContent    = entry.body.substring(0, 200) + '…';

    loader.style.display  = 'none';
    content.style.display = 'block';
  }

  function renderFullPage(entry, today) {
    const page = document.getElementById('devo-full-page');
    if (!page) return;

    page.innerHTML = `
      <div class="devo-page-header anim-fade-up">
        <span class="badge">${formatDateLabel(today)}</span>
        <h1 class="devo-page-title">${entry.title}</h1>
        <div class="divider"></div>
      </div>

      <article class="devo-article anim-fade-up">
        <div class="devo-scripture-block">
          <p class="devo-scripture-text">"${entry.scripture_text}"</p>
          <p class="devo-scripture-ref">— ${entry.scripture_ref}</p>
          <a href="biblia.html" class="devo-bible-link">📖 Leer en la Biblia →</a>
        </div>

        <div class="devo-body">
          <p>${entry.body}</p>
        </div>

        <div class="devo-prayer-block">
          <h3>🙏 Oración del Día</h3>
          <p class="devo-prayer-text">${entry.prayer}</p>
        </div>

        <div class="devo-actions">
          <button class="btn" id="btn-share-devo">📤 Compartir devocional</button>
          <a href="index.html" class="btn btn-outline">← Volver al Inicio</a>
        </div>
      </article>
    `;

    // Botón compartir
    const shareBtn = document.getElementById('btn-share-devo');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const shareData = {
          title: `Devocional: ${entry.title}`,
          text:  `"${entry.scripture_text}" — ${entry.scripture_ref}\n\n${entry.body.substring(0,100)}…`,
          url:   window.location.href
        };
        if (navigator.share) {
          navigator.share(shareData).catch(() => {});
        } else {
          navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`)
            .then(() => alert('¡Devocional copiado al portapapeles!'))
            .catch(() => {});
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', loadDevotional);
})();
