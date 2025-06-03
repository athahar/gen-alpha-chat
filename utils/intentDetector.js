import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

import { debugLog } from './logger.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

debugLog(`🧠 Intent detection module loaded`);

export async function detectIntent(message) {
  const prompt = `
Classify the following message into one of these intents:
- ask_return
- ask_refund
- ask_shipping
- ask_order_status
- ask_policy
- ask_cancel
- ask_product_info
- greet
- unknown

Message: "${message}"
Return just the intent.
  `.trim();

  debugLog(`💬 Detecting intent for: "${message}"`);

  const res = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0
  });

  const intent = res.choices[0].message.content.trim().toLowerCase();
  debugLog(`💡 Detected intent: ${intent}`);
  return intent;
}
