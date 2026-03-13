import { Fighter, getGameDay, isWinner, TournamentsGetDailyResponse } from '@labrute/core';
import { Gender } from '@labrute/prisma';
import { Close } from '@mui/icons-material';
import { Box, Paper, useTheme } from '@mui/material';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import BruteRender from '../components/Brute/Body/BruteRender';
import BruteTooltip from '../components/Brute/BruteTooltip';
import FantasyButton from '../components/FantasyButton';
import Page from '../components/Page';
import StyledButton, { StyledButtonHeight, StyledButtonWidth } from '../components/StyledButton';
import Text from '../components/Text';
import { useAuth } from '../hooks/useAuth';
import { useBrute } from '../hooks/useBrute';
import Server from '../utils/Server';

const fighterToBrute = (fighter: Fighter) => ({
  id: fighter.id,
  gender: fighter.gender || Gender.male,
  name: fighter.name,
  hp: fighter.maxHp,
  level: fighter.level,
  strengthValue: fighter.strength,
  agilityValue: fighter.agility,
  speedValue: fighter.speed,
  body: fighter.body || '0'.repeat(11),
  colors: fighter.colors || '0'.repeat(32),
});

const getLastFriday = (today: dayjs.Dayjs) => today.subtract(
  (today.day() + 2) % 7,
  'day',
);

