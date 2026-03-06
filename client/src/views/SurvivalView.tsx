import { Box, Paper } from '@mui/material';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TournamentsGetDailyResponse } from '@labrute/core';
import FantasyButton from '../components/FantasyButton';
import Page from '../components/Page';
import Text from '../components/Text';
import { useAuth } from '../hooks/useAuth';
import { useBrute } from '../hooks/useBrute';
import Server from '../utils/Server';

const SurvivalView = () => {
  const { t } = useTranslation();
  const { brute } = useBrute();
  const { user } = useAuth();
  const [selectedBruteName, setSelectedBruteName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tournament, setTournament] = useState<TournamentsGetDailyResponse | null>(null);
  const [loadingTournament, setLoadingTournament] = useState(false);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    Server.Tournament.getSurvivalSelection()
      .then(({ bruteName }) => {
        setSelectedBruteName(bruteName);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (!brute) {
    return null;
  }

  const today = dayjs.utc().startOf('day');
  const dayOfWeek = today.day(); // 4 = jueves
  const isThursday = dayOfWeek === 4;
  const todayStr = today.format('YYYY-MM-DD');

  useEffect(() => {
    if (!brute || isThursday) return;

    setLoadingTournament(true);
    Server.Tournament.getSurvival({ name: brute.name, date: todayStr })
      .then((data) => {
        setTournament(data);
      })
      .catch((error) => {
        console.error(error);
        setTournament(null);
      })
      .finally(() => setLoadingTournament(false));
  }, [brute, isThursday, todayStr]);

  const handleRegister = () => {
    setLoading(true);
    Server.Tournament.registerSurvival(brute.name)
      .then(() => {
        setSelectedBruteName(brute.name);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  return (
    <Page title={t('tournament.survival')}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Text h3 smallCaps bold>
          {t('tournament.survival')}
        </Text>
        <Text sx={{ mt: 1 }}>
          {t('tournament.survivalDescription')}
        </Text>
        <Box sx={{ mt: 2 }}>
          <Text bold>
            {t('tournament.survivalCurrentSelection')}{' '}
            {selectedBruteName || t('tournament.survivalNoneSelected')}
          </Text>
        </Box>
        <Box sx={{ mt: 2 }}>
          {isThursday ? (
            <FantasyButton
              color="secondary"
              disabled={loading}
              onClick={handleRegister}
            >
              {t('tournament.survivalSelectThisBrute', { name: brute.name })}
            </FantasyButton>
          ) : (
            <Text color="text.secondary">
              {t('tournament.survivalRegistrationClosed')}
            </Text>
          )}
        </Box>
      </Paper>
      {!isThursday && (
        <Paper sx={{ p: 2 }}>
          <Text h4 smallCaps bold>
            {t('tournamentOf')} {dayjs.utc(todayStr).format('DD MMMM YYYY')}
          </Text>
          {loadingTournament && (
            <Text sx={{ mt: 1 }}>{t('loading') || 'Cargando torneo Survival...'}</Text>
          )}
          {!loadingTournament && !tournament && (
            <Text sx={{ mt: 1 }}>
              {t('noTournamentsForDate') || 'No hay torneo Survival disponible para esta fecha.'}
            </Text>
          )}
          {!loadingTournament && tournament && (
            <Box sx={{ mt: 2 }}>
              {Array.from(
                tournament.fights.reduce((map, fight) => {
                  const round = fight.tournamentStep || 1;
                  const existing = map.get(round) || [];
                  existing.push(fight);
                  map.set(round, existing);
                  return map;
                }, new Map<number, typeof tournament.fights>()),
              )
                .sort(([a], [b]) => a - b)
                .map(([round, fights]) => (
                  <Box key={round} sx={{ mt: 2 }}>
                    <Text bold smallCaps>
                      {t('round') || 'Ronda'} {round}
                    </Text>
                    {fights.map((fight) => (
                      <Box
                        key={fight.id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mt: 0.5,
                        }}
                      >
                        <Text>
                          {fight.brute1?.name || 'NPC'} vs {fight.brute2?.name || 'NPC'}
                        </Text>
                        <FantasyButton
                          color="secondary"
                          to={`/${fight.brute1?.name || brute.name}/fight/${fight.id}`}
                          sx={{ ml: 2 }}
                        >
                          {t('watch') || 'Ver pelea'}
                        </FantasyButton>
                      </Box>
                    ))}
                  </Box>
                ))}
            </Box>
          )}
        </Paper>
      )}
    </Page>
  );
};

export default SurvivalView;