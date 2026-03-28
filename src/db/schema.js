const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'trading.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initializeDatabase() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS strategies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS conditions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      strategy_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('boolean','number','select','text')),
      options TEXT DEFAULT '[]',
      order_index INTEGER DEFAULT 0,
      FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS trade_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      log_type TEXT NOT NULL CHECK(log_type IN ('backtest','live')),
      order_type TEXT NOT NULL CHECK(order_type IN ('buy','sell')),
      strategy_id INTEGER NOT NULL,
      pair TEXT NOT NULL,
      timeframe TEXT DEFAULT 'H1',
      entry_price REAL,
      tp REAL,
      sl REAL,
      close_price REAL,
      result TEXT NOT NULL CHECK(result IN ('win','loss','breakeven')),
      pnl_pips REAL DEFAULT 0,
      pnl_percent REAL DEFAULT 0,
      pnl_r REAL DEFAULT 0,
      lot_size REAL DEFAULT 0.01,
      risk_reward REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      screenshot_url TEXT DEFAULT '',
      trade_date DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS condition_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_log_id INTEGER NOT NULL,
      condition_id INTEGER NOT NULL,
      value TEXT DEFAULT '',
      FOREIGN KEY (trade_log_id) REFERENCES trade_logs(id) ON DELETE CASCADE,
      FOREIGN KEY (condition_id) REFERENCES conditions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_trade_logs_user ON trade_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_trade_logs_strategy ON trade_logs(strategy_id);
    CREATE INDEX IF NOT EXISTS idx_trade_logs_result ON trade_logs(result);
    CREATE INDEX IF NOT EXISTS idx_trade_logs_type ON trade_logs(log_type);
    CREATE INDEX IF NOT EXISTS idx_condition_values_trade ON condition_values(trade_log_id);
    CREATE INDEX IF NOT EXISTS idx_conditions_strategy ON conditions(strategy_id);
  `);

  console.log('✅ Database initialized');
}

module.exports = { getDb, initializeDatabase };
