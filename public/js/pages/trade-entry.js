// Trade Entry Page
let tradeEntryStrategies = [];
let tradeEntryConditions = [];
let isEditing = false;
let editTradeId = null;

async function renderTradeEntryPage() {
  const main = document.getElementById('main-content');
  const fullHash = window.location.hash || '#/';
  const queryParts = fullHash.split('?');
  
  isEditing = queryParts[0] === '#/edit-trade';
  editTradeId = null;
  let tradeData = null;

  if (isEditing) {
    const params = new URLSearchParams(queryParts[1] || '');
    editTradeId = params.get('id');
    if (editTradeId) {
      try {
        tradeData = await API.get(`/trades/${editTradeId}`);
      } catch {
        showToast('Failed to load trade details', 'error');
      }
    }
  }

  try {
    tradeEntryStrategies = await API.get('/strategies');
  } catch { tradeEntryStrategies = []; }

  const pairOptions = Object.entries(INSTRUMENTS).map(([group, pairs]) =>
    `<optgroup label="${group}">${pairs.map(p => `<option value="${p}">${p}</option>`).join('')}</optgroup>`
  ).join('');

  const tfOptions = TIMEFRAMES.map(tf => `<option value="${tf}" ${tf === 'H1' ? 'selected' : ''}>${tf}</option>`).join('');
  const stratOptions = tradeEntryStrategies.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

  main.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">${isEditing ? 'Edit Trade' : 'New Trade'}</h1>
          <p class="page-subtitle">${isEditing ? 'Update your trade details' : 'Record a new trade entry'}</p>
        </div>
      </div>

      <form id="trade-form" onsubmit="submitTrade(event)" class="card" style="max-width:800px">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Trade Type</label>
            <div class="type-toggle" style="width:100%">
              <button type="button" class="type-toggle-btn active" style="flex:1" data-type="backtest" onclick="setTradeType(this)">📋 Backtest</button>
              <button type="button" class="type-toggle-btn" style="flex:1" data-type="live" onclick="setTradeType(this)">🔴 Live</button>
            </div>
            <input type="hidden" id="trade-log-type" value="backtest">
          </div>
          <div class="form-group">
            <label class="form-label">Order Type</label>
            <div class="order-type-group">
              <button type="button" class="order-type-btn buy active" onclick="setOrderType('buy', this)">▲ BUY</button>
              <button type="button" class="order-type-btn sell" onclick="setOrderType('sell', this)">▼ SELL</button>
            </div>
            <input type="hidden" id="trade-order-type" value="buy">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Strategy *</label>
            <select class="form-control" id="trade-strategy" required onchange="loadConditionsForStrategy(this.value)">
              <option value="">Select strategy...</option>
              ${stratOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Instrument *</label>
            <select class="form-control" id="trade-pair" required>
              <option value="">Select pair...</option>
              ${pairOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Timeframe</label>
            <select class="form-control" id="trade-timeframe">${tfOptions}</select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Entry Price</label>
            <input type="number" class="form-control" id="trade-entry" step="any" placeholder="0.00" oninput="calculateAutoPnL()">
          </div>
          <div class="form-group">
            <label class="form-label">Take Profit</label>
            <input type="number" class="form-control" id="trade-tp" step="any" placeholder="0.00" oninput="calculateAutoPnL()">
          </div>
          <div class="form-group">
            <label class="form-label">Stop Loss</label>
            <input type="number" class="form-control" id="trade-sl" step="any" placeholder="0.00" oninput="calculateAutoPnL()">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Trade Date *</label>
            <input type="date" class="form-control" id="trade-date" required value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label class="form-label">Result *</label>
            <select class="form-control" id="trade-result" required onchange="calculateAutoPnL()">
              <option value="">Select result...</option>
              <option value="win">✅ Win</option>
              <option value="loss">❌ Loss</option>
              <option value="breakeven">➖ Breakeven</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Risk:Reward Ratio</label>
            <input type="number" class="form-control" id="trade-rr" step="0.01" placeholder="0.00" readonly style="background:var(--bg-card)">
          </div>
          <div class="form-group">
            <label class="form-label">PnL (R)</label>
            <input type="number" class="form-control" id="trade-pnl-r" step="any" placeholder="0.00" readonly style="background:var(--bg-card)">
          </div>
        </div>


        <!-- Dynamic Conditions -->
        <div id="conditions-container"></div>

        <!-- Screenshot Upload -->
        <div class="form-group mt-2">
          <label class="form-label">Screenshot</label>
          <div class="file-upload" onclick="document.getElementById('trade-screenshot').click()">
            <input type="file" id="trade-screenshot" accept="image/*" onchange="previewScreenshot(this)">
            <div class="file-upload-icon">📷</div>
            <p>Click to upload chart screenshot</p>
            <div class="file-preview" id="screenshot-preview"></div>
          </div>
        </div>

        <!-- Notes -->
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea class="form-control" id="trade-notes" rows="3" placeholder="Additional notes about this trade..."></textarea>
        </div>

        <div class="flex justify-between items-center mt-3">
          <button type="button" class="btn btn-secondary" onclick="window.history.back()">Cancel</button>
          <button type="submit" class="btn btn-primary btn-lg" id="submit-trade-btn">${isEditing ? '💾 Update Trade' : '💾 Save Trade'}</button>
        </div>
      </form>
    </div>
  `;

  if (tradeData) {
    await populateTradeForm(tradeData);
  }
}

async function populateTradeForm(data) {
  // Set basic fields
  document.querySelector(`#trade-form .type-toggle-btn[data-type="${data.log_type}"]`)?.click();
  document.querySelector(`#trade-form .order-type-btn.${data.order_type}`)?.click();
  
  const strategySelect = document.getElementById('trade-strategy');
  if (data.strategy_id) {
    strategySelect.value = data.strategy_id;
    await loadConditionsForStrategy(data.strategy_id);
  }

  document.getElementById('trade-pair').value = data.pair || '';
  document.getElementById('trade-timeframe').value = data.timeframe || '';
  document.getElementById('trade-entry').value = data.entry_price || '';
  document.getElementById('trade-tp').value = data.tp || '';
  document.getElementById('trade-sl').value = data.sl || '';
  document.getElementById('trade-date').value = data.trade_date ? data.trade_date.split('T')[0] : '';
  document.getElementById('trade-result').value = data.result || '';
  document.getElementById('trade-pnl-r').value = data.pnl_r || '';
  document.getElementById('trade-rr').value = data.risk_reward || '';
  document.getElementById('trade-notes').value = data.notes || '';
  
  // Set conditions
  if (data.condition_values) {
    data.condition_values.forEach(cv => {
      const el = document.querySelector(`[data-condition-id="${cv.condition_id}"]`);
      if (el) el.value = cv.value;
    });
  }

  // Set screenshot preview if exists
  if (data.screenshot_url) {
    document.getElementById('screenshot-preview').innerHTML = `<img src="${data.screenshot_url}" alt="Screenshot" style="max-width:100px;border-radius:4px">`;
  }
}

function setTradeType(btn) {
  document.querySelectorAll('#trade-form .type-toggle .type-toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('trade-log-type').value = btn.dataset.type;
}

function setOrderType(type, btn) {
  document.querySelectorAll('.order-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('trade-order-type').value = type;
  calculateAutoPnL();
}

function calculateAutoPnL() {
  const orderType = document.getElementById('trade-order-type').value;
  const entry = parseFloat(document.getElementById('trade-entry').value);
  const tp = parseFloat(document.getElementById('trade-tp').value);
  const sl = parseFloat(document.getElementById('trade-sl').value);
  const result = document.getElementById('trade-result').value;

  const rrInput = document.getElementById('trade-rr');
  const pnlInput = document.getElementById('trade-pnl-r');

  let rr = 0;
  if (!isNaN(entry) && !isNaN(tp) && !isNaN(sl)) {
    let risk = 0;
    let reward = 0;
    
    if (orderType === 'buy') {
      risk = entry - sl;
      reward = tp - entry;
    } else if (orderType === 'sell') {
      risk = sl - entry;
      reward = entry - tp;
    }

    if (risk > 0 && reward >= 0) {
      rr = reward / risk;
      rrInput.value = (Math.round(rr * 100) / 100).toFixed(2);
    } else {
      rrInput.value = '';
    }
  } else {
    rrInput.value = '';
  }

  // Calculate PnL (R)
  const currentRR = parseFloat(rrInput.value);
  if (result === 'win' && !isNaN(currentRR)) {
    pnlInput.value = currentRR;
  } else if (result === 'loss') {
    pnlInput.value = -1;
  } else if (result === 'breakeven') {
    pnlInput.value = 0;
  } else {
    // If we have an existing PnL value and we're just calculating without result changes
    // leave it alone, or if no result, clear it.
    if (!result) pnlInput.value = '';
  }
}

async function loadConditionsForStrategy(strategyId) {
  const container = document.getElementById('conditions-container');
  if (!strategyId) {
    container.innerHTML = '';
    tradeEntryConditions = [];
    return;
  }

  try {
    tradeEntryConditions = await API.get(`/strategies/${strategyId}/conditions`);
    if (tradeEntryConditions.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <div class="conditions-section">
        <div class="conditions-title">⚙️ Strategy Conditions</div>
        ${tradeEntryConditions.map(c => renderConditionInput(c)).join('')}
      </div>
    `;
  } catch {
    container.innerHTML = '';
  }
}

function renderConditionInput(cond) {
  let input = '';
  const options = typeof cond.options === 'string' ? JSON.parse(cond.options) : (cond.options || []);

  switch (cond.type) {
    case 'boolean':
      input = `
        <select class="form-control" data-condition-id="${cond.id}" style="max-width:120px">
          <option value="">-</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>`;
      break;
    case 'number':
      input = `<input type="number" class="form-control" data-condition-id="${cond.id}" step="any" placeholder="0" style="max-width:120px">`;
      break;
    case 'select':
      input = `
        <select class="form-control" data-condition-id="${cond.id}" style="max-width:200px">
          <option value="">-</option>
          ${options.map(o => `<option value="${o}">${o}</option>`).join('')}
        </select>`;
      break;
    case 'text':
      input = `<input type="text" class="form-control" data-condition-id="${cond.id}" placeholder="..." style="max-width:200px">`;
      break;
  }

  return `<div class="condition-item"><label>${cond.name}</label>${input}</div>`;
}

function previewScreenshot(input) {
  const preview = document.getElementById('screenshot-preview');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => { preview.innerHTML = `<img src="${e.target.result}" alt="Screenshot">` };
    reader.readAsDataURL(input.files[0]);
  }
}

async function submitTrade(e) {
  e.preventDefault();
  const btn = document.getElementById('submit-trade-btn');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    const formData = new FormData();
    formData.append('log_type', document.getElementById('trade-log-type').value);
    formData.append('order_type', document.getElementById('trade-order-type').value);
    formData.append('strategy_id', document.getElementById('trade-strategy').value);
    formData.append('pair', document.getElementById('trade-pair').value);
    formData.append('timeframe', document.getElementById('trade-timeframe').value);
    formData.append('entry_price', document.getElementById('trade-entry').value || '0');
    formData.append('tp', document.getElementById('trade-tp').value || '0');
    formData.append('sl', document.getElementById('trade-sl').value || '0');
    formData.append('close_price', '0');
    formData.append('result', document.getElementById('trade-result').value);
    formData.append('pnl_pips', '0');
    formData.append('pnl_percent', '0');
    formData.append('pnl_r', document.getElementById('trade-pnl-r').value || '0');
    formData.append('lot_size', '0.01');
    formData.append('risk_reward', document.getElementById('trade-rr').value || '0');
    formData.append('notes', document.getElementById('trade-notes').value);
    formData.append('trade_date', document.getElementById('trade-date').value);

    // Condition values
    const conditionValues = [];
    document.querySelectorAll('[data-condition-id]').forEach(el => {
      const val = el.value;
      if (val !== '') {
        conditionValues.push({ condition_id: parseInt(el.dataset.conditionId), value: val });
      }
    });
    formData.append('condition_values', JSON.stringify(conditionValues));

    // Screenshot
    const screenshotInput = document.getElementById('trade-screenshot');
    if (screenshotInput.files[0]) {
      formData.append('screenshot', screenshotInput.files[0]);
    }

    if (isEditing && editTradeId) {
      await API.put(`/trades/${editTradeId}`, formData);
      showToast('Trade updated successfully!', 'success');
    } else {
      await API.post('/trades', formData);
      showToast('Trade saved successfully!', 'success');
    }
    
    window.location.hash = '#/trades';
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.textContent = isEditing ? '💾 Update Trade' : '💾 Save Trade';
    btn.disabled = false;
  }
}
