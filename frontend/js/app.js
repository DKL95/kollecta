/* ==========================================================================
   KollectA — Lógica de interacción del mockup
   Todo corre en el cliente contra js/data.js (sin backend). El objetivo es
   que las pantallas se sientan vivas: filtros, likes, follows, carrito, etc.
   ========================================================================== */

/* ---------------------------------------------------------------- helpers */
function qs(param) {
  return new URLSearchParams(window.location.search).get(param);
}

function money(n) {
  return "$" + Number(n).toLocaleString("es-MX");
}

function photoLayer(src, alt) {
  return src ? `<img class="thumb-photo" src="${src}" alt="${alt}" loading="lazy" onerror="this.remove()" />` : "";
}

function productCardHtml(p) {
  const priceHtml =
    p.mode === "Intercambio"
      ? `<span class="price" style="color:var(--cyan);">🔁 Intercambio</span>`
      : `<span class="price">${money(p.price)} <small>MXN</small></span>`;
  return `
    <a class="card product-card" href="product.html?id=${p.id}">
      <div class="thumb" style="background: var(--gradient-card);">
        <span>${p.emoji}</span>
        ${photoLayer(p.img, p.title)}
        <span class="tag pill ${p.mode === "Intercambio" ? "cyan" : "pink"}">${p.tag}</span>
        <span class="fav">🤍</span>
      </div>
      <div class="body">
        <div class="group-name">${p.group}</div>
        <div class="title">${p.title}</div>
        <div class="price-row">${priceHtml}</div>
        <div class="seller">
          <span class="avatar">${p.sellerInit}</span>
          <span>@${p.seller}</span>
        </div>
      </div>
    </a>`;
}

