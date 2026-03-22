(function RadioModule() {
  'use strict';

  // En HTTPS usamos el proxy del servidor para evitar mixed content
  const isSecure   = location.protocol === 'https:';
  const STREAM_URL = isSecure ? '/radio-stream' : 'http://www.rkmradio.com:8000/;stream.nsv';
  const PLS_URL    = 'http://www.rkmradio.com:8000/listen.pls?sid=10';

  let audio        = null;
  let audioCtx     = null;
  let analyser     = null;
  let source       = null;
  let animFrame    = null;
  let isPlaying    = false;
  let isMuted      = false;
  let resolvedUrl  = null;   // URL real del stream (extraída del PLS)
  let metaTimer    = null;

  // ─── Parsear PLS y obtener URL del stream ─────────────────
  async function resolveStreamUrl() {
    if (resolvedUrl) return resolvedUrl;
    // En HTTPS usamos directo el proxy (no PLS)
    if (isSecure) { resolvedUrl = STREAM_URL; return resolvedUrl; }
    try {
      const res  = await fetch(PLS_URL, { cache: 'no-store' });
      const text = await res.text();
      const match = text.match(/^File\d+=(.+)$/m);
      if (match && match[1].trim().startsWith('http')) {
        resolvedUrl = match[1].trim();
        return resolvedUrl;
      }
    } catch(e) {
      console.warn('No se pudo obtener el PLS, usando URL directa:', e.message);
    }
    resolvedUrl = STREAM_URL;
    return resolvedUrl;
  }

  // ─── Init ─────────────────────────────────────────────────
  function init() {
    const playBtn   = document.getElementById('btn-play-radio');
    const muteBtn   = document.getElementById('btn-mute-radio');
    const volSlider = document.getElementById('volume-slider');
    const canvas    = document.getElementById('radio-visualizer');
    if (!playBtn) return;

    audio = new Audio();
    audio.preload  = 'none';
    audio.volume   = 0.8;

    audio.addEventListener('playing',   () => { setStatus('live');       updateMediaSession('playing'); fetchNowPlaying(); });
    audio.addEventListener('waiting',   () => setStatus('connecting'));
    audio.addEventListener('stalled',   () => setStatus('connecting'));
    audio.addEventListener('error',     () => { setStatus('error'); isPlaying = false; updatePlayBtn(); });
    audio.addEventListener('pause',     () => { setStatus('stopped'); clearInterval(metaTimer); });

    playBtn.addEventListener('click', togglePlay);
    if (muteBtn)   muteBtn.addEventListener('click', toggleMute);
    if (volSlider) {
      volSlider.addEventListener('input', () => { if (audio) audio.volume = volSlider.value / 100; });
    }

    if (canvas) drawFallbackVisualizer(canvas);
    setupMediaSession();
  }

  // ─── Controles ────────────────────────────────────────────
  function togglePlay() {
    isPlaying ? stopStream() : startStream();
  }

  async function startStream() {
    if (!audio) return;
    setStatus('connecting');
    updatePlayBtn(true);

    const url = await resolveStreamUrl();
    audio.src = url;

    try {
      await audio.play();
      isPlaying = true;
      updatePlayBtn(true);
      initVisualizer();
      metaTimer = setInterval(fetchNowPlaying, 30000);
    } catch(err) {
      console.warn('Error al reproducir:', err);
      isPlaying = false;
      updatePlayBtn(false);
      if (err.name === 'NotAllowedError') {
        setStatus('stopped');
        showMsg('Pulsa ▶ para reproducir la radio', 'info');
      } else {
        setStatus('error');
        showMsg('No se pudo conectar. Comprueba tu conexión.', 'error');
      }
    }
  }

  function stopStream() {
    if (!audio) return;
    audio.pause();
    audio.src  = '';
    isPlaying  = false;
    resolvedUrl = null;
    clearInterval(metaTimer);
    updatePlayBtn(false);
    setStatus('stopped');
    setNowPlaying('');
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    const canvas = document.getElementById('radio-visualizer');
    if (canvas) drawFallbackVisualizer(canvas);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  }

  function toggleMute() {
    const btn = document.getElementById('btn-mute-radio');
    isMuted = !isMuted;
    if (audio) audio.muted = isMuted;
    if (btn) btn.textContent = isMuted ? '🔇' : '🔊';
  }

  function updatePlayBtn(playing) {
    const btn = document.getElementById('btn-play-radio');
    if (!btn) return;
    if (playing === undefined) playing = isPlaying;
    if (playing) {
      btn.classList.add('playing');
      btn.innerHTML = '<span style="display:block;width:14px;height:14px;background:white;border-radius:2px;"></span>';
      btn.setAttribute('aria-label', 'Detener radio');
    } else {
      btn.classList.remove('playing');
      btn.innerHTML = '&#9654;';
      btn.setAttribute('aria-label', 'Reproducir radio');
    }
  }

  // ─── Estado y metadatos ───────────────────────────────────
  function setStatus(status) {
    const dot  = document.querySelector('.radio-status-dot');
    const text = document.querySelector('.radio-status-text');
    if (!dot || !text) return;
    dot.className = 'radio-status-dot';
    const map = {
      live:       { cls: 'live',  txt: '🔴 EN VIVO' },
      connecting: { cls: '',      txt: '⏳ Conectando…' },
      error:      { cls: 'error', txt: '❌ Sin señal — intenta de nuevo' },
      stopped:    { cls: '',      txt: '▶ Pulsa para escuchar' }
    };
    const s = map[status] || map.stopped;
    dot.classList.add(s.cls);
    text.textContent = s.txt;
  }

  function setNowPlaying(title) {
    const el = document.getElementById('now-playing-text');
    if (!el) return;
    el.textContent = title || '';
    el.closest('.radio-now-playing').style.display = title ? 'flex' : 'none';
  }

  async function fetchNowPlaying() {
    try {
      // Icecast JSON status endpoint
      const res  = await fetch('http://www.rkmradio.com:8000/status-json.xsl', { cache: 'no-store' });
      const data = await res.json();
      const src  = data?.icestats?.source;
      const sources = Array.isArray(src) ? src : (src ? [src] : []);
      const match = sources.find(s => s.listenurl && s.listenurl.includes('10'));
      const title = match?.title || match?.['server_name'] || sources[0]?.title || '';
      if (title) {
        setNowPlaying(title);
        if ('mediaSession' in navigator && navigator.mediaSession.metadata) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title,
            artist: 'Radio Solidaria — Cuerpo de Cristo',
            album:  'La Matanza de Acentejo'
          });
        }
      }
    } catch(e) { /* silencioso */ }
  }

  function showMsg(msg, type) {
    const el = document.getElementById('radio-message');
    if (!el) return;
    el.textContent = msg;
    el.className   = 'radio-message ' + (type || '');
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 5000);
  }

  // ─── Media Session API (audio en segundo plano / pantalla bloqueada) ──
  function setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  'Radio Solidaria',
      artist: 'Iglesia Cuerpo de Cristo',
      album:  'La Matanza de Acentejo, Tenerife'
    });
    navigator.mediaSession.setActionHandler('play',  () => startStream());
    navigator.mediaSession.setActionHandler('pause', () => stopStream());
    navigator.mediaSession.setActionHandler('stop',  () => stopStream());
  }

  function updateMediaSession(state) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = state;
  }

  // ─── Visualizador ─────────────────────────────────────────
  function initVisualizer() {
    const canvas = document.getElementById('radio-visualizer');
    if (!canvas || !audio) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (!source) {
        audio.crossOrigin = 'anonymous';
        source   = audioCtx.createMediaElementSource(audio);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
      }
      drawAnalyserVisualizer(canvas);
    } catch(e) {
      drawAnimatedFallback(canvas);
    }
  }

  function drawAnalyserVisualizer(canvas) {
    const ctx    = canvas.getContext('2d');
    const H      = canvas.height;
    canvas.width = canvas.offsetWidth;
    const W      = canvas.width;
    const bufLen = analyser.frequencyBinCount;
    const data   = new Uint8Array(bufLen);
    const barW   = (W / bufLen) * 2.4;

    function draw() {
      if (!isPlaying) return;
      animFrame = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      ctx.fillStyle = 'rgba(26,26,26,0.85)';
      ctx.fillRect(0, 0, W, H);
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const barH = (data[i] / 255) * H * 0.85;
        const a    = 0.5 + (data[i] / 255) * 0.5;
        const g    = ctx.createLinearGradient(0, H - barH, 0, H);
        g.addColorStop(0, `rgba(129,212,250,${a})`);
        g.addColorStop(1, `rgba(79,195,247,${a})`);
        ctx.fillStyle = g;
        ctx.roundRect ? ctx.roundRect(x, H - barH, barW - 1, barH, 2) : ctx.fillRect(x, H - barH, barW - 1, barH);
        ctx.fill();
        ctx.fillStyle = `rgba(79,195,247,${a * 0.2})`;
        ctx.fillRect(x, H + 2, barW - 1, barH * 0.25);
        x += barW + 1;
      }
    }
    draw();
  }

  function drawFallbackVisualizer(canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || 400;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, W, H);
    const bars = 28;
    const bw   = W / bars;
    for (let i = 0; i < bars; i++) {
      const h = (Math.sin(i * 0.6) * 0.4 + 0.6) * (H * 0.45);
      ctx.fillStyle = 'rgba(79,195,247,0.2)';
      ctx.fillRect(i * bw + 2, H - h, bw - 4, h);
    }
  }

  function drawAnimatedFallback(canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || 400;
    const W = canvas.width, H = canvas.height;
    const bars = 32;
    const bw   = W / bars;
    let t = 0;
    function draw() {
      if (!isPlaying) return;
      animFrame = requestAnimationFrame(draw);
      t += 0.07;
      ctx.fillStyle = 'rgba(26,26,26,0.9)';
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < bars; i++) {
        const h = (Math.sin(t + i * 0.35) * 0.45 + 0.55) * H * 0.8;
        const a = 0.35 + Math.abs(Math.sin(t * 0.5 + i * 0.25)) * 0.65;
        ctx.fillStyle = `rgba(79,195,247,${a})`;
        ctx.fillRect(i * bw + 2, H - h, bw - 4, h);
      }
    }
    draw();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
