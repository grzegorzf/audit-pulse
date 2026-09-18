'use client';

import * as stylex from '@stylexjs/stylex';
import { colors, typography } from '../styles/tokens.stylex';
import { useStreamStore } from '../lib/store';
import { ingestionManager } from '../lib/sse-client';
import { AlertTriangle, CheckCircle2, Copy, FileCode, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';

const styles = stylex.create({
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(3, 5, 8, 0.85)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    width: '100%',
    maxWidth: '680px',
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderDefault,
    borderRadius: '8px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 229, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: colors.borderDefault,
  },
  headerTitle: {
    fontFamily: typography.fontMono,
    fontSize: '13px',
    fontWeight: 700,
    color: colors.textPrimary,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  closeBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: colors.textMuted,
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxHeight: 'calc(80vh - 120px)',
    overflowY: 'auto',
  },
  diffGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  diffCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderSubtle,
    borderRadius: '6px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  diffCardExpected: {
    borderLeftWidth: 3,
    borderLeftStyle: 'solid',
    borderLeftColor: colors.neonCyan,
  },
  diffCardReceived: {
    borderLeftWidth: 3,
    borderLeftStyle: 'solid',
    borderLeftColor: colors.neonAmber,
  },
  diffLabel: {
    fontFamily: typography.fontMono,
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  diffValue: {
    fontFamily: typography.fontMono,
    fontSize: '18px',
    fontWeight: 700,
    color: colors.textPrimary,
  },
  diffDelta: {
    fontFamily: typography.fontMono,
    fontSize: '11px',
    color: colors.neonAmber,
  },
  metaBanner: {
    backgroundColor: colors.neonAmberBg,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.neonAmberBorder,
    borderRadius: '6px',
    padding: '10px 14px',
    fontFamily: typography.fontMono,
    fontSize: '11px',
    color: colors.neonAmber,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  codeSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  codeSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontFamily: typography.fontMono,
    fontSize: '11px',
    color: colors.textSecondary,
  },
  codeBlock: {
    margin: 0,
    padding: '12px',
    backgroundColor: colors.bgRoot,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderSubtle,
    borderRadius: '6px',
    fontFamily: typography.fontMono,
    fontSize: '11px',
    color: '#a7f3d0',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.5,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '12px 18px',
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: colors.borderDefault,
  },
  secondaryBtn: {
    backgroundColor: colors.bgCard,
    color: colors.textSecondary,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderDefault,
    borderRadius: '4px',
    padding: '6px 14px',
    fontFamily: typography.fontMono,
    fontSize: '11px',
    cursor: 'pointer',
  },
  reconcileBtn: {
    backgroundColor: colors.neonGreenBg,
    color: colors.neonGreen,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.neonGreenBorder,
    borderRadius: '4px',
    padding: '6px 14px',
    fontFamily: typography.fontMono,
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  reconcileBtnDone: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    color: colors.neonCyan,
    borderColor: colors.neonCyanBorder,
  },
});

export default function JsonDiffModal() {
  const selectedDlqItem = useStreamStore((s) => s.selectedDlqItem);
  const setSelectedDlqItem = useStreamStore((s) => s.setSelectedDlqItem);
  const reconcileDeadLetter = useStreamStore((s) => s.reconcileDeadLetter);
  const [copied, setCopied] = useState(false);

  if (!selectedDlqItem) return null;

  const delta =
    selectedDlqItem.receivedSequence && selectedDlqItem.expectedSequence
      ? selectedDlqItem.receivedSequence - selectedDlqItem.expectedSequence
      : 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedDlqItem.rawPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReconcile = () => {
    ingestionManager.reconcileRemote(selectedDlqItem.id);
  };

  return (
    <div {...stylex.props(styles.overlay)} onClick={() => setSelectedDlqItem(null)}>
      <div {...stylex.props(styles.modal)} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.headerTitle)}>
            <AlertTriangle size={16} color="#ffb020" />
            <span>DLQ ANOMALY INSPECTOR // ID: {selectedDlqItem.id}</span>
          </div>
          <button
            onClick={() => setSelectedDlqItem(null)}
            {...stylex.props(styles.closeBtn)}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div {...stylex.props(styles.body)}>
          {/* Side-by-side sequence comparison */}
          <div {...stylex.props(styles.diffGrid)}>
            <div {...stylex.props(styles.diffCard, styles.diffCardExpected)}>
              <span {...stylex.props(styles.diffLabel)}>Expected Monotonic Sequence</span>
              <span {...stylex.props(styles.diffValue)}>
                {selectedDlqItem.expectedSequence
                  ? selectedDlqItem.expectedSequence.toLocaleString()
                  : 'N/A'}
              </span>
              <span style={{ fontSize: '10px', color: '#6b7280' }}>
                Invariant: nextExpected == seq + 1
              </span>
            </div>

            <div {...stylex.props(styles.diffCard, styles.diffCardReceived)}>
              <span {...stylex.props(styles.diffLabel)}>Received Frame Sequence</span>
              <span {...stylex.props(styles.diffValue)}>
                {selectedDlqItem.receivedSequence
                  ? selectedDlqItem.receivedSequence.toLocaleString()
                  : 'Schema Violation'}
              </span>
              {delta > 0 && (
                <span {...stylex.props(styles.diffDelta)}>
                  Sequence Gap Delta: +{delta} dropped
                </span>
              )}
            </div>
          </div>

          {/* Root cause message */}
          <div {...stylex.props(styles.metaBanner)}>
            <span>ℹ️</span>
            <span>
              Root Cause: <strong>{selectedDlqItem.reason}</strong>. Sequence gap detected by DDD Aggregate `SequenceTracker`. The frame was quarantined to prevent corrupting monotonic order.
            </span>
          </div>

          {/* Raw Payload Block */}
          <div {...stylex.props(styles.codeSection)}>
            <div {...stylex.props(styles.codeSectionHeader)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FileCode size={13} /> Raw Captured WebSocket Payload
              </span>
              <button
                onClick={handleCopy}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Copy size={11} /> {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <pre {...stylex.props(styles.codeBlock)}>
              {selectedDlqItem.rawPayload}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div {...stylex.props(styles.footer)}>
          <button
            onClick={() => setSelectedDlqItem(null)}
            {...stylex.props(styles.secondaryBtn)}
          >
            Close
          </button>

          {selectedDlqItem.reconciled ? (
            <button
              disabled
              {...stylex.props(styles.reconcileBtn, styles.reconcileBtnDone)}
            >
              <CheckCircle2 size={13} /> Reconciled &amp; Acknowledged
            </button>
          ) : (
            <button
              onClick={handleReconcile}
              {...stylex.props(styles.reconcileBtn)}
            >
              <RefreshCw size={13} /> Simulate Reconciliation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
