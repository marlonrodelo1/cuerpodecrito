(function BibleReaderModule() {
  'use strict';

  const state = {
    bookIndex:    0,
    chapterIndex: 0,
    fontSize:     17,
    searchQuery:  '',
    bookData:     null
  };

  const FONT_MIN = 13;
  const FONT_MAX = 26;
  const FONT_KEY = 'bible_font_size';

  function init() {
    if (!document.getElementById('book-select')) return;

    state.fontSize = parseInt(localStorage.getItem(FONT_KEY) || '17', 10);
    buildBookSelector();
    applyFontSize();
    parseHashAndLoad();

    document.getElementById('book-select').addEventListener('change', onBookChange);
    document.getElementById('btn-prev').addEventListener('click', prevChapter);
    document.getElementById('btn-next').addEventListener('click', nextChapter);
    document.getElementById('btn-search').addEventListener('click', doSearch);
    document.getElementById('bible-search').addEventListener('keydown', e => {
      if (e.key === 'Enter') doSearch();
      if (e.key === 'Escape') clearSearch();
    });
    document.getElementById('font-up').addEventListener('click', () => changeFontSize(1));
    document.getElementById('font-down').addEventListener('click', () => changeFontSize(-1));
    document.getElementById('footer-year').textContent = new Date().getFullYear();
  }

  function buildBookSelector() {
    const sel = document.getElementById('book-select');
    window.BibleModule.BOOKS.forEach((book, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = book.name;
      sel.appendChild(opt);
    });
  }

  function parseHashAndLoad() {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const parts = hash.split('-');
      if (parts.length >= 2) {
        const slug = parts[0];
        const ch   = parseInt(parts[1], 10) || 1;
        const vs   = parseInt(parts[2], 10) || null;
        const idx  = window.BibleModule.BOOKS.findIndex(b => b.slug.toLowerCase() === slug.toLowerCase());
        if (idx !== -1) {
          state.bookIndex    = idx;
          state.chapterIndex = ch - 1;
          state.highlightVerse = vs;
        }
      }
    }
    loadChapter();
  }

  function onBookChange() {
    state.bookIndex    = parseInt(this.value, 10);
    state.chapterIndex = 0;
    state.searchQuery  = '';
    document.getElementById('bible-search').value = '';
    document.getElementById('search-count').style.display = 'none';
    loadChapter();
  }

  async function loadChapter() {
    const book = window.BibleModule.BOOKS[state.bookIndex];
    document.getElementById('book-select').value = state.bookIndex;
    document.getElementById('chapter-heading').textContent =
      `${book.name} — Capítulo ${state.chapterIndex + 1}`;

    buildChapterGrid(book.chapters);
    updateNavButtons(book.chapters);

    // Mostrar loader
    document.getElementById('bible-loading').style.display   = 'flex';
    document.getElementById('verses-container').style.display = 'none';

    try {
      const data = await window.BibleModule.fetchBook(book.slug);
      state.bookData = data;
      const chapterData = (data.chapters || data)[state.chapterIndex];
      // Cargar resaltados para este capítulo (incluye localStorage + Supabase)
      if (window.BibleHighlights) {
        await window.BibleHighlights.loadHighlightsForChapter(book.slug, state.chapterIndex + 1);
      }
      renderVerses(chapterData.verses, book, state.chapterIndex + 1);
    } catch(err) {
      document.getElementById('bible-loading').innerHTML =
        '<p style="color:var(--color-text-muted)">Error cargando la Biblia. Verifica tu conexión.</p>';
      console.error(err);
    }
  }

  function renderVerses(verses, book, chNum) {
    const container = document.getElementById('verses-container');
    const loading   = document.getElementById('bible-loading');

    container.innerHTML = '';
    verses.forEach(v => {
      const row  = document.createElement('div');
      row.className = 'verse-row';
      row.id = `v${v.verse}`;

      // Resaltado de color (highlights)
      const hlColor = window.BibleHighlights
        ? window.BibleHighlights.getHighlight(book.slug, chNum, v.verse)
        : null;
      if (hlColor) row.classList.add('highlight-' + hlColor);

      // Resaltado de navegación (hash)
      if (state.highlightVerse && Number(v.verse) === state.highlightVerse) {
        row.classList.add('highlighted');
      }
      row.setAttribute('role', 'listitem');

      const num  = document.createElement('span');
      num.className = 'verse-num';
      num.textContent = v.verse;

      const body = document.createElement('span');
      body.className = 'verse-body';

      if (state.searchQuery) {
        const regex = new RegExp(`(${escapeRegex(state.searchQuery)})`, 'gi');
        if (regex.test(v.text)) {
          body.classList.add('search-match');
          body.innerHTML = v.text.replace(regex, '<mark>$1</mark>');
        } else {
          row.style.opacity = '0.35';
          body.textContent = v.text;
        }
      } else {
        body.textContent = v.text;
      }

      // Barra de acciones por versículo
      const actions = document.createElement('div');
      actions.className = 'verse-actions';
      actions.innerHTML = `
        <button class="verse-btn verse-btn-save"      title="Guardar versículo" aria-label="Guardar">🔖</button>
        <button class="verse-btn verse-btn-highlight" title="Resaltar"          aria-label="Resaltar">🎨</button>
        <button class="verse-btn verse-btn-share"     title="Compartir"         aria-label="Compartir">📤</button>
        <div class="highlight-palette" hidden>
          <button class="hl-color" data-color="yellow" style="color:#ffd54f" title="Amarillo">●</button>
          <button class="hl-color" data-color="green"  style="color:#66bb6a" title="Verde">●</button>
          <button class="hl-color" data-color="blue"   style="color:#4fc3f7" title="Azul">●</button>
          <button class="hl-color" data-color="pink"   style="color:#f06292" title="Rosa">●</button>
          <button class="hl-color" data-color="purple" style="color:#ba68c8" title="Morado">●</button>
          <button class="hl-color hl-remove" data-color="none" title="Quitar resaltado">✕</button>
        </div>`;

      row.appendChild(num);
      row.appendChild(body);
      row.appendChild(actions);

      // Click en fila → toggle barra de acciones + URL
      row.addEventListener('click', (e) => {
        if (e.target.closest('.verse-actions')) return;
        document.querySelectorAll('.verse-row.active').forEach(r => r.classList.remove('active'));
        document.querySelectorAll('.verse-row.highlighted').forEach(r => r.classList.remove('highlighted'));
        row.classList.add('active');
        row.classList.add('highlighted');
        history.replaceState(null, '', `#${book.slug}-${chNum}-${v.verse}`);
      });

      // Guardar versículo
      actions.querySelector('.verse-btn-save').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!window.AuthModule || !window.AuthModule.isLoggedIn()) {
          window.location.href = `login.html?redirect=${encodeURIComponent(location.href)}`;
          return;
        }
        const btn = e.currentTarget;
        try {
          const user = window.AuthModule.currentUser();
          const ref  = `${book.name} ${chNum}:${v.verse}`;
          await window.SupabaseClient.client.from('saved_verses').upsert({
            user_id:   user.id,
            book_slug: book.slug,
            chapter:   chNum,
            verse:     v.verse,
            verse_text: v.text,
            verse_ref:  ref
          }, { onConflict: 'user_id,book_slug,chapter,verse' });
          btn.textContent = '✅';
          setTimeout(() => { btn.textContent = '🔖'; }, 2000);
        } catch(_) {
          btn.textContent = '❌';
          setTimeout(() => { btn.textContent = '🔖'; }, 2000);
        }
      });

      // Resaltar versículo
      const palette = actions.querySelector('.highlight-palette');
      actions.querySelector('.verse-btn-highlight').addEventListener('click', (e) => {
        e.stopPropagation();
        palette.hidden = !palette.hidden;
      });
      actions.querySelectorAll('.hl-color').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const color = btn.dataset.color;
          if (!window.BibleHighlights) return;
          // Quitar colores previos
          ['yellow','green','blue','pink','purple'].forEach(c => row.classList.remove('highlight-' + c));
          if (color === 'none') {
            await window.BibleHighlights.removeHighlight(book.slug, chNum, v.verse);
          } else {
            row.classList.add('highlight-' + color);
            await window.BibleHighlights.setHighlight(book.slug, chNum, v.verse, color);
          }
          palette.hidden = true;
        });
      });

      // Compartir versículo
      actions.querySelector('.verse-btn-share').addEventListener('click', async (e) => {
        e.stopPropagation();
        const ref  = `${book.name} ${chNum}:${v.verse}`;
        const url  = `${location.origin}${location.pathname}#${book.slug}-${chNum}-${v.verse}`;
        const text = `"${v.text}" — ${ref}`;
        if (navigator.share) {
          navigator.share({ title: ref, text, url }).catch(() => {});
        } else {
          navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
            showToast('¡Copiado al portapapeles!');
          }).catch(() => {});
        }
      });

      container.appendChild(row);
    });

    loading.style.display   = 'none';
    container.style.display = 'block';
    container.style.fontSize = state.fontSize + 'px';
    state.highlightVerse = null;

    // Scroll al versículo destacado
    const highlighted = container.querySelector('.highlighted');
    if (highlighted) {
      setTimeout(() => highlighted.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function buildChapterGrid(total) {
    const grid = document.getElementById('chapter-grid');
    grid.innerHTML = '';
    for (let i = 1; i <= total; i++) {
      const btn = document.createElement('button');
      btn.className = 'chapter-btn' + (i - 1 === state.chapterIndex ? ' active' : '');
      btn.textContent = i;
      btn.setAttribute('aria-label', `Capítulo ${i}`);
      btn.addEventListener('click', () => {
        state.chapterIndex = i - 1;
        state.searchQuery  = '';
        document.getElementById('bible-search').value = '';
        document.getElementById('search-count').style.display = 'none';
        loadChapter();
      });
      grid.appendChild(btn);
    }
  }

  function updateNavButtons(total) {
    document.getElementById('btn-prev').disabled = state.chapterIndex === 0;
    document.getElementById('btn-next').disabled = state.chapterIndex >= total - 1;
  }

  function prevChapter() {
    if (state.chapterIndex > 0) {
      state.chapterIndex--;
      loadChapter();
    }
  }

  function nextChapter() {
    const book = window.BibleModule.BOOKS[state.bookIndex];
    if (state.chapterIndex < book.chapters - 1) {
      state.chapterIndex++;
      loadChapter();
    }
  }

  function doSearch() {
    const query = document.getElementById('bible-search').value.trim();
    if (!query) return clearSearch();
    state.searchQuery = query;

    if (!state.bookData) return;
    const book  = window.BibleModule.BOOKS[state.bookIndex];
    const chData = (state.bookData.chapters || state.bookData)[state.chapterIndex];
    const matches = chData.verses.filter(v =>
      v.text.toLowerCase().includes(query.toLowerCase())
    ).length;

    const countEl = document.getElementById('search-count');
    countEl.textContent = `${matches} resultado${matches !== 1 ? 's' : ''} en este capítulo`;
    countEl.style.display = 'block';

    renderVerses(chData.verses, book, state.chapterIndex + 1);
  }

  function clearSearch() {
    state.searchQuery = '';
    document.getElementById('search-count').style.display = 'none';
    if (!state.bookData) return;
    const book  = window.BibleModule.BOOKS[state.bookIndex];
    const chData = (state.bookData.chapters || state.bookData)[state.chapterIndex];
    renderVerses(chData.verses, book, state.chapterIndex + 1);
  }

  function changeFontSize(delta) {
    state.fontSize = Math.max(FONT_MIN, Math.min(FONT_MAX, state.fontSize + delta));
    localStorage.setItem(FONT_KEY, state.fontSize);
    applyFontSize();
  }

  function applyFontSize() {
    const c = document.getElementById('verses-container');
    if (c) c.style.fontSize = state.fontSize + 'px';
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function showToast(msg) {
    let toast = document.getElementById('bible-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'bible-toast';
      toast.className = 'bible-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('visible'), 2500);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
