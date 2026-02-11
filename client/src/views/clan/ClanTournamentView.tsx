import { Box, Paper, Table, TableBody, TableCell, TableHead, TableRow, useTheme } from '@mui/material';
import dayjs from 'dayjs';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import FantasyButton from '../../components/FantasyButton';
import Page from '../../components/Page';
import StyledButton from '../../components/StyledButton';
import Text from '../../components/Text';
import useStateAsync from '../../hooks/useStateAsync';
import Server from '../../utils/Server';

type ClanTournamentFormat = 'ELIMINATION' | 'LEAGUE';

interface ClanTournamentTodayResponse {
  tournament: {
    id: string;
    date: string;
    format: ClanTournamentFormat;
    status: 'PENDING' | 'ONGOING' | 'FINISHED';
    rounds: number;
    participants: Array<{
      id: string;
      seed: number;
      points: number;
      finalPosition: number | null;
      clan: { id: string; name: string };
    }>;
    wars: Array<{
      id: string;
      round: number;
      attackerWins: number;
      defenderWins: number;
      fightIds: string[];
      attackerClan: { id: string; name: string };
      defenderClan: { id: string; name: string };
      winnerClan: { id: string; name: string } | null;
    }>;
  } | null;
}

const ClanTournamentView = () => {
  const { t } = useTranslation();
  const { bruteName, id } = useParams();
  const navigate = useNavigate();
  const { palette: { mode } } = useTheme();

  const { data } = useStateAsync<ClanTournamentTodayResponse | null, string | undefined>(
    null,
    (clanId) => {
      if (!clanId) return Promise.resolve({ tournament: null });
      return Server.ClanTournament.getToday(clanId);
    },
    id,
  );

  const tournament = data?.tournament ?? null;

  const groupedWars = useMemo(() => {
    if (!tournament) return [];
    const byRound: { round: number; wars: typeof tournament.wars }[] = [];
    tournament.wars.forEach((war) => {
      let bucket = byRound.find((r) => r.round === war.round);
      if (!bucket) {
        bucket = { round: war.round, wars: [] };
        byRound.push(bucket);
      }
      bucket.wars.push(war);
    });
    byRound.sort((a, b) => a.round - b.round);
    return byRound;
  }, [tournament]);

  const champion = useMemo(() => {
    if (!tournament) return null;
    const best = tournament.participants.find((p) => p.finalPosition === 1);
    return best?.clan.name ?? null;
  }, [tournament]);

  const title = useMemo(() => {
    if (!tournament) return t('clanTournament');
    const date = dayjs.utc(tournament.date).format('DD/MM/YYYY');
    // Mostrar un título claro y amigable: "Torneo de Clanes - FECHA"
    return `${t('clanTournament')} - ${date}`;
  }, [t, tournament]);

  return (
    <Page
      title={title}
      headerUrl={`/${bruteName || ''}/cell`}
    >
      <Paper sx={{ mx: 4 }}>
        <Text h3 bold upperCase typo="handwritten" sx={{ mr: 2 }}>
          {title}
        </Text>
      </Paper>
      <Paper sx={{ bgcolor: 'background.paperLight', mt: -2, p: 2 }}>
        {!tournament && (
          <Box sx={{ textAlign: 'center', my: 4 }}>
            <Text bold>
              {t('noClanTournamentToday')}
            </Text>
          </Box>
        )}
        {tournament && (
          <>
            <Box sx={{ mb: 2 }}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                mb: champion ? 1 : 0,
              }}
              >
                <Text bold smallCaps>
                  {tournament.format === 'ELIMINATION'
                    ? t('clanTournamentFormatElimination')
                    : t('clanTournamentFormatLeague')}
                </Text>
                <Text smallCaps>
                  {t('status')}: {t(`clanTournamentStatus.${tournament.status}`)}
                </Text>
              </Box>
              {champion && (
                <Text smallCaps bold color="success.main">
                  {t('clanTournamentChampion', { clan: champion })}
                </Text>
              )}
            </Box>
            {tournament.format === 'ELIMINATION' && (
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                overflowX: 'auto',
                pb: 2,
              }}
              >
                {groupedWars.map(({ round, wars }) => (
                  <Box
                    key={round}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-around',
                      minWidth: 220,
                      mx: 1,
                    }}
                  >
                    <Text
                      bold
                      smallCaps
                      center
                      sx={{ mb: 1 }}
                    >
                      {t('roundX', { round })}
                    </Text>
                    {wars.map((war) => {
                      const attackerIsWinner = war.winnerClan?.id === war.attackerClan.id;
                      const defenderIsWinner = war.winnerClan?.id === war.defenderClan.id;

                      return (
                        <StyledButton
                          key={war.id}
                          image="/images/arena/brute-bg.webp"
                          imageHover="/images/arena/brute-bg-hover.webp"
                          contrast={false}
                          shadow={false}
                          sx={{
                            my: 0.5,
                            px: 1,
                            py: 0.75,
                            display: 'flex',
                            flexDirection: 'column',
                            minWidth: 200,
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Text bold color={attackerIsWinner ? 'success.main' : 'text.primary'}>
                              {war.attackerClan.name}
                            </Text>
                            <Text smallCaps color={attackerIsWinner ? 'success.main' : 'text.secondary'}>
                              {t('duelsWon', { count: war.attackerWins })}
                            </Text>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
                            <Box
                              component="img"
                              src={`/images${mode === 'dark' ? '/dark' : ''}/versus/vs.webp`}
                              sx={{ width: 48 }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text bold color={defenderIsWinner ? 'success.main' : 'text.primary'}>
                              {war.defenderClan.name}
                            </Text>
                            <Text smallCaps color={defenderIsWinner ? 'success.main' : 'text.secondary'}>
                              {t('duelsWon', { count: war.defenderWins })}
                            </Text>
                          </Box>
                          {war.round === tournament.rounds && war.winnerClan && (
                            <Text
                              smallCaps
                              color="success.main"
                              sx={{ mt: 0.5 }}
                            >
                              {t('clanTournamentChampion', { clan: war.winnerClan.name })}
                            </Text>
                          )}
                          {war.fightIds.length > 0 && bruteName && (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                              <FantasyButton
                                color="primary"
                                onClick={() => navigate(`/${bruteName}/tournament/clan/${id}/war/${war.id}`)}
                                sx={{
                                  px: 1,
                                  py: 0,
                                  fontSize: 10,
                                }}
                              >
                                {t('watchDuels')}
                              </FantasyButton>
                            </Box>
                          )}
                        </StyledButton>
                      );
                    })}
                  </Box>
                ))}
              </Box>
            )}
            {tournament.format === 'LEAGUE' && (
              <>
                <Text bold h4 sx={{ mb: 1 }}>{t('leagueTable')}</Text>
                <Table sx={{
                  maxWidth: 1,
                  mb: 2,
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
                    bgcolor: 'background.paperDark',
                    py: 0.5,
                    px: 1,
                    border: '1px solid',
                    borderColor: 'background.default',
                  },
                }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>{t('clan')}</TableCell>
                      <TableCell align="right">{t('points')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tournament.participants
                      .slice()
                      .sort((a, b) => b.points - a.points)
                      .map((p, index) => (
                        <TableRow key={p.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{p.clan.name}</TableCell>
                          <TableCell align="right">{p.points}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
                <Text bold h4 sx={{ mb: 1 }}>{t('clanWars')}</Text>
                {groupedWars.length === 0 && (
                  <Text>{t('noClanWarsYet')}</Text>
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {groupedWars.map(({ round, wars }) => (
                    <Box key={round} sx={{ mb: 1 }}>
                      <Text smallCaps bold sx={{ mb: 0.5 }}>
                        {t('roundX', { round })}
                      </Text>
                      {wars.map((war) => (
                        <Box
                          key={war.id}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            px: 1,
                            py: 0.5,
                            bgcolor: 'background.paperDark',
                            borderRadius: 1,
                            mb: 0.5,
                          }}
                        >
                          <Text>
                            {war.attackerClan.name} {war.attackerWins}
                            {' '}
                            -
                            {' '}
                            {war.defenderWins} {war.defenderClan.name}
                          </Text>
                          {war.fightIds.length > 0 && bruteName && (
                            <FantasyButton
                              color="primary"
                              onClick={() => navigate(`/${bruteName}/tournament/clan/${id}/war/${war.id}`)}
                              sx={{ ml: 1 }}
                            >
                              {t('watchDuels')}
                            </FantasyButton>
                          )}
                        </Box>
                      ))}
                    </Box>
                  ))}
                </Box>
              </>
            )}
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <FantasyButton
                color="primary"
                onClick={() => navigate(`/${bruteName || ''}/clan/${id}`)}
              >
                {t('backToClan')}
              </FantasyButton>
            </Box>
          </>
        )}
      </Paper>
    </Page>
  );
};

export default ClanTournamentView;
