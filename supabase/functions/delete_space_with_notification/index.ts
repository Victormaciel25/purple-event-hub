
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("=== DELETE SPACE WITH NOTIFICATION - INICIO ===");
  
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log("Processando requisição de exclusão de espaço");
    
    // Get the request body
    const requestBody = await req.text();
    console.log("Request body raw:", requestBody);
    
    const { space_id, deletion_reason } = JSON.parse(requestBody);
    console.log("Dados parseados:", { space_id, deletion_reason });
    
    // Check if required fields are provided
    if (!space_id || !deletion_reason) {
      console.error("Campos obrigatórios ausentes:", { 
        space_id: !!space_id, 
        deletion_reason: !!deletion_reason 
      });
      return new Response(
        JSON.stringify({ error: 'space_id and deletion_reason are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log("Supabase URL:", supabaseUrl ? "Configurada" : "Não configurada");
    console.log("Service Role Key:", serviceRoleKey ? "Configurada" : "Não configurada");
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Variáveis de ambiente do Supabase não configuradas");
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);
    
    console.log(`Buscando detalhes do espaço: ${space_id}`);
    
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
        JSON.stringify({ error: `Erro ao buscar espaço: ${spaceError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!spaceData) {
      console.error('Espaço não encontrado:', space_id);
      return new Response(
        JSON.stringify({ error: 'Espaço não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
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
        JSON.stringify({ error: `Erro ao buscar usuário: ${userError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!userData?.user?.email) {
      console.error('Email do usuário não encontrado');
      return new Response(
        JSON.stringify({ error: 'Email do usuário não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log("Email do usuário encontrado:", userData.user.email);
    
    // Send deletion notification email BEFORE deleting the space
    const userName = spaceData.profiles?.first_name 
      ? `${spaceData.profiles.first_name} ${spaceData.profiles.last_name || ''}`.trim()
      : 'Usuário';
      
    console.log("Enviando email de notificação ANTES da exclusão");
    console.log("Dados para email:", {
      userName,
      userEmail: userData.user.email,
      spaceName: spaceData.name,
      deletionReason: deletion_reason
    });
    
    try {
      const notificationUrl = `${supabaseUrl}/functions/v1/send-deletion-notification`;
      console.log("Chamando função de notificação:", notificationUrl);
      
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
        console.error('ERRO: Falha ao enviar email de notificação:', {
          status: notificationResponse.status,
          body: responseText
        });
        // Não falhar a operação toda se o email falhar, mas registrar o erro
      } else {
        console.log('✅ Email de notificação enviado com sucesso!');
        const emailResult = JSON.parse(responseText);
        console.log('Resultado do email:', emailResult);
      }
    } catch (emailError) {
      console.error('ERRO CRÍTICO ao enviar email de notificação:', emailError);
      // Não falhar a operação toda se o email falhar
    }
    
    console.log(`Executando exclusão do espaço: ${space_id}`);
    
    // Call the RPC function to delete space and photos
    const { data, error } = await supabaseClient.rpc('delete_space_with_photos', {
      space_id_param: space_id
    });
    
    if (error) {
      console.error('Erro no delete_space_with_photos:', error);
      return new Response(
        JSON.stringify({ error: `Erro ao excluir espaço: ${error.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log('✅ Espaço excluído com sucesso');
    console.log('=== OPERAÇÃO CONCLUÍDA COM SUCESSO ===');
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Espaço excluído e notificação enviada',
        details: {
          space_name: spaceData.name,
          user_email: userData.user.email,
          deletion_reason: deletion_reason
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error('ERRO INESPERADO em delete_space_with_notification:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
