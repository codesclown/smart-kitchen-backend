// Shared types for Smart Kitchen Manager

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationInput {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

// Inventory Types
export interface InventoryItemInput {
  name: string;
  category: string;
  defaultUnit: string;
  threshold?: number;
  brand?: string;
  tags?: string[];
  location: StorageLocation;
  imageUrl?: string;
}

export interface InventoryBatchInput {
  quantity: number;
  unit: string;
  expiryDate?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  vendor?: string;
}

export enum StorageLocation {
  PANTRY = 'PANTRY',
  FRIDGE = 'FRIDGE',
  FREEZER = 'FREEZER',
  CONTAINER = 'CONTAINER',
  CABINET = 'CABINET',
}

export enum InventoryStatus {
  OK = 'OK',
  LOW = 'LOW',
  EXPIRING = 'EXPIRING',
  EXPIRED = 'EXPIRED',
}

// Shopping Types
export interface ShoppingListInput {
  title: string;
  type: ShoppingListType;
  description?: string;
  forDate?: string;
}

export interface ShoppingListItemInput {
  name: string;
  quantity?: number;
  unit?: string;
  price?: number;
  notes?: string;
  linkedItemId?: string;
}

export enum ShoppingListType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  FESTIVAL = 'FESTIVAL',
  EVENT = 'EVENT',
  CUSTOM = 'CUSTOM',
}

// Expense Types
export interface ExpenseInput {
  type: ExpenseType;
  amount: number;
  vendor?: string;
  date: string;
  billImageUrl?: string;
  items?: any;
  notes?: string;
  category?: string;
}

export enum ExpenseType {
  RATION = 'RATION',
  FOOD_ORDER = 'FOOD_ORDER',
  GROCERY = 'GROCERY',
  VEGETABLES = 'VEGETABLES',
  FRUITS = 'FRUITS',
  DAIRY = 'DAIRY',
  MEAT = 'MEAT',
  OTHER = 'OTHER',
}

// Reminder Types
export interface ReminderInput {
  type: ReminderType;
  title: string;
  description?: string;
  scheduledAt: string;
  isRecurring?: boolean;
  frequency?: string;
  meta?: any;
}

export enum ReminderType {
  LOW_STOCK = 'LOW_STOCK',
  EXPIRY = 'EXPIRY',
  SHOPPING = 'SHOPPING',
  FESTIVAL = 'FESTIVAL',
  APPLIANCE = 'APPLIANCE',
  GAS_CYLINDER = 'GAS_CYLINDER',
  WATER_CAN = 'WATER_CAN',
  CUSTOM = 'CUSTOM',
}

// Recipe Types
export interface RecipeIngredient {
  name: string;
  amount: string;
  unit: string;
  available: boolean;
}

export interface RecipeStep {
  step: number;
  instruction: string;
  time?: string;
}

export interface Recipe {
  title: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  cuisine?: string;
  prepTime?: number;
  calories?: number;
  difficulty?: string;
  servings?: number;
}

export interface RecipeGenerationInput {
  availableIngredients: string[];
  cuisine?: string;
  prepTime?: number;
  dietary?: string[];
}

// AI Types
export interface AIScanInput {
  imageUrl: string;
  scanType: 'inventory' | 'receipt' | 'recipe';
}

export interface AIScanResult {
  confidence: number;
  processed: boolean;
  scanType: string;
  result: any;
}

// Notification Types
export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  type: 'reminder' | 'alert' | 'info';
}

// File Upload Types
export interface FileUploadResult {
  url: string;
  filename: string;
  size: number;
  contentType: string;
}

// Error Types
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}