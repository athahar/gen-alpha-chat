// agents/orderSelectorAgent.js
import { debugLog } from '../utils/logger.js';

/**
 * Parses user message and sets orderId if it matches one of the suggested orderOptions
 * @param {string} message
 * @param {object} memory
 * @returns {Promise<object>} updated memory
 */
export async function orderSelectorAgent(message, memory) {
  try {
    const { orderOptions } = memory;
    debugLog(`🔍 Checking message for order selection: "${message}"`);

    if (!Array.isArray(orderOptions) || orderOptions.length === 0) {
      debugLog('ℹ️ No order options available for selection');
      return memory; // nothing to select from
    }

    debugLog(`ℹ️ Available order options: ${orderOptions.join(', ')}`);
    const normalizedMsg = message.toLowerCase();

    const selected = orderOptions.find((id) => normalizedMsg.includes(id.toLowerCase()));

    if (!selected) {
      debugLog('❌ No matching order ID found in message');
      return {
        ...memory,
        finalResponse: `Hmm, I didn't catch which order you meant 🤔 — try saying the order number like "350" or "351"`
      };
    }

    debugLog(`✅ Selected order ID: ${selected}`);
    return {
      ...memory,
      orderId: selected,
      finalResponse: `Got it! Let's talk about order ${selected} 🛍️`
    };
  } catch (err) {
    debugLog(`❌ Unexpected error in orderSelectorAgent: ${err.message}`);
    console.error('[orderSelectorAgent] Error:', err);
    return {
      ...memory,
      finalResponse: 'Something went wrong when selecting your order 😓'
    };
  }
} 