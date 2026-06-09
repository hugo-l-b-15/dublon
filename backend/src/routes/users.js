const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { auth, admin } = require('../middleware/auth');

// GET /api/users/profile – Perfil completo + endereços + estatísticas
router.get('/profile', auth, async (req, res) => {
  try {
    const userResult = await db.query(
      `SELECT id, name, email, role, cpf, phone, birthdate, company, avatar_url, is_premium,
              notification_email, notification_sms, notification_promo, notification_newsletter,
              two_factor_enabled, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const addressesResult = await db.query(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, id DESC',
      [req.user.id]
    );

    // Estatísticas do cliente
    const statsResult = await db.query(
      `SELECT 
         COUNT(DISTINCT o.id) AS total_orders,
         COALESCE(SUM(oi.quantity), 0) AS total_pairs,
         COUNT(DISTINCT CASE WHEN o.status = 'delivered' THEN o.id END) AS delivered,
         COALESCE(SUM(o.total), 0) AS total_spent
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1 AND o.status != 'cancelled'`,
      [req.user.id]
    );

    res.json({
      user: userResult.rows[0],
      addresses: addressesResult.rows,
      stats: statsResult.rows[0]
    });
  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao obter perfil.' });
  }
});

// PUT /api/users/profile – Atualizar perfil completo
router.put('/profile', auth, async (req, res) => {
  const { name, email, cpf, phone, birthdate, company } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Os campos nome e email são obrigatórios.' });
  }

  try {
    const emailCheck = await db.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, req.user.id]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Este e-mail já está sendo utilizado por outra conta.' });
    }

    const result = await db.query(
      `UPDATE users 
       SET name=$1, email=$2, cpf=$3, phone=$4, birthdate=$5, company=$6, updated_at=CURRENT_TIMESTAMP
       WHERE id=$7
       RETURNING id, name, email, role, cpf, phone, birthdate, company, avatar_url, is_premium, created_at`,
      [name, email, cpf || null, phone || null, birthdate || null, company || null, req.user.id]
    );

    res.json({ message: 'Perfil atualizado com sucesso.', user: result.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao atualizar perfil.' });
  }
});

// PUT /api/users/password – Alterar senha
router.put('/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'A senha atual e a nova senha são obrigatórias.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' });
  }

  try {
    const userResult = await db.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'A senha atual informada está incorreta.' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2',
      [hashedNewPassword, req.user.id]
    );

    res.json({ message: 'Senha alterada com sucesso.' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao alterar senha.' });
  }
});

// PUT /api/users/notifications – Atualizar preferências de notificação
router.put('/notifications', auth, async (req, res) => {
  const { notification_email, notification_sms, notification_promo, notification_newsletter } = req.body;

  try {
    const result = await db.query(
      `UPDATE users
       SET notification_email=$1, notification_sms=$2, notification_promo=$3, notification_newsletter=$4, updated_at=CURRENT_TIMESTAMP
       WHERE id=$5
       RETURNING notification_email, notification_sms, notification_promo, notification_newsletter`,
      [
        notification_email !== undefined ? notification_email : true,
        notification_sms !== undefined ? notification_sms : false,
        notification_promo !== undefined ? notification_promo : false,
        notification_newsletter !== undefined ? notification_newsletter : false,
        req.user.id
      ]
    );

    res.json({ message: 'Preferências de notificação atualizadas.', notifications: result.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar notificações:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao atualizar notificações.' });
  }
});

// POST /api/users/addresses – Adicionar endereço
router.post('/addresses', auth, async (req, res) => {
  const { label, street, number, complement, neighborhood, city, state, zip_code, is_default } = req.body;

  if (!street || !number || !neighborhood || !city || !state || !zip_code) {
    return res.status(400).json({ error: 'Os campos rua, número, bairro, cidade, estado e CEP são obrigatórios.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    if (is_default) {
      await client.query('UPDATE addresses SET is_default=false WHERE user_id=$1', [req.user.id]);
    }

    const result = await client.query(
      `INSERT INTO addresses (user_id, label, street, number, complement, neighborhood, city, state, zip_code, is_default) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.user.id, label || 'Casa', street, number, complement || null, neighborhood, city, state, zip_code, !!is_default]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Endereço cadastrado com sucesso.', address: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao cadastrar endereço:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao cadastrar endereço.' });
  } finally {
    client.release();
  }
});

// PUT /api/users/addresses/:id – Atualizar endereço
router.put('/addresses/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { label, street, number, complement, neighborhood, city, state, zip_code, is_default } = req.body;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    if (is_default) {
      await client.query('UPDATE addresses SET is_default=false WHERE user_id=$1', [req.user.id]);
    }

    const result = await client.query(
      `UPDATE addresses SET label=$1, street=$2, number=$3, complement=$4, neighborhood=$5, city=$6, state=$7, zip_code=$8, is_default=$9
       WHERE id=$10 AND user_id=$11 RETURNING *`,
      [label || 'Casa', street, number, complement || null, neighborhood, city, state, zip_code, !!is_default, id, req.user.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Endereço não encontrado.' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Endereço atualizado com sucesso.', address: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar endereço:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao atualizar endereço.' });
  } finally {
    client.release();
  }
});

// DELETE /api/users/addresses/:id – Remover endereço
router.delete('/addresses/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      'DELETE FROM addresses WHERE id=$1 AND user_id=$2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Endereço não encontrado ou não pertence ao usuário.' });
    }

    res.json({ message: 'Endereço excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir endereço:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao excluir endereço.' });
  }
});

// DELETE /api/users/account – Desativar conta (soft delete)
router.delete('/account', auth, async (req, res) => {
  try {
    await db.query(
      "UPDATE users SET is_active=false, email=CONCAT('deleted_', id, '_', email), updated_at=CURRENT_TIMESTAMP WHERE id=$1",
      [req.user.id]
    );
    res.json({ message: 'Conta desativada com sucesso.' });
  } catch (error) {
    console.error('Erro ao desativar conta:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao desativar conta.' });
  }
});

// GET /api/users – Listar todos os usuários (Admin)
router.get('/', admin, async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let queryText = `SELECT id, name, email, role, company, phone, is_premium, created_at FROM users WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (search) {
      queryText += ` AND (name ILIKE $${idx} OR email ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    queryText += ` ORDER BY id DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(queryText, params);
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao listar usuários.' });
  }
});

module.exports = router;
