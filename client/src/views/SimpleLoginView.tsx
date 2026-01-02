import { getCalculatedBrute, TOKEN_COOKIE, USER_COOKIE } from '@labrute/core';
import { Box, Paper, TextField, Typography } from '@mui/material';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import FantasyButton from '../components/FantasyButton';
import Page from '../components/Page';
import { LoggedInUser, useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import catchError from '../utils/catchError';
import { setCookie } from '../utils/cookies';
import Server from '../utils/Server';
import { useAlert } from '../hooks/useAlert';

/**
 * Simple login view for private deployments.
 * Uses username + shared secret instead of Eternal-Twin OAuth.
 */
const SimpleLoginView = () => {
  const { t } = useTranslation();
  const Alert = useAlert();
  const navigate = useNavigate();
  const { updateData, setAuthing } = useAuth();
  const { setLanguage } = useLanguage();

  const [username, setUsername] = useState('');
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    if (!username.trim()) {
      Alert.open('error', t('usernameRequired') || 'Username is required');
      return;
    }
    if (!secret.trim()) {
      Alert.open('error', t('secretRequired') || 'Secret is required');
      return;
    }

    setLoading(true);
    setAuthing(true);

    try {
      const response = await Server.Auth.simpleLogin(username.trim(), secret.trim());

      if (!response.user) {
        throw new Error('No user returned from login');
      }

      // Update language
      setLanguage(response.user.lang);

      const loggedInUser: LoggedInUser = {
        ...response.user,
        brutes: response.user.brutes.map((brute) => getCalculatedBrute(brute, response.modifiers)),
      };

      updateData(loggedInUser);

      // Save user data in cookies
      setCookie(USER_COOKIE, response.user.id, 7);
      setCookie(TOKEN_COOKIE, response.user.connexionToken, 7);

      Alert.open('success', t('loginSuccess'));

      // Redirect to first brute if exists, otherwise home
      if (loggedInUser.brutes.length) {
        navigate(`/${loggedInUser.brutes[0]?.name}/cell`);
      } else {
        navigate('/');
      }
    } catch (error) {
      catchError(Alert)(error);
    } finally {
      setLoading(false);
      setAuthing(false);
    }
  }, [username, secret, Alert, t, setAuthing, setLanguage, updateData, navigate]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void handleLogin();
    }
  }, [handleLogin]);

  return (
    <Page title={t('login')} headerUrl="/">
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            maxWidth: 400,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            {t('login')}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('privateServerLogin') || 'Login to private server'}
          </Typography>

          <TextField
            fullWidth
            label={t('username') || 'Username'}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            sx={{ mb: 2 }}
            autoFocus
          />

          <TextField
            fullWidth
            label={t('secret') || 'Secret'}
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            sx={{ mb: 3 }}
          />

          <FantasyButton
            color="success"
            onClick={handleLogin}
            disabled={loading}
            sx={{ width: '100%' }}
          >
            {loading ? t('loading') || 'Loading...' : t('connect')}
          </FantasyButton>
        </Paper>
      </Box>
    </Page>
  );
};

export default SimpleLoginView;
