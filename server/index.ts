import dotenv from 'dotenv';
// dotenv.config(); // Firebase handles environment variables
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { https } from 'firebase-functions/v2';
import bookingRoutes from './routes/bookings';
import paymentRoutes from './routes/payments';
import path from 'path';
import membersRouter from './routes/members';

// Middleware - Allow only the CLIENT_URL origin from Functions config
const app = express();
const corsOptions = {
  // Temporarily allow all origins for debugging
  origin: true, // process.env.CLIENT_URL,
  credentials: true, // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));
app.use(express.json());

// Initialize Firebase Admin SDK (should be done once)
admin.initializeApp();

// Database connection - Use Firebase config for MongoDB URI
const mongoUri = process.env.DB_MONGO_URI || 
               process.env.FIREBASE_CONFIG_DB_MONGO_URI;

console.log('MongoDB URI available:', !!mongoUri);
console.log('Environment variables:', 
  Object.keys(process.env).filter(key => key.startsWith('FIREBASE_CONFIG')));

mongoose.connect(mongoUri || '')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Could not connect to MongoDB:', err);
    console.error('Check if the VPC connector IP range is whitelisted in MongoDB Atlas');
  });

// Routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/members', membersRouter);

// Static files and fallback

// 404 Handler
app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ message: 'Not Found' });
});

// Error Handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Export the Express app as an HTTPS Cloud Function using v2 syntax
export const api = https.onRequest({
  vpcConnector: 'test1',
  vpcConnectorEgressSettings: 'ALL_TRAFFIC'
}, app); 