function groupCardHtml(g, following) {
  return `
    <div class="card group-card">
      <a href="group-detail.html?group=${encodeURIComponent(g.name)}">
        <span class="avatar" style="width:68px;height:68px;font-size:16px; background:${g.color}; position:relative; overflow:hidden;">
          ${g.initials}
          ${g.img ? `<img src="${g.img}" alt="${g.name}" loading="lazy" onerror="this.remove()" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;" />` : ""}
        </span>
        <h4>${g.name}</h4>
      </a>
      <div class="meta">${g.fandom} · debut ${g.debut}</div>
      <button class="btn ${following ? "btn-secondary" : "btn-primary"} btn-sm follow-btn" data-group="${g.name}">
        ${following ? "✓ Siguiendo" : "+ Seguir"}
      </button>
    </div>`;
}

function collectionItemHtml(item) {
  return `
    <div class="card collection-item product-card">
      <div class="thumb" style="background: var(--gradient-card); font-size:34px;">
        <span>${item.emoji}</span>
        ${photoLayer(item.img, item.title)}
      </div>
      <div class="body">
        <div class="meta" style="text-transform:uppercase; font-size:10.5px; color:var(--text-faint); font-weight:800;">${item.group}</div>
        <div class="title">${item.title}</div>
        <div class="meta">Valor estimado ${money(item.value)}</div>
      </div>
    </div>`;
}

function friendRowHtml(f) {
  return `
    <div class="mini-row">
      <span class="avatar" style="position:relative;">${f.initials}</span>
      <div class="info">
        <div class="n">${f.name}</div>
        <div class="s">${f.mutual} amigos en común ${f.online ? "· 🟢 en línea" : ""}</div>
      </div>
      <button class="icon-btn" style="width:32px;height:32px;font-size:13px;">💬</button>
    </div>`;
}

function postHtml(post) {
  return `
    <article class="card post" data-group="${post.tag}">
      <div class="post-head">
        <span class="avatar">${post.initials}</span>
        <div>
          <div class="name">${post.user} <span class="handle">${post.handle}</span></div>
          <div class="time">${post.time} · <span class="pill pink" style="padding:1px 8px;">${post.tag}</span></div>
        </div>
        <span class="more">⋯</span>
      </div>
      <p class="post-text">${post.text}</p>
      ${post.media ? `<div class="post-media" style="background: var(--gradient-card);">${post.media}</div>` : ""}
      <div class="post-actions">
        <button class="post-action-btn like-btn ${post.liked ? "liked" : ""}" data-liked="${post.liked}">
          <span class="ic">${post.liked ? "❤️" : "🤍"}</span> <span class="count">${post.likes}</span>
        </button>
        <button class="post-action-btn"><span>💬</span> ${post.comments}</button>
        <button class="post-action-btn"><span>🔁</span> ${post.shares}</button>
        <button class="post-action-btn"><span>📤</span> Compartir</button>
      </div>
    </article>`;
}

/* ------------------------------------------------------------- page: home */
function initHome() {
  const feedList = document.getElementById("feed-list");
  if (!feedList) return;

  const composerAvatar = document.getElementById("composer-avatar");
  if (composerAvatar) composerAvatar.insertAdjacentHTML("beforeend", photoLayer(KOLLECTA_DATA.currentUser.avatarImg, KOLLECTA_DATA.currentUser.name));

  function renderFeed(filter) {
    const posts = KOLLECTA_DATA.posts.filter((p) => filter === "Todos" || p.tag === filter);
    feedList.innerHTML =
      posts.map(postHtml).join("") ||
      `<div class="empty-state"><div class="emoji">🫙</div>No hay publicaciones de ${filter} todavía.</div>`;

    feedList.querySelectorAll(".like-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const liked = btn.dataset.liked === "true";
        const countEl = btn.querySelector(".count");
        const icEl = btn.querySelector(".ic");
        const count = parseInt(countEl.textContent, 10);
        btn.dataset.liked = (!liked).toString();
        btn.classList.toggle("liked", !liked);
        icEl.textContent = !liked ? "❤️" : "🤍";
        countEl.textContent = liked ? count - 1 : count + 1;
      });
    });
  }

  document.getElementById("side-groups").innerHTML = KOLLECTA_DATA.groups
    .slice(0, 4)
    .map((g) => `
      <div class="mini-row">
        <span class="avatar" style="background:${g.color};">${g.initials}</span>
        <div class="info"><div class="n">${g.name}</div><div class="s">${g.fandom}</div></div>
        <button class="btn btn-secondary btn-sm">Seguir</button>
      </div>`)
    .join("");

  document.getElementById("side-friends").innerHTML = KOLLECTA_DATA.friends
    .slice(0, 4)
    .map(friendRowHtml)
    .join("");

  const filters = document.getElementById("feed-filters");
  filters.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    filters.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    renderFeed(chip.dataset.filter);
  });

  document.getElementById("composer-post").addEventListener("click", () => {
    const input = document.getElementById("composer-input");
    if (!input.value.trim()) return;
    KOLLECTA_DATA.posts.unshift({
      user: KOLLECTA_DATA.currentUser.name, initials: KOLLECTA_DATA.currentUser.initials,
      handle: KOLLECTA_DATA.currentUser.handle, time: "justo ahora",
      text: input.value.trim(), media: null, tag: "BTS", likes: 0, comments: 0, shares: 0, liked: false,
    });
    input.value = "";
    renderFeed(document.querySelector("#feed-filters .chip.active").dataset.filter);
  });

  renderFeed("Todos");
}

/* ------------------------------------------------------- page: marketplace */
function initMarketplace() {
  const grid = document.getElementById("market-grid");
  if (!grid) return;

  let activeGroup = "Todos";
  let activeMode = "Todos";

  function render() {
    const items = KOLLECTA_DATA.products.filter(
      (p) => (activeGroup === "Todos" || p.group === activeGroup) && (activeMode === "Todos" || p.mode === activeMode)
    );
    grid.innerHTML = items.map(productCardHtml).join("") || `<div class="empty-state"><div class="emoji">🔍</div>Sin resultados con estos filtros.</div>`;
    document.getElementById("market-count").textContent = `${items.length} artículo${items.length === 1 ? "" : "s"} encontrado${items.length === 1 ? "" : "s"}`;
  }

  document.getElementById("market-filters").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    document.querySelectorAll("#market-filters .chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    activeGroup = chip.dataset.filter;
    render();
  });

  document.querySelectorAll(".tabs .tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tabs .tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      activeMode = tab.dataset.mode;
      render();
    });
  });

  render();
}

/* ------------------------------------------------------------ page: product */
function initProductDetail() {
  const galleryMain = document.getElementById("pd-gallery-main");
  if (!galleryMain) return;

  const id = qs("id") || "p1";
  const p = KOLLECTA_DATA.products.find((x) => x.id === id) || KOLLECTA_DATA.products[0];

  document.getElementById("pd-group").textContent = p.group;
  document.getElementById("pd-title").textContent = p.title;
  document.getElementById("pd-badges").innerHTML = `<span class="pill pink">${p.tag}</span><span class="pill purple">${p.type}</span>`;
  galleryMain.style.background = "var(--gradient-card)";
  galleryMain.style.position = "relative";
  galleryMain.innerHTML = `<span>${p.emoji}</span>${photoLayer(p.img, p.title)}`;
  document.getElementById("pd-gallery-thumbs").innerHTML = [p.emoji, "🃏", "📦", "🔖"]
    .map((e, i) => `<div class="thumb-sm card ${i === 0 ? "active" : ""}" style="background: var(--gradient-card);">${e}</div>`)
    .join("");

  const priceBlock = document.getElementById("pd-price-block");
  priceBlock.innerHTML =
    p.mode === "Intercambio"
      ? `<span class="amount" style="color:var(--cyan); font-size:22px;">🔁 Disponible para intercambio</span>`
      : `<span class="amount">${money(p.price)}</span><span style="color:var(--text-faint); font-size:13px;">MXN</span>`;

  document.getElementById("pd-desc").textContent =
    `Pieza ${p.tag.toLowerCase()} de ${p.group}. ${p.mode === "Intercambio" ? "El vendedor busca intercambiarla por otra pieza equivalente." : "Venta directa con envío a todo México."} Consulta con @${p.seller} para más fotos o detalles de autenticidad.`;
  document.getElementById("pd-type").textContent = p.type;
  document.getElementById("pd-condition").textContent = p.tag;

  document.getElementById("pd-opt-venta").classList.toggle("active", p.mode !== "Intercambio");
  document.getElementById("pd-opt-trade").classList.toggle("active", p.mode === "Intercambio");
  document.getElementById("pd-add-cart").textContent = p.mode === "Intercambio" ? "🔁 Proponer intercambio" : "🧺 Agregar al carrito";

  document.getElementById("pd-seller").innerHTML = `
    <span class="avatar">${p.sellerInit}</span>
    <div class="info">
      <div class="n">@${p.seller}</div>
      <div class="s">⭐ 4.8 · 56 ventas completadas</div>
    </div>
    <a href="profile.html" class="btn btn-secondary btn-sm">Ver perfil</a>`;

  document.getElementById("pd-add-cart").addEventListener("click", () => {
    alert(p.mode === "Intercambio" ? "Propuesta de intercambio enviada (simulado)." : "Artículo agregado al carrito (simulado).");
  });
  document.getElementById("pd-message").addEventListener("click", () => {
    window.location.href = "messages.html";
  });
}

/* --------------------------------------------------------------- page: sell */
function initSell() {
  const toggle = document.getElementById("s-mode-toggle");
  if (!toggle) return;

  function syncPreview() {
    document.getElementById("preview-title").textContent = document.getElementById("s-title").value || "Título de tu artículo";
    document.getElementById("preview-group").textContent = document.getElementById("s-group").value;
    const emojiMap = { Photocard: "🃏", Álbum: "💿", Lightstick: "🔮", Ropa: "🧥", Poster: "🖼️", Accesorio: "🔑" };
    document.getElementById("preview-emoji").textContent = emojiMap[document.getElementById("s-type").value] || "🎁";
    const mode = toggle.querySelector(".opt.active").dataset.mode;
    const priceEl = document.getElementById("preview-price");
    const modeTag = document.getElementById("preview-mode");
    modeTag.textContent = mode;
    if (mode === "Intercambio") {
      priceEl.innerHTML = `🔁 Intercambio`;
      modeTag.className = "tag pill cyan";
    } else {
      const price = document.getElementById("s-price").value || 0;
      priceEl.innerHTML = `${money(price)} <small>MXN</small>`;
      modeTag.className = "tag pill pink";
    }
  }

  toggle.addEventListener("click", (e) => {
    const opt = e.target.closest(".opt");
    if (!opt) return;
    toggle.querySelectorAll(".opt").forEach((o) => o.classList.remove("active"));
    opt.classList.add("active");
    const mode = opt.dataset.mode;
    document.getElementById("s-price-row").style.display = mode === "Intercambio" ? "none" : "flex";
    document.getElementById("s-trade-for").style.display = mode === "Venta" ? "none" : "flex";
    syncPreview();
  });

  ["s-title", "s-group", "s-type", "s-price"].forEach((id) => {
    document.getElementById(id).addEventListener("input", syncPreview);
    document.getElementById(id).addEventListener("change", syncPreview);
  });

  document.getElementById("sell-form").addEventListener("submit", (e) => {
    e.preventDefault();
    alert("¡Artículo publicado! (simulado — este mockup aún no tiene backend)");
    window.location.href = "marketplace.html";
  });

  syncPreview();
}

/* --------------------------------------------------------- page: collection */
function initCollection() {
  const grid = document.getElementById("collection-grid");
  if (!grid) return;

  function render(filter) {
    const items = KOLLECTA_DATA.myCollection.filter((i) => filter === "Todos" || i.group === filter);
    grid.innerHTML = items.map(collectionItemHtml).join("");
  }

  document.getElementById("collection-filters").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    document.querySelectorAll("#collection-filters .chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    render(chip.dataset.filter);
  });

  render("Todos");
}

/* ------------------------------------------------------------- page: profile */
function initProfile() {
  const grid = document.getElementById("profile-collection-grid");
  if (!grid) return;
  grid.innerHTML = KOLLECTA_DATA.myCollection.map(collectionItemHtml).join("");

  const coverAvatar = document.getElementById("profile-cover-avatar");
  if (coverAvatar) coverAvatar.insertAdjacentHTML("beforeend", photoLayer(KOLLECTA_DATA.currentUser.avatarImg, KOLLECTA_DATA.currentUser.name));
}

/* -------------------------------------------------------------- page: groups */
function initGroups() {
  const grid = document.getElementById("groups-grid");
  if (!grid) return;

  const followed = new Set(["BTS", "ITZY", "aespa"]);

  function render() {
    grid.innerHTML = KOLLECTA_DATA.groups.map((g) => groupCardHtml(g, followed.has(g.name))).join("");
    grid.querySelectorAll(".follow-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const name = btn.dataset.group;
        followed.has(name) ? followed.delete(name) : followed.add(name);
        render();
      });
    });
  }
  render();
}

/* --------------------------------------------------------- page: group-detail */
function initGroupDetail() {
  const nameEl = document.getElementById("gd-name");
  if (!nameEl) return;

  const name = qs("group") || "BTS";
  const g = KOLLECTA_DATA.groups.find((x) => x.name === name) || KOLLECTA_DATA.groups[0];

  const gdCover = document.getElementById("gd-cover");
  gdCover.style.background = g.color;
  gdCover.style.position = "relative";
  const coverImgSrc = g.img ? g.img.replace("/groups/", "/covers/") : null;
  const existingCoverImg = gdCover.querySelector(".cover-photo");
  if (existingCoverImg) existingCoverImg.remove();
  if (coverImgSrc) {
    gdCover.insertAdjacentHTML(
      "afterbegin",
      `<img class="cover-photo" src="${coverImgSrc}" alt="${g.name}" loading="lazy" onerror="this.remove()" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;" />`
    );
  }
  document.getElementById("gd-avatar").innerHTML = `${g.initials}${photoLayer(g.img, g.name)}`;
  document.getElementById("gd-avatar").style.background = "rgba(255,255,255,0.25)";
  document.getElementById("gd-avatar").style.position = "relative";
  document.getElementById("gd-avatar").style.overflow = "hidden";
  nameEl.textContent = g.name;
  document.getElementById("gd-meta").textContent = `${g.agency} · Fandom: ${g.fandom}`;
  document.getElementById("gd-members").textContent = g.members;
  document.getElementById("gd-debut").textContent = g.debut;
  document.getElementById("gd-fans-stat").querySelector("b").textContent = (g.members * 611).toLocaleString("es-MX");
  const products = KOLLECTA_DATA.products.filter((p) => p.group === g.name);
  document.getElementById("gd-listings").textContent = products.length;
  document.getElementById("gd-products-grid").innerHTML =
    products.map(productCardHtml).join("") || `<div class="empty-state"><div class="emoji">📦</div>Aún no hay merch de ${g.name} publicado.</div>`;

  const followBtn = document.getElementById("gd-follow-btn");
  let following = false;
  followBtn.addEventListener("click", () => {
    following = !following;
    followBtn.textContent = following ? "✓ Siguiendo" : "+ Seguir grupo";
    followBtn.className = following ? "btn btn-secondary" : "btn btn-primary";
  });
}

