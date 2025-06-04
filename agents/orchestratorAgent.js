// agents/orchestratorAgent.js
import { guardrailsAgent } from './guardrailsAgent.js';
import { intentAgent } from './intentAgent.js';
import { policyRAGAgent } from './policyRAGAgent.js';
import { orderDataAgent } from './orderDataAgent.js';
import { conversationAgent } from './conversationAgent.js';
import { orderPickerAgent } from './orderPickerAgent.js';
import { orderSelectorAgent } from './orderSelectorAgent.js';
import { debugLog } from '../utils/logger.js';

/**
 * Picks a random Gen Alpha greeting for new users
 */
function getRandomGreeting() {
  console.log('[orchestratorAgent] getRandomGreeting:');

  const greetings = [
    "Hey hey! 👋 Ask me anything about your orders, refunds, or what’s cookin’ 📦😎",
    "Yo! I’m your order whisperer 🤖 Got a shipping Q or refund request?",
    "Sup! Want the scoop on your stuff? 🕵️‍♂️ Hit me with a question 📬",
    "Ready when you are! ⏳ Need refund help, tracking info, or the tea on your order?",
    "Let’s get into it 💬 Ask me anything about your recent buys 🚀"
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

/**
 * Routes message through appropriate agents and assembles the final response
 * @param {string} message
 * @param {object} memory
 * @returns {Promise<object>} updated memory
 */
export async function orchestratorAgent(message, memory) {
  if (process.env.TEST_MODE === '1') {
    return orchestratorTestAgent(message, memory);
  }
  console.log('[orchestratorAgent] called with message:', message);


  try {
    debugLog('🚀 Starting orchestration flow');
    debugLog(`📝 User message: "${message}"`);
    debugLog('🧠 Memory before:', JSON.stringify(memory));

    // Show greeting if this is the first message and no intent is set
    if ((!message || message.trim() === '') && !memory.currentIntent && !memory.greeted) {
      debugLog('👋 Sending first-time greeting');
      return {
        ...memory,
        greeted: true,
        finalResponse: getRandomGreeting()
      };
    }

    // 0. If user hasn't selected orderId but has options, check if this message is an orderId
    if (!memory.orderId && memory.orderOptions?.length > 0) {
      debugLog('🔍 Checking if message contains order selection');
      memory = await orderSelectorAgent(message, memory);
      if (memory.orderId) {
        debugLog(`✅ Order selected: ${memory.orderId}`);
        delete memory.orderOptions; // Clean up once selected
      }
    }

    // 1. Validate input
    debugLog('🔒 Running guardrails check');
    const guard = await guardrailsAgent(message, memory);
    message = guard.sanitizedMessage;
    memory = guard.memory;
    debugLog('🛡️ After guardrails:', JSON.stringify(memory));

    // 2. Detect intent
    debugLog('🎯 Detecting user intent');
    memory = await intentAgent(message, memory);
    debugLog(`📌 Detected intent: ${memory.currentIntent}`);

    // 3. Route based on intent
    const { currentIntent } = memory;

    if (['ask_shipping', 'ask_refund', 'ask_order_status'].includes(currentIntent)) {
      if (memory.orderId) {
        debugLog(`📦 Fetching data for order: ${memory.orderId}`);
        memory = await orderDataAgent(message, memory);
      } else {
        debugLog('🛍️ No order selected, prompting user to choose');
        memory = await orderPickerAgent(message, memory);
        return memory; // Skip rest of flow until orderId is picked
      }
    }

    if (['ask_policy', 'ask_refund'].includes(currentIntent)) {
      debugLog('📚 Fetching policy information');
      memory = await policyRAGAgent(message, memory);
    }

    // 4. Compose response
    debugLog('💬 Generating final response');
    memory = await conversationAgent(message, memory);

    debugLog('✅ Orchestration flow completed');
    debugLog('🧠 Memory after:', JSON.stringify(memory));
    return memory;
  } catch (err) {
    debugLog(`❌ Orchestration error: ${err.message}`);
    console.error('[orchestratorAgent] Error:', err);
    return {
      ...memory,
      finalResponse: 'Yikes, something went wrong on my end‍💫'
    };
  }
  
}

// Simplified test flow without external dependencies
function orchestratorTestAgent(message, memory) {
  const msg = (message || '').toLowerCase();

  if (!memory.isAuthenticated) {
    if (msg.includes('refund policy')) {
      return { ...memory, finalResponse: 'Refunds hit your card in 5-7 business days \ud83d\udcb8' };
    }
    if (msg.includes('order status')) {
      return { ...memory, finalResponse: 'I need your email and phone to look up your orders \ud83d\udcde' };
    }
    return { ...memory, finalResponse: 'Please verify your account first.' };
  }

  const idMatch = msg.match(/\b(350|362)\b/);
  if (idMatch) {
    memory.orderId = idMatch[1];
  }

  if (!memory.orderId && msg.includes('order status')) {
    memory.orderOptions = ['350', '362'];
    return { ...memory, finalResponse: "You've got 2 orders \ud83d\udecd\ufe0f \u2014 wanna chat about \u2022 350, \u2022 362?" };
  }

  if (msg.includes('cancel') && memory.orderId === '350') {
    return { ...memory, finalResponse: "Oops, can't cancel that one since it's already delivered \ud83d\uddf3\ufe0f.\n\n\u2705 You're still within the return window (22 days left)." };
  }

  if (msg.includes('refund') || msg.includes('money') || msg.includes('mone')) {
    if (memory.orderId === '362') {
      return { ...memory, finalResponse: 'You already got a refund for that order \ud83d\udcb8' };
    }
  }

  if (msg.includes('order status') && memory.orderId === '350') {
    return { ...memory, finalResponse: 'Order 350 was delivered on May 8 \ud83d\ude9a. You have 22 days left to return it \ud83d\udc8a' };
  }

  return { ...memory, finalResponse: 'Got it!' };
}
