-- Script SQL para asignar build "Tanque Defensivo y Contragolpes" a un bruto NUEVO
-- Usuario: Smitto
-- Build: Shield x2, toughenedSkin x3, counterAttack x2, vitality x3, survival x1, 
--        resistant x1, armor x2, herculeanStrength x2, sixthSense x1
--        Armas: Sai x1, fryingPan x2
--        Stats: Repartidos hacia endurance y strength
-- Niveles: 2-42 (41 elecciones)
-- IMPORTANTE: Este script es para un BRUTO NUEVO (nivel 1, destinyPath vacío)
-- IMPORTANTE: El sistema requiere AMBOS destinos (LEFT y RIGHT) para cada nivel
-- LEFT = build deseada, RIGHT = stats (para no interferir)

DO $$
DECLARE
    brute_id UUID;
    user_id UUID;
    path_left "DestinyChoiceSide"[];
    path_right "DestinyChoiceSide"[];
BEGIN
    -- Buscar usuario Smitto
    SELECT id INTO user_id
    FROM "User"
    WHERE LOWER(name) = LOWER('Smitto')
    LIMIT 1;

    IF user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario "Smitto" no encontrado';
    END IF;

    -- Buscar bruto Anashe del usuario Smitto
    -- CAMBIAR 'Anashe' por el nombre del nuevo bruto que quieras crear
    SELECT id INTO brute_id
    FROM "Brute"
    WHERE LOWER(name) = LOWER('Anashe')  -- ⚠️ CAMBIAR ESTE NOMBRE
      AND "userId" = user_id
      AND "deletedAt" IS NULL
    LIMIT 1;

    IF brute_id IS NULL THEN
        RAISE EXCEPTION 'Brute no encontrado. Asegúrate de que el bruto existe y está en nivel 1';
    END IF;

    RAISE NOTICE 'Bruto encontrado: %', brute_id;

    -- Verificar que el bruto esté en nivel 1 y tenga destinyPath vacío
    DECLARE
        brute_level INTEGER;
        brute_path_length INTEGER;
        brute_path "DestinyChoiceSide"[];
    BEGIN
        SELECT level, "destinyPath", array_length("destinyPath", 1) INTO brute_level, brute_path, brute_path_length
        FROM "Brute"
        WHERE id = brute_id;
        
        IF brute_level != 1 THEN
            RAISE EXCEPTION 'El bruto está en nivel %, debe estar en nivel 1 para ejecutar este script', brute_level;
        END IF;
        
        IF brute_path_length IS NOT NULL AND brute_path_length > 0 THEN
            RAISE EXCEPTION 'El bruto tiene destinyPath con % elementos. Debe estar vacío ([]). Path actual: %', brute_path_length, brute_path;
        END IF;
        
        RAISE NOTICE '✅ Verificación: Bruto en nivel 1 con destinyPath vacío';
    END;

    -- Eliminar TODOS los destinos existentes (incluyendo el primer bonus si existe)
    DELETE FROM "DestinyChoice"
    WHERE "bruteId" = brute_id;

    RAISE NOTICE 'Destinos existentes eliminados';
    
    -- IMPORTANTE: Asegurar que el destinyPath esté vacío
    UPDATE "Brute"
    SET "destinyPath" = ARRAY[]::"DestinyChoiceSide"[]
    WHERE id = brute_id;
    
    RAISE NOTICE 'destinyPath reseteado a vacío';

    -- ============================================
    -- DISTRIBUCIÓN ESPECÍFICA (Niveles 2-42)
    -- LEFT = Build deseada, RIGHT = Stats (para no interferir)
    -- Para un bruto nuevo, empezamos desde nivel 2 (path vacío -> ['0'] o ['1'])
    -- ============================================

    -- Niveles 2-6: 5 habilidades únicas (tier 1)
    -- Nivel 2: LEFT = herculeanStrength (tier 1), RIGHT = +2 Strength
    path_left := ARRAY['0']::"DestinyChoiceSide"[];
    path_right := ARRAY['1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'herculeanStrength');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 3: LEFT = shield (tier 1), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'shield');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 4: LEFT = toughenedSkin (tier 1), RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'toughenedSkin');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 5: LEFT = counterAttack (tier 1), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'counterAttack');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 6: LEFT = vitality (tier 1), RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'vitality');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 7: LEFT = sai (tier 1), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "weapon") VALUES (gen_random_uuid(), brute_id, path_left, 'weapon', 'sai');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Niveles 8-11: 4 habilidades únicas restantes (tier 1)
    -- Nivel 8: LEFT = survival (tier 1), RIGHT = +1 Endurance +1 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'survival');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value", "stat2", "stat2Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 1, 'strength', 1);

    -- Nivel 9: LEFT = resistant (tier 1), RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'resistant');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 10: LEFT = armor (tier 1), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'armor');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 11: LEFT = sixthSense (tier 1), RIGHT = +1 Endurance +1 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'sixthSense');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value", "stat2", "stat2Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 1, 'strength', 1);

    -- Nivel 12: LEFT = fryingPan (tier 1), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "weapon") VALUES (gen_random_uuid(), brute_id, path_left, 'weapon', 'fryingPan');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Niveles 13-21: Upgrades de habilidades y armas
    -- Nivel 13: LEFT = herculeanStrength (tier 2), RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'herculeanStrength');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 14: LEFT = shield (tier 2), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'shield');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 15: LEFT = toughenedSkin (tier 2), RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'toughenedSkin');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 16: LEFT = toughenedSkin (tier 3), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'toughenedSkin');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 17: LEFT = counterAttack (tier 2), RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'counterAttack');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 18: LEFT = vitality (tier 2), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'vitality');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 19: LEFT = vitality (tier 3), RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'vitality');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 20: LEFT = armor (tier 2), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'armor');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 21: LEFT = fryingPan (tier 2), RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "weapon") VALUES (gen_random_uuid(), brute_id, path_left, 'weapon', 'fryingPan');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Niveles 22-42: Stats (21 picks restantes, repartidos hacia endurance y strength)
    -- Nivel 22: LEFT = +2 Endurance, RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'endurance', 2);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 23: LEFT = +2 Strength, RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'strength', 2);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 24: LEFT = +1 Endurance +1 Strength, RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value", "stat2", "stat2Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'endurance', 1, 'strength', 1);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 25: LEFT = +2 Endurance, RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'endurance', 2);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 26: LEFT = +2 Strength, RIGHT = +1 Endurance +1 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'strength', 2);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value", "stat2", "stat2Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 1, 'strength', 1);

    -- Nivel 27: LEFT = +2 Endurance, RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'endurance', 2);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 28: LEFT = +1 Endurance +1 Strength, RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value", "stat2", "stat2Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'endurance', 1, 'strength', 1);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 29: LEFT = +2 Strength, RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'strength', 2);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 30: LEFT = +2 Endurance, RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'endurance', 2);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 31: LEFT = +1 Endurance +1 Strength, RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value", "stat2", "stat2Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'endurance', 1, 'strength', 1);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 32: LEFT = +2 Strength, RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'strength', 2);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 33: LEFT = +2 Endurance, RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'endurance', 2);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 34: LEFT = +1 Endurance +1 Strength, RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value", "stat2", "stat2Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'endurance', 1, 'strength', 1);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 35: LEFT = +2 Strength, RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'strength', 2);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 36: LEFT = +2 Endurance, RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'endurance', 2);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 37: LEFT = +1 Endurance +1 Strength, RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value", "stat2", "stat2Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'endurance', 1, 'strength', 1);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 38: LEFT = +2 Strength, RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'strength', 2);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 39: LEFT = +2 Endurance, RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'endurance', 2);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 40: LEFT = +1 Endurance +1 Strength, RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value", "stat2", "stat2Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'endurance', 1, 'strength', 1);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 41: LEFT = +2 Strength, RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'strength', 2);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 42: LEFT = +2 Endurance, RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'endurance', 2);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    RAISE NOTICE '✅ Build asignada exitosamente para bruto nuevo!';
    RAISE NOTICE '   - Total: 82 destinos creados (41 LEFT + 41 RIGHT para niveles 2-42)';
    RAISE NOTICE '   - El bruto debe estar en nivel 1 con destinyPath vacío';
    RAISE NOTICE '   - Al subir de nivel, siempre elige la opción IZQUIERDA para obtener la build';

