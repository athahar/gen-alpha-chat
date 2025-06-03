import dotenv from 'dotenv';
dotenv.config();

export function debugLog(...args) {
    if (process.env.DEBUG_LOGS === 'true') {
        console.log(...args);
    }
}
