// utils/supabase.js
import { createClient } from '@supabase/supabase-js';
import { getPolicyAnswer } from './rag.js';
import dotenv from 'dotenv';
dotenv.config();

import { debugLog } from './logger.js';

console.log('All environment variables:', Object.keys(process.env).filter(key => key.startsWith('SUPABASE')));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('Environment check:');
console.log('SUPABASE_URL exists:', !!supabaseUrl);
console.log('SUPABASE_KEY exists:', !!supabaseKey);
console.log('SUPABASE_KEY length:', supabaseKey ? supabaseKey.length : 0);

if (!supabaseUrl || !supabaseKey) {
  throw new Error('❌ Supabase URL and Service Role Key must be set in .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getOrderSummary(email, phone) {
  const { data } = await supabase
    .from('orders')
    .select('id, status, shipping_status, refund_status, shipped_at, delivered_at, refunded_at')
    .eq('email', email)
    .eq('phone', phone);

  debugLog(`📦 getOrderSummary: Received ${data ? data.length : 0} rows from Supabase for email ${email}, phone ${phone}`);

  return data || [];
}

export async function getRefundInfo(orderId) {
  const { data } = await supabase
    .from('orders')
    .select('refunded_at')
    .eq('id', orderId)
    .single();

  if (!data || !data.refunded_at) {
    return "That order doesn't seem to be refunded yet.";
  }

  const refundDate = new Date(data.refunded_at).toDateString();
  const rag = await getPolicyAnswer("refund processing time");

  return `Your refund was issued on ${refundDate}. ${rag}`;
}

export async function getOrderStatus(orderId) {
    const { data, error } = await supabase
    .from('orders')
    .select('status, shipping_status, refund_status, shipped_at, delivered_at, refunded_at')
    .eq('id', orderId)
    .single();

  if (error || !data) {
    return "Hmm, couldn't find that order right now 🕵️. Wanna double-check the ID?";
  }

  const {
    status,
    shipping_status,
    refund_status,
    shipped_at,
    delivered_at,
    refunded_at
  } = data;

  // 💸 Refunded
  if (refund_status === 'refunded' && refunded_at) {
    const date = new Date(refunded_at).toDateString();
    return `Looks like you already got a refund for this one 💸. Your refund for order ${orderId} was issued on ${date}. It usually takes 5–7 business days to show up on your card. Anything else you want me to check?`;
  }

  // ✅ Delivered
  if (status === 'delivered' && delivered_at) {
    return `Yup — your order was delivered on ${new Date(delivered_at).toDateString()} 📦✅`;
  }

  // 🚚 Shipped but not delivered
  if (shipped_at && !delivered_at) {
    const shipDate = new Date(shipped_at);
    const estMin = new Date(shipDate);
    estMin.setDate(estMin.getDate() + 2);
    const estMax = new Date(shipDate);
    estMax.setDate(estMax.getDate() + 6);

    return `Your order shipped on ${shipDate.toDateString()} 🚚. You should expect delivery between ${estMin.toDateString()} and ${estMax.toDateString()} 📬.`;
  }

  // 🛠️ Not shipped yet
  if (shipping_status === 'pending') {
    return "Your order hasn't shipped yet, but it's queued up 🛠️. I'll ping you when it's out the door.";
  }

  // 🌀 Unknown fallback
  return "Hmm, not sure where your order's at. Could be stuck in processing. Try again or ping support 🌀";
}

export async function getReturnEligibility(orderId) {
    if (!orderId) return "I need your order ID to check if you can return it 🧐";
  
    const { data, error } = await supabase
      .from('orders')
      .select('status, delivered_at, refunded_at')
      .eq('id', orderId)
      .single();
  
    if (error || !data) {
      return "Hmm... couldn't fetch that order right now 🛑";
    }
  
    const { status, delivered_at, refunded_at } = data;
  
    // If refunded
    if (refunded_at) {
      return "Looks like you already got a refund for this one 💸. All set!";
    }
  
    // If not yet delivered
    if (!delivered_at || status === 'processing' || status === 'shipped') {
      return "You can return the item once it's delivered 📦. Wanna check back after it arrives?";
    }
  
    // Delivered: check return window (e.g., 30 days)
    const deliveredDate = new Date(delivered_at);
    const now = new Date();
    const diffDays = Math.floor((now - deliveredDate) / (1000 * 60 * 60 * 24));
  
    if (diffDays <= 30) {
      return `✅ Yep, you're still within the return window (${30 - diffDays} days left). Here's how to return it:\n`;
    } else {
      return `⏳ Oof, looks like the 30-day return window passed. Might wanna ping support to see if they can help.`;
    }
  }
  
  export async function getRefundStatus(orderId, chatHistory = []) {
    if (!orderId) return "I need your order ID to check your refund 💸";
  
    const { data, error } = await supabase
      .from('orders')
      .select('refund_status, refunded_at')
      .eq('id', orderId)
      .single();
  
    if (error || !data) {
      return "I tried looking up your refund but hit a snag. Can you try again?";
    }
  
    const { refund_status, refunded_at } = data;
  
    if (refund_status === 'refunded' && refunded_at) {
      const date = new Date(refunded_at).toDateString();
      return `Your refund for order ${orderId} was issued on ${date} 💸. It usually takes 5–7 business days to show up on your card. Anything else you want me to check?`;
    }
  
    const policyText = await getPolicyAnswer("how long do refunds take", chatHistory);
    return `Your refund hasn't been issued yet, but here's what the policy says:\n${policyText}`;
  }

  export async function getShippingEstimate(orderId) {
    const { data, error } = await supabase
      .from('orders')
      .select('created_at, shipped_at, delivered_at, status')
      .eq('id', orderId)
      .single();
  
    if (error || !data) {
      return "Hmm, I couldn't find your order info right now 🕵️. Try again later.";
    }
  
    const { created_at, shipped_at, delivered_at, status } = data;
  
    // Already shipped
    if (shipped_at) {
      const date = new Date(shipped_at).toDateString();
      return `Your order was shipped on ${date} 🚚 and is on its way!`;
    }
  
    // Delivered
    if (delivered_at) {
      const date = new Date(delivered_at).toDateString();
      return `Your order was delivered on ${date} 📦✅`;
    }
  
    // Estimate shipping
    const orderDate = new Date(created_at);
    const minETA = new Date(orderDate);
    const maxETA = new Date(orderDate);
    minETA.setDate(minETA.getDate() + 1);
    maxETA.setDate(maxETA.getDate() + 2);
  
    const policyText = await getPolicyAnswer("how long does it take to ship", []);
  
    return `You placed your order on ${orderDate.toDateString()} 🛒. We usually ship within 1–2 business days, so it should ship between ${minETA.toDateString()} and ${maxETA.toDateString()} 📦.
  
  Just so you know: ${policyText}`;
  }

  export async function handleCancelRequest(orderId, chatHistory = []) {
    if (!orderId) return "I need the order ID to check if it can be cancelled 🧐";
  
    const { data, error } = await supabase
      .from('orders')
      .select('status, delivered_at')
      .eq('id', orderId)
      .single();
  
    if (error || !data) {
      return "Couldn't fetch your order details right now 🧯. Try again in a bit!";
    }
  
    const { status, delivered_at } = data;
  
    if (status === 'delivered' && delivered_at) {
      const daysSinceDelivery = Math.floor((new Date() - new Date(delivered_at)) / (1000 * 60 * 60 * 24));
      const daysLeft = 30 - daysSinceDelivery;
  
      const returnMsg =
        daysLeft > 0
          ? `✅ You're still within the return window (${daysLeft} days left). If you're not happy with your item, you can return it instead!`
          : `🚚 This one's already delivered, and the return window may be over — but you can still try reaching out to support.`;
  
      const rag = await getPolicyAnswer("what is the return policy", chatHistory);
      return `Oops, can't cancel that one since it's already delivered 🧾.\n\n${returnMsg}\n\n${rag}`;
    }
  
    return `You can cancel orders that haven't been shipped yet ✅. Want me to check if yours is still cancelable?`;
  }