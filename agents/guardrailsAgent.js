// agents/guardrailsAgent.js
import validator from 'validator';
import { debugLog } from '../utils/logger.js';

function sanitizeInput(text) {
  return validator.stripLow(text).trim();
}

function containsToxic(text) {
  const blocked = [
    'ignore all previous instructions',
    'sudo',
    '<script>',
    'drop table'
  ];
  const lower = text.toLowerCase();
  return blocked.some(b => lower.includes(b));
}

/**
 * Validates user input and blocks unsafe patterns
 * @param {string} message
 * @param {object} memory
 * @returns {Promise<{memory: object, sanitizedMessage: string}>}
 */
export async function guardrailsAgent(message, memory) {
  debugLog('🔒 Starting input validation');

  const clean = sanitizeInput(message);
  const isToxic = containsToxic(clean);
  const isValid = validator.isAscii(clean) && clean.length <= 500;

  if (!isValid || isToxic) {
    debugLog(`⚠️ Input validation failed (toxic: ${isToxic}, valid: ${isValid}, length: ${clean.length})`);
    throw new Error('Input validation failed: unsafe content');
  }

  debugLog('✅ Input validation passed');
  return { memory, sanitizedMessage: clean };
}
