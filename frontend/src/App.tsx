import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import BookingForm from './components/BookingForm'
import './App.css'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Checkout } from './components/Checkout'
import { Route, Routes } from 'react-router-dom'
import axios from 'axios'
import { Alert, Typography, Box, Button, Container, Paper, CircularProgress, AppBar, Toolbar } from '@mui/material'
import LandingPage from './components/LandingPage'
import { useTranslation } from './hooks/useTranslation'
import Confirmation from './components/Confirmation'
import CancellationPage from './components/CancellationPage'
import CancellationConfirmation from './components/CancellationConfirmation'
import SportsTennisIcon from '@mui/icons-material/SportsTennis'
import LanguageIcon from '@mui/icons-material/Language'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)

function App() {
  const location = useLocation()
  const { t, switchLanguage, language } = useTranslation();

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

  const showHeader = !location.pathname.includes('/') || location.pathname !== '/';

  return (
    <div className="app-container">
      {showHeader && (
        <AppBar position="static" sx={{ 
          backgroundColor: 'var(--surface-color)', 
          color: 'var(--text-color)',
          boxShadow: 'var(--box-shadow)',
          mb: 2
        }}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SportsTennisIcon sx={{ color: 'var(--primary-color)' }} />
              <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                Steninge TK
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                onClick={() => switchLanguage('sv')} 
                sx={{ 
                  color: language === 'sv' ? 'var(--primary-color)' : 'var(--text-secondary)',
                  fontWeight: language === 'sv' ? 600 : 400,
                  borderBottom: language === 'sv' ? '2px solid var(--primary-color)' : 'none',
                  borderRadius: 0,
                  minWidth: 'auto',
                  px: 1
                }}
              >
                SV
              </Button>
              <Button 
                onClick={() => switchLanguage('en')} 
                sx={{ 
                  color: language === 'en' ? 'var(--primary-color)' : 'var(--text-secondary)',
                  fontWeight: language === 'en' ? 600 : 400,
                  borderBottom: language === 'en' ? '2px solid var(--primary-color)' : 'none',
                  borderRadius: 0,
                  minWidth: 'auto',
                  px: 1
                }}
              >
                EN
              </Button>
            </Box>
          </Toolbar>
        </AppBar>
      )}
      
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
    <Container maxWidth="md" className="page-container">
      <Paper elevation={0} className="card" sx={{ mb: 4, p: 4 }}>
        <Typography variant="h4" component="h1" sx={{ 
          mb: 4, 
          fontWeight: 700,
          textAlign: 'center',
          color: 'var(--text-color)'
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
            className={selectedCourt === 1 ? 'court-button active' : 'court-button'}
            sx={{
              backgroundColor: selectedCourt === 1 ? 'var(--primary-light)' : 'transparent',
              color: selectedCourt === 1 ? 'var(--text-color)' : 'var(--text-secondary)',
              borderColor: selectedCourt === 1 ? 'var(--primary-color)' : 'rgba(0,0,0,0.12)',
              fontWeight: 500,
              px: 4,
              py: 1.5,
              borderRadius: 'var(--border-radius)',
              '&:hover': {
                backgroundColor: selectedCourt === 1 ? 'var(--primary-light)' : 'rgba(0,0,0,0.04)'
              }
            }}
          >
            {t('courts.court1')}
          </Button>
          <Button
            variant={selectedCourt === 2 ? 'contained' : 'outlined'}
            onClick={() => setSelectedCourt(2)}
            className={selectedCourt === 2 ? 'court-button active' : 'court-button'}
            sx={{
              backgroundColor: selectedCourt === 2 ? 'var(--primary-light)' : 'transparent',
              color: selectedCourt === 2 ? 'var(--text-color)' : 'var(--text-secondary)',
              borderColor: selectedCourt === 2 ? 'var(--primary-color)' : 'rgba(0,0,0,0.12)',
              fontWeight: 500,
              px: 4,
              py: 1.5,
              borderRadius: 'var(--border-radius)',
              '&:hover': {
                backgroundColor: selectedCourt === 2 ? 'var(--primary-light)' : 'rgba(0,0,0,0.04)'
              }
            }}
          >
            {t('courts.court2')}
          </Button>
        </Box>
      </Paper>
      
      <Elements stripe={stripePromise}>
        <BookingForm courtNumber={selectedCourt} date={selectedDate} />
      </Elements>
    </Container>
  )
}

const ReturnHandler = () => {
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { t, language } = useTranslation();

  useEffect(() => {
    const checkStatus = async () => {
      const sessionId = new URLSearchParams(window.location.search).get('session_id')
      if (!sessionId) {
        setLoading(false)
        return
      }

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
      } finally {
        setLoading(false)
      }
    }

    checkStatus()
  }, [navigate, language, t])

  return (
    <Container maxWidth="md" className="page-container">
      <Paper elevation={0} className="card fade-in" sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" component="h1" sx={{ mb: 4, fontWeight: 600 }}>
          {t('payment.processingTitle')}
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <CircularProgress sx={{ color: 'var(--primary-color)' }} />
            <Typography>{t('payment.loadingStatus')}</Typography>
          </Box>
        ) : status === 'complete' ? (
          <Alert severity="success" sx={{ mb: 3 }}>
            {t('payment.successMessage')}
          </Alert>
        ) : status ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            {t('payment.statusMessage')}: {status}
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {t('payment.loadingStatus')}
          </Alert>
        )}
        
        <Box sx={{ mt: 4 }}>
          <Button 
            variant="outlined" 
            onClick={() => navigate('/')}
            sx={{ 
              borderColor: 'var(--primary-color)', 
              color: 'var(--primary-color)' 
            }}
          >
            {t('common.backToHome')}
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}

export default App
