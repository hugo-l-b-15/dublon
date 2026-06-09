const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

// Helper: obter identificador do carrinho
function getCartId(req) {
  if (req.user) return { field: 'user_id', value: req.user.id };
  const sessionId = req.headers['x-session-id'];
  if (sessionId) return { field: 'session_id', value: sessionId };
  return null;
}

// GET /api/cart – Listar itens do carrinho
router.get('/', async (req, res) => {
  const cartId = getCartId(req);
  if (!cartId) return res.json({ items: [], total: 0 });

  try {
    const result = await db.query(
      `SELECT ci.id, ci.quantity, ci.color, ci.size,
              p.id AS product_id, p.name, p.price, p.original_price, p.discount_percentage, p.stock,
              p.sku, pi.image_url
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id AND p.is_active = true
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_main = true
       WHERE ci.${cartId.field} = $1
       ORDER BY ci.created_at ASC`,
      [cartId.value]
    );

    const items = result.rows;
    const subtotal = items.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0);

    res.json({ items, subtotal, count: items.reduce((n, i) => n + i.quantity, 0) });
  } catch (error) {
    console.error('Erro ao buscar carrinho:', error);
    res.status(500).json({ error: 'Erro interno ao buscar carrinho.' });
  }
});

// POST /api/cart – Adicionar ao carrinho
router.post('/', async (req, res) => {
  const { product_id, quantity = 1, color, size } = req.body;
  const cartId = getCartId(req);

  if (!product_id) return res.status(400).json({ error: 'product_id é obrigatório.' });

  try {
    // Verifica produto
    const prodResult = await db.query('SELECT id, name, price, stock FROM products WHERE id=$1 AND is_active=true', [product_id]);
    if (prodResult.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    const product = prodResult.rows[0];
    if (product.stock < quantity) {
      return res.status(400).json({ error: `Estoque insuficiente. Disponível: ${product.stock}` });
    }

    let whereClause, params;
    if (cartId) {
      whereClause = `${cartId.field}=$1 AND product_id=$2 AND COALESCE(color,'')=$3 AND COALESCE(size,'')=$4`;
      params = [cartId.value, product_id, color || '', size || ''];
    } else {
      // Sem sessão – cria sessão temporária
      return res.status(400).json({ error: 'Sessão ou autenticação necessária.' });
    }

    // Verifica se já existe no carrinho
    const existingResult = await db.query(
      `SELECT id, quantity FROM cart_items WHERE ${whereClause}`, params
    );

    let item;
    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      const newQty = existing.quantity + quantity;
      if (product.stock < newQty) {
        return res.status(400).json({ error: `Estoque insuficiente. Você já tem ${existing.quantity} no carrinho.` });
      }
      const updateResult = await db.query(
        'UPDATE cart_items SET quantity=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',
        [newQty, existing.id]
      );
      item = updateResult.rows[0];
    } else {
      const insertResult = await db.query(
        `INSERT INTO cart_items (${cartId.field}, product_id, quantity, color, size) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [cartId.value, product_id, quantity, color || null, size || null]
      );
      item = insertResult.rows[0];
    }

    res.status(201).json({ message: 'Item adicionado ao carrinho.', item });
  } catch (error) {
    console.error('Erro ao adicionar ao carrinho:', error);
    res.status(500).json({ error: 'Erro interno ao adicionar ao carrinho.' });
  }
});

// PUT /api/cart/:id – Atualizar quantidade
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  const cartId = getCartId(req);

  if (!quantity || quantity < 1) {
    return res.status(400).json({ error: 'Quantidade deve ser pelo menos 1.' });
  }

  try {
    // Verifica estoque
    const checkResult = await db.query(
      `SELECT ci.id, p.stock FROM cart_items ci JOIN products p ON p.id = ci.product_id WHERE ci.id=$1`,
      [id]
    );
    if (checkResult.rows.length === 0) return res.status(404).json({ error: 'Item não encontrado.' });
    if (checkResult.rows[0].stock < quantity) {
      return res.status(400).json({ error: `Estoque insuficiente. Disponível: ${checkResult.rows[0].stock}` });
    }

    const result = await db.query(
      `UPDATE cart_items SET quantity=$1, updated_at=CURRENT_TIMESTAMP 
       WHERE id=$2 AND ${cartId.field}=$3 RETURNING *`,
      [quantity, id, cartId.value]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Item não encontrado.' });
    res.json({ message: 'Quantidade atualizada.', item: result.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar carrinho:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar carrinho.' });
  }
});

// DELETE /api/cart/:id – Remover item
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const cartId = getCartId(req);

  try {
    const result = await db.query(
      `DELETE FROM cart_items WHERE id=$1 AND ${cartId.field}=$2 RETURNING *`,
      [id, cartId.value]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item não encontrado.' });
    res.json({ message: 'Item removido do carrinho.' });
  } catch (error) {
    console.error('Erro ao remover item do carrinho:', error);
    res.status(500).json({ error: 'Erro interno ao remover item.' });
  }
});

// DELETE /api/cart – Limpar carrinho
router.delete('/', async (req, res) => {
  const cartId = getCartId(req);
  if (!cartId) return res.json({ message: 'Carrinho já estava vazio.' });

  try {
    await db.query(`DELETE FROM cart_items WHERE ${cartId.field}=$1`, [cartId.value]);
    res.json({ message: 'Carrinho limpo com sucesso.' });
  } catch (error) {
    console.error('Erro ao limpar carrinho:', error);
    res.status(500).json({ error: 'Erro interno ao limpar carrinho.' });
  }
});

module.exports = router;
