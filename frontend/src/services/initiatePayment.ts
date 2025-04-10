import apiClient from "./api";

export const initiatePayment = async (bookingId: string) => {
  try {
    // Get booking details to verify amount
    const bookingResponse = await apiClient.get(`/api/bookings/${bookingId}`);
    const amount = bookingResponse.data.payment.amount;

    // Create payment intent with Stripe
    const paymentIntent = await apiClient.post('/api/payments/create-payment-intent', { 
      amount 
    });
    
    return {
      clientSecret: paymentIntent.data.clientSecret,
      bookingId
    };
  } catch (error) {
    console.error('Payment initiation failed:', error);
    throw error;
  }
};
