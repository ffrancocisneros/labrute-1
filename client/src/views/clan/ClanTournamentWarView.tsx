import { Box, Paper, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { Fighter } from '@labrute/core';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import FantasyButton from '../../components/FantasyButton';
import Page from '../../components/Page';
import Text from '../../components/Text';
import useStateAsync from '../../hooks/useStateAsync';
import Server from '../../utils/Server';

type ClanTournamentFormat = 'ELIMINATION' | 'LEAGUE';

interface ClanTournamentTodayResponse {
  tournament: {
    id: string;
    date: string;
    format: ClanTournamentFormat;
    participants: Array<{
      id: string;
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

const ClanTournamentWarView = () => {
  const { t } = useTranslation();
  const { bruteName, id, warId } = useParams();
  const navigate = useNavigate();

  const { data } = useStateAsync<ClanTournamentTodayResponse | null, string | undefined>(
    null,
    (clanId) => {
      if (!clanId) return Promise.resolve({ tournament: null });
      return Server.ClanTournament.getToday(clanId);
    },
    id,
  );

  const [warIndexTitle, setWarIndexTitle] = useState<string>('');
  const [fightsDetails, setFightsDetails] = useState<Record<string, {
    leftName: string;
    rightName: string;
    winner: string;
    loser: string;
  }>>({});

  const tournament = data?.tournament ?? null;
  const war = tournament?.wars.find((w) => w.id === warId) ?? null;

  useEffect(() => {
    if (!war || !tournament) {
      return;
    }
    const date = dayjs.utc(tournament.date).format('DD/MM/YYYY');
    setWarIndexTitle(`${t('clanTournament')} - ${date}`);
  }, [t, tournament, war]);

  // Cargar detalles de cada pelea (nombres de brutos y ganador/perdedor)
  useEffect(() => {
    if (!war) {
      setFightsDetails({});
      return undefined;
    }

    let cancelled = false;

    (async () => {
      const entries = await Promise.all(war.fightIds.map(async (fightId) => {
        const fight = await Server.Fight.get(fightId);
        const fighters = JSON.parse(fight.fighters) as Fighter[];

        const leftBrute = fighters.find((f) => f.team === 'L' && f.type === 'brute');
        const rightBrute = fighters.find((f) => f.team === 'R' && f.type === 'brute');

        return [fightId, {
          leftName: leftBrute?.name || '',
          rightName: rightBrute?.name || '',
          winner: fight.winner,
          loser: fight.loser,
        }] as const;
      }));

      if (!cancelled) {
        setFightsDetails(Object.fromEntries(entries));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [war]);

  const title = warIndexTitle || t('clanTournament');

  return (
    <Page
      title={title}
      headerUrl={`/${bruteName || ''}/tournament/clan/${id}`}
    >
      <Paper sx={{ mx: 4 }}>
        <Text h3 bold upperCase typo="handwritten" sx={{ mr: 2 }}>
          {war
            ? `${war.attackerClan.name} ${t('vs')} ${war.defenderClan.name}`
            : title}
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
        {war && (
          <>
            <Box sx={{ mb: 2 }}>
              <Text bold>
                {war.attackerClan.name}
                {' '}
                {war.attackerWins}
                {' '}
                -
                {' '}
                {war.defenderWins}
                {' '}
                {war.defenderClan.name}
              </Text>
              {war.winnerClan && (
                <Text smallCaps color="text.secondary">
                  {t('winner')}: {war.winnerClan.name}
                </Text>
              )}
            </Box>
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
                  <TableCell>{war.attackerClan.name}</TableCell>
                  <TableCell align="center">{t('fight')}</TableCell>
                  <TableCell align="right">{war.defenderClan.name}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {war.fightIds.map((fightId) => {
                  const details = fightsDetails[fightId];
                  const leftName = details?.leftName || '';
                  const rightName = details?.rightName || '';

                  const leftColor = details
                    ? details.winner === leftName
                      ? 'success.main'
                      : details.loser === leftName
                        ? 'error.main'
                        : 'text.primary'
                    : 'text.primary';

                  const rightColor = details
                    ? details.winner === rightName
                      ? 'success.main'
                      : details.loser === rightName
                        ? 'error.main'
                        : 'text.primary'
                    : 'text.primary';

                  return (
                    <TableRow key={fightId}>
                      <TableCell>
                        <Text bold color={leftColor}>
                          {leftName || '...'}
                        </Text>
                      </TableCell>
                      <TableCell align="center">
                        <FantasyButton
                          color="primary"
                          onClick={() => navigate(`/${bruteName || ''}/fight/${fightId}`)}
                        >
                          {t('seeFight')}
                        </FantasyButton>
                      </TableCell>
                      <TableCell align="right">
                        <Text bold color={rightColor}>
                          {rightName || '...'}
                        </Text>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
        {war && war.fightIds.length === 0 && (
          <Box sx={{ textAlign: 'center', my: 4 }}>
            <Text>{t('noFightsLeft')}</Text>
          </Box>
        )}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <FantasyButton
            color="primary"
            onClick={() => navigate(`/${bruteName || ''}/tournament/clan/${id}`)}
          >
            {t('backToClan')}
          </FantasyButton>
        </Box>
      </Paper>
    </Page>
  );
};

export default ClanTournamentWarView;