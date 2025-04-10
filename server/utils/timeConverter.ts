/**
 * Time conversion utility for Swedish local time
 */
import { format, formatInTimeZone } from 'date-fns-tz';
import { subHours } from 'date-fns';

// Swedish timezone is 'Europe/Stockholm'
const SWEDISH_TIMEZONE = 'Europe/Stockholm';

/**
 * Converts a UTC date to Swedish local time
 * @param date - Date object or string to convert
 * @returns String representing the date in Swedish local time
 */
export function convertToSwedishTime(date: Date | string): string {
  if (!date) return new Date().toISOString();
  
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  
  // Adjust the time by subtracting 2 hours to correct for the timezone difference
  // This is needed because our dates are being treated as already in Swedish time
  // but displayed as UTC
  const adjustedDate = subHours(inputDate, 2);
  
  // Format without timezone information
  return format(adjustedDate, "yyyy-MM-dd'T'HH:mm:ss.SSS");
}

/**
 * Converts a MongoDB document or any object with date fields to Swedish time
 * @param document - Document or object containing date fields
 * @param dateFields - Array of field names that contain dates to convert
 * @returns A new object with converted dates
 */
export function convertDocumentDatesToSwedishTime<T>(
  document: T, 
  dateFields: string[]
): T {
  if (!document) return document;

  // Create a shallow copy of the document
  const convertedDoc = { ...document } as any;

  // Convert each date field
  dateFields.forEach(field => {
    const paths = field.split('.');
    let currentObj = convertedDoc;
    let value = undefined;
    
    // Navigate to the nested property
    for (let i = 0; i < paths.length - 1; i++) {
      if (!currentObj || !currentObj[paths[i]]) return;
      currentObj = currentObj[paths[i]];
    }
    
    const lastPath = paths[paths.length - 1];
    if (!currentObj) return;
    value = currentObj[lastPath];

    // Handle arrays of dates
    if (Array.isArray(value)) {
      currentObj[lastPath] = value.map(item => {
        if (item instanceof Date || (typeof item === 'string' && !isNaN(Date.parse(item)))) {
          return convertToSwedishTime(item);
        }
        return item;
      });
    } 
    // Handle single date
    else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      currentObj[lastPath] = convertToSwedishTime(value);
    }
  });

  return convertedDoc;
}

/**
 * Applies Swedish time conversion to response data
 * @param res - Express response object
 * @param data - Data to convert
 * @param dateFields - Fields containing dates to convert
 */
export function sendWithSwedishTime(
  res: any, 
  data: any, 
  dateFields: string[]
): void {
  if (Array.isArray(data)) {
    const convertedData = data.map(item => convertDocumentDatesToSwedishTime(item, dateFields));
    res.json(convertedData);
  } else {
    const convertedData = convertDocumentDatesToSwedishTime(data, dateFields);
    res.json(convertedData);
  }
} 