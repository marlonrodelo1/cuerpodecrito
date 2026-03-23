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
    const actionsBar = document.getElementById('verse-actions-bar');
    if (!textEl) return;

    if (loader)  loader.style.display  = 'none';
    textEl.textContent = data.text;
    refEl.textContent  = '— ' + data.ref;
    if (linkEl) {
      linkEl.href = data.link;
    }
    textEl.style.display  = '';
    refEl.style.display   = '';
    if (linkEl) linkEl.style.display = '';
    if (actionsBar) actionsBar.style.display = '';

    // Cargar datos sociales y configurar handlers
    const today = formatDate(new Date());
    loadVerseSocial(today);
    setupSocialHandlers(today, data);
  }

  // ─── Social: likes y comentarios ────────────────────────────────────

  async function loadVerseSocial(dateStr) {
    if (!window.SupabaseClient) return;
    const client = window.SupabaseClient.client;

    // Cargar likes
    const { data: likes } = await client
      .from('verse_likes')
      .select('user_id')
      .eq('verse_date', dateStr);

    const likeCount = likes ? likes.length : 0;
    const countEl = document.getElementById('verse-like-count');
    if (countEl) countEl.textContent = likeCount;

    // Marcar si el usuario ya dio like
    const userId = _getCurrentUserId();
    if (userId && likes) {
      const alreadyLiked = likes.some(l => l.user_id === userId);
      const btn = document.getElementById('verse-like-btn');
      if (btn && alreadyLiked) btn.classList.add('liked');
    }

    // Cargar comentarios
    const { data: comments } = await client
      .from('verse_comments')
      .select('*')
      .eq('verse_date', dateStr)
      .order('created_at', { ascending: true });

    const commentCount = comments ? comments.length : 0;
    const commentCountEl = document.getElementById('verse-comment-count');
    if (commentCountEl) commentCountEl.textContent = commentCount;

    // Guardar comentarios para renderizar si panel abierto
    window._verseComments = comments || [];
  }

  function setupSocialHandlers(dateStr, verseData) {
    const likeBtn    = document.getElementById('verse-like-btn');
    const commentBtn = document.getElementById('verse-comment-btn');
    const shareBtn   = document.getElementById('verse-share-btn');

    // Like
    if (likeBtn) {
      likeBtn.addEventListener('click', async () => {
        if (!window.AuthModule || !window.AuthModule.isLoggedIn()) {
          window.location.href = 'login.html?redirect=index.html';
          return;
        }
        const client = window.SupabaseClient.client;
        const userId = _getCurrentUserId();
        const isLiked = likeBtn.classList.contains('liked');

        if (isLiked) {
          await client.from('verse_likes').delete()
            .eq('user_id', userId).eq('verse_date', dateStr);
          likeBtn.classList.remove('liked');
          const el = document.getElementById('verse-like-count');
          if (el) el.textContent = Math.max(0, parseInt(el.textContent) - 1);
        } else {
          await client.from('verse_likes').insert({ user_id: userId, verse_date: dateStr });
          likeBtn.classList.add('liked');
          const el = document.getElementById('verse-like-count');
          if (el) el.textContent = parseInt(el.textContent) + 1;
        }
      });
    }

    // Comentar (toggle panel)
    if (commentBtn) {
      commentBtn.addEventListener('click', () => {
        const panel = document.getElementById('verse-comments-panel');
        if (!panel) return;
        const isOpen = panel.style.display !== 'none';
        panel.style.display = isOpen ? 'none' : '';
        if (!isOpen) {
          renderCommentsPanel(dateStr);
        }
      });
    }

    // Compartir
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const textEl = document.getElementById('verse-text');
        const refEl  = document.getElementById('verse-ref');
        const text   = textEl ? textEl.textContent : '';
        const ref    = refEl ? refEl.textContent : '';
        const shareText = `${text}\n${ref}`;
        if (navigator.share) {
          try {
            await navigator.share({ title: 'Versículo del Día', text: shareText, url: location.href });
          } catch(e) { /* cancelado */ }
        } else {
          navigator.clipboard.writeText(shareText).then(() => {
            shareBtn.querySelector('.verse-action-icon').textContent = '✅';
            setTimeout(() => { shareBtn.querySelector('.verse-action-icon').textContent = '📤'; }, 2000);
          });
        }
      });
    }
  }

  function renderCommentsPanel(dateStr) {
    const listEl       = document.getElementById('verse-comments-list');
    const inputAreaEl  = document.getElementById('verse-comment-input-area');
    if (!listEl || !inputAreaEl) return;

    const comments = window._verseComments || [];

    // Renderizar lista
    if (comments.length === 0) {
      listEl.innerHTML = '<div class="verse-comments-empty">Sé el primero en comentar 🙏</div>';
    } else {
      listEl.innerHTML = comments.map(c => {
        const initial = (c.display_name || '?').charAt(0).toUpperCase();
        return `
          <div class="verse-comment-item">
            <div class="verse-comment-avatar">${initial}</div>
            <div class="verse-comment-body">
              <div class="verse-comment-name">${_esc(c.display_name || 'Anónimo')}</div>
              <div class="verse-comment-text">${_esc(c.text)}</div>
            </div>
          </div>`;
      }).join('');
    }

    // Renderizar input area
    const loggedIn = window.AuthModule && window.AuthModule.isLoggedIn();
    if (loggedIn) {
      inputAreaEl.innerHTML = `
        <input class="verse-comment-input" id="verse-comment-text" type="text"
               placeholder="Escribe un comentario..." maxlength="280">
        <button class="verse-comment-send" id="verse-comment-send">Enviar</button>`;

      const sendBtn = document.getElementById('verse-comment-send');
      const inputEl = document.getElementById('verse-comment-text');
      if (sendBtn && inputEl) {
        sendBtn.addEventListener('click', () => submitComment(dateStr, inputEl, listEl));
        inputEl.addEventListener('keydown', e => {
          if (e.key === 'Enter') submitComment(dateStr, inputEl, listEl);
        });
      }
    } else {
      inputAreaEl.innerHTML = `
        <div class="verse-comment-login-prompt">
          <a href="login.html?redirect=index.html">Inicia sesión</a> para comentar
        </div>`;
    }
  }

  async function submitComment(dateStr, inputEl, listEl) {
    const text = inputEl.value.trim();
    if (!text) return;

    const client  = window.SupabaseClient.client;
    const userId  = _getCurrentUserId();
    const profile = _getCachedProfile();
    const name    = profile?.display_name || 'Hermano/a';

    const { data, error } = await client.from('verse_comments').insert({
      user_id: userId,
      verse_date: dateStr,
      text,
      display_name: name
    }).select().single();

    if (!error && data) {
      inputEl.value = '';
      if (!window._verseComments) window._verseComments = [];
      window._verseComments.push(data);
      // Añadir a la lista sin re-renderizar todo
      const initial = (name).charAt(0).toUpperCase();
      const item = document.createElement('div');
      item.className = 'verse-comment-item';
      item.innerHTML = `
        <div class="verse-comment-avatar">${initial}</div>
        <div class="verse-comment-body">
          <div class="verse-comment-name">${_esc(name)}</div>
          <div class="verse-comment-text">${_esc(text)}</div>
        </div>`;
      const emptyEl = listEl.querySelector('.verse-comments-empty');
      if (emptyEl) emptyEl.remove();
      listEl.appendChild(item);
      listEl.scrollTop = listEl.scrollHeight;
      // Actualizar contador
      const el = document.getElementById('verse-comment-count');
      if (el) el.textContent = parseInt(el.textContent) + 1;
    }
  }

  // ─── Utils ─────────────────────────────────────────────────────────

  function _getCurrentUserId() {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (!keys.length) return null;
      const session = JSON.parse(localStorage.getItem(keys[0]));
      return session?.user?.id || null;
    } catch(_) { return null; }
  }

  function _getCachedProfile() {
    try { return JSON.parse(localStorage.getItem('cdc_profile') || 'null'); } catch(_) { return null; }
  }

  function _esc(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
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

  window.DailyVerseModule = { loadDailyVerse };
})();
