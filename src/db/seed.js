const bcrypt = require('bcryptjs');
const { getDb, initializeDatabase } = require('./schema');

async function seed() {
  initializeDatabase();
  const db = getDb();

  // Clear existing data
  db.exec('DELETE FROM condition_values');
  db.exec('DELETE FROM trade_logs');
  db.exec('DELETE FROM conditions');
  db.exec('DELETE FROM strategies');
  db.exec('DELETE FROM users');

  // ===== USERS =====
  const pw1 = await bcrypt.hash('demo123', 10);
  const pw2 = await bcrypt.hash('admin123', 10);
  db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run('demo', 'demo@trading.com', pw1);
  db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run('admin', 'admin@trading.com', pw2);
  const userId = 1; // demo user

  // ===== STRATEGIES =====
  const insertStrategy = db.prepare('INSERT INTO strategies (user_id, name, description) VALUES (?, ?, ?)');
  insertStrategy.run(userId, 'SMC Reversal', 'Smart Money Concepts reversal strategy using liquidity sweeps, BOS/CHoCH, and order blocks');
  insertStrategy.run(userId, 'Supply & Demand', 'Price action trading based on supply and demand zones with confirmation patterns');
  insertStrategy.run(userId, 'Breakout Trading', 'Trading breakouts from consolidation zones with volume and retest confirmation');

  // ===== CONDITIONS =====
  const insertCond = db.prepare('INSERT INTO conditions (strategy_id, name, type, options, order_index) VALUES (?, ?, ?, ?, ?)');

  // SMC Reversal conditions (strategy_id = 1)
  insertCond.run(1, 'Liquidity Sweep', 'boolean', '[]', 1);           // cond 1
  insertCond.run(1, 'Tỷ lệ nến quét liquidity (%)', 'number', '[]', 2);  // cond 2
  insertCond.run(1, 'BOS/CHoCH', 'select', '["BOS","CHoCH"]', 3);     // cond 3
  insertCond.run(1, 'Order Block Type', 'select', '["Bullish OB","Bearish OB"]', 4);  // cond 4
  insertCond.run(1, 'FVG Present', 'boolean', '[]', 5);                // cond 5
  insertCond.run(1, 'Premium/Discount Zone', 'select', '["Premium","Discount","Equilibrium"]', 6); // cond 6
  insertCond.run(1, 'Market Structure', 'select', '["Uptrend","Downtrend","Ranging"]', 7); // cond 7

  // Supply & Demand conditions (strategy_id = 2)
  insertCond.run(2, 'Zone Type', 'select', '["Supply","Demand"]', 1);  // cond 8
  insertCond.run(2, 'Zone Freshness', 'select', '["Fresh","Tested","Broken"]', 2); // cond 9
  insertCond.run(2, 'Number of Touches', 'number', '[]', 3);           // cond 10
  insertCond.run(2, 'Engulfing Candle', 'boolean', '[]', 4);           // cond 11
  insertCond.run(2, 'RBR/DBD Pattern', 'select', '["RBR","DBD","RBD","DBR"]', 5); // cond 12
  insertCond.run(2, 'Higher TF Confirmation', 'boolean', '[]', 6);     // cond 13

  // Breakout conditions (strategy_id = 3)
  insertCond.run(3, 'Consolidation Duration (candles)', 'number', '[]', 1); // cond 14
  insertCond.run(3, 'Volume Spike', 'boolean', '[]', 2);               // cond 15
  insertCond.run(3, 'Retest Confirmation', 'boolean', '[]', 3);        // cond 16
  insertCond.run(3, 'Breakout Direction', 'select', '["Bullish","Bearish"]', 4); // cond 17
  insertCond.run(3, 'Key Level Type', 'select', '["Support","Resistance","Trendline"]', 5); // cond 18
  insertCond.run(3, 'News Event Nearby', 'boolean', '[]', 6);          // cond 19

  // ===== TRADE LOGS =====
  const pairs = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'GBPJPY', 'EURJPY', 'USDCAD', 'NZDUSD', 'BTCUSD'];
  const timeframes = ['M15', 'M30', 'H1', 'H4', 'D1'];

  const insertTrade = db.prepare(`
    INSERT INTO trade_logs (user_id, log_type, order_type, strategy_id, pair, timeframe, entry_price, tp, sl, close_price, result, pnl_pips, pnl_percent, pnl_r, lot_size, risk_reward, notes, trade_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertCV = db.prepare('INSERT INTO condition_values (trade_log_id, condition_id, value) VALUES (?, ?, ?)');

  function rng(min, max) { return Math.random() * (max - min) + min; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function rand(min, max) { return Math.floor(rng(min, max)); }

  // Generate base prices for pairs
  const basePrices = {
    XAUUSD: 2350, EURUSD: 1.085, GBPUSD: 1.27, USDJPY: 150.5, AUDUSD: 0.66,
    GBPJPY: 191.5, EURJPY: 163.2, USDCAD: 1.36, NZDUSD: 0.615, BTCUSD: 67000
  };

  const pipValues = {
    XAUUSD: 0.1, EURUSD: 0.0001, GBPUSD: 0.0001, USDJPY: 0.01, AUDUSD: 0.0001,
    GBPJPY: 0.01, EURJPY: 0.01, USDCAD: 0.0001, NZDUSD: 0.0001, BTCUSD: 1
  };

  const trades = [];
  const startDate = new Date('2025-06-01');

  for (let i = 0; i < 125; i++) {
    const logType = i < 60 ? 'backtest' : 'live';
    const strategyId = pick([1, 1, 1, 2, 2, 3]); // Weight towards SMC
    const orderType = pick(['buy', 'sell']);
    const pair = pick(pairs);
    const tf = pick(timeframes);
    const base = basePrices[pair];
    const pip = pipValues[pair];

    // Create realistic entry/TP/SL
    const slPips = rng(15, 50);
    const tpPips = rng(20, 100);
    const rr = tpPips / slPips;
    const entry = base + rng(-base * 0.02, base * 0.02);

    let tp, sl;
    if (orderType === 'buy') {
      tp = entry + tpPips * pip;
      sl = entry - slPips * pip;
    } else {
      tp = entry - tpPips * pip;
      sl = entry + slPips * pip;
    }

    // Determine result with realistic distribution
    // Higher win rate for certain conditions
    let winProb = 0.55;
    if (strategyId === 1) winProb = 0.58;
    if (strategyId === 2) winProb = 0.54;
    if (strategyId === 3) winProb = 0.52;

    const resultRoll = Math.random();
    let result, closePrice, pnlPips;
    if (resultRoll < winProb) {
      result = 'win';
      pnlPips = rng(15, 80);
      closePrice = orderType === 'buy' ? entry + pnlPips * pip : entry - pnlPips * pip;
    } else if (resultRoll < 0.97) {
      result = 'loss';
      pnlPips = -rng(10, 45);
      closePrice = orderType === 'buy' ? entry + pnlPips * pip : entry - pnlPips * pip;
    } else {
      result = 'breakeven';
      pnlPips = rng(-2, 2);
      closePrice = entry + pnlPips * pip;
    }

    const lotSize = pick([0.01, 0.02, 0.05, 0.1, 0.1, 0.2]);
    const pnlPercent = pnlPips * lotSize * 0.1;
    const pnlR = result === 'win' ? rng(0.5, 3) : result === 'loss' ? -rng(0.5, 1.5) : 0;

    const tradeDate = new Date(startDate.getTime() + i * rng(12, 72) * 3600000);
    const dateStr = tradeDate.toISOString().split('T')[0];

    const notes = result === 'win'
      ? pick(['Clean setup', 'Perfect entry', 'Good RR', 'Textbook pattern', 'Strong momentum', ''])
      : result === 'loss'
      ? pick(['Stopped out', 'Early entry', 'Poor timing', 'Overextended', 'Fakeout', ''])
      : 'Break even - moved SL';

    trades.push({
      logType, orderType, strategyId, pair, tf, entry, tp, sl, closePrice,
      result, pnlPips: Math.round(pnlPips * 10) / 10, pnlPercent: Math.round(pnlPercent * 100) / 100,
      pnlR: Math.round(pnlR * 100) / 100, lotSize, rr: Math.round(rr * 100) / 100, notes, dateStr
    });
  }

  // Sort by date
  trades.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

  // Insert trades with conditions
  const transaction = db.transaction(() => {
    for (const t of trades) {
      const res = insertTrade.run(
        userId, t.logType, t.orderType, t.strategyId, t.pair, t.tf,
        Math.round(t.entry * 100000) / 100000, Math.round(t.tp * 100000) / 100000,
        Math.round(t.sl * 100000) / 100000, Math.round(t.closePrice * 100000) / 100000,
        t.result, t.pnlPips, t.pnlPercent, t.pnlR, t.lotSize, t.rr, t.notes, t.dateStr
      );
      const tradeId = res.lastInsertRowid;

      // Add condition values based on strategy
      if (t.strategyId === 1) {
        // SMC Reversal
        const hasLiqSweep = t.result === 'win' ? (Math.random() > 0.25) : (Math.random() > 0.55);
        insertCV.run(tradeId, 1, String(hasLiqSweep));
        insertCV.run(tradeId, 2, String(rand(30, 90)));
        insertCV.run(tradeId, 3, pick(['BOS', 'CHoCH']));
        insertCV.run(tradeId, 4, t.orderType === 'buy' ? 'Bullish OB' : 'Bearish OB');
        const hasFVG = t.result === 'win' ? (Math.random() > 0.3) : (Math.random() > 0.6);
        insertCV.run(tradeId, 5, String(hasFVG));
        insertCV.run(tradeId, 6, t.orderType === 'buy' ? pick(['Discount', 'Discount', 'Equilibrium']) : pick(['Premium', 'Premium', 'Equilibrium']));
        insertCV.run(tradeId, 7, pick(['Uptrend', 'Downtrend', 'Ranging']));
      } else if (t.strategyId === 2) {
        // Supply & Demand
        insertCV.run(tradeId, 8, t.orderType === 'buy' ? 'Demand' : 'Supply');
        const freshness = t.result === 'win' ? pick(['Fresh', 'Fresh', 'Tested']) : pick(['Tested', 'Tested', 'Broken']);
        insertCV.run(tradeId, 9, freshness);
        insertCV.run(tradeId, 10, String(rand(1, 5)));
        const hasEngulfing = t.result === 'win' ? (Math.random() > 0.3) : (Math.random() > 0.6);
        insertCV.run(tradeId, 11, String(hasEngulfing));
        insertCV.run(tradeId, 12, pick(['RBR', 'DBD', 'RBD', 'DBR']));
        const htfConfirm = t.result === 'win' ? (Math.random() > 0.2) : (Math.random() > 0.5);
        insertCV.run(tradeId, 13, String(htfConfirm));
      } else if (t.strategyId === 3) {
        // Breakout
        insertCV.run(tradeId, 14, String(rand(8, 40)));
        const hasVolume = t.result === 'win' ? (Math.random() > 0.25) : (Math.random() > 0.55);
        insertCV.run(tradeId, 15, String(hasVolume));
        const hasRetest = t.result === 'win' ? (Math.random() > 0.3) : (Math.random() > 0.6);
        insertCV.run(tradeId, 16, String(hasRetest));
        insertCV.run(tradeId, 17, t.orderType === 'buy' ? 'Bullish' : 'Bearish');
        insertCV.run(tradeId, 18, pick(['Support', 'Resistance', 'Trendline']));
        insertCV.run(tradeId, 19, String(Math.random() > 0.7));
      }
    }
  });

  transaction();

  const tradeCount = db.prepare('SELECT COUNT(*) as c FROM trade_logs').get().c;
  const condCount = db.prepare('SELECT COUNT(*) as c FROM condition_values').get().c;
  console.log(`✅ Seed complete: 2 users, 3 strategies, 19 conditions, ${tradeCount} trades, ${condCount} condition values`);
}

seed().catch(console.error);
