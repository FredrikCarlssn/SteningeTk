import { Button, Container, Typography, Box, IconButton } from '@mui/material';
import { Link } from 'react-router-dom';
import courtHero from '../../public/court-hero.jpeg';
import { useTranslation } from '../hooks/useTranslation';

export default function LandingPage() {
  const { t, switchLanguage } = useTranslation();
  
  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: `url(${courtHero})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center 30%',
      position: 'relative'
    }}>
      {/* Language Toggle */}
      <Box sx={{ position: 'absolute', top: 24, right: 24, display: 'flex', gap: 1 }}>
        <IconButton 
          onClick={() => switchLanguage('sv')}
          sx={{ 
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(255,255,255,0.1)',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            '&:hover': { 
              backgroundColor: 'rgba(255,255,255,0.2)',
              transform: 'scale(1.05)'
            }
          }}
        >
          <Typography variant="button">SV</Typography>
        </IconButton>
        <IconButton 
          onClick={() => switchLanguage('en')}
          sx={{ 
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(255,255,255,0.1)',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            '&:hover': { 
              backgroundColor: 'rgba(255,255,255,0.2)',
              transform: 'scale(1.05)'
            }
          }}
        >
          <Typography variant="button">EN</Typography>
        </IconButton>
      </Box>

      <Container maxWidth="md" sx={{ 
        py: 8,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        {/* Hero Section */}
        <Box sx={{ 
          textAlign: 'center',
          py: 15,
          backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.15)',
          mx: 2,
          mt: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <Typography variant="h3" component="h1" sx={{ 
            mb: 3,
            fontWeight: 600,
            letterSpacing: '-0.05em',
            color: 'white',
            textTransform: 'uppercase'
          }}>
            {t('welcome')}
          </Typography>
          <Typography variant="h6" component="h2" sx={{ 
            mb: 3,
            fontWeight: 600,
            letterSpacing: '-0.05em',
            color: 'white'
          }}>
            {t('headline')}
          </Typography>
          
          <Button 
            component={Link} 
            to="/booking" 
            variant="contained" 
            size="large" 
            sx={{ 
              background: 'linear-gradient(45deg, #4CAF50 0%, #45a049 100%)',
              color: 'white',
              px: 8,
              py: 2,
              fontSize: '1.1rem',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(76,175,80,0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 12px 32px rgba(76,175,80,0.4)'
              }
            }}
          >
            {t('bookNow')}
          </Button>
        </Box>
        {/* Footer */}
        <Box sx={{ 
          textAlign: 'center', 
          py: 4,
          borderTop: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(255,255,255,0.05)'
        }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            {t('phone')}<br />
            {t('address')}
          </Typography>
          <Typography variant="caption" sx={{ 
            display: 'block',
            mt: 2,
            color: 'rgba(255,255,255,0.6)'
          }}>
            {t('copyright')}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
} 