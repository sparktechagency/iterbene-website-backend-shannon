import Stripe from 'stripe';
import { config } from '../config';

const stripe = new Stripe(config.stripe.secretKey as string, {
  apiVersion: '2025-01-27.acacia', // Ensure this matches your API version
  typescript: true,
});

export default stripe;
