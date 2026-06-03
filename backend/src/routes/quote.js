const express = require('express');
const router = express.Router();
const db = require('../db');
const { admin } = require('../middleware/auth');

// POST /api/quote - Solicitar orçamento
router.post('/', async (req, res) => {
  const { name, email, company, phone, message, product_id } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Os campos nome, email e mensagem são obrigatórios para solicitar um orçamento.' });
  }

  try {
    // Se o product_id for fornecido, verifica se o produto existe
    if (product_id) {
      const productCheck = await db.query('SELECT id FROM products WHERE id = $1', [product_id]);
      if (productCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Produto informado não existe.' });
      }
    }

    const result = await db.query(
      `INSERT INTO quote_requests (name, email, company, phone, message, product_id, status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') 
       RETURNING *`,
      [name, email, company || null, phone || null, message, product_id || null]
    );

    res.status(201).json({
      message: 'Solicitação de orçamento enviada com sucesso.',
      quoteRequest: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao salvar solicitação de orçamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao registrar solicitação de orçamento.' });
  }
});

// GET /api/quote - Listar solicitações de orçamento (Admin)
router.get('/', admin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT q.*, p.name as product_name, p.sku
       FROM quote_requests q
       LEFT JOIN products p ON q.product_id = p.id
       ORDER BY q.created_at DESC`
    );
    res.json({ quoteRequests: result.rows });
  } catch (error) {
    console.error('Erro ao buscar orçamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar orçamentos.' });
  }
});

// PUT /api/quote/:id/status - Atualizar status da solicitação de orçamento (Admin)
router.put('/:id/status', admin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'answered'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status inválido. Use: ${validStatuses.join(', ')}` });
  }

  try {
    const result = await db.query(
      'UPDATE quote_requests SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitação de orçamento não encontrada.' });
    }

    res.json({
      message: 'Status do orçamento atualizado com sucesso.',
      quoteRequest: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar status do orçamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao atualizar status.' });
  }
});

module.exports = router;
