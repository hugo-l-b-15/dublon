const express = require('express');
const router = express.Router();
const db = require('../db');
const { admin } = require('../middleware/auth');

// POST /api/quote – Solicitar orçamento
router.post('/', async (req, res) => {
  const { name, email, company, phone, product_id, product_type, quantity, message } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Os campos nome e e-mail são obrigatórios.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }

  try {
    if (product_id) {
      const productCheck = await db.query('SELECT id FROM products WHERE id=$1', [product_id]);
      if (productCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Produto informado não existe.' });
      }
    }

    const result = await db.query(
      `INSERT INTO quote_requests (name, email, company, phone, product_id, product_type, quantity, message, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING *`,
      [name, email, company || null, phone || null, product_id || null, product_type || null, quantity || 100, message || 'Sem observações adicionais.']
    );

    res.status(201).json({
      message: 'Solicitação de orçamento enviada com sucesso. Você receberá uma resposta em até 24 horas.',
      quoteRequest: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao salvar solicitação de orçamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao registrar solicitação de orçamento.' });
  }
});

// GET /api/quote – Listar orçamentos (Admin)
router.get('/', admin, async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let queryText = `
      SELECT q.*, p.name AS product_name, p.sku
      FROM quote_requests q
      LEFT JOIN products p ON q.product_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status) {
      queryText += ` AND q.status=$${idx}`;
      params.push(status);
      idx++;
    }

    const countResult = await db.query(`SELECT COUNT(*) FROM (${queryText}) AS c`, params);
    const total = parseInt(countResult.rows[0].count);

    queryText += ` ORDER BY q.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(queryText, params);
    res.json({
      quoteRequests: result.rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    console.error('Erro ao buscar orçamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar orçamentos.' });
  }
});

// PUT /api/quote/:id/status – Atualizar status (Admin)
router.put('/:id/status', admin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'answered', 'rejected'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status inválido. Use: ${validStatuses.join(', ')}` });
  }

  try {
    const result = await db.query(
      'UPDATE quote_requests SET status=$1 WHERE id=$2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitação de orçamento não encontrada.' });
    }

    res.json({ message: 'Status do orçamento atualizado.', quoteRequest: result.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar status do orçamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao atualizar status.' });
  }
});

module.exports = router;
