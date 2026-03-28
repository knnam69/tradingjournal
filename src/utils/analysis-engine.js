const { getDb } = require('../db/schema');

function getOverview(userId, logType = null) {
  const db = getDb();
  let where = 'user_id = ?';
  let params = [userId];
  if (logType) { where += ' AND log_type = ?'; params.push(logType); }

  const total = db.prepare(`SELECT COUNT(*) as count FROM trade_logs WHERE ${where}`).get(...params).count;
  const wins = db.prepare(`SELECT COUNT(*) as count FROM trade_logs WHERE ${where} AND result = 'win'`).get(...params).count;
  const losses = db.prepare(`SELECT COUNT(*) as count FROM trade_logs WHERE ${where} AND result = 'loss'`).get(...params).count;
  const breakevens = db.prepare(`SELECT COUNT(*) as count FROM trade_logs WHERE ${where} AND result = 'breakeven'`).get(...params).count;

  const pnl = db.prepare(`SELECT SUM(pnl_pips) as pips, SUM(pnl_percent) as percent, SUM(pnl_r) as r FROM trade_logs WHERE ${where}`).get(...params);
  const avgWin = db.prepare(`SELECT AVG(pnl_r) as avg_r, AVG(pnl_pips) as avg_pips, AVG(pnl_percent) as avg_pct FROM trade_logs WHERE ${where} AND result = 'win'`).get(...params);
  const avgLoss = db.prepare(`SELECT AVG(pnl_r) as avg_r, AVG(pnl_pips) as avg_pips, AVG(pnl_percent) as avg_pct FROM trade_logs WHERE ${where} AND result = 'loss'`).get(...params);

  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
  const expectancy = total > 0 ? (((wins / total) * (avgWin?.avg_r || 0)) + (((losses) / total) * (avgLoss?.avg_r || 0))).toFixed(2) : 0;

  // Streak analysis
  const trades = db.prepare(`SELECT result FROM trade_logs WHERE ${where} ORDER BY trade_date ASC`).all(...params);
  let maxWinStreak = 0, maxLossStreak = 0, currentStreak = 0, currentType = '';
  for (const t of trades) {
    if (t.result === currentType) {
      currentStreak++;
    } else {
      currentType = t.result;
      currentStreak = 1;
    }
    if (currentType === 'win') maxWinStreak = Math.max(maxWinStreak, currentStreak);
    if (currentType === 'loss') maxLossStreak = Math.max(maxLossStreak, currentStreak);
  }

  return {
    total, wins, losses, breakevens, winRate: parseFloat(winRate),
    totalPnl: { pips: pnl?.pips || 0, percent: pnl?.percent || 0, r: pnl?.r || 0 },
    avgWin: { r: avgWin?.avg_r || 0, pips: avgWin?.avg_pips || 0, percent: avgWin?.avg_pct || 0 },
    avgLoss: { r: avgLoss?.avg_r || 0, pips: avgLoss?.avg_pips || 0, percent: avgLoss?.avg_pct || 0 },
    expectancy: parseFloat(expectancy), maxWinStreak, maxLossStreak
  };
}

function getByStrategy(userId, logType = null) {
  const db = getDb();
  let where = 't.user_id = ?';
  let params = [userId];
  if (logType) { where += ' AND t.log_type = ?'; params.push(logType); }

  const strategies = db.prepare(`
    SELECT s.id, s.name,
      COUNT(t.id) as total,
      SUM(CASE WHEN t.result = 'win' THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN t.result = 'loss' THEN 1 ELSE 0 END) as losses,
      ROUND(SUM(CASE WHEN t.result = 'win' THEN 1.0 ELSE 0 END) / COUNT(t.id) * 100, 1) as win_rate,
      SUM(t.pnl_pips) as total_pips,
      SUM(t.pnl_percent) as total_percent,
      SUM(t.pnl_r) as total_r,
      AVG(t.risk_reward) as avg_rr
    FROM trade_logs t
    JOIN strategies s ON t.strategy_id = s.id
    WHERE ${where}
    GROUP BY s.id
    ORDER BY win_rate DESC
  `).all(...params);

  return strategies;
}

