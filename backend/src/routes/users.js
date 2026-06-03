const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { auth, admin } = require('../middleware/auth');

// GET /api/users/profile - Obter perfil + endereços do usuário logado
router.get('/profile', auth, async (req, res) => {
  try {
    const userResult = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const addressesResult = await db.query(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, id DESC',
      [req.user.id]
    );

    res.json({
      user: userResult.rows[0],
      addresses: addressesResult.rows
    });
  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao obter perfil.' });
  }
});

// PUT /api/users/profile - Atualizar perfil do usuário logado
router.put('/profile', auth, async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Os campos nome e email são obrigatórios.' });
  }

  try {
    // Se o email mudou, verifica duplicidade
    const emailCheck = await db.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, req.user.id]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Este e-mail já está sendo utilizado por outra conta.' });
    }

    const result = await db.query(
      `UPDATE users 
       SET name = $1, email = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING id, name, email, role, created_at`,
      [name, email, req.user.id]
    );

    res.json({
      message: 'Perfil atualizado com sucesso.',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao atualizar perfil.' });
  }
});

// PUT /api/users/password - Alterar senha
router.put('/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'A senha atual e a nova senha são obrigatórias.' });
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
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNewPassword, req.user.id]
    );

    res.json({ message: 'Senha alterada com sucesso.' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao alterar senha.' });
  }
});

// POST /api/users/addresses - Adicionar endereço
router.post('/addresses', auth, async (req, res) => {
  const { street, number, complement, neighborhood, city, state, zip_code, is_default } = req.body;

  if (!street || !number || !neighborhood || !city || !state || !zip_code) {
    return res.status(400).json({ error: 'Os campos rua, número, bairro, cidade, estado e CEP são obrigatórios.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Se for padrão, desativa os outros
    if (is_default) {
      await client.query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1',
        [req.user.id]
      );
    }

    const result = await client.query(
      `INSERT INTO addresses (user_id, street, number, complement, neighborhood, city, state, zip_code, is_default) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [req.user.id, street, number, complement || null, neighborhood, city, state, zip_code, !!is_default]
    );

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Endereço cadastrado com sucesso.',
      address: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao cadastrar endereço:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao cadastrar endereço.' });
  } finally {
    client.release();
  }
});

// DELETE /api/users/addresses/:id - Remover endereço
router.delete('/addresses/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      'DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING *',
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

// GET /api/users - Listar todos os usuários (Admin)
router.get('/', admin, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY id DESC'
    );
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao listar usuários.' });
  }
});

module.exports = router;
