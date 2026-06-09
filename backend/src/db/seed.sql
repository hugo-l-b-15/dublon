-- ============================================================
-- DUBLON – Seed Data v2.0
-- Dados de exemplo realistas baseados nas telas do sistema
-- ============================================================

-- ── Categorias ───────────────────────────────────────────────
INSERT INTO categories (name, slug, description, color) VALUES
  ('EVA Duplado',          'eva-duplado',          'Palmilhas em EVA bi-camada de alta performance.',       '#3B82F6'),
  ('Esportivo',            'esportivo',            'Linha esportiva ultra leve para alta performance.',     '#22C55E'),
  ('EPI Industrial',       'epi-industrial',       'Linha EPI com certificação CA para segurança do trabalho.', '#F59E0B'),
  ('Premium',              'premium',              'Palmilhas premium com materiais de alta tecnologia.',    '#8B5CF6'),
  ('EVA Simples',          'eva-simples',          'Palmilhas de EVA simples para uso geral.',              '#64748B'),
  ('Antiperfurante',       'antiperfurante',       'Palmilhas com proteção contra perfurações (Kevlar/Aço).','#EF4444'),
  ('PU Conforto',          'pu-conforto',          'Palmilhas de Poliuretano para máximo conforto.',        '#06B6D4')
ON CONFLICT (slug) DO NOTHING;

-- ── Produtos ─────────────────────────────────────────────────
INSERT INTO products (name, description, price, original_price, discount_percentage, stock, stock_min, category_id, sku, is_new, density, thickness, material, certification, durability, application, colors, sizes, rating, reviews_count)
VALUES
  (
    'Palmilha EVA Pro D45',
    'Alta absorção de impacto para uso industrial intenso, reduzindo fadiga em jornadas prolongadas. Camadas duplas de EVA com densidades distintas: conforto no topo, firmeza na base. Superfície microcelular antibacteriana com tratamento antiodor de longa duração. Compatível com todos os tipos de calçado industrial, segurança e esportivo. Arco de suporte anatômico integrado para alívio de pressão plantar.',
    89.90, 99.90, 10, 984, 50, 1, 'EVA-D45-001', true,
    'D45 kg/m²', '8 mm', 'EVA Duplado', 'CA 12345', '12 meses', 'Industrial / EPI',
    '["#1a1a1a","#1D4ED8","#60A5FA","#22C55E","#10B981"]'::jsonb,
    '[34,35,36,37,38,39,40,41,42,43,44,45]'::jsonb,
    4.4, 128
  ),
  (
    'Sport Runner X',
    'Palmilha ultra leve desenvolvida para calçados esportivos de alta performance. Tecnologia Cleno Tech para máximo amortecimento e retorno de energia. Ideal para corrida, treinamento e uso diário intenso.',
    109.90, 109.90, 0, 756, 50, 2, 'SPT-RNX-001', false,
    'Ultra leve', '6 mm', 'Cleno Tech', 'ABNT NBR', '18 meses', 'Esportivo / Corrida',
    '["#1a1a1a","#1D4ED8","#60A5FA"]'::jsonb,
    '[36,37,38,39,40,41,42,43,44]'::jsonb,
    4.7, 89
  ),
  (
    'EPI Steel Grip',
    'Palmilha antiperfurante de aço certificada CA para uso em obras, indústrias pesadas e ambientes de alto risco. Resistência superior contra pregos, arames e objetos cortantes.',
    149.90, 149.90, 0, 20, 30, 3, 'EPI-STL-001', false,
    'Aço Carbono', '2.5 mm', 'Aço Temperado', 'CA Aprovado', '24 meses', 'EPI Industrial',
    '["#1a1a1a","#334155"]'::jsonb,
    '[38,39,40,41,42,43,44,45,46]'::jsonb,
    4.6, 203
  ),
  (
    'Palmilha Premium D50',
    'Linha premium com material de última geração, alta densidade D50 para máximo suporte. Acabamento superior com couro ecológico antibacteriano.',
    199.90, 199.90, 0, 402, 50, 4, 'PRM-D50-001', false,
    'D50 kg/m²', '10 mm', 'EVA Premium', 'ISO 9001', '24 meses', 'Premium / Executivo',
    '["#1a1a1a","#1D4ED8","#7C3AED"]'::jsonb,
    '[35,36,37,38,39,40,41,42,43,44,45]'::jsonb,
    4.8, 56
  ),
  (
    'Micro EVA S20',
    'Palmilha econômica de EVA simples, leve e funcional para uso geral. Ideal para grandes volumes industriais.',
    69.90, 69.90, 0, 60, 100, 5, 'MEVA-S20-001', false,
    'S20 kg/m²', '5 mm', 'EVA Simples', '-', '6 meses', 'Uso Geral',
    '["#1a1a1a","#94A3B8","#FFFFFF"]'::jsonb,
    '[34,35,36,37,38,39,40,41,42,43,44]'::jsonb,
    4.0, 34
  ),
  (
    'Palmilha EVA Ortho D60',
    'Palmilha ortopédica com curvatura anatômica acentuada para correção postural e suporte ao arco plantar.',
    119.50, 119.50, 0, 280, 50, 1, 'EVA-ORT-D60', false,
    'D60 kg/m²', '12 mm', 'EVA Ortopédico', 'CA 98765', '12 meses', 'Ortopédico / Industrial',
    '["#1a1a1a","#1D4ED8"]'::jsonb,
    '[35,36,37,38,39,40,41,42,43,44,45]'::jsonb,
    4.3, 67
  ),
  (
    'Trail Pro',
    'Palmilha para trilhas e terrenos irregulares com amortecimento de impacto reforçado.',
    99.90, 99.90, 0, 145, 50, 2, 'TRL-PRO-001', false,
    'Ultra leve+', '7 mm', 'EVA Híbrido', 'ABNT', '12 meses', 'Esportivo / Trail',
    '["#1a1a1a","#065F46","#F59E0B"]'::jsonb,
    '[36,37,38,39,40,41,42,43]'::jsonb,
    4.5, 41
  )