const SurvivalView = () => {
  const { t } = useTranslation();
  const { bruteName } = useParams();
  const { brute } = useBrute();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { palette: { mode } } = useTheme();

  const [selectedBruteName, setSelectedBruteName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tournament, setTournament] = useState<TournamentsGetDailyResponse | null>(null);
  const [loadingTournament, setLoadingTournament] = useState(true);

  const today = getGameDay();
  const isThursday = today.day() === 4;
  const survivalDate = getLastFriday(today).format('YYYY-MM-DD');

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    Server.Tournament.getSurvivalSelection()
      .then(({ bruteName: name }) => {
        setSelectedBruteName(name);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!brute) return;

    setLoadingTournament(true);
    Server.Tournament.getSurvival({ name: brute.name, date: survivalDate })
      .then((data) => {
        setTournament(data);
      })
      .catch(() => {
        setTournament(null);
      })
      .finally(() => setLoadingTournament(false));
  }, [brute, survivalDate]);

  const handleRegister = () => {
    if (!brute) return;

    setLoading(true);
    Server.Tournament.registerSurvival(brute.name)
      .then(() => {
        setSelectedBruteName(brute.name);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const rounds = useMemo(() => {
    if (!tournament) return [];

    const roundMap = new Map<number, typeof tournament.fights>();
    for (const fight of tournament.fights) {
      const round = fight.tournamentStep || 1;
      const existing = roundMap.get(round) || [];
      existing.push(fight);
      roundMap.set(round, existing);
    }

    return Array.from(roundMap.entries())
      .sort(([a], [b]) => a - b);
  }, [tournament]);

  const totalRounds = rounds.length;

  const finalFight = useMemo(
    () => {
      if (rounds.length === 0) return undefined;
      const lastRound = rounds[rounds.length - 1];
      return lastRound?.[1]?.[0];
    },
    [rounds],
  );

  const finalFighters = useMemo(() => (finalFight
    ? JSON.parse(finalFight.fighters) as Fighter[]
    : undefined), [finalFight]);

  const goToFight = useCallback(
    (fight: TournamentsGetDailyResponse['fights'][number]) => () => {
      if (!fight.brute1) return;
      navigate(`/${fight.brute1.name}/fight/${fight.id}`);
    },
    [navigate],
  );

  if (!brute) {
    return null;
  }

  return (
    <Page
      title={`${t('tournament.survival')} ${dayjs.utc(survivalDate).format('DD MMMM YYYY')}`}
      headerUrl={`/${bruteName || ''}/cell`}
    >
      {/* Registration section */}
      <Paper sx={{ mx: 4, textAlign: 'center', p: 2 }}>
        <Text h3 bold upperCase typo="handwritten" sx={{ mr: 2 }}>
          {t('tournament.survival')} {dayjs.utc(survivalDate).format('DD MMMM YYYY')}
        </Text>
        <Text variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('tournament.survivalDescription')}
        </Text>
        <Box sx={{ mt: 1 }}>
          <Text bold>
            {t('tournament.survivalCurrentSelection')}{' '}
            {selectedBruteName || t('tournament.survivalNoneSelected')}
          </Text>
        </Box>
        {isThursday && (
          <Box sx={{ mt: 1 }}>
            <FantasyButton
              color="secondary"
              disabled={loading}
              onClick={handleRegister}
            >
              {t('tournament.survivalSelectThisBrute', { name: brute.name })}
            </FantasyButton>
          </Box>
        )}
      </Paper>

      {/* Tournament bracket */}
      <Paper sx={{ bgcolor: 'background.paperLight', mt: -2, p: 2 }}>
        {loadingTournament && (
          <Text sx={{ textAlign: 'center', py: 3 }}>{t('loading')}</Text>
        )}
        {!loadingTournament && !tournament && (
          <Text sx={{ textAlign: 'center', py: 3 }} color="text.secondary">
            {t('tournament.survivalNoTournament')}
          </Text>
        )}
        {!loadingTournament && tournament && rounds.map(([round, fights], roundIndex) => (
          <Box key={round} sx={{ mb: 3 }}>
            <Text h4 bold sx={{ textAlign: 'center', mb: 1 }}>
              {roundIndex === totalRounds - 1
                ? t('finals')
                : roundIndex === totalRounds - 2
                  ? t('semiFinals')
                  : roundIndex === totalRounds - 3
                    ? t('quarterFinals')
                    : t('round', { value: roundIndex + 1 })}
            </Text>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {fights.map((fight) => {
                const fighters = JSON.parse(fight.fighters) as Fighter[];
                const brute1 = fighters.find(
                  (fighter) => !fighter.master
                    && fighter.type === 'brute'
                    && fighter.team === 'L',
                );
                const brute2 = fighters.find(
                  (fighter) => !fighter.master
                    && fighter.type === 'brute'
                    && fighter.team === 'R',
                );

                return (
                  <StyledButton
                    key={fight.id}
                    onClick={goToFight(fight)}
                    shadowColor={
                      fighters.some((fighter) => fighter.name === bruteName)
                        ? '#006CD1'
                        : undefined
                    }
                    sx={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundSize: 'contain',
                      width: StyledButtonWidth * 0.7,
                      height: StyledButtonHeight * 0.7,
                      m: 1,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Left fighter */}
                    {brute1 && (
                      <BruteTooltip fighter={brute1}>
                        <Box sx={{
                          position: 'relative',
                          height: 1,
                          width: 35,
                          mr: 1,
                        }}
                        >
                          <BruteRender brute={fighterToBrute(brute1)} />
                          {isWinner(brute2, fight) && (
                            <Close
                              color="error"
                              sx={{
                                position: 'absolute',
                                top: 5,
                                left: 0,
                                width: 1,
                                height: 1,
                                zIndex: 3,
                              }}
                            />
                          )}
                          <Box
                            component="img"
                            src={`/images/rankings/lvl_${brute1?.rank}.webp`}
                            sx={{
                              position: 'absolute',
                              bottom: -6,
                              right: -18,
                              width: 20,
                              zIndex: 2,
                            }}
                          />
                        </Box>
                      </BruteTooltip>
                    )}
                    {/* VS */}
                    <Box
                      component="img"
                      src={`/images${mode === 'dark' ? '/dark' : ''}/tournament/vs.webp`}
                      sx={{ width: 40 }}
                    />
                    {/* Right fighter */}
                    {brute2 && (
                      <BruteTooltip fighter={brute2}>
                        <Box sx={{
                          position: 'relative',
                          height: 1,
                          width: 35,
                          ml: 1,
                        }}
                        >
                          <BruteRender
                            brute={fighterToBrute(brute2)}
                            looking="left"
                          />
                          {isWinner(brute1, fight) && (
                            <Close
                              color="error"
                              sx={{
                                position: 'absolute',
                                top: 5,
                                left: 0,
                                width: 1,
                                height: 1,
                                zIndex: 3,
                              }}
                            />
                          )}
                          <Box
                            component="img"
                            src={`/images/rankings/lvl_${
                              fighters.find((f) => f.id === brute2?.id)?.rank
                            }.webp`}
                            sx={{
                              position: 'absolute',
                              bottom: -6,
                              left: -18,
                              width: 20,
                              transform: 'scaleX(-1)',
                              zIndex: 2,
                            }}
                          />
                        </Box>
                      </BruteTooltip>
                    )}
                  </StyledButton>
                );
              })}
            </Box>
          </Box>
        ))}
        {/* Tournament winner */}
        {!loadingTournament
          && finalFight?.brute2
          && finalFighters
          && (
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            >
              <BruteTooltip
                fighter={isWinner(finalFight.brute1, finalFight)
                  ? finalFighters.find(
                    (fighter) => fighter.type === 'brute'
                      && fighter.name === finalFight.brute1?.name,
                  )
                  : finalFighters.find(
                    (fighter) => fighter.type === 'brute'
                      && fighter.name === finalFight.brute2?.name,
                  )}
                brute={
                  finalFight.brute1 && isWinner(finalFight.brute1, finalFight)
                    ? finalFight.brute1
                    : finalFight.brute2
                }
              >
                <Box width={100} mx="auto">
                  <BruteRender
                    brute={
                      finalFight.brute1 && isWinner(finalFight.brute1, finalFight)
                        ? finalFight.brute1
                        : finalFight?.brute2
                    }
                    width={100}
                    sx={{
                      width: '100%',
                      left: 0,
                    }}
                  />
                </Box>
              </BruteTooltip>
              <Box
                component="img"
                src="/images/tournament/podium.svg"
                sx={{
                  width: 155,
                  marginTop: '-55px',
                  marginLeft: '20px',
                }}
              />
            </Box>
          )}
      </Paper>
    </Page>
  );
};

export default SurvivalView;
