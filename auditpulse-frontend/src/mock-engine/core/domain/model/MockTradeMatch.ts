export type ProductPairString = 'BTC-USD' | 'ETH-USD';
export type TradeSide = 'BUY' | 'SELL';

export interface MockTradeMatch {
  readonly tradeId: number;
  readonly sequence: number;
  readonly price: string;
  readonly size: string;
  readonly side: TradeSide;
  readonly timestamp: string;
  readonly productPair: ProductPairString;
}

export function createMockTradeMatch(params: {
  tradeId: number;
  sequence: number;
  price: number;
  size: number;
  side: TradeSide;
  productPair: ProductPairString;
  timestamp?: string;
}): MockTradeMatch {
  return {
    tradeId: params.tradeId,
    sequence: params.sequence,
    price: params.price.toFixed(2),
    size: params.size.toFixed(8),
    side: params.side,
    timestamp: params.timestamp || new Date().toISOString(),
    productPair: params.productPair,
  };
}
