import { Alert, Paper, Stack, TextField, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FantasyButton from '../../components/FantasyButton';
import Loader from '../../components/Loader';
import Page from '../../components/Page';
import Text from '../../components/Text';
import { useAlert } from '../../hooks/useAlert';
import Server from '../../utils/Server';
import catchError from '../../utils/catchError';

type MetricsResponse = {
  date: string;
  totalFights: number;
  connectedUsersCount: number;
  tournamentRegistrationsCount: number;
  survivalRegistrationsCount: number;
  activeUsersWithFightsCount: number;
  users: Array<{
    userId: string;
    userName: string;
    fightsToday: number;
    userTotalFightsAvailable: number;
    fightsTodayRatio: string;
    lastConnectionAt: Date | null;
    msSinceLastConnection: number | null;
  }>;
};

const formatSince = (ms: number | null) => {
  if (ms === null) return '-';

  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const AdminMetricsView = () => {
  const { t } = useTranslation();
  const AlertHook = useAlert();
  const [date, setDate] = useState(dayjs.utc().format('YYYY-MM-DD'));
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);

  const fetchMetrics = useCallback((targetDate: string) => {
    setLoading(true);
    Server.AdminMetrics.getDaily(targetDate)
      .then(setMetrics)
      .catch(catchError(AlertHook))
      .finally(() => setLoading(false));
  }, [AlertHook]);

  useEffect(() => {
    fetchMetrics(date);
  }, [date, fetchMetrics]);

  return (
    <Page title={t('adminPanel')} headerUrl="/">
      <Paper sx={{ mx: 4 }}>
        <Text h3 bold upperCase typo="handwritten">Admin metrics</Text>
      </Paper>
      <Paper sx={{ bgcolor: 'background.paperLight', mt: -2 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              type="date"
              label="Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <FantasyButton color="primary" onClick={() => fetchMetrics(date)}>
              Refresh
            </FantasyButton>
          </Stack>

          {loading && <Loader />}

          {!loading && metrics && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                <Alert severity="info">Conectados hoy: {metrics.connectedUsersCount}</Alert>
                <Alert severity="info">Peleas totales hoy: {metrics.totalFights}</Alert>
                <Alert severity="info">Usuarios con peleas hoy: {metrics.activeUsersWithFightsCount}</Alert>
                <Alert severity="info">Inscripciones torneo diario: {metrics.tournamentRegistrationsCount}</Alert>
                <Alert severity="info">Inscripciones survival hoy: {metrics.survivalRegistrationsCount}</Alert>
              </Stack>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Peleas en el dia</TableCell>
                    <TableCell>Relacion (X de TOTAL)</TableCell>
                    <TableCell>Ultima conexion</TableCell>
                    <TableCell>Tiempo desde ultima conexion</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metrics.users.map((entry) => (
                    <TableRow key={entry.userId}>
                      <TableCell>{entry.userName}</TableCell>
                      <TableCell>{entry.fightsToday}</TableCell>
                      <TableCell>{entry.fightsTodayRatio}</TableCell>
                      <TableCell>
                        {entry.lastConnectionAt
                          ? dayjs.utc(entry.lastConnectionAt).format('YYYY-MM-DD HH:mm:ss')
                          : '-'}
                      </TableCell>
                      <TableCell>{formatSince(entry.msSinceLastConnection)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Page>
  );
};
