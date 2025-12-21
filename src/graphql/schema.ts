import { gql } from 'graphql-tag';
import { DocumentNode } from 'graphql';

export const typeDefs: DocumentNode = gql`
  scalar DateTime
  scalar JSON

  # Auth Types
  type User {
    id: ID!
    email: String!
    name: String
    avatar: String
    phone: String
    emailVerified: Boolean!
    settings: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    households: [HouseholdMember!]!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  # Household Types
  type Household {
    id: ID!
    name: String!
    description: String
    createdBy: User!
    members: [HouseholdMember!]!
    kitchens: [Kitchen!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type HouseholdMember {
    id: ID!
    user: User!
    household: Household!
    role: HouseholdRole!
    joinedAt: DateTime!
  }

  enum HouseholdRole {
    OWNER
    ADMIN
    MEMBER
    VIEWER
  }

  # Kitchen Types
  type Kitchen {
    id: ID!
    household: Household!
    name: String!
    description: String
    type: KitchenType!
    inventory: [InventoryItem!]!
    shopping: [ShoppingList!]!
    expenses: [Expense!]!
    reminders: [Reminder!]!
    logs: [UsageLog!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum KitchenType {
    HOME
    OFFICE
    PG
    HOSTEL
  }

  # Inventory Types
  type InventoryItem {
    id: ID!
    kitchen: Kitchen!
    name: String!
    category: String!
    imageUrl: String
    defaultUnit: String!
    threshold: Float
    brand: String
    tags: [String!]!
    location: StorageLocation!
    batches: [InventoryBatch!]!
    usageLogs: [UsageLog!]!
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Computed fields
    totalQuantity: Float!
    status: InventoryStatus!
    nextExpiry: DateTime
  }

  type InventoryBatch {
    id: ID!
    item: InventoryItem!
    quantity: Float!
    unit: String!
    expiryDate: DateTime
    purchaseDate: DateTime
    purchasePrice: Float
    vendor: String
    status: BatchStatus!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum StorageLocation {
    PANTRY
    FRIDGE
    FREEZER
    CONTAINER
    CABINET
  }

  enum BatchStatus {
    ACTIVE
    USED
    EXPIRED
    WASTED
  }

  enum InventoryStatus {
    OK
    LOW
    EXPIRING
    EXPIRED
  }

  # Shopping Types
  type ShoppingList {
    id: ID!
    kitchen: Kitchen!
    type: ShoppingListType!
    title: String!
    description: String
    forDate: DateTime
    isCompleted: Boolean!
    items: [ShoppingListItem!]!
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Computed fields
    totalItems: Int!
    completedItems: Int!
    estimatedTotal: Float!
  }

  type ShoppingListItem {
    id: ID!
    list: ShoppingList!
    name: String!
    quantity: Float
    unit: String
    linkedItemId: String
    isPurchased: Boolean!
    price: Float
    notes: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum ShoppingListType {
    DAILY
    WEEKLY
    MONTHLY
    FESTIVAL
    EVENT
    CUSTOM
  }

  # Expense Types
  type Expense {
    id: ID!
    kitchen: Kitchen!
    type: ExpenseType!
    amount: Float!
    vendor: String
    date: DateTime!
    billImageUrl: String
    items: JSON
    notes: String
    category: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum ExpenseType {
    RATION
    FOOD_ORDER
    GROCERY
    VEGETABLES
    FRUITS
    DAIRY
    MEAT
    OTHER
  }

  # Reminder Types
  type Reminder {
    id: ID!
    kitchen: Kitchen!
    type: ReminderType!
    title: String!
    description: String
    scheduledAt: DateTime!
    isRecurring: Boolean!
    frequency: String
    isCompleted: Boolean!
    meta: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum ReminderType {
    LOW_STOCK
    EXPIRY
    SHOPPING
    FESTIVAL
    APPLIANCE
    GAS_CYLINDER
    WATER_CAN
    CUSTOM
  }

  # Usage Log Types
  type UsageLog {
    id: ID!
    kitchen: Kitchen!
    item: InventoryItem!
    type: UsageLogType!
    quantity: Float!
    unit: String!
    notes: String
    date: DateTime!
    createdAt: DateTime!
  }

  enum UsageLogType {
    COOKED
    CONSUMED
    WASTED
    PURCHASED
    ADJUSTED
  }

  # Recipe Types
  type RecipeHistory {
    id: ID!
    kitchenId: String
    title: String!
    ingredients: JSON!
    steps: JSON!
    cuisine: String
    prepTime: Int
    calories: Int
    source: String!
    isFavorite: Boolean!
    createdAt: DateTime!
  }

  type GeneratedRecipe {
    title: String!
    ingredients: JSON!
    steps: JSON!
    cuisine: String
    prepTime: Int
    calories: Int
    difficulty: String
    servings: Int
  }

  # AI Scan Types
  type AIScan {
    id: ID!
    imageUrl: String!
    scanType: String!
    result: JSON!
    confidence: Float
    processed: Boolean!
    createdAt: DateTime!
  }

  # Meal Planning Types
  type MealPlan {
    id: ID!
    userId: String!
    kitchenId: String
    date: DateTime!
    mealType: MealType!
    recipeId: String
    recipeName: String
    servings: Int
    calories: Int
    prepTime: Int
    notes: String
    isCompleted: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type MealPlanTemplate {
    id: ID!
    name: String!
    description: String
    category: String!
    meals: JSON!
    duration: Int
    isPublic: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum MealType {
    BREAKFAST
    LUNCH
    DINNER
    SNACK
  }

  # Nutrition Types
  type NutritionEntry {
    id: ID!
    userId: String!
    date: DateTime!
    mealType: MealType!
    foodName: String!
    quantity: Float!
    unit: String!
    calories: Float
    protein: Float
    carbs: Float
    fat: Float
    fiber: Float
    sugar: Float
    sodium: Float
    notes: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type NutritionGoals {
    id: ID!
    userId: String!
    dailyCalories: Float
    dailyProtein: Float
    dailyCarbs: Float
    dailyFat: Float
    dailyFiber: Float
    dailyWater: Float
    weightGoal: Float
    activityLevel: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type DailyNutrition {
    date: DateTime!
    calories: Float!
    protein: Float!
    carbs: Float!
    fat: Float!
    fiber: Float!
    sugar: Float!
    sodium: Float!
    water: Float!
    entries: [NutritionEntry!]!
    waterIntakes: [WaterIntake!]!
  }

  type WaterIntake {
    id: ID!
    userId: String!
    date: DateTime!
    amount: Float!
    time: DateTime!
    createdAt: DateTime!
  }

  # Waste Tracking Types
  type WasteEntry {
    id: ID!
    userId: String!
    kitchenId: String
    date: DateTime!
    itemName: String!
    category: String
    quantity: Float!
    unit: String!
    reason: WasteReason!
    cost: Float
    preventable: Boolean!
    notes: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type WasteGoals {
    id: ID!
    userId: String!
    monthlyWasteKg: Float
    monthlyCostSave: Float
    co2SaveKg: Float
    waterSaveLiters: Float
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type WasteStats {
    period: String!
    startDate: DateTime!
    endDate: DateTime!
    totalEntries: Int!
    totalWasteKg: Float!
    totalCost: Float!
    preventableWasteKg: Float!
    preventablePercentage: Int!
    co2Impact: Float!
    waterImpact: Int!
    categoryBreakdown: [JSON!]!
    reasonBreakdown: [JSON!]!
  }

  enum WasteReason {
    EXPIRED
    SPOILED
    OVERCOOKED
    LEFTOVER
    ACCIDENTAL
    DISLIKED
    OTHER
  }

  # Kitchen Timer Types
  type KitchenTimer {
    id: ID!
    userId: String!
    name: String!
    duration: Int!
    category: TimerCategory!
    isActive: Boolean!
    startedAt: DateTime
    pausedAt: DateTime
    completedAt: DateTime
    notes: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum TimerCategory {
    COOKING
    BAKING
    STEAMING
    BOILING
    MARINATING
    RESTING
    CUSTOM
  }

  type TimerPreset {
    name: String!
    duration: Int!
    category: TimerCategory!
  }

  # Notification Types
  type Notification {
    id: ID!
    userId: String!
    type: NotificationType!
    title: String!
    message: String!
    data: JSON
    isRead: Boolean!
    sentAt: DateTime
    readAt: DateTime
    createdAt: DateTime!
  }

  enum NotificationType {
    EXPIRY_WARNING
    LOW_STOCK
    SHOPPING_REMINDER
    MEAL_PLAN_REMINDER
    TIMER_COMPLETE
    WASTE_GOAL_EXCEEDED
    NUTRITION_GOAL_ACHIEVED
    SYSTEM_UPDATE
    GENERAL
  }

  # Input Types
  input RegisterInput {
    email: String!
    password: String!
    name: String
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input UpdateUserProfileInput {
    name: String
    phone: String
    avatar: String
  }

  input UpdateUserSettingsInput {
    notifications: JSON
    privacy: JSON
    appSettings: JSON
    security: JSON
    support: JSON
  }

  input CreateHouseholdInput {
    name: String!
    description: String
  }

  input CreateKitchenInput {
    householdId: ID!
    name: String!
    description: String
    type: KitchenType!
  }

  input CreateInventoryItemInput {
    kitchenId: ID!
    name: String!
    category: String!
    imageUrl: String
    defaultUnit: String!
    threshold: Float
    brand: String
    tags: [String!]
    location: StorageLocation!
  }

  input CreateInventoryBatchInput {
    itemId: ID!
    quantity: Float!
    unit: String!
    expiryDate: DateTime
    purchaseDate: DateTime
    purchasePrice: Float
    vendor: String
  }

  input UpdateInventoryItemInput {
    name: String
    category: String
    imageUrl: String
    defaultUnit: String
    threshold: Float
    brand: String
    tags: [String!]
    location: StorageLocation
  }

  input CreateShoppingListInput {
    kitchenId: ID!
    type: ShoppingListType!
    title: String!
    description: String
    forDate: DateTime
  }

  input CreateShoppingListItemInput {
    listId: ID!
    name: String!
    quantity: Float
    unit: String
    linkedItemId: String
    price: Float
    notes: String
  }

  input CreateExpenseInput {
    kitchenId: ID!
    type: ExpenseType!
    amount: Float!
    vendor: String
    date: DateTime!
    billImageUrl: String
    items: JSON
    notes: String
    category: String
  }

  input CreateReminderInput {
    kitchenId: ID!
    type: ReminderType!
    title: String!
    description: String
    scheduledAt: DateTime!
    isRecurring: Boolean
    frequency: String
    meta: JSON
  }

  input CreateUsageLogInput {
    kitchenId: ID!
    itemId: ID!
    type: UsageLogType!
    quantity: Float!
    unit: String!
    notes: String
  }

  input AIImageScanInput {
    imageUrl: String!
    scanType: String!
  }

  input GenerateRecipeInput {
    kitchenId: ID!
    availableIngredients: [String!]!
    cuisine: String
    prepTime: Int
    dietary: [String!]
  }

  input SaveRecipeInput {
    kitchenId: ID!
    title: String!
    ingredients: String!
    steps: String!
    cuisine: String
    prepTime: Int
    calories: Int
    isFavorite: Boolean
  }

  # New Input Types for Missing Features
  input CreateMealPlanInput {
    date: DateTime!
    mealType: MealType!
    recipeId: String
    recipeName: String
    servings: Int
    calories: Int
    prepTime: Int
    notes: String
    kitchenId: String
  }

  input UpdateMealPlanInput {
    date: DateTime
    mealType: MealType
    recipeId: String
    recipeName: String
    servings: Int
    calories: Int
    prepTime: Int
    notes: String
    isCompleted: Boolean
  }

  input CreateNutritionEntryInput {
    date: DateTime!
    mealType: MealType!
    foodName: String!
    quantity: Float!
    unit: String!
    calories: Float
    protein: Float
    carbs: Float
    fat: Float
    fiber: Float
    sugar: Float
    sodium: Float
    notes: String
  }

  input UpdateNutritionEntryInput {
    date: DateTime
    mealType: MealType
    foodName: String
    quantity: Float
    unit: String
    calories: Float
    protein: Float
    carbs: Float
    fat: Float
    fiber: Float
    sugar: Float
    sodium: Float
    notes: String
  }

  input UpdateNutritionGoalsInput {
    dailyCalories: Float
    dailyProtein: Float
    dailyCarbs: Float
    dailyFat: Float
    dailyFiber: Float
    dailyWater: Float
    weightGoal: Float
    activityLevel: String
  }

  input CreateWasteEntryInput {
    date: DateTime!
    itemName: String!
    category: String
    quantity: Float!
    unit: String!
    reason: WasteReason!
    cost: Float
    preventable: Boolean
    notes: String
    kitchenId: String
  }

  input UpdateWasteEntryInput {
    date: DateTime
    itemName: String
    category: String
    quantity: Float
    unit: String
    reason: WasteReason
    cost: Float
    preventable: Boolean
    notes: String
  }

  input UpdateWasteGoalsInput {
    monthlyWasteKg: Float
    monthlyCostSave: Float
    co2SaveKg: Float
    waterSaveLiters: Float
  }

  input CreateKitchenTimerInput {
    name: String!
    duration: Int!
    category: TimerCategory!
    notes: String
  }

  input UpdateKitchenTimerInput {
    name: String
    duration: Int
    category: TimerCategory
    notes: String
  }

  input NotificationPreferencesInput {
    email: Boolean
    push: Boolean
    sms: Boolean
    expiryWarnings: Boolean
    lowStockAlerts: Boolean
    shoppingReminders: Boolean
    mealPlanReminders: Boolean
    timerAlerts: Boolean
    wasteGoalAlerts: Boolean
    nutritionGoalAlerts: Boolean
  }

  # Response Types
  type UploadResult {
    url: String!
    key: String!
    filename: String!
    size: Int!
    contentType: String!
  }

  type PresignedUploadResult {
    url: String!
    key: String!
  }

  type ForgotPasswordResponse {
    success: Boolean!
    message: String!
  }

  type ResetPasswordResponse {
    success: Boolean!
    message: String!
  }

  type OCRResult {
    success: Boolean!
    data: JSON
    message: String!
  }

  type InventoryCreationResult {
    success: Boolean!
    items: [InventoryItem!]
    message: String!
  }

  input ReceiptDataInput {
    vendor: String
    date: String
    total: Float
    items: [ReceiptItemInput!]!
    category: String
  }

  input ReceiptItemInput {
    name: String!
    quantity: Float
    price: Float
    unit: String
  }

  type SmartReminderResult {
    success: Boolean!
    remindersCreated: Int!
    reminders: [Reminder!]!
  }

  # Queries
  type Query {
    # Auth
    me: User

    # Households
    households: [Household!]!
    household(id: ID!): Household

    # Kitchens
    kitchens(householdId: ID!): [Kitchen!]!
    kitchen(id: ID!): Kitchen

    # Inventory
    inventoryItems(kitchenId: ID!): [InventoryItem!]!
    inventoryItem(id: ID!): InventoryItem
    lowStockItems(kitchenId: ID!): [InventoryItem!]!
    expiringItems(kitchenId: ID!, days: Int = 7): [InventoryItem!]!

    # Shopping
    shoppingLists(kitchenId: ID!): [ShoppingList!]!
    shoppingList(id: ID!): ShoppingList

    # Expenses
    expenses(kitchenId: ID!, limit: Int = 50): [Expense!]!
    expense(id: ID!): Expense
    expenseStats(kitchenId: ID!, period: String!): JSON!

    # Reminders
    reminders(kitchenId: ID!): [Reminder!]!
    upcomingReminders(kitchenId: ID!, days: Int = 7): [Reminder!]!

    # Usage Logs
    usageLogs(kitchenId: ID!, limit: Int = 100): [UsageLog!]!

    # Recipes
    recipeHistory(kitchenId: ID): [RecipeHistory!]!
    generateRecipe(input: GenerateRecipeInput!): GeneratedRecipe!

    # AI
    aiScans(limit: Int = 20): [AIScan!]!

    # Meal Planning
    mealPlans(startDate: DateTime, endDate: DateTime): [MealPlan!]!
    mealPlanTemplates(category: String): [MealPlanTemplate!]!
    weeklyMealPlan(weekStart: DateTime!): [MealPlan!]!

    # Nutrition
    nutritionEntries(date: DateTime, startDate: DateTime, endDate: DateTime): [NutritionEntry!]!
    nutritionGoals: NutritionGoals!
    dailyNutritionSummary(date: DateTime!): DailyNutrition!
    nutritionTrends(days: Int): [JSON!]!

    # Waste Tracking
    wasteEntries(startDate: DateTime, endDate: DateTime, category: String): [WasteEntry!]!
    wasteGoals: WasteGoals!
    wasteStats(period: String): WasteStats!
    wasteTrends(days: Int): [JSON!]!

    # Kitchen Timer
    timers(isActive: Boolean): [KitchenTimer!]!
    activeTimers: [KitchenTimer!]!
    timer(id: ID!): KitchenTimer
    timerPresets: [TimerPreset!]!

    # Notifications
    notifications(limit: Int, unreadOnly: Boolean): [Notification!]!
    unreadNotificationCount: Int!
  }

  # Mutations
  type Mutation {
    # Auth
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    logout: Boolean!
    forgotPassword(email: String!): ForgotPasswordResponse!
    resetPassword(token: String!, newPassword: String!): ResetPasswordResponse!
    
    # User Profile
    updateUserProfile(input: UpdateUserProfileInput!): User!
    updateUserSettings(input: UpdateUserSettingsInput!): Boolean!
    uploadAvatar: UploadResult!
    getAvatarUploadUrl: PresignedUploadResult!

    # Households
    createHousehold(input: CreateHouseholdInput!): Household!
    updateHousehold(id: ID!, input: CreateHouseholdInput!): Household!
    deleteHousehold(id: ID!): Boolean!
    inviteMember(householdId: ID!, email: String!, role: HouseholdRole!): Boolean!

    # Kitchens
    createKitchen(input: CreateKitchenInput!): Kitchen!
    updateKitchen(id: ID!, input: CreateKitchenInput!): Kitchen!
    deleteKitchen(id: ID!): Boolean!

    # Inventory
    createInventoryItem(input: CreateInventoryItemInput!): InventoryItem!
    updateInventoryItem(id: ID!, input: UpdateInventoryItemInput!): InventoryItem!
    deleteInventoryItem(id: ID!): Boolean!
    
    createInventoryBatch(input: CreateInventoryBatchInput!): InventoryBatch!
    updateInventoryBatch(id: ID!, quantity: Float, expiryDate: DateTime): InventoryBatch!
    deleteInventoryBatch(id: ID!): Boolean!

    # Shopping
    createShoppingList(input: CreateShoppingListInput!): ShoppingList!
    updateShoppingList(id: ID!, title: String, description: String): ShoppingList!
    deleteShoppingList(id: ID!): Boolean!
    
    createShoppingListItem(input: CreateShoppingListItemInput!): ShoppingListItem!
    updateShoppingListItem(id: ID!, isPurchased: Boolean, price: Float): ShoppingListItem!
    deleteShoppingListItem(id: ID!): Boolean!
    
    # Auto-generate shopping list from inventory
    generateAutoShoppingList(kitchenId: ID!, type: ShoppingListType!): ShoppingList!

    # Expenses
    createExpense(input: CreateExpenseInput!): Expense!
    updateExpense(id: ID!, amount: Float, notes: String): Expense!
    deleteExpense(id: ID!): Boolean!

    # Reminders
    createReminder(input: CreateReminderInput!): Reminder!
    updateReminder(id: ID!, isCompleted: Boolean): Reminder!
    deleteReminder(id: ID!): Boolean!
    
    # Generate smart reminders based on inventory and usage patterns
    generateSmartReminders(kitchenId: ID!): SmartReminderResult!

    # Usage Logs
    createUsageLog(input: CreateUsageLogInput!): UsageLog!

    # AI
    scanImage(input: AIImageScanInput!): AIScan!
    processAIScan(scanId: ID!): JSON!

    # OCR
    processReceiptOCR(imageUrl: String!): OCRResult!
    processInventoryItemOCR(imageUrl: String!): OCRResult!
    createInventoryFromReceipt(receiptData: ReceiptDataInput!, kitchenId: ID!): InventoryCreationResult!

    # Bulk Operations
    bulkCreateInventoryItems(items: [CreateInventoryItemInput!]!): [InventoryItem!]!
    bulkUpdateInventoryQuantities(updates: [JSON!]!): Boolean!

    # Recipe Management
    saveRecipe(input: SaveRecipeInput!): RecipeHistory!
    toggleRecipeFavorite(recipeId: ID!): RecipeHistory!
    deleteRecipe(recipeId: ID!): Boolean!

    # Meal Planning
    createMealPlan(input: CreateMealPlanInput!): MealPlan!
    updateMealPlan(id: ID!, input: UpdateMealPlanInput!): MealPlan!
    deleteMealPlan(id: ID!): Boolean!
    generateMealPlanFromTemplate(templateId: ID!, startDate: DateTime!): [MealPlan!]!
    generateShoppingListFromMealPlan(startDate: DateTime!, endDate: DateTime!, kitchenId: ID!): ShoppingList!

    # Nutrition
    createNutritionEntry(input: CreateNutritionEntryInput!): NutritionEntry!
    updateNutritionEntry(id: ID!, input: UpdateNutritionEntryInput!): NutritionEntry!
    deleteNutritionEntry(id: ID!): Boolean!
    updateNutritionGoals(input: UpdateNutritionGoalsInput!): NutritionGoals!
    logWaterIntake(amount: Float!, time: DateTime): WaterIntake!
    quickLogFood(foodName: String!, mealType: MealType!, date: DateTime!): NutritionEntry!

    # Waste Tracking
    createWasteEntry(input: CreateWasteEntryInput!): WasteEntry!
    updateWasteEntry(id: ID!, input: UpdateWasteEntryInput!): WasteEntry!
    deleteWasteEntry(id: ID!): Boolean!
    updateWasteGoals(input: UpdateWasteGoalsInput!): WasteGoals!
    bulkCreateWasteEntries(entries: [CreateWasteEntryInput!]!): Int!

    # Kitchen Timer
    createTimer(input: CreateKitchenTimerInput!): KitchenTimer!
    updateTimer(id: ID!, input: UpdateKitchenTimerInput!): KitchenTimer!
    deleteTimer(id: ID!): Boolean!
    startTimer(id: ID!): KitchenTimer!
    pauseTimer(id: ID!): KitchenTimer!
    stopTimer(id: ID!): KitchenTimer!
    resetTimer(id: ID!): KitchenTimer!
    createTimerFromPreset(presetName: String!, customName: String): KitchenTimer!
    bulkStopTimers(timerIds: [ID!]!): Int!

    # Notifications
    markNotificationAsRead(id: ID!): Notification!
    markAllNotificationsAsRead: Int!
    deleteNotification(id: ID!): Boolean!
    deleteAllNotifications: Int!
    sendTestNotification(title: String, message: String): Boolean!
    updateNotificationPreferences(preferences: NotificationPreferencesInput!): Boolean!
  }

  # Subscriptions
  type Subscription {
    inventoryUpdated(kitchenId: ID!): InventoryItem!
    reminderTriggered(kitchenId: ID!): Reminder!
    shoppingListUpdated(listId: ID!): ShoppingList!
  }
`;