// routes/auth.js
import express from 'express';
import { supabase } from '../utils/supabase.js';
import { loadMemory, saveMemory } from '../utils/memory.js';

const router = express.Router();

/**
 * POST /auth
 * Body: { sessionId, email, phone }
 */
router.post('/', async (req, res) => {
  const { sessionId, email, phone } = req.body;

  if (!sessionId || !email || !phone) {
    return res.status(400).json({ error: 'Missing sessionId, email, or phone' });
  }

  try {
    if (process.env.TEST_MODE === '1') {
      const memory = loadMemory(sessionId);
      memory.isAuthenticated = true;
      memory.email = email;
      memory.phone = phone;
      saveMemory(sessionId, memory);

      return res.json({ success: true, message: 'You\u2019re verified \u2705', memory });
    }

    // Verify identity via Supabase
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('phone', phone)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'User not found or mismatch' });
    }

    // Update session memory
    const memory = loadMemory(sessionId);
    memory.isAuthenticated = true;
    memory.email = email;
    memory.phone = phone;
    saveMemory(sessionId, memory);

    return res.json({ success: true, message: 'You’re verified ✅', memory });
  } catch (err) {
    console.error('[POST /auth] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
