import { Alert, Typography } from '@mui/material';
import { useTranslation } from '../hooks/useTranslation';

export default function CancellationConfirmation() {
  const { t } = useTranslation();
  
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <Alert severity="success" sx={{ mb: 2 }}>
        {t('booking.cancellationSuccess')}
      </Alert>
      <Typography>
        {t('booking.refundProcessing')}
      </Typography>
    </div>
  );
} 