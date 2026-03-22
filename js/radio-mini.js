/**
 * radio-mini.js — Mini reproductor de radio en la cabecera (todas las páginas)
 * Inyecta el botón y popup en el nav. Funciona de forma global en la app.
 */
(function RadioMini() {
  'use strict';

  const STREAM_URL = 'http://www.rkmradio.com:8000/;stream.nsv';
  const STATUS_URL = 'http://www.rkmradio.com:8000/status-json.xsl';

  let audio      = null;
  let isPlaying  = false;
  let metaTimer  = null;

  // ─── Inyectar HTML en el header ─────────────────────────────
  function inject() {
    const navInner = document.querySelector('.nav-inner');
    if (!navInner) return;

    // Botón + popup
    const wrap = document.createElement('div');
    wrap.className = 'rmp-wrap';
    wrap.innerHTML = `
      <button class="rmp-btn" id="rmp-btn" aria-label="Radio Solidaria" title="Abrir radio">
        <span class="rmp-icon">📻</span>
        <span class="rmp-dot" id="rmp-dot"></span>
      </button>
      <div class="rmp-popup" id="rmp-popup" role="dialog" aria-label="Mini reproductor de radio">
        <div class="rmp-header">
          <span class="rmp-title">📻 Radio Solidaria</span>
          <span class="rmp-status" id="rmp-status">● Parado</span>
        </div>
        <div class="rmp-now" id="rmp-now" style="display:none">
          <span class="rmp-now-text" id="rmp-now-text"></span>
        </div>
        <div class="rmp-controls">
          <button class="rmp-play" id="rmp-play" aria-label="Reproducir">&#9654;</button>
          <div class="rmp-vol-row">
            <span class="rmp-vol-icon">🔊</span>
            <input class="rmp-vol" type="range" id="rmp-vol" min="0" max="100" value="80" aria-label="Volumen">
          </div>
        </div>
      </div>
    `;

    // Insertar antes del hamburger (o al final del nav-inner)
    const hamburger = navInner.querySelector('.nav-hamburger');
    if (hamburger) {
      navInner.insertBefore(wrap, hamburger);
    } else {
      navInner.appendChild(wrap);
    }

    // También agregar botón en menú móvil
    const navMobile = document.querySelector('.nav-mobile');
    if (navMobile) {
      const mobileRadio = document.createElement('button');
      mobileRadio.className = 'nav-mobile-radio';
      mobileRadio.id = 'rmp-mobile-play';
      mobileRadio.innerHTML = '📻 Radio Solidaria — <span id="rmp-mobile-status">▶ Toca para escuchar</span>';
      navMobile.appendChild(mobileRadio);
      mobileRadio.addEventListener('click', togglePlay);
    }

    setupEvents();
    createAudio();
  }

  // ─── Crear elemento audio ────────────────────────────────────
  function createAudio() {
    audio = new Audio();
    audio.preload = 'none';
    audio.volume  = 0.8;

    audio.addEventListener('playing',  () => { setStatus('live'); startMetaPolling(); });
    audio.addEventListener('waiting',  () => setStatus('connecting'));
    audio.addEventListener('stalled',  () => setStatus('connecting'));
    audio.addEventListener('error',    () => { setStatus('error'); isPlaying = false; updatePlayBtn(); });
    audio.addEventListener('pause',    () => { setStatus('stopped'); stopMetaPolling(); });

    // Media Session API (pantalla bloqueada)
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title:  'Radio Solidaria',
        artist: 'Iglesia Cuerpo de Cristo',
        album:  'La Matanza de Acentejo, Tenerife'
      });
      navigator.mediaSession.setActionHandler('play',  () => startStream());
      navigator.mediaSession.setActionHandler('pause', () => stopStream());
      navigator.mediaSession.setActionHandler('stop',  () => stopStream());
    }
  }

  // ─── Eventos ─────────────────────────────────────────────────
  function setupEvents() {
    const btn     = document.getElementById('rmp-btn');
    const popup   = document.getElementById('rmp-popup');
    const playBtn = document.getElementById('rmp-play');
    const volSlider = document.getElementById('rmp-vol');

    // Toggle popup
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      popup.classList.toggle('open');
    });

    // Cerrar popup al hacer click fuera
    document.addEventListener('click', (e) => {
      if (!document.getElementById('rmp-popup')) return;
      if (!e.target.closest('.rmp-wrap')) {
        document.getElementById('rmp-popup').classList.remove('open');
      }
    });

    // Play / Stop
    playBtn.addEventListener('click', togglePlay);

    // Volumen
    volSlider.addEventListener('input', () => {
      if (audio) audio.volume = volSlider.value / 100;
    });
  }

  // ─── Toggle play/stop ────────────────────────────────────────
  function togglePlay() {
    isPlaying ? stopStream() : startStream();
  }

  function startStream() {
    if (!audio) return;
    setStatus('connecting');
    audio.src = STREAM_URL;
    audio.play().then(() => {
      isPlaying = true;
      updatePlayBtn();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    }).catch(err => {
      isPlaying = false;
      updatePlayBtn();
      if (err.name !== 'AbortError') setStatus('error');
    });
  }

  function stopStream() {
    if (!audio) return;
    audio.pause();
    audio.src = '';
    isPlaying = false;
    updatePlayBtn();
    setStatus('stopped');
    setNowPlaying('');
    stopMetaPolling();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  }

  // ─── UI ──────────────────────────────────────────────────────
  function updatePlayBtn() {
    const btn = document.getElementById('rmp-play');
    const mbtn = document.getElementById('rmp-mobile-play');
    if (!btn) return;
    if (isPlaying) {
      btn.innerHTML = '<span style="display:inline-block;width:11px;height:11px;background:#fff;border-radius:2px;vertical-align:middle"></span>';
      btn.setAttribute('aria-label', 'Detener radio');
      if (mbtn) mbtn.querySelector('#rmp-mobile-status').textContent = '■ Detener radio';
    } else {
      btn.innerHTML = '&#9654;';
      btn.setAttribute('aria-label', 'Reproducir radio');
      if (mbtn) mbtn.querySelector('#rmp-mobile-status').textContent = '▶ Toca para escuchar';
    }
  }

  function setStatus(status) {
    const el  = document.getElementById('rmp-status');
    const dot = document.getElementById('rmp-dot');
    if (!el || !dot) return;
    const map = {
      live:       { txt: '🔴 EN VIVO',           dot: 'live'       },
      connecting: { txt: '⏳ Conectando…',        dot: 'connecting' },
      error:      { txt: '❌ Sin señal',           dot: ''           },
      stopped:    { txt: '● Parado',              dot: ''           }
    };
    const s = map[status] || map.stopped;
    el.textContent = s.txt;
    dot.className  = 'rmp-dot ' + s.dot;
  }

  function setNowPlaying(title) {
    const row  = document.getElementById('rmp-now');
    const text = document.getElementById('rmp-now-text');
    if (!row || !text) return;
    text.textContent = title;
    row.style.display = title ? 'block' : 'none';
  }

  // ─── Metadata (Now Playing) ───────────────────────────────────
  function startMetaPolling() {
    fetchNowPlaying();
    metaTimer = setInterval(fetchNowPlaying, 30000);
  }
  function stopMetaPolling() {
    clearInterval(metaTimer);
    metaTimer = null;
  }

  async function fetchNowPlaying() {
    try {
      const res  = await fetch(STATUS_URL, { cache: 'no-store' });
      const data = await res.json();
      const src  = data?.icestats?.source;
      const sources = Array.isArray(src) ? src : (src ? [src] : []);
      const title = sources[0]?.title || sources[0]?.server_name || '';
      if (title) {
        setNowPlaying(title);
        if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title,
            artist: 'Radio Solidaria — Cuerpo de Cristo',
            album:  'La Matanza de Acentejo'
          });
        }
      }
    } catch(_) { /* silencioso */ }
  }

  // ─── Arrancar ─────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
