/**
 * admin-ubicaciones.js — Panel admin multi-sede
 * Protegido: requiere login + registro en location_admins
 */
(function AdminUbicaciones() {
  'use strict';

  let locationId   = null;
  let streamActive = false;

  async function init() {
    // 1. Esperar a que Supabase esté listo
    if (!window.SupabaseClient || !window.AuthModule) {
      setTimeout(init, 300);
      return;
    }

    // 2. Auth guard
    if (!window.AuthModule.isLoggedIn()) {
      window.location.href = 'login.html?redirect=admin-ubicaciones.html';
      return;
    }

    showLoading(true);

    try {
      // 3. Buscar la sede del admin logueado
      const userId = _getCurrentUserId();
      const { data: adminRows } = await window.SupabaseClient.client
        .from('location_admins')
        .select('location_id')
        .eq('user_id', userId)
        .limit(1);

      if (!adminRows || adminRows.length === 0) {
        showError('No tienes ninguna sede asignada. Contacta al administrador principal.');
        return;
      }

      locationId = adminRows[0].location_id;

      // 4. Cargar datos de la sede
      const { data: loc } = await window.SupabaseClient.client
        .from('locations')
        .select('*')
        .eq('id', locationId)
        .single();

      if (loc) renderPanel(loc);

      // 5. Cargar stream activo si existe
      const { data: stream } = await window.SupabaseClient.client
        .from('live_streams')
        .select('*')
        .eq('location_id', locationId)
        .eq('is_active', true)
        .limit(1);

      if (stream && stream.length > 0) {
        streamActive = true;
        const urlInput = document.getElementById('stream-url');
        if (urlInput) urlInput.value = stream[0].youtube_url || '';
        updateStreamBtn(true);
      }

    } catch(err) {
      showError('Error al cargar datos: ' + err.message);
    } finally {
      showLoading(false);
    }
  }

  function renderPanel(loc) {
    const panel = document.getElementById('admin-panel');
    if (!panel) return;

    const schedule = loc.schedule || {};
    const programs = loc.active_programs || [];

    panel.innerHTML = `
      <div class="admin-section">
        <h2 class="admin-section-title">📍 Información de la Sede</h2>
        <div class="admin-form-grid">
          <div class="admin-field">
            <label class="admin-label">Nombre de la sede</label>
            <input class="input" id="loc-name" type="text" value="${_esc(loc.name || '')}">
          </div>
          <div class="admin-field">
            <label class="admin-label">Ciudad</label>
            <input class="input" id="loc-city" type="text" value="${_esc(loc.city || '')}">
          </div>
          <div class="admin-field admin-field-full">
            <label class="admin-label">Dirección</label>
            <input class="input" id="loc-address" type="text" value="${_esc(loc.address || '')}">
          </div>
        </div>
        <button class="btn" id="btn-save-info">💾 Guardar información</button>
        <span class="admin-save-msg" id="info-msg"></span>
      </div>

      <div class="admin-section">
        <h2 class="admin-section-title">🕐 Horarios de Servicios</h2>
        <div class="admin-schedule-grid">
          ${renderScheduleRow('domingo',    'Domingo',   schedule.domingo   || '')}
          ${renderScheduleRow('lunes',      'Lunes',     schedule.lunes     || '')}
          ${renderScheduleRow('martes',     'Martes',    schedule.martes    || '')}
          ${renderScheduleRow('miercoles',  'Miércoles', schedule.miercoles || '')}
          ${renderScheduleRow('jueves',     'Jueves',    schedule.jueves    || '')}
          ${renderScheduleRow('viernes',    'Viernes',   schedule.viernes   || '')}
          ${renderScheduleRow('sabado',     'Sábado',    schedule.sabado    || '')}
        </div>
        <button class="btn" id="btn-save-schedule">💾 Guardar horarios</button>
        <span class="admin-save-msg" id="schedule-msg"></span>
      </div>

      <div class="admin-section">
        <h2 class="admin-section-title">🤝 Programas Activos</h2>
        <div class="admin-programs-grid">
          ${renderProgramCheck('reparto',  '🍞 Reparto de Alimentos', programs)}
          ${renderProgramCheck('pan',      '👧 PAN — Apadrinamiento', programs)}
          ${renderProgramCheck('radio',    '📻 Radio Solidaria',      programs)}
          ${renderProgramCheck('rastro',   '🛍️ Rastro — Tienda',     programs)}
        </div>
        <button class="btn" id="btn-save-programs">💾 Guardar programas</button>
        <span class="admin-save-msg" id="programs-msg"></span>
      </div>

      <div class="admin-section admin-section-stream">
        <h2 class="admin-section-title">🔴 Transmisión en Vivo</h2>
        <p class="admin-hint">Pega el enlace de YouTube Live cuando vayas a transmitir una oración.</p>
        <div class="admin-stream-row">
          <input class="input" id="stream-url" type="url"
                 placeholder="https://www.youtube.com/watch?v=...">
          <input class="input" id="stream-title" type="text"
                 placeholder="Título de la transmisión (opcional)">
        </div>
        <div class="admin-stream-actions">
          <button class="btn admin-btn-live" id="btn-start-stream">🔴 Iniciar transmisión</button>
          <button class="btn btn-danger" id="btn-stop-stream" style="display:none">⬛ Finalizar transmisión</button>
        </div>
        <span class="admin-save-msg" id="stream-msg"></span>
      </div>`;

    // Bind events
    document.getElementById('btn-save-info').addEventListener('click', saveInfo);
    document.getElementById('btn-save-schedule').addEventListener('click', saveSchedule);
    document.getElementById('btn-save-programs').addEventListener('click', savePrograms);
    document.getElementById('btn-start-stream').addEventListener('click', startStream);
    document.getElementById('btn-stop-stream').addEventListener('click', stopStream);
  }

  function renderScheduleRow(key, label, value) {
    return `
      <div class="admin-schedule-row">
        <label class="admin-schedule-label">${label}</label>
        <input class="input admin-schedule-input" data-day="${key}" type="text"
               placeholder="ej. 10:00 — 12:00" value="${_esc(value)}">
      </div>`;
  }

  function renderProgramCheck(key, label, activePrograms) {
    const checked = activePrograms.includes(key) ? 'checked' : '';
    return `
      <label class="admin-program-check">
        <input type="checkbox" value="${key}" ${checked}>
        <span>${label}</span>
      </label>`;
  }

  // ─── Guardar información básica ────────────────────────────────────
  async function saveInfo() {
    const name    = document.getElementById('loc-name')?.value.trim();
    const city    = document.getElementById('loc-city')?.value.trim();
    const address = document.getElementById('loc-address')?.value.trim();

    const { error } = await window.SupabaseClient.client
      .from('locations')
      .update({ name, city, address })
      .eq('id', locationId);

    showMsg('info-msg', error ? '❌ Error al guardar' : '✅ Guardado');
  }

  // ─── Guardar horarios ──────────────────────────────────────────────
  async function saveSchedule() {
    const schedule = {};
    document.querySelectorAll('.admin-schedule-input').forEach(input => {
      const val = input.value.trim();
      if (val) schedule[input.dataset.day] = val;
    });

    const { error } = await window.SupabaseClient.client
      .from('locations')
      .update({ schedule })
      .eq('id', locationId);

    showMsg('schedule-msg', error ? '❌ Error al guardar' : '✅ Horarios guardados');
  }

  // ─── Guardar programas ─────────────────────────────────────────────
  async function savePrograms() {
    const active_programs = Array.from(
      document.querySelectorAll('.admin-program-check input:checked')
    ).map(cb => cb.value);

    const { error } = await window.SupabaseClient.client
      .from('locations')
      .update({ active_programs })
      .eq('id', locationId);

    showMsg('programs-msg', error ? '❌ Error al guardar' : '✅ Programas guardados');
  }

  // ─── Stream ────────────────────────────────────────────────────────
  async function startStream() {
    const url   = document.getElementById('stream-url')?.value.trim();
    const title = document.getElementById('stream-title')?.value.trim() || 'Oración en Vivo';

    if (!url) { showMsg('stream-msg', '⚠️ Introduce la URL de YouTube'); return; }

    // Desactivar streams anteriores de esta sede
    await window.SupabaseClient.client
      .from('live_streams')
      .update({ is_active: false })
      .eq('location_id', locationId);

    // Crear nuevo stream activo
    const { error } = await window.SupabaseClient.client
      .from('live_streams')
      .insert({ location_id: locationId, youtube_url: url, title, is_active: true });

    if (!error) {
      streamActive = true;
      updateStreamBtn(true);
      showMsg('stream-msg', '🔴 Transmisión iniciada');
    } else {
      showMsg('stream-msg', '❌ Error al iniciar');
    }
  }

  async function stopStream() {
    const { error } = await window.SupabaseClient.client
      .from('live_streams')
      .update({ is_active: false })
      .eq('location_id', locationId)
      .eq('is_active', true);

    if (!error) {
      streamActive = false;
      updateStreamBtn(false);
      showMsg('stream-msg', '⬛ Transmisión finalizada');
    } else {
      showMsg('stream-msg', '❌ Error al finalizar');
    }
  }

  function updateStreamBtn(isLive) {
    const startBtn = document.getElementById('btn-start-stream');
    const stopBtn  = document.getElementById('btn-stop-stream');
    if (!startBtn || !stopBtn) return;
    startBtn.style.display = isLive ? 'none' : '';
    stopBtn.style.display  = isLive ? '' : 'none';
  }

  // ─── UI helpers ────────────────────────────────────────────────────
  function showLoading(show) {
    const loader = document.getElementById('admin-loader');
    const panel  = document.getElementById('admin-panel');
    if (loader) loader.style.display = show ? '' : 'none';
    if (panel && show) panel.style.display = 'none';
    if (panel && !show) panel.style.display = '';
  }

  function showError(msg) {
    showLoading(false);
    const errEl = document.getElementById('admin-error');
    if (errEl) {
      errEl.textContent = msg;
      errEl.style.display = '';
    }
  }

  function showMsg(id, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 3000);
  }

  // ─── Utils ─────────────────────────────────────────────────────────
  function _getCurrentUserId() {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (!keys.length) return null;
      return JSON.parse(localStorage.getItem(keys[0]))?.user?.id || null;
    } catch(_) { return null; }
  }

  function _esc(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
