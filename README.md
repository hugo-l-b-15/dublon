# DUBLON — Palmilhas Industriais

Este projeto consiste em um website institucional completo com e-commerce e sistema de solicitação de orçamentos para a **DUBLON Palmilhas Industriais**. O sistema possui um frontend estático completo e interativo e um backend robusto construído em Node.js com Express e persistência em banco de dados PostgreSQL, pronto para deploy na plataforma Railway.

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **HTML5** & **CSS3** (Estilização premium, responsiva e moderna baseada nas especificações de UI originais)
- **JavaScript (Vanilla)** (Interações dinâmicas, carrinho de compras, rastreamento de pedidos e consumo de API)

### Backend
- **Node.js** com **Express** (Servidor web e roteador de APIs)
- **PostgreSQL** (Banco de dados relacional de alta confiabilidade)
- **jsonwebtoken (JWT)** (Mecanismo stateless de autenticação segura)
- **bcryptjs** (Hash e criptografia segura de senhas)
- **pg (node-postgres)** (Driver de conexão com o PostgreSQL)
- **dotenv** (Gerenciamento seguro de variáveis de ambiente)
- **cors** (Habilitação de Cross-Origin Resource Sharing)

---

## 📂 Estrutura do Projeto

```
dublon/
├── admin/                      # Painel administrativo do frontend
├── assets/                     # Imagens, logotipos e mídias do site
├── css/                        # Estilos globais e específicos das páginas
├── js/                         # Scripts de lógica do frontend
├── backend/                    # Pasta raiz do servidor backend
│   ├── src/
│   │   ├── index.js            # Ponto de entrada do Express (configura middlewares, rotas e estáticos)
│   │   ├── db.js               # Gerenciador da Pool de conexões do PostgreSQL
│   │   ├── db/
│   │   │   ├── schema.sql      # Estrutura do banco de dados (tabelas e chaves)
│   │   │   ├── seed.sql        # Dados iniciais (categorias e produtos)
│   │   │   └── init.js         # Inicializador automático de tabelas e do admin
│   │   ├── middleware/
│   │   │   └── auth.js         # Middleware para rotas protegidas (Usuários e Admin)
│   │   └── routes/
│   │       ├── auth.js         # Rotas de Registro, Login e Verificação (/api/auth)
│   │       ├── products.js     # Rotas do catálogo de produtos (/api/products)
│   │       ├── orders.js       # Rotas de compras e pedidos (/api/orders)
│   │       ├── users.js        # Rotas de perfil, endereços e clientes (/api/users)
│   │       ├── categories.js   # Rotas de categorias do catálogo (/api/categories)
│   │       ├── contact.js      # Rotas do formulário de contato (/api/contact)
│   │       ├── quote.js        # Rotas de cotação/orçamentos (/api/quote)
│   │       └── dashboard.js    # Rotas com relatórios financeiros e estatísticas (/api/dashboard)
│   ├── .env.example            # Exemplo de configuração de ambiente local
│   └── package.json            # Dependências e scripts do servidor Node.js
├── Dockerfile                  # Arquivo de containerização para Deploy no Railway
├── .env.example                # Arquivo de exemplo de ambiente na raiz
└── [Páginas HTML]              # Arquivos HTML do site (index.html, sobre.html, etc.)
```

---

## ⚙️ Configuração e Execução Local

### Pré-requisitos
- **Node.js** (versão 20 ou superior)
- **PostgreSQL** instalado e rodando em sua máquina local

### Passo a Passo

1. **Clonar o Repositório**
   ```bash
   git clone https://github.com/hugo-l-b-15/dublon.git
   cd dublon
   ```

2. **Instalar Dependências do Backend**
   ```bash
   cd backend
   npm install
   ```

3. **Configurar as Variáveis de Ambiente**
   Copie o arquivo `.env.example` para `.env` e configure as credenciais do seu banco de dados PostgreSQL local e sua chave secreta JWT:
   ```bash
   cp .env.example .env
   ```
   Abra o arquivo `.env` e edite as informações se necessário:
   ```env
   DATABASE_URL=postgresql://postgres:sua_senha_aqui@localhost:5432/dublon
   JWT_SECRET=sua-chave-secreta-para-token-jwt
   PORT=3000
   NODE_ENV=development
   ```

4. **Executar em Modo de Desenvolvimento**
   Com o PostgreSQL rodando localmente e a variável `DATABASE_URL` configurada, inicie o servidor:
   ```bash
   npm run dev
   ```
   *Nota: O backend está programado para criar automaticamente todas as tabelas (definidas em `schema.sql`), popular os dados de exemplo (`seed.sql`) e criar o usuário administrador no primeiro boot.*

5. **Acessar o Projeto**
   Abra seu navegador e acesse:
   [http://localhost:3000](http://localhost:3000)

---

## 🚀 Deploy no Railway

O projeto está totalmente configurado e otimizado para deploy no **Railway** utilizando o Dockerfile presente na raiz.

1. Acesse o painel do [Railway](https://railway.app/).
2. Crie um novo projeto a partir de seu repositório no GitHub (`hugo-l-b-15/dublon`).
3. No painel do projeto do Railway, clique em **Add Service** -> **Database** -> **PostgreSQL**.
4. Conecte o serviço do banco de dados PostgreSQL ao seu serviço do aplicativo (isso injetará a variável de ambiente `DATABASE_URL` automaticamente).
5. Defina a variável de ambiente adicional `JWT_SECRET` com uma frase secreta forte nas configurações da aplicação.
6. O Railway irá construir a imagem Docker e inicializar o projeto automaticamente.

---

## 🔑 Acesso de Administrador Padrão

Após a inicialização do banco de dados, o sistema gera automaticamente uma conta de administrador inicial para gerenciamento do catálogo e visualização de pedidos, orçamentos e mensagens de contato:

- **E-mail:** `admin@dublon.com.br`
- **Senha:** `dublon@2026`

*(Recomenda-se alterar a senha após o primeiro acesso pelo painel de perfil do usuário).*