
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
    console.log("=== INICIANDO EXCLUSÃO DE ESPAÇO COM NOTIFICAÇÃO ===");
    
    // Get the request body
    const { space_id, deletion_reason } = await req.json();
    console.log("Dados recebidos:", { space_id, deletion_reason });
    
    // Check if required fields are provided
    if (!space_id || !deletion_reason) {
      console.error("Campos obrigatórios ausentes:", { space_id: !!space_id, deletion_reason: !!deletion_reason });
      return new Response(
        JSON.stringify({ error: 'space_id and deletion_reason are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    console.log(`Buscando detalhes do espaço para notificação: ${space_id}`);
    
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
      console.error('Erro ao buscar detalhes do espaço:', spaceError);
      return new Response(
        JSON.stringify({ error: spaceError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log("Dados do espaço encontrados:", {
      name: spaceData.name,
      user_id: spaceData.user_id,
      profile: spaceData.profiles
    });
    
    // Get user email from auth.users
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(spaceData.user_id);
    
    if (userError) {
      console.error('Erro ao buscar email do usuário:', userError);
      return new Response(
        JSON.stringify({ error: userError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log("Email do usuário encontrado:", userData.user.email);
    
    console.log(`Chamando RPC delete_space_with_photos para o espaço: ${space_id}`);
    
    // Call the RPC function to delete space and photos
    const { data, error } = await supabaseClient.rpc('delete_space_with_photos', {
      space_id_param: space_id
    });
    
    if (error) {
      console.error('Erro no delete_space_with_photos:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log('Espaço excluído com sucesso, enviando email de notificação');
    
    // Send deletion notification email
    const userName = spaceData.profiles?.first_name 
      ? `${spaceData.profiles.first_name} ${spaceData.profiles.last_name || ''}`.trim()
      : 'Usuário';
      
    console.log("Preparando dados para email:", {
      userName,
      userEmail: userData.user.email,
      spaceName: spaceData.name,
      deletionReason: deletion_reason
    });
    
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const notificationUrl = `${supabaseUrl}/functions/v1/send-deletion-notification`;
      
      console.log("Chamando função de notificação em:", notificationUrl);
      
      const notificationResponse = await fetch(notificationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          type: 'space',
          itemName: spaceData.name,
          userEmail: userData.user.email,
          userName: userName,
          deletionReason: deletion_reason,
        }),
      });
      
      const responseText = await notificationResponse.text();
      console.log("Resposta da função de notificação:", {
        status: notificationResponse.status,
        statusText: notificationResponse.statusText,
        body: responseText
      });
      
      if (!notificationResponse.ok) {
        console.error('Falha ao enviar email de notificação:', {
          status: notificationResponse.status,
          body: responseText
        });
        // Não falhar a operação toda se o email falhar
      } else {
        console.log('Email de notificação enviado com sucesso!');
        const emailResult = JSON.parse(responseText);
        console.log('Resultado do email:', emailResult);
      }
    } catch (emailError) {
      console.error('Erro ao enviar email de notificação:', emailError);
      // Não falhar a operação toda se o email falhar
    }
    
    console.log('=== OPERAÇÃO CONCLUÍDA COM SUCESSO ===');
    
    // Return success response
    return new Response(
      JSON.stringify({ success: true, message: 'Espaço excluído e notificação enviada' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error('Erro inesperado em delete_space_with_notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
