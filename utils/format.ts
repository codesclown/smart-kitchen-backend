// Formatting utilities

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatQuantity(quantity: number, unit: string): string {
  const formattedQty = formatNumber(quantity);
  return `${formattedQty} ${unit}`;
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${Math.round(percentage)}%`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function capitalizeWords(str: string): string {
  return str
    .split(' ')
    .map(word => capitalizeFirst(word))
    .join(' ');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${Math.round(size * 100) / 100} ${sizes[i]}`;
}

export function formatPhoneNumber(phone: string): string {
  // Format Indian phone numbers
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  
  return phone; // Return original if format not recognized
}

export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

export function extractInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
}

export function formatSearchQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize spaces
}

export function highlightText(text: string, query: string): string {
  if (!query) return text;
  
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

export function parseQuantityString(quantityStr: string): { quantity: number; unit: string } {
  const match = quantityStr.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  
  if (match) {
    return {
      quantity: parseFloat(match[1]),
      unit: match[2].trim() || 'pcs',
    };
  }
  
  return {
    quantity: 1,
    unit: quantityStr.trim() || 'pcs',
  };
}

export function formatInventoryStatus(status: string): { label: string; color: string } {
  switch (status.toUpperCase()) {
    case 'OK':
      return { label: 'In Stock', color: 'green' };
    case 'LOW':
      return { label: 'Low Stock', color: 'yellow' };
    case 'EXPIRING':
      return { label: 'Expiring Soon', color: 'orange' };
    case 'EXPIRED':
      return { label: 'Expired', color: 'red' };
    default:
      return { label: status, color: 'gray' };
  }
}