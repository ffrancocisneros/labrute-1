import { GoldTransactionsListResponse } from '@labrute/core';
import { AccountBalance, Add, Remove } from '@mui/icons-material';
import { Box, Chip, Paper, Stack, Tab, Tabs } from '@mui/material';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FantasyButton from '../components/FantasyButton';
import Link from '../components/Link';
import Loader from '../components/Loader';
import Page from '../components/Page';
import Text from '../components/Text';
import { useAlert } from '../hooks/useAlert';
import { useAuth } from '../hooks/useAuth';
import Server from '../utils/Server';
import catchError from '../utils/catchError';

type FilterType = 'all' | 'income' | 'expense';

const BalanceView = () => {
  const { t } = useTranslation();
  const Alert = useAlert();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<GoldTransactionsListResponse['transactions']>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');

  const loadTransactions = useCallback(() => {
    if (!user) return;

    setLoading(true);
    Server.GoldTransactions.list({ page, limit: 20 }).then((response) => {
      if (page === 1) {
        setTransactions(response.transactions);
      } else {
        setTransactions((prev) => [...prev, ...response.transactions]);
      }
      setTotal(response.total);
    }).catch(catchError(Alert)).finally(() => {
      setLoading(false);
    });
  }, [Alert, page, user]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const filteredTransactions = transactions.filter((t) => {
    if (filter === 'income') return t.amount > 0;
    if (filter === 'expense') return t.amount < 0;
    return true;
  });

  const formatSource = (source: string, sourceData: string | null): string => {
    const sourceKey = `goldTransaction.${source}`;
    let translated = t(sourceKey);

    // Si la traducción es igual a la clave, usar el source directamente
    if (translated === sourceKey) {
      translated = source;
    }

    // Agregar detalles del sourceData si existe
    if (sourceData) {
      try {
        const data = JSON.parse(sourceData) as Record<string, unknown>;
        if (typeof data.itemName === 'string') {
          return `${translated} - ${data.itemName}`;
        }
        if (typeof data.bruteName === 'string') {
          return `${translated} - ${data.bruteName}`;
        }
        if (typeof data.skillName === 'string') {
          return `${translated} - ${t(data.skillName)}`;
        }
        if (typeof data.weaponName === 'string') {
          return `${translated} - ${t(data.weaponName)}`;
        }
        if (typeof data.fightsCount === 'number') {
          return `${translated} - ${data.fightsCount} peleas`;
        }
      } catch {
        // Ignorar errores de parse
      }
    }

    return translated;
  };

  return (
    <Page
      title={t('balance')}
      headerUrl="/"
    >
      <Paper sx={{ mx: 4 }}>
        <Text h3 bold upperCase typo="handwritten">{t('balance')}</Text>
      </Paper>
      <Paper sx={{ bgcolor: 'background.paperLight', mt: -2 }}>
        {user && (
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AccountBalance sx={{ fontSize: 40 }} />
              <Box>
                <Text h4>{t('yourGold')}</Text>
                <Text h3 bold>{user.gold}</Text>
              </Box>
            </Box>

            <Tabs
              value={filter}
              onChange={(_, value: FilterType) => {
                setFilter(value);
                setPage(1);
                setTransactions([]);
              }}
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label={t('all')} value="all" />
              <Tab label={t('income')} value="income" />
              <Tab label={t('expense')} value="expense" />
            </Tabs>

            {loading && transactions.length === 0 ? (
              <Loader />
            ) : (
              <Stack spacing={1}>
                {filteredTransactions.length === 0 ? (
                  <Text body2>{t('noTransactions')}</Text>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <Paper
                      key={transaction.id}
                      sx={{
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        bgcolor: transaction.amount > 0 ? 'success.light' : 'error.light',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {transaction.amount > 0 ? (
                          <Add sx={{ color: 'success.main' }} />
                        ) : (
                          <Remove sx={{ color: 'error.main' }} />
                        )}
                        <Box>
                          <Text bold body1>
                            {transaction.amount > 0 ? '+' : ''}{transaction.amount} {t('gold')}
                          </Text>
                          <Text body2>
                            {formatSource(transaction.source, transaction.sourceData)}
                          </Text>
                          <Text body2 sx={{ opacity: 0.7 }}>
                            {dayjs(transaction.createdAt).format('DD/MM/YYYY HH:mm')}
                          </Text>
                        </Box>
                      </Box>
                    </Paper>
                  ))
                )}
                {transactions.length < total && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                    <FantasyButton
                      color="success"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={loading}
                    >
                      {t('loadMore')}
                    </FantasyButton>
                  </Box>
                )}
              </Stack>
            )}
          </Stack>
        )}
      </Paper>
    </Page>
  );
};

export default BalanceView;
