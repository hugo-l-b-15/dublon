-- ============================================================
-- DUBLON – Database Schema
-- Versão 2.0 – Completo com todos os campos das telas
-- ============================================================

-- ── Usuários ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                      SERIAL PRIMARY KEY,
  name                    VARCHAR(255) NOT NULL,
  email                   VARCHAR(255) UNIQUE NOT NULL,
  password                VARCHAR(255) NOT NULL,
  role                    VARCHAR(50) DEFAULT 'customer',
  -- Campos do perfil
  cpf                     VARCHAR(20),
  phone                   VARCHAR(30),
  birthdate               DATE,
  company                 VARCHAR(255),
  avatar_url              TEXT,
  is_premium              BOOLEAN DEFAULT false,
  -- Preferências de notificação
  notification_email      BOOLEAN DEFAULT true,
  notification_sms        BOOLEAN DEFAULT false,
  notification_promo      BOOLEAN DEFAULT false,
  notification_newsletter BOOLEAN DEFAULT false,
  -- Segurança
  two_factor_enabled      BOOLEAN DEFAULT false,
  -- Timestamps
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Endereços ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS addresses (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
  label          VARCHAR(100) DEFAULT 'Casa',
  street         VARCHAR(255) NOT NULL,
  number         VARCHAR(50) NOT NULL,
  complement     VARCHAR(255),
  neighborhood   VARCHAR(255) NOT NULL,
  city           VARCHAR(255) NOT NULL,
  state          VARCHAR(100) NOT NULL,
  zip_code       VARCHAR(20) NOT NULL,
  is_default     BOOLEAN DEFAULT false,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Categorias ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  color       VARCHAR(50) DEFAULT '#3B82F6',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Produtos ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                   SERIAL PRIMARY KEY,
  name                 VARCHAR(255) NOT NULL,
  description          TEXT NOT NULL,
  price                DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  original_price       DECIMAL(10,2),
  discount_percentage  INTEGER DEFAULT 0,
  stock                INTEGER NOT NULL DEFAULT 0,
  stock_min            INTEGER DEFAULT 50,
  category_id          INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  is_active            BOOLEAN DEFAULT true,
  is_new               BOOLEAN DEFAULT false,
  sku                  VARCHAR(100) UNIQUE,
  -- Especificações técnicas
  density              VARCHAR(50),
  thickness            VARCHAR(50),
  material             VARCHAR(100),
  certification        VARCHAR(100),
  durability           VARCHAR(100),
  application          VARCHAR(100),
  -- Variantes
  colors               JSONB DEFAULT '[]',
  sizes                JSONB DEFAULT '[]',
  -- Avaliações
  rating               DECIMAL(2,1) DEFAULT 0.0,
  reviews_count        INTEGER DEFAULT 0,
  -- Timestamps
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Imagens de Produtos ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER REFERENCES products(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  is_main     BOOLEAN DEFAULT false,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Cupons de Desconto ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id                SERIAL PRIMARY KEY,
  code              VARCHAR(50) UNIQUE NOT NULL,
  description       VARCHAR(255),
  discount_type     VARCHAR(20) DEFAULT 'percentage',  -- 'percentage' ou 'fixed'
  discount_value    DECIMAL(10,2) NOT NULL,
  min_order_value   DECIMAL(10,2) DEFAULT 0.00,
  max_uses          INTEGER,
  used_count        INTEGER DEFAULT 0,
  is_active         BOOLEAN DEFAULT true,
  expires_at        TIMESTAMP WITH TIME ZONE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Carrinho ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
  id          SERIAL PRIMARY KEY,
  session_id  VARCHAR(255),
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  product_id  INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 1,
  color       VARCHAR(50),
  size        VARCHAR(20),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Pedidos ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               SERIAL PRIMARY KEY,
  order_number     VARCHAR(30) UNIQUE,
  user_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  subtotal         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount         DECIMAL(10,2) DEFAULT 0.00,
  shipping_cost    DECIMAL(10,2) DEFAULT 0.00,
  total            DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status           VARCHAR(50) DEFAULT 'pending',
  -- 'pending' | 'processing' | 'in_production' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled'
  payment_method   VARCHAR(50),
  shipping_method  VARCHAR(50) DEFAULT 'standard',
  coupon_code      VARCHAR(50),
  tracking_code    VARCHAR(255),
  address_id       INTEGER REFERENCES addresses(id) ON DELETE SET NULL,
  notes            TEXT,
  estimated_delivery DATE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sequência para order_number no formato DBL-YYYY-NNNNN
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 4820;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'DBL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('order_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_number ON orders;
CREATE TRIGGER trg_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

-- ── Itens do Pedido ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id   INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255),
  quantity     INTEGER NOT NULL DEFAULT 1,
  price        DECIMAL(10,2) NOT NULL,
  color        VARCHAR(50),
  size         VARCHAR(20)
);

-- ── Eventos de Rastreio ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_tracking_events (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  status      VARCHAR(50) NOT NULL,
  location    VARCHAR(255),
  description TEXT,
  event_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Mensagens de Contato ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id          SERIAL PRIMARY KEY,
  first_name  VARCHAR(100) NOT NULL,
  last_name   VARCHAR(100),
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  phone       VARCHAR(30),
  subject     VARCHAR(255),
  message     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Solicitações de Orçamento ────────────────────────────────
CREATE TABLE IF NOT EXISTS quote_requests (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  company       VARCHAR(255),
  phone         VARCHAR(50),
  product_id    INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_type  VARCHAR(255),
  quantity      INTEGER DEFAULT 100,
  message       TEXT NOT NULL,
  status        VARCHAR(50) DEFAULT 'pending',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Avaliações de Produto ────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_reviews (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER REFERENCES products(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_name   VARCHAR(255),
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Índices de Performance ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_user_id    ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number     ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_cart_user_id      ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_session      ON cart_items(session_id);
CREATE INDEX IF NOT EXISTS idx_products_active   ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_tracking_order    ON order_tracking_events(order_id);