/* ------------------------------------------------------------ page: messages */
function initMessages() {
  const list = document.getElementById("thread-list");
  if (!list) return;

  let activeIdx = 0;

  const chatScripts = [
    [
      { mine: false, text: "Hola! Vi tu photocard de Jimin, ¿sigue disponible?" },
      { mine: true, text: "¡Hola! Sí, todavía la tengo 🙌" },
      { mine: false, text: "¿Aceptas $250 en vez de $280?" },
      { mine: true, text: "Te la dejo en $265 y va con funda protectora 😊" },
    ],
    [
      { mine: false, text: "Va el intercambio, te mando la mía primero." },
      { mine: true, text: "Perfecto, en cuanto la reciba te mando la mía 🔁" },
    ],
    [
      { mine: false, text: "Nos vemos el sábado en la reunión 🍊" },
      { mine: true, text: "Ahí estaré! Llevo mi colección de SEVENTEEN" },
    ],
    [
      { mine: false, text: "Gracias! ya llegó el paquete 📦" },
      { mine: true, text: "Qué bueno! Espero disfrutes tu photocard 💜" },
    ],
    [{ mine: false, text: "Escribiendo…" }],
  ];

  function renderThreads() {
    list.innerHTML = KOLLECTA_DATA.threads
      .map(
        (t, i) => `
      <div class="thread-item ${i === activeIdx ? "active" : ""}" data-idx="${i}">
        <span class="avatar" style="position:relative;">${t.initials}</span>
        <div class="info">
          <div class="top-line"><span class="n">${t.name}</span><span class="t">${t.time}</span></div>
          <div class="preview">${t.preview}</div>
        </div>
        ${t.unread ? `<span class="unread">${t.unread}</span>` : ""}
      </div>`
      )
      .join("");

    list.querySelectorAll(".thread-item").forEach((el) => {
      el.addEventListener("click", () => {
        activeIdx = parseInt(el.dataset.idx, 10);
        renderThreads();
        renderChat();
      });
    });
  }

  function renderChat() {
    const t = KOLLECTA_DATA.threads[activeIdx];
    document.getElementById("chat-head").innerHTML = `
      <span class="avatar">${t.initials}</span>
      <div>
        <div class="n">${t.name}</div>
        <div class="status">${t.online ? "🟢 En línea" : "Desconectado"}</div>
      </div>`;
    const body = document.getElementById("chat-body");
    body.innerHTML = chatScripts[activeIdx]
      .map(
        (m) => `
      <div class="msg-row ${m.mine ? "mine" : ""}">
        <span class="avatar" style="width:28px;height:28px;font-size:10px;">${m.mine ? KOLLECTA_DATA.currentUser.initials : t.initials}</span>
        <div class="bubble">${m.text}</div>
      </div>`
      )
      .join("");
    body.scrollTop = body.scrollHeight;
  }

  document.getElementById("chat-send").addEventListener("click", () => {
    const input = document.getElementById("chat-input");
    if (!input.value.trim()) return;
    chatScripts[activeIdx].push({ mine: true, text: input.value.trim() });
    input.value = "";
    renderChat();
  });
  document.getElementById("chat-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("chat-send").click();
  });

  renderThreads();
  renderChat();
}

