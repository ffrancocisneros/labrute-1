import { Fighter, getGameDay, isWinner, TournamentsGetCopaDelReyResponse } from '@labrute/core';
import { Gender } from '@labrute/prisma';
import { Close } from '@mui/icons-material';
import { Box, Grid, Paper, useTheme } from '@mui/material';
import dayjs from 'dayjs';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import BruteRender from '../components/Brute/Body/BruteRender';
import BruteTooltip from '../components/Brute/BruteTooltip';
import Link from '../components/Link';
import Page from '../components/Page';
import StyledButton, { StyledButtonHeight, StyledButtonWidth } from '../components/StyledButton';
import Text from '../components/Text';
import useStateAsync from '../hooks/useStateAsync';
import Server from '../utils/Server';

type CopaTournament = NonNullable<TournamentsGetCopaDelReyResponse['semifinal'] | TournamentsGetCopaDelReyResponse['final']>;

const fighterToBrute = (fighter: Fighter) => ({
  id: fighter.id,
  gender: fighter.gender || Gender.male,
  name: fighter.name,
  hp: fighter.maxHp,
  level: fighter.level,
  strengthValue: fighter.strength,
  agilityValue: fighter.agility,
  speedValue: fighter.speed,
  body: fighter.body || '0'.repeat(11),
  colors: fighter.colors || '0'.repeat(32),
});

const CopaDelReyView = () => {
  const { t } = useTranslation();
  const { bruteName, type, date } = useParams();
  const navigate = useNavigate();
  const { palette: { mode } } = useTheme();

  const dateStr = date || getGameDay().format('YYYY-MM-DD');
  const { data } = useStateAsync(null, Server.Tournament.getCopaDelRey, dateStr);

  const tournament: CopaTournament | null = type === 'semifinal' ? (data?.semifinal ?? null) : (data?.final ?? null);

  const rounds = React.useMemo(() => {
    if (!tournament?.fights?.length) return [];
    const byStep = new Map<number, typeof tournament.fights>();
    for (const fight of tournament.fights) {
      const step = fight.tournamentStep;
      if (!byStep.has(step)) byStep.set(step, []);
      byStep.get(step)!.push(fight);
    }
    return Array.from(byStep.entries())
      .sort(([a], [b]) => a - b)
      .map(([step, fights]) => ({
        step,
        fights: fights.sort((a, b) => a.tournamentStep - b.tournamentStep),
      }));
  }, [tournament]);

  const title = type === 'semifinal'
    ? t('copaDelReySemifinal')
    : t('copaDelReyFinal');

  if (!date || !dayjs.utc(date, 'YYYY-MM-DD').isValid()) {
    return (
      <Page title={t('copaDelRey')} headerUrl={`/${bruteName || ''}/cell`}>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Text>{t('invalidParameters')}</Text>
        </Paper>
      </Page>
    );
  }

  if (!tournament) {
    return (
      <Page title={title} headerUrl={`/${bruteName || ''}/cell`}>
        <Paper sx={{ mx: 4 }}>
          <Text h3 bold upperCase typo="handwritten">{title} - {dayjs.utc(date).format('DD/MM/YYYY')}</Text>
        </Paper>
        <Paper sx={{ p: 2, mt: 2, textAlign: 'center' }}>
          <Text>{t('copaDelReyNotFound')}</Text>
          <Link to={`/${bruteName || ''}/tournaments`} sx={{ display: 'block', mt: 1 }}>
            {t('backToTournaments')}
          </Link>
        </Paper>
      </Page>
    );
  }

  return (
    <Page
      title={`${title} - ${dayjs.utc(date).format('DD/MM/YYYY')}`}
      description={t('copaDelRey.desc', { date: dayjs.utc(date).format('DD/MM/YYYY') })}
      headerUrl={`/${bruteName || ''}/cell`}
    >
      <Paper sx={{ mx: 4 }}>
        <Text h3 bold upperCase typo="handwritten">{title} - {dayjs.utc(date).format('DD/MM/YYYY')}</Text>
      </Paper>
      <Paper sx={{ bgcolor: 'background.paperLight', mt: -2 }}>
        <Grid container spacing={1}>
          <Grid item xs={12} md={3} />
          <Grid item xs={12} md={6} sx={{ p: 2 }}>
            {rounds.map(({ step, fights: roundFights }, roundIndex) => (
              // eslint-disable-next-line react/no-array-index-key
              <Box key={step} sx={{ mb: 2 }}>
                <Text bold sx={{ mb: 1 }}>{t('round', { value: roundIndex + 1 })}</Text>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                  {roundFights.map((fight) => {
                    const fighters = JSON.parse(fight.fighters) as Fighter[];
                    const brute1 = fighters.find((f) => !f.master && f.type === 'brute' && f.team === 'L');
                    const brute2 = fighters.find((f) => !f.master && f.type === 'brute' && f.team === 'R');
                    return (
                      <StyledButton
                        key={fight.id}
                        onClick={() => navigate(`/${bruteName || brute1?.name || 'unknown'}/fight/${fight.id}`)}
                        sx={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          width: StyledButtonWidth,
                          height: StyledButtonHeight,
                          m: 0.5,
                          overflow: 'hidden',
                          backgroundSize: 'contain',
                          position: 'relative',
                        }}
                      >
                        <BruteTooltip fighter={brute1}>
                          <Box sx={{ position: 'relative', height: 1, width: 50, mr: 1 }}>
                            {brute1 && (
                              <BruteRender
                                brute={fighterToBrute(brute1)}
                                sx={{ position: 'absolute', bottom: -8, left: -8 }}
                              />
                            )}
                            {brute2 && isWinner(brute2, fight) && (
                              <Close color="error" sx={{ position: 'absolute', top: 5, left: 0, width: 1, height: 1, zIndex: 3 }} />
                            )}
                          </Box>
                        </BruteTooltip>
                        <Box
                          component="img"
                          src={`/images${mode === 'dark' ? '/dark' : ''}/tournament/vs.webp`}
                          sx={{ width: 45 }}
                        />
                        {brute2 && (
                          <BruteTooltip fighter={brute2}>
                            <Box sx={{ position: 'relative', height: 1, width: 50, ml: 1 }}>
                              <BruteRender
                                brute={fighterToBrute(brute2)}
                                looking="left"
                                sx={{ position: 'absolute', bottom: -8, right: -8 }}
                              />
                              {brute1 && isWinner(brute1, fight) && (
                                <Close color="error" sx={{ position: 'absolute', top: 5, left: 0, width: 1, height: 1 }} />
                              )}
                            </Box>
                          </BruteTooltip>
                        )}
                      </StyledButton>
                    );
                  })}
                </Box>
              </Box>
            ))}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Link to={`/${bruteName || ''}/tournaments`}>{t('backToTournaments')}</Link>
            </Box>
          </Grid>
          <Grid item xs={12} md={3} />
        </Grid>
      </Paper>
    </Page>
  );
};

export default CopaDelReyView;
