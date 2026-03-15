import { getGameDay } from '@labrute/core';
import { TournamentType } from '@labrute/prisma';
import { Box, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow, useMediaQuery, useTheme } from '@mui/material';
import dayjs from 'dayjs';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import FantasyButton from '../components/FantasyButton';
import Link from '../components/Link';
import Loader from '../components/Loader';
import Page from '../components/Page';
import Text from '../components/Text';
import useStateAsync from '../hooks/useStateAsync';
import { ActiveSpecialRule } from '../types/tournament';
import Server from '../utils/Server';

const TournamentHistoryView = () => {
  const { t } = useTranslation();
  const { bruteName } = useParams();
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.down('md'));

  const { data: tournaments } = useStateAsync(null, Server.Tournament.getHistory, bruteName || '');
  const todayStr = getGameDay().format('YYYY-MM-DD');
  const { data: copaDelRey } = useStateAsync(null, Server.Tournament.getCopaDelRey, todayStr);
  const fetchActiveSpecialRule = useCallback(
    async (): Promise<ActiveSpecialRule | null> => (
      Server.Tournament.getActiveSpecialRule() as Promise<ActiveSpecialRule | null>
    ),
    [],
  );
  const activeSpecialRuleResult = useStateAsync<ActiveSpecialRule | null>(
    null,
    fetchActiveSpecialRule,
  );
  const activeSpecialRule: ActiveSpecialRule | null = activeSpecialRuleResult.data;

  const hasCopaSemifinal = !!copaDelRey?.semifinal;
  const hasCopaFinal = !!copaDelRey?.final;

  return (
    <Page
      title={t('tournamentHistory')}
      description={t('tournamentHistory.desc')}
      headerUrl={`/${bruteName || ''}/cell`}
    >
      <Paper sx={{ mx: 4 }}>
        <Text h3 bold upperCase typo="handwritten" sx={{ mr: 2 }}>{t('tournamentHistory')}</Text>
      </Paper>
      {(hasCopaSemifinal || hasCopaFinal) && (
        <Paper sx={{ mx: 4, mt: 2, p: 2, bgcolor: 'background.paperAccent' }}>
          <Text bold sx={{ mb: 1 }}>{t('copaDelRey')} - {dayjs.utc().format('DD/MM/YYYY')}</Text>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {hasCopaSemifinal && (
              <Link to={`/${bruteName || ''}/tournament/copa-del-rey/semifinal/${todayStr}`}>
                <FantasyButton color="secondary" sx={{ mr: 1 }}>
                  {t('copaDelReySemifinal')}
                </FantasyButton>
              </Link>
            )}
            {hasCopaFinal && (
              <Link to={`/${bruteName || ''}/tournament/copa-del-rey/final/${todayStr}`}>
                <FantasyButton color="primary">
                  {t('copaDelReyFinal')}
                </FantasyButton>
              </Link>
            )}
          </Box>
        </Paper>
      )}
      {activeSpecialRule && (
        <Paper sx={{ mx: 4, mt: 2, p: 2, bgcolor: 'background.paperAccent' }}>
          <Text bold sx={{ mb: 1 }}>
            {activeSpecialRule.emoji} {t(activeSpecialRule.nameKey)} - {dayjs.utc().format('DD/MM/YYYY')}
          </Text>
          <Text sx={{ mb: 1 }}>{t(activeSpecialRule.descKey)}</Text>
          <Link to={`/${bruteName || ''}/tournament/special/${todayStr}`}>
            <FantasyButton color="secondary">
              {t('specialTournament.viewBracket')}
            </FantasyButton>
          </Link>
        </Paper>
      )}
      <Paper sx={{ bgcolor: 'background.paperLight', mt: -2 }}>
        <Grid container spacing={1}>
          <Grid item xs={12} md={3} />
          <Grid item xs={12} md={6}>
            <Table sx={{
              maxWidth: 1,
              '& th': {
                bgcolor: 'secondary.main',
                color: 'secondary.contrastText',
                py: 0.5,
                px: 1,
                fontWeight: 'bold',
                border: '1px solid',
                borderColor: 'background.default',
              },
              '& td': {
                py: 0.5,
                px: 1,
                border: '1px solid',
                borderColor: 'background.default',
              },
            }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>{t('date')}</TableCell>
                  <TableCell align="right">{t('tournament')}</TableCell>
                  <TableCell align="right" sx={{ width: 10 }}>{t('result')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tournaments ? tournaments.map((tournament) => {
                  const tournamentDate = dayjs.utc(tournament.date);
                  const lastDigit = tournament.place % 10;

                  return (
                    <TableRow
                      key={tournament.id}
                      sx={{
                        '& td': {
                          bgcolor: tournament.type === TournamentType.DAILY ? 'background.paper' : 'background.paperDark',
                        }
                      }}
                    >
                      <TableCell component="th" scope="row">
                        {tournamentDate.format('DD/MM/YYYY')}
                      </TableCell>
                      <TableCell align="right">
                        <Link to={`/${bruteName || ''}/tournament/${tournament.type === TournamentType.GLOBAL || tournament.type === TournamentType.UNLIMITED_GLOBAL ? 'global/' : tournament.type === TournamentType.SPECIAL ? 'special/' : ''}${dayjs.utc(tournament.date).format('YYYY-MM-DD')}`}>
                          <Text bold>
                            {tournament.type === TournamentType.DAILY
                              ? t('dailyTournament')
                              : (tournament.type === TournamentType.GLOBAL
                                || tournament.type === TournamentType.UNLIMITED_GLOBAL)
                                ? t('globalTournament')
                                : tournament.type === TournamentType.SPECIAL
                                  ? t('specialTournament')
                                  : tournament.type}
                          </Text>
                        </Link>
                      </TableCell>
                      <TableCell align="right">
                        <Text>
                          {tournament.place}{t(`tournament.result.finishingWith.${[1, 2, 3].includes(lastDigit) ? (lastDigit as 1 | 2 | 3) : 'other'}`)}
                        </Text>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell component="th" scope="row" />
                    <TableCell>
                      <Loader size={20} />
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Grid>
          {!isMd && (
            <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
              <Box component="img" src={`/images${theme.palette.mode === 'dark' ? '/dark' : ''}/arena/referee.webp`} sx={{ maxWidth: 1 }} />
            </Grid>
          )}
        </Grid>
      </Paper>
    </Page>
  );
};

export default TournamentHistoryView;
