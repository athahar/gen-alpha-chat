import { jest } from '@jest/globals';
import { OrchestrationAgent } from '../../agents/OrchestrationAgent.js';
import { IntentDetectionAgent } from '../../agents/IntentDetectionAgent.js';
import { RAGAgent } from '../../agents/RAGAgent.js';
import { OrderManagementAgent } from '../../agents/OrderManagementAgent.js';

// Mock environment variables
process.env.SUPABASE_URL = 'https://mock-supabase-url.supabase.co';
process.env.SUPABASE_ANON_KEY = 'mock-anon-key';
process.env.OPENAI_API_KEY = 'mock-openai-key';
process.env.PINECONE_API_KEY = 'mock-pinecone-key';
process.env.PINECONE_ENVIRONMENT = 'mock-environment';
process.env.PINECONE_INDEX_NAME = 'mock-index';

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

// Mock the agents that OrchestrationAgent depends on
const mockHandleMessage = jest.fn();
const mockInitialize = jest.fn();

// Mock the agents that OrchestrationAgent depends on
const mockRagHandleMessage = jest.fn();

const mockOrderHandleMessage = jest.fn();

describe('OrchestrationAgent', () => {
    let orchestrationAgent;
    let mockIntentAgent;
    let mockRagAgent;
    let mockOrderAgent;

    beforeEach(async () => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Clear sessions before each test
        OrchestrationAgent.prototype.sessions = new Map();

        // Create new instances of mocked agents and the orchestrator
        mockIntentAgent = new IntentDetectionAgent();
        mockRagAgent = new RAGAgent();
        mockOrderAgent = new OrderManagementAgent();

        orchestrationAgent = new OrchestrationAgent();

        // Manually register mocked agents
        orchestrationAgent.registerAgent('intent', mockIntentAgent);
        orchestrationAgent.registerAgent('rag', mockRagAgent);
        orchestrationAgent.registerAgent('order', mockOrderAgent);
    });

    describe('Initialization', () => {
        test('should initialize and register agents', async () => {
            // We manually registered agents in beforeEach, so check if they are set
            expect(orchestrationAgent.agents.has('intent')).toBe(true);
            expect(orchestrationAgent.agents.has('rag')).toBe(true);
            expect(orchestrationAgent.agents.has('order')).toBe(true);
        });
    });

    describe('User Verification Flow', () => {
        test('should prompt for email if order intent detected and not verified', async () => {
            const message = { content: 'Where is my order 12345?', userId: 'user1', history: [] };
            
            // IntentDetectionAgent mock will return 'ask_order_status'
            
            const response = await orchestrationAgent._handleMessage(message);

            expect(response.result.answer).toBe("I can help with that, but I need to verify your identity first. What's your email address?");
            const session = orchestrationAgent._getSession('user1');
            expect(session.state).toBe('awaiting_email');
        });

        test('should prompt for phone after receiving email', async () => {
            const userId = 'user2';
            const emailMessage = { content: 'test@example.com', userId: userId, history: [] };

            // Simulate previous step: prompt for email
            let session = orchestrationAgent._getSession(userId);
            session.state = 'awaiting_email';
            orchestrationAgent._updateSession(userId, session);

            const response = await orchestrationAgent._handleMessage(emailMessage);

            expect(response.result.answer).toBe("Cool, got your email. What's your phone number? 📱");
            session = orchestrationAgent._getSession(userId);
            expect(session.state).toBe('awaiting_phone');
            expect(session.email).toBe('test@example.com');
        });

        test('should verify and fetch order summary after receiving phone', async () => {
            const userId = 'user3';
            const phoneMessage = { content: '650-300-8998', userId: userId, history: [] };

            // Simulate previous steps: received email and awaiting phone
            let session = orchestrationAgent._getSession(userId);
            session.state = 'awaiting_phone';
            session.email = 'sadie@yahoo.com'; // Use email that matches mock order data
            orchestrationAgent._updateSession(userId, session);

            const response = await orchestrationAgent._handleMessage(phoneMessage);

            expect(response.result.answer).toContain("You're verified ✅! You've got 2 order(s):");
            expect(response.result.answer).toContain('• 350 - delivered');
            expect(response.result.answer).toContain('• 362 - refunded');
            const sessionAfter = orchestrationAgent._getSession(userId);
            expect(sessionAfter.state).toBe('verified');
            expect(sessionAfter.phone).toBe('650-300-8998');
        });

         test('should handle verification for user with no orders', async () => {
             const userId = 'user4';
             const phoneMessage = { content: '111-222-3333', userId: userId, history: [] };

             // Simulate previous steps: received email and awaiting phone
             let session = orchestrationAgent._getSession(userId);
             session.state = 'awaiting_phone';
             session.email = 'noorders@example.com'; // Use email that won't match mock order data
             orchestrationAgent._updateSession(userId, session);

             const response = await orchestrationAgent._handleMessage(phoneMessage);

             expect(response.result.answer).toBe("You're verified ✅! It looks like you don't have any orders associated with that email and phone number.");
             const sessionAfter = orchestrationAgent._getSession(userId);
             expect(sessionAfter.state).toBe('verified');
         });
    });

    describe('Message Routing (after verification)', () => {
        beforeEach(() => {
            // Set session state to verified for routing tests
            const userId = 'verified_user';
            let session = orchestrationAgent._getSession(userId);
            session.state = 'verified';
            session.email = 'verified@example.com';
            session.phone = '123-456-7890';
            orchestrationAgent._updateSession(userId, session);
        });

        test('should route refund policy questions to RAGAgent when verified', async () => {
            const message = { content: 'What is your refund policy?', userId: 'verified_user', history: [] };

            const response = await orchestrationAgent._handleMessage(message);

            expect(mockIntentAgent._handleMessage).toHaveBeenCalledWith(message);
            expect(mockRagAgent._handleMessage).toHaveBeenCalledWith(message);
            expect(mockOrderAgent._handleMessage).not.toHaveBeenCalled();
            expect(response.result.answer).toBe('Mock refund policy answer.');
        });

         test('should route order status questions to OrderManagementAgent when verified', async () => {
             const message = { content: 'Where is my order 12345?', userId: 'verified_user', history: [] };

             const response = await orchestrationAgent._handleMessage(message);

             expect(mockIntentAgent._handleMessage).toHaveBeenCalledWith(message);
             expect(mockRagAgent._handleMessage).not.toHaveBeenCalled();
             expect(mockOrderAgent._handleMessage).toHaveBeenCalledWith(message);
             expect(response.result.answer).toBe('Mock order status for 12345.');
         });

          test('should route greet intent to RAGAgent when verified', async () => {
              const message = { content: 'Hello', userId: 'verified_user', history: [] };

              const response = await orchestrationAgent._handleMessage(message);

              expect(mockIntentAgent._handleMessage).toHaveBeenCalledWith(message);
              expect(mockRagAgent._handleMessage).toHaveBeenCalledWith(message);
              expect(mockOrderAgent._handleMessage).not.toHaveBeenCalled();
              expect(response.result.answer).toBe('Mock greeting response.');
          });

           test('should route cancel order questions to OrderManagementAgent when verified', async () => {
               const message = { content: 'Cancel order 67890', userId: 'verified_user', history: [] };

               const response = await orchestrationAgent._handleMessage(message);

               expect(mockIntentAgent._handleMessage).toHaveBeenCalledWith(message);
               expect(mockRagAgent._handleMessage).not.toHaveBeenCalled();
               expect(mockOrderAgent._handleMessage).toHaveBeenCalledWith(message);
               expect(response.result.answer).toBe('Mock cancel response for 67890.');
           });

            test('should route unknown intent to RAGAgent when verified', async () => {
                const message = { content: 'Some random question', userId: 'verified_user', history: [] };

                const response = await orchestrationAgent._handleMessage(message);

                expect(mockIntentAgent._handleMessage).toHaveBeenCalledWith(message);
                expect(mockRagAgent._handleMessage).toHaveBeenCalledWith(message);
                expect(mockOrderAgent._handleMessage).not.toHaveBeenCalled();
                expect(response.result.answer).toBe('Mock RAG fallback answer.');
            });
    });

     describe('Error Handling', () => {
         test('should handle errors from downstream agents gracefully', async () => {
             const message = { content: 'Trigger error', userId: 'user_with_error', history: [] };

             // Mock IntentDetectionAgent to throw an error
             mockIntentAgent._handleMessage.mockRejectedValueOnce(new Error('Intent error'));

             const response = await orchestrationAgent._handleMessage(message);

             expect(response.result.answer).toBe('I encountered an error while processing your request. Please try again from the beginning.');
             expect(response.result.error).toBe('Intent error');

             // Verify session state is reset on error
             const session = orchestrationAgent._getSession('user_with_error');
             expect(session.state).toBe('initial');
         });

         test('should handle errors during verification flow gracefully', async () => {
             const userId = 'error_user';
             const phoneMessage = { content: '650-300-9999', userId: userId, history: [] };

             // Simulate previous steps: received email and awaiting phone
             let session = orchestrationAgent._getSession(userId);
             session.state = 'awaiting_phone';
             session.email = 'error@example.com';
             orchestrationAgent._updateSession(userId, session);

             // Mock the OrderManagementAgent's _handleMessage for order summary to throw an error
             mockOrderAgent._handleMessage.mockRejectedValueOnce(new Error('Order summary error'));

             const response = await orchestrationAgent._handleMessage(phoneMessage);

             expect(response.result.answer).toBe('I encountered an error while processing your request. Please try again from the beginning.');
             expect(response.result.error).toBe('Order summary error');

             // Verify session state is reset on error
             const sessionAfter = orchestrationAgent._getSession(userId);
             expect(sessionAfter.state).toBe('initial');
         });
     });
}); 