// Trade History Page
let historyPage = 1;
let historyFilters = {};
let historySort = { by: 'date', dir: 'desc' };

async function renderTradeHistoryPage() {
  const main = document.getElementById('main-content');

  let strategies = [];
  try { strategies = await API.get('/strategies'); } catch {}

  const stratOptions = strategies.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  const pairList = Object.values(INSTRUMENTS).flat();

  main.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Trade History</h1>
          <p class="page-subtitle">View and manage all your trades</p>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-primary" onclick="window.location.hash='#/new-trade'">➕ New Trade</button>
        </div>
      </div>

      <div class="filters-bar">
        <select class="filter-select" id="filter-type" onchange="applyHistoryFilters()">
          <option value="">All Types</option>
          <option value="backtest">Backtest</option>
          <option value="live">Live</option>
        </select>
        <select class="filter-select" id="filter-order" onchange="applyHistoryFilters()">
          <option value="">All Orders</option>
          <option value="buy">BUY</option>
          <option value="sell">SELL</option>
        </select>
        <select class="filter-select" id="filter-pair" onchange="applyHistoryFilters()">
          <option value="">All Pairs</option>
          ${pairList.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
        <select class="filter-select" id="filter-strategy" onchange="applyHistoryFilters()">
          <option value="">All Strategies</option>
          ${stratOptions}
        </select>
        <select class="filter-select" id="filter-result" onchange="applyHistoryFilters()">
          <option value="">All Results</option>
          <option value="win">Win</option>
          <option value="loss">Loss</option>
          <option value="breakeven">Breakeven</option>
        </select>
        <input type="date" class="filter-input" id="filter-from" onchange="applyHistoryFilters()" title="From date">
        <input type="date" class="filter-input" id="filter-to" onchange="applyHistoryFilters()" title="To date">
        <button class="btn btn-sm btn-secondary" onclick="clearHistoryFilters()">Clear</button>
      </div>

      <div id="trades-table-container">
        <div class="skeleton skeleton-card"></div>
      </div>
      <div id="trades-pagination"></div>
    </div>
  `;

  historyPage = 1;
  historyFilters = {};
  await loadTradesTable();
}

function setHistorySort(by) {
  if (historySort.by === by) {
    historySort.dir = historySort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    historySort.by = by;
    historySort.dir = 'desc';
  }
  loadTradesTable();
}

function applyHistoryFilters() {
  historyFilters = {
    log_type: document.getElementById('filter-type').value,
    order_type: document.getElementById('filter-order').value,
    pair: document.getElementById('filter-pair').value,
    strategy_id: document.getElementById('filter-strategy').value,
    result: document.getElementById('filter-result').value,
    date_from: document.getElementById('filter-from').value,
    date_to: document.getElementById('filter-to').value
  };
  historyPage = 1;
  loadTradesTable();
}

function clearHistoryFilters() {
  document.getElementById('filter-type').value = '';
  document.getElementById('filter-order').value = '';
  document.getElementById('filter-pair').value = '';
  document.getElementById('filter-strategy').value = '';
  document.getElementById('filter-result').value = '';
  document.getElementById('filter-from').value = '';
  document.getElementById('filter-to').value = '';
  historyFilters = {};
  historyPage = 1;
  loadTradesTable();
}

async function loadTradesTable() {
  const container = document.getElementById('trades-table-container');

  let query = `?page=${historyPage}&limit=20&sort_by=${historySort.by}&sort_dir=${historySort.dir}`;
  for (const [k, v] of Object.entries(historyFilters)) {
    if (v) query += `&${k}=${v}`;
  }

  try {
    const data = await API.get(`/trades${query}`);

    if (data.trades.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>No trades found</h3>
          <p>Start recording your trades to see them here</p>
          <button class="btn btn-primary" onclick="window.location.hash='#/new-trade'">➕ Record First Trade</button>
        </div>
      `;
      document.getElementById('trades-pagination').innerHTML = '';
      return;
    }

    container.innerHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th class="sortable" onclick="setHistorySort('date')">Date ${historySort.by==='date'?(historySort.dir==='asc'?'↑':'↓'):''}</th>
              <th class="sortable" onclick="setHistorySort('type')">Type ${historySort.by==='type'?(historySort.dir==='asc'?'↑':'↓'):''}</th>
              <th class="sortable" onclick="setHistorySort('order')">Order ${historySort.by==='order'?(historySort.dir==='asc'?'↑':'↓'):''}</th>
              <th class="sortable" onclick="setHistorySort('pair')">Pair ${historySort.by==='pair'?(historySort.dir==='asc'?'↑':'↓'):''}</th>
              <th class="sortable" onclick="setHistorySort('tf')">TF ${historySort.by==='tf'?(historySort.dir==='asc'?'↑':'↓'):''}</th>
              <th class="sortable" onclick="setHistorySort('strategy')">Strategy ${historySort.by==='strategy'?(historySort.dir==='asc'?'↑':'↓'):''}</th>
              <th class="sortable" onclick="setHistorySort('result')">Result ${historySort.by==='result'?(historySort.dir==='asc'?'↑':'↓'):''}</th>
              <th class="sortable" onclick="setHistorySort('pnl')">PnL (R) ${historySort.by==='pnl'?(historySort.dir==='asc'?'↑':'↓'):''}</th>
              <th class="sortable" onclick="setHistorySort('rr')">R:R ${historySort.by==='rr'?(historySort.dir==='asc'?'↑':'↓'):''}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.trades.map(t => `
              <tr>
                <td>${formatDate(t.trade_date)}</td>
                <td><span class="badge badge-${t.log_type}">${t.log_type}</span></td>
                <td><span class="badge badge-${t.order_type}">${t.order_type.toUpperCase()}</span></td>
                <td><strong>${t.pair}</strong></td>
                <td>${t.timeframe}</td>
                <td class="text-secondary">${t.strategy_name || '-'}</td>
                <td><span class="badge badge-${t.result}">${t.result}</span></td>
                <td class="${t.pnl_r >= 0 ? 'text-win' : 'text-loss'}" style="font-weight:600">${t.pnl_r >= 0 ? '+' : ''}${formatNumber(t.pnl_r)}</td>
                <td>${formatNumber(t.risk_reward)}</td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-sm btn-secondary" onclick="viewTradeDetail(${t.id})" title="View">👁</button>
                    <button class="btn btn-sm btn-primary" onclick="window.location.hash='#/edit-trade?id=${t.id}'" title="Edit">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTrade(${t.id})" title="Delete">🗑</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Pagination
    const pg = document.getElementById('trades-pagination');
    if (data.totalPages > 1) {
      let pgHtml = '<div class="pagination">';
      pgHtml += `<button ${historyPage <= 1 ? 'disabled' : ''} onclick="goToPage(${historyPage - 1})">‹</button>`;
      for (let i = 1; i <= data.totalPages; i++) {
        pgHtml += `<button class="${i === historyPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
      }
      pgHtml += `<button ${historyPage >= data.totalPages ? 'disabled' : ''} onclick="goToPage(${historyPage + 1})">›</button>`;
      pgHtml += '</div>';
      pg.innerHTML = pgHtml;
    } else {
      pg.innerHTML = '';
    }
  } catch (err) {
    container.innerHTML = '<p class="text-muted text-center">Failed to load trades</p>';
  }
}

