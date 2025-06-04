// middleware/validateChatInput.js

export function validateChatInput(req, res, next) {
    const { message, sessionId } = req.body;
  
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing message' });
    }
  
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid sessionId' });
    }
  
    if (message.length > 1000) {
      return res.status(413).json({ error: 'Message too long' });
    }
  
    next();
  }
  