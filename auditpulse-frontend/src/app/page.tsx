'use client';

import * as stylex from '@stylexjs/stylex';
import { colors } from '../styles/tokens.stylex';
import HeaderTelemetry from '../components/HeaderTelemetry';
import FilterBar from '../components/FilterBar';
import TradeStreamTable from '../components/TradeStreamTable';
import DlqInspectionDrawer from '../components/DlqInspectionDrawer';
import JsonDiffModal from '../components/JsonDiffModal';
import { useEffect } from 'react';
import { ingestionManager } from '../lib/sse-client';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: colors.bgRoot,
    overflow: 'hidden',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '60% 40%',
    flex: 1,
    overflow: 'hidden',
  },
  leftPane: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  rightPane: {
    height: '100%',
    overflow: 'hidden',
  },
});

export default function Home() {
  useEffect(() => {
    ingestionManager.init();
    return () => {
      ingestionManager.cleanup();
    };
  }, []);

  return (
    <main {...stylex.props(styles.container)}>
      <HeaderTelemetry />
      <FilterBar />

      <div {...stylex.props(styles.contentGrid)}>
        <section {...stylex.props(styles.leftPane)}>
          <TradeStreamTable />
        </section>

        <section {...stylex.props(styles.rightPane)}>
          <DlqInspectionDrawer />
        </section>
      </div>

      <JsonDiffModal />
    </main>
  );
}
