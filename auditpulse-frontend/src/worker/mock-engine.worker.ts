// Web Worker: High-throughput synthetic Coinbase market engine with controlled sequence gap injection

interface WorkerConfig {
  isRunning: boolean;
  ratePerSecond: number;
  product: string;
}

let config: WorkerConfig = {
  isRunning: false,
  ratePerSecond: 180,
  product: 'BTC-USD',
};

let btcSeq = 5492040000;
let ethSeq = 1820490000;
let btcPrice = 67420.5;
let ethPrice = 3520.25;
let tradeCounter = 100000;
let totalProcessed = 0;
let totalGaps = 0;
let lastMetricsEmit = Date.now();
let batchBuffer: any[] = [];
let intervalId: any = null;

function generateTrade(pair: string) {
  tradeCounter++;
  totalProcessed++;

  const isBtc = pair === 'BTC-USD';
  let seq = isBtc ? ++btcSeq : ++ethSeq;
  let price = isBtc ? btcPrice : ethPrice;

  // Random walk price
  const delta = (Math.random() - 0.49) * (isBtc ? 15 : 2.5);
  price = Math.max(1, price + delta);
  if (isBtc) btcPrice = price;
  else ethPrice = price;

  const size = isBtc
    ? (Math.random() * 0.8 + 0.005).toFixed(4)
    : (Math.random() * 5.0 + 0.05).toFixed(4);

  const side = Math.random() > 0.48 ? 'BUY' : 'SELL';

  // Inject intentional sequence gap every ~280 trades
  if (totalProcessed > 50 && totalProcessed % 280 === 0) {
    const gapSize = Math.floor(Math.random() * 4) + 2;
    const expectedSeq = seq;
    seq += gapSize;
    if (isBtc) btcSeq = seq;
    else ethSeq = seq;
    totalGaps++;

    // Emit dead-letter sequence anomaly
    const deadLetter = {
      id: 'dlq-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      tradeId: tradeCounter,
      productPair: pair,
      receivedSequence: seq,
      expectedSequence: expectedSeq,
      reason: 'GAP_DETECTED',
      rawPayload: JSON.stringify({
        type: 'match',
        trade_id: tradeCounter,
        sequence: seq,
        expected_sequence: expectedSeq,
        gap_size: gapSize,
        price: price.toFixed(2),
        size,
        side,
        time: new Date().toISOString(),
        product_id: pair,
      }, null, 2),
      timestamp: new Date().toISOString(),
      reconciled: false,
    };

    self.postMessage({ type: 'DEAD_LETTER', payload: deadLetter });
  }

  // Inject schema violation anomaly every ~750 trades
  if (totalProcessed > 100 && totalProcessed % 750 === 0) {
    totalGaps++;
    const deadLetter = {
      id: 'dlq-schema-' + Date.now(),
      tradeId: tradeCounter,
      productPair: pair,
      receivedSequence: seq,
      expectedSequence: null,
      reason: 'SCHEMA_VIOLATION',
      rawPayload: JSON.stringify({
        type: 'match',
        trade_id: tradeCounter,
        sequence: seq,
        price: '-67420.00', // Invalid negative price
        size: '0.0000',
        side: 'INVALID_SIDE',
        product_id: pair,
      }, null, 2),
      timestamp: new Date().toISOString(),
      reconciled: false,
    };

    self.postMessage({ type: 'DEAD_LETTER', payload: deadLetter });
  }

  return {
    tradeId: tradeCounter,
    sequence: seq,
    price: price.toFixed(2),
    size,
    side,
    timestamp: new Date().toISOString(),
    productPair: pair,
    flashType: side,
  };
}

function tick() {
  if (!config.isRunning) return;

  // Batch emit ~9-10 trades per 50ms tick (~180/sec)
  const batchCount = Math.max(1, Math.round(config.ratePerSecond / 20));
  const batch = [];

  for (let i = 0; i < batchCount; i++) {
    const pair = config.product === 'ALL' ? (Math.random() > 0.5 ? 'BTC-USD' : 'ETH-USD') : config.product;
    batch.push(generateTrade(pair));
  }

  self.postMessage({ type: 'TRADE_BATCH', payload: batch });

  const now = Date.now();
  if (now - lastMetricsEmit >= 1000) {
    const elapsedSec = (now - lastMetricsEmit) / 1000;
    const currentEps = Math.round(batchCount * 20);
    lastMetricsEmit = now;

    self.postMessage({
      type: 'METRICS',
      payload: {
        eventsPerSecond: currentEps,
        totalProcessed,
        quarantinedCount: totalGaps,
        lastSequence: config.product === 'ETH-USD' ? ethSeq : btcSeq,
        latencyMs: Math.floor(Math.random() * 8) + 8,
      },
    });
  }
}

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'START') {
    config.isRunning = true;
    if (payload?.product) config.product = payload.product;
    if (payload?.rate) config.ratePerSecond = payload.rate;
    if (!intervalId) {
      intervalId = setInterval(tick, 50);
    }
  } else if (type === 'STOP') {
    config.isRunning = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  } else if (type === 'SET_PRODUCT') {
    config.product = payload;
  } else if (type === 'TRIGGER_GAP') {
    // Manually force a sequence gap immediately
    const pair = config.product === 'ALL' ? 'BTC-USD' : config.product;
    const isBtc = pair === 'BTC-USD';
    const seq = isBtc ? btcSeq : ethSeq;
    const gapSeq = seq + 8;
    if (isBtc) btcSeq = gapSeq;
    else ethSeq = gapSeq;
    totalGaps++;

    const deadLetter = {
      id: 'dlq-manual-' + Date.now(),
      tradeId: ++tradeCounter,
      productPair: pair,
      receivedSequence: gapSeq,
      expectedSequence: seq + 1,
      reason: 'GAP_DETECTED',
      rawPayload: JSON.stringify({
        type: 'match',
        trade_id: tradeCounter,
        sequence: gapSeq,
        expected_sequence: seq + 1,
        gap_size: 7,
        anomaly_trigger: 'USER_SIMULATION_TRIGGER',
        product_id: pair,
        time: new Date().toISOString(),
      }, null, 2),
      timestamp: new Date().toISOString(),
      reconciled: false,
    };

    self.postMessage({ type: 'DEAD_LETTER', payload: deadLetter });
  }
};
