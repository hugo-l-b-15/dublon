const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/coupons/validate – Validar cupom
router.post('/validate', async (req, res) => {
  const { code, order_value } = req.body;

  if (!code) return res.status(400).json({ error: 'Código do cupom é obrigatório.' });

  try {
    const result = await db.query(
      `SELECT * FROM coupons 
       WHERE code=$1 AND is_active=true 
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (max_uses IS NULL OR used_count < max_uses)`,
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cupom inválido ou expirado.' });
    }

    const coupon = result.rows[0];

    if (order_value && parseFloat(order_value) < parseFloat(coupon.min_order_value)) {
      return res.status(400).json({
        error: `Este cupom requer valor mínimo de R$ ${parseFloat(coupon.min_order_value).toFixed(2).replace('.', ',')}.`
      });
    }

    // Calcula desconto sem revelar código completo
    let discount = 0;
    if (order_value) {
      if (coupon.discount_type === 'percentage') {
        discount = parseFloat(order_value) * (parseFloat(coupon.discount_value) / 100);
      } else {
        discount = Math.min(parseFloat(coupon.discount_value), parseFloat(order_value));
      }
    }

    res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value
      },
      discount
    });
  } catch (error) {
    console.error('Erro ao validar cupom:', error);
    res.status(500).json({ error: 'Erro interno ao validar cupom.' });
  }
});

module.exports = router;
