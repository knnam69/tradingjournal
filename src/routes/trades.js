const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Multer setup for screenshots
const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
}});

// GET all trades with filters
router.get('/', (req, res) => {
  const db = getDb();
  const { log_type, strategy_id, pair, order_type, result, timeframe, date_from, date_to, sort_by, sort_dir, page = 1, limit = 50 } = req.query;

  let where = ['t.user_id = ?'];
  let params = [req.userId];

  if (log_type) { where.push('t.log_type = ?'); params.push(log_type); }
  if (strategy_id) { where.push('t.strategy_id = ?'); params.push(strategy_id); }
  if (pair) { where.push('t.pair = ?'); params.push(pair); }
  if (order_type) { where.push('t.order_type = ?'); params.push(order_type); }
  if (result) { where.push('t.result = ?'); params.push(result); }
  if (timeframe) { where.push('t.timeframe = ?'); params.push(timeframe); }
  if (date_from) { where.push('t.trade_date >= ?'); params.push(date_from); }
  if (date_to) { where.push('t.trade_date <= ?'); params.push(date_to); }

  const countSql = `SELECT COUNT(*) as total FROM trade_logs t WHERE ${where.join(' AND ')}`;
  const total = db.prepare(countSql).get(...params).total;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  let orderBySql = 't.trade_date DESC';
  const allowedSortCols = {
    'date': 't.trade_date',
    'type': 't.log_type',
    'order': 't.order_type',
    'pair': 't.pair',
    'tf': 't.timeframe',
    'strategy': 'strategy_name',
    'result': 't.result',
    'pnl': 't.pnl_r',
    'rr': 't.risk_reward'
  };

  if (sort_by && allowedSortCols[sort_by]) {
    const dir = (sort_dir && sort_dir.toLowerCase() === 'asc') ? 'ASC' : 'DESC';
    orderBySql = `${allowedSortCols[sort_by]} ${dir}`;
  }

  const sql = `
    SELECT t.*, s.name as strategy_name
    FROM trade_logs t
    LEFT JOIN strategies s ON t.strategy_id = s.id
    WHERE ${where.join(' AND ')}
    ORDER BY ${orderBySql}
    LIMIT ? OFFSET ?
  `;
  params.push(parseInt(limit), offset);
  const trades = db.prepare(sql).all(...params);

  res.json({ trades, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
});

// GET single trade with condition values
router.get('/:id', (req, res) => {
  const db = getDb();
  const trade = db.prepare(`
    SELECT t.*, s.name as strategy_name
    FROM trade_logs t
    LEFT JOIN strategies s ON t.strategy_id = s.id
    WHERE t.id = ? AND t.user_id = ?
  `).get(req.params.id, req.userId);
  if (!trade) return res.status(404).json({ error: 'Trade not found' });

  const conditionValues = db.prepare(`
    SELECT cv.*, c.name as condition_name, c.type as condition_type
    FROM condition_values cv
    JOIN conditions c ON cv.condition_id = c.id
    WHERE cv.trade_log_id = ?
  `).all(trade.id);

  res.json({ ...trade, condition_values: conditionValues });
});

// POST create trade
router.post('/', upload.single('screenshot'), (req, res) => {
  const db = getDb();
  const { log_type, order_type, strategy_id, pair, timeframe, entry_price, tp, sl, close_price, result, pnl_pips, pnl_percent, pnl_r, lot_size, risk_reward, notes, trade_date, condition_values } = req.body;

  if (!log_type || !order_type || !strategy_id || !pair || !result || !trade_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const screenshot_url = req.file ? `/uploads/${req.file.filename}` : '';

  const insertTrade = db.prepare(`
    INSERT INTO trade_logs (user_id, log_type, order_type, strategy_id, pair, timeframe, entry_price, tp, sl, close_price, result, pnl_pips, pnl_percent, pnl_r, lot_size, risk_reward, notes, screenshot_url, trade_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCondValue = db.prepare('INSERT INTO condition_values (trade_log_id, condition_id, value) VALUES (?, ?, ?)');

  const transaction = db.transaction(() => {
    const tradeResult = insertTrade.run(
      req.userId, log_type, order_type, parseInt(strategy_id), pair, timeframe || 'H1',
      parseFloat(entry_price) || 0, parseFloat(tp) || 0, parseFloat(sl) || 0, parseFloat(close_price) || 0,
      result, parseFloat(pnl_pips) || 0, parseFloat(pnl_percent) || 0, parseFloat(pnl_r) || 0,
      parseFloat(lot_size) || 0.01, parseFloat(risk_reward) || 0, notes || '', screenshot_url, trade_date
    );

    const tradeId = tradeResult.lastInsertRowid;

    // Insert condition values
    let condValues = [];
    try { condValues = typeof condition_values === 'string' ? JSON.parse(condition_values) : (condition_values || []); } catch(e) {}

    for (const cv of condValues) {
      if (cv.condition_id && cv.value !== undefined) {
        insertCondValue.run(tradeId, parseInt(cv.condition_id), String(cv.value));
      }
    }

    return tradeId;
  });

  try {
    const tradeId = transaction();
    const trade = db.prepare('SELECT t.*, s.name as strategy_name FROM trade_logs t LEFT JOIN strategies s ON t.strategy_id = s.id WHERE t.id = ?').get(tradeId);
    res.status(201).json(trade);
  } catch (err) {
    console.error('Create trade error:', err);
    res.status(500).json({ error: 'Failed to create trade' });
  }
});

// PUT update trade
router.put('/:id', upload.single('screenshot'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM trade_logs WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Trade not found' });

  const { log_type, order_type, strategy_id, pair, timeframe, entry_price, tp, sl, close_price, result, pnl_pips, pnl_percent, pnl_r, lot_size, risk_reward, notes, trade_date, condition_values } = req.body;

  const screenshot_url = req.file ? `/uploads/${req.file.filename}` : existing.screenshot_url;

  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE trade_logs SET log_type=?, order_type=?, strategy_id=?, pair=?, timeframe=?, entry_price=?, tp=?, sl=?, close_price=?, result=?, pnl_pips=?, pnl_percent=?, pnl_r=?, lot_size=?, risk_reward=?, notes=?, screenshot_url=?, trade_date=?
      WHERE id = ?
    `).run(
      log_type || existing.log_type, order_type || existing.order_type, parseInt(strategy_id) || existing.strategy_id,
      pair || existing.pair, timeframe || existing.timeframe,
      parseFloat(entry_price) ?? existing.entry_price, parseFloat(tp) ?? existing.tp, parseFloat(sl) ?? existing.sl,
      parseFloat(close_price) ?? existing.close_price, result || existing.result,
      parseFloat(pnl_pips) ?? existing.pnl_pips, parseFloat(pnl_percent) ?? existing.pnl_percent, parseFloat(pnl_r) ?? existing.pnl_r,
      parseFloat(lot_size) ?? existing.lot_size, parseFloat(risk_reward) ?? existing.risk_reward,
      notes !== undefined ? notes : existing.notes, screenshot_url, trade_date || existing.trade_date, req.params.id
    );

    // Update condition values
    let condValues = [];
    try { condValues = typeof condition_values === 'string' ? JSON.parse(condition_values) : (condition_values || []); } catch(e) {}

    if (condValues.length > 0) {
      db.prepare('DELETE FROM condition_values WHERE trade_log_id = ?').run(req.params.id);
      const insert = db.prepare('INSERT INTO condition_values (trade_log_id, condition_id, value) VALUES (?, ?, ?)');
      for (const cv of condValues) {
        if (cv.condition_id && cv.value !== undefined) {
          insert.run(parseInt(req.params.id), parseInt(cv.condition_id), String(cv.value));
        }
      }
    }
  });

  try {
    transaction();
    const trade = db.prepare('SELECT t.*, s.name as strategy_name FROM trade_logs t LEFT JOIN strategies s ON t.strategy_id = s.id WHERE t.id = ?').get(req.params.id);
    res.json(trade);
  } catch (err) {
    console.error('Update trade error:', err);
    res.status(500).json({ error: 'Failed to update trade' });
  }
});

// DELETE trade
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM trade_logs WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Trade not found' });

  db.prepare('DELETE FROM trade_logs WHERE id = ?').run(req.params.id);
  res.json({ message: 'Trade deleted' });
});

// DELETE multiple trades
router.post('/bulk-delete', (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });

  const db = getDb();
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM trade_logs WHERE id IN (${placeholders}) AND user_id = ?`).run(...ids, req.userId);
  res.json({ message: `Deleted ${ids.length} trades` });
});

module.exports = router;
