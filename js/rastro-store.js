(function RastroStore() {
  'use strict';

  const DATA_URL   = '../data/rastro-products.json';
  // ⚠️ Reemplazar con el número real de WhatsApp de la iglesia
  const WA_NUMBER  = '34XXXXXXXXX';
  const CART_KEY   = 'rastro_cart';

  let allProducts  = [];
  let categories   = [];
  let activeCategory = 'Todo';
  let searchQuery  = '';

  const CartService = {
    get() {
      try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
      catch(e) { return []; }
    },
    add(product) {
      const cart = this.get();
      if (!cart.find(i => i.id === product.id)) {
        cart.push({ id: product.id, name: product.name, price: product.price });
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
      }
      this.updateUI();
    },
    remove(id) {
      const cart = this.get().filter(i => i.id !== id);
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      this.updateUI();
      renderCart();
    },
    clear() {
      localStorage.removeItem(CART_KEY);
      this.updateUI();
    },
    total() {
      return this.get().reduce((sum, i) => sum + (i.price || 0), 0);
    },
    count() {
      return this.get().length;
    },
    updateUI() {
      const count = this.count();
      const badge = document.getElementById('cart-count');
      const fabBadge = document.querySelector('.cart-fab-count');
      if (badge) badge.textContent = count;
      if (fabBadge) {
        fabBadge.textContent = count;
        fabBadge.classList.toggle('visible', count > 0);
      }
    }
  };

  async function init() {
    await loadProducts();
    setupCategoryFilters();
    setupSearch();
    setupCart();
    CartService.updateUI();
    document.getElementById('footer-year').textContent = new Date().getFullYear();
  }

  async function loadProducts() {
    try {
      const data   = await fetch(DATA_URL).then(r => r.json());
      allProducts  = data.products;
      categories   = data.categories;
      renderProducts(allProducts);
    } catch(err) {
      console.error('Rastro: Error al cargar productos', err);
      const grid = document.getElementById('products-grid');
      if (grid) grid.innerHTML = '<p style="color:var(--color-text-muted); padding:var(--sp-8);">Error al cargar productos. Verifica tu conexión.</p>';
    }
  }

  function setupCategoryFilters() {
    const container = document.getElementById('category-filters');
    if (!container) return;
    container.innerHTML = '';
    categories.forEach(cat => {
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
    input.addEventListener('input', () => { searchQuery = input.value; filterAndRender(); });
    if (btn) btn.addEventListener('click', () => { searchQuery = input.value; filterAndRender(); });
  }

  function filterAndRender() {
    let filtered = allProducts;
    if (activeCategory && activeCategory !== 'Todo') {
      filtered = filtered.filter(p => p.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    renderProducts(filtered);
  }

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
      card.className = 'product-card' + (!p.available ? ' unavailable' : '');
      card.innerHTML = `
        <div class="product-img">
          ${p.images && p.images[0] ? `<img src="${p.images[0]}" alt="${p.name}" loading="lazy">` : getCategoryIcon(p.category)}
          <span class="product-condition-badge condition-${p.condition.toLowerCase().replace(' ','-')}">${p.condition}</span>
          ${!p.available ? '<div class="unavailable-overlay">Vendido</div>' : ''}
        </div>
        <div class="product-body">
          <div class="product-category">${p.category}</div>
          <div class="product-name">${p.name}</div>
          <div class="product-desc">${p.description}</div>
          <div class="product-price">${p.price.toFixed(2)} <span>${p.currency}</span></div>
          ${p.donation_note ? `<div class="product-donation">🤝 ${p.donation_note}</div>` : ''}
          ${p.available
            ? `<button class="btn btn-add-cart" data-id="${p.id}">🛒 Añadir al carrito</button>`
            : `<button class="btn btn-add-cart" disabled style="opacity:0.4; cursor:not-allowed;">No disponible</button>`
          }
        </div>
      `;

      const btn = card.querySelector('[data-id]');
      if (btn) btn.addEventListener('click', () => CartService.add(p));

      grid.appendChild(card);
    });
  }

  function getCategoryIcon(category) {
    const icons = {
      'Muebles':           '🪑',
      'Electrodomésticos': '🔌',
      'Ropa':              '👗',
      'Libros':            '📚',
      'Decoración':        '🖼️',
      'Juguetes':          '🧸'
    };
    return `<span style="font-size:3.5rem">${icons[category] || '📦'}</span>`;
  }

  function setupCart() {
    const fab        = document.getElementById('cart-fab');
    const sidebar    = document.getElementById('cart-sidebar');
    const backdrop   = document.getElementById('cart-backdrop');
    const closeBtn   = document.getElementById('btn-close-cart');
    const checkoutBtn = document.getElementById('btn-checkout');

    const openCart  = () => { sidebar?.classList.add('open'); backdrop?.classList.add('open'); document.body.style.overflow = 'hidden'; renderCart(); };
    const closeCart = () => { sidebar?.classList.remove('open'); backdrop?.classList.remove('open'); document.body.style.overflow = ''; };

    if (fab)      fab.addEventListener('click', openCart);
    if (closeBtn) closeBtn.addEventListener('click', closeCart);
    if (backdrop) backdrop.addEventListener('click', closeCart);
    if (checkoutBtn) checkoutBtn.addEventListener('click', openWhatsApp);
  }

  function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl   = document.getElementById('cart-total-amount');
    if (!container) return;

    const cart = CartService.get();
    container.innerHTML = '';

    if (!cart.length) {
      container.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon">🛒</div>
          <p>Tu carrito está vacío</p>
          <p style="font-size:var(--text-sm); margin-top:var(--sp-2);">Añade productos para empezar</p>
        </div>`;
    } else {
      cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
          <span class="cart-item-icon">📦</span>
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price">${(item.price || 0).toFixed(2)} EUR</div>
          </div>
          <button class="btn-remove-item" data-id="${item.id}" title="Eliminar">✕</button>
        `;
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
    const msg = encodeURIComponent(`Hola, estoy interesado/a en los siguientes productos del Rastro Solidario:\n\n${items}\n\nTotal: ${total} EUR\n\nPor favor, ¿podéis confirmar disponibilidad?`);
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
