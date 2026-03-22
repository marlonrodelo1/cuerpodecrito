/**
 * profile.js — Página de perfil de usuario
 * Carga datos de Supabase, permite editar nombre y foto, muestra guardados
 * Depende de: window.SupabaseClient, window.AuthModule
 */
(function ProfileModule() {
  'use strict';

  function db() { return window.SupabaseClient && window.SupabaseClient.client; }

  // ─── Guardar / eliminar devocional ───────────────────────────
  async function saveDevotional(entry) {
    if (!window.AuthModule || !window.AuthModule.isLoggedIn() || !db()) return false;
    const user = window.AuthModule.currentUser();
    const { error } = await db().from('saved_devotionals').upsert({
      user_id:        user.id,
      devotional_id:  entry.id,
      devotional_date: entry.date || null,
      title:          entry.title
    }, { onConflict: 'user_id,devotional_id' });
    return !error;
  }

  async function unsaveDevotional(devotionalId) {
    if (!window.AuthModule || !window.AuthModule.isLoggedIn() || !db()) return;
    const user = window.AuthModule.currentUser();
    await db().from('saved_devotionals').delete()
      .eq('user_id', user.id)
      .eq('devotional_id', devotionalId);
  }

  async function isDevotionalSaved(devotionalId) {
    if (!window.AuthModule || !window.AuthModule.isLoggedIn() || !db()) return false;
    const user = window.AuthModule.currentUser();
    const { data } = await db().from('saved_devotionals')
      .select('id').eq('user_id', user.id).eq('devotional_id', devotionalId).single();
    return !!data;
  }

  // ─── Guardar versículo ────────────────────────────────────────
  async function saveVerse(bookSlug, chapter, verse, text, ref) {
    if (!window.AuthModule || !window.AuthModule.isLoggedIn() || !db()) return false;
    const user = window.AuthModule.currentUser();
    const { error } = await db().from('saved_verses').upsert({
      user_id: user.id, book_slug: bookSlug, chapter, verse, verse_text: text, verse_ref: ref
    }, { onConflict: 'user_id,book_slug,chapter,verse' });
    return !error;
  }

  // ─── Inicializar página de perfil ─────────────────────────────
  async function initProfilePage() {
    if (!document.getElementById('profile-page')) return;

    // Guard: redirigir si no hay sesión
    if (!window.AuthModule || !window.AuthModule.isLoggedIn()) {
      window.location.href = 'login.html?redirect=perfil.html';
      return;
    }

    const user = window.AuthModule.currentUser();

    // Cargar perfil
    let profile = null;
    try {
      profile = await window.AuthModule.getProfile();
      if (profile) localStorage.setItem('cdc_profile', JSON.stringify(profile));
    } catch (_) {
      profile = JSON.parse(localStorage.getItem('cdc_profile') || 'null');
    }

    // Renderizar datos del usuario
    _renderUserHeader(user, profile);

    // Cargar guardados en paralelo
    _loadSavedDevotionals();
    _loadSavedVerses();

    // Eventos
    _setupEvents(user, profile);
  }

  function _renderUserHeader(user, profile) {
    const nameEl   = document.getElementById('profile-name');
    const emailEl  = document.getElementById('profile-email');
    const avatarEl = document.getElementById('profile-avatar');
    const inputName = document.getElementById('profile-name-input');

    const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Usuario';
    const avatarUrl   = profile?.avatar_url || null;

    if (nameEl)    nameEl.textContent  = displayName;
    if (emailEl)   emailEl.textContent = user?.email || '';
    if (inputName) inputName.value     = displayName;

    if (avatarEl) {
      if (avatarUrl) {
        avatarEl.innerHTML = `<img src="${avatarUrl}" alt="Foto de perfil" class="profile-img">`;
      } else {
        avatarEl.textContent = displayName.charAt(0).toUpperCase();
      }
    }
  }

  async function _loadSavedDevotionals() {
    const list = document.getElementById('saved-devotionals-list');
    if (!list || !db()) return;
    const user = window.AuthModule.currentUser();
    list.innerHTML = '<p class="profile-loading">Cargando…</p>';
    try {
      const { data } = await db().from('saved_devotionals')
        .select('*').eq('user_id', user.id).order('saved_at', { ascending: false });
      if (!data || data.length === 0) {
        list.innerHTML = '<p class="profile-empty">No tienes devocionales guardados aún.</p>';
        return;
      }
      list.innerHTML = data.map(d => `
        <div class="profile-saved-item" data-id="${d.devotional_id}">
          <div class="profile-saved-info">
            <span class="profile-saved-icon">🕊️</span>
            <div>
              <p class="profile-saved-title">${d.title || 'Devocional'}</p>
              <p class="profile-saved-date">${d.devotional_date ? new Date(d.devotional_date + 'T00:00:00').toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' }) : ''}</p>
            </div>
          </div>
          <div class="profile-saved-actions">
            <a href="devocional.html" class="btn btn-sm btn-outline">Ver</a>
            <button class="btn btn-sm btn-danger-outline btn-unsave-devo" data-id="${d.devotional_id}" aria-label="Eliminar">🗑️</button>
          </div>
        </div>`).join('');
      // Handlers eliminar
      list.querySelectorAll('.btn-unsave-devo').forEach(btn => {
        btn.addEventListener('click', async () => {
          await unsaveDevotional(btn.dataset.id);
          btn.closest('.profile-saved-item').remove();
          if (!list.querySelector('.profile-saved-item')) {
            list.innerHTML = '<p class="profile-empty">No tienes devocionales guardados aún.</p>';
          }
        });
      });
    } catch (_) {
      list.innerHTML = '<p class="profile-empty">Error al cargar. Verifica tu conexión.</p>';
    }
  }

  async function _loadSavedVerses() {
    const list = document.getElementById('saved-verses-list');
    if (!list || !db()) return;
    const user = window.AuthModule.currentUser();
    list.innerHTML = '<p class="profile-loading">Cargando…</p>';
    try {
      const { data } = await db().from('saved_verses')
        .select('*').eq('user_id', user.id).order('saved_at', { ascending: false });
      if (!data || data.length === 0) {
        list.innerHTML = '<p class="profile-empty">No tienes versículos guardados aún.</p>';
        return;
      }
      list.innerHTML = data.map(v => `
        <div class="profile-saved-item" data-key="${v.book_slug}-${v.chapter}-${v.verse}">
          <div class="profile-saved-info">
            <span class="profile-saved-icon">📖</span>
            <div>
              <p class="profile-saved-title">${v.verse_ref || `${v.book_slug} ${v.chapter}:${v.verse}`}</p>
              <p class="profile-saved-verse-text">${v.verse_text ? '"' + v.verse_text.substring(0, 80) + (v.verse_text.length > 80 ? '…' : '') + '"' : ''}</p>
            </div>
          </div>
          <div class="profile-saved-actions">
            <a href="biblia.html#${v.book_slug}-${v.chapter}-${v.verse}" class="btn btn-sm btn-outline">Ir</a>
            <button class="btn btn-sm btn-danger-outline btn-unsave-verse"
              data-book="${v.book_slug}" data-ch="${v.chapter}" data-vs="${v.verse}" aria-label="Eliminar">🗑️</button>
          </div>
        </div>`).join('');
      // Handlers eliminar
      list.querySelectorAll('.btn-unsave-verse').forEach(btn => {
        btn.addEventListener('click', async () => {
          const user2 = window.AuthModule.currentUser();
          await db().from('saved_verses').delete()
            .eq('user_id', user2.id)
            .eq('book_slug', btn.dataset.book)
            .eq('chapter', parseInt(btn.dataset.ch))
            .eq('verse', parseInt(btn.dataset.vs));
          btn.closest('.profile-saved-item').remove();
          if (!list.querySelector('.profile-saved-item')) {
            list.innerHTML = '<p class="profile-empty">No tienes versículos guardados aún.</p>';
          }
        });
      });
    } catch (_) {
      list.innerHTML = '<p class="profile-empty">Error al cargar. Verifica tu conexión.</p>';
    }
  }

  function _setupEvents(user, profile) {
    // Editar nombre
    const btnEditName = document.getElementById('btn-edit-name');
    const nameEl      = document.getElementById('profile-name');
    const nameInput   = document.getElementById('profile-name-input');
    const btnSaveName = document.getElementById('btn-save-name');

    if (btnEditName) {
      btnEditName.addEventListener('click', () => {
        nameEl.style.display    = 'none';
        btnEditName.style.display = 'none';
        nameInput.style.display = '';
        btnSaveName.style.display = '';
        nameInput.focus();
      });
    }

    if (btnSaveName) {
      btnSaveName.addEventListener('click', async () => {
        const newName = nameInput.value.trim();
        if (!newName) return;
        try {
          await window.AuthModule.updateProfile({ display_name: newName });
          nameEl.textContent = newName;
          nameEl.style.display = '';
          btnEditName.style.display = '';
          nameInput.style.display = 'none';
          btnSaveName.style.display = 'none';
          // Actualizar cache
          const cached = JSON.parse(localStorage.getItem('cdc_profile') || '{}');
          cached.display_name = newName;
          localStorage.setItem('cdc_profile', JSON.stringify(cached));
        } catch (_) { alert('Error al guardar el nombre'); }
      });
    }

    // Subir foto
    const avatarInput = document.getElementById('avatar-input');
    if (avatarInput) {
      avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const btn = document.getElementById('btn-upload-avatar');
        if (btn) { btn.disabled = true; btn.textContent = 'Subiendo…'; }
        try {
          const url = await window.AuthModule.uploadAvatar(file);
          const avatarEl = document.getElementById('profile-avatar');
          if (avatarEl) avatarEl.innerHTML = `<img src="${url}?t=${Date.now()}" alt="Foto de perfil" class="profile-img">`;
          const cached = JSON.parse(localStorage.getItem('cdc_profile') || '{}');
          cached.avatar_url = url;
          localStorage.setItem('cdc_profile', JSON.stringify(cached));
        } catch (err) {
          alert('Error al subir la imagen: ' + (err.message || err));
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = 'Cambiar foto'; }
        }
      });
    }

    // Cerrar sesión
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        await window.AuthModule.signOut();
        window.location.href = 'index.html';
      });
    }
  }

  // Arrancar al cargar la página
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfilePage);
  } else {
    initProfilePage();
  }

  window.ProfileModule = {
    saveDevotional,
    unsaveDevotional,
    isDevotionalSaved,
    saveVerse
  };

})();
