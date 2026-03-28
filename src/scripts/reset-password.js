const bcrypt = require('bcryptjs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'db', 'trading.db');

async function resetPassword() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node reset-password.js <username_or_email> <new_password>');
    console.log('Example: node reset-password.js admin "newpassword123"');
    process.exit(1);
  }

  const [identifier, newPassword] = args;

  if (newPassword.length < 6) {
    console.error('❌ Error: Password must be at least 6 characters.');
    process.exit(1);
  }

  try {
    const db = new Database(DB_PATH);
    
    // Check if user exists
    const user = db.prepare('SELECT id, username FROM users WHERE username = ? OR email = ?').get(identifier, identifier);
    
    if (!user) {
      console.error(`❌ Error: User '${identifier}' not found.`);
      process.exit(1);
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update db
    const info = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);

    if (info.changes > 0) {
      console.log(`✅ Success: Password for user '${user.username}' has been updated successfully.`);
    } else {
      console.error('❌ Error: Failed to update the password.');
    }
    
    db.close();
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
}

resetPassword();
