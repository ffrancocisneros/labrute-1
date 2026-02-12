import { BruteRanking, getMaxFightsPerDay, getTotalFightsLeft, getWinsNeededToRankUp, getXPNeeded } from '@labrute/core';
import { Lang } from '@labrute/prisma';
import { PlayArrow } from '@mui/icons-material';
import { AlertTitle, Box, BoxProps, Alert as MuiAlert, Stack, Tooltip, Typography } from '@mui/material';
import dayjs from 'dayjs';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAlert } from '../../hooks/useAlert';
import { useAuth } from '../../hooks/useAuth';
import { useBrute } from '../../hooks/useBrute';
import { useConfirm } from '../../hooks/useConfirm';
import Server from '../../utils/Server';
import catchError from '../../utils/catchError';
import BruteBodyAndStats from '../Brute/BruteBodyAndStats';
import BruteLevelAndXP from '../Brute/BruteLevelAndXP';
import FantasyButton from '../FantasyButton';
import Link from '../Link';
import StyledButton from '../StyledButton';
import Text from '../Text';

export interface CellMainProps extends BoxProps {
  language: Lang;
  smallScreen?: boolean;
  confirmSacrifice?: () => void;
  confirmReset?: () => void;
  toggleAutoFight?: () => void;
  isAutoFighting?: boolean;
}

