/**
 * Supabase Category & Subcategory Seeder
 *
 * Run: node scripts/seed-categories.js
 *
 * Prerequisites:
 *   Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables
 *   OR edit the values below directly.
 *
 * This seeds the `categories` and `subcategories` tables from the
 * data extracted from the Personal_Expense_Tracker_v8.xlsx spreadsheet.
 */

import { createClient } from '@supabase/supabase-js';

// ─── Configuration ──────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Data extracted from spreadsheet ────────────────────────────
const CATEGORIES_DATA = [
  {
    name: 'Fixed Bills',
    type: 'Expense',
    subcategories: [
      'Rent / Home Loan EMI',
      'Electricity',
      'Internet / WiFi',
      'Mobile Recharge',
      'OTT Subscriptions',
      'Insurance Premium',
      'Gym / Fitness',
      'Other Bill',
    ],
  },
  {
    name: 'Food & Dining',
    type: 'Expense',
    subcategories: [
      'Restaurants',
      'Swiggy / Zomato',
      'Cafes',
      'Street Food',
      'Other',
    ],
  },
  {
    name: 'Transport & Fuel',
    type: 'Expense',
    subcategories: [
      'Fuel',
      'Auto / Cab',
      'Metro / Bus',
      'Parking',
      'Vehicle Maintenance',
      'Other',
    ],
  },
  {
    name: 'Shopping & Clothing',
    type: 'Expense',
    subcategories: [
      'Clothing',
      'Electronics',
      'Home & Decor',
      'Online Shopping',
      'Other',
    ],
  },
  {
    name: 'Entertainment & OTT',
    type: 'Expense',
    subcategories: [
      'Movies / Events',
      'OTT Subscriptions',
      'Gaming',
      'Other',
    ],
  },
  {
    name: 'Groceries',
    type: 'Expense',
    subcategories: [
      'Vegetables & Fruits',
      'Dairy',
      'Supermarket',
      'Kirana Store',
      'Other',
    ],
  },
  {
    name: 'Investment',
    type: 'Expense',
    subcategories: [
      'SIP / Mutual Funds',
      'Fixed Deposit',
      'Gold / Others',
      'Stocks',
      'PPF / NPS',
      'Other Investment',
    ],
  },
  {
    name: 'Added to Savings',
    type: 'Expense',
    subcategories: [],  // Dynamically populated from accounts table
  },
  {
    name: 'Credit Card Payment',
    type: 'Expense',
    subcategories: [
      'Full Payment',
      'Minimum Due',
      'Partial Payment',
    ],
  },
  {
    name: 'Miscellaneous',
    type: 'Expense',
    subcategories: [
      'Medical',
      'Education',
      'Gifts',
      'Charity',
      'Other',
    ],
  },
];

// ─── Seed logic ─────────────────────────────────────────────────
async function seed() {
  console.log('🌱 Starting category seed...\n');

  for (const cat of CATEGORIES_DATA) {
    // Insert category
    const { data: catData, error: catError } = await supabase
      .from('categories')
      .insert({ name: cat.name, type: cat.type })
      .select()
      .single();

    if (catError) {
      // If already exists, try to find it
      if (catError.code === '23505') {
        console.log(`  ⏭️  Category "${cat.name}" already exists, skipping.`);
        const { data: existing } = await supabase
          .from('categories')
          .select('id')
          .eq('name', cat.name)
          .single();

        if (existing && cat.subcategories.length > 0) {
          await insertSubcategories(existing.id, cat.subcategories);
        }
        continue;
      }
      console.error(`  ❌ Failed to insert "${cat.name}":`, catError.message);
      continue;
    }

    console.log(`  ✅ Category: ${cat.name} (id: ${catData.id})`);

    // Insert subcategories
    if (cat.subcategories.length > 0) {
      await insertSubcategories(catData.id, cat.subcategories);
    }
  }

  console.log('\n🎉 Seed complete!');
}

async function insertSubcategories(categoryId, subcategories) {
  const rows = subcategories.map((name) => ({
    category_id: categoryId,
    name,
  }));

  const { error } = await supabase.from('subcategories').insert(rows);
  if (error) {
    if (error.code === '23505') {
      console.log(`     ⏭️  Subcategories already exist, skipping duplicates.`);
    } else {
      console.error(`     ❌ Subcategory insert error:`, error.message);
    }
  } else {
    console.log(`     📁 Added ${subcategories.length} subcategories`);
  }
}

seed().catch(console.error);
