import express from 'express';
import validator from 'validator';
import { validateInput } from '../utils/security.js';
import { getPolicyAnswer } from '../utils/rag.js';
import { verifyUserIdentity } from '../utils/auth.js';
import { debugLog } from '../utils/logger.js';
import { detectIntent } from '../utils/intentDetector.js';
import {
  getOrderSummary,
  getRefundInfo,
  getOrderStatus,
  getReturnEligibility,
  getRefundStatus,
  getShippingEstimate,
  handleCancelRequest
} from '../utils/supabase.js';




const router = express.Router();

const greetings = [
  "Yo! What’s up? Ask me about orders, returns, or whatever 📦",
  "Hey hey 👋 Got Qs about your stuff? I got A's",
  "Wanna know what’s up with your order? I got you 💯",
  "Need help? Hit me with your questions 💥",
  "📬 Ask me anything: returns, refunds, shipping, late stuff",
  "Hiya! Let’s get into your order stuff 🧾 What’s your email?",
  "😎 You + me = solving your shopping mysteries. Ask away.",
  "I’m your order BFF. Just ask. No stress 💅",
  "Email first, answers second. Let’s gooo 🚀",
  "Got questions on items, shipping costs, policies, times, refunds? Just ask 💬"
];

router.post('/', async (req, res) => {
  let message = req.body.message;
  if (typeof message !== 'string') message = '';

  const session = req.session;
  const trimmedMessage = message.trim();

  // ⏳ Track recent messages
  session.chatHistory = session.chatHistory || [];
  session.chatHistory.push({ role: 'user', content: trimmedMessage });
  if (session.chatHistory.length > 12) {
    session.chatHistory = session.chatHistory.slice(-12);
  }

  try {
    if (trimmedMessage === '') {
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      session.chatHistory.push({ role: 'assistant', content: greeting });
      return res.json({ answer: greeting });
    }

    if (!validateInput(trimmedMessage)) {
      return res.status(403).json({ answer: "Uhh... that doesn’t look like a real question 🤔" });
    }

    const intent = await detectIntent(trimmedMessage);
    debugLog(`🧠 Detected intent: ${intent}`);

    // 🔐 Pre-auth
    if (!session.authenticated) {
      if (['ask_policy', 'ask_refund', 'ask_shipping', 'ask_cancel'].includes(intent)) {
        const answer = await getPolicyAnswer(trimmedMessage, session.chatHistory);
        const followup = trimmedMessage.toLowerCase().includes("my order")
          ? " 👉 If you want me to check your actual order status, just drop your email + phone."
          : "";
        const final = answer + followup;
        session.chatHistory.push({ role: 'assistant', content: final });
        return res.json({ answer: final });
      }

      const isEmail = validator.isEmail(trimmedMessage);
      const isPhone = validator.isMobilePhone(trimmedMessage, 'any', { strictMode: false }) ||
        /^\d{3}[-\s]?\d{3}[-\s]?\d{4}$/.test(trimmedMessage);

      if (isEmail) {
        session.pendingEmail = trimmedMessage;
        return res.json({ answer: "Cool, got your email. What’s your phone number? 📱" });
      }

      if (isPhone && session.pendingEmail) {
        const verifiedUser = await verifyUserIdentity(session.pendingEmail, trimmedMessage);
        if (verifiedUser) {
          session.authenticated = true;
          session.email = session.pendingEmail;
          session.phone = trimmedMessage;
          session.userId = verifiedUser;

          const orders = await getOrderSummary(session.email, session.phone);
          session.orders = orders;

          //const orderList = orders.map(o => `• ${o.id}`).join('\n');

          const orderList = orders
          .map(o => `• ${o.id} – ${o.status || 'status unknown'}`)
          .join('\n');
          const summary = orders.length
            ? `You’ve got ${orders.length} order(s):\n${orderList}\nWhich one ya wanna chat about?`
            : "But I couldn't find any orders just yet. Let me know if you used a different email/phone.";

          const final = `You’re verified ✅! ${summary}`;
          session.chatHistory.push({ role: 'assistant', content: final });
          return res.json({ answer: final });
        } else {
          session.pendingEmail = null;
          return res.json({ answer: "Hmm... couldn’t verify that combo. Let’s try again. What’s your email? 📧" });
        }
      }

      return res.json({ answer: "I can help with general stuff! But for orders, I need your email + phone first 📲" });
    }

    // 🔁 Dynamic re-binding of order ID if user mentions it
    if (session.authenticated && session.orders?.length) {
      const knownIds = session.orders.map(o => o.id.toString());
      const mentionedId = knownIds.find(id => trimmedMessage.includes(id));
      if (mentionedId && mentionedId !== session.orderSelected) {
        session.orderSelected = mentionedId;
        debugLog(`📎 Overriding orderSelected based on message: ${mentionedId}`);
      }
    }

    // ✅ Match explicit order selection
    if (session.authenticated && session.orders?.length) {
      const knownIds = session.orders.map(o => o.id.toString());
      if (knownIds.includes(trimmedMessage)) {
        session.orderSelected = trimmedMessage;
        const final = `Cool cool. Order ${trimmedMessage} it is! What do you wanna know?`;
        session.chatHistory.push({ role: 'assistant', content: final });
        return res.json({ answer: final });
      }
    }

    // 📦 Order status
    if (intent === 'ask_order_status') {
      if (!session.orderSelected) {
        const orders = await getOrderSummary(session.email, session.phone);
        if (!orders.length) {
          return res.json({ answer: "Hmm... no recent orders under your info 🕵️" });
        }
        const orderList = orders.map(o => `• ${o.id}`).join('\n');
        session.orders = orders;
        return res.json({ answer: `You’ve got ${orders.length} orders:\n${orderList}\nWhich one ya wanna chat about?` });
      }

      const answer = await getOrderStatus(session.orderSelected);
      session.chatHistory.push({ role: 'assistant', content: answer });
      return res.json({ answer });
    }

    // 📦 Fallback to RAG for refund/shipping if no order selected
    if (!session.orderSelected && ['ask_refund', 'ask_shipping'].includes(intent)) {
      const answer = await getPolicyAnswer(trimmedMessage, session.chatHistory);
      session.chatHistory.push({ role: 'assistant', content: answer });
      return res.json({ answer });
    }

    // 💸 Refund (order-specific)
    if (intent === 'ask_refund') {
      const final = await getRefundStatus(session.orderSelected, session.chatHistory);
      session.chatHistory.push({ role: 'assistant', content: final });
      return res.json({ answer: final });
    }


    // ✅ Return logic (ask_return intent)
    if (intent === 'ask_return') {
      const eligibility = await getReturnEligibility(session.orderSelected);
      let policy = '';
      if (!eligibility.includes('Oof') && !eligibility.includes('already')) {
        policy = await getPolicyAnswer('what is the return policy');
      }
    
      return res.json({
        answer: `${eligibility}${policy ? '\n\n' + policy : ''}`
      });
    }


    // 🚚 Shipping intent (order-specific)
      if (intent === 'ask_shipping') {
        const final = await getShippingEstimate(session.orderSelected);
        session.chatHistory.push({ role: 'assistant', content: final });
        return res.json({ answer: final });
      }

    // ❌ Cancel intent = RAG
    if (intent === 'ask_cancel') {
      const answer = await handleCancelRequest(session.orderSelected, session.chatHistory);
      session.chatHistory.push({ role: 'assistant', content: answer });
      return res.json({ answer });
    }

    // 🧠 Fallback
    const ragAnswer = await getPolicyAnswer(trimmedMessage, session.chatHistory);
    const fallback = ragAnswer?.toLowerCase().includes("i couldn’t find") || ragAnswer?.toLowerCase().includes("not sure");
    const final = fallback
      ? "Hmm, I couldn't find anything solid on that. Try asking another way or ping support 🧠"
      : ragAnswer;

    session.chatHistory.push({ role: 'assistant', content: final });
    return res.json({ answer: final });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ answer: "Yikes 😬 Something broke. Try again in a sec!" });
  }
});

export default router;
