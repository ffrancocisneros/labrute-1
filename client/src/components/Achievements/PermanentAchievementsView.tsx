import { getRewardTitleName } from '@labrute/core';
import { Box, Chip, Paper, Typography, LinearProgress } from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useAlert } from '../../hooks/useAlert';
import { useAuth } from '../../hooks/useAuth';
import Server from '../../utils/Server';
import catchError from '../../utils/catchError';
import { ErrorType } from '../../utils/Fetch';
import FantasyButton from '../FantasyButton';

interface PermanentAchievement {
  id: string;
  type: string;
  level: string;
  target: number;
  progress: number;
  completed: boolean;
  completedAt?: string | null;
  claimed: boolean;
  claimedAt?: string | null;
  rewardType: string;
  rewardValue: number;
}

const PermanentAchievementsViewComponent = () => {
  const Alert = useAlert();
  const { user, updateData } = useAuth();
  const [achievements, setAchievements] = useState<PermanentAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAchievements = useCallback(async () => {
    try {
      setLoading(true);
      const response = await Server.PermanentAchievements.get();

      // Handle both cases: { achievements: [] } and [] (fallback)
      if (Array.isArray(response)) {
        setAchievements(response);
      } else if (response && response.achievements) {
        setAchievements(response.achievements);
      } else {
        setAchievements([]);
      }
    } catch (error) {
      catchError(Alert)(error as ErrorType | string);
      setAchievements([]);
    } finally {
      setLoading(false);
    }
  }, [Alert]);

  useEffect(() => {
    loadAchievements().catch(() => {
      // Error handled by loadAchievements
    });
  }, [loadAchievements]);

  const getAchievementName = (type: string): string => {
    const names: Record<string, string> = {
      WIN_FIGHTS_TOTAL: 'Ganar peleas totales',
      WIN_FIGHTS_SINGLE_BRUTE: 'Ganar peleas con un bruto',
      WIN_TOURNAMENTS_TOTAL: 'Ganar torneos',
      WIN_TOURNAMENTS_CONSECUTIVE: 'Ganar torneos consecutivos',
      REACH_LEVEL: 'Llegar al nivel',
      REACH_LEVEL_MULTIPLE: 'Llegar al nivel con múltiples brutes',
      COMPLETE_FIGHTS_TOTAL: 'Completar peleas totales',
      COMPLETE_FIGHTS_SINGLE_BRUTE: 'Completar peleas con un bruto',
      GAIN_GOLD_TOTAL: 'Acumular oro',
      GAIN_GOLD_MONTHLY: 'Acumular oro mensual',
      ASCEND_TOTAL: 'Ascender',
      ASCEND_SINGLE_BRUTE: 'Ascender con un bruto',
      RESET_TOTAL: 'Resetear total',
      RESET_SINGLE_BRUTE: 'Resetear con un bruto',
      CLAN_WARS_WON: 'Ganar guerras de clan',
      CLAN_BOSS_CHALLENGES: 'Desafíos de jefe de clan',
      CLAN_POINTS_CONTRIBUTED: 'Contribuir puntos de clan',
      EVENTS_PARTICIPATED: 'Participar en Battle Royale',
      EVENTS_FINAL_REACHED: 'Llegar a la final de Battle Royale',
      EVENTS_WON: 'Ganar Battle Royale',
      AUTO_FIGHTS_COMPLETED: 'Completar peleas automáticas',
      DAMAGE_DEALT_TOTAL: 'Causar daño total',
      WIN_STREAK: 'Racha de victorias',
      TOP_RANKING: 'Top ranking',
      BRUTES_IN_TOP_100: 'Brutes en top 100',
      DAYS_PLAYED_CONSECUTIVE: 'Días consecutivos jugando',
    };
    return names[type] || type;
  };

  const getLevelColor = (level: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (level) {
      case 'BRONZE':
        return 'warning';
      case 'SILVER':
        return 'default';
      case 'GOLD':
        return 'warning';
      case 'PLATINUM':
        return 'info';
      default:
        return 'default';
    }
  };

  const getLevelLabel = (level: string): string => {
    switch (level) {
      case 'BRONZE':
        return 'Bronce';
      case 'SILVER':
        return 'Plata';
      case 'GOLD':
        return 'Oro';
      case 'PLATINUM':
        return 'Platino';
      default:
        return level;
    }
  };

  const claimReward = useCallback(async (achievementId: string) => {
    try {
      const response = await Server.PermanentAchievements.claim(achievementId);
      if (response.success) {
        if (response.gold) {
          Alert.open('success', `¡Recompensa reclamada! Has recibido ${response.gold} de oro.`);
          // Actualizar el oro del usuario
          if (user) {
            updateData({
              ...user,
              gold: (user.gold || 0) + response.gold,
            });
          }
        }
        if (response.title) {
          Alert.open('success', `¡Recompensa reclamada! Has desbloqueado el título: ${response.title}.`);
        }
        if (response.cosmetic) {
          Alert.open('success', `¡Recompensa reclamada! Has desbloqueado: ${response.cosmetic}.`);
        }
        // Recargar logros
        await loadAchievements();
      }
    } catch (error) {
      catchError(Alert)(error as ErrorType | string);
    }
  }, [Alert, user, updateData, loadAchievements]);

  const renderAchievement = (achievement: PermanentAchievement) => {
    const progress = Math.min((achievement.progress / achievement.target) * 100, 100);
    const rewardText = achievement.rewardType === 'GOLD'
      ? `${achievement.rewardValue} de oro`
      : achievement.rewardType === 'TITLE'
        ? (getRewardTitleName(achievement.rewardValue) ?? 'Título exclusivo')
        : 'Cosmético exclusivo';

    return (
      <Paper
        key={achievement.id}
        sx={{
          p: 2,
          mb: 2,
          bgcolor: achievement.completed && achievement.claimed
            ? 'success.light'
            : achievement.completed
              ? 'warning.light'
              : 'background.paperLight',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" component="h3">
              {getAchievementName(achievement.type)}
            </Typography>
            <Chip
              label={getLevelLabel(achievement.level)}
              color={getLevelColor(achievement.level)}
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {achievement.progress} / {achievement.target}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ mb: 1, height: 8, borderRadius: 1 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Recompensa: {rewardText}
            </Typography>
            {achievement.rewardType === 'GOLD' && (
              <Box
                component="img"
                src="/images/gold.png"
                sx={{ width: 16, height: 16, verticalAlign: 'middle' }}
                alt="oro"
              />
            )}
          </Box>
          {achievement.completed && !achievement.claimed && (
            <FantasyButton
              color="success"
              onClick={() => {
                claimReward(achievement.id).catch(() => {
                  // Error handled by claimReward
                });
              }}
            >
              Reclamar
            </FantasyButton>
          )}
          {achievement.completed && achievement.claimed && (
            <Typography variant="body2" color="success.main">
              ✓ Reclamado
            </Typography>
          )}
        </Box>
      </Paper>
    );
  };

  // Agrupar logros por tipo y mostrar solo el logro activo (el primero no completado o el siguiente nivel)
  const groupedAchievements = React.useMemo(() => {
    if (!achievements || achievements.length === 0) {
      return {};
    }

    // Primero agrupar por tipo
    const grouped = achievements.reduce((acc, achievement) => {
      const { type } = achievement;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(achievement);
      return acc;
    }, {} as Record<string, PermanentAchievement[]>);

    // Ordenar cada grupo por nivel (Bronce -> Plata -> Oro -> Platino)
    const levelOrder: Record<string, number> = {
      BRONZE: 1,
      SILVER: 2,
      GOLD: 3,
      PLATINUM: 4,
    };

    // Para cada tipo, encontrar el logro activo (el primero no completado o el siguiente nivel después del último completado)
    const activeAchievements: Record<string, PermanentAchievement> = {};

    Object.entries(grouped).forEach(([type, typeAchievements]) => {
      // Ordenar por nivel
      const sorted = [...typeAchievements].sort((a, b) => {
        const orderA = levelOrder[a.level] || 0;
        const orderB = levelOrder[b.level] || 0;
        return orderA - orderB;
      });

      if (sorted.length === 0) {
        return;
      }

      // Encontrar el primer logro no completado
      const firstIncomplete = sorted.find((a) => !a.completed);

      if (firstIncomplete) {
        activeAchievements[type] = firstIncomplete;
      } else {
        // Todos están completados, mostrar el último (más alto nivel)
        const lastAchievement = sorted[sorted.length - 1];
        if (lastAchievement) {
          activeAchievements[type] = lastAchievement;
        }
      }
    });

    return activeAchievements;
  }, [achievements]);

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Cargando logros...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" component="h2" gutterBottom>
        Logros Permanentes
      </Typography>
      {Object.keys(groupedAchievements).length === 0 ? (
        <Typography color="text.secondary">No hay logros disponibles.</Typography>
      ) : (
        Object.entries(groupedAchievements).map(([type, achievement]) => (
          <Box key={type} sx={{ mb: 3 }}>
            {renderAchievement(achievement)}
          </Box>
        ))
      )}
    </Box>
  );
};

export default PermanentAchievementsViewComponent;