/* ----------------------------------------------------------------- page: cart */
function initCart() {
  const list = document.getElementById("cart-list");
  if (!list) return;

  const cartItems = [
    { p: KOLLECTA_DATA.products.find((x) => x.id === "p2"), qty: 1 },
    { p: KOLLECTA_DATA.products.find((x) => x.id === "p4"), qty: 1 },
    { p: KOLLECTA_DATA.products.find((x) => x.id === "p8"), qty: 2 },
  ];

  function render() {
    list.innerHTML = cartItems
      .map(
        (item, i) => `
      <div class="card cart-row">
        <div class="thumb-sm" style="background: var(--gradient-card);">${item.p.emoji}</div>
        <div class="info">
          <div class="t">${item.p.title}</div>
          <div class="s">${item.p.group} · @${item.p.seller}</div>
        </div>
        <div class="qty-stepper">
          <button data-i="${i}" data-d="-1">−</button>
          <span>${item.qty}</span>
          <button data-i="${i}" data-d="1">+</button>
        </div>
        <div style="font-weight:800; color:var(--gold); width:80px; text-align:right;">${money(item.p.price * item.qty)}</div>
      </div>`
      )
      .join("");

    const subtotal = cartItems.reduce((sum, i) => sum + i.p.price * i.qty, 0);
    const fee = Math.round(subtotal * 0.05);
    document.getElementById("cart-count").textContent = cartItems.reduce((s, i) => s + i.qty, 0);
    document.getElementById("cart-subtotal").textContent = money(subtotal);
    document.getElementById("cart-fee").textContent = money(fee);
    document.getElementById("cart-total").textContent = money(subtotal + fee + 99);

    list.querySelectorAll(".qty-stepper button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = parseInt(btn.dataset.i, 10);
        const d = parseInt(btn.dataset.d, 10);
        cartItems[i].qty = Math.max(1, cartItems[i].qty + d);
        render();
      });
    });
  }

  render();
}

