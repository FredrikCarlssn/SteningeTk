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
  Theme
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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

  const slotStyle = {
    fontSize: '1.2rem',
    color: 'black',
    border: '1px solid rgba(0,0,0,0.1)',
    padding: '0.5rem',
    margin: '0.2rem',
    borderRadius: '4px',
    backgroundColor: 'rgba(255,255,255,0.8)',
    cursor: 'pointer'
  };

  const selectedSlotStyle = {
    ...slotStyle,
    backgroundColor: 'rgba(76,175,80,0.2)',
  };
  
  const pastSlotStyle = {
    ...slotStyle,
    backgroundColor: 'rgba(200,200,200,0.5)',
    color: 'rgba(0,0,0,0.4)',
    cursor: 'not-allowed'
  };

  return (
    <Container maxWidth="md" className="booking-interface" sx={{ 
      py: 4,
      backdropFilter: 'blur(12px)',
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.15)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      my: 4,
      ...sx
    }}>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <DatePicker
        selected={date}
        onChange={(newDate: Date | null) => newDate && setDate(newDate)}
        dateFormat="yyyy-MM-dd"
        minDate={new Date()}
        className="date-picker"
        locale={dateLocale}
        customInput={
          <Button variant="outlined" fullWidth sx={{ mb: 2 }}>
            {date ? format(date, 'yyyy-MM-dd', { locale: dateLocale }) : t('booking.selectDate')}
          </Button>
        }
      />
      
      <Grid container spacing={1} sx={{ mb: 4 }}>
        {slots.map((slot, index) => {
          const isPastSlot = slot.isPast || false;
          return (
            <Grid item xs={2} key={index}>
              <Button
                fullWidth
                variant={selectedSlots.some(s => 
                  s.start.getTime() === slot.start.getTime()
                ) ? 'contained' : 'outlined'}
                color={isPastSlot ? 'inherit' : (slot.available ? 'primary' : 'error')}
                onClick={() => handleSlotClick(slot)}
                disabled={!slot.available || isPastSlot}
                sx={
                  isPastSlot 
                    ? pastSlotStyle 
                    : (selectedSlots.some(s => s.start.getTime() === slot.start.getTime()) 
                        ? selectedSlotStyle 
                        : slotStyle)
                }
              >
                {format(slot.start, 'HH:mm', { locale: dateLocale })}
              </Button>
            </Grid>
          );
        })}
      </Grid>
      
      {selectedSlots.length > 0 && (
        <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircleIcon color="success" sx={{ mr: 1 }} />
            {t('booking.title')}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body1" sx={{fontWeight: "bold"}}>
                {t('booking.court')}:
              </Typography>
              {courtNumber}
              <div>
              <Typography variant="body1" sx={{fontWeight: "bold"}}>
                {t('booking.date')}:
              </Typography>
              {format(date, 'PPP', { locale: dateLocale })}
              </div>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body1" sx={{fontWeight: "bold"}}>
                {t('booking.selectedTimes')}
              </Typography>
              {selectedSlots.map((slot, index) => (
                <div key={index+"g2"}>
                  {format(slot.start, 'HH:mm', { locale: dateLocale })} - {format(new Date(slot.start.getTime() + 60 * 60 * 1000), 'HH:mm', { locale: dateLocale })}
                </div>
              ))}
              <div>
              <Typography variant="body1" sx={{ mt: 1, fontWeight: "bold"
               }}>
               {t('booking.totalPlaytime')}:
            
              </Typography>
              {selectedSlots.length}H
              </div>
              <div>
              <Typography variant="body1" sx={{ mt: 1, fontWeight: "bold"
               }}>
               {t('booking.price')}:
            
              </Typography>
              {isMember && memberSlotsAvailable > 0 && (
                <div>
                  {t('booking.freeSlots')}: {Math.min(selectedSlots.length, memberSlotsAvailable)} × 0 kr<br/>
                </div>
              )}
              {calculateTotalPrice().paidSlots > 0 && (
                <div>
                  {t('booking.paidSlots')}: {calculateTotalPrice().paidSlots} × 80 kr
                  {isUnder20 && ' × 50%'}
                </div>
              )}
              <div style={{ marginTop: '8px' }}>
                {t('booking.total')}: {calculateTotalPrice().total} kr
              </div>
              </div>
            </Grid>
          </Grid>
          
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('booking.name')}
                value={userInfo.name}
                onChange={(e) => setUserInfo({...userInfo, name: e.target.value})}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label={t('booking.email')}
                type="email"
                value={userInfo.email}
                onChange={(e) => setUserInfo({...userInfo, email: e.target.value})}
                sx={{ mb: 2 }}
                error={!!error && error.includes('email')}
                helperText={error.includes('email') && t('form.invalidEmail')}
              />
              <TextField
                fullWidth
                label={t('booking.phone')}
                type="tel"
                value={userInfo.phone}
                onChange={(e) => setUserInfo({...userInfo, phone: e.target.value})}
                error={!!error && error.includes('phone')}
                helperText={error.includes('phone') && t('form.invalidPhone')}
              />
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Checkbox 
                    checked={isUnder20} 
                    onChange={(e) => setIsUnder20(e.target.checked)}
                  />}
                  label={t('booking.under20')}
                />
              </Grid>
            </Grid>
          </Grid>
          
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleBooking}
            sx={{ mt: 2, py: 1.5, fontSize: '1.1rem' }}
          >
            {t('booking.confirm')} {selectedSlots.length} {t(selectedSlots.length === 1 ? 'booking.hour' : 'booking.hours')}
          </Button>
        </Paper>
      )}
    </Container>
  );
}

export default BookingForm; 