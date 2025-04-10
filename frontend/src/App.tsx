import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import BookingForm from './components/BookingForm'
import './App.css'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Checkout } from './components/Checkout'
import { Route, Routes } from 'react-router-dom'
import axios from 'axios'
import { Alert, Typography, Box, Button } from '@mui/material'
import LandingPage from './components/LandingPage'
import { useTranslation } from './hooks/useTranslation'
import Confirmation from './components/Confirmation'
import CancellationPage from './components/CancellationPage'
import CancellationConfirmation from './components/CancellationConfirmation'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)

function App() {
  const location = useLocation()
  const { t } = useTranslation();

  useEffect(() => {
    // Handle redirect from Stripe
    if (location.pathname === '/success') {
      // Payment successful
      alert(t('payment.successMessage'))
      // Handle successful booking
      // Redirect to booking confirmation or home
    } else if (location.pathname === '/cancel') {
      // Payment cancelled
      alert(t('payment.cancelledMessage'))
      // Handle cancelled payment
      // Redirect to booking page or home
    }
  }, [location, t])

  return (
    <div className="container">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/booking" element={<MainAppContent />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/return" element={<ReturnHandler />} />
        <Route path="/confirmation/:id" element={<Confirmation />} />
        <Route path="/cancel/:id" element={<CancellationPage />} />
        <Route path="/cancellation-confirmation" element={<CancellationConfirmation />} />
      </Routes>
    </div>
  )
}

const MainAppContent = () => {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedCourt, setSelectedCourt] = useState<1 | 2>(1)

  return (
    <>
      <Typography variant="h3" component="h1" sx={{ 
        mb: 4, 
        color: 'black',
        fontWeight: 600,
        textAlign: 'center',
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(255,255,255,0.8)',
        p: 3,
        borderRadius: '8px',
        border: '1px solid rgba(0,0,0,0.1)'
      }}>
        {t('booking.title')}
      </Typography>
      
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        justifyContent: 'center',
        mb: 4
      }}>
        <Button
          variant={selectedCourt === 1 ? 'contained' : 'outlined'}
          onClick={() => setSelectedCourt(1)}
          sx={{
            backdropFilter: 'blur(8px)',
            backgroundColor: selectedCourt === 1 ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.05)',
            color: 'black',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.1)'
            },
            fontSize: '1rem',
            p: 2,
            border: '1px solid rgba(0,0,0,0.1)'
          }}
        >
          {t('courts.court1')}
        </Button>
        <Button
          variant={selectedCourt === 2 ? 'contained' : 'outlined'}
          onClick={() => setSelectedCourt(2)}
          sx={{
            backdropFilter: 'blur(8px)',
            backgroundColor: selectedCourt === 2 ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.05)',
            color: 'black',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.1)'
            },
            fontSize: '1rem',
            p: 2,
            border: '1px solid rgba(0,0,0,0.1)'
          }}
        >
          {t('courts.court2')}
        </Button>
      </Box>
      
      <Elements stripe={stripePromise}>
        <BookingForm courtNumber={selectedCourt} date={selectedDate} 
          sx={{
            fontSize: '1.2rem',
            color: 'black',
            border: '1px solid rgba(0,0,0,0.1)',
            p: 2
          }}
        />
      </Elements>
    </>
  )
}

const ReturnHandler = () => {
  const [status, setStatus] = useState<string | null>(null)
  const navigate = useNavigate()
  const { t, language } = useTranslation();

  useEffect(() => {
    const checkStatus = async () => {
      const sessionId = new URLSearchParams(window.location.search).get('session_id')
      if (!sessionId) return

      try {
        const response = await axios.get(`/api/payments/session-status?session_id=${sessionId}`)
        setStatus(response.data.status)
        
        if (response.data.status === 'complete' && response.data.bookingId) {
          await axios.put(`/api/payments/${response.data.bookingId}/complete`, {
            paymentId: response.data.paymentId,
            language
          })
          setTimeout(() => navigate(`/confirmation/${response.data.bookingId}`), 3000)
        }
      } catch (error) {
        console.error('Status check failed:', error)
      }
    }

    checkStatus()
  }, [navigate, language, t])

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      {status === 'complete' ? (
        <Alert severity="success">
          {t('payment.successMessage')}
        </Alert>
      ) : status ? (
        <Alert severity="info">
          {t('payment.statusMessage')}: {status}
        </Alert>
      ) : (
        <Alert severity="warning">
          {t('payment.loadingStatus')}
        </Alert>
      )}
    </div>
  )
}

export default App
