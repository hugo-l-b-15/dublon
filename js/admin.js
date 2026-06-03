/* ============================================================
   DUBLON – admin.js
   Admin Dashboard and Management Utilities
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Configuração da navegação ativa na sidebar administrativa
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.admin-sidebar-item').forEach(item => {
    const href = item.getAttribute('href');
    if (href && href.includes(currentPage)) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Notificações administrativas em tempo real (simulação)
  if (currentPage.includes('dashboard.html')) {
    initLiveNotifications();
  }
});

// ── Live Notifications Simulation ───────────────────────────
function initLiveNotifications() {
  const events = [
    { title: "Novo orçamento solicitado", desc: "Calçados Beira Rio solicitou cotação para 2.000 palmilhas.", type: "blue", time: "Agora mesmo" },
    { title: "Estoque crítico", desc: "Palmilha Premium +600 - Tamanho 38 atingiu 5 unidades.", type: "red", time: "Há 1 min" },
    { title: "Pedido Faturado", desc: "Pedido #DBL-2024-04845 enviado para expedição.", type: "green", time: "Há 5 min" }
  ];

  let currentIdx = 0;
  setInterval(() => {
    if (currentIdx >= events.length) return;
    const evt = events[currentIdx];
    showToast(evt.title, evt.desc, evt.type);
    currentIdx++;
  }, 10000); // Mostra um novo alerta a cada 10 segundos
}

// ── Admin Toast Message Helper ──────────────────────────────
function showToast(title, desc, type = "blue") {
  const toast = document.createElement('div');
  let typeColor = "var(--blue-vibrant)";
  if (type === "red") typeColor = "var(--red-error)";
  if (type === "green") typeColor = "var(--green-success)";
  if (type === "yellow") typeColor = "var(--yellow-warn)";

  toast.style.position = 'fixed';
  toast.style.bottom = '24px';
  toast.style.right = '24px';
  toast.style.background = 'var(--white)';
  toast.style.borderLeft = `4px solid ${typeColor}`;
  toast.style.borderRadius = 'var(--radius-md)';
  toast.style.padding = '16px';
  toast.style.boxShadow = 'var(--shadow-xl)';
  toast.style.zIndex = '9999';
  toast.style.maxWidth = '320px';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(20px)';
  toast.style.transition = 'all 0.3s ease';

  toast.innerHTML = `
    <div style="font-weight: 700; font-size: 13px; color: var(--text-primary); display: flex; justify-content: space-between;">
      <span>${title}</span>
      <span style="cursor: pointer; opacity: 0.5;" onclick="this.closest('div').parentElement.remove()">×</span>
    </div>
    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${desc}</div>
  `;

  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 100);

  // Auto-remove
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}
