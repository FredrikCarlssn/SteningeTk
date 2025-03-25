import axios from 'axios';
import { Slot, User, Booking } from '../types';

export const createBooking = async (
  slots: Slot[],
  user: User,
  isUnder20: boolean
) => {
  const response = await axios.post<{ booking: Booking }>('/api/bookings', {
    slots,
    user,
    isUnder20
  });
  console.log('Booking id:', response.data.booking.id);
  return response.data.booking.id;
}; 