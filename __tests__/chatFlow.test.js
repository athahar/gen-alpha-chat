import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = 'http://localhost:3000';
const sessionId = uuidv4();

const chat = async (message) => {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId })
  });
  return res.json();
};

const auth = async (email, phone) => {
  const res = await fetch(`${BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, phone, sessionId })
  });
  return res.json();
};

describe('Gen Alpha Bot E2E', () => {
  it('responds with refund policy before auth', async () => {
    const res = await chat('refund policy');
    expect(res.finalResponse.toLowerCase()).toContain('refund');
    expect(res.finalResponse).toMatch(/💸|money|card/i);
  });

  it('blocks order status before auth', async () => {
    const res = await chat('order status');
    expect(res.finalResponse).toMatch(/email.+phone/i);
  });

  it('authenticates user', async () => {
    const res = await auth('sadie@yahoo.com', '650-300-8998');
    expect(res.success).toBe(true);
    expect(res.message).toMatch(/verified/i);
  });

  it('shows multiple orders and prompts selection', async () => {
    const res = await chat('order status');
    expect(res.finalResponse).toMatch(/350/i);
    expect(res.finalResponse).toMatch(/362/i);
  });

  it('handles cancel request on delivered order', async () => {
    const res = await chat('cancel 350');
    expect(res.finalResponse.toLowerCase()).toMatch(/can.t cancel.+delivered/i);
    expect(res.finalResponse).toMatch(/22 days left/i);
  });

  it('responds to refund follow-up for 362', async () => {
    const res = await chat('when will my mone come for 362');
    expect(res.finalResponse.toLowerCase()).toMatch(/refund/i);
    expect(res.finalResponse).toMatch(/💸|already got/i);
  });
}); 