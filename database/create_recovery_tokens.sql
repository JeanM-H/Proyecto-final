-- Crea una tabla para guardar tokens de recuperación de contraseña
-- Ejecútala en el editor SQL de Supabase si la tabla no existe.

CREATE TABLE IF NOT EXISTS recovery_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE IF EXISTS recovery_tokens
  ADD CONSTRAINT fk_recovery_user
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
