import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { debugLog } from './logger.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export async function verifyUserIdentity(email, phone) {
  debugLog(`🔍 Verifying identity for email: ${email}, phone: ${phone}`);

  const { data, error } = await supabase
    .from('orders')
    .select('user_id')
    .eq('email', email)
    .eq('phone', phone)
    .limit(1);

  if (error) {
    debugLog(`❌ Supabase error during verification: ${error.message}`);
    throw error;
  }

  if (data.length > 0) {
    debugLog(`✅ Verified user_id: ${data[0].user_id}`);
    return data[0].user_id;
  } else {
    debugLog(`❌ No matching user found`);
    return null;
  }
}
