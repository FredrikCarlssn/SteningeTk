import Stripe from 'stripe';

// Use STRIPE_SECRET_KEY from environment variables
const secretKey = process.env.STRIPE_SECRET_KEY;

const stripe = new Stripe(secretKey || 'sk_test_placeholder', {
  apiVersion: '2025-01-27.acacia',
});

export default stripe; 