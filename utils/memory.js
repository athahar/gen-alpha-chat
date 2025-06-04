// utils/memory.js

const sessions = new Map(); // In-memory store
const TTL_MS = 1000 * 60 * 60; // 1 hour

function getDefaultMemory(sessionId) {
  return {
    sessionId,
    isAuthenticated: false,
    currentIntent: '',
    reasoning: '',
    email: '',
    phone: '',
    orderId: '',
    orderDetails: {},
    policyAnswer: '',
    finalResponse: ''
  };
}

/**
 * Loads memory for a given session ID
 * @param {string} sessionId
 * @returns {object}
 */
export function loadMemory(sessionId) {
  const entry = sessions.get(sessionId);
  if (entry && entry.expireAt > Date.now()) {
    return entry.memory;
  }
  sessions.delete(sessionId);
  return getDefaultMemory(sessionId);
}

/**
 * Saves updated memory to session
 * @param {string} sessionId
 * @param {object} memory
 */
export function saveMemory(sessionId, memory) {
  sessions.set(sessionId, { memory, expireAt: Date.now() + TTL_MS });
}

/**
 * Clears session memory
 * @param {string} sessionId
 */
export function clearMemory(sessionId) {
  sessions.delete(sessionId);
}

function sweepExpired() {
  const now = Date.now();
  for (const [id, entry] of sessions.entries()) {
    if (entry.expireAt <= now) {
      sessions.delete(id);
    }
  }
}

setInterval(sweepExpired, TTL_MS).unref();
