const express = require('express');
const router = express.Router();
const db = require('../db');
const { admin } = require('../middleware/auth');

// POST /api/contact - Enviar mensagem de contato
router.post('/', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Os campos nome, email e mensagem são obrigatórios.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO contact_messages (name, email, subject, message) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, email, subject || null, message]
    );

    res.status(201).json({
      message: 'Mensagem de contato enviada com sucesso.',
      contactMessage: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem de contato:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao enviar mensagem.' });
  }
});

// GET /api/contact - Listar mensagens de contato (Admin)
router.get('/', admin, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM contact_messages ORDER BY created_at DESC'
    );
    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Erro ao buscar mensagens de contato:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar mensagens.' });
  }
});

// PUT /api/contact/:id/read - Marcar mensagem como lida (Admin)
router.put('/:id/read', admin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      'UPDATE contact_messages SET is_read = true WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mensagem não encontrada.' });
    }

    res.json({
      message: 'Mensagem marcada como lida.',
      contactMessage: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao ler mensagem de contato:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = router;