/* ---------------------------------------------------------- page: notifications */
function initNotifications() {
  const list = document.getElementById("notif-list");
  if (!list) return;
  list.innerHTML = KOLLECTA_DATA.notifications
    .map(
      (n) => `
    <div class="notif-row ${n.unread ? "unread" : ""}">
      <div class="ic-badge" style="background: var(--gradient-card);">${n.icon}</div>
      <div>
        <div class="txt">${n.text}</div>
        <div class="time">${n.time}</div>
      </div>
    </div>`
    )
    .join("");
}

/* ------------------------------------------------------------------ page: search */
function initSearch() {
  const pGrid = document.getElementById("search-products");
  if (!pGrid) return;
  pGrid.innerHTML = KOLLECTA_DATA.products.slice(0, 4).map(productCardHtml).join("");
  document.getElementById("search-groups").innerHTML = KOLLECTA_DATA.groups.slice(0, 4).map((g) => groupCardHtml(g, false)).join("");
  document.getElementById("search-people").innerHTML = KOLLECTA_DATA.friends
    .map(
      (f) => `
    <div class="card group-card">
      <span class="avatar" style="width:68px;height:68px;font-size:20px;">${f.initials}</span>
      <h4>${f.name}</h4>
      <div class="meta">${f.handle}</div>
      <button class="btn btn-primary btn-sm follow-btn">+ Seguir</button>
    </div>`
    )
    .join("");
}

/* ------------------------------------------------------------------------ init */
document.addEventListener("DOMContentLoaded", () => {
  initHome();
  initMarketplace();
  initProductDetail();
  initSell();
  initCollection();
  initProfile();
  initGroups();
  initGroupDetail();
  initMessages();
  initCart();
  initNotifications();
  initSearch();
});
