import { bosses } from '@labrute/core';
import { Box, LinearProgress, Paper, Table, TableBody, TableCell, TableHead, TableRow, Tooltip } from '@mui/material';
import dayjs from 'dayjs';
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import Link from '../../components/Link';
import Page from '../../components/Page';
import Text from '../../components/Text';
import { useAlert } from '../../hooks/useAlert';
import Server from '../../utils/Server';
import catchError from '../../utils/catchError';

/** Forum data with typed indicators to avoid @labrute/core type resolution issues */
interface ForumData {
  masterId: string | null;
  threads: Array<{
    id: string;
    title: string;
    pinned: boolean;
    locked: boolean;
    postCount: number;
    updatedAt: string;
    creator: { id: string; name: string } | null;
    posts: Array<{ date: string; author: { id: string; name: string } | null }>;
  }>;
  recentMembers: Array<{
    id: string;
    name: string;
    user: { lastSeen: string | Date } | null;
  }>;
  bossProgress: {
    boss: string;
    damageOnBoss: number;
    bossMaxHp: number;
  } | null;
}

const ClanForumView = () => {
  const { t } = useTranslation();
  const { bruteName, id } = useParams();
  const Alert = useAlert();

  const [data, setData] = useState<ForumData | null>(null);

  // Fetch data
  useEffect(() => {
    if (!bruteName || !id) return;

    Server.Clan.getThreads({ brute: bruteName, id })
      .then((res) => setData(res as unknown as ForumData))
      .catch(catchError(Alert));
  }, [Alert, bruteName, id]);

  // Get boss info
  const bossInfo = useMemo(() => {
    if (!data?.bossProgress) return null;
    const { boss } = data.bossProgress;
    return bosses.find((b) => b.name === boss);
  }, [data]);

  // Calculate boss progress percentage
  const bossProgressPercent = useMemo(() => {
    if (!data?.bossProgress) return 0;
    const { damageOnBoss, bossMaxHp } = data.bossProgress;
    return Math.min(100, (damageOnBoss / bossMaxHp) * 100);
  }, [data]);

  return (
    <Page title={t('forum')} headerUrl={`/${bruteName || ''}/cell`}>
      <Paper sx={{ mx: 4 }}>
        <Text h3 bold upperCase typo="handwritten" sx={{ mr: 2 }}>{t('forum')}</Text>
      </Paper>
      <Paper sx={{ bgcolor: 'background.paperLight', mt: -2 }}>
        {bruteName && id && data && (
          <>
            <Box sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
            }}
            >
              <Link to={`/${bruteName}/cell`}>
                <Text bold smallCaps>{t('goBackToYourCell')}</Text>
              </Link>
              <Link to={`/${bruteName}/clan/ranking`}>
                <Text bold smallCaps>{t('ranking')}</Text>
              </Link>
              <Link to={`/${bruteName}/clan/${id}`}>
                <Text bold smallCaps>{t('myClan')}</Text>
              </Link>
              <Link to={`/${bruteName}/clan/${id}/post/0`}>
                <Text bold smallCaps>{t('startThread')}</Text>
              </Link>
            </Box>
            {/* INDICATORS */}
            <Box sx={{ mt: 2, mb: 2 }}>
              {/* Recent Members */}
              {data.recentMembers.length > 0 && (
                <Paper sx={{ p: 1.5, mb: 2, bgcolor: 'background.paperDark' }}>
                  <Text bold smallCaps sx={{ mb: 1 }}>
                    {t('recentMembers')} ({data.recentMembers.length})
                  </Text>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {data.recentMembers.map((member) => {
                      const lastSeen = member.user?.lastSeen;
                      const lastSeenText = lastSeen
                        ? dayjs.utc(lastSeen).fromNow()
                        : '';
                      return (
                        <Tooltip
                          key={member.id}
                          title={lastSeenText}
                        >
                          <Box
                            component="span"
                            sx={{
                              px: 1,
                              py: 0.5,
                              bgcolor: 'success.dark',
                              borderRadius: 1,
                              fontSize: '0.875rem',
                            }}
                          >
                            {member.name}
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>
                </Paper>
              )}
              {/* Boss Progress */}
              {data.bossProgress && bossInfo && (
                <Paper sx={{ p: 1.5, bgcolor: 'background.paperDark' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 1,
                    }}
                  >
                    <Text bold smallCaps>
                      {t('bossProgress')}: {data.bossProgress.boss}
                    </Text>
                    <Text variant="body2" color="text.secondary">
                      {data.bossProgress.damageOnBoss.toLocaleString()}
                      {' / '}
                      {data.bossProgress.bossMaxHp.toLocaleString()} HP
                    </Text>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={bossProgressPercent}
                    sx={{
                      height: 20,
                      borderRadius: 1,
                      bgcolor: 'background.default',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: bossProgressPercent >= 100 ? 'success.main' : 'warning.main',
                      },
                    }}
                  />
                  <Text variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {bossProgressPercent.toFixed(1)}% {t('complete')}
                  </Text>
                </Paper>
              )}
            </Box>
            {/* THREADS */}
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
                  <TableCell>{t('title')}</TableCell>
                  <TableCell>{t('creator')}</TableCell>
                  <TableCell>{t('msg')}</TableCell>
                  <TableCell align="right">{t('lastReply')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.threads.map((thread, i) => (
                  <Fragment key={thread.id}>
                    {/* Insert data row between threads with different dates */}
                    {(!data.threads[i - 1] || dayjs.utc(thread.updatedAt).format('DD/MM/YYYY') !== dayjs.utc(data.threads[i - 1]?.updatedAt).format('DD/MM/YYYY')) && (
                      <TableRow>
                        <TableCell component="th" colSpan={4} sx={{ textAlign: 'center' }}>
                          <Text bold>{dayjs.utc(thread.updatedAt).format('D MMMM YYYY')}</Text>
                        </TableCell>
                      </TableRow>
                    )}
                    {/* Thread row */}
                    <TableRow>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {thread.pinned && (
                            <Tooltip title={t('pinned')}>
                              <Box component="img" src="/images/clan/pinned.png" sx={{ width: 16 }} />
                            </Tooltip>
                          )}
                          {thread.locked && (
                            <Tooltip title={t('locked')}>
                              <Box component="img" src="/images/clan/lock.gif" sx={{ mr: 0.5, width: 11 }} />
                            </Tooltip>
                          )}
                          <Link to={`/${bruteName}/clan/${id}/thread/${thread.id}`}>
                            <Text bold>{thread.title.substring(0, 50)}{thread.title.length > 50 && '...'}</Text>
                          </Link>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {thread.creator?.id === data.masterId && (
                            <Tooltip title={t('clanMaster')}>
                              <Box component="img" src="/images/clan/master.gif" sx={{ mr: 0.5, width: 7 }} />
                            </Tooltip>
                          )}
                          <Text bold>{thread.creator?.name ?? t('deleted')}</Text>
                        </Box>
                      </TableCell>
                      <TableCell>{thread.postCount}</TableCell>
                      <TableCell align="right">{thread.posts[0]?.author?.name ?? t('deleted')}, {dayjs.utc(thread.updatedAt).format('HH:mm')}</TableCell>
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Paper>
    </Page>
  );
};

export default ClanForumView;
