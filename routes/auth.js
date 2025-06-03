import express from 'express';
import { verifyUserIdentity } from '../utils/auth.js';
import { debugLog } from '../utils/logger.js';


const router = express.Router();

// Simple format validators
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[0-9+\-().\s]{7,15}$/.test(phone); // loose match
}

router.post('/verify', async (req, res) => {
  const { email, phone } = req.body;

  debugLog(`🔍 Attempting verification with email: ${email}, phone: ${phone}`);

  // Validation
  if (!isValidEmail(email)) {
    debugLog(`❌ Invalid email format: ${email}`);
    return res.status(400).json({ success: false, message: 'Invalid email format.' });
  }

  if (!isValidPhone(phone)) {
    debugLog(`❌ Invalid phone format: ${phone}`);
    return res.status(400).json({ success: false, message: 'Invalid phone number format.' });
  }

  try {
    const userId = await verifyUserIdentity(email, phone);

    if (userId) {
      debugLog(`✅ Verified user: ${userId}`);
      req.session.authenticated = true;
      req.session.email = email;
      req.session.phone = phone;
      req.session.userId = userId;
      return res.json({ success: true, message: 'User verified.' });
    } else {
      debugLog(`❌ No user found matching email and phone.`);
      return res.status(401).json({ success: false, message: 'No match found for that combo.' });
    }
  } catch (error) {
    console.error(error);
    debugLog(`💥 Server error during verification: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error during verification.' });
  }
});

export default router;
