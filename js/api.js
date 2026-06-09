/* ============================================================
   DUBLON – api.js
   Módulo centralizado para comunicação com a API REST
   ============================================================ */

const API_BASE = '/api';
const TOKEN_KEY = 'dublon_token';
const USER_KEY  = 'dublon_user';
const SESSION_KEY = 'dublon_session_id';

// ── Sessão anônima para carrinho ────────────────────────────
function getOrCreateSessionId() {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).substr(2, 16) + Date.now();
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

// ── Auth helpers ────────────────────────────────────────────
const Auth = {
  getToken()   { return localStorage.getItem(TOKEN_KEY); },
  getUser()    {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); }
    catch { return null; }
  },
  setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  isLoggedIn() { return !!this.getToken(); },
  isAdmin()    { const u = this.getUser(); return u && u.role === 'admin'; }
};

// ── HTTP Helpers ─────────────────────────────────────────────
async function request(method, endpoint, body = null, requiresAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  const token = Auth.getToken();

  if (requiresAuth || token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Sempre envia session-id para suporte a carrinho anônimo
  headers['X-Session-Id'] = getOrCreateSessionId();

  const options = { method, headers };
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw { status: response.status, message: data.error || 'Erro desconhecido.' };
  }

  return data;
}

const apiGet    = (endpoint, auth)     => request('GET',    endpoint, null, auth);
const apiPost   = (endpoint, body, a)  => request('POST',   endpoint, body, a);
const apiPut    = (endpoint, body, a)  => request('PUT',    endpoint, body, a);
const apiDelete = (endpoint, a)        => request('DELETE',  endpoint, null, a);

// ── Auth API ─────────────────────────────────────────────────
const AuthAPI = {
  async login(email, password) {
    const data = await apiPost('/auth/login', { email, password });
    Auth.setSession(data.token, data.user);
    return data;
  },

  async register(payload) {
    const data = await apiPost('/auth/register', payload);
    Auth.setSession(data.token, data.user);
    return data;
  },

  async me() {
    return apiGet('/auth/me', true);
  },

  logout() {
    Auth.clearSession();
    window.location.href = '/index.html';
  }
};

// ── Products API ─────────────────────────────────────────────
const ProductsAPI = {
  list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiGet(`/products${qs ? '?' + qs : ''}`);
  },
  get(id)    { return apiGet(`/products/${id}`); },
  listAdmin(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiGet(`/products/admin/all${qs ? '?' + qs : ''}`, true);
  },
  create(data)    { return apiPost('/products', data, true); },
  update(id, data){ return apiPut(`/products/${id}`, data, true); },
  deactivate(id)  { return apiDelete(`/products/${id}`, true); }
};

// ── Categories API ────────────────────────────────────────────
const CategoriesAPI = {
  list() { return apiGet('/categories'); }
};

// ── Orders API ────────────────────────────────────────────────
const OrdersAPI = {
  list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiGet(`/orders${qs ? '?' + qs : ''}`, true);
  },
  get(id)     { return apiGet(`/orders/${id}`, true); },
  track(code) { return apiGet(`/orders/track/${encodeURIComponent(code)}`); },
  create(data){ return apiPost('/orders', data, true); },
  cancel(id)  { return apiPost(`/orders/${id}/cancel`, {}, true); },
  updateStatus(id, status, extra = {}) {
    return apiPut(`/orders/${id}/status`, { status, ...extra }, true);
  }
};

// ── Cart API ─────────────────────────────────────────────────
const CartAPI = {
  get()              { return apiGet('/cart'); },
  add(product_id, quantity, color, size) {
    return apiPost('/cart', { product_id, quantity, color, size });
  },
  update(id, quantity) { return apiPut(`/cart/${id}`, { quantity }); },
  remove(id)           { return apiDelete(`/cart/${id}`); },
  clear()              { return apiDelete('/cart'); }
};

// ── Coupons API ───────────────────────────────────────────────
const CouponsAPI = {
  validate(code, order_value) {
    return apiPost('/coupons/validate', { code, order_value });
  }
};

// ── Users API ─────────────────────────────────────────────────
const UsersAPI = {
  getProfile()          { return apiGet('/users/profile', true); },
  updateProfile(data)   { return apiPut('/users/profile', data, true); },
  updatePassword(data)  { return apiPut('/users/password', data, true); },
  updateNotifications(d){ return apiPut('/users/notifications', d, true); },
  addAddress(data)      { return apiPost('/users/addresses', data, true); },
  updateAddress(id, d)  { return apiPut(`/users/addresses/${id}`, d, true); },
  deleteAddress(id)     { return apiDelete(`/users/addresses/${id}`, true); },
  deleteAccount()       { return apiDelete('/users/account', true); }
};

