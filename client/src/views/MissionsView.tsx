import { getRewardTitleName } from '@labrute/core';
import { Box, Chip, Collapse, IconButton, LinearProgress, Paper, Tab, Tabs, Typography } from '@mui/material';
import { CheckCircle, ExpandLess, ExpandMore } from '@mui/icons-material';
import React, { useCallback, useEffect, useState } from 'react';
import { useAlert } from '../hooks/useAlert';
import { useAuth } from '../hooks/useAuth';
import Server from '../utils/Server';
import catchError from '../utils/catchError';
import { ErrorType } from '../utils/Fetch';
import Page from '../components/Page';
import Text from '../components/Text';

interface DailyMission {
  id: string;
  type: string;
  target: number;
  progress: number;
  completed: boolean;
  completedAt?: string | null;
  claimed: boolean;
  claimedAt?: string | null;
  rewardType: string;
  rewardValue: number;
}

interface WeeklyMission {
  id: string;
  type: string;
  target: number;
  progress: number;
  completed: boolean;
  completedAt?: string | null;
  claimed: boolean;
  claimedAt?: string | null;
  rewardType: string;
  rewardValue: number;
}

interface GeneralMission {
  id: string;
  category: string;
  type: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  completedAt?: string | null;
  claimed: boolean;
  rewardType: string;
  rewardValue: number;
  order: number;
}

type MissionCategory = 'COMBAT' | 'PROGRESSION' | 'SOCIAL' | 'EVENTS' | 'SPECIAL' | 'ALL';

