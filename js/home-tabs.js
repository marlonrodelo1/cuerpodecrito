/**
 * home-tabs.js — Gestiona tabs Hoy / Comunidad en la homepage
 * Saludo personalizado + dot de oración en vivo
 */
(function HomeTabs() {
  'use strict';

  let chatInitialized = false;

  function init() {
    setupGreeting();
    setupTabs();
    checkLiveStream();
  }

  // ─── Saludo ──────────────────────────────────────────────────────
  function setupGreeting() {
    const greetingEl = document.getElementById('home-greeting');
    const textEl     = document.getElementById('greeting-text');
    const nameEl     = document.getElementById('greeting-name');
    if (!greetingEl || !textEl) return;

    const hour = new Date().getHours();
    let greeting;
    if (hour >= 6 && hour < 12)       greeting = 'Buenos días';
    else if (hour >= 12 && hour < 20)  greeting = 'Buenas tardes';
    else                               greeting = 'Buenas noches';

    textEl.textContent = greeting;

    // Nombre si está logueado
    if (nameEl && window.AuthModule && window.AuthModule.isLoggedIn()) {
      const profile = _getCachedProfile();
      if (profile?.display_name) {
        nameEl.textContent = ', ' + profile.display_name.split(' ')[0];
      }
    }

    greetingEl.style.display = '';
  }

  // ─── Tabs ────────────────────────────────────────────────────────
  function setupTabs() {
    const tabs = document.querySelectorAll('.home-tab[data-tab]');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
  }

  function switchTab(tabName) {
    // Actualizar botones
    document.querySelectorAll('.home-tab[data-tab]').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });

    const hoy       = document.getElementById('main-hoy');
    const comunidad = document.getElementById('main-comunidad');

    if (tabName === 'hoy') {
      if (hoy)       hoy.style.display = '';
      if (comunidad) comunidad.style.display = 'none';
      // Destruir chat para liberar suscripción
      if (chatInitialized && window.CommunityChat) {
        window.CommunityChat.destroy();
        chatInitialized = false;
      }
    } else if (tabName === 'comunidad') {
      if (hoy)       hoy.style.display = 'none';
      if (comunidad) comunidad.style.display = '';
      // Inicializar chat solo la primera vez o si se destruyó
      if (!chatInitialized && window.CommunityChat) {
        window.CommunityChat.init();
        chatInitialized = true;
      }
    }
  }

  // ─── Dot de Oración en Vivo ──────────────────────────────────────
  async function checkLiveStream() {
    if (!window.SupabaseClient) return;
    try {
      const { data } = await window.SupabaseClient.client
        .from('live_streams')
        .select('id')
        .eq('is_active', true)
        .limit(1);

      if (data && data.length > 0) {
        const dot = document.getElementById('tab-live-dot');
        if (dot) dot.classList.add('live');
      }
    } catch(_) { /* silencioso */ }
  }

  // ─── Utils ──────────────────────────────────────────────────────
  function _getCachedProfile() {
    try { return JSON.parse(localStorage.getItem('cdc_profile') || 'null'); } catch(_) { return null; }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
