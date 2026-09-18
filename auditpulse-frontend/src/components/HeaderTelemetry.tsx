'use client';

import * as stylex from '@stylexjs/stylex';
import { colors, typography } from '../styles/tokens.stylex';
import { useStreamStore } from '../lib/store';
import { ingestionManager } from '../lib/sse-client';
import { TargetEndpoint } from '../lib/types';
import { Activity, AlertTriangle, Cpu, Database, HardDrive, Layers, RefreshCw, Zap } from 'lucide-react';

const styles = stylex.create({
  header: {
    backgroundColor: colors.bgPanel,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: colors.borderDefault,
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '16px',
    paddingRight: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
  },
  leftGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  logoBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  pulseIcon: {
    color: colors.neonGreen,
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    fontFamily: typography.fontMono,
    fontWeight: 700,
    fontSize: '15px',
    letterSpacing: '0.06em',
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: typography.fontMono,
    fontSize: '10px',
    letterSpacing: '0.12em',
    color: colors.neonCyan,
    textTransform: 'uppercase',
  },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '10px',
    paddingRight: '10px',
    borderRadius: '9999px',
    fontSize: '11px',
    fontFamily: typography.fontMono,
    fontWeight: 600,
    letterSpacing: '0.05em',
  },
  statusOnline: {
    backgroundColor: colors.neonGreenBg,
    color: colors.neonGreen,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.neonGreenBorder,
  },
  statusDegraded: {
    backgroundColor: colors.neonAmberBg,
    color: colors.neonAmber,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.neonAmberBorder,
  },
  statusMock: {
    backgroundColor: colors.neonPurpleBg,
    color: colors.neonPurple,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.neonPurpleBorder,
  },
  statusConnecting: {
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    color: colors.textSecondary,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderDefault,
  },
  telemetryGrid: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  telemetryChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '8px',
    paddingRight: '8px',
    borderRadius: '4px',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderSubtle,
    fontSize: '11px',
    fontFamily: typography.fontMono,
  },
  chipLabel: {
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontSize: '10px',
  },
  chipValue: {
    color: colors.textPrimary,
    fontWeight: 600,
  },
  actionsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  select: {
    backgroundColor: colors.bgCard,
    color: colors.textPrimary,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderDefault,
    borderRadius: '4px',
    paddingTop: '5px',
    paddingBottom: '5px',
    paddingLeft: '10px',
    paddingRight: '10px',
    fontSize: '11px',
    fontFamily: typography.fontMono,
    cursor: 'pointer',
    outline: 'none',
  },
  injectGapBtn: {
    backgroundColor: colors.neonAmberBg,
    color: colors.neonAmber,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.neonAmberBorder,
    borderRadius: '4px',
    paddingTop: '5px',
    paddingBottom: '5px',
    paddingLeft: '10px',
    paddingRight: '10px',
    fontSize: '11px',
    fontFamily: typography.fontMono,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
});

export default function HeaderTelemetry() {
  const connectionStatus = useStreamStore((s) => s.connectionStatus);
  const targetEndpoint = useStreamStore((s) => s.targetEndpoint);
  const setTargetEndpoint = useStreamStore((s) => s.setTargetEndpoint);
  const metrics = useStreamStore((s) => s.metrics);
  const memoryEstimateMb = useStreamStore((s) => s.memoryEstimateMb);

  const getStatusStyle = () => {
    switch (connectionStatus) {
      case 'ONLINE':
        return styles.statusOnline;
      case 'DEGRADED':
        return styles.statusDegraded;
      case 'MOCK_ACTIVE':
        return styles.statusMock;
      default:
        return styles.statusConnecting;
    }
  };

  return (
    <header {...stylex.props(styles.header)}>
      <div {...stylex.props(styles.leftGroup)}>
        <div {...stylex.props(styles.logoBadge)}>
          <span {...stylex.props(styles.pulseIcon)}>
            <Activity size={20} />
          </span>
          <div>
            <div {...stylex.props(styles.title)}>AUDIT_PULSE</div>
            <div {...stylex.props(styles.subtitle)}>DDD Ingestion &amp; DLQ Inspector</div>
          </div>
        </div>

        <div {...stylex.props(styles.statusPill, getStatusStyle())}>
          <span style={{ fontSize: '8px' }}>●</span>
          <span>{connectionStatus}</span>
        </div>
      </div>

      <div {...stylex.props(styles.telemetryGrid)}>
        <div {...stylex.props(styles.telemetryChip)}>
          <Zap size={12} color="#00e5ff" />
          <span {...stylex.props(styles.chipLabel)}>Rate:</span>
          <span {...stylex.props(styles.chipValue)} style={{ color: '#00e5ff' }}>
            {metrics.eventsPerSecond.toLocaleString()} ev/s
          </span>
        </div>

        <div {...stylex.props(styles.telemetryChip)}>
          <Layers size={12} color="#00ff88" />
          <span {...stylex.props(styles.chipLabel)}>Total:</span>
          <span {...stylex.props(styles.chipValue)}>
            {metrics.totalProcessed.toLocaleString()}
          </span>
        </div>

        <div {...stylex.props(styles.telemetryChip)}>
          <AlertTriangle size={12} color="#ffb020" />
          <span {...stylex.props(styles.chipLabel)}>DLQ:</span>
          <span {...stylex.props(styles.chipValue)} style={{ color: '#ffb020' }}>
            {metrics.quarantinedCount}
          </span>
        </div>

        <div {...stylex.props(styles.telemetryChip)}>
          <Database size={12} color="#9ca3af" />
          <span {...stylex.props(styles.chipLabel)}>Seq:</span>
          <span {...stylex.props(styles.chipValue)}>
            {metrics.lastSequence ? metrics.lastSequence.toLocaleString() : '---'}
          </span>
        </div>

        <div {...stylex.props(styles.telemetryChip)}>
          <Cpu size={12} color="#b388ff" />
          <span {...stylex.props(styles.chipLabel)}>Latency:</span>
          <span {...stylex.props(styles.chipValue)}>
            {metrics.latencyMs}ms
          </span>
        </div>

        <div {...stylex.props(styles.telemetryChip)}>
          <HardDrive size={12} color="#9ca3af" />
          <span {...stylex.props(styles.chipLabel)}>Heap:</span>
          <span {...stylex.props(styles.chipValue)}>
            {memoryEstimateMb}MB
          </span>
        </div>
      </div>

      <div {...stylex.props(styles.actionsGroup)}>
        <select
          value={targetEndpoint}
          onChange={(e) => setTargetEndpoint(e.target.value as TargetEndpoint)}
          {...stylex.props(styles.select)}
        >
          <option value="MOCK_ENGINE">Browser Mock Engine</option>
          <option value="BACKEND_LOCAL">Localhost (Live JVM)</option>
          <option value="CLOUD_JVM">Cloud JVM API</option>
        </select>

        <button
          onClick={() => ingestionManager.triggerManualGap()}
          {...stylex.props(styles.injectGapBtn)}
          title="Inject intentional sequence gap into the stream"
        >
          <span>⚡</span> + Inject Gap
        </button>
      </div>
    </header>
  );
}
