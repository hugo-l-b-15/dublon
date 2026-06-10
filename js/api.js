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
    // Tenta API, mas retorna cache local se falhar (sem banco)
    try {
      const data = await apiGet('/auth/me', true);
      // Atualiza cache local se a API responder
      if (data && data.user) Auth.setSession(Auth.getToken(), data.user);
      return data;
    } catch (e) {
      const user = Auth.getUser();
      if (user) return { user }; // retorna da sessão local
      throw e;
    }
  },

  logout() {
    Auth.clearSession();
    window.location.href = '/index.html';
  }
};

// ── Mock products (fallback sem banco de dados) ──────────────
const MOCK_PRODUCTS = [
  { id: 1, name: 'Palmilha EVA Pro D35', category: 'EVA', category_id: 1, density: 'D35', price: 48.90, original_price: 48.90, stock: 200, image: null, rating: 4.5, reviews_count: 42, is_new: false, sku: 'MOCK-EVA-D35', material: 'EVA Simples', thickness: '6 mm', application: 'Uso Geral' },
  { id: 2, name: 'Palmilha EVA Pro D45', category: 'EVA', category_id: 1, density: 'D45', price: 54.90, original_price: 59.90, stock: 150, image: null, rating: 4.7, reviews_count: 128, is_new: true, sku: 'MOCK-EVA-D45', material: 'EVA Duplado', thickness: '8 mm', application: 'Industrial / EPI' },
  { id: 3, name: 'Palmilha EVA Pro D50', category: 'EVA', category_id: 1, density: 'D50', price: 59.90, original_price: 59.90, stock: 120, image: null, rating: 4.6, reviews_count: 87, is_new: false, sku: 'MOCK-EVA-D50', material: 'EVA Premium', thickness: '10 mm', application: 'Premium / Executivo' },
  { id: 4, name: 'Palmilha Látex Standard', category: 'Látex', category_id: 2, density: 'D45', price: 39.90, original_price: 39.90, stock: 300, image: null, rating: 4.2, reviews_count: 34, is_new: false, sku: 'MOCK-LAT-STD', material: 'Látex Natural', thickness: '6 mm', application: 'Esportivo / Corrida' },
  { id: 5, name: 'Palmilha Látex Premium', category: 'Látex', category_id: 2, density: 'D50', price: 67.90, original_price: 67.90, stock: 80, image: null, rating: 4.8, reviews_count: 56, is_new: false, sku: 'MOCK-LAT-PRE', material: 'Látex Premium', thickness: '8 mm', application: 'Esportivo / Trail' },
  { id: 6, name: 'Palmilha CAB Industrial', category: 'CAB', category_id: 3, density: 'D60', price: 89.90, original_price: 89.90, stock: 60, image: null, rating: 4.6, reviews_count: 203, is_new: false, sku: 'MOCK-CAB-IND', material: 'CAB / Aço Temperado', thickness: '2.5 mm', application: 'EPI Industrial' },
];

// ── Products API ─────────────────────────────────────────────
const ProductsAPI = {
  async list(params = {}) {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await apiGet(`/products${qs ? '?' + qs : ''}`);
      let products = res.products || res || [];
      
      if (!Array.isArray(products) || products.length === 0) {
        products = MOCK_PRODUCTS;
      }
      
      // Injeta estoque fictício garantido para demonstrações
      products.forEach(p => {
        if (!p.stock || p.stock <= 0) p.stock = Math.floor(Math.random() * 800) + 150;
      });
      
      return { products, total: products.length, mock: (!res.products) };
    } catch (e) {
      console.warn('[Dublon] API indisponível, usando produtos demo.', e.message || e);
      const mocked = MOCK_PRODUCTS.map(p => ({ ...p, stock: Math.floor(Math.random() * 800) + 150 }));
      return { products: mocked, total: mocked.length, mock: true };
    }
  },
  async get(id) {
    try {
      let res = await apiGet(`/products/${id}`);
      let product = res.product || res;
      // Injeta estoque fictício
      if (!product.stock || product.stock <= 0) product.stock = Math.floor(Math.random() * 800) + 150;
      return product;
    } catch (e) {
      console.warn('[Dublon] API indisponível, usando mock para detalhes.', e);
      const mock = MOCK_PRODUCTS.find(p => p.id === parseInt(id)) || MOCK_PRODUCTS[0];
      return { ...mock, stock: Math.floor(Math.random() * 800) + 150 };
    }
  },
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

// ── Cart LocalStorage helpers ────────────────────────────
const CART_KEY = 'dublon_cart';

function localCartGet() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
}

function localCartSet(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function localCartToResponse(items) {
  const subtotal = items.reduce((s, i) => s + (i.price * i.quantity), 0);
  return { items, subtotal, count: items.reduce((s, i) => s + i.quantity, 0) };
}

// ── Cart API ─────────────────────────────────────────────
const CartAPI = {
  async get() {
    const items = localCartGet();
    return localCartToResponse(items);
  },

  async add(product_id, quantity, color, size, productData = {}) {
    const items = localCartGet();
    const existing = items.find(i => i.product_id === product_id && i.color === color && i.size === size);
    
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({
        id: Date.now(), // Generate a unique ID for the cart item
        product_id,
        quantity,
        color: color || '',
        size: size || '',
        name: productData.name || `Produto #${product_id}`,
        price: productData.price || 0,
        category_name: productData.category || 'Geral',
        image_url: productData.image || null,
        stock_min: productData.stock_min || 50
      });
    }
    
    localCartSet(items);
    console.log(`[CartAPI] Saving to ${CART_KEY}:`, items); // As requested by user
    return { success: true, local: true };
  },

  async update(id, quantity) {
    const items = localCartGet();
    const item = items.find(i => i.id === id);
    if (item) {
      item.quantity = quantity;
      localCartSet(items);
    }
    return { success: true, local: true };
  },

  async remove(id) {
    const items = localCartGet().filter(i => i.id !== id);
    localCartSet(items);
    return { success: true, local: true };
  },

  async clear() {
    localCartSet([]);
    return { success: true, local: true };
  }
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

// ── Cart badge updater ────────────────────────────────────
async function updateCartBadge() {
  try {
    const data = await CartAPI.get();
    const count = data.count || 0;
    const badges = document.querySelectorAll('.cart-badge');
    badges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'flex' : 'none';
    });
  } catch (e) {
    // Lê direto do localStorage como último recurso
    try {
      const items = JSON.parse(localStorage.getItem('dublon_cart')) || [];
      const count = items.reduce((s, i) => s + (i.quantity || 0), 0);
      document.querySelectorAll('.cart-badge').forEach(b => {
        b.textContent = count;
        b.style.display = count > 0 ? 'flex' : 'none';
      });
    } catch {}
  }
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
