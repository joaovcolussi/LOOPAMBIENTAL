-- Dados mínimos para os testes E2E (apenas CI/local, nunca produção).
-- Executado depois que a conta admin@loopambiental.com é registrada pela API.

INSERT INTO `plans` (`id`, `code`, `name`, `description`, `price_monthly`, `currency`, `features`, `is_active`, `created_at`, `updated_at`)
VALUES
  ('00000000-0000-4000-8000-0000000e2e01', 'e2e-basico', 'Básico (E2E)', 'Plano de teste E2E', 0.00, 'BRL', JSON_OBJECT('contactUnlocks', 5), 1, NOW(3), NOW(3)),
  ('00000000-0000-4000-8000-0000000e2e02', 'e2e-pro', 'Profissional (E2E)', 'Plano de teste E2E', 199.90, 'BRL', JSON_OBJECT('contactUnlocks', 50), 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `updated_at` = NOW(3);

UPDATE `users`
SET `platform_role` = 'ADMIN',
    `status` = 'ACTIVE',
    `email_verified_at` = COALESCE(`email_verified_at`, NOW(3))
WHERE `email` = 'admin@loopambiental.com';
