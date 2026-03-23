/**
 * auth-nav.js — Inyecta botón de login/perfil en la navegación
 * Sigue el mismo patrón que radio-mini.js
 * Depende de: window.AuthModule, window.SupabaseClient
 */
(function AuthNav() {
  'use strict';

  function inject() {
    renderNav();
    // Escuchar cambios de sesión para actualizar el nav
    if (window.AuthModule && window.SupabaseClient && window.SupabaseClient.client) {
      window.AuthModule.onAuthStateChange(() => renderNav());
    }
  }

  function renderNav() {
    const loggedIn = window.AuthModule && window.AuthModule.isLoggedIn();

    // Limpiar inyecciones previas
    document.querySelectorAll('.nav-auth-wrap, .nav-mobile-auth').forEach(el => el.remove());

    // El botón de perfil/entrar lo gestiona la barra inferior (bottom-nav.js)
    // Solo inyectamos en el menú móvil hamburguesa para acceso rápido

    // ─── Menú móvil ──────────────────────────────────────────────
    const navMobile = document.querySelector('.nav-mobile');
    if (navMobile) {
      const mobileWrap = document.createElement('div');
      mobileWrap.className = 'nav-mobile-auth';

      if (loggedIn) {
        mobileWrap.innerHTML = `
          <a href="perfil.html" class="nav-mobile-link nav-mobile-profile">👤 Mi Perfil</a>
          <button class="nav-mobile-link nav-mobile-logout" id="nav-logout-btn">🚪 Cerrar sesión</button>`;
      } else {
        mobileWrap.innerHTML = `
          <a href="login.html" class="nav-mobile-link nav-mobile-login">👤 Iniciar sesión</a>`;
      }

      // Insertar antes de nav-mobile-radio (si existe) o al final
      const mobileRadio = navMobile.querySelector('.nav-mobile-radio');
      if (mobileRadio) {
        navMobile.insertBefore(mobileWrap, mobileRadio);
      } else {
        navMobile.appendChild(mobileWrap);
      }

      // Logout handler
      const logoutBtn = mobileWrap.querySelector('#nav-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          await window.AuthModule.signOut();
          window.location.href = 'index.html';
        });
      }
    }
  }

  function _getInitial(user) {
    if (!user) return '?';
    const profile = _getCachedProfile();
    const name = profile?.display_name || user.email || '?';
    return name.charAt(0).toUpperCase();
  }

  function _getAvatar() {
    const profile = _getCachedProfile();
    return profile?.avatar_url || null;
  }

  function _getCachedProfile() {
    try {
      return JSON.parse(localStorage.getItem('cdc_profile') || 'null');
    } catch (_) { return null; }
  }

  // Arrancar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

})();
