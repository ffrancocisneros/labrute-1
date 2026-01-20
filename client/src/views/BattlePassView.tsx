import { BATTLE_PASS_XP, getRewardTitleName } from '@labrute/core';
import { Box, Button, Dialog, DialogContent, DialogTitle, FormControl, InputLabel, LinearProgress, MenuItem, Paper, Select, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ArrowBack, ArrowForward, CheckCircle, Lock, ExpandMore } from '@mui/icons-material';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAlert } from '../hooks/useAlert';
import { useAuth } from '../hooks/useAuth';
import Server from '../utils/Server';
import catchError from '../utils/catchError';
import { ErrorType } from '../utils/Fetch';
import Page from '../components/Page';
import Text from '../components/Text';

const BATTLE_PASS_XP_PER_LEVEL = 300;
const BATTLE_PASS_LEVELS = 40;

type RewardRow = { type: string; valueInt: number | null; valueString: string | null };

type RewardIcon = { image?: string; emoji?: string };

const getRewardIcon = (r: RewardRow): RewardIcon => {
  switch (r.type) {
    case 'GOLD':
      return { image: '/images/gold.png' };
    case 'TITLE':
      return { emoji: '🏆' };
    case 'COSMETIC':
      return { emoji: '✨' };
    case 'BONUS_FIGHTS':
      return { emoji: '⚔️' };
    case 'TEMPORARY_SKILL':
      // Usar imagen de la habilidad si está disponible
      if (r.valueString) {
        return { image: `/images/skills/${r.valueString}.svg` };
      }
      return { emoji: '⚡' };
    case 'TEMPORARY_WEAPON':
      // Usar imagen del arma si está disponible
      if (r.valueString) {
        return { image: `/images/weapons/${r.valueString}.png` };
      }
      return { emoji: '🗡️' };
    default:
      return { emoji: '🎁' };
  }
};

const hasTempSkillOrWeapon = (rewards: Array<{ type: string }>): boolean => rewards.some((r) => r.type === 'TEMPORARY_SKILL' || r.type === 'TEMPORARY_WEAPON');

const missionTypeName: Record<string, string> = {
  WIN_FIGHTS: 'Ganar peleas',
  PARTICIPATE_TOURNAMENTS: 'Participar en torneos',
  WIN_TOURNAMENTS: 'Ganar torneos',
  DEAL_DAMAGE: 'Causar daño',
  WIN_STREAK: 'Racha de victorias',
  ASCEND: 'Ascender',
};

