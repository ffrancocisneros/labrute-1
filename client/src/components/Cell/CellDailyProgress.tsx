import { BATTLE_PASS_LEVELS, BATTLE_PASS_XP_PER_LEVEL, getMaxFightsPerDay, getTotalFightsLeft } from '@labrute/core';
import { SportsKabaddi, Assignment, CardGiftcard } from '@mui/icons-material';
import { Box, LinearProgress, Paper, Tooltip } from '@mui/material';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import Link from '../Link';
import Text from '../Text';
import { useBrute } from '../../hooks/useBrute';
import useStateAsync from '../../hooks/useStateAsync';
import Server from '../../utils/Server';

interface ObjectivesData {
  daily: Array<{ completed: boolean }>;
  weekly: Array<{ completed: boolean }>;
}

interface BattlePassData {
  currentLevel: number;
  currentXp: number;
  xpForNextLevel: number;
}

const CellDailyProgress = () => {
  const { t } = useTranslation();
  const { bruteName } = useParams();
  const { brute, owner } = useBrute();

  const fetchObjectives = useCallback(
    async (ownerParam?: boolean): Promise<ObjectivesData | null> => {
      if (!ownerParam) return null;
      try {
        const r = await Server.Objectives.get();
        return { daily: r.daily, weekly: r.weekly };
      } catch {
        return null;
      }
    },
    [],
  );
  const { data: objectives } = useStateAsync<ObjectivesData | null, boolean | undefined>(
    null,
    fetchObjectives,
    owner ?? false,
  );

  const fetchBattlePass = useCallback(
    async (ownerParam?: boolean): Promise<BattlePassData | null> => {
      if (!ownerParam) return null;
      try {
        const r = await Server.BattlePass.get();
        if (!r?.userProgress) return null;
        const { totalXp } = r.userProgress;
        const currentLevel = Math.min(
          BATTLE_PASS_LEVELS,
          Math.floor(totalXp / BATTLE_PASS_XP_PER_LEVEL),
        );
        const xpInLevel = totalXp - currentLevel * BATTLE_PASS_XP_PER_LEVEL;
        return {
          currentLevel,
          currentXp: xpInLevel,
          xpForNextLevel: BATTLE_PASS_XP_PER_LEVEL,
        };
      } catch {
        return null;
      }
    },
    [],
  );
  const { data: battlePass } = useStateAsync<BattlePassData | null, boolean | undefined>(
    null,
    fetchBattlePass,
    owner ?? false,
  );

  if (!owner || !brute || !bruteName) return null;
  if (brute.eventId) return null;

  const fightsLeft = getTotalFightsLeft(brute);
  const maxFights = getMaxFightsPerDay(brute);
  const fightsUsed = Math.max(0, maxFights - fightsLeft);

  const dailyCompleted = objectives?.daily.filter((o) => o.completed).length ?? 0;
  const dailyTotal = objectives?.daily.length ?? 0;
  const weeklyCompleted = objectives?.weekly.filter((o) => o.completed).length ?? 0;
  const weeklyTotal = objectives?.weekly.length ?? 0;

  const bpPercent = battlePass
    ? (battlePass.currentXp / battlePass.xpForNextLevel) * 100
    : 0;

  return (
    <Paper
      sx={{
        p: 1.5,
        mb: 1.5,
        bgcolor: 'background.paperDark',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Text bold variant="body2" sx={{ mb: 1 }}>
        {t('dailyProgress.title')}
      </Text>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* Peleas */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SportsKabaddi sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Text variant="body2">
            {t('dailyProgress.fights', {
              used: fightsUsed,
              max: maxFights,
            })}
          </Text>
        </Box>
        {/* Objetivos */}
        {(dailyTotal > 0 || weeklyTotal > 0) && (
          <Tooltip title={t('dailyProgress.objectivesTooltip')}>
            <Link
              to={`/${bruteName}/missions`}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <Assignment sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Text variant="body2">
                {t('dailyProgress.objectives', {
                  daily: `${dailyCompleted}/${dailyTotal}`,
                  weekly: `${weeklyCompleted}/${weeklyTotal}`,
                })}
              </Text>
            </Link>
          </Tooltip>
        )}
        {/* Pase de batalla */}
        {battlePass && (
          <Tooltip title={t('dailyProgress.battlePassTooltip')}>
            <Link
              to="/pase"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CardGiftcard sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Text variant="body2">
                  {t('dailyProgress.battlePass', {
                    level: battlePass.currentLevel,
                    max: 40,
                  })}
                </Text>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, bpPercent)}
                sx={{
                  height: 6,
                  borderRadius: 1,
                  bgcolor: 'background.default',
                }}
              />
            </Link>
          </Tooltip>
        )}
      </Box>
    </Paper>
  );
};

export default CellDailyProgress;
