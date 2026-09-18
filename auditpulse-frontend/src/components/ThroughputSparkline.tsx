'use client';

import * as stylex from '@stylexjs/stylex';
import { colors, typography } from '../styles/tokens.stylex';
import { useStreamStore } from '../lib/store';

const styles = stylex.create({
  container: {
    width: '100%',
    padding: '12px',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderSubtle,
    borderRadius: '6px',
    marginBottom: '12px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  title: {
    fontFamily: typography.fontMono,
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: colors.textSecondary,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '10px',
    fontFamily: typography.fontMono,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: colors.textMuted,
  },
  dotGreen: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: colors.neonCyan,
  },
  dotAmber: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: colors.neonAmber,
  },
  svgWrapper: {
    width: '100%',
    height: 70,
    overflow: 'hidden',
  },
});

export default function ThroughputSparkline() {
  const history = useStreamStore((state) => state.metricsHistory);

  const width = 360;
  const height = 70;
  const padding = 6;

  // Generate SVG path points
  const points = history.map((item, idx) => {
    const x = padding + (idx / Math.max(1, history.length - 1)) * (width - 2 * padding);
    const maxEps = Math.max(300, ...history.map((h) => h.eventsPerSecond));
    const y = height - padding - (item.eventsPerSecond / maxEps) * (height - 2 * padding);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = points.length > 1 ? `M ${points.join(' L ')}` : `M 0,${height / 2} L ${width},${height / 2}`;
  const areaD = points.length > 1
    ? `M ${points[0]} L ${points.join(' L ')} L ${width - padding},${height} L ${padding},${height} Z`
    : '';

  return (
    <div className="tabular-nums" {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.header)}>
        <span {...stylex.props(styles.title)}>
          <span style={{ color: '#00e5ff' }}>⚡</span> Telemetry Sparkline (60s)
        </span>
        <div className="tabular-nums" {...stylex.props(styles.legend)}>
          <span {...stylex.props(styles.legendItem)}>
            <span {...stylex.props(styles.dotGreen)} /> ev/s rate
          </span>
          <span {...stylex.props(styles.legendItem)}>
            <span {...stylex.props(styles.dotAmber)} /> DLQ spikes
          </span>
        </div>
      </div>

      <div {...stylex.props(styles.svgWrapper)}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', display: 'block' }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="cyberArea" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#182232" strokeDasharray="3 3" />
          <line x1="0" y1={height - padding} x2={width} y2={height - padding} stroke="#182232" />

          {/* Area fill */}
          {areaD && <path d={areaD} fill="url(#cyberArea)" />}

          {/* Sparkline curve */}
          <path
            d={pathD}
            fill="none"
            stroke="#00e5ff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />
        </svg>
      </div>
    </div>
  );
}
