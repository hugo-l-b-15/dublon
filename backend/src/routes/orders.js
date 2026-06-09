const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, admin } = require('../middleware/auth');

// GET /api/orders – Listar pedidos
router.get('/', auth, async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let baseQuery, params = [], idx = 1;

    if (req.user.role === 'admin') {
      baseQuery = `
        SELECT o.*, u.name AS user_name, u.email AS user_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE 1=1
      `;
    } else {
      baseQuery = `SELECT o.* FROM orders o WHERE o.user_id = $${idx}`;
      params.push(req.user.id);
      idx++;
    }

    if (status && status !== 'all') {
      if (status === 'andamento') {
        baseQuery += ` AND o.status IN ('pending','processing','in_production','shipped','out_for_delivery')`;
      } else if (status === 'entregues') {
        baseQuery += ` AND o.status = 'delivered'`;
      } else if (status === 'cancelados') {
        baseQuery += ` AND o.status = 'cancelled'`;
      } else {
        baseQuery += ` AND o.status = $${idx}`;
        params.push(status);
        idx++;
      }
    }

    if (search) {
      baseQuery += ` AND (o.order_number ILIKE $${idx}`;
      if (req.user.role === 'admin') {
        baseQuery += ` OR u.name ILIKE $${idx} OR u.email ILIKE $${idx}`;
      }
      baseQuery += `)`;
      params.push(`%${search}%`);
      idx++;
    }

    // Count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM (${baseQuery}) AS sub`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    baseQuery += ` ORDER BY o.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(baseQuery, params);

    // Para cada pedido, buscar primeiro item
    const orders = await Promise.all(result.rows.map(async (order) => {
      const itemsResult = await db.query(
        `SELECT oi.quantity, oi.product_name, p.name AS product_name_live
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = $1 LIMIT 3`,
        [order.id]
      );
      return { ...order, items: itemsResult.rows };
    }));

    res.json({
      orders,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar pedidos.' });
  }
});

// GET /api/orders/track/:code – Rastreio PÚBLICO por order_number ou tracking_code
router.get('/track/:code', async (req, res) => {
  const { code } = req.params;

  try {
    const orderResult = await db.query(
      `SELECT o.id, o.order_number, o.status, o.tracking_code, o.estimated_delivery, o.created_at,
              a.city, a.state
       FROM orders o
       LEFT JOIN addresses a ON a.id = o.address_id
       WHERE o.order_number = $1 OR o.tracking_code = $1`,
      [code.toUpperCase()]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado. Verifique o código informado.' });
    }

    const order = orderResult.rows[0];

    const eventsResult = await db.query(
      `SELECT status, location, description, event_at
       FROM order_tracking_events
       WHERE order_id = $1
       ORDER BY event_at ASC`,
      [order.id]
    );

    res.json({ order, events: eventsResult.rows });
  } catch (error) {
    console.error('Erro ao rastrear pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao rastrear pedido.' });
  }
});

// GET /api/orders/:id – Detalhes completos do pedido
router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    let orderResult;

    if (req.user.role === 'admin') {
      orderResult = await db.query(
        `SELECT o.*, u.name AS user_name, u.email AS user_email,
                a.label, a.street, a.number, a.complement, a.neighborhood, a.city, a.state, a.zip_code
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         LEFT JOIN addresses a ON o.address_id = a.id
         WHERE o.id = $1`,
        [id]
      );
    } else {
      orderResult = await db.query(
        `SELECT o.*,
                a.label, a.street, a.number, a.complement, a.neighborhood, a.city, a.state, a.zip_code
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

    const itemsResult = await db.query(
      `SELECT oi.id, oi.quantity, oi.price, oi.color, oi.size,
              COALESCE(oi.product_name, p.name) AS product_name,
              p.sku, pi.image_url
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_main = true
       WHERE oi.order_id = $1`,
      [id]
    );

    const eventsResult = await db.query(
      `SELECT status, location, description, event_at
       FROM order_tracking_events WHERE order_id = $1 ORDER BY event_at ASC`,
      [id]
    );

    res.json({ order, items: itemsResult.rows, events: eventsResult.rows });
  } catch (error) {
    console.error('Erro ao buscar detalhes do pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar detalhes do pedido.' });
  }
});

// POST /api/orders – Criar pedido
router.post('/', auth, async (req, res) => {
  const { address_id, items, payment_method, shipping_method, coupon_code } = req.body;

  if (!address_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Endereço e itens do pedido são obrigatórios.' });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Verifica endereço do usuário
    const addressCheck = await client.query(
      'SELECT id FROM addresses WHERE id=$1 AND user_id=$2', [address_id, req.user.id]
    );
    if (addressCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Endereço de entrega inválido.' });
    }

    let subtotal = 0;
    let discount = 0;
    let shippingCost = 0;
    const processedItems = [];

    // Valida cupom
    let couponData = null;
    if (coupon_code) {
      const couponResult = await client.query(
        `SELECT * FROM coupons WHERE code=$1 AND is_active=true AND (expires_at IS NULL OR expires_at > NOW()) AND (max_uses IS NULL OR used_count < max_uses)`,
        [coupon_code.toUpperCase()]
      );
      if (couponResult.rows.length > 0) {
        couponData = couponResult.rows[0];
      }
    }

    // Calcula frete
    if (shipping_method === 'express') shippingCost = 19.90;
    else shippingCost = 0; // standard e retirada são grátis

    // Valida itens e estoque
    for (const item of items) {
      const { product_id, quantity, color, size } = item;

      if (!product_id || !quantity || quantity <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Item do pedido inválido.' });
      }

      const productResult = await client.query(
        'SELECT id, name, price, stock, is_active FROM products WHERE id=$1 FOR UPDATE',
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
        return res.status(400).json({ error: `Estoque insuficiente para "${product.name}". Disponível: ${product.stock}` });
      }

      subtotal += parseFloat(product.price) * quantity;
      processedItems.push({ product_id: product.id, product_name: product.name, quantity, price: product.price, color, size });

      await client.query('UPDATE products SET stock=stock-$1 WHERE id=$2', [quantity, product_id]);
    }

    // Aplica cupom
    if (couponData) {
      if (subtotal >= parseFloat(couponData.min_order_value)) {
        if (couponData.discount_type === 'percentage') {
          discount = subtotal * (parseFloat(couponData.discount_value) / 100);
        } else {
          discount = Math.min(parseFloat(couponData.discount_value), subtotal);
        }
        await client.query('UPDATE coupons SET used_count=used_count+1 WHERE id=$1', [couponData.id]);
      }
    }

    const total = subtotal - discount + shippingCost;

    // Cria pedido
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, subtotal, discount, shipping_cost, total, status, payment_method, shipping_method, coupon_code, address_id, estimated_delivery)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, CURRENT_DATE + INTERVAL '5 days')
       RETURNING *`,
      [req.user.id, subtotal, discount, shippingCost, total, payment_method || 'pending', shipping_method || 'standard', coupon_code || null, address_id]
    );
    const order = orderResult.rows[0];

    // Insere itens
    for (const item of processedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, color, size)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [order.id, item.product_id, item.product_name, item.quantity, item.price, item.color || null, item.size || null]
      );
    }

    // Evento inicial de tracking
    await client.query(
      `INSERT INTO order_tracking_events (order_id, status, location, description)
       VALUES ($1, 'pending', 'Franca, SP', 'Pedido confirmado e aguardando processamento')`,
      [order.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Pedido criado com sucesso.', order });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao processar o pedido.' });
  } finally {
    client.release();
  }
});

