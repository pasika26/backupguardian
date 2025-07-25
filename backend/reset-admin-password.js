const bcrypt = require('bcrypt');
const { query } = require('./src/db');

async function resetAdminPassword() {
  try {
    const email = 'admin@backupguardian.com'; // Change to admin@test.com if needed
    const newPassword = 'NewAdminPassword123!'; // Change this to your desired password
    
    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update the password in database
    const result = await query(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [hashedPassword, email]
    );
    
    if (result.changes > 0) {
      console.log(`✅ Password reset successfully for ${email}`);
      console.log(`🔑 New password: ${newPassword}`);
      console.log('🔒 Make sure to change this password after logging in!');
    } else {
      console.log(`❌ No user found with email: ${email}`);
    }
    
  } catch (error) {
    console.error('❌ Password reset failed:', error);
  }
}

resetAdminPassword();
