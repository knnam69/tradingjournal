// Dashboard Page
async function renderDashboardPage() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Trading performance overview</p>
        </div>
        <div class="flex items-center gap-2">
          <div class="type-toggle" id="dash-type-toggle">
            <button class="type-toggle-btn active" data-type="" onclick="dashFilterType(this)">All</button>
            <button class="type-toggle-btn" data-type="backtest" onclick="dashFilterType(this)">Backtest</button>
            <button class="type-toggle-btn" data-type="live" onclick="dashFilterType(this)">Live</button>
          </div>
          <button class="btn btn-primary" onclick="window.location.hash='#/new-trade'">➕ New Trade</button>
        </div>
      </div>

      <div class="kpi-grid" id="kpi-grid">
        <div class="kpi-card"><div class="skeleton skeleton-card"></div></div>
        <div class="kpi-card"><div class="skeleton skeleton-card"></div></div>
        <div class="kpi-card"><div class="skeleton skeleton-card"></div></div>
        <div class="kpi-card"><div class="skeleton skeleton-card"></div></div>
      </div>

      <div class="chart-grid" id="chart-grid">
        <div class="chart-card">
          <div class="card-header"><h3 class="card-title">📈 Equity Curve</h3>
          </div>
          <div style="height:280px"><canvas id="equity-chart"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="card-header"><h3 class="card-title">🎯 Win Rate by Strategy</h3></div>
          <div style="height:280px"><canvas id="strategy-chart"></canvas></div>
        </div>
      </div>

      <div class="chart-grid">
        <div class="chart-card">
          <div class="card-header"><h3 class="card-title">💰 Performance by Pair</h3></div>
          <div style="height:280px"><canvas id="pair-chart"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="card-header"><h3 class="card-title">📊 Result Distribution</h3></div>
          <div style="height:280px"><canvas id="result-chart"></canvas></div>
        </div>
      </div>
    </div>
  `;
  await loadDashboardData('');
}

let dashEquityData = null;

async function loadDashboardData(logType) {
  try {
    const [overview, strategies, pairs, equity] = await Promise.all([
      API.get(`/analysis/overview${logType ? '?log_type=' + logType : ''}`),
      API.get(`/analysis/by-strategy${logType ? '?log_type=' + logType : ''}`),
      API.get(`/analysis/by-pair${logType ? '?log_type=' + logType : ''}`),
      API.get(`/analysis/equity-curve${logType ? '?log_type=' + logType : ''}`)
    ]);

    dashEquityData = equity;

    // KPI Cards
    const pnlValue = overview.totalPnl.pips;
    const pnlClass = pnlValue >= 0 ? 'positive' : 'negative';
    document.getElementById('kpi-grid').innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon">📊</div>
        <div class="kpi-label">Total Trades</div>
        <div class="kpi-value">${overview.total}</div>
        <div class="kpi-change">${overview.wins}W / ${overview.losses}L / ${overview.breakevens}BE</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">🎯</div>
        <div class="kpi-label">Win Rate</div>
        <div class="kpi-value ${overview.winRate >= 50 ? 'positive' : 'negative'}">${overview.winRate}%</div>
        <div class="kpi-change">Streak: ${overview.maxWinStreak}W / ${overview.maxLossStreak}L</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">💰</div>
        <div class="kpi-label">Total PnL</div>
        <div class="kpi-value ${overview.totalPnl.r >= 0 ? 'positive' : 'negative'}">${overview.totalPnl.r >= 0 ? '+' : ''}${formatNumber(overview.totalPnl.r)}R</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">⚡</div>
        <div class="kpi-label">Expectancy</div>
        <div class="kpi-value ${overview.expectancy >= 0 ? 'positive' : 'negative'}">${overview.expectancy}R</div>
        <div class="kpi-change">Avg Win: ${formatNumber(overview.avgWin.r)}R | Avg Loss: ${formatNumber(overview.avgLoss.r)}R</div>
      </div>
    `;

    // Equity Curve
    renderEquityCurve();

    // Strategy Chart
    if (strategies.length > 0) {
      createBarChart('strategy-chart',
        strategies.map(s => s.name),
        [{
          label: 'Win Rate %',
          data: strategies.map(s => s.win_rate),
          backgroundColor: strategies.map((_, i) => ChartColors.palette[i % ChartColors.palette.length]),
          borderRadius: 6,
          barThickness: 40
        }],
        { plugins: { legend: { display: false } }, scales: { y: { ...chartDefaults.scales.y, max: 100 } } }
      );
    }

    // Pair Chart
    if (pairs.length > 0) {
      createBarChart('pair-chart',
        pairs.map(p => p.pair),
        [{
          label: 'Total PnL (R)',
          data: pairs.map(p => p.total_r),
          backgroundColor: pairs.map(p => p.total_r >= 0 ? ChartColors.win : ChartColors.loss),
          borderRadius: 4
        }],
        { plugins: { legend: { display: false } } }
      );
    }

    // Result Distribution
    createDoughnutChart('result-chart',
      ['Wins', 'Losses', 'Breakeven'],
      [overview.wins, overview.losses, overview.breakevens],
      [ChartColors.win, ChartColors.loss, ChartColors.breakeven]
    );

  } catch (err) {
    showToast('Failed to load dashboard data', 'error');
  }
}

function renderEquityCurve() {
  if (!dashEquityData) return;

  createLineChart('equity-chart',
    dashEquityData.map((d, i) => i + 1),
    [{
      label: `Cumulative PnL (R)`,
      data: dashEquityData.map(d => d.cumR),
      borderColor: ChartColors.primary,
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      fill: true,
      pointBackgroundColor: dashEquityData.map(d => d.result === 'win' ? ChartColors.win : d.result === 'loss' ? ChartColors.loss : ChartColors.breakeven)
    }],
    { scales: { x: { ...chartDefaults.scales.x, title: { display: true, text: 'Trade #', color: '#64748b' } } } }
  );
}

function dashFilterType(btn) {
  document.querySelectorAll('#dash-type-toggle .type-toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadDashboardData(btn.dataset.type);
}
