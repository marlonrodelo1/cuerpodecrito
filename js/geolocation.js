/**
 * geolocation.js — Muestra las 2 sedes más cercanas al usuario
 * Requiere: SupabaseClient, sección #sedes-cercanas en el HTML
 */
(function GeoLocation() {
  'use strict';

  function init() {
    if (!window.SupabaseClient) {
      setTimeout(init, 200);
      return;
    }
    if (!navigator.geolocation) return; // navegador no soporta
    navigator.geolocation.getCurrentPosition(onPosition, onError, { timeout: 8000 });
  }

  async function onPosition(pos) {
    const userLat = pos.coords.latitude;
    const userLng = pos.coords.longitude;

    const { data: locs } = await window.SupabaseClient.client
      .from('locations')
      .select('id, name, city, address, lat, lng')
      .not('lat', 'is', null)
      .not('lng', 'is', null);

    if (!locs || !locs.length) return;

    // Calcular distancia Haversine a cada sede
    const withDist = locs.map(loc => ({
      ...loc,
      dist: haversine(userLat, userLng, loc.lat, loc.lng)
    })).sort((a, b) => a.dist - b.dist).slice(0, 2);

    renderSedes(withDist);
  }

  function onError() {
    // El usuario denegó o falló — no mostrar la sección
  }

  function renderSedes(sedes) {
    const section = document.getElementById('sedes-cercanas');
    const grid    = document.getElementById('sedes-grid');
    if (!section || !grid) return;

    grid.innerHTML = '';
    sedes.forEach(loc => {
      const distText = loc.dist < 1
        ? Math.round(loc.dist * 1000) + ' m'
        : loc.dist.toFixed(1) + ' km';

      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((loc.address || loc.name) + ' ' + (loc.city || ''))}`;

      const card = document.createElement('div');
      card.className = 'sede-card';
      card.innerHTML = `
        <div class="sede-distance">${distText}</div>
        <div class="sede-name">${esc(loc.name)}</div>
        <div class="sede-address">${esc(loc.city || '')}${loc.city && loc.address ? ' · ' : ''}${esc(loc.address || '')}</div>
        <a href="${mapsUrl}" target="_blank" rel="noopener" class="sede-maps-btn">🗺️ Cómo llegar</a>
      `;
      grid.appendChild(card);
    });

    section.style.display = '';
  }

  // ─── Haversine (km) ────────────────────────────────
  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2)**2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  function toRad(deg) { return deg * Math.PI / 180; }

  function esc(str) {
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
