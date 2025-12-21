# Render Deployment Guide

## 🚨 Issue Resolution

The deployment was failing because Render was trying to run `node dist/index.js` instead of the correct server file. This has been fixed with the following changes:

### ✅ Fixes Applied

1. **Updated package.json**:
   - `main` field points to `dist/server.js`
   - `start` script uses diagnostic startup script
   - Build process includes Prisma client generation

2. **Created diagnostic startup script** (`deploy-start.js`):
   - Checks for required files before starting
   - Validates environment variables
   - Provides detailed error logging
   - Loads .env for local testing

3. **Updated render.yaml**:
   - Explicit build and start commands
   - Proper environment variable configuration
   - Health check endpoint configured

## 🚀 Deployment Steps for Render

### Step 1: Environment Variables
Set these in your Render service dashboard:

**Required:**
```
DATABASE_URL=your-postgresql-connection-string
JWT_SECRET=your-jwt-secret-key-at-least-32-characters
```

**Optional but Recommended:**
```
OPENAI_API_KEY=your-openai-api-key
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-frontend-domain.com
```

### Step 2: Deploy Configuration

**Option A: Using render.yaml (Recommended)**
1. Ensure `render.yaml` is in your repository root or backend folder
2. Connect your GitHub repository to Render
3. Render will automatically use the configuration

**Option B: Manual Configuration**
If render.yaml is not being used, set these in Render dashboard:

- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npm start`
- **Node Version**: 20.x (set in Environment)
- **Health Check Path**: `/health`

### Step 3: Database Setup
1. Create a PostgreSQL database in Render
2. Copy the connection string to `DATABASE_URL` environment variable
3. The app will automatically run Prisma migrations on startup

## 🔍 Troubleshooting

### Check Deployment Logs
The diagnostic script will show:
- ✅ All required files are present
- ✅ Environment variables are set
- ✅ Database connection status
- ❌ Any missing dependencies or configuration

### Common Issues:

1. **"Application exited early"**
   - Check environment variables are set correctly
   - Verify DATABASE_URL is valid and accessible
   - Check build logs for compilation errors

2. **"Module not found"**
   - Ensure build completed successfully
   - Check that `dist/server.js` exists after build
   - Verify all dependencies are in package.json

3. **Database connection failed**
   - Verify DATABASE_URL format: `postgresql://user:password@host:port/database`
   - Ensure database is accessible from Render
   - Check database credentials

4. **Port binding issues**
   - Render automatically sets PORT environment variable
   - Don't hardcode port numbers
   - Use `process.env.PORT || 4000`

## 📊 Health Check

The server provides a health endpoint at `/health` that:
- Tests database connectivity
- Returns server status and version
- Can be used by Render for health monitoring

Example response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "version": "1.0.0"
}
```

## 🔧 Local Testing

To test the deployment script locally:
```bash
npm run build
npm start
```

This will run the same diagnostic checks that happen in production.

## 📝 Deployment Checklist

- [ ] Environment variables set in Render dashboard
- [ ] Database created and accessible
- [ ] Repository connected to Render
- [ ] Build command: `npm ci && npm run build`
- [ ] Start command: `npm start`
- [ ] Health check path: `/health`
- [ ] Node.js version: 20.x

## 🎯 Expected Deployment Flow

1. **Build Phase**:
   ```
   npm ci && npm run build
   → Install dependencies
   → Generate Prisma client
   → Compile TypeScript to JavaScript
   → Create dist/ folder with compiled code
   ```

2. **Start Phase**:
   ```
   npm start
   → Run diagnostic checks
   → Validate environment variables
   → Start Fastify server
   → Connect to database
   → Serve GraphQL API at /graphql
   ```

3. **Health Check**:
   ```
   GET /health
   → Test database connection
   → Return server status
   ```

The deployment should now work correctly without the module resolution errors!