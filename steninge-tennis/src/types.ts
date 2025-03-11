export interface Slot {
  start: Date;
  end: Date;
  courtNumber: 1 | 2;
  available: boolean;
  booking: Booking | null;
  status: 'available' | 'booked' | 'pending' | null;
}

export interface User {
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface Payment {
  method: 'card' | 'swish' | 'stripe' | 'free' | null;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  paymentId: string | null;
  isMember: boolean | null;
}

export interface Booking {
  id: string;
  slots: Slot[];
  user: User;
  payment: Payment;
  createdAt: Date;
} 
