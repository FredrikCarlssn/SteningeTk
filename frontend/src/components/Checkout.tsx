import React, { useCallback, useEffect, useState } from 'react';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingId = new URLSearchParams(location.search).get('bookingId');
  // Track if checkout was successfully completed to avoid releasing slots unnecessarily
  const [checkoutCompleted, setCheckoutCompleted] = useState(false);

  const fetchClientSecret = useCallback(async () => {
    if (!bookingId) throw new Error('Missing booking ID');
    
    const response = await axios.post('/api/payments/create-checkout-session', {
      bookingId
    });
    return response.data.clientSecret;
  }, [bookingId]);

  // Handle when user leaves the checkout page
  useEffect(() => {
    // Component mount - no need to do anything here
    
    // Component unmount - release the slots if the checkout was not completed
    return () => {
      if (bookingId && !checkoutCompleted) {
        // Release the reserved timeslot if the user navigates away
        axios.post(`/api/payments/release-pending-booking`, {
          bookingId
        }).catch(error => {
          console.error('Failed to release booking:', error);
        });
      }
    };
  }, [bookingId, checkoutCompleted]);

  // Listen for redirect events from Stripe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'stripe-embedded-checkout:completed') {
        setCheckoutCompleted(true);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ fetchClientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}; 