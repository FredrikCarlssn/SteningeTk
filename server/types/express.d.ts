import { Booking } from '../../src/types';

declare module 'express' {
  interface Request {
    booking?: Booking;
  }
} 