function getByPair(userId, logType = null) {
  const db = getDb();
  let where = 'user_id = ?';
  let params = [userId];
  if (logType) { where += ' AND log_type = ?'; params.push(logType); }

  return db.prepare(`
    SELECT pair,
      COUNT(*) as total,
      SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
      ROUND(SUM(CASE WHEN result = 'win' THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as win_rate,
      SUM(pnl_pips) as total_pips,
      SUM(pnl_r) as total_r
    FROM trade_logs WHERE ${where}
    GROUP BY pair ORDER BY total DESC
  `).all(...params);
}

function getByTimeframe(userId, logType = null) {
  const db = getDb();
  let where = 'user_id = ?';
  let params = [userId];
  if (logType) { where += ' AND log_type = ?'; params.push(logType); }

  return db.prepare(`
    SELECT timeframe,
      COUNT(*) as total,
      SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
      ROUND(SUM(CASE WHEN result = 'win' THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as win_rate,
      SUM(pnl_pips) as total_pips,
      SUM(pnl_r) as total_r
    FROM trade_logs WHERE ${where}
    GROUP BY timeframe ORDER BY total DESC
  `).all(...params);
}

function getConditionImpact(userId, strategyId = null, logType = null) {
  const db = getDb();
  let where = 't.user_id = ?';
  let params = [userId];
  if (strategyId) { where += ' AND t.strategy_id = ?'; params.push(strategyId); }
  if (logType) { where += ' AND t.log_type = ?'; params.push(logType); }

  // Get all boolean conditions with their impact
  const conditions = db.prepare(`
    SELECT c.id, c.name, c.type, c.strategy_id, s.name as strategy_name
    FROM conditions c
    JOIN strategies s ON c.strategy_id = s.id
    WHERE s.user_id = ? ${strategyId ? 'AND c.strategy_id = ?' : ''}
  `).all(...(strategyId ? [userId, strategyId] : [userId]));

  const results = [];

  for (const cond of conditions) {
    if (cond.type === 'boolean') {
      // Win rate when condition = true vs false
      const trueWins = db.prepare(`
        SELECT COUNT(*) as total,
          SUM(CASE WHEN t.result = 'win' THEN 1 ELSE 0 END) as wins
        FROM trade_logs t
        JOIN condition_values cv ON t.id = cv.trade_log_id
        WHERE ${where} AND cv.condition_id = ? AND cv.value = 'true'
      `).get(...params, cond.id);

      const falseWins = db.prepare(`
        SELECT COUNT(*) as total,
          SUM(CASE WHEN t.result = 'win' THEN 1 ELSE 0 END) as wins
        FROM trade_logs t
        JOIN condition_values cv ON t.id = cv.trade_log_id
        WHERE ${where} AND cv.condition_id = ? AND cv.value = 'false'
      `).get(...params, cond.id);

      results.push({
        condition_id: cond.id,
        condition_name: cond.name,
        strategy_name: cond.strategy_name,
        type: 'boolean',
        true_total: trueWins.total,
        true_wins: trueWins.wins || 0,
        true_win_rate: trueWins.total > 0 ? ((trueWins.wins / trueWins.total) * 100).toFixed(1) : null,
        false_total: falseWins.total,
        false_wins: falseWins.wins || 0,
        false_win_rate: falseWins.total > 0 ? ((falseWins.wins / falseWins.total) * 100).toFixed(1) : null,
        impact: (trueWins.total > 0 && falseWins.total > 0) ?
          (((trueWins.wins / trueWins.total) - (falseWins.wins / falseWins.total)) * 100).toFixed(1) : null
      });
    } else if (cond.type === 'select') {
      // Win rate per option value
      const options = db.prepare(`
        SELECT cv.value,
          COUNT(*) as total,
          SUM(CASE WHEN t.result = 'win' THEN 1 ELSE 0 END) as wins,
          ROUND(SUM(CASE WHEN t.result = 'win' THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as win_rate
        FROM trade_logs t
        JOIN condition_values cv ON t.id = cv.trade_log_id
        WHERE ${where} AND cv.condition_id = ?
        GROUP BY cv.value ORDER BY win_rate DESC
      `).all(...params, cond.id);

      results.push({
        condition_id: cond.id,
        condition_name: cond.name,
        strategy_name: cond.strategy_name,
        type: 'select',
        options
      });
    }
  }

  return results;
}

