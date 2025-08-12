export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_SqmQgEphHNdPVG',
    priceId: 'price_1Rv4rDBacFXEnBmNDMrhMqOH',
    name: 'Go Pro',
    description: 'Unlock premium features and advanced capabilities',
    mode: 'subscription',
    price: 45.00,
  },
];

export const getProductById = (id: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.id === id);
};

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.priceId === priceId);
};