import Stripe from 'stripe';
import { config } from '../config';

const stripe = new Stripe(config.stripe.secretKey as string, {
  apiVersion: '2025-01-27.acacia' as any, // Fix for TypeScript compatibility
  typescript: true,
});

export default stripe;
