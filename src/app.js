/**
 * App Entry Point
 * ---------------
 * Sets up the Express app, middleware, and routes.
 */

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const routes = require('./routes'); // auto-loads index.js from routes folder
// const { authorize } = require('./middleware/authMiddleware');
const sequelize = require('./db');
const dbRoutes = require('./routes/dbRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
// app.use(authorize)

// API routes
app.use('/api/v1', routes);

// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the DevByte Community API 🚀' });
});

// Test DB route
app.get('/api/v1/', dbRoutes);

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    status: 404,
    message: 'Route Not Found',
  });
});

// Error handling middleware
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
