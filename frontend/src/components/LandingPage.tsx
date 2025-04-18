import { Button, Container, Typography, Box, IconButton, Grid } from '@mui/material';
import { Link } from 'react-router-dom';
import courtHero from '../../public/court-hero.jpeg';
import { useTranslation } from '../hooks/useTranslation';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';

export default function LandingPage() {
  const { t, switchLanguage } = useTranslation();
  
  return (
    <Box className="landing-page">
      {/* Hero Section */}
      <Box 
        sx={{ 
          minHeight: '100vh',
          background: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${courtHero})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Language Toggle */}
        <Box sx={{ 
          position: 'absolute', 
          top: 24, 
          right: 24, 
          display: 'flex', 
          gap: 1,
          zIndex: 10
        }}>
          <IconButton 
            onClick={() => switchLanguage('sv')}
            className="language-button"
            sx={{ 
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(255,255,255,0.1)',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              padding: '8px 16px',
              '&:hover': { 
                backgroundColor: 'rgba(255,255,255,0.2)',
                transform: 'translateY(-2px)'
              }
            }}
          >
            <Typography variant="button">SV</Typography>
          </IconButton>
          <IconButton 
            onClick={() => switchLanguage('en')}
            className="language-button"
            sx={{ 
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(255,255,255,0.1)',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              padding: '8px 16px',
              '&:hover': { 
                backgroundColor: 'rgba(255,255,255,0.2)',
                transform: 'translateY(-2px)'
              }
            }}
          >
            <Typography variant="button">EN</Typography>
          </IconButton>
        </Box>

        <Container maxWidth="md" sx={{ 
          position: 'relative',
          zIndex: 1,
          textAlign: 'center'
        }}>
          {/* Hero Content */}
          <Box sx={{ 
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: {xs: '2rem', md: '3rem'},
            marginBottom: '2rem',
            animation: 'fadeIn 0.8s ease-out',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)'
          }}>
            <Typography 
              variant="h1" 
              component="h1" 
              sx={{ 
                fontWeight: 800,
                color: 'white',
                textTransform: 'uppercase',
                marginBottom: '1rem',
                letterSpacing: '0.05em',
                textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                fontSize: {xs: '2.5rem', md: '3.5rem'},
                lineHeight: 1.2
              }}
            >
              Steninge
            </Typography>
            <Typography 
              variant="h1" 
              component="h1" 
              sx={{ 
                fontWeight: 800,
                color: 'white',
                textTransform: 'uppercase',
                marginBottom: '2rem',
                letterSpacing: '0.05em',
                textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                fontSize: {xs: '2.5rem', md: '3.5rem'},
                lineHeight: 1.2
              }}
            >
              Tennisklubb
            </Typography>
            
            <Typography 
              variant="h5" 
              component="h2" 
              sx={{ 
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '2rem',
                fontWeight: 400,
                maxWidth: '800px',
                margin: '0 auto 2rem',
                lineHeight: 1.6
              }}
            >
              {t('headline')}
            </Typography>
            
            <Button 
              component={Link} 
              to="/booking" 
              variant="contained" 
              size="large"
              className="cta-button"
              sx={{ 
                background: 'linear-gradient(45deg, #4CAF50 0%, #2E7D32 100%)',
                color: 'white',
                padding: {xs: '12px 24px', md: '16px 40px'},
                fontSize: {xs: '1rem', md: '1.1rem'},
                borderRadius: '50px',
                boxShadow: '0 8px 20px rgba(46, 125, 50, 0.4)',
                transition: 'all 0.3s ease',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: '0 12px 28px rgba(46, 125, 50, 0.5)'
                }
              }}
            >
              {t('bookNow')}
            </Button>
          </Box>
        </Container>
      </Box>
      {/* Footer */}
      <Box sx={{ 
        py: 4,
        backgroundColor: '#212121',
        color: 'rgba(255,255,255,0.8)'
      }}>
        <Container maxWidth="lg">
          <Grid container spacing={2} alignItems="center" justifyContent="center">
            <Grid item xs={12} md={6} sx={{ textAlign: {xs: 'center', md: 'right'}, pr: {md: 4} }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: {xs: 'center', md: 'flex-end'}, mb: 1 }}>
                <PhoneIcon sx={{ mr: 1, fontSize: '1rem' }} />
                <Typography variant="body2">
                  {t('phone')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: {xs: 'center', md: 'flex-end'} }}>
                <LocationOnIcon sx={{ mr: 1, fontSize: '1rem' }} />
                <Typography variant="body2">
                  {t('address')}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6} sx={{ textAlign: {xs: 'center', md: 'left'}, pl: {md: 4}, borderLeft: {md: '1px solid rgba(255,255,255,0.1)'} }}>
              <Typography variant="h6" sx={{ mb: 1, color: 'white', fontWeight: 600 }}>
                Steninge TK
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                {t('copyright')}
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
} 