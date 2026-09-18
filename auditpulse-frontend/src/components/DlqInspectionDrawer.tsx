'use client';

import * as stylex from '@stylexjs/stylex';
import { colors, typography } from '../styles/tokens.stylex';
import { useStreamStore } from '../lib/store';
import ThroughputSparkline from './ThroughputSparkline';
import { AlertCircle, AlertOctagon, AlertTriangle, CheckCircle2, ChevronRight, ShieldAlert } from 'lucide-react';
import { DeadLetter } from '../lib/types';

const styles = stylex.create({
  drawer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: colors.bgPanel,
    borderLeftWidth: 1,
    borderLeftStyle: 'solid',
    borderLeftColor: colors.borderDefault,
    overflow: 'hidden',
  },
  upperSection: {
    padding: '12px',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: colors.borderDefault,
  },
  lowerSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sectionTitleBar: {
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '12px',
    paddingRight: '12px',
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: colors.borderSubtle,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: typography.fontMono,
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: colors.neonAmber,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  badgeCount: {
    backgroundColor: colors.neonAmberBg,
    color: colors.neonAmber,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.neonAmberBorder,
    borderRadius: '9999px',
    paddingLeft: '6px',
    paddingRight: '6px',
    fontSize: '10px',
    fontFamily: typography.fontMono,
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '110px 1fr 75px 80px 20px',
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '12px',
    paddingRight: '12px',
    backgroundColor: colors.bgRoot,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: colors.borderSubtle,
    fontFamily: typography.fontMono,
    fontSize: '10px',
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  listContainer: {
    flex: 1,
    overflowY: 'auto',
  },
  dlqRow: {
    display: 'grid',
    gridTemplateColumns: '110px 1fr 75px 80px 20px',
    alignItems: 'center',
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: colors.borderSubtle,
    fontFamily: typography.fontMono,
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  dlqRowHover: {
    ':hover': {
      backgroundColor: colors.bgHover,
    },
  },
  reasonBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '9.5px',
    fontWeight: 700,
    paddingTop: '1px',
    paddingBottom: '1px',
    paddingLeft: '5px',
    paddingRight: '5px',
    borderRadius: '3px',
    width: 'fit-content',
  },
  reasonGap: {
    backgroundColor: colors.neonAmberBg,
    color: colors.neonAmber,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.neonAmberBorder,
  },
  reasonSchema: {
    backgroundColor: colors.neonRedBg,
    color: colors.neonRed,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.neonRedBorder,
  },
  reasonPayload: {
    backgroundColor: colors.neonPurpleBg,
    color: colors.neonPurple,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.neonPurpleBorder,
  },
  seqInfo: {
    color: colors.textPrimary,
    fontSize: '10.5px',
  },
  seqDelta: {
    color: colors.neonAmber,
    fontWeight: 600,
    marginLeft: '4px',
  },
  pairText: {
    color: colors.textSecondary,
    fontSize: '10px',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '9.5px',
  },
  statusPending: {
    color: colors.neonAmber,
  },
  statusReconciled: {
    color: colors.neonGreen,
  },
  emptyNotice: {
    padding: '30px',
    textAlign: 'center',
    fontFamily: typography.fontMono,
    fontSize: '11px',
    color: colors.textMuted,
  },
});

export default function DlqInspectionDrawer() {
  const dlqItems = useStreamStore((s) => s.dlqItems);
  const setSelectedDlqItem = useStreamStore((s) => s.setSelectedDlqItem);

  const getReasonStyle = (reason: string) => {
    switch (reason) {
      case 'GAP_DETECTED':
        return styles.reasonGap;
      case 'SCHEMA_VIOLATION':
        return styles.reasonSchema;
      default:
        return styles.reasonPayload;
    }
  };

  const getPairString = (pair: string | { value: string }) => {
    return typeof pair === 'string' ? pair : pair?.value || '---';
  };

  return (
    <div {...stylex.props(styles.drawer)}>
      {/* Upper Sparkline Section */}
      <div {...stylex.props(styles.upperSection)}>
        <ThroughputSparkline />
      </div>

      {/* Lower Quarantined Trade List */}
      <div {...stylex.props(styles.lowerSection)}>
        <div {...stylex.props(styles.sectionTitleBar)}>
          <span {...stylex.props(styles.sectionTitle)}>
            <ShieldAlert size={14} /> Quarantined DLQ Queue
          </span>
          <span {...stylex.props(styles.badgeCount)}>{dlqItems.length} entries</span>
        </div>

        <div {...stylex.props(styles.tableHeader)}>
          <div>Anomaly Type</div>
          <div>Sequence Diff</div>
          <div>Pair</div>
          <div>Status</div>
          <div></div>
        </div>

        <div {...stylex.props(styles.listContainer)}>
          {dlqItems.length === 0 ? (
            <div {...stylex.props(styles.emptyNotice)}>
              <p>No sequence anomalies quarantined.</p>
              <p style={{ marginTop: '4px', fontSize: '10px', color: '#4b5563' }}>
                Monotonic invariant healthy. Click &quot;+ Inject Gap&quot; above to simulate a sequence drop.
              </p>
            </div>
          ) : (
            dlqItems.map((item) => {
              const delta =
                item.receivedSequence && item.expectedSequence
                  ? item.receivedSequence - item.expectedSequence
                  : null;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedDlqItem(item)}
                  {...stylex.props(styles.dlqRow, styles.dlqRowHover)}
                >
                  <div>
                    <span {...stylex.props(styles.reasonBadge, getReasonStyle(item.reason))}>
                      {item.reason === 'GAP_DETECTED' ? (
                        <AlertTriangle size={10} />
                      ) : (
                        <AlertOctagon size={10} />
                      )}
                      {item.reason}
                    </span>
                  </div>

                  <div {...stylex.props(styles.seqInfo)}>
                    {item.receivedSequence ? (
                      <>
                        <span>{item.receivedSequence.toLocaleString()}</span>
                        {delta !== null && (
                          <span {...stylex.props(styles.seqDelta)}>
                            (+{delta})
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ color: '#ef4444' }}>Schema Err</span>
                    )}
                  </div>

                  <div {...stylex.props(styles.pairText)}>{getPairString(item.productPair)}</div>

                  <div>
                    {item.reconciled ? (
                      <span {...stylex.props(styles.statusBadge, styles.statusReconciled)}>
                        <CheckCircle2 size={10} /> RECONCILED
                      </span>
                    ) : (
                      <span {...stylex.props(styles.statusBadge, styles.statusPending)}>
                        <AlertCircle size={10} /> QUARANTINED
                      </span>
                    )}
                  </div>

                  <div style={{ color: '#4b5563', display: 'flex', alignItems: 'center' }}>
                    <ChevronRight size={14} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
