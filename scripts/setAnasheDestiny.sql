-- Script SQL para asignar build "Tanque Defensivo y Contragolpes" a Anashe
-- Usuario: Smitto
-- Build: Shield x2, toughenedSkin x3, counterAttack x2, vitality x3, survival x1, 
--        resistant x1, armor x2, herculeanStrength x2, sixthSense x1
--        Armas: Sai x1, fryingPan x2
--        Stats: Repartidos hacia endurance y strength
-- Niveles: 2-42 (41 elecciones)
-- IMPORTANTE: El sistema requiere AMBOS destinos (LEFT y RIGHT) para cada nivel
-- LEFT = build deseada, RIGHT = stats (para no interferir)

DO $$
DECLARE
    brute_id UUID;
    user_id UUID;
    path_left "DestinyChoiceSide"[];
    path_right "DestinyChoiceSide"[];
    destino_count INTEGER;
    nivel3_left_count INTEGER;
    nivel3_right_count INTEGER;
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
    SELECT id INTO brute_id
    FROM "Brute"
    WHERE LOWER(name) = LOWER('Anashe')
      AND "userId" = user_id
      AND "deletedAt" IS NULL
    LIMIT 1;

    IF brute_id IS NULL THEN
        RAISE EXCEPTION 'Brute "Anashe" del usuario "Smitto" no encontrado';
    END IF;

    RAISE NOTICE 'Bruto encontrado: %', brute_id;

    -- IMPORTANTE: El bruto ya está en nivel 2 con herculeanStrength elegido
    -- Mantener destinyPath como ['0'] para que el sistema busque correctamente
    -- los destinos del nivel 3 (path ['0', '0'])
    -- NO resetear el destinyPath porque ya tiene una elección guardada

    -- Eliminar TODOS los destinos existentes
    DELETE FROM "DestinyChoice"
    WHERE "bruteId" = brute_id;

    RAISE NOTICE 'Destinos existentes eliminados';
    
    -- IMPORTANTE: Esperar un momento para asegurar que la transacción se complete
    -- y luego verificar que no haya destinos generados automáticamente
    PERFORM pg_sleep(0.1);

    -- ============================================
    -- DISTRIBUCIÓN ESPECÍFICA (Niveles 2-42)
    -- LEFT = Build deseada, RIGHT = Stats (para no interferir)
    -- NOTA: Nivel 2 ya tiene herculeanStrength elegido (path ['0'])
    -- ============================================

    -- Nivel 2: Ya tiene herculeanStrength elegido, NO crear destino
    -- Solo crear el RIGHT para no interferir
    path_right := ARRAY['1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 3: LEFT = shield (tier 1), RIGHT = +2 Strength
    -- Path ['0', '0'] porque ya eligió izquierda en nivel 2
    path_left := ARRAY['0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'shield');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 4: LEFT = toughenedSkin (tier 1), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'toughenedSkin');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 5: LEFT = counterAttack (tier 1), RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'counterAttack');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 6: LEFT = vitality (tier 1), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'vitality');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 7: LEFT = survival (tier 1), RIGHT = +1 Endurance +1 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'survival');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value", "stat2", "stat2Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 1, 'strength', 1);

    -- Nivel 8: LEFT = sai (tier 1), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "weapon") VALUES (gen_random_uuid(), brute_id, path_left, 'weapon', 'sai');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Niveles 9-11: 3 habilidades únicas restantes (tier 1)
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
    -- Nivel 13: LEFT = shield (tier 2), RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'shield');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 14: LEFT = toughenedSkin (tier 2), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'toughenedSkin');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 15: LEFT = toughenedSkin (tier 3), RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'toughenedSkin');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 16: LEFT = counterAttack (tier 2), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'counterAttack');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 17: LEFT = vitality (tier 2), RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'vitality');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 18: LEFT = vitality (tier 3), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'vitality');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 19: LEFT = armor (tier 2), RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'armor');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 20: LEFT = herculeanStrength (tier 2), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'herculeanStrength');
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

    -- NOTA: No actualizar destinyPath aquí porque:
    -- 1. El bruto ya está en nivel 2 con path ['0'] (herculeanStrength elegido)
    -- 2. El destinyPath se actualiza automáticamente cuando el bruto hace level up
    -- 3. El path actual ['0'] es correcto para buscar destinos del nivel 3

    -- Verificar que los destinos se crearon correctamente
    SELECT COUNT(*) INTO destino_count
    FROM "DestinyChoice"
    WHERE "bruteId" = brute_id;

    SELECT COUNT(*) INTO nivel3_left_count
    FROM "DestinyChoice"
    WHERE "bruteId" = brute_id
      AND path = ARRAY['0', '0']::"DestinyChoiceSide"[]
      AND type = 'skill'
      AND skill = 'shield';

    SELECT COUNT(*) INTO nivel3_right_count
    FROM "DestinyChoice"
    WHERE "bruteId" = brute_id
      AND path = ARRAY['0', '1']::"DestinyChoiceSide"[]
      AND type = 'stats';

    RAISE NOTICE '✅ Build asignada exitosamente!';
    RAISE NOTICE '   - Total destinos creados: %', destino_count;
    RAISE NOTICE '   - Nivel 3 LEFT (shield): % encontrado(s)', nivel3_left_count;
    RAISE NOTICE '   - Nivel 3 RIGHT (stats): % encontrado(s)', nivel3_right_count;
    RAISE NOTICE '   - Nivel 2 ya tiene herculeanStrength (no se crea destino LEFT para nivel 2)';
    RAISE NOTICE '   - Nivel 3 ahora tiene shield a la izquierda';
    
    IF nivel3_left_count = 0 THEN
        RAISE WARNING '⚠️  ADVERTENCIA: No se encontró el destino LEFT para nivel 3 (shield). Verifica que el path sea correcto.';
        RAISE NOTICE '   - Verificando destinos existentes para nivel 3...';
        RAISE NOTICE '   - Path buscado: [0, 0]';
    END IF;

