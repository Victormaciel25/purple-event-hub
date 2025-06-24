
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get user from JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    const userId = user.id
    console.log(`Starting account deletion for user: ${userId}`)

    // Start a transaction to delete all user data
    // Delete user's spaces and related data
    const { error: spacesError } = await supabase
      .from('spaces')
      .delete()
      .eq('user_id', userId)
    
    if (spacesError) {
      console.error('Error deleting spaces:', spacesError)
    }

    // Delete user's vendors
    const { error: vendorsError } = await supabase
      .from('vendors')
      .delete()
      .eq('user_id', userId)
    
    if (vendorsError) {
      console.error('Error deleting vendors:', vendorsError)
    }

    // Delete user's chats and messages
    const { error: chatsError } = await supabase
      .from('chats')
      .delete()
      .or(`user_id.eq.${userId},owner_id.eq.${userId}`)
    
    if (chatsError) {
      console.error('Error deleting chats:', chatsError)
    }

    // Delete user's messages
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('sender_id', userId)
    
    if (messagesError) {
      console.error('Error deleting messages:', messagesError)
    }

    // Delete user's promotions
    const { error: spacePromotionsError } = await supabase
      .from('space_promotions')
      .delete()
      .eq('user_id', userId)
    
    if (spacePromotionsError) {
      console.error('Error deleting space promotions:', spacePromotionsError)
    }

    const { error: vendorPromotionsError } = await supabase
      .from('vendor_promotions')
      .delete()
      .eq('user_id', userId)
    
    if (vendorPromotionsError) {
      console.error('Error deleting vendor promotions:', vendorPromotionsError)
    }

    // Delete user's subscriptions
    const { error: subscriptionsError } = await supabase
      .from('space_subscriptions')
      .delete()
      .eq('user_id', userId)
    
    if (subscriptionsError) {
      console.error('Error deleting subscriptions:', subscriptionsError)
    }

    // Delete user's roles
    const { error: rolesError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
    
    if (rolesError) {
      console.error('Error deleting user roles:', rolesError)
    }

    // Delete user's notifications
    const { error: spaceNotificationsError } = await supabase
      .from('space_deletion_notifications')
      .delete()
      .eq('user_id', userId)
    
    if (spaceNotificationsError) {
      console.error('Error deleting space notifications:', spaceNotificationsError)
    }

    const { error: vendorNotificationsError } = await supabase
      .from('vendor_deletion_notifications')
      .delete()
      .eq('user_id', userId)
    
    if (vendorNotificationsError) {
      console.error('Error deleting vendor notifications:', vendorNotificationsError)
    }

    // Delete user's profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)
    
    if (profileError) {
      console.error('Error deleting profile:', profileError)
    }

    // Finally, delete the user from auth
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId)
    
    if (deleteUserError) {
      console.error('Error deleting user from auth:', deleteUserError)
      throw new Error('Failed to delete user account')
    }

    console.log(`Successfully deleted account for user: ${userId}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in delete-user-account function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
