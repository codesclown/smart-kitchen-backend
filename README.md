# Smart Kitchen Manager - Backend API

A comprehensive GraphQL API for managing kitchen inventory, meal planning, expense tracking, and more.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Redis server (optional, for background jobs)
- OpenAI API key (for AI features)

### Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Access the API**
   - GraphQL Playground: http://localhost:4000/graphql
   - Health Check: http://localhost:4000/health

## 🔧 Environment Configuration

The `.env` file is already configured with all necessary environment variables:

- **Database**: PostgreSQL connection
- **JWT Secret**: Authentication token secret
- **OpenAI API Key**: For AI recipe generation and OCR
- **Cloudflare R2**: File storage configuration
- **Email**: Mailgun and Gmail configuration
- **Redis**: Background job processing

## ✨ Features

- 🔐 **Authentication & Authorization** - JWT-based auth with role-based access control
- 📦 **Inventory Management** - Track items, batches, expiry dates, and storage locations
- 🛒 **Shopping Lists** - Create and manage shopping lists with smart suggestions
- 💰 **Expense Tracking** - Track grocery expenses with receipt OCR processing
- 🍽️ **Meal Planning** - Plan meals and generate recipes with AI
- 📊 **Analytics & Reports** - Comprehensive insights into kitchen usage
- 🔔 **Notifications** - Smart reminders for expiry, low stock, and more
- 🤖 **AI Integration** - OpenAI-powered recipe generation and OCR processing
- 📱 **File Upload** - Cloudflare R2 storage for images and receipts

## 🛠️ Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Fastify
- **GraphQL**: Apollo Server
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT
- **File Storage**: Cloudflare R2
- **AI/OCR**: OpenAI API
- **Background Jobs**: BullMQ with Redis
- **Email**: Mailgun/Gmail

## 📚 Development Commands

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes to database
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## 🌐 API Documentation

### GraphQL Playground

Visit http://localhost:4000/graphql to:
- Explore the GraphQL schema
- Test queries and mutations
- View comprehensive API documentation

### Key Endpoints

- **GraphQL**: `POST /graphql`
- **File Upload**: `POST /upload`
- **Avatar Upload**: `POST /upload/avatar`
- **Receipt OCR**: `POST /ocr/receipt`
- **Inventory OCR**: `POST /ocr/inventory`
- **Barcode Scanning**: `POST /scan/barcode`
- **Health Check**: `GET /health`

### Example Queries

#### Authentication
```graphql
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token
    user { id email name }
  }
}
```

#### Inventory Management
```graphql
query GetInventory($kitchenId: ID!) {
  inventoryItems(kitchenId: $kitchenId) {
    id name category quantity unit expiryDate
    batches { id quantity expiryDate }
  }
}
```

#### Recipe Generation
```graphql
mutation GenerateRecipe($input: GenerateRecipeInput!) {
  generateRecipe(input: $input) {
    title ingredients steps cuisine prepTime calories
  }
}
```

## 🗄️ Database Schema

The application uses Prisma ORM with PostgreSQL. Key models include:

- **User** - User accounts and authentication
- **Household** - Multi-user household management
- **Kitchen** - Kitchen spaces within households
- **InventoryItem** - Items in inventory
- **InventoryBatch** - Batches of items with expiry dates
- **ShoppingList** - Shopping lists and items
- **Expense** - Expense tracking
- **RecipeHistory** - Saved recipes
- **MealPlan** - Meal planning
- **Notification** - User notifications

## 🔒 Security Features

- **Rate Limiting** - API and GraphQL endpoint protection
- **CORS** - Cross-origin request security
- **Helmet** - Security headers
- **JWT Authentication** - Secure token-based auth
- **Input Validation** - Zod schema validation
- **SQL Injection Protection** - Prisma ORM protection

## 📊 Monitoring & Logging

- **Health Checks** - `/health` endpoint for monitoring
- **Structured Logging** - JSON-formatted logs
- **Error Tracking** - Comprehensive error handling
- **Performance Monitoring** - Request timing and metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run linting and type checking
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the GraphQL playground documentation
- Review the API schema and resolvers# smart-kitchen-backend
