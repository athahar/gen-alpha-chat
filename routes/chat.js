import express from 'express';
import validator from 'validator';
import { validateInput } from '../utils/security.js';
import { verifyUserIdentity } from '../utils/auth.js';
import { debugLog } from '../utils/logger.js';
import { AgentCommunication } from '../agents/AgentCommunication.js';
import { IntentDetectionAgent } from '../agents/IntentDetectionAgent.js';

const router = express.Router();

// Initialize agent communication system
const communication = new AgentCommunication();
const intentAgent = new IntentDetectionAgent();

// Initialize agents
(async () => {
    try {
        await intentAgent.initialize();
        communication.registerAgent(intentAgent);
        debugLog('✅ Agents initialized successfully');
    } catch (error) {
        debugLog('❌ Error initializing agents:', error);
    }
})();

router.post('/', async (req, res) => {
    let message = req.body.message;
    if (typeof message !== 'string') message = '';

    const session = req.session;
    const trimmedMessage = message.trim();

    // Track recent messages
    session.chatHistory = session.chatHistory || [];
    session.chatHistory.push({ role: 'user', content: trimmedMessage });
    if (session.chatHistory.length > 12) {
        session.chatHistory = session.chatHistory.slice(-12);
    }

    try {
        if (trimmedMessage === '') {
            const greeting = "Hi! How can I help you today? I can help with finding products, tracking orders, returns, and refunds.";
            session.chatHistory.push({ role: 'assistant', content: greeting });
            return res.json({ answer: greeting });
        }

        if (!validateInput(trimmedMessage)) {
            return res.status(403).json({ answer: "I'm sorry, I couldn't understand that. Could you please rephrase?" });
        }

        // If not authenticated, handle authentication flow
        if (!session.authenticated) {
            const isEmail = validator.isEmail(trimmedMessage);
            const isPhone = validator.isMobilePhone(trimmedMessage, 'any', { strictMode: false }) ||
                /^\d{3}[-\s]?\d{3}[-\s]?\d{4}$/.test(trimmedMessage);

            if (isEmail) {
                session.pendingEmail = trimmedMessage;
                return res.json({ answer: "Great! What's your phone number?" });
            }

            if (isPhone && session.pendingEmail) {
                const verifiedUser = await verifyUserIdentity(session.pendingEmail, trimmedMessage);
                if (verifiedUser) {
                    session.authenticated = true;
                    session.email = session.pendingEmail;
                    session.phone = trimmedMessage;
                    session.userId = verifiedUser;
                    return res.json({ answer: "You're all set! How can I help you today?" });
                } else {
                    session.pendingEmail = null;
                    return res.json({ answer: "I couldn't verify those details. Let's try again. What's your email?" });
                }
            }

            return res.json({ answer: "To help you better, I'll need your email and phone number. What's your email?" });
        }

        // Process message with intent detection agent
        const intentResult = await communication.sendMessage('intent-detection-agent', {
            type: 'user_message',
            content: trimmedMessage,
            session: {
                email: session.email,
                phone: session.phone,
                userId: session.userId
            }
        });

        // Handle the detected intent
        const { intent, confidence, entities } = intentResult.result.intent;
        
        if (confidence < 0.5) {
            return res.json({ 
                answer: "I'm not quite sure what you're asking. Could you please rephrase that?" 
            });
        }

        // Route to appropriate handler based on intent
        let response;
        switch (intent) {
            case 'find_rag':
                response = "I'll help you find that product. Let me search our catalog...";
                break;
            case 'fetch_order':
                response = "I'll look up your order status right away.";
                break;
            case 'handle_return':
                response = "I'll help you with your return request.";
                break;
            case 'handle_refund':
                response = "I'll assist you with your refund request.";
                break;
            default:
                response = "I'm not sure how to help with that. Could you please rephrase?";
        }

        session.chatHistory.push({ role: 'assistant', content: response });
        return res.json({ answer: response });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ answer: "I'm sorry, something went wrong. Please try again." });
    }
});

export default router;
