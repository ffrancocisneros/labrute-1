-- Script para FORZAR los destinos del nivel 3 de Anashe
-- Este script elimina TODOS los destinos del nivel 3 y crea solo los correctos
-- Luego verifica que no haya duplicados

DO $$
DECLARE
    brute_id UUID;
    user_id UUID;
    path_left_array "DestinyChoiceSide"[];
    path_right_array "DestinyChoiceSide"[];
    destinos_eliminados INTEGER;
    total_destinos_nivel3 INTEGER;
BEGIN
    -- Buscar usuario y bruto
    SELECT id INTO user_id FROM "User" WHERE LOWER(name) = LOWER('Smitto') LIMIT 1;
    SELECT id INTO brute_id FROM "Brute" WHERE LOWER(name) = LOWER('Anashe') AND "userId" = user_id AND "deletedAt" IS NULL LIMIT 1;
    
    IF brute_id IS NULL THEN
        RAISE EXCEPTION 'Bruto no encontrado';
    END IF;
    
    -- Construir los paths
    path_left_array := ARRAY['0', '0']::"DestinyChoiceSide"[];
    path_right_array := ARRAY['0', '1']::"DestinyChoiceSide"[];
    
    -- Contar cuántos destinos hay del nivel 3 ANTES de eliminar
    SELECT COUNT(*) INTO total_destinos_nivel3
    FROM "DestinyChoice"
    WHERE "bruteId" = brute_id
      AND array_length(path, 1) = 2;
    
    RAISE NOTICE 'Destinos del nivel 3 encontrados antes de eliminar: %', total_destinos_nivel3;
    
    -- Eliminar TODOS los destinos del nivel 3
    DELETE FROM "DestinyChoice"
    WHERE "bruteId" = brute_id
      AND array_length(path, 1) = 2;
    
    GET DIAGNOSTICS destinos_eliminados = ROW_COUNT;
    RAISE NOTICE 'Destinos eliminados: %', destinos_eliminados;
    
    -- Esperar un momento para asegurar que la transacción se complete
    PERFORM pg_sleep(0.1);
    
    -- Crear destino LEFT (shield) - SIN conflictos
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill", "weapon", "pet", "stat1", "stat1Value", "stat2", "stat2Value", "originalSkill", "originalWeapon", "originalPet")
    VALUES (
        gen_random_uuid(), 
        brute_id, 
        path_left_array, 
        'skill', 
        'shield',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
    );
    RAISE NOTICE '✅ Destino LEFT creado: shield (path: %)', path_left_array;
    
    -- Crear destino RIGHT (+2 strength) - SIN conflictos
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill", "weapon", "pet", "stat1", "stat1Value", "stat2", "stat2Value", "originalSkill", "originalWeapon", "originalPet")
    VALUES (
        gen_random_uuid(), 
        brute_id, 
        path_right_array, 
        'stats', 
        NULL,
        NULL,
        NULL,
        'strength',
        2,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
    );
    RAISE NOTICE '✅ Destino RIGHT creado: +2 strength (path: %)', path_right_array;
    
    -- Verificar que solo hay 2 destinos del nivel 3
    SELECT COUNT(*) INTO total_destinos_nivel3
    FROM "DestinyChoice"
    WHERE "bruteId" = brute_id
      AND array_length(path, 1) = 2;
    
    IF total_destinos_nivel3 != 2 THEN
        RAISE WARNING '⚠️  ADVERTENCIA: Se encontraron % destinos del nivel 3 (deberían ser 2)', total_destinos_nivel3;
    ELSE
        RAISE NOTICE '✅ Verificación: Exactamente 2 destinos del nivel 3';
    END IF;
    
    -- Verificar contenido
    DECLARE
        left_count INTEGER;
        right_count INTEGER;
        left_correct INTEGER;
        right_correct INTEGER;
    BEGIN
        SELECT COUNT(*) INTO left_count
        FROM "DestinyChoice"
        WHERE "bruteId" = brute_id
          AND path = path_left_array;
        
        SELECT COUNT(*) INTO right_count
        FROM "DestinyChoice"
        WHERE "bruteId" = brute_id
          AND path = path_right_array;
        
        SELECT COUNT(*) INTO left_correct
        FROM "DestinyChoice"
        WHERE "bruteId" = brute_id
          AND path = path_left_array
          AND type = 'skill'
          AND skill = 'shield';
        
        SELECT COUNT(*) INTO right_correct
        FROM "DestinyChoice"
        WHERE "bruteId" = brute_id
          AND path = path_right_array
          AND type = 'stats'
          AND "stat1" = 'strength'
          AND "stat1Value" = 2;
        
        RAISE NOTICE 'Verificación detallada:';
        RAISE NOTICE '  - LEFT path encontrados: % (correctos: %)', left_count, left_correct;
        RAISE NOTICE '  - RIGHT path encontrados: % (correctos: %)', right_count, right_correct;
        
        IF left_correct = 0 OR right_correct = 0 THEN
            RAISE EXCEPTION 'Los destinos no se crearon correctamente';
        END IF;
    END;
    
END $$;

-- Mostrar todos los destinos del nivel 3 después de la corrección
SELECT 
    'RESULTADO FINAL' as info,
    dc.id,
    dc.path::text as path_text,
    dc.type,
    dc.skill,
    dc.weapon,
    dc."stat1",
    dc."stat1Value",
    CASE 
        WHEN dc.path = ARRAY['0', '0']::"DestinyChoiceSide"[] AND dc.type = 'skill' AND dc.skill = 'shield' THEN '✅ LEFT CORRECTO'
        WHEN dc.path = ARRAY['0', '1']::"DestinyChoiceSide"[] AND dc.type = 'stats' AND dc."stat1" = 'strength' THEN '✅ RIGHT CORRECTO'
        ELSE '❌ INCORRECTO'
    END as estado
FROM "DestinyChoice" dc
WHERE dc."bruteId" = (
    SELECT id FROM "Brute" 
    WHERE LOWER(name) = LOWER('Anashe')
      AND "userId" = (SELECT id FROM "User" WHERE LOWER(name) = LOWER('Smitto'))
      AND "deletedAt" IS NULL
    LIMIT 1
)
AND array_length(dc.path, 1) = 2
ORDER BY dc.path;
