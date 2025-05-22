
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.20.0";

serve(async (req) => {
  try {
    // Get the request body
    const { vendorId } = await req.json();
    
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Processing vendor approval for ID:", vendorId);

    // Update the vendor as admin (bypassing RLS)
    const { data, error } = await supabase
      .from("vendors")
      .update({ 
        status: "approved",
        rejection_reason: null
      })
      .eq("id", vendorId)
      .select();

    if (error) {
      console.error("Error approving vendor:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("Vendor approved successfully:", data);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        message: "Vendor approved successfully" 
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "An unexpected error occurred" 
      }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});
