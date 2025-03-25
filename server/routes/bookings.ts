import { Router, Request, Response } from 'express';
import { Booking } from '../models/Booking';
import { endOfDay } from 'date-fns';
import { HOURLY_PRICE_IN_SEK } from '../const';
import { Slot } from '../models/Slot';
import crypto from 'crypto';
import Member from '../models/Member';
import mongoose from 'mongoose';
import stripe from '../services/stripe';
import { sendBookingConfirmation } from '../services/email';

const router = Router();

// Get available time slots
router.get('/availability', async (req: Request, res: Response) => {
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
    let slotsRemaining = 0;

    if (member) {
      const yearlySlot = member.yearlySlots.find(year => year.year === currentYear);
      if (!yearlySlot) {
        member.yearlySlots.push({ year: currentYear, usedSlots: [] });
        await member.save();
        const newYearlySlot = member.yearlySlots.find(year => year.year === currentYear);
        if (newYearlySlot) {
          slotsRemaining = 10 - newYearlySlot.usedSlots.length;
        }
      } else {
        slotsRemaining = 10 - yearlySlot.usedSlots.length;
      }
    }

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
      status: paidSlots === 0 ? 'booked' : 'pending',
      booking: newBooking._id
    };
    
    await Slot.updateMany(
      { _id: { $in: slotDocuments.map(s => s._id) } },
      { $set: slotUpdate }
    );

    // Send confirmation email for member bookings (free slots)
    if (paidSlots === 0 && newBooking.payment) {
      try {
        await sendBookingConfirmation({
          bookingId: newBooking._id.toString(),
          userName: user.name,
          userEmail: user.email,
          date: newBooking.date,
          slots: slotDocuments.map(slot => ({
            start: slot.start,
            end: slot.end,
            courtNumber: slot.courtNumber
          })),
          payment: {
            status: newBooking.payment.status,
            amount: newBooking.payment.amount,
            method: newBooking.payment.method || undefined,
            paymentId: newBooking.payment.paymentId || undefined
          },
          cancellationToken: newBooking.cancellationToken
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't throw the error, just log it
      }
    }

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

    const payment = booking.payment || {
      status: 'pending',
      amount: 0,
      method: 'free',
      paymentId: undefined
    };

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
      payment
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ message: 'Error fetching booking' });
  }
});

router.post('/:id/cancel', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (!booking.payment) {
      return res.status(400).json({ message: 'Booking has no payment information' });
    }

    if (booking.payment.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel a completed booking' });
    }

    // Update booking status
    booking.payment.status = 'cancelled';
    await booking.save();

    // Update slots status
    await Slot.updateMany(
      { _id: { $in: booking.slots } },
      { $set: { status: 'available' } }
    );

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ message: 'Error cancelling booking' });
  }
});

export default router; 