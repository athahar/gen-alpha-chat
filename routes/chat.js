// routes/chat.js
import express from 'express';
import { loadMemory, saveMemory } from '../utils/memory.js';
import { orchestratorAgent } from '../agents/orchestratorAgent.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!sessionId) {
      console.warn('⚠️ Missing sessionId in request');
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    console.log('💬 Incoming message:', message || '[empty]');
    let memory = loadMemory(sessionId);

    memory = await orchestratorAgent(message, memory);
    saveMemory(sessionId, memory);

    console.log('🧠 Final response:', memory.finalResponse);
    res.json({ finalResponse: memory.finalResponse, sessionId });
  } catch (err) {
    console.error('[POST /chat] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
