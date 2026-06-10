/* ============================================================
   DUBLON – main.js
   Global JS: Navbar state, Auth, Forms, Interactions
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  checkRouteProtection(); // Primeiro: protege rotas antes de renderizar
  initNavbar();
  initNavActiveState();
  initSidebar();
  initQtyCounters();
  initToggles();
  initMobileMenu();
  updateCartBadgeLocal();
});

// ── Navbar Auth State ────────────────────────────────────────
function initNavbar() {
  const API = window.API;
  if (!API) return;

  const { Auth } = API;
  const user = Auth.getUser();
  const isLoggedIn = Auth.isLoggedIn();

  const loginBtn   = document.querySelector('.navbar-btn-login');
  const actionsEl  = document.querySelector('.navbar-actions');

  // Remove qualquer bloco de usuário injetado anteriormente para evitar duplicatas
  const oldUserEl   = document.getElementById('navbar-user-block');
  const oldLogoutEl = document.getElementById('navbar-logout-btn');
  if (oldUserEl)   oldUserEl.remove();
  if (oldLogoutEl) oldLogoutEl.remove();

  if (isLoggedIn && user) {
    // Oculta botão "Entrar"
    if (loginBtn) loginBtn.style.display = 'none';

    // Atualiza .navbar-user estático se existir, senão injeta dinamicamente
    const staticUser = document.querySelector('.navbar-user');
    if (staticUser) {
      staticUser.style.display = 'flex';
      const avatarEl = staticUser.querySelector('.user-avatar');
      const nameEl   = staticUser.querySelector('.navbar-user-name');
      if (avatarEl) avatarEl.textContent = user.name ? user.name.slice(0, 2).toUpperCase() : 'U';
      if (nameEl)   nameEl.textContent   = user.name ? user.name.split(' ')[0] : 'Usuário';

      // Injeta botão Sair ao lado do avatar estático, se ainda não existe
      if (!staticUser.querySelector('.navbar-btn-logout')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'navbar-btn-logout';
        logoutBtn.id = 'navbar-logout-btn';
        logoutBtn.textContent = 'Sair';
        logoutBtn.setAttribute('title', 'Encerrar sessão');
        logoutBtn.addEventListener('click', handleLogout);
        staticUser.after(logoutBtn);
      }
    } else if (actionsEl && loginBtn) {
      // Injeta dinamicamente avatar + botão Sair antes do botão "Entrar"
      const initials  = user.name ? user.name.slice(0, 2).toUpperCase() : 'U';
      const firstName = user.name ? user.name.split(' ')[0] : 'Usuário';

      const userEl = document.createElement('a');
      userEl.href = 'perfil.html';
      userEl.className = 'navbar-user';
      userEl.id = 'navbar-user-block';
      userEl.innerHTML = `<div class="user-avatar">${initials}</div><span class="navbar-user-name">${firstName}</span>`;

      const logoutBtn = document.createElement('button');
      logoutBtn.className = 'navbar-btn-logout';
      logoutBtn.id = 'navbar-logout-btn';
      logoutBtn.textContent = 'Sair';
      logoutBtn.setAttribute('title', 'Encerrar sessão');
      logoutBtn.addEventListener('click', handleLogout);

      actionsEl.insertBefore(logoutBtn, loginBtn);
      actionsEl.insertBefore(userEl, logoutBtn);
    }
  } else {
    // Não logado: mostra "Entrar", oculta avatar estático
    if (loginBtn) loginBtn.style.display = 'flex';
    const staticUser = document.querySelector('.navbar-user');
    if (staticUser) staticUser.style.display = 'none';
    // Remove botão Sair estático se houver
    const staticLogout = document.querySelector('.navbar-btn-logout');
    if (staticLogout) staticLogout.remove();
  }

  // Sidebar user info
  const sidebarName   = document.querySelector('.sidebar-name');
  const sidebarEmail  = document.querySelector('.sidebar-email');
  const sidebarAvatar = document.querySelector('.sidebar-avatar');

  if (isLoggedIn && user) {
    if (sidebarName)   sidebarName.textContent   = user.name || 'Usuário';
    if (sidebarEmail)  sidebarEmail.textContent  = user.email || '';
    if (sidebarAvatar) sidebarAvatar.textContent = user.name ? user.name.slice(0, 2).toUpperCase() : 'U';
  }

  // Badge de pedidos no sidebar
  loadSidebarOrderBadge();
}

// ── Logout ──────────────────────────────────────────────────
function handleLogout() {
  if (window.API) {
    window.API.Auth.clearSession();
  } else {
    // Fallback manual caso API não esteja carregada
    localStorage.removeItem('dublon_token');
    localStorage.removeItem('dublon_user');
  }
  window.location.href = '/index.html';
}

async function loadSidebarOrderBadge() {
  const badge = document.querySelector('.sidebar-nav-badge');
  if (!badge || !window.API || !window.API.Auth.isLoggedIn()) return;
  try {
    const data = await window.API.OrdersAPI.list({ limit: 1, status: 'andamento' });
    if (data.pagination) badge.textContent = data.pagination.total || '';
  } catch (e) { /* silencioso */ }
}

