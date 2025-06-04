// agents/conversationAgent.js
import { openai } from '../utils/openAIClient.js';
import { debugLog } from '../utils/logger.js';

/**
 * Composes final user-facing message in Gen Alpha tone
 * @param {string} message
 * @param {object} memory
 * @returns {Promise<object>} updated memory
 */
export async function conversationAgent(message, memory) {
  debugLog('💬 Starting response generation');
  try {
    const intent = memory.currentIntent || 'unknown';
    const reasoning = memory.reasoning || 'No reasoning available';
    const orderDetails = JSON.stringify(memory.orderDetails || {}, null, 2);
    const policy = memory.policyAnswer || 'N/A';

    const context = `You are a Gen Alpha support bot. Be brief, helpful, emoji-friendly.

Intent: ${intent}
Reasoning: ${reasoning}
Order: ${orderDetails}
Policy: ${policy}`;

    debugLog('🤖 Sending request to OpenAI');
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Reply like a Gen Alpha customer support rep.' },
        { role: 'user', content: context }
      ],
      temperature: 0.6
    });

    const reply = response.choices?.[0]?.message?.content;
    debugLog('✅ Response generated successfully');

    if (reply) {
      return {
        ...memory,
        finalResponse: reply
      };
    }
    return { ...memory };
  } catch (err) {
    debugLog(`❌ Response generation error: ${err.message}`);
    console.error('[conversationAgent] Error:', err);
    return {
      ...memory,
      finalResponse: 'Sorry, I glitched 😓. Try again?'
    };
  }
} 
