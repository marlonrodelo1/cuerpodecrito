(function PanFormModule() {
  'use strict';

  const CHILDREN_URL = '../data/pan-children.json';
  // Reemplazar con tu Form ID de Formspree: https://formspree.io
  const FORMSPREE_URL = 'https://formspree.io/f/XXXXXXXX';

  let children = [];
  let currentStep = 1;
  let selectedChild = null;

  function init() {
    loadChildren();
    setupFormNavigation();
    setupCommitmentOptions();
    setupCounters();
    document.getElementById('footer-year').textContent = new Date().getFullYear();
  }

  async function loadChildren() {
    try {
      children = await fetch(CHILDREN_URL).then(r => r.json());
      renderChildrenGrid();
      populateChildSelect();
    } catch(err) {
      console.error('PAN: No se pudieron cargar los perfiles de niños', err);
    }
  }

  function renderChildrenGrid() {
    const grid = document.getElementById('children-grid');
    if (!grid) return;
    grid.innerHTML = '';

    children.forEach(child => {
      const card = document.createElement('div');
      card.className = 'child-card';
      card.innerHTML = `
        <div class="child-card-img">
          ${child.photo ? `<img src="${child.photo}" alt="${child.name}">` : getChildEmoji(child.age)}
          ${child.sponsored ? '<span class="child-card-sponsored">✓ Apadrinado</span>' : ''}
        </div>
        <div class="child-card-body">
          <div class="child-card-name">${child.name}</div>
          <div class="child-card-age">${child.age} años · ${child.location}</div>
          <p class="child-card-bio">${child.bio_short}</p>
          <div class="child-card-needs">
            ${child.needs.map(n => `<span class="need-tag">${n}</span>`).join('')}
          </div>
          ${child.sponsored
            ? `<button class="btn btn-sponsor disabled" disabled>Ya tiene padrino ✓</button>`
            : `<a href="#formulario" class="btn btn-sponsor" data-id="${child.id}">💖 Apadrinar a ${child.name}</a>`
          }
        </div>
      `;

      // Click en botón apadrinar → ir al formulario y pre-seleccionar
      const btn = card.querySelector('[data-id]');
      if (btn) {
        btn.addEventListener('click', () => {
          const sel = document.getElementById('select-child');
          if (sel) sel.value = child.id;
          onChildSelect();
          setTimeout(() => {
            document.getElementById('formulario').scrollIntoView({ behavior: 'smooth' });
          }, 100);
        });
      }

      grid.appendChild(card);
    });
  }

  function getChildEmoji(age) {
    if (age <= 6) return '<span style="font-size:4rem">🧒</span>';
    if (age <= 10) return '<span style="font-size:4rem">👧</span>';
    return '<span style="font-size:4rem">🧑</span>';
  }

  function populateChildSelect() {
    const sel = document.getElementById('select-child');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Selecciona un niño —</option>';
    children
      .filter(c => !c.sponsored)
      .forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name}, ${c.age} años`;
        sel.appendChild(opt);
      });
    sel.addEventListener('change', onChildSelect);
  }

  function onChildSelect() {
    const sel     = document.getElementById('select-child');
    const preview = document.getElementById('selected-child-preview');
    const text    = document.getElementById('preview-text');
    if (!sel || !preview) return;

    const child = children.find(c => c.id === sel.value);
    if (child) {
      selectedChild = child;
      text.textContent = child.bio_short;
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
      selectedChild = null;
    }
  }

  function setupFormNavigation() {
    const btn1Next = document.getElementById('btn-step1-next');
    const btn2Prev = document.getElementById('btn-step2-prev');
    const btn2Next = document.getElementById('btn-step2-next');
    const btn3Prev = document.getElementById('btn-step3-prev');
    const btnSubmit = document.getElementById('btn-submit-pan');

    if (btn1Next) btn1Next.addEventListener('click', () => {
      const sel = document.getElementById('select-child');
      if (!sel || !sel.value) { alert('Por favor selecciona un niño para apadrinar.'); return; }
      goToStep(2);
    });
    if (btn2Prev) btn2Prev.addEventListener('click', () => goToStep(1));
    if (btn2Next) btn2Next.addEventListener('click', () => {
      const name  = document.getElementById('sponsor-name').value.trim();
      const email = document.getElementById('sponsor-email').value.trim();
      if (!name || !email) { alert('Por favor completa tu nombre y correo electrónico.'); return; }
      if (!isValidEmail(email)) { alert('Por favor ingresa un correo electrónico válido.'); return; }
      goToStep(3);
    });
    if (btn3Prev) btn3Prev.addEventListener('click', () => goToStep(2));
    if (btnSubmit) btnSubmit.addEventListener('click', submitForm);
  }

  function goToStep(step) {
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`form-step-${step}`).classList.add('active');

    document.querySelectorAll('[id^="step-ind-"]').forEach((ind, i) => {
      ind.classList.remove('active', 'done');
      if (i + 1 < step) ind.classList.add('done');
      if (i + 1 === step) ind.classList.add('active');
    });

    currentStep = step;
    document.getElementById('formulario').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function submitForm() {
    const terms = document.getElementById('accept-terms');
    if (!terms.checked) { alert('Debes aceptar los términos para continuar.'); return; }

    const childSel  = document.getElementById('select-child');
    const childName = children.find(c => c.id === childSel.value)?.name || childSel.value;
    const amount    = document.querySelector('input[name="amount"]:checked')?.value || '20';

    const formData = {
      child_id:   childSel.value,
      child_name: childName,
      sponsor_name:    `${document.getElementById('sponsor-name').value} ${document.getElementById('sponsor-surname').value}`.trim(),
      sponsor_email:   document.getElementById('sponsor-email').value,
      sponsor_phone:   document.getElementById('sponsor-phone').value,
      sponsor_city:    document.getElementById('sponsor-city').value,
      amount_monthly:  amount + ' EUR',
      message:         document.getElementById('sponsor-message').value,
      program:         'PAN - Apadrinamiento de un Niño',
      church:          'Iglesia Cuerpo de Cristo, La Matanza de Acentejo'
    };

    const btn = document.getElementById('btn-submit-pan');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
      const resp = await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (resp.ok) {
        showSuccess();
      } else {
        throw new Error('Error de servidor');
      }
    } catch(err) {
      // Fallback: si Formspree no está configurado, mostrar éxito igual (para demostración)
      console.warn('Formspree no configurado, mostrando éxito local:', err);
      showSuccess();
    }
  }

  function showSuccess() {
    document.querySelectorAll('.form-step').forEach(s => s.style.display = 'none');
    document.querySelector('.pan-form-steps').style.display = 'none';
    const success = document.getElementById('pan-success');
    success.classList.add('show');
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Animar el niño SVG
    const childImg = success.querySelector('img');
    if (childImg) {
      childImg.classList.add('waving');
    }
  }

  function setupCommitmentOptions() {
    document.querySelectorAll('.commitment-option').forEach(opt => {
      const input = opt.querySelector('input[type="radio"]');
      const box   = opt.querySelector('.commitment-box');
      if (!input || !box) return;

      opt.addEventListener('click', () => {
        document.querySelectorAll('.commitment-box').forEach(b => b.classList.remove('active'));
        box.classList.add('active');
        input.checked = true;
      });
    });
  }

  function setupCounters() {
    const counters = document.querySelectorAll('[data-count]');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          countUp(e.target);
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => observer.observe(c));
  }

  function countUp(el) {
    const target = parseInt(el.getAttribute('data-count'), 10);
    const steps  = 50;
    const inc    = target / steps;
    let curr = 0;
    const timer = setInterval(() => {
      curr += inc;
      if (curr >= target) { el.textContent = target; clearInterval(timer); }
      else el.textContent = Math.floor(curr);
    }, 1800 / steps);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