const CellMain = ({
  language,
  smallScreen,
  confirmSacrifice,
  confirmReset,
  toggleAutoFight,
  isAutoFighting,
  ...rest
}: CellMainProps) => {
  const { t } = useTranslation();
  const Confirm = useConfirm();
  const Alert = useAlert();
  const navigate = useNavigate();
  const { brute, owner, updateBrute } = useBrute();
  const { user, authing, currentEvent, updateData, modifiers } = useAuth();

  const xpNeededForNextLevel = useMemo(
    () => (brute ? getXPNeeded(brute.level + 1) : 0),
    [brute],
  );

  const fightsLeft = useMemo(
    () => (brute ? getTotalFightsLeft(brute, modifiers) : 0),
    [brute, modifiers],
  );

  // Temporales activos (arma/habilidad) - vienen del payload /api/user/authenticate
  type TempSkill = { skillName: string; expiresAt: string };
  type TempWeapon = { weaponName: string; expiresAt: string };
  const bruteWithTemps = brute as unknown as {
    temporarySkills?: TempSkill[];
    temporaryWeapons?: TempWeapon[];
  };
  const temporarySkills: TempSkill[] = bruteWithTemps?.temporarySkills ?? [];
  const temporaryWeapons: TempWeapon[] = bruteWithTemps?.temporaryWeapons ?? [];

  const formatRemaining = useCallback((expiresAt: string) => {
    const now = dayjs.utc();
    const exp = dayjs.utc(expiresAt);
    const totalMinutes = Math.max(0, exp.diff(now, 'minute'));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }, []);

  // Rank up
  const rankUp = useCallback(() => {
    if (!brute) return;

    Confirm.open(t('rankUp'), t('rankUpConfirm'), () => {
      Server.Brute.rankUp(brute.name).then(() => {
        // Reload page
        window.location.reload();
      }).catch(catchError(Alert));
    });
  }, [Alert, Confirm, brute, t]);

  // Login - checks auth mode and redirects appropriately
  const login = useCallback(() => {
    Server.Auth.getAuthMode().then((response) => {
      if (response.localAuthEnabled) {
        // Local auth mode - redirect to login page
        navigate('/login');
      } else if (response.url) {
        // OAuth mode - redirect to Eternal-Twin
        window.location.href = response.url;
      }
    }).catch(catchError(Alert));
  }, [Alert, navigate]);

  // Hide button after registering all — avoids reappearing until next user fetch
  const [justRegisteredAll, setJustRegisteredAll] = React.useState(false);
  React.useEffect(() => {
    setJustRegisteredAll(false);
  }, [user?.id]);

  // Register all brutes for tournament
  const registerAllBrutes = useCallback(() => {
    Server.Tournament.registerAllDaily().then((response) => {
      Alert.open('success', t('brutesRegistered', { count: response.registered }));
      setJustRegisteredAll(true);
      // Update all brutes in the user data
      updateData((data) => (data ? {
        ...data,
        brutes: data.brutes.map((b) => ({
          ...b,
          registeredForTournament: true,
        })),
      } : data));
      // Update current brute if it exists
      if (brute) {
        updateBrute({
          ...brute,
          registeredForTournament: true,
        });
      }
    }).catch(catchError(Alert));
  }, [Alert, brute, t, updateBrute, updateData]);

  // Check if user has unregistered brutes
  // Simplified: just check if there are any brutes not registered
  // Backend will filter out invalid brutes (canRankUpSince, deletedAt, eventId)
  const hasUnregisteredBrutes = useMemo(() => {
    if (!owner || !user) return false;
    return user.brutes.some((b) => !b.registeredForTournament && !b.canRankUpSince && !b.eventId);
  }, [owner, user]);

  return brute && (
    <Box {...rest}>
      {/* DELETION ALERT */}
      {owner && brute.willBeDeletedAt && (
        <MuiAlert
          severity="error"
          variant="filled"
        >
          <AlertTitle>{t('taggedForDeletion', { days: dayjs.utc(brute.willBeDeletedAt).diff(dayjs.utc(), 'days') })}</AlertTitle>
          {t(`deletionReason.${brute.deletionReason}`, { days: dayjs.utc(brute.willBeDeletedAt).diff(dayjs.utc(), 'days') })}
        </MuiAlert>
      )}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        {/* LEVEL + XP */}
        <BruteLevelAndXP brute={brute} sx={{ pl: 1 }} />
        {/* RANKING */}
        {!brute.eventId && (
          <Box sx={{ width: 140, display: 'flex', flexDirection: 'row' }}>
            <Box component="img" sx={{ width: 40, height: 40 }} src={`/images/rankings/lvl_${brute.ranking}.webp`} />
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <Text bold color="secondary" sx={{ pl: 0.5 }}>{t(`lvl_${brute.ranking as BruteRanking}`)}</Text>
              {brute.ascensions > 0 && (
                <Tooltip title={t('ascensions')}>
                  <Box sx={{ display: 'flex', flexDirection: 'row', marginLeft: 'auto' }}>
                    <Text bold color="secondary" sx={{ pl: 0.5 }}>{`x${brute.ascensions}`}</Text>
                    <Box component="img" sx={{ width: 16, height: 16 }} src="/images/ear.gif" />
                  </Box>
                </Tooltip>
              )}
            </Box>
          </Box>
        )}
      </Box>
      <BruteBodyAndStats brute={brute} sx={{ mb: 1 }} />

      {/* REGISTER ALL BRUTES BUTTON */}
      {owner && hasUnregisteredBrutes && !justRegisteredAll && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <FantasyButton
            color="primary"
            onClick={registerAllBrutes}
            sx={{ my: 1 }}
          >
            {t('registerAllBrutes')}
          </FantasyButton>
        </Box>
      )}

      {/* TEMPORARY SKILLS/WEAPONS */}
      {(temporarySkills.length > 0 || temporaryWeapons.length > 0) && (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1,
            flexWrap: 'wrap',
          }}
        >
          {temporarySkills.slice(0, 3).map((skill) => (
            <Tooltip
              key={`temp-skill-${skill.skillName}-${skill.expiresAt}`}
              title={(
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {t(skill.skillName)}
                  </Typography>
                  <Typography variant="body2">
                    {t(`${skill.skillName}.desc`)}
                  </Typography>
                  <Typography variant="caption">
                    Tiempo restante: {formatRemaining(skill.expiresAt)}
                  </Typography>
                </Stack>
              )}
            >
              <Box
                component="img"
                src={`/images/skills/${skill.skillName}.svg`}
                alt={skill.skillName}
                sx={{
                  width: 28,
                  height: 28,
                  border: '2px solid',
                  borderColor: 'error.main',
                  borderRadius: 1,
                  p: 0.5,
                  bgcolor: 'background.paperDark',
                }}
              />
            </Tooltip>
          ))}
          {temporaryWeapons.slice(0, 3).map((weapon) => (
            <Tooltip
              key={`temp-weapon-${weapon.weaponName}-${weapon.expiresAt}`}
              title={(
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {t(weapon.weaponName)}
                  </Typography>
                  <Typography variant="caption">
                    Tiempo restante: {formatRemaining(weapon.expiresAt)}
                  </Typography>
                </Stack>
              )}
            >
              <Box
                component="img"
                src={`/images/weapons/${weapon.weaponName}.png`}
                alt={weapon.weaponName}
                sx={{
                  width: 28,
                  height: 28,
                  border: '2px solid',
                  borderColor: 'error.main',
                  borderRadius: 1,
                  p: 0.5,
                  bgcolor: 'background.paperDark',
                }}
              />
            </Tooltip>
          ))}
        </Box>
      )}

      {/* Tournament wins until rank up */}
      {(!owner || (!brute.tournaments.length || brute.currentTournamentStepWatched === 6))
        && !brute.eventId
        && (
          <Tooltip title={t(
            brute.ranking === 0 ? 'tournamentVictoriesUntilAscend' : 'tournamentVictoriesUntilRankUp',
            { value: getWinsNeededToRankUp(brute) }
          )}
          >
            <Box textAlign="center">
              <Box component="img" src={`/images/${brute && brute.ranking === 0 ? 'ascend' : 'ranking'}.png`} alt="Tournament victories until rank up" sx={{ width: 22, mr: 1 }} />
              {new Array(getWinsNeededToRankUp(brute)).fill(0).map((_, i) => (
                <Box
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  sx={{
                    height: 20,
                    width: 12,
                    mr: 0.25,
                    display: 'inline-block',
                    border: '2px solid',
                    borderColor: 'divider',
                    bgcolor: brute.tournamentWins > i ? 'success.light' : 'transparent',
                  }}
                />
              ))}
            </Box>
          </Tooltip>
        )}

      {/* Rank up */}
      {owner && brute.canRankUpSince && brute.ranking > 0 && (!dayjs.utc(brute.canRankUpSince).isSame(dayjs.utc(), 'day') || brute.currentTournamentStepWatched === 6) && (
        <FantasyButton color="warning" onClick={rankUp} sx={{ mb: 1 }}>
          {t('rankUp')}
        </FantasyButton>
      )}
      {/* Ascend */}
      {owner && brute.canRankUpSince && brute.ranking === 0 && (!dayjs.utc(brute.canRankUpSince).isSame(dayjs.utc(), 'day') || brute.currentTournamentStepWatched === 6) && (
        <Link
          to={`/${brute.name}/ascend`}
          sx={{
            '&:hover': {
              textDecoration: 'none',
            },
          }}
        >
          <FantasyButton color="warning" sx={{ mb: 1 }}>
            {t('ascend')}
          </FantasyButton>
        </Link>
      )}
      {!authing && !user && (
        <FantasyButton
          color="success"
          onClick={login}
          sx={{ mt: 2 }}
        >
          {t('connect')}
        </FantasyButton>
      )}
      {owner && ((brute.xp < xpNeededForNextLevel
        || (brute.eventId && brute.level >= (currentEvent?.maxLevel ?? 999)))
        ? fightsLeft > 0
          ? (
            <Stack spacing={1} sx={{ alignItems: 'center', mt: 1 }}>
              <Text bold sx={{ pl: 1 }}>{t('callToFight')}</Text>
              <Link to={`/${brute.name}/arena`}>
                <StyledButton
                  sx={{
                    height: 72,
                    width: 218,
                  }}
                  image={`/images/${language}/cell/arena.webp`}
                  imageHover={`/images/${language}/cell/arena-hover.webp`}
                  shadow={false}
                  contrast={false}
                />
              </Link>
              <Text bold color="error">{fightsLeft > 1 ? t('fightsLeft', { value: fightsLeft }) : t('fightLeft')}</Text>
            </Stack>
          )
          : (
            <Box sx={{ textAlign: 'center' }}>
              <Text bold color="error">{t('bruteIsResting', { brute: brute.name })}</Text>
              <Text color="error">{t('newFightsTomorrow', { amount: getMaxFightsPerDay(brute, modifiers) })}</Text>
            </Box>
          )
        : (!brute.eventId || brute.level < (currentEvent?.maxLevel ?? 999)) ? (
          <FantasyButton color="success" to={`/${brute.name}/level-up`}>
            {t('levelUp')}
          </FantasyButton>
        )
          : null)}
      {/* TOURNAMENT - Single button to unified tournament view */}
      {!smallScreen && !brute.eventId && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <FantasyButton
            color="secondary"
            to={`/${brute.name}/tournament`}
            sx={{ my: 1 }}
          >
            {t('tournament')}
          </FantasyButton>
        </Box>
      )}
      {/* BRUTE SACRIFICE */}
      {owner
        && !!confirmSacrifice
        && (
          <FantasyButton
            color="error"
            onClick={confirmSacrifice}
            sx={{
              mt: 1,
            }}
          >
            {t('sacrifice')}
          </FantasyButton>
        )}
      {/* BRUTE RESET */}
      {owner && !!confirmReset && (
        <FantasyButton
          color="warning"
          onClick={confirmReset}
          sx={{
            mt: 2,
          }}
        >
          {t('reset')}
        </FantasyButton>
      )}
      {/* AUTO FIGHT */}
      {owner && !!toggleAutoFight && (
        <FantasyButton
          color={isAutoFighting ? 'error' : 'success'}
          onClick={toggleAutoFight}
          disabled={isAutoFighting}
          sx={{
            mt: 2,
          }}
        >
          {isAutoFighting ? (
            <>
              <Box component="span" sx={{ display: 'inline-block', animation: 'spin 1s linear infinite', '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }}>
                ⏳
              </Box>
              {' '}
              {t('autoFightInProgress')}
            </>
          ) : (
            <>
              <PlayArrow sx={{ verticalAlign: 'middle', mr: 1 }} />
              {t('startAutoFight')}
            </>
          )}
        </FantasyButton>
      )}
    </Box>
  );
};

export default CellMain;
