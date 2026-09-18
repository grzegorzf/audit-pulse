import { useStreamStore } from './store';
import { DeadLetter, MetricsSnapshot, TargetEndpoint, TradeMatch } from './types';

class IngestionManager {
  private tradeSource: EventSource | null = null;
  private dlqSource: EventSource | null = null;
  private metricsSource: EventSource | null = null;
  private mockWorker: Worker | null = null;
  private isConnecting = false;
  private reconnectTimer: any = null;

  public init() {
    const store = useStreamStore.getState();
    this.connectTarget(store.targetEndpoint, store.selectedProduct);

    // Subscribe to endpoint and product changes
    useStreamStore.subscribe((state, prevState) => {
      if (
        state.targetEndpoint !== prevState.targetEndpoint ||
        state.selectedProduct !== prevState.selectedProduct
      ) {
        this.connectTarget(state.targetEndpoint, state.selectedProduct);
      }
    });
  }

  public connectTarget(endpoint: TargetEndpoint, product: string) {
    this.cleanup();
    const setStatus = useStreamStore.getState().setConnectionStatus;
    setStatus('CONNECTING');

    if (endpoint === 'MOCK_ENGINE') {
      this.startMockWorker(product);
      setStatus('MOCK_ACTIVE');
      return;
    }

    const baseUrl = endpoint === 'CLOUD_JVM'
      ? (process.env.NEXT_PUBLIC_CLOUD_API_URL || 'https://api.auditpulse.internal')
      : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080');

    this.connectLiveBackend(baseUrl, product);
  }

  private connectLiveBackend(baseUrl: string, product: string) {
    try {
      const productParam = product === 'ALL' ? '' : `?product=${encodeURIComponent(product)}`;
      this.tradeSource = new EventSource(`${baseUrl}/api/v1/stream/trades${productParam}`);
      this.dlqSource = new EventSource(`${baseUrl}/api/v1/stream/dlq`);
      this.metricsSource = new EventSource(`${baseUrl}/api/v1/stream/metrics`);

      let connectionFailed = false;

      this.tradeSource.onopen = () => {
        if (!connectionFailed) {
          useStreamStore.getState().setConnectionStatus('ONLINE');
        }
      };

      this.tradeSource.onmessage = (e) => {
        try {
          const trade: TradeMatch = JSON.parse(e.data);
          useStreamStore.getState().addTradesBatch([trade]);
        } catch (err) {
          console.error('Failed to parse trade frame:', err);
        }
      };

      this.tradeSource.onerror = () => {
        connectionFailed = true;
        this.handleConnectionFailure();
      };

      this.dlqSource.onmessage = (e) => {
        try {
          const anomaly = JSON.parse(e.data);
          // Convert to DeadLetter format if needed
          const dlq: DeadLetter = {
            id: 'dlq-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            tradeId: anomaly.tradeId || null,
            productPair: anomaly.productPair || product,
            receivedSequence: anomaly.receivedSequence || null,
            expectedSequence: anomaly.expectedSequence || null,
            reason: anomaly.gapSize ? 'GAP_DETECTED' : 'UNEXPECTED_PAYLOAD',
            rawPayload: JSON.stringify(anomaly, null, 2),
            timestamp: anomaly.occurredAt || new Date().toISOString(),
            reconciled: false,
          };
          useStreamStore.getState().addDeadLetter(dlq);
        } catch (err) {
          console.error('Failed to parse DLQ frame:', err);
        }
      };

      this.metricsSource.onmessage = (e) => {
        try {
          const metrics: MetricsSnapshot = JSON.parse(e.data);
          useStreamStore.getState().setMetrics(metrics);
        } catch (err) {
          console.error('Failed to parse metrics frame:', err);
        }
      };
    } catch (err) {
      this.handleConnectionFailure();
    }
  }

  private handleConnectionFailure() {
    console.warn('Backend SSE connection unavailable. Falling back to Browser Mock Engine.');
    useStreamStore.getState().setConnectionStatus('DEGRADED');

    // Auto-fallback to mock engine after 2.5s if backend is not responding
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      const currentStatus = useStreamStore.getState().connectionStatus;
      if (currentStatus !== 'ONLINE') {
        useStreamStore.getState().setTargetEndpoint('MOCK_ENGINE');
      }
    }, 2500);
  }

  private startMockWorker(product: string) {
    if (typeof window === 'undefined') return;

    try {
      this.mockWorker = new Worker(
        new URL('../worker/mock-engine.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.mockWorker.onmessage = (e: MessageEvent) => {
        const { type, payload } = e.data;
        if (type === 'TRADE_BATCH') {
          useStreamStore.getState().addTradesBatch(payload);
        } else if (type === 'DEAD_LETTER') {
          useStreamStore.getState().addDeadLetter(payload);
        } else if (type === 'METRICS') {
          useStreamStore.getState().setMetrics(payload);
        }
      };

      this.mockWorker.postMessage({
        type: 'START',
        payload: { product, rate: 220 },
      });
    } catch (err) {
      console.error('Failed to instantiate mock worker:', err);
    }
  }

  public triggerManualGap() {
    if (this.mockWorker) {
      this.mockWorker.postMessage({ type: 'TRIGGER_GAP' });
    }
  }

  public cleanup() {
    if (this.tradeSource) {
      this.tradeSource.close();
      this.tradeSource = null;
    }
    if (this.dlqSource) {
      this.dlqSource.close();
      this.dlqSource = null;
    }
    if (this.metricsSource) {
      this.metricsSource.close();
      this.metricsSource = null;
    }
    if (this.mockWorker) {
      this.mockWorker.postMessage({ type: 'STOP' });
      this.mockWorker.terminate();
      this.mockWorker = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const ingestionManager = new IngestionManager();
