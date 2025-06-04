// agents/orderPickerAgent.js
import { supabase } from '../utils/supabase.js';
import { debugLog } from '../utils/logger.js';

/**
 * Finds all recent orders for the authenticated user and prompts selection
 * @param {string} message - The user's message
 * @param {object} memory - The shared memory object
 * @returns {Promise<object>} Updated memory object
 */
export async function orderPickerAgent(message, memory) {
  try {
    const { email, phone } = memory;
    debugLog(`🔍 Fetching orders for user: ${email}`);

    // Fetch recent orders from Supabase
    const { data, error } = await supabase
      .from('orders')
      .select('order_id')
      .eq('email', email)
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(5); // Limit to 5 most recent orders

    if (error) {
      debugLog(`❌ Error fetching orders: ${error.message}`);
      return {
        ...memory,
        finalResponse: 'Hmm, I couldn\'t find any recent orders for you 😕'
      };
    }

    if (!data || data.length === 0) {
      debugLog('ℹ️ No orders found for user');
      return {
        ...memory,
        finalResponse: 'Hmm, I couldn\'t find any recent orders for you 😕'
      };
    }

    const orderOptions = data.map((o) => o.order_id);
    debugLog(`✅ Found ${orderOptions.length} orders: ${orderOptions.join(', ')}`);

    // Format the response in Gen Alpha style
    const response = orderOptions.length === 1
      ? `I found your order! Let's talk about • ${orderOptions[0]} 🛍️`
      : `You've got ${orderOptions.length} orders 🛍️ — wanna chat about • ${orderOptions.join(', • ')}?`;

    return {
      ...memory,
      orderOptions,
      finalResponse: response
    };
  } catch (err) {
    debugLog(`❌ Unexpected error in orderPickerAgent: ${err.message}`);
    console.error('[orderPickerAgent] Error:', err);
    return {
      ...memory,
      finalResponse: 'Something went wrong getting your orders 😓'
    };
  }
} 