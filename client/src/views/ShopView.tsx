import { Box, Button, Dialog, DialogContent, DialogTitle, FormControl, Grid, InputLabel, MenuItem, Paper, Select, Tab, Tabs, Typography } from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCalculatedBrute, USER_COOKIE, TOKEN_COOKIE } from '@labrute/core';
import { useAlert } from '../hooks/useAlert';
import { useAuth } from '../hooks/useAuth';
import type { LoggedInUser } from '../hooks/useAuth';
import Server from '../utils/Server';
import { getCookie } from '../utils/cookies';
import catchError from '../utils/catchError';
import { ErrorType } from '../utils/Fetch';
import Page from '../components/Page';
import Text from '../components/Text';

type ShopItem = {
  id: string;
  type: string;
  name: string;
  description: string | null;
  price: number;
  valueInt: number | null;
  valueString: string | null;
  available: boolean;
  order: number;
};

type ShopItemIcon = { image?: string; emoji?: string };

const getShopItemIcon = (item: ShopItem): ShopItemIcon => {
  switch (item.type) {
    case 'COSMETIC':
      return { emoji: '✨' };
    case 'BONUS_FIGHTS':
      return { emoji: '⚔️' };
    case 'TEMPORARY_SKILL':
      if (item.valueString) {
        return { image: `/images/skills/${item.valueString}.svg` };
      }
      return { emoji: '⚡' };
    case 'TEMPORARY_WEAPON':
      if (item.valueString) {
        return { image: `/images/weapons/${item.valueString}.png` };
      }
      return { emoji: '🗡️' };
    default:
      return { emoji: '🎁' };
  }
};

const formatShopItemName = (item: ShopItem, t: (key: string) => string): string => {
  switch (item.type) {
    case 'COSMETIC':
      return item.name;
    case 'BONUS_FIGHTS':
      return `${item.valueInt ?? 0} peleas extra`;
    case 'TEMPORARY_SKILL':
      return item.valueString ? t(item.valueString) : item.name;
    case 'TEMPORARY_WEAPON':
      return item.valueString ? t(item.valueString) : item.name;
    default:
      return item.name;
  }
};

const needsBruteSelection = (item: ShopItem): boolean => (
  item.type === 'TEMPORARY_WEAPON' || item.type === 'TEMPORARY_SKILL'
);

type ShopSection = 'weapons' | 'skills' | 'cosmetics' | 'fights';

