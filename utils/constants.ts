// Application constants

export const APP_CONFIG = {
  NAME: 'Smart Kitchen Manager',
  VERSION: '1.0.0',
  DESCRIPTION: 'AI-powered kitchen & household management platform',
} as const;

export const API_ENDPOINTS = {
  GRAPHQL: '/graphql',
  UPLOAD: '/upload',
  HEALTH: '/health',
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'kitchen_auth_token',
  USER_DATA: 'kitchen_user_data',
  THEME: 'kitchen_theme',
  LANGUAGE: 'kitchen_language',
  INVENTORY_CACHE: 'kitchen_inventory_cache',
  SHOPPING_CACHE: 'kitchen_shopping_cache',
} as const;

export const CATEGORIES = {
  INVENTORY: [
    'Vegetables',
    'Fruits',
    'Dairy',
    'Grains',
    'Protein',
    'Spices',
    'Beverages',
    'Snacks',
    'Frozen',
    'Pantry',
    'Cooking',
    'Other',
  ],
  EXPENSE: [
    'Ration',
    'Food Order',
    'Grocery',
    'Vegetables',
    'Fruits',
    'Dairy',
    'Meat',
    'Other',
  ],
} as const;

export const UNITS = {
  WEIGHT: ['kg', 'g', 'lb', 'oz'],
  VOLUME: ['L', 'ml', 'cup', 'tbsp', 'tsp'],
  COUNT: ['pcs', 'pack', 'bottle', 'can', 'box'],
  LENGTH: ['cm', 'inch', 'meter'],
} as const;

export const STORAGE_LOCATIONS = {
  PANTRY: 'Pantry',
  FRIDGE: 'Fridge',
  FREEZER: 'Freezer',
  CONTAINER: 'Container',
  CABINET: 'Cabinet',
} as const;

export const KITCHEN_TYPES = {
  HOME: 'Home',
  OFFICE: 'Office',
  PG: 'PG/Hostel',
  HOSTEL: 'Hostel',
} as const;

export const HOUSEHOLD_ROLES = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
} as const;

export const REMINDER_TYPES = {
  LOW_STOCK: 'Low Stock',
  EXPIRY: 'Expiry',
  SHOPPING: 'Shopping',
  FESTIVAL: 'Festival',
  APPLIANCE: 'Appliance',
  GAS_CYLINDER: 'Gas Cylinder',
  WATER_CAN: 'Water Can',
  CUSTOM: 'Custom',
} as const;

export const SHOPPING_LIST_TYPES = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  FESTIVAL: 'Festival',
  EVENT: 'Event',
  CUSTOM: 'Custom',
} as const;

export const USAGE_LOG_TYPES = {
  COOKED: 'Cooked',
  CONSUMED: 'Consumed',
  WASTED: 'Wasted',
  PURCHASED: 'Purchased',
  ADJUSTED: 'Adjusted',
} as const;

export const CUISINES = [
  'Indian',
  'Chinese',
  'Italian',
  'Mexican',
  'Thai',
  'Japanese',
  'Mediterranean',
  'American',
  'French',
  'Korean',
  'Other',
] as const;

export const DIETARY_RESTRICTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'Low-Carb',
  'Keto',
  'Paleo',
  'Halal',
  'Jain',
] as const;

export const FESTIVALS = [
  { id: 'diwali', name: 'Diwali', icon: '🪔' },
  { id: 'holi', name: 'Holi', icon: '🎨' },
  { id: 'eid', name: 'Eid', icon: '🌙' },
  { id: 'christmas', name: 'Christmas', icon: '🎄' },
  { id: 'dussehra', name: 'Dussehra', icon: '🏹' },
  { id: 'karva-chauth', name: 'Karva Chauth', icon: '🌕' },
  { id: 'raksha-bandhan', name: 'Raksha Bandhan', icon: '🎀' },
  { id: 'ganesh-chaturthi', name: 'Ganesh Chaturthi', icon: '🐘' },
] as const;

export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
  ],
  FOLDERS: {
    INVENTORY: 'inventory',
    RECEIPTS: 'receipts',
    AVATARS: 'avatars',
    RECIPES: 'recipes',
  },
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 24 * 60 * 60 * 1000, // 24 hours
} as const;

export const NOTIFICATION_TYPES = {
  REMINDER: 'reminder',
  ALERT: 'alert',
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

export const AI_SCAN_TYPES = {
  INVENTORY: 'inventory',
  RECEIPT: 'receipt',
  RECIPE: 'recipe',
} as const;

export const ITEM_EMOJIS: Record<string, string> = {
  // Vegetables
  tomato: '🍅',
  onion: '🧅',
  potato: '🥔',
  carrot: '🥕',
  broccoli: '🥦',
  pepper: '🌶️',
  corn: '🌽',
  
  // Fruits
  apple: '🍎',
  banana: '🍌',
  orange: '🍊',
  grapes: '🍇',
  strawberry: '🍓',
  mango: '🥭',
  
  // Dairy
  milk: '🥛',
  cheese: '🧀',
  butter: '🧈',
  
  // Grains
  rice: '🌾',
  bread: '🍞',
  wheat: '🌾',
  
  // Protein
  egg: '🥚',
  chicken: '🍗',
  fish: '🐟',
  
  // Others
  oil: '🛢️',
  sugar: '🍬',
  salt: '🧂',
  tea: '🍵',
  coffee: '☕',
} as const;

export const DEFAULT_THRESHOLDS: Record<string, number> = {
  'Vegetables': 1,
  'Fruits': 2,
  'Dairy': 1,
  'Grains': 2,
  'Protein': 1,
  'Spices': 0.5,
  'Beverages': 1,
  'Snacks': 1,
  'Frozen': 1,
  'Pantry': 1,
  'Cooking': 0.5,
  'Other': 1,
} as const;