END $$;

-- IMPORTANTE: Forzar actualización de los destinos del nivel 3
-- El problema es que Prisma puede no encontrar los destinos por la comparación de arrays
-- Vamos a eliminar TODOS los destinos del nivel 3 y recrearlos con el formato exacto
DO $$
DECLARE
    brute_id UUID;
    user_id UUID;
    destinos_eliminados INTEGER;
    path_left_array "DestinyChoiceSide"[];
    path_right_array "DestinyChoiceSide"[];
BEGIN
    -- Buscar usuario y bruto
    SELECT id INTO user_id FROM "User" WHERE LOWER(name) = LOWER('Smitto') LIMIT 1;
    SELECT id INTO brute_id FROM "Brute" WHERE LOWER(name) = LOWER('Anashe') AND "userId" = user_id AND "deletedAt" IS NULL LIMIT 1;
    
    IF brute_id IS NULL THEN
        RAISE NOTICE 'Bruto no encontrado para corrección';
        RETURN;
    END IF;
    
    -- Construir los paths exactamente como Prisma los espera
    -- Si destinyPath = ['0'], entonces firstChoicePath = ['0', '0'] y secondChoicePath = ['0', '1']
    path_left_array := ARRAY['0', '0']::"DestinyChoiceSide"[];
    path_right_array := ARRAY['0', '1']::"DestinyChoiceSide"[];
    
    -- Eliminar TODOS los destinos del nivel 3 (incluso los correctos) para evitar conflictos
    DELETE FROM "DestinyChoice"
    WHERE "bruteId" = brute_id
      AND array_length(path, 1) = 2;
    
    GET DIAGNOSTICS destinos_eliminados = ROW_COUNT;
    RAISE NOTICE 'Eliminados % destinos del nivel 3', destinos_eliminados;
    
    -- Crear destino LEFT del nivel 3 (shield) con formato explícito
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill", "weapon", "pet", "stat1", "stat1Value", "stat2", "stat2Value")
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
        NULL
    );
    RAISE NOTICE '✅ Destino LEFT del nivel 3 creado (shield) con path: %', path_left_array;
    
    -- Crear destino RIGHT del nivel 3 (+2 strength) con formato explícito
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill", "weapon", "pet", "stat1", "stat1Value", "stat2", "stat2Value")
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
        NULL
    );
    RAISE NOTICE '✅ Destino RIGHT del nivel 3 creado (+2 strength) con path: %', path_right_array;
    
    -- Verificar que se crearon correctamente
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
        
        RAISE NOTICE 'Verificación: LEFT=% encontrado(s), RIGHT=% encontrado(s)', left_count, right_count;
    END;
    
    RAISE NOTICE '✅ Corrección de destinos del nivel 3 completada';
END $$;

-- Verificar el destinyPath del bruto
SELECT 
    b.name,
    b.level,
    b."destinyPath",
    array_length(b."destinyPath", 1) as path_length,
    CASE 
        WHEN b."destinyPath" = ARRAY['0']::"DestinyChoiceSide"[] THEN '✅ Correcto (nivel 2, eligió izquierda)'
        ELSE '⚠️  Path incorrecto: ' || array_to_string(b."destinyPath", ',')
    END as estado_path
FROM "Brute" b
WHERE b.id = (
    SELECT id FROM "Brute" 
    WHERE LOWER(name) = LOWER('Anashe')
      AND "userId" = (SELECT id FROM "User" WHERE LOWER(name) = LOWER('Smitto'))
      AND "deletedAt" IS NULL
    LIMIT 1
);

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
    WHERE LOWER(name) = LOWER('Anashe')
      AND "userId" = (SELECT id FROM "User" WHERE LOWER(name) = LOWER('Smitto'))
      AND "deletedAt" IS NULL
    LIMIT 1
)
AND array_length(dc.path, 1) > 0
AND dc.path[array_length(dc.path, 1)] = '0'  -- Solo LEFT
ORDER BY array_length(dc.path, 1) ASC;

-- DEPURACIÓN: Mostrar TODOS los destinos del nivel 3 (path length = 2)
SELECT 
    'DEBUG - Nivel 3' as info,
    dc.path,
    dc.type,
    dc.skill,
    dc.weapon,
    dc."stat1",
    dc."stat1Value",
    CASE 
        WHEN array_length(dc.path, 1) = 2 AND dc.path[1] = '0' AND dc.path[2] = '0' THEN 'LEFT (correcto)'
        WHEN array_length(dc.path, 1) = 2 AND dc.path[1] = '0' AND dc.path[2] = '1' THEN 'RIGHT (correcto)'
        ELSE 'OTRO PATH'
    END as tipo_path
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
