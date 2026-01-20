import { Box, Paper, Typography, LinearProgress } from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useAlert } from '../../hooks/useAlert';
import { useAuth } from '../../hooks/useAuth';
import Server from '../../utils/Server';
import catchError from '../../utils/catchError';
import { ErrorType } from '../../utils/Fetch';
import FantasyButton from '../FantasyButton';

interface Objective {
  id: string;
  type: string;
  target: number;
  progress: number;
  completed: boolean;
  completedAt?: string | null;
  rewardType: string;
  rewardValue: number;
}

const ObjectivesViewComponent = () => {
  const Alert = useAlert();
  const { user, updateData } = useAuth();
  const [dailyObjectives, setDailyObjectives] = useState<Objective[]>([]);
  const [weeklyObjectives, setWeeklyObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);

  const loadObjectives = useCallback(async () => {
    try {
      setLoading(true);
      const response = await Server.Objectives.get();
      setDailyObjectives(response.daily);
      setWeeklyObjectives(response.weekly);
    } catch (error) {
      catchError(Alert)(error as ErrorType | string);
    } finally {
      setLoading(false);
    }
  }, [Alert]);

  useEffect(() => {
    loadObjectives().catch(() => {
      // Error handled by loadObjectives
    });
  }, [loadObjectives]);

  const getObjectiveName = (type: string): string => {
    const names: Record<string, string> = {
      WIN_FIGHTS: 'Ganar peleas',
      WIN_TOURNAMENT: 'Ganar torneo',
      LEVEL_UP: 'Subir de nivel',
      COMPLETE_FIGHTS: 'Completar peleas',
      USE_SKILLS: 'Usar habilidades',
      GAIN_XP: 'Ganar XP',
      REACH_LEVEL: 'Llegar al nivel',
      COMPLETE_ACHIEVEMENTS: 'Completar logros',
    };
    return names[type] || type;
  };

  const claimDailyReward = useCallback(async (objectiveId: string) => {
    try {
      const response = await Server.Objectives.claimDaily(objectiveId);
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
        // Recargar objetivos
        await loadObjectives();
      }
    } catch (error) {
      catchError(Alert)(error as ErrorType | string);
    }
  }, [Alert, user, updateData, loadObjectives]);

  const claimWeeklyReward = useCallback(async (objectiveId: string) => {
    try {
      const response = await Server.Objectives.claimWeekly(objectiveId);
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
        // Recargar objetivos
        await loadObjectives();
      }
    } catch (error) {
      catchError(Alert)(error as ErrorType | string);
    }
  }, [Alert, user, updateData, loadObjectives]);

  const renderObjective = (objective: Objective, isDaily: boolean) => {
    const progress = Math.min((objective.progress / objective.target) * 100, 100);
    const rewardText = objective.rewardType === 'GOLD'
      ? `${objective.rewardValue} de oro`
      : 'Título exclusivo';

    return (
      <Paper
        key={objective.id}
        sx={{
          p: 2,
          mb: 2,
          bgcolor: objective.completed ? 'success.light' : 'background.paperLight',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" component="h3">
            {getObjectiveName(objective.type)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {objective.progress} / {objective.target}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ mb: 1, height: 8, borderRadius: 1 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Recompensa: {rewardText}
          </Typography>
          {objective.completed && !objective.completedAt && (
            <FantasyButton
              color="success"
              onClick={() => {
                if (isDaily) {
                  claimDailyReward(objective.id).catch(() => {
                    // Error handled by claimDailyReward
                  });
                } else {
                  claimWeeklyReward(objective.id).catch(() => {
                    // Error handled by claimWeeklyReward
                  });
                }
              }}
            >
              Reclamar
            </FantasyButton>
          )}
          {objective.completed && objective.completedAt && (
            <Typography variant="body2" color="success.main">
              ✓ Reclamado
            </Typography>
          )}
        </Box>
      </Paper>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Cargando misiones...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" component="h2" gutterBottom>
        Misiones Diarias
      </Typography>
      {dailyObjectives.length === 0 ? (
        <Typography color="text.secondary">No hay misiones diarias disponibles.</Typography>
      ) : (
        dailyObjectives.map((obj) => renderObjective(obj, true))
      )}

      <Typography variant="h4" component="h2" gutterBottom sx={{ mt: 4 }}>
        Misiones Semanales
      </Typography>
      {weeklyObjectives.length === 0 ? (
        <Typography color="text.secondary">No hay misiones semanales disponibles.</Typography>
      ) : (
        weeklyObjectives.map((obj) => renderObjective(obj, false))
      )}
    </Box>
  );
};

export default ObjectivesViewComponent;
