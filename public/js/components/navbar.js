// Navbar Component
function renderNavbar() {
  const navbar = document.getElementById('navbar');
  if (!API.isLoggedIn()) {
    navbar.innerHTML = '';
    return;
  }

  const currentHash = window.location.hash || '#/';
  const links = [
    { hash: '#/', label: 'Dashboard', icon: '📊' },
    { hash: '#/new-trade', label: 'New Trade', icon: '➕' },
    { hash: '#/trades', label: 'History', icon: '📋' },
    { hash: '#/strategies', label: 'Strategies', icon: '🎯' },
    { hash: '#/analysis', label: 'Analysis', icon: '🔬' }
  ];

  const initial = (API.user?.username || 'U')[0].toUpperCase();

  navbar.innerHTML = `
    <div class="navbar">
      <div class="navbar-brand" onclick="window.location.hash='#/'">
        <div class="brand-icon">📈</div>
        <span>TradingJournal</span>
      </div>
      <div class="navbar-links">
        ${links.map(l => `
          <div class="nav-link ${currentHash === l.hash ? 'active' : ''}" onclick="window.location.hash='${l.hash}'">
            <span>${l.icon}</span> ${l.label}
          </div>
        `).join('')}
      </div>
      <div class="navbar-user">
        <div class="user-avatar" title="${API.user?.username}">${initial}</div>
        <button class="btn-logout" onclick="logout()">Logout</button>
      </div>
    </div>
  `;
}

function logout() {
  API.clearAuth();
  window.location.hash = '#/login';
}
