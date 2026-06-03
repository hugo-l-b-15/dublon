/* ============================================================
   DUBLON – main.js
   Global JavaScript: Nav, Forms, Interactions
   ============================================================ */

// ── Navbar active state ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // Sidebar active
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    const href = item.getAttribute('href');
    if (href && href.includes(currentPage)) {
      item.classList.add('active');
    }
  });

  // Init qty counters
  initQtyCounters();

  // Init toggles
  initToggles();
});

// ── Quantity Counters ───────────────────────────────────────
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
        if (val > min) input.value = val - 1;
        input.dispatchEvent(new Event('change'));
      });
    }

    if (plus) {
      plus.addEventListener('click', () => {
        const val = parseInt(input.value) || 1;
        const max = parseInt(input.max) || 9999;
        if (val < max) input.value = val + 1;
        input.dispatchEvent(new Event('change'));
      });
    }
  });
}

// ── Toggles ─────────────────────────────────────────────────
function initToggles() {
  document.querySelectorAll('.toggle input[type="checkbox"]').forEach(toggle => {
    toggle.addEventListener('change', () => {
      // Can hook into state management here
    });
  });
}

// ── Tracking form ───────────────────────────────────────────
function handleTrackingSearch() {
  const input = document.getElementById('tracking-input');
  const resultDiv = document.getElementById('tracking-result');
  if (!input || !resultDiv) return;

  if (input.value.trim()) {
    resultDiv.style.display = 'block';
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ── Contact form submit ─────────────────────────────────────
function handleContactSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span>Enviando...</span>';
  btn.disabled = true;
  setTimeout(() => {
    btn.innerHTML = '<span>✓ Mensagem enviada!</span>';
    btn.style.background = '#22C55E';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '';
      btn.disabled = false;
      e.target.reset();
    }, 2500);
  }, 1200);
}

// ── Quote form submit ───────────────────────────────────────
function handleQuoteSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span>Enviando...</span>';
  btn.disabled = true;
  setTimeout(() => {
    btn.innerHTML = '<span>✓ Orçamento solicitado!</span>';
    btn.style.background = '#22C55E';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '';
      btn.disabled = false;
      e.target.reset();
      const qtyInput = e.target.querySelector('.qty-counter input');
      if (qtyInput) qtyInput.value = '100';
    }, 2500);
  }, 1200);
}

// ── Format currency ─────────────────────────────────────────
function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}
