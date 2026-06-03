const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const initializeDatabase = require('./db/init');

// Rotas
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const contactRoutes = require('./routes/contact');
const quoteRoutes = require('./routes/quote');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/quote', quoteRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Servir arquivos estáticos de forma controlada e segura (Frontend)
app.use('/assets', express.static(path.join(__dirname, '../../assets')));
app.use('/css', express.static(path.join(__dirname, '../../css')));
app.use('/js', express.static(path.join(__dirname, '../../js')));
app.use('/admin', express.static(path.join(__dirname, '../../admin')));

// Rota para qualquer página HTML na raiz
app.get('/:page.html', (req, res, next) => {
  const page = req.params.page;
  // Impede acessos maliciosos contendo caminhos relativos
  if (page.includes('..') || page.includes('/') || page.includes('\\')) {
    return res.status(400).send('Caminho inválido');
  }
  const filePath = path.join(__dirname, '../../', `${page}.html`);
  res.sendFile(filePath, (err) => {
    if (err) {
      next(); // Passa para o tratamento de 404
    }
  });
});

// Servir index.html na raiz do site
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../index.html'));
});

// Middleware de Erro 404 (caso não encontre rota ou arquivo HTML)
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../../index.html'));
});

// Inicialização do Banco de Dados + Servidor
async function startServer() {
  try {
    // Inicializa tabelas e admin padrão se necessário
    if (process.env.DATABASE_URL) {
      await initializeDatabase();
    } else {
      console.warn('DATABASE_URL não configurada. Pulando inicialização do banco de dados.');
    }

    app.listen(PORT, () => {
      console.log(`Servidor rodando com sucesso na porta ${PORT}`);
      console.log(`Acesse localmente em http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Falha ao iniciar o servidor:', error);
    process.exit(1);
  }
}

startServer();
