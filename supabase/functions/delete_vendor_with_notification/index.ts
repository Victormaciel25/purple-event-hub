
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.20.0";

// Add CORS headers for browser compatibility
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get the request body
    let vendorId, deleteReason;
    try {
      const body = await req.json();
      vendorId = body.vendorId;
      deleteReason = body.deleteReason;
      
      if (!vendorId || !deleteReason) {
        throw new Error("Vendor ID and deletion reason are required");
      }
      
      console.log("Received vendor ID for deletion:", vendorId);
      console.log("Deletion reason:", deleteReason);
    } catch (error) {
      console.error("Error parsing request body:", error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid request body. Expected JSON with vendorId and deleteReason fields." 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 400 
        }
      );
    }
    
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Processing vendor deletion for ID:", vendorId);

    // Get vendor information including user_id and vendor name
    const { data: vendorData, error: vendorError } = await supabase
      .from("vendors")
      .select("user_id, name")
      .eq("id", vendorId)
      .single();
    
    if (vendorError) {
      console.error("Error fetching vendor:", vendorError);
      return new Response(
        JSON.stringify({ success: false, error: vendorError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    const userId = vendorData.user_id;
    const vendorName = vendorData.name;
    
    console.log("Vendor user_id:", userId);
    console.log("Vendor name:", vendorName);
    
    // Get user profile information separately
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", userId)
      .single();
    
    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      // Continue without profile data - use default name
    }
    
    // Get user email from auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError) {
      console.error("Error fetching user email:", userError);
      return new Response(
        JSON.stringify({ success: false, error: userError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Create vendor deletion notification in database
    const { data: notificationData, error: notificationError } = await supabase
      .from("vendor_deletion_notifications")
      .insert({
        vendor_name: vendorName,
        user_id: userId,
        deletion_reason: deleteReason,
      });
    
    if (notificationError) {
      console.error("Error creating notification:", notificationError);
      return new Response(
        JSON.stringify({ success: false, error: notificationError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    console.log("Notification created successfully:", notificationData);
    
    // Delete the vendor
    const { error: deleteError } = await supabase
      .from("vendors")
      .delete()
      .eq("id", vendorId);
    
    if (deleteError) {
      console.error("Error deleting vendor:", deleteError);
      return new Response(
        JSON.stringify({ success: false, error: deleteError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    console.log("Vendor deleted successfully, sending notification email");
    
    // Send deletion notification email
    const userName = profileData && profileData.first_name 
      ? `${profileData.first_name} ${profileData.last_name || ''}`.trim()
      : 'Usuário';
    
    try {
      const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-deletion-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          type: 'vendor',
          itemName: vendorName,
          userEmail: userData.user.email,
          userName: userName,
          deletionReason: deleteReason,
        }),
      });
      
      if (!emailResponse.ok) {
        console.warn('Failed to send deletion notification email');
      } else {
        console.log('Deletion notification email sent successfully');
      }
    } catch (emailError) {
      console.warn('Error sending deletion notification email:', emailError);
      // Don't fail the whole operation if email fails
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Vendor deleted, notification created, and email sent successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "An unexpected error occurred" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
