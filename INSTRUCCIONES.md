# Iglesia Cuerpo de Cristo — Guía de la Plataforma

## Cómo abrir el sitio web

### Opción 1: Live Server (VSCode)
1. Abre VSCode y la carpeta `Cuerpodecristo`
2. Instala la extensión "Live Server" (si no la tienes)
3. Click derecho sobre `index.html` → "Open with Live Server"
4. Se abrirá en `http://127.0.0.1:5500`

### Opción 2: Python
```bash
cd Desktop/Cuerpodecristo
python -m http.server 8080
# Abre http://localhost:8080
```

### Opción 3: npm (necesita Node.js)
```bash
npm install
npm run serve
# Abre http://localhost:8080
```

---

## Publicar en iOS y Android (Capacitor)

### Requisitos previos
- Node.js 18+ instalado
- Para Android: Android Studio instalado
- Para iOS: Mac con Xcode instalado (solo en Mac)

### Pasos Android
```bash
cd Desktop/Cuerpodecristo
npm install
npx cap add android
npx cap sync
npx cap open android
# En Android Studio: Build → Generate Signed APK
```

### Pasos iOS (solo Mac)
```bash
npm install
npx cap add ios
npx cap sync
npx cap open ios
# En Xcode: Product → Archive → Distribute App
```

---

## Configuraciones pendientes

### 1. Radio Solidaria — URL del stream
Edita el archivo `js/radio.js`, línea 6:
```js
const STREAM_URL = 'https://TU-URL-DE-STREAM-AQUI/live';
```

### 2. WhatsApp del Rastro
Edita `js/rastro-store.js`, línea 7:
```js
const WA_NUMBER = '34TUNUMEROAQUI';  // sin + ni espacios
```

### 3. Formulario PAN (Formspree)
1. Crea cuenta gratuita en https://formspree.io
2. Crea un nuevo formulario y copia el ID
3. Edita `js/pan-form.js`, línea 8:
```js
const FORMSPREE_URL = 'https://formspree.io/f/TU-FORM-ID';
```

### 4. Dirección exacta de la iglesia
Edita `contacto.html`, líneas donde está:
```js
const LAT = 28.4353;
const LNG = -16.5132;
```
Cambia las coordenadas a la ubicación exacta de la iglesia.

### 5. Fotos de niños (PAN)
- Añade fotos en `assets/images/pan/`
- Edita `data/pan-children.json` y actualiza el campo `"photo"` con la ruta

### 6. Fotos de productos (Rastro)
- Añade fotos en `assets/images/rastro/`
- Edita `data/rastro-products.json` y actualiza el campo `"images"`

---

## Estructura de archivos principal
```
index.html              ← Página de inicio
biblia.html             ← Lector Bíblico RVR1960
devocional.html         ← Devocional diario
contacto.html           ← Mapa y contacto
programas/
  pan-apadrinamiento.html  ← PAN (prioritario)
  radio-solidaria.html
  rastro.html
  reparto-alimentos.html
css/                    ← Estilos
js/                     ← Lógica JavaScript
data/                   ← Datos JSON
assets/characters/      ← SVG animados
package.json            ← Capacitor (iOS/Android)
capacitor.config.json   ← Config de la app nativa
```