// ── Proteção de Rotas ────────────────────────────────────────
const PROTECTED_PAGES = ['meus-pedidos.html', 'perfil.html', 'checkout.html'];
const ADMIN_PAGES = ['admin/dashboard.html', 'admin/pedidos.html', 'admin/produtos.html', 'admin/produto-novo.html'];

function checkRouteProtection() {
  if (!window.API) return;
  const { Auth } = window.API;
  const currentPage = window.location.pathname.split('/').pop() || '';
  const fullPath = window.location.pathname;

  const isProtected = PROTECTED_PAGES.some(p => fullPath.includes(p));
  const isAdmin = ADMIN_PAGES.some(p => fullPath.includes(p));

  if (isProtected && !Auth.isLoggedIn()) {
    window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    return;
  }

  if (isAdmin && (!Auth.isLoggedIn() || !Auth.isAdmin())) {
    window.location.href = '/login.html';
    return;
  }
}

// ── Navbar Active State ──────────────────────────────────────
function initNavActiveState() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    const href = item.getAttribute('href');
    if (href && href.includes(currentPage)) {
      item.classList.add('active');
    }
  });
}

// ── Sidebar ──────────────────────────────────────────────────
function initSidebar() {
  const toggle = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

// ── Mobile Menu ──────────────────────────────────────────────
function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const navLinks  = document.querySelector('.navbar-links');
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('mobile-open');
    hamburger.classList.toggle('active');
  });
}

// ── Quantity Counters ────────────────────────────────────────
function initQtyCounters() {
  document.querySelectorAll('.qty-counter').forEach(counter => {
    const input = counter.querySelector('input');
    const minus = counter.querySelector('[data-action="minus"]');
    const plus  = counter.querySelector('[data-action="plus"]');
    if (!input) return;

    if (minus) {
      minus.addEventListener('click', () => {
        const val = parseInt(input.value) || 1;
        const min = parseInt(input.min) || 1;
        if (val > min) {
          input.value = val - 1;
          input.dispatchEvent(new Event('change'));
        }
      });
    }

    if (plus) {
      plus.addEventListener('click', () => {
        const val = parseInt(input.value) || 1;
        const max = parseInt(input.max) || 9999;
        if (val < max) {
          input.value = val + 1;
          input.dispatchEvent(new Event('change'));
        }
      });
    }
  });
}

// ── Toggles ──────────────────────────────────────────────────
function initToggles() {
  document.querySelectorAll('.toggle input[type="checkbox"]').forEach(toggle => {
    toggle.addEventListener('change', () => {
      // Handler customizado pode ser definido no data-handler do elemento
    });
  });
}

// ── Cart Badge (sem API) ─────────────────────────────────────
function updateCartBadgeLocal() {
  try {
    const cartData = localStorage.getItem('dublon_cart_count');
    const count = parseInt(cartData) || 0;
    document.querySelectorAll('.cart-badge').forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'flex' : 'none';
    });
  } catch (e) { /* silencioso */ }
}

