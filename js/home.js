(function HomeModule() {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    setFooterYear();
    setupScrollAnimations();
  });

  function setFooterYear() {
    const el = document.getElementById('footer-year');
    if (el) el.textContent = new Date().getFullYear();
  }

  // Fade-up al entrar en viewport
  function setupScrollAnimations() {
    const items = document.querySelectorAll('.anim-fade-up, .anim-fade-left, .anim-fade-right');
    if (!items.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.animationPlayState = 'running';
        }
      });
    }, { threshold: 0.15 });

    items.forEach(el => {
      el.style.opacity = '0';
      el.style.animationPlayState = 'paused';
      observer.observe(el);
    });
  }
})();
