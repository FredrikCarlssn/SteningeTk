import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Alert, Typography, Button, Box, CircularProgress, Paper } from '@mui/material';
import { useTranslation } from '../hooks/useTranslation';
import apiClient from '../services/api';

export default function CancellationPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [booking, setBooking] = useState<any>(null);

  // Fetch booking details
  useEffect(() => {
    const fetchBooking = async () => {
      try {
        if (!id) return;
        
        const response = await apiClient.get(`/api/bookings/${id}`);
        setBooking(response.data);
      } catch (error) {
        console.error('Error fetching booking:', error);
        setError(t('booking.notFound'));
      }
    };

    fetchBooking();
  }, [id, t]);

  const handleCancelBooking = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!id || !token) {
        setError(t('booking.invalidParameters'));
        setLoading(false);
        return;
      }
      
      await apiClient.post(`/api/bookings/${id}/cancel`, { 
        token,
        language 
      });
      
      setSuccess(true);
      // Redirect to cancellation confirmation after a delay
      setTimeout(() => {
        navigate('/cancellation-confirmation');
      }, 2000);
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      
      // Handle specific error cases
      if (error.response?.data?.message === 'Cannot cancel a booking that has already started or passed') {
        setError(t('booking.bookingStarted'));
      } else {
        setError(error.response?.data?.message || t('booking.cancellationError'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Alert severity="error" sx={{ mb: 2, width: '100%', maxWidth: 600 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/')}>
          {t('common.backToHome')}
        </Button>
      </Box>
    );
  }

  if (!booking) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 600, width: '100%', mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('booking.cancelBooking')}
        </Typography>

        <Typography variant="body1" paragraph>
          {t('booking.cancelConfirmation')}
        </Typography>

        {booking && (
          <Box sx={{ my: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              {t('booking.details')}
            </Typography>
            <Typography>
              <strong>{t('booking.date')}:</strong> {new Date(booking.date).toLocaleDateString()}
            </Typography>
            {booking.slots && booking.slots.length > 0 && (
              <>
                <Typography>
                  <strong>{t('booking.time')}:</strong> {new Date(booking.slots[0].start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.slots[0].end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
                <Typography>
                  <strong>{t('booking.court')}:</strong> {booking.slots[0].courtNumber}
                </Typography>
              </>
            )}
          </Box>
        )}

        {success ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            {t('booking.cancellationSuccess')}
          </Alert>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button 
              variant="contained" 
              color="error" 
              onClick={handleCancelBooking}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : t('booking.confirmCancel')}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/')}>
              {t('common.cancel')}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
} 