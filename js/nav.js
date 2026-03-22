(function NavModule() {
  'use strict';

  function init() {
    setupScrollEffect();
    setupDropdown();
    setupHamburger();
    markActiveLink();
  }

  function setupScrollEffect() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  function setupDropdown() {
    const dropdown = document.querySelector('.nav-dropdown');
    if (!dropdown) return;
    const toggle = dropdown.querySelector('.nav-dropdown-toggle');

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    document.addEventListener('click', () => {
      dropdown.classList.remove('open');
    });

    dropdown.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') dropdown.classList.remove('open');
    });
  }

  function setupHamburger() {
    const btn     = document.querySelector('.nav-hamburger');
    const mobile  = document.querySelector('.nav-mobile');
    if (!btn || !mobile) return;

    btn.addEventListener('click', () => {
      const isOpen = mobile.classList.toggle('open');
      btn.classList.toggle('open', isOpen);
      btn.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Cerrar al hacer click en un link
    mobile.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobile.classList.remove('open');
        btn.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  function markActiveLink() {
    const path = window.location.pathname.replace(/\/$/, '');
    document.querySelectorAll('[data-nav-href]').forEach(el => {
      const href = el.getAttribute('data-nav-href').replace(/\/$/, '');
      if (path.endsWith(href) || (href === '/index.html' && (path === '' || path.endsWith('/')))) {
        el.classList.add('active');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