const ShopView = () => {
  const Alert = useAlert();
  const { user, updateData, modifiers } = useAuth();
  const { t } = useTranslation();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseItemId, setPurchaseItemId] = useState<string | null>(null);
  const [bruteId, setBruteId] = useState<string>('');
  const [purchaseBruteOpen, setPurchaseBruteOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<ShopSection>('weapons');

  // Helpers para bloqueo 1 vez/día UTC y tier 3 (solo para items temporales)
  type TempSkill = { skillName: string; expiresAt: string; createdAt?: string };
  type TempWeapon = { weaponName: string; expiresAt: string; createdAt?: string };
  type BruteWithTemps = LoggedInUser['brutes'][number] & {
    temporarySkills?: TempSkill[];
    temporaryWeapons?: TempWeapon[];
  };

  const selectedShopItem = purchaseItemId ? items.find((i) => i.id === purchaseItemId) : null;
  const selectedBrute = (user?.brutes ?? [])
    .find((b) => b.id === bruteId) as BruteWithTemps | undefined;

  const purchaseBlockReason = (() => {
    if (!selectedShopItem) return null;
    if (!needsBruteSelection(selectedShopItem)) return null;
    if (!selectedBrute) return null;
    if (!selectedShopItem.valueString) return null;

    const utcToday = new Date();
    const isSameUtcDay = (iso?: string) => {
      if (!iso) return false;
      const a = new Date(iso);
      return a.getUTCFullYear() === utcToday.getUTCFullYear()
        && a.getUTCMonth() === utcToday.getUTCMonth()
        && a.getUTCDate() === utcToday.getUTCDate();
    };

    if (selectedShopItem.type === 'TEMPORARY_SKILL') {
      const skill = selectedShopItem.valueString;
      const skillsArray: string[] = selectedBrute.skills ?? [];
      const permTier = skillsArray
        .filter((skillName) => skillName === skill).length;
      const activeTemps: TempSkill[] = selectedBrute.temporarySkills ?? [];
      const activeTier = activeTemps
        .filter((temp) => temp.skillName === skill).length;
      const currentTier = permTier + activeTier;
      if (currentTier >= 3) return t('shop.tempTier3Skill');
      if (activeTemps.some((temp) => temp.skillName === skill
        && isSameUtcDay(temp.createdAt))) {
        return t('shop.tempAlreadyBoughtTodaySkill');
      }
    }

    if (selectedShopItem.type === 'TEMPORARY_WEAPON') {
      const weapon = selectedShopItem.valueString;
      const weaponsArray: string[] = selectedBrute.weapons ?? [];
      const permTier = weaponsArray
        .filter((weaponName) => weaponName === weapon).length;
      const activeTemps: TempWeapon[] = selectedBrute.temporaryWeapons ?? [];
      const activeTier = activeTemps
        .filter((temp) => temp.weaponName === weapon).length;
      const currentTier = permTier + activeTier;
      if (currentTier >= 3) return t('shop.tempTier3Weapon');
      if (activeTemps.some((temp) => temp.weaponName === weapon
        && isSameUtcDay(temp.createdAt))) {
        return t('shop.tempAlreadyBoughtTodayWeapon');
      }
    }

    return null;
  })();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await Server.Shop.get();
      setItems(r.items);
    } catch (e) {
      catchError(Alert)(e as ErrorType | string);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [Alert]);

  useEffect(() => {
    if (user) load().catch(() => {});
  }, [load, user]);

  const doPurchase = useCallback(async (itemId: string, bruteIdArg?: string) => {
    try {
      setPurchasing(true);
      await Server.Shop.purchase(itemId, bruteIdArg);
      Alert.open('success', 'Compra realizada exitosamente.');
      setPurchaseItemId(null);
      setPurchaseBruteOpen(false);
      setBruteId('');
      await load();
      // Actualizar datos del usuario (oro, cosméticos desbloqueados, etc.)
      if (user) {
        const userId = getCookie(USER_COOKIE) ?? '';
        const token = getCookie(TOKEN_COOKIE) ?? '';
        if (userId && token) {
          const response = await Server.User.authenticate(userId, token);
          if (response.user) {
            updateData({
              ...response.user,
              brutes: response.user.brutes.map((brute) => {
                const bruteWithTemps = brute as unknown as {
                  temporarySkills?: TempSkill[];
                  temporaryWeapons?: TempWeapon[];
                };
                return {
                  ...getCalculatedBrute(brute, modifiers),
                  temporarySkills: bruteWithTemps.temporarySkills ?? [],
                  temporaryWeapons: bruteWithTemps.temporaryWeapons ?? [],
                };
              }),
            });
          }
        }
      }
    } catch (e) {
      catchError(Alert)(e as ErrorType | string);
    } finally {
      setPurchasing(false);
    }
  }, [Alert, load, user, updateData, modifiers]);

  const onPurchase = useCallback((item: ShopItem) => {
    if (needsBruteSelection(item)) {
      setPurchaseItemId(item.id);
      setPurchaseBruteOpen(true);
    } else {
      doPurchase(item.id).catch(() => {});
    }
  }, [doPurchase]);

  const confirmPurchaseWithBrute = useCallback(() => {
    if (purchaseItemId && bruteId) {
      doPurchase(purchaseItemId, bruteId).catch(() => {});
    }
  }, [purchaseItemId, bruteId, doPurchase]);

  // Verificar si el usuario ya tiene un cosmético desbloqueado
  const hasCosmetic = useCallback((cosmeticPresetId: number): boolean => {
    if (!user) return false;
    // Type assertion necesario porque userUnlockedCosmetics puede no estar tipado en LoggedInUser
    type CosmeticItem = { cosmeticPresetId: number };
    type UserWithCosmetics = LoggedInUser & {
      userUnlockedCosmetics?: CosmeticItem[];
    };
    const userWithCosmetics: UserWithCosmetics = user as UserWithCosmetics;
    const cosmetics: CosmeticItem[] | undefined = userWithCosmetics.userUnlockedCosmetics;
    if (!cosmetics) return false;
    return cosmetics.some(
      (c: CosmeticItem) => c.cosmeticPresetId === cosmeticPresetId,
    );
  }, [user]);

  // Filtrar items por sección
  const filteredItems = items.filter((item) => {
    switch (currentSection) {
      case 'weapons':
        return item.type === 'TEMPORARY_WEAPON';
      case 'skills':
        return item.type === 'TEMPORARY_SKILL';
      case 'cosmetics':
        return item.type === 'COSMETIC';
      case 'fights':
        return item.type === 'BONUS_FIGHTS';
      default:
        return false;
    }
  });

  if (!user) {
    return (
      <Page title="Tienda">
        <Paper sx={{ p: 2 }}>
          <Text>Inicia sesión para ver la tienda.</Text>
        </Paper>
      </Page>
    );
  }

  return (
    <Page title="Tienda">
      {loading && !items.length ? (
        <Text>Cargando…</Text>
      ) : items.length === 0 ? (
        <Paper sx={{ p: 2 }}>
          <Text>No hay items disponibles en la tienda.</Text>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Oro del usuario */}
          <Paper sx={{ p: 2, bgcolor: 'background.paperDark' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Text bold>Tu oro:</Text>
              <Text sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {user.gold}
                <Box component="img" src="/images/gold.png" sx={{ width: 16, height: 16 }} />
              </Text>
            </Box>
          </Paper>

          {/* Tabs de secciones */}
          <Paper>
            <Tabs
              value={currentSection}
              onChange={(_, newValue: ShopSection) => setCurrentSection(newValue)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="Armas" value="weapons" />
              <Tab label="Habilidades" value="skills" />
              <Tab label="Cosméticos" value="cosmetics" />
              <Tab label="Peleas" value="fights" />
            </Tabs>
          </Paper>

          {/* Contenido de la sección */}
          {currentSection === 'cosmetics' ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h5" sx={{ mb: 2 }}>
                Próximamente
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Los cosméticos estarán disponibles pronto.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {filteredItems.length === 0 ? (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Text>No hay items disponibles en esta sección.</Text>
                  </Paper>
                </Grid>
              ) : (
                filteredItems.map((item) => {
                  const icon = getShopItemIcon(item);
                  const itemName = formatShopItemName(item, t);
                  const isCosmeticOwned = item.type === 'COSMETIC' && item.valueInt != null
                    ? hasCosmetic(item.valueInt)
                    : false;
                  const canAfford = user.gold >= item.price;

                  return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                      <Paper
                        sx={{
                          p: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 1,
                          bgcolor: 'background.paperLight',
                          border: 1,
                          borderColor: isCosmeticOwned ? 'success.main' : 'divider',
                          opacity: !canAfford ? 0.6 : 1,
                        }}
                      >
                        {/* Icono */}
                        {icon.image ? (
                          <Box
                            component="img"
                            src={icon.image}
                            sx={{
                              width: 48,
                              height: 48,
                              objectFit: 'contain',
                              filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))',
                            }}
                          />
                        ) : (
                          <Typography sx={{ fontSize: '3rem' }}>
                            {icon.emoji}
                          </Typography>
                        )}

                        {/* Nombre */}
                        <Typography variant="h6" align="center" fontWeight="bold">
                          {itemName}
                        </Typography>

                        {/* Descripción */}
                        {item.description && (
                          <Typography variant="body2" color="text.secondary" align="center">
                            {item.description}
                          </Typography>
                        )}

                        {/* Precio */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="h6" color={canAfford ? 'primary.main' : 'error.main'}>
                            {item.price}
                          </Typography>
                          <Box component="img" src="/images/gold.png" sx={{ width: 20, height: 20 }} />
                        </Box>

                        {/* Estado especial para cosméticos */}
                        {isCosmeticOwned && (
                          <Typography variant="caption" color="success.main" fontWeight="bold">
                            ✓ Ya desbloqueado
                          </Typography>
                        )}

                        {/* Botón de compra */}
                        <Button
                          variant="contained"
                          color="primary"
                          fullWidth
                          disabled={purchasing || !canAfford || isCosmeticOwned}
                          onClick={() => onPurchase(item)}
                        >
                          {isCosmeticOwned ? 'Ya adquirido' : canAfford ? 'Comprar' : 'Oro insuficiente'}
                        </Button>
                      </Paper>
                    </Grid>
                  );
                })
              )}
            </Grid>
          )}
        </Box>
      )}

      {/* Dialog para selección de bruto (armas/habilidades temporales) */}
      <Dialog open={purchaseBruteOpen} onClose={() => { setPurchaseBruteOpen(false); setPurchaseItemId(null); setBruteId(''); }}>
        <DialogTitle>
          {purchaseItemId && items.find((i) => i.id === purchaseItemId)?.type === 'TEMPORARY_WEAPON'
            ? 'Elegir bruto para el arma 24h'
            : 'Elegir bruto para la habilidad 24h'}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Bruto</InputLabel>
            <Select
              value={bruteId}
              label="Bruto"
              onChange={(e) => setBruteId(e.target.value)}
            >
              {(user?.brutes ?? []).map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {purchaseBlockReason && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {purchaseBlockReason}
            </Typography>
          )}
          <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button onClick={() => { setPurchaseBruteOpen(false); setPurchaseItemId(null); setBruteId(''); }}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={!bruteId || purchasing || !!purchaseBlockReason}
              onClick={confirmPurchaseWithBrute}
            >
              Comprar
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Page>
  );
};

export default ShopView;
