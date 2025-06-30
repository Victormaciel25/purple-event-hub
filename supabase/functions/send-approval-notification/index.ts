
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalNotificationRequest {
  type: 'space' | 'vendor';
  itemName: string;
  userId: string;
  userName: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== SEND APPROVAL NOTIFICATION - INICIO ===");
  
  // Handle CORS preflight requests  
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processando requisição de notificação de aprovação/rejeição");
    
    // Parse request body
    const requestBody = await req.text();
    console.log("Request body raw:", requestBody);
    
    const requestData: ApprovalNotificationRequest = JSON.parse(requestBody);
    console.log("Dados da notificação recebidos:", requestData);

    const {
      type,
      itemName,
      userId,
      userName,
      status,
      rejectionReason,
    } = requestData;

    // Validate required fields
    if (!type || !itemName || !userId || !userName || !status) {
      console.error("Campos obrigatórios ausentes");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Get user email using admin privileges
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !userData.user) {
      console.error("Error fetching user:", userError);
      return new Response(
        JSON.stringify({ error: "Could not fetch user data" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const userEmail = userData.user.email;
    if (!userEmail) {
      console.error("User email not found");
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    console.log("Resend API Key:", resendApiKey ? "Configurada" : "NÃO CONFIGURADA");
    
    if (!resendApiKey) {
      console.error("ERRO CRÍTICO: RESEND_API_KEY não encontrada nas variáveis de ambiente");
      return new Response(
        JSON.stringify({ error: "Email service not configured - RESEND_API_KEY missing" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Initialize Resend
    const resend = new Resend(resendApiKey);
    console.log("Resend inicializado com sucesso");

    const itemTypeText = type === 'space' ? 'espaço' : 'fornecedor';
    const statusText = status === 'approved' ? 'aprovado' : 'recusado';
    const subject = `Seu ${itemTypeText} foi ${statusText} - iParty Brasil`;

    let emailHtml = '';

    if (status === 'approved') {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #155724; margin: 0;">Parabéns! - iParty Brasil</h2>
          </div>
          
          <p>Olá ${userName},</p>
          
          <p>Temos ótimas notícias! Seu ${itemTypeText} <strong>"${itemName}"</strong> foi aprovado e já está disponível na plataforma iParty Brasil.</p>
          
          <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #0c5460; margin: 0 0 10px 0;">O que isso significa?</h3>
            <p style="margin: 0; color: #0c5460;">Seu ${itemTypeText} agora está visível para todos os usuários da plataforma e pode começar a receber contatos interessados em seus serviços.</p>
          </div>
          
          <p>Agradecemos por fazer parte da comunidade iParty Brasil!</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <div style="text-align: center; color: #666; font-size: 14px;">
            <p><strong>iParty Brasil</strong></p>
            <p>Conectando pessoas aos melhores espaços e fornecedores para eventos</p>
            <p><small>Este é um email automático. Para suporte, responda esta mensagem.</small></p>
          </div>
        </div>
      `;
    } else {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #721c24; margin: 0;">Notificação sobre seu ${itemTypeText} - iParty Brasil</h2>
          </div>
          
          <p>Olá ${userName},</p>
          
          <p>Informamos que seu ${itemTypeText} <strong>"${itemName}"</strong> não foi aprovado para publicação na plataforma iParty Brasil.</p>
          
          ${rejectionReason ? `
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #856404; margin: 0 0 10px 0;">Motivo da recusa:</h3>
            <p style="margin: 0; color: #856404;">${rejectionReason}</p>
          </div>
          ` : ''}
          
          <p>Você pode fazer as correções necessárias e submeter novamente seu ${itemTypeText} para análise.</p>
          
          <p>Se você tiver dúvidas ou precisar de esclarecimentos, entre em contato conosco respondendo este email.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <div style="text-align: center; color: #666; font-size: 14px;">
            <p><strong>iParty Brasil</strong></p>
            <p>Conectando pessoas aos melhores espaços e fornecedores para eventos</p>
            <p><small>Este é um email automático. Para suporte, responda esta mensagem.</small></p>
          </div>
        </div>
      `;
    }

    console.log(`Enviando email de notificação de ${statusText}:`);
    console.log(`- Para: ${userEmail}`);
    console.log(`- Assunto: ${subject}`);
    console.log(`- Tipo: ${itemTypeText}`);
    console.log(`- Item: ${itemName}`);
    console.log(`- Status: ${status}`);

    const emailResponse = await resend.emails.send({
      from: "iParty Brasil <suporte@ipartybrasil.com>",
      to: [userEmail],
      subject: subject,
      html: emailHtml,
    });

    console.log("Resposta do Resend:", emailResponse);

    if (emailResponse.error) {
      console.error("ERRO DO RESEND:", emailResponse.error);
      return new Response(
        JSON.stringify({ 
          error: "Erro ao enviar email",
          details: emailResponse.error 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("✅ EMAIL DE NOTIFICAÇÃO ENVIADO COM SUCESSO!");
    console.log("Email ID:", emailResponse.data?.id);

    return new Response(JSON.stringify({ 
      success: true, 
      emailResponse,
      message: `Notificação de ${statusText} enviada com sucesso`,
      emailId: emailResponse.data?.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("ERRO CRÍTICO na função de notificação de aprovação:", error);
    console.error("Stack trace:", error.stack);
    return new Response(
      JSON.stringify({ 
        error: "Erro interno do servidor",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
