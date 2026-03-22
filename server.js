/**
 * server.js — Servidor estático + proxy de radio
 * El proxy es necesario porque el stream de la radio es HTTP
 * y el sitio se sirve por HTTPS (los navegadores bloquean mixed content).
 */
const express = require('express');
const http    = require('http');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

const RADIO_STREAM = 'http://www.rkmradio.com:8000/;stream.nsv';
const RADIO_STATUS = 'http://www.rkmradio.com:8000/status-json.xsl';

// ── Proxy stream de audio ─────────────────────────────────────────
app.get('/radio-stream', (req, res) => {
  const radioReq = http.get(RADIO_STREAM, (radioRes) => {
    res.setHeader('Content-Type', radioRes.headers['content-type'] || 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Transfer-Encoding', 'chunked');
    radioRes.pipe(res);
  });
  radioReq.on('error', () => res.status(502).end());

  // Si el cliente desconecta, cortar la conexión con la radio
  req.on('close', () => radioReq.destroy());
});

// ── Proxy estado JSON (now playing) ──────────────────────────────
app.get('/radio-status', (req, res) => {
  http.get(RADIO_STATUS, (statusRes) => {
    let data = '';
    statusRes.on('data', chunk => data += chunk);
    statusRes.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(data);
    });
  }).on('error', () => res.status(502).json({}));
});

// ── Archivos estáticos ────────────────────────────────────────────
app.use(express.static(path.join(__dirname), {
  index: 'index.html',
  etag: false,
  lastModified: false,
  setHeaders(res) {
    res.setHeader('Cache-Control', 'no-cache');
  }
}));

app.listen(PORT, () => {
  console.log(`✅ Cuerpo de Cristo — servidor en puerto ${PORT}`);
});
