
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userIds } = await req.json();
    
    // Create a Supabase client with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user emails for the provided user IDs
    const emailPromises = userIds.map(async (userId: string) => {
      const { data: user, error } = await supabase.auth.admin.getUserById(userId);
      if (error || !user) {
        console.error(`Error fetching user ${userId}:`, error);
        return { userId, email: null };
      }
      return { userId, email: user.user?.email || null };
    });

    const emailResults = await Promise.all(emailPromises);

    return new Response(
      JSON.stringify({ emails: emailResults }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get_admin_emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
