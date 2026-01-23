-- Script SQL para resolver manualmente la migración fallida (si es necesario)
-- Ejecutar solo si el auto-recovery en start-production.sh no funciona

-- Marcar la migración 20260116000000_add_bonus_fights_to_brute como aplicada
-- sin ejecutar el SQL (porque las columnas ya existen)
UPDATE "_prisma_migrations"
SET "finished_at" = CURRENT_TIMESTAMP,
    "applied_steps_count" = 1
WHERE "migration_name" = '20260116000000_add_bonus_fights_to_brute'
  AND "finished_at" IS NULL;

-- Verificar que las columnas existen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Brute' 
    AND column_name = 'bonusFightsCount'
  ) THEN
    RAISE EXCEPTION 'La columna bonusFightsCount no existe. Ejecuta la migración v2 primero.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Brute' 
    AND column_name = 'bonusFightsDate'
  ) THEN
    RAISE EXCEPTION 'La columna bonusFightsDate no existe. Ejecuta la migración v2 primero.';
  END IF;

  RAISE NOTICE '✅ Las columnas bonusFightsCount y bonusFightsDate existen correctamente.';
  RAISE NOTICE '✅ La migración ha sido marcada como aplicada.';
END $$;
