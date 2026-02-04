-- Script SQL para configurar el evento Battle Royale para que las peleas empiecen mañana
-- IMPORTANTE: El sistema espera 2 días desde event.date antes de empezar las peleas
-- Si ponemos la fecha a HOY, mañana ya habrán pasado 2 días y empezarán las peleas

DO $$
DECLARE
    event_id UUID;
    event_date DATE;
    event_status TEXT;
    event_max_level INTEGER;
    brute_count INTEGER;
    updated_date DATE;
    updated_status TEXT;
    updated_max_level INTEGER;
    updated_brute_count INTEGER;
BEGIN
    -- Buscar el evento actual (no terminado)
    SELECT id, date, status::text, "maxLevel" 
    INTO event_id, event_date, event_status, event_max_level
    FROM "Event"
    WHERE status != 'finished'
    ORDER BY date DESC
    LIMIT 1;

    IF event_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró ningún evento activo. Crea un evento primero.';
    END IF;

    -- Contar brutos registrados
    SELECT COUNT(*) INTO brute_count
    FROM "Brute"
    WHERE "eventId" = event_id
      AND "deletedAt" IS NULL;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Evento encontrado:';
    RAISE NOTICE '  ID: %', event_id;
    RAISE NOTICE '  Fecha actual: %', event_date;
    RAISE NOTICE '  Status actual: %', event_status;
    RAISE NOTICE '  Nivel máximo: %', event_max_level;
    RAISE NOTICE '  Brutos registrados: %', brute_count;
    RAISE NOTICE '========================================';

    -- Actualizar la fecha del evento a HOY (UTC)
    -- Esto hará que mañana ya hayan pasado 2 días y empiecen las peleas
    UPDATE "Event"
    SET date = CURRENT_DATE
    WHERE id = event_id;

    RAISE NOTICE '';
    RAISE NOTICE '✅ Evento actualizado exitosamente!';
    RAISE NOTICE '';
    RAISE NOTICE 'Nueva fecha del evento: %', CURRENT_DATE;
    RAISE NOTICE '';
    RAISE NOTICE '📅 CALENDARIO:';
    RAISE NOTICE '  - HOY: Los jugadores pueden seguir registrando brutos';
    RAISE NOTICE '  - MAÑANA: Empezarán las peleas del torneo (ronda 1)';
    RAISE NOTICE '  - Cada día siguiente: Se ejecutará una nueva ronda';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  NOTA: El sistema ejecuta las peleas automáticamente en el dailyJob.';
    RAISE NOTICE '   Asegúrate de que el dailyJob esté corriendo para que las peleas se ejecuten.';

    -- Mostrar información del evento actualizado
    SELECT date, status::text, "maxLevel" 
    INTO updated_date, updated_status, updated_max_level
    FROM "Event"
    WHERE id = event_id;

    SELECT COUNT(*) INTO updated_brute_count
    FROM "Brute"
    WHERE "eventId" = event_id
      AND "deletedAt" IS NULL;

    RAISE NOTICE '';
    RAISE NOTICE 'Información del evento actualizado:';
    RAISE NOTICE '  ID: %', event_id;
    RAISE NOTICE '  Fecha: %', updated_date;
    RAISE NOTICE '  Status: %', updated_status;
    RAISE NOTICE '  Nivel máximo: %', updated_max_level;
    RAISE NOTICE '  Brutos registrados: %', updated_brute_count;

END $$;
