/**
 * bottom-nav.js — Barra de navegación inferior estilo app móvil
 * Inyecta la barra en el DOM con iconos SVG outline
 * Depende de: window.AuthModule (opcional, para el ítem Perfil)
 */
(function BottomNav() {
  'use strict';

  // SVG icons (outline style — stroke, no fill)
  const ICONS = {
    inicio: `<svg class="bnav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12L12 3l9 9"/>
      <path d="M9 21V12h6v9"/>
      <path d="M3 12v9h18V12"/>
    </svg>`,

    biblia: `<svg class="bnav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      <line x1="12" y1="6" x2="12" y2="12"/>
      <line x1="9" y1="9" x2="15" y2="9"/>
    </svg>`,

    devocional: `<svg class="bnav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2C8 2 4.5 5 4.5 9c0 2 .8 3.7 2 5l5.5 7 5.5-7c1.2-1.3 2-3 2-5 0-4-3.5-7-7.5-7z"/>
      <circle cx="12" cy="9" r="2"/>
    </svg>`,

    radio: `<svg class="bnav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="10" width="20" height="12" rx="2"/>
      <path d="M6 10V8a6 6 0 0 1 12 0v2"/>
      <circle cx="12" cy="16" r="2"/>
      <line x1="18" y1="13" x2="18" y2="19"/>
    </svg>`,

    perfil: `<svg class="bnav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>`
  };

  function inject() {
    if (document.getElementById('bottom-nav')) return; // ya inyectado

    const nav = document.createElement('nav');
    nav.id = 'bottom-nav';
    nav.className = 'bottom-nav';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Navegación principal');

    // Determinar la página actual
    const path = location.pathname;
    const page = _currentPage(path);

    // Construir el href del Perfil según sesión
    const perfilHref = (window.AuthModule && window.AuthModule.isLoggedIn())
      ? 'perfil.html'
      : 'login.html';

    // Calcular href relativo (las páginas en /programas/ necesitan ../prefix)
    const isSubdir = path.includes('/programas/');
    const prefix = isSubdir ? '../' : '';

    nav.innerHTML = `
      <a href="${prefix}index.html"      class="bnav-item${page === 'index'     ? ' active' : ''}" aria-label="Inicio"     data-page="index">
        ${ICONS.inicio}
        <span class="bnav-label">Inicio</span>
      </a>
      <a href="${prefix}biblia.html"     class="bnav-item${page === 'biblia'    ? ' active' : ''}" aria-label="Biblia"     data-page="biblia">
        ${ICONS.biblia}
        <span class="bnav-label">Biblia</span>
      </a>
      <a href="${prefix}devocional.html" class="bnav-item${page === 'devocional'? ' active' : ''}" aria-label="Devocional" data-page="devocional">
        ${ICONS.devocional}
        <span class="bnav-label">Devocional</span>
      </a>
      <button class="bnav-item" id="bnav-radio" aria-label="Radio">
        ${ICONS.radio}
        <span class="bnav-radio-dot" id="bnav-radio-dot"></span>
        <span class="bnav-label">Radio</span>
      </button>
      <a href="${prefix}${perfilHref}"   class="bnav-item${page === 'perfil'    ? ' active' : ''}" aria-label="Perfil"     data-page="perfil" id="bnav-perfil">
        ${ICONS.perfil}
        <span class="bnav-label">Perfil</span>
      </a>`;

    document.body.appendChild(nav);

    // Botón Radio → abre el mini-reproductor existente
    document.getElementById('bnav-radio').addEventListener('click', () => {
      const rmpBtn = document.getElementById('rmp-btn');
      if (rmpBtn) {
        rmpBtn.click();
      } else {
        // Fallback: ir a la página de radio solidaria
        window.location.href = `${prefix}programas/radio-solidaria.html`;
      }
    });

    // Actualizar estado radio dot si el reproductor existe
    _watchRadioState();

    // Actualizar perfil href si cambia auth
    if (window.AuthModule && window.SupabaseClient && window.SupabaseClient.client) {
      window.AuthModule.onAuthStateChange(() => _updatePerfilLink(prefix));
    }
  }

  function _currentPage(path) {
    if (path.includes('biblia'))      return 'biblia';
    if (path.includes('devocional'))  return 'devocional';
    if (path.includes('perfil') || path.includes('login')) return 'perfil';
    if (path.endsWith('/') || path.includes('index') || path === '') return 'index';
    return '';
  }

  function _updatePerfilLink(prefix) {
    const el = document.getElementById('bnav-perfil');
    if (!el) return;
    const href = (window.AuthModule && window.AuthModule.isLoggedIn())
      ? `${prefix}perfil.html`
      : `${prefix}login.html`;
    el.href = href;
  }

  function _watchRadioState() {
    // Observar el dot del mini reproductor para sincronizar estado
    const dot = document.getElementById('bnav-radio-dot');
    if (!dot) return;
    const observer = new MutationObserver(() => {
      const rmpDot = document.querySelector('.rmp-dot');
      if (!rmpDot) return;
      dot.classList.toggle('live', rmpDot.classList.contains('live'));
    });
    // Intentar observar periódicamente (el rmp puede inyectarse después)
    const interval = setInterval(() => {
      const rmpDot = document.querySelector('.rmp-dot');
      if (rmpDot) {
        observer.observe(rmpDot, { attributes: true });
        clearInterval(interval);
      }
    }, 500);
  }

  // Arrancar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

})();
