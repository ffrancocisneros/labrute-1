import { Box, Chip, IconButton, InputAdornment, MenuItem, Paper, Select, Table, TableBody, TableCell, TableHead, TableRow, Tab, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import { ArrowDownward, ArrowUpward, AttachMoney, AutoAwesome, CalendarToday, Close, EmojiEvents, Event, FilterList, History, LocalFireDepartment, MilitaryTech, People, Person, Refresh, Search, ShowChart, Speed, SportsKabaddi, Star, TrendingDown, TrendingUp, Whatshot } from '@mui/icons-material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAlert } from '../hooks/useAlert';
import Server from '../utils/Server';
import catchError from '../utils/catchError';
import { ErrorType } from '../utils/Fetch';
import Page from '../components/Page';
import Text from '../components/Text';

interface BruteStatistics {
  id: string;
  name: string;
  totalFights: number;
  victories: number;
  losses: number;
  winRate: number;
  maxWinStreak: number;
  currentWinStreak: number;
  totalDamage: number;
  maxDamage: number;
  averageDamage: number;
  flawlessWins: number;
  level: number;
  totalXP: number;
  ascensions: number;
  resets: number;
  tournamentWins: number;
  tournamentParticipations: number;
  eventsParticipated: number;
  eventsFinalReached: number;
  eventsWon: number;
  clanWarsParticipated: number;
  clanWarsWon: number;
  clanPointsContributed: number;
  uniqueSkillsUsed: number;
  uniqueWeaponsUsed: number;
  daysSinceCreation: number;
  lastFightDate: Date | null;
}

interface UserStatistics {
  totalFights: number;
  totalVictories: number;
  totalLosses: number;
  overallWinRate: number;
  maxWinStreak: number;
  totalDamage: number;
  maxDamage: number;
  averageDamage: number;
  flawlessWins: number;
  maxLevel: number;
  totalXP: number;
  totalAscensions: number;
  totalResets: number;
  totalGold: number;
  totalTournamentWins: number;
  totalTournamentParticipations: number;
  totalEventsParticipated: number;
  totalEventsFinalReached: number;
  totalEventsWon: number;
  totalClanWarsParticipated: number;
  totalClanWarsWon: number;
  totalClanPointsContributed: number;
  totalUniqueSkillsUsed: number;
  totalUniqueWeaponsUsed: number;
  totalBrutes: number;
  activeBrutes: number;
  daysSinceFirstBrute: number;
  consecutiveDaysPlayed: number;
  brutes: BruteStatistics[];
}

type StatKey = keyof BruteStatistics | 'efficiency' | 'damagePerFight';
type SortField = StatKey | 'name';
type SortDirection = 'asc' | 'desc';

interface StatConfig {
  key: StatKey;
  label: string;
  icon: React.ReactNode;
  category: 'combat' | 'progression' | 'social' | 'events' | 'other';
  format: (value: number) => string;
  getValue: (brute: BruteStatistics) => number;
}

// Nombres en español para logros (AchievementType) en "Logros relacionados"
const ACHIEVEMENT_LABELS: Record<string, string> = {
  WIN_FIGHTS_SINGLE_BRUTE: 'Ganar peleas con un solo bruto',
  WIN_FIGHTS_TOTAL: 'Total de peleas ganadas',
  DAMAGE_DEALT_TOTAL: 'Causar daño total',
  REACH_LEVEL: 'Llegar a un nivel',
  ASCEND_TOTAL: 'Ascender',
  WIN_STREAK: 'Racha de victorias',
  WIN_TOURNAMENTS_TOTAL: 'Ganar torneos',
  EVENTS_WON: 'Ganar Battle Royale',
  CLAN_WARS_WON: 'Ganar guerras de clan',
};

const StatisticsView = () => {
  const Alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [mainTab, setMainTab] = useState(0); // 0: General, 1: Comparativa, 2+: Por bruto
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<Set<StatKey>>(new Set());
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [otherUserSearch, setOtherUserSearch] = useState('');
  const [otherUserStats, setOtherUserStats] = useState<(
    UserStatistics & { userName: string }
  ) | null>(
    null
    );
  const [loadingOtherUser, setLoadingOtherUser] = useState(false);
  const [selectedBrute1, setSelectedBrute1] = useState<string | null>(null);
  const [selectedBrute2, setSelectedBrute2] = useState<string | null>(null);

  const loadStatistics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await Server.Statistics.get();
      setStatistics(response as UserStatistics);
    } catch (error) {
      catchError(Alert)(error as ErrorType | string);
    } finally {
      setLoading(false);
    }
  }, [Alert]);

  useEffect(() => {
    loadStatistics().catch(() => {});
  }, [loadStatistics]);

  const loadOtherUserStatistics = useCallback(async (username: string) => {
    if (!username.trim()) {
      setOtherUserStats(null);
      return;
    }

    try {
      setLoadingOtherUser(true);
      const response = await Server.Statistics.getByUsername(username.trim());
      setOtherUserStats(response as UserStatistics & { userName: string });
    } catch (error) {
      catchError(Alert)(error as ErrorType | string);
      setOtherUserStats(null);
    } finally {
      setLoadingOtherUser(false);
    }
  }, [Alert]);

  // Configuración de estadísticas con iconos
  const statConfigs: StatConfig[] = useMemo(() => [
    {
      key: 'totalFights',
      label: 'Peleas',
      icon: <SportsKabaddi />,
      category: 'combat',
      format: (v) => v.toLocaleString(),
      getValue: (b) => b.totalFights,
    },
    {
      key: 'victories',
      label: 'Victorias',
      icon: <EmojiEvents />,
      category: 'combat',
      format: (v) => v.toLocaleString(),
      getValue: (b) => b.victories,
    },
    {
      key: 'losses',
      label: 'Derrotas',
      icon: <TrendingDown />,
      category: 'combat',
      format: (v) => v.toLocaleString(),
      getValue: (b) => b.losses,
    },
    {
      key: 'winRate',
      label: 'Tasa de Victoria',
      icon: <TrendingUp />,
      category: 'combat',
      format: (v) => `${v.toFixed(2)}%`,
      getValue: (b) => b.winRate,
    },
    {
      key: 'maxWinStreak',
      label: 'Racha Máxima',
      icon: <EmojiEvents />,
      category: 'combat',
      format: (v) => v.toLocaleString(),
      getValue: (b) => b.maxWinStreak,
    },
    {
      key: 'totalDamage',
      label: 'Daño Total',
      icon: <LocalFireDepartment />,
      category: 'combat',
      format: (v) => v.toLocaleString(),
      getValue: (b) => b.totalDamage,
    },
    {
      key: 'maxDamage',
      label: 'Daño Máximo',
      icon: <Whatshot />,
      category: 'combat',
      format: (v) => v.toLocaleString(),
      getValue: (b) => b.maxDamage,
    },
    {
      key: 'averageDamage',
      label: 'Daño Promedio',
      icon: <ShowChart />,
      category: 'combat',
      format: (v) => v.toFixed(2),
      getValue: (b) => b.averageDamage,
    },
    {
      key: 'level',
      label: 'Nivel',
      icon: <TrendingUp />,
      category: 'progression',
      format: (v) => v.toLocaleString(),
      getValue: (b) => b.level,
    },
    {
      key: 'totalXP',
      label: 'XP',
      icon: <Star />,
      category: 'progression',
      format: (v) => v.toLocaleString(),
      getValue: (b) => b.totalXP,
    },
    {
      key: 'ascensions',
      label: 'Ascensiones',
      icon: <ArrowUpward />,
      category: 'progression',
      format: (v) => v.toLocaleString(),
      getValue: (b) => b.ascensions,
    },
    {
      key: 'tournamentWins',
      label: 'Torneos Ganados',
      icon: <EmojiEvents />,
      category: 'events',
      format: (v) => v.toLocaleString(),
      getValue: (b) => b.tournamentWins,
    },
    {
      key: 'eventsWon',
      label: 'Eventos Ganados',
      icon: <EmojiEvents />,
      category: 'events',
      format: (v) => v.toLocaleString(),
      getValue: (b) => b.eventsWon,
    },
    {
      key: 'clanWarsWon',
      label: 'Guerras Ganadas',
      icon: <MilitaryTech />,
      category: 'social',
      format: (v) => v.toLocaleString(),
      getValue: (b) => b.clanWarsWon,
    },
    {
      key: 'efficiency',
      label: 'Eficiencia (Vic/Pelea)',
      icon: <Speed />,
      category: 'other',
      format: (v) => v.toFixed(2),
      getValue: (b) => (b.totalFights > 0 ? b.victories / b.totalFights : 0),
    },
    {
      key: 'damagePerFight',
      label: 'Daño/Pelea',
      icon: <ShowChart />,
      category: 'other',
      format: (v) => v.toFixed(2),
      getValue: (b) => (b.totalFights > 0 ? b.totalDamage / b.totalFights : 0),
    },
  ], []);

  // Calcular rankings (top 3)
  const getRankings = useCallback((key: StatKey, getValue: (b: BruteStatistics) => number) => {
    if (!statistics || statistics.brutes.length === 0) return [];
    const sorted = [...statistics.brutes]
      .map((b) => ({ brute: b, value: getValue(b) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
    return sorted.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, [statistics]);

  // Calcular progreso relativo (% respecto al mejor)
  const getRelativeProgress = useCallback((
    brute: BruteStatistics,
    key: StatKey,
    getValue: (b: BruteStatistics) => number,
  ): number => {
    if (!statistics || statistics.brutes.length === 0) return 0;
    const values = statistics.brutes.map(getValue);
    const max = Math.max(...values);
    if (max === 0) return 0;
    const current = getValue(brute);
    return (current / max) * 100;
  }, [statistics]);

  // Calcular promedio
  const getAverage = useCallback((
    key: StatKey,
    getValue: (b: BruteStatistics) => number,
  ): number => {
    if (!statistics || statistics.brutes.length === 0) return 0;
    const sum = statistics.brutes.reduce((acc, b) => acc + getValue(b), 0);
    return sum / statistics.brutes.length;
  }, [statistics]);

  // Determinar si es récord o top 10%
  const getBadge = useCallback((
    brute: BruteStatistics,
    key: StatKey,
    getValue: (b: BruteStatistics) => number,
  ): 'record' | 'top10' | null => {
    if (!statistics || statistics.brutes.length === 0) return null;
    const value = getValue(brute);
    const values = statistics.brutes.map(getValue).sort((a, b) => b - a);
    const max = values[0] ?? 0;
    const top10Index = Math.floor(values.length * 0.1);
    const top10Threshold = values[top10Index] ?? max;

    if (value === max && max > 0) return 'record';
    if (value >= top10Threshold && value > 0) return 'top10';
    return null;
  }, [statistics]);

  // Filtrar estadísticas por búsqueda
  const filteredStats = useMemo(() => {
    if (!searchQuery) return statConfigs;
    const query = searchQuery.toLowerCase();
    return statConfigs.filter((stat) => (
      stat.label.toLowerCase().includes(query)
      || stat.category.toLowerCase().includes(query)
    ));
  }, [statConfigs, searchQuery]);

  // Estadísticas seleccionadas para comparación
  const metricsToCompare = useMemo(() => {
    if (selectedMetrics.size === 0) return statConfigs;
    return statConfigs.filter((stat) => selectedMetrics.has(stat.key));
  }, [statConfigs, selectedMetrics]);

  // Ordenar brutos
  const sortedBrutes = useMemo(() => {
    if (!statistics) return [];
    const sorted = [...statistics.brutes];
    sorted.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      if (sortField === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else {
        const config = statConfigs.find((s) => s.key === sortField);
        if (config) {
          aVal = config.getValue(a);
          bVal = config.getValue(b);
        }
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [statistics, sortField, sortDirection, statConfigs]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderGeneralStats = () => {
    if (!statistics) return null;

    const stats = [
      { label: 'Peleas Totales', value: statistics.totalFights, icon: <SportsKabaddi /> },
      { label: 'Victorias', value: statistics.totalVictories, icon: <EmojiEvents /> },
      { label: 'Derrotas', value: statistics.totalLosses, icon: <TrendingDown /> },
      { label: 'Tasa de Victoria', value: `${statistics.overallWinRate.toFixed(2)}%`, icon: <TrendingUp /> },
      { label: 'Racha Máxima', value: statistics.maxWinStreak, icon: <EmojiEvents /> },
      { label: 'Daño Total', value: statistics.totalDamage.toLocaleString(), icon: <LocalFireDepartment /> },
      { label: 'Daño Máximo', value: statistics.maxDamage.toLocaleString(), icon: <Whatshot /> },
      { label: 'Daño Promedio', value: statistics.averageDamage.toFixed(2), icon: <ShowChart /> },
      { label: 'Nivel Máximo', value: statistics.maxLevel, icon: <TrendingUp /> },
      { label: 'XP Total', value: statistics.totalXP.toLocaleString(), icon: <Star /> },
      { label: 'Ascensiones', value: statistics.totalAscensions, icon: <ArrowUpward /> },
      { label: 'Resets', value: statistics.totalResets, icon: <Refresh /> },
      { label: 'Oro Total', value: statistics.totalGold.toLocaleString(), icon: <AttachMoney /> },
      { label: 'Torneos Ganados', value: statistics.totalTournamentWins, icon: <EmojiEvents /> },
      { label: 'Eventos Participados', value: statistics.totalEventsParticipated, icon: <Event /> },
      { label: 'Eventos Ganados', value: statistics.totalEventsWon, icon: <EmojiEvents /> },
      { label: 'Guerras de Clan', value: statistics.totalClanWarsParticipated, icon: <MilitaryTech /> },
      { label: 'Habilidades Únicas', value: statistics.totalUniqueSkillsUsed, icon: <AutoAwesome /> },
      { label: 'Armas Únicas', value: statistics.totalUniqueWeaponsUsed, icon: <AutoAwesome /> },
      { label: 'Brutos Totales', value: statistics.totalBrutes, icon: <People /> },
      { label: 'Brutos Activos', value: statistics.activeBrutes, icon: <Person /> },
      { label: 'Días Consecutivos', value: statistics.consecutiveDaysPlayed, icon: <CalendarToday /> },
      { label: 'Días desde Primer Bruto', value: statistics.daysSinceFirstBrute, icon: <History /> },
    ];

    return (
      <Box>
        <Paper
          sx={{
            p: 2,
            mb: 3,
            bgcolor: 'background.paperDark',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h4" gutterBottom>
            Estadísticas Generales
          </Typography>
        </Paper>

        <Paper
          sx={{
            p: 2,
            mb: 4,
            bgcolor: 'background.paperLight',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Table>
            <TableBody>
              {stats.map((stat, index) => (
                <TableRow
                  key={stat.label}
                  sx={{
                    bgcolor: index % 2 === 0 ? 'transparent' : 'action.hover',
                  }}
                >
                  <TableCell sx={{ fontWeight: 600, width: '40%', display: 'flex', alignItems: 'center', gap: 1 }}>
                    {stat.icon}
                    {stat.label}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        {/* Comparativa entre brutos */}
        {statistics.brutes.length > 1 && (
          <Box>
            <Paper
              sx={{
                p: 2,
                mb: 2,
                bgcolor: 'background.paperDark',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="h4" gutterBottom>
                Comparativa entre Brutos
              </Typography>
            </Paper>
            <Paper
              sx={{
                p: 2,
                bgcolor: 'background.paperLight',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Mejores Brutos por Categoría
              </Typography>
              <Table>
                <TableBody>
                  {statConfigs.slice(0, 5).map((config, idx) => {
                    const rankings = getRankings(config.key, config.getValue);
                    return (
                      <TableRow key={config.key} sx={{ bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 600, width: '40%', display: 'flex', alignItems: 'center', gap: 1 }}>
                          {config.icon}
                          {config.label}:
                        </TableCell>
                        <TableCell>
                          {rankings.map((r, i) => (
                            <Chip
                              key={r.brute.id}
                              label={`${i + 1}. ${r.brute.name} (${config.format(r.value)})`}
                              size="small"
                              sx={{
                                mr: 0.5,
                                bgcolor: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32',
                                color: 'white',
                                fontWeight: 600,
                              }}
                            />
                          ))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}
      </Box>
    );
  };

  const renderComparisonView = () => {
    if (!statistics || statistics.brutes.length === 0) {
      return <Text>No hay brutos para comparar.</Text>;
    }

    // Si hay otro usuario, mostrar comparación lado a lado
    if (otherUserStats) {
      return (
        <Box>
          <Paper
            sx={{
              p: 2,
              mb: 3,
              bgcolor: 'background.paperDark',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h4">
                Comparativa entre Usuarios
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder="Buscar otro usuario..."
                  value={otherUserSearch}
                  onChange={(e) => setOtherUserSearch(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      loadOtherUserStatistics(otherUserSearch).catch(() => {});
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ minWidth: 200 }}
                />
                <IconButton
                  onClick={() => {
                    loadOtherUserStatistics(otherUserSearch).catch(() => {});
                  }}
                  disabled={loadingOtherUser || !otherUserSearch.trim()}
                >
                  <Search />
                </IconButton>
                <IconButton
                  onClick={() => {
                    setOtherUserStats(null);
                    setOtherUserSearch('');
                    setSelectedBrute1(null);
                    setSelectedBrute2(null);
                  }}
                >
                  <Close />
                </IconButton>
              </Box>
            </Box>

            {loadingOtherUser && <Text>Cargando estadísticas del otro usuario...</Text>}
          </Paper>

          {/* Comparación general cuenta a cuenta */}
          <Paper
            sx={{
              p: 2,
              mb: 3,
              bgcolor: 'background.paperLight',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Comparación General
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Estadística</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Tú</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{otherUserStats.userName}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Diferencia</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  { label: 'Peleas Totales', key: 'totalFights' },
                  { label: 'Victorias', key: 'totalVictories' },
                  { label: 'Derrotas', key: 'totalLosses' },
                  { label: 'Tasa de Victoria', key: 'overallWinRate', format: (v: number) => `${v.toFixed(2)}%` },
                  { label: 'Racha Máxima', key: 'maxWinStreak' },
                  { label: 'Daño Total', key: 'totalDamage', format: (v: number) => v.toLocaleString() },
                  { label: 'Nivel Máximo', key: 'maxLevel' },
                  { label: 'XP Total', key: 'totalXP', format: (v: number) => v.toLocaleString() },
                  { label: 'Ascensiones', key: 'totalAscensions' },
                  { label: 'Torneos Ganados', key: 'totalTournamentWins' },
                  { label: 'Brutos Totales', key: 'totalBrutes' },
                ].map((stat, idx) => {
                  const getStatValue = (stats: UserStatistics, key: string): number => {
                    const keyMap: Record<string, keyof UserStatistics> = {
                      totalFights: 'totalFights',
                      totalVictories: 'totalVictories',
                      totalLosses: 'totalLosses',
                      overallWinRate: 'overallWinRate',
                      maxWinStreak: 'maxWinStreak',
                      totalDamage: 'totalDamage',
                      maxLevel: 'maxLevel',
                      totalXP: 'totalXP',
                      totalAscensions: 'totalAscensions',
                      totalTournamentWins: 'totalTournamentWins',
                      totalBrutes: 'totalBrutes',
                    };
                    const statKey = keyMap[key];
                    if (!statKey) return 0;
                    const value = stats[statKey];
                    return typeof value === 'number' ? value : 0;
                  };
                  const myValue = getStatValue(statistics, stat.key);
                  const otherValue = getStatValue(otherUserStats, stat.key);
                  const diff = myValue - otherValue;
                  const format = stat.format || ((v: number) => v.toLocaleString());

                  return (
                    <TableRow key={stat.key} sx={{ bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 600 }}>{stat.label}</TableCell>
                      <TableCell>{format(myValue)}</TableCell>
                      <TableCell>{format(otherValue)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: diff > 0 ? 'success.main' : diff < 0 ? 'error.main' : 'text.secondary' }}>
                          {diff > 0 ? <TrendingUp fontSize="small" /> : diff < 0 ? <TrendingDown fontSize="small" /> : null}
                          {diff > 0 ? '+' : ''}{format(diff)}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>

          {/* Comparación de brutos específicos */}
          <Paper
            sx={{
              p: 2,
              mb: 3,
              bgcolor: 'background.paperLight',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Comparar Brutos Específicos
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="body2" gutterBottom>Tú</Typography>
                <Select
                  value={selectedBrute1 || ''}
                  onChange={(e) => setSelectedBrute1(e.target.value || null)}
                  displayEmpty
                  fullWidth
                  size="small"
                >
                  <MenuItem value="">Seleccionar bruto...</MenuItem>
                  {statistics.brutes.map((b) => (
                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                  ))}
                </Select>
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="body2" gutterBottom>{otherUserStats.userName}</Typography>
                <Select
                  value={selectedBrute2 || ''}
                  onChange={(e) => setSelectedBrute2(e.target.value || null)}
                  displayEmpty
                  fullWidth
                  size="small"
                >
                  <MenuItem value="">Seleccionar bruto...</MenuItem>
                  {otherUserStats.brutes.map((b) => (
                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                  ))}
                </Select>
              </Box>
            </Box>

            {selectedBrute1 && selectedBrute2 && (() => {
              const brute1 = statistics.brutes.find((b) => b.id === selectedBrute1);
              const brute2 = otherUserStats.brutes.find((b) => b.id === selectedBrute2);
              if (!brute1 || !brute2) return null;

              return (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Estadística</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{brute1.name}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{brute2.name}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Diferencia</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {statConfigs.map((stat, idx) => {
                      const value1 = stat.getValue(brute1);
                      const value2 = stat.getValue(brute2);
                      const diff = value1 - value2;

                      return (
                        <TableRow key={stat.key} sx={{ bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover' }}>
                          <TableCell sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                            {stat.icon}
                            {stat.label}
                          </TableCell>
                          <TableCell>{stat.format(value1)}</TableCell>
                          <TableCell>{stat.format(value2)}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: diff > 0 ? 'success.main' : diff < 0 ? 'error.main' : 'text.secondary' }}>
                              {diff > 0 ? <TrendingUp fontSize="small" /> : diff < 0 ? <TrendingDown fontSize="small" /> : null}
                              {diff > 0 ? '+' : ''}{stat.format(diff)}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              );
            })()}
          </Paper>
        </Box>
      );
    }

    // Vista normal de comparación entre brutos propios
    return (
      <Box>
        <Paper
          sx={{
            p: 2,
            mb: 3,
            bgcolor: 'background.paperDark',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4">
              Comparativa entre Brutos
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Buscar otro usuario..."
              value={otherUserSearch}
              onChange={(e) => setOtherUserSearch(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  loadOtherUserStatistics(otherUserSearch).catch(() => {});
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
            />
            <IconButton
              onClick={() => {
                loadOtherUserStatistics(otherUserSearch).catch(() => {});
              }}
              disabled={loadingOtherUser || !otherUserSearch.trim()}
            >
              <Search />
            </IconButton>
            <TextField
              size="small"
              placeholder="Buscar estadística..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
            />
            <IconButton
              onClick={() => {
                if (selectedMetrics.size === metricsToCompare.length) {
                  setSelectedMetrics(new Set());
                } else {
                  setSelectedMetrics(new Set(metricsToCompare.map((m) => m.key)));
                }
              }}
            >
              <FilterList />
            </IconButton>
          </Box>

          {selectedMetrics.size > 0 && (
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {statConfigs
                .filter((s) => selectedMetrics.has(s.key))
                .map((stat) => (
                  <Chip
                    key={stat.key}
                    label={stat.label}
                    onDelete={() => {
                      const newSet = new Set(selectedMetrics);
                      newSet.delete(stat.key);
                      setSelectedMetrics(newSet);
                    }}
                    size="small"
                  />
                ))}
            </Box>
          )}
        </Paper>

        <Paper
          sx={{
            p: 2,
            bgcolor: 'background.paperLight',
            border: '1px solid',
            borderColor: 'divider',
            overflowX: 'auto',
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{ fontWeight: 700, cursor: 'pointer', minWidth: 150 }}
                  onClick={() => handleSort('name')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Bruto
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />
                    )}
                  </Box>
                </TableCell>
                {metricsToCompare.map((stat) => (
                  <TableCell
                    key={stat.key}
                    sx={{ fontWeight: 700, cursor: 'pointer', minWidth: 120 }}
                    onClick={() => handleSort(stat.key)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {stat.icon}
                      {stat.label}
                      {sortField === stat.key && (
                        sortDirection === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />
                      )}
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedBrutes.map((brute, idx) => (
                <TableRow key={brute.id} sx={{ bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{brute.name}</TableCell>
                  {metricsToCompare.map((stat) => {
                    const value = stat.getValue(brute);
                    const progress = getRelativeProgress(brute, stat.key, stat.getValue);
                    const badge = getBadge(brute, stat.key, stat.getValue);
                    const avg = getAverage(stat.key, stat.getValue);
                    const isAboveAvg = value > avg;

                    return (
                      <TableCell key={stat.key}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box>
                            {stat.format(value)}
                            {badge === 'record' && (
                              <Tooltip title="Récord">
                                <Chip
                                  label="🏆"
                                  size="small"
                                  sx={{ ml: 0.5, height: 20, fontSize: '0.7rem' }}
                                />
                              </Tooltip>
                            )}
                            {badge === 'top10' && (
                              <Tooltip title="Top 10%">
                                <Chip
                                  label="⭐"
                                  size="small"
                                  sx={{ ml: 0.5, height: 20, fontSize: '0.7rem' }}
                                />
                              </Tooltip>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem', color: 'text.secondary' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                              {isAboveAvg ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
                              Tu mejor bruto = 100%. Este: {progress.toFixed(0)}%.
                            </Box>
                          </Box>
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        {/* Filtro de métricas */}
        {selectedMetrics.size === 0 && (
          <Paper
            sx={{
              p: 2,
              mt: 2,
              bgcolor: 'background.paperLight',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Seleccionar Métricas para Comparar
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              {filteredStats.map((stat) => (
                <Chip
                  key={stat.key}
                  label={(
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {stat.icon}
                      {stat.label}
                    </Box>
                  )}
                  onClick={() => {
                    const newSet = new Set(selectedMetrics);
                    if (newSet.has(stat.key)) {
                      newSet.delete(stat.key);
                    } else {
                      newSet.add(stat.key);
                    }
                    setSelectedMetrics(newSet);
                  }}
                  color={selectedMetrics.has(stat.key) ? 'primary' : 'default'}
                  clickable
                />
              ))}
            </Box>
          </Paper>
        )}
      </Box>
    );
  };

  const renderBruteStats = (brute: BruteStatistics) => {
    const stats = statConfigs.map((config) => {
      const value = config.getValue(brute);
      const progress = getRelativeProgress(brute, config.key, config.getValue);
      const badge = getBadge(brute, config.key, config.getValue);
      const avg = getAverage(config.key, config.getValue);
      const isAboveAvg = value > avg;
      const rankings = getRankings(config.key, config.getValue);
      const rank = rankings.findIndex((r) => r.brute.id === brute.id) + 1;

      return {
        ...config,
        value,
        progress,
        badge,
        isAboveAvg,
        rank: rank > 0 ? rank : null,
      };
    });

    return (
      <Box>
        <Paper
          sx={{
            p: 2,
            mb: 3,
            bgcolor: 'background.paperDark',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h4" gutterBottom>
            {brute.name}
          </Typography>
        </Paper>

        <Paper
          sx={{
            p: 2,
            bgcolor: 'background.paperLight',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Table>
            <TableBody>
              {stats.map((stat, index) => (
                <TableRow
                  key={stat.key}
                  sx={{
                    bgcolor: index % 2 === 0 ? 'transparent' : 'action.hover',
                  }}
                >
                  <TableCell sx={{ fontWeight: 600, width: '40%', display: 'flex', alignItems: 'center', gap: 1 }}>
                    {stat.icon}
                    {stat.label}
                    {stat.rank && stat.rank <= 3 && (
                      <Chip
                        label={stat.rank === 1 ? '🥇' : stat.rank === 2 ? '🥈' : '🥉'}
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                    {stat.badge === 'record' && (
                      <Tooltip title="Récord">
                        <Chip label="🏆" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                      </Tooltip>
                    )}
                    {stat.badge === 'top10' && (
                      <Tooltip title="Top 10%">
                        <Chip label="⭐" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ fontWeight: 500 }}>
                          {stat.format(stat.value)}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
                          {stat.isAboveAvg ? (
                            <TrendingUp fontSize="small" color="success" />
                          ) : (
                            <TrendingDown fontSize="small" color="error" />
                          )}
                          Tu mejor bruto = 100%. Este: {stat.progress.toFixed(0)}%.
                        </Box>
                      </Box>
                      {(() => {
                        // Mapeo de logros relacionados
                        const relatedAchievements: Partial<Record<StatKey, string[]>> = {
                          victories: ['WIN_FIGHTS_SINGLE_BRUTE', 'WIN_FIGHTS_TOTAL'],
                          totalDamage: ['DAMAGE_DEALT_TOTAL'],
                          level: ['REACH_LEVEL'],
                          ascensions: ['ASCEND_TOTAL'],
                          maxWinStreak: ['WIN_STREAK'],
                          tournamentWins: ['WIN_TOURNAMENTS_TOTAL'],
                          eventsWon: ['EVENTS_WON'],
                          clanWarsWon: ['CLAN_WARS_WON'],
                          damagePerFight: ['DAMAGE_DEALT_TOTAL'],
                        };
                        const related = relatedAchievements[stat.key];
                        if (!related || related.length === 0) return null;
                        const labels = related.map((code) => ACHIEVEMENT_LABELS[code] || code);
                        return (
                          <Box sx={{ fontSize: '0.7rem', color: 'text.secondary', fontStyle: 'italic', mt: 0.5 }}>
                            Logros relacionados: {labels.join(', ')}
                          </Box>
                        );
                      })()}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    );
  };

  return (
    <Page title="Estadísticas">
      {loading ? (
        <Text>Cargando estadísticas...</Text>
      ) : !statistics ? (
        <Text>No se pudieron cargar las estadísticas.</Text>
      ) : (
        <Box sx={{ width: '100%' }}>
          <Paper
            sx={{
              p: 1,
              mb: 3,
              bgcolor: 'background.paperDark',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Tabs
              value={mainTab}
              onChange={(_, newValue) => setMainTab(newValue as number)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  color: 'text.secondary',
                  fontWeight: 600,
                  minHeight: 48,
                  textTransform: 'none',
                  fontSize: '1rem',
                  border: '1px solid transparent',
                  borderRadius: 1,
                  mx: 0.5,
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderColor: 'divider',
                  },
                },
                '& .Mui-selected': {
                  color: 'primary.main',
                  bgcolor: 'background.paperLight',
                  borderColor: 'primary.main',
                  border: '1px solid',
                },
                '& .MuiTabs-indicator': {
                  display: 'none',
                },
              }}
            >
              <Tab label="General" />
              <Tab label="Comparativa" />
              {statistics.brutes.map((brute) => (
                <Tab key={brute.id} label={brute.name} />
              ))}
            </Tabs>
          </Paper>

          {mainTab === 0 && renderGeneralStats()}
          {mainTab === 1 && renderComparisonView()}
          {mainTab > 1 && (() => {
            const brute = statistics.brutes[mainTab - 2];
            return brute ? renderBruteStats(brute) : null;
          })()}
        </Box>
      )}
    </Page>
  );
};

export default StatisticsView;
