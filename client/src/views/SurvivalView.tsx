import { Box, Paper } from '@mui/material';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    </Page>
  );
};

export default SurvivalView;