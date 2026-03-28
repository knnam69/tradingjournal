const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const engine = require('../utils/analysis-engine');

const router = express.Router();
router.use(authMiddleware);

// Overview stats
router.get('/overview', (req, res) => {
  const { log_type } = req.query;
  res.json(engine.getOverview(req.userId, log_type || null));
});

// By strategy
router.get('/by-strategy', (req, res) => {
  const { log_type } = req.query;
  res.json(engine.getByStrategy(req.userId, log_type || null));
});

// By pair
router.get('/by-pair', (req, res) => {
  const { log_type } = req.query;
  res.json(engine.getByPair(req.userId, log_type || null));
});

// By timeframe
router.get('/by-timeframe', (req, res) => {
  const { log_type } = req.query;
  res.json(engine.getByTimeframe(req.userId, log_type || null));
});

// Condition impact
router.get('/condition-impact', (req, res) => {
  const { strategy_id, log_type } = req.query;
  res.json(engine.getConditionImpact(req.userId, strategy_id ? parseInt(strategy_id) : null, log_type || null));
});

// Best setup
router.get('/best-setup', (req, res) => {
  const { log_type, min_sample } = req.query;
  res.json(engine.getBestSetup(req.userId, log_type || null, parseInt(min_sample) || 5));
});

// Equity curve
router.get('/equity-curve', (req, res) => {
  const { log_type } = req.query;
  res.json(engine.getEquityCurve(req.userId, log_type || null));
});

// Backtest vs Live comparison
router.get('/backtest-vs-live', (req, res) => {
  res.json(engine.getBacktestVsLive(req.userId));
});

module.exports = router;
