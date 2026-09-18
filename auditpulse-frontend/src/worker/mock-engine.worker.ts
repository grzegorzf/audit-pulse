import { MockEngineFacade } from '../mock-engine';
import { ProductPairString } from '../mock-engine/core/domain/model/MockTradeMatch';

// Multi-layered Web Worker Mock Engine Adapter
const facade = new MockEngineFacade({
  initialProduct: 'BTC-USD',
  targetEventsPerSecond: 180,
  simulateBackgroundAnomalies: true,
  feedSink: {
    emitTradesBatch(trades) {
      self.postMessage({ type: 'TRADE_BATCH', payload: trades });
    },
    emitDeadLetter(deadLetter) {
      self.postMessage({ type: 'DEAD_LETTER', payload: deadLetter });
    },
    emitMetrics(metrics) {
      self.postMessage({ type: 'METRICS', payload: metrics });
    },
  },
});

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data || {};

  switch (type) {
    case 'START':
      if (payload?.product) {
        facade.setProduct(payload.product as ProductPairString);
      }
      if (payload?.rate) {
        facade.setRate(payload.rate);
      }
      facade.start();
      break;

    case 'STOP':
      facade.stop();
      break;

    case 'SET_PRODUCT':
      if (payload) {
        facade.setProduct(payload as ProductPairString);
      }
      break;

    case 'SET_RATE':
      if (typeof payload === 'number') {
        facade.setRate(payload);
      } else if (payload?.rate) {
        facade.setRate(payload.rate);
      }
      break;

    case 'TRIGGER_GAP':
      facade.triggerSequenceGap(payload?.gapSize ?? 5);
      break;

    case 'TRIGGER_MALFORMED':
      facade.triggerMalformedPayload(payload?.reason, payload?.customPayload);
      break;

    case 'RECONCILE':
      if (payload?.id) {
        const item = facade.reconcileDlq(payload.id);
        self.postMessage({ type: 'RECONCILED', payload: item });
      }
      break;

    case 'GET_DLQ':
      const dlqList = facade.getDlq(payload?.product, payload?.offset, payload?.limit);
      self.postMessage({ type: 'DLQ_LIST', payload: dlqList });
      break;

    case 'RESET':
      facade.reset();
      break;

    default:
      console.warn(`[MockEngineWorker] Unknown message type: ${type}`);
  }
};