ON CONFLICT (sku) DO NOTHING;

-- ── Imagens dos produtos ─────────────────────────────────────
INSERT INTO product_images (product_id, image_url, is_main)
SELECT p.id, 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600', true
FROM products p WHERE p.sku = 'EVA-D45-001'
ON CONFLICT DO NOTHING;

INSERT INTO product_images (product_id, image_url, is_main)
SELECT p.id, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', true
FROM products p WHERE p.sku = 'SPT-RNX-001'
ON CONFLICT DO NOTHING;

INSERT INTO product_images (product_id, image_url, is_main)
SELECT p.id, 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600', true
FROM products p WHERE p.sku = 'EPI-STL-001'
ON CONFLICT DO NOTHING;

INSERT INTO product_images (product_id, image_url, is_main)
SELECT p.id, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600', true
FROM products p WHERE p.sku = 'PRM-D50-001'
ON CONFLICT DO NOTHING;

INSERT INTO product_images (product_id, image_url, is_main)
SELECT p.id, 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600', true
FROM products p WHERE p.sku = 'MEVA-S20-001'
ON CONFLICT DO NOTHING;

-- ── Cupom de desconto ────────────────────────────────────────
INSERT INTO coupons (code, description, discount_type, discount_value, min_order_value, max_uses, is_active)
VALUES
  ('DUBLONO', 'Desconto de 10% em qualquer pedido', 'percentage', 10.00, 50.00, 1000, true),
  ('PRIMEIRA10', 'Desconto de R$10 na primeira compra', 'fixed', 10.00, 80.00, 500, true),
  ('INDUSTRIAL20', 'Desconto 20% linha industrial', 'percentage', 20.00, 200.00, 200, true)
ON CONFLICT (code) DO NOTHING;

-- ── Usuário de exemplo (João Silva – Cliente Premium) ────────
INSERT INTO users (name, email, password, role, cpf, phone, birthdate, company, is_premium, notification_email, notification_sms)
VALUES (
  'João Silva',
  'joao@empresa.com.br',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
  'customer',
  '123.456.789-00',
  '(11) 99999-9999',
  '1990-03-15',
  'Indústrias Silva Ltda',
  true,
  true,
  true
) ON CONFLICT (email) DO NOTHING;

-- ── Endereço do usuário de exemplo ──────────────────────────
INSERT INTO addresses (user_id, label, street, number, complement, neighborhood, city, state, zip_code, is_default)
SELECT u.id, 'Principal', 'Rua das Indústrias', '1240', 'Sala 3', 'Bairro Industrial', 'São Paulo', 'SP', '04000-000', true
FROM users u WHERE u.email = 'joao@empresa.com.br'
ON CONFLICT DO NOTHING;

