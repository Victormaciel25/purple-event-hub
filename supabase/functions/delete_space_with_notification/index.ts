
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get the request body
    const { space_id, deletion_reason } = await req.json();
    
    // Check if required fields are provided
    if (!space_id || !deletion_reason) {
      return new Response(
        JSON.stringify({ error: 'space_id and deletion_reason are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    console.log(`Getting space details for notification: ${space_id}`);
    
    // Get space details and user information before deletion
    const { data: spaceData, error: spaceError } = await supabaseClient
      .from('spaces')
      .select(`
        name,
        user_id,
        profiles:user_id (
          first_name,
          last_name
        )
      `)
      .eq('id', space_id)
      .single();
    
    if (spaceError) {
      console.error('Error fetching space details:', spaceError);
      return new Response(
        JSON.stringify({ error: spaceError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Get user email from auth.users
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(spaceData.user_id);
    
    if (userError) {
      console.error('Error fetching user email:', userError);
      return new Response(
        JSON.stringify({ error: userError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log(`Calling delete_space_with_photos RPC for space: ${space_id}`);
    
    // Call the RPC function to delete space and photos
    const { data, error } = await supabaseClient.rpc('delete_space_with_photos', {
      space_id_param: space_id
    });
    
    if (error) {
      console.error('Error in delete_space_with_photos:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log('Space deleted successfully, sending notification email');
    
    // Send deletion notification email
    const userName = spaceData.profiles?.first_name 
      ? `${spaceData.profiles.first_name} ${spaceData.profiles.last_name || ''}`.trim()
      : 'Usuário';
    
    try {
      const notificationResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-deletion-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          type: 'space',
          itemName: spaceData.name,
          userEmail: userData.user.email,
          userName: userName,
          deletionReason: deletion_reason,
        }),
      });
      
      if (!notificationResponse.ok) {
        console.warn('Failed to send deletion notification email');
      } else {
        console.log('Deletion notification email sent successfully');
      }
    } catch (emailError) {
      console.warn('Error sending deletion notification email:', emailError);
      // Don't fail the whole operation if email fails
    }
    
    console.log('Successfully deleted space and sent notification');
    
    // Return success response
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error('Unexpected error in delete_space_with_notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
