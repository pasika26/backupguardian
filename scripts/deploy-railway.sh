#!/bin/bash

# Railway Deployment Script for BackupGuardian
set -e

echo "🚂 Deploying BackupGuardian to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway (if not already logged in)
echo "🔐 Checking Railway authentication..."
railway whoami || railway login

# Create new Railway project
echo "📦 Creating Railway project..."
railway project create backupguardian

# Add PostgreSQL database
echo "🗄️ Adding PostgreSQL database..."
railway add postgresql

# Add Redis
echo "🔴 Adding Redis..."
railway add redis

# Set environment variables
echo "⚙️ Setting environment variables..."
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set STORAGE_TYPE=local
railway variables set FRONTEND_URL=https://backupguardian.org
railway variables set CORS_ORIGIN=https://backupguardian.org
railway variables set LOG_LEVEL=info
railway variables set ENABLE_REQUEST_LOGGING=true

# Deploy the application
echo "🚀 Deploying application..."
railway up --detach

# Get the deployment URL
echo "✅ Deployment complete!"
echo "📍 Your backend URL: $(railway domain)"
echo ""
echo "Next steps:"
echo "1. Configure your custom domain in Railway dashboard"
echo "2. Set up AWS S3 credentials"
echo "3. Deploy frontend to Vercel"
echo "4. Update DNS records for backupguardian.org"
