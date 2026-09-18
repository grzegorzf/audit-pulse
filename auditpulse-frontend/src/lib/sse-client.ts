import { useStreamStore } from './store';
import { DeadLetter, MetricsSnapshot, TargetEndpoint, TradeMatch } from './types';

class IngestionManager {
  private tradeSource: EventSource | null = null;
  private dlqSource: EventSource | null = null;
  private metricsSource: EventSource | null = null;
  private mockWorker: Worker | null = null;
  private reconnectTimer: any = null;

  public init() {
    const isBrowser = typeof window !== 'undefined';
    const isGitHubPages =
      isBrowser &&
      (window.location.hostname.includes('github.io') ||
       process.env.NEXT_PUBLIC_FORCE_MOCK === 'true' ||
       process.env.NEXT_PUBLIC_BASE_PATH === '/audit-pulse');

    if (isGitHubPages && useStreamStore.getState().targetEndpoint !== 'MOCK_ENGINE') {
      useStreamStore.getState().setTargetEndpoint('MOCK_ENGINE');
    }

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
    const setStatus = useStreamStore.getState().setConnectionStatus;

    if (endpoint === 'MOCK_ENGINE') {
      this.closeBackendSources();
      setStatus('MOCK_ACTIVE');
      if (!this.mockWorker) {
        this.startMockWorker(product);
      } else {
        this.mockWorker.postMessage({ type: 'SET_PRODUCT', payload: product });
      }
      return;
    }

    this.cleanup();
    setStatus('CONNECTING');

    const baseUrl = this.getBaseUrl(endpoint);
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
          this.fetchInitialDlq(baseUrl, product);
        }
      };

      const handleTrade = (e: MessageEvent) => {
        try {
          const trade: TradeMatch = JSON.parse(e.data);
          useStreamStore.getState().addTradesBatch([trade]);
        } catch (err) {
          console.error('Failed to parse trade frame:', err);
        }
      };

      // Support both named SSE 'trade' event and fallback 'message'
      this.tradeSource.addEventListener('trade', handleTrade);
      this.tradeSource.onmessage = handleTrade;

      this.tradeSource.onerror = () => {
        connectionFailed = true;
        this.handleConnectionFailure();
      };

      const handleDlq = (e: MessageEvent) => {
        try {
          const anomaly = JSON.parse(e.data);
          const dlq: DeadLetter = {
            id: anomaly.id || 'dlq-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            tradeId: anomaly.tradeId || null,
            productPair: anomaly.productPair || product,
            receivedSequence: anomaly.receivedSequence || null,
            expectedSequence: anomaly.expectedSequence || null,
            reason: anomaly.gapSize ? 'GAP_DETECTED' : (anomaly.reason || 'UNEXPECTED_PAYLOAD'),
            rawPayload: typeof anomaly.rawPayload === 'string' ? anomaly.rawPayload : JSON.stringify(anomaly, null, 2),
            timestamp: anomaly.occurredAt || anomaly.timestamp || new Date().toISOString(),
            reconciled: anomaly.reconciled || false,
          };
          useStreamStore.getState().addDeadLetter(dlq);
        } catch (err) {
          console.error('Failed to parse DLQ frame:', err);
        }
      };

      this.dlqSource.addEventListener('anomaly', handleDlq);
      this.dlqSource.onmessage = handleDlq;

      const handleMetrics = (e: MessageEvent) => {
        try {
          const metrics: MetricsSnapshot = JSON.parse(e.data);
          useStreamStore.getState().setMetrics(metrics);
        } catch (err) {
          console.error('Failed to parse metrics frame:', err);
        }
      };

      this.metricsSource.addEventListener('metrics', handleMetrics);
      this.metricsSource.onmessage = handleMetrics;
    } catch (err) {
      this.handleConnectionFailure();
    }
  }

  private fetchInitialDlq(baseUrl: string, product: string) {
    const productParam = product === 'ALL' ? '' : `?product=${encodeURIComponent(product)}`;
    fetch(`${baseUrl}/api/v1/dlq${productParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.items)) {
          useStreamStore.getState().setDlqItems(data.items);
        }
      })
      .catch((err) => {
        console.warn('Initial DLQ fetch skipped:', err.message);
      });
  }

  private getBaseUrl(endpoint: TargetEndpoint): string {
    if (endpoint === 'CLOUD_JVM') {
      return process.env.NEXT_PUBLIC_CLOUD_API_URL || 'https://api.auditpulse.internal';
    }
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    if (typeof window !== 'undefined') {
      // In local dev server (port 3000), target Spring Boot backend directly
      if (window.location.port === '3000') {
        return 'http://localhost:8840';
      }
      // When served via Nginx in Docker (e.g. port 3840 or 80), use relative origin so /api is reverse-proxied
      return '';
    }
    return 'http://localhost:8840';
  }

  private handleConnectionFailure() {
    console.warn('Backend SSE connection degraded or disconnected.');
    useStreamStore.getState().setConnectionStatus('DEGRADED');

    const isBrowser = typeof window !== 'undefined';
    const isGitHubPages =
      isBrowser &&
      (window.location.hostname.includes('github.io') ||
       process.env.NEXT_PUBLIC_FORCE_MOCK === 'true' ||
       process.env.NEXT_PUBLIC_BASE_PATH === '/audit-pulse');

    // Only auto-fallback on static GitHub Pages
    if (isGitHubPages) {
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        const currentStatus = useStreamStore.getState().connectionStatus;
        if (currentStatus !== 'ONLINE') {
          useStreamStore.getState().setTargetEndpoint('MOCK_ENGINE');
        }
      }, 2500);
    }
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

  public async triggerManualGap() {
    const store = useStreamStore.getState();
    if (store.targetEndpoint === 'MOCK_ENGINE') {
      if (this.mockWorker) {
        this.mockWorker.postMessage({ type: 'TRIGGER_GAP' });
      }
    } else {
      // Trigger via backend simulation endpoint
      const baseUrl = this.getBaseUrl(store.targetEndpoint);
      const product = store.selectedProduct === 'ALL' ? 'BTC-USD' : store.selectedProduct;
      try {
        await fetch(`${baseUrl}/api/v1/simulate/gap?product=${encodeURIComponent(product)}`, {
          method: 'POST',
        });
      } catch (err) {
        console.warn('Failed to invoke backend gap simulation:', err);
      }
    }
  }

  public async reconcileRemote(id: string) {
    const store = useStreamStore.getState();
    store.reconcileDeadLetter(id);

    if (store.targetEndpoint === 'MOCK_ENGINE') {
      if (this.mockWorker) {
        this.mockWorker.postMessage({ type: 'RECONCILE', payload: { id } });
      }
      return;
    }

    const baseUrl = this.getBaseUrl(store.targetEndpoint);
    try {
      await fetch(`${baseUrl}/api/v1/dlq/${encodeURIComponent(id)}/reconcile`, {
        method: 'POST',
      });
    } catch (err) {
      console.warn('Backend reconcile error:', err);
    }
  }

  private closeBackendSources() {
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
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public cleanup() {
    this.closeBackendSources();
    if (this.mockWorker) {
      this.mockWorker.postMessage({ type: 'STOP' });
      this.mockWorker.terminate();
      this.mockWorker = null;
    }
  }
}

export const ingestionManager = new IngestionManager();
