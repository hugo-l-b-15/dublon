-- Categorias
INSERT INTO categories (name, slug, description)
VALUES 
  ('Palmilhas Antiperfurantes', 'palmilhas-antiperfurantes', 'Palmilhas de alta proteção contra perfurações para calçados de segurança.'),
  ('Palmilhas de PU Conforto', 'palmilhas-de-pu', 'Palmilhas de Poliuretano que oferecem máxima absorção de impacto e conforto para longas jornadas.'),
  ('Palmilhas de EVA Anatômicas', 'palmilhas-de-eva', 'Palmilhas leves de EVA para calçados esportivos e ocupacionais.'),
  ('Palmilhas de Aço Carbono', 'palmilhas-de-aco', 'Palmilhas tradicionais de aço para proteção máxima contra pregos e perfurações agressivas.')
ON CONFLICT (slug) DO NOTHING;

-- Produtos de Exemplo
INSERT INTO products (name, description, price, stock, category_id, sku)
VALUES
  ('Palmilha Antiperfurante Dublon Kevlar', 'Palmilha de tecido antiperfurante de aramida (Kevlar), flexível, leve e com proteção certificada contra perfuração de até 1100N.', 45.00, 1000, 1, 'PALM-ANTI-KEV'),
  ('Palmilha PU Dublon Conforto Max', 'Palmilha injetada de PU com design anatômico e alta densidade, ideal para calçados de trabalho para reduzir fadiga.', 25.50, 2000, 2, 'PALM-PU-CONF'),
  ('Palmilha Aço Carbono Temperado', 'Palmilha de aço carbono temperado com tratamento anticorrosivo, resistência superior e compatibilidade com normas de segurança.', 18.00, 1500, 4, 'PALM-ACO-TEMP'),
  ('Palmilha EVA Anatômica Standard', 'Palmilha conformada em EVA com revestimento de tecido poliéster antimicrobiano, oferecendo leveza e higiene.', 12.00, 3000, 3, 'PALM-EVA-STD')
ON CONFLICT (sku) DO NOTHING;

-- Imagens dos Produtos de Exemplo (Imagens placeholder ou genéricas de palmilhas)
INSERT INTO product_images (product_id, image_url, is_main)
VALUES
  (1, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', true),
  (2, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500', true),
  (3, 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500', true),
  (4, 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500', true)
ON CONFLICT DO NOTHING;
