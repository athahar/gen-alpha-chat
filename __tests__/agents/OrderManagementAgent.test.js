import { jest } from '@jest/globals';
import { OrderManagementAgent } from '../../agents/OrderManagementAgent.js';
import { mockOpenAI } from '../mocks/openai';

// Mock environment variables
process.env.SUPABASE_URL = 'https://mock-supabase-url.supabase.co';
process.env.SUPABASE_ANON_KEY = 'mock-anon-key';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        from: jest.fn((tableName) => ({
            select: jest.fn((columns) => ({
                eq: jest.fn((column, value) => ({
                    single: jest.fn(async () => ({
                        data: {
                            id: value,
                            status: 'shipped',
                            shipping_status: 'in_transit',
                            created_at: '2023-10-26T10:00:00.000Z',
                            updated_at: '2023-10-27T10:00:00.000Z'
                        },
                        error: null
                    }))
                }))
            }))
        }))
    }))
}));

describe('OrderManagementAgent', () => {
    let agent;

    beforeEach(() => {
        agent = new OrderManagementAgent();
        mockOpenAI();
    });

    test('should handle order status request', async () => {
        const message = {
            content: 'Where is my order #12345?',
            userId: 'test-user'
        };

        const result = await agent._handleMessage(message);
        
        expect(result.result).toHaveProperty('answer');
        expect(result.result.answer).toContain('Order #12345');
    });

    test('should handle non-existent order', async () => {
        const message = {
            content: 'Where is my order #99999?',
            userId: 'test-user'
        };

        const result = await agent._handleMessage(message);
        
        expect(result.result).toHaveProperty('answer');
        expect(result.result.answer).toContain('couldn\'t find');
    });
}); 