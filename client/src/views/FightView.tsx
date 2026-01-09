import { FightGetResponse } from '@labrute/core';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import FightComponent from '../components/Arena/FightComponent';
import BoxBg from '../components/BoxBg';
import Page from '../components/Page';
import { useAlert } from '../hooks/useAlert';
import { useLanguage } from '../hooks/useLanguage';
import { getRandomAd } from '../utils/ads';
import catchError from '../utils/catchError';
import Server from '../utils/Server';
import FightMobileView from './mobile/FightMobileView';

const FightView = () => {
  const { t } = useTranslation();
  const { bruteName, fightId } = useParams();
  const Alert = useAlert();
  const navigate = useNavigate();
  const smallScreen = useMediaQuery('(max-width: 935px)');
  const { language } = useLanguage();
  const { palette: { mode } } = useTheme();

  // Fight data
  const [fight, setFight] = useState<FightGetResponse | null>(null);

  // Fetch fight and brutes
  useEffect(() => {
    let isSubscribed = true;
    const cleanup = () => { isSubscribed = false; };

    if (!fightId) {
      navigate('/');
      return cleanup;
    }

    Server.Fight.get(fightId).then((result) => {
      if (isSubscribed) {
        setFight(result);
      }
    }).catch(catchError(Alert));

    return cleanup;
  }, [Alert, fightId, navigate]);

  // Randomized adverts (must be different)
  const ads = useMemo(() => {
    const firstAd = getRandomAd(language);
    const secondAd = getRandomAd(language, firstAd.name);
    return [firstAd, secondAd];
  }, [language]);

  if (smallScreen) {
    return (
      <FightMobileView
        pageTitle={bruteName ? `${bruteName} ${t('fight')}` : t('fight')}
        headerUrl={bruteName ? `/${bruteName}/cell` : '/'}
        ads={ads}
        fight={fight}
      />
    );
  }

  return fightId ? (
    <Page title={bruteName ? `${bruteName} ${t('fight')}` : t('fight')} headerUrl={bruteName ? `/${bruteName}/cell` : '/'}>
      <BoxBg
        src={`/images${mode === 'dark' ? '/dark' : ''}/fight/background.webp`}
        sx={{
          width: 930,
          height: 460,
        }}
      >
        <Box display="flex">
          {/* CUSTOM IMAGES */}
          <Box sx={{ width: 236, mt: 5, overflow: 'hidden' }}>
            {ads.map((ad) => (
                  <Box
                key={ad.name}
                    component="img"
                    src={`/images/redirects/${ad.illustration}`}
                sx={{ width: 160, height: 160, objectFit: 'cover', border: 2, borderColor: 'common.white', ml: 4, mb: 1 }}
                  />
            ))}
          </Box>
          {/* FIGHT */}
          <Box sx={{ ml: 5, alignSelf: 'center' }}>
            <FightComponent fight={fight} />
          </Box>
        </Box>
      </BoxBg>
    </Page>
  ) : null;
};

export default FightView;
