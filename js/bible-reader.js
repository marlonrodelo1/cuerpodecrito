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

      row.appendChild(num);
      row.appendChild(body);
      row.addEventListener('click', () => {
        document.querySelectorAll('.verse-row.highlighted').forEach(r => r.classList.remove('highlighted'));
        row.classList.toggle('highlighted');
        history.replaceState(null, '', `#${book.slug}-${chNum}-${v.verse}`);
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

  document.addEventListener('DOMContentLoaded', init);
})();
