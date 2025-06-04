# Gen Alpha Customer Support Bot - Detailed Multi-Agent Tasklist

## Project Overview
Refactor an existing Gen Alpha-style support bot into a clean multi-agent architecture. Each agent should operate independently, mutate memory only within its domain, and communicate through a typed contract.

### Core Stack
- **Supabase**: Auth + order data
- **Pinecone + OpenAI**: RAG answers
- **Node.js (Express)**: Backend + orchestration
- Each agent lives in `/agents` and implements a shared contract

## Agent Interface
```typescript
async function agent(message: string, memory: SharedMemory): Promise<SharedMemory>
```
All agents must:
- Read from message and memory
- Only mutate relevant fields in memory
- Return an updated memory object

## Agent Implementation Tasks

### 1. Intent Agent (`agents/intentAgent.js`)
**Goal**: Identify user intent and rationale
**Tools**: OpenAI completions
**Memory**: currentIntent, reasoning

Tasks:
- [ ] Create file `agents/intentAgent.js`
- [ ] Implement `detectIntent(message)` using OpenAI
- [ ] Add few-shot examples for classification
- [ ] Extract reasoning and store in reasoning
- [ ] Add basic confidence threshold check
- [ ] Validate memory update: only currentIntent and reasoning are set
- [ ] Write test cases for:
  - [ ] Known intents
  - [ ] Unknown intent
  - [ ] Empty message
- [ ] Add integration test with shared memory simulation

### 2. Policy RAG Agent (`agents/policyRAGAgent.js`)
**Goal**: Answer policy/refund questions using Pinecone
**Tools**: Pinecone, OpenAI
**Memory**: policyAnswer

Tasks:
- [ ] Create file `agents/policyRAGAgent.js`
- [ ] Call Pinecone with embedded message
- [ ] Filter top match by score threshold
- [ ] Format short answer from RAG response
- [ ] Fallback to default text if no match found
- [ ] Avoid setting policyAnswer if no reliable answer
- [ ] Add unit test for:
  - [ ] Answer found
  - [ ] Fallback
  - [ ] Multiple matches
- [ ] Add integration test simulating message + shared memory

### 3. Order Data Agent (`agents/orderDataAgent.js`)
**Goal**: Fetch user's order info from Supabase
**Tools**: Supabase
**Memory**: orderDetails

Tasks:
- [ ] Create file `agents/orderDataAgent.js`
- [ ] Implement order summary query by user ID
- [ ] Parse delivery/refund status from raw Supabase record
- [ ] Add date formatting utility (e.g. "May 8, 2025")
- [ ] Format schema as: status, deliveryDate, refundDate, totalPrice, etc.
- [ ] Write tests for:
  - [ ] No orders
  - [ ] One order
  - [ ] Multiple orders
  - [ ] Malformed dates
- [ ] Ensure only orderDetails is mutated

### 4. Conversation Agent (`agents/conversationAgent.js`)
**Goal**: Generate Gen Alpha-style final response
**Tools**: OpenAI completions
**Memory**: finalResponse

Tasks:
- [ ] Create file `agents/conversationAgent.js`
- [ ] Build prompt template that injects currentIntent, orderDetails, policyAnswer
- [ ] Add tone controls: emoji, brevity, casual phrasing
- [ ] Handle cases where key memory fields are missing
- [ ] Generate finalResponse only if memory is valid
- [ ] Write test cases for:
  - [ ] Order-only
  - [ ] Policy-only
  - [ ] Both
  - [ ] Neither
- [ ] Validate memory mutation: only finalResponse

### 5. Guardrails Agent (`agents/guardrailsAgent.js`)
**Goal**: Sanitize input and block unsafe prompts
**Tools**: regex, validator, PII check
**Memory**: none (validation only)

