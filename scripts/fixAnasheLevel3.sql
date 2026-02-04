-- Script para corregir los destinos del nivel 3 de Anashe
-- Este script ACTUALIZA los destinos existentes en lugar de eliminarlos
-- para evitar que el sistema los regenere automáticamente

DO $$
DECLARE
    brute_id UUID;
    user_id UUID;
    destino_left_id UUID;
    destino_right_id UUID;
    path_left_array "DestinyChoiceSide"[];
    path_right_array "DestinyChoiceSide"[];
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
    
    -- Buscar destino LEFT existente
    SELECT id INTO destino_left_id
    FROM "DestinyChoice"
    WHERE "bruteId" = brute_id
      AND path = path_left_array
    LIMIT 1;
    
    -- Buscar destino RIGHT existente
    SELECT id INTO destino_right_id
    FROM "DestinyChoice"
    WHERE "bruteId" = brute_id
      AND path = path_right_array
    LIMIT 1;
    
    -- Actualizar o crear destino LEFT
    IF destino_left_id IS NOT NULL THEN
        UPDATE "DestinyChoice"
        SET type = 'skill',
            skill = 'shield',
            weapon = NULL,
            pet = NULL,
            stat1 = NULL,
            stat1Value = NULL,
            stat2 = NULL,
            stat2Value = NULL,
            "originalSkill" = NULL,
            "originalWeapon" = NULL,
            "originalPet" = NULL
        WHERE id = destino_left_id;
        RAISE NOTICE '✅ Destino LEFT actualizado (shield)';
    ELSE
        INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill")
        VALUES (gen_random_uuid(), brute_id, path_left_array, 'skill', 'shield');
        RAISE NOTICE '✅ Destino LEFT creado (shield)';
    END IF;
    
    -- Actualizar o crear destino RIGHT
    IF destino_right_id IS NOT NULL THEN
        UPDATE "DestinyChoice"
        SET type = 'stats',
            skill = NULL,
            weapon = NULL,
            pet = NULL,
            stat1 = 'strength',
            stat1Value = 2,
            stat2 = NULL,
            stat2Value = NULL,
            "originalSkill" = NULL,
            "originalWeapon" = NULL,
            "originalPet" = NULL
        WHERE id = destino_right_id;
        RAISE NOTICE '✅ Destino RIGHT actualizado (+2 strength)';
    ELSE
        INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value")
        VALUES (gen_random_uuid(), brute_id, path_right_array, 'stats', 'strength', 2);
        RAISE NOTICE '✅ Destino RIGHT creado (+2 strength)';
    END IF;
    
    -- Verificar
    DECLARE
        left_count INTEGER;
        right_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO left_count
        FROM "DestinyChoice"
        WHERE "bruteId" = brute_id
          AND path = path_left_array
          AND type = 'skill'
          AND skill = 'shield';
        
        SELECT COUNT(*) INTO right_count
        FROM "DestinyChoice"
        WHERE "bruteId" = brute_id
          AND path = path_right_array
          AND type = 'stats'
          AND "stat1" = 'strength'
          AND "stat1Value" = 2;
        
        RAISE NOTICE 'Verificación final: LEFT=% encontrado(s), RIGHT=% encontrado(s)', left_count, right_count;
        
        IF left_count = 0 OR right_count = 0 THEN
            RAISE WARNING '⚠️  Los destinos no se crearon/actualizaron correctamente';
        END IF;
    END;
    
END $$;

-- Verificar los destinos del nivel 3
SELECT 
    dc.id,
    dc.path,
    dc.type,
    dc.skill,
    dc.weapon,
    dc."stat1",
    dc."stat1Value",
    array_to_string(dc.path, ',') as path_string
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