// ── Contact API ───────────────────────────────────────────────
const ContactAPI = {
  send(data) { return apiPost('/contact', data); }
};

// ── Quote API ─────────────────────────────────────────────────
const QuoteAPI = {
  submit(data) { return apiPost('/quote', data); }
};

// ── Dashboard API ─────────────────────────────────────────────
const DashboardAPI = {
  get() { return apiGet('/dashboard', true); }
};

// ── Toast notifications ───────────────────────────────────────
const Toast = {
  container: null,

  init() {
    if (document.getElementById('toast-container')) return;
    const div = document.createElement('div');
    div.id = 'toast-container';
    div.style.cssText = `
      position: fixed; top: 24px; right: 24px; z-index: 9999;
      display: flex; flex-direction: column; gap: 10px; pointer-events: none;
    `;
    document.body.appendChild(div);
    this.container = div;
  },

  show(message, type = 'success', duration = 4000) {
    if (!this.container) this.init();

    const colors = {
      success: { bg: '#22C55E', icon: '✓' },
      error:   { bg: '#EF4444', icon: '✕' },
      info:    { bg: '#3B82F6', icon: 'ℹ' },
      warn:    { bg: '#F59E0B', icon: '⚠' }
    };
    const { bg, icon } = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: ${bg}; color: #fff; padding: 14px 20px; border-radius: 10px;
      display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 500;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15); pointer-events: all; max-width: 360px;
      animation: slideInRight 0.3s ease; font-family: 'Inter', sans-serif;
    `;
    toast.innerHTML = `<span style="font-size:16px;font-weight:700;">${icon}</span><span>${message}</span>`;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(msg, d) { this.show(msg, 'success', d); },
  error(msg, d)   { this.show(msg, 'error', d); },
  info(msg, d)    { this.show(msg, 'info', d); },
  warn(msg, d)    { this.show(msg, 'warn', d); }
};

// ── Formatters ────────────────────────────────────────────────
const Format = {
  currency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  },
  date(dateStr, options = {}) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', options);
  },
  dateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR');
  }
};

// ── Status mappings ───────────────────────────────────────────
const StatusMap = {
  order: {
    pending:          { label: '● Pendente',       cls: 'order-status-processando', color: '#2563EB' },
    processing:       { label: '● Processando',    cls: 'order-status-processando', color: '#2563EB' },
    in_production:    { label: '⚙ Em Produção',    cls: 'order-status-processando', color: '#7C3AED' },
    shipped:          { label: '⟳ Em Trânsito',   cls: 'order-status-transito',    color: '#B45309' },
    out_for_delivery: { label: '🚚 Saiu p/ entrega', cls: 'order-status-transito', color: '#D97706' },
    delivered:        { label: '✓ Entregue',       cls: 'order-status-entregue',    color: '#16A34A' },
    cancelled:        { label: '✕ Cancelado',      cls: 'order-status-cancelado',   color: '#DC2626' }
  },
  trackingSteps: ['pending', 'processing', 'in_production', 'shipped', 'out_for_delivery', 'delivered'],
  trackingLabels: {
    pending: 'Pedido confirmado', processing: 'Pagamento', in_production: 'Em produção',
    shipped: 'Em trânsito', out_for_delivery: 'Saiu p/ entrega', delivered: 'Entregue'
  }
};

// ── Cart badge updater ────────────────────────────────────────
async function updateCartBadge() {
  try {
    const { count } = await CartAPI.get();
    const badges = document.querySelectorAll('.cart-badge');
    badges.forEach(b => {
      b.textContent = count || 0;
      b.style.display = count > 0 ? 'flex' : 'none';
    });
  } catch (e) { /* silencioso */ }
}

// ── Inicialização de toast CSS ────────────────────────────────
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
`;
document.head.appendChild(toastStyle);
Toast.init();

// Exportar globalmente
window.API = {
  Auth, AuthAPI, ProductsAPI, CategoriesAPI, OrdersAPI,
  CartAPI, CouponsAPI, UsersAPI, ContactAPI, QuoteAPI, DashboardAPI,
  Toast, Format, StatusMap, updateCartBadge
};
