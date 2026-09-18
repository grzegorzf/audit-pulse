import { create } from 'zustand';
import { ConnectionStatus, DeadLetter, MetricsSnapshot, TargetEndpoint, TradeMatch } from './types';

const MAX_STORED_TRADES = 15_000;
const MAX_METRICS_HISTORY = 60;

interface StreamStore {
  trades: TradeMatch[];
  dlqItems: DeadLetter[];
  selectedDlqItem: DeadLetter | null;
  metrics: MetricsSnapshot;
  metricsHistory: { time: number; eventsPerSecond: number; gapCount: number }[];
  connectionStatus: ConnectionStatus;
  targetEndpoint: TargetEndpoint;
  selectedProduct: string;
  isStreamPaused: boolean;
  filterQuery: string;
  memoryEstimateMb: number;

  // Actions
  addTradesBatch: (newTrades: TradeMatch[]) => void;
  addDeadLetter: (dlq: DeadLetter) => void;
  setDlqItems: (items: DeadLetter[]) => void;
  reconcileDeadLetter: (id: string) => void;
  setMetrics: (metrics: MetricsSnapshot) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setTargetEndpoint: (endpoint: TargetEndpoint) => void;
  setSelectedProduct: (product: string) => void;
  setSelectedDlqItem: (item: DeadLetter | null) => void;
  togglePauseStream: () => void;
  setFilterQuery: (query: string) => void;
  clearTrades: () => void;
}

const isBrowser = typeof window !== 'undefined';
const isGitHubPages =
  isBrowser &&
  (window.location.hostname.includes('github.io') ||
   process.env.NEXT_PUBLIC_FORCE_MOCK === 'true' ||
   process.env.NEXT_PUBLIC_BASE_PATH === '/audit-pulse');

export const useStreamStore = create<StreamStore>((set) => ({
  trades: [],
  dlqItems: [],
  selectedDlqItem: null,
  metrics: {
    eventsPerSecond: 0,
    totalProcessed: 0,
    quarantinedCount: 0,
    lastSequence: 0,
    latencyMs: 0,
  },
  metricsHistory: [],
  connectionStatus: 'CONNECTING',
  targetEndpoint: isGitHubPages ? 'MOCK_ENGINE' : 'BACKEND_LOCAL',
  selectedProduct: 'BTC-USD',
  isStreamPaused: false,
  filterQuery: '',
  memoryEstimateMb: 14.5,

  addTradesBatch: (newTrades) =>
    set((state) => {
      if (state.isStreamPaused) return state;

      // Filter by selected product if not 'ALL'
      const filtered = state.selectedProduct === 'ALL'
        ? newTrades
        : newTrades.filter((t) => {
            const pair = typeof t.productPair === 'string' ? t.productPair : t.productPair?.value;
            return pair === state.selectedProduct;
          });

      if (filtered.length === 0) return state;

      const combined = [...filtered, ...state.trades];
      const bounded = combined.length > MAX_STORED_TRADES ? combined.slice(0, MAX_STORED_TRADES) : combined;

      // Estimate approximate JS heap usage for stored trades
      const memMb = Math.round((bounded.length * 120) / (1024 * 1024) * 10) / 10 + 14.5;

      return {
        trades: bounded,
        memoryEstimateMb: memMb,
      };
    }),

  addDeadLetter: (dlq) =>
    set((state) => {
      const exists = state.dlqItems.some((d) => d.id === dlq.id);
      if (exists) return state;

      const updated = [dlq, ...state.dlqItems].slice(0, 500);
      return {
        dlqItems: updated,
        metrics: {
          ...state.metrics,
          quarantinedCount: state.metrics.quarantinedCount + 1,
        },
      };
    }),

  setDlqItems: (items) => set({ dlqItems: items }),

  reconcileDeadLetter: (id) =>
    set((state) => ({
      dlqItems: state.dlqItems.map((d) => (d.id === id ? { ...d, reconciled: true } : d)),
      selectedDlqItem:
        state.selectedDlqItem && state.selectedDlqItem.id === id
          ? { ...state.selectedDlqItem, reconciled: true }
          : state.selectedDlqItem,
    })),

  setMetrics: (metrics) =>
    set((state) => {
      const historyEntry = {
        time: Date.now(),
        eventsPerSecond: metrics.eventsPerSecond,
        gapCount: metrics.quarantinedCount,
      };
      const updatedHistory = [...state.metricsHistory, historyEntry].slice(-MAX_METRICS_HISTORY);

      return {
        metrics,
        metricsHistory: updatedHistory,
      };
    }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setTargetEndpoint: (endpoint) => set({ targetEndpoint: endpoint }),
  setSelectedProduct: (product) => set({ selectedProduct: product }),
  setSelectedDlqItem: (item) => set({ selectedDlqItem: item }),
  togglePauseStream: () => set((state) => ({ isStreamPaused: !state.isStreamPaused })),
  setFilterQuery: (query) => set({ filterQuery: query }),
  clearTrades: () => set({ trades: [] }),
}));
