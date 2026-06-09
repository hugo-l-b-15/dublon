const express = require('express');
const router = express.Router();
const db = require('../db');
const { admin } = require('../middleware/auth');

// GET /api/products – Listar produtos ativos (com filtros)
router.get('/', async (req, res) => {
  const { category_id, category_slug, search, limit = 12, page = 1, sort = 'newest' } = req.query;
  const offset = (page - 1) * limit;

  try {
    let queryText = `
      SELECT p.*, c.name AS category_name, c.color AS category_color, c.slug AS category_slug,
             pi.image_url AS main_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_main = true
      WHERE p.is_active = true
    `;
    const params = [];
    let paramIndex = 1;

    if (category_id) {
      queryText += ` AND p.category_id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }

    if (category_slug) {
      queryText += ` AND c.slug = $${paramIndex}`;
      params.push(category_slug);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM (${queryText}) AS count_query`, params
    );
    const totalItems = parseInt(countResult.rows[0].count);

    const sortMap = { newest: 'p.id DESC', price_asc: 'p.price ASC', price_desc: 'p.price DESC', rating: 'p.rating DESC' };
    queryText += ` ORDER BY ${sortMap[sort] || 'p.id DESC'} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const productsResult = await db.query(queryText, params);

    res.json({
      products: productsResult.rows,
      pagination: { total: totalItems, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(totalItems / limit) }
    });
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao listar produtos.' });
  }
});

// GET /api/products/admin/all – Todos os produtos para admin
router.get('/admin/all', admin, async (req, res) => {
  const { search, category_id, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let queryText = `
      SELECT p.*, c.name AS category_name, c.color AS category_color,
             pi.image_url AS main_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_main = true
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (search) {
      queryText += ` AND (p.name ILIKE $${idx} OR p.sku ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    if (category_id) {
      queryText += ` AND p.category_id = $${idx}`;
      params.push(category_id);
      idx++;
    }

    const countResult = await db.query(`SELECT COUNT(*) FROM (${queryText}) AS c`, params);
    const total = parseInt(countResult.rows[0].count);

    queryText += ` ORDER BY p.id DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(queryText, params);
    res.json({
      products: result.rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Erro ao listar produtos admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao listar produtos admin.' });
  }
});

// GET /api/products/:id – Detalhes do produto + imagens
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const productResult = await db.query(
      `SELECT p.*, c.name AS category_name, c.color AS category_color, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    const imagesResult = await db.query(
      'SELECT id, image_url, is_main FROM product_images WHERE product_id=$1 ORDER BY is_main DESC, id ASC',
      [id]
    );

    const reviewsResult = await db.query(
      `SELECT r.*, u.name AS reviewer_name 
       FROM product_reviews r 
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC LIMIT 10`,
      [id]
    );

    res.json({ product: productResult.rows[0], images: imagesResult.rows, reviews: reviewsResult.rows });
  } catch (error) {
    console.error('Erro ao obter detalhes do produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao obter detalhes do produto.' });
  }
});

// POST /api/products – Criar produto (Admin)
router.post('/', admin, async (req, res) => {
  const { name, description, price, original_price, discount_percentage, stock, stock_min, category_id, sku, is_new,
          density, thickness, material, certification, durability, application, colors, sizes, images } = req.body;

  if (!name || !description || price === undefined || stock === undefined || !sku) {
    return res.status(400).json({ error: 'Os campos nome, descrição, preço, estoque e SKU são obrigatórios.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const productResult = await client.query(
      `INSERT INTO products (name, description, price, original_price, discount_percentage, stock, stock_min, category_id, sku, is_new,
                             density, thickness, material, certification, durability, application, colors, sizes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [name, description, price, original_price || price, discount_percentage || 0, stock, stock_min || 50, category_id || null, sku, is_new || false,
       density || null, thickness || null, material || null, certification || null, durability || null, application || null,
       JSON.stringify(colors || []), JSON.stringify(sizes || [])]
    );
    const product = productResult.rows[0];

    if (images && Array.isArray(images) && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await client.query(
          'INSERT INTO product_images (product_id, image_url, is_main) VALUES ($1,$2,$3)',
          [product.id, images[i], i === 0]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Produto cadastrado com sucesso.', product });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar produto:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Já existe um produto com este SKU.' });
    }
    res.status(500).json({ error: 'Erro interno do servidor ao cadastrar produto.' });
  } finally {
    client.release();
  }
});

// PUT /api/products/:id – Editar produto (Admin)
router.put('/:id', admin, async (req, res) => {
  const { id } = req.params;
  const { name, description, price, original_price, discount_percentage, stock, stock_min, category_id, sku, is_active, is_new,
          density, thickness, material, certification, durability, application, colors, sizes, images } = req.body;

  if (!name || !description || price === undefined || stock === undefined || !sku) {
    return res.status(400).json({ error: 'Os campos nome, descrição, preço, estoque e SKU são obrigatórios.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const productResult = await client.query(
      `UPDATE products SET name=$1, description=$2, price=$3, original_price=$4, discount_percentage=$5, stock=$6, stock_min=$7,
              category_id=$8, sku=$9, is_active=$10, is_new=$11,
              density=$12, thickness=$13, material=$14, certification=$15, durability=$16, application=$17,
              colors=$18, sizes=$19, updated_at=CURRENT_TIMESTAMP
       WHERE id=$20 RETURNING *`,
      [name, description, price, original_price || price, discount_percentage || 0, stock, stock_min || 50,
       category_id || null, sku, is_active !== undefined ? is_active : true, is_new || false,
       density || null, thickness || null, material || null, certification || null, durability || null, application || null,
       JSON.stringify(colors || []), JSON.stringify(sizes || []), id]
    );

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    if (images && Array.isArray(images)) {
      await client.query('DELETE FROM product_images WHERE product_id=$1', [id]);
      for (let i = 0; i < images.length; i++) {
        await client.query(
          'INSERT INTO product_images (product_id, image_url, is_main) VALUES ($1,$2,$3)',
          [id, images[i], i === 0]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Produto atualizado com sucesso.', product: productResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao editar produto:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Já existe outro produto com este SKU.' });
    }
    res.status(500).json({ error: 'Erro interno do servidor ao editar produto.' });
  } finally {
    client.release();
  }
});

// DELETE /api/products/:id – Desativar produto (Admin)
router.delete('/:id', admin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      'UPDATE products SET is_active=false, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    res.json({ message: 'Produto desativado com sucesso.', product: result.rows[0] });
  } catch (error) {
    console.error('Erro ao desativar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao desativar produto.' });
  }
});

module.exports = router;
