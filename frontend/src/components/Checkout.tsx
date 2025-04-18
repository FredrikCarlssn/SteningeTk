import { useCallback, useEffect, useState, useRef } from 'react';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js';
import { useLocation } from 'react-router-dom';
import apiClient from '../services/api';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export const Checkout = () => {
  const location = useLocation();
  const bookingId = new URLSearchParams(location.search).get('bookingId');
  // Track if checkout was successfully completed to avoid releasing slots unnecessarily
  const [checkoutCompleted, setCheckoutCompleted] = useState(false);
  // Use ref to handle unmounting properly
  const hasNavigatedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    if (!bookingId) throw new Error('Missing booking ID');
    
    try {
      const response = await apiClient.post('/api/payments/create-checkout-session', {
        bookingId
      });
      return response.data.clientSecret;
    } catch (error: any) {
      console.error('Failed to create checkout session:', error);
      
      // Extract more detailed error message if available
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message ||
                          'Unable to create checkout session. Please try again later.';
      
      setError(`Checkout error: ${errorMessage}. Please contact support.`);
      
      // Throw error for Stripe to catch
      throw new Error(errorMessage);
    }
  }, [bookingId]);

  // Handle when user leaves the checkout page
  useEffect(() => {
    // Handle browser tab closing or navigation away
    const handleBeforeUnload = () => {
      if (bookingId && !checkoutCompleted && !hasNavigatedRef.current) {
        try {
          // Use synchronous approach for beforeunload
          // Can't use apiClient with sendBeacon, so construct the full URL
          const baseUrl = apiClient.defaults.baseURL || window.location.origin;
          const apiUrl = `${baseUrl}/api/payments/release-pending-booking`;
          navigator.sendBeacon(
            apiUrl, 
            JSON.stringify({ bookingId })
          );
        } catch (error) {
          console.error('Failed to send beacon:', error);
        }
      }
    };

    // Add beforeunload listener for tab closing
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Remove the event listener
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Only release booking if the checkout wasn't completed and this is a genuine page navigation
      if (bookingId && !checkoutCompleted && !hasNavigatedRef.current) {
        // Release the reserved timeslot if the user navigates away
        apiClient.post(`/api/payments/release-pending-booking`, {
          bookingId
        }).catch(error => {
          console.error('Failed to release booking:', error);
          // No need to throw here since this is in cleanup
        });
      }
    };
  }, [bookingId, checkoutCompleted]);

  // Listen for redirect events from Stripe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'stripe-embedded-checkout:completed') {
        setCheckoutCompleted(true);
        hasNavigatedRef.current = true;
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      {error && (
        <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#ffdddd', borderRadius: '4px' }}>
          <h3>Payment Error</h3>
          <p>{error}</p>
          <div style={{ marginTop: '1rem' }}>
            <p>Please try again later or contact support with this information:</p>
            <code>Booking ID: {bookingId}</code>
          </div>
        </div>
      )}
      
      {bookingId && !error ? (
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{ fetchClientSecret }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      ) : !error && (
        <div className="error-message">
          <h2>Error: Missing booking information</h2>
          <p>Please try again or contact support.</p>
        </div>
      )}
    </div>
  );
}; 