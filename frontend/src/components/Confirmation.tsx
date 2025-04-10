import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Typography, Box, Paper, CircularProgress, Alert } from '@mui/material';
import { format } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import { useTranslation } from '../hooks/useTranslation';

interface BookingDetails {
  id: string;
  date: string;
  slots: Array<{
    start: string;
    end: string;
    courtNumber: number;
    status: string;
  }>;
  user: {
    name: string;
    email: string;
    phone: string;
  };
  payment: {
    status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
    amount: number;
    method: string;
    paymentId?: string;
  };
  createdAt: string;
  cancellationToken: string;
}

export default function Confirmation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get the date formatting locale based on current language
  const dateLocale = language === 'sv' ? sv : enUS;

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await axios.get(`/api/bookings/${id}`);
        setBooking(response.data);
      } catch (err) {
        setError(t('confirmation.failedToLoad'));
        console.error('Error fetching booking:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchBooking();
    }
  }, [id, t]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !booking) {
    return (
      <Box p={3}>
        <Alert severity="error">{error || t('confirmation.bookingNotFound')}</Alert>
        <Box mt={2}>
          <Typography variant="body1">
            <a href="/" style={{ color: 'inherit', textDecoration: 'underline' }}>
              {t('confirmation.returnHome')}
            </a>
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box p={3} maxWidth="800px" mx="auto">
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('confirmation.title')}
        </Typography>

        <Alert severity="success" sx={{ mb: 3 }}>
          {t('confirmation.successMessage')}
        </Alert>

        <Box mb={4}>
          <Typography variant="h6" gutterBottom>
            {t('confirmation.bookingDetails')}
          </Typography>
          <Typography>
            {t('confirmation.date')}: {format(new Date(booking.date), 'PPP', { locale: dateLocale })}
          </Typography>
          <Typography>
            {t('confirmation.time')}: {format(new Date(booking.slots[0].start), 'p', { locale: dateLocale })} - {format(new Date(booking.slots[0].end), 'p', { locale: dateLocale })}
          </Typography>
          <Typography>
            {t('confirmation.court')}: {t(`courts.court${booking.slots[0].courtNumber}`)}
          </Typography>
        </Box>

        <Box mb={4}>
          <Typography variant="h6" gutterBottom>
            {t('confirmation.paymentDetails')}
          </Typography>
          <Typography>
            {t('confirmation.amount')}: {booking.payment.amount} SEK
          </Typography>
          <Typography>
            {t('confirmation.status')}: {t(`payment.status.${booking.payment.status}`)}
          </Typography>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            {t('confirmation.contactDetails')}
          </Typography>
          <Typography>
            {t('confirmation.name')}: {booking.user.name}
          </Typography>
          <Typography>
            {t('confirmation.email')}: {booking.user.email}
          </Typography>
          <Typography>
            {t('confirmation.phone')}: {booking.user.phone}
          </Typography>
        </Box>

        <Box mt={4}>
          <Typography variant="body2" color="text.secondary">
            {t('confirmation.bookingId')}: {booking.id}
          </Typography>
        </Box>

        <Box mt={4}>
          <Typography variant="body1">
            <a href="/" style={{ color: 'inherit', textDecoration: 'underline' }}>
              {t('confirmation.returnHome')}
            </a>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
} 