//src/server.ts
import dotenv from 'dotenv';
dotenv.config();

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
import { scheduleMonthlySystemDesignUpdate } from './services/system-design-updater';

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4173',  
      'https://archweekly.online', // Your production domain
      'https://www.archweekly.online' // www subdomain
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'ArchWeekly Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      subscribers: '/api/subscribers',
      newsletters: '/api/newsletters',
      systemDesign: '/api/system-design',
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/newsletters', newsletterRoutes);
app.use('/api/system-design', systemDesignRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  scheduleWeeklyNewsletter();
  scheduleMonthlySystemDesignUpdate();
});

process.on('SIGTERM', () => {
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});