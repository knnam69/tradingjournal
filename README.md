# Trading Journal 📈

A personal web application designed for traders to record and analyze both **Live Trades** and **Backtests**. Track your performance, identify high-probability setups, and manage your risk with custom conditions built directly into your trading strategies.

## ✨ Core Features

- **Backtest & Live Logs:** Separate logs and analysis for simulated vs actual trading results.
- **Auto Risk:Reward & PnL (R):** Enter your standard parameters (Entry, TP, SL) and the application handles your metrics natively measured in "R" (Risk) to focus purely on risk management without absolute pips or percentage distraction.
- **Dynamic Strategies:** Assign customized conditions to each of your strategies (e.g. variables like "Liquidity swept? (Boolean)", "Time in Trade (Numeric)", "Session (Select)").
- **Rich Analytics Engine:**
  - Automated Dashboard with visual Equity Curve mapping.
  - Granular Win-Rate calculations per strategy and per timeframe.
  - "Condition Impact" Analysis (What variables are present in your best trades?).
  - "Best Setup Finder" to reveal the highest-performing combinations of circumstances.
- **Beautiful UI:** A premium Dark Theme with modern glassmorphism touches and responsive layout.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js version 18+ (20+ recommended).
- Git.

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/knnam69/tradingjournal.git
cd tradingjournal

# Install dependencies
npm install

# (Optional) Seed the database with dummy data to test out analysis metrics
npm run seed

# Start the application
npm start
```

### 3. Usage
Navigate your browser to `http://localhost:3000`. You can begin by registering a new user account, filling in generic strategy data, and logging your trades immediately.

---

## 🐳 Deployment (Docker & VPS)

For simple background deployments on personal VPS environments (Ubuntu, Debian, CentOS), Docker is deeply integrated into this project.

1. Ensure the host has `docker` and `docker-compose` installed.
2. Transfer your source files to your VPS.
3. Apply required permissions and run the container:
```bash
# Provide read/write permissions for the local persistent volume folders
mkdir -p data/db data/uploads
chmod -R 777 data

# Compile the native bindings and launch background server
docker-compose up -d --build
```
Your Trading Journal instance will persist its database files inside `/data/db/` and uploaded screenshots inside `/data/uploads/`.
The service will automatically restart following system reboots.

---

## 🔑 Administrator Tasks

### Resetting Passwords

If an authoritative user has forgotten their password or the sole account gets locked out, you can run the localized script to override the bcrypt hash.

#### Local Installation
```bash
node src/scripts/reset-password.js <username_or_email> <new_password>

# Example
node src/scripts/reset-password.js admin "secret123"
```

#### Docker Deployment
If the app is actively running via `docker-compose`, execute the script dynamically within the live container instance:
```bash
docker exec -it trading-journal node src/scripts/reset-password.js admin "secret123"
```

Upon success, the terminal will confirm the update, and you can log back in with the new credentials immediately.
