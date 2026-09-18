import { MockTradeMatch, ProductPairString, TradeSide, createMockTradeMatch } from '../../core/domain/model/MockTradeMatch';

export interface PriceConfig {
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  volatility: number; // e.g. 0.0015 for realistic crypto jitter
  minSize: number;
  maxSize: number;
}

export class PriceMotionEngine {
  private currentPrices: Map<ProductPairString, number> = new Map();
  private tradeIdCounter: number = 1_000_000_000 + Math.floor(Math.random() * 100_000);

  private configs: Record<ProductPairString, PriceConfig> = {
    'BTC-USD': {
      basePrice: 78000.0,
      minPrice: 72000.0,
      maxPrice: 84000.0,
      volatility: 0.0008,
      minSize: 0.00001,
      maxSize: 1.5,
    },
    'ETH-USD': {
      basePrice: 2500.0,
      minPrice: 2300.0,
      maxPrice: 2750.0,
      volatility: 0.0012,
      minSize: 0.001,
      maxSize: 12.0,
    },
  };

  constructor() {
    this.currentPrices.set('BTC-USD', this.configs['BTC-USD'].basePrice);
    this.currentPrices.set('ETH-USD', this.configs['ETH-USD'].basePrice);
  }

  public nextTrade(product: ProductPairString, sequence: number): MockTradeMatch {
    const config = this.configs[product] || this.configs['BTC-USD'];
    let price = this.currentPrices.get(product) || config.basePrice;

    // Geometric Brownian Motion step: price * exp((drift - 0.5*sigma^2)*dt + sigma*W)
    const shock = (Math.random() - 0.5) * 2; // -1 to 1
    const priceChange = price * config.volatility * shock;
    price = Math.max(config.minPrice, Math.min(config.maxPrice, price + priceChange));
    this.currentPrices.set(product, price);

    // Realistic size distribution (power-law approximation)
    const u = Math.random();
    const size = config.minSize + Math.pow(u, 3) * (config.maxSize - config.minSize);

    const side: TradeSide = Math.random() > 0.48 ? 'BUY' : 'SELL';
    const tradeId = ++this.tradeIdCounter;

    return createMockTradeMatch({
      tradeId,
      sequence,
      price,
      size,
      side,
      productPair: product,
    });
  }

  public getCurrentPrice(product: ProductPairString): number {
    return this.currentPrices.get(product) || this.configs[product].basePrice;
  }
}
