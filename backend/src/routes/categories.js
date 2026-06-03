const express = require('express');
const router = express.Router();
const db = require('../db');
const { admin } = require('../middleware/auth');

// GET /api/categories - Listar categorias
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categories ORDER BY name ASC');
    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao listar categorias.' });
  }
});

// POST /api/categories - Criar categoria (Admin)
router.post('/', admin, async (req, res) => {
  const { name, slug, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'O nome da categoria é obrigatório.' });
  }

  // Gera slug automaticamente se não informado
  const generatedSlug = slug || name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  try {
    const result = await db.query(
      'INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3) RETURNING *',
      [name, generatedSlug, description || null]
    );

    res.status(201).json({
      message: 'Categoria cadastrada com sucesso.',
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao cadastrar categoria:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Já existe uma categoria cadastrada com este slug.' });
    }
    res.status(500).json({ error: 'Erro interno do servidor ao cadastrar categoria.' });
  }
});

module.exports = router;
