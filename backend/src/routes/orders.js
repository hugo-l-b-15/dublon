const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, admin } = require('../middleware/auth');

// GET /api/orders - Listar pedidos (Cliente vê os dele, Admin vê todos)
router.get('/', auth, async (req, res) => {
  try {
    let queryText = '';
    const params = [];

    if (req.user.role === 'admin') {
      queryText = `
        SELECT o.*, u.name as user_name, u.email as user_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
      `;
    } else {
      queryText = `
        SELECT o.* 
        FROM orders o
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
      `;
      params.push(req.user.id);
    }

    const result = await db.query(queryText, params);
    res.json({ orders: result.rows });
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar pedidos.' });
  }
});

// GET /api/orders/:id - Detalhes do pedido + itens
router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    let orderResult;
    
    if (req.user.role === 'admin') {
      orderResult = await db.query(
        `SELECT o.*, u.name as user_name, u.email as user_email, 
                a.street, a.number, a.complement, a.neighborhood, a.city, a.state, a.zip_code
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         LEFT JOIN addresses a ON o.address_id = a.id
         WHERE o.id = $1`,
        [id]
      );
    } else {
      orderResult = await db.query(
        `SELECT o.*, 
                a.street, a.number, a.complement, a.neighborhood, a.city, a.state, a.zip_code
         FROM orders o
         LEFT JOIN addresses a ON o.address_id = a.id
         WHERE o.id = $1 AND o.user_id = $2`,
        [id, req.user.id]
      );
    }

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado ou acesso não autorizado.' });
    }

    const order = orderResult.rows[0];

    // Busca itens do pedido
    const itemsResult = await db.query(
      `SELECT oi.id, oi.quantity, oi.price, p.name as product_name, p.sku
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [id]
    );

    res.json({
      order,
      items: itemsResult.rows
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes do pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar detalhes do pedido.' });
  }
});

// POST /api/orders - Criar pedido
router.post('/', auth, async (req, res) => {
  const { address_id, items } = req.body;

  if (!address_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Endereço e itens do pedido são obrigatórios.' });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verifica se o endereço pertence ao usuário
    const addressCheck = await client.query(
      'SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
      [address_id, req.user.id]
    );
    if (addressCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Endereço de entrega inválido ou não pertencente ao usuário.' });
    }

    let total = 0;
    const processedItems = [];

    // 2. Valida itens, preços e estoque
    for (const item of items) {
      const { product_id, quantity } = item;

      if (!product_id || !quantity || quantity <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Item do pedido inválido.' });
      }

      // Busca produto
      const productResult = await client.query(
        'SELECT id, name, price, stock, is_active FROM products WHERE id = $1 FOR UPDATE',
        [product_id]
      );

      if (productResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Produto com ID ${product_id} não encontrado.` });
      }

      const product = productResult.rows[0];

      if (!product.is_active) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Produto "${product.name}" não está mais disponível.` });
      }

      if (product.stock < quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Estoque insuficiente para o produto "${product.name}". Estoque disponível: ${product.stock}` });
      }

      const itemTotal = parseFloat(product.price) * quantity;
      total += itemTotal;

      processedItems.push({
        product_id: product.id,
        quantity,
        price: product.price
      });

      // Deduz do estoque
      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [quantity, product_id]
      );
    }

    // 3. Cria o pedido
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total, status, address_id) 
       VALUES ($1, $2, 'pending', $3) 
       RETURNING *`,
      [req.user.id, total, address_id]
    );
    const order = orderResult.rows[0];

    // 4. Insere itens do pedido
    for (const item of processedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price) 
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.product_id, item.quantity, item.price]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Pedido criado com sucesso.',
      order
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao processar o pedido.' });
  } finally {
    client.release();
  }
});

// PUT /api/orders/:id/status - Atualizar status do pedido (Admin)
router.put('/:id/status', admin, async (req, res) => {
  const { id } = req.params;
  const { status, tracking_code } = req.body;

  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status inválido. Use um de: ${validStatuses.join(', ')}` });
  }

  try {
    // Busca status atual do pedido para verificar se precisamos devolver estoque caso seja cancelado
    const currentOrderResult = await db.query('SELECT status FROM orders WHERE id = $1', [id]);
    if (currentOrderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }
    
    const currentStatus = currentOrderResult.rows[0].status;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Se o pedido for cancelado e não era cancelado anteriormente, devolvemos o estoque
      if (status === 'cancelled' && currentStatus !== 'cancelled') {
        const itemsResult = await client.query(
          'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
          [id]
        );
        for (const item of itemsResult.rows) {
          await client.query(
            'UPDATE products SET stock = stock + $1 WHERE id = $2',
            [item.quantity, item.product_id]
          );
        }
      } 
      // Se o pedido era cancelado e está saindo desse status, removemos do estoque (se possível)
      else if (currentStatus === 'cancelled' && status !== 'cancelled') {
        const itemsResult = await client.query(
          'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
          [id]
        );
        for (const item of itemsResult.rows) {
          // Verifica estoque
          const prodCheck = await client.query('SELECT name, stock FROM products WHERE id = $1', [item.product_id]);
          const prod = prodCheck.rows[0];
          if (prod.stock < item.quantity) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Impossível reativar pedido. Estoque insuficiente para o produto "${prod.name}".` });
          }
          await client.query(
            'UPDATE products SET stock = stock - $1 WHERE id = $2',
            [item.quantity, item.product_id]
          );
        }
      }

      // Atualiza pedido
      const updateResult = await client.query(
        `UPDATE orders 
         SET status = $1, tracking_code = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3 
         RETURNING *`,
        [status, tracking_code || null, id]
      );

      await client.query('COMMIT');
      res.json({
        message: 'Status do pedido atualizado com sucesso.',
        order: updateResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao atualizar status do pedido.' });
  }
});

module.exports = router;
