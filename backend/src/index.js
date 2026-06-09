const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const initializeDatabase = require('./db/init');

// Rotas
const authRoutes      = require('./routes/auth');
const productRoutes   = require('./routes/products');
const orderRoutes     = require('./routes/orders');
const userRoutes      = require('./routes/users');
const categoryRoutes  = require('./routes/categories');
const contactRoutes   = require('./routes/contact');
const quoteRoutes     = require('./routes/quote');
const dashboardRoutes = require('./routes/dashboard');
const cartRoutes      = require('./routes/cart');
const couponsRoutes   = require('./routes/coupons');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ───────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/products',  productRoutes);
app.use('/api/orders',    orderRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/contact',   contactRoutes);
app.use('/api/quote',     quoteRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cart',      cartRoutes);
app.use('/api/coupons',   couponsRoutes);

// ── Servir Frontend ───────────────────────────────────────────
app.use('/assets', express.static(path.join(__dirname, '../../assets')));
app.use('/css',    express.static(path.join(__dirname, '../../css')));
app.use('/js',     express.static(path.join(__dirname, '../../js')));
app.use('/admin',  express.static(path.join(__dirname, '../../admin')));

// Rotas HTML
app.get('/:page.html', (req, res, next) => {
  const page = req.params.page;
  if (page.includes('..') || page.includes('/') || page.includes('\\')) {
    return res.status(400).send('Caminho inválido');
  }
  const filePath = path.join(__dirname, '../../', `${page}.html`);
  res.sendFile(filePath, (err) => { if (err) next(); });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../index.html'));
});

// ── Health Check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2.0.0' });
});

// ── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint não encontrado.' });
  }
  res.status(404).sendFile(path.join(__dirname, '../../index.html'));
});

// ── Error Handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

// ── Inicialização ─────────────────────────────────────────────
async function startServer() {
  try {
    if (process.env.DATABASE_URL) {
      await initializeDatabase();
    } else {
      console.warn('⚠️  DATABASE_URL não configurada. Configure o arquivo backend/.env para conectar ao banco de dados.');
    }

    app.listen(PORT, () => {
      console.log(`\n✅ DUBLON Backend v2.0 rodando na porta ${PORT}`);
      console.log(`🌐 Acesse: http://localhost:${PORT}`);
      console.log(`📡 API:    http://localhost:${PORT}/api`);
      console.log(`❤️  Health: http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    console.error('❌ Falha ao iniciar o servidor:', error);
    process.exit(1);
  }
}

startServer();
