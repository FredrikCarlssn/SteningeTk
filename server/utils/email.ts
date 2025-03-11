import nodemailer from 'nodemailer';
import { Booking } from '../models/Booking';
import { CLIENT_URL } from '../const';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const sendBookingConfirmation = async (booking: Booking) => {
  const cancelLink = `${CLIENT_URL}/api/bookings/${booking.id}/cancel?token=${booking.cancellationToken}`;
  
  await transporter.sendMail({
    from: `Steninge Tennis <${process.env.SMTP_FROM_EMAIL}>`,
    to: booking.user.email,
    subject: 'Your Tennis Court Booking Confirmation',
    html: `
      <h1>Booking Confirmation</h1>
      <p>Thank you for booking court time at Steninge Tennis Club!</p>
      
      <h2>Booking Details</h2>
      <p>Date: ${new Date(booking.date).toLocaleDateString()}</p>
      <p>Slots Booked: ${booking.slots.length}</p>
      <p>Total Amount: ${booking.payment.amount} SEK</p>
      
      <p>You can cancel your booking at any time using this link:</p>
      <a href="${cancelLink}">Cancel Booking</a>
      
      <p>We look forward to seeing you on the court!</p>
    `
  });
}; 