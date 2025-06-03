import fs from 'fs';
import { debugLog } from './logger.js';

const SECURITY_LEVELS = {
  SAFE: 0,
  LOW_RISK: 1,
  MEDIUM_RISK: 2,
  HIGH_RISK: 3,
  CRITICAL: 4
};

const WEIGHTS = {
  BASIC_OVERRIDE: 1,
  SYSTEM_MANIPULATION: 2,
  CODE_EXECUTION: 3,
  AUTHENTICATION: 2
};

const DETECTION_PATTERNS = {
  BASIC_OVERRIDE: [
    { pattern: /ignore\s+previous\s+instructions/i, weight: WEIGHTS.BASIC_OVERRIDE },
    { pattern: /you\s+are\s+now/i, weight: WEIGHTS.BASIC_OVERRIDE },
    { pattern: /pretend\s+you\s+are/i, weight: WEIGHTS.BASIC_OVERRIDE }
  ],
  SYSTEM_MANIPULATION: [
    { pattern: /drop\s+table/i, weight: WEIGHTS.SYSTEM_MANIPULATION },
    { pattern: /show\s+all\s+users/i, weight: WEIGHTS.SYSTEM_MANIPULATION },
    { pattern: /reveal\s+secrets/i, weight: WEIGHTS.SYSTEM_MANIPULATION }
  ],
  CODE_EXECUTION: [
    { pattern: /exec\s*\(/i, weight: WEIGHTS.CODE_EXECUTION },
    { pattern: /eval\s*\(/i, weight: WEIGHTS.CODE_EXECUTION }
  ],
  AUTHENTICATION: [
    { pattern: /login\s+as/i, weight: WEIGHTS.AUTHENTICATION },
    { pattern: /use\s+credentials/i, weight: WEIGHTS.AUTHENTICATION }
  ]
};

function logSecurityEvent(message, score, details) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    message,
    score,
    details
  };

  try {
    fs.appendFileSync('security_log.jsonl', JSON.stringify(logEntry) + '\n');
  } catch (err) {
    console.error('Security log write failed:', err.message);
  }
}

export function validateInput(message) {
  let totalScore = 0;
  const matchedPatterns = [];

  for (const [category, rules] of Object.entries(DETECTION_PATTERNS)) {
    for (const { pattern, weight } of rules) {
      if (pattern.test(message)) {
        totalScore += weight;
        matchedPatterns.push({ category, pattern: pattern.toString(), weight });
      }
    }
  }

  let securityLevel = SECURITY_LEVELS.SAFE;
  if (totalScore >= 5) securityLevel = SECURITY_LEVELS.CRITICAL;
  else if (totalScore >= 3) securityLevel = SECURITY_LEVELS.HIGH_RISK;
  else if (totalScore >= 2) securityLevel = SECURITY_LEVELS.MEDIUM_RISK;
  else if (totalScore >= 1) securityLevel = SECURITY_LEVELS.LOW_RISK;

  logSecurityEvent(message, totalScore, {
    level: securityLevel,
    matchedPatterns
  });

  debugLog(`🛡️ Input validation → Score: ${totalScore}, Level: ${Object.keys(SECURITY_LEVELS)[securityLevel]}`);
  return securityLevel < SECURITY_LEVELS.CRITICAL;
}