// ── Tracking form ────────────────────────────────────────────
async function handleTrackingSearch() {
  const input    = document.getElementById('tracking-input');
  const resultDiv = document.getElementById('tracking-result');
  const btn      = document.getElementById('tracking-btn');
  if (!input || !resultDiv) return;

  const code = input.value.trim().toUpperCase();
  if (!code) {
    window.API?.Toast.warn('Insira o código de rastreio.');
    return;
  }

  // Feedback visual
  if (btn) { btn.disabled = true; btn.innerHTML = '<span>Buscando...</span>'; }

  try {
    const { order, events } = await window.API.OrdersAPI.track(code);
    renderTrackingResult(order, events, resultDiv);
    resultDiv.style.display = 'block';
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    if (btn) { btn.disabled = false; btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> Rastrear'; }
    window.API?.Toast.error(err.message || 'Código não encontrado.');
    resultDiv.style.display = 'none';
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> Rastrear'; }
  }
}

function renderTrackingResult(order, events, container) {
  if (!window.API) return;
  const { StatusMap, Format } = window.API;
  const stepOrder = StatusMap.trackingSteps;
  const currentStepIdx = stepOrder.indexOf(order.status);

  const stepsHtml = stepOrder.map((step, i) => {
    const isDone    = i < currentStepIdx;
    const isActive  = i === currentStepIdx;
    const icon      = isDone ? '✓' : isActive ? (step === 'shipped' ? '📦' : '●') : '○';
    const color     = isDone || isActive ? (isDone ? '#22C55E' : '#2563EB') : '#CBD5E1';
    const event     = events.find(e => e.status === step);

    return `
      <div class="tracking-step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}">
        <div class="tracking-step-icon" style="background:${color};color:#fff;">${icon}</div>
        <div class="tracking-step-label">
          <strong>${StatusMap.trackingLabels[step]}</strong>
          ${event ? `<span>${Format.date(event.event_at)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('<div class="tracking-step-line"></div>');

  const lastEvent = events.length > 0 ? events[events.length - 1] : null;
  const statusInfo = StatusMap.order[order.status] || StatusMap.order['pending'];

  container.innerHTML = `
    <div class="tracking-result-card">
      <div class="tracking-result-header">
        <div>
          <div class="tracking-result-id">${order.order_number}</div>
          <div class="tracking-result-date">Pedido em ${Format.date(order.created_at, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
        <span class="order-status-badge ${statusInfo.cls}" style="color:${statusInfo.color};">${statusInfo.label}</span>
      </div>
      <div class="tracking-steps-row">${stepsHtml}</div>
      ${lastEvent ? `
        <div class="tracking-event-latest">
          <span class="tracking-event-icon">📍</span>
          <div>
            <strong>${lastEvent.description}</strong>
            <div>${lastEvent.location || ''} · ${Format.dateTime(lastEvent.event_at)}</div>
          </div>
        </div>
      ` : ''}
      ${order.estimated_delivery ? `
        <div class="tracking-delivery-estimate">
          <span>📅</span>
          <div>
            <strong>Previsão de entrega: ${Format.date(order.estimated_delivery, { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
            <span>${order.city ? `${order.city}, ${order.state}` : ''}</span>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ── Contact form ─────────────────────────────────────────────
async function handleContactSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn  = form.querySelector('[type="submit"]');

  const payload = {
    first_name: form.querySelector('[name="first_name"]')?.value.trim() || '',
    last_name:  form.querySelector('[name="last_name"]')?.value.trim()  || '',
    name: (form.querySelector('[name="first_name"]')?.value.trim() || '') + ' ' + (form.querySelector('[name="last_name"]')?.value.trim() || ''),
    email:      form.querySelector('[name="email"]')?.value.trim()      || '',
    phone:      form.querySelector('[name="phone"]')?.value.trim()      || '',
    subject:    form.querySelector('[name="subject"]')?.value           || '',
    message:    form.querySelector('[name="message"]')?.value.trim()   || ''
  };

  if (!payload.name.trim() || !payload.email || !payload.message) {
    window.API?.Toast.error('Preencha todos os campos obrigatórios.');
    return;
  }

  const originalText = btn.innerHTML;
  btn.innerHTML = 'Enviando...';
  btn.disabled  = true;

  try {
    await window.API.ContactAPI.send(payload);
    window.API.Toast.success('Mensagem enviada com sucesso! Entraremos em contato em breve.');
    form.reset();
  } catch (err) {
    window.API?.Toast.error(err.message || 'Erro ao enviar mensagem. Tente novamente.');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled  = false;
  }
}

// ── Quote form ───────────────────────────────────────────────
async function handleQuoteSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn  = form.querySelector('[type="submit"]');

  const qtyInput = form.querySelector('.qty-counter input') || form.querySelector('[name="quantity"]');

  const payload = {
    name:         form.querySelector('[name="name"]')?.value.trim()         || '',
    email:        form.querySelector('[name="email"]')?.value.trim()        || '',
    company:      form.querySelector('[name="company"]')?.value.trim()      || '',
    phone:        form.querySelector('[name="phone"]')?.value.trim()        || '',
    product_type: form.querySelector('[name="product_type"]')?.value        || '',
    quantity:     parseInt(qtyInput?.value) || 100,
    message:      form.querySelector('[name="message"]')?.value.trim()      || ''
  };

  if (!payload.name || !payload.email) {
    window.API?.Toast.error('Preencha nome e e-mail.');
    return;
  }

  const originalText = btn.innerHTML;
  btn.innerHTML = '→ Enviando...';
  btn.disabled  = true;

  try {
    await window.API.QuoteAPI.submit(payload);
    window.API.Toast.success('Orçamento solicitado! Você receberá uma proposta em até 24 horas.');
    form.reset();
    if (qtyInput) qtyInput.value = '100';
  } catch (err) {
    window.API?.Toast.error(err.message || 'Erro ao enviar orçamento. Tente novamente.');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled  = false;
  }
}

// ── Format currency ──────────────────────────────────────────
function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// ── Run route protection ─────────────────────────────────────
if (window.API) {
  checkRouteProtection();
}
