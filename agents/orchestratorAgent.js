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
  console.log('[orchestratorAgent] called with message:', message);


  try {
    debugLog('🚀 Starting orchestration flow');
    debugLog(`📝 User message: "${message}"`);

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
    await guardrailsAgent(message, memory);

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
