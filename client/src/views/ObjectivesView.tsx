import React from 'react';
import Page from '../components/Page';
import ObjectivesViewComponent from '../components/Objectives/ObjectivesView';

const ObjectivesView = () => (
  <Page
    title="Misiones"
    description="Misiones diarias y semanales"
    headerUrl="/"
  >
    <ObjectivesViewComponent />
  </Page>
);

export default ObjectivesView;
