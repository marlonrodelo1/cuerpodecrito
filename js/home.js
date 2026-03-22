(function HomeModule() {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    setFooterYear();
    animateCounters();
    setupScrollAnimations();
  });

  function setFooterYear() {
    const el = document.getElementById('footer-year');
    if (el) el.textContent = new Date().getFullYear();
  }

  // Contadores animados en las estadísticas
  function animateCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          countUp(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
  }

  function countUp(el) {
    const target   = parseInt(el.getAttribute('data-count'), 10);
    const duration = 1800;
    const steps    = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        el.textContent = target;
        clearInterval(timer);
      } else {
        el.textContent = Math.floor(current);
      }
    }, duration / steps);
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
