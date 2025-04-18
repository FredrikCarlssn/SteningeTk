import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { sv, enUS, Locale } from 'date-fns/locale';
// import { getSwedishTranslations, Translations } from '../utils/translations'; // Comment out missing import

// Create transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // Use environment variable
  port: parseInt(process.env.SMTP_PORT || '465'), // Use environment variable
  secure: parseInt(process.env.SMTP_PORT || '465') === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // Use environment variable
    pass: process.env.SMTP_PASSWORD, // Use environment variable
  },
});

// Sweden timezone
const SWEDEN_TIMEZONE = 'Europe/Stockholm';

// Helper function to format dates in Sweden timezone
const formatInSwedenTimezone = (date: Date, formatStr: string, locale: Locale) => {
  // Convert UTC date to Sweden timezone
  const swedenTime = toZonedTime(date, SWEDEN_TIMEZONE);
  return format(swedenTime, formatStr, { locale });
};

interface BookingEmailData {
  bookingId: string;
  userName: string;
  userEmail: string;
  date: Date;
  slots: Array<{
    start: Date;
    end: Date;
    courtNumber: number;
  }>;
  payment: {
    status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
    amount: number;
    method?: string;
    paymentId?: string;
  };
  cancellationToken: string;
  language?: 'sv' | 'en'; 
}

interface CancellationEmailData {
  bookingId: string;
  userName: string;
  userEmail: string;
  date: Date;
  slots: Array<{
    start: Date;
    end: Date;
    courtNumber: number;
  }>;
  language?: 'sv' | 'en';
}

// Email content translations
const emailTranslations = {
  sv: {
    subject: 'Bekräftelse på din bokning - Steninge TK',
    title: 'Bekräftelse på din bokning',
    greeting: 'Hej',
    thankYou: 'Tack för din bokning! Här är dina bokningsdetaljer:',
    bookingDetails: 'Bokningsdetaljer',
    date: 'Datum',
    time: 'Tid',
    court: 'Bana',
    bookingId: 'Boknings-ID',
    amount: 'Belopp',
    status: 'Status',
    completed: 'Bekräftad',
    pending: 'Väntande betalning',
    cancelLink: 'För att avbryta din bokning, klicka på följande länk:',
    cancelButton: 'Avbryt bokning',
    questions: 'Om du har några frågor, vänligen kontakta oss på'
  },
  en: {
    subject: 'Booking Confirmation - Steninge TK',
    title: 'Booking Confirmation',
    greeting: 'Hello',
    thankYou: 'Thank you for your booking! Here are your booking details:',
    bookingDetails: 'Booking Details',
    date: 'Date',
    time: 'Time',
    court: 'Court',
    bookingId: 'Booking ID',
    amount: 'Amount',
    status: 'Status',
    completed: 'Confirmed',
    pending: 'Awaiting payment',
    cancelLink: 'To cancel your booking, click the following link:',
    cancelButton: 'Cancel booking',
    questions: 'If you have any questions, please contact us at'
  }
};

// Add cancellation-related translations
const cancellationTranslations = {
  sv: {
    subject: 'Bekräftelse på avbokning - Steninge TK',
    title: 'Din bokning har avbokats',
    greeting: 'Hej',
    message: 'Din bokning har nu avbokats. Här är detaljerna för den avbokade bokningen:',
    bookingDetails: 'Bokningsdetaljer',
    date: 'Datum',
    time: 'Tid',
    court: 'Bana',
    bookingId: 'Boknings-ID',
    refundInfo: 'Om du har betalat för denna bokning kommer en återbetalning att behandlas inom kort.',
    questions: 'Om du har några frågor, vänligen kontakta oss på'
  },
  en: {
    subject: 'Booking Cancellation Confirmation - Steninge TK',
    title: 'Your Booking Has Been Cancelled',
    greeting: 'Hello',
    message: 'Your booking has been cancelled. Here are the details of the cancelled booking:',
    bookingDetails: 'Booking Details',
    date: 'Date',
    time: 'Time',
    court: 'Court',
    bookingId: 'Booking ID',
    refundInfo: 'If you paid for this booking, a refund will be processed shortly.',
    questions: 'If you have any questions, please contact us at'
  }
};

