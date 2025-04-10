import { Booking } from '../models/Booking';
import { sendBookingConfirmation as sendMultilingualBookingConfirmation } from '../services/email';

export const sendBookingConfirmation = async (booking: Booking, language: 'sv' | 'en' = 'sv') => {
  if (!booking.populated('slots')) {
    await booking.populate('slots');
  }
  
  const slots = booking.slots.map((slot: any) => ({
    start: new Date(slot.start),
    end: new Date(slot.end),
    courtNumber: slot.courtNumber
  }));
  
  await sendMultilingualBookingConfirmation({
    bookingId: booking._id.toString(),
    userName: booking.user.name,
    userEmail: booking.user.email,
    date: booking.date,
    slots,
    payment: {
      status: booking.payment.status,
      amount: booking.payment.amount,
      method: booking.payment.method,
      paymentId: booking.payment.paymentId
    },
    cancellationToken: booking.cancellationToken,
    language
  });
}; 