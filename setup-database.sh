#!/bin/bash

# Database Setup Script for Smart Kitchen Manager
set -e

echo "🗄️  Setting up Smart Kitchen Manager Database..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "schema.prisma" ]; then
    print_error "Please run this script from the packages/db directory"
    exit 1
fi

# Check if .env file exists in root
if [ ! -f "../../.env" ]; then
    print_error ".env file not found in project root. Please create it from .env.example"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' ../../.env | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL not set in .env file"
    exit 1
fi

print_status "Database URL: $DATABASE_URL"

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate

# Push schema to database (creates tables if they don't exist)
print_status "Pushing schema to database..."
npx prisma db push

# Check if push was successful
if [ $? -eq 0 ]; then
    print_success "Database schema pushed successfully!"
else
    print_error "Failed to push schema to database"
    exit 1
fi

# Optional: Open Prisma Studio
read -p "Do you want to open Prisma Studio to view your database? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Opening Prisma Studio..."
    npx prisma studio
fi

print_success "Database setup completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Your database is now ready for the Smart Kitchen Manager"
echo "2. Start the API server: cd ../../apps/api && npm run dev"
echo "3. Start the web app: cd ../../apps/web && npm run dev"
echo ""
echo "🔗 Useful Commands:"
echo "   - View database: npx prisma studio"
echo "   - Reset database: npx prisma db push --force-reset"
echo "   - Generate client: npx prisma generate"