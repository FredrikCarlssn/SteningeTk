import { format as dateFnsFormat, parseISO } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';

// Swedish timezone
const SWEDEN_TIMEZONE = 'Europe/Stockholm';

// This function ensures a date is treated as Sweden local time
export const toSwedenLocalTime = (date: Date | string): Date => {
  // Parse string dates if needed
  const parsedDate = typeof date === 'string' ? parseISO(date) : new Date(date);
  
  // Convert to Sweden timezone
  return toZonedTime(parsedDate, SWEDEN_TIMEZONE);
};

// Format a date (coming from server/UTC) to display in Sweden local time
export const formatSwedenTime = (
  date: Date | string,
  formatStr: string = 'HH:mm',
  locale: 'sv' | 'en' = 'sv'
): string => {
  const dateObj = toSwedenLocalTime(date);
  return dateFnsFormat(dateObj, formatStr, { 
    locale: locale === 'sv' ? sv : enUS 
  });
};

// Format a date (from string or Date object) using date-fns
export const formatDate = (
  date: Date | string,
  formatStr: string = 'yyyy-MM-dd',
  locale: 'sv' | 'en' = 'sv'
): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const timezonedDate = toZonedTime(dateObj, SWEDEN_TIMEZONE);
  return dateFnsFormat(timezonedDate, formatStr, { 
    locale: locale === 'sv' ? sv : enUS 
  });
}; 