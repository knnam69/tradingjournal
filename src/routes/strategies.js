const express = require('express');
const { getDb } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET all strategies for current user
router.get('/', (req, res) => {
  const db = getDb();
  const strategies = db.prepare('SELECT * FROM strategies WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json(strategies);
});

// GET single strategy with conditions
router.get('/:id', (req, res) => {
  const db = getDb();
  const strategy = db.prepare('SELECT * FROM strategies WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!strategy) return res.status(404).json({ error: 'Strategy not found' });

  const conditions = db.prepare('SELECT * FROM conditions WHERE strategy_id = ? ORDER BY order_index').all(strategy.id);
  res.json({ ...strategy, conditions });
});

// GET conditions for a strategy
router.get('/:id/conditions', (req, res) => {
  const db = getDb();
  const strategy = db.prepare('SELECT id FROM strategies WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!strategy) return res.status(404).json({ error: 'Strategy not found' });

  const conditions = db.prepare('SELECT * FROM conditions WHERE strategy_id = ? ORDER BY order_index').all(req.params.id);
  res.json(conditions);
});

// POST create strategy
router.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const db = getDb();
  const result = db.prepare('INSERT INTO strategies (user_id, name, description) VALUES (?, ?, ?)').run(req.userId, name, description || '');
  const strategy = db.prepare('SELECT * FROM strategies WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(strategy);
});

// PUT update strategy
router.put('/:id', (req, res) => {
  const { name, description } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT id FROM strategies WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Strategy not found' });

  db.prepare('UPDATE strategies SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?').run(name, description, req.params.id);
  const strategy = db.prepare('SELECT * FROM strategies WHERE id = ?').get(req.params.id);
  res.json(strategy);
});

// DELETE strategy
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM strategies WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Strategy not found' });

  db.prepare('DELETE FROM strategies WHERE id = ?').run(req.params.id);
  res.json({ message: 'Strategy deleted' });
});

// POST create condition
router.post('/:id/conditions', (req, res) => {
  const { name, type, options, order_index } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });

  const db = getDb();
  const strategy = db.prepare('SELECT id FROM strategies WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!strategy) return res.status(404).json({ error: 'Strategy not found' });

  const maxOrder = db.prepare('SELECT MAX(order_index) as max_order FROM conditions WHERE strategy_id = ?').get(req.params.id);
  const orderIdx = order_index !== undefined ? order_index : (maxOrder.max_order || 0) + 1;

  const result = db.prepare('INSERT INTO conditions (strategy_id, name, type, options, order_index) VALUES (?, ?, ?, ?, ?)').run(req.params.id, name, type, JSON.stringify(options || []), orderIdx);
  const condition = db.prepare('SELECT * FROM conditions WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(condition);
});

// PUT update condition
router.put('/conditions/:condId', (req, res) => {
  const { name, type, options, order_index } = req.body;
  const db = getDb();

  const condition = db.prepare(`
    SELECT c.* FROM conditions c
    JOIN strategies s ON c.strategy_id = s.id
    WHERE c.id = ? AND s.user_id = ?
  `).get(req.params.condId, req.userId);
  if (!condition) return res.status(404).json({ error: 'Condition not found' });

  db.prepare('UPDATE conditions SET name = COALESCE(?, name), type = COALESCE(?, type), options = COALESCE(?, options), order_index = COALESCE(?, order_index) WHERE id = ?').run(name, type, options ? JSON.stringify(options) : null, order_index, req.params.condId);
  const updated = db.prepare('SELECT * FROM conditions WHERE id = ?').get(req.params.condId);
  res.json(updated);
});

// DELETE condition
router.delete('/conditions/:condId', (req, res) => {
  const db = getDb();
  const condition = db.prepare(`
    SELECT c.id FROM conditions c
    JOIN strategies s ON c.strategy_id = s.id
    WHERE c.id = ? AND s.user_id = ?
  `).get(req.params.condId, req.userId);
  if (!condition) return res.status(404).json({ error: 'Condition not found' });

  db.prepare('DELETE FROM conditions WHERE id = ?').run(req.params.condId);
  res.json({ message: 'Condition deleted' });
});

module.exports = router;
