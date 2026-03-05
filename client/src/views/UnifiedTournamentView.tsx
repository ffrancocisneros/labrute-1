import { Box, Tabs } from '@mui/material';
import Tab from '@mui/material/Tab';
import dayjs from 'dayjs';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation, useParams } from 'react-router';
import Link from '../components/Link';
import { useBrute } from '../hooks/useBrute';

type TabValue = 'daily' | 'global' | 'special' | 'copa' | 'clan' | 'survival';

const UnifiedTournamentView = () => {
  const { t } = useTranslation();
  const { bruteName, date } = useParams();
  const location = useLocation();
  const { brute } = useBrute();

  const todayStr = dayjs.utc().format('YYYY-MM-DD');
  const currentDate = date || todayStr;

  // Redirect /tournament (empty) a /tournament/:today,
  // pero NO cuando estamos en rutas sin :date (clan, survival, etc.)
  const isClanRoute = location.pathname.includes('/tournament/clan/');
  const isSurvivalRoute = location.pathname.includes('/tournament/survival');
  if (!date && !isClanRoute && !isSurvivalRoute) {
    return <Navigate to={`/${bruteName}/tournament/${todayStr}`} replace />;
  }

  const getTabFromPath = (): TabValue => {
    const path = location.pathname;
    if (path.includes('/tournament/global/')) return 'global';
    if (path.includes('/tournament/special/')) return 'special';
    if (path.includes('/tournament/copa-del-rey/')) return 'copa';
    if (path.includes('/tournament/clan/')) return 'clan';
    if (path.includes('/tournament/survival')) return 'survival';
    return 'daily';
  };

  const currentTab = getTabFromPath();

  return (
    <Box>
      <Tabs
        value={currentTab}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 2,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
        }}
      >
        <Tab
          component={Link}
          to={`/${bruteName}/tournament/${currentDate}`}
          value="daily"
          label={t('tournament.daily')}
        />
        <Tab
          component={Link}
          to={`/${bruteName}/tournament/global/${currentDate}`}
          value="global"
          label={t('tournament.global')}
        />
        <Tab
          component={Link}
          to={`/${bruteName}/tournament/special/${currentDate}`}
          value="special"
          label={t('tournament.special')}
        />
        <Tab
          component={Link}
          to={`/${bruteName}/tournament/survival`}
          value="survival"
          label={t('tournament.survival')}
        />
        <Tab
          component={Link}
          to={`/${bruteName}/tournament/copa-del-rey/final/${currentDate}`}
          value="copa"
          label={t('tournament.copaDelRey')}
        />
        {brute?.clanId ? (
          <Tab
            component={Link}
            to={`/${bruteName}/tournament/clan/${brute.clanId}`}
            value="clan"
            label={t('tournament.clan')}
          />
        ) : (
          <Tab
            value="clan"
            label={t('tournament.clan')}
            disabled
            sx={{ opacity: 0.6 }}
          />
        )}
      </Tabs>
      <Outlet />
    </Box>
  );
};

export default UnifiedTournamentView;