const BattlePassView = () => {
  const Alert = useAlert();
  const { user } = useAuth();
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof Server.BattlePass.get>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimLevel, setClaimLevel] = useState<number | null>(null);
  const [bruteId, setBruteId] = useState<string>('');
  const [claimBruteOpen, setClaimBruteOpen] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  const formatReward = useCallback((r: RewardRow): string => {
    switch (r.type) {
      case 'GOLD':
        return `${r.valueInt ?? 0} oro`;
      case 'TITLE':
        return getRewardTitleName(r.valueInt ?? 0) || `Título ${r.valueInt}`;
      case 'COSMETIC':
        return 'Cosmético';
      case 'BONUS_FIGHTS':
        return `${r.valueInt ?? 0} peleas extra`;
      case 'TEMPORARY_SKILL':
        return r.valueString ? t(r.valueString) : '';
      case 'TEMPORARY_WEAPON':
        return r.valueString ? t(r.valueString) : '';
      default:
        return String(r.type);
    }
  }, [t]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await Server.BattlePass.get();
      setData(r);
    } catch (e) {
      catchError(Alert)(e as ErrorType | string);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [Alert]);

  useEffect(() => {
    if (user) load().catch(() => {});
  }, [load, user]);

  const doClaim = useCallback(async (level: number, bruteIdArg?: string) => {
    try {
      setClaiming(true);
      await Server.BattlePass.claimLevel(level, bruteIdArg);
      Alert.open('success', 'Recompensa reclamada.');
      setClaimLevel(null);
      setClaimBruteOpen(false);
      setBruteId('');
      await load();
    } catch (e) {
      catchError(Alert)(e as ErrorType | string);
    } finally {
      setClaiming(false);
    }
  }, [Alert, load]);

  const onClaim = useCallback((level: number, rewards: Array<{ type: string }>) => {
    if (hasTempSkillOrWeapon(rewards)) {
      setClaimLevel(level);
      setClaimBruteOpen(true);
    } else {
      doClaim(level).catch(() => {});
    }
  }, [doClaim]);

  const confirmClaimWithBrute = useCallback(() => {
    if (claimLevel != null && bruteId) doClaim(claimLevel, bruteId).catch(() => {});
  }, [claimLevel, bruteId, doClaim]);

  const currentLevel = data?.userProgress
    ? (() => {
      let l = 0;
      const xp = data.userProgress.totalXp;
      for (let i = 1; i <= BATTLE_PASS_LEVELS; i++) {
        if (xp >= i * BATTLE_PASS_XP_PER_LEVEL) l = i;
      }
      return l;
    })()
    : 0;
  const xpInCurrent = data?.userProgress
    ? data.userProgress.totalXp - currentLevel * BATTLE_PASS_XP_PER_LEVEL
    : 0;
  const xpNeededInLevel = BATTLE_PASS_XP_PER_LEVEL;

  // Scroll functions
  const scrollLeft = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  }, []);

  const scrollRight = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      setScrollPosition(scrollContainerRef.current.scrollLeft);
    }
  }, []);

  // Scroll to current level on load
  useEffect(() => {
    if (data && scrollContainerRef.current && currentLevel > 0) {
      const levelElement = scrollContainerRef.current.querySelector(`[data-level="${currentLevel}"]`);
      if (levelElement) {
        levelElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [data, currentLevel]);

  if (!user) {
    return (
      <Page title="Pase">
        <Paper sx={{ p: 2 }}>
          <Text>Inicia sesión para ver tu progreso en el pase.</Text>
        </Paper>
      </Page>
    );
  }

  const maxScroll = scrollContainerRef.current
    ? scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth
    : 0;
  const canScrollLeft = scrollPosition > 0;
  const canScrollRight = scrollPosition < maxScroll - 10;

  return (
    <Page title="Pase">
      {loading && !data ? (
        <Text>Cargando…</Text>
      ) : !data?.season ? (
        <Paper sx={{ p: 2 }}>
          <Text>No hay temporada de pase activa.</Text>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Season Info */}
          <Paper sx={{ p: 2, bgcolor: 'background.paperDark' }}>
            <Typography variant="h5" gutterBottom>
              {data.season.name}
            </Typography>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {(() => {
                const endDate = dayjs(data.season.endDate);
                const daysLeft = endDate.diff(dayjs(), 'day');
                return `Termina en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}`;
              })()}
            </Typography>
            {data.userProgress && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontWeight: 'bold',
                  fontSize: '1.5rem',
                }}
                >
                  {currentLevel}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight="bold">
                      Nivel {currentLevel} / {BATTLE_PASS_LEVELS}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {xpInCurrent} / {xpNeededInLevel} XP
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (xpInCurrent / xpNeededInLevel) * 100)}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
              </Box>
            )}
          </Paper>

          {/* Cómo ganar XP */}
          <Accordion sx={{ bgcolor: 'background.paperDark' }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">¿Cómo ganar XP del Pase?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Combate
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                  <Typography variant="body2">Ganar una pelea</Typography>
                  <Typography variant="body2" fontWeight="bold" color="primary.main">
                    +{BATTLE_PASS_XP.FIGHT_WIN} XP
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                  <Typography variant="body2">Perder una pelea</Typography>
                  <Typography variant="body2" fontWeight="bold" color="text.secondary">
                    +{BATTLE_PASS_XP.FIGHT_LOSS} XP
                  </Typography>
                </Box>

                <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 1 }}>
                  Torneos
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                  <Typography variant="body2">Inscribirse en un torneo</Typography>
                  <Typography variant="body2" fontWeight="bold" color="primary.main">
                    +{BATTLE_PASS_XP.TOURNAMENT_REGISTER} XP
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                  <Typography variant="body2">Ganar una ronda de torneo</Typography>
                  <Typography variant="body2" fontWeight="bold" color="primary.main">
                    +{BATTLE_PASS_XP.TOURNAMENT_WIN_ROUND} XP
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                  <Typography variant="body2">Ganar un torneo completo</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    +{BATTLE_PASS_XP.TOURNAMENT_WIN} XP
                  </Typography>
                </Box>

                <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 1 }}>
                  Eventos (Battle Royale)
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                  <Typography variant="body2">Participar en un evento</Typography>
                  <Typography variant="body2" fontWeight="bold" color="primary.main">
                    +{BATTLE_PASS_XP.EVENT_PARTICIPATE} XP
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                  <Typography variant="body2">Llegar a la final</Typography>
                  <Typography variant="body2" fontWeight="bold" color="primary.main">
                    +{BATTLE_PASS_XP.EVENT_FINAL} XP
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                  <Typography variant="body2">Ganar un evento</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    +{BATTLE_PASS_XP.EVENT_WIN} XP
                  </Typography>
                </Box>

                <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 1 }}>
                  Misiones del Pase
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                  <Typography variant="body2">Completar misión fácil</Typography>
                  <Typography variant="body2" fontWeight="bold" color="primary.main">
                    +{BATTLE_PASS_XP.MISSION_EASY} XP
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                  <Typography variant="body2">Completar misión media</Typography>
                  <Typography variant="body2" fontWeight="bold" color="warning.main">
                    +{BATTLE_PASS_XP.MISSION_MEDIUM} XP
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                  <Typography variant="body2">Completar misión difícil</Typography>
                  <Typography variant="body2" fontWeight="bold" color="error.main">
                    +{BATTLE_PASS_XP.MISSION_HARD} XP
                  </Typography>
                </Box>

                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="caption" color="info.contrastText">
                    <strong>Nota:</strong> Todas las peleas (manuales y automáticas)
                    {' '}
                    otorgan XP del Pase.
                  </Typography>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Horizontal Battle Pass Track */}
          <Paper sx={{ p: 2, bgcolor: 'background.paperDark', position: 'relative' }}>
            <Box sx={{ position: 'relative', width: '100%' }}>
              {/* Scroll buttons */}
              {canScrollLeft && (
                <Box
                  onClick={scrollLeft}
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                    bgcolor: 'background.paper',
                    borderRadius: '50%',
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: 2,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ArrowBack />
                </Box>
              )}
              {canScrollRight && (
                <Box
                  onClick={scrollRight}
                  sx={{
                    position: 'absolute',
                    right: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                    bgcolor: 'background.paper',
                    borderRadius: '50%',
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: 2,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ArrowForward />
                </Box>
              )}

              {/* Horizontal scrollable track */}
              <Box
                ref={scrollContainerRef}
                onScroll={handleScroll}
                sx={{
                  display: 'flex',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  pb: 2,
                  scrollbarWidth: 'thin',
                  '&::-webkit-scrollbar': {
                    height: 8,
                  },
                  '&::-webkit-scrollbar-track': {
                    bgcolor: 'background.paperLight',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    bgcolor: 'action.disabled',
                    borderRadius: 1,
                    '&:hover': {
                      bgcolor: 'action.disabledBackground',
                    },
                  },
                }}
              >
                {/* Progress line */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 120,
                    left: 0,
                    right: 0,
                    height: 4,
                    bgcolor: 'action.disabled',
                    zIndex: 0,
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 120,
                    left: 0,
                    height: 4,
                    bgcolor: 'primary.main',
                    width: `${(currentLevel / BATTLE_PASS_LEVELS) * 100}%`,
                    zIndex: 1,
                    transition: 'width 0.3s ease',
                  }}
                />

                {/* Levels */}
                {data.levels.map((lv) => {
                  const isReached = data.userProgress
                    && data.userProgress.totalXp >= lv.xpRequired;
                  const isClaimed = lv.claimed;
                  const canClaim = isReached && !isClaimed;
                  const isCurrent = currentLevel === lv.level;
                  const isLocked = !isReached;

                  return (
                    <Box
                      key={lv.level}
                      data-level={lv.level}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: 120,
                        position: 'relative',
                        zIndex: 2,
                        px: 1,
                      }}
                    >
                      {/* Level number box */}
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '1.2rem',
                          mb: 1,
                          border: 2,
                          borderColor: isCurrent
                            ? 'primary.main'
                            : isClaimed
                              ? 'success.main'
                              : isLocked
                                ? 'action.disabled'
                                : 'primary.light',
                          bgcolor: isCurrent
                            ? 'primary.light'
                            : isClaimed
                              ? 'success.light'
                              : isLocked
                                ? 'action.disabledBackground'
                                : 'background.paper',
                          color: isCurrent
                            ? 'primary.contrastText'
                            : isClaimed
                              ? 'success.contrastText'
                              : isLocked
                                ? 'text.disabled'
                                : 'text.primary',
                          boxShadow: isCurrent ? 4 : 1,
                          position: 'relative',
                        }}
                      >
                        {lv.level}
                        {isClaimed && (
                          <CheckCircle
                            sx={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              fontSize: 24,
                              color: 'success.main',
                              bgcolor: 'background.paper',
                              borderRadius: '50%',
                            }}
                          />
                        )}
                        {isLocked && (
                          <Lock
                            sx={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              fontSize: 20,
                              color: 'action.disabled',
                              bgcolor: 'background.paper',
                              borderRadius: '50%',
                            }}
                          />
                        )}
                      </Box>

                      {/* Reward box */}
                      <Paper
                        sx={{
                          width: '100%',
                          minHeight: 100,
                          p: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.5,
                          bgcolor: isLocked
                            ? 'action.disabledBackground'
                            : 'background.paperLight',
                          border: 1,
                          borderColor: isCurrent
                            ? 'primary.main'
                            : isClaimed
                              ? 'success.main'
                              : isLocked
                                ? 'action.disabled'
                                : 'divider',
                          opacity: isLocked ? 0.6 : 1,
                          position: 'relative',
                        }}
                      >
                        {lv.rewards.length === 0 ? (
                          <Typography variant="caption" color="text.secondary">
                            Sin recompensa
                          </Typography>
                        ) : (
                          <>
                            {lv.rewards.map((r: RewardRow, rewardIndex: number) => (
                              <Box
                                key={`${lv.level}-${r.type}-${r.valueInt ?? 'n'}-${r.valueString ?? 'n'}`}
                                sx={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: 0.25,
                                }}
                              >
                                {(() => {
                                  const icon: RewardIcon = getRewardIcon(r);
                                  if (icon.image) {
                                    return (
                                      <Box
                                        component="img"
                                        src={icon.image}
                                        sx={{
                                          width: 24,
                                          height: 24,
                                          objectFit: 'contain',
                                          filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))',
                                        }}
                                      />
                                    );
                                  }
                                  return (
                                    <Typography sx={{ fontSize: '1.5rem' }}>
                                      {icon.emoji || '🎁'}
                                    </Typography>
                                  );
                                })()}
                                <Typography
                                  variant="caption"
                                  sx={{
                                    textAlign: 'center',
                                    fontWeight: rewardIndex === 0 ? 'bold' : 'normal',
                                    fontSize: '0.7rem',
                                    lineHeight: 1.2,
                                  }}
                                >
                                  {formatReward(r)}
                                </Typography>
                              </Box>
                            ))}
                          </>
                        )}
                      </Paper>

                      {/* Claim button */}
                      {canClaim && (
                        <Button
                          size="small"
                          variant="contained"
                          sx={{
                            mt: 1,
                            minWidth: 100,
                            fontSize: '0.75rem',
                          }}
                          disabled={claiming}
                          onClick={() => onClaim(lv.level, lv.rewards)}
                        >
                          Reclamar
                        </Button>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Paper>

          {/* Missions */}
          <Paper sx={{ p: 2, bgcolor: 'background.paperDark' }}>
            <Typography variant="h6" gutterBottom>
              Misiones del pase
            </Typography>
            {data.missions.length === 0 ? (
              <Text>No hay misiones esta temporada.</Text>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {data.missions.map((m) => (
                  <Paper
                    key={m.id}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      flex: '1 1 200px',
                      bgcolor: m.completedAt ? 'success.light' : 'background.paperLight',
                      borderColor: m.completedAt ? 'success.main' : 'divider',
                    }}
                  >
                    <Typography variant="subtitle2">
                      {missionTypeName[m.type] || m.type} — {m.target}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {m.userProgress} / {m.target} · +{m.xpReward} XP
                    </Typography>
                    {m.completedAt && (
                      <Typography variant="caption" color="success.main" display="block" sx={{ mt: 0.5 }}>
                        ✓ Completada
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
        </Box>
      )}

      {/* Dialog for temporary skill/weapon selection */}
      <Dialog open={claimBruteOpen} onClose={() => { setClaimBruteOpen(false); setClaimLevel(null); setBruteId(''); }}>
        <DialogTitle>
          {claimLevel && data?.levels.find((l) => l.level === claimLevel)?.rewards.some((r) => r.type === 'TEMPORARY_WEAPON')
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
          <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button onClick={() => { setClaimBruteOpen(false); setClaimLevel(null); setBruteId(''); }}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={!bruteId || claiming}
              onClick={confirmClaimWithBrute}
            >
              Reclamar
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Page>
  );
};

export default BattlePassView;
