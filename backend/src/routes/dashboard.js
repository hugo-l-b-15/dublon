const express = require('express');
const router = express.Router();
const db = require('../db');
const { admin } = require('../middleware/auth');

// GET /api/dashboard - Estatísticas gerais (Admin)
router.get('/', admin, async (req, res) => {
  try {
    // 1. Receita total (soma de todos os pedidos não cancelados)
    const revenueResult = await db.query(
      "SELECT COALESCE(SUM(total), 0) as total_revenue FROM orders WHERE status != 'cancelled'"
    );
    const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue);

    // 2. Quantidade total de pedidos
    const ordersResult = await db.query('SELECT COUNT(*) as total_orders FROM orders');
    const totalOrders = parseInt(ordersResult.rows[0].total_orders);

    // 3. Quantidade de clientes cadastrados
    const customersResult = await db.query("SELECT COUNT(*) as total_customers FROM users WHERE role = 'customer'");
    const totalCustomers = parseInt(customersResult.rows[0].total_customers);

    // 4. Quantidade de produtos ativos
    const productsResult = await db.query('SELECT COUNT(*) as total_products FROM products WHERE is_active = true');
    const totalProducts = parseInt(productsResult.rows[0].total_products);

    // 5. Últimos 5 pedidos recentes
    const recentOrdersResult = await db.query(`
      SELECT o.id, o.total, o.status, o.created_at, u.name as user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    // 6. Pedidos agrupados por status
    const statusResult = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM orders 
      GROUP BY status
    `);

    res.json({
      metrics: {
        totalRevenue,
        totalOrders,
        totalCustomers,
        totalProducts
      },
      recentOrders: recentOrdersResult.rows,
      ordersByStatus: statusResult.rows
    });
  } catch (error) {
    console.error('Erro ao gerar dados do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao gerar dados do dashboard.' });
  }
});

module.exports = router;
