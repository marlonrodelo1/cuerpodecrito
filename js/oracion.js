/**
 * oracion.js — Página de Oración en Vivo
 * Carga stream activo desde Supabase live_streams, embebe YouTube
 */
(function OracionModule() {
  'use strict';

  let refreshTimer = null;

  async function init() {
    await loadLiveStream();
    // Re-check cada 30 segundos
    refreshTimer = setInterval(loadLiveStream, 30000);
  }

  async function loadLiveStream() {
    if (!window.SupabaseClient) return;

    try {
      const { data } = await window.SupabaseClient.client
        .from('live_streams')
        .select('*, locations(name, city)')
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(1);

      const stream = data && data.length > 0 ? data[0] : null;
      renderPlayer(stream);
    } catch(err) {
      console.warn('Oracion load error:', err);
      renderPlayer(null);
    }
  }

  function renderPlayer(stream) {
    const playerSection = document.getElementById('oracion-player');
    if (!playerSection) return;

    if (stream && stream.youtube_url) {
      const videoId = extractYouTubeId(stream.youtube_url);
      if (!videoId) {
        renderOffline(playerSection);
        return;
      }

      const locationName = stream.locations?.name || '';
      const title        = stream.title || 'Oración en Vivo';

      playerSection.innerHTML = `
        <div class="oracion-live-wrap">
          <div class="oracion-stream-info">
            <div class="oracion-live-badge">
              <span class="oracion-live-dot"></span>
              EN VIVO AHORA
            </div>
            <h2 class="oracion-stream-title">${_esc(title)}</h2>
            ${locationName ? `<p class="oracion-stream-location">📍 ${_esc(locationName)}</p>` : ''}
          </div>
          <div class="oracion-iframe-wrap">
            <iframe
              src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
              loading="lazy"
              title="${_esc(title)}">
            </iframe>
          </div>
        </div>`;
    } else {
      renderOffline(playerSection);
    }
  }

  function renderOffline(container) {
    container.innerHTML = `
      <div class="oracion-offline">
        <div class="oracion-offline-icon">🙏</div>
        <h2 class="oracion-offline-title">No hay transmisión activa en este momento</h2>
        <p class="oracion-offline-sub">
          Cuando comience una oración en vivo, aparecerá aquí automáticamente.
          ¡Vuelve pronto!
        </p>
        <button class="btn btn-outline oracion-refresh-btn" onclick="location.reload()">
          Actualizar
        </button>
      </div>`;
  }

  // Extrae el video ID de cualquier formato de URL de YouTube
  function extractYouTubeId(url) {
    const patterns = [
      /(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/live\/)([^?&\s]+)/,
      /youtube\.com\/shorts\/([^?&\s]+)/
    ];
    for (const pat of patterns) {
      const match = url.match(pat);
      if (match) return match[1];
    }
    return null;
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
