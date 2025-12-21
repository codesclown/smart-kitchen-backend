import { z } from 'zod';

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').optional(),
});

// Inventory validation schemas
export const inventoryItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  defaultUnit: z.string().min(1, 'Unit is required'),
  threshold: z.number().min(0).optional(),
  brand: z.string().optional(),
  tags: z.array(z.string()).optional(),
  location: z.enum(['PANTRY', 'FRIDGE', 'FREEZER', 'CONTAINER', 'CABINET']),
  imageUrl: z.string().url().optional(),
});

export const inventoryBatchSchema = z.object({
  quantity: z.number().min(0, 'Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  expiryDate: z.string().datetime().optional(),
  purchaseDate: z.string().datetime().optional(),
  purchasePrice: z.number().min(0).optional(),
  vendor: z.string().optional(),
});

// Shopping validation schemas
export const shoppingListSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'FESTIVAL', 'EVENT', 'CUSTOM']),
  description: z.string().optional(),
  forDate: z.string().datetime().optional(),
});

export const shoppingListItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  quantity: z.number().min(0).optional(),
  unit: z.string().optional(),
  price: z.number().min(0).optional(),
  notes: z.string().optional(),
  linkedItemId: z.string().optional(),
});

// Expense validation schemas
export const expenseSchema = z.object({
  type: z.enum(['RATION', 'FOOD_ORDER', 'GROCERY', 'VEGETABLES', 'FRUITS', 'DAIRY', 'MEAT', 'OTHER']),
  amount: z.number().min(0, 'Amount must be positive'),
  vendor: z.string().optional(),
  date: z.string().datetime(),
  billImageUrl: z.string().url().optional(),
  items: z.any().optional(),
  notes: z.string().optional(),
  category: z.string().optional(),
});

// Reminder validation schemas
export const reminderSchema = z.object({
  type: z.enum(['LOW_STOCK', 'EXPIRY', 'SHOPPING', 'FESTIVAL', 'APPLIANCE', 'GAS_CYLINDER', 'WATER_CAN', 'CUSTOM']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  scheduledAt: z.string().datetime(),
  isRecurring: z.boolean().optional(),
  frequency: z.string().optional(),
  meta: z.any().optional(),
});

// Household validation schemas
export const householdSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export const kitchenSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  type: z.enum(['HOME', 'OFFICE', 'PG', 'HOSTEL']),
});

// Usage log validation schemas
export const usageLogSchema = z.object({
  type: z.enum(['COOKED', 'CONSUMED', 'WASTED', 'PURCHASED', 'ADJUSTED']),
  quantity: z.number().min(0, 'Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  notes: z.string().optional(),
  date: z.string().datetime().optional(),
});

// AI scan validation schemas
export const aiScanSchema = z.object({
  imageUrl: z.string().url('Invalid image URL'),
  scanType: z.enum(['inventory', 'receipt', 'recipe']),
});

// Recipe generation validation schemas
export const recipeGenerationSchema = z.object({
  availableIngredients: z.array(z.string()).min(1, 'At least one ingredient is required'),
  cuisine: z.string().optional(),
  prepTime: z.number().min(1).max(300).optional(),
  dietary: z.array(z.string()).optional(),
});

// Validation helper functions
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Validation failed: ${messages.join(', ')}`);
    }
    throw error;
  }
}

export function isValidEmail(email: string): boolean {
  return z.string().email().safeParse(email).success;
}

export function isValidUrl(url: string): boolean {
  return z.string().url().safeParse(url).success;
}

export function isValidDate(date: string): boolean {
  return z.string().datetime().safeParse(date).success;
}