Tasks:
- [ ] Create file `agents/guardrailsAgent.js`
- [ ] Add `sanitizeInput(message)` to strip junk and bad characters
- [ ] Add `isToxic(message)` using simple keyword or moderation API
- [ ] Block prompt injection patterns
- [ ] Write unit tests for:
  - [ ] Valid input
  - [ ] PII detection
  - [ ] Prompt injection
  - [ ] Empty input

### 6. Orchestrator Agent (`agents/orchestratorAgent.js`)
**Goal**: Coordinate all other agents to produce a final message
**Tools**: All agents
**Memory**: Reads + writes all fields

Tasks:
- [ ] Create file `agents/orchestratorAgent.js`
- [ ] Move logic from `routes/chat.js`
- [ ] Implement agent coordination:
  - [ ] Step 1: guardrailsAgent → sanitize and validate
  - [ ] Step 2: intentAgent → store intent + reasoning
  - [ ] Step 3: If intent is order-related → call orderDataAgent
  - [ ] Step 4: If intent is policy-related → call policyRAGAgent
  - [ ] Step 5: Call conversationAgent to finalize reply
  - [ ] Step 6: Return updated memory
- [ ] Log before/after memory state for debugging
- [ ] Write full-flow test with mock agents

## Shared Memory Sample
```typescript
{
  sessionId: 'abc123',
  isAuthenticated: true,
  email: 'user@email.com',
  phone: '+1555...',
  currentIntent: 'ask_shipping',
  reasoning: 'User asked when their order will arrive.',
  orderId: '350',
  orderOptions: ['350'],
  orderDetails: {
    status: 'delivered',
    deliveryDate: '2025-05-08',
    refundStatus: 'issued',
    refundDate: '2025-05-21',
    totalPrice: 4200
  },
  policyAnswer: 'You have 30 days to return it 📦',
  finalResponse: 'Order 350 was delivered on May 8 🚚. You have 22 days left to return it 💫'
}
```

## Infrastructure Tasks (Phase 1)
- [ ] Create `utils/memory.js` — scoped session memory with TTL
- [ ] Add memory loader/saver for orchestrator
- [ ] Add logging with agent input/output payloads
- [ ] Install missing packages (e.g. OpenAI SDK, validator, etc.)

## Success Criteria
- [ ] Each agent has clear, isolated logic
- [ ] Shared memory is updated safely and predictably
- [ ] The orchestrator handles full flow for any input
- [ ] Tone and UX is consistent with Gen Alpha voice
- [ ] Logs allow tracing every agent's impact
- [ ] Easy to plug in new agents (e.g. delivery delay, escalation)

## Future Extensions
- Delivery delay detector agent
- Escalation agent
- Sentiment analysis agent
- User preference learning agent

## Technical Specifications

### File Structure
```
/agents
  intentAgent.js
  policyRAGAgent.js
  orderDataAgent.js
  conversationAgent.js
  guardrailsAgent.js
  orchestratorAgent.js

/utils
  auth.js
  logger.js
  openAIClient.js
  pineconeClient.js
  supabase.js
  docProcessor.js
  security.js
  judge.js
  memory.js

/public
  index.html
  chat.js
  style.css

/routes
  chat.js
  rag.js
  auth.js
  feedback.js
  response.js

/data (optional)
  responses.jsonl
  feedback_log.jsonl
  debug-pinecone.js

.gitignore
.env
package.json
package-lock.json
app.js
```

### Shared Memory Schema
```javascript
{
  sessionId: string,
  isAuthenticated: boolean,
  email: string,
  phone: string,
  currentIntent: string,
  reasoning: string,
  orderId: string,
  orderOptions: string[],
  orderDetails: {
    status: string,
    deliveryDate: string,
    refundStatus: string,
    refundDate: string,
    totalPrice: number
  },
  policyAnswer: string,
  finalResponse: string
}
```

## Notes
- Keep all business logic in backend
- Maintain strict input validation
- Never leak information not in Pinecone docs
- Follow Gen Alpha tone guide consistently
- Use intent detection for all natural language matching 