const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { auth } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'substitua-por-uma-chave-forte-segura';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Os campos nome, email e senha são obrigatórios.' });
  }

  try {
    // Verifica se usuário já existe
    const userExists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Este e-mail já está em uso.' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insere usuário como customer por padrão
    const result = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
      [name, email, hashedPassword, 'customer']
    );

    const user = result.rows[0];

    // Gera token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Usuário registrado com sucesso.',
      user,
      token
    });
  } catch (error) {
    console.error('Erro no registro de usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao registrar usuário.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Os campos email e senha são obrigatórios.' });
  }

  // ── MODO DEMONSTRAÇÃO ──────────────────────────────────────────
  // Credenciais fixas para apresentações sem banco de dados ativo.
  // Remove ou comente este bloco em produção com banco configurado.
  if (email === 'demo@dublon.com.br' && password === 'demo1234') {
    const demoToken = jwt.sign(
      { id: 0, email: 'demo@dublon.com.br', role: 'admin', name: 'Admin Demo' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    return res.json({
      message: 'Login de demonstração realizado com sucesso.',
      user: { id: 0, name: 'Admin Demo', email: 'demo@dublon.com.br', role: 'admin' },
      token: demoToken,
      demo: true
    });
  }
  // ─────────────────────────────────────────────────────────────

  try {
    // Busca usuário pelo e-mail
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const user = result.rows[0];

    // Verifica a senha
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    // Gera token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login realizado com sucesso.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Erro no login de usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao realizar login.' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar dados do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar dados do usuário.' });
  }
});

module.exports = router;