const MissionsView = () => {
  const Alert = useAlert();
  const { user, updateData } = useAuth();
  const [tab, setTab] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<MissionCategory>('ALL');
  const [dailyMissions, setDailyMissions] = useState<DailyMission[]>([]);
  const [weeklyMissions, setWeeklyMissions] = useState<WeeklyMission[]>([]);
  const [generalMissions, setGeneralMissions] = useState<GeneralMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedExpandedDaily, setCompletedExpandedDaily] = useState(false);
  const [completedExpandedWeekly, setCompletedExpandedWeekly] = useState(false);
  const [completedExpandedGeneral, setCompletedExpandedGeneral] = useState(false);

  const loadMissions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await Server.Missions.get() as {
        daily: DailyMission[];
        weekly: WeeklyMission[];
        general: GeneralMission[];
      };
      setDailyMissions(response.daily || []);
      setWeeklyMissions(response.weekly || []);
      setGeneralMissions(response.general || []);
    } catch (error) {
      catchError(Alert)(error as ErrorType | string);
      setDailyMissions([]);
      setWeeklyMissions([]);
      setGeneralMissions([]);
    } finally {
      setLoading(false);
    }
  }, [Alert]);

  useEffect(() => {
    loadMissions().catch(() => {
      // Error handled by loadMissions
    });
  }, [loadMissions]);

  const claimMission = useCallback(async (missionId: string) => {
    try {
      const response = await Server.Missions.claim(missionId) as {
        success: boolean;
        gold?: number;
        title?: string;
      };
      if (response.success) {
        if (response.gold) {
          Alert.open('success', `¡Recompensa reclamada! Has recibido ${response.gold} de oro.`);
          // Actualizar el oro del usuario
          if (user) {
            updateData({
              ...user,
              gold: (user.gold || 0) + (response.gold || 0),
            });
          }
        }
        if (response.title) {
          Alert.open('success', `¡Recompensa reclamada! Has desbloqueado el título: ${response.title}.`);
        }
        // Recargar misiones
        await loadMissions();
      }
    } catch (error) {
      catchError(Alert)(error as ErrorType | string);
    }
  }, [Alert, user, updateData, loadMissions]);

  const getCategoryName = (category: string): string => {
    const names: Record<string, string> = {
      COMBAT: 'Combate',
      PROGRESSION: 'Progresión',
      SOCIAL: 'Social',
      EVENTS: 'Eventos',
      SPECIAL: 'Especiales',
    };
    return names[category] || category;
  };

  const getCategoryColor = (category: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (category) {
      case 'COMBAT':
        return 'error';
      case 'PROGRESSION':
        return 'primary';
      case 'SOCIAL':
        return 'info';
      case 'EVENTS':
        return 'warning';
      case 'SPECIAL':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getObjectiveTypeName = (type: string): string => {
    const names: Record<string, string> = {
      WIN_FIGHTS: 'Ganar peleas',
      WIN_TOURNAMENT: 'Ganar un torneo',
      LEVEL_UP: 'Subir de nivel',
      COMPLETE_FIGHTS: 'Completar peleas',
      USE_SKILLS: 'Usar habilidades',
      GAIN_XP: 'Ganar XP',
      REACH_LEVEL: 'Llegar al nivel',
      COMPLETE_ACHIEVEMENTS: 'Completar logros',
    };
    return names[type] || type;
  };

  const filteredGeneralMissions = categoryFilter === 'ALL'
    ? generalMissions
    : generalMissions.filter((m) => m.category === categoryFilter);

  // Separar misiones activas y completadas
  // Para generales: completadas Y reclamadas van a completadas
  const activeGeneralMissions = filteredGeneralMissions.filter((m) => !m.completed || !m.claimed);
  const completedGeneralMissions = filteredGeneralMissions.filter((m) => m.completed && m.claimed);

  // Para diarias/semanales: completadas Y con claimed/claimedAt van a completadas
  const activeDailyMissions = dailyMissions.filter((m) => !m.completed || !m.claimed);
  const completedDailyMissions = dailyMissions.filter((m) => m.completed && m.claimed);

  const activeWeeklyMissions = weeklyMissions.filter((m) => !m.completed || !m.claimed);
  const completedWeeklyMissions = weeklyMissions.filter((m) => m.completed && m.claimed);

  const renderMission = (
    mission: DailyMission | WeeklyMission | GeneralMission,
    isGeneral: boolean,
  ) => {
    const progress = Math.min((mission.progress / mission.target) * 100, 100);
    const titleName = mission.rewardType !== 'GOLD' ? getRewardTitleName(mission.rewardValue) : null;
    const rewardText = mission.rewardType === 'GOLD'
      ? `${mission.rewardValue} de oro`
      : (titleName ?? `Título ${mission.rewardValue}`);

    // Para misiones diarias/semanales, verificar si claimed=true (indica que fue reclamado)
    const isDailyOrWeeklyClaimed = !isGeneral && 'claimed' in mission && mission.claimed;
    const isGeneralClaimed = isGeneral && 'claimed' in mission && mission.claimed;
    const isClaimed = isGeneral ? isGeneralClaimed : isDailyOrWeeklyClaimed;
    const showClaimButton = mission.completed && !isClaimed;

    return (
      <Paper
        key={mission.id}
        sx={{
          p: 2,
          mb: 2,
          bgcolor: 'background.paperLight',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            {isGeneral && 'title' in mission ? (
              <>
                <Typography variant="h6">{mission.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {mission.description}
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="h6">
                  {getObjectiveTypeName(mission.type)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Objetivo: {mission.target}
                </Typography>
              </>
            )}
          </Box>
          {isGeneral && 'category' in mission && (
            <Chip
              label={getCategoryName(mission.category)}
              color={getCategoryColor(mission.category)}
              size="small"
              sx={{ ml: 1 }}
            />
          )}
        </Box>
        <Box sx={{ mb: 1 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 8, borderRadius: 1 }}
          />
          <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
            {mission.progress} / {mission.target}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text bold color="secondary">
            Recompensa: {rewardText}
          </Text>
          {showClaimButton && (
            <IconButton
              color="success"
              onClick={() => claimMission(mission.id)}
              sx={{ ml: 1 }}
            >
              <CheckCircle />
            </IconButton>
          )}
          {isClaimed && (
            <Chip
              label="Reclamado"
              color="success"
              size="small"
              icon={<CheckCircle />}
            />
          )}
        </Box>
      </Paper>
    );
  };

  return (
    <Page title="Misiones">
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
            value={tab}
            onChange={(_, newValue) => setTab(newValue as number)}
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
            <Tab label="Diarias" />
            <Tab label="Semanales" />
            <Tab label="Generales" />
          </Tabs>
        </Paper>

        {tab === 0 && (
          <Box>
            {loading ? (
              <Text>Cargando misiones diarias...</Text>
            ) : activeDailyMissions.length === 0 && completedDailyMissions.length === 0 ? (
              <Text>No hay misiones diarias disponibles.</Text>
            ) : (
              <>
                {activeDailyMissions.map((mission) => renderMission(mission, false))}
                {completedDailyMissions.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        mb: 1,
                      }}
                      onClick={() => setCompletedExpandedDaily(!completedExpandedDaily)}
                    >
                      <Typography variant="h6" sx={{ flex: 1 }}>
                        Completadas ({completedDailyMissions.length})
                      </Typography>
                      <IconButton size="small">
                        {completedExpandedDaily ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>
                    <Collapse in={completedExpandedDaily}>
                      {completedDailyMissions.map((mission) => (
                        renderMission(mission, false)
                      ))}
                    </Collapse>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}

        {tab === 1 && (
          <Box>
            {loading ? (
              <Text>Cargando misiones semanales...</Text>
            ) : activeWeeklyMissions.length === 0 && completedWeeklyMissions.length === 0 ? (
              <Text>No hay misiones semanales disponibles.</Text>
            ) : (
              <>
                {activeWeeklyMissions.map((mission) => renderMission(mission, false))}
                {completedWeeklyMissions.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        mb: 1,
                      }}
                      onClick={() => setCompletedExpandedWeekly(!completedExpandedWeekly)}
                    >
                      <Typography variant="h6" sx={{ flex: 1 }}>
                        Completadas ({completedWeeklyMissions.length})
                      </Typography>
                      <IconButton size="small">
                        {completedExpandedWeekly ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>
                    <Collapse in={completedExpandedWeekly}>
                      {completedWeeklyMissions.map((mission) => (
                        renderMission(mission, false)
                      ))}
                    </Collapse>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}

        {tab === 2 && (
          <Box>
            <Paper
              sx={{
                p: 1.5,
                mb: 2,
                bgcolor: 'background.paperDark',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label="Todas"
                  onClick={() => setCategoryFilter('ALL')}
                  sx={{
                    bgcolor: categoryFilter === 'ALL' ? 'primary.main' : 'background.paperLight',
                    color: categoryFilter === 'ALL' ? 'primary.contrastText' : 'text.primary',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: categoryFilter === 'ALL' ? 'primary.main' : 'divider',
                    '&:hover': {
                      bgcolor: categoryFilter === 'ALL' ? 'primary.dark' : 'action.hover',
                      borderColor: categoryFilter === 'ALL' ? 'primary.dark' : 'text.secondary',
                    },
                  }}
                  clickable
                />
                <Chip
                  label="Combate"
                  onClick={() => setCategoryFilter('COMBAT')}
                  sx={{
                    bgcolor: categoryFilter === 'COMBAT' ? 'error.main' : 'background.paperLight',
                    color: categoryFilter === 'COMBAT' ? 'error.contrastText' : 'text.primary',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: categoryFilter === 'COMBAT' ? 'error.main' : 'divider',
                    '&:hover': {
                      bgcolor: categoryFilter === 'COMBAT' ? 'error.dark' : 'action.hover',
                      borderColor: categoryFilter === 'COMBAT' ? 'error.dark' : 'text.secondary',
                    },
                  }}
                  clickable
                />
                <Chip
                  label="Progresión"
                  onClick={() => setCategoryFilter('PROGRESSION')}
                  sx={{
                    bgcolor: categoryFilter === 'PROGRESSION' ? 'primary.main' : 'background.paperLight',
                    color: categoryFilter === 'PROGRESSION' ? 'primary.contrastText' : 'text.primary',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: categoryFilter === 'PROGRESSION' ? 'primary.main' : 'divider',
                    '&:hover': {
                      bgcolor: categoryFilter === 'PROGRESSION' ? 'primary.dark' : 'action.hover',
                      borderColor: categoryFilter === 'PROGRESSION' ? 'primary.dark' : 'text.secondary',
                    },
                  }}
                  clickable
                />
                <Chip
                  label="Social"
                  onClick={() => setCategoryFilter('SOCIAL')}
                  sx={{
                    bgcolor: categoryFilter === 'SOCIAL' ? 'info.main' : 'background.paperLight',
                    color: categoryFilter === 'SOCIAL' ? 'info.contrastText' : 'text.primary',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: categoryFilter === 'SOCIAL' ? 'info.main' : 'divider',
                    '&:hover': {
                      bgcolor: categoryFilter === 'SOCIAL' ? 'info.dark' : 'action.hover',
                      borderColor: categoryFilter === 'SOCIAL' ? 'info.dark' : 'text.secondary',
                    },
                  }}
                  clickable
                />
                <Chip
                  label="Eventos"
                  onClick={() => setCategoryFilter('EVENTS')}
                  sx={{
                    bgcolor: categoryFilter === 'EVENTS' ? 'warning.main' : 'background.paperLight',
                    color: categoryFilter === 'EVENTS' ? 'warning.contrastText' : 'text.primary',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: categoryFilter === 'EVENTS' ? 'warning.main' : 'divider',
                    '&:hover': {
                      bgcolor: categoryFilter === 'EVENTS' ? 'warning.dark' : 'action.hover',
                      borderColor: categoryFilter === 'EVENTS' ? 'warning.dark' : 'text.secondary',
                    },
                  }}
                  clickable
                />
                <Chip
                  label="Especiales"
                  onClick={() => setCategoryFilter('SPECIAL')}
                  sx={{
                    bgcolor: categoryFilter === 'SPECIAL' ? 'secondary.main' : 'background.paperLight',
                    color: categoryFilter === 'SPECIAL' ? 'secondary.contrastText' : 'text.primary',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: categoryFilter === 'SPECIAL' ? 'secondary.main' : 'divider',
                    '&:hover': {
                      bgcolor: categoryFilter === 'SPECIAL' ? 'secondary.dark' : 'action.hover',
                      borderColor: categoryFilter === 'SPECIAL' ? 'secondary.dark' : 'text.secondary',
                    },
                  }}
                  clickable
                />
              </Box>
            </Paper>
            {loading ? (
              <Text>Cargando misiones generales...</Text>
            ) : activeGeneralMissions.length === 0 && completedGeneralMissions.length === 0 ? (
              <Text>No hay misiones generales disponibles.</Text>
            ) : (
              <>
                {activeGeneralMissions.map((mission) => renderMission(mission, true))}
                {completedGeneralMissions.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        mb: 1,
                      }}
                      onClick={() => setCompletedExpandedGeneral(!completedExpandedGeneral)}
                    >
                      <Typography variant="h6" sx={{ flex: 1 }}>
                        Completadas ({completedGeneralMissions.length})
                      </Typography>
                      <IconButton size="small">
                        {completedExpandedGeneral ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>
                    <Collapse in={completedExpandedGeneral}>
                      {completedGeneralMissions.map((mission) => (
                        renderMission(mission, true)
                      ))}
                    </Collapse>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}
      </Box>
    </Page>
  );
};

export default MissionsView;
