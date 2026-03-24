/**
 * rastro-store.js — Tienda Rastro desde Supabase
 * Filtros: categoría, sede, búsqueda libre
 */
(function RastroStore() {
  'use strict';

  const WA_NUMBER = '34XXXXXXXXX'; // ⚠️ Reemplazar con el número real
  const CART_KEY  = 'rastro_cart';

  const CATEGORIES = ['Todo', 'Muebles', 'Electrodomésticos', 'Ropa', 'Libros', 'Decoración', 'Juguetes', 'Otros'];
  const CAT_ICONS  = { 'Muebles':'🪑','Electrodomésticos':'🔌','Ropa':'👗','Libros':'📚','Decoración':'🖼️','Juguetes':'🧸','Otros':'📦' };

  let allProducts    = [];
  let activeCategory = 'Todo';
  let activeSedeId   = '';
  let searchQuery    = '';

  // ─── Cart ──────────────────────────────────────────
  const CartService = {
    get()  { try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch(e) { return []; } },
    add(p) {
      const cart = this.get();
      if (!cart.find(i => i.id === p.id)) {
        cart.push({ id: p.id, name: p.name, price: p.price });
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
      }
      this.updateUI();
    },
    remove(id) {
      localStorage.setItem(CART_KEY, JSON.stringify(this.get().filter(i => i.id !== id)));
      this.updateUI();
      renderCart();
    },
    clear()   { localStorage.removeItem(CART_KEY); this.updateUI(); },
    total()   { return this.get().reduce((s,i) => s + (i.price||0), 0); },
    count()   { return this.get().length; },
    updateUI() {
      const n = this.count();
      const fab = document.querySelector('.cart-fab-count');
      if (fab) { fab.textContent = n; fab.classList.toggle('visible', n > 0); }
    }
  };

  // ─── Init ──────────────────────────────────────────
  async function init() {
    if (!window.SupabaseClient) {
      setTimeout(init, 200);
      return;
    }
    await Promise.all([ loadSedes(), loadProducts() ]);
    setupCategoryFilters();
    setupSearch();
    setupSedeFilter();
    setupCart();
    CartService.updateUI();
  }

  // ─── Load sedes (for filter dropdown) ─────────────
  async function loadSedes() {
    const { data } = await window.SupabaseClient.client
      .from('locations')
      .select('id, name')
      .order('name');

    const sel = document.getElementById('sede-filter');
    if (!sel || !data) return;
    data.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc.id;
      opt.textContent = '📍 ' + loc.name;
      sel.appendChild(opt);
    });
  }

  // ─── Load products ─────────────────────────────────
  async function loadProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    const { data, error } = await window.SupabaseClient.client
      .from('rastro_products')
      .select('*, locations(name)')
      .eq('available', true)
      .order('created_at', { ascending: false });

    if (error || !data) {
      grid.innerHTML = '<p style="grid-column:1/-1; color:var(--color-text-muted); padding:var(--sp-8);">Error al cargar productos.</p>';
      return;
    }

    allProducts = data;
    filterAndRender();
  }

  // ─── Filters ───────────────────────────────────────
  function setupCategoryFilters() {
    const container = document.getElementById('category-filters');
    if (!container) return;
    container.innerHTML = '';
    CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'cat-btn' + (cat === 'Todo' ? ' active' : '');
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = cat;
        filterAndRender();
      });
      container.appendChild(btn);
    });
  }

  function setupSearch() {
    const input = document.getElementById('rastro-search');
    const btn   = document.getElementById('btn-rastro-search');
    if (!input) return;
    const go = () => { searchQuery = input.value; filterAndRender(); };
    input.addEventListener('input', go);
    if (btn) btn.addEventListener('click', go);
  }

  function setupSedeFilter() {
    const sel = document.getElementById('sede-filter');
    if (!sel) return;
    sel.addEventListener('change', () => { activeSedeId = sel.value; filterAndRender(); });
  }

  function filterAndRender() {
    let list = allProducts;
    if (activeSedeId) {
      list = list.filter(p => p.location_id === activeSedeId);
    }
    if (activeCategory && activeCategory !== 'Todo') {
      list = list.filter(p => p.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    renderProducts(list);
  }

  // ─── Render ────────────────────────────────────────
  function renderProducts(products) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    if (!products.length) {
      grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:var(--sp-12); color:var(--color-text-muted);">No se encontraron productos</div>';
      return;
    }

    grid.innerHTML = '';
    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      const icon = CAT_ICONS[p.category] || '📦';
      const sedeName = p.locations?.name || '';
      card.innerHTML = `
        <div class="product-img">
          ${p.image_url ? `<img src="${p.image_url}" alt="${esc(p.name)}" loading="lazy">` : `<span style="font-size:3.5rem">${icon}</span>`}
          <span class="product-condition-badge condition-${(p.condition||'').toLowerCase().replace(/\s+/g,'-')}">${p.condition || ''}</span>
        </div>
        <div class="product-body">
          ${sedeName ? `<div class="product-sede">📍 ${esc(sedeName)}</div>` : ''}
          <div class="product-category">${esc(p.category)}</div>
          <div class="product-name">${esc(p.name)}</div>
          <div class="product-desc">${esc(p.description || '')}</div>
          <div class="product-price">${p.price != null ? p.price.toFixed(2) : '—'} <span>EUR</span></div>
          <button class="btn btn-add-cart" data-id="${p.id}">🛒 Añadir al carrito</button>
        </div>`;
      card.querySelector('[data-id]').addEventListener('click', () => CartService.add(p));
      grid.appendChild(card);
    });
  }

  // ─── Cart UI ───────────────────────────────────────
  function setupCart() {
    const fab      = document.getElementById('cart-fab');
    const sidebar  = document.getElementById('cart-sidebar');
    const backdrop = document.getElementById('cart-backdrop');
    const closeBtn = document.getElementById('btn-close-cart');
    const checkout = document.getElementById('btn-checkout');

    const open  = () => { sidebar?.classList.add('open');    backdrop?.classList.add('open');    document.body.style.overflow = 'hidden'; renderCart(); };
    const close = () => { sidebar?.classList.remove('open'); backdrop?.classList.remove('open'); document.body.style.overflow = ''; };

    if (fab)      fab.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (backdrop) backdrop.addEventListener('click', close);
    if (checkout) checkout.addEventListener('click', openWhatsApp);
  }

  function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl   = document.getElementById('cart-total-amount');
    if (!container) return;

    const cart = CartService.get();
    container.innerHTML = '';

    if (!cart.length) {
      container.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">🛒</div><p>Tu carrito está vacío</p></div>`;
    } else {
      cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
          <span class="cart-item-icon">📦</span>
          <div class="cart-item-info">
            <div class="cart-item-name">${esc(item.name)}</div>
            <div class="cart-item-price">${(item.price||0).toFixed(2)} EUR</div>
          </div>
          <button class="btn-remove-item" data-id="${item.id}" title="Eliminar">✕</button>`;
        div.querySelector('.btn-remove-item').addEventListener('click', () => CartService.remove(item.id));
        container.appendChild(div);
      });
    }
    if (totalEl) totalEl.textContent = CartService.total().toFixed(2) + ' EUR';
  }

  function openWhatsApp() {
    const cart = CartService.get();
    if (!cart.length) { alert('Tu carrito está vacío.'); return; }
    const items = cart.map(i => `• ${i.name} — ${(i.price||0).toFixed(2)} EUR`).join('\n');
    const total = CartService.total().toFixed(2);
    const msg   = encodeURIComponent(`Hola, estoy interesado/a en los siguientes productos del Rastro Solidario:\n\n${items}\n\nTotal: ${total} EUR\n\n¿Podéis confirmar disponibilidad?`);
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
  }

  function esc(str) {
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
