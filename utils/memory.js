// utils/memory.js

const sessions = new Map(); // In-memory store

/**
 * Loads memory for a given session ID
 * @param {string} sessionId
 * @returns {object}
 */
export function loadMemory(sessionId) {
  return sessions.get(sessionId) || {
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
 * Saves updated memory to session
 * @param {string} sessionId
 * @param {object} memory
 */
export function saveMemory(sessionId, memory) {
  sessions.set(sessionId, memory);
}

/**
 * Clears session memory
 * @param {string} sessionId
 */
export function clearMemory(sessionId) {
  sessions.delete(sessionId);
} 