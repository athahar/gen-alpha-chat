// agents/intentAgent.js
import { openai } from '../utils/openAIClient.js';
import { debugLog } from '../utils/logger.js';

/**
 * Detects the user's intent using OpenAI and updates shared memory
 * @param {string} message
 * @param {object} memory
 * @returns {Promise<object>} updated memory
 */
export async function intentAgent(message, memory) {
  try {
    debugLog('🎯 Starting intent classification');
    const prompt = `Classify the user's intent and explain why. Respond in JSON with 'intent' and 'reasoning'.
User message: "${message}"
Available intents: [ask_shipping, ask_refund, ask_order_status, ask_policy, unknown]`;

    debugLog('🤖 Sending request to OpenAI');
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an intent classification assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
    });

    const content = response.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    debugLog(`✅ Intent classified as: ${parsed.intent}`);

    return {
      ...memory,
      currentIntent: parsed.intent || 'unknown',
      reasoning: parsed.reasoning || 'Could not determine reasoning'
    };
  } catch (err) {
    debugLog(`❌ Intent classification error: ${err.message}`);
    console.error('[intentAgent] Error:', err);
    return {
      ...memory,
      currentIntent: 'unknown',
      reasoning: 'Intent classification failed'
    };
  }
} 