function goToPage(page) {
  historyPage = page;
  loadTradesTable();
}

async function viewTradeDetail(id) {
  try {
    const trade = await API.get(`/trades/${id}`);
    const pnlInfo = `R: ${formatNumber(trade.pnl_r)}`;

    let condHtml = '';
    if (trade.condition_values && trade.condition_values.length > 0) {
      condHtml = `
        <div class="mt-2">
          <strong class="text-secondary" style="font-size:0.85rem">Conditions:</strong>
          <div class="strategy-conditions mt-1">
            ${trade.condition_values.map(cv => {
              const displayVal = cv.value === 'true' ? '✅' : cv.value === 'false' ? '❌' : cv.value;
              return `<span class="condition-tag">${cv.condition_name}: ${displayVal}</span>`;
            }).join('')}
          </div>
        </div>
      `;
    }

    const screenshotHtml = trade.screenshot_url ? `
      <div class="mt-2">
        <strong class="text-secondary" style="font-size:0.85rem">Screenshot:</strong>
        <div class="mt-1"><img src="${trade.screenshot_url}" style="max-width:100%;border-radius:8px;border:1px solid var(--border-color)"></div>
      </div>
    ` : '';

    openModal(`Trade #${trade.id}`, `
      <div class="form-row">
        <div><span class="text-muted">Type:</span> <span class="badge badge-${trade.log_type}">${trade.log_type}</span></div>
        <div><span class="text-muted">Order:</span> <span class="badge badge-${trade.order_type}">${trade.order_type.toUpperCase()}</span></div>
        <div><span class="text-muted">Result:</span> <span class="badge badge-${trade.result}">${trade.result}</span></div>
      </div>
      <div class="mt-2" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:0.9rem">
        <div><span class="text-muted">Pair:</span> <strong>${trade.pair}</strong></div>
        <div><span class="text-muted">Timeframe:</span> ${trade.timeframe}</div>
        <div><span class="text-muted">Strategy:</span> ${trade.strategy_name || '-'}</div>
        <div><span class="text-muted">Date:</span> ${formatDate(trade.trade_date)}</div>
        <div><span class="text-muted">Entry:</span> ${trade.entry_price}</div>
        <div><span class="text-muted">Close:</span> ${trade.close_price}</div>
        <div><span class="text-muted">TP:</span> ${trade.tp}</div>
        <div><span class="text-muted">SL:</span> ${trade.sl}</div>
        <div><span class="text-muted">Lot:</span> ${trade.lot_size}</div>
        <div><span class="text-muted">R:R:</span> ${formatNumber(trade.risk_reward)}</div>
      </div>
      <div class="mt-2" style="font-size:0.9rem"><span class="text-muted">PnL:</span> ${pnlInfo}</div>
      ${trade.notes ? `<div class="mt-2" style="font-size:0.9rem"><span class="text-muted">Notes:</span> ${trade.notes}</div>` : ''}
      ${condHtml}
      ${screenshotHtml}
    `);
  } catch {
    showToast('Failed to load trade details', 'error');
  }
}

async function deleteTrade(id) {
  if (!confirm('Delete this trade?')) return;
  try {
    await API.delete(`/trades/${id}`);
    showToast('Trade deleted', 'success');
    loadTradesTable();
  } catch {
    showToast('Failed to delete', 'error');
  }
}
