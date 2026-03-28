const express = require('express');
const path = require('path');
const cors = require('cors');
const { initializeDatabase } = require('./src/db/schema');

const authRoutes = require('./src/routes/auth');
const strategyRoutes = require('./src/routes/strategies');
const tradeRoutes = require('./src/routes/trades');
const analysisRoutes = require('./src/routes/analysis');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/strategies', strategyRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/analysis', analysisRoutes);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize DB and start server
initializeDatabase();

app.listen(PORT, () => {
  console.log(`🚀 Trading Journal running at http://localhost:${PORT}`);
});
