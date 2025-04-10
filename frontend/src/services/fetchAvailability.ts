import apiClient from "./api";
import { Slot } from "../types";

export const fetchAvailability = async (date: Date, courtNumber: 1 | 2) => {
    // Format date as ISO string 
    const formattedDate = date.toISOString();
    
    try {
      const response = await apiClient.get<Slot[]>(
        '/api/bookings/availability',
        {
          params: {
            date: formattedDate,
            courtNumber,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching availability:', error);
      throw error;
    }
  };