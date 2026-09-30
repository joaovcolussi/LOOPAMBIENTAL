-- Reference catalog data (categories and materials).
-- This is production reference data, not demo data. It is idempotent so it can
-- run safely against fresh and existing databases.

INSERT INTO `waste_categories` (`id`, `name`, `slug`, `created_at`, `updated_at`)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'Plástico', 'plastico', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-000000000002', 'Metais', 'metais', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-000000000003', 'Papel e papelão', 'papel-papelao', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-000000000004', 'Vidro', 'vidro', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-000000000005', 'Madeira', 'madeira', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-000000000006', 'Borracha', 'borracha', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-000000000007', 'Orgânicos', 'organicos', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-000000000008', 'Têxteis', 'texteis', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-000000000009', 'Eletroeletrônicos', 'eletroeletronicos', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-00000000000a', 'Construção e demolição', 'construcao-demolicao', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-00000000000b', 'Químicos', 'quimicos', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-00000000000c', 'Óleo usado', 'oleo-usado', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-00000000000d', 'Sucata geral', 'sucata-geral', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-00000000000e', 'Resíduos perigosos', 'residuos-perigosos', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-00000000000f', 'Outros', 'outros', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `slug` = VALUES(`slug`);

INSERT INTO `materials` (`id`, `category_id`, `name`, `slug`, `default_unit`, `created_at`, `updated_at`)
VALUES
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'PET cristal', 'pet-cristal', 'kg', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000002', 'Alumínio prensado', 'aluminio-prensado', 'kg', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000003', 'Papelão ondulado', 'papelao-ondulado', 'kg', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000001', 'Polietileno (PEAD)', 'polietileno-pead', 'kg', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000002', 'Cobre', 'cobre', 'kg', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-000000000016', '00000000-0000-4000-8000-000000000002', 'Ferro fundido', 'ferro-fundido', 'kg', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-000000000017', '00000000-0000-4000-8000-000000000004', 'Vidro incolor', 'vidro-incolor', 'kg', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-000000000018', '00000000-0000-4000-8000-000000000005', 'Paletes de madeira', 'paletes-madeira', 'un', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-000000000019', '00000000-0000-4000-8000-000000000009', 'Placas eletrônicas', 'placas-eletronicas', 'kg', NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-00000000000c', 'Óleo lubrificante usado', 'oleo-lubrificante-usado', 'l', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `category_id` = VALUES(`category_id`),
  `name` = VALUES(`name`),
  `slug` = VALUES(`slug`),
  `default_unit` = VALUES(`default_unit`);
