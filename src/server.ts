//src/server.ts
// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

// NOW import everything else
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';

import authRoutes from './routes/auth';
import subscriberRoutes from './routes/subscribers';
import newsletterRoutes from './routes/newsletters';
import systemDesignRoutes from './routes/system-design';
import adminRoutes from './routes/admin';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { scheduleWeeklyNewsletter } from './services/scheduler';
import { scheduleMonthlySystemDesignUpdate } from './services/system-design-updater'; // ✅ NEW

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'ScaleWeekly API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'ScaleWeekly Backend API',
    version: '1.0.0',
    description: 'AI-powered newsletter platform for DevOps & System Design',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      subscribers: '/api/subscribers',
      newsletters: '/api/newsletters',
      systemDesign: '/api/system-design', // ✅ NEW
    },
    documentation: {
      auth: {
        sendOTP: 'POST /api/auth/send-otp',
        verifyOTP: 'POST /api/auth/verify-otp',
        getMe: 'GET /api/auth/me',
      },
      subscribers: {
        subscribe: 'POST /api/subscribers/subscribe',
        unsubscribe: 'DELETE /api/subscribers/unsubscribe/:email',
        stats: 'GET /api/subscribers/stats',
        count: 'GET /api/subscribers/count',
      },
      newsletters: {
        latest: 'GET /api/newsletters/latest',
        archive: 'GET /api/newsletters',
        send: 'POST /api/newsletters/send (Admin)',
        test: 'POST /api/newsletters/test (Admin)',
        trigger: 'POST /api/newsletters/trigger (Admin)',
      },
      systemDesign: {
        all: 'GET /api/system-design',
        featured: 'GET /api/system-design/featured',
        search: 'GET /api/system-design/search?q=caching',
        byCategory: 'GET /api/system-design/category/:category',
        byDifficulty: 'GET /api/system-design/difficulty/:difficulty',
        stats: 'GET /api/system-design/stats',
      },
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/newsletters', newsletterRoutes);
app.use('/api/system-design', systemDesignRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SCALEWEEKLY BACKEND STARTED');
  console.log('='.repeat(60));
  console.log(`✅ API Server running on http://localhost:${PORT}`);
  console.log(`🔧 OTP authentication enabled`);
  console.log(`💾 Newsletter endpoints ready`);
  console.log(`🎓 System Design endpoints ready`); // ✅ NEW
  console.log(`🔒 CORS enabled for: ${process.env.FRONTEND_URL || 'localhost:5173'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(60));
  
  // 🚨 CRITICAL: Initialize the weekly newsletter scheduler
  scheduleWeeklyNewsletter();
  console.log('\n⏰ Weekly newsletter automation is running!');
  console.log('📅 Next send: Every Sunday at 9:00 AM IST\n');
  
  // ✅ NEW: Initialize monthly System Design update
  scheduleMonthlySystemDesignUpdate();
  console.log('⏰ Monthly System Design update scheduled!');
  console.log('📅 Next update: 1st of every month at 9:00 AM IST\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT received. Shutting down gracefully...');
  process.exit(0);
});