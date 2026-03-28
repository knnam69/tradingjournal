// Strategies Page
async function renderStrategiesPage() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Strategies</h1>
          <p class="page-subtitle">Manage your trading strategies and conditions</p>
        </div>
        <button class="btn btn-primary" onclick="openCreateStrategyModal()">➕ New Strategy</button>
      </div>
      <div class="strategy-grid" id="strategy-grid">
        <div class="skeleton skeleton-card"></div>
      </div>
    </div>
  `;
  await loadStrategies();
}

async function loadStrategies() {
  const grid = document.getElementById('strategy-grid');
  try {
    const strategies = await API.get('/strategies');
    if (strategies.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">🎯</div>
          <h3>No strategies yet</h3>
          <p>Create your first trading strategy to get started</p>
          <button class="btn btn-primary" onclick="openCreateStrategyModal()">➕ Create Strategy</button>
        </div>
      `;
      return;
    }

    // Load conditions for each strategy
    const strategyDetails = await Promise.all(strategies.map(s => API.get(`/strategies/${s.id}`)));

    grid.innerHTML = strategyDetails.map(s => `
      <div class="strategy-card" id="strategy-card-${s.id}">
        <div class="strategy-name">${s.name}</div>
        <div class="strategy-desc">${s.description || 'No description'}</div>
        <div class="strategy-conditions">
          ${(s.conditions || []).map(c => {
            const typeIcon = c.type === 'boolean' ? '🔘' : c.type === 'number' ? '#️⃣' : c.type === 'select' ? '📋' : '📝';
            return `<span class="condition-tag">${typeIcon} ${c.name}</span>`;
          }).join('')}
          ${(!s.conditions || s.conditions.length === 0) ? '<span class="text-muted" style="font-size:0.82rem">No conditions defined</span>' : ''}
        </div>
        <div class="strategy-actions">
          <button class="btn btn-sm btn-secondary" onclick="openEditStrategyModal(${s.id})">✏️ Edit</button>
          <button class="btn btn-sm btn-success" onclick="openAddConditionModal(${s.id})">➕ Condition</button>
          <button class="btn btn-sm btn-danger" onclick="deleteStrategy(${s.id})">🗑 Delete</button>
        </div>
      </div>
    `).join('');
  } catch {
    grid.innerHTML = '<p class="text-muted">Failed to load strategies</p>';
  }
}

function openCreateStrategyModal() {
  openModal('Create Strategy', `
    <div class="form-group">
      <label class="form-label">Strategy Name *</label>
      <input type="text" class="form-control" id="modal-strategy-name" placeholder="e.g., SMC Reversal" required>
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-control" id="modal-strategy-desc" rows="3" placeholder="Describe your strategy..."></textarea>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="createStrategy()">Create</button>
  `);
}

async function createStrategy() {
  const name = document.getElementById('modal-strategy-name').value.trim();
  if (!name) { showToast('Name is required', 'error'); return; }

  try {
    await API.post('/strategies', {
      name,
      description: document.getElementById('modal-strategy-desc').value
    });
    closeModal();
    showToast('Strategy created!', 'success');
    loadStrategies();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function openEditStrategyModal(id) {
  try {
    const strategy = await API.get(`/strategies/${id}`);
    openModal('Edit Strategy', `
      <div class="form-group">
        <label class="form-label">Strategy Name</label>
        <input type="text" class="form-control" id="modal-edit-name" value="${strategy.name}">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-control" id="modal-edit-desc" rows="3">${strategy.description || ''}</textarea>
      </div>
      ${strategy.conditions && strategy.conditions.length > 0 ? `
        <div class="mt-2">
          <strong class="form-label">Conditions:</strong>
          ${strategy.conditions.map(c => `
            <div class="condition-item">
              <label>${c.name} <span class="text-muted">(${c.type})</span></label>
              <button class="btn btn-sm btn-danger" onclick="deleteCondition(${c.id}, ${id})">✕</button>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="updateStrategy(${id})">Save</button>
    `);
  } catch {
    showToast('Failed to load strategy', 'error');
  }
}

async function updateStrategy(id) {
  try {
    await API.put(`/strategies/${id}`, {
      name: document.getElementById('modal-edit-name').value,
      description: document.getElementById('modal-edit-desc').value
    });
    closeModal();
    showToast('Strategy updated!', 'success');
    loadStrategies();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteStrategy(id) {
  if (!confirm('Delete this strategy and all its conditions? This cannot be undone.')) return;
  try {
    await API.delete(`/strategies/${id}`);
    showToast('Strategy deleted', 'success');
    loadStrategies();
  } catch {
    showToast('Failed to delete strategy', 'error');
  }
}

function openAddConditionModal(strategyId) {
  openModal('Add Condition', `
    <div class="form-group">
      <label class="form-label">Condition Name *</label>
      <input type="text" class="form-control" id="modal-cond-name" placeholder="e.g., Liquidity Sweep">
    </div>
    <div class="form-group">
      <label class="form-label">Type *</label>
      <select class="form-control" id="modal-cond-type" onchange="toggleCondOptions()">
        <option value="boolean">Boolean (Yes/No)</option>
        <option value="number">Number</option>
        <option value="select">Select (Dropdown)</option>
        <option value="text">Text</option>
      </select>
    </div>
    <div class="form-group hidden" id="cond-options-group">
      <label class="form-label">Options (comma separated)</label>
      <input type="text" class="form-control" id="modal-cond-options" placeholder="Option1, Option2, Option3">
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="addCondition(${strategyId})">Add</button>
  `);
}

function toggleCondOptions() {
  const type = document.getElementById('modal-cond-type').value;
  document.getElementById('cond-options-group').classList.toggle('hidden', type !== 'select');
}

async function addCondition(strategyId) {
  const name = document.getElementById('modal-cond-name').value.trim();
  const type = document.getElementById('modal-cond-type').value;
  if (!name) { showToast('Name is required', 'error'); return; }

  let options = [];
  if (type === 'select') {
    options = document.getElementById('modal-cond-options').value.split(',').map(s => s.trim()).filter(Boolean);
    if (options.length < 2) { showToast('Select type needs at least 2 options', 'error'); return; }
  }

  try {
    await API.post(`/strategies/${strategyId}/conditions`, { name, type, options });
    closeModal();
    showToast('Condition added!', 'success');
    loadStrategies();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteCondition(condId, strategyId) {
  if (!confirm('Delete this condition?')) return;
  try {
    await API.delete(`/strategies/conditions/${condId}`);
    showToast('Condition deleted', 'success');
    openEditStrategyModal(strategyId); // Reload modal
  } catch {
    showToast('Failed to delete condition', 'error');
  }
}
