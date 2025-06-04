// agents/orderDataAgent.js
import { supabase } from '../utils/supabase.js';
import { debugLog } from '../utils/logger.js';

/**
 * Fetches order info based on authenticated user
 * @param {string} message
 * @param {object} memory
 * @returns {Promise<object>} updated memory
 */
export async function orderDataAgent(message, memory) {
  debugLog(`📦 Starting order data fetch for order: ${memory.orderId}`);
  
  try {
    const { email, phone, orderId } = memory;
    debugLog('🔍 Querying Supabase');
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .eq('email', email)
      .eq('phone', phone)
      .single();

    if (error || !data) {
      debugLog(`⚠️ No order found: ${error?.message}`);
      throw error;
    }

    debugLog(`✅ Order data retrieved (status: ${data.status})`);

    const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    return {
      ...memory,
      orderDetails: {
        status: data.status,
        deliveryDate: fmt(data.delivery_date),
        refundStatus: data.refund_status,
        refundDate: fmt(data.refund_date),
        totalPrice: data.total_price_cents
      }
    };
  } catch (err) {
    debugLog(`❌ Order data fetch error: ${err.message}`);
    console.error('[orderDataAgent] Error:', err);
    return {
      ...memory,
      orderDetails: {}
    };
  }
} 
