/**
 * bible-highlights.js — Resaltado de versículos con colores
 * - Sin login: guarda en localStorage
 * - Con login: sincroniza con Supabase
 * - Al hacer login, migra highlights locales a Supabase
 * Depende de: window.SupabaseClient, window.AuthModule
 */
(function BibleHighlightsModule() {
  'use strict';

  const COLORS = ['yellow', 'green', 'blue', 'pink', 'purple'];
  // Cache en memoria: "bookSlug-chapter-verse" → color | null
  let cache = {};
  let currentBook    = null;
  let currentChapter = null;

  function db() { return window.SupabaseClient && window.SupabaseClient.client; }

  // ─── Cargar highlights de un capítulo ─────────────────────────
  async function loadHighlightsForChapter(bookSlug, chapterNum) {
    currentBook    = bookSlug;
    currentChapter = chapterNum;
    cache = {};

    // 1. Leer desde localStorage (siempre disponible, también offline)
    const localKey  = `highlights_${bookSlug}_${chapterNum}`;
    const localData = _readLocal(localKey);
    Object.assign(cache, localData);

    // 2. Si hay sesión, sobreescribir con datos de Supabase
    if (window.AuthModule && window.AuthModule.isLoggedIn() && db()) {
      try {
        const user = window.AuthModule.currentUser();
        const { data } = await db()
          .from('verse_highlights')
          .select('verse, color')
          .eq('user_id', user.id)
          .eq('book_slug', bookSlug)
          .eq('chapter', chapterNum);
        if (data) {
          data.forEach(row => {
            cache[_key(bookSlug, chapterNum, row.verse)] = row.color;
          });
          // Sincronizar localStorage con Supabase
          const merged = {};
          data.forEach(r => { merged[r.verse] = r.color; });
          _writeLocal(localKey, merged);
        }
      } catch (_) { /* sin conexión, usamos localStorage */ }
    }
  }

  // ─── Obtener color de un versículo ────────────────────────────
  function getHighlight(bookSlug, chapterNum, verseNum) {
    return cache[_key(bookSlug, chapterNum, verseNum)] || null;
  }

  // ─── Guardar highlight ────────────────────────────────────────
  async function setHighlight(bookSlug, chapterNum, verseNum, color) {
    const k = _key(bookSlug, chapterNum, verseNum);
    cache[k] = color;

    // Persistir en localStorage
    const localKey  = `highlights_${bookSlug}_${chapterNum}`;
    const localData = _readLocal(localKey);
    localData[verseNum] = color;
    _writeLocal(localKey, localData);

    // Persistir en Supabase si hay sesión
    if (window.AuthModule && window.AuthModule.isLoggedIn() && db()) {
      try {
        const user = window.AuthModule.currentUser();
        await db().from('verse_highlights').upsert({
          user_id:  user.id,
          book_slug: bookSlug,
          chapter:  chapterNum,
          verse:    verseNum,
          color,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,book_slug,chapter,verse' });
      } catch (_) { /* guardar solo local si falla red */ }
    }
  }

  // ─── Eliminar highlight ───────────────────────────────────────
  async function removeHighlight(bookSlug, chapterNum, verseNum) {
    const k = _key(bookSlug, chapterNum, verseNum);
    delete cache[k];

    const localKey  = `highlights_${bookSlug}_${chapterNum}`;
    const localData = _readLocal(localKey);
    delete localData[verseNum];
    _writeLocal(localKey, localData);

    if (window.AuthModule && window.AuthModule.isLoggedIn() && db()) {
      try {
        const user = window.AuthModule.currentUser();
        await db().from('verse_highlights').delete()
          .eq('user_id', user.id)
          .eq('book_slug', bookSlug)
          .eq('chapter', chapterNum)
          .eq('verse', verseNum);
      } catch (_) {}
    }
  }

  // ─── Migrar highlights locales a Supabase al hacer login ──────
  async function migrateLocalToSupabase() {
    if (!window.AuthModule || !window.AuthModule.isLoggedIn() || !db()) return;
    const user = window.AuthModule.currentUser();
    const rows = [];

    // Buscar todas las claves de highlights en localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('highlights_')) continue;
      const parts = key.split('_');
      if (parts.length < 3) continue;
      const bookSlug  = parts.slice(1, -1).join('_');
      const chapterNum = parseInt(parts[parts.length - 1]);
      if (isNaN(chapterNum)) continue;
      const localData = _readLocal(key);
      Object.entries(localData).forEach(([verse, color]) => {
        rows.push({ user_id: user.id, book_slug: bookSlug, chapter: chapterNum, verse: parseInt(verse), color });
      });
    }

    if (rows.length > 0) {
      try {
        await db().from('verse_highlights').upsert(rows, { onConflict: 'user_id,book_slug,chapter,verse' });
      } catch (_) {}
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────
  function _key(book, chapter, verse) { return `${book}-${chapter}-${verse}`; }

  function _readLocal(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch (_) { return {}; }
  }

  function _writeLocal(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); }
    catch (_) {}
  }

  // Migrar al cargar si hay sesión
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.AuthModule && window.AuthModule.isLoggedIn()) migrateLocalToSupabase();
    });
  } else {
    if (window.AuthModule && window.AuthModule.isLoggedIn()) migrateLocalToSupabase();
  }

  window.BibleHighlights = {
    COLORS,
    loadHighlightsForChapter,
    getHighlight,
    setHighlight,
    removeHighlight,
    migrateLocalToSupabase
  };

})();
