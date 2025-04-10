import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import {
  Button,
  Grid,
  Container,
  LinearProgress,
  Alert,
  Paper,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  SxProps,
  Theme,
  Box,
  Divider,
  Chip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import type { Slot } from '../types';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { fetchAvailability } from '../services/fetchAvailability';
import { createBooking } from '../services/createBooking';
import axios, { AxiosError } from 'axios';
import { useTranslation } from '../hooks/useTranslation';

interface BookingFormProps {
  courtNumber: 1 | 2;
  date: Date;
  sx?: SxProps<Theme>;
}

function BookingForm({ courtNumber, date: initialDate, sx }: BookingFormProps) {
  const { t, language } = useTranslation();
  const [date, setDate] = useState<Date>(initialDate);
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [isUnder20, setIsUnder20] = useState(false);
  const [memberSlotsAvailable, setMemberSlotsAvailable] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const dateLocale = language === 'sv' ? sv : enUS;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setSelectedSlots([]);
        
        const availability = await fetchAvailability(date, courtNumber);
        console.log('Availability:', availability);
        // Directly use server-provided slots with availability
        const generatedSlots = availability.map((slot: Slot) => {
          const now = new Date();
          const slotStartTime = new Date(slot.start);
          const isPastSlot = now >= slotStartTime;
          
          return {
            start: slotStartTime,
            end: new Date(slot.end),
            available: slot.available && !isPastSlot, // Mark past slots as unavailable
            courtNumber: slot.courtNumber,
            booking: slot.booking,
            status: slot.status,
            isPast: isPastSlot // Add flag to identify past slots
          };
        });

        setSlots(generatedSlots);
      } catch (err) {
        console.error('Error fetching availability:', err);
        setError(t('booking.failedToLoadAvailability'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [date, courtNumber, t]);

  useEffect(() => {
    const checkMemberStatus = async () => {
      if (userInfo.email) {
        try {
          const response = await axios.get(`/api/members/${encodeURIComponent(userInfo.email)}`);
          setIsMember(response.data.isMember);
          setMemberSlotsAvailable(response.data.slotsRemaining);
        } catch (error) {
          if (!(error instanceof AxiosError && error.response?.status === 404)) {
            console.error('Error checking member status:', error);
          }
          setIsMember(false);
          setMemberSlotsAvailable(0);
        }
      }
    };
    
    const debounceTimer = setTimeout(checkMemberStatus, 500);
    return () => clearTimeout(debounceTimer);
  }, [userInfo.email]);

  const handleSlotClick = (clickedSlot: Slot) => {
    setError('');
    
    setSelectedSlots(prev => {
      const isSelected = prev.some(s => 
        s.start.getTime() === clickedSlot.start.getTime()
      );
      if (isSelected) {
        return prev.filter(s => 
          s.start.getTime() !== clickedSlot.start.getTime()
        );
      }
      return [...prev, clickedSlot];
    });
  };

  const calculateTotalPrice = () => {
    const basePricePerSlot = 80;
    let totalSlots = selectedSlots.length;
    
    // Apply member discount
    const freeSlots = Math.min(totalSlots, memberSlotsAvailable);
    const paidSlots = Math.max(totalSlots - freeSlots, 0);
    let total = paidSlots * basePricePerSlot;

    // Apply age discount
    if (isUnder20) {
      total *= 0.5;
    }

    return { total, freeSlots, paidSlots };
  };

  const handleBooking = async () => {
    try {
      setLoading(true);
      setError('');

      // Validate user input
      if (!userInfo.name || !userInfo.email || !userInfo.phone) {
        throw new Error(t('form.required'));
      }

      const { total } = calculateTotalPrice();

      // Create booking with the current language
      const bookingId = await createBooking(selectedSlots, userInfo, isUnder20, language);

      // Store language preference in localStorage
      localStorage.setItem('preferredLanguage', language);
      
      // Redirect based on price
      if (total > 0) {
        window.location.href = `/checkout?bookingId=${bookingId}`;
      } else {
        window.location.href = `/confirmation/${bookingId}`;
      }

    } catch (error) {
      console.error('Booking error:', error);
      setError(error instanceof Error ? error.message : t('booking.bookingFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={0} className="booking-form card" sx={{p: 4, ...sx}}>
      {/* Date Selection Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarTodayIcon fontSize="small" />
          {t('booking.selectDate')}
        </Typography>
        <DatePicker
          selected={date}
          onChange={(date: Date | null) => date && setDate(date)}
          dateFormat="yyyy-MM-dd"
          minDate={new Date()}
          locale={dateLocale}
          inline
          className="date-picker"
        />
      </Box>
      
      <Divider sx={{ my: 3 }}>
        <Chip 
          label={t('booking.availableTimes')} 
          sx={{ 
            backgroundColor: 'var(--primary-light)', 
            color: 'var(--text-color)',
            fontWeight: 500
          }} 
        />
      </Divider>
      
      {/* Time Slots Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessTimeIcon fontSize="small" />
          {t('booking.selectTime')}
        </Typography>
        
        {loading ? (
          <Box sx={{ my: 3 }}>
            <LinearProgress sx={{ height: 6, borderRadius: 3 }} />
            <Typography variant="body2" sx={{ mt: 1, textAlign: 'center', color: 'var(--text-secondary)' }}>
              {t('booking.loadingAvailability')}
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        ) : (
          <Grid container spacing={2} className="time-grid">
            {slots.map((slot, index) => {
              const startTime = format(slot.start, 'HH:mm');
              const endTime = format(slot.end, 'HH:mm');
              const isSelected = selectedSlots.some(s => s.start.getTime() === slot.start.getTime());
              const isDisabled = !slot.available || slot.isPast;
              
              return (
                <Grid item xs={4} sm={3} md={2} key={index}>
                  <Button
                    fullWidth
                    variant={isSelected ? "contained" : "outlined"}
                    onClick={() => !isDisabled && handleSlotClick(slot)}
                    disabled={isDisabled}
                    className={`time-slot ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                    sx={{
                      borderRadius: 'var(--border-radius)',
                      padding: '12px 8px',
                      backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                      color: isSelected ? 'var(--text-color)' : isDisabled ? 'var(--text-secondary)' : 'var(--text-color)',
                      border: `1px solid ${isSelected ? 'var(--primary-color)' : isDisabled ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.12)'}`,
                      transition: 'var(--transition)',
                      '&:hover': {
                        backgroundColor: isSelected ? 'var(--primary-light)' : !isDisabled ? 'rgba(0,0,0,0.04)' : undefined,
                        transform: !isDisabled ? 'translateY(-2px)' : undefined
                      }
                    }}
                  >
                    {startTime} - {endTime}
                    {isSelected && <CheckCircleIcon sx={{ ml: 1, fontSize: 16, color: 'var(--primary-dark)' }} />}
                  </Button>
                </Grid>
              );
            })}
          </Grid>
        )}

        {selectedSlots.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: 'var(--primary-dark)', fontWeight: 500 }}>
              {t('booking.selected', { count: selectedSlots.length })}
            </Typography>
          </Box>
        )}
      </Box>

      {selectedSlots.length > 0 && (
        <>
          <Divider sx={{ my: 3 }}>
            <Chip 
              label={t('booking.yourInformation')} 
              sx={{ 
                backgroundColor: 'var(--primary-light)', 
                color: 'var(--text-color)',
                fontWeight: 500
              }} 
            />
          </Divider>
          
          {/* User Information Form */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" component="h2" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon fontSize="small" />
              {t('booking.contactDetails')}
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('form.name')}
                  value={userInfo.name}
                  onChange={(e) => setUserInfo({...userInfo, name: e.target.value})}
                  variant="outlined"
                  required
                  InputProps={{
                    sx: { 
                      borderRadius: 'var(--border-radius)'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('form.email')}
                  value={userInfo.email}
                  onChange={(e) => setUserInfo({...userInfo, email: e.target.value})}
                  variant="outlined"
                  required
                  type="email"
                  InputProps={{
                    sx: { 
                      borderRadius: 'var(--border-radius)'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('form.phone')}
                  value={userInfo.phone}
                  onChange={(e) => setUserInfo({...userInfo, phone: e.target.value})}
                  variant="outlined"
                  required
                  InputProps={{
                    sx: { 
                      borderRadius: 'var(--border-radius)'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isUnder20}
                      onChange={(e) => setIsUnder20(e.target.checked)}
                      sx={{ 
                        color: 'var(--primary-color)',
                        '&.Mui-checked': {
                          color: 'var(--primary-color)',
                        }
                      }}
                    />
                  }
                  label={t('form.under20')}
                />
              </Grid>
            </Grid>
          </Box>
          
          {/* Booking Summary */}
          <Box className="booking-summary" sx={{ p: 3, borderRadius: 'var(--border-radius)' }}>
            <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
              {t('booking.summary')}
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6} md={4}>
                <Typography variant="body2" color="text.secondary">
                  {t('booking.court')}:
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {t(`courts.court${courtNumber}`)}
                </Typography>
              </Grid>
              <Grid item xs={6} md={4}>
                <Typography variant="body2" color="text.secondary">
                  {t('booking.date')}:
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {format(date, 'yyyy-MM-dd')}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  {t('booking.time')}:
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {selectedSlots.length > 0 && `${format(selectedSlots[0].start, 'HH:mm')} - ${format(selectedSlots[selectedSlots.length - 1].end, 'HH:mm')}`}
                </Typography>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body1">{t('booking.totalDuration')}:</Typography>
              <Typography variant="body1" fontWeight={600}>
                {selectedSlots.length} {t('booking.hours', { count: selectedSlots.length })}
              </Typography>
            </Box>
            
            {isMember && memberSlotsAvailable > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body1">{t('booking.memberDiscount')}:</Typography>
                <Typography variant="body1" fontWeight={600} color="success.main">
                  -{Math.min(selectedSlots.length, memberSlotsAvailable)} {t('booking.freeHours')}
                </Typography>
              </Box>
            )}
            
            {isUnder20 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body1">{t('booking.youthDiscountLabel')}</Typography>
                <Typography variant="body1" fontWeight={600} color="success.main">
                  -50% {t('booking.onThePrice')}
                </Typography>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
              <Typography variant="h6">{t('booking.totalPrice')}:</Typography>
              <Typography variant="h6" fontWeight={700} color="primary">
                {calculateTotalPrice().total} kr
              </Typography>
            </Box>
            
            <Button
              fullWidth
              variant="contained"
              onClick={handleBooking}
              disabled={loading || selectedSlots.length === 0}
              className="cta-button"
              sx={{ 
                mt: 3,
                py: 1.5,
                fontWeight: 600,
                borderRadius: 'var(--border-radius)',
                background: 'linear-gradient(45deg, var(--primary-color) 0%, var(--primary-dark) 100%)'
              }}
            >
              {loading ? t('booking.processing') : t('booking.bookNow')}
            </Button>
            
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        </>
      )}
    </Paper>
  );
}

export default BookingForm; 