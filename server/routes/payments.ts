import express from 'express';
import Stripe from 'stripe';
import { Slot } from '../models/Slot';
import { Booking } from '../models/Booking';
import { Request, Response } from 'express';
const router = express.Router();
import { HOURLY_PRICE_IN_SEK } from '../const';
import { Collection } from 'mongoose';
import { sendBookingConfirmation } from '../utils/email';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia'
});

router.post('/create-checkout-session', async (req, res) => {
  const { bookingId } = req.body;
  
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    console.log(JSON.stringify(booking, null, 2));
    console.log("payment amount", booking.payment?.amount);
    console.log("slots length", booking.slots.length);
    console.log("hourly price", HOURLY_PRICE_IN_SEK);
    console.log("payment amount * hourly price", booking.payment ? booking.payment.amount * HOURLY_PRICE_IN_SEK : 0);
    console.log("slots length * hourly price", booking.slots.length * HOURLY_PRICE_IN_SEK);

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      line_items: [{
        price_data: {
          currency: 'sek',
          product_data: {
            name: `Tennis Court Booking (${booking.slots.length} hours)`,
          },
          unit_amount: HOURLY_PRICE_IN_SEK * 100,
        },
        quantity: booking.slots.length,
      }],
      mode: 'payment',
      return_url: `${process.env.CLIENT_URL}/return?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        bookingId: bookingId.toString()
      }
    });

    res.json({ clientSecret: session.client_secret });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Error creating checkout session' });
  }
});

// Add session status endpoint
router.get('/session-status', async (req, res) => {
  const { session_id } = req.query;
  
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id as string, {
      expand: ['payment_intent']
    });
    
    res.json({
      status: session.status,
      customer_email: session.customer_details?.email,
      paymentId: session.payment_intent as string,
      bookingId: session.metadata?.bookingId
    });
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving session status' });
  }
});

// Add new routes for payment updates
router.put('/:id/complete', async (req: Request<{ id: string }>, res: Response) => {
  const { paymentId } = req.body;
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { 
        'payment.status': 'completed',
        'payment.paymentId': paymentId
      },
      { new: true }
    );

    

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    await Slot.updateMany(
      { booking: booking._id }, 
      { $set: { status: 'booked' } }
    );
    
    await sendBookingConfirmation(booking);
    
    res.json({ 
      message: 'Booking payment completed',
      booking 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating booking' });
  }
});

export default router; 