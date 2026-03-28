// Login Page
function renderLoginPage() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card slide-up">
        <div class="login-logo">
          <div class="brand-icon">📈</div>
          <h1>Trading Journal</h1>
          <p>Track, Analyze & Optimize your trading</p>
        </div>

        <div class="login-tabs">
          <button class="login-tab active" id="tab-login" onclick="switchLoginTab('login')">Sign In</button>
          <button class="login-tab" id="tab-register" onclick="switchLoginTab('register')">Sign Up</button>
        </div>

        <form id="login-form" onsubmit="handleLogin(event)">
          <div class="form-group">
            <label class="form-label">Username or Email</label>
            <input type="text" class="form-control" id="login-input" placeholder="Enter username or email" required>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-control" id="login-password" placeholder="Enter password" required>
          </div>
          <button type="submit" class="btn btn-primary btn-lg w-full mt-2" id="login-btn">Sign In</button>
        </form>

        <form id="register-form" class="hidden" onsubmit="handleRegister(event)">
          <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" class="form-control" id="reg-username" placeholder="Choose a username" required>
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-control" id="reg-email" placeholder="Enter your email" required>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-control" id="reg-password" placeholder="Min 6 characters" required minlength="6">
          </div>
          <button type="submit" class="btn btn-primary btn-lg w-full mt-2" id="register-btn">Create Account</button>
        </form>

        <p class="text-center text-muted mt-2" style="font-size:0.82rem">
          Demo: <strong>demo</strong> / <strong>demo123</strong>
        </p>
      </div>
    </div>
  `;
}

function switchLoginTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  btn.textContent = 'Signing in...';
  btn.disabled = true;

  try {
    const data = await API.post('/auth/login', {
      login: document.getElementById('login-input').value,
      password: document.getElementById('login-password').value
    });
    API.setAuth(data.token, data.user);
    showToast('Welcome back, ' + data.user.username + '!', 'success');
    window.location.hash = '#/';
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.textContent = 'Sign In';
    btn.disabled = false;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('register-btn');
  btn.textContent = 'Creating...';
  btn.disabled = true;

  try {
    const data = await API.post('/auth/register', {
      username: document.getElementById('reg-username').value,
      email: document.getElementById('reg-email').value,
      password: document.getElementById('reg-password').value
    });
    API.setAuth(data.token, data.user);
    showToast('Account created! Welcome, ' + data.user.username, 'success');
    window.location.hash = '#/';
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.textContent = 'Create Account';
    btn.disabled = false;
  }
}
