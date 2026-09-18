'use client';

import * as stylex from '@stylexjs/stylex';
import { colors, typography } from '../styles/tokens.stylex';
import { useStreamStore } from '../lib/store';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useMemo } from 'react';

const styles = stylex.create({
  tableContainer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: colors.bgRoot,
    overflow: 'hidden',
  },
  headerRow: {
    display: 'grid',
    gridTemplateColumns: '85px 120px 85px 65px 110px 95px 1fr',
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '12px',
    paddingRight: '12px',
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: colors.borderDefault,
    fontFamily: typography.fontMono,
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: colors.textSecondary,
    userSelect: 'none',
  },
  scrollViewport: {
    flex: 1,
    overflowY: 'auto',
    position: 'relative',
    willChange: 'transform',
  },
  virtualCanvas: {
    width: '100%',
    position: 'relative',
  },
  row: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '28px',
    display: 'grid',
    gridTemplateColumns: '85px 120px 85px 65px 110px 95px 1fr',
    alignItems: 'center',
    paddingLeft: '12px',
    paddingRight: '12px',
    fontFamily: typography.fontMono,
    fontSize: '11px',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(24, 34, 50, 0.4)',
    boxSizing: 'border-box',
    transition: 'background-color 0.2s ease',
  },
  rowBuy: {
    backgroundColor: 'rgba(0, 255, 136, 0.03)',
  },
  rowSell: {
    backgroundColor: 'rgba(255, 51, 102, 0.03)',
  },
  badgeBuy: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '46px',
    paddingTop: '1px',
    paddingBottom: '1px',
    borderRadius: '3px',
    fontSize: '9.5px',
    fontWeight: 700,
    backgroundColor: colors.neonGreenBg,
    color: colors.neonGreen,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.neonGreenBorder,
  },
  badgeSell: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '46px',
    paddingTop: '1px',
    paddingBottom: '1px',
    borderRadius: '3px',
    fontSize: '9.5px',
    fontWeight: 700,
    backgroundColor: colors.neonRedBg,
    color: colors.neonRed,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.neonRedBorder,
  },
  colTime: {
    color: colors.textMuted,
  },
  colSeq: {
    color: colors.neonCyan,
    fontWeight: 600,
  },
  colPair: {
    color: colors.textPrimary,
    fontWeight: 500,
  },
  colPriceBuy: {
    color: colors.neonGreen,
    fontWeight: 600,
  },
  colPriceSell: {
    color: colors.neonRed,
    fontWeight: 600,
  },
  colSize: {
    color: colors.textPrimary,
  },
  colValue: {
    color: colors.textSecondary,
  },
  emptyState: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '8px',
    fontFamily: typography.fontMono,
    color: colors.textMuted,
    fontSize: '12px',
  },
});

export default function TradeStreamTable() {
  const trades = useStreamStore((s) => s.trades);
  const filterQuery = useStreamStore((s) => s.filterQuery);
  const parentRef = useRef<HTMLDivElement>(null);

  // Apply search filtering
  const filteredTrades = useMemo(() => {
    if (!filterQuery) return trades;
    const q = filterQuery.toLowerCase();
    return trades.filter((t) => {
      const pair = typeof t.productPair === 'string' ? t.productPair : t.productPair?.value || '';
      return (
        String(t.sequence).includes(q) ||
        String(t.price).includes(q) ||
        pair.toLowerCase().includes(q)
      );
    });
  }, [trades, filterQuery]);

  const rowVirtualizer = useVirtualizer({
    count: filteredTrades.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 25,
  });

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
    } catch {
      return iso;
    }
  };

  const getProductString = (productPair: string | { value: string }) => {
    return typeof productPair === 'string' ? productPair : productPair?.value || '---';
  };

  return (
    <div {...stylex.props(styles.tableContainer)}>
      {/* Sticky Table Header */}
      <div {...stylex.props(styles.headerRow)}>
        <div>Time</div>
        <div>Sequence</div>
        <div>Pair</div>
        <div>Side</div>
        <div>Price ($)</div>
        <div>Size</div>
        <div>Value ($)</div>
      </div>

      {/* Virtual Scroll Viewport */}
      <div ref={parentRef} {...stylex.props(styles.scrollViewport)}>
        {filteredTrades.length === 0 ? (
          <div {...stylex.props(styles.emptyState)}>
            <span>Connecting to trade feed...</span>
            <span style={{ fontSize: '10px' }}>Waiting for ticks from ingestion engine</span>
          </div>
        ) : (
          <div
            {...stylex.props(styles.virtualCanvas)}
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const trade = filteredTrades[virtualRow.index];
              const isBuy = trade.side === 'BUY';
              const priceNum = parseFloat(trade.price);
              const sizeNum = parseFloat(trade.size);
              const totalVal = (priceNum * sizeNum).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });

              return (
                <div
                  key={virtualRow.key}
                  {...stylex.props(
                    styles.row,
                    isBuy ? styles.rowBuy : styles.rowSell
                  )}
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <div {...stylex.props(styles.colTime)}>{formatTime(trade.timestamp)}</div>
                  <div {...stylex.props(styles.colSeq)}>{trade.sequence.toLocaleString()}</div>
                  <div {...stylex.props(styles.colPair)}>{getProductString(trade.productPair)}</div>
                  <div>
                    <span {...stylex.props(isBuy ? styles.badgeBuy : styles.badgeSell)}>
                      {trade.side}
                    </span>
                  </div>
                  <div {...stylex.props(isBuy ? styles.colPriceBuy : styles.colPriceSell)}>
                    {parseFloat(trade.price).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div {...stylex.props(styles.colSize)}>
                    {parseFloat(trade.size).toFixed(4)}
                  </div>
                  <div {...stylex.props(styles.colValue)}>${totalVal}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
