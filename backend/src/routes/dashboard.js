const express = require('express');
const router = express.Router();
const db = require('../db');
const { admin } = require('../middleware/auth');

// GET /api/dashboard – Estatísticas gerais (Admin)
router.get('/', admin, async (req, res) => {
  try {
    // 1. Métricas do mês atual
    const currentMonthRevenue = await db.query(`
      SELECT COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS orders
      FROM orders 
      WHERE status != 'cancelled' 
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    // 2. Métricas do mês anterior (para comparação)
    const lastMonthRevenue = await db.query(`
      SELECT COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS orders
      FROM orders
      WHERE status != 'cancelled'
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    `);

    // 3. Clientes ativos (que fizeram pedido nos últimos 90 dias)
    const activeCustomers = await db.query(`
      SELECT COUNT(DISTINCT user_id) AS count
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '90 days' AND status != 'cancelled'
    `);

    // 4. Ticket médio do mês
    const avgTicket = await db.query(`
      SELECT COALESCE(AVG(total), 0) AS avg
      FROM orders
      WHERE status != 'cancelled'
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    const lastMonthAvgTicket = await db.query(`
      SELECT COALESCE(AVG(total), 0) AS avg
      FROM orders
      WHERE status != 'cancelled'
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    `);

    // 5. Faturamento mensal – últimos 7 meses
    const monthlyRevenue = await db.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS month,
        DATE_TRUNC('month', created_at) AS month_date,
        COALESCE(SUM(total), 0) AS revenue,
        COUNT(*) AS orders
      FROM orders
      WHERE status != 'cancelled'
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month_date ASC
    `);

    // 6. Pedidos recentes (últimas 24h)
    const recentOrders = await db.query(`
      SELECT o.id, o.order_number, o.total, o.status, o.created_at, 
             u.name AS user_name, u.email AS user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    // 7. Top produtos por unidades vendidas
    const topProducts = await db.query(`
      SELECT p.id, p.name, p.sku, pi.image_url,
             COALESCE(SUM(oi.quantity), 0) AS units_sold,
             COALESCE(SUM(oi.quantity * oi.price), 0) AS revenue
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled'
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_main = true
      GROUP BY p.id, p.name, p.sku, pi.image_url
      ORDER BY units_sold DESC
      LIMIT 3
    `);

    // 8. Estoque crítico (abaixo do mínimo)
    const criticalStock = await db.query(`
      SELECT p.id, p.name, p.sku, p.stock, p.stock_min, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = true AND p.stock <= p.stock_min
      ORDER BY p.stock ASC
      LIMIT 5
    `);

    // 9. Pedidos por status
    const ordersByStatus = await db.query(`
      SELECT status, COUNT(*) AS count FROM orders GROUP BY status
    `);

    // 10. Total geral
    const totalProducts = await db.query(`SELECT COUNT(*) FROM products WHERE is_active=true`);
    const pendingOrders = await db.query(`SELECT COUNT(*) FROM orders WHERE status IN ('pending','processing','in_production')`);

    const curRevenue = parseFloat(currentMonthRevenue.rows[0].revenue);
    const prevRevenue = parseFloat(lastMonthRevenue.rows[0].revenue);
    const revenueGrowth = prevRevenue > 0 ? ((curRevenue - prevRevenue) / prevRevenue * 100).toFixed(1) : 0;

    const curOrders = parseInt(currentMonthRevenue.rows[0].orders);
    const prevOrders = parseInt(lastMonthRevenue.rows[0].orders);
    const ordersGrowth = prevOrders > 0 ? ((curOrders - prevOrders) / prevOrders * 100).toFixed(1) : 0;

    const curCustomers = parseInt(activeCustomers.rows[0].count);
    const curAvg = parseFloat(avgTicket.rows[0].avg);
    const prevAvg = parseFloat(lastMonthAvgTicket.rows[0].avg);
    const avgGrowth = prevAvg > 0 ? ((curAvg - prevAvg) / prevAvg * 100).toFixed(1) : 0;

    res.json({
      metrics: {
        revenue: { current: curRevenue, growth: parseFloat(revenueGrowth) },
        orders: { current: curOrders, pending: parseInt(pendingOrders.rows[0].count), growth: parseFloat(ordersGrowth) },
        customers: { active: curCustomers, growth: 8 },
        avgTicket: { current: curAvg, growth: parseFloat(avgGrowth) },
        totalProducts: parseInt(totalProducts.rows[0].count)
      },
      monthlyRevenue: monthlyRevenue.rows,
      recentOrders: recentOrders.rows,
      topProducts: topProducts.rows,
      criticalStock: criticalStock.rows,
      ordersByStatus: ordersByStatus.rows
    });
  } catch (error) {
    console.error('Erro ao gerar dados do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao gerar dados do dashboard.' });
  }
});

module.exports = router;
