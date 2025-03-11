import express, { NextFunction } from 'express';
import { Booking } from '../models/Booking';
import { endOfDay } from 'date-fns';
import { Request, Response } from 'express';
import { HOURLY_PRICE_IN_SEK } from '../const';
import { Slot } from '../models/Slot';
import crypto from 'crypto';
import { Member } from '../models/Member';

const router = express.Router();

// Get available time slots
router.get('/availability', async (req, res) => {
  const { date, courtNumber } = req.query;
  const localDate = new Date(date as string);
  localDate.setHours(0, 0, 0, 0);

  // Get all possible slots
  const allSlots = generateTimeSlots(localDate, parseInt(courtNumber as string, 10));

  // Find existing booked/pending slots
  const existingSlots = await Slot.find({
    courtNumber: parseInt(courtNumber as string, 10),
    start: { $gte: localDate },
    end: { $lte: endOfDay(localDate) },
    status: { $in: ['booked', 'pending'] }
  });

  // Mark availability
  const slotsWithAvailability = allSlots.map(slot => ({
    start: slot.start,
    end: slot.end,
    courtNumber: parseInt(courtNumber as string, 10),
    available: !existingSlots.some(existing => 
      slot.start < existing.end && 
      slot.end > existing.start
    )
  }));

  res.json(slotsWithAvailability);
});

// Helper function to generate time slots
function generateTimeSlots(date: Date, courtNumber: number) {
  const slots = [];
  const start = new Date(date);
  start.setHours(8, 0, 0, 0); // Courts open at 8am
  const end = new Date(date);
  end.setHours(22, 0, 0, 0); // Courts close at 10pm

  while (start < end) {
    const slotEnd = new Date(start.getTime() + 60 * 60000); // 60-minute slots
    slots.push({
      start: new Date(start),
      end: new Date(slotEnd)
    });
    start.setTime(slotEnd.getTime());
  }
  
  return slots;
}

// Add this after the availability route
router.post('/', async (req: Request, res: Response) => {
  try {
    const { slots: selectedSlots, user, isUnder20 } = req.body;

    // Create slot documents
    const slotDocuments = await Promise.all(
      selectedSlots.map(async (slot: { start: Date; end: Date; courtNumber: number }) => {
        const newSlot = new Slot({
          start: slot.start,
          end: slot.end,
          courtNumber: slot.courtNumber,
          status: 'pending'
        });
        return await newSlot.save();
      })
    );

    // Check member status and remaining slots
    const currentYear = new Date().getFullYear();
    const member = await Member.findOne({ email: user.email });
    const yearlySlots = member?.yearlySlots.find((year: { year: number }) => year.year === currentYear);
    if (!yearlySlots) {
      member.yearlySlots.push({ year: currentYear, usedSlots: [] });
      await member.save();
    }

    const slotsRemaining = 10 - yearlySlots.usedSlots.length;
    const freeSlots = Math.min(slotDocuments.length, slotsRemaining);
    const paidSlots = slotDocuments.length - freeSlots;

    // Create booking
    const newBooking = new Booking({
      date: new Date(selectedSlots[0].start),
      slots: slotDocuments.map(s => s._id),
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      payment: {
        method: 'free', // Default for zero amount
        amount: paidSlots * HOURLY_PRICE_IN_SEK,
        status: paidSlots === 0 ? 'completed' : 'pending'
      },
      cancellationToken: crypto.randomBytes(32).toString('hex'),
    });

    await newBooking.save();

    // Update slots based on payment status
    const slotUpdate = {
      status: amount === 0 ? 'booked' : 'pending',
      booking: newBooking._id
    };
    
    await Slot.updateMany(
      { _id: { $in: slotDocuments.map(s => s._id) } },
      { $set: slotUpdate }
    );

    res.status(201).json({ 
      message: `Booking created with ${slotDocuments.length} slot(s)`,
      booking: await newBooking.populate('slots')
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ message: 'Error creating booking' });
  }
});

// Add this route before the payment update routes
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('slots');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({
      id: booking._id,
      date: booking.date,
      slots: booking.slots.map((slot: any) => ({
        start: slot.start,
        end: slot.end,
        courtNumber: slot.courtNumber,
        status: slot.status
      })),
      user: booking.user,
      payment: {
        status: booking.payment?.status,
        amount: booking.payment?.amount,
        method: booking.payment?.method,
        paymentId: booking.payment?.paymentId
      },
      createdAt: booking.createdAt
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ message: 'Error retrieving booking' });
  }
});

router.post('/:id/cancel', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { token } = req.query;
    const booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.cancellationToken !== token) return res.status(401).json({ message: 'Invalid token' });

    // Update booking status
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      { 'payment.status': 'cancelled' },
      { new: true }
    );

    // Free up slots
    await Slot.updateMany(
      { booking: booking._id },
      { $set: { status: 'available' } }
    );

    // Initiate Stripe refund (if payment was completed)
    if (booking.payment.status === 'completed' && booking.payment.paymentId) {
      await stripe.refunds.create({
        payment_intent: booking.payment.paymentId,
      });
    }

    res.json({ message: 'Booking cancelled successfully', booking: updatedBooking });
  } catch (error) {
    console.error('Cancellation error:', error);
    res.status(500).json({ message: 'Error cancelling booking' });
  }
});

export default router; 