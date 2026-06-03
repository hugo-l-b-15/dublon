const express = require('express');
const router = express.Router();
const db = require('../db');
const { admin } = require('../middleware/auth');

// GET /api/products - Listar produtos ativos para a loja (com filtros opcionais)
router.get('/', async (req, res) => {
  const { category_id, search, limit = 12, page = 1 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let queryText = `
      SELECT p.*, c.name as category_name, pi.image_url as main_image
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

    if (search) {
      queryText += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Contagem total para paginação antes de aplicar limit/offset
    const countResult = await db.query(
      `SELECT COUNT(*) FROM (${queryText}) as count_query`,
      params
    );
    const totalItems = parseInt(countResult.rows[0].count);

    queryText += ` ORDER BY p.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const productsResult = await db.query(queryText, params);

    res.json({
      products: productsResult.rows,
      pagination: {
        total: totalItems,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalItems / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao listar produtos.' });
  }
});

// GET /api/products/admin/all - Listar todos os produtos para admin (incluindo inativos)
router.get('/admin/all', admin, async (req, res) => {
  try {
    const queryText = `
      SELECT p.*, c.name as category_name, pi.image_url as main_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_main = true
      ORDER BY p.id DESC
    `;
    const result = await db.query(queryText);
    res.json({ products: result.rows });
  } catch (error) {
    console.error('Erro ao listar produtos admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao listar produtos admin.' });
  }
});

// GET /api/products/:id - Detalhes do produto + todas as imagens
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const productResult = await db.query(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.id = $1`,
      [id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    const imagesResult = await db.query(
      'SELECT id, image_url, is_main FROM product_images WHERE product_id = $1 ORDER BY is_main DESC, id ASC',
      [id]
    );

    res.json({
      product: productResult.rows[0],
      images: imagesResult.rows
    });
  } catch (error) {
    console.error('Erro ao obter detalhes do produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao obter detalhes do produto.' });
  }
});

// POST /api/products - Criar produto (Admin)
router.post('/', admin, async (req, res) => {
  const { name, description, price, stock, category_id, sku, images } = req.body;

  if (!name || !description || price === undefined || stock === undefined || !sku) {
    return res.status(400).json({ error: 'Os campos nome, descrição, preço, estoque e SKU são obrigatórios.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Cria produto
    const productResult = await client.query(
      `INSERT INTO products (name, description, price, stock, category_id, sku) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [name, description, price, stock, category_id || null, sku]
    );
    const product = productResult.rows[0];

    // Cria imagens se fornecidas
    if (images && Array.isArray(images) && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const imageUrl = images[i];
        const isMain = i === 0; // Primeira imagem como principal por padrão
        await client.query(
          'INSERT INTO product_images (product_id, image_url, is_main) VALUES ($1, $2, $3)',
          [product.id, imageUrl, isMain]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Produto cadastrado com sucesso.', product });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar produto:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Já existe um produto cadastrado com este SKU.' });
    }
    res.status(500).json({ error: 'Erro interno do servidor ao cadastrar produto.' });
  } finally {
    client.release();
  }
});

// PUT /api/products/:id - Editar produto (Admin)
router.put('/:id', admin, async (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock, category_id, sku, is_active, images } = req.body;

  if (!name || !description || price === undefined || stock === undefined || !sku) {
    return res.status(400).json({ error: 'Os campos nome, descrição, preço, estoque e SKU são obrigatórios.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Atualiza produto
    const productResult = await client.query(
      `UPDATE products 
       SET name = $1, description = $2, price = $3, stock = $4, category_id = $5, sku = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 
       RETURNING *`,
      [name, description, price, stock, category_id || null, sku, is_active !== undefined ? is_active : true, id]
    );

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    const product = productResult.rows[0];

    // Se passar imagens novas, atualiza-as
    if (images && Array.isArray(images)) {
      // Remove imagens antigas
      await client.query('DELETE FROM product_images WHERE product_id = $1', [id]);
      
      // Insere novas imagens
      for (let i = 0; i < images.length; i++) {
        const imageUrl = images[i];
        const isMain = i === 0;
        await client.query(
          'INSERT INTO product_images (product_id, image_url, is_main) VALUES ($1, $2, $3)',
          [id, imageUrl, isMain]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Produto atualizado com sucesso.', product });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao editar produto:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Já existe outro produto cadastrado com este SKU.' });
    }
    res.status(500).json({ error: 'Erro interno do servidor ao editar produto.' });
  } finally {
    client.release();
  }
});

// DELETE /api/products/:id - Desativar produto / Soft Delete (Admin)
router.delete('/:id', admin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      'UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
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
