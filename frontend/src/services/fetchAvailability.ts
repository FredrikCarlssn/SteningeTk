import apiClient from "./api";
import { Slot } from "../types";

export const fetchAvailability = async (date: Date, courtNumber: 1 | 2) => {
    const response = await apiClient.get<Slot[]>(
      '/api/bookings/availability',
      {
        params: {
          date,
          courtNumber,
        },
      }
    );
    return response.data;
  };