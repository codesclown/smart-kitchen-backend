# Backend Deployment Guide

## Deployment Fixes Applied

### Issues Fixed:
1. **Module Resolution Error**: Fixed TypeScript compilation and module imports
2. **Build Process**: Added proper build pipeline with Prisma client generation
3. **Start Command**: Created robust start script that handles deployment environments
4. **Package.json**: Updated main entry point and scripts

### Key Changes:
- `main` field now points to `dist/server.js` (compiled output)
- Build process includes Prisma client generation
- Added deployment-aware start script
- Fixed TypeScript configuration for proper compilation

## Deployment Options

### Option 1: Render (Recommended)
1. Use the provided `render.yaml` configuration
2. Set environment variables in Render dashboard
3. Deploy from GitHub repository

### Option 2: Docker
1. Build: `docker build -t smart-kitchen-backend .`
2. Run: `docker run -p 4000:4000 --env-file .env smart-kitchen-backend`

### Option 3: Manual Deployment
1. Install dependencies: `npm install`
2. Build application: `npm run build`
3. Start server: `npm start`

## Environment Variables Required

```env
# Database
DATABASE_URL="your-database-connection-string"

# JWT
JWT_SECRET="your-jwt-secret-key"

# OpenAI (for recipe generation)
OPENAI_API_KEY="your-openai-api-key"

# Server
PORT=4000
NODE_ENV=production
FRONTEND_URL="https://your-frontend-domain.com"

# Optional: File uploads
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_REGION="your-aws-region"
AWS_S3_BUCKET="your-s3-bucket"
```

## Health Check

The server provides a health check endpoint at `/health` that:
- Checks database connectivity
- Returns server status and version
- Can be used for deployment health monitoring

## Troubleshooting

### Common Issues:
1. **Module not found**: Ensure `npm run build` completed successfully
2. **Database connection**: Verify DATABASE_URL is correct
3. **Prisma client**: Run `npm run db:generate` if needed
4. **Port conflicts**: Check PORT environment variable

### Logs:
- Server logs include request/response details
- GraphQL errors are properly formatted
- Database connection status is logged

## Performance Notes

- Rate limiting: 100 requests per 15 minutes (production)
- File upload limit: 10MB
- CORS configured for production domains
- Security headers enabled via Helmet
- JWT authentication for protected routes