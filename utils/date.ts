import { 
  format, 
  formatDistanceToNow, 
  isAfter, 
  isBefore, 
  addDays, 
  addWeeks, 
  addMonths,
  differenceInDays,
  startOfDay,
  endOfDay,
  parseISO
} from 'date-fns';

export function formatDate(date: Date | string, pattern: string = 'yyyy-MM-dd'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, pattern);
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'yyyy-MM-dd HH:mm:ss');
}

export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

export function isExpired(expiryDate: Date | string): boolean {
  const dateObj = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate;
  return isBefore(dateObj, new Date());
}

export function isExpiringSoon(expiryDate: Date | string, days: number = 3): boolean {
  const dateObj = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate;
  const futureDate = addDays(new Date(), days);
  return isBefore(dateObj, futureDate) && isAfter(dateObj, new Date());
}

export function getDaysUntilExpiry(expiryDate: Date | string): number {
  const dateObj = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate;
  return differenceInDays(dateObj, new Date());
}

export function addTimeToDate(date: Date | string, amount: number, unit: 'days' | 'weeks' | 'months'): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  switch (unit) {
    case 'days':
      return addDays(dateObj, amount);
    case 'weeks':
      return addWeeks(dateObj, amount);
    case 'months':
      return addMonths(dateObj, amount);
    default:
      return dateObj;
  }
}

export function getDateRange(period: 'today' | 'week' | 'month' | 'year'): { start: Date; end: Date } {
  const now = new Date();
  
  switch (period) {
    case 'today':
      return {
        start: startOfDay(now),
        end: endOfDay(now),
      };
    case 'week':
      return {
        start: addDays(startOfDay(now), -7),
        end: endOfDay(now),
      };
    case 'month':
      return {
        start: addDays(startOfDay(now), -30),
        end: endOfDay(now),
      };
    case 'year':
      return {
        start: addDays(startOfDay(now), -365),
        end: endOfDay(now),
      };
    default:
      return {
        start: startOfDay(now),
        end: endOfDay(now),
      };
  }
}

export function createDateFromString(dateString: string): Date {
  return parseISO(dateString);
}

export function toISOString(date: Date): string {
  return date.toISOString();
}

export function isValidDateString(dateString: string): boolean {
  try {
    const date = parseISO(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}