import React from 'react';
import Page from '../components/Page';
import PermanentAchievementsViewComponent from '../components/Achievements/PermanentAchievementsView';

const PermanentAchievementsView = () => (
  <Page
    title="Logros"
    description="Logros permanentes"
    headerUrl="/"
  >
    <PermanentAchievementsViewComponent />
  </Page>
);

export default PermanentAchievementsView;
