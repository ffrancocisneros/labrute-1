import { Lang, Log } from '@labrute/prisma';
import { History, Policy, PlayArrow } from '@mui/icons-material';
import { Box, Grid, IconButton, Paper, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import CellClan from '../../components/Cell/CellClan';
import CellLog from '../../components/Cell/CellLog';
import CellMain from '../../components/Cell/CellMain';
import CellPets from '../../components/Cell/CellPets';
import CellSkills from '../../components/Cell/CellSkills';
import CellSocials from '../../components/Cell/CellSocials';
// Nota: los componentes de torneos específicos (CellTournament, CellSpecialTournament,
// CellGlobalTournament) ya no se usan en mobile, reemplazados por un solo botón
// que lleva a la vista unificada de torneos.
import CellWeapons from '../../components/Cell/CellWeapons';
import FantasyButton from '../../components/FantasyButton';
import Link from '../../components/Link';
import Page from '../../components/Page';
import Text from '../../components/Text';
import { useAuth } from '../../hooks/useAuth';
import { useBrute } from '../../hooks/useBrute';
import { AdResult } from '../../utils/ads';
import { getBruteWinrate } from '../../utils/getBruteWinrate';
import { keys } from '@labrute/core';

export interface CellMobileViewProps {
  ad: AdResult;
  logs: (Log & { currentBrute: { name: string } })[];
  language: Lang;
  confirmReport: () => void;
  confirmSacrifice: () => void;
  confirmReset: () => void;
  toggleAutoFight?: () => void;
  isAutoFighting?: boolean;
}

const CellMobileView = ({
  ad,
  logs,
  language,
  confirmReport,
  confirmSacrifice,
  confirmReset,
  toggleAutoFight,
  isAutoFighting,
}: CellMobileViewProps) => {
  const { t } = useTranslation();
  const { brute, owner } = useBrute();
  const { user } = useAuth();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));

  return brute && (
    <Page
      title={`${brute.name || ''} ${t('MyBrute')}`}
      description={t('cell.desc', {
        name: brute.name,
        level: brute.level,
        rank: t(`lvl_${brute.ranking}`),
        winrate: getBruteWinrate(brute),
      })}
      headerUrl={`/${brute.name}/cell`}
    >
      <Grid container spacing={1} alignItems="center">
        {/* BRUTE NAME + SOCIALS */}
        <Grid item xs={12} sm={6} order={isXs ? 1 : 0}>
          <CellSocials smallScreen />
        </Grid>
        <Grid item xs={12} sm={6} order={isXs ? 6 : 0} alignSelf="stretch">
          {/* REF LINK + CLAN */}
          <Paper sx={{
            bgcolor: 'background.paperLight',
            px: 0,
            py: 1,
            height: 'calc(100% - 32px)',
            display: 'flex',
            justifyContent: 'center',
            alignContent: 'center',
            flexDirection: 'column',
            textAlign: 'center',
          }}
          >
            <Tooltip title={t('refLink')}>
              <Text bold center>{`${window.location.origin}?ref=${brute.name}`}</Text>
            </Tooltip>
            {(owner || !!brute.clanId) && (
              <CellClan brute={brute} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} order={isXs ? 3 : 0} sx={{ textAlign: 'center', px: 1, alignSelf: 'center' }}>
          <Box sx={{ mx: 1 }}>
            {/* WEAPONS */}
            <Text bold center color={theme.palette.mode === 'dark' ? 'text.primary' : undefined} sx={{ mb: 0.5 }}>
              <Tooltip title={t('inventory')}>
                <Link to={`/${brute.name}/inventory`}>
                  <Box
                    component="img"
                    src="/images/inventory.png"
                    sx={{
                      width: 22,
                      verticalAlign: 'middle',
                      mr: 0.5,
                    }}
                  />
                </Link>
              </Tooltip>
              {t('weaponsBonuses')}
            </Text>
            <CellWeapons sx={{ width: 1 }} />
            {/* SKILLS */}
            <CellSkills />
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} order={isXs ? 2 : 0}>
          <Paper sx={{ bgcolor: 'background.paperLight' }}>
            {/* MAIN */}
            <CellMain
              language={language}
              smallScreen
            />
          </Paper>
          <Text
            smallCaps
            subtitle2
            center
            onClick={confirmReport}
            color={theme.palette.mode === 'dark' ? 'text.primary' : undefined}
            sx={{ cursor: 'pointer' }}
          >
            {t('report')}
          </Text>
          {user?.admin && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Tooltip title={t('adminPanel')}>
                <IconButton
                  component={RouterLink}
                  to={`/admin-panel/brute/${brute.name}`}
                  color="error"
                >
                  <Policy />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Grid>
        <Grid item xs={12} sm={6} sx={{ textAlign: 'center' }} order={isXs ? 4 : 0}>
          {/* PETS OR CUSTOM IMAGE */}
          {keys(brute.pets).length > 0 ? (
            <CellPets />
          ) : (
            <Box
              component="img"
              src={`/images/redirects/${ad.illustration}`}
              sx={{ width: 200, height: 200, objectFit: 'cover', border: 2 }}
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} sx={{ textAlign: 'center' }} order={isXs ? 5 : 0}>
          {/* TOURNAMENT - botón único a vista unificada */}
          <FantasyButton
            color="secondary"
            to={`/${brute.name}/tournament`}
            sx={{ my: 1 }}
          >
            {t('tournament')}
          </FantasyButton>
        </Grid>
      </Grid>
      {/* LOGS */}
      {!!logs.length && (
        <Paper
          sx={{
            bgcolor: 'background.paperLight',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {logs.map((log) => <CellLog key={log.id} log={log} />)}
        </Paper>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <FantasyButton to={`/${brute.name}/tournaments`} color="secondary" sx={{ m: 1 }}>
          <History sx={{ verticalAlign: 'middle', mr: 1 }} />
          {t('tournaments')}
        </FantasyButton>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <FantasyButton to={`/${brute.name}/event/history`} color="primary" sx={{ m: 1 }}>
          <History sx={{ verticalAlign: 'middle', mr: 1 }} />
          {t('eventHistory')}
        </FantasyButton>
      </Box>
      {/* BRUTE SACRIFICE */}
      {owner
        && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <FantasyButton
              color="error"
              onClick={confirmSacrifice}
              sx={{
                mt: 1,
              }}
            >
              {t('sacrifice')}
            </FantasyButton>
          </Box>
        )}
      {/* BRUTE RESET */}
      {owner && (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <FantasyButton
            color="warning"
            onClick={confirmReset}
            sx={{
              mt: 2,
            }}
          >
            {t('reset')}
          </FantasyButton>
        </Box>
      )}
      {/* AUTO FIGHT */}
      {owner && toggleAutoFight && (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
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
        </Box>
      )}
    </Page>
  );
};

export default CellMobileView;