function getBestSetup(userId, logType = null, minSampleSize = 5) {
  const db = getDb();
  let where = 't.user_id = ?';
  let params = [userId];
  if (logType) { where += ' AND t.log_type = ?'; params.push(logType); }

  // Get all strategies
  const strategies = db.prepare('SELECT id, name FROM strategies WHERE user_id = ?').all(userId);
  const setups = [];

  for (const strategy of strategies) {
    const boolConditions = db.prepare("SELECT id, name FROM conditions WHERE strategy_id = ? AND type = 'boolean'").all(strategy.id);

    if (boolConditions.length === 0) continue;

    // Generate combinations of true/false for boolean conditions
    const combCount = Math.pow(2, boolConditions.length);
    const maxCombinations = Math.min(combCount, 64); // limit to prevent explosion

    for (let i = 0; i < maxCombinations; i++) {
      const combo = {};
      const comboDesc = [];

      for (let j = 0; j < boolConditions.length; j++) {
        const val = (i >> j) & 1 ? 'true' : 'false';
        combo[boolConditions[j].id] = val;
        comboDesc.push(`${boolConditions[j].name}: ${val === 'true' ? '✅' : '❌'}`);
      }

      // Find trades matching this combination
      let matchSql = `
        SELECT t.id, t.result FROM trade_logs t
        WHERE ${where} AND t.strategy_id = ?
      `;
      let matchParams = [...params, strategy.id];

      for (const [condId, condVal] of Object.entries(combo)) {
        matchSql += ` AND EXISTS (SELECT 1 FROM condition_values cv WHERE cv.trade_log_id = t.id AND cv.condition_id = ? AND cv.value = ?)`;
        matchParams.push(parseInt(condId), condVal);
      }

      const trades = db.prepare(matchSql).all(...matchParams);
      if (trades.length < minSampleSize) continue;

      const wins = trades.filter(t => t.result === 'win').length;
      const winRate = ((wins / trades.length) * 100).toFixed(1);

      setups.push({
        strategy_name: strategy.name,
        conditions: comboDesc,
        total: trades.length,
        wins,
        win_rate: parseFloat(winRate)
      });
    }
  }

  // Sort by win rate descending
  setups.sort((a, b) => b.win_rate - a.win_rate);
  return setups.slice(0, 20);
}

function getEquityCurve(userId, logType = null) {
  const db = getDb();
  let where = 'user_id = ?';
  let params = [userId];
  if (logType) { where += ' AND log_type = ?'; params.push(logType); }

  const trades = db.prepare(`
    SELECT trade_date, pnl_pips, pnl_percent, pnl_r, result
    FROM trade_logs WHERE ${where}
    ORDER BY trade_date ASC
  `).all(...params);

  let cumPips = 0, cumPercent = 0, cumR = 0;
  return trades.map(t => {
    cumPips += t.pnl_pips;
    cumPercent += t.pnl_percent;
    cumR += t.pnl_r;
    return {
      date: t.trade_date,
      result: t.result,
      cumPips: Math.round(cumPips * 100) / 100,
      cumPercent: Math.round(cumPercent * 100) / 100,
      cumR: Math.round(cumR * 100) / 100
    };
  });
}

function getBacktestVsLive(userId) {
  const backtest = getOverview(userId, 'backtest');
  const live = getOverview(userId, 'live');
  return { backtest, live };
}

module.exports = { getOverview, getByStrategy, getByPair, getByTimeframe, getConditionImpact, getBestSetup, getEquityCurve, getBacktestVsLive };
