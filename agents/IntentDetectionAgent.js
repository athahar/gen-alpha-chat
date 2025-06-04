import OpenAI from 'openai';
import dotenv from 'dotenv';
import { debugLog } from '../utils/logger.js';

dotenv.config();

export class IntentDetectionAgent {
    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    async initialize() {
        // No initialization needed
    }

    async _handleMessage(message) {
        try {
            const { content } = message;
            const intent = await this._detectIntent(content);
            const entities = await this._extractEntities(content);

            return {
                result: {
                    intent,
                    entities
                }
            };
        } catch (error) {
            debugLog(`Error in IntentDetectionAgent: ${error.message}`);
            return {
                result: {
                    intent: {
                        intent: 'unknown',
                        confidence: 0
                    },
                    entities: []
                }
            };
        }
    }

    async _detectIntent(message) {
        try {
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

            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0
            });

            const intent = response.choices[0].message.content.trim().toLowerCase();
            return {
                intent,
                confidence: 0.9 // Simplified confidence scoring
            };
        } catch (error) {
            debugLog(`Error detecting intent: ${error.message}`);
            return {
                intent: 'unknown',
                confidence: 0
            };
        }
    }

    async _extractEntities(message) {
        try {
            const prompt = `
Extract any relevant entities from the message. Return them in this format:
{
    "entities": [
        {
            "type": "order_id",
            "value": "12345"
        }
    ]
}

Message: "${message}"
`.trim();

            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0
            });

            const content = response.choices[0].message.content.trim();
            const parsed = JSON.parse(content);
            return parsed.entities || [];
        } catch (error) {
            debugLog(`Error extracting entities: ${error.message}`);
            return [];
        }
    }
} 