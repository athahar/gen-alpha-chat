// agents/guardrailsAgent.js
import validator from 'validator';
import { debugLog } from '../utils/logger.js';

/**
 * Validates user input and blocks unsafe patterns
 * @param {string} message
 * @param {object} memory
 * @returns {Promise<object>} updated memory or throws
 */
export async function guardrailsAgent(message, memory) {
  debugLog('🔒 Starting input validation');
  
  const blocked = [
    'ignore all previous instructions',
    'sudo',
    '<script>',
    'DROP TABLE'
  ];

  const isToxic = blocked.some((b) => message.toLowerCase().includes(b));
  const isValid = validator.isAscii(message) && message.length <= 500;

  if (!isValid || isToxic) {
    debugLog(`⚠️ Input validation failed (toxic: ${isToxic}, valid: ${isValid}, length: ${message.length})`);
    throw new Error('Input validation failed: unsafe content');
  }

  debugLog('✅ Input validation passed');
  return memory; // no mutation
} 