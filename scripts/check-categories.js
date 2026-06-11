import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env manually
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function checkTransactionsTable() {
  const { data, error } = await supabase.from('transactions').select('*').limit(1);
  if (error) {
    console.error('❌ Error querying transactions:', error.message, error);
  } else {
    console.log('✅ Transactions table queried successfully.');
    if (data && data.length > 0) {
      console.log('Sample transaction:', data[0]);
    } else {
      console.log('Transactions table is empty.');
    }
  }
}

checkTransactionsTable();
