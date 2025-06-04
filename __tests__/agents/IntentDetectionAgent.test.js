import { jest } from '@jest/globals';
import { IntentDetectionAgent } from '../../agents/IntentDetectionAgent.js';
import { mockOpenAI } from '../mocks/openai';

// Mock environment variables
process.env.OPENAI_API_KEY = 'mock-openai-key';

describe('IntentDetectionAgent', () => {
    let agent;

    beforeEach(() => {
        agent = new IntentDetectionAgent();
        mockOpenAI();
    });

    test('should detect refund policy intent', async () => {
        const message = {
            content: 'What is your refund policy?',
            userId: 'test-user'
        };

        const result = await agent._handleMessage(message);
        
        expect(result.result).toHaveProperty('intent');
        expect(result.result.intent.intent).toBe('ask_policy');
    });

    test('should detect order status intent', async () => {
        const message = {
            content: 'Where is my order #12345?',
            userId: 'test-user'
        };

        const result = await agent._handleMessage(message);
        
        expect(result.result).toHaveProperty('intent');
        expect(result.result.intent.intent).toBe('ask_order_status');
        expect(result.result.entities[0].value).toBe('12345');
    });
}); 