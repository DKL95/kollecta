/* ==========================================================================
   KollectA — Navegación compartida
   Pinta sidebar / topbar / bottom-nav en cada pantalla interna y controla
   el "gate" de sesión simulado (localStorage) para el flujo de login.
   ========================================================================== */

const NAV_SECTIONS = [
  {
    label: "Menú",
    items: [
      { key: "home", label: "Inicio", icon: "🏠", href: "home.html" },
      { key: "search", label: "Buscar", icon: "🔍", href: "search.html" },
      { key: "notifications", label: "Notificaciones", icon: "🔔", href: "notifications.html", count: 3 },
      { key: "messages", label: "Mensajes", icon: "💬", href: "messages.html", count: 3 },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { key: "marketplace", label: "Explorar merch", icon: "🛍️", href: "marketplace.html" },
      { key: "sell", label: "Vender / Intercambiar", icon: "➕", href: "sell.html" },
      { key: "cart", label: "Carrito", icon: "🧺", href: "cart.html" },
    ],
  },
  {
    label: "Comunidad",
    items: [
      { key: "collection", label: "Mi colección", icon: "🗂️", href: "collection.html" },
      { key: "groups", label: "Grupos", icon: "⭐", href: "groups.html" },
      { key: "profile", label: "Mi perfil", icon: "👤", href: "profile.html" },
    ],
  },
];

const BOTTOM_NAV_ITEMS = [
  { key: "home", label: "Inicio", icon: "🏠", href: "home.html" },
  { key: "marketplace", label: "Tienda", icon: "🛍️", href: "marketplace.html" },
  { key: "sell", label: "Vender", icon: "➕", href: "sell.html" },
  { key: "messages", label: "Chats", icon: "💬", href: "messages.html" },
  { key: "profile", label: "Perfil", icon: "👤", href: "profile.html" },
];

const PUBLIC_PAGES = ["login", "register"];

function userAvatarHtml(size, fontSize) {
  const user = KOLLECTA_DATA.currentUser;
  const img = user.avatarImg
    ? `<img src="${user.avatarImg}" alt="${user.name}" loading="lazy" onerror="this.remove()" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;" />`
    : "";
  return `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${fontSize}px; position:relative; overflow:hidden;">${user.initials}${img}</span>`;
}

function kollectaAuthGate() {
  const page = document.body.dataset.page;
  if (PUBLIC_PAGES.includes(page)) return;
  const isAuthed = localStorage.getItem("kollecta_auth") === "1";
  if (!isAuthed) {
    window.location.href = "index.html";
  }
}

function renderSidebar() {
  const mount = document.getElementById("sidebar");
  if (!mount) return;
  const active = document.body.dataset.page;
  const user = KOLLECTA_DATA.currentUser;

  const sectionsHtml = NAV_SECTIONS.map((section) => `
    <div class="nav-group">
      <div class="nav-label">${section.label}</div>
      ${section.items
        .map(
          (item) => `
        <a class="nav-link ${active === item.key ? "active" : ""}" href="${item.href}">
          <span class="ic">${item.icon}</span>
          <span>${item.label}</span>
          ${item.count ? `<span class="count">${item.count}</span>` : ""}
        </a>`
        )
        .join("")}
    </div>
  `).join("");

  mount.innerHTML = `
    <a class="brand-lockup" href="home.html">
      <span class="mark">💜</span>
      <span>Kollect<span class="gradient-text">A</span></span>
    </a>
    ${sectionsHtml}
    <div class="sidebar-cta">
      <h4>¿Nueva pieza en tu colección?</h4>
      <p>Publícala en segundos y encuentra comprador o intercambio.</p>
      <a class="btn btn-primary btn-sm btn-block" href="sell.html">+ Publicar merch</a>
    </div>
    <div class="sidebar-user">
      ${userAvatarHtml(38, 13)}
      <div class="info">
        <div class="name">${user.name}</div>
        <div class="handle">${user.handle}</div>
      </div>
      <button id="logout-btn" title="Cerrar sesión">⏻</button>
    </div>
  `;

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("kollecta_auth");
      window.location.href = "index.html";
    });
  }
}

function renderTopbar() {
  const mount = document.getElementById("topbar");
  if (!mount) return;
  const title = document.body.dataset.title || "";
  const subtitle = document.body.dataset.subtitle || "";

  mount.innerHTML = `
    <div>
      <h1>${title}</h1>
      ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ""}
    </div>
    <label class="search-box">
      <span>🔍</span>
      <input type="text" placeholder="Buscar grupos, merch o personas…" />
    </label>
    <div class="topbar-actions">
      <a class="icon-btn" href="notifications.html" title="Notificaciones">🔔<span class="badge-dot"></span></a>
      <a class="icon-btn" href="cart.html" title="Carrito">🧺</a>
      <a href="profile.html">${userAvatarHtml(38, 13)}</a>
    </div>
  `;
}

function renderBottomNav() {
  const mount = document.getElementById("bottom-nav");
  if (!mount) return;
  const active = document.body.dataset.page;
  mount.innerHTML = BOTTOM_NAV_ITEMS.map(
    (item) => `
    <a href="${item.href}" class="${active === item.key ? "active" : ""}">
      <span>${item.icon}</span>
      <span>${item.label}</span>
    </a>`
  ).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  kollectaAuthGate();
  renderSidebar();
  renderTopbar();
  renderBottomNav();
});
