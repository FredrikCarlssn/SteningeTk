import apiClient from "./api";
import { Slot, User, Booking } from '../types';

export const createBooking = async (
  slots: Slot[],
  user: User,
  isUnder20: boolean,
  language: 'sv' | 'en' = 'sv'
) => {
  const response = await apiClient.post<{ booking: Booking }>('/api/bookings', {
    slots,
    user,
    isUnder20,
    language
  });
  console.log('Booking id:', response.data.booking.id);
  return response.data.booking.id;
}; 