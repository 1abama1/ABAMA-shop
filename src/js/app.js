(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const catalog = (window.ARCANA_CATALOG || []).map(p => ({ ...p }));
  const byId = new Map(catalog.map(p => [p.id, p]));

  const STATE = {
    search: "",
    rarity: "all",
    sort: "popular",
    cart: loadCart()
  };

  function loadCart() {
    try {
      const raw = localStorage.getItem("arcana_cart");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
  function saveCart() {
    localStorage.setItem("arcana_cart", JSON.stringify(STATE.cart));
    updateCartCount();
  }
  function updateCartCount() {
    const count = Object.values(STATE.cart).reduce((s, n) => s + n, 0);
    const cartCountEl = $("#cartCount");
    if (cartCountEl) cartCountEl.textContent = String(count);
  }
  function addToCart(id, qty = 1) {
    STATE.cart[id] = (STATE.cart[id] || 0) + qty;
    saveCart();
    showToast("Добавлено в корзину");
    burstFX();
    renderCart();
  }
  function removeFromCart(id) {
    delete STATE.cart[id];
    saveCart();
    renderCart();
  }
  function setQty(id, qty) {
    if (qty <= 0) return removeFromCart(id);
    STATE.cart[id] = qty;
    saveCart();
    renderCart();
  }

  function filterAndSort() {
    let items = catalog.slice();
    if (STATE.search) {
      const s = STATE.search.toLowerCase();
      items = items.filter(p => p.name.toLowerCase().includes(s) || p.desc.toLowerCase().includes(s));
    }
    if (STATE.rarity !== "all") {
      items = items.filter(p => p.rarity === STATE.rarity);
    }
    switch (STATE.sort) {
      case "priceAsc": items.sort((a,b)=>a.price-b.price); break;
      case "priceDesc": items.sort((a,b)=>b.price-a.price); break;
      case "nameAsc": items.sort((a,b)=>a.name.localeCompare(b.name)); break;
      case "nameDesc": items.sort((a,b)=>b.name.localeCompare(a.name)); break;
      default: items.sort((a,b)=>b.popularity-a.popularity);
    }
    return items;
  }

  function createCard(p) {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="card-media" data-tilt>
        <img src="${p.img}" alt="${p.name}">
        <span class="badge ${p.rarity}">${labelRarity(p.rarity)}</span>
      </div>
      <div class="card-body">
        <h3 class="card-title">${p.name}</h3>
        <div class="card-meta">
          <span class="price">${p.price}</span><span class="currency">зл</span>
        </div>
        <div class="card-actions">
          <a class="secondary-btn" href="product-${p.id}.html">Подробнее</a>
          <button class="primary-btn" data-add="${p.id}">В корзину</button>
        </div>
      </div>
    `;
    // Tilt effect
    const media = $("[data-tilt]", card);
    media.addEventListener("mousemove", (e) => {
      const r = media.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      media.style.transform = `perspective(600px) rotateX(${-y*6}deg) rotateY(${x*6}deg) scale(1.02)`;
    });
    media.addEventListener("mouseleave", () => {
      media.style.transform = "none";
    });
    // Add handlers
    $("[data-add]", card).addEventListener("click", () => addToCart(p.id, 1));
    return card;
  }

  function renderGrid() {
    const grid = $("#productGrid");
    if (!grid) return;
    grid.innerHTML = "";
    const items = filterAndSort();
    items.forEach(p => grid.appendChild(createCard(p)));
  }

  function renderProductPage(id) {
    const p = byId.get(id);
    if (!p) return;
    const main = $(".container");
    if (!main) return;
    main.innerHTML = `
      <div class="product-page">
        <div class="product-hero" data-tilt>
          <img src="${p.img}" alt="${p.name}">
        </div>
        <div class="product-info">
          <div class="pill ${p.rarity}">${labelRarity(p.rarity)}</div>
          <h2 class="product-title">${p.name}</h2>
          <p class="product-desc">${p.desc}</p>
          <div class="meta-row">
            <span class="pill">Популярность: ★ ${p.popularity}</span>
            <span class="pill">Цена: <strong>${p.price}</strong> <span class="currency">зл</span></span>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="secondary-btn" onclick="history.back()">← Назад</button>
            <button class="primary-btn" id="buyNow">В корзину</button>
          </div>
        </div>
      </div>
    `;
    const hero = $("[data-tilt]", main);
    if (hero) {
      hero.addEventListener("mousemove", (e) => {
        const r = hero.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        hero.style.transform = `perspective(800px) rotateX(${-y*4}deg) rotateY(${x*4}deg)`;
      });
      hero.addEventListener("mouseleave", () => hero.style.transform = "none");
    }
    $("#buyNow")?.addEventListener("click", () => addToCart(p.id, 1));
  }

  function labelRarity(r) {
    switch (r) {
      case "common": return "Обычное";
      case "uncommon": return "Необычное";
      case "rare": return "Редкое";
      case "legendary": return "Легендарное";
      default: return r;
    }
  }

  // Cart drawer render
  function renderCart() {
    const wrap = $("#cartItems");
    if (!wrap) return;
    wrap.innerHTML = "";
    let total = 0;
    for (const [idStr, qty] of Object.entries(STATE.cart)) {
      const id = Number(idStr);
      const p = byId.get(id);
      if (!p) continue;
      total += p.price * qty;
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <img src="${p.img}" alt="${p.name}">
        <div>
          <div style="font-weight:700">${p.name}</div>
          <div class="muted"><span>${p.price}</span> <span class="currency">зл</span></div>
        </div>
        <div style="display:grid; gap:6px; align-items:center; justify-items:end;">
          <div class="qty">
            <button data-dec="${p.id}">−</button>
            <span>${qty}</span>
            <button data-inc="${p.id}">+</button>
          </div>
          <button class="ghost-btn" data-remove="${p.id}">Удалить</button>
        </div>
      `;
      wrap.appendChild(row);
    }
    $("#cartTotal").textContent = String(total);
    // Bind qty/remove
    $$("[data-dec]").forEach(btn => btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-dec"));
      setQty(id, (STATE.cart[id] || 1) - 1);
    }));
    $$("[data-inc]").forEach(btn => btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-inc"));
      setQty(id, (STATE.cart[id] || 0) + 1);
    }));
    $$("[data-remove]").forEach(btn => btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-remove"));
      removeFromCart(id);
    }));
  }

  // Drawer open/close
  function openCart() {
    $("#cartDrawer")?.classList.add("is-open");
  }
  function closeCart() {
    $("#cartDrawer")?.classList.remove("is-open");
  }

  // Toast
  let toastTimer;
  function showToast(text) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = text;
    t.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-show"), 1400);
  }

  // Simple particle burst FX
  function burstFX() {
    const canvas = $("#fxCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width = window.innerWidth;
    const h = canvas.height = window.innerHeight;
    const parts = Array.from({ length: 40 }, () => ({
      x: w/2, y: 80, // near header
      vx: (Math.random()-0.5)*6,
      vy: -Math.random()*4 - 2,
      r: Math.random()*2+1,
      life: Math.random()*30+20,
      hue: Math.random() < .5 ? 270 : 330
    }));
    let frame = 0;
    function tick() {
      frame++;
      ctx.clearRect(0,0,w,h);
      parts.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life--;
        ctx.beginPath();
        ctx.fillStyle = `hsl(${p.hue}, 90%, ${60 + Math.sin(frame/6)*10}%)`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fill();
      });
      if (frame < 40) requestAnimationFrame(tick);
    }
    tick();
  }

  // Theme toggle
  function initTheme() {
    const saved = localStorage.getItem("arcana_theme");
    if (saved === "light") document.documentElement.setAttribute("data-theme", "light");
    $("#toggleTheme")?.addEventListener("click", () => {
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      document.documentElement.setAttribute("data-theme", isLight ? "dark" : "light");
      localStorage.setItem("arcana_theme", isLight ? "dark" : "light");
    });
  }

  // Bind UI
  function bindUI() {
    $("#cartButton")?.addEventListener("click", openCart);
    $("#closeCart")?.addEventListener("click", closeCart);
    $("#checkoutBtn")?.addEventListener("click", () => showToast("Оформление... (демо)"));
    $("#searchInput")?.addEventListener("input", (e) => {
      STATE.search = e.target.value;
      renderGrid();
    });
    $("#sortSelect")?.addEventListener("change", (e) => {
      STATE.sort = e.target.value;
      renderGrid();
    });
    $("#rarityChips")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      $$(".chip", $("#rarityChips")).forEach(c => c.classList.remove("is-active"));
      btn.classList.add("is-active");
      STATE.rarity = btn.getAttribute("data-rarity");
      renderGrid();
    });
    updateCartCount();
    renderCart();
  }

  function init() {
    initTheme();
    bindUI();
    const productId = Number(window.PRODUCT_ID || 0);
    if (productId) {
      renderProductPage(productId);
    } else {
      renderGrid();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();


