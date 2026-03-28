// Analysis Page
async function renderAnalysisPage() {
  const main = document.getElementById('main-content');

  let strategies = [];
  try { strategies = await API.get('/strategies'); } catch {}

  main.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Analysis</h1>
          <p class="page-subtitle">Deep insights into your trading performance</p>
        </div>
        <div class="flex gap-2 items-center">
          <div class="type-toggle" id="analysis-type-toggle">
            <button class="type-toggle-btn active" data-type="" onclick="analysisFilterType(this)">All</button>
            <button class="type-toggle-btn" data-type="backtest" onclick="analysisFilterType(this)">Backtest</button>
            <button class="type-toggle-btn" data-type="live" onclick="analysisFilterType(this)">Live</button>
          </div>
        </div>
      </div>

      <!-- Backtest vs Live -->
      <div class="analysis-section" id="section-comparison">
        <div class="analysis-section-title">📊 Backtest vs Live Comparison</div>
        <div class="kpi-grid" id="comparison-grid"></div>
      </div>

      <!-- Strategy Performance -->
      <div class="analysis-section">
        <div class="analysis-section-title">🎯 Strategy Performance</div>
        <div class="chart-grid">
          <div class="chart-card">
            <div class="card-header"><h3 class="card-title">Win Rate by Strategy</h3></div>
            <div style="height:280px"><canvas id="analysis-strategy-chart"></canvas></div>
          </div>
          <div class="chart-card">
            <div class="card-header"><h3 class="card-title">PnL by Strategy (R)</h3></div>
            <div style="height:280px"><canvas id="analysis-strategy-pnl"></canvas></div>
          </div>
        </div>
      </div>

      <!-- Pair Performance -->
      <div class="analysis-section">
        <div class="analysis-section-title">💱 Performance by Pair</div>
        <div class="chart-grid">
          <div class="chart-card">
            <div class="card-header"><h3 class="card-title">Win Rate by Pair</h3></div>
            <div style="height:280px"><canvas id="analysis-pair-wr"></canvas></div>
          </div>
          <div class="chart-card">
            <div class="card-header"><h3 class="card-title">Trade Count by Pair</h3></div>
            <div style="height:280px"><canvas id="analysis-pair-count"></canvas></div>
          </div>
        </div>
      </div>

      <!-- Timeframe Performance -->
      <div class="analysis-section">
        <div class="analysis-section-title">⏱ Performance by Timeframe</div>
        <div class="chart-grid">
          <div class="chart-card">
            <div style="height:280px"><canvas id="analysis-tf-chart"></canvas></div>
          </div>
        </div>
      </div>

      <!-- Condition Impact -->
      <div class="analysis-section">
        <div class="analysis-section-title">⚡ Condition Impact Analysis</div>
        <div class="flex gap-2 mb-2">
          <select class="filter-select" id="analysis-strategy-filter" onchange="loadConditionImpact()">
            <option value="">All Strategies</option>
            ${strategies.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="impact-grid" id="condition-impact-grid">
          <div class="skeleton skeleton-card"></div>
        </div>
      </div>

      <!-- Best Setup -->
      <div class="analysis-section">
        <div class="analysis-section-title">🏆 Best Setup Finder</div>
        <p class="text-muted mb-2" style="font-size:0.85rem">Combinations of conditions with highest win rate (min 5 trades)</p>
        <div id="best-setup-list">
          <div class="skeleton skeleton-card"></div>
        </div>
      </div>
    </div>
  `;

  await loadAnalysisData('');
}

let analysisLogType = '';

function analysisFilterType(btn) {
  document.querySelectorAll('#analysis-type-toggle .type-toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  analysisLogType = btn.dataset.type;
  loadAnalysisData(analysisLogType);
}

async function loadAnalysisData(logType) {
  try {
    const typeQ = logType ? `?log_type=${logType}` : '';

    const [strategies, pairs, timeframes, comparison] = await Promise.all([
      API.get(`/analysis/by-strategy${typeQ}`),
      API.get(`/analysis/by-pair${typeQ}`),
      API.get(`/analysis/by-timeframe${typeQ}`),
      API.get('/analysis/backtest-vs-live')
    ]);

    // Backtest vs Live Comparison
    const bt = comparison.backtest;
    const lv = comparison.live;
    document.getElementById('comparison-grid').innerHTML = `
      <div class="kpi-card">
        <div class="kpi-label">Backtest Win Rate</div>
        <div class="kpi-value" style="color:var(--accent-secondary)">${bt.winRate}%</div>
        <div class="kpi-change">${bt.total} trades | ${formatNumber(bt.totalPnl.r)}R</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Live Win Rate</div>
        <div class="kpi-value" style="color:var(--color-win)">${lv.winRate}%</div>
        <div class="kpi-change">${lv.total} trades | ${formatNumber(lv.totalPnl.r)}R</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Win Rate Difference</div>
        <div class="kpi-value ${(bt.winRate - lv.winRate) >= 0 ? '' : 'positive'}">${bt.winRate > 0 ? formatNumber(lv.winRate - bt.winRate) : '-'}%</div>
        <div class="kpi-change">Live vs Backtest</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Backtest Expectancy</div>
        <div class="kpi-value ${bt.expectancy >= 0 ? 'positive' : 'negative'}">${bt.expectancy}R</div>
        <div class="kpi-change">Live: ${lv.expectancy}R</div>
      </div>
    `;

    // Strategy charts
    if (strategies.length > 0) {
      createBarChart('analysis-strategy-chart',
        strategies.map(s => s.name),
        [{
          label: 'Win Rate %',
          data: strategies.map(s => s.win_rate),
          backgroundColor: strategies.map((s, i) => ChartColors.palette[i % ChartColors.palette.length]),
          borderRadius: 6, barThickness: 40
        }],
        { plugins: { legend: { display: false } }, scales: { y: { ...chartDefaults.scales.y, max: 100, title: { display: true, text: 'Win Rate %', color: '#64748b' } } } }
      );

      createBarChart('analysis-strategy-pnl',
        strategies.map(s => s.name),
        [{
          label: 'Total R',
          data: strategies.map(s => s.total_r),
          backgroundColor: strategies.map(s => s.total_r >= 0 ? ChartColors.win : ChartColors.loss),
          borderRadius: 6, barThickness: 40
        }],
        { plugins: { legend: { display: false } } }
      );
    }

    // Pair charts
    if (pairs.length > 0) {
      const sortedByWR = [...pairs].sort((a, b) => b.win_rate - a.win_rate);
      createBarChart('analysis-pair-wr',
        sortedByWR.map(p => p.pair),
        [{
          label: 'Win Rate %',
          data: sortedByWR.map(p => p.win_rate),
          backgroundColor: sortedByWR.map(p => p.win_rate >= 50 ? ChartColors.win : ChartColors.loss),
          borderRadius: 4
        }],
        { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ...chartDefaults.scales.x, max: 100 } } }
      );

      createDoughnutChart('analysis-pair-count',
        pairs.slice(0, 8).map(p => p.pair),
        pairs.slice(0, 8).map(p => p.total),
        ChartColors.palette.slice(0, 8)
      );
    }

    // Timeframe chart
    if (timeframes.length > 0) {
      createBarChart('analysis-tf-chart',
        timeframes.map(t => t.timeframe),
        [
          {
            label: 'Win Rate %',
            data: timeframes.map(t => t.win_rate),
            backgroundColor: ChartColors.primary,
            borderRadius: 4, barThickness: 30
          },
          {
            label: 'Trades',
            data: timeframes.map(t => t.total),
            backgroundColor: ChartColors.secondary,
            borderRadius: 4, barThickness: 30
          }
        ]
      );
    }

    // Load condition impact and best setup
    loadConditionImpact();
    loadBestSetup();

  } catch (err) {
    console.error('Analysis error:', err);
    showToast('Failed to load analysis data', 'error');
  }
}

async function loadConditionImpact() {
  const grid = document.getElementById('condition-impact-grid');
  const stratId = document.getElementById('analysis-strategy-filter')?.value || '';
  const typeQ = analysisLogType ? `&log_type=${analysisLogType}` : '';

  try {
    const impact = await API.get(`/analysis/condition-impact?strategy_id=${stratId}${typeQ}`);

    if (impact.length === 0) {
      grid.innerHTML = '<p class="text-muted">No condition data available</p>';
      return;
    }

    grid.innerHTML = impact.map(item => {
      if (item.type === 'boolean') {
        const trueWR = item.true_win_rate ? parseFloat(item.true_win_rate) : 0;
        const falseWR = item.false_win_rate ? parseFloat(item.false_win_rate) : 0;
        const impactVal = item.impact ? parseFloat(item.impact) : 0;

        return `
          <div class="impact-card">
            <div class="impact-name">${item.condition_name} <span class="text-muted" style="font-size:0.75rem">(${item.strategy_name})</span></div>
            <div class="impact-bar">
              <div class="impact-bar-label">Yes (${item.true_total})</div>
              <div class="impact-bar-track"><div class="impact-bar-fill positive" style="width:${trueWR}%"></div></div>
              <div class="impact-bar-value text-win">${trueWR}%</div>
            </div>
            <div class="impact-bar">
              <div class="impact-bar-label">No (${item.false_total})</div>
              <div class="impact-bar-track"><div class="impact-bar-fill negative" style="width:${falseWR}%"></div></div>
              <div class="impact-bar-value text-loss">${falseWR}%</div>
            </div>
            <div class="mt-1 text-center" style="font-size:0.82rem">
              Impact: <strong class="${impactVal >= 0 ? 'text-win' : 'text-loss'}">${impactVal >= 0 ? '+' : ''}${impactVal}%</strong>
            </div>
          </div>
        `;
      } else if (item.type === 'select' && item.options) {
        return `
          <div class="impact-card">
            <div class="impact-name">${item.condition_name} <span class="text-muted" style="font-size:0.75rem">(${item.strategy_name})</span></div>
            ${item.options.map(opt => `
              <div class="impact-bar">
                <div class="impact-bar-label" style="min-width:80px">${opt.value} (${opt.total})</div>
                <div class="impact-bar-track"><div class="impact-bar-fill positive" style="width:${opt.win_rate || 0}%"></div></div>
                <div class="impact-bar-value">${opt.win_rate || 0}%</div>
              </div>
            `).join('')}
          </div>
        `;
      }
      return '';
    }).join('');

  } catch {
    grid.innerHTML = '<p class="text-muted">Failed to load condition impact data</p>';
  }
}

async function loadBestSetup() {
  const list = document.getElementById('best-setup-list');
  const typeQ = analysisLogType ? `?log_type=${analysisLogType}` : '';

  try {
    const setups = await API.get(`/analysis/best-setup${typeQ}`);

    if (setups.length === 0) {
      list.innerHTML = '<p class="text-muted">Not enough data to identify best setups (min 5 trades per combination)</p>';
      return;
    }

    list.innerHTML = setups.slice(0, 10).map((s, idx) => `
      <div class="setup-card">
        <div class="setup-header">
          <span class="setup-rank">${idx + 1}</span>
          <span class="setup-strategy">${s.strategy_name}</span>
          <span class="setup-winrate ${s.win_rate >= 50 ? 'text-win' : 'text-loss'}">${s.win_rate}%</span>
        </div>
        <div class="setup-conditions">
          ${s.conditions.map(c => {
            const isTrue = c.includes('✅');
            return `<span class="setup-cond-tag ${isTrue ? 'true' : 'false'}">${c}</span>`;
          }).join('')}
        </div>
        <div class="text-muted mt-1" style="font-size:0.8rem">${s.wins}/${s.total} trades won</div>
      </div>
    `).join('');
  } catch {
    list.innerHTML = '<p class="text-muted">Failed to load best setups</p>';
  }
}
