'use client';

import * as stylex from '@stylexjs/stylex';
import { colors, typography } from '../styles/tokens.stylex';
import { useStreamStore } from '../lib/store';
import { Pause, Play, Trash2, Search, Filter } from 'lucide-react';

const styles = stylex.create({
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '14px',
    paddingRight: '14px',
    backgroundColor: colors.bgPanel,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: colors.borderSubtle,
    gap: '12px',
    flexWrap: 'wrap',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  btnGroup: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: '4px',
    padding: '2px',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderDefault,
  },
  pairBtn: {
    backgroundColor: 'transparent',
    color: colors.textSecondary,
    border: 'none',
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '8px',
    paddingRight: '8px',
    fontSize: '11px',
    fontFamily: typography.fontMono,
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: '3px',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  pairBtnActive: {
    backgroundColor: colors.bgActive,
    color: colors.neonCyan,
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderDefault,
    borderRadius: '4px',
    paddingLeft: '8px',
    paddingRight: '8px',
    height: '28px',
    transition: 'border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  searchInput: {
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    color: colors.textPrimary,
    fontFamily: typography.fontMono,
    fontSize: '11px',
    width: '180px',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  iconBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    backgroundColor: colors.bgCard,
    color: colors.textSecondary,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderDefault,
    borderRadius: '4px',
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '8px',
    paddingRight: '8px',
    fontSize: '11px',
    fontFamily: typography.fontMono,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  iconBtnPaused: {
    backgroundColor: colors.neonAmberBg,
    color: colors.neonAmber,
    borderColor: colors.neonAmberBorder,
  },
  countText: {
    fontSize: '11px',
    fontFamily: typography.fontMono,
    color: colors.textMuted,
    fontVariantNumeric: 'tabular-nums',
  },
});

export default function FilterBar() {
  const selectedProduct = useStreamStore((s) => s.selectedProduct);
  const setSelectedProduct = useStreamStore((s) => s.setSelectedProduct);
  const isStreamPaused = useStreamStore((s) => s.isStreamPaused);
  const togglePauseStream = useStreamStore((s) => s.togglePauseStream);
  const filterQuery = useStreamStore((s) => s.filterQuery);
  const setFilterQuery = useStreamStore((s) => s.setFilterQuery);
  const clearTrades = useStreamStore((s) => s.clearTrades);
  const tradeCount = useStreamStore((s) => s.trades.length);

  const handleSelectProduct = (product: string) => {
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        setSelectedProduct(product);
      });
    } else {
      setSelectedProduct(product);
    }
  };

  const pairs = ['BTC-USD', 'ETH-USD', 'SOL-USD'];

  return (
    <div {...stylex.props(styles.bar)}>
      <div {...stylex.props(styles.left)}>
        <div {...stylex.props(styles.btnGroup)}>
          <button
            onClick={() => handleSelectProduct('ALL')}
            {...stylex.props(
              styles.pairBtn,
              selectedProduct === 'ALL' && styles.pairBtnActive
            )}
          >
            ALL
          </button>
          {pairs.map((pair) => (
            <button
              key={pair}
              onClick={() => handleSelectProduct(pair)}
              {...stylex.props(
                styles.pairBtn,
                selectedProduct === pair && styles.pairBtnActive
              )}
            >
              {pair}
            </button>
          ))}
        </div>

        <div {...stylex.props(styles.searchWrapper)}>
          <Search size={12} color="#6b7280" />
          <input
            type="text"
            placeholder="Filter seq, price..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            {...stylex.props(styles.searchInput)}
          />
        </div>
      </div>

      <div {...stylex.props(styles.right)}>
        <span {...stylex.props(styles.countText)}>
          Buffer: {tradeCount.toLocaleString()}
        </span>

        <button
          onClick={togglePauseStream}
          {...stylex.props(
            styles.iconBtn,
            isStreamPaused && styles.iconBtnPaused
          )}
        >
          {isStreamPaused ? (
            <>
              <Play size={11} /> Resume
            </>
          ) : (
            <>
              <Pause size={11} /> Pause
            </>
          )}
        </button>

        <button
          onClick={clearTrades}
          {...stylex.props(styles.iconBtn)}
          title="Clear buffered trades"
        >
          <Trash2 size={11} /> Clear
        </button>
      </div>
    </div>
  );
}
