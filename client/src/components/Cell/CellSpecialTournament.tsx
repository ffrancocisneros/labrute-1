import { Paper, PaperProps } from '@mui/material';
import dayjs from 'dayjs';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import FantasyButton from '../FantasyButton';
import Link from '../Link';
import Text from '../Text';
import useStateAsync from '../../hooks/useStateAsync';
import Server from '../../utils/Server';
import { ActiveSpecialRule } from '../../types/tournament';

export interface CellSpecialTournamentProps extends PaperProps {}

const CellSpecialTournament = ({ sx, ...rest }: CellSpecialTournamentProps) => {
  const { t } = useTranslation();
  const { bruteName } = useParams();

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

  if (!activeSpecialRule || !bruteName) return null;

  const todayStr = dayjs.utc().format('YYYY-MM-DD');

  return (
    <Paper
      sx={{
        bgcolor: 'background.paperAccent',
        textAlign: 'center',
        p: 1.5,
        mt: 2,
        ...sx,
      }}
      {...rest}
    >
      <Text bold h6 sx={{ mb: 0.5 }}>
        {activeSpecialRule.emoji} {t(activeSpecialRule.nameKey)}
      </Text>
      <Text variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {t(activeSpecialRule.descKey)}
      </Text>
      <Link to={`/${bruteName}/tournament/special/${todayStr}`}>
        <FantasyButton color="secondary" sx={{ my: 0 }}>
          {t('specialTournament.viewBracket')}
        </FantasyButton>
      </Link>
    </Paper>
  );
};

export default CellSpecialTournament;
