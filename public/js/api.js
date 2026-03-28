// API Client with JWT auth
const API = {
  baseUrl: '/api',
  token: localStorage.getItem('tj_token'),
  user: JSON.parse(localStorage.getItem('tj_user') || 'null'),

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('tj_token', token);
    localStorage.setItem('tj_user', JSON.stringify(user));
  },

  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('tj_token');
    localStorage.removeItem('tj_user');
  },

  isLoggedIn() {
    return !!this.token;
  },

  async request(endpoint, options = {}) {
    const headers = { ...options.headers };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers
      });

      if (res.status === 401) {
        this.clearAuth();
        window.location.hash = '#/login';
        throw new Error('Session expired');
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    } catch (err) {
      if (err.message !== 'Session expired') {
        console.error(`API Error [${endpoint}]:`, err);
      }
      throw err;
    }
  },

  get(endpoint) { return this.request(endpoint); },

  post(endpoint, body) {
    if (body instanceof FormData) {
      return this.request(endpoint, { method: 'POST', body });
    }
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  },

  put(endpoint, body) {
    if (body instanceof FormData) {
      return this.request(endpoint, { method: 'PUT', body });
    }
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  },

  delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
};

// Trading Instruments (Exness)
const INSTRUMENTS = {
  'Forex Majors': ['EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','USDCAD','NZDUSD'],
  'Forex Minors': ['EURGBP','EURJPY','EURCHF','EURAUD','EURCAD','EURNZD','GBPJPY','GBPCHF','GBPAUD','GBPCAD','GBPNZD','AUDJPY','AUDCHF','AUDCAD','AUDNZD','CADJPY','CADCHF','CHFJPY','NZDJPY','NZDCAD','NZDCHF'],
  'Forex Exotics': ['USDTRY','USDZAR','USDMXN','USDSGD','USDHKD','USDNOK','USDSEK','USDPLN','USDCZK','USDHUF','USDTHB','EURTRY','EURZAR','EURMXN','EURNOK','EURSEK','EURPLN','EURHUF','GBPTRY','GBPZAR','GBPNOK','GBPSEK'],
  'Metals': ['XAUUSD','XAGUSD','XAUEUR','XAUGBP','XAUAUD','XPTUSD'],
  'Energies': ['USOIL','UKOIL','XNGUSD'],
  'Crypto': ['BTCUSD','ETHUSD','LTCUSD','XRPUSD','BCHUSD','SOLUSD','ADAUSD','DOTUSD','DOGEUSD','LINKUSD'],
  'Indices': ['US30','US500','USTEC','UK100','DE30','FR40','JP225','AU200','HK50'],
  'Stocks': ['AAPL','AMZN','TSLA','GOOGL','META','MSFT','NFLX','NVDA','AMD','DIS']
};

const TIMEFRAMES = ['M1','M5','M15','M30','H1','H4','D1','W1','MN'];

// Toast notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100px)'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// Utility
function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined) return '-';
  return parseFloat(num).toFixed(decimals);
}
