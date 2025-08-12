import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const AXIESTUDIO_APP_URL = 'https://axiestudio-axiestudio-ttefi.ondigitalocean.app';
const AXIESTUDIO_USERNAME = 'stefan@axiestudio.se';
const AXIESTUDIO_PASSWORD = 'STEfanjohn!12';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function getAxieStudioApiKey(): Promise<string> {
  try {
    // Step 1: Login to get JWT token
    const loginResponse = await fetch(`${AXIESTUDIO_APP_URL}/api/v1/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        username: AXIESTUDIO_USERNAME,
        password: AXIESTUDIO_PASSWORD
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const { access_token } = await loginResponse.json();

    // Step 2: Create API key using JWT token
    const apiKeyResponse = await fetch(`${AXIESTUDIO_APP_URL}/api/v1/api_key/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Trial Cleanup API Key'
      })
    });

    if (!apiKeyResponse.ok) {
      throw new Error(`API key creation failed: ${apiKeyResponse.status}`);
    }

    const { api_key } = await apiKeyResponse.json();
    return api_key;
  } catch (error) {
    console.error('Failed to get Axie Studio API key:', error);
    throw error;
  }
}

async function deleteAxieStudioUser(email: string): Promise<void> {
  try {
    const apiKey = await getAxieStudioApiKey();
    
    // Find user by email
    const usersResponse = await fetch(`${AXIESTUDIO_APP_URL}/api/v1/users/?x-api-key=${apiKey}`);
    
    if (!usersResponse.ok) {
      throw new Error(`Failed to fetch users: ${usersResponse.status}`);
    }

    const users = await usersResponse.json();
    const user = users.find((u: any) => u.username === email);

    if (!user) {
      console.log(`User ${email} not found in Axie Studio, skipping deletion`);
      return;
    }

    // Delete user
    const deleteResponse = await fetch(`${AXIESTUDIO_APP_URL}/api/v1/users/${user.id}?x-api-key=${apiKey}`, {
      method: 'DELETE',
      headers: { 'x-api-key': apiKey }
    });

    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete Axie Studio user: ${deleteResponse.status}`);
    }

    console.log(`Successfully deleted Axie Studio user: ${email}`);
  } catch (error) {
    console.error('Error deleting Axie Studio user:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // This function should be called by a cron job or scheduled task
    console.log('Starting trial cleanup process...');

    // Step 1: Check for expired trials and schedule deletions
    const { error: checkError } = await supabase.rpc('check_expired_trials');
    
    if (checkError) {
      console.error('Error checking expired trials:', checkError);
      throw new Error('Failed to check expired trials');
    }

    // Step 2: Get users scheduled for deletion
    const { data: usersToDelete, error: getUsersError } = await supabase.rpc('get_users_for_deletion');
    
    if (getUsersError) {
      console.error('Error getting users for deletion:', getUsersError);
      throw new Error('Failed to get users for deletion');
    }

    console.log(`Found ${usersToDelete?.length || 0} users scheduled for deletion`);

    // Step 3: Delete each expired user
    const deletionResults = [];
    
    for (const userToDelete of usersToDelete || []) {
      try {
        console.log(`Processing deletion for user: ${userToDelete.email}`);
        
        // Delete from Axie Studio first
        await deleteAxieStudioUser(userToDelete.email);
        
        // Delete from Supabase auth (this will cascade to other tables)
        const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userToDelete.user_id);
        
        if (deleteUserError) {
          console.error(`Failed to delete Supabase user ${userToDelete.email}:`, deleteUserError);
          deletionResults.push({
            email: userToDelete.email,
            success: false,
            error: deleteUserError.message
          });
        } else {
          console.log(`Successfully deleted user: ${userToDelete.email}`);
          deletionResults.push({
            email: userToDelete.email,
            success: true
          });
        }
      } catch (error: any) {
        console.error(`Failed to delete user ${userToDelete.email}:`, error);
        deletionResults.push({
          email: userToDelete.email,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Trial cleanup completed',
        processed: usersToDelete?.length || 0,
        results: deletionResults
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Trial cleanup error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});