END $$;

-- Verificación: Mostrar todos los destinos LEFT creados
SELECT 
    array_length(dc.path, 1) + 1 as nivel,
    CASE dc.type
        WHEN 'skill' THEN CONCAT('Habilidad: ', dc.skill, 
            CASE 
                WHEN dc.skill IN ('shield', 'toughenedSkin', 'counterAttack', 'vitality', 'survival', 'resistant', 'armor', 'herculeanStrength', 'sixthSense') THEN
                    CASE 
                        WHEN (SELECT COUNT(*) FROM "DestinyChoice" dc2 WHERE dc2."bruteId" = dc."bruteId" AND dc2.skill = dc.skill AND array_length(dc2.path, 1) < array_length(dc.path, 1) AND dc2.path[array_length(dc2.path, 1)] = '0') = 0 THEN ' (Tier 1)'
                        WHEN (SELECT COUNT(*) FROM "DestinyChoice" dc2 WHERE dc2."bruteId" = dc."bruteId" AND dc2.skill = dc.skill AND array_length(dc2.path, 1) < array_length(dc.path, 1) AND dc2.path[array_length(dc2.path, 1)] = '0') = 1 THEN ' (Tier 2)'
                        ELSE ' (Tier 3)'
                    END
                ELSE ''
            END)
        WHEN 'weapon' THEN CONCAT('Arma: ', dc.weapon,
            CASE 
                WHEN (SELECT COUNT(*) FROM "DestinyChoice" dc2 WHERE dc2."bruteId" = dc."bruteId" AND dc2.weapon = dc.weapon AND array_length(dc2.path, 1) < array_length(dc.path, 1) AND dc2.path[array_length(dc2.path, 1)] = '0') = 0 THEN ' (Tier 1)'
                WHEN (SELECT COUNT(*) FROM "DestinyChoice" dc2 WHERE dc2."bruteId" = dc."bruteId" AND dc2.weapon = dc.weapon AND array_length(dc2.path, 1) < array_length(dc.path, 1) AND dc2.path[array_length(dc2.path, 1)] = '0') = 1 THEN ' (Tier 2)'
                ELSE ' (Tier 3)'
            END)
        WHEN 'stats' THEN CONCAT('Stats: +', dc."stat1Value", ' ', dc."stat1", 
            CASE WHEN dc."stat2" IS NOT NULL THEN CONCAT(' +', dc."stat2Value", ' ', dc."stat2") ELSE '' END)
        ELSE dc.type::text
    END as eleccion_LEFT,
    dc.path
FROM "DestinyChoice" dc
WHERE dc."bruteId" = (
    SELECT id FROM "Brute" 
    WHERE LOWER(name) = LOWER('Anashe')  -- ⚠️ CAMBIAR ESTE NOMBRE
      AND "userId" = (SELECT id FROM "User" WHERE LOWER(name) = LOWER('Smitto'))
      AND "deletedAt" IS NULL
    LIMIT 1
)
AND array_length(dc.path, 1) > 0
AND dc.path[array_length(dc.path, 1)] = '0'  -- Solo LEFT
ORDER BY array_length(dc.path, 1) ASC;

