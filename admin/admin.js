/**
 * admin/admin.js — Dashboard unificado para admins de sede
 * Requiere: Supabase, AuthModule
 */
(function AdminDashboard() {
  'use strict';

  let locationId   = null;
  let streamActive = false;
  const db = () => window.SupabaseClient.client;

  // ══════════════════════════════════════════════════
  // INIT
  // ══════════════════════════════════════════════════
  async function init() {
    if (!window.SupabaseClient || !window.AuthModule) {
      setTimeout(init, 200);
      return;
    }

    if (!window.AuthModule.isLoggedIn()) {
      window.location.href = '../login.html?redirect=/admin';
      return;
    }

    setupNav();
    setupLogout();

    const userId = getCurrentUserId();
    const { data: adminRows } = await db()
      .from('location_admins')
      .select('location_id')
      .eq('user_id', userId)
      .limit(1);

    hide('adm-loading');

    if (!adminRows || adminRows.length === 0) {
      // Sin sede — mostrar formulario de creación
      show('adm-no-sede');
      setupCreateSede(userId);
      return;
    }

    locationId = adminRows[0].location_id;
    loadDashboard();
  }

  async function loadDashboard() {
    const { data: loc } = await db()
      .from('locations')
      .select('*')
      .eq('id', locationId)
      .single();

    if (loc) {
      const nameEl = document.getElementById('adm-sede-name');
      if (nameEl) nameEl.textContent = loc.name || 'Mi Sede';
      populateSedeForm(loc);
    }

    show('adm-layout');
    loadProducts();
    loadDevocionales();
    loadStream();
  }

  // ══════════════════════════════════════════════════
  // CREAR PRIMERA SEDE
  // ══════════════════════════════════════════════════
  function setupCreateSede(userId) {
    const form = document.getElementById('adm-create-sede-form');
    if (!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const name    = document.getElementById('new-sede-name')?.value.trim();
      const city    = document.getElementById('new-sede-city')?.value.trim();
      const address = document.getElementById('new-sede-address')?.value.trim();
      const msgEl   = document.getElementById('create-sede-msg');

      const { data: newLoc, error: locErr } = await db()
        .from('locations')
        .insert({ name, city, address })
        .select()
        .single();

      if (locErr || !newLoc) {
        if (msgEl) msgEl.textContent = '❌ Error al crear sede: ' + (locErr?.message || '');
        return;
      }

      const { error: admErr } = await db()
        .from('location_admins')
        .insert({ user_id: userId, location_id: newLoc.id });

      if (admErr) {
        if (msgEl) msgEl.textContent = '❌ Sede creada pero error asignando admin: ' + admErr.message;
        return;
      }

      locationId = newLoc.id;
      hide('adm-no-sede');
      loadDashboard();
    });
  }

  // ══════════════════════════════════════════════════
  // NAVEGACIÓN SECCIONES
  // ══════════════════════════════════════════════════
  function setupNav() {
    document.querySelectorAll('.adm-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.adm-nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const sec = btn.dataset.section;
        document.querySelectorAll('.adm-section').forEach(s => s.style.display = 'none');
        const target = document.getElementById('sec-' + sec);
        if (target) target.style.display = '';
      });
    });
  }

  function setupLogout() {
    document.getElementById('adm-logout')?.addEventListener('click', async () => {
      await window.AuthModule.signOut?.();
      window.location.href = '../login.html';
    });
  }

  // ══════════════════════════════════════════════════
  // SECCIÓN SEDE
  // ══════════════════════════════════════════════════
  const DAYS = [
    { key: 'domingo',   label: 'Domingo'   },
    { key: 'lunes',     label: 'Lunes'     },
    { key: 'martes',    label: 'Martes'    },
    { key: 'miercoles', label: 'Miércoles' },
    { key: 'jueves',    label: 'Jueves'    },
    { key: 'viernes',   label: 'Viernes'   },
    { key: 'sabado',    label: 'Sábado'    },
  ];

  function populateSedeForm(loc) {
    setValue('sede-name',    loc.name    || '');
    setValue('sede-city',    loc.city    || '');
    setValue('sede-address', loc.address || '');
    setValue('sede-lat',     loc.lat     ?? '');
    setValue('sede-lng',     loc.lng     ?? '');

    // Horarios
    const schedGrid = document.getElementById('adm-schedule-grid');
    if (schedGrid) {
      const sched = loc.schedule || {};
      schedGrid.innerHTML = DAYS.map(d => `
        <div class="adm-schedule-row">
          <label class="adm-schedule-label">${d.label}</label>
          <input class="input adm-sched-input" data-day="${d.key}" type="text"
                 placeholder="ej. 10:00 — 12:00" value="${esc(sched[d.key] || '')}">
        </div>`).join('');
    }

    // Programas
    const progs = loc.active_programs || [];
    document.querySelectorAll('.adm-check-item input[type="checkbox"]').forEach(cb => {
      cb.checked = progs.includes(cb.value);
    });

    // Botones
    document.getElementById('btn-save-info')?.addEventListener('click', saveInfo);
    document.getElementById('btn-save-schedule')?.addEventListener('click', saveSchedule);
    document.getElementById('btn-save-programs')?.addEventListener('click', savePrograms);
  }

  async function saveInfo() {
    const payload = {
      name:    document.getElementById('sede-name')?.value.trim(),
      city:    document.getElementById('sede-city')?.value.trim(),
      address: document.getElementById('sede-address')?.value.trim(),
      lat:     parseFloat(document.getElementById('sede-lat')?.value) || null,
      lng:     parseFloat(document.getElementById('sede-lng')?.value) || null,
    };
    const { error } = await db().from('locations').update(payload).eq('id', locationId);
    showMsg('info-msg', error ? '❌ Error al guardar' : '✅ Guardado');
    if (!error && payload.name) {
      const nameEl = document.getElementById('adm-sede-name');
      if (nameEl) nameEl.textContent = payload.name;
    }
  }

  async function saveSchedule() {
    const schedule = {};
    document.querySelectorAll('.adm-sched-input').forEach(inp => {
      if (inp.value.trim()) schedule[inp.dataset.day] = inp.value.trim();
    });
    const { error } = await db().from('locations').update({ schedule }).eq('id', locationId);
    showMsg('schedule-msg', error ? '❌ Error' : '✅ Horarios guardados');
  }

  async function savePrograms() {
    const active_programs = Array.from(
      document.querySelectorAll('.adm-check-item input:checked')
    ).map(cb => cb.value);
    const { error } = await db().from('locations').update({ active_programs }).eq('id', locationId);
    showMsg('programs-msg', error ? '❌ Error' : '✅ Programas guardados');
  }

  // ══════════════════════════════════════════════════
  // SECCIÓN RASTRO
  // ══════════════════════════════════════════════════
  let editingProductId = null;
  const CATEGORY_ICONS = {
    'Muebles':'🪑','Electrodomésticos':'🔌','Ropa':'👗',
    'Libros':'📚','Decoración':'🖼️','Juguetes':'🧸','Otros':'📦'
  };

  async function loadProducts() {
    const list = document.getElementById('adm-product-list');
    if (!list) return;

    const { data: products, error } = await db()
      .from('rastro_products')
      .select('*')
      .eq('location_id', locationId)
      .order('created_at', { ascending: false });

    if (error || !products) {
      list.innerHTML = `<p class="adm-hint">Error al cargar productos.</p>`;
      return;
    }
    if (!products.length) {
      list.innerHTML = `<p class="adm-hint" style="padding:var(--sp-6);">No hay productos todavía. Añade el primero.</p>`;
      return;
    }

    list.innerHTML = '';
    products.forEach(p => {
      const row = document.createElement('div');
      row.className = 'adm-product-row' + (!p.available ? ' adm-product-sold' : '');
      row.innerHTML = `
        <div class="adm-product-img">
          ${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}">` : (CATEGORY_ICONS[p.category] || '📦')}
        </div>
        <div class="adm-product-info">
          <div class="adm-product-name">${esc(p.name)}</div>
          <div class="adm-product-meta">${esc(p.category)} · ${esc(p.condition)}</div>
        </div>
        <div class="adm-product-price">${p.price != null ? p.price.toFixed(2) + ' €' : '—'}</div>
        <div class="adm-product-actions">
          <button data-id="${p.id}" class="btn-edit-product">✏️ Editar</button>
          <button data-id="${p.id}" class="btn-delete btn-delete-product">🗑️ Borrar</button>
        </div>`;
      row.querySelector('.btn-edit-product').addEventListener('click', () => openProductModal(p));
      row.querySelector('.btn-delete-product').addEventListener('click', () => deleteProduct(p.id));
      list.appendChild(row);
    });

    // Setup botón nuevo y modal (solo una vez)
    const newBtn = document.getElementById('btn-new-product');
    if (newBtn && !newBtn._bound) {
      newBtn._bound = true;
      newBtn.addEventListener('click', () => openProductModal(null));
    }
    setupProductModal();
  }

  function openProductModal(product) {
    editingProductId = product?.id || null;
    const titleEl = document.getElementById('modal-product-title');
    if (titleEl) titleEl.textContent = product ? 'Editar Producto' : 'Nuevo Producto';

    setValue('product-id',          product?.id          || '');
    setValue('product-name',        product?.name        || '');
    setValue('product-category',    product?.category    || 'Otros');
    setValue('product-price',       product?.price       ?? '');
    setValue('product-condition',   product?.condition   || 'Buen estado');
    setValue('product-available',   product ? String(product.available) : 'true');
    setValue('product-description', product?.description || '');
    setValue('product-image',       product?.image_url   || '');

    show('product-modal');
  }

  function setupProductModal() {
    const modal = document.getElementById('product-modal');
    if (!modal || modal._bound) return;
    modal._bound = true;

    document.getElementById('btn-close-modal')?.addEventListener('click',  () => hide('product-modal'));
    document.getElementById('btn-cancel-product')?.addEventListener('click', () => hide('product-modal'));
    document.getElementById('btn-save-product')?.addEventListener('click', saveProduct);
  }

  async function saveProduct() {
    const name = document.getElementById('product-name')?.value.trim();
    if (!name) { showMsg('product-msg', '⚠️ El nombre es obligatorio'); return; }

    const payload = {
      location_id:  locationId,
      name,
      category:     document.getElementById('product-category')?.value  || 'Otros',
      price:        parseFloat(document.getElementById('product-price')?.value) || null,
      condition:    document.getElementById('product-condition')?.value  || 'Buen estado',
      available:    document.getElementById('product-available')?.value  !== 'false',
      description:  document.getElementById('product-description')?.value.trim() || null,
      image_url:    document.getElementById('product-image')?.value.trim() || null,
    };

    let error;
    if (editingProductId) {
      ({ error } = await db().from('rastro_products').update(payload).eq('id', editingProductId));
    } else {
      ({ error } = await db().from('rastro_products').insert(payload));
    }

    if (error) {
      showMsg('product-msg', '❌ Error: ' + error.message);
    } else {
      hide('product-modal');
      loadProducts();
    }
  }

  async function deleteProduct(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    const { error } = await db().from('rastro_products').delete().eq('id', id);
    if (!error) loadProducts();
  }

  // ══════════════════════════════════════════════════
  // SECCIÓN DEVOCIONALES
  // ══════════════════════════════════════════════════
  let editingDevoId = null;

  async function loadDevocionales() {
    const list = document.getElementById('adm-devo-list');
    if (!list) return;

    const { data: devos, error } = await db()
      .from('devotionals')
      .select('id, date, title')
      .order('date', { ascending: false })
      .limit(50);

    if (error) { list.innerHTML = `<p class="adm-hint">Error al cargar devocionales.</p>`; return; }
    if (!devos || !devos.length) {
      list.innerHTML = `<p class="adm-hint" style="padding:var(--sp-6);">No hay devocionales todavía.</p>`;
    } else {
      list.innerHTML = '';
      devos.forEach(d => {
        const row = document.createElement('div');
        row.className = 'adm-devo-row';
        row.innerHTML = `
          <div class="adm-devo-date">${formatDate(d.date)}</div>
          <div class="adm-devo-title">${esc(d.title)}</div>
          <div class="adm-devo-actions">
            <button data-id="${d.id}" class="btn-edit-devo">✏️ Editar</button>
            <button data-id="${d.id}" class="btn-delete btn-delete-devo">🗑️ Borrar</button>
          </div>`;
        row.querySelector('.btn-edit-devo').addEventListener('click',   () => openDevoForm(d.id));
        row.querySelector('.btn-delete-devo').addEventListener('click', () => deleteDevo(d.id));
        list.appendChild(row);
      });
    }

    const newBtn = document.getElementById('btn-new-devo');
    if (newBtn && !newBtn._bound) {
      newBtn._bound = true;
      newBtn.addEventListener('click', () => openDevoForm(null));
    }
    const saveBtn = document.getElementById('btn-save-devo');
    if (saveBtn && !saveBtn._bound) {
      saveBtn._bound = true;
      saveBtn.addEventListener('click', saveDevo);
    }
    const cancelBtn = document.getElementById('btn-cancel-devo');
    if (cancelBtn && !cancelBtn._bound) {
      cancelBtn._bound = true;
      cancelBtn.addEventListener('click', () => {
        hide('adm-devo-form-wrap');
        editingDevoId = null;
      });
    }
  }

  async function openDevoForm(id) {
    editingDevoId = id || null;
    const titleEl = document.getElementById('devo-form-title');
    if (titleEl) titleEl.textContent = id ? 'Editar Devocional' : 'Nuevo Devocional';

    if (id) {
      const { data: d } = await db().from('devotionals').select('*').eq('id', id).single();
      if (d) {
        setValue('devo-id',     d.id);
        setValue('devo-date',   d.date);
        setValue('devo-title',  d.title);
        setValue('devo-body',   d.body   || '');
        setValue('devo-prayer', d.prayer || '');
        setValue('devo-image',  d.image_url || '');
        setValue('devo-verses', d.verses ? d.verses.join(', ') : '');
      }
    } else {
      setValue('devo-id', '');
      setValue('devo-date', new Date().toISOString().split('T')[0]);
      setValue('devo-title', '');
      setValue('devo-body', '');
      setValue('devo-prayer', '');
      setValue('devo-image', '');
      setValue('devo-verses', '');
    }

    show('adm-devo-form-wrap');
    document.getElementById('adm-devo-form-wrap')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function saveDevo() {
    const date  = document.getElementById('devo-date')?.value;
    const title = document.getElementById('devo-title')?.value.trim();
    if (!date || !title) { showMsg('devo-msg', '⚠️ Fecha y título son obligatorios'); return; }

    const rawVerses = document.getElementById('devo-verses')?.value.trim();
    const verses    = rawVerses ? rawVerses.split(',').map(v => v.trim()).filter(Boolean) : null;

    const userId = getCurrentUserId();
    const payload = {
      date,
      title,
      body:       document.getElementById('devo-body')?.value.trim()   || null,
      prayer:     document.getElementById('devo-prayer')?.value.trim() || null,
      image_url:  document.getElementById('devo-image')?.value.trim()  || null,
      verses:     verses || null,
      created_by: userId,
    };

    let error;
    if (editingDevoId) {
      ({ error } = await db().from('devotionals').update(payload).eq('id', editingDevoId));
    } else {
      ({ error } = await db().from('devotionals').insert(payload));
    }

    if (error) {
      showMsg('devo-msg', '❌ ' + error.message);
    } else {
      hide('adm-devo-form-wrap');
      editingDevoId = null;
      loadDevocionales();
    }
  }

  async function deleteDevo(id) {
    if (!confirm('¿Eliminar este devocional?')) return;
    const { error } = await db().from('devotionals').delete().eq('id', id);
    if (!error) loadDevocionales();
  }

  // ══════════════════════════════════════════════════
  // SECCIÓN STREAM
  // ══════════════════════════════════════════════════
  async function loadStream() {
    const { data: stream } = await db()
      .from('live_streams')
      .select('*')
      .eq('location_id', locationId)
      .eq('is_active', true)
      .limit(1);

    if (stream && stream.length > 0) {
      streamActive = true;
      setValue('stream-url',   stream[0].youtube_url || '');
      setValue('stream-title', stream[0].title || '');
      updateStreamUI(true);
    }

    document.getElementById('btn-start-stream')?.addEventListener('click', startStream);
    document.getElementById('btn-stop-stream')?.addEventListener('click', stopStream);
  }

  async function startStream() {
    const url   = document.getElementById('stream-url')?.value.trim();
    const title = document.getElementById('stream-title')?.value.trim() || 'Oración en Vivo';
    if (!url) { showMsg('stream-msg', '⚠️ Introduce la URL de YouTube'); return; }

    await db().from('live_streams').update({ is_active: false }).eq('location_id', locationId);
    const { error } = await db().from('live_streams')
      .insert({ location_id: locationId, youtube_url: url, title, is_active: true });

    if (!error) {
      streamActive = true;
      updateStreamUI(true);
      showMsg('stream-msg', '🔴 Transmisión iniciada');
    } else {
      showMsg('stream-msg', '❌ ' + error.message);
    }
  }

  async function stopStream() {
    const { error } = await db().from('live_streams')
      .update({ is_active: false })
      .eq('location_id', locationId)
      .eq('is_active', true);

    if (!error) {
      streamActive = false;
      updateStreamUI(false);
      showMsg('stream-msg', '⬛ Transmisión finalizada');
    }
  }

  function updateStreamUI(isLive) {
    const startBtn  = document.getElementById('btn-start-stream');
    const stopBtn   = document.getElementById('btn-stop-stream');
    const statusDiv = document.getElementById('adm-stream-status');
    if (startBtn)  startBtn.style.display  = isLive ? 'none' : '';
    if (stopBtn)   stopBtn.style.display   = isLive ? '' : 'none';
    if (statusDiv) statusDiv.style.display = isLive ? 'flex' : 'none';
  }

  // ══════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════
  function getCurrentUserId() {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (!keys.length) return null;
      return JSON.parse(localStorage.getItem(keys[0]))?.user?.id || null;
    } catch(_) { return null; }
  }

  function show(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  }
  function hide(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }
  function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }
  function showMsg(id, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 3500);
  }
  function esc(str) {
    return String(str || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [y,m,d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  // Arrancar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
