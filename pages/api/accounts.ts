import { createClient } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from 'next'

const supabaseUrl = 'https://fabxmporizzqflnftavs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhYnhtcG9yaXp6cWZsbmZ0YXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIyNDQ5MTIsImV4cCI6MjAzNzgyMDkxMn0.UIEJiUNkLsW28tBHmG-RQDW-I5JNlJLt62CSk9D_qG8'

const supabase = createClient(supabaseUrl, supabaseKey)

interface Account {
  account_id: string;
  username: string;
  account_display_name: string;
}

async function fetchAllAccounts() {
  const { data, error } = await supabase
    .from('account')
    .select('account_id, username, account_display_name')
    .order('account_id', { ascending: true });

  if (error) {
    throw new Error(`Error fetching accounts: ${error.message}`);
  }

  if (!data) {
    throw new Error('No accounts retrieved');
  }

  return data;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{
    data: Account[];
    lastUpdated: string;
  } | { error: string }>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Force refresh if requested
  const forceRefresh = req.query.refresh === 'true';

  try {
    // Set cache headers
    if (!forceRefresh) {
      // Cache for 24 hours
      res.setHeader(
        'Cache-Control',
        'public, s-maxage=86400, stale-while-revalidate=600'
      );
    } else {
      // No cache for force refresh
      res.setHeader('Cache-Control', 'no-store');
    }

    // Fetch accounts
    const accounts = await fetchAllAccounts();
    
    return res.status(200).json({
      data: accounts,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    // Don't cache errors
    res.setHeader('Cache-Control', 'no-store');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ error: errorMessage });
  }
}
