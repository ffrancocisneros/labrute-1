-- Script SQL para asignar build "Velocidad y Evasión con Armas Afiladas" a Cauteruccio
-- Usuario: Maslick
-- Build: Habilidades y armas poderosas primero, siempre elección LEFT
-- Niveles: 2-42 (41 elecciones)
-- IMPORTANTE: El sistema requiere AMBOS destinos (LEFT y RIGHT) para cada nivel
-- LEFT = build deseada, RIGHT = stats (para no interferir)

DO $$
DECLARE
    brute_id UUID;
    user_id UUID;
    path_left "DestinyChoiceSide"[];
    path_right "DestinyChoiceSide"[];
BEGIN
    -- Buscar usuario Maslick
    SELECT id INTO user_id
    FROM "User"
    WHERE LOWER(name) = LOWER('Maslick')
    LIMIT 1;

    IF user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario "Maslick" no encontrado';
    END IF;

    -- Buscar bruto Cauteruccio del usuario Maslick
    SELECT id INTO brute_id
    FROM "Brute"
    WHERE LOWER(name) = LOWER('Cauteruccio')
      AND "userId" = user_id
      AND "deletedAt" IS NULL
    LIMIT 1;

    IF brute_id IS NULL THEN
        RAISE EXCEPTION 'Brute "Cauteruccio" del usuario "Maslick" no encontrado';
    END IF;

    RAISE NOTICE 'Bruto encontrado: %', brute_id;

    -- Eliminar TODOS los destinos existentes (incluyendo el primer bonus, lo recrearemos después)
    DELETE FROM "DestinyChoice"
    WHERE "bruteId" = brute_id;

    RAISE NOTICE 'Destinos existentes eliminados';

    -- ============================================
    -- DISTRIBUCIÓN MEZCLADA (Niveles 2-42)
    -- LEFT = Build deseada, RIGHT = Stats (para no interferir)
    -- ============================================

    -- Nivel 2: LEFT = reconnaissance (tier 1), RIGHT = +2 Strength
    path_left := ARRAY['0']::"DestinyChoiceSide"[];
    path_right := ARRAY['1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'reconnaissance');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 3: LEFT = weaponsMaster (tier 1), RIGHT = +2 Agility
    path_left := ARRAY['0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'weaponsMaster');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'agility', 2);

    -- Nivel 4: LEFT = +2 Strength, RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'strength', 2);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 5: LEFT = felineAgility (tier 1), RIGHT = +2 Speed
    path_left := ARRAY['0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'felineAgility');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'speed', 2);

    -- Nivel 6: LEFT = sword (tier 1), RIGHT = +1 Strength +1 Agility
    path_left := ARRAY['0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "weapon") VALUES (gen_random_uuid(), brute_id, path_left, 'weapon', 'sword');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value", "stat2", "stat2Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 1, 'agility', 1);

    -- Nivel 7: LEFT = reconnaissance (tier 2), RIGHT = +2 Agility
    path_left := ARRAY['0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'reconnaissance');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'agility', 2);

    -- Nivel 8: LEFT = lightningBolt (tier 1), RIGHT = +2 Speed
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'lightningBolt');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'speed', 2);

    -- Nivel 9: LEFT = +2 Agility, RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'agility', 2);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 10: LEFT = broadsword (tier 1), RIGHT = +1 Strength +1 Speed
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "weapon") VALUES (gen_random_uuid(), brute_id, path_left, 'weapon', 'broadsword');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value", "stat2", "stat2Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 1, 'speed', 1);

    -- Nivel 11: LEFT = weaponsMaster (tier 2), RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'weaponsMaster');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 12: LEFT = untouchable (tier 1), RIGHT = +2 Agility
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'untouchable');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'agility', 2);

    -- Nivel 13: LEFT = sword (tier 2), RIGHT = +2 Speed
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "weapon") VALUES (gen_random_uuid(), brute_id, path_left, 'weapon', 'sword');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'speed', 2);

    -- Nivel 14: LEFT = counterAttack (tier 1), RIGHT = +1 Agility +1 Speed
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'counterAttack');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value", "stat2", "stat2Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'agility', 1, 'speed', 1);

    -- Nivel 15: LEFT = +2 Speed, RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'speed', 2);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 16: LEFT = scimitar (tier 1), RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "weapon") VALUES (gen_random_uuid(), brute_id, path_left, 'weapon', 'scimitar');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 17: LEFT = reconnaissance (tier 3), RIGHT = +2 Agility
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'reconnaissance');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'agility', 2);

    -- Nivel 18: LEFT = felineAgility (tier 2), RIGHT = +2 Speed
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'felineAgility');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'speed', 2);

    -- Nivel 19: LEFT = fistsOfFury (tier 1), RIGHT = +1 Strength +1 Agility
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'fistsOfFury');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value", "stat2", "stat2Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 1, 'agility', 1);

    -- Nivel 20: LEFT = broadsword (tier 2), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "weapon") VALUES (gen_random_uuid(), brute_id, path_left, 'weapon', 'broadsword');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 21: LEFT = +1 Strength +1 Agility, RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value", "stat2", "stat2Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'strength', 1, 'agility', 1);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 22: LEFT = weaponsMaster (tier 3), RIGHT = +2 Speed
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'weaponsMaster');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'speed', 2);

    -- Nivel 23: LEFT = fan (tier 1), RIGHT = +2 Agility
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "weapon") VALUES (gen_random_uuid(), brute_id, path_left, 'weapon', 'fan');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'agility', 2);

    -- Nivel 24: LEFT = lightningBolt (tier 2), RIGHT = +1 Strength +1 Speed
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'lightningBolt');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value", "stat2", "stat2Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 1, 'speed', 1);

    -- Nivel 25: LEFT = firstStrike (tier 1), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'firstStrike');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 26: LEFT = sword (tier 3), RIGHT = +2 Agility
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "weapon") VALUES (gen_random_uuid(), brute_id, path_left, 'weapon', 'sword');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'agility', 2);

    -- Nivel 27: LEFT = +2 Speed, RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'speed', 2);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 28: LEFT = untouchable (tier 2), RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'untouchable');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 29: LEFT = scimitar (tier 2), RIGHT = +2 Speed
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "weapon") VALUES (gen_random_uuid(), brute_id, path_left, 'weapon', 'scimitar');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'speed', 2);

    -- Nivel 30: LEFT = sixthSense (tier 1), RIGHT = +1 Agility +1 Speed
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'sixthSense');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value", "stat2", "stat2Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'agility', 1, 'speed', 1);

    -- Nivel 31: LEFT = felineAgility (tier 3), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'felineAgility');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 32: LEFT = +1 Strength +1 Speed, RIGHT = +2 Agility
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value", "stat2", "stat2Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'strength', 1, 'speed', 1);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'agility', 2);

    -- Nivel 33: LEFT = counterAttack (tier 2), RIGHT = +2 Speed
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'counterAttack');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'speed', 2);

    -- Nivel 34: LEFT = broadsword (tier 3), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "weapon") VALUES (gen_random_uuid(), brute_id, path_left, 'weapon', 'broadsword');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 35: LEFT = lightningBolt (tier 3), RIGHT = +2 Strength
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'lightningBolt');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 2);

    -- Nivel 36: LEFT = fan (tier 2), RIGHT = +2 Agility
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "weapon") VALUES (gen_random_uuid(), brute_id, path_left, 'weapon', 'fan');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'agility', 2);

    -- Nivel 37: LEFT = +2 Agility, RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_left, 'stats', 'agility', 2);
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 38: LEFT = untouchable (tier 3), RIGHT = +2 Speed
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'untouchable');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'speed', 2);

    -- Nivel 39: LEFT = fistsOfFury (tier 2), RIGHT = +1 Strength +1 Agility
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'fistsOfFury');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value", "stat2", "stat2Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'strength', 1, 'agility', 1);

    -- Nivel 40: LEFT = scimitar (tier 3), RIGHT = +2 Endurance
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "weapon") VALUES (gen_random_uuid(), brute_id, path_left, 'weapon', 'scimitar');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'endurance', 2);

    -- Nivel 41: LEFT = counterAttack (tier 3), RIGHT = +2 Agility
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'counterAttack');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'agility', 2);

    -- Nivel 42: LEFT = firstStrike (tier 2), RIGHT = +2 Speed
    path_left := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']::"DestinyChoiceSide"[];
    path_right := ARRAY['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']::"DestinyChoiceSide"[];
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "skill") VALUES (gen_random_uuid(), brute_id, path_left, 'skill', 'firstStrike');
    INSERT INTO "DestinyChoice" ("id", "bruteId", "path", "type", "stat1", "stat1Value") VALUES (gen_random_uuid(), brute_id, path_right, 'stats', 'speed', 2);

    RAISE NOTICE '✅ Build asignada exitosamente!';
    RAISE NOTICE '   - LEFT siempre tiene la build deseada';
    RAISE NOTICE '   - RIGHT tiene stats para no interferir';
    RAISE NOTICE '   - Total: 82 destinos creados (41 LEFT + 41 RIGHT para niveles 2-42)';

END $$;

-- Verificación: Mostrar todos los destinos LEFT creados
SELECT 
    array_length(dc.path, 1) + 1 as nivel,
    CASE dc.type
        WHEN 'skill' THEN CONCAT('Habilidad: ', dc.skill, 
            CASE 
                WHEN dc.skill IN ('reconnaissance', 'weaponsMaster', 'felineAgility', 'lightningBolt', 'untouchable', 'counterAttack', 'fistsOfFury', 'firstStrike', 'sixthSense') THEN
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
    WHERE LOWER(name) = LOWER('Cauteruccio')
      AND "userId" = (SELECT id FROM "User" WHERE LOWER(name) = LOWER('Maslick'))
      AND "deletedAt" IS NULL
    LIMIT 1
)
AND array_length(dc.path, 1) > 0
AND dc.path[array_length(dc.path, 1)] = '0'  -- Solo LEFT
ORDER BY array_length(dc.path, 1) ASC;
