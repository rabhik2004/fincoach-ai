require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const aiRoutes = require('./routes/ai');
const statsRoutes = require('./routes/stats');
const investmentRoutes = require('./routes/investments');
const insightRoutes = require('./routes/insights');
const scoreRoutes = require('./routes/score');
const priceRoutes = require('./routes/prices');
const ollamaRoutes = require('./routes/ollama');
const challengeRoutes = require('./routes/challenges');

const app = express();

// Connect Database
connectDB();

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 10,
  message: { error: 'AI rate limit reached, please wait a moment.' },
});
app.use('/api/ai/', aiLimiter);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Logging (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/score', scoreRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/ollama', ollamaRoutes);
app.use('/api/challenges', challengeRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 FinCoach AI backend running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);
  console.log(`   AI Provider: ${process.env.AI_PROVIDER || 'openai'}`);
});

module.exports = app;
