/**
 * build-www.js
 * Copia todos los archivos web al directorio www/ para Capacitor.
 * Uso: node scripts/build-www.js
 */
const fs   = require('fs');
const path = require('path');

const ROOT  = path.join(__dirname, '..');
const DEST  = path.join(ROOT, 'www');

// Directorios a copiar
const DIRS  = ['css', 'js', 'data', 'assets', 'programas'];

// ── Limpiar www/ ─────────────────────────────────────────────
if (fs.existsSync(DEST)) fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });

// ── Copiar .html del raíz ────────────────────────────────────
fs.readdirSync(ROOT)
  .filter(f => f.endsWith('.html'))
  .forEach(f => fs.copyFileSync(path.join(ROOT, f), path.join(DEST, f)));

// ── Copiar carpetas ──────────────────────────────────────────
DIRS.forEach(dir => {
  const src = path.join(ROOT, dir);
  if (fs.existsSync(src)) copyDir(src, path.join(DEST, dir));
});

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

console.log('✅ www/ generado correctamente.');