export const sendBookingConfirmation = async (data: BookingEmailData) => {
  const { bookingId, userName, userEmail, date, slots, payment, cancellationToken, language = 'sv' } = data;
  const translations = emailTranslations[language];
  const dateLocale = language === 'sv' ? sv : enUS;

  // Format the date and time using Sweden timezone
  const formattedDate = formatInSwedenTimezone(date, 'PPP', dateLocale);
  const formattedStartTime = formatInSwedenTimezone(slots[0].start, 'HH:mm', dateLocale);
  const formattedEndTime = formatInSwedenTimezone(slots[0].end, 'HH:mm', dateLocale);
  const formattedTime = `${formattedStartTime} - ${formattedEndTime}`;
  const courtNumber = slots[0].courtNumber;

  // Create the email content
  const emailContent = {
    from: process.env.SMTP_FROM_EMAIL,
    to: userEmail,
    subject: translations.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2c3e50;">${translations.title}</h1>
        <p>${translations.greeting} ${userName},</p>
        <p>${translations.thankYou}</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #2c3e50; margin-top: 0;">${translations.bookingDetails}</h2>
          <p><strong>${translations.date}:</strong> ${formattedDate}</p>
          <p><strong>${translations.time}:</strong> ${formattedTime}</p>
          <p><strong>${translations.court}:</strong> ${courtNumber}</p>
          <p><strong>${translations.bookingId}:</strong> ${bookingId}</p>
          <p><strong>${translations.amount}:</strong> ${payment.amount} SEK</p>
          <p><strong>${translations.status}:</strong> ${payment.status === 'completed' ? translations.completed : translations.pending}</p>
        </div>

        <p>${translations.cancelLink}</p>
        <p><a href="${process.env.CLIENT_URL}/cancel/${bookingId}?token=${cancellationToken}" 
              style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          ${translations.cancelButton}
        </a></p>

        <p style="margin-top: 30px; font-size: 0.9em; color: #6c757d;">
          ${translations.questions} ${process.env.SMTP_FROM_EMAIL}
        </p>
      </div>
    `,
    text: `
      ${translations.title}
      
      ${translations.greeting} ${userName},
      
      ${translations.thankYou}
      
      ${translations.date}: ${formattedDate}
      ${translations.time}: ${formattedTime}
      ${translations.court}: ${courtNumber}
      ${translations.bookingId}: ${bookingId}
      ${translations.amount}: ${payment.amount} SEK
      ${translations.status}: ${payment.status === 'completed' ? translations.completed : translations.pending}
      
      ${translations.cancelLink}
      ${process.env.CLIENT_URL}/cancel/${bookingId}?token=${cancellationToken}
      
      ${translations.questions} ${process.env.SMTP_FROM_EMAIL}
    `
  };

  try {
    await transporter.sendMail(emailContent);
    console.log('Confirmation email sent successfully');
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    throw error;
  }
};

export const sendCancellationConfirmation = async (data: CancellationEmailData) => {
  const { bookingId, userName, userEmail, date, slots, language = 'sv' } = data;
  const translations = cancellationTranslations[language];
  const dateLocale = language === 'sv' ? sv : enUS;

  // Format the date and time using Sweden timezone
  const formattedDate = formatInSwedenTimezone(date, 'PPP', dateLocale);
  const formattedStartTime = formatInSwedenTimezone(slots[0].start, 'HH:mm', dateLocale);
  const formattedEndTime = formatInSwedenTimezone(slots[0].end, 'HH:mm', dateLocale);
  const formattedTime = `${formattedStartTime} - ${formattedEndTime}`;
  const courtNumber = slots[0].courtNumber;

  // Create the email content
  const emailContent = {
    from: process.env.SMTP_FROM_EMAIL,
    to: userEmail,
    subject: translations.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2c3e50;">${translations.title}</h1>
        <p>${translations.greeting} ${userName},</p>
        <p>${translations.message}</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #2c3e50; margin-top: 0;">${translations.bookingDetails}</h2>
          <p><strong>${translations.date}:</strong> ${formattedDate}</p>
          <p><strong>${translations.time}:</strong> ${formattedTime}</p>
          <p><strong>${translations.court}:</strong> ${courtNumber}</p>
          <p><strong>${translations.bookingId}:</strong> ${bookingId}</p>
        </div>

        <p>${translations.refundInfo}</p>

        <p style="margin-top: 30px; font-size: 0.9em; color: #6c757d;">
          ${translations.questions} ${process.env.SMTP_FROM_EMAIL}
        </p>
      </div>
    `,
    text: `
      ${translations.title}
      
      ${translations.greeting} ${userName},
      
      ${translations.message}
      
      ${translations.date}: ${formattedDate}
      ${translations.time}: ${formattedTime}
      ${translations.court}: ${courtNumber}
      ${translations.bookingId}: ${bookingId}
      
      ${translations.refundInfo}
      
      ${translations.questions} ${process.env.SMTP_FROM_EMAIL}
    `
  };

  try {
    await transporter.sendMail(emailContent);
    console.log('Cancellation confirmation email sent successfully');
  } catch (error) {
    console.error('Error sending cancellation confirmation email:', error);
    throw error;
  }
}; 