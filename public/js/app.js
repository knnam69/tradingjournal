// SPA Router
const routes = {
  '#/': renderDashboardPage,
  '#/login': renderLoginPage,
  '#/new-trade': renderTradeEntryPage,
  '#/edit-trade': renderTradeEntryPage,
  '#/trades': renderTradeHistoryPage,
  '#/strategies': renderStrategiesPage,
  '#/analysis': renderAnalysisPage
};

function router() {
  const fullHash = window.location.hash || '#/';
  const hash = fullHash.split('?')[0];

  // Auth guard
  if (!API.isLoggedIn() && hash !== '#/login') {
    window.location.hash = '#/login';
    return;
  }

  if (API.isLoggedIn() && hash === '#/login') {
    window.location.hash = '#/';
    return;
  }

  // Render navbar
  renderNavbar();

  // Style adjustment for login page
  const mainContent = document.getElementById('main-content');
  if (hash === '#/login') {
    mainContent.style.paddingTop = '0';
    mainContent.style.maxWidth = 'none';
  } else {
    mainContent.style.paddingTop = '';
    mainContent.style.maxWidth = '';
  }

  // Route to page
  const route = routes[hash];
  if (route) {
    route();
  } else {
    mainContent.innerHTML = `
      <div class="empty-state" style="margin-top:100px">
        <div class="empty-state-icon">🔍</div>
        <h3>Page not found</h3>
        <p>The page you're looking for doesn't exist</p>
        <button class="btn btn-primary" onclick="window.location.hash='#/'">Go to Dashboard</button>
      </div>
    `;
  }
}

// Listen for hash changes
window.addEventListener('hashchange', router);

// Initial route
router();