// POST /api/orders/:id/cancel – Cancelar pedido (Cliente)
router.post('/:id/cancel', auth, async (req, res) => {
  const { id } = req.params;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id=$1 AND user_id=$2',
      [id, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    const order = orderResult.rows[0];

    const cancellableStatuses = ['pending', 'processing'];
    if (!cancellableStatuses.includes(order.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Não é possível cancelar um pedido com status "${order.status}". Apenas pedidos pendentes ou em processamento podem ser cancelados.` });
    }

    // Devolve estoque
    const itemsResult = await client.query('SELECT product_id, quantity FROM order_items WHERE order_id=$1', [id]);
    for (const item of itemsResult.rows) {
      await client.query('UPDATE products SET stock=stock+$1 WHERE id=$2', [item.quantity, item.product_id]);
    }

    // Atualiza status
    const updateResult = await client.query(
      `UPDATE orders SET status='cancelled', updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,
      [id]
    );

    // Evento de tracking
    await client.query(
      `INSERT INTO order_tracking_events (order_id, status, location, description)
       VALUES ($1, 'cancelled', 'Franca, SP', 'Pedido cancelado pelo cliente')`,
      [id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Pedido cancelado com sucesso.', order: updateResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao cancelar pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao cancelar pedido.' });
  } finally {
    client.release();
  }
});

// PUT /api/orders/:id/status – Atualizar status (Admin)
router.put('/:id/status', admin, async (req, res) => {
  const { id } = req.params;
  const { status, tracking_code, location, description } = req.body;

  const validStatuses = ['pending', 'processing', 'in_production', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status inválido. Use um de: ${validStatuses.join(', ')}` });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const currentOrderResult = await client.query('SELECT status FROM orders WHERE id=$1', [id]);
    if (currentOrderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    const currentStatus = currentOrderResult.rows[0].status;

    // Lógica de estoque em cancelamentos
    if (status === 'cancelled' && currentStatus !== 'cancelled') {
      const itemsResult = await client.query('SELECT product_id, quantity FROM order_items WHERE order_id=$1', [id]);
      for (const item of itemsResult.rows) {
        await client.query('UPDATE products SET stock=stock+$1 WHERE id=$2', [item.quantity, item.product_id]);
      }
    } else if (currentStatus === 'cancelled' && status !== 'cancelled') {
      const itemsResult = await client.query('SELECT product_id, quantity FROM order_items WHERE order_id=$1', [id]);
      for (const item of itemsResult.rows) {
        const prodCheck = await client.query('SELECT name, stock FROM products WHERE id=$1', [item.product_id]);
        const prod = prodCheck.rows[0];
        if (prod.stock < item.quantity) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Estoque insuficiente para "${prod.name}".` });
        }
        await client.query('UPDATE products SET stock=stock-$1 WHERE id=$2', [item.quantity, item.product_id]);
      }
    }

    const updateResult = await client.query(
      `UPDATE orders SET status=$1, tracking_code=COALESCE($2, tracking_code), updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *`,
      [status, tracking_code || null, id]
    );

    // Adiciona evento de tracking automaticamente
    const statusDescriptions = {
      pending: 'Pedido confirmado e aguardando processamento',
      processing: 'Pagamento aprovado – iniciando produção',
      in_production: 'Pedido em produção na fábrica Dublon',
      shipped: 'Pedido despachado pelos Correios',
      out_for_delivery: 'Saiu para entrega final',
      delivered: 'Pedido entregue com sucesso',
      cancelled: 'Pedido cancelado'
    };

    await client.query(
      `INSERT INTO order_tracking_events (order_id, status, location, description)
       VALUES ($1, $2, $3, $4)`,
      [id, status, location || 'Franca, SP', description || statusDescriptions[status]]
    );

    await client.query('COMMIT');
    res.json({ message: 'Status do pedido atualizado com sucesso.', order: updateResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar status do pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao atualizar status do pedido.' });
  } finally {
    client.release();
  }
});

module.exports = router;
