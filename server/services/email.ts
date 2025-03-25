import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // Use SSL/TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

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
}

export const sendBookingConfirmation = async (data: BookingEmailData) => {
  const { bookingId, userName, userEmail, date, slots, payment, cancellationToken } = data;

  // Format the date and time
  const formattedDate = format(date, 'PPP', { locale: sv });
  const formattedTime = format(slots[0].start, 'HH:mm') + ' - ' + format(slots[0].end, 'HH:mm');
  const courtNumber = slots[0].courtNumber;

  // Create the email content
  const emailContent = {
    from: process.env.SMTP_FROM_EMAIL,
    to: userEmail,
    subject: 'Bekräftelse på din bokning - Steninge TK',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2c3e50;">Bekräftelse på din bokning</h1>
        <p>Hej ${userName},</p>
        <p>Tack för din bokning! Här är dina bokningsdetaljer:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #2c3e50; margin-top: 0;">Bokningsdetaljer</h2>
          <p><strong>Datum:</strong> ${formattedDate}</p>
          <p><strong>Tid:</strong> ${formattedTime}</p>
          <p><strong>Bana:</strong> ${courtNumber}</p>
          <p><strong>Boknings-ID:</strong> ${bookingId}</p>
          <p><strong>Belopp:</strong> ${payment.amount} SEK</p>
          <p><strong>Status:</strong> ${payment.status === 'completed' ? 'Bekräftad' : 'Väntande betalning'}</p>
        </div>

        <p>För att avbryta din bokning, klicka på följande länk:</p>
        <p><a href="${process.env.CLIENT_URL}/cancel/${bookingId}?token=${cancellationToken}" 
              style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Avbryt bokning
        </a></p>

        <p style="margin-top: 30px; font-size: 0.9em; color: #6c757d;">
          Om du har några frågor, vänligen kontakta oss på ${process.env.SMTP_FROM_EMAIL}
        </p>
      </div>
    `,
    text: `
      Bekräftelse på din bokning
      
      Hej ${userName},
      
      Tack för din bokning! Här är dina bokningsdetaljer:
      
      Datum: ${formattedDate}
      Tid: ${formattedTime}
      Bana: ${courtNumber}
      Boknings-ID: ${bookingId}
      Belopp: ${payment.amount} SEK
      Status: ${payment.status === 'completed' ? 'Bekräftad' : 'Väntande betalning'}
      
      För att avbryta din bokning, besök:
      ${process.env.CLIENT_URL}/cancel/${bookingId}?token=${cancellationToken}
      
      Om du har några frågor, vänligen kontakta oss på ${process.env.SMTP_FROM_EMAIL}
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