-- ── Pedidos de exemplo ───────────────────────────────────────
DO $$
DECLARE
  v_user_id INTEGER;
  v_addr_id INTEGER;
  v_order_id INTEGER;
  v_prod1_id INTEGER;
  v_prod2_id INTEGER;
  v_prod3_id INTEGER;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE email = 'joao@empresa.com.br';
  SELECT id INTO v_addr_id FROM addresses WHERE user_id = v_user_id LIMIT 1;
  SELECT id INTO v_prod1_id FROM products WHERE sku = 'EVA-D45-001';
  SELECT id INTO v_prod2_id FROM products WHERE sku = 'SPT-RNX-001';
  SELECT id INTO v_prod3_id FROM products WHERE sku = 'PRM-D50-001';

  IF v_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM orders WHERE order_number = 'DBL-2024-04821') THEN

    -- Pedido 1 – Entregue
    INSERT INTO orders (order_number, user_id, subtotal, discount, shipping_cost, total, status, payment_method, shipping_method, tracking_code, address_id, estimated_delivery, created_at, updated_at)
    VALUES ('DBL-2024-04821', v_user_id, 459.60, 20.00, 0.00, 439.60, 'delivered', 'credit_card', 'standard', 'BR123456789BR', v_addr_id, '2026-01-05', '2026-01-01 09:00:00-03', '2026-01-05 14:00:00-03')
    RETURNING id INTO v_order_id;

    INSERT INTO order_items (order_id, product_id, product_name, quantity, price, color, size)
    VALUES (v_order_id, v_prod1_id, 'Palmilha EVA Pro D45', 350, 89.90, '#1a1a1a', '40');
    INSERT INTO order_items (order_id, product_id, product_name, quantity, price, color, size)
    VALUES (v_order_id, v_prod2_id, 'Sport Runner X', 250, 109.90, '#1D4ED8', '40');

    INSERT INTO order_tracking_events (order_id, status, location, description, event_at) VALUES
      (v_order_id, 'pending',           'Franca, SP',         'Pedido confirmado e aguardando processamento', '2026-01-01 09:00:00-03'),
      (v_order_id, 'processing',        'Franca, SP',         'Pagamento aprovado – iniciando produção',      '2026-01-01 11:00:00-03'),
      (v_order_id, 'in_production',     'Franca, SP',         'Em produção na fábrica Dublon',               '2026-01-02 08:00:00-03'),
      (v_order_id, 'shipped',           'Centro de dist. – Franca, SP', 'Pedido despachado pelos Correios',  '2026-01-03 07:30:00-03'),
      (v_order_id, 'out_for_delivery',  'São Paulo, SP',      'Pacote saiu para entrega final',              '2026-01-05 08:00:00-03'),
      (v_order_id, 'delivered',         'São Paulo, SP',      'Pedido entregue com sucesso',                 '2026-01-05 14:00:00-03');

    -- Pedido 2 – Em Trânsito
    INSERT INTO orders (order_number, user_id, subtotal, discount, shipping_cost, total, status, payment_method, shipping_method, tracking_code, address_id, estimated_delivery, created_at, updated_at)
    VALUES ('DBL-2024-04756', v_user_id, 359.70, 0.00, 0.00, 359.70, 'shipped', 'pix', 'standard', 'BR987654321BR', v_addr_id, '2026-05-22', '2026-05-18 10:00:00-03', '2026-05-20 08:00:00-03')
    RETURNING id INTO v_order_id;

    INSERT INTO order_items (order_id, product_id, product_name, quantity, price, color, size)
    VALUES (v_order_id, v_prod3_id, 'Palmilha Premium D50', 630, 199.90, '#1a1a1a', '42');

    INSERT INTO order_tracking_events (order_id, status, location, description, event_at) VALUES
      (v_order_id, 'pending',       'Franca, SP',                     'Pedido confirmado',                           '2026-05-18 10:00:00-03'),
      (v_order_id, 'processing',    'Franca, SP',                     'Pagamento PIX confirmado',                    '2026-05-18 10:05:00-03'),
      (v_order_id, 'in_production', 'Franca, SP',                     'Em produção',                                 '2026-05-19 08:00:00-03'),
      (v_order_id, 'shipped',       'Centro de distribuição – Franca, SP', 'Pacote em rota de distribuição', '2026-05-20 08:42:00-03');

    -- Pedido 3 – Processando
    INSERT INTO orders (order_number, user_id, subtotal, discount, shipping_cost, total, status, payment_method, shipping_method, address_id, estimated_delivery, created_at, updated_at)
    VALUES ('DBL-2024-04690', v_user_id, 289.70, 0.00, 0.00, 289.70, 'processing', 'boleto', 'standard', v_addr_id, '2026-05-28', '2026-05-20 14:00:00-03', '2026-05-20 15:00:00-03')
    RETURNING id INTO v_order_id;

    INSERT INTO order_items (order_id, product_id, product_name, quantity, price, color, size)
    VALUES (v_order_id, v_prod2_id, 'Sport Runner X', 600, 109.90, '#22C55E', '38');

    INSERT INTO order_tracking_events (order_id, status, location, description, event_at) VALUES
      (v_order_id, 'pending',    'Franca, SP', 'Pedido confirmado',             '2026-05-20 14:00:00-03'),
      (v_order_id, 'processing', 'Franca, SP', 'Pagamento aprovado – aguardando produção', '2026-05-20 15:00:00-03');

  END IF;
END $$;
