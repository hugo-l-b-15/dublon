# DUBLON — Palmilhas Industriais

> E-commerce B2B completo com painel administrativo, integração de API e deploy na Railway.

![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Railway](https://img.shields.io/badge/Deploy-Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white)

---

## 📋 Sobre o Projeto

A **DUBLON Palmilhas Industriais** é uma plataforma de e-commerce B2B especializada em palmilhas industriais, EPI e esportivas. O sistema cobre desde o catálogo de produtos até o rastreamento de pedidos, orçamentos personalizados e um painel de gestão administrativo completo.

### Funcionalidades principais

| Área | Funcionalidade |
|------|---------------|
| 🛒 **Loja** | Catálogo com filtros, página de produto, carrinho e checkout |
| 📦 **Pedidos** | Listagem, rastreamento em tempo real, cancelamento |
| 👤 **Perfil** | Dados pessoais, endereços, segurança, notificações |
| 💬 **Contato** | Formulário de contato e solicitação de orçamento |
| 🔐 **Admin** | Dashboard de métricas, gestão de produtos e pedidos |
| 🔑 **Auth** | JWT + bcrypt, modo demo sem banco de dados |

---

## 🛠️ Tecnologias

### Frontend
- **HTML5 + CSS3** — Design premium responsivo com glassmorphism, gradientes e micro-animações
- **JavaScript Vanilla** — Carrinho, filtros, rastreamento e consumo dinâmico da API via `js/api.js`
- **Fontes:** Sora + DM Sans (Google Fonts)

### Backend
- **Node.js 20 + Express 4** — Servidor e roteador de APIs REST
- **PostgreSQL 16** — Banco de dados relacional
- **jsonwebtoken (JWT)** — Autenticação stateless
- **bcryptjs** — Hash seguro de senhas
- **pg (node-postgres)** — Driver PostgreSQL
- **dotenv** — Gerenciamento de variáveis de ambiente
- **cors** — Cross-Origin Resource Sharing

### Infra
- **Docker** — Containerização via `Dockerfile` na raiz
- **Railway** — Deploy automático via `railway.json` + `railway.toml`

---

## 📂 Estrutura do Projeto

```
dublon/
├── admin/                        # Painel administrativo (SPA estática)
│   ├── dashboard.html            # Métricas, gráfico de vendas, pedidos recentes
│   ├── pedidos.html              # Gestão de pedidos
│   ├── produtos.html             # Listagem de produtos
│   └── produto-novo.html         # Cadastro de produto
├── assets/
│   └── images/
│       └── dublon_logo_transparente.png  # Logo oficial (PNG transparente)
├── css/
│   ├── global.css                # Variáveis de design, reset, tipografia
│   ├── components.css            # Botões, badges, tabelas, cards
│   └── navbar.css                # Navbar responsiva
├── js/
│   ├── api.js                    # Gateway central — todos os fetch() para o backend
│   └── main.js                   # Inicialização global do frontend
├── backend/
│   ├── package.json
│   └── src/
│       ├── index.js              # Entry point — middlewares, rotas, static files
│       ├── db.js                 # Pool de conexões PostgreSQL
│       ├── db/
│       │   ├── schema.sql        # DDL completo (tabelas, índices, constraints)
│       │   ├── seed.sql          # Dados iniciais (categorias, produtos, cupons, usuários)
│       │   └── init.js           # Auto-migração e seed no boot
│       ├── middleware/
│       │   └── auth.js           # Middlewares JWT: auth() e admin()
│       └── routes/
│           ├── auth.js           # /api/auth — login, register, /me + modo demo
│           ├── products.js       # /api/products — CRUD de produtos
│           ├── orders.js         # /api/orders — pedidos e rastreamento
│           ├── users.js          # /api/users — perfil, endereços, clientes
│           ├── categories.js     # /api/categories
│           ├── contact.js        # /api/contact
│           ├── quote.js          # /api/quote — orçamentos
│           ├── dashboard.js      # /api/dashboard — métricas e relatórios
│           ├── cart.js           # /api/cart — carrinho persistente
│           └── coupons.js        # /api/coupons — validação de cupons
├── [Páginas HTML]                # index, catalogo, produto, carrinho, checkout,
│                                 # login, cadastro, perfil, meus-pedidos,
│                                 # rastreamento, contato, orcamento,
│                                 # sobre, servicos, pedido-confirmado
├── Dockerfile                    # Imagem Node 20 Alpine
├── railway.json                  # Builder DOCKERFILE + startCommand
├── railway.toml                  # Documentação de variáveis Railway
└── .env.example                  # Modelo de variáveis de ambiente
```

---

## ⚙️ Execução Local

### Pré-requisitos
- Node.js ≥ 20
- PostgreSQL rodando localmente (ou string de conexão remota)

### Passo a passo

```bash
# 1. Clonar o repositório
git clone https://github.com/hugo-l-b-15/dublon.git
cd dublon

# 2. Instalar dependências do backend
cd backend
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
```

Edite `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:sua_senha@localhost:5432/dublon
JWT_SECRET=sua-chave-secreta-forte
PORT=3000
NODE_ENV=development
```

```bash
# 4. Iniciar o servidor (auto-cria tabelas e seed no primeiro boot)
npm run dev
```

Acesse: **[http://localhost:3000](http://localhost:3000)**

> **Sem banco de dados?** O servidor sobe mesmo sem `DATABASE_URL` configurada — apenas log de aviso. Use o [modo demo](#-modo-demo) para navegar pelo painel admin.

---

## 🚀 Deploy no Railway

O projeto está totalmente configurado para Railway com `railway.json` e `railway.toml`.

### Passo a passo

1. Acesse [railway.app](https://railway.app/) e crie um projeto a partir do repositório `hugo-l-b-15/dublon`
2. Clique em **Add Service → Database → PostgreSQL**
3. Vá em **seu serviço → Variables → Add Reference** e selecione `DATABASE_URL` do plugin Postgres
4. Adicione manualmente a variável `JWT_SECRET` com uma string forte e aleatória
5. Faça redeploy — o backend inicializa o schema e seed automaticamente

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | ✅ Sim | Connection string PostgreSQL (injetada pelo plugin Railway) |
| `JWT_SECRET` | ✅ Sim | Chave de assinatura dos tokens JWT |
| `PORT` | ➖ Auto | Porta HTTP (Railway injeta automaticamente) |
| `NODE_ENV` | ➖ Opcional | `production` por padrão |

---

## 🔑 Credenciais de Acesso

### Usuário Admin (banco de dados)
| Campo | Valor |
|-------|-------|
| E-mail | `admin@dublon.com.br` |
| Senha | `password` |
| Acesso | `/admin/dashboard.html` |

> ⚠️ Altere a senha após o primeiro acesso em produção.

### Usuário Cliente de Exemplo (seed)
| Campo | Valor |
|-------|-------|
| E-mail | `joao@empresa.com.br` |
| Senha | `password` |

---

## 🎭 Modo Demo

Para apresentações **sem banco de dados configurado**, use as credenciais de demonstração:

| Campo | Valor |
|-------|-------|
| E-mail | `demo@dublon.com.br` |
| Senha | `demo1234` |
| Role | `admin` |
| Validade do token | 8 horas |

O modo demo retorna um JWT válido com `role: admin` **sem consultar o banco**, permitindo navegação completa pelo painel administrativo e frontend.

---

## 📡 API — Endpoints Principais

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| `POST` | `/api/auth/login` | Login (+ modo demo) | — |
| `POST` | `/api/auth/register` | Cadastro de cliente | — |
| `GET` | `/api/auth/me` | Dados do usuário logado | 🔒 |
| `GET` | `/api/products` | Listar produtos (com filtros) | — |
| `GET` | `/api/products/:id` | Detalhe do produto | — |
| `GET` | `/api/categories` | Listar categorias | — |
| `GET` | `/api/orders` | Pedidos do usuário | 🔒 |
| `POST` | `/api/orders` | Criar pedido | 🔒 |
| `GET` | `/api/orders/track/:code` | Rastrear pedido | — |
| `GET` | `/api/cart` | Carrinho do usuário | 🔒 |
| `POST` | `/api/cart` | Adicionar item ao carrinho | 🔒 |
| `POST` | `/api/coupons/validate` | Validar cupom | 🔒 |
| `GET` | `/api/users/profile` | Perfil do usuário | 🔒 |
| `PUT` | `/api/users/profile` | Atualizar perfil | 🔒 |
| `POST` | `/api/contact` | Enviar mensagem de contato | — |
| `POST` | `/api/quote` | Solicitar orçamento | — |
| `GET` | `/api/dashboard/stats` | Métricas gerais | 🔐 Admin |
| `GET` | `/api/health` | Health check | — |

🔒 = requer token JWT de usuário &nbsp;|&nbsp; 🔐 = requer token JWT com `role: admin`

---

## 🎨 Design System

Paleta de cores e variáveis CSS centralizadas em `css/global.css`:

| Token | Valor | Uso |
|-------|-------|-----|
| `--blue-dark` | `#0F2847` | Backgrounds escuros, hero |
| `--blue-vibrant` | `#2563EB` | CTA primário, links |
| `--cyan-accent` | `#22D3EE` | Destaques, badges |
| `--green-success` | `#22C55E` | Status positivos |
| `--yellow-warn` | `#F59E0B` | Alertas, em produção |
| `--red-error` | `#EF4444` | Erros, cancelamentos |

---

## 🗃️ Cupons de Desconto (seed)

| Código | Tipo | Desconto | Pedido mínimo |
|--------|------|----------|---------------|
| `DUBLONO` | Percentual | 10% | R$ 50,00 |
| `PRIMEIRA10` | Fixo | R$ 10,00 | R$ 80,00 |
| `INDUSTRIAL20` | Percentual | 20% | R$ 200,00 |

---

## 📄 Licença

Projeto proprietário — todos os direitos reservados à **DUBLON Palmilhas Industriais**.