import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bookingRoutes from './routes/bookings';
import paymentRoutes from './routes/payments';
import path from 'path';
import membersRouter from './routes/members';

// Add validation for CLIENT_URL
if (!process.env.CLIENT_URL) {
  throw new Error('Missing CLIENT_URL environment variable');
}

const app = express();
const port = process.env.PORT || 3000;

// Middleware - Allow only the CLIENT_URL origin
app.use(cors({
  origin: process.env.CLIENT_URL, // Use the client URL from environment variable
  credentials: true, // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/members', membersRouter);

// Static files and fallback

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// Error Handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 