const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../db');

async function initializeDatabase() {
  console.log('Iniciando inicialização do banco de dados...');
  const client = await db.pool.connect();

  try {
    // 1. Executa o Schema
    console.log('Criando tabelas (schema.sql)...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log('Schema aplicado com sucesso.');

    // 2. Executa o Seed
    console.log('Inserindo dados estáticos (seed.sql)...');
    const seedPath = path.join(__dirname, 'seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await client.query(seedSql);
    console.log('Seeds de exemplo aplicados com sucesso.');

    // 3. Cria o Usuário Admin Padrão se não existir
    console.log('Verificando usuário administrador...');
    const adminEmail = 'admin@dublon.com.br';
    const adminCheck = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);

    if (adminCheck.rows.length === 0) {
      console.log('Usuário administrador não encontrado. Criando admin padrão...');
      const hashedPassword = await bcrypt.hash('dublon@2026', 10);
      await client.query(
        `INSERT INTO users (name, email, password, role) 
         VALUES ($1, $2, $3, $4)`,
        ['Administrador Dublon', adminEmail, hashedPassword, 'admin']
      );
      console.log('Usuário admin padrão criado com sucesso:');
      console.log(`Email: ${adminEmail}`);
      console.log('Senha: dublon@2026');
    } else {
      console.log('Usuário administrador já cadastrado.');
    }

    console.log('Banco de dados inicializado com sucesso.');
  } catch (error) {
    console.error('Erro ao inicializar o banco de dados:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = initializeDatabase;
