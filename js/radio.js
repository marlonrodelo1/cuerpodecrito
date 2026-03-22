(function RadioModule() {
  'use strict';

  // ⚠️ REEMPLAZAR con la URL real del stream cuando esté disponible
  const STREAM_URL = 'https://PLACEHOLDER.streaming.com/live';

  let audio        = null;
  let audioCtx     = null;
  let analyser     = null;
  let source       = null;
  let animFrame    = null;
  let isPlaying    = false;
  let isMuted      = false;

  function init() {
    const playBtn   = document.getElementById('btn-play-radio');
    const muteBtn   = document.getElementById('btn-mute-radio');
    const volSlider = document.getElementById('volume-slider');
    const canvas    = document.getElementById('radio-visualizer');

    if (!playBtn) return;

    audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'none';

    audio.addEventListener('playing',   () => setStatus('live'));
    audio.addEventListener('waiting',   () => setStatus('connecting'));
    audio.addEventListener('error',     () => setStatus('error'));
    audio.addEventListener('pause',     () => setStatus('stopped'));
    audio.addEventListener('stalled',   () => setStatus('connecting'));

    playBtn.addEventListener('click', togglePlay);
    if (muteBtn)   muteBtn.addEventListener('click', toggleMute);
    if (volSlider) volSlider.addEventListener('input', () => {
      if (audio) audio.volume = volSlider.value / 100;
    });

    // Canvas fallback (barras estáticas si no hay stream)
    if (canvas) drawFallbackVisualizer(canvas);
  }

  function togglePlay() {
    if (isPlaying) {
      stopStream();
    } else {
      startStream();
    }
  }

  function startStream() {
    const btn = document.getElementById('btn-play-radio');
    if (!audio) return;

    setStatus('connecting');
    audio.src = STREAM_URL;
    audio.play()
      .then(() => {
        isPlaying = true;
        if (btn) { btn.classList.add('playing'); btn.textContent = '⏹'; }
        initVisualizer();
      })
      .catch(err => {
        console.warn('Error al iniciar stream:', err);
        setStatus('error');
        // Mensaje amigable
        const statusText = document.querySelector('.radio-status-text');
        if (statusText) statusText.textContent = 'Sin señal — URL pendiente de configurar';
      });
  }

  function stopStream() {
    const btn = document.getElementById('btn-play-radio');
    if (!audio) return;
    audio.pause();
    audio.src = '';
    isPlaying = false;
    if (btn) { btn.classList.remove('playing'); btn.textContent = '▶'; }
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    const canvas = document.getElementById('radio-visualizer');
    if (canvas) drawFallbackVisualizer(canvas);
  }

  function toggleMute() {
    const btn = document.getElementById('btn-mute-radio');
    isMuted = !isMuted;
    if (audio) audio.muted = isMuted;
    if (btn) btn.textContent = isMuted ? '🔇' : '🔊';
  }

  function setStatus(status) {
    const dot  = document.querySelector('.radio-status-dot');
    const text = document.querySelector('.radio-status-text');
    if (!dot || !text) return;

    dot.className = 'radio-status-dot';
    const states = {
      live:       { class: 'live',  text: '🔴 EN VIVO' },
      connecting: { class: '',      text: '⏳ Conectando…' },
      error:      { class: 'error', text: '❌ Sin señal' },
      stopped:    { class: '',      text: 'Detenido' }
    };
    const s = states[status] || states.stopped;
    dot.classList.add(s.class);
    text.textContent = s.text;
  }

  function initVisualizer() {
    const canvas = document.getElementById('radio-visualizer');
    if (!canvas || !audio) return;

    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (!source) {
        source   = audioCtx.createMediaElementSource(audio);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
      }
      drawAnalyserVisualizer(canvas);
    } catch(e) {
      // CORS u otro error → fallback animado
      drawAnimatedFallback(canvas);
    }
  }

  function drawAnalyserVisualizer(canvas) {
    const ctx    = canvas.getContext('2d');
    const W      = canvas.offsetWidth;
    const H      = canvas.height;
    canvas.width = W;
    const bufLen = analyser.frequencyBinCount;
    const dataArr = new Uint8Array(bufLen);
    const barW    = (W / bufLen) * 2.4;

    function draw() {
      if (!isPlaying) return;
      animFrame = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArr);
      ctx.fillStyle = '#242424';
      ctx.fillRect(0, 0, W, H);
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const barH = (dataArr[i] / 255) * H;
        const alpha = 0.5 + (dataArr[i] / 255) * 0.5;
        ctx.fillStyle = `rgba(79,195,247,${alpha})`;
        ctx.fillRect(x, H - barH, barW - 1, barH);
        // Reflejo
        ctx.fillStyle = `rgba(79,195,247,${alpha * 0.25})`;
        ctx.fillRect(x, H, barW - 1, barH * 0.3);
        x += barW + 1;
      }
    }
    draw();
  }

  function drawFallbackVisualizer(canvas) {
    const ctx = canvas.getContext('2d');
    const W   = canvas.offsetWidth || 400;
    const H   = canvas.height;
    canvas.width = W;
    ctx.fillStyle = '#242424';
    ctx.fillRect(0, 0, W, H);

    const bars = 20;
    const bw   = W / bars;
    for (let i = 0; i < bars; i++) {
      const h = (Math.sin(i * 0.7) + 1.2) * (H / 3);
      ctx.fillStyle = 'rgba(79,195,247,0.3)';
      ctx.fillRect(i * bw + 2, H - h, bw - 4, h);
    }
  }

  function drawAnimatedFallback(canvas) {
    const ctx  = canvas.getContext('2d');
    const W    = canvas.offsetWidth || 400;
    const H    = canvas.height;
    canvas.width = W;
    const bars = 30;
    const bw   = W / bars;
    let t = 0;

    function draw() {
      if (!isPlaying) return;
      animFrame = requestAnimationFrame(draw);
      t += 0.08;
      ctx.fillStyle = '#242424';
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < bars; i++) {
        const h = (Math.sin(t + i * 0.4) + 1) * (H / 2.2) * 0.85;
        const a = 0.4 + Math.abs(Math.sin(t + i * 0.4)) * 0.6;
        ctx.fillStyle = `rgba(79,195,247,${a})`;
        ctx.fillRect(i * bw + 2, H - h, bw - 4, h);
      }
    }
    draw();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
