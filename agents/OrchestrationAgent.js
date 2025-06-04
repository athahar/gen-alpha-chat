import OpenAI from 'openai';
import dotenv from 'dotenv';
import { debugLog } from '../utils/logger.js';
import { IntentDetectionAgent } from './IntentDetectionAgent.js';
import { RAGAgent } from './RAGAgent.js';
import { OrderManagementAgent } from './OrderManagementAgent.js';

dotenv.config();

export class OrchestrationAgent {
    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.agents = new Map();
        this.sessions = new Map(); // Simple in-memory session store
    }

    async initialize() {
        // Initialize and register core agents
        const intentAgent = new IntentDetectionAgent();
        const ragAgent = new RAGAgent();
        const orderAgent = new OrderManagementAgent();

        await Promise.all([
            intentAgent.initialize(),
            ragAgent.initialize(),
            orderAgent.initialize()
        ]);

        this.registerAgent('intent', intentAgent);
        this.registerAgent('rag', ragAgent);
        this.registerAgent('order', orderAgent);

        debugLog('OrchestrationAgent initialized and registered core agents.');
    }

    registerAgent(name, agent) {
        if (this.agents.has(name)) {
            throw new Error('Agent already registered');
        }
        this.agents.set(name, agent);
        debugLog(`Registered agent: ${name}`);
    }

    async _handleMessage(message) {
        const { content, userId, history } = message;

        // Get or create session state for the user
        const session = this._getSession(userId);

        try {
            // Step 1: Handle user verification flow if needed
            if (session.state === 'awaiting_email') {
                 session.email = content.trim();
                 session.state = 'awaiting_phone';
                 this._updateSession(userId, session);
                 return { result: { answer: "Cool, got your email. What's your phone number? 📱" } };
            } else if (session.state === 'awaiting_phone') {
                 session.phone = content.trim();
                 session.state = 'verified'; // Mark as verified after getting both
                 this._updateSession(userId, session);

                 // **Corrected:** Call OrderManagementAgent to get order summary
                 const orderAgent = this.agents.get('order');
                 if (!orderAgent) throw new Error('OrderManagementAgent not registered');
                 
                 // Create a mock message for the OrderManagementAgent to get orders by user
                 // In a real system, this would be a dedicated method in OrderManagementAgent
                 // or a separate UserAgent/AuthService.
                 const orderSummaryMessage = { content: `Find orders for email ${session.email} and phone ${session.phone}`, userId: userId, history: [] }; // Construct a query message for OrderAgent
                 
                 const orderSummaryResponse = await orderAgent._handleMessage(orderSummaryMessage); // Send the mock query message to OrderAgent

                 // Assuming OrderManagementAgent returns a specific format for order summary
                 // You might need to adjust this based on OrderManagementAgent's actual summary logic
                 if (orderSummaryResponse.result && orderSummaryResponse.result.orderDetails && orderSummaryResponse.result.orderDetails.length > 0) {
                     const orders = orderSummaryResponse.result.orderDetails; // Assuming orderDetails is an array here based on the mock scenario
                     const orderList = orders.map(order => `• ${order.id} - ${order.status}`).join('\n');
                     return { result: { answer: `You're verified ✅! You've got ${orders.length} order(s):\n${orderList}\nWhich one ya wanna chat about?` } };
                 } else {
                      return { result: { answer: "You're verified ✅! It looks like you don't have any orders associated with that email and phone number." } };
                 }
            }

            // Step 2: If not in verification flow, detect intent
            const intentAgent = this.agents.get('intent');
            if (!intentAgent) throw new Error('IntentDetectionAgent not registered');
            const intentResult = await intentAgent._handleMessage(message);
            const { intent } = intentResult.result.intent;
            debugLog(`Detected intent: ${intent}`);

            // Step 3: Route based on intent and verification status
            let primaryAgent;
            let requiresVerification = false;

            if (intent === 'ask_order_status' || intent === 'ask_refund' || intent === 'ask_shipping' || intent === 'ask_cancel' || intent === 'ask_return') {
                 requiresVerification = true;
                 primaryAgent = this.agents.get('order');
            } else if (intent === 'ask_policy' || intent === 'unknown' || intent === 'greet') {
                 primaryAgent = this.agents.get('rag');
            } else {
                 // Fallback for unhandled intents
                 primaryAgent = this.agents.get('rag');
            }

            // Check if verification is required but not completed
            if (requiresVerification && session.state !== 'verified') {
                 session.state = 'awaiting_email';
                 this._updateSession(userId, session);
                 return { result: { answer: "I can help with that, but I need to verify your identity first. What's your email address?" } };
            }

            // Step 4: Get response from the selected agent
            if (!primaryAgent) throw new Error(`Primary agent not found for intent: ${intent}`);

            const primaryResponse = await primaryAgent._handleMessage(message);

            // Step 5: Optional - Validate and improve response (simplified for now)
            // In a more advanced Orchestrator, you'd validate if the primaryResponse
            // actually answered the user's question and potentially call other agents
            // or use an LLM to refine the response.
            let finalResponse = primaryResponse;

            return finalResponse;

        } catch (error) {
            debugLog(`Error in OrchestrationAgent: ${error.message}`);
            // Reset state on error for simplicity, or implement more robust error handling
            this._updateSession(userId, { state: 'initial' });
            return {
                result: {
                    error: error.message,
                    answer: 'I encountered an error while processing your request. Please try again from the beginning.'
                }
            };
        }
    }

    // --- Session Management ---
    _getSession(userId) {
        if (!this.sessions.has(userId)) {
            this.sessions.set(userId, { state: 'initial', email: null, phone: null, orders: [] });
        }
        return this.sessions.get(userId);
    }

    _updateSession(userId, session) {
        this.sessions.set(userId, session);
    }

    // --- User Verification and Order Lookup (Should call dedicated services/agents) ---
    // Removed the mock _getOrderSummary method.
    // The OrchestrationAgent now routes messages to the OrderManagementAgent
    // which contains the logic to interact with Supabase.

    // Mock specific order details lookup if needed by Orchestrator
    // async _getSpecificOrderDetails(orderId, userId) {
    //     // Mock logic based on _getOrderDetails in OrderManagementAgent
    // }
} 