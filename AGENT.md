# BackupGuardian Agent Guide

## Project Structure
- **Backend**: Node.js + Express API for file upload, user auth, and backup validation
- **Frontend**: React + Vite dashboard for uploads, test history, and results
- **Database**: PostgreSQL for app data, Docker containers for test environments
- **Queue**: Bull.js for background job processing of backup tests

## Build/Test Commands
```bash
# Backend
cd backend && npm install && npm run dev          # Start backend server
cd backend && npm test                            # Run all backend tests
cd backend && npm test -- --grep "specific test" # Run single test

# Frontend  
cd frontend && npm install && npm run dev        # Start frontend dev server
cd frontend && npm test                           # Run frontend tests
cd frontend && npm run build                      # Build for production
```

## Architecture
- Upload flow: Frontend → Backend API → File Storage → Test Queue → Docker Runner → Results DB
- Authentication: JWT tokens, email/password
- Validation: Automated PostgreSQL restore testing with data integrity checks
- Notifications: Email alerts via SendGrid/SES

## Code Style
- Use ES6+ async/await, no callbacks
- Backend: Express middleware pattern, error handling with try/catch
- Frontend: Functional components with hooks, TypeScript preferred
- Database: Snake_case for columns, camelCase for JavaScript
- Files: Kebab-case for filenames, PascalCase for React components
