/**
 * Spyglass Compliance Server
 * Main Express app entry point
 */

import express from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SESSION_SECRET = process.env.SESSION_SECRET || 'changeme';

// Initialize Prisma client
export const prisma = new PrismaClient();

// Initialize Express app
const app = express();

// CORS configuration
app.use(cors({
  origin: NODE_ENV === 'production' 
    ? ['https://compliance.spyglassrealty.com']
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files in production
if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      database: 'connected',
      services: {
        express: true,
        prisma: true,
        session: true
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      database: 'disconnected'
    });
  }
});

// Database connection test endpoint
app.get('/api/db/test', async (req, res) => {
  try {
    // Test basic connection
    await prisma.$queryRaw`SELECT 1 as test`;
    
    // Test table existence (will fail until migration is run)
    const userCount = await prisma.user.count().catch(() => null);
    const dealCount = await prisma.deal.count().catch(() => null);
    
    res.json({
      success: true,
      message: '✅ Database connection successful',
      timestamp: new Date().toISOString(),
      tests: {
        connection: true,
        users_table: userCount !== null,
        deals_table: dealCount !== null,
        user_count: userCount,
        deal_count: dealCount
      }
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({
      success: false,
      message: '❌ Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Import middleware and routes
import { loadUser } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import dealRoutes from './routes/deals.js';
import documentRoutes from './routes/documents.js';
import complianceRoutes from './routes/compliance.js';

// Load user from session for all requests
app.use(loadUser);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/compliance', complianceRoutes);

// Catch-all route for SPA in production
if (NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: NODE_ENV === 'production' 
      ? 'Internal server error'
      : error.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection on startup
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Spyglass Compliance Server running!`);
      console.log(`📍 Environment: ${NODE_ENV}`);
      console.log(`📡 Server: http://localhost:${PORT}`);
      console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
      console.log(`🗄️  DB Test: http://localhost:${PORT}/api/db/test`);
      
      if (NODE_ENV === 'development') {
        console.log(`🎨 Frontend: http://localhost:5173`);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Gracefully shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;