const express = require('express');
const router = express.Router();
const db = require('../db');
const { admin } = require('../middleware/auth');

// POST /api/contact – Enviar mensagem de contato
router.post('/', async (req, res) => {
  const { first_name, last_name, name, email, phone, subject, message } = req.body;

  const fullName = name || `${first_name || ''} ${last_name || ''}`.trim();

  if (!fullName || !email || !message) {
    return res.status(400).json({ error: 'Os campos nome, e-mail e mensagem são obrigatórios.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO contact_messages (first_name, last_name, name, email, phone, subject, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`,
      [first_name || null, last_name || null, fullName, email, phone || null, subject || null, message]
    );

    res.status(201).json({
      message: 'Mensagem enviada com sucesso. Nossa equipe entrará em contato em breve.',
      id: result.rows[0].id
    });
  } catch (error) {
    console.error('Erro ao salvar mensagem de contato:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao enviar mensagem.' });
  }
});

// GET /api/contact – Listar mensagens (Admin)
router.get('/', admin, async (req, res) => {
  const { is_read, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let queryText = 'SELECT * FROM contact_messages WHERE 1=1';
    const params = [];
    let idx = 1;

    if (is_read !== undefined) {
      queryText += ` AND is_read=$${idx}`;
      params.push(is_read === 'true');
      idx++;
    }

    const countResult = await db.query(`SELECT COUNT(*) FROM (${queryText}) AS c`, params);
    const total = parseInt(countResult.rows[0].count);

    queryText += ` ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(queryText, params);
    res.json({
      messages: result.rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar mensagens.' });
  }
});

// PUT /api/contact/:id/read – Marcar como lida (Admin)
router.put('/:id/read', admin, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE contact_messages SET is_read=true WHERE id=$1', [id]);
    res.json({ message: 'Mensagem marcada como lida.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = router;
