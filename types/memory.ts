/**
 * Shared memory interface that defines the structure of memory
 * shared between all agents in the system.
 */
export interface SharedMemory {
  // Message state
  message: string;
  isSafe: boolean;
  safetyReason?: string;
  modifiedMessage?: string;

  // Intent state
  currentIntent?: 'ask_shipping' | 'ask_refund' | 'ask_order_status' | 'ask_policy' | 'unknown';
  reasoning?: string;

  // Policy state
  policyAnswer?: string;
  policyConfidence?: number;

  // Order state
  orderData?: {
    orderId: string;
    status: string;
    shippingAddress: string;
    estimatedDelivery: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
  } | null;
  orderAnswer?: string;

  // Conversation state
  response?: string;
  tone?: 'friendly' | 'professional' | 'empathetic';
  followUp?: boolean;

  // Session state
  sessionId?: string;
  userId?: string;
  timestamp?: number;
}

/**
 * Creates a new empty shared memory object
 */
export function createEmptyMemory(): SharedMemory {
  return {
    message: '',
    isSafe: true,
    timestamp: Date.now()
  };
}

/**
 * Validates if a memory object has all required fields
 */
export function validateMemory(memory: Partial<SharedMemory>): memory is SharedMemory {
  return (
    typeof memory.message === 'string' &&
    typeof memory.isSafe === 'boolean' &&
    (!memory.currentIntent || 
      ['ask_shipping', 'ask_refund', 'ask_order_status', 'ask_policy', 'unknown'].includes(memory.currentIntent)) &&
    (!memory.tone || 
      ['friendly', 'professional', 'empathetic'].includes(memory.tone))
  );
}

/**
 * Merges two memory objects, with the second object taking precedence
 */
export function mergeMemory(base: SharedMemory, update: Partial<SharedMemory>): SharedMemory {
  return {
    ...base,
    ...update,
    timestamp: Date.now